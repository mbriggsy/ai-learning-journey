/*
 * src/ui/workbench/yearTableChrome.ts — the year-by-year table's composer (workbench plan U7, R4–R6, R10, R11, R13).
 *
 * PURE: the engine's ledger rows (U3's sink) and the run's own meta in, the table's columns, cells and sentences out.
 * The component only renders what this returns.
 *
 * THE LAWS IT KEEPS
 *  - Every figure is ONE field of the row (R5, KTD5). The composer never adds, nets or re-derives a dollar figure:
 *    where the engine keeps a figure per person or per premium, the table shows each one on its own line. A test
 *    collects every number the row carries and fails on any figure that is not one of them.
 *  - The grain (R11, insight 146): every figure prints in whole dollars from the engine's own money grain
 *    (`workingYearBottomLine`: the cent snap, a half-cent tie toward −∞, then the whole dollar toward −∞), unsigned.
 *    Every field here is read as it is signed on the row, so a positive flow, balance or cost prints rounded DOWN, as
 *    the plan's U7 brief directs (R11's direction, `formatActionableDollar`): a cost can read up to 99¢ under its
 *    field; only a signed short year's left over rounds away from zero, the gloomy side. A projected figure wears "~";
 *    year 0's entered facts (each person's pay and other income, and the spending the household gave for that year)
 *    print exactly.
 *  - The row's clock (KTD5, insight 134): row t is calendar year `startCalendarYear + t`; its flows are that year's
 *    and its balances that year's close.
 *  - Accounts are named from `meta.sources`, the grouping captured with the run, never from the live draft (insights
 *    081, 132); after a first death the survivor's pre-tax column also names the accounts rolled in, keyed to the
 *    row's own `rolledOver`.
 *
 * THE SHAPE: the widest household (two people's pre-tax, Roth, taxable and an HSA, pay, premiums both sides of 65)
 * holds about thirty figures a year: one figure per column would not fit a laptop. So a column's box holds up to three
 * lines, each line one field, named in the column's header (a person's pay and other income; an account's put in,
 * taken out and left). A column or a line with nothing in any year of this future is left out.
 */
import { workingYearBottomLine } from '@engine/moneyGrain'
import { ROUGH_WINDOW_YEARS } from '@engine/reference/roughSequence'
import type { LedgerYearRow, AccountKind, WorkingYearStateTaxReading } from '@shared/model'
import type { SourceAccount } from '@intake/intakeMap'
import type { LeftOverShownState } from '@intake/workingYearLeftOverState'
import { kindLabel } from '@intake/accountKinds'
import { copy, slots, type CopyKey } from '../copy'
import type { TableMeta, TablePerson, TableView } from './tableRun'

/** One printed figure: the field's own value, and how it prints. */
export interface TableFigure {
  /** The row field's value, exactly (the test reads it back against the row). */
  readonly value: number
  /** The whole dollars it prints, on the engine's grain, unsigned. */
  readonly dollars: number
  /** False only for year 0's entered facts. */
  readonly approx: boolean
  /** The non-color direction mark: put in (+), taken out (−), a short year (−), or none. */
  readonly sign: '+' | '−' | ''
}

/** A line in a box: its figure, or null where nothing moved that year. */
export type TableLine = TableFigure | null

export type TableGroup = 'in' | 'out' | 'savings'

export interface TableColumn {
  readonly id: string
  readonly group: TableGroup
  readonly header: string
  /** What each of the box's lines holds, in order (empty for a one-figure column). */
  readonly lineLabels: readonly string[]
}

export interface TableRowView {
  readonly t: number
  readonly year: number
  /** Each person's age this year, or null once they have died. */
  readonly ages: readonly (number | null)[]
  /** One box per column, in column order; each box one line per label. */
  readonly cells: readonly (readonly TableLine[])[]
  /** The row's sentences: R13's flags and the plan's known omissions. */
  readonly notes: readonly string[]
  /** The rough view's first steady year: a divider says the market is steady from here (§5.4). */
  readonly steadyFrom?: string
}

export interface SourceKeyEntry {
  readonly label: string
  readonly accounts: string
}

