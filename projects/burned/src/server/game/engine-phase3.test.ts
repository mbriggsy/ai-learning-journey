import { describe, it, expect } from 'vitest'
import { createLobbyState, dispatch } from './engine'
import type { DispatchContext, PlayingState, GameState } from './types'
import type { EngineAction } from '@shared/actions'

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

function act(state: GameState, action: Partial<EngineAction> & { type: string }, ctx?: DispatchContext) {
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

function giveCard(state: PlayingState, playerId: string, cardType: string, cardId?: string): PlayingState {
  const id = cardId ?? `test-${cardType}-${Date.now()}`
  return {
    ...state,
    players: state.players.map(p =>
      p.id === playerId ? { ...p, hand: [...p.hand, { id, type: cardType } as { id: string; type: string }] } : p,
    ),
  } as PlayingState
}

// nextNopeGeneration is now on PlayingState — no reset needed

// --- Nope Window Generation ---

describe('Nope Window Generation', () => {
  it('NopeWindow has generation field after card play', () => {
    let state = startGameWith(2)
    state = giveCard(state, 'p1', 'go-dark', 'skip-1')

    const result = act(state, { type: 'play-card', playerId: 'p1', cardIds: ['skip-1'] })
    expect(result.ok).toBe(true)
    if (result.ok) {
      const playing = result.state as PlayingState
      expect(playing.nopeWindow).not.toBeNull()
      expect(playing.nopeWindow!.generation).toBeGreaterThan(0)
    }
  })

  it('generation increments on Nope chain', () => {
    let state = startGameWith(3)
    state = giveCard(state, 'p1', 'go-dark', 'skip-1')
    state = giveCard(state, 'p2', 'intercepted', 'nope-1')
    state = giveCard(state, 'p3', 'intercepted', 'nope-2')

    // Play skip → nope window opens
    let result = act(state, { type: 'play-card', playerId: 'p1', cardIds: ['skip-1'] })
    expect(result.ok).toBe(true)
    const gen1 = (result.state as PlayingState).nopeWindow!.generation

    // p2 Nopes → generation increments
    result = act(result.state, { type: 'nope', playerId: 'p2' })
    expect(result.ok).toBe(true)
    const gen2 = (result.state as PlayingState).nopeWindow!.generation
    expect(gen2).toBeGreaterThan(gen1)

    // p3 Nopes back → generation increments again
    result = act(result.state, { type: 'nope', playerId: 'p3' })
    expect(result.ok).toBe(true)
    const gen3 = (result.state as PlayingState).nopeWindow!.generation
    expect(gen3).toBeGreaterThan(gen2)
  })

  it('rejects stale windowGeneration on expiry', () => {
    let state = startGameWith(3)
    state = giveCard(state, 'p1', 'go-dark', 'skip-1')
    state = giveCard(state, 'p2', 'intercepted', 'nope-1')

    // Play go-dark → window opens (gen X)
    let result = act(state, { type: 'play-card', playerId: 'p1', cardIds: ['skip-1'] })
    expect(result.ok).toBe(true)
    const staleGen = (result.state as PlayingState).nopeWindow!.generation

    // Nope → window resets (gen X+1)
    result = act(result.state, { type: 'nope', playerId: 'p2' })
    expect(result.ok).toBe(true)

    // Try to expire with stale generation → rejected
    const s = result.state as PlayingState
    const expireResult = act(s, {
      type: 'nope-window-expired',
      playerId: 'server',
      windowGeneration: staleGen,
    }, makeCtx(99999))
    expect(expireResult.ok).toBe(false)
  })

  it('accepts matching windowGeneration on expiry', () => {
    let state = startGameWith(2)
    state = giveCard(state, 'p1', 'go-dark', 'skip-1')

    let result = act(state, { type: 'play-card', playerId: 'p1', cardIds: ['skip-1'] })
    expect(result.ok).toBe(true)
    const s = result.state as PlayingState
    const gen = s.nopeWindow!.generation

    result = act(s, {
      type: 'nope-window-expired',
      playerId: 'server',
      windowGeneration: gen,
    }, makeCtx(99999))
    expect(result.ok).toBe(true)
  })

  // D-03 race regression. Two players tap Nope within the same
  // network round-trip. Server processes them in arrival order:
  //   t0  window gen=N
  //   t1  A's Nope arrives (windowGeneration=N) → accepted, gen→N+1
  //   t2  B's Nope arrives (windowGeneration=N) → MUST be rejected
  //       because B thought they were the first Noper. Without this
  //       guard, B's Nope lands at chainDepth+1 and un-Nopes A's cancel.
  it('rejects client nope with stale windowGeneration (D-03 race)', () => {
    let state = startGameWith(3)
    state = giveCard(state, 'p1', 'go-dark', 'skip-1')
    state = giveCard(state, 'p2', 'intercepted', 'nope-a')
    state = giveCard(state, 'p3', 'intercepted', 'nope-b')

    // Action opens window at gen N
    let result = act(state, { type: 'play-card', playerId: 'p1', cardIds: ['skip-1'] })
    expect(result.ok).toBe(true)
    const openGen = (result.state as PlayingState).nopeWindow!.generation

    // Player A's Nope arrives first with windowGeneration=openGen → accepted
    result = act(result.state, {
      type: 'nope', playerId: 'p2', windowGeneration: openGen,
    })
    expect(result.ok).toBe(true)
    const afterA = result.state as PlayingState
    expect(afterA.nopeWindow!.generation).toBeGreaterThan(openGen)
    expect(afterA.nopeWindow!.chainDepth).toBe(1)

    // Player B's Nope arrives with STALE windowGeneration=openGen → rejected.
    // Before D-03 fix this would have landed as chainDepth=2 (counter-Nope).
    result = act(afterA, {
      type: 'nope', playerId: 'p3', windowGeneration: openGen,
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('NOPE_STALE_GENERATION')
    }

    // Player B's Nope card must still be in hand — the rejection isn't
    // allowed to burn the card.
    const p3AfterReject = afterA.players.find(p => p.id === 'p3')!
    expect(p3AfterReject.hand.some(c => c.type === 'intercepted')).toBe(true)
  })

  // Counter-Nope flow: B sees the state-update showing gen has advanced,
  // then explicitly counter-Nopes with the NEW generation. That's a
  // legitimate chainDepth=2 counter — NOT a race, an intentional counter.
  it('accepts explicit counter-Nope at current windowGeneration', () => {
    let state = startGameWith(3)
    state = giveCard(state, 'p1', 'go-dark', 'skip-1')
    state = giveCard(state, 'p2', 'intercepted', 'nope-a')
    state = giveCard(state, 'p3', 'intercepted', 'nope-b')

    let result = act(state, { type: 'play-card', playerId: 'p1', cardIds: ['skip-1'] })
    expect(result.ok).toBe(true)

    result = act(result.state, { type: 'nope', playerId: 'p2' })  // auto-injects current gen
    expect(result.ok).toBe(true)
    const afterA = result.state as PlayingState

    // Explicit counter — reads the NEW generation and sends it
    result = act(afterA, {
      type: 'nope', playerId: 'p3', windowGeneration: afterA.nopeWindow!.generation,
    })
    expect(result.ok).toBe(true)
    const afterB = result.state as PlayingState
    expect(afterB.nopeWindow!.chainDepth).toBe(2)
  })
})

// Prompt Timeout removed 2026-04-19 — party-game policy is "game waits for you."
// Pending prompts (favor, future-rearrange, defuse, name-card) have no server-
// side auto-resolve; the game stalls until the targeted player responds or the
// seat is reclaimed by the host in a future kick/advance flow.
