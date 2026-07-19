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
import { runTwoArm } from '@engine/roth'
import type { DateSearchTier, SimulationParams, TwoArmControl } from '@shared/model'
import type { DateSearchWire, EngineWire, SolveArmWire, SolveWire, TwoArmWire } from '@engine/engineWire'
import { solveWithMint, type SolvePayload, type SolveRequest } from '@engine/solver/solveEntry'
import type { SolveArm } from '@engine/solver/solve'

// Re-export the wire contract so worker-side code has one import surface.
export type { ResolvedWire, EngineWire, EngineResult, DateSearchWire, DateSearchResult, TwoArmWire, TwoArmResult, SolveWire, SolveResultView } from '@engine/engineWire'
export { fromWire, dateSearchFromWire, twoArmFromWire, solveFromWire } from '@engine/engineWire'

/**
 * Run the engine and PACK the result into wire form. Total: any unexpected throw is
 * caught and returned as `calm-error` (the worker never dies). The typed INFEASIBLE
 * sentinel (M6) is dispatched BEFORE summarize — it has no distribution to read and is
 * not the indeterminate input-failure (summarize's parameter type excludes it).
 */
export function runEngine(
  params: SimulationParams,
  seed: number,
  options?: { readonly bandFan?: boolean; readonly survivorConditioned?: boolean; readonly healthReadout?: boolean },
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
              lifetimeNetPremiumReal: Float64Array.from(taxAware.lifetimeNetPremiumReal),
              lifetimeMedicareCostReal: Float64Array.from(taxAware.lifetimeMedicareCostReal),
            },
          }
        : {}),
      // The U6/U7 per-year percentile fan — present iff the run opted in (the `bandFan`
      // option, requested only by the single spine headline run, never the date sweep).
      // A compact years×6 STRUCTURED-CLONE payload: it must NEVER join the `run` transfer
      // list below (that list is for detachable buffers only). Mirrors taxAware's presence key.
      ...(result.distribution.bandFan ? { bandFan: result.distribution.bandFan } : {}),
      // P3·U11 — the per-year healthcare readout series (the `healthReadout` option, present
      // iff opted in AND the overlay priced healthcare). Compact years×9 STRUCTURED-CLONE
      // payload — NEVER the transfer list (the bandFan discipline).
      ...(result.distribution.healthReadout ? { healthReadout: result.distribution.healthReadout } : {}),
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

/**
 * Run the U10 two-arm control comparison and PACK the outcome into wire form. Total:
 * any unexpected throw is caught and returned as `calm-error` (the worker never dies).
 * The outcome is COMPACT (headline/fan/scalar pairs — the per-path arrays never leave
 * the worker), so it crosses by structured clone with NO transfer list.
 */
export function runTwoArmEngine(base: SimulationParams, seed: number, control: TwoArmControl): TwoArmWire {
  try {
    return { kind: 'two-arm-result', outcome: runTwoArm(base, seed, control) }
  } catch (e) {
    return { kind: 'calm-error', reason: e instanceof Error ? e.message : 'engine error' }
  }
}

// ---------------------------------------------------------------------------
// The U15 solve wire pack (§S5 (4)). `solveWithMint` mints the oracle-cleared token worker-side (it
// cannot cross the wire — it is branded) and runs `solve()`; this layer packs the value model into the
// wire, transferring ONLY the three displayed arms' seed-B distribution buffers (the Act-1 transfer
// discipline at K-candidate scale — the pruned field's scalars ride by clone).
// ---------------------------------------------------------------------------

/** Pack one displayed arm's seed-B distribution into transferable typed-array buffers (the ResolvedWire
 *  discipline: Int32 for the −1 sentinel; Float64 for terminals + the tax-aware surfaces). */
function packArm(arm: SolveArm): SolveArmWire {
  const d = arm.distributionB
  const ta = d.taxAware
  return {
    id: arm.id,
    policy: arm.policy,
    conversion: arm.conversion,
    ...(arm.drawdownOrder !== undefined ? { drawdownOrder: arm.drawdownOrder } : {}),
    headlineStatisticB: arm.headlineStatisticB,
    survivalB: arm.survivalB,
    terminalValuesReal: Float64Array.from(d.terminalValuesReal),
    depletionYears: Int32Array.from(d.depletionYears),
    survivalFraction: d.survivalFraction,
    ...(ta
      ? {
          taxAware: {
            lifetimeTaxPaidReal: Float64Array.from(ta.lifetimeTaxPaidReal),
            terminalTaxableReal: Float64Array.from(ta.terminalTaxableReal),
            terminalPretaxReal: Float64Array.from(ta.terminalPretaxReal),
            terminalRothReal: Float64Array.from(ta.terminalRothReal),
            terminalHsaReal: Float64Array.from(ta.terminalHsaReal),
            terminalTaxableBasisReal: Float64Array.from(ta.terminalTaxableBasisReal),
            lifetimeNetPremiumReal: Float64Array.from(ta.lifetimeNetPremiumReal),
            lifetimeMedicareCostReal: Float64Array.from(ta.lifetimeMedicareCostReal),
          },
        }
      : {}),
    // P3·U9 — the essentials-floor track (param-driven presence): the paths-length depletion array
    // packs as a transferable Int32Array (its buffer joins the arm's transfer list in `armBuffers`);
    // the fraction rides by clone. Without this the floor track is SILENTLY dropped from the arm wire.
    ...(d.floor
      ? {
          floor: {
            survivalFraction: d.floor.survivalFraction,
            depletionYears: Int32Array.from(d.floor.depletionYears),
          },
        }
      : {}),
  }
}

