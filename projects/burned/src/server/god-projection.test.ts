import { describe, expect, it } from 'vitest'
import { buildGodProjections } from './god-projection'
import { act, giveCard, startGameWith } from './game/test-helpers'
import { projectForBoard, projectForPlayer } from './projection'
import { CARD_DEF_BY_TYPE, type CardType } from '@shared/card-defs'
import type { PlayingState } from './game/types'

const NOW = 100_000

function allIds(state: PlayingState): string[] {
  return state.players.map(p => p.id)
}

function board(state: PlayingState, connected: Set<string> = new Set(allIds(state))) {
  return projectForBoard(state, NOW, connected)
}

/** Open a pending named-steal for privacy assertions. Mirrors projection.test.ts. */
function openNamedStealWindow(namedType: CardType = 'go-dark'): PlayingState {
  let state = startGameWith(4)
  const operativeType = state.players[0]!.hand.find(
    c => CARD_DEF_BY_TYPE[c.type]?.category === 'operative',
  )?.type
  if (!operativeType) throw new Error('Test setup: no operative card dealt to p1')
  state = giveCard(state, 'p1', operativeType, 'op-a')
  state = giveCard(state, 'p1', operativeType, 'op-b')
  state = giveCard(state, 'p1', operativeType, 'op-c')
  state = giveCard(state, 'p2', namedType, 'target-card')

  let result = act(state, {
    type: 'play-card', playerId: 'p1', cardIds: ['op-a', 'op-b', 'op-c'], targetPlayerId: 'p2',
  })
  if (!result.ok) throw new Error('play-card failed: ' + result.error)
  result = act(result.state as PlayingState, {
    type: 'name-card', playerId: 'p1', cardType: namedType,
  })
  if (!result.ok) throw new Error('name-card failed: ' + result.error)
  return result.state as PlayingState
}

// ─────────── Structural ───────────

describe('buildGodProjections — structural', () => {
  it('returns one entry per seated player, keyed by playerId', () => {
    const state = startGameWith(4)
    const projections = buildGodProjections(state, board(state), new Set(allIds(state)))
    expect(Object.keys(projections).sort()).toEqual(allIds(state).sort())
  })

  it('each entry equals a direct projectForPlayer call (reference parity)', () => {
    const state = startGameWith(4)
    const b = board(state)
    const projections = buildGodProjections(state, b, new Set(allIds(state)))
    for (const id of allIds(state)) {
      expect(projections[id]).toEqual(projectForPlayer(state, id, b))
    }
  })

  it('works on a game-over state (keyed-for-every-seated, not just alive)', () => {
    let state = startGameWith(2)
    // Collapse game: eliminate p1 by burning without defuse.
    state = giveCard(state, 'p1', 'burned', 'burn-1')
    state = { ...state, drawPile: [{ id: 'burn-1', type: 'burned' }, ...state.drawPile] }
    const result = act(state, { type: 'draw-card', playerId: 'p1' })
    const finalState = (result as { ok: true; state: PlayingState }).state
    const b = projectForBoard(finalState, NOW, new Set(allIds(finalState)))
    const projections = buildGodProjections(finalState, b, new Set(allIds(finalState)))
    expect(Object.keys(projections).sort()).toEqual(allIds(finalState).sort())
  })
})

// ─────────── Privacy invariants ───────────

describe('buildGodProjections — privacy invariants', () => {
  it('stealer projection exposes namedCardType', () => {
    const state = openNamedStealWindow('go-dark')
    const projections = buildGodProjections(state, board(state), new Set(allIds(state)))
    const stealer = projections['p1']!
    if (stealer.phase !== 'playing') throw new Error('expected playing')
    expect(stealer.nopeWindow?.namedSteal?.namedCardType).toBe('go-dark')
  })

  it('target projection exposes namedCardType', () => {
    const state = openNamedStealWindow('go-dark')
    const projections = buildGodProjections(state, board(state), new Set(allIds(state)))
    const target = projections['p2']!
    if (target.phase !== 'playing') throw new Error('expected playing')
    expect(target.nopeWindow?.namedSteal?.namedCardType).toBe('go-dark')
  })

  it('other-alive projections DO NOT expose namedCardType (projection.ts:174 viewer-gate)', () => {
    const state = openNamedStealWindow('go-dark')
    const projections = buildGodProjections(state, board(state), new Set(allIds(state)))
    for (const otherId of ['p3', 'p4']) {
      const view = projections[otherId]!
      if (view.phase !== 'playing') throw new Error('expected playing')
      expect(view.nopeWindow?.namedSteal?.namedCardType).toBeUndefined()
      expect(view.nopeWindow?.namedSteal?.stealerId).toBe('p1')
      expect(view.nopeWindow?.namedSteal?.targetPlayerId).toBe('p2')
    }
  })

  it('each viewer sees their own hand via myHand', () => {
    const state = startGameWith(4)
    const b = board(state)
    const projections = buildGodProjections(state, b, new Set(allIds(state)))
    for (const p of state.players) {
      const view = projections[p.id]!
      expect(view.myPlayerId).toBe(p.id)
      expect(view.myHand).toEqual(p.hand)
    }
  })

  it('no viewer sees any other viewer hand via myHand', () => {
    const state = startGameWith(4)
    const b = board(state)
    const projections = buildGodProjections(state, b, new Set(allIds(state)))
    const byViewer = Object.fromEntries(
      state.players.map(p => [p.id, projections[p.id]!.myHand.map(c => c.id).sort()]),
    )
    for (const p of state.players) {
      for (const other of state.players) {
        if (p.id === other.id) continue
        if (other.hand.length === 0) continue
        expect(byViewer[p.id]).not.toEqual(byViewer[other.id])
      }
    }
  })
})

// ─────────── Pure + disconnected handling ───────────

describe('buildGodProjections — purity', () => {
  it('identical inputs produce structurally equal outputs', () => {
    const state = startGameWith(4)
    const b = board(state)
    const connected = new Set(allIds(state))
    const runA = buildGodProjections(state, b, connected)
    const runB = buildGodProjections(state, b, connected)
    expect(runA).toEqual(runB)
  })

  it('connectedPlayerIds does not change which players appear in projections', () => {
    const state = startGameWith(4)
    const allConnected = new Set(allIds(state))
    const partialConnected = new Set(['p1', 'p2']) // p3/p4 disconnected

    // The caller (Unit 6 in broadcastGameState) invokes projectForBoard
    // with the connectedPlayerIds — that flags isConnected flags on
    // BoardPlayer entries. But buildGodProjections still emits every
    // SEATED player, regardless of who's connected.
    const bAll = projectForBoard(state, NOW, allConnected)
    const bPartial = projectForBoard(state, NOW, partialConnected)
    const projAll = buildGodProjections(state, bAll, allConnected)
    const projPartial = buildGodProjections(state, bPartial, partialConnected)

    expect(Object.keys(projAll).sort()).toEqual(Object.keys(projPartial).sort())
  })

  it('disconnected seats still receive a full PlayerView entry', () => {
    const state = startGameWith(4)
    const partialConnected = new Set(['p1', 'p2'])
    const b = projectForBoard(state, NOW, partialConnected)
    const projections = buildGodProjections(state, b, partialConnected)
    expect(projections['p3']).toBeDefined()
    expect(projections['p4']).toBeDefined()
    // And the BoardPlayer entries reflect disconnection (caller's contract).
    if (b.phase !== 'playing') throw new Error('expected playing')
    const p3Entry = b.players.find(p => p.id === 'p3')!
    expect(p3Entry.isConnected).toBe(false)
  })
})
