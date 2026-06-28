/**
 * The worker WIRE contract + the main-thread UNPACK — deliberately separated from the
 * worker-side compute (engineProtocol.ts → simulate/confidence). This module imports
 * ONLY @shared/model types, so the MAIN thread can reconstruct a result WITHOUT pulling
 * the Monte Carlo engine into the main bundle (the compute lives only in the worker
 * chunk). Keeping the boundary structural — not reliant on bundler tree-shaking — means
 * a future main-thread import can never silently drag the engine across the worker line.
 */
import type { BandFan, DateSearchOutcome, DollarAdjustment, Headline, SimulationResult } from '@shared/model'

/** The per-path tax-aware solver surfaces in WIRE form (U3·M6 — `Distribution.taxAware`
 *  as six transferable Float64 buffers). PRESENT iff the run carried the tax overlay
 *  (the same presence contract as the value model — absence is the honest spine shape). */
export interface TaxAwareWire {
  readonly lifetimeTaxPaidReal: Float64Array
  readonly terminalTaxableReal: Float64Array
  readonly terminalPretaxReal: Float64Array
  readonly terminalRothReal: Float64Array
  readonly terminalHsaReal: Float64Array
  readonly terminalTaxableBasisReal: Float64Array
}

/** A resolved result in WIRE form: the big arrays as transferable typed-array buffers,
 *  the small fields by structured clone. `depletionYears` is Int32 (it carries the −1
 *  NEVER_DEPLETED sentinel, an integer); terminals are Float64 (exact for the doubles). */
export interface ResolvedWire {
  readonly kind: 'resolved'
  readonly terminalValuesReal: Float64Array
  readonly depletionYears: Int32Array
  readonly survivalFraction: number
  readonly headline: Headline
  readonly dollar: DollarAdjustment
  readonly seed: number
  /** The M6 solver surfaces — present iff the run carried the tax overlay. */
  readonly taxAware?: TaxAwareWire
  /** The U6/U7 per-year percentile fan — present iff the run opted in (`run`'s `bandFan`
   *  option; the single spine headline run only). Crosses by structured clone (compact
   *  years×6 plain numbers), NOT a transferable buffer — so it is absent from the worker's
   *  `Comlink.transfer` list. DND/009-clean: every field is a finite number (no Infinity/NaN
   *  — the never-depleted $0 ruin floor reads as a real 0 in the fan, not a sentinel). */
  readonly bandFan?: BandFan
}

/** The worker's return contract — a resolved reading, the typed per-candidate INFEASIBLE
 *  sentinel (M6: a path's overlay computation failed mid-run on R19-valid input — the P4
 *  solver ranks it worst; today's UI renders it as a calm error), or a calm error (an
 *  UNEXPECTED internal throw). Never a worker death. */
export type EngineWire =
  | ResolvedWire
  | { readonly kind: 'infeasible'; readonly reason: string; readonly pathIndex: number }
  | { readonly kind: 'calm-error'; readonly reason: string }

/** Reconstructed main-thread result, or a calm error to render. */
export type EngineResult =
  | { readonly ok: true; readonly result: SimulationResult }
  | { readonly ok: false; readonly reason: string }

/** UNPACK a wire result back to a SimulationResult on the main-thread side. The typed
 *  arrays widen back to plain number[] (the value model the rest of the app reads).
 *  The infeasible arm renders exactly like a calm error for the P2 display consumer —
 *  the typed distinction lives at the WIRE (and at `simulate` itself) for the P4 solver. */
export function fromWire(wire: EngineWire): EngineResult {
  if (wire.kind === 'calm-error') return { ok: false, reason: wire.reason }
  if (wire.kind === 'infeasible') return { ok: false, reason: wire.reason }
  return {
    ok: true,
    result: {
      distribution: {
        terminalValuesReal: Array.from(wire.terminalValuesReal),
        depletionYears: Array.from(wire.depletionYears),
        survivalFraction: wire.survivalFraction,
        ...(wire.taxAware
          ? {
              taxAware: {
                lifetimeTaxPaidReal: Array.from(wire.taxAware.lifetimeTaxPaidReal),
                terminalTaxableReal: Array.from(wire.taxAware.terminalTaxableReal),
                terminalPretaxReal: Array.from(wire.taxAware.terminalPretaxReal),
                terminalRothReal: Array.from(wire.taxAware.terminalRothReal),
                terminalHsaReal: Array.from(wire.taxAware.terminalHsaReal),
                terminalTaxableBasisReal: Array.from(wire.taxAware.terminalTaxableBasisReal),
              },
            }
          : {}),
        // The per-year fan is already plain immutable data (years×6 numbers) — structured
        // clone delivered a fresh copy across the worker boundary (and the main-thread
        // fallback hands back the engine's own immutable object), so it carries through
        // directly; nothing to widen, mirroring the date-search's clone-only unpack.
        ...(wire.bandFan ? { bandFan: wire.bandFan } : {}),
      },
      headline: wire.headline,
      dollar: wire.dollar,
      seed: wire.seed,
    },
  }
}

// ---------------------------------------------------------------------------
// The date-search wire (C3). DELIBERATELY thin: the per-offset curve is ≤ ~11 points
// per track, so the @shared result shape crosses by STRUCTURED CLONE — the transferable
// typed-array machinery above serves the 2000+-element headline buffers, not an 11-point
// curve. `DateSearchOutcome` already carries its own calm grammar (input-failure /
// cancelled are DEFINED outcomes); the wire's calm-error arm is reserved for an
// UNEXPECTED engine throw (the worker never dies mid-sweep — calm-error-total, like
// `runEngine`).
// ---------------------------------------------------------------------------

/** The worker's date-search return contract — a defined outcome or a calm error. */
export type DateSearchWire =
  | { readonly kind: 'date-search'; readonly outcome: DateSearchOutcome }
  | { readonly kind: 'calm-error'; readonly reason: string }

/** Reconstructed main-thread date-search result, or a calm error to render. */
export type DateSearchResult =
  | { readonly ok: true; readonly outcome: DateSearchOutcome }
  | { readonly ok: false; readonly reason: string }

/** UNPACK a date-search wire result — compute-free (structured clone already delivered
 *  the value model; nothing widens). */
export function dateSearchFromWire(wire: DateSearchWire): DateSearchResult {
  if (wire.kind === 'calm-error') return { ok: false, reason: wire.reason }
  return { ok: true, outcome: wire.outcome }
}
