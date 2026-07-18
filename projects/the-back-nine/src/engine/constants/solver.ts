/**
 * Solver-validation calibration constants (U14 — the Act-4 validation harness; council
 * wf_d873be6e-5b2, the reconciliation supersession). The held-out-seed defense (S5) and the
 * grade calibration (S4) read these; U15's solver inherits them through the harness.
 *
 * DISCIPLINE (burned/062 — the sentinel law): a not-yet-calibrated quantity is an explicit
 * OUT-OF-RANGE sentinel (−1; every valid domain here is strictly positive), never a plausible
 * in-range default — an uncalibrated ε that read as a plausible 0.0x would silently decide the
 * very near-ties the optimizer overfits. `isCalibrated` checks finiteness FIRST (insights
 * 008/010: a NaN passes both `??` and every relational guard), so a NaN can never pass a
 * `> ε` compare downstream. The oracle-cleared token REFUSES (`epsilon-uncalibrated`) while
 * any required field is uncalibrated — a calm typed refusal, never a throw at mint time.
 *
 * FRESH-DRAW PROTOCOL (the plan's contract #2, unchanged): the pre-specified quantities below
 * were fixed BEFORE any held-out-B draw existed (anti garden-of-forking-paths); seed-set B and
 * every threshold here are used-once-per-release and re-drawn/re-derived on any change to the
 * candidate set or thresholds. N=1 cold-read feedback may revise tone, NEVER these numbers.
 */
import { sourced } from './types'

/**
 * The SELECTION tie-tolerance z (S5 — the ε SPLIT's selection half). Survival-equivalence
 * between two candidates is decided on the CRN-DIFFERENCE: |p̂_i − p̂_j| ≤ z · SE_diff where
 * SE_diff is computed A-SIDE from the per-path paired outcome indicators (CRN shrinks the
 * difference variance far below the level variance — a level-keyed band over-declares ties
 * and can drop a survival-relevant gap into Tier-2). Two-sided 95% ⇒ z = 1.96 (a TIE decision
 * is two-sided; the date-search's 1.645 is a one-sided lower-bound decision — a different
 * question, deliberately not reused). PRE-SPECIFIED 2026-07-18, before any B draw.
 */
export const solverSelectionTieZ = sourced(1.96, {
  citation:
    'U14 S5 (council wf_d873be6e-5b2): pre-specified two-sided 95% normal quantile on the A-side CRN pairwise-difference SE — fixed 2026-07-18 before any held-out-B draw (the fresh-draw protocol)',
  directionalUntilPinned: false,
  note: 'Deciding survival-equivalence on a B-measured level band re-contaminates the held-out (the planted-fail arm pins this). The selection tolerance is z · SE_diff(pair), SE from paired per-path indicators on seed-set A only.',
})

/**
 * The minimum held-out-B path floor (S4.1): the grade's margin-vs-tolerance decision must not
 * itself be noise. 16,000 mirrors the date-search final tier's pinned-paths argument
 * (architecture §9: z·SE ≤ ½·SURVIVAL_GRID at the decision bar), re-applied to the grade's
 * B-side margin read.
 */
export const solverMinBPaths = sourced(16_000, {
  citation:
    'U14 S4: the date-search final-tier precedent (architecture §9 — 16,000 paths puts z·SE inside half a survival-grid cell at the bar), re-derived for the held-out grade read; pre-specified 2026-07-18',
  directionalUntilPinned: false,
  note: 'A grade computed on fewer B paths is refused (the harness fails loud), never quietly averaged.',
})

/**
 * The deterministic B-FAMILY size m (S4.1 — the grade-stability check): the one persisted
 * seedB indexes a fixed SplitMix-expanded family seedB[0..m−1] of independent hold-out
 * streams; the grade must agree across all m or the case is FORCED conservative (coin-flip).
 * Re-derivable from the single seedB ⇒ byte-reproducible on re-entry (U17's contract).
 */
export const solverBFamilySize = sourced(5, {
  citation:
    'U14 S4: pre-specified 2026-07-18 — five independent held-out streams give a real luck-flip detection arm while keeping the per-solve compute profile linear (U15 budgets m × B-paths)',
  directionalUntilPinned: false,
  note: 'A borderline (model, goal) whose grade flips across the family is forced to coin-flip — never allowed to luck-flip to "just do it".',
})

