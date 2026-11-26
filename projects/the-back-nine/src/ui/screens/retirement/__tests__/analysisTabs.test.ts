import { describe, expect, it } from 'vitest'
import { simulate } from '@engine/simulate'
import type { LedgerWorkingYear, LedgerYearRow } from '@shared/model'
import { DEV_SEEDS } from '../../../devSeeds'
import { copy, slots } from '../../../copy'
import { formatDeltaDollar } from '../../../money'
import { tableRunFor, type TableMeta } from '../../../workbench/tableRun'
import { headlineAnswer } from '../../tax/__tests__/fixtures'
import type { RunRows } from '../cashFlowsView'
import { endTotal, premiumsOf, startTotal, withdrawn, type AnalysisInput, type RunSide } from '../analysisRuns'
import { comparisonsView, type ComparisonsChart } from '../comparisonsView'
import { retirementDetailsView, type RetirementDetailsChart } from '../retirementDetailsView'
import { savingsView, type SavingsChart } from '../savingsView'

/**
 * Analysis's Comparisons, Savings and Retirement Details (Act 6 · RC17): each series equals its row fields; the year the
 * money ran out draws a hatched band and no dollar figure; every window a total covers is chosen and said (insight 175:
 * a run that ran out early beside one that did not); the one-path metrics name their market; Savings for an all-retired
 * household offers one chart; a working household with no W says "not asked yet" (insight 178); a read-only view carries
 * no write action. The retired rows are the engine's own steady run of the `retired` seed, never hand-typed; the working
 * rows are those rows given pay checks, so every figure still reads the fields under test.
 */

function steadyRun(): { rows: readonly LedgerYearRow[]; meta: TableMeta } {
  const run = tableRunFor(headlineAnswer(DEV_SEEDS.retired))
  if (run.kind !== 'run' || run.views.steady.kind !== 'run') throw new Error(`no steady run: ${run.kind}`)
  const { params, seed, options } = run.views.steady.request
  const out = simulate(params, seed, options)
  if (out.indeterminate || out.infeasible) throw new Error('the steady run failed')
  const rows = out.distribution.ledgerRows
  if (rows === undefined || rows.length === 0) throw new Error('no ledger')
  return { rows, meta: run.meta }
}

const RETIRED = steadyRun()
const START = RETIRED.meta.startCalendarYear
const ready = (rows: readonly LedgerYearRow[], meta: TableMeta = RETIRED.meta, answerKey = 'k1'): RunRows => ({ kind: 'ready', rows, meta, updating: false, answerKey })
const side = (id: RunSide['id'], rows: RunRows, title = id === 'compared' ? 'Your plan' : 'New what-if'): RunSide => ({ id, title, mid: title.toLowerCase(), rows })
const input = (o: Partial<AnalysisInput> = {}): AnalysisInput => ({
  future: 'steady',
  compared: side('compared', ready(RETIRED.rows)),
  alternative: null,
  timeAxis: 'ages',
  stateClause: 'STATE CLAUSE',
  roughWhat: 'ROUGH WHAT',
  readOnly: false,
  ...o,
})

/** A run whose money runs out at row `k` (its last row: flows asked for, close zero). */
function ranOutAt(rows: readonly LedgerYearRow[], k: number): LedgerYearRow[] {
  const zero = { taxable: 0, pretax: 0, roth: 0, hsa: 0 }
  return rows.slice(0, k + 1).map((r, i) => (i === k ? { ...r, ranOut: true, end: zero } : r))
}

/** The retired rows given a pay check in their first three years: a working household stopping in START + 3. */
const STOP_T = 3
const WORKING_META: TableMeta = { ...RETIRED.meta, route: 'dated', stopYear: START + STOP_T, stopFrom: 'answer' }
function withPay(withW: boolean): LedgerYearRow[] {
  return RETIRED.rows.map((r) => {
    if (r.t >= STOP_T) return r
    const contribution = { taxable: 5_000 + r.t * 100, pretax: 20_000, roth: 7_000, hsa: 4_000 }
    const w: LedgerWorkingYear = {
      pay: 150_000,
      socialSecurity: 0,
      otherIncome: 0,
      payrollTax: 11_000,
      taxOnOutsideIncome: 20_000,
      ownDeposits: 30_000,
      workingYearCost: 100_000,
      leftOver: r.t === 1 ? -6_000 : 9_000,
      shortfall: r.t === 1 ? 6_000 : 0,
    }
    return { ...r, payByPerson: [150_000, 0], contribution, ...(withW ? { workingYear: w } : {}) }
  })
}

