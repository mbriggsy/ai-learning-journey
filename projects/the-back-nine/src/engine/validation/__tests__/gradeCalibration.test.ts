/**
 * U14 S4 — grade calibration: "just do it" really is robust (real engine, 16k × 5-member
 * B-family), "coin-flip" really is a coin-flip, the conversion-near-tie DEMOTION fires on
 * the measured class (the council's Q3 amendment — the S4.3 proving case runs the REAL
 * engine), the min-B floor refuses, the display-tenth clause collapses sub-tenth wins, and
 * the named-driver probe finds a real ACA-regime driver and honestly says
 * `sampling-noise-near-tie` when no probe can flip the crown.
 */
import { describe, it, expect } from 'vitest'
import type { PersonInputs, SimulationParams } from '@shared/model'
import { solverConversionNearTieDemotionMargin } from '@engine/constants'
import type { CandidateStrategy } from '../../solver/candidates'
import { caseAcaCliff, caseBracketFill, CASE_III_HEIR_BRACKET } from '../../reference/solver-cases'
import {
  composeShapeDisclosure,
  displayTenth,
  gradeOnFamily,
  gradeRecommendation,
  namedDriverProbe,
} from '../gradeCalibration'

// ---- The pure-seam batteries (insight 048) --------------------------------------------------

describe('displayTenth — the confidence pipeline mirror (quantize → 9-cap)', () => {
  it('pins the contract fixtures: the 9-cap covers everything from 0.85 up; tenths round on the quantized fraction', () => {
    expect(displayTenth(1)).toBe(9)
    expect(displayTenth(0.99)).toBe(9)
    expect(displayTenth(0.85)).toBe(9)
    expect(displayTenth(0.849)).toBe(9) // quantizes to 0.85 first — the confidence.test idiom
    expect(displayTenth(0.844)).toBe(8)
    expect(displayTenth(0.72)).toBe(7)
    expect(displayTenth(0)).toBe(0)
  })
})

/** A synthetic member: `ones` winner-only paths among `n`, CRN-paired diffs. */
const member = (ones: number, n: number): readonly number[] => [
  ...Array.from({ length: ones }, () => 1),
  ...Array.from({ length: n - ones }, () => 0),
]

