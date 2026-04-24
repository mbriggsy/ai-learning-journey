import { describe, expect, it } from 'vitest'
import type { PlaytestEnv } from './playtest'
import {
  createGodRateLimiter,
  evaluateGodAuth,
  isGodOriginAllowed,
  type GodAuthDecision,
  type GodRateLimiter,
} from './god-connection'

function env(overrides: Partial<PlaytestEnv> = {}): PlaytestEnv {
  return { PLAYTEST_MODE: undefined, PLAYTEST_TOKEN: undefined, PLAYTEST_GOD_ORIGINS: undefined, ...overrides }
}

/** A rate limiter that always says "not hit" — default for most tests. */
const openLimiter: GodRateLimiter = { isBlocked: () => false, recordFailure: () => {}, recordSuccess: () => {} }

/** A rate limiter that always says "blocked" — tests the 4005 gate. */
const blockedLimiter: GodRateLimiter = { isBlocked: () => true, recordFailure: () => {}, recordSuccess: () => {} }

// ─────────── isGodOriginAllowed ───────────

describe('isGodOriginAllowed', () => {
  it('allows localhost + 127.x.x.x on any port', () => {
    expect(isGodOriginAllowed('http://localhost:5173', [])).toBe(true)
    expect(isGodOriginAllowed('https://localhost', [])).toBe(true)
    expect(isGodOriginAllowed('http://127.0.0.1:8787', [])).toBe(true)
    expect(isGodOriginAllowed('http://127.1.2.3:9000', [])).toBe(true)
  })

  it('allows RFC1918 private IP ranges', () => {
    expect(isGodOriginAllowed('http://192.168.1.42:5173', [])).toBe(true)
    expect(isGodOriginAllowed('http://10.0.0.1:8787', [])).toBe(true)
    expect(isGodOriginAllowed('http://172.16.0.1:8787', [])).toBe(true)
    expect(isGodOriginAllowed('http://172.31.255.255:8787', [])).toBe(true)
  })

  it('rejects 172.15 and 172.32 (outside RFC1918 172.16-31 range)', () => {
    expect(isGodOriginAllowed('http://172.15.0.1:8787', [])).toBe(false)
    expect(isGodOriginAllowed('http://172.32.0.1:8787', [])).toBe(false)
  })

  it('rejects public-internet origins even without allowlist', () => {
    expect(isGodOriginAllowed('https://burned.pages.dev', [])).toBe(false)
    expect(isGodOriginAllowed('https://evil.com', [])).toBe(false)
    expect(isGodOriginAllowed('https://203.0.113.1', [])).toBe(false) // TEST-NET-3, public
  })

  it('allows explicit env allowlist matches (exact string)', () => {
    const allowlist = ['https://playtest.internal', 'https://harness.example']
    expect(isGodOriginAllowed('https://playtest.internal', allowlist)).toBe(true)
    expect(isGodOriginAllowed('https://harness.example', allowlist)).toBe(true)
  })

  it('allowlist matches are exact, not prefix', () => {
    const allowlist = ['https://playtest.internal']
    expect(isGodOriginAllowed('https://playtest.internal.evil.com', allowlist)).toBe(false)
    expect(isGodOriginAllowed('https://evil.com/playtest.internal', allowlist)).toBe(false)
  })

  it('rejects null origin (header absent)', () => {
    expect(isGodOriginAllowed(null, ['https://playtest.internal'])).toBe(false)
  })

  it('rejects empty-string origin', () => {
    expect(isGodOriginAllowed('', ['https://playtest.internal'])).toBe(false)
  })
})

// ─────────── evaluateGodAuth ───────────

function isReject(d: GodAuthDecision): d is Extract<GodAuthDecision, { ok: false }> {
  return d.ok === false
}

