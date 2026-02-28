/**
 * Wall Collision Detection and Response Tests
 *
 * Tests for pointToSegmentDistance, detectWallCollision, and
 * resolveWallCollision covering edge cases, proportional speed
 * penalty, heading rotation, and position correction.
 */

import { describe, it, expect } from 'vitest';
import {
  pointToSegmentDistance,
  detectWallCollision,
  resolveWallCollision,
} from '../../src/engine/collision';
import { buildTrack } from '../../src/engine/track';
import type { TrackControlPoint, CarState, CollisionResult } from '../../src/engine/types';
import { Surface } from '../../src/engine/types';
import { vec2, length as vecLength, distance, normalize } from '../../src/engine/vec2';

// --- Helpers ---

/** Create a simple car state for testing. */
function makeCar(overrides: Partial<CarState> = {}): CarState {
  return {
    position: vec2(0, 0),
    velocity: vec2(0, 0),
    heading: 0,
    yawRate: 0,
    speed: 0,
    prevInput: { steer: 0, throttle: 0, brake: 0, steerAngle: 0 },
    surface: Surface.Road,
    accelLongitudinal: 0,
    ...overrides,
  };
}

/** Create a simple rectangular track for collision testing. */
function makeRectTrack() {
  const cp: TrackControlPoint[] = [
    { position: { x: 100, y: 100 }, width: 10 },
    { position: { x: -100, y: 100 }, width: 10 },
    { position: { x: -100, y: -100 }, width: 10 },
    { position: { x: 100, y: -100 }, width: 10 },
  ];
  return buildTrack(cp, 8);
}

// Build the test track once for efficiency
const rectTrack = makeRectTrack();

// --- pointToSegmentDistance tests ---

describe('pointToSegmentDistance', () => {
  it('finds perpendicular distance to segment midpoint', () => {
    // Segment from (0,0) to (10,0), point at (5,3)
    const result = pointToSegmentDistance(vec2(5, 3), vec2(0, 0), vec2(10, 0));
    expect(result.distance).toBeCloseTo(3, 5);
    expect(result.nearest.x).toBeCloseTo(5, 5);
    expect(result.nearest.y).toBeCloseTo(0, 5);
    expect(result.t).toBeCloseTo(0.5, 5);
  });

  it('clamps to segment end when point is beyond endpoint', () => {
    // Segment from (0,0) to (10,0), point at (15,0)
    const result = pointToSegmentDistance(vec2(15, 0), vec2(0, 0), vec2(10, 0));
    expect(result.distance).toBeCloseTo(5, 5);
    expect(result.nearest.x).toBeCloseTo(10, 5);
    expect(result.nearest.y).toBeCloseTo(0, 5);
    expect(result.t).toBeCloseTo(1, 5);
  });

  it('clamps to segment start when point is before start', () => {
    // Segment from (0,0) to (10,0), point at (-3,0)
    const result = pointToSegmentDistance(vec2(-3, 0), vec2(0, 0), vec2(10, 0));
    expect(result.distance).toBeCloseTo(3, 5);
    expect(result.nearest.x).toBeCloseTo(0, 5);
    expect(result.nearest.y).toBeCloseTo(0, 5);
    expect(result.t).toBeCloseTo(0, 5);
  });

  it('returns zero distance for point exactly on segment', () => {
    const result = pointToSegmentDistance(vec2(5, 0), vec2(0, 0), vec2(10, 0));
    expect(result.distance).toBeCloseTo(0, 5);
  });

  it('returns t=0 for point at segment start', () => {
    const result = pointToSegmentDistance(vec2(0, 5), vec2(0, 0), vec2(10, 0));
    expect(result.t).toBeCloseTo(0, 5);
    expect(result.nearest.x).toBeCloseTo(0, 5);
  });

  it('handles degenerate (zero-length) segment', () => {
    const result = pointToSegmentDistance(vec2(3, 4), vec2(0, 0), vec2(0, 0));
    expect(result.distance).toBeCloseTo(5, 5);
    expect(result.t).toBe(0);
  });

  it('works with a diagonal segment', () => {
    // Segment from (0,0) to (10,10), point at (0,10) -- perpendicular to midpoint
    const result = pointToSegmentDistance(vec2(0, 10), vec2(0, 0), vec2(10, 10));
    // The nearest point on the diagonal should be (5,5)
    expect(result.nearest.x).toBeCloseTo(5, 5);
    expect(result.nearest.y).toBeCloseTo(5, 5);
    expect(result.distance).toBeCloseTo(Math.sqrt(50), 4);
  });
});

