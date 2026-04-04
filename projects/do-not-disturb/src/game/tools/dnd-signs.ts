import type { Position } from '../../types/state';
import type { Emitter } from '../events';
import type { DoorSystem } from '../doors';

export function placeDndSign(
  doorId: string,
  signCount: number,
  doorSystem: DoorSystem,
  emitter: Emitter,
): { used: boolean } {
  if (signCount <= 0) return { used: false };
  if (doorSystem.hasSign(doorId)) return { used: false };

  doorSystem.addSign(doorId);
  const pos = doorSystem.getPosition(doorId);
  if (pos) {
    emitter.emit('TOOL_USED', 'dndSign', pos);
  }
  return { used: true };
}
