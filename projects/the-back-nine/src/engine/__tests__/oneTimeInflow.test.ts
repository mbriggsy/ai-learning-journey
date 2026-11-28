/**
 * Gap 5's U2 (`docs/plans/features/one-time-money-in-build-spec.md`): one-time money in, an inheritance or gift
 * credited to the taxable account at the END of its calendar year at full cost basis, through build 2's four
 * year-end sites (KTD3: `stepYear`'s contribution, the basis, the taxable bucket after the growth scale, the
 * knife-edge branch's fresh buckets), on every path still funded and, for a couple's one-person item left to
 * someone else, only while its heir is living (KTD12). Every expected figure is the money itself: it is a plain
 * addend to the taxable bucket, its basis and the total, so the oracle is the item's own dollar amount (DND 012).
 * Each site is checked on its own destination beside the zero deltas of the buckets it must not touch (insight
 * 093's multi-site arm).
 */
import { describe, expect, it } from 'vitest'
import {
  runTaxAwareDecumulation,
  type Household,
  type HouseholdYear,
  type OverlayPerson,
  type TaxOverlayConfig,
  type TaxYearInputs,
} from '@engine/taxOverlay'
import { simulate, steadyFuture, validateParams } from '@engine/simulate'
import { buildCandidateParams } from '@engine/dateSearch'
import { buildDateInput } from '@intake/intakeMap'
import { DEV_SEEDS } from '@ui/devSeeds'
import {
  NEVER_DEPLETED,
  type LedgerLoopRow,
  type OneTimeInflowParams,
  type PersonInputs,
  type SimulationParams,
} from '@shared/model'
import type { AccountBuckets } from '@engine/sequencing'

const START = 2026

// ---------------------------------------------------------------------------------------------------------------
// The overlay's own year loop, on fixed returns.
// ---------------------------------------------------------------------------------------------------------------

const person = (birthYear: number): OverlayPerson => ({ birthYear })
const first = person(1958)
const second = person(1960)
const single: Household = { startCalendarYear: START, filing: 'single', owner: first }
const couple: Household = { startCalendarYear: START, filing: 'mfj', owner: first, spouse: second }
const on = (household: Household): TaxOverlayConfig => ({ taxEnabled: true, rmdEnabled: true, household })

/** Every bucket non-zero, so each one's zero delta is a real check. */
const BUCKETS: AccountBuckets = { taxable: 300_000, pretax: 400_000, roth: 100_000, hsa: 20_000 }

interface Run {
  readonly years: number
  readonly items?: readonly OneTimeInflowParams[]
  readonly household?: Household
  readonly buckets?: AccountBuckets
  readonly net?: number
  readonly inputs?: TaxYearInputs
}

function run(r: Run): { out: ReturnType<typeof runTaxAwareDecumulation>; rows: LedgerLoopRow[] } {
  const rows: LedgerLoopRow[] = []
  const buckets = r.buckets ?? BUCKETS
  const out = runTaxAwareDecumulation(
    buckets,
    new Array<number>(r.years).fill(0.04),
    new Array<number>(r.years).fill(0.02),
    new Array<number>(r.years).fill(r.net ?? 40_000),
    0.6,
    'proportional',
    on(r.household ?? single),
    {
      initialTaxableBasis: buckets.taxable / 2,
      ...((buckets.hsa ?? 0) > 0 ? { hsaOwnerIndex: 0 } : {}),
      ...r.inputs,
      ledgerOut: rows,
      ...(r.items !== undefined ? { oneTimeInflows: r.items } : {}),
    },
  )
  return { out, rows }
}

/** A row with the two one-time fields taken off, to compare against a run that carries none. */
const withoutOneTime = (row: LedgerLoopRow): LedgerLoopRow => {
  const { oneTimeIn: _a, oneTimeInByItem: _b, ...rest } = row
  return rest
}

const gift = (year: number, cashReal: number, over: Partial<OneTimeInflowParams> = {}): OneTimeInflowParams => ({ year, cashReal, ...over })

