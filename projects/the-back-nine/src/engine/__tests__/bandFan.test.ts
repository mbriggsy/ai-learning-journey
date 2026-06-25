import { describe, it, expect } from 'vitest'
import { simulate, bandPercentile, buildBandFan, type SimOutput } from '@engine/simulate'
import { validationMarket } from '@engine/reference/methodology'
import {
  type MarketAssumptions,
  type OverlayParams,
  type PersonInputs,
  type SimulationParams,
} from '@shared/model'

// =====================================================================================
// The U6/U7 per-year living-cohort band fan (simulate's opt-in presentation surface).
//
// Three correctness pillars:
//   1. bandPercentile / buildBandFan — externally-derived from the quantile DEFINITION
//      (numpy's default R-7 linear interpolation), never the code's own arithmetic (DND/012).
//   2. A deterministic ZERO-VOLATILITY fixed-horizon run — a linear drawdown hand-computed
//      independent of the RNG, pinning the whole pipeline end-to-end (anchor, per-year values,
//      the depletion→$0 ruin floor, the alive-but-broke continuation, cohortFraction).
//   3. Reduce-to-spine byte-identity — a fan-on run is byte-identical to a fan-off run on
//      terminalValuesReal / depletionYears / survivalFraction / taxAware (the fan only OBSERVES).
// =====================================================================================

const dist = (o: SimOutput) => {
  if (o.indeterminate) throw new Error(`unexpected indeterminate: ${o.reason}`)
  if (o.infeasible) throw new Error(`unexpected infeasible: ${o.reason}`)
  return o.distribution
}

// ---------------------------------------------------------------------------------------
// 1. bandPercentile — externally-derived (numpy np.percentile default = linear / R-7).
// ---------------------------------------------------------------------------------------
describe('bandPercentile (R-7 linear interpolation, externally-derived)', () => {
  it('a single-value cohort IS its own every-percentile', () => {
    for (const p of [0.1, 0.25, 0.5, 0.75, 0.9]) expect(bandPercentile([42], p)).toBe(42)
  })

  it('matches numpy np.percentile([0,100,200,300,400], [10,25,50,75,90]) = [40,100,200,300,360]', () => {
    const xs = [0, 100, 200, 300, 400]
    expect(bandPercentile(xs, 0.1)).toBeCloseTo(40, 10)
    expect(bandPercentile(xs, 0.25)).toBeCloseTo(100, 10)
    expect(bandPercentile(xs, 0.5)).toBeCloseTo(200, 10)
    expect(bandPercentile(xs, 0.75)).toBeCloseTo(300, 10)
    expect(bandPercentile(xs, 0.9)).toBeCloseTo(360, 10)
  })

  it('an all-equal cohort returns that value at every percentile', () => {
    for (const p of [0.1, 0.5, 0.9]) expect(bandPercentile([50, 50, 50], p)).toBe(50)
  })
})

// ---------------------------------------------------------------------------------------
// 2. buildBandFan — externally-derived reduction (the anchor, the t+1 grid, the cohort
//    fraction, the empty-year stop, the $0 ruin floor surviving in the cohort).
// ---------------------------------------------------------------------------------------
describe('buildBandFan (the reduction, externally-derived)', () => {
  it('prepends the degenerate today anchor (every path at initialPortfolio, cohort 1)', () => {
    const fan = buildBandFan([], [], 1000, 10)
    expect(fan.byYear).toHaveLength(1)
    expect(fan.byYear[0]).toEqual({
      yearsFromNow: 0,
      p10: 1000,
      p25: 1000,
      p50: 1000,
      p75: 1000,
      p90: 1000,
      cohortFraction: 1,
    })
  })

  it('reduces year-major bins to percentiles on the t+1 grid with cohortFraction = count/paths', () => {
    // Year 0 cohort [0,100,200,300,400] (count 5 of 10); year 1 cohort [0,0,50] (count 3 of 10 —
    // two households broke ($0) and one holds $50). Percentiles hand-derived from the definition.
    const fan = buildBandFan(
      [
        [0, 100, 200, 300, 400],
        [50, 0, 0], // unsorted on purpose — buildBandFan sorts internally
      ],
      [5, 3],
      1000,
      10,
    )
    expect(fan.byYear).toHaveLength(3) // anchor + 2 years
    expect(fan.byYear[1]).toEqual({
      yearsFromNow: 1,
      p10: 40,
      p25: 100,
      p50: 200,
      p75: 300,
      p90: 360,
      cohortFraction: 0.5,
    })
    // sorted [0,0,50]: p10=0, p25=0, p50=0, p75=25, p90=40 (the ruin $0s stay in the cohort).
    expect(fan.byYear[2]).toEqual({
      yearsFromNow: 2,
      p10: 0,
      p25: 0,
      p50: 0,
      p75: 25,
      p90: 40,
      cohortFraction: 0.3,
    })
  })

  it('STOPS at the first year with an empty cohort (no household survives — never an empty band)', () => {
    const fan = buildBandFan([[100, 200], [], [300]], [2, 0, 1], 1000, 10)
    expect(fan.byYear).toHaveLength(2) // anchor + year 1 only; the count-0 year ends the fan
    expect(fan.byYear[1]?.yearsFromNow).toBe(1)
  })
})

