/**
 * Main-thread handle to the engine worker (Comlink).
 *
 * EAGER, module-level singleton (ai-journey-stats/003 generalized): created at
 * module evaluation, NEVER lazily inside a React render path. A handle minted
 * during render desyncs from React's snapshot/`use()` guarantees and the bug is
 * runtime-only (typecheck stays green) — so it must be created here, once.
 * Module evaluation runs once per page, so the handle inherently survives
 * StrictMode's dev double-mount (phase-2 contract #1a).
 *
 * One long-lived SPINE worker, reused across recomputes: the future solve compute
 * budget (P4) is measured against reuse, not per-run spawn (P1·U1 worker
 * contract). THE ONE EXCEPTION is the solve (the worker pool, 2026-10-03 — Briggsy's ruling
 * amends U16 §S1's one-worker rule for that lane alone): with `poolSize` ≥ 2 each solve spawns
 * its OWN lane — one coordinator + `poolSize` eval workers — beside the spine, and tears it down
 * when the solve settles (see {@link runPooledSolve}). The spine worker stays the only long-lived
 * one, and nothing below about resets of the spine is changed by the pool.
 *
 * THE RESETTABLE HANDLE (2026-09-03, ranked item 5 — the solve-lane cancel). The worker's
 * `runSolve` is ONE synchronous call: there is no yield point anywhere in src/engine/solver, and
 * the cooperative seam's `ShouldAbort` predicate cannot even cross the structured clone — so a
 * minutes-long solve starves the message port, and a draft edit made while it runs leaves its own
 * headline recompute queued BEHIND a solve that now describes a superseded household. The only
 * cancel that exists for a synchronous worker script is `worker.terminate()`. So the handle the
 * store holds is a stable FORWARDING handle over a replaceable worker: `reset()` kills the current
 * worker and spawns the next — SEQUENTIAL, never two live SPINE workers (U16 §S1's "one worker,
 * queue discipline" holds for the spine in letter and in rationale: zero bundle cost, a lifecycle cost
 * paid only on an actual edit-during-pending; the spec carries the dated note). A reset also kills
 * every pooled solve lane in flight (EngineResetError, never a retry). Comlink's call promises NEVER
 * settle after a terminate (`requestResponseMessage` has no reject arm), so every forwarded call
 * registers its rejecter in the generation's in-flight set and a reset rejects them all with
 * {@link EngineResetError} — which the handle only makes DISTINGUISHABLE; each consumer owns its
 * hold (memoryModel's lanes hold; controlPreview renders its calm error arm — see the class doc).
 * A set that empties as each call settles, NOT a `Promise.race` against a never-settling signal:
 * a race retains every settled result through the signal's reaction list for the generation's
 * whole life (measured: ~10× the array-buffer heap over ten dropped headline payloads). A
 * worker that DIES (its chunk fails to load, an uncaught throw) rejects the same signal with
 * {@link EngineDeadError} instead — NOT a reset — so those calls settle as the calm compute-error
 * mode rather than hanging forever (the pre-existing hazard, now multiplied by every respawn).
 *
 * TOTALITY. `reset()` never throws out of the store's `update()` (it runs inside a React event
 * handler): the next worker is spawned FIRST and the swap happens only if that succeeds — a failed
 * spawn keeps the old worker (degraded: its solve keeps burning and the recompute queues behind
 * it, exactly the pre-reset world; never a released proxy whose next property access throws
 * synchronously). `forward` catches a synchronous throw inside the proxy into a rejection the
 * store's catch arms already handle. The handle is an object LITERAL typed
 * `EngineHandle`, never a key loop over a hand-kept list: a method added to `EngineApi` that is
 * not forwarded is a compile error, not a call that silently escapes the reset race.
 *
 * THE MAIN-THREAD FALLBACK (phase-2 contract #1c, the U1 deferred item — built
 * here with its first consumer, memoryModel): if `new Worker(...)` THROWS at
 * construction (no Worker global; a future Trusted-Types regime — see
 * docs/insights/002 — or an exotic embedder), the client falls back to running
 * the engine on the main thread so the first answer still renders. The fallback
 * shim DYNAMICALLY imports `engineProtocol` (import-safe outside a worker by
 * design) so the ~90 KiB engine stays out of the entry chunk unless the
 * fallback actually fires — `verify:bundle` guards the budget. The
 * `runningInWorker` flag is set HERE at construction (never inside src/engine);
 * its downstream consumers (defer-recompute-past-paint, disable live recompute)
 * are the P2/P3 surfaces via `memoryModel`. The fallback's `reset` is a no-op:
 * there is no worker to kill, and the store's epoch advance alone holds a
 * superseded solve's late resolve there.
 *
 * NOTE: construction failure ≠ runtime failure. A worker that constructs but
 * later errors surfaces per-call through the wire's calm-error arm — that path
 * stays a calm compute-error render mode, not a fallback switch.
 *
 * The worker URL is a STATIC RELATIVE literal so Vite/Rolldown can statically
 * detect it and emit the worker as its own hashed chunk (aliases are not
 * reliably resolved inside `new URL(...)` worker detection). The *type* is
 * imported via the @engine alias — store may import engine; engine may never
 * import store (ESLint layer boundary).
 */
