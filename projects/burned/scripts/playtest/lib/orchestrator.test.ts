/**
 * Unit 6 tests — orchestrator.runSession glue.
 *
 * All 13 scenarios from the plan-prompt, driven via injected deps. No live
 * servers, no live WebSockets, no Playwright browser launch. Each test
 * pins one guarantee (step order, token identity, teardown discipline,
 * retention non-fatal, token leak defense, 4005 retry-once).
 *
 * Uses real `createRunDirectory` + `writeSessionStart` + `appendSessionEnd`
 * against a tmpdir so the happy path exercises Unit 2's I/O; only the
 * outward-facing deps (servers, god, browser, seats, retention) are stubbed.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import * as os from 'node:os'
import { randomUUID } from 'node:crypto'
import type { Browser } from '@playwright/test'

import { runSession, buildGodWsUrl, defaultReadSelftestStamp, type RunSessionDeps, type CreateSeatArgs } from './orchestrator'
import type { Config, SeatHandle } from './types'
import type { ServerHandles } from './server-controller'
import type { GodHandle, FatalCloseInfo, ConnectGodArgs } from './god-subscriber'
import type { RetentionResult } from './retention'
import type { FireRecord, ParsedScenario, InfoGap } from './scenario-detector'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

let tmpRoot: string
let catalogPath: string

beforeEach(async () => {
  tmpRoot = path.join(os.tmpdir(), `burned-orch-${randomUUID()}`)
  await fs.mkdir(tmpRoot, { recursive: true })
  catalogPath = path.join(tmpRoot, 'SCENARIOS.md')
  await fs.writeFile(catalogPath, '# scenarios\n', 'utf8')
})

afterEach(async () => {
  await fs.rm(tmpRoot, { recursive: true, force: true })
})

function makeConfig(overrides: Partial<Config> = {}): Config {
  return {
    seats: 3,
    seatNames: ['Dash', 'Vera', 'Sable'],
    seed: 42,
    nopeWindowMs: 5000,
    sessionTimeoutMs: 180_000,
    roomCode: 'ABCD',
    catalogPath,
    outputRoot: tmpRoot,
    viewports: [{ width: 390, height: 844, label: '390x844' }],
    freePlayWallclockFraction: 0.2,
    sessionDirRetention: 10,
    scrubMode: 'on',
    godReassemblyTimeoutMs: 5000,
    ...overrides,
  }
}

interface SpyLog {
  events: string[]
}

/**
 * Build a suite of deps that trace call order into a shared log. Every dep
 * resolves by default; individual tests override specific entries.
 */
function buildHappyDeps(log: SpyLog): {
  deps: RunSessionDeps
  spies: {
    mintToken: ReturnType<typeof vi.fn>
    mintSalt: ReturnType<typeof vi.fn>
    startServers: ReturnType<typeof vi.fn>
    stopServers: ReturnType<typeof vi.fn>
    connectGod: ReturnType<typeof vi.fn>
    createBrowser: ReturnType<typeof vi.fn>
    createSeat: ReturnType<typeof vi.fn>
    applyRetention: ReturnType<typeof vi.fn>
    readSelftestStamp: ReturnType<typeof vi.fn>
    seatDriver: ReturnType<typeof vi.fn>
  }
} {
  const MINTED_TOKEN = 'a'.repeat(64)
  const MINTED_SALT = 'b'.repeat(64)

  const fakeServerHandles: ServerHandles = {
    wranglerPid: 111,
    vitePid: 222,
    healthUrl: 'http://localhost:8787/health',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _wrangler: {} as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _vite: {} as any,
    _stopped: false,
  }

  const fakeGod: GodHandle = {
    disconnect: async () => {
      log.events.push('god.disconnect')
    },
    // Never resolves — happy path never fatally closes.
    onFatalClose: new Promise<FatalCloseInfo>(() => {
      /* pending forever */
    }),
  }

  const fakeBrowser = {
    close: async () => {
      log.events.push('browser.close')
    },
  } as unknown as Browser

  const mintToken = vi.fn(() => {
    log.events.push('mintToken')
    return MINTED_TOKEN
  })
  const mintSalt = vi.fn(() => {
    log.events.push('mintSalt')
    return MINTED_SALT
  })
  const startServers = vi.fn(async () => {
    log.events.push('startServers')
    return fakeServerHandles
  })
  const stopServers = vi.fn(async () => {
    log.events.push('stopServers')
  })
  const connectGod = vi.fn(async () => {
    log.events.push('connectGod')
    return fakeGod
  })
  const createBrowser = vi.fn(async () => {
    log.events.push('createBrowser')
    return fakeBrowser
  })
  const createSeat = vi.fn(async (args: CreateSeatArgs) => {
    log.events.push(`createSeat:${args.seatId}`)
    const contextClose = (): Promise<void> => {
      log.events.push(`seat.close:${args.seatId}`)
      return Promise.resolve()
    }
    const seat: SeatHandle = {
      seatId: args.seatId,
      seatName: args.seatName,
      roomCode: args.roomCode,
      // Playwright page duck-typed: .context().close()
      page: {
        context: () => ({ close: contextClose }),
      },
      viewport: args.viewport,
      logPath: path.join(args.runPaths.seatsDir, `${args.seatId}.log.md`),
      suspicionPath: path.join(args.runPaths.suspicionsDir, `${args.seatId}.suspicions.md`),
      scenariosPath: 'docs/testing/playtest/SCENARIOS.md',
    }
    return seat
  })
  const applyRetention = vi.fn(async (): Promise<RetentionResult> => {
    log.events.push('applyRetention')
    return { kept: [], rotated: [], skipped: [] }
  })
  const readSelftestStamp = vi.fn(async () => ({
    timestamp: new Date().toISOString(),
    ageMs: 1000,
  }))
  const seatDriver = vi.fn(async () => {
    log.events.push('seatDriver')
  })

  const deps: RunSessionDeps = {
    mintToken,
    mintSalt,
    startServers,
    stopServers,
    connectGod,
    createBrowser,
    createSeat,
    applyRetention,
    readSelftestStamp,
    seatDriver,
    scheduleDelay: () => Promise.resolve(),
    logger: () => {
      /* quiet */
    },
  }

  return {
    deps,
    spies: {
      mintToken,
      mintSalt,
      startServers,
      stopServers,
      connectGod,
      createBrowser,
      createSeat,
      applyRetention,
      readSelftestStamp,
      seatDriver,
    },
  }
}

