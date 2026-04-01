import { describe, it, expect } from 'vitest';
import { distanceToTempo, distanceToVolume, bpmToRate, spatialVolume, spatialPan } from '../../src/game/audio-curves.js';

describe('distanceToTempo', () => {
  const maxRange = 9.5;
  const threshold = 0;
  const minBpm = 50;
  const maxBpm = 150;

  it('returns maxBpm at threshold (closest)', () => {
    expect(distanceToTempo(0, maxRange, threshold, minBpm, maxBpm)).toBe(150);
  });

  it('returns 0 at maxRange (too far)', () => {
    expect(distanceToTempo(9.5, maxRange, threshold, minBpm, maxBpm)).toBe(0);
  });

  it('returns 0 beyond maxRange', () => {
    expect(distanceToTempo(20, maxRange, threshold, minBpm, maxBpm)).toBe(0);
  });

  it('linearly interpolates at midpoint', () => {
    const mid = maxRange / 2;
    const tempo = distanceToTempo(mid, maxRange, threshold, minBpm, maxBpm);
    expect(tempo).toBeCloseTo(100, 0); // midpoint between 50 and 150
  });

  it('returns maxBpm below threshold', () => {
    expect(distanceToTempo(-1, maxRange, threshold, minBpm, maxBpm)).toBe(150);
  });
});

describe('distanceToVolume', () => {
  const maxRange = 9.5;
  const threshold = 0;

  it('returns 1 at threshold (closest)', () => {
    expect(distanceToVolume(0, maxRange, threshold)).toBe(1);
  });

  it('returns 0 at maxRange', () => {
    expect(distanceToVolume(9.5, maxRange, threshold)).toBe(0);
  });

  it('returns 0 beyond maxRange', () => {
    expect(distanceToVolume(15, maxRange, threshold)).toBe(0);
  });

  it('returns 0.5 at midpoint', () => {
    const mid = maxRange / 2;
    expect(distanceToVolume(mid, maxRange, threshold)).toBeCloseTo(0.5, 1);
  });

  it('returns 1 for negative distance', () => {
    expect(distanceToVolume(-5, maxRange, threshold)).toBe(1);
  });
});

describe('bpmToRate', () => {
  it('returns 1 at base sample BPM', () => {
    expect(bpmToRate(70, 70)).toBe(1);
  });

  it('returns 2 at double BPM', () => {
    expect(bpmToRate(140, 70)).toBe(2);
  });

  it('returns 0.5 at half BPM', () => {
    expect(bpmToRate(35, 70)).toBe(0.5);
  });

  it('returns 1 if base BPM is 0 (safety)', () => {
    expect(bpmToRate(100, 0)).toBe(1);
  });

  it('returns 1 if base BPM is negative (safety)', () => {
    expect(bpmToRate(100, -10)).toBe(1);
  });
});

describe('spatialVolume', () => {
  it('returns 1 at distance 0', () => {
    expect(spatialVolume(0, 10, 1.5)).toBe(1);
  });

  it('returns 0 at hearing range', () => {
    expect(spatialVolume(10, 10, 1.5)).toBe(0);
  });

  it('returns 0 beyond hearing range', () => {
    expect(spatialVolume(15, 10, 1.5)).toBe(0);
  });

  it('applies power rolloff', () => {
    // At half distance, normalized = 0.5, rolloff 1.5 = 0.5^1.5 ≈ 0.354
    expect(spatialVolume(5, 10, 1.5)).toBeCloseTo(0.354, 2);
  });

  it('returns 0 when hearing range is 0', () => {
    expect(spatialVolume(1, 0, 1.5)).toBe(0);
  });

  it('returns 1 for negative distance', () => {
    expect(spatialVolume(-1, 10, 1.5)).toBe(1);
  });
});

describe('spatialPan', () => {
  it('returns 0 at center', () => {
    expect(spatialPan(0, 100)).toBe(0);
  });

  it('returns positive for right offset', () => {
    expect(spatialPan(50, 100)).toBe(0.5);
  });

  it('returns negative for left offset', () => {
    expect(spatialPan(-50, 100)).toBe(-0.5);
  });

  it('clamps to 1', () => {
    expect(spatialPan(200, 100)).toBe(1);
  });

  it('clamps to -1', () => {
    expect(spatialPan(-200, 100)).toBe(-1);
  });

  it('returns 0 when maxDistance is 0', () => {
    expect(spatialPan(50, 0)).toBe(0);
  });
});
