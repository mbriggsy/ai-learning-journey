/**
 * src/ui/screens/tax/taxRunsView.ts: Tax → Tax Strategies → Comparison and Details, the pure composers (plan
 * docs/plans/6-rightcapital-ui-plan.md, RC8; `rc-cashflow-tax/help-tax-tax-strategies-comparison-tab-03.png`, `-05.png`,
 * `help-tax-tax-strategies-details-tab-02.png` to `-04.png`).
 *
 * THE TWO RUNS. The recommendation's levers (a `withdrawal-order` and a `roth` lever built from
 * `SolveRecommendation.winner`) and the no-change baseline's run through a what-if slot each, so both are worked out on
 * the plan's own one-future paths (`whatIfRunFor` refuses a bundle whose futures differ from the plan's: U14's check).
 * The baseline needs no slot when it IS the plan as it stands (the same withdrawal order, custom order and Roth plan
 * the committed answer's draft carries; the builder compares field by field): then it is the plan's own rows.
 *
 * ONE FUTURE, NAMED. Every chart title and the table's heading names its market ("in the steady market"), so a single
 * path is never read as the odds (plan 4.0). Income tax is `taxPaid`, headed "Income tax", the page's one state clause
 * beneath it (plan 4.0's "tax figures say only what they hold").
 *
 * THE TIME AXIS (the Display drawer, `src/ui/displaySettings.ts`). Comparison's charts keep each point on its calendar
 * year; the axis reads the first person's age (the default, as every other chart over the plan's years) or the year
 * (`axisOffset`, added once in `stackedAreasOptions.ts`), titled with whose age it is or "Year", and each point's spoken
 * sentence names the axis's number with that title.
 */
import type { SolveRecommendation } from '@engine/solver/solve'
import { ledgerRowEndTotal, ledgerRowInheritedSpent } from '@engine/sequencing'
import { irmaa } from '@engine/constants/health'
import { irmaaScheduleAsCompared } from '@engine/healthOverlay'
import { niceLattice, type DollarLattice } from '@viz/bandData'
import type { PairSeries, StackSource, YearPoint } from '@viz/charts/stackedAreasOptions'
import type { LedgerYearRow, RothConversionPlan, WhatIfLeverV6 } from '@shared/model'
import type { ScenarioDraft } from '@store/memoryModel'
import type { TableMeta } from '../../workbench/tableRun'
import { copy, slots } from '../../copy'
import { offsetFromYear, type TimeAxis } from '../../displaySettings'
import { formatDeltaDollar, formatEnteredDollar, mmAxisFormatterFor } from '../../money'
import type { RunRows } from '../retirement/cashFlowsView'
import type { StrategiesView } from './strategiesView'

// ── The bundles ─────────────────────────────────────────────────────────────────────────────────────────────────

const sameConversion = (a: RothConversionPlan | null | undefined, b: RothConversionPlan | null | undefined): boolean => {
  const x = a ?? null
  const y = b ?? null
  if (x === null || y === null) return x === y
  return x.annualAmountReal === y.annualAmountReal && x.startYearOffset === y.startYearOffset && x.years === y.years
}

const sameOrder = (a: readonly string[] | undefined, b: readonly string[] | undefined): boolean =>
  (a ?? []).length === (b ?? []).length && (a ?? []).every((k, i) => k === (b ?? [])[i])

/** An arm's levers as a what-if bundle: its withdrawal order (a custom order carried with it) and its Roth plan (or
 *  none, which strips any the plan holds). */
export function armBundle(arm: SolveRecommendation['winner']): readonly WhatIfLeverV6[] {
  const order: WhatIfLeverV6 =
    arm.policy === 'custom'
      ? { kind: 'withdrawal-order', policy: 'custom', drawdownOrder: arm.drawdownOrder ?? [] }
      : { kind: 'withdrawal-order', policy: arm.policy }
  return [order, { kind: 'roth', conversion: arm.conversion === null ? { kind: 'none' } : { kind: 'plan', plan: arm.conversion } }]
}

export interface TaxBundles {
  readonly winner: readonly WhatIfLeverV6[]
  /** `plan`: the baseline is the plan as it stands, read from the plan's own rows. */
  readonly baseline: readonly WhatIfLeverV6[] | 'plan'
}

