import { describe, expect, it } from 'vitest'
import { irmaa } from '@engine/constants/health'
import { simulate } from '@engine/simulate'
import type { LedgerYearRow } from '@shared/model'
import type { ModelAnswer } from '@store/memoryModel'
import { DEV_SEEDS } from '../../../devSeeds'
import { copy, slots } from '../../../copy'
import { formatDeltaDollar } from '../../../money'
import { tableRunFor, type TableMeta } from '../../../workbench/tableRun'
import { whatIfRunFor } from '../../../workbench/whatIfRun'
import type { RunRows } from '../../retirement/cashFlowsView'
import { armBundle, COMPARISON_CHARTS, comparisonView, detailsView, taxBundles } from '../taxRunsView'
import { headlineAnswer, leaveMoreRec } from './fixtures'

/**
 * Tax → Tax Strategies → Comparison and Details (Act 6 · RC8): the two runs' bundles, U14's shared-futures check on
 * both, every chart and table named for its one future, the income tax chart's state clause, the withdrawal stacks on
 * one scale, and Medicare's columns adding up. The rows are the engine's own run of the plan's steady request, never
 * hand-typed.
 */

const RETIRED = DEV_SEEDS.retired

function steadyFor(answer: ModelAnswer): { rows: readonly LedgerYearRow[]; meta: TableMeta } {
  const run = tableRunFor(answer)
  if (run.kind !== 'run' || run.views.steady.kind !== 'run') throw new Error(`no steady run: ${run.kind}`)
  const { params, seed, options } = run.views.steady.request
  const out = simulate(params, seed, options)
  if (out.indeterminate || out.infeasible) throw new Error('the steady run failed')
  const rows = out.distribution.ledgerRows
  if (rows === undefined || rows.length === 0) throw new Error('the steady run kept no ledger')
  return { rows, meta: run.meta }
}

const answer = headlineAnswer(RETIRED)
const steady = steadyFor(answer)
const ready = (rows: readonly LedgerYearRow[] = steady.rows): RunRows => ({ kind: 'ready', rows, meta: steady.meta, updating: false, answerKey: 'k1' })
/** The same run with the year's income tax cut by a fifth: the recommendation's side of a tax comparison. */
const lowerTax = steady.rows.map((r) => ({ ...r, taxPaid: r.taxPaid * 0.8 }))

describe('the two runs’ bundles', () => {
  it('the winner runs as its withdrawal order and Roth plan; a baseline that IS the plan reads the plan’s own rows', () => {
    const p = leaveMoreRec()
    const draft = { ...RETIRED, drawdownPolicy: 'proportional' as const }
    const { rothConversion: _r, ...noRoth } = draft
    const b = taxBundles(p, noRoth)
    expect(b.winner).toEqual([{ kind: 'withdrawal-order', policy: 'taxable-first' }, { kind: 'roth', conversion: { kind: 'plan', plan: p.winner.conversion } }])
    expect(b.baseline).toBe('plan')
  })

  it('a baseline that differs from the plan (another order, or another Roth plan) runs as its own bundle, field by field', () => {
    const p = leaveMoreRec()
    expect(taxBundles(p, { ...RETIRED, drawdownPolicy: 'taxable-first' }).baseline).toEqual(armBundle(p.noActionBaseline))
    const withRoth = { ...RETIRED, drawdownPolicy: 'proportional' as const, rothConversion: { annualAmountReal: 5_000, startYearOffset: 0, years: 2 } }
    expect(taxBundles(p, withRoth).baseline, 'the plan converts, the baseline arm does not').toEqual(armBundle(p.noActionBaseline))
    expect(armBundle(p.noActionBaseline)[1]).toEqual({ kind: 'roth', conversion: { kind: 'none' } })
  })

  it('both runs share futures with the plan (U14’s check: a bundle on the plan’s own seed runs; another seed is refused)', () => {
    const p = leaveMoreRec()
    const b = taxBundles(p, { ...RETIRED, drawdownPolicy: 'taxable-first' })
    for (const bundle of [b.winner, b.baseline === 'plan' ? [] : b.baseline]) {
      const run = whatIfRunFor(answer, 1, bundle)
      expect(run.kind, 'on the plan’s own futures').toBe('run')
    }
    expect(whatIfRunFor(answer, 2, b.winner)).toMatchObject({ kind: 'refused', refusal: { kind: 'futures-differ' } })
  })
})

