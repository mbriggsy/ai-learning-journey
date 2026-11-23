import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { EngineWire } from '@engine/engineWire'
import type { SimulationParams } from '@shared/model'

/**
 * The workbench's run lanes (workbench plan U5, KTD13: src/store/runLanes.ts). Each lane keeps one
 * call in flight and only its newest request waiting; it is total; it re-sends its newest request
 * when the store reset the worker and never re-sends when the worker died; on the main-thread
 * fallback a group runs one call at a time. The reset and death arms run through the REAL
 * `createResettableEngine` over a fake spawn, so the rejections are the handle's own.
 */

const h = vi.hoisted(() => ({
  run: vi.fn(),
  reset: vi.fn(),
  setLatestEpoch: vi.fn(),
  setLatestSpendEpoch: vi.fn(),
}))

vi.mock('../engineClient', async (importOriginal) => ({
  // The real classes and `createResettableEngine` stay real; only the singleton client is replaced.
  ...(await importOriginal<typeof import('../engineClient')>()),
  engineClient: {
    engine: { run: h.run, setLatestEpoch: h.setLatestEpoch, setLatestSpendEpoch: h.setLatestSpendEpoch },
    runningInWorker: true,
    reset: h.reset,
  },
}))

import { EngineResetError, createResettableEngine, type SpawnEngine, type SpawnedEngine } from '../engineClient'
import { createLaneGroup, engineRunLane, type LaneOutcome } from '../runLanes'

