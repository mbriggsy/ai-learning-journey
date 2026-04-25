/**
 * Unit 4 tests — god-subscriber WS + split reassembly + events.jsonl writer.
 *
 * Scenarios (from phase-3-harness-infra.md Unit 4 Test scenarios):
 *  1. Happy unsplit: 100 events, each with complete projections → 100 lines.
 *  2. Happy split (3-way, N=10): same stateVersion, partial projections,
 *     shared expectedViewerIds → merges to 1 line when set-complete.
 *  3. Split byte-identity fail-closed: 2nd chunk has different `action`.
 *  4. Split metadata-identity fail-closed: 2nd chunk has different
 *     `expectedViewerIds`.
 *  5. Set-equality (not count): expected [a,b,c]; chunks ship [a,b,d] →
 *     fail-closed ("unexpected viewer id").
 *  6. Reassembly timeout: 2 of 3 chunks arrive → partial with `partial:true`.
 *  7. Scrubber throw fail-closed: 1st+2nd appended, 3rd NOT appended.
 *  8. Close 4004 → onFatalClose resolves non-retriable.
 *  9. Close 4003 → non-retriable.
 * 10. Close 4005 → retriable.
 * 11. Payload safety: quotes / newlines / unicode round-trip.
 * 12. Disconnect flushes pending.
 * 13. Token never logged (console.* scan).
 * 14. Pre-upgrade HTTP 401 → 4004-equivalent; HTTP 403 → 4003; HTTP 429 → 4005.
 * 15. Scrub mode 'off' pass-through: raw hands present on disk.
 * 16. Single chunk that already set-equals expected → flush immediately.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { IncomingMessage } from 'node:http'
import type WebSocket from 'ws'
import { connectGod } from './god-subscriber'
import type { WebSocketLike } from './god-subscriber'
import type { GodEvent } from './types'

// ---------------------------------------------------------------------------
// Mock WebSocket — captures listeners, records sends, fires events on demand.
// ---------------------------------------------------------------------------

type Listener = (...args: unknown[]) => void

interface MockWs extends WebSocketLike {
  readonly sends: string[]
  emit(event: 'open'): void
  emit(event: 'message', data: string): void
  emit(event: 'close', code: number, reason: string): void
  emit(event: 'error', err: Error): void
  emit(event: 'unexpected-response', res: Partial<IncomingMessage>): void
  readonly closedBy: { code: number; reason: string }[]
}

function makeMockWs(): MockWs {
  const listeners = new Map<string, Listener[]>()
  const sends: string[] = []
  const closedBy: { code: number; reason: string }[] = []
  return {
    sends,
    closedBy,
    on(event: string, fn: Listener): void {
      const arr = listeners.get(event) ?? []
      arr.push(fn)
      listeners.set(event, arr)
    },
    send(data: string): void {
      sends.push(data)
    },
    close(code?: number, reason?: string): void {
      closedBy.push({ code: code ?? 1000, reason: reason ?? '' })
    },
    emit(event: string, ...args: unknown[]): void {
      const arr = listeners.get(event) ?? []
      if (event === 'message') {
        const [data] = args
        for (const fn of arr) fn(Buffer.from(String(data)))
      } else if (event === 'close') {
        const [code, reason] = args as [number, string]
        for (const fn of arr) fn(code, Buffer.from(reason ?? ''))
      } else if (event === 'unexpected-response') {
        const [res] = args
        for (const fn of arr) fn({}, res as IncomingMessage)
      } else {
        for (const fn of arr) fn(...args)
      }
    },
  } as unknown as MockWs
}

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

interface TestHarness {
  ws: MockWs
  appended: string[]
  fsAppender: (path: string, batch: string) => Promise<void>
  flushNow: () => Promise<void>
  fireTimeouts: () => void
  readonly consoleErrors: unknown[][]
  readonly consoleWarns: unknown[][]
}

function makeHarness(): TestHarness {
  const ws = makeMockWs()
  const appended: string[] = []
  const fsAppender = vi.fn(async (_path: string, batch: string) => {
    appended.push(batch)
  })
  const consoleErrors: unknown[][] = []
  const consoleWarns: unknown[][] = []
  return {
    ws,
    appended,
    fsAppender,
    // Placeholders; buildConnectArgs overwrites these with wired-up versions.
    flushNow: async () => {},
    fireTimeouts: () => {},
    consoleErrors,
    consoleWarns,
  }
}

function buildConnectArgs(h: TestHarness, overrides: Partial<Parameters<typeof connectGod>[0]> = {}) {
  const pendingTimers: { cb: () => void; ms: number; fired: boolean; handle: symbol }[] = []
  let flushCb: () => void = () => {}
  // Expose hooks on the harness for tests.
  ;(h as unknown as { fireTimeouts: () => void }).fireTimeouts = () => {
    for (const t of pendingTimers) {
      if (!t.fired) {
        t.fired = true
        t.cb()
      }
    }
  }
  ;(h as unknown as { flushNow: () => Promise<void> }).flushNow = async () => {
    flushCb()
    await new Promise<void>((r) => setImmediate(r))
  }
  return {
    wsUrl: 'ws://127.0.0.1:8787/parties/main/test',
    token: 'deadbeef'.repeat(8),
    seed: 123,
    nopeWindowMs: 4000,
    scrubMode: 'on' as const,
    scrubSalt: 'abad1dea'.repeat(8),
    eventsJsonlPath: '/tmp/playtest-god-test.jsonl',
    godReassemblyTimeoutMs: 5000,
    wsFactory: () => h.ws,
    fsAppender: h.fsAppender,
    nowMs: () => 1000,
    scheduleFlush: (cb: () => void) => {
      flushCb = cb
      return { cancel: () => { flushCb = () => {} } }
    },
    scheduleTimeout: (cb: () => void, ms: number) => {
      const handle = Symbol('timer')
      pendingTimers.push({ cb, ms, fired: false, handle })
      return handle
    },
    clearTimeout: (handle: unknown) => {
      const t = pendingTimers.find((p) => p.handle === handle)
      if (t) t.fired = true // mark so fireTimeouts skips it
    },
    ...overrides,
  }
}

// A valid "complete" GodEvent for quick construction.
function makeEvent(overrides: Partial<GodEvent> = {}): GodEvent {
  return {
    type: 'god-event',
    action: { type: 'play-card', playerId: 'p1' },
    events: [{ type: 'card-played', cardType: 'attack' }],
    stateVersion: 1,
    nowMs: 1000,
    boardView: { phase: 'playing', stateVersion: 1 },
    projections: {
      p1: {
        myPlayerId: 'p1',
        myHand: [{ id: 'card-a', type: 'attack' }],
      },
    },
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('connectGod — url construction', () => {
  it('appends role=god&token=<T> and never logs the raw token', async () => {
    const h = makeHarness()
    const errorSpy = vi.spyOn(console, 'error').mockImplementation((...a) => {
      h.consoleErrors.push(a)
    })
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation((...a) => {
      h.consoleWarns.push(a)
    })
    const token = 'deadbeef'.repeat(8)
    const seenUrls: string[] = []
    const wsFactory = (url: string): WebSocketLike => {
      seenUrls.push(url)
      return h.ws
    }
    const handle = await connectGod(buildConnectArgs(h, { wsFactory }))
    // Fire an error so the error log path runs (it uses redactUrl).
    h.ws.emit('error', new Error('test'))
    // Assert the raw token never appeared in console output.
    const allLogs = [...h.consoleErrors, ...h.consoleWarns].flat().join(' ')
    expect(allLogs).not.toContain(token)
    expect(seenUrls[0]).toContain('role=god')
    expect(seenUrls[0]).toContain(`token=${token}`) // URL itself DOES contain token (it's the request)
    await handle.disconnect()
    errorSpy.mockRestore()
    warnSpy.mockRestore()
  })
})

describe('connectGod — handshake', () => {
  it('sends playtest-config on open with seed + nopeWindowMs', async () => {
    const h = makeHarness()
    await connectGod(buildConnectArgs(h))
    h.ws.emit('open')
    expect(h.ws.sends).toHaveLength(1)
    const msg = JSON.parse(h.ws.sends[0]!)
    expect(msg).toEqual({ type: 'playtest-config', seed: 123, nopeWindowMs: 4000 })
  })

  it('omits seed when undefined', async () => {
    const h = makeHarness()
    await connectGod(buildConnectArgs(h, { seed: undefined }))
    h.ws.emit('open')
    const msg = JSON.parse(h.ws.sends[0]!)
    expect(msg).toEqual({ type: 'playtest-config', nopeWindowMs: 4000 })
  })

  it('fatal-aborts on playtest-config-ack ok:false', async () => {
    const h = makeHarness()
    const handle = await connectGod(buildConnectArgs(h))
    h.ws.emit('open')
    h.ws.emit(
      'message',
      JSON.stringify({ type: 'playtest-config-ack', ok: false, code: 'PLAYTEST_CONFIG_LOCKED' }),
    )
    const fatal = await handle.onFatalClose
    expect(fatal.retriable).toBe(false)
    expect(fatal.reason).toContain('PLAYTEST_CONFIG_LOCKED')
  })
})

describe('connectGod — happy path unsplit', () => {
  it('writes 100 lines for 100 unsplit events', async () => {
    const h = makeHarness()
    const handle = await connectGod(buildConnectArgs(h))
    h.ws.emit('open')
    for (let i = 0; i < 100; i++) {
      h.ws.emit(
        'message',
        JSON.stringify(makeEvent({ stateVersion: i + 1 })),
      )
    }
    await h.flushNow()
    // Expect 100 lines concatenated across one or more append calls.
    const allLines = h.appended.join('').split('\n').filter(Boolean)
    expect(allLines).toHaveLength(100)
    for (const l of allLines) {
      const parsed = JSON.parse(l)
      expect(parsed.type).toBe('god-event')
      // Scrubber replaced myHand[*].type with <redacted>.
      expect(parsed.projections.p1.myHand[0].type).toBe('<redacted>')
      expect(parsed.projections.p1.myHand[0].id).toMatch(/^[0-9a-f]{12}$/)
    }
    await handle.disconnect()
  })

  it('treats expectedViewerIds set-equal to projection keys as unsplit', async () => {
    const h = makeHarness()
    const handle = await connectGod(buildConnectArgs(h))
    h.ws.emit('open')
    const evt = makeEvent({
      stateVersion: 42,
      expectedViewerIds: ['p1'],
    })
    h.ws.emit('message', JSON.stringify(evt))
    await h.flushNow()
    const lines = h.appended.join('').split('\n').filter(Boolean)
    expect(lines).toHaveLength(1)
    await handle.disconnect()
  })
})

describe('connectGod — split reassembly happy path', () => {
  it('merges 3-way split for 10 viewers into one line', async () => {
    const h = makeHarness()
    const handle = await connectGod(buildConnectArgs(h))
    h.ws.emit('open')
    const viewerIds = Array.from({ length: 10 }, (_, i) => `p${i + 1}`)
    const action = { type: 'play-card', playerId: 'p1' } as const
    const events = [{ type: 'card-played', cardType: 'attack' }] as const
    const boardView = { phase: 'playing' as const, stateVersion: 7 }
    const chunks = [
      viewerIds.slice(0, 4),
      viewerIds.slice(4, 8),
      viewerIds.slice(8, 10),
    ]
    for (const chunkIds of chunks) {
      const projections: Record<string, { myPlayerId: string; myHand: { id: string; type: string }[] }> = {}
      for (const id of chunkIds) {
        projections[id] = { myPlayerId: id, myHand: [{ id: `card-${id}`, type: 'skip' }] }
      }
      h.ws.emit(
        'message',
        JSON.stringify({
          type: 'god-event',
          action,
          events,
          stateVersion: 7,
          nowMs: 2000,
          projections,
          boardView,
          expectedViewerIds: viewerIds,
        }),
      )
    }
    await h.flushNow()
    const lines = h.appended.join('').split('\n').filter(Boolean)
    expect(lines).toHaveLength(1)
    const parsed = JSON.parse(lines[0]!)
    expect(Object.keys(parsed.projections).sort()).toEqual(viewerIds.slice().sort())
    await handle.disconnect()
  })
})

describe('connectGod — split fail-closed paths', () => {
  it('fails closed when 2nd chunk has different action', async () => {
    const h = makeHarness()
    const handle = await connectGod(buildConnectArgs(h))
    h.ws.emit('open')
    const base = {
      type: 'god-event' as const,
      events: [{ type: 'card-played' }],
      stateVersion: 1,
      nowMs: 1000,
      boardView: { phase: 'playing' as const, stateVersion: 1 },
      expectedViewerIds: ['a', 'b'],
    }
    h.ws.emit(
      'message',
      JSON.stringify({
        ...base,
        action: { type: 'play-card', playerId: 'a' },
        projections: { a: { myPlayerId: 'a', myHand: [] } },
      }),
    )
    h.ws.emit(
      'message',
      JSON.stringify({
        ...base,
        action: { type: 'DIFFERENT', playerId: 'a' },
        projections: { b: { myPlayerId: 'b', myHand: [] } },
      }),
    )
    const fatal = await handle.onFatalClose
    expect(fatal.retriable).toBe(false)
    expect(fatal.reason).toContain('action')
    await h.flushNow()
    const lines = h.appended.join('').split('\n').filter(Boolean)
    expect(lines).toHaveLength(0)
  })

  it('fails closed when expectedViewerIds differs across chunks', async () => {
    const h = makeHarness()
    const handle = await connectGod(buildConnectArgs(h))
    h.ws.emit('open')
    const base = {
      type: 'god-event' as const,
      action: { type: 'play-card', playerId: 'a' },
      events: [],
      stateVersion: 2,
      nowMs: 1000,
      boardView: { phase: 'playing' as const, stateVersion: 2 },
    }
    h.ws.emit(
      'message',
      JSON.stringify({
        ...base,
        projections: { a: { myPlayerId: 'a', myHand: [] } },
        expectedViewerIds: ['a', 'b'],
      }),
    )
    h.ws.emit(
      'message',
      JSON.stringify({
        ...base,
        projections: { b: { myPlayerId: 'b', myHand: [] } },
        expectedViewerIds: ['a', 'b', 'c'], // different!
      }),
    )
    const fatal = await handle.onFatalClose
    expect(fatal.reason).toContain('expectedViewerIds')
  })

  it('fails closed on unexpected viewer id in chunk (set-equality, not count)', async () => {
    const h = makeHarness()
    const handle = await connectGod(buildConnectArgs(h))
    h.ws.emit('open')
    // expected = [a, b, c]; chunks deliver [a, b, d] — 'd' is not in expected.
    const base = {
      type: 'god-event' as const,
      action: { type: 'play-card', playerId: 'a' },
      events: [],
      stateVersion: 3,
      nowMs: 1000,
      boardView: { phase: 'playing' as const, stateVersion: 3 },
      expectedViewerIds: ['a', 'b', 'c'],
    }
    h.ws.emit(
      'message',
      JSON.stringify({
        ...base,
        projections: {
          a: { myPlayerId: 'a', myHand: [] },
          b: { myPlayerId: 'b', myHand: [] },
        },
      }),
    )
    h.ws.emit(
      'message',
      JSON.stringify({
        ...base,
        projections: { d: { myPlayerId: 'd', myHand: [] } }, // not in expected!
      }),
    )
    const fatal = await handle.onFatalClose
    expect(fatal.reason).toContain('unexpected viewer id')
  })
})

describe('connectGod — reassembly timeout', () => {
  it('flushes partial with partial:true on timeout', async () => {
    const h = makeHarness()
    const handle = await connectGod(buildConnectArgs(h))
    h.ws.emit('open')
    const base = {
      type: 'god-event' as const,
      action: { type: 'play-card', playerId: 'a' },
      events: [],
      stateVersion: 9,
      nowMs: 1000,
      boardView: { phase: 'playing' as const, stateVersion: 9 },
      expectedViewerIds: ['a', 'b', 'c'],
    }
    // Only 2 of 3 chunks arrive.
    h.ws.emit(
      'message',
      JSON.stringify({
        ...base,
        projections: { a: { myPlayerId: 'a', myHand: [] } },
      }),
    )
    h.ws.emit(
      'message',
      JSON.stringify({
        ...base,
        projections: { b: { myPlayerId: 'b', myHand: [] } },
      }),
    )
    // Fire the reassembly timeout.
    h.fireTimeouts()
    await h.flushNow()
    const lines = h.appended.join('').split('\n').filter(Boolean)
    expect(lines).toHaveLength(1)
    const parsed = JSON.parse(lines[0]!)
    expect(parsed.partial).toBe(true)
    expect(Object.keys(parsed.projections).sort()).toEqual(['a', 'b'])
    await handle.disconnect()
  })
})

describe('connectGod — scrubber throw fail-closed', () => {
  it('does not write raw on scrubber throw; 1st+2nd appended, 3rd rejected', async () => {
    const h = makeHarness()
    const handle = await connectGod(buildConnectArgs(h))
    h.ws.emit('open')
    // 1st + 2nd are well-formed; 3rd has a malformed projection the
    // scrubber rejects (myHand not an array).
    h.ws.emit('message', JSON.stringify(makeEvent({ stateVersion: 1 })))
    h.ws.emit('message', JSON.stringify(makeEvent({ stateVersion: 2 })))
    h.ws.emit(
      'message',
      JSON.stringify({
        type: 'god-event',
        action: { type: 'play-card', playerId: 'p1' },
        events: [],
        stateVersion: 3,
        nowMs: 1000,
        boardView: { phase: 'playing', stateVersion: 3 },
        projections: { p1: { myPlayerId: 'p1', myHand: 'not-an-array' } },
      }),
    )
    await h.flushNow()
    const fatal = await handle.onFatalClose
    expect(fatal.retriable).toBe(false)
    expect(fatal.reason).toContain('scrubber threw')
    const lines = h.appended.join('').split('\n').filter(Boolean)
    expect(lines).toHaveLength(2) // 3rd NOT appended
    for (const l of lines) {
      const parsed = JSON.parse(l)
      expect([1, 2]).toContain(parsed.stateVersion)
    }
  })
})

describe('connectGod — close-code handling', () => {
  it('close 4003 → non-retriable', async () => {
    const h = makeHarness()
    const handle = await connectGod(buildConnectArgs(h))
    h.ws.emit('close', 4003, 'Forbidden god origin')
    const fatal = await handle.onFatalClose
    expect(fatal).toEqual({
      code: 4003,
      reason: 'god origin not allowlisted',
      retriable: false,
    })
  })
  it('close 4004 → non-retriable', async () => {
    const h = makeHarness()
    const handle = await connectGod(buildConnectArgs(h))
    h.ws.emit('close', 4004, 'Token mismatch')
    const fatal = await handle.onFatalClose
    expect(fatal.code).toBe(4004)
    expect(fatal.retriable).toBe(false)
  })
  it('close 4005 → retriable', async () => {
    const h = makeHarness()
    const handle = await connectGod(buildConnectArgs(h))
    h.ws.emit('close', 4005, 'Rate limited')
    const fatal = await handle.onFatalClose
    expect(fatal.code).toBe(4005)
    expect(fatal.retriable).toBe(true)
  })
  it('close 1000 after clean exchange leaves onFatalClose pending', async () => {
    const h = makeHarness()
    const handle = await connectGod(buildConnectArgs(h))
    h.ws.emit('open')
    h.ws.emit('message', JSON.stringify(makeEvent()))
    h.ws.emit('close', 1000, '')
    // Should NOT resolve — race with a timer.
    const result = await Promise.race([
      handle.onFatalClose.then(() => 'resolved'),
      new Promise<string>((r) => setTimeout(() => r('pending'), 50)),
    ])
    expect(result).toBe('pending')
    await handle.disconnect()
  })
})

describe('connectGod — pre-upgrade HTTP rejection', () => {
  it('HTTP 401 → 4004 equivalent, non-retriable', async () => {
    const h = makeHarness()
    const handle = await connectGod(buildConnectArgs(h))
    h.ws.emit('unexpected-response', { statusCode: 401, resume: () => {} } as unknown as IncomingMessage)
    const fatal = await handle.onFatalClose
    expect(fatal.code).toBe(4004)
    expect(fatal.retriable).toBe(false)
  })
  it('HTTP 403 → 4003 equivalent, non-retriable', async () => {
    const h = makeHarness()
    const handle = await connectGod(buildConnectArgs(h))
    h.ws.emit('unexpected-response', { statusCode: 403, resume: () => {} } as unknown as IncomingMessage)
    const fatal = await handle.onFatalClose
    expect(fatal.code).toBe(4003)
    expect(fatal.retriable).toBe(false)
  })
  it('HTTP 429 → 4005 equivalent, retriable', async () => {
    const h = makeHarness()
    const handle = await connectGod(buildConnectArgs(h))
    h.ws.emit('unexpected-response', { statusCode: 429, resume: () => {} } as unknown as IncomingMessage)
    const fatal = await handle.onFatalClose
    expect(fatal.code).toBe(4005)
    expect(fatal.retriable).toBe(true)
  })
})

describe('connectGod — payload safety', () => {
  it('quotes, newlines, unicode round-trip via JSON.parse', async () => {
    const h = makeHarness()
    const handle = await connectGod(buildConnectArgs(h))
    h.ws.emit('open')
    const evt = makeEvent({
      action: { type: 'play-card', playerId: 'p1', payload: 'He said "hi"\nwith\ta tab and emoji 🔥' },
    })
    h.ws.emit('message', JSON.stringify(evt))
    await h.flushNow()
    const lines = h.appended.join('').split('\n').filter(Boolean)
    expect(lines).toHaveLength(1)
    const parsed = JSON.parse(lines[0]!)
    expect(parsed.action.payload).toBe('He said "hi"\nwith\ta tab and emoji 🔥')
    await handle.disconnect()
  })
})

describe('connectGod — disconnect flushes pending', () => {
  it('flushes queued lines on disconnect', async () => {
    const h = makeHarness()
    const handle = await connectGod(buildConnectArgs(h))
    h.ws.emit('open')
    for (let i = 0; i < 5; i++) {
      h.ws.emit('message', JSON.stringify(makeEvent({ stateVersion: i + 1 })))
    }
    // Don't fire flush interval; disconnect should drain.
    await handle.disconnect()
    const lines = h.appended.join('').split('\n').filter(Boolean)
    expect(lines).toHaveLength(5)
  })

  it('drains partial assemblies on disconnect with partial:true', async () => {
    const h = makeHarness()
    const handle = await connectGod(buildConnectArgs(h))
    h.ws.emit('open')
    const base = {
      type: 'god-event' as const,
      action: { type: 'play-card', playerId: 'a' },
      events: [],
      stateVersion: 11,
      nowMs: 1000,
      boardView: { phase: 'playing' as const, stateVersion: 11 },
      expectedViewerIds: ['a', 'b'],
    }
    h.ws.emit(
      'message',
      JSON.stringify({ ...base, projections: { a: { myPlayerId: 'a', myHand: [] } } }),
    )
    await handle.disconnect()
    const lines = h.appended.join('').split('\n').filter(Boolean)
    expect(lines).toHaveLength(1)
    const parsed = JSON.parse(lines[0]!)
    expect(parsed.partial).toBe(true)
  })
})

describe('connectGod — token redaction in logs', () => {
  it('never emits the raw 64-hex token via console.error or console.warn', async () => {
    const h = makeHarness()
    const errorSpy = vi.spyOn(console, 'error').mockImplementation((...a) => {
      h.consoleErrors.push(a)
    })
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation((...a) => {
      h.consoleWarns.push(a)
    })
    const token = 'deadbeef'.repeat(8)
    const handle = await connectGod(buildConnectArgs(h, { token }))
    h.ws.emit('error', new Error('boom'))
    h.ws.emit('close', 4444, 'weird code to force warn')
    // Also make a scrubber throw to exercise the error path.
    h.ws.emit(
      'message',
      JSON.stringify({
        type: 'god-event',
        action: { type: 'play-card', playerId: 'p1' },
        events: [],
        stateVersion: 1,
        nowMs: 1000,
        boardView: { phase: 'playing', stateVersion: 1 },
        projections: { p1: { myPlayerId: 'p1', myHand: 'bad' } },
      }),
    )
    await h.flushNow()
    const allLogs = [...h.consoleErrors, ...h.consoleWarns]
      .flat()
      .map((v) => (v instanceof Error ? v.message : String(v)))
      .join(' ')
    expect(allLogs).not.toContain(token)
    await handle.disconnect()
    errorSpy.mockRestore()
    warnSpy.mockRestore()
  })
})

describe('connectGod — scrub mode off', () => {
  it('preserves raw myHand when scrubMode is off', async () => {
    const h = makeHarness()
    const handle = await connectGod(buildConnectArgs(h, { scrubMode: 'off' }))
    h.ws.emit('open')
    h.ws.emit('message', JSON.stringify(makeEvent()))
    await h.flushNow()
    const lines = h.appended.join('').split('\n').filter(Boolean)
    const parsed = JSON.parse(lines[0]!)
    expect(parsed.projections.p1.myHand[0]).toEqual({ id: 'card-a', type: 'attack' })
    await handle.disconnect()
  })
})

describe('connectGod — degenerate single-chunk split', () => {
  it('flushes immediately when a single chunk already set-equals expected', async () => {
    const h = makeHarness()
    const handle = await connectGod(buildConnectArgs(h))
    h.ws.emit('open')
    h.ws.emit(
      'message',
      JSON.stringify({
        type: 'god-event',
        action: { type: 'play-card', playerId: 'a' },
        events: [],
        stateVersion: 100,
        nowMs: 1000,
        boardView: { phase: 'playing', stateVersion: 100 },
        projections: { a: { myPlayerId: 'a', myHand: [] } },
        expectedViewerIds: ['a'],
      }),
    )
    await h.flushNow()
    const lines = h.appended.join('').split('\n').filter(Boolean)
    expect(lines).toHaveLength(1)
    await handle.disconnect()
  })
})

describe('connectGod — error when clean disconnect does not resolve fatal', () => {
  it('disconnect() never resolves onFatalClose', async () => {
    const h = makeHarness()
    const handle = await connectGod(buildConnectArgs(h))
    await handle.disconnect()
    const result = await Promise.race([
      handle.onFatalClose.then(() => 'resolved'),
      new Promise<string>((r) => setTimeout(() => r('pending'), 50)),
    ])
    expect(result).toBe('pending')
  })
})

// ---------------------------------------------------------------------------
// Heartbeat — server sends `{type: 'ping'}`; god MUST respond with `{type:
// 'pong'}` or the server kills the connection at 40s with code 1001.
//
// Insight 034 (Phase 6 Unit 3 calibration retry #2): pre-fix god subscriber
// ignored ping → killed at 40s → close handler treated 1001 as non-fatal →
// orchestrator silently lost telemetry for the rest of the session
// (events.jsonl had 1 line for a 12-minute game).
// ---------------------------------------------------------------------------

describe('connectGod — heartbeat (insight 034)', () => {
  it('responds to {type:"ping"} with {type:"pong", payload:{}}', async () => {
    const h = makeHarness()
    const handle = await connectGod(buildConnectArgs(h))
    h.ws.emit('open')
    // playtest-config goes out at open. Capture the count so we can isolate
    // pong sends.
    const sendsBefore = h.ws.sends.length

    h.ws.emit('message', JSON.stringify({ type: 'ping', payload: {} }))

    const newSends = h.ws.sends.slice(sendsBefore)
    expect(newSends).toHaveLength(1)
    const parsed = JSON.parse(newSends[0]!) as { type: string; payload: Record<string, never> }
    expect(parsed.type).toBe('pong')
    expect(parsed.payload).toEqual({})

    await handle.disconnect()
  })

  it('multiple consecutive pings each trigger a pong (sustained heartbeat)', async () => {
    const h = makeHarness()
    const handle = await connectGod(buildConnectArgs(h))
    h.ws.emit('open')
    const sendsBefore = h.ws.sends.length

    h.ws.emit('message', JSON.stringify({ type: 'ping', payload: {} }))
    h.ws.emit('message', JSON.stringify({ type: 'ping', payload: {} }))
    h.ws.emit('message', JSON.stringify({ type: 'ping', payload: {} }))

    const newSends = h.ws.sends.slice(sendsBefore)
    expect(newSends).toHaveLength(3)
    for (const s of newSends) {
      expect(JSON.parse(s)).toEqual({ type: 'pong', payload: {} })
    }

    await handle.disconnect()
  })

  it('ping does NOT resolve onFatalClose', async () => {
    const h = makeHarness()
    const handle = await connectGod(buildConnectArgs(h))
    h.ws.emit('open')
    h.ws.emit('message', JSON.stringify({ type: 'ping', payload: {} }))

    const result = await Promise.race([
      handle.onFatalClose.then(() => 'resolved'),
      new Promise<string>((r) => setTimeout(() => r('pending'), 30)),
    ])
    expect(result).toBe('pending')
    await handle.disconnect()
  })
})

// ---------------------------------------------------------------------------
// Defense-in-depth log for silent server-initiated 1000/1001 close
// (insight 034). Pre-fix the close fired silently. Even with the pong fix,
// any future server-initiated 1000/1001 (inactivity-kill, hibernation, etc.)
// should be visible to the operator instead of silently halving telemetry.
// ---------------------------------------------------------------------------

describe('connectGod — silent close visibility (insight 034)', () => {
  it('warns loudly when server closes with code 1001 mid-session', async () => {
    const h = makeHarness()
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation((...a) => {
      h.consoleWarns.push(a)
    })
    const handle = await connectGod(buildConnectArgs(h))
    h.ws.emit('open')
    h.ws.emit('close', 1001, 'Heartbeat timeout')

    const warnText = h.consoleWarns.flat().join(' ')
    expect(warnText).toMatch(/server-initiated close mid-session/i)
    expect(warnText).toContain('code=1001')
    expect(warnText).toContain('Heartbeat timeout')

    // Semantics unchanged — onFatalClose still pending.
    const result = await Promise.race([
      handle.onFatalClose.then(() => 'resolved'),
      new Promise<string>((r) => setTimeout(() => r('pending'), 30)),
    ])
    expect(result).toBe('pending')
    warnSpy.mockRestore()
  })

  it('warns loudly when server closes with code 1000 mid-session', async () => {
    const h = makeHarness()
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation((...a) => {
      h.consoleWarns.push(a)
    })
    const handle = await connectGod(buildConnectArgs(h))
    h.ws.emit('open')
    h.ws.emit('close', 1000, 'Inactivity timeout')

    const warnText = h.consoleWarns.flat().join(' ')
    expect(warnText).toMatch(/server-initiated close mid-session/i)
    expect(warnText).toContain('code=1000')
    void handle
    warnSpy.mockRestore()
  })

  it('does NOT warn when the orchestrator initiated the close (disconnect path)', async () => {
    const h = makeHarness()
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation((...a) => {
      h.consoleWarns.push(a)
    })
    const handle = await connectGod(buildConnectArgs(h))
    h.ws.emit('open')
    await handle.disconnect()
    // Simulate the close-event echo that follows ws.close() — should be
    // ignored because `disconnected` flag is set.
    h.ws.emit('close', 1000, 'orchestrator-disconnect')

    const warnText = h.consoleWarns.flat().join(' ')
    expect(warnText).not.toMatch(/server-initiated close mid-session/i)
    warnSpy.mockRestore()
  })
})
