/**
 * Engine worker entry — the Comlink boundary for the pure Monte Carlo engine.
 *
 * U0 SCAFFOLD STUB. It exposes only a liveness probe so a clean build emits and
 * precaches a hashed worker chunk and the main-thread Comlink wiring is proven
 * end-to-end. U1 replaces the stub body with the real engine (simulate.ts):
 * `simulate(params, seed)` returning the terminal-value distribution.
 *
 * Engine purity (ESLint-enforced in src/engine/**): this entry reads NO clock,
 * entropy source, or environment. The 32-bit seed is INJECTED by the caller
 * (the P2 memoryModel orchestration layer), never generated here.
 */
import * as Comlink from 'comlink'

const engineApi = {
  /** Liveness probe — U0 only. Replaced by `simulate(params, seed)` in U1. */
  ping(): 'pong' {
    return 'pong'
  },
}

/** The shape the main-thread handle (src/store/engineClient.ts) wraps. */
export type EngineApi = typeof engineApi

Comlink.expose(engineApi)
