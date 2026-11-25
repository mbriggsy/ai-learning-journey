/**
 * Hand-built solve payloads for Tax Strategies' composers (RC8). An arm's displayed figure IS the objective statistic on
 * its own distribution (`headlineStatisticFromDistribution`), so `recommendationView`'s render-path guard passes them,
 * as it passes a real solve (the `recommendationView.test.ts` fixtures' shape).
 */
import { NEVER_DEPLETED, type Distribution, type RecommendationGoal, type SavedRecommendationV3, type TaxAwareDistribution } from '@shared/model'
import { headlineStatisticFromDistribution } from '@engine/solver/objectiveHeadline'
import type { SolveArm, SolveRecommendation } from '@engine/solver/solve'
import type { GradeResult } from '@engine/validation/gradeCalibration'
import type { SolverRunFingerprint } from '@engine/validation/solverRunFingerprint'
import type { MemoryModelSnapshot, ModelAnswer, ScenarioDraft, SolveAnswer } from '@store/memoryModel'
import type { SavedRecommendationStatus } from '@store/savedRecommendation'

export function distOf(ta: Partial<TaxAwareDistribution>): Distribution {
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
  return { terminalValuesReal: zeros, depletionYears: Array(n).fill(NEVER_DEPLETED), survivalFraction: 1, taxAware }
}

export const HB = 0.24

export function armFor(goal: RecommendationGoal, id: string, policy: SolveArm['policy'], ta: Partial<TaxAwareDistribution>, conversion: SolveArm['conversion'] = null): SolveArm {
  const dist = distOf(ta)
  return { id, policy, conversion, distributionB: dist, headlineStatisticB: headlineStatisticFromDistribution(dist, goal, goal === 'leave-more' ? HB : undefined), survivalB: 0.99 }
}

export function grade(g: 'just-do-it' | 'coin-flip', subTenthCollapse = false): GradeResult {
  return { grade: g, memberMargins: [{ margin: 0.02, se: 0.001, band: 0.002, beyondBand: true, paths: 16000 }], demotionFired: false, subTenthCollapse }
}

const bequest = (taxable: [number, number]) => ({ terminalTaxableReal: taxable, terminalPretaxReal: [100_000, 100_000], terminalRothReal: [0, 0], terminalHsaReal: [0, 0] })

/** A leave-more recommendation: the winner (576k after tax) ahead of the runner-up (546k) and the baseline (426k). */
export function leaveMoreRec(o: Partial<SolveRecommendation> = {}): SolveRecommendation {
  const goal: RecommendationGoal = 'leave-more'
  const winner = armFor(goal, 'taxable-first|grid|0', 'taxable-first', bequest([400_000, 600_000]), { annualAmountReal: 21_900, startYearOffset: 0, years: 5 })
  const baseline = armFor(goal, 'proportional|user|0', 'proportional', bequest([300_000, 400_000]))
  const runnerUp = armFor(goal, 'bracket-fill|grid|0', 'bracket-fill', bequest([380_000, 560_000]))
  return {
    kind: 'recommended',
    goal,
    heirBracket: HB,
    seedA: 1,
    seedB: 2,
    winner,
    runnerUp,
    noActionBaseline: baseline,
    rankedIds: [winner.id, runnerUp.id, 'pruned-a', baseline.id, 'pruned-b'],
    prunedScores: [
      { id: 'pruned-a', rankIndex: 2 },
      { id: 'pruned-b', rankIndex: 4 },
    ],
    noChange: false,
    surplusRegime: false,
    grade: grade('just-do-it'),
    gradeStatistic: 'leave-more',
    gradeUnavailable: undefined,
    namedDriver: 'sampling-noise-near-tie',
    skewDisclosure: { meanReal: winner.headlineStatisticB, medianReal: winner.headlineStatisticB, p10Real: 0, p90Real: 0, skewDirection: 'symmetric', meanMinusMedianReal: 0 },
    deltaSkew: { meanReal: 0, medianReal: 0, p10Real: 0, p90Real: 0, skewDirection: 'symmetric', meanMinusMedianReal: 0 },
    withheldConversionLevers: [],
    disclosedDirectional: [],
    solverCodeVersion: 1,
    ...o,
  }
}

/** A pay-less-tax recommendation (lower is better): the winner pays 40k, the runner-up 50k, the baseline 55k. */
export function payLessRec(o: Partial<SolveRecommendation> = {}): SolveRecommendation {
  const goal: RecommendationGoal = 'pay-less-tax'
  const winner = armFor(goal, 'bracket-fill|grid|0', 'bracket-fill', { lifetimeTaxPaidReal: [40_000, 40_000] })
  const baseline = armFor(goal, 'proportional|user|0', 'proportional', { lifetimeTaxPaidReal: [55_000, 55_000] })
  const runnerUp = armFor(goal, 'taxable-first|grid|0', 'taxable-first', { lifetimeTaxPaidReal: [50_000, 50_000] })
  return { ...leaveMoreRec(), goal, heirBracket: undefined, winner, noActionBaseline: baseline, runnerUp, rankedIds: [winner.id, runnerUp.id, baseline.id], prunedScores: [], gradeStatistic: 'pay-less-tax', skewDisclosure: undefined, ...o }
}

export const committed = (payload: SolveRecommendation): SolveAnswer => ({ kind: 'committed', payload, fingerprint: 'fp' as SolverRunFingerprint })

export const headlineAnswer = (draft: ScenarioDraft, outcomeState = 'on-track'): ModelAnswer =>
  ({
    kind: 'headline',
    tier: 'final',
    draft,
    inputKey: 'k1',
    result: {
      headline: { outcomeState, xOfTen: { value: 8, marginToEdge: 0.1 }, stateMarginToEdge: 0.1 },
      dollar: { perMonthReal: { value: 500, marginToEdge: 0 }, spendPerMonthReal: 6_500, direction: 'room' },
      distribution: {},
      seed: 1,
    },
  }) as unknown as ModelAnswer

export const snap = (draft: ScenarioDraft, answer: ModelAnswer, solve: SolveAnswer = { kind: 'idle' }): MemoryModelSnapshot => ({
  draft,
  answer,
  displayed: null,
  solve,
  spend: { kind: 'idle' },
  refiguring: false,
  runningInWorker: false,
})

export const record = (current = true): { readonly status: SavedRecommendationStatus; readonly record: SavedRecommendationV3 } => ({
  record: ({ action: { policy: 'taxable-first', rothConversion: { kind: 'none' } }, mintedAt: 18_000 }) as unknown as SavedRecommendationV3,
  status: ({ current, causes: current ? [] : ['inputs-changed', 'solver-changed'], eraStaleness: {} }) as unknown as SavedRecommendationStatus,
})
