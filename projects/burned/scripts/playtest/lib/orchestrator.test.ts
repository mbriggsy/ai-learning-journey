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

import { runSession, buildGodWsUrl, type RunSessionDeps, type CreateSeatArgs } from './orchestrator'
import type { Config, SeatHandle } from './types'
import type { ServerHandles } from './server-controller'
import type { GodHandle, FatalCloseInfo, ConnectGodArgs } from './god-subscriber'
import type { RetentionResult } from './retention'

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