describe('evaluateGodAuth — rejection sequence', () => {
  const LAN = 'http://192.168.1.10:8787'
  const PUBLIC = 'https://burned.pages.dev'

  it('playtest mode off → 4004 "Playtest mode off"', () => {
    const d = evaluateGodAuth({ origin: LAN, token: 'anything', env: env(), rateLimiter: openLimiter })
    expect(isReject(d)).toBe(true)
    if (isReject(d)) {
      expect(d.closeCode).toBe(4004)
      expect(d.closeReason).toBe('Playtest mode off')
    }
  })

  it('rate-limited → 4005 "Rate limited" BEFORE any token evaluation', () => {
    let tokenEvaluated = false
    const trackingEnv: PlaytestEnv = {
      PLAYTEST_MODE: '1',
      get PLAYTEST_TOKEN(): string | undefined {
        tokenEvaluated = true
        return 'expected-token'
      },
      PLAYTEST_GOD_ORIGINS: undefined,
    }
    const d = evaluateGodAuth({ origin: LAN, token: 'correct-token', env: trackingEnv, rateLimiter: blockedLimiter })
    expect(isReject(d)).toBe(true)
    if (isReject(d)) expect(d.closeCode).toBe(4005)
    expect(tokenEvaluated).toBe(false)
  })

  it('public-internet origin → 4003 even with correct token', () => {
    const d = evaluateGodAuth({
      origin: PUBLIC,
      token: 'correct-token',
      env: env({ PLAYTEST_MODE: '1', PLAYTEST_TOKEN: 'correct-token' }),
      rateLimiter: openLimiter,
    })
    expect(isReject(d)).toBe(true)
    if (isReject(d)) {
      expect(d.closeCode).toBe(4003)
      expect(d.closeReason).toBe('Forbidden god origin')
    }
  })

  it('missing token → 4004 "Missing token"', () => {
    const d = evaluateGodAuth({
      origin: LAN,
      token: null,
      env: env({ PLAYTEST_MODE: '1', PLAYTEST_TOKEN: 'correct-token' }),
      rateLimiter: openLimiter,
    })
    expect(isReject(d)).toBe(true)
    if (isReject(d)) {
      expect(d.closeCode).toBe(4004)
      expect(d.closeReason).toBe('Missing token')
    }
  })

  it('token mismatch → 4004 "Token mismatch"', () => {
    const d = evaluateGodAuth({
      origin: LAN,
      token: 'wrong',
      env: env({ PLAYTEST_MODE: '1', PLAYTEST_TOKEN: 'correct-token' }),
      rateLimiter: openLimiter,
    })
    expect(isReject(d)).toBe(true)
    if (isReject(d)) {
      expect(d.closeCode).toBe(4004)
      expect(d.closeReason).toBe('Token mismatch')
    }
  })

  it('LAN + valid token + playtest on → accept', () => {
    const d = evaluateGodAuth({
      origin: LAN,
      token: 'correct-token',
      env: env({ PLAYTEST_MODE: '1', PLAYTEST_TOKEN: 'correct-token' }),
      rateLimiter: openLimiter,
    })
    expect(d.ok).toBe(true)
  })

  it('env allowlist origin + valid token → accept', () => {
    const d = evaluateGodAuth({
      origin: 'https://playtest.internal',
      token: 't',
      env: env({ PLAYTEST_MODE: '1', PLAYTEST_TOKEN: 't', PLAYTEST_GOD_ORIGINS: 'https://playtest.internal' }),
      rateLimiter: openLimiter,
    })
    expect(d.ok).toBe(true)
  })
})

