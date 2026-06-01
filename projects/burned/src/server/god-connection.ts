/**
 * God-connection accept logic. Pure helpers + a rate-limiter interface so
 * the whole decision is unit-testable without importing `room.ts` (see
 * insight 022 — partyserver's `cloudflare:` scheme poisons Vitest-Node).
 *
 * The WS onConnect path in `room.ts` constructs a stateful
 * `GodRateLimiter` per-room and calls `evaluateGodAuth` with the incoming
 * request's origin + token. Result is a decision: either accept (tag
 * connection as role: 'god') or close with a specific 4003/4004/4005.
 */

import { getGodOriginAllowlist, isPlaytestMode, matchesToken, type PlaytestEnv } from './playtest'

/**
 * Rate-limit abstraction. The room supplies a concrete implementation
 * backed by a Map keyed by source (remote IP or origin). Keeping the
 * interface here means `evaluateGodAuth` stays stateless and testable.
 */
export interface GodRateLimiter {
  /** True when the source has accumulated enough failures to be blocked. */
  isBlocked(): boolean
  /** Called after any rejection that should count against the source. */
  recordFailure(): void
  /** Called on successful auth — resets the counter. */
  recordSuccess(): void
}

export type GodAuthDecision =
  | { ok: true }
  | { ok: false; closeCode: 4003 | 4004 | 4005; closeReason: string }

/**
 * Stricter-than-player origin allowlist for god connections.
 *
 * Accepts:
 *   - localhost + 127.x.x.x on any port
 *   - RFC1918 private ranges (192.168/16, 10/8, 172.16-31/12)
 *   - Exact-string matches against `envAllowlist` (from
 *     `PLAYTEST_GOD_ORIGINS`)
 *
 * Rejects everything else, including the public player origin
 * `https://burnedgame.pages.dev`. Rationale: the god role is omniscient; a
 * leaked token must not be exploitable without also controlling a LAN
 * endpoint or an explicitly allowlisted origin.
 */
export function isGodOriginAllowed(origin: string | null, envAllowlist: string[]): boolean {
  if (!origin) return false
  if (envAllowlist.includes(origin)) return true
  // LAN + localhost. Matches the existing player origin heuristic at
  // room.ts:172 (keep in sync if that regex evolves).
  const lanPattern = /^https?:\/\/(localhost|127\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/
  return lanPattern.test(origin)
}

/**
 * Evaluate a god-connection attempt. Side effect: bumps the rate limiter
 * on failures that the source controls (origin, token). Does NOT bump on
 * playtest-off or already-blocked paths — those are either deploy state
 * (no user-actionable signal) or already counted.
 *
 * Decision order is deliberate:
 *   1. Playtest mode off → 4004 (static deploy state — fails closed
 *      immediately, no rate-limit interaction)
 *   2. Rate-limited → 4005 (gate BEFORE any token evaluation so
 *      a token-guessing bot cannot bypass rate limits)
 *   3. Origin not in god allowlist → 4003 (public origins rejected
 *      even with a correct token)
 *   4. Token missing → 4004
 *   5. Token mismatch → 4004 (constant-time compare via
 *      `matchesToken`)
 *   6. Otherwise accept
 */
export function evaluateGodAuth(params: {
  origin: string | null
  token: string | null
  env: PlaytestEnv
  rateLimiter: GodRateLimiter
}): GodAuthDecision {
  const { origin, token, env, rateLimiter } = params

  if (!isPlaytestMode(env)) {
    return { ok: false, closeCode: 4004, closeReason: 'Playtest mode off' }
  }
  if (rateLimiter.isBlocked()) {
    return { ok: false, closeCode: 4005, closeReason: 'Rate limited' }
  }
  if (!isGodOriginAllowed(origin, getGodOriginAllowlist(env))) {
    rateLimiter.recordFailure()
    return { ok: false, closeCode: 4003, closeReason: 'Forbidden god origin' }
  }
  if (!token) {
    rateLimiter.recordFailure()
    return { ok: false, closeCode: 4004, closeReason: 'Missing token' }
  }
  if (!matchesToken(env, token)) {
    rateLimiter.recordFailure()
    return { ok: false, closeCode: 4004, closeReason: 'Token mismatch' }
  }
  rateLimiter.recordSuccess()
  return { ok: true }
}

/**
 * Stateful rate-limiter impl backed by a Map<string, { count, windowStart }>.
 * Window length default 60s, failure threshold default 3. Keyed by source
 * (remote IP or origin). Counter resets either on success OR on a new
 * window (rolling).
 *
 * Factory shape so the room can construct one per-source per-attempt —
 * cheap because the backing Map lives on the room.
 */
export function createGodRateLimiter(
  store: Map<string, { count: number; windowStart: number }>,
  sourceKey: string,
  opts: { windowMs?: number; threshold?: number; nowMs?: () => number } = {},
): GodRateLimiter {
  const windowMs = opts.windowMs ?? 60_000
  const threshold = opts.threshold ?? 3
  const now = opts.nowMs ?? (() => Date.now())
  return {
    isBlocked(): boolean {
      const entry = store.get(sourceKey)
      if (!entry) return false
      if (now() - entry.windowStart > windowMs) {
        // Stale window — let the next failure reset it.
        return false
      }
      return entry.count >= threshold
    },
    recordFailure(): void {
      const entry = store.get(sourceKey)
      const t = now()
      if (!entry || t - entry.windowStart > windowMs) {
        store.set(sourceKey, { count: 1, windowStart: t })
      } else {
        entry.count += 1
      }
    },
    recordSuccess(): void {
      store.delete(sourceKey)
    },
  }
}
