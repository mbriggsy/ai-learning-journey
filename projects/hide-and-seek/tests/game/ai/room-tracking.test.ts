import { describe, it, expect } from 'vitest';
import { RoomTracker } from '../../../src/game/ai/room-tracking.js';
import type { RoomId, RoomDefinition } from '../../../src/types/ai.js';
import { AI } from '../../../src/constants.js';

function makeRoom(id: string, cx: number, cy: number, adjacent: string[] = []): RoomDefinition {
  return {
    id: id as RoomId,
    bounds: { x: cx - 2, y: cy - 2, width: 5, height: 5 },
    center: { x: cx, y: cy },
    adjacentRooms: adjacent as RoomId[],
  };
}

describe('RoomTracker', () => {
  it('unvisited rooms are stale', () => {
    const tracker = new RoomTracker();
    expect(tracker.isStale('room1' as RoomId, 100)).toBe(true);
  });

  it('recently visited room is not stale', () => {
    const tracker = new RoomTracker();
    tracker.markVisited('room1' as RoomId, 100);
    expect(tracker.isStale('room1' as RoomId, 200)).toBe(false);
  });

  it('room becomes stale after RE_CLEAR_TICKS', () => {
    const tracker = new RoomTracker();
    tracker.markVisited('room1' as RoomId, 100);
    expect(tracker.isStale('room1' as RoomId, 100 + AI.RE_CLEAR_TICKS + 1)).toBe(true);
  });

  it('forceStale makes a room stale immediately', () => {
    const tracker = new RoomTracker();
    tracker.markVisited('room1' as RoomId, 100);
    expect(tracker.isStale('room1' as RoomId, 100)).toBe(false);
    tracker.forceStale('room1' as RoomId);
    expect(tracker.isStale('room1' as RoomId, 100)).toBe(true);
  });

  it('getBestRoom returns nearest stale room with highest score', () => {
    const tracker = new RoomTracker();
    const rooms = [
      makeRoom('near', 6, 6),
      makeRoom('far', 15, 15),
    ];

    // Seeker at (5,5) — "near" room is closer
    const best = tracker.getBestRoom(rooms, 5, 5, 100, undefined);
    expect(best?.id).toBe('near');
  });

  it('completion lock returns same room until cleared', () => {
    const tracker = new RoomTracker();
    const rooms = [
      makeRoom('a', 5, 5),
      makeRoom('b', 10, 10),
    ];

    const first = tracker.getBestRoom(rooms, 5, 5, 100, undefined);
    expect(first).not.toBeUndefined();

    // Same call — should return same room (completion lock)
    const second = tracker.getBestRoom(rooms, 5, 5, 200, undefined);
    expect(second?.id).toBe(first?.id);

    // Clear lock
    tracker.clearTarget();
    tracker.markVisited(first!.id, 200);

    // Now should potentially pick different room
    const third = tracker.getBestRoom(rooms, 5, 5, 300, undefined);
    // Could be either — just verify it returns something
    expect(third).not.toBeUndefined();
  });

  it('returns undefined when all rooms are fresh', () => {
    const tracker = new RoomTracker();
    const rooms = [makeRoom('a', 5, 5)];
    tracker.markVisited('a' as RoomId, 100);
    const result = tracker.getBestRoom(rooms, 5, 5, 100, undefined);
    expect(result).toBeUndefined();
  });

  it('returns undefined for empty room list', () => {
    const tracker = new RoomTracker();
    const result = tracker.getBestRoom([], 5, 5, 100, undefined);
    expect(result).toBeUndefined();
  });

  it('adjacency bonus increases score', () => {
    const tracker = new RoomTracker();
    const rooms = [
      makeRoom('current', 5, 5, ['adjacent']),
      makeRoom('adjacent', 8, 8, ['current']),
      makeRoom('distant', 12, 12),
    ];

    // Score adjacent room should be higher than distant at similar staleness
    const adjScore = tracker.scoreRoom(rooms[1]!, 5, 5, 100, 'current' as RoomId);
    const distScore = tracker.scoreRoom(rooms[2]!, 5, 5, 100, 'current' as RoomId);
    expect(adjScore).toBeGreaterThan(distScore);
  });

  it('reset clears all state', () => {
    const tracker = new RoomTracker();
    tracker.markVisited('room1' as RoomId, 100);
    tracker.reset();
    expect(tracker.isStale('room1' as RoomId, 100)).toBe(true);
  });
});
