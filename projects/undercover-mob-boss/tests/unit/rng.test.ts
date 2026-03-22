import { describe, it, expect } from 'vitest';
import { mulberry32 } from '../../src/server/game/rng';

describe('mulberry32', () => {
  it('produces deterministic output for same seed', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const valuesA = Array.from({ length: 10 }, () => a());
    const valuesB = Array.from({ length: 10 }, () => b());
    expect(valuesA).toEqual(valuesB);
  });

  it('produces different output for different seeds', () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    expect(a()).not.toBe(b());
  });

  it('returns values in [0, 1)', () => {
    const rng = mulberry32(999);
    for (let i = 0; i < 1000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});
