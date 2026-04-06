import type { CardInstance, GameEvent, SubPhase, PendingPrompt } from './types'
import type { ClientAction } from './actions'

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

// --- Server -> Client Messages ---

export type ServerMessage =
  | { type: 'state-update'; payload: LobbyView | BoardView }
  | { type: 'player-update'; payload: { state: PlayerView; private: PrivateData } }
  | { type: 'joined'; payload: { playerId: string; sessionToken: string; color: string } }
  | { type: 'error'; payload: { code: ErrorCode; message: string } }
  | { type: 'action-rejected'; payload: { message: string } }
  | { type: 'pong'; payload: Record<string, never> }

// --- Lobby View ---

export interface LobbyView {
  phase: 'lobby'
  roomCode: string
  players: { id: string; name: string; color: string; isConnected: boolean }[]
}

// --- Board Player ---

export interface BoardPlayer {
  id: string
  name: string
  color: string
  cardCount: number
  isAlive: boolean
}

// --- Nope Window View ---

export interface NopeWindowView {
  remainingMs: number
  deadlineMs: number
  chainDepth: number
  startedAtMs: number
}

// --- Pending Prompt View (projected from server's PendingPrompt) ---

export type PendingPromptView = PendingPrompt

// --- Board View (discriminated union) ---

export type BoardView = PlayingBoardView | GameOverBoardView

export interface PlayingBoardView {
  phase: 'playing'
  subPhase: SubPhase
  players: BoardPlayer[]
  drawPileCount: number
  discardPile: readonly CardInstance[]
  currentTurn: { currentPlayerId: string; turnsRemaining: number }
  nopeWindow: NopeWindowView | null
  pendingPrompt: PendingPromptView | null
  events: GameEvent[]
  stateVersion: number
}

export interface GameOverBoardView {
  phase: 'game_over'
  players: BoardPlayer[]
  drawPileCount: number
  discardPile: readonly CardInstance[]
  winnerId: string
  eliminationOrder: readonly string[]
  events: GameEvent[]
  stateVersion: number
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
