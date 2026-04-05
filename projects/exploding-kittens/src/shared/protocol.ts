import type { CardInstance, GamePhase, SubPhase, GameEvent } from './types'

// --- Client -> Server Messages ---

export type ClientMessage =
  | { type: 'join'; payload: { name: string; color: string; sessionToken?: string } }
  | { type: 'action'; payload: import('./actions').ClientAction }
  | { type: 'ping'; payload: Record<string, never> }

// --- Server -> Client Messages ---

export type ServerMessage =
  | { type: 'lobby-state'; payload: LobbyState }
  | { type: 'board-state'; payload: BoardState }
  | { type: 'player-state'; payload: PlayerViewState }
  | { type: 'private-update'; payload: PrivateData }
  | { type: 'joined'; payload: { playerId: string; sessionToken: string } }
  | { type: 'error'; payload: { code: string; message: string } }
  | { type: 'pong'; payload: Record<string, never> }

// --- Lobby State ---

export interface LobbyState {
  phase: 'lobby'
  roomCode: string
  players: { id: string; name: string; color: string; isConnected: boolean }[]
}

// --- Board State (public projection) ---

export interface BoardPlayer {
  id: string
  name: string
  color: string
  cardCount: number
  isAlive: boolean
}

export interface BoardState {
  phase: Exclude<GamePhase, 'lobby'>
  subPhase: SubPhase
  players: BoardPlayer[]
  drawPileCount: number
  discardPile: readonly CardInstance[]
  currentTurn: { currentPlayerId: string; turnsRemaining: number }
  nopeWindow: { remainingMs: number; chainDepth: number; startedAtMs: number } | null
  events: GameEvent[]
  stateVersion: number
}

// --- Player View State (board + own hand) ---

export interface PlayerViewState extends BoardState {
  myHand: readonly CardInstance[]
  isMyTurn: boolean
}

// --- Private Data (See/Alter the Future) ---

export interface PrivateData {
  futureCards?: readonly CardInstance[]
  pendingFutureCardIds?: readonly string[]
}
