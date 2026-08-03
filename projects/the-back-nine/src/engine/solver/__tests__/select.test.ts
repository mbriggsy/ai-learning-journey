/**
 * U15 §S4 — `select.ts`, the deterministic shrinkage + selection proof battery. Every arm proves a
 * §S4 contract and FAILS if the behavior is deleted:
 *
 *  - THE SHRINKAGE PRIMITIVE (`survivingAdvantage`): a near-tie positive advantage collapses to 0, a
 *    dominant one survives (reduced by the tolerance), a non-positive one passes through — and at
 *    tolerance 0 it is the IDENTITY (the zero-shrinkage collapse's foundation).
 *  - THE INSIGHT-025 CALIBRATION CASE (dispersed synthetic): a planted near-tie between two
 *    NON-conventional candidates DEFAULTS to the conventional shrunk pick (the incumbent wins even
 *    against `proportional`'s index-0 tie-break) UNLESS an advantage survives; a known-dominant
 *    candidate is unaffected. Non-vacuous: shrinkage OFF crowns the raw seed-A winner instead.
 *  - THE ZERO-SHRINKAGE IDENTITY: `selectCore({shrinkage:'off'})`'s winner AND full order ≡
 *    `rankCandidates(...)` on EVERY committed oracle fixture (the new surface collapses provably onto
 *    the oracled one).
 *  - BYTE-REPRODUCIBILITY: the winner + retained runner-up are byte-identical across a repeat solve
 *    from `(model, seedA, goal)` (seedB derived) — a real dispersed world, run twice.
 *  - THE SURPLUS-REGIME FLAG (§S4.4): trips ONLY on A/B AGREEMENT within the over-funded ε (raw
 *    pre-clamp, quantize-then-compare); BOTH disagreement directions + the sub-ε rounding arm pinned.
 *  - THE DEMOTION-MARGIN REFUSAL (§S4.5): routes to a STRUCTURED withheld state (never an uncaught
 *    throw); planted-seam-tested, precise (no route when the runner-up also converts / not surplus).
 */
import { describe, it, expect } from 'vitest'
import { NEVER_DEPLETED, type DepletionYear, type SimulationParams, type PersonInputs } from '@shared/model'
import { selectCore, selectRecommendation, survivingAdvantage } from '../select'
import { runSearch, type CandidateEvaluation, type SolverSearchResult } from '../search'
import { enumerateCandidates, solverCandidateId, type CandidateStrategy } from '../candidates'
import { evaluateCandidates, rankCandidates, type CandidateOutcome } from '../../validation/evaluate'
import { gradeOnFamily } from '../../validation/gradeCalibration'
import { deriveSeedB } from '../../validation/heldOutSeed'
import { SOLVER_CASES } from '../../reference/solver-cases'

const mean = (xs: readonly number[]): number => xs.reduce((s, x) => s + x, 0) / xs.length

/** A synthetic pay-less-tax scored outcome from an explicit per-path lifetime-tax vector + a survival
 *  fraction. The score's tax mean is derived FROM the vector, so `tier2` (the advantage) and the
 *  CRN-difference SE (`selectionTieTolerance` over the same vector) are consistent by construction. */
function taxOutcome(candidate: CandidateStrategy, taxPerPath: readonly number[], survival: number): CandidateOutcome {
  const n = taxPerPath.length
  const zeros: readonly number[] = new Array(n).fill(0)
  const depletionYears: readonly DepletionYear[] = new Array(n).fill(NEVER_DEPLETED)
  return {
    kind: 'scored',
    candidate,
    score: { survival, lifetimeTaxMeanReal: mean(taxPerPath), terminalGrossMeanReal: 0, afterTaxBequestMeanReal: undefined },
    distribution: {
      terminalValuesReal: zeros,
      depletionYears,
      survivalFraction: survival,
      taxAware: {
        lifetimeTaxPaidReal: taxPerPath,
        terminalTaxableReal: zeros,
        terminalPretaxReal: zeros,
        terminalRothReal: zeros,
        terminalHsaReal: zeros,
        terminalTaxableBasisReal: zeros,
        lifetimeNetPremiumReal: zeros,
        lifetimeMedicareCostReal: zeros,
      },
    },
  }
}

const conv = (amount: number): CandidateStrategy['conversion'] => ({ annualAmountReal: amount, startYearOffset: 0, years: 3 })

// ── the labeled arms used across the synthetic worlds ──────────────────────────────────────────────
const C: CandidateStrategy = { policy: 'taxable-first', conversion: null, provenance: 'conventional-baseline' } // conventional:taxable-first:0
const X_PROP: CandidateStrategy = { policy: 'proportional', conversion: null, provenance: 'grid' } // grid:proportional:0 (index 0 — beats C on candidateTieBreak)
const Y_PRE: CandidateStrategy = { policy: 'pre-tax-first', conversion: null, provenance: 'grid' } // grid:pre-tax-first:0
const D_BF: CandidateStrategy = { policy: 'bracket-fill', conversion: null, provenance: 'grid' } // grid:bracket-fill:0

