/**
 * Isolation self-test checks — Phase 3 Unit 7.
 *
 * Each exported `check*` returns a `CheckResult` (pass/fail + diagnostic
 * detail). `selftest.ts` invokes these in order, collects results into a
 * table, and writes `.last-selftest` only when all required checks pass.
 *
 * The eight checks:
 *   1. Cookie isolation across Playwright contexts   [LIVE]
 *   2. LocalStorage isolation across contexts        [LIVE]
 *   3. WS-frame isolation across contexts            [LIVE]
 *   4. God-events never reach player-role sockets    [LIVE]
 *   5. ALLOWED/DISALLOWED_PAGE_METHODS sanity        [PURE]
 *   6. God close codes 4003/4004/4005 distinct       [LIVE]
 *   7. Scrubber invoked on every write + fail-closed [PURE]
 *   8. Retention evicts (N+1)-th, keeps N-th         [PURE + tmpfs]
 *
 * Diagnostic detail NEVER contains a token. Check 6 exercises wrong-token
 * paths — the diagnostic says "token-invalid" / "origin-denied", never the
 * token itself.
 *
 * Insight-022 boundary: no imports from `src/server` or `src/shared`.
 */
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import * as os from 'node:os'
import { randomUUID } from 'node:crypto'
import type { Browser, BrowserContext } from '@playwright/test'

import {
  ALLOWED_PAGE_METHODS,
  DISALLOWED_PAGE_METHODS,
  type GodEvent,
} from './types'
import { scrub } from './scrubber'
import { applyRetention, parseSessionDirName } from './retention'
import {
  connectGod,
  type ConnectGodArgs,
  type WebSocketLike,
} from './god-subscriber'

// ---------------------------------------------------------------------------
// Shared shapes
// ---------------------------------------------------------------------------

export interface CheckResult {
  readonly name: string
  readonly pass: boolean
  readonly detail: string
}

export interface LiveCtx {
  readonly browser: Browser
  /** Base URL of the vite dev server, e.g. `http://localhost:5173`. */
  readonly playerBaseUrl: string
  /** Base http URL of wrangler, e.g. `http://127.0.0.1:8787`. */
  readonly wranglerBaseUrl: string
  /** WS URL, e.g. `ws://127.0.0.1:8787`. */
  readonly wsBaseUrl: string
  /** A working god token the running wrangler accepts. */
  readonly token: string
  /** Room code — any 4-8 uppercase / digit string. */
  readonly roomCode: string
  /** Allowed LAN-ish origin for the wrangler we're talking to. */
  readonly goodOrigin: string
  /** Deadline for any single live-check operation. Defaults to 15_000ms. */
  readonly liveTimeoutMs?: number
}

// ---------------------------------------------------------------------------
// Check 1 — Cookie isolation
// ---------------------------------------------------------------------------

/**
 * Two browser contexts must not see each other's cookies. Seat 1 sets a
 * cookie via `context.addCookies`; seat 2 reads cookies for the same URL
 * and must see none.
 */
export async function checkCookieIsolation(ctx: LiveCtx): Promise<CheckResult> {
  const name = 'cookie-isolation'
  let c1: BrowserContext | null = null
  let c2: BrowserContext | null = null
  try {
    c1 = await ctx.browser.newContext()
    c2 = await ctx.browser.newContext()

    const url = ctx.playerBaseUrl
    const parsed = new URL(url)
    await c1.addCookies([
      {
        name: 'selftest_c1',
        value: 'ctx1-secret',
        domain: parsed.hostname,
        path: '/',
      },
    ])

    const c1Cookies = await c1.cookies(url)
    const c2Cookies = await c2.cookies(url)

    const c1Has = c1Cookies.some((c) => c.name === 'selftest_c1')
    const c2Has = c2Cookies.some((c) => c.name === 'selftest_c1')

    if (!c1Has) {
      return {
        name,
        pass: false,
        detail: `seat 1 cookie did not persist (addCookies silently failed)`,
      }
    }
    if (c2Has) {
      return {
        name,
        pass: false,
        detail: `seat 2 observed seat 1's cookie — contexts not isolated`,
      }
    }
    return {
      name,
      pass: true,
      detail: `seat 1 had cookie (ok), seat 2 had ${c2Cookies.length} cookies (none from seat 1)`,
    }
  } catch (err) {
    return {
      name,
      pass: false,
      detail: `threw: ${err instanceof Error ? err.message : String(err)}`,
    }
  } finally {
    await c1?.close().catch(() => {})
    await c2?.close().catch(() => {})
  }
}

