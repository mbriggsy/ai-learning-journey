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
})

// --- Prompt Timeout ---

describe('Prompt Timeout', () => {
  it('favor-pending resolves with no transfer on timeout', () => {
    let state = startGameWith(3)
    state = giveCard(state, 'p1', 'call-in-a-favor', 'favor-1')

    // Play favor → opens nope window
    let result = act(state, { type: 'play-card', playerId: 'p1', cardIds: ['favor-1'], targetPlayerId: 'p2' })
    expect(result.ok).toBe(true)

    // Expire nope window (two-step: expire → grace → resolve)
    const s1 = result.state as PlayingState
    result = act(s1, {
      type: 'nope-window-expired',
      playerId: 'server',
      windowGeneration: s1.nopeWindow!.generation,
    }, makeCtx(99999))
    expect(result.ok).toBe(true)
    const graceState = result.state as PlayingState
    result = act(graceState, {
      type: 'nope-grace-expired',
      playerId: 'server',
      windowGeneration: graceState.nopeWindow!.generation,
    }, makeCtx(99999))
    expect(result.ok).toBe(true)

    const favorPending = result.state as PlayingState
    expect(favorPending.subPhase).toBe('favor-pending')

    // Prompt timeout
    result = act(favorPending, {
      type: 'prompt-timeout',
      playerId: '_server',
      subPhase: 'favor-pending',
    })
    expect(result.ok).toBe(true)
    expect((result.state as PlayingState).subPhase).toBe('turn-active')
  })

  it('rejects prompt-timeout with mismatched subPhase', () => {
    const state = startGameWith(2)
    // State is turn-active, not favor-pending
    const result = act(state, {
      type: 'prompt-timeout',
      playerId: '_server',
      subPhase: 'favor-pending',
    })
    expect(result.ok).toBe(false)
  })

  it('steal-target-pending cancels on timeout', () => {
    let state = startGameWith(3)
    // Manually set up steal-target-pending state
    state = {
      ...state,
      subPhase: 'steal-target-pending',
      pendingSteal: { stealerId: 'p1', comboSize: 2 },
    }

    const result = act(state, {
      type: 'prompt-timeout',
      playerId: '_server',
      subPhase: 'steal-target-pending',
    })
    expect(result.ok).toBe(true)
    const after = result.state as PlayingState
    expect(after.subPhase).toBe('turn-active')
    expect(after.pendingSteal).toBeUndefined()
  })

  it('defuse-pending inserts Burned at random position on timeout', () => {
    let state = startGameWith(2)
    // Give p1 a Burned card in hand (as if they drew one and played Extraction)
    state = giveCard(state, 'p1', 'burned', 'ek-timeout-test')
    const pileSize = state.drawPile.length
    state = {
      ...state,
      subPhase: 'defuse-pending',
      pendingDefuse: { playerId: 'p1' },
    }

    const result = act(state, {
      type: 'prompt-timeout',
      playerId: '_server',
      subPhase: 'defuse-pending',
    })
    expect(result.ok).toBe(true)
    const after = result.state as PlayingState
    expect(after.subPhase).toBe('turn-active')
    // EK moved from hand to draw pile
    expect(after.drawPile.length).toBe(pileSize + 1)
    expect(after.drawPile.some(c => c.type === 'burned')).toBe(true)
    // Burned no longer in hand
    const p1 = after.players.find(p => p.id === 'p1')!
    expect(p1.hand.some(c => c.type === 'burned')).toBe(false)
  })
})
