/**
 * `fallback.ts` — the BOUNDED compute-fallback ladder (U15 §S6), sentinel-guarded, not guessed.
 *
 * The on-demand solve must fit an interactive window OR degrade HONESTLY — never silently. The ladder
 * the plan names has three rungs; U15 shipped each as a STRUCTURED SHAPE with its tuning knobs held at
 * an out-of-range sentinel (burned/062), because the thresholds are a MEASUREMENT the reference device
 * pins. **PINNED 2026-07-22 (U16 §S0.1)**: all three knobs now carry reference-device-measured values
 * (rank-stability-keyed, never latency alone — each citation records the derivation; the calibration
 * harness is `scripts/calibrate-fallback.ts`). The core solve still consumes NONE of them (it ranks the
 * full enumerated set at the base's own path count); the fail-closed guard REMAINS the router's
 * mandatory first call (the `assertDemotionAxisCalibrated` posture, S4.5) and stays provably-biting
 * through the `…Over` test seam — a future un-pinned/edited knob is refused, never silently applied.
 *
 * THE THREE RUNGS (structured; the knobs are pinned, the ALGORITHMS unbuilt — U16 §S5, deferred):
 *  1. COARSE-THEN-REFINE — a coarse pass over a capped candidate set, then cliff anchoring re-applied
 *     around the SURVIVORS (the refine grid is dense only near the coarse winners). Both the coarse
 *     cap and the survivor count are knobs.
 *  2. THE CANDIDATE-COUNT CEILING — above it, rung 1 engages rather than scoring every point at full
 *     precision. A knob.
 *  3. THE HONEST DEGRADE — a reduced-path INTERACTIVE solve (fewer paths for the search/ranking) plus
 *     a FULL-PRECISION confirm, EXPLICITLY labeled (a structured tier, no copy — U16 authors the
 *     words). NEVER a silent down-sample: the reduced-path interactive count is a knob, and the GRADE
 *     + every DISPLAYED figure always run at the held-out B-floor (`solverMinBPaths`) regardless of
 *     the interactive tier — the degrade trades SEARCH precision for latency, never HONESTY.
 *
 * PURE (engine-purity lint): no clock, entropy, or environment — the knobs are static sentinels; the
 * calibration check is a finiteness predicate over them.
 */
import { sourced, isCalibrated, type Sourced } from '@engine/constants'

/**
 * The reduced-path count for the INTERACTIVE tier's search/ranking (rung 3). PINNED 2026-07-22 by the
 * reference-device profile (see the citation); it shipped as a −1 out-of-range sentinel (burned/062),
 * never a guessed path count, until that measurement landed.
 * NOTE it governs ONLY the search/selection path count; the grade + displayed figures always run at
 * `solverMinBPaths` (the held-out floor is never crossed — the honest-degrade contract).
 */
export const solverInteractivePaths: Sourced<number> = sourced(4_000, {
  citation:
    'PINNED 2026-07-22 — the §S0.1 reference-device calibration (scripts/calibrate-fallback.ts on the reference laptop, U16 council wf_8d4c6f65-415 Q3: RANK-STABILITY, never latency): through the SHIPPED runSearch→selectRecommendation at tieTolerance 0 (the STRICTEST regime — a looser live tolerance only makes flips rarer), rung 1000 DIVERGED on both hard cells (the worst-case 8-roster world AND the Q4d near-tie grid — the requirement is real), rungs 2000/4000/8000 matched the 16k-truth crown on every cell, monotone. Smallest all-match rung 2000 + one rung headroom → 4000 (the class-plus-headroom idiom).',
  directionalUntilPinned: false,
  directionalKind: 'methodology-substrate',
  note: 'Governs the interactive SEARCH/ranking paths ONLY — the grade + every displayed figure always run at solverMinBPaths (the held-out floor is never down-sampled; the honest-degrade trades search precision for latency, never honesty). Compute-routing, NOT a ranking-affecting input — the oracle token never reads it. RE-MEASURE trigger: a hardware-class change, a roster-shape change, or the S5 interactive tier build (its gate re-proves winner-cannot-flip on its own algorithm).',
})

/**
 * The candidate-count CEILING (rung 2): above it, coarse-then-refine engages instead of scoring every
 * anchored point at full precision. PINNED 2026-07-22 (a −1 sentinel until then) — the largest
 * cliff-anchored grid the reference device can score inside the interactive window is a MEASUREMENT,
 * not a guess.
 */
export const solverCandidateCeiling: Sourced<number> = sourced(5, {
  citation:
    'PINNED 2026-07-22 — the §S0.1 reference-device calibration (scripts/calibrate-fallback.ts): the worst-case cell (both-regime healthcare, 45y, 8-roster) measured 27.7s full-precision search at 16k across both seed-sets = 3.47s per candidate; the interactive-window anchor is the shipped ~20s working-route precedent (the FuckOffDate sweep breathe, base.css) → floor(20s / 3.47s) = 5.',
  directionalUntilPinned: false,
  directionalKind: 'methodology-substrate',
  note: 'Above this the coarse-then-refine rung engages (full-precision-within-the-window only fits a 5-candidate roster on the reference device — the measured reality that makes the ladder load-bearing). Compute-routing only — never read by the oracle token nor by any ranking. RE-MEASURE with solverInteractivePaths.',
})

