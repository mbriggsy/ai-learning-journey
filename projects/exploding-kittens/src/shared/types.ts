import type { CardType } from './card-defs'
export type { CardType }

/** Individual card instance — unique ID for tracking in hands/deck/discard */
export interface CardInstance {
  readonly id: string
  readonly type: CardType
}

/** Top-level game phases */
export type GamePhase = 'lobby' | 'playing' | 'game_over'

/** Sub-phases within 'playing' — controls which actions are valid */
export type SubPhase =
  | 'turn-active'
  | 'defuse-pending'
  | 'eliminated-check'
  | 'favor-pending'
  | 'future-rearrange-pending'
  | 'steal-target-pending'
  | 'name-card-pending'

/** Events emitted by the engine — drive UI text and animation triggers */
export type GameEvent =
  | { type: 'game-started'; playerCount: number }
  | { type: 'card-played'; playerId: string; cardType: CardType; comboSize?: number }
  | { type: 'card-drawn'; playerId: string; safe: boolean }
  | { type: 'nope-played'; playerId: string; chainDepth: number }
  | { type: 'nope-window-opened'; targetAction: string; deadlineMs: number }
  | { type: 'nope-window-resolved'; cancelled: boolean; chainDepth: number }
  | { type: 'exploding-kitten-drawn'; playerId: string }
  | { type: 'defuse-played'; playerId: string }
  | { type: 'player-eliminated'; playerId: string; rank: number }
  | { type: 'favor-requested'; requesterId: string; targetId: string }
  | { type: 'favor-given'; giverId: string; receiverId: string }
  | { type: 'future-peeked'; playerId: string }
  | { type: 'future-rearranged'; playerId: string }
  | { type: 'deck-shuffled'; playerId: string }
  | { type: 'combo-steal'; stealerId: string; targetId: string; found: boolean }
  | { type: 'turn-started'; playerId: string; turnsRemaining: number }
  | { type: 'game-over'; winnerId: string }
