/**
 * Track Builder and Surface Detection Tests
 *
 * Tests for the track construction pipeline (buildTrack),
 * surface detection (getSurface), and supporting utilities.
 */

import { describe, it, expect } from 'vitest';
import {
  buildTrack,
  getSurface,
  distanceToTrackCenter,
  nearestBoundaryPoint,
} from '../../src/engine/track';
import { Surface } from '../../src/engine/types';
import type { TrackControlPoint, Vec2 } from '../../src/engine/types';
import { distance } from '../../src/engine/vec2';
import { TRACK_01_CONTROL_POINTS } from '../../src/tracks/track01';
import { TRACK_02_CONTROL_POINTS } from '../../src/tracks/track02';
import { TRACK_03_CONTROL_POINTS } from '../../src/tracks/track03';

// --- Simple test track: a square-ish loop ---
const SQUARE_TRACK: TrackControlPoint[] = [
  { position: { x: 100, y: 100 }, width: 10 },
  { position: { x: -100, y: 100 }, width: 10 },
  { position: { x: -100, y: -100 }, width: 10 },
  { position: { x: 100, y: -100 }, width: 10 },
];

// --- A simple circular track for precise testing ---
function makeCircularTrack(radius: number, width: number, pointCount: number): TrackControlPoint[] {
  const points: TrackControlPoint[] = [];
  for (let i = 0; i < pointCount; i++) {
    const angle = (i / pointCount) * Math.PI * 2;
    points.push({
      position: { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius },
      width,
    });
  }
  return points;
}

describe('buildTrack', () => {
  it('produces inner and outer boundaries with > 100 points each', () => {
    const track = buildTrack(SQUARE_TRACK, 10);
    expect(track.innerBoundary.length).toBeGreaterThan(100);
    expect(track.outerBoundary.length).toBeGreaterThan(100);
  });

  it('inner boundary is closed (first and last points close together)', () => {
    const track = buildTrack(SQUARE_TRACK, 10);
    const inner = track.innerBoundary;
    const gap = distance(inner[0], inner[inner.length - 1]);
    expect(gap).toBeLessThan(1);
  });

  it('outer boundary is closed (first and last points close together)', () => {
    const track = buildTrack(SQUARE_TRACK, 10);
    const outer = track.outerBoundary;
    const gap = distance(outer[0], outer[outer.length - 1]);
    expect(gap).toBeLessThan(1);
  });

  it('boundary width approximately matches control point width', () => {
    // Use a circular track for uniform width testing
    const cp = makeCircularTrack(80, 10, 12);
    const track = buildTrack(cp, 10);

    // Sample several boundary pairs and check the distance between inner and outer
    // is approximately 2 * width (full track width = 2 * half-width = 20)
    const sampleCount = 20;
    const step = Math.floor(track.innerBoundary.length / sampleCount);
    let totalError = 0;
    let samples = 0;

    for (let i = 0; i < track.innerBoundary.length - 1; i += step) {
      const innerPt = track.innerBoundary[i];
      const outerPt = track.outerBoundary[i];
      const trackWidth = distance(innerPt, outerPt);
      // Expected full width = 2 * (half-width + WALL_OFFSET) = 2 * (10 + 30) = 80
      totalError += Math.abs(trackWidth - 80);
      samples++;
    }

    const avgError = totalError / samples;
    // Average error should be small relative to track width
    expect(avgError).toBeLessThan(10); // < ~12% error on average
  });

  it('generates the requested number of checkpoints', () => {
    const track = buildTrack(SQUARE_TRACK, 15);
    expect(track.checkpoints.length).toBe(15);
  });

  it('checkpoints have sequential arc lengths', () => {
    const track = buildTrack(SQUARE_TRACK, 20);
    for (let i = 1; i < track.checkpoints.length; i++) {
      expect(track.checkpoints[i].arcLength).toBeGreaterThan(
        track.checkpoints[i - 1].arcLength,
      );
    }
  });

  it('checkpoint gates span approximately the track width', () => {
    const cp = makeCircularTrack(80, 10, 12);
    const track = buildTrack(cp, 10);

    for (const checkpoint of track.checkpoints) {
      const gateWidth = distance(checkpoint.left, checkpoint.right);
      // Gate width should be approximately 2 * (half-width + WALL_OFFSET) = 2 * (10 + 30) = 80
      expect(gateWidth).toBeGreaterThan(62); // at least ~77% of expected
      expect(gateWidth).toBeLessThan(98); // at most ~123% of expected
    }
  });

  it('has valid start position and heading', () => {
    const track = buildTrack(SQUARE_TRACK, 10);
    expect(typeof track.startPosition.x).toBe('number');
    expect(typeof track.startPosition.y).toBe('number');
    expect(typeof track.startHeading).toBe('number');
    expect(Number.isFinite(track.startHeading)).toBe(true);
  });

  it('stores total length from arc-length table', () => {
    const track = buildTrack(SQUARE_TRACK, 10);
    expect(track.totalLength).toBeGreaterThan(0);
    expect(track.totalLength).toBe(track.arcLengthTable.totalLength);
  });

  it('throws for fewer than 3 control points', () => {
    expect(() => buildTrack([], 5)).toThrow();
    expect(() =>
      buildTrack(
        [
          { position: { x: 0, y: 0 }, width: 5 },
          { position: { x: 10, y: 0 }, width: 5 },
        ],
        5,
      ),
    ).toThrow();
  });
});

