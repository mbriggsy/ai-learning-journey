/**
 * Unit 3 tests — wrangler + vite subprocess lifecycle.
 *
 * Live subprocess spawning + live HTTP probes are covered by Unit 8 smoke.
 * This file stays in the pure-logic lane: env construction, token validation,
 * log-hygiene detection, healthcheck-poller branching, and stopServers
 * idempotency via injected spawn/fetch stubs.
 *
 * Security discipline: every error-path test asserts the token value is NOT
 * present in the thrown message.
 */
import { describe, it, expect, vi } from 'vitest'
import { EventEmitter } from 'node:events'
import type { ChildProcess } from 'node:child_process'
import {
  buildServerEnv,
  buildWranglerArgs,
  validatePlaytestToken,
  detectLogHygieneViolations,
  pollWranglerHealth,
  pollViteHealth,
  startServers,
  stopServers,
  type ServerHandles,
} from './server-controller'
import type { Config } from './types'

const VALID_TOKEN = 'a'.repeat(64) // 64 lowercase hex chars

function makeConfig(overrides: Partial<Config> = {}): Config {
  return {
    seats: 3,
    nopeWindowMs: 5000,
    sessionTimeoutMs: 180_000,
    catalogPath: '/tmp/dummy-catalog.md',
    outputRoot: '/tmp/dummy-out',
    viewports: [{ width: 390, height: 844, label: '390x844' }],
    freePlayWallclockFraction: 0.2,
    sessionDirRetention: 10,
    scrubMode: 'on',
    godReassemblyTimeoutMs: 5000,
    ...overrides,
  }
}

// -----------------------------------------------------------------------------
// buildServerEnv — pure. Defense-in-depth only: wrangler does NOT forward
// arbitrary Node process env into workerd bindings (the authoritative path
// is the --var CLI flags built by buildWranglerArgs). These tests verify
// the helper still constructs a correct-at-construction env map for
// Node-side consumers + dual-use tooling.
// -----------------------------------------------------------------------------

describe('buildServerEnv', () => {
  it('sets PLAYTEST_MODE=1 and PLAYTEST_TOKEN on the returned env', () => {
    const env = buildServerEnv(makeConfig(), VALID_TOKEN, {})
    expect(env.PLAYTEST_MODE).toBe('1')
    expect(env.PLAYTEST_TOKEN).toBe(VALID_TOKEN)
  })

  it('omits PLAYTEST_GOD_ORIGINS when godOriginAllowlist is undefined', () => {
    const env = buildServerEnv(makeConfig({ godOriginAllowlist: undefined }), VALID_TOKEN, {})
    expect('PLAYTEST_GOD_ORIGINS' in env).toBe(false)
  })

  it('omits PLAYTEST_GOD_ORIGINS when godOriginAllowlist is empty', () => {
    const env = buildServerEnv(makeConfig({ godOriginAllowlist: [] }), VALID_TOKEN, {})
    expect('PLAYTEST_GOD_ORIGINS' in env).toBe(false)
  })

  it('joins a non-empty godOriginAllowlist with commas', () => {
    const env = buildServerEnv(
      makeConfig({ godOriginAllowlist: ['https://a.example', 'https://b.example'] }),
      VALID_TOKEN,
      {},
    )
    expect(env.PLAYTEST_GOD_ORIGINS).toBe('https://a.example,https://b.example')
  })

  it('carries forward base env vars (does not overwrite unrelated keys)', () => {
    const env = buildServerEnv(makeConfig(), VALID_TOKEN, { FOO: 'bar', PATH: '/usr/bin' })
    expect(env.FOO).toBe('bar')
    expect(env.PATH).toBe('/usr/bin')
    expect(env.PLAYTEST_MODE).toBe('1')
  })
})

// -----------------------------------------------------------------------------
// buildWranglerArgs — pure. AUTHORITATIVE propagation path for PLAYTEST_*
// into workerd bindings. Must match phase2-smoke.ts shape.
// -----------------------------------------------------------------------------

