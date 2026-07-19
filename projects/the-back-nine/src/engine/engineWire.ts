/**
 * The worker WIRE contract + the main-thread UNPACK — deliberately separated from the
 * worker-side compute (engineProtocol.ts → simulate/confidence). This module imports
 * ONLY @shared/model types, so the MAIN thread can reconstruct a result WITHOUT pulling
 * the Monte Carlo engine into the main bundle (the compute lives only in the worker
 * chunk). Keeping the boundary structural — not reliant on bundler tree-shaking — means
 * a future main-thread import can never silently drag the engine across the worker line.
 */
import type { BandFan, DateSearchOutcome, Distribution, DollarAdjustment, Headline, HealthReadout, SimulationResult, SurvivorConditioned, SurvivorReading, TwoArmOutcome } from '@shared/model'
// TYPE-ONLY (erased at compile — no runtime edge, so the MC engine + the solver stay OUT of the main
// bundle; `verify:bundle` guards the real import graph). The solve payload's value model lives with the
// solver (solve.ts / solveEntry.ts); this module owns only the WIRE variant + the main-thread unpack.
import type { SolveArm, SolveRecommendation } from '@engine/solver/solve'
import type { SolvePayload } from '@engine/solver/solveEntry'

/** The per-path tax-aware solver surfaces in WIRE form (U3·M6 — `Distribution.taxAware`
 *  as eight transferable Float64 buffers, U11 added the lifetime healthcare Σ pair).
 *  PRESENT iff the run carried the tax overlay (the same presence contract as the value
 *  model — absence is the honest spine shape). */
export interface TaxAwareWire {
  readonly lifetimeTaxPaidReal: Float64Array
  readonly terminalTaxableReal: Float64Array
  readonly terminalPretaxReal: Float64Array
  readonly terminalRothReal: Float64Array
  readonly terminalHsaReal: Float64Array
  readonly terminalTaxableBasisReal: Float64Array
  /** P3·U11 — Σ net ACA premium / Σ Medicare cost per path (the regime-preview medians). */
  readonly lifetimeNetPremiumReal: Float64Array
  readonly lifetimeMedicareCostReal: Float64Array
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
  /** The P3·U11 per-year healthcare readout series — present iff the run opted in (`run`'s
   *  `healthReadout` option) AND the overlay priced healthcare. Crosses by structured clone
   *  (compact years×9 plain numbers), NOT a transferable buffer — absent from the worker's
   *  `Comlink.transfer` list (the bandFan discipline). DND/009-clean: every field finite. */
  readonly healthReadout?: HealthReadout
  /** The U7 survivor-conditioned surface — present iff the run opted in (`run`'s `survivorConditioned`
   *  option, the single spine headline run only) AND ≥ 1 path had a survivor phase. Compact (four
   *  numbers); crosses by structured clone, NOT a transferable buffer (absent from the transfer list). */
  readonly survivorConditioned?: SurvivorConditioned
  /** The U7 "as the survivor" reading (result-level; what `SurvivorReadout` renders). Present iff
   *  `survivorConditioned` is — the model's stated iff, preserved across the wire. Compact clone. */
  readonly survivorReading?: SurvivorReading
  /** P3·U9 — the essentials-floor track in wire form. Present iff the run carried a budget
   *  construct (param-driven, mirroring the value model's presence key). `depletionYears`
   *  is a paths-length Int32Array (carries the −1 NEVER_DEPLETED sentinel) and JOINS the
   *  transfer list like its full-track sibling — the fraction rides beside it by clone. */
  readonly floor?: {
    readonly survivalFraction: number
    readonly depletionYears: Int32Array
  }
  /** P3·U9 — the engine-tagged floor verdict (what the two-tier headline renders). Present
   *  iff `floor` is — the model's stated iff, preserved across the wire. Compact clone,
   *  NEVER the transfer list; carried verbatim, never re-derived main-thread. */
  readonly floorReading?: Headline
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
                lifetimeNetPremiumReal: Array.from(wire.taxAware.lifetimeNetPremiumReal),
                lifetimeMedicareCostReal: Array.from(wire.taxAware.lifetimeMedicareCostReal),
              },
            }
          : {}),
        // The per-year fan is already plain immutable data (years×6 numbers) — structured
        // clone delivered a fresh copy across the worker boundary (and the main-thread
        // fallback hands back the engine's own immutable object), so it carries through
        // directly; nothing to widen, mirroring the date-search's clone-only unpack.
        ...(wire.bandFan ? { bandFan: wire.bandFan } : {}),
        // P3·U11 — the healthcare readout series is compact plain data (years×9 numbers) —
        // clone delivered it; pass through presence-keyed (the bandFan discipline).
        ...(wire.healthReadout ? { healthReadout: wire.healthReadout } : {}),
        // The survivor-conditioned surface is compact (four numbers) — structured clone delivered it
        // across; pass it through presence-keyed, preserving the model's survivorReading ⟹
        // survivorConditioned iff on the reconstructed object (mirrors bandFan / taxAware).
        ...(wire.survivorConditioned ? { survivorConditioned: wire.survivorConditioned } : {}),
        // P3·U9 — the floor track widens back to the value model (Int32Array → number[]),
        // exactly like the full track's depletionYears above.
        ...(wire.floor
          ? {
              floor: {
                survivalFraction: wire.floor.survivalFraction,
                depletionYears: Array.from(wire.floor.depletionYears),
              },
            }
          : {}),
      },
      headline: wire.headline,
      dollar: wire.dollar,
      // The result-level "as the survivor" reading (what SurvivorReadout renders). Carried VERBATIM,
      // never re-derived main-thread (insight 045) — summarize already built it worker-side.
      ...(wire.survivorReading ? { survivorReading: wire.survivorReading } : {}),
      // P3·U9 — the floor verdict, verbatim (summarize built it worker-side; insight 045).
      ...(wire.floorReading ? { floorReading: wire.floorReading } : {}),
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