describe('survivingAdvantage — the shrinkage primitive (a pure exported seam)', () => {
  it('is the IDENTITY at tolerance 0 for every sign (the zero-shrinkage foundation)', () => {
    expect(survivingAdvantage(5, 0)).toBe(5)
    expect(survivingAdvantage(0, 0)).toBe(0)
    expect(survivingAdvantage(-3, 0)).toBe(-3)
  })

  it('COLLAPSES a positive advantage within the tolerance to 0 (the near-tie default to the prior)', () => {
    expect(survivingAdvantage(5, 8)).toBe(0)
    expect(survivingAdvantage(8, 8)).toBe(0) // the boundary is inclusive: an advantage AT the SE band is a tie
  })

  it('a positive advantage BEYOND the tolerance SURVIVES, reduced by the tolerance (a shrunk displacer)', () => {
    expect(survivingAdvantage(20, 8)).toBe(12)
    expect(survivingAdvantage(50, 11.316)).toBeCloseTo(38.684, 3)
  })

  it('a NON-positive advantage passes through unchanged (a candidate no better than the prior never displaces)', () => {
    expect(survivingAdvantage(-4, 8)).toBe(-4)
    expect(survivingAdvantage(-4, 0)).toBe(-4)
  })

  it('refuses a non-finite advantage / an invalid tolerance (insight 010 — never a silent NaN gate)', () => {
    expect(() => survivingAdvantage(Number.NaN, 1)).toThrow(/advantage must be finite/)
    expect(() => survivingAdvantage(1, Number.NaN)).toThrow(/tolerance must be finite/)
    expect(() => survivingAdvantage(1, -0.5)).toThrow(/tolerance must be finite/)
  })
})

describe('§S4 the insight-025 shrinkage calibration case — defaults to conventional unless the advantage survives', () => {
  // A dispersed, OVER-FUNDED world (all survival 1.0 ⇒ the survival-top set holds everyone ⇒ the
  // decision is Tier-2 tax, exactly where the goal-advantage shrinkage bites). Hand arithmetic:
  //   C (conventional) tax = [100,100,100,100]  mean 100
  //   X (proportional) tax = [95,105,85,95]      mean 95  · adv = 100−95 = 5 · λ = 1.96·√(200/12) ≈ 8.00 ⇒ 5 ≤ λ ⇒ COLLAPSE
  //   Y (pre-tax-first) tax= [98,102,90,98]      mean 97  · adv = 3       · λ ≈ 4.93              ⇒ 3 ≤ λ ⇒ COLLAPSE
  //   D (bracket-fill) tax = [40,60,40,60]       mean 50  · adv = 50      · λ ≈ 11.32             ⇒ 50 > λ ⇒ SURVIVES (dominant)
  const cTax = [100, 100, 100, 100]
  const xTax = [95, 105, 85, 95]
  const yTax = [98, 102, 90, 98]
  const dTax = [40, 60, 40, 60]

  it('a near-tie between TWO non-conventional candidates DEFAULTS to the conventional shrunk pick', () => {
    const outcomesA = [taxOutcome(C, cTax, 1), taxOutcome(X_PROP, xTax, 1), taxOutcome(Y_PRE, yTax, 1)]
    const on = selectCore({ outcomesA, goal: 'pay-less-tax', tieTolerance: 0, conventionalIndex: 0, shrinkage: 'on' })
    expect(on.kind).toBe('selected')
    if (on.kind !== 'selected') throw new Error('unreachable')
    // Both non-conventional advantages collapsed to 0 ⇒ the conventional prior is crowned — and the
    // CONVENTIONAL-INCUMBENT rule beats proportional's index-0 candidateTieBreak (the default is robust).
    expect(on.winnerId).toBe('conventional:taxable-first:0')
    expect(on.noChange).toBe(true)
  })

  it('NON-VACUITY: with shrinkage OFF the raw seed-A winner (proportional, lowest tax) is crowned instead', () => {
    const outcomesA = [taxOutcome(C, cTax, 1), taxOutcome(X_PROP, xTax, 1), taxOutcome(Y_PRE, yTax, 1)]
    const off = selectCore({ outcomesA, goal: 'pay-less-tax', tieTolerance: 0, conventionalIndex: 0, shrinkage: 'off' })
    expect(off.kind).toBe('selected')
    if (off.kind !== 'selected') throw new Error('unreachable')
    expect(off.winnerId).toBe('grid:proportional:0') // proportional pays the least tax on seed A → the curse pick
    expect(off.noChange).toBe(false)
    // …and OFF is byte-identical to the reference ranking (the identity, restated on this synthetic world).
    const outcomes = [taxOutcome(C, cTax, 1), taxOutcome(X_PROP, xTax, 1), taxOutcome(Y_PRE, yTax, 1)]
    const reference = rankCandidates(outcomes, 'pay-less-tax', 0).map((o) => solverCandidateId(o.candidate))
    expect(off.rankedIds).toEqual(reference)
  })

  it('UNLESS an advantage survives: bumping one non-conventional candidate beyond its band displaces the prior', () => {
    // X' tax = [80,90,70,80] mean 80 · adv = 20 · λ ≈ 8.00 ⇒ 20 > λ ⇒ survives (12) ⇒ displaces the prior.
    const outcomesA = [taxOutcome(C, cTax, 1), taxOutcome(X_PROP, [80, 90, 70, 80], 1), taxOutcome(Y_PRE, yTax, 1)]
    const on = selectCore({ outcomesA, goal: 'pay-less-tax', tieTolerance: 0, conventionalIndex: 0, shrinkage: 'on' })
    expect(on.kind).toBe('selected')
    if (on.kind !== 'selected') throw new Error('unreachable')
    expect(on.winnerId).toBe('grid:proportional:0')
    expect(on.noChange).toBe(false)
  })

  it('a KNOWN-DOMINANT candidate is unaffected — it survives shrinkage even while the near-ties collapse', () => {
    const outcomesA = [taxOutcome(C, cTax, 1), taxOutcome(X_PROP, xTax, 1), taxOutcome(Y_PRE, yTax, 1), taxOutcome(D_BF, dTax, 1)]
    const on = selectCore({ outcomesA, goal: 'pay-less-tax', tieTolerance: 0, conventionalIndex: 0, shrinkage: 'on' })
    expect(on.kind).toBe('selected')
    if (on.kind !== 'selected') throw new Error('unreachable')
    expect(on.winnerId).toBe('grid:bracket-fill:0') // the dominant lever survives; X, Y still collapse to the prior
    expect(on.noChange).toBe(false)
  })
})

