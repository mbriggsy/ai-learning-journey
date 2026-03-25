// ── Gazette Types ──────────────────────────────────────────────────
// Data model for The Millbrook City Gazette post-game newspaper.

import type { PolicyType, GovernmentRecord, InvestigationRecord, PolicyHistoryEntry, WinReason } from '../../../shared/types';
import type { RevealedPlayer } from '../../../shared/protocol';

/** Discriminated union of game outcomes. */
export type GameOutcome =
  | { type: 'citizens-win-policy' }
  | { type: 'citizens-win-execution'; round: number }
  | { type: 'mob-wins-policy' }
  | { type: 'mob-wins-election'; mobBossId: string; round: number }
  | { type: 'abandoned' };

/** Pre-computed game-level analysis for templates. */
export interface GameAnalysis {
  totalRounds: number;
  winner: 'citizens' | 'mob' | null;
  outcome: GameOutcome;
  mobBossId: string;
  mobSoldierIds: string[];
  citizenIds: string[];
  totalGoodPolicies: number;
  totalBadPolicies: number;
  governments: GovernmentRecord[];
  policies: PolicyHistoryEntry[];
  investigations: InvestigationRecord[];
  players: RevealedPlayer[];
}

/** Pre-computed per-player analysis for superlatives. */
export interface PlayerAnalysis {
  playerId: string;
  playerName: string;
  role: string;
  isAlive: boolean;
  timesAsMayor: number;
  timesAsCommissioner: number;
  approveCount: number;
  blockCount: number;
  votedSameAsMobBoss: number;
  totalVotes: number;
  wasExecuted: boolean;
  executedRound: number | null;
  policiesEnactedAsGovernment: { type: PolicyType; round: number }[];
}

/** Discriminated union of key narrative moments. */
export type KeyMoment =
  | { type: 'mob-boss-nearly-elected'; round: number; mayorName: string }
  | { type: 'decisive-vote'; round: number; playerName: string; margin: number }
  | { type: 'policy-streak'; startRound: number; length: number; policyType: PolicyType }
  | { type: 'execution-miss'; round: number; targetName: string }
  | { type: 'execution-hit'; round: number }
  | { type: 'investigation-reveal'; round: number; investigatorName: string; targetName: string; result: 'citizen' | 'mob' }
  | { type: 'veto-drama'; round: number };

/** Superlative assigned to a player. */
export interface SuperlativeResult {
  playerId: string;
  playerName: string;
  nickname: string;
  description: string;
}

/** Full gazette data — computed once at mount, cached. */
export interface GazetteData {
  headline: string;
  subheadline: string;
  outcome: GameOutcome;
  players: RevealedPlayer[];
  policies: PolicyHistoryEntry[];
  governments: GovernmentRecord[];
  moments: KeyMoment[];
  superlatives: SuperlativeResult[];
  round: number;
  goodPolicies: number;
  badPolicies: number;
}