/** The two runs' bundles for a committed recommendation over the committed answer's draft. */
export function taxBundles(payload: SolveRecommendation, draft: ScenarioDraft): TaxBundles {
  const b = payload.noActionBaseline
  const isPlan =
    b.policy === draft.drawdownPolicy &&
    (b.policy !== 'custom' || sameOrder(b.drawdownOrder, draft.drawdownOrder)) &&
    sameConversion(b.conversion, draft.rothConversion)
  return { winner: armBundle(payload.winner), baseline: isPlan ? 'plan' : armBundle(b) }
}

// ── The gate ────────────────────────────────────────────────────────────────────────────────────────────────────

export type TaxRunsGate = { readonly kind: 'run' } | { readonly kind: 'words'; readonly words: string; readonly toStrategies: boolean }

/** Whether Comparison and Details run the two strategies year by year: only beside an ACTIVE Winner card. Anywhere
 *  else they say the Strategies tab's own words for that state, never a chart of "the recommended strategy" the
 *  Strategies tab does not stand behind: before a solve, the waiting words; the no-dollar register, the same-as-plan
 *  words where the winner IS the plan (`noChange`) and the card's own hero line where it is not (a seed-B inversion,
 *  a delta that rounds to $0: the crowned plan differs, so "your plan as it stands" would be false); a payload the
 *  render guard refused (Q6), the Strategies tab's unavailable words. */
export function taxRunsGate(strat: StrategiesView, payload: SolveRecommendation | null): TaxRunsGate {
  if (payload === null || strat.kind !== 'solve') return { kind: 'words', words: copy.taxStratWaiting, toStrategies: true }
  const w = strat.winner
  if (w?.mode === 'active') return { kind: 'run' }
  if (w !== undefined) return { kind: 'words', words: payload.noChange ? copy.taxStratSameAsPlan : w.hero, toStrategies: false }
  return { kind: 'words', words: strat.notice?.lines.join(' ') ?? copy.recommendUnavailable, toStrategies: true }
}

// ── Comparison ──────────────────────────────────────────────────────────────────────────────────────────────────

export type ComparisonChart = 'assets' | 'tax' | 'rmd' | 'withdrawals' | 'conversions'

export const COMPARISON_CHARTS: readonly { readonly id: ComparisonChart; readonly label: string }[] = [
  { id: 'assets', label: copy.taxStratChartAssets },
  { id: 'tax', label: copy.taxStratChartTax },
  { id: 'rmd', label: copy.taxStratChartRmd },
  { id: 'withdrawals', label: copy.taxStratChartWithdrawals },
  { id: 'conversions', label: copy.taxStratChartConversions },
]

export type TaxFuture = 'steady' | 'rough'

export interface ComparisonInput {
  readonly chart: ComparisonChart
  readonly future: TaxFuture
  readonly winner: RunRows
  readonly baseline: RunRows
  /** The page's one state clause (`composeVerdictStateNote`), under the income tax chart. */
  readonly stateClause: string | null
  /** The Display drawer's time axis (`displaySettings.ts`): the charts' x axis on the first person's age or the year. */
  readonly timeAxis: TimeAxis
}

/** The charts' x axis, as both kinds of chart read it. */
export interface ComparisonAxis {
  /** "Alex’s age", or "Year" on the years axis. */
  readonly axisTitle: string
  /** What to add to a point's calendar year to put it on the axis (`offsetFromYear`: 0 on the years axis). */
  readonly axisOffset: number
  /** A point's spoken sentence from the axis's number: the title and the number, the series' name, its figure. */
  readonly pointWords: (axisNumber: number, name: string, dollars: number) => string
}

export interface StackPicture {
  readonly title: string
  readonly sources: Readonly<Record<StackSource, { readonly name: string; readonly points: readonly YearPoint[] }>>
}

export type ComparisonView =
  | { readonly kind: 'waiting'; readonly words: string }
  | { readonly kind: 'withheld'; readonly words: string }
  | (ComparisonAxis & {
      readonly kind: 'pair'
      readonly title: string
      readonly series: readonly [PairSeries, PairSeries]
      readonly lattice: DollarLattice
      readonly axisDollar: (dollars: number) => string
      readonly metric: string
      readonly notes: readonly string[]
      readonly updating: boolean
    })
  | (ComparisonAxis & {
      readonly kind: 'stacks'
      readonly title: string
      readonly stacks: readonly [StackPicture, StackPicture]
      readonly lattice: DollarLattice
      readonly axisDollar: (dollars: number) => string
      readonly notes: readonly string[]
      readonly updating: boolean
    })

