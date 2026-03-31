import { describe, it, expect } from 'vitest';
import { GameEngine } from '../../src/game/engine.js';
import type { PlayingState, GameMap } from '../../src/types/state.js';
import type { InputState } from '../../src/types/input.js';

const STEP_MS = (1 / 60) * 1000;
const ZERO_INPUT: InputState = { moveX: 0, moveY: 0, interact: false, pause: false };

function makeOpenMap(): GameMap {
  return {
    width: 20,
    height: 20,
    isWalkable() { return true; },
    isBlocking() { return false; },
  };
}

function makePlayingState(): PlayingState {
  return {
    phase: 'playing',
    player: { x: 160, y: 160, velocityX: 0, velocityY: 0, facing: 'down' },
    seeker: { x: 480, y: 480, facing: 'down', fsmState: 'patrol' },
    map: makeOpenMap(),
    spawns: [
      { x: 160, y: 160, type: 'hider_spawn' },
      { x: 480, y: 480, type: 'seeker_spawn' },
    ],
    gameFlow: { kind: 'countdown', ticksRemaining: 600 },
    seekerFov: new Uint8Array(20 * 20),
    playerFov: new Uint8Array(20 * 20).fill(1),
    stats: { distanceTraveled: 0 },
  };
}

describe('player FOV', () => {
  it('playerFov is all 1s during countdown', () => {
    const state = makePlayingState();
    const engine = new GameEngine(state);
    engine.tick(STEP_MS, ZERO_INPUT);

    const s = engine.getState() as PlayingState;
    // During countdown, playerFov stays filled with 1s
    const sum = s.playerFov.reduce((a, b) => a + b, 0);
    expect(sum).toBe(20 * 20);
  });

  it('playerFov is recomputed after countdown→hunt transition', () => {
    const state = makePlayingState();
    state.gameFlow = { kind: 'countdown', ticksRemaining: 1 };
    const engine = new GameEngine(state);

    // Tick 1: countdown ends, transition to hunt, playerFov cleared
    engine.tick(STEP_MS, ZERO_INPUT);
    const s1 = engine.getState() as PlayingState;
    expect(s1.gameFlow.kind).toBe('hunt');

    // Tick 2: HUNT fixedUpdate runs, playerFov computed from player position
    engine.tick(STEP_MS, ZERO_INPUT);
    const s2 = engine.getState() as PlayingState;

    // Player should see some tiles but not the entire map
    const visible = s2.playerFov.reduce((a, b) => a + b, 0);
    expect(visible).toBeGreaterThan(0);
    expect(visible).toBeLessThan(20 * 20);
  });
});

describe('GameStats', () => {
  it('does not track distance during countdown', () => {
    const state = makePlayingState();
    const engine = new GameEngine(state);

    const input: InputState = { moveX: 1, moveY: 0, interact: false, pause: false };
    for (let i = 0; i < 10; i++) engine.tick(STEP_MS, input);

    const s = engine.getState() as PlayingState;
    expect(s.stats.distanceTraveled).toBe(0);
  });

  it('tracks distance during hunt phase', () => {
    const state = makePlayingState();
    state.gameFlow = { kind: 'hunt', ticksRemaining: 7200, ticksElapsed: 0 };
    // Clear playerFov for hunt phase
    state.playerFov.fill(0);
    const engine = new GameEngine(state);

    const input: InputState = { moveX: 1, moveY: 0, interact: false, pause: false };
    for (let i = 0; i < 60; i++) engine.tick(STEP_MS, input);

    const s = engine.getState() as PlayingState;
    expect(s.stats.distanceTraveled).toBeGreaterThan(0);
  });
});

describe('GameEngine.dispose()', () => {
  it('stops processing ticks after dispose', () => {
    const state = makePlayingState();
    const engine = new GameEngine(state);

    const input: InputState = { moveX: 1, moveY: 0, interact: false, pause: false };
    engine.tick(STEP_MS, input);
    const pos1 = (engine.getState() as PlayingState).player.x;

    engine.dispose();
    engine.tick(STEP_MS, input);
    const pos2 = (engine.getState() as PlayingState).player.x;

    expect(pos2).toBe(pos1);
  });
});
