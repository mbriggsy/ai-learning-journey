#!/usr/bin/env tsx
/**
 * Phase 6 Unit 2.6 — board-view-launcher integration smoke.
 *
 * Proves the new orchestrator-owned `launchBoardView` opt actually starts a
 * game end-to-end against live wrangler + vite + Playwright.
 *
 * Why this exists: insight 032 caught Phase 6 Unit 2.5's lobby-stuck bug
 * because the Option A harness retired the orchestrator's board client and
 * nobody picked it up. Unit 2.6 adds back an orchestrator-owned board page;
 * THIS smoke is the regression boundary that proves the new path actually
 * boots a game from "agents join" → "board taps Cleared Hot" → "first
 * turn dispatched" → "events.jsonl has god-events."
 *
 *   1. Boot wrangler + vite (via orchestrator).
 *   2. Open god WS + send playtest-config (via orchestrator).
 *   3. Join 2 REAL Playwright seats into a SMOKE-prefix room
 *      (mocking the agents that Option A would dispatch — the launcher
 *      doesn't care WHO joins, it just needs lobby fill).
 *   4. Orchestrator's `launchBoardView` opens its own chromium board page.
 *      Polls until "Cleared Hot" is enabled, clicks once.
 *   5. seatDriver waits for "End turn" to appear on either seat (proof the
 *      game actually started), taps it (proof actions flow), pauses for
 *      the god-event flush.
 *   6. Orchestrator finalize closes board → seats → god → servers.
 *
 * Assertions (THESE are the smoke contract):
 *   A. runSession returned outcome === 'success'.
 *   B. events.jsonl exists, ≥1 valid JSON line, ≥1 of type 'god-event'.
 *   C. session.md contains '## Session Start' AND '## Session End'.
 *   D. Wallclock under budget (2 min).
 *
 * Why 2 seats (not 3)? BURNED's min game start is 2 players
 * (`src/client/board/Lobby.tsx:35 — canStart = lobby.players.length >= 2`).
 *
 * Selftest gate: smoke skips it via `opts.skipSelftestGate = true`. Gate
 * verification is Phase 3 Unit 7's job; this smoke is Unit 2.6's E2E proof.
 */

import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { chromium, type Browser, type Page } from '@playwright/test'

import { runSession, type CreateSeatArgs } from '../lib/orchestrator'
import { launchBoardView } from '../lib/board-view-launcher'
import type { Config, SeatHandle } from '../lib/types'
import defaultConfig from '../config/default-config.json' with { type: 'json' }
import { createSeat as realCreateSeat } from '../lib/seat-factory'
import type { GodHandle } from '../lib/god-subscriber'

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

function mintRoomCode(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  let code = 'B26' // Unit 2.6 prefix so smoke rooms are visually identifiable
  for (let i = 0; i < 3; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]!
  }
  return code
}

const ROOM_CODE = mintRoomCode()
const SEED = 42
const NOPE_WINDOW_MS = 10_000
const SESSION_TIMEOUT_MS = 3 * 60 * 1000
const SMOKE_WALLCLOCK_BUDGET_MS = 120_000

// -----------------------------------------------------------------------------
// Seat driver — wait for "End turn" on a seat, tap it, give events a beat.
// -----------------------------------------------------------------------------

