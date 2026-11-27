/*
 * src/ui/screens/retirement/mapsView.ts: Retirement → Cash Flows → Maps, composed (plan docs/plans/6-rightcapital-ui-plan.md,
 * RC20; ref 2.16; `rc-cashflow-tax/help-retirement-cash-flows-maps-cash-flows-51.png`, `-52.png`, `-53-later.png`). PURE:
 * one run's ledger rows, the chosen year and the page's choices in; the year scrubber, the map (a Sankey's nodes and
 * links, and the Breakdown's tiles: the same figures) and the map's own sentences out. Every word comes from `copy.ts`.
 * `Maps.tsx` draws what this returns.
 *
 * ONE SOURCE OF TRUTH. Every leaf is ONE field of the year's row, printed through the Summary's own figure rule
 * (`tableFigure`, the same grain, the same "~", year 0's entered pay, other income and spending exact), under the same id
 * as the Summary's column (or drill column) that prints it, so a year's map and its table row can never disagree
 * (`mapsView.test.ts` pins every leaf against `cashFlowsView`'s cell). A group and a total are sums of the printed
 * leaves beside them, and the gap the difference between the two printed sides, so a reader can add them up.
 *
 * THE BALANCE, as the engine's own cash assembly gives it (`simulate.ts`'s `yearCash` and `ledgerYearRow`,
 * `taxOverlay.ts`'s gross-up):
 *   pay + other income + Social Security + what is taken out of taxable, pre-tax and Roth + the HSA's spend on care
 *     = spending + the health premiums (Marketplace net, Medicare with its surcharge inside, Medicare extras)
 *       + income tax + (a working year) the pay check's income tax + payroll tax + your own deposits + what is kept in
 *       taxable + income not kept.
 * A retired year draws `spending − income` grossed up for the premiums and the tax; income past spending is not kept
 * (R13). A working year's pay check covers W, its taxes and your own deposits; a short one draws the shortfall from
 * savings, a left over is kept (up to the credit) or not kept. Two flows stay off the map on purpose:
 *  - the employer's deposits: `contribution.*` holds them, but they never were the household's cash, so a working year's
 *    saving is `workingYear.ownDeposits` (the register's *Cash Flows can't print RightCapital's Total inflows…*: printing
 *    `contribution` there misses by exactly the match); the employer note says where the whole deposit shows;
 *  - moves inside savings: a Roth conversion (pre-tax to Roth) and a required withdrawal's move to taxable are neither
 *    in nor out; each is said in words, and the income tax they add is on the map.
 * Where the two sides still differ by more than the grain, or the printed sides differ by more than a dollar of
 * flooring per part (a negative part, an ACA year's income tax below zero, prints unsigned), the difference is drawn as
 * its own labelled node on the short side ("Not explained by the year's figures") with a note, never absorbed into
 * another figure and never called rounding.
 *
 * THE YEARS WITH NO MAP. The year the money runs out (`ranOut`) records what it asked for, not what was paid, and its
 * unmet need has no field: it gets words, never a map that balances on money nobody had (insights 175, 176), and every
 * other year of that run says the money runs out, and when. A working year with no W (`spending` absent, insight 178)
 * cannot say where its pay goes: it gets the "not asked yet" words.
 *
 * Read-only: Maps has no action to withhold (`readOnly` is taken, as every composer takes it, and changes nothing).
 */
import type { LedgerYearRow } from '@shared/model'
import { ROUGH_WINDOW_YEARS } from '@engine/reference/roughSequence'
import { copy, slots } from '../../copy'
import type { TableMeta, TableView } from '../../workbench/tableRun'
import { formatTableDollars, payCheckNotes, rowNotesAt, tableFigure, type TableFigure } from '../../workbench/yearTableChrome'

export type MapsChoice = 'flow' | 'breakdown'

/** The map's groups: the colour slot, the tile and the words each node belongs to. */
export type MapGroup = 'income' | 'distribution' | 'total' | 'expenses' | 'taxes' | 'saving' | 'not-kept' | 'gap'

/** One node of the Sankey: its name, its printed amount, its column (0 the money in, 1 the total, 2 the money out by
 *  group, 3 a group's parts). `value` is the row field it prints (a leaf), or null for a sum. */
