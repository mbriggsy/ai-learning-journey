// ── Narrator Line Definitions ──────────────────────────────────────
// Maps game events to pre-generated audio files in /audio/.
// V2: Discriminated union — 'single' for round-start, 'variant' for pool triggers.

/** Round-start: deterministic file per round number. */
interface SingleNarratorLine {
  kind: 'single';
  /** WAV filename template with {N} placeholder for round number. */
  file: string;
  /** Human-readable description of when this line plays. */
  hook: string;
  /** Approximate duration in milliseconds (for scheduling). */
  durationMs: number;
  /** Which device should play this line. */
  target: 'host' | 'phone' | 'both';
}

/** Event trigger: pool-selected variant per game session. */
interface VariantNarratorLine {
  kind: 'variant';
  /** Number of available variants (1-based). */
  variantCount: number;
  /** Human-readable description of when this line plays. */
  hook: string;
  /** Approximate duration in milliseconds (for scheduling). */
  durationMs: number;
  /** Which device should play this line. */
  target: 'host' | 'phone' | 'both';
}

export type NarratorLine = SingleNarratorLine | VariantNarratorLine;

/**
 * All narrator events mapped to their audio metadata.
 *
 * 25 keys: 1 round-start (template) + 24 variant-pool triggers.
 * Round-start uses {N} for round number (deterministic, NOT pool-selected).
 * All other triggers use variantCount for random pool selection per game.
 */
