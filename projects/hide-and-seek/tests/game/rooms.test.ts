import { describe, it, expect, vi } from 'vitest';
import { parseRooms, getRoomAt } from '../../src/game/rooms.js';
import type { GameMap } from '../../src/types/state.js';
import type { RoomId } from '../../src/types/ai.js';
import { DISPLAY } from '../../src/constants.js';

const TILE = DISPLAY.TILE_SIZE;

function makeOpenMap(w = 20, h = 20): GameMap {
  return {
    width: w, height: h,
    isWalkable: () => true,
    isBlocking: () => false,
  };
}

function makeRoomObject(
  id: number, name: string, x: number, y: number, w: number, h: number,
  roomId?: string,
) {
  return {
    id,
    name,
    x: x * TILE,
    y: y * TILE,
    width: w * TILE,
    height: h * TILE,
    properties: roomId ? { roomId } : undefined,
  };
}

describe('parseRooms', () => {
  it('parses room objects from Tiled data', () => {
    const map = makeOpenMap();
    const objects = [
      makeRoomObject(1, 'Kitchen', 1, 1, 5, 5, 'kitchen'),
      makeRoomObject(2, 'Bedroom', 8, 1, 5, 5, 'bedroom'),
    ];

    const rooms = parseRooms(objects, map);
    expect(rooms.length).toBe(2);
    expect(rooms[0]!.id).toBe('kitchen');
    expect(rooms[1]!.id).toBe('bedroom');
  });

  it('falls back to object name when no roomId property', () => {
    const map = makeOpenMap();
    const objects = [makeRoomObject(1, 'Library', 1, 1, 5, 5)];
    const rooms = parseRooms(objects, map);
    expect(rooms[0]!.id).toBe('Library');
  });

  it('skips duplicate roomIds', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const map = makeOpenMap();
    const objects = [
      makeRoomObject(1, 'A', 1, 1, 5, 5, 'room1'),
      makeRoomObject(2, 'B', 8, 1, 5, 5, 'room1'), // duplicate
    ];

    const rooms = parseRooms(objects, map);
    expect(rooms.length).toBe(1);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('skips rooms outside map bounds', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const map = makeOpenMap(10, 10);
    const objects = [makeRoomObject(1, 'OutOfBounds', 20, 20, 5, 5, 'oob')];

    const rooms = parseRooms(objects, map);
    expect(rooms.length).toBe(0);
    consoleSpy.mockRestore();
  });

  it('computes adjacency between nearby rooms', () => {
    const map = makeOpenMap();
    const objects = [
      makeRoomObject(1, 'A', 1, 1, 4, 4, 'a'),
      makeRoomObject(2, 'B', 5, 1, 4, 4, 'b'), // adjacent (touching)
      makeRoomObject(3, 'C', 15, 15, 4, 4, 'c'), // far away
    ];

    const rooms = parseRooms(objects, map);
    const roomA = rooms.find(r => r.id === 'a');
    const roomB = rooms.find(r => r.id === 'b');
    const roomC = rooms.find(r => r.id === 'c');

    expect(roomA!.adjacentRooms).toContain('b');
    expect(roomB!.adjacentRooms).toContain('a');
    expect(roomC!.adjacentRooms).not.toContain('a');
  });

  it('returns empty for empty input', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const rooms = parseRooms([], makeOpenMap());
    expect(rooms).toEqual([]);
    consoleSpy.mockRestore();
  });

  it('detects overlapping rooms', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const map = makeOpenMap();
    const objects = [
      makeRoomObject(1, 'A', 1, 1, 5, 5, 'a'),
      makeRoomObject(2, 'B', 3, 3, 5, 5, 'b'), // overlaps A
    ];

    parseRooms(objects, map);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('overlap'));
    consoleSpy.mockRestore();
  });

  it('BFS finds walkable center when geometric center is wall', () => {
    // Map with wall at center of room
    const wallSet = new Set(['3,3']); // center of a 5x5 room starting at (1,1)
    const map: GameMap = {
      width: 10, height: 10,
      isWalkable(x, y) {
        if (x < 0 || y < 0 || x >= 10 || y >= 10) return false;
        return !wallSet.has(`${x},${y}`);
      },
      isBlocking(x, y) { return wallSet.has(`${x},${y}`); },
    };

    const objects = [makeRoomObject(1, 'WalledCenter', 1, 1, 5, 5, 'walled')];
    const rooms = parseRooms(objects, map);

    // Center should NOT be (3,3) since that's a wall
    const room = rooms[0]!;
    expect(room.center.x !== 3 || room.center.y !== 3).toBe(true);
    // Center should be walkable
    expect(map.isWalkable(room.center.x, room.center.y)).toBe(true);
  });
});

describe('getRoomAt', () => {
  it('returns room containing the tile', () => {
    const rooms = [
      { id: 'a' as RoomId, bounds: { x: 0, y: 0, width: 5, height: 5 }, center: { x: 2, y: 2 }, adjacentRooms: [] as RoomId[] },
      { id: 'b' as RoomId, bounds: { x: 10, y: 10, width: 5, height: 5 }, center: { x: 12, y: 12 }, adjacentRooms: [] as RoomId[] },
    ];

    expect(getRoomAt(2, 2, rooms)?.id).toBe('a');
    expect(getRoomAt(12, 12, rooms)?.id).toBe('b');
    expect(getRoomAt(7, 7, rooms)).toBeUndefined();
  });

  it('tie-breaks overlapping rooms: smallest area wins', () => {
    const rooms = [
      { id: 'big' as RoomId, bounds: { x: 0, y: 0, width: 10, height: 10 }, center: { x: 5, y: 5 }, adjacentRooms: [] as RoomId[] },
      { id: 'small' as RoomId, bounds: { x: 2, y: 2, width: 3, height: 3 }, center: { x: 3, y: 3 }, adjacentRooms: [] as RoomId[] },
    ];

    expect(getRoomAt(3, 3, rooms)?.id).toBe('small');
  });
});
