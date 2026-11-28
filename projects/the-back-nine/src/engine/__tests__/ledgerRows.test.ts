/**
 * The year-by-year table's rows (docs/plans/rightcapital-map.md gap 1; workbench plan U3). One row per year of a
 * named-future run, recorded by the tax overlay's own year loop and joined to that year's cash from `simulate`'s
 * own assembly: an observation that leaves every other output byte-identical, whose rows reconcile ledger by
 * ledger by the loop's own arithmetic and chain into each other and into the run's own terminals (insight 093:
 * compared ledger by ledger, never as a sum). Slice 2 adds the year's income, spending, premiums, the incomes
 * the lines read, who is alive, the pay check's own lines, R13's flags and the wire.
 */
import { describe, expect, it } from 'vitest'
import type { LedgerYearRow, NamedFuture, PersonInputs, SimulationParams } from '@shared/model'
import { simulate, steadyFuture } from '@engine/simulate'
import { runEngine } from '@engine/engineProtocol'
import { fromWire } from '@engine/engineWire'
import { buildCandidateParams } from '@engine/dateSearch'
import type { WorkingYearCashLines } from '@engine/taxOverlay'
import { compileBudget } from '@budget/budgetToSpending'
import { buildDateInput } from '@intake/intakeMap'
import { DEV_SEEDS } from '@ui/devSeeds'

const person = (sex: PersonInputs['sex'], currentAge: number, over: Partial<PersonInputs> = {}): PersonInputs => ({
  sex,
  currentAge,
  birthYear: 2026 - currentAge,
  retirementAge: currentAge,
  earnedIncomeReal: 0,
  pia: 0,
  socialSecurityClaimAge: 70,
  ...over,
})

const MARKET: SimulationParams['market'] = {
  stock: { mean: 0.05, stdDev: 0.16 },
  bond: { mean: 0.02, stdDev: 0.06 },
  inflation: { mean: 0, stdDev: 0 },
  stockBondCorrelation: 0.1,
  space: 'simple',
  returnsAreReal: true,
}

/** Every ledger non-zero and distinct; the 74-year-old is past the required-withdrawal age, the pre-tax
 *  money is split per person, and three years convert. */
const world = (over: { hsa?: number; spend?: number; people?: PersonInputs[] } = {}): SimulationParams => {
  const hsa = over.hsa ?? 40_000
  return {
    initialPortfolio: 300_000 + 500_000 + 120_000 + hsa,
    annualSpendingReal: over.spend ?? 60_000,
    stockWeight: 0.55,
    people: over.people ?? [person('male', 74), person('female', 66)],
    survivorSpendingRatio: 0.75,
    drawdownPolicy: 'taxable-first',
    market: MARKET,
    paths: 1,
    maxHorizonYears: 40,
    longevityMode: 'sampled',
    overlay: {
      taxEnabled: true,
      rmdEnabled: true,
      startCalendarYear: 2026,
      buckets: { taxable: 300_000, pretax: 500_000, roth: 120_000, hsa },
      pretaxByPerson: [350_000, 150_000],
      initialTaxableBasis: 210_000,
      filing: 'mfj',
      hsaOwnerIndex: 1,
      conversions: [0, 25_000, 25_000, 25_000],
    },
  }
}

type RunOptions = Parameters<typeof simulate>[2]

const run = (params: SimulationParams, ledgerRows: boolean, extra: RunOptions = {}) => {
  const out = simulate(params, 11, { namedFuture: steadyFuture(params), ...extra, ...(ledgerRows ? { ledgerRows } : {}) })
  if (out.indeterminate || out.infeasible) throw new Error(`run did not resolve: ${JSON.stringify(out)}`)
  return out.distribution
}

const rowsOf = (params: SimulationParams, extra: RunOptions = {}): readonly LedgerYearRow[] => {
  const rows = run(params, true, extra).ledgerRows
  if (!rows) throw new Error('no ledger rows')
  return rows
}

/** Half a cent: the money grain the reconciliation is held to (insight 146). */
const GRAIN = 0.005

