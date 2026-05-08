#!/usr/bin/env tsx
/**
 * Phase 6 — heartbeat smoke (insight 034 regression coverage).
 *
 * Boots a real wrangler+vite pair, connects the god subscriber, and idles
 * for ~65 seconds. The server's heartbeat protocol (`src/server/room.ts:
 * HEARTBEAT_INTERVAL_MS = 30_000`) sends `{type: 'ping'}` every 30s and
 * closes the connection with code 1001 if no inbound activity arrives
 * within `HEARTBEAT_INTERVAL_MS + HEARTBEAT_TIMEOUT_MS = 40s`. The god
 * subscriber must reply with `{type: 'pong', payload: {}}` within that
 * window to stay alive.
 *
 * Pre-fix (insight 034 era), the god subscriber didn't handle pings at
 * all — it dropped them silently and got killed at 40s with code 1001,
 * which the close handler classified as "non-fatal clean close" so the
 * orchestrator never noticed. The fix is the pong handler at god-
 * subscriber.ts:onInboundMessage:`parsed['type'] === 'ping'`.
 *
 * This smoke catches a regression of the pong handler. It deliberately
 * runs ≥60s so ≥2 server ping cycles fire, which would close the
 * connection on a regressed subscriber.
 *
 * Assertions:
 *   - god.onFatalClose is still pending after ~65s of idle (presence-of-
 *     absence: nothing fatal-closed us).
 *   - The inbound `ping` count observed by a wrapper WebSocket is ≥2
 *     (presence-of-presence: the server actually pinged us; without
 *     this, the smoke would pass vacuously if heartbeats were disabled
 *     server-side).
 *   - god.disconnect() completes cleanly.
 *   - servers shut down with no zombie workerd.
 *
 * Does NOT cover the 15-minute inactivity-kick path (insight 038 — fixed
 * by exempting god from the kick close loop in `room.ts:onAlarm`). Real
 * calibration runs are the integration proof for that fix; this smoke
 * would need to run >15 min, which is too long for routine CI.
 *
 * Exit 0 = PASS, 1 = FAIL.
 */
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import * as os from 'node:os'
import { setTimeout as delay } from 'node:timers/promises'
import WebSocket from 'ws'

import { connectGod, buildLanOriginFromWsUrl, type WebSocketLike } from '../lib/god-subscriber'
import { startServers, stopServers } from '../lib/server-controller'
import { mintPlaytestToken, mintScrubSalt } from '../lib/session-secrets'
import type { Config } from '../lib/types'
import defaultConfig from '../config/default-config.json' with { type: 'json' }

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SEED = 1337
const NOPE_WINDOW_MS = 5000
const SESSION_TIMEOUT_MS = 5 * 60 * 1000
const IDLE_DURATION_MS = 65_000 // ≥ 2 server ping cycles (30s each)

function mintRoomCode(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  let code = 'HBT' // visually identifiable in logs
  for (let i = 0; i < 3; i++) code += chars[Math.floor(Math.random() * chars.length)]!
  return code
}

// ---------------------------------------------------------------------------
// Ping-counting WebSocket wrapper
// ---------------------------------------------------------------------------

/**
 * Wrap a real `ws` WebSocket so the smoke can observe inbound `ping`
 * messages without intercepting the god subscriber's own handlers.
 * Both the smoke's listener AND the subscriber's listener fire; ws
 * emitter calls every registered handler in registration order.
 */
function makeCountingWsFactory(token: string): {
  factory: (url: string) => WebSocketLike
  pingCount: () => number
} {
  let pingCount = 0

  const factory = (url: string): WebSocketLike => {
    const origin = buildLanOriginFromWsUrl(url)
    const ws = new WebSocket(url, { headers: { Origin: origin } })

    ws.on('message', (data) => {
      try {
        const parsed = JSON.parse(String(data)) as { type?: string }
        if (parsed.type === 'ping') pingCount++
      } catch {
        // smoke counter best-effort; subscriber's listener does the real work
      }
    })

    void token // referenced for closure capture (helpful in stack traces)
    return ws as unknown as WebSocketLike
  }

  return { factory, pingCount: () => pingCount }
}

// ---------------------------------------------------------------------------
// Assertion helper
// ---------------------------------------------------------------------------

interface AssertionResult {
  readonly name: string
  readonly ok: boolean
  readonly detail?: string
}

const failures: AssertionResult[] = []
function assert(name: string, ok: boolean, detail?: string): void {
  const result: AssertionResult = { name, ok, ...(detail ? { detail } : {}) }
  if (ok) {
    // eslint-disable-next-line no-console
    console.log(`  [pass] ${name}${detail ? ` — ${detail}` : ''}`)
  } else {
    failures.push(result)
    // eslint-disable-next-line no-console
    console.log(`  [FAIL] ${name}${detail ? ` — ${detail}` : ''}`)
  }
}

/**
 * Resolves true if `promise` is still pending after `ms`. Resolves false if
 * `promise` settled (resolved or rejected) within the window.
 */