describe('getSurface', () => {
  it('returns Road for a point on the centerline', () => {
    const cp = makeCircularTrack(80, 10, 12);
    const track = buildTrack(cp, 10);

    // A point on the centerline (at one of the control points)
    const surface = getSurface({ x: 80, y: 0 }, track);
    expect(surface).toBe(Surface.Road);
  });

  it('returns Runoff for a point far outside boundaries', () => {
    const cp = makeCircularTrack(80, 10, 12);
    const track = buildTrack(cp, 10);

    // A point far from the track
    const surface = getSurface({ x: 300, y: 300 }, track);
    expect(surface).toBe(Surface.Runoff);
  });

  it('returns Road for a point slightly inside the boundary', () => {
    const cp = makeCircularTrack(80, 10, 12);
    const track = buildTrack(cp, 10);

    // Point at radius 80 + 8 (within the half-width of 10)
    const surface = getSurface({ x: 88, y: 0 }, track);
    expect(surface).toBe(Surface.Road);
  });

  it('returns Shoulder for a point just outside the road edge', () => {
    const cp = makeCircularTrack(80, 10, 12);
    const track = buildTrack(cp, 10);

    // Point at radius 80 + 12 (beyond half-width of 10, within shoulder zone)
    const surface = getSurface({ x: 92, y: 0 }, track);
    expect(surface).toBe(Surface.Shoulder);
  });

  it('returns Runoff for a point near the wall', () => {
    const cp = makeCircularTrack(80, 10, 12);
    const track = buildTrack(cp, 10);

    // Point at radius 80 + 39 (in the runoff zone near the wall)
    const surface = getSurface({ x: 119, y: 0 }, track);
    expect(surface).toBe(Surface.Runoff);
  });

  it('returns Runoff at the center of the track loop (far from road)', () => {
    const cp = makeCircularTrack(80, 10, 12);
    const track = buildTrack(cp, 10);

    const surface = getSurface({ x: 0, y: 0 }, track);
    // Distance from (0,0) to centerline ring is ~80, way beyond width of 10
    expect(surface).toBe(Surface.Runoff);
  });

  it('returns Shoulder on both inner and outer sides of the road', () => {
    const cp = makeCircularTrack(80, 10, 12);
    const track = buildTrack(cp, 10);

    // Outer side: radius 92 (beyond road width 10, in shoulder zone)
    expect(getSurface({ x: 92, y: 0 }, track)).toBe(Surface.Shoulder);
    // Inner side: radius 68 (beyond road width 10 toward center, in shoulder zone)
    expect(getSurface({ x: 68, y: 0 }, track)).toBe(Surface.Shoulder);
  });

  it('only returns Road, Shoulder, or Runoff', () => {
    const cp = makeCircularTrack(80, 10, 12);
    const track = buildTrack(cp, 10);

    const testPoints: Vec2[] = [
      { x: 80, y: 0 },    // centerline
      { x: 88, y: 0 },    // near road edge
      { x: 92, y: 0 },    // just off road (shoulder)
      { x: 110, y: 0 },   // deep in runoff
      { x: 68, y: 0 },    // inner off-road (shoulder)
      { x: 0, y: 0 },     // center of loop
      { x: 300, y: 300 },  // far away
    ];

    for (const pt of testPoints) {
      const s = getSurface(pt, track);
      expect(
        s === Surface.Road || s === Surface.Shoulder || s === Surface.Runoff,
      ).toBe(true);
    }
  });
});

