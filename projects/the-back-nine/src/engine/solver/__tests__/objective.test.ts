/**
 * U15 §S1/§S2 — the objective adapter proof battery.
 *
 * S1: `rankForGoal ≡ rankCandidates` on committed fixtures (the thin-adapter identity — no parallel
 *     scorer), and objective ≡ headline (the ranked order agrees with the displayed statistic).
 * S2: the DISPERSED-WORLD hand-derived ORDERING demonstration + the skew-disclosure channel.
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────────────
 * THE §S2 FIXTURE ATTEMPT — ON THE RECORD (tractable? NO — the architect's default ships).
 *
 * The blocking amendment asked: can the leave-more RANKING statistic go downside-aware (median /
 * low-quantile), PROVEN by a dispersed-world oracle fixture where the mean ordering flips vs the
 * downside ordering, both derived exactly by hand? Two halves:
 *
 *  (a) Is the flip REAL?  YES — derived exactly by hand below (`dispersedWorld`). A right-skewed
 *      after-tax-to-heirs distribution ranks one way on the MEAN and the OPPOSITE way on the
 *      median / p10. This test proves it through the REAL `scoreFromDistribution` + `distributionSkew`.
 *
 *  (b) Can that flip be an ENGINE-RUN oracle fixture (`SOLVER_CASES`, graded via `simulate`) with
 *      exact `expected()` assertions?  NO. Every exact oracle world is zero-vol / fixed-horizon
 *      (there mean = median = every quantile, so `caseLeaveMore` is DEGENERATE for this question by
 *      construction). The engine's ONLY dispersion sources are (i) market returns via Box-Muller
 *      (`rng.standardNormal` = `Math.sqrt`/`Math.log`/`Math.cos` — not hand-derivable, and per
 *      CLAUDE.md not even bit-identical across JS engines) and (ii) the mortality table (re-deriving
 *      which BY HAND re-implements the engine → proves typing, not correctness → DND-012). A dispersed
 *      ledger cannot be made exact without loosening tolerance, and insight 091 forbids buying
 *      tractability with tolerance.
 *
 * VERDICT: INTRACTABLE for the RANKING switch. Switching the ranked statistic to a downside quantile
 * would move the ranking onto an UN-oracled quantity (no deterministic fixture can distinguish mean
 * from median; no dispersed fixture can be hand-derived through the engine). So the MEAN ranks (the
 * deterministic battery genuinely oracles `expectedRankingIds`), robustness stays in the grade's
 * per-path CRN axis, and the mean's skew is DISCLOSED via `leaveMoreSkewDisclosure` (never silent —
 * insight 092). This test is the durable record of the attempt; the dated note lives in the U15 spec's
 * build stamp (§S2). The demonstration below is a direct-to-scorer PROOF of the phenomenon + a unit
 * test of the disclosure — it is deliberately NOT a `SolverCaseFixture` (it has no engine world that
 * produces these exact dispersed paths, which is precisely the intractability).
 * ─────────────────────────────────────────────────────────────────────────────────────────────────
 */
import { describe, it, expect } from 'vitest'
import { NEVER_DEPLETED, type DepletionYear, type Distribution } from '@shared/model'
import {
  distributionSkew,
  goalHeadlineStatistic,
  goalHigherIsBetter,
  leaveMoreSkewDisclosure,
  rankForGoal,
} from '../objective'
import { evaluateCandidates, rankCandidates, scoreFromDistribution, type CandidateOutcome } from '../../validation/evaluate'
import { solverCandidateId, type CandidateStrategy } from '../candidates'
import { caseBracketFill, caseNoChange } from '../../reference/solver-cases'

const isScored = (o: CandidateOutcome): o is Extract<CandidateOutcome, { kind: 'scored' }> => o.kind === 'scored'

/** A hand Distribution from explicit per-path terminal buckets (real $). taxAware is always present
 *  (the bequest lens requires it); the gross terminal is the bucket sum, every path survives. */
function distFromBuckets(opts: {
  readonly roth: readonly number[]
  readonly pretax?: readonly number[]
  readonly taxable?: readonly number[]
  readonly hsa?: readonly number[]
}): Distribution {
  const n = opts.roth.length
  const zeros: readonly number[] = new Array(n).fill(0)
  const taxable = opts.taxable ?? zeros
  const pretax = opts.pretax ?? zeros
  const hsa = opts.hsa ?? zeros
  const depletionYears: readonly DepletionYear[] = new Array(n).fill(NEVER_DEPLETED)
  return {
    terminalValuesReal: opts.roth.map((r, i) => r + (pretax[i] ?? 0) + (taxable[i] ?? 0) + (hsa[i] ?? 0)),
    depletionYears,
    survivalFraction: 1,
    taxAware: {
      lifetimeTaxPaidReal: zeros,
      terminalTaxableReal: taxable,
      terminalPretaxReal: pretax,
      terminalRothReal: opts.roth,
      terminalHsaReal: hsa,
      terminalTaxableBasisReal: taxable,
      lifetimeNetPremiumReal: zeros,
      lifetimeMedicareCostReal: zeros,
    },
  }
}

