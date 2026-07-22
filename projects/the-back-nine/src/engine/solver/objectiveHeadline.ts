/**
 * `objectiveHeadline.ts` — the PURE, simulate-free home of the after-tax-to-heirs bequest formula and
 * the objective≡headline render guard (U16 §Q6).
 *
 * WHY ITS OWN MODULE. The U16 recommendation surface is a DOWNSTREAM RENDERER that must call the
 * objective≡headline guard on the RENDER PATH (`recommendationView.ts`, reached eagerly through
 * `RecommendationSurface`). Everything the render path imports lands in the ENTRY bundle, and the
 * validation harness (`evaluate.ts`) imports `simulate` — the whole engine — at its top. So the
 * §1014/IRD bequest formula (`afterTaxBequestPerPath`, the M3 sign-inversion class the architecture
 * guards) was re-homed HERE, out of `evaluate.ts`, and `evaluate.ts` re-exports it verbatim: one
 * source of the formula, importable by the render path WITHOUT dragging `simulate` into the entry
 * bundle. This module imports ONLY `@shared/model` types — nothing runtime-heavy.
 *
 * THE GUARD (§Q6, burned/070). `assertObjectiveMatchesHeadline` RE-COMPUTES each displayed arm's goal
 * headline statistic from that arm's OWN seed-B distribution and refuses a payload whose stored
 * displayed figure disagrees — the structural proof that "the statistic that RANKED (seed-A tier2) ≡
 * the statistic DISPLAYED (seed-B headline)": the seed-A selection score can never leak into a
 * displayed figure, and a wrong-goal statistic can never ride the hero. The render path calls it (and
 * routes a throw to a calm unavailable, never a lying figure); a unit test calls it with a planted
 * mismatch to prove it BITES.
 *
 * PURE (engine-purity lint): no clock, entropy, or environment.
 */
import type { Distribution, RecommendationGoal } from '@shared/model'

/** Left-to-right sum ÷ length, with the insight-010 non-finite refusal (a NaN makes every downstream
 *  compare arbitrary). BYTE-IDENTICAL summation order to `evaluate.ts`'s `mean`, so a figure this
 *  recomputes `===` the figure `scoreFromDistribution` stored — the guard's strict-equality relies on it. */
function mean(xs: readonly number[]): number {
  if (xs.length === 0) throw new Error('[objectiveHeadline] mean of an empty array (insight 010 — refuse, never NaN)')
  let s = 0
  for (const x of xs) {
    if (!Number.isFinite(x)) throw new Error('[objectiveHeadline] non-finite element in a statistic (insight 010 — refuse, never NaN)')
    s += x
  }
  return s / xs.length
}

/**
 * The per-path AFTER-TAX-to-heirs bequest VECTOR (real $) — the §1014/IRD first-order form: the taxable
 * bucket steps up (heirs owe nothing on the embedded gain), pre-tax + HSA are IRD-taxed at the declared
 * heir bracket, Roth passes tax-free. SINGLE-SOURCED HERE (re-homed from `evaluate.ts` in the U16 fold):
 * `scoreFromDistribution` (the ranking statistic) and `objective.ts`'s skew-disclosure BOTH read this ONE
 * formula, so the ranked mean and the disclosed quantiles can never describe two different "leave-more"s.
 * `undefined` when the run carried no tax overlay (no bequest lens). Pure.
 */
export function afterTaxBequestPerPath(dist: Distribution, heirBracket: number): readonly number[] | undefined {
  if (!(Number.isFinite(heirBracket) && heirBracket >= 0 && heirBracket < 1)) {
    throw new Error(`[objectiveHeadline] heirBracket must be finite in [0, 1) (got ${heirBracket}) — insight 010`)
  }
  const ta = dist.taxAware
  if (ta === undefined) return undefined
  return ta.terminalTaxableReal.map(
    (taxable, p) =>
      taxable + // §1014: stepped up at death — heirs owe nothing on the gain
      (ta.terminalPretaxReal[p] ?? 0) * (1 - heirBracket) + // IRD at the declared bracket
      (ta.terminalRothReal[p] ?? 0) + // tax-free
      (ta.terminalHsaReal[p] ?? 0) * (1 - heirBracket), // taxable to a non-spouse heir (first-order)
  )
}

/**
 * The goal's DISPLAYED headline statistic RE-DERIVED from a seed-B distribution (real $, the exact units
 * the arm carries): pay-less-tax = mean lifetime tax paid; leave-more = mean after-tax-to-heirs bequest at
 * the declared bracket. This is the objective≡headline recompute the guard checks the STORED figure
 * against. An absent lens fails LOUD (burned/062 — no silent default). The exhaustive switch + never-guard
 * mirrors `objective.ts`'s `goalHeadlineStatistic`; `objectiveHeadline.test.ts` pins the two identical on a
 * distribution, so this light recompute can never drift from the canonical (heavy) one. Pure.
 */