// ---------------------------------------------------------------------------
// 1. Happy path — step order
// ---------------------------------------------------------------------------

describe('runSession — happy path', () => {
  it('sequences deps: selftest → mint → servers → god → browser → seats → driver → teardown → retention', async () => {
    const log: SpyLog = { events: [] }
    const { deps } = buildHappyDeps(log)

    const result = await runSession(makeConfig(), deps)

    expect(result.outcome).toBe('success')
    expect(result.seatsJoined).toBe(3)

    // Relative order assertions.
    const idx = (name: string): number => log.events.indexOf(name)
    expect(idx('mintToken')).toBeGreaterThan(-1)
    expect(idx('mintToken')).toBeLessThan(idx('startServers'))
    expect(idx('startServers')).toBeLessThan(idx('connectGod'))
    expect(idx('connectGod')).toBeLessThan(idx('createBrowser'))
    expect(idx('createBrowser')).toBeLessThan(idx('createSeat:seat-1'))
    expect(idx('createSeat:seat-1')).toBeLessThan(idx('createSeat:seat-2'))
    expect(idx('createSeat:seat-2')).toBeLessThan(idx('createSeat:seat-3'))
    expect(idx('createSeat:seat-3')).toBeLessThan(idx('seatDriver'))
    expect(idx('seatDriver')).toBeLessThan(idx('seat.close:seat-3'))
    // Seats close in reverse order.
    expect(idx('seat.close:seat-3')).toBeLessThan(idx('seat.close:seat-2'))
    expect(idx('seat.close:seat-2')).toBeLessThan(idx('seat.close:seat-1'))
    expect(idx('seat.close:seat-1')).toBeLessThan(idx('god.disconnect'))
    expect(idx('god.disconnect')).toBeLessThan(idx('browser.close'))
    expect(idx('browser.close')).toBeLessThan(idx('stopServers'))
    expect(idx('stopServers')).toBeLessThan(idx('applyRetention'))
  })

  it('writes session.md start + end blocks and leaves events.jsonl path reported', async () => {
    const log: SpyLog = { events: [] }
    const { deps } = buildHappyDeps(log)

    const result = await runSession(makeConfig(), deps)

    const sessionMd = path.join(result.runDir, 'session.md')
    const content = await fs.readFile(sessionMd, 'utf8')
    expect(content).toContain('## Session Start')
    expect(content).toContain('## Session End')
    expect(content).toMatch(/outcome:\s*success/i)

    expect(result.eventsJsonlPath).toBe(path.join(result.runDir, 'server', 'events.jsonl'))
  })
})

// ---------------------------------------------------------------------------
// 2. Token identity invariant
// ---------------------------------------------------------------------------

describe('runSession — token identity invariant', () => {
  it('passes the SAME token string to startServers and connectGod', async () => {
    const log: SpyLog = { events: [] }
    const { deps, spies } = buildHappyDeps(log)

    await runSession(makeConfig(), deps)

    const startServersToken = spies.startServers.mock.calls[0]![1]
    const connectGodToken = (spies.connectGod.mock.calls[0]![0] as ConnectGodArgs).token
    expect(startServersToken).toBe(connectGodToken)
    expect(typeof startServersToken).toBe('string')
    expect(startServersToken.length).toBe(64)
  })
})

// ---------------------------------------------------------------------------
// 3. Salt identity — minted value reaches connectGod
// ---------------------------------------------------------------------------

describe('runSession — salt plumbing', () => {
  it('passes the minted salt string verbatim to connectGod.scrubSalt', async () => {
    const log: SpyLog = { events: [] }
    const { deps, spies } = buildHappyDeps(log)

    await runSession(makeConfig(), deps)

    const saltReturned = spies.mintSalt.mock.results[0]!.value as string
    const connectGodSalt = (spies.connectGod.mock.calls[0]![0] as ConnectGodArgs).scrubSalt
    expect(connectGodSalt).toBe(saltReturned)
  })
})

// ---------------------------------------------------------------------------
// 4. Stale selftest
// ---------------------------------------------------------------------------

