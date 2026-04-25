/**
 * Orchestrator — top-level session driver (Phase 3 Unit 6).
 *
 * Sequences Units 2–5 (+ 3b + 4b + 10b) into a single session lifecycle:
 *
 *   1. Selftest freshness gate (.last-selftest < 24h)
 *   2. createRunDirectory + writeSessionStart
 *   3. mintPlaytestToken + mintScrubSalt
 *   4. startServers(config, token) — token piped into PLAYTEST_TOKEN env
 *   5. connectGod({ wsUrl, token, ... }) — SAME token, now in WS URL
 *      - 4005 retry-once with 60s backoff
 *      - 4003/4004 / config-locked / config-too-late → abort
 *   6. chromium.launch()
 *   7. createSeat × N
 *   8. seatDriver(seats, god) — stub in Unit 6; Phase 4 replaces
 *   9. Reverse teardown (seats → god → servers) with try/finally discipline
 *  10. appendSessionEnd (stub SessionReport — Unit 9 adds coverage)
 *  11. applyRetention (non-fatal on failure)
 *
 * Token identity invariant (plan mandate):
 *   - Exactly ONE token string is minted per session (per non-retry call to
 *     `startServers`).
 *   - That literal string goes into `startServers(config, token, ...)` AND
 *     `connectGod({ token, ... })`. The god WS URL embeds it as
 *     `?role=god&token=<T>` (constructed inside Unit 4's buildGodUrl).
 *   - On 4005 retry, the SAME token is reused (servers are still up).
 *
 * Teardown discipline:
 *   - `try { work } finally { teardown }` guarantees teardown runs on any
 *     seat-driver / createSeat / connectGod / startServers failure.
 *   - Each teardown step is wrapped in its own try/catch — a throw in one
 *     does not skip the next.
 *   - Reverse order: seats (N→1) → god.disconnect() → stopServers.
 *
 * Token-leak defense:
 *   - Token NEVER interpolated into SessionResult.errorMessage or logs.
 *   - `sanitizeForOutput(msg, token)` strips the token and any URL-encoded
 *     form before any error string escapes the module.
 *
 * Insight 022: ZERO imports from `src/server/`, `src/shared/`, or
 * `partyserver`. Node stdlib + local harness modules + Playwright (runtime-
 * injectable).
 */

import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import type { Browser } from '@playwright/test'

import type {
  Config,
  SessionResult,
  SessionReport,
  SessionOutcome,
  SeatHandle,
  Viewport,
  CoverageReport,
} from './types'
import {
  createRunDirectory,
  writeSessionStart,
  appendSessionEnd,
  type RunDirPaths,
} from './run-directory'
import { mintPlaytestToken, mintScrubSalt } from './session-secrets'
import {
  startServers as realStartServers,
  stopServers as realStopServers,
  type ServerHandles,
  type StartServerOptions,
} from './server-controller'
import {
  connectGod as realConnectGod,
  type ConnectGodArgs,
  type GodHandle,
  type FatalCloseInfo,
} from './god-subscriber'
import { createSeat as realCreateSeat, buildSeatPaths } from './seat-factory'
import {
  applyRetention as realApplyRetention,
  type RetentionResult,
} from './retention'
import {
  runIsolationAudit as realRunIsolationAudit,
  type IsolationAuditResult,
} from './isolation-audit'
import type {
  TriagePipelineInput,
  TriagePipelineResult,
} from './triage-pipeline'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SELFTEST_STAMP_PATH = '.last-selftest'
const SELFTEST_MAX_AGE_MS = 24 * 60 * 60 * 1000
const CODE_4005_RETRY_BACKOFF_MS = 60_000

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface CreateSeatArgs {
  readonly browser: Browser
  readonly roomCode: string
  readonly seatName: string
  readonly seatId: string
  readonly runPaths: RunDirPaths
  readonly viewport: Viewport
}

/**
 * Injection seams for testing. Fields are intentionally mutable so tests can
 * swap individual deps without reconstructing the full object. Production
 * callers pass `undefined` (or omit entirely) to pick up real implementations.
 */
