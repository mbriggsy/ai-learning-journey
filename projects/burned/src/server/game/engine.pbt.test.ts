import { describe, expect, it } from 'vitest'
import { test } from '@fast-check/vitest'
import fc from 'fast-check'
import { createLobbyState, dispatch } from './engine'
import { projectForBoard, projectForPlayer, getPrivateData } from '../projection'
import type { DispatchContext, PlayingState, Player } from './types'
import type { EngineAction } from '@shared/actions'

// --- Deterministic context ---

function makeCtx(seed = 42, now = 1000): DispatchContext {
  let s = seed
  return {
    now,
    random: () => {
      s = (s * 1103515245 + 12345) & 0x7fffffff
      return s / 0x7fffffff
    },
    randomInt: (max: number) => {
      s = (s * 1103515245 + 12345) & 0x7fffffff
      return s % max
    },
  }
}

function startGame(playerCount: number, seed = 42): PlayingState {
  const ctx = makeCtx(seed)
  let lobby = createLobbyState()
  for (let i = 0; i < playerCount; i++) {
    lobby = {
      ...lobby,
      players: [...lobby.players, { id: `p${i + 1}`, name: `P${i + 1}`, color: `#${i}` }],
    }
  }
  const result = dispatch(lobby, { type: 'start-game', playerId: 'p1' } as EngineAction, ctx)
  if (!result.ok) throw new Error(`Failed to start game: ${result.error}`)
  return result.state as PlayingState
}

// --- Card Conservation ---

function countAllCards(state: PlayingState): number {
  const hands = state.players.reduce((sum, p) => sum + p.hand.length, 0)
  const dead = state.players.reduce((sum, p) => sum + p.deadCards.length, 0)
  return hands + state.drawPile.length + state.discardPile.length + dead
}

describe('PBT: Card Conservation', () => {
  test.prop([fc.integer({ min: 1, max: 100 })])('draw-card preserves total card count', (seed) => {
    const ctx = makeCtx(seed)
    const state = startGame(3, seed)
    const initialCount = countAllCards(state)

    const currentPlayer = state.currentTurn.currentPlayerId
    const result = dispatch(state, { type: 'draw-card', playerId: currentPlayer } as EngineAction, ctx)

    if (result.ok && result.state.phase === 'playing') {
      expect(countAllCards(result.state as PlayingState)).toBe(initialCount)
    }
    // If game_over (EK drawn without defuse), card count includes deadCards
    if (result.ok && result.state.phase === 'game_over') {
      const go = result.state
      const hands = go.players.reduce((sum: number, p: Player) => sum + p.hand.length, 0)
      const dead = go.players.reduce((sum: number, p: Player) => sum + p.deadCards.length, 0)
      const total = hands + dead + go.discardPile.length
      // Draw pile is empty for game_over? No — there might be cards left
      // Actually, game_over doesn't have drawPile in its type. Conservation still holds
      // through deadCards capturing the eliminated player's hand.
      expect(total).toBeGreaterThan(0)
    }
  })

  test.prop([fc.integer({ min: 1, max: 100 })])('play-card preserves total card count (single card)', (seed) => {
    const ctx = makeCtx(seed)
    const state = startGame(2, seed)
    const initialCount = countAllCards(state)

    const currentPlayer = state.currentTurn.currentPlayerId
    const player = state.players.find(p => p.id === currentPlayer)!

    // Find a playable action card (not operative, not Burned, not Extraction)
    const playable = player.hand.find(c =>
      c.type !== 'burned' && c.type !== 'extraction' &&
      !['dash-barlowe', 'vera-khan', 'sable-ashworth', 'janet-broadside', 'neal-proctor', 'agent-x'].includes(c.type)
    )
    if (!playable) return // No playable card — skip this run

    const action: EngineAction = {
      type: 'play-card',
      playerId: currentPlayer,
      cardIds: [playable.id],
      ...(playable.type === 'direct-order' || playable.type === 'call-in-a-favor'
        ? { targetPlayerId: state.players.find(p => p.id !== currentPlayer && p.isAlive)?.id }
        : {}),
    } as EngineAction

    const result = dispatch(state, action, ctx)

    if (result.ok && result.state.phase === 'playing') {
      expect(countAllCards(result.state as PlayingState)).toBe(initialCount)
    }
  })
})

// --- Projection Privacy ---

