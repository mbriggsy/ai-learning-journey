/**
 * Track Construction Pipeline
 *
 * Converts spline control points into closed boundary polylines and surface zones.
 * The track builder is the foundation for collision detection, surface detection,
 * and checkpoint placement.
 *
 * Pipeline: TrackControlPoint[] -> buildTrack -> TrackState
 *   1. Extract positions, build arc-length table for the centerline spline
 *   2. Sample the spline densely, offset by per-point width to create inner/outer boundaries
 *   3. Generate checkpoint gates at uniform arc-length intervals
 *   4. Return immutable TrackState consumed by collision, rendering, and AI systems
 */

import type {
  Vec2,
  TrackControlPoint,
  TrackState,
  ArcLengthTable,
  Checkpoint,
} from './types';
import { Surface } from './types';
import {
  vec2,
  add,
  sub,
  scale,
  normalize,
  perpCW,
  perpCCW,
  distance,
  dot,
  length as vecLength,
} from './vec2';
import {
  buildArcLengthTable,
  pointAtDistance,
  tangentAtDistance,
} from './spline';

/** Number of boundary samples per control-point segment. */
const SAMPLES_PER_SEGMENT = 12;

/** Minimum samples per segment to guarantee dense boundaries. */
const SAMPLES_PER_SEGMENT_ARC = 20;

/**
 * Build a complete track from control points and desired checkpoint count.
 *
 * @param controlPoints - Array of centerline control points with half-widths
 * @param checkpointCount - Number of checkpoint gates to generate along the track
 * @returns Immutable TrackState with boundaries, checkpoints, and arc-length data
 */
export function buildTrack(
  controlPoints: TrackControlPoint[],
  checkpointCount: number,
): TrackState {
  const n = controlPoints.length;
  if (n < 3) {
    throw new Error('Track requires at least 3 control points');
  }

  // Extract position array for spline evaluation
  const positions: Vec2[] = controlPoints.map((cp) => cp.position);

  // Build arc-length table with high fidelity for uniform parameterization
  const arcLengthTable = buildArcLengthTable(positions, SAMPLES_PER_SEGMENT_ARC);
  const totalLength = arcLengthTable.totalLength;

  // Calculate total sample count: enough that no boundary segment exceeds ~2 units
  // For a ~1000-unit perimeter, 200+ samples gives ~5 unit spacing on center,
  // which is fine since offsets are smaller than the perimeter.
  const totalSamples = Math.max(200, n * SAMPLES_PER_SEGMENT);

  // Generate boundary polylines by sampling the spline and offsetting by width
  const innerBoundary: Vec2[] = [];
  const outerBoundary: Vec2[] = [];

  for (let i = 0; i < totalSamples; i++) {
    const dist = (i / totalSamples) * totalLength;

    // Get centerline point and tangent at this arc-length distance
    const center = pointAtDistance(positions, arcLengthTable, dist);
    const tangent = tangentAtDistance(positions, arcLengthTable, dist);
    const tangentNorm = normalize(tangent);

    // Interpolate width from control points based on arc-length position
    const width = interpolateWidth(controlPoints, positions, arcLengthTable, dist);

    // Offset perpendicular to tangent direction
    // perpCCW gives the left-pointing normal, perpCW gives the right-pointing normal
    const leftOffset = scale(perpCCW(tangentNorm), width);
    const rightOffset = scale(perpCW(tangentNorm), width);

    innerBoundary.push(add(center, leftOffset));
    outerBoundary.push(add(center, rightOffset));
  }

  // Close the boundaries by appending the first point
  innerBoundary.push(innerBoundary[0]);
  outerBoundary.push(outerBoundary[0]);

  // Generate checkpoint gates at uniform arc-length intervals
  const checkpoints: Checkpoint[] = [];
  const checkpointSpacing = totalLength / checkpointCount;

  for (let i = 0; i < checkpointCount; i++) {
    const arcLen = i * checkpointSpacing;
    const center = pointAtDistance(positions, arcLengthTable, arcLen);
    const tangent = tangentAtDistance(positions, arcLengthTable, arcLen);
    const tangentNorm = normalize(tangent);
    const width = interpolateWidth(controlPoints, positions, arcLengthTable, arcLen);

    const left = add(center, scale(perpCCW(tangentNorm), width));
    const right = add(center, scale(perpCW(tangentNorm), width));

    checkpoints.push({
      left,
      right,
      center,
      direction: tangentNorm,
      arcLength: arcLen,
    });
  }

  // Start position and heading from the first control point
  const startTangent = tangentAtDistance(positions, arcLengthTable, 0);
  const startDir = normalize(startTangent);
  const startHeading = Math.atan2(startDir.y, startDir.x);

  return {
    controlPoints,
    innerBoundary,
    outerBoundary,
    checkpoints,
    arcLengthTable,
    totalLength,
    startPosition: pointAtDistance(positions, arcLengthTable, 0),
    startHeading,
  };
}