describe('distanceToTrackCenter', () => {
  it('returns near-zero distance for a point on the centerline', () => {
    const cp = makeCircularTrack(80, 10, 12);
    const track = buildTrack(cp, 10);

    const result = distanceToTrackCenter({ x: 80, y: 0 }, track);
    expect(result.distance).toBeLessThan(2); // Very close to centerline
  });

  it('returns correct distance for a point offset from centerline', () => {
    const cp = makeCircularTrack(80, 10, 12);
    const track = buildTrack(cp, 10);

    // Point at radius 90, which is 10 units from the centerline ring at radius 80
    const result = distanceToTrackCenter({ x: 90, y: 0 }, track);
    expect(result.distance).toBeCloseTo(10, 0);
  });

  it('returns valid arc-length in range [0, totalLength)', () => {
    const track = buildTrack(SQUARE_TRACK, 10);
    const result = distanceToTrackCenter({ x: 0, y: 0 }, track);
    expect(result.arcLength).toBeGreaterThanOrEqual(0);
    expect(result.arcLength).toBeLessThan(track.totalLength);
  });
});

describe('nearestBoundaryPoint', () => {
  it('finds the closest point on a simple boundary', () => {
    // Simple square boundary
    const boundary: Vec2[] = [
      { x: -10, y: -10 },
      { x: 10, y: -10 },
      { x: 10, y: 10 },
      { x: -10, y: 10 },
      { x: -10, y: -10 }, // close the loop
    ];

    const result = nearestBoundaryPoint({ x: 15, y: 0 }, boundary);
    // Nearest point should be on the right edge at approximately (10, 0)
    expect(result.point.x).toBeCloseTo(10, 0);
    expect(result.point.y).toBeCloseTo(0, 0);
    expect(result.distance).toBeCloseTo(5, 0);
  });

  it('returns correct distance for a point on the boundary', () => {
    const boundary: Vec2[] = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
      { x: 0, y: 0 },
    ];

    const result = nearestBoundaryPoint({ x: 5, y: 0 }, boundary);
    expect(result.distance).toBeCloseTo(0, 5);
  });

  it('returns a segment index within bounds', () => {
    const boundary: Vec2[] = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 0 },
    ];

    const result = nearestBoundaryPoint({ x: 5, y: 5 }, boundary);
    expect(result.segmentIndex).toBeGreaterThanOrEqual(0);
    expect(result.segmentIndex).toBeLessThan(boundary.length - 1);
  });

  it('normal points from boundary toward query point', () => {
    const boundary: Vec2[] = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
      { x: 0, y: 0 },
    ];

    // Point above the top edge
    const result = nearestBoundaryPoint({ x: 5, y: 15 }, boundary);
    // Normal should point upward (positive y direction)
    expect(result.normal.y).toBeGreaterThan(0);
  });
});

describe('Track 01', () => {
  it('builds without errors', () => {
    const track = buildTrack(TRACK_01_CONTROL_POINTS, 30);
    expect(track).toBeDefined();
    expect(track.innerBoundary.length).toBeGreaterThan(100);
    expect(track.outerBoundary.length).toBeGreaterThan(100);
  });

  it('is a closed loop', () => {
    const track = buildTrack(TRACK_01_CONTROL_POINTS, 30);

    const innerGap = distance(
      track.innerBoundary[0],
      track.innerBoundary[track.innerBoundary.length - 1],
    );
    const outerGap = distance(
      track.outerBoundary[0],
      track.outerBoundary[track.outerBoundary.length - 1],
    );

    expect(innerGap).toBeLessThan(1);
    expect(outerGap).toBeLessThan(1);
  });

  it('has 30 checkpoints', () => {
    const track = buildTrack(TRACK_01_CONTROL_POINTS, 30);
    expect(track.checkpoints.length).toBe(30);
  });

  it('has positive total length', () => {
    const track = buildTrack(TRACK_01_CONTROL_POINTS, 30);
    expect(track.totalLength).toBeGreaterThan(100);
  });

  it('centerline surface detection works', () => {
    const track = buildTrack(TRACK_01_CONTROL_POINTS, 30);

    // First control point position should be on the road
    const surface = getSurface(TRACK_01_CONTROL_POINTS[0].position, track);
    expect(surface).toBe(Surface.Road);
  });

  it('far-away point is runoff', () => {
    const track = buildTrack(TRACK_01_CONTROL_POINTS, 30);
    const surface = getSurface({ x: 1000, y: 1000 }, track);
    expect(surface).toBe(Surface.Runoff);
  });
});

