import type { CardInstance, SubPhase, GameEvent, CardType, PendingPrompt } from '@shared/types'
import type { ActionType, EngineAction, GameAction } from '@shared/actions'
import { CARD_DEFS, CARD_DEF_BY_TYPE } from '@shared/card-defs'
import type { CardCategory } from '@shared/card-defs'
import { NOPE_WINDOW_MS, DECK_COMPOSITION, TIMING } from '@shared/constants'
import type {
  GameState, LobbyState, PlayingState, GameOverState,
  Player, NopeWindow,
  DispatchContext, DispatchResult, ErrorCode,
} from './types'

// --- Constants ---

const MAX_NOPE_CHAIN = 10

// Event log cap — state.events is now CUMULATIVE across dispatches (the
// clear-on-every-dispatch pattern was dropped so late-joining/reloading
// clients can receive the full session history through a single state
// broadcast). Cap bounds memory and wire size; 500 covers an 8-player
// game (~150-200 events) plus comfortable headroom. Events roll off the
// front once the cap is hit.
const MAX_EVENT_LOG = 500

const ALLOWED_ACTIONS: Record<SubPhase, readonly ActionType[]> = {
  'turn-active': ['play-card', 'draw-card'],
  'defuse-pending': ['defuse-place'],
  'eliminated-check': [],
  'favor-pending': ['favor-give'],
  'future-rearrange-pending': ['future-rearrange'],
  'name-card-pending': ['name-card', 'cancel-name-card'],
}

const COMBO_EXCLUDED_CATEGORIES = new Set<CardCategory>(['burned', 'extraction'])

const CLEAR_PENDING = {
  pendingFavor: undefined,
  pendingFuture: undefined,
  pendingSteal: undefined,
  pendingNameCard: undefined,
  pendingDefuse: undefined,
  pendingPrompt: null as PendingPrompt | null,
} as const

// --- Public API ---

export function createLobbyState(): LobbyState {
  return { phase: 'lobby', players: [], stateVersion: 0, events: [] }
}

export function dispatch(
  state: GameState,
  action: EngineAction,
  ctx: DispatchContext,
): DispatchResult {
  // state.events is CUMULATIVE — we spread the existing events array into
  // the base so handlers' `[...state.events, ...newEvents]` appends append
  // to history. Previously this line set `events: []` which made each
  // dispatch return only its own events, forcing the client to rebuild
  // history via its own accumulator. Reloaded/late-joining clients would
  // then see only the last tick's events. Cumulative semantics put the
  // full log in every broadcast. Cap enforced in ok() / handleStartGame /
  // game-over transition via MAX_EVENT_LOG.
  const base = { ...state }

  // Phase guard: start-game only in lobby
  if (action.type === 'start-game') {
    if (base.phase !== 'lobby') return err(base, 'Can only start game from lobby', 'INVALID_PHASE')
    return handleStartGame(base as LobbyState, action, ctx)
  }

  // All other actions require playing phase
  if (base.phase !== 'playing') return err(base, 'Game is not in playing phase', 'INVALID_PHASE')
  const playing = base as PlayingState

  // Player existence check (server-only actions exempt)
  const actor = playing.players.find(p => p.id === action.playerId)
  if (!actor && action.type !== 'nope-window-expired' && action.type !== 'nope-grace-expired') {
    return err(playing, 'Player not found', 'INVALID_ACTION')
  }

  // nope-window-expired is server-only — transition to grace state (don't resolve yet)
  if (action.type === 'nope-window-expired') {
    if (!playing.nopeWindow) return err(playing, 'No active Nope window', 'NOPE_NOT_ACTIVE')
    if (action.windowGeneration !== playing.nopeWindow.generation) {
      return err(playing, 'Stale Nope window generation', 'NOPE_NOT_ACTIVE')
    }
    if (playing.nopeWindow.expired) {
      return err(playing, 'Nope window already in grace', 'NOPE_NOT_ACTIVE')
    }
    // Transition to grace state — window remains active for 300ms more
    const graceState: PlayingState = {
      ...playing,
      nopeWindow: {
        ...playing.nopeWindow,
        expired: true,
        graceDeadlineMs: ctx.now + TIMING.NOPE_GRACE_MS,
      },
    }
    return ok(graceState)
  }

  // nope-grace-expired is server-only — NOW resolve the window
  if (action.type === 'nope-grace-expired') {
    if (!playing.nopeWindow) return err(playing, 'No active Nope window', 'NOPE_NOT_ACTIVE')
    if (action.windowGeneration !== playing.nopeWindow.generation) {
      return err(playing, 'Stale Nope window generation', 'NOPE_NOT_ACTIVE')
    }
    if (!playing.nopeWindow.expired) {
      return err(playing, 'Nope window not in grace state', 'INVALID_ACTION')
    }
    return handleNopeWindowExpired(playing, action, ctx)
  }

  // Dead players cannot act
  if (actor && !actor.isAlive) return err(playing, 'Dead players cannot act', 'INVALID_ACTION')

  // Nope is special — anyone can play it when window is active
  if (action.type === 'nope') {
    return handleNope(playing, action, ctx)
  }

  // While a Nope window is open, only Nope (handled above) and server-only timeout
  // actions (handled earlier) may resolve. Without this guard, the current player
  // could play a second card or draw, overwriting the pending window and silently
  // dropping the first card's effect.
  if (playing.nopeWindow !== null) {
    return err(playing, 'Cannot act while Nope window is open', 'INVALID_ACTION')
  }

  // Turn order check (current player only for all other actions)
  // Exception: favor-give is sent by the target, not the current player
  if (action.type === 'favor-give') {
    if (!playing.pendingFavor || playing.pendingFavor.targetId !== action.playerId) {
      return err(playing, 'You are not the favor target', 'NOT_YOUR_TURN')
    }
  } else if (playing.currentTurn.currentPlayerId !== action.playerId) {
    return err(playing, 'Not your turn', 'NOT_YOUR_TURN')
  }

  // Action whitelist check
  const allowed = ALLOWED_ACTIONS[playing.subPhase]
  if (!allowed.includes(action.type)) {
    return err(playing, `Action '${action.type}' not allowed during '${playing.subPhase}'`, 'INVALID_ACTION')
  }

  switch (action.type) {
    case 'play-card': return handlePlayCard(playing, action, ctx)
    case 'draw-card': return handleDrawCard(playing, action, ctx)
    case 'defuse-place': return handleDefusePlace(playing, action, ctx)
    case 'favor-give': return handleFavorGive(playing, action, ctx)
    case 'future-rearrange': return handleFutureRearrange(playing, action, ctx)
    case 'name-card': return handleNameCard(playing, action, ctx)
    case 'cancel-name-card': return handleCancelNameCard(playing, action, ctx)
    default: return err(playing, `Unknown action type`, 'INVALID_ACTION')
  }
}

