import type { Position } from '../../types/state';
import { MONSTER, WORLD } from '../../constants';

function distance(a: Position, b: Position): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Determines if the player can see the Guest's eye glow.
 *
 * Two detection paths:
 * 1. Lighter active → glow visible at ~4 tiles
 * 2. Ambient light > 0.4 → glow visible at ~3 tiles
 *
 * Returns false if Guest is not disguised (already revealed during lunge/reset).
 */
export function isGuestGlowVisible(
  guestPos: Position,
  playerPos: Position,
  disguised: boolean,
  lighterActive: boolean,
  ambientLight: number,
): boolean {
  if (!disguised) return false; // already fully visible when not disguised

  const dist = distance(guestPos, playerPos);

  // Lighter reveals from further away
  if (lighterActive && dist < MONSTER.GUEST_GLOW_LIGHTER_RANGE_TILES * WORLD.TILE_SIZE) {
    return true;
  }

  // High ambient light reveals at shorter range
  if (ambientLight >= MONSTER.GUEST_GLOW_VISIBLE_LIGHT_THRESHOLD
      && dist < MONSTER.GUEST_GLOW_VISIBLE_RANGE_TILES * WORLD.TILE_SIZE) {
    return true;
  }

  return false;
}