/**
 * The number of coarse-pass SURVIVORS the refine grid re-anchors around (rung 1). PINNED 2026-07-22
 * (a −1 sentinel until then) — how many coarse winners must survive to guarantee the refined optimum
 * is not pruned is a measurement + a stability argument from the reference-device profile, never a
 * guessed k.
 */
export const solverCoarseSurvivors: Sourced<number> = sourced(2, {
  citation:
    'PINNED 2026-07-22 — the §S0.1 reference-device calibration (scripts/calibrate-fallback.ts): at the pinned 4000-path rung the 16k-truth crown sat at rung-position 0 in EVERY battery cell (worst position 0 → +1 position→count, +1 headroom = 2). A lower bound from THIS battery — the S5 interactive-tier build must re-verify pruning safety against its actual coarse-grid design before consuming it.',
  directionalUntilPinned: false,
  directionalKind: 'methodology-substrate',
  note: 'The refine grid is dense only near these survivors. Compute-routing only — never a ranking input. The S5 gate re-proves the-true-optimum-is-never-pruned on the real coarse algorithm (this pin is the measured floor, not that proof).',
})

/** The honest-degrade compute tier (rung 3) — a STRUCTURED flag, no copy (U16 authors the words). The
 *  interactive tier trades search-path precision for latency; the full-precision tier is the confirm. */
export type SolveComputeTier = 'interactive' | 'full-precision'

/** The coarse-then-refine plan (rung 1 + 2) in structured form. Its three fields are the knobs above,
 *  PINNED 2026-07-22 (`:38` / `:52` / `:66`, each `directionalUntilPinned: false`) — what is still
 *  unbuilt is the ALGORITHM that would consume them: U16 §S5, DECIDED-and-deferred on the record
 *  with a named revival trigger (the build spec's standing posture), never "waiting on the
 *  measurement". `assertFallbackCalibrated` still fails closed while any field is uncalibrated. */
export interface CoarseThenRefinePlan {
  /** The candidate-count ceiling above which the coarse pass engages (rung 2). */
  readonly candidateCeiling: number
  /** The coarse-pass survivor count the refine grid re-anchors around (rung 1). */
  readonly coarseSurvivors: number
  /** The reduced search-path count for the interactive tier (rung 3). */
  readonly interactivePaths: number
}

/** The three knob values as one bag — the guard's own input shape (and its test seam). */
export interface FallbackKnobValues {
  readonly interactivePaths: number
  readonly candidateCeiling: number
  readonly coarseSurvivors: number
}

/** The calibration predicate over EXPLICIT values — the permanent test seam (the
 *  `_epsilonRequired` idiom): the red arm drives a planted −1 through THIS, so the guard stays
 *  provably-biting even after the shipped knobs pin (finiteness-FIRST, insights 008/010). */
export function fallbackKnobsCalibratedOver(values: FallbackKnobValues): boolean {
  return (
    isCalibrated(values.interactivePaths) &&
    isCalibrated(values.candidateCeiling) &&
    isCalibrated(values.coarseSurvivors)
  )
}

/** Are ALL shipped fallback-ladder knobs calibrated? */
export function fallbackKnobsCalibrated(): boolean {
  return fallbackKnobsCalibratedOver({
    interactivePaths: solverInteractivePaths.value,
    candidateCeiling: solverCandidateCeiling.value,
    coarseSurvivors: solverCoarseSurvivors.value,
  })
}

/** The guard body over explicit values — the seam the red arm drives (see above). */
export function assertFallbackCalibratedOver(values: FallbackKnobValues): void {
  if (!fallbackKnobsCalibratedOver(values)) {
    throw new Error(
      '[fallback] the compute-fallback ladder is UN-TUNED — the interactive-path count / candidate ' +
        'ceiling / coarse-survivor count carry an un-tuned sentinel; the reference-device profile pins them ' +
        '(burned/062: refuse a guessed compute-routing threshold, never silently apply one).',
    )
  }
}

/**
 * FAIL-CLOSED guard (the `assertDemotionAxisCalibrated` posture, S4.5): the interactive/full router
 * MUST call this before consuming any knob — that router is NOT built (the interactive tier is an open
 * register entry), so today no live path consumes the knobs and only the red-arm tests drive this guard.
 * It THROWS while any knob is an un-tuned sentinel — a guessed compute-routing threshold is refused,
 * never silently applied (burned/062). All three knobs have been PINNED since 2026-07-22.
 */
export function assertFallbackCalibrated(): void {
  assertFallbackCalibratedOver({
    interactivePaths: solverInteractivePaths.value,
    candidateCeiling: solverCandidateCeiling.value,
    coarseSurvivors: solverCoarseSurvivors.value,
  })
}
