import { describe, expect, it } from 'vitest'
import { DEFAULT_DISPLAY, type TimeAxis } from '../../../displaySettings'
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
import type { SolveRecommendation } from '@engine/solver/solve'
import { armBundle, COMPARISON_CHARTS, comparisonView, detailsView, taxBundles, taxRunsGate } from '../taxRunsView'
import { DEFAULT_HEIR_BRACKET, strategiesView } from '../strategiesView'
import { armFor, committed, grade, headlineAnswer, leaveMoreRec, snap } from './fixtures'

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

describe('Comparison and Details run only beside an active Winner card', () => {
  const gateFor = (payload: SolveRecommendation) =>
    taxRunsGate(
      strategiesView({
        snapshot: snap(RETIRED, answer, committed(payload)),
        picked: { goal: payload.goal, heirBracket: DEFAULT_HEIR_BRACKET },
        save: { kind: 'none' },
        readOnly: false,
        todayEpochDay: 20_400,
        wallCalendarYear: RETIRED.startCalendarYear,
        repick: false,
      }),
      payload,
    )
  const bequest = (taxable: [number, number]) => ({ terminalTaxableReal: taxable, terminalPretaxReal: [100_000, 100_000], terminalRothReal: [0, 0], terminalHsaReal: [0, 0] })

  it('an active recommendation runs both strategies', () => {
    expect(gateFor(leaveMoreRec())).toEqual({ kind: 'run' })
  })

  it('the recommendation IS your plan: the same-as-plan words, which are true there', () => {
    expect(gateFor(leaveMoreRec({ noChange: true }))).toEqual({ kind: 'words', words: copy.taxStratSameAsPlan, toStrategies: false })
  })

  it('a sub-tenth collapse alone is an ACTIVE card (round 3 of milestone 2’s review): both strategies run', () => {
    expect(gateFor(leaveMoreRec({ grade: grade('just-do-it', true) }))).toEqual({ kind: 'run' })
  })

  it('the no-dollar register on a DIFFERENT strategy (a seed-B inversion): the Strategies tab’s own words, never "your plan as it stands"', () => {
    const inverted = gateFor(leaveMoreRec({ noActionBaseline: armFor('leave-more', 'proportional|user|0', 'proportional', bequest([450_000, 650_000])) }))
    expect(inverted).toEqual({ kind: 'words', words: copy.recComposeAlready, toStrategies: false })
  })

  it('a payload the render guard refused: the Strategies tab’s unavailable words, never a chart of it', () => {
    const p = leaveMoreRec()
    const lying = leaveMoreRec({ winner: { ...p.winner, headlineStatisticB: p.winner.headlineStatisticB + 100_000 } })
    expect(gateFor(lying)).toEqual({ kind: 'words', words: copy.recommendUnavailable, toStrategies: true })
  })

  it('before a solve: the waiting words and the door to Strategies', () => {
    const v = strategiesView({ snapshot: snap(RETIRED, answer), picked: { goal: 'leave-more', heirBracket: DEFAULT_HEIR_BRACKET }, save: { kind: 'none' }, readOnly: false, todayEpochDay: 20_400, wallCalendarYear: RETIRED.startCalendarYear, repick: false })
    expect(taxRunsGate(v, null)).toEqual({ kind: 'words', words: copy.taxStratWaiting, toStrategies: true })
  })
})

