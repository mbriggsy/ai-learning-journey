import { describe, it, expect } from 'vitest'
import { NEVER_DEPLETED, type Distribution, type TaxAwareDistribution } from '@shared/model'
import {
  afterTaxBequestPerPath,
  headlineStatisticFromDistribution,
  assertObjectiveMatchesHeadline,
  type ObjectiveHeadlinePayload,
  type HeadlineArm,
} from '../objectiveHeadline'
import { goalHeadlineStatistic, distributionSkew } from '../objective'
import { scoreFromDistribution, afterTaxBequestPerPath as afterTaxViaEvaluate } from '../../validation/evaluate'
import { median, percentile } from '@engine/confidence'

/*
 * objectiveHeadline — the PURE, simulate-free objective≡headline guard (U16 §Q6). It re-derives each
 * displayed arm's goal statistic from its OWN seed-B distribution and refuses a payload whose displayed
 * figure disagrees with what ranked (burned/070). The planted-mismatch arm proves it BITES; the
 * equivalence arm proves the light recompute never drifts from the canonical goalHeadlineStatistic.
 */

const HB = 0.24

/** A minimal valid Distribution carrying a tax overlay — only the taxAware surfaces the two goals read
 *  are meaningful; the survival/terminal shell is legal filler (the guard never reads it). */
function distOf(ta: Partial<TaxAwareDistribution>): Distribution {
  const n = (ta.lifetimeTaxPaidReal ?? ta.terminalTaxableReal ?? [0]).length
  const zeros = Array<number>(n).fill(0)
  const taxAware: TaxAwareDistribution = {
    lifetimeTaxPaidReal: zeros,
    terminalTaxableReal: zeros,
    terminalPretaxReal: zeros,
    terminalRothReal: zeros,
    terminalHsaReal: zeros,
    terminalTaxableBasisReal: zeros,
    lifetimeNetPremiumReal: zeros,
    lifetimeMedicareCostReal: zeros,
    ...ta,
  }
  return {
    terminalValuesReal: zeros,
    depletionYears: Array(n).fill(NEVER_DEPLETED),
    survivalFraction: 1,
    taxAware,
  }
}

const arm = (dist: Distribution, headlineStatisticB: number): HeadlineArm => ({ distributionB: dist, headlineStatisticB })