const sum = (xs: readonly number[]): number => xs.reduce((a, b) => a + b, 0)

/** The working household's table run (KTD9's working arm): `buildCandidateParams` at an offset, one future. */
const dateRun = (key: keyof typeof DEV_SEEDS, saved: number | undefined, offset: number, future?: (p: SimulationParams) => NamedFuture) => {
  const d = DEV_SEEDS[key]
  const input = buildDateInput(d)
  if (input === null) throw new Error(`${key}: the seed builds a date input`)
  const params = buildCandidateParams(saved === undefined ? input : { ...input, workingYearLeftOverSavedReal: saved }, offset, 1)
  return { params, seed: d.seed!, future: (future ?? steadyFuture)(params) }
}

const dateRows = (key: keyof typeof DEV_SEEDS, saved: number | undefined, offset: number, extra: RunOptions = {}, future?: (p: SimulationParams) => NamedFuture) => {
  const { params, seed, future: f } = dateRun(key, saved, offset, future)
  const out = simulate(params, seed, { namedFuture: f, ledgerRows: true, ...extra })
  if (out.indeterminate || out.infeasible) throw new Error(`${key}: ${JSON.stringify(out)}`)
  return out.distribution.ledgerRows!
}

/** A ledger's flows reconcile into its close (the loop's own arithmetic; `LedgerLoopRow`'s docblock). */
const expectReconciles = (r: LedgerYearRow) => {
  const g = r.growthScale
  expect(Math.abs((r.start.taxable - r.draw.taxable + r.rmdToTaxable) * g + r.contribution.taxable + r.leftOverCredit + (r.oneTimeIn ?? 0) - r.end.taxable), `taxable t=${r.t}`).toBeLessThan(GRAIN)
  expect(Math.abs((r.start.pretax - r.conversion - r.draw.pretax - r.rmdToTaxable) * g + r.contribution.pretax - r.end.pretax), `pretax t=${r.t}`).toBeLessThan(GRAIN)
  expect(Math.abs((r.start.roth + r.conversion - r.draw.roth) * g + r.contribution.roth - r.end.roth), `roth t=${r.t}`).toBeLessThan(GRAIN)
  expect(Math.abs((r.start.hsa - r.hsaSpend) * g + r.contribution.hsa - r.end.hsa), `hsa t=${r.t}`).toBeLessThan(GRAIN)
}

