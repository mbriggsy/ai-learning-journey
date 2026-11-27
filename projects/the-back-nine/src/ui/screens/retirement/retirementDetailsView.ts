/**
 * src/ui/screens/retirement/retirementDetailsView.ts: Retirement → Analysis → Retirement Details, the pure composer (plan
 * docs/plans/6-rightcapital-ui-plan.md, RC17; ref 2.12; `rc-analysis/retirement-details-tab-…13-47-56-2x.png`,
 * `blog__income-comparison.png`, `blog__retirement-spending.png`). `RetirementDetails.tsx` draws what this returns.
 *
 * THE CHARTS, picked by the chart title's menu (each side's own, "of <its name>", and the two comparisons where a what-if
 * is open beside the plan), all over the RETIRED rows (from the run's first retired year, `analysisRuns.ts`):
 * - income sources: stacked columns per retired year from the bottom: Social Security, other income, then what was
 *   taken from taxable, pre-tax, Roth and the HSA (each its row field: `socialSecurity`, the sum of
 *   `otherIncomeByPerson[].gross`, `draw.taxable`, `draw.pretax`, `draw.roth`, `hsaSpend`).
 * - the withdrawal rate: each retired year's withdrawals toward its need (`draw` × 3 + `hsaSpend`; never a conversion,
 *   never `rmdToTaxable`) over the year's OPENING invested total (`start`), in percent.
 * - spending: the year's spending (`spending`, out-of-pocket medical in it; no premium is in it: the budget has no
 *   medical category and the overlay prices premiums on top, `budgetToSpending.ts`, `taxOverlay.ts`), income tax
 *   (`taxPaid`) and health premiums (`premiums.acaNet + medicare + medicareExtras`; the surcharge is part of `medicare`).
 * - the income comparison: one donut per side, the share of what the retired years live on, by source, with the share
 *   that is not a withdrawal in the hole; and the spending comparison: grouped bars of the three spending parts in all.
 *   Both count ONE window, the retired years both sides share (`sharedRetiredWindow`), named in the sentence, with the
 *   ran-out note where a side's money runs out (A1), and words, never a total, where they share none (O3). Beside the
 *   spending comparison, wherever either side paid in a year before the window, one line says both sides' earlier years
 *   are left out, spending, premiums and income tax, any Roth conversion included (milestone 4's review, X1; round 2,
 *   R2F2), so "spends less in all" never reads as a saving those years paid for; it points at Cash Flows' "Your plan
 *   beside the what-if" only where that form shows these two runs (your plan compared, a what-if beside it).
 *
 * THE YEAR THE MONEY RAN OUT draws no column (its row is what the year asked for): a cross-hatched band over it with
 * "Money ran out this year" and no dollar figure, the rows ending there, both said in the key-metric column.
 *
 * KEY METRICS: the share of income that is not a withdrawal (Social Security and other income, less the part past the
 * year's spending that the tool does not keep, `incomeNotKept`, over that plus the withdrawals), and the short years
 * (the year the money runs out, if any). Every one names its market (one path, plan 4.0) and its years.
 *
 * READ-ONLY: no door here writes; the view carries no write action.
 */
import { buildYTicks, niceLattice, type DollarLattice } from '@viz/bandData'
import type { DonutPart } from '@viz/charts/donutOptions'
import type { GroupedBarSeries } from '@viz/charts/groupedBarsOptions'
import type { YearSource } from '@viz/charts/incomeSourcesOptions'
import type { PatternKind } from '@viz/charts/patterns'
import { INHERITED_COLOR_INDEX } from '@viz/palette'
import type { LedgerYearRow } from '@shared/model'
import { copy, slots } from '../../copy'
import { formatDeltaDollar, formatMmDollar, mmAxisFormatterFor } from '../../money'
import { comparisonAxis, type ComparisonAxis } from '../tax/taxRunsView'
import {
  agesIn,
  direction,
  endOf,
  firstRetiredT,
  futureNotes,
  gateSides,
  keptIncome,
  paidRows,
  pctWords,
  premiumsOf,
  ranOutNote,
  retiredPaidRows,
  sharedRetiredWindow,
  startTotal,
  withdrawn,
  yearOf,
  type AnalysisInput,
  type ReadySide,
  type SideId,
} from './analysisRuns'

export type DetailsKind = 'income' | 'rate' | 'spending'
export type RetirementDetailsChart = `${DetailsKind}:${SideId}` | 'income-comparison' | 'spending-comparison'

