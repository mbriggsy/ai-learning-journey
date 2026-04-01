import Phaser from 'phaser';
import type { DoorId, DoorState } from '../../types/state.js';
import type { TypedListener } from '../../types/events.js';
import type { GameEventMap } from '../../types/events.js';
import { DEPTH, DISPLAY } from '../../constants.js';

const TILE_SIZE = DISPLAY.TILE_SIZE;

// Tile indices in the interior tileset (sorted alphabetically: door-closed=0, door-open=1)
const FRAME_DOOR_CLOSED = 0;
const FRAME_DOOR_OPEN = 1;

export interface DoorSpriteEntry {
  readonly sprite: Phaser.GameObjects.Sprite;
  readonly id: DoorId;
}

export function createDoorSprite(
  scene: Phaser.Scene,
  door: DoorState,
): Phaser.GameObjects.Sprite {
  const pixelX = door.position.x * TILE_SIZE + TILE_SIZE / 2;
  const pixelY = door.position.y * TILE_SIZE + TILE_SIZE / 2;

  const frame = door.isOpen ? FRAME_DOOR_OPEN : FRAME_DOOR_CLOSED;
  const sprite = scene.add.sprite(pixelX, pixelY, 'interior-tiles', frame);
  sprite.setDepth(DEPTH.WALLS);

  return sprite;
}

export function updateDoorVisual(sprite: Phaser.GameObjects.Sprite, isOpen: boolean): void {
  sprite.setFrame(isOpen ? FRAME_DOOR_OPEN : FRAME_DOOR_CLOSED);
}

export function createDoorSprites(
  scene: Phaser.Scene,
  doors: ReadonlyMap<DoorId, DoorState>,
  listener: TypedListener<GameEventMap>,
): Map<DoorId, DoorSpriteEntry> {
  const entries = new Map<DoorId, DoorSpriteEntry>();

  for (const door of doors.values()) {
    const sprite = createDoorSprite(scene, door);
    entries.set(door.id, { sprite, id: door.id });
  }

  // Subscribe to door toggle events (push-based, not polling)
  listener.on('DOOR_TOGGLED', ({ id, isOpen }) => {
    const entry = entries.get(id);
    if (entry) updateDoorVisual(entry.sprite, isOpen);
  });

  return entries;
}

export function destroyDoorSprites(entries: Map<DoorId, DoorSpriteEntry>): void {
  for (const entry of entries.values()) {
    entry.sprite.destroy();
  }
  entries.clear();
}
