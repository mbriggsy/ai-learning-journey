// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'

// PartySocket mock: a minimal addEventListener-driven fake. Each new
// PartySocket(...) instance pushes itself onto `instances` so tests can
// drive close/open events from the outside.
type Listener = (event: unknown) => void
interface MockSocket {
  listeners: Record<string, Set<Listener>>
  options: Record<string, unknown>
  addEventListener: (type: string, fn: Listener) => void
  close: () => void
  send: () => void
  reconnect: () => void
  readyState: number
  emit: (type: string, event?: unknown) => void
}

const instances: MockSocket[] = []

vi.mock('partysocket', () => {
  return {
    default: class PartySocketMock implements MockSocket {
      listeners: Record<string, Set<Listener>> = {}
      options: Record<string, unknown>
      readyState = 0
      constructor(options: Record<string, unknown>) {
        this.options = options
        instances.push(this)
      }
      addEventListener(type: string, fn: Listener): void {
        ;(this.listeners[type] ??= new Set()).add(fn)
      }
      close(): void {
        this.readyState = 3
      }
      send(): void {}
      reconnect(): void {}
      emit(type: string, event: unknown = {}): void {
        const set = this.listeners[type]
        if (!set) return
        for (const fn of set) fn(event)
      }
    },
  }
})

async function freshConnection(): Promise<typeof import('./connection')> {
  vi.resetModules()
  instances.length = 0
  return await import('./connection')
}

describe('connection — bounded reconnect + gave-up state', () => {
  beforeEach(() => {
    instances.length = 0
  })

  it('passes maxRetries and a noop debugLogger to PartySocket', async () => {
    const { connect } = await freshConnection()
    connect('ROOM', 'localhost')
    expect(instances).toHaveLength(1)
    const opts = instances[0]!.options
    expect(opts['maxRetries']).toBe(10)
    expect(typeof opts['debugLogger']).toBe('function')
    // Calling the noop must not throw and must not produce console output.
    ;(opts['debugLogger'] as () => void)()
  })

  it('flips status to gave-up after MAX_RETRIES consecutive close events', async () => {
    const { connect, onStatusChange } = await freshConnection()
    const seen: string[] = []
    onStatusChange(s => seen.push(s))
    connect('ROOM', 'localhost')
    const sock = instances[0]!
    // Drive 10 close events without any open.
    for (let i = 0; i < 10; i++) sock.emit('close')
    // First 9 closes register as 'disconnected', the 10th flips to 'gave-up'.
    expect(seen.filter(s => s === 'gave-up')).toHaveLength(1)
    expect(seen.at(-1)).toBe('gave-up')
  })

  it('does not flip to gave-up when an open intervenes (counter resets)', async () => {
    const { connect, onStatusChange } = await freshConnection()
    const seen: string[] = []
    onStatusChange(s => seen.push(s))
    connect('ROOM', 'localhost')
    const sock = instances[0]!
    // 9 closes, then an open, then 9 more closes — never reaches 10
    // consecutive, so 'gave-up' must never fire.
    for (let i = 0; i < 9; i++) sock.emit('close')
    sock.emit('open')
    for (let i = 0; i < 9; i++) sock.emit('close')
    expect(seen).not.toContain('gave-up')
  })

  it('emits gave-up exactly once even if more closes arrive after the threshold', async () => {
    const { connect, onStatusChange } = await freshConnection()
    const seen: string[] = []
    onStatusChange(s => seen.push(s))
    connect('ROOM', 'localhost')
    const sock = instances[0]!
    for (let i = 0; i < 15; i++) sock.emit('close')
    // After the 10th close we're in 'gave-up'. Subsequent closes still
    // notify (status is still 'gave-up') but the actor of interest —
    // crossing the threshold — must only count once.
    const transitionsToGaveUp = seen.filter((s, i) => s === 'gave-up' && seen[i - 1] !== 'gave-up')
    expect(transitionsToGaveUp).toHaveLength(1)
  })

  it('disconnect resets state so a subsequent connect starts with a fresh budget', async () => {
    const { connect, onStatusChange, getStatus } = await freshConnection()
    const seen: string[] = []
    onStatusChange(s => seen.push(s))
    connect('ROOM', 'localhost')
    const sock1 = instances[0]!
    for (let i = 0; i < 10; i++) sock1.emit('close')
    expect(getStatus()).toBe('gave-up')

    // Reconnect to the SAME room — disconnectImmediate fires before the new
    // socket boots, so the consecutive-failure counter must be cleared.
    connect('ROOM', 'localhost')
    expect(instances).toHaveLength(2)
    const sock2 = instances[1]!
    // 9 fresh closes — must not retrigger gave-up.
    for (let i = 0; i < 9; i++) sock2.emit('close')
    expect(getStatus()).toBe('disconnected')
  })
})
