import { describe, it, expect } from 'vitest';
import { updateMovement } from '../../src/game/movement.js';
import type { PlayerState, GameMap } from '../../src/types/state.js';
import type { InputState } from '../../src/types/input.js';
import { tileCoord } from '../../src/types/grid.js';

const DT = 1 / 60;

function makePlayer(overrides: Partial<PlayerState> = {}): PlayerState {
  return {
    x: 160, // center of tile (5,5) at 32px tiles
    y: 160,
    velocityX: 0,
    velocityY: 0,
    facing: 'down',
    ...overrides,
  };
}

function makeInput(overrides: Partial<InputState> = {}): InputState {
  return { moveX: 0, moveY: 0, interact: false, pause: false, ...overrides };
}

// 10x10 map with perimeter walls
function makeMap(): GameMap {
  const blocked = new Set<string>();
  for (let x = 0; x < 10; x++) {
    blocked.add(`${x},0`);
    blocked.add(`${x},9`);
  }
  for (let y = 0; y < 10; y++) {
    blocked.add(`0,${y}`);
    blocked.add(`9,${y}`);
  }

  return {
    width: 10,
    height: 10,
    isWalkable(coord) {
      const { x, y } = coord;
      if (x < 0 || x >= 10 || y < 0 || y >= 10) return false;
      return !blocked.has(`${x},${y}`);
    },
    isBlocking(coord) {
      const { x, y } = coord;
      if (x < 0 || x >= 10 || y < 0 || y >= 10) return true;
      return blocked.has(`${x},${y}`);
    },
  };
}

describe('updateMovement', () => {
  it('does not move with zero input', () => {
    const player = makePlayer();
    const result = updateMovement(player, makeMap(), makeInput(), DT);
    expect(result.x).toBe(player.x);
    expect(result.y).toBe(player.y);
  });

  it('moves right with positive X input', () => {
    const player = makePlayer();
    const result = updateMovement(player, makeMap(), makeInput({ moveX: 1 }), DT);
    expect(result.x).toBeGreaterThan(player.x);
    expect(result.y).toBe(player.y);
  });

  it('moves left with negative X input', () => {
    const player = makePlayer();
    const result = updateMovement(player, makeMap(), makeInput({ moveX: -1 }), DT);
    expect(result.x).toBeLessThan(player.x);
  });

  it('moves down with positive Y input', () => {
    const player = makePlayer();
    const result = updateMovement(player, makeMap(), makeInput({ moveY: 1 }), DT);
    expect(result.y).toBeGreaterThan(player.y);
  });

  it('normalizes diagonal movement (no speed exploit)', () => {
    const player = makePlayer();
    const straight = updateMovement(player, makeMap(), makeInput({ moveX: 1 }), DT);
    const diagonal = updateMovement(player, makeMap(), makeInput({ moveX: 1, moveY: 1 }), DT);

    const straightDist = Math.abs(straight.x - player.x);
    const diagDistX = diagonal.x - player.x;
    const diagDistY = diagonal.y - player.y;
    const diagDist = Math.sqrt(diagDistX * diagDistX + diagDistY * diagDistY);

    // Diagonal distance should equal straight distance (both normalized to magnitude 1)
    expect(diagDist).toBeCloseTo(straightDist, 5);
  });

  it('blocks movement into walls', () => {
    // Player near left wall (x=32 is the right edge of wall tile at x=0)
    const player = makePlayer({ x: 42, y: 160 }); // 42 = wall edge + half hitbox + small gap
    const result = updateMovement(player, makeMap(), makeInput({ moveX: -1 }), DT);
    // Should not cross into wall tile
    expect(result.x).toBeGreaterThanOrEqual(42 - 3); // very small or no movement
  });

  it('slides along walls (separate-axis resolution)', () => {
    // Player near top wall, moving diagonally up-right
    const player = makePlayer({ x: 160, y: 45 }); // near top wall
    const result = updateMovement(player, makeMap(), makeInput({ moveX: 1, moveY: -1 }), DT);
    // Y should be blocked (wall), but X should still move
    expect(result.x).toBeGreaterThan(player.x);
  });

  it('updates facing direction based on dominant axis', () => {
    const player = makePlayer({ facing: 'down' });
    expect(updateMovement(player, makeMap(), makeInput({ moveX: 1 }), DT).facing).toBe('right');
    expect(updateMovement(player, makeMap(), makeInput({ moveX: -1 }), DT).facing).toBe('left');
    expect(updateMovement(player, makeMap(), makeInput({ moveY: -1 }), DT).facing).toBe('up');
    expect(updateMovement(player, makeMap(), makeInput({ moveY: 1 }), DT).facing).toBe('down');
  });

  it('horizontal wins ties on facing', () => {
    const player = makePlayer({ facing: 'down' });
    const result = updateMovement(player, makeMap(), makeInput({ moveX: 1, moveY: 1 }), DT);
    expect(result.facing).toBe('right');
  });

  it('keeps last facing with zero input', () => {
    const player = makePlayer({ facing: 'left' });
    const result = updateMovement(player, makeMap(), makeInput(), DT);
    expect(result.facing).toBe('left');
  });
});

describe('movement determinism', () => {
  it('produces identical results across 100 runs', () => {
    const map = makeMap();
    const input = makeInput({ moveX: 0.7, moveY: -0.3 });
    const results: string[] = [];

    for (let run = 0; run < 100; run++) {
      let player = makePlayer();
      for (let tick = 0; tick < 60; tick++) {
        player = updateMovement(player, map, input, DT);
      }
      results.push(`${player.x},${player.y}`);
    }

    // All 100 runs should produce the same final state
    const unique = new Set(results);
    expect(unique.size).toBe(1);
  });
});

describe('movement performance', () => {
  it('exceeds 10,000 ticks/sec headless', () => {
    const map = makeMap();
    const input = makeInput({ moveX: 0.5, moveY: 0.5 });
    let player = makePlayer();

    const iterations = 10000;
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      player = updateMovement(player, map, input, DT);
    }
    const elapsed = performance.now() - start;
    const ticksPerSec = iterations / (elapsed / 1000);

    expect(ticksPerSec).toBeGreaterThan(10000);
  });
});
