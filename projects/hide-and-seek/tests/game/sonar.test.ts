import { describe, it, expect } from 'vitest';
import { GameEngine } from '../../src/game/engine.js';
import type { PlayingState, HuntPhase, MutablePlayingState, GameFlowKind } from '../../src/types/state.js';
import type { InputState } from '../../src/types/input.js';

const STEP_MS = (1 / 60) * 1000;
const ZERO_INPUT: InputState = { moveX: 0, moveY: 0, interact: false, pause: false };
const SONAR_INTERVAL_TICKS = Math.round(5 / (1 / 60)); // 300 ticks

function makeOpenMap() {
  return {
    width: 20,
    height: 20,
    isWalkable() { return true; },
    isBlocking() { return false; },
  };
}

function makeHuntState(): PlayingState {
  return {
    phase: 'playing',
    player: { x: 160, y: 160, velocityX: 0, velocityY: 0, facing: 'down' },
    seeker: { x: 480, y: 480, facing: 'down', facingAngle: Math.PI / 2, fsmState: 'patrol' },
    map: makeOpenMap(),
    spawns: [
      { x: 160, y: 160, type: 'hider_spawn' },
      { x: 480, y: 480, type: 'seeker_spawn' },
    ],
    gameFlow: {
      kind: 'hunt',
      ticksRemaining: 7200,
      ticksElapsed: 0,
      sonarTicksUntilPing: SONAR_INTERVAL_TICKS,
    },
    seekerFov: new Uint8Array(20 * 20),
    playerFov: new Uint8Array(20 * 20),
    stats: { distanceTraveled: 0, seekerDistanceTiles: Infinity, playerFootstepAccum: 0, seekerFootstepAccum: 0, timeSurvivedS: 0, closeCalls: 0, closestApproachTiles: -1, doorsToggled: 0, isInCloseCallZone: false, closeCallZoneEnteredAtMs: 0, closeCallCooldownRemainingMs: 0 },
    doors: new Map(),
    doorGeneration: 0,
  };
}

function makeCountdownState(): PlayingState {
  return {
    phase: 'playing',
    player: { x: 160, y: 160, velocityX: 0, velocityY: 0, facing: 'down' },
    seeker: { x: 480, y: 480, facing: 'down', facingAngle: Math.PI / 2, fsmState: 'patrol' },
    map: makeOpenMap(),
    spawns: [
      { x: 160, y: 160, type: 'hider_spawn' },
      { x: 480, y: 480, type: 'seeker_spawn' },
    ],
    gameFlow: { kind: 'countdown', ticksRemaining: 600 },
    seekerFov: new Uint8Array(20 * 20),
    playerFov: new Uint8Array(20 * 20).fill(1),
    stats: { distanceTraveled: 0, seekerDistanceTiles: Infinity, playerFootstepAccum: 0, seekerFootstepAccum: 0, timeSurvivedS: 0, closeCalls: 0, closestApproachTiles: -1, doorsToggled: 0, isInCloseCallZone: false, closeCallZoneEnteredAtMs: 0, closeCallCooldownRemainingMs: 0 },
    doors: new Map(),
    doorGeneration: 0,
  };
}

describe('sonar ping timer', () => {
  it('fires SONAR_PING_DUE at correct tick interval', () => {
    const state = makeHuntState();
    const engine = new GameEngine(state);
    const events: Array<{ seekerX: number; seekerY: number }> = [];
    engine.getEmitter().on('SONAR_PING_DUE', (payload) => events.push(payload));

    // Tick 300 times — should fire exactly once at tick 300
    for (let i = 0; i < SONAR_INTERVAL_TICKS; i++) {
      engine.tick(STEP_MS, ZERO_INPUT);
    }
    expect(events).toHaveLength(1);
  });

  it('first ping delayed by full interval (not immediate)', () => {
    const state = makeHuntState();
    const engine = new GameEngine(state);
    const events: Array<{ seekerX: number; seekerY: number }> = [];
    engine.getEmitter().on('SONAR_PING_DUE', (payload) => events.push(payload));

    // Tick just 1 time — should NOT fire
    engine.tick(STEP_MS, ZERO_INPUT);
    expect(events).toHaveLength(0);
  });

  it('SONAR_PING_DUE event includes seeker position', () => {
    const state = makeHuntState();
    const engine = new GameEngine(state);
    const events: Array<{ seekerX: number; seekerY: number }> = [];
    engine.getEmitter().on('SONAR_PING_DUE', (payload) => events.push(payload));

    for (let i = 0; i < SONAR_INTERVAL_TICKS; i++) {
      engine.tick(STEP_MS, ZERO_INPUT);
    }
    expect(events[0]!.seekerX).toBeGreaterThan(0);
    expect(events[0]!.seekerY).toBeGreaterThan(0);
  });

  it('timer suppressed in non-HUNT phases', () => {
    // Countdown state — no sonar during countdown
    const state = makeCountdownState();
    const engine = new GameEngine(state);
    const events: Array<unknown> = [];
    engine.getEmitter().on('SONAR_PING_DUE', (payload) => events.push(payload));

    for (let i = 0; i < 600; i++) {
      engine.tick(STEP_MS, ZERO_INPUT);
    }
    // Should be 0 during countdown — sonar only fires during HUNT
    // (transition fires at tick 600, but first ping is delayed)
    expect(events).toHaveLength(0);
  });

  it('timer frozen during pause', () => {
    const state = makeHuntState();
    const engine = new GameEngine(state);
    const events: Array<unknown> = [];
    engine.getEmitter().on('SONAR_PING_DUE', (payload) => events.push(payload));

    // Tick 100 times, then pause
    for (let i = 0; i < 100; i++) engine.tick(STEP_MS, ZERO_INPUT);
    engine.pause();

    // Tick 500 more times while paused — nothing should happen
    for (let i = 0; i < 500; i++) engine.tick(STEP_MS, ZERO_INPUT);
    expect(events).toHaveLength(0);

    // Resume and tick to completion
    engine.resume();
    for (let i = 0; i < 201; i++) engine.tick(STEP_MS, ZERO_INPUT);
    expect(events).toHaveLength(1);
  });
});
