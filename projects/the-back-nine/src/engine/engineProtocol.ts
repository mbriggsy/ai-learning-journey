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
import { runDateSearch as sweepDateSearch, type DateSearchInput } from '@engine/dateSearch'
import type { DateSearchTier, SimulationParams } from '@shared/model'
import type { DateSearchWire, EngineWire } from '@engine/engineWire'

// Re-export the wire contract so worker-side code has one import surface.
export type { ResolvedWire, EngineWire, EngineResult, DateSearchWire, DateSearchResult } from '@engine/engineWire'
export { fromWire, dateSearchFromWire } from '@engine/engineWire'

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

// ---------------------------------------------------------------------------
// The date-search cancellation epoch (C3 §3 — the worker seam). The request epoch is a
// MAIN-THREAD construct (phase-2 cross-cutting contract #1f: `memoryModel` mints a
// monotonic epoch per recompute/lock and discards any result older than the latest
// committed one) — but result-discard alone cannot STOP a sweep already running worker-
// side. The transport is `engineApi.setLatestEpoch(epoch)`: memoryModel calls it on every
// lock/refire, writing this module-level latest; an in-flight sweep's gate compares its
// own request epoch against it between candidate runs. SharedArrayBuffer/Atomics polling
// is REJECTED (it requires cross-origin-isolation COOP/COEP headers — a vercel.json
// security-posture change out of scope).
// ---------------------------------------------------------------------------
let latestEpoch = Number.NEGATIVE_INFINITY

/** A REAL macrotask yield (setTimeout 0 — message events are tasks). LOAD-BEARING, not
 *  style: a synchronous candidate loop starves the worker's message queue, so no
 *  `setLatestEpoch` call could ever land mid-sweep and cancellation would be impossible.
 *  A microtask (`await Promise.resolve()`) does NOT yield to message events. */
const macrotaskYield = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0))

/**
 * Run the date-search and PACK the outcome into wire form. Total: any unexpected throw is
 * caught and returned as `calm-error` (the worker never dies mid-sweep — `runEngine`'s
 * contract). The sweep itself stays PURE (`dateSearch.ts` takes the injected
 * `shouldContinue`, the same injected-dependency shape as the seed); THIS layer owns the
 * impurity-adjacent scheduling (the macrotask yield) and the epoch compare.
 */
export async function runDateSearchEngine(
  input: DateSearchInput,
  seed: number,
  tier: DateSearchTier,
  requestEpoch: number,
): Promise<DateSearchWire> {
  try {
    const outcome = await sweepDateSearch(input, seed, {
      tier,
      shouldContinue: async () => {
        await macrotaskYield()
        return requestEpoch >= latestEpoch
      },
    })
    return { kind: 'date-search', outcome }
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
  /** Record the latest committed request epoch (C3 cancellation — see the module note).
   *  MONOTONIC: an out-of-order Comlink message can never roll the latest back and
   *  resurrect a stale sweep. Non-finite epochs are ignored (insight 010 — a NaN would
   *  make every `>=` compare false and silently cancel ALL future sweeps). */
  setLatestEpoch(epoch: number): void {
    if (Number.isFinite(epoch) && epoch > latestEpoch) latestEpoch = epoch
  },
  /** Run the date-search sweep (C3). The result crosses by structured clone (≤ ~11-point
   *  curves — no transferables needed; see `DateSearchWire`). `requestEpoch` is THIS
   *  request's epoch: the sweep cooperatively cancels when a newer epoch is committed. */
  runDateSearch(input: DateSearchInput, seed: number, tier: DateSearchTier, requestEpoch: number): Promise<DateSearchWire> {
    return runDateSearchEngine(input, seed, tier, requestEpoch)
  },
}

/** The shape the main-thread handle (src/store/engineClient.ts) wraps. */
export type EngineApi = typeof engineApi
