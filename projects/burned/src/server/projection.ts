import type {
  BoardView, PlayingBoardView, GameOverBoardView,
  BoardPlayer, PlayerView, PlayingPlayerView, GameOverPlayerView,
  PrivateData, PendingPromptView, NopeWindowView,
} from '@shared/protocol'
import type { GameEvent } from '@shared/types'
import type { PlayingState, GameOverState, Player } from './game/types'

// --- Projection Functions ---

export function projectForBoard(
  state: PlayingState | GameOverState,
  now: number,
  connectedPlayerIds: ReadonlySet<string>,
): BoardView {
  const players = state.players.map(p => projectPlayer(p, connectedPlayerIds.has(p.id)))

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
    nopeWindow: projectNopeWindow(state, now, null),
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
    nopeWindow: augmentNopeWindowForPlayer(b.nopeWindow, state, playerId),
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

/**
 * Build the public NopeWindowView from the server state. When a 3-of-a-kind
 * named steal's window is open, attaches a `namedSteal` context object so
 * clients can render "this window is about X targeting Y" before the window
 * resolves — fixing the gap where targets couldn't decide whether to burn an
 * Intercept on a specific card (RULES-REFERENCE.md §13.8).
 *
 * `viewerId === null` → board view. Target identity is public; the named card
 * type is stripped. `viewerId === stealerId || viewerId === targetId` → full
 * context including card type (see `augmentNopeWindowForPlayer`). Any other
 * viewer sees the public projection (no card type).
 *
 * Rationale for sourcing from `state.pendingNameCard` (not `nopeWindow.pendingAction`):
 * during a nope chain the window's pendingAction briefly becomes a `nope`
 * action while the chain resolves, but `pendingNameCard` remains set until
 * the underlying steal resolves or is Noped-out. Reading from
 * `pendingNameCard` keeps the target's "incoming steal" affordance live
 * across the chain instead of flickering off mid-chain.
 */
function projectNopeWindow(
  state: PlayingState | GameOverState,
  now: number,
  viewerId: string | null,
): NopeWindowView | null {
  if (state.phase !== 'playing' || !state.nopeWindow) return null
  const w = state.nopeWindow
  const base = {
    remainingMs: Math.max(0, w.deadlineMs - now),
    deadlineMs: w.deadlineMs,
    chainDepth: w.chainDepth,
    startedAtMs: w.startedAtMs,
    generation: w.generation,
  }
  const pending = state.pendingNameCard
  if (!pending?.namedCardType) return base

  const canSeeNamed = viewerId !== null &&
    (viewerId === pending.stealerId || viewerId === pending.targetId)
  const namedSteal = canSeeNamed
    ? { stealerId: pending.stealerId, targetPlayerId: pending.targetId, namedCardType: pending.namedCardType }
    : { stealerId: pending.stealerId, targetPlayerId: pending.targetId }
  return { ...base, namedSteal }
}

/**
 * Layer player-private context onto the public board projection of the nope
 * window. Board view deliberately strips `namedCardType`; the player's view
 * adds it back iff the viewer is the stealer or target. Keeps all timing /
 * chain-depth data identical to the board's computation — there's only ever
 * one `now` value per projection pass.
 */
function augmentNopeWindowForPlayer(
  publicWindow: NopeWindowView | null,
  state: PlayingState | GameOverState,
  viewerId: string,
): NopeWindowView | null {
  if (!publicWindow || !publicWindow.namedSteal) return publicWindow
  if (state.phase !== 'playing') return publicWindow
  const pending = state.pendingNameCard
  if (!pending?.namedCardType) return publicWindow
  const canSee = viewerId === pending.stealerId || viewerId === pending.targetId
  if (!canSee) return publicWindow
  return {
    ...publicWindow,
    namedSteal: {
      ...publicWindow.namedSteal,
      namedCardType: pending.namedCardType,
    },
  }
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
 * Three events currently carry a private `cardType`:
 *
 *   - `combo-steal` — stealer and target legitimately know which card
 *     moved (or which card was named on a whiff); everyone else must not.
 *     This is an INTENTIONAL divergence from canonical Exploding Kittens
 *     rules (public naming) to preserve BURNED's spy-agency fiction.
 *     See docs/RULES-REFERENCE.md §13.11.
 *
 *   - `card-drawn` — the drawer needs the type so their phone can show a
 *     `You drew Go Dark.` confirmation toast (PlayerAlert). Nobody else
 *     may know what landed in that hand; the board's event copy is
 *     intentionally generic ("X draws... and lives."). Leaking this was
 *     an E2E audit P0 (2026-04-23): any opponent reading their own event
 *     log could read the drawer's drawn card deterministically.
 *
 *   - `favor-given` — giver and receiver both legitimately know which card
 *     was surrendered (giver picked it; receiver now holds it). Bystanders
 *     and the board must not. Drives the FavorReport hero beat on both
 *     phones (triage #010 Gap C). The empty-handed / Burned-only
 *     auto-resolve case omits cardType entirely (no card moved); no
 *     stripping needed there.
 *
 * Pattern scales to future event-level private fields without changing
 * callers: add a branch, strip if viewer isn't authorized.
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
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { cardType: _strip, ...rest } = event
        return rest
      }
    }
    if (event.type === 'card-drawn' && event.cardType !== undefined) {
      const allowed = viewerId !== null && viewerId === event.playerId
      if (!allowed) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { cardType: _strip, ...rest } = event
        return rest
      }
    }
    if (event.type === 'favor-given' && event.cardType !== undefined) {
      const allowed = viewerId !== null &&
        (viewerId === event.giverId || viewerId === event.receiverId)
      if (!allowed) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { cardType: _strip, ...rest } = event
        return rest
      }
    }
    return event
  })
}

// --- Helpers ---

function projectPlayer(player: Player, isConnected: boolean): BoardPlayer {
  return {
    id: player.id,
    name: player.name,
    color: player.color,
    cardCount: player.hand.length,
    isAlive: player.isAlive,
    isConnected,
  }
}