/** One part's look: its colour slot and pattern (`palette.ts`'s RC_PAIRS rows for every pair that can touch). */
interface Look {
  readonly colorIndex: number
  readonly pattern: PatternKind | 'solid'
}

/** The income parts, bottom-up: Social Security deep indigo (it clears the floor beside every withdrawal hue), other
 *  income light green in vertical lines (so it never rests on its colour beside the solid indigo and blue; the cross is
 *  the money-ran-out band's, in the same chart), then the withdrawal stacks' own look (taxable solid blue, pre-tax
 *  hatched orange, Roth dotted green, HSA lined sky, the inherited IRAs zigzagged umber, the Act 5 plan's U13). The
 *  inherited part is what the inherited IRAs paid toward the year (each one's withdrawal less the part moved to taxable,
 *  `analysisRuns.withdrawn`'s own reading), as pre-tax's draw leaves out a required withdrawal moved to taxable. */
/** A stacked part: its look, its words, its row reading; `whenDrawn`, a part drawn only where some year holds it (the
 *  inherited IRAs, which few households hold: no legend entry names a source the plan lacks). */
type Part = Look & { readonly id: string; readonly name: string; readonly read: (r: LedgerYearRow) => number; readonly whenDrawn?: true }

export const INCOME_PARTS: readonly Part[] = [
  { id: 'social-security', name: copy.rdSourceSocialSecurity, colorIndex: 9, pattern: 'solid', read: (r) => r.socialSecurity },
  { id: 'other', name: copy.rdSourceOther, colorIndex: 3, pattern: 'vlines', read: (r) => r.otherIncomeByPerson.reduce((s, o) => s + o.gross, 0) },
  { id: 'taxable', name: copy.rdSourceTaxable, colorIndex: 0, pattern: 'solid', read: (r) => r.draw.taxable },
  { id: 'pretax', name: copy.rdSourcePretax, colorIndex: 2, pattern: 'hatch', read: (r) => r.draw.pretax },
  { id: 'roth', name: copy.rdSourceRoth, colorIndex: 1, pattern: 'dots', read: (r) => r.draw.roth },
  { id: 'hsa', name: copy.rdSourceHsa, colorIndex: 4, pattern: 'lines', read: (r) => r.hsaSpend },
  {
    id: 'inherited',
    name: copy.rdSourceInherited,
    colorIndex: INHERITED_COLOR_INDEX,
    pattern: 'zigzag',
    read: (r) => (r.inherited ?? []).reduce((s, e) => s + e.taken - e.movedToTaxable, 0),
    whenDrawn: true,
  },
]

/** The spending parts, bottom-up: spending solid blue, income tax hatched orange, health premiums dotted green. */
export const SPENDING_PARTS: readonly Part[] = [
  { id: 'spending', name: copy.rdSpendSpending, colorIndex: 0, pattern: 'solid', read: (r) => r.spending ?? 0 },
  { id: 'tax', name: copy.rdSpendTax, colorIndex: 2, pattern: 'hatch', read: (r) => r.taxPaid },
  { id: 'premiums', name: copy.rdSpendPremiums, colorIndex: 1, pattern: 'dots', read: premiumsOf },
]

export interface MenuItem {
  readonly id: RetirementDetailsChart
  readonly label: string
}

interface Menu {
  readonly charts: readonly MenuItem[]
  readonly chart: RetirementDetailsChart
}

export interface DonutView {
  readonly side: SideId
  readonly title: string
  readonly parts: readonly DonutPart[]
  /** The share that is not a withdrawal, printed in the hole. */
  readonly centre: string
}

export type RetirementDetailsView =
  | (Menu & { readonly kind: 'words'; readonly words: string })
  | (Menu &
      ComparisonAxis & {
        readonly kind: 'years'
        readonly title: string
        readonly sources: readonly YearSource[]
        readonly ticks: readonly { readonly value: number; readonly label: string }[]
        readonly percent: boolean
        readonly ranOut?: { readonly year: number; readonly label: string }
        readonly metrics: readonly string[]
        readonly notes: readonly string[]
        readonly updating: boolean
      })
  | (Menu & {
      readonly kind: 'donuts'
      readonly title: string
      readonly donuts: readonly DonutView[]
      /** The parts in ring order, each named with every side's share. */
      readonly key: readonly { readonly id: string; readonly name: string; readonly colorIndex: number; readonly pattern: PatternKind | 'solid'; readonly shares: readonly string[] }[]
      readonly metric: string
      readonly notes: readonly string[]
      readonly updating: boolean
    })
  | (Menu & {
      readonly kind: 'grouped'
      readonly title: string
      readonly groups: readonly string[]
      readonly series: readonly GroupedBarSeries[]
      readonly lattice: DollarLattice
      readonly axisDollar: (dollars: number) => string
      readonly metric: string
      readonly notes: readonly string[]
      readonly updating: boolean
    })