export interface ComposedTable {
  readonly columns: readonly TableColumn[]
  readonly rows: readonly TableRowView[]
  /** Sentences under the table that hold for this future's columns. */
  readonly notes: readonly string[]
  /** What each savings column holds (R6). */
  readonly sourceKey: readonly SourceKeyEntry[]
  /** Whose age is which in the year column, in the people's order (a box reads "61 / 59"). */
  readonly ageLabels: readonly string[]
}

/** How a line reads its field. `undefined` = the row has no such field this year. */
interface LineSpec {
  readonly label: string
  readonly read: (r: LedgerYearRow) => number | undefined
  readonly sign: '+' | '−' | 'signed' | ''
  /** Year 0's value is a fact the household entered: it prints exactly. A predicate where that depends on the row. */
  readonly enteredInYear0?: boolean | ((r: LedgerYearRow) => boolean)
  /** A balance: a zero prints, and the line stays when every year holds zero. */
  readonly balance?: boolean
}

interface ColumnSpec {
  readonly id: string
  readonly group: TableGroup
  readonly header: string
  readonly lines: readonly LineSpec[]
  /** Shown even when every year holds nothing (spending and income tax: a blank year is a fact). */
  readonly always?: boolean
}

/** A figure on the table's one grain (insight 146): the engine's money grain, whole dollars. */
export function tableDollars(value: number): number {
  return Math.abs(workingYearBottomLine(value))
}

/** The grain's printed digits, grouped. */
const grouped = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })
export function formatTableDollars(value: number): string {
  return grouped.format(tableDollars(value))
}

const nonZero = (x: number | undefined): x is number => x !== undefined && tableDollars(x) !== 0

/** How one field of one row prints (the table's grain, "~" and the direction mark), or null where nothing moved. The
 *  one figure rule every view of the rows shares: this table's boxes and Cash Flows' columns (Act 6 · RC6). */
export function tableFigure(
  value: number | undefined,
  how: { readonly sign: '+' | '−' | 'signed' | ''; readonly entered: boolean; readonly balance?: boolean; readonly t: number },
): TableLine {
  if (value === undefined) return null
  const dollars = tableDollars(value)
  if (dollars === 0 && how.balance !== true) return null
  const sign = how.sign === 'signed' ? (workingYearBottomLine(value) < 0 ? '−' : '') : how.sign
  return { value, dollars, approx: !(how.t === 0 && how.entered), sign }
}

function figureOf(spec: LineSpec, r: LedgerYearRow): TableLine {
  const entered = typeof spec.enteredInYear0 === 'function' ? spec.enteredInYear0(r) : spec.enteredInYear0 === true
  return tableFigure(spec.read(r), { sign: spec.sign, entered, ...(spec.balance === true ? { balance: true } : {}), t: r.t })
}

const accountName = (meta: TableMeta, a: SourceAccount): string =>
  slots.workbenchAccountOf(meta.people[a.ownerIndex]?.possessive ?? '', kindLabel(a.kind as AccountKind))

const listOf = (meta: TableMeta, accounts: readonly SourceAccount[]): string => accounts.map((a) => accountName(meta, a)).join(', ')

