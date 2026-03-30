import { describe, it, expect } from 'vitest';
import { createGameState } from '../../src/game/state.js';
import type { GameMap, SpawnPoint, PlayingState } from '../../src/types/state.js';

function makeMap(): GameMap {
  return {
    width: 10,
    height: 10,
    isWalkable() { return true; },
    isBlocking() { return false; },
  };
}

describe('createGameState', () => {
  it('creates a playing state at hider spawn', () => {
    const spawns: SpawnPoint[] = [
      { x: 160, y: 160, type: 'hider_spawn' },
      { x: 256, y: 256, type: 'seeker_spawn' },
    ];
    const state = createGameState(makeMap(), spawns) as PlayingState;

    expect(state.phase).toBe('playing');
    expect(state.player.x).toBe(160);
    expect(state.player.y).toBe(160);
    expect(state.player.velocityX).toBe(0);
    expect(state.player.velocityY).toBe(0);
    expect(state.player.facing).toBe('down');
    expect(state.spawns).toHaveLength(2);
  });

  it('throws without hider_spawn', () => {
    const spawns: SpawnPoint[] = [
      { x: 256, y: 256, type: 'seeker_spawn' },
    ];
    expect(() => createGameState(makeMap(), spawns)).toThrow('hider_spawn');
  });

  it('uses first hider_spawn if multiple exist', () => {
    const spawns: SpawnPoint[] = [
      { x: 100, y: 100, type: 'hider_spawn' },
      { x: 200, y: 200, type: 'hider_spawn' },
    ];
    const state = createGameState(makeMap(), spawns) as PlayingState;
    expect(state.player.x).toBe(100);
    expect(state.player.y).toBe(100);
  });
});
