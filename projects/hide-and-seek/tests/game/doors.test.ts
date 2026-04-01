import { describe, it, expect } from 'vitest';
import { DoorSystem, createDoorSystem } from '../../src/game/doors.js';
import type { DoorId, DoorState } from '../../src/types/state.js';
import type { TypedEmitter } from '../../src/types/events.js';
import type { GameEventMap } from '../../src/types/events.js';
import { createTypedEmitter } from '../../src/game/events.js';

const MAP_W = 20;
const MAP_H = 20;

function makeGrids() {
  return {
    losGrid: new Uint8Array(MAP_W * MAP_H),
    collisionGrid: new Uint8Array(MAP_W * MAP_H),
  };
}

function makeDoorObjects(doors: Array<{ id: number; name: string; tileX: number; tileY: number; isOpen?: boolean }>) {
  return doors.map(d => ({
    id: d.id,
    name: d.name,
    x: d.tileX * 32,
    y: d.tileY * 32,
  }));
}

function makeSystem(doorDefs: Array<{ id: number; name: string; tileX: number; tileY: number; isOpen?: boolean }> = []) {
  const { losGrid, collisionGrid } = makeGrids();
  const emitter = createTypedEmitter<GameEventMap>();
  const objects = makeDoorObjects(doorDefs);
  const system = createDoorSystem(objects, MAP_W, MAP_H, losGrid, collisionGrid, emitter);
  return { system, losGrid, collisionGrid, emitter };
}