describe('Track 02', () => {
  it('builds without errors', () => {
    const track = buildTrack(TRACK_02_CONTROL_POINTS, 30);
    expect(track).toBeDefined();
    expect(track.innerBoundary.length).toBeGreaterThan(100);
    expect(track.outerBoundary.length).toBeGreaterThan(100);
  });

  it('is a closed loop', () => {
    const track = buildTrack(TRACK_02_CONTROL_POINTS, 30);
    const innerGap = distance(
      track.innerBoundary[0],
      track.innerBoundary[track.innerBoundary.length - 1],
    );
    const outerGap = distance(
      track.outerBoundary[0],
      track.outerBoundary[track.outerBoundary.length - 1],
    );
    expect(innerGap).toBeLessThan(1);
    expect(outerGap).toBeLessThan(1);
  });

  it('centerline surface detection works', () => {
    const track = buildTrack(TRACK_02_CONTROL_POINTS, 30);
    const surface = getSurface(TRACK_02_CONTROL_POINTS[0].position, track);
    expect(surface).toBe(Surface.Road);
  });
});

describe('Track 03', () => {
  it('builds without errors', () => {
    const track = buildTrack(TRACK_03_CONTROL_POINTS, 30);
    expect(track).toBeDefined();
    expect(track.innerBoundary.length).toBeGreaterThan(100);
    expect(track.outerBoundary.length).toBeGreaterThan(100);
  });

  it('is a closed loop', () => {
    const track = buildTrack(TRACK_03_CONTROL_POINTS, 30);
    const innerGap = distance(
      track.innerBoundary[0],
      track.innerBoundary[track.innerBoundary.length - 1],
    );
    const outerGap = distance(
      track.outerBoundary[0],
      track.outerBoundary[track.outerBoundary.length - 1],
    );
    expect(innerGap).toBeLessThan(1);
    expect(outerGap).toBeLessThan(1);
  });

  it('centerline surface detection works', () => {
    const track = buildTrack(TRACK_03_CONTROL_POINTS, 30);
    const surface = getSurface(TRACK_03_CONTROL_POINTS[0].position, track);
    expect(surface).toBe(Surface.Road);
  });
});

/**
 * Surface detection for all real tracks — off-road is always Runoff, on-road is always Road.
 * No Shoulder surface exists; everything beyond the road edge is sand/gravel runoff.
 */
describe('getSurface — all tracks: off-road = Runoff', () => {
  it.each([
    ['Track 01', TRACK_01_CONTROL_POINTS],
    ['Track 02', TRACK_02_CONTROL_POINTS],
    ['Track 03', TRACK_03_CONTROL_POINTS],
  ])('%s — centerline is Road', (_name, points) => {
    const track = buildTrack(points, 30);
    // Every control point's position sits on the centerline → must be Road
    for (const cp of points) {
      expect(getSurface(cp.position, track)).toBe(Surface.Road);
    }
  });

  it.each([
    ['Track 01', TRACK_01_CONTROL_POINTS],
    ['Track 02', TRACK_02_CONTROL_POINTS],
    ['Track 03', TRACK_03_CONTROL_POINTS],
  ])('%s — far-away points are Runoff', (_name, points) => {
    const track = buildTrack(points, 30);
    const farPoints: Vec2[] = [
      { x: 1000, y: 1000 },
      { x: -1000, y: -1000 },
      { x: 0, y: 2000 },
    ];
    for (const pt of farPoints) {
      expect(getSurface(pt, track)).toBe(Surface.Runoff);
    }
  });
});

/**
 * Checkpoint gate containment — gate endpoints must lie within (or very close
 * to) the actual track boundaries. This catches finish-line overflow bugs where
 * the checker flag extends beyond the visible track edges.
 */
