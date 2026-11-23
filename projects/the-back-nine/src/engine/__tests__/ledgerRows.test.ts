/**
 * The year-by-year table's ledger rows (docs/plans/rightcapital-map.md gap 1; workbench plan U3, slice 1:
 * the ledgers). One row per funded year of a named-future run, recorded by the tax overlay's own year loop:
 * an observation that leaves every other output byte-identical, whose rows reconcile ledger by ledger by
 * the loop's own arithmetic and chain into each other and into the run's own terminals (insight 093:
 * compared ledger by ledger, never as a sum).
 */
import { describe, expect, it } from 'vitest'
import type { LedgerYearRow, PersonInputs, SimulationParams } from '@shared/model'
import { simulate, steadyFuture } from '@engine/simulate'
import { compileBudget } from '@budget/budgetToSpending'

const person = (sex: PersonInputs['sex'], currentAge: number): PersonInputs => ({
  sex,
  currentAge,
  birthYear: 2026 - currentAge,
  retirementAge: currentAge,
  earnedIncomeReal: 0,
  pia: 0,
  socialSecurityClaimAge: 70,
})

/** Every ledger non-zero and distinct; the 74-year-old is past the required-withdrawal age, the pre-tax
 *  money is split per person, and three years convert. */
const world = (over: { hsa?: number; spend?: number } = {}): SimulationParams => {
  const hsa = over.hsa ?? 40_000
  return {
    initialPortfolio: 300_000 + 500_000 + 120_000 + hsa,
    annualSpendingReal: over.spend ?? 60_000,
    stockWeight: 0.55,
    people: [person('male', 74), person('female', 66)],
    survivorSpendingRatio: 0.75,
    drawdownPolicy: 'taxable-first',
    market: {
      stock: { mean: 0.05, stdDev: 0.16 },
      bond: { mean: 0.02, stdDev: 0.06 },
      inflation: { mean: 0, stdDev: 0 },
      stockBondCorrelation: 0.1,
      space: 'simple',
      returnsAreReal: true,
    },
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

const run = (params: SimulationParams, ledgerRows: boolean) => {
  const out = simulate(params, 11, { namedFuture: steadyFuture(params), ...(ledgerRows ? { ledgerRows } : {}) })
  if (out.indeterminate || out.infeasible) throw new Error(`run did not resolve: ${JSON.stringify(out)}`)
  return out.distribution
}

const rowsOf = (params: SimulationParams): readonly LedgerYearRow[] => {
  const rows = run(params, true).ledgerRows
  if (!rows) throw new Error('no ledger rows')
  return rows
}

/** Half a cent: the money grain the reconciliation is held to (insight 146). */
const GRAIN = 0.005

describe('the ledger sink', () => {
  it('leaves every other output byte-identical', () => {
    const params = world()
    const { ledgerRows, ...rest } = run(params, true)
    expect(ledgerRows?.length).toBeGreaterThan(0)
    expect(rest).toStrictEqual(run(params, false))
  })

  it('moves the rows of the one ledger whose balance changed (the presence arm)', () => {
    const base = rowsOf(world())
    const more = rowsOf(world({ hsa: 55_000 }))
    expect(more[0]!.start.hsa).toBe(55_000)
    expect(base[0]!.start.hsa).toBe(40_000)
    expect(more.map((r) => r.end.hsa)).not.toEqual(base.map((r) => r.end.hsa))
  })

  it('records one row per funded year, sim-year indexed from 0', () => {
    const rows = rowsOf(world())
    expect(rows.map((r) => r.t)).toEqual(rows.map((_, i) => i))
  })

  it('reconciles every ledger in every row by the loop’s own arithmetic', () => {
    for (const r of rowsOf(world())) {
      const g = r.growthScale
      expect(Math.abs((r.start.taxable - r.draw.taxable + r.rmdToTaxable) * g + r.contribution.taxable + r.leftOverCredit - r.end.taxable)).toBeLessThan(GRAIN)
      expect(Math.abs((r.start.pretax - r.conversion - r.draw.pretax - r.rmdToTaxable) * g + r.contribution.pretax - r.end.pretax)).toBeLessThan(GRAIN)
      expect(Math.abs((r.start.roth + r.conversion - r.draw.roth) * g + r.contribution.roth - r.end.roth)).toBeLessThan(GRAIN)
      expect(Math.abs((r.start.hsa - r.hsaSpend) * g + r.contribution.hsa - r.end.hsa)).toBeLessThan(GRAIN)
    }
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
    expect(last.end.taxable).toBe(dist.taxAware!.terminalTaxableReal[0])
    expect(last.end.pretax).toBe(dist.taxAware!.terminalPretaxReal[0])
    expect(last.end.roth).toBe(dist.taxAware!.terminalRothReal[0])
    expect(last.end.hsa).toBe(dist.taxAware!.terminalHsaReal[0])
  })

  it('splits pre-tax per person, summing to the household figure at both edges', () => {
    for (const r of rowsOf(world())) {
      expect(r.pretaxStartByPerson).toHaveLength(2)
      expect(Math.abs(r.pretaxStartByPerson!.reduce((a, b) => a + b, 0) - r.start.pretax)).toBeLessThan(GRAIN)
      expect(Math.abs(r.pretaxEndByPerson!.reduce((a, b) => a + b, 0) - r.end.pretax)).toBeLessThan(GRAIN)
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
})

describe('a future that runs out of money', () => {
  it('ends its funded rows the year before the run-out year, which records none', () => {
    const dist = run(world(), true)
    const ranOut = dist.depletionYears[0]!
    expect(ranOut).toBeGreaterThan(0)
    expect(dist.ledgerRows!.map((r) => r.t)).toEqual(Array.from({ length: ranOut }, (_, t) => t))
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
    expect(ledgerRows).toHaveLength(bandFan!.byYear.length - 1) // one row per year the floor fan carries
    ledgerRows!.forEach((r, k) => {
      const close = r.end.taxable + r.end.pretax + r.end.roth + r.end.hsa
      expect(Math.abs(close - bandFan!.byYear[k + 1]!.p50)).toBeLessThan(GRAIN)
    })
  })

  it('records the full pass by default, which stops at its own run-out year', () => {
    const params = budgeted()
    const out = simulate(params, 11, { namedFuture: steadyFuture(params), ledgerRows: true })
    if (out.indeterminate || out.infeasible) throw new Error(JSON.stringify(out))
    expect(out.distribution.ledgerRows).toHaveLength(out.distribution.depletionYears[0]!)
  })

  it('is refused without a budget', () => {
    const params = world()
    const out = simulate(params, 11, { namedFuture: steadyFuture(params), ledgerRows: true, ledgerTrack: 'floor' })
    expect(out.indeterminate && out.reason).toMatch(/'floor' needs the budget construct/)
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
})