import * as Comlink from 'comlink'
import type { EngineApi, PoolApi } from '@engine/engineProtocol'

/** A Comlink Remote's promise-flavored view of an api object. */
type Promisified<T> = {
  readonly [K in keyof T]: T[K] extends (...args: infer A) => infer R ? (...args: A) => Promise<Awaited<R>> : never
}

/** The promise-flavored view of the engine api (a Comlink Remote promisifies
 *  every method; the main-thread shim matches it so callers never branch). */
export type EngineHandle = Promisified<EngineApi>
/** The pool's two worker methods (`serveEval`, `runSolvePooled`) — on every spawned worker, never on
 *  the spine handle consumers hold. */
export type PoolHandle = Promisified<PoolApi>

export interface EngineClient {
  readonly engine: EngineHandle
  /** False ⇒ the main-thread fallback is live: every run blocks the event loop,
   *  so per-commit recomputes must defer past the step-transition paint
   *  (phase-2 cross-cutting #6). */
  readonly runningInWorker: boolean
  /** Kill the current worker and spawn the next (sequential — one worker at a time). Every call in
   *  flight rejects with {@link EngineResetError} (memoryModel's lanes hold on it; controlPreview
   *  renders its calm error arm — each consumer decides). A no-op on the main-thread fallback. NEVER
   *  throws (it runs inside the store's `update()`). */
  readonly reset: () => void
}

/** A call the caller's own reset killed. The handle only makes it DISTINGUISHABLE — each consumer
 *  owns its hold: memoryModel's three lanes never render it as an error (`recompute()` returns on
 *  it; `dispatchSpend` catches it into the figure-less idle, committed only while its epoch guard
 *  stands; `dispatchSolve` is held by the epoch the kill advanced first); `controlPreview`
 *  deliberately does — a reset-killed preview takes its calm error arm, because mapping it to
 *  'stale' would strand an open sheet on pending, and the sheet re-idles on its next open. A new
 *  consumer must decide, never assume. */
export class EngineResetError extends Error {
  constructor() {
    super('engine reset: the in-flight call was superseded by a draft edit')
    this.name = 'EngineResetError'
  }
}
export const isEngineReset = (e: unknown): e is EngineResetError => e instanceof EngineResetError

/** The worker died (a failed chunk load, an uncaught throw) — NOT a reset: the store's normal catch
 *  arms render the calm compute-error mode instead of hanging on a promise that can never settle. */
export class EngineDeadError extends Error {
  constructor(detail: string) {
    super(`engine worker died: ${detail}`)
    this.name = 'EngineDeadError'
  }
}

/** What a spawn returns: the Comlink remote plus its two lifecycle hooks. */
export interface SpawnedEngine {
  readonly remote: EngineHandle & PoolHandle
  readonly terminate: () => void
  readonly release: () => void
}
/** Spawn one worker. `onDeath` is the death channel the spawn wires to the worker's
 *  `error` / `messageerror` events; calling it settles every call on that worker. */
export type SpawnEngine = (onDeath: (detail: string) => void) => SpawnedEngine

interface Generation {
  spawned: SpawnedEngine
  /** The rejecter of every call still in flight on this worker. A call REMOVES itself as it settles,
   *  so a settled result is never retained by a pending signal's reaction (the `Promise.race`
   *  shape this replaced pinned every payload for the generation's life). */
  readonly inFlight: Set<(e: Error) => void>
  /** Set by the death channel (or a reset): later calls reject with it at once — never a hang. */
  dead: Error | null
}

