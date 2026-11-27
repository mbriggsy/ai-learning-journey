/**
 * The Act 5 plan's U12, slice 2: the readers of an inherited IRA's ledger beyond the money flow — the sink's per-ledger
 * entries and row totals, the bracket-fill rails' committed income, and the solver's anchor. Every expected figure is
 * derived by hand (DND 012): Pub 590-B (2025) Table I divisors, returns held at 0 (or at an exact 5% with no
 * volatility), so a ledger is plain arithmetic. Slice 1's flow arms live in `inheritedLedger.test.ts`.
 */
import { describe, it, expect } from 'vitest'
import {
  runTaxAwareDecumulation,
  type Household,
  type HouseholdYear,
  type OverlayPerson,
  type TaxYearInputs,
} from '@engine/taxOverlay'
import { ledgerRowEndTotal, ledgerRowStartTotal, totalAcrossBuckets, type AccountBuckets } from '@engine/sequencing'
import { committedIncomeForYear, deriveConversionAnchor } from '@engine/solver/solveAnchor'
import { acaCliffFillHeadroom } from '@engine/magiLandscape'
import { anchoredConversionAmounts } from '@engine/solver/candidates'
import { steadyGrowthFactor } from '@engine/simulate'
import type { DrawdownPolicy, InheritedLedgerParams, LedgerLoopRow, MarketAssumptions, SimulationParams } from '@shared/model'

const START = 2026

/** AE5: an owner born 1945 who died in 2023, past the required beginning date, and an heir born 1968 (56 in 2024). */
const ae5 = (over: Partial<InheritedLedgerParams> = {}): InheritedLedgerParams => ({
  ownerBirthYear: 1945,
  ownerDeathYear: 2023,
  heirIndex: 0,
  balance: 100_000,
  openYear: START,
  openYearFigure: 3_496.5,
  takenInOpenYear: 0,
  earlierWithdrawals: [],
  pace: { kind: 'law-minimum' },
  ...over,
})

const person = (birthYear: number): OverlayPerson => ({ birthYear })
const single = (heir: OverlayPerson, start = START): Household => ({ startCalendarYear: start, filing: 'single', owner: heir })

interface Run {
  readonly buckets?: AccountBuckets
  readonly net?: number
  readonly years: number
  readonly household?: Household
  readonly ledgers: readonly InheritedLedgerParams[]
  readonly rs?: number
  readonly rb?: number
  readonly policy?: DrawdownPolicy
  readonly inputs?: TaxYearInputs
}
function run(r: Run) {
  const ledgerOut: LedgerLoopRow[] = []
  const balancesOut: number[] = []
  const result = runTaxAwareDecumulation(
    r.buckets ?? { taxable: 0, pretax: 0, roth: 500_000 },
    new Array<number>(r.years).fill(r.rs ?? 0),
    new Array<number>(r.years).fill(r.rb ?? 0),
    new Array<number>(r.years).fill(r.net ?? 0),
    0.6,
    r.policy ?? 'proportional',
    { taxEnabled: true, rmdEnabled: true, household: r.household ?? single(person(1968)) },
    { ...r.inputs, ledgerOut, balancesOut, ...(r.ledgers.length > 0 ? { inheritedLedgers: r.ledgers } : {}) },
  )
  return { result, rows: ledgerOut, balances: balancesOut }
}

/** AE5's year-top balances 2026..2034 under law-minimum pace at zero returns, and each year's required amount: the
 *  open row's asked $3,496.50, then the year-top balance over Table I's divisor at the heir's 2024 age (56 → 30.6)
 *  less one a year elapsed (2027: 27.6 … 2032: 22.6), the whole balance in 2033, nothing after. */
function ae5Schedule(): { readonly top: number[]; readonly required: number[] } {
  const divisors = [27.6, 26.6, 25.6, 24.6, 23.6, 22.6]
  const top = [100_000]
  const required = [3_496.5]
  let b = 100_000 - 3_496.5
  for (const d of divisors) {
    top.push(b)
    required.push(b / d)
    b -= b / d
  }
  top.push(b, 0) // 2033 opens on what is left; 2034 on nothing
  required.push(b, 0)
  return { top, required }
}

