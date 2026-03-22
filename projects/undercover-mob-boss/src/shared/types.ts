// ── Core domain types ──────────────────────────────────────────────

export type Role = 'citizen' | 'mob-soldier' | 'mob-boss';
export type PolicyType = 'good' | 'bad';
export type ExecutivePower = 'investigate' | 'special-nomination' | 'policy-peek' | 'execution';

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
  | 'policy-chief-discard'
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

// ── Player ─────────────────────────────────────────────────────────

export interface Player {
  id: string;
  name: string;
  role: Role;
  isAlive: boolean;
  isMayor: boolean;
  isChief: boolean;
  wasLastMayor: boolean;
  wasLastChief: boolean;
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
  nominatedChiefId: string | null;
  electionTracker: number;
  goodPoliciesEnacted: number;
  badPoliciesEnacted: number;
  policyDeck: PolicyType[];
  policyDiscard: PolicyType[];
  votes: Record<string, 'approve' | 'block'>;
  mayorCards: PolicyType[] | null;
  chiefCards: PolicyType[] | null;
  executivePower: ExecutivePower | null;
  winner: 'citizens' | 'mob' | null;
  winReason: string | null;
  /** Random threshold (3–7) — reshuffle when deck.length < this. Server-only. */
  reshuffleThreshold: number;
  vetoProposed: boolean;
  events: GameEvent[];
  /** Player IDs who have acknowledged their role (role-reveal phase). */
  acknowledgedPlayerIds: string[];
  /** Investigation records — tracks who investigated whom and the result. */
  investigationHistory: InvestigationRecord[];
  /** Top 3 cards shown to Mayor during policy-peek power. Server-only private data. */
  peekCards: PolicyType[] | null;
  /** Override for next mayor rotation (from special-nomination power). */
  specialNominatedMayorId: string | null;
  /** After a special election, rotation resumes from this index + 1 (SH rule). */
  resumeMayorIndex: number | null;
  /** Seed for reproducible games. Server-only. */
  rngSeed: number;
  /** Policy just enacted — set during policy-enact/auto-enact display, null otherwise. Server-only. */
  lastEnactedPolicy: PolicyType | null;
}

// ── Actions ────────────────────────────────────────────────────────

export type GameAction =
  | { type: 'start-game' }
  | { type: 'acknowledge-role'; playerId: string }
  | { type: 'nominate'; targetId: string }
  | { type: 'vote'; playerId: string; vote: 'approve' | 'block' }
  | { type: 'mayor-discard'; cardIndex: number }
  | { type: 'chief-discard'; cardIndex: number }
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
  | { type: 'policy-enacted'; policy: PolicyType; autoEnacted: boolean }
  | { type: 'election-passed'; mayorId: string; chiefId: string }
  | { type: 'election-failed'; electionTracker: number }
  | { type: 'auto-enact-triggered' }
  | { type: 'executive-power-activated'; power: ExecutivePower }
  | { type: 'investigation-result'; targetId: string; result: 'citizen' | 'mob' }
  | { type: 'player-executed'; playerId: string; wasMobBoss: boolean }
  | { type: 'special-mayor-chosen'; playerId: string }
  | { type: 'policy-peek-completed' }
  | { type: 'veto-enacted' }
  | { type: 'veto-rejected' }
  | { type: 'chief-cleared'; chiefId: string }
  | { type: 'game-over'; winner: 'citizens' | 'mob'; reason: string }
  | { type: 'term-limits-cleared' };
