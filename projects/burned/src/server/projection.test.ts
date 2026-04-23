/**
 * Projection tests for the nope-window's named-steal context
 * (RULES-REFERENCE.md §13.8). Verifies the stealer + target can see the
 * named card type during the intercept window; the board and every other
 * player cannot. Fixes the gap where targets couldn't decide whether to
 * burn an Intercept on a specific card because they couldn't see what
 * was named until after the window resolved.
 */
import { describe, it, expect } from 'vitest'
import { act, giveCard, startGameWith } from './game/test-helpers'
import { projectForBoard, projectForPlayer } from './projection'
import { CARD_DEF_BY_TYPE, type CardType } from '@shared/card-defs'
import type { PlayingState } from './game/types'

const NOW = 100_000

function openNamedStealWindow(namedType: CardType = 'go-dark'): PlayingState {
  let state = startGameWith(4)
  const catType = state.players[0]!.hand.find(
    c => CARD_DEF_BY_TYPE[c.type]?.category === 'operative',
  )?.type
  if (!catType) throw new Error('Test setup: no operative card dealt to p1')

  state = giveCard(state, 'p1', catType, 'cat-a')
  state = giveCard(state, 'p1', catType, 'cat-b')
  state = giveCard(state, 'p1', catType, 'cat-c')
  state = giveCard(state, 'p2', namedType, 'target-card')

  let result = act(state, {
    type: 'play-card', playerId: 'p1', cardIds: ['cat-a', 'cat-b', 'cat-c'], targetPlayerId: 'p2',
  })
  if (!result.ok) throw new Error('play-card failed: ' + result.error)

  result = act(result.state as PlayingState, {
    type: 'name-card', playerId: 'p1', cardType: namedType,
  })
  if (!result.ok) throw new Error('name-card failed: ' + result.error)

  return result.state as PlayingState
}

describe('nope-window projection — named steal context', () => {
  it('board view exposes target identity but NEVER the named card type', () => {
    const state = openNamedStealWindow('go-dark')
    const board = projectForBoard(state, NOW, new Set(['p1', 'p2', 'p3', 'p4']))
    if (board.phase !== 'playing') throw new Error('expected playing phase')

    expect(board.nopeWindow).not.toBeNull()
    expect(board.nopeWindow!.namedSteal).toBeDefined()
    expect(board.nopeWindow!.namedSteal!.stealerId).toBe('p1')
    expect(board.nopeWindow!.namedSteal!.targetPlayerId).toBe('p2')
    // House rule §13.8: board never sees the named card type, even though
    // it shows the actors. Preserves spy-agency fiction — bystanders know
    // the lift is attempted but not which asset is at risk.
    expect(board.nopeWindow!.namedSteal!.namedCardType).toBeUndefined()
  })

  it('stealer sees the named card type in their player view', () => {
    const state = openNamedStealWindow('go-dark')
    const board = projectForBoard(state, NOW, new Set(['p1', 'p2', 'p3', 'p4']))
    const view = projectForPlayer(state, 'p1', board)
    if (view.phase !== 'playing') throw new Error('expected playing phase')

    expect(view.nopeWindow?.namedSteal?.namedCardType).toBe('go-dark')
    expect(view.nopeWindow?.namedSteal?.stealerId).toBe('p1')
    expect(view.nopeWindow?.namedSteal?.targetPlayerId).toBe('p2')
  })

  it('target sees the named card type in their player view', () => {
    const state = openNamedStealWindow('go-dark')
    const board = projectForBoard(state, NOW, new Set(['p1', 'p2', 'p3', 'p4']))
    const view = projectForPlayer(state, 'p2', board)
    if (view.phase !== 'playing') throw new Error('expected playing phase')

    // This is the core fix — target can now see which card is on the
    // line while the intercept window is still open, so they can decide
    // whether burning an Intercept is worth it.
    expect(view.nopeWindow?.namedSteal?.namedCardType).toBe('go-dark')
    expect(view.nopeWindow?.namedSteal?.targetPlayerId).toBe('p2')
  })

  it('bystanders see target identity but never the named card type', () => {
    const state = openNamedStealWindow('go-dark')
    const board = projectForBoard(state, NOW, new Set(['p1', 'p2', 'p3', 'p4']))

    for (const bystander of ['p3', 'p4']) {
      const view = projectForPlayer(state, bystander, board)
      if (view.phase !== 'playing') throw new Error('expected playing phase')

      expect(view.nopeWindow?.namedSteal?.stealerId).toBe('p1')
      expect(view.nopeWindow?.namedSteal?.targetPlayerId).toBe('p2')
      // §13.8: strategic card-tracking from bluff attempts stays private
      // to the two parties. A bystander must not learn what p1 named.
      expect(view.nopeWindow?.namedSteal?.namedCardType).toBeUndefined()
    }
  })

  it('non-named nope windows (single-card plays) carry no namedSteal context', () => {
    let state = startGameWith(3)
    state = giveCard(state, 'p1', 'burn-the-files', 'shuffle-1')
    const result = act(state, { type: 'play-card', playerId: 'p1', cardIds: ['shuffle-1'] })
    if (!result.ok) throw new Error('play-card failed: ' + result.error)
    const after = result.state as PlayingState
    expect(after.nopeWindow).not.toBeNull()

    const board = projectForBoard(after, NOW, new Set(['p1', 'p2', 'p3']))
    if (board.phase !== 'playing') throw new Error('expected playing phase')
    expect(board.nopeWindow!.namedSteal).toBeUndefined()

    for (const viewer of ['p1', 'p2', 'p3']) {
      const view = projectForPlayer(after, viewer, board)
      if (view.phase !== 'playing') throw new Error('expected playing phase')
      expect(view.nopeWindow?.namedSteal).toBeUndefined()
    }
  })
})
