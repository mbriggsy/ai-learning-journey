/**
 * src/ui/screens/retirement/savingsView.ts: Retirement → Analysis → Savings, the pure composer (plan
 * docs/plans/6-rightcapital-ui-plan.md, RC17; ref 2.11; `rc-analysis/savings-tab-retirement-analysis__…13-16-56-2x.png`,
 * `-13-28-20-2x.png`). `Savings.tsx` draws what this returns.
 *
 * THE CHARTS, each side's own ("<chart>: <its name>"), over the WORKING rows (before the run's first retired year):
 * - deposits this year: row one's deposits by account (`contribution`: the household's AND the employer's, said so),
 *   one bar per kind in Balance Sheet's look; beside it the household's own share of pay where the run carries it
 *   (`workingYear.ownDeposits` over `workingYear.pay`: the employer's match left out, said so);
 * - deposits each year until work stops: the same, stacked per working year;
 * - deposits as a share of pay: each working year's own deposits over its gross pay, in percent;
 * - left over in working years: each working year's money in less money out (`workingYear.leftOver`), a short year
 *   drawn under the zero line, cross-hatched, as what it draws from savings.
 * A RETIRED household sees one chart, this year's deposits (plan RC17), and a line saying why. The portfolio-return
 * chart waits for return dollars as a ledger field (plan section 6).
 *
 * NO W, NO PAY CHECK (insight 178): a working row carries `workingYear` only when the household gave what a working year
 * costs. Without it the run draws nothing from savings in a working year, as if pay covered every cost, so the share of
 * pay and the left over have no honest figure: they say "not asked yet" with the door to the Pre-retirement living
 * expenses drawer (absent on a read-only tab), never an empty or zeroed chart.
 *
 * The money-ran-out row forfeits its deposits (`LedgerLoopRow`), so it counts in nothing here.
 */
import { buildYTicks, niceLattice } from '@viz/bandData'
import type { KindBar } from '@viz/charts/kindBarsOptions'
import type { YearSource } from '@viz/charts/incomeSourcesOptions'
import type { LedgerBalances, LedgerYearRow } from '@shared/model'
import { copy, slots } from '../../copy'
import { formatDeltaDollar, mmAxisFormatterFor } from '../../money'
import { comparisonAxis, type ComparisonAxis } from '../tax/taxRunsView'
import { firstRetiredT, futureNotes, gateSides, paidRows, pctWords, ranOutNote, yearOf, type AnalysisInput, type ReadySide, type SideId } from './analysisRuns'
import { cmpFigure } from './comparisonsView'

export type SavingsKind = 'this-year' | 'per-year' | 'share' | 'left-over'
export type SavingsChart = `${SavingsKind}:${SideId}`

/** The four kinds of account in Balance Sheet's look (taxable solid blue, pre-tax hatched orange, Roth dotted green,
 *  HSA lined sky). */
export const DEPOSIT_KINDS: readonly { readonly id: keyof LedgerBalances; readonly name: string; readonly colorIndex: number; readonly pattern: KindBar['pattern'] }[] = [
  { id: 'taxable', name: copy.taxStratSourceTaxable, colorIndex: 0, pattern: 'solid' },
  { id: 'pretax', name: copy.taxStratSourcePretax, colorIndex: 2, pattern: 'hatch' },
  { id: 'roth', name: copy.taxStratSourceRoth, colorIndex: 1, pattern: 'dots' },
  { id: 'hsa', name: copy.taxStratSourceHsa, colorIndex: 4, pattern: 'lines' },
]

export interface SavingsMenuItem {
  readonly id: SavingsChart
  readonly label: string
}

interface Menu {
  readonly charts: readonly SavingsMenuItem[]
  readonly chart: SavingsChart
}

export type SavingsView =
  | (Menu & { readonly kind: 'words'; readonly words: string; readonly metrics: readonly string[]; readonly notes: readonly string[] })
  /** Not asked yet: what a working year costs. The door opens the Pre-retirement living expenses drawer (writable tabs). */
  | (Menu & { readonly kind: 'unasked'; readonly words: string; readonly door?: string; readonly notes: readonly string[] })
  | (Menu & {
      readonly kind: 'bars'
      readonly title: string
      readonly bars: readonly KindBar[]
      readonly ticks: readonly { readonly dollars: number; readonly label: string }[]
      readonly metrics: readonly string[]
      /** Present where the household's own share waits on W (the door's words). */
      readonly door?: string
      readonly notes: readonly string[]
      readonly updating: boolean
    })
  | (Menu &
      ComparisonAxis & {
        readonly kind: 'years'
        readonly title: string
        readonly sources: readonly YearSource[]
        readonly ticks: readonly { readonly value: number; readonly label: string }[]
        readonly percent: boolean
        readonly metrics: readonly string[]
        readonly notes: readonly string[]
        readonly updating: boolean
      })