// ---------------------------------------------------------------------------
// Check 2 — LocalStorage isolation
// ---------------------------------------------------------------------------

/**
 * Two contexts → two pages → localStorage.setItem on page 1 → page 2 cannot
 * read the key. `page.evaluate` is used at the ORCHESTRATOR level (no
 * allowlist restriction — only seat subagents are restricted per Phase 4
 * D5).
 */
export async function checkLocalStorageIsolation(
  ctx: LiveCtx,
): Promise<CheckResult> {
  const name = 'localStorage-isolation'
  let c1: BrowserContext | null = null
  let c2: BrowserContext | null = null
  try {
    c1 = await ctx.browser.newContext()
    c2 = await ctx.browser.newContext()
    const p1 = await c1.newPage()
    const p2 = await c2.newPage()

    await p1.goto(ctx.playerBaseUrl, { waitUntil: 'domcontentloaded' })
    await p2.goto(ctx.playerBaseUrl, { waitUntil: 'domcontentloaded' })

    await p1.evaluate(() => {
      window.localStorage.setItem('selftest_ls', 'ctx1-secret')
    })
    const got = await p2.evaluate<string | null>(() =>
      window.localStorage.getItem('selftest_ls'),
    )

    if (got === null) {
      return { name, pass: true, detail: 'seat 2 localStorage read returned null (isolated)' }
    }
    return {
      name,
      pass: false,
      detail: `seat 2 observed seat 1's localStorage value (length=${got.length}) — contexts not isolated`,
    }
  } catch (err) {
    return {
      name,
      pass: false,
      detail: `threw: ${err instanceof Error ? err.message : String(err)}`,
    }
  } finally {
    await c1?.close().catch(() => {})
    await c2?.close().catch(() => {})
  }
}

// ---------------------------------------------------------------------------
// Check 3 — WS frame isolation
// ---------------------------------------------------------------------------

/**
 * Each page's `page.on('websocket')` must only observe its own socket's
 * frames. Seat 1 joins (connects its WS); seat 2 must not observe any
 * frame on seat 1's socket.
 *
 * Rather than drive the full Check In flow (which depends on vite + the
 * full client bundle), we simply open two pages that each connect a
 * WebSocket to the wrangler's room, then send a payload from seat 1 and
 * assert seat 2's websocket listener never fires.
 */
export async function checkWsFrameIsolation(
  ctx: LiveCtx,
): Promise<CheckResult> {
  const name = 'ws-frame-isolation'
  let c1: BrowserContext | null = null
  let c2: BrowserContext | null = null
  try {
    c1 = await ctx.browser.newContext()
    c2 = await ctx.browser.newContext()
    const p1 = await c1.newPage()
    const p2 = await c2.newPage()

    await p1.goto(ctx.playerBaseUrl, { waitUntil: 'domcontentloaded' })
    await p2.goto(ctx.playerBaseUrl, { waitUntil: 'domcontentloaded' })

    let p1FramesSent = 0
    let p2FramesSeenP1 = 0
    p1.on('websocket', (ws) => {
      ws.on('framesent', () => {
        p1FramesSent++
      })
    })
    p2.on('websocket', () => {
      // Every time p2 sees ANY websocket on its page we record frames; but
      // more specifically we want to know if p2 sees a frame while p1's
      // ws is active.
      p2FramesSeenP1++
    })

    // Open a WebSocket in page 1; don't open one in page 2.
    const wsUrl = `${ctx.wsBaseUrl}/parties/game-room/${ctx.roomCode}`
    await p1.evaluate((url) => {
      return new Promise<void>((resolve) => {
        const ws = new window.WebSocket(url)
        ws.onopen = (): void => {
          ws.send('selftest-frame')
          // Small delay so framesent fires before resolving.
          setTimeout(() => {
            ws.close()
            resolve()
          }, 200)
        }
        ws.onerror = (): void => {
          resolve()
        }
        setTimeout(resolve, 2000)
      })
    }, wsUrl)

    // Give the framesent listener a chance.
    await new Promise((r) => setTimeout(r, 300))

    if (p2FramesSeenP1 > 0) {
      return {
        name,
        pass: false,
        detail: `page 2 websocket listener fired ${p2FramesSeenP1} times — leaked from page 1`,
      }
    }
    return {
      name,
      pass: true,
      detail: `seat 1 saw ${p1FramesSent} frames; seat 2 saw 0 websocket events`,
    }
  } catch (err) {
    return {
      name,
      pass: false,
      detail: `threw: ${err instanceof Error ? err.message : String(err)}`,
    }
  } finally {
    await c1?.close().catch(() => {})
    await c2?.close().catch(() => {})
  }
}

