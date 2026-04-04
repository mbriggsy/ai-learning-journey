import { describe, it, expect } from 'vitest';
import { shuffleLevel } from '../../src/game/level-shuffle';
import { createTestHotel } from './fixtures/test-hotel';

describe('shuffleLevel', () => {
  const base = createTestHotel();

  it('preserves floor count', () => {
    const shuffled = shuffleLevel(base, 42);
    expect(shuffled.floors.length).toBe(base.floors.length);
  });

  it('preserves room count per floor', () => {
    const shuffled = shuffleLevel(base, 42);
    for (let i = 0; i < base.floors.length; i++) {
      expect(shuffled.floors[i]!.rooms.length).toBe(base.floors[i]!.rooms.length);
    }
  });

  it('preserves connections (stairs/elevator unchanged)', () => {
    const shuffled = shuffleLevel(base, 42);
    expect(shuffled.connections).toEqual(base.connections);
    expect(shuffled.elevator).toEqual(base.elevator);
  });

  it('preserves room IDs and content (just moves positions)', () => {
    const shuffled = shuffleLevel(base, 42);
    const baseIds = base.floors.flatMap(f => f.rooms.map(r => r.id)).sort();
    const shuffledIds = shuffled.floors.flatMap(f => f.rooms.map(r => r.id)).sort();
    expect(shuffledIds).toEqual(baseIds);
  });

  it('same seed produces same shuffle (deterministic)', () => {
    const a = shuffleLevel(base, 123);
    const b = shuffleLevel(base, 123);
    expect(a.floors[0]!.rooms[0]!.bounds).toEqual(b.floors[0]!.rooms[0]!.bounds);
  });

  it('different seeds can produce different layouts', () => {
    // With only 2 rooms per floor, there are limited permutations
    // but 1000 different seeds should produce at least one difference
    let foundDifference = false;
    for (let seed = 1; seed <= 1000; seed++) {
      const shuffled = shuffleLevel(base, seed);
      const firstRoom = shuffled.floors[0]!.rooms[0]!;
      const baseFirstRoom = base.floors[0]!.rooms[0]!;
      if (firstRoom.bounds.x !== baseFirstRoom.bounds.x) {
        foundDifference = true;
        break;
      }
    }
    expect(foundDifference).toBe(true);
  });

  it('hiding spots move with their room', () => {
    // Find a seed that actually shuffles
    let shuffled = shuffleLevel(base, 1);
    for (let seed = 1; seed <= 100; seed++) {
      shuffled = shuffleLevel(base, seed);
      const room = shuffled.floors[1]!.rooms[0]!; // floor2, first room
      const baseRoom = base.floors[1]!.rooms[0]!;
      if (room.bounds.x !== baseRoom.bounds.x && room.hidingSpots.length > 0) {
        // Room moved — check hiding spots moved too
        const dx = room.bounds.x - baseRoom.bounds.x;
        const basePosX = baseRoom.hidingSpots[0]!.position.x;
        const shuffledPosX = room.hidingSpots[0]!.position.x;
        expect(shuffledPosX).toBeCloseTo(basePosX + dx);
        return;
      }
    }
    // If no shuffle happened in 100 seeds, that's fine — 2 rooms is a coin flip
  });
});
