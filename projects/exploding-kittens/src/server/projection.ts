import type { GameEvent } from '@shared/types'
import type { BoardState, BoardPlayer, PlayerViewState, PrivateData } from '@shared/protocol'
import type { PlayingState, GameOverState, Player } from './game/types'

export type { BoardState, BoardPlayer, PlayerViewState, PrivateData }

// --- Projection Functions ---

export function projectForBoard(state: PlayingState | GameOverState, now: number): BoardState {
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
): PlayerViewState {
  const board = projectForBoard(state, now)
  const player = state.players.find(p => p.id === playerId)

  // Explicit allowlist — no spread from board projection
  return {
    phase: board.phase,
    subPhase: board.subPhase,
    players: board.players,
    drawPileCount: board.drawPileCount,
    discardPile: board.discardPile,
    currentTurn: board.currentTurn,
    nopeWindow: board.nopeWindow,
    events: board.events,
    stateVersion: board.stateVersion,
    myHand: player?.hand ?? [],
    isMyTurn: state.phase === 'playing' && state.currentTurn.currentPlayerId === playerId,
  }
}

export function getPrivateData(state: PlayingState, playerId: string): PrivateData {
  const data: PrivateData = {}

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
  // TODO: Strip sensitive fields when private event types are added (e.g., stolen card identity)
  return [...events]
}
