/**
 * Reward Computation Tests
 *
 * Tests for computeReward — dense per-tick reward with per-component
 * breakdown, continuous arc-length progress, and configurable weights.
 */

import { describe, it, expect } from 'vitest';
import { computeReward } from '../../src/ai/reward';
import type { RewardBreakdown } from '../../src/ai/reward';
import { DEFAULT_AI_CONFIG } from '../../src/ai/ai-config';
import type { RewardConfig } from '../../src/ai/ai-config';
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

const config = DEFAULT_AI_CONFIG.weights;

// --- Tests ---

describe('computeReward', () => {
  it('forward progress produces positive reward', () => {
    const prev = makeWorld();
    const curr = makeWorld();
    const precomputed = { prevArcLength: 100, currArcLength: 103 };
    const result = computeReward(prev, curr, false, config, precomputed);
    expect(result.progress).toBeGreaterThan(0);
    expect(result.total).toBeGreaterThan(0);
  });

  it('progress reward is dense — small movement produces nonzero reward', () => {
    const prev = makeWorld();
    const curr = makeWorld();
    // Even 0.5 units of progress should produce reward
    const precomputed = { prevArcLength: 100, currArcLength: 100.5 };
    const result = computeReward(prev, curr, false, config, precomputed);
    expect(result.progress).toBeGreaterThan(0);
    expect(result.progress).not.toBe(0);
  });

  it('speed bonus is proportional to car speed and config weight', () => {
    const prev = makeWorld();
    const curr = makeWorld({ car: { speed: 80 } });
    const customConfig: RewardConfig = { ...config, speedBonus: 0.1 };
    const precomputed = { prevArcLength: 100, currArcLength: 100 };
    const result = computeReward(prev, curr, false, customConfig, precomputed);
    // speed=80, maxSpeed=160, bonus weight=0.1 → 0.5 * 0.1 = 0.05
    expect(result.speed).toBeCloseTo(0.05, 5);
  });

  it('wall contact applies wallPenalty', () => {
    const prev = makeWorld();
    const curr = makeWorld();
    const precomputed = { prevArcLength: 100, currArcLength: 100 };
    const result = computeReward(prev, curr, true, config, precomputed);
    expect(result.wall).toBe(config.wallPenalty);
    expect(result.wall).toBeLessThan(0);
  });

  it('no wall contact produces zero wall penalty', () => {
    const prev = makeWorld();
    const curr = makeWorld();
    const precomputed = { prevArcLength: 100, currArcLength: 100 };
    const result = computeReward(prev, curr, false, config, precomputed);
    expect(result.wall).toBe(0);
  });

  it('off-track surface applies offTrackPenalty', () => {
    const prev = makeWorld();
    const curr = makeWorld({ car: { surface: Surface.Runoff } });
    const precomputed = { prevArcLength: 100, currArcLength: 100 };
    const result = computeReward(prev, curr, false, config, precomputed);
    expect(result.offTrack).toBe(config.offTrackPenalty);
    expect(result.offTrack).toBeLessThan(0);
  });

  it('shoulder surface also applies offTrackPenalty', () => {
    const prev = makeWorld();
    const curr = makeWorld({ car: { surface: Surface.Shoulder } });
    const precomputed = { prevArcLength: 100, currArcLength: 100 };
    const result = computeReward(prev, curr, false, config, precomputed);
    expect(result.offTrack).toBe(config.offTrackPenalty);
  });

  it('on-road surface produces zero offTrack penalty', () => {
    const prev = makeWorld();
    const curr = makeWorld({ car: { surface: Surface.Road } });
    const precomputed = { prevArcLength: 100, currArcLength: 100 };
    const result = computeReward(prev, curr, false, config, precomputed);
    expect(result.offTrack).toBe(0);
  });

  it('backward driving applies backwardPenalty', () => {
    const prev = makeWorld();
    const curr = makeWorld();
    const customConfig: RewardConfig = { ...config, backwardPenalty: -0.01 };
    // Negative delta: arc went from 200 to 197
    const precomputed = { prevArcLength: 200, currArcLength: 197 };
    const result = computeReward(prev, curr, false, customConfig, precomputed);
    expect(result.backward).toBe(-0.01);
  });

  it('stillness below threshold applies stillnessPenalty', () => {
    const prev = makeWorld();
    const curr = makeWorld({ car: { speed: 1 } }); // below threshold of 2.0
    const precomputed = { prevArcLength: 100, currArcLength: 100 };
    const result = computeReward(prev, curr, false, config, precomputed);
    expect(result.stillness).toBe(config.stillnessPenalty);
    expect(result.stillness).toBeLessThan(0);
  });

  it('speed above threshold produces zero stillness penalty', () => {
    const prev = makeWorld();
    const curr = makeWorld({ car: { speed: 10 } });
    const precomputed = { prevArcLength: 100, currArcLength: 100 };
    const result = computeReward(prev, curr, false, config, precomputed);
    expect(result.stillness).toBe(0);
  });

  it('total equals sum of all components', () => {
    const prev = makeWorld();
    const curr = makeWorld({ car: { speed: 1, surface: Surface.Runoff } });
    const customConfig: RewardConfig = {
      ...config,
      speedBonus: 0.05,
      backwardPenalty: -0.01,
    };
    const precomputed = { prevArcLength: 100, currArcLength: 97 };
    const result = computeReward(prev, curr, true, customConfig, precomputed);
    const expectedTotal =
      result.progress + result.speed + result.wall + result.offTrack +
      result.backward + result.stillness;
    expect(result.total).toBeCloseTo(expectedTotal, 10);
  });

  it('with default config, penalty magnitudes are smaller than typical progress reward', () => {
    // Typical progress per tick at moderate speed on a 1000-unit track.
    // Plan states typical per-tick progress is ~0.003 (speed ~180 units/s @ 60Hz → 3/1000).
    // All penalties must be strictly less than this value (AI-06).
    const typicalProgress = 0.003;
    expect(Math.abs(config.wallPenalty)).toBeLessThan(typicalProgress);
    expect(Math.abs(config.offTrackPenalty)).toBeLessThan(typicalProgress);
    expect(Math.abs(config.stillnessPenalty)).toBeLessThan(typicalProgress);
  });

  it('progress wrapping at lap boundary produces small positive delta', () => {
    const prev = makeWorld({ track: { totalLength: 1000 } });
    const curr = makeWorld({ track: { totalLength: 1000 } });
    // Car crossing start/finish: arc goes from 998 to 2 (wrap around 1000)
    const precomputed = { prevArcLength: 998, currArcLength: 2 };
    const result = computeReward(prev, curr, false, config, precomputed);
    // Delta should be +4 (not -996)
    expect(result.progress).toBeGreaterThan(0);
    expect(result.progress).toBeCloseTo((4 / 1000) * config.progress, 5);
  });

  it('configuring different weights produces different reward values', () => {
    const prev = makeWorld();
    const curr = makeWorld({ car: { speed: 80 } });
    const precomputed = { prevArcLength: 100, currArcLength: 105 };

    const config1: RewardConfig = { ...config, progress: 1.0, speedBonus: 0.0 };
    const config2: RewardConfig = { ...config, progress: 2.0, speedBonus: 0.5 };

    const r1 = computeReward(prev, curr, false, config1, precomputed);
    const r2 = computeReward(prev, curr, false, config2, precomputed);

    expect(r2.progress).toBeCloseTo(r1.progress * 2, 5);
    expect(r2.speed).toBeGreaterThan(r1.speed);
    expect(r2.total).not.toBeCloseTo(r1.total, 5);
  });

  it('first tick after reset: car at rest, minimal reward', () => {
    const prev = makeWorld();
    const curr = makeWorld({ car: { speed: 0 } });
    const precomputed = { prevArcLength: 0, currArcLength: 0 };
    const result = computeReward(prev, curr, false, config, precomputed);
    // Zero progress, stillness penalty fires
    expect(result.progress).toBe(0);
    expect(result.stillness).toBe(config.stillnessPenalty);
    expect(result.total).toBeLessThan(0);
  });

  it('multiple simultaneous penalties all contribute to total', () => {
    const prev = makeWorld();
    const curr = makeWorld({ car: { speed: 0.5, surface: Surface.Shoulder } });
    const customConfig: RewardConfig = {
      ...config,
      backwardPenalty: -0.005,
    };
    // Backward + off-track + stillness + wall, all at once
    const precomputed = { prevArcLength: 100, currArcLength: 97 };
    const result = computeReward(prev, curr, true, customConfig, precomputed);
    expect(result.wall).toBeLessThan(0);
    expect(result.offTrack).toBeLessThan(0);
    expect(result.stillness).toBeLessThan(0);
    expect(result.backward).toBeLessThan(0);
    // Total is sum of all negative components + negative progress
    const sum =
      result.progress + result.speed + result.wall + result.offTrack +
      result.backward + result.stillness;
    expect(result.total).toBeCloseTo(sum, 10);
  });

  it('returns all components in RewardBreakdown', () => {
    const prev = makeWorld();
    const curr = makeWorld();
    const precomputed = { prevArcLength: 100, currArcLength: 100 };
    const result = computeReward(prev, curr, false, config, precomputed);
    expect(result).toHaveProperty('progress');
    expect(result).toHaveProperty('speed');
    expect(result).toHaveProperty('wall');
    expect(result).toHaveProperty('offTrack');
    expect(result).toHaveProperty('backward');
    expect(result).toHaveProperty('stillness');
    expect(result).toHaveProperty('total');
  });
});