const rel = (a: number, b: number): number => Math.abs(a - b) / Math.max(1, Math.abs(b))

describe('the sink: each inherited ledger’s year, row by row (KTD22)', () => {
  it('pins AE5’s column against the hand schedule — start, required, taken, end, the last year — and its close is the run’s own final balance', () => {
    const { top, required } = ae5Schedule()
    const { result, rows } = run({ years: 9, net: 40_000, ledgers: [ae5()] })
    expect(rows).toHaveLength(9)
    rows.forEach((row, t) => {
      const e = row.inherited![0]!
      const year = START + t
      expect(e.start, `start ${year}`).toBeCloseTo(top[t]!, 6)
      expect(e.required, `required ${year}`).toBeCloseTo(required[t]!, 6)
      expect(e.taken, `taken ${year} (the law-minimum pace, $40,000 of general money each year: no top-up)`).toBeCloseTo(required[t]!, 6)
      expect(e.aboveRequired, `above ${year}`).toBeCloseTo(0, 9)
      expect(e.end, `end ${year}`).toBeCloseTo(t + 1 < top.length ? top[t + 1]! : 0, 6)
      expect([e.booked, e.leftTheRun], `nothing booked or left ${year}`).toEqual([0, 0])
      // Each year's required amount sits under the $40,000 need, so none of it moves — except 2033, whose whole balance
      // is above the year's gross (the need plus its tax, all paid from it: no general draw), and the rest moves.
      if (year === 2033) {
        expect(row.draw.taxable + row.draw.pretax + row.draw.roth).toBe(0)
        expect(e.movedToTaxable).toBeCloseTo(e.taken - (40_000 + row.taxPaid), 6)
        expect(e.movedToTaxable).toBeGreaterThan(20_000)
      } else {
        expect(e.movedToTaxable, `moved ${year}`).toBe(0)
      }
      expect(e.last, `last ${year}`).toBe(year === 2033)
    })
    expect(rows[8]!.inherited![0]!.end).toBe(result.finalInherited)
  })

  it('a row with no inherited ledger keeps its shape: no `inherited` key at all', () => {
    const { rows } = run({ years: 2, net: 40_000, ledgers: [] })
    for (const row of rows) expect('inherited' in row).toBe(false)
  })

  it('paced cash beyond the need moves to taxable, split by each ledger’s paced amount, and taxable and each ledger reconcile by the row’s formulas', () => {
    // Two ledgers pace $3,496.50 and $1,000 (no tax: $4,496.50 sits under the single deduction). A $2,000 need spends
    // $2,000 of it, so $2,496.50 moves: 2,496.50 × 3,496.50 / 4,496.50 and 2,496.50 × 1,000 / 4,496.50. Both legs 5%.
    const b = ae5({ balance: 50_000, openYearFigure: 1_000 })
    const { rows } = run({ years: 1, net: 2_000, rs: 0.05, rb: 0.05, buckets: { taxable: 0, pretax: 0, roth: 100_000 }, ledgers: [ae5(), b] })
    const row = rows[0]!
    const [ea, eb] = row.inherited!
    expect(row.taxPaid).toBe(0)
    expect(ea!.movedToTaxable).toBeCloseTo((2_496.5 * 3_496.5) / 4_496.5, 9)
    expect(eb!.movedToTaxable).toBeCloseTo((2_496.5 * 1_000) / 4_496.5, 9)
    expect(row.growthScale).toBeCloseTo(1.05, 12)
    const moved = ea!.movedToTaxable + eb!.movedToTaxable
    expect(rel(row.end.taxable, (row.start.taxable - row.draw.taxable + row.rmdToTaxable + moved) * row.growthScale)).toBeLessThan(1e-12)
    for (const e of [ea!, eb!]) expect(rel(e.end, (e.start - e.leftTheRun - e.taken) * row.growthScale)).toBeLessThan(1e-12)
    expect(ea!.end).toBeCloseTo((100_000 - 3_496.5) * 1.05, 6)
  })

  it('a year the general accounts cannot fund: the top-up is the ledger with room, above its required amount; the ten-year-end ledger gives only its balance', () => {
    const start = 2030
    const last = ae5({ ownerDeathYear: 2020, openYear: start, openYearFigure: 0, balance: 10_000 }) // 2030 = 2020 + 10
    const room = ae5({ ownerBirthYear: 1965, ownerDeathYear: 2025, openYear: start, openYearFigure: 0, balance: 30_000 }) // before the date
    const { rows } = run({ years: 1, net: 25_000, household: single(person(1968), start), buckets: { taxable: 0, pretax: 0, roth: 0 }, ledgers: [last, room] })
    const row = rows[0]!
    const [el, er] = row.inherited!
    expect([el!.required, el!.taken, el!.end, el!.last]).toEqual([10_000, 10_000, 0, true])
    expect(er!.required).toBe(0)
    expect(er!.aboveRequired).toBe(er!.taken)
    // The gross is the need plus its tax, all of it inherited money: $10,000 paced, the rest from the ledger with room.
    expect(el!.taken + er!.taken).toBeCloseTo(25_000 + row.taxPaid, 6)
    expect(er!.end).toBeCloseTo(30_000 - er!.taken, 6)
    expect(row.ranOut).toBe(false)
  })

  it('left to someone else: in the year after the heir’s death the whole balance leaves the run — nothing taken, nothing booked, the close 0', () => {
    const heir = person(1968)
    const spouse = person(1970)
    const household: Household = { startCalendarYear: START, filing: 'mfj', owner: heir, spouse }
    const householdYears: HouseholdYear[] = Array.from({ length: 6 }, (_, t) => ({ living: t < 4 ? [heir, spouse] : [spouse] }))
    const { rows } = run({ years: 6, net: 30_000, household, buckets: { taxable: 0, pretax: 0, roth: 400_000 }, ledgers: [ae5({ leftTo: 'someone-else' })], inputs: { householdYears } })
    const e = rows[4]!.inherited![0]!
    expect(e.leftTheRun).toBeCloseTo(ae5Schedule().top[4]!, 6)
    expect([e.taken, e.booked, e.required, e.end]).toEqual([0, 0, 0, 0])
    expect(rows[5]!.inherited![0]!.start).toBe(0)
  })

  it('a plan aged a year: the row before the asked year books the custodian’s withdrawal with nothing required or taken; the asked year books what already came out beside the figure still owed', () => {
    const ledger = ae5({ ownerBirthYear: 1930, ownerDeathYear: 2023, openYear: 2027, openYearFigure: 3_500, takenInOpenYear: 1_000, earlierWithdrawals: [{ calendarYear: 2026, amount: 4_000 }] })
    const { rows } = run({ years: 2, net: 0, household: single(person(1956)), ledgers: [ledger] })
    const [e0, e1] = rows.map((r) => r.inherited![0]!)
    expect([e0!.booked, e0!.required, e0!.taken, e0!.start, e0!.end]).toEqual([4_000, 0, 0, 100_000, 100_000])
    expect([e1!.booked, e1!.required, e1!.taken]).toEqual([1_000, 2_500, 2_500])
    expect(e1!.end).toBeCloseTo(97_500, 9)
  })

  it('the run-out row closes every inherited ledger at 0', () => {
    const { rows } = run({ years: 12, net: 40_000, buckets: { taxable: 0, pretax: 0, roth: 100_000 }, ledgers: [ae5({ balance: 150_000 })] })
    const out = rows[rows.length - 1]!
    expect(out.ranOut).toBe(true)
    expect(out.inherited![0]!.end).toBe(0)
  })
})