describe('§S4 the shrinkage tolerance is LIVE (keyed to the CRN-difference SE), never a hardcoded constant', () => {
  const cTax = [100, 100, 100, 100]
  it('SAME mean advantage, DIFFERENT per-path SE ⇒ DIFFERENT crown (a hardcoded tolerance could not distinguish these)', () => {
    // Both X worlds pay a MEAN 95 (advantage 5 over the prior's 100) — only the per-path SPREAD differs.
    // LOW SE: a flat −5 every path ⇒ SE≈0 ⇒ tolerance≈0 ⇒ the advantage SURVIVES ⇒ X displaces the prior.
    const lowSE = selectCore({
      outcomesA: [taxOutcome(C, cTax, 1), taxOutcome(X_PROP, [95, 95, 95, 95], 1)],
      goal: 'pay-less-tax',
      tieTolerance: 0,
      conventionalIndex: 0,
      shrinkage: 'on',
    })
    if (lowSE.kind !== 'selected') throw new Error('unreachable')
    expect(lowSE.winnerId).toBe('grid:proportional:0')
    expect(lowSE.noChange).toBe(false)
    // HIGH SE: the SAME mean 95, but a dispersed diff ⇒ a large z·SE tolerance ⇒ the advantage COLLAPSES
    // ⇒ the conventional prior stands. Only a LIVE SE-keyed tolerance can produce a different crown here.
    const highSE = selectCore({
      outcomesA: [taxOutcome(C, cTax, 1), taxOutcome(X_PROP, [95, 105, 85, 95], 1)],
      goal: 'pay-less-tax',
      tieTolerance: 0,
      conventionalIndex: 0,
      shrinkage: 'on',
    })
    if (highSE.kind !== 'selected') throw new Error('unreachable')
    expect(highSE.winnerId).toBe('conventional:taxable-first:0')
    expect(highSE.noChange).toBe(true)
    // The discriminating fact: the MEAN advantage is IDENTICAL in both worlds — a constant tolerance
    // (SE-blind) would crown identically; the SE is the only input that moved.
    expect(mean([95, 95, 95, 95])).toBe(mean([95, 105, 85, 95]))
  })
})

describe('§S4 the infeasible-partition arm — an infeasible candidate ranks WORST, never crowned, never dropped (R21)', () => {
  it('folds a typed infeasible outcome into the worst rank while keeping it in rankedIds (the comparative field)', () => {
    const infeasible: CandidateOutcome = { kind: 'infeasible', candidate: Y_PRE, reason: 'depleted on a path', pathIndex: 0 }
    const outcomesA = [taxOutcome(C, [100, 100], 1), taxOutcome(X_PROP, [90, 90], 1), infeasible]
    const sel = selectCore({ outcomesA, goal: 'pay-less-tax', tieTolerance: 0, conventionalIndex: 0, shrinkage: 'off' })
    if (sel.kind !== 'selected') throw new Error('unreachable')
    // Never dropped — every candidate stays in the ranked field (the R21 comparative surface).
    expect(sel.rankedIds).toHaveLength(3)
    // Ranked WORST (last), and never the crown.
    expect(sel.rankedIds[sel.rankedIds.length - 1]).toBe(solverCandidateId(Y_PRE))
    expect(sel.winnerId).not.toBe(solverCandidateId(Y_PRE))
    // The two scored candidates rank ahead of it; the lower-tax grid arm wins (shrinkage off ⇒ raw order).
    expect(sel.winnerId).toBe('grid:proportional:0')
  })
})