async function isStillPending<T>(promise: Promise<T>, ms: number): Promise<boolean> {
  const sentinel = Symbol('still-pending')
  const winner = await Promise.race([
    promise.then(() => 'settled' as const).catch(() => 'settled' as const),
    delay(ms).then(() => sentinel),
  ])
  return winner === sentinel
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function buildConfig(roomCode: string): Config {
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
    seatNames: ['Heartbeat1', 'Heartbeat2'],
    seed: SEED,
    nopeWindowMs: NOPE_WINDOW_MS,
    sessionTimeoutMs: SESSION_TIMEOUT_MS,
    roomCode,
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

  const roomCode = mintRoomCode()
  log(`phase6-heartbeat-smoke: starting (room=${roomCode}, idleMs=${IDLE_DURATION_MS})`)

  const config = buildConfig(roomCode)
  const token = mintPlaytestToken()
  const scrubSalt = mintScrubSalt()

  // Use a tmp eventsJsonl path so we don't pollute the runs/ tree.
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'phase6-heartbeat-smoke-'))
  const eventsJsonlPath = path.join(tmpDir, 'events.jsonl')

  let servers = null as Awaited<ReturnType<typeof startServers>> | null
  let god = null as Awaited<ReturnType<typeof connectGod>> | null

  try {
    log('[heartbeat-smoke] booting wrangler + vite')
    const startedAt = Date.now()
    servers = await startServers(config, token)
    log(`[heartbeat-smoke] servers up in ${Date.now() - startedAt}ms`)

    log('[heartbeat-smoke] connecting god subscriber')
    const wsUrl = `ws://127.0.0.1:8787/parties/game-room/${encodeURIComponent(roomCode)}`
    const { factory, pingCount } = makeCountingWsFactory(token)
    god = await connectGod({
      wsUrl,
      token,
      seed: config.seed,
      nopeWindowMs: config.nopeWindowMs,
      scrubMode: config.scrubMode,
      scrubSalt,
      eventsJsonlPath,
      godReassemblyTimeoutMs: config.godReassemblyTimeoutMs,
      wsFactory: factory,
    })
    log('[heartbeat-smoke] god connected')

    // Idle for IDLE_DURATION_MS while the server's 30s heartbeat ticks.
    // We log progress every 15s so the operator sees the smoke is alive.
    const tickInterval = 15_000
    const tickCount = Math.floor(IDLE_DURATION_MS / tickInterval)
    const remainder = IDLE_DURATION_MS - tickCount * tickInterval
    for (let i = 0; i < tickCount; i++) {
      await delay(tickInterval)
      const elapsed = (i + 1) * tickInterval
      log(`[heartbeat-smoke] idle progress ${elapsed}ms / ${IDLE_DURATION_MS}ms (pings observed: ${pingCount()})`)
    }
    if (remainder > 0) await delay(remainder)

    // ---- Assertions ------------------------------------------------------
    log('')
    log('=== Heartbeat assertions ===')

    const stillPending = await isStillPending(god.onFatalClose, 100)
    assert(
      'god.onFatalClose still pending after idle (no fatal close)',
      stillPending,
      stillPending ? `idled ${IDLE_DURATION_MS}ms cleanly` : 'fatal close fired during idle',
    )

    const observedPings = pingCount()
    assert(
      'server sent ≥2 ping messages during idle',
      observedPings >= 2,
      `${observedPings} ping(s) observed (presence-of-presence companion)`,
    )

    log('')
    log('[heartbeat-smoke] disconnecting god')
    await god.disconnect()
    god = null
    log('[heartbeat-smoke] god disconnected cleanly')
    assert('god.disconnect() returned without throwing', true)
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[heartbeat-smoke] threw:', err)
    assert('smoke ran without throwing', false, err instanceof Error ? err.message : String(err))
  } finally {
    if (god !== null) {
      try {
        await god.disconnect()
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[heartbeat-smoke] god.disconnect failed in finally:', err)
      }
    }
    if (servers !== null) {
      try {
        log('[heartbeat-smoke] stopping servers')
        await stopServers(servers)
        log('[heartbeat-smoke] servers stopped')
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[heartbeat-smoke] stopServers failed in finally:', err)
        assert('stopServers succeeded', false, err instanceof Error ? err.message : String(err))
      }
    }
    // Clean up tmp dir best-effort.
    try {
      await fs.rm(tmpDir, { recursive: true, force: true })
    } catch {
      /* best-effort */
    }
  }

  log('')
  log('========================================')
  if (failures.length === 0) {
    log('Phase 6 heartbeat smoke: PASS')
    log('========================================')
    return 0
  }
  log(`Phase 6 heartbeat smoke: FAIL (${failures.length} assertion(s))`)
  for (const f of failures) {
    log(`  - ${f.name}${f.detail ? ` — ${f.detail}` : ''}`)
  }
  log('========================================')
  return 1
}

main()
  .then((code) => process.exit(code))
  .catch((err: unknown) => {
    // eslint-disable-next-line no-console
    console.error('[heartbeat-smoke] top-level threw:', err)
    process.exit(1)
  })