describe('the row totals (KTD22: the engine’s one helper, never the four buckets alone)', () => {
  it('every row’s closing total equals the state’s total to float dust, and row 0 opens on the whole portfolio (a pre-tax ledger per person, an HSA, two ledgers, real returns)', () => {
    const heir = person(1968)
    const spouse = person(1966)
    const household: Household = { startCalendarYear: START, filing: 'mfj', owner: heir, spouse }
    const buckets: AccountBuckets = { taxable: 150_000, pretax: 300_000, roth: 80_000, hsa: 20_000 }
    const ledgers = [ae5({ leftTo: 'other-member' }), ae5({ balance: 60_000, ownerDeathYear: 2024, openYearFigure: 2_000, leftTo: 'other-member' })]
    const { rows, balances } = run({
      years: 12,
      rs: 0.05,
      rb: 0.02,
      net: 60_000,
      household,
      buckets,
      ledgers,
      inputs: { initialTaxableBasis: 120_000, initialPretaxByPerson: [200_000, 100_000], hsaOwnerIndex: 1 },
    })
    expect(rows).toHaveLength(12)
    expect(ledgerRowStartTotal(rows[0]!)).toBe(totalAcrossBuckets(buckets) + 100_000 + 60_000)
    rows.forEach((row, t) => {
      expect(rel(ledgerRowEndTotal(row), balances[t]!), `row ${t}`).toBeLessThan(1e-9)
      for (const e of row.inherited!) expect(rel(e.end, (e.start - e.leftTheRun - e.taken) * row.growthScale), `row ${t}`).toBeLessThan(1e-12)
      if (t > 0) expect(ledgerRowStartTotal(row)).toBe(ledgerRowEndTotal(rows[t - 1]!))
    })
  })

  it('a faster pace moves money from the ledger to taxable and leaves the closing total where it was — the four buckets alone would read it as more money', () => {
    // No spending, zero returns: the law pays $3,496.50 to taxable, "even amounts" $12,500 (eight years left).
    const at = (pace: InheritedLedgerParams['pace']) =>
      run({ years: 1, net: 0, buckets: { taxable: 0, pretax: 0, roth: 100_000 }, ledgers: [ae5({ pace })] }).rows[0]!
    const law = at({ kind: 'law-minimum' })
    const even = at({ kind: 'even' })
    expect(ledgerRowEndTotal(law)).toBeCloseTo(200_000, 6)
    expect(ledgerRowEndTotal(even)).toBeCloseTo(200_000, 6)
    expect(totalAcrossBuckets(even.end) - totalAcrossBuckets(law.end)).toBeCloseTo(12_500 - 3_496.5, 6)
  })
})