/** Every column this household's table could hold, in reading order: what comes in, what goes out, then savings. */
function columnSpecs(meta: TableMeta, rows: readonly LedgerYearRow[]): ColumnSpec[] {
  const specs: ColumnSpec[] = []
  meta.people.forEach((p, i) => {
    specs.push({
      id: `person-${i}`,
      group: 'in',
      header: p.label,
      lines: [
        { label: copy.workbenchLinePay, read: (r) => r.payByPerson[i], sign: '', enteredInYear0: true },
        { label: copy.workbenchLineOther, read: (r) => r.otherIncomeByPerson[i]?.gross, sign: '', enteredInYear0: true },
      ],
    })
  })
  specs.push({ id: 'social-security', group: 'in', header: copy.workbenchColSocialSecurity, lines: [{ label: '', read: (r) => r.socialSecurity, sign: '' }] })
  specs.push({
    id: 'spending',
    group: 'out',
    header: copy.workbenchColSpending,
    always: true,
    // Year 0's spending is the household's own figure on the full pass, and in a working year on either pass (the
    // engine prints W there, `simulate.ts`'s ledger row); the floor pass's essentials after work are the tool's.
    lines: [{ label: '', read: (r) => r.spending, sign: '', enteredInYear0: (r) => meta.track === 'full' || r.workingYear !== undefined }],
  })
  specs.push({ id: 'income-tax', group: 'out', header: copy.workbenchColIncomeTax, always: true, lines: [{ label: '', read: (r) => r.taxPaid, sign: '' }] })
  specs.push({
    id: 'pay-check',
    group: 'out',
    header: copy.workbenchColPayCheck,
    lines: [
      { label: copy.workbenchLinePayIncomeTax, read: (r) => r.workingYear?.taxOnOutsideIncome, sign: '' },
      { label: copy.workbenchLinePayroll, read: (r) => r.workingYear?.payrollTax, sign: '' },
    ],
  })
  specs.push({
    id: 'from-pay',
    group: 'out',
    header: copy.workbenchColFromPay,
    lines: [
      { label: copy.workbenchLineIntoSavings, read: (r) => r.workingYear?.ownDeposits, sign: '' },
      { label: copy.workbenchLineLeftOver, read: (r) => r.workingYear?.leftOver, sign: 'signed' },
      { label: copy.workbenchLineKeptInTaxable, read: (r) => r.leftOverCredit, sign: '' },
    ],
  })
  specs.push({
    id: 'health',
    group: 'out',
    header: copy.workbenchColHealth,
    lines: [
      { label: copy.workbenchLineMarketplace, read: (r) => r.premiums.acaNet, sign: '' },
      { label: copy.workbenchLineMedicare, read: (r) => r.premiums.medicare, sign: '' },
      { label: copy.workbenchLineMedicareExtras, read: (r) => r.premiums.medicareExtras, sign: '' },
    ],
  })
  specs.push({
    id: 'pretax-moves',
    group: 'savings',
    header: copy.workbenchColPretaxMoves,
    lines: [
      { label: copy.workbenchLinePutIn, read: (r) => r.contribution.pretax, sign: '+' },
      { label: copy.workbenchLineRequired, read: (r) => r.rmd, sign: '' },
      { label: copy.workbenchLineToRoth, read: (r) => r.conversion, sign: '' },
    ],
  })
  specs.push({
    id: 'taxable',
    group: 'savings',
    header: copy.workbenchSourceTaxable,
    always: meta.sources.taxable.length > 0,
    lines: [
      { label: copy.workbenchLinePutIn, read: (r) => r.contribution.taxable, sign: '+' },
      { label: copy.workbenchLineTakenOut, read: (r) => r.draw.taxable, sign: '−' },
      { label: copy.workbenchLineLeft, read: (r) => r.end.taxable, sign: '', balance: true },
    ],
  })
  const split = rows[0]?.pretaxEndByPerson !== undefined
  if (split) {
    meta.people.forEach((p, i) => {
      specs.push({
        id: `pretax-${i}`,
        group: 'savings',
        header: slots.workbenchSourcePretaxOf(p.mid),
        always: (meta.sources.pretaxByPerson[i]?.length ?? 0) > 0,
        lines: [
          { label: copy.workbenchLineTakenOut, read: (r) => r.pretaxDrawByPerson?.[i], sign: '−' },
          { label: copy.workbenchLineLeft, read: (r) => r.pretaxEndByPerson?.[i], sign: '', balance: true },
        ],
      })
    })
  } else {
    specs.push({
      id: 'pretax',
      group: 'savings',
      header: copy.workbenchSourcePretax,
      always: meta.sources.pretax.length > 0,
      lines: [
        { label: copy.workbenchLineTakenOut, read: (r) => r.draw.pretax, sign: '−' },
        { label: copy.workbenchLineLeft, read: (r) => r.end.pretax, sign: '', balance: true },
      ],
    })
  }
  specs.push({
    id: 'roth',
    group: 'savings',
    header: copy.workbenchSourceRoth,
    always: meta.sources.roth.length > 0,
    lines: [
      { label: copy.workbenchLinePutIn, read: (r) => r.contribution.roth, sign: '+' },
      { label: copy.workbenchLineTakenOut, read: (r) => r.draw.roth, sign: '−' },
      { label: copy.workbenchLineLeft, read: (r) => r.end.roth, sign: '', balance: true },
    ],
  })
  specs.push({
    id: 'hsa',
    group: 'savings',
    header: copy.workbenchSourceHsa,
    always: meta.sources.hsa.length > 0,
    lines: [
      { label: copy.workbenchLinePutIn, read: (r) => r.contribution.hsa, sign: '+' },
      { label: copy.workbenchLineSpent, read: (r) => r.hsaSpend, sign: '−' },
      { label: copy.workbenchLineLeft, read: (r) => r.end.hsa, sign: '', balance: true },
    ],
  })
  return specs
}