export interface MapNode {
  readonly id: string
  readonly name: string
  readonly dollars: number
  /** "~$12,000", or "$12,000" for a figure the household entered (year 0). */
  readonly text: string
  readonly column: 0 | 1 | 2 | 3
  readonly group: MapGroup
  readonly value: number | null
  /** What the hover says: "Name: ~$amount". Only the hover: Highcharts' accessibility module describes a sankey's
   *  points, which are its LINKS (`series.points`), never its nodes (`series.nodes`), so a screen reader hears each
   *  link's sentence (`MapLink.spoken`) and the chart's description, which between them carry every figure. */
  readonly spoken: string
}

export interface MapLink {
  readonly from: string
  readonly to: string
  /** The printed dollars of the node whose figure the flow carries (the flow's width): its source for a flow into
   *  Total inflows, its target for every other flow. */
  readonly weight: number
  /** The group of the node the flow runs to: its tint. */
  readonly group: MapGroup
  /** "From to To: ~$amount": what a screen reader hears for the flow, and the hover over it. */
  readonly spoken: string
}

export interface MapLeaf {
  readonly id: string
  readonly name: string
  readonly text: string
  readonly value: number
}

export interface MapTile {
  readonly id: string
  readonly group: MapGroup
  readonly name: string
  readonly text: string
  readonly leaves: readonly MapLeaf[]
}

export type MapsBody =
  | {
      readonly kind: 'map'
      readonly nodes: readonly MapNode[]
      readonly links: readonly MapLink[]
      readonly inTiles: readonly MapTile[]
      readonly outTiles: readonly MapTile[]
      readonly totalIn: string
      readonly totalOut: string
      /** The tiles' two header bars: "Total inflows ~$118,402". */
      readonly totalInWords: string
      readonly totalOutWords: string
      /** The one-path sentence, the future named: also the chart's description. */
      readonly key: string
      /** The chart's name for a screen reader. */
      readonly title: string
      /** Drawn when the two sides differ past the grain. */
      readonly gap: boolean
    }
  | { readonly kind: 'words'; readonly tone: 'status' | 'alert'; readonly words: string }

export interface ScrubberYear {
  readonly t: number
  readonly year: number
  /** "61/61", "–" for a person no longer alive. */
  readonly ages: string
  readonly working: boolean
  /** The year as the readout prints it: "2048, age –/87: work has stopped". */
  readonly text: string
  /** The year as the slider speaks it, each person named: "2048: Sam is 87, on their own; work has stopped." */
  readonly spoken: string
}

export interface MapsScrubber {
  readonly label: string
  readonly years: readonly ScrubberYear[]
  /** The chosen year's index into `years`. */
  readonly index: number
  /** The index of the first year after work stops, where the run has working years before it, and its mark's word. */
  readonly stopIndex: number | null
  readonly stopMark: string
  /** The last year's mark where the money runs out in it (`copy.cashFlowsShortYear`). */
  readonly endMark: string | null
}

export interface MapsView {
  readonly viewSelect: { readonly label: string; readonly items: readonly { readonly value: MapsChoice; readonly label: string }[]; readonly value: MapsChoice }
  readonly scrubber: MapsScrubber
  /** The chosen year's readout: the year and both ages, and what kind of year it is. */
  readonly heading: string
  readonly body: MapsBody
  /** Notes for what this year's map shows, in reading order. */
  readonly notes: readonly string[]
  /** This year's own sentences ("2031: …"), never collapsed into a run. */
  readonly yearNotes: readonly string[]
  /** Where the money runs out in this run: said on every year's map. */
  readonly runsOut: string | null
  /** Said below the laptop tier, where the map always shows as tiles. */
  readonly phoneNote: string
}

export interface MapsInput {
  readonly rows: readonly LedgerYearRow[]
  readonly meta: TableMeta
  readonly future: TableView
  /** The year asked for (sim-year t), or null for the first year (RightCapital's start). */
  readonly t: number | null
  readonly choice: MapsChoice
  /** The run's name, for the chart's spoken title. */
  readonly runName: string
  /** The rough window's last historical year (its steady-from line). */
  readonly roughEndYear: number
  /** Maps writes nothing; taken as every composer takes it (plan 4.0). */
  readonly readOnly: boolean
}

/** Two sides that differ by less than this (dollars, exact) balance: the money grain plus the left over's whole-dollar
 *  snap (`workingYearBottomLine`) sit far under it. */