const KIND_LABEL: Readonly<Record<SavingsKind, (title: string) => string>> = {
  'this-year': slots.savThisYearOf,
  'per-year': slots.savPerYearOf,
  share: slots.savShareOf,
  'left-over': slots.savLeftOverOf,
}

/** The menu: a retired household's one chart (this year's deposits, on your plan's side), a working household's four
 *  per side. */
export function savingsMenu(sides: readonly { readonly id: SideId; readonly title: string }[], working: boolean): SavingsMenuItem[] {
  if (!working) {
    const plan = sides.find((s) => s.id === 'compared') ?? sides[0]!
    return [{ id: 'this-year:compared', label: KIND_LABEL['this-year'](plan.title) }]
  }
  const kinds: readonly SavingsKind[] = ['this-year', 'per-year', 'share', 'left-over']
  return kinds.flatMap((k) => sides.map((s) => ({ id: `${k}:${s.id}` as const, label: KIND_LABEL[k](s.title) })))
}

export function shownSavingsChart(asked: SavingsChart, menu: readonly SavingsMenuItem[]): SavingsChart {
  if (menu.some((m) => m.id === asked)) return asked
  const kind = asked.split(':')[0]
  return menu.find((m) => m.id === `${kind}:compared`)?.id ?? menu[0]!.id
}

const depositsOf = (r: LedgerYearRow): number => r.contribution.taxable + r.contribution.pretax + r.contribution.roth + r.contribution.hsa

/** The working rows a figure may count: before the first retired year, never the money-ran-out row. */
const workingRows = (side: ReadySide): readonly LedgerYearRow[] => paidRows(side).filter((r) => r.t < firstRetiredT(side.meta))