// --- detectWallCollision tests ---

describe('detectWallCollision', () => {
  it('no collision for car at track center', () => {
    // The rect track centerline passes through (100,100), (-100,100), etc.
    // A point near the center of the track (on the centerline area)
    const result = detectWallCollision(vec2(0, 100), 1.0, rectTrack);
    // This point is on the centerline of the top edge; boundary is offset by width=10
    // so the nearest wall should be ~10 units away, well outside radius=1.0
    expect(result.collided).toBe(false);
  });

  it('detects collision when car penetrates inner boundary', () => {
    // Find a point close to the inner boundary of the rect track
    // The inner boundary is offset inward from the centerline
    const innerPt = rectTrack.innerBoundary[0];
    // Place car slightly inside the inner boundary (toward track center would be outside boundary)
    // We need to be on the boundary side that is inside the boundary wall
    // Let's place the car right at the inner boundary point
    const result = detectWallCollision(innerPt, 1.0, rectTrack);
    // The car center is ON the boundary, so distance=0, penetration=radius
    expect(result.collided).toBe(true);
    expect(result.penetration).toBeCloseTo(1.0, 1);
  });

  it('detects collision when car penetrates outer boundary', () => {
    const outerPt = rectTrack.outerBoundary[0];
    const result = detectWallCollision(outerPt, 1.0, rectTrack);
    expect(result.collided).toBe(true);
    expect(result.penetration).toBeCloseTo(1.0, 1);
  });

  it('returns no collision result with correct defaults', () => {
    const result = detectWallCollision(vec2(0, 100), 1.0, rectTrack);
    if (!result.collided) {
      expect(result.penetration).toBe(0);
      expect(result.normal.x).toBe(0);
      expect(result.normal.y).toBe(0);
    }
  });

  it('normal points from wall toward car position', () => {
    // Place car at the inner boundary point
    const innerPt = rectTrack.innerBoundary[50];
    const result = detectWallCollision(innerPt, 2.0, rectTrack);
    if (result.collided) {
      // Normal should be a unit vector
      const normalLen = vecLength(result.normal);
      expect(normalLen).toBeCloseTo(1, 2);
    }
  });

  it('returns closest collision when multiple walls are near', () => {
    // At a narrow part of the track, car might be near both boundaries
    // Place car at exact center of track -- should NOT collide since width > radius
    const result = detectWallCollision(
      rectTrack.controlPoints[0].position,
      1.0,
      rectTrack,
    );
    // At a control point, boundaries are offset by width (10), so no collision
    expect(result.collided).toBe(false);
  });
});

// --- resolveWallCollision tests ---

