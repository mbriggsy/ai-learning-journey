import { describe, it, expect } from 'vitest';
import { createSpectatingState } from '../../src/game/state.js';
import { GameEngine } from '../../src/game/engine.js';
import type { GameMap, SpawnPoint } from '../../src/types/state.js';

function makeMap(width = 20, height = 20): GameMap {
  return {
    width, height,
    isWalkable: (x: number, y: number) => x >= 0 && x < width && y >= 0 && y < height,
    isBlocking: (x: number, y: number) => x < 0 || x >= width || y < 0 || y >= height,
  };
}

function makeSpawns(): SpawnPoint[] {
  return [
    { x: 48, y: 48, type: 'hider_spawn' },
    { x: 560, y: 560, type: 'seeker_spawn' },
  ];
}

describe('createSpectatingState', () => {
  it('creates state with phase spectating', () => {
    const state = createSpectatingState(makeMap(), makeSpawns());
    expect(state.phase).toBe('spectating');
  });

  it('positions seeker at seeker spawn', () => {
    const state = createSpectatingState(makeMap(), makeSpawns());
    expect(state.seeker.x).toBe(560);
    expect(state.seeker.y).toBe(560);
  });

  it('positions hider at hider spawn', () => {
    const state = createSpectatingState(makeMap(), makeSpawns());
    expect(state.hider.x).toBe(48);
    expect(state.hider.y).toBe(48);
  });

  it('initializes hider in countdown-moving state', () => {
    const state = createSpectatingState(makeMap(), makeSpawns());
    expect(state.hider.fsmState).toBe('countdown-moving');
  });

  it('creates separate FOV arrays', () => {
    const state = createSpectatingState(makeMap(), makeSpawns());
    expect(state.seekerFov).toBeInstanceOf(Uint8Array);
    expect(state.hiderFov).toBeInstanceOf(Uint8Array);
    expect(state.seekerFov).not.toBe(state.hiderFov);
    expect(state.seekerFov.length).toBe(400);
  });

  it('starts in countdown flow', () => {
    const state = createSpectatingState(makeMap(), makeSpawns());
    expect(state.gameFlow.kind).toBe('countdown');
  });

  it('throws without hider spawn', () => {
    expect(() => createSpectatingState(makeMap(), [{ x: 0, y: 0, type: 'seeker_spawn' }])).toThrow('hider_spawn');
  });

  it('throws without seeker spawn', () => {
    expect(() => createSpectatingState(makeMap(), [{ x: 0, y: 0, type: 'hider_spawn' }])).toThrow('seeker_spawn');
  });
});

describe('GameEngine spectating mode', () => {
  it('creates engine in spectating mode', () => {
    const state = createSpectatingState(makeMap(), makeSpawns());
    const engine = new GameEngine(state, 'easy', { mode: 'spectator', hiderDifficulty: 'easy' });
    expect(engine.isSpectating()).toBe(true);
    expect(engine.getState().phase).toBe('spectating');
  });

  it('ticks without crashing (empty input)', () => {
    const state = createSpectatingState(makeMap(), makeSpawns());
    const engine = new GameEngine(state, 'easy', { mode: 'spectator', hiderDifficulty: 'easy' });
    const emptyInput = { moveX: 0, moveY: 0, interact: false, pause: false };

    // Tick for 100 frames — should not throw
    for (let i = 0; i < 100; i++) {
      engine.tick(16.67, emptyInput);
    }

    const finalState = engine.getState();
    expect(finalState.phase).toBe('spectating');
  });

  it('countdown decrements and transitions to hunt', () => {
    const state = createSpectatingState(makeMap(), makeSpawns());
    const engine = new GameEngine(state, 'easy', { mode: 'spectator', hiderDifficulty: 'easy' });
    const emptyInput = { moveX: 0, moveY: 0, interact: false, pause: false };

    // Tick through entire countdown (~10 seconds = 600 ticks at 60fps)
    for (let i = 0; i < 700; i++) {
      engine.tick(16.67, emptyInput);
    }

    const s = engine.getState();
    if (s.phase === 'spectating') {
      expect(s.gameFlow.kind).toBe('hunt');
    }
  });

  it('throws when spectating state passed without spectator mode', () => {
    const state = createSpectatingState(makeMap(), makeSpawns());
    expect(() => new GameEngine(state, 'easy')).toThrow('SpectatingState requires mode: spectator');
  });
});
