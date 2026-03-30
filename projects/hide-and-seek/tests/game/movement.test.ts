import { describe, it, expect } from 'vitest';
import { updateMovement } from '../../src/game/movement.js';
import type { PlayerState, GameMap } from '../../src/types/state.js';
import type { InputState } from '../../src/types/input.js';

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
    isWalkable(x: number, y: number) {
      if (x < 0 || x >= 10 || y < 0 || y >= 10) return false;
      return !blocked.has(`${x},${y}`);
    },
    isBlocking(x: number, y: number) {
      if (x < 0 || x >= 10 || y < 0 || y >= 10) return true;
      return blocked.has(`${x},${y}`);
    },
  };
}

describe('updateMovement', () => {
  it('does not move with zero input', () => {
    const player = makePlayer();
    const origX = player.x;
    const origY = player.y;
    updateMovement(player, makeMap(), makeInput(), DT);
    expect(player.x).toBe(origX);
    expect(player.y).toBe(origY);
  });

  it('moves right with positive X input', () => {
    const player = makePlayer();
    const origX = player.x;
    updateMovement(player, makeMap(), makeInput({ moveX: 1 }), DT);
    expect(player.x).toBeGreaterThan(origX);
    expect(player.y).toBe(160);
  });

  it('moves left with negative X input', () => {
    const player = makePlayer();
    const origX = player.x;
    updateMovement(player, makeMap(), makeInput({ moveX: -1 }), DT);
    expect(player.x).toBeLessThan(origX);
  });

  it('moves down with positive Y input', () => {
    const player = makePlayer();
    const origY = player.y;
    updateMovement(player, makeMap(), makeInput({ moveY: 1 }), DT);
    expect(player.y).toBeGreaterThan(origY);
  });

  it('normalizes diagonal movement (no speed exploit)', () => {
    const straightPlayer = makePlayer();
    updateMovement(straightPlayer, makeMap(), makeInput({ moveX: 1 }), DT);
    const straightDist = Math.abs(straightPlayer.x - 160);

    const diagPlayer = makePlayer();
    updateMovement(diagPlayer, makeMap(), makeInput({ moveX: 1, moveY: 1 }), DT);
    const diagDistX = diagPlayer.x - 160;
    const diagDistY = diagPlayer.y - 160;
    const diagDist = Math.sqrt(diagDistX * diagDistX + diagDistY * diagDistY);

    expect(diagDist).toBeCloseTo(straightDist, 5);
  });

  it('blocks movement into walls', () => {
    const player = makePlayer({ x: 42, y: 160 });
    updateMovement(player, makeMap(), makeInput({ moveX: -1 }), DT);
    expect(player.x).toBeGreaterThanOrEqual(42 - 3);
  });

  it('slides along walls (separate-axis resolution)', () => {
    const player = makePlayer({ x: 160, y: 45 });
    const origX = player.x;
    updateMovement(player, makeMap(), makeInput({ moveX: 1, moveY: -1 }), DT);
    expect(player.x).toBeGreaterThan(origX);
  });

  it('updates facing direction based on dominant axis', () => {
    const p1 = makePlayer({ facing: 'down' });
    updateMovement(p1, makeMap(), makeInput({ moveX: 1 }), DT);
    expect(p1.facing).toBe('right');

    const p2 = makePlayer({ facing: 'down' });
    updateMovement(p2, makeMap(), makeInput({ moveX: -1 }), DT);
    expect(p2.facing).toBe('left');

    const p3 = makePlayer({ facing: 'down' });
    updateMovement(p3, makeMap(), makeInput({ moveY: -1 }), DT);
    expect(p3.facing).toBe('up');

    const p4 = makePlayer({ facing: 'down' });
    updateMovement(p4, makeMap(), makeInput({ moveY: 1 }), DT);
    expect(p4.facing).toBe('down');
  });

  it('horizontal wins ties on facing', () => {
    const player = makePlayer({ facing: 'down' });
    updateMovement(player, makeMap(), makeInput({ moveX: 1, moveY: 1 }), DT);
    expect(player.facing).toBe('right');
  });

  it('keeps last facing with zero input', () => {
    const player = makePlayer({ facing: 'left' });
    updateMovement(player, makeMap(), makeInput(), DT);
    expect(player.facing).toBe('left');
  });
});

describe('movement determinism', () => {
  it('produces identical results across 100 runs', () => {
    const map = makeMap();
    const input = makeInput({ moveX: 0.7, moveY: -0.3 });
    const results: string[] = [];

    for (let run = 0; run < 100; run++) {
      const player = makePlayer();
      for (let tick = 0; tick < 60; tick++) {
        updateMovement(player, map, input, DT);
      }
      results.push(`${player.x},${player.y}`);
    }

    const unique = new Set(results);
    expect(unique.size).toBe(1);
  });
});

describe('movement performance', () => {
  it('exceeds 10,000 ticks/sec headless', () => {
    const map = makeMap();
    const input = makeInput({ moveX: 0.5, moveY: 0.5 });
    const player = makePlayer();

    const iterations = 10000;
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      updateMovement(player, map, input, DT);
    }
    const elapsed = performance.now() - start;
    const ticksPerSec = iterations / (elapsed / 1000);

    expect(ticksPerSec).toBeGreaterThan(10000);
  });
});
