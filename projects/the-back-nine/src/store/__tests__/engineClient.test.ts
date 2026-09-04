import { describe, expect, it, vi, type Mock } from 'vitest'
import {
  createResettableEngine,
  EngineDeadError,
  EngineResetError,
  isEngineReset,
  type EngineHandle,
  type SpawnedEngine,
  type SpawnEngine,
} from '../engineClient'

/**
 * The resettable forwarding handle (the solve-lane cancel, ranked item 5) — pinned on a fake spawn
 * whose remote calls NEVER settle on their own, which is exactly the Comlink-after-terminate shape
 * (`requestResponseMessage` has no reject arm). Every guarantee the store's catch arms lean on is a
 * planted-fail arm here: a reset REJECTS every in-flight call (a design that resolved them with
 * undefined would render a compute-error for the household's own edit); a settled call leaves the
 * in-flight set so no result is retained for the generation's life; a spawn that throws on reset
 * keeps the old worker and never throws out of `update()`; a worker death settles calls with a
 * DIFFERENT error than a reset so the store can tell hold from compute-error.
 */

type Rec = {
  terminate: Mock<() => void>
  release: Mock<() => void>
  onDeath: (detail: string) => void
  /** Resolvers for every call made on this worker, in order — a test settles one to prove routing. */
  settle: Array<(v: unknown) => void>
}

function fakeSpawn(opts?: { throwOnSpawn?: (n: number) => boolean; syncThrow?: boolean }) {
  const spawns: Rec[] = []
  let n = 0
  const spawn: SpawnEngine = (onDeath) => {
    n += 1
    if (opts?.throwOnSpawn?.(n)) throw new Error(`spawn ${n} refused`)
    const settle: Rec['settle'] = []
    const never = () =>
      new Promise<never>((resolve) => {
        settle.push(resolve as (v: unknown) => void)
      })
    const ping = opts?.syncThrow
      ? () => {
          throw new Error('boom')
        }
      : never
    const remote = { ping, run: never, setLatestEpoch: never, runDateSearch: never, runTwoArm: never, runSolve: never } as unknown as EngineHandle
    const rec: Rec = { terminate: vi.fn<() => void>(), release: vi.fn<() => void>(), onDeath, settle }
    spawns.push(rec)
    const spawned: SpawnedEngine = { remote, terminate: rec.terminate, release: rec.release }
    return spawned
  }
  return { spawn, spawns }
}

describe('createResettableEngine — reset() settles what a terminated worker never would', () => {
  it('an in-flight call REJECTS with EngineResetError on reset — never resolves with undefined', async () => {
    const { spawn, spawns } = fakeSpawn()
    const { engine, reset } = createResettableEngine(spawn)
    const inFlight = engine.ping()
    reset()
    // `rejects` is the planted-fail arm for the design pass's derivative bug: a handle that settled
    // killed calls with undefined would make the store render a compute-error for the edit.
    await expect(inFlight).rejects.toSatisfy(isEngineReset)
    expect(spawns).toHaveLength(2)
    expect(spawns[0]!.terminate).toHaveBeenCalledTimes(1)
    expect(spawns[0]!.release).toHaveBeenCalledTimes(1)
    expect(spawns[1]!.terminate).not.toHaveBeenCalled()
  })

  it('runSolve — the lane this handle exists for — is raced too: a killed solve rejects with EngineResetError', async () => {
    const { spawn, spawns } = fakeSpawn()
    const { engine, reset } = createResettableEngine(spawn)
    const solve = engine.runSolve({} as never)
    expect(spawns[0]!.settle).toHaveLength(1)
    reset()
    await expect(solve).rejects.toSatisfy(isEngineReset)
  })

  it('after a reset, calls route to the NEW worker and settle normally', async () => {
    const { spawn, spawns } = fakeSpawn()
    const { engine, reset } = createResettableEngine(spawn)
    reset()
    const p = engine.ping()
    expect(spawns[1]!.settle).toHaveLength(1) // the call landed on generation 2
    spawns[1]!.settle[0]!('pong')
    await expect(p).resolves.toBe('pong')
  })

  it('a reset with nothing in flight is silent — no unhandled rejection (vitest would fail the run)', () => {
    const { spawn } = fakeSpawn()
    const { reset } = createResettableEngine(spawn)
    reset()
    reset()
  })

  it('a spawn that THROWS on reset keeps the old worker live and never throws out of the caller', async () => {
    const { spawn, spawns } = fakeSpawn({ throwOnSpawn: (n) => n === 2 })
    const { engine, reset } = createResettableEngine(spawn)
    const inFlight = engine.ping()
    expect(() => reset()).not.toThrow()
    expect(spawns[0]!.terminate).not.toHaveBeenCalled() // degraded, never bricked: the old worker stays
    spawns[0]!.settle[0]!('pong')
    await expect(inFlight).resolves.toBe('pong') // its in-flight call still settles on its own worker
    const later = engine.ping()
    spawns[0]!.settle[1]!('pong')
    await expect(later).resolves.toBe('pong') // and later calls still route to it — no released proxy
  })

  it('a worker DEATH rejects the in-flight call with EngineDeadError (NOT a reset), later calls reject at once, and a reset revives', async () => {
    const { spawn, spawns } = fakeSpawn()
    const { engine, reset } = createResettableEngine(spawn)
    const inFlight = engine.run({} as never, 1)
    spawns[0]!.onDeath('chunk failed to load')
    await expect(inFlight).rejects.toBeInstanceOf(EngineDeadError)
    await expect(inFlight).rejects.toSatisfy((e) => !isEngineReset(e)) // the store must NOT hold on this
    await expect(engine.ping()).rejects.toBeInstanceOf(EngineDeadError) // never a forever-hang on a dead worker
    reset()
    const revived = engine.ping()
    spawns[1]!.settle[0]!('pong')
    await expect(revived).resolves.toBe('pong')
  })

  it('a synchronous throw inside the remote becomes a rejection, never a sync throw past the caller', async () => {
    const { spawn } = fakeSpawn({ syncThrow: true })
    const { engine, inFlight } = createResettableEngine(spawn)
    let p: Promise<unknown> | undefined
    expect(() => {
      p = engine.ping()
    }).not.toThrow()
    await expect(p).rejects.toThrow('boom')
    // The executor would reject on its own; what the explicit catch buys is that the rejecter LEAVES
    // the in-flight set on this path too — never a stale entry a later reset would poke.
    expect(inFlight()).toBe(0)
  })

  it('the FIRST spawn throwing propagates — construct() turns that into the main-thread fallback', () => {
    expect(() =>
      createResettableEngine(() => {
        throw new Error('no Worker')
      }),
    ).toThrow()
  })

  it('EngineResetError and EngineDeadError are distinguishable by isEngineReset alone', () => {
    expect(isEngineReset(new EngineResetError())).toBe(true)
    expect(isEngineReset(new EngineDeadError('x'))).toBe(false)
    expect(isEngineReset(new Error('x'))).toBe(false)
  })
})

