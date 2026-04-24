import { describe, expect, it } from 'vitest'
import type { PlaytestEnv } from './playtest'
import { getGodOriginAllowlist, isPlaytestMode, matchesToken } from './playtest'

// Minimal Env-shaped fixture builder. Tests construct only the PLAYTEST_*
// fields they care about; everything else stays `undefined`.
function env(overrides: Partial<PlaytestEnv> = {}): PlaytestEnv {
  return {
    PLAYTEST_MODE: undefined,
    PLAYTEST_TOKEN: undefined,
    PLAYTEST_GOD_ORIGINS: undefined,
    ...overrides,
  }
}

describe('isPlaytestMode', () => {
  it('returns true only when PLAYTEST_MODE === "1"', () => {
    expect(isPlaytestMode(env({ PLAYTEST_MODE: '1' }))).toBe(true)
  })

  it('returns false when PLAYTEST_MODE is unset', () => {
    expect(isPlaytestMode(env())).toBe(false)
  })

  it('returns false for truthy-looking non-"1" values', () => {
    for (const val of ['0', 'true', 'false', 'yes', 'TRUE', ' 1', '1 ', '', 'playtest']) {
      expect(isPlaytestMode(env({ PLAYTEST_MODE: val }))).toBe(false)
    }
  })
})

describe('matchesToken', () => {
  it('returns true on exact match', () => {
    expect(matchesToken(env({ PLAYTEST_TOKEN: 'abc123' }), 'abc123')).toBe(true)
  })

  it('returns false when PLAYTEST_TOKEN is unset', () => {
    expect(matchesToken(env(), 'anything')).toBe(false)
  })

  it('returns false when lengths differ (no early-exit timing leak)', () => {
    expect(matchesToken(env({ PLAYTEST_TOKEN: 'abc123' }), 'abc')).toBe(false)
    expect(matchesToken(env({ PLAYTEST_TOKEN: 'abc' }), 'abc123')).toBe(false)
  })

  it('returns false on content mismatch of equal length', () => {
    expect(matchesToken(env({ PLAYTEST_TOKEN: 'abc123' }), 'xyz789')).toBe(false)
  })

  it('returns false when provided token is empty string', () => {
    expect(matchesToken(env({ PLAYTEST_TOKEN: 'abc123' }), '')).toBe(false)
  })

  it('returns false when PLAYTEST_TOKEN is empty string (degenerate deploy)', () => {
    // An accidental `PLAYTEST_TOKEN=""` must never authenticate anyone.
    expect(matchesToken(env({ PLAYTEST_TOKEN: '' }), '')).toBe(false)
    expect(matchesToken(env({ PLAYTEST_TOKEN: '' }), 'anything')).toBe(false)
  })

  it('constant-time compare: equal-length mismatches all reach the same branch', () => {
    // Structural assertion — we cannot measure timing reliably in JS, but we
    // can confirm the function does not return `false` via a length-only
    // short-circuit by proving equal-length mismatches still return false.
    const token = 'a'.repeat(32)
    const mismatch = 'b'.repeat(32)
    expect(matchesToken(env({ PLAYTEST_TOKEN: token }), mismatch)).toBe(false)
  })
})

describe('getGodOriginAllowlist', () => {
  it('parses a comma-separated list', () => {
    expect(getGodOriginAllowlist(env({
      PLAYTEST_GOD_ORIGINS: 'https://playtest.internal,http://localhost:8787',
    }))).toEqual(['https://playtest.internal', 'http://localhost:8787'])
  })

  it('trims surrounding whitespace on each entry', () => {
    expect(getGodOriginAllowlist(env({
      PLAYTEST_GOD_ORIGINS: '  https://a.example  ,\thttp://b.example ',
    }))).toEqual(['https://a.example', 'http://b.example'])
  })

  it('drops empty entries from trailing / doubled commas', () => {
    expect(getGodOriginAllowlist(env({
      PLAYTEST_GOD_ORIGINS: 'https://a.example,,https://b.example,',
    }))).toEqual(['https://a.example', 'https://b.example'])
  })

  it('returns [] when PLAYTEST_GOD_ORIGINS is unset', () => {
    expect(getGodOriginAllowlist(env())).toEqual([])
  })

  it('returns [] when PLAYTEST_GOD_ORIGINS is empty string', () => {
    expect(getGodOriginAllowlist(env({ PLAYTEST_GOD_ORIGINS: '' }))).toEqual([])
  })

  it('returns [] when PLAYTEST_GOD_ORIGINS is only whitespace/commas', () => {
    expect(getGodOriginAllowlist(env({ PLAYTEST_GOD_ORIGINS: '  , , ' }))).toEqual([])
  })
})