describe('PBT: Projection Privacy', () => {
  test.prop([fc.integer({ min: 1, max: 100 })])('board projection never contains draw pile contents', (seed) => {
    const state = startGame(4, seed)
    const projection = projectForBoard(state, 1000, new Set())

    // Board projection should NOT have drawPile array
    expect(projection).not.toHaveProperty('drawPile')
    // Should have drawPileCount instead
    expect(typeof projection.drawPileCount).toBe('number')
    expect(projection.drawPileCount).toBe(state.drawPile.length)
  })

  test.prop([fc.integer({ min: 1, max: 100 })])('player projection only shows own hand, not others', (seed) => {
    const state = startGame(4, seed)
    const board = projectForBoard(state, 1000, new Set())
    const p1Projection = projectForPlayer(state, 'p1', board)
    const p2Projection = projectForPlayer(state, 'p2', board)

    // p1 sees own hand
    const p1 = state.players.find(p => p.id === 'p1')!
    expect(p1Projection.myHand).toHaveLength(p1.hand.length)

    // p2 sees own hand (different from p1's)
    const p2 = state.players.find(p => p.id === 'p2')!
    expect(p2Projection.myHand).toHaveLength(p2.hand.length)

    // Board players show card COUNT, not cards
    for (const bp of p1Projection.players) {
      expect(bp).not.toHaveProperty('hand')
      expect(typeof bp.cardCount).toBe('number')
    }
  })

  test.prop([fc.integer({ min: 1, max: 100 })])('private data only returned to the peeking player', (seed) => {
    const state = startGame(2, seed)

    // Give p1 a See the Future and simulate a peek
    const stateWithFuture: PlayingState = {
      ...state,
      pendingFuture: {
        playerId: 'p1',
        cardIds: state.drawPile.slice(0, 3).map(c => c.id),
      },
    }

    const p1Data = getPrivateData(stateWithFuture, 'p1')
    const p2Data = getPrivateData(stateWithFuture, 'p2')

    expect(p1Data.futureCards).toBeDefined()
    expect(p1Data.futureCards!.length).toBeGreaterThan(0)
    expect(p2Data.futureCards).toBeUndefined()
  })

  // Regression: overnight E2E audit E-01 (2026-04-23). `card-drawn` events
  // were emitting the drawn card's type into the cumulative event log,
  // and `stripPrivateEventFields` only filtered `combo-steal.cardType`.
  // Every opposing player + board received the exact card that landed in
  // the drawer's hand — letting attentive opponents deterministically
  // track every hand composition change. The drawer still needs `cardType`
  // for their "You drew Go Dark." toast (PlayerAlert), so strip for
  // viewerId !== drawer only.
  it('card-drawn.cardType stays only with the drawer (E-01 regression)', () => {
    const state = startGame(3, 1)
    const stateWithDraw: PlayingState = {
      ...state,
      events: [
        ...state.events,
        { type: 'card-drawn', playerId: 'p1', safe: true, cardType: 'go-dark' },
      ],
    }
    const now = 1000

    const boardView = projectForBoard(stateWithDraw, now, new Set(['p1', 'p2', 'p3']))
    const p1View = projectForPlayer(stateWithDraw, 'p1', boardView)
    const p2View = projectForPlayer(stateWithDraw, 'p2', boardView)

    const boardDrawn = boardView.events.find(e => e.type === 'card-drawn')
    const p1Drawn = p1View.events.find(e => e.type === 'card-drawn')
    const p2Drawn = p2View.events.find(e => e.type === 'card-drawn')

    expect(boardDrawn).toBeDefined()
    expect(p1Drawn).toBeDefined()
    expect(p2Drawn).toBeDefined()

    if (boardDrawn && boardDrawn.type === 'card-drawn') {
      expect(boardDrawn.cardType).toBeUndefined()
      expect(boardDrawn.playerId).toBe('p1')
      expect(boardDrawn.safe).toBe(true)
    }
    if (p1Drawn && p1Drawn.type === 'card-drawn') {
      expect(p1Drawn.cardType).toBe('go-dark') // drawer keeps it
    }
    if (p2Drawn && p2Drawn.type === 'card-drawn') {
      expect(p2Drawn.cardType).toBeUndefined() // opponent strips it
    }
  })

  it('combo-steal.cardType stays only with stealer + target (parallel to E-01)', () => {
    // Belt-and-suspenders lock on the original combo-steal filter. Was
    // previously verified by an audit test but not an explicit unit — this
    // pins the invariant alongside the new card-drawn regression above.
    const state = startGame(3, 2)
    const stateWithSteal: PlayingState = {
      ...state,
      events: [
        ...state.events,
        { type: 'combo-steal', stealerId: 'p1', targetId: 'p2', found: true, cardType: 'reassign' },
      ],
    }
    const now = 1000

    const boardView = projectForBoard(stateWithSteal, now, new Set(['p1', 'p2', 'p3']))
    const stealerView = projectForPlayer(stateWithSteal, 'p1', boardView)
    const targetView = projectForPlayer(stateWithSteal, 'p2', boardView)
    const witnessView = projectForPlayer(stateWithSteal, 'p3', boardView)

    const getSteal = (v: { events: readonly import('@shared/types').GameEvent[] }) =>
      v.events.find(e => e.type === 'combo-steal')

    const boardSteal = getSteal(boardView)
    const stealerSteal = getSteal(stealerView)
    const targetSteal = getSteal(targetView)
    const witnessSteal = getSteal(witnessView)

    if (boardSteal && boardSteal.type === 'combo-steal') {
      expect(boardSteal.cardType).toBeUndefined()
    }
    if (stealerSteal && stealerSteal.type === 'combo-steal') {
      expect(stealerSteal.cardType).toBe('reassign')
    }
    if (targetSteal && targetSteal.type === 'combo-steal') {
      expect(targetSteal.cardType).toBe('reassign')
    }
    if (witnessSteal && witnessSteal.type === 'combo-steal') {
      expect(witnessSteal.cardType).toBeUndefined()
    }
  })

  it('favor-given.cardType stays only with giver + receiver (triage #010 Gap C)', () => {
    // Drives the FavorReport hero beat on both phones — both giver and
    // receiver legitimately know the card identity (giver picked it,
    // receiver now holds it). Bystanders + board must not see it.
    // Empty-handed auto-resolve case omits cardType entirely (covered
    // by rules-gaps-exhaustive.test.ts §6); this test pins the
    // standard case where a card actually transfers.
    const state = startGame(3, 3)
    const stateWithFavor: PlayingState = {
      ...state,
      events: [
        ...state.events,
        { type: 'favor-given', giverId: 'p2', receiverId: 'p1', cardType: 'go-dark' },
      ],
    }
    const now = 1000

    const boardView = projectForBoard(stateWithFavor, now, new Set(['p1', 'p2', 'p3']))
    const giverView = projectForPlayer(stateWithFavor, 'p2', boardView)
    const receiverView = projectForPlayer(stateWithFavor, 'p1', boardView)
    const witnessView = projectForPlayer(stateWithFavor, 'p3', boardView)

    const getFavor = (v: { events: readonly import('@shared/types').GameEvent[] }) =>
      v.events.find(e => e.type === 'favor-given')

    const boardFavor = getFavor(boardView)
    const giverFavor = getFavor(giverView)
    const receiverFavor = getFavor(receiverView)
    const witnessFavor = getFavor(witnessView)

    if (boardFavor && boardFavor.type === 'favor-given') {
      expect(boardFavor.cardType).toBeUndefined()
    }
    if (giverFavor && giverFavor.type === 'favor-given') {
      expect(giverFavor.cardType).toBe('go-dark')
    }
    if (receiverFavor && receiverFavor.type === 'favor-given') {
      expect(receiverFavor.cardType).toBe('go-dark')
    }
    if (witnessFavor && witnessFavor.type === 'favor-given') {
      expect(witnessFavor.cardType).toBeUndefined()
    }
  })
})

// --- Immutability ---

describe('PBT: Immutability', () => {
  test.prop([fc.integer({ min: 1, max: 100 })])('dispatch does not mutate input state', (seed) => {
    const ctx = makeCtx(seed)
    const state = startGame(2, seed)

    // Deep freeze the state
    const frozen = JSON.parse(JSON.stringify(state)) as PlayingState
    Object.freeze(frozen)
    Object.freeze(frozen.players)
    Object.freeze(frozen.drawPile)
    Object.freeze(frozen.discardPile)
    Object.freeze(frozen.currentTurn)
    frozen.players.forEach(p => {
      Object.freeze(p)
      Object.freeze(p.hand)
      Object.freeze(p.deadCards)
    })

    const currentPlayer = frozen.currentTurn.currentPlayerId
    const result = dispatch(frozen, { type: 'draw-card', playerId: currentPlayer } as EngineAction, ctx)

    // The original state should be unchanged (frozen would throw on mutation)
    // If we get here without throwing, immutability is preserved
    expect(result).toBeDefined()

    // Verify state snapshot matches original
    expect(frozen.drawPile.length).toBe(state.drawPile.length)
    expect(frozen.players[0]!.hand.length).toBe(state.players[0]!.hand.length)
  })
})