// --- Start Game ---

function handleStartGame(
  lobby: LobbyState,
  _action: EngineAction,
  ctx: DispatchContext,
): DispatchResult {
  if (lobby.players.length < 2) return err(lobby, 'Need at least 2 players', 'INVALID_ACTION')
  if (lobby.players.length > 10) return err(lobby, 'Maximum 10 players', 'INVALID_ACTION')

  const playerCount = lobby.players.length
  const deck = buildDeck(playerCount, ctx)

  // Separate defuses from other cards (deck has no Burned cards — buildDeck excludes them)
  const defuses = deck.filter(c => c.type === 'extraction')
  const others = deck.filter(c => c.type !== 'extraction')

  // Each player gets 1 Defuse
  const playerDefuses = defuses.slice(0, playerCount)
  const remainingDefuses = defuses.slice(playerCount)

  // Shuffle others for dealing
  const shuffled = fisherYatesShuffle([...others], ctx)

  // Deal 7 cards to each player
  const players: Player[] = lobby.players.map((lp, i) => ({
    id: lp.id,
    name: lp.name,
    color: lp.color,
    hand: [playerDefuses[i]!, ...shuffled.slice(i * 7, (i + 1) * 7)],
    isAlive: true,
    deadCards: [],
  }))

  // Remaining deck: undealt cards + remaining defuses
  const dealtCount = playerCount * 7
  let drawPile = [...shuffled.slice(dealtCount), ...remainingDefuses]

  // Insert N-1 Burned cards (created fresh, not from buildDeck)
  const eksToInsert = playerCount - 1
  for (let i = 0; i < eksToInsert; i++) {
    drawPile.push({ id: crypto.randomUUID(), type: 'burned' as CardType })
  }

  // Final shuffle of draw pile
  drawPile = fisherYatesShuffle(drawPile, ctx)

  const firstPlayer = players[0]!
  const events: GameEvent[] = [
    { type: 'game-started', playerCount },
    { type: 'turn-started', playerId: firstPlayer.id, turnsRemaining: 1 },
  ]

  const state: PlayingState = {
    phase: 'playing',
    subPhase: 'turn-active',
    players,
    drawPile,
    discardPile: [],
    currentTurn: { currentPlayerId: firstPlayer.id, turnsRemaining: 1 },
    nopeWindow: null,
    stateVersion: lobby.stateVersion + 1,
    events,
    pendingPrompt: null,
    nextNopeGeneration: 1,
  }

  return { ok: true, state, events }
}

// --- Build Deck ---

export function buildDeck(playerCount: number, _ctx: DispatchContext): CardInstance[] {
  const cards: CardInstance[] = []

  for (const def of CARD_DEFS) {
    // Burned cards excluded — startGame creates N-1 directly
    if (def.category === 'burned') continue

    const count = getCountForPlayerCount(def, playerCount)
    for (let i = 0; i < count; i++) {
      cards.push({ id: crypto.randomUUID(), type: def.type })
    }
  }

  return cards
}

function getCountForPlayerCount(def: typeof CARD_DEFS[number], playerCount: number): number {
  if (playerCount <= DECK_COMPOSITION.small.max) {
    return def.pawCount
  } else if (playerCount <= DECK_COMPOSITION.medium.max) {
    return def.nonPawCount
  } else {
    return def.pawCount + def.nonPawCount
  }
}

// --- Card Effect Handlers ---

function handlePlayCard(
  state: PlayingState,
  action: EngineAction & { type: 'play-card' },
  ctx: DispatchContext,
): DispatchResult {
  const { cardIds } = action
  if (cardIds.length === 0 || cardIds.length > 3) {
    return err(state, 'Must play 1-3 cards', 'INVALID_COMBO')
  }
  const player = getPlayer(state, action.playerId)
  if (!player) return err(state, 'Player not found', 'INVALID_ACTION')

  // Validate all cards exist in hand and are unique
  if (new Set(cardIds).size !== cardIds.length) {
    return err(state, 'Duplicate card IDs', 'INVALID_COMBO')
  }
  const cards = cardIds.map(id => player.hand.find(c => c.id === id))
  if (cards.some(c => !c)) return err(state, 'Card not in hand', 'CARD_NOT_IN_HAND')
  const validCards = cards as CardInstance[]

  // Cannot use Burned or Extraction in combos
  if (validCards.some(c => COMBO_EXCLUDED_CATEGORIES.has(CARD_DEF_BY_TYPE[c.type].category))) {
    return err(state, 'Cannot use Burned or Extraction in combos', 'INVALID_COMBO')
  }

  if (validCards.length === 1) {
    return handleSingleCard(state, action, validCards[0]!, ctx)
  } else if (validCards.length === 2) {
    return handleCombo(state, action, validCards, 2, ctx)
  } else if (validCards.length === 3) {
    return handleCombo(state, action, validCards, 3, ctx)
  }

  return err(state, 'Invalid number of cards played', 'INVALID_COMBO')
}