function makeSeatDriver(
  logger: (msg: string) => void,
): (seats: readonly SeatHandle[], god: GodHandle) => Promise<void> {
  return async (seats, _god) => {
    if (seats.length < 2) {
      throw new Error(`board-launcher-smoke: need ≥2 seats, got ${seats.length}`)
    }

    // Wait for the launcher to click Cleared Hot AND for partyserver to
    // assign first turn. Poll each seat's page for "End turn" — whichever
    // shows it goes first.
    logger('[smoke-driver] waiting for some seat to see "End turn" button')
    const deadline = Date.now() + 30_000
    let actingSeat: SeatHandle | null = null
    while (Date.now() < deadline) {
      for (const seat of seats) {
        const page = seat.page as Page | null
        if (page === null) continue
        const count = await page.locator('button:has-text("End turn")').count()
        if (count > 0) {
          actingSeat = seat
          break
        }
      }
      if (actingSeat !== null) break
      await delay(250)
    }
    if (actingSeat === null) {
      throw new Error('board-launcher-smoke: no seat showed "End turn" within 30s after Cleared Hot')
    }
    logger(`[smoke-driver] seat ${actingSeat.seatId} is acting; tapping End turn`)

    const actingPage = actingSeat.page as Page
    await actingPage
      .locator('button:has-text("End turn")')
      .first()
      .click({ timeout: 5_000 })

    // Give the server + god subscriber + jsonl flush loop a window.
    logger('[smoke-driver] waiting for god-event to land in events.jsonl')
    await delay(2_500)
  }
}

// -----------------------------------------------------------------------------
// Assertions
// -----------------------------------------------------------------------------

interface AssertionResult {
  readonly name: string
  readonly ok: boolean
  readonly detail?: string
}

async function assertEventsJsonl(eventsPath: string): Promise<AssertionResult> {
  try {
    const raw = await fs.readFile(eventsPath, 'utf8')
    const lines = raw.split('\n').filter((l) => l.trim().length > 0)
    if (lines.length === 0) {
      return { name: 'events.jsonl has ≥1 line', ok: false, detail: 'file empty' }
    }
    let godEvents = 0
    for (const line of lines) {
      try {
        const obj = JSON.parse(line) as { type?: string }
        if (obj.type === 'god-event') godEvents++
      } catch {
        return { name: 'events.jsonl lines parse', ok: false, detail: `invalid JSON: ${line.slice(0, 80)}` }
      }
    }
    if (godEvents === 0) {
      return {
        name: 'events.jsonl has ≥1 god-event',
        ok: false,
        detail: `${lines.length} lines, 0 of type 'god-event'`,
      }
    }
    return {
      name: 'events.jsonl valid',
      ok: true,
      detail: `${lines.length} line(s), ${godEvents} god-event(s)`,
    }
  } catch (err) {
    return {
      name: 'events.jsonl readable',
      ok: false,
      detail: err instanceof Error ? err.message : String(err),
    }
  }
}

async function assertSessionMd(runDir: string): Promise<AssertionResult> {
  const sessionMdPath = path.join(runDir, 'session.md')
  try {
    const raw = await fs.readFile(sessionMdPath, 'utf8')
    const hasStart = raw.includes('## Session Start')
    const hasEnd = raw.includes('## Session End')
    if (!hasStart) return { name: 'session.md has start block', ok: false, detail: "missing '## Session Start'" }
    if (!hasEnd) return { name: 'session.md has end block', ok: false, detail: "missing '## Session End'" }
    return { name: 'session.md has start+end blocks', ok: true }
  } catch (err) {
    return {
      name: 'session.md readable',
      ok: false,
      detail: err instanceof Error ? err.message : String(err),
    }
  }
}

// -----------------------------------------------------------------------------
// Main
// -----------------------------------------------------------------------------

function buildConfig(): Config {
  const base = defaultConfig as {
    catalogPath: string
    outputRoot: string
    viewports: { width: number; height: number; label: string }[]
    freePlayWallclockFraction: number
    sessionDirRetention: number
    scrubMode: 'on' | 'off'
    godReassemblyTimeoutMs: number
  }
  return {
    seats: 2,
    seatNames: ['Smoker1', 'Smoker2'],
    seed: SEED,
    nopeWindowMs: NOPE_WINDOW_MS,
    sessionTimeoutMs: SESSION_TIMEOUT_MS,
    roomCode: ROOM_CODE,
    catalogPath: base.catalogPath,
    outputRoot: base.outputRoot,
    viewports: [{ width: 390, height: 844, label: '390x844' }],
    freePlayWallclockFraction: base.freePlayWallclockFraction,
    sessionDirRetention: base.sessionDirRetention,
    scrubMode: base.scrubMode,
    godReassemblyTimeoutMs: base.godReassemblyTimeoutMs,
  }
}

