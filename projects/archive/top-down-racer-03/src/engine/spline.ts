/**
 * Catmull-Rom Spline Module
 *
 * Centripetal Catmull-Rom spline evaluation (alpha=0.5) and arc-length
 * parameterization. Used for track centerline geometry -- every track
 * system depends on this module.
 *
 * The spline is always a closed loop for track geometry. Indices wrap
 * using modular arithmetic: controlPoints[(i + n) % n].
 */

import type { Vec2, ArcLengthTable } from './types';
import { sub, add, scale, length as vecLength } from './vec2';

/** Default samples per spline segment for arc-length table construction. */
const DEFAULT_SAMPLES_PER_SEGMENT = 20;

/**
 * Evaluate a centripetal Catmull-Rom spline at parameter t (0 to 1),
 * interpolating between p1 and p2. Uses alpha=0.5 (centripetal) to
 * avoid cusps at uneven control point spacing.
 *
 * @param p0 - Control point before p1
 * @param p1 - Start of interpolated segment
 * @param p2 - End of interpolated segment
 * @param p3 - Control point after p2
 * @param t  - Parameter in [0, 1]
 * @returns Point on the spline between p1 and p2
 */
export function catmullRomPoint(
  p0: Vec2,
  p1: Vec2,
  p2: Vec2,
  p3: Vec2,
  t: number,
): Vec2 {
  // Centripetal knot intervals: dt_i = |P_{i+1} - P_i|^alpha, alpha=0.5
  const alpha = 0.5;

  const d01 = Math.pow(distSq(p0, p1), alpha * 0.5);
  const d12 = Math.pow(distSq(p1, p2), alpha * 0.5);
  const d23 = Math.pow(distSq(p2, p3), alpha * 0.5);

  // Guard against coincident control points
  const eps = 1e-10;
  const dt01 = d01 < eps ? 1.0 : d01;
  const dt12 = d12 < eps ? 1.0 : d12;
  const dt23 = d23 < eps ? 1.0 : d23;

  // Compute tangents at p1 and p2 using centripetal parameterization
  // t1 = (p1 - p0) / dt01 - (p2 - p0) / (dt01 + dt12) + (p2 - p1) / dt12
  const t1x =
    (p1.x - p0.x) / dt01 -
    (p2.x - p0.x) / (dt01 + dt12) +
    (p2.x - p1.x) / dt12;
  const t1y =
    (p1.y - p0.y) / dt01 -
    (p2.y - p0.y) / (dt01 + dt12) +
    (p2.y - p1.y) / dt12;

  // t2 = (p2 - p1) / dt12 - (p3 - p1) / (dt12 + dt23) + (p3 - p2) / dt23
  const t2x =
    (p2.x - p1.x) / dt12 -
    (p3.x - p1.x) / (dt12 + dt23) +
    (p3.x - p2.x) / dt23;
  const t2y =
    (p2.y - p1.y) / dt12 -
    (p3.y - p1.y) / (dt12 + dt23) +
    (p3.y - p2.y) / dt23;

  // Scale tangents by segment length for Hermite basis
  const m1x = t1x * dt12;
  const m1y = t1y * dt12;
  const m2x = t2x * dt12;
  const m2y = t2y * dt12;

  // Hermite basis evaluation
  const t2val = t * t;
  const t3val = t2val * t;

  const h00 = 2 * t3val - 3 * t2val + 1;
  const h10 = t3val - 2 * t2val + t;
  const h01 = -2 * t3val + 3 * t2val;
  const h11 = t3val - t2val;

  return {
    x: h00 * p1.x + h10 * m1x + h01 * p2.x + h11 * m2x,
    y: h00 * p1.y + h10 * m1y + h01 * p2.y + h11 * m2y,
  };
}

/**
 * Evaluate the tangent (first derivative) of a centripetal Catmull-Rom spline
 * at parameter t. Used for perpendicular checkpoint gates and track direction.
 *
 * @param p0 - Control point before p1
 * @param p1 - Start of interpolated segment
 * @param p2 - End of interpolated segment
 * @param p3 - Control point after p2
 * @param t  - Parameter in [0, 1]
 * @returns Tangent vector (not normalized) at parameter t
 */
export function catmullRomTangent(
  p0: Vec2,
  p1: Vec2,
  p2: Vec2,
  p3: Vec2,
  t: number,
): Vec2 {
  const alpha = 0.5;

  const d01 = Math.pow(distSq(p0, p1), alpha * 0.5);
  const d12 = Math.pow(distSq(p1, p2), alpha * 0.5);
  const d23 = Math.pow(distSq(p2, p3), alpha * 0.5);

  const eps = 1e-10;
  const dt01 = d01 < eps ? 1.0 : d01;
  const dt12 = d12 < eps ? 1.0 : d12;
  const dt23 = d23 < eps ? 1.0 : d23;

  const t1x =
    (p1.x - p0.x) / dt01 -
    (p2.x - p0.x) / (dt01 + dt12) +
    (p2.x - p1.x) / dt12;
  const t1y =
    (p1.y - p0.y) / dt01 -
    (p2.y - p0.y) / (dt01 + dt12) +
    (p2.y - p1.y) / dt12;

  const t2x =
    (p2.x - p1.x) / dt12 -
    (p3.x - p1.x) / (dt12 + dt23) +
    (p3.x - p2.x) / dt23;
  const t2y =
    (p2.y - p1.y) / dt12 -
    (p3.y - p1.y) / (dt12 + dt23) +
    (p3.y - p2.y) / dt23;

  const m1x = t1x * dt12;
  const m1y = t1y * dt12;
  const m2x = t2x * dt12;
  const m2y = t2y * dt12;

  // Derivative of Hermite basis functions
  const t2val = t * t;

  const dh00 = 6 * t2val - 6 * t;
  const dh10 = 3 * t2val - 4 * t + 1;
  const dh01 = -6 * t2val + 6 * t;
  const dh11 = 3 * t2val - 2 * t;

  return {
    x: dh00 * p1.x + dh10 * m1x + dh01 * p2.x + dh11 * m2x,
    y: dh00 * p1.y + dh10 * m1y + dh01 * p2.y + dh11 * m2y,
  };
}

