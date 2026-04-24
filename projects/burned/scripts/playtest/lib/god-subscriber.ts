/**
 * God-event WS subscription + split-envelope reassembly + events.jsonl writer.
 *
 * Phase 3 Unit 4 — opens ONE WebSocket as `role=god&token=<T>`, sends the
 * pre-game `playtest-config { seed, nopeWindowMs }`, consumes the inbound
 * `god-event` stream (including per-viewer split chunks that share a
 * `stateVersion`), reassembles split chunks keyed by `stateVersion`,
 * scrubs each merged event via Unit 4b, and appends one JSONL line per
 * event to `<runDir>/server/events.jsonl`.
 *
 * Key contracts (plan D4 / D14 / D15 / Unit 4 Approach):
 *   - Envelope: `{ type: 'god-event', action, events, stateVersion, nowMs,
 *     projections, boardView, expectedViewerIds? }` — consumed verbatim.
 *   - Reassembly: buffer `Map<stateVersion, PartialAssembly>`. Completion
 *     check is **set-equality** `new Set(Object.keys(projections))` ===
 *     `new Set(expectedViewerIds)` — count-only is explicitly banned by
 *     plan D4 (mid-reassembly disconnects break the count invariant).
 *   - Byte-identity assertion across split chunks on `action`, `events`,
 *     `nowMs`, `boardView`, `expectedViewerIds`. Mismatch is a server bug
 *     → fail-closed (log diagnostic, reject `onFatalClose`, do NOT append).
 *   - Scrubber throw → fail-closed. NEVER write the raw unscrubbed event.
 *   - Token NEVER appears in logs. URL redaction: `token=<REDACTED>`.
 *   - Close codes (insight 023): 4003 = origin denied, 4004 = auth failed,
 *     4005 = rate-limited. Also handles pre-upgrade HTTP rejection
 *     (`ws` 'unexpected-response' event) and maps 403→4003, 401→4004,
 *     429→4005 for equivalent fatal-abort behavior.
 *   - Reassembly timeout (default 5000ms): partial flushed with `partial:
 *     true` marker (diagnostic, not fatal).
 *   - Append queue flushes every 100ms; disconnect() final-flushes with
 *     `fdatasync` for crash-consistency.
 *
 * Boundaries (insight 022): zero imports from `src/server` or `partyserver`.
 */
import { promises as fs } from 'node:fs'
import type { IncomingMessage } from 'node:http'
import WebSocket from 'ws'
import { scrub } from './scrubber'
import type {
  BoardView,
  EngineAction,
  GameEvent,
  GodEvent,
  PlayerView,
} from './types'
import { GOD_CLOSE_CODE } from './types'

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface FatalCloseInfo {
  readonly code: number
  readonly reason: string
  /** Only 4005 (rate-limit) is retriable per plan D4. */
  readonly retriable: boolean
}

export interface GodHandle {
  /** Flushes the append queue, closes the WS, closes the file handle. */
  disconnect(): Promise<void>
  /**
   * Resolves when the WS closes with a fatal god-auth code (4003/4004/4005),
   * when pre-upgrade HTTP rejection surfaces (401/403/429 → equivalent
   * mapped code), OR when a fatal internal error occurs (scrubber throw,
   * server-contract violation, playtest-config rejection).
   *
   * A clean `disconnect()` does NOT resolve this — the promise stays
   * pending. Only abnormal terminations resolve it.
   */
  readonly onFatalClose: Promise<FatalCloseInfo>
}

/** Minimal WebSocket surface the subscriber actually uses — injection seam. */
export interface WebSocketLike {
  on(event: 'open', listener: () => void): void
  on(event: 'message', listener: (data: WebSocket.RawData) => void): void
  on(event: 'close', listener: (code: number, reason: Buffer) => void): void
  on(event: 'error', listener: (err: Error) => void): void
  on(event: 'unexpected-response', listener: (req: unknown, res: IncomingMessage) => void): void
  send(data: string): void
  close(code?: number, reason?: string): void
}