function handleSingleCard(
  state: PlayingState,
  action: EngineAction & { type: 'play-card' },
  card: CardInstance,
  ctx: DispatchContext,
): DispatchResult {
  const cardDef = CARD_DEF_BY_TYPE[card.type]

  // Operative cards and Agent X cannot be played alone
  if (cardDef.category === 'operative' || cardDef.category === 'wild') {
    return err(state, 'Operative cards can only be played in combos', 'INVALID_ACTION')
  }

  // Intercepted (Nope) is a REACTIVE interrupt only — never a proactive
  // turn-phase play. The client validator (combo-validation.ts) blocks
  // this, but a malicious/buggy client bypassing the client-side guard
  // could previously reach here, get the card stripped from hand and
  // discarded, open a Nope window, then error on resolution (in
  // applyCardEffect) with the card permanently lost. Zero-trust: server
  // must mirror the client validator. E2E audit 2026-04-23 A-01.
  if (card.type === 'intercepted') {
    return err(state, 'Intercepted cannot be played alone — it is a reactive interrupt', 'INVALID_ACTION')
  }

  // Remove card from hand, add to discard
  let newState = removeCardsFromHand(state, action.playerId, [card.id])
  newState = addToDiscard(newState, [card])

  // Direct Order's narrative beat is "ACTOR picked TARGET on purpose" —
  // observers need to know who was targeted DURING the nope window so the
  // chosen-vs-defaulted distinction lands (vs Reassign, which defaults to
  // next-in-rotation). Surfaced by triage 031 + 032 (run 2026-05-08-2022-5p):
  // observer toast and TV side both showed only the card name, leaving the
  // target unknown until `turn-started` fired AFTER the window closed.
  // `targetId` on `card-played` is additive (optional in the event type),
  // so old clients that don't read the field still parse the event cleanly.
  const cardPlayed: GameEvent =
    card.type === 'direct-order' && action.targetPlayerId !== undefined
      ? { type: 'card-played', playerId: action.playerId, cardType: card.type, targetId: action.targetPlayerId }
      : { type: 'card-played', playerId: action.playerId, cardType: card.type }
  const events: GameEvent[] = [cardPlayed]

  // All single-card plays open a nope window
  const { window: nopeWindow, nextGen } = createNopeWindow(
    newState,
    { type: 'play-card', cardIds: action.cardIds, targetPlayerId: action.targetPlayerId },
    action.playerId,
    state.players.filter(p => p.isAlive).length,
    ctx,
    card.type,
  )
  // Clear pendingFuture before opening the new nope window — a prior Intel
  // Briefing peek must not bleed into a subsequent card's window. Without
  // this clear, playing Falsify Intel after Intel Briefing on the same turn
  // leaves the actor's phone showing the prior peek's "Intel Briefing"
  // dialog throughout Falsify Intel's nope window (close 05-08-2022-5p
  // #030). applyAlterTheFuture re-reads `state.drawPile.slice(0, 3)` fresh
  // when Falsify Intel resolves cleanly, so no functional dependency on
  // the carried-over value.
  const withNope: PlayingState = {
    ...newState,
    pendingFuture: undefined,
    nopeWindow,
    nextNopeGeneration: nextGen,
    events: [...newState.events, ...events],
  }
  return ok(withNope)
}

function applyCardEffect(
  state: PlayingState,
  cardType: CardType,
  action: EngineAction & { type: 'play-card' },
  events: GameEvent[],
  ctx: DispatchContext,
): DispatchResult {
  switch (cardType) {
    case 'reassign': return applyAttack(state, action, events)
    case 'direct-order': return applyTargetedAttack(state, action, events)
    case 'go-dark': return applySkip(state, action, events)
    case 'intel-briefing': return applySeeTheFuture(state, action, events)
    case 'falsify-intel': return applyAlterTheFuture(state, action, events)
    case 'burn-the-files': return applyShuffle(state, action, events, ctx)
    case 'back-channel': return applyDrawFromBottom(state, action, events, ctx)
    case 'call-in-a-favor': return applyFavor(state, action, events)
    case 'intercepted': return err(state, 'Intercepted handled separately', 'INVALID_ACTION')
    default: return err(state, `No effect for card type '${cardType}'`, 'INVALID_ACTION')
  }
}

// --- Individual Card Effects ---

function applyAttack(
  state: PlayingState,
  _action: EngineAction,
  events: GameEvent[],
): DispatchResult {
  const nextPlayer = getNextAlivePlayer(state, state.currentTurn.currentPlayerId)
  if (!nextPlayer) return err(state, 'No next player', 'INVALID_ACTION')

  // Per rules §10.2: new_target_turns = victim's remaining turns AFTER the
   // current one + 2. The current turn is consumed by the attack play itself
   // (turn-ending without draw), so only the turns the attacker had not yet
   // started travel to the target, then +2 for the base Attack effect.
   //   Normal turn (turnsRemaining=1) → target gets 0 + 2 = 2
   //   Turn 1 of 2 attacked (turnsRemaining=2) → target gets 1 + 2 = 3
   //   Turn 2 of 2 attacked (turnsRemaining=1) → target gets 0 + 2 = 2
  const newTurns = (state.currentTurn.turnsRemaining - 1) + 2
  const newState: PlayingState = {
    ...state,
    ...CLEAR_PENDING,
    subPhase: 'turn-active',
    currentTurn: { currentPlayerId: nextPlayer.id, turnsRemaining: newTurns },
    nopeWindow: null,
    events: [...state.events, ...events,
      { type: 'turn-started', playerId: nextPlayer.id, turnsRemaining: newTurns },
    ],
  }
  return ok(newState)
}

function applyTargetedAttack(
  state: PlayingState,
  action: EngineAction & { type: 'play-card' },
  events: GameEvent[],
): DispatchResult {
  const { targetPlayerId } = action
  if (!targetPlayerId) return err(state, 'Targeted Attack requires a target', 'INVALID_TARGET')

  const target = state.players.find(p => p.id === targetPlayerId && p.isAlive)
  if (!target) return err(state, 'Invalid target player', 'INVALID_TARGET')
  // Self-target allowed per rules §13.8 — pointless, but legal and funny.

  // Per rules §10.2: new_target_turns = victim's remaining turns AFTER the
   // current one + 2. The current turn is consumed by the attack play itself
   // (turn-ending without draw), so only the turns the attacker had not yet
   // started travel to the target, then +2 for the base Attack effect.
   //   Normal turn (turnsRemaining=1) → target gets 0 + 2 = 2
   //   Turn 1 of 2 attacked (turnsRemaining=2) → target gets 1 + 2 = 3
   //   Turn 2 of 2 attacked (turnsRemaining=1) → target gets 0 + 2 = 2
  const newTurns = (state.currentTurn.turnsRemaining - 1) + 2
  const newState: PlayingState = {
    ...state,
    ...CLEAR_PENDING,
    subPhase: 'turn-active',
    currentTurn: { currentPlayerId: targetPlayerId, turnsRemaining: newTurns },
    nopeWindow: null,
    events: [...state.events, ...events,
      { type: 'turn-started', playerId: targetPlayerId, turnsRemaining: newTurns },
    ],
  }
  return ok(newState)
}

function applySkip(
  state: PlayingState,
  _action: EngineAction,
  events: GameEvent[],
): DispatchResult {
  const remaining = state.currentTurn.turnsRemaining - 1

  if (remaining > 0) {
    const newState: PlayingState = {
      ...state,
      ...CLEAR_PENDING,
      subPhase: 'turn-active',
      currentTurn: { ...state.currentTurn, turnsRemaining: remaining },
      nopeWindow: null,
      events: [...state.events, ...events],
    }
    return ok(newState)
  }

  return advanceTurn(state, events)
}

function applySeeTheFuture(
  state: PlayingState,
  action: EngineAction,
  events: GameEvent[],
): DispatchResult {
  const topCards = state.drawPile.slice(0, 3)
  const newState: PlayingState = {
    ...state,
    pendingFuture: { playerId: action.playerId, cardIds: topCards.map(c => c.id) },
    nopeWindow: null,
    events: [...state.events, ...events,
      { type: 'future-peeked', playerId: action.playerId },
    ],
  }
  return ok(newState)
}