describe('the bracket-fill rails: committed income (KTD21; CommittedYearIncome)', () => {
  it('the fill leaves room for the year’s booked and paced inherited income and never counts it as fill: the pre-tax draw falls by exactly that income', () => {
    // A single heir of 58: no senior bonus, a flat deduction, so the bracket-edge rail's fill is (edge + deduction −
    // committed). $1,000 already out (booked) plus the $2,496.50 still owed (paced) is $3,496.50 of committed income,
    // under the deduction, so the first edge stays the binding one and the fill drops by exactly $3,496.50. The need
    // ($120,000) is far above the fill, so the pre-tax draw IS the fill.
    const buckets: AccountBuckets = { taxable: 600_000, pretax: 600_000, roth: 0 }
    const pretaxDraw = (ledgers: readonly InheritedLedgerParams[]) =>
      run({ years: 1, net: 120_000, policy: 'bracket-fill', buckets, ledgers, inputs: { initialTaxableBasis: 600_000 } }).rows[0]!.draw.pretax
    const without = pretaxDraw([])
    const withIt = pretaxDraw([ae5({ takenInOpenYear: 1_000 })])
    expect(without).toBeGreaterThan(10_000) // the fill is a real band, not an empty pre-tax pool
    expect(without - withIt).toBeCloseTo(3_496.5, 4)
  })

  it('the ACA-cliff rail’s closed form subtracts the withdrawal: K = cliff − conversion − other income − Social Security − inherited', () => {
    const frame = { rmd: 0, conversion: 0, ongoingTaxable: 10_000, ssBenefit: 0, filing: 'single' as const, count65: 0, calendarYear: START }
    expect(acaCliffFillHeadroom(frame, 80_000)).toBe(70_000)
    expect(acaCliffFillHeadroom({ ...frame, inheritedDistribution: 5_000 }, 80_000)).toBe(65_000)
    // Committed income alone over the cliff: an RMD of $66,000 beside the withdrawal leaves nothing to fill.
    expect(acaCliffFillHeadroom({ ...frame, rmd: 66_000, inheritedDistribution: 5_000 }, 80_000)).toBe(0)
    expect(acaCliffFillHeadroom({ ...frame, rmd: 66_000 }, 80_000)).toBe(70_000)
  })
})

