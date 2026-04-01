import { describe, it, expect } from 'vitest';
import { createDoorSystem } from '../../src/game/doors.js';
import { computeFOV } from '../../src/game/los.js';
import type { DoorId } from '../../src/types/state.js';
import { createTypedEmitter } from '../../src/game/events.js';
import type { GameEventMap } from '../../src/types/events.js';

const MAP_W = 10;
const MAP_H = 10;

function makeWalledMap() {
  // 10x10 map with a wall across the middle at row 5, with a 1-tile gap at column 5
  const losGrid = new Uint8Array(MAP_W * MAP_H);
  const collisionGrid = new Uint8Array(MAP_W * MAP_H);

  // Wall at row 5, columns 0-4 and 6-9 (gap at column 5)
  for (let x = 0; x < MAP_W; x++) {
    if (x === 5) continue; // doorway
    losGrid[5 * MAP_W + x] = 1;
    collisionGrid[5 * MAP_W + x] = 1;
  }

  return { losGrid, collisionGrid };
}

describe('doors + LOS', () => {
  it('closed door blocks LOS through doorway', () => {
    const { losGrid, collisionGrid } = makeWalledMap();
    const emitter = createTypedEmitter<GameEventMap>();

    // Place door at the gap (5, 5)
    const system = createDoorSystem(
      [{ id: 1, name: 'door_gap', x: 5 * 32, y: 5 * 32 }],
      MAP_W, MAP_H, losGrid, collisionGrid, emitter,
    );

    // Door starts closed — losGrid[5*10+5] should be blocking
    expect(losGrid[5 * MAP_W + 5]).toBe(1);

    // Compute FOV from (5, 3) — should NOT see through to (5, 7)
    const fov = new Uint8Array(MAP_W * MAP_H);
    computeFOV(5, 3, 8, (x, y) => {
      if (x < 0 || x >= MAP_W || y < 0 || y >= MAP_H) return true;
      return losGrid[y * MAP_W + x] === 1;
    }, fov, MAP_W, MAP_H);

    expect(fov[7 * MAP_W + 5]).toBe(0); // behind closed door
  });

  it('open door does not block LOS', () => {
    const { losGrid, collisionGrid } = makeWalledMap();
    const emitter = createTypedEmitter<GameEventMap>();

    const system = createDoorSystem(
      [{ id: 1, name: 'door_gap', x: 5 * 32, y: 5 * 32 }],
      MAP_W, MAP_H, losGrid, collisionGrid, emitter,
    );

    // Open the door
    system.toggleDoor('door_gap' as DoorId, 0);
    expect(losGrid[5 * MAP_W + 5]).toBe(0);

    // Compute FOV from (5, 3) — SHOULD see through to (5, 7)
    const fov = new Uint8Array(MAP_W * MAP_H);
    computeFOV(5, 3, 8, (x, y) => {
      if (x < 0 || x >= MAP_W || y < 0 || y >= MAP_H) return true;
      return losGrid[y * MAP_W + x] === 1;
    }, fov, MAP_W, MAP_H);

    expect(fov[7 * MAP_W + 5]).toBe(1); // visible through open door
  });

  it('door toggle invalidates FOV (doorGeneration changes)', () => {
    const { losGrid, collisionGrid } = makeWalledMap();
    const emitter = createTypedEmitter<GameEventMap>();

    const system = createDoorSystem(
      [{ id: 1, name: 'door_gap', x: 5 * 32, y: 5 * 32 }],
      MAP_W, MAP_H, losGrid, collisionGrid, emitter,
    );

    const gen0 = system.getDoorGeneration();
    system.toggleDoor('door_gap' as DoorId, 0);
    expect(system.getDoorGeneration()).toBe(gen0 + 1);

    system.toggleDoor('door_gap' as DoorId, 100);
    expect(system.getDoorGeneration()).toBe(gen0 + 2);
  });
});