export interface RunSessionDeps {
  mintToken?: () => string
  mintSalt?: () => string
  startServers?: (
    config: Config,
    token: string,
    opts?: StartServerOptions,
  ) => Promise<ServerHandles>
  stopServers?: (handles: ServerHandles) => Promise<void>
  connectGod?: (args: ConnectGodArgs) => Promise<GodHandle>
  createBrowser?: () => Promise<Browser>
  createSeat?: (args: CreateSeatArgs) => Promise<SeatHandle>
  applyRetention?: (config: Config) => Promise<RetentionResult>
  readSelftestStamp?: () => Promise<{ timestamp: string; ageMs: number } | null>
  writeSelftestStamp?: (ts: string) => Promise<void>
  seatDriver?: (seats: readonly SeatHandle[], god: GodHandle) => Promise<void>
  /**
   * Phase 5 Unit 6 — post-session triage hook. When provided, runs after
   * `appendSessionEnd` and before retention. Default is no-op (Phase 6
   * calibration injects the real `runTriagePipeline` driver).
   *
   * Phase 6 Unit 2.5 wired the audit-then-triage chain: the orchestrator
   * runs `runIsolationAudit` first and threads the resulting status
   * (`'OK'` or `'ISOLATION_BREACH'`) into this hook so triage skips when
   * isolation failed.
   */
  runPostSessionTriage?: (input: TriagePipelineInput) => Promise<TriagePipelineResult>
  /**
   * Phase 4 isolation audit (phase-6 Unit 2.5 wiring). Runs after
   * `appendSessionEnd` and before triage. Failure is non-fatal — only
   * affects the `isolationStatus` passed to triage.
   */
  runIsolationAudit?: (
    runDir: string,
    seats: readonly SeatHandle[],
  ) => Promise<IsolationAuditResult>
  nowMs?: () => number
  logger?: (msg: string) => void
  /** Test-only: cancellable setTimeout used for 4005 backoff. */
  scheduleDelay?: (ms: number) => Promise<void>
}

export interface RunSessionOptions {
  readonly allowTrace?: boolean
  readonly skipSelftestGate?: boolean
  /**
   * Phase 6 Unit 2.5 / Option A: when true, the orchestrator does NOT
   * launch its own Chromium and does NOT call `createSeat × N`. Each
   * seat owns its own MCP-Playwright browser via the `playwright-seat-N`
   * MCP server, so the orchestrator-level browser is dead weight.
   *
   * Synthetic SeatHandle objects are still built (seatId, seatName,
   * roomCode, viewport, logPath, suspicionPath, scenariosPath) so the
   * launcher driver can render per-seat prompts. `page` is set to `null`
   * in that mode — the seat-teardown loop guards on optional chaining.
   *
   * Default false (legacy Option B path).
   */
  readonly skipBrowserLaunch?: boolean
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build the partyserver god WS base URL. `connectGod` appends
 * `?role=god&token=<T>` internally. Room code is validated by `createSeat`;
 * we defensively encode here too.
 *
 * Source of truth for the path: `scripts/playtest/phase2-smoke.ts:69` —
 * `/parties/game-room/<ROOM>`. The room class is literally `game-room`.
 */
export function buildGodWsUrl(roomCode: string): string {
  return `ws://127.0.0.1:8787/parties/game-room/${encodeURIComponent(roomCode)}`
}

/**
 * Scrub any occurrence of the token (raw + URI-encoded) from an arbitrary
 * string. Used on any error message that could escape the module. A token
 * is 64 lowercase-hex chars; `encodeURIComponent` on that is a no-op, but
 * we defend against future token charsets by running both replacements.
 */
function sanitizeForOutput(msg: string, token: string): string {
  if (!msg) return msg
  const rawReplaced = msg.split(token).join('<REDACTED_TOKEN>')
  const encoded = encodeURIComponent(token)
  return encoded === token
    ? rawReplaced
    : rawReplaced.split(encoded).join('<REDACTED_TOKEN>')
}

function localIsoTimestamp(d: Date): string {
  const pad = (n: number, w = 2): string => String(n).padStart(w, '0')
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  )
}