describe('§S4 the zero-shrinkage identity — select({shrinkage:off}) ≡ rankCandidates on EVERY committed fixture', () => {
  for (const fixture of SOLVER_CASES) {
    it(`${fixture.id}: winner AND full order collapse onto the oracled ranking`, () => {
      const outcomes = evaluateCandidates(fixture.buildBase(), fixture.buildCandidates(), fixture.seed, {
        ...(fixture.preconditions.heirBracket !== undefined ? { heirBracket: fixture.preconditions.heirBracket } : {}),
      })
      const conventionalIndex = outcomes.findIndex((o) => o.candidate.provenance === 'conventional-baseline')
      const reference = rankCandidates(outcomes, fixture.goal, fixture.tieTolerance).map((o) => solverCandidateId(o.candidate))
      const selected = selectCore({
        outcomesA: outcomes,
        goal: fixture.goal,
        tieTolerance: fixture.tieTolerance,
        ...(fixture.preconditions.heirBracket !== undefined ? { heirBracket: fixture.preconditions.heirBracket } : {}),
        ...(conventionalIndex >= 0 ? { conventionalIndex } : {}),
        shrinkage: 'off',
      })
      expect(selected.kind).toBe('selected')
      if (selected.kind !== 'selected') throw new Error('unreachable — the fixtures never route to withheld')
      // The spec's requirement — the winner — AND the stronger full-order byte identity.
      expect(selected.winnerId).toBe(reference[0])
      expect(selected.rankedIds).toEqual(reference)
      // And the fixture's OWN hand-derived oracle (the surface produces the oracled order end-to-end).
      expect(selected.rankedIds).toEqual([...fixture.expectedRankingIds])
    })
  }
})

// ── a compact dispersed world for the byte-reproducibility test (shrinkage genuinely engages) ────────
const reproPeople: readonly PersonInputs[] = [
  { sex: 'female', currentAge: 64, birthYear: 1962, retirementAge: 63, earnedIncomeReal: 0, pia: 28_000, socialSecurityClaimAge: 67 },
  { sex: 'male', currentAge: 62, birthYear: 1964, retirementAge: 62, earnedIncomeReal: 0, pia: 18_000, socialSecurityClaimAge: 67 },
]

function reproBase(): SimulationParams {
  return {
    initialPortfolio: 1_100_000,
    annualSpendingReal: 78_000,
    stockWeight: 0.5,
    people: reproPeople,
    survivorSpendingRatio: 0.75,
    drawdownPolicy: 'proportional',
    market: {
      stock: { mean: 0.04, stdDev: 0.12 },
      bond: { mean: 0.015, stdDev: 0.05 },
      inflation: { mean: 0.03, stdDev: 0.041 },
      stockBondCorrelation: 0,
      space: 'simple',
      returnsAreReal: true,
    },
    paths: 96,
    maxHorizonYears: 24,
    longevityMode: 'sampled',
    overlay: {
      taxEnabled: true,
      rmdEnabled: true,
      startCalendarYear: 2026,
      buckets: { taxable: 400_000, pretax: 600_000, roth: 100_000 },
      initialTaxableBasis: 300_000,
      filing: 'mfj',
    },
  }
}

function reproCandidates(): readonly CandidateStrategy[] {
  const { candidates } = enumerateCandidates({
    anchor: {
      committed: { rmd: 0, conversion: 0, ongoingTaxable: 0, ssBenefit: 0, filing: 'mfj', count65: 0, calendarYear: 2026 },
      acaCliffMagi: null,
      irmaaSchedule: null,
      pretaxAvailableAtStart: 600_000,
      rmdAtStart: 0,
    },
    window: { startYearOffset: 0, years: 5 },
    userBaseline: { policy: 'custom', drawdownOrder: ['roth', 'pretax', 'taxable'] },
  })
  return candidates
}

describe('§S4 byte-reproducibility — the winner + retained runner-up reproduce from (model, seedA, seedB, goal)', () => {
  it(
    'a repeat solve on the same (model, seedA, goal) yields a byte-identical selection (leave-more)',
    () => {
      const base = reproBase()
      const candidates = reproCandidates()
      const seedA = 0xb0a71e
      const input = { base, candidates, seedA, goal: 'leave-more' as const, tieTolerance: 0, heirBracket: 0.25 }
      const first = selectRecommendation(runSearch(input))
      const second = selectRecommendation(runSearch(input))
      expect(first.kind).toBe('selected')
      expect(second).toEqual(first) // full byte-identity: winner, runner-up, full order, flags
      // NOT "leave-more never routes to withheld" — since 2026-08-03 it can (the goal-agnostic
      // demotion guard). It does not HERE because this world's crown does not pair a converting
      // winner with a non-converting runner-up; the withheld arm is proven in its own describe below.
      if (first.kind !== 'selected') throw new Error('unreachable — this world crowns no lone conversion winner')
      expect(first.winnerId).toBeDefined()
      expect(first.runnerUpId).toBeDefined() // R23 — the runner-up is retained
      expect(first.winnerId).not.toBe(first.runnerUpId)
    },
    120_000,
  )
})