export interface ConnectGodArgs {
  /** Base WS URL, e.g. `ws://127.0.0.1:8787/parties/main/<room>`. */
  readonly wsUrl: string
  /** 64-hex session token (from Unit 3b). Appended internally as `token=<T>`. */
  readonly token: string
  /** Seed for `playtest-config`; undefined lets server roll its own. */
  readonly seed: number | undefined
  /** Nope-window override in ms for `playtest-config`. */
  readonly nopeWindowMs: number
  /** `'on'` = scrub, `'off'` = identity. */
  readonly scrubMode: 'on' | 'off'
  /** 64-hex session salt (from Unit 3b). Passed to scrub() on every call. */
  readonly scrubSalt: string
  /** Absolute path to `<runDir>/server/events.jsonl`. */
  readonly eventsJsonlPath: string
  /** Default 5000ms per plan D4 / R12. */
  readonly godReassemblyTimeoutMs?: number
  /** Test-injection: WebSocket factory. Defaults to `ws` package. */
  readonly wsFactory?: (url: string) => WebSocketLike
  /**
   * Test-injection: appender for event lines. Receives the already-
   * terminated (`\n`-suffixed) concatenated batch. Defaults to
   * `fs.appendFile`. Also returns a handle used for final fsync; when
   * overridden in tests the handle may be a no-op stub.
   */
  readonly fsAppender?: (path: string, batch: string) => Promise<void>
  /** Test-injection: monotonic ms clock. Defaults to `Date.now`. */
  readonly nowMs?: () => number
  /**
   * Test-injection: flush-interval scheduler. When provided, the subscriber
   * does NOT install its own `setInterval` — tests drive flushes via the
   * returned callback. Defaults to a real `setInterval(..., 100)`.
   */
  readonly scheduleFlush?: (callback: () => void) => { cancel: () => void }
  /**
   * Test-injection: reassembly-timeout scheduler. When provided, the
   * subscriber uses this in place of `setTimeout` for partial-flush
   * timers. Signature mirrors `setTimeout` / `clearTimeout`.
   */
  readonly scheduleTimeout?: (callback: () => void, ms: number) => unknown
  readonly clearTimeout?: (handle: unknown) => void
}

// ---------------------------------------------------------------------------
// Internal shapes
// ---------------------------------------------------------------------------

