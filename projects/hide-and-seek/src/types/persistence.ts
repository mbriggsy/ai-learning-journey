import type { Difficulty } from './settings.js';
import type { GameOutcome } from './state.js';

// ─── Score breakdown (frozen snapshot from formula) ───────

export interface ScoreBreakdown {
  readonly baseSurvival: number;
  readonly closeCallBonus: number;
  readonly proximityBonus: number;
  readonly efficiencyBonus: number;
  readonly doorBonus: number;
  readonly subtotal: number;
  readonly difficultyMultiplier: number;
  readonly totalScore: number;
}

// ─── Round result (passed to Results scene) ───────────────

export interface RoundResult {
  readonly timeSurvivedS: number;
  readonly closeCalls: number;
  readonly closestApproachTiles: number;  // -1 = never in range
  readonly doorsToggled: number;
  readonly outcome: GameOutcome;
  readonly seekerDifficulty: Difficulty;
  readonly hiderDifficulty: Difficulty | 'human';
  readonly breakdown: ScoreBreakdown;
  readonly isNewBestScore: boolean;
}

// ─── Stats persistence schema ─────────────────────────────

export interface DifficultyStats {
  readonly wins: number;
  readonly losses: number;
  readonly bestScore: number;          // 0 = never played
  readonly bestSurvivalTimeS: number;  // -1 = never played (NOT Infinity — breaks JSON)
}

export interface StatsSchema {
  readonly schemaVersion: 1;
  readonly wins: number;               // NO totalGames — derive as wins + losses
  readonly losses: number;
  readonly currentWinStreak: number;
  readonly bestWinStreak: number;
  readonly lastDifficulty: Difficulty;
  readonly bestScore: number;          // 0 = never played
  readonly byDifficulty: Readonly<Record<Difficulty, DifficultyStats>>;
}

export const DEFAULT_STATS: Readonly<StatsSchema> = {
  schemaVersion: 1,
  wins: 0,
  losses: 0,
  currentWinStreak: 0,
  bestWinStreak: 0,
  lastDifficulty: 'easy',
  bestScore: 0,
  byDifficulty: {
    easy: { wins: 0, losses: 0, bestScore: 0, bestSurvivalTimeS: -1 },
    medium: { wins: 0, losses: 0, bestScore: 0, bestSurvivalTimeS: -1 },
    hard: { wins: 0, losses: 0, bestScore: 0, bestSurvivalTimeS: -1 },
  },
} as const;
