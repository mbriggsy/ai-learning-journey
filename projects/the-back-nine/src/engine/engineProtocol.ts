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
 * caught and returned as `calm-error` (the worker never dies). The typed INFEASIBLE
 * sentinel (M6) is dispatched BEFORE summarize — it has no distribution to read and is
 * not the indeterminate input-failure (summarize's parameter type excludes it).
 */
export function runEngine(
  params: SimulationParams,
  seed: number,
  options?: { readonly bandFan?: boolean; readonly survivorConditioned?: boolean },
): EngineWire {
  try {
    const out = simulate(params, seed, options)
    if (out.infeasible) return { kind: 'infeasible', reason: out.reason, pathIndex: out.pathIndex }
    const result = summarize(out, params, seed)
    const taxAware = result.distribution.taxAware
    return {
      kind: 'resolved',
      terminalValuesReal: Float64Array.from(result.distribution.terminalValuesReal),
      depletionYears: Int32Array.from(result.distribution.depletionYears),
      survivalFraction: result.distribution.survivalFraction,
      headline: result.headline,
      dollar: result.dollar,
      seed: result.seed,
      // The M6 per-path solver surfaces ride as six more transferable Float64 buffers,
      // present iff the run carried the overlay (the same presence key as the value model).
      ...(taxAware
        ? {
            taxAware: {
              lifetimeTaxPaidReal: Float64Array.from(taxAware.lifetimeTaxPaidReal),
              terminalTaxableReal: Float64Array.from(taxAware.terminalTaxableReal),
              terminalPretaxReal: Float64Array.from(taxAware.terminalPretaxReal),
              terminalRothReal: Float64Array.from(taxAware.terminalRothReal),
              terminalHsaReal: Float64Array.from(taxAware.terminalHsaReal),
              terminalTaxableBasisReal: Float64Array.from(taxAware.terminalTaxableBasisReal),
            },
          }
        : {}),
      // The U6/U7 per-year percentile fan — present iff the run opted in (the `bandFan`
      // option, requested only by the single spine headline run, never the date sweep).
      // A compact years×6 STRUCTURED-CLONE payload: it must NEVER join the `run` transfer
      // list below (that list is for detachable buffers only). Mirrors taxAware's presence key.
      ...(result.distribution.bandFan ? { bandFan: result.distribution.bandFan } : {}),
      // The U7 survivor surfaces — present iff the run opted in (the `survivorConditioned` option,
      // the single spine headline run only) AND ≥ 1 survivor phase. Both compact: they ride the
      // resolved wire by STRUCTURED CLONE and must NEVER join the `run` transfer list below.
      ...(result.distribution.survivorConditioned ? { survivorConditioned: result.distribution.survivorConditioned } : {}),
      ...(result.survivorReading ? { survivorReading: result.survivorReading } : {}),
      // P3·U9 — the floor track (param-driven presence): the paths-length depletion array
      // packs as a transferable Int32Array (its buffer joins the enumerated transfer list
      // in `run` below); the verdict rides by clone beside the survivor reading.
      ...(result.distribution.floor
        ? {
            floor: {
              survivalFraction: result.distribution.floor.survivalFraction,
              depletionYears: Int32Array.from(result.distribution.floor.depletionYears),
            },
          }
        : {}),
      ...(result.floorReading ? { floorReading: result.floorReading } : {}),
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
  // The SYMMETRIC twin of setLatestEpoch's guard (insight 010): a NaN REQUEST epoch makes the
  // gate's `requestEpoch >= latestEpoch` false on the very first check — every sweep would
  // return a silent 'cancelled' (a permanently-spinning UI, no diagnostic), masquerading as
  // cooperative cancellation. Reject it as a defined input failure HERE, the impurity-adjacent
  // seam — the pure sweep deliberately knows only the injected `shouldContinue` and cannot
  // distinguish "NaN epoch" from a legitimate "newer request" cancel.
  if (!Number.isFinite(requestEpoch)) {
    return {
      kind: 'date-search',
      outcome: { kind: 'input-failure', reason: `requestEpoch must be finite (got ${requestEpoch})` },
    }
  }
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
  /** Run a simulation and return the reading, transferring the big buffers. `options.bandFan`
   *  opts the single spine headline run into the per-year percentile fan (U6/U7 band INPUT) —
   *  it rides the resolved wire by structured clone (not a transferable). */
  run(params: SimulationParams, seed: number, options?: { readonly bandFan?: boolean; readonly survivorConditioned?: boolean }): EngineWire {
    const wire = runEngine(params, seed, options)
    if (wire.kind === 'resolved') {
      // Transfer (detach) the big buffers — the worker keeps none for reuse and allocates
      // fresh per run (protects the CRN path + the future K-candidate batch). The M6
      // taxAware buffers join the list explicitly when present (an enumerated list, never
      // Object.values — a non-buffer field added later must not silently join a transfer).
      const buffers = [wire.terminalValuesReal.buffer, wire.depletionYears.buffer]
      if (wire.taxAware) {
        buffers.push(
          wire.taxAware.lifetimeTaxPaidReal.buffer,
          wire.taxAware.terminalTaxableReal.buffer,
          wire.taxAware.terminalPretaxReal.buffer,
          wire.taxAware.terminalRothReal.buffer,
          wire.taxAware.terminalHsaReal.buffer,
          wire.taxAware.terminalTaxableBasisReal.buffer,
        )
      }
      // P3·U9 — the floor track's paths-length depletion buffer joins the enumerated list
      // (its sibling fields — the fraction, the floorReading — stay structured clone).
      if (wire.floor) buffers.push(wire.floor.depletionYears.buffer)
      return Comlink.transfer(wire, buffers)
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
