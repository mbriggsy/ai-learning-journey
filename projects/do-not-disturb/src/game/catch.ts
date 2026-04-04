import type { PlayerState, MonsterState, Position } from '../types/state';
import type { HidingSpotType } from '../types/level';
import { MONSTER } from '../constants';
import { isProtectedFrom } from './hiding';

function distance(a: Position, b: Position): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function checkCatch(
  player: PlayerState,
  monsters: readonly MonsterState[],
  random: () => number,
): string | null {
  for (const monster of monsters) {
    if (!monster.active) continue;
    const dist = distance(player.position, monster.position);
    if (dist >= MONSTER.CATCH_RADIUS) continue;

    if (player.hiding) {
      const protection = isProtectedFrom(player.hiding.spotId as HidingSpotType, monster.id);
      if (protection >= 1) continue; // fully safe
      if (protection > 0 && random() < protection) continue; // probabilistic escape
    }

    return monster.id; // caught
  }
  return null;
}