describe('gradeOnFamily — the all-members rule, the demotion, the floor, the collapse', () => {
  const strong = Array.from({ length: 5 }, () => member(20, 200)) // margin 0.10 ≫ band

  it('a dominant advantage on EVERY member grades just-do-it', () => {
    const out = gradeOnFamily({ family: strong, winnerHasConversion: false, runnerUpHasConversion: false, minPathsOverride: 100 })
    expect(out.grade).toBe('just-do-it')
    expect(out.memberMargins.every((m) => m.beyondBand)).toBe(true)
    expect(out.demotionFired).toBe(false)
  })

  it('ONE luck-flippable member forces the conservative coin-flip (grade stability is built in)', () => {
    const family = [...strong.slice(0, 4), member(0, 200)] // the fifth member: margin 0
    const out = gradeOnFamily({ family, winnerHasConversion: false, runnerUpHasConversion: false, minPathsOverride: 100 })
    expect(out.grade).toBe('coin-flip')
    // Presence (insight 029): the members genuinely disagree — four beyond, one not.
    expect(out.memberMargins.filter((m) => m.beyondBand)).toHaveLength(4)
  })

  it('THE DEMOTION (Q3): a conversion winner beyond every band but inside the calibrated margin grades coin-flip', () => {
    // 30 winner-only paths of 2,000: margin 0.015 — beyond its band (~0.005), INSIDE the
    // calibrated 0.02 demotion margin: exactly the flattered near-tie regime.
    const nearTie = Array.from({ length: 5 }, () => member(30, 2_000))
    const demoted = gradeOnFamily({ family: nearTie, winnerHasConversion: true, runnerUpHasConversion: false, minPathsOverride: 100 })
    expect(demoted.memberMargins.every((m) => m.beyondBand), 'the bands are cleared — demotion is the ONLY reason').toBe(true)
    expect(demoted.demotionFired).toBe(true)
    expect(demoted.grade).toBe('coin-flip')
    // CONTROL 1: the SAME margins without a conversion winner grade just-do-it (the demotion
    // is conversion-specific — the flattered lever, never a blanket caution).
    const noConv = gradeOnFamily({ family: nearTie, winnerHasConversion: false, runnerUpHasConversion: false, minPathsOverride: 100 })
    expect(noConv.grade).toBe('just-do-it')
    // CONTROL 2: a conversion winner CLEAR of the margin still earns just-do-it (an upper
    // edge exists — the demotion is a near-tie rule, not a conversion ban).
    const clear = Array.from({ length: 5 }, () => member(60, 2_000)) // margin 0.03 > 0.02
    const cleared = gradeOnFamily({ family: clear, winnerHasConversion: true, runnerUpHasConversion: false, minPathsOverride: 100 })
    expect(cleared.demotionFired).toBe(false)
    expect(cleared.grade).toBe('just-do-it')
    // The calibrated value itself is the measured-class derivation, not a sentinel:
    expect(solverConversionNearTieDemotionMargin.value).toBe(0.02)
  })

  it('the display-tenth clause: a cleared advantage whose tenths AGREE carries subTenthCollapse', () => {
    const out = gradeOnFamily({
      family: strong,
      winnerHasConversion: false,
      runnerUpHasConversion: false,
      minPathsOverride: 100,
      displayReads: [
        { winnerSurvival: 0.83, runnerUpSurvival: 0.82 }, // both display 8 — the unchanged-looking win
        { winnerSurvival: 0.88, runnerUpSurvival: 0.84 },
        { winnerSurvival: 0.88, runnerUpSurvival: 0.84 },
        { winnerSurvival: 0.88, runnerUpSurvival: 0.84 },
        { winnerSurvival: 0.88, runnerUpSurvival: 0.84 },
      ],
    })
    expect(out.grade).toBe('just-do-it')
    expect(out.subTenthCollapse).toBe(true)
  })

  it('guards: family size, the min-B floor (the LIVE 16,000 floor with no override), NaN diffs', () => {
    expect(() =>
      gradeOnFamily({ family: strong.slice(0, 4), winnerHasConversion: false, runnerUpHasConversion: false, minPathsOverride: 100 }),
    ).toThrow(/B-family/)
    expect(() =>
      gradeOnFamily({ family: Array.from({ length: 5 }, () => member(10, 250)), winnerHasConversion: false, runnerUpHasConversion: false }),
    ).toThrow(/floor/)
    expect(() =>
      gradeOnFamily({
        family: [...strong.slice(0, 4), [Number.NaN, ...member(10, 199)]],
        winnerHasConversion: false,
        runnerUpHasConversion: false,
        minPathsOverride: 100,
      }),
    ).toThrow(/non-finite/)
  })
})

// ---- The REAL-engine calibration arms (the probe world, 2026-07-18) -------------------------

const probePeople: readonly PersonInputs[] = [
  { sex: 'female', currentAge: 62, birthYear: 1964, retirementAge: 62, earnedIncomeReal: 0, pia: 0, socialSecurityClaimAge: 70 },
  { sex: 'male', currentAge: 62, birthYear: 1964, retirementAge: 62, earnedIncomeReal: 0, pia: 0, socialSecurityClaimAge: 70 },
]

const probeWorld = (paths: number): SimulationParams => ({
  initialPortfolio: 700_000,
  annualSpendingReal: 52_000,
  stockWeight: 0.5,
  people: probePeople,
  survivorSpendingRatio: 0.75,
  drawdownPolicy: 'taxable-first',
  market: {
    stock: { mean: 0.04, stdDev: 0.12 },
    bond: { mean: 0.015, stdDev: 0.05 },
    inflation: { mean: 0.03, stdDev: 0.041 },
    stockBondCorrelation: 0,
    space: 'simple',
    returnsAreReal: true,
  },
  paths,
  maxHorizonYears: 14,
  longevityMode: 'fixed-horizon',
  overlay: {
    taxEnabled: true,
    rmdEnabled: true,
    startCalendarYear: 2026,
    buckets: { taxable: 250_000, pretax: 400_000, roth: 50_000 },
    initialTaxableBasis: 200_000,
    filing: 'mfj',
  },
})

