import { describe, it, expect } from 'vitest'
import {
  simulate,
  buildDraws,
  netWithdrawalForYear,
  cashTermsForYear,
  type PersonOffsets,
  type SimOutput,
} from '@engine/simulate'
import { validationMarket } from '@engine/reference/methodology'
import { sampleCouplePath } from '@engine/longevity'
import { toRealSeries, rollingSuccessRate } from '@engine/historical'
import { SHILLER_1925_1995 } from '@engine/reference/shillerSeries'
import { runTaxAwareDecumulation, type HouseholdYear, type OverlayPerson } from '@engine/taxOverlay'
import { toLogMoments, simpleReturnFromNormal } from '@engine/rng'
import { NEVER_DEPLETED, type SimulationParams, type PersonInputs, type OverlayParams } from '@shared/model'

const MALE_65: PersonInputs = {
  sex: 'male', currentAge: 65, retirementAge: 65,
  earnedIncomeReal: 0, socialSecurityReal: 0, socialSecurityClaimAge: 65,
}
const FEMALE_65: PersonInputs = { ...MALE_65, sex: 'female' }

function makeParams(over: Partial<SimulationParams> = {}): SimulationParams {
  return {
    initialPortfolio: 1000,
    annualSpendingReal: 40, // 4%
    stockWeight: 0.5,
    people: [MALE_65],
    survivorSpendingRatio: 0.75,
    drawdownPolicy: 'proportional',
    market: validationMarket.value,
    paths: 5000,
    maxHorizonYears: 30,
    longevityMode: 'fixed-horizon',
    ...over,
  }
}

const dist = (o: SimOutput) => {
  if (o.indeterminate) throw new Error(`unexpected indeterminate: ${o.reason}`)
  return o.distribution
}

const flatN = (len: number, val: number): number[] => Array.from({ length: len }, () => val)

describe('Mode B — MC runs strictly below the SAME-ENGINE historical anchor', () => {
  const realShiller = toRealSeries(SHILLER_1925_1995)
  const histAt = (wRate: number) =>
    rollingSuccessRate(realShiller, { initialPortfolio: 1000, withdrawalRate: wRate, stockWeight: 0.5, horizonYears: 30 }).rate
  const mcAt = (spend: number) =>
    dist(simulate(makeParams({ annualSpendingReal: spend, paths: 8000 }), 13579)).survivalFraction

  it('at 4% (the stress region) i.i.d. MC is STRICTLY below the saturated historical anchor', () => {
    // Both legs are Shiller-GOVERNMENT-bond calibrated (directional until the corporate
    // series is pinned — the P1 exit gate), so both run higher than the Trinity-corporate
    // references (~95%). At 4% the historical saturates near 100% (no 30-yr window failed),
    // while i.i.d. MC strings unbroken bad runs history never saw → a real, lower number.
    const hist = histAt(0.04)
    const mc = mcAt(40)
    console.log(`[band] w=4.0%  hist=${(hist * 100).toFixed(1)}%  mc=${(mc * 100).toFixed(1)}%`)
    expect(hist).toBeGreaterThanOrEqual(0.97) // saturated
    expect(mc).toBeLessThan(hist) // the §Strand-4 "i.i.d. more pessimistic" invariant
    expect(mc).toBeGreaterThan(0.88) // sane band (govt-calibrated; corporate pinning shifts down)
    expect(mc).toBeLessThan(0.97)
  })

  it('the relation is TWO-SIDED (Kitces): in the 70–90% range MC no longer sits below history', () => {
    // §Strand-4 line 113: MC overstates TAIL risk (low withdrawal) but can overstate
    // sustainable INCOME in the mid-range — so the strict-below relation is asserted ONLY
    // in the stress region above, NOT here. At 5% both legs are close and may cross.
    const hist = histAt(0.05)
    const mc = mcAt(50)
    console.log(`[band] w=5.0%  hist=${(hist * 100).toFixed(1)}%  mc=${(mc * 100).toFixed(1)}%`)
    expect(hist).toBeLessThan(0.9) // out of the saturation region
    expect(Math.abs(mc - hist)).toBeLessThan(0.1) // close — the crossover band, not strictly below
  })

  it('a lower withdrawal is safer than a higher one (monotone sanity)', () => {
    const safe = dist(simulate(makeParams({ annualSpendingReal: 30 }), 13579))
    const risky = dist(simulate(makeParams({ annualSpendingReal: 55 }), 13579))
    expect(safe.survivalFraction).toBeGreaterThan(risky.survivalFraction)
  })
})