describe('objectiveHeadline — the pure §1014 formula + the objective≡headline guard (U16 §Q6)', () => {
  it('afterTaxBequestPerPath is the ONE re-homed formula (evaluate re-exports the identical function)', () => {
    // The re-home preserves a single source (the M3 sign-inversion class the architecture guards).
    expect(afterTaxBequestPerPath).toBe(afterTaxViaEvaluate)
  })

  it('headlineStatisticFromDistribution equals the canonical goalHeadlineStatistic (no drift)', () => {
    // The light recompute (render-path) must match the heavy canonical (harness) on every distribution —
    // else the guard would refuse honest payloads. Independent path: goalHeadlineStatistic reads the
    // scoreFromDistribution fields; headlineStatisticFromDistribution recomputes from the raw arrays.
    const dist = distOf({
      lifetimeTaxPaidReal: [1000, 3000, 5000],
      terminalTaxableReal: [10_000, 20_000, 30_000],
      terminalPretaxReal: [5000, 5000, 5000],
      terminalRothReal: [1000, 2000, 3000],
      terminalHsaReal: [0, 0, 0],
    })
    for (const goal of ['pay-less-tax', 'leave-more'] as const) {
      const canonical = goalHeadlineStatistic(scoreFromDistribution(dist, HB), goal)
      expect(headlineStatisticFromDistribution(dist, goal, HB)).toBe(canonical)
    }
  })

  it('headlineStatisticFromDistribution fails LOUD on a missing lens (burned/062 — no silent default)', () => {
    const noTax: Distribution = { terminalValuesReal: [1], depletionYears: [NEVER_DEPLETED], survivalFraction: 1 }
    expect(() => headlineStatisticFromDistribution(noTax, 'pay-less-tax', undefined)).toThrow(/taxAware/)
    // leave-more without a declared heir bracket refuses (the IRD discount is undefined).
    const withTax = distOf({ terminalTaxableReal: [100], terminalPretaxReal: [0], terminalRothReal: [0], terminalHsaReal: [0] })
    expect(() => headlineStatisticFromDistribution(withTax, 'leave-more', undefined)).toThrow(/heir bracket/)
  })

  it('the guard PASSES a payload whose displayed figures ARE the objective statistic (pay-less-tax)', () => {
    // taxPaid means: winner 200, runner-up 250, baseline 400 (independent hand arithmetic).
    const payload: ObjectiveHeadlinePayload = {
      goal: 'pay-less-tax',
      heirBracket: undefined,
      winner: arm(distOf({ lifetimeTaxPaidReal: [100, 200, 300] }), 200),
      runnerUp: arm(distOf({ lifetimeTaxPaidReal: [200, 250, 300] }), 250),
      noActionBaseline: arm(distOf({ lifetimeTaxPaidReal: [300, 400, 500] }), 400),
    }
    expect(() => assertObjectiveMatchesHeadline(payload)).not.toThrow()
  })

  it('the guard BITES a planted mismatch — a displayed figure that disagrees with what ranked (mutant b)', () => {
    // The winner's displayed figure is a LIE (a seed-A leak / wrong-goal value) — the guard refuses.
    const bad: ObjectiveHeadlinePayload = {
      goal: 'pay-less-tax',
      heirBracket: undefined,
      winner: arm(distOf({ lifetimeTaxPaidReal: [100, 200, 300] }), 999), // recompute = 200, stored = 999
      runnerUp: undefined,
      noActionBaseline: arm(distOf({ lifetimeTaxPaidReal: [300, 400, 500] }), 400),
    }
    expect(() => assertObjectiveMatchesHeadline(bad)).toThrow(/diverged|ranked/)
    // The BASELINE (feeds the delta) is guarded too — a wrong baseline figure bites.
    const badBaseline: ObjectiveHeadlinePayload = { ...bad, winner: arm(distOf({ lifetimeTaxPaidReal: [100, 200, 300] }), 200), noActionBaseline: arm(distOf({ lifetimeTaxPaidReal: [300, 400, 500] }), 111) }
    expect(() => assertObjectiveMatchesHeadline(badBaseline)).toThrow(/no-action baseline/)
  })

  it('leave-more: the skew mean IS the winner headline (insight 093) — a desync bites', () => {
    // bequest per path = taxable + pretax*(1-hb) + roth + hsa*(1-hb); hb=0.24.
    // winner: [10000+5000*0.76+0+0, 20000+5000*0.76+0+0] = [13800, 23800], mean 18800.
    const winnerDist = distOf({ terminalTaxableReal: [10_000, 20_000], terminalPretaxReal: [5000, 5000], terminalRothReal: [0, 0], terminalHsaReal: [0, 0] })
    const winner = arm(winnerDist, 18_800)
    const baseDist = distOf({ terminalTaxableReal: [5000, 5000], terminalPretaxReal: [0, 0], terminalRothReal: [0, 0], terminalHsaReal: [0, 0] })
    const base = arm(baseDist, 5000)
    const good: ObjectiveHeadlinePayload = { goal: 'leave-more', heirBracket: HB, winner, runnerUp: undefined, noActionBaseline: base, skewDisclosure: { meanReal: 18_800 } }
    expect(() => assertObjectiveMatchesHeadline(good)).not.toThrow()
    // Plant a skew mean that disagrees with the winner's displayed headline.
    expect(() => assertObjectiveMatchesHeadline({ ...good, skewDisclosure: { meanReal: 12_345 } })).toThrow(/insight 093|diverged/)
  })

  // --- Q6 percentile SOURCE-BIND: the skew disclosure's convention IS confidence.ts's (no drift) ---
  it('distributionSkew reads confidence.ts’s nearest-rank median/percentile convention (§Q6 source-bind)', () => {
    const values = [12, 3, 7, 99, 40, 5, 61, 22, 8, 1]
    const skew = distributionSkew(values)
    const sorted = [...values].sort((a, b) => a - b)
    // The disclosed p10/p50/p90 line up with the band's OWN convention byte-for-byte (one home).
    expect(skew.medianReal).toBe(median(sorted))
    expect(skew.p10Real).toBe(percentile(sorted, 0.1))
    expect(skew.p90Real).toBe(percentile(sorted, 0.9))
  })
})