describe('Comparison', () => {
  it('every chart is named for its market, steady or rough', () => {
    for (const { id, label } of COMPARISON_CHARTS) {
      for (const future of ['steady', 'rough'] as const) {
        const v = comparisonView({ chart: id, future, winner: ready(), baseline: ready(), stateClause: null })
        if (v.kind !== 'pair' && v.kind !== 'stacks') throw new Error(v.kind)
        expect(v.title).toBe(slots.taxStratInMarket(label, future === 'steady'))
      }
    }
  })

  it('income tax: the recommendation green and solid, your plan today compared; the difference in words; the page’s one state clause beneath', () => {
    const v = comparisonView({ chart: 'tax', future: 'steady', winner: ready(lowerTax), baseline: ready(), stateClause: copy.verdictStateUnpricedNote })
    if (v.kind !== 'pair') throw new Error(v.kind)
    expect(v.series.map((s) => [s.name, s.role])).toEqual([
      [copy.recVizWithLabel, 'alternative'],
      [copy.recVizWithoutLabel, 'compared'],
    ])
    const sum = (rows: readonly LedgerYearRow[]) => rows.reduce((a, r) => a + Math.max(0, r.taxPaid), 0)
    expect(v.metric).toBe(slots.taxStratCompareTax(formatDeltaDollar(sum(lowerTax) - sum(steady.rows)), 'less', true))
    expect(v.notes).toEqual([copy.verdictStateUnpricedNote])
    expect(v.lattice.ceiling).toBeGreaterThanOrEqual(Math.max(...steady.rows.map((r) => r.taxPaid)))
    // Only the tax chart carries the state clause; invested assets carry their own note.
    const assets = comparisonView({ chart: 'assets', future: 'steady', winner: ready(), baseline: ready(), stateClause: copy.verdictStateUnpricedNote })
    expect(assets.kind === 'pair' && assets.notes, 'the assets chart says what its balance counts').toEqual([copy.taxStratAssetsNote])
  })

  it('the same two runs read "about the same", never a $0 difference', () => {
    const v = comparisonView({ chart: 'rmd', future: 'rough', winner: ready(), baseline: ready(), stateClause: null })
    expect(v.kind === 'pair' && v.metric).toBe(slots.taxStratCompareRmd('0', 'same', false))
  })

  it('withdrawals: two stacks side by side on ONE scale, the stack order listed', () => {
    const v = comparisonView({ chart: 'withdrawals', future: 'steady', winner: ready(lowerTax), baseline: ready(), stateClause: null })
    if (v.kind !== 'stacks') throw new Error(v.kind)
    expect(v.stacks.map((s) => s.title)).toEqual([copy.recVizWithLabel, copy.recVizWithoutLabel])
    const top = Math.max(...steady.rows.map((r) => r.draw.taxable + r.draw.pretax + r.draw.roth + r.hsaSpend))
    expect(v.lattice.ceiling).toBeGreaterThanOrEqual(top)
    expect(v.notes).toEqual([copy.taxStratStackOrder])
  })

  it('a run still working, refused or failed shows words, never a half picture', () => {
    expect(comparisonView({ chart: 'tax', future: 'steady', winner: { kind: 'loading' }, baseline: ready(), stateClause: null })).toEqual({ kind: 'waiting', words: copy.taxStratRunsWaiting })
    expect(comparisonView({ chart: 'tax', future: 'steady', winner: ready(), baseline: { kind: 'withheld', words: 'w' }, stateClause: null })).toEqual({ kind: 'withheld', words: 'w' })
    expect(comparisonView({ chart: 'tax', future: 'steady', winner: { kind: 'error' }, baseline: ready(), stateClause: null })).toEqual({ kind: 'withheld', words: copy.taxStratRunsError })
  })
})