describe('the ledger sink', () => {
  it('leaves every other output byte-identical', () => {
    const params = world()
    const { ledgerRows, ...rest } = run(params, true)
    expect(ledgerRows?.length).toBeGreaterThan(0)
    expect(rest).toStrictEqual(run(params, false))
  })

  it('leaves every other output byte-identical on a working household with its pay check and saved left over', () => {
    const { params, seed, future } = dateRun('date', 16_985, 9)
    const on = simulate(params, seed, { namedFuture: future, ledgerRows: true })
    const off = simulate(params, seed, { namedFuture: future })
    if (on.indeterminate || on.infeasible || off.indeterminate || off.infeasible) throw new Error('did not resolve')
    const { ledgerRows, ...rest } = on.distribution
    expect(ledgerRows?.some((r) => r.workingYear !== undefined)).toBe(true)
    expect(rest).toStrictEqual(off.distribution)
  })

  it('moves the rows of the one ledger whose balance changed (the presence arm)', () => {
    const base = rowsOf(world())
    const more = rowsOf(world({ hsa: 55_000 }))
    expect(more[0]!.start.hsa).toBe(55_000)
    expect(base[0]!.start.hsa).toBe(40_000)
    expect(more.map((r) => r.end.hsa)).not.toEqual(base.map((r) => r.end.hsa))
  })

  it('records one row per year, sim-year indexed from 0', () => {
    const rows = rowsOf(world())
    expect(rows.map((r) => r.t)).toEqual(rows.map((_, i) => i))
  })

  it('reconciles every ledger in every funded row by the loop’s own arithmetic', () => {
    const rows = rowsOf(world())
    expect(rows.filter((r) => !r.ranOut).length).toBeGreaterThan(10)
    for (const r of rows) if (!r.ranOut) expectReconciles(r)
  })

  it('reconciles a year with build 2’s credit, above the credit’s cap too (a saved household, `datesaved`)', () => {
    // `datesaved` stored "All of it" at its own year-0 figure; a later working year's left over runs above it.
    const rows = dateRows('datesaved', undefined, 9).filter((r) => !r.ranOut)
    expect(rows.some((r) => r.leftOverCredit > 0 && r.incomeNotKept > 0), 'a credited year above the cap').toBe(true)
    for (const r of rows) expectReconciles(r)
    // The $5,000 cap below year 0's $16,985 (U10's hand check): year 0 credits the cap and keeps no more.
    const capped = dateRows('date', 5_000, 9)
    expect(capped[0]!.leftOverCredit).toBe(5_000)
    expect(capped[0]!.incomeNotKept).toBe(11_985)
    expectReconciles(capped[0]!)
  })

  it('reconciles a year with one-time money in its own term, and chains it into the next year (gap 5’s U2, KTD9)', () => {
    const base = world()
    const params: SimulationParams = { ...base, overlay: { ...base.overlay!, oneTimeInflows: [{ year: 2028, cashReal: 75_000 }] } }
    const rows = rowsOf(params)
    expect(rows[2]!.oneTimeIn).toBe(75_000)
    expect(rows[2]!.oneTimeInByItem).toEqual([75_000])
    expect(rows.filter((r) => r.t !== 2).every((r) => r.oneTimeIn === 0)).toBe(true)
    for (const r of rows) if (!r.ranOut) expectReconciles(r)
    for (let k = 1; k < rows.length; k++) expect(rows[k]!.start).toStrictEqual(rows[k - 1]!.end)
  })

  it('chains each row’s close into the next row’s opening, ledger by ledger', () => {
    const rows = rowsOf(world())
    for (let k = 1; k < rows.length; k++) expect(rows[k]!.start).toStrictEqual(rows[k - 1]!.end)
  })

  it('closes its last row on the run’s own terminal for each ledger, never a sum', () => {
    const params = world({ spend: 40_000 })
    const dist = run(params, true)
    const last = dist.ledgerRows!.at(-1)!
    expect(dist.depletionYears[0]).toBe(-1) // never ran out, so the last row is the run's last year
    expect(last.ranOut).toBe(false)
    expect(last.end.taxable).toBe(dist.taxAware!.terminalTaxableReal[0])
    expect(last.end.pretax).toBe(dist.taxAware!.terminalPretaxReal[0])
    expect(last.end.roth).toBe(dist.taxAware!.terminalRothReal[0])
    expect(last.end.hsa).toBe(dist.taxAware!.terminalHsaReal[0])
  })

  it('splits pre-tax per person, summing to the household figure at both edges and in the draw', () => {
    for (const r of rowsOf(world())) {
      expect(r.pretaxStartByPerson).toHaveLength(2)
      expect(Math.abs(sum(r.pretaxStartByPerson!) - r.start.pretax)).toBeLessThan(GRAIN)
      expect(Math.abs(sum(r.pretaxEndByPerson!) - r.end.pretax)).toBeLessThan(GRAIN)
      expect(Math.abs(sum(r.pretaxDrawByPerson!) - r.draw.pretax)).toBeLessThan(GRAIN)
    }
  })

  it('carries the year’s conversion, required withdrawal, its move to taxable and the tax paid', () => {
    const rows = rowsOf(world())
    expect(rows.slice(0, 4).map((r) => r.conversion)).toEqual([0, 25_000, 25_000, 25_000])
    expect(rows.slice(4).every((r) => r.conversion === 0)).toBe(true)
    expect(rows[0]!.rmd).toBeGreaterThan(0) // the 74-year-old's required withdrawal
    expect(rows.some((r) => r.rmdToTaxable > 0)).toBe(true) // taxable-first leaves it unspent, so it moves
    expect(rows.every((r) => r.rmdToTaxable <= r.rmd + GRAIN)).toBe(true)
    expect(rows.some((r) => r.taxPaid > 0)).toBe(true)
  })

  it('names the year’s filing status and who is alive, and the rollover from the first death on', () => {
    const rows = rowsOf(world({ spend: 40_000 }))
    const firstDeath = rows.findIndex((r) => r.alive.includes(false))
    expect(firstDeath).toBeGreaterThan(0) // the steady future's first death, inside the run
    for (const r of rows.slice(0, firstDeath)) {
      expect(r.alive).toEqual([true, true])
      expect(r.filing).toBe('mfj')
      expect(r.rolledOver).toBe(false)
    }
    for (const r of rows.slice(firstDeath)) {
      expect(r.rolledOver).toBe(true)
      expect(r.filing).toBe('single')
      expect(r.pretaxStartByPerson![r.alive.indexOf(false)]).toBe(0) // the deceased's pre-tax is the survivor's
    }
  })
})