function applyAlterTheFuture(
  state: PlayingState,
  action: EngineAction,
  events: GameEvent[],
): DispatchResult {
  const topCards = state.drawPile.slice(0, 3)
  const cardIds = topCards.map(c => c.id)
  const newState: PlayingState = {
    ...state,
    subPhase: 'future-rearrange-pending',
    pendingFuture: { playerId: action.playerId, cardIds },
    pendingPrompt: { type: 'future-rearrange', playerId: action.playerId, cardIds },
    nopeWindow: null,
    events: [...state.events, ...events],
  }
  return ok(newState)
}

function applyShuffle(
  state: PlayingState,
  action: EngineAction,
  events: GameEvent[],
  ctx: DispatchContext,
): DispatchResult {
  const shuffled = fisherYatesShuffle([...state.drawPile], ctx)
  const newState: PlayingState = {
    ...state,
    drawPile: shuffled,
    // Shuffling invalidates any prior Intel Briefing peek — the IDs in
    // pendingFuture no longer point at the current top 3. Clear it so
    // Falsify Intel can't rearrange against stale IDs.
    pendingFuture: undefined,
    nopeWindow: null,
    events: [...state.events, ...events,
      { type: 'deck-shuffled', playerId: action.playerId },
    ],
  }
  return ok(newState)
}

function applyDrawFromBottom(
  state: PlayingState,
  action: EngineAction,
  events: GameEvent[],
  ctx: DispatchContext,
): DispatchResult {
  // Draw from bottom triggers immediately (card auto-plays + draws)
  return performDraw(state, action.playerId, 'bottom', events, ctx)
}

function applyFavor(
  state: PlayingState,
  action: EngineAction & { type: 'play-card' },
  events: GameEvent[],
): DispatchResult {
  const { targetPlayerId } = action
  if (!targetPlayerId) return err(state, 'Favor requires a target', 'INVALID_TARGET')
  if (targetPlayerId === action.playerId) return err(state, 'Cannot target yourself', 'INVALID_TARGET')

  const target = state.players.find(p => p.id === targetPlayerId && p.isAlive)
  if (!target) return err(state, 'Invalid target player', 'INVALID_TARGET')

  // Empty-handed or EK-only target: resolve with no transfer
  const giveableCards = target.hand.filter(c => c.type !== 'burned')
  if (giveableCards.length === 0) {
    const newState: PlayingState = {
      ...state,
      nopeWindow: null,
      events: [...state.events, ...events,
        { type: 'favor-requested', requesterId: action.playerId, targetId: targetPlayerId },
        { type: 'favor-given', giverId: targetPlayerId, receiverId: action.playerId },
      ],
    }
    return ok(newState)
  }

  const newState: PlayingState = {
    ...state,
    subPhase: 'favor-pending',
    pendingFavor: { requesterId: action.playerId, targetId: targetPlayerId },
    pendingPrompt: { type: 'favor-response', playerId: targetPlayerId, requesterId: action.playerId },
    nopeWindow: null,
    events: [...state.events, ...events,
      { type: 'favor-requested', requesterId: action.playerId, targetId: targetPlayerId },
    ],
  }
  return ok(newState)
}

// --- Combo Handlers ---

function handleCombo(
  state: PlayingState,
  action: EngineAction & { type: 'play-card' },
  cards: CardInstance[],
  comboSize: 2 | 3,
  _ctx: DispatchContext,
): DispatchResult {
  if (!isValidCombo(cards, comboSize)) {
    const label = comboSize === 2 ? 'Two of a Kind' : 'Three of a Kind'
    return err(state, `Cards must match for ${label} (Feral Cat substitutes for cat types only)`, 'INVALID_COMBO')
  }

  const { targetPlayerId } = action
  if (!targetPlayerId) return err(state, 'Combo requires a target', 'INVALID_TARGET')
  if (targetPlayerId === action.playerId) return err(state, 'Cannot target yourself', 'INVALID_TARGET')
  const target = state.players.find(p => p.id === targetPlayerId && p.isAlive)
  if (!target) return err(state, 'Invalid target player', 'INVALID_TARGET')

  // 3-of-a-kind: defer discard + nope until the stealer commits a name.
  // Cards stay in hand so "cancel" at the name-card prompt is a true
  // "I changed my mind" — hand is returned untouched. The nope window
  // opens AFTER the name so defenders can respond with full context
  // (stealer + target + demanded card type).
  if (comboSize === 3) {
    const nameCardState: PlayingState = {
      ...state,
      subPhase: 'name-card-pending',
      pendingNameCard: {
        stealerId: action.playerId,
        targetId: targetPlayerId,
        cardIds: cards.map(c => c.id),
      },
      pendingPrompt: { type: 'name-card', playerId: action.playerId, targetId: targetPlayerId },
    }
    return ok(nameCardState)
  }

  // 2-of-a-kind: cards commit immediately (no name step to cancel into),
  // nope window opens with target locked in.
  let newState = removeCardsFromHand(state, action.playerId, cards.map(c => c.id))
  newState = addToDiscard(newState, cards)

  // 2026-05-10: emit targetId on the pair card-played event so observers
  // (especially the TARGET) can read who's losing a card during the nope
  // window. Mirrors the Direct Order fix at line ~330 (cluster E close
  // 05-08-2022-5p #032). Without this the target only sees "Dash played a
  // Vera Khan pair" and has no idea they're the steal target until the
  // window resolves.
  const events: GameEvent[] = [
    { type: 'card-played', playerId: action.playerId, cardType: cards[0]!.type, comboSize, targetId: targetPlayerId },
  ]

  const { window: nopeWindow, nextGen } = createNopeWindow(
    newState,
    { type: 'play-card', cardIds: action.cardIds, targetPlayerId },
    action.playerId,
    state.players.filter(p => p.isAlive).length,
    _ctx,
  )

  const withNope: PlayingState = {
    ...newState,
    pendingSteal: { stealerId: action.playerId, targetPlayerId, comboSize },
    nopeWindow,
    nextNopeGeneration: nextGen,
    events: [...newState.events, ...events],
  }
  return ok(withNope)
}