describe('CRN — the draw schedule is dimension-only (contract #1)', () => {
  it('buildDraws is identical for the same (seed, dims) — independent of any financial input', () => {
    const a = buildDraws(42, 100, 30, 2)
    const b = buildDraws(42, 100, 30, 2)
    expect(a).toEqual(b)
  })

  it('two arms differing ONLY in survivor-spending ratio consume identical draws, differ in outcome', () => {
    const base = makeParams({
      people: [MALE_65, FEMALE_65],
      longevityMode: 'sampled',
      maxHorizonYears: 55,
      annualSpendingReal: 45,
      paths: 4000,
    })
    const armA = dist(simulate({ ...base, survivorSpendingRatio: 0.75 }, 2468))
    const armB = dist(simulate({ ...base, survivorSpendingRatio: 0.5 }, 2468))

    // CRN: both arms draw from buildDraws(seed, paths, maxHorizon, peopleCount) with
    // IDENTICAL arguments (the ratio is not one of them), so the normals + longevity
    // draws are byte-identical path-for-path — the structural basis of CRN.
    expect(buildDraws(2468, base.paths, base.maxHorizonYears, 2)).toEqual(
      buildDraws(2468, base.paths, base.maxHorizonYears, 2),
    )
    // …yet the ratio MATTERS: the lower-survivor-spending arm survives more often.
    expect(armB.survivalFraction).toBeGreaterThan(armA.survivalFraction)

    // Presence companion (burned/027): the CRN guarantee isn't vacuous — at least one
    // path actually enters the survivor regime (a first death strictly within horizon).
    const draws = buildDraws(2468, base.paths, base.maxHorizonYears, 2)
    let enteredSurvivorRegime = 0
    for (let p = 0; p < base.paths; p++) {
      const path = sampleCouplePath([MALE_65, FEMALE_65], draws.longevityU[p] ?? [])
      if (path.firstDeathYear < Math.min(path.lastDeathYear, base.maxHorizonYears) && path.firstDeathYear < base.maxHorizonYears) {
        enteredSurvivorRegime++
      }
    }
    expect(enteredSurvivorRegime).toBeGreaterThan(0)
  })

  it('is seed-stable: the same params + seed reproduce a byte-identical distribution', () => {
    const a = dist(simulate(makeParams(), 777))
    const b = dist(simulate(makeParams(), 777))
    expect(a.terminalValuesReal).toEqual(b.terminalValuesReal)
    expect(a.depletionYears).toEqual(b.depletionYears)
    expect(a.survivalFraction).toBe(b.survivalFraction)
  })

  it('the four sequencing policies produce the IDENTICAL distribution on the single pool', () => {
    const policies = ['proportional', 'taxable-first', 'pre-tax-first', 'bracket-fill'] as const
    const base = dist(simulate(makeParams({ drawdownPolicy: 'proportional' }), 555))
    for (const policy of policies) {
      const d = dist(simulate(makeParams({ drawdownPolicy: policy }), 555))
      expect(d.survivalFraction).toBe(base.survivalFraction) // inert on one pool
    }
  })
})