describe('two people’s pre-tax, by hand (the per-person columns)', () => {
  // The Uniform Lifetime Table (26 CFR 1.401(a)(9)-9(c), 2022 on): 75 → 24.6, 76 → 23.7, 77 → 22.9, 78 → 22.0.
  // He is 75 in 2026 (born 1951: required withdrawals from 73) and holds $400,000 of pre-tax; she is 66 (born
  // 1960: from 75) and holds $200,000. She is 9 years younger, under the joint table's 10, so the Uniform table
  // applies. $2,000,000 of taxable pays the spending and the tax first, so his required withdrawal is all excess:
  // it moves to taxable whole, and the two pre-tax ledgers move only by it and the year's one growth factor.
  const DIVISORS = [24.6, 23.7, 22.9, 22.0]
  const couple = (people: PersonInputs[], pretaxByPerson: number[]): SimulationParams => ({
    ...world({ hsa: 0, spend: 50_000, people }),
    initialPortfolio: 2_600_000,
    overlay: {
      taxEnabled: true,
      rmdEnabled: true,
      startCalendarYear: 2026,
      buckets: { taxable: 2_000_000, pretax: 600_000, roth: 0, hsa: 0 },
      pretaxByPerson,
      initialTaxableBasis: 2_000_000,
      filing: 'mfj',
    },
  })

  it('matches each person’s column row by row, with his excess landing in taxable', () => {
    const rows = rowsOf(couple([person('male', 75), person('female', 66)], [400_000, 200_000]))
    let his = 400_000
    let hers = 200_000
    DIVISORS.forEach((divisor, k) => {
      const r = rows[k]!
      expect(r.alive).toEqual([true, true])
      expect(r.draw.pretax).toBe(0) // taxable pays everything, so nothing else touches pre-tax
      expect(r.pretaxStartByPerson![0]!).toBeCloseTo(his, 6)
      expect(r.pretaxStartByPerson![1]!).toBeCloseTo(hers, 6)
      const required = his / divisor
      expect(r.rmd).toBeCloseTo(required, 6)
      expect(r.rmdToTaxable).toBeCloseTo(required, 6)
      his = (his - required) * r.growthScale
      hers = hers * r.growthScale
      expect(r.pretaxEndByPerson![0]!).toBeCloseTo(his, 6)
      expect(r.pretaxEndByPerson![1]!).toBeCloseTo(hers, 6)
    })
  })

  it('follows the people, not the order: listed the other way round, the columns swap', () => {
    const forward = rowsOf(couple([person('male', 75), person('female', 66)], [400_000, 200_000]))
    const swapped = rowsOf(couple([person('female', 66), person('male', 75)], [200_000, 400_000]))
    for (let k = 0; k < DIVISORS.length; k++) {
      expect(swapped[k]!.pretaxEndByPerson![1]!).toBeCloseTo(forward[k]!.pretaxEndByPerson![0]!, 6)
      expect(swapped[k]!.pretaxEndByPerson![0]!).toBeCloseTo(forward[k]!.pretaxEndByPerson![1]!, 6)
    }
  })
})