/** Pack the solve payload into wire form — the recommended arm's three distributions become buffers;
 *  every other arm (refused / withheld / token-withheld / mint-failed) is plain data carried verbatim. */
export function packSolveWire(payload: SolvePayload): SolveWire {
  if (payload.kind !== 'recommended') return payload
  return {
    ...payload,
    winner: packArm(payload.winner),
    runnerUp: payload.runnerUp !== undefined ? packArm(payload.runnerUp) : undefined,
    noActionBaseline: packArm(payload.noActionBaseline),
  }
}

/** Enumerate an arm's transferable buffers (the enumerated-list discipline — a non-buffer field added
 *  later must never silently join a transfer). */
function armBuffers(arm: SolveArmWire): ArrayBufferLike[] {
  const bufs: ArrayBufferLike[] = [arm.terminalValuesReal.buffer, arm.depletionYears.buffer]
  if (arm.taxAware) {
    bufs.push(
      arm.taxAware.lifetimeTaxPaidReal.buffer,
      arm.taxAware.terminalTaxableReal.buffer,
      arm.taxAware.terminalPretaxReal.buffer,
      arm.taxAware.terminalRothReal.buffer,
      arm.taxAware.terminalHsaReal.buffer,
      arm.taxAware.terminalTaxableBasisReal.buffer,
      arm.taxAware.lifetimeNetPremiumReal.buffer,
      arm.taxAware.lifetimeMedicareCostReal.buffer,
    )
  }
  // The floor track's paths-length depletion buffer joins the transfer list (its sibling fraction
  // stays a structured clone) — the ResolvedWire floor discipline at K-candidate scale.
  if (arm.floor) bufs.push(arm.floor.depletionYears.buffer)
  return bufs
}

/**
 * Run the U15 solve and PACK the outcome into wire form. Total: any unexpected throw is caught and
 * returned as `calm-error` (the worker never dies — `runEngine`'s contract). The oracle-cleared token
 * is minted + consumed entirely inside `solveWithMint` (it cannot cross the wire).
 */
export function runSolveEngine(request: SolveRequest): SolveWire {
  try {
    return packSolveWire(solveWithMint(request))
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
  run(params: SimulationParams, seed: number, options?: { readonly bandFan?: boolean; readonly survivorConditioned?: boolean; readonly healthReadout?: boolean }): EngineWire {
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
          wire.taxAware.lifetimeNetPremiumReal.buffer,
          wire.taxAware.lifetimeMedicareCostReal.buffer,
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
  /** Run the U10 two-arm control comparison (the sequencing / Roth-conversion levers).
   *  ONE worker call computes BOTH arms on the shared seed (the two can never diverge on
   *  the draw set — CRN by construction); the compact outcome crosses by structured clone
   *  (never the transfer list — see `TwoArmWire`). */
  runTwoArm(base: SimulationParams, seed: number, control: TwoArmControl): TwoArmWire {
    return runTwoArmEngine(base, seed, control)
  },
  /** Run the U15 solve (§S5). Mints the oracle-cleared token worker-side (it cannot cross the
   *  wire — branded) and returns ONE structured payload. Only the recommended arm's THREE seed-B
   *  distributions are transferred (detached, fresh per run — the Act-1 discipline at K-candidate
   *  scale); every scalar / grade / withheld-lever field rides by structured clone. */
  runSolve(request: SolveRequest): SolveWire {
    const wire = runSolveEngine(request)
    if (wire.kind === 'recommended') {
      const buffers = [
        ...armBuffers(wire.winner),
        ...(wire.runnerUp !== undefined ? armBuffers(wire.runnerUp) : []),
        ...armBuffers(wire.noActionBaseline),
      ]
      return Comlink.transfer(wire, buffers)
    }
    return wire
  },
}

/** The shape the main-thread handle (src/store/engineClient.ts) wraps. */
export type EngineApi = typeof engineApi
