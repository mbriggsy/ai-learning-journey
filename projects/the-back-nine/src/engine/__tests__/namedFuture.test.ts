/**
 * One named future through `simulate` — the year-by-year table's run (docs/plans/rightcapital-map.md;
 * workbench plan U2, KTD1/KTD2/KTD4). The option feeds one caller-named path through the whole shipped
 * machinery: steady is every market score 0, the lifespans are the couple's middle years, and an
 * ordinary run's own draws fed back through it reproduce that run's bytes.
 */
import { describe, expect, it } from 'vitest'
import type { NamedFuture, PersonInputs, SimulationParams } from '@shared/model'
import { buildDraws, simulate, steadyFuture, validateNamedFuture } from '@engine/simulate'
import {
  coupleSurvivalToYear,
  middleLifespanScores,
  sampleCouplePath,
  sampleDeathYearOffset,
  type LongevityPerson,
} from '@engine/longevity'

const person = (sex: PersonInputs['sex'], currentAge: number): PersonInputs => ({
  sex,
  currentAge,
  birthYear: 2026 - currentAge,
  retirementAge: currentAge,
  earnedIncomeReal: 0,
  pia: 0,
  socialSecurityClaimAge: 70,
})

/** A spine world: no overlay, so the only moving part is the market. */
const spine = (over: Partial<SimulationParams> = {}): SimulationParams => ({
  initialPortfolio: 1_000_000,
  annualSpendingReal: 0,
  stockWeight: 0.6,
  people: [person('female', 65)],
  survivorSpendingRatio: 0.75,
  drawdownPolicy: 'proportional',
  market: {
    stock: { mean: 0.05, stdDev: 0.16 },
    bond: { mean: 0.02, stdDev: 0.06 },
    inflation: { mean: 0, stdDev: 0 },
    stockBondCorrelation: 0.2,
    space: 'simple',
    returnsAreReal: true,
  },
  paths: 1,
  maxHorizonYears: 12,
  longevityMode: 'fixed-horizon',
  ...over,
})

/** A tax-and-RMD world with sampled lifespans, so the byte-identity arm crosses the overlay and the
 *  longevity draw as well as the market. */
const overlayWorld = (paths: number): SimulationParams =>
  spine({
    initialPortfolio: 900_000,
    annualSpendingReal: 55_000,
    stockWeight: 0.5,
    people: [person('male', 66), person('female', 63)],
    drawdownPolicy: 'taxable-first',
    paths,
    maxHorizonYears: 40,
    longevityMode: 'sampled',
    overlay: {
      taxEnabled: true,
      rmdEnabled: true,
      startCalendarYear: 2026,
      buckets: { taxable: 300_000, pretax: 500_000, roth: 100_000 },
      initialTaxableBasis: 220_000,
      filing: 'mfj',
    },
  })

const resolved = (out: ReturnType<typeof simulate>) => {
  if (out.indeterminate || out.infeasible) throw new Error(`run did not resolve: ${JSON.stringify(out)}`)
  return out.distribution
}

describe('the steady future', () => {
  it('grows a no-spend, no-tax portfolio at each asset’s middle return, compounded by hand', () => {
    const params = spine()
    const dist = resolved(simulate(params, 1, { namedFuture: steadyFuture(params) }))
    // Hand derivation, independent of the engine's toLogMoments: the median of a lognormal whose simple
    // return has mean m and stdDev s is (1 + m) / sqrt(1 + s² / (1 + m)²); correlation leaves a zero
    // bond score at zero; the blend rebalances each year.
    const median = (m: number, s: number) => (1 + m) / Math.sqrt(1 + (s * s) / ((1 + m) * (1 + m)))
    const growth = 0.6 * median(0.05, 0.16) + 0.4 * median(0.02, 0.06)
    const expected = 1_000_000 * growth ** 12
    expect(dist.terminalValuesReal).toHaveLength(1)
    expect(dist.terminalValuesReal[0]).toBeCloseTo(expected, 6)
  })

  it('is every market score 0 for every year of the horizon', () => {
    const future = steadyFuture(spine())
    expect(future.stockZ).toEqual(new Array(12).fill(0))
    expect(future.bondZ).toEqual(new Array(12).fill(0))
  })
})

describe('an ordinary run’s own draws, named', () => {
  it('reproduce that run’s bytes through the overlay and the sampled lifespans', () => {
    const params = overlayWorld(1)
    for (const seed of [7, 20261122, 4_000_000_001 | 0]) {
      const d = buildDraws(seed, 1, params.maxHorizonYears, params.people.length)
      const named: NamedFuture = { stockZ: d.stockZ[0]!, bondZ: d.bondZ[0]!, longevityU: d.longevityU[0]! }
      const opts = { bandFan: true, survivorConditioned: true } as const
      expect(simulate(params, seed, { ...opts, namedFuture: named })).toStrictEqual(simulate(params, seed, opts))
    }
  })

  it('leaves a run without the option untouched (the option absent is the run as before)', () => {
    const params = overlayWorld(400)
    expect(simulate(params, 99, { namedFuture: undefined })).toStrictEqual(simulate(params, 99))
  })
})

