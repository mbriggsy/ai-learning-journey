import type {
  BoardView, PlayingBoardView, GameOverBoardView,
  BoardPlayer, PlayerView, PlayingPlayerView, GameOverPlayerView,
  PrivateData, PendingPromptView,
} from '@shared/protocol'
import type { GameEvent } from '@shared/types'
import type { PlayingState, GameOverState, Player } from './game/types'

// --- Projection Functions ---

export function projectForBoard(state: PlayingState | GameOverState, now: number): BoardView {
  const players = state.players.map(projectPlayer)

  if (state.phase === 'game_over') {
    const view: GameOverBoardView = {
      phase: 'game_over',
      players,
      drawPileCount: 0,
      discardPile: state.discardPile,
      winnerId: state.winnerId,
      eliminationOrder: state.eliminationOrder,
      events: [...state.events] as GameEvent[],
      stateVersion: state.stateVersion,
    }
    return view
  }

  const view: PlayingBoardView = {
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
          deadlineMs: state.nopeWindow.deadlineMs,
          chainDepth: state.nopeWindow.chainDepth,
          startedAtMs: state.nopeWindow.startedAtMs,
        }
      : null,
    pendingPrompt: state.pendingPrompt as PendingPromptView | null,
    events: [...state.events] as GameEvent[],
    stateVersion: state.stateVersion,
  }
  return view
}

export function projectForPlayer(
  state: PlayingState | GameOverState,
  playerId: string,
  board: BoardView,
): PlayerView {
  const player = state.players.find(p => p.id === playerId)

  if (board.phase === 'game_over') {
    const view: GameOverPlayerView = {
      ...board,
      myPlayerId: playerId,
      myHand: player?.hand ?? [],
    }
    return view
  }

  const view: PlayingPlayerView = {
    ...board,
    myPlayerId: playerId,
    myHand: player?.hand ?? [],
    isMyTurn: state.phase === 'playing' && state.currentTurn.currentPlayerId === playerId,
  }
  return view
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