export function headlineStatisticFromDistribution(
  dist: Distribution,
  goal: RecommendationGoal,
  heirBracket: number | undefined,
): number {
  switch (goal) {
    case 'pay-less-tax': {
      const ta = dist.taxAware
      if (ta === undefined) {
        throw new Error('[objectiveHeadline] pay-less-tax headline requires taxAware runs (burned/062 — no silent default)')
      }
      return mean(ta.lifetimeTaxPaidReal)
    }
    case 'leave-more': {
      if (heirBracket === undefined) {
        throw new Error('[objectiveHeadline] leave-more headline requires a declared heir bracket (burned/062)')
      }
      const vec = afterTaxBequestPerPath(dist, heirBracket)
      if (vec === undefined) {
        throw new Error('[objectiveHeadline] leave-more headline requires taxAware runs (burned/062)')
      }
      return mean(vec)
    }
    default: {
      const _exhaustive: never = goal
      throw new Error(`[objectiveHeadline] headlineStatisticFromDistribution: unknown goal ${String(_exhaustive)} — declare its headline`)
    }
  }
}

/** One displayed arm as the guard reads it — the STRUCTURAL slice of `SolveArm` (no import from the
 *  heavy `solve.ts`, so this module stays render-path-light). `SolveArm` is assignable to it. */
export interface HeadlineArm {
  readonly distributionB: Distribution
  readonly headlineStatisticB: number
}

/** The STRUCTURAL slice of `SolveRecommendation` the guard needs — the displayed arms + the goal +
 *  the leave-more skew (whose mean IS the winner's displayed headline). `SolveRecommendation` is
 *  assignable to it; the guard imports no solver type (render-path-light). */
export interface ObjectiveHeadlinePayload {
  readonly goal: RecommendationGoal
  readonly heirBracket: number | undefined
  readonly winner: HeadlineArm
  readonly runnerUp: HeadlineArm | undefined
  readonly noActionBaseline: HeadlineArm
  readonly skewDisclosure?: { readonly meanReal: number } | undefined
}

/**
 * Refuse a payload whose DISPLAYED figure disagrees with the OBJECTIVE statistic on its own seed-B
 * distribution — the render-path enforcement of contract #4 / objective≡headline (burned/070). For every
 * displayed arm (winner / runner-up / no-action baseline — the delta hero is `winner − baseline`, so both
 * are load-bearing), the stored `headlineStatisticB` MUST equal the goal statistic recomputed from
 * `distributionB`; a seed-A selection score or a wrong-goal figure cannot survive this. For leave-more, the
 * skew disclosure's `meanReal` IS the winner's displayed headline (insight 093 — ONE statistic both ranks
 * and displays; the disclosure is never a second authority), so a desync there is the same sin.
 *
 * THROWS (never returns false) on a mismatch — the render path catches and routes to a calm unavailable
 * rather than paint a figure that disagrees with what ranked; a unit test drives a planted mismatch to
 * prove it bites. Pure.
 */
export function assertObjectiveMatchesHeadline(payload: ObjectiveHeadlinePayload): void {
  const check = (arm: HeadlineArm | undefined, which: string): void => {
    if (arm === undefined) return
    const recomputed = headlineStatisticFromDistribution(arm.distributionB, payload.goal, payload.heirBracket)
    if (recomputed !== arm.headlineStatisticB) {
      throw new Error(
        `[objectiveHeadline] the DISPLAYED ${which} figure (${arm.headlineStatisticB}) is not the ${payload.goal} ` +
          `objective statistic on its own seed-B distribution (${recomputed}) — the ranked statistic and the ` +
          `displayed statistic have diverged (contract #4 / burned/070); refusing to render a figure that ` +
          `disagrees with what ranked`,
      )
    }
  }
  check(payload.winner, 'winner')
  check(payload.runnerUp, 'runner-up')
  check(payload.noActionBaseline, 'no-action baseline')
  if (payload.goal === 'leave-more' && payload.skewDisclosure !== undefined) {
    if (payload.skewDisclosure.meanReal !== payload.winner.headlineStatisticB) {
      throw new Error(
        `[objectiveHeadline] the leave-more skew mean (${payload.skewDisclosure.meanReal}) is not the winner's ` +
          `displayed headline (${payload.winner.headlineStatisticB}) — the disclosure and the primary display have ` +
          `diverged (insight 093 — ONE statistic ranks AND displays); refusing rather than showing two "leave-more"s`,
      )
    }
  }
}
