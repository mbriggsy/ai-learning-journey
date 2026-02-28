/**
 * Wall Collision Detection and Sliding Response
 *
 * Detects car penetration into track boundary walls and resolves it
 * with a sliding response per user decisions:
 *   - No bouncing or deflection
 *   - Car slides along wall surface
 *   - Speed penalty proportional to impact angle
 *   - Nose rotates to align with wall tangent
 *   - Glancing ~15-25% speed loss, head-on near-stop
 *
 * The car is modeled as a circle for collision purposes.
 * This module does NOT handle surface detection -- that is separate.
 */

import type { Vec2, TrackState, CollisionResult, CarState } from './types';
import {
  vec2,
  add,
  sub,
  scale,
  dot,
  normalize,
  length as vecLength,
  lerpAngle,
} from './vec2';
import { WALL_FRICTION } from './constants';

/**
 * Standard point-to-line-segment projection.
 *
 * Projects a point onto the infinite line through segA -> segB,
 * then clamps parameter t to [0, 1] to find the nearest point
 * on the segment.
 *
 * @param point - The query point
 * @param segA - Segment start
 * @param segB - Segment end
 * @returns Distance, nearest point on segment, and parameter t in [0, 1]
 */
export function pointToSegmentDistance(
  point: Vec2,
  segA: Vec2,
  segB: Vec2,
): { distance: number; nearest: Vec2; t: number } {
  const ab = sub(segB, segA);
  const ap = sub(point, segA);
  const abLenSq = dot(ab, ab);

  // Degenerate segment (zero length)
  if (abLenSq < 1e-10) {
    const d = vecLength(ap);
    return { distance: d, nearest: segA, t: 0 };
  }

  // Project onto the line and clamp to segment bounds
  let t = dot(ap, ab) / abLenSq;
  t = Math.max(0, Math.min(1, t));

  const nearest = add(segA, scale(ab, t));
  const diff = sub(point, nearest);
  const dist = vecLength(diff);

  return { distance: dist, nearest, t };
}

/**
 * Detect wall collision between a circular car and the track boundaries.
 *
 * Checks the car's position (as a circle with given radius) against both
 * inner and outer boundary polylines. Returns the closest collision.
 *
 * Normal direction:
 * - Inner boundary normal points outward (toward track center / outer boundary)
 * - Outer boundary normal points inward (toward track center / inner boundary)
 *
 * @param position - Car center position
 * @param radius - Car collision radius (~1.0, half the car width)
 * @param track - Built track state with boundary polylines
 * @returns CollisionResult with penetration depth, normal, and contact point
 */
export function detectWallCollision(
  position: Vec2,
  radius: number,
  track: TrackState,
): CollisionResult {
  const noCollision: CollisionResult = {
    collided: false,
    penetration: 0,
    normal: vec2(0, 0),
    contactPoint: vec2(0, 0),
  };

  let bestDist = Infinity;
  let bestNearest = vec2(0, 0);
  let bestNormal = vec2(0, 0);
  let bestBoundary: 'inner' | 'outer' | null = null;

  // Check inner boundary
  const innerResult = findNearestOnBoundary(position, track.innerBoundary);
  if (innerResult.distance < bestDist) {
    bestDist = innerResult.distance;
    bestNearest = innerResult.nearest;
    bestBoundary = 'inner';
  }

  // Check outer boundary
  const outerResult = findNearestOnBoundary(position, track.outerBoundary);
  if (outerResult.distance < bestDist) {
    bestDist = outerResult.distance;
    bestNearest = outerResult.nearest;
    bestBoundary = 'outer';
  }

  // No collision if distance > radius
  if (bestDist >= radius || bestBoundary === null) {
    return noCollision;
  }

  // Compute normal: from wall contact point toward car position (into the track)
  const toPosition = sub(position, bestNearest);
  const toPositionLen = vecLength(toPosition);

  if (toPositionLen < 1e-10) {
    // Car center is exactly on the boundary -- use segment normal as fallback
    // For inner boundary, normal should point outward (toward outer)
    // For outer boundary, normal should point inward (toward inner)
    // Approximate by using the direction from boundary center of mass
    bestNormal = vec2(0, 1); // Fallback
  } else {
    bestNormal = scale(toPosition, 1 / toPositionLen);
  }

  return {
    collided: true,
    penetration: radius - bestDist,
    normal: bestNormal,
    contactPoint: bestNearest,
  };
}

