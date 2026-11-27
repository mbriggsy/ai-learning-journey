import { describe, expect, it } from 'vitest'
import { simulate } from '@engine/simulate'
import { DATE_OFFSET_WINDOW_TOP } from '@engine/dateSearch'
import { buildTableBase, carriedWorkingYearLeftOver, isDateRoute, workingYearLeftOverShownState } from '@intake/intakeMap'
import { applyBundle } from '@intake/whatIf'
import type { DateSearchOutcome, LedgerWorkingYear, LedgerYearRow, WhatIfLeverV6 } from '@shared/model'
import type { ScenarioDraft } from '@store/memoryModel'
import { DEV_SEEDS } from '../../../devSeeds'
import { copy, slots } from '../../../copy'
import { formatDeltaDollar, formatEnteredDollar } from '../../../money'
import { tableRequestsOn, tableRunFor, type TableMeta } from '../../../workbench/tableRun'
import { headlineAnswer } from '../../tax/__tests__/fixtures'
import type { RunRows } from '../cashFlowsView'
import { analysisSides, endTotal, premiumsOf, startTotal, withdrawn, type AnalysisInput, type RunSide } from '../analysisRuns'
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

/** The income tax rows pay from sim-year `fromT` on. */
const inWindowFrom = (rows: readonly LedgerYearRow[], fromT: number): number => rows.filter((r) => r.t >= fromT).reduce((s, r) => s + r.taxPaid, 0)

