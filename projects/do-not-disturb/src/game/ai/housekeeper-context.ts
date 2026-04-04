import type { Position, Velocity, ZoneId } from '../../types/state';
import type { RoomConfig } from '../../types/level';
import type { FSMRunner } from '../../types/fsm';
import type { Emitter } from '../events';
import type { DoorSystem } from '../doors';

export type HousekeeperContext = {
  position: Position;
  velocity: Velocity;
  currentFloor: string;
  floorRooms: readonly RoomConfig[];
  currentRoomIndex: number;
  targetRoom: RoomConfig | null;
  targetFloor: string;
  checkSequence: readonly string[];
  checkTimer: number;
  skipTimer: number;
  reachedTarget: boolean;
  reachedStairs: boolean;
  spottedPlayerPos: Position | null; // set by engine when lighter active in same/adjacent zone
  alertTimer: number;
  fsm: FSMRunner<HousekeeperContext>;
  emitter: Emitter;
  doorSystem: DoorSystem;
  floorOrder: readonly string[];
};

export function createHousekeeperContext(
  startPosition: Position,
  startFloor: string,
  floorRooms: readonly RoomConfig[],
  floorOrder: readonly string[],
  emitter: Emitter,
  doorSystem: DoorSystem,
): HousekeeperContext {
  return {
    position: { ...startPosition },
    velocity: { x: 0, y: 0 },
    currentFloor: startFloor,
    floorRooms,
    currentRoomIndex: 0,
    targetRoom: floorRooms[0] ?? null,
    targetFloor: startFloor,
    checkSequence: [],
    checkTimer: 0,
    skipTimer: 0,
    reachedTarget: false,
    reachedStairs: false,
    spottedPlayerPos: null,
    alertTimer: 0,
    fsm: null as unknown as FSMRunner<HousekeeperContext>,
    emitter,
    doorSystem,
    floorOrder,
  };
}
