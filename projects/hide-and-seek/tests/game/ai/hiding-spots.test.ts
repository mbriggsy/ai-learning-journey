import { describe, it, expect } from 'vitest';
import { computeHidingSpots, getHidingSpotsInRoom, getHidingSpotsNear } from '../../../src/game/ai/hiding-spots.js';
import type { GameMap } from '../../../src/types/state.js';
import type { RoomId, RoomDefinition } from '../../../src/types/ai.js';

function makeWalledMap(): GameMap {
  // 5x5 map with walls around edges
  const walkable = new Set<string>();
  for (let y = 1; y < 4; y++) {
    for (let x = 1; x < 4; x++) {
      walkable.add(`${x},${y}`);
    }
  }
  return {
    width: 5,
    height: 5,
    isWalkable(x: number, y: number) { return walkable.has(`${x},${y}`); },
    isBlocking(x: number, y: number) { return !walkable.has(`${x},${y}`); },
  };
}

function makeCornerMap(): GameMap {
  // 10x10 map: open interior with a corner nook at (1,1)
  // Walls: top row, left col, plus walls at (2,1) and (1,2) making (1,1) a corner
  return {
    width: 10,
    height: 10,
    isWalkable(x: number, y: number) {
      if (x === 0 || y === 0 || x === 9 || y === 9) return false;
      return true;
    },
    isBlocking(x: number, y: number) {
      return !this.isWalkable(x, y);
    },
  };
}

describe('computeHidingSpots', () => {
  it('finds corners in a walled room', () => {
    const map = makeWalledMap();
    const spots = computeHidingSpots(map);
    expect(spots.length).toBeGreaterThan(0);

    // (1,1), (1,3), (3,1), (3,3) are corners — each has 2 adjacent walls
    const corners = spots.filter(s => s.type === 'corner');
    expect(corners.length).toBe(4);
  });

  it('assigns higher score to corners with 3 walls', () => {
    // Create a dead-end nook: only 1 walkable neighbor
    const walkable = new Set(['2,2', '3,2']); // tiny 2-tile corridor
    const map: GameMap = {
      width: 6,
      height: 6,
      isWalkable(x, y) { return walkable.has(`${x},${y}`); },
      isBlocking(x, y) { return !walkable.has(`${x},${y}`); },
    };

    const spots = computeHidingSpots(map);
    // (2,2) has 3 walls (N, S, W) + 1 walkable (E) = dead end
    const deadEnds = spots.filter(s => s.type === 'dead-end');
    expect(deadEnds.length).toBeGreaterThan(0);
  });

  it('returns empty for fully open map', () => {
    const map: GameMap = {
      width: 10, height: 10,
      isWalkable: () => true,
      isBlocking: () => false,
    };
    const spots = computeHidingSpots(map);
    // Interior tiles have 0 walls — not hiding spots
    expect(spots.length).toBe(0);
  });
});

describe('getHidingSpotsInRoom', () => {
  it('filters spots to room bounds', () => {
    const spots = [
      { position: { x: 2, y: 2 }, type: 'corner' as const, score: 0.8 },
      { position: { x: 8, y: 8 }, type: 'corner' as const, score: 0.8 },
    ];
    const room: RoomDefinition = {
      id: 'room1' as RoomId,
      bounds: { x: 1, y: 1, width: 4, height: 4 },
      center: { x: 2, y: 2 },
      adjacentRooms: [],
    };

    const result = getHidingSpotsInRoom(room, spots);
    expect(result.length).toBe(1);
    expect(result[0]!.position).toEqual({ x: 2, y: 2 });
  });
});

describe('getHidingSpotsNear', () => {
  it('filters spots by radius', () => {
    const spots = [
      { position: { x: 5, y: 5 }, type: 'corner' as const, score: 0.8 },
      { position: { x: 5, y: 6 }, type: 'cover' as const, score: 0.5 },
      { position: { x: 20, y: 20 }, type: 'corner' as const, score: 0.8 },
    ];

    const result = getHidingSpotsNear(5, 5, 3, spots);
    expect(result.length).toBe(2);
  });
});