/** A row's year-end invested total: the engine's own (`ledgerRowEndTotal`, the four buckets plus each inherited IRA,
 *  the Act 5 plan's KTD22), never a sum of the four buckets alone. */
const endTotal = (r: LedgerYearRow): number => ledgerRowEndTotal(r)

const MEASURE: Readonly<Record<Exclude<ComparisonChart, 'withdrawals'>, (r: LedgerYearRow) => number>> = {
  assets: endTotal,
  tax: (r) => r.taxPaid,
  rmd: (r) => r.rmd,
  conversions: (r) => r.conversion,
}

const yearPoints = (meta: TableMeta, rows: readonly LedgerYearRow[], read: (r: LedgerYearRow) => number): YearPoint[] =>
  rows.map((r) => ({ year: meta.startCalendarYear + r.t, value: Math.max(0, read(r)) }))

/** A difference in words: the figure in the delta dialect, its direction, or "the same" where it prints as $0. */
function direction(ours: number, theirs: number): { readonly fig: string; readonly dir: 'more' | 'less' | 'same' } {
  const fig = formatDeltaDollar(ours - theirs)
  if (fig === '0') return { fig, dir: 'same' }
  return { fig, dir: ours > theirs ? 'more' : 'less' }
}

const sum = (xs: readonly number[]): number => xs.reduce((a, b) => a + b, 0)

/** A run's last calendar year, and whether its money ran out there (its rows stop at the ran-out year, `ranOut`). */
const endOf = (run: { readonly meta: TableMeta; readonly rows: readonly LedgerYearRow[] }): { readonly year: number; readonly ranOut: boolean } => {
  const last = run.rows.at(-1)
  return { year: run.meta.startCalendarYear + (last?.t ?? 0), ranOut: last?.ranOut === true }
}

/** When either run ran out early: the last year both reach (every total stops there) and the note naming every run that
 *  ran out, each with its own year (a later run-out is never left unsaid). `counted` (a chart whose figure is cut at
 *  `through`) adds the clause saying so; the withdrawal stacks count nothing and leave it off. */
function ranOutWindow(
  winner: { readonly meta: TableMeta; readonly rows: readonly LedgerYearRow[] },
  baseline: { readonly meta: TableMeta; readonly rows: readonly LedgerYearRow[] },
  steady: boolean,
): { readonly through: number; readonly note: (counted: boolean) => string } | undefined {
  const w = endOf(winner)
  const b = endOf(baseline)
  if (!w.ranOut && !b.ranOut) return undefined
  const through = Math.min(w.year, b.year)
  return { through, note: (counted) => slots.taxStratRanOut(w.ranOut ? w.year : null, b.ranOut ? b.year : null, steady, counted) }
}

/** The charts' axis for a run's meta: the first person's age (titled whose) or the calendar year (titled "Year"). The
 *  years axis speaks each point as the bare year, as before the Display drawer; the ages axis names whose age. */
export function comparisonAxis(meta: TableMeta, timeAxis: TimeAxis): ComparisonAxis {
  const first = meta.people[0]!
  const axisOffset = offsetFromYear(timeAxis, { startYear: meta.startCalendarYear, startAge: first.currentAge })
  if (timeAxis === 'years') {
    return { axisTitle: copy.chartAxisYear, axisOffset, pointWords: (year, name, dollars) => slots.taxStratChartPoint(year, name, formatDeltaDollar(dollars)) }
  }
  const axisTitle = slots.claimsAgeAxis(capitalize(first.possessive))
  return { axisTitle, axisOffset, pointWords: (age, name, dollars) => slots.claimsYearPoint(axisTitle, age, name, formatDeltaDollar(dollars)) }
}

const capitalize = (s: string): string => (s === '' ? s : s[0]!.toUpperCase() + s.slice(1))

/** A value as the charts print it. */
export const chartFigure = (dollars: number): string => slots.taxStratValue(formatDeltaDollar(dollars))