describe('the year-end credit (AE1; R5, R7, KTD3)', () => {
  const items = [gift(START + 3, 200_000)]

  it('years before the money are untouched: three years run the same with or without a 2029 gift', () => {
    const base = run({ years: 3 })
    const got = run({ years: 3, items })
    expect(got.out).toStrictEqual(base.out)
    expect(got.rows.map(withoutOneTime)).toStrictEqual(base.rows)
    expect(got.rows.map((r) => r.oneTimeIn)).toEqual([0, 0, 0])
    expect(got.rows.map((r) => r.oneTimeInByItem)).toEqual([[0], [0], [0]])
  })

  it('the arrival year: the same draw and tax, and the taxable bucket, its basis and the total each end exactly $200,000 higher', () => {
    const base = run({ years: 4 })
    const got = run({ years: 4, items })
    const [b, g] = [base.rows[3]!, got.rows[3]!]
    expect(g.draw).toStrictEqual(b.draw)
    expect(g.taxPaid).toBe(b.taxPaid)
    expect(g.conversion).toBe(b.conversion)
    expect(g.rmd).toBe(b.rmd)
    expect(g.growthScale).toBe(b.growthScale)
    expect(g.leftOverCredit).toBe(0) // never build 2's field (KTD3's ⚑ NEGATIVE)
    expect(g.contribution).toStrictEqual(b.contribution) // never a deposit
    expect(g.oneTimeIn).toBe(200_000)
    expect(g.oneTimeInByItem).toEqual([200_000])
    // The site deltas (insight 093): taxable and its basis take the money, every other bucket takes $0.
    expect(g.end.taxable - b.end.taxable).toBeCloseTo(200_000, 6)
    expect(got.out.finalTaxableBasis - base.out.finalTaxableBasis).toBeCloseTo(200_000, 6)
    expect(g.end.pretax).toBe(b.end.pretax)
    expect(g.end.roth).toBe(b.end.roth)
    expect(g.end.hsa).toBe(b.end.hsa)
    // `stepYear`'s contribution: the authoritative total.
    expect(got.out.terminalReal - base.out.terminalReal).toBeCloseTo(200_000, 6)
  })

  it('the year after differs: the money is in the taxable bucket at the year’s top and pays its share of the draw', () => {
    const base = run({ years: 5 })
    const got = run({ years: 5, items })
    expect(got.rows[4]!.start.taxable - base.rows[4]!.start.taxable).toBeCloseTo(200_000, 6)
    expect(got.rows[4]!.draw.taxable).toBeGreaterThan(base.rows[4]!.draw.taxable)
    expect(got.rows[4]!.oneTimeIn).toBe(0)
  })

  it('two items in one year sum on the row, each holds its own share, and a third in another year reads 0 there', () => {
    const got = run({ years: 5, items: [gift(START + 2, 30_000), gift(START + 2, 20_000), gift(START + 4, 5_000)] })
    expect(got.rows[2]!.oneTimeIn).toBe(50_000)
    expect(got.rows[2]!.oneTimeInByItem).toEqual([30_000, 20_000, 0])
    expect(got.rows[4]!.oneTimeIn).toBe(5_000)
    expect(got.rows[4]!.oneTimeInByItem).toEqual([0, 0, 5_000])
    const base = run({ years: 3 })
    expect(got.rows[2]!.end.taxable - base.rows[2]!.end.taxable).toBeCloseTo(50_000, 6)
  })

  it('a $0 item (a closed sale’s kept figure, U9) credits nothing and runs the same as none', () => {
    const base = run({ years: 4 })
    const got = run({ years: 4, items: [gift(START + 2, 0)] })
    expect(got.out).toStrictEqual(base.out)
    expect(got.rows[2]!.oneTimeIn).toBe(0)
  })

  it('a run with none writes no one-time key on any row', () => {
    for (const row of run({ years: 3 }).rows) {
      expect('oneTimeIn' in row).toBe(false)
      expect('oneTimeInByItem' in row).toBe(false)
    }
  })
})