describe('the gate refuses a bad named future with a named reason', () => {
  const params = spine()
  const good = steadyFuture(params)
  const cases: readonly [string, NamedFuture, SimulationParams, RegExp][] = [
    ['a market list one year short', { ...good, stockZ: good.stockZ.slice(1) }, params, /stockZ has 11 years \(the run has 12\)/],
    ['a bond list one year long', { ...good, bondZ: [...good.bondZ, 0] }, params, /bondZ has 13 years/],
    ['a non-finite market score', { ...good, bondZ: good.bondZ.map((z, t) => (t === 3 ? Number.NaN : z)) }, params, /bondZ holds a non-finite score/],
    ['an infinite lifespan score', { ...good, longevityU: [Number.POSITIVE_INFINITY] }, params, /longevityU holds a non-finite score/],
    ['a lifespan score above 1', { ...good, longevityU: [1.0001] }, params, /outside 0 to 1/],
    ['a lifespan score below 0', { ...good, longevityU: [-0.01] }, params, /outside 0 to 1/],
    ['a lifespan list one person short', { ...good, longevityU: [] }, params, /longevityU has 0 scores \(the run has 1 people\)/],
    ['a run of more than one path', good, spine({ paths: 2 }), /runs one path \(paths = 2\)/],
  ]
  for (const [name, future, run, reason] of cases) {
    it(`refuses ${name}`, () => {
      expect(validateNamedFuture(future, run)).toMatch(reason)
      const out = simulate(run, 1, { namedFuture: future })
      expect(out.indeterminate).toBe(true)
      expect(out.indeterminate && out.reason).toMatch(reason)
    })
  }

  it('accepts the edges 0 and 1 for a lifespan score', () => {
    expect(validateNamedFuture({ ...good, longevityU: [0] }, params)).toBeNull()
    expect(validateNamedFuture({ ...good, longevityU: [1] }, params)).toBeNull()
  })

  it('refuses riding beside the harness-only draw seam', () => {
    const d = buildDraws(1, 1, params.maxHorizonYears, 1)
    const out = simulate(params, 1, { namedFuture: good, _injectedDraws: d })
    expect(out.indeterminate && out.reason).toMatch(/cannot ride together/)
  })
})

describe('the middle lifespans (KTD4)', () => {
  /** The couple's middle last year, found by its own walk down the last-survivor curve. */
  const coupleMiddle = (a: LongevityPerson, b: LongevityPerson): number => {
    let y = 1
    while (coupleSurvivalToYear(a, b, y) > 0.5) y++
    return y
  }

  it('puts the first death at that person’s own middle year and the survivor at the couple’s middle last year', () => {
    const him: LongevityPerson = { sex: 'male', currentAge: 66 }
    const her: LongevityPerson = { sex: 'female', currentAge: 63 }
    const path = sampleCouplePath([him, her], middleLifespanScores([him, her]))
    expect(path.firstToDieIndex).toBe(0)
    expect(path.deathYearOffsets[0]).toBe(sampleDeathYearOffset(him, 0.5))
    expect(path.survivorIndex).toBe(1)
    expect(path.lastDeathYear).toBe(coupleMiddle(him, her))
    // the couple outlive either one's own middle year
    expect(path.lastDeathYear).toBeGreaterThan(sampleDeathYearOffset(her, 0.5))
  })

  it('lets the second-listed person die first when their own middle year is the earlier one', () => {
    const her: LongevityPerson = { sex: 'female', currentAge: 60 }
    const him: LongevityPerson = { sex: 'male', currentAge: 70 }
    const path = sampleCouplePath([her, him], middleLifespanScores([her, him]))
    expect(path.firstToDieIndex).toBe(1)
    expect(path.deathYearOffsets[1]).toBe(sampleDeathYearOffset(him, 0.5))
    expect(path.survivorIndex).toBe(0)
    expect(path.deathYearOffsets[0]).toBe(coupleMiddle(her, him))
  })

  it('keeps a survivor phase when the two own middle years tie, with the first person surviving', () => {
    const twin: LongevityPerson = { sex: 'female', currentAge: 64 }
    const path = sampleCouplePath([twin, twin], middleLifespanScores([twin, twin]))
    expect(path.survivorIndex).toBe(0)
    expect(path.deathYearOffsets[1]).toBe(sampleDeathYearOffset(twin, 0.5))
    expect(path.deathYearOffsets[0]).toBe(coupleMiddle(twin, twin))
    expect(path.firstDeathYear).toBeLessThan(path.lastDeathYear)
  })

  it('ends a one-person plan at that person’s own middle year', () => {
    const solo: LongevityPerson = { sex: 'male', currentAge: 67 }
    expect(middleLifespanScores([solo])).toEqual([0.5])
    expect(sampleCouplePath([solo], middleLifespanScores([solo])).lastDeathYear).toBe(sampleDeathYearOffset(solo, 0.5))
  })

  it('runs the steady future to the couple’s middle last year through simulate', () => {
    const params = overlayWorld(1)
    const fan = resolved(simulate(params, 3, { namedFuture: steadyFuture(params), bandFan: true })).bandFan
    const [him, her] = params.people as [PersonInputs, PersonInputs]
    const last = coupleMiddle({ sex: him.sex, currentAge: him.currentAge }, { sex: her.sex, currentAge: her.currentAge })
    expect(last).toBeLessThan(params.maxHorizonYears) // the horizon is not what ends the fan
    expect(fan?.byYear.at(-1)?.yearsFromNow).toBe(last)
  })
})