function isValidCombo(cards: CardInstance[], size: number): boolean {
  if (cards.length !== size) return false

  // All cards must be combo-eligible (not EK, not Defuse)
  if (cards.some(c => COMBO_EXCLUDED_CATEGORIES.has(CARD_DEF_BY_TYPE[c.type].category))) return false

  // Check matching: all same type, or Agent X substitution
  const types = cards.map(c => c.type)
  const nonWildTypes = types.filter(t => t !== 'agent-x')

  // All Agent X: valid combo
  if (nonWildTypes.length === 0) return true

  // All non-wilds must be same type
  const baseType = nonWildTypes[0]!
  if (!nonWildTypes.every(t => t === baseType)) return false

  // Agent X can only substitute for operative types (operative + wild categories)
  const hasWildSubstitution = types.some(t => t === 'agent-x')
  if (hasWildSubstitution) {
    const baseDef = CARD_DEF_BY_TYPE[baseType]
    if (baseDef.category !== 'operative' && baseDef.category !== 'wild') return false
  }

  return true
}

// --- Draw Handlers ---

function handleDrawCard(
  state: PlayingState,
  action: EngineAction,
  ctx: DispatchContext,
): DispatchResult {
  return performDraw(state, action.playerId, 'top', [], ctx)
}

function performDraw(
  state: PlayingState,
  playerId: string,
  from: 'top' | 'bottom',
  extraEvents: GameEvent[],
  _ctx: DispatchContext,
): DispatchResult {
  if (state.drawPile.length === 0) {
    return err(state, 'Draw pile is empty', 'INVALID_ACTION')
  }

  const drawPile = [...state.drawPile]
  const drawnCard = from === 'top' ? drawPile.shift()! : drawPile.pop()!

  // Check for Burned card
  if (drawnCard.type === 'burned') {
    const player = getPlayer(state, playerId)!
    const hasDefuse = player.hand.some(c => c.type === 'extraction')

    const events: GameEvent[] = [
      ...extraEvents,
      { type: 'burned-drawn', playerId },
    ]

    if (hasDefuse) {
      // Auto-play Defuse, enter defuse-pending for placement
      const defuseCard = player.hand.find(c => c.type === 'extraction')!
      let newState: PlayingState = { ...state, drawPile }
      newState = removeCardsFromHand(newState, playerId, [defuseCard.id])
      newState = addToDiscard(newState, [defuseCard])

      const finalState: PlayingState = {
        ...newState,
        subPhase: 'defuse-pending',
        pendingDefuse: { playerId },
        pendingPrompt: { type: 'defuse', playerId },
        nopeWindow: null,
        events: [...newState.events, ...events, { type: 'extraction-played', playerId }],
      }
      // Keep the Burned card in hand temporarily for placement
      const playerWithEk = addCardsToHand(finalState, playerId, [drawnCard])
      return ok(playerWithEk)
    }

    // No Defuse — eliminated
    return eliminatePlayer({ ...state, drawPile }, playerId, [...state.events, ...events])
  }

  // Safe draw
  let newState: PlayingState = { ...state, drawPile }
  newState = addCardsToHand(newState, playerId, [drawnCard])

  const events: GameEvent[] = [
    ...extraEvents,
    { type: 'card-drawn', playerId, safe: true, cardType: drawnCard.type },
  ]

  // Consume one turn
  const remaining = state.currentTurn.turnsRemaining - 1
  if (remaining > 0) {
    // Clear pending state (e.g. pendingFuture from a prior Intel Briefing peek)
    // so the peek doesn't leak into the next Attack turn of the same player.
    const finalState: PlayingState = {
      ...newState,
      ...CLEAR_PENDING,
      currentTurn: { ...state.currentTurn, turnsRemaining: remaining },
      nopeWindow: null,
      events: [...newState.events, ...events],
    }
    return ok(finalState)
  }

  return advanceTurn({ ...newState, events: [...newState.events, ...events] }, events)
}

// --- Defuse Handler ---

function handleDefusePlace(
  state: PlayingState,
  action: EngineAction & { type: 'defuse-place' },
  _ctx: DispatchContext,
): DispatchResult {
  if (!state.pendingDefuse || state.pendingDefuse.playerId !== action.playerId) {
    return err(state, 'No pending defuse for you', 'INVALID_ACTION')
  }

  const { position } = action
  if (position < 0 || position > state.drawPile.length) {
    return err(state, `Position must be 0 to ${state.drawPile.length}`, 'INVALID_POSITION')
  }

  // Find Burned card in player's hand (was temporarily placed there)
  const player = getPlayer(state, action.playerId)!
  const burned = player.hand.find(c => c.type === 'burned')
  if (!burned) return err(state, 'No Burned card in hand', 'INVALID_ACTION')

  // Remove Burned card from hand
  let newState = removeCardsFromHand(state, action.playerId, [burned.id])

  // Insert Burned card into draw pile at position
  const newDrawPile = [...newState.drawPile]
  newDrawPile.splice(position, 0, burned)

  const remaining = state.currentTurn.turnsRemaining - 1
  newState = {
    ...newState,
    drawPile: newDrawPile,
    pendingDefuse: undefined,
  }

  if (remaining > 0) {
    const finalState: PlayingState = {
      ...newState,
      subPhase: 'turn-active',
      pendingPrompt: null,
      currentTurn: { ...state.currentTurn, turnsRemaining: remaining },
      events: newState.events,
    }
    return ok(finalState)
  }

  return advanceTurn({ ...newState, subPhase: 'turn-active' }, [])
}

// --- Favor Handler ---

function handleFavorGive(
  state: PlayingState,
  action: EngineAction & { type: 'favor-give' },
  _ctx: DispatchContext,
): DispatchResult {
  const pending = state.pendingFavor
  if (!pending) return err(state, 'No pending favor', 'INVALID_ACTION')

  const giver = getPlayer(state, pending.targetId)!
  const card = giver.hand.find(c => c.id === action.cardId)
  if (!card) return err(state, 'Card not in your hand', 'CARD_NOT_IN_HAND')

  // Cannot gift Burned card
  if (card.type === 'burned') {
    return err(state, 'Cannot give away a Burned card', 'INVALID_ACTION')
  }

  let newState = removeCardsFromHand(state, pending.targetId, [card.id])
  newState = addCardsToHand(newState, pending.requesterId, [card])

  const events: GameEvent[] = [
    { type: 'favor-given', giverId: pending.targetId, receiverId: pending.requesterId, cardType: card.type },
  ]

  const finalState: PlayingState = {
    ...newState,
    subPhase: 'turn-active',
    pendingFavor: undefined,
    pendingPrompt: null,
    events: [...newState.events, ...events],
  }
  return ok(finalState)
}

// --- Future Rearrange Handler ---