const KIND_LABEL: Readonly<Record<DetailsKind, (title: string) => string>> = {
  income: slots.rdIncomeSourcesOf,
  rate: slots.rdRateOf,
  spending: slots.rdSpendingOf,
}

/** The menu over the sides shown: each side's three charts ("Income sources of your plan": the side's in-sentence name)
 *  and, with two sides, the two comparisons. */
export function detailsMenu(sides: readonly { readonly id: SideId; readonly mid: string }[]): MenuItem[] {
  const per = (kind: DetailsKind) => sides.map((s) => ({ id: `${kind}:${s.id}` as const, label: KIND_LABEL[kind](s.mid) }))
  return sides.length > 1
    ? [...per('income'), { id: 'income-comparison', label: copy.rdChartIncomeComparison }, ...per('rate'), ...per('spending'), { id: 'spending-comparison', label: copy.rdChartSpendingComparison }]
    : [...per('income'), ...per('rate'), ...per('spending')]
}

/** The chart shown: the one asked for where the menu offers it, else that kind on your plan's side, else the first. */
export function shownDetailsChart(asked: RetirementDetailsChart, menu: readonly MenuItem[]): RetirementDetailsChart {
  if (menu.some((m) => m.id === asked)) return asked
  const kind = asked.includes(':') ? asked.split(':')[0] : asked === 'spending-comparison' ? 'spending' : 'income'
  return menu.find((m) => m.id === `${kind}:compared`)?.id ?? menu[0]!.id
}

/** The spending comparison's printed figure: the mm dialect at two decimals ("$1.18mm", trailing zeros dropped: "$1.1mm"),
 *  below $1mm the dialect as it is. */
const groupedFigure = (v: number): string =>
  Math.abs(v) >= 1_000_000 ? `$${(v / 1_000_000).toFixed(2).replace(/0+$/, '').replace(/\.$/, '')}mm` : formatMmDollar(v)

const dollarTicks = (max: number) => {
  const lattice = niceLattice(Math.max(1_000, max))
  return buildYTicks(lattice, mmAxisFormatterFor(lattice.ceiling)).map((t) => ({ value: t.dollars, label: t.label }))
}

/** The share of what the rows live on that is not a withdrawal, or null with nothing to share. */
function notWithdrawalShare(rows: readonly LedgerYearRow[]): number | null {
  const kept = rows.reduce((s, r) => s + keptIncome(r), 0)
  const drawn = rows.reduce((s, r) => s + withdrawn(r), 0)
  return kept + drawn > 0 ? kept / (kept + drawn) : null
}

/** The year the money ran out, where it falls in retirement (the band goes there), and the short-years metric. */
function shortYears(side: ReadySide, steady: boolean): { readonly band?: { readonly year: number; readonly label: string }; readonly line: string } {
  const e = endOf(side)
  if (!e.ranOut || e.row === undefined) return { line: slots.rdShortNone(steady) }
  // The band (and the words saying it is drawn) only where the year falls in the retired rows a chart draws; a run whose
  // money runs out before then says so plainly.
  if (e.row.t < firstRetiredT(side.meta) || retiredPaidRows(side).length === 0) return { line: slots.analysisRanOut([{ name: side.mid, year: e.year }], steady, null) }
  return { band: { year: e.year, label: copy.rdRanOutBand }, line: slots.rdShortRanOut(e.year, agesIn(side.meta, e.row), steady) }
}