describe('buildWranglerArgs', () => {
  it('emits the expected base flag sequence with --var PLAYTEST_MODE:1 and --var PLAYTEST_TOKEN:<t>', () => {
    const args = buildWranglerArgs(makeConfig(), VALID_TOKEN)
    expect(args).toEqual([
      'exec',
      'wrangler',
      'dev',
      '--ip',
      '0.0.0.0',
      '--port',
      '8787',
      '--var',
      'PLAYTEST_MODE:1',
      '--var',
      `PLAYTEST_TOKEN:${VALID_TOKEN}`,
    ])
  })

  it('appends --var PLAYTEST_GOD_ORIGINS:<joined> when allowlist is non-empty', () => {
    const args = buildWranglerArgs(
      makeConfig({ godOriginAllowlist: ['https://a.example', 'https://b.example'] }),
      VALID_TOKEN,
    )
    // Final two entries should be the god-origins flag pair.
    expect(args.slice(-2)).toEqual([
      '--var',
      'PLAYTEST_GOD_ORIGINS:https://a.example,https://b.example',
    ])
    // PLAYTEST_MODE and PLAYTEST_TOKEN flags still present earlier.
    expect(args).toContain('PLAYTEST_MODE:1')
    expect(args).toContain(`PLAYTEST_TOKEN:${VALID_TOKEN}`)
  })

  it('omits PLAYTEST_GOD_ORIGINS when allowlist is undefined OR empty', () => {
    const argsUndef = buildWranglerArgs(makeConfig({ godOriginAllowlist: undefined }), VALID_TOKEN)
    const argsEmpty = buildWranglerArgs(makeConfig({ godOriginAllowlist: [] }), VALID_TOKEN)
    expect(argsUndef.some((a) => a.startsWith('PLAYTEST_GOD_ORIGINS'))).toBe(false)
    expect(argsEmpty.some((a) => a.startsWith('PLAYTEST_GOD_ORIGINS'))).toBe(false)
  })

  it('throws on malformed token and does NOT echo the token in the error', () => {
    const bad = 'nothexnothex'
    let msg = ''
    try {
      buildWranglerArgs(makeConfig(), bad)
    } catch (e) {
      msg = (e as Error).message
    }
    expect(msg).toMatch(/malformed/i)
    expect(msg).not.toContain(bad)
  })

  it('throws on uppercase hex token and does NOT echo the token in the error', () => {
    const bad = 'A'.repeat(64)
    let msg = ''
    try {
      buildWranglerArgs(makeConfig(), bad)
    } catch (e) {
      msg = (e as Error).message
    }
    expect(msg).toMatch(/charset|hex/i)
    expect(msg).not.toContain(bad)
  })
})

// -----------------------------------------------------------------------------
// validatePlaytestToken — must NOT echo the raw token on failure.
// -----------------------------------------------------------------------------

describe('validatePlaytestToken', () => {
  it('accepts 64 lowercase hex chars', () => {
    expect(() => validatePlaytestToken(VALID_TOKEN)).not.toThrow()
    expect(() => validatePlaytestToken('0123456789abcdef'.repeat(4))).not.toThrow()
  })

  it('rejects tokens with wrong length and does NOT include the token in the error', () => {
    const bad = 'abcd' // len 4
    let msg = ''
    try {
      validatePlaytestToken(bad)
    } catch (e) {
      msg = (e as Error).message
    }
    expect(msg).toMatch(/malformed|64 hex|length/i)
    expect(msg).not.toContain(bad)
  })

  it('rejects uppercase hex and does NOT include the token in the error', () => {
    const bad = 'A'.repeat(64)
    let msg = ''
    try {
      validatePlaytestToken(bad)
    } catch (e) {
      msg = (e as Error).message
    }
    expect(msg).toMatch(/charset|hex/i)
    expect(msg).not.toContain(bad)
  })

  it('rejects non-hex characters and does NOT include the token in the error', () => {
    const bad = 'Z'.repeat(64)
    let msg = ''
    try {
      validatePlaytestToken(bad)
    } catch (e) {
      msg = (e as Error).message
    }
    expect(msg).toMatch(/charset|hex/i)
    expect(msg).not.toContain(bad)
  })

  it('rejects non-string input and does NOT throw with undefined prototype access', () => {
    // @ts-expect-error — deliberately bad input
    expect(() => validatePlaytestToken(undefined)).toThrow(/malformed/i)
    // @ts-expect-error — deliberately bad input
    expect(() => validatePlaytestToken(1234)).toThrow(/malformed/i)
  })
})

