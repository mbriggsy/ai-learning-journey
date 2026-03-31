import type { DoorId, DoorState } from '../types/state.js';
import type { GameEventMap } from '../types/events.js';
import type { TypedEmitter } from '../types/events.js';
import type { TiledObject } from './map.js';
import { DISPLAY, DOOR } from '../constants.js';

const TILE_SIZE = DISPLAY.TILE_SIZE;

// --- Door system ---

export class DoorSystem {
  private readonly doors: Map<DoorId, DoorState>;
  private readonly tileLookup: Map<string, DoorId>;
  private doorGeneration: number = 0;
  private readonly losGrid: Uint8Array;
  private readonly collisionGrid: Uint8Array;
  private readonly mapWidth: number;
  private readonly emitter: TypedEmitter<GameEventMap>;

  constructor(
    doors: Map<DoorId, DoorState>,
    tileLookup: Map<string, DoorId>,
    losGrid: Uint8Array,
    collisionGrid: Uint8Array,
    mapWidth: number,
    emitter: TypedEmitter<GameEventMap>,
  ) {
    this.doors = doors;
    this.tileLookup = tileLookup;
    this.losGrid = losGrid;
    this.collisionGrid = collisionGrid;
    this.mapWidth = mapWidth;
    this.emitter = emitter;

    // Initialize grid state for closed doors
    for (const door of doors.values()) {
      if (!door.isOpen) {
        this.setGridBlocking(door.position.x, door.position.y, true);
      }
    }
  }

  getDoorGeneration(): number {
    return this.doorGeneration;
  }

  getDoors(): ReadonlyMap<DoorId, DoorState> {
    return this.doors;
  }

  getDoorAt(tileX: number, tileY: number): DoorState | undefined {
    const key = `${tileX},${tileY}`;
    const id = this.tileLookup.get(key);
    if (id === undefined) return undefined;
    return this.doors.get(id);
  }

  getNearestDoor(
    tileX: number, tileY: number, rangeTiles: number,
  ): DoorState | undefined {
    const r2 = rangeTiles * rangeTiles;
    let nearest: DoorState | undefined;
    let nearestDist = Infinity;

    for (const door of this.doors.values()) {
      const dx = door.position.x - tileX;
      const dy = door.position.y - tileY;
      const dist = dx * dx + dy * dy;
      if (dist > r2) continue;
      if (dist < nearestDist || (dist === nearestDist && nearest && door.id < nearest.id)) {
        nearest = door;
        nearestDist = dist;
      }
    }
    return nearest;
  }

  canToggleDoor(
    door: DoorState,
    entities: ReadonlyArray<{ x: number; y: number }>,
    currentTick: number,
  ): boolean {
    // Cooldown check
    if (currentTick - door.lastToggleTick < DOOR.TOGGLE_COOLDOWN_TICKS) return false;

    // Opening is always allowed
    if (!door.isOpen) return true;

    // Closing: block if any entity occupies door tile
    for (const entity of entities) {
      const ex = Math.floor(entity.x / TILE_SIZE);
      const ey = Math.floor(entity.y / TILE_SIZE);
      if (ex === door.position.x && ey === door.position.y) return false;
    }
    return true;
  }

  toggleDoor(id: DoorId, currentTick: number): boolean {
    const door = this.doors.get(id);
    if (!door) return false;

    const newState: DoorState = {
      id: door.id,
      position: door.position,
      isOpen: !door.isOpen,
      lastToggleTick: currentTick,
    };
    this.doors.set(id, newState);
    this.doorGeneration++;

    // Toggle grids
    this.setGridBlocking(door.position.x, door.position.y, !newState.isOpen);

    this.emitter.emit('DOOR_TOGGLED', {
      id: newState.id,
      position: newState.position,
      isOpen: newState.isOpen,
    });

    return true;
  }

  /** Idempotent — for seeker AI. No-op if already in desired state. */
  setDoorState(id: DoorId, isOpen: boolean, currentTick: number): boolean {
    const door = this.doors.get(id);
    if (!door) return false;
    if (door.isOpen === isOpen) return true; // already in desired state
    return this.toggleDoor(id, currentTick);
  }

  private setGridBlocking(tileX: number, tileY: number, blocked: boolean): void {
    const idx = tileY * this.mapWidth + tileX;
    const val = blocked ? 1 : 0;
    this.losGrid[idx] = val;
    this.collisionGrid[idx] = val;
  }
}

// --- Factory ---

export function createDoorSystem(
  tiledObjects: readonly TiledObject[],
  mapWidth: number,
  mapHeight: number,
  losGrid: Uint8Array,
  collisionGrid: Uint8Array,
  emitter: TypedEmitter<GameEventMap>,
): DoorSystem {
  const doors = new Map<DoorId, DoorState>();
  const tileLookup = new Map<string, DoorId>();

  for (const obj of tiledObjects) {
    const tileX = Math.floor(obj.x / TILE_SIZE);
    const tileY = Math.floor(obj.y / TILE_SIZE);

    // Validate bounds
    if (tileX < 0 || tileX >= mapWidth || tileY < 0 || tileY >= mapHeight) {
      console.error(`Door "${obj.name}" at tile (${tileX},${tileY}) is out of bounds — skipping`);
      continue;
    }

    // Validate unique tile position
    const tileKey = `${tileX},${tileY}`;
    if (tileLookup.has(tileKey)) {
      console.error(`Door "${obj.name}" at tile (${tileX},${tileY}) overlaps existing door — skipping`);
      continue;
    }

    const id = (obj.name || `door_${obj.id}`) as DoorId;

    // Validate unique ID
    if (doors.has(id)) {
      console.error(`Duplicate door ID "${id}" — skipping`);
      continue;
    }

    // Read isOpen from Tiled properties array
    const isOpenProp = obj.properties?.find(p => p.name === 'isOpen');
    const isOpen = isOpenProp?.value === true;

    const doorState: DoorState = {
      id,
      position: { x: tileX, y: tileY },
      isOpen,
      lastToggleTick: -DOOR.TOGGLE_COOLDOWN_TICKS, // allow immediate first toggle
    };

    doors.set(id, doorState);
    tileLookup.set(tileKey, id);
  }

  return new DoorSystem(doors, tileLookup, losGrid, collisionGrid, mapWidth, emitter);
}
