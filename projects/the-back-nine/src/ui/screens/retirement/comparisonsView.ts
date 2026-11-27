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
 * - income tax each year: `taxPaid`, headed "Income tax", the page's one state clause in its notes (plan 4.0). In a
 *   working year `taxPaid` is only what savings' own income adds ON TOP OF PAY (the tax on pay rides the pay check, and
 *   a state's tax on pay sits inside W); in a retired year it is the tax on the year's Social Security, other income,
 *   withdrawals and any Roth conversion together. So two sides' years compare (`taxYears`, milestone 4's review, X1)
 *   where both are retired, or both work on the same pay check (pay, deposits, Social Security and other income match:
 *   then the tax on pay is the same on both, and the gap in `taxPaid` IS the whole income-tax gap). A year where only
 *   one side works, or both work on different pay or deposits, can't be compared. The total and both lines run over ONE
 *   unbroken window, the comparable years after the last year that can't be (a gap in the window would draw a line
 *   across years it never counted); the window is named, and a note says which years before it can't be compared and
 *   why. A Roth conversion before the window prints no total at all (a total would leave the conversion's tax out),
 *   unless it falls in a comparable year paying the same tax on both; no comparable year prints words, never a total.
 *   Your plan alone keeps its years after work stops, with a note naming any income tax its savings add while it still
 *   works. A money-ran-out row's tax is what the year asked for, so it draws no point and counts in no total. Where the tax on pay is spoken of, its pointer is gated on Cash Flows'
 *   own test for drawing the "Pay check's income tax" column (A4).
 * - invested assets as retirement begins: two bars, each side's OPENING total in its own first retired year (its stop
 *   year, which a what-if can move; row one on the all-retired route), each named with its year and its ages, drawn on
 *   ONE scale (insight 169: `KindBars` keys its chart on the picture). Equal bars say nothing moved (insight 174). On
 *   the all-retired route row one's opening is the balance the household entered: the chart is "Invested assets today",
 *   its figures exact with no "~" and no market (X4). A side whose money runs out says so in the notes (O2).
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
import { formatDeltaDollar, formatEnteredDollar, mmAxisFormatterFor } from '../../money'
import { tableFigure } from '../../workbench/yearTableChrome'
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
  paidRows,
  ranOutNote,
  retiredPaidRows,
  startTotal,
  workingPaidRows,
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

