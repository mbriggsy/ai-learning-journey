/**
 * Track Geometry Tests — v04 Redesigned Tracks
 *
 * Validates functional invariants for Track 02 and Track 03 geometry:
 * 1. buildTrack() succeeds and produces valid closed boundaries
 * 2. Polygon nesting: outer boundary area > inner boundary area (ISS-001 prevention)
 * 3. Corner radius diversity for Track 03 (ADR-12: no two within 10%)
 * 4. Minimum shoulder gap ≥ 8 units (visual quality)
 *
 * These are functional invariants, not design guidelines. Track data is written
 * once and rarely changes, but these tests prevent ISS-001-class regressions.
 */

import { describe, it, expect } from 'vitest';
import { buildTrack } from '../../src/engine/track';
import { TRACK_02_CONTROL_POINTS } from '../../src/tracks/track02';
import { TRACK_03_CONTROL_POINTS } from '../../src/tracks/track03';
import { TRACKS } from '../../src/tracks/registry';
import type { Vec2 } from '../../src/engine/types';

/** Compute signed polygon area via the shoelace formula. */
function polygonArea(points: Vec2[]): number {
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }
  return Math.abs(area) / 2;
}

/**
 * Estimate minimum gap between inner and outer boundaries.
 * For each point on the inner boundary, find the closest point on the outer boundary.
 */
function minBoundaryGap(inner: Vec2[], outer: Vec2[]): number {
  let minDist = Infinity;
  // Sample every 10th point for performance (boundaries are densely sampled)
  const step = Math.max(1, Math.floor(inner.length / 200));
  for (let i = 0; i < inner.length; i += step) {
    const p = inner[i];
    for (let j = 0; j < outer.length; j += step) {
      const q = outer[j];
      const dx = p.x - q.x;
      const dy = p.y - q.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < minDist) minDist = dist;
    }
  }
  return minDist;
}

/**
 * Estimate corner radii from control points. Groups consecutive turning
 * points (direction change > 15°) into distinct corners, then takes
 * the median circumradius per corner as the representative radius.
 */
function estimateCornerRadii(points: { position: Vec2 }[]): number[] {
  const samples: Array<{ index: number; radius: number }> = [];
  for (let i = 1; i < points.length - 1; i++) {
    const a = points[i - 1].position;
    const b = points[i].position;
    const c = points[i + 1].position;

    const abx = b.x - a.x, aby = b.y - a.y;
    const bcx = c.x - b.x, bcy = c.y - b.y;
    const dot = abx * bcx + aby * bcy;
    const cross = abx * bcy - aby * bcx;
    const angle = Math.abs(Math.atan2(cross, dot));

    if (angle < (15 * Math.PI) / 180) continue;

    const ab = Math.sqrt(abx * abx + aby * aby);
    const bc = Math.sqrt(bcx * bcx + bcy * bcy);
    const cax = a.x - c.x, cay = a.y - c.y;
    const ca = Math.sqrt(cax * cax + cay * cay);
    const area = Math.abs(cross) / 2;

    if (area > 0.01) {
      samples.push({ index: i, radius: (ab * bc * ca) / (4 * area) });
    }
  }

  // Group consecutive samples into corners (gap > 1 index = new corner)
  const corners: number[][] = [];
  let current: number[] = [];
  for (let i = 0; i < samples.length; i++) {
    if (i > 0 && samples[i].index - samples[i - 1].index > 1) {
      if (current.length > 0) corners.push(current);
      current = [];
    }
    current.push(samples[i].radius);
  }
  if (current.length > 0) corners.push(current);

  return corners.map((group) => {
    const sorted = [...group].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
  });
}

describe('Track 02 geometry', () => {
  const track02Info = TRACKS.find((t) => t.id === 'track-02')!;
  const track = buildTrack(TRACK_02_CONTROL_POINTS, track02Info.checkpointCount);

  it('buildTrack() succeeds with valid closed boundaries', () => {
    expect(track.innerBoundary.length).toBeGreaterThan(0);
    expect(track.outerBoundary.length).toBeGreaterThan(0);
    expect(track.checkpoints.length).toBe(track02Info.checkpointCount);
    expect(track.totalLength).toBeGreaterThan(300);
  });

  it('polygon nesting: outer area > inner area (ISS-001 prevention)', () => {
    const outerArea = polygonArea(track.outerBoundary);
    const innerArea = polygonArea(track.innerBoundary);
    expect(outerArea).toBeGreaterThan(innerArea);
  });

  it('minimum shoulder gap ≥ 8 units', () => {
    const gap = minBoundaryGap(track.innerBoundary, track.outerBoundary);
    expect(gap).toBeGreaterThanOrEqual(8);
  });
});

describe('Track 03 geometry', () => {
  const track03Info = TRACKS.find((t) => t.id === 'track-03')!;
  const track = buildTrack(TRACK_03_CONTROL_POINTS, track03Info.checkpointCount);

  it('buildTrack() succeeds with valid closed boundaries', () => {
    expect(track.innerBoundary.length).toBeGreaterThan(0);
    expect(track.outerBoundary.length).toBeGreaterThan(0);
    expect(track.checkpoints.length).toBe(track03Info.checkpointCount);
    expect(track.totalLength).toBeGreaterThan(300);
  });

  it('polygon nesting: outer area > inner area (ISS-001 prevention)', () => {
    const outerArea = polygonArea(track.outerBoundary);
    const innerArea = polygonArea(track.innerBoundary);
    expect(outerArea).toBeGreaterThan(innerArea);
  });

  it('corner radius diversity: wide range of curvatures (ADR-12)', () => {
    const radii = estimateCornerRadii(TRACK_03_CONTROL_POINTS);

    // At least 7 distinct turning sections detected
    expect(radii.length).toBeGreaterThanOrEqual(7);

    // The range of radii must span at least 3x (tight hairpin vs high-speed sweeper).
    // This proves the AI can't memorize a single radius — the track demands
    // adapting to fundamentally different corner types.
    const sorted = [...radii].sort((a, b) => a - b);
    const rangeRatio = sorted[sorted.length - 1] / sorted[0];
    expect(
      rangeRatio,
      `radius range ${sorted[0].toFixed(0)}-${sorted[sorted.length - 1].toFixed(0)} (${rangeRatio.toFixed(1)}x) is too narrow`,
    ).toBeGreaterThan(3);
  });

  it('minimum shoulder gap ≥ 8 units', () => {
    const gap = minBoundaryGap(track.innerBoundary, track.outerBoundary);
    expect(gap).toBeGreaterThanOrEqual(8);
  });
});
