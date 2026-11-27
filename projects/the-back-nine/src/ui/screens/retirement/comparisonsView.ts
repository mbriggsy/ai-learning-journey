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
 *   withdrawals and any Roth conversion together. So two sides' years compare (`taxYears`, milestone 4's review, X1 and
 *   round 2's R2F1) where both are retired (each figure `taxPaid`), or both work: with W given, each figure is
 *   `taxPaid + workingYear.taxOnOutsideIncome`, what the run itself charges as income tax (a claim age or a deposit moves
 *   its own tax into the pay check's part); with no W, `taxPaid` on the same pay check only, and a pay check that differs
 *   (Social Security, deposits) prints words, never a total, since the tax that difference makes sits on pay, which
 *   nothing prices. A year where work has stopped in one side but not the other can't be compared. The total and both
 *   lines run over ONE unbroken window of the same per-year figure, the comparable years after the last year that can't
 *   be (a gap in the window would draw a line across years it never counted); the window is named, and a note says which
 *   years before it can't be compared and why. A Roth conversion before the window prints no total at all (a total
 *   would leave the conversion's tax out), unless it falls in a comparable year whose figures match; no window prints
 *   words, never a total. Your plan alone keeps its years after work stops, with a note naming any income tax its savings
 *   add while it still works. A money-ran-out row's tax is what the year asked for, so it draws no point and counts in no
 *   total. Where the tax on pay is spoken of, its pointer is gated on Cash Flows' own test for drawing the "Pay check's
 *   income tax" column (A4).
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
  // Both still work with no W, on different pay checks (a claim age or a deposit): the tax that difference makes sits on
  // pay, which nothing prices, so no total anywhere (round 2, R2F1 rule c), with the premise that would price it.
  const unpriced = years.filter((y) => y.unpriced !== undefined)
  if (unpriced.length > 0) {
    const ss = unpriced.some((y) => y.unpriced!.ss)
    const deposits = unpriced.some((y) => y.unpriced!.deposits)
    const what = ss && deposits ? 'both' : ss ? 'ss' : deposits ? 'deposits' : 'pay'
    return { ...menu, kind: 'words', words: [slots.cmpTaxUnpriced(what, slots.analysisYears(unpriced.map((y) => y.year)), steady), copy.cmpPayTaxUnasked].join(' ') }
  }
  let lastLeft = -1
  years.forEach((y, i) => {
    if (y.left !== undefined) lastLeft = i
  })
  const counted = years.slice(lastLeft + 1)
  const left = years.filter((y) => y.left !== undefined)
  const before = years.slice(0, lastLeft + 1)
  // The years that can't be compared, each run named by which side still works (R2F3), in calendar order.
  const leftOutOf = (ys: readonly TaxYear[]): string =>
    slots.cmpTaxLeftOut(
      (['a', 'b'] as const)
        .map((works) => ({ works, ys: ys.filter((y) => y.left === works).map((y) => y.year) }))
        .filter((g) => g.ys.length > 0)
        .sort((p, q) => p.ys[0]! - q.ys[0]!)
        .map((g) => ({ years: slots.analysisYears(g.ys), stopped: g.works === 'a' ? cmp.mid : alt!.mid, working: g.works === 'a' ? alt!.mid : cmp.mid })),
    )
  const leftOut = leftOutOf(left)
  if (counted.length === 0) {
    // No window: words, never a total (and the ran-out note, where a side's money ran out). Where years before the last
    // left-out one do compare, the words say from when the two never compare again, never that no year compares (R2F4).
    const out = ranOutNote(sides, steady, null)
    const lastComparable = years.findLastIndex((y) => y.left === undefined)
    const after = years.slice(lastComparable + 1)
    const words =
      years.length === 0 ? slots.cmpTaxNoShared(steady) : lastComparable < 0 ? slots.cmpTaxNoShared(steady, leftOut) : slots.cmpTaxNoShared(steady, leftOutOf(after), after[0]!.year)
    return { ...menu, kind: 'words', words: [words, ...(out !== undefined ? [out] : [])].join(' ') }
  }
  const from = counted[0]!.year
  const through = counted.at(-1)!.year
  // A Roth conversion before the window, on either side: a total over the window would leave its tax out, so none (X1,
  // rule 2). `before` holds every shared year ahead of the window: a year that can't be compared counts with a
  // conversion on either side; a comparable year cut off by them only where the two figures differ in it (the same
  // conversion on the same pay check pays the same tax on both, so leaving it out hides no difference).
  const converts = (y: TaxYear) => y.a.conversion > 0.5 || y.b.conversion > 0.5
  if (before.some((y) => converts(y) && (y.left !== undefined || Math.abs(y.fa - y.fb) > 0.5))) {
    return { ...menu, kind: 'words', words: slots.cmpTaxConversionBefore(from, leftOut, steady) }
  }
  // The lines draw exactly the per-year figure the total counts.
  const series = [pairOf(alt!, counted.map((y) => ({ year: y.year, value: y.fa }))), pairOf(cmp, counted.map((y) => ({ year: y.year, value: y.fb })))]
  const lattice = niceLattice(Math.max(1_000, ...series.flatMap((p) => p.points.map((x) => x.value))))
  const d = direction(
    counted.reduce((s, y) => s + y.fa, 0),
    counted.reduce((s, y) => s + y.fb, 0),
    formatDeltaDollar,
  )
  const countedWorking = counted.filter((y) => y.working)
  // W is the household's, so every counted working year is priced or none is.
  const priced = countedWorking.every((y) => y.priced)
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
      ...(countedWorking.length > 0 ? [slots.cmpTaxWorkingCounted(slots.analysisYears(countedWorking.map((y) => y.year)), priced), pointer] : []),
      ...tail,
    ],
    updating: gate.updating,
  }
}

