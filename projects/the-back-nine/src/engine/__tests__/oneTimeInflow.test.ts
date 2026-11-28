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
  type HealthYearSink,
  type Household,
  type HouseholdYear,
  type OverlayPerson,
  type TaxOverlayConfig,
  type TaxYearInputs,
} from '@engine/taxOverlay'
import { simulate, steadyFuture, validateParams, ENGINE_MAX_DOLLAR } from '@engine/simulate'
import { buildCandidateParams, runDateSearch, DATE_OFFSET_WINDOW_TOP } from '@engine/dateSearch'
import { committedIncomeForYear, deriveConversionAnchor } from '@engine/solver/solveAnchor'
import { anchoredConversionAmounts } from '@engine/solver/candidates'
import {
  age65AdditionMFJ,
  capitalGainsBreakpoints,
  ordinaryBracketsMFJ,
  ordinaryBracketsSingle,
  seniorBonus,
  ssProvisionalThresholds,
  standardDeductionMFJ,
  standardDeductionSingle,
  stateRateForYear,
  type OrdinaryBracket,
} from '@engine/constants'
import { cumulativePriceIndex } from '@engine/priceIndex'
import { buildDateInput } from '@intake/intakeMap'
import { DEV_SEEDS } from '@ui/devSeeds'
import {
  NEVER_DEPLETED,
  type FilingStatus,
  type HomeSaleGainInput,
  type LedgerLoopRow,
  type MarketAssumptions,
  type OneTimeInflowParams,
  type PersonInputs,
  type RetirementState,
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

  // The gift half's review, round 1: every value check above ran a year with build 2's credit at $0, so a site that
  // took the gift IN PLACE OF the left-over credit (`total > 0 ? total : creditThisYear`) passed. Here both land in one
  // working year: the year's taxable account ends exactly the gift higher, the other buckets unmoved (insight 093).
  it('a working year that also saves its left over credits both: the taxable account ends exactly the gift higher', () => {
    const d = DEV_SEEDS.datesaved
    const input = buildDateInput(d)
    if (input === null) throw new Error('datesaved: the seed builds a date input')
    const overlay = input.params.overlay!
    const items = [gift(overlay.startCalendarYear + 4, 250_000)]
    const withItem = { ...input, params: { ...input.params, overlay: { ...overlay, oneTimeInflows: items } } }
    const rowsOf = (i: typeof input) => {
      const params = buildCandidateParams(i, 9, 1)
      const out = simulate(params, d.seed!, { namedFuture: steadyFuture(params), ledgerRows: true })
      if (out.indeterminate || out.infeasible) throw new Error(`datesaved at 9: ${JSON.stringify(out)}`)
      return out.distribution.ledgerRows!
    }
    const [mine, none] = [rowsOf(withItem)[4]!, rowsOf(input)[4]!]
    expect(none.leftOverCredit, '[test setup] the year saves a left over').toBeGreaterThan(0)
    expect(mine.leftOverCredit).toBe(none.leftOverCredit)
    expect(mine.oneTimeIn).toBe(250_000)
    expect(mine.end.taxable - none.end.taxable).toBeCloseTo(250_000, 6)
    for (const k of ['pretax', 'roth', 'hsa'] as const) expect(mine.end[k], k).toBe(none.end[k])
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

// ===============================================================================================================
// Gap 5's U9: a home sale's taxed slice charged in its year (KTD3's sale half, KTD6 to KTD8).
// ===============================================================================================================
//
// EXTERNALLY DERIVED (DND 012, insight 137): every expected tax below is worked by the IRS's own worksheets, written out
// line by line in this file — Form 1040's Social Security Benefits Worksheet (Pub 915 Worksheet 1) and its Qualified
// Dividends and Capital Gain Tax Worksheet — on the canonical constants READ from the table (Rev. Proc. 2025-32's 2026
// brackets, standard deduction and 0 %/15 % breakpoints; §86's base amounts in the year's real dollars), and Pub 523 for
// the gain. Never the engine's own tax functions. Each run funds its year from a Roth bucket alone, so the year's draw
// carries no tax of its own and the year's tax is the worksheet's figure on the fixed incomes exactly.

/** The 2026 Tax Table / Tax Computation Worksheet: each band's rate on the income inside it. */
const bracketTax = (taxable: number, brackets: readonly OrdinaryBracket[]): number => {
  let tax = 0
  let floor = 0
  for (const b of brackets) {
    const top = b.upTo === null ? taxable : Math.min(taxable, b.upTo)
    if (top > floor) tax += (top - floor) * b.rate
    if (b.upTo === null || taxable <= b.upTo) break
    floor = b.upTo
  }
  return tax
}

/** Form 1040's Social Security Benefits Worksheet, lines 1–18, in the year's real dollars (the statute's base amounts
 *  carry no indexing clause, so each is the nominal figure over the year's price level). `other` is line 3: every other
 *  income in AGI, a long-term gain included. */
const ssWorksheet = (benefit: number, other: number, filing: FilingStatus, year: number): number => {
  if (benefit <= 0) return 0
  const nominal = filing === 'mfj' ? ssProvisionalThresholds.value.mfj : ssProvisionalThresholds.value.single
  const level = cumulativePriceIndex(year)
  const line2 = benefit / 2
  const line6 = line2 + other // lines 4–6 (no exclusions, no adjustments)
  const line7 = nominal.fiftyPctOver / level
  if (line6 <= line7) return 0
  const line8 = line6 - line7
  const line9 = (nominal.eightyFivePctOver - nominal.fiftyPctOver) / level
  const line10 = Math.max(0, line8 - line9)
  const line11 = Math.min(line8, line9)
  const line13 = Math.min(line2, line11 / 2)
  const line15 = line13 + line10 * 0.85
  return Math.min(line15, benefit * 0.85) // lines 16–18
}

/** One year's federal tax by the worksheets, for a household with no one 65 or over (the deduction is the standard one
 *  alone, no senior bonus): the SS worksheet, then the Qualified Dividends and Capital Gain Tax Worksheet, lines 1–25. */
const federalByWorksheet = (ordinary: number, gain: number, ss: number, filing: FilingStatus, year: number) => {
  const ssTaxable = ssWorksheet(ss, ordinary + gain, filing, year)
  const deduction = filing === 'mfj' ? standardDeductionMFJ.value : standardDeductionSingle.value
  const brackets = filing === 'mfj' ? ordinaryBracketsMFJ.value : ordinaryBracketsSingle.value
  const bp = filing === 'mfj' ? capitalGainsBreakpoints.value.mfj : capitalGainsBreakpoints.value.single
  const line1 = Math.max(0, ordinary + ssTaxable + gain - deduction) // taxable income
  const line4 = gain
  const line5 = Math.max(0, line1 - line4)
  const line7 = Math.min(line1, bp.zeroRateUpTo)
  const line8 = Math.min(line5, line7)
  const line9 = line7 - line8 // taxed at 0 %
  const line10 = Math.min(line1, line4)
  const line12 = line10 - line9
  const line14 = Math.min(line1, bp.fifteenRateUpTo)
  const line16 = Math.max(0, line14 - (line5 + line9))
  const line17 = Math.min(line12, line16)
  const line20 = line10 - (line9 + line17)
  const line23 = line17 * 0.15 + line20 * 0.2 + bracketTax(line5, brackets)
  const line24 = bracketTax(line1, brackets)
  return { tax: Math.min(line23, line24), ssTaxable }
}

const P62 = person(1964) // 62 in 2026
const P60 = person(1966) // 60 in 2026
const under65Couple = (retirementState?: RetirementState): Household => ({
  startCalendarYear: START,
  filing: 'mfj',
  owner: P62,
  spouse: P60,
  ...(retirementState !== undefined ? { retirementState } : {}),
})
const saleFigures = (over: Partial<HomeSaleGainInput> = {}): HomeSaleGainInput => ({
  soldForReal: 900_000,
  paidDollars: 300_000,
  excludable: true,
  deflator: 1,
  ...over,
})
const sale = (year: number, cashReal: number, over: Partial<HomeSaleGainInput> = {}): OneTimeInflowParams => ({
  year,
  cashReal,
  homeSale: saleFigures(over),
})

interface SaleRun {
  readonly years: number
  readonly items?: readonly OneTimeInflowParams[]
  readonly household?: Household
  readonly ongoing?: number
  readonly ss?: number
  readonly net?: number
  readonly inputs?: TaxYearInputs
}
/** A Roth-funded run at zero returns: the year's ordinary income is `ongoing` (a pension's taxable part) and Social
 *  Security, both fixed, so the year's tax is the worksheet's on them and the sale. */
function saleRun(r: SaleRun) {
  const rows: LedgerLoopRow[] = []
  const healthOut: HealthYearSink = {
    acaNetPremium: [], medicareBase: [], irmaaSurcharge: [], medicareExtras: [], medicareEnrolled: [], acaMagi: [], irmaaMagi: [], ssBenefit: [], acaCliffState: [],
  }
  const out = runTaxAwareDecumulation(
    { taxable: 0, pretax: 0, roth: 5_000_000 },
    new Array<number>(r.years).fill(0),
    new Array<number>(r.years).fill(0),
    new Array<number>(r.years).fill(r.net ?? 40_000),
    0.6,
    'proportional',
    on(r.household ?? under65Couple()),
    {
      ongoingTaxableGrossUp: new Array<number>(r.years).fill(r.ongoing ?? 0),
      ssBenefits: new Array<number>(r.years).fill(r.ss ?? 0),
      ...r.inputs,
      ledgerOut: rows,
      healthOut,
      ...(r.items !== undefined ? { oneTimeInflows: r.items } : {}),
    },
  )
  return { out, rows, healthOut }
}

describe('U9 · the federal slice in its year (AE2; R8, KTD7)', () => {
  // Pub 523: sold for $900,000 after costs, paid $300,000, both living: a $600,000 gain, $500,000 left out (the joint
  // figure at deflator 1), $100,000 taxed. The year: a $20,000 pension and $30,000 of Social Security, 2026, both under 65.
  const items = [sale(START, 200_000)]
  const O = 20_000
  const SS = 30_000

  it('federal tax rises by the worksheets’ tax on the slice stacked on the year’s ordinary income, the taxable Social Security share rises as §86 says, and the row reads the slice', () => {
    const base = saleRun({ years: 1, ongoing: O, ss: SS })
    const got = saleRun({ years: 1, ongoing: O, ss: SS, items })
    const without = federalByWorksheet(O, 0, SS, 'mfj', START)
    const withSale = federalByWorksheet(O, 100_000, SS, 'mfj', START)
    // By hand at 2026's figures: without, provisional $35,000 sits $3,000 into the 50 % band — $1,500 of SS taxed,
    // ordinary $21,500 under the $32,200 deduction, no tax. With the sale, provisional $135,000: the 85 % cap, $25,500
    // taxed; ordinary $45,500 − $32,200 = $13,300 at 10 % = $1,330; the gain stacks from $13,300: $85,600 at 0 % (to
    // the 0 % band's top), $14,400 at 15 % = $2,160. Total $3,490.
    expect(without.ssTaxable).toBeCloseTo(1_500, 9)
    expect(without.tax).toBe(0)
    expect(withSale.ssTaxable).toBeCloseTo(25_500, 9)
    expect(withSale.tax).toBeCloseTo(3_490, 9)
    expect(base.rows[0]!.taxPaid).toBeCloseTo(without.tax, 6)
    expect(got.rows[0]!.taxPaid).toBeCloseTo(withSale.tax, 6)
    expect(got.rows[0]!.homeSaleTaxedGain).toBe(100_000)
    // The kept money still lands at year end, beside the tax (KTD3).
    expect(got.rows[0]!.oneTimeIn).toBe(200_000)
  })

  it('the returned MAGI components carry the slice: ACA-MAGI adds it whole beside the full benefit, IRMAA-MAGI beside the §86 share', () => {
    const base = saleRun({ years: 1, ongoing: O, ss: SS })
    const got = saleRun({ years: 1, ongoing: O, ss: SS, items })
    expect(base.healthOut.acaMagi[0]).toBeCloseTo(O + SS, 9)
    expect(got.healthOut.acaMagi[0]).toBeCloseTo(O + 100_000 + SS, 9)
    expect(base.healthOut.irmaaMagi[0]).toBeCloseTo(O + 1_500, 9)
    expect(got.healthOut.irmaaMagi[0]).toBeCloseTo(O + 100_000 + 25_500, 9)
  })

  it('the slice reaches a priced ACA year’s MAGI: the row’s ACA income is the year’s pension, the slice and the whole benefit', () => {
    const enrolled = { healthcareEnabled: true, enrolledPremium: [12_000], slcsp: [10_000] }
    const got = saleRun({ years: 1, ongoing: O, ss: SS, items, inputs: enrolled })
    expect(got.rows[0]!.acaIncome).toBeCloseTo(O + 100_000 + SS, 6)
  })

  it('a row in a year with no sale, and every row of a run without one, carries no `homeSaleTaxedGain` key', () => {
    for (const row of saleRun({ years: 3, ongoing: O, ss: SS }).rows) expect('homeSaleTaxedGain' in row).toBe(false)
    const later = saleRun({ years: 3, ongoing: O, ss: SS, items: [sale(START + 2, 0)] })
    expect(later.rows.map((r) => 'homeSaleTaxedGain' in r)).toEqual([false, false, true])
  })

  it('a run-out row carries no slice key and credits none of the kept money (R6)', () => {
    // $60,000 of Roth against a $40,000 need: year 1 runs out with or without the sale (its $100,000 slice sits in the
    // 0% band here, so its tax is $0: the sale's own tax is pinned by the next arm).
    const rows: LedgerLoopRow[] = []
    const out = runTaxAwareDecumulation({ taxable: 0, pretax: 0, roth: 60_000 }, [0, 0], [0, 0], [40_000, 40_000], 0.6, 'proportional', on(under65Couple()), {
      ledgerOut: rows,
      oneTimeInflows: [sale(START + 1, 100_000)],
    })
    expect(out.depletionYear).toBe(1)
    expect(rows[1]!.ranOut).toBe(true)
    expect('homeSaleTaxedGain' in rows[1]!).toBe(false)
    expect(rows[1]!.oneTimeIn).toBe(0)
  })

  it('the sale’s own tax is charged in its year and can run savings out before the kept money lands, forfeiting it (R6)', () => {
    // $100,000 of Roth against $40,000 a year lasts both years without the sale. A sale in year 1 that may leave nothing
    // out ($700,000 less $100,000: a $600,000 gain) owes, by the capital-gain worksheet, (600,000 − 32,200 − 98,900) ×
    // 15% = $70,335 that year: $40,000 + $70,335 is more than the $60,000 left, so year 1 runs out and the $400,000 kept,
    // which lands only at year end, never arrives (the review's presence twin, wf_5708f410-799).
    const run = (items?: readonly OneTimeInflowParams[]) => {
      const rows: LedgerLoopRow[] = []
      const out = runTaxAwareDecumulation({ taxable: 0, pretax: 0, roth: 100_000 }, [0, 0], [0, 0], [40_000, 40_000], 0.6, 'proportional', on(under65Couple()), {
        ledgerOut: rows,
        ...(items !== undefined ? { oneTimeInflows: items } : {}),
      })
      return { out, rows }
    }
    expect(run().out.depletionYear).toBe(NEVER_DEPLETED)
    const { out, rows } = run([sale(START + 1, 400_000, { soldForReal: 700_000, paidDollars: 100_000, excludable: false })])
    expect(out.depletionYear).toBe(1)
    expect(rows[1]!.ranOut).toBe(true)
    expect(rows[1]!.taxPaid).toBeCloseTo(federalByWorksheet(0, 600_000, 0, 'mfj', START + 1).tax, 4)
    expect(federalByWorksheet(0, 600_000, 0, 'mfj', START + 1).tax).toBeCloseTo(70_335, 6)
    expect('homeSaleTaxedGain' in rows[1]!).toBe(false)
    expect(rows[1]!.oneTimeIn).toBe(0)
  })
})

describe('U9 · which amount a path leaves out (AE3; R8, KTD6)', () => {
  // The sale in 2028 (sim year 2). The first person's last year living is 2028, 2027 or 2026: the joint $500,000, the
  // joint again (the first year after the death), then the single $250,000 — $100,000 taxed twice, then $350,000.
  const living = (lastYear: number): HouseholdYear[] => Array.from({ length: 3 }, (_, t) => ({ living: START + t <= lastYear ? [P62, P60] : [P60] }))
  const slice = (lastYear: number) =>
    saleRun({ years: 3, items: [sale(START + 2, 0)], inputs: { householdYears: living(lastYear) } }).rows[2]!.homeSaleTaxedGain

  it('joint, joint, single by when the first death falls', () => {
    expect(slice(START + 2)).toBe(100_000)
    expect(slice(START + 1)).toBe(100_000)
    expect(slice(START)).toBe(350_000)
  })

  it('a one-person household leaves out the single figure; a sale that is not excludable leaves out nothing', () => {
    const one: Household = { startCalendarYear: START, filing: 'single', owner: P62 }
    expect(saleRun({ years: 1, household: one, items: [sale(START, 0)] }).rows[0]!.homeSaleTaxedGain).toBe(350_000)
    expect(saleRun({ years: 1, items: [sale(START, 0, { excludable: false })] }).rows[0]!.homeSaleTaxedGain).toBe(600_000)
  })

  it('two sales in one year sum, each floored at $0 first: a loss on one home never offsets the other’s gain', () => {
    const loss = sale(START, 0, { soldForReal: 200_000, paidDollars: 350_000, excludable: false })
    expect(saleRun({ years: 1, items: [sale(START, 0), loss] }).rows[0]!.homeSaleTaxedGain).toBe(100_000)
  })
})

describe('U9 · the state’s own two channels (AE4; R9, KTD7)', () => {
  // A $60,000 pension: North Carolina's base is above its standard deduction before the sale, so its flat rate falls on
  // every added dollar. Pennsylvania's channel for an excludable sale is exempt (72 P.S. §7303(a)(3)(vii)); for any other
  // sale it taxes the whole gain at its flat rate. Florida taxes nothing. The state tax is the year's tax less the same
  // run's with no state (the federal half is the same in both: the state never feeds the federal tax here).
  const yearTax = (state: RetirementState | undefined, items?: readonly OneTimeInflowParams[]) =>
    saleRun({ years: 1, ongoing: 60_000, household: under65Couple(state), ...(items !== undefined ? { items } : {}) }).rows[0]!.taxPaid
  const delta = (state: RetirementState, items: readonly OneTimeInflowParams[]) =>
    yearTax(state, items) - yearTax(undefined, items) - (yearTax(state) - yearTax(undefined))
  const nc = stateRateForYear('NC', START)
  const pa = stateRateForYear('PA', START)

  it('Pennsylvania: unchanged when excludable; up by its flat rate on the whole gain when not', () => {
    expect(delta('PA', [sale(START, 0)])).toBeCloseTo(0, 6)
    expect(delta('PA', [sale(START, 0, { excludable: false })])).toBeCloseTo(pa * 600_000, 6)
  })

  it('North Carolina: up by its rate on the federal slice (excludable) and on the whole gain (not)', () => {
    expect(delta('NC', [sale(START, 0)])).toBeCloseTo(nc * 100_000, 6)
    expect(delta('NC', [sale(START, 0, { excludable: false })])).toBeCloseTo(nc * 600_000, 6)
  })

  it('Florida: unchanged; two sales in one year, one excludable and one not, price each through its own channel', () => {
    expect(delta('FL', [sale(START, 0)])).toBeCloseTo(0, 6)
    const second = sale(START, 0, { soldForReal: 400_000, paidDollars: 250_000, excludable: false }) // a $150,000 gain
    expect(delta('PA', [sale(START, 0), second])).toBeCloseTo(pa * 150_000, 6)
    expect(delta('NC', [sale(START, 0), second])).toBeCloseTo(nc * (100_000 + 150_000), 6)
  })
})

describe('U9 · a clamped working year (KTD7; the working-year floor’s charges and IRMAA’s history)', () => {
  // One clamped year, 2026: $150,000 of pay (the floor's B, I = 0), no Social Security, the working-year IRMAA override at
  // the pay, North Carolina. Savings income is $0 (a Roth draw), so without the sale both charges are $0: federal
  // T(B, 0) − T(B, 0) + T(0, 0), state NC(B) − NC(B) + NC(0). With the slice S = $100,000 the federal charge is
  // T(B, S) − T(B, 0) by the worksheets, and the state's is North Carolina's rate on S (B is above its deduction).
  const B = 150_000
  const workingRun = (items?: readonly OneTimeInflowParams[]) => {
    const recorded: number[] = []
    const { rows } = saleRun({
      years: 1,
      net: 0,
      household: under65Couple('NC'),
      ...(items !== undefined ? { items } : {}),
      inputs: {
        contributions: [{ taxableByPerson: [0, 0], pretaxByPerson: [0, 0], rothByPerson: [0, 0], hsaByPerson: [0, 0] }],
        workingYearOutsideIncome: [{ ordinaryBase: B, investmentIncome: 0 }],
        bridgeYearMask: [true],
        healthcareEnabled: true,
        irmaaMagiOverride: [B],
        _workingYearProbe: { irmaaMagiRecorded: (_t, magi) => recorded.push(magi) },
      },
    })
    return { row: rows[0]!, recorded }
  }

  it('both charges include the slice, and the IRMAA-MAGI the bill two years on reads adds it to the override', () => {
    const none = workingRun()
    const got = workingRun([sale(START, 0)])
    expect(none.row.taxPaid).toBeCloseTo(0, 6)
    const federal = federalByWorksheet(B, 100_000, 0, 'mfj', START).tax - federalByWorksheet(B, 0, 0, 'mfj', START).tax
    expect(federal).toBeGreaterThan(10_000) // the gain stacks above $117,800 of ordinary taxable income: 15 % on most of it
    expect(got.row.taxPaid).toBeCloseTo(federal + stateRateForYear('NC', START) * 100_000, 6)
    expect(none.recorded).toEqual([B])
    expect(got.recorded[0]).toBeCloseTo(B + 100_000, 9)
    expect(got.row.irmaaIncome).toBeCloseTo(B + 100_000, 9)
  })
})

describe('U9 · the bracket-fill rails see the slice as a gain, never as ordinary income (KTD8)', () => {
  // A both-65+ couple (68 and 66 in 2026), no other income, a $100,000 need, bracket-fill: the fill is the pre-tax draw
  // that takes taxable income to the first edge. Without a sale MAGI is the fill alone, under the bonus's phase-out
  // start, so the deduction is the standard one, both age additions and both $6,000 bonuses. A $200,000 slice puts MAGI
  // past the end of the phase-out (no bonus) but never into the ordinary taxable income the edge compares: the fill
  // falls by exactly the two bonuses.
  const both65: Household = { startCalendarYear: START, filing: 'mfj', owner: person(1958), spouse: person(1960) }
  const pretaxDraw = (items?: readonly OneTimeInflowParams[]) => {
    const rows: LedgerLoopRow[] = []
    runTaxAwareDecumulation({ taxable: 1_000_000, pretax: 1_000_000, roth: 0 }, [0], [0], [100_000], 0.6, 'bracket-fill', on(both65), {
      initialTaxableBasis: 1_000_000,
      ledgerOut: rows,
      ...(items !== undefined ? { oneTimeInflows: items } : {}),
    })
    return rows[0]!.draw.pretax
  }

  it('the fill drops by the bonuses the slice phases out, and by nothing else', () => {
    const edge = ordinaryBracketsMFJ.value[0]!.upTo!
    const deductionNoBonus = standardDeductionMFJ.value + 2 * age65AdditionMFJ.value
    const bonuses = 2 * seniorBonus.value.perPerson65Plus
    expect(edge + deductionNoBonus + bonuses, '[premise] the no-sale fill sits under the phase-out start').toBeLessThan(seniorBonus.value.phaseOutStart.mfj)
    expect(pretaxDraw()).toBeCloseTo(edge + deductionNoBonus + bonuses, 3)
    // $1,100,000 sold, $400,000 paid: a $700,000 gain, $200,000 taxed.
    expect(pretaxDraw([sale(START, 0, { soldForReal: 1_100_000, paidDollars: 400_000 })])).toBeCloseTo(edge + deductionNoBonus, 3)
  })
})

describe('U9 · the solver’s anchor and the frames it hands the enumerator (KTD8, insight 143)', () => {
  const market: MarketAssumptions = {
    stock: { mean: 0.05, stdDev: 0 },
    bond: { mean: 0.05, stdDev: 0 },
    inflation: { mean: 0, stdDev: 0 },
    stockBondCorrelation: 0,
    space: 'simple',
    returnsAreReal: true,
  }
  const params = (items?: readonly OneTimeInflowParams[]): SimulationParams => ({
    initialPortfolio: 300_000,
    annualSpendingReal: 40_000,
    stockWeight: 0.6,
    people: [{ sex: 'female', currentAge: 58, birthYear: 1968, retirementAge: 58, earnedIncomeReal: 0, pia: 0, socialSecurityClaimAge: 67 }],
    survivorSpendingRatio: 0.75,
    drawdownPolicy: 'proportional',
    market,
    paths: 1,
    maxHorizonYears: 30,
    longevityMode: 'fixed-horizon',
    overlay: {
      taxEnabled: true,
      rmdEnabled: true,
      startCalendarYear: START,
      buckets: { taxable: 0, pretax: 300_000, roth: 0 },
      filing: 'single',
      ...(items !== undefined ? { oneTimeInflows: items } : {}),
    },
  })

  it('a sale inside the conversion window puts its slice in that year’s frame (one person: the single figure), 0 in every other window year', () => {
    // Pub 523: $900,000 less $300,000 paid, less the single $250,000: $350,000 in 2028.
    const base = params([sale(START + 2, 0)])
    const window = deriveConversionAnchor(base)!.window!.years
    expect(window.length).toBeGreaterThan(3)
    window.forEach((f, k) => {
      expect(f.committedGain, `${START + k}`).toBe(k === 2 ? 350_000 : 0)
      expect(f.committedGain).toBe(committedIncomeForYear(base, k).committedGain)
    })
  })

  it('no sale — no list, or gifts alone — carries no gain term in any frame', () => {
    for (const p of [params(), params([gift(START + 2, 100_000)])]) {
      for (let t = 0; t < 3; t++) expect('committedGain' in committedIncomeForYear(p, t)).toBe(false)
    }
  })

  it('the enumerator refuses frames that disagree on the gain: one run’s frames carry it on every year or none, and year 0 is one truth', () => {
    const anchor = deriveConversionAnchor(params([sale(START + 2, 0)]))!
    const [first, ...rest] = anchor.window!.years
    const { committedGain: _dropped, ...bare } = rest[1]!
    expect(() => anchoredConversionAmounts({ ...anchor, window: { ...anchor.window!, years: [first!, rest[0]!, bare, ...rest.slice(2)] } })).toThrow(
      /disagree on whether a home-sale gain rides/,
    )
    expect(() => anchoredConversionAmounts({ ...anchor, window: { ...anchor.window!, years: [{ ...first!, committedGain: 1 }, ...rest] } })).toThrow(/is not the anchor skeleton/)
    expect(() =>
      anchoredConversionAmounts({ ...anchor, window: { ...anchor.window!, years: [first!, { ...rest[0]!, committedGain: Number.NaN }, ...rest.slice(1)] } }),
    ).toThrow(/committedGain must be finite/)
  })

  it('every bracket-edge point is the no-sale run’s: a long-term gain stacks above the ordinary brackets', () => {
    const points = (p: SimulationParams) =>
      anchoredConversionAmounts(deriveConversionAnchor(p)!)
        .filter((a) => a.rail.kind === 'bracket-edge')
        .map((a) => [a.amountReal, a.rail] as const)
    // The person is 58: no §86 coupling (no benefit), no senior bonus — the gain moves no ordinary taxable dollar.
    expect(points(params([sale(START + 2, 0)]))).toEqual(points(params()))
  })
})

describe('U9 · the R19 arm and the overlay backstop for a sale’s figures (insights 028, 076)', () => {
  const refusal = (homeSale: unknown, over: Partial<OneTimeInflowParams> = {}) =>
    validateParams(retired({ items: [{ year: START + 2, cashReal: 0, homeSale: homeSale as HomeSaleGainInput, ...over }] }))
  const throwsOn = (homeSale: unknown, over: Partial<OneTimeInflowParams> = {}) => () =>
    runTaxAwareDecumulation(BUCKETS, [0], [0], [0], 0.6, 'proportional', on(couple), {
      initialTaxableBasis: 150_000,
      hsaOwnerIndex: 0,
      oneTimeInflows: [{ year: START, cashReal: 0, homeSale: homeSale as HomeSaleGainInput, ...over }],
    })

  it('admits a sale’s figures, $0 sold-for and paid included', () => {
    expect(refusal(saleFigures())).toBeNull()
    expect(refusal(saleFigures({ soldForReal: 0, paidDollars: 0, excludable: false }))).toBeNull()
  })

  it('refuses each bad figure by name: not an object, non-finite, negative or past the dollar domain, a flag that is not a boolean, a deflator not finite above 0, heir fields', () => {
    expect(refusal('nope')).toMatch(/homeSale shape invalid/)
    expect(refusal(null)).toMatch(/homeSale shape invalid/)
    expect(refusal(saleFigures({ soldForReal: Number.NaN }))).toMatch(/homeSale soldForReal invalid/)
    expect(refusal(saleFigures({ soldForReal: -1 }))).toMatch(/homeSale soldForReal invalid/)
    expect(refusal(saleFigures({ soldForReal: ENGINE_MAX_DOLLAR * 2 }))).toMatch(/homeSale soldForReal invalid/)
    expect(refusal(saleFigures({ paidDollars: Number.POSITIVE_INFINITY }))).toMatch(/homeSale paidDollars invalid/)
    expect(refusal(saleFigures({ paidDollars: ENGINE_MAX_DOLLAR * 2 }))).toMatch(/homeSale paidDollars invalid/)
    expect(refusal({ ...saleFigures(), excludable: 'yes' })).toMatch(/excludable must be true or false/)
    expect(refusal(saleFigures({ deflator: 0 }))).toMatch(/deflator must be finite and above 0/)
    expect(refusal(saleFigures({ deflator: -1.2 }))).toMatch(/deflator must be finite and above 0/)
    expect(refusal(saleFigures({ deflator: Number.NaN }))).toMatch(/deflator must be finite and above 0/)
    expect(refusal({ ...saleFigures(), deflator: '1' })).toMatch(/deflator must be finite and above 0/)
    expect(refusal(saleFigures(), { heirIndex: 0, leftTo: 'other-member' })).toMatch(/a home sale is the household's/)
  })

  it('the overlay throws on each of the same for a direct caller', () => {
    expect(throwsOn(saleFigures())).not.toThrow()
    expect(throwsOn(null)).toThrow(/homeSale must be the sale's figures/)
    expect(throwsOn(saleFigures({ soldForReal: Number.NaN }))).toThrow(/sold-for and paid figures must be finite/)
    expect(throwsOn(saleFigures({ paidDollars: -1 }))).toThrow(/sold-for and paid figures must be finite/)
    expect(throwsOn({ ...saleFigures(), excludable: 1 })).toThrow(/excludable flag must be true or false/)
    expect(throwsOn(saleFigures({ deflator: 0 }))).toThrow(/deflator must be finite and above 0/)
    expect(throwsOn(saleFigures({ deflator: Number.POSITIVE_INFINITY }))).toThrow(/deflator must be finite and above 0/)
    expect(throwsOn(saleFigures(), { heirIndex: 0, leftTo: 'other-member' })).toThrow(/carries no heirIndex or leftTo/)
  })
})

describe('U9 · convergence: a slice far above the exclusion, on a priced state with Social Security (insight 007)', () => {
  // Insight 007's worst corner, not a big-net probe: SMALL net spending, a LOW-basis taxable pool straddling the
  // cap-gains breakpoints, LARGE Social Security (the torpedo uncapped), North Carolina's flat term and a conversion —
  // now with a sale whose slice is millions, then one at the engine's dollar ceiling. A non-converged year throws, so a
  // finished run is the proof; the slice's tax must also be in the year (at least 20 % of it less the lower bands' room).
  const run = (filing: FilingStatus, soldForReal: number, net: number, roth = 0) => {
    const household: Household =
      filing === 'mfj'
        ? { startCalendarYear: START, filing, owner: person(1958), spouse: person(1960), retirementState: 'NC' }
        : { startCalendarYear: START, filing, owner: person(1958), retirementState: 'NC' }
    const rows: LedgerLoopRow[] = []
    runTaxAwareDecumulation(
      { taxable: 2_000_000, pretax: 1_500_000, roth },
      [0.04, 0.04],
      [0.02, 0.02],
      [net, net],
      0.6,
      'taxable-first',
      on(household),
      {
        initialTaxableBasis: 20_000,
        ssBenefits: [800_000, 800_000],
        conversions: [150_000, 150_000],
        ledgerOut: rows,
        oneTimeInflows: [{ year: START, cashReal: 0, homeSale: saleFigures({ soldForReal, paidDollars: 50_000 }) }],
      },
    )
    return rows
  }

  it('a $5,000,000 sale converges at every small net, joint and single, and the year carries the slice’s tax', () => {
    for (const filing of ['mfj', 'single'] as const) {
      for (const net of [1, 5_000, 20_000]) {
        const rows = run(filing, 5_000_000, net)
        expect(rows).toHaveLength(2)
        const slice = rows[0]!.homeSaleTaxedGain!
        expect(slice).toBe(5_000_000 - 50_000 - (filing === 'mfj' ? 500_000 : 250_000))
        expect(rows[0]!.taxPaid, `${filing} net ${net}`).toBeGreaterThan(0.2 * slice - 0.2 * 1_000_000)
        expect(Number.isFinite(rows[1]!.taxPaid)).toBe(true)
      }
    }
  })

  it('a sale at the engine’s dollar ceiling still converges (the float staircase bounds the passes; the GROSS_UP_MAX_PASSES note)', () => {
    for (const filing of ['mfj', 'single'] as const) {
      // A Roth bucket large enough to fund the slice's tax, so the year is funded and records its row (R6).
      const rows = run(filing, ENGINE_MAX_DOLLAR, 5_000, ENGINE_MAX_DOLLAR / 2)
      expect(rows[0]!.ranOut).toBe(false)
      expect(rows[0]!.homeSaleTaxedGain).toBeGreaterThan(0.99 * ENGINE_MAX_DOLLAR)
      expect(rows[0]!.taxPaid).toBeGreaterThan(0.2 * 0.99 * ENGINE_MAX_DOLLAR)
      expect(Number.isFinite(rows[0]!.taxPaid)).toBe(true)
    }
  })
})

describe('U9 · byte identity: a year with no slice, and a run with gifts alone, run as the gift half (R10, insight 093)', () => {
  const gifts = [gift(START + 1, 50_000), gift(START + 3, 80_000)]

  it('a sale the exclusion covers whole charges nothing: its year’s every tax figure is the same bits as the run without it', () => {
    const base = saleRun({ years: 2, ongoing: 60_000, ss: 30_000, household: under65Couple('NC'), items: gifts })
    const covered = sale(START + 1, 0, { soldForReal: 600_000, paidDollars: 300_000 }) // a $300,000 gain, under $500,000
    const got = saleRun({ years: 2, ongoing: 60_000, ss: 30_000, household: under65Couple('NC'), items: [...gifts, covered] })
    const r = got.rows[1]!
    const b = base.rows[1]!
    expect(r.homeSaleTaxedGain).toBe(0)
    expect(r.taxPaid).toBe(b.taxPaid)
    expect(r.draw).toStrictEqual(b.draw)
    expect(got.healthOut.acaMagi).toStrictEqual(base.healthOut.acaMagi)
    expect(got.healthOut.irmaaMagi).toStrictEqual(base.healthOut.irmaaMagi)
  })

  it('the years before a sale run the same bits as gifts alone, and a gift-only run writes no slice key on any row', () => {
    const base = saleRun({ years: 4, ongoing: 60_000, ss: 30_000, household: under65Couple('PA'), items: gifts })
    const got = saleRun({ years: 4, ongoing: 60_000, ss: 30_000, household: under65Couple('PA'), items: [...gifts, sale(START + 2, 0, { excludable: false })] })
    // A run carrying a sale is a longer list, so `oneTimeInByItem` gains an entry; every other field is the same.
    const strip = (row: LedgerLoopRow) => {
      const { oneTimeInByItem: _a, homeSaleTaxedGain: _b, ...rest } = row
      return rest
    }
    expect(got.rows.slice(0, 2).map(strip)).toStrictEqual(base.rows.slice(0, 2).map(strip))
    expect(got.rows[2]!.taxPaid).toBeGreaterThan(base.rows[2]!.taxPaid)
    for (const row of base.rows) expect('homeSaleTaxedGain' in row).toBe(false)
  })
})

describe('U9 · the date route: a sale inside the stop search’s window (KTD1, KTD8)', () => {
  // The `date` seed, with a main-home sale four calendar years in: a working year on a stop past it (offset 7), a
  // retired one on a stop before it (offset 2). Every tested stop carries the same calendar year's sale, and the sweep
  // finishes with every candidate run resolved (an unconverged year would make a candidate infeasible and fail it).
  const d = DEV_SEEDS.date
  const input = buildDateInput(d)
  if (input === null) throw new Error('date: the seed builds a date input')
  const overlay = input.params.overlay!
  const year = overlay.startCalendarYear + 4
  const items = [sale(year, 300_000, { soldForReal: 1_200_000, paidDollars: 300_000 })]
  const withSale = { ...input, params: { ...input.params, overlay: { ...overlay, oneTimeInflows: items } } }

  it('the sale year is a working year on one tested stop and a retired year on another, and each charges the slice there', () => {
    // Pub 523 at deflator 1: a $900,000 gain, less the joint $500,000 (both living on the steady future) or the single
    // $250,000 for a one-person seed.
    const expected = 900_000 - (input.params.people.length > 1 ? 500_000 : 250_000)
    const kinds: string[] = []
    for (const offset of [2, 7]) {
      const params = buildCandidateParams(withSale, offset, 1)
      const out = simulate(params, d.seed!, { namedFuture: steadyFuture(params), ledgerRows: true })
      if (out.indeterminate || out.infeasible) throw new Error(`offset ${offset}: ${JSON.stringify(out)}`)
      const none = simulate(buildCandidateParams(input, offset, 1), d.seed!, { namedFuture: steadyFuture(params), ledgerRows: true })
      if (none.indeterminate || none.infeasible) throw new Error('no-sale run did not resolve')
      const row = out.distribution.ledgerRows![4]!
      expect(row.homeSaleTaxedGain, `offset ${offset}`).toBe(expected)
      expect(row.taxPaid, `offset ${offset}`).toBeGreaterThan(none.distribution.ledgerRows![4]!.taxPaid)
      kinds.push(row.workingYear !== undefined ? 'working' : 'retired')
    }
    expect(kinds).toEqual(['retired', 'working'])
  })

  it('the sweep converges at the provisional tier: every candidate stop resolves and the search crowns its dates', { timeout: 300_000 }, async () => {
    expect(DATE_OFFSET_WINDOW_TOP).toBeGreaterThanOrEqual(7)
    const out = await runDateSearch(withSale, d.seed!, { tier: 'provisional' })
    expect(out.kind, JSON.stringify(out).slice(0, 400)).toBe('dates')
  })
})

describe('KTD3’s measure, the sale half: the year-end credit of a sale’s kept money against that money spread over its year', () => {
  // KTD3 as reopened in U2 (the plan's KTD3 has the record). The same thin retired couple as the gift half ($650,000,
  // $55,000 a year, 2,000 paths, seed 20261128) sells its main home in year 10: $700,000 after costs, $100,000 paid, so
  // a $600,000 gain and a $100,000 slice on a both-living path ($350,000 on a survivor path past the first year), and
  // $400,000 kept. The sale's TAX stays in its year in every arm; only the kept money moves:
  //   - year end (the convention): the sale keeps $400,000;
  //   - the spread (the yardstick): $200,000 as a gift a year earlier (landing at the start of the sale year) and the
  //     same sale keeping $200,000;
  //   - the year's start (direction only): $400,000 as a gift a year earlier and the same sale keeping $0;
  //   - without the money: the same sale keeping $0 (the premise's count).
  // Rosy flips against the spread past 1 in 100 of the paths reopen KTD3 before U10, and the share lasting must not be
  // higher under year end. Gloomy flips are recorded, never the sin.
  const PATHS = 2_000
  const SEED = 20261128
  const Y = START + 10
  const KEPT = 400_000
  const SPEND = 55_000
  const saleKeeping = (kept: number) => sale(Y, kept, { soldForReal: 700_000, paidDollars: 100_000 })

  it('rosy flips stay at or under 1 in 100 of the paths, and the share that lasts is no higher than with the kept money spread over its year', { timeout: 180_000 }, () => {
    const depletions = (items: readonly OneTimeInflowParams[]) => {
      const out = simulate(retired({ items, paths: PATHS, spend: SPEND }), SEED)
      if (out.indeterminate || out.infeasible) throw new Error(`thin run did not resolve: ${JSON.stringify(out)}`)
      return out.distribution.depletionYears
    }
    const none = depletions([saleKeeping(0)])
    const yearEnd = depletions([saleKeeping(KEPT)])
    const spread = depletions([gift(Y - 1, KEPT / 2), saleKeeping(KEPT / 2)])
    const yearStart = depletions([gift(Y - 1, KEPT), saleKeeping(0)])
    const t = Y - START
    const near = none.filter((dy) => dy !== NEVER_DEPLETED && dy >= t - 3 && dy <= t + 3).length
    expect(near / PATHS, '[test setup] paths running out near the sale year').toBeGreaterThan(0.3)
    const lasts = (dy: number | undefined) => dy === NEVER_DEPLETED
    const flips = (other: readonly number[]) => {
      let rosy = 0
      let gloomy = 0
      for (let p = 0; p < PATHS; p++) {
        if (lasts(yearEnd[p]) && !lasts(other[p])) rosy++
        if (!lasts(yearEnd[p]) && lasts(other[p])) gloomy++
      }
      return { rosy, gloomy }
    }
    const lasting = (dys: readonly number[]) => dys.filter(lasts).length
    const vsSpread = flips(spread)
    const vsStart = flips(yearStart)
    // Measured 2026-11-28 at this seed (U12's register entry carries them): 908 of 2,000 paths without the kept money run
    // out within three years either side of the sale; vs the spread rosy 3, gloomy 86; vs the year's start rosy 13, gloomy
    // 124; lasting 924 under year end, 1,007 spread, 1,035 at the year's start (224 without the money).
    expect(vsSpread.rosy).toBeLessThanOrEqual(PATHS / 100)
    expect(vsSpread.gloomy).toBeGreaterThan(vsSpread.rosy)
    expect(lasting(yearEnd)).toBeLessThanOrEqual(lasting(spread))
    expect(lasting(spread)).toBeLessThanOrEqual(lasting(yearStart))
    expect(vsStart.gloomy).toBeGreaterThan(vsStart.rosy)
  })
})