export function retirementDetailsView(input: AnalysisInput & { readonly chart: RetirementDetailsChart }): RetirementDetailsView {
  const declared = input.alternative === null ? [input.compared] : [input.alternative, input.compared]
  const charts = detailsMenu(declared)
  const chart = shownDetailsChart(input.chart, charts)
  const menu: Menu = { charts, chart }
  const gate = gateSides(input)
  if (gate.kind === 'words') return { ...menu, kind: 'words', words: gate.words }
  const sides = gate.sides
  const steady = input.future === 'steady'
  const title = charts.find((c) => c.id === chart)!.label
  const tail = futureNotes(input, sides)

  if (chart === 'income-comparison' || chart === 'spending-comparison') {
    const alt = sides[0]!
    const cmp = sides[1]!
    const window = sharedRetiredWindow(sides)
    if (window === null) {
      // Each side may have retired years, but none in common (O3): said so, with the ran-out note where one ran out.
      const out = ranOutNote(sides, steady, null)
      return { ...menu, kind: 'words', words: [slots.rdShareNoneShared(steady), ...(out !== undefined ? [out] : [])].join(' ') }
    }
    const inWindow = (s: ReadySide) => retiredPaidRows(s).filter((r) => yearOf(s.meta, r) >= window.from && yearOf(s.meta, r) <= window.through)
    const windowNote = slots.rdWindowNote(window.from, window.through)
    // A side's money runs out: said, so "spends less" never reads as a saving (A1).
    const out = ranOutNote(sides, steady, window.through)
    const outNotes = out !== undefined ? [out] : []
    if (chart === 'income-comparison') {
      // Each side's kept income split over Social Security and other income in proportion (the part past spending that
      // the tool does not keep comes off both), then each withdrawal source: the slices and the hole's share add up.
      const sums = sides.map((s) => {
        const rows = inWindow(s)
        const parts = INCOME_PARTS.map((p) => {
          if (p.id !== 'social-security' && p.id !== 'other') return rows.reduce((sum, r) => sum + Math.max(0, p.read(r)), 0)
          return rows.reduce((sum, r) => {
            const gross = r.socialSecurity + r.otherIncomeByPerson.reduce((x, o) => x + o.gross, 0)
            return gross > 0 ? sum + (Math.max(0, p.read(r)) * keptIncome(r)) / gross : sum
          }, 0)
        })
        const total = parts.reduce((a, b) => a + b, 0)
        return { s, parts, total, share: notWithdrawalShare(rows) }
      })
      const donuts: DonutView[] = sums.map(({ s, parts, total, share }) => ({
        side: s.id,
        title: s.title,
        parts: INCOME_PARTS.map((p, i) => ({
          id: p.id,
          share: total > 0 ? parts[i]! / total : 0,
          colorIndex: p.colorIndex,
          pattern: p.pattern,
          point: slots.rdSlicePoint(p.name, pctWords(total > 0 ? parts[i]! / total : 0)),
        })).filter((p) => p.share > 0),
        centre: slots.analysisPercent(pctWords(share ?? 0)),
      }))
      return {
        ...menu,
        kind: 'donuts',
        title,
        donuts,
        key: INCOME_PARTS.map((p, i) => ({
          id: p.id,
          name: p.name,
          colorIndex: p.colorIndex,
          pattern: p.pattern,
          shares: sums.map((x) => slots.analysisPercent(pctWords(x.total > 0 ? x.parts[i]! / x.total : 0))),
        })).filter((_, i) => sums.some((x) => x.parts[i]! > 0)),
        metric: slots.rdIncomeComparison(alt.mid, pctWords(sums[0]!.share ?? 0), cmp.mid, pctWords(sums[1]!.share ?? 0), window.from, window.through, steady),
        notes: [windowNote, ...outNotes, ...(sides.some((s) => inWindow(s).some((r) => r.incomeNotKept > 0)) ? [copy.rdNotKeptShares] : []), ...tail],
        updating: gate.updating,
      }
    }
    const totals = sides.map((s) => SPENDING_PARTS.map((p) => inWindow(s).reduce((sum, r) => sum + Math.max(0, p.read(r)), 0)))
    const lattice = niceLattice(Math.max(1_000, ...totals.flat()))
    const all = totals.map((t) => t.reduce((a, b) => a + b, 0))
    const d = direction(all[0]!, all[1]!, formatDeltaDollar)
    // Either side paid in a year before the window (working years, or retired years the other side doesn't share): ONE
    // line says both sides' earlier years are left out, conversions included, so "spends less in all" never reads as a
    // saving those years paid for (round 2, R2F2). It points at Cash Flows only where its paired form shows these two.
    const earlier = sides.some((s) => paidRows(s).some((r) => yearOf(s.meta, r) < window.from))
    const paired = cmp.plan === true && alt.plan !== true
    const beforeNotes = earlier ? [slots.rdBeforeWindow(window.from, paired)] : []
    return {
      ...menu,
      kind: 'grouped',
      title,
      groups: SPENDING_PARTS.map((p) => p.name),
      series: sides.map((s, i) => ({
        id: `rd-${s.id}`,
        name: s.title,
        role: s.id,
        values: totals[i]!,
        // The mm dialect at two decimals ("~$1.18mm"): six full figures over three groups ran into each other at his window
        // (RC17's look), and the axis formatter's three ("~$1.184mm") still met their neighbour ("~$1.1mm") once the notes
        // column widened beside this chart (milestone 4's review, round 2). Never pre-rounded below $1mm: a part under
        // $5,000 printed "~$0" over a bar with height.
        figures: totals[i]!.map((v) => slots.probabilityBarFigure(groupedFigure(v))),
        points: totals[i]!.map((v, g) => slots.taxStratBarPoint(`${s.title}, ${SPENDING_PARTS[g]!.name}`, formatDeltaDollar(v))),
      })),
      lattice,
      axisDollar: mmAxisFormatterFor(lattice.ceiling),
      metric: slots.rdSpendingComparison(alt.mid, d.fig, d.dir, cmp.mid, window.from, window.through, steady),
      notes: [windowNote, ...outNotes, copy.rdSpendNote, ...beforeNotes, ...tail],
      updating: gate.updating,
    }
  }

  const [kind, sideId] = chart.split(':') as [DetailsKind, SideId]
  const side = sides.find((s) => s.id === sideId) ?? sides.at(-1)!
  const rows = retiredPaidRows(side)
  const short = shortYears(side, steady)
  const axis = comparisonAxis(side.meta, input.timeAxis)
  const first = rows[0]
  const last = rows.at(-1)
  // No retired year to draw: where the money ran out first, its note alone says why; else the plain words.
  if (first === undefined || last === undefined) return { ...menu, kind: 'words', words: endOf(side).ranOut ? short.line : slots.rdShareNone(steady) }
  const from = yearOf(side.meta, first)
  const through = yearOf(side.meta, last)
  const base = { ...menu, ...axis, kind: 'years' as const, title, ...(short.band !== undefined ? { ranOut: short.band } : {}), updating: gate.updating }

  if (kind === 'rate') {
    const pts = rows.flatMap((r) => {
      const open = startTotal(r)
      return open > 0 ? [{ year: yearOf(side.meta, r), value: (withdrawn(r) / open) * 100 }] : []
    })
    const max = Math.max(0, ...pts.map((p) => p.value))
    // From 1.5: a 0.5 step, whose one-decimal labels print exactly (a 0.25 step printed 0.25 as "0.3%").
    const lattice = niceLattice(Math.max(1.5, max))
    const ticks = buildYTicks(lattice, (n) => slots.analysisPercent(String(Math.round(n * 10) / 10))).map((t) => ({ value: t.dollars, label: t.label }))
    const high = pts.reduce((h, p) => (p.value > h.value ? p : h), pts[0] ?? { year: from, value: 0 })
    return {
      ...base,
      sources: [{ id: 'rate', name: copy.rdRateName, colorIndex: 2, pattern: 'solid', points: pts }],
      ticks,
      percent: true,
      metrics: [slots.rdRate(pctWords((pts[0]?.value ?? 0) / 100), pts[0]?.year ?? from, pctWords(high.value / 100), high.year, steady), short.line],
      notes: [copy.rdRateNote, ...tail],
    }
  }

  const parts = kind === 'income' ? INCOME_PARTS : SPENDING_PARTS
  const sources: YearSource[] = parts
    .map((p) => ({
      id: p.id,
      name: p.name,
      colorIndex: p.colorIndex,
      pattern: p.pattern,
      points: rows.map((r) => ({ year: yearOf(side.meta, r), value: Math.max(0, p.read(r)) })),
      whenDrawn: p.whenDrawn === true,
    }))
    .filter((src) => !src.whenDrawn || src.points.some((pt) => pt.value > 0))
    .map(({ whenDrawn: _w, ...src }) => src)
  const tops = rows.map((_, i) => sources.reduce((s, src) => s + src.points[i]!.value, 0))
  if (kind === 'income') {
    const share = notWithdrawalShare(rows)
    return {
      ...base,
      sources,
      ticks: dollarTicks(Math.max(0, ...tops)),
      percent: false,
      metrics: [share === null ? slots.rdShareNone(steady) : slots.rdShare(pctWords(share), from, through, steady), short.line],
      // The columns draw every dollar paid; the share leaves out income past spending, said only where a year has some.
      notes: [...(rows.some((r) => r.incomeNotKept > 0) ? [copy.rdNotKeptNote] : []), ...tail],
    }
  }
  const total = tops.reduce((a, b) => a + b, 0)
  return {
    ...base,
    sources,
    ticks: dollarTicks(Math.max(0, ...tops)),
    percent: false,
    metrics: [slots.rdSpending(formatDeltaDollar(total), from, through, steady), short.line],
    notes: [copy.rdSpendNote, ...(rows.some((r) => r.spending === undefined) ? [copy.workbenchNoSpendingNote] : []), ...tail],
  }
}