/** Keep a line that holds a figure in some year (a balance line stays whenever its column does). */
function keptLines(spec: ColumnSpec, rows: readonly LedgerYearRow[]): LineSpec[] {
  const moving = spec.lines.filter((l) => l.balance !== true && rows.some((r) => nonZero(l.read(r))))
  const balances = spec.lines.filter((l) => l.balance === true)
  const anyBalance = balances.some((l) => rows.some((r) => nonZero(l.read(r))))
  if (moving.length === 0 && !anyBalance && spec.always !== true) return []
  if (moving.length === 0 && balances.length === 0) return spec.always === true ? spec.lines.slice(0, 1) : []
  return spec.lines.filter((l) => moving.includes(l) || balances.includes(l))
}

/** Why a working year's left over, everyone alive, is credited nothing, by build 2's shown state for the answer's
 *  draft (exhaustive, insight 147). Only the two saved states carry a figure into the run; there a zero credit means
 *  this path's first working year has no left over, so the cap is that year's (nothing). */
const NOT_KEPT_NO_CREDIT: Readonly<Record<LeftOverShownState, (amount: string) => string>> = {
  'not-asked': slots.workbenchRowNotKeptUnsaid,
  absent: slots.workbenchRowNotKeptUnsaid,
  'waiting-on-w': slots.workbenchRowNotKeptWaiting,
  spent: slots.workbenchRowNotKeptNoCredit,
  'not-sure': slots.workbenchRowNotKeptNoCredit,
  saved: slots.workbenchRowNotKeptAboveFirstYear,
  'saved-moved': slots.workbenchRowNotKeptAboveFirstYear,
}

/** A row's sentences, in reading order. */
function rowNotes(meta: TableMeta, r: LedgerYearRow, prev: LedgerYearRow | undefined): string[] {
  const notes: string[] = []
  const twoPeople = meta.people.length === 2
  const aliveNow = r.alive.filter(Boolean).length
  const alivePrev = prev === undefined ? meta.people.length : prev.alive.filter(Boolean).length
  if (twoPeople && aliveNow === 1 && alivePrev === 2) {
    const s = r.alive.indexOf(true)
    const d = 1 - s
    const survivor = meta.people[s]!
    notes.push(slots.workbenchRowSurvivor(survivor.mid, survivor.you))
    if (r.rolledOver && (meta.sources.pretaxByPerson[d]?.length ?? 0) > 0) {
      notes.push(slots.workbenchRowRolledOver(meta.people[d]!.possessive, survivor.pronoun))
    }
  }
  if (nonZero(r.rmdToTaxable)) notes.push(slots.workbenchRowRmdMoved(formatTableDollars(r.rmdToTaxable)))
  if (nonZero(r.incomeNotKept)) {
    const amount = formatTableDollars(r.incomeNotKept)
    if (r.workingYear === undefined) notes.push(slots.workbenchRowNotKeptRetired(amount))
    else if (r.alive.some((a) => !a)) notes.push(slots.workbenchRowNotKeptAfterDeath(amount))
    // Part is credited, so the credit's cap binds (`workingYearCredit`, moneyGrain.ts): the smaller of the figure the
    // household said and the first working year's left over on this path. Both are whole dollars, so a credit equal
    // to the carried figure is that figure binding (a tie names it too: it is what they said).
    else if (nonZero(r.leftOverCredit)) {
      notes.push(
        r.leftOverCredit === meta.leftOverSaved
          ? slots.workbenchRowNotKeptAboveCap(amount)
          : slots.workbenchRowNotKeptAboveFirstYear(amount),
      )
    } else notes.push(NOT_KEPT_NO_CREDIT[meta.leftOverState](amount))
  }
  if (r.earlyPretaxDraw) notes.push(copy.workbenchRowEarlyDraw)
  if (r.ranOut) notes.push(copy.workbenchRowRanOut)
  return notes
}

