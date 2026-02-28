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
      // Expected full width = 2 * half-width = 20
      totalError += Math.abs(trackWidth - 20);
      samples++;
    }

    const avgError = totalError / samples;
    // Average error should be small relative to track width
    expect(avgError).toBeLessThan(4); // < 20% error on average
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
      // Gate width should be approximately 2 * half-width = 20
      expect(gateWidth).toBeGreaterThan(14); // at least 70% of expected
      expect(gateWidth).toBeLessThan(26); // at most 130% of expected
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

  it('returns Runoff for a point just outside the boundary', () => {
    const cp = makeCircularTrack(80, 10, 12);
    const track = buildTrack(cp, 10);

    // Point at radius 80 + 12 (beyond the half-width of 10)
    const surface = getSurface({ x: 92, y: 0 }, track);
    expect(surface).toBe(Surface.Runoff);
  });

  it('returns Road at the center of the track loop', () => {
    // For a circular track, the center (0,0) is inside the loop
    // but NOT on the road surface — it's far from the centerline ring
    const cp = makeCircularTrack(80, 10, 12);
    const track = buildTrack(cp, 10);

    const surface = getSurface({ x: 0, y: 0 }, track);
    // Distance from (0,0) to centerline ring is ~80, way beyond width of 10
    expect(surface).toBe(Surface.Runoff);
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
