import { describe, expect, it } from 'vitest'
import {
  applyPlaytestConfig,
  parsePlaytestConfigMessage,
  type PlaytestConfigState,
} from './playtest-config'

// ─────────── parsePlaytestConfigMessage ───────────

describe('parsePlaytestConfigMessage', () => {
  it('accepts a well-formed message', () => {
    const result = parsePlaytestConfigMessage(JSON.stringify({
      type: 'playtest-config',
      seed: 42,
      nopeWindowMs: 60_000,
    }))
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.payload).toEqual({ seed: 42, nopeWindowMs: 60_000 })
    }
  })

  it('rejects wrong type literal', () => {
    const result = parsePlaytestConfigMessage(JSON.stringify({
      type: 'something-else',
      seed: 42,
      nopeWindowMs: 60_000,
    }))
    expect(result.ok).toBe(false)
  })

  it('rejects negative seed', () => {
    const result = parsePlaytestConfigMessage(JSON.stringify({
      type: 'playtest-config',
      seed: -1,
      nopeWindowMs: 60_000,
    }))
    expect(result.ok).toBe(false)
  })

  it('rejects non-integer seed', () => {
    const result = parsePlaytestConfigMessage(JSON.stringify({
      type: 'playtest-config',
      seed: 1.5,
      nopeWindowMs: 60_000,
    }))
    expect(result.ok).toBe(false)
  })

  it('accepts seed = 0', () => {
    const result = parsePlaytestConfigMessage(JSON.stringify({
      type: 'playtest-config',
      seed: 0,
      nopeWindowMs: 60_000,
    }))
    expect(result.ok).toBe(true)
  })

  it('rejects nopeWindowMs = 0', () => {
    const result = parsePlaytestConfigMessage(JSON.stringify({
      type: 'playtest-config',
      seed: 42,
      nopeWindowMs: 0,
    }))
    expect(result.ok).toBe(false)
  })

  it('rejects nopeWindowMs > 30 minutes (1_800_000)', () => {
    const result = parsePlaytestConfigMessage(JSON.stringify({
      type: 'playtest-config',
      seed: 42,
      nopeWindowMs: 30 * 60_000 + 1,
    }))
    expect(result.ok).toBe(false)
  })

  it('accepts nopeWindowMs at the 30min boundary (1_800_000)', () => {
    const result = parsePlaytestConfigMessage(JSON.stringify({
      type: 'playtest-config',
      seed: 42,
      nopeWindowMs: 30 * 60_000,
    }))
    expect(result.ok).toBe(true)
  })

  it('accepts missing nopeWindowMs (production-default fallthrough)', () => {
    const result = parsePlaytestConfigMessage(JSON.stringify({
      type: 'playtest-config',
      seed: 42,
    }))
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.payload).toEqual({ seed: 42 })
      expect(result.payload.nopeWindowMs).toBeUndefined()
    }
  })

  it('rejects unknown keys (strict schema)', () => {
    const result = parsePlaytestConfigMessage(JSON.stringify({
      type: 'playtest-config',
      seed: 42,
      nopeWindowMs: 60_000,
      extra: 'nope',
    }))
    expect(result.ok).toBe(false)
  })

  it('rejects malformed JSON', () => {
    expect(parsePlaytestConfigMessage('not json').ok).toBe(false)
    expect(parsePlaytestConfigMessage('').ok).toBe(false)
    expect(parsePlaytestConfigMessage('{').ok).toBe(false)
  })
})

// ─────────── applyPlaytestConfig — first-write-wins latch ───────────

describe('applyPlaytestConfig', () => {
  const unlocked: PlaytestConfigState = { locked: false }
  const locked: PlaytestConfigState = { locked: true, seed: 42, nopeWindowMs: 60_000 }
  const incoming = { seed: 42, nopeWindowMs: 60_000 }

  it('first write on unlocked state + null phase → accept + lock', () => {
    const result = applyPlaytestConfig(unlocked, null, incoming)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.nextState).toEqual({ locked: true, seed: 42, nopeWindowMs: 60_000 })
    }
  })

  it('first write on unlocked state + lobby phase → accept + lock', () => {
    const result = applyPlaytestConfig(unlocked, 'lobby', incoming)
    expect(result.ok).toBe(true)
  })

  it('second write on locked state → PLAYTEST_CONFIG_LOCKED', () => {
    const result = applyPlaytestConfig(locked, 'lobby', { seed: 99, nopeWindowMs: 120_000 })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('PLAYTEST_CONFIG_LOCKED')
  })

  it('second write on locked state preserves existing seed/nopeWindowMs', () => {
    const result = applyPlaytestConfig(locked, 'lobby', { seed: 99, nopeWindowMs: 120_000 })
    expect(result.ok).toBe(false)
    // Caller is expected to keep using the current state; the function
    // does not mutate. Assert the input was not clobbered.
    expect(locked).toEqual({ locked: true, seed: 42, nopeWindowMs: 60_000 })
  })

  it('post-lobby phase on unlocked state → PLAYTEST_CONFIG_TOO_LATE', () => {
    const result = applyPlaytestConfig(unlocked, 'playing', incoming)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('PLAYTEST_CONFIG_TOO_LATE')
  })

  it('post-lobby phase on locked state → LOCKED (locked check precedes phase check)', () => {
    // If it's both locked AND past-lobby, LOCKED is the more informative
    // error (lock is earlier in lifecycle).
    const result = applyPlaytestConfig(locked, 'playing', incoming)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('PLAYTEST_CONFIG_LOCKED')
  })

  it('game-over phase on unlocked state → TOO_LATE', () => {
    const result = applyPlaytestConfig(unlocked, 'game_over', incoming)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('PLAYTEST_CONFIG_TOO_LATE')
  })
})
