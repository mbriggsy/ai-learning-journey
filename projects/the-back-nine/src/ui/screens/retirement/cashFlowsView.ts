/*
 * src/ui/screens/retirement/cashFlowsView.ts: Retirement → Cash Flows, composed (plan docs/plans/6-rightcapital-ui-plan.md,
 * RC6; ref 2.16). PURE: the runs' ledger rows and the page's choices in, the page out: the folder tabs, the breadcrumb or
 * the Accounts table switcher, the two selects, the table's columns (RightCapital's grouped headers and drills) and
 * cells, the sentences around it, and the CSV of exactly the cells shown. `CashFlows.tsx` renders what this returns.
 *
 * THE LAWS IT KEEPS (the year table's, U7, re-asserted on RightCapital's grid)
 *  - Every printed figure is ONE field of its run's row, on the table's one grain, through the one figure rule
 *    (`tableFigure`): "~" on a projected figure, year 0's entered pay, other income and spending exact, and the direction
 *    in each column's own words ("taken out", "put in"), never colour; a short left over in parentheses. Nothing here adds, nets or re-derives a dollar figure, so RightCapital's Total inflows,
 *    Total outflows and its summed Income Inflows / Planned Distribution / Planned Saving cells are not drawn: each of
 *    those RightCapital columns is a header over its one-field columns, and its drill shows every field it holds (the
 *    pilot's call, 2026-11-24, b9-6). The two named exceptions are the engine's own year-end total
 *    (`ledgerRowEndTotal`, the four buckets plus each inherited IRA, the Act 5 plan's KTD22): the Accounts
 *    ending-balance Total, said so under the table, and the paired form's year-end total (U15's `composePaired`).
 *  - A column with nothing in any year of the run is left out, never zero-filled (critique 13), except spending and
 *    income tax (a blank year is a fact) and a bucket's balance where the household holds that bucket.
 *  - Income tax is `taxPaid` alone and never a drill (its federal, state and payroll split is gap 10); the pay check's
 *    taxes sit in their own columns on working rows, payroll tax never folded into Income tax.
 *  - Accounts are named from the run's own grouping (`meta.sources`, through `composeYearTable`'s source key).
 *  - A one-future table never stands alone as the odds: the lines above it say which future it is (plan 4.0).
 */
import { ledgerRowEndTotal } from '@engine/sequencing'
import type { LedgerYearRow } from '@shared/model'
import { copy, slots } from '../../copy'
import type { TableMeta, TableView } from '../../workbench/tableRun'
import { composeYearTable, inheritedYearNotes, lifespansLine, payCheckNotes, tableFigure, yieldLine, type SourceKeyEntry, type TableLine } from '../../workbench/yearTableChrome'
import { composePaired, orderPairedColumns, type PairedColumnId, type PairedFigure } from '../../workbench/railChrome'
import { mapsView, mapsViewSelect, type MapsChoice, type MapsView } from './mapsView'

/** Maps first, as RightCapital orders them (RC20); the Summary stays the page's first view (the builder's call, RC20). */
export type CashFlowsTab = 'maps' | 'summary' | 'accounts'
/** The Summary's drills: RightCapital's underlined headers B9 can break down. Income tax is never one (gap 10). */
export type SummaryDrill = 'income' | 'distribution' | 'expenses' | 'saving'
export type AccountsTable = 'end' | 'deposits' | 'withdrawals' | 'rmd' | 'conversions'
/** The plan select: your plan, the working what-if, a kept what-if, the recommendation, or your plan beside the
 *  what-if open on Analysis (U15's paired form). */
export type CashFlowsPick = 'plan' | 'new' | 'recommended' | 'paired' | `kept:${string}`

/** One run's rows as the page may show them. `answerKey` names the committed answer they were asked under. */
export type RunRows =
  | { readonly kind: 'loading' }
  | { readonly kind: 'error' }
  | { readonly kind: 'withheld'; readonly words: string }
  | {
      readonly kind: 'ready'
      readonly rows: readonly LedgerYearRow[]
      readonly meta: TableMeta
      readonly updating: boolean
      readonly answerKey: string
    }

/** A printed cell: its words, and the one row field it prints (null for a word, a lead or a blank). */
export interface CfCell {
  readonly text: string
  readonly value: number | null
}

export interface CfLeaf {
  readonly kind: 'leaf'
  readonly id: string
  readonly header: string
  readonly numeric: boolean
  /** A sticky leading column (Year, Age). */
  readonly lead?: boolean
  /** The row's header cell (`th scope="row"`). */
  readonly rowHeader?: boolean
  /** Drawn once per row group, spanning its rows (the paired form's year). */
  readonly spanGroup?: boolean
}

export interface CfGroup {
  readonly kind: 'group'
  readonly id: string
  readonly header: string
  /** The header drills in (drawn underlined). */
  readonly drill?: SummaryDrill
  readonly columns: readonly CfNode[]
}

export type CfNode = CfLeaf | CfGroup

export interface CfRow {
  readonly key: string
  /** The paired form's year: the rows that share it are one group. */
  readonly group?: string
  readonly cells: Readonly<Record<string, CfCell>>
}

export type CfBody =
  | { readonly kind: 'state'; readonly tone: 'status' | 'alert'; readonly words: string }
  | {
      readonly kind: 'table'
      readonly columns: readonly CfNode[]
      readonly rows: readonly CfRow[]
      /** Rows from before the latest change, kept on screen while the new ones are worked out. */
      readonly busy: boolean
      readonly paired: boolean
    }
  /** Maps (RC20): one year of the shown run, its scrubber and its map (`mapsView.ts`). */
  | { readonly kind: 'maps'; readonly maps: MapsView; readonly busy: boolean }

export interface CfSelect<V extends string> {
  readonly label: string
  readonly items: readonly { readonly value: V; readonly label: string }[]
  readonly value: V
}