export const NARRATOR_LINES = {
  // ── Round Start (template — resolved at runtime by round number) ──
  'round-start': {
    kind: 'single' as const,
    file: 'round-start-{N}.wav',
    hook: 'New round begins',
    durationMs: 4000,
    target: 'host' as const,
  },

  // ── Game Start ────────────────────────────────────────────────────
  'intro': {
    kind: 'variant' as const,
    variantCount: 3,
    hook: 'Game start — role reveal begins',
    durationMs: 8000,
    target: 'host' as const,
  },

  // ── Election Phase ────────────────────────────────────────────────
  'nomination': {
    kind: 'variant' as const,
    variantCount: 6,
    hook: 'Mayor nominates Commissioner',
    durationMs: 5000,
    target: 'host' as const,
  },
  'vote-open': {
    kind: 'variant' as const,
    variantCount: 6,
    hook: 'Voting begins',
    durationMs: 5000,
    target: 'both' as const,
  },
  'vote-reveal': {
    kind: 'variant' as const,
    variantCount: 6,
    hook: 'Votes are revealed',
    durationMs: 4000,
    target: 'host' as const,
  },
  'approved': {
    kind: 'variant' as const,
    variantCount: 5,
    hook: 'Nomination passes',
    durationMs: 3000,
    target: 'host' as const,
  },
  'blocked': {
    kind: 'variant' as const,
    variantCount: 5,
    hook: 'Nomination fails',
    durationMs: 3000,
    target: 'host' as const,
  },

  // ── Election Tracker ──────────────────────────────────────────────
  'tracker-advance': {
    kind: 'variant' as const,
    variantCount: 3,
    hook: 'Election tracker moves forward',
    durationMs: 4000,
    target: 'host' as const,
  },
  'auto-enact': {
    kind: 'variant' as const,
    variantCount: 3,
    hook: 'Tracker hits 3 — policy auto-enacted',
    durationMs: 4000,
    target: 'host' as const,
  },

  // ── Policy Enactment ──────────────────────────────────────────────
  'good-policy': {
    kind: 'variant' as const,
    variantCount: 4,
    hook: 'Good policy enacted',
    durationMs: 5000,
    target: 'host' as const,
  },
  'bad-policy': {
    kind: 'variant' as const,
    variantCount: 4,
    hook: 'Bad policy enacted',
    durationMs: 3000,
    target: 'host' as const,
  },

  // ── Executive Powers ──────────────────────────────────────────────
  'investigate': {
    kind: 'variant' as const,
    variantCount: 3,
    hook: 'Investigation power activated',
    durationMs: 6000,
    target: 'host' as const,
  },
  'special-nomination': {
    kind: 'variant' as const,
    variantCount: 2,
    hook: 'Special nomination power activated',
    durationMs: 5000,
    target: 'host' as const,
  },
  'execution': {
    kind: 'variant' as const,
    variantCount: 3,
    hook: 'Execution power activated',
    durationMs: 6000,
    target: 'host' as const,
  },
  'executed': {
    kind: 'variant' as const,
    variantCount: 3,
    hook: 'Player has been eliminated',
    durationMs: 5000,
    target: 'host' as const,
  },
  'policy-peek': {
    kind: 'variant' as const,
    variantCount: 2,
    hook: 'Policy peek power activated',
    durationMs: 5000,
    target: 'host' as const,
  },

  // ── Game End: Citizens Win ────────────────────────────────────────
  'mob-boss-executed': {
    kind: 'variant' as const,
    variantCount: 2,
    hook: 'Mob Boss eliminated by execution',
    durationMs: 4000,
    target: 'host' as const,
  },
  'citizens-win-policy': {
    kind: 'variant' as const,
    variantCount: 2,
    hook: '5 good policies enacted — citizens win',
    durationMs: 5000,
    target: 'host' as const,
  },
  'citizens-win-execution': {
    kind: 'variant' as const,
    variantCount: 2,
    hook: 'Mob Boss found and executed — citizens win',
    durationMs: 5000,
    target: 'host' as const,
  },

  // ── Game End: Mob Wins ────────────────────────────────────────────
  'mob-wins-policy': {
    kind: 'variant' as const,
    variantCount: 2,
    hook: '6 bad policies enacted — mob wins',
    durationMs: 5000,
    target: 'host' as const,
  },
  'mob-wins-election': {
    kind: 'variant' as const,
    variantCount: 2,
    hook: 'Mob Boss elected Commissioner — mob wins',
    durationMs: 5000,
    target: 'host' as const,
  },

  // ── Deck & Veto ───────────────────────────────────────────────────
  'deck-reshuffle': {
    kind: 'variant' as const,
    variantCount: 2,
    hook: 'Policy deck reshuffled',
    durationMs: 4000,
    target: 'host' as const,
  },
  'veto-proposed': {
    kind: 'variant' as const,
    variantCount: 2,
    hook: 'Commissioner proposes veto',
    durationMs: 4000,
    target: 'host' as const,
  },
  'veto-approved': {
    kind: 'variant' as const,
    variantCount: 2,
    hook: 'Mayor agrees to veto',
    durationMs: 4000,
    target: 'host' as const,
  },
  'veto-rejected': {
    kind: 'variant' as const,
    variantCount: 2,
    hook: 'Mayor refuses veto',
    durationMs: 4000,
    target: 'host' as const,
  },
} as const satisfies Record<string, NarratorLine>;

/** Type-safe union of all trigger IDs. */
export type NarratorTriggerId = keyof typeof NARRATOR_LINES;

/**
 * Phase-based preload groups.
 * Maps game phases to the narrator line IDs likely needed during that phase.
 */
export const PHASE_GROUPS: Record<string, NarratorTriggerId[]> = {
  'lobby': [
    'intro',
  ],
  'role-reveal': [
    'intro',
    'round-start',
  ],
  'nomination': [
    'round-start',
    'nomination',
  ],
  'election': [
    'vote-open',
    'vote-reveal',
    'approved',
    'blocked',
    'tracker-advance',
    'auto-enact',
  ],
  'policy-session': [
    'good-policy',
    'bad-policy',
    'veto-proposed',
    'veto-approved',
    'veto-rejected',
    'deck-reshuffle',
  ],
  'executive-power': [
    'investigate',
    'special-nomination',
    'execution',
    'executed',
    'policy-peek',
    'mob-boss-executed',
  ],
  'game-over': [
    'citizens-win-policy',
    'citizens-win-execution',
    'mob-wins-policy',
    'mob-wins-election',
  ],
};