interface PartialAssembly {
  action: EngineAction
  events: readonly GameEvent[]
  nowMs: number
  boardView: BoardView
  projections: Record<string, PlayerView>
  expected: Set<string>
  /** Serialized form of `expectedViewerIds` (stable JSON) for byte-identity. */
  expectedViewerIdsSerialized: string
  actionSerialized: string
  eventsSerialized: string
  boardViewSerialized: string
  receivedAt: number
  timeoutHandle: unknown
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Redact the token from a URL for logging. */
function redactUrl(url: string): string {
  return url.replace(/([?&]token=)[^&]+/g, '$1<REDACTED>')
}

/** Build final URL with god auth query params. */
function buildGodUrl(base: string, token: string): string {
  const sep = base.includes('?') ? '&' : '?'
  return `${base}${sep}role=god&token=${token}`
}

/** Strict deep-equal via stable stringify. Inputs are server-shaped JSON. */
function jsonEquals(a: unknown, b: unknown): boolean {
  // JSON.stringify key order is NOT stable across different objects — but
  // for our use case the server emits consistent envelope shape across
  // chunks of the same stateVersion, and `action`/`events`/`boardView`
  // are byte-literal server output. So JSON.stringify is a faithful
  // byte-equality check.
  return JSON.stringify(a) === JSON.stringify(b)
}

/**
 * Set equality by string membership. Both sides must have the same size
 * AND every element of `a` must appear in `b`.
 */
function setEquals(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false
  for (const v of a) if (!b.has(v)) return false
  return true
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

export async function connectGod(args: ConnectGodArgs): Promise<GodHandle> {
  const {
    wsUrl,
    token,
    seed,
    nopeWindowMs,
    scrubMode,
    scrubSalt,
    eventsJsonlPath,
    godReassemblyTimeoutMs = 5000,
    wsFactory,
    fsAppender,
    nowMs = Date.now,
    scheduleFlush,
    scheduleTimeout,
    clearTimeout: clearTimeoutArg,
  } = args

  // Never interpolate the raw token into log strings. All URL logging
  // passes through `redactUrl`.
  const url = buildGodUrl(wsUrl, token)

  // ---- Scheduling primitives (test-injectable) --------------------------
  const timeoutSet = scheduleTimeout
    ? (cb: () => void, ms: number) => scheduleTimeout(cb, ms)
    : (cb: () => void, ms: number) => setTimeout(cb, ms)
  const timeoutClear = clearTimeoutArg
    ? (h: unknown) => clearTimeoutArg(h)
    : (h: unknown) => clearTimeout(h as ReturnType<typeof setTimeout>)

  // ---- Open WS -----------------------------------------------------------
  const ws: WebSocketLike = wsFactory
    ? wsFactory(url)
    : (new WebSocket(url) as unknown as WebSocketLike)

  // ---- Fatal-close promise ----------------------------------------------
  let resolveFatal!: (info: FatalCloseInfo) => void
  let fatalSettled = false
  const onFatalClose = new Promise<FatalCloseInfo>((resolve) => {
    resolveFatal = (info) => {
      if (fatalSettled) return
      fatalSettled = true
      resolve(info)
    }
  })

  // ---- Append queue ------------------------------------------------------
  const queue: string[] = []
  let disconnected = false
  let appendInFlight = Promise.resolve()

  function enqueueLine(obj: unknown): void {
    // JSON.stringify handles quotes / newlines / unicode safely.
    queue.push(JSON.stringify(obj) + '\n')
  }

  const doAppend: (path: string, batch: string) => Promise<void> =
    fsAppender ?? ((path, batch) => fs.appendFile(path, batch))

  function flushQueue(): Promise<void> {
    if (queue.length === 0) return Promise.resolve()
    const batch = queue.join('')
    queue.length = 0
    appendInFlight = appendInFlight
      .then(() => doAppend(eventsJsonlPath, batch))
      .catch((err) => {
        // Append failure is fatal: we have no durable path for the event.
        // Surface through fatal-close so the orchestrator aborts.
        console.error('[god-subscriber] append failed:', err)
        resolveFatal({
          code: -1,
          reason: `append failed: ${err instanceof Error ? err.message : String(err)}`,
          retriable: false,
        })
      })
    return appendInFlight
  }

  // 100ms periodic flush (skipped when tests inject a scheduler).
  const flushScheduler = scheduleFlush
    ? scheduleFlush(() => { void flushQueue() })
    : (() => {
        const h = setInterval(() => { void flushQueue() }, 100)
        return { cancel: () => clearInterval(h) }
      })()

  // ---- Reassembly buffer -------------------------------------------------
  const buffer = new Map<number, PartialAssembly>()

  function writeMerged(
    merged: GodEvent,
    { partial }: { partial: boolean },
  ): void {
    let scrubbed: GodEvent
    try {
      scrubbed = scrub(merged, scrubMode, scrubSalt)
    } catch (err) {
      // Fail-closed: never write raw. Log + fatal-abort.
      console.error(
        `[god-subscriber] [scrubber-threw] stateVersion=${merged.stateVersion}:`,
        err instanceof Error ? err.message : String(err),
      )
      resolveFatal({
        code: -1,
        reason: `scrubber threw: ${err instanceof Error ? err.message : String(err)}`,
        retriable: false,
      })
      return
    }
    const line = partial ? { ...scrubbed, partial: true } : scrubbed
    enqueueLine(line)
  }

  function flushAssembly(sv: number, entry: PartialAssembly, partial: boolean): void {
    timeoutClear(entry.timeoutHandle)
    buffer.delete(sv)
    const merged: GodEvent = {
      type: 'god-event',
      action: entry.action,
      events: entry.events,
      stateVersion: sv,
      nowMs: entry.nowMs,
      projections: entry.projections,
      boardView: entry.boardView,
    }
    writeMerged(merged, { partial })
  }

  function scheduleReassemblyTimeout(sv: number): unknown {
    return timeoutSet(() => {
      const entry = buffer.get(sv)
      if (!entry) return
      console.warn(
        `[god-subscriber] [reassembly-timeout] stateVersion=${sv} received=` +
          `${Object.keys(entry.projections).length}/${entry.expected.size}`,
      )
      flushAssembly(sv, entry, /* partial */ true)
    }, godReassemblyTimeoutMs)
  }

  // ---- Inbound message handling -----------------------------------------
  function onInboundMessage(raw: unknown): void {
    let parsed: Record<string, unknown>
    try {
      parsed = JSON.parse(String(raw)) as Record<string, unknown>
    } catch (err) {
      console.error('[god-subscriber] malformed JSON:', err)
      return
    }

    // playtest-config-ack: if rejected, fatal-abort.
    if (parsed['type'] === 'playtest-config-ack') {
      const ok = parsed['ok'] === true
      if (!ok) {
        const code = typeof parsed['code'] === 'string' ? parsed['code'] : 'UNKNOWN'
        console.error(`[god-subscriber] playtest-config rejected: ${code}`)
        resolveFatal({
          code: -1,
          reason: `playtest-config rejected: ${code}`,
          retriable: false,
        })
      }
      return
    }

    if (parsed['type'] !== 'god-event') {
      // Ignore anything else (server currently emits only god-event + ack
      // on a god connection; unknown messages are not fatal).
      return
    }

    const event = parsed as unknown as GodEvent
    const sv = event.stateVersion
    const existing = buffer.get(sv)

    // Determine whether this is a split chunk or unsplit event.
    const providedExpected = event.expectedViewerIds
    const projectionKeys = Object.keys(event.projections ?? {})

    // Unsplit shapes per plan D4: expectedViewerIds absent, empty, OR equal
    // (as a set) to Object.keys(projections).
    const looksUnsplit =
      !existing &&
      (providedExpected === undefined ||
        providedExpected.length === 0 ||
        setEquals(new Set(providedExpected), new Set(projectionKeys)))

    if (looksUnsplit) {
      // Flush immediately — no buffering.
      writeMerged(event, { partial: false })
      return
    }

    if (!existing) {
      // First chunk of a true split.
      if (!providedExpected || providedExpected.length === 0) {
        // Shouldn't reach here given looksUnsplit check, but be defensive.
        writeMerged(event, { partial: false })
        return
      }
      // Validate projection keys subset of expected.
      const expectedSet = new Set(providedExpected)
      for (const key of projectionKeys) {
        if (!expectedSet.has(key)) {
          console.error(
            `[god-subscriber] [server-contract-violation] stateVersion=${sv} ` +
              `chunk projection key ${JSON.stringify(key)} not in expectedViewerIds`,
          )
          resolveFatal({
            code: -1,
            reason: `unexpected viewer id in chunk: ${key}`,
            retriable: false,
          })
          return
        }
      }

      const timeoutHandle = scheduleReassemblyTimeout(sv)
      const entry: PartialAssembly = {
        action: event.action,
        events: event.events,
        nowMs: event.nowMs,
        boardView: event.boardView,
        projections: { ...event.projections },
        expected: expectedSet,
        expectedViewerIdsSerialized: JSON.stringify(providedExpected),
        actionSerialized: JSON.stringify(event.action),
        eventsSerialized: JSON.stringify(event.events),
        boardViewSerialized: JSON.stringify(event.boardView),
        receivedAt: nowMs(),
        timeoutHandle,
      }
      buffer.set(sv, entry)

      // Completion check in case this single chunk already satisfies the
      // expected set (degenerate edge — e.g. 1-element split).
      if (setEquals(new Set(Object.keys(entry.projections)), entry.expected)) {
        flushAssembly(sv, entry, /* partial */ false)
      }
      return
    }

    // Subsequent chunk for an existing assembly.
    // 1. Byte-identity assertions on shared fields.
    if (JSON.stringify(event.action) !== existing.actionSerialized) {
      console.error(
        `[god-subscriber] [server-contract-violation] stateVersion=${sv} ` +
          `action differs across split chunks`,
      )
      timeoutClear(existing.timeoutHandle)
      buffer.delete(sv)
      resolveFatal({
        code: -1,
        reason: 'split byte-identity violation: action mismatch',
        retriable: false,
      })
      return
    }
    if (JSON.stringify(event.events) !== existing.eventsSerialized) {
      console.error(
        `[god-subscriber] [server-contract-violation] stateVersion=${sv} ` +
          `events differs across split chunks`,
      )
      timeoutClear(existing.timeoutHandle)
      buffer.delete(sv)
      resolveFatal({
        code: -1,
        reason: 'split byte-identity violation: events mismatch',
        retriable: false,
      })
      return
    }
    if (JSON.stringify(event.boardView) !== existing.boardViewSerialized) {
      console.error(
        `[god-subscriber] [server-contract-violation] stateVersion=${sv} ` +
          `boardView differs across split chunks`,
      )
      timeoutClear(existing.timeoutHandle)
      buffer.delete(sv)
      resolveFatal({
        code: -1,
        reason: 'split byte-identity violation: boardView mismatch',
        retriable: false,
      })
      return
    }
    if (event.nowMs !== existing.nowMs) {
      console.error(
        `[god-subscriber] [server-contract-violation] stateVersion=${sv} ` +
          `nowMs differs across split chunks`,
      )
      timeoutClear(existing.timeoutHandle)
      buffer.delete(sv)
      resolveFatal({
        code: -1,
        reason: 'split byte-identity violation: nowMs mismatch',
        retriable: false,
      })
      return
    }
    if (JSON.stringify(providedExpected ?? []) !== existing.expectedViewerIdsSerialized) {
      console.error(
        `[god-subscriber] [server-contract-violation] stateVersion=${sv} ` +
          `expectedViewerIds differs across split chunks`,
      )
      timeoutClear(existing.timeoutHandle)
      buffer.delete(sv)
      resolveFatal({
        code: -1,
        reason: 'split byte-identity violation: expectedViewerIds mismatch',
        retriable: false,
      })
      return
    }

    // 2. Validate projection keys are a subset of expected + no collisions.
    for (const key of Object.keys(event.projections)) {
      if (!existing.expected.has(key)) {
        console.error(
          `[god-subscriber] [server-contract-violation] stateVersion=${sv} ` +
            `projection key ${JSON.stringify(key)} not in expectedViewerIds`,
        )
        timeoutClear(existing.timeoutHandle)
        buffer.delete(sv)
        resolveFatal({
          code: -1,
          reason: `unexpected viewer id in chunk: ${key}`,
          retriable: false,
        })
        return
      }
      if (
        key in existing.projections &&
        !jsonEquals(existing.projections[key], event.projections[key])
      ) {
        console.error(
          `[god-subscriber] [server-contract-violation] stateVersion=${sv} ` +
            `viewer ${JSON.stringify(key)} re-sent with different projection`,
        )
        timeoutClear(existing.timeoutHandle)
        buffer.delete(sv)
        resolveFatal({
          code: -1,
          reason: `projection collision with mismatch: ${key}`,
          retriable: false,
        })
        return
      }
    }

    // 3. Merge projections.
    for (const [k, v] of Object.entries(event.projections)) {
      existing.projections[k] = v
    }

    // 4. Set-equality completion check.
    if (setEquals(new Set(Object.keys(existing.projections)), existing.expected)) {
      flushAssembly(sv, existing, /* partial */ false)
    }
  }

  // ---- WS event wiring ---------------------------------------------------
  ws.on('open', () => {
    const configMsg: Record<string, unknown> = {
      type: 'playtest-config',
      nopeWindowMs,
    }
    if (seed !== undefined) configMsg['seed'] = seed
    ws.send(JSON.stringify(configMsg))
  })

  ws.on('message', (data: WebSocket.RawData) => {
    try {
      onInboundMessage(data)
    } catch (err) {
      console.error('[god-subscriber] message-handler threw:', err)
      resolveFatal({
        code: -1,
        reason: `message-handler threw: ${err instanceof Error ? err.message : String(err)}`,
        retriable: false,
      })
    }
  })

  ws.on('close', (code: number, reason: Buffer) => {
    const reasonStr = reason ? reason.toString('utf8') : ''
    if (disconnected) {
      // User-initiated close — do NOT resolve fatal.
      return
    }
    switch (code) {
      case GOD_CLOSE_CODE.ORIGIN_DENIED: // 4003
        resolveFatal({ code, reason: 'god origin not allowlisted', retriable: false })
        return
      case GOD_CLOSE_CODE.AUTH_FAILED: // 4004
        resolveFatal({ code, reason: 'playtest mode off or token invalid', retriable: false })
        return
      case GOD_CLOSE_CODE.RATE_LIMITED: // 4005
        resolveFatal({ code, reason: 'rate-limited', retriable: true })
        return
      default:
        if (code === 1000 || code === 1001) {
          // Clean server close — not fatal by itself. Leave onFatalClose
          // pending; the orchestrator notices via its own lifecycle signal.
          return
        }
        console.warn(`[god-subscriber] unexpected close code=${code} reason=${reasonStr}`)
        resolveFatal({
          code,
          reason: reasonStr || `unexpected close code=${code}`,
          retriable: false,
        })
    }
  })

  ws.on('error', (err: Error) => {
    // `ws` fires 'error' before 'close' for ECONNREFUSED, DNS failures, etc.
    // Do not resolve fatal here — wait for 'close' to report the final
    // code. But if a handshake completed and errored out post-open, the
    // 'close' handler will pick it up.
    console.error(
      `[god-subscriber] ws error for ${redactUrl(url)}:`,
      err.message,
    )
  })

  // Pre-upgrade HTTP rejection path — `ws` emits 'unexpected-response'
  // with the HTTP response. Map status codes to equivalent fatal close
  // codes so the orchestrator's retry logic sees a uniform shape.
  ws.on('unexpected-response', (_req, res) => {
    const status = res.statusCode ?? 0
    let mapped: FatalCloseInfo
    switch (status) {
      case 401:
        mapped = { code: GOD_CLOSE_CODE.AUTH_FAILED, reason: 'HTTP 401 (mapped to 4004)', retriable: false }
        break
      case 403:
        mapped = { code: GOD_CLOSE_CODE.ORIGIN_DENIED, reason: 'HTTP 403 (mapped to 4003)', retriable: false }
        break
      case 429:
        mapped = { code: GOD_CLOSE_CODE.RATE_LIMITED, reason: 'HTTP 429 (mapped to 4005)', retriable: true }
        break
      default:
        mapped = { code: status, reason: `HTTP ${status} pre-upgrade rejection`, retriable: false }
    }
    resolveFatal(mapped)
    // Drain the response to avoid leaking the socket.
    res.resume()
  })

  // ---- Disconnect --------------------------------------------------------
  async function disconnect(): Promise<void> {
    if (disconnected) return
    disconnected = true
    // Cancel the periodic flush scheduler.
    flushScheduler.cancel()
    // Drain any partially-assembled buffer entries as partial flushes.
    for (const [sv, entry] of buffer) {
      console.warn(
        `[god-subscriber] draining partial on disconnect stateVersion=${sv} ` +
          `received=${Object.keys(entry.projections).length}/${entry.expected.size}`,
      )
      timeoutClear(entry.timeoutHandle)
      const merged: GodEvent = {
        type: 'god-event',
        action: entry.action,
        events: entry.events,
        stateVersion: sv,
        nowMs: entry.nowMs,
        projections: entry.projections,
        boardView: entry.boardView,
      }
      writeMerged(merged, { partial: true })
    }
    buffer.clear()
    // Final flush of the queue.
    await flushQueue()
    // Close the WS (normal close).
    try {
      ws.close(1000, 'orchestrator-disconnect')
    } catch {
      // ignore
    }
    // fdatasync the file for crash-consistency. If the file doesn't exist
    // (no events written), skip.
    try {
      const fh = await fs.open(eventsJsonlPath, 'a')
      try {
        await fh.datasync()
      } finally {
        await fh.close()
      }
    } catch {
      // Best-effort — if the path isn't writable, we already logged via
      // append failure.
    }
  }

  return { disconnect, onFatalClose }
}