/** The menu on the all-retired route: the third chart is what each side holds today (X4). */
const SPINE_CHARTS: typeof COMPARISONS_CHARTS = COMPARISONS_CHARTS.map((c) => (c.id === 'at-retirement' ? { ...c, label: copy.cmpChartToday } : c))

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
  // The all-retired route is the answer's, so every side shares it: read off your plan's rows where they stand.
  const spine = input.compared.rows.kind === 'ready' && input.compared.rows.meta.route === 'spine'
  const menu: Menu = { charts: spine ? SPINE_CHARTS : COMPARISONS_CHARTS, chart: input.chart }
  const gate = gateSides(input)
  if (gate.kind === 'words') return { ...menu, kind: 'words', words: gate.words }
  const sides = gate.sides
  const steady = input.future === 'steady'
  const [first, second] = sides
  const alt = second === undefined ? undefined : first
  const cmp = second ?? first!
  const single = alt === undefined
  const title = menu.charts.find((c) => c.id === input.chart)!.label
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
      // On the all-retired route row one's opening is the balance as entered: exact, never "~" (X4).
      const entered = s.meta.route === 'spine'
      const word = o.row === undefined ? slots.analysisEndWord(endOf(s).year) : null
      const figure = word ?? (entered ? slots.cmpEnteredFigure(formatEnteredDollar(o.value)) : cmpFigure(o.value))
      const name = o.row === undefined ? s.title : slots.cmpBarName(s.title, year, agesIn(s.meta, o.row))
      return {
        id: s.id,
        name,
        value: o.value,
        figure,
        colorIndex: s.id === 'alternative' ? 1 : 0,
        pattern: s.id === 'alternative' ? 'solid' : 'hatch',
        // A side with no opening to show speaks its bar's words, never "~$0" (A7).
        point:
          word !== null
            ? slots.cmpBarWordPoint(name, word)
            : entered
              ? slots.cmpEnteredPoint(name, formatEnteredDollar(o.value))
              : slots.taxStratBarPoint(name, formatDeltaDollar(o.value)),
      }
    })
    const gone = shown.find((x) => x.o.row === undefined)
    const metric = (() => {
      if (gone !== undefined) return slots.cmpAtRetirementGone(gone.s.title, endOf(gone.s).year, steady)
      if (spine) {
        if (single) return slots.cmpTodayOne(cmp.title, formatEnteredDollar(shown[0]!.o.value))
        const d = direction(shown[0]!.o.value, shown[1]!.o.value, formatEnteredDollar)
        return d.dir === 'same' ? slots.cmpTodaySame(formatEnteredDollar(shown[1]!.o.value)) : slots.cmpTodayMore(alt!.title, d.fig, d.dir, cmp.mid)
      }
      if (single) return slots.cmpAtRetirementOne(cmp.title, formatDeltaDollar(shown[0]!.o.value), steady)
      const a = shown[0]!.o.value
      const b = shown[1]!.o.value
      const d = direction(a, b, formatDeltaDollar)
      return d.dir === 'same' ? slots.cmpAtRetirementSame(formatDeltaDollar(b), steady) : slots.cmpAtRetirement(alt!.title, d.fig, d.dir, cmp.mid, steady)
    })()
    // A side whose money runs out says so (O2): its bar is real money, so the bar stays, and the note says the rest.
    const out = ranOutNote(sides, steady, null)
    return {
      ...menu,
      kind: 'bars',
      title,
      bars,
      ticks: buildYTicks(lattice, axisDollar),
      metric,
      // Each bar already names its side's stop year, so no stop-year lever line repeats it (`stopNotes`).
      notes: [...lead, spine ? copy.cmpTodayNote : copy.cmpAtRetirementNote, ...(out !== undefined ? [out] : []), ...futureNotes(input, sides, true)],
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

  // Income tax. Where the tax on pay is spoken of, the pointer Cash Flows can back (A4).
  const pointer = payTaxPointer(sides)
  const sum = (rows: readonly LedgerYearRow[]): number => rows.reduce((s, r) => s + Math.max(0, r.taxPaid), 0)

  if (single) {
    // Your plan alone: its years after work stops (a working year's `taxPaid` is only what its savings add on top of pay).
    const rows = retiredPaidRows(cmp)
    // No retired year paid (its money ran out before or in its first retired year): the words, never an empty picture.
    if (rows.length === 0) return { ...menu, kind: 'words', words: ranOutNote(sides, steady, null) ?? slots.rdShareNone(steady) }
    const series = [pairOf(cmp, points(cmp, rows, (r) => r.taxPaid))]
    const lattice = niceLattice(Math.max(1_000, ...series[0]!.points.map((x) => x.value)))
    const from = yearOf(cmp.meta, rows[0]!)
    const through = yearOf(cmp.meta, rows.at(-1)!)
    // Its working years: the chart starts when work stops, said with where the tax on pay shows; and what its savings add
    // in tax while it still works (a Roth conversion, say), named, since this total leaves it out (X1, rule 5).
    const working = workingPaidRows(cmp)
    const savingsFig = formatDeltaDollar(sum(working))
    const savingsYears = working.filter((r) => r.taxPaid >= 0.5).map((r) => yearOf(cmp.meta, r))
    const workingNotes =
      firstRetiredT(cmp.meta) > 0
        ? [
            copy.cmpTaxWorkingNote,
            pointer,
            ...(savingsFig !== '0' && savingsYears.length > 0 ? [slots.cmpTaxOneWorkingSavings(cmp.mid, savingsFig, slots.analysisYears(savingsYears), steady)] : []),
          ]
        : []
    const out = ranOutNote(sides, steady, null)
    return {
      ...menu,
      ...axis,
      kind: 'pair',
      title,
      series: series as unknown as readonly [PairSeries],
      lattice,
      axisDollar: mmAxisFormatterFor(lattice.ceiling),
      metric: slots.cmpTaxOne(cmp.mid, formatDeltaDollar(sum(rows)), from, through, steady),
      notes: [...lead, ...(out !== undefined ? [out] : []), ...workingNotes, ...tail],
      updating: gate.updating,
    }
  }

  // Two sides: the years whose income tax compares (`taxYears`), as one unbroken window after the last year that doesn't.
  const years = taxYears(alt!, cmp)
  let lastLeft = -1
  years.forEach((y, i) => {
    if (y.left !== undefined) lastLeft = i
  })
  const counted = years.slice(lastLeft + 1)
  const left = years.filter((y) => y.left !== undefined)
  const before = years.slice(0, lastLeft + 1)
  // The years that can't be compared, each run with its reason, in calendar order.
  const leftOut = slots.cmpTaxLeftOut(
    (['phase', 'pay'] as const)
      .map((why) => ({ why, ys: left.filter((y) => y.left === why).map((y) => y.year) }))
      .filter((g) => g.ys.length > 0)
      .sort((p, q) => p.ys[0]! - q.ys[0]!)
      .map((g) => ({ years: slots.analysisYears(g.ys), why: g.why })),
  )
  if (counted.length === 0) {
    // No year compares: words, never a total (and the ran-out note, where a side's money ran out).
    const out = ranOutNote(sides, steady, null)
    return { ...menu, kind: 'words', words: [slots.cmpTaxNoShared(steady), ...(out !== undefined ? [out] : [])].join(' ') }
  }
  const from = counted[0]!.year
  const through = counted.at(-1)!.year
  // A Roth conversion before the window, on either side: a total over the window would leave its tax out, so none (X1,
  // rule 2). `before` holds every shared year ahead of the window: a year that can't be compared counts with a
  // conversion on either side; a comparable year cut off by them only where the two pay different tax in it (the same
  // conversion on the same pay check pays the same tax on both, so leaving it out hides no difference).
  const converts = (y: TaxYear) => y.a.conversion > 0.5 || y.b.conversion > 0.5
  if (before.some((y) => converts(y) && (y.left !== undefined || Math.abs(y.a.taxPaid - y.b.taxPaid) > 0.5))) {
    return { ...menu, kind: 'words', words: slots.cmpTaxConversionBefore(from, leftOut, steady) }
  }
  const series = [
    pairOf(alt!, counted.map((y) => ({ year: y.year, value: Math.max(0, y.a.taxPaid) }))),
    pairOf(cmp, counted.map((y) => ({ year: y.year, value: Math.max(0, y.b.taxPaid) }))),
  ]
  const lattice = niceLattice(Math.max(1_000, ...series.flatMap((p) => p.points.map((x) => x.value))))
  const d = direction(
    counted.reduce((s, y) => s + Math.max(0, y.a.taxPaid), 0),
    counted.reduce((s, y) => s + Math.max(0, y.b.taxPaid), 0),
    formatDeltaDollar,
  )
  const countedWorking = counted.filter((y) => y.working).map((y) => y.year)
  const payDiffers = left.some((y) => y.left === 'pay')
  // The ran-out note names the window's last year.
  const out = ranOutNote(sides, steady, through)
  return {
    ...menu,
    ...axis,
    kind: 'pair',
    title,
    series: series as unknown as readonly [PairSeries, PairSeries],
    lattice,
    axisDollar: mmAxisFormatterFor(lattice.ceiling),
    metric: slots.cmpTaxMore(alt!.mid, d.fig, d.dir, from, through, cmp.mid, steady),
    notes: [
      ...(out !== undefined ? [out] : []),
      ...(left.length > 0 ? [slots.cmpTaxStartsAfter(from, leftOut)] : []),
      ...(countedWorking.length > 0 ? [slots.cmpTaxWorkingCounted(slots.analysisYears(countedWorking))] : []),
      ...(payDiffers ? [copy.cmpTaxPayDiffers, pointer] : []),
      ...tail,
    ],
    updating: gate.updating,
  }
}