function handleFutureRearrange(
  state: PlayingState,
  action: EngineAction & { type: 'future-rearrange' },
  _ctx: DispatchContext,
): DispatchResult {
  const pending = state.pendingFuture
  if (!pending) return err(state, 'No pending future rearrangement', 'INVALID_ACTION')

  const { order } = action
  const expectedIds = pending.cardIds

  // Validate exact permutation
  if (order.length !== expectedIds.length) {
    return err(state, 'Must rearrange exactly the peeked cards', 'INVALID_ACTION')
  }
  const orderSet = new Set(order)
  const expectedSet = new Set(expectedIds)
  if (orderSet.size !== order.length || ![...orderSet].every(id => expectedSet.has(id))) {
    return err(state, 'Submitted order must be an exact permutation of peeked cards', 'INVALID_ACTION')
  }

  // Rearrange top of draw pile
  const topN = order.length
  const remaining = state.drawPile.slice(topN)
  const reordered = order.map(id => state.drawPile.find(c => c.id === id)!)
  const newDrawPile = [...reordered, ...remaining]

  const events: GameEvent[] = [
    { type: 'future-rearranged', playerId: action.playerId },
  ]

  const newState: PlayingState = {
    ...state,
    subPhase: 'turn-active',
    drawPile: newDrawPile,
    pendingFuture: undefined,
    pendingPrompt: null,
    events: [...state.events, ...events],
  }
  return ok(newState)
}

// --- Name Card (Three of a Kind) ---

function handleNameCard(
  state: PlayingState,
  action: EngineAction & { type: 'name-card' },
  ctx: DispatchContext,
): DispatchResult {
  const pending = state.pendingNameCard
  if (!pending) return err(state, 'No pending name card', 'INVALID_ACTION')
  if (pending.namedCardType !== undefined) {
    return err(state, 'Name already committed', 'INVALID_ACTION')
  }

  // Pull the staged combo cards out of the stealer's hand and commit them
  // to discard. This is the point of no return — cancellation is now closed.
  const stealer = getPlayer(state, pending.stealerId)
  if (!stealer) return err(state, 'Stealer not found', 'INVALID_ACTION')
  const cards = pending.cardIds
    .map(id => stealer.hand.find(c => c.id === id))
    .filter((c): c is CardInstance => c !== undefined)
  if (cards.length !== pending.cardIds.length) {
    return err(state, 'Staged combo cards missing from hand', 'CARD_NOT_IN_HAND')
  }

  let newState = removeCardsFromHand(state, pending.stealerId, [...pending.cardIds])
  newState = addToDiscard(newState, cards)

  // 2026-05-10: same target-on-card-played contract as the pair path
  // above — the triple commit also surfaces the target so observers and
  // the target see who's about to lose a named card during the nope
  // window. The named cardType is private (DM via the engine's named-
  // steal flow), but the target identity is public.
  const events: GameEvent[] = [
    { type: 'card-played', playerId: pending.stealerId, cardType: cards[0]!.type, comboSize: 3, targetId: pending.targetId },
  ]

  // Nope window opens NOW with the full context — stealer, target, AND the
  // named card type — so defenders can decide whether this specific demand
  // is worth burning an Intercept on.
  const { window: nopeWindow, nextGen } = createNopeWindow(
    newState,
    {
      type: 'play-card',
      cardIds: [...pending.cardIds],
      targetPlayerId: pending.targetId,
      namedCardType: action.cardType,
    },
    pending.stealerId,
    state.players.filter(p => p.isAlive).length,
    ctx,
  )

  const withNope: PlayingState = {
    ...newState,
    pendingNameCard: { ...pending, namedCardType: action.cardType },
    // Prompt closes the stealer's name-card sheet — the name is committed,
    // now everyone waits on the nope window. Keeping the prompt open here
    // would leave the sheet blocking the stealer's view of their own play.
    pendingPrompt: null,
    nopeWindow,
    nextNopeGeneration: nextGen,
    events: [...newState.events, ...events],
  }
  return ok(withNope)
}

function handleCancelNameCard(
  state: PlayingState,
  action: EngineAction & { type: 'cancel-name-card' },
  _ctx: DispatchContext,
): DispatchResult {
  const pending = state.pendingNameCard
  if (!pending) return err(state, 'No pending name card', 'INVALID_ACTION')
  if (pending.stealerId !== action.playerId) {
    return err(state, 'Only the stealer can cancel', 'INVALID_ACTION')
  }
  // Post-commit cancellation is closed: once a name is submitted, the combo
  // cards are in discard and the nope window is open. The play is now public
  // and irreversible — opponents may already be chaining Nope-on-Nope.
  if (pending.namedCardType !== undefined || state.nopeWindow !== null) {
    return err(state, 'Cannot cancel after a name has been committed', 'INVALID_ACTION')
  }

  const events: GameEvent[] = [
    { type: 'name-card-cancelled', stealerId: pending.stealerId, targetId: pending.targetId },
  ]

  // Cards were never removed from the stealer's hand — pre-commit cancel is
  // a true "changed my mind": hand returns to its exact state before play.
  const finalState: PlayingState = {
    ...state,
    subPhase: 'turn-active',
    pendingNameCard: undefined,
    pendingPrompt: null,
    events: [...state.events, ...events],
  }
  return ok(finalState)
}

// --- Nope Handling ---