function scoredOutcome(candidate: CandidateStrategy, dist: Distribution, heirBracket: number): CandidateOutcome {
  return { kind: 'scored', candidate, score: scoreFromDistribution(dist, heirBracket), distribution: dist }
}

describe('objective — the thin adapter is the reference ranking (S1)', () => {
  it('rankForGoal ≡ rankCandidates on caseBracketFill (leave-more) — no parallel scorer', () => {
    const outcomes = evaluateCandidates(caseBracketFill.buildBase(), caseBracketFill.buildCandidates(), caseBracketFill.seed, {
      heirBracket: caseBracketFill.preconditions.heirBracket,
    })
    const viaObjective = rankForGoal(outcomes, caseBracketFill.goal, caseBracketFill.tieTolerance).map((o) =>
      solverCandidateId(o.candidate),
    )
    const viaReference = rankCandidates(outcomes, caseBracketFill.goal, caseBracketFill.tieTolerance).map((o) =>
      solverCandidateId(o.candidate),
    )
    expect(viaObjective).toEqual(viaReference)
    // …and the reference ranking IS the fixture's hand-derived oracle (the adapter produces the oracled order).
    expect(viaObjective).toEqual([...caseBracketFill.expectedRankingIds])
  })

  it('rankForGoal ≡ rankCandidates on caseNoChange (pay-less-tax) — the other goal', () => {
    const outcomes = evaluateCandidates(caseNoChange.buildBase(), caseNoChange.buildCandidates(), caseNoChange.seed, {
      heirBracket: caseNoChange.preconditions.heirBracket,
    })
    const viaObjective = rankForGoal(outcomes, caseNoChange.goal, caseNoChange.tieTolerance).map((o) =>
      solverCandidateId(o.candidate),
    )
    const viaReference = rankCandidates(outcomes, caseNoChange.goal, caseNoChange.tieTolerance).map((o) =>
      solverCandidateId(o.candidate),
    )
    expect(viaObjective).toEqual(viaReference)
    expect(viaObjective).toEqual([...caseNoChange.expectedRankingIds])
  })
})

describe('objective ≡ headline — the ranked order agrees with the displayed statistic (S1, sign-flip catcher)', () => {
  it('goalHigherIsBetter names the display orientation', () => {
    expect(goalHigherIsBetter('leave-more')).toBe(true)
    expect(goalHigherIsBetter('pay-less-tax')).toBe(false)
  })

  it('leave-more: the headline bequest is non-increasing down the survival-top ranking', () => {
    const outcomes = evaluateCandidates(caseBracketFill.buildBase(), caseBracketFill.buildCandidates(), caseBracketFill.seed, {
      heirBracket: caseBracketFill.preconditions.heirBracket,
    })
    const ranked = rankForGoal(outcomes, 'leave-more', caseBracketFill.tieTolerance).filter(isScored)
    expect(ranked.length).toBeGreaterThan(1)
    // higher-is-better ⇒ the displayed figure is non-increasing down the ranking (objective ≡ headline):
    // the ranked order equals the figures sorted DESCENDING. A sign flip in either function breaks this.
    const stats = ranked.map((o) => goalHeadlineStatistic(o.score, 'leave-more'))
    expect(stats).toEqual([...stats].sort((a, b) => b - a))
  })

  it('pay-less-tax: the headline tax is non-decreasing down the ranking', () => {
    const outcomes = evaluateCandidates(caseNoChange.buildBase(), caseNoChange.buildCandidates(), caseNoChange.seed, {
      heirBracket: caseNoChange.preconditions.heirBracket,
    })
    const ranked = rankForGoal(outcomes, 'pay-less-tax', caseNoChange.tieTolerance).filter(isScored)
    expect(ranked.length).toBeGreaterThan(1)
    // lower-is-better ⇒ the displayed tax is non-decreasing down the ranking: the ranked order equals
    // the figures sorted ASCENDING.
    const stats = ranked.map((o) => goalHeadlineStatistic(o.score, 'pay-less-tax'))
    expect(stats).toEqual([...stats].sort((a, b) => a - b))
  })

  it('goalHeadlineStatistic reads the harness score field verbatim (never recomputes)', () => {
    const dist = distFromBuckets({ roth: [100, 300], pretax: [1000, 500], taxable: [200, 200] })
    const hb = 0.25
    const score = scoreFromDistribution(dist, hb)
    expect(goalHeadlineStatistic(score, 'leave-more')).toBe(score.afterTaxBequestMeanReal)
    expect(goalHeadlineStatistic(score, 'pay-less-tax')).toBe(score.lifetimeTaxMeanReal)
  })

  it('an undefined statistic under an active goal fails LOUD (burned/062)', () => {
    const noTax: Distribution = { terminalValuesReal: [1, 2], depletionYears: [NEVER_DEPLETED, NEVER_DEPLETED], survivalFraction: 1 }
    const score = scoreFromDistribution(noTax) // no heirBracket, no taxAware ⇒ both goal statistics undefined
    expect(() => goalHeadlineStatistic(score, 'leave-more')).toThrow(/leave-more headline requires/)
    expect(() => goalHeadlineStatistic(score, 'pay-less-tax')).toThrow(/pay-less-tax headline requires/)
  })
})