/** One calendar year both sides paid: each side's row, whether both still work, and, where the two can't be compared on
 *  income tax, why: `phase`, only one of them works; `pay`, both work on different pay or deposits. */
export interface TaxYear {
  readonly year: number
  readonly a: LedgerYearRow
  readonly b: LedgerYearRow
  readonly working: boolean
  readonly left?: 'phase' | 'pay'
}

/** Every calendar year both sides paid (never a money-ran-out row), in order, each judged for whether its income tax
 *  compares (milestone 4's review, X1). A retired year's `taxPaid` is the year's whole income tax as the overlay solves
 *  it; a working year's is only what savings add on top of pay, so two working years compare only on the same pay check,
 *  where the tax on pay is the same on both. A Roth conversion never moves the pay check, so it never sets a year apart. */
export function taxYears(a: ReadySide, b: ReadySide): TaxYear[] {
  const bAt = new Map(paidRows(b).map((r) => [yearOf(b.meta, r), r] as const))
  const out: TaxYear[] = []
  for (const ra of paidRows(a)) {
    const year = yearOf(a.meta, ra)
    const rb = bAt.get(year)
    if (rb === undefined) continue
    const aWorks = ra.t < firstRetiredT(a.meta)
    const bWorks = rb.t < firstRetiredT(b.meta)
    if (aWorks !== bWorks) out.push({ year, a: ra, b: rb, working: false, left: 'phase' })
    else if (aWorks && !samePayCheck(ra, rb)) out.push({ year, a: ra, b: rb, working: true, left: 'pay' })
    else out.push({ year, a: ra, b: rb, working: aWorks })
  }
  return out
}

