// ── Narrator Line Definitions ──────────────────────────────────────
// Maps game events to pre-generated WAV files in /audio/.
// Durations are approximate — actual playback length comes from the
// decoded AudioBuffer at runtime.

export interface NarratorLine {
  /** WAV filename (without path prefix). */
  file: string;
  /** Human-readable description of when this line plays. */
  hook: string;
  /** Approximate duration in milliseconds (for scheduling). */
  durationMs: number;
  /** Which device should play this line. */
  target: 'host' | 'phone' | 'both';
}

/**
 * All narrator events mapped to their audio metadata.
 *
 * 26 unique event keys (round-start uses a template with {N} replaced
 * at runtime to select the correct round-specific file).
 */
export const NARRATOR_LINES: Record<string, NarratorLine> = {
  // ── Game Start ────────────────────────────────────────────────────
  'intro': {
    file: 'intro.wav',
    hook: 'Game start — role reveal begins',
    durationMs: 8000,
    target: 'host',
  },

  // ── Round Start (template — resolved at runtime) ──────────────────
  'round-start': {
    file: 'round-start-{N}.wav',
    hook: 'New round begins',
    durationMs: 4000,
    target: 'host',
  },

  // ── Election Phase ────────────────────────────────────────────────
  'nomination': {
    file: 'nomination.wav',
    hook: 'Mayor nominates Police Chief',
    durationMs: 5000,
    target: 'host',
  },
  'vote-open': {
    file: 'vote-open.wav',
    hook: 'Voting begins',
    durationMs: 5000,
    target: 'both',
  },
  'vote-reveal': {
    file: 'vote-reveal.wav',
    hook: 'Votes are revealed',
    durationMs: 4000,
    target: 'host',
  },
  'approved': {
    file: 'approved.wav',
    hook: 'Nomination passes',
    durationMs: 3000,
    target: 'host',
  },
  'blocked': {
    file: 'blocked.wav',
    hook: 'Nomination fails',
    durationMs: 3000,
    target: 'host',
  },

  // ── Election Tracker ──────────────────────────────────────────────
  'tracker-advance': {
    file: 'tracker-advance.wav',
    hook: 'Election tracker moves forward',
    durationMs: 4000,
    target: 'host',
  },
  'auto-enact': {
    file: 'auto-enact.wav',
    hook: 'Tracker hits 3 — policy auto-enacted',
    durationMs: 4000,
    target: 'host',
  },

  // ── Policy Enactment ──────────────────────────────────────────────
  'good-policy': {
    file: 'good-policy.wav',
    hook: 'Good policy enacted',
    durationMs: 5000,
    target: 'host',
  },
  'bad-policy': {
    file: 'bad-policy.wav',
    hook: 'Bad policy enacted',
    durationMs: 3000,
    target: 'host',
  },

  // ── Executive Powers ──────────────────────────────────────────────
  'investigate': {
    file: 'investigate.wav',
    hook: 'Investigation power activated',
    durationMs: 6000,
    target: 'host',
  },
  'special-nomination': {
    file: 'special-nomination.wav',
    hook: 'Special nomination power activated',
    durationMs: 5000,
    target: 'host',
  },
  'execution': {
    file: 'execution.wav',
    hook: 'Execution power activated',
    durationMs: 6000,
    target: 'host',
  },
  'executed': {
    file: 'executed.wav',
    hook: 'Player has been eliminated',
    durationMs: 5000,
    target: 'host',
  },
  'policy-peek': {
    file: 'policy-peek.wav',
    hook: 'Policy peek power activated',
    durationMs: 5000,
    target: 'host',
  },

  // ── Game End: Citizens Win ────────────────────────────────────────
  'mob-boss-executed': {
    file: 'mob-boss-executed.wav',
    hook: 'Mob Boss eliminated by execution',
    durationMs: 4000,
    target: 'host',
  },
  'citizens-win-policy': {
    file: 'citizens-win-policy.wav',
    hook: '5 good policies enacted — citizens win',
    durationMs: 5000,
    target: 'host',
  },
  'citizens-win-execution': {
    file: 'citizens-win-execution.wav',
    hook: 'Mob Boss found and executed — citizens win',
    durationMs: 5000,
    target: 'host',
  },

  // ── Game End: Mob Wins ────────────────────────────────────────────
  'mob-wins-policy': {
    file: 'mob-wins-policy.wav',
    hook: '6 bad policies enacted — mob wins',
    durationMs: 5000,
    target: 'host',
  },
  'mob-wins-election': {
    file: 'mob-wins-election.wav',
    hook: 'Mob Boss elected Police Chief — mob wins',
    durationMs: 5000,
    target: 'host',
  },

  // ── Deck & Veto ───────────────────────────────────────────────────
  'deck-reshuffle': {
    file: 'deck-reshuffle.wav',
    hook: 'Policy deck reshuffled',
    durationMs: 4000,
    target: 'host',
  },
  'veto-proposed': {
    file: 'veto-proposed.wav',
    hook: 'Police Chief proposes veto',
    durationMs: 4000,
    target: 'host',
  },
  'veto-approved': {
    file: 'veto-approved.wav',
    hook: 'Mayor agrees to veto',
    durationMs: 4000,
    target: 'host',
  },
  'veto-rejected': {
    file: 'veto-rejected.wav',
    hook: 'Mayor refuses veto',
    durationMs: 4000,
    target: 'host',
  },
};

/**
 * Phase-based preload groups.
 * Maps game phases to the narrator line IDs likely needed during that phase,
 * enabling lazy preloading of audio buffers per phase.
 */
export const PHASE_GROUPS: Record<string, string[]> = {
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
