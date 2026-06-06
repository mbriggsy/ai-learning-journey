/**
 * The worker WIRE contract + the main-thread UNPACK — deliberately separated from the
 * worker-side compute (engineProtocol.ts → simulate/confidence). This module imports
 * ONLY @shared/model types, so the MAIN thread can reconstruct a result WITHOUT pulling
 * the Monte Carlo engine into the main bundle (the compute lives only in the worker
 * chunk). Keeping the boundary structural — not reliant on bundler tree-shaking — means
 * a future main-thread import can never silently drag the engine across the worker line.
 */
import type { DollarAdjustment, Headline, SimulationResult } from '@shared/model'

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
}

/** The worker's return contract — a resolved reading or a calm error (never a throw). */
export type EngineWire = ResolvedWire | { readonly kind: 'calm-error'; readonly reason: string }

/** Reconstructed main-thread result, or a calm error to render. */
export type EngineResult =
  | { readonly ok: true; readonly result: SimulationResult }
  | { readonly ok: false; readonly reason: string }

/** UNPACK a wire result back to a SimulationResult on the main-thread side. The typed
 *  arrays widen back to plain number[] (the value model the rest of the app reads). */
export function fromWire(wire: EngineWire): EngineResult {
  if (wire.kind === 'calm-error') return { ok: false, reason: wire.reason }
  return {
    ok: true,
    result: {
      distribution: {
        terminalValuesReal: Array.from(wire.terminalValuesReal),
        depletionYears: Array.from(wire.depletionYears),
        survivalFraction: wire.survivalFraction,
      },
      headline: wire.headline,
      dollar: wire.dollar,
      seed: wire.seed,
    },
  }
}