/**
 * The ACA-legislative freshness window the oracle token enforces (days since
 * `acaEnhancedSubsidyStatus.value.verifiedOn`). Mirrors the verify:aca CI gate's
 * `maxAgeDays: 30` rolling window (aca-last-verified.json) so the ENGINE-side refusal
 * (`aca-unverified`) and the CI-side red fire on the same calendar — the token never
 * recommends over a staler ACA fact than the build gate itself would accept.
 */
export const solverAcaFreshnessWindowDays = sourced(30, {
  citation:
    'U14 S6: mirrors scripts/verify-aca-status.ts maxAgeDays (aca-last-verified.json, the reVerifyEveryBuild CI hook) — one calendar, two enforcement layers',
  directionalUntilPinned: false,
  note: 'The mint takes an INJECTED todayEpochDay (the engine reads no clock); age > window ⇒ withheld aca-unverified.',
})

/**
 * The conversion-near-tie DEMOTION margin (S4.3 — the council's Q3 amendment): the
 * difference-keyed grade's shape-bias cancellation is ASYMMETRIC (conversion front-loads
 * balance reduction, so the non-cancelling i.i.d.-lognormal residual FLATTERS conversion
 * exactly in the near-tie regime). A conversion-lever winner whose held-out-B Tier-1
 * survival-fraction margin over the no-conversion runner-up is below THIS margin grades
 * coin-flip — never "just do it".
 *
 * CALIBRATED 2026-07-18 (the S4 measurement probe, 16,000 paths × the 5-member B-family,
 * real engine): the measured conversion-near-tie CLASS — a 30k×3yr conversion winner over
 * conversion-0 on a mid-fragility household — carries member margins 0.0101…0.0118 survival
 * (member bands ≈ 0.0016: CRN resolves even a 1-point margin at the floor, so the demotion
 * is genuinely about the SHAPE RESIDUAL, never sampling noise), with a cross-member spread
 * of ±0.0016. The margin = 0.02 — TWO SURVIVAL_GRID cells: the measured class (≈0.011) +
 * its family spread + headroom to the next grid cell. A conversion winner inside 0.02 of
 * its no-conversion runner-up on B is exactly the regime where the §3–§5 i.i.d. residual
 * could BE the whole margin. The residual's true magnitude is UNQUANTIFIED in v1 (the
 * dissent's point); the standing flip condition — a near-tie stress test showing the
 * difference-keyed grade inverts a ranking under the richer block-bootstrap draw — would
 * re-derive this value, not merely bump it.
 */
export const solverConversionNearTieDemotionMargin = sourced(0.02, {
  citation:
    'U14 S4 calibration probe 2026-07-18 (16k × 5-member B-family, real engine): measured conversion-near-tie class margins 0.0101–0.0118 ± 0.0016 spread → 0.02 = the class + spread + one-grid-cell headroom; council wf_d873be6e-5b2 Q3 amendment (the asymmetric-cancellation demotion)',
  directionalUntilPinned: true,
  // The demotion margin's LEVEL is methodology (no dated pin event will ever "certify" it);
  // the dissent's flip condition (a richer-draw near-tie inversion) would re-derive it.
  directionalKind: 'methodology-substrate',
  note: 'Units: held-out-B Tier-1 survival-fraction margin (winner − runner-up). Applies ONLY when the winner carries a nonzero conversion and the runner-up does not (the flattered direction); a no-conversion winner is never demoted by this margin.',
})

/** Finiteness-FIRST calibration check (insights 008/010/039): a NaN/Infinity/sentinel is
 *  detectably uncalibrated — it must never reach a `> ε` compare. */
export const isCalibrated = (x: number): boolean => Number.isFinite(x) && x > 0

export const solverConstants = {
  solverSelectionTieZ,
  solverMinBPaths,
  solverBFamilySize,
  solverAcaFreshnessWindowDays,
  solverConversionNearTieDemotionMargin,
} as const
