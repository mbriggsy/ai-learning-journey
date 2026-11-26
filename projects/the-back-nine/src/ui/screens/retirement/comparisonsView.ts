/**
 * src/ui/screens/retirement/comparisonsView.ts: Retirement → Analysis → Comparisons, the pure composer (plan
 * docs/plans/6-rightcapital-ui-plan.md, RC17; ref 2.10; `rc-analysis/comparisons-tab-retirement-analysis__…10-46-33.png`,
 * `FRAME_comparisons-assets-at-retirement-bars.png`, `FRAME_comparisons-taxes-overlap-area.png`). `Comparisons.tsx` draws
 * what this returns and decides nothing.
 *
 * THREE CHARTS, picked by the chart title's menu, each over the two sides' rows in one named future (`analysisRuns.ts`):
 * - invested assets over time: each row's year-end total (the engine's own `totalAcrossBuckets`), the two sides as
 *   overlapping areas (the alternative solid green, the compared plan an outline with a dashed top line, each line ending
 *   in its figure). A run whose money ran out ends at its zero close, labelled "Money ran out in <year>", never "~$0".
 *   The metric compares the two at the last year BOTH rows reach (a ran-out run's close there is zero: the money gone),
 *   naming that year and the ages in it (insight 175).
 * - income tax each year: `taxPaid`, headed "Income tax", the page's one state clause in its notes (plan 4.0), over the
 *   RETIRED years only: in a working year `taxPaid` is only what savings' own income adds (the tax on pay rides the pay
 *   check, and a state's tax on pay sits inside W), so a stop-year or deposits lever would compare unlike years. Each
 *   line runs over its own retired years; the metric totals the retired years both sides share (`sharedRetiredWindow`),
 *   named as the years after work stops, and words, never a total, where they share none. A money-ran-out row's tax is
 *   what the year asked for, so it draws no point and counts in no total. Where a side works, the notes say the chart
 *   starts when work stops, and where the two sides' working years differ, that their tax on pay differs too (shown in
 *   Cash Flows' "Pay check's income tax" column).
 * - invested assets as retirement begins: two bars, each side's OPENING total in its own first retired year (its stop
 *   year, which a what-if can move; row one on the all-retired route), each named with its year and its ages, drawn on
 *   ONE scale (insight 169: `KindBars` keys its chart on the picture). Equal bars say nothing moved (insight 174).
 *
 * WITH NO WHAT-IF OPEN beside your plan there is one side: your plan alone, and a line saying how to set something
 * beside it (never a second line copied from the first). The net worth chart is left out: B9 holds no debts or property.
 *
 * READ-ONLY: the view carries no write action on any tab (it has no door at all).
 */
import { buildYTicks, niceLattice, type DollarLattice } from '@viz/bandData'
import type { KindBar } from '@viz/charts/kindBarsOptions'
import type { PairSeries, YearPoint } from '@viz/charts/stackedAreasOptions'
import type { LedgerYearRow } from '@shared/model'
import { copy, slots } from '../../copy'
import { formatDeltaDollar, mmAxisFormatterFor } from '../../money'
import { comparisonAxis, type ComparisonAxis } from '../tax/taxRunsView'
import {
  agesIn,
  direction,
  endOf,
  endTotal,
  firstRetiredT,
  futureNotes,
  gateSides,
  lastSharedYear,
  ranOutNote,
  retiredPaidRows,
  sharedRetiredWindow,
  startTotal,
  yearOf,
  type AnalysisInput,
  type ReadySide,
} from './analysisRuns'

export type ComparisonsChart = 'assets' | 'tax' | 'at-retirement'

export const COMPARISONS_CHARTS: readonly { readonly id: ComparisonsChart; readonly label: string }[] = [
  { id: 'assets', label: copy.cmpChartAssets },
  { id: 'tax', label: copy.cmpChartTax },
  { id: 'at-retirement', label: copy.cmpChartAtRetirement },
]

interface Menu {
  readonly charts: typeof COMPARISONS_CHARTS
  readonly chart: ComparisonsChart
}

export type ComparisonsView =
  | (Menu & { readonly kind: 'words'; readonly words: string })
  | (Menu &
      ComparisonAxis & {
        readonly kind: 'pair'
        readonly title: string
        readonly series: readonly [PairSeries, PairSeries] | readonly [PairSeries]
        readonly lattice: DollarLattice
        readonly axisDollar: (dollars: number) => string
        readonly metric: string
        readonly notes: readonly string[]
        readonly updating: boolean
      })
  | (Menu & {
      readonly kind: 'bars'
      readonly title: string
      readonly bars: readonly KindBar[]
      readonly ticks: readonly { readonly dollars: number; readonly label: string }[]
      readonly metric: string
      readonly notes: readonly string[]
      readonly updating: boolean
    })

/** A printed dollar figure (`~$1,230,000`). */
export const cmpFigure = (dollars: number): string => slots.taxStratValue(formatDeltaDollar(dollars))