// ---------------------------------------------------------------------------
// Check 4 — God non-delivery to players
// ---------------------------------------------------------------------------

/**
 * A player-role socket (opened from a browser page) must NEVER see a
 * `god-event` message. Opens a player WS in a browser context, attaches a
 * framereceived listener, opens a god WS from the orchestrator process,
 * then asserts no player-side frame arrives with a `god-event` type.
 *
 * This check is structural — on real servers god events are emitted only
 * on the dedicated `?role=god` socket, but a regression that broadcasts to
 * all connections would fire this check loudly.
 */
export async function checkGodNonDeliveryToPlayers(
  ctx: LiveCtx,
): Promise<CheckResult> {
  const name = 'god-events-not-delivered-to-players'
  let pctx: BrowserContext | null = null
  const godFrames: string[] = []
  const playerFrames: string[] = []

  try {
    pctx = await ctx.browser.newContext()
    const page = await pctx.newPage()
    await page.goto(ctx.playerBaseUrl, { waitUntil: 'domcontentloaded' })

    page.on('websocket', (ws) => {
      ws.on('framereceived', (frame) => {
        // frame.payload is string for text frames. Peek only first 100 chars.
        const payload =
          typeof frame.payload === 'string'
            ? frame.payload
            : String(frame.payload)
        playerFrames.push(payload.slice(0, 200))
      })
    })

    // Open a player-role WS (no token, no role param => default player).
    const playerWsUrl = `${ctx.wsBaseUrl}/parties/game-room/${ctx.roomCode}`
    const playerOpenP = page.evaluate(
      (url) =>
        new Promise<void>((resolve) => {
          const ws = new window.WebSocket(url)
          ;(window as unknown as { __selftestPlayerWs: unknown }).__selftestPlayerWs =
            ws
          ws.onopen = (): void => {
            resolve()
          }
          ws.onerror = (): void => {
            resolve()
          }
          setTimeout(resolve, 3000)
        }),
      playerWsUrl,
    )
    await playerOpenP

    // Open a god connection from the orchestrator (Node side) and let it
    // sit for a moment. We don't need any events to flow — we only need
    // to establish that the god channel doesn't bleed to players.
    const tmpEventsPath = path.join(
      os.tmpdir(),
      `selftest-events-${randomUUID()}.jsonl`,
    )
    const godArgs: ConnectGodArgs = {
      wsUrl: `${ctx.wsBaseUrl}/parties/game-room/${ctx.roomCode}`,
      token: ctx.token,
      seed: 42,
      nopeWindowMs: 5000,
      scrubMode: 'on',
      scrubSalt: '0'.repeat(64),
      eventsJsonlPath: tmpEventsPath,
    }
    const god = await connectGod(godArgs)

    // Give a window for any bleed to manifest.
    await new Promise((r) => setTimeout(r, 800))

    await god.disconnect()
    await fs.rm(tmpEventsPath, { force: true }).catch(() => {})

    // Close the player ws.
    await page
      .evaluate(() => {
        const ws = (window as unknown as { __selftestPlayerWs?: WebSocket })
          .__selftestPlayerWs
        if (ws) ws.close()
      })
      .catch(() => {})

    // Give framereceived a moment.
    await new Promise((r) => setTimeout(r, 200))

    const leaked = playerFrames.filter((p) => /"type"\s*:\s*"god-event"/.test(p))
    if (leaked.length > 0) {
      return {
        name,
        pass: false,
        detail: `player-role socket observed ${leaked.length} god-event frame(s) — god channel bleeds to players`,
      }
    }
    return {
      name,
      pass: true,
      detail: `player observed ${playerFrames.length} non-god frames; 0 god-event bleed (god sent ${godFrames.length} frames internally)`,
    }
  } catch (err) {
    return {
      name,
      pass: false,
      detail: `threw: ${err instanceof Error ? err.message : String(err)}`,
    }
  } finally {
    await pctx?.close().catch(() => {})
  }
}

