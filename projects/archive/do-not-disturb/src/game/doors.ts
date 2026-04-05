import type { Emitter } from './events';
import type { Position, ZoneId } from '../types/state';
import type { DoorConfig } from '../types/level';
import { NOISE } from '../constants';

type DoorInfo = {
  isOpen: boolean;
  position: Position;
  zones: readonly [ZoneId, ZoneId];
  hasDndSign: boolean;
};

export type DoorSystem = {
  init(configs: readonly DoorConfig[], roomId: ZoneId, zoneMapping: ReadonlyMap<string, readonly [ZoneId, ZoneId]>): void;
  toggle(doorId: string): void;
  isOpen(doorId: string): boolean;
  addSign(doorId: string): void;
  hasSign(doorId: string): boolean;
  getPosition(doorId: string): Position | null;
  clearSigns(): void;
  getDoors(): ReadonlyMap<string, { readonly isOpen: boolean; readonly position: Position }>;
};

export function createDoorSystem(emitter: Emitter): DoorSystem {
  const doors = new Map<string, DoorInfo>();

  return {
    init(configs, _roomId, zoneMapping) {
      for (const d of configs) {
        const zones = zoneMapping.get(d.id);
        if (!zones) continue;
        doors.set(d.id, {
          isOpen: d.initialState === 'open',
          position: d.position,
          zones,
          hasDndSign: false,
        });
      }
    },

    toggle(doorId: string) {
      const door = doors.get(doorId);
      if (!door) return;
      door.isOpen = !door.isOpen;
      emitter.emit('DOOR_TOGGLED', {
        doorId,
        isOpen: door.isOpen,
        position: door.position,
      });
      emitter.emit('NOISE_EMITTED', {
        sourceZoneId: door.zones[0],
        level: NOISE.DOOR_LEVEL,
        position: door.position,
      });
    },

    isOpen(doorId: string) {
      return doors.get(doorId)?.isOpen ?? false;
    },

    addSign(doorId: string) {
      const door = doors.get(doorId);
      if (door) door.hasDndSign = true;
    },

    hasSign(doorId: string) {
      return doors.get(doorId)?.hasDndSign ?? false;
    },

    getPosition(doorId: string) {
      return doors.get(doorId)?.position ?? null;
    },

    clearSigns() {
      for (const door of doors.values()) {
        door.hasDndSign = false;
      }
    },

    getDoors() {
      return doors;
    },
  };
}
