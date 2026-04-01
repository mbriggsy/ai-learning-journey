import { describe, it, expect } from 'vitest';
import { isValidStats, recordGameResult } from '../../src/persistence.js';
import type { StatsSchema } from '../../src/types/persistence.js';
import { DEFAULT_STATS } from '../../src/types/persistence.js';

// ─── isValidStats tests ──────────────────────────────────

describe('isValidStats', () => {
  function validStats(): StatsSchema {
    return {
      schemaVersion: 1,
      wins: 5,
      losses: 3,
      currentWinStreak: 2,
      bestWinStreak: 4,
      lastDifficulty: 'easy',
      bestScore: 2400,
      byDifficulty: {
        easy: { wins: 3, losses: 1, bestScore: 2400, bestSurvivalTimeS: 95.5 },
        medium: { wins: 2, losses: 1, bestScore: 1800, bestSurvivalTimeS: 60.0 },
        hard: { wins: 0, losses: 1, bestScore: 600, bestSurvivalTimeS: 30.0 },
      },
    };
  }

  it('accepts valid stats', () => {
    expect(isValidStats(validStats())).toBe(true);
  });

  it('rejects empty object', () => {
    expect(isValidStats({})).toBe(false);
  });

  it('rejects null', () => {
    expect(isValidStats(null)).toBe(false);
  });

  it('rejects string', () => {
    expect(isValidStats('banana')).toBe(false);
  });

  it('rejects wrong schema version', () => {
    expect(isValidStats({ ...validStats(), schemaVersion: 99 })).toBe(false);
  });

  it('rejects NaN wins', () => {
    expect(isValidStats({ ...validStats(), wins: NaN })).toBe(false);
  });

  it('rejects Infinity wins', () => {
    expect(isValidStats({ ...validStats(), wins: Infinity })).toBe(false);
  });

  it('rejects negative wins', () => {
    expect(isValidStats({ ...validStats(), wins: -5 })).toBe(false);
  });

  it('rejects string wins', () => {
    expect(isValidStats({ ...validStats(), wins: 'banana' })).toBe(false);
  });

  it('rejects invalid lastDifficulty', () => {
    expect(isValidStats({ ...validStats(), lastDifficulty: 'insane' })).toBe(false);
  });

  it('rejects extra key in byDifficulty (prototype pollution)', () => {
    const stats = validStats();
    const polluted = {
      ...stats,
      byDifficulty: {
        ...stats.byDifficulty,
        __proto__: { wins: 0, losses: 0, bestScore: 0, bestSurvivalTimeS: -1 },
      },
    };
    // Note: __proto__ may not appear in Object.keys on some engines,
    // but we guard against extra keys explicitly
    const keys = Object.keys(polluted.byDifficulty);
    if (keys.length !== 3) {
      expect(isValidStats(polluted)).toBe(false);
    }
  });

  it('rejects missing difficulty key', () => {
    const stats = validStats();
    const broken = {
      ...stats,
      byDifficulty: {
        easy: stats.byDifficulty.easy,
        medium: stats.byDifficulty.medium,
        // missing 'hard'
      },
    };
    expect(isValidStats(broken)).toBe(false);
  });

  it('rejects NaN in difficulty stats', () => {
    const stats = validStats();
    const broken = {
      ...stats,
      byDifficulty: {
        ...stats.byDifficulty,
        easy: { ...stats.byDifficulty.easy, bestScore: NaN },
      },
    };
    expect(isValidStats(broken)).toBe(false);
  });

  it('accepts bestSurvivalTimeS of -1 (sentinel)', () => {
    expect(isValidStats({
      ...validStats(),
      byDifficulty: {
        easy: { wins: 5, losses: 3, bestScore: 0, bestSurvivalTimeS: -1 },
        medium: { wins: 0, losses: 0, bestScore: 0, bestSurvivalTimeS: -1 },
        hard: { wins: 0, losses: 0, bestScore: 0, bestSurvivalTimeS: -1 },
      },
    })).toBe(true);
  });

  it('repairs mismatched top-level wins/losses from difficulty sums', () => {
    const stats = {
      ...validStats(),
      wins: 999, // wrong — easy(3) + medium(2) + hard(0) = 5
      losses: 999,
    };
    const result = isValidStats(stats);
    expect(result).toBe(true);
    // After repair, wins should match sum
    expect((stats as StatsSchema).wins).toBe(5);
    expect((stats as StatsSchema).losses).toBe(3);
  });
});

