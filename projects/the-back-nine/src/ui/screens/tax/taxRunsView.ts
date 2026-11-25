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
 */
import type { SolveRecommendation } from '@engine/solver/solve'
import { niceLattice, type DollarLattice } from '@viz/bandData'
import type { PairSeries, StackSource, YearPoint } from '@viz/charts/stackedAreasOptions'
import type { LedgerYearRow, RothConversionPlan, WhatIfLeverV6 } from '@shared/model'
import type { ScenarioDraft } from '@store/memoryModel'
import type { TableMeta } from '../../workbench/tableRun'
import { copy, slots } from '../../copy'
import { formatDeltaDollar, mmAxisFormatterFor } from '../../money'
import type { RunRows } from '../retirement/cashFlowsView'

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
}

export interface StackPicture {
  readonly title: string
  readonly sources: Readonly<Record<StackSource, { readonly name: string; readonly points: readonly YearPoint[] }>>
}

export type ComparisonView =
  | { readonly kind: 'waiting'; readonly words: string }
  | { readonly kind: 'withheld'; readonly words: string }
  | {
      readonly kind: 'pair'
      readonly title: string
      readonly series: readonly [PairSeries, PairSeries]
      readonly lattice: DollarLattice
      readonly axisDollar: (dollars: number) => string
      readonly metric: string
      readonly notes: readonly string[]
      readonly updating: boolean
    }
  | {
      readonly kind: 'stacks'
      readonly title: string
      readonly stacks: readonly [StackPicture, StackPicture]
      readonly lattice: DollarLattice
      readonly axisDollar: (dollars: number) => string
      readonly notes: readonly string[]
      readonly updating: boolean
    }

const endTotal = (r: LedgerYearRow): number => r.end.taxable + r.end.pretax + r.end.roth + r.end.hsa

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

  if (chart === 'withdrawals') {
    const stack = (name: string, run: typeof winner): StackPicture => ({
      title: name,
      sources: {
        taxable: { name: copy.taxStratSourceTaxable, points: yearPoints(run.meta, run.rows, (r) => r.draw.taxable) },
        pretax: { name: copy.taxStratSourcePretax, points: yearPoints(run.meta, run.rows, (r) => r.draw.pretax) },
        roth: { name: copy.taxStratSourceRoth, points: yearPoints(run.meta, run.rows, (r) => r.draw.roth) },
        hsa: { name: copy.taxStratSourceHsa, points: yearPoints(run.meta, run.rows, (r) => r.hsaSpend) },
      },
    })
    const tops = [winner, baseline].flatMap((run) => run.rows.map((r) => r.draw.taxable + r.draw.pretax + r.draw.roth + r.hsaSpend))
    const lattice = niceLattice(Math.max(1, ...tops))
    return {
      kind: 'stacks',
      title,
      stacks: [stack(copy.recVizWithLabel, winner), stack(copy.recVizWithoutLabel, baseline)],
      lattice,
      axisDollar: mmAxisFormatterFor(lattice.ceiling),
      notes: [copy.taxStratStackOrder],
      updating,
    }
  }

  const read = MEASURE[chart]
  const ours = yearPoints(winner.meta, winner.rows, read)
  const theirs = yearPoints(baseline.meta, baseline.rows, read)
  const lattice = niceLattice(Math.max(1, ...ours.map((p) => p.value), ...theirs.map((p) => p.value)))
  let metric: string
  if (chart === 'assets') {
    // The last year both runs reach (a run that ran out ends early, its closing balance 0).
    const year = Math.min(ours.at(-1)?.year ?? 0, theirs.at(-1)?.year ?? 0)
    const at = (pts: readonly YearPoint[]) => pts.find((p) => p.year === year)?.value ?? 0
    const d = direction(at(ours), at(theirs))
    metric = slots.taxStratCompareAssets(d.fig, d.dir, year, steady)
  } else if (chart === 'conversions') {
    metric = slots.taxStratCompareConversions(formatDeltaDollar(sum(ours.map((p) => p.value))), formatDeltaDollar(sum(theirs.map((p) => p.value))), steady)
  } else {
    const d = direction(sum(ours.map((p) => p.value)), sum(theirs.map((p) => p.value)))
    metric = chart === 'tax' ? slots.taxStratCompareTax(d.fig, d.dir, steady) : slots.taxStratCompareRmd(d.fig, d.dir, steady)
  }
  return {
    kind: 'pair',
    title,
    series: [
      { id: 'pair-recommended', name: copy.recVizWithLabel, role: 'alternative', points: ours },
      { id: 'pair-plan', name: copy.recVizWithoutLabel, role: 'compared', points: theirs },
    ],
    lattice,
    axisDollar: mmAxisFormatterFor(lattice.ceiling),
    metric,
    notes: chart === 'tax' && input.stateClause !== null ? [input.stateClause] : chart === 'assets' ? [copy.taxStratAssetsNote] : [],
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
  if (table === 'withdrawals') {
    return {
      kind: 'table',
      heading,
      columns: [
        ...LEAD,
        { id: 'conversion', header: copy.taxStratColConversion, numeric: true },
        { id: 'from-taxable', header: copy.taxStratColFromTaxable, numeric: true },
        { id: 'from-pretax', header: copy.taxStratColFromPretax, numeric: true },
        { id: 'from-roth', header: copy.taxStratColFromRoth, numeric: true },
        { id: 'taxable-end', header: copy.taxStratColTaxableEnd, numeric: true },
        { id: 'pretax-end', header: copy.taxStratColPretaxEnd, numeric: true },
        { id: 'roth-end', header: copy.taxStratColRothEnd, numeric: true },
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
        },
      })),
      notes: [],
      updating: run.updating,
    }
  }
  // Medicare: the years the run priced a Medicare bill. The bill includes the income surcharge (`premiums.medicare`,
  // the ledger's own note), so the base is the bill less the surcharge and the three columns add up.
  const medicareRows = run.rows.filter((r) => r.premiums.medicare > 0)
  return {
    kind: 'table',
    heading,
    columns: [
      ...LEAD,
      { id: 'irmaa-income', header: copy.taxStratColIrmaaIncome, numeric: true },
      { id: 'base', header: copy.taxStratColMedicareBase, numeric: true },
      { id: 'surcharge', header: copy.taxStratColSurcharge, numeric: true },
      { id: 'total', header: copy.taxStratColMedicareTotal, numeric: true },
    ],
    rows: medicareRows.map((r) => ({
      key: String(r.t),
      cells: {
        ...lead(r),
        'irmaa-income': r.irmaaIncome ?? 0,
        base: r.premiums.medicare - r.premiums.irmaaSurcharge,
        surcharge: r.premiums.irmaaSurcharge,
        total: r.premiums.medicare,
      },
    })),
    ...(medicareRows.length === 0 ? { empty: copy.taxStratMedicareNone } : {}),
    notes: [],
    updating: run.updating,
  }
}