describe('the solver’s anchor (solveAnchor.committedIncomeForYear; insight 139: each year in its own frame)', () => {
  // No volatility and 5% on both legs: the steady path's factor is exactly 1.05 whatever the mix.
  const market: MarketAssumptions = {
    stock: { mean: 0.05, stdDev: 0 },
    bond: { mean: 0.05, stdDev: 0 },
    inflation: { mean: 0, stdDev: 0 },
    stockBondCorrelation: 0,
    space: 'simple',
    returnsAreReal: true,
  }
  const params = (inheritedIras?: readonly InheritedLedgerParams[]): SimulationParams => ({
    initialPortfolio: 300_000 + (inheritedIras ?? []).reduce((s, l) => s + l.balance, 0),
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
      ...(inheritedIras !== undefined ? { inheritedIras } : {}),
    },
  })

  it('the steady factor is the engine’s transform of a zero score: exactly 1.05 here', () => {
    expect(steadyGrowthFactor(params())).toBeCloseTo(1.05, 15)
  })

  it('every window year carries the ledger’s own figure: 2026’s asked amount, then each steady-path year-top balance over its divisor, the whole balance in 2033, nothing after', () => {
    const divisors = [27.6, 26.6, 25.6, 24.6, 23.6, 22.6] // 2027..2032
    const expected = [3_496.5]
    let b = (100_000 - 3_496.5) * 1.05
    for (const d of divisors) {
      expected.push(b / d)
      b = (b - b / d) * 1.05
    }
    expected.push(b) // 2033 takes everything
    const base = params([ae5()])
    // The window runs to the heir's RMD start (born 1968: 75, in 2043): 17 years, so the ledger's end is inside it.
    for (let t = 0; t < 17; t++) {
      const frame = committedIncomeForYear(base, t)
      expect(frame.inheritedDistribution, `${START + t}`).toBeCloseTo(t < expected.length ? expected[t]! : 0, 6)
    }
    const window = deriveConversionAnchor(base)!.window!.years
    expect(window).toHaveLength(17)
    window.forEach((f, k) => expect(f.inheritedDistribution).toBe(committedIncomeForYear(base, k).inheritedDistribution))
  })

  it('a run with no inherited IRA carries no inherited term in any frame (the literal pre-U12 frame)', () => {
    for (let t = 0; t < 3; t++) expect('inheritedDistribution' in committedIncomeForYear(params(), t)).toBe(false)
  })

  it('the enumerator refuses frames that disagree on the inherited term: one run’s frames carry it on every year or none, and year 0 is one truth', () => {
    const anchor = deriveConversionAnchor(params([ae5()]))!
    const [first, ...rest] = anchor.window!.years
    const { inheritedDistribution: _dropped, ...bare } = rest[0]!
    expect(() => anchoredConversionAmounts({ ...anchor, window: { ...anchor.window!, years: [first!, bare, ...rest.slice(1)] } })).toThrow(/disagree on whether an inherited withdrawal rides/)
    expect(() => anchoredConversionAmounts({ ...anchor, window: { ...anchor.window!, years: [{ ...first!, inheritedDistribution: 1 }, ...rest] } })).toThrow(/is not the anchor skeleton/)
  })

  it('each bracket edge’s 2026 anchor drops by exactly the year’s committed inherited income ($1,000 already out plus the $2,500 still owed, whole dollars)', () => {
    const first2026 = (p: SimulationParams) =>
      new Map(
        anchoredConversionAmounts(deriveConversionAnchor(p)!).flatMap((a) =>
          a.rail.kind === 'bracket-edge' && a.rail.calendarYear === START ? [[a.rail.edge, a.amountReal] as const] : [],
        ),
      )
    const without = first2026(params())
    const withIt = first2026(params([ae5({ openYearFigure: 3_500, takenInOpenYear: 1_000 })]))
    expect(without.size).toBeGreaterThan(2)
    expect([...withIt.keys()]).toEqual([...without.keys()])
    for (const [edge, amount] of without) expect(amount - withIt.get(edge)!, `edge ${edge}`).toBe(3_500)
  })
})