/** A sentence that holds word for word in a run of years is said once, on the run's first year, with the run's last
 *  year ("The same each year through 2034."): nine identical lines under nine working years read as noise. A sentence
 *  whose figure moves is a new sentence, so it starts its own run. */
function collapseRuns(perRow: readonly (readonly string[])[], years: readonly number[]): string[][] {
  const out: string[][] = perRow.map(() => [])
  perRow.forEach((notes, k) => {
    for (const note of notes) {
      if (k > 0 && perRow[k - 1]!.includes(note)) continue
      let last = k
      while (last + 1 < perRow.length && perRow[last + 1]!.includes(note)) last++
      out[k]!.push(last > k ? slots.workbenchNoteThrough(note, years[last]!) : note)
    }
  })
  return out
}

/** What each savings column holds, named from the run's own grouping (R6, AE1). */
function sourceKey(meta: TableMeta, columns: readonly TableColumn[], rows: readonly LedgerYearRow[]): SourceKeyEntry[] {
  const accountsOr = (accounts: readonly SourceAccount[]): string =>
    accounts.length > 0 ? listOf(meta, accounts) : copy.workbenchSourceNoAccount
  const rolled = rows.find((r) => r.rolledOver)
  const entries: SourceKeyEntry[] = []
  for (const c of columns) {
    if (c.group !== 'savings' || c.id === 'pretax-moves') continue
    if (c.id === 'taxable') entries.push({ label: c.header, accounts: accountsOr(meta.sources.taxable) })
    else if (c.id === 'pretax') entries.push({ label: c.header, accounts: accountsOr(meta.sources.pretax) })
    else if (c.id === 'roth') entries.push({ label: c.header, accounts: accountsOr(meta.sources.roth) })
    else if (c.id === 'hsa') entries.push({ label: c.header, accounts: accountsOr(meta.sources.hsa) })
    else if (c.id.startsWith('pretax-')) {
      const i = Number(c.id.slice('pretax-'.length))
      const own = meta.sources.pretaxByPerson[i] ?? []
      const d = 1 - i
      const theirs = meta.sources.pretaxByPerson[d] ?? []
      // After a first death the survivor's ledger holds the deceased's pre-tax money too: name it, from its year.
      const inherits = rolled !== undefined && rolled.alive[i] === true && rolled.alive[d] === false && theirs.length > 0
      const base = own.length > 0 ? listOf(meta, own) : inherits ? '' : copy.workbenchSourceNoAccount
      const roll = inherits ? slots.workbenchRolledIn(meta.startCalendarYear + rolled.t, listOf(meta, theirs)) : ''
      entries.push({ label: c.header, accounts: [base, roll].filter((s) => s !== '').join('; ') })
    }
  }
  return entries
}

/** What the pay check's income tax line holds, by the W step's state reading (the money picture reads the same one,
 *  `WorkingYearLedger.tsx`'s tax line): the federal tax on what comes in outside savings, plus the state's where the
 *  run charges one (NC on all of it; PA on all but pay), and, where the W step asked the household to add its state's
 *  tax on pay to W (an unpriced state, or PA), where that tax sits instead. Exhaustive (insight 147). */
const PAY_CHECK_NOTES: Readonly<Record<WorkingYearStateTaxReading, readonly CopyKey[]>> = {
  'agi-derived': ['workbenchPayCheckNoteFederalState'],
  'class-based': ['workbenchPayCheckNoteFederalState', 'workbenchPayCheckStatePayInW'],
  none: ['workbenchPayCheckNoteFederal'],
  unpriced: ['workbenchPayCheckNoteFederal', 'workbenchPayCheckStateInW'],
}

/** The pay check's notes for a run's state reading: every table that shows the pay check's income tax carries them
 *  (the year table's, and Cash Flows' one-run and paired forms). */
export function payCheckNotes(reading: WorkingYearStateTaxReading): string[] {
  return PAY_CHECK_NOTES[reading].map((k) => copy[k])
}