describe('the cash-term seam (bridge + SS step-down)', () => {
  const retiredClaiming = (ss: number): PersonOffsets => ({ retire: 0, claim: 0, earnedIncomeReal: 0, socialSecurityReal: ss })
  const seamParams = makeParams({ annualSpendingReal: 100, survivorSpendingRatio: 0.75 })

  it('both alive + both claiming: SS is the SUM, netted off spending', () => {
    const w = netWithdrawalForYear(5, seamParams, [retiredClaiming(30), retiredClaiming(20)], [50, 50], 30)
    expect(w).toBe(100 - (30 + 20)) // 50
  })

  it('survivor step-down: spending drops to the ratio AND SS becomes the LARGER single benefit', () => {
    // person 0 died at year 3; at t=5 only person 1 survives.
    const w = netWithdrawalForYear(5, seamParams, [retiredClaiming(30), retiredClaiming(20)], [3, 50], 30)
    // spending 100×0.75=75; household SS steps from 50 down to max(30,20)=30 (the survivor keeps the larger).
    expect(w).toBe(75 - 30) // 45
  })

  it('the earned-income bridge clamps at zero (income > spending never contributes back)', () => {
    const working: PersonOffsets = { retire: 10, claim: 0, earnedIncomeReal: 200, socialSecurityReal: 0 }
    expect(netWithdrawalForYear(2, seamParams, [working], [50], 0)).toBe(0) // max(0, 100−200)
  })

  it('never credits a dead earner: income stops at death even before retirement', () => {
    const workingEarner: PersonOffsets = { retire: 10, claim: 99, earnedIncomeReal: 50, socialSecurityReal: 0 }
    // alive at t=2 (death at 3) → income nets: 100−50=50
    expect(netWithdrawalForYear(2, seamParams, [workingEarner], [3], 0)).toBe(50)
    // dead at t=5 (>= death 3) → income gone; lone person dead so survivor-ratio spending, no SS
    expect(netWithdrawalForYear(5, seamParams, [workingEarner], [3], 0)).toBe(75)
  })
})

describe('the bridge reduces to the spine (income = 0)', () => {
  it('a retired person with income is byte-identical to income = 0 (bridge inert post-retirement)', () => {
    const incomeRetired: PersonInputs = { ...MALE_65, retirementAge: 65, earnedIncomeReal: 25 } // retire offset 0
    const a = dist(simulate(makeParams({ people: [incomeRetired] }), 909))
    const b = dist(simulate(makeParams({ people: [MALE_65] }), 909)) // income 0
    expect(a.terminalValuesReal).toEqual(b.terminalValuesReal)
  })

  it('a STILL-WORKING person with income differs (income nets in the working years)', () => {
    const working: PersonInputs = { ...MALE_65, currentAge: 60, retirementAge: 65, earnedIncomeReal: 25 }
    const a = dist(simulate(makeParams({ people: [working], maxHorizonYears: 35 }), 909))
    const b = dist(simulate(makeParams({ people: [{ ...working, earnedIncomeReal: 0 }], maxHorizonYears: 35 }), 909))
    expect(a.survivalFraction).not.toBe(b.survivalFraction)
  })
})

