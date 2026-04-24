/**
 * Seat factory — creates Playwright contexts, joins rooms, returns SeatHandles.
 *
 * Given a running Playwright `Browser` plus a room code + seat name + seat id
 * + run paths + viewport, opens an iPhone-13-device context (hasTouch=true,
 * viewport overridden by the passed-in Viewport), navigates to
 * `/player.html?room=<CODE>`, fills the name input, clicks "Check In",
 * waits for the dossier card that proves the lobby is rendering, and
 * returns a `SeatHandle` ready for a Phase 4 agent to consume.
 *
 * Insight-022 boundary: zero imports from `src/server` or `src/shared`.
 * Playwright is imported as a TYPE only — the runtime `Browser` is injected
 * by the caller (orchestrator in Unit 6, tests via a mock in this file's
 * sibling test). This keeps the module Vitest-Node-importable without
 * pulling any Workers-polluted transitive deps.
 *
 * This module handles NO secrets. Error messages include `roomCode` and
 * `seatName` (non-secrets per the trust model) but NOTHING token-shaped.
 */
import * as path from 'node:path'
import type { Browser } from '@playwright/test'
import type { SeatHandle, Viewport } from './types'
import type { RunDirPaths } from './run-directory'

// Mirror of:
//   - `src/client/player/JoinScreen.tsx:30` (CLIENT_NAME_PATTERN)
//   - `src/server/room.ts:45`               (NAME_PATTERN)
//   - `src/server/validation.ts:120`        (NameRegex)
// Triple-source-of-truth; keep in lockstep if the name pattern ever changes.
export const SEAT_NAME_PATTERN = /^[a-zA-Z0-9 .!?_-]{1,12}$/

// Room codes are generated client-side in `Board.tsx#generateRoomCode` from
// the alphabet `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (31 chars, 6 long). The
// server does NOT re-validate the room name beyond whatever partyserver's
// route does — there is no server regex to mirror. We use a defensive
// validator here to (a) fail fast on operator typos and (b) guarantee the
// value is URL-safe before we interpolate it. 4-8 chars tolerates any
// future tweak to the code length without requiring a harness update.
export const ROOM_CODE_PATTERN = /^[A-Z0-9]{4,8}$/

// Canonical "join succeeded, lobby is live" signal.
//
// Source: `src/client/player/JoinScreen.tsx` line 73 — when `assignedColor`
// is non-null (server accepted the join), JoinScreen renders
// `<section className={styles.dossierCard} aria-label="Your dossier">`.
// aria-label survives CSS-module hashing, which raw class-name selectors
// would not. Existing E2E tests don't wait on a phone-side selector
// (they wait on `board` via `waitForPlayerCount`); this is the first
// phone-side join-confirmed selector introduced by the harness.
export const DEFAULT_LOBBY_SELECTOR = '[aria-label="Your dossier"]'

// --- Pure helpers (unit-tested below) --------------------------------------

/**
 * Build the player-page URL. Always URL-encodes the room code defensively,
 * even though legit room codes never contain special characters — this
 * ensures a misconfigured harness call can't smuggle `&` or `#` into a
 * query string and open up the room-code input to URL-parameter injection.
 */
export function buildPlayerUrl(baseUrl: string, roomCode: string): string {
  // Strip a trailing slash so `baseUrl/` and `baseUrl` behave identically.
  const trimmed = baseUrl.replace(/\/+$/, '')
  return `${trimmed}/player.html?room=${encodeURIComponent(roomCode)}`
}

/**
 * Build the per-seat artifact paths. Both go inside the run directory's
 * pre-existing `seats/` and `suspicions/` subdirectories (created by
 * `createRunDirectory` in Unit 2).
 */
export function buildSeatPaths(
  runPaths: RunDirPaths,
  seatId: string,
): { readonly logPath: string; readonly suspicionPath: string } {
  return {
    logPath: path.join(runPaths.seatsDir, `${seatId}.log.md`),
    suspicionPath: path.join(runPaths.suspicionsDir, `${seatId}.suspicions.md`),
  }
}

