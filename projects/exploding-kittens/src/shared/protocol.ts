import type { GamePhase } from './types'

// --- Client -> Server Messages ---

export type ClientMessage =
  | { type: 'join'; payload: { name: string; color: string; sessionToken?: string } }
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

// --- Projected State Stubs (fleshed out Phase 2-3) ---

export interface LobbyState {
  phase: 'lobby'
  roomCode: string
  players: { id: string; name: string; color: string; isConnected: boolean }[]
}

export interface BoardState {
  phase: Exclude<GamePhase, 'lobby'>
}

export interface PlayerViewState {
  phase: Exclude<GamePhase, 'lobby'>
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- Phase 2-3 flesh out: hand contents, future peek, etc.
export interface PrivateData {}