export interface CashFlowsView {
  readonly tabs: { readonly label: string; readonly items: readonly { readonly id: CashFlowsTab; readonly label: string }[]; readonly value: CashFlowsTab }
  /** The Summary's title: "Summary", or "Summary / Expenses" inside a drill (each crumb but the last goes back). */
  readonly breadcrumb: readonly { readonly label: string; readonly drill: SummaryDrill | null }[] | null
  /** The Accounts tab's title is its table switcher (ref 2.16). */
  readonly accountsSelect: CfSelect<AccountsTable> | null
  /** Maps' title is its view select: the flow or the tiles (ref 2.16's "Waterfall" and "Breakdown"). */
  readonly mapsSelect: CfSelect<MapsChoice> | null
  readonly futureSelect: CfSelect<TableView>
  readonly planSelect: CfSelect<CashFlowsPick>
  readonly body: CfBody
  /** "Updating: these rows are from before your latest change." while busy. */
  readonly updating: string | null
  /** Above the table: which future, whose lifespans, when work stops, whose age is which. */
  readonly lines: readonly string[]
  /** Under the table: the stopgaps (the yield line by run, the state clause, the missing kinds, the surtax). */
  readonly stopgaps: readonly string[]
  /** Each year's sentences (R13's flags, the survivor, the steady-from line), "2031: …". */
  readonly yearNotes: readonly string[]
  readonly footnotes: readonly string[]
  readonly sourceKey: readonly SourceKeyEntry[]
  /** The CSV of exactly the cells shown, or null with no table, or while the rows shown are from before the latest
   *  change (a file carries no "Updating" line, so it never saves them). */
  readonly csv: string | null
  /** The file's name: the table, the run it shows (the plan select's own label) and the future. */
  readonly csvName: string
}

export interface CashFlowsInput {
  readonly tab: CashFlowsTab
  readonly drill: SummaryDrill | null
  /** Maps' chosen year (sim-year t, null for the first year) and view. */
  readonly maps: { readonly t: number | null; readonly choice: MapsChoice }
  /** A read-only tab (plan 4.0): Maps writes nothing either way; carried to its composer. */
  readonly readOnly: boolean
  readonly accounts: AccountsTable
  readonly future: TableView
  readonly pick: CashFlowsPick
  /** What the plan select can offer. */
  readonly offers: {
    /** The working what-if's name where it holds a change of its own ("New what-if", "Name (changed)"), else null. */
    readonly working: string | null
    readonly kept: readonly { readonly id: string; readonly name: string }[]
    readonly recommended: boolean
    /** The what-if open on Analysis, where there is one to set beside your plan. */
    readonly paired: string | null
  }
  /** Your plan's rows in the shown future. */
  readonly plan: RunRows
  /** The picked run's rows (any pick but your plan), or the what-if's beside your plan's. */
  readonly other?: RunRows
  /** The picked run's name, for its sentences. */
  readonly otherName?: string
  /** The paired form's columns (`pairedColumnsFor` over the what-if's bundle and the answer's draft). */
  readonly pairedColumns?: readonly PairedColumnId[]
  /** The rough window's years (computed once from the committed series). */
  readonly roughYears: { readonly start: number; readonly end: number; readonly years: number }
  readonly wallCalendarYear: number
  /** The page's one state clause (`composeVerdictStateNote`), or null before an answer. */
  readonly stateClause: string | null
}

// ---------------------------------------------------------------------------
// The figures
// ---------------------------------------------------------------------------

const grouped = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })
/** The projection mark: a glyph, not a word (R11's "~"). */
const APPROX = '~'
/** A person no longer alive that year. */
const GONE = '–'

/** A figure's words: "~" on a projection, a short year's left over (the one signed field) in parentheses (plan 4.0). Each
 *  column names its own direction in words ("Taxable, taken out", "Roth, put in"), so no "+" or "−" rides a figure: beside
 *  "~" it read as a minus sign over a positive draw (the pilot's call, 2026-11-24, b9-6). */
const textOf = (f: TableLine | PairedFigure | null): string => {
  if (f === null) return ''
  const core = `${f.approx ? APPROX : ''}${grouped.format(f.dollars)}`
  return 'sign' in f && f.sign === '−' ? `(${core})` : core
}
const cellOf = (f: TableLine | PairedFigure | null): CfCell => ({ text: textOf(f), value: f === null ? null : f.value })

interface FieldSpec {
  readonly id: string
  readonly header: string
  readonly read?: (r: LedgerYearRow) => number | undefined
  /** A word column (the short year): its word, or null. */
  readonly word?: (r: LedgerYearRow) => string | null
  /** Only a field that can fall below zero is signed (a working year's left over). */
  readonly sign?: 'signed'
  readonly entered?: (r: LedgerYearRow) => boolean
  readonly balance?: boolean
  /** Shown even with nothing in any year. */
  readonly always?: boolean
  /** Shown only inside its group's drill. */
  readonly drillOnly?: boolean
}

interface GroupSpec {
  readonly id: string
  readonly header: string
  readonly drill?: SummaryDrill
  readonly fields: readonly FieldSpec[]
}

interface BandSpec {
  readonly id: string
  readonly header: string
  readonly members: readonly (GroupSpec | FieldSpec)[]
}

const isGroupSpec = (m: GroupSpec | FieldSpec): m is GroupSpec => 'fields' in m

const figureOf = (f: FieldSpec, r: LedgerYearRow): TableLine =>
  f.read === undefined
    ? null
    : tableFigure(f.read(r), { sign: f.sign ?? '', entered: f.entered?.(r) ?? false, ...(f.balance === true ? { balance: true } : {}), t: r.t })

/** A field holds something in some year of the run (a balance column where the household holds that bucket). */
function holds(f: FieldSpec, rows: readonly LedgerYearRow[]): boolean {
  if (f.always === true) return true
  if (f.word !== undefined) return rows.some((r) => f.word!(r) !== null)
  return rows.some((r) => {
    const fig = figureOf(f, r)
    return fig !== null && fig.dollars !== 0
  })
}

function fieldCell(f: FieldSpec, r: LedgerYearRow): CfCell {
  if (f.word !== undefined) return { text: f.word(r) ?? '', value: null }
  return cellOf(figureOf(f, r))
}

