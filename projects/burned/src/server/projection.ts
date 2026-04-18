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

  // Board view is PUBLIC — strip any card-identity fields from events that
  // would leak hand composition to unrelated viewers.
  const boardEvents = stripPrivateEventFields(state.events, null)

  if (state.phase === 'game_over') {
    const view: GameOverBoardView = {
      phase: 'game_over',
      players,
      drawPileCount: 0,
      discardPile: state.discardPile,
      winnerId: state.winnerId,
      eliminationOrder: state.eliminationOrder,
      events: boardEvents,
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
          generation: state.nopeWindow.generation,
        }
      : null,
    pendingPrompt: stripPrivatePromptFields(state.pendingPrompt),
    events: boardEvents,
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

  // Player projection re-derives events from raw state so this viewer gets
  // the card-identity fields reserved for combo-steal principals (stealer /
  // target). The board view already stripped those fields publicly.
  const events = stripPrivateEventFields(state.events, playerId)

  if (board.phase === 'game_over') {
    const b = board as GameOverBoardView
    const view: GameOverPlayerView = {
      phase: b.phase,
      players: b.players,
      drawPileCount: b.drawPileCount,
      discardPile: [],
      winnerId: b.winnerId,
      eliminationOrder: b.eliminationOrder,
      events,
      stateVersion: b.stateVersion,
      myPlayerId: playerId,
      myHand: player?.hand ?? [],
    }
    return view
  }

  const b = board as PlayingBoardView
  const view: PlayingPlayerView = {
    phase: b.phase,
    subPhase: b.subPhase,
    players: b.players,
    drawPileCount: b.drawPileCount,
    discardPile: [],
    currentTurn: b.currentTurn,
    nopeWindow: b.nopeWindow,
    pendingPrompt: b.pendingPrompt,
    events,
    stateVersion: b.stateVersion,
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

function stripPrivatePromptFields(prompt: import('@shared/types').PendingPrompt | null): PendingPromptView | null {
  if (!prompt) return null
  // Strip cardIds from future-rearrange — board must not see draw pile card UUIDs
  if (prompt.type === 'future-rearrange') {
    return { type: prompt.type, playerId: prompt.playerId, cardIds: [] }
  }
  return prompt
}

/**
 * Remove card-identity fields from events that would leak hand composition
 * to a viewer who wasn't a party to the action. `viewerId === null` means
 * the public board view, which never sees these fields.
 *
 * For now this only filters `combo-steal.cardType` — stealer and target
 * legitimately know which card moved (or which card was named on a whiff),
 * everyone else must not. Pattern scales to future event-level private
 * fields without changing callers.
 *
 * NOTE: This is an INTENTIONAL divergence from canonical Exploding Kittens
 * rules, where the triple-steal card-naming is public. BURNED keeps it
 * private to preserve the spy-agency fiction — intercepted transmissions
 * stay intercepted. Do not "fix" this to leak cardType publicly without
 * a product decision first. See docs/rules/RULES-REFERENCE.md.
 */
function stripPrivateEventFields(
  events: readonly GameEvent[],
  viewerId: string | null,
): GameEvent[] {
  return events.map(event => {
    if (event.type === 'combo-steal' && event.cardType !== undefined) {
      const allowed = viewerId !== null &&
        (viewerId === event.stealerId || viewerId === event.targetId)
      if (!allowed) {
        const { cardType: _strip, ...rest } = event
        return rest
      }
    }
    return event
  })
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