describe('§S4.4 the surplus-regime flag — trips ONLY on A/B agreement within the over-funded ε', () => {
  // A 2-candidate over-funded world where X (a non-conversion grid arm, tax 500) clearly displaces the
  // conventional prior (tax 1000) on seed A, so X is the winner and its A/B survivals drive the flag.
  function surplusWorld(survivalA: number, survivalB: number) {
    const outcomesA = [taxOutcome(C, [1000, 1000, 1000, 1000], survivalA), taxOutcome(X_PROP, [500, 500, 500, 500], survivalA)]
    const outcomesB = [taxOutcome(C, [1000, 1000, 1000, 1000], survivalB), taxOutcome(X_PROP, [500, 500, 500, 500], survivalB)]
    return selectCore({ outcomesA, outcomesB, goal: 'pay-less-tax', tieTolerance: 0, conventionalIndex: 0, shrinkage: 'on' })
  }
  const surplusOf = (a: number, b: number): boolean => {
    const r = surplusWorld(a, b)
    if (r.kind !== 'selected') throw new Error('unreachable — the winner is a non-conversion arm')
    // the winner is X on seed A (it displaces the prior on tax) — the flag reads ITS A/B survivals
    expect(r.winnerId).toBe('grid:proportional:0')
    return r.surplusRegime
  }

  it('trips when A AND B both read over-funded', () => {
    expect(surplusOf(1.0, 1.0)).toBe(true)
  })

  it('does NOT trip when A is over-funded but B is not (no false "safe either way")', () => {
    expect(surplusOf(1.0, 0.9)).toBe(false)
  })

  it('does NOT trip when B is over-funded but A is not (no pivot on an A-side survival-edge pick)', () => {
    expect(surplusOf(0.9, 1.0)).toBe(false)
  })

  it('the sub-ε rounding arm: quantize-then-compare governs — 0.975 rounds INTO the band, 0.9749 does not', () => {
    // quantizeSurvival(0.975)=0.98 ≥ overFunded(0.98) ⇒ over-funded (a RAW ≥ 0.98 compare would say no).
    expect(surplusOf(0.975, 0.975)).toBe(true)
    // quantizeSurvival(0.9749)=0.97 < 0.98 ⇒ not over-funded (rounds the other way).
    expect(surplusOf(0.9749, 0.9749)).toBe(false)
  })
})

describe('§S4.5 the demotion-margin refusal → a STRUCTURED withheld state (never an uncaught throw)', () => {
  // A surplus + pay-less-tax world where the winner is a CONVERSION lever and the runner-up is NOT — the
  // grade would ride the pay-less-tax dollar axis, whose conversion-near-tie demotion margin CANNOT be
  // calibrated in U15 (insight 091). Unreachable in a live sequencing-only solve (conversions stay
  // trend-blocked); planted-seam-tested here that the refusal routes structurally, never throws.
  const X_CONV: CandidateStrategy = { policy: 'proportional', conversion: conv(30_000), provenance: 'grid' }
  const Z_CONV: CandidateStrategy = { policy: 'pre-tax-first', conversion: conv(20_000), provenance: 'grid' }

  it('routes to withheld when a CONVERSION winner tops a NON-conversion runner-up on the dollar axis', () => {
    const outcomesA = [taxOutcome(C, [1000, 1000, 1000, 1000], 1), taxOutcome(X_CONV, [500, 500, 500, 500], 1)]
    const outcomesB = [taxOutcome(C, [1000, 1000, 1000, 1000], 1), taxOutcome(X_CONV, [500, 500, 500, 500], 1)]
    let result!: ReturnType<typeof selectCore>
    expect(() => {
      result = selectCore({ outcomesA, outcomesB, goal: 'pay-less-tax', tieTolerance: 0, conventionalIndex: 0, shrinkage: 'on' })
    }).not.toThrow()
    expect(result.kind).toBe('withheld')
    if (result.kind !== 'withheld') throw new Error('unreachable')
    expect(result.reason).toBe('demotion-axis-uncalibrated')
    expect(result.winnerId).toBe('grid:proportional:30000')
    expect(result.runnerUpId).toBe('conventional:taxable-first:0')
  })

  it('does NOT route when the runner-up ALSO carries a conversion (the demotion axis is calibrated)', () => {
    // X (conv, tax 500) wins, Z (conv, tax 700) is the runner-up, C (non-conv, tax 1000) last.
    const outcomesA = [
      taxOutcome(C, [1000, 1000, 1000, 1000], 1),
      taxOutcome(X_CONV, [500, 500, 500, 500], 1),
      taxOutcome(Z_CONV, [700, 700, 700, 700], 1),
    ]
    const outcomesB = outcomesA
    const result = selectCore({ outcomesA, outcomesB, goal: 'pay-less-tax', tieTolerance: 0, conventionalIndex: 0, shrinkage: 'on' })
    expect(result.kind).toBe('selected')
    if (result.kind !== 'selected') throw new Error('unreachable')
    expect(result.winnerId).toBe('grid:proportional:30000')
    expect(result.runnerUpId).toBe('grid:pre-tax-first:20000') // both convert ⇒ the demotion axis is calibrated
  })

  it('does NOT route when the household is NOT in the surplus regime (the grade rides the survival axis)', () => {
    // Same conversion-winner shape, but NOT over-funded ⇒ the grade axis is survival (calibrated), no withhold.
    const outcomesA = [taxOutcome(C, [1000, 1000, 1000, 1000], 0.9), taxOutcome(X_CONV, [500, 500, 500, 500], 0.9)]
    const outcomesB = [taxOutcome(C, [1000, 1000, 1000, 1000], 0.9), taxOutcome(X_CONV, [500, 500, 500, 500], 0.9)]
    const result = selectCore({ outcomesA, outcomesB, goal: 'pay-less-tax', tieTolerance: 0, conventionalIndex: 0, shrinkage: 'on' })
    expect(result.kind).toBe('selected')
    if (result.kind !== 'selected') throw new Error('unreachable')
    expect(result.surplusRegime).toBe(false)
    expect(result.winnerId).toBe('grid:proportional:30000')
  })
})