const PAIR_ID: Readonly<Record<ReadySide['id'], string>> = { alternative: 'cmp-alternative', compared: 'cmp-compared' }

const points = (side: ReadySide, rows: readonly LedgerYearRow[], read: (r: LedgerYearRow) => number): YearPoint[] =>
  rows.map((r) => ({ year: yearOf(side.meta, r), value: Math.max(0, read(r)) }))

const pairOf = (side: ReadySide, pts: readonly YearPoint[], endWord?: readonly string[]): PairSeries => ({
  id: PAIR_ID[side.id],
  name: side.title,
  role: side.id,
  points: pts,
  ...(endWord !== undefined ? { endWord } : {}),
})

export function comparisonsView(input: AnalysisInput & { readonly chart: ComparisonsChart }): ComparisonsView {
  const menu: Menu = { charts: COMPARISONS_CHARTS, chart: input.chart }
  const gate = gateSides(input)
  if (gate.kind === 'words') return { ...menu, kind: 'words', words: gate.words }
  const sides = gate.sides
  const steady = input.future === 'steady'
  const [first, second] = sides
  const alt = second === undefined ? undefined : first
  const cmp = second ?? first!
  const single = alt === undefined
  const title = COMPARISONS_CHARTS.find((c) => c.id === input.chart)!.label
  const lead = single ? [copy.cmpNoWhatIf] : []
  const tail = futureNotes(input, sides)

  if (input.chart === 'at-retirement') {
    const opening = (side: ReadySide): { readonly row: LedgerYearRow | undefined; readonly value: number } => {
      const row = side.rows.find((r) => r.t === firstRetiredT(side.meta))
      return { row, value: row === undefined ? 0 : Math.max(0, startTotal(row)) }
    }
    const shown = sides.map((s) => ({ s, o: opening(s) }))
    const lattice = niceLattice(Math.max(1_000, ...shown.map((x) => x.o.value)))
    const axisDollar = mmAxisFormatterFor(lattice.ceiling)
    const bars: KindBar[] = shown.map(({ s, o }) => {
      const year = s.meta.startCalendarYear + firstRetiredT(s.meta)
      const figure = o.row === undefined ? slots.analysisEndWord(endOf(s).year) : cmpFigure(o.value)
      const name = o.row === undefined ? s.title : slots.cmpBarName(s.title, year, agesIn(s.meta, o.row))
      return {
        id: s.id,
        name,
        value: o.value,
        figure,
        colorIndex: s.id === 'alternative' ? 1 : 0,
        pattern: s.id === 'alternative' ? 'solid' : 'hatch',
        point: slots.taxStratBarPoint(name, formatDeltaDollar(o.value)),
      }
    })
    const gone = shown.find((x) => x.o.row === undefined)
    const metric = (() => {
      if (gone !== undefined) return slots.cmpAtRetirementGone(gone.s.title, endOf(gone.s).year, steady)
      if (single) return slots.cmpAtRetirementOne(cmp.title, formatDeltaDollar(shown[0]!.o.value), steady)
      const a = shown[0]!.o.value
      const b = shown[1]!.o.value
      const d = direction(a, b, formatDeltaDollar)
      return d.dir === 'same' ? slots.cmpAtRetirementSame(formatDeltaDollar(b), steady) : slots.cmpAtRetirement(alt!.title, d.fig, d.dir, cmp.mid, steady)
    })()
    return {
      ...menu,
      kind: 'bars',
      title,
      bars,
      ticks: buildYTicks(lattice, axisDollar),
      metric,
      // Each bar already names its side's stop year, so no stop-year lever line repeats it (`stopNotes`).
      notes: [...lead, copy.cmpAtRetirementNote, ...futureNotes(input, sides, true)],
      updating: gate.updating,
    }
  }

  const axis = comparisonAxis(cmp.meta, input.timeAxis)
  if (input.chart === 'assets') {
    const series = sides.map((s) => {
      const e = endOf(s)
      return pairOf(s, points(s, s.rows, endTotal), e.ranOut ? slots.analysisEndWordLines(e.year) : undefined)
    })
    const top = Math.max(0, ...series.flatMap((p) => p.points.map((x) => x.value)))
    // Nothing invested in any year shown (a run whose money runs out in its first year): the words, never a $0 picture.
    if (top <= 0) return { ...menu, kind: 'words', words: ranOutNote(sides, steady, null) ?? copy.analysisRunsError }
    const lattice = niceLattice(Math.max(1_000, top))
    // The last year both rows reach; a ran-out run's close there is zero, its money gone (said in the note).
    const year = lastSharedYear(sides)
    const at = (s: ReadySide) => {
      const row = s.rows.find((r) => yearOf(s.meta, r) === year)
      return row === undefined ? 0 : Math.max(0, endTotal(row))
    }
    const cmpRow = cmp.rows.find((r) => yearOf(cmp.meta, r) === year) ?? cmp.rows.at(-1)!
    const ages = agesIn(cmp.meta, cmpRow)
    // Your plan alone, run out at its last year: its close there is no balance, so the sentence says the money ran out,
    // never "holds ~$0" (as its line's end says).
    const metric = single
      ? endOf(cmp).ranOut
        ? slots.cmpOneRanOut(cmp.title, ages, year, steady)
        : slots.cmpOneAt(cmp.title, formatDeltaDollar(at(cmp)), ages, year, steady)
      : (() => {
          // Both run out by that year: neither holds anything, so never "about the same invested".
          if (endOf(alt!).ranOut && endOf(cmp).ranOut && endOf(alt!).year === year && endOf(cmp).year === year) return slots.cmpBothRanOut(alt!.title, cmp.mid, ages, year, steady)
          const d = direction(at(alt!), at(cmp), formatDeltaDollar)
          return slots.cmpMoreAt(alt!.title, d.fig, d.dir, ages, year, cmp.mid, steady)
        })()
    const out = ranOutNote(sides, steady, year)
    return {
      ...menu,
      ...axis,
      kind: 'pair',
      title,
      series: series as unknown as readonly [PairSeries, PairSeries] | readonly [PairSeries],
      lattice,
      axisDollar: mmAxisFormatterFor(lattice.ceiling),
      metric,
      notes: [...lead, copy.cmpAssetsNote, ...(out !== undefined ? [out] : []), ...tail],
      updating: gate.updating,
    }
  }

  // Income tax: the RETIRED years each side paid. In a working year `taxPaid` is only what savings' own income adds (the
  // tax on pay rides the pay check, and a state's tax on pay sits inside W), so a working year would compare unlike
  // things: each line runs over its own retired years, and the totals count the retired years both sides share.
  const series = sides.map((s) => pairOf(s, points(s, retiredPaidRows(s), (r) => r.taxPaid)))
  const lattice = niceLattice(Math.max(1_000, ...series.flatMap((p) => p.points.map((x) => x.value))))
  // No retired year paid on some side (its money ran out before or in its first retired year): the words, never an
  // empty picture.
  if (series.some((p) => p.points.length === 0)) return { ...menu, kind: 'words', words: ranOutNote(sides, steady, null) ?? slots.rdShareNone(steady) }
  const window = sharedRetiredWindow(sides)
  const total = (s: ReadySide, w: { readonly from: number; readonly through: number }): number =>
    retiredPaidRows(s)
      .filter((r) => yearOf(s.meta, r) >= w.from && yearOf(s.meta, r) <= w.through)
      .reduce((sum, r) => sum + Math.max(0, r.taxPaid), 0)
  const metric =
    window === null
      ? slots.cmpTaxNoShared(steady)
      : single
        ? slots.cmpTaxOne(cmp.mid, formatDeltaDollar(total(cmp, window)), window.from, window.through, steady)
        : (() => {
            const d = direction(total(alt!, window), total(cmp, window), formatDeltaDollar)
            return slots.cmpTaxMore(alt!.mid, d.fig, d.dir, window.from, window.through, cmp.mid, steady)
          })()
  // Where a side has working years the chart starts when work stops, said; where the two sides' working years differ (a
  // stop-year lever, other deposits), their tax on pay differs too, said with where it shows.
  const withPay = sides.some((s) => firstRetiredT(s.meta) > 0)
  const payDiffers = !single && withPay && workingYearsDiffer(alt!, cmp)
  // The ran-out note names the window's last year where a total counts one; with no shared window, no total, no clause.
  const out = ranOutNote(sides, steady, window?.through ?? null)
  return {
    ...menu,
    ...axis,
    kind: 'pair',
    title,
    series: series as unknown as readonly [PairSeries, PairSeries] | readonly [PairSeries],
    lattice,
    axisDollar: mmAxisFormatterFor(lattice.ceiling),
    metric,
    notes: [...lead, ...(out !== undefined ? [out] : []), ...(payDiffers ? [copy.cmpTaxPayDiffers] : withPay ? [copy.cmpTaxWorkingNote] : []), ...tail],
    updating: gate.updating,
  }
}

/** Whether two sides' working years differ: a different first retired year, or a working year whose pay or deposits
 *  differ (then their tax on pay can differ too). */
export function workingYearsDiffer(a: ReadySide, b: ReadySide): boolean {
  const ta = firstRetiredT(a.meta)
  if (ta !== firstRetiredT(b.meta) || a.meta.startCalendarYear !== b.meta.startCalendarYear) return true
  const sum = (xs: readonly number[]) => xs.reduce((s, x) => s + x, 0)
  const kinds = ['taxable', 'pretax', 'roth', 'hsa'] as const
  for (let t = 0; t < ta; t++) {
    const ra = a.rows.find((r) => r.t === t)
    const rb = b.rows.find((r) => r.t === t)
    if (ra === undefined || rb === undefined) return ra !== rb
    if (Math.abs(sum(ra.payByPerson) - sum(rb.payByPerson)) > 0.5) return true
    if (kinds.some((k) => Math.abs(ra.contribution[k] - rb.contribution[k]) > 0.5)) return true
  }
  return false
}