// ---------------------------------------------------------------------------------------
// 3. End-to-end, deterministic: a ZERO-VOLATILITY fixed-horizon drawdown. Returns are
//    exactly 0 for every draw, so every path is the identical linear ramp — hand-computable
//    independent of the RNG. initialPortfolio 1000, net 100/yr ⇒ 900,800,…,100, then $0 at the
//    depletion year (year 9), then $0 alive-but-broke through the fixed horizon.
// ---------------------------------------------------------------------------------------
const ZERO_VOL_MARKET: MarketAssumptions = {
  stock: { mean: 0, stdDev: 0 },
  bond: { mean: 0, stdDev: 0 },
  inflation: { mean: 0, stdDev: 0 },
  stockBondCorrelation: 0,
  space: 'simple',
  returnsAreReal: true,
}

const RETIRED_70: PersonInputs = {
  sex: 'male',
  currentAge: 70,
  birthYear: 1956,
  retirementAge: 65, // already retired ⇒ no earned-income bridge
  earnedIncomeReal: 0,
  pia: 0, // no Social Security ⇒ net withdrawal === spending
  socialSecurityClaimAge: 67,
}

describe('the deterministic zero-volatility drawdown (externally-derived end-to-end)', () => {
  const params: SimulationParams = {
    initialPortfolio: 1000,
    annualSpendingReal: 100,
    stockWeight: 0.6,
    people: [RETIRED_70],
    survivorSpendingRatio: 0.75,
    drawdownPolicy: 'proportional',
    market: ZERO_VOL_MARKET,
    paths: 4,
    maxHorizonYears: 12,
    longevityMode: 'fixed-horizon',
  }

  it('emits the exact hand-computed linear ramp, ruin floor, and alive-but-broke continuation', () => {
    const d = dist(simulate(params, 12345, { bandFan: true }))
    const fan = d.bandFan
    expect(fan).toBeDefined()
    const byYear = fan!.byYear

    // yearsFromNow 0..12 (anchor + 12 fixed-horizon years).
    expect(byYear).toHaveLength(13)
    expect(byYear.map((y) => y.yearsFromNow)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])

    // The hand-computed value at each x-grid point: 1000 (today) → 900…100 → $0 at the depletion
    // year (yearsFromNow 10 = end of sim-year 9) → $0 alive-but-broke (years 11, 12).
    const expected = [1000, 900, 800, 700, 600, 500, 400, 300, 200, 100, 0, 0, 0]
    expect(byYear.map((y) => y.p50)).toEqual(expected)

    // Every path is identical ⇒ the band collapses to a line: all percentiles equal p50.
    for (const y of byYear) {
      expect(y.p10).toBe(y.p50)
      expect(y.p25).toBe(y.p50)
      expect(y.p75).toBe(y.p50)
      expect(y.p90).toBe(y.p50)
      expect(y.cohortFraction).toBe(1) // fixed-horizon: nobody dies, the cohort never thins
    }

    // The headline agrees: every path depletes at year 9, so nobody survives.
    expect(d.depletionYears.every((dy) => dy === 9)).toBe(true)
    expect(d.survivalFraction).toBe(0)
    expect(d.terminalValuesReal.every((v) => v === 0)).toBe(true)
  })
})

// ---------------------------------------------------------------------------------------
// 4. Reduce-to-spine byte-identity — the fan is a PURE OBSERVATION. A fan-on run must be
//    byte-identical to a fan-off run on every non-fan field, on BOTH the spine and the
//    (product) overlay path, under realistic sampled longevity + volatility.
// ---------------------------------------------------------------------------------------
const MALE_60: PersonInputs = {
  sex: 'male',
  currentAge: 60,
  birthYear: 1966,
  retirementAge: 60,
  earnedIncomeReal: 0,
  pia: 0,
  socialSecurityClaimAge: 67,
}
const FEMALE_58: PersonInputs = { ...MALE_60, sex: 'female', currentAge: 58, birthYear: 1968 }

const realParams = (over: Partial<SimulationParams> = {}): SimulationParams => ({
  initialPortfolio: 1_000_000,
  annualSpendingReal: 45_000,
  stockWeight: 0.6,
  people: [MALE_60, FEMALE_58],
  survivorSpendingRatio: 0.75,
  drawdownPolicy: 'proportional',
  market: validationMarket.value,
  paths: 2000,
  maxHorizonYears: 45,
  longevityMode: 'sampled',
  ...over,
})

