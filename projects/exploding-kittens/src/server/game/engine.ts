import type { CardInstance, SubPhase, GameEvent, CardType } from '@shared/types'
import type { ActionType, EngineAction, GameAction } from '@shared/actions'
import { CARD_DEFS, CARD_DEF_BY_TYPE } from '@shared/card-defs'
import type { CardCategory } from '@shared/card-defs'
import { NOPE_WINDOW_MS, DECK_COMPOSITION } from '@shared/constants'
import type {
  GameState, LobbyState, PlayingState, GameOverState,
  Player, NopeWindow,
  DispatchContext, DispatchResult, ErrorCode,
} from './types'

// --- Constants ---

const MAX_NOPE_CHAIN = 10
const NOPEABLE_ACTIONS = new Set<ActionType>(['play-card'])

const ALLOWED_ACTIONS: Record<SubPhase, readonly ActionType[]> = {
  'turn-active': ['play-card', 'draw-card', 'draw-from-bottom'],
  'defuse-pending': ['defuse-place'],
  'eliminated-check': [],
  'favor-pending': ['favor-give'],
  'future-rearrange-pending': ['future-rearrange'],
  'steal-target-pending': ['select-target'],
  'name-card-pending': ['name-card'],
}

const COMBO_EXCLUDED_CATEGORIES = new Set<CardCategory>(['kitten', 'defuse'])

// --- Public API ---

export function createLobbyState(): LobbyState {
  return { phase: 'lobby', players: [], stateVersion: 0, events: [] }
}

