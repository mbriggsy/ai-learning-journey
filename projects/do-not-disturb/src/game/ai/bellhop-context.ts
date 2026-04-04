import type { Position, Velocity, ZoneId, NavNode } from '../../types/state';
import type { NoiseEvent } from '../../types/events';
import type { FSMRunner } from '../../types/fsm';
import type { Emitter } from '../events';

export type BellhopContext = {
  position: Position;
  velocity: Velocity;
  currentZone: ZoneId;
  alertLevel: number;
  heardNoise: NoiseEvent | null;
  investigateTimer: number;
  confusedTimer: number;
  currentPath: NavNode[] | null;
  pendingPath: boolean;
  reachedTarget: boolean;
  fsm: FSMRunner<BellhopContext>;
  emitter: Emitter;
};

export function createBellhopContext(
  startPosition: Position,
  startZone: ZoneId,
  emitter: Emitter,
): BellhopContext {
  return {
    position: { ...startPosition },
    velocity: { x: 0, y: 0 },
    currentZone: startZone,
    alertLevel: 0,
    heardNoise: null,
    investigateTimer: 0,
    confusedTimer: 0,
    currentPath: null,
    pendingPath: false,
    reachedTarget: false,
    fsm: null as unknown as FSMRunner<BellhopContext>, // set after createFSM
    emitter,
  };
}