export function comparisonView(input: ComparisonInput): ComparisonView {
  const { chart, future, winner, baseline } = input
  const steady = future === 'steady'
  for (const r of [winner, baseline]) if (r.kind === 'withheld') return { kind: 'withheld', words: r.words }
  if (winner.kind === 'error' || baseline.kind === 'error') return { kind: 'withheld', words: copy.taxStratRunsError }
  if (winner.kind !== 'ready' || baseline.kind !== 'ready') return { kind: 'waiting', words: copy.taxStratRunsWaiting }
  const updating = winner.updating || baseline.updating
  const title = slots.taxStratInMarket(COMPARISON_CHARTS.find((c) => c.id === chart)!.label, steady)
  const axis = comparisonAxis(baseline.meta, input.timeAxis)

  const out = ranOutWindow(winner, baseline, steady)
  const inheritedPaid = ledgerRowInheritedSpent

  if (chart === 'withdrawals') {
    const stack = (name: string, run: typeof winner): StackPicture => ({
      title: name,
      sources: {
        taxable: { name: copy.taxStratSourceTaxable, points: yearPoints(run.meta, run.rows, (r) => r.draw.taxable) },
        pretax: { name: copy.taxStratSourcePretax, points: yearPoints(run.meta, run.rows, (r) => r.draw.pretax) },
        roth: { name: copy.taxStratSourceRoth, points: yearPoints(run.meta, run.rows, (r) => r.draw.roth) },
        hsa: { name: copy.taxStratSourceHsa, points: yearPoints(run.meta, run.rows, (r) => r.hsaSpend) },
        // The inherited IRAs' part (U13): what they paid toward the year, each one's withdrawal less the part moved to
        // taxable, as pre-tax's draw leaves out a required withdrawal moved to taxable (`analysisRuns.withdrawn`).
        inherited: { name: copy.taxStratSourceInherited, points: yearPoints(run.meta, run.rows, inheritedPaid) },
      },
    })
    const tops = [winner, baseline].flatMap((run) => run.rows.map((r) => r.draw.taxable + r.draw.pretax + r.draw.roth + r.hsaSpend + inheritedPaid(r)))
    const inheritedDrawn = [winner, baseline].some((run) => run.rows.some((r) => inheritedPaid(r) > 0))
    const lattice = niceLattice(Math.max(1, ...tops))
    return {
      kind: 'stacks',
      ...axis,
      title,
      stacks: [stack(copy.recVizWithLabel, winner), stack(copy.recVizWithoutLabel, baseline)],
      lattice,
      axisDollar: mmAxisFormatterFor(lattice.ceiling),
      notes: [inheritedDrawn ? copy.taxStratStackOrderInherited : copy.taxStratStackOrder, ...(out !== undefined ? [out.note(false)] : [])],
      updating,
    }
  }

  const read = MEASURE[chart]
  const ours = yearPoints(winner.meta, winner.rows, read)
  const theirs = yearPoints(baseline.meta, baseline.rows, read)
  const lattice = niceLattice(Math.max(1, ...ours.map((p) => p.value), ...theirs.map((p) => p.value)))
  // A run that ran out early has fewer years, so a total over each run's own rows could differ by the years alone:
  // every total counts only the years both runs reach (`out.through`), and the note says which ran out and when.
  const total = (pts: readonly YearPoint[]): number => sum(pts.filter((p) => out === undefined || p.year <= out.through).map((p) => p.value))
  let metric: string
  if (chart === 'assets') {
    // The last year both runs reach (a run that ran out ends early, its closing balance 0): the same window.
    const year = Math.min(ours.at(-1)?.year ?? 0, theirs.at(-1)?.year ?? 0)
    const at = (pts: readonly YearPoint[]) => pts.find((p) => p.year === year)?.value ?? 0
    const d = direction(at(ours), at(theirs))
    metric = slots.taxStratCompareAssets(d.fig, d.dir, year, steady)
  } else if (chart === 'conversions') {
    metric = slots.taxStratCompareConversions(formatDeltaDollar(total(ours)), formatDeltaDollar(total(theirs)), steady, out?.through)
  } else {
    const d = direction(total(ours), total(theirs))
    metric = chart === 'tax' ? slots.taxStratCompareTax(d.fig, d.dir, steady, out?.through) : slots.taxStratCompareRmd(d.fig, d.dir, steady, out?.through)
  }
  const heldInherited = [winner, baseline].some((run) => run.rows.some((r) => (r.inherited?.length ?? 0) > 0))
  const chartNotes =
    chart === 'tax' && input.stateClause !== null
      ? [input.stateClause]
      : chart === 'assets'
        ? [copy.taxStratAssetsNote]
        : chart === 'rmd' && heldInherited
          ? [copy.taxStratRmdInheritedNote]
          : []
  return {
    kind: 'pair',
    ...axis,
    title,
    series: [
      { id: 'pair-recommended', name: copy.recVizWithLabel, role: 'alternative', points: ours },
      { id: 'pair-plan', name: copy.recVizWithoutLabel, role: 'compared', points: theirs },
    ],
    lattice,
    axisDollar: mmAxisFormatterFor(lattice.ceiling),
    metric,
    notes: [...(out !== undefined ? [out.note(true)] : []), ...chartNotes],
    updating,
  }
}

