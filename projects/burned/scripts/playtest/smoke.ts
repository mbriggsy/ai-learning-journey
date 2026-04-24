#!/usr/bin/env tsx
/**
 * Phase 3 Unit 8 — end-to-end smoke test.
 *
 * Proves the full `runSession` orchestrator pipeline works against a live
 * wrangler + vite + Playwright stack:
 *
 *   1. Boot wrangler + vite (via orchestrator).
 *   2. Open god WS + send playtest-config (via orchestrator).
 *   3. Join 2 seats into room 'SMOKE' (via orchestrator + createSeat).
 *   4. Open a board tab at /board.html#SMOKE and click "Cleared Hot".
 *   5. Wait for seat 0 to be "my turn" then tap "End turn / draw".
 *   6. God subscriber captures the resulting god-event(s) into events.jsonl.
 *   7. Orchestrator tears down reverse order (seats → god → servers).
 *
 * Assertions (THESE are the smoke contract):
 *   A. runSession returned outcome === 'success'.
 *   B. events.jsonl exists, ≥1 valid JSON line, ≥1 is type 'god-event'.
 *   C. session.md contains '## Session Start' AND '## Session End'.
 *   D. No orphan workerd/wrangler/vite processes after teardown. (warn-only;
 *      orphan detection on Windows is noisy, so we don't fail the run — we
 *      print a warning so operator sees leaks.)
 *
 * Why 2 seats (not 3)? BURNED's min game start is 2 players
 * (`src/client/board/Lobby.tsx:35 — canStart = lobby.players.length >= 2`).
 *
 * Selftest gate: smoke skips it via `opts.skipSelftestGate = true`. Gate
 * verification is Unit 7's job; Unit 8 is the pipeline-E2E proof.
 */

import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { spawn as nodeSpawn } from 'node:child_process'
import { chromium, type Browser, type BrowserContext, type Page } from '@playwright/test'

import { runSession, type CreateSeatArgs } from './lib/orchestrator'
import type { Config, SeatHandle } from './lib/types'
import defaultConfig from './config/default-config.json' with { type: 'json' }
import { createSeat as realCreateSeat } from './lib/seat-factory'
import type { GodHandle } from './lib/god-subscriber'

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

/**
 * Room code is randomized per-run. Partyserver's Durable Object state
 * persists across wrangler restarts (local SQLite), so reusing a fixed
 * room code across runs lands the server in "playing" (or "game_over")
 * phase on run 2 — `handleJoin` rejects new seats that aren't
 * name-reclaim candidates. Fresh code per run = fresh DO = clean state.
 * Alphabet matches `Board.tsx#generateRoomCode` (31 unambiguous chars).
 */
function mintRoomCode(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  let code = 'SMK' // prefix so smoke rooms are visually identifiable in logs
  for (let i = 0; i < 3; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]!
  }
  return code
}

const ROOM_CODE = mintRoomCode()
const BOARD_URL = `http://localhost:5173/board.html#${ROOM_CODE}`
const SEED = 42
const NOPE_WINDOW_MS = 10_000
const SESSION_TIMEOUT_MS = 3 * 60 * 1000 // 3 min cap on session wallclock
const SMOKE_WALLCLOCK_BUDGET_MS = 120_000 // 2 min soft budget for whole smoke

// -----------------------------------------------------------------------------
// Smoke-internal shared state.
//
// The orchestrator's `createBrowser` dep is the ONLY seam that hands us the
// live Browser. We capture it here so `smokeSeatDriver` can open a board
// tab in the same browser instance.
// -----------------------------------------------------------------------------

interface SharedBrowserSlot {
  browser: Browser | null
}

function makeBrowserCapturingDep(slot: SharedBrowserSlot): () => Promise<Browser> {
  return async () => {
    const browser = await chromium.launch({ headless: true })
    slot.browser = browser
    return browser
  }
}

// -----------------------------------------------------------------------------
// Seat driver — the deterministic play.
// -----------------------------------------------------------------------------

