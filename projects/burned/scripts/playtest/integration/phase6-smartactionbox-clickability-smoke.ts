#!/usr/bin/env tsx
/**
 * Phase 6 Unit 3 follow-up — SmartActionBox clickability regression smoke.
 *
 * Closes the regression boundary opened by insight 035: the .action /
 * .drawIntense / .urgent breathe pulses used to live on the button DOM,
 * which made the bounding rect non-stable forever and starved Playwright's
 * actionability check. Real harness agents (using the MCP Playwright
 * wrapper, which has no force-click escape hatch) timed out on every
 * SmartActionBox click in calibration attempt #3b.
 *
 * The fix lifted the animations to ::after pseudo-elements. This smoke
 * proves the lift HOLDS — if a future change moves transform-animating
 * keyframes back onto `.action` (or any direct descendant of `.box` that
 * IS the click target), this smoke will time out at step 7 and fail.
 *
 *   1. Boot wrangler + vite (via orchestrator).
 *   2. Open god WS (via orchestrator).
 *   3. Join 2 REAL Playwright seats into a SAB-prefix room.
 *   4. Orchestrator's launchBoardView opens a board page and clicks
 *      "Cleared Hot" once both seats are present.
 *   5. seatDriver waits for some seat to see "End turn" (proof play
 *      started).
 *   6. seatDriver reads that seat's hand via window.__gameStore (DEV
 *      hook), finds a single-action card type, double-taps to stage,
 *      then waits for SmartActionBox to render with the .action class.
 *   7. seatDriver clicks the .action button with DEFAULT Playwright
 *      actionability (no force, no skip — same checks the MCP wrapper
 *      enforces). Click MUST succeed within Playwright's 30s default.
 *      THIS click is the regression contract.
 *   8. Pause for the god-event flush, then orchestrator finalizes.
 *
 * Failure modes worth distinguishing in the assertion table:
 *   - "outcome === 'success'": runSession completed cleanly.
 *   - "saw .action button": stage step worked; SmartActionBox transitioned
 *     to .action state.
 *   - "clicked .action without timeout": THE regression contract.
 *
 * If the active seat's hand contains zero single-action card types
 * (rare under random deal but possible), the smoke fails with a clear
 * "no eligible card in hand" message rather than passing vacuously —
 * an operator can then bump the seed.
 *
 * Selftest gate skipped (smokes don't relitigate gate; that's selftest's
 * own job). 2 seats because BURNED's min start is 2.
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
  let code = 'SAB' // SmartActionBox prefix so smoke rooms are visually identifiable
  for (let i = 0; i < 3; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]!
  }
  return code
}

const ROOM_CODE = mintRoomCode()
const SEED = 42
const NOPE_WINDOW_MS = 10_000
const SESSION_TIMEOUT_MS = 3 * 60 * 1000
const SMOKE_WALLCLOCK_BUDGET_MS = 150_000

/**
 * Card types that produce SmartActionBox state .action (single-card play
 * with action — `target-${cardType}` or `ready-${cardType}` per
 * SmartActionBox.tsx#deriveState). Operatives are excluded (need pair/
 * triple → .comboPair/.comboTriple). Extraction + Burned can't be played
 * proactively. Intercepted is single but its play state is .invalid
 * via INVALID_LABELS['single-intercepted'].
 *
 * Source: SmartActionBox.tsx ACTION_TEXT keys + dynamic reassign/direct-
 * order branches.
 */
const ELIGIBLE_SINGLE_ACTION_TYPES = new Set([
  'reassign',
  'direct-order',
  'go-dark',
  'intel-briefing',
  'falsify-intel',
  'burn-the-files',
  'back-channel',
  'call-in-a-favor',
])

// -----------------------------------------------------------------------------
// Seat driver — wait for turn, stage a single-action card, click .action.
// -----------------------------------------------------------------------------

interface DriverState {
  sawActionButton: boolean
  clickedActionWithoutTimeout: boolean
  staledCardType: string | null
  failureDetail: string | null
}

