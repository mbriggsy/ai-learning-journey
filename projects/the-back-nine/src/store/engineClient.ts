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
 * One long-lived worker, reused across recomputes: the future solve compute
 * budget (P4) is measured against reuse, not per-run spawn (P1·U1 worker
 * contract).
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
 * are the P2/P3 surfaces via `memoryModel`.
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
import type { EngineApi } from '@engine/engineProtocol'

/** The promise-flavored view of the engine api (a Comlink Remote promisifies
 *  every method; the main-thread shim matches it so callers never branch). */
export type EngineHandle = {
  readonly [K in keyof EngineApi]: EngineApi[K] extends (...args: infer A) => infer R
    ? (...args: A) => Promise<Awaited<R>>
    : never
}

export interface EngineClient {
  readonly engine: EngineHandle
  /** False ⇒ the main-thread fallback is live: every run blocks the event loop,
   *  so per-commit recomputes must defer past the step-transition paint
   *  (phase-2 cross-cutting #6). */
  readonly runningInWorker: boolean
}

/** Main-thread shim: same surface, engine loaded on demand. Module-scoped cache
 *  so the engine module is fetched once. */
function mainThreadHandle(): EngineHandle {
  let apiPromise: Promise<EngineApi> | null = null
  const api = () => (apiPromise ??= import('@engine/engineProtocol').then((m) => m.engineApi))
  return {
    ping: async () => (await api()).ping(),
    run: async (params, seed) => (await api()).run(params, seed),
    setLatestEpoch: async (epoch) => (await api()).setLatestEpoch(epoch),
    runDateSearch: async (input, seed, tier, requestEpoch) =>
      (await api()).runDateSearch(input, seed, tier, requestEpoch),
  }
}

function construct(): EngineClient {
  try {
    const worker = new Worker(new URL('../engine/engine.worker.ts', import.meta.url), {
      type: 'module',
    })
    return { engine: Comlink.wrap<EngineApi>(worker) as unknown as EngineHandle, runningInWorker: true }
  } catch {
    return { engine: mainThreadHandle(), runningInWorker: false }
  }
}

/** The one engine client (worker if constructible, main-thread shim if not). */
export const engineClient: EngineClient = construct()

/** Comlink-style proxy to the engine. Await its methods from the main thread.
 *  (Kept as a named export for existing consumers; identical to
 *  `engineClient.engine`.) */
export const engine = engineClient.engine
