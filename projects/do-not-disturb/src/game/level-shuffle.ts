import type { LevelConfig, FloorConfig, RoomConfig } from '../types/level';

// Seeded PRNG (mulberry32)
function createRng(seed: number) {
  let state = seed | 0;
  return () => {
    state = (state + 0x6D2B79F5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleArray<T>(arr: readonly T[], rng: () => number): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  return result;
}

function shuffleFloor(floor: FloorConfig, rng: () => number): FloorConfig {
  if (floor.rooms.length <= 1) return floor;

  // Collect all room bounds (positions) and room configs (content) separately
  const bounds = floor.rooms.map(r => r.bounds);
  const shuffledBounds = shuffleArray(bounds, rng);

  // Reassign room content to shuffled positions
  const shuffledRooms: RoomConfig[] = floor.rooms.map((room, i) => ({
    ...room,
    bounds: shuffledBounds[i]!,
    // Shift doors and hiding spots relative to new bounds
    doors: room.doors.map(d => ({
      ...d,
      position: {
        x: d.position.x - room.bounds.x + shuffledBounds[i]!.x,
        y: d.position.y - room.bounds.y + shuffledBounds[i]!.y,
      },
    })),
    hidingSpots: room.hidingSpots.map(s => ({
      ...s,
      position: {
        x: s.position.x - room.bounds.x + shuffledBounds[i]!.x,
        y: s.position.y - room.bounds.y + shuffledBounds[i]!.y,
      },
    })),
    items: room.items.map(item => ({
      ...item,
      position: {
        x: item.position.x - room.bounds.x + shuffledBounds[i]!.x,
        y: item.position.y - room.bounds.y + shuffledBounds[i]!.y,
      },
    })),
  }));

  return { ...floor, rooms: shuffledRooms };
}

export function shuffleLevel(base: LevelConfig, seed: number): LevelConfig {
  const rng = createRng(seed);
  return {
    ...base,
    floors: base.floors.map(f => shuffleFloor(f, rng)),
    // connections and elevator preserved — macro-navigation unchanged
  };
}