// -----------------------------------------------------------------------------
// detectLogHygieneViolations — C6 gate.
// -----------------------------------------------------------------------------

describe('detectLogHygieneViolations', () => {
  it('returns empty for a clean env', () => {
    expect(detectLogHygieneViolations({})).toEqual([])
  })

  it('flags PLAYWRIGHT_TRACE when truthy', () => {
    expect(detectLogHygieneViolations({ PLAYWRIGHT_TRACE: '1' })).toContain('PLAYWRIGHT_TRACE')
    expect(detectLogHygieneViolations({ PLAYWRIGHT_TRACE: 'on' })).toContain('PLAYWRIGHT_TRACE')
  })

  it('does NOT flag PLAYWRIGHT_TRACE when unset/empty/"0"', () => {
    expect(detectLogHygieneViolations({})).not.toContain('PLAYWRIGHT_TRACE')
    expect(detectLogHygieneViolations({ PLAYWRIGHT_TRACE: '' })).not.toContain('PLAYWRIGHT_TRACE')
    expect(detectLogHygieneViolations({ PLAYWRIGHT_TRACE: '0' })).not.toContain('PLAYWRIGHT_TRACE')
  })

  it('flags DEBUG=* and DEBUG=*wrangler*', () => {
    expect(detectLogHygieneViolations({ DEBUG: '*' })).toContain('DEBUG')
    expect(detectLogHygieneViolations({ DEBUG: '*wrangler*' })).toContain('DEBUG')
    expect(detectLogHygieneViolations({ DEBUG: 'wrangler:boot' })).toContain('DEBUG')
  })

  it('does NOT flag DEBUG when unset/empty', () => {
    expect(detectLogHygieneViolations({})).not.toContain('DEBUG')
    expect(detectLogHygieneViolations({ DEBUG: '' })).not.toContain('DEBUG')
  })

  it('flags NODE_OPTIONS containing --inspect', () => {
    expect(detectLogHygieneViolations({ NODE_OPTIONS: '--inspect' })).toContain(
      'NODE_OPTIONS (--inspect)',
    )
    expect(detectLogHygieneViolations({ NODE_OPTIONS: '--inspect-brk' })).toContain(
      'NODE_OPTIONS (--inspect)',
    )
    expect(detectLogHygieneViolations({ NODE_OPTIONS: '--inspect=9229' })).toContain(
      'NODE_OPTIONS (--inspect)',
    )
  })

  it('does NOT flag NODE_OPTIONS without --inspect', () => {
    expect(detectLogHygieneViolations({ NODE_OPTIONS: '--max-old-space-size=4096' })).not.toContain(
      'NODE_OPTIONS (--inspect)',
    )
  })

  it('flags NODE_DEBUG when set', () => {
    expect(detectLogHygieneViolations({ NODE_DEBUG: 'http' })).toContain('NODE_DEBUG')
  })
})

// -----------------------------------------------------------------------------
// pollWranglerHealth — stub fetch branches.
// -----------------------------------------------------------------------------

type FetchStub = typeof fetch

function buildFetchStub(
  responses: Array<{ status: number; body?: unknown; throw?: boolean }>,
): FetchStub {
  let i = 0
  return (async () => {
    const r = responses[Math.min(i, responses.length - 1)]!
    i += 1
    if (r.throw) throw new Error('ECONNREFUSED')
    return {
      status: r.status,
      async json() {
        return r.body ?? {}
      },
    } as unknown as Response
  }) as FetchStub
}

