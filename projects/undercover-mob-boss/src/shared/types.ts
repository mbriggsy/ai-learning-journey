// ── Core domain types ──────────────────────────────────────────────

export type Role = 'citizen' | 'mob-soldier' | 'mob-boss';
export type PolicyType = 'good' | 'bad';
export type ExecutivePower = 'investigate' | 'special-nomination' | 'policy-peek' | 'execution';

/** A named policy card — carries all data needed to render (no external lookups). */
export interface PolicyCard {
  readonly type: PolicyType;
  readonly cardId: string;
  readonly name: string;
}

/** Cumulative policy history entry — used by Gazette at game-over. */
export interface PolicyHistoryEntry {
  card: PolicyCard;
  autoEnacted: boolean;
  round: number;
}

export type WinReason =
  | '5 good policies enacted'
  | '6 bad policies enacted'
  | 'Mob Boss elected Commissioner after 3+ bad policies'
  | 'Mob Boss executed'
  | 'Game abandoned due to inactivity';

export type Phase =
  | 'lobby'
  | 'role-reveal'
  | 'nomination'
  | 'election'
  | 'policy-session'
  | 'executive-power'
  | 'game-over';

export type SubPhase =
  | 'role-reveal-waiting'
  | 'nomination-pending'
  | 'election-voting'
  | 'election-result'
  | 'policy-mayor-discard'
  | 'policy-commissioner-discard'
  | 'policy-veto-propose'
  | 'policy-veto-response'
  | 'policy-enact'
  | 'executive-power-pending'
  | 'policy-peek-viewing'
  | 'auto-enact';

// ── Investigation ──────────────────────────────────────────────────

export interface InvestigationRecord {
  investigatorId: string;
  targetId: string;
  result: 'citizen' | 'mob';
}

// ── Vote History (Gazette) ────────────────────────────────────────

/** Record of a single government formation attempt. */
export interface GovernmentRecord {
  round: number;
  mayorId: string;
  nomineeId: string;
  passed: boolean;
  votes: Record<string, 'approve' | 'block'>;
  electionTracker: number;
}

// ── Player ─────────────────────────────────────────────────────────

export interface Player {
  id: string;
  name: string;
  role: Role;
  isAlive: boolean;
  isMayor: boolean;
  isCommissioner: boolean;
  wasLastMayor: boolean;
  wasLastCommissioner: boolean;
  /** Player IDs visible at role reveal (mob knowledge). */
  knownAllies: string[];
}

// ── Game State ─────────────────────────────────────────────────────

export interface GameState {
  phase: Phase;
  subPhase: SubPhase | null;
  round: number;
  players: Player[];
  mayorIndex: number;
  nominatedCommissionerId: string | null;
  electionTracker: number;
  goodPoliciesEnacted: number;
  badPoliciesEnacted: number;
  policyDeck: PolicyCard[];
  policyDiscard: PolicyCard[];
  votes: Record<string, 'approve' | 'block'>;
  mayorCards: PolicyCard[] | null;
  commissionerCards: PolicyCard[] | null;
  executivePower: ExecutivePower | null;
  winner: 'citizens' | 'mob' | null;
  winReason: WinReason | null;
  /** Random threshold (3–7) — reshuffle when deck.length < this. Server-only. */
  reshuffleThreshold: number;
  vetoProposed: boolean;
  events: GameEvent[];
  /** Player IDs who have acknowledged their role (role-reveal phase). */
  acknowledgedPlayerIds: string[];
  /** Investigation records — tracks who investigated whom and the result. */
  investigationHistory: InvestigationRecord[];
  /** Top 3 cards shown to Mayor during policy-peek power. Server-only private data. */
  peekCards: PolicyCard[] | null;
  /** Override for next mayor rotation (from special-nomination power). */
  specialNominatedMayorId: string | null;
  /** After a special election, rotation resumes from this index + 1 (SH rule). */
  resumeMayorIndex: number | null;
  /** Seed for reproducible games. Server-only. */
  rngSeed: number;
  /** Policy just enacted — set during policy-enact/auto-enact display, null otherwise. Server-only. */
  lastEnactedPolicy: PolicyCard | null;
  /** Cumulative policy history — every enacted card, in order. Never cleared. */
  policyHistory: PolicyHistoryEntry[];
  /** Cumulative vote history — every election attempt. For Gazette at game-over. */
  voteHistory: GovernmentRecord[];
}

// ── Actions ────────────────────────────────────────────────────────

export type GameAction =
  | { type: 'start-game' }
  | { type: 'acknowledge-role'; playerId: string }
  | { type: 'nominate'; targetId: string }
  | { type: 'vote'; playerId: string; vote: 'approve' | 'block' }
  | { type: 'mayor-discard'; cardIndex: number }
  | { type: 'commissioner-discard'; cardIndex: number }
  | { type: 'propose-veto' }
  | { type: 'veto-response'; approved: boolean }
  | { type: 'investigate'; targetId: string }
  | { type: 'special-nominate'; targetId: string }
  | { type: 'acknowledge-peek' }
  | { type: 'execute'; targetId: string }
  | { type: 'advance-display' };

/** Client-side action type — playerId omitted (server injects from connection state) */
type OmitPlayerId<T> = T extends { playerId: string } ? Omit<T, 'playerId'> & { playerId?: string } : T;
export type ClientGameAction = OmitPlayerId<GameAction>;

// ── Events (emitted by dispatch, consumed by caller) ───────────────

export type GameEvent =
  | { type: 'deck-reshuffled' }
  | { type: 'policy-enacted'; policy: PolicyType; card: PolicyCard; autoEnacted: boolean }
  | { type: 'election-passed'; mayorId: string; commissionerId: string }
  | { type: 'election-failed'; electionTracker: number }
  | { type: 'auto-enact-triggered' }
  | { type: 'executive-power-activated'; power: ExecutivePower }
  | { type: 'investigation-result'; targetId: string; result: 'citizen' | 'mob' }
  | { type: 'player-executed'; playerId: string; wasMobBoss: boolean }
  | { type: 'special-mayor-chosen'; playerId: string }
  | { type: 'policy-peek-completed' }
  | { type: 'veto-enacted' }
  | { type: 'veto-rejected' }
  | { type: 'commissioner-cleared'; commissionerId: string }
  | { type: 'game-over'; winner: 'citizens' | 'mob'; reason: WinReason }
  | { type: 'term-limits-cleared' };
