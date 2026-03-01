/**
 * Ray Casting — 9-ray forward arc against track boundary polylines.
 *
 * Used by the AI observation builder to give the agent a sense of
 * nearby walls. Each ray returns a normalized [0, 1] distance.
 */

import type { Vec2 } from '../engine/types';
import { RAY } from './ai-config';

/** Pre-computed relative angle offsets for each ray (module-level, zero per-tick allocation). */
const RAY_OFFSETS = Array.from(
  { length: RAY.numRays },
  (_, i) => -RAY.fovRadians / 2 + (i * RAY.fovRadians) / (RAY.numRays - 1),
);

/**
 * Compute intersection distance of a ray with a line segment.
 * Returns the distance along the ray (t >= 0) or null if no hit.
 *
 * Ray:     P = origin + t * direction  (t >= 0)
 * Segment: Q = segA + u * (segB - segA)  (u in [0, 1])
 */
export function raySegmentIntersection(
  origin: Vec2,
  direction: Vec2,
  segA: Vec2,
  segB: Vec2,
): number | null {
  const dx = segB.x - segA.x;
  const dy = segB.y - segA.y;

  const denom = direction.x * dy - direction.y * dx;
  if (Math.abs(denom) < 1e-10) return null; // parallel

  const ox = segA.x - origin.x;
  const oy = segA.y - origin.y;

  const t = (ox * dy - oy * dx) / denom;
  if (t < 0) return null; // behind ray origin

  const u = (ox * direction.y - oy * direction.x) / denom;
  if (u < 0 || u > 1) return null; // outside segment

  return t;
}

/**
 * Cast rays from car position across the forward 180° arc, returning
 * normalized distances to the nearest boundary hit.
 *
 * @returns Array of `RAY.numRays` values, each in [0, 1].
 *          0 = wall at car position, 1 = no wall within maxDist.
 */
export function castRays(
  carPosition: Vec2,
  carHeading: number,
  innerBoundary: readonly Vec2[],
  outerBoundary: readonly Vec2[],
): number[] {
  const results: number[] = new Array(RAY.numRays);

  for (let i = 0; i < RAY.numRays; i++) {
    const angle = carHeading + RAY_OFFSETS[i];
    const dirX = Math.cos(angle);
    const dirY = Math.sin(angle);
    const dir: Vec2 = { x: dirX, y: dirY };

    let minDist: number = RAY.maxDist;

    // Test against all segments of both boundaries
    for (const boundary of [innerBoundary, outerBoundary]) {
      for (let s = 0; s < boundary.length - 1; s++) {
        const t = raySegmentIntersection(carPosition, dir, boundary[s], boundary[s + 1]);
        if (t !== null && t < minDist) {
          minDist = t;
        }
      }
    }

    results[i] = minDist / RAY.maxDist;
  }

  return results;
}
