/**
 * `objective.ts` — the SOLVER's thin goal→statistic adapter (U15 §S1/§S2).
 *
 * THE ONE SCORING HOME IS THE HARNESS. This module hosts NO parallel scorer: it maps the chosen
 * Tier-2 goal to the statistic `evaluate.ts` already computes and FORWARDS to the reference
 * `rankCandidates` / `scoreFromDistribution` / `candidateTieBreak` (plan contract #4 — objective ≡
 * headline). `search.ts` / `select.ts` consume THIS seam rather than reaching into the validation
 * harness directly, and `objective.test.ts` pins `rankForGoal ≡ rankCandidates` so the seam can never
 * silently drift from the oracle-validated ranking — a solver-native scorer that pins finitely many
 * fixtures and drifts BETWEEN them is exactly what evaluate.ts's seam contract named this council to
 * forbid. `goalHeadlineStatistic` reads the harness's own score field verbatim (the sign lives once,
 * in `tier2`'s orientation), so the ranked quantity and the displayed quantity can never diverge.
 *
 * THE Q2 RESOLUTION (§S2 — the INTRACTABLE exit, on the record). The leave-more statistic RANKS on the
 * MEAN of after-tax-to-heirs. The blocking amendment asked whether it should instead go downside-aware
 * (median / low-quantile), proven by a dispersed-world oracle fixture where the mean ordering flips vs
 * the downside ordering. That flip is REAL — `objective.test.ts` derives it by hand — but it CANNOT be
 * realized as an engine-run oracle fixture: every exact oracle world is zero-vol / fixed-horizon (there
 * mean = median = every quantile, so the switch is unprovable — `caseLeaveMore` is degenerate for this
 * question by construction), and the engine's ONLY dispersion sources are transcendental (Box-Muller:
 * `Math.sqrt`/`Math.log`/`Math.cos`, not hand-derivable and not even bit-identical across JS engines)
 * or the mortality table (re-deriving it by hand re-implements the engine → proves typing, not
 * correctness → DND-012). A dispersed ledger cannot be made exact without loosening tolerance, and
 * insight 091 forbids buying tractability with tolerance. So the mean RANKS (the deterministic battery
 * genuinely oracles `expectedRankingIds`), robustness stays in the grade's per-path CRN axis (insight
 * 093), and the mean's skew is DISCLOSED, never silent: `leaveMoreSkewDisclosure` carries the ranked
 * mean beside the median + low-quantile so U16 can say "the average leans on a few lucky futures; the
 * typical bequest is $X" (insight 092 — a dropped channel is an abstention, not a pass). The disclosure
 * is NEVER a second ranking authority — one statistic (the mean) both ranks AND is the primary display.
 *
 * PURE (engine-purity lint): no clock, entropy, or environment.
 */
import type { Distribution } from '@shared/model'
import {
  afterTaxBequestPerPath,
  rankCandidates,
  type CandidateOutcome,
  type CandidateScore,
  type OracleGoal,
} from '../validation/evaluate'

export type { OracleGoal, CandidateOutcome, CandidateScore }

/**
 * Rank K candidate outcomes for the chosen goal — the SOLVER's ranking seam. A pure FORWARD to the
 * reference `rankCandidates` (the equivalence test pins the identity byte-for-byte on committed
 * fixtures); no re-scoring, no re-derived sign convention, no re-implemented lexicographic order.
 * `search.ts` ranks the enumerated field through THIS so the shipped ranking IS the oracled one.
 */
export function rankForGoal(
  outcomes: readonly CandidateOutcome[],
  goal: OracleGoal,
  tieTolerance: number,
): readonly CandidateOutcome[] {
  return rankCandidates(outcomes, goal, tieTolerance)
}

/**
 * The goal's Tier-2 statistic in the EXACT units the headline renders (objective ≡ headline, plan
 * contract #4): leave-more = the mean after-tax-to-heirs bequest (real $, higher is better);
 * pay-less-tax = the mean lifetime tax paid (real $, lower is better). READS the harness's already-
 * computed score field verbatim — it never recomputes a statistic (the sign lives once, in `tier2`'s
 * orientation, which `rankForGoal` ranks on). An undefined statistic under an active goal fails LOUD
 * (burned/062 — no silent default). This is the figure the solve payload displays; `rankForGoal`
 * ranks on the SAME field (negated for leave-more inside `tier2`), so the two can never disagree.
 */
export function goalHeadlineStatistic(score: CandidateScore, goal: OracleGoal): number {
  // EXHAUSTIVE switch + never-guard (the sequencing.ts/candidates.ts idiom): a future third
  // RECOMMENDATION_GOALS member fails tsc HERE, never silently scoring as leave-more (the fall-through
  // an if-chain would hide). Copied to every goal-dispatch surface (tier2, goalHigherIsBetter, gradeAxisFor).
  switch (goal) {
    case 'pay-less-tax':
      if (score.lifetimeTaxMeanReal === undefined) {
        throw new Error('[objective] pay-less-tax headline requires taxAware runs (burned/062 — no silent default)')
      }
      return score.lifetimeTaxMeanReal
    case 'leave-more':
      if (score.afterTaxBequestMeanReal === undefined) {
        throw new Error('[objective] leave-more headline requires taxAware runs + a declared heirBracket (burned/062)')
      }
      return score.afterTaxBequestMeanReal
    default: {
      const _exhaustive: never = goal
      throw new Error(`[objective] goalHeadlineStatistic: unknown goal ${String(_exhaustive)} — the objective wiring must widen with a new goal`)
    }
  }
}

/**
 * Is the goal's headline BETTER when larger? (leave-more: yes — more to heirs; pay-less-tax: no —
 * less tax.) The ONE place the display orientation is named; `objective.test.ts` asserts `rankForGoal`'s
 * order agrees with sorting by `goalHeadlineStatistic` in THIS direction within the survival-top set
 * (the objective ≡ headline pin — a sign flip in either function fails it).
 */
