/**
 * Observation Vector Tests
 *
 * Tests for buildObservation — 14-value normalized vector from
 * world state, ray distances, and pre-computed track progress.
 */

import { describe, it, expect } from 'vitest';
import { buildObservation, OBSERVATION_SIZE } from '../../src/ai/observations';
import { RAY, OBS } from '../../src/ai/ai-config';
import { vec2 } from '../../src/engine/vec2';
import { Surface } from '../../src/engine/types';
import type { WorldState, CarState, TrackState, TimingState } from '../../src/engine/types';

// --- Helpers ---

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
    slipAngle: 0,
    ...overrides,
  };
}

function makeTrack(overrides: Partial<TrackState> = {}): TrackState {
  return {
    controlPoints: [],
    innerBoundary: [],
    outerBoundary: [],
    innerRoadEdge: [],
    outerRoadEdge: [],
    checkpoints: [],
    arcLengthTable: { entries: [], totalLength: 1000 },
    totalLength: 1000,
    startPosition: vec2(0, 0),
    startHeading: 0,
    ...overrides,
  } as TrackState;
}

function makeTiming(overrides: Partial<TimingState> = {}): TimingState {
  return {
    currentLapTicks: 0,
    bestLapTicks: Infinity,
    totalRaceTicks: 0,
    currentLap: 1,
    lastCheckpointIndex: 0,
    lapComplete: false,
    lapTimes: [],
    ...overrides,
  };
}

function makeWorld(overrides: {
  car?: Partial<CarState>;
  track?: Partial<TrackState>;
  timing?: Partial<TimingState>;
  tick?: number;
} = {}): WorldState {
  return {
    tick: overrides.tick ?? 0,
    car: makeCar(overrides.car),
    track: makeTrack(overrides.track),
    timing: makeTiming(overrides.timing),
  };
}

const defaultRays = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9];
const defaultProgress = { distance: 10, arcLength: 250 };

// --- Tests ---

describe('OBSERVATION_SIZE', () => {
  it('equals 14', () => {
    expect(OBSERVATION_SIZE).toBe(14);
  });
});

describe('buildObservation', () => {
  it('returns array of exactly 14 numbers', () => {
    const obs = buildObservation(makeWorld(), defaultRays, defaultProgress);
    expect(obs).toHaveLength(OBSERVATION_SIZE);
    for (const v of obs) {
      expect(typeof v).toBe('number');
    }
  });

  it('first 9 values are the ray values passed in (unchanged)', () => {
    const obs = buildObservation(makeWorld(), defaultRays, defaultProgress);
    for (let i = 0; i < 9; i++) {
      expect(obs[i]).toBe(defaultRays[i]);
    }
  });

  it('value 10 (index 9): speed normalized to [0, 1]', () => {
    const world = makeWorld({ car: { speed: 80 } });
    const obs = buildObservation(world, defaultRays, defaultProgress);
    // CAR.maxSpeed = 160, so 80/160 = 0.5
    expect(obs[9]).toBeCloseTo(0.5, 5);
  });

  it('value 11 (index 10): yaw rate normalized to [-1, 1]', () => {
    const world = makeWorld({ car: { yawRate: 2.5 } });
    const obs = buildObservation(world, defaultRays, defaultProgress);
    // OBS.maxYawRate = 5.0, so 2.5/5.0 = 0.5
    expect(obs[10]).toBeCloseTo(0.5, 5);
  });

  it('value 12 (index 11): steering input from prevInput.steer', () => {
    const world = makeWorld({
      car: { prevInput: { steer: -0.7, throttle: 1, brake: 0, steerAngle: 0 } },
    });
    const obs = buildObservation(world, defaultRays, defaultProgress);
    expect(obs[11]).toBeCloseTo(-0.7, 5);
  });

  it('value 13 (index 12): lap progress from arcLength / totalLength', () => {
    const world = makeWorld({ track: { totalLength: 1000 } });
    const progress = { distance: 10, arcLength: 250 };
    const obs = buildObservation(world, defaultRays, progress);
    // 250 / 1000 = 0.25
    expect(obs[12]).toBeCloseTo(0.25, 5);
  });

  it('value 14 (index 13): centerline distance normalized to [0, 1]', () => {
    const progress = { distance: 40, arcLength: 100 };
    const obs = buildObservation(makeWorld(), defaultRays, progress);
    // 40 / OBS.maxCenterlineDist(80) = 0.5
    expect(obs[13]).toBeCloseTo(0.5, 5);
  });

  it('all values are within [-1, 1]', () => {
    const world = makeWorld({ car: { speed: 160, yawRate: 5.0 } });
    const obs = buildObservation(world, defaultRays, { distance: 80, arcLength: 1000 });
    for (const v of obs) {
      expect(v).toBeGreaterThanOrEqual(-1);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it('clamps yaw rate beyond max range', () => {
    const world = makeWorld({ car: { yawRate: 10 } });
    const obs = buildObservation(world, defaultRays, defaultProgress);
    // 10 / 5.0 = 2.0, clamped to 1.0
    expect(obs[10]).toBe(1);
  });

  it('clamps negative yaw rate beyond max range', () => {
    const world = makeWorld({ car: { yawRate: -10 } });
    const obs = buildObservation(world, defaultRays, defaultProgress);
    expect(obs[10]).toBe(-1);
  });

  it('speed at max returns 1.0', () => {
    const world = makeWorld({ car: { speed: 160 } });
    const obs = buildObservation(world, defaultRays, defaultProgress);
    expect(obs[9]).toBeCloseTo(1.0, 5);
  });

  it('centerline distance capped at 1.0 for very large distances', () => {
    const progress = { distance: 200, arcLength: 100 };
    const obs = buildObservation(makeWorld(), defaultRays, progress);
    expect(obs[13]).toBe(1);
  });

  it('car at start position produces valid observation', () => {
    const obs = buildObservation(
      makeWorld(),
      [1, 1, 1, 1, 1, 1, 1, 1, 1],
      { distance: 0, arcLength: 0 },
    );
    expect(obs).toHaveLength(14);
    expect(obs[9]).toBe(0); // speed = 0
    expect(obs[12]).toBe(0); // arcLength = 0
    expect(obs[13]).toBe(0); // distance = 0
  });
});
