/**
 * U14 S4 — grade calibration: "just do it" really is robust (real engine, 16k × 5-member
 * B-family), "coin-flip" really is a coin-flip, the conversion-near-tie DEMOTION fires on
 * the measured class (the council's Q3 amendment — the S4.3 proving case runs the REAL
 * engine), the min-B floor refuses, the display-tenth clause collapses sub-tenth wins, and
 * the named-driver probe finds a real ACA-regime driver and honestly says
 * `sampling-noise-near-tie` when no probe can flip the crown.
 */
import { describe, it, expect } from 'vitest'
import { NEVER_DEPLETED, type PersonInputs, type SimulationParams } from '@shared/model'
import { solverConversionNearTieDemotionSeMultiple } from '@engine/constants'
import type { CandidateStrategy } from '../../solver/candidates'
import type { CandidateOutcome } from '../evaluate'
import { caseAcaCliff, caseBracketFill, CASE_III_HEIR_BRACKET } from '../../reference/solver-cases'
import {
  composeShapeDisclosure,
  displayTenth,
  gradeOnFamily,
  gradeRecommendation,
  namedDriverProbe,
  pairedDecisionDiffs,
  type NamedDriverProbe,
} from '../gradeCalibration'
// The measured near-tie class — ONE fixture home (nearTieInversion.ts; a re-typed twin is the
// 048 drift class): the Q4d world + its conversion pair, shared with the §S0.2 stress probe.
import { nearTieRunnerUp as conv0, nearTieWinner as conv30, q4dNearTieWorld as q4dWorld } from '../nearTieInversion'

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