export function goalHigherIsBetter(goal: OracleGoal): boolean {
  // EXHAUSTIVE switch + never-guard: a future third goal fails tsc here rather than defaulting to
  // `false` (the pay-less-tax orientation) — a silent wrong orientation is a sign-inversion class bug.
  switch (goal) {
    case 'leave-more':
      return true
    case 'pay-less-tax':
      return false
    default: {
      const _exhaustive: never = goal
      throw new Error(`[objective] goalHigherIsBetter: unknown goal ${String(_exhaustive)} — declare its display orientation`)
    }
  }
}

// ---- §S2 the skew disclosure (the INTRACTABLE-exit honest channel) --------------------------------

/**
 * A raw distributional skew read (orientation-free) over a per-path real-$ statistic. The quantiles use
 * the confidence band's nearest-rank convention (a mirror of `confidence.ts` `median`/`percentile`,
 * lines 105–116) so a "typical" figure the disclosure hands U16 lines up with the band's own p10/p50 —
 * U16 MUST single-source this convention against `confidence.ts` when it renders the two adjacently
 * (flagged in the build handoff); `objective.test.ts` pins the convention against a known vector meanwhile.
 */
export interface DistributionSkew {
  readonly meanReal: number
  readonly medianReal: number
  /** 10th percentile — the low-futures (downside) edge, the band's convention. */
  readonly p10Real: number
  /** 90th percentile — the high-futures edge. */
  readonly p90Real: number
}

const sortAsc = (xs: readonly number[]): number[] => [...xs].sort((a, b) => a - b)

/** Nearest-rank percentile on an ASCENDING-sorted sample — mirror of `confidence.ts:113-116`. */
const sortedPercentile = (sorted: readonly number[], p: number): number => {
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor(p * (sorted.length - 1))))
  return sorted[idx] ?? 0
}

/** Median on an ASCENDING-sorted sample (even n averages the two middles) — mirror of `confidence.ts:105-111`. */
const sortedMedian = (sorted: readonly number[]): number => {
  const n = sorted.length
  const mid = Math.floor(n / 2)
  if (n % 2 === 1) return sorted[mid] ?? 0
  return ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2
}

/**
 * Mean + median + p10/p90 of a per-path statistic. Every element must be FINITE (insight 010 — a NaN
 * makes the mean NaN and every downstream compare arbitrary) and the sample non-empty (insight 010 —
 * refuse, never NaN). Pure; consumes no draws.
 */
export function distributionSkew(values: readonly number[]): DistributionSkew {
  if (values.length === 0) {
    throw new Error('[objective] distributionSkew of an empty sample (insight 010 — refuse, never NaN)')
  }
  let s = 0
  for (const x of values) {
    if (!Number.isFinite(x)) {
      throw new Error('[objective] non-finite element in a skew statistic (insight 010 — refuse, never NaN)')
    }
    s += x
  }
  const sorted = sortAsc(values)
  return {
    meanReal: s / values.length,
    medianReal: sortedMedian(sorted),
    p10Real: sortedPercentile(sorted, 0.1),
    p90Real: sortedPercentile(sorted, 0.9),
  }
}

/**
 * The direction the RANKED mean leans relative to the typical (median) bequest. `upside` (mean >
 * median) is the disclosure-worthy shape — the average is propped up by a few lucky futures, so a calm
 * "you'll leave $<mean>" would overstate the typical outcome (the calm-but-wrong-OPTIMISTIC risk this
 * channel exists to surface). `downside` (mean < median) and `symmetric` (exactly equal) are carried
 * for completeness; the "how much is worth saying" threshold is U16's copy obligation, never minted here.
 */
export type SkewDirection = 'upside' | 'downside' | 'symmetric'

/**
 * The structured leave-more skew disclosure that rides the solve payload for U16 (§S2 INTRACTABLE exit).
 * It carries the RANKED figure (the mean — what `rankForGoal` crowns on) beside the downside-aware
 * figures (median = the typical bequest; p10 = the low-futures edge) and the skew DIRECTION + magnitude,
 * so U16 discloses the mean's skew adjacent to the figure. NO copy is authored here (Q6) and NO threshold
 * is minted (that is U16's copy call); the engine NAMES the channel and hands over the numbers. This is a
 * DISCLOSURE, never a ranking — the mean still both ranks and is the primary displayed quantity.
 */
export interface LeaveMoreSkewDisclosure extends DistributionSkew {
  readonly skewDirection: SkewDirection
  /** meanReal − medianReal (real $): how much the ranked average exceeds the typical bequest. */
  readonly meanMinusMedianReal: number
}

/**
 * Compute the leave-more skew disclosure from a run's distribution + declared heir bracket, reusing the
 * SINGLE-SOURCED after-tax-to-heirs per-path vector (`afterTaxBequestPerPath`) — the ranked mean and the
 * disclosed quantiles read the SAME §1014/IRD formula, so they can never describe two different
 * "leave-more"s (contract #4). `undefined` when the run carried no tax overlay (no bequest lens to
 * disclose). Pure.
 */
export function leaveMoreSkewDisclosure(dist: Distribution, heirBracket: number): LeaveMoreSkewDisclosure | undefined {
  const perPath = afterTaxBequestPerPath(dist, heirBracket)
  if (perPath === undefined) return undefined
  const skew = distributionSkew(perPath)
  const gap = skew.meanReal - skew.medianReal
  const skewDirection: SkewDirection = gap > 0 ? 'upside' : gap < 0 ? 'downside' : 'symmetric'
  return { ...skew, skewDirection, meanMinusMedianReal: gap }
}