// ---------------------------------------------------------------------------
// The two-arm control-comparison wire (P3·U10). DELIBERATELY thin, the date-search
// pattern: `TwoArmOutcome` is a COMPACT reading pair (headlines + fans + scalars —
// the per-path arrays stay worker-side), so it crosses by STRUCTURED CLONE and must
// NEVER join a transfer list. Its indeterminate/infeasible arms are DEFINED outcomes
// (the lever's calm closed state / the M6 sentinel); calm-error is reserved for an
// unexpected engine throw.
// ---------------------------------------------------------------------------

/** The worker's two-arm return contract — a defined outcome or a calm error. */
export type TwoArmWire =
  | { readonly kind: 'two-arm-result'; readonly outcome: TwoArmOutcome }
  | { readonly kind: 'calm-error'; readonly reason: string }

/** Reconstructed main-thread two-arm result, or a calm error to render. */
export type TwoArmResult =
  | { readonly ok: true; readonly outcome: TwoArmOutcome }
  | { readonly ok: false; readonly reason: string }

/** UNPACK a two-arm wire result — compute-free (clone already delivered the value model). */
export function twoArmFromWire(wire: TwoArmWire): TwoArmResult {
  if (wire.kind === 'calm-error') return { ok: false, reason: wire.reason }
  return { ok: true, outcome: wire.outcome }
}

// ---------------------------------------------------------------------------
// The U15 solve wire (§S5 (4) — extends Act-1's transfer contract to K candidates). ONE structured
// payload: the FULL seed-B distributions for the winner + retained runner-up + no-action baseline are
// the ONLY buffers in the transfer list (Act-1's typed-array discipline); everything else — the pruned
// field's scalar selection scores, the grade, the named driver, the surplus-regime flag, the withheld-
// lever enumeration, `SOLVER_CODE_VERSION` — crosses by structured clone. Every other payload arm
// (refused / withheld / token-withheld / mint-failed) is already plain data and crosses unchanged.
//
// The per-solve allocation is sized for THREE distributions + scalars, never K full distributions —
// keeping Act-1's "fresh per run, retains none" discipline true at K-candidate scale (plan line 178).
// ---------------------------------------------------------------------------

/** One displayed arm in WIRE form — its seed-B distribution as transferable typed-array buffers (the
 *  ResolvedWire discipline: `depletionYears` is Int32 for the −1 NEVER_DEPLETED sentinel; terminals +
 *  the tax-aware surfaces are Float64). The scalar display figures ride by clone alongside. */
export interface SolveArmWire {
  readonly id: string
  readonly policy: SolveArm['policy']
  readonly conversion: SolveArm['conversion']
  readonly drawdownOrder?: SolveArm['drawdownOrder']
  readonly headlineStatisticB: number
  readonly survivalB: number
  readonly terminalValuesReal: Float64Array
  readonly depletionYears: Int32Array
  readonly survivalFraction: number
  /** Present iff the run carried the tax overlay (the ResolvedWire presence contract). */
  readonly taxAware?: TaxAwareWire
  /** P3·U9 — the essentials-floor track of the arm's seed-B distribution, in wire form. Present iff
   *  the household carried a {@link SimulationParams.budget} construct (param-driven — the arm's
   *  `distributionB.floor` is populated by the same second decumulation pass the spine runs). Without
   *  this, a budget household's winner arm SILENTLY DROPS its essentials-floor track across the wire.
   *  `depletionYears` is a paths-length Int32Array (the −1 NEVER_DEPLETED sentinel) and JOINS the
   *  transfer list like the full-track sibling; the fraction rides beside it by clone (the ResolvedWire
   *  floor discipline). NOTE: unlike ResolvedWire there is NO `floorReading` here — that verdict is a
   *  summarize/result-level Headline the solver's per-candidate evaluation never computes per arm. */
  readonly floor?: {
    readonly survivalFraction: number
    readonly depletionYears: Int32Array
  }
}