function makeClock(startMs = 0, stepMs = 100): { now: () => number; advance: (ms: number) => void } {
  let t = startMs
  return {
    now: () => {
      const v = t
      t += stepMs
      return v
    },
    advance: (ms) => {
      t += ms
    },
  }
}

describe('pollWranglerHealth', () => {
  it('resolves when a 200 response returns {ok:true, playtest:true, version:"..."}', async () => {
    const fetchFn = buildFetchStub([
      { status: 404 }, // first poll: not ready
      { status: 200, body: { ok: true, playtest: true, version: '1.0.0' } },
    ])
    const clock = makeClock(0, 1)
    await expect(
      pollWranglerHealth({
        fetchFn,
        now: clock.now,
        sleep: async () => { /* noop */ },
        intervalMs: 1,
        timeoutMs: 10_000,
      }),
    ).resolves.toBeUndefined()
  })

  it('resolves when version is a number (matches real /health which returns PROTOCOL_VERSION number)', async () => {
    const fetchFn = buildFetchStub([
      { status: 200, body: { ok: true, playtest: true, version: 3 } },
    ])
    const clock = makeClock(0, 1)
    await expect(
      pollWranglerHealth({
        fetchFn,
        now: clock.now,
        sleep: async () => { /* noop */ },
        intervalMs: 1,
        timeoutMs: 10_000,
      }),
    ).resolves.toBeUndefined()
  })

  it('rejects with "PLAYTEST_MODE not picked up" when body has playtest:false', async () => {
    const fetchFn = buildFetchStub([
      { status: 200, body: { ok: true, playtest: false, version: '1.0.0' } },
    ])
    const clock = makeClock(0, 1)
    await expect(
      pollWranglerHealth({
        fetchFn,
        now: clock.now,
        sleep: async () => { /* noop */ },
        intervalMs: 1,
        timeoutMs: 5,
      }),
    ).rejects.toThrow(/PLAYTEST_MODE not picked up/)
  })

  it('rejects with "/health missing — confirm phase-2 Unit 1b" after timeout of 404s', async () => {
    const fetchFn = buildFetchStub([{ status: 404 }])
    const clock = makeClock(0, 10)
    await expect(
      pollWranglerHealth({
        fetchFn,
        now: clock.now,
        sleep: async () => { /* noop */ },
        intervalMs: 1,
        timeoutMs: 5,
      }),
    ).rejects.toThrow(/wrangler not ready or \/health missing.*phase-2 Unit 1b/i)
  })

  it('rejects after timeout when fetch always throws', async () => {
    const fetchFn = buildFetchStub([{ status: 0, throw: true }])
    const clock = makeClock(0, 10)
    await expect(
      pollWranglerHealth({
        fetchFn,
        now: clock.now,
        sleep: async () => { /* noop */ },
        intervalMs: 1,
        timeoutMs: 5,
      }),
    ).rejects.toThrow(/wrangler not ready/i)
  })
})

describe('pollViteHealth', () => {
  it('resolves on any 200', async () => {
    const fetchFn = buildFetchStub([{ status: 404 }, { status: 200 }])
    const clock = makeClock(0, 1)
    await expect(
      pollViteHealth({
        fetchFn,
        now: clock.now,
        sleep: async () => { /* noop */ },
        intervalMs: 1,
        timeoutMs: 10_000,
      }),
    ).resolves.toBeUndefined()
  })

  it('rejects after timeout with "vite dev not ready on 5173"', async () => {
    const fetchFn = buildFetchStub([{ status: 404 }])
    const clock = makeClock(0, 10)
    await expect(
      pollViteHealth({
        fetchFn,
        now: clock.now,
        sleep: async () => { /* noop */ },
        intervalMs: 1,
        timeoutMs: 5,
      }),
    ).rejects.toThrow(/vite dev not ready on 5173/)
  })
})

// -----------------------------------------------------------------------------
// startServers — integration via injected spawn + fetch stubs. Never launches
// a real subprocess.
// -----------------------------------------------------------------------------

