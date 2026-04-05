import type { GameEvent } from '@shared/types'
import type { PlayingState, GameOverState, Player } from './game/types'

// --- Board Projection (public info only) ---

export interface BoardProjection {
  phase: 'playing' | 'game_over'
  subPhase: PlayingState['subPhase']
  players: BoardPlayer[]
  drawPileCount: number
  discardPile: PlayingState['discardPile']
  currentTurn: { currentPlayerId: string; turnsRemaining: number }
  nopeWindow: { remainingMs: number; chainDepth: number; startedAtMs: number } | null
  events: GameEvent[]
  stateVersion: number
}

export interface BoardPlayer {
  id: string
  name: string
  color: string
  cardCount: number
  isAlive: boolean
}

// --- Player Projection (board + own hand) ---

export interface PlayerProjection extends BoardProjection {
  myHand: PlayingState['drawPile']
  isMyTurn: boolean
}

// --- Private Data (See/Alter the Future) ---

export interface PrivateProjection {
  futureCards?: PlayingState['drawPile']
  pendingFutureCardIds?: readonly string[]
}

// --- Projection Functions ---

export function projectForBoard(state: PlayingState | GameOverState, now: number): BoardProjection {
  const players = state.players.map(projectPlayer)

  if (state.phase === 'game_over') {
    return {
      phase: 'game_over',
      subPhase: 'turn-active',
      players,
      drawPileCount: 0,
      discardPile: state.discardPile,
      currentTurn: { currentPlayerId: '', turnsRemaining: 0 },
      nopeWindow: null,
      events: sanitizeEvents(state.events),
      stateVersion: state.stateVersion,
    }
  }

  return {
    phase: 'playing',
    subPhase: state.subPhase,
    players,
    drawPileCount: state.drawPile.length,
    discardPile: state.discardPile,
    currentTurn: {
      currentPlayerId: state.currentTurn.currentPlayerId,
      turnsRemaining: state.currentTurn.turnsRemaining,
    },
    nopeWindow: state.nopeWindow
      ? {
          remainingMs: Math.max(0, state.nopeWindow.deadlineMs - now),
          chainDepth: state.nopeWindow.chainDepth,
          startedAtMs: state.nopeWindow.startedAtMs,
        }
      : null,
    events: sanitizeEvents(state.events),
    stateVersion: state.stateVersion,
  }
}

export function projectForPlayer(
  state: PlayingState | GameOverState,
  playerId: string,
  now: number,
): PlayerProjection {
  const board = projectForBoard(state, now)
  const player = state.players.find(p => p.id === playerId)

  return {
    ...board,
    myHand: player?.hand ?? [],
    isMyTurn: state.phase === 'playing' && state.currentTurn.currentPlayerId === playerId,
  }
}

export function getPrivateData(state: PlayingState, playerId: string): PrivateProjection {
  const data: PrivateProjection = {}

  if (state.pendingFuture && state.pendingFuture.playerId === playerId) {
    const cardIds = state.pendingFuture.cardIds
    data.futureCards = state.drawPile.filter(c => cardIds.includes(c.id))
    data.pendingFutureCardIds = [...cardIds]
  }

  return data
}

// --- Helpers ---

function projectPlayer(player: Player): BoardPlayer {
  return {
    id: player.id,
    name: player.name,
    color: player.color,
    cardCount: player.hand.length,
    isAlive: player.isAlive,
  }
}

function sanitizeEvents(events: readonly GameEvent[]): GameEvent[] {
  return events.map(event => {
    // These event types are safe to broadcast as-is
    return event
  })
}
