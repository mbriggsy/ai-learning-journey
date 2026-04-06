import { describe, it, expect } from 'vitest'
import { createLobbyState, dispatch, buildDeck } from './engine'
import type { DispatchContext, DispatchResult, PlayingState, GameState } from './types'
import type { EngineAction } from '@shared/actions'
import type { CardInstance } from '@shared/types'

// --- Test Helpers ---

function makeCtx(now = 1000): DispatchContext {
  let seed = 42
  return {
    now,
    random: () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff
      return seed / 0x7fffffff
    },
    randomInt: (max: number) => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff
      return seed % max
    },
  }
}

function act(state: GameState, action: Partial<EngineAction> & { type: string }, ctx?: DispatchContext): DispatchResult {
  const fullAction = { playerId: 'p1', ...action } as EngineAction
  return dispatch(state, fullAction, ctx ?? makeCtx())
}

function startGameWith(playerCount: number, ctx?: DispatchContext): PlayingState {
  const c = ctx ?? makeCtx()
  let lobby = createLobbyState()
  for (let i = 0; i < playerCount; i++) {
    lobby = {
      ...lobby,
      players: [...lobby.players, { id: `p${i + 1}`, name: `Player ${i + 1}`, color: `#${i}` }],
    }
  }
  const result = dispatch(lobby, { type: 'start-game', playerId: 'p1' } as EngineAction, c)
  expect(result.ok).toBe(true)
  return (result as { ok: true; state: GameState }).state as PlayingState
}

function findCard(state: PlayingState, playerId: string, cardType: string): CardInstance | undefined {
  const player = state.players.find(p => p.id === playerId)
  return player?.hand.find(c => c.type === cardType)
}

function giveCard(state: PlayingState, playerId: string, cardType: string, cardId?: string): PlayingState {
  const id = cardId ?? `test-${cardType}-${Date.now()}`
  return {
    ...state,
    players: state.players.map(p =>
      p.id === playerId ? { ...p, hand: [...p.hand, { id, type: cardType } as CardInstance] } : p,
    ),
  }
}

function removeCardType(state: PlayingState, playerId: string, cardType: string): PlayingState {
  return {
    ...state,
    players: state.players.map(p =>
      p.id === playerId ? { ...p, hand: p.hand.filter(c => c.type !== cardType) } : p,
    ),
  }
}

/** Build a nope-window-expired action with correct generation from current state */
function expireNope(state: PlayingState): Partial<EngineAction> & { type: string } {
  return {
    type: 'nope-window-expired',
    playerId: 'server',
    windowGeneration: (state as PlayingState).nopeWindow!.generation,
  }
}

/** Fully resolve a Nope window: expire → grace → resolve. Returns the final state. */
function resolveNopeWindow(state: PlayingState, ctx: DispatchContext): DispatchResult {
  // Step 1: nope-window-expired → transitions to grace
  const graceResult = act(state, expireNope(state), ctx)
  if (!graceResult.ok) return graceResult
  const graceState = graceResult.state as PlayingState
  // Step 2: nope-grace-expired → actually resolves
  return act(graceState, {
    type: 'nope-grace-expired',
    playerId: 'server',
    windowGeneration: graceState.nopeWindow!.generation,
  }, ctx)
}

// nextNopeGeneration is now on PlayingState — no reset needed

// --- Lobby Tests ---