function handleNope(
  state: PlayingState,
  action: EngineAction,
  ctx: DispatchContext,
): DispatchResult {
  if (!state.nopeWindow) return err(state, 'No active Nope window', 'NOPE_NOT_ACTIVE')

  // Stale-generation guard — D-03 race fix. When two players tap Nope
  // within the same network round-trip, the second arrival would
  // otherwise land as an un-intended counter-Nope at chainDepth+1.
  // The client echoes the window generation it was acting on; if the
  // server has already advanced (because another player's Nope landed
  // first), reject with NOPE_NOT_ACTIVE so the late tapper's UI can
  // surface "too late" instead of silently counter-Noping. Must appear
  // BEFORE the grace check because stale gen during grace is also wrong.
  if (action.type === 'nope' && action.windowGeneration !== state.nopeWindow.generation) {
    return err(state, 'Nope window generation has advanced', 'NOPE_STALE_GENERATION')
  }

  // Accept Nopes during grace period (window.expired === true but grace not yet expired)
  if (state.nopeWindow.expired && state.nopeWindow.graceDeadlineMs && ctx.now > state.nopeWindow.graceDeadlineMs) {
    return err(state, 'Nope grace period expired', 'NOPE_NOT_ACTIVE')
  }

  // Self-Nope disallowed — cannot Nope your own action
  if (state.nopeWindow.chainDepth === 0 && action.playerId === state.nopeWindow.originalPlayerId) {
    return err(state, 'Cannot Nope your own action', 'INVALID_ACTION')
  }

  // Self-Nope of own Nope disallowed (chainDepth >= 1) — same rule. Per
  // RULES-REFERENCE.md §9: "you cannot Nope your own card play." A noper
  // who just played the most recent Nope on the chain cannot Nope it
  // themselves on the next step (would be self-undoing). Original ACTOR
  // chain-burn is still allowed because the actor is Noping the OTHER
  // player's Nope, not their own. Closes the gap caught 2026-05-10.
  if (state.nopeWindow.chainDepth >= 1 && state.nopeWindow.lastNoperId === action.playerId) {
    return err(state, 'Cannot Nope your own Nope', 'INVALID_ACTION')
  }

  if (state.nopeWindow.chainDepth >= MAX_NOPE_CHAIN) {
    return err(state, 'Maximum Nope chain depth reached', 'MAX_CHAIN_DEPTH')
  }

  // Validate player has a Nope card
  const player = getPlayer(state, action.playerId)
  if (!player) return err(state, 'Player not found', 'INVALID_ACTION')

  const nopeCard = player.hand.find(c => c.type === 'intercepted')
  if (!nopeCard) return err(state, 'No Nope card in hand', 'CARD_NOT_IN_HAND')

  // Remove Nope from hand, add to discard
  let newState = removeCardsFromHand(state, action.playerId, [nopeCard.id])
  newState = addToDiscard(newState, [nopeCard])

  const newDepth = state.nopeWindow.chainDepth + 1
  const aliveCount = state.players.filter(p => p.isAlive).length

  const events: GameEvent[] = [
    { type: 'nope-played', playerId: action.playerId, chainDepth: newDepth },
  ]

  // Reset timer with full duration + new generation (invalidates stale timers, clears grace)
  const gen = state.nextNopeGeneration
  const newWindow: NopeWindow = {
    ...state.nopeWindow,
    chainDepth: newDepth,
    generation: gen,
    deadlineMs: ctx.now + getNopeWindowDuration(ctx, aliveCount),
    startedAtMs: ctx.now,
    expired: undefined,
    graceDeadlineMs: undefined,
    // Track the noper for the next-step self-Nope check. Per
    // RULES-REFERENCE.md §9 the noper cannot Nope their own Nope on the
    // following step (would be a self-undo, treated as Noping your own
    // card play).
    lastNoperId: action.playerId,
  }

  const finalState: PlayingState = {
    ...newState,
    nopeWindow: newWindow,
    nextNopeGeneration: gen + 1,
    events: [...newState.events, ...events],
  }
  return ok(finalState)
}

function handleNopeWindowExpired(
  state: PlayingState,
  _action: EngineAction,
  ctx: DispatchContext,
): DispatchResult {
  if (!state.nopeWindow) return err(state, 'No active Nope window', 'NOPE_NOT_ACTIVE')

  const { chainDepth, pendingAction, originalPlayerId } = state.nopeWindow
  const cancelled = chainDepth % 2 === 1

  const events: GameEvent[] = [
    { type: 'nope-window-resolved', cancelled, chainDepth },
  ]

  // Named-steal resolution takes priority over all other branches — the
  // nope window that just closed was opened AFTER the name commit, so the
  // pending action is "perform steal of <namedCardType>" (or whiff).
  // Cards already moved to discard at name-commit time regardless of outcome,
  // matching tabletop semantics ("a Noped combo still goes to discard").
  if (state.pendingNameCard?.namedCardType) {
    const { stealerId, targetId, namedCardType } = state.pendingNameCard
    const baseState: PlayingState = {
      ...state,
      ...CLEAR_PENDING,
      subPhase: 'turn-active',
      nopeWindow: null,
      events: [...state.events, ...events],
    }
    if (cancelled) {
      return ok(baseState)
    }
    const target = getPlayer(baseState, targetId)
    if (!target) return err(baseState, 'Target not found', 'INVALID_ACTION')
    const namedCard = target.hand.find(c => c.type === namedCardType)
    let resultState = baseState
    const found = !!namedCard
    if (namedCard) {
      resultState = removeCardsFromHand(resultState, targetId, [namedCard.id])
      resultState = addCardsToHand(resultState, stealerId, [namedCard])
    }
    const stealEvent: GameEvent = {
      type: 'combo-steal',
      stealerId,
      targetId,
      found,
      cardType: namedCardType,
    }
    return ok({ ...resultState, events: [...resultState.events, stealEvent] })
  }

  if (cancelled) {
    // Action was Noped — cards already in discard, return to turn-active
    const newState: PlayingState = {
      ...state,
      ...CLEAR_PENDING,
      subPhase: 'turn-active',
      nopeWindow: null,
      events: [...state.events, ...events],
    }
    return ok(newState)
  }

  // Action proceeds — apply the effect
  const newState: PlayingState = { ...state, nopeWindow: null, events: [...state.events, ...events] }

  if (pendingAction.type === 'play-card') {
    // 2-kind combo: target was bundled, resolve the random steal directly.
    // (3-kind no longer uses pendingSteal — it lands in the named-steal
    // branch above before this point.)
    if (state.pendingSteal) {
      const { stealerId, targetPlayerId, comboSize } = state.pendingSteal
      if (comboSize === 2) {
        return performRandomSteal(newState, stealerId, targetPlayerId, ctx)
      }
      return err(newState, 'Stale 3-kind pendingSteal on resolution', 'INVALID_ACTION')
    }

    // Single card — use originalCardType stored on the NopeWindow (not discard tail, which may be a Nope card)
    const playedCardType = state.nopeWindow.originalCardType
    if (!playedCardType) return err(newState, 'Cannot determine played card', 'INVALID_ACTION')

    const fakeAction = {
      ...pendingAction,
      playerId: originalPlayerId,
    } as EngineAction & { type: 'play-card' }

    return applyCardEffect(newState, playedCardType, fakeAction, [], ctx)
  }

  return ok(newState)
}


// --- Elimination ---