export const MAP_GAP_MIN = 2

const GONE = '–'

interface LeafSpec {
  readonly id: string
  readonly name: string
  readonly group: MapGroup
  readonly read: (r: LedgerYearRow) => number | undefined
  readonly entered?: (r: LedgerYearRow) => boolean
}

/** The money in, in the Summary's order: Income inflows, then Planned distribution. */
function inSpecs(meta: TableMeta): LeafSpec[] {
  const entered = () => true
  return [
    ...meta.people.map((p, i): LeafSpec => ({ id: `pay-${i}`, name: slots.workbenchPairPay(p.label), group: 'income', read: (r) => r.payByPerson[i], entered })),
    { id: 'social-security', name: copy.workbenchColSocialSecurity, group: 'income', read: (r) => r.socialSecurity },
    ...meta.people.map((p, i): LeafSpec => ({ id: `other-${i}`, name: slots.cashFlowsOther(p.label), group: 'income', read: (r) => r.otherIncomeByPerson[i]?.gross, entered })),
    { id: 'draw-taxable', name: slots.workbenchPairTakenFrom(copy.workbenchSourceTaxable), group: 'distribution', read: (r) => r.draw.taxable },
    { id: 'draw-pretax', name: slots.workbenchPairTakenFrom(copy.workbenchSourcePretax), group: 'distribution', read: (r) => r.draw.pretax },
    { id: 'draw-roth', name: slots.workbenchPairTakenFrom(copy.workbenchSourceRoth), group: 'distribution', read: (r) => r.draw.roth },
    { id: 'hsa-spend', name: copy.cashFlowsColHsaSpent, group: 'distribution', read: (r) => r.hsaSpend },
  ]
}

/** The money out, in the Summary's order: Expenses, the taxes, Planned saving, then income not kept. */
function outSpecs(meta: TableMeta): LeafSpec[] {
  return [
    // Year 0's spending is the household's own figure on the full pass, and in a working year on either pass (the
    // Summary's rule, `cashFlowsView.ts`).
    { id: 'spending', name: copy.workbenchColSpending, group: 'expenses', read: (r) => r.spending, entered: (r) => meta.track === 'full' || r.workingYear !== undefined },
    { id: 'aca-net', name: copy.workbenchLineMarketplace, group: 'expenses', read: (r) => r.premiums.acaNet },
    // Medicare's figure holds its income surcharge (`premiums.medicare`'s docblock): the surcharge is said in words, never
    // a second node (it would count twice).
    { id: 'medicare', name: copy.workbenchLineMedicare, group: 'expenses', read: (r) => r.premiums.medicare },
    { id: 'medicare-extras', name: copy.workbenchLineMedicareExtras, group: 'expenses', read: (r) => r.premiums.medicareExtras },
    // `taxPaid` alone, "Income tax" (plan 4.0); the pay check's two taxes beside it, payroll never folded in.
    { id: 'income-tax', name: copy.workbenchColIncomeTax, group: 'taxes', read: (r) => r.taxPaid },
    { id: 'tax-on-pay', name: copy.cashFlowsColPayIncomeTax, group: 'taxes', read: (r) => r.workingYear?.taxOnOutsideIncome },
    { id: 'payroll', name: copy.workbenchLinePayroll, group: 'taxes', read: (r) => r.workingYear?.payrollTax },
    { id: 'into-savings', name: copy.workbenchLineIntoSavings, group: 'saving', read: (r) => r.workingYear?.ownDeposits },
    { id: 'kept-in-taxable', name: copy.workbenchLineKeptInTaxable, group: 'saving', read: (r) => r.leftOverCredit },
    { id: 'not-kept', name: copy.cashFlowsColNotKept, group: 'not-kept', read: (r) => r.incomeNotKept },
  ]
}

const GROUP_NAME: Readonly<Record<MapGroup, string>> = {
  income: copy.cashFlowsGroupIncome,
  distribution: copy.cashFlowsGroupDistribution,
  total: copy.mapsTotalIn,
  expenses: copy.cashFlowsGroupExpenses,
  taxes: copy.mapsGroupTaxes,
  saving: copy.cashFlowsGroupSaving,
  'not-kept': copy.cashFlowsColNotKept,
  gap: copy.mapsGap,
}