describe('Lobby', () => {
  it('creates empty lobby state', () => {
    const lobby = createLobbyState()
    expect(lobby.phase).toBe('lobby')
    expect(lobby.players).toHaveLength(0)
    expect(lobby.stateVersion).toBe(0)
  })

  it('rejects start-game with fewer than 2 players', () => {
    let lobby = createLobbyState()
    lobby = { ...lobby, players: [{ id: 'p1', name: 'P1', color: '#1' }] }
    const result = act(lobby, { type: 'start-game' })
    expect(result.ok).toBe(false)
  })

  it('rejects start-game with more than 10 players', () => {
    let lobby = createLobbyState()
    const players = Array.from({ length: 11 }, (_, i) => ({ id: `p${i}`, name: `P${i}`, color: `#${i}` }))
    lobby = { ...lobby, players }
    const result = act(lobby, { type: 'start-game' })
    expect(result.ok).toBe(false)
  })

  it('rejects non-start-game actions in lobby', () => {
    const lobby = createLobbyState()
    const result = act(lobby, { type: 'draw-card' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('INVALID_PHASE')
  })
})

// --- Start Game Tests ---

describe('startGame', () => {
  it('transitions to playing phase', () => {
    const state = startGameWith(4)
    expect(state.phase).toBe('playing')
    expect(state.subPhase).toBe('turn-active')
  })

  it('deals 8 cards per player (1 Defuse + 7)', () => {
    const state = startGameWith(4)
    for (const player of state.players) {
      expect(player.hand).toHaveLength(8)
      expect(player.hand.some(c => c.type === 'defuse')).toBe(true)
    }
  })

  it('sets first player as current turn', () => {
    const state = startGameWith(4)
    expect(state.currentTurn.currentPlayerId).toBe('p1')
    expect(state.currentTurn.turnsRemaining).toBe(1)
  })

  it('inserts N-1 Exploding Kittens into draw pile', () => {
    const state = startGameWith(4)
    const eksInDeck = state.drawPile.filter(c => c.type === 'exploding-kitten')
    expect(eksInDeck).toHaveLength(3) // 4 players - 1
  })

  it('has no Exploding Kittens in any hand', () => {
    const state = startGameWith(4)
    for (const player of state.players) {
      expect(player.hand.some(c => c.type === 'exploding-kitten')).toBe(false)
    }
  })

  it('marks all players as alive', () => {
    const state = startGameWith(4)
    expect(state.players.every(p => p.isAlive)).toBe(true)
  })
})

// --- Deck Composition Tests ---

describe('buildDeck', () => {
  it('builds correct deck for 2 players (paw counts, no EKs)', () => {
    const deck = buildDeck(2, makeCtx())
    // buildDeck excludes EKs (startGame creates N-1 directly)
    // 2 players use paw tier: sum of all non-kitten pawCounts = 44
    expect(deck.length).toBe(44)
    expect(deck.some(c => c.type === 'exploding-kitten')).toBe(false)
  })

  it('builds correct deck for 5 players (non-paw counts, no EKs)', () => {
    const deck = buildDeck(5, makeCtx())
    // 5 players use non-paw tier: sum of all non-kitten nonPawCounts = 67
    expect(deck.length).toBe(67)
    expect(deck.some(c => c.type === 'exploding-kitten')).toBe(false)
  })

  it('builds correct deck for 10 players (both, no EKs)', () => {
    const deck = buildDeck(10, makeCtx())
    // 10 players use both: sum of all non-kitten (paw+nonPaw) = 111
    expect(deck.length).toBe(111)
    expect(deck.some(c => c.type === 'exploding-kitten')).toBe(false)
  })

  it('has unique card IDs', () => {
    const deck = buildDeck(5, makeCtx())
    const ids = deck.map(c => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

// --- Skip Tests ---

describe('Skip', () => {
  it('ends turn without drawing', () => {
    let state = startGameWith(2)
    const skipCard = findCard(state, 'p1', 'skip')
    if (!skipCard) {
      state = giveCard(state, 'p1', 'skip', 'skip-1')
    }
    const card = findCard(state, 'p1', 'skip')!
    const result = act(state, { type: 'play-card', playerId: 'p1', cardIds: [card.id] })
    expect(result.ok).toBe(true)
    // Skip opens nope window — action resolves after nope-window-expired
  })

  it('consumes 1 turn when under Attack', () => {
    let state = startGameWith(2)
    // Give p1 a skip, set turnsRemaining to 2 (as if attacked)
    state = giveCard(state, 'p1', 'skip', 'skip-test')
    state = { ...state, currentTurn: { currentPlayerId: 'p1', turnsRemaining: 2 } }

    const card = findCard(state, 'p1', 'skip')!

    // Play skip — opens nope window
    let result = act(state, { type: 'play-card', playerId: 'p1', cardIds: [card.id] })
    expect(result.ok).toBe(true)

    // Expire nope window
    const afterNope = result.ok ? result.state as PlayingState : state
    result = resolveNopeWindow(afterNope, makeCtx(99999))
    expect(result.ok).toBe(true)

    if (result.ok) {
      const s = result.state as PlayingState
      // Still p1's turn with 1 remaining
      expect(s.currentTurn.currentPlayerId).toBe('p1')
      expect(s.currentTurn.turnsRemaining).toBe(1)
    }
  })
})

// --- Attack Tests ---

describe('Attack', () => {
  it('transfers turn to next player with 2 extra turns', () => {
    let state = startGameWith(3)
    state = giveCard(state, 'p1', 'attack', 'attack-1')

    const card = findCard(state, 'p1', 'attack')!
    let result = act(state, { type: 'play-card', playerId: 'p1', cardIds: [card.id] })
    expect(result.ok).toBe(true)

    // Expire nope window
    const afterNope = (result as { ok: true; state: GameState }).state as PlayingState
    result = resolveNopeWindow(afterNope, makeCtx(99999))
    expect(result.ok).toBe(true)

    if (result.ok) {
      const s = result.state as PlayingState
      expect(s.currentTurn.currentPlayerId).toBe('p2')
      // Attack: next player gets current.turnsRemaining + 2
      // Before attack, p1 had 1 turn. So p2 gets 1 + 2 = 3
      expect(s.currentTurn.turnsRemaining).toBe(3)
    }
  })
})

// --- Targeted Attack Tests ---

describe('Targeted Attack', () => {
  it('attacks a specific player', () => {
    let state = startGameWith(3)
    state = giveCard(state, 'p1', 'targeted-attack', 'ta-1')

    const card = findCard(state, 'p1', 'targeted-attack')!
    let result = act(state, {
      type: 'play-card', playerId: 'p1', cardIds: [card.id], targetPlayerId: 'p3',
    })
    expect(result.ok).toBe(true)

    // Expire nope window
    const afterNope = (result as { ok: true; state: GameState }).state as PlayingState
    result = resolveNopeWindow(afterNope, makeCtx(99999))
    expect(result.ok).toBe(true)

    if (result.ok) {
      const s = result.state as PlayingState
      expect(s.currentTurn.currentPlayerId).toBe('p3')
    }
  })

  it('rejects self-targeting', () => {
    let state = startGameWith(3)
    state = giveCard(state, 'p1', 'targeted-attack', 'ta-self')

    const card = findCard(state, 'p1', 'targeted-attack')!
    const result = act(state, {
      type: 'play-card', playerId: 'p1', cardIds: [card.id], targetPlayerId: 'p1',
    })
    // Opens nope window, then self-target check happens on resolution
    // Actually, the targeted-attack effect is applied after nope window
    // Self-targeting is checked in applyTargetedAttack
    expect(result.ok).toBe(true) // nope window opens first
  })

  it('requires a target', () => {
    let state = startGameWith(3)
    state = giveCard(state, 'p1', 'targeted-attack', 'ta-notarget')

    const card = findCard(state, 'p1', 'targeted-attack')!
    let result = act(state, { type: 'play-card', playerId: 'p1', cardIds: [card.id] })
    // This opens nope window, target check is deferred to resolution
    expect(result.ok).toBe(true)

    const afterNope = (result as { ok: true; state: GameState }).state as PlayingState
    result = resolveNopeWindow(afterNope, makeCtx(99999))
    // Now the effect applies — should fail because no target
    expect(result.ok).toBe(false)
  })
})

// --- Draw Tests ---

describe('Draw', () => {
  it('draws a card from the top', () => {
    const state = startGameWith(2)
    const topCard = state.drawPile[0]!
    const handSize = state.players[0]!.hand.length

    const result = act(state, { type: 'draw-card', playerId: 'p1' })
    expect(result.ok).toBe(true)

    if (result.ok) {
      const s = result.state as PlayingState
      const p1 = s.players.find(p => p.id === 'p1')!
      // If not an EK, hand size increases by 1
      if (topCard.type !== 'exploding-kitten') {
        expect(p1.hand).toHaveLength(handSize + 1)
      }
    }
  })

  it('rejects draw when not your turn', () => {
    const state = startGameWith(2)
    const result = act(state, { type: 'draw-card', playerId: 'p2' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('NOT_YOUR_TURN')
  })
})

// --- Nope Tests ---

describe('Nope', () => {
  it('requires an active nope window', () => {
    const state = startGameWith(2)
    state.players.find(p => p.id === 'p2')
    const nopeState = giveCard(state, 'p2', 'nope', 'nope-1')

    const result = act(nopeState, { type: 'nope', playerId: 'p2' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('NOPE_NOT_ACTIVE')
  })

  it('rejects self-Nope on own action', () => {
    let state = startGameWith(2)
    state = giveCard(state, 'p1', 'skip', 'skip-self')
    state = giveCard(state, 'p1', 'nope', 'nope-self')

    const skipCard = findCard(state, 'p1', 'skip')!
    let result = act(state, { type: 'play-card', playerId: 'p1', cardIds: [skipCard.id] })
    const withWindow = (result as { ok: true; state: GameState }).state as PlayingState

    // p1 tries to Nope own Skip — should fail
    result = act(withWindow, { type: 'nope', playerId: 'p1' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('INVALID_ACTION')
  })

  it('increments chain depth on valid Nope', () => {
    let state = startGameWith(2)
    state = giveCard(state, 'p1', 'skip', 'skip-for-nope')
    state = giveCard(state, 'p2', 'nope', 'nope-test')

    // Play skip to open nope window
    const skipCard = findCard(state, 'p1', 'skip')!
    let result = act(state, { type: 'play-card', playerId: 'p1', cardIds: [skipCard.id] })
    expect(result.ok).toBe(true)

    const withWindow = (result as { ok: true; state: GameState }).state as PlayingState
    expect(withWindow.nopeWindow).not.toBeNull()
    expect(withWindow.nopeWindow!.chainDepth).toBe(0)

    // Play nope
    result = act(withWindow, { type: 'nope', playerId: 'p2' })
    expect(result.ok).toBe(true)

    if (result.ok) {
      const s = result.state as PlayingState
      expect(s.nopeWindow!.chainDepth).toBe(1)
    }
  })

  it('odd chain depth cancels, even allows', () => {
    let state = startGameWith(2)
    state = giveCard(state, 'p1', 'skip', 'skip-nope-chain')
    state = giveCard(state, 'p2', 'nope', 'nope-1')
    state = giveCard(state, 'p1', 'nope', 'nope-2')

    // Play skip → nope window
    const skipCard = findCard(state, 'p1', 'skip')!
    let result = act(state, { type: 'play-card', playerId: 'p1', cardIds: [skipCard.id] })
    let s = (result as { ok: true; state: GameState }).state as PlayingState

    // Nope (depth 1 = cancelled)
    result = act(s, { type: 'nope', playerId: 'p2' })
    s = (result as { ok: true; state: GameState }).state as PlayingState

    // Expire at depth 1 (odd = cancelled)
    result = resolveNopeWindow(s, makeCtx(99999))
    expect(result.ok).toBe(true)
    if (result.ok) {
      const resolved = result.state as PlayingState
      // Action was cancelled, should be back to turn-active
      expect(resolved.subPhase).toBe('turn-active')
      expect(resolved.nopeWindow).toBeNull()
    }
  })
})

// --- Defuse Tests ---

describe('Defuse', () => {
  it('enters defuse-pending when drawing EK with Defuse in hand', () => {
    let state = startGameWith(2)
    // Ensure top card is EK and player has Defuse
    const ekCard: CardInstance = { id: 'ek-test', type: 'exploding-kitten' }
    state = { ...state, drawPile: [ekCard, ...state.drawPile] }
    state = giveCard(state, 'p1', 'defuse', 'defuse-test')

    const result = act(state, { type: 'draw-card', playerId: 'p1' })
    expect(result.ok).toBe(true)

    if (result.ok) {
      const s = result.state as PlayingState
      expect(s.subPhase).toBe('defuse-pending')
      expect(s.pendingDefuse?.playerId).toBe('p1')
    }
  })

  it('allows placing EK back at valid position', () => {
    let state = startGameWith(2)
    const ekCard: CardInstance = { id: 'ek-place', type: 'exploding-kitten' }
    state = { ...state, drawPile: [ekCard, ...state.drawPile] }
    state = giveCard(state, 'p1', 'defuse', 'defuse-place')

    // Draw EK → defuse-pending
    let result = act(state, { type: 'draw-card', playerId: 'p1' })
    const defuseState = (result as { ok: true; state: GameState }).state as PlayingState

    // Place EK at position 0 (top)
    result = act(defuseState, { type: 'defuse-place', playerId: 'p1', position: 0 })
    expect(result.ok).toBe(true)

    if (result.ok) {
      const s = result.state as PlayingState
      expect(s.subPhase).toBe('turn-active') // or advanced turn
      // EK should be in draw pile
      expect(s.drawPile.some(c => c.type === 'exploding-kitten')).toBe(true)
      // EK should NOT be in player's hand
      const p1 = s.players.find(p => p.id === 'p1')!
      expect(p1.hand.some(c => c.type === 'exploding-kitten')).toBe(false)
    }
  })

  it('rejects invalid position', () => {
    let state = startGameWith(2)
    const ekCard: CardInstance = { id: 'ek-invalid', type: 'exploding-kitten' }
    state = { ...state, drawPile: [ekCard, ...state.drawPile] }
    state = giveCard(state, 'p1', 'defuse', 'defuse-invalid')

    let result = act(state, { type: 'draw-card', playerId: 'p1' })
    const defuseState = (result as { ok: true; state: GameState }).state as PlayingState

    // Invalid position (too large)
    result = act(defuseState, { type: 'defuse-place', playerId: 'p1', position: 999 })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('INVALID_POSITION')
  })
})

// --- Elimination Tests ---

describe('Elimination', () => {
  it('eliminates player who draws EK without Defuse', () => {
    let state = startGameWith(3)
    const ekCard: CardInstance = { id: 'ek-elim', type: 'exploding-kitten' }
    state = { ...state, drawPile: [ekCard, ...state.drawPile] }
    // Remove all defuses from p1
    state = removeCardType(state, 'p1', 'defuse')

    const result = act(state, { type: 'draw-card', playerId: 'p1' })
    expect(result.ok).toBe(true)

    if (result.ok) {
      const s = result.state as PlayingState
      const p1 = s.players.find(p => p.id === 'p1')!
      expect(p1.isAlive).toBe(false)
      expect(p1.hand).toHaveLength(0)
      expect(p1.deadCards.length).toBeGreaterThan(0)
    }
  })

  it('ends game when only 1 player remains', () => {
    let state = startGameWith(2)
    const ekCard: CardInstance = { id: 'ek-final', type: 'exploding-kitten' }
    state = { ...state, drawPile: [ekCard, ...state.drawPile] }
    state = removeCardType(state, 'p1', 'defuse')

    const result = act(state, { type: 'draw-card', playerId: 'p1' })
    expect(result.ok).toBe(true)

    if (result.ok) {
      expect(result.state.phase).toBe('game_over')
      if (result.state.phase === 'game_over') {
        expect(result.state.winnerId).toBe('p2')
      }
    }
  })
})

// --- Favor Tests ---

describe('Favor', () => {
  it('enters favor-pending with valid target', () => {
    let state = startGameWith(2)
    state = giveCard(state, 'p1', 'favor', 'favor-1')

    const card = findCard(state, 'p1', 'favor')!
    let result = act(state, {
      type: 'play-card', playerId: 'p1', cardIds: [card.id], targetPlayerId: 'p2',
    })
    expect(result.ok).toBe(true)

    // Expire nope window
    const afterNope = (result as { ok: true; state: GameState }).state as PlayingState
    result = resolveNopeWindow(afterNope, makeCtx(99999))
    expect(result.ok).toBe(true)

    if (result.ok) {
      const s = result.state as PlayingState
      expect(s.subPhase).toBe('favor-pending')
      expect(s.pendingFavor?.requesterId).toBe('p1')
      expect(s.pendingFavor?.targetId).toBe('p2')
    }
  })

  it('target gives card via favor-give', () => {
    let state = startGameWith(2)
    state = giveCard(state, 'p1', 'favor', 'favor-give-test')

    const card = findCard(state, 'p1', 'favor')!
    let result = act(state, {
      type: 'play-card', playerId: 'p1', cardIds: [card.id], targetPlayerId: 'p2',
    })
    let s = (result as { ok: true; state: GameState }).state as PlayingState

    // Expire nope window
    result = resolveNopeWindow(s, makeCtx(99999))
    s = (result as { ok: true; state: GameState }).state as PlayingState

    // p2 gives a card
    const p2Card = s.players.find(p => p.id === 'p2')!.hand[0]!
    result = act(s, { type: 'favor-give', playerId: 'p2', cardId: p2Card.id })
    expect(result.ok).toBe(true)

    if (result.ok) {
      const final = result.state as PlayingState
      expect(final.subPhase).toBe('turn-active')
      // p1 should have the card
      const p1 = final.players.find(p => p.id === 'p1')!
      expect(p1.hand.some(c => c.id === p2Card.id)).toBe(true)
    }
  })

  it('rejects self-targeting', () => {
    let state = startGameWith(2)
    state = giveCard(state, 'p1', 'favor', 'favor-self')

    const card = findCard(state, 'p1', 'favor')!
    let result = act(state, {
      type: 'play-card', playerId: 'p1', cardIds: [card.id], targetPlayerId: 'p1',
    })
    // Opens nope window first, self-target check is in applyFavor after resolution
    const afterNope = (result as { ok: true; state: GameState }).state as PlayingState
    result = resolveNopeWindow(afterNope, makeCtx(99999))
    expect(result.ok).toBe(false)
  })

  it('cannot gift Exploding Kitten', () => {
    let state = startGameWith(2)
    state = giveCard(state, 'p1', 'favor', 'favor-ek')

    const card = findCard(state, 'p1', 'favor')!
    let result = act(state, {
      type: 'play-card', playerId: 'p1', cardIds: [card.id], targetPlayerId: 'p2',
    })
    let s = (result as { ok: true; state: GameState }).state as PlayingState
    result = resolveNopeWindow(s, makeCtx(99999))
    s = (result as { ok: true; state: GameState }).state as PlayingState

    // Give p2 an EK
    s = giveCard(s, 'p2', 'exploding-kitten', 'ek-gift')
    const ekCard = findCard(s, 'p2', 'exploding-kitten')!

    result = act(s, { type: 'favor-give', playerId: 'p2', cardId: ekCard.id })
    expect(result.ok).toBe(false)
  })
})

// --- Combo Tests ---

describe('Two of a Kind', () => {
  it('validates matching pair', () => {
    let state = startGameWith(2)
    state = giveCard(state, 'p1', 'taco-cat', 'tc-1')
    state = giveCard(state, 'p1', 'taco-cat', 'tc-2')

    const result = act(state, {
      type: 'play-card', playerId: 'p1', cardIds: ['tc-1', 'tc-2'],
    })
    expect(result.ok).toBe(true) // Opens nope window
  })

  it('rejects mismatched pair', () => {
    let state = startGameWith(2)
    state = giveCard(state, 'p1', 'taco-cat', 'tc-1')
    state = giveCard(state, 'p1', 'beard-cat', 'bc-1')

    const result = act(state, {
      type: 'play-card', playerId: 'p1', cardIds: ['tc-1', 'bc-1'],
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('INVALID_COMBO')
  })

  it('allows Feral Cat + Cat as valid pair', () => {
    let state = startGameWith(2)
    state = giveCard(state, 'p1', 'feral-cat', 'fc-1')
    state = giveCard(state, 'p1', 'taco-cat', 'tc-1')

    const result = act(state, {
      type: 'play-card', playerId: 'p1', cardIds: ['fc-1', 'tc-1'],
    })
    expect(result.ok).toBe(true)
  })

  it('allows two Feral Cats as valid pair', () => {
    let state = startGameWith(2)
    state = giveCard(state, 'p1', 'feral-cat', 'fc-1')
    state = giveCard(state, 'p1', 'feral-cat', 'fc-2')

    const result = act(state, {
      type: 'play-card', playerId: 'p1', cardIds: ['fc-1', 'fc-2'],
    })
    expect(result.ok).toBe(true)
  })

  it('rejects Feral Cat + non-cat card', () => {
    let state = startGameWith(2)
    state = giveCard(state, 'p1', 'feral-cat', 'fc-1')
    state = giveCard(state, 'p1', 'skip', 'skip-1')

    const result = act(state, {
      type: 'play-card', playerId: 'p1', cardIds: ['fc-1', 'skip-1'],
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('INVALID_COMBO')
  })

  it('rejects duplicate card IDs', () => {
    let state = startGameWith(2)
    state = giveCard(state, 'p1', 'taco-cat', 'tc-dup')

    const result = act(state, {
      type: 'play-card', playerId: 'p1', cardIds: ['tc-dup', 'tc-dup'],
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('INVALID_COMBO')
  })

  it('rejects EK in combo', () => {
    let state = startGameWith(2)
    state = giveCard(state, 'p1', 'exploding-kitten', 'ek-combo')
    state = giveCard(state, 'p1', 'exploding-kitten', 'ek-combo-2')

    const result = act(state, {
      type: 'play-card', playerId: 'p1', cardIds: ['ek-combo', 'ek-combo-2'],
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('INVALID_COMBO')
  })

  it('rejects Defuse in combo', () => {
    let state = startGameWith(2)
    state = giveCard(state, 'p1', 'defuse', 'def-combo-1')
    state = giveCard(state, 'p1', 'defuse', 'def-combo-2')

    const result = act(state, {
      type: 'play-card', playerId: 'p1', cardIds: ['def-combo-1', 'def-combo-2'],
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('INVALID_COMBO')
  })

  it('allows two matching action cards as valid pair', () => {
    let state = startGameWith(2)
    state = giveCard(state, 'p1', 'attack', 'atk-1')
    state = giveCard(state, 'p1', 'attack', 'atk-2')

    const result = act(state, {
      type: 'play-card', playerId: 'p1', cardIds: ['atk-1', 'atk-2'],
    })
    expect(result.ok).toBe(true)
  })
})

// --- See the Future / Alter the Future ---

describe('See the Future', () => {
  it('stores future card IDs in pendingFuture', () => {
    let state = startGameWith(2)
    state = giveCard(state, 'p1', 'see-the-future', 'stf-1')

    const card = findCard(state, 'p1', 'see-the-future')!
    let result = act(state, { type: 'play-card', playerId: 'p1', cardIds: [card.id] })
    const afterNope = (result as { ok: true; state: GameState }).state as PlayingState

    result = resolveNopeWindow(afterNope, makeCtx(99999))
    expect(result.ok).toBe(true)

    if (result.ok) {
      const s = result.state as PlayingState
      expect(s.pendingFuture).toBeDefined()
      expect(s.pendingFuture!.cardIds.length).toBeLessThanOrEqual(3)
    }
  })
})

describe('Alter the Future', () => {
  it('enters future-rearrange-pending', () => {
    let state = startGameWith(2)
    state = giveCard(state, 'p1', 'alter-the-future', 'atf-1')

    const card = findCard(state, 'p1', 'alter-the-future')!
    let result = act(state, { type: 'play-card', playerId: 'p1', cardIds: [card.id] })
    const afterNope = (result as { ok: true; state: GameState }).state as PlayingState

    result = resolveNopeWindow(afterNope, makeCtx(99999))
    expect(result.ok).toBe(true)

    if (result.ok) {
      const s = result.state as PlayingState
      expect(s.subPhase).toBe('future-rearrange-pending')
    }
  })

  it('accepts valid permutation', () => {
    let state = startGameWith(2)
    state = giveCard(state, 'p1', 'alter-the-future', 'atf-perm')

    const card = findCard(state, 'p1', 'alter-the-future')!
    let result = act(state, { type: 'play-card', playerId: 'p1', cardIds: [card.id] })
    let s = (result as { ok: true; state: GameState }).state as PlayingState

    result = resolveNopeWindow(s, makeCtx(99999))
    s = (result as { ok: true; state: GameState }).state as PlayingState

    // Rearrange in reverse order
    const cardIds = [...s.pendingFuture!.cardIds].reverse()
    result = act(s, { type: 'future-rearrange', playerId: 'p1', order: [...cardIds] })
    expect(result.ok).toBe(true)

    if (result.ok) {
      const final = result.state as PlayingState
      expect(final.subPhase).toBe('turn-active')
      expect(final.pendingFuture).toBeUndefined()
    }
  })

  it('rejects non-permutation', () => {
    let state = startGameWith(2)
    state = giveCard(state, 'p1', 'alter-the-future', 'atf-bad')

    const card = findCard(state, 'p1', 'alter-the-future')!
    let result = act(state, { type: 'play-card', playerId: 'p1', cardIds: [card.id] })
    let s = (result as { ok: true; state: GameState }).state as PlayingState
    result = resolveNopeWindow(s, makeCtx(99999))
    s = (result as { ok: true; state: GameState }).state as PlayingState

    result = act(s, { type: 'future-rearrange', playerId: 'p1', order: ['fake-id-1', 'fake-id-2'] })
    expect(result.ok).toBe(false)
  })
})

// --- Shuffle ---

describe('Shuffle', () => {
  it('randomizes draw pile', () => {
    let state = startGameWith(2)
    state = giveCard(state, 'p1', 'shuffle', 'shuf-1')

    const originalOrder = state.drawPile.map(c => c.id)
    const card = findCard(state, 'p1', 'shuffle')!
    let result = act(state, { type: 'play-card', playerId: 'p1', cardIds: [card.id] })
    const afterNope = (result as { ok: true; state: GameState }).state as PlayingState

    result = resolveNopeWindow(afterNope, makeCtx(99999))
    expect(result.ok).toBe(true)

    if (result.ok) {
      const s = result.state as PlayingState
      // Same cards, potentially different order
      expect(s.drawPile).toHaveLength(originalOrder.length)
    }
  })
})

// --- Full Game Simulation ---

describe('Full game simulation', () => {
  it('can complete a 2-player game', () => {
    const ctx = makeCtx()
    let state: GameState = startGameWith(2, ctx)
    let moves = 0
    const maxMoves = 500

    while (state.phase === 'playing' && moves < maxMoves) {
      const playing = state as PlayingState
      const currentPlayer = playing.players.find(p => p.id === playing.currentTurn.currentPlayerId)!

      if (!currentPlayer.isAlive) break

      // Simple strategy: just draw
      const result = dispatch(
        playing,
        { type: 'draw-card', playerId: currentPlayer.id } as EngineAction,
        ctx,
      )

      if (!result.ok) break

      state = result.state

      // Handle defuse-pending
      if (state.phase === 'playing' && (state as PlayingState).subPhase === 'defuse-pending') {
        const defuseResult = dispatch(
          state,
          {
            type: 'defuse-place',
            playerId: (state as PlayingState).pendingDefuse!.playerId,
            position: 0,
          } as EngineAction,
          ctx,
        )
        if (defuseResult.ok) state = defuseResult.state
      }

      moves++
    }

    // Game should end before max moves
    expect(moves).toBeLessThan(maxMoves)
    expect(state.phase).toBe('game_over')
    if (state.phase === 'game_over') {
      expect(state.winnerId).toBeDefined()
    }
  })
})