describe('Comparison', () => {
  it('every chart is named for its market, steady or rough', () => {
    for (const { id, label } of COMPARISON_CHARTS) {
      for (const future of ['steady', 'rough'] as const) {
        const v = comparisonView({ timeAxis: 'ages', chart: id, future, winner: ready(), baseline: ready(), stateClause: null })
        if (v.kind !== 'pair' && v.kind !== 'stacks') throw new Error(v.kind)
        expect(v.title).toBe(slots.taxStratInMarket(label, future === 'steady'))
      }
    }
  })

  it('income tax: the recommendation green and solid, your plan today compared; the difference in words; the page’s one state clause beneath', () => {
    const v = comparisonView({ timeAxis: 'ages', chart: 'tax', future: 'steady', winner: ready(lowerTax), baseline: ready(), stateClause: copy.verdictStateUnpricedNote })
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
    const assets = comparisonView({ timeAxis: 'ages', chart: 'assets', future: 'steady', winner: ready(), baseline: ready(), stateClause: copy.verdictStateUnpricedNote })
    expect(assets.kind === 'pair' && assets.notes, 'the assets chart says what its balance counts').toEqual([copy.taxStratAssetsNote])
  })

  it('the same two runs read "about the same", never a $0 difference', () => {
    const v = comparisonView({ timeAxis: 'ages', chart: 'rmd', future: 'rough', winner: ready(), baseline: ready(), stateClause: null })
    expect(v.kind === 'pair' && v.metric).toBe(slots.taxStratCompareRmd('0', 'same', false))
  })

  it('withdrawals: two stacks side by side on ONE scale, the stack order listed', () => {
    const v = comparisonView({ timeAxis: 'ages', chart: 'withdrawals', future: 'steady', winner: ready(lowerTax), baseline: ready(), stateClause: null })
    if (v.kind !== 'stacks') throw new Error(v.kind)
    expect(v.stacks.map((s) => s.title)).toEqual([copy.recVizWithLabel, copy.recVizWithoutLabel])
    const top = Math.max(...steady.rows.map((r) => r.draw.taxable + r.draw.pretax + r.draw.roth + r.hsaSpend))
    expect(v.lattice.ceiling).toBeGreaterThanOrEqual(top)
    expect(v.notes).toEqual([copy.taxStratStackOrder])
  })

  it('a run that ran out early: every total counts only the years both runs reach, and a note names which ran out and when', () => {
    const k = 10
    expect(steady.rows.length, 'the run is long enough to cut').toBeGreaterThan(k + 2)
    expect(steady.rows.some((r) => r.ranOut), 'the steady run never runs out').toBe(false)
    // The recommendation's run stops at row k, its last row the ran-out year; your plan today runs the whole horizon.
    const short = lowerTax.slice(0, k + 1).map((r, i) => (i === k ? { ...r, ranOut: true } : r))
    const through = steady.meta.startCalendarYear + steady.rows[k]!.t
    const sumTo = (rows: readonly LedgerYearRow[]) => rows.slice(0, k + 1).reduce((a, r) => a + Math.max(0, r.taxPaid), 0)
    const v = comparisonView({ timeAxis: 'ages', chart: 'tax', future: 'rough', winner: ready(short), baseline: ready(), stateClause: null })
    if (v.kind !== 'pair') throw new Error(v.kind)
    expect(v.metric).toBe(slots.taxStratCompareTax(formatDeltaDollar(sumTo(lowerTax) - sumTo(steady.rows)), 'less', false, through))
    expect(v.notes).toEqual([slots.taxStratRanOut(through, null, false, true)])
    // Required withdrawals and conversions read the same window; your plan's run running out names it instead.
    const rmd = comparisonView({ timeAxis: 'ages', chart: 'rmd', future: 'steady', winner: ready(), baseline: ready(short), stateClause: null })
    if (rmd.kind !== 'pair') throw new Error(rmd.kind)
    expect(rmd.metric).toBe(slots.taxStratCompareRmd('0', 'same', true, through))
    expect(rmd.notes).toEqual([slots.taxStratRanOut(null, through, true, true)])
    // The assets metric reads the same last shared year.
    const assets = comparisonView({ timeAxis: 'ages', chart: 'assets', future: 'steady', winner: ready(short), baseline: ready(), stateClause: null })
    expect(assets.kind === 'pair' && assets.metric).toContain(String(through))
    expect(assets.kind === 'pair' && assets.notes).toEqual([slots.taxStratRanOut(through, null, true, true), copy.taxStratAssetsNote])
    // The withdrawal stacks draw every year of each run and count nothing: the note names the run-out, never a count.
    const stacks = comparisonView({ timeAxis: 'ages', chart: 'withdrawals', future: 'steady', winner: ready(short), baseline: ready(), stateClause: null })
    if (stacks.kind !== 'stacks') throw new Error(stacks.kind)
    expect(stacks.notes).toEqual([copy.taxStratStackOrder, slots.taxStratRanOut(through, null, true, false)])
    expect(stacks.notes.join(' ')).not.toMatch(/counts only/)
    // Details names it under the run that ran out.
    const d = detailsView({ table: 'withdrawals', pick: 'recommended', future: 'rough', rows: ready(short) })
    expect(d.kind === 'table' && d.notes).toEqual([slots.taxStratDetailsRanOut(through, false)])
  })

  it('both runs run out, in different years: the note names each with its own year, and the totals count to the earlier', () => {
    const k = 8
    const j = 11
    const cut = (rows: readonly LedgerYearRow[], n: number) => rows.slice(0, n + 1).map((r, i) => (i === n ? { ...r, ranOut: true } : r))
    const early = steady.meta.startCalendarYear + steady.rows[k]!.t
    const late = steady.meta.startCalendarYear + steady.rows[j]!.t
    // Your plan today runs out first; the recommended strategy later (never left looking as if it lasts).
    const v = comparisonView({ timeAxis: 'ages', chart: 'tax', future: 'rough', winner: ready(cut(lowerTax, j)), baseline: ready(cut(steady.rows, k)), stateClause: null })
    if (v.kind !== 'pair') throw new Error(v.kind)
    expect(v.notes).toEqual([slots.taxStratRanOut(late, early, false, true)])
    expect(v.notes[0]).toBe(
      `In the rough market the money runs out in ${early} on your plan today and in ${late} on the recommended strategy, and each one’s year-by-year figures stop there, so the comparison here counts only the years through ${early}, which both strategies reach.`,
    )
    expect(v.metric).toContain(`Through ${early}`)
  })

  it('the time axis (Act 6 · RC18): by default the first person’s age (it was the calendar year before the Display drawer), on the years axis the year; the points keep their years and each spoken point names the axis’s number', () => {
    const start = steady.meta.startCalendarYear
    const age0 = steady.meta.people[0]!.currentAge
    expect(age0, '[test setup] Alex is 66 in the plan’s first year').toBe(66)
    const at = (timeAxis: TimeAxis, chart: 'tax' | 'withdrawals') => {
      const v = comparisonView({ timeAxis, chart, future: 'steady', winner: ready(lowerTax), baseline: ready(), stateClause: null })
      if (v.kind !== 'pair' && v.kind !== 'stacks') throw new Error(v.kind)
      return v
    }
    // The default (the drawer's own default): Alex's age, 66 at the plan's first year.
    const ages = at(DEFAULT_DISPLAY.timeAxis, 'tax')
    expect(ages.axisTitle).toBe('Alex’s age')
    expect(ages.axisOffset).toBe(66 - start)
    if (ages.kind !== 'pair') throw new Error(ages.kind)
    expect(ages.series[0].points[0]!.year, 'the points keep their calendar year; the chart maps them').toBe(start)
    expect(ages.series[0].points[0]!.year + ages.axisOffset).toBe(66)
    expect(ages.pointWords(71, copy.recVizWithLabel, 12_000)).toBe(slots.claimsYearPoint('Alex’s age', 71, copy.recVizWithLabel, '12,000'))
    expect(at('ages', 'withdrawals')).toMatchObject({ axisTitle: 'Alex’s age', axisOffset: 66 - start })
    // The years axis: no offset, titled "Year", each point spoken as its year (the words before the drawer).
    const years = at('years', 'tax')
    expect(years.axisTitle).toBe(copy.chartAxisYear)
    expect(years.axisOffset).toBe(0)
    expect(years.pointWords(start + 5, copy.recVizWithLabel, 12_000)).toBe(slots.taxStratChartPoint(start + 5, copy.recVizWithLabel, '12,000'))
    expect(at('years', 'withdrawals')).toMatchObject({ axisTitle: copy.chartAxisYear, axisOffset: 0 })
    // The metric and the notes are the same words on either axis.
    expect(years.kind === 'pair' && years.metric).toBe(ages.metric)
  })

  it('a run still working, refused or failed shows words, never a half picture', () => {
    expect(comparisonView({ timeAxis: 'ages', chart: 'tax', future: 'steady', winner: { kind: 'loading' }, baseline: ready(), stateClause: null })).toEqual({ kind: 'waiting', words: copy.taxStratRunsWaiting })
    expect(comparisonView({ timeAxis: 'ages', chart: 'tax', future: 'steady', winner: ready(), baseline: { kind: 'withheld', words: 'w' }, stateClause: null })).toEqual({ kind: 'withheld', words: 'w' })
    expect(comparisonView({ timeAxis: 'ages', chart: 'tax', future: 'steady', winner: { kind: 'error' }, baseline: ready(), stateClause: null })).toEqual({ kind: 'withheld', words: copy.taxStratRunsError })
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
    expect(v.notes, 'no inherited IRA, no inherited note').not.toContain(copy.taxStratDetailsInheritedNote)
  })

  it('a household holding an inherited IRA: its withdrawal and its balance get columns, and the required-withdrawals chart says it counts the household’s own', () => {
    const inh = steadyFor(headlineAnswer(DEV_SEEDS.inherited))
    const run: RunRows = { kind: 'ready', rows: inh.rows, meta: inh.meta, updating: false, answerKey: 'k1' }
    const v = detailsView({ table: 'withdrawals', pick: 'plan', future: 'steady', rows: run })
    if (v.kind !== 'table') throw new Error(v.kind)
    const headers = v.columns.map((c) => c.header)
    expect(headers.indexOf(copy.taxStratColFromInherited)).toBe(headers.indexOf(copy.taxStratColFromRoth) + 1)
    expect(headers.at(-1)).toBe(copy.taxStratColInheritedEnd)
    // Each year's figures are the sink's own: what the ledgers paid toward the year and their year-end balances.
    inh.rows.forEach((r, i) => {
      const spent = (r.inherited ?? []).reduce((s, e) => s + e.taken - e.movedToTaxable, 0)
      expect(v.rows[i]!.cells['from-inherited']).toBeCloseTo(spent, 6)
      expect(v.rows[i]!.cells['inherited-end']).toBeCloseTo((r.inherited ?? []).reduce((s, e) => s + e.end, 0), 6)
    })
    expect(inh.rows.some((r) => (r.inherited ?? []).some((e) => e.taken > 0)), '[test setup] the ledgers pay something').toBe(true)
    expect(v.notes).toContain(copy.taxStratDetailsInheritedNote)
    const rmd = comparisonView({ timeAxis: 'ages', chart: 'rmd', future: 'steady', winner: run, baseline: run, stateClause: null })
    if (rmd.kind !== 'pair') throw new Error(rmd.kind)
    expect(rmd.notes).toContain(copy.taxStratRmdInheritedNote)
    const plain = comparisonView({ timeAxis: 'ages', chart: 'rmd', future: 'steady', winner: ready(), baseline: ready(), stateClause: null })
    if (plain.kind !== 'pair') throw new Error(plain.kind)
    expect(plain.notes).not.toContain(copy.taxStratRmdInheritedNote)
  })

  it('Medicare: the income it reads, the premium before the surcharge, the surcharge and the total, which add up; no Medicare years says so', () => {
    const v = detailsView({ table: 'medicare', pick: 'plan', future: 'rough', rows: ready() })
    if (v.kind !== 'table') throw new Error(v.kind)
    expect(v.heading).toBe(slots.taxStratDetailsOf(copy.recVizWithoutLabel, false))
    expect(v.rows.length, 'the retired household has Medicare years').toBeGreaterThan(0)
    // Each row is that year's own bill, read from the ledger's own fields.
    const billed = new Map(steady.rows.map((r) => [String(steady.meta.startCalendarYear + r.t), r]))
    for (const r of v.rows) {
      const row = billed.get(String(r.cells.year))!
      expect(r.cells.total).toBe(row.premiums.medicare)
      expect(r.cells.surcharge).toBe(row.premiums.irmaaSurcharge)
    }
    expect(v.columns.slice(-3).map((c) => c.header), 'the bill columns say they are this year’s bill').toEqual([copy.taxStratColMedicareBase, copy.taxStratColSurcharge, copy.taxStratColMedicareTotal])
    for (const h of [copy.taxStratColMedicareBase, copy.taxStratColSurcharge, copy.taxStratColMedicareTotal]) expect(h).toMatch(/^This year’s /)
    // The surcharge's header names the income that set it, never "this year's income surcharge" beside the income column.
    expect(copy.taxStratColSurcharge).toMatch(/two years earlier/)
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