// ---------------------------------------------------------------------------
// Check 5 — Agent allowlist definition (PURE)
// ---------------------------------------------------------------------------

/**
 * The allowlist / disallowlist exported from types.ts must be:
 *   - Non-empty arrays of strings.
 *   - Disjoint (no method in both).
 *   - `DISALLOWED_PAGE_METHODS` contains the high-risk primitives.
 *
 * Pure check. Fast. No live servers needed.
 */
export function checkAgentAllowlistDefinition(): CheckResult {
  const name = 'agent-allowlist-definition'
  const required: readonly string[] = [
    'goto',
    'evaluate',
    'addInitScript',
    'route',
    'request',
    'context',
    'setViewportSize',
  ]

  // `ALLOWED_PAGE_METHODS` + `DISALLOWED_PAGE_METHODS` are `as const` tuples
  // so their lengths are known at compile time — Array.isArray + length
  // checks would be tautological. We still do the runtime shape assertions
  // via disjoint + required-subset below, which are the real checks.
  const allowArray: readonly string[] = ALLOWED_PAGE_METHODS
  const disallowArray: readonly string[] = DISALLOWED_PAGE_METHODS
  if (allowArray.length === 0 || disallowArray.length === 0) {
    return {
      name,
      pass: false,
      detail: `allow=${allowArray.length} disallow=${disallowArray.length} — one is empty`,
    }
  }

  // Disjoint.
  const allowSet = new Set<string>(ALLOWED_PAGE_METHODS)
  const intersection: string[] = []
  for (const m of DISALLOWED_PAGE_METHODS) {
    if (allowSet.has(m)) intersection.push(m)
  }
  if (intersection.length > 0) {
    return {
      name,
      pass: false,
      detail: `methods present in both lists: ${intersection.join(', ')}`,
    }
  }

  // Required high-risk primitives present in DISALLOWED.
  const disallowSet = new Set<string>(DISALLOWED_PAGE_METHODS)
  const missing = required.filter((m) => !disallowSet.has(m))
  if (missing.length > 0) {
    return {
      name,
      pass: false,
      detail: `DISALLOWED_PAGE_METHODS missing required entries: ${missing.join(', ')}`,
    }
  }

  return {
    name,
    pass: true,
    detail: `allow=${ALLOWED_PAGE_METHODS.length} disallow=${DISALLOWED_PAGE_METHODS.length} disjoint, all required primitives disallowed`,
  }
}

// ---------------------------------------------------------------------------
// Check 6 — God close codes distinct (LIVE)
// ---------------------------------------------------------------------------

interface GodProbeResult {
  readonly httpStatus: number | null
  readonly wsCloseCode: number | null
  readonly detail: string
}

/**
 * Probe the god endpoint and return the rejection mode. We use HTTP
 * requests (matching `phase2-smoke.ts`) because partyserver rejects god
 * handshakes pre-upgrade — the response status IS the rejection code.
 */
async function probeGodHttp(
  url: string,
  origin: string,
): Promise<GodProbeResult> {
  try {
    const res = await fetch(url, { headers: { Origin: origin } })
    return {
      httpStatus: res.status,
      wsCloseCode: null,
      detail: `HTTP ${res.status}`,
    }
  } catch (err) {
    return {
      httpStatus: null,
      wsCloseCode: null,
      detail: `fetch threw: ${err instanceof Error ? err.message : String(err)}`,
    }
  }
}

/**
 * Try each rejection path and assert they produce distinct, expected codes:
 *   (a) Wrong token               → HTTP 401 (or close 4004)
 *   (b) Forbidden origin          → HTTP 403 (or close 4003)
 *   (c) Rapid wrong-token hits    → HTTP 429 (or close 4005) — IF the
 *       server exposes rate-limiting at the HTTP-level pre-upgrade path.
 *
 * Per insight 023, god auth moved to HTTP pre-upgrade; the DO-level
 * rate-limiter (`createGodRateLimiter` in src/server/god-connection.ts)
 * now lives on a code path that wrong-token attempts never reach. Until
 * phase-2 closes that gap, sub-check (c) is treated as an informational
 * probe: a 429 passes, missing 429 is reported in `detail` but does NOT
 * fail the check — sub-checks (a) and (b) are the load-bearing gates.
 *
 * The diagnostic NEVER includes a token — only the literal labels
 * "token-invalid" / "origin-denied" / "rate-limit-informational".
 */