/** Fake ChildProcess with controllable exit + kill tracking. */
class FakeChildProcess extends EventEmitter {
  exitCode: number | null = null
  killed = false
  killSignals: NodeJS.Signals[] = []
  pid: number
  constructor(pid: number) {
    super()
    this.pid = pid
  }
  kill(signal?: NodeJS.Signals | number): boolean {
    this.killed = true
    if (typeof signal === 'string') this.killSignals.push(signal)
    // Simulate prompt exit on SIGTERM/SIGKILL.
    setImmediate(() => {
      this.exitCode = 0
      this.emit('exit', 0, signal ?? null)
      this.emit('close', 0, signal ?? null)
    })
    return true
  }
}

function buildSpawnStub(): {
  spawn: (cmd: string, args: readonly string[], options: unknown) => ChildProcess
  spawned: Array<{ cmd: string; args: readonly string[]; env: NodeJS.ProcessEnv | undefined; child: FakeChildProcess }>
} {
  let nextPid = 1000
  const spawned: Array<{
    cmd: string
    args: readonly string[]
    env: NodeJS.ProcessEnv | undefined
    child: FakeChildProcess
  }> = []
  const spawn = (cmd: string, args: readonly string[], options: unknown): ChildProcess => {
    const opts = options as { env?: NodeJS.ProcessEnv }
    const child = new FakeChildProcess(nextPid++)
    spawned.push({ cmd, args, env: opts?.env, child })
    return child as unknown as ChildProcess
  }
  return { spawn, spawned }
}

describe('startServers — log-hygiene gate', () => {
  it('aborts WITHOUT spawning when PLAYWRIGHT_TRACE is set and allowTrace is false', async () => {
    const { spawn, spawned } = buildSpawnStub()
    await expect(
      startServers(makeConfig(), VALID_TOKEN, {
        spawn: spawn as unknown as typeof import('node:child_process').spawn,
        fetchFn: (async () => ({ status: 200, async json() { return { ok: true, playtest: true, version: '1' } } })) as unknown as typeof fetch,
        envSource: { PLAYWRIGHT_TRACE: '1' },
      }),
    ).rejects.toThrow(/Log hygiene gate.*PLAYWRIGHT_TRACE/i)
    expect(spawned.length).toBe(0)
  })

  it('proceeds past the gate when allowTrace=true (banner printed, spawn happens)', async () => {
    const { spawn, spawned } = buildSpawnStub()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => { /* noop */ })

    const fetchFn = (async () => ({
      status: 200,
      async json() { return { ok: true, playtest: true, version: '1.0.0' } },
    })) as unknown as typeof fetch

    const clock = makeClock(0, 1)
    const handles = await startServers(makeConfig(), VALID_TOKEN, {
      spawn: spawn as unknown as typeof import('node:child_process').spawn,
      fetchFn,
      now: clock.now,
      sleep: async () => { /* noop */ },
      envSource: { PLAYWRIGHT_TRACE: '1' },
      allowTrace: true,
    })

    expect(spawned.length).toBe(2)
    expect(warn).toHaveBeenCalledWith(expect.stringMatching(/TRACE MODE/i))
    // Cleanup
    await stopServers(handles)
    warn.mockRestore()
  })

  it('spawns wrangler via `pnpm exec wrangler dev` with --var PLAYTEST_* CLI flags (authoritative path)', async () => {
    const { spawn, spawned } = buildSpawnStub()
    const fetchFn = (async () => ({
      status: 200,
      async json() { return { ok: true, playtest: true, version: '1.0.0' } },
    })) as unknown as typeof fetch
    const clock = makeClock(0, 1)

    const handles = await startServers(
      makeConfig({ godOriginAllowlist: ['https://x.example'] }),
      VALID_TOKEN,
      {
        spawn: spawn as unknown as typeof import('node:child_process').spawn,
        fetchFn,
        now: clock.now,
        sleep: async () => { /* noop */ },
        envSource: {},
      },
    )

    // Wrangler spawn: `pnpm exec wrangler dev ...` with --var flags for
    // PLAYTEST_MODE, PLAYTEST_TOKEN, and PLAYTEST_GOD_ORIGINS.
    expect(spawned[0]!.cmd).toBe('pnpm')
    const args = spawned[0]!.args
    expect(args[0]).toBe('exec')
    expect(args[1]).toBe('wrangler')
    expect(args[2]).toBe('dev')
    expect(args).toContain('--var')
    expect(args).toContain('PLAYTEST_MODE:1')
    expect(args).toContain(`PLAYTEST_TOKEN:${VALID_TOKEN}`)
    expect(args).toContain('PLAYTEST_GOD_ORIGINS:https://x.example')
    expect(args).toContain('--ip')
    expect(args).toContain('0.0.0.0')
    expect(args).toContain('--port')
    expect(args).toContain('8787')

    // Defense-in-depth: env still carries PLAYTEST_* for Node-side
    // tooling, even though workerd only reads from the --var flags.
    expect(spawned[0]!.env?.PLAYTEST_MODE).toBe('1')
    expect(spawned[0]!.env?.PLAYTEST_TOKEN).toBe(VALID_TOKEN)
    expect(spawned[0]!.env?.PLAYTEST_GOD_ORIGINS).toBe('https://x.example')

    // Vite spawn is unchanged.
    expect(spawned[1]!.cmd).toBe('pnpm')
    expect(spawned[1]!.args).toEqual(['dev'])

    await stopServers(handles)
  })

  it('rejects with a token-validation error and does NOT spawn when token is malformed', async () => {
    const { spawn, spawned } = buildSpawnStub()
    await expect(
      startServers(makeConfig(), 'short', {
        spawn: spawn as unknown as typeof import('node:child_process').spawn,
        envSource: {},
      }),
    ).rejects.toThrow(/malformed/i)
    expect(spawned.length).toBe(0)
  })

  it('tears down both subprocesses if the healthcheck times out', async () => {
    const { spawn, spawned } = buildSpawnStub()
    const fetchFn = buildFetchStub([{ status: 404 }])
    const clock = makeClock(0, 10)
    await expect(
      startServers(makeConfig(), VALID_TOKEN, {
        spawn: spawn as unknown as typeof import('node:child_process').spawn,
        fetchFn,
        now: clock.now,
        sleep: async () => { /* noop */ },
        envSource: {},
      }),
    ).rejects.toThrow(/wrangler not ready/i)

    // Both fakes should have been killed.
    expect(spawned.length).toBe(2)
    expect(spawned[0]!.child.killed).toBe(true)
    expect(spawned[1]!.child.killed).toBe(true)
  })
})