/**
 * Determine the surface type at a given position relative to the track.
 *
 * Uses distance from the track centerline compared to the interpolated width
 * at that arc-length position. If the distance is within the width, the point
 * is on the road; otherwise it's on runoff.
 *
 * @param position - World-space position to test
 * @param track - Built track state
 * @returns Surface.Road if inside track boundaries, Surface.Runoff otherwise
 */
export function getSurface(position: Vec2, track: TrackState): Surface {
  const { distance: dist, arcLength } = distanceToTrackCenter(position, track);
  const positions = track.controlPoints.map((cp) => cp.position);
  const width = interpolateWidth(
    track.controlPoints as TrackControlPoint[],
    positions,
    track.arcLengthTable,
    arcLength,
  );

  return dist <= width ? Surface.Road : Surface.Runoff;
}

/**
 * Find the distance from a position to the nearest point on the track centerline.
 *
 * Implementation: coarse linear scan of the arc-length table at intervals,
 * then binary search refinement in the local region around the closest sample.
 *
 * @param position - World-space position
 * @param track - Built track state
 * @returns Distance to centerline and arc-length position of the nearest center point
 */
export function distanceToTrackCenter(
  position: Vec2,
  track: TrackState,
): { distance: number; arcLength: number } {
  const positions = track.controlPoints.map((cp) => cp.position);
  const table = track.arcLengthTable;
  const totalLength = table.totalLength;

  // Coarse scan: sample every ~2 units along the centerline
  const coarseSamples = Math.max(100, Math.ceil(totalLength / 2));
  let bestDist = Infinity;
  let bestArcLen = 0;

  for (let i = 0; i < coarseSamples; i++) {
    const arcLen = (i / coarseSamples) * totalLength;
    const centerPt = pointAtDistance(positions, table, arcLen);
    const dist = distance(position, centerPt);
    if (dist < bestDist) {
      bestDist = dist;
      bestArcLen = arcLen;
    }
  }

  // Refine with binary search in the local region (+/- one coarse step)
  const step = totalLength / coarseSamples;
  let lo = bestArcLen - step;
  let hi = bestArcLen + step;

  for (let iter = 0; iter < 16; iter++) {
    const mid1 = lo + (hi - lo) / 3;
    const mid2 = hi - (hi - lo) / 3;
    const d1 = distance(position, pointAtDistance(positions, table, mid1));
    const d2 = distance(position, pointAtDistance(positions, table, mid2));

    if (d1 < d2) {
      hi = mid2;
      if (d1 < bestDist) {
        bestDist = d1;
        bestArcLen = mid1;
      }
    } else {
      lo = mid1;
      if (d2 < bestDist) {
        bestDist = d2;
        bestArcLen = mid2;
      }
    }
  }

  // Wrap arc length to [0, totalLength)
  let wrappedArcLen = bestArcLen % totalLength;
  if (wrappedArcLen < 0) wrappedArcLen += totalLength;

  return { distance: bestDist, arcLength: wrappedArcLen };
}

/**
 * Find the nearest point on a boundary polyline to a given position.
 *
 * Linear scan over all segments -- suitable for this phase.
 * Spatial hashing optimization deferred to Phase 4/5 if profiling shows need.
 *
 * @param position - World-space position to test against
 * @param boundary - Closed boundary polyline (last point connects to first)
 * @returns Nearest point on the boundary, segment index, distance, and outward normal
 */
