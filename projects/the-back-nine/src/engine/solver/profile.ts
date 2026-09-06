/**
 * `profile.ts` — the SOLVE compute-profile gate (U15 §S6, commit-after-core). It answers the
 * on-demand budget question by MEASUREMENT on the reference device — "does the final crown fit the
 * interactive window, or does the WASM port move toward load-bearing?" — never by vibes. The
 * `dateSearchProfile.ts` shape, re-applied to the whole worker-side solve: one `solveWithMint` timed
 * against its single-`simulate` baseline (the linearity unit), plus the structural dims that make the
 * ratio interpretable and a `payloadKind` guard so a mint-failed / withheld / aborted profile can NEVER
 * masquerade as a measured full solve (the `outcomeKind` discipline).
 *
 * THE BUDGET SHAPE (what the ratio should be). `solveWithMint` runs, in single-`simulate` units at the
 * base's path count:
 *   ranking stability ≈ 2·|roster|  (the roster on seed-A + seed-B)
 * + search            ≈ 2·|rankable| (the ranked subset on both seed-sets — the whole roster since 2026-07-19)
 * + the grade         ≈ 2·`solverBFamilySize` (winner + runner-up across the m-draw held-out family)
 * + named-driver + the cheap 2-path optimality oracle over the committed fixtures.
 * So the honest expectation is LINEAR in the candidate count — `ratioVsSingle ≈ 2(|roster| + |rankable|)
 * + 2·m + O(1)`. A ratio that grows SUPER-linearly in the roster is a regression (an accidental
 * re-evaluation or re-draw per candidate — the same class `dateSearchProfile` watches). The ABSOLUTE
 * interactive-window threshold was DEFERRED TO MEASUREMENT on a mid-tier reference device, which landed
 * 2026-07-22 and PINNED the `fallback.ts` knobs (U16 §S0.1) — this module REPORTS, it does not JUDGE.
 *
 * PURE (engine-purity lint): the clock is INJECTED (`now`) — the engine reads no `performance`/`Date`
 * of its own; the caller (the worker shell / a script, OUTSIDE src/engine) passes
 * `() => performance.now()`, exactly as the seed is injected. Deterministic given `(request, now)`.
 */
import { simulate } from '@engine/simulate'
import { solverBFamilySize } from '@engine/constants'
import { solveWithMint, type SolvePayload, type SolveRequest } from './solveEntry'

/** One measured solve profile: the single-candidate baseline, the full worker-side solve cost, their
 *  ratio (the linearity check), the structural dims that size the expectation, and the payload kind so
 *  a non-`recommended` profile (which short-circuits before the full search/grade) can never pass as a
 *  measured full solve. */
export interface SolveProfile {
  /** One `simulate` at the request's own base params + seed — the baseline unit the ratio divides by. */
  readonly singleSimulateMs: number
  /** The full `solveWithMint`: the optimality oracle + K-candidate ranking stability + the search on
   *  both seed-sets + the grade's m-draw B-family + the named-driver probe. */
  readonly solveMs: number
  /** `solveMs / singleSimulateMs` — expected LINEAR in the candidate count (see the budget shape). */
  readonly ratioVsSingle: number
  /** The FULL enumerated roster size (sequencing arms + the conversion grid). */
  readonly candidateCount: number
  /** The `conversion === null` subset — what the PRE-TREND-FLIP solve ranked. ⚠️ Conversions rank too
   *  since 2026-07-19 (`solve.ts`'s `rankable` DERIVES from the live Medicare-trend clause), so on a
   *  conversion-bearing roster this UNDER-reports the ranked set and the budget shape above reads low
   *  against it; re-deriving it from the clause is a code change, not a comment fix. */
  readonly rankableCount: number
  /** The conversion-grid size (`candidateCount − rankableCount`) — WITHHELD only under the trend
   *  clause's blocking arm, and conversions have RANKED since 2026-07-19. It is the ranking-stability
   *  perturbation material either way: that law REQUIRES a conversion candidate to perturb, so the
   *  grid rides the 2·|roster| sweep whether or not the clause blocks. */
  readonly conversionCount: number
  /** The path count every measured run used (the base's — a real final crown pins 16,000). */
  readonly paths: number
  /** The horizon the runs swept (the base's — the worst case is the longest). */
  readonly maxHorizonYears: number
  /** The held-out grade family size m (the grade runs winner+runner-up across it). */
  readonly bFamilySize: number
  /** The solve's outcome kind — a `recommended` profile measured the FULL search + grade; any other
   *  kind (token-withheld / mint-failed / unwitnessable / refused / withheld / aborted) short-circuited earlier and
   *  the caller must NOT read its `solveMs` as a full-solve worst case. */
  readonly payloadKind: SolvePayload['kind']
}

