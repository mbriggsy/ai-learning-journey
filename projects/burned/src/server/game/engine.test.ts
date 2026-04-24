import { describe, it, expect } from 'vitest'
import { createLobbyState, dispatch, buildDeck } from './engine'
import type { DispatchContext, DispatchResult, PlayingState, GameState } from './types'
import type { EngineAction } from '@shared/actions'
import type { CardInstance, GameEvent } from '@shared/types'

// --- Test Helpers ---

function makeCtx(now = 1000, opts: { nopeWindowMs?: number } = {}): DispatchContext {
  let seed = 42
  return {
    now,
    nopeWindowMs: opts.nopeWindowMs,
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
  let nextAction = action
  if (action.type === 'nope' && !('windowGeneration' in action) && state.phase === 'playing' && state.nopeWindow) {
    nextAction = { ...action, windowGeneration: state.nopeWindow.generation }
  }
  const fullAction = { playerId: 'p1', ...nextAction } as EngineAction
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

  it('deals 8 cards per player (1 Extraction + 7)', () => {
    const state = startGameWith(4)
    for (const player of state.players) {
      expect(player.hand).toHaveLength(8)
      expect(player.hand.some(c => c.type === 'extraction')).toBe(true)
    }
  })

  it('sets first player as current turn', () => {
    const state = startGameWith(4)
    expect(state.currentTurn.currentPlayerId).toBe('p1')
    expect(state.currentTurn.turnsRemaining).toBe(1)
  })

  it('inserts N-1 Burned cards into draw pile', () => {
    const state = startGameWith(4)
    const eksInDeck = state.drawPile.filter(c => c.type === 'burned')
    expect(eksInDeck).toHaveLength(3) // 4 players - 1
  })

  it('has no Burned cards in any hand', () => {
    const state = startGameWith(4)
    for (const player of state.players) {
      expect(player.hand.some(c => c.type === 'burned')).toBe(false)
    }
  })

  it('marks all players as alive', () => {
    const state = startGameWith(4)
    expect(state.players.every(p => p.isAlive)).toBe(true)
  })
})

// --- Deck Composition Tests ---

