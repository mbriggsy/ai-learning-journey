import { describe, it, expect } from 'vitest';
import { calculateScore, updateScoreAccumulation, createRoundResult } from '../../src/game/scoring.js';
import type { GameStats } from '../../src/types/state.js';
import type { GameEventMap } from '../../src/types/events.js';
import type { TypedEmitter } from '../../src/types/events.js';
import { SCORING, DISPLAY } from '../../src/constants.js';

// ─── Helpers ──────────────────────────────────────────────

function makeStats(overrides?: Partial<GameStats>): GameStats {
  return {
    distanceTraveled: 0,
    seekerDistanceTiles: Infinity,
    playerFootstepAccum: 0,
    seekerFootstepAccum: 0,
    timeSurvivedS: 0,
    closeCalls: 0,
    closestApproachTiles: -1,
    doorsToggled: 0,
    isInCloseCallZone: false,
    closeCallZoneEnteredAtMs: 0,
    closeCallCooldownRemainingMs: 0,
    ...overrides,
  };
}

function makeEmitter(): TypedEmitter<GameEventMap> & { events: { name: string; payload: unknown }[] } {
  const events: { name: string; payload: unknown }[] = [];
  return {
    events,
    emit(event: string, ...args: unknown[]) { events.push({ name: event, payload: args[0] }); },
    on() {},
    off() {},
    offAll() {},
  };
}

// ─── Score formula tests ──────────────────────────────────

describe('calculateScore', () => {
  it('survived on Easy with zero bonuses = 1000', () => {
    const stats = makeStats({ closestApproachTiles: -1, distanceTraveled: 500 });
    const bd = calculateScore(stats, 'survived', 'easy');
    expect(bd.baseSurvival).toBe(1000);
    expect(bd.closeCallBonus).toBe(0);
    expect(bd.proximityBonus).toBe(0);
    expect(bd.efficiencyBonus).toBe(0);
    expect(bd.doorBonus).toBe(0);
    expect(bd.difficultyMultiplier).toBe(1.0);
    expect(bd.totalScore).toBe(1000);
  });

  it('found on Hard with 3 close calls, closest 1.2 tiles, 5 doors', () => {
    const stats = makeStats({
      closeCalls: 3,
      closestApproachTiles: 1.2,
      doorsToggled: 5,
      distanceTraveled: 1000,
    });
    const bd = calculateScore(stats, 'found', 'hard');
    expect(bd.baseSurvival).toBe(0); // found = 0
    expect(bd.closeCallBonus).toBe(450); // 3 × 150
    expect(bd.proximityBonus).toBe(150); // ≤ 2 tiles
    expect(bd.efficiencyBonus).toBe(0); // found, not survived
    expect(bd.doorBonus).toBe(50); // 5 × 10
    expect(bd.subtotal).toBe(650);
    expect(bd.difficultyMultiplier).toBe(2.0);
    expect(bd.totalScore).toBe(1300);
  });

  it('efficiency bonus: survived with < 15 tiles movement', () => {
    const stats = makeStats({
      distanceTraveled: 10 * DISPLAY.TILE_SIZE, // 10 tiles < 15
    });
    const bd = calculateScore(stats, 'survived', 'easy');
    expect(bd.efficiencyBonus).toBe(100);
    expect(bd.totalScore).toBe(1100); // 1000 + 100
  });

  it('no efficiency bonus when found (even with low movement)', () => {
    const stats = makeStats({ distanceTraveled: 5 * DISPLAY.TILE_SIZE });
    const bd = calculateScore(stats, 'found', 'easy');
    expect(bd.efficiencyBonus).toBe(0);
  });

  it('proximity tier boundaries', () => {
    // ≤ 1 tile: 200
    expect(calculateScore(makeStats({ closestApproachTiles: 0.5 }), 'found', 'easy').proximityBonus).toBe(200);
    expect(calculateScore(makeStats({ closestApproachTiles: 1.0 }), 'found', 'easy').proximityBonus).toBe(200);
    // ≤ 2 tiles: 150
    expect(calculateScore(makeStats({ closestApproachTiles: 1.5 }), 'found', 'easy').proximityBonus).toBe(150);
    expect(calculateScore(makeStats({ closestApproachTiles: 2.0 }), 'found', 'easy').proximityBonus).toBe(150);
    // ≤ 3 tiles: 100
    expect(calculateScore(makeStats({ closestApproachTiles: 2.5 }), 'found', 'easy').proximityBonus).toBe(100);
    // ≤ 5 tiles: 50
    expect(calculateScore(makeStats({ closestApproachTiles: 4.0 }), 'found', 'easy').proximityBonus).toBe(50);
    // > 5 tiles: 0
    expect(calculateScore(makeStats({ closestApproachTiles: 6.0 }), 'found', 'easy').proximityBonus).toBe(0);
    // -1 sentinel: 0
    expect(calculateScore(makeStats({ closestApproachTiles: -1 }), 'found', 'easy').proximityBonus).toBe(0);
  });

  it('medium difficulty multiplier = 1.5', () => {
    const stats = makeStats({ distanceTraveled: 500 }); // > 15 tiles to avoid efficiency bonus
    const bd = calculateScore(stats, 'survived', 'medium');
    expect(bd.difficultyMultiplier).toBe(1.5);
    expect(bd.totalScore).toBe(1500); // 1000 × 1.5
  });

  it('totalScore is rounded', () => {
    // 1 close call on medium: (150) × 1.5 = 225
    const stats = makeStats({ closeCalls: 1 });
    const bd = calculateScore(stats, 'found', 'medium');
    expect(bd.totalScore).toBe(Math.round(150 * 1.5));
  });
});