// ── Details ─────────────────────────────────────────────────────────────────────────────────────────────────────

export type DetailsTable = 'withdrawals' | 'medicare'
export type DetailsPick = 'recommended' | 'plan'

export const DETAILS_TABLES: readonly { readonly value: DetailsTable; readonly label: string }[] = [
  { value: 'withdrawals', label: copy.taxStratTableWithdrawals },
  { value: 'medicare', label: copy.taxStratTableMedicare },
]

export const DETAILS_PICKS: readonly { readonly value: DetailsPick; readonly label: string }[] = [
  { value: 'recommended', label: copy.recVizWithLabel },
  { value: 'plan', label: copy.recVizWithoutLabel },
]

export interface DetailsColumn {
  readonly id: string
  readonly header: string
  readonly numeric: boolean
  readonly lead?: boolean
}

export interface DetailsRow {
  readonly key: string
  readonly cells: Readonly<Record<string, number | string>>
}

export type DetailsView =
  | { readonly kind: 'waiting'; readonly words: string }
  | { readonly kind: 'withheld'; readonly words: string }
  | {
      readonly kind: 'table'
      readonly heading: string
      readonly columns: readonly DetailsColumn[]
      readonly rows: readonly DetailsRow[]
      /** Said in place of the rows when the run holds none for this table (no Medicare years). */
      readonly empty?: string
      readonly notes: readonly string[]
      readonly updating: boolean
    }

const GONE = '–'

const ageText = (meta: TableMeta, r: LedgerYearRow): string => meta.people.map((p, i) => (r.alive[i] === true ? String(p.currentAge + r.t) : GONE)).join('/')

const LEAD: readonly DetailsColumn[] = [
  { id: 'year', header: copy.taxStratColYear, numeric: false, lead: true },
  { id: 'age', header: copy.taxStratColAge, numeric: false, lead: true },
]

export interface DetailsInput {
  readonly table: DetailsTable
  readonly pick: DetailsPick
  readonly future: TaxFuture
  readonly rows: RunRows
}