/** The recommended payload with its three displayed arms in buffer form; every non-arm field is the
 *  solver's own plain-data value model, carried verbatim by clone. */
export type SolveRecommendedWire = Omit<SolveRecommendation, 'winner' | 'runnerUp' | 'noActionBaseline'> & {
  readonly winner: SolveArmWire
  readonly runnerUp: SolveArmWire | undefined
  readonly noActionBaseline: SolveArmWire
}

/** The worker's solve return contract — the recommended payload (buffers) or any plain-data payload
 *  arm (refused / withheld / token-withheld / mint-failed), or a calm error for an UNEXPECTED throw. */
export type SolveWire =
  | SolveRecommendedWire
  | Exclude<SolvePayload, SolveRecommendation>
  | { readonly kind: 'calm-error'; readonly reason: string }

/** The reconstructed main-thread solve payload, or a calm error to render. */
export type SolveResultView =
  | { readonly ok: true; readonly payload: SolvePayload }
  | { readonly ok: false; readonly reason: string }

/** Rebuild one arm's seed-B distribution from its buffers (typed arrays → plain number[]). */
function armFromWire(arm: SolveArmWire): SolveArm {
  const distributionB: Distribution = {
    terminalValuesReal: Array.from(arm.terminalValuesReal),
    depletionYears: Array.from(arm.depletionYears),
    survivalFraction: arm.survivalFraction,
    ...(arm.taxAware
      ? {
          taxAware: {
            lifetimeTaxPaidReal: Array.from(arm.taxAware.lifetimeTaxPaidReal),
            terminalTaxableReal: Array.from(arm.taxAware.terminalTaxableReal),
            terminalPretaxReal: Array.from(arm.taxAware.terminalPretaxReal),
            terminalRothReal: Array.from(arm.taxAware.terminalRothReal),
            terminalHsaReal: Array.from(arm.taxAware.terminalHsaReal),
            terminalTaxableBasisReal: Array.from(arm.taxAware.terminalTaxableBasisReal),
            lifetimeNetPremiumReal: Array.from(arm.taxAware.lifetimeNetPremiumReal),
            lifetimeMedicareCostReal: Array.from(arm.taxAware.lifetimeMedicareCostReal),
          },
        }
      : {}),
    // P3·U9 — the essentials-floor track widens back to the value model (Int32Array → number[]),
    // exactly like the spine's ResolvedWire.floor. Presence-keyed on the same param-driven iff.
    ...(arm.floor
      ? {
          floor: {
            survivalFraction: arm.floor.survivalFraction,
            depletionYears: Array.from(arm.floor.depletionYears),
          },
        }
      : {}),
  }
  return {
    id: arm.id,
    policy: arm.policy,
    conversion: arm.conversion,
    ...(arm.drawdownOrder !== undefined ? { drawdownOrder: arm.drawdownOrder } : {}),
    distributionB,
    headlineStatisticB: arm.headlineStatisticB,
    survivalB: arm.survivalB,
  }
}

/** UNPACK a solve wire result back to the solver's value model on the main-thread side. The three
 *  displayed arms widen their buffers back to plain number[] (the value model U16 reads); every
 *  other payload arm is plain data carried verbatim. Compute-free. */
export function solveFromWire(wire: SolveWire): SolveResultView {
  if (wire.kind === 'calm-error') return { ok: false, reason: wire.reason }
  if (wire.kind !== 'recommended') {
    // refused / withheld / token-withheld / mint-failed are plain data — carried verbatim.
    return { ok: true, payload: wire }
  }
  const { winner, runnerUp, noActionBaseline, ...rest } = wire
  const payload: SolveRecommendation = {
    ...rest,
    winner: armFromWire(winner),
    runnerUp: runnerUp !== undefined ? armFromWire(runnerUp) : undefined,
    noActionBaseline: armFromWire(noActionBaseline),
  }
  return { ok: true, payload }
}
