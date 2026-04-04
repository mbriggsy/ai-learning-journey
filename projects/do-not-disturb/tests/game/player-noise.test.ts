import { describe, it, expect } from 'vitest';
import { computeNoise, computeLandingNoise } from '../../src/game/player-noise';
import { NOISE } from '../../src/constants';

describe('computeNoise', () => {
  it('running on wood = max noise (1.0 * 1.0)', () => {
    expect(computeNoise('run', 'wood')).toBeCloseTo(1.0);
  });

  it('sneaking on carpet = near zero (0.05 * 0.4)', () => {
    expect(computeNoise('sneak', 'carpet')).toBeCloseTo(NOISE.SNEAK_LEVEL * NOISE.CARPET_MULT);
  });

  it('running on tile > running on wood (tile echoes)', () => {
    const onTile = computeNoise('run', 'tile');
    const onWood = computeNoise('run', 'wood');
    expect(onTile).toBeGreaterThan(onWood);
  });

  it('idle emits zero noise regardless of surface', () => {
    expect(computeNoise('idle', 'wood')).toBe(0);
    expect(computeNoise('idle', 'carpet')).toBe(0);
    expect(computeNoise('idle', 'tile')).toBe(0);
  });

  it('walking on wood = moderate noise', () => {
    expect(computeNoise('walk', 'wood')).toBeCloseTo(NOISE.WALK_LEVEL);
  });

  it('sliding produces noise', () => {
    expect(computeNoise('slide', 'wood')).toBeCloseTo(NOISE.SLIDE_LEVEL);
  });

  it('jump (airborne) emits zero — noise only on landing', () => {
    expect(computeNoise('jump', 'wood')).toBe(0);
  });
});

describe('computeLandingNoise', () => {
  it('landing on wood', () => {
    expect(computeLandingNoise('wood')).toBeCloseTo(NOISE.JUMP_LAND_LEVEL);
  });

  it('landing on carpet is quieter', () => {
    expect(computeLandingNoise('carpet')).toBeCloseTo(NOISE.JUMP_LAND_LEVEL * NOISE.CARPET_MULT);
  });

  it('landing on tile is louder', () => {
    expect(computeLandingNoise('tile')).toBeCloseTo(NOISE.JUMP_LAND_LEVEL * NOISE.TILE_MULT);
  });

  it('tile landing > wood landing', () => {
    expect(computeLandingNoise('tile')).toBeGreaterThan(computeLandingNoise('wood'));
  });
});