/** Validate seat name against the canonical regex. Throws with actionable error. */
export function assertValidSeatName(seatName: string): void {
  if (!SEAT_NAME_PATTERN.test(seatName)) {
    throw new Error(
      `seat name ${JSON.stringify(seatName)} fails name regex ${SEAT_NAME_PATTERN.toString()}`,
    )
  }
}

/** Validate room code. Throws with actionable error. */
export function assertValidRoomCode(roomCode: string): void {
  if (!ROOM_CODE_PATTERN.test(roomCode)) {
    throw new Error(
      `room code ${JSON.stringify(roomCode)} fails regex ${ROOM_CODE_PATTERN.toString()}`,
    )
  }
}

// --- Public API ------------------------------------------------------------

/**
 * The iPhone 13 device preset from Playwright has a default viewport of
 * 390×844. The harness supports 360×640 / 390×844 / 768×1024 (R9), so the
 * device preset's viewport is overridden by the caller-supplied viewport.
 *
 * The only device-preset field we rely on is the iOS Safari userAgent +
 * mobile viewport semantics. `hasTouch: true` is asserted explicitly to
 * mirror `tests/e2e/fixtures.ts:19`.
 */
export async function createSeat(args: {
  readonly browser: Browser
  readonly roomCode: string
  readonly seatName: string
  readonly seatId: string
  readonly runPaths: RunDirPaths
  readonly viewport: Viewport
  readonly playerBaseUrl?: string
  readonly lobbySelector?: string
  readonly joinTimeoutMs?: number
}): Promise<SeatHandle> {
  const {
    browser,
    roomCode,
    seatName,
    seatId,
    runPaths,
    viewport,
    playerBaseUrl = 'http://localhost:5173',
    lobbySelector = DEFAULT_LOBBY_SELECTOR,
    joinTimeoutMs = 15_000,
  } = args

  // Validate BEFORE opening a browser context — an invalid arg should not
  // leak a dangling context.
  assertValidSeatName(seatName)
  assertValidRoomCode(roomCode)

  const url = buildPlayerUrl(playerBaseUrl, roomCode)
  const { logPath, suspicionPath } = buildSeatPaths(runPaths, seatId)

  // `devices` is imported lazily so TS doesn't complain about circular
  // imports in test-mock mode. Playwright's `devices` import is a pure
  // constant table — importing it has no runtime cost beyond module load.
  const { devices } = await import('@playwright/test')
  const iPhone13 = devices['iPhone 13']!

  // newContext — mirrors tests/e2e/fixtures.ts:19 exactly, with the
  // viewport explicitly overridden per the harness's R9 viewport matrix.
  const context = await browser.newContext({
    ...iPhone13,
    hasTouch: true,
    viewport: { width: viewport.width, height: viewport.height },
  })

  let page: Awaited<ReturnType<typeof context.newPage>>
  try {
    page = await context.newPage()
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: joinTimeoutMs })
    // Mirror tests/e2e/helpers.ts:35-38 character-for-character.
    await page.locator('input[type="text"]').fill(seatName)
    await page.locator('button:has-text("Check In")').click()
    // Proof the server accepted the join and the phone rendered the
    // dossier card. If this times out, the join failed — bubble up a
    // non-secret error message.
    await page.waitForSelector(lobbySelector, { timeout: joinTimeoutMs })
  } catch (err) {
    // Don't leak the URL — it contains no token but still prefer seat-level
    // identifiers for logs. `roomCode` and `seatName` are non-secrets.
    await context.close().catch(() => {
      /* best-effort cleanup; swallow to preserve the original error */
    })
    const reason = err instanceof Error ? err.message : String(err)
    throw new Error(
      `createSeat failed to join room=${roomCode} as seat=${seatId} name=${JSON.stringify(seatName)}: ${reason}`,
    )
  }

  return {
    seatId,
    seatName,
    roomCode,
    page,
    viewport,
    logPath,
    suspicionPath,
    scenariosPath: 'docs/testing/playtest/SCENARIOS.md',
  }
}