describe('Comparisons', () => {
  const cmp = (chart: ComparisonsChart, o: Partial<AnalysisInput> = {}) => comparisonsView({ ...input(o), chart })

  it('with no what-if open: your plan alone, its line each row’s year-end total, and the line saying how to set one beside it', () => {
    const v = cmp('assets')
    if (v.kind !== 'pair') throw new Error(v.kind)
    expect(v.series).toHaveLength(1)
    expect(v.series[0]!.points).toEqual(RETIRED.rows.map((r) => ({ year: START + r.t, value: r.end.taxable + r.end.pretax + r.end.roth + r.end.hsa })))
    expect(v.notes[0]).toBe(copy.cmpNoWhatIf)
    expect(v.metric).toContain('in the steady market')
    expect(v.notes, 'the page’s one state clause').toContain('STATE CLAUSE')
  })

  it('two sides: the alternative green on the left, the metric at the last year both reach, named with its year and ages', () => {
    const more = RETIRED.rows.map((r) => ({ ...r, end: { ...r.end, taxable: r.end.taxable + 50_000 } }))
    const v = cmp('assets', { alternative: side('alternative', ready(more)) })
    if (v.kind !== 'pair') throw new Error(v.kind)
    expect(v.series.map((s) => s.role)).toEqual(['alternative', 'compared'])
    const last = RETIRED.rows.at(-1)!
    expect(v.metric.startsWith(`New what-if has ~$${formatDeltaDollar(50_000)} more invested at age`)).toBe(true)
    expect(v.metric.endsWith(`(${START + last.t}) than your plan, in the steady market.`)).toBe(true)
  })

  it('a run that ran out early beside one that did not: the comparison and the tax total stop at the years both reach, said so; the ran-out line ends in words, never "~$0"', () => {
    const k = 12
    const short = ranOutAt(RETIRED.rows, k)
    const o = { alternative: side('alternative', ready(short)) }
    const assets = cmp('assets', o)
    if (assets.kind !== 'pair') throw new Error(assets.kind)
    const outYear = START + k
    expect(assets.series[0]!.endWord).toBe(slots.analysisEndWord(outYear))
    expect(assets.series[1]!.endWord, 'the run that lasted ends in its figure').toBeUndefined()
    expect(assets.metric, 'compared in the ran-out year, where the alternative holds nothing').toContain(`(${outYear})`)
    expect(assets.metric).toContain('less invested')
    expect(assets.notes).toContain(slots.analysisRanOut([{ name: 'new what-if', year: outYear }], true, outYear))
    const tax = cmp('tax', o)
    if (tax.kind !== 'pair') throw new Error(tax.kind)
    // The ran-out row's tax is what the year asked for: no point, and the totals run through the last year both PAID.
    expect(tax.series[0]!.points.map((p) => p.year).at(-1)).toBe(outYear - 1)
    const through = outYear - 1
    const total = (rows: readonly LedgerYearRow[]) => rows.filter((r) => !r.ranOut && START + r.t <= through).reduce((s, r) => s + r.taxPaid, 0)
    const d = total(short) - total(RETIRED.rows)
    expect(tax.metric).toBe(slots.cmpTaxMore('New what-if', formatDeltaDollar(d), formatDeltaDollar(d) === '0' ? 'same' : d > 0 ? 'more' : 'less', through, 'your plan', true))
    expect(tax.notes).toContain(slots.analysisRanOut([{ name: 'new what-if', year: outYear }], true, through))
  })

  it('as retirement begins: each bar is its side’s OPENING total in its own first retired year, on one scale; equal bars say nothing moved', () => {
    const spine = cmp('at-retirement', { alternative: side('alternative', ready(RETIRED.rows)) })
    if (spine.kind !== 'bars') throw new Error(spine.kind)
    expect(spine.bars.map((b) => b.value)).toEqual([startTotal(RETIRED.rows[0]!), startTotal(RETIRED.rows[0]!)])
    expect(spine.bars.map((b) => [b.colorIndex, b.pattern])).toEqual([[1, 'solid'], [0, 'hatch']])
    expect(spine.metric).toBe(slots.cmpAtRetirementSame(formatDeltaDollar(startTotal(RETIRED.rows[0]!)), true))
    const later: TableMeta = { ...WORKING_META, stopYear: START + 5 }
    const v = cmp('at-retirement', { compared: side('compared', ready(RETIRED.rows, WORKING_META)), alternative: side('alternative', ready(RETIRED.rows, later)) })
    if (v.kind !== 'bars') throw new Error(v.kind)
    expect(v.bars[0]!.value).toBe(startTotal(RETIRED.rows[5]!))
    expect(v.bars[1]!.value).toBe(startTotal(RETIRED.rows[STOP_T]!))
    expect(v.bars[0]!.name).toContain(`${START + 5} (`)
    expect(v.bars[1]!.name).toContain(`${START + STOP_T} (`)
    expect(v.ticks[0]!.dollars).toBe(0)
  })

  it('a run whose money runs out in its first year draws no $0 picture: the words say so', () => {
    const o = { compared: side('compared', ready(ranOutAt(RETIRED.rows, 0))) }
    for (const chart of ['assets', 'tax'] as const) {
      expect(cmp(chart, o), chart).toEqual(expect.objectContaining({ kind: 'words', words: slots.analysisRanOut([{ name: 'your plan', year: START }], true, null) }))
    }
  })

  it('the rough market is named in every metric and its words replace the steady line', () => {
    for (const chart of ['assets', 'tax', 'at-retirement'] as const) {
      const v = cmp(chart, { future: 'rough' })
      if (v.kind === 'words') throw new Error('words')
      expect(v.metric, chart).toContain('in the rough market')
      expect(v.notes, chart).toContain('ROUGH WHAT')
    }
  })

  it('the sides gate: a withheld side says why; one still running, or two on different answers, waits', () => {
    expect(cmp('assets', { compared: side('compared', { kind: 'withheld', words: 'WHY' }) })).toMatchObject({ kind: 'words', words: 'WHY' })
    expect(cmp('assets', { alternative: side('alternative', { kind: 'loading' }) })).toMatchObject({ kind: 'words', words: copy.analysisRunsWaiting })
    expect(cmp('assets', { alternative: side('alternative', ready(RETIRED.rows, RETIRED.meta, 'k2')) })).toMatchObject({ kind: 'words', words: copy.analysisRunsWaiting })
    expect(cmp('assets', { alternative: side('alternative', { kind: 'error' }) })).toMatchObject({ kind: 'words', words: copy.analysisRunsError })
  })
})

