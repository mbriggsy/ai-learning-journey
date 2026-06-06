/**
 * The engine worker PROTOCOL — the WORKER-SIDE pack logic + the exposed API object,
 * kept separate from the worker bootstrap (engine.worker.ts) so it has NO
 * `Comlink.expose` side-effect and is unit-testable in a plain (non-worker)
 * environment. This module imports the compute engine (simulate/confidence) and so
 * belongs to the WORKER chunk only; the main-thread unpack lives in engineWire.ts (which
 * imports no compute), keeping the worker boundary structural.
 *
 * `Comlink.transfer` only tags the payload (no `self` access), so this module is safe to
 * import outside a worker (for tests). Engine purity (ESLint-enforced): reads NO clock,
 * entropy, or environment; the seed is INJECTED by the caller.
 */
import * as Comlink from 'comlink'
import { simulate } from '@engine/simulate'
import { summarize } from '@engine/confidence'
import type { SimulationParams } from '@shared/model'
import type { EngineWire } from '@engine/engineWire'

// Re-export the wire contract so worker-side code has one import surface.
export type { ResolvedWire, EngineWire, EngineResult } from '@engine/engineWire'
export { fromWire } from '@engine/engineWire'

/**
 * Run the engine and PACK the result into wire form. Total: any unexpected throw is
 * caught and returned as `calm-error` (the worker never dies).
 */
export function runEngine(params: SimulationParams, seed: number): EngineWire {
  try {
    const result = summarize(simulate(params, seed), params, seed)
    return {
      kind: 'resolved',
      terminalValuesReal: Float64Array.from(result.distribution.terminalValuesReal),
      depletionYears: Int32Array.from(result.distribution.depletionYears),
      survivalFraction: result.distribution.survivalFraction,
      headline: result.headline,
      dollar: result.dollar,
      seed: result.seed,
    }
  } catch (e) {
    return { kind: 'calm-error', reason: e instanceof Error ? e.message : 'engine error' }
  }
}

/** The object the worker exposes over Comlink. */
export const engineApi = {
  /** Liveness probe (a cheap worker round-trip). */
  ping(): 'pong' {
    return 'pong'
  },
  /** Run a simulation and return the reading, transferring the big buffers. */
  run(params: SimulationParams, seed: number): EngineWire {
    const wire = runEngine(params, seed)
    if (wire.kind === 'resolved') {
      // Transfer (detach) the two big buffers — the worker keeps none for reuse and
      // allocates fresh per run (protects the CRN path + the future K-candidate batch).
      return Comlink.transfer(wire, [wire.terminalValuesReal.buffer, wire.depletionYears.buffer])
    }
    return wire
  },
}

/** The shape the main-thread handle (src/store/engineClient.ts) wraps. */
export type EngineApi = typeof engineApi