const IN_GROUPS: readonly MapGroup[] = ['income', 'distribution']
const OUT_GROUPS: readonly MapGroup[] = ['expenses', 'taxes', 'saving', 'not-kept']

interface Printed {
  readonly spec: LeafSpec
  readonly figure: TableFigure
}

/** The figures a year prints: each spec's field through the Summary's figure rule, the empty ones left out. */
function printed(specs: readonly LeafSpec[], r: LedgerYearRow): Printed[] {
  return specs.flatMap((spec) => {
    const figure = tableFigure(spec.read(r), { sign: '', entered: spec.entered?.(r) ?? false, t: r.t })
    return figure === null ? [] : [{ spec, figure }]
  })
}

const grouped = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })
/** A figure's words: "~" on a projection, never a sign (each node names its direction by its side). */
const textOf = (dollars: number, approx: boolean): string => `${approx ? '~' : ''}$${grouped.format(dollars)}`

const agesOf = (meta: TableMeta, r: LedgerYearRow): string => meta.people.map((p, i) => (r.alive[i] === true ? String(p.currentAge + r.t) : GONE)).join('/')
const peopleOf = (meta: TableMeta, r: LedgerYearRow) => meta.people.map((p, i) => ({ mid: p.mid, you: p.you, age: r.alive[i] === true ? p.currentAge + r.t : null }))

/** A year the run holds to pay: someone is paid, or the pay check rides. */
const isWorking = (r: LedgerYearRow): boolean => r.workingYear !== undefined || r.payByPerson.some((p) => p > 0)

/** The tiles of one side: each group with its parts, in order (a group with nothing this year is left out). */
function tilesOf(groups: readonly MapGroup[], leaves: readonly Printed[]): MapTile[] {
  return groups.flatMap((g) => {
    const parts = leaves.filter((p) => p.spec.group === g)
    if (parts.length === 0) return []
    const dollars = parts.reduce((s, p) => s + p.figure.dollars, 0)
    return [
      {
        id: g,
        group: g,
        name: GROUP_NAME[g],
        text: textOf(dollars, parts.some((p) => p.figure.approx)),
        // A group whose one part bears the group's own name (Income not kept) lists no part: it would say itself twice.
        leaves:
          parts.length === 1 && parts[0]!.spec.name === GROUP_NAME[g]
            ? []
            : parts.map((p) => ({ id: p.spec.id, name: p.spec.name, text: textOf(p.figure.dollars, p.figure.approx), value: p.figure.value })),
      },
    ]
  })
}

const TOTAL_ID = 'total-in'
const GAP_ID = 'gap'

/** Maps' view select: the flow (RightCapital's "Waterfall", a Sankey) or the tiles (its "Breakdown"). */
export function mapsViewSelect(choice: MapsChoice): MapsView['viewSelect'] {
  return {
    label: copy.mapsViewLabel,
    items: [
      { value: 'flow', label: copy.mapsViewFlow },
      { value: 'breakdown', label: copy.mapsViewBreakdown },
    ],
    value: choice,
  }
}