describe('buildDeck', () => {
  it('builds correct deck for 2 players (paw counts, no Burned)', () => {
    const deck = buildDeck(2, makeCtx())
    // buildDeck excludes Burned (startGame creates N-1 directly)
    // 2 players use paw tier: sum of all non-burned pawCounts = 44
    expect(deck.length).toBe(44)
    expect(deck.some(c => c.type === 'burned')).toBe(false)
  })

  it('builds correct deck for 5 players (non-paw counts, no Burned)', () => {
    const deck = buildDeck(5, makeCtx())
    // 5 players use non-paw tier: sum of all non-burned nonPawCounts = 67
    expect(deck.length).toBe(67)
    expect(deck.some(c => c.type === 'burned')).toBe(false)
  })

  it('builds correct deck for 10 players (both, no Burned)', () => {
    const deck = buildDeck(10, makeCtx())
    // 10 players use both: sum of all non-burned (paw+nonPaw) = 111
    expect(deck.length).toBe(111)
    expect(deck.some(c => c.type === 'burned')).toBe(false)
  })

  it('has unique card IDs', () => {
    const deck = buildDeck(5, makeCtx())
    const ids = deck.map(c => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

// --- Skip Tests ---

describe('Go Dark', () => {
  it('ends turn without drawing', () => {
    let state = startGameWith(2)
    const skipCard = findCard(state, 'p1', 'go-dark')
    if (!skipCard) {
      state = giveCard(state, 'p1', 'go-dark', 'skip-1')
    }
    const card = findCard(state, 'p1', 'go-dark')!
    const result = act(state, { type: 'play-card', playerId: 'p1', cardIds: [card.id] })
    expect(result.ok).toBe(true)
    // Skip opens nope window — action resolves after nope-window-expired
  })

  it('consumes 1 turn when under Reassign', () => {
    let state = startGameWith(2)
    // Give p1 a go-dark, set turnsRemaining to 2 (as if reassigned)
    state = giveCard(state, 'p1', 'go-dark', 'skip-test')
    state = { ...state, currentTurn: { currentPlayerId: 'p1', turnsRemaining: 2 } }

    const card = findCard(state, 'p1', 'go-dark')!

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

describe('Reassign', () => {
  it('transfers turn to next player with 2 extra turns', () => {
    let state = startGameWith(3)
    state = giveCard(state, 'p1', 'reassign', 'attack-1')

    const card = findCard(state, 'p1', 'reassign')!
    let result = act(state, { type: 'play-card', playerId: 'p1', cardIds: [card.id] })
    expect(result.ok).toBe(true)

    // Expire nope window
    const afterNope = (result as { ok: true; state: GameState }).state as PlayingState
    result = resolveNopeWindow(afterNope, makeCtx(99999))
    expect(result.ok).toBe(true)

    if (result.ok) {
      const s = result.state as PlayingState
      expect(s.currentTurn.currentPlayerId).toBe('p2')
      // Rules §10.2: target gets (attacker's remaining turns AFTER the current
      // one) + 2. Fresh turn → 0 + 2 = 2.
      expect(s.currentTurn.turnsRemaining).toBe(2)
    }
  })
})

// --- Targeted Attack Tests ---

describe('Direct Order', () => {
  it('targets a specific player', () => {
    let state = startGameWith(3)
    state = giveCard(state, 'p1', 'direct-order', 'ta-1')

    const card = findCard(state, 'p1', 'direct-order')!
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

  it('allows self-targeting per rules §13.8 (adds 2 turns to self)', () => {
    let state = startGameWith(3)
    state = giveCard(state, 'p1', 'direct-order', 'ta-self')

    const card = findCard(state, 'p1', 'direct-order')!
    let result = act(state, {
      type: 'play-card', playerId: 'p1', cardIds: [card.id], targetPlayerId: 'p1',
    })
    expect(result.ok).toBe(true)

    // Resolve nope window — self-targeted Direct Order applies
    const afterNope = (result as { ok: true; state: GameState }).state as PlayingState
    result = resolveNopeWindow(afterNope, makeCtx(99999))
    expect(result.ok).toBe(true)
    if (result.ok) {
      const s = result.state as PlayingState
      expect(s.currentTurn.currentPlayerId).toBe('p1')
      // Fresh turn (turnsRemaining=1). Self-DO consumes it, leaves 0, base +2.
      // Target (self) takes 2 turns.
      expect(s.currentTurn.turnsRemaining).toBe(2)
    }
  })

  it('requires a target', () => {
    let state = startGameWith(3)
    state = giveCard(state, 'p1', 'direct-order', 'ta-notarget')

    const card = findCard(state, 'p1', 'direct-order')!
    let result = act(state, { type: 'play-card', playerId: 'p1', cardIds: [card.id] })
    // This opens nope window, target check is deferred to resolution
    expect(result.ok).toBe(true)

    const afterNope = (result as { ok: true; state: GameState }).state as PlayingState
    result = resolveNopeWindow(afterNope, makeCtx(99999))
    // Now the effect applies — should fail because no target
    expect(result.ok).toBe(false)
  })

  it('stacks correctly when attacker is under a prior Attack (rules §10.2)', () => {
    // Scenario from the rules doc: attacker is on turn 1 of 2 (turnsRemaining=2).
    // Playing Direct Order consumes the current turn; the 1 leftover turn + base
    // +2 transfers to the target = 3.
    let state = startGameWith(3)
    state = giveCard(state, 'p1', 'direct-order', 'ta-stack')
    // Simulate p1 being mid-way through 2 attacked turns
    state = { ...state, currentTurn: { currentPlayerId: 'p1', turnsRemaining: 2 } }

    const card = findCard(state, 'p1', 'direct-order')!
    let result = act(state, {
      type: 'play-card', playerId: 'p1', cardIds: [card.id], targetPlayerId: 'p3',
    })
    expect(result.ok).toBe(true)

    const afterNope = (result as { ok: true; state: GameState }).state as PlayingState
    result = resolveNopeWindow(afterNope, makeCtx(99999))
    expect(result.ok).toBe(true)
    if (result.ok) {
      const s = result.state as PlayingState
      expect(s.currentTurn.currentPlayerId).toBe('p3')
      expect(s.currentTurn.turnsRemaining).toBe(3) // 1 leftover + 2 base
    }
  })

  it('stacks correctly on the attacker\'s last attacked turn (rules §10.2)', () => {
    // Scenario: attacker on turn 2 of 2 (turnsRemaining=1). No leftover,
    // target just gets the base 2.
    let state = startGameWith(3)
    state = giveCard(state, 'p1', 'direct-order', 'ta-last')
    state = { ...state, currentTurn: { currentPlayerId: 'p1', turnsRemaining: 1 } }

    const card = findCard(state, 'p1', 'direct-order')!
    let result = act(state, {
      type: 'play-card', playerId: 'p1', cardIds: [card.id], targetPlayerId: 'p2',
    })
    expect(result.ok).toBe(true)

    const afterNope = (result as { ok: true; state: GameState }).state as PlayingState
    result = resolveNopeWindow(afterNope, makeCtx(99999))
    expect(result.ok).toBe(true)
    if (result.ok) {
      const s = result.state as PlayingState
      expect(s.currentTurn.currentPlayerId).toBe('p2')
      expect(s.currentTurn.turnsRemaining).toBe(2) // 0 leftover + 2 base
    }
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
      // If not a Burned card, hand size increases by 1
      if (topCard.type !== 'burned') {
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
    const nopeState = giveCard(state, 'p2', 'intercepted', 'nope-1')

    const result = act(nopeState, { type: 'nope', playerId: 'p2' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('NOPE_NOT_ACTIVE')
  })

  it('rejects self-Nope on own action', () => {
    let state = startGameWith(2)
    state = giveCard(state, 'p1', 'go-dark', 'skip-self')
    state = giveCard(state, 'p1', 'intercepted', 'nope-self')

    const skipCard = findCard(state, 'p1', 'go-dark')!
    let result = act(state, { type: 'play-card', playerId: 'p1', cardIds: [skipCard.id] })
    const withWindow = (result as { ok: true; state: GameState }).state as PlayingState

    // p1 tries to Nope own Go Dark — should fail
    result = act(withWindow, { type: 'nope', playerId: 'p1' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('INVALID_ACTION')
  })

  it('increments chain depth on valid Nope', () => {
    let state = startGameWith(2)
    state = giveCard(state, 'p1', 'go-dark', 'skip-for-nope')
    state = giveCard(state, 'p2', 'intercepted', 'nope-test')

    // Play go-dark to open nope window
    const skipCard = findCard(state, 'p1', 'go-dark')!
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
    state = giveCard(state, 'p1', 'go-dark', 'skip-nope-chain')
    state = giveCard(state, 'p2', 'intercepted', 'nope-1')
    state = giveCard(state, 'p1', 'intercepted', 'nope-2')

    // Play go-dark → nope window
    const skipCard = findCard(state, 'p1', 'go-dark')!
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

  it('blocks current player from playing a second card while Nope window is open', () => {
    let state = startGameWith(2)
    state = giveCard(state, 'p1', 'go-dark', 'skip-1')
    state = giveCard(state, 'p1', 'go-dark', 'skip-2')

    // First Skip opens nope window
    const firstSkip = state.players.find(p => p.id === 'p1')!.hand.find(c => c.id === 'skip-1')!
    let result = act(state, { type: 'play-card', playerId: 'p1', cardIds: [firstSkip.id] })
    expect(result.ok).toBe(true)
    const withWindow = (result as { ok: true; state: GameState }).state as PlayingState
    expect(withWindow.nopeWindow).not.toBeNull()
    expect(withWindow.players.find(p => p.id === 'p1')!.hand.some(c => c.id === 'skip-1')).toBe(false)

    // Second play-card must be rejected — would overwrite nope window and drop first effect
    const secondSkip = withWindow.players.find(p => p.id === 'p1')!.hand.find(c => c.id === 'skip-2')!
    result = act(withWindow, { type: 'play-card', playerId: 'p1', cardIds: [secondSkip.id] })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('INVALID_ACTION')

    // Second card still in hand (nothing consumed)
    expect(withWindow.players.find(p => p.id === 'p1')!.hand.some(c => c.id === 'skip-2')).toBe(true)

    // draw-card is also blocked
    result = act(withWindow, { type: 'draw-card', playerId: 'p1' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('INVALID_ACTION')

    // After window resolves, first Skip's effect applies (turn advances to p2)
    result = resolveNopeWindow(withWindow, makeCtx(99999))
    expect(result.ok).toBe(true)
    if (result.ok) {
      const resolved = result.state as PlayingState
      expect(resolved.currentTurn.currentPlayerId).toBe('p2')
      expect(resolved.nopeWindow).toBeNull()
    }
  })
})

// --- Defuse Tests ---

describe('Extraction', () => {
  it('enters defuse-pending when drawing Burned with Extraction in hand', () => {
    let state = startGameWith(2)
    // Ensure top card is Burned and player has Extraction
    const ekCard: CardInstance = { id: 'ek-test', type: 'burned' }
    state = { ...state, drawPile: [ekCard, ...state.drawPile] }
    state = giveCard(state, 'p1', 'extraction', 'defuse-test')

    const result = act(state, { type: 'draw-card', playerId: 'p1' })
    expect(result.ok).toBe(true)

    if (result.ok) {
      const s = result.state as PlayingState
      expect(s.subPhase).toBe('defuse-pending')
      expect(s.pendingDefuse?.playerId).toBe('p1')
    }
  })

  it('allows placing Burned card back at valid position', () => {
    let state = startGameWith(2)
    const ekCard: CardInstance = { id: 'ek-place', type: 'burned' }
    state = { ...state, drawPile: [ekCard, ...state.drawPile] }
    state = giveCard(state, 'p1', 'extraction', 'defuse-place')

    // Draw EK → defuse-pending
    let result = act(state, { type: 'draw-card', playerId: 'p1' })
    const defuseState = (result as { ok: true; state: GameState }).state as PlayingState

    // Place EK at position 0 (top)
    result = act(defuseState, { type: 'defuse-place', playerId: 'p1', position: 0 })
    expect(result.ok).toBe(true)

    if (result.ok) {
      const s = result.state as PlayingState
      expect(s.subPhase).toBe('turn-active') // or advanced turn
      // Burned card should be in draw pile
      expect(s.drawPile.some(c => c.type === 'burned')).toBe(true)
      // Burned card should NOT be in player's hand
      const p1 = s.players.find(p => p.id === 'p1')!
      expect(p1.hand.some(c => c.type === 'burned')).toBe(false)
    }
  })

  it('rejects invalid position', () => {
    let state = startGameWith(2)
    const ekCard: CardInstance = { id: 'ek-invalid', type: 'burned' }
    state = { ...state, drawPile: [ekCard, ...state.drawPile] }
    state = giveCard(state, 'p1', 'extraction', 'defuse-invalid')

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
  it('eliminates player who draws Burned without Extraction', () => {
    let state = startGameWith(3)
    const ekCard: CardInstance = { id: 'ek-elim', type: 'burned' }
    state = { ...state, drawPile: [ekCard, ...state.drawPile] }
    // Remove all extractions from p1
    state = removeCardType(state, 'p1', 'extraction')

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
    const ekCard: CardInstance = { id: 'ek-final', type: 'burned' }
    state = { ...state, drawPile: [ekCard, ...state.drawPile] }
    state = removeCardType(state, 'p1', 'extraction')

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

describe('Call in a Favor', () => {
  it('enters favor-pending with valid target', () => {
    let state = startGameWith(2)
    state = giveCard(state, 'p1', 'call-in-a-favor', 'favor-1')

    const card = findCard(state, 'p1', 'call-in-a-favor')!
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
    state = giveCard(state, 'p1', 'call-in-a-favor', 'favor-give-test')

    const card = findCard(state, 'p1', 'call-in-a-favor')!
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
    state = giveCard(state, 'p1', 'call-in-a-favor', 'favor-self')

    const card = findCard(state, 'p1', 'call-in-a-favor')!
    let result = act(state, {
      type: 'play-card', playerId: 'p1', cardIds: [card.id], targetPlayerId: 'p1',
    })
    // Opens nope window first, self-target check is in applyFavor after resolution
    const afterNope = (result as { ok: true; state: GameState }).state as PlayingState
    result = resolveNopeWindow(afterNope, makeCtx(99999))
    expect(result.ok).toBe(false)
  })

  it('cannot gift Burned card', () => {
    let state = startGameWith(2)
    state = giveCard(state, 'p1', 'call-in-a-favor', 'favor-ek')

    const card = findCard(state, 'p1', 'call-in-a-favor')!
    let result = act(state, {
      type: 'play-card', playerId: 'p1', cardIds: [card.id], targetPlayerId: 'p2',
    })
    let s = (result as { ok: true; state: GameState }).state as PlayingState
    result = resolveNopeWindow(s, makeCtx(99999))
    s = (result as { ok: true; state: GameState }).state as PlayingState

    // Give p2 a Burned card
    s = giveCard(s, 'p2', 'burned', 'ek-gift')
    const ekCard = findCard(s, 'p2', 'burned')!

    result = act(s, { type: 'favor-give', playerId: 'p2', cardId: ekCard.id })
    expect(result.ok).toBe(false)
  })
})

// --- Combo Tests ---

describe('Two of a Kind', () => {
  it('validates matching pair', () => {
    let state = startGameWith(2)
    state = giveCard(state, 'p1', 'dash-barlowe', 'tc-1')
    state = giveCard(state, 'p1', 'dash-barlowe', 'tc-2')

    const result = act(state, {
      type: 'play-card', playerId: 'p1', cardIds: ['tc-1', 'tc-2'], targetPlayerId: 'p2',
    })
    expect(result.ok).toBe(true) // Opens nope window
  })

  it('rejects mismatched pair', () => {
    let state = startGameWith(2)
    state = giveCard(state, 'p1', 'dash-barlowe', 'tc-1')
    state = giveCard(state, 'p1', 'vera-khan', 'bc-1')

    const result = act(state, {
      type: 'play-card', playerId: 'p1', cardIds: ['tc-1', 'bc-1'],
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('INVALID_COMBO')
  })

  it('allows Agent X + Operative as valid pair', () => {
    let state = startGameWith(2)
    state = giveCard(state, 'p1', 'agent-x', 'fc-1')
    state = giveCard(state, 'p1', 'dash-barlowe', 'tc-1')

    const result = act(state, {
      type: 'play-card', playerId: 'p1', cardIds: ['fc-1', 'tc-1'], targetPlayerId: 'p2',
    })
    expect(result.ok).toBe(true)
  })

  it('allows two Agent X as valid pair', () => {
    let state = startGameWith(2)
    state = giveCard(state, 'p1', 'agent-x', 'fc-1')
    state = giveCard(state, 'p1', 'agent-x', 'fc-2')

    const result = act(state, {
      type: 'play-card', playerId: 'p1', cardIds: ['fc-1', 'fc-2'], targetPlayerId: 'p2',
    })
    expect(result.ok).toBe(true)
  })

  it('rejects Agent X + non-operative card', () => {
    let state = startGameWith(2)
    state = giveCard(state, 'p1', 'agent-x', 'fc-1')
    state = giveCard(state, 'p1', 'go-dark', 'skip-1')

    const result = act(state, {
      type: 'play-card', playerId: 'p1', cardIds: ['fc-1', 'skip-1'],
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('INVALID_COMBO')
  })

  it('rejects duplicate card IDs', () => {
    let state = startGameWith(2)
    state = giveCard(state, 'p1', 'dash-barlowe', 'tc-dup')

    const result = act(state, {
      type: 'play-card', playerId: 'p1', cardIds: ['tc-dup', 'tc-dup'],
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('INVALID_COMBO')
  })

  it('rejects Burned in combo', () => {
    let state = startGameWith(2)
    state = giveCard(state, 'p1', 'burned', 'ek-combo')
    state = giveCard(state, 'p1', 'burned', 'ek-combo-2')

    const result = act(state, {
      type: 'play-card', playerId: 'p1', cardIds: ['ek-combo', 'ek-combo-2'],
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('INVALID_COMBO')
  })

  it('rejects Extraction in combo', () => {
    let state = startGameWith(2)
    state = giveCard(state, 'p1', 'extraction', 'def-combo-1')
    state = giveCard(state, 'p1', 'extraction', 'def-combo-2')

    const result = act(state, {
      type: 'play-card', playerId: 'p1', cardIds: ['def-combo-1', 'def-combo-2'],
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('INVALID_COMBO')
  })

  // Regression: overnight E2E audit 2026-04-23 A-01. Server handleSingleCard
  // accepted a single Intercepted play, stripped it from hand + discarded,
  // opened a nope window, then errored on resolve with the card permanently
  // lost. Client validator (combo-validation.ts) blocks this, but
  // zero-trust: server must mirror.
  it('rejects single Intercepted play upfront — hand and discard unchanged (A-01)', () => {
    let state = startGameWith(2)
    state = giveCard(state, 'p1', 'intercepted', 'nope-solo')

    const handBefore = state.players.find(p => p.id === 'p1')!.hand.length
    const discardBefore = state.discardPile.length

    const result = act(state, { type: 'play-card', playerId: 'p1', cardIds: ['nope-solo'] })

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('INVALID_ACTION')

    // Hand unchanged
    const handAfter = (result.state as PlayingState).players.find(p => p.id === 'p1')!.hand.length
    expect(handAfter).toBe(handBefore)
    // Discard unchanged
    expect((result.state as PlayingState).discardPile.length).toBe(discardBefore)
    // No stray nope window
    expect((result.state as PlayingState).nopeWindow).toBeNull()
    // Card still in hand
    expect((result.state as PlayingState).players.find(p => p.id === 'p1')!.hand.some(c => c.id === 'nope-solo')).toBe(true)
  })

  it('allows two matching action cards as valid pair', () => {
    let state = startGameWith(2)
    state = giveCard(state, 'p1', 'reassign', 'atk-1')
    state = giveCard(state, 'p1', 'reassign', 'atk-2')

    const result = act(state, {
      type: 'play-card', playerId: 'p1', cardIds: ['atk-1', 'atk-2'], targetPlayerId: 'p2',
    })
    expect(result.ok).toBe(true)
  })
})

// --- See the Future / Alter the Future ---

describe('Intel Briefing', () => {
  it('stores future card IDs in pendingFuture', () => {
    let state = startGameWith(2)
    state = giveCard(state, 'p1', 'intel-briefing', 'stf-1')

    const card = findCard(state, 'p1', 'intel-briefing')!
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

  it('clears pendingFuture on safe draw so peek does not leak into next Attack turn', () => {
    let state = startGameWith(2)
    state = giveCard(state, 'p1', 'intel-briefing', 'stf-leak')

    // Simulate p1 being mid-Attack (2 turns remaining)
    state = { ...state, currentTurn: { ...state.currentTurn, turnsRemaining: 2 } }

    const stfCard = findCard(state, 'p1', 'intel-briefing')!
    let result = act(state, { type: 'play-card', playerId: 'p1', cardIds: [stfCard.id] })
    let s = (result as { ok: true; state: GameState }).state as PlayingState

    // Resolve Intel Briefing → pendingFuture set
    result = resolveNopeWindow(s, makeCtx(99999))
    s = (result as { ok: true; state: GameState }).state as PlayingState
    expect(s.pendingFuture).toBeDefined()
    expect(s.currentTurn.currentPlayerId).toBe('p1')
    expect(s.currentTurn.turnsRemaining).toBe(2)

    // p1 draws safely — still p1's turn (turnsRemaining → 1)
    result = act(s, { type: 'draw-card', playerId: 'p1' })
    expect(result.ok).toBe(true)
    if (result.ok) {
      const drawn = result.state as PlayingState
      expect(drawn.currentTurn.currentPlayerId).toBe('p1')
      expect(drawn.currentTurn.turnsRemaining).toBe(1)
      // pendingFuture must NOT persist — peek was of a pile that no longer has its top card
      expect(drawn.pendingFuture).toBeUndefined()
    }
  })
})

describe('Falsify Intel', () => {
  it('enters future-rearrange-pending', () => {
    let state = startGameWith(2)
    state = giveCard(state, 'p1', 'falsify-intel', 'atf-1')

    const card = findCard(state, 'p1', 'falsify-intel')!
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
    state = giveCard(state, 'p1', 'falsify-intel', 'atf-perm')

    const card = findCard(state, 'p1', 'falsify-intel')!
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
    state = giveCard(state, 'p1', 'falsify-intel', 'atf-bad')

    const card = findCard(state, 'p1', 'falsify-intel')!
    let result = act(state, { type: 'play-card', playerId: 'p1', cardIds: [card.id] })
    let s = (result as { ok: true; state: GameState }).state as PlayingState
    result = resolveNopeWindow(s, makeCtx(99999))
    s = (result as { ok: true; state: GameState }).state as PlayingState

    result = act(s, { type: 'future-rearrange', playerId: 'p1', order: ['fake-id-1', 'fake-id-2'] })
    expect(result.ok).toBe(false)
  })
})

// --- Shuffle ---

describe('Burn the Files', () => {
  it('randomizes draw pile', () => {
    let state = startGameWith(2)
    state = giveCard(state, 'p1', 'burn-the-files', 'shuf-1')

    const originalOrder = state.drawPile.map(c => c.id)
    const card = findCard(state, 'p1', 'burn-the-files')!
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

// Regression lock for the comms-history bug fixed in commit 02417202:
// engine.ts:47 used to reset state.events to [] on every dispatch, meaning
// the server only ever carried the last dispatch's events. Reloaded clients
// lost history. These tests ensure future refactors don't reintroduce the
// per-dispatch clear pattern.
describe('Event log — cumulative semantics (history regression lock)', () => {
  it('preserves game-started event after a subsequent dispatch', () => {
    const state = startGameWith(3)
    expect(state.events.some(e => e.type === 'game-started')).toBe(true)

    // Any subsequent dispatch must not wipe the prior events
    const result = act(state, { type: 'draw-card', playerId: state.currentTurn.currentPlayerId })
    expect(result.ok).toBe(true)
    const after = result.state as PlayingState

    // game-started from start-game must STILL be in the log — this is the
    // single most important assertion. If it fails, events are per-dispatch
    // again and the dossier will lose history on every action.
    expect(after.events.some(e => e.type === 'game-started')).toBe(true)
  })

  it('accumulates events across multiple dispatches (no per-dispatch reset)', () => {
    let state = startGameWith(3)
    const startingCount = state.events.length

    // Fire three dispatches in a row — any action that reaches ok() will do.
    // Each successful dispatch should grow (or at minimum not shrink below
    // the starting count) state.events.
    for (let i = 0; i < 3; i++) {
      const actor = state.currentTurn.currentPlayerId
      const result = act(state, { type: 'draw-card', playerId: actor })
      if (!result.ok) break
      state = result.state as PlayingState
      if (state.phase !== 'playing') break
    }

    // After multiple dispatches, the log must contain at least the original
    // start-game events PLUS the new draws. A per-dispatch clear would have
    // left us with only the very last dispatch's events (1-2 items).
    expect(state.events.length).toBeGreaterThanOrEqual(startingCount)
    expect(state.events.some(e => e.type === 'game-started')).toBe(true)
  })

  it('caps state.events at 500 — oldest events roll off the front', () => {
    let state = startGameWith(3)

    // Synthetically pad state.events beyond the cap. 600 events + the
    // dispatch below's additions should force the cap to kick in.
    const padding: GameEvent[] = Array.from({ length: 600 }, (_, i) => ({
      type: 'turn-started' as const,
      playerId: `padding-${i}`,
      turnsRemaining: 1,
    }))
    state = { ...state, events: padding }

    // Any dispatch that goes through ok() applies the cap. draw-card is
    // the most likely to succeed here.
    const result = act(state, { type: 'draw-card', playerId: state.currentTurn.currentPlayerId })
    expect(result.ok).toBe(true)
    const capped = result.state as PlayingState

    // Cap enforced at 500 events max
    expect(capped.events.length).toBeLessThanOrEqual(500)

    // The very oldest padding events (the first ones we synthesized) must
    // have rolled off. Newer padding and the fresh card-drawn remain.
    expect(capped.events.some(e =>
      e.type === 'turn-started' && e.playerId === 'padding-0'
    )).toBe(false)
    // Sanity: very recent padding stayed
    expect(capped.events.some(e =>
      e.type === 'turn-started' && e.playerId === 'padding-599'
    )).toBe(true)
  })

  it('createLobbyState() returns empty events (no cross-game leakage)', () => {
    const lobby = createLobbyState()
    expect(lobby.events).toEqual([])
  })
})