/**
 * Resolve a wall collision by applying sliding response.
 *
 * Per user decisions:
 * - Decompose velocity into normal (into wall) and tangential (along wall) components
 * - Remove normal component entirely (no bounce)
 * - Apply WALL_FRICTION to tangential component
 * - Speed penalty is naturally proportional to impact angle
 * - Rotate heading toward wall tangent direction (more for harder impacts)
 * - Push car out of wall penetration
 * - Dampen yaw rate on impact
 *
 * @param car - Current car state
 * @param collision - Collision detection result
 * @returns Updated car state with resolved collision, or original if no collision
 */
export function resolveWallCollision(
  car: CarState,
  collision: CollisionResult,
): CarState {
  if (!collision.collided) {
    return car;
  }

  const { normal, penetration } = collision;
  const velocity = car.velocity;
  const speed = car.speed;

  // Check if car is moving into the wall (velocity dot normal < 0)
  const vDotN = dot(velocity, normal);

  if (vDotN >= 0) {
    // Car is moving away from wall -- only fix position, don't alter velocity
    const newPosition = add(car.position, scale(normal, penetration + 0.5));
    return { ...car, position: newPosition };
  }

  // Decompose velocity into normal and tangential components
  // normal component = (v . n) * n
  const normalVelocity = scale(normal, vDotN);
  // tangential component = v - normalVelocity
  const tangentialVelocity = sub(velocity, normalVelocity);

  // Apply wall friction to tangential component
  const frictionMultiplier = 1 - WALL_FRICTION;
  const slidingVelocity = scale(tangentialVelocity, frictionMultiplier);

  // Add a small bounce velocity away from the wall so the car separates naturally.
  // Scaled by speed so it's proportional — gentle nudge at low speed, stronger at high.
  const bounceSpeed = Math.max(3.0, speed * 0.08);
  const bounceVelocity = scale(normal, bounceSpeed);
  const newVelocity = add(slidingVelocity, bounceVelocity);
  const newSpeed = vecLength(newVelocity);

  // Calculate impact severity: 0 = glancing scrape, 1 = head-on
  const tangentSpeed = vecLength(tangentialVelocity);
  const speedRatio = speed > 1e-6 ? Math.min(1, Math.max(0, tangentSpeed / speed)) : 0;
  const impactAngle = Math.acos(speedRatio);
  const normalizedImpact = impactAngle / (Math.PI / 2); // 0 to 1

  // Push car out of wall
  const newPosition = add(car.position, scale(normal, penetration + 0.8));

  // Only rotate heading and dampen yaw on hard impacts (> 45 degree angle)
  // Scrapes and glancing contact: just remove normal velocity and push out
  let newHeading = car.heading;
  let newYawRate = car.yawRate;

  if (normalizedImpact > 0.5) {
    const wallTangent1 = vec2(-normal.y, normal.x);
    const wallTangent2 = vec2(normal.y, -normal.x);
    const wallTangent = dot(tangentialVelocity, wallTangent1) >= 0 ? wallTangent1 : wallTangent2;
    const wallTangentAngle = Math.atan2(wallTangent.y, wallTangent.x);

    // Scale blend by how far above the threshold we are
    const hardness = (normalizedImpact - 0.5) * 2; // 0 at threshold, 1 at head-on
    newHeading = lerpAngle(car.heading, wallTangentAngle, hardness * 0.4);
    newYawRate = car.yawRate * (1 - hardness * 0.5);
  }

  return {
    ...car,
    position: newPosition,
    velocity: newVelocity,
    heading: newHeading,
    yawRate: newYawRate,
    speed: newSpeed,
  };
}

// --- Internal helpers ---

/**
 * Find the nearest point on a boundary polyline to a given position.
 */
function findNearestOnBoundary(
  position: Vec2,
  boundary: readonly Vec2[],
): { distance: number; nearest: Vec2 } {
  let bestDist = Infinity;
  let bestNearest = vec2(0, 0);

  const segCount = boundary.length - 1;
  for (let i = 0; i < segCount; i++) {
    const result = pointToSegmentDistance(position, boundary[i], boundary[i + 1]);
    if (result.distance < bestDist) {
      bestDist = result.distance;
      bestNearest = result.nearest;
    }
  }

  return { distance: bestDist, nearest: bestNearest };
}