describe('distributionSkew — the raw quantile read (nearest-rank convention, mirror of confidence.ts)', () => {
  it('pins the odd-n convention (n=5): mean 30, median 30, p10 10, p90 40', () => {
    // sorted [10,20,30,40,50] · median idx floor(5/2)=2 → 30 · p10 idx floor(0.1·4)=0 → 10 · p90 idx floor(0.9·4)=3 → 40
    const s = distributionSkew([50, 10, 30, 20, 40])
    expect(s).toEqual({ meanReal: 30, medianReal: 30, p10Real: 10, p90Real: 40 })
  })

  it('pins the even-n convention (n=4): median averages the two middles', () => {
    // sorted [10,20,30,40] · median (20+30)/2 = 25 · p10 idx floor(0.1·3)=0 → 10 · p90 idx floor(0.9·3)=2 → 30
    const s = distributionSkew([40, 10, 30, 20])
    expect(s).toEqual({ meanReal: 25, medianReal: 25, p10Real: 10, p90Real: 30 })
  })

  it('refuses a non-finite element and an empty sample (insight 010 — never NaN)', () => {
    expect(() => distributionSkew([1, Number.NaN, 3])).toThrow(/non-finite/)
    expect(() => distributionSkew([1, Number.POSITIVE_INFINITY])).toThrow(/non-finite/)
    expect(() => distributionSkew([])).toThrow(/empty/)
  })
})

