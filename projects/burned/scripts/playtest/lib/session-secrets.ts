// PLAYTEST_TREE_SHAKE_SENTINEL_SESSION_SECRETS_3B: this string must NEVER appear in dist output (regression-tested against dist JS chunks)
/**
 * Per-session token + scrub salt minting — Phase 3 Unit 3b.
 *
 * Two INDEPENDENT 64-hex-char CSPRNG draws per session:
 *   - `mintPlaytestToken()` — bounds token-leak scope to one session
 *   - `mintScrubSalt()`     — keeps scrub-hash non-reversibility across sessions
 *
 * Both primitives are pure aside from `crypto.randomBytes`. Minted values
 * MUST NEVER be logged (no `console.log` in this module, no throw messages
 * containing a minted value). Orchestrator (Unit 6) treats the token as
 * write-to-env-then-forget; salt stays in orchestrator memory and is passed
 * to every `scrub()` call.
 *
 * Tree-shake contract: nothing in `src/client/` or `src/server/` may import
 * from `scripts/playtest/`. The sentinel comment on line 1 plus the public
 * function names are regression-tested against emitted JS chunks in the
 * production dist directory, guaranteeing this module never ships to the
 * browser.
 */

import { randomBytes } from 'node:crypto'

/**
 * Mint a fresh 64-hex-char token for this playtest session. Orchestrator
 * seeds this into the wrangler subprocess env as `PLAYTEST_TOKEN`, then
 * supplies it to the god-WS handshake. Valid for a single session only —
 * no rotation logic required.
 */
export function mintPlaytestToken(): string {
  return randomBytes(32).toString('hex')
}

/**
 * Mint an INDEPENDENT 64-hex-char scrub salt for this playtest session.
 * Separate `randomBytes` invocation so a token leak does not compromise
 * salt secrecy, and vice versa. Salt is passed to every `scrub()` call in
 * Unit 4b; never persisted, never logged.
 */
export function mintScrubSalt(): string {
  return randomBytes(32).toString('hex')
}

/**
 * Test-only random-source override.
 *
 * Returns an object wrapping `mintPlaytestToken` / `mintScrubSalt` that
 * use the provided deterministic source instead of `crypto.randomBytes`.
 * Does NOT globally mutate module state — callers must use the returned
 * object. Intended strictly for unit tests; never use in production code.
 *
 * The `source` callback MUST return a Buffer of length 32. Shorter or
 * longer buffers will throw or produce an unexpected-length hex string.
 */
export function withRandomSource(source: () => Buffer): {
  mintPlaytestToken: () => string
  mintScrubSalt: () => string
} {
  return {
    mintPlaytestToken: () => source().toString('hex'),
    mintScrubSalt: () => source().toString('hex'),
  }
}