// ---- pairedDecisionDiffs — the ONE winner-positive sign-convention home (§S5 fold) ----------
describe('pairedDecisionDiffs — the winner-positive orientation, numerically pinned (all three axes)', () => {
  const dummy: CandidateStrategy = { policy: 'taxable-first', conversion: null, provenance: 'grid' }
  /** A synthetic scored outcome carrying only the fields the three decision axes read. */
  const scored = (over: {
    depletionYears?: readonly number[]
    tax?: readonly number[]
    taxable?: readonly number[]
  }): CandidateOutcome => {
    const n = (over.tax ?? over.taxable ?? over.depletionYears ?? [0, 0]).length
    const zeros: readonly number[] = new Array(n).fill(0)
    return {
      kind: 'scored',
      candidate: dummy,
      score: { survival: 1, lifetimeTaxMeanReal: undefined, terminalGrossMeanReal: 0, afterTaxBequestMeanReal: undefined },
      distribution: {
        terminalValuesReal: zeros,
        depletionYears: over.depletionYears ?? new Array(n).fill(NEVER_DEPLETED),
        survivalFraction: 1,
        taxAware: {
          lifetimeTaxPaidReal: over.tax ?? zeros,
          terminalTaxableReal: over.taxable ?? zeros,
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

  it('survival: winner survives every path, runner none ⇒ diffs all +1', () => {
    expect(pairedDecisionDiffs(scored({ depletionYears: [NEVER_DEPLETED, NEVER_DEPLETED, NEVER_DEPLETED] }), scored({ depletionYears: [3, 5, 7] }), 'survival')).toEqual([1, 1, 1])
  })

  it('pay-less-tax: winner pays 100 LESS every path ⇒ diffs all +100 (winner-positive = runner − winner)', () => {
    // The killer for a sign flip in the pay-less-tax arm: reverse the subtraction and this reads −100.
    expect(pairedDecisionDiffs(scored({ tax: [200, 200, 200] }), scored({ tax: [300, 300, 300] }), 'pay-less-tax')).toEqual([100, 100, 100])
  })

  it('leave-more: winner leaves 200 MORE to heirs every path ⇒ diffs all +200 (winner-positive = winner − runner)', () => {
    // Taxable steps up (§1014 — no IRD discount), so a +200 taxable gap flows straight to the bequest.
    expect(pairedDecisionDiffs(scored({ taxable: [500, 500] }), scored({ taxable: [300, 300] }), 'leave-more', 0.25)).toEqual([200, 200])
  })

  it('leave-more with NO heir bracket REFUSES (burned/062 — no silent default)', () => {
    expect(() => pairedDecisionDiffs(scored({ taxable: [500] }), scored({ taxable: [300] }), 'leave-more')).toThrow(/heir bracket/)
  })

  it('an infeasible outcome never grades (the scored guard)', () => {
    const infeasible: CandidateOutcome = { kind: 'infeasible', candidate: dummy, reason: 'x', pathIndex: 0 }
    expect(() => pairedDecisionDiffs(infeasible, scored({ tax: [1] }), 'pay-less-tax')).toThrow(/SCORED/)
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
    const out = gradeOnFamily({ family: strong, statistic: 'survival', winnerHasConversion: false, runnerUpHasConversion: false, minPathsOverride: 100 })
    expect(out.grade).toBe('just-do-it')
    expect(out.memberMargins.every((m) => m.beyondBand)).toBe(true)
    expect(out.demotionFired).toBe(false)
  })

  it('ONE luck-flippable member forces the conservative coin-flip (grade stability is built in)', () => {
    const family = [...strong.slice(0, 4), member(0, 200)] // the fifth member: margin 0
    const out = gradeOnFamily({ family, statistic: 'survival', winnerHasConversion: false, runnerUpHasConversion: false, minPathsOverride: 100 })
    expect(out.grade).toBe('coin-flip')
    // Presence (insight 029): the members genuinely disagree — four beyond, one not.
    expect(out.memberMargins.filter((m) => m.beyondBand)).toHaveLength(4)
  })

  it('THE DEMOTION (Q3, the Q4d SE-multiple): a conversion winner beyond every band but inside the multiple grades coin-flip', () => {
    // The synthetic arithmetic: member(x, n) has margin x/n and SE ≈ √(p(1−p))/√n, so the
    // margin/SE ratio ≈ √x for small p. 30 winner-only paths of 2,000: margin 0.015, ratio
    // ≈ √30 ≈ 5.5 — beyond its ~1.96·SE band, INSIDE the calibrated 10·SE demotion width:
    // exactly the flattered near-tie regime.
    const nearTie = Array.from({ length: 5 }, () => member(30, 2_000))
    const demoted = gradeOnFamily({ family: nearTie, statistic: 'survival', winnerHasConversion: true, runnerUpHasConversion: false, minPathsOverride: 100 })
    expect(demoted.memberMargins.every((m) => m.beyondBand), 'the bands are cleared — demotion is the ONLY reason').toBe(true)
    expect(demoted.demotionFired).toBe(true)
    expect(demoted.grade).toBe('coin-flip')
    // CONTROL 1: the SAME margins without a conversion winner grade just-do-it (the demotion
    // is conversion-specific — the flattered lever, never a blanket caution).
    const noConv = gradeOnFamily({ family: nearTie, statistic: 'survival', winnerHasConversion: false, runnerUpHasConversion: false, minPathsOverride: 100 })
    expect(noConv.grade).toBe('just-do-it')
    // CONTROL 2: a conversion winner CLEAR of the width still earns just-do-it (an upper edge
    // exists — a near-tie rule, not a conversion ban). 120 winner-paths: ratio ≈ √120 ≈ 11 > 10.
    const clear = Array.from({ length: 5 }, () => member(120, 2_000))
    const cleared = gradeOnFamily({ family: clear, statistic: 'survival', winnerHasConversion: true, runnerUpHasConversion: false, minPathsOverride: 100 })
    expect(cleared.demotionFired).toBe(false)
    expect(cleared.grade).toBe('just-do-it')
    // The calibrated value itself is the measured-class derivation, not a sentinel (the Q4d
    // Medicare-bearing measurement: class max margin/SE ≈ 8.1 → 10 with headroom):
    expect(solverConversionNearTieDemotionSeMultiple.value).toBe(10)
  })

  it('the display-tenth clause: a cleared advantage whose tenths AGREE carries subTenthCollapse', () => {
    const out = gradeOnFamily({
      family: strong,
      statistic: 'survival',
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

  it('THE DEMOTION AXIS GUARD (U14 fold): a pay-less-tax conversion-winner near-tie REFUSES — the SE-multiple is calibrated on the survival axis only', () => {
    const dollarFamily = Array.from({ length: 5 }, () => Array.from({ length: 200 }, () => 1_200)) // tax-DOLLAR diffs
    expect(() =>
      gradeOnFamily({ family: dollarFamily, statistic: 'pay-less-tax', winnerHasConversion: true, runnerUpHasConversion: false, minPathsOverride: 100 }),
    ).toThrow(/SURVIVAL axis only/)
    // CONTROL: the same dollar family with a NON-conversion winner grades fine — the demotion
    // is not applicable, so no uncalibrated caution is being skipped.
    const out = gradeOnFamily({ family: dollarFamily, statistic: 'pay-less-tax', winnerHasConversion: false, runnerUpHasConversion: false, minPathsOverride: 100 })
    expect(out.grade).toBe('just-do-it')
    expect(out.demotionFired).toBe(false)
  })

  it('guards: family size, the min-B floor (the LIVE 16,000 floor with no override), NaN diffs', () => {
    expect(() =>
      gradeOnFamily({ family: strong.slice(0, 4), statistic: 'survival', winnerHasConversion: false, runnerUpHasConversion: false, minPathsOverride: 100 }),
    ).toThrow(/B-family/)
    expect(() =>
      gradeOnFamily({ family: Array.from({ length: 5 }, () => member(10, 250)), statistic: 'survival', winnerHasConversion: false, runnerUpHasConversion: false }),
    ).toThrow(/floor/)
    expect(() =>
      gradeOnFamily({
        family: [...strong.slice(0, 4), [Number.NaN, ...member(10, 199)]],
        statistic: 'survival',
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

// The Q4d calibration world + its conversion pair now import from nearTieInversion.ts (the one
// fixture home, above) — the near-tie proving case runs there; the pre-65 `probeWorld` stays for
// the known-robust + floor arms (no demotion involved there — the winner carries no conversion).

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

  it('THE MEASURED NEAR-TIE (the Q4d proving case, real engine, MEDICARE-BEARING per the calibration ruling): the conversion winner clears every band yet sits inside the SE-multiple — DEMOTED to coin-flip', () => {
    // The Q4d calibration world (wf_c673339e-257, measured 2026-07-19 at 16k × 5): all-65+
    // MFJ, trended Part B + scaled IRMAA surcharges live, a 30k×3yr conversion winner over
    // conversion-0 — measured member margins 0.0021–0.0028 at margin/BAND ratios ≤ 3.2,
    // every member beyondBand (CRN resolves the margin; the demotion is the shape-residual
    // caution, never sampling noise).
    //
    // ⚠️ THE UNIT IS THE WHOLE CLAIM — this line said "margin/SE ratios ≤ 3.2" from its
    // authoring (ca41256f, 2026-07-19) until 2026-08-01, which contradicted solver.ts:95's
    // class-wide "max margin/SE ratio ≈ 8.1" written the SAME DAY. Both numbers were right;
    // one named the wrong denominator. `band = solverSelectionTieZ · se` (gradeCalibration.ts
    // :113), so the two ratios differ by exactly z = 1.96 and either reads as plausible in
    // prose. RE-MEASURED by running this very arm (2026-08-01, deterministic — seedA 0xca11b,
    // pure engine, ~15s; the 900_000 below is a hang guard, not a runtime):
    //   margin / se / band ⇒ margin/SE, margin/band
    //   0.0025625 / 0.00042801 / 0.00083890 ⇒ 5.99, 3.05
    //   0.0021250 / 0.00040471 / 0.00079323 ⇒ 5.25, 2.68
    //   0.0022500 / 0.00037459 / 0.00073420 ⇒ 6.01, 3.06   ← the class max on BOTH ratios
    //   0.0026875 / 0.00046304 / 0.00090756 ⇒ 5.80, 2.96
    //   0.0023750 / 0.00043262 / 0.00084793 ⇒ 5.49, 2.80
    // Max margin/band 3.05 ≤ 3.2 ✓; max margin/SE 6.01, nowhere near 3.2. The ratio pins
    // below make the mislabel unrepresentable — a prose-only number is what rotted here.
    //
    // ⚑ SOLVER.TS IS VINDICATED, NOT IMPLICATED — do not "fix" it to these numbers. Its
    // range is CLASS-WIDE over two variants (spend 124k AND 112k); this arm drives the 124k
    // world only (nearTieInversion.ts:61) and 112k HAS NO FIXTURE anywhere in the repo, so
    // it can never be re-measured here. Its low SE 0.00037 is this world's measured minimum
    // (0.00037459), and its 8.1 closes on the 112k end (0.0041 / 0.00051 = 8.04; 4.15 × 1.96
    // = 8.13) — so "the multiple = 10 = the measured class + ~23% headroom" (solver.ts:96)
    // holds. Rewriting solver.ts to the five rows above would DELETE the class-wide record.
    //
    // The pre-flip Medicare-BLIND proving world (62yo, no healthcare, margins ~0.011 at
    // ratios ~12–14) now sits OUTSIDE the width — the re-calibration's point: the
    // Medicare-bearing class defines the demotion regime, per the U15 Q4d ruling.
    // ⚠️ That last ratio pair was NOT re-measured on 2026-08-01 (its world is pre-flip and
    // has no fixture reachable from here) and it was written in the same sentence as the
    // mislabel above — treat its denominator as UNVERIFIED, not as attested.
    const out = gradeRecommendation({ base: q4dWorld(16_000), winner: conv30, runnerUp: conv0, seedA: 0xca11b, statistic: 'survival' })
    expect(out.memberMargins.every((m) => m.beyondBand), 'CRN resolves the margin — demotion is the ONLY conservative force').toBe(true)
    // THE UNIT PINS — the comment's "≤ 3.2" is now load-bearing instead of decorative. The
    // defect these make unrepresentable is naming 3.2 as an SE ratio: the third assertion
    // fails the moment anyone does, because margin/SE cannot be ≤ 3.2 on this world.
    const maxOverBand = Math.max(...out.memberMargins.map((m) => m.margin / m.band))
    const maxOverSe = Math.max(...out.memberMargins.map((m) => m.margin / m.se))
    expect(maxOverBand, 'margin/BAND — the ≤ 3.2 the comment above names (measured 3.05)').toBeLessThanOrEqual(3.2)
    expect(maxOverSe, 'margin/SE is z=1.96× larger — 3.2 was NEVER an SE ratio (measured 6.01)').toBeGreaterThan(3.2)
    expect(maxOverSe, "and it stays under solver.ts:95's class-wide max margin/SE ≈ 8.1").toBeLessThanOrEqual(8.1)
    const k = solverConversionNearTieDemotionSeMultiple.value
    expect(
      out.memberMargins.some((m) => m.margin < k * m.se),
      'the measured class sits inside the calibrated width',
    ).toBe(true)
    expect(out.demotionFired).toBe(true)
    expect(out.grade).toBe('coin-flip')
  }, 900_000)

  it('the min-B floor REFUSES a thin family read (the grade must not itself be noise)', () => {
    expect(() =>
      gradeRecommendation({ base: probeWorld(500), winner: conv0, runnerUp: conv250, seedA: 0xca11b, statistic: 'survival' }),
    ).toThrow(/floor/)
  }, 240_000)

  it('the demotion-axis guard fires BEFORE the expensive family evaluation (a pay-less-tax conversion winner refuses instantly)', () => {
    expect(() =>
      gradeRecommendation({ base: probeWorld(16_000), winner: conv30, runnerUp: conv0, seedA: 0xca11b, statistic: 'pay-less-tax' }),
    ).toThrow(/SURVIVAL axis only/)
  })

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

  // §S4.2 FOLD — the crown authority the probe measures against is the INJECTED (SHIPPED) selection,
  // never the raw rankCandidates argmax. solve.ts wires `crownFor` = runSearch→selectRecommendation
  // (shrinkage + the withhold arm) and `baselineCrown` = the shrunk winner's id. These two arms prove
  // the SAME probe world reads as a FLIP under the shipped authority yet as NO flip under the argmax
  // authority the fix removes — the discrimination is the whole point (a driver the user never sees).
  describe('the crown authority is the injected shipped selection, not the raw argmax', () => {
    const base = { id: 'base' } as unknown as SimulationParams
    const probedWorld = { id: 'probed' } as unknown as SimulationParams
    const probe: NamedDriverProbe = { name: 'regime-x', transform: () => probedWorld }

    it('names the driver when the SHIPPED (shrunk) crown flips — base crowns the prior, the probe world crowns a grid arm', () => {
      // crownFor is fully injected ⇒ `candidates` is never evaluated (no engine run needed).
      const shippedCrown = (p: SimulationParams): string =>
        p === probedWorld ? 'grid:proportional:0' : 'conventional:taxable-first:0'
      const out = namedDriverProbe({
        base,
        candidates: [],
        goal: 'pay-less-tax',
        tieTolerance: 0,
        seed: 1,
        probes: [probe],
        baselineCrown: 'conventional:taxable-first:0', // the SHIPPED (shrunk) winner id
        crownFor: shippedCrown,
      })
      expect(out.driver).toBe('regime-x')
    })

    it('the SAME probe world reads as NO flip under the raw-argmax authority (already crowns the grid arm on the base) — the sentinel the un-injected probe would report', () => {
      const argmaxCrown = (_p: SimulationParams): string => 'grid:proportional:0'
      const out = namedDriverProbe({
        base,
        candidates: [],
        goal: 'pay-less-tax',
        tieTolerance: 0,
        seed: 1,
        probes: [probe],
        baselineCrown: 'grid:proportional:0', // the raw-argmax baseline (the fix removes this authority)
        crownFor: argmaxCrown,
      })
      expect(out.driver).toBe('sampling-noise-near-tie')
    })
  })
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