describe('§S2 the dispersed-world ORDERING flip — hand-derived, DND-012 (the fixture attempt)', () => {
  // ── THE HAND DERIVATION (both orderings, exact) ────────────────────────────────────────────────
  // Two candidates, each a 5-path world of after-tax-to-heirs (pure Roth ⇒ after-tax ≡ Roth exactly,
  // so the §1014/IRD formula — oracled by caseLeaveMore/caseBracketFill — is out of scope here; this
  // isolates the DISPERSION/statistic axis, insight 091's "make the discriminating mechanism exact").
  //
  //   A (right-skewed):  after-tax paths = [100, 100, 100, 100, 2000]
  //     mean   = (100+100+100+100+2000)/5 = 2400/5 = 480
  //     median = sorted[2]                = 100          (one lucky path carries the whole average)
  //     p10    = sorted[floor(0.1·4)=0]   = 100
  //   B (tight):         after-tax paths = [300, 300, 300, 300, 300]
  //     mean = median = p10 = 300
  //
  //   MEAN ordering (higher better):     A (480) > B (300)   ⇒  A wins
  //   MEDIAN / p10 ordering (downside):  B (300) > A (100)   ⇒  B wins  — the EXACT REVERSE.
  //
  // The switch to a downside statistic would flip the crown A→B. That is the amendment's live concern,
  // proven real. We consciously KEEP the mean ranking (the only oracle-validatable choice) and DISCLOSE
  // A's upside skew instead of silently crowning it as if $480 were the typical bequest.
  const HEIR_BRACKET = 0.25 // valid + present for the taxAware branch; irrelevant to pure-Roth value
  const A: CandidateStrategy = { policy: 'taxable-first', conversion: null, provenance: 'grid' }
  const B: CandidateStrategy = { policy: 'proportional', conversion: null, provenance: 'grid' }
  const distA = distFromBuckets({ roth: [100, 100, 100, 100, 2000] })
  const distB = distFromBuckets({ roth: [300, 300, 300, 300, 300] })
  const idA = solverCandidateId(A) // grid:taxable-first:0
  const idB = solverCandidateId(B) // grid:proportional:0

  it('the real scorer reproduces the hand means (480 vs 300)', () => {
    expect(scoreFromDistribution(distA, HEIR_BRACKET).afterTaxBequestMeanReal).toBe(480)
    expect(scoreFromDistribution(distB, HEIR_BRACKET).afterTaxBequestMeanReal).toBe(300)
  })

  it('the MEAN ranking crowns A (the ranked + displayed statistic — contract #4)', () => {
    const outcomes = [scoredOutcome(A, distA, HEIR_BRACKET), scoredOutcome(B, distB, HEIR_BRACKET)]
    const ranked = rankForGoal(outcomes, 'leave-more', 0).map((o) => solverCandidateId(o.candidate))
    expect(ranked).toEqual([idA, idB])
  })

  it('the DOWNSIDE statistic ranks B over A — the reverse (the switch would flip the crown)', () => {
    const sA = distributionSkew([100, 100, 100, 100, 2000])
    const sB = distributionSkew([300, 300, 300, 300, 300])
    // median disagrees with the mean…
    expect(sA.medianReal).toBeLessThan(sB.medianReal)
    // …and so does the low-futures edge.
    expect(sA.p10Real).toBeLessThan(sB.p10Real)
    // sort the two candidates by median descending (higher-is-better) ⇒ [B, A], the REVERSE of the mean order.
    const downsideOrder = [
      { id: idA, median: sA.medianReal },
      { id: idB, median: sB.medianReal },
    ]
      .sort((x, y) => y.median - x.median)
      .map((e) => e.id)
    expect(downsideOrder).toEqual([idB, idA])
    expect(downsideOrder).not.toEqual([idA, idB]) // provably different from the mean ranking
  })

  it('the skew is DISCLOSED, not silent: A is upside-skewed (mean 480 ≫ typical 100), B symmetric', () => {
    const discA = leaveMoreSkewDisclosure(distA, HEIR_BRACKET)
    const discB = leaveMoreSkewDisclosure(distB, HEIR_BRACKET)
    expect(discA).toEqual({
      meanReal: 480,
      medianReal: 100,
      p10Real: 100,
      p90Real: 100,
      skewDirection: 'upside',
      meanMinusMedianReal: 380,
    })
    expect(discB).toEqual({
      meanReal: 300,
      medianReal: 300,
      p10Real: 300,
      p90Real: 300,
      skewDirection: 'symmetric',
      meanMinusMedianReal: 0,
    })
  })

  it('the disclosure carries the typical figure SEPARATELY — the ranking never silently switches to it', () => {
    // The display-vs-rank split mutant (S7): we rank AND display the mean (A's 480 is the headline),
    // while the median rides as a distinct disclosure field — never substituted into the ranking.
    const outcomes = [scoredOutcome(A, distA, HEIR_BRACKET), scoredOutcome(B, distB, HEIR_BRACKET)]
    const winner = rankForGoal(outcomes, 'leave-more', 0)[0]
    expect(winner).toBeDefined()
    if (winner === undefined || winner.kind !== 'scored') throw new Error('unreachable — both outcomes scored')
    // the ranked winner's DISPLAYED figure is the mean…
    expect(goalHeadlineStatistic(winner.score, 'leave-more')).toBe(480)
    // …and the disclosure exposes that its TYPICAL is far lower (the honest channel), a DISTINCT field.
    const disc = leaveMoreSkewDisclosure(winner.distribution, HEIR_BRACKET)
    expect(disc?.medianReal).toBe(100)
    expect(disc?.medianReal).not.toBe(disc?.meanReal)
  })
})

describe('leaveMoreSkewDisclosure — presence contract', () => {
  it('is undefined when the run carried no tax overlay (no bequest lens)', () => {
    const noTax: Distribution = { terminalValuesReal: [1, 2], depletionYears: [NEVER_DEPLETED, NEVER_DEPLETED], survivalFraction: 1 }
    expect(leaveMoreSkewDisclosure(noTax, 0.25)).toBeUndefined()
  })

  it('a genuine left-skew reports downside (mean < typical) — the direction is faithful to the sign', () => {
    // paths [50, 300, 300, 300, 300]: mean = 250 < median 300 ⇒ the average UNDERSTATES the typical.
    const dist = distFromBuckets({ roth: [50, 300, 300, 300, 300] })
    const disc = leaveMoreSkewDisclosure(dist, 0.25)
    expect(disc?.meanReal).toBe(250)
    expect(disc?.medianReal).toBe(300)
    expect(disc?.skewDirection).toBe('downside')
    expect(disc?.meanMinusMedianReal).toBe(-50)
  })
})
