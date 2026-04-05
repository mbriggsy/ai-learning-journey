import type { Position, ZoneId } from '../../types/state';
import type { Emitter } from '../events';
import { NOISE } from '../../constants';
import { TOOLS } from '../../constants';

export function throwItem(
  playerPos: Position,
  direction: number,
  emitter: Emitter,
  throwableCount: number,
  zoneAtPosition: (pos: Position) => ZoneId,
): { used: boolean } {
  if (throwableCount <= 0) return { used: false };

  const impactPos: Position = {
    x: playerPos.x + direction * TOOLS.THROW_DISTANCE,
    y: playerPos.y,
  };

  const targetZone = zoneAtPosition(impactPos);

  emitter.emit('NOISE_EMITTED', {
    sourceZoneId: targetZone,
    level: NOISE.THROWABLE_IMPACT_LEVEL,
    position: impactPos,
  });

  emitter.emit('TOOL_USED', 'throwable', impactPos);

  return { used: true };
}
