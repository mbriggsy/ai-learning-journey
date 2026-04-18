import { describe, it, expect } from 'vitest'
import { createLobbyState, dispatch } from './engine'
import type { PlayingState, LobbyState, DispatchContext, DispatchResult } from './types'
import type { EngineAction } from '@shared/actions'

// --- Helpers ---

function makeCtx(now = 1000): DispatchContext {
  let seed = 42
  return {
    now,
    random: () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 },
    randomInt: (max: number) => { seed = (seed * 16807) % 2147483647; return seed % max },
  }
}

function act(state: PlayingState, action: Partial<EngineAction> & { type: string }, ctx = makeCtx()): DispatchResult {
  return dispatch(state, action as EngineAction, ctx)
}

function startGameWith(playerCount: number): PlayingState {
  let lobby: LobbyState = createLobbyState()
  for (let i = 0; i < playerCount; i++) {
    lobby = {
      ...lobby,
      players: [...lobby.players, { id: `p${i + 1}`, name: `Player ${i + 1}`, color: `#${i}` }],
    }
  }
  const result = dispatch(lobby, { type: 'start-game', playerId: 'p1' } as EngineAction, makeCtx())
  if (!result.ok) throw new Error('Failed to start game')
  return result.state as PlayingState
}

function giveCard(state: PlayingState, playerId: string, cardType: string, cardId: string): PlayingState {
  return {
    ...state,
    players: state.players.map(p =>
      p.id === playerId
        ? { ...p, hand: [...p.hand, { id: cardId, type: cardType as never }] }
        : p,
    ),
  }
}

describe('Nope Grace Window', () => {
  it('nope-window-expired transitions to grace state instead of resolving', () => {
    let state = startGameWith(3)
    state = giveCard(state, 'p1', 'go-dark', 'skip-1')

    // Play skip → opens nope window
    let result = act(state, { type: 'play-card', playerId: 'p1', cardIds: ['skip-1'] })
    expect(result.ok).toBe(true)
    const withNope = result.state as PlayingState
    expect(withNope.nopeWindow).not.toBeNull()

    // Expire nope window → should go to grace, NOT resolve
    result = act(withNope, {
      type: 'nope-window-expired',
      playerId: 'server',
      windowGeneration: withNope.nopeWindow!.generation,
    }, makeCtx(99999))
    expect(result.ok).toBe(true)

    const graceState = result.state as PlayingState
    expect(graceState.nopeWindow).not.toBeNull()
    expect(graceState.nopeWindow!.expired).toBe(true)
    expect(graceState.nopeWindow!.graceDeadlineMs).toBeDefined()
  })

  it('nope-grace-expired actually resolves the window', () => {
    let state = startGameWith(3)
    state = giveCard(state, 'p1', 'go-dark', 'skip-1')

    let result = act(state, { type: 'play-card', playerId: 'p1', cardIds: ['skip-1'] })
    const withNope = result.state as PlayingState

    // Step 1: expire → grace
    result = act(withNope, {
      type: 'nope-window-expired',
      playerId: 'server',
      windowGeneration: withNope.nopeWindow!.generation,
    }, makeCtx(99999))
    const graceState = result.state as PlayingState

    // Step 2: grace-expired → resolve
    result = act(graceState, {
      type: 'nope-grace-expired',
      playerId: 'server',
      windowGeneration: graceState.nopeWindow!.generation,
    }, makeCtx(99999))
    expect(result.ok).toBe(true)

    const resolved = result.state as PlayingState
    expect(resolved.nopeWindow).toBeNull()
  })

  it('Nope during grace period is accepted and resets window', () => {
    let state = startGameWith(3)
    state = giveCard(state, 'p1', 'go-dark', 'skip-1')
    state = giveCard(state, 'p2', 'intercepted', 'nope-1')

    let result = act(state, { type: 'play-card', playerId: 'p1', cardIds: ['skip-1'] })
    const withNope = result.state as PlayingState

    // Transition to grace
    result = act(withNope, {
      type: 'nope-window-expired',
      playerId: 'server',
      windowGeneration: withNope.nopeWindow!.generation,
    }, makeCtx(99999))
    const graceState = result.state as PlayingState
    expect(graceState.nopeWindow!.expired).toBe(true)

    // Play Nope during grace — should succeed and reset
    result = act(graceState, { type: 'nope', playerId: 'p2' }, makeCtx(99999))
    expect(result.ok).toBe(true)

    const afterNope = result.state as PlayingState
    expect(afterNope.nopeWindow).not.toBeNull()
    expect(afterNope.nopeWindow!.expired).toBeUndefined()
    expect(afterNope.nopeWindow!.chainDepth).toBe(1)
  })

  it('rejects duplicate nope-window-expired on already-grace window', () => {
    let state = startGameWith(3)
    state = giveCard(state, 'p1', 'go-dark', 'skip-1')

    let result = act(state, { type: 'play-card', playerId: 'p1', cardIds: ['skip-1'] })
    const withNope = result.state as PlayingState

    // First expire → grace
    result = act(withNope, {
      type: 'nope-window-expired',
      playerId: 'server',
      windowGeneration: withNope.nopeWindow!.generation,
    }, makeCtx(99999))
    const graceState = result.state as PlayingState

    // Second expire → should reject
    result = act(graceState, {
      type: 'nope-window-expired',
      playerId: 'server',
      windowGeneration: graceState.nopeWindow!.generation,
    }, makeCtx(99999))
    expect(result.ok).toBe(false)
  })
})

describe('Protocol Version', () => {
  it('PROTOCOL_VERSION is exported from protocol.ts', async () => {
    const { PROTOCOL_VERSION } = await import('@shared/protocol')
    expect(PROTOCOL_VERSION).toBe(2)
    expect(typeof PROTOCOL_VERSION).toBe('number')
  })
})

describe('Server-only action nope-grace-expired', () => {
  it('is in SERVER_ONLY_ACTIONS set', async () => {
    const { SERVER_ONLY_ACTIONS } = await import('@shared/actions')
    expect(SERVER_ONLY_ACTIONS.has('nope-grace-expired')).toBe(true)
  })
})
