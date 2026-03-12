import { describe, it, expect } from 'vitest';
import { normalizeObservation, type VecNormStats } from '../../src/ai/vecnormalize';

/** Helper to create default stats with overrides. */
function makeStats(overrides: Partial<VecNormStats> = {}): VecNormStats {
  const n = overrides.obsMean?.length ?? 3;
  return {
    obsMean: new Array(n).fill(0),
    obsVar: new Array(n).fill(1),
    clipObs: 10.0,
    epsilon: 1e-8,
    ...overrides,
  };
}

describe('normalizeObservation', () => {
  it('returns obs unchanged when mean=0, var=1 (identity normalization)', () => {
    const obs = [0.5, -0.3, 1.2];
    const stats = makeStats({ obsMean: [0, 0, 0], obsVar: [1, 1, 1] });
    const result = normalizeObservation(obs, stats);

    expect(result).toHaveLength(3);
    for (let i = 0; i < obs.length; i++) {
      expect(result[i]).toBeCloseTo(obs[i], 6);
    }
  });

  it('clips values above +clipObs', () => {
    // obs=100, mean=0, var=1 -> normalized=100, clipped to 10
    const stats = makeStats({ obsMean: [0], obsVar: [1], clipObs: 10.0 });
    const result = normalizeObservation([100], stats);
    expect(result[0]).toBe(10.0);
  });

  it('clips values below -clipObs', () => {
    // obs=-100, mean=0, var=1 -> normalized=-100, clipped to -10
    const stats = makeStats({ obsMean: [0], obsVar: [1], clipObs: 10.0 });
    const result = normalizeObservation([-100], stats);
    expect(result[0]).toBe(-10.0);
  });

  it('normalizes each element independently with different mean/var', () => {
    // Element 0: (5 - 3) / sqrt(4 + 1e-8) = 2 / 2 = 1.0
    // Element 1: (10 - 5) / sqrt(25 + 1e-8) = 5 / 5 = 1.0
    // Element 2: (0 - 2) / sqrt(1 + 1e-8) = -2 / 1 = -2.0
    const obs = [5, 10, 0];
    const stats = makeStats({
      obsMean: [3, 5, 2],
      obsVar: [4, 25, 1],
    });
    const result = normalizeObservation(obs, stats);

    expect(result[0]).toBeCloseTo(1.0, 6);
    expect(result[1]).toBeCloseTo(1.0, 6);
    expect(result[2]).toBeCloseTo(-2.0, 6);
  });

  it('uses epsilon to prevent division by zero when var=0', () => {
    // (1 - 0) / sqrt(0 + 1e-8) = 1 / 1e-4 = 10000, clipped to 10
    const stats = makeStats({ obsMean: [0], obsVar: [0], clipObs: 10.0, epsilon: 1e-8 });
    const result = normalizeObservation([1], stats);
    expect(result[0]).toBe(10.0); // clipped
  });

  it('matches the SB3 formula: clip((obs - mean) / sqrt(var + eps), -clip, clip)', () => {
    // Full 14-element observation vector (realistic)
    const obs = [0.8, 0.6, 0.4, 0.3, 0.2, 0.5, 0.7, 0.9, 1.0, 120, 0.1, -0.3, 0.45, 0.12];
    const mean = [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 100, 0.0, 0.0, 0.5, 0.0];
    const variance = [0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 400, 0.01, 0.04, 0.05, 0.01];
    const eps = 1e-8;
    const clipObs = 10.0;

    const stats: VecNormStats = { obsMean: mean, obsVar: variance, clipObs, epsilon: eps };
    const result = normalizeObservation(obs, stats);

    expect(result).toHaveLength(14);

    // Manually verify each element
    for (let i = 0; i < 14; i++) {
      const expected = (obs[i] - mean[i]) / Math.sqrt(variance[i] + eps);
      const clipped = Math.max(-clipObs, Math.min(clipObs, expected));
      expect(result[i]).toBeCloseTo(clipped, 6);
    }
  });

  it('output array has same length as input', () => {
    const obs = [1, 2, 3, 4, 5];
    const stats = makeStats({ obsMean: [0, 0, 0, 0, 0], obsVar: [1, 1, 1, 1, 1] });
    const result = normalizeObservation(obs, stats);
    expect(result).toHaveLength(obs.length);
  });

  it('throws descriptive Error on dimension mismatch (obs vs mean)', () => {
    const obs = [1, 2, 3];
    const stats = makeStats({ obsMean: [0, 0], obsVar: [1, 1, 1] });
    expect(() => normalizeObservation(obs, stats)).toThrow(/dimension mismatch/i);
    expect(() => normalizeObservation(obs, stats)).toThrow(/obs=3/);
    expect(() => normalizeObservation(obs, stats)).toThrow(/mean=2/);
  });

  it('throws descriptive Error on dimension mismatch (obs vs var)', () => {
    const obs = [1, 2, 3];
    const stats = makeStats({ obsMean: [0, 0, 0], obsVar: [1, 1] });
    expect(() => normalizeObservation(obs, stats)).toThrow(/dimension mismatch/i);
    expect(() => normalizeObservation(obs, stats)).toThrow(/var=2/);
  });

  it('handles custom clipObs values', () => {
    // obs=5, mean=0, var=1 -> normalized=5, clipObs=3 -> clipped to 3
    const stats = makeStats({ obsMean: [0], obsVar: [1], clipObs: 3.0 });
    const result = normalizeObservation([5], stats);
    expect(result[0]).toBe(3.0);
  });
});