describe('Details', () => {
  it('withdrawal and conversion: Year, Age, the conversion, each source’s withdrawal and the three balances; the heading names the strategy and its market', () => {
    const v = detailsView({ table: 'withdrawals', pick: 'recommended', future: 'steady', rows: ready() })
    if (v.kind !== 'table') throw new Error(v.kind)
    expect(v.heading).toBe(slots.taxStratDetailsOf(copy.recVizWithLabel, true))
    expect(v.columns.map((c) => c.header)).toEqual([
      copy.taxStratColYear,
      copy.taxStratColAge,
      copy.taxStratColConversion,
      copy.taxStratColFromTaxable,
      copy.taxStratColFromPretax,
      copy.taxStratColFromRoth,
      copy.taxStratColTaxableEnd,
      copy.taxStratColPretaxEnd,
      copy.taxStratColRothEnd,
    ])
    expect(v.rows).toHaveLength(steady.rows.length)
    expect(v.rows[0]!.cells.year).toBe(String(steady.meta.startCalendarYear))
  })

  it('Medicare: the income it reads, the premium before the surcharge, the surcharge and the total, which add up; no Medicare years says so', () => {
    const v = detailsView({ table: 'medicare', pick: 'plan', future: 'rough', rows: ready() })
    if (v.kind !== 'table') throw new Error(v.kind)
    expect(v.heading).toBe(slots.taxStratDetailsOf(copy.recVizWithoutLabel, false))
    expect(v.rows.length, 'the retired household has Medicare years (else the sum check proves nothing)').toBeGreaterThan(0)
    expect(v.rows.some((r) => Number(r.cells.surcharge) >= 0)).toBe(true)
    for (const r of v.rows) expect(Number(r.cells.base) + Number(r.cells.surcharge)).toBeCloseTo(Number(r.cells.total), 6)
    const none = detailsView({ table: 'medicare', pick: 'plan', future: 'rough', rows: ready(steady.rows.map((r) => ({ ...r, premiums: { ...r.premiums, medicare: 0, irmaaSurcharge: 0 } }))) })
    expect(none.kind === 'table' && none.empty).toBe(copy.taxStratMedicareNone)
    expect(none.kind === 'table' && none.notes).toEqual([])
  })

  it('Medicare: the line beside each year’s income is the one the engine bills against — the bill two years on carries a surcharge exactly when that income is above it', () => {
    // `surplus` with a Roth conversion pushes some years' income past the pinned year's own line but not past the
    // line the engine compares (the price frame's band), so a column that printed the raw pinned line reds here.
    // ($140,000 a year for nine years lands 2027 to 2030 between the two.)
    const converting = { ...DEV_SEEDS.surplus, rothConversion: { annualAmountReal: 140_000, startYearOffset: 0, years: 9 } }
    const pinnedFirst = irmaa.value.tiers[0]!
    let over = 0
    let under = 0
    let inFrameBand = 0
    const runs = [
      ['retired', RETIRED],
      ['surplus', DEV_SEEDS.surplus],
      ['surplus converting', converting],
    ] as const
    for (const [name, seed] of runs) {
      const run = steadyFor(headlineAnswer(seed))
      const v = detailsView({ table: 'medicare', pick: 'plan', future: 'steady', rows: { kind: 'ready', rows: run.rows, meta: run.meta, updating: false, answerKey: 'k' } })
      if (v.kind !== 'table') throw new Error(v.kind)
      const headers = v.columns.map((c) => c.header)
      expect(headers.indexOf(copy.taxStratColIrmaaLine)).toBe(headers.indexOf(copy.taxStratColIrmaaIncome) + 1)
      expect(v.notes).toHaveLength(1)
      const byYear = new Map(v.rows.map((r) => [Number(r.cells.year), r]))
      for (const r of v.rows) {
        const billed = byYear.get(Number(r.cells.year) + 2)
        if (billed === undefined) continue
        const income = Number(r.cells['irmaa-income'])
        const above = income > Number(r.cells['irmaa-line'])
        if (above) over++
        else under++
        if (!above && income > (Number(r.cells['irmaa-line']) > pinnedFirst.mfjMagiThreshold ? pinnedFirst.mfjMagiThreshold : pinnedFirst.singleMagiThreshold)) inFrameBand++
        expect(Number(billed.cells.surcharge) > 0, `${name} ${r.cells.year}: income ${r.cells['irmaa-income']} vs line ${r.cells['irmaa-line']}`).toBe(above)
      }
    }
    // Both sides reached, and the price frame's band, or the check above proves less than it says.
    expect({ over: over > 0, under: under > 0, inFrameBand: inFrameBand > 0 }).toEqual({ over: true, under: true, inFrameBand: true })
  })
})