function eliminatePlayer(
  state: PlayingState,
  playerId: string,
  events: readonly GameEvent[],
): DispatchResult {
  const alivePlayers = state.players.filter(p => p.isAlive && p.id !== playerId)
  const rank = alivePlayers.length + 1

  const eliminationEvents: GameEvent[] = [
    { type: 'player-eliminated', playerId, rank },
  ]

  // Update player: dead, hand goes to deadCards
  const updatedPlayers = state.players.map(p =>
    p.id === playerId
      ? { ...p, isAlive: false, deadCards: [...p.hand], hand: [] as CardInstance[] }
      : p,
  )

  // Check for game over (1 player remaining)
  if (alivePlayers.length === 1) {
    const winner = alivePlayers[0]!
    const allEvents = [...events, ...eliminationEvents, { type: 'game-over' as const, winnerId: winner.id }]
    const cappedAllEvents = allEvents.length > MAX_EVENT_LOG
      ? allEvents.slice(-MAX_EVENT_LOG)
      : allEvents
    const gameOver: GameOverState = {
      phase: 'game_over',
      players: updatedPlayers,
      discardPile: state.discardPile,
      winnerId: winner.id,
      eliminationOrder: [...(state.players.filter(p => !p.isAlive).map(p => p.id)), playerId],
      stateVersion: state.stateVersion + 1,
      events: cappedAllEvents,
    }
    return { ok: true, state: gameOver, events: cappedAllEvents }
  }

  // Continue game — advance to next player
  const nextPlayer = getNextAlivePlayer(
    { ...state, players: updatedPlayers },
    playerId,
  )!

  const turnEvents: GameEvent[] = [
    { type: 'turn-started', playerId: nextPlayer.id, turnsRemaining: 1 },
  ]

  const allEvents = [...events, ...eliminationEvents, ...turnEvents]
  const newState: PlayingState = {
    ...state,
    ...CLEAR_PENDING,
    subPhase: 'turn-active',
    players: updatedPlayers,
    currentTurn: { currentPlayerId: nextPlayer.id, turnsRemaining: 1 },
    nopeWindow: null,
    events: allEvents,
  }
  return ok(newState)
}

// --- Helpers ---

function ok(state: PlayingState): DispatchResult {
  const cappedEvents = state.events.length > MAX_EVENT_LOG
    ? state.events.slice(-MAX_EVENT_LOG)
    : state.events
  const next: PlayingState = {
    ...state,
    stateVersion: state.stateVersion + 1,
    events: cappedEvents,
  }
  return { ok: true, state: next, events: cappedEvents }
}

function err(state: GameState, error: string, code: ErrorCode): DispatchResult {
  return { ok: false, error, code, state }
}

function getPlayer(state: PlayingState, playerId: string): Player | undefined {
  return state.players.find(p => p.id === playerId)
}

function getNextAlivePlayer(state: PlayingState, currentPlayerId: string): Player | undefined {
  const alivePlayers = state.players.filter(p => p.isAlive)
  if (alivePlayers.length === 0) return undefined

  const currentIndex = state.players.findIndex(p => p.id === currentPlayerId)
  for (let i = 1; i <= state.players.length; i++) {
    const next = state.players[(currentIndex + i) % state.players.length]!
    if (next.isAlive) return next
  }
  return undefined
}

function advanceTurn(state: PlayingState, _extraEvents: readonly GameEvent[]): DispatchResult {
  const nextPlayer = getNextAlivePlayer(state, state.currentTurn.currentPlayerId)
  if (!nextPlayer) return err(state, 'No next player', 'INVALID_ACTION')

  const events: GameEvent[] = [
    { type: 'turn-started', playerId: nextPlayer.id, turnsRemaining: 1 },
  ]

  const newState: PlayingState = {
    ...state,
    ...CLEAR_PENDING,
    subPhase: 'turn-active',
    currentTurn: { currentPlayerId: nextPlayer.id, turnsRemaining: 1 },
    nopeWindow: null,
    events: [...state.events, ...events],
  }
  return ok(newState)
}

function removeCardsFromHand(state: PlayingState, playerId: string, cardIds: string[]): PlayingState {
  const idSet = new Set(cardIds)
  return {
    ...state,
    players: state.players.map(p =>
      p.id === playerId ? { ...p, hand: p.hand.filter(c => !idSet.has(c.id)) } : p,
    ),
  }
}

function addCardsToHand(state: PlayingState, playerId: string, cards: CardInstance[]): PlayingState {
  return {
    ...state,
    players: state.players.map(p =>
      p.id === playerId ? { ...p, hand: [...p.hand, ...cards] } : p,
    ),
  }
}

function addToDiscard(state: PlayingState, cards: CardInstance[]): PlayingState {
  return { ...state, discardPile: [...state.discardPile, ...cards] }
}

function performRandomSteal(
  state: PlayingState,
  stealerId: string,
  targetId: string,
  ctx: DispatchContext,
): DispatchResult {
  const target = getPlayer(state, targetId)!

  if (target.hand.length === 0) {
    const events: GameEvent[] = [
      { type: 'combo-steal', stealerId, targetId, found: false },
    ]
    const newState: PlayingState = {
      ...state,
      subPhase: 'turn-active',
      pendingSteal: undefined,
      pendingPrompt: null,
      events: [...state.events, ...events],
    }
    return ok(newState)
  }

  const randomIndex = ctx.randomInt(target.hand.length)
  const stolenCard = target.hand[randomIndex]!

  let newState = removeCardsFromHand(state, targetId, [stolenCard.id])
  newState = addCardsToHand(newState, stealerId, [stolenCard])

  const events: GameEvent[] = [
    { type: 'combo-steal', stealerId, targetId, found: true, cardType: stolenCard.type },
  ]

  const finalState: PlayingState = {
    ...newState,
    subPhase: 'turn-active',
    pendingSteal: undefined,
    pendingPrompt: null,
    events: [...newState.events, ...events],
  }
  return ok(finalState)
}

function createNopeWindow(
  state: PlayingState,
  pendingAction: GameAction,
  originalPlayerId: string,
  alivePlayerCount: number,
  ctx: DispatchContext,
  originalCardType?: CardType,
): { window: NopeWindow; nextGen: number } {
  const gen = state.nextNopeGeneration
  const duration = getNopeWindowDuration(ctx, alivePlayerCount)
  return {
    window: {
      pendingAction,
      originalPlayerId,
      originalCardType,
      chainDepth: 0,
      generation: gen,
      deadlineMs: ctx.now + duration,
      startedAtMs: ctx.now,
    },
    nextGen: gen + 1,
  }
}

function getNopeWindowDuration(ctx: DispatchContext, alivePlayerCount: number): number {
  // Playtest-mode override (Unit 2). When ctx carries an explicit
  // `nopeWindowMs`, it replaces the tiered default uniformly. Production
  // callers do not populate `nopeWindowMs`, preserving the original
  // tier-based behaviour. `?? ` (not `||`) so an explicit 0 override is
  // honoured — degenerate but legal (makes "window closes immediately"
  // testable).
  if (ctx.nopeWindowMs !== undefined) return ctx.nopeWindowMs
  if (alivePlayerCount >= 5) return NOPE_WINDOW_MS.manyPlayers
  if (alivePlayerCount >= 3) return NOPE_WINDOW_MS.fewPlayers
  return NOPE_WINDOW_MS.headsUp
}

function fisherYatesShuffle<T>(array: T[], ctx: DispatchContext): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = ctx.randomInt(i + 1)
    const temp = array[i]!
    array[i] = array[j]!
    array[j] = temp
  }
  return array
}