/** Two working rows on the same pay check: the same pay and taxable pay per person, the same Social Security and other
 *  income, the same deposits by account, the same filing, and (where a year's cost was given) the same own deposits and
 *  tax on pay. Then the base the overlay taxes savings on top of is the same on both. */
function samePayCheck(a: LedgerYearRow, b: LedgerYearRow): boolean {
  const close = (x: number, y: number) => Math.abs(x - y) <= 0.5
  const sameList = (xs: readonly number[], ys: readonly number[]) => xs.length === ys.length && xs.every((x, i) => close(x, ys[i]!))
  const kinds = ['taxable', 'pretax', 'roth', 'hsa'] as const
  if (a.filing !== b.filing || !close(a.socialSecurity, b.socialSecurity)) return false
  if (!sameList(a.payByPerson, b.payByPerson) || !sameList(a.payTaxableByPerson, b.payTaxableByPerson)) return false
  if (!sameList(a.otherIncomeByPerson.map((o) => o.gross), b.otherIncomeByPerson.map((o) => o.gross))) return false
  if (!sameList(a.otherIncomeByPerson.map((o) => o.taxable), b.otherIncomeByPerson.map((o) => o.taxable))) return false
  if (kinds.some((k) => !close(a.contribution[k], b.contribution[k]))) return false
  const wa = a.workingYear
  const wb = b.workingYear
  if (wa === undefined || wb === undefined) return wa === wb
  return close(wa.ownDeposits, wb.ownDeposits) && close(wa.taxOnOutsideIncome, wb.taxOnOutsideIncome)
}

/** Where the tax on pay shows, by Cash Flows' own test for drawing its "Pay check's income tax" column (a row whose
 *  `workingYear.taxOnOutsideIncome` prints as a figure, `tableFigure`): shown there; not asked yet where no row carries
 *  a pay check (no W, insight 178); none where the pay checks carry no income tax (A4). */
function payTaxPointer(sides: readonly ReadySide[]): string {
  const rows = sides.flatMap((s) => s.rows)
  if (rows.some((r) => tableFigure(r.workingYear?.taxOnOutsideIncome, { sign: '', entered: false, t: r.t }) !== null)) return copy.cmpPayTaxShown
  return rows.some((r) => r.workingYear !== undefined) ? copy.cmpPayTaxNone : copy.cmpPayTaxUnasked
}