export function mapsView(input: MapsInput): MapsView {
  const { rows, meta } = input
  const viewSelect = mapsViewSelect(input.choice)
  const working = rows.some(isWorking)
  const years: ScrubberYear[] = rows.map((r) => {
    const year = meta.startCalendarYear + r.t
    const ages = agesOf(meta, r)
    const kind = !working ? 'plain' : isWorking(r) ? 'working' : 'retired'
    return { t: r.t, year, ages, working: isWorking(r), text: slots.mapsYear(year, ages, kind), spoken: slots.mapsYearSpoken(year, peopleOf(meta, r), kind) }
  })
  const asked = input.t ?? rows[0]?.t ?? 0
  // The asked year, clamped to this run's years (a run that ends sooner than the last one shown keeps its last year).
  const found = years.findIndex((y) => y.t >= asked)
  const index = found === -1 ? Math.max(0, years.length - 1) : found
  const stopAt = working ? years.findIndex((y) => !y.working) : -1
  const ranOutRow = rows.find((r) => r.ranOut)
  const runsOut = ranOutRow === undefined ? null : slots.mapsRunsOut(meta.startCalendarYear + ranOutRow.t)
  const scrubber: MapsScrubber = {
    label: copy.mapsYearLabel,
    years,
    index,
    stopIndex: stopAt > 0 ? stopAt : null,
    stopMark: copy.mapsWorkStops,
    endMark: rows.at(-1)?.ranOut === true ? copy.cashFlowsShortYear : null,
  }
  const r = rows[index]
  const chosen = years[index]
  const base = { viewSelect, scrubber, heading: chosen?.text ?? '', runsOut, phoneNote: copy.mapsPhoneTiles }
  if (r === undefined || chosen === undefined) {
    return { ...base, body: { kind: 'words', tone: 'status', words: copy.workbenchTableLoading }, notes: [], yearNotes: [] }
  }

  // This year's own sentences, and the rough view's steady-from line on its first steady year.
  const yearNotes = [
    ...(input.future === 'rough' && r.t === ROUGH_WINDOW_YEARS ? [slots.cashFlowsYearNote(chosen.year, slots.workbenchRoughSteadyFrom(input.roughEndYear))] : []),
    ...rowNotesAt(meta, rows, index).map((n) => slots.cashFlowsYearNote(chosen.year, n)),
  ]
  const words = (tone: 'status' | 'alert', text: string): MapsView => ({ ...base, body: { kind: 'words', tone, words: text }, notes: [], yearNotes })
  // Calm words (a status, never an alert): the run's own lines already say when the money runs out.
  if (r.ranOut) return words('status', slots.mapsRanOut(chosen.year))
  if (r.spending === undefined) return words('status', copy.mapsWorkingCostUnasked)

  const ins = printed(inSpecs(meta), r)
  const outs = printed(outSpecs(meta), r)
  // The balance is judged on the exact fields; the drawn and printed figures are the whole dollars beside them.
  const exact = (ps: readonly Printed[]) => ps.reduce((s, p) => s + p.figure.value, 0)
  const sum = (ps: readonly Printed[]) => ps.reduce((s, p) => s + p.figure.dollars, 0)
  const approxIn = ins.some((p) => p.figure.approx)
  const approxOut = outs.some((p) => p.figure.approx)
  const gapExact = exact(ins) - exact(outs)
  const gapPrinted = sum(ins) - sum(outs)
  const gapDollars = Math.abs(gapPrinted)
  // Flooring each part to the dollar moves the printed sides apart by at most a dollar a part; past that the printed
  // figures don't add up (a negative part prints unsigned, so a year that balances on the signed fields can still miss
  // by twice it), and the difference is drawn and said, never called rounding.
  const gap = (Math.abs(gapExact) >= MAP_GAP_MIN || gapDollars > ins.length + outs.length) && gapDollars > 0
  const gapSide: 'in' | 'out' | null = !gap ? null : gapPrinted > 0 ? 'out' : 'in'
  const gapNode: Omit<MapNode, 'spoken'> | null =
    gapSide === null ? null : { id: GAP_ID, name: copy.mapsGap, dollars: gapDollars, text: textOf(gapDollars, true), column: gapSide === 'in' ? 0 : 2, group: 'gap', value: null }
  const totalInDollars = sum(ins) + (gapSide === 'in' ? gapDollars : 0)
  const totalOutDollars = sum(outs) + (gapSide === 'out' ? gapDollars : 0)
  const totalIn = textOf(totalInDollars, approxIn || gapSide === 'in')
  const totalOut = textOf(totalOutDollars, approxOut || gapSide === 'out')

  // ── The Sankey: each part of the money in → the total → each group of the money out → its parts. A group with one
  // part is drawn as that part (a second node naming the same figure would only crowd the column).
  const nodes: Omit<MapNode, 'spoken'>[] = []
  const links: Omit<MapLink, 'spoken'>[] = []
  for (const p of ins) {
    nodes.push({ id: p.spec.id, name: p.spec.name, dollars: p.figure.dollars, text: textOf(p.figure.dollars, p.figure.approx), column: 0, group: p.spec.group, value: p.figure.value })
    links.push({ from: p.spec.id, to: TOTAL_ID, weight: p.figure.dollars, group: 'total' })
  }
  if (gapNode !== null && gapSide === 'in') {
    nodes.push(gapNode)
    links.push({ from: GAP_ID, to: TOTAL_ID, weight: gapNode.dollars, group: 'gap' })
  }
  nodes.push({ id: TOTAL_ID, name: copy.mapsTotalIn, dollars: totalInDollars, text: totalIn, column: 1, group: 'total', value: null })
  for (const g of OUT_GROUPS) {
    const parts = outs.filter((p) => p.spec.group === g)
    if (parts.length === 0) continue
    if (parts.length === 1) {
      const p = parts[0]!
      nodes.push({ id: p.spec.id, name: p.spec.name, dollars: p.figure.dollars, text: textOf(p.figure.dollars, p.figure.approx), column: 2, group: g, value: p.figure.value })
      links.push({ from: TOTAL_ID, to: p.spec.id, weight: p.figure.dollars, group: g })
      continue
    }
    const dollars = sum(parts)
    nodes.push({ id: g, name: GROUP_NAME[g], dollars, text: textOf(dollars, parts.some((p) => p.figure.approx)), column: 2, group: g, value: null })
    links.push({ from: TOTAL_ID, to: g, weight: dollars, group: g })
    for (const p of parts) {
      nodes.push({ id: p.spec.id, name: p.spec.name, dollars: p.figure.dollars, text: textOf(p.figure.dollars, p.figure.approx), column: 3, group: g, value: p.figure.value })
      links.push({ from: g, to: p.spec.id, weight: p.figure.dollars, group: g })
    }
  }
  if (gapNode !== null && gapSide === 'out') {
    nodes.push(gapNode)
    links.push({ from: TOTAL_ID, to: GAP_ID, weight: gapNode.dollars, group: 'gap' })
  }

  const gapTile = (side: 'in' | 'out'): MapTile[] =>
    gapNode !== null && gapSide === side ? [{ id: GAP_ID, group: 'gap', name: copy.mapsGap, text: gapNode.text, leaves: [] }] : []

  const shows = (id: string) => outs.some((p) => p.spec.id === id)
  const notes = [
    slots.mapsApproxNote(meta.startCalendarYear),
    // The pay check's notes ride either of its two taxes (a year can owe payroll tax and no income tax on pay).
    ...(shows('tax-on-pay') || shows('payroll') ? payCheckNotes(meta.stateTaxReading, 'map') : []),
    ...(shows('into-savings') ? [copy.mapsEmployerNote] : []),
    ...(shows('medicare') && tableFigure(r.premiums.irmaaSurcharge, { sign: '', entered: false, t: r.t }) !== null
      ? [slots.mapsIrmaa(formatTableDollars(r.premiums.medicare), formatTableDollars(r.premiums.irmaaSurcharge))]
      : []),
    ...(tableFigure(r.conversion, { sign: '', entered: false, t: r.t }) !== null ? [slots.mapsConversion(formatTableDollars(r.conversion))] : []),
    ...(tableFigure(r.rmdToTaxable, { sign: '', entered: false, t: r.t }) !== null ? [copy.mapsRmdOff] : []),
    ...(gap ? [copy.mapsGapNote] : totalInDollars !== totalOutDollars ? [copy.mapsRoundingNote] : []),
  ]
  const named = nodes.map((n): MapNode => ({ ...n, spoken: slots.mapsNodeWords(n.name, n.text) }))
  const byId = new Map(named.map((n) => [n.id, n]))
  return {
    ...base,
    body: {
      kind: 'map',
      nodes: named,
      links: links.map((l): MapLink => {
        const from = byId.get(l.from)
        const to = byId.get(l.to)
        // A flow speaks the figure it carries: a part of the money in for a flow into the total, else the node it feeds.
        const carried = l.to === TOTAL_ID ? from : to
        return { ...l, spoken: slots.mapsLinkWords(from?.name ?? '', to?.name ?? '', carried?.text ?? '') }
      }),
      inTiles: [...tilesOf(IN_GROUPS, ins), ...gapTile('in')],
      outTiles: [...tilesOf(OUT_GROUPS, outs), ...gapTile('out')],
      totalIn,
      totalOut,
      totalInWords: slots.mapsTotalWords(copy.mapsTotalIn, totalIn),
      totalOutWords: slots.mapsTotalWords(copy.mapsTotalOut, totalOut),
      key: slots.mapsKey(chosen.year, totalIn, totalOut, input.future === 'steady'),
      title: slots.mapsChartTitle(chosen.year, input.runName),
      gap,
    },
    notes,
    yearNotes,
  }
}