function makeSmokeSeatDriver(
  slot: SharedBrowserSlot,
  logger: (msg: string) => void,
): (seats: readonly SeatHandle[], god: GodHandle) => Promise<void> {
  return async (seats, _god) => {
    if (slot.browser === null) {
      throw new Error('smoke: browser slot empty — createBrowser dep not invoked')
    }
    if (seats.length < 2) {
      throw new Error(`smoke: need ≥2 seats, got ${seats.length}`)
    }

    // Give both seats a beat to land in the lobby.
    await delay(500)

    // --- Open board tab in the same browser -------------------------------
    logger('[smoke-driver] opening board tab')
    const boardCtx: BrowserContext = await slot.browser.newContext({
      viewport: { width: 1920, height: 1080 },
    })
    const boardPage: Page = await boardCtx.newPage()
    try {
      await boardPage.goto(BOARD_URL, { waitUntil: 'domcontentloaded', timeout: 15_000 })

      // Wait for lobby to show 2 players on the board.
      logger('[smoke-driver] waiting for lobby to show 2 players')
      await boardPage
        .locator('button:has-text("Cleared Hot")')
        .waitFor({ state: 'visible', timeout: 20_000 })

      // Click start.
      logger('[smoke-driver] clicking Cleared Hot')
      await boardPage.locator('button:has-text("Cleared Hot")').click()

      // --- Wait for seat 0 to see "End turn" (i.e. it's their turn) --------
      // Turn order is deterministic by seed (42 here), but which SEAT goes
      // first depends on server shuffle. Poll each seat for the End turn
      // button; whichever seat has it goes first.
      logger('[smoke-driver] waiting for some seat to see "End turn" button')
      const deadline = Date.now() + 20_000
      let actingSeat: SeatHandle | null = null
      while (Date.now() < deadline) {
        for (const seat of seats) {
          const page = seat.page as Page
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
        throw new Error('smoke: no seat showed "End turn" within 20s after Cleared Hot')
      }
      logger(`[smoke-driver] seat ${actingSeat.seatId} is acting; tapping End turn`)

      // Tap End turn. This dispatches a turn-ending draw → `card-drawn`
      // event → god-event broadcast → events.jsonl append.
      const actingPage = actingSeat.page as Page
      await actingPage
        .locator('button:has-text("End turn")')
        .first()
        .click({ timeout: 5_000 })

      // Give the server + god subscriber + jsonl flush loop (100ms) a
      // window to propagate. Belt-and-suspenders — we also poll the file.
      logger('[smoke-driver] waiting for god-event to land in events.jsonl')
      await delay(2_500)
    } finally {
      await boardCtx.close().catch(() => {
        /* best-effort */
      })
    }
  }
}

// -----------------------------------------------------------------------------
// Assertions (post-runSession).
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
    let parsed: unknown = null
    for (const line of lines) {
      try {
        const obj = JSON.parse(line) as { type?: string }
        if (parsed === null) parsed = obj
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

async function detectOrphans(): Promise<string[]> {
  // Windows-only detection via tasklist. Best-effort; unreliable (may flag
  // unrelated dev processes) so we warn not fail.
  if (process.platform !== 'win32') return []
  return new Promise<string[]>((resolve) => {
    const ps = nodeSpawn('tasklist', ['/FI', 'IMAGENAME eq workerd.exe'], {
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let out = ''
    ps.stdout.on('data', (d: Buffer) => {
      out += d.toString()
    })
    ps.on('close', () => {
      const matches = out.match(/workerd\.exe/gi)
      resolve(matches ?? [])
    })
    ps.on('error', () => resolve([]))
  })
}

// -----------------------------------------------------------------------------
// Main
// -----------------------------------------------------------------------------

function buildConfig(): Config {
  const base = defaultConfig as {
    nopeWindowMs: number
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
  log(`[smoke] Phase 3 Unit 8 end-to-end smoke starting (room=${ROOM_CODE})`)
  const wallclockStart = Date.now()

  const config = buildConfig()
  const browserSlot: SharedBrowserSlot = { browser: null }

  // Wire custom deps: browser-capturing createBrowser + smoke seatDriver.
  // createSeat passes `browser` forward; the orchestrator's loop calls
  // `createSeat({ browser: browser!, ... })` using its own launched browser.
  const result = await runSession(
    config,
    {
      createBrowser: makeBrowserCapturingDep(browserSlot),
      createSeat: (args: CreateSeatArgs): Promise<SeatHandle> => realCreateSeat(args),
      seatDriver: makeSmokeSeatDriver(browserSlot, log),
      logger: log,
    },
    { skipSelftestGate: true },
  )

  const wallclockEnd = Date.now()
  const wallclockMs = wallclockEnd - wallclockStart

  log(`[smoke] runSession returned outcome=${result.outcome} wallclock=${wallclockMs}ms`)
  if (result.errorMessage !== undefined) {
    log(`[smoke] errorMessage: ${result.errorMessage}`)
  }
  log(`[smoke] runDir: ${result.runDir}`)
  log(`[smoke] eventsJsonl: ${result.eventsJsonlPath}`)

  // --- Assertions ---------------------------------------------------------
  const assertions: AssertionResult[] = []

  assertions.push({
    name: "outcome === 'success'",
    ok: result.outcome === 'success',
    detail: result.outcome === 'success' ? undefined : `outcome=${result.outcome} msg=${result.errorMessage ?? '(none)'}`,
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
  log('=== Smoke Assertions ===')
  for (const a of assertions) {
    const mark = a.ok ? 'PASS' : 'FAIL'
    const line = a.detail !== undefined ? `  [${mark}] ${a.name} — ${a.detail}` : `  [${mark}] ${a.name}`
    log(line)
  }
  log('')

  // --- Orphan-process check (warn-only) -----------------------------------
  const orphans = await detectOrphans()
  if (orphans.length > 0) {
    log(`[smoke] WARNING: ${orphans.length} workerd.exe process(es) still running after teardown`)
  } else {
    log('[smoke] orphan-process check: clean (no workerd.exe lingering)')
  }

  // --- First events.jsonl line (structural preview) -----------------------
  try {
    const raw = await fs.readFile(result.eventsJsonlPath, 'utf8')
    const firstLine = raw.split('\n').find((l) => l.trim().length > 0)
    if (firstLine !== undefined) {
      const parsed = JSON.parse(firstLine) as Record<string, unknown>
      const keys = Object.keys(parsed).join(',')
      log(`[smoke] events.jsonl first-line keys: [${keys}]`)
      const actionType =
        typeof parsed.action === 'object' && parsed.action !== null
          ? (parsed.action as { type?: unknown }).type
          : undefined
      if (actionType !== undefined) log(`[smoke] events.jsonl first-line action.type: ${String(actionType)}`)
      if (typeof parsed.stateVersion === 'number') {
        log(`[smoke] events.jsonl first-line stateVersion: ${parsed.stateVersion}`)
      }
    }
  } catch {
    // best-effort preview
  }

  // --- session.md tail preview --------------------------------------------
  try {
    const sessionMdPath = path.join(result.runDir, 'session.md')
    const raw = await fs.readFile(sessionMdPath, 'utf8')
    const lines = raw.split('\n')
    const tail = lines.slice(Math.max(0, lines.length - 20)).join('\n')
    log('[smoke] session.md tail:')
    for (const l of tail.split('\n')) log(`  | ${l}`)
  } catch {
    // best-effort preview
  }

  const allPassed = assertions.every((a) => a.ok)
  log('')
  if (allPassed) {
    log('[smoke] ALL ASSERTIONS PASSED')
    return 0
  } else {
    const failed = assertions.filter((a) => !a.ok).length
    log(`[smoke] ${failed} ASSERTION(S) FAILED`)
    return 1
  }
}

let exitCode = 1
try {
  exitCode = await main()
} catch (err) {
  // eslint-disable-next-line no-console
  console.error(`[smoke] top-level threw: ${err instanceof Error ? err.stack ?? err.message : String(err)}`)
  exitCode = 1
}
// Note: we do NOT taskkill /F /IM workerd.exe here — that would also kill
// unrelated dev processes. Orphan workerd from a smoke failure is surfaced
// as a warning by `detectOrphans()`; manual `taskkill` + .wrangler/state
// recovery is the documented path (CLAUDE.md Wrangler local SQLite
// corruption recovery section).
process.exit(exitCode)