function makeSeatDriver(
  state: DriverState,
  logger: (msg: string) => void,
): (seats: readonly SeatHandle[], god: GodHandle) => Promise<void> {
  return async (seats, _god) => {
    if (seats.length < 2) {
      throw new Error(`sab-smoke: need ≥2 seats, got ${seats.length}`)
    }

    // ---- Wait for an acting seat (any seat seeing "End turn") -------------
    logger('[sab-smoke-driver] waiting for some seat to see "End turn" button')
    const turnDeadline = Date.now() + 30_000
    let actingSeat: SeatHandle | null = null
    while (Date.now() < turnDeadline) {
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
      state.failureDetail = 'no seat showed "End turn" within 30s after Cleared Hot'
      throw new Error(`sab-smoke: ${state.failureDetail}`)
    }
    const actingPage = actingSeat.page as Page
    logger(`[sab-smoke-driver] seat ${actingSeat.seatId} is acting`)

    // ---- Read acting seat's hand via __gameStore --------------------------
    // window.__gameStore is exposed in DEV (vite dev mode) per
    // src/client/shared/gameStore.ts. The smoke runs against `pnpm dev`
    // (vite) + `pnpm dev:server` (wrangler), so DEV is true and the hook
    // is present.
    const hand = await actingPage.evaluate(() => {
      const w = window as unknown as {
        __gameStore?: { getSnapshot: () => { myHand: { id: string; type: string }[] } }
      }
      return w.__gameStore?.getSnapshot().myHand ?? []
    })
    logger(`[sab-smoke-driver] acting seat hand: [${hand.map((c) => c.type).join(', ')}]`)

    const eligible = hand.find((c) => ELIGIBLE_SINGLE_ACTION_TYPES.has(c.type))
    if (eligible === undefined) {
      state.failureDetail = `no eligible single-action card in acting seat's hand under seed=${SEED} — bump seed and re-run`
      throw new Error(`sab-smoke: ${state.failureDetail}`)
    }
    state.staledCardType = eligible.type
    logger(`[sab-smoke-driver] staging card type: ${eligible.type}`)

    // ---- Double-click the card by aria-label to stage ---------------------
    // MinimalCard renders aria-label = card def name. Card-def names are
    // canonical (e.g. "Reassign", "Burn the Files") — same path the user
    // takes via tap-to-stage gesture (Hand.tsx single=enlarge, double=stage).
    const cardDefName = humanizeCardType(eligible.type)
    await actingPage
      .locator(`[role="button"][aria-label="${cardDefName}"]`)
      .first()
      .dblclick({ timeout: 5_000 })

    // ---- Wait for SmartActionBox to enter .action state -------------------
    // Match by class fragment (CSS Modules hashes append a suffix). If the
    // card needs a target (reassign/direct-order/call-in-a-favor) the
    // SmartActionBox renders .action with target-${type} key; if it doesn't
    // (go-dark/intel-briefing/burn-the-files/back-channel/falsify-intel),
    // it renders .action with ready-${type} key. Both produce the same
    // class on the same element — so a single selector covers both.
    logger('[sab-smoke-driver] waiting for .action button to appear')
    const actionLocator = actingPage.locator('button[class*="_action_"]')
    await actionLocator.first().waitFor({ state: 'visible', timeout: 10_000 })
    state.sawActionButton = true
    logger('[sab-smoke-driver] saw .action button — attempting click with default actionability')

    // ---- THE REGRESSION CONTRACT ------------------------------------------
    // Default Playwright actionability check INCLUDES element stability.
    // If breathe pulse ever migrates back onto the button DOM, this click
    // hangs until the 30s default timeout and the smoke fails. We pass
    // an explicit 30s timeout so the failure is loud and obvious in logs
    // (Playwright's default is 30s but defaulting to our own makes the
    // contract explicit).
    try {
      await actionLocator.first().click({ timeout: 30_000 })
      state.clickedActionWithoutTimeout = true
      logger('[sab-smoke-driver] clicked .action — no stability timeout')
    } catch (err) {
      state.failureDetail = `click(.action) failed: ${err instanceof Error ? err.message.split('\n')[0] : String(err)}`
      throw new Error(`sab-smoke: ${state.failureDetail}`)
    }

    // Give the server + god subscriber + jsonl flush loop a window so the
    // outer assertEventsJsonl check has something to read.
    logger('[sab-smoke-driver] waiting for god-event to land in events.jsonl')
    await delay(2_500)
  }
}