describe('evaluateGodAuth — rate-limiter side effects', () => {
  const LAN = 'http://192.168.1.10:8787'

  it('rejection paths call recordFailure', () => {
    const calls: string[] = []
    const tracking: GodRateLimiter = {
      isBlocked: () => false,
      recordFailure: () => calls.push('failure'),
      recordSuccess: () => calls.push('success'),
    }
    // Origin rejection
    evaluateGodAuth({ origin: 'https://evil.com', token: 't', env: env({ PLAYTEST_MODE: '1', PLAYTEST_TOKEN: 't' }), rateLimiter: tracking })
    // Missing token
    evaluateGodAuth({ origin: LAN, token: null, env: env({ PLAYTEST_MODE: '1', PLAYTEST_TOKEN: 't' }), rateLimiter: tracking })
    // Token mismatch
    evaluateGodAuth({ origin: LAN, token: 'wrong', env: env({ PLAYTEST_MODE: '1', PLAYTEST_TOKEN: 't' }), rateLimiter: tracking })
    expect(calls).toEqual(['failure', 'failure', 'failure'])
  })

  it('playtest-off rejection does NOT bump rate-limit — prevents leaking playtest-mode state via timing', () => {
    const calls: string[] = []
    const tracking: GodRateLimiter = {
      isBlocked: () => false,
      recordFailure: () => calls.push('failure'),
      recordSuccess: () => calls.push('success'),
    }
    evaluateGodAuth({ origin: LAN, token: 't', env: env(), rateLimiter: tracking })
    expect(calls).toEqual([])
  })

  it('rate-limited rejection does NOT re-bump counter (already blocked)', () => {
    const calls: string[] = []
    const tracking: GodRateLimiter = {
      isBlocked: () => true,
      recordFailure: () => calls.push('failure'),
      recordSuccess: () => calls.push('success'),
    }
    evaluateGodAuth({ origin: LAN, token: 't', env: env({ PLAYTEST_MODE: '1', PLAYTEST_TOKEN: 't' }), rateLimiter: tracking })
    expect(calls).toEqual([])
  })

  it('successful auth calls recordSuccess (resets counter)', () => {
    const calls: string[] = []
    const tracking: GodRateLimiter = {
      isBlocked: () => false,
      recordFailure: () => calls.push('failure'),
      recordSuccess: () => calls.push('success'),
    }
    evaluateGodAuth({ origin: LAN, token: 't', env: env({ PLAYTEST_MODE: '1', PLAYTEST_TOKEN: 't' }), rateLimiter: tracking })
    expect(calls).toEqual(['success'])
  })
})

// ─────────── createGodRateLimiter — stateful Map-backed impl ───────────

describe('createGodRateLimiter', () => {
  it('fresh source is not blocked', () => {
    const store = new Map()
    const limiter = createGodRateLimiter(store, '1.2.3.4', { nowMs: () => 0 })
    expect(limiter.isBlocked()).toBe(false)
  })

  it('blocks on 3rd failure within the 60s window (threshold=3)', () => {
    let now = 0
    const store = new Map()
    const limiter = createGodRateLimiter(store, '1.2.3.4', { nowMs: () => now })
    limiter.recordFailure()
    now = 10_000
    limiter.recordFailure()
    expect(limiter.isBlocked()).toBe(false)
    now = 20_000
    limiter.recordFailure()
    expect(limiter.isBlocked()).toBe(true)
  })

  it('does not block when failures span multiple windows', () => {
    let now = 0
    const store = new Map()
    const limiter = createGodRateLimiter(store, '1.2.3.4', { nowMs: () => now })
    limiter.recordFailure() // t=0
    now = 30_000
    limiter.recordFailure() // t=30s, same window
    now = 65_000
    // t=65s — outside original 60s window, counter resets
    limiter.recordFailure()
    expect(limiter.isBlocked()).toBe(false)
  })

  it('recordSuccess clears the counter even after failures', () => {
    let now = 0
    const store = new Map()
    const limiter = createGodRateLimiter(store, '1.2.3.4', { nowMs: () => now })
    limiter.recordFailure()
    limiter.recordFailure()
    limiter.recordFailure()
    expect(limiter.isBlocked()).toBe(true)
    limiter.recordSuccess()
    expect(limiter.isBlocked()).toBe(false)
  })

  it('different source keys have independent counters', () => {
    const store = new Map()
    const a = createGodRateLimiter(store, 'a', { nowMs: () => 0 })
    const b = createGodRateLimiter(store, 'b', { nowMs: () => 0 })
    a.recordFailure()
    a.recordFailure()
    a.recordFailure()
    expect(a.isBlocked()).toBe(true)
    expect(b.isBlocked()).toBe(false)
  })

  it('isBlocked with a stale (past-window) entry returns false', () => {
    let now = 0
    const store = new Map()
    const limiter = createGodRateLimiter(store, 'k', { nowMs: () => now })
    limiter.recordFailure()
    limiter.recordFailure()
    limiter.recordFailure()
    expect(limiter.isBlocked()).toBe(true)
    now = 120_000
    expect(limiter.isBlocked()).toBe(false)
  })
})