function buildSessionId(d: Date, seats: number): string {
  const pad = (n: number, w = 2): string => String(n).padStart(w, '0')
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-` +
    `${pad(d.getHours())}${pad(d.getMinutes())}-${seats}p`
  )
}

/** Default selftest-stamp reader. Returns null if absent. */
async function defaultReadSelftestStamp(): Promise<
  { timestamp: string; ageMs: number } | null
> {
  try {
    const raw = (await fs.readFile(SELFTEST_STAMP_PATH, 'utf8')).trim()
    const t = Date.parse(raw)
    if (Number.isNaN(t)) return null
    return { timestamp: raw, ageMs: Date.now() - t }
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null
    throw err
  }
}

/**
 * Build the stub coverage report Unit 6 feeds into `appendSessionEnd`.
 * Unit 9 will replace this with a real computation.
 */
function stubCoverageReport(): CoverageReport {
  const emptyCell = { column1: 0, column2: 0, scenarioIds: [] as string[] }
  return {
    firedCount: 0,
    threshold: 50,
    gridCells: {
      SERVER: { ...emptyCell, scenarioIds: [] },
      ACTOR: { ...emptyCell, scenarioIds: [] },
      TARGET: { ...emptyCell, scenarioIds: [] },
      OTHER_ALIVE: { ...emptyCell, scenarioIds: [] },
      SPECTATOR: { ...emptyCell, scenarioIds: [] },
      DISCONNECTED: { ...emptyCell, scenarioIds: [] },
      BOARD: { ...emptyCell, scenarioIds: [] },
    },
    zeroCellCount: 14,
    passed: false,
    firedByViewport: {},
    freePlayAccounting: {
      totalMs: 0,
      freePlayMs: 0,
      scriptedMs: 0,
      fraction: 0,
    },
    divergences: [],
    knownProductCalls: [],
  }
}

/**
 * Pattern-match a `connectGod` rejection to classify it as config-locked
 * (vs generic fatal). Server emits `PLAYTEST_CONFIG_LOCKED` /
 * `PLAYTEST_CONFIG_TOO_LATE` via `playtest-config-ack`; the god-subscriber
 * surfaces these as a fatal-close reason, not a promise rejection — but
 * future wiring (or direct synchronous rejects from connectGod) may surface
 * them via a thrown Error.
 */
function isConfigLockedError(err: unknown): boolean {
  if (err === null || typeof err !== 'object') return false
  const msg = (err as Error).message ?? ''
  return (
    /PLAYTEST_CONFIG_LOCKED/.test(msg) ||
    /PLAYTEST_CONFIG_TOO_LATE/.test(msg)
  )
}

function isConfigLockedFatalInfo(info: FatalCloseInfo): boolean {
  return (
    /PLAYTEST_CONFIG_LOCKED/.test(info.reason) ||
    /PLAYTEST_CONFIG_TOO_LATE/.test(info.reason)
  )
}

// ---------------------------------------------------------------------------
// runSession — the orchestrator entry point
// ---------------------------------------------------------------------------

export async function runSession(
  config: Config,
  deps: RunSessionDeps = {},
  opts: RunSessionOptions = {},
): Promise<SessionResult> {
  const {
    mintToken = mintPlaytestToken,
    mintSalt = mintScrubSalt,
    startServers = realStartServers,
    stopServers = realStopServers,
    connectGod = realConnectGod,
    createBrowser = async () => {
      const { chromium } = await import('@playwright/test')
      return chromium.launch({ headless: true })
    },
    createSeat = realCreateSeat,
    applyRetention = (c: Config) =>
      realApplyRetention({
        outputRoot: c.outputRoot,
        sessionDirRetention: c.sessionDirRetention,
      }),
    readSelftestStamp = defaultReadSelftestStamp,
    seatDriver,
    runPostSessionTriage,
    runIsolationAudit = realRunIsolationAudit,
    nowMs = Date.now,
    logger = (m: string) => {
      // eslint-disable-next-line no-console
      console.log(m)
    },
    scheduleDelay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms)),
  } = deps

  // -------------------------------------------------------------------------
  // 1. Selftest freshness gate
  // -------------------------------------------------------------------------
  if (opts.skipSelftestGate !== true) {
    const stamp = await readSelftestStamp()
    if (stamp === null || stamp.ageMs > SELFTEST_MAX_AGE_MS) {
      const startedAt = localIsoTimestamp(new Date(nowMs()))
      const errorMessage =
        stamp === null
          ? `selftest stamp (${SELFTEST_STAMP_PATH}) absent — run pnpm playtest:selftest first`
          : `selftest stamp stale (${Math.floor(stamp.ageMs / 3_600_000)}h old) — re-run pnpm playtest:selftest`
      logger(`[orchestrator] aborting: ${errorMessage}`)
      return {
        sessionId: '(unassigned)',
        runDir: '(unassigned)',
        outcome: 'aborted-stale-selftest',
        errorMessage,
        startedAt,
        endedAt: startedAt,
        seatsJoined: 0,
        eventsJsonlPath: '(unassigned)',
      }
    }
  }

  // -------------------------------------------------------------------------
  // 2. Run directory + start block
  // -------------------------------------------------------------------------
  const startDate = new Date(nowMs())
  const sessionId = buildSessionId(startDate, config.seats)
  const startedAt = localIsoTimestamp(startDate)

  const paths = await createRunDirectory(config.outputRoot, sessionId)
  await writeSessionStart(paths, config)

  // Derive the realized sessionId from the actual folder (collision-resolved).
  const realizedSessionId = path.basename(paths.root)

  // -------------------------------------------------------------------------
  // 3. Mint per-session secrets
  // -------------------------------------------------------------------------
  const token = mintToken()
  const scrubSalt = mintSalt()

  // Track all teardown we may need to run.
  let servers: ServerHandles | null = null
  let god: GodHandle | null = null
  let browser: Browser | null = null
  const seats: SeatHandle[] = []

  let outcome: SessionOutcome = 'success'
  let errorMessage: string | undefined

  /**
   * Wrap an error into a sanitized message. Never let the raw token leak.
   */
  const describeError = (err: unknown): string => {
    const raw = err instanceof Error ? err.message : String(err)
    return sanitizeForOutput(raw, token)
  }

  // The body below routes every code path through `finalize()` so teardown
  // is deterministic. No `finally` block is needed at this level — each
  // dep call is individually guarded.

  {
    // -----------------------------------------------------------------------
    // 4. Start servers
    // -----------------------------------------------------------------------
    try {
      servers = await startServers(config, token, { allowTrace: opts.allowTrace })
    } catch (err) {
      outcome = 'error'
      errorMessage = `startServers failed: ${describeError(err)}`
      logger(`[orchestrator] ${errorMessage}`)
      return finalize()
    }

    // -----------------------------------------------------------------------
    // 5. Connect god (with 4005 retry-once)
    // -----------------------------------------------------------------------
    const connectArgs: ConnectGodArgs = {
      wsUrl: buildGodWsUrl(config.roomCode ?? 'PLAYTEST'),
      token,
      seed: config.seed,
      nopeWindowMs: config.nopeWindowMs,
      scrubMode: config.scrubMode,
      scrubSalt,
      eventsJsonlPath: paths.eventsJsonl,
      godReassemblyTimeoutMs: config.godReassemblyTimeoutMs,
    }

    let retriedOnce = false
    // eslint-disable-next-line no-constant-condition
    while (true) {
      try {
        god = await connectGod(connectArgs)
      } catch (err) {
        if (isConfigLockedError(err)) {
          outcome = 'aborted-config-locked'
          errorMessage = describeError(err)
          logger(`[orchestrator] config-locked: ${errorMessage}`)
        } else {
          outcome = 'error'
          errorMessage = `connectGod failed: ${describeError(err)}`
          logger(`[orchestrator] ${errorMessage}`)
        }
        return finalize()
      }

      // Race the immediate fatal-close vs. a zero-tick settle. If the fatal
      // promise already resolved (common for synthetic tests + real 4005),
      // we handle it here before seat work. Otherwise we proceed.
      const fatalInfo = await Promise.race<FatalCloseInfo | null>([
        god.onFatalClose,
        Promise.resolve(null),
      ])

      if (fatalInfo === null) break // connected cleanly
      // Fatal fired immediately. Classify.
      if (fatalInfo.code === 4005 && fatalInfo.retriable && !retriedOnce) {
        retriedOnce = true
        logger('[orchestrator] god WS 4005 rate-limited; backoff 60s then retry once')
        // Disconnect the failed god handle best-effort before retrying.
        try {
          await god.disconnect()
        } catch {
          // already closed
        }
        god = null
        await scheduleDelay(CODE_4005_RETRY_BACKOFF_MS)
        continue
      }
      // Any other fatal-close BEFORE seat work → aborted.
      if (isConfigLockedFatalInfo(fatalInfo)) {
        outcome = 'aborted-config-locked'
      } else {
        outcome = 'aborted-fatal-close'
      }
      errorMessage = sanitizeForOutput(
        `fatal god close: code=${fatalInfo.code} reason=${fatalInfo.reason}`,
        token,
      )
      logger(`[orchestrator] ${errorMessage}`)
      return finalize()
    }

    // -----------------------------------------------------------------------
    // 6. Launch browser (skipped under Option A — phase-6 Unit 2.5)
    // -----------------------------------------------------------------------
    const skipBrowserLaunch = opts.skipBrowserLaunch === true
    if (!skipBrowserLaunch) {
      try {
        browser = await createBrowser()
      } catch (err) {
        outcome = 'error'
        errorMessage = `createBrowser failed: ${describeError(err)}`
        logger(`[orchestrator] ${errorMessage}`)
        return finalize()
      }
    }

    // -----------------------------------------------------------------------
    // 7. Create seats
    //
    //    Option B path (legacy): orchestrator owns chromium → createSeat × N
    //    drives Playwright contexts.
    //    Option A path (Phase 6 Unit 2.5): synthetic SeatHandle objects only;
    //    each seat owns its own MCP-Playwright browser via playwright-seat-N.
    // -----------------------------------------------------------------------
    const viewport = config.viewports[0] ?? {
      width: 390 as const,
      height: 844 as const,
      label: '390x844',
    }
    const roomCode = config.roomCode ?? 'PLAYTEST'
    try {
      for (let i = 0; i < config.seats; i++) {
        const seatName = config.seatNames?.[i] ?? `Seat${i + 1}`
        const seatId = `seat-${i + 1}`
        if (skipBrowserLaunch) {
          const { logPath, suspicionPath } = buildSeatPaths(paths, seatId)
          seats.push({
            seatId,
            seatName,
            roomCode,
            page: null,
            viewport,
            logPath,
            suspicionPath,
            scenariosPath: config.catalogPath,
          })
        } else {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          const seat = await createSeat({
            browser: browser!,
            roomCode,
            seatName,
            seatId,
            runPaths: paths,
            viewport,
          })
          seats.push(seat)
        }
      }
    } catch (err) {
      outcome = 'error'
      errorMessage = `createSeat failed: ${describeError(err)}`
      logger(`[orchestrator] ${errorMessage}`)
      return finalize()
    }

    // -----------------------------------------------------------------------
    // 8. Seat-driver stub (Phase 4 replaces). Race against fatal close.
    // -----------------------------------------------------------------------
    const driver = seatDriver ?? (async () => {
      // Default: wait for stdin newline so a developer can drive manually.
      await new Promise<void>((resolve) => {
        const onData = (): void => {
          process.stdin.off('data', onData)
          resolve()
        }
        process.stdin.on('data', onData)
      })
    })

    try {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const fatalPromise: Promise<{ kind: 'fatal'; info: FatalCloseInfo }> =
        god!.onFatalClose.then((info) => ({ kind: 'fatal' as const, info }))
      const driverPromise: Promise<{ kind: 'done' }> = driver(seats, god!).then(
        () => ({ kind: 'done' as const }),
      )
      const winner = await Promise.race([fatalPromise, driverPromise])
      if (winner.kind === 'fatal') {
        const info = winner.info
        if (info.code === 4005 && info.retriable) {
          // Per plan: mid-driver 4005 is still 'aborted-fatal-close'. The
          // retry-once gate is pre-seat-work only.
          outcome = 'aborted-fatal-close'
        } else if (isConfigLockedFatalInfo(info)) {
          outcome = 'aborted-config-locked'
        } else {
          outcome = 'aborted-fatal-close'
        }
        errorMessage = sanitizeForOutput(
          `fatal god close during seat-driver: code=${info.code} reason=${info.reason}`,
          token,
        )
        logger(`[orchestrator] ${errorMessage}`)
      }
    } catch (err) {
      outcome = 'error'
      errorMessage = `seatDriver failed: ${describeError(err)}`
      logger(`[orchestrator] ${errorMessage}`)
    }

    return finalize()
  }

  // ---------------------------------------------------------------------
  // Internal: finalize — teardown + end-block + retention + return
  // ---------------------------------------------------------------------
  async function finalize(): Promise<SessionResult> {
    // Teardown — reverse order; each step guarded so a throw does not skip
    // subsequent cleanup.
    for (let i = seats.length - 1; i >= 0; i--) {
      const seat = seats[i]
      if (seat === undefined) continue
      try {
        // Close the context via page → context. `page` is typed `unknown` in
        // types.ts, so we dynamic-cast here. Playwright's Page exposes
        // `.context().close()`.
        const pageLike = seat.page as {
          context?: () => { close: () => Promise<void> }
        } | null
        const ctx = pageLike?.context?.()
        if (ctx !== undefined) {
          await ctx.close()
        }
      } catch (err) {
        logger(`[orchestrator] seat teardown failed seatId=${seat.seatId}: ${describeError(err)}`)
      }
    }
    if (god !== null) {
      try {
        await god.disconnect()
      } catch (err) {
        logger(`[orchestrator] god disconnect failed: ${describeError(err)}`)
      }
    }
    if (browser !== null) {
      try {
        await browser.close()
      } catch (err) {
        logger(`[orchestrator] browser close failed: ${describeError(err)}`)
      }
    }
    if (servers !== null) {
      try {
        await stopServers(servers)
      } catch (err) {
        logger(`[orchestrator] stopServers failed: ${describeError(err)}`)
      }
    }

    // End block
    const endDate = new Date(nowMs())
    const endedAt = localIsoTimestamp(endDate)
    const report: SessionReport = {
      sessionId: realizedSessionId,
      runDir: paths.root,
      startedAt,
      endedAt,
      outcome,
      errorMessage,
      coverage: stubCoverageReport(),
      freePlay: {
        totalMs: 0,
        freePlayMs: 0,
        scriptedMs: 0,
        fraction: 0,
      },
      viewportsExercised: [],
    }
    try {
      await appendSessionEnd(paths, report)
    } catch (err) {
      logger(`[orchestrator] appendSessionEnd failed: ${describeError(err)}`)
    }

    // Phase 6 Unit 2.5 — isolation audit BEFORE triage so the triage
    // input gets a real isolation status, not always-OK. Audit failures
    // (e.g. dirs missing) are non-fatal; we default to 'OK' on errors so
    // a partial run still triages whatever it has.
    let isolationStatus: 'OK' | 'ISOLATION_BREACH' = 'OK'
    try {
      const audit = await runIsolationAudit(paths.root, seats)
      if (!audit.passed) isolationStatus = 'ISOLATION_BREACH'
      logger(
        `[orchestrator] isolation audit: ${audit.passed ? 'PASS' : 'FAIL'} (${audit.breaches.length} breach(es), report=${audit.reportPath})`,
      )
    } catch (err) {
      logger(`[orchestrator] isolation audit failed (non-fatal, defaulting status=OK): ${describeError(err)}`)
    }

    // Phase 5 Unit 6 — post-session triage. Non-fatal; failures only log.
    if (runPostSessionTriage) {
      try {
        const triageResult = await runPostSessionTriage({
          runDir: paths.root,
          catalogPath: config.catalogPath,
          eventsJsonlPath: paths.eventsJsonl,
          connectionsJsonlPath: paths.connectionsJsonl,
          isolationStatus,
        })
        if (triageResult.skipped) {
          logger(
            `[orchestrator] triage skipped: ${triageResult.skipped}`,
          )
        } else {
          logger(
            `[orchestrator] triage: ${triageResult.seedCount} seed(s), ${triageResult.specCount} spec(s), index=${triageResult.indexPath ?? '(none)'}`,
          )
        }
      } catch (err) {
        logger(
          `[orchestrator] runPostSessionTriage failed (non-fatal): ${describeError(err)}`,
        )
      }
    }

    // Retention — non-fatal.
    try {
      await applyRetention(config)
    } catch (err) {
      logger(`[orchestrator] applyRetention failed (non-fatal): ${describeError(err)}`)
    }

    return {
      sessionId: realizedSessionId,
      runDir: paths.root,
      outcome,
      errorMessage,
      startedAt,
      endedAt,
      seatsJoined: seats.length,
      eventsJsonlPath: paths.eventsJsonl,
    }
  }
}