describe('Checkpoint gates within boundaries', () => {
  /**
   * For a given point, find the minimum distance to any segment in a boundary polyline.
   */
  function distToBoundary(pt: Vec2, boundary: readonly Vec2[]): number {
    let best = Infinity;
    for (let i = 0; i < boundary.length - 1; i++) {
      const a = boundary[i];
      const b = boundary[i + 1];
      const ab = { x: b.x - a.x, y: b.y - a.y };
      const ap = { x: pt.x - a.x, y: pt.y - a.y };
      const abLenSq = ab.x * ab.x + ab.y * ab.y;
      if (abLenSq < 1e-10) continue;
      const t = Math.max(0, Math.min(1, (ap.x * ab.x + ap.y * ab.y) / abLenSq));
      const nearest = { x: a.x + ab.x * t, y: a.y + ab.y * t };
      const d = distance(pt, nearest);
      if (d < best) best = d;
    }
    return best;
  }

  const MAX_OVERSHOOT = 3; // Allow at most 3 world-units of overshoot (floating point tolerance)

  it.each([
    ['Track 01', TRACK_01_CONTROL_POINTS],
    ['Track 02', TRACK_02_CONTROL_POINTS],
    ['Track 03', TRACK_03_CONTROL_POINTS],
  ])('%s — checkpoint gate endpoints lie within boundaries', (_name, points) => {
    const track = buildTrack(points, 30);

    for (let i = 0; i < track.checkpoints.length; i++) {
      const cp = track.checkpoints[i];

      // Gate left should be near the inner boundary
      const leftDist = distToBoundary(cp.left, track.innerBoundary);
      expect(leftDist).toBeLessThan(
        MAX_OVERSHOOT,
      );

      // Gate right should be near the outer boundary
      const rightDist = distToBoundary(cp.right, track.outerBoundary);
      expect(rightDist).toBeLessThan(
        MAX_OVERSHOOT,
      );
    }
  });
});

/**
 * Boundary integrity checks — segment intersection AND proximity.
 *
 * Two tests per boundary:
 * 1. Segment intersection: do any non-adjacent wall segments actually cross?
 *    Uses proper line-segment intersection math (cross products).
 * 2. Minimum gap: do non-adjacent wall points come closer than MIN_GAP?
 *    Catches near-misses that aren't technically crossing but look terrible.
 *
 * Also checks cross-boundary: inner segments should never cross outer segments
 * in non-adjacent regions (the two walls should stay on their respective sides).
 */
