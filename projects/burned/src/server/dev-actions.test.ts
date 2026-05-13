import { describe, expect, it } from 'vitest'
import { parseDevActionMessage, applyDevTakeCard } from './dev-actions'
import type { GameState, PlayingState } from './game/types'
import type { CardInstance } from '@shared/types'

// Scope: this file pins the parser contract. The apply functions
// (applyDevStackDeck / applyDevGiveCard) are exercised through integration
// flows; their fixture would need a full PlayingState which is more setup
// than the current fix touches.

describe('parseDevActionMessage', () => {
  it('accepts a well-formed dev-stack-deck message', () => {
    const result = parseDevActionMessage(JSON.stringify({
      type: 'dev-stack-deck',
      cards: ['burned', 'extraction'],
    }))
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.payload).toEqual({
        type: 'dev-stack-deck',
        cards: ['burned', 'extraction'],
      })
    }
  })

  it('accepts a well-formed dev-give-card message', () => {
    const result = parseDevActionMessage(JSON.stringify({
      type: 'dev-give-card',
      playerName: 'michael',
      cards: ['call-in-a-favor'],
    }))
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.payload).toEqual({
        type: 'dev-give-card',
        playerName: 'michael',
        cards: ['call-in-a-favor'],
      })
    }
  })

  // Earth-bug: `dev:give michael call-in-favor` (typo: should be
  // `call-in-a-favor`) must surface as INVALID_CARD_TYPE so the operator
  // sees the typo instead of a heartbeat-timeout disconnect.
  it('rejects unknown card type with INVALID_CARD_TYPE + offending name', () => {
    const result = parseDevActionMessage(JSON.stringify({
      type: 'dev-give-card',
      playerName: 'michael',
      cards: ['call-in-favor'],
    }))
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.recognized).toBe(true)
      if (result.recognized) {
        expect(result.code).toBe('INVALID_CARD_TYPE')
        expect(result.message).toContain('call-in-favor')
      }
    }
  })

  it('rejects unknown card type in dev-stack-deck too', () => {
    const result = parseDevActionMessage(JSON.stringify({
      type: 'dev-stack-deck',
      cards: ['totally-fake-card'],
    }))
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.recognized).toBe(true)
      if (result.recognized) {
        expect(result.code).toBe('INVALID_CARD_TYPE')
        expect(result.message).toContain('totally-fake-card')
      }
    }
  })

  it('rejects empty cards array as recognized INVALID_ARGUMENTS', () => {
    const result = parseDevActionMessage(JSON.stringify({
      type: 'dev-stack-deck',
      cards: [],
    }))
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.recognized).toBe(true)
      if (result.recognized) {
        expect(result.code).toBe('INVALID_ARGUMENTS')
      }
    }
  })

  it('rejects unknown message type as unrecognized (silent-drop posture)', () => {
    const result = parseDevActionMessage(JSON.stringify({
      type: 'something-else',
      cards: ['burned'],
    }))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.recognized).toBe(false)
  })

  it('rejects malformed JSON as unrecognized (silent-drop posture)', () => {
    const a = parseDevActionMessage('not json')
    const b = parseDevActionMessage('')
    const c = parseDevActionMessage('{')
    expect(a.ok).toBe(false)
    expect(b.ok).toBe(false)
    expect(c.ok).toBe(false)
    if (!a.ok) expect(a.recognized).toBe(false)
    if (!b.ok) expect(b.recognized).toBe(false)
    if (!c.ok) expect(c.recognized).toBe(false)
  })

  it('rejects unknown extra keys (strict schema) as recognized INVALID_ARGUMENTS', () => {
    const result = parseDevActionMessage(JSON.stringify({
      type: 'dev-stack-deck',
      cards: ['burned'],
      extra: 'nope',
    }))
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.recognized).toBe(true)
      if (result.recognized) expect(result.code).toBe('INVALID_ARGUMENTS')
    }
  })

  it('accepts a well-formed dev-take-card message', () => {
    const result = parseDevActionMessage(JSON.stringify({
      type: 'dev-take-card',
      playerName: 'vera',
    }))
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.payload).toEqual({
        type: 'dev-take-card',
        playerName: 'vera',
      })
    }
  })

  it('rejects dev-take-card without playerName as recognized INVALID_ARGUMENTS', () => {
    const result = parseDevActionMessage(JSON.stringify({
      type: 'dev-take-card',
    }))
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.recognized).toBe(true)
      if (result.recognized) expect(result.code).toBe('INVALID_ARGUMENTS')
    }
  })

  it('rejects dev-take-card with extra keys (strict schema)', () => {
    const result = parseDevActionMessage(JSON.stringify({
      type: 'dev-take-card',
      playerName: 'vera',
      cards: ['burned'],
    }))
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.recognized).toBe(true)
      if (result.recognized) expect(result.code).toBe('INVALID_ARGUMENTS')
    }
  })
})