/** One calendar year both sides paid: each side's row and the figure its line draws and the total counts (`fa`, `fb`),
 *  whether both still work, and why the year can't be counted, where it can't. */
export interface TaxYear {
  readonly year: number
  readonly a: LedgerYearRow
  readonly b: LedgerYearRow
  readonly fa: number
  readonly fb: number
  readonly working: boolean
  /** Both work and what a working year costs is given: the figure holds the pay check's income tax. */
  readonly priced: boolean
  /** Work has stopped in one side but not the other: left out, and which side (`a` or `b`) still works. */
  readonly left?: 'a' | 'b'
  /** Both work with no W, on different pay checks: what differs. The chart prints words, never a total. */
  readonly unpriced?: { readonly ss: boolean; readonly deposits: boolean }
}

/** Every calendar year both sides paid (never a money-ran-out row), in order, each with its figure (milestone 4's review,
 *  X1; round 2, R2F1). A retired year's `taxPaid` is the tax on all the year's income. A working year's `taxPaid` is only
 *  what savings add on top of pay; the pay check's own income tax rides `workingYear.taxOnOutsideIncome`, priced only
 *  where W is given. So:
 *  - both retired: the figure is `taxPaid`;
 *  - both work, W given: `taxPaid + taxOnOutsideIncome`, what the run itself charges as income tax that year (a claim age
 *    or a deposit moves its own tax into the pay check's part, so leaving that part out flipped the direction);
 *  - both work, no W: `taxPaid`, counted only on the same pay check (the tax on pay is then the same on both); any other
 *    difference is `unpriced`: its tax sits on pay, which nothing prices;
 *  - work stopped in one only: left out (a working year's figure beside a retired one's measures different things).
 *  A Roth conversion never moves the pay check: its tax is in `taxPaid`, so it never sets a year apart. */