// ─── Close call state machine tests ───────────────────────

describe('close call state machine', () => {
  const dt = 1 / 60; // one tick

  it('enter zone → exit after 600ms → counted', () => {
    const stats = makeStats({ seekerDistanceTiles: 2.0 });
    const emitter = makeEmitter();

    // Enter zone
    updateScoreAccumulation(stats, dt, emitter);
    expect(stats.isInCloseCallZone).toBe(true);

    // Stay in zone for ~600ms (36 ticks at 60fps)
    for (let i = 0; i < 36; i++) {
      updateScoreAccumulation(stats, dt, emitter);
    }

    // Exit zone
    stats.seekerDistanceTiles = 10;
    updateScoreAccumulation(stats, dt, emitter);

    expect(stats.isInCloseCallZone).toBe(false);
    expect(stats.closeCalls).toBe(1);

    const exitEvents = emitter.events.filter(e => e.name === 'CLOSE_CALL_EXITED');
    expect(exitEvents.length).toBe(1);
    expect((exitEvents[0]!.payload as { counted: boolean }).counted).toBe(true);
  });

  it('enter zone → exit after 200ms → NOT counted', () => {
    const stats = makeStats({ seekerDistanceTiles: 2.0 });
    const emitter = makeEmitter();

    // Enter zone
    updateScoreAccumulation(stats, dt, emitter);
    expect(stats.isInCloseCallZone).toBe(true);

    // Stay in zone for ~200ms (12 ticks)
    for (let i = 0; i < 12; i++) {
      updateScoreAccumulation(stats, dt, emitter);
    }

    // Exit zone
    stats.seekerDistanceTiles = 10;
    updateScoreAccumulation(stats, dt, emitter);

    expect(stats.closeCalls).toBe(0);
    const exitEvents = emitter.events.filter(e => e.name === 'CLOSE_CALL_EXITED');
    expect(exitEvents.length).toBe(1);
    expect((exitEvents[0]!.payload as { counted: boolean }).counted).toBe(false);
  });

  it('re-enter within cooldown → NOT counted', () => {
    const stats = makeStats({ seekerDistanceTiles: 2.0 });
    const emitter = makeEmitter();

    // First close call: enter, wait 600ms, exit
    updateScoreAccumulation(stats, dt, emitter);
    for (let i = 0; i < 36; i++) updateScoreAccumulation(stats, dt, emitter);
    stats.seekerDistanceTiles = 10;
    updateScoreAccumulation(stats, dt, emitter);
    expect(stats.closeCalls).toBe(1);

    // Immediately re-enter (within 3s cooldown)
    stats.seekerDistanceTiles = 2.0;
    updateScoreAccumulation(stats, dt, emitter);
    expect(stats.isInCloseCallZone).toBe(false); // blocked by cooldown
  });

  it('re-enter after cooldown expires → counted', () => {
    const stats = makeStats({ seekerDistanceTiles: 2.0 });
    const emitter = makeEmitter();

    // First close call
    updateScoreAccumulation(stats, dt, emitter);
    for (let i = 0; i < 36; i++) updateScoreAccumulation(stats, dt, emitter);
    stats.seekerDistanceTiles = 10;
    updateScoreAccumulation(stats, dt, emitter);
    expect(stats.closeCalls).toBe(1);

    // Wait for cooldown (3s = 180 ticks)
    for (let i = 0; i < 181; i++) updateScoreAccumulation(stats, dt, emitter);

    // Re-enter, stay 600ms, exit
    stats.seekerDistanceTiles = 2.0;
    updateScoreAccumulation(stats, dt, emitter);
    expect(stats.isInCloseCallZone).toBe(true);
    for (let i = 0; i < 36; i++) updateScoreAccumulation(stats, dt, emitter);
    stats.seekerDistanceTiles = 10;
    updateScoreAccumulation(stats, dt, emitter);

    expect(stats.closeCalls).toBe(2);
  });

  it('closest approach tracks minimum distance', () => {
    const stats = makeStats({ seekerDistanceTiles: 5.0 });
    const emitter = makeEmitter();

    updateScoreAccumulation(stats, dt, emitter);
    expect(stats.closestApproachTiles).toBe(5.0);

    stats.seekerDistanceTiles = 3.0;
    updateScoreAccumulation(stats, dt, emitter);
    expect(stats.closestApproachTiles).toBe(3.0);

    stats.seekerDistanceTiles = 7.0;
    updateScoreAccumulation(stats, dt, emitter);
    expect(stats.closestApproachTiles).toBe(3.0); // unchanged — min
  });

  it('closest approach ignores -1 sentinel and Infinity', () => {
    const stats = makeStats({ seekerDistanceTiles: Infinity });
    const emitter = makeEmitter();

    updateScoreAccumulation(stats, dt, emitter);
    expect(stats.closestApproachTiles).toBe(-1); // still sentinel

    stats.seekerDistanceTiles = 4.0;
    updateScoreAccumulation(stats, dt, emitter);
    expect(stats.closestApproachTiles).toBe(4.0);
  });

  it('time survived accumulates', () => {
    const stats = makeStats();
    const emitter = makeEmitter();
    stats.seekerDistanceTiles = 10; // far away

    for (let i = 0; i < 60; i++) updateScoreAccumulation(stats, dt, emitter);
    expect(stats.timeSurvivedS).toBeCloseTo(1.0, 2);
  });
});