/**
 * Measure one full worker-side solve against its single-`simulate` baseline. Fails loud on a
 * non-finite / backwards injected clock (a lying clock is a MEASUREMENT FAULT — a negative interval
 * sails under any `< budget` check as a vacuous pass dressed as evidence; refuse it, never report it)
 * and on a baseline the input cannot even run (an indeterminate/infeasible base would report
 * validation cost as compute cost — measure the real thing or refuse). The `payloadKind` surfaces a
 * short-circuited solve so the caller asserts `=== 'recommended'` before trusting the worst-case cost.
 */
export function profileSolve(request: SolveRequest, now: () => number): SolveProfile {
  const t0 = now()
  if (!Number.isFinite(t0)) {
    throw new Error('[solverProfile] the injected clock returned a non-finite time (insight 010)')
  }

  // Baseline: ONE simulate at the request's own base params + seed — the same overlay machinery every
  // candidate run drives, at the same path count, so the ratio is a clean per-candidate multiple.
  const single = simulate(request.base, request.seedA)
  const t1 = now()
  // Finite AND monotone (≥, never > — equal stamps under a coarse clock are legitimate and routed to
  // the Infinity ratio below): a backwards/non-finite clock would report a NEGATIVE or NaN interval as
  // if measured. Refuse it — a lying clock is a fault, not a datapoint (the dateSearchProfile posture).
  if (!Number.isFinite(t1) || t1 < t0) {
    throw new Error('[solverProfile] the injected clock went non-finite/backwards across the baseline (insight 010)')
  }
  if (single.indeterminate) {
    throw new Error(
      `[solverProfile] the baseline is INDETERMINATE (${single.reason}) — profile a runnable input (the gate measures compute, not validation)`,
    )
  }
  if (single.infeasible) {
    throw new Error(
      `[solverProfile] the baseline is INFEASIBLE (${single.reason}) — profile a runnable input (the gate measures compute, not a mid-run failure)`,
    )
  }

  const payload = solveWithMint(request)
  const t2 = now()
  if (!Number.isFinite(t2) || t2 < t1) {
    throw new Error('[solverProfile] the injected clock went non-finite/backwards across the solve (insight 010)')
  }

  const singleSimulateMs = t1 - t0
  const solveMs = t2 - t1
  const rankableCount = request.candidates.filter((c) => c.conversion === null).length
  return {
    singleSimulateMs,
    solveMs,
    // A zero-ms baseline (a too-small fixture under a coarse clock) cannot yield a finite ratio —
    // surface Infinity honestly rather than divide-by-zero NaN (the caller must then use a bigger
    // baseline, not trust a vacuous ratio). Mirrors dateSearchProfile.
    ratioVsSingle: singleSimulateMs > 0 ? solveMs / singleSimulateMs : Number.POSITIVE_INFINITY,
    candidateCount: request.candidates.length,
    rankableCount,
    conversionCount: request.candidates.length - rankableCount,
    paths: request.base.paths,
    maxHorizonYears: request.base.maxHorizonYears,
    bFamilySize: solverBFamilySize.value,
    payloadKind: payload.kind,
  }
}
