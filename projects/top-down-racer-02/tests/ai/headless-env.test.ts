/**
 * HeadlessEnv Tests
 *
 * Integration-level tests using a real track (track-01) from the registry.
 * No WebSocket server needed — tests exercise the HeadlessEnv class directly.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { HeadlessEnv } from '../../src/ai/headless-env';
import { OBSERVATION_SIZE } from '../../src/ai/observations';
import type { AiConfig } from '../../src/ai/ai-config';
import { DEFAULT_AI_CONFIG } from '../../src/ai/ai-config';

/** Short-episode config for fast tests. */
const SHORT_CONFIG: AiConfig = {
  weights: { ...DEFAULT_AI_CONFIG.weights },
  episode: { maxSteps: 5, stillnessTimeoutTicks: 3 },
};

describe('HeadlessEnv', () => {
  let env: HeadlessEnv;

  beforeEach(() => {
    env = new HeadlessEnv('track-01', SHORT_CONFIG);
  });

  // --- reset() ---

  describe('reset()', () => {
    it('returns a 14-element observation array', () => {
      const { observation } = env.reset();
      expect(observation).toHaveLength(OBSERVATION_SIZE);
    });

    it('resets step count (stepping after reset starts from 0)', () => {
      env.reset();
      const result = env.step([0, 0, 0]);
      expect(result.info.stepCount).toBe(1);
    });

    it('observation values are all within [-1, 1] bounds', () => {
      const { observation } = env.reset();
      for (const val of observation) {
        expect(val).toBeGreaterThanOrEqual(-1);
        expect(val).toBeLessThanOrEqual(1);
      }
    });
  });

  // --- step() ---

  describe('step()', () => {
    it('with neutral action (0,0,0) returns valid StepResult', () => {
      env.reset();
      const result = env.step([0, 0, 0]);
      expect(result.observation).toHaveLength(OBSERVATION_SIZE);
      expect(typeof result.reward).toBe('number');
      expect(typeof result.terminated).toBe('boolean');
      expect(typeof result.truncated).toBe('boolean');
      expect(result.info).toBeDefined();
    });

    it('advances the step counter', () => {
      env.reset();
      env.step([0, 0, 0]);
      env.step([0, 0, 0]);
      const result = env.step([0, 0, 0]);
      expect(result.info.stepCount).toBe(3);
    });

    it('with forward action (0,1,0) produces positive speed', () => {
      env.reset();
      // Step several times to build up speed
      let result = env.step([0, 1, 0]);
      result = env.step([0, 1, 0]);
      result = env.step([0, 1, 0]);
      expect(result.info.rawSpeed).toBeGreaterThan(0);
    });

    it('observation values stay within [-1, 1] bounds during steps', () => {
      env.reset();
      for (let i = 0; i < 5; i++) {
        const result = env.step([0, 1, 0]);
        for (const val of result.observation) {
          expect(val).toBeGreaterThanOrEqual(-1);
          expect(val).toBeLessThanOrEqual(1);
        }
      }
    });
  });

  // --- Termination ---

  describe('termination', () => {
    it('episode truncates after maxSteps', () => {
      env.reset();
      let result = env.step([0, 1, 0]);
      for (let i = 1; i < SHORT_CONFIG.episode.maxSteps; i++) {
        result = env.step([0, 1, 0]);
      }
      expect(result.truncated).toBe(true);
      expect(result.info.stepCount).toBe(SHORT_CONFIG.episode.maxSteps);
    });

    it('episode terminates after stillness timeout', () => {
      env.reset();
      let result = env.step([0, 0, 0]);
      for (let i = 1; i < SHORT_CONFIG.episode.stillnessTimeoutTicks; i++) {
        result = env.step([0, 0, 0]);
      }
      expect(result.terminated).toBe(true);
      expect(result.info.stillnessCounter).toBe(SHORT_CONFIG.episode.stillnessTimeoutTicks);
    });
  });

  // --- Info dict ---

  describe('info dict', () => {
    it('contains all reward breakdown components', () => {
      env.reset();
      const result = env.step([0, 1, 0]);
      expect(result.info).toHaveProperty('progress');
      expect(result.info).toHaveProperty('speed');
      expect(result.info).toHaveProperty('wall');
      expect(result.info).toHaveProperty('offTrack');
      expect(result.info).toHaveProperty('backward');
      expect(result.info).toHaveProperty('stillness');
    });

    it('contains wallContact boolean', () => {
      env.reset();
      const result = env.step([0, 0, 0]);
      expect(typeof result.info.wallContact).toBe('boolean');
    });
  });

  // --- Action validation ---

  describe('action validation', () => {
    it('clamps steer > 1 to 1 (does not throw)', () => {
      env.reset();
      expect(() => env.step([2, 0.5, 0])).not.toThrow();
    });

    it('clamps throttle < 0 to 0 (does not throw)', () => {
      env.reset();
      expect(() => env.step([0, -1, 0])).not.toThrow();
    });

    it('rejects NaN values with descriptive error', () => {
      env.reset();
      expect(() => env.step([NaN, 0, 0])).toThrow('finite numbers');
    });

    it('rejects wrong-length arrays', () => {
      env.reset();
      expect(() => env.step([0, 0] as unknown as [number, number, number])).toThrow('3-element array');
    });
  });

  // --- Edge cases ---

  describe('edge cases', () => {
    it('multiple reset() calls work (episode restarts cleanly)', () => {
      env.reset();
      env.step([0, 1, 0]);
      env.step([0, 1, 0]);
      const { observation } = env.reset();
      expect(observation).toHaveLength(OBSERVATION_SIZE);
      const result = env.step([0, 0, 0]);
      expect(result.info.stepCount).toBe(1);
    });

    it('step() before reset() throws descriptive error', () => {
      const freshEnv = new HeadlessEnv('track-01', SHORT_CONFIG);
      expect(() => freshEnv.step([0, 0, 0])).toThrow('step() called before reset()');
    });
  });
});