/**
 * Map CardType (engine-side enum) to the human-readable name MinimalCard
 * renders as aria-label. Mirrors `CARD_DEFS[type].name` from
 * `src/shared/types.ts`. Smoke-local copy: `src/shared/types` is allowed
 * but cleaner to keep this contained — if a card type is added to
 * ELIGIBLE_SINGLE_ACTION_TYPES, add the corresponding human name here.
 */
function humanizeCardType(type: string): string {
  switch (type) {
    case 'reassign':
      return 'Reassign'
    case 'direct-order':
      return 'Direct Order'
    case 'go-dark':
      return 'Go Dark'
    case 'intel-briefing':
      return 'Intel Briefing'
    case 'falsify-intel':
      return 'Falsify Intel'
    case 'burn-the-files':
      return 'Burn the Files'
    case 'back-channel':
      return 'Back Channel'
    case 'call-in-a-favor':
      return 'Call in a Favor'
    default:
      throw new Error(`sab-smoke: unhandled eligible card type "${type}" — add to humanizeCardType`)
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
  log(`[sab-smoke] starting (room=${ROOM_CODE})`)
  const wallclockStart = Date.now()

  const driverState: DriverState = {
    sawActionButton: false,
    clickedActionWithoutTimeout: false,
    staledCardType: null,
    failureDetail: null,
  }
  const config = buildConfig()
  let seatBrowser: Browser | null = null

  const result = await runSession(
    config,
    {
      createBrowser: async () => {
        seatBrowser = await chromium.launch({ headless: true })
        return seatBrowser
      },
      createSeat: (args: CreateSeatArgs): Promise<SeatHandle> => realCreateSeat(args),
      launchBoardView,
      seatDriver: makeSeatDriver(driverState, log),
      logger: log,
    },
    {
      skipSelftestGate: true,
      launchBoardView: true,
    },
  )

  const wallclockEnd = Date.now()
  const wallclockMs = wallclockEnd - wallclockStart

  log(`[sab-smoke] runSession outcome=${result.outcome} wallclock=${wallclockMs}ms`)
  if (result.errorMessage !== undefined) {
    log(`[sab-smoke] errorMessage: ${result.errorMessage}`)
  }
  log(`[sab-smoke] runDir: ${result.runDir}`)
  if (driverState.staledCardType !== null) {
    log(`[sab-smoke] staged card type: ${driverState.staledCardType}`)
  }

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

  assertions.push({
    name: 'saw .action button',
    ok: driverState.sawActionButton,
    detail: driverState.sawActionButton ? undefined : (driverState.failureDetail ?? '(no detail)'),
  })

  assertions.push({
    name: 'clicked .action without stability timeout (REGRESSION CONTRACT)',
    ok: driverState.clickedActionWithoutTimeout,
    detail: driverState.clickedActionWithoutTimeout
      ? `staged=${driverState.staledCardType ?? '?'}`
      : (driverState.failureDetail ?? '(no detail)'),
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
  log('=== SAB Smoke Assertions ===')
  for (const a of assertions) {
    const mark = a.ok ? 'PASS' : 'FAIL'
    const line = a.detail !== undefined ? `  [${mark}] ${a.name} — ${a.detail}` : `  [${mark}] ${a.name}`
    log(line)
  }
  log('')

  const allPassed = assertions.every((a) => a.ok)
  if (allPassed) {
    log('[sab-smoke] ALL ASSERTIONS PASSED')
    return 0
  } else {
    const failed = assertions.filter((a) => !a.ok).length
    log(`[sab-smoke] ${failed} ASSERTION(S) FAILED`)
    return 1
  }
}

let exitCode = 1
try {
  exitCode = await main()
} catch (err) {
  // eslint-disable-next-line no-console
  console.error(`[sab-smoke] top-level threw: ${err instanceof Error ? err.stack ?? err.message : String(err)}`)
  exitCode = 1
}
process.exit(exitCode)