const leaf = (f: FieldSpec): CfLeaf => ({ kind: 'leaf', id: f.id, header: f.header, numeric: f.word === undefined })

/** The Summary's bands, groups and fields, in RightCapital's reading order. */
function summarySpecs(meta: TableMeta, rows: readonly LedgerYearRow[]): BandSpec[] {
  const people = meta.people
  const split = rows[0]?.pretaxDrawByPerson !== undefined
  const enteredYear0 = () => true
  return [
    {
      id: 'in',
      header: copy.cashFlowsBandIn,
      members: [
        {
          id: 'income',
          header: copy.cashFlowsGroupIncome,
          drill: 'income',
          fields: [
            ...people.map((p, i): FieldSpec => ({ id: `pay-${i}`, header: slots.workbenchPairPay(p.label), read: (r) => r.payByPerson[i], entered: enteredYear0 })),
            { id: 'social-security', header: copy.workbenchColSocialSecurity, read: (r) => r.socialSecurity },
            ...people.map((p, i): FieldSpec => ({ id: `other-${i}`, header: slots.cashFlowsOther(p.label), read: (r) => r.otherIncomeByPerson[i]?.gross, entered: enteredYear0 })),
            ...people.map((p, i): FieldSpec => ({ id: `pay-taxed-${i}`, header: slots.cashFlowsPayTaxed(p.label), read: (r) => r.payTaxableByPerson[i], drillOnly: true })),
            ...people.map((p, i): FieldSpec => ({ id: `other-taxed-${i}`, header: slots.cashFlowsOtherTaxed(p.label), read: (r) => r.otherIncomeByPerson[i]?.taxable, drillOnly: true })),
          ],
        },
        {
          id: 'distribution',
          header: copy.cashFlowsGroupDistribution,
          drill: 'distribution',
          fields: [
            { id: 'draw-taxable', header: slots.workbenchPairTakenFrom(copy.workbenchSourceTaxable), read: (r) => r.draw.taxable },
            { id: 'draw-pretax', header: slots.workbenchPairTakenFrom(copy.workbenchSourcePretax), read: (r) => r.draw.pretax },
            ...(split
              ? people.map((p, i): FieldSpec => ({
                  id: `draw-pretax-${i}`,
                  header: slots.workbenchPairTakenFrom(slots.workbenchSourcePretaxOf(p.mid)),
                  read: (r) => r.pretaxDrawByPerson?.[i],
                  drillOnly: true,
                }))
              : []),
            { id: 'draw-roth', header: slots.workbenchPairTakenFrom(copy.workbenchSourceRoth), read: (r) => r.draw.roth },
            { id: 'hsa-spend', header: copy.cashFlowsColHsaSpent, read: (r) => r.hsaSpend },
            // Each inherited IRA's own withdrawal (the Act 5 plan's U13): one column per account, never pooled (KTD22).
            ...meta.inherited.map((inh, k): FieldSpec => ({ id: `draw-inherited-${k}`, header: slots.workbenchPairTakenFrom(inh.label), read: (r) => r.inherited?.[k]?.taken })),
            // Beside an inherited IRA's columns the household's own required column names its source, as Accounts →
            // Required withdrawals does, so it never reads as the year's whole required amount (gap 3's review).
            {
              id: 'rmd',
              header: meta.inherited.length > 0 ? slots.workbenchPairRequiredOf(copy.workbenchSourcePretax) : copy.workbenchPairRequired,
              read: (r) => r.rmd,
              drillOnly: true,
            },
            { id: 'rmd-to-taxable', header: copy.cashFlowsColRmdMoved, read: (r) => r.rmdToTaxable, drillOnly: true },
            ...meta.inherited.flatMap((inh, k): FieldSpec[] => [
              { id: `inherited-${k}-already-out`, header: slots.cashFlowsInheritedAlreadyOut(inh.label), read: (r) => r.inherited?.[k]?.booked, drillOnly: true },
              { id: `inherited-${k}-moved`, header: slots.cashFlowsInheritedMoved(inh.label), read: (r) => r.inherited?.[k]?.movedToTaxable, drillOnly: true },
            ]),
          ],
        },
      ],
    },
    {
      id: 'out',
      header: copy.cashFlowsBandOut,
      members: [
        {
          id: 'expenses',
          header: copy.cashFlowsGroupExpenses,
          drill: 'expenses',
          fields: [
            // Year 0's spending is the household's own figure on the full pass, and in a working year on either pass (the
            // year table's rule, `yearTableChrome.ts`).
            { id: 'spending', header: copy.workbenchColSpending, read: (r) => r.spending, always: true, entered: (r) => meta.track === 'full' || r.workingYear !== undefined },
            { id: 'aca-net', header: copy.workbenchLineMarketplace, read: (r) => r.premiums.acaNet, drillOnly: true },
            { id: 'medicare', header: copy.workbenchLineMedicare, read: (r) => r.premiums.medicare, drillOnly: true },
            { id: 'irmaa', header: copy.cashFlowsColIrmaa, read: (r) => r.premiums.irmaaSurcharge, drillOnly: true },
            { id: 'medicare-extras', header: copy.workbenchLineMedicareExtras, read: (r) => r.premiums.medicareExtras, drillOnly: true },
          ],
        },
        // `taxPaid` alone, headed "Income tax", never a drill (plan 4.0 and RC6; its split is gap 10).
        { id: 'income-tax', header: copy.workbenchColIncomeTax, read: (r) => r.taxPaid, always: true },
        {
          id: 'pay-check',
          header: copy.workbenchColPayCheck,
          fields: [
            { id: 'tax-on-pay', header: copy.cashFlowsColPayIncomeTax, read: (r) => r.workingYear?.taxOnOutsideIncome },
            { id: 'payroll', header: copy.workbenchLinePayroll, read: (r) => r.workingYear?.payrollTax },
          ],
        },
        {
          id: 'saving',
          header: copy.cashFlowsGroupSaving,
          drill: 'saving',
          fields: [
            { id: 'put-in-taxable', header: slots.workbenchPairPutIn(copy.workbenchSourceTaxable), read: (r) => r.contribution.taxable },
            { id: 'put-in-pretax', header: slots.workbenchPairPutIn(copy.workbenchSourcePretax), read: (r) => r.contribution.pretax },
            { id: 'put-in-roth', header: slots.workbenchPairPutIn(copy.workbenchSourceRoth), read: (r) => r.contribution.roth },
            { id: 'put-in-hsa', header: slots.workbenchPairPutIn(copy.workbenchSourceHsa), read: (r) => r.contribution.hsa },
            { id: 'into-savings', header: copy.workbenchLineIntoSavings, read: (r) => r.workingYear?.ownDeposits, drillOnly: true },
            { id: 'left-over', header: copy.workbenchLineLeftOver, read: (r) => r.workingYear?.leftOver, sign: 'signed', drillOnly: true },
            { id: 'kept-in-taxable', header: copy.workbenchLineKeptInTaxable, read: (r) => r.leftOverCredit, drillOnly: true },
          ],
        },
      ],
    },
    {
      id: 'own',
      header: copy.cashFlowsBandOwn,
      members: [
        { id: 'conversion', header: copy.workbenchPairToRoth, read: (r) => r.conversion },
        { id: 'not-kept', header: copy.cashFlowsColNotKept, read: (r) => r.incomeNotKept },
        { id: 'short-year', header: copy.cashFlowsColShortYear, word: (r) => (r.ranOut ? copy.cashFlowsShortYear : null) },
      ],
    },
  ]
}

