import { describe, expect, it, vi, type Mock } from 'vitest'
import { createResettableEngine, isEngineReset, poolSizeFor, type SpawnedEngine, type SpawnEngine } from '../engineClient'

/**
 * THE POOLED SOLVE LANE (the worker pool, commit 2) — pinned on a recording fake spawn: every remote
 * method call is captured with its arguments and settles only when the test says so (the
 * Comlink-after-terminate shape — nothing settles on its own). The laws the design red team required:
 * the lane NEVER touches the spine generation (a pool death or a pool reset leaves the headline lane
 * flowing — design A's fatal flaw); any pool failure tears the WHOLE lane down and retries the solve
 * ONCE on the spine's single worker; a reset kills the lane with EngineResetError and never retries.
 */
type Call = { readonly method: string; readonly args: readonly unknown[]; resolve: (v: unknown) => void; reject: (e: unknown) => void }
type Rec = { calls: Call[]; onDeath: (detail: string) => void; terminate: Mock<() => void>; release: Mock<() => void> }

function recordingSpawn(opts?: { throwOnSpawn?: (n: number) => boolean }) {
  const workers: Rec[] = []
  let n = 0
  const spawn: SpawnEngine = (onDeath) => {
    n += 1
    if (opts?.throwOnSpawn?.(n)) throw new Error(`spawn ${n} refused`)
    const calls: Call[] = []
    const remote = new Proxy(
      {},
      {
        get:
          (_, method) =>
          (...args: unknown[]) =>
            new Promise((resolve, reject) => calls.push({ method: String(method), args, resolve, reject })),
      },
    ) as SpawnedEngine['remote']
    const rec: Rec = { calls, onDeath, terminate: vi.fn<() => void>(), release: vi.fn<() => void>() }
    workers.push(rec)
    return { remote, terminate: rec.terminate, release: rec.release }
  }
  return { spawn, workers }
}

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0))
const REQ = { tag: 'request' } as never
const ANSWER = { kind: 'refused', tag: 'the pool answered' } as never
const SINGLE = { kind: 'refused', tag: 'the spine answered' } as never

/** workers[0] is the spine; a pooled solve spawns workers[1] (the coordinator) + the eval workers. */
function startPooled(poolSize: number, opts?: { throwOnSpawn?: (n: number) => boolean }) {
  const rec = recordingSpawn(opts)
  const handle = createResettableEngine(rec.spawn, { poolSize })
  const solve = handle.engine.runSolve(REQ)
  return { ...rec, ...handle, solve }
}
/** Serve every eval port, then return the coordinator's `runSolvePooled` call. */
async function serveAll(workers: Rec[]): Promise<Call> {
  await flush()
  for (const w of workers.slice(2)) w.calls.find((c) => c.method === 'serveEval')!.resolve(undefined)
  await flush()
  return workers[1]!.calls.find((c) => c.method === 'runSolvePooled')!
}
const spineSolves = (w: Rec) => w.calls.filter((c) => c.method === 'runSolve')

