import type { GameMap } from '../../types/state.js';
import type { HidingSpot, RoomDefinition } from '../../types/ai.js';

/**
 * Pre-compute hiding spots at map load (static analysis).
 * - Corners: walkable tile with walls on 2+ adjacent cardinal sides forming L-shape
 * - Dead ends: walkable tile with exactly 1 walkable cardinal neighbor
 * - Cover tiles: walkable tile adjacent to 3+ wall/obstacle tiles
 */
export function computeHidingSpots(map: GameMap): HidingSpot[] {
  const spots: HidingSpot[] = [];

  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      if (!map.isWalkable(x, y)) continue;

      const wallN = !map.isWalkable(x, y - 1);
      const wallS = !map.isWalkable(x, y + 1);
      const wallE = !map.isWalkable(x + 1, y);
      const wallW = !map.isWalkable(x - 1, y);
      const wallCount = (wallN ? 1 : 0) + (wallS ? 1 : 0) + (wallE ? 1 : 0) + (wallW ? 1 : 0);

      const walkableNeighbors = 4 - wallCount;

      // Dead end: exactly 1 walkable cardinal neighbor
      if (walkableNeighbors === 1) {
        spots.push({ position: { x, y }, type: 'dead-end', score: 0.3 });
        continue;
      }

      // Corner: 2+ adjacent cardinal walls forming L-shape
      const isCorner = (wallN && wallE) || (wallN && wallW) ||
                       (wallS && wallE) || (wallS && wallW);
      if (isCorner) {
        const score = wallCount >= 3 ? 1.0 : 0.8;
        spots.push({ position: { x, y }, type: 'corner', score });
        continue;
      }

      // Cover: adjacent to 3+ walls
      if (wallCount >= 3) {
        spots.push({ position: { x, y }, type: 'cover', score: 0.5 });
      }
    }
  }

  return spots;
}

/** Get hiding spots within a room's bounds. */
export function getHidingSpotsInRoom(
  room: RoomDefinition,
  spots: readonly HidingSpot[],
): HidingSpot[] {
  return spots.filter(s =>
    s.position.x >= room.bounds.x &&
    s.position.x < room.bounds.x + room.bounds.width &&
    s.position.y >= room.bounds.y &&
    s.position.y < room.bounds.y + room.bounds.height,
  );
}

/** Get hiding spots within a tile radius of a center point. */
export function getHidingSpotsNear(
  centerX: number,
  centerY: number,
  radius: number,
  spots: readonly HidingSpot[],
): HidingSpot[] {
  const r2 = radius * radius;
  return spots.filter(s => {
    const dx = s.position.x - centerX;
    const dy = s.position.y - centerY;
    return dx * dx + dy * dy <= r2;
  });
}