/** The Accounts tab's tables: one column per bucket (the pre-tax one per person where the run keeps them apart), and one
 *  per inherited IRA, never pooled (the Act 5 plan's U13, KTD22); on Required withdrawals each inherited IRA is a group of
 *  its own, its required amount beside what came out and what moved to taxable. */
function accountsFields(table: AccountsTable, meta: TableMeta, rows: readonly LedgerYearRow[]): (FieldSpec | GroupSpec)[] {
  const split = rows[0]?.pretaxEndByPerson !== undefined
  const holdsBucket = (b: 'taxable' | 'roth' | 'hsa') => meta.sources[b].length > 0
  const pretaxEnd = split
    ? meta.people.map((p, i): FieldSpec => ({
        id: `pretax-${i}`,
        header: slots.workbenchSourcePretaxOf(p.mid),
        read: (r) => r.pretaxEndByPerson?.[i],
        balance: true,
        always: (meta.sources.pretaxByPerson[i]?.length ?? 0) > 0,
      }))
    : [{ id: 'pretax', header: copy.workbenchSourcePretax, read: (r: LedgerYearRow) => r.end.pretax, balance: true, always: meta.sources.pretax.length > 0 }]
  switch (table) {
    case 'end':
      return [
        { id: 'taxable', header: copy.workbenchSourceTaxable, read: (r) => r.end.taxable, balance: true, always: holdsBucket('taxable') },
        ...pretaxEnd,
        { id: 'roth', header: copy.workbenchSourceRoth, read: (r) => r.end.roth, balance: true, always: holdsBucket('roth') },
        { id: 'hsa', header: copy.workbenchSourceHsa, read: (r) => r.end.hsa, balance: true, always: holdsBucket('hsa') },
        ...meta.inherited.map((inh, k): FieldSpec => ({ id: `inherited-${k}`, header: inh.label, read: (r) => r.inherited?.[k]?.end, balance: true, always: true })),
        // The engine's own year-end total (`ledgerRowEndTotal`: the four buckets plus each inherited IRA, KTD22), said
        // so under the table: the one figure here that is not a single field.
        { id: 'total', header: copy.cashFlowsColTotal, read: (r) => ledgerRowEndTotal(r), balance: true, always: true },
      ]
    case 'deposits':
      return [
        { id: 'taxable', header: copy.workbenchSourceTaxable, read: (r) => r.contribution.taxable },
        { id: 'pretax', header: copy.workbenchSourcePretax, read: (r) => r.contribution.pretax },
        { id: 'roth', header: copy.workbenchSourceRoth, read: (r) => r.contribution.roth },
        { id: 'hsa', header: copy.workbenchSourceHsa, read: (r) => r.contribution.hsa },
      ]
    case 'withdrawals':
      return [
        { id: 'taxable', header: copy.workbenchSourceTaxable, read: (r) => r.draw.taxable },
        ...(split
          ? meta.people.map((p, i): FieldSpec => ({ id: `pretax-${i}`, header: slots.workbenchSourcePretaxOf(p.mid), read: (r) => r.pretaxDrawByPerson?.[i] }))
          : [{ id: 'pretax', header: copy.workbenchSourcePretax, read: (r: LedgerYearRow) => r.draw.pretax }]),
        { id: 'roth', header: copy.workbenchSourceRoth, read: (r) => r.draw.roth },
        { id: 'hsa', header: copy.cashFlowsColHsaSpent, read: (r) => r.hsaSpend },
        ...meta.inherited.flatMap((inh, k): FieldSpec[] => [
          { id: `inherited-${k}`, header: inh.label, read: (r) => r.inherited?.[k]?.taken },
          { id: `inherited-${k}-already-out`, header: slots.cashFlowsInheritedAlreadyOut(inh.label), read: (r) => r.inherited?.[k]?.booked },
        ]),
      ]
    case 'rmd': {
      const own: FieldSpec[] = [
        { id: 'rmd', header: copy.workbenchPairRequired, read: (r) => r.rmd, always: true },
        { id: 'rmd-to-taxable', header: copy.cashFlowsColRmdMoved, read: (r) => r.rmdToTaxable },
      ]
      return [
        // Beside an inherited IRA's group the household's own pair is named too, so no Required column reads as the
        // year's whole required amount (U13's look: "Required withdrawal" blank in 2026, unnamed, beside the ~8,755 the
        // law required from the inherited IRA). Alone, the pair is the table and needs no name.
        ...(meta.inherited.length > 0 ? [{ id: 'pretax', header: copy.workbenchSourcePretax, fields: own }] : own),
        ...meta.inherited.map(
          (inh, k): GroupSpec => ({
            id: `inherited-${k}`,
            header: inh.label,
            fields: [
              { id: `inherited-${k}-required`, header: copy.cashFlowsInheritedRequired, read: (r) => r.inherited?.[k]?.required, always: true },
              { id: `inherited-${k}-taken`, header: copy.cashFlowsInheritedTaken, read: (r) => r.inherited?.[k]?.taken },
              { id: `inherited-${k}-already-out`, header: copy.cashFlowsInheritedBooked, read: (r) => r.inherited?.[k]?.booked },
              { id: `inherited-${k}-moved`, header: copy.cashFlowsInheritedMovedShort, read: (r) => r.inherited?.[k]?.movedToTaxable },
            ],
          }),
        ),
      ]
    }
    case 'conversions':
      return [{ id: 'conversion', header: copy.workbenchPairToRoth, read: (r) => r.conversion, always: true }]
  }
}

