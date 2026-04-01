import { describe, it, expect } from 'vitest';
import { GameEngine } from '../../src/game/engine.js';
import type { GameState, PlayingState, GameMap } from '../../src/types/state.js';
import type { InputState } from '../../src/types/input.js';

const ZERO_INPUT: InputState = { moveX: 0, moveY: 0, interact: false, pause: false };
const STEP_MS = (1 / 60) * 1000; // ~16.67ms

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
    seeker: { x: 320, y: 320, facing: 'down', facingAngle: Math.PI / 2, fsmState: 'patrol' },
    map: makeOpenMap(),
    spawns: [
      { x: 160, y: 160, type: 'hider_spawn' },
      { x: 320, y: 320, type: 'seeker_spawn' },
    ],
    gameFlow: { kind: 'countdown', ticksRemaining: 600 },
    seekerFov: new Uint8Array(20 * 20),
    playerFov: new Uint8Array(20 * 20).fill(1),
    stats: { distanceTraveled: 0, seekerDistanceTiles: Infinity, playerFootstepAccum: 0, seekerFootstepAccum: 0 },
    doors: new Map(),
    doorGeneration: 0,
  };
}

describe('GameEngine', () => {
  it('ticks movement on playing state', () => {
    const engine = new GameEngine(makePlayingState());
    const input: InputState = { moveX: 1, moveY: 0, interact: false, pause: false };
    engine.tick(STEP_MS, input);
    const state = engine.getState() as PlayingState;
    expect(state.player.x).toBeGreaterThan(160);
  });

  it('does not tick when paused', () => {
    const engine = new GameEngine(makePlayingState());
    engine.pause();
    engine.tick(STEP_MS, { moveX: 1, moveY: 0, interact: false, pause: false });
    const state = engine.getState() as PlayingState;
    expect(state.player.x).toBe(160);
  });

  it('skips first frame after resume (justResumed)', () => {
    const engine = new GameEngine(makePlayingState());
    engine.pause();
    engine.resume();
    engine.tick(STEP_MS, { moveX: 1, moveY: 0, interact: false, pause: false });
    const state = engine.getState() as PlayingState;
    // First frame skipped — no movement
    expect(state.player.x).toBe(160);

    // Second tick should move
    engine.tick(STEP_MS, { moveX: 1, moveY: 0, interact: false, pause: false });
    const state2 = engine.getState() as PlayingState;
    expect(state2.player.x).toBeGreaterThan(160);
  });

  it('caps at MAX_CATCHUP_TICKS (5)', () => {
    const engine = new GameEngine(makePlayingState());
    const input: InputState = { moveX: 1, moveY: 0, interact: false, pause: false };

    // Feed 200ms of delta — should produce at most 5 ticks worth of movement
    engine.tick(200, input);
    const state = engine.getState() as PlayingState;

    // 5 ticks * dt * speed = 5 * (1/60) * 120 = 10px
    const expectedMax = 160 + 5 * (1 / 60) * 120;
    expect(state.player.x).toBeCloseTo(expectedMax, 1);
  });

  it('drops accumulator debt after cap hit', () => {
    const engine = new GameEngine(makePlayingState());
    // Feed huge delta
    engine.tick(5000, ZERO_INPUT);
    // Then feed a normal delta — should work normally (not burst catch-up)
    const input: InputState = { moveX: 1, moveY: 0, interact: false, pause: false };
    engine.tick(STEP_MS, input);
    const state = engine.getState() as PlayingState;
    // Should only have moved ~2px (1 tick)
    expect(state.player.x - 160).toBeLessThan(5);
  });

  describe('guardDelta', () => {
    it('handles NaN delta without breaking', () => {
      const engine = new GameEngine(makePlayingState());
      engine.tick(NaN, ZERO_INPUT);
      // Should not crash, state should be unchanged
      const state = engine.getState() as PlayingState;
      expect(state.player.x).toBe(160);

      // Engine should still work after NaN
      engine.tick(STEP_MS, { moveX: 1, moveY: 0, interact: false, pause: false });
      const state2 = engine.getState() as PlayingState;
      expect(state2.player.x).toBeGreaterThan(160);
    });

    it('handles negative delta', () => {
      const engine = new GameEngine(makePlayingState());
      engine.tick(-100, { moveX: 1, moveY: 0, interact: false, pause: false });
      const state = engine.getState() as PlayingState;
      expect(state.player.x).toBe(160); // no movement
    });

    it('clamps delta > 1000ms', () => {
      const engine = new GameEngine(makePlayingState());
      engine.tick(50000, ZERO_INPUT);
      // Should not crash or take forever
      const state = engine.getState() as PlayingState;
      expect(state.phase).toBe('playing');
    });

    it('handles Infinity delta', () => {
      const engine = new GameEngine(makePlayingState());
      engine.tick(Infinity, ZERO_INPUT);
      const state = engine.getState() as PlayingState;
      expect(state.player.x).toBe(160);
    });
  });

  it('does not tick for boot state', () => {
    const bootState: GameState = { phase: 'boot' };
    const engine = new GameEngine(bootState);
    // Should not crash on non-playing state
    engine.tick(STEP_MS, { moveX: 1, moveY: 0, interact: false, pause: false });
    expect(engine.getState().phase).toBe('boot');
  });
});