describe('the working year (the pay check’s own lines, KTD8)', () => {
  it('pins every working year, year 0 included, to the lines the loop composed; pay and Social Security agree across producers', () => {
    const composed = new Map<number, WorkingYearCashLines>()
    const rows = dateRows('date', undefined, 9, { _workingYearProbe: { checkComposed: (t, _floor, lines) => composed.set(t, lines) } })
    const working = rows.filter((r) => r.workingYear !== undefined)
    expect(working.length).toBeGreaterThan(1)
    expect(working[0]!.t).toBe(0)
    expect(working.map((r) => r.t)).toEqual([...composed.keys()])
    for (const r of working) {
      const lines = composed.get(r.t)!
      const wy = r.workingYear!
      expect(wy.pay).toBe(lines.pay)
      expect(wy.socialSecurity).toBe(lines.socialSecurity)
      expect(wy.shortfall).toBe(lines.shortfall)
      expect(wy.leftOver).toBe(lines.cash)
      expect(wy.payrollTax).toBe(lines.payroll.total)
      expect(wy.taxOnOutsideIncome).toBe(lines.taxOnOutsideIncome)
      // simulate's cash assembly is the second producer: the same pay and the same paid Social Security.
      expect(sum(r.payByPerson)).toBe(lines.pay)
      expect(r.socialSecurity).toBe(lines.socialSecurity)
      expect(r.spending).toBe(lines.workingYearCost)
    }
    // Year 0's left over is the hand-derived $16,985.00 (U10's check: 150,000 − 11,475 − 17,540 − 20,000 − 84,000).
    expect(working[0]!.workingYear!.leftOver).toBeCloseTo(16_985, 6)
    // The earner's $150,000 of pay; the part in the tax base is that pay less the earner's own pre-tax deferral.
    const deferral = dateRun('date', undefined, 9).params.overlay!.accumulation!.contributionsByPerson[0]!.pretax?.[0] ?? 0
    expect(deferral).toBeGreaterThan(0)
    expect(working[0]!.payByPerson).toEqual([150_000, 0])
    expect(working[0]!.payTaxableByPerson).toEqual([150_000 - deferral, 0])
    // Once work stops, the year shows the plan's own spending and carries no pay-check lines.
    const retired = rows.filter((r) => r.workingYear === undefined && !r.ranOut)
    expect(retired.length).toBeGreaterThan(0)
    for (const r of retired) {
      expect(sum(r.payByPerson)).toBe(0)
      expect(r.spending).toBeGreaterThan(0)
    }
  })

  it('records the IRMAA income as the figure the overlay billed from, a working-year override included (KTD7)', () => {
    const recorded = new Map<number, number>()
    const { params } = dateRun('date', undefined, 9)
    expect(params.overlay?.irmaaMagiOverride?.some((x) => x > 0), 'the run carries a working-year override').toBe(true)
    const rows = dateRows('date', undefined, 9, { _workingYearProbe: { irmaaMagiRecorded: (t, v) => recorded.set(t, v) } })
    expect(rows.length).toBeGreaterThan(0)
    for (const r of rows) {
      if (r.ranOut) continue
      expect(r.irmaaIncome, `t=${r.t}`).toBe(recorded.get(r.t))
    }
  })
})

