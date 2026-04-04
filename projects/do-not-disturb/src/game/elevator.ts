import type { Emitter } from './events';
import type { ElevatorConfig } from '../types/level';
import { NOISE } from '../constants';

export type ElevatorSystem = {
  call(floor: string): void;
  update(dt: number): void;
  readonly currentFloor: string;
  readonly isMoving: boolean;
};

export function createElevator(emitter: Emitter, config: ElevatorConfig): ElevatorSystem {
  let currentFloor = config.stops[0]?.floor ?? 'lobby';
  let targetFloor: string | null = null;
  let travelTimer = 0;

  const floorNumbers = new Map<string, number>();
  for (const stop of config.stops) {
    floorNumbers.set(stop.floor, config.stops.indexOf(stop));
  }

  function floorDistance(from: string, to: string): number {
    const fromIdx = floorNumbers.get(from) ?? 0;
    const toIdx = floorNumbers.get(to) ?? 0;
    return Math.abs(fromIdx - toIdx);
  }

  return {
    call(floor: string) {
      if (floor === currentFloor && targetFloor === null) return;
      targetFloor = floor;
      const dist = Math.max(1, floorDistance(currentFloor, floor));
      travelTimer = dist * config.travelTimePerFloorS;
      emitter.emit('ELEVATOR_CALLED', floorNumbers.get(floor) ?? 0);
    },

    update(dt: number) {
      if (targetFloor === null) return;
      travelTimer -= dt;
      if (travelTimer <= 0) {
        currentFloor = targetFloor;
        targetFloor = null;
        travelTimer = 0;
        emitter.emit('ELEVATOR_ARRIVED', floorNumbers.get(currentFloor) ?? 0);
        const stop = config.stops.find(s => s.floor === currentFloor);
        if (stop) {
          emitter.emit('NOISE_EMITTED', {
            sourceZoneId: `elevator-${currentFloor}`,
            level: NOISE.ELEVATOR_DING_LEVEL,
            position: stop.position,
          });
        }
      }
    },

    get currentFloor() { return currentFloor; },
    get isMoving() { return targetFloor !== null; },
  };
}