export function taxYears(a: ReadySide, b: ReadySide): TaxYear[] {
  const bAt = new Map(paidRows(b).map((r) => [yearOf(b.meta, r), r] as const))
  const paid = (r: LedgerYearRow) => Math.max(0, r.taxPaid)
  const out: TaxYear[] = []
  for (const ra of paidRows(a)) {
    const year = yearOf(a.meta, ra)
    const rb = bAt.get(year)
    if (rb === undefined) continue
    const aWorks = ra.t < firstRetiredT(a.meta)
    const bWorks = rb.t < firstRetiredT(b.meta)
    const wa = ra.workingYear
    const wb = rb.workingYear
    if (aWorks !== bWorks) out.push({ year, a: ra, b: rb, fa: 0, fb: 0, working: false, priced: false, left: aWorks ? 'a' : 'b' })
    else if (!aWorks) out.push({ year, a: ra, b: rb, fa: paid(ra), fb: paid(rb), working: false, priced: false })
    else if (wa !== undefined && wb !== undefined)
      out.push({ year, a: ra, b: rb, fa: paid(ra) + Math.max(0, wa.taxOnOutsideIncome), fb: paid(rb) + Math.max(0, wb.taxOnOutsideIncome), working: true, priced: true })
    else if (wa === undefined && wb === undefined && samePayCheck(ra, rb)) out.push({ year, a: ra, b: rb, fa: paid(ra), fb: paid(rb), working: true, priced: false })
    else out.push({ year, a: ra, b: rb, fa: paid(ra), fb: paid(rb), working: true, priced: false, unpriced: payCheckDiffers(ra, rb) })
  }
  return out
}

const close = (x: number, y: number) => Math.abs(x - y) <= 0.5
const sameList = (xs: readonly number[], ys: readonly number[]) => xs.length === ys.length && xs.every((x, i) => close(x, ys[i]!))
const KINDS = ['taxable', 'pretax', 'roth', 'hsa'] as const

/** What differs between two working rows' pay checks: Social Security, and the deposits (by account, or the taxable pay
 *  they leave). Anything else (pay, other income, filing) reads as the pay check itself. */
function payCheckDiffers(a: LedgerYearRow, b: LedgerYearRow): { readonly ss: boolean; readonly deposits: boolean } {
  return {
    ss: !close(a.socialSecurity, b.socialSecurity),
    deposits: KINDS.some((k) => !close(a.contribution[k], b.contribution[k])) || !sameList(a.payTaxableByPerson, b.payTaxableByPerson),
  }
}

/** Two working rows with no W on the same pay check: the same pay and taxable pay per person, the same Social Security
 *  and other income, the same deposits by account, the same filing. Then the tax on pay, which nothing prices, is the
 *  same on both. */
function samePayCheck(a: LedgerYearRow, b: LedgerYearRow): boolean {
  if (a.filing !== b.filing || !close(a.socialSecurity, b.socialSecurity)) return false
  if (!sameList(a.payByPerson, b.payByPerson) || !sameList(a.payTaxableByPerson, b.payTaxableByPerson)) return false
  if (!sameList(a.otherIncomeByPerson.map((o) => o.gross), b.otherIncomeByPerson.map((o) => o.gross))) return false
  if (!sameList(a.otherIncomeByPerson.map((o) => o.taxable), b.otherIncomeByPerson.map((o) => o.taxable))) return false
  return !KINDS.some((k) => !close(a.contribution[k], b.contribution[k]))
}

/** Where the tax on pay shows, by Cash Flows' own test for drawing its "Pay check's income tax" column (a row whose
 *  `workingYear.taxOnOutsideIncome` prints as a figure, `tableFigure`): shown there; not asked yet where no row carries
 *  a pay check (no W, insight 178); none where the pay checks carry no income tax (A4). */
function payTaxPointer(sides: readonly ReadySide[]): string {
  const rows = sides.flatMap((s) => s.rows)
  if (rows.some((r) => tableFigure(r.workingYear?.taxOnOutsideIncome, { sign: '', entered: false, t: r.t }) !== null)) return copy.cmpPayTaxShown
  return rows.some((r) => r.workingYear !== undefined) ? copy.cmpPayTaxNone : copy.cmpPayTaxUnasked
}