export function nearestBoundaryPoint(
  position: Vec2,
  boundary: readonly Vec2[],
): { point: Vec2; segmentIndex: number; distance: number; normal: Vec2 } {
  let bestDist = Infinity;
  let bestPoint = vec2(0, 0);
  let bestIndex = 0;
  let bestNormal = vec2(0, 0);

  const segCount = boundary.length - 1;

  for (let i = 0; i < segCount; i++) {
    const a = boundary[i];
    const b = boundary[i + 1];

    const result = pointToSegment(position, a, b);

    if (result.distance < bestDist) {
      bestDist = result.distance;
      bestPoint = result.nearest;
      bestIndex = i;

      // Normal points from boundary toward the query point
      const toPoint = sub(position, result.nearest);
      const len = vecLength(toPoint);
      bestNormal = len > 1e-10 ? scale(toPoint, 1 / len) : vec2(0, 0);
    }
  }

  return {
    point: bestPoint,
    segmentIndex: bestIndex,
    distance: bestDist,
    normal: bestNormal,
  };
}

// --- Internal helpers ---

/**
 * Project a point onto a line segment and return the nearest point.
 */
function pointToSegment(
  point: Vec2,
  segA: Vec2,
  segB: Vec2,
): { distance: number; nearest: Vec2; t: number } {
  const ab = sub(segB, segA);
  const ap = sub(point, segA);
  const abLenSq = dot(ab, ab);

  if (abLenSq < 1e-10) {
    // Degenerate segment
    return { distance: distance(point, segA), nearest: segA, t: 0 };
  }

  let t = dot(ap, ab) / abLenSq;
  t = Math.max(0, Math.min(1, t));

  const nearest = add(segA, scale(ab, t));
  return { distance: distance(point, nearest), nearest, t };
}

/**
 * Interpolate the track half-width at a given arc-length position.
 *
 * Finds the two nearest control points by arc-length and linearly interpolates
 * between their widths.
 */
function interpolateWidth(
  controlPoints: readonly TrackControlPoint[],
  positions: readonly Vec2[],
  table: ArcLengthTable,
  arcLength: number,
): number {
  const n = controlPoints.length;
  const totalLength = table.totalLength;

  // Wrap arc length to [0, totalLength)
  let d = arcLength % totalLength;
  if (d < 0) d += totalLength;

  // Compute the arc-length of each control point on the spline
  // Control points are at uniform parameter intervals: cp[i] is at param = i
  // We need to find the arc-length of param = i
  const cpArcLengths: number[] = [];
  for (let i = 0; i < n; i++) {
    // Find the arc-length at param = i by searching the table
    // Since params are monotonically increasing and correspond to segment boundaries,
    // param = i corresponds to the start of segment i
    cpArcLengths.push(arcLengthAtParam(table, i));
  }

  // Find the two control points bracketing this arc-length
  let prevIdx = 0;
  let nextIdx = 1;
  for (let i = 0; i < n; i++) {
    const nextI = (i + 1) % n;
    const cpArc = cpArcLengths[i];
    const nextArc = nextI === 0 ? totalLength : cpArcLengths[nextI];

    if (nextArc > cpArc) {
      if (d >= cpArc && d < nextArc) {
        prevIdx = i;
        nextIdx = nextI;
        const segLen = nextArc - cpArc;
        const t = segLen > 1e-10 ? (d - cpArc) / segLen : 0;
        return controlPoints[prevIdx].width + (controlPoints[nextIdx].width - controlPoints[prevIdx].width) * t;
      }
    }
  }

  // Handle wrap-around: d is between the last control point and totalLength (wrapping to first)
  const lastArc = cpArcLengths[n - 1];
  const wrapLen = totalLength - lastArc;
  if (wrapLen > 1e-10) {
    const t = (d - lastArc) / wrapLen;
    return controlPoints[n - 1].width + (controlPoints[0].width - controlPoints[n - 1].width) * t;
  }

  return controlPoints[0].width;
}

/**
 * Find the arc-length at a given spline parameter by searching the arc-length table.
 */
function arcLengthAtParam(table: ArcLengthTable, param: number): number {
  const { params, lengths } = table;

  // Binary search for the param
  let lo = 0;
  let hi = params.length - 1;

  while (lo < hi - 1) {
    const mid = (lo + hi) >>> 1;
    if (params[mid] <= param) {
      lo = mid;
    } else {
      hi = mid;
    }
  }

  // Interpolate within interval
  const paramRange = params[hi] - params[lo];
  if (paramRange < 1e-10) return lengths[lo];

  const frac = (param - params[lo]) / paramRange;
  return lengths[lo] + (lengths[hi] - lengths[lo]) * frac;
}
