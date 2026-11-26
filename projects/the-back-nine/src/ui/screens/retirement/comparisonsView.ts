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
 * - income tax each year: `taxPaid`, headed "Income tax", the page's one state clause in its notes (plan 4.0); a
 *   money-ran-out row's tax is what the year asked for, so it draws no point and counts in no total. The metric totals
 *   every year through the last year BOTH sides paid, named in the sentence. Where a side has a year with pay the notes
 *   say the tax on pay is not in it (it rides `workingYear`, shown on Cash Flows).
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
  lastSharedPaidYear,
  lastSharedYear,
  ranOutNote,
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

const pairOf = (side: ReadySide, pts: readonly YearPoint[], endWord?: string): PairSeries => ({
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
      notes: [...lead, copy.cmpAtRetirementNote, ...tail],
      updating: gate.updating,
    }
  }

  const axis = comparisonAxis(cmp.meta, input.timeAxis)
  if (input.chart === 'assets') {
    const series = sides.map((s) => {
      const e = endOf(s)
      return pairOf(s, points(s, s.rows, endTotal), e.ranOut ? slots.analysisEndWord(e.year) : undefined)
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
    const metric = single
      ? slots.cmpOneAt(cmp.title, formatDeltaDollar(at(cmp)), ages, year, steady)
      : (() => {
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

  // Income tax: the rows each side paid (never the money-ran-out row's asked-for tax), totalled through the last year
  // every side paid.
  const series = sides.map((s) => pairOf(s, points(s, s.rows.filter((r) => !r.ranOut), (r) => r.taxPaid)))
  const lattice = niceLattice(Math.max(1_000, ...series.flatMap((p) => p.points.map((x) => x.value))))
  const through = lastSharedPaidYear(sides)
  // No year paid on some side (its money ran out in its first year): the words, never an empty picture.
  if (series.some((p) => p.points.length === 0)) return { ...menu, kind: 'words', words: ranOutNote(sides, steady, null) ?? copy.analysisRunsError }
  const total = (s: ReadySide): number => s.rows.filter((r) => !r.ranOut && yearOf(s.meta, r) <= through).reduce((sum, r) => sum + Math.max(0, r.taxPaid), 0)
  const metric = single
    ? slots.cmpTaxOne(cmp.title, formatDeltaDollar(total(cmp)), through, steady)
    : (() => {
        const d = direction(total(alt!), total(cmp), formatDeltaDollar)
        return slots.cmpTaxMore(alt!.title, d.fig, d.dir, through, cmp.mid, steady)
      })()
  const withPay = sides.some((s) => s.rows.some((r) => r.workingYear !== undefined || r.payByPerson.some((p) => p > 0)))
  const out = ranOutNote(sides, steady, through)
  return {
    ...menu,
    ...axis,
    kind: 'pair',
    title,
    series: series as unknown as readonly [PairSeries, PairSeries] | readonly [PairSeries],
    lattice,
    axisDollar: mmAxisFormatterFor(lattice.ceiling),
    metric,
    notes: [...lead, ...(out !== undefined ? [out] : []), ...(withPay ? [copy.cmpTaxWorkingNote] : []), ...tail],
    updating: gate.updating,
  }
}
