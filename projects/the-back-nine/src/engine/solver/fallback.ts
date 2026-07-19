/**
 * `fallback.ts` — the BOUNDED compute-fallback ladder (U15 §S6), sentinel-guarded, not guessed.
 *
 * The on-demand solve must fit an interactive window OR degrade HONESTLY — never silently. The ladder
 * the plan names has three rungs; U15 ships each as a STRUCTURED SHAPE with its tuning knobs held at an
 * out-of-range sentinel (burned/062 — a −1 whose `isCalibrated` reads false, never a plausible guessed
 * value), because the thresholds are a MEASUREMENT the reference device pins, and the dev-laptop profile
 * (`profile.ts`) is only the first datapoint. The core U15 solve consumes NONE of these knobs yet (it
 * ranks the full enumerated set at the base's own path count); they ship READY + FAIL-CLOSED so the
 * U16 interactive/full router cannot route on a guessed number — `assertFallbackCalibrated` THROWS
 * until the reference-device measurement pins them (the `assertDemotionAxisCalibrated` posture, S4.5).
 *
 * THE THREE RUNGS (structured; the ALGORITHMS wait on the measurement):
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
 * The reduced-path count for the INTERACTIVE tier's search/ranking (rung 3). UN-TUNED: a −1
 * out-of-range sentinel (burned/062), not a guessed path count — the reference-device profile pins it.
 * NOTE it governs ONLY the search/selection path count; the grade + displayed figures always run at
 * `solverMinBPaths` (the held-out floor is never crossed — the honest-degrade contract).
 */
export const solverInteractivePaths: Sourced<number> = sourced(-1, {
  citation:
    'U15 S6: the reduced-path interactive-solve search count — UN-TUNED; the dev-laptop profile (2026-07-18) is the first datapoint, the reference-device measurement pins it (burned/062: an out-of-range −1 sentinel, never a guessed in-range path count).',
  directionalUntilPinned: true,
  directionalKind: 'methodology-substrate',
  note: 'Governs the interactive SEARCH/ranking paths ONLY — the grade + every displayed figure always run at solverMinBPaths (the held-out floor is never down-sampled; the honest-degrade trades search precision for latency, never honesty). Compute-routing, NOT a ranking-affecting input — the oracle token never reads it.',
})

/**
 * The candidate-count CEILING (rung 2): above it, coarse-then-refine engages instead of scoring every
 * anchored point at full precision. UN-TUNED sentinel — the largest cliff-anchored grid the reference
 * device can score inside the interactive window is a MEASUREMENT, not a guess.
 */
export const solverCandidateCeiling: Sourced<number> = sourced(-1, {
  citation:
    'U15 S6: the full-precision candidate-count ceiling — UN-TUNED; pins on the reference-device profile (the largest grid that fits the interactive window). burned/062: a −1 sentinel, never a guessed count.',
  directionalUntilPinned: true,
  directionalKind: 'methodology-substrate',
  note: 'Above this the coarse-then-refine rung engages. Compute-routing only — never read by the oracle token nor by any ranking.',
})

/**
 * The number of coarse-pass SURVIVORS the refine grid re-anchors around (rung 1). UN-TUNED sentinel —
 * how many coarse winners must survive to guarantee the refined optimum is not pruned is a
 * measurement + a stability argument the reference-device profile begins, never a guessed k.
 */
export const solverCoarseSurvivors: Sourced<number> = sourced(-1, {
  citation:
    'U15 S6: the coarse-pass survivor count the refine grid re-anchors cliff points around — UN-TUNED; pins on the reference-device profile + a pruning-safety argument. burned/062: a −1 sentinel, never a guessed k.',
  directionalUntilPinned: true,
  directionalKind: 'methodology-substrate',
  note: 'The refine grid is dense only near these survivors. Compute-routing only — never a ranking input.',
})

/** The honest-degrade compute tier (rung 3) — a STRUCTURED flag, no copy (U16 authors the words). The
 *  interactive tier trades search-path precision for latency; the full-precision tier is the confirm. */
export type SolveComputeTier = 'interactive' | 'full-precision'

/** The coarse-then-refine plan (rung 1 + 2) in structured form — every field a sentinel-guarded knob
 *  until the reference-device profile pins it. Carried, never yet DECIDED (the algorithm waits on the
 *  measurement; `assertFallbackCalibrated` fails closed while any field is uncalibrated). */
export interface CoarseThenRefinePlan {
  /** The candidate-count ceiling above which the coarse pass engages (rung 2). */
  readonly candidateCeiling: number
  /** The coarse-pass survivor count the refine grid re-anchors around (rung 1). */
  readonly coarseSurvivors: number
  /** The reduced search-path count for the interactive tier (rung 3). */
  readonly interactivePaths: number
}

/** Are ALL fallback-ladder knobs calibrated (finiteness-FIRST, insights 008/010)? False today — every
 *  knob is the −1 sentinel awaiting the reference-device measurement (burned/062). */
export function fallbackKnobsCalibrated(): boolean {
  return (
    isCalibrated(solverInteractivePaths.value) &&
    isCalibrated(solverCandidateCeiling.value) &&
    isCalibrated(solverCoarseSurvivors.value)
  )
}

/**
 * FAIL-CLOSED guard (the `assertDemotionAxisCalibrated` posture, S4.5): the U16 interactive/full
 * router MUST call this before consuming any knob. It THROWS while any knob is the un-tuned sentinel —
 * a guessed compute-routing threshold is refused, never silently applied (burned/062). Unreachable in
 * U15's core solve (which routes on no knob); planted-fail-tested so the sentinel provably BITES.
 */
export function assertFallbackCalibrated(): void {
  if (!fallbackKnobsCalibrated()) {
    throw new Error(
      '[fallback] the compute-fallback ladder is UN-TUNED — the interactive-path count / candidate ' +
        'ceiling / coarse-survivor count are −1 sentinels awaiting the reference-device profile ' +
        '(burned/062: refuse a guessed compute-routing threshold, never silently apply one).',
    )
  }
}
