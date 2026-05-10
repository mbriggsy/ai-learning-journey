import type { CardInstance, CardType, SubPhase, GameEvent, PendingPrompt } from '@shared/types'
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
  readonly pendingSteal?: { readonly stealerId: string; readonly targetPlayerId: string; readonly comboSize: 2 | 3 }
  // cardIds holds the 3 cards the stealer has staged but NOT yet discarded —
  // they stay in the stealer's hand until a name is committed (or return home
  // on cancel). namedCardType is set the moment the stealer commits; its
  // presence gates cancellation and signals the nope-resolver to perform the
  // actual steal. See docs/RULES-REFERENCE.md §7 (Three of a Kind) for
  // the timing contract.
  readonly pendingNameCard?: {
    readonly stealerId: string
    readonly targetId: string
    readonly cardIds: readonly string[]
    readonly namedCardType?: CardType
  }
  readonly pendingDefuse?: { readonly playerId: string }
  readonly pendingPrompt: PendingPrompt | null
  readonly nextNopeGeneration: number
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
  readonly generation: number
  readonly deadlineMs: number
  readonly startedAtMs: number
  readonly expired?: boolean
  readonly graceDeadlineMs?: number
  /**
   * Player who played the most recent Nope on the chain. Undefined at
   * chainDepth 0 (no Nopes yet — `originalPlayerId` covers self-Nope of the
   * initial action). Set to the noper's id at chainDepth >= 1 so the engine
   * can reject "Nope your own Nope" — per RULES-REFERENCE.md §9 ("you cannot
   * Nope your own card play"), the noper is treated as the most recent
   * actor and cannot Nope themselves on the next chain step. Pre-2026-05-10
   * the engine only blocked self-Nope at chainDepth 0; the gap let a noper
   * play consecutive Nopes (self-undo). Caught Briggsy 2026-05-10.
   */
  readonly lastNoperId?: string
}

// --- Dispatch ---

export interface DispatchContext {
  readonly now: number
  readonly random: () => number
  readonly randomInt: (max: number) => number
  /**
   * Playtest-mode override. When set, replaces the tiered
   * `NOPE_WINDOW_MS[tier]` default uniformly across all player counts.
   * Production callers leave this unset; only `makeDispatchContext` in
   * playtest mode populates it.
   */
  readonly nopeWindowMs?: number
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
  /** D-03 race: client's nope arrived with a windowGeneration the server
      has already advanced past. Distinct from NOPE_NOT_ACTIVE (no window
      at all) so the wire layer can surface a specific "too late" toast. */
  | 'NOPE_STALE_GENERATION'
  | 'MAX_CHAIN_DEPTH'
