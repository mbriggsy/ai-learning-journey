import { describe, it, expect } from 'vitest';
import { computeVolume, computePan, computeSpatialParams } from '../../src/game/spatial-audio';
import { AUDIO } from '../../src/constants';

describe('computeVolume', () => {
  it('full volume at same position', () => {
    expect(computeVolume({ x: 100, y: 50 }, { x: 100, y: 50 })).toBe(1);
  });

  it('zero volume at max distance', () => {
    expect(computeVolume({ x: AUDIO.MAX_DISTANCE, y: 0 }, { x: 0, y: 0 })).toBe(0);
  });

  it('zero volume beyond max distance', () => {
    expect(computeVolume({ x: AUDIO.MAX_DISTANCE + 100, y: 0 }, { x: 0, y: 0 })).toBe(0);
  });

  it('half volume at half distance', () => {
    expect(computeVolume({ x: AUDIO.MAX_DISTANCE / 2, y: 0 }, { x: 0, y: 0 })).toBeCloseTo(0.5);
  });

  it('accounts for Y distance', () => {
    const vol = computeVolume({ x: 0, y: 300 }, { x: 0, y: 0 });
    expect(vol).toBeGreaterThan(0);
    expect(vol).toBeLessThan(1);
  });
});

describe('computePan', () => {
  it('center pan at same position', () => {
    expect(computePan({ x: 100, y: 50 }, { x: 100, y: 50 })).toBe(0);
  });

  it('positive pan when source is to the right', () => {
    expect(computePan({ x: 200, y: 0 }, { x: 0, y: 0 })).toBeGreaterThan(0);
  });

  it('negative pan when source is to the left', () => {
    expect(computePan({ x: 0, y: 0 }, { x: 200, y: 0 })).toBeLessThan(0);
  });

  it('clamps to -1 at far left', () => {
    expect(computePan({ x: -9999, y: 0 }, { x: 0, y: 0 })).toBe(-1);
  });

  it('clamps to +1 at far right', () => {
    expect(computePan({ x: 9999, y: 0 }, { x: 0, y: 0 })).toBe(1);
  });

  it('full right pan at PAN_DISTANCE', () => {
    expect(computePan({ x: AUDIO.PAN_DISTANCE, y: 0 }, { x: 0, y: 0 })).toBe(1);
  });
});

describe('computeSpatialParams', () => {
  it('returns both volume and pan', () => {
    const params = computeSpatialParams({ x: 200, y: 0 }, { x: 0, y: 0 });
    expect(params.volume).toBeGreaterThan(0);
    expect(params.pan).toBeGreaterThan(0);
  });
});