/** A share as the tabs print it, worked out here: a whole percent, one decimal under 10. */
const pct = (fraction: number): string => {
  const p = fraction * 100
  return p < 10 ? (Math.round(p * 10) / 10).toFixed(1) : String(Math.round(p))
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
    expect(assets.series[0]!.endWord).toEqual(slots.analysisEndWordLines(outYear))
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
    expect(tax.metric).toBe(slots.cmpTaxMore('new what-if', formatDeltaDollar(d), formatDeltaDollar(d) === '0' ? 'same' : d > 0 ? 'more' : 'less', START, through, 'your plan', true))
    expect(tax.notes).toContain(slots.analysisRanOut([{ name: 'new what-if', year: outYear }], true, through))
    expect(tax.notes, 'all retired: no working year to set apart').not.toContain(copy.cmpTaxWorkingNote)
  })

  it('income tax: a stop-year lever’s years where only one side works are left out, the window starting after them, named; a working year’s large savings tax can’t flip the direction', () => {
    // Your plan stops in START + 3 and pays a large tax on savings' income in its working years; the what-if stops in
    // START + 5 and pays $1,000 more in each retired year. Over every row the what-if pays LESS; START + 3 and + 4 hold a
    // working year on one side beside a retired year on the other, so the window starts after them, at START + 5.
    const later: TableMeta = { ...WORKING_META, stopYear: START + 5, stopFrom: 'lever' }
    const planRows = withPay(true).map((r) => (r.t < STOP_T ? { ...r, taxPaid: r.taxPaid + 50_000 } : r))
    const leverRows = withPay(true).map((r) => (r.t >= 5 ? { ...r, taxPaid: r.taxPaid + 1_000 } : r))
    const v = cmp('tax', { compared: side('compared', ready(planRows, WORKING_META)), alternative: side('alternative', ready(leverRows, later)) })
    if (v.kind !== 'pair') throw new Error(v.kind)
    const all = (rows: readonly LedgerYearRow[]) => rows.reduce((s, r) => s + r.taxPaid, 0)
    expect(all(leverRows) - all(planRows), '[test setup] over every row the what-if pays less').toBeLessThan(0)
    const last = START + RETIRED.rows.at(-1)!.t
    const inWindow = (rows: readonly LedgerYearRow[]) => rows.filter((r) => START + r.t >= START + 5).reduce((s, r) => s + r.taxPaid, 0)
    const d = inWindow(leverRows) - inWindow(planRows)
    expect(d).toBe(1_000 * RETIRED.rows.filter((r) => r.t >= 5).length)
    expect(v.metric).toBe(slots.cmpTaxMore('new what-if', formatDeltaDollar(d), 'more', START + 5, last, 'your plan', true))
    // Both lines draw exactly the years the total counts.
    for (const s of v.series) expect(s.points.map((p) => p.year)).toEqual(RETIRED.rows.filter((r) => r.t >= 5).map((r) => START + r.t))
    expect(v.series[1]!.points.map((p) => p.value)).toEqual(planRows.filter((r) => r.t >= 5).map((r) => r.taxPaid))
    // The years left out, named by which run still works (R2F3: the runs, never "them"); no working year counted, so no
    // working-year note.
    expect(v.notes).toContain(slots.cmpTaxStartsAfter(START + 5, `${START + 3} and ${START + 4}, when work has stopped in your plan but not yet in new what-if`))
    expect(v.notes.some((n) => n.includes('before work stops in either plan'))).toBe(false)
    // The dated route says a stop-year lever's own year (A6).
    expect(v.notes).toContain(slots.cashFlowsRunStopsLever('New what-if', START + 5))
    // Your plan alone, working: the chart starts when work stops, where the tax on pay shows, and the income tax its
    // savings add while it still works, which its total leaves out (X1, rule 5).
    const one = cmp('tax', { compared: side('compared', ready(planRows, WORKING_META)) })
    if (one.kind !== 'pair') throw new Error(one.kind)
    expect(one.notes).toContain(copy.cmpTaxWorkingNote)
    expect(one.notes).toContain(copy.cmpPayTaxShown)
    const workingTax = planRows.filter((r) => r.t < STOP_T).reduce((s, r) => s + r.taxPaid, 0)
    expect(one.notes).toContain(slots.cmpTaxOneWorkingSavings('your plan', formatDeltaDollar(workingTax), `${START} through ${START + 2}`, true))
    expect(one.metric).toBe(slots.cmpTaxOne('your plan', formatDeltaDollar(inWindowFrom(planRows, STOP_T)), START + STOP_T, last, true))
  })

  it('income tax: working years count beside working years, each year’s figure with W given the pay check’s income tax plus what savings add (R2F1)', () => {
    // Both stop in START + 3. The what-if pays $2,000 more savings tax in every working year and $500 more in every
    // retired year, and its START pay check carries $1,500 less income tax (it puts more into pre-tax that year): with W
    // given, every year counts, START's figure with its pay check's tax in it.
    const plan = withPay(true)
    const more = plan.map((r) => ({ ...r, taxPaid: r.taxPaid + (r.t < STOP_T ? 2_000 : 500) }))
    const deposits = more.map((r) =>
      r.t === 0 && r.workingYear !== undefined
        ? { ...r, contribution: { ...r.contribution, pretax: r.contribution.pretax + 5_000 }, workingYear: { ...r.workingYear, taxOnOutsideIncome: r.workingYear.taxOnOutsideIncome - 1_500 } }
        : r,
    )
    const v = cmp('tax', { compared: side('compared', ready(plan, WORKING_META)), alternative: side('alternative', ready(deposits, WORKING_META)) })
    if (v.kind !== 'pair') throw new Error(v.kind)
    const last = START + RETIRED.rows.at(-1)!.t
    const d = 2_000 * STOP_T + 500 * (RETIRED.rows.length - STOP_T) - 1_500
    expect(v.metric).toBe(slots.cmpTaxMore('new what-if', formatDeltaDollar(d), 'more', START, last, 'your plan', true))
    expect(WORKING_META.stateTaxReading, '[test setup] the retired seed names no state').toBe('unpriced')
    expect(v.notes).toContain(slots.cmpTaxWorkingCounted(`${START} through ${START + 2}`, true, 'maybe-in-w'))
    expect(v.notes).toContain(copy.cmpPayTaxShown)
    // The state's tax on pay, by the run's state reading (round 3's P3): PA's sits in W, so the line says it is left out;
    // NC's is in the pay check's income tax, so the line says nothing of it. The total is the same either way.
    for (const [reading, stateOnPay] of [['class-based', 'in-w'], ['agi-derived', 'counted'], ['none', 'counted']] as const) {
      const meta: TableMeta = { ...WORKING_META, stateTaxReading: reading }
      const s = cmp('tax', { compared: side('compared', ready(plan, meta)), alternative: side('alternative', ready(deposits, meta)) })
      if (s.kind !== 'pair') throw new Error(`${reading}: ${s.kind}`)
      expect(s.metric, reading).toBe(v.metric)
      expect(s.notes, reading).toContain(slots.cmpTaxWorkingCounted(`${START} through ${START + 2}`, true, stateOnPay))
    }
    expect(slots.cmpTaxWorkingCounted('2026', true, 'in-w')).toContain('neither is your state’s tax on pay')
    expect(slots.cmpTaxWorkingCounted('2026', true, 'counted')).not.toContain('state')
    expect(v.notes.some((n) => n.startsWith('The total starts in')), 'no year left out').toBe(false)
    // Both lines draw the figure the total counts: a working year's taxPaid plus its pay check's income tax.
    expect(v.series[1]!.points[0]).toEqual({ year: START, value: plan[0]!.taxPaid + 20_000 })
    expect(v.series[0]!.points[0]).toEqual({ year: START, value: deposits[0]!.taxPaid + 18_500 })
    // No W: the same pay check counts on taxPaid alone, said so with the premise that would price the tax on pay.
    const planNoW = withPay(false)
    const moreNoW = planNoW.map((r) => ({ ...r, taxPaid: r.taxPaid + (r.t < STOP_T ? 2_000 : 500) }))
    const same = cmp('tax', { compared: side('compared', ready(planNoW, WORKING_META)), alternative: side('alternative', ready(moreNoW, WORKING_META)) })
    if (same.kind !== 'pair') throw new Error(same.kind)
    expect(same.metric).toBe(slots.cmpTaxMore('new what-if', formatDeltaDollar(d + 1_500), 'more', START, last, 'your plan', true))
    expect(same.notes).toContain(slots.cmpTaxWorkingCounted(`${START} through ${START + 2}`, false, 'maybe-in-w'))
    expect(same.notes).toContain(copy.cmpPayTaxUnasked)
    // No W and an employer match that differs (milestone 4's review, round 3): the match lands in pre-tax savings but
    // never in the pay that is taxed, so the pay check, and its tax, stay the same on both, and the total stands, exact.
    // Each working year taxes $130,000 of the $150,000 pay (a $20,000 own deferral) on both sides.
    const taxedPay = (rows: readonly LedgerYearRow[]) => rows.map((r) => (r.t < STOP_T ? { ...r, payTaxableByPerson: [130_000, 0] } : r))
    const planTaxed = taxedPay(planNoW)
    const matchNoW = taxedPay(moreNoW).map((r) => (r.t === 0 ? { ...r, contribution: { ...r.contribution, pretax: r.contribution.pretax + 5_000 } } : r))
    const match = cmp('tax', { compared: side('compared', ready(planTaxed, WORKING_META)), alternative: side('alternative', ready(matchNoW, WORKING_META)) })
    if (match.kind !== 'pair') throw new Error(`a match-only difference prints no total: ${match.kind}`)
    expect(match.metric).toBe(same.metric)
    expect(match.notes).toContain(slots.cmpTaxWorkingCounted(`${START} through ${START + 2}`, false, 'maybe-in-w'))
    // No W and a pay check that differs (the household's own pre-tax deferral, then Social Security too): the tax that
    // difference makes sits on pay, which nothing prices, so words, never a total.
    const depNoW = matchNoW.map((r) => (r.t === 0 ? { ...r, payTaxableByPerson: [125_000, 0] } : r))
    expect(cmp('tax', { compared: side('compared', ready(planTaxed, WORKING_META)), alternative: side('alternative', ready(depNoW, WORKING_META)) })).toMatchObject({
      kind: 'words',
      words: `${slots.cmpTaxUnpriced('deposits', `${START}`, true)} ${copy.cmpPayTaxUnasked}`,
    })
    const ssNoW = depNoW.map((r) => (r.t < STOP_T ? { ...r, socialSecurity: r.socialSecurity + 16_800 } : r))
    expect(cmp('tax', { compared: side('compared', ready(planTaxed, WORKING_META)), alternative: side('alternative', ready(ssNoW, WORKING_META)) })).toMatchObject({
      kind: 'words',
      words: `${slots.cmpTaxUnpriced('both', `${START} through ${START + 2}`, true)} ${copy.cmpPayTaxUnasked}`,
    })
  })

  it('income tax: a Roth conversion in a year cut off before the window prints no total, unless both sides’ figures match in it', () => {
    // Your plan stops in START + 3, the what-if in START + 5: START + 3 and + 4 are left out, so START through START + 2
    // (both working, the same pay check) are cut off before the window.
    const later: TableMeta = { ...WORKING_META, stopYear: START + 5, stopFrom: 'lever' }
    const conv = (rows: readonly LedgerYearRow[], tax: number) => rows.map((r) => (r.t === 0 ? { ...r, conversion: 30_000, taxPaid: r.taxPaid + tax } : r))
    const leftOut = `${START + 3} and ${START + 4}, when work has stopped in your plan but not yet in new what-if`
    // The same conversion paying the same tax on both: leaving it out hides no difference, so the total stands.
    const cut = cmp('tax', { compared: side('compared', ready(conv(withPay(true), 4_000), WORKING_META)), alternative: side('alternative', ready(conv(withPay(true), 4_000), later)) })
    if (cut.kind !== 'pair') throw new Error(cut.kind)
    expect(cut.metric.startsWith(`From ${START + 5} through `)).toBe(true)
    expect(cut.notes).toContain(slots.cmpTaxStartsAfter(START + 5, leftOut))
    // On the what-if alone: no total, and the words say why (X1, rule 2).
    expect(cmp('tax', { compared: side('compared', ready(withPay(true), WORKING_META)), alternative: side('alternative', ready(conv(withPay(true), 4_000), later)) })).toMatchObject({
      kind: 'words',
      words: slots.cmpTaxConversionBefore(START + 5, leftOut, true),
    })
  })

  it('income tax: the pointer to the tax on pay is the one Cash Flows can back (A4)', () => {
    const one = (rows: readonly LedgerYearRow[]) => {
      const v = cmp('tax', { compared: side('compared', ready(rows, WORKING_META)) })
      if (v.kind !== 'pair') throw new Error(v.kind)
      return v.notes
    }
    expect(one(withPay(true))).toContain(copy.cmpPayTaxShown)
    // No W: no row carries a pay check, so Cash Flows draws no column for it.
    expect(one(withPay(false))).toContain(copy.cmpPayTaxUnasked)
    // W given, but the pay checks carry no income tax: the column isn't drawn either.
    const noTax = withPay(true).map((r) => (r.workingYear !== undefined ? { ...r, workingYear: { ...r.workingYear, taxOnOutsideIncome: 0 } } : r))
    expect(one(noTax)).toContain(copy.cmpPayTaxNone)
    for (const notes of [one(withPay(false)), one(noTax)]) expect(notes).not.toContain(copy.cmpPayTaxShown)
  })

  it('income tax with no year whose tax compares: words, never a total, with the ran-out note', () => {
    // The what-if (retired from row one) runs out in START + 4, before the plan's first retired year (START + 5): every
    // year both paid holds a working year beside a retired one.
    const late: TableMeta = { ...WORKING_META, stopYear: START + 5 }
    const ranOut = slots.analysisRanOut([{ name: 'new what-if', year: START + 4 }], true, null)
    const v = cmp('tax', { compared: side('compared', ready(RETIRED.rows, late)), alternative: side('alternative', ready(ranOutAt(RETIRED.rows, 4))) })
    expect(v).toMatchObject({ kind: 'words', words: `${slots.cmpTaxNoShared(true, `${START} through ${START + 3}, when work has stopped in new what-if but not yet in your plan`)} ${ranOut}` })
    // The what-if stops in START + 2 instead: START and START + 1 do compare (both working, the same pay check), so the
    // words say from when the two never compare again, never that no year compares (R2F4).
    const early: TableMeta = { ...WORKING_META, stopYear: START + 2, stopFrom: 'lever' }
    const w = cmp('tax', { compared: side('compared', ready(RETIRED.rows, late)), alternative: side('alternative', ready(ranOutAt(RETIRED.rows, 4), early)) })
    expect(w).toMatchObject({
      kind: 'words',
      words: `${slots.cmpTaxNoShared(true, `${START + 2} and ${START + 3}, when work has stopped in new what-if but not yet in your plan`, START + 2)} ${ranOut}`,
    })
  })

  it('as retirement begins: each bar is its side’s OPENING total in its own first retired year, on one scale; equal bars say nothing moved', () => {
    const later: TableMeta = { ...WORKING_META, stopYear: START + 5 }
    const v = cmp('at-retirement', { compared: side('compared', ready(RETIRED.rows, WORKING_META)), alternative: side('alternative', ready(RETIRED.rows, later)) })
    if (v.kind !== 'bars') throw new Error(v.kind)
    expect(v.bars[0]!.value).toBe(startTotal(RETIRED.rows[5]!))
    expect(v.bars[1]!.value).toBe(startTotal(RETIRED.rows[STOP_T]!))
    expect(v.bars.map((b) => [b.colorIndex, b.pattern])).toEqual([[1, 'solid'], [0, 'hatch']])
    expect(v.bars[0]!.name).toContain(`${START + 5} (`)
    expect(v.bars[1]!.name).toContain(`${START + STOP_T} (`)
    expect(v.ticks[0]!.dollars).toBe(0)
    expect(v.title).toBe(copy.cmpChartAtRetirement)
    const same = cmp('at-retirement', { compared: side('compared', ready(RETIRED.rows, WORKING_META)), alternative: side('alternative', ready(RETIRED.rows, WORKING_META)) })
    if (same.kind !== 'bars') throw new Error(same.kind)
    expect(same.metric).toBe(slots.cmpAtRetirementSame(formatDeltaDollar(startTotal(RETIRED.rows[STOP_T]!)), true))
  })

  it('the all-retired route: the third chart is what each side holds today, the entered balance exact, with no "~", no market and no "retirement" (X4)', () => {
    const spine = cmp('at-retirement', { alternative: side('alternative', ready(RETIRED.rows)) })
    if (spine.kind !== 'bars') throw new Error(spine.kind)
    const opening = startTotal(RETIRED.rows[0]!)
    expect(spine.bars.map((b) => b.value)).toEqual([opening, opening])
    expect(spine.title).toBe(copy.cmpChartToday)
    expect(spine.charts.find((c) => c.id === 'at-retirement')!.label).toBe(copy.cmpChartToday)
    expect(spine.metric).toBe(slots.cmpTodaySame(formatEnteredDollar(opening)))
    expect(spine.bars[1]!.figure).toBe(`$${formatEnteredDollar(opening)}`)
    expect(spine.notes).toContain(copy.cmpTodayNote)
    const words = [spine.metric, ...spine.bars.flatMap((b) => [b.name, b.figure, b.point])].join(' ')
    expect(words).not.toMatch(/~|retirement|market/)
    const one = cmp('at-retirement')
    if (one.kind !== 'bars') throw new Error(one.kind)
    expect(one.metric).toBe(slots.cmpTodayOne('Your plan', formatEnteredDollar(opening)))
  })

  it('as retirement begins: a side whose money runs out says so in the notes (O2), and a side with no opening to show speaks its words, never "~$0" (A7)', () => {
    // Your plan alone, run out in its first year: the bar is its real opening; the note says the money runs out.
    const failing = cmp('at-retirement', { compared: side('compared', ready(ranOutAt(RETIRED.rows, 0))) })
    if (failing.kind !== 'bars') throw new Error(failing.kind)
    expect(failing.notes).toContain(slots.analysisRanOut([{ name: 'your plan', year: START }], true, null))
    expect(failing.metric).toBe(slots.cmpTodayOne('Your plan', formatEnteredDollar(startTotal(RETIRED.rows[0]!))))
    // A what-if that runs out in START + 1, before its first retired year (START + 3): its bar names the year in words.
    const v = cmp('at-retirement', { compared: side('compared', ready(RETIRED.rows, WORKING_META)), alternative: side('alternative', ready(ranOutAt(RETIRED.rows, 1), WORKING_META)) })
    if (v.kind !== 'bars') throw new Error(v.kind)
    expect(v.bars[0]!.figure).toBe(slots.analysisEndWord(START + 1))
    expect(v.bars[0]!.point).toBe(slots.cmpBarWordPoint('New what-if', slots.analysisEndWord(START + 1)))
    expect(v.bars[0]!.point).not.toContain('~$0')
    expect(v.notes).toContain(slots.analysisRanOut([{ name: 'new what-if', year: START + 1 }], true, null))
  })

  it('your plan alone, run out: the metric says the money ran out in that year, never "holds ~$0"', () => {
    const v = cmp('assets', { compared: side('compared', ready(ranOutAt(RETIRED.rows, 12))) })
    if (v.kind !== 'pair') throw new Error(v.kind)
    expect(v.metric.startsWith('Your plan runs out of money at age')).toBe(true)
    expect(v.metric.endsWith(`(${START + 12}), in the steady market.`)).toBe(true)
    expect(v.metric).not.toContain('~$0')
    // Both run out in that year: never "about the same invested".
    const both = cmp('assets', { compared: side('compared', ready(ranOutAt(RETIRED.rows, 12))), alternative: side('alternative', ready(ranOutAt(RETIRED.rows, 12))) })
    if (both.kind !== 'pair') throw new Error(both.kind)
    expect(both.metric.startsWith('New what-if and your plan both run out of money at age')).toBe(true)
    expect(both.metric.endsWith(`(${START + 12}), in the steady market.`)).toBe(true)
  })

  it('a run whose money runs out in its first year draws no $0 picture: the words say so', () => {
    const o = { compared: side('compared', ready(ranOutAt(RETIRED.rows, 0))) }
    for (const chart of ['assets', 'tax'] as const) {
      expect(cmp(chart, o), chart).toEqual(expect.objectContaining({ kind: 'words', words: slots.analysisRanOut([{ name: 'your plan', year: START }], true, null) }))
    }
  })

  it('the rough market is named in every metric and its words replace the steady line', () => {
    // A working household (the all-retired route's third chart is the entered balance, the same in every market).
    for (const chart of ['assets', 'tax', 'at-retirement'] as const) {
      const v = cmp(chart, { future: 'rough', compared: side('compared', ready(withPay(true), WORKING_META)) })
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
  })

  it('income sources: the inherited IRAs’ part (U13) is what they paid toward each year, a withdrawal less its move to taxable, zigzagged in slot 13, and drawn only where a year holds it', () => {
    const entry = (taken: number, moved: number) => ({ start: 100_000, booked: 0, required: 1_000, taken, aboveRequired: taken - 1_000, movedToTaxable: moved, leftTheRun: 0, end: 90_000, last: false })
    const rows = RETIRED.rows.map((r, k) => ({ ...r, inherited: [entry(5_000 + k, k === 2 ? 1_500 : 0), entry(2_000, 0)] }))
    const v = rd('income:compared', { compared: side('compared', ready(rows)) })
    if (v.kind !== 'years') throw new Error(v.kind)
    expect(v.sources.map((s) => s.id)).toEqual(['social-security', 'other', 'taxable', 'pretax', 'roth', 'hsa', 'inherited'])
    const inherited = v.sources.find((s) => s.id === 'inherited')!
    expect(inherited.points.map((p) => p.value)).toEqual(rows.map((_, k) => 5_000 + k + 2_000 - (k === 2 ? 1_500 : 0)))
    expect(inherited).toMatchObject({ colorIndex: 13, pattern: 'zigzag' })
  })

  it('the key metrics as their exact sentences: the share that is not a withdrawal (less the income the tool doesn’t keep), the spending in all, the withdrawal rate', () => {
    // One row's income runs past what the year spends: the tool keeps none of that part, so the share leaves it out.
    const k = 4
    const gross = (r: LedgerYearRow) => r.socialSecurity + r.otherIncomeByPerson.reduce((s, o) => s + o.gross, 0)
    expect(gross(RETIRED.rows[k]!), '[test setup] the row has income to leave out').toBeGreaterThan(6_000)
    const rows = RETIRED.rows.map((r) => ({ ...r, incomeNotKept: r.t === k ? 6_000 : 0 }))
    const last = START + rows.at(-1)!.t
    const o = { compared: side('compared', ready(rows)) }
    const income = rd('income:compared', o)
    if (income.kind !== 'years') throw new Error(income.kind)
    const kept = rows.reduce((s, r) => s + Math.max(0, gross(r) - r.incomeNotKept), 0)
    const drawn = rows.reduce((s, r) => s + r.draw.taxable + r.draw.pretax + r.draw.roth + r.hsaSpend, 0)
    expect(income.metrics[0]).toBe(slots.rdShare(pct(kept / (kept + drawn)), START, last, true))
    expect(income.notes, 'a year with income not kept: the share says what it leaves out').toContain(copy.rdNotKeptNote)
    const plain = rd('income:compared', { compared: side('compared', ready(rows.map((r) => ({ ...r, incomeNotKept: 0 })))) })
    if (plain.kind !== 'years') throw new Error(plain.kind)
    expect(plain.notes, 'no year with income not kept: no note').not.toContain(copy.rdNotKeptNote)
    const spending = rd('spending:compared', o)
    if (spending.kind !== 'years') throw new Error(spending.kind)
    const all = rows.reduce((s, r) => s + (r.spending ?? 0) + r.taxPaid + r.premiums.acaNet + r.premiums.medicare + r.premiums.medicareExtras, 0)
    expect(spending.metrics[0]).toBe(slots.rdSpending(formatDeltaDollar(all), START, last, true))
    const rate = rd('rate:compared', o)
    if (rate.kind !== 'years') throw new Error(rate.kind)
    const rates = rows.map((r) => ({ year: START + r.t, f: (r.draw.taxable + r.draw.pretax + r.draw.roth + r.hsaSpend) / (r.start.taxable + r.start.pretax + r.start.roth + r.start.hsa) }))
    const high = rates.reduce((h, x) => (x.f > h.f ? x : h), rates[0]!)
    expect(rate.metrics[0]).toBe(slots.rdRate(pct(rates[0]!.f), START, pct(high.f), high.year, true))
  })

  it('a low withdrawal rate’s axis prints every tick exactly (a 0.25 step printed 0.25 as "0.3%")', () => {
    const tiny = RETIRED.rows.map((r) => ({ ...r, draw: { taxable: r.draw.taxable / 20, pretax: r.draw.pretax / 20, roth: r.draw.roth / 20 }, hsaSpend: r.hsaSpend / 20 }))
    const v = rd('rate:compared', { compared: side('compared', ready(tiny)) })
    if (v.kind !== 'years') throw new Error(v.kind)
    expect(Math.max(...v.sources[0]!.points.map((p) => p.value)), '[test setup] every rate under 1.25%').toBeLessThan(1.25)
    for (const t of v.ticks) expect(t.label).toBe(`${Math.round(t.value * 10) / 10}%`)
    expect(v.ticks.map((t) => t.value)).toEqual([0, 0.5, 1, 1.5])
  })

  it('the menu names each side inside the sentence ("Income sources of your plan")', () => {
    const v = rd('income:compared', { alternative: side('alternative', ready(RETIRED.rows)) })
    expect(v.charts.map((c) => c.label)).toContain(slots.rdIncomeSourcesOf('your plan'))
    expect(v.charts.map((c) => c.label)).toContain(slots.rdRateOf('new what-if'))
  })

  it('on the no-date route the notes say the answer found no date and whose stop year the rows run at', () => {
    const noDate: TableMeta = { ...WORKING_META, route: 'no-date', stopFrom: 'answer' }
    const lever: TableMeta = { ...noDate, stopYear: START + 5, stopFrom: 'lever' }
    const one = rd('income:compared', { compared: side('compared', ready(RETIRED.rows, noDate)) })
    if (one.kind !== 'years') throw new Error(one.kind)
    expect(one.notes).toContain(slots.healthNoDate(START + STOP_T))
    const two = { compared: side('compared', ready(RETIRED.rows, noDate)), alternative: side('alternative', ready(RETIRED.rows, lever)) }
    const per = rd('rate:alternative', two)
    if (per.kind !== 'years') throw new Error(per.kind)
    expect(per.notes).toContain(slots.cashFlowsRunStopsNoDate('Your plan', START + STOP_T))
    expect(per.notes).toContain(slots.cashFlowsRunStopsLever('New what-if', START + 5))
    // The bars as retirement begins print each side's year: no lever line repeats it; the no-date line stays.
    const bars = comparisonsView({ ...input(two), chart: 'at-retirement' })
    if (bars.kind !== 'bars') throw new Error(bars.kind)
    expect(bars.notes).toContain(slots.cashFlowsRunStopsNoDate('Your plan', START + STOP_T))
    expect(bars.notes.some((n) => n === slots.cashFlowsRunStopsLever('New what-if', START + 5))).toBe(false)
    // The dated route: nothing (the page's intro names the date).
    const dated = rd('income:compared', { compared: side('compared', ready(RETIRED.rows, WORKING_META)) })
    if (dated.kind !== 'years') throw new Error(dated.kind)
    expect(dated.notes.some((n) => n.includes('no date'))).toBe(false)
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
    // Each part's share and the hole's figure, worked out here over the shared window: Social Security and other income
    // count only what the tool keeps of them, split in proportion.
    const gross = (r: LedgerYearRow) => r.socialSecurity + r.otherIncomeByPerson.reduce((s, x) => s + x.gross, 0)
    const keptShare = (r: LedgerYearRow) => (gross(r) > 0 ? Math.max(0, gross(r) - r.incomeNotKept) / gross(r) : 0)
    const want: Record<string, number> = {
      'social-security': inWindow.reduce((s, r) => s + r.socialSecurity * keptShare(r), 0),
      other: inWindow.reduce((s, r) => s + r.otherIncomeByPerson.reduce((x, y) => x + y.gross, 0) * keptShare(r), 0),
      taxable: inWindow.reduce((s, r) => s + r.draw.taxable, 0),
      pretax: inWindow.reduce((s, r) => s + r.draw.pretax, 0),
      roth: inWindow.reduce((s, r) => s + r.draw.roth, 0),
      hsa: inWindow.reduce((s, r) => s + r.hsaSpend, 0),
    }
    const sum = Object.values(want).reduce((a, b) => a + b, 0)
    const plan = d.donuts.find((x) => x.side === 'compared')!
    expect(plan.parts.map((p) => p.id)).toEqual(Object.keys(want).filter((id) => want[id]! > 0))
    for (const p of plan.parts) expect(p.share, p.id).toBeCloseTo(want[p.id]! / sum, 9)
    expect(plan.centre).toBe(`${pct((want['social-security']! + want.other!) / sum)}%`)
    expect(d.metric).toBe(slots.rdIncomeComparison('new what-if', pct((want['social-security']! + want.other!) / sum), 'your plan', pct((want['social-security']! + want.other!) / sum), START + 5, last, true))
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
    // Row one's deposits in all ($5,000 + $20,000 + $7,000 + $4,000), and year 0's entered pay printed exact, as Cash
    // Flows prints it.
    expect(now.metrics[0]).toBe(slots.savThisYear(formatDeltaDollar(36_000), START))
    expect(now.metrics[1]).toBe(slots.savOwnShare(formatDeltaDollar(30_000), '20', '$150,000'))
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
    // The left over and the short year stated apart, never netted: $9,000 + $9,000 left over, then $6,000 drawn.
    expect(left.metrics[0]).toBe(slots.savLeftOver(formatDeltaDollar(18_000), START, START + 2, true))
    // What the run keeps of a left over is its own field (`leftOverCredit`): none here, said so.
    expect(rows.slice(0, STOP_T).every((r) => r.leftOverCredit === 0), '[test setup] the base rows credit nothing').toBe(true)
    expect(left.metrics[1]).toBe(copy.savLeftOverNoneKept)
    expect(left.metrics[2]).toBe(slots.savShortDrawn(formatDeltaDollar(6_000), START, START + 2, true))
    // The engine credits only a year with money left (`workingYearCredit`), each at most its cash: $4,000 in each.
    const credited = rows.map((r) => (r.t < STOP_T && r.workingYear!.leftOver > 0 ? { ...r, leftOverCredit: 4_000 } : r))
    const kept = sav('left-over:compared', true, { compared: side('compared', ready(credited, WORKING_META)) })
    if (kept.kind !== 'years') throw new Error(kept.kind)
    expect(kept.metrics[1]).toBe(slots.savLeftOverKept('your plan', formatDeltaDollar(8_000)))
    // Every dollar left over kept (the rest prints as $0): "all of it", never a rest that isn't there (O5).
    const allKept = rows.map((r) => (r.t < STOP_T && r.workingYear!.leftOver > 0 ? { ...r, leftOverCredit: r.workingYear!.leftOver } : r))
    const whole = sav('left-over:compared', true, { compared: side('compared', ready(allKept, WORKING_META)) })
    if (whole.kind !== 'years') throw new Error(whole.kind)
    expect(whole.metrics[1]).toBe(slots.savLeftOverAllKept('Your plan'))
    // Every year short: no left-over line and no kept line, only what the short years draw.
    const allShort = rows.map((r) => (r.t < STOP_T ? { ...r, workingYear: { ...r.workingYear!, leftOver: -2_000, shortfall: 2_000 } } : r))
    const short = sav('left-over:compared', true, { compared: side('compared', ready(allShort, WORKING_META)) })
    if (short.kind !== 'years') throw new Error(short.kind)
    expect(short.metrics).toEqual([slots.savShortDrawn(formatDeltaDollar(6_000), START, START + 2, true)])
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

  it('a run whose money runs out in its first year: every Savings chart says so, never a calm "nothing goes in"', () => {
    const o = { compared: side('compared', ready(ranOutAt(withPay(true), 0), WORKING_META)) }
    const words = slots.analysisRanOut([{ name: 'your plan', year: START }], true, null)
    for (const chart of ['this-year:compared', 'per-year:compared', 'share:compared', 'left-over:compared'] as const) {
      expect(sav(chart, true, o), chart).toMatchObject({ kind: 'words', words })
    }
    expect(sav('this-year:compared', false, { compared: side('compared', ready(ranOutAt(RETIRED.rows, 0))) })).toMatchObject({ kind: 'words', words })
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

/**
 * The real witnesses (milestone 4's review): each side's rows built the way the shell's slots build them (the plan's
 * table base; a what-if's bundle applied to the plan's draft through `applyBundle`, then the same table base, as
 * `copyRunFor` does), each run through the engine once per future. A working seed sits at a band `offset` years out.
 */
type RealRuns = { readonly meta: TableMeta; readonly rows: Readonly<Record<'steady' | 'rough', readonly LedgerYearRow[]>> }
const bandAt = (offsetYears: number): DateSearchOutcome =>
  ({ kind: 'dates', tier: 'final', windowTopYears: DATE_OFFSET_WINDOW_TOP, seed: 1, band: { offsetYears, track: 'lifestyle' } }) as unknown as DateSearchOutcome
function realRuns(draft: ScenarioDraft, offsetYears: number, bundle?: readonly WhatIfLeverV6[]): RealRuns {
  const outcome = isDateRoute(draft) ? bandAt(offsetYears) : undefined
  const applied = bundle === undefined ? undefined : applyBundle(draft, bundle)
  if (applied !== undefined && !applied.ok) throw new Error(`refused: ${JSON.stringify(applied.refusal)}`)
  const base =
    applied === undefined
      ? buildTableBase(draft, outcome)
      : buildTableBase(applied.draft, outcome, {
          ...(applied.stopOffsetYears !== undefined ? { offsetYears: applied.stopOffsetYears } : {}),
          leftOver: { fromPlan: carriedWorkingYearLeftOver(draft) },
        })
  if (base.kind !== 'run') throw new Error(`no table base: ${base.reason}`)
  const { meta, views } = tableRequestsOn(applied?.draft ?? draft, base, workingYearLeftOverShownState(draft))
  const run = (v: 'steady' | 'rough'): readonly LedgerYearRow[] => {
    const ask = views[v]
    if (ask.kind !== 'run') throw new Error(`no ${v} run`)
    const out = simulate(ask.request.params, ask.request.seed, ask.request.options)
    if (out.indeterminate || out.infeasible) throw new Error(`the ${v} run failed`)
    return out.distribution.ledgerRows ?? []
  }
  return { meta, rows: { steady: run('steady'), rough: run('rough') } }
}
const realInput = (future: 'steady' | 'rough', plan: RealRuns, whatIf: RealRuns | null): AnalysisInput =>
  input({
    future,
    compared: { ...side('compared', ready(plan.rows[future], plan.meta)), plan: true },
    alternative: whatIf === null ? null : side('alternative', ready(whatIf.rows[future], whatIf.meta)),
  })
const roth = (amount: number, years: number): WhatIfLeverV6 =>
  ({ kind: 'roth', conversion: { kind: 'plan', plan: { annualAmountReal: amount, startYearOffset: 0, years } } }) as unknown as WhatIfLeverV6
const stopIn = (calendarYear: number): WhatIfLeverV6 => ({ kind: 'stop-year', calendarYear }) as unknown as WhatIfLeverV6
const taxThrough = (rows: readonly LedgerYearRow[], meta: TableMeta, from: number, through: number): number =>
  rows.filter((r) => !r.ranOut && meta.startCalendarYear + r.t >= from && meta.startCalendarYear + r.t <= through).reduce((s, r) => s + Math.max(0, r.taxPaid), 0)

describe('the real witnesses (milestone 4’s review)', () => {
  it('X1 · `date` + a Roth conversion in every working year, rough market: the total counts the working years, so the what-if pays MORE income tax, never less', () => {
    const plan = realRuns(DEV_SEEDS.date, 4)
    const whatIf = realRuns(DEV_SEEDS.date, 4, [roth(60_000, 4)])
    const start = plan.meta.startCalendarYear
    const stop = plan.meta.stopYear!
    const W = whatIf.rows.rough
    expect(W.filter((r) => r.conversion > 0).map((r) => start + r.t), '[test setup] the conversions fall in the working years').toEqual([start, start + 1, start + 2, start + 3])
    expect(stop, '[test setup] both stop in the fifth year').toBe(start + 4)
    const v = comparisonsView({ ...realInput('rough', plan, whatIf), chart: 'tax' })
    if (v.kind !== 'pair') throw new Error(v.kind)
    const through = Math.min(...[plan.rows.rough, W].map((rows) => start + rows.filter((r) => !r.ranOut).at(-1)!.t))
    const d = taxThrough(W, whatIf.meta, start, through) - taxThrough(plan.rows.rough, plan.meta, start, through)
    expect(d, '[test setup] across every year both pay, the what-if pays more').toBeGreaterThan(20_000)
    expect(v.metric).toBe(slots.cmpTaxMore('new what-if', formatDeltaDollar(d), 'more', start, through, 'your plan', false))
    expect(plan.meta.stateTaxReading, '[test setup] `date` names no state').toBe('unpriced')
    expect(v.notes).toContain(slots.cmpTaxWorkingCounted(`${start} through ${stop - 1}`, true, 'maybe-in-w'))
    for (const s of v.series) expect(s.points[0]!.year).toBe(start)
    // Retirement Details keeps its retired window, and says both sides' earlier years are left out, conversions
    // included, pointing at Cash Flows' paired form (your plan compared, the what-if beside it) (R2F2).
    const rd = retirementDetailsView({ ...realInput('rough', plan, whatIf), chart: 'spending-comparison' })
    if (rd.kind !== 'grouped') throw new Error(rd.kind)
    expect(rd.notes).toContain(slots.rdBeforeWindow(stop, true))
  })

  it('X1 · `date` + a stop-year what-if (work stops in 2028): the years only one side works are named and left out, the window after them; with a Roth conversion before it, no total', () => {
    const plan = realRuns(DEV_SEEDS.date, 4)
    const whatIf = realRuns(DEV_SEEDS.date, 4, [stopIn(plan.meta.startCalendarYear + 2)])
    const start = plan.meta.startCalendarYear
    const v = comparisonsView({ ...realInput('steady', plan, whatIf), chart: 'tax' })
    if (v.kind !== 'pair') throw new Error(v.kind)
    expect(v.metric.startsWith(`From ${start + 4} through `)).toBe(true)
    expect(v.notes).toContain(slots.cmpTaxStartsAfter(start + 4, `${start + 2} and ${start + 3}, when work has stopped in new what-if but not yet in your plan`))
    for (const s of v.series) expect(s.points[0]!.year).toBe(start + 4)
    // The dated route says the lever's own year (A6).
    expect(v.notes).toContain(slots.cashFlowsRunStopsLever('New what-if', start + 2))
    // Retirement Details' comparisons say a side ran out (A1): the what-if's money runs out in the steady market.
    const whatIfEnd = whatIf.rows.steady.at(-1)!
    expect(whatIfEnd.ranOut, '[test setup] the what-if runs out in the steady market').toBe(true)
    for (const chart of ['spending-comparison', 'income-comparison'] as const) {
      const rd = retirementDetailsView({ ...realInput('steady', plan, whatIf), chart })
      if (rd.kind === 'words') throw new Error(rd.words)
      expect(rd.notes, chart).toContain(slots.analysisRanOut([{ name: 'new what-if', year: start + whatIfEnd.t }], true, start + whatIfEnd.t - 1))
    }
    // The same stop with a Roth conversion from this year: the conversion falls before the window, so no total.
    const both = realRuns(DEV_SEEDS.date, 4, [stopIn(start + 2), roth(40_000, 5)])
    expect(comparisonsView({ ...realInput('steady', plan, both), chart: 'tax' })).toMatchObject({
      kind: 'words',
      words: slots.cmpTaxConversionBefore(start + 4, `${start + 2} and ${start + 3}, when work has stopped in new what-if but not yet in your plan`, true),
    })
  })

  it('X1 · `dip` alone at its stop year: its own 2030 conversion’s tax is named beside the total that leaves it out', () => {
    const plan = realRuns(DEV_SEEDS.dip, 5)
    const start = plan.meta.startCalendarYear
    const working = plan.rows.steady.filter((r) => !r.ranOut && start + r.t < plan.meta.stopYear!)
    const taxed = working.filter((r) => r.taxPaid >= 0.5)
    expect(taxed.map((r) => start + r.t), '[test setup] one working year pays savings tax').toEqual([start + 4])
    expect(taxed[0]!.conversion, '[test setup] a conversion that year').toBeGreaterThan(0)
    const v = comparisonsView({ ...realInput('steady', plan, null), chart: 'tax' })
    if (v.kind !== 'pair') throw new Error(v.kind)
    expect(v.notes).toContain(slots.cmpTaxOneWorkingSavings('your plan', formatDeltaDollar(taxed[0]!.taxPaid), `${start + 4}`, true))
    expect(v.metric).toBe(slots.cmpTaxOne('your plan', formatDeltaDollar(taxThrough(plan.rows.steady, plan.meta, plan.meta.stopYear!, 9999)), plan.meta.stopYear!, start + plan.rows.steady.at(-1)!.t, true))
  })

  it('R2F1 · `date` + a claim-age or deposits what-if: each working year counts with its pay check’s income tax, so the direction is the engine’s own, in both futures', () => {
    // Over every year both sides pay, what each run itself charges as income tax: taxPaid, plus the pay check's part in a
    // working year. A claim age or a deposit moves its own tax into the pay check's part; round 1 left those years out
    // and printed the opposite direction (Sam at 62: "~$8,300 less"; at 70: "~$5,500 more"; 401(k) to $0: "~$7,900 less").
    const charged = (rows: readonly LedgerYearRow[], start: number, through: number) =>
      rows.filter((r) => !r.ranOut && start + r.t <= through).reduce((s, r) => s + Math.max(0, r.taxPaid) + Math.max(0, r.workingYear?.taxOnOutsideIncome ?? 0), 0)
    const claim = (claimAge: number) => ({ kind: 'claim-age', personIndex: 1, claimAge }) as unknown as WhatIfLeverV6
    const noDeposits = { kind: 'deposits', accountId: 'acct-0-401k', annualContribution: 0 } as unknown as WhatIfLeverV6
    const cases: readonly [string, number, WhatIfLeverV6, 'more' | 'less'][] = [
      ['Sam claims at 62', 9, claim(62), 'more'],
      ['Sam claims at 70', 9, claim(70), 'less'],
      ['the 401(k) deposit to $0', 4, noDeposits, 'more'],
    ]
    for (const [label, offset, lever, dir] of cases) {
      const plan = realRuns(DEV_SEEDS.date, offset)
      const whatIf = realRuns(DEV_SEEDS.date, offset, [lever])
      const start = plan.meta.startCalendarYear
      expect(whatIf.meta.stopYear, `[test setup] ${label}: both stop together`).toBe(plan.meta.stopYear)
      for (const future of ['steady', 'rough'] as const) {
        const v = comparisonsView({ ...realInput(future, plan, whatIf), chart: 'tax' })
        if (v.kind !== 'pair') throw new Error(`${label}, ${future}: ${v.kind}`)
        const through = Math.min(...[plan.rows[future], whatIf.rows[future]].map((rows) => start + rows.filter((r) => !r.ranOut).at(-1)!.t))
        const d = charged(whatIf.rows[future], start, through) - charged(plan.rows[future], start, through)
        expect(Math.sign(d), `[test setup] ${label}, ${future}: the engine's own direction`).toBe(dir === 'more' ? 1 : -1)
        expect(v.metric, `${label}, ${future}`).toBe(slots.cmpTaxMore('new what-if', formatDeltaDollar(Math.abs(d)), dir, start, through, 'your plan', future === 'steady'))
        expect(v.notes, `${label}, ${future}`).toContain(slots.cmpTaxWorkingCounted(slots.analysisYears(Array.from({ length: plan.meta.stopYear! - start }, (_, i) => start + i)), true, 'maybe-in-w'))
      }
    }
  })

  it('R2F1 · `date` with no W + Sam claims at 62: the pay checks differ in Social Security and nothing prices the tax on pay, so words, never a total', () => {
    const { workingYearCost: _w, ...noW } = DEV_SEEDS.date as ScenarioDraft & { workingYearCost?: unknown }
    void _w
    const draft = noW as ScenarioDraft
    const plan = realRuns(draft, 9)
    const whatIf = realRuns(draft, 9, [{ kind: 'claim-age', personIndex: 1, claimAge: 62 } as unknown as WhatIfLeverV6])
    const start = plan.meta.startCalendarYear
    expect(plan.rows.steady.some((r) => r.workingYear !== undefined), '[test setup] no row carries a pay check').toBe(false)
    const differ = plan.rows.steady
      .filter((r) => start + r.t < plan.meta.stopYear! && Math.abs(r.socialSecurity - whatIf.rows.steady[r.t]!.socialSecurity) > 0.5)
      .map((r) => start + r.t)
    expect(differ.length, '[test setup] Social Security differs in working years').toBeGreaterThan(0)
    expect(comparisonsView({ ...realInput('steady', plan, whatIf), chart: 'tax' })).toMatchObject({
      kind: 'words',
      words: `${slots.cmpTaxUnpriced('ss', slots.analysisYears(differ), true)} ${copy.cmpPayTaxUnasked}`,
    })
  })

  it('round 3 · `date` with no W + a bigger employer match: the match never reaches the pay that is taxed, so the pay checks are the same and the exact total prints', () => {
    const { workingYearCost: _w, ...noW } = DEV_SEEDS.date as ScenarioDraft & { workingYearCost?: unknown }
    void _w
    const draft = noW as ScenarioDraft
    const plan = realRuns(draft, 9)
    const whatIf = realRuns(draft, 9, [{ kind: 'deposits', accountId: 'acct-0-401k', annualContribution: 20_000, employerMatchAnnual: 16_000 } as unknown as WhatIfLeverV6])
    const start = plan.meta.startCalendarYear
    const stop = plan.meta.stopYear!
    const working = (rows: readonly LedgerYearRow[]) => rows.filter((r) => start + r.t < stop)
    const [P, W] = [working(plan.rows.steady), working(whatIf.rows.steady)]
    expect(P.length, '[test setup] working years').toBeGreaterThan(0)
    expect(W.map((r) => r.contribution.pretax), '[test setup] the match lands in pre-tax savings').not.toEqual(P.map((r) => r.contribution.pretax))
    expect(W.map((r) => r.payTaxableByPerson), 'the premise: the engine taxes the same pay on both').toEqual(P.map((r) => r.payTaxableByPerson))
    const v = comparisonsView({ ...realInput('steady', plan, whatIf), chart: 'tax' })
    if (v.kind !== 'pair') throw new Error(`a match-only what-if prints no total: ${v.kind}`)
    const through = Math.min(...[plan.rows.steady, whatIf.rows.steady].map((rows) => start + rows.filter((r) => !r.ranOut).at(-1)!.t))
    const d = taxThrough(whatIf.rows.steady, whatIf.meta, start, through) - taxThrough(plan.rows.steady, plan.meta, start, through)
    expect(Math.abs(d), '[test setup] the match moves the income tax').toBeGreaterThan(1_000)
    expect(v.metric).toBe(slots.cmpTaxMore('new what-if', formatDeltaDollar(Math.abs(d)), d > 0 ? 'more' : 'less', start, through, 'your plan', true))
    expect(v.notes).toContain(slots.cmpTaxWorkingCounted(slots.analysisYears(P.map((r) => start + r.t)), false, 'maybe-in-w'))
  })

  it('O3 · `date` + a what-if stopping now and spending $250,000 a year: each side has retired years but none in common, said so with the ran-out note', () => {
    const plan = realRuns(DEV_SEEDS.date, 4)
    const start = plan.meta.startCalendarYear
    const whatIf = realRuns(DEV_SEEDS.date, 4, [stopIn(start), { kind: 'spending', op: 'total', annualSpendingReal: 250_000 } as unknown as WhatIfLeverV6])
    const out = whatIf.rows.steady.at(-1)!
    expect(out.ranOut && start + out.t < plan.meta.stopYear!, '[test setup] the what-if runs out before the plan stops work').toBe(true)
    const rd = retirementDetailsView({ ...realInput('steady', plan, whatIf), chart: 'spending-comparison' })
    expect(rd).toMatchObject({ kind: 'words', words: `${slots.rdShareNoneShared(true)} ${slots.analysisRanOut([{ name: 'new what-if', year: start + out.t }], true, null)}` })
  })

  it('X3 · `datesaved` + a what-if stopping in 2033: each side’s left-over line credits its own side with its own kept figure', () => {
    const plan = realRuns(DEV_SEEDS.datesaved, 4)
    const whatIf = realRuns(DEV_SEEDS.datesaved, 4, [stopIn(plan.meta.startCalendarYear + 7)])
    const lines = (id: 'alternative' | 'compared') => {
      const v = savingsView({ ...realInput('steady', plan, whatIf), chart: `left-over:${id}`, working: true })
      if (v.kind !== 'years') throw new Error(v.kind)
      return v.metrics
    }
    const kept = (r: RealRuns) => r.rows.steady.filter((x) => !x.ranOut && r.meta.startCalendarYear + x.t < r.meta.stopYear!).reduce((s, x) => s + x.leftOverCredit, 0)
    expect(formatDeltaDollar(kept(whatIf)), '[test setup] the two keep different figures').not.toBe(formatDeltaDollar(kept(plan)))
    expect(lines('alternative')).toContain(slots.savLeftOverKept('new what-if', formatDeltaDollar(kept(whatIf))))
    // Your plan keeps every dollar left over: "all of it" (O5).
    expect(lines('compared')).toContain(slots.savLeftOverAllKept('Your plan'))
    expect(lines('compared').join(' ')).not.toContain('new what-if')
  })

  it('X5 · `dateborder` deposits nothing: the per-year and share charts say so in words, never an all-$0 chart', () => {
    const plan = realRuns(DEV_SEEDS.dateborder, 4)
    const start = plan.meta.startCalendarYear
    const through = plan.meta.stopYear! - 1
    expect(savingsView({ ...realInput('steady', plan, null), chart: 'per-year:compared', working: true })).toMatchObject({ kind: 'words', words: slots.savNoDepositsYears(start, through, true) })
    expect(savingsView({ ...realInput('steady', plan, null), chart: 'share:compared', working: true })).toMatchObject({ kind: 'words', words: slots.savNoOwnDeposits(start, through, true) })
  })
})

describe('the two sides (the shell’s mapping, `analysisSides`)', () => {
  const PLAN = ready(RETIRED.rows, RETIRED.meta, 'plan')
  const LEFT = ready(RETIRED.rows, RETIRED.meta, 'left')
  const RIGHT = ready(RETIRED.rows, RETIRED.meta, 'right')
  const base = { rightRows: RIGHT, leftRows: LEFT, planRows: PLAN, planTitle: 'Your plan', leftTitle: 'New what-if' } as const

  it('your plan alone: no what-if set beside it, so one side, the plan on the right', () => {
    const s = analysisSides({ ...base, rightPick: 'plan', rightTitle: 'Your plan', leftPick: 'new', leftEmpty: true })
    expect(s.alternative).toBeNull()
    expect(s.compared).toEqual({ id: 'compared', title: 'Your plan', mid: 'your plan', rows: PLAN, plan: true })
  })

  it('a new what-if beside your plan: the what-if’s own rows on the green left, your plan’s lane on the right', () => {
    const s = analysisSides({ ...base, rightPick: 'plan', rightTitle: 'Your plan', leftPick: 'new', leftEmpty: false })
    expect(s.alternative).toEqual({ id: 'alternative', title: 'New what-if', mid: 'new what-if', rows: LEFT })
    expect(s.compared.rows).toBe(PLAN)
    expect(s.compared.plan, 'the compared side is your plan’s lane (Cash Flows’ paired form shows these two)').toBe(true)
  })

  it('an empty left beside a kept what-if or Recommended on the right: the left is your plan’s rows, named so; the right reads its own slot', () => {
    for (const [rightPick, rightTitle, mid] of [
      ['kept:k1', 'Retire at 63', 'Retire at 63'],
      ['recommended', 'Recommended', 'recommended'],
    ] as const) {
      const s = analysisSides({ ...base, rightPick, rightTitle, leftPick: 'new', leftEmpty: true })
      expect(s.alternative, rightPick).toEqual({ id: 'alternative', title: 'Your plan', mid: 'your plan', rows: PLAN, plan: true })
      expect(s.compared, rightPick).toEqual({ id: 'compared', title: rightTitle, mid, rows: RIGHT })
    }
  })
})