describe('createResettableEngine — every forwarded method, generations, ordering, retention', () => {
  const METHODS = ['ping', 'run', 'setLatestEpoch', 'runDateSearch', 'runTwoArm', 'runSolve'] as const

  it.each(METHODS)('%s in flight rejects with EngineResetError on reset — no method escapes the kill', async (method) => {
    const { spawn, spawns } = fakeSpawn()
    const { engine, reset } = createResettableEngine(spawn)
    const call = (engine[method] as (...a: never[]) => Promise<unknown>)()
    expect(spawns[0]!.settle).toHaveLength(1)
    reset()
    await expect(call).rejects.toSatisfy(isEngineReset)
  })

  it('two kills in one session: each in-flight call rejects on its own generation, and generation 3 serves', async () => {
    const { spawn, spawns } = fakeSpawn()
    const { engine, reset } = createResettableEngine(spawn)
    const first = engine.ping()
    reset()
    const second = engine.ping()
    reset()
    await expect(first).rejects.toSatisfy(isEngineReset)
    await expect(second).rejects.toSatisfy(isEngineReset)
    expect(spawns).toHaveLength(3)
    const third = engine.ping()
    spawns[2]!.settle[0]!('pong')
    await expect(third).resolves.toBe('pong')
  })

  it('a settled call LEAVES the in-flight set — a result is never retained by a pending signal (the leak the race shape had)', async () => {
    const { spawn, spawns } = fakeSpawn()
    const { engine, inFlight } = createResettableEngine(spawn)
    const a = engine.ping()
    const b = engine.run({} as never, 1)
    expect(inFlight()).toBe(2)
    spawns[0]!.settle[0]!('pong')
    await a
    expect(inFlight()).toBe(1)
    spawns[0]!.settle[1]!({ kind: 'calm-error', reason: 'x' })
    await b
    expect(inFlight()).toBe(0)
  })

  it('a reset with nothing in flight leaves nothing behind and the next call serves on the fresh generation', async () => {
    const { spawn, spawns } = fakeSpawn()
    const { engine, reset, inFlight } = createResettableEngine(spawn)
    reset()
    reset()
    expect(inFlight()).toBe(0)
    const p = engine.ping()
    expect(spawns).toHaveLength(3)
    spawns[2]!.settle[0]!('pong')
    await expect(p).resolves.toBe('pong')
  })

  it('reset terminates the old worker BEFORE releasing its proxy (a RELEASE posted to a live worker would be answered)', () => {
    const order: string[] = []
    const spawn: SpawnEngine = () => ({
      remote: { ping: () => new Promise<never>(() => {}) } as unknown as EngineHandle,
      terminate: () => {
        order.push('terminate')
      },
      release: () => {
        order.push('release')
      },
    })
    const { reset } = createResettableEngine(spawn)
    reset()
    expect(order).toEqual(['terminate', 'release'])
  })
})