describe('a path that runs out (R6)', () => {
  // $50,000 of taxable at full basis and a $40,000 need: year 0 leaves $10,000, so year 1 runs out.
  const thin: AccountBuckets = { taxable: 50_000, pretax: 0, roth: 0 }
  const thinRun = (items?: readonly OneTimeInflowParams[]) =>
    run({ years: 4, buckets: thin, items, inputs: { initialTaxableBasis: 50_000 } })

  it('in the money’s year: the credit is forfeited, the row reads 0 for the total and every item, and the run is the same as with none', () => {
    const base = thinRun()
    expect(base.out.depletionYear).toBe(1)
    const got = thinRun([gift(START + 1, 100_000)])
    expect(got.out).toStrictEqual(base.out)
    const last = got.rows[1]!
    expect(last.ranOut).toBe(true)
    expect(last.oneTimeIn).toBe(0)
    expect(last.oneTimeInByItem).toEqual([0])
  })

  it('before the money’s year: the run never reaches it, so no row names it', () => {
    const got = thinRun([gift(START + 3, 100_000)])
    expect(got.out.depletionYear).toBe(1)
    expect(got.rows).toHaveLength(2)
    expect(got.rows.every((r) => r.oneTimeIn === 0)).toBe(true)
  })
})

describe('THE KNIFE-EDGE (KTD3, site 4): the post-draw ledger reads 0 while stepYear’s state stays positive', () => {
  // build 2's plant (`workingYearCredit.test.ts`): a Roth-only pool T and a stock weight w where w·T + (1 − w)·T lands
  // one float step ABOVE T, with a need of exactly T. The draw takes the whole ledger while stepYear keeps a positive
  // remainder, so it credits the year's inflow into the state and the branch builds fresh buckets holding it.
  let plant: { T: number; w: number } | undefined
  for (const T of [1_000.1, 12_345.67, 99_999.99]) {
    for (const w of [0.3, 0.35, 0.45, 0.55, 0.6, 0.65, 0.7]) {
      if (plant === undefined && w * T + (1 - w) * T > T) plant = { T, w }
    }
  }
  const knife = (items?: readonly OneTimeInflowParams[]) => {
    const { T, w } = plant!
    return runTaxAwareDecumulation({ taxable: 0, pretax: 0, roth: T }, [0.05], [0.02], [T], w, 'pre-tax-first', on(single), {
      ...(items !== undefined ? { oneTimeInflows: items } : {}),
    })
  }

  it('fresh buckets hold the year’s money in taxable at full basis, every other bucket empty', () => {
    expect(plant).toBeDefined()
    const without = knife()
    expect(without.depletionYear).toBe(NEVER_DEPLETED)
    expect(without.finalBuckets.taxable).toBe(0)
    const got = knife([gift(START, 7_000)])
    expect(got.depletionYear).toBe(NEVER_DEPLETED)
    expect(got.finalBuckets.taxable).toBe(7_000)
    expect(got.finalTaxableBasis).toBe(7_000)
    expect(got.finalBuckets.pretax).toBe(0)
    expect(got.finalBuckets.roth).toBe(0)
    expect(got.finalBuckets.hsa ?? 0).toBe(0)
  })
})

describe('the heir rule (AE6; R6, KTD12)', () => {
  // The first person lives through 2028 (sim year 2); from 2029 the second lives on.
  const householdYears: HouseholdYear[] = Array.from({ length: 5 }, (_, t) => ({ living: t < 3 ? [first, second] : [second] }))
  const coupleRun = (items: readonly OneTimeInflowParams[]) => run({ years: 5, household: couple, items, inputs: { householdYears } })

  it('left to someone else: an item the year after its heir’s last year living counts none of it; one in that last year counts it all', () => {
    const got = coupleRun([gift(START + 3, 200_000, { heirIndex: 0, leftTo: 'someone-else' }), gift(START + 2, 150_000, { heirIndex: 0, leftTo: 'someone-else' })])
    expect(got.rows[3]!.oneTimeIn).toBe(0)
    expect(got.rows[3]!.oneTimeInByItem).toEqual([0, 0])
    expect(got.rows[2]!.oneTimeIn).toBe(150_000)
    expect(got.rows[2]!.oneTimeInByItem).toEqual([0, 150_000])
    // Not counted means not credited: 2029's taxable close is the same as a run without the 2029 item.
    const only2028 = coupleRun([gift(START + 3, 0, { heirIndex: 0, leftTo: 'someone-else' }), gift(START + 2, 150_000, { heirIndex: 0, leftTo: 'someone-else' })])
    expect(got.rows[3]!.end).toStrictEqual(only2028.rows[3]!.end)
  })

  it('left to the other member: both years count', () => {
    const got = coupleRun([gift(START + 3, 200_000, { heirIndex: 0, leftTo: 'other-member' }), gift(START + 2, 150_000, { heirIndex: 0, leftTo: 'other-member' })])
    expect(got.rows[3]!.oneTimeIn).toBe(200_000)
    expect(got.rows[2]!.oneTimeIn).toBe(150_000)
  })

  it('an item both people’s counts while either is living, and the living survivor’s own item counts', () => {
    const got = coupleRun([gift(START + 3, 200_000), gift(START + 4, 80_000, { heirIndex: 1, leftTo: 'someone-else' })])
    expect(got.rows[3]!.oneTimeIn).toBe(200_000)
    expect(got.rows[4]!.oneTimeIn).toBe(80_000)
  })
})