/** Settle every call in flight on a generation with one error, and refuse the ones to come.
 *  Idempotent: the first settlement wins (a death after a reset is a no-op). */
function settle(gen: Generation, error: Error): void {
  if (gen.dead !== null) return
  gen.dead = error
  for (const reject of gen.inFlight) reject(error)
  gen.inFlight.clear()
}

/** Forward one call on a generation. TOTAL: a synchronous throw inside the proxy becomes a
 *  rejection, a dead generation rejects at once, and the rejecter leaves the in-flight set the
 *  moment the call settles on its own. */
function forward<T>(gen: Generation, call: () => Promise<T>): Promise<T> {
  if (gen.dead !== null) return Promise.reject(gen.dead)
  return new Promise<T>((resolve, reject) => {
    gen.inFlight.add(reject)
    const done = (): boolean => gen.inFlight.delete(reject)
    let pending: Promise<T>
    try {
      pending = call()
    } catch (e) {
      done()
      reject(e)
      return
    }
    pending.then(
      (v) => {
        done()
        resolve(v)
      },
      (e: unknown) => {
        done()
        reject(e)
      },
    )
  })
}

/** One pooled solve's lane — killed by a reset. */
interface PoolRun {
  readonly kill: () => void
}

/**
 * THE POOLED SOLVE LANE (the worker pool, commit 2; Briggsy's 2026-10-03 ruling — no phone / battery
 * throttling, crash-safety kept). Per solve: spawn ONE coordinator + `poolSize` eval workers through
 * the SAME `spawn` (one `new URL` literal), hand each eval worker one end of a `MessageChannel`
 * (`serveEval`, awaited so every port is live before the first task), then run the coordinator
 * (`runSolvePooled`) over the other ends. The lane NEVER touches the spine generation — `settle` or
 * `forward` on it would refuse the headline lane's later calls (the red team's fatal flaw in design A);
 * a concurrent `run` keeps flowing on the spine worker while the pool crunches.
 *
 * Settles exactly once:
 *  - the coordinator answers ⇒ tear the lane down, resolve (a `calm-error` IS an answer — the same one
 *    the single worker would give);
 *  - a member's death channel fires, a spawn throws, or a pool call rejects (a transport failure) ⇒
 *    tear the lane down, then retry ONCE through the spine's single-worker `runSolve` (byte-identical
 *    by the identity gate) — never a calm answer from a broken pool;
 *  - `kill()` (a reset) ⇒ tear the lane down, reject {@link EngineResetError}; no retry.
 */
function runPooledSolve(
  spawn: SpawnEngine,
  poolSize: number,
  request: Parameters<EngineHandle['runSolve']>[0],
  single: () => ReturnType<EngineHandle['runSolve']>,
  live: Set<PoolRun>,
): ReturnType<EngineHandle['runSolve']> {
  return new Promise((resolve, reject) => {
    const members: SpawnedEngine[] = []
    let done = false
    const teardown = (): void => {
      done = true
      live.delete(run)
      for (const m of members) {
        try {
          m.terminate()
        } catch {
          // nothing meaningful to fail on
        }
        try {
          m.release()
        } catch {
          // releaseProxy after terminate posts to nothing
        }
      }
    }
    const fallBack = (): void => {
      if (done) return
      teardown()
      single().then(resolve, reject)
    }
    const run: PoolRun = {
      kill: () => {
        if (done) return
        teardown()
        reject(new EngineResetError())
      },
    }
    live.add(run)
    try {
      for (let i = 0; i < poolSize + 1; i += 1) members.push(spawn(() => fallBack()))
    } catch {
      fallBack()
      return
    }
    const [coordinator, ...evals] = members as [SpawnedEngine, ...SpawnedEngine[]]
    Promise.resolve()
      .then(() => {
        const channels = evals.map(() => new MessageChannel())
        const serving = evals.map((w, i) => w.remote.serveEval(Comlink.transfer(channels[i]!.port2, [channels[i]!.port2])))
        const ports = channels.map((c) => c.port1)
        return Promise.all(serving).then(() => coordinator.remote.runSolvePooled(request, Comlink.transfer(ports, ports)))
      })
      .then(
        (wire) => {
          if (done) return
          teardown()
          resolve(wire)
        },
        () => fallBack(),
      )
  })
}