describe('the year’s health premiums and the ACA income', () => {
  it('match the health readout’s own year on a one-future run: the ACA years before 65, Medicare after', () => {
    const flat = (v: number) => Array.from({ length: 12 }, () => v)
    const retiree = (sex: PersonInputs['sex']) => person(sex, 60)
    const params: SimulationParams = {
      initialPortfolio: 2_000_000,
      annualSpendingReal: 90_000,
      stockWeight: 0.5,
      people: [retiree('male'), retiree('female')],
      survivorSpendingRatio: 0.75,
      drawdownPolicy: 'proportional',
      market: MARKET,
      paths: 1,
      maxHorizonYears: 12,
      longevityMode: 'fixed-horizon',
      overlay: {
        taxEnabled: true,
        rmdEnabled: false,
        startCalendarYear: 2026,
        buckets: { taxable: 1_000_000, pretax: 1_000_000, roth: 0 },
        initialTaxableBasis: 1_000_000,
        filing: 'mfj',
        healthcareEnabled: true,
        slcsp: flat(12_000),
        enrolledPremium: flat(15_000),
      },
    }
    const out = simulate(params, 7, { namedFuture: steadyFuture(params), ledgerRows: true, healthReadout: true })
    if (out.indeterminate || out.infeasible) throw new Error(JSON.stringify(out))
    const rows = out.distribution.ledgerRows!
    const byYear = out.distribution.healthReadout!.byYear
    expect(rows).toHaveLength(12)
    for (const r of rows) {
      const y = byYear.find((h) => h.yearsFromNow === r.t + 1)!
      expect(r.premiums.acaNet).toBe(y.acaNetPremiumP50)
      expect(r.premiums.medicare - r.premiums.irmaaSurcharge).toBe(y.medicareBaseP50)
      expect(r.premiums.irmaaSurcharge).toBe(y.irmaaSurchargeP50)
      expect(r.premiums.medicareExtras).toBe(y.medicareExtrasP50)
      if (y.acaPricedFraction === 1) expect(r.acaIncome).toBe(y.acaMagiP50)
      else expect(r.acaIncome).toBeUndefined()
      expect(r.irmaaIncome).toBeDefined()
    }
    expect(rows.slice(0, 5).every((r) => r.acaIncome !== undefined && r.premiums.acaNet > 0 && r.premiums.medicare === 0)).toBe(true)
    expect(rows.slice(5).every((r) => r.acaIncome === undefined && r.premiums.acaNet === 0 && r.premiums.medicare > 0)).toBe(true)
  })
})

describe('R13’s flags, each on its own case and unset on a twin', () => {
  const claimed = (sex: PersonInputs['sex'], age: number, pia: number) => person(sex, age, { pia, socialSecurityClaimAge: 70 })
  // Each case: the twin pair and the flag's reading on a row set.
  const cases: { name: string; on: () => readonly LedgerYearRow[]; off: () => readonly LedgerYearRow[]; flag: (rows: readonly LedgerYearRow[]) => boolean }[] = [
    {
      name: 'a retired surplus (Social Security above spending)',
      on: () => rowsOf(world({ people: [claimed('male', 74, 60_000), claimed('female', 70, 40_000)] })),
      off: () => rowsOf(world()),
      flag: (rows) => rows[0]!.incomeNotKept > 0,
    },
    {
      name: 'a working year’s left over with no saved answer',
      on: () => dateRows('date', undefined, 9),
      off: () => dateRows('date', 16_985, 9),
      flag: (rows) => rows[0]!.incomeNotKept > 0,
    },
    {
      name: 'a credit year above the cap',
      on: () => dateRows('date', 5_000, 9),
      off: () => dateRows('date', 16_985, 9),
      flag: (rows) => rows[0]!.incomeNotKept > 0,
    },
    {
      name: 'a working year after a death',
      // A lifespan score near 1 puts the retired spouse's death inside the earner's working years (year 6 of 9);
      // the twin keeps the steady lifespans, under which both outlive the work.
      on: () => dateRows('date', 1_000_000, 9, {}, (p) => ({ ...steadyFuture(p), longevityU: [steadyFuture(p).longevityU[0]!, 0.9999] })),
      off: () => dateRows('date', 1_000_000, 9),
      flag: (rows) => rows.some((r) => r.workingYear !== undefined && r.alive.includes(false) && r.workingYear.leftOver >= 1 && r.incomeNotKept > 0),
    },
    {
      name: 'a required withdrawal above the year’s need',
      on: () => rowsOf(world()),
      off: () => rowsOf(world({ people: [person('male', 64), person('female', 62)] })),
      flag: (rows) => rows.slice(0, 5).some((r) => r.rmdToTaxable > 0),
    },
    {
      name: 'the money runs out',
      on: () => rowsOf(world()),
      off: () => rowsOf(world({ spend: 40_000 })),
      flag: (rows) => rows.some((r) => r.ranOut),
    },
  ]
  for (const c of cases) {
    it(c.name, () => {
      expect(c.flag(c.on())).toBe(true)
      expect(c.flag(c.off())).toBe(false)
    })
  }

  it('a working year whose left over is all credited keeps nothing out', () => {
    const rows = dateRows('date', 16_985, 9)
    expect(rows[0]!.leftOverCredit).toBe(16_985)
    expect(rows[0]!.incomeNotKept).toBe(0)
  })
})