// ── THE LEAVE-MORE ARM OF THE SAME REFUSAL (the Tier-0 crash, fixed 2026-08-03) ───────────────────
//
// `demotionAxisCalibrated` is goal-AGNOSTIC — it refuses any non-`survival` statistic where the
// winner converts and the runner-up does not. The §S4.5 guard above hard-coded `pay-less-tax` in BOTH
// the goal test and the statistic argument, so a `leave-more` household walked straight past it,
// returned `kind:'selected'`, and hit `assertDemotionAxisCalibrated`'s PLAIN Error inside
// `gradeOnFamily`. `solve.ts`'s catch narrows to `GradeFloorRefusal` and rethrows, so it surfaced as
// `calm-error` → `compute-error` → the GENERIC "unavailable" card — the exact laundering
// `solve.ts`'s own comment calls the calm-but-wrong cardinal sin.
//
// This is NOT an exotic shape. `select.ts`'s conventional-incumbent tie-break crowns the
// non-converting baseline as runner-up whenever only one conversion's advantage survives shrinkage,
// so "winner converts, runner-up doesn't" is the NATURAL outcome for a well-funded leave-more
// household — the modal target user for that goal.
describe('§S4.5 the demotion refusal covers LEAVE-MORE too (the arm that used to crash)', () => {
  const X_CONV: CandidateStrategy = { policy: 'proportional', conversion: conv(30_000), provenance: 'grid' }
  const Z_CONV: CandidateStrategy = { policy: 'pre-tax-first', conversion: conv(20_000), provenance: 'grid' }

  /** A synthetic leave-more scored outcome. The whole bequest sits in the ROTH bucket on purpose:
   *  `afterTaxBequestPerPath` passes Roth through untouched, so the fixture's after-tax bequest is
   *  EXACTLY this vector at any `heirBracket` — the arm proves the demotion routing, never the IRD
   *  arithmetic (which `objectiveHeadline` owns and pins separately). */
  function bequestOutcome(candidate: CandidateStrategy, rothPerPath: readonly number[], survival: number): CandidateOutcome {
    const n = rothPerPath.length
    const zeros: readonly number[] = new Array(n).fill(0)
    const depletionYears: readonly DepletionYear[] = new Array(n).fill(NEVER_DEPLETED)
    return {
      kind: 'scored',
      candidate,
      score: {
        survival,
        lifetimeTaxMeanReal: 0,
        terminalGrossMeanReal: mean(rothPerPath),
        afterTaxBequestMeanReal: mean(rothPerPath),
      },
      distribution: {
        terminalValuesReal: rothPerPath,
        depletionYears,
        survivalFraction: survival,
        taxAware: {
          lifetimeTaxPaidReal: zeros,
          terminalTaxableReal: zeros,
          terminalPretaxReal: zeros,
          terminalRothReal: rothPerPath,
          terminalHsaReal: zeros,
          terminalTaxableBasisReal: zeros,
          lifetimeNetPremiumReal: zeros,
          lifetimeMedicareCostReal: zeros,
        },
      },
    }
  }

  const leaveMore = (outcomes: readonly CandidateOutcome[], outcomesB?: readonly CandidateOutcome[]) =>
    selectCore({
      outcomesA: outcomes,
      outcomesB: outcomesB ?? outcomes,
      goal: 'leave-more',
      tieTolerance: 0,
      heirBracket: 0.24,
      conventionalIndex: 0,
      shrinkage: 'on',
    })

  it('routes to WITHHELD when a conversion winner tops a non-conversion runner-up (it used to crash here)', () => {
    // C (conventional, no conversion) leaves 100k; X (conversion) leaves 500k ⇒ X crowns, C is runner-up.
    const world = [bequestOutcome(C, [100_000, 100_000, 100_000, 100_000], 1), bequestOutcome(X_CONV, [500_000, 500_000, 500_000, 500_000], 1)]
    let result!: ReturnType<typeof selectCore>
    expect(() => {
      result = leaveMore(world)
    }).not.toThrow()
    expect(result.kind, 'leave-more must refuse structurally, exactly as pay-less-tax does').toBe('withheld')
    if (result.kind !== 'withheld') throw new Error('unreachable')
    expect(result.reason).toBe('demotion-axis-uncalibrated')
    expect(result.winnerId).toBe('grid:proportional:30000')
    expect(result.runnerUpId).toBe('conventional:taxable-first:0')
    expect(result.surplusRegime).toBe(true)
    // The detail must NAME the goal it refused on — a shared string that says "pay-less-tax" on a
    // leave-more household is the same class of lie this whole entry exists to close.
    expect(result.detail, 'the refusal names its own axis').toContain('leave-more')
    expect(result.detail, 'and never mislabels it as the other goal').not.toContain('pay-less-tax')
  })

  // THE CRASH ITSELF, pinned at its source: were `selectCore` ever to hand this triple back as
  // `selected`, THIS is what the grade path does with it. The two arms together are the whole defect.
  it('the grade path really does THROW on that triple — so returning `selected` guarantees the crash', () => {
    const dollarFamily = Array.from({ length: 5 }, () => Array.from({ length: 200 }, () => 1_200))
    expect(() =>
      gradeOnFamily({
        family: dollarFamily,
        statistic: 'leave-more',
        winnerHasConversion: true,
        runnerUpHasConversion: false,
        minPathsOverride: 100,
      }),
    ).toThrow(/SURVIVAL axis only/)
    // CONTROL — the throw is specific to the uncalibrated triple, not to `leave-more` as such.
    const ok = gradeOnFamily({
      family: dollarFamily,
      statistic: 'leave-more',
      winnerHasConversion: false,
      runnerUpHasConversion: false,
      minPathsOverride: 100,
    })
    expect(ok.demotionFired).toBe(false)
  })

  it('does NOT route when the runner-up ALSO converts (the demotion axis is calibrated)', () => {
    const world = [
      bequestOutcome(C, [100_000, 100_000, 100_000, 100_000], 1),
      bequestOutcome(X_CONV, [500_000, 500_000, 500_000, 500_000], 1),
      bequestOutcome(Z_CONV, [400_000, 400_000, 400_000, 400_000], 1),
    ]
    const result = leaveMore(world)
    expect(result.kind).toBe('selected')
    if (result.kind !== 'selected') throw new Error('unreachable')
    expect(result.winnerId).toBe('grid:proportional:30000')
    expect(result.runnerUpId).toBe('grid:pre-tax-first:20000')
  })

  it('does NOT route when the household is not over-funded (the grade rides the calibrated survival axis)', () => {
    const world = [bequestOutcome(C, [100_000, 100_000, 100_000, 100_000], 0.9), bequestOutcome(X_CONV, [500_000, 500_000, 500_000, 500_000], 0.9)]
    const result = leaveMore(world)
    expect(result.kind).toBe('selected')
    if (result.kind !== 'selected') throw new Error('unreachable')
    expect(result.surplusRegime).toBe(false)
  })
})