describe('Track boundary integrity', () => {
  // --- Segment intersection via cross products ---
  function cross(a: Vec2, b: Vec2): number {
    return a.x * b.y - a.y * b.x;
  }

  function vsub(a: Vec2, b: Vec2): Vec2 {
    return { x: a.x - b.x, y: a.y - b.y };
  }

  /**
   * Returns true if segments (p1-p2) and (p3-p4) properly intersect
   * (cross each other, not just touch at endpoints).
   */
  function segmentsIntersect(p1: Vec2, p2: Vec2, p3: Vec2, p4: Vec2): boolean {
    const d1 = vsub(p2, p1);
    const d2 = vsub(p4, p3);
    const denom = cross(d1, d2);
    if (Math.abs(denom) < 1e-10) return false; // parallel

    const d3 = vsub(p3, p1);
    const t = cross(d3, d2) / denom;
    const u = cross(d3, d1) / denom;

    // Strict interior intersection (exclude exact endpoint touches)
    const eps = 1e-6;
    return t > eps && t < 1 - eps && u > eps && u < 1 - eps;
  }

  /**
   * Find ALL segment-segment intersections in a single boundary polyline,
   * skipping adjacent segments (within `skip` indices including wrap-around).
   * Returns count of intersections found.
   */
  function countSelfIntersections(boundary: readonly Vec2[], skip: number): number {
    const n = boundary.length - 1; // last == first (closed)
    let count = 0;
    for (let i = 0; i < n; i++) {
      for (let j = i + skip; j < n; j++) {
        // Also skip wrap-around adjacency
        if (n - j + i < skip) continue;
        if (segmentsIntersect(boundary[i], boundary[i + 1], boundary[j], boundary[j + 1])) {
          count++;
        }
      }
    }
    return count;
  }

  /**
   * Find intersections between segments of two different boundary polylines,
   * only checking non-corresponding regions (skip segments at similar arc positions).
   */
  function countCrossBoundaryIntersections(
    inner: readonly Vec2[],
    outer: readonly Vec2[],
    skip: number,
  ): number {
    const nI = inner.length - 1;
    const nO = outer.length - 1;
    let count = 0;
    for (let i = 0; i < nI; i++) {
      for (let j = 0; j < nO; j++) {
        // Skip corresponding positions (same arc-length region)
        const iNorm = i / nI;
        const jNorm = j / nO;
        if (Math.abs(iNorm - jNorm) * Math.max(nI, nO) < skip) continue;
        // Also check wrap-around
        if ((1 - Math.abs(iNorm - jNorm)) * Math.max(nI, nO) < skip) continue;
        if (segmentsIntersect(inner[i], inner[i + 1], outer[j], outer[j + 1])) {
          count++;
        }
      }
    }
    return count;
  }

  /**
   * Minimum distance between non-adjacent boundary points.
   */
  function minNonAdjacentDistance(boundary: readonly Vec2[], skip: number): number {
    let minDist = Infinity;
    const n = boundary.length - 1;
    for (let i = 0; i < n; i++) {
      for (let j = i + skip; j < n; j++) {
        if (n - j + i < skip) continue;
        const d = distance(boundary[i], boundary[j]);
        if (d < minDist) minDist = d;
      }
    }
    return minDist;
  }

  // Skip only the immediate neighbors that share endpoints for intersection tests.
  // Previously SKIP=15 masked real crossings that were 4–8 segments apart
  // (e.g. hairpin outer wall at seg 182×190, S-bend inner wall at seg 278×282).
  // The strict-interior intersection test (eps=1e-6) already prevents false
  // positives from shared endpoints, so SKIP=3 is safe and catches local folds.
  const INTERSECTION_SKIP = 3;
  // For min-gap checks, use a larger skip — nearby boundary points are naturally
  // close along the polyline; we only care about distant sections approaching.
  const GAP_SKIP = 15;
  // Minimum acceptable gap between non-adjacent wall points
  const MIN_GAP = 10;

  // ── Track 01 ──────────────────────────────────────────────────
  describe('Track 01', () => {
    const track = buildTrack(TRACK_01_CONTROL_POINTS, 30);

    it('inner boundary has no self-intersections', () => {
      expect(countSelfIntersections(track.innerBoundary, INTERSECTION_SKIP)).toBe(0);
    });
    it('outer boundary has no self-intersections', () => {
      expect(countSelfIntersections(track.outerBoundary, INTERSECTION_SKIP)).toBe(0);
    });
    it('inner and outer boundaries do not cross', () => {
      expect(countCrossBoundaryIntersections(track.innerBoundary, track.outerBoundary, INTERSECTION_SKIP)).toBe(0);
    });
    it('inner boundary min gap > MIN_GAP', () => {
      expect(minNonAdjacentDistance(track.innerBoundary, GAP_SKIP)).toBeGreaterThan(MIN_GAP);
    });
    it('outer boundary min gap > MIN_GAP', () => {
      expect(minNonAdjacentDistance(track.outerBoundary, GAP_SKIP)).toBeGreaterThan(MIN_GAP);
    });
  });

  // ── Track 02 ──────────────────────────────────────────────────
  describe('Track 02', () => {
    const track = buildTrack(TRACK_02_CONTROL_POINTS, 30);

    it('inner boundary has no self-intersections', () => {
      expect(countSelfIntersections(track.innerBoundary, INTERSECTION_SKIP)).toBe(0);
    });
    it('outer boundary has no self-intersections', () => {
      expect(countSelfIntersections(track.outerBoundary, INTERSECTION_SKIP)).toBe(0);
    });
    it('inner and outer boundaries do not cross', () => {
      expect(countCrossBoundaryIntersections(track.innerBoundary, track.outerBoundary, INTERSECTION_SKIP)).toBe(0);
    });
    it('inner boundary min gap > MIN_GAP', () => {
      expect(minNonAdjacentDistance(track.innerBoundary, GAP_SKIP)).toBeGreaterThan(MIN_GAP);
    });
    it('outer boundary min gap > MIN_GAP', () => {
      expect(minNonAdjacentDistance(track.outerBoundary, GAP_SKIP)).toBeGreaterThan(MIN_GAP);
    });
  });

  // ── Track 03 ──────────────────────────────────────────────────
  describe('Track 03', () => {
    const track = buildTrack(TRACK_03_CONTROL_POINTS, 30);

    it('inner boundary has no self-intersections', () => {
      expect(countSelfIntersections(track.innerBoundary, INTERSECTION_SKIP)).toBe(0);
    });
    it('outer boundary has no self-intersections', () => {
      expect(countSelfIntersections(track.outerBoundary, INTERSECTION_SKIP)).toBe(0);
    });
    it('inner and outer boundaries do not cross', () => {
      expect(countCrossBoundaryIntersections(track.innerBoundary, track.outerBoundary, INTERSECTION_SKIP)).toBe(0);
    });
    it('inner boundary min gap > MIN_GAP', () => {
      expect(minNonAdjacentDistance(track.innerBoundary, GAP_SKIP)).toBeGreaterThan(MIN_GAP);
    });
    it('outer boundary min gap > MIN_GAP', () => {
      expect(minNonAdjacentDistance(track.outerBoundary, GAP_SKIP)).toBeGreaterThan(MIN_GAP);
    });
  });
});