describe('the 59½ flag', () => {
  /** A couple of 59 and 60 with pre-tax money only, so the year's spending is a pre-tax draw. */
  const youngCouple = (pretaxByPerson: number[]): SimulationParams => ({
    ...world({ hsa: 0, people: [person('male', 59), person('female', 60)] }),
    initialPortfolio: 900_000,
    overlay: {
      taxEnabled: true,
      rmdEnabled: true,
      startCalendarYear: 2026,
      buckets: { taxable: 0, pretax: 900_000, roth: 0, hsa: 0 },
      pretaxByPerson,
      filing: 'mfj',
    },
  })

  it('flags the 59-year-old’s draw and not the 60-year-old’s', () => {
    const his = rowsOf(youngCouple([900_000, 0]))[0]!
    const hers = rowsOf(youngCouple([0, 900_000]))[0]!
    expect(his.draw.pretax).toBeGreaterThan(0)
    expect(his.pretaxDrawByPerson![0]!).toBeGreaterThan(0)
    expect(his.earlyPretaxDraw).toBe(true)
    expect(hers.draw.pretax).toBeGreaterThan(0)
    expect(hers.pretaxDrawByPerson![1]!).toBeGreaterThan(0)
    expect(hers.earlyPretaxDraw).toBe(false)
    // A year on he is 60, the first age left unflagged.
    expect(rowsOf(youngCouple([900_000, 0]))[1]!.earlyPretaxDraw).toBe(false)
  })
})

describe('other income, by person', () => {
  it('pays each owner’s own stream while alive and a dead owner’s survivor stream to the survivor', () => {
    const H = 40
    const flat = (v: number) => Array.from({ length: H }, () => v)
    const base = world({ spend: 40_000 })
    const params: SimulationParams = {
      ...base,
      overlay: {
        ...base.overlay!,
        income: {
          incomeByPerson: [
            { grossFull: flat(20_000), taxableFull: flat(18_000), grossSurvivor: flat(10_000), taxableSurvivor: flat(9_000) },
            { grossFull: flat(5_000), taxableFull: flat(5_000) },
          ],
        },
      },
    }
    const rows = rowsOf(params)
    const firstDeath = rows.findIndex((r) => r.alive.includes(false))
    expect(firstDeath).toBeGreaterThan(0)
    expect(rows[0]!.otherIncomeByPerson).toEqual([
      { gross: 20_000, taxable: 18_000 },
      { gross: 5_000, taxable: 5_000 },
    ])
    const after = rows[firstDeath]!
    expect(after.alive).toEqual([false, true]) // he dies first in the steady future
    expect(after.otherIncomeByPerson).toEqual([
      { gross: 0, taxable: 0 },
      { gross: 15_000, taxable: 14_000 },
    ])
  })
})

describe('a future that runs out of money', () => {
  it('ends its rows at the run-out year, the last row flagged with nothing left', () => {
    const dist = run(world(), true)
    const ranOut = dist.depletionYears[0]!
    expect(ranOut).toBeGreaterThan(0)
    const rows = dist.ledgerRows!
    expect(rows.map((r) => r.t)).toEqual(Array.from({ length: ranOut + 1 }, (_, t) => t))
    expect(rows.slice(0, -1).every((r) => !r.ranOut)).toBe(true)
    const last = rows.at(-1)!
    expect(last.ranOut).toBe(true)
    expect(last.end).toEqual({ taxable: 0, pretax: 0, roth: 0, hsa: 0 })
    expect(last.leftOverCredit).toBe(0)
    expect(last.start).toStrictEqual(rows.at(-2)!.end)
  })
})