// ---------------------------------------------------------------------------
// The columns
// ---------------------------------------------------------------------------

const YEAR: CfLeaf = { kind: 'leaf', id: 'year', header: copy.workbenchColYear, numeric: false, lead: true, rowHeader: true }
const AGE: CfLeaf = { kind: 'leaf', id: 'age', header: copy.cashFlowsColAge, numeric: false, lead: true }

/** The Summary's columns at the top or inside one drill, and the fields they print. */
function summaryColumns(meta: TableMeta, rows: readonly LedgerYearRow[], drill: SummaryDrill | null): { columns: CfNode[]; fields: FieldSpec[]; drills: Set<SummaryDrill> } {
  const fields: FieldSpec[] = []
  const drills = new Set<SummaryDrill>()
  const columns: CfNode[] = [YEAR, AGE]
  for (const band of summarySpecs(meta, rows)) {
    const members: CfNode[] = []
    for (const m of band.members) {
      if (!isGroupSpec(m)) {
        if (drill === null && holds(m, rows)) {
          fields.push(m)
          members.push(leaf(m))
        }
        continue
      }
      const kept = m.fields.filter((f) => holds(f, rows))
      if (kept.length === 0) continue
      if (drill !== null) {
        if (m.drill !== drill) continue
        fields.push(...kept)
        // Inside a drill the group's header is the table's one band, never a drill of its own (screenshot -06).
        return { columns: [YEAR, AGE, { kind: 'group', id: m.id, header: m.header, columns: kept.map(leaf) }], fields, drills }
      }
      // The top shows the group's main fields; where only its drill's fields hold anything, those (it never hides).
      const top = kept.filter((f) => f.drillOnly !== true)
      const shown = top.length > 0 ? top : kept
      const drillable = m.drill !== undefined && kept.length > shown.length
      if (drillable) drills.add(m.drill!)
      fields.push(...shown)
      members.push({ kind: 'group', id: m.id, header: m.header, ...(drillable ? { drill: m.drill! } : {}), columns: shown.map(leaf) })
    }
    if (members.length > 0) columns.push({ kind: 'group', id: band.id, header: band.header, columns: members })
  }
  return { columns, fields, drills }
}

/** The leaves in reading order. */
export function leavesOf(columns: readonly CfNode[]): CfLeaf[] {
  return columns.flatMap((c) => (c.kind === 'leaf' ? [c] : leavesOf(c.columns)))
}

const yearCell = (year: number): CfCell => ({ text: String(year), value: null })
const ageCell = (meta: TableMeta, r: LedgerYearRow): CfCell => ({
  text: meta.people.map((p, i) => (r.alive[i] === true ? String(p.currentAge + r.t) : GONE)).join('/'),
  value: null,
})

function singleRows(meta: TableMeta, rows: readonly LedgerYearRow[], fields: readonly FieldSpec[]): CfRow[] {
  return rows.map((r) => {
    const cells: Record<string, CfCell> = { year: yearCell(meta.startCalendarYear + r.t), age: ageCell(meta, r) }
    for (const f of fields) cells[f.id] = fieldCell(f, r)
    return { key: String(r.t), cells }
  })
}

// ---------------------------------------------------------------------------
// The CSV of exactly the cells shown
// ---------------------------------------------------------------------------