describe('Retirement Details', () => {
  const rd = (chart: RetirementDetailsChart, o: Partial<AnalysisInput> = {}) => retirementDetailsView({ ...input(o), chart })

  it('income sources: each part equals its row field, every retired year, from the bottom', () => {
    const v = rd('income:compared')
    if (v.kind !== 'years') throw new Error(v.kind)
    expect(v.sources.map((s) => s.id)).toEqual(['social-security', 'other', 'taxable', 'pretax', 'roth', 'hsa'])
    const at = (id: string) => v.sources.find((s) => s.id === id)!.points.map((p) => p.value)
    expect(at('social-security')).toEqual(RETIRED.rows.map((r) => r.socialSecurity))
    expect(at('other')).toEqual(RETIRED.rows.map((r) => r.otherIncomeByPerson.reduce((s, o) => s + o.gross, 0)))
    expect(at('taxable')).toEqual(RETIRED.rows.map((r) => r.draw.taxable))
    expect(at('pretax')).toEqual(RETIRED.rows.map((r) => r.draw.pretax))
    expect(at('roth')).toEqual(RETIRED.rows.map((r) => r.draw.roth))
    expect(at('hsa')).toEqual(RETIRED.rows.map((r) => r.hsaSpend))
    expect(v.ranOut).toBeUndefined()
    expect(v.metrics[1]).toBe(slots.rdShortNone(true))
    expect(v.metrics[0]).toContain('in the steady market')
  })

  it('a short year draws the hatched band with its words and no dollar figure, and no column; the metric names the year', () => {
    const k = 10
    const v = rd('income:compared', { compared: side('compared', ready(ranOutAt(RETIRED.rows, k))) })
    if (v.kind !== 'years') throw new Error(v.kind)
    expect(v.ranOut).toEqual({ year: START + k, label: copy.rdRanOutBand })
    expect(v.ranOut!.label).not.toMatch(/\$|\d/)
    for (const s of v.sources) expect(s.points.some((p) => p.year === START + k), `${s.id}: no column in the ran-out year`).toBe(false)
    expect(v.metrics[1]).toMatch(new RegExp(`^In the steady market the money runs out in ${START + k}, at ages? `))
  })

  it('a run that runs out before its first retired year says so plainly, never that a band is drawn', () => {
    const v = rd('income:compared', { compared: side('compared', ready(ranOutAt(RETIRED.rows, 1), WORKING_META)) })
    expect(v.kind).toBe('words')
    if (v.kind !== 'words') return
    expect(v.words).toContain(slots.analysisRanOut([{ name: 'your plan', year: START + 1 }], true, null))
    expect(v.words).not.toMatch(/hatched/)
  })

  it('the withdrawal rate is the year’s withdrawals toward its need over its opening total, never a conversion', () => {
    const v = rd('rate:compared')
    if (v.kind !== 'years') throw new Error(v.kind)
    expect(v.percent).toBe(true)
    const want = RETIRED.rows.filter((r) => startTotal(r) > 0).map((r) => ({ year: START + r.t, value: (withdrawn(r) / startTotal(r)) * 100 }))
    expect(v.sources[0]!.points).toEqual(want)
    expect(withdrawn(RETIRED.rows[0]!)).toBe(RETIRED.rows[0]!.draw.taxable + RETIRED.rows[0]!.draw.pretax + RETIRED.rows[0]!.draw.roth + RETIRED.rows[0]!.hsaSpend)
  })

  it('spending stacks spending, income tax and health premiums, each its field', () => {
    const v = rd('spending:compared')
    if (v.kind !== 'years') throw new Error(v.kind)
    const at = (id: string) => v.sources.find((s) => s.id === id)!.points.map((p) => p.value)
    expect(at('spending')).toEqual(RETIRED.rows.map((r) => r.spending ?? 0))
    expect(at('tax')).toEqual(RETIRED.rows.map((r) => r.taxPaid))
    expect(at('premiums')).toEqual(RETIRED.rows.map((r) => r.premiums.acaNet + r.premiums.medicare + r.premiums.medicareExtras))
    expect(premiumsOf(RETIRED.rows[0]!)).toBe(RETIRED.rows[0]!.premiums.acaNet + RETIRED.rows[0]!.premiums.medicare + RETIRED.rows[0]!.premiums.medicareExtras)
  })

  it('the menu: one side offers its three charts; two sides add the comparisons, and a comparison asked of one side falls back', () => {
    expect(rd('income-comparison').chart).toBe('income:compared')
    expect(rd('income:compared').charts.map((c) => c.id)).toEqual(['income:compared', 'rate:compared', 'spending:compared'])
    const two = rd('income:compared', { alternative: side('alternative', ready(RETIRED.rows)) })
    expect(two.charts.map((c) => c.id)).toContain('income-comparison')
    expect(two.charts.map((c) => c.id)).toContain('spending-comparison')
  })

  it('the comparisons count ONE window, the retired years both sides share, from the later first retired year', () => {
    const later: TableMeta = { ...WORKING_META, stopYear: START + 5 }
    const o = { compared: side('compared', ready(RETIRED.rows, WORKING_META)), alternative: side('alternative', ready(RETIRED.rows, later)) }
    const g = rd('spending-comparison', o)
    if (g.kind !== 'grouped') throw new Error(g.kind)
    const last = START + RETIRED.rows.at(-1)!.t
    expect(g.notes[0]).toBe(slots.rdWindowNote(START + 5, last))
    const inWindow = RETIRED.rows.filter((r) => r.t >= 5)
    expect(g.series[1]!.values[0]).toBe(inWindow.reduce((s, r) => s + (r.spending ?? 0), 0))
    const d = rd('income-comparison', o)
    if (d.kind !== 'donuts') throw new Error(d.kind)
    expect(d.metric).toContain(`From ${START + 5} through ${last}`)
    for (const donut of d.donuts) expect(donut.parts.reduce((s, p) => s + p.share, 0)).toBeCloseTo(1, 9)
  })
})