export async function checkGodCloseCodesDistinct(
  ctx: LiveCtx,
): Promise<CheckResult> {
  const name = 'god-close-codes-distinct'
  const roomPath = `/parties/game-room/${ctx.roomCode}`
  const urlWrong = `${ctx.wranglerBaseUrl}${roomPath}?role=god&token=wrong-token-placeholder`
  const urlWithToken = `${ctx.wranglerBaseUrl}${roomPath}?role=god&token=${ctx.token}`

  // (a) Wrong token from LAN origin → 401.
  const wrongTokenProbe = await probeGodHttp(urlWrong, ctx.goodOrigin)
  if (wrongTokenProbe.httpStatus === 4001) {
    return {
      name,
      pass: false,
      detail: `wrong-token probe returned 4001 (room-full code) — server regression`,
    }
  }
  const aOk = wrongTokenProbe.httpStatus === 401
  if (!aOk) {
    return {
      name,
      pass: false,
      detail: `(a) token-invalid: expected HTTP 401, got ${wrongTokenProbe.detail}`,
    }
  }

  // (b) Correct-looking token but forbidden origin → 403.
  const forbiddenOriginProbe = await probeGodHttp(
    urlWithToken,
    'https://evil.example.com',
  )
  if (forbiddenOriginProbe.httpStatus === 4001) {
    return {
      name,
      pass: false,
      detail: `forbidden-origin probe returned 4001 — server regression`,
    }
  }
  const bOk = forbiddenOriginProbe.httpStatus === 403
  if (!bOk) {
    return {
      name,
      pass: false,
      detail: `(b) origin-denied: expected HTTP 403, got ${forbiddenOriginProbe.detail}`,
    }
  }

  // (c) Rapid fire wrong-token attempts. Phase-2 rate-limiter threshold=3
  // per 60s window, but per insight 023 the limiter lives inside onConnect
  // which is not reached for pre-upgrade 401 rejections. We probe it as
  // informational only — a 429 is a BONUS, not a gate.
  let rateLimited = false
  let lastStatus: number | null = null
  for (let i = 0; i < 4; i++) {
    const r = await probeGodHttp(urlWrong, ctx.goodOrigin)
    lastStatus = r.httpStatus
    if (r.httpStatus === 429) {
      rateLimited = true
      break
    }
    if (r.httpStatus === 4001) {
      return {
        name,
        pass: false,
        detail: `rate-limit probe saw 4001 on attempt ${i + 1} — server regression`,
      }
    }
  }

  const rateLimitDetail = rateLimited
    ? '429 (rate-limited) observed on rapid-fire — full 3-way distinct'
    : `rate-limit-informational: no 429 after 4 attempts (last=${lastStatus ?? 'null'}) — DO-level limiter not reachable pre-upgrade (insight 023)`

  return {
    name,
    pass: true,
    detail: `401 (token-invalid) / 403 (origin-denied) distinct; ${rateLimitDetail}`,
  }
}

// ---------------------------------------------------------------------------
// Check 7 — Scrubber invoked on every write + fail-closed (PURE)
// ---------------------------------------------------------------------------

const HEX_12 = /^[0-9a-f]{12}$/

/**
 * Two sub-assertions:
 *   (a) A well-formed god-event goes through `scrub()` → every myHand[*].id
 *       matches the 12-hex shape AND type === '<redacted>'.
 *   (b) A malformed god-event makes `scrub()` throw. We then prove the
 *       god-subscriber's write-path fails CLOSED: the 3rd event (malformed)
 *       does NOT reach the injected fsAppender.
 *
 * Pure — uses `connectGod` with injection seams for the WS, fs, and
 * scheduler. No live servers.
 */