const conv0: CandidateStrategy = { policy: 'taxable-first', conversion: null, provenance: 'conventional-baseline' }
const conv30: CandidateStrategy = {
  policy: 'taxable-first',
  conversion: { annualAmountReal: 30_000, startYearOffset: 0, years: 3 },
  provenance: 'grid',
}
const conv250: CandidateStrategy = {
  policy: 'taxable-first',
  conversion: { annualAmountReal: 250_000, startYearOffset: 0, years: 1 },
  provenance: 'grid',
}

describe('gradeRecommendation — the real engine at the calibrated floor (16k × 5 members)', () => {
  it('KNOWN-ROBUST: a dominant no-conversion winner grades just-do-it (margins ~0.125 ≫ bands ~0.005, tenths differ)', () => {
    const out = gradeRecommendation({ base: probeWorld(16_000), winner: conv0, runnerUp: conv250, seedA: 0xca11b, statistic: 'survival' })
    expect(out.grade).toBe('just-do-it')
    expect(out.demotionFired).toBe(false)
    expect(out.subTenthCollapse).toBe(false)
    expect(out.memberMargins.every((m) => m.beyondBand && m.paths === 16_000)).toBe(true)
  }, 900_000)

  it('THE MEASURED NEAR-TIE (the S4.3 proving case, real engine): the conversion winner’s ~0.011 margin clears every band and is DEMOTED to coin-flip', () => {
    const out = gradeRecommendation({ base: probeWorld(16_000), winner: conv30, runnerUp: conv0, seedA: 0xca11b, statistic: 'survival' })
    expect(out.memberMargins.every((m) => m.beyondBand), 'CRN resolves the margin — demotion is the ONLY conservative force').toBe(true)
    expect(Math.min(...out.memberMargins.map((m) => m.margin))).toBeLessThan(solverConversionNearTieDemotionMargin.value)
    expect(out.demotionFired).toBe(true)
    expect(out.grade).toBe('coin-flip')
  }, 900_000)

  it('the min-B floor REFUSES a thin family read (the grade must not itself be noise)', () => {
    expect(() =>
      gradeRecommendation({ base: probeWorld(500), winner: conv0, runnerUp: conv250, seedA: 0xca11b, statistic: 'survival' }),
    ).toThrow(/floor/)
  }, 240_000)

  it('the leave-more statistic is honestly deferred to U15’s objective wiring (named throw, never a silent wrong grade)', () => {
    expect(() =>
      gradeRecommendation({
        base: probeWorld(16_000),
        winner: conv0,
        runnerUp: conv250,
        seedA: 1,
        statistic: 'leave-more' as never,
      }),
    ).toThrow(/U15|leave-more/)
  })
})

describe('the named-driver sensitivity probe (S4.2)', () => {
  it('a REAL ACA-regime driver: the cliff fixture’s crown flips under the enhanced-subsidies probe', () => {
    const out = namedDriverProbe({
      base: caseAcaCliff.buildBase(),
      candidates: caseAcaCliff.buildCandidates(),
      goal: 'leave-more',
      tieTolerance: 0,
      seed: caseAcaCliff.seed,
      heirBracket: CASE_III_HEIR_BRACKET,
    })
    expect(out.driver).toBe('aca-enhanced-subsidies')
  }, 120_000)

  it('a world no probe can flip carries the sampling-noise-near-tie SENTINEL — never a fabricated cause', () => {
    const out = namedDriverProbe({
      base: caseBracketFill.buildBase(), // healthcare OFF — the ACA probe declares itself inapplicable
      candidates: caseBracketFill.buildCandidates(),
      goal: 'leave-more',
      tieTolerance: 0,
      seed: caseBracketFill.seed,
      heirBracket: caseBracketFill.preconditions.heirBracket,
    })
    expect(out.driver).toBe('sampling-noise-near-tie')
  }, 120_000)
})

describe('the substrate disclosure seam (S4.5, insight 048)', () => {
  it('composes the machine-readable directional-level flag from the pinning walk’s disclosed keys', () => {
    expect(composeShapeDisclosure(['methodology.survivorSpendingRatio', 'methodology.productionMarket'])).toEqual({
      directionalLevel: true,
      substrateKeys: ['methodology.productionMarket', 'methodology.survivorSpendingRatio'],
    })
    expect(composeShapeDisclosure([])).toEqual({ directionalLevel: false, substrateKeys: [] })
  })
})