/**
 * The stable forwarding handle over a replaceable worker (pure — injectable spawn, unit-tested with
 * fakes). Throws only if the FIRST spawn throws (construct() catches that into the fallback).
 * `poolSize` ≥ 2 routes `runSolve` through {@link runPooledSolve}; below 2 the solve runs on the spine
 * worker exactly as before.
 */
export function createResettableEngine(
  spawn: SpawnEngine,
  opts?: { readonly poolSize?: number },
): {
  engine: EngineHandle
  reset: () => void
  /** DIAGNOSTIC (tests only): calls still in flight on the live generation — the leak this design
   *  prevents is observable nowhere else. */
  inFlight: () => number
} {
  const poolSize = opts?.poolSize ?? 0
  const pooled = new Set<PoolRun>()
  const arm = (): Generation | null => {
    const gen: Generation = { spawned: undefined as unknown as SpawnedEngine, inFlight: new Set(), dead: null }
    try {
      // The death channel settles the in-flight calls and refuses later ones; a death after a
      // reset is a no-op (`settle` is idempotent — the reset already marked the generation).
      gen.spawned = spawn((detail) => settle(gen, new EngineDeadError(detail)))
    } catch {
      return null
    }
    return gen
  }

  const first = arm()
  if (first === null) throw new Error('engine worker could not be constructed')
  let current: Generation = first

  // `current` is read ONCE per call and the remote is invoked synchronously inside `forward`, so a
  // reset can never split a call across two generations, and the date lane's setLatestEpoch →
  // runDateSearch order reaches the port unchanged (C3 (b)). An object LITERAL typed EngineHandle:
  // a method added to EngineApi that is not forwarded here is a compile error.
  const engine: EngineHandle = {
    ping: () => forward(current, () => current.spawned.remote.ping()),
    run: (params, seed, options) => forward(current, () => current.spawned.remote.run(params, seed, options)),
    setLatestEpoch: (epoch) => forward(current, () => current.spawned.remote.setLatestEpoch(epoch)),
    runDateSearch: (input, seed, tier, requestEpoch) =>
      forward(current, () => current.spawned.remote.runDateSearch(input, seed, tier, requestEpoch)),
    runSpendSolve: (params, seed, spineEpoch, spendEpoch) =>
      forward(current, () => current.spawned.remote.runSpendSolve(params, seed, spineEpoch, spendEpoch)),
    setLatestSpendEpoch: (epoch) => forward(current, () => current.spawned.remote.setLatestSpendEpoch(epoch)),
    runTwoArm: (base, seed, control) => forward(current, () => current.spawned.remote.runTwoArm(base, seed, control)),
    runSolve: (request) => {
      const single = () => forward(current, () => current.spawned.remote.runSolve(request))
      return poolSize >= 2 ? runPooledSolve(spawn, poolSize, request, single, pooled) : single()
    },
  }

  const reset = (): void => {
    // Every pooled solve is superseded too — killed first, whatever the spawn below does.
    for (const run of [...pooled]) run.kill()
    const next = arm()
    if (next === null) return // spawn failed: keep the old worker — degraded, never bricked
    const old = current
    current = next
    settle(old, new EngineResetError()) // every in-flight call rejects; a later death event on the old worker is a no-op
    try {
      old.spawned.terminate()
    } catch {
      // a terminate has nothing meaningful to fail on; never throw out of update()
    }
    try {
      old.spawned.release() // frees Comlink's pending-listener map (the serialized request it retains)
    } catch {
      // releaseProxy after terminate posts to nothing; a throw here is not the caller's problem
    }
  }

  return { engine, reset, inFlight: () => current.inFlight.size }
}

/** Main-thread shim: same surface, engine loaded on demand. Module-scoped cache
 *  so the engine module is fetched once. */