/**
 * Build a cumulative arc-length lookup table for a closed spline loop.
 * Used for uniform parameterization: given a distance along the track,
 * find the corresponding spline parameter.
 *
 * @param controlPoints - Array of control point positions (closed loop)
 * @param samplesPerSegment - Samples per spline segment (default 20)
 * @returns ArcLengthTable with cumulative lengths and corresponding parameters
 */
export function buildArcLengthTable(
  controlPoints: readonly Vec2[],
  samplesPerSegment: number = DEFAULT_SAMPLES_PER_SEGMENT,
): ArcLengthTable {
  const n = controlPoints.length;
  const lengths: number[] = [0];
  const params: number[] = [0];
  let cumLength = 0;

  for (let seg = 0; seg < n; seg++) {
    const p0 = controlPoints[((seg - 1) + n) % n];
    const p1 = controlPoints[seg];
    const p2 = controlPoints[(seg + 1) % n];
    const p3 = controlPoints[(seg + 2) % n];

    let prevPoint = p1;

    for (let s = 1; s <= samplesPerSegment; s++) {
      const t = s / samplesPerSegment;
      const point = catmullRomPoint(p0, p1, p2, p3, t);
      const dist = vecLength(sub(point, prevPoint));
      cumLength += dist;
      lengths.push(cumLength);
      params.push(seg + t);
      prevPoint = point;
    }
  }

  return {
    lengths,
    params,
    totalLength: cumLength,
  };
}

/**
 * Binary search the arc-length table to find the spline parameter at a given
 * arc-length distance. Handles wrapping: distance > totalLength wraps around.
 *
 * @param table - Arc-length lookup table
 * @param distance - Arc-length distance along the spline
 * @returns Spline parameter (0 to N, where N = number of segments)
 */
export function paramAtDistance(
  table: ArcLengthTable,
  distance: number,
): number {
  const { lengths, params, totalLength } = table;

  // Wrap distance to [0, totalLength)
  let d = distance % totalLength;
  if (d < 0) d += totalLength;

  // Binary search for the interval containing d
  let lo = 0;
  let hi = lengths.length - 1;

  while (lo < hi - 1) {
    const mid = (lo + hi) >>> 1;
    if (lengths[mid] <= d) {
      lo = mid;
    } else {
      hi = mid;
    }
  }

  // Linear interpolation within the interval [lo, hi]
  const segLen = lengths[hi] - lengths[lo];
  if (segLen < 1e-10) return params[lo];

  const frac = (d - lengths[lo]) / segLen;
  return params[lo] + (params[hi] - params[lo]) * frac;
}

/**
 * Get a point on the closed spline at a given arc-length distance.
 * Convenience wrapper: distance -> param -> catmullRomPoint.
 *
 * @param controlPoints - Array of control point positions (closed loop)
 * @param table - Arc-length lookup table
 * @param distance - Arc-length distance along the spline
 * @returns Point on the spline
 */
export function pointAtDistance(
  controlPoints: readonly Vec2[],
  table: ArcLengthTable,
  distance: number,
): Vec2 {
  const param = paramAtDistance(table, distance);
  return evalSplineAtParam(controlPoints, param);
}

/**
 * Get the tangent vector at a given arc-length distance along the spline.
 * Convenience wrapper: distance -> param -> catmullRomTangent.
 *
 * @param controlPoints - Array of control point positions (closed loop)
 * @param table - Arc-length lookup table
 * @param distance - Arc-length distance along the spline
 * @returns Tangent vector (not normalized) at the distance
 */
export function tangentAtDistance(
  controlPoints: readonly Vec2[],
  table: ArcLengthTable,
  distance: number,
): Vec2 {
  const param = paramAtDistance(table, distance);
  return evalTangentAtParam(controlPoints, param);
}

// --- Internal helpers ---

/** Squared distance between two points (avoids importing distanceSq to keep deps minimal). */
function distSq(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

/**
 * Evaluate the spline at a global parameter (segment index + fractional t).
 * e.g., param=2.5 means segment 2, t=0.5.
 */
function evalSplineAtParam(controlPoints: readonly Vec2[], param: number): Vec2 {
  const n = controlPoints.length;
  const seg = Math.floor(param) % n;
  const t = param - Math.floor(param);

  const p0 = controlPoints[((seg - 1) + n) % n];
  const p1 = controlPoints[seg];
  const p2 = controlPoints[(seg + 1) % n];
  const p3 = controlPoints[(seg + 2) % n];

  return catmullRomPoint(p0, p1, p2, p3, t);
}

/**
 * Evaluate the tangent at a global parameter (segment index + fractional t).
 */
function evalTangentAtParam(controlPoints: readonly Vec2[], param: number): Vec2 {
  const n = controlPoints.length;
  const seg = Math.floor(param) % n;
  const t = param - Math.floor(param);

  const p0 = controlPoints[((seg - 1) + n) % n];
  const p1 = controlPoints[seg];
  const p2 = controlPoints[(seg + 1) % n];
  const p3 = controlPoints[(seg + 2) % n];

  return catmullRomTangent(p0, p1, p2, p3, t);
}
