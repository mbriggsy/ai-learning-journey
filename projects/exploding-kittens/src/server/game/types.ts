import type { CardInstance, CardType, SubPhase, GameEvent } from '@shared/types'
import type { GameAction } from '@shared/actions'

// --- Game State (discriminated union on phase) ---

export type GameState = LobbyState | PlayingState | GameOverState

export interface LobbyState {
  readonly phase: 'lobby'
  readonly players: readonly LobbyPlayer[]
  readonly stateVersion: number
  readonly events: readonly GameEvent[]
}

export interface PlayingState {
  readonly phase: 'playing'
  readonly subPhase: SubPhase
  readonly players: readonly Player[]
  readonly drawPile: readonly CardInstance[]
  readonly discardPile: readonly CardInstance[]
  readonly currentTurn: TurnState
  readonly nopeWindow: NopeWindow | null
  readonly stateVersion: number
  readonly events: readonly GameEvent[]
  readonly pendingFavor?: { readonly requesterId: string; readonly targetId: string }
  readonly pendingFuture?: { readonly playerId: string; readonly cardIds: readonly string[] }
  readonly pendingSteal?: { readonly stealerId: string; readonly comboSize: 2 | 3 }
  readonly pendingNameCard?: { readonly stealerId: string; readonly targetId: string }
  readonly pendingDefuse?: { readonly playerId: string }
}

export interface GameOverState {
  readonly phase: 'game_over'
  readonly players: readonly Player[]
  readonly discardPile: readonly CardInstance[]
  readonly winnerId: string
  readonly eliminationOrder: readonly string[]
  readonly stateVersion: number
  readonly events: readonly GameEvent[]
}

// --- Supporting Types ---

export interface LobbyPlayer {
  readonly id: string
  readonly name: string
  readonly color: string
}

export interface Player {
  readonly id: string
  readonly name: string
  readonly color: string
  readonly hand: readonly CardInstance[]
  readonly isAlive: boolean
  readonly deadCards: readonly CardInstance[]
}

export interface TurnState {
  readonly currentPlayerId: string
  readonly turnsRemaining: number
}

export interface NopeWindow {
  readonly pendingAction: GameAction
  readonly originalPlayerId: string
  readonly originalCardType?: CardType
  readonly chainDepth: number
  readonly deadlineMs: number
  readonly startedAtMs: number
}

// --- Dispatch ---

export interface DispatchContext {
  readonly now: number
  readonly random: () => number
  readonly randomInt: (max: number) => number
}

export type DispatchResult =
  | { ok: true; state: GameState; events: readonly GameEvent[] }
  | { ok: false; error: string; code: ErrorCode; state: GameState }

export type ErrorCode =
  | 'INVALID_PHASE'
  | 'NOT_YOUR_TURN'
  | 'CARD_NOT_IN_HAND'
  | 'INVALID_TARGET'
  | 'INVALID_COMBO'
  | 'INVALID_ACTION'
  | 'INVALID_POSITION'
  | 'NOPE_NOT_ACTIVE'
  | 'MAX_CHAIN_DEPTH'
