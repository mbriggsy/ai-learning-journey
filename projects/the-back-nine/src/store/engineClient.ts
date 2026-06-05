/**
 * Main-thread handle to the engine worker (Comlink).
 *
 * EAGER, module-level singleton (ai-journey-stats/003 generalized): created at
 * module evaluation, NEVER lazily inside a React render path. A handle minted
 * during render desyncs from React's snapshot/`use()` guarantees and the bug is
 * runtime-only (typecheck stays green) — so it must be created here, once.
 *
 * One long-lived worker, reused across recomputes: the future solve compute
 * budget (P4) is measured against reuse, not per-run spawn (P1·U1 worker
 * contract). U1 adds the main-thread fallback when worker construction fails.
 *
 * The worker URL is a STATIC RELATIVE literal so Vite/Rolldown can statically
 * detect it and emit the worker as its own hashed chunk (aliases are not
 * reliably resolved inside `new URL(...)` worker detection). The *type* is
 * imported via the @engine alias — store may import engine; engine may never
 * import store (ESLint layer boundary).
 */
import * as Comlink from 'comlink'
import type { EngineApi } from '@engine/engine.worker'

const worker = new Worker(new URL('../engine/engine.worker.ts', import.meta.url), {
  type: 'module',
})

/** Comlink proxy to the engine worker. Await its methods from the main thread. */
export const engine = Comlink.wrap<EngineApi>(worker)