describe('R19 engine half + dire-but-honest edges', () => {
  it('degenerate inputs return the defined indeterminate output (never a crash/NaN)', () => {
    const m = validationMarket.value
    const bad: Partial<SimulationParams>[] = [
      { initialPortfolio: -1 },
      { initialPortfolio: NaN },
      { annualSpendingReal: Infinity },
      { maxHorizonYears: 0 },
      { paths: 0 },
      { people: [] },
      { stockWeight: 1.5 },
      // R19 market-domain guards (the adversarial-review fixes — each previously
      // escaped a NaN/calm-but-wrong reading):
      { market: { ...m, stock: { mean: -1, stdDev: 0.15 } } }, // toLogMoments domain (phi=0)
      { market: { ...m, stock: { mean: -1.5, stdDev: 0.1 } } }, // ln(negative) → NaN
      { market: { ...m, stockBondCorrelation: NaN } }, // Cholesky → NaN
      { market: { ...m, stockBondCorrelation: 1.5 } }, // |ρ|>1 silently zeroes the off-diagonal
      { market: { ...m, space: 'log' } }, // unsupported: would double-apply the σ²/2 drag
      { market: { ...m, returnsAreReal: false } }, // unsupported: nominal-as-real overstates survival
    ]
    for (const over of bad) {
      expect(simulate(makeParams(over), 1).indeterminate).toBe(true)
    }
  })

  it('$0 portfolio + positive spending → coherent already-failing (0 survival, no NaN)', () => {
    const d = dist(simulate(makeParams({ initialPortfolio: 0, annualSpendingReal: 40 }), 1))
    expect(d.survivalFraction).toBe(0)
    expect(d.terminalValuesReal.every((v) => v === 0)).toBe(true)
    expect(d.depletionYears.every((y) => y !== NEVER_DEPLETED)).toBe(true)
  })

  it('no NaN/Infinity escapes a valid distribution', () => {
    const d = dist(simulate(makeParams(), 4321))
    expect(Number.isFinite(d.survivalFraction)).toBe(true)
    expect(d.terminalValuesReal.every(Number.isFinite)).toBe(true)
    expect(d.depletionYears.every(Number.isFinite)).toBe(true)
  })

  it('an incomputable overlay returns the defined indeterminate output (R19), never a crash', () => {
    const P = 1_000_000
    const base = makeParams({ initialPortfolio: P, annualSpendingReal: 40_000 })
    const overlays: OverlayParams[] = [
      { taxEnabled: false, rmdEnabled: false, startCalendarYear: 2026, buckets: { taxable: 0, pretax: P - 1_000, roth: 0 }, filing: 'mfj' }, // buckets ≠ P (≫ the float-dust tolerance)
      { taxEnabled: false, rmdEnabled: false, startCalendarYear: 2026, buckets: { taxable: -1, pretax: P + 1, roth: 0 }, filing: 'mfj' }, // negative bucket
      { taxEnabled: true, rmdEnabled: false, startCalendarYear: 2026, buckets: { taxable: 500_000, pretax: 500_000, roth: 0 }, filing: 'mfj' }, // tax on + taxable>0, basis MISSING
      { taxEnabled: false, rmdEnabled: false, startCalendarYear: NaN, buckets: { taxable: 0, pretax: P, roth: 0 }, filing: 'mfj' }, // NaN calendar anchor
      { taxEnabled: true, rmdEnabled: false, startCalendarYear: 2026, buckets: { taxable: 0, pretax: P, roth: 0 }, filing: 'mfj', conversions: [NaN] }, // non-finite conversion
    ]
    for (const overlay of overlays) {
      expect(simulate({ ...base, overlay }, 1).indeterminate).toBe(true)
    }
  })
})

