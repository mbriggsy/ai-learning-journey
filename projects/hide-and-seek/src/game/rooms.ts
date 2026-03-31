import type { GameMap } from '../types/state.js';
import type { RoomId, RoomDefinition } from '../types/ai.js';
import { DISPLAY } from '../constants.js';

interface TiledRoomObject {
  readonly id: number;
  readonly name: string;
  readonly x: number;       // pixels
  readonly y: number;       // pixels
  readonly width: number;   // pixels
  readonly height: number;  // pixels
  readonly properties?: Record<string, unknown>;
}

/**
 * BFS from geometric center outward to find nearest walkable tile.
 * Prevents room centers landing on walls.
 */
function findWalkableCenter(
  cx: number, cy: number,
  bounds: { x: number; y: number; width: number; height: number },
  map: GameMap,
): { x: number; y: number } {
  if (map.isWalkable(cx, cy)) return { x: cx, y: cy };

  const visited = new Set<string>();
  const queue: Array<{ x: number; y: number }> = [{ x: cx, y: cy }];
  visited.add(`${cx},${cy}`);

  while (queue.length > 0) {
    const pos = queue.shift()!;
    for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]] as const) {
      const nx = pos.x + dx;
      const ny = pos.y + dy;
      const key = `${nx},${ny}`;
      if (visited.has(key)) continue;
      visited.add(key);

      // Stay within room bounds
      if (nx < bounds.x || nx >= bounds.x + bounds.width) continue;
      if (ny < bounds.y || ny >= bounds.y + bounds.height) continue;

      if (map.isWalkable(nx, ny)) return { x: nx, y: ny };
      queue.push({ x: nx, y: ny });
    }
  }

  // Degenerate room — no walkable tile inside bounds. Return geometric center anyway.
  console.error(`Room center BFS failed: no walkable tile in bounds (${bounds.x},${bounds.y} ${bounds.width}x${bounds.height})`);
  return { x: cx, y: cy };
}

/**
 * Parse room rectangles from a Tiled object layer.
 * Phaser flattens object properties to Record<string, unknown>.
 */
export function parseRooms(
  objects: readonly TiledRoomObject[],
  map: GameMap,
): RoomDefinition[] {
  if (objects.length === 0) {
    console.error('parseRooms: no room objects provided');
    return [];
  }

  const TILE = DISPLAY.TILE_SIZE;
  const rooms: RoomDefinition[] = [];
  const seenIds = new Set<string>();

  for (const obj of objects) {
    const roomId = (obj.properties?.['roomId'] as string | undefined)
      ?? obj.name
      ?? `room_${obj.id}`;

    if (seenIds.has(roomId)) {
      console.error(`parseRooms: duplicate roomId "${roomId}" — skipping`);
      continue;
    }
    seenIds.add(roomId);

    // Convert pixel bounds to tile bounds
    const tileX = Math.floor(obj.x / TILE);
    const tileY = Math.floor(obj.y / TILE);
    const tileW = Math.max(1, Math.floor(obj.width / TILE));
    const tileH = Math.max(1, Math.floor(obj.height / TILE));

    // Validate within map bounds
    if (tileX < 0 || tileY < 0 || tileX + tileW > map.width || tileY + tileH > map.height) {
      console.error(`parseRooms: room "${roomId}" out of map bounds — skipping`);
      continue;
    }

    const bounds = { x: tileX, y: tileY, width: tileW, height: tileH };
    const geoCenterX = tileX + Math.floor(tileW / 2);
    const geoCenterY = tileY + Math.floor(tileH / 2);
    const center = findWalkableCenter(geoCenterX, geoCenterY, bounds, map);

    rooms.push({
      id: roomId as RoomId,
      bounds,
      center,
      adjacentRooms: [], // populated below
    });
  }

  // Detect overlaps (log warning, smallest area wins in getRoomAt)
  for (let i = 0; i < rooms.length; i++) {
    for (let j = i + 1; j < rooms.length; j++) {
      const a = rooms[i]!.bounds;
      const b = rooms[j]!.bounds;
      if (a.x < b.x + b.width && a.x + a.width > b.x &&
          a.y < b.y + b.height && a.y + a.height > b.y) {
        console.warn(`parseRooms: rooms "${rooms[i]!.id}" and "${rooms[j]!.id}" overlap`);
      }
    }
  }

  // Compute adjacency: rooms touching or within 1 tile of each other
  for (let i = 0; i < rooms.length; i++) {
    const adjacent: RoomId[] = [];
    const a = rooms[i]!.bounds;
    for (let j = 0; j < rooms.length; j++) {
      if (i === j) continue;
      const b = rooms[j]!.bounds;
      // Expanded bounds by 1 tile for adjacency check
      if (a.x - 1 < b.x + b.width && a.x + a.width + 1 > b.x &&
          a.y - 1 < b.y + b.height && a.y + a.height + 1 > b.y) {
        adjacent.push(rooms[j]!.id);
      }
    }
    // Overwrite the readonly adjacentRooms (safe in construction)
    (rooms[i] as unknown as { adjacentRooms: RoomId[] }).adjacentRooms = adjacent;
  }

  return rooms;
}

/** Find which room a tile coordinate falls in. Tie-break: smallest area wins. */
export function getRoomAt(
  x: number, y: number,
  rooms: readonly RoomDefinition[],
): RoomDefinition | undefined {
  let best: RoomDefinition | undefined;
  let bestArea = Infinity;

  for (const room of rooms) {
    if (x >= room.bounds.x && x < room.bounds.x + room.bounds.width &&
        y >= room.bounds.y && y < room.bounds.y + room.bounds.height) {
      const area = room.bounds.width * room.bounds.height;
      if (area < bestArea) {
        best = room;
        bestArea = area;
      }
    }
  }

  return best;
}
