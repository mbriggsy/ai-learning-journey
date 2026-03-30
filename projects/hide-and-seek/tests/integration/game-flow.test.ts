import { describe, it, expect } from 'vitest';
import { GameEngine } from '../../src/game/engine.js';
import type { PlayingState, GameFlowKind } from '../../src/types/state.js';
import type { InputState } from '../../src/types/input.js';

const STEP_MS = (1 / 60) * 1000;
const ZERO_INPUT: InputState = { moveX: 0, moveY: 0, interact: false, pause: false };

function makeOpenMap() {
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
  };
}

function tickEngine(engine: GameEngine, n: number, input: InputState = ZERO_INPUT): void {
  for (let i = 0; i < n; i++) {
    engine.tick(STEP_MS, input);
  }
}

describe('game flow integration', () => {
  it('starts in countdown phase', () => {
    const engine = new GameEngine(makePlayingState());
    const state = engine.getState() as PlayingState;
    expect(state.gameFlow.kind).toBe('countdown');
  });

  it('countdown → hunt transition after 600 ticks', () => {
    const engine = new GameEngine(makePlayingState());
    const events: GameFlowKind[] = [];
    engine.getEmitter().on('PHASE_CHANGED', (kind) => events.push(kind));

    // Tick 599 times — still countdown
    tickEngine(engine, 599);
    let state = engine.getState() as PlayingState;
    expect(state.gameFlow.kind).toBe('countdown');

    // 600th tick transitions
    tickEngine(engine, 1);
    state = engine.getState() as PlayingState;
    expect(state.gameFlow.kind).toBe('hunt');
    expect(events).toContain('hunt');
  });

  it('player moves during countdown', () => {
    const engine = new GameEngine(makePlayingState());
    const moveRight: InputState = { moveX: 1, moveY: 0, interact: false, pause: false };
    tickEngine(engine, 10, moveRight);
    const state = engine.getState() as PlayingState;
    expect(state.player.x).toBeGreaterThan(160);
  });

  it('seeker does NOT move during countdown', () => {
    const engine = new GameEngine(makePlayingState());
    tickEngine(engine, 100);
    const state = engine.getState() as PlayingState;
    // Seeker should still be at spawn
    expect(state.seeker.x).toBe(480);
    expect(state.seeker.y).toBe(480);
  });

  it('terminal state (found) halts all logic', () => {
    const state = makePlayingState();
    // Force into found state
    (state as { gameFlow: { kind: string; ticksSurvived: number } }).gameFlow = {
      kind: 'found',
      ticksSurvived: 100,
    };
    const engine = new GameEngine(state);

    const playerX = (engine.getState() as PlayingState).player.x;
    tickEngine(engine, 60, { moveX: 1, moveY: 0, interact: false, pause: false });
    const afterState = engine.getState() as PlayingState;

    // Player should NOT have moved
    expect(afterState.player.x).toBe(playerX);
  });

  it('terminal state (survived) halts all logic', () => {
    const state = makePlayingState();
    (state as { gameFlow: { kind: string; huntDurationTicks: number } }).gameFlow = {
      kind: 'survived',
      huntDurationTicks: 7200,
    };
    const engine = new GameEngine(state);

    const playerX = (engine.getState() as PlayingState).player.x;
    tickEngine(engine, 60, { moveX: 1, moveY: 0, interact: false, pause: false });
    const afterState = engine.getState() as PlayingState;

    expect(afterState.player.x).toBe(playerX);
  });

  it('emitter exposes TypedListener (no emit method on returned type)', () => {
    const engine = new GameEngine(makePlayingState());
    const listener = engine.getEmitter();
    expect(typeof listener.on).toBe('function');
    expect(typeof listener.off).toBe('function');
    expect(typeof listener.offAll).toBe('function');
    // emit should still exist on the object (it's a TypedEmitter under the hood)
    // but the TypedListener TYPE strips it — this is a compile-time guarantee
  });

  it('pause/resume works', () => {
    const engine = new GameEngine(makePlayingState());
    engine.pause();
    expect(engine.isPaused()).toBe(true);
    tickEngine(engine, 10, { moveX: 1, moveY: 0, interact: false, pause: false });
    const state = engine.getState() as PlayingState;
    expect(state.player.x).toBe(160); // no movement while paused

    engine.resume();
    expect(engine.isPaused()).toBe(false);
    // First tick skipped (justResumed)
    tickEngine(engine, 1, { moveX: 1, moveY: 0, interact: false, pause: false });
    expect((engine.getState() as PlayingState).player.x).toBe(160);
    // Second tick moves
    tickEngine(engine, 1, { moveX: 1, moveY: 0, interact: false, pause: false });
    expect((engine.getState() as PlayingState).player.x).toBeGreaterThan(160);
  });

  it('hunt timer decrements during hunt phase', () => {
    const engine = new GameEngine(makePlayingState());
    // Skip to hunt
    tickEngine(engine, 600);
    const huntState = engine.getState() as PlayingState;
    expect(huntState.gameFlow.kind).toBe('hunt');
    if (huntState.gameFlow.kind === 'hunt') {
      const initialTicks = huntState.gameFlow.ticksRemaining;
      tickEngine(engine, 10);
      const afterState = engine.getState() as PlayingState;
      if (afterState.gameFlow.kind === 'hunt') {
        expect(afterState.gameFlow.ticksRemaining).toBe(initialTicks - 10);
        expect(afterState.gameFlow.ticksElapsed).toBe(10);
      }
    }
  });
});
