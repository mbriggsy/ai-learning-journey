import type { Difficulty } from './types/settings.js';
import type { GameOutcome } from './types/state.js';
import type { StatsSchema, DifficultyStats } from './types/persistence.js';
import { DEFAULT_STATS } from './types/persistence.js';

// ─── Constants ────────────────────────────────────────────

const STORAGE_KEY = 'hideAndSeekStats';
const CURRENT_STATS_VERSION = 1;
const VALID_DIFFICULTIES: readonly string[] = ['easy', 'medium', 'hard'];

// ─── In-memory fallback (private browsing) ────────────────

let inMemoryStats: StatsSchema | null = null;
let storageAvailable: boolean | null = null;

function isStorageAvailable(): boolean {
  if (storageAvailable !== null) return storageAvailable;
  try {
    const test = '__storage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    storageAvailable = true;
  } catch {
    storageAvailable = false;
  }
  return storageAvailable;
}

// ─── Validation ───────────────────────────────────────────

function isFiniteNonNeg(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0;
}

function isValidDifficultyStats(d: unknown): d is DifficultyStats {
  if (typeof d !== 'object' || d === null) return false;
  const o = d as Record<string, unknown>;
  return isFiniteNonNeg(o.wins)
    && isFiniteNonNeg(o.losses)
    && isFiniteNonNeg(o.bestScore)
    && typeof o.bestSurvivalTimeS === 'number'
    && Number.isFinite(o.bestSurvivalTimeS)
    && o.bestSurvivalTimeS >= -1;
}

export function isValidStats(data: unknown): data is StatsSchema {
  if (typeof data !== 'object' || data === null) return false;
  const o = data as Record<string, unknown>;

  // Schema version
  if (o.schemaVersion !== CURRENT_STATS_VERSION) return false;

  // Top-level numeric fields
  if (!isFiniteNonNeg(o.wins)) return false;
  if (!isFiniteNonNeg(o.losses)) return false;
  if (!isFiniteNonNeg(o.currentWinStreak)) return false;
  if (!isFiniteNonNeg(o.bestWinStreak)) return false;
  if (!isFiniteNonNeg(o.bestScore)) return false;

  // lastDifficulty
  if (typeof o.lastDifficulty !== 'string' || !VALID_DIFFICULTIES.includes(o.lastDifficulty)) return false;

  // byDifficulty — key whitelist (prototype pollution defense)
  if (typeof o.byDifficulty !== 'object' || o.byDifficulty === null) return false;
  const bd = o.byDifficulty as Record<string, unknown>;
  const keys = Object.keys(bd);
  if (keys.length !== 3) return false;
  for (const k of VALID_DIFFICULTIES) {
    if (!keys.includes(k)) return false;
    if (!isValidDifficultyStats(bd[k])) return false;
  }

  // Relational invariants: difficulty sums should match top-level
  const diffWins = VALID_DIFFICULTIES.reduce((sum, k) => sum + (bd[k] as DifficultyStats).wins, 0);
  const diffLosses = VALID_DIFFICULTIES.reduce((sum, k) => sum + (bd[k] as DifficultyStats).losses, 0);
  if (diffWins !== o.wins || diffLosses !== o.losses) {
    // Repair: derive top-level from per-difficulty sums
    (o as Record<string, number>).wins = diffWins;
    (o as Record<string, number>).losses = diffLosses;
  }

  return true;
}

// ─── Migration chain ──────────────────────────────────────

const MIGRATIONS: Record<number, (data: unknown) => unknown> = {
  // Future: 0: (data) => ({ ...data, schemaVersion: 1, newField: default })
};

function migrateStats(data: unknown): StatsSchema | null {
  if (typeof data !== 'object' || data === null) return null;
  const obj = data as Record<string, unknown>;
  let version = typeof obj.schemaVersion === 'number' ? obj.schemaVersion : 0;

  while (version < CURRENT_STATS_VERSION) {
    const migrate = MIGRATIONS[version];
    if (!migrate) return null; // unrecoverable — use defaults
    const result = migrate(obj) as Record<string, unknown>;
    version = typeof result.schemaVersion === 'number' ? result.schemaVersion : 0;
    Object.assign(obj, result);
  }

  return isValidStats(obj) ? obj as StatsSchema : null;
}

// ─── Load / Save ──────────────────────────────────────────

export function loadStats(): StatsSchema {
  if (!isStorageAvailable()) {
    return inMemoryStats ?? { ...DEFAULT_STATS, byDifficulty: { ...DEFAULT_STATS.byDifficulty } };
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_STATS, byDifficulty: { ...DEFAULT_STATS.byDifficulty } };

    const parsed = JSON.parse(raw) as unknown;
    if (isValidStats(parsed)) return parsed;

    // Try migration
    const migrated = migrateStats(parsed);
    if (migrated) return migrated;

    // Structurally broken — reset
    return { ...DEFAULT_STATS, byDifficulty: { ...DEFAULT_STATS.byDifficulty } };
  } catch {
    return { ...DEFAULT_STATS, byDifficulty: { ...DEFAULT_STATS.byDifficulty } };
  }
}

export function saveStats(stats: StatsSchema): boolean {
  if (!isStorageAvailable()) {
    inMemoryStats = stats;
    return true;
  }

  try {
    // Re-read before write — narrows concurrent-tab race
    const current = loadStats();
    // Merge: take the higher values for bests, latest for streaks
    const merged: StatsSchema = {
      ...stats,
      bestScore: Math.max(stats.bestScore, current.bestScore),
      bestWinStreak: Math.max(stats.bestWinStreak, current.bestWinStreak),
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    return true;
  } catch (e: unknown) {
    if (e instanceof DOMException && e.name === 'QuotaExceededError') {
      return false; // caller can show toast
    }
    return false;
  }
}

// ─── recordGameResult (pure — single point of mutation) ───

export function recordGameResult(
  stats: StatsSchema,
  difficulty: Difficulty,
  outcome: GameOutcome,
  score: number,
  timeSurvivedS: number,
): StatsSchema {
  const won = outcome === 'survived';
  const diff = stats.byDifficulty[difficulty];
  const streakBroken = stats.lastDifficulty !== difficulty;

  const newWinStreak = streakBroken
    ? (won ? 1 : 0)
    : (won ? stats.currentWinStreak + 1 : 0);

  const newDiffStats: DifficultyStats = {
    wins: diff.wins + (won ? 1 : 0),
    losses: diff.losses + (won ? 0 : 1),
    bestScore: Math.max(diff.bestScore, score),
    bestSurvivalTimeS: won
      ? diff.bestSurvivalTimeS  // wins always = time limit, not interesting
      : (diff.bestSurvivalTimeS === -1
        ? timeSurvivedS
        : Math.max(diff.bestSurvivalTimeS, timeSurvivedS)),
  };

  return {
    schemaVersion: 1,
    wins: stats.wins + (won ? 1 : 0),
    losses: stats.losses + (won ? 0 : 1),
    bestScore: Math.max(stats.bestScore, score),
    currentWinStreak: newWinStreak,
    bestWinStreak: Math.max(stats.bestWinStreak, newWinStreak),
    lastDifficulty: difficulty,
    byDifficulty: {
      ...stats.byDifficulty,
      [difficulty]: newDiffStats,
    },
  };
}
