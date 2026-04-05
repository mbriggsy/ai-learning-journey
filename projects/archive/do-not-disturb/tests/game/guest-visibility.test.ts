import { describe, it, expect } from 'vitest';
import { isGuestGlowVisible } from '../../src/game/ai/guest-visibility';
import { MONSTER, WORLD } from '../../src/constants';

const TILE = WORLD.TILE_SIZE;
const GUEST = { x: 100, y: 50 };

describe('isGuestGlowVisible', () => {
  it('not visible when Guest is not disguised (already revealed)', () => {
    const player = { x: 100 + TILE, y: 50 }; // very close
    expect(isGuestGlowVisible(GUEST, player, false, true, 1.0)).toBe(false);
  });

  it('visible with lighter within 4 tiles', () => {
    const player = { x: 100 + (MONSTER.GUEST_GLOW_LIGHTER_RANGE_TILES * TILE) - 1, y: 50 };
    expect(isGuestGlowVisible(GUEST, player, true, true, 0)).toBe(true);
  });

  it('not visible with lighter beyond 4 tiles', () => {
    const player = { x: 100 + (MONSTER.GUEST_GLOW_LIGHTER_RANGE_TILES * TILE) + 10, y: 50 };
    expect(isGuestGlowVisible(GUEST, player, true, true, 0)).toBe(false);
  });

  it('visible in high ambient light within 3 tiles', () => {
    const player = { x: 100 + (MONSTER.GUEST_GLOW_VISIBLE_RANGE_TILES * TILE) - 1, y: 50 };
    expect(isGuestGlowVisible(GUEST, player, true, false, 0.5)).toBe(true);
  });

  it('not visible in high ambient light beyond 3 tiles', () => {
    const player = { x: 100 + (MONSTER.GUEST_GLOW_VISIBLE_RANGE_TILES * TILE) + 10, y: 50 };
    expect(isGuestGlowVisible(GUEST, player, true, false, 0.5)).toBe(false);
  });

  it('not visible in low ambient light without lighter', () => {
    const player = { x: 100 + TILE, y: 50 }; // very close
    expect(isGuestGlowVisible(GUEST, player, true, false, 0.2)).toBe(false);
  });

  it('ambient light at exact threshold is visible', () => {
    const player = { x: 100 + TILE, y: 50 };
    expect(isGuestGlowVisible(GUEST, player, true, false, MONSTER.GUEST_GLOW_VISIBLE_LIGHT_THRESHOLD)).toBe(true);
  });

  it('ambient light just below threshold is not visible', () => {
    const player = { x: 100 + TILE, y: 50 };
    expect(isGuestGlowVisible(GUEST, player, true, false, MONSTER.GUEST_GLOW_VISIBLE_LIGHT_THRESHOLD - 0.01)).toBe(false);
  });

  it('lighter takes priority over ambient (visible from further)', () => {
    // 3.5 tiles — outside ambient range (3), inside lighter range (4)
    const player = { x: 100 + 3.5 * TILE, y: 50 };
    expect(isGuestGlowVisible(GUEST, player, true, true, 0.5)).toBe(true);
    expect(isGuestGlowVisible(GUEST, player, true, false, 0.5)).toBe(false);
  });

  it('not visible when too far even with lighter + ambient', () => {
    const player = { x: 100 + 10 * TILE, y: 50 };
    expect(isGuestGlowVisible(GUEST, player, true, true, 1.0)).toBe(false);
  });
});