describe('the overlay’s backstop (validateParams’ twin, for a direct caller)', () => {
  const throwsOn = (items: readonly OneTimeInflowParams[], household: Household = single) => () =>
    runTaxAwareDecumulation(BUCKETS, [0], [0], [0], 0.6, 'proportional', on(household), { initialTaxableBasis: 150_000, hsaOwnerIndex: 0, oneTimeInflows: items })

  it('refuses one-time money with tax off', () => {
    expect(() =>
      runTaxAwareDecumulation({ taxable: 1, pretax: 0, roth: 0 }, [0], [0], [0], 0.6, 'proportional', { taxEnabled: false, rmdEnabled: false }, { oneTimeInflows: [gift(START, 1)] }),
    ).toThrow(/one-time money needs tax on/)
  })

  it('refuses an empty list, a non-finite or negative amount, a year that is not a whole year from the first, and heir fields that do not fit', () => {
    expect(throwsOn([])).toThrow(/never an empty list/)
    expect(throwsOn([gift(START, Number.NaN)])).toThrow(/finite and at least 0/)
    expect(throwsOn([gift(START, -1)])).toThrow(/finite and at least 0/)
    expect(throwsOn([gift(START - 1, 1)])).toThrow(/a whole calendar year from 2026 on/)
    expect(throwsOn([gift(START + 0.5, 1)])).toThrow(/a whole calendar year from 2026 on/)
    expect(throwsOn([gift(START, 1, { heirIndex: 0, leftTo: 'someone-else' })])).toThrow(/for a couple only/)
    expect(throwsOn([gift(START, 1, { heirIndex: 0 })], couple)).toThrow(/ride together/)
    expect(throwsOn([gift(START, 1, { heirIndex: 2, leftTo: 'someone-else' })], couple)).toThrow(/not one of the household’s people/)
    expect(throwsOn([gift(START, 1, { heirIndex: 0, leftTo: 'nobody' as 'someone-else' })], couple)).toThrow(/leftTo/)
  })
})

// ---------------------------------------------------------------------------------------------------------------
// Through `simulate`: the R19 arm, the date route, and KTD3's measure.
// ---------------------------------------------------------------------------------------------------------------

const inputs = (sex: PersonInputs['sex'], currentAge: number): PersonInputs => ({
  sex,
  currentAge,
  birthYear: START - currentAge,
  retirementAge: currentAge,
  earnedIncomeReal: 0,
  pia: 0,
  socialSecurityClaimAge: 70,
})

const MARKET: SimulationParams['market'] = {
  stock: { mean: 0.05, stdDev: 0.16 },
  bond: { mean: 0.02, stdDev: 0.06 },
  inflation: { mean: 0, stdDev: 0 },
  stockBondCorrelation: 0.1,
  space: 'simple',
  returnsAreReal: true,
}

/** A retired couple, every bucket at full basis except a little gain. */
const retired = (over: { items?: readonly OneTimeInflowParams[]; people?: PersonInputs[]; paths?: number; spend?: number; taxEnabled?: boolean; portfolio?: number } = {}): SimulationParams => {
  const total = over.portfolio ?? 650_000
  const taxable = Math.round(total * 0.4)
  const pretax = total - taxable
  const people = over.people ?? [inputs('male', 66), inputs('female', 64)]
  return {
    initialPortfolio: total,
    annualSpendingReal: over.spend ?? 40_000,
    stockWeight: 0.6,
    people,
    survivorSpendingRatio: 0.75,
    drawdownPolicy: 'taxable-first',
    market: MARKET,
    paths: over.paths ?? 1,
    maxHorizonYears: 35,
    longevityMode: 'sampled',
    overlay: {
      taxEnabled: over.taxEnabled ?? true,
      rmdEnabled: true,
      startCalendarYear: START,
      buckets: { taxable, pretax, roth: 0 },
      ...(people.length > 1 ? { pretaxByPerson: [Math.round(pretax * 0.6), pretax - Math.round(pretax * 0.6)] } : {}),
      initialTaxableBasis: Math.round(taxable * 0.8),
      filing: people.length > 1 ? 'mfj' : 'single',
      ...(over.items !== undefined ? { oneTimeInflows: over.items } : {}),
    },
  }
}