describe('Savings', () => {
  const sav = (chart: SavingsChart, working: boolean, o: Partial<AnalysisInput> = {}) => savingsView({ ...input(o), chart, working })

  it('an all-retired household sees one chart, this year’s deposits, and the line saying why', () => {
    const v = sav('per-year:compared', false)
    expect(v.charts).toEqual([{ id: 'this-year:compared', label: slots.savThisYearOf('Your plan') }])
    expect(v.chart).toBe('this-year:compared')
    expect(v.kind === 'words' || v.kind === 'bars' ? v.notes : []).toContain(copy.savRetiredNote)
  })

  it('a working household: this year’s bars are row one’s deposits by kind; each year’s are the working rows’ fields; the share and the left over read the pay check', () => {
    const rows = withPay(true)
    const o = { compared: side('compared', ready(rows, WORKING_META)) }
    const now = sav('this-year:compared', true, o)
    if (now.kind !== 'bars') throw new Error(now.kind)
    expect(now.bars.map((b) => b.value)).toEqual([rows[0]!.contribution.taxable, rows[0]!.contribution.pretax, rows[0]!.contribution.roth, rows[0]!.contribution.hsa])
    expect(now.metrics[1]).toBe(slots.savOwnShare(formatDeltaDollar(30_000), '20', formatDeltaDollar(150_000)))
    expect(now.door).toBeUndefined()
    const per = sav('per-year:compared', true, o)
    if (per.kind !== 'years') throw new Error(per.kind)
    expect(per.sources.find((s) => s.id === 'taxable')!.points).toEqual([0, 1, 2].map((t) => ({ year: START + t, value: 5_000 + t * 100 })))
    const share = sav('share:compared', true, o)
    if (share.kind !== 'years') throw new Error(share.kind)
    expect(share.sources[0]!.points.map((p) => p.value)).toEqual([20, 20, 20])
    const left = sav('left-over:compared', true, o)
    if (left.kind !== 'years') throw new Error(left.kind)
    expect(left.sources.find((s) => s.id === 'left')!.points.map((p) => p.value)).toEqual([9_000, 0, 9_000])
    expect(left.sources.find((s) => s.id === 'short')!.points.map((p) => p.value)).toEqual([-0, -6_000, -0])
    expect(left.metrics[0]).toBe(slots.savLeftOver(formatDeltaDollar(12_000), 'left', START, START + 2, true))
    // What the run keeps of a left over is its own field (`leftOverCredit`): none here, said so.
    expect(rows.slice(0, STOP_T).every((r) => r.leftOverCredit === 0), '[test setup] the base rows credit nothing').toBe(true)
    expect(left.metrics[1]).toBe(copy.savLeftOverNoneKept)
    const credited = rows.map((r) => (r.t < STOP_T ? { ...r, leftOverCredit: 4_000 } : r))
    const kept = sav('left-over:compared', true, { compared: side('compared', ready(credited, WORKING_META)) })
    if (kept.kind !== 'years') throw new Error(kept.kind)
    expect(kept.metrics[1]).toBe(slots.savLeftOverKept(formatDeltaDollar(12_000)))
    expect(left.ticks.some((t) => t.value < 0), 'a short year runs below the zero line').toBe(true)
  })

  it('no W on a working household: the share and the left over say "not asked yet" with the drawer’s door, never a zeroed chart', () => {
    const o = { compared: side('compared', ready(withPay(false), WORKING_META)) }
    for (const chart of ['share:compared', 'left-over:compared'] as const) {
      expect(sav(chart, true, o)).toMatchObject({ kind: 'unasked', words: copy.savWUnasked, door: copy.stalenessWUnansweredCta })
    }
    const now = sav('this-year:compared', true, o)
    if (now.kind !== 'bars') throw new Error(now.kind)
    expect(now.metrics).toContain(copy.savOwnUnasked)
    expect(now.door).toBe(copy.stalenessWUnansweredCta)
  })

  it('a read-only view carries no write action on any tab or chart', () => {
    const o = { readOnly: true, compared: side('compared', ready(withPay(false), WORKING_META)), alternative: side('alternative', ready(withPay(false), WORKING_META)) }
    for (const chart of ['this-year:compared', 'per-year:compared', 'share:compared', 'left-over:alternative'] as const) {
      expect('door' in sav(chart, true, o), chart).toBe(false)
    }
    for (const chart of ['assets', 'tax', 'at-retirement'] as const) expect(JSON.stringify(comparisonsView({ ...input(o), chart }))).not.toMatch(/door|onApply|onKeep|onSave/)
    for (const chart of ['income:compared', 'income-comparison', 'spending-comparison'] as const) expect(JSON.stringify(retirementDetailsView({ ...input(o), chart }))).not.toMatch(/door|onApply|onKeep|onSave/)
  })

  it('the year-end total the comparisons read is the engine’s own sum', () => {
    const r = RETIRED.rows[3]!
    expect(endTotal(r)).toBe(r.end.taxable + r.end.pretax + r.end.roth + r.end.hsa)
  })
})