const csvField = (s: string): string => (/[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s)

/** The header rows as drawn: each group's words over its first column, a leaf's on the last header row. */
export function headerRows(columns: readonly CfNode[]): string[][] {
  const depth = (n: CfNode): number => (n.kind === 'leaf' ? 1 : 1 + Math.max(...n.columns.map(depth)))
  const levels = Math.max(...columns.map(depth))
  const out: string[][] = Array.from({ length: levels }, () => [])
  const walk = (n: CfNode, level: number) => {
    if (n.kind === 'leaf') {
      for (let l = level; l < levels - 1; l++) out[l]!.push('')
      out[levels - 1]!.push(n.header)
      return
    }
    // A group sits on its own level from the top (TanStack's header groups); a leaf under a shallower group has blank
    // cells between it and its group.
    const width = leavesOf([n]).length
    out[level]!.push(n.header, ...Array.from({ length: width - 1 }, () => ''))
    for (const child of n.columns) walk(child, level + 1)
  }
  for (const c of columns) walk(c, 0)
  return out
}

export function cashFlowsCsv(columns: readonly CfNode[], rows: readonly CfRow[]): string {
  const leaves = leavesOf(columns)
  // A header's no-break spaces hold its words together on the page (`cashFlowsColPayIncomeTax`); a file carries plain ones.
  const heads = headerRows(columns).map((cells) => cells.map((c) => c.replace(/\u00a0/g, ' ')))
  const lines = [...heads, ...rows.map((r) => leaves.map((l) => r.cells[l.id]?.text ?? ''))]
  return lines.map((cells) => cells.map(csvField).join(',')).join('\r\n')
}

// ---------------------------------------------------------------------------
// The page
// ---------------------------------------------------------------------------

const DRILL_LABEL: Readonly<Record<SummaryDrill, string>> = {
  income: copy.cashFlowsGroupIncome,
  distribution: copy.cashFlowsGroupDistribution,
  expenses: copy.cashFlowsGroupExpenses,
  saving: copy.cashFlowsGroupSaving,
}

const ACCOUNTS_ITEMS: readonly { readonly value: AccountsTable; readonly label: string }[] = [
  { value: 'end', label: copy.cashFlowsAccountsEnd },
  { value: 'deposits', label: copy.cashFlowsAccountsDeposits },
  { value: 'withdrawals', label: copy.cashFlowsAccountsWithdrawals },
  { value: 'rmd', label: copy.cashFlowsAccountsRmd },
  { value: 'conversions', label: copy.cashFlowsAccountsConversions },
]

/** The plan select's choices, and the pick it shows (a pick no longer offered reads your plan). `single`: Maps draws one
 *  run, so it offers no "Your plan beside the what-if" (a held pair reads your plan there; the builder's call, RC20). */
export function planSelect(offers: CashFlowsInput['offers'], pick: CashFlowsPick, single = false): CfSelect<CashFlowsPick> {
  const items: { value: CashFlowsPick; label: string }[] = [{ value: 'plan', label: copy.workbenchRailPlanLabel }]
  if (offers.working !== null) items.push({ value: 'new', label: offers.working })
  for (const k of offers.kept) items.push({ value: `kept:${k.id}`, label: k.name })
  if (offers.recommended) items.push({ value: 'recommended', label: copy.probabilityPickRecommended })
  if (offers.paired !== null && !single) items.push({ value: 'paired', label: copy.cashFlowsPickPaired })
  return { label: copy.cashFlowsPlanLabel, items, value: items.some((i) => i.value === pick) ? pick : 'plan' }
}

const stateBody = (rows: Exclude<RunRows, { kind: 'ready' }>): CfBody =>
  rows.kind === 'loading'
    ? { kind: 'state', tone: 'status', words: copy.workbenchTableLoading }
    : rows.kind === 'error'
      ? { kind: 'state', tone: 'alert', words: copy.workbenchTableError }
      : { kind: 'state', tone: 'status', words: rows.words }

/** Where work stops in one run's rows, said by where the year came from (`TableMeta.stopFrom`): the answer's date, the
 *  window's last year, or a what-if's stop-year lever (named for its run, never credited to the answer's date). `named`:
 *  each run says its own (the paired view, where the two years differ). Read off the run's own meta, never the plan's,
 *  which can still be loading while a picked what-if is ready. */
function stopLine(meta: TableMeta, run: string, named: boolean, maps = false): string {
  if (meta.stopYear === undefined || meta.route === 'spine') return ''
  if (meta.stopFrom === 'lever') return slots.cashFlowsRunStopsLever(run, meta.stopYear)
  if (meta.route === 'dated') return named ? slots.cashFlowsRunStopsDated(run, meta.stopYear) : maps ? slots.mapsStopsIn(meta.stopYear) : slots.workbenchStopsIn(meta.stopYear)
  return named ? slots.cashFlowsRunStopsNoDate(run, meta.stopYear) : maps ? slots.mapsNoDate(meta.stopYear) : slots.workbenchNoDate(meta.stopYear)
}

/** Which future, whose lifespans, when work stops (`stops`), whose age is which: the words over a table (or, `maps`,
 *  over one year's map, worded for its figures). Over a run that is not your plan, the steady sentence says the pinned
 *  answer reads your plan, not this table's run. */
function aboutLines(meta: TableMeta, future: TableView, input: CashFlowsInput, stops: readonly string[], plansOwn: boolean, withAges = true, maps = false): string[] {
  const { start, end, years } = input.roughYears
  return [
    future === 'steady' ? (plansOwn ? copy.workbenchSteadyWhat : copy.cashFlowsSteadyWhatOther) : slots.workbenchRoughWhat(start, end, years),
    lifespansLine(meta.people),
    ...stops,
    meta.track === 'floor' ? (maps ? slots.mapsFloorTrack() : slots.workbenchFloorTrack()) : '',
    input.wallCalendarYear > meta.startCalendarYear ? (maps ? slots.mapsAged(meta.startCalendarYear) : slots.workbenchAged(meta.startCalendarYear)) : '',
    meta.people.length > 1 && withAges ? slots.cashFlowsAgesKey(meta.people.map((p) => p.label)) : '',
  ].filter((s) => s !== '')
}

/** The notes under one run's table, each only where the column it explains is shown (the Accounts tables and the drills
 *  show other columns than the year table `composeYearTable` notes for). */
function singleFootnotes(columns: readonly CfNode[], meta: TableMeta, rows: readonly LedgerYearRow[], deposits: boolean, showsTotal: boolean): string[] {
  const shown = new Set(leavesOf(columns).map((l) => l.id))
  const putIn = deposits || [...shown].some((id) => id.startsWith('put-in-'))
  return [
    copy.workbenchApproxNote,
    ...(putIn ? [copy.workbenchMatchNote] : []),
    // Either of the pay check's two taxes brings its notes (a year can owe payroll tax and no income tax on pay).
    ...(shown.has('tax-on-pay') || shown.has('payroll') ? payCheckNotes(meta.stateTaxReading) : []),
    ...(shown.has('rmd') ? [copy.workbenchRequiredNote] : []),
    ...([...shown].some((id) => /^inherited-\d+-required$/.test(id)) ? [copy.cashFlowsInheritedRequiredNote] : []),
    ...([...shown].some((id) => /^inherited-\d+-already-out$/.test(id)) ? [copy.cashFlowsInheritedBookedNote] : []),
    ...(shown.has('spending') && rows.some((r) => r.spending === undefined) ? [copy.workbenchNoSpendingNote] : []),
    ...(showsTotal ? [copy.cashFlowsEndTotalNote] : []),
  ]
}

/** A name a file can hold: the label's letters and digits, joined by hyphens (accents dropped), at most 48 characters. */
function fileSlug(label: string, fallback: string): string {
  const slug = label
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
    .replace(/-+$/, '')
  return slug === '' ? fallback : slug
}

function stopgapLines(yieldLines: readonly string[], input: CashFlowsInput, maps = false): string[] {
  return [...yieldLines, ...(input.stateClause !== null ? [input.stateClause] : []), maps ? copy.mapsKindsMissing : copy.workbenchKindsMissing, copy.recDiscNiit]
}

export function cashFlowsView(input: CashFlowsInput): CashFlowsView {
  const { tab, future } = input
  const plan = planSelect(input.offers, input.pick, tab === 'maps')
  const pick = plan.value
  const paired = pick === 'paired'
  const drill = tab === 'summary' && !paired ? input.drill : null
  const base = {
    tabs: {
      label: copy.cashFlowsTabsLabel,
      items: [
        { id: 'maps' as const, label: copy.cashFlowsTabMaps },
        { id: 'summary' as const, label: copy.cashFlowsTabSummary },
        { id: 'accounts' as const, label: copy.cashFlowsTabAccounts },
      ],
      value: tab,
    },
    accountsSelect: tab === 'accounts' && !paired ? { label: copy.cashFlowsAccountsLabel, items: ACCOUNTS_ITEMS, value: input.accounts } : null,
    mapsSelect: tab === 'maps' ? mapsViewSelect(input.maps.choice) : null,
    futureSelect: {
      label: copy.workbenchViewLegend,
      items: [
        { value: 'steady' as const, label: copy.workbenchViewSteady },
        { value: 'rough' as const, label: copy.workbenchViewRough },
      ],
      value: future,
    },
    planSelect: plan,
  }
  // The file's name: the table shown, then its run (a one-run CSV has no run column): the plan select's own label, or, in
  // the paired form, the what-if it sets beside your plan.
  const runSlug = paired
    ? `your-plan-and-${fileSlug(input.otherName ?? copy.workbenchRailWhatIfLabel, 'what-if')}`
    : fileSlug(plan.items.find((i) => i.value === pick)?.label ?? '', pick === 'plan' ? 'plan' : 'what-if')
  const nameFor = (validDrill: boolean): string =>
    `cash-flows-${paired ? 'paired' : tab === 'accounts' ? input.accounts : validDrill && drill !== null ? drill : tab}-${runSlug}-${future}.csv`
  const crumbs = (valid: boolean): CashFlowsView['breadcrumb'] =>
    // The paired form is one table on either tab (it has no Accounts tables and no drills): its title names it.
    paired
      ? [{ label: copy.cashFlowsPickPaired, drill: null }]
      : tab !== 'summary'
      ? null
      : drill !== null && valid
        ? [
            { label: copy.cashFlowsTabSummary, drill: null },
            { label: DRILL_LABEL[drill], drill },
          ]
        : [{ label: copy.cashFlowsTabSummary, drill: null }]
  const empty = (body: CfBody): CashFlowsView => ({
    ...base,
    breadcrumb: crumbs(false),
    body,
    updating: null,
    lines: [],
    stopgaps: [],
    yearNotes: [],
    footnotes: [],
    sourceKey: [],
    csv: null,
    csvName: nameFor(false),
  })

  // ── Your plan beside the what-if (U15's paired form) ──
  if (paired) {
    const other = input.other ?? { kind: 'loading' as const }
    if (input.plan.kind !== 'ready') return empty(stateBody(input.plan))
    if (other.kind !== 'ready') return empty(stateBody(other))
    // Rows pair only on one answer (U14's report, section 5): until both runs are on it, the newer one is worked out.
    if (input.plan.answerKey !== other.answerKey) return empty({ kind: 'state', tone: 'status', words: copy.workbenchTableLoading })
    const whatIfName = input.otherName ?? copy.workbenchRailWhatIfLabel
    // Where either run has a working year, the pay check's two taxes ride the pair (Income tax leaves out a working
    // year's tax on pay, so a working row read beside a retired one would look tax-free): plan 4.0's tax-label law.
    const working = input.plan.rows.some((r) => r.workingYear !== undefined) || other.rows.some((r) => r.workingYear !== undefined)
    const want = new Set<PairedColumnId>([...(input.pairedColumns ?? ['income-tax', 'end-total']), ...(working ? (['tax-on-pay', 'payroll'] as const) : [])])
    const table = composePaired({
      columns: orderPairedColumns(want),
      plan: { rows: input.plan.rows, meta: input.plan.meta },
      whatIf: { rows: other.rows, meta: other.meta },
      names: { plan: copy.workbenchRailPlanLabel, whatIf: whatIfName },
    })
    const columns: CfNode[] = [
      { ...YEAR, rowHeader: false, spanGroup: true },
      { kind: 'leaf', id: 'run', header: copy.cashFlowsColRun, numeric: false, rowHeader: true },
      ...table.columns.map((c): CfLeaf => ({ kind: 'leaf', id: c.id, header: c.header, numeric: true })),
    ]
    const rows: CfRow[] = table.rows.flatMap((r) =>
      (['plan', 'whatIf'] as const).map((side) => {
        const cells: Record<string, CfCell> = {
          year: yearCell(r.year),
          run: { text: side === 'plan' ? copy.workbenchRailPlanLabel : whatIfName, value: null },
        }
        table.columns.forEach((c, i) => {
          cells[c.id] = cellOf(r.cells[i]![side])
        })
        return { key: `${r.t}-${side}`, group: String(r.year), cells }
      }),
    )
    const busy = input.plan.updating || other.updating
    // One stop line over both runs where they stop in the same year; each run's, named, where they differ.
    const planMeta = input.plan.meta
    const stops =
      planMeta.stopYear === other.meta.stopYear
        ? [stopLine(planMeta, copy.workbenchRailPlanLabel, false)]
        : [stopLine(planMeta, copy.workbenchRailPlanLabel, true), stopLine(other.meta, whatIfName, true)]
    // The notes ride beside the columns they explain, as under one run's table (`singleFootnotes`).
    const kept = new Set<string>(table.columns.map((c) => c.id))
    // Either of the pay check's two taxes brings its notes (a pair can owe payroll tax and no income tax on pay, and
    // `composePaired` drops a column empty on both runs).
    const payCheck =
      kept.has('tax-on-pay') || kept.has('payroll')
        ? [...new Set([...payCheckNotes(planMeta.stateTaxReading), ...payCheckNotes(other.meta.stateTaxReading)])]
        : []
    const blankSpending = [...input.plan.rows, ...other.rows].some((r) => r.spending === undefined)
    const footnotes = [
      copy.workbenchApproxNote,
      ...([...kept].some((id) => id.startsWith('put-in-')) ? [copy.workbenchMatchNote] : []),
      ...payCheck,
      ...(kept.has('required') ? [copy.workbenchRequiredPairedNote] : []),
      ...([...kept].some((id) => id.startsWith('inherited-required:')) ? [copy.cashFlowsInheritedRequiredNote] : []),
      ...(kept.has('spending') && blankSpending ? [copy.workbenchNoSpendingNote] : []),
      copy.cashFlowsPairedNote,
    ]
    return {
      ...base,
      breadcrumb: crumbs(false),
      body: { kind: 'table', columns, rows, busy, paired: true },
      updating: busy ? copy.workbenchTableUpdating : null,
      lines: aboutLines(planMeta, future, input, stops, false, false),
      stopgaps: stopgapLines(table.yieldLines, input),
      yearNotes: table.rows.flatMap((r) => r.notes.map((n) => slots.cashFlowsYearNote(r.year, n))),
      footnotes,
      sourceKey: [],
      csv: busy ? null : cashFlowsCsv(columns, rows),
      csvName: nameFor(false),
    }
  }

  // ── One run: your plan, or the run the select picked ──
  const run = pick === 'plan' ? input.plan : (input.other ?? { kind: 'loading' as const })
  if (run.kind !== 'ready') return empty(stateBody(run))
  const { rows, meta } = run
  const runName = pick === 'plan' ? copy.workbenchRailPlanLabel : (input.otherName ?? copy.workbenchRailWhatIfLabel)
  const yieldWords = yieldLine(meta, rows)
  const yields = yieldWords === null ? [] : [slots.workbenchPairYield(runName, yieldWords)]
  const stopgaps = stopgapLines(yields, input)

  // ── Maps (RC20): one year of this run. The page's own lines (which future, whose lifespans, when work stops, the
  // aged plan, whose age is which; the stopgaps; what each savings source holds) ride as over the Summary, worded for
  // a map where the Summary's name a table, with the map's notes and the year's own.
  if (tab === 'maps') {
    const maps = mapsView({ rows, meta, future, t: input.maps.t, choice: input.maps.choice, runName, roughEndYear: input.roughYears.end, readOnly: input.readOnly })
    return {
      ...base,
      breadcrumb: null,
      body: { kind: 'maps', maps, busy: run.updating },
      updating: run.updating ? copy.mapsUpdating : null,
      lines: [...aboutLines(meta, future, input, [stopLine(meta, runName, false, true)], pick === 'plan', true, true), ...(maps.runsOut !== null ? [maps.runsOut] : [])],
      stopgaps: stopgapLines(yields, input, true),
      yearNotes: maps.yearNotes,
      footnotes: maps.notes,
      // The Summary's own key for this run and future: the map's "Taxable, taken out" says what it holds the same way.
      sourceKey: composeYearTable({ rows, meta, view: future }).sourceKey,
      csv: null,
      csvName: nameFor(false),
    }
  }

  const composed = composeYearTable({ rows, meta, view: future, ...(future === 'rough' ? { roughEndYear: input.roughYears.end } : {}) })

  let columns: CfNode[]
  let fields: FieldSpec[]
  let validDrill = false
  if (tab === 'summary') {
    const top = summaryColumns(meta, rows, null)
    // A drill this run cannot make (its group holds nothing more than the top shows) reads the Summary.
    validDrill = drill !== null && top.drills.has(drill)
    const shown = validDrill ? summaryColumns(meta, rows, drill) : top
    columns = shown.columns
    fields = shown.fields
  } else {
    fields = []
    columns = [YEAR, AGE]
    for (const m of accountsFields(input.accounts, meta, rows)) {
      if (!isGroupSpec(m)) {
        if (holds(m, rows)) {
          fields.push(m)
          columns.push(leaf(m))
        }
        continue
      }
      const kept = m.fields.filter((f) => holds(f, rows))
      if (kept.length === 0) continue
      fields.push(...kept)
      columns.push({ kind: 'group', id: m.id, header: m.header, columns: kept.map(leaf) })
    }
  }
  const tableRows = singleRows(meta, rows, fields)
  const inheritedNotes = inheritedYearNotes(meta, rows)
  const yearNotes = composed.rows.flatMap((r) => [
    ...(r.steadyFrom !== undefined ? [slots.cashFlowsYearNote(r.year, r.steadyFrom)] : []),
    ...r.notes.map((n) => slots.cashFlowsYearNote(r.year, n)),
    ...(inheritedNotes.get(r.t) ?? []).map((n) => slots.cashFlowsYearNote(r.year, n)),
  ])
  const showsTotal = tab === 'accounts' && input.accounts === 'end'
  return {
    ...base,
    breadcrumb: crumbs(validDrill),
    body: { kind: 'table', columns, rows: tableRows, busy: run.updating, paired: false },
    updating: run.updating ? copy.workbenchTableUpdating : null,
    lines: aboutLines(meta, future, input, [stopLine(meta, runName, false)], pick === 'plan'),
    stopgaps,
    yearNotes,
    footnotes: singleFootnotes(columns, meta, rows, tab === 'accounts' && input.accounts === 'deposits', showsTotal),
    sourceKey: composed.sourceKey,
    csv: run.updating ? null : cashFlowsCsv(columns, tableRows),
    csvName: nameFor(validDrill),
  }
}