export function dispatch(
  state: GameState,
  action: EngineAction,
  ctx: DispatchContext,
): DispatchResult {
  const base = { ...state, events: [] as GameEvent[] }

  // Phase guard: start-game only in lobby
  if (action.type === 'start-game') {
    if (base.phase !== 'lobby') return err(base, 'Can only start game from lobby', 'INVALID_PHASE')
    return handleStartGame(base as LobbyState, action, ctx)
  }

  // All other actions require playing phase
  if (base.phase !== 'playing') return err(base, 'Game is not in playing phase', 'INVALID_PHASE')
  const playing = base as PlayingState

  // Nope is special — anyone can play it when window is active
  if (action.type === 'nope') {
    return handleNope(playing, action, ctx)
  }

  // nope-window-expired is server-only, no turn check
  if (action.type === 'nope-window-expired') {
    return handleNopeWindowExpired(playing, action, ctx)
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
    case 'draw-from-bottom': return handleDrawFromBottom(playing, action, ctx)
    case 'defuse-place': return handleDefusePlace(playing, action, ctx)
    case 'favor-give': return handleFavorGive(playing, action, ctx)
    case 'future-rearrange': return handleFutureRearrange(playing, action, ctx)
    case 'select-target': return handleSelectTarget(playing, action, ctx)
    case 'name-card': return handleNameCard(playing, action, ctx)
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

  // Deal 1 Defuse to each player, 7 cards from remaining deck (total 8 per player, including Defuse)
  // Actually, official rules: deal 1 Defuse + 7 other cards = 8 cards per player
  // Wait — let me re-read. Official rules: "Deal 1 Defuse card to each player... deal 7 more cards face down"
  const defuses = deck.filter(c => c.type === 'defuse')
  const nonDefuses = deck.filter(c => c.type !== 'defuse')

  // Each player gets 1 Defuse
  const playerDefuses = defuses.slice(0, playerCount)
  const remainingDefuses = defuses.slice(playerCount)

  // Shuffle non-defuses for dealing
  const shuffled = fisherYatesShuffle([...nonDefuses], ctx)

  // Deal 7 cards to each player from the shuffled non-defuse pile
  const players: Player[] = lobby.players.map((lp, i) => ({
    id: lp.id,
    name: lp.name,
    color: lp.color,
    hand: [playerDefuses[i]!, ...shuffled.slice(i * 7, (i + 1) * 7)],
    isAlive: true,
    deadCards: [],
  }))

  // Remaining deck: undealt cards + remaining defuses + N-1 Exploding Kittens
  const dealtCount = playerCount * 7
  let drawPile = [...shuffled.slice(dealtCount), ...remainingDefuses]

  // Insert N-1 Exploding Kittens
  const eksToInsert = playerCount - 1
  const allEks = deck.filter(c => c.type === 'exploding-kitten')
  for (let i = 0; i < eksToInsert && i < allEks.length; i++) {
    drawPile.push(allEks[i]!)
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
  }

  return { ok: true, state, events }
}

// --- Build Deck ---

export function buildDeck(playerCount: number, _ctx: DispatchContext): CardInstance[] {
  const cards: CardInstance[] = []
  let id = 0

  for (const def of CARD_DEFS) {
    // EKs handled separately (inserted after dealing)
    if (def.category === 'kitten') continue
    // Defuses handled separately (dealt to players, remainder to deck)
    if (def.category === 'defuse') {
      // Add ALL defuses — dealing logic separates them
      const count = getCountForPlayerCount(def, playerCount)
      for (let i = 0; i < count; i++) {
        cards.push({ id: `card-${id++}`, type: def.type })
      }
      continue
    }

    const count = getCountForPlayerCount(def, playerCount)
    for (let i = 0; i < count; i++) {
      cards.push({ id: `card-${id++}`, type: def.type })
    }
  }

  // Add Exploding Kittens to the deck (startGame handles insertion post-deal)
  const ekDef = CARD_DEFS.find(d => d.category === 'kitten')!
  const ekCount = getCountForPlayerCount(ekDef, playerCount)
  for (let i = 0; i < ekCount; i++) {
    cards.push({ id: `card-${id++}`, type: ekDef.type })
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
  const player = getPlayer(state, action.playerId)
  if (!player) return err(state, 'Player not found', 'INVALID_ACTION')

  // Validate all cards exist in hand and are unique
  if (new Set(cardIds).size !== cardIds.length) {
    return err(state, 'Duplicate card IDs', 'INVALID_COMBO')
  }
  const cards = cardIds.map(id => player.hand.find(c => c.id === id))
  if (cards.some(c => !c)) return err(state, 'Card not in hand', 'CARD_NOT_IN_HAND')
  const validCards = cards as CardInstance[]

  // Cannot use EK or Defuse in combos
  if (validCards.some(c => COMBO_EXCLUDED_CATEGORIES.has(CARD_DEF_BY_TYPE[c.type].category))) {
    return err(state, 'Cannot use Exploding Kitten or Defuse in combos', 'INVALID_COMBO')
  }

  if (validCards.length === 1) {
    return handleSingleCard(state, action, validCards[0]!, ctx)
  } else if (validCards.length === 2) {
    return handleTwoOfAKind(state, action, validCards, ctx)
  } else if (validCards.length === 3) {
    return handleThreeOfAKind(state, action, validCards, ctx)
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

  // Cat cards and Feral cats cannot be played alone
  if (cardDef.category === 'cat' || cardDef.category === 'wild') {
    return err(state, 'Cat cards can only be played in combos', 'INVALID_ACTION')
  }

  // Remove card from hand, add to discard
  let newState = removeCardsFromHand(state, action.playerId, [card.id])
  newState = addToDiscard(newState, [card])

  const events: GameEvent[] = [
    { type: 'card-played', playerId: action.playerId, cardType: card.type },
  ]

  // Open nope window for nopeable actions
  if (NOPEABLE_ACTIONS.has('play-card')) {
    const nopeWindow = createNopeWindow(
      { type: 'play-card', cardIds: action.cardIds },
      action.playerId,
      state.players.filter(p => p.isAlive).length,
      ctx,
    )
    const withNope: PlayingState = { ...newState, nopeWindow, events: [...newState.events, ...events] }
    return ok(withNope, events)
  }

  // Apply effect immediately if not nopeable
  return applyCardEffect(newState, card.type, action, events, ctx)
}

function applyCardEffect(
  state: PlayingState,
  cardType: CardType,
  action: EngineAction & { type: 'play-card' },
  events: GameEvent[],
  ctx: DispatchContext,
): DispatchResult {
  switch (cardType) {
    case 'attack': return applyAttack(state, action, events, false)
    case 'targeted-attack': return applyTargetedAttack(state, action, events)
    case 'skip': return applySkip(state, action, events)
    case 'see-the-future': return applySeeTheFuture(state, action, events)
    case 'alter-the-future': return applyAlterTheFuture(state, action, events)
    case 'shuffle': return applyShuffle(state, action, events, ctx)
    case 'draw-from-bottom': return applyDrawFromBottom(state, action, events, ctx)
    case 'favor': return applyFavor(state, action, events)
    case 'nope': return err(state, 'Nope handled separately', 'INVALID_ACTION')
    default: return err(state, `No effect for card type '${cardType}'`, 'INVALID_ACTION')
  }
}

// --- Individual Card Effects ---

function applyAttack(
  state: PlayingState,
  action: EngineAction,
  events: GameEvent[],
  _targeted: boolean,
): DispatchResult {
  const nextPlayer = getNextAlivePlayer(state, state.currentTurn.currentPlayerId)
  if (!nextPlayer) return err(state, 'No next player', 'INVALID_ACTION')

  const newTurns = state.currentTurn.turnsRemaining + 2
  const newState: PlayingState = {
    ...state,
    subPhase: 'turn-active',
    currentTurn: { currentPlayerId: nextPlayer.id, turnsRemaining: newTurns },
    nopeWindow: null,
    events: [...state.events, ...events,
      { type: 'turn-started', playerId: nextPlayer.id, turnsRemaining: newTurns },
    ],
  }
  return ok(newState, events)
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
  if (targetPlayerId === action.playerId) return err(state, 'Cannot target yourself', 'INVALID_TARGET')

  const newTurns = state.currentTurn.turnsRemaining + 2
  const newState: PlayingState = {
    ...state,
    subPhase: 'turn-active',
    currentTurn: { currentPlayerId: targetPlayerId, turnsRemaining: newTurns },
    nopeWindow: null,
    events: [...state.events, ...events,
      { type: 'turn-started', playerId: targetPlayerId, turnsRemaining: newTurns },
    ],
  }
  return ok(newState, events)
}

function applySkip(
  state: PlayingState,
  _action: EngineAction,
  events: GameEvent[],
): DispatchResult {
  const remaining = state.currentTurn.turnsRemaining - 1

  if (remaining > 0) {
    // Still has turns left (was under Attack)
    const newState: PlayingState = {
      ...state,
      subPhase: 'turn-active',
      currentTurn: { ...state.currentTurn, turnsRemaining: remaining },
      nopeWindow: null,
      events: [...state.events, ...events],
    }
    return ok(newState, events)
  }

  // End turn, move to next player
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
  return ok(newState, events)
}

function applyAlterTheFuture(
  state: PlayingState,
  action: EngineAction,
  events: GameEvent[],
): DispatchResult {
  const topCards = state.drawPile.slice(0, 3)
  const newState: PlayingState = {
    ...state,
    subPhase: 'future-rearrange-pending',
    pendingFuture: { playerId: action.playerId, cardIds: topCards.map(c => c.id) },
    nopeWindow: null,
    events: [...state.events, ...events],
  }
  return ok(newState, events)
}

function applyShuffle(
  state: PlayingState,
  _action: EngineAction,
  events: GameEvent[],
  ctx: DispatchContext,
): DispatchResult {
  const shuffled = fisherYatesShuffle([...state.drawPile], ctx)
  const newState: PlayingState = {
    ...state,
    drawPile: shuffled,
    nopeWindow: null,
    events: [...state.events, ...events,
      { type: 'deck-shuffled', playerId: _action.playerId },
    ],
  }
  return ok(newState, events)
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

  // Empty-handed target: resolve with no transfer
  if (target.hand.length === 0) {
    const newState: PlayingState = {
      ...state,
      nopeWindow: null,
      events: [...state.events, ...events,
        { type: 'favor-requested', requesterId: action.playerId, targetId: targetPlayerId },
        { type: 'favor-given', giverId: targetPlayerId, receiverId: action.playerId },
      ],
    }
    return ok(newState, events)
  }

  const newState: PlayingState = {
    ...state,
    subPhase: 'favor-pending',
    pendingFavor: { requesterId: action.playerId, targetId: targetPlayerId },
    nopeWindow: null,
    events: [...state.events, ...events,
      { type: 'favor-requested', requesterId: action.playerId, targetId: targetPlayerId },
    ],
  }
  return ok(newState, events)
}

// --- Combo Handlers ---

function handleTwoOfAKind(
  state: PlayingState,
  action: EngineAction & { type: 'play-card' },
  cards: CardInstance[],
  _ctx: DispatchContext,
): DispatchResult {
  if (!isValidCombo(cards, 2)) {
    return err(state, 'Cards must match for Two of a Kind (Feral Cat substitutes for cat types only)', 'INVALID_COMBO')
  }

  let newState = removeCardsFromHand(state, action.playerId, cards.map(c => c.id))
  newState = addToDiscard(newState, cards)

  const events: GameEvent[] = [
    { type: 'card-played', playerId: action.playerId, cardType: cards[0]!.type, comboSize: 2 },
  ]

  // Open nope window
  const nopeWindow = createNopeWindow(
    { type: 'play-card', cardIds: action.cardIds },
    action.playerId,
    state.players.filter(p => p.isAlive).length,
    _ctx,
  )

  const withNope: PlayingState = {
    ...newState,
    pendingSteal: { stealerId: action.playerId, comboSize: 2 },
    nopeWindow,
    events: [...newState.events, ...events],
  }
  return ok(withNope, events)
}

function handleThreeOfAKind(
  state: PlayingState,
  action: EngineAction & { type: 'play-card' },
  cards: CardInstance[],
  _ctx: DispatchContext,
): DispatchResult {
  if (!isValidCombo(cards, 3)) {
    return err(state, 'Cards must match for Three of a Kind (Feral Cat substitutes for cat types only)', 'INVALID_COMBO')
  }

  let newState = removeCardsFromHand(state, action.playerId, cards.map(c => c.id))
  newState = addToDiscard(newState, cards)

  const events: GameEvent[] = [
    { type: 'card-played', playerId: action.playerId, cardType: cards[0]!.type, comboSize: 3 },
  ]

  const nopeWindow = createNopeWindow(
    { type: 'play-card', cardIds: action.cardIds },
    action.playerId,
    state.players.filter(p => p.isAlive).length,
    _ctx,
  )

  const withNope: PlayingState = {
    ...newState,
    pendingSteal: { stealerId: action.playerId, comboSize: 3 },
    nopeWindow,
    events: [...newState.events, ...events],
  }
  return ok(withNope, events)
}

function isValidCombo(cards: CardInstance[], size: number): boolean {
  if (cards.length !== size) return false

  // All cards must be combo-eligible (not EK, not Defuse)
  if (cards.some(c => COMBO_EXCLUDED_CATEGORIES.has(CARD_DEF_BY_TYPE[c.type].category))) return false

  // Check matching: all same type, or feral cat substitution
  const types = cards.map(c => c.type)
  const nonFeralTypes = types.filter(t => t !== 'feral-cat')

  // All ferals: valid combo
  if (nonFeralTypes.length === 0) return true

  // All non-ferals must be same type
  const baseType = nonFeralTypes[0]!
  if (!nonFeralTypes.every(t => t === baseType)) return false

  // Feral Cat can only substitute for cat types (cat + wild categories)
  const hasFeralSubstitution = types.some(t => t === 'feral-cat')
  if (hasFeralSubstitution) {
    const baseDef = CARD_DEF_BY_TYPE[baseType]
    if (baseDef.category !== 'cat' && baseDef.category !== 'wild') return false
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

function handleDrawFromBottom(
  state: PlayingState,
  action: EngineAction,
  ctx: DispatchContext,
): DispatchResult {
  // Player needs a Draw from Bottom card in hand
  const player = getPlayer(state, action.playerId)
  if (!player) return err(state, 'Player not found', 'INVALID_ACTION')

  const dfbCard = player.hand.find(c => c.type === 'draw-from-bottom')
  if (!dfbCard) return err(state, 'No Draw from Bottom card in hand', 'CARD_NOT_IN_HAND')

  // Remove card from hand, add to discard
  let newState = removeCardsFromHand(state, action.playerId, [dfbCard.id])
  newState = addToDiscard(newState, [dfbCard])

  const events: GameEvent[] = [
    { type: 'card-played', playerId: action.playerId, cardType: 'draw-from-bottom' },
  ]

  return performDraw(newState, action.playerId, 'bottom', events, ctx)
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

  // Check for Exploding Kitten
  if (drawnCard.type === 'exploding-kitten') {
    const player = getPlayer(state, playerId)!
    const hasDefuse = player.hand.some(c => c.type === 'defuse')

    const events: GameEvent[] = [
      ...extraEvents,
      { type: 'exploding-kitten-drawn', playerId },
    ]

    if (hasDefuse) {
      // Auto-play Defuse, enter defuse-pending for placement
      const defuseCard = player.hand.find(c => c.type === 'defuse')!
      let newState: PlayingState = { ...state, drawPile }
      newState = removeCardsFromHand(newState, playerId, [defuseCard.id])
      newState = addToDiscard(newState, [defuseCard])

      const finalState: PlayingState = {
        ...newState,
        subPhase: 'defuse-pending',
        pendingDefuse: { playerId },
        nopeWindow: null,
        events: [...newState.events, ...events, { type: 'defuse-played', playerId }],
      }
      // Keep the EK in hand temporarily for placement
      const playerWithEk = addCardsToHand(finalState, playerId, [drawnCard])
      return ok(playerWithEk, events)
    }

    // No Defuse — eliminated
    return eliminatePlayer({ ...state, drawPile }, playerId, [...state.events, ...events])
  }

  // Safe draw
  let newState: PlayingState = { ...state, drawPile }
  newState = addCardsToHand(newState, playerId, [drawnCard])

  const events: GameEvent[] = [
    ...extraEvents,
    { type: 'card-drawn', playerId, safe: true },
  ]

  // Consume one turn
  const remaining = state.currentTurn.turnsRemaining - 1
  if (remaining > 0) {
    const finalState: PlayingState = {
      ...newState,
      currentTurn: { ...state.currentTurn, turnsRemaining: remaining },
      nopeWindow: null,
      events: [...newState.events, ...events],
    }
    return ok(finalState, events)
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

  // Find EK in player's hand (was temporarily placed there)
  const player = getPlayer(state, action.playerId)!
  const ek = player.hand.find(c => c.type === 'exploding-kitten')
  if (!ek) return err(state, 'No Exploding Kitten in hand', 'INVALID_ACTION')

  // Remove EK from hand
  let newState = removeCardsFromHand(state, action.playerId, [ek.id])

  // Insert EK into draw pile at position
  const newDrawPile = [...newState.drawPile]
  newDrawPile.splice(position, 0, ek)

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
      currentTurn: { ...state.currentTurn, turnsRemaining: remaining },
      events: newState.events,
    }
    return ok(finalState, [])
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

  // Cannot gift Exploding Kitten
  if (card.type === 'exploding-kitten') {
    return err(state, 'Cannot give away an Exploding Kitten', 'INVALID_ACTION')
  }

  let newState = removeCardsFromHand(state, pending.targetId, [card.id])
  newState = addCardsToHand(newState, pending.requesterId, [card])

  const events: GameEvent[] = [
    { type: 'favor-given', giverId: pending.targetId, receiverId: pending.requesterId },
  ]

  const finalState: PlayingState = {
    ...newState,
    subPhase: 'turn-active',
    pendingFavor: undefined,
    events: [...newState.events, ...events],
  }
  return ok(finalState, events)
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
    events: [...state.events, ...events],
  }
  return ok(newState, events)
}

// --- Select Target (Combo Steal) ---

function handleSelectTarget(
  state: PlayingState,
  action: EngineAction & { type: 'select-target' },
  ctx: DispatchContext,
): DispatchResult {
  const pending = state.pendingSteal
  if (!pending) return err(state, 'No pending steal', 'INVALID_ACTION')

  const { targetPlayerId } = action
  if (targetPlayerId === pending.stealerId) return err(state, 'Cannot target yourself', 'INVALID_TARGET')

  const target = state.players.find(p => p.id === targetPlayerId && p.isAlive)
  if (!target) return err(state, 'Invalid target player', 'INVALID_TARGET')

  if (pending.comboSize === 2) {
    // Two of a Kind: steal random card from target
    return performRandomSteal(state, pending.stealerId, targetPlayerId, ctx)
  }

  // Three of a Kind: enter name-card-pending
  const newState: PlayingState = {
    ...state,
    subPhase: 'name-card-pending',
    pendingSteal: undefined,
    pendingNameCard: { stealerId: pending.stealerId, targetId: targetPlayerId },
    events: state.events,
  }
  return ok(newState, [])
}

// --- Name Card (Three of a Kind) ---

function handleNameCard(
  state: PlayingState,
  action: EngineAction & { type: 'name-card' },
  _ctx: DispatchContext,
): DispatchResult {
  const pending = state.pendingNameCard
  if (!pending) return err(state, 'No pending name card', 'INVALID_ACTION')

  const target = getPlayer(state, pending.targetId)!
  const namedCard = target.hand.find(c => c.type === action.cardType)

  let newState = state
  const found = !!namedCard

  if (namedCard) {
    newState = removeCardsFromHand(newState, pending.targetId, [namedCard.id])
    newState = addCardsToHand(newState, pending.stealerId, [namedCard])
  }

  const events: GameEvent[] = [
    { type: 'combo-steal', stealerId: pending.stealerId, targetId: pending.targetId, found },
  ]

  const finalState: PlayingState = {
    ...newState,
    subPhase: 'turn-active',
    pendingNameCard: undefined,
    events: [...newState.events, ...events],
  }
  return ok(finalState, events)
}

// --- Nope Handling ---

function handleNope(
  state: PlayingState,
  action: EngineAction,
  ctx: DispatchContext,
): DispatchResult {
  if (!state.nopeWindow) return err(state, 'No active Nope window', 'NOPE_NOT_ACTIVE')
  if (state.nopeWindow.chainDepth >= MAX_NOPE_CHAIN) {
    return err(state, 'Maximum Nope chain depth reached', 'MAX_CHAIN_DEPTH')
  }

  // Validate player has a Nope card
  const player = getPlayer(state, action.playerId)
  if (!player) return err(state, 'Player not found', 'INVALID_ACTION')

  const nopeCard = player.hand.find(c => c.type === 'nope')
  if (!nopeCard) return err(state, 'No Nope card in hand', 'CARD_NOT_IN_HAND')

  // Remove Nope from hand, add to discard
  let newState = removeCardsFromHand(state, action.playerId, [nopeCard.id])
  newState = addToDiscard(newState, [nopeCard])

  const newDepth = state.nopeWindow.chainDepth + 1
  const aliveCount = state.players.filter(p => p.isAlive).length

  const events: GameEvent[] = [
    { type: 'nope-played', playerId: action.playerId, chainDepth: newDepth },
  ]

  // Reset timer with full duration
  const newWindow: NopeWindow = {
    ...state.nopeWindow,
    chainDepth: newDepth,
    deadlineMs: ctx.now + getNopeWindowDuration(aliveCount),
    startedAtMs: ctx.now,
  }

  const finalState: PlayingState = {
    ...newState,
    nopeWindow: newWindow,
    events: [...newState.events, ...events],
  }
  return ok(finalState, events)
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

  if (cancelled) {
    // Action was Noped — cards already in discard, return to turn-active
    const newState: PlayingState = {
      ...state,
      subPhase: 'turn-active',
      nopeWindow: null,
      pendingSteal: undefined,
      events: [...state.events, ...events],
    }
    return ok(newState, events)
  }

  // Action proceeds — apply the effect
  const newState: PlayingState = { ...state, nopeWindow: null, events: [...state.events, ...events] }

  // Determine what the pending action was
  if (pendingAction.type === 'play-card') {
    // If it was a combo (pendingSteal exists), proceed to steal target selection
    if (state.pendingSteal) {
      const stealState: PlayingState = {
        ...newState,
        subPhase: 'steal-target-pending',
      }
      return ok(stealState, events)
    }

    // Single card effect — determine which card from the discard (most recent)
    const playedCardType = state.discardPile[state.discardPile.length - 1]?.type
    if (!playedCardType) return err(newState, 'Cannot determine played card', 'INVALID_ACTION')

    // Build a fake action to pass to applyCardEffect
    const fakeAction = {
      ...pendingAction,
      playerId: originalPlayerId,
    } as EngineAction & { type: 'play-card' }

    return applyCardEffect(newState, playedCardType, fakeAction, [], ctx)
  }

  return ok(newState, events)
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
    const gameOver: GameOverState = {
      phase: 'game_over',
      players: updatedPlayers,
      discardPile: state.discardPile,
      winnerId: winner.id,
      eliminationOrder: [...(state.players.filter(p => !p.isAlive).map(p => p.id)), playerId],
      stateVersion: state.stateVersion + 1,
      events: allEvents,
    }
    return { ok: true, state: gameOver, events: allEvents }
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
    subPhase: 'turn-active',
    players: updatedPlayers,
    currentTurn: { currentPlayerId: nextPlayer.id, turnsRemaining: 1 },
    nopeWindow: null,
    pendingDefuse: undefined,
    stateVersion: state.stateVersion + 1,
    events: allEvents,
  }
  return ok(newState, allEvents)
}

// --- Helpers ---

function ok(state: PlayingState, _events: readonly GameEvent[]): DispatchResult {
  return { ok: true, state: { ...state, stateVersion: state.stateVersion + 1 }, events: state.events }
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

function advanceTurn(state: PlayingState, extraEvents: readonly GameEvent[]): DispatchResult {
  const nextPlayer = getNextAlivePlayer(state, state.currentTurn.currentPlayerId)
  if (!nextPlayer) return err(state, 'No next player', 'INVALID_ACTION')

  const events: GameEvent[] = [
    { type: 'turn-started', playerId: nextPlayer.id, turnsRemaining: 1 },
  ]

  const newState: PlayingState = {
    ...state,
    subPhase: 'turn-active',
    currentTurn: { currentPlayerId: nextPlayer.id, turnsRemaining: 1 },
    nopeWindow: null,
    events: [...state.events, ...events],
  }
  return ok(newState, [...extraEvents, ...events])
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
      events: [...state.events, ...events],
    }
    return ok(newState, events)
  }

  const randomIndex = ctx.randomInt(target.hand.length)
  const stolenCard = target.hand[randomIndex]!

  let newState = removeCardsFromHand(state, targetId, [stolenCard.id])
  newState = addCardsToHand(newState, stealerId, [stolenCard])

  const events: GameEvent[] = [
    { type: 'combo-steal', stealerId, targetId, found: true },
  ]

  const finalState: PlayingState = {
    ...newState,
    subPhase: 'turn-active',
    pendingSteal: undefined,
    events: [...newState.events, ...events],
  }
  return ok(finalState, events)
}

function createNopeWindow(
  pendingAction: GameAction,
  originalPlayerId: string,
  alivePlayerCount: number,
  ctx: DispatchContext,
): NopeWindow {
  const duration = getNopeWindowDuration(alivePlayerCount)
  return {
    pendingAction,
    originalPlayerId,
    chainDepth: 0,
    deadlineMs: ctx.now + duration,
    startedAtMs: ctx.now,
  }
}

function getNopeWindowDuration(alivePlayerCount: number): number {
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