// -----------------------------------------------------------------------------
// stopServers — idempotency.
// -----------------------------------------------------------------------------

describe('stopServers', () => {
  it('is a no-op when called twice', async () => {
    const w = new FakeChildProcess(1)
    const v = new FakeChildProcess(2)
    const handles: ServerHandles = {
      wranglerPid: 1,
      vitePid: 2,
      healthUrl: 'http://localhost:8787/health',
      _wrangler: w as unknown as ChildProcess,
      _vite: v as unknown as ChildProcess,
      _stopped: false,
    }

    await stopServers(handles)
    expect(w.killSignals).toEqual(['SIGTERM'])
    expect(v.killSignals).toEqual(['SIGTERM'])

    // Second call — must not send another signal.
    await stopServers(handles)
    expect(w.killSignals).toEqual(['SIGTERM'])
    expect(v.killSignals).toEqual(['SIGTERM'])
  })

  it('does not attempt to kill an already-exited child', async () => {
    const w = new FakeChildProcess(1)
    const v = new FakeChildProcess(2)
    // Simulate already-exited.
    w.exitCode = 0
    v.exitCode = 0

    const handles: ServerHandles = {
      wranglerPid: 1,
      vitePid: 2,
      healthUrl: 'http://localhost:8787/health',
      _wrangler: w as unknown as ChildProcess,
      _vite: v as unknown as ChildProcess,
      _stopped: false,
    }

    await stopServers(handles)
    expect(w.killSignals).toEqual([])
    expect(v.killSignals).toEqual([])
  })
})