describe('runSession — selftest gate', () => {
  it('aborts with aborted-stale-selftest when stamp is 25h old', async () => {
    const log: SpyLog = { events: [] }
    const { deps, spies } = buildHappyDeps(log)
    deps.readSelftestStamp = async () => ({
      timestamp: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
      ageMs: 25 * 60 * 60 * 1000,
    })

    const result = await runSession(makeConfig(), deps)

    expect(result.outcome).toBe('aborted-stale-selftest')
    expect(spies.mintToken).not.toHaveBeenCalled()
    expect(spies.startServers).not.toHaveBeenCalled()
  })

  it('aborts when stamp is absent (null)', async () => {
    const log: SpyLog = { events: [] }
    const { deps, spies } = buildHappyDeps(log)
    deps.readSelftestStamp = async () => null

    const result = await runSession(makeConfig(), deps)

    expect(result.outcome).toBe('aborted-stale-selftest')
    expect(spies.mintToken).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// 5. skipSelftestGate
// ---------------------------------------------------------------------------

describe('runSession — skipSelftestGate', () => {
  it('proceeds when skipSelftestGate is true even with stale stamp', async () => {
    const log: SpyLog = { events: [] }
    const { deps, spies } = buildHappyDeps(log)
    deps.readSelftestStamp = async () => ({
      timestamp: 'ancient',
      ageMs: 9999 * 60 * 60 * 1000,
    })

    const result = await runSession(makeConfig(), deps, { skipSelftestGate: true })

    expect(result.outcome).toBe('success')
    expect(spies.mintToken).toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// 6. startServers fails
// ---------------------------------------------------------------------------

describe('runSession — startServers failure', () => {
  it('returns outcome=error, skips stopServers (no handles), still runs retention', async () => {
    const log: SpyLog = { events: [] }
    const { deps, spies } = buildHappyDeps(log)
    deps.startServers = vi.fn(async () => {
      throw new Error('wrangler died')
    })

    const result = await runSession(makeConfig(), deps)

    expect(result.outcome).toBe('error')
    expect(result.errorMessage).toMatch(/startServers failed.*wrangler died/)
    // stopServers was NOT called because we never got handles back — that's
    // correct behavior. Retention STILL runs.
    expect(spies.stopServers).not.toHaveBeenCalled()
    expect(spies.applyRetention).toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// 7. connectGod rejects — config locked
// ---------------------------------------------------------------------------

describe('runSession — connectGod config-locked', () => {
  it('classifies PLAYTEST_CONFIG_LOCKED as aborted-config-locked', async () => {
    const log: SpyLog = { events: [] }
    const { deps, spies } = buildHappyDeps(log)
    deps.connectGod = vi.fn(async () => {
      throw new Error('playtest-config rejected: PLAYTEST_CONFIG_LOCKED')
    })

    const result = await runSession(makeConfig(), deps)

    expect(result.outcome).toBe('aborted-config-locked')
    expect(spies.stopServers).toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// 8. Fatal close during seat-driver
// ---------------------------------------------------------------------------

describe('runSession — fatal close during seat-driver', () => {
  it('races fatal-close against seat-driver, aborts, tears down all layers', async () => {
    const log: SpyLog = { events: [] }
    const { deps, spies } = buildHappyDeps(log)

    // Build a god handle whose onFatalClose resolves after 10ms.
    deps.connectGod = vi.fn(async () => {
      const onFatalClose = new Promise<FatalCloseInfo>((resolve) => {
        setTimeout(() => {
          resolve({ code: 4004, reason: 'playtest mode off', retriable: false })
        }, 10)
      })
      return {
        disconnect: async () => {
          log.events.push('god.disconnect')
        },
        onFatalClose,
      }
    })

    // Long-running driver — wait 1s so the fatal beats it.
    deps.seatDriver = vi.fn(async () => {
      await new Promise<void>((r) => setTimeout(r, 1000))
    })

    const result = await runSession(makeConfig(), deps)

    expect(result.outcome).toBe('aborted-fatal-close')
    expect(result.errorMessage).toMatch(/4004/)
    // All teardown still runs.
    expect(log.events).toContain('seat.close:seat-3')
    expect(log.events).toContain('seat.close:seat-2')
    expect(log.events).toContain('seat.close:seat-1')
    expect(log.events).toContain('god.disconnect')
    expect(spies.stopServers).toHaveBeenCalled()

    // End block includes the outcome.
    const content = await fs.readFile(path.join(result.runDir, 'session.md'), 'utf8')
    expect(content).toMatch(/aborted-fatal-close/)
  })
})

// ---------------------------------------------------------------------------
// 9. 4005 retry-once (first retries, second aborts)
// ---------------------------------------------------------------------------

describe('runSession — 4005 retry-once', () => {
  it('backs off 60s on first 4005, aborts on second', async () => {
    const log: SpyLog = { events: [] }
    const { deps } = buildHappyDeps(log)

    const connectSpy = vi.fn(async (_args: ConnectGodArgs) => {
      const onFatalClose = Promise.resolve<FatalCloseInfo>({
        code: 4005,
        reason: 'rate-limited',
        retriable: true,
      })
      return {
        disconnect: async () => {},
        onFatalClose,
      }
    })
    deps.connectGod = connectSpy
    const delaySpy = vi.fn((_ms: number) => Promise.resolve())
    deps.scheduleDelay = delaySpy

    const result = await runSession(makeConfig(), deps)

    expect(result.outcome).toBe('aborted-fatal-close')
    expect(connectSpy).toHaveBeenCalledTimes(2)
    // 60_000ms backoff used exactly once.
    expect(delaySpy).toHaveBeenCalledTimes(1)
    expect(delaySpy.mock.calls[0]![0]).toBe(60_000)
  })
})

// ---------------------------------------------------------------------------
// 10. Retry uses the SAME token
// ---------------------------------------------------------------------------

describe('runSession — retry token identity', () => {
  it('second connectGod call receives the same token as the first', async () => {
    const log: SpyLog = { events: [] }
    const { deps } = buildHappyDeps(log)

    const connectSpy = vi.fn(async (_args: ConnectGodArgs) => {
      const onFatalClose = Promise.resolve<FatalCloseInfo>({
        code: 4005,
        reason: 'rate-limited',
        retriable: true,
      })
      return {
        disconnect: async () => {},
        onFatalClose,
      }
    })
    deps.connectGod = connectSpy
    deps.scheduleDelay = () => Promise.resolve()

    await runSession(makeConfig(), deps)

    const firstToken = connectSpy.mock.calls[0]![0].token
    const secondToken = connectSpy.mock.calls[1]![0].token
    expect(firstToken).toBe(secondToken)
  })
})

// ---------------------------------------------------------------------------
// 11. Teardown on createSeat failure
// ---------------------------------------------------------------------------

describe('runSession — createSeat mid-failure teardown', () => {
  it('closes already-created seats, disconnects god, stops servers', async () => {
    const log: SpyLog = { events: [] }
    const { deps, spies } = buildHappyDeps(log)

    const happyCreate = deps.createSeat!
    let callIdx = 0
    deps.createSeat = vi.fn(async (args: CreateSeatArgs) => {
      callIdx++
      if (callIdx === 3) {
        throw new Error('third seat boom')
      }
      return happyCreate(args)
    })

    const result = await runSession(makeConfig(), deps)

    expect(result.outcome).toBe('error')
    // Seats 1 and 2 were created; both should close during teardown.
    expect(log.events).toContain('seat.close:seat-2')
    expect(log.events).toContain('seat.close:seat-1')
    expect(log.events).not.toContain('seat.close:seat-3')
    expect(spies.stopServers).toHaveBeenCalled()
    expect(spies.applyRetention).toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// 12. scrubMode flag plumbing
// ---------------------------------------------------------------------------

describe('runSession — scrubMode plumbing', () => {
  it("passes scrubMode='off' through to connectGod", async () => {
    const log: SpyLog = { events: [] }
    const { deps, spies } = buildHappyDeps(log)

    await runSession(makeConfig({ scrubMode: 'off' }), deps)

    const args = spies.connectGod.mock.calls[0]![0] as ConnectGodArgs
    expect(args.scrubMode).toBe('off')
  })
})

// ---------------------------------------------------------------------------
// 13. Retention failure is non-fatal
// ---------------------------------------------------------------------------

describe('runSession — retention non-fatal', () => {
  it('does not downgrade outcome when applyRetention rejects', async () => {
    const log: SpyLog = { events: [] }
    const { deps } = buildHappyDeps(log)

    deps.applyRetention = async () => {
      throw new Error('ENOSPC')
    }

    const result = await runSession(makeConfig(), deps)

    expect(result.outcome).toBe('success')
  })
})

// ---------------------------------------------------------------------------
// 14. Token-leak defense: errorMessage never contains the minted token
// ---------------------------------------------------------------------------

describe('runSession — token-leak defense', () => {
  it('never interpolates the raw token into SessionResult.errorMessage', async () => {
    const log: SpyLog = { events: [] }
    const { deps } = buildHappyDeps(log)

    const leakyToken = 'deadbeef'.repeat(8) // 64 hex chars
    deps.mintToken = () => leakyToken

    deps.startServers = async () => {
      throw new Error(`boom token=${leakyToken} leaking everywhere`)
    }

    const result = await runSession(makeConfig(), deps)

    expect(result.outcome).toBe('error')
    expect(result.errorMessage).toBeDefined()
    expect(result.errorMessage).not.toContain(leakyToken)
    expect(result.errorMessage).toContain('<REDACTED_TOKEN>')
  })
})

// ---------------------------------------------------------------------------
// buildGodWsUrl helper
// ---------------------------------------------------------------------------

describe('buildGodWsUrl', () => {
  it('produces ws://127.0.0.1:8787/parties/game-room/<ROOM> for a simple room code', () => {
    expect(buildGodWsUrl('ABCD')).toBe('ws://127.0.0.1:8787/parties/game-room/ABCD')
  })

  it('URL-encodes room code defensively', () => {
    expect(buildGodWsUrl('A B')).toBe('ws://127.0.0.1:8787/parties/game-room/A%20B')
  })
})

// ---------------------------------------------------------------------------
// Phase 5 Unit 6 — runPostSessionTriage hook
// ---------------------------------------------------------------------------

describe('runSession — runPostSessionTriage hook (Phase 5 Unit 6)', () => {
  it('invokes the hook with runDir + paths after appendSessionEnd', async () => {
    const log: SpyLog = { events: [] }
    const { deps } = buildHappyDeps(log)
    let captured: {
      runDir?: string
      eventsJsonlPath?: string
      connectionsJsonlPath?: string
      catalogPath?: string
      isolationStatus?: string
    } | null = null
    const triageHook = async (input: unknown) => {
      captured = input as typeof captured
      return { seedCount: 3, specCount: 3, indexPath: '/tmp/INDEX.md' }
    }
    const result = await runSession(makeConfig(), {
      ...deps,
      runPostSessionTriage: triageHook,
    })
    expect(result.outcome).toBe('success')
    expect(captured).not.toBeNull()
    expect(captured!.runDir).toContain(tmpRoot)
    expect(captured!.eventsJsonlPath).toContain('events.jsonl')
    expect(captured!.connectionsJsonlPath).toContain('connections.jsonl')
    expect(captured!.catalogPath).toBe(catalogPath)
    expect(captured!.isolationStatus).toBe('OK')
  })

  it('logs skip reason when hook returns skipped result (mocked isolation breach)', async () => {
    const log: SpyLog = { events: [] }
    const { deps } = buildHappyDeps(log)
    const messages: string[] = []
    const triageHook = vi.fn(async () => ({
      skipped: 'isolation-breach' as const,
      seedCount: 0,
      specCount: 0,
    }))
    const result = await runSession(makeConfig(), {
      ...deps,
      runPostSessionTriage: triageHook,
      logger: (m: string) => messages.push(m),
    })
    expect(result.outcome).toBe('success')
    expect(triageHook).toHaveBeenCalledTimes(1)
    expect(messages.some((m) => m.includes('triage skipped: isolation-breach'))).toBe(true)
  })

  it('logs zero-seed skip when hook returns skipped="no-seeds"', async () => {
    const log: SpyLog = { events: [] }
    const { deps } = buildHappyDeps(log)
    const messages: string[] = []
    const triageHook = vi.fn(async () => ({
      skipped: 'no-seeds' as const,
      seedCount: 0,
      specCount: 0,
    }))
    const result = await runSession(makeConfig(), {
      ...deps,
      runPostSessionTriage: triageHook,
      logger: (m: string) => messages.push(m),
    })
    expect(result.outcome).toBe('success')
    expect(messages.some((m) => m.includes('triage skipped: no-seeds'))).toBe(true)
  })

  it('hook failure is non-fatal — session still resolves success and runs retention', async () => {
    const log: SpyLog = { events: [] }
    const { deps, spies } = buildHappyDeps(log)
    const triageHook = vi.fn(async () => {
      throw new Error('triage exploded')
    })
    const result = await runSession(makeConfig(), {
      ...deps,
      runPostSessionTriage: triageHook,
    })
    expect(result.outcome).toBe('success')
    expect(spies.applyRetention).toHaveBeenCalled()
  })

  it('absent hook is a no-op — session proceeds normally', async () => {
    const log: SpyLog = { events: [] }
    const { deps } = buildHappyDeps(log)
    // No runPostSessionTriage in deps; default behaviour.
    const result = await runSession(makeConfig(), deps)
    expect(result.outcome).toBe('success')
  })
})

// ---------------------------------------------------------------------------
// defaultReadSelftestStamp — Phase 6 Unit 3 calibration regression
// ---------------------------------------------------------------------------
//
// `scripts/playtest/selftest.ts:writeStamp` writes a TWO-line stamp:
//   line 1: plain ISO timestamp (the contract this reader honors)
//   line 2: JSON `{ts, ...}` for forward-compat metadata
//
// Pre-fix, defaultReadSelftestStamp called `.trim()` on the whole file and
// fed the multi-line string straight to `Date.parse`, returning NaN — the
// orchestrator then aborted with "stamp absent" against a freshly-written
// stamp. Caught during Phase 6 Unit 3 calibration first-real-run attempt
// 2026-04-25; phase6-launcher-smoke had mocked readSelftestStamp so the
// default reader was never exercised.

describe('defaultReadSelftestStamp', () => {
  let cwdBefore: string
  let stampDir: string

  beforeEach(async () => {
    stampDir = path.join(os.tmpdir(), `burned-stamp-${randomUUID()}`)
    await fs.mkdir(stampDir, { recursive: true })
    cwdBefore = process.cwd()
    process.chdir(stampDir)
  })

  afterEach(async () => {
    process.chdir(cwdBefore)
    await fs.rm(stampDir, { recursive: true, force: true })
  })

  it('parses the dual-line stamp format (ISO line 1 + JSON line 2) written by selftest.ts', async () => {
    const ts = new Date().toISOString()
    await fs.writeFile('.last-selftest', `${ts}\n{"ts":"${ts}"}\n`, 'utf8')
    const result = await defaultReadSelftestStamp()
    expect(result).not.toBeNull()
    expect(result!.timestamp).toBe(ts)
    expect(result!.ageMs).toBeGreaterThanOrEqual(0)
    expect(result!.ageMs).toBeLessThan(60_000)
  })

  it('parses a plain single-line ISO stamp (legacy / future writers)', async () => {
    const ts = new Date().toISOString()
    await fs.writeFile('.last-selftest', `${ts}\n`, 'utf8')
    const result = await defaultReadSelftestStamp()
    expect(result).not.toBeNull()
    expect(result!.timestamp).toBe(ts)
  })

  it('handles CRLF line endings', async () => {
    const ts = new Date().toISOString()
    await fs.writeFile('.last-selftest', `${ts}\r\n{"ts":"${ts}"}\r\n`, 'utf8')
    const result = await defaultReadSelftestStamp()
    expect(result).not.toBeNull()
    expect(result!.timestamp).toBe(ts)
  })

  it('returns null when the file is absent', async () => {
    const result = await defaultReadSelftestStamp()
    expect(result).toBeNull()
  })

  it('returns null when line 1 is not a parseable ISO timestamp', async () => {
    await fs.writeFile('.last-selftest', `not-an-iso\n{"ts":"2026-01-01T00:00:00Z"}\n`, 'utf8')
    const result = await defaultReadSelftestStamp()
    expect(result).toBeNull()
  })

  it('returns null when the file is empty', async () => {
    await fs.writeFile('.last-selftest', '', 'utf8')
    const result = await defaultReadSelftestStamp()
    expect(result).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Phase 6 Unit 2.6 — launchBoardView wiring
//
// The orchestrator gained a `launchBoardView` opt + dep so that under
// Option A (`skipBrowserLaunch: true`) something dispatches a board client
// that taps "Cleared Hot." Insight 032 captured the gap. These tests pin
// the wiring's contract: invoked when opt true, skipped when false; close
// runs in the right teardown order; sync launch failure is fatal; async
// `started` failure is logged-not-fatal.
// ---------------------------------------------------------------------------

describe('runSession — launchBoardView wiring (Phase 6 Unit 2.6)', () => {
  function buildBoardViewDeps(log: SpyLog) {
    const { deps } = buildHappyDeps(log)
    const close = vi.fn(async () => {
      log.events.push('boardView.close')
    })
    let resolveStarted!: () => void
    const started = new Promise<void>((r) => {
      resolveStarted = r
    })
    const launchBoardView = vi.fn(async () => {
      log.events.push('launchBoardView')
      // Resolve `started` on the next tick so race ordering is observable.
      Promise.resolve().then(resolveStarted)
      return { started, close }
    })
    return {
      deps: { ...deps, launchBoardView },
      launchBoardView,
      close,
    }
  }

  it('does NOT invoke launchBoardView when opt is false / omitted (default)', async () => {
    const log: SpyLog = { events: [] }
    const { deps, launchBoardView, close } = buildBoardViewDeps(log)

    const result = await runSession(makeConfig(), deps)

    expect(result.outcome).toBe('success')
    expect(launchBoardView).not.toHaveBeenCalled()
    expect(close).not.toHaveBeenCalled()
    expect(log.events).not.toContain('launchBoardView')
    expect(log.events).not.toContain('boardView.close')
  })

  it('invokes launchBoardView when opt is true; close runs in finalize', async () => {
    const log: SpyLog = { events: [] }
    const { deps, launchBoardView, close } = buildBoardViewDeps(log)

    const result = await runSession(makeConfig(), deps, { launchBoardView: true })

    expect(result.outcome).toBe('success')
    expect(launchBoardView).toHaveBeenCalledTimes(1)
    expect(close).toHaveBeenCalledTimes(1)
  })

  it('forwards roomCode + default vite URL to launchBoardView', async () => {
    const log: SpyLog = { events: [] }
    const { deps, launchBoardView } = buildBoardViewDeps(log)

    await runSession(makeConfig({ roomCode: 'PARTY' }), deps, { launchBoardView: true })

    expect(launchBoardView).toHaveBeenCalledTimes(1)
    const calls = launchBoardView.mock.calls as unknown as Array<[{ roomCode: string; viteBaseUrl: string }]>
    expect(calls[0]![0].roomCode).toBe('PARTY')
    expect(calls[0]![0].viteBaseUrl).toBe('http://localhost:5173')
  })

  it('honors boardViewViteBaseUrl override', async () => {
    const log: SpyLog = { events: [] }
    const { deps, launchBoardView } = buildBoardViewDeps(log)

    await runSession(makeConfig(), deps, {
      launchBoardView: true,
      boardViewViteBaseUrl: 'http://localhost:5175',
    })

    const calls = launchBoardView.mock.calls as unknown as Array<[{ viteBaseUrl: string }]>
    expect(calls[0]![0].viteBaseUrl).toBe('http://localhost:5175')
  })

  it('defaults waitForStartTimeoutMs to config.sessionTimeoutMs (insight 033)', async () => {
    const log: SpyLog = { events: [] }
    const { deps, launchBoardView } = buildBoardViewDeps(log)

    await runSession(
      makeConfig({ sessionTimeoutMs: 900_000 }),
      deps,
      { launchBoardView: true },
    )

    const calls = launchBoardView.mock.calls as unknown as Array<[{ waitForStartTimeoutMs: number }]>
    expect(calls[0]![0].waitForStartTimeoutMs).toBe(900_000)
  })

  it('honors boardViewWaitForStartTimeoutMs override', async () => {
    const log: SpyLog = { events: [] }
    const { deps, launchBoardView } = buildBoardViewDeps(log)

    await runSession(
      makeConfig({ sessionTimeoutMs: 900_000 }),
      deps,
      {
        launchBoardView: true,
        boardViewWaitForStartTimeoutMs: 30_000,
      },
    )

    const calls = launchBoardView.mock.calls as unknown as Array<[{ waitForStartTimeoutMs: number }]>
    expect(calls[0]![0].waitForStartTimeoutMs).toBe(30_000)
  })

  it('launches AFTER seats are constructed and BEFORE seat-driver runs', async () => {
    const log: SpyLog = { events: [] }
    const { deps } = buildBoardViewDeps(log)

    await runSession(makeConfig(), deps, { launchBoardView: true })

    const idx = (name: string): number => log.events.indexOf(name)
    // Last seat created BEFORE board launches (so we have a valid roomCode).
    expect(idx('createSeat:seat-3')).toBeLessThan(idx('launchBoardView'))
    // Board launches BEFORE seat-driver kicks in.
    expect(idx('launchBoardView')).toBeLessThan(idx('seatDriver'))
  })

  it('closes boardView AFTER seats but BEFORE god/servers (board WS depends on wrangler)', async () => {
    const log: SpyLog = { events: [] }
    const { deps } = buildBoardViewDeps(log)

    await runSession(makeConfig(), deps, { launchBoardView: true })

    const idx = (name: string): number => log.events.indexOf(name)
    expect(idx('seat.close:seat-1')).toBeLessThan(idx('boardView.close'))
    expect(idx('boardView.close')).toBeLessThan(idx('god.disconnect'))
    expect(idx('god.disconnect')).toBeLessThan(idx('stopServers'))
  })

  it('aborts session with outcome=error when launchBoardView throws synchronously', async () => {
    const log: SpyLog = { events: [] }
    const { deps } = buildHappyDeps(log)
    const launchBoardView = vi.fn(async () => {
      throw new Error('chromium.launch failed: spawn ENOENT')
    })

    const result = await runSession(
      makeConfig(),
      { ...deps, launchBoardView },
      { launchBoardView: true },
    )

    expect(result.outcome).toBe('error')
    expect(result.errorMessage).toMatch(/launchBoardView failed/)
    expect(result.errorMessage).toMatch(/spawn ENOENT/)
    // Servers + god still torn down.
    expect(log.events).toContain('god.disconnect')
    expect(log.events).toContain('stopServers')
  })

  it('does NOT abort when boardView.started rejects asynchronously (logged-not-fatal)', async () => {
    const log: SpyLog = { events: [] }
    const logLines: string[] = []
    const { deps } = buildHappyDeps(log)
    const close = vi.fn(async () => {
      log.events.push('boardView.close')
    })
    const launchBoardView = vi.fn(async () => {
      const started = Promise.reject<void>(new Error('cleared-hot never appeared'))
      // Swallow at the source so the test runtime doesn't see an
      // unhandled-rejection (matches launchBoardView's real behavior).
      started.catch(() => {
        /* expected */
      })
      return { started, close }
    })

    const result = await runSession(
      makeConfig(),
      {
        ...deps,
        launchBoardView,
        logger: (m: string) => logLines.push(m),
      },
      { launchBoardView: true },
    )

    expect(result.outcome).toBe('success')
    // Allow the failure-log microtask to flush.
    await new Promise<void>((r) => setTimeout(r, 10))
    expect(
      logLines.some((l) => /board-view start sequence failed/i.test(l) && /cleared-hot never appeared/.test(l)),
    ).toBe(true)
    // Close still runs in finalize.
    expect(close).toHaveBeenCalledTimes(1)
  })

  it('boardView teardown failure is logged but does not throw', async () => {
    const log: SpyLog = { events: [] }
    const logLines: string[] = []
    const { deps } = buildHappyDeps(log)
    const close = vi.fn(async () => {
      throw new Error('close boom')
    })
    const launchBoardView = vi.fn(async () => ({
      started: Promise.resolve(),
      close,
    }))

    const result = await runSession(
      makeConfig(),
      {
        ...deps,
        launchBoardView,
        logger: (m: string) => logLines.push(m),
      },
      { launchBoardView: true },
    )

    expect(result.outcome).toBe('success')
    expect(close).toHaveBeenCalledTimes(1)
    expect(logLines.some((l) => /boardView close failed/i.test(l))).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Coverage wiring (Phase 6 — replaces stub coverage report)
// ---------------------------------------------------------------------------

const FULL_GAP: InfoGap = {
  SERVER:       { column1Present: true, column2Present: true },
  ACTOR:        { column1Present: true, column2Present: true },
  TARGET:       { column1Present: true, column2Present: true },
  OTHER_ALIVE:  { column1Present: true, column2Present: true },
  SPECTATOR:    { column1Present: true, column2Present: true },
  DISCONNECTED: { column1Present: true, column2Present: true },
  BOARD:        { column1Present: true, column2Present: true },
}

function fakeScenario(id: string): ParsedScenario {
  return {
    id,
    description: '',
    title: '',
    tier: 'other',
    events: [],
    shape: 'strict',
    infoGap: FULL_GAP,
  }
}

function fakeFire(id: string): FireRecord {
  return {
    scenarioId: id,
    firstEventIdx: 0,
    lastEventIdx: 0,
    nowMsRange: [0, 0],
    tier1: 'pass',
    tier2: 'n/a',
    tier3: 'n/a',
    matched: 'clean',
  }
}

describe('runSession — coverage wiring', () => {
  it('writes coverage.md with renderCoverageMd output (header + banner + grid)', async () => {
    const log: SpyLog = { events: [] }
    const { deps } = buildHappyDeps(log)
    const loadCatalog = vi.fn(async () => [
      fakeScenario('SCN-A'),
      fakeScenario('SCN-B'),
    ])
    const detectFires = vi.fn(async () => [fakeFire('SCN-A')])

    const result = await runSession(
      makeConfig({ coverageThreshold: 1 }),
      { ...deps, loadCatalog, detectFires },
    )
    expect(result.outcome).toBe('success')

    const md = await fs.readFile(path.join(result.runDir, 'coverage.md'), 'utf8')
    expect(md).toContain('# Coverage report')
    expect(md).toContain('Fired: 1 / target: 1')
    expect(md).toContain('## 7×2 info-gap grid')
    // Presence companion: the rendered grid actually counted SCN-A under
    // SERVER column 1.
    expect(md).toContain('SCN-A')
  })

  it('flows real fired count + threshold into session.md end block', async () => {
    const log: SpyLog = { events: [] }
    const { deps } = buildHappyDeps(log)
    const loadCatalog = vi.fn(async () => [
      fakeScenario('SCN-A'),
      fakeScenario('SCN-B'),
      fakeScenario('SCN-C'),
    ])
    const detectFires = vi.fn(async () => [
      fakeFire('SCN-A'),
      fakeFire('SCN-B'),
    ])

    const result = await runSession(
      makeConfig({ coverageThreshold: 6 }),
      { ...deps, loadCatalog, detectFires },
    )

    const sessionMd = await fs.readFile(
      path.join(result.runDir, 'session.md'),
      'utf8',
    )
    // session.md end-block carries the real numbers, not the old stub
    // (which would have rendered "fired 0 / threshold 50").
    expect(sessionMd).toContain('coverage: fired 2 / threshold 6')
  })

  it('passes config.coverageThreshold through to buildCoverageReport via the renderer', async () => {
    const log: SpyLog = { events: [] }
    const { deps } = buildHappyDeps(log)
    const loadCatalog = vi.fn(async () => [fakeScenario('SCN-A')])
    const detectFires = vi.fn(async () => [fakeFire('SCN-A')])

    const result = await runSession(
      makeConfig({ coverageThreshold: 6 }),
      { ...deps, loadCatalog, detectFires },
    )

    const md = await fs.readFile(path.join(result.runDir, 'coverage.md'), 'utf8')
    // 1 fire vs threshold 6 → primary gate fails, but custom threshold
    // shows up verbatim in the banner.
    expect(md).toContain('Fired: 1 / target: 6')
    expect(md).toContain('UNDER-COVERED')
    // Presence companion: the default threshold (50) is NOT used.
    expect(md).not.toContain('target: 50')
  })

  it('omitted coverageThreshold defaults to 50 in the rendered banner', async () => {
    const log: SpyLog = { events: [] }
    const { deps } = buildHappyDeps(log)
    const loadCatalog = vi.fn(async () => [fakeScenario('SCN-A')])
    const detectFires = vi.fn(async () => [fakeFire('SCN-A')])

    const result = await runSession(makeConfig(), {
      ...deps,
      loadCatalog,
      detectFires,
    })

    const md = await fs.readFile(path.join(result.runDir, 'coverage.md'), 'utf8')
    expect(md).toContain('Fired: 1 / target: 50')
  })

  it('loadCatalog throwing falls back to empty catalog (session still completes)', async () => {
    const log: SpyLog = { events: [] }
    const logLines: string[] = []
    const { deps } = buildHappyDeps(log)
    const loadCatalog = vi.fn(async () => {
      throw new Error('catalog parse boom')
    })
    const detectFires = vi.fn(async () => [fakeFire('SCN-A')])

    const result = await runSession(makeConfig(), {
      ...deps,
      loadCatalog,
      detectFires,
      logger: (m: string) => logLines.push(m),
    })

    expect(result.outcome).toBe('success')
    expect(logLines.some((l) => /loadCatalog failed/.test(l))).toBe(true)
    expect(logLines.some((l) => /catalog parse boom/.test(l))).toBe(true)
    // coverage.md still renders with zero-grid (empty catalog → no fires
    // credited even though detectFires returned one — buildCoverageReport
    // dedups against catalog membership).
    const md = await fs.readFile(path.join(result.runDir, 'coverage.md'), 'utf8')
    expect(md).toContain('# Coverage report')
  })

  it('detectFires throwing falls back to no-fires (session still completes)', async () => {
    const log: SpyLog = { events: [] }
    const logLines: string[] = []
    const { deps } = buildHappyDeps(log)
    const loadCatalog = vi.fn(async () => [fakeScenario('SCN-A')])
    const detectFires = vi.fn(async () => {
      throw new Error('events.jsonl corrupt')
    })

    const result = await runSession(makeConfig(), {
      ...deps,
      loadCatalog,
      detectFires,
      logger: (m: string) => logLines.push(m),
    })

    expect(result.outcome).toBe('success')
    expect(logLines.some((l) => /detectFires failed/.test(l))).toBe(true)
    const md = await fs.readFile(path.join(result.runDir, 'coverage.md'), 'utf8')
    expect(md).toContain('Fired: 0 / target: 50')
  })

  it('detectFires receives the real catalogPath + per-seat log paths', async () => {
    const log: SpyLog = { events: [] }
    const { deps } = buildHappyDeps(log)
    const loadCatalog = vi.fn(async () => [])
    const detectFires = vi.fn(async () => [])

    const cfg = makeConfig()
    await runSession(cfg, { ...deps, loadCatalog, detectFires })

    expect(detectFires).toHaveBeenCalledTimes(1)
    const [catalogPath, eventsJsonl, connectionsJsonl, seatLogPaths] =
      detectFires.mock.calls[0]!
    expect(catalogPath).toBe(cfg.catalogPath)
    expect(eventsJsonl).toMatch(/events\.jsonl$/)
    expect(connectionsJsonl).toMatch(/connections\.jsonl$/)
    expect(seatLogPaths).toHaveLength(3)
    // Presence companion: log paths point inside the run's seats/ dir.
    expect((seatLogPaths as readonly string[]).every((p) => p.includes('seats'))).toBe(true)
  })
})
