/**
 * Unit tests for computeGapSeconds — pure logic, no PixiJS dependency.
 *
 * Sign convention:
 *   Positive = player is AHEAD (arrived at checkpoint BEFORE AI)
 *   Negative = player is BEHIND (arrived at checkpoint AFTER AI)
 */
import { describe, it, expect } from 'vitest';
import { computeGapSeconds } from '../../src/renderer/GapTimerHud';

describe('computeGapSeconds', () => {
  it('returns positive when player arrived before AI (player is ahead)', () => {
    // Human tick 100, AI tick 160 → (160 - 100) / 60 = +1.0s
    expect(computeGapSeconds(100, 160)).toBeCloseTo(1.0);
  });

  it('returns negative when player arrived after AI (player is behind)', () => {
    // Human tick 160, AI tick 100 → (100 - 160) / 60 = -1.0s
    expect(computeGapSeconds(160, 100)).toBeCloseTo(-1.0);
  });

  it('returns zero when both arrive at the same tick', () => {
    expect(computeGapSeconds(300, 300)).toBe(0);
  });

  it('converts tick difference to seconds at 60Hz correctly', () => {
    // 120 ticks difference / 60 Hz = 2.0 seconds
    expect(computeGapSeconds(60, 180)).toBeCloseTo(2.0);
  });

  it('handles large positive gaps correctly', () => {
    // Human tick 60, AI tick 420 → (420 - 60) / 60 = +6.0s ahead
    expect(computeGapSeconds(60, 420)).toBeCloseTo(6.0);
  });

  it('negative result sign confirms player-behind semantics', () => {
    // When humanTick > aiTick, result should be negative
    const result = computeGapSeconds(200, 80);
    expect(result).toBeLessThan(0);
    expect(result).toBeCloseTo(-2.0);
  });

  it('handles fractional tick differences correctly', () => {
    // 45 ticks / 60 Hz = 0.75 seconds
    expect(computeGapSeconds(100, 145)).toBeCloseTo(0.75);
  });

  it('handles single-tick difference', () => {
    // 1 tick / 60 Hz ≈ 0.01667 seconds
    expect(computeGapSeconds(100, 101)).toBeCloseTo(1 / 60);
  });
});