describe('§S4/R21 the lexicographic floor is ABSOLUTE — a worse Tier-1 never wins on a better Tier-2', () => {
  // pay-less-tax ⇒ a LOWER tax is a BETTER Tier-2. C (conventional) survives 1.0 but pays the MOST
  // tax; X (grid) pays FAR less tax (a strictly better Tier-2) yet survives only 0.90 — a real Tier-1
  // gap. R21: the survival floor is ABSOLUTE, so a better-Tier-2 candidate OUTSIDE the selection
  // tolerance can never win. (The committed oracle fixtures are all survival = 1.0, so none of them
  // exercises this partition — this is the gap the U15 §S7 sweep fills.)
  const outcomes = [taxOutcome(C, [1000, 1000, 1000, 1000], 1.0), taxOutcome(X_PROP, [100, 100, 100, 100], 0.9)]

  it('rankCandidates: X is OUTSIDE the survival tolerance ⇒ C wins despite X’s far-lower tax', () => {
    // best survival 1.0; X’s gap 0.10 > tolerance 0.05 ⇒ X is not survival-equivalent ⇒ the floor bites.
    const ranked = rankCandidates(outcomes, 'pay-less-tax', 0.05).map((o) => solverCandidateId(o.candidate))
    expect(ranked).toEqual(['conventional:taxable-first:0', 'grid:proportional:0'])
  })

  it('selectCore inherits the ABSOLUTE floor — shrinkage on OR off cannot lift X over the survival gap', () => {
    for (const shrinkage of ['off', 'on'] as const) {
      const sel = selectCore({ outcomesA: outcomes, goal: 'pay-less-tax', tieTolerance: 0.05, conventionalIndex: 0, shrinkage })
      expect(sel.kind).toBe('selected')
      if (sel.kind !== 'selected') throw new Error('unreachable')
      expect(sel.winnerId, `shrinkage ${shrinkage}`).toBe('conventional:taxable-first:0')
    }
  })

  it('NON-VACUITY: widen the tolerance to admit X and the better-Tier-2 candidate wins (a floor, not a constant crown)', () => {
    // tolerance 0.15 ≥ the 0.10 gap ⇒ X joins the survival-top set ⇒ Tier-2 (lower tax) decides ⇒ X wins.
    const ranked = rankCandidates(outcomes, 'pay-less-tax', 0.15).map((o) => solverCandidateId(o.candidate))
    expect(ranked[0]).toBe('grid:proportional:0')
  })
})

