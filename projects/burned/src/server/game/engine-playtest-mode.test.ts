import { describe, expect, it } from 'vitest'
import { createLobbyState, dispatch } from './engine'
import type { DispatchContext, DispatchResult, GameState, PlayingState } from './types'
import type { EngineAction } from '@shared/actions'
import type { CardInstance } from '@shared/types'
import { NOPE_WINDOW_MS } from '@shared/constants'
import { mulberry32, randomIntFromRandom } from '../rng'

/**
 * Local ctx builder. Mirrors engine.test.ts `makeCtx` but carries the
 * optional `nopeWindowMs` override surface that Unit 2 introduces. Kept in
 * this file (rather than shared) so engine.test.ts stays single-purpose.
 */
function makeCtx(opts: { now?: number; nopeWindowMs?: number } = {}): DispatchContext {
  let seed = 42
  return {
    now: opts.now ?? 1000,
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

function startGameWith(playerCount: number, ctx: DispatchContext): PlayingState {
  let lobby = createLobbyState()
  for (let i = 0; i < playerCount; i++) {
    lobby = {
      ...lobby,
      players: [...lobby.players, { id: `p${i + 1}`, name: `P${i + 1}`, color: `#${i}` }],
    }
  }
  const result = dispatch(lobby, { type: 'start-game', playerId: 'p1' } as EngineAction, ctx)
  expect(result.ok).toBe(true)
  return (result as { ok: true; state: GameState }).state as PlayingState
}

function giveCard(state: PlayingState, playerId: string, cardType: string, cardId: string): PlayingState {
  return {
    ...state,
    players: state.players.map(p =>
      p.id === playerId ? { ...p, hand: [...p.hand, { id: cardId, type: cardType } as CardInstance] } : p,
    ),
  }
}

function act(state: GameState, action: EngineAction, ctx: DispatchContext): DispatchResult {
  return dispatch(state, action, ctx)
}

/**
 * Play a card that opens a Nope window and return the resulting `nopeWindow`.
 * The specific card (`go-dark`) is chosen because it opens a Nope window
 * with no additional prompt machinery — shortest path from ctx to a
 * concrete `deadlineMs` we can assert against.
 */
function openNopeWindow(playerCount: number, ctx: DispatchContext): PlayingState {
  let state = startGameWith(playerCount, ctx)
  state = giveCard(state, 'p1', 'go-dark', 'go-dark-1')
  const result = act(state, { type: 'play-card', playerId: 'p1', cardIds: ['go-dark-1'] } as EngineAction, ctx)
  expect(result.ok).toBe(true)
  return (result as { ok: true; state: GameState }).state as PlayingState
}

describe('getNopeWindowDuration — default (no ctx override)', () => {
  it('2-player game resolves to the heads-up tier (currently 10s)', () => {
    const ctx = makeCtx({ now: 1000 })
    const state = openNopeWindow(2, ctx)
    expect(state.nopeWindow).not.toBeNull()
    expect(state.nopeWindow!.deadlineMs).toBe(1000 + NOPE_WINDOW_MS.headsUp)
    expect(state.nopeWindow!.startedAtMs).toBe(1000)
  })

  it('4-player game resolves to the fewPlayers tier', () => {
    const ctx = makeCtx({ now: 500 })
    const state = openNopeWindow(4, ctx)
    expect(state.nopeWindow!.deadlineMs).toBe(500 + NOPE_WINDOW_MS.fewPlayers)
  })

  it('8-player game resolves to the manyPlayers tier', () => {
    const ctx = makeCtx({ now: 0 })
    const state = openNopeWindow(8, ctx)
    expect(state.nopeWindow!.deadlineMs).toBe(NOPE_WINDOW_MS.manyPlayers)
  })
})

describe('getNopeWindowDuration — ctx.nopeWindowMs override', () => {
  it('override value applies uniformly regardless of player count', () => {
    for (const playerCount of [2, 4, 8]) {
      const ctx = makeCtx({ now: 0, nopeWindowMs: 60_000 })
      const state = openNopeWindow(playerCount, ctx)
      expect(state.nopeWindow!.deadlineMs).toBe(60_000)
    }
  })

  it('explicit 0 override beats default (degenerate but allowed)', () => {
    const ctx = makeCtx({ now: 1000, nopeWindowMs: 0 })
    const state = openNopeWindow(4, ctx)
    expect(state.nopeWindow!.deadlineMs).toBe(1000)
  })

  it('undefined override behaves identically to no override', () => {
    const ctxA = makeCtx({ now: 1000 })
    const ctxB = makeCtx({ now: 1000, nopeWindowMs: undefined })
    const stateA = openNopeWindow(4, ctxA)
    const stateB = openNopeWindow(4, ctxB)
    expect(stateA.nopeWindow!.deadlineMs).toBe(stateB.nopeWindow!.deadlineMs)
    expect(stateB.nopeWindow!.deadlineMs).toBe(1000 + NOPE_WINDOW_MS.fewPlayers)
  })

  it('large override (5 minutes) propagates into deadlineMs', () => {
    const ctx = makeCtx({ now: 1000, nopeWindowMs: 5 * 60_000 })
    const state = openNopeWindow(6, ctx)
    expect(state.nopeWindow!.deadlineMs).toBe(1000 + 300_000)
  })

  it('startedAtMs is unaffected by override — always ctx.now', () => {
    const ctx = makeCtx({ now: 42, nopeWindowMs: 99_999 })
    const state = openNopeWindow(4, ctx)
    expect(state.nopeWindow!.startedAtMs).toBe(42)
  })

  it('Nope chain reset honours the override — does not collapse back to default', () => {
    // Regression guard. Without threading ctx through the second
    // getNopeWindowDuration call at engine.ts:1012, playing a Nope
    // inside a stretched window would reset deadlineMs to the 10s
    // tier default, silently truncating the agent's decision budget
    // on every counter.
    const ctx = makeCtx({ now: 1000, nopeWindowMs: 60_000 })
    let state = openNopeWindow(2, ctx)
    state = giveCard(state, 'p2', 'intercepted', 'nope-1')
    expect(state.nopeWindow!.deadlineMs).toBe(1000 + 60_000)

    // Second ctx simulates time advancing; Nope arrives 5s in.
    const noperCtx = makeCtx({ now: 6000, nopeWindowMs: 60_000 })
    const result = act(state, { type: 'nope', playerId: 'p2', windowGeneration: state.nopeWindow!.generation } as EngineAction, noperCtx)
    expect(result.ok).toBe(true)
    const reset = (result as { ok: true; state: GameState }).state as PlayingState
    expect(reset.nopeWindow!.chainDepth).toBe(1)
    expect(reset.nopeWindow!.deadlineMs).toBe(6000 + 60_000)
    expect(reset.nopeWindow!.startedAtMs).toBe(6000)
  })
})

/**
 * End-to-end integration: a seeded ctx drives the same engine through the
 * same action sequence twice → identical resulting states. This is the
 * harness's foundational replayability claim, proved at the engine boundary
 * without needing the Workers runtime.
 */
function ctxSeeded(seed: number, now = 0): DispatchContext {
  const rand = mulberry32(seed)
  return { now, random: rand, randomInt: (max: number) => randomIntFromRandom(rand, max) }
}

function hands(state: PlayingState): string[][] {
  return state.players.map(p => p.hand.map(c => c.type))
}

describe('seeded ctx determinism — end-to-end engine replay', () => {
  it('startGameWith(8, ctxSeeded(42)) produces identical initial hands across runs', () => {
    const runA = startGameWith(8, ctxSeeded(42))
    const runB = startGameWith(8, ctxSeeded(42))
    expect(hands(runA)).toEqual(hands(runB))
    expect(runA.drawPile.map(c => c.type)).toEqual(runB.drawPile.map(c => c.type))
  })

  it('different seeds produce different initial hands', () => {
    const runA = startGameWith(8, ctxSeeded(42))
    const runB = startGameWith(8, ctxSeeded(43))
    // Overwhelmingly likely; a collision would itself be a signal.
    expect(hands(runA)).not.toEqual(hands(runB))
  })

  it('same seed + same action sequence → same resulting state', () => {
    const seed = 777
    let stateA = startGameWith(4, ctxSeeded(seed, 1000))
    let stateB = startGameWith(4, ctxSeeded(seed, 1000))
    expect(hands(stateA)).toEqual(hands(stateB))

    // Apply the same dispatch to both — a fresh mulberry32(seed) ctx per
    // dispatch (mirroring makeDispatchContext's per-dispatch reseeding).
    // Any random draws inside consume the same sequence from identically-
    // seeded streams, so both states evolve in lockstep.
    const drawA = act(stateA, { type: 'draw-card', playerId: 'p1' } as EngineAction, ctxSeeded(seed, 2000))
    const drawB = act(stateB, { type: 'draw-card', playerId: 'p1' } as EngineAction, ctxSeeded(seed, 2000))
    expect(drawA.ok).toBe(true)
    expect(drawB.ok).toBe(true)
    if (drawA.ok && drawB.ok) {
      stateA = drawA.state as PlayingState
      stateB = drawB.state as PlayingState
      expect(hands(stateA)).toEqual(hands(stateB))
      expect(stateA.drawPile.map(c => c.type)).toEqual(stateB.drawPile.map(c => c.type))
    }
  })
})