function mainThreadHandle(): EngineHandle {
  let apiPromise: Promise<EngineApi> | null = null
  const api = () => (apiPromise ??= import('@engine/engineProtocol').then((m) => m.engineApi))
  return {
    ping: async () => (await api()).ping(),
    run: async (params, seed, options) => (await api()).run(params, seed, options),
    setLatestEpoch: async (epoch) => (await api()).setLatestEpoch(epoch),
    runDateSearch: async (input, seed, tier, requestEpoch) =>
      (await api()).runDateSearch(input, seed, tier, requestEpoch),
    // The spend solve is NEVER dispatched on the fallback (memoryModel gates on runningInWorker —
    // a seconds-long solve would freeze the page); forwarded only so the handle stays total.
    runSpendSolve: async (params, seed, spineEpoch, spendEpoch) =>
      (await api()).runSpendSolve(params, seed, spineEpoch, spendEpoch),
    setLatestSpendEpoch: async (epoch) => (await api()).setLatestSpendEpoch(epoch),
    // P3·U10 — the two-arm control comparison. On the fallback this BLOCKS the main
    // thread for two full runs — exactly why the controls disable LIVE per-drag
    // recompute when `runningInWorker` is false (recompute on release only).
    runTwoArm: async (base, seed, control) => (await api()).runTwoArm(base, seed, control),
    // P4·U15 — the on-demand solve. On the fallback this BLOCKS the main thread for the whole
    // solve (the token mint + the K-candidate batch + the grade B-family); memoryModel dispatches
    // it off the paint the same way (the pending state renders first).
    runSolve: async (request) => (await api()).runSolve(request),
  }
}

/** One worker, wrapped — the spawn the resettable handle replays on every reset. */
const spawnWorker: SpawnEngine = (onDeath) => {
  const worker = new Worker(new URL('../engine/engine.worker.ts', import.meta.url), {
    type: 'module',
  })
  // The death channel: a chunk that fails to load, or an uncaught throw the worker never reports
  // through Comlink (which catches every call's own error into the calm wire arm).
  worker.addEventListener('error', (e) => onDeath(e.message || 'error'))
  worker.addEventListener('messageerror', () => onDeath('messageerror'))
  const remote = Comlink.wrap<EngineApi & PoolApi>(worker)
  return {
    remote: remote as unknown as EngineHandle & PoolHandle,
    terminate: () => worker.terminate(),
    release: () => {
      remote[Comlink.releaseProxy]()
    },
  }
}

/** The pool's ceiling on eval workers — MEASURED 2026-10-03 (`e2e/held/solve-pool.spec.ts`, his
 *  i7-12700H, 20 threads, Chrome 153, one session, 16,000 paths, every run bit-identical to sync):
 *  `healthnc` 613.5 s sync → 155.9 / 106.8 / 93.8 / 90.4 s at P = 4 / 8 / 12 / 18, its workers' heap
 *  644 / 821 / 999 / 1,254 MB (the sync worker alone peaks at 1,294 MB); `retired` 127.4 s →
 *  39.1 / 30.5 / 27.6 / 24.9 s. Past 12 the curve is flat (18 buys `healthnc` 3.4 s for +255 MB): the
 *  12700H's six P-cores × 2 threads are spent, and 12 leaves the OS and browser eight threads. */
export const POOL_CAP = 12

/** Eval workers for a solve: every logical core but two (the page's main thread and the spine worker,
 *  which keeps answering while a solve crunches), capped; under 2 the pool buys nothing over the
 *  single worker, so it is 0 and the solve runs where it always has. A missing / non-finite count is
 *  0. No phone or battery throttle — Briggsy's 2026-10-03 ruling. */
export function poolSizeFor(hardwareConcurrency: number | undefined, cap: number = POOL_CAP): number {
  if (hardwareConcurrency === undefined || !Number.isFinite(hardwareConcurrency)) return 0
  const p = Math.min(Math.floor(hardwareConcurrency) - 2, cap)
  return p >= 2 ? p : 0
}

function construct(): EngineClient {
  try {
    const poolSize = poolSizeFor(typeof navigator === 'undefined' ? undefined : navigator.hardwareConcurrency)
    const { engine, reset } = createResettableEngine(spawnWorker, { poolSize })
    return { engine, reset, runningInWorker: true }
  } catch {
    return { engine: mainThreadHandle(), reset: () => {}, runningInWorker: false }
  }
}

/** The one engine client (worker if constructible, main-thread shim if not). Every consumer reads
 *  `engineClient.engine` — a bare `engine` re-export used to sit here "for existing consumers" and
 *  had none (removed 2026-09-03). */
export const engineClient: EngineClient = construct()
