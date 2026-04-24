/**
 * Playtest-mode env inspection. Pure module; safe to import from anywhere in
 * `src/server/` that needs to branch on the flag. Never logs token values.
 *
 * Kept in its own module (NOT `room.ts`) per the room-exports landmine:
 * `src/server/room.ts` may only export the `GameRoom` class; any additional
 * named export crashes Wrangler boot.
 */

/**
 * The shape of the Workers `Env` subset this module reads. The real `Env`
 * interface in `room.ts` carries additional bindings (e.g. `GameRoom`
 * DurableObjectNamespace). Defining a focused shape here keeps this module
 * pure and its tests trivial.
 */
export interface PlaytestEnv {
  PLAYTEST_MODE?: string
  PLAYTEST_TOKEN?: string
  PLAYTEST_GOD_ORIGINS?: string
}

/**
 * True iff the Worker was booted with `PLAYTEST_MODE=1` exactly.
 * Any other value (`'0'`, `'true'`, `'yes'`, unset, whitespace-padded) is false.
 * Strict equality is deliberate: a typo in the env file should fail closed.
 */
export function isPlaytestMode(env: PlaytestEnv): boolean {
  return env.PLAYTEST_MODE === '1'
}

/**
 * Constant-time(-ish) token comparison.
 *
 * Returns false immediately for unset or empty `PLAYTEST_TOKEN` — an empty
 * expected token is a misconfiguration, not a valid credential, and must
 * never authenticate.
 *
 * Length is treated as public information (standard for constant-time string
 * compare — matches Node's `crypto.timingSafeEqual` contract which requires
 * equal-length inputs). For equal-length inputs the loop runs to completion,
 * XOR-accumulating character differences so no per-character branch short-
 * circuits and leaks partial-match timing.
 */
export function matchesToken(env: PlaytestEnv, provided: string): boolean {
  const expected = env.PLAYTEST_TOKEN
  if (!expected) return false
  if (expected.length !== provided.length) return false
  let diff = 0
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ provided.charCodeAt(i)
  }
  return diff === 0
}

/**
 * Parse the optional comma-separated `PLAYTEST_GOD_ORIGINS` allowlist.
 * Whitespace trimmed; empty entries dropped.
 *
 * Returns `[]` when unset — the caller (Unit 4's god-connection handler)
 * treats empty-list as "LAN + localhost defaults only."
 */
export function getGodOriginAllowlist(env: PlaytestEnv): string[] {
  const raw = env.PLAYTEST_GOD_ORIGINS
  if (!raw) return []
  return raw.split(',').map(s => s.trim()).filter(Boolean)
}