export function savingsView(input: AnalysisInput & { readonly chart: SavingsChart; readonly working: boolean }): SavingsView {
  const declared = input.alternative === null ? [input.compared] : [input.alternative, input.compared]
  const charts = savingsMenu(declared, input.working)
  const chart = shownSavingsChart(input.chart, charts)
  const menu: Menu = { charts, chart }
  const gate = gateSides(input)
  if (gate.kind === 'words') return { ...menu, kind: 'words', words: gate.words, metrics: [], notes: [] }
  const steady = input.future === 'steady'
  const [kind, sideId] = chart.split(':') as [SavingsKind, SideId]
  const side = gate.sides.find((s) => s.id === sideId) ?? gate.sides.at(-1)!
  const title = charts.find((c) => c.id === chart)!.label
  const tail = futureNotes(input, [side])
  const door = input.readOnly ? {} : { door: copy.stalenessWUnansweredCta }

  if (kind === 'this-year') {
    const row = side.rows[0]
    const retiredNote = input.working ? [] : [copy.savRetiredNote]
    const total = row === undefined || row.ranOut ? 0 : depositsOf(row)
    if (row === undefined || total <= 0) return { ...menu, kind: 'words', words: copy.savNoDeposits, metrics: [], notes: [...retiredNote, ...tail] }
    const lattice = niceLattice(total > 0 ? Math.max(...DEPOSIT_KINDS.map((k) => row.contribution[k.id])) : 1)
    const year = yearOf(side.meta, row)
    const w = row.workingYear
    const own = w !== undefined && w.pay > 0 ? [slots.savOwnShare(formatDeltaDollar(w.ownDeposits), pctWords(w.ownDeposits / w.pay), formatDeltaDollar(w.pay))] : []
    // A working year with no pay check (no W): the household's own share waits on the figure, said with its door.
    const unasked = input.working && w === undefined && row.payByPerson.some((p) => p > 0)
    return {
      ...menu,
      kind: 'bars',
      title,
      bars: DEPOSIT_KINDS.map((k) => ({
        id: k.id,
        name: k.name,
        value: row.contribution[k.id],
        figure: cmpFigure(row.contribution[k.id]),
        colorIndex: k.colorIndex,
        pattern: k.pattern,
        point: slots.taxStratBarPoint(k.name, formatDeltaDollar(row.contribution[k.id])),
      })),
      ticks: buildYTicks(lattice, mmAxisFormatterFor(lattice.ceiling)),
      metrics: [slots.savThisYear(formatDeltaDollar(total), year), ...own, ...(unasked ? [copy.savOwnUnasked] : [])],
      ...(unasked ? door : {}),
      notes: [copy.savMatchNote, ...retiredNote, ...tail],
      updating: gate.updating,
    }
  }

  const rows = workingRows(side)
  const first = rows[0]
  const last = rows.at(-1)
  if (first === undefined || last === undefined) return { ...menu, kind: 'words', words: slots.savNoWorkingYears(steady), metrics: [], notes: tail }
  const from = yearOf(side.meta, first)
  const through = yearOf(side.meta, last)
  const axis = comparisonAxis(side.meta, input.timeAxis)
  const out = ranOutNote([side], steady, null)
  const outNotes = out !== undefined && endBeforeRetiring(side) ? [out] : []
  const base = { ...menu, ...axis, kind: 'years' as const, title, updating: gate.updating }

  if (kind === 'per-year') {
    const sources: YearSource[] = DEPOSIT_KINDS.map((k) => ({
      id: k.id,
      name: k.name,
      colorIndex: k.colorIndex,
      pattern: k.pattern,
      points: rows.map((r) => ({ year: yearOf(side.meta, r), value: Math.max(0, r.contribution[k.id]) })),
    }))
    const tops = rows.map(depositsOf)
    const lattice = niceLattice(Math.max(1_000, ...tops))
    return {
      ...base,
      sources,
      ticks: buildYTicks(lattice, mmAxisFormatterFor(lattice.ceiling)).map((t) => ({ value: t.dollars, label: t.label })),
      percent: false,
      metrics: [slots.savPerYear(formatDeltaDollar(tops.reduce((a, b) => a + b, 0)), from, through, steady)],
      notes: [copy.savMatchNote, ...outNotes, ...tail],
    }
  }

  // The pay check's two charts need every working row's `workingYear` (insight 178).
  if (rows.some((r) => r.workingYear === undefined)) return { ...menu, kind: 'unasked', words: copy.savWUnasked, ...door, notes: tail }

  if (kind === 'share') {
    const pts = rows.flatMap((r) => (r.workingYear!.pay > 0 ? [{ year: yearOf(side.meta, r), value: (r.workingYear!.ownDeposits / r.workingYear!.pay) * 100 }] : []))
    const lattice = niceLattice(Math.max(1, ...pts.map((p) => p.value)))
    const own = rows.reduce((s, r) => s + r.workingYear!.ownDeposits, 0)
    const pay = rows.reduce((s, r) => s + r.workingYear!.pay, 0)
    return {
      ...base,
      sources: [{ id: 'share', name: copy.savShareName, colorIndex: 0, pattern: 'solid', points: pts }],
      ticks: buildYTicks(lattice, (n) => slots.analysisPercent(String(Math.round(n * 10) / 10))).map((t) => ({ value: t.dollars, label: t.label })),
      percent: true,
      metrics: [slots.savShare(pctWords(pay > 0 ? own / pay : 0), from, through, steady)],
      notes: [...outNotes, ...tail],
    }
  }

  // Left over: money in less money out; a short year below the line, cross-hatched (it draws from savings).
  const left = rows.map((r) => ({ year: yearOf(side.meta, r), value: Math.max(0, r.workingYear!.leftOver) }))
  const short = rows.map((r) => ({ year: yearOf(side.meta, r), value: -Math.max(0, r.workingYear!.shortfall) }))
  const up = Math.max(0, ...left.map((p) => p.value))
  const down = Math.max(0, ...short.map((p) => -p.value))
  const lattice = niceLattice(Math.max(1_000, up, down))
  const above = up > 0 ? Math.max(1, Math.ceil(up / lattice.step - 1e-9)) : 0
  const below = down > 0 ? Math.max(1, Math.ceil(down / lattice.step - 1e-9)) : 0
  const fmt = mmAxisFormatterFor(lattice.step * Math.max(above, below, 1))
  const ticks: { value: number; label: string }[] = []
  for (let k = -below; k <= Math.max(above, below === 0 ? 1 : 0); k++) {
    const v = k * lattice.step
    ticks.push({ value: v, label: v < 0 ? `(${fmt(-v)})` : fmt(v) })
  }
  const net = rows.reduce((s, r) => s + r.workingYear!.leftOver, 0)
  const fig = formatDeltaDollar(net)
  // What the run keeps of a left over (`leftOverCredit`, landed in taxable): said, so a left over is never read as saved.
  const kept = rows.reduce((s, r) => s + r.leftOverCredit, 0)
  const keptLine = up > 0 ? [kept > 0 ? slots.savLeftOverKept(formatDeltaDollar(kept)) : copy.savLeftOverNoneKept] : []
  return {
    ...base,
    sources: [
      { id: 'left', name: copy.savLeftOverName, colorIndex: 0, pattern: 'solid', points: left },
      { id: 'short', name: copy.savShortName, colorIndex: 5, pattern: 'cross', points: short },
    ].filter((s) => s.points.some((p) => p.value !== 0)) as YearSource[],
    ticks,
    percent: false,
    metrics: [slots.savLeftOver(fig, fig === '0' ? 'even' : net > 0 ? 'left' : 'short', from, through, steady), ...keptLine],
    notes: [copy.savLeftOverNote, ...outNotes, ...tail],
  }
}

/** The run's money ran out before its first retired year: its working rows end there. */
function endBeforeRetiring(side: ReadySide): boolean {
  const last = side.rows.at(-1)
  return last !== undefined && last.ranOut && last.t < firstRetiredT(side.meta)
}