export function detailsView(input: DetailsInput): DetailsView {
  const { table, pick, future, rows: run } = input
  if (run.kind === 'withheld') return { kind: 'withheld', words: run.words }
  if (run.kind === 'error') return { kind: 'withheld', words: copy.taxStratRunsError }
  if (run.kind !== 'ready') return { kind: 'waiting', words: copy.taxStratRunsWaiting }
  const who = pick === 'recommended' ? copy.recVizWithLabel : copy.recVizWithoutLabel
  const heading = slots.taxStratDetailsOf(who, future === 'steady')
  const lead = (r: LedgerYearRow) => ({ year: String(run.meta.startCalendarYear + r.t), age: ageText(run.meta, r) })
  const end = endOf(run)
  const ranOut = end.ranOut ? [slots.taxStratDetailsRanOut(end.year, future === 'steady')] : []
  if (table === 'withdrawals') {
    // An inherited IRA's withdrawals and balance (gap 3's review), only where the run holds one, so a household without
    // one keeps its table.
    const inherited = run.rows.some((r) => (r.inherited?.length ?? 0) > 0)
    return {
      kind: 'table',
      heading,
      columns: [
        ...LEAD,
        { id: 'conversion', header: copy.taxStratColConversion, numeric: true },
        { id: 'from-taxable', header: copy.taxStratColFromTaxable, numeric: true },
        { id: 'from-pretax', header: copy.taxStratColFromPretax, numeric: true },
        { id: 'from-roth', header: copy.taxStratColFromRoth, numeric: true },
        ...(inherited ? [{ id: 'from-inherited', header: copy.taxStratColFromInherited, numeric: true }] : []),
        { id: 'taxable-end', header: copy.taxStratColTaxableEnd, numeric: true },
        { id: 'pretax-end', header: copy.taxStratColPretaxEnd, numeric: true },
        { id: 'roth-end', header: copy.taxStratColRothEnd, numeric: true },
        ...(inherited ? [{ id: 'inherited-end', header: copy.taxStratColInheritedEnd, numeric: true }] : []),
      ],
      rows: run.rows.map((r) => ({
        key: String(r.t),
        cells: {
          ...lead(r),
          conversion: r.conversion,
          'from-taxable': r.draw.taxable,
          'from-pretax': r.draw.pretax,
          'from-roth': r.draw.roth,
          'taxable-end': r.end.taxable,
          'pretax-end': r.end.pretax,
          'roth-end': r.end.roth,
          ...(inherited ? { 'from-inherited': ledgerRowInheritedSpent(r), 'inherited-end': (r.inherited ?? []).reduce((t, e) => t + e.end, 0) } : {}),
        },
      })),
      notes: inherited ? [...ranOut, copy.taxStratDetailsInheritedNote] : ranOut,
      updating: run.updating,
    }
  }
  // Medicare: the years the run priced a Medicare bill. The bill includes the income surcharge (`premiums.medicare`,
  // the ledger's own note), so the base is the bill less the surcharge and the three columns add up.
  const medicareRows = run.rows.filter((r) => r.premiums.medicare > 0)
  // Beside each year's income, the line it is weighed against: the first surcharge line of the bill two years on, in
  // that income year's real dollars, at the year's own filing — the engine's own read (`medicareChargeForYear` bills
  // year t + 2 on year t's income against `irmaaScheduleAsCompared(…, year t)` at `resolveYear(t).filing`, which is the
  // row's `filing`). It rises with prices, so it sits above the pinned year's figure the note names.
  const pinned = irmaa.value
  const firstLine = (calendarYear: number, filing: LedgerYearRow['filing']): number => {
    const tier = irmaaScheduleAsCompared(pinned, calendarYear).tiers[0]!
    return filing === 'mfj' ? tier.mfjMagiThreshold : tier.singleMagiThreshold
  }
  return {
    kind: 'table',
    heading,
    columns: [
      ...LEAD,
      { id: 'irmaa-income', header: copy.taxStratColIrmaaIncome, numeric: true },
      { id: 'irmaa-line', header: copy.taxStratColIrmaaLine, numeric: true },
      { id: 'base', header: copy.taxStratColMedicareBase, numeric: true },
      { id: 'surcharge', header: copy.taxStratColSurcharge, numeric: true },
      { id: 'total', header: copy.taxStratColMedicareTotal, numeric: true },
    ],
    rows: medicareRows.map((r) => ({
      key: String(r.t),
      cells: {
        ...lead(r),
        'irmaa-income': r.irmaaIncome ?? 0,
        'irmaa-line': firstLine(run.meta.startCalendarYear + r.t, r.filing),
        base: r.premiums.medicare - r.premiums.irmaaSurcharge,
        surcharge: r.premiums.irmaaSurcharge,
        total: r.premiums.medicare,
      },
    })),
    ...(medicareRows.length === 0 ? { empty: copy.taxStratMedicareNone } : {}),
    notes: [
      ...ranOut,
      ...(medicareRows.length === 0
        ? []
        : [
            slots.taxStratIrmaaLineNote(
              pinned.billYear,
              formatEnteredDollar(pinned.tiers[0]!.mfjMagiThreshold),
              formatEnteredDollar(pinned.tiers[0]!.singleMagiThreshold),
            ),
          ]),
    ],
    updating: run.updating,
  }
}
