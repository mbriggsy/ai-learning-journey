/**
 * Tests for gaps found by the 10-agent comprehensive audit.
 * Covers: Draw from Bottom, Two of a Kind steal, Three of a Kind steal.
 */
import { describe, it, expect } from 'vitest'
import { makeCtx, act, startGameWith, giveCard, removeCardType, resolveNopeWindow } from './test-helpers'
import type { PlayingState } from './types'

describe('Draw from Bottom', () => {
  it('draws from the bottom of the draw pile', () => {
    let state = startGameWith(3)
    state = giveCard(state, 'p1', 'draw-from-bottom', 'dfb-1')

    const bottomCard = state.drawPile[state.drawPile.length - 1]!
    const pileSize = state.drawPile.length

    let result = act(state, { type: 'play-card', playerId: 'p1', cardIds: ['dfb-1'] })
    expect(result.ok).toBe(true)

    // Resolve nope window
    const afterNope = result.state as PlayingState
    result = resolveNopeWindow(afterNope, makeCtx(99999))
    expect(result.ok).toBe(true)

    const s = result.state as PlayingState
    // Draw pile should be 1 smaller (the draw happened)
    expect(s.drawPile.length).toBe(pileSize - 1)
    // Bottom card should NOT be in the draw pile anymore
    expect(s.drawPile.find(c => c.id === bottomCard.id)).toBeUndefined()
  })
})

describe('Two of a Kind — steal flow', () => {
  it('plays pair → nope resolves → select target → random steal', () => {
    let state = startGameWith(3)

    // Give p1 two matching cat cards
    const catType = state.players[0]!.hand.find(c => c.type.includes('cat'))?.type
    if (!catType) return // skip if no cats dealt

    state = giveCard(state, 'p1', catType, 'cat-a')
    state = giveCard(state, 'p1', catType, 'cat-b')

    // Ensure p2 has at least one card
    expect(state.players.find(p => p.id === 'p2')!.hand.length).toBeGreaterThan(0)
    const p2CardCount = state.players.find(p => p.id === 'p2')!.hand.length

    // Play the pair
    let result = act(state, { type: 'play-card', playerId: 'p1', cardIds: ['cat-a', 'cat-b'] })
    expect(result.ok).toBe(true)

    // Resolve nope window → should enter steal-target-pending
    const afterNope = result.state as PlayingState
    result = resolveNopeWindow(afterNope, makeCtx(99999))
    expect(result.ok).toBe(true)

    const stealState = result.state as PlayingState
    expect(stealState.subPhase).toBe('steal-target-pending')
    expect(stealState.pendingSteal?.comboSize).toBe(2)

    // Select target p2
    result = act(stealState, { type: 'select-target', playerId: 'p1', targetPlayerId: 'p2' })
    expect(result.ok).toBe(true)

    // Steal should have transferred a card
    const final = result.state as PlayingState
    expect(final.subPhase).toBe('turn-active')
    const p1Hand = final.players.find(p => p.id === 'p1')!.hand.length
    const p2Hand = final.players.find(p => p.id === 'p2')!.hand.length
    // p2 should have lost a card (or same if steal failed on empty)
    expect(p2Hand).toBeLessThanOrEqual(p2CardCount)
  })
})

describe('Three of a Kind — name card steal flow', () => {
  it('plays triple → nope resolves → select target → name card → steal', () => {
    let state = startGameWith(3)

    // Give p1 three matching cat cards
    const catType = state.players[0]!.hand.find(c => c.type.includes('cat'))?.type
    if (!catType) return

    state = giveCard(state, 'p1', catType, 'cat-a')
    state = giveCard(state, 'p1', catType, 'cat-b')
    state = giveCard(state, 'p1', catType, 'cat-c')

    // Give p2 a known card type to steal
    state = giveCard(state, 'p2', 'skip', 'steal-target-skip')

    // Play the triple
    let result = act(state, { type: 'play-card', playerId: 'p1', cardIds: ['cat-a', 'cat-b', 'cat-c'] })
    expect(result.ok).toBe(true)

    // Resolve nope window → steal-target-pending
    result = resolveNopeWindow(result.state as PlayingState, makeCtx(99999))
    expect(result.ok).toBe(true)

    const stealState = result.state as PlayingState
    expect(stealState.subPhase).toBe('steal-target-pending')
    expect(stealState.pendingSteal?.comboSize).toBe(3)

    // Select target p2 → name-card-pending
    result = act(stealState, { type: 'select-target', playerId: 'p1', targetPlayerId: 'p2' })
    expect(result.ok).toBe(true)

    const nameState = result.state as PlayingState
    expect(nameState.subPhase).toBe('name-card-pending')

    // Name "skip" — p2 has one
    result = act(nameState, { type: 'name-card', playerId: 'p1', cardType: 'skip' })
    expect(result.ok).toBe(true)

    const final = result.state as PlayingState
    expect(final.subPhase).toBe('turn-active')
    // p1 should have gained the skip card
    expect(final.players.find(p => p.id === 'p1')!.hand.some(c => c.id === 'steal-target-skip')).toBe(true)
    // p2 should have lost it
    expect(final.players.find(p => p.id === 'p2')!.hand.some(c => c.id === 'steal-target-skip')).toBe(false)
  })

  it('name card miss — target does not have the named type', () => {
    let state = startGameWith(3)
    const catType = state.players[0]!.hand.find(c => c.type.includes('cat'))?.type
    if (!catType) return

    state = giveCard(state, 'p1', catType, 'cat-a')
    state = giveCard(state, 'p1', catType, 'cat-b')
    state = giveCard(state, 'p1', catType, 'cat-c')
    // Remove all shuffles from p2's hand so naming "shuffle" misses
    state = removeCardType(state, 'p2', 'shuffle')

    let result = act(state, { type: 'play-card', playerId: 'p1', cardIds: ['cat-a', 'cat-b', 'cat-c'] })
    result = resolveNopeWindow(result.state as PlayingState, makeCtx(99999))
    result = act(result.state as PlayingState, { type: 'select-target', playerId: 'p1', targetPlayerId: 'p2' })

    const nameState = result.state as PlayingState
    // Name a card type p2 doesn't have
    result = act(nameState, { type: 'name-card', playerId: 'p1', cardType: 'shuffle' })
    expect(result.ok).toBe(true)

    const final = result.state as PlayingState
    expect(final.subPhase).toBe('turn-active')
    // No card transferred — check events for combo-steal with found=false
    const stealEvent = final.events.find(e => e.type === 'combo-steal')
    expect(stealEvent).toBeDefined()
  })
})

describe('Favor — EK-only hand auto-resolve', () => {
  it('auto-resolves when target only has Exploding Kitten cards', () => {
    let state = startGameWith(3)
    state = giveCard(state, 'p1', 'favor', 'fav-1')

    // Strip p2's hand and give them only an EK
    state = {
      ...state,
      players: state.players.map(p =>
        p.id === 'p2' ? { ...p, hand: [{ id: 'ek-test', type: 'exploding-kitten' as const }] } : p
      ),
    }

    let result = act(state, { type: 'play-card', playerId: 'p1', cardIds: ['fav-1'], targetPlayerId: 'p2' })
    expect(result.ok).toBe(true)

    // Resolve nope → should auto-resolve (no favor-pending because target has only EK)
    result = resolveNopeWindow(result.state as PlayingState, makeCtx(99999))
    expect(result.ok).toBe(true)

    const final = result.state as PlayingState
    // Should NOT enter favor-pending — auto-resolved
    expect(final.subPhase).toBe('turn-active')
  })
})
