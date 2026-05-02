import { describe, expect, it } from 'vitest'
import { parseDevActionMessage } from './dev-actions'

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
})