/** The table for one future's rows. */
export function composeYearTable(input: {
  readonly rows: readonly LedgerYearRow[]
  readonly meta: TableMeta
  readonly view: TableView
  /** The rough view's last historical year (the rough window's end): row t = 30 opens the steady years. */
  readonly roughEndYear?: number
}): ComposedTable {
  const { rows, meta, view } = input
  const kept = columnSpecs(meta, rows)
    .map((spec) => ({ spec, lines: keptLines(spec, rows) }))
    .filter((c) => c.lines.length > 0)
  const columns: TableColumn[] = kept.map(({ spec, lines }) => ({
    id: spec.id,
    group: spec.group,
    header: spec.header,
    lineLabels: lines.length > 1 || lines[0]?.label !== '' ? lines.map((l) => l.label) : [],
  }))
  const notes = collapseRuns(
    rows.map((r, k) => rowNotes(meta, r, rows[k - 1])),
    rows.map((r) => meta.startCalendarYear + r.t),
  )
  const tableRows: TableRowView[] = rows.map((r, k) => ({
    t: r.t,
    year: meta.startCalendarYear + r.t,
    ages: meta.people.map((p, i) => (r.alive[i] === true ? p.currentAge + r.t : null)),
    cells: kept.map(({ lines }) => lines.map((l) => figureOf(l, r))),
    notes: notes[k]!,
    ...(view === 'rough' && r.t === ROUGH_WINDOW_YEARS && input.roughEndYear !== undefined
      ? { steadyFrom: slots.workbenchRoughSteadyFrom(input.roughEndYear) }
      : {}),
  }))
  const has = (id: string) => columns.some((c) => c.id === id)
  const anyPutIn = columns.some((c) => c.group === 'savings' && c.lineLabels.includes(copy.workbenchLinePutIn))
  const requiredShows = columns.some((c) => c.id === 'pretax-moves' && c.lineLabels.includes(copy.workbenchLineRequired))
  const footNotes = [
    copy.workbenchApproxNote,
    ...(anyPutIn ? [copy.workbenchMatchNote] : []),
    ...(has('pay-check') ? payCheckNotes(meta.stateTaxReading) : []),
    ...(requiredShows ? [copy.workbenchRequiredNote] : []),
    ...(rows.some((r) => r.spending === undefined) ? [copy.workbenchNoSpendingNote] : []),
  ]
  return { columns, rows: tableRows, notes: footNotes, sourceKey: sourceKey(meta, columns, rows), ageLabels: meta.people.map((p) => p.label) }
}

/** KTD32's stopgap: does a year the engine prices no yield in hold taxable money (entered, or built by the run)?
 *  The engine prices a person's working-year investment income (as the run carries it, `meta.investmentByPerson`)
 *  only in a year that person works, read here as a year they are paid; every other year is unpriced. Returns which
 *  line to show, or null. */
export function yieldLine(meta: TableMeta, rows: readonly LedgerYearRow[]): string | null {
  const priced = (r: LedgerYearRow) => r.payByPerson.some((p, i) => p > 0 && (meta.investmentByPerson[i] ?? 0) > 0)
  const holdsTaxable = (r: LedgerYearRow) => nonZero(r.start.taxable) || nonZero(r.end.taxable)
  if (!rows.some((r) => !priced(r) && holdsTaxable(r))) return null
  return meta.investmentByPerson.some((x) => x > 0) ? copy.workbenchYieldAfterWork : copy.workbenchYieldAllYears
}

/** The heading's lifespans sentence (KTD4: the first death at that person's own middle year, the survivor to the
 *  couple's middle last year). Both views share the lifespans. */
export function lifespansLine(people: readonly TablePerson[]): string {
  const [a, b] = people
  if (a === undefined) return ''
  if (b === undefined) return slots.workbenchLivesOne(a.mid, a.you, a.possessive, a.lastAge)
  // The survivor is the one alive longer (a tie goes to the first person, as the engine rules it).
  const firstDies = b.lastAge - b.currentAge < a.lastAge - a.currentAge ? b : a.lastAge - a.currentAge < b.lastAge - b.currentAge ? a : b
  const survivor = firstDies === a ? b : a
  return slots.workbenchLivesTwo(firstDies.mid, firstDies.you, firstDies.possessive, firstDies.lastAge, survivor.mid, survivor.lastAge)
}
