import type { CardInstance, GameEvent, SubPhase, PendingPrompt } from './types'
import type { ClientAction } from './actions'

// --- Protocol Version ---

export const PROTOCOL_VERSION = 1

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
  | 'KICKED'

// --- Client -> Server Messages ---

export type ClientMessage =
  | { type: 'host-connect'; payload: Record<string, never> }
  | { type: 'join'; payload: { name: string; sessionToken?: string } }
  | { type: 'start-game'; payload: Record<string, never> }
  | { type: 'action'; payload: ClientAction }
  | { type: 'ping'; payload: Record<string, never> }
  | { type: 'pong'; payload: Record<string, never> }

// --- Server -> Client Messages ---

export type ServerMessage =
  | { type: 'state-update'; payload: LobbyView | BoardView }
  | { type: 'player-update'; payload: { state: PlayerView; private: PrivateData } }
  | { type: 'joined'; payload: { playerId: string; sessionToken: string; color: string; protocolVersion: number } }
  | { type: 'error'; payload: { code: ErrorCode; message: string } }
  | { type: 'action-rejected'; payload: { message: string } }
  | { type: 'ping'; payload: Record<string, never> }
  | { type: 'pong'; payload: Record<string, never> }

// --- Lobby View ---

export interface LobbyView {
  readonly phase: 'lobby'
  readonly roomCode: string
  readonly players: readonly { readonly id: string; readonly name: string; readonly color: string; readonly isConnected: boolean }[]
}

// --- Board Player ---

export interface BoardPlayer {
  readonly id: string
  readonly name: string
  readonly color: string
  readonly cardCount: number
  readonly isAlive: boolean
}

// --- Nope Window View ---

export interface NopeWindowView {
  readonly remainingMs: number
  readonly deadlineMs: number
  readonly chainDepth: number
  readonly startedAtMs: number
  readonly generation: number
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
  myPlayerId: string
  myHand: readonly CardInstance[]
  isMyTurn: boolean
}

export interface GameOverPlayerView extends GameOverBoardView {
  myPlayerId: string
  myHand: readonly CardInstance[]
}

// --- Private Data (See/Alter the Future) ---

export interface PrivateData {
  futureCards?: readonly CardInstance[]
  pendingFutureCardIds?: readonly string[]
}