describe('DoorSystem', () => {
  describe('createDoorSystem', () => {
    it('parses Tiled objects with pixel-to-tile conversion', () => {
      const { system } = makeSystem([
        { id: 1, name: 'door_1', tileX: 5, tileY: 7 },
      ]);
      const doors = system.getDoors();
      expect(doors.size).toBe(1);
      const door = doors.get('door_1' as DoorId);
      expect(door).toBeDefined();
      expect(door!.position).toEqual({ x: 5, y: 7 });
      expect(door!.isOpen).toBe(false);
    });

    it('rejects out-of-bounds coordinates', () => {
      const { system } = makeSystem([
        { id: 1, name: 'oob', tileX: 25, tileY: 7 }, // x > MAP_W
      ]);
      expect(system.getDoors().size).toBe(0);
    });

    it('validates unique tile positions', () => {
      const { system } = makeSystem([
        { id: 1, name: 'door_a', tileX: 5, tileY: 7 },
        { id: 2, name: 'door_b', tileX: 5, tileY: 7 }, // same tile
      ]);
      expect(system.getDoors().size).toBe(1);
    });
  });

  describe('getDoorAt', () => {
    it('returns correct door by tile position (O(1))', () => {
      const { system } = makeSystem([
        { id: 1, name: 'door_1', tileX: 5, tileY: 7 },
        { id: 2, name: 'door_2', tileX: 10, tileY: 3 },
      ]);
      const door = system.getDoorAt(5, 7);
      expect(door).toBeDefined();
      expect(door!.id).toBe('door_1');
    });

    it('returns undefined for empty tile', () => {
      const { system } = makeSystem([
        { id: 1, name: 'door_1', tileX: 5, tileY: 7 },
      ]);
      expect(system.getDoorAt(6, 7)).toBeUndefined();
    });
  });

  describe('getNearestDoor', () => {
    it('returns nearest door within range', () => {
      const { system } = makeSystem([
        { id: 1, name: 'door_far', tileX: 10, tileY: 10 },
        { id: 2, name: 'door_near', tileX: 6, tileY: 5 },
      ]);
      const nearest = system.getNearestDoor(5, 5, 3);
      expect(nearest).toBeDefined();
      expect(nearest!.id).toBe('door_near');
    });

    it('returns undefined when no doors in range', () => {
      const { system } = makeSystem([
        { id: 1, name: 'door_1', tileX: 15, tileY: 15 },
      ]);
      expect(system.getNearestDoor(1, 1, 2)).toBeUndefined();
    });

    it('tiebreaks by DoorId when equidistant', () => {
      const { system } = makeSystem([
        { id: 2, name: 'door_b', tileX: 6, tileY: 5 },
        { id: 1, name: 'door_a', tileX: 4, tileY: 5 },
      ]);
      const nearest = system.getNearestDoor(5, 5, 3);
      expect(nearest).toBeDefined();
      expect(nearest!.id).toBe('door_a');
    });
  });

  describe('toggleDoor', () => {
    it('flips isOpen and increments doorGeneration', () => {
      const { system } = makeSystem([
        { id: 1, name: 'door_1', tileX: 5, tileY: 7 },
      ]);
      expect(system.getDoorGeneration()).toBe(0);

      system.toggleDoor('door_1' as DoorId, 100);
      const door = system.getDoors().get('door_1' as DoorId)!;
      expect(door.isOpen).toBe(true);
      expect(system.getDoorGeneration()).toBe(1);

      system.toggleDoor('door_1' as DoorId, 200);
      const door2 = system.getDoors().get('door_1' as DoorId)!;
      expect(door2.isOpen).toBe(false);
      expect(system.getDoorGeneration()).toBe(2);
    });

    it('returns false for unknown DoorId', () => {
      const { system } = makeSystem([]);
      expect(system.toggleDoor('nonexistent' as DoorId, 0)).toBe(false);
    });

    it('emits DOOR_TOGGLED event', () => {
      const { system, emitter } = makeSystem([
        { id: 1, name: 'door_1', tileX: 5, tileY: 7 },
      ]);
      const events: Array<{ id: DoorId; isOpen: boolean }> = [];
      emitter.on('DOOR_TOGGLED', (payload) => {
        events.push({ id: payload.id, isOpen: payload.isOpen });
      });

      system.toggleDoor('door_1' as DoorId, 100);
      expect(events).toHaveLength(1);
      expect(events[0]!.isOpen).toBe(true);
    });
  });

  describe('canToggleDoor', () => {
    it('blocks close when entity on tile', () => {
      const { system } = makeSystem([
        { id: 1, name: 'door_1', tileX: 5, tileY: 7 },
      ]);
      system.toggleDoor('door_1' as DoorId, 0); // open it
      const door = system.getDoors().get('door_1' as DoorId)!;
      // Entity at pixel (176, 240) → tile (5, 7)
      const result = system.canToggleDoor(door, [{ x: 176, y: 240 }], 100);
      expect(result).toBe(false);
    });

    it('blocks during cooldown', () => {
      const { system } = makeSystem([
        { id: 1, name: 'door_1', tileX: 5, tileY: 7 },
      ]);
      system.toggleDoor('door_1' as DoorId, 100);
      const door = system.getDoors().get('door_1' as DoorId)!;
      // Try to toggle again within 30 ticks
      expect(system.canToggleDoor(door, [], 110)).toBe(false);
      // After cooldown
      expect(system.canToggleDoor(door, [], 131)).toBe(true);
    });

    it('allows opening regardless of entity position', () => {
      const { system } = makeSystem([
        { id: 1, name: 'door_1', tileX: 5, tileY: 7 },
      ]);
      const door = system.getDoors().get('door_1' as DoorId)!;
      // Entity on door tile — but door is closed, so opening is allowed
      const result = system.canToggleDoor(door, [{ x: 176, y: 240 }], 100);
      expect(result).toBe(true);
    });
  });

  describe('setDoorState', () => {
    it('is idempotent — no-op if already in desired state', () => {
      const { system } = makeSystem([
        { id: 1, name: 'door_1', tileX: 5, tileY: 7 },
      ]);
      const gen0 = system.getDoorGeneration();
      system.setDoorState('door_1' as DoorId, false, 100); // already closed
      expect(system.getDoorGeneration()).toBe(gen0); // no change
    });

    it('opens a closed door', () => {
      const { system } = makeSystem([
        { id: 1, name: 'door_1', tileX: 5, tileY: 7 },
      ]);
      system.setDoorState('door_1' as DoorId, true, 100);
      expect(system.getDoors().get('door_1' as DoorId)!.isOpen).toBe(true);
    });
  });

  describe('grid integration', () => {
    it('closed door blocks LOS', () => {
      const { system, losGrid } = makeSystem([
        { id: 1, name: 'door_1', tileX: 5, tileY: 7 },
      ]);
      // Door starts closed — LOS grid should be blocking
      expect(losGrid[7 * MAP_W + 5]).toBe(1);
    });

    it('open door does not block LOS', () => {
      const { system, losGrid } = makeSystem([
        { id: 1, name: 'door_1', tileX: 5, tileY: 7 },
      ]);
      system.toggleDoor('door_1' as DoorId, 100);
      expect(losGrid[7 * MAP_W + 5]).toBe(0);
    });

    it('closed door blocks collision', () => {
      const { system, collisionGrid } = makeSystem([
        { id: 1, name: 'door_1', tileX: 5, tileY: 7 },
      ]);
      expect(collisionGrid[7 * MAP_W + 5]).toBe(1);
    });

    it('open door does not block collision', () => {
      const { system, collisionGrid } = makeSystem([
        { id: 1, name: 'door_1', tileX: 5, tileY: 7 },
      ]);
      system.toggleDoor('door_1' as DoorId, 100);
      expect(collisionGrid[7 * MAP_W + 5]).toBe(0);
    });
  });
});