async function main(): Promise<number> {
  // eslint-disable-next-line no-console
  const log = (m: string): void => console.log(m)
  log(`[board-launcher-smoke] starting (room=${ROOM_CODE})`)
  const wallclockStart = Date.now()

  const config = buildConfig()
  let seatBrowser: Browser | null = null

  // Build deps:
  //   - createBrowser: orchestrator's seat-Playwright browser (separate
  //     from the one launchBoardView spawns — that's the whole design).
  //   - createSeat: real Playwright seats join the lobby.
  //   - launchBoardView: REAL — this is what we're proving works.
  //   - seatDriver: wait for first "End turn", tap it, sleep for flush.
  const result = await runSession(
    config,
    {
      createBrowser: async () => {
        seatBrowser = await chromium.launch({ headless: true })
        return seatBrowser
      },
      createSeat: (args: CreateSeatArgs): Promise<SeatHandle> => realCreateSeat(args),
      launchBoardView,
      seatDriver: makeSeatDriver(log),
      logger: log,
    },
    {
      skipSelftestGate: true,
      // skipBrowserLaunch defaults to false — we want real Playwright seats
      // for this smoke (mocking the agents that Option A would dispatch).
      launchBoardView: true,
    },
  )

  const wallclockEnd = Date.now()
  const wallclockMs = wallclockEnd - wallclockStart

  log(`[board-launcher-smoke] runSession outcome=${result.outcome} wallclock=${wallclockMs}ms`)
  if (result.errorMessage !== undefined) {
    log(`[board-launcher-smoke] errorMessage: ${result.errorMessage}`)
  }
  log(`[board-launcher-smoke] runDir: ${result.runDir}`)
  log(`[board-launcher-smoke] eventsJsonl: ${result.eventsJsonlPath}`)

  // --- Assertions ---------------------------------------------------------
  const assertions: AssertionResult[] = []

  assertions.push({
    name: "outcome === 'success'",
    ok: result.outcome === 'success',
    detail:
      result.outcome === 'success'
        ? undefined
        : `outcome=${result.outcome} msg=${result.errorMessage ?? '(none)'}`,
  })

  if (result.runDir !== '(unassigned)') {
    assertions.push(await assertEventsJsonl(result.eventsJsonlPath))
    assertions.push(await assertSessionMd(result.runDir))
  } else {
    assertions.push({ name: 'events.jsonl valid', ok: false, detail: 'runDir unassigned' })
    assertions.push({ name: 'session.md has start+end blocks', ok: false, detail: 'runDir unassigned' })
  }

  assertions.push({
    name: 'wallclock under budget',
    ok: wallclockMs < SMOKE_WALLCLOCK_BUDGET_MS,
    detail: `${wallclockMs}ms (budget ${SMOKE_WALLCLOCK_BUDGET_MS}ms)`,
  })

  // --- Report table -------------------------------------------------------
  log('')
  log('=== Board-Launcher Smoke Assertions ===')
  for (const a of assertions) {
    const mark = a.ok ? 'PASS' : 'FAIL'
    const line = a.detail !== undefined ? `  [${mark}] ${a.name} — ${a.detail}` : `  [${mark}] ${a.name}`
    log(line)
  }
  log('')

  const allPassed = assertions.every((a) => a.ok)
  if (allPassed) {
    log('[board-launcher-smoke] ALL ASSERTIONS PASSED')
    return 0
  } else {
    const failed = assertions.filter((a) => !a.ok).length
    log(`[board-launcher-smoke] ${failed} ASSERTION(S) FAILED`)
    return 1
  }
}

let exitCode = 1
try {
  exitCode = await main()
} catch (err) {
  // eslint-disable-next-line no-console
  console.error(
    `[board-launcher-smoke] top-level threw: ${err instanceof Error ? err.stack ?? err.message : String(err)}`,
  )
  exitCode = 1
}
process.exit(exitCode)
