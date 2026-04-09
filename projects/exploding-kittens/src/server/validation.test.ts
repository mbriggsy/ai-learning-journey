import { describe, it, expect } from 'vitest'
import { parseClientMessage } from './validation'

describe('Validation', () => {
  // --- Valid messages ---

  it('parses valid join message', () => {
    const result = parseClientMessage(JSON.stringify({
      type: 'join',
      payload: { name: 'Alice' },
    }))
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.message.type).toBe('join')
    }
  })

  it('parses join with sessionToken', () => {
    const result = parseClientMessage(JSON.stringify({
      type: 'join',
      payload: { name: 'Bob', sessionToken: '550e8400-e29b-41d4-a716-446655440000' },
    }))
    expect(result.ok).toBe(true)
  })

  it('parses start-game message', () => {
    const result = parseClientMessage(JSON.stringify({
      type: 'start-game',
      payload: {},
    }))
    expect(result.ok).toBe(true)
  })

  it('parses host-connect message', () => {
    const result = parseClientMessage(JSON.stringify({
      type: 'host-connect',
      payload: {},
    }))
    expect(result.ok).toBe(true)
  })

  it('parses ping message', () => {
    const result = parseClientMessage(JSON.stringify({
      type: 'ping',
      payload: {},
    }))
    expect(result.ok).toBe(true)
  })

  it('parses play-card action', () => {
    const result = parseClientMessage(JSON.stringify({
      type: 'action',
      payload: {
        type: 'play-card',
        cardIds: ['550e8400-e29b-41d4-a716-446655440000'],
        stateVersion: 5,
      },
    }))
    expect(result.ok).toBe(true)
  })

  it('parses draw-card action', () => {
    const result = parseClientMessage(JSON.stringify({
      type: 'action',
      payload: { type: 'draw-card', stateVersion: 3 },
    }))
    expect(result.ok).toBe(true)
  })

  it('parses nope action', () => {
    const result = parseClientMessage(JSON.stringify({
      type: 'action',
      payload: { type: 'nope', stateVersion: 7 },
    }))
    expect(result.ok).toBe(true)
  })

  it('parses defuse-place action', () => {
    const result = parseClientMessage(JSON.stringify({
      type: 'action',
      payload: { type: 'defuse-place', position: 3, stateVersion: 10 },
    }))
    expect(result.ok).toBe(true)
  })

  it('parses favor-give action', () => {
    const result = parseClientMessage(JSON.stringify({
      type: 'action',
      payload: { type: 'favor-give', cardId: '550e8400-e29b-41d4-a716-446655440000', stateVersion: 2 },
    }))
    expect(result.ok).toBe(true)
  })

  it('parses future-rearrange action', () => {
    const result = parseClientMessage(JSON.stringify({
      type: 'action',
      payload: {
        type: 'future-rearrange',
        order: ['550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001'],
        stateVersion: 4,
      },
    }))
    expect(result.ok).toBe(true)
  })

  it('parses select-target action', () => {
    const result = parseClientMessage(JSON.stringify({
      type: 'action',
      payload: { type: 'select-target', targetPlayerId: '550e8400-e29b-41d4-a716-446655440000', stateVersion: 6 },
    }))
    expect(result.ok).toBe(true)
  })

  it('parses name-card action with valid card type', () => {
    const result = parseClientMessage(JSON.stringify({
      type: 'action',
      payload: { type: 'name-card', cardType: 'dash-barlowe', stateVersion: 8 },
    }))
    expect(result.ok).toBe(true)
  })

  // --- Invalid messages ---

  it('rejects invalid JSON', () => {
    const result = parseClientMessage('not json')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('Invalid JSON')
  })

  it('rejects unknown message type', () => {
    const result = parseClientMessage(JSON.stringify({
      type: 'hack',
      payload: {},
    }))
    expect(result.ok).toBe(false)
  })

  it('rejects empty name', () => {
    const result = parseClientMessage(JSON.stringify({
      type: 'join',
      payload: { name: '' },
    }))
    expect(result.ok).toBe(false)
  })

  it('rejects name longer than 12 characters', () => {
    const result = parseClientMessage(JSON.stringify({
      type: 'join',
      payload: { name: 'ThisNameIsTooLong' },
    }))
    expect(result.ok).toBe(false)
  })

  it('rejects play-card with too many cardIds', () => {
    const result = parseClientMessage(JSON.stringify({
      type: 'action',
      payload: {
        type: 'play-card',
        cardIds: ['a', 'b', 'c', 'd'].map(() => '550e8400-e29b-41d4-a716-446655440000'),
        stateVersion: 1,
      },
    }))
    expect(result.ok).toBe(false)
  })

  it('rejects play-card with zero cardIds', () => {
    const result = parseClientMessage(JSON.stringify({
      type: 'action',
      payload: { type: 'play-card', cardIds: [], stateVersion: 1 },
    }))
    expect(result.ok).toBe(false)
  })

  it('rejects negative stateVersion', () => {
    const result = parseClientMessage(JSON.stringify({
      type: 'action',
      payload: { type: 'draw-card', stateVersion: -1 },
    }))
    expect(result.ok).toBe(false)
  })

  it('rejects server-only action nope-window-expired', () => {
    const result = parseClientMessage(JSON.stringify({
      type: 'action',
      payload: { type: 'nope-window-expired', windowGeneration: 1, stateVersion: 5 },
    }))
    expect(result.ok).toBe(false)
  })

  it('rejects invalid card type in name-card', () => {
    const result = parseClientMessage(JSON.stringify({
      type: 'action',
      payload: { type: 'name-card', cardType: 'not-a-card', stateVersion: 8 },
    }))
    expect(result.ok).toBe(false)
  })

  it('rejects negative defuse position', () => {
    const result = parseClientMessage(JSON.stringify({
      type: 'action',
      payload: { type: 'defuse-place', position: -1, stateVersion: 1 },
    }))
    expect(result.ok).toBe(false)
  })

  it('rejects non-integer stateVersion', () => {
    const result = parseClientMessage(JSON.stringify({
      type: 'action',
      payload: { type: 'draw-card', stateVersion: 1.5 },
    }))
    expect(result.ok).toBe(false)
  })

  it('does not leak schema details in error', () => {
    const result = parseClientMessage(JSON.stringify({ type: 'join', payload: { name: 123 } }))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('Invalid message')
  })
})
