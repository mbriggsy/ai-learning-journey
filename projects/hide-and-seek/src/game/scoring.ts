import type { GameStats, GameOutcome } from '../types/state.js';
import type { TypedEmitter } from '../types/events.js';
import type { GameEventMap } from '../types/events.js';
import type { Difficulty } from '../types/settings.js';
import type { ScoreBreakdown, RoundResult } from '../types/persistence.js';
import { SCORING, DISPLAY } from '../constants.js';

// ─── Difficulty multiplier lookup ─────────────────────────

const DIFFICULTY_MULTIPLIERS: Record<Difficulty, number> = {
  easy: SCORING.DIFFICULTY_MULTIPLIER_EASY,
  medium: SCORING.DIFFICULTY_MULTIPLIER_MEDIUM,
  hard: SCORING.DIFFICULTY_MULTIPLIER_HARD,
};

// ─── Score accumulation (called at fixedUpdate step 10) ───

export function updateScoreAccumulation(
  stats: GameStats,
  dt: number,
  emitter: TypedEmitter<GameEventMap>,
): void {
  // Time survived
  stats.timeSurvivedS += dt;

  // Closest approach tracking (-1 sentinel = never in range)
  const dist = stats.seekerDistanceTiles;
  if (dist > 0 && Number.isFinite(dist)) {
    stats.closestApproachTiles = stats.closestApproachTiles === -1
      ? dist
      : Math.min(stats.closestApproachTiles, dist);
  }

  // Close call state machine
  updateCloseCallTracker(stats, dt, emitter);
}

function updateCloseCallTracker(
  stats: GameStats,
  dt: number,
  emitter: TypedEmitter<GameEventMap>,
): void {
  const dist = stats.seekerDistanceTiles;
  const threshold = SCORING.CLOSE_CALL_RANGE_TILES;

  // Cooldown countdown
  if (stats.closeCallCooldownRemainingMs > 0) {
    stats.closeCallCooldownRemainingMs -= dt * 1000;
  }

  const wasInZone = stats.isInCloseCallZone;
  const isInZone = dist <= threshold && dist > 0 && Number.isFinite(dist);

  if (!wasInZone && isInZone && stats.closeCallCooldownRemainingMs <= 0) {
    // Entered zone — record entry time
    stats.isInCloseCallZone = true;
    stats.closeCallZoneEnteredAtMs = stats.timeSurvivedS * 1000;
    emitter.emit('CLOSE_CALL_ENTERED', { distanceTiles: dist });
  } else if (wasInZone && !isInZone) {
    // Exited zone — count if duration >= minimum
    stats.isInCloseCallZone = false;
    const durationMs = stats.timeSurvivedS * 1000 - stats.closeCallZoneEnteredAtMs;
    if (durationMs >= SCORING.CLOSE_CALL_MIN_DURATION_MS) {
      stats.closeCalls++;
      stats.closeCallCooldownRemainingMs = SCORING.CLOSE_CALL_COOLDOWN_MS;
      emitter.emit('CLOSE_CALL_EXITED', { durationMs, counted: true });
    } else {
      emitter.emit('CLOSE_CALL_EXITED', { durationMs, counted: false });
    }
  }
}

// ─── Score formula ────────────────────────────────────────

export function calculateScore(
  stats: GameStats,
  outcome: GameOutcome,
  difficulty: Difficulty,
): ScoreBreakdown {
  const survived = outcome === 'survived';

  const baseSurvival = survived ? SCORING.BASE_SURVIVAL_POINTS : 0;
  const closeCallBonus = stats.closeCalls * SCORING.CLOSE_CALL_BONUS;

  // Proximity bonus — tiered by closest approach
  let proximityBonus = 0;
  const closest = stats.closestApproachTiles;
  if (closest > 0) {
    for (const tier of SCORING.PROXIMITY_TIERS) {
      if (closest <= tier.maxTiles) {
        proximityBonus = tier.points;
        break;
      }
    }
  }

  // Efficiency bonus — survived with minimal movement
  const distanceTiles = stats.distanceTraveled / DISPLAY.TILE_SIZE;
  const efficiencyBonus = survived && distanceTiles < SCORING.EFFICIENCY_THRESHOLD_TILES
    ? SCORING.EFFICIENCY_BONUS : 0;

  const doorBonus = stats.doorsToggled * SCORING.DOOR_BONUS;

  const subtotal = baseSurvival + closeCallBonus + proximityBonus + efficiencyBonus + doorBonus;
  const difficultyMultiplier = DIFFICULTY_MULTIPLIERS[difficulty];
  const totalScore = Math.round(subtotal * difficultyMultiplier);

  return {
    baseSurvival,
    closeCallBonus,
    proximityBonus,
    efficiencyBonus,
    doorBonus,
    subtotal,
    difficultyMultiplier,
    totalScore,
  };
}

// ─── Round result ─────────────────────────────────────────

export function createRoundResult(
  stats: GameStats,
  outcome: GameOutcome,
  seekerDifficulty: Difficulty,
  hiderDifficulty: Difficulty | 'human',
  previousBestScore: number,
  previousBestSurvivalTimeS: number,
): RoundResult {
  const breakdown = calculateScore(stats, outcome, seekerDifficulty);

  return {
    timeSurvivedS: stats.timeSurvivedS,
    distanceTraveledPx: stats.distanceTraveled,
    closeCalls: stats.closeCalls,
    closestApproachTiles: stats.closestApproachTiles,
    doorsToggled: stats.doorsToggled,
    outcome,
    seekerDifficulty,
    hiderDifficulty,
    breakdown,
    isNewBestScore: breakdown.totalScore > previousBestScore && previousBestScore > 0,
    isNewBestSurvivalTime: outcome === 'found'
      && stats.timeSurvivedS > previousBestSurvivalTimeS
      && previousBestSurvivalTimeS > 0,
  };
}