// ===========================================================================
// U2 · M6a — the tax-and-accounts overlay wired into the spine. The tax MATH is exhaustively
// golden at the overlay level (taxOverlay.test.ts); these anchor the WIRING: reduce-to-spine
// THROUGH simulate, zero-draw CRN across the survivor MFJ→single transition, faithful per-year
// input assembly across a death, and the birth-year-derived RMD age. Realistic DOLLAR scale
// (P = $1M) — the tax brackets are in real dollars, so the abstract-unit spine scale (P = 1000)
// would leave every draw below the deduction and the tax inert.
// ===========================================================================
describe('U2 overlay wired into simulate (M6a)', () => {
  const COUPLE = makeParams({
    people: [MALE_65, FEMALE_65],
    longevityMode: 'sampled',
    maxHorizonYears: 55,
    annualSpendingReal: 45,
    paths: 4000,
  })
  const offOverlay = (p: SimulationParams): OverlayParams => ({
    taxEnabled: false,
    rmdEnabled: false,
    startCalendarYear: 2026,
    buckets: { taxable: 0, pretax: p.initialPortfolio, roth: 0 },
    filing: 'mfj',
  })

  describe('reduce-to-spine THROUGH simulate: an overlay-ON path under the EXHAUSTIVE OFF condition === the spine', () => {
    it('collapsed single pool + tax off + RMD off + no conversion → byte-identical to the overlay-absent spine (couple, sampled — survivor transitions present)', () => {
      const spineDist = dist(simulate(COUPLE, 2468))
      const withOverlayOff = dist(simulate({ ...COUPLE, overlay: offOverlay(COUPLE) }, 2468))
      expect(withOverlayOff.terminalValuesReal).toEqual(spineDist.terminalValuesReal)
      expect(withOverlayOff.depletionYears).toEqual(spineDist.depletionYears)
      expect(withOverlayOff.survivalFraction).toBe(spineDist.survivalFraction)
    })

    it('a MULTI-bucket split with a non-proportional policy is STILL byte-identical with tax off (the policy is total-neutral)', () => {
      // buckets split across all three (sum = P) + taxable-first: the policy moves WHICH bucket funds
      // each year but never the total trajectory (one shared stepYear), so it reduces to the spine too.
      const split: OverlayParams = {
        taxEnabled: false,
        rmdEnabled: false,
        startCalendarYear: 2026,
        buckets: { taxable: 300, pretax: 500, roth: 200 }, // sums to COUPLE.initialPortfolio = 1000
        filing: 'mfj',
      }
      const spineDist = dist(simulate(COUPLE, 2468))
      const withOverlayOff = dist(simulate({ ...COUPLE, drawdownPolicy: 'taxable-first', overlay: split }, 2468))
      expect(withOverlayOff.terminalValuesReal).toEqual(spineDist.terminalValuesReal)
      expect(withOverlayOff.depletionYears).toEqual(spineDist.depletionYears)
    })
  })

  describe('CRN: two candidates differing ONLY in conversion amount draw identically across the survivor transition', () => {
    const P = 1_000_000
    const crnBase = makeParams({
      people: [MALE_65, FEMALE_65],
      longevityMode: 'sampled',
      maxHorizonYears: 55,
      annualSpendingReal: 45_000,
      initialPortfolio: P,
      paths: 2000,
    })
    const withConv = (conversions: readonly number[]): SimulationParams => ({
      ...crnBase,
      overlay: { taxEnabled: true, rmdEnabled: true, startCalendarYear: 2026, buckets: { taxable: 0, pretax: P, roth: 0 }, filing: 'mfj', conversions },
    })

    it('the draw schedule is dimension-only (conversion is not a buildDraws arg) and the run is deterministic', () => {
      // CRN: buildDraws(seed, paths, maxHorizon, peopleCount) — the conversion amount is NOT one of
      // its arguments, so the normals + longevity draws are byte-identical regardless of conversion.
      expect(buildDraws(2468, crnBase.paths, crnBase.maxHorizonYears, 2)).toEqual(
        buildDraws(2468, crnBase.paths, crnBase.maxHorizonYears, 2),
      )
      const a = dist(simulate(withConv(flatN(55, 30_000)), 2468))
      const b = dist(simulate(withConv(flatN(55, 30_000)), 2468))
      // deterministic + no desync NaN anywhere (a draw desync would scramble per-path returns).
      expect(a.terminalValuesReal).toEqual(b.terminalValuesReal)
      expect(a.terminalValuesReal.every(Number.isFinite)).toBe(true)
    })

    it('the conversion MATTERS (the overlay does tax work) — yet at least one path crosses the survivor transition', () => {
      const noConv = dist(simulate(withConv([]), 2468))
      const conv = dist(simulate(withConv(flatN(55, 50_000)), 2468))
      expect(conv.terminalValuesReal).not.toEqual(noConv.terminalValuesReal)
      // presence companion (burned/027): the "across the MFJ→single transition" claim is non-vacuous.
      const draws = buildDraws(2468, crnBase.paths, crnBase.maxHorizonYears, 2)
      let transitions = 0
      for (let p = 0; p < crnBase.paths; p++) {
        const path = sampleCouplePath([MALE_65, FEMALE_65], draws.longevityU[p] ?? [])
        if (path.firstDeathYear < Math.min(path.lastDeathYear, crnBase.maxHorizonYears) && path.firstDeathYear < crnBase.maxHorizonYears)
          transitions++
      }
      expect(transitions).toBeGreaterThan(0)
    })

    it('the per-path delta is MONOTONE + jitter-free in the conversion amount (a draw desync would oscillate)', () => {
      // Fixed-horizon couple, SHORT horizon, a single year-0 conversion, pre-tax-first (Roth drawn last,
      // so its tax-free-withdrawal benefit cannot fire in-window) → the only effect of a larger conversion
      // is more upfront ordinary tax LEAVING the portfolio. With byte-identical draws the per-path terminal
      // is therefore a clean monotone-decreasing function of the conversion amount; a draw desync (the bug
      // CRN guards against) would scramble per-path returns and break monotonicity.
      const fhBase = makeParams({
        people: [MALE_65, FEMALE_65],
        longevityMode: 'fixed-horizon',
        maxHorizonYears: 3,
        annualSpendingReal: 40_000,
        initialPortfolio: P,
        drawdownPolicy: 'pre-tax-first',
        paths: 300,
      })
      const run = (c: number) =>
        dist(simulate({ ...fhBase, overlay: { taxEnabled: true, rmdEnabled: false, startCalendarYear: 2026, buckets: { taxable: 0, pretax: P, roth: 0 }, filing: 'mfj', conversions: [c] } }, 2468)).terminalValuesReal
      const t0 = run(0)
      const t1 = run(50_000)
      const t2 = run(100_000)
      for (let p = 0; p < t0.length; p++) {
        expect(t1[p]!).toBeLessThanOrEqual(t0[p]!)
        expect(t2[p]!).toBeLessThanOrEqual(t1[p]!)
      }
      // non-vacuous: the conversion genuinely moved the terminal (else monotonicity is trivially true).
      expect(t2[0]!).toBeLessThan(t0[0]!)
    })
  })

  describe('the RMD start age is birth-year-derived THROUGH simulate (SECURE-2.0 bands, never a flat 73)', () => {
    it('a born-1955 cohort’s RMD bites at age 73; a born-1960 cohort’s does not (band 75) → byte-identical to the spine', () => {
      // Single filer, age 73, fixed-horizon 2 years (ages 73–74 — below the born-1960 band 75, so that
      // cohort has NO RMD in-window). Spend below the single deduction stack so the ONLY tax driver is the
      // forced RMD. born-1955 (band 73): RMD ≈ 1M/26.5 ≈ 37.7k forces income above the deduction → tax →
      // strictly below the spine, every path. born-1960 (band 75): no RMD in-window + a sub-deduction draw
      // → 0 tax → byte-identical to the spine. Proves simulate derives birthYear = startCalendarYear − age.
      const P = 1_000_000
      const spend = 12_000 // safely below the single age-65 deduction stack → no tax from the draw itself
      const person: PersonInputs = { ...MALE_65, currentAge: 73, retirementAge: 73 }
      const mk = (startCalendarYear: number): SimulationParams =>
        makeParams({
          initialPortfolio: P,
          annualSpendingReal: spend,
          stockWeight: 0.5,
          people: [person],
          longevityMode: 'fixed-horizon',
          maxHorizonYears: 2,
          paths: 200,
          overlay: { taxEnabled: true, rmdEnabled: true, startCalendarYear, buckets: { taxable: 0, pretax: P, roth: 0 }, filing: 'single' },
        })
      const spineRun = dist(
        simulate(
          makeParams({ initialPortfolio: P, annualSpendingReal: spend, stockWeight: 0.5, people: [person], longevityMode: 'fixed-horizon', maxHorizonYears: 2, paths: 200 }),
          4321,
        ),
      )
      const born1955 = dist(simulate(mk(2028), 4321)) // 2028 − 73 = born 1955 → band 73
      const born1960 = dist(simulate(mk(2033), 4321)) // 2033 − 73 = born 1960 → band 75
      // born-1960: no RMD in-window + a sub-deduction draw → no tax → byte-identical to the spine.
      expect(born1960.terminalValuesReal).toEqual(spineRun.terminalValuesReal)
      // born-1955: the forced RMD income clears the deduction → tax leaves → strictly below the spine.
      for (let p = 0; p < spineRun.terminalValuesReal.length; p++) {
        expect(born1955.terminalValuesReal[p]!).toBeLessThan(spineRun.terminalValuesReal[p]!)
      }
    })
  })

  describe('bracket-fill is wired through simulate (the OverlayParams.bracketFillCeilings passthrough)', () => {
    it('a sub-deduction ceiling fills cheap pre-tax then draws Roth tax-free → higher terminal than pre-tax-first', () => {
      // {pretax 1M, roth 1M} = $2M, both 67 (no RMD/SS), fixed-horizon 5y, $100k spend. The $40k ceiling is
      // below the $47,500 MFJ deduction, so bracket-fill pays $0 tax (cheap pre-tax + tax-free Roth) and ends
      // at the spine; pre-tax-first leaks tax. Proves the ceiling stream reaches the overlay through simulate.
      const P = 2_000_000
      const base = makeParams({
        initialPortfolio: P,
        annualSpendingReal: 100_000,
        stockWeight: 0.5,
        people: [{ ...MALE_65, currentAge: 67, retirementAge: 67 }, { ...FEMALE_65, currentAge: 67, retirementAge: 67 }],
        longevityMode: 'fixed-horizon',
        maxHorizonYears: 5,
        paths: 200,
      })
      const overlay = (taxEnabled: boolean): OverlayParams => ({ taxEnabled, rmdEnabled: false, startCalendarYear: 2026, buckets: { taxable: 0, pretax: 1_000_000, roth: 1_000_000 }, filing: 'mfj' })
      const spineRun = dist(simulate(base, 4321))
      const bracketFill = dist(simulate({ ...base, drawdownPolicy: 'bracket-fill', overlay: { ...overlay(true), bracketFillCeilings: flatN(5, 40_000) } }, 4321))
      const preTaxFirst = dist(simulate({ ...base, drawdownPolicy: 'pre-tax-first', overlay: overlay(true) }, 4321))
      // bracket-fill pays $0 tax (sub-deduction ceiling) → byte-identical to the spine, every path...
      expect(bracketFill.terminalValuesReal).toEqual(spineRun.terminalValuesReal)
      // ...and strictly above pre-tax-first, which leaks tax on the full pre-tax draw.
      for (let p = 0; p < spineRun.terminalValuesReal.length; p++) {
        expect(bracketFill.terminalValuesReal[p]!).toBeGreaterThan(preTaxFirst.terminalValuesReal[p]!)
      }
    })
  })

  describe('faithful input assembly: a 1-path overlay run === a direct overlay call on the reconstructed inputs (across a survivor transition)', () => {
    it('the survivor MFJ→single flip + SS step-down + conversion stream are all assembled correctly through simulate', () => {
      // 1 path, sampled longevity, an old couple so a first death lands within the horizon. Reconstruct
      // EXACTLY what simulate feeds the overlay — the seeded returns, the death-driven withdrawals + SS
      // step-down (via the SAME cashTermsForYear seam), the survivor householdYears, and the conversion
      // stream — call runTaxAwareDecumulation directly, and assert simulate's terminal/depletion match.
      // The tax MATH is the overlay's golden fixtures; this pins simulate's ASSEMBLY of the overlay
      // inputs across the MFJ→single transition (a wiring bug — wrong householdYears order, SS not
      // stepped down, off-by-one stream, wrong bucket/config — diverges here).
      const P = 1_000_000
      const startCalendarYear = 2026
      const seed = 909
      const MALE_75: PersonInputs = { sex: 'male', currentAge: 75, retirementAge: 75, earnedIncomeReal: 0, socialSecurityReal: 30_000, socialSecurityClaimAge: 75 }
      const FEMALE_72: PersonInputs = { sex: 'female', currentAge: 72, retirementAge: 72, earnedIncomeReal: 0, socialSecurityReal: 20_000, socialSecurityClaimAge: 72 }
      const people = [MALE_75, FEMALE_72]
      const conversions = flatN(40, 25_000)
      const params = makeParams({
        initialPortfolio: P,
        annualSpendingReal: 60_000,
        stockWeight: 0.5,
        people,
        longevityMode: 'sampled',
        maxHorizonYears: 40,
        paths: 1,
        drawdownPolicy: 'pre-tax-first',
        overlay: { taxEnabled: true, rmdEnabled: true, startCalendarYear, buckets: { taxable: 0, pretax: P, roth: 0 }, filing: 'mfj', conversions },
      })

      // --- Reconstruct simulate's single-path overlay inputs from the public engine primitives ---
      const draws = buildDraws(seed, 1, params.maxHorizonYears, 2)
      const longevityPeople = people.map((p) => ({ sex: p.sex, currentAge: p.currentAge }))
      const path = sampleCouplePath(longevityPeople, draws.longevityU[0] ?? [])
      const deathOffsets = [...path.deathYearOffsets]
      const horizon = Math.min(path.lastDeathYear, params.maxHorizonYears)
      expect(path.firstDeathYear).toBeLessThan(horizon) // non-vacuous: the flip actually happens

      const offsets: PersonOffsets[] = people.map((p) => ({
        retire: p.retirementAge - p.currentAge,
        claim: p.socialSecurityClaimAge - p.currentAge,
        earnedIncomeReal: p.earnedIncomeReal,
        socialSecurityReal: p.socialSecurityReal,
      }))
      const maxBenefit = people.reduce((m, p) => Math.max(m, p.socialSecurityReal), 0)
      const logStock = toLogMoments(params.market.stock.mean, params.market.stock.stdDev)
      const logBond = toLogMoments(params.market.bond.mean, params.market.bond.stdDev)
      const rho = params.market.stockBondCorrelation
      const sqrt1mRho2 = Math.sqrt(Math.max(0, 1 - rho * rho))
      const overlayPeople: OverlayPerson[] = people.map((p) => ({ birthYear: startCalendarYear - p.currentAge }))

      const realStock: number[] = []
      const realBond: number[] = []
      const withdrawals: number[] = []
      const ssBenefits: number[] = []
      const householdYears: HouseholdYear[] = []
      const sRow = draws.stockZ[0] ?? []
      const bRow = draws.bondZ[0] ?? []
      for (let t = 0; t < horizon; t++) {
        const zs = sRow[t]
        const zbRaw = bRow[t]
        if (zs === undefined || zbRaw === undefined) break
        const zb = rho * zs + sqrt1mRho2 * zbRaw
        realStock.push(simpleReturnFromNormal(logStock, zs))
        realBond.push(simpleReturnFromNormal(logBond, zb))
        const cash = cashTermsForYear(t, params, offsets, deathOffsets, maxBenefit)
        withdrawals.push(cash.net)
        ssBenefits.push(cash.ss)
        const living: OverlayPerson[] = []
        for (let i = 0; i < overlayPeople.length; i++) {
          const op = overlayPeople[i]
          if (op !== undefined && t < (deathOffsets[i] ?? 0)) living.push(op)
        }
        householdYears.push({ living })
      }
      // Independent cross-check that the regime genuinely flips MFJ→single at the first death.
      expect(householdYears[0]!.living.length).toBe(2) // both alive at t=0 → MFJ
      expect(householdYears[horizon - 1]!.living.length).toBe(1) // a lone survivor at the last year → single

      const ref = runTaxAwareDecumulation(
        { taxable: 0, pretax: P, roth: 0 },
        realStock,
        realBond,
        withdrawals,
        params.stockWeight,
        'pre-tax-first',
        { taxEnabled: true, rmdEnabled: true, household: { startCalendarYear, filing: 'mfj', owner: overlayPeople[0]!, spouse: overlayPeople[1]! } },
        { ssBenefits, conversions, householdYears },
      )
      const sim = dist(simulate(params, seed))
      expect(sim.terminalValuesReal[0]!).toBe(ref.terminalReal)
      expect(sim.depletionYears[0]!).toBe(ref.depletionYear)
    })
  })
})