// --- applyDevTakeCard ---

function card(type: string, id: string): CardInstance {
  return { type: type as CardInstance['type'], id }
}

function playingFixture(opts: { veraHand: CardInstance[] }): PlayingState {
  return {
    phase: 'playing',
    players: [
      { id: 'p-dash', name: 'Dash', color: '#a', isAlive: true, isConnected: true, hand: [card('go-dark', 'g1')] },
      { id: 'p-vera', name: 'Vera', color: '#b', isAlive: true, isConnected: true, hand: opts.veraHand },
    ],
    currentTurn: { currentPlayerId: 'p-dash', turnsRemaining: 1 },
    drawPile: [card('back-channel', 'b1')],
    discardPile: [],
    subPhase: 'turn-active',
    nopeWindow: null,
    pendingDefuse: null,
    pendingFavor: null,
    pendingPrompt: null,
    pendingSteal: null,
    pendingNameCard: null,
    pendingFuture: null,
    events: [],
    nextNopeGeneration: 0,
    nextEventGeneration: 0,
  } as unknown as PlayingState
}

describe('applyDevTakeCard', () => {
  it('empties the named player\'s hand and reports the taken count', () => {
    const state = playingFixture({
      veraHand: [card('reassign', 'r1'), card('direct-order', 'd1'), card('go-dark', 'g2')],
    })
    const result = applyDevTakeCard(state, 'vera')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.takenCount).toBe(3)
      const vera = result.nextState.players.find(p => p.name === 'Vera')!
      expect(vera.hand).toEqual([])
      // Other players untouched.
      const dash = result.nextState.players.find(p => p.name === 'Dash')!
      expect(dash.hand).toHaveLength(1)
    }
  })

  it('returns ok with takenCount=0 when the hand is already empty (idempotent)', () => {
    const state = playingFixture({ veraHand: [] })
    const result = applyDevTakeCard(state, 'vera')
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.takenCount).toBe(0)
  })

  it('matches player name case-insensitively', () => {
    const state = playingFixture({ veraHand: [card('reassign', 'r1')] })
    const result = applyDevTakeCard(state, 'VERA')
    expect(result.ok).toBe(true)
  })

  it('rejects with PLAYER_NOT_FOUND for an unknown name', () => {
    const state = playingFixture({ veraHand: [card('reassign', 'r1')] })
    const result = applyDevTakeCard(state, 'sterling')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('PLAYER_NOT_FOUND')
  })

  it('rejects with NOT_PLAYING when state is not in the playing phase', () => {
    const lobby = { phase: 'lobby' } as unknown as GameState
    const result = applyDevTakeCard(lobby, 'vera')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('NOT_PLAYING')
  })

  it('does not mutate the input state (pure)', () => {
    const state = playingFixture({
      veraHand: [card('reassign', 'r1'), card('direct-order', 'd1')],
    })
    const veraBefore = state.players.find(p => p.name === 'Vera')!
    const handBefore = veraBefore.hand
    applyDevTakeCard(state, 'vera')
    expect(veraBefore.hand).toBe(handBefore)
    expect(veraBefore.hand).toHaveLength(2)
  })
})
