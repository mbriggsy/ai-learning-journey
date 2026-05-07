import type { CardInstance, GameEvent, SubPhase, PendingPrompt, CardType } from './types'
import type { ClientAction } from './actions'

// --- Protocol Version ---

// v4 → v5 (2026-05-07): client `join` now carries `protocolVersion` so
// the server can reject mismatched clients BEFORE allocating a player
// slot (B-12). Old clients that don't send the field get rejected the
// same way — the field's absence reads as v0, mismatch with v5.
export const PROTOCOL_VERSION = 5

// --- Error Codes ---

export type ErrorCode =
  | 'INVALID_MESSAGE'
  | 'ROOM_FULL'
  | 'NAME_TAKEN'
  | 'NAME_INVALID'
  | 'NOT_HOST'
  | 'NOT_ENOUGH_PLAYERS'
  | 'GAME_ALREADY_STARTED'
  | 'STALE_STATE'
  | 'RATE_LIMITED'
  | 'SESSION_REPLACED'
  | 'DEAD_PLAYER'
  | 'INVALID_ACTION'
  | 'NOPE_TOO_LATE'
  | 'KICKED'
  | 'PROTOCOL_MISMATCH'

// --- Client -> Server Messages ---

export type ClientMessage =
  | { type: 'host-connect'; payload: { sessionToken?: string } }
  | { type: 'join'; payload: { name: string; sessionToken?: string; protocolVersion?: number } }
  | { type: 'start-game'; payload: Record<string, never> }
  | { type: 'return-to-lobby'; payload: Record<string, never> }
  | { type: 'action'; payload: ClientAction }
  | { type: 'ping'; payload: Record<string, never> }
  | { type: 'pong'; payload: Record<string, never> }

// --- Server -> Client Messages ---

export type ServerMessage =
  | { type: 'state-update'; payload: LobbyView | BoardView; protocolVersion: number }
  | { type: 'player-update'; payload: { state: PlayerView; private: PrivateData }; protocolVersion: number }
  | { type: 'joined'; payload: { playerId: string; sessionToken: string; color: string; protocolVersion: number } }
  | { type: 'error'; payload: { code: ErrorCode; message: string; disconnectedNames?: readonly string[] } }
  | { type: 'action-rejected'; payload: { message: string } }
  | { type: 'ping'; payload: Record<string, never> }
  | { type: 'pong'; payload: Record<string, never> }

// --- Lobby View ---

export interface LobbyView {
  readonly phase: 'lobby'
  readonly roomCode: string
  readonly players: readonly { readonly id: string; readonly name: string; readonly color: string; readonly isConnected: boolean }[]
  /** Whether the board/TV (host) is currently connected. Phone players need
   *  this to know when to surface a "host disconnected" signal — without it
   *  the joined-state phone UI silently waits forever while the only thing
   *  that can start the game is gone. B-02. */
  readonly hostConnected: boolean
}

// --- Board Player ---

export interface BoardPlayer {
  readonly id: string
  readonly name: string
  readonly color: string
  readonly cardCount: number
  readonly isAlive: boolean
  readonly isConnected: boolean
}

// --- Nope Window View ---

export interface NopeWindowView {
  readonly remainingMs: number
  readonly deadlineMs: number
  readonly chainDepth: number
  readonly startedAtMs: number
  readonly generation: number
  /**
   * Context for a 3-of-a-kind named steal whose intercept window is open.
   * Absent for every other nope window (single-card plays, 2-of-a-kind
   * random steals, nope-on-nope chain windows).
   *
   * `namedCardType` is private per BURNED house rule §13.8 — the projection
   * exposes it only to the stealer and the target. Board view and bystander
   * player views see the object without the field (target identity is public
   * so the board can show "Johnny is targeting Mittens" without leaking the
   * card name).
   */
  readonly namedSteal?: {
    readonly stealerId: string
    readonly targetPlayerId: string
    readonly namedCardType?: CardType
  }
}

// --- Pending Prompt View (projected from server's PendingPrompt) ---

export type PendingPromptView = PendingPrompt

// --- Board View (discriminated union) ---

export type BoardView = PlayingBoardView | GameOverBoardView

export interface PlayingBoardView {
  readonly phase: 'playing'
  readonly subPhase: SubPhase
  readonly players: readonly BoardPlayer[]
  readonly drawPileCount: number
  readonly discardPile: readonly CardInstance[]
  readonly currentTurn: { readonly currentPlayerId: string; readonly turnsRemaining: number }
  readonly nopeWindow: NopeWindowView | null
  readonly pendingPrompt: PendingPromptView | null
  readonly events: readonly GameEvent[]
  readonly stateVersion: number
}

export interface GameOverBoardView {
  readonly phase: 'game_over'
  readonly players: readonly BoardPlayer[]
  readonly drawPileCount: number
  readonly discardPile: readonly CardInstance[]
  readonly winnerId: string
  readonly eliminationOrder: readonly string[]
  readonly events: readonly GameEvent[]
  readonly stateVersion: number
}

// --- Player View (discriminated union) ---

export type PlayerView = PlayingPlayerView | GameOverPlayerView

export interface PlayingPlayerView extends PlayingBoardView {
  readonly myPlayerId: string
  readonly myHand: readonly CardInstance[]
  readonly isMyTurn: boolean
}

export interface GameOverPlayerView extends GameOverBoardView {
  readonly myPlayerId: string
  readonly myHand: readonly CardInstance[]
}

// --- Private Data (See/Alter the Future) ---

export interface PrivateData {
  futureCards?: readonly CardInstance[]
  pendingFutureCardIds?: readonly string[]
}