describe('§S4 the shrinkage prior is the CONVENTIONAL baseline — NEVER the user’s own custom order', () => {
  // Shrinking a candidate’s advantage toward the USER’s own habit would launder the status quo into
  // advice (§S4 — "shrinking toward the user’s own habit would launder the status quo"). A near-tie
  // world where EVERY advantage over the CONVENTIONAL prior collapses ⇒ the conventional baseline is
  // the no-change pick. Anchored (wrongly) on the user’s custom baseline, the user’s own lower-tax
  // habit would be crowned instead — so this pins `selectRecommendation`’s anchor to the conventional
  // prior (`provenance === 'conventional-baseline'`), the seam a status-quo-laundering mutant flips.
  const U: CandidateStrategy = {
    policy: 'custom',
    conversion: null,
    provenance: 'user-baseline',
    drawdownOrder: ['roth', 'pretax', 'taxable'],
  }
  const evalOf = (candidate: CandidateStrategy, tax: readonly number[]): CandidateEvaluation => {
    // survival 0.9 (NOT over-funded) ⇒ no surplus/demotion path; all three are survival-equivalent so
    // the Tier-2 goal-advantage shrinkage is the whole decision.
    const o = taxOutcome(candidate, tax, 0.9)
    return { candidate, id: solverCandidateId(candidate), a: o, b: o }
  }
  // C conventional (tax mean 100); U user habit (mean 95, adv 5 over C ≤ λ≈8 ⇒ collapses — reuses the
  // insight-025 vectors); X grid (mean 97, adv 3 ⇒ collapses). Every advantage over C collapses.
  const evaluations: readonly CandidateEvaluation[] = [
    evalOf(C, [100, 100, 100, 100]),
    evalOf(U, [95, 105, 85, 95]),
    evalOf(X_PROP, [98, 102, 90, 98]),
  ]
  const search: SolverSearchResult = {
    seedA: 1,
    seedB: deriveSeedB(1),
    goal: 'pay-less-tax',
    tieTolerance: 0,
    heirBracket: undefined,
    evaluations,
    rankedA: evaluations.map((e) => e.a),
    conventionalBaseline: evaluations[0]!,
    userBaseline: evaluations[1]!,
  }

  it('crowns the CONVENTIONAL prior on the near-tie — the user’s lower-tax habit is not laundered into advice', () => {
    const result = selectRecommendation(search)
    expect(result.kind).toBe('selected')
    if (result.kind !== 'selected') throw new Error('unreachable')
    // Anchored on the conventional prior: U’s adv 5 and X’s adv 3 both collapse ⇒ all shrunk-tie ⇒ the
    // conventional-incumbent wins. Anchored (wrongly) on the user baseline (tax mean 95), U would win.
    expect(result.winnerId).toBe('conventional:taxable-first:0')
    expect(result.winnerId).not.toBe('baseline:custom:0')
    // ⚠️ `noChange` FLIPPED true → false on 2026-08-03, and this fixture is the defect's own witness.
    //
    // The crown is UNCHANGED (asserted above) — the shrinkage prior and the incumbent tie-break still
    // anchor on the conventional arm, which is what this test exists to protect. What changed is the
    // QUESTION `noChange` answers. It used to mean "the winner is the conventional default"; it now
    // means "the winner is the plan this household already runs".
    //
    // Here the household runs U (`baseline:custom:0`) and we crown C (`conventional:taxable-first:0`).
    // That IS a change — we are telling them to switch off their custom order. The old `true` made the
    // surface say "You're already on one of the strongest paths" to a household whose recommendation
    // was to move, which is precisely the calm-but-wrong the re-anchoring removes.
    expect(result.noChange, 'the winner is NOT the household’s own custom order — this is a change').toBe(false)
  })

  it('noChange is TRUE when the crown IS the household’s plan — even though the crowned INDEX is not theirs', () => {
    // The duplicate case, and the reason `noChange` compares PLANS rather than indices. A household
    // already on the conventional order injects a user baseline that is strategically identical to the
    // conventional arm; the incumbent tie-break crowns the CONVENTIONAL index, so an index comparison
    // would report "here is a change" to a household that is already doing exactly the winning thing.
    const userIsConventional: CandidateStrategy = { policy: 'taxable-first', conversion: null, provenance: 'user-baseline' }
    const dupEvaluations: readonly CandidateEvaluation[] = [
      evalOf(C, [100, 100, 100, 100]),
      evalOf(userIsConventional, [100, 100, 100, 100]),
      evalOf(X_PROP, [98, 102, 90, 98]),
    ]
    const result = selectRecommendation({
      ...search,
      evaluations: dupEvaluations,
      rankedA: dupEvaluations.map((e) => e.a),
      conventionalBaseline: dupEvaluations[0]!,
      userBaseline: dupEvaluations[1]!,
    })
    expect(result.kind).toBe('selected')
    if (result.kind !== 'selected') throw new Error('unreachable')
    // The crowned INDEX is the conventional arm, not the user's…
    expect(result.winnerId).toBe('conventional:taxable-first:0')
    // …and `noChange` is still TRUE, because the crowned PLAN is the one they already run.
    expect(result.noChange, 'same plan, different provenance — never call that a change').toBe(true)
  })
})