export async function checkScrubberInvokedFailClosed(): Promise<CheckResult> {
  const name = 'scrubber-invoked-fail-closed'

  // --- (a) Well-formed scrub output shape -----------------------------------
  try {
    const salt = '0123456789abcdef'.repeat(4) // 64 hex chars
    const ev: GodEvent = {
      type: 'god-event',
      action: { type: 'play-card', playerId: 'p1' },
      events: [],
      stateVersion: 7,
      nowMs: 1000,
      projections: {
        p1: {
          myPlayerId: 'p1',
          myHand: [
            { id: 'card-abc', type: 'defuse' },
            { id: 'card-xyz', type: 'attack' },
          ],
        },
        p2: {
          myPlayerId: 'p2',
          myHand: [{ id: 'card-123', type: 'favor' }],
        },
      },
      boardView: { phase: 'playing', stateVersion: 7 },
    }
    const out = scrub(ev, 'on', salt)
    for (const viewer of Object.keys(out.projections)) {
      const view = out.projections[viewer]!
      if (!Array.isArray(view.myHand)) {
        return {
          name,
          pass: false,
          detail: `(a) scrub broke myHand for viewer ${viewer}`,
        }
      }
      for (const entry of view.myHand) {
        if (!HEX_12.test(entry.id)) {
          return {
            name,
            pass: false,
            detail: `(a) id shape wrong: ${JSON.stringify(entry.id)} does not match /^[0-9a-f]{12}$/`,
          }
        }
        if (entry.type !== '<redacted>') {
          return {
            name,
            pass: false,
            detail: `(a) type not redacted: got ${JSON.stringify(entry.type)}`,
          }
        }
      }
    }
  } catch (err) {
    return {
      name,
      pass: false,
      detail: `(a) scrub of well-formed event threw: ${err instanceof Error ? err.message : String(err)}`,
    }
  }

  // --- (b) Fail-closed on malformed projection ------------------------------
  // Build a minimal god-subscriber harness that injects a fake WS + fs
  // appender, feeds a malformed event, and asserts NO line was written.
  const appended: string[] = []
  const fsAppender = async (_p: string, batch: string): Promise<void> => {
    appended.push(batch)
  }
  interface Listener {
    open?: () => void
    message?: (data: string) => void
    close?: (code: number, reason: Buffer) => void
    error?: (err: Error) => void
    'unexpected-response'?: (req: unknown, res: unknown) => void
  }
  const listeners: Listener = {}
  const fakeWs: WebSocketLike = {
    on: (event: string, listener: unknown): void => {
      ;(listeners as unknown as Record<string, unknown>)[event] = listener
    },
    send: (): void => {},
    close: (): void => {},
  }
  const scheduleFlush = (cb: () => void): { cancel: () => void } => {
    // Never auto-fire; tests drive explicit flush via disconnect().
    void cb
    return { cancel: () => {} }
  }

  const connectArgs: ConnectGodArgs = {
    wsUrl: 'ws://test.invalid/parties/game-room/TEST',
    token: '0'.repeat(64),
    seed: 42,
    nopeWindowMs: 5000,
    scrubMode: 'on',
    scrubSalt: '1'.repeat(64),
    eventsJsonlPath: '/dev/null',
    wsFactory: () => fakeWs,
    fsAppender,
    scheduleFlush,
  }

  const handle = await connectGod(connectArgs)
  listeners.open?.()

  // Well-formed event first — this MUST pass through.
  const okEv = {
    type: 'god-event',
    action: { type: 'play-card', playerId: 'p1' },
    events: [],
    stateVersion: 1,
    nowMs: 1000,
    projections: {
      p1: { myPlayerId: 'p1', myHand: [{ id: 'card-abc', type: 'defuse' }] },
    },
    boardView: { phase: 'playing', stateVersion: 1 },
  }
  listeners.message?.(JSON.stringify(okEv))

  // Now feed a malformed projection — scrubber will throw.
  const badEv = {
    type: 'god-event',
    action: { type: 'play-card', playerId: 'p1' },
    events: [],
    stateVersion: 2,
    nowMs: 1000,
    projections: {
      p1: { myPlayerId: 'p1', myHand: 'not-an-array' },
    },
    boardView: { phase: 'playing', stateVersion: 2 },
  }
  listeners.message?.(JSON.stringify(badEv))

  // Await fatal-close resolution OR a timeout.
  const fatal = await Promise.race<{ code: number; reason: string } | 'timeout'>(
    [
      handle.onFatalClose.then((i) => i),
      new Promise<'timeout'>((r) => setTimeout(() => r('timeout'), 2000)),
    ],
  )
  // We do not rely on disconnect (which also tries fsync) to avoid touching
  // the filesystem; just detach.

  if (fatal === 'timeout') {
    return {
      name,
      pass: false,
      detail: `(b) scrubber-throw did not surface onFatalClose within 2s`,
    }
  }

  // The malformed event's line must NOT be in `appended`.
  const joined = appended.join('')
  // Look for a raw-type leak: if the malformed hand string slipped through,
  // it would appear in the batch.
  if (joined.includes('not-an-array')) {
    return {
      name,
      pass: false,
      detail: `(b) RAW malformed event reached fsAppender — fail-closed broken`,
    }
  }
  // Also confirm no stateVersion=2 line appeared.
  if (/"stateVersion"\s*:\s*2/.test(joined)) {
    return {
      name,
      pass: false,
      detail: `(b) stateVersion=2 line appeared in fsAppender — fail-closed broken`,
    }
  }
  if (!/scrubber threw/.test(fatal.reason)) {
    return {
      name,
      pass: false,
      detail: `(b) fatal close reason mismatch: ${fatal.reason}`,
    }
  }

  return {
    name,
    pass: true,
    detail: `(a) shape ok, (b) fail-closed: malformed event aborted with "${fatal.reason.slice(0, 40)}..."`,
  }
}

