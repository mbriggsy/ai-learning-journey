/**
 * `playtest-config` admin message — parse + first-write-wins latch logic.
 *
 * Two pure helpers that room.ts composes into the god-connection message
 * handler (Unit 5):
 *   - `parsePlaytestConfigMessage(raw)` — Zod-validated parse
 *   - `applyPlaytestConfig(state, phase, incoming)` — latch transition
 *
 * Not part of `ClientMessageSchema` — this is a god-only admin protocol.
 * Keeping it out of the main schema means `playtest-config` literals
 * never ship to production clients (Unit 7 sentinel guard).
 */

import { z } from 'zod'

// --- Schema ---

const PlaytestConfigMessageSchema = z.object({
  type: z.literal('playtest-config'),
  seed: z.int().min(0),
  nopeWindowMs: z.int().min(1).max(30 * 60_000),
}).strict()

export type PlaytestConfigPayload = {
  seed: number
  nopeWindowMs: number
}

export type PlaytestConfigParseResult =
  | { ok: true; payload: PlaytestConfigPayload }
  | { ok: false; error: string }

export function parsePlaytestConfigMessage(raw: string): PlaytestConfigParseResult {
  let json: unknown
  try {
    json = JSON.parse(raw)
  } catch {
    return { ok: false, error: 'Invalid JSON' }
  }
  const result = PlaytestConfigMessageSchema.safeParse(json)
  if (!result.success) {
    return { ok: false, error: 'Invalid playtest-config' }
  }
  return { ok: true, payload: { seed: result.data.seed, nopeWindowMs: result.data.nopeWindowMs } }
}

// --- Latch transition ---

export interface PlaytestConfigState {
  locked: boolean
  seed?: number
  nopeWindowMs?: number
}

export type PlaytestConfigRejectCode = 'PLAYTEST_CONFIG_LOCKED' | 'PLAYTEST_CONFIG_TOO_LATE'

export type PlaytestConfigApplyResult =
  | { ok: true; nextState: PlaytestConfigState }
  | { ok: false; code: PlaytestConfigRejectCode }

/**
 * First-write-wins latch. The write is legal only when the current state
 * is unlocked AND the game is still in lobby (or not yet started —
 * `phase === null` means `gameState` hasn't been initialized yet).
 *
 * Decision order:
 *   1. Already locked → PLAYTEST_CONFIG_LOCKED (more informative than
 *      TOO_LATE because it tells the orchestrator a previous config
 *      succeeded — useful for debugging duplicate-send races)
 *   2. Phase past lobby → PLAYTEST_CONFIG_TOO_LATE
 *   3. Otherwise → accept + lock
 *
 * Pure — does not mutate `current`. Caller owns the state swap.
 */
export function applyPlaytestConfig(
  current: PlaytestConfigState,
  phase: 'lobby' | 'playing' | 'game_over' | null,
  incoming: PlaytestConfigPayload,
): PlaytestConfigApplyResult {
  if (current.locked) {
    return { ok: false, code: 'PLAYTEST_CONFIG_LOCKED' }
  }
  if (phase !== null && phase !== 'lobby') {
    return { ok: false, code: 'PLAYTEST_CONFIG_TOO_LATE' }
  }
  return {
    ok: true,
    nextState: {
      locked: true,
      seed: incoming.seed,
      nopeWindowMs: incoming.nopeWindowMs,
    },
  }
}