// ─── createRoundResult tests ──────────────────────────────

describe('createRoundResult', () => {
  it('creates complete round result', () => {
    const stats = makeStats({
      timeSurvivedS: 42.0,
      distanceTraveled: 300,
      closeCalls: 2,
      closestApproachTiles: 1.5,
      doorsToggled: 3,
    });
    const result = createRoundResult(stats, 'survived', 'easy', 'human', 0, -1);

    expect(result.outcome).toBe('survived');
    expect(result.seekerDifficulty).toBe('easy');
    expect(result.hiderDifficulty).toBe('human');
    expect(result.breakdown.totalScore).toBeGreaterThan(0);
    expect(result.isNewBestScore).toBe(false); // previous best is 0 (first game)
  });

  it('flags new best score when beating previous', () => {
    const stats = makeStats({
      timeSurvivedS: 120,
      closeCalls: 5,
      closestApproachTiles: 1.0,
      doorsToggled: 10,
    });
    const result = createRoundResult(stats, 'survived', 'hard', 'human', 100, -1);
    expect(result.isNewBestScore).toBe(true);
    expect(result.breakdown.totalScore).toBeGreaterThan(100);
  });

  it('does not flag PB on first game (previous = 0)', () => {
    const stats = makeStats({ timeSurvivedS: 10 });
    const result = createRoundResult(stats, 'survived', 'easy', 'human', 0, -1);
    expect(result.isNewBestScore).toBe(false);
  });

  it('flags new best survival time on loss', () => {
    const stats = makeStats({ timeSurvivedS: 60 });
    const result = createRoundResult(stats, 'found', 'easy', 'human', 0, 30);
    expect(result.isNewBestSurvivalTime).toBe(true);
  });

  it('does not flag best survival time on win', () => {
    const stats = makeStats({ timeSurvivedS: 120 });
    const result = createRoundResult(stats, 'survived', 'easy', 'human', 0, 30);
    expect(result.isNewBestSurvivalTime).toBe(false);
  });
});
