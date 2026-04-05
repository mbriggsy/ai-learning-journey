import type { Position, Velocity } from '../../types/state';
import type { FSMRunner } from '../../types/fsm';
import type { Emitter } from '../events';

export type GuestContext = {
  position: Position;
  velocity: Velocity;
  disguised: boolean;
  ambushSpot: Position;
  lungeDirection: number;
  lungeDistance: number;
  resetTimer: number;
  availableSpots: readonly Position[];
  playerPosition: Position; // updated by engine each tick
  fsm: FSMRunner<GuestContext>;
  emitter: Emitter;
};

export function createGuestContext(
  startPosition: Position,
  availableSpots: readonly Position[],
  emitter: Emitter,
): GuestContext {
  return {
    position: { ...startPosition },
    velocity: { x: 0, y: 0 },
    disguised: false,
    ambushSpot: { ...startPosition },
    lungeDirection: 0,
    lungeDistance: 0,
    resetTimer: 0,
    availableSpots,
    playerPosition: { x: 0, y: 0 },
    fsm: null as unknown as FSMRunner<GuestContext>, // set after createFSM
    emitter,
  };
}