describe('the floor pass', () => {
  /** $40,000 of essentials and $30,000 of travel: the full plan runs out, the essentials hold. */
  const budgeted = (): SimulationParams => {
    const base = world({ spend: 70_000 })
    const budget = compileBudget(
      [
        { category: 'food', label: 'Living', annualAmountReal: 40_000, tier: 'essentials', startYear: 0 },
        { category: 'travel', label: 'Travel', annualAmountReal: 30_000, tier: 'discretionary', startYear: 0 },
      ],
      undefined,
      base.maxHorizonYears,
    )
    return { ...base, budget }
  }

  it('records the essentials floor when named, pinned to the run’s own floor outputs', () => {
    const params = budgeted()
    const out = simulate(params, 11, {
      namedFuture: steadyFuture(params),
      ledgerRows: true,
      ledgerTrack: 'floor',
      bandFan: true,
      bandFanTrack: 'floor',
    })
    if (out.indeterminate || out.infeasible) throw new Error(JSON.stringify(out))
    const { depletionYears, floor, bandFan, ledgerRows } = out.distribution
    expect(depletionYears[0]).toBeGreaterThan(0) // the full plan runs out
    expect(floor!.depletionYears[0]).toBe(-1) // the essentials never do
    expect(ledgerRows!.some((r) => r.ranOut)).toBe(false)
    expect(ledgerRows).toHaveLength(bandFan!.byYear.length - 1) // one row per year the floor fan carries
    ledgerRows!.forEach((r, k) => {
      const close = r.end.taxable + r.end.pretax + r.end.roth + r.end.hsa
      expect(Math.abs(close - bandFan!.byYear[k + 1]!.p50)).toBeLessThan(GRAIN)
      // The floor spend: $40,000 of essentials while both live, the survivor's 75% after.
      expect(r.spending).toBe(r.alive.includes(false) ? 30_000 : 40_000)
    })
  })

  it('records the full pass by default, through its own run-out year', () => {
    const params = budgeted()
    const out = simulate(params, 11, { namedFuture: steadyFuture(params), ledgerRows: true })
    if (out.indeterminate || out.infeasible) throw new Error(JSON.stringify(out))
    const rows = out.distribution.ledgerRows!
    expect(rows).toHaveLength(out.distribution.depletionYears[0]! + 1)
    expect(rows.at(-1)!.ranOut).toBe(true)
    expect(rows[0]!.spending).toBe(70_000)
  })

  it('is refused without a budget', () => {
    const params = world()
    const out = simulate(params, 11, { namedFuture: steadyFuture(params), ledgerRows: true, ledgerTrack: 'floor' })
    expect(out.indeterminate && out.reason).toMatch(/'floor' needs the budget construct/)
  })
})

describe('the wire', () => {
  it('carries the rows to the main thread unchanged, by structured clone', () => {
    const params = world()
    const wire = runEngine(params, 11, { namedFuture: steadyFuture(params), ledgerRows: true })
    const back = fromWire(structuredClone(wire))
    if (!back.ok) throw new Error(back.reason)
    expect(back.result.distribution.ledgerRows).toStrictEqual(run(params, true).ledgerRows)
  })
})

describe('the ledger sink refuses a run it cannot describe', () => {
  it('without a named future', () => {
    const out = simulate({ ...world(), paths: 50 }, 11, { ledgerRows: true })
    expect(out.indeterminate && out.reason).toMatch(/rides only a named-future run/)
  })

  it('without the tax overlay', () => {
    const { overlay: _omit, ...spine } = world()
    const params: SimulationParams = { ...spine, initialPortfolio: 960_000 }
    const out = simulate(params, 11, { namedFuture: steadyFuture(params), ledgerRows: true })
    expect(out.indeterminate && out.reason).toMatch(/needs the tax overlay/)
  })

  it('with the overlay’s tax off', () => {
    const params = world()
    const out = simulate({ ...params, overlay: { ...params.overlay!, taxEnabled: false } }, 11, { namedFuture: steadyFuture(params), ledgerRows: true })
    expect(out.indeterminate && out.reason).toMatch(/needs the tax overlay/)
  })
})