describe('the R19 arm (validateParams; KTD1, KTD2, KTD12)', () => {
  const refusal = (items: unknown, over: Parameters<typeof retired>[0] = {}) =>
    validateParams(retired({ ...over, items: items as readonly OneTimeInflowParams[] }))
  const LAST = START + 35 - 1

  it('admits an item in the plan’s first year and one in its last horizon year', () => {
    expect(refusal([gift(START, 100_000)])).toBeNull()
    expect(refusal([gift(LAST, 100_000)])).toBeNull()
    expect(refusal([gift(START + 4, 100_000, { heirIndex: 1, leftTo: 'other-member' })])).toBeNull()
  })

  it('refuses each malformed shape by name, never a TypeError past the arm', () => {
    expect(refusal('nope')).toMatch(/oneTimeInflows must be a list/)
    expect(refusal([])).toMatch(/oneTimeInflows must be absent/)
    expect(refusal([null])).toMatch(/oneTimeInflows\[0\] shape invalid/)
    expect(refusal([gift(START - 1, 1)])).toMatch(/oneTimeInflows\[0\] year must be a calendar year from 2026 to 2060/)
    expect(refusal([gift(LAST + 1, 1)])).toMatch(/oneTimeInflows\[0\] year must be a calendar year from 2026 to 2060/)
    expect(refusal([gift(START + 1.5, 1)])).toMatch(/year must be a calendar year/)
    expect(refusal([gift(START, Number.NaN)])).toMatch(/oneTimeInflows\[0\] cashReal invalid/)
    expect(refusal([gift(START, -5)])).toMatch(/cashReal invalid/)
    expect(refusal([gift(START, 1e15)])).toMatch(/cashReal invalid/)
    expect(refusal([gift(START, 1, { heirIndex: 0 })])).toMatch(/heirIndex and leftTo ride together/)
    expect(refusal([gift(START, 1, { leftTo: 'other-member' })])).toMatch(/heirIndex and leftTo ride together/)
    expect(refusal([gift(START, 1, { heirIndex: 2, leftTo: 'other-member' })])).toMatch(/heirIndex invalid/)
    expect(refusal([gift(START, 1, { heirIndex: 0, leftTo: 'nobody' as 'other-member' })])).toMatch(/leftTo invalid/)
    expect(refusal([gift(START, 1, { heirIndex: 0, leftTo: 'other-member' })], { people: [inputs('female', 66)] })).toMatch(/for a couple only/)
    expect(refusal([gift(START, 1)], { taxEnabled: false })).toMatch(/oneTimeInflows need taxEnabled/)
  })
})

describe('the date route (AE5; KTD1)', () => {
  it('every tested stop credits the same calendar year, in a working year and in a retired one', () => {
    const d = DEV_SEEDS.date
    const input = buildDateInput(d)
    if (input === null) throw new Error('date: the seed builds a date input')
    const overlay = input.params.overlay!
    const year = overlay.startCalendarYear + 4
    const items = [gift(year, 250_000)]
    const withItem = { ...input, params: { ...input.params, overlay: { ...overlay, oneTimeInflows: items } } }
    for (const offset of [2, 7]) {
      const params = buildCandidateParams(withItem, offset, 1)
      expect(params.overlay?.oneTimeInflows, `offset ${offset}`).toStrictEqual(items)
      const out = simulate(params, d.seed!, { namedFuture: steadyFuture(params), ledgerRows: true })
      if (out.indeterminate || out.infeasible) throw new Error(`offset ${offset}: ${JSON.stringify(out)}`)
      const rows = out.distribution.ledgerRows!
      expect(rows.filter((r) => (r.oneTimeIn ?? 0) > 0).map((r) => r.t), `offset ${offset}`).toEqual([4])
      // In a working year (offset 7) the money stays out of the deposits: build 2's credit and the contribution
      // lines are the same as the run without it (KTD3's ⚑ NEGATIVE: never `contributionTotal`).
      const none = simulate(buildCandidateParams(input, offset, 1), d.seed!, { namedFuture: steadyFuture(params), ledgerRows: true })
      if (none.indeterminate || none.infeasible) throw new Error('no-item run did not resolve')
      expect(rows[4]!.contribution).toStrictEqual(none.distribution.ledgerRows![4]!.contribution)
      expect(rows[4]!.leftOverCredit).toBe(none.distribution.ledgerRows![4]!.leftOverCredit)
    }
  })
})

