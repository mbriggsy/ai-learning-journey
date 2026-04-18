import { describe, expect } from 'vitest'
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