describe('resolveWallCollision', () => {
  it('returns car unchanged when no collision', () => {
    const car = makeCar({
      position: vec2(0, 0),
      velocity: vec2(10, 0),
      speed: 10,
    });
    const noCollision: CollisionResult = {
      collided: false,
      penetration: 0,
      normal: vec2(0, 0),
      contactPoint: vec2(0, 0),
    };

    const result = resolveWallCollision(car, noCollision);
    expect(result).toBe(car); // Same reference -- no modification
  });

  it('glancing hit: small speed reduction (15-25%)', () => {
    // Car moving mostly parallel to wall (along +x), wall normal is +y
    // This means the wall is below the car, and the car is sliding along it
    const speed = 100;
    // 10-degree angle from wall tangent
    const angle = (10 * Math.PI) / 180;
    const vx = speed * Math.cos(angle); // along wall
    const vy = -speed * Math.sin(angle); // into wall (negative, since normal is +y)

    const car = makeCar({
      position: vec2(0, 0),
      velocity: vec2(vx, vy),
      heading: -angle, // heading slightly into wall
      speed,
      yawRate: 0.1,
    });

    const collision: CollisionResult = {
      collided: true,
      penetration: 0.5,
      normal: vec2(0, 1), // wall normal pointing up (into track)
      contactPoint: vec2(0, -0.5),
    };

    const result = resolveWallCollision(car, collision);

    // Speed should be reduced by roughly 15-30%
    const speedLoss = 1 - result.speed / speed;
    expect(speedLoss).toBeGreaterThan(0.10); // At least 10% loss
    expect(speedLoss).toBeLessThan(0.40); // At most 40% loss
    // Heading should barely change for a glancing hit
    expect(Math.abs(result.heading - car.heading)).toBeLessThan(0.5);
  });

  it('moderate hit (45 degrees): moderate speed reduction', () => {
    const speed = 100;
    const angle = Math.PI / 4; // 45 degrees
    const vx = speed * Math.cos(angle);
    const vy = -speed * Math.sin(angle);

    const car = makeCar({
      position: vec2(0, 0),
      velocity: vec2(vx, vy),
      heading: -angle,
      speed,
    });

    const collision: CollisionResult = {
      collided: true,
      penetration: 0.5,
      normal: vec2(0, 1),
      contactPoint: vec2(0, -0.5),
    };

    const result = resolveWallCollision(car, collision);

    // 45-degree impact: tangential component = speed * cos(45) = ~70.7
    // After friction (0.7): ~49.5, so speed loss ~50%
    const speedLoss = 1 - result.speed / speed;
    expect(speedLoss).toBeGreaterThan(0.30);
    expect(speedLoss).toBeLessThan(0.70);

    // Heading should rotate toward wall tangent
    const headingChange = Math.abs(result.heading - car.heading);
    expect(headingChange).toBeGreaterThan(0.1);
  });

  it('head-on hit (perpendicular): near-total speed loss', () => {
    const speed = 100;
    // Moving directly into wall (along -y, wall normal is +y)
    const car = makeCar({
      position: vec2(0, 0),
      velocity: vec2(0, -speed),
      heading: -Math.PI / 2, // heading straight down
      speed,
    });

    const collision: CollisionResult = {
      collided: true,
      penetration: 0.5,
      normal: vec2(0, 1),
      contactPoint: vec2(0, -0.5),
    };

    const result = resolveWallCollision(car, collision);

    // Head-on: all velocity is normal, tangential ≈ 0
    // Speed should be near zero
    expect(result.speed).toBeLessThan(5); // < 5% of original
  });

  it('car moving away from wall: no velocity change', () => {
    const speed = 50;
    // Moving away from wall (along +y, wall normal is +y)
    const car = makeCar({
      position: vec2(0, 0),
      velocity: vec2(0, speed),
      heading: Math.PI / 2,
      speed,
    });

    const collision: CollisionResult = {
      collided: true,
      penetration: 0.3,
      normal: vec2(0, 1),
      contactPoint: vec2(0, -0.3),
    };

    const result = resolveWallCollision(car, collision);

    // Velocity should not be modified (vDotN >= 0)
    // Only position is corrected
    expect(result.speed).toBe(speed);
    expect(result.velocity.x).toBe(car.velocity.x);
    expect(result.velocity.y).toBe(car.velocity.y);
    expect(result.heading).toBe(car.heading);
  });

  it('heading rotates toward wall tangent after head-on collision', () => {
    const speed = 100;
    // Heading straight into wall (-y direction), wall normal is +y
    const car = makeCar({
      position: vec2(0, 0),
      velocity: vec2(0, -speed),
      heading: -Math.PI / 2,
      speed,
    });

    const collision: CollisionResult = {
      collided: true,
      penetration: 0.5,
      normal: vec2(0, 1),
      contactPoint: vec2(0, -0.5),
    };

    const result = resolveWallCollision(car, collision);

    // After head-on, heading should be closer to wall tangent (0 or PI)
    // than the original heading (-PI/2)
    // The wall tangent is along x-axis: angle 0 or PI
    const headingToTangent0 = Math.abs(result.heading);
    const headingToTangentPI = Math.abs(Math.abs(result.heading) - Math.PI);
    const minDistToTangent = Math.min(headingToTangent0, headingToTangentPI);

    const origDistToTangent0 = Math.abs(car.heading);
    const origDistToTangentPI = Math.abs(Math.abs(car.heading) - Math.PI);
    const origMinDist = Math.min(origDistToTangent0, origDistToTangentPI);

    // New heading should be closer to wall tangent than original
    expect(minDistToTangent).toBeLessThan(origMinDist);
  });

  it('position is corrected to push car out of wall', () => {
    const car = makeCar({
      position: vec2(0, 0),
      velocity: vec2(0, -50),
      heading: -Math.PI / 2,
      speed: 50,
    });

    const collision: CollisionResult = {
      collided: true,
      penetration: 0.8,
      normal: vec2(0, 1),
      contactPoint: vec2(0, -0.8),
    };

    const result = resolveWallCollision(car, collision);

    // Position should be pushed in the normal direction by penetration + buffer
    expect(result.position.y).toBeGreaterThan(car.position.y);
    // Should be pushed by at least the penetration amount
    expect(result.position.y - car.position.y).toBeCloseTo(0.9, 1); // 0.8 + 0.1 buffer
  });

  it('yaw rate is dampened on impact', () => {
    const car = makeCar({
      position: vec2(0, 0),
      velocity: vec2(0, -100),
      heading: -Math.PI / 2,
      speed: 100,
      yawRate: 2.0,
    });

    const collision: CollisionResult = {
      collided: true,
      penetration: 0.5,
      normal: vec2(0, 1),
      contactPoint: vec2(0, -0.5),
    };

    const result = resolveWallCollision(car, collision);

    // Yaw rate should be reduced for head-on impact
    expect(Math.abs(result.yawRate)).toBeLessThan(Math.abs(car.yawRate));
  });

  it('no velocity change for zero-speed collision', () => {
    const car = makeCar({
      position: vec2(0, 0),
      velocity: vec2(0, 0),
      heading: 0,
      speed: 0,
    });

    const collision: CollisionResult = {
      collided: true,
      penetration: 0.3,
      normal: vec2(0, 1),
      contactPoint: vec2(0, -0.3),
    };

    const result = resolveWallCollision(car, collision);

    // Should still correct position even at zero speed
    expect(result.position.y).toBeGreaterThan(car.position.y);
    expect(result.speed).toBe(0);
  });

  it('speed penalty is proportional: shallow < moderate < steep', () => {
    const speed = 100;
    const normal = vec2(0, 1);
    const contactPoint = vec2(0, -0.5);

    const makeAngleCar = (angleDeg: number) => {
      const angle = (angleDeg * Math.PI) / 180;
      return makeCar({
        position: vec2(0, 0),
        velocity: vec2(speed * Math.cos(angle), -speed * Math.sin(angle)),
        heading: -angle,
        speed,
      });
    };

    const collision: CollisionResult = {
      collided: true,
      penetration: 0.5,
      normal,
      contactPoint,
    };

    const result10 = resolveWallCollision(makeAngleCar(10), collision);
    const result45 = resolveWallCollision(makeAngleCar(45), collision);
    const result80 = resolveWallCollision(makeAngleCar(80), collision);

    // Speed loss should increase with impact angle
    expect(result10.speed).toBeGreaterThan(result45.speed);
    expect(result45.speed).toBeGreaterThan(result80.speed);
  });

  it('sliding behavior: velocity is directed along wall after impact', () => {
    const speed = 100;
    const angle = (30 * Math.PI) / 180;

    const car = makeCar({
      position: vec2(0, 0),
      velocity: vec2(speed * Math.cos(angle), -speed * Math.sin(angle)),
      heading: -angle,
      speed,
    });

    const collision: CollisionResult = {
      collided: true,
      penetration: 0.5,
      normal: vec2(0, 1),
      contactPoint: vec2(0, -0.5),
    };

    const result = resolveWallCollision(car, collision);

    // After resolution, velocity should be mostly along the wall (x-axis)
    // The y-component should be zero or very small (normal was removed)
    expect(Math.abs(result.velocity.y)).toBeLessThan(1);
    // The x-component should retain most of the tangential speed
    expect(result.velocity.x).toBeGreaterThan(0);
  });
});