describe('KTD3’s measure, the gift half: the year-end credit against money that arrives at an unknown point in its year', () => {
  // KTD3 as reopened (2026-11-28, b9-3; the plan's KTD3 has the record): the household gives the year, never the date,
  // so the yardstick is money arriving at an unknown point in the year, stood in for by half at the year's start and
  // half at its end (the same average exposure to the year's return, and half the money there for the year's bills).
  // Neither arm needs new engine code: money dated a calendar year earlier lands after that year's growth, which is
  // the start of the original year. The fixture is a thin retired couple, $650,000 against $55,000 a year, so 4 in 10
  // paths without the money run out within three years either side of its year, and the gift is $400,000.
  // Rosy flips (paths that last only under the year-end credit) reopen KTD3 past 1 in 100 of the paths, and the share
  // of paths that last must not be higher under year end; gloomy flips are recorded, never the sin. The January-1
  // bracket (all of it at the year's start), the plan's first yardstick, is checked for direction only.
  const PATHS = 2_000
  const SEED = 20261128
  const Y = START + 10
  const AMOUNT = 400_000
  const SPEND = 55_000

  it('rosy flips stay at or under 1 in 100 of the paths, and the share that lasts is no higher than with the money spread over its year', { timeout: 120_000 }, () => {
    const depletions = (items?: readonly OneTimeInflowParams[]) => {
      const out = simulate(retired({ items, paths: PATHS, spend: SPEND }), SEED)
      if (out.indeterminate || out.infeasible) throw new Error(`thin run did not resolve: ${JSON.stringify(out)}`)
      return out.distribution.depletionYears
    }
    const none = depletions()
    const yearEnd = depletions([gift(Y, AMOUNT)])
    const spread = depletions([gift(Y - 1, AMOUNT / 2), gift(Y, AMOUNT / 2)])
    const january = depletions([gift(Y - 1, AMOUNT)])
    const t = Y - START
    const near = none.filter((d) => d !== NEVER_DEPLETED && d >= t - 3 && d <= t + 3).length
    expect(near / PATHS, '[test setup] paths running out near the money’s year').toBeGreaterThan(0.3)
    const lasts = (d: number | undefined) => d === NEVER_DEPLETED
    const flips = (other: readonly number[]) => {
      let rosy = 0
      let gloomy = 0
      for (let p = 0; p < PATHS; p++) {
        if (lasts(yearEnd[p]) && !lasts(other[p])) rosy++
        if (!lasts(yearEnd[p]) && lasts(other[p])) gloomy++
      }
      return { rosy, gloomy }
    }
    const lasting = (d: readonly number[]) => d.filter(lasts).length
    const vsSpread = flips(spread)
    const vsJanuary = flips(january)
    // Measured 2026-11-28 at this seed: vs the spread rosy 12, gloomy 59; vs January 1 rosy 20, gloomy 93; lasting
    // 986 under year end, 1,033 spread, 1,059 at January 1 (248 without the money). U6's register entry carries them.
    expect(vsSpread.rosy).toBeLessThanOrEqual(PATHS / 100)
    expect(vsSpread.gloomy).toBeGreaterThan(vsSpread.rosy)
    expect(lasting(yearEnd)).toBeLessThanOrEqual(lasting(spread))
    expect(lasting(spread)).toBeLessThanOrEqual(lasting(january))
    expect(vsJanuary.gloomy).toBeGreaterThan(vsJanuary.rosy)
  })
})