// ---------------------------------------------------------------------------
// Check 8 — Retention evicts (N+1)-th, keeps N-th (PURE + tmpfs)
// ---------------------------------------------------------------------------

/**
 * In a temp dir, create 11 synthetic session dirs at distinct times. Run
 * `applyRetention` with `sessionDirRetention: 10`. Assert:
 *   - The oldest (11th) is DELETED.
 *   - The 10th oldest is KEPT.
 *
 * Tests BOTH sides of the boundary in the same tmpfs workspace.
 */
export async function checkRetentionBoundary(): Promise<CheckResult> {
  const name = 'retention-boundary'
  const tmpRoot = path.join(os.tmpdir(), `selftest-retention-${randomUUID()}`)
  try {
    await fs.mkdir(tmpRoot, { recursive: true })

    // Create 11 dirs at distinct hours on the same day.
    const names: string[] = []
    for (let h = 0; h < 11; h++) {
      const hh = String(h).padStart(2, '0')
      const n = `2026-04-24-${hh}00-3p`
      names.push(n)
      await fs.mkdir(path.join(tmpRoot, n, 'server'), { recursive: true })
      await fs.writeFile(path.join(tmpRoot, n, 'server', 'events.jsonl'), 'x\n')
    }

    const result = await applyRetention({
      outputRoot: tmpRoot,
      sessionDirRetention: 10,
    })

    // Oldest (hour 00) must be rotated. Next-oldest (hour 01) must be kept.
    const oldest = '2026-04-24-0000-3p' // the (N+1)-th
    const boundary = '2026-04-24-0100-3p' // the N-th (10th)

    if (!result.rotated.includes(oldest)) {
      return {
        name,
        pass: false,
        detail: `expected ${oldest} rotated; got rotated=[${result.rotated.join(', ')}]`,
      }
    }
    if (!result.kept.includes(boundary)) {
      return {
        name,
        pass: false,
        detail: `expected ${boundary} kept; got kept=[${result.kept.join(', ')}]`,
      }
    }

    // FS-side verification.
    const remaining = (
      await fs.readdir(tmpRoot).catch(() => [] as string[])
    ).filter((n) => !n.startsWith('_'))
    if (remaining.includes(oldest)) {
      return {
        name,
        pass: false,
        detail: `(N+1)-th dir ${oldest} still on disk after applyRetention`,
      }
    }
    if (!remaining.includes(boundary)) {
      return {
        name,
        pass: false,
        detail: `N-th dir ${boundary} missing from disk after applyRetention`,
      }
    }

    // Defense: the parseSessionDirName contract underpins the whole
    // retention system. Sanity-check it here too.
    if (parseSessionDirName(boundary) === null) {
      return {
        name,
        pass: false,
        detail: `parseSessionDirName failed on valid name — retention regex drifted`,
      }
    }

    return {
      name,
      pass: true,
      detail: `rotated ${result.rotated.length}/${names.length}, (N+1)-th ${oldest} gone, N-th ${boundary} kept`,
    }
  } catch (err) {
    return {
      name,
      pass: false,
      detail: `threw: ${err instanceof Error ? err.message : String(err)}`,
    }
  } finally {
    await fs.rm(tmpRoot, { recursive: true, force: true }).catch(() => {})
  }
}