describe('createResettableEngine — the pooled solve lane', () => {
  it('poolSize 3: ONE coordinator + three eval workers per solve; every port is served BEFORE the coordinator runs; the answer resolves and the lane is torn down — the spine untouched', async () => {
    const { workers, solve } = startPooled(3)
    expect(workers, 'the spine + a coordinator + three eval workers').toHaveLength(5)
    await flush()
    for (const w of workers.slice(2)) {
      expect(w.calls.map((c) => c.method)).toEqual(['serveEval'])
      expect(w.calls[0]!.args[0]).toBeInstanceOf(MessagePort)
    }
    expect(workers[1]!.calls, 'the coordinator waits for every port to be live').toHaveLength(0)
    const coord = await serveAll(workers)
    expect(coord.args[0]).toBe(REQ)
    const ports = coord.args[1] as MessagePort[]
    expect(ports).toHaveLength(3)
    for (const p of ports) expect(p).toBeInstanceOf(MessagePort)
    coord.resolve(ANSWER)
    await expect(solve).resolves.toBe(ANSWER)
    for (const w of workers.slice(1)) {
      expect(w.terminate).toHaveBeenCalledTimes(1)
      expect(w.release).toHaveBeenCalledTimes(1)
    }
    expect(workers[0]!.calls, 'the spine never saw the solve').toHaveLength(0)
    expect(workers[0]!.terminate).not.toHaveBeenCalled()
  })

  it('a pool member DEATH tears the lane down and retries ONCE on the spine — while a concurrent spine run resolves and later spine calls are not refused', async () => {
    const { workers, engine, solve } = startPooled(3)
    const headline = engine.run({} as never, 1)
    await flush()
    workers[3]!.onDeath('an eval worker died')
    for (const w of workers.slice(1)) expect(w.terminate).toHaveBeenCalledTimes(1)
    const spine = workers[0]!.calls
    expect(spine.map((c) => c.method)).toEqual(['run', 'runSolve'])
    expect(spine[1]!.args[0]).toBe(REQ)
    spine[1]!.resolve(SINGLE)
    await expect(solve).resolves.toBe(SINGLE)
    spine[0]!.resolve('the headline')
    await expect(headline).resolves.toBe('the headline')
    const later = engine.ping()
    workers[0]!.calls[2]!.resolve('pong')
    await expect(later).resolves.toBe('pong')
    // A second death on the torn-down lane is a no-op (no second retry).
    workers[2]!.onDeath('late')
    expect(spineSolves(workers[0]!)).toHaveLength(1)
  })

  it('the coordinator REJECTING (a transport failure) retries single-thread', async () => {
    const { workers, solve } = startPooled(2)
    const coord = await serveAll(workers)
    coord.reject(new Error('[evalPool] a pool lane failed: messageerror'))
    await flush()
    expect(spineSolves(workers[0]!)).toHaveLength(1)
    spineSolves(workers[0]!)[0]!.resolve(SINGLE)
    await expect(solve).resolves.toBe(SINGLE)
  })

  it('a serveEval REJECTING (an eval worker that never came up) retries single-thread', async () => {
    const { workers, solve } = startPooled(2)
    await flush()
    workers[2]!.calls[0]!.reject(new Error('chunk failed'))
    await flush()
    expect(workers[1]!.calls, 'the coordinator never ran').toHaveLength(0)
    spineSolves(workers[0]!)[0]!.resolve(SINGLE)
    await expect(solve).resolves.toBe(SINGLE)
  })

  it('a calm-error from the coordinator IS the answer — the same one the single worker gives; no retry', async () => {
    const { workers, solve } = startPooled(2)
    const coord = await serveAll(workers)
    const calm = { kind: 'calm-error', reason: 'engine error' } as never
    coord.resolve(calm)
    await expect(solve).resolves.toBe(calm)
    expect(workers[0]!.calls).toHaveLength(0)
  })

  it('a reset during a pooled solve rejects it with EngineResetError, tears the lane down, and never retries', async () => {
    const { workers, reset, solve } = startPooled(3)
    await flush()
    reset()
    await expect(solve).rejects.toSatisfy(isEngineReset)
    for (const w of workers.slice(1, 5)) expect(w.terminate).toHaveBeenCalledTimes(1)
    workers[2]!.onDeath('after the reset') // a member's death after the kill is a no-op
    await flush()
    expect(workers.flatMap(spineSolves), 'no single-thread retry after a reset').toHaveLength(0)
  })

  it('a spawn that THROWS partway tears down the members already spawned and runs the solve single-thread', async () => {
    // spawn 1 = the spine, 2 = the coordinator, 3 = an eval worker, 4 refuses.
    const { workers, solve } = startPooled(3, { throwOnSpawn: (n) => n === 4 })
    expect(workers).toHaveLength(3)
    expect(workers[1]!.terminate).toHaveBeenCalledTimes(1)
    expect(workers[2]!.terminate).toHaveBeenCalledTimes(1)
    spineSolves(workers[0]!)[0]!.resolve(SINGLE)
    await expect(solve).resolves.toBe(SINGLE)
  })

  it('poolSize < 2 is today’s path: no pool spawn, the solve runs on the spine worker', async () => {
    for (const poolSize of [0, 1]) {
      const { workers, solve } = startPooled(poolSize)
      expect(workers).toHaveLength(1)
      spineSolves(workers[0]!)[0]!.resolve(SINGLE)
      await expect(solve).resolves.toBe(SINGLE)
    }
  })
})

describe('poolSizeFor — every core but two, capped, and 0 when the pool would buy nothing', () => {
  it.each([
    [undefined, 0],
    [Number.NaN, 0],
    [1, 0],
    [2, 0],
    [3, 0],
    [4, 2],
    [8, 6],
    [20, 8],
    [64, 8],
  ] as const)('hardwareConcurrency %s ⇒ %i (cap 8)', (hc, p) => {
    expect(poolSizeFor(hc, 8)).toBe(p)
  })
  it('the cap is honored as given', () => {
    expect(poolSizeFor(20, 18)).toBe(18)
    expect(poolSizeFor(20, 12)).toBe(12)
  })
})