interface Deferred<T> {
  readonly promise: Promise<T>
  readonly resolve: (v: T) => void
  readonly reject: (e: unknown) => void
}
function deferred<T>(): Deferred<T> {
  let resolve!: (v: T) => void
  let reject!: (e: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}
const flush = () => new Promise<void>((r) => setTimeout(r, 0))
const ok = (value: string): LaneOutcome<string> => ({ ok: true, value })

/** A lane run whose calls the test settles by hand; `peak` is the most calls ever live at once. */
function controlledRun<Req>() {
  const calls: { req: Req; d: Deferred<LaneOutcome<string>> }[] = []
  let live = 0
  let peak = 0
  const run = vi.fn((req: Req) => {
    const d = deferred<LaneOutcome<string>>()
    calls.push({ req, d })
    live += 1
    peak = Math.max(peak, live)
    return d.promise.finally(() => {
      live -= 1
    })
  })
  return { run, calls, peak: () => peak }
}

/** Fake workers behind the real resettable handle: each `run` is a deferred the test settles. */
function fakeWorkers() {
  const workers: { runs: { id: string; d: Deferred<EngineWire> }[]; onDeath: (detail: string) => void }[] = []
  const spawn: SpawnEngine = (onDeath) => {
    const w = { runs: [] as { id: string; d: Deferred<EngineWire> }[], onDeath }
    workers.push(w)
    const remote = {
      run: (params: SimulationParams) => {
        const d = deferred<EngineWire>()
        w.runs.push({ id: (params as unknown as { id: string }).id, d })
        return d.promise
      },
    } as unknown as SpawnedEngine['remote']
    return { remote, terminate: () => {}, release: () => {} }
  }
  return { spawn, workers }
}
const wire = (tag: string) => ({ tag }) as unknown as EngineWire

beforeEach(() => {
  h.run.mockReset()
  h.reset.mockReset()
  h.setLatestEpoch.mockReset()
  h.setLatestSpendEpoch.mockReset()
})

describe('lanes', () => {
  it('two lanes fired together each deliver their own result', async () => {
    const g = createLaneGroup({ runsInWorker: () => true })
    const a = controlledRun<string>()
    const b = controlledRun<string>()
    const pa = g.lane(a.run).request('a')
    const pb = g.lane(b.run).request('b')
    expect(a.calls).toHaveLength(1)
    expect(b.calls).toHaveLength(1)
    b.calls[0]!.d.resolve(ok('B'))
    a.calls[0]!.d.resolve(ok('A'))
    expect(await pa).toEqual({ kind: 'ok', value: 'A' })
    expect(await pb).toEqual({ kind: 'ok', value: 'B' })
  })

  it('within one lane a second request supersedes the first, and only the second renders', async () => {
    const r = controlledRun<string>()
    const lane = createLaneGroup({ runsInWorker: () => true }).lane(r.run)
    const p1 = lane.request('1')
    const p2 = lane.request('2')
    expect(await p1).toEqual({ kind: 'superseded' })
    expect(r.calls).toHaveLength(1) // one call in flight: the second waits for it
    r.calls[0]!.d.resolve(ok('one'))
    await flush()
    expect(r.calls.map((c) => c.req)).toEqual(['1', '2'])
    r.calls[1]!.d.resolve(ok('two'))
    expect(await p2).toEqual({ kind: 'ok', value: 'two' })
  })

  it('ten commits in quick succession start at most two runs; the second carries the tenth, and only it renders', async () => {
    const r = controlledRun<number>()
    const lane = createLaneGroup({ runsInWorker: () => true }).lane(r.run)
    const ps = Array.from({ length: 10 }, (_, i) => lane.request(i + 1))
    expect(r.calls.map((c) => c.req)).toEqual([1])
    r.calls[0]!.d.resolve(ok('v1'))
    await flush()
    expect(r.calls.map((c) => c.req)).toEqual([1, 10])
    r.calls[1]!.d.resolve(ok('v10'))
    const results = await Promise.all(ps)
    expect(results.slice(0, 9)).toEqual(Array.from({ length: 9 }, () => ({ kind: 'superseded' })))
    expect(results[9]).toEqual({ kind: 'ok', value: 'v10' })
    await flush()
    expect(r.calls).toHaveLength(2)
  })

  it('with one request in flight and a second and third waiting, the third renders and the second never starts', async () => {
    const r = controlledRun<string>()
    const lane = createLaneGroup({ runsInWorker: () => true }).lane(r.run)
    const [p1, p2, p3] = [lane.request('1'), lane.request('2'), lane.request('3')]
    r.calls[0]!.d.resolve(ok('one'))
    await flush()
    expect(r.calls.map((c) => c.req)).toEqual(['1', '3'])
    r.calls[1]!.d.resolve(ok('three'))
    expect(await p1).toEqual({ kind: 'superseded' })
    expect(await p2).toEqual({ kind: 'superseded' })
    expect(await p3).toEqual({ kind: 'ok', value: 'three' })
  })

  it('a reset of the worker during a pending run makes each lane re-send its newest request and deliver', async () => {
    const { spawn, workers } = fakeWorkers()
    const handle = createResettableEngine(spawn)
    const g = createLaneGroup({ runsInWorker: () => true })
    const mk = () =>
      g.lane(async (id: string): Promise<LaneOutcome<string>> => {
        const w = await handle.engine.run({ id } as unknown as SimulationParams, 7)
        return ok((w as unknown as { tag: string }).tag)
      })
    const table = mk()
    const whatIf = mk()
    const pt1 = table.request('t1')
    const pt2 = table.request('t2') // waits behind t1: the newest
    const pw = whatIf.request('w1')
    expect(workers[0]!.runs.map((r) => r.id)).toEqual(['t1', 'w1'])

    handle.reset() // the store's kill: an edit that changes the answer during a pending solve
    await flush()
    expect(workers).toHaveLength(2)
    expect(workers[1]!.runs.map((r) => r.id)).toEqual(['t2', 'w1'])
    workers[1]!.runs[0]!.d.resolve(wire('T2'))
    workers[1]!.runs[1]!.d.resolve(wire('W1'))
    expect(await pt1).toEqual({ kind: 'superseded' })
    expect(await pt2).toEqual({ kind: 'ok', value: 'T2' })
    expect(await pw).toEqual({ kind: 'ok', value: 'W1' })
  })

  it('a dead worker gives each lane its calm error and no re-send', async () => {
    const { spawn, workers } = fakeWorkers()
    const handle = createResettableEngine(spawn)
    const g = createLaneGroup({ runsInWorker: () => true })
    const runs: ReturnType<typeof vi.fn>[] = []
    const mk = () => {
      const run = vi.fn(async (id: string): Promise<LaneOutcome<string>> => {
        await handle.engine.run({ id } as unknown as SimulationParams, 7)
        return ok('never')
      })
      runs.push(run)
      return g.lane(run)
    }
    const pa = mk().request('a')
    const pb = mk().request('b')
    workers[0]!.onDeath('the chunk failed to load')
    for (const p of [pa, pb]) {
      const r = await p
      expect(r.kind).toBe('error')
      expect(r.kind === 'error' && r.reason).toMatch(/engine worker died: the chunk failed to load/)
    }
    await flush()
    expect(runs.map((r) => r.mock.calls.length)).toEqual([1, 1])
    expect(workers).toHaveLength(1)
    expect(workers[0]!.runs).toHaveLength(2)
  })

  it('on the main-thread fallback the lanes run one at a time, in the order asked, and each delivers', async () => {
    const g = createLaneGroup({ runsInWorker: () => false })
    const a = controlledRun<string>()
    const b = controlledRun<string>()
    const c = controlledRun<string>()
    const la = g.lane(a.run)
    const lb = g.lane(b.run)
    const lc = g.lane(c.run)
    const pa = la.request('a')
    const pb1 = lb.request('b1')
    const pc = lc.request('c')
    const pb2 = lb.request('b2') // replaces b1 while b waits for its turn: b1 never starts
    expect([a.calls.length, b.calls.length, c.calls.length]).toEqual([1, 0, 0])
    a.calls[0]!.d.resolve(ok('A'))
    await flush()
    expect([b.calls.map((x) => x.req), c.calls.length]).toEqual([['b2'], 0])
    b.calls[0]!.d.resolve(ok('B2'))
    await flush()
    expect(c.calls).toHaveLength(1)
    c.calls[0]!.d.resolve(ok('C'))
    expect(await pa).toEqual({ kind: 'ok', value: 'A' })
    expect(await pb1).toEqual({ kind: 'superseded' })
    expect(await pb2).toEqual({ kind: 'ok', value: 'B2' })
    expect(await pc).toEqual({ kind: 'ok', value: 'C' })
    expect(Math.max(a.peak(), b.peak(), c.peak())).toBe(1)
  })
})

describe('the engine run lane', () => {
  it('never resets the worker or moves the store’s epoch, through a supersede, a reset re-send and a death', async () => {
    const pending: Deferred<EngineWire>[] = []
    h.run.mockImplementation(() => {
      const d = deferred<EngineWire>()
      pending.push(d)
      return d.promise
    })
    const lane = engineRunLane(createLaneGroup({ runsInWorker: () => true }))
    const req = { params: {} as SimulationParams, seed: 1 }

    const p1 = lane.request(req)
    const p2 = lane.request(req)
    pending[0]!.reject(new EngineResetError()) // the store's kill under the first call
    await flush()
    expect(h.run).toHaveBeenCalledTimes(2) // the newest (p2) re-sent once
    pending[1]!.resolve({ kind: 'calm-error', reason: 'the engine said no' })
    expect(await p1).toEqual({ kind: 'superseded' })
    expect(await p2).toEqual({ kind: 'error', reason: 'the engine said no' }) // the wire's calm error

    const p3 = lane.request(req)
    pending[2]!.reject(new Error('engine worker died: gone'))
    expect(await p3).toEqual({ kind: 'error', reason: 'engine worker died: gone' })
    await flush()
    expect(h.run).toHaveBeenCalledTimes(3)

    expect(h.reset).not.toHaveBeenCalled()
    expect(h.setLatestEpoch).not.toHaveBeenCalled()
    expect(h.setLatestSpendEpoch).not.toHaveBeenCalled()
  })
})