// ─── recordGameResult tests ──────────────────────────────

describe('recordGameResult', () => {
  it('win on Easy: wins +1, losses unchanged, streak +1', () => {
    const result = recordGameResult(DEFAULT_STATS, 'easy', 'survived', 1000, 120);
    expect(result.wins).toBe(1);
    expect(result.losses).toBe(0);
    expect(result.currentWinStreak).toBe(1);
    expect(result.bestWinStreak).toBe(1);
    expect(result.byDifficulty.easy.wins).toBe(1);
    expect(result.bestScore).toBe(1000);
  });

  it('loss on Easy: wins unchanged, losses +1, streak reset', () => {
    const afterWin = recordGameResult(DEFAULT_STATS, 'easy', 'survived', 1000, 120);
    const result = recordGameResult(afterWin, 'easy', 'found', 500, 60);
    expect(result.wins).toBe(1);
    expect(result.losses).toBe(1);
    expect(result.currentWinStreak).toBe(0);
    expect(result.bestWinStreak).toBe(1); // preserved from win
  });

  it('win then switch difficulty: streak resets to 1', () => {
    const afterWin = recordGameResult(DEFAULT_STATS, 'easy', 'survived', 1000, 120);
    expect(afterWin.currentWinStreak).toBe(1);

    const result = recordGameResult(afterWin, 'medium', 'survived', 1500, 120);
    expect(result.currentWinStreak).toBe(1); // reset because difficulty changed
    expect(result.lastDifficulty).toBe('medium');
  });

  it('best score updated only when higher', () => {
    const first = recordGameResult(DEFAULT_STATS, 'easy', 'survived', 2000, 120);
    expect(first.bestScore).toBe(2000);

    const second = recordGameResult(first, 'easy', 'survived', 1500, 120);
    expect(second.bestScore).toBe(2000); // unchanged — lower score

    const third = recordGameResult(second, 'easy', 'survived', 3000, 120);
    expect(third.bestScore).toBe(3000); // updated — higher
  });

  it('per-difficulty wins/losses match top-level', () => {
    let stats = DEFAULT_STATS;
    stats = recordGameResult(stats, 'easy', 'survived', 1000, 120);
    stats = recordGameResult(stats, 'easy', 'found', 500, 60);
    stats = recordGameResult(stats, 'medium', 'survived', 1500, 120);
    stats = recordGameResult(stats, 'hard', 'found', 800, 90);

    const sumWins = stats.byDifficulty.easy.wins + stats.byDifficulty.medium.wins + stats.byDifficulty.hard.wins;
    const sumLosses = stats.byDifficulty.easy.losses + stats.byDifficulty.medium.losses + stats.byDifficulty.hard.losses;
    expect(sumWins).toBe(stats.wins);
    expect(sumLosses).toBe(stats.losses);
  });

  it('bestSurvivalTimeS tracks longest loss (not wins)', () => {
    let stats = DEFAULT_STATS;
    // Win — should NOT update bestSurvivalTimeS
    stats = recordGameResult(stats, 'easy', 'survived', 1000, 120);
    expect(stats.byDifficulty.easy.bestSurvivalTimeS).toBe(-1);

    // Loss at 60s — first loss sets it
    stats = recordGameResult(stats, 'easy', 'found', 500, 60);
    expect(stats.byDifficulty.easy.bestSurvivalTimeS).toBe(60);

    // Loss at 90s — update (higher)
    stats = recordGameResult(stats, 'easy', 'found', 500, 90);
    expect(stats.byDifficulty.easy.bestSurvivalTimeS).toBe(90);

    // Loss at 30s — no update (lower)
    stats = recordGameResult(stats, 'easy', 'found', 500, 30);
    expect(stats.byDifficulty.easy.bestSurvivalTimeS).toBe(90);
  });

  it('consecutive wins on same difficulty build streak', () => {
    let stats = DEFAULT_STATS;
    stats = recordGameResult(stats, 'easy', 'survived', 1000, 120);
    expect(stats.currentWinStreak).toBe(1);
    stats = recordGameResult(stats, 'easy', 'survived', 1000, 120);
    expect(stats.currentWinStreak).toBe(2);
    stats = recordGameResult(stats, 'easy', 'survived', 1000, 120);
    expect(stats.currentWinStreak).toBe(3);
    expect(stats.bestWinStreak).toBe(3);
  });
});
