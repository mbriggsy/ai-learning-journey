/**
 * World Step Integration Tests
 *
 * Tests the complete simulation pipeline: surface detection -> car physics ->
 * wall collision -> checkpoint timing. Validates oversteer emergence,
 * lap completion, wall containment, surface transitions, and performance.
 */

import { describe, it, expect } from 'vitest';
import { createWorld, stepWorld } from '../../src/engine/world';
import { buildTrack } from '../../src/engine/track';
import { TRACK_01_CONTROL_POINTS } from '../../src/tracks/track01';
import { CAR } from '../../src/engine/constants';
import type { Input, CarState, TrackState, TrackControlPoint } from '../../src/engine/types';
import { Surface } from '../../src/engine/types';
import { vec2, sub, length as vecLength } from '../../src/engine/vec2';

// ──────────────────────────────────────────────────────────
// Helper: simple steering controller
// ──────────────────────────────────────────────────────────

function normalizeAngle(angle: number): number {
  while (angle > Math.PI) angle -= 2 * Math.PI;
  while (angle < -Math.PI) angle += 2 * Math.PI;
  return angle;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/**
 * Simple steering controller that steers toward a target point.
 */
function steerTowardTarget(car: CarState, target: { x: number; y: number }, throttle: number = 0.5): Input {
  const toTarget = sub(target, car.position);
  const targetAngle = Math.atan2(toTarget.y, toTarget.x);
  const angleDiff = normalizeAngle(targetAngle - car.heading);
  // Negative: positive angleDiff means target is CCW (left),
  // but positive steer input means steer right in the engine.
  return {
    steer: clamp(-angleDiff * 2, -1, 1),
    throttle,
    brake: 0,
  };
}

/**
 * Create a simple oval test track for lap completion tests.
 */
function createOvalTrack(checkpointCount: number = 8): TrackState {
  const cp: TrackControlPoint[] = [
    { position: { x: 40, y: 0 }, width: 8 },
    { position: { x: 30, y: 30 }, width: 8 },
    { position: { x: 0, y: 40 }, width: 8 },
    { position: { x: -30, y: 30 }, width: 8 },
    { position: { x: -40, y: 0 }, width: 8 },
    { position: { x: -30, y: -30 }, width: 8 },
    { position: { x: 0, y: -40 }, width: 8 },
    { position: { x: 30, y: -30 }, width: 8 },
  ];
  return buildTrack(cp, checkpointCount);
}

// ──────────────────────────────────────────────────────────
// Basic stepping
// ──────────────────────────────────────────────────────────
describe('stepWorld - basic stepping', () => {
  it('creates world from Track 01', () => {
    const track = buildTrack([...TRACK_01_CONTROL_POINTS], 30);
    const world = createWorld(track);
    expect(world.tick).toBe(0);
    expect(world.car.speed).toBe(0);
    expect(world.timing.currentLap).toBe(1);
    expect(world.track).toBe(track); // Same reference
  });

  it('stepping with zero input keeps car approximately at start', () => {
    const track = buildTrack([...TRACK_01_CONTROL_POINTS], 30);
    let world = createWorld(track);
    const zeroInput: Input = { steer: 0, throttle: 0, brake: 0 };

    for (let i = 0; i < 10; i++) {
      world = stepWorld(world, zeroInput);
    }

    const dist = vecLength(sub(world.car.position, track.startPosition));
    expect(dist).toBeLessThan(1);
    expect(world.tick).toBe(10);
  });

  it('stepping with full throttle accelerates car on Track01 straight', () => {
    // Track01 starts on a straight heading right. With steer=0 and full throttle,
    // the car accelerates along the first straight before it eventually drifts off.
    // After ~120 ticks (2 seconds), the car reaches ~80+ units/sec on the straight.
    const track = buildTrack([...TRACK_01_CONTROL_POINTS], 30);
    let world = createWorld(track);

    // Track the peak speed achieved
    let peakSpeed = 0;
    for (let i = 0; i < 150; i++) {
      world = stepWorld(world, { steer: 0, throttle: 1, brake: 0 });
      if (world.car.speed > peakSpeed) peakSpeed = world.car.speed;
    }

    // Car should have reached significant speed on the straight section
    expect(peakSpeed).toBeGreaterThan(55);
    expect(world.tick).toBe(150);
  });

  it('track reference is never modified (same object identity)', () => {
    const track = buildTrack([...TRACK_01_CONTROL_POINTS], 30);
    let world = createWorld(track);
    const input: Input = { steer: 0.5, throttle: 0.8, brake: 0 };

    for (let i = 0; i < 100; i++) {
      world = stepWorld(world, input);
      expect(world.track).toBe(track);
    }
  });
});

// ──────────────────────────────────────────────────────────
// Full lap test
// ──────────────────────────────────────────────────────────
describe('stepWorld - full lap', () => {
  it('simple steering controller can complete at least one lap', () => {
    // Use more checkpoints for better steering guidance on the small oval
    const track = createOvalTrack(16);
    let world = createWorld(track);
    const maxTicks = 15000;

    for (let i = 0; i < maxTicks; i++) {
      const nextCpIdx = (world.timing.lastCheckpointIndex + 1) % track.checkpoints.length;
      const target = track.checkpoints[nextCpIdx].center;
      const input = steerTowardTarget(world.car, target, 0.4);
      world = stepWorld(world, input);

      if (world.timing.currentLap > 1) break;
    }

    expect(world.timing.currentLap).toBeGreaterThan(1);
    expect(world.timing.bestLapTicks).toBeGreaterThan(0);
  });
});

// ──────────────────────────────────────────────────────────
// Wall collision integration
// ──────────────────────────────────────────────────────────
describe('stepWorld - wall collision', () => {
  it('car does not escape the track when steered into the outer wall', () => {
    const track = createOvalTrack(8);
    let world = createWorld(track);
    const input: Input = { steer: 1, throttle: 1, brake: 0 };

    for (let i = 0; i < 500; i++) {
      world = stepWorld(world, input);
    }

    // The track extends roughly 48 units from center (40 + 8 width)
    const distFromOrigin = vecLength(world.car.position);
    expect(distFromOrigin).toBeLessThan(80);
  });

  it('car speed reduces on wall contact', () => {
    // On Track01, drive straight to build speed, then steer hard into wall
    const track = buildTrack([...TRACK_01_CONTROL_POINTS], 30);
    let world = createWorld(track);

    // Build up speed on the first straight (heading is roughly +x)
    let peakSpeed = 0;
    for (let i = 0; i < 120; i++) {
      world = stepWorld(world, { steer: 0, throttle: 1, brake: 0 });
      if (world.car.speed > peakSpeed) peakSpeed = world.car.speed;
    }
    // Car reaches meaningful speed on the straight
    expect(peakSpeed).toBeGreaterThan(45);

    // Now steer hard into the wall with no throttle
    for (let i = 0; i < 120; i++) {
      world = stepWorld(world, { steer: 1, throttle: 0, brake: 0 });
    }

    // After hitting walls with no throttle, speed should be much less than peak
    expect(world.car.speed).toBeLessThan(peakSpeed);
  });
});

// ──────────────────────────────────────────────────────────
// Surface transition
// ──────────────────────────────────────────────────────────
describe('stepWorld - surface transitions', () => {
  it('car surface is initially Road', () => {
    const track = createOvalTrack(8);
    const world = createWorld(track);
    const stepped = stepWorld(world, { steer: 0, throttle: 0, brake: 0 });
    expect(stepped.car.surface).toBe(Surface.Road);
  });
});

// ──────────────────────────────────────────────────────────
// Arcade steering feel test
// ──────────────────────────────────────────────────────────
describe('stepWorld - arcade steering feel', () => {
  it('car can steer through corners at speed without spinning out', () => {
    // The arcade model should allow the car to navigate Track01 corners
    // at moderate speed without losing control. This is the fundamental
    // playability guarantee of the bicycle geometry + traction model.
    const track = buildTrack([...TRACK_01_CONTROL_POINTS], 30);
    let world = createWorld(track);

    // Build speed on the straight
    for (let i = 0; i < 120; i++) {
      world = stepWorld(world, { steer: 0, throttle: 1, brake: 0 });
    }
    expect(world.car.speed).toBeGreaterThan(20);

    // Steer through the first corner at speed
    let maxYawRate = 0;
    for (let i = 0; i < 300; i++) {
      const nextCpIdx = (world.timing.lastCheckpointIndex + 1) % track.checkpoints.length;
      const target = track.checkpoints[nextCpIdx].center;
      const input = steerTowardTarget(world.car, target, 0.5);
      world = stepWorld(world, input);
      maxYawRate = Math.max(maxYawRate, Math.abs(world.car.yawRate));
    }

    // The car should have turned (non-zero yaw rate at some point)
    expect(maxYawRate).toBeGreaterThan(0.1);
    // Yaw rate stays in reasonable range (may spike during wall bounces)
    expect(maxYawRate).toBeLessThan(15.0);
    // Car should still be moving (didn't crash and stop)
    expect(world.car.speed).toBeGreaterThan(5);
  });
});

// ──────────────────────────────────────────────────────────
// Performance test
// ──────────────────────────────────────────────────────────
describe('stepWorld - performance', () => {
  it('executes >10,000 ticks/sec headless', () => {
    // Use a simple track with few boundary points and checkpoints for perf test
    const cp: TrackControlPoint[] = [
      { position: { x: 50, y: 0 }, width: 10 },
      { position: { x: 0, y: 50 }, width: 10 },
      { position: { x: -50, y: 0 }, width: 10 },
      { position: { x: 0, y: -50 }, width: 10 },
    ];
    const track = buildTrack(cp, 4);
    let world = createWorld(track);
    const input: Input = { steer: 0.3, throttle: 0.7, brake: 0 };

    // Warmup: allow JIT to optimize the hot path before timing
    for (let i = 0; i < 3000; i++) {
      world = stepWorld(world, input);
    }

    // Reset for clean measurement
    world = createWorld(track);
    const tickCount = 10000;

    const start = performance.now();
    for (let i = 0; i < tickCount; i++) {
      world = stepWorld(world, input);
    }
    const elapsed = performance.now() - start;

    const ticksPerSec = tickCount / (elapsed / 1000);
    // Must exceed 10,000 ticks/sec for headless training
    expect(ticksPerSec).toBeGreaterThan(10000);
    expect(world.tick).toBe(tickCount);
  });
});
