/**
 * Ray Casting Tests
 *
 * Tests for raySegmentIntersection (ray-segment hit/miss) and
 * castRays (9-ray forward arc against track boundary polylines).
 */

import { describe, it, expect } from 'vitest';
import { raySegmentIntersection, castRays } from '../../src/ai/raycaster';
import { RAY } from '../../src/ai/ai-config';
import { vec2 } from '../../src/engine/vec2';
import type { Vec2 } from '../../src/engine/types';

// --- Helpers ---

/** Build a rectangular boundary polyline (closed loop). */
function makeRect(cx: number, cy: number, hw: number, hh: number): Vec2[] {
  return [
    vec2(cx - hw, cy - hh),
    vec2(cx + hw, cy - hh),
    vec2(cx + hw, cy + hh),
    vec2(cx - hw, cy + hh),
    vec2(cx - hw, cy - hh), // close the loop
  ];
}

// --- raySegmentIntersection ---

describe('raySegmentIntersection', () => {
  it('hits a horizontal segment perpendicular', () => {
    // Ray from origin going right (+x), segment is a vertical wall at x=5
    const origin = vec2(0, 0);
    const direction = vec2(1, 0);
    const segA = vec2(5, -10);
    const segB = vec2(5, 10);
    const t = raySegmentIntersection(origin, direction, segA, segB);
    expect(t).toBeCloseTo(5, 5);
  });

  it('hits a vertical segment', () => {
    // Ray from origin going up (+y), horizontal segment at y=3
    const origin = vec2(0, 0);
    const direction = vec2(0, 1);
    const segA = vec2(-10, 3);
    const segB = vec2(10, 3);
    const t = raySegmentIntersection(origin, direction, segA, segB);
    expect(t).toBeCloseTo(3, 5);
  });

  it('returns null for ray parallel to segment', () => {
    const origin = vec2(0, 0);
    const direction = vec2(1, 0);
    const segA = vec2(0, 5);
    const segB = vec2(10, 5);
    const t = raySegmentIntersection(origin, direction, segA, segB);
    expect(t).toBeNull();
  });

  it('returns null for ray pointing away from segment', () => {
    // Ray going left, segment is to the right
    const origin = vec2(0, 0);
    const direction = vec2(-1, 0);
    const segA = vec2(5, -10);
    const segB = vec2(5, 10);
    const t = raySegmentIntersection(origin, direction, segA, segB);
    expect(t).toBeNull();
  });

  it('returns null when ray misses segment (passes to the side)', () => {
    // Ray going right from y=20, segment from y=-10 to y=10 — no overlap
    const origin = vec2(0, 20);
    const direction = vec2(1, 0);
    const segA = vec2(5, -10);
    const segB = vec2(5, 10);
    const t = raySegmentIntersection(origin, direction, segA, segB);
    expect(t).toBeNull();
  });

  it('returns null when segment is behind ray origin', () => {
    // Ray going right from x=10, segment at x=5
    const origin = vec2(10, 0);
    const direction = vec2(1, 0);
    const segA = vec2(5, -10);
    const segB = vec2(5, 10);
    const t = raySegmentIntersection(origin, direction, segA, segB);
    expect(t).toBeNull();
  });

  it('hits a diagonal segment at correct distance', () => {
    // Ray going right, 45-degree segment
    const origin = vec2(0, 0);
    const direction = vec2(1, 0);
    const segA = vec2(3, -5);
    const segB = vec2(3, 5);
    const t = raySegmentIntersection(origin, direction, segA, segB);
    expect(t).toBeCloseTo(3, 5);
  });
});

// --- castRays ---

describe('castRays', () => {
  // Inner boundary: small rectangle, outer boundary: large rectangle
  // Car sits between them in the center
  const inner = makeRect(0, 0, 10, 10); // 20x20 box
  const outer = makeRect(0, 0, 50, 50); // 100x100 box

  it('returns exactly 9 ray values', () => {
    const rays = castRays(vec2(0, 0), 0, inner, outer);
    expect(rays).toHaveLength(RAY.numRays);
  });

  it('all ray values are in [0, 1]', () => {
    const rays = castRays(vec2(0, 0), 0, inner, outer);
    for (const v of rays) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it('car at center heading right: forward ray hits inner boundary at 10 units', () => {
    // Heading 0 = +x. Center ray (#4, index 4 of 9) points in heading direction.
    const rays = castRays(vec2(0, 0), 0, inner, outer);
    // Forward ray should hit the inner box wall at x=10, distance=10
    expect(rays[4]).toBeCloseTo(10 / RAY.maxDist, 2);
  });

  it('car near a wall has small distance on closest ray', () => {
    // Car at (8, 0), heading right. Forward ray hits inner wall at x=10, distance=2
    const rays = castRays(vec2(8, 0), 0, inner, outer);
    expect(rays[4]).toBeCloseTo(2 / RAY.maxDist, 2);
    // Rearward rays (first and last) should be further away
    expect(rays[0]).toBeGreaterThan(rays[4]);
  });

  it('nearest-hit test: ray intersects both inner and outer boundary, returns minimum', () => {
    // Car between inner (10) and outer (50), heading right.
    // Place car at (20, 0) heading right (+x).
    // Forward ray hits outer wall at x=50 (dist=30) and inner at x=10 (behind, no hit forward).
    // Actually inner boundary segment x=10 is behind at x < car. Let's use heading left.
    // Car at (20, 0), heading left (PI). Forward ray points -x.
    // Hits inner wall at x=10 (dist=10) and outer wall at x=-50 (dist=70). Min = 10.
    const rays = castRays(vec2(20, 0), Math.PI, inner, outer);
    expect(rays[4]).toBeCloseTo(10 / RAY.maxDist, 2);
  });

  it('no wall within maxDist returns 1.0', () => {
    // Use a huge outer boundary, car far from inner
    const farOuter = makeRect(0, 0, 500, 500);
    const rays = castRays(vec2(200, 0), 0, inner, farOuter);
    // Forward ray (+x) hits farOuter at x=500, distance=300 > maxDist → 1.0
    expect(rays[4]).toBeCloseTo(1.0, 5);
  });

  it('heading rotates the ray fan correctly', () => {
    // Heading up (+y = PI/2). Center ray should hit inner wall at y=10
    const rays = castRays(vec2(0, 0), Math.PI / 2, inner, outer);
    expect(rays[4]).toBeCloseTo(10 / RAY.maxDist, 2);
  });

  it('car outside boundaries returns 1.0 for all rays', () => {
    // Car at (200, 200), far outside both boundaries
    const rays = castRays(vec2(200, 200), 0, inner, outer);
    for (const v of rays) {
      expect(v).toBeCloseTo(1.0, 1);
    }
  });

  it('rays fan symmetrically for centered car heading along axis', () => {
    // Car at center heading right. Rays symmetric about heading.
    // First ray (leftmost, +90°) and last ray (rightmost, -90°) should have same distance.
    const rays = castRays(vec2(0, 0), 0, inner, outer);
    expect(rays[0]).toBeCloseTo(rays[8], 2);
    expect(rays[1]).toBeCloseTo(rays[7], 2);
    expect(rays[2]).toBeCloseTo(rays[6], 2);
    expect(rays[3]).toBeCloseTo(rays[5], 2);
  });
});
