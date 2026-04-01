import { describe, it, expect, vi } from 'vitest';
import { AUDIO, SIMULATION, DISPLAY } from '../../src/constants.js';

describe('footstep distance accumulator', () => {
  it('emits FOOTSTEP after accumulating FOOTSTEP_STEP_DISTANCE_PX', () => {
    // Simulate the accumulator logic from engine.ts
    let accum = 0;
    const events: Array<{ entity: string; x: number; y: number }> = [];

    function simulateMove(moveDist: number, entity: string, x: number, y: number) {
      accum += moveDist;
      if (accum >= AUDIO.FOOTSTEP_STEP_DISTANCE_PX) {
        accum -= AUDIO.FOOTSTEP_STEP_DISTANCE_PX;
        events.push({ entity, x, y });
      }
    }

    // Move 10px at a time — should emit after 3rd step (30px > 24px)
    simulateMove(10, 'player', 10, 0);
    expect(events.length).toBe(0);

    simulateMove(10, 'player', 20, 0);
    expect(events.length).toBe(0);

    simulateMove(10, 'player', 30, 0);
    expect(events.length).toBe(1);
    expect(events[0]).toEqual({ entity: 'player', x: 30, y: 0 });

    // Accumulator carries over remainder (6px)
    // Next event at 6 + 18 = 24px → another 2 moves
    simulateMove(10, 'player', 40, 0);
    expect(events.length).toBe(1);

    simulateMove(10, 'player', 50, 0);
    expect(events.length).toBe(2);
  });

  it('does not emit for zero movement', () => {
    let accum = 0;
    const events: unknown[] = [];

    function simulateMove(moveDist: number) {
      accum += moveDist;
      if (accum >= AUDIO.FOOTSTEP_STEP_DISTANCE_PX) {
        accum -= AUDIO.FOOTSTEP_STEP_DISTANCE_PX;
        events.push({});
      }
    }

    simulateMove(0);
    simulateMove(0);
    simulateMove(0);
    expect(events.length).toBe(0);
  });

  it('emits immediately for large single-frame movement', () => {
    let accum = 0;
    let emitted = 0;

    const moveDist = AUDIO.FOOTSTEP_STEP_DISTANCE_PX + 5;
    accum += moveDist;
    if (accum >= AUDIO.FOOTSTEP_STEP_DISTANCE_PX) {
      accum -= AUDIO.FOOTSTEP_STEP_DISTANCE_PX;
      emitted++;
    }

    expect(emitted).toBe(1);
    expect(accum).toBe(5);
  });
});

describe('seekerDistanceTiles computation', () => {
  it('computes correct tile distance', () => {
    const playerX = 160;
    const playerY = 160;
    const seekerX = 320;
    const seekerY = 160;

    const dx = playerX - seekerX;
    const dy = playerY - seekerY;
    const distTiles = Math.hypot(dx, dy) / DISPLAY.TILE_SIZE;

    expect(distTiles).toBe(5); // 160px / 32px = 5 tiles
  });

  it('returns 0 when overlapping', () => {
    const distTiles = Math.hypot(0, 0) / DISPLAY.TILE_SIZE;
    expect(distTiles).toBe(0);
  });

  it('handles diagonal distance', () => {
    const dx = 3 * DISPLAY.TILE_SIZE;
    const dy = 4 * DISPLAY.TILE_SIZE;
    const distTiles = Math.hypot(dx, dy) / DISPLAY.TILE_SIZE;
    expect(distTiles).toBe(5); // 3-4-5 triangle
  });
});