const overlayFor = (): OverlayParams => ({
  taxEnabled: true,
  rmdEnabled: true,
  startCalendarYear: 2026,
  filing: 'mfj',
  buckets: { taxable: 400_000, pretax: 500_000, roth: 100_000 },
  initialTaxableBasis: 300_000,
})

describe('reduce-to-spine byte-identity (the fan only observes; it never perturbs)', () => {
  it('SPINE: fan-on ≡ fan-off on terminalValuesReal / depletionYears / survivalFraction', () => {
    const p = realParams()
    const off = dist(simulate(p, 777))
    const on = dist(simulate(p, 777, { bandFan: true }))

    expect(off.bandFan).toBeUndefined()
    expect(on.bandFan).toBeDefined()
    expect(on.terminalValuesReal).toEqual(off.terminalValuesReal)
    expect(on.depletionYears).toEqual(off.depletionYears)
    expect(on.survivalFraction).toBe(off.survivalFraction)
  })

  it('OVERLAY (the product path): fan-on ≡ fan-off, including the taxAware solver surface', () => {
    const p = realParams({ overlay: overlayFor() })
    const off = dist(simulate(p, 4242))
    const on = dist(simulate(p, 4242, { bandFan: true }))

    expect(off.bandFan).toBeUndefined()
    expect(on.bandFan).toBeDefined()
    expect(on.terminalValuesReal).toEqual(off.terminalValuesReal)
    expect(on.depletionYears).toEqual(off.depletionYears)
    expect(on.survivalFraction).toBe(off.survivalFraction)
    expect(on.taxAware).toEqual(off.taxAware)
  })
})

// ---------------------------------------------------------------------------------------
// 5. Structural honesty under realistic sampled longevity (the properties the cardinal rule
//    rests on; not byte-derivable, but invariant for every valid run).
// ---------------------------------------------------------------------------------------
describe('structural honesty of the realistic fan', () => {
  it('the anchor is today=initialPortfolio, percentiles stay ordered, cohort thins monotonically', () => {
    const d = dist(simulate(realParams({ overlay: overlayFor() }), 99, { bandFan: true }))
    const byYear = d.bandFan!.byYear

    expect(byYear[0]?.yearsFromNow).toBe(0)
    expect(byYear[0]?.p50).toBe(1_000_000)
    expect(byYear[0]?.cohortFraction).toBe(1)

    let prevYears = -1
    let prevCohort = Infinity
    for (const y of byYear) {
      // x is strictly increasing from today.
      expect(y.yearsFromNow).toBeGreaterThan(prevYears)
      prevYears = y.yearsFromNow
      // The fan is ordered and non-negative every year (p90 ≥ … ≥ p10 ≥ 0 — never inverted).
      expect(y.p10).toBeGreaterThanOrEqual(0)
      expect(y.p10).toBeLessThanOrEqual(y.p25)
      expect(y.p25).toBeLessThanOrEqual(y.p50)
      expect(y.p50).toBeLessThanOrEqual(y.p75)
      expect(y.p75).toBeLessThanOrEqual(y.p90)
      // Cohort fraction is in (0,1] and monotone non-increasing (couples only ever die).
      expect(y.cohortFraction).toBeGreaterThan(0)
      expect(y.cohortFraction).toBeLessThanOrEqual(1)
      expect(y.cohortFraction).toBeLessThanOrEqual(prevCohort + 1e-12)
      prevCohort = y.cohortFraction
    }
    // The sampled couple does die within the 45-year window ⇒ the cohort genuinely thins.
    expect(byYear[byYear.length - 1]!.cohortFraction).toBeLessThan(1)
  })

  it('RUIN reaches the band: a high-spend household shows a $0 low edge (the floor is honest)', () => {
    // 18% of a $1M portfolio — most futures deplete, so the low percentile must touch $0.
    const d = dist(simulate(realParams({ annualSpendingReal: 180_000, overlay: overlayFor() }), 55, { bandFan: true }))
    const byYear = d.bandFan!.byYear
    expect(byYear.some((y) => y.p10 === 0)).toBe(true)
  })

  it('OVER-FUNDED: a low-spend household keeps a positive median to the end (no false ruin)', () => {
    // 1.5% of $1M — the money never runs out; the band stays off the $0 floor at the median.
    const d = dist(simulate(realParams({ annualSpendingReal: 15_000, overlay: overlayFor() }), 321, { bandFan: true }))
    const byYear = d.bandFan!.byYear
    expect(byYear[byYear.length - 1]!.p50).toBeGreaterThan(0)
  })
})
