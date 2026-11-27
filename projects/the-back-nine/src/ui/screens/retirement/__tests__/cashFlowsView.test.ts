import { describe, expect, it } from 'vitest'
import { totalAcrossBuckets } from '@engine/sequencing'
import { ROUGH_WINDOW_YEARS } from '@engine/reference/roughSequence'
import type { LedgerYearRow } from '@shared/model'
import type { SourceAccount } from '@intake/intakeMap'
import { copy, slots } from '../../../copy'
import type { TableMeta, TablePerson } from '../../../workbench/tableRun'
import {
  cashFlowsCsv,
  cashFlowsView,
  headerRows,
  leavesOf,
  type AccountsTable,
  type CashFlowsInput,
  type CashFlowsView,
  type CfNode,
  type RunRows,
  type SummaryDrill,
} from '../cashFlowsView'

/**
 * Retirement → Cash Flows' composer (plan 6, RC6): RightCapital's grouped headers and drills over the year table's
 * laws. Every shown figure is ONE field of its run's row (each column's oracle typed here by hand, from the plan's
 * column list, never read back from the composer); no column B9 does not emit; Income tax is `taxPaid` alone and never
 * a drill; payroll tax its own column; the paired form puts your plan's figure over the what-if's each year, each row
 * named; the yield line rides only the run whose taxable ledger holds money; the CSV holds exactly the shown cells.
 */

const person = (label: string, currentAge: number, lastAge: number): TablePerson => ({
  label,
  mid: label,
  possessive: `${label}’s`,
  pronoun: `${label}’s`,
  you: false,
  currentAge,
  lastAge,
})

const acct = (index: number, kind: SourceAccount['kind'], ownerIndex: number): SourceAccount => ({ index, kind, ownerIndex, valueToday: 1 })

const META: TableMeta = {
  sources: {
    taxable: [acct(0, 'brokerage', 0)],
    roth: [acct(1, 'roth-ira', 0)],
    hsa: [acct(3, 'hsa', 1)],
    pretax: [acct(4, '401k', 0), acct(5, 'traditional-ira', 1)],
    pretaxByPerson: [[acct(4, '401k', 0)], [acct(5, 'traditional-ira', 1)]],
  },
  track: 'full',
  route: 'spine',
  startCalendarYear: 2026,
  people: [person('Sam', 60, 84), person('Alex', 58, 92)],
  investmentByPerson: [],
  stateTaxReading: 'agi-derived',
  statePriced: true,
  leftOverState: 'spent',
}

/** A row whose every money field holds its own distinct, non-zero, whole-dollar value (so a swap of any two shows). */
function distinctRow(t: number, over: Partial<LedgerYearRow> = {}): LedgerYearRow {
  let n = 1000 + t * 100
  const v = () => (n += 7)
  return {
    t,
    start: { taxable: v(), pretax: v(), roth: v(), hsa: v() },
    pretaxStartByPerson: [v(), v()],
    conversion: v(),
    rmd: v(),
    draw: { taxable: v(), pretax: v(), roth: v() },
    pretaxDrawByPerson: [v(), v()],
    hsaSpend: v(),
    rmdToTaxable: v(),
    contribution: { taxable: v(), pretax: v(), roth: v(), hsa: v() },
    leftOverCredit: v(),
    growthScale: 1.02,
    end: { taxable: v(), pretax: v(), roth: v(), hsa: v() },
    pretaxEndByPerson: [v(), v()],
    taxPaid: v(),
    premiums: { acaNet: v(), medicare: v(), irmaaSurcharge: v(), medicareExtras: v() },
    filing: 'mfj',
    alive: [true, true],
    rolledOver: false,
    workingYear: {
      pay: v(),
      socialSecurity: v(),
      otherIncome: v(),
      payrollTax: v(),
      taxOnOutsideIncome: v(),
      ownDeposits: v(),
      workingYearCost: v(),
      leftOver: v(),
      shortfall: 0,
    },
    earlyPretaxDraw: false,
    ranOut: false,
    payByPerson: [v(), v()],
    payTaxableByPerson: [v(), v()],
    otherIncomeByPerson: [
      { gross: v(), taxable: v() },
      { gross: v(), taxable: v() },
    ],
    socialSecurity: v(),
    spending: v(),
    incomeNotKept: v(),
    ...over,
  }
}

/** Each column's one field, typed by hand from the plan's column list (never read back from the composer). */
function oracle(r: LedgerYearRow): Record<string, number> {
  const wy = r.workingYear!
  return {
    'pay-0': r.payByPerson[0]!,
    'pay-1': r.payByPerson[1]!,
    'social-security': r.socialSecurity,
    'other-0': r.otherIncomeByPerson[0]!.gross,
    'other-1': r.otherIncomeByPerson[1]!.gross,
    'pay-taxed-0': r.payTaxableByPerson[0]!,
    'pay-taxed-1': r.payTaxableByPerson[1]!,
    'other-taxed-0': r.otherIncomeByPerson[0]!.taxable,
    'other-taxed-1': r.otherIncomeByPerson[1]!.taxable,
    'draw-taxable': r.draw.taxable,
    'draw-pretax': r.draw.pretax,
    'draw-pretax-0': r.pretaxDrawByPerson![0]!,
    'draw-pretax-1': r.pretaxDrawByPerson![1]!,
    'draw-roth': r.draw.roth,
    'hsa-spend': r.hsaSpend,
    rmd: r.rmd,
    'rmd-to-taxable': r.rmdToTaxable,
    spending: r.spending!,
    'aca-net': r.premiums.acaNet,
    medicare: r.premiums.medicare,
    irmaa: r.premiums.irmaaSurcharge,
    'medicare-extras': r.premiums.medicareExtras,
    'income-tax': r.taxPaid,
    'tax-on-pay': wy.taxOnOutsideIncome,
    payroll: wy.payrollTax,
    'put-in-taxable': r.contribution.taxable,
    'put-in-pretax': r.contribution.pretax,
    'put-in-roth': r.contribution.roth,
    'put-in-hsa': r.contribution.hsa,
    'into-savings': wy.ownDeposits,
    'left-over': wy.leftOver,
    'kept-in-taxable': r.leftOverCredit,
    conversion: r.conversion,
    'not-kept': r.incomeNotKept,
  }
}

/** The Accounts tables' oracles, by table. */
function accountsOracle(table: AccountsTable, r: LedgerYearRow): Record<string, number> {
  switch (table) {
    case 'end':
      return { taxable: r.end.taxable, 'pretax-0': r.pretaxEndByPerson![0]!, 'pretax-1': r.pretaxEndByPerson![1]!, roth: r.end.roth, hsa: r.end.hsa, total: totalAcrossBuckets(r.end) }
    case 'deposits':
      return { taxable: r.contribution.taxable, pretax: r.contribution.pretax, roth: r.contribution.roth, hsa: r.contribution.hsa }
    case 'withdrawals':
      return { taxable: r.draw.taxable, 'pretax-0': r.pretaxDrawByPerson![0]!, 'pretax-1': r.pretaxDrawByPerson![1]!, roth: r.draw.roth, hsa: r.hsaSpend }
    case 'rmd':
      return { rmd: r.rmd, 'rmd-to-taxable': r.rmdToTaxable }
    case 'conversions':
      return { conversion: r.conversion }
  }
}

const ROWS = [distinctRow(0), distinctRow(1)]
const ready = (rows: readonly LedgerYearRow[], meta: TableMeta = META, answerKey = 'headline:final:k1'): RunRows => ({ kind: 'ready', rows, meta, updating: false, answerKey })

const input = (over: Partial<CashFlowsInput> = {}): CashFlowsInput => ({
  tab: 'summary',
  drill: null,
  maps: { t: null, choice: 'flow' },
  readOnly: false,
  accounts: 'end',
  future: 'steady',
  pick: 'plan',
  offers: { working: null, kept: [], recommended: false, paired: null },
  plan: ready(ROWS),
  roughYears: { start: 1966, end: 1995, years: ROUGH_WINDOW_YEARS },
  wallCalendarYear: 2026,
  stateClause: copy.verdictStateUnpricedNote,
  ...over,
})

const tableOf = (v: CashFlowsView) => {
  if (v.body.kind !== 'table') throw new Error(`no table: ${JSON.stringify(v.body)}`)
  return v.body
}
const leafIds = (columns: readonly CfNode[]) => leavesOf(columns).map((l) => l.id)
const groupsOf = (columns: readonly CfNode[]): Extract<CfNode, { kind: 'group' }>[] =>
  columns.flatMap((c) => (c.kind === 'group' ? [c, ...groupsOf(c.columns)] : []))

/** Every printed figure is the field its column names, in every year. */
function expectOneFieldPerCell(v: CashFlowsView, want: (r: LedgerYearRow) => Record<string, number>, rows = ROWS): void {
  const t = tableOf(v)
  const ids = leafIds(t.columns).filter((id) => id !== 'year' && id !== 'age' && id !== 'short-year')
  rows.forEach((r, k) => {
    const o = want(r)
    for (const id of ids) {
      expect(Object.hasOwn(o, id), `${id}: a column B9 does not emit`).toBe(true)
      expect(t.rows[k]!.cells[id]!.value, `${id}, row ${k}`).toBe(o[id])
    }
  })
}

describe('cashFlowsView — Summary: every shown figure is one field of the row', () => {
  it('the top level: RightCapital’s bands and groups over one-field columns, each its own field', () => {
    const v = cashFlowsView(input())
    const t = tableOf(v)
    expect(leafIds(t.columns)).toEqual([
      'year', 'age',
      'pay-0', 'pay-1', 'social-security', 'other-0', 'other-1',
      'draw-taxable', 'draw-pretax', 'draw-roth', 'hsa-spend',
      'spending', 'income-tax', 'tax-on-pay', 'payroll', 'put-in-taxable', 'put-in-pretax', 'put-in-roth', 'put-in-hsa',
      'conversion', 'not-kept',
    ])
    expectOneFieldPerCell(v, oracle)
    expect(t.columns.slice(2).map((c) => c.header)).toEqual([copy.cashFlowsBandIn, copy.cashFlowsBandOut, copy.cashFlowsBandOwn])
  })

  it('each drill shows every field its group holds, and its breadcrumb names it', () => {
    const want: Record<SummaryDrill, string[]> = {
      income: ['pay-0', 'pay-1', 'social-security', 'other-0', 'other-1', 'pay-taxed-0', 'pay-taxed-1', 'other-taxed-0', 'other-taxed-1'],
      distribution: ['draw-taxable', 'draw-pretax', 'draw-pretax-0', 'draw-pretax-1', 'draw-roth', 'hsa-spend', 'rmd', 'rmd-to-taxable'],
      expenses: ['spending', 'aca-net', 'medicare', 'irmaa', 'medicare-extras'],
      saving: ['put-in-taxable', 'put-in-pretax', 'put-in-roth', 'put-in-hsa', 'into-savings', 'left-over', 'kept-in-taxable'],
    }
    const label: Record<SummaryDrill, string> = {
      income: copy.cashFlowsGroupIncome,
      distribution: copy.cashFlowsGroupDistribution,
      expenses: copy.cashFlowsGroupExpenses,
      saving: copy.cashFlowsGroupSaving,
    }
    for (const drill of Object.keys(want) as SummaryDrill[]) {
      const v = cashFlowsView(input({ drill }))
      expect(leafIds(tableOf(v).columns), drill).toEqual(['year', 'age', ...want[drill]])
      expectOneFieldPerCell(v, oracle)
      expect(v.breadcrumb).toEqual([
        { label: copy.cashFlowsTabSummary, drill: null },
        { label: label[drill], drill },
      ])
      // Inside a drill nothing drills again; the group is the table's one band.
      expect(groupsOf(tableOf(v).columns).map((g) => [g.header, g.drill])).toEqual([[label[drill], undefined]])
    }
  })

  it('the top’s drillable headers are the four groups that hold more than they show; back out, the breadcrumb is one crumb', () => {
    const v = cashFlowsView(input())
    expect(groupsOf(tableOf(v).columns).flatMap((g) => (g.drill !== undefined ? [g.drill] : []))).toEqual(['income', 'distribution', 'expenses', 'saving'])
    expect(v.breadcrumb).toEqual([{ label: copy.cashFlowsTabSummary, drill: null }])
  })

  it('Income tax is `taxPaid` alone, headed "Income tax", and never a drill; payroll tax is its own column, never in it', () => {
    const t = tableOf(cashFlowsView(input()))
    const income = leavesOf(t.columns).find((l) => l.id === 'income-tax')!
    expect(income.header).toBe(copy.workbenchColIncomeTax)
    // It sits straight under its band, no group of its own, so no header over it can drill.
    const band = t.columns.find((c) => c.kind === 'group' && c.id === 'out') as Extract<CfNode, { kind: 'group' }>
    expect(band.columns.some((c) => c.kind === 'leaf' && c.id === 'income-tax')).toBe(true)
    ROWS.forEach((r, k) => {
      expect(t.rows[k]!.cells['income-tax']!.value).toBe(r.taxPaid)
      expect(t.rows[k]!.cells['payroll']!.value).toBe(r.workingYear!.payrollTax)
      expect(r.taxPaid, '[test setup] the two figures differ').not.toBe(r.workingYear!.payrollTax)
    })
  })

  it('no column B9 does not emit: no total, no goals, no other inflows, no federal/state split', () => {
    const headers = (columns: readonly CfNode[]): string[] => columns.flatMap((c) => [c.header, ...(c.kind === 'group' ? headers(c.columns) : [])])
    for (const drill of [null, 'income', 'distribution', 'expenses', 'saving'] as const) {
      const all = headers(tableOf(cashFlowsView(input({ drill }))).columns).join(' | ')
      expect(all).not.toMatch(/Total|Goals|Other inflows|Federal|State|FICA|Net flows/i)
    }
  })

  it('a column with nothing in any year is left out, never zero-filled; spending and income tax always stand', () => {
    const quiet = ROWS.map((r) =>
      distinctRow(r.t, {
        payByPerson: [0, 0],
        payTaxableByPerson: [0, 0],
        workingYear: undefined,
        leftOverCredit: 0,
        contribution: { taxable: 0, pretax: 0, roth: 0, hsa: 0 },
        conversion: 0,
        incomeNotKept: 0,
        spending: 0,
        taxPaid: 0,
      }),
    )
    const t = tableOf(cashFlowsView(input({ plan: ready(quiet) })))
    const ids = leafIds(t.columns)
    for (const gone of ['pay-0', 'pay-1', 'tax-on-pay', 'payroll', 'put-in-taxable', 'conversion', 'not-kept']) expect(ids).not.toContain(gone)
    expect(ids).toContain('spending')
    expect(ids).toContain('income-tax')
    expect(t.rows[0]!.cells['spending']!.text).toBe('')
    // A group whose top fields are all empty, gone with them: Planned saving has nothing put in and no from-pay lines.
    expect(groupsOf(t.columns).map((g) => g.id)).not.toContain('saving')
  })

  it('a short year prints its word, not a figure; the column is there only when a year runs short', () => {
    const short = [distinctRow(0), distinctRow(1, { ranOut: true })]
    const t = tableOf(cashFlowsView(input({ plan: ready(short) })))
    expect(t.rows.map((r) => r.cells['short-year']!.text)).toEqual(['', copy.cashFlowsShortYear])
    expect(leafIds(tableOf(cashFlowsView(input())).columns)).not.toContain('short-year')
  })

  it('the figures print on the table’s grain with "~", the direction in each header’s words; a short left over in parentheses; year 0’s entered figures exact; Age is both ages', () => {
    const t = tableOf(cashFlowsView(input()))
    const r0 = ROWS[0]!
    expect(t.rows[0]!.cells['pay-0']!.text).toBe(r0.payByPerson[0]!.toLocaleString('en-US'))
    expect(t.rows[1]!.cells['pay-0']!.text).toBe(`~${ROWS[1]!.payByPerson[0]!.toLocaleString('en-US')}`)
    expect(t.rows[0]!.cells['draw-taxable']!.text).toBe(`~${r0.draw.taxable.toLocaleString('en-US')}`)
    expect(leavesOf(t.columns).find((l) => l.id === 'draw-taxable')!.header).toBe(slots.workbenchPairTakenFrom(copy.workbenchSourceTaxable))
    expect(t.rows[0]!.cells['put-in-roth']!.text).toBe(`~${r0.contribution.roth.toLocaleString('en-US')}`)
    const short = distinctRow(1, { workingYear: { ...ROWS[1]!.workingYear!, leftOver: -1234 } })
    const drilled = tableOf(cashFlowsView(input({ plan: ready([ROWS[0]!, short]), drill: 'saving' })))
    expect(drilled.rows[1]!.cells['left-over']).toEqual({ text: '(~1,234)', value: -1234 })
    expect(t.rows.map((r) => r.cells['year']!.text)).toEqual(['2026', '2027'])
    expect(t.rows.map((r) => r.cells['age']!.text)).toEqual(['60/58', '61/59'])
  })

  it('a drill this run cannot make reads the Summary', () => {
    const noExtras = ROWS.map((r) => distinctRow(r.t, { premiums: { acaNet: 0, medicare: 0, irmaaSurcharge: 0, medicareExtras: 0 } }))
    const v = cashFlowsView(input({ plan: ready(noExtras), drill: 'expenses' }))
    expect(v.breadcrumb).toEqual([{ label: copy.cashFlowsTabSummary, drill: null }])
    expect(leafIds(tableOf(v).columns)).toContain('income-tax')
  })
})

describe('cashFlowsView — Accounts', () => {
  it('each table switcher’s table: a column per bucket (pre-tax per person), each one field; the ending Total is the engine’s own sum, said so', () => {
    for (const table of ['end', 'deposits', 'withdrawals', 'rmd', 'conversions'] as const) {
      const v = cashFlowsView(input({ tab: 'accounts', accounts: table }))
      expect(v.accountsSelect?.value).toBe(table)
      expect(v.breadcrumb).toBeNull()
      expect(leafIds(tableOf(v).columns).slice(2), table).toEqual(Object.keys(accountsOracle(table, ROWS[0]!)))
      expectOneFieldPerCell(v, (r) => accountsOracle(table, r))
      expect(v.footnotes.includes(copy.cashFlowsEndTotalNote), table).toBe(table === 'end')
    }
  })
})

describe('cashFlowsView — the plan select and the paired form', () => {
  const whatIfRows = [distinctRow(0, { taxPaid: 1 }), distinctRow(1, { taxPaid: 2 })]
  const offers = { working: copy.probabilityPickNew, kept: [{ id: 'k1', name: 'Work to 63' }], recommended: true, paired: copy.probabilityPickNew }

  it('offers your plan, the working what-if, each kept what-if, Recommended and your plan beside the what-if; a pick no longer offered reads your plan', () => {
    const v = cashFlowsView(input({ offers, pick: 'kept:gone' }))
    expect(v.planSelect.items.map((i) => i.label)).toEqual([copy.workbenchRailPlanLabel, copy.probabilityPickNew, 'Work to 63', copy.probabilityPickRecommended, copy.cashFlowsPickPaired])
    expect(v.planSelect.value).toBe('plan')
    const none = cashFlowsView(input())
    expect(none.planSelect.items.map((i) => i.value)).toEqual(['plan'])
  })

  it('a picked run shows its own rows, its yield line named for it', () => {
    const v = cashFlowsView(input({ offers, pick: 'kept:k1', other: ready(whatIfRows), otherName: 'Work to 63' }))
    expect(tableOf(v).rows.map((r) => r.cells['income-tax']!.value)).toEqual([1, 2])
  })

  it('the paired view puts your plan’s figure over the what-if’s in every year, each row named, the year spanning both', () => {
    const v = cashFlowsView(input({ offers, pick: 'paired', other: ready(whatIfRows), otherName: 'Work to 63', pairedColumns: ['spending', 'income-tax', 'end-total'] }))
    const t = tableOf(v)
    expect(t.paired).toBe(true)
    // Both runs have working years, so the pay check's two taxes ride the pair (the milestone-1 review's c8).
    expect(leafIds(t.columns)).toEqual(['year', 'run', 'spending', 'income-tax', 'tax-on-pay', 'payroll', 'end-total'])
    expect(leavesOf(t.columns)[0]!.spanGroup).toBe(true)
    expect(leavesOf(t.columns)[1]!.rowHeader).toBe(true)
    expect(t.rows.map((r) => [r.group, r.cells['run']!.text, r.cells['income-tax']!.value])).toEqual([
      ['2026', copy.workbenchRailPlanLabel, ROWS[0]!.taxPaid],
      ['2026', 'Work to 63', 1],
      ['2027', copy.workbenchRailPlanLabel, ROWS[1]!.taxPaid],
      ['2027', 'Work to 63', 2],
    ])
    // No drills, no table switcher inside the paired view.
    expect(groupsOf(t.columns)).toEqual([])
  })

  it('the paired view pairs only on one answer: until both runs are on it, it waits in words', () => {
    const v = cashFlowsView(input({ offers, pick: 'paired', other: ready(whatIfRows, META, 'headline:final:k0'), otherName: 'x' }))
    expect(v.body).toEqual({ kind: 'state', tone: 'status', words: copy.workbenchTableLoading })
  })

  it('the yield line shows under the run that holds taxable money only, named for that run', () => {
    // No pay in either run, so no year's yield is priced: a run holding taxable money gets the line, one holding none does not.
    const noPay = (r: LedgerYearRow) => ({ ...r, payByPerson: [0, 0] })
    const holds = ROWS.map(noPay)
    const empty = whatIfRows.map((r) => noPay({ ...r, start: { ...r.start, taxable: 0 }, end: { ...r.end, taxable: 0 } }))
    const v = cashFlowsView(input({ offers, pick: 'paired', plan: ready(holds), other: ready(empty), otherName: 'Work to 63', pairedColumns: ['income-tax', 'end-total'] }))
    const yields = v.stopgaps.filter((s) => s.includes(copy.workbenchYieldAllYears))
    expect(yields).toEqual([slots.workbenchPairYield(copy.workbenchRailPlanLabel, copy.workbenchYieldAllYears)])
  })
})

describe('cashFlowsView — the CSV holds exactly the shown cells', () => {
  /** A CSV line's fields, quotes undone. */
  const parse = (line: string): string[] => {
    const out: string[] = []
    let cur = ''
    let q = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]!
      if (q) {
        if (ch === '"' && line[i + 1] === '"') {
          cur += '"'
          i++
        } else if (ch === '"') q = false
        else cur += ch
      } else if (ch === '"') q = true
      else if (ch === ',') {
        out.push(cur)
        cur = ''
      } else cur += ch
    }
    out.push(cur)
    return out
  }

  it('header rows as drawn (no-break spaces made plain), then every row’s cell words in column order, nothing else', () => {
    for (const over of [{}, { drill: 'income' as const }, { tab: 'accounts' as const, accounts: 'withdrawals' as const }]) {
      const v = cashFlowsView(input(over))
      const t = tableOf(v)
      const lines = v.csv!.split('\r\n').map(parse)
      const leaves = leavesOf(t.columns)
      const heads = headerRows(t.columns)
      expect(lines.slice(0, heads.length)).toEqual(heads.map((cells) => cells.map((c) => c.replace(/\u00a0/g, ' '))))
      expect(heads.at(-1)).toEqual(leaves.map((l) => l.header))
      expect(lines.slice(heads.length)).toEqual(t.rows.map((r) => leaves.map((l) => r.cells[l.id]!.text)))
      for (const line of lines) expect(line).toHaveLength(leaves.length)
    }
  })

  it('a group’s words sit over its first column; a leaf under a shallower group has blanks between', () => {
    const columns: CfNode[] = [
      { kind: 'leaf', id: 'y', header: 'Year', numeric: false },
      { kind: 'group', id: 'b', header: 'Band', columns: [{ kind: 'group', id: 'g', header: 'Group', columns: [{ kind: 'leaf', id: 'a', header: 'A', numeric: true }, { kind: 'leaf', id: 'c', header: 'C, "quoted"', numeric: true }] }, { kind: 'leaf', id: 'd', header: 'D', numeric: true }] },
    ]
    expect(headerRows(columns)).toEqual([
      ['', 'Band', '', ''],
      ['', 'Group', '', ''],
      ['Year', 'A', 'C, "quoted"', 'D'],
    ])
    expect(cashFlowsCsv(columns, []).split('\r\n')[2]).toBe('Year,A,"C, ""quoted""",D')
  })
})

describe('cashFlowsView — the sentences around the table', () => {
  it('which future, the lifespans, whose age is which; the state clause, the missing kinds and the surtax; each year’s notes', () => {
    const rough = cashFlowsView(input({ future: 'rough', plan: ready([distinctRow(0), distinctRow(1, { ranOut: true })]) }))
    expect(rough.lines[0]).toBe(slots.workbenchRoughWhat(1966, 1995, ROUGH_WINDOW_YEARS))
    expect(rough.lines).toContain(slots.cashFlowsAgesKey(['Sam', 'Alex']))
    expect(rough.stopgaps).toEqual(expect.arrayContaining([copy.verdictStateUnpricedNote, copy.workbenchKindsMissing, copy.recDiscNiit]))
    expect(rough.yearNotes).toContain(slots.cashFlowsYearNote(2027, copy.workbenchRowRanOut))
    expect(cashFlowsView(input()).lines[0]).toBe(copy.workbenchSteadyWhat)
  })

  it('loading, error and withheld say so in words, with no table and no CSV', () => {
    expect(cashFlowsView(input({ plan: { kind: 'loading' } })).body).toEqual({ kind: 'state', tone: 'status', words: copy.workbenchTableLoading })
    expect(cashFlowsView(input({ plan: { kind: 'error' } })).body).toEqual({ kind: 'state', tone: 'alert', words: copy.workbenchTableError })
    const held = cashFlowsView(input({ plan: { kind: 'withheld', words: copy.workbenchWithheldNoRun } }))
    expect(held.body).toEqual({ kind: 'state', tone: 'status', words: copy.workbenchWithheldNoRun })
    expect(held.csv).toBeNull()
  })

  it('rows from before the latest change stay, marked busy and in words, and no CSV saves them (the file carries no "Updating" line)', () => {
    const busy = (rows: readonly LedgerYearRow[]) => ({ ...(ready(rows) as Extract<RunRows, { kind: 'ready' }>), updating: true })
    const v = cashFlowsView(input({ plan: busy(ROWS) }))
    expect(tableOf(v).busy).toBe(true)
    expect(v.updating).toBe(copy.workbenchTableUpdating)
    expect(v.csv).toBeNull()
    // The paired table busy on either run: no CSV either; settled, the CSV is back.
    const offers = { working: null, kept: [], recommended: false, paired: 'Work to 63' }
    const pairedBusy = cashFlowsView(input({ offers, pick: 'paired', other: busy(ROWS), otherName: 'Work to 63' }))
    expect(tableOf(pairedBusy).busy).toBe(true)
    expect(pairedBusy.csv).toBeNull()
    expect(cashFlowsView(input({ offers, pick: 'paired', other: ready(ROWS), otherName: 'Work to 63' })).csv).not.toBeNull()
  })

  it('the steady sentence over a what-if’s table says the pinned answer reads your plan, not this run', () => {
    const offers = { working: null, kept: [{ id: 'k1', name: 'Work to 63' }], recommended: false, paired: null }
    expect(cashFlowsView(input({ offers, pick: 'kept:k1', other: ready(ROWS), otherName: 'Work to 63' })).lines[0]).toBe(copy.cashFlowsSteadyWhatOther)
    expect(cashFlowsView(input()).lines[0]).toBe(copy.workbenchSteadyWhat)
  })
})

describe('cashFlowsView — whose stop year the rows run at (the milestone-1 review, c7)', () => {
  const dated: TableMeta = { ...META, route: 'dated', stopYear: 2031, stopFrom: 'answer' }
  const lever = (year: number, route: TableMeta['route'] = 'dated'): TableMeta => ({ ...META, route, stopYear: year, stopFrom: 'lever' })
  const offers = { working: null, kept: [{ id: 'k1', name: 'Work to 63' }], recommended: false, paired: 'Work to 63' }

  it('your plan’s table names the answer’s date (or the window’s last year); a what-if’s stop-year lever names its own year, never the answer’s date', () => {
    expect(cashFlowsView(input({ plan: ready(ROWS, dated) })).lines).toContain(slots.workbenchStopsIn(2031))
    expect(cashFlowsView(input({ plan: ready(ROWS, { ...META, route: 'no-date', stopYear: 2041, stopFrom: 'answer' }) })).lines).toContain(slots.workbenchNoDate(2041))
    for (const route of ['dated', 'no-date'] as const) {
      // The plan's rows still loading: the what-if's line reads its own meta, never the plan's.
      const v = cashFlowsView(input({ offers, pick: 'kept:k1', plan: { kind: 'loading' }, other: ready(ROWS, lever(2033, route)), otherName: 'Work to 63' }))
      expect(v.lines, route).toContain(slots.cashFlowsRunStopsLever('Work to 63', 2033))
      expect(v.lines).not.toContain(slots.workbenchStopsIn(2033))
      expect(v.lines).not.toContain(slots.workbenchNoDate(2033))
    }
  })

  it('the paired view: one line where both runs stop in the same year; each run’s, named, where they differ', () => {
    const same = cashFlowsView(input({ offers, pick: 'paired', plan: ready(ROWS, dated), other: ready(ROWS, dated), otherName: 'Work to 63' }))
    expect(same.lines).toContain(slots.workbenchStopsIn(2031))
    const differ = cashFlowsView(input({ offers, pick: 'paired', plan: ready(ROWS, dated), other: ready(ROWS, lever(2033)), otherName: 'Work to 63' }))
    expect(differ.lines).toEqual(
      expect.arrayContaining([slots.cashFlowsRunStopsDated(copy.workbenchRailPlanLabel, 2031), slots.cashFlowsRunStopsLever('Work to 63', 2033)]),
    )
    expect(differ.lines).not.toContain(slots.workbenchStopsIn(2031))
  })
})

describe('cashFlowsView — the paired view keeps the pay check’s taxes (the milestone-1 review, c8)', () => {
  const offers = { working: null, kept: [], recommended: false, paired: 'Work to 63' }
  const retired = (rows: readonly LedgerYearRow[]) => rows.map(({ workingYear: _gone, ...r }) => r as LedgerYearRow)

  it('where either run has a working year, the pay check’s income tax and payroll tax are their own columns, each its field, with the pay check’s notes', () => {
    // Your plan retired, the what-if still working: the working run's taxes show.
    const v = cashFlowsView(input({ offers, pick: 'paired', plan: ready(retired(ROWS)), other: ready(ROWS), otherName: 'Work to 63', pairedColumns: ['pay-0', 'income-tax', 'end-total'] }))
    const t = tableOf(v)
    expect(leafIds(t.columns)).toEqual(['year', 'run', 'pay-0', 'income-tax', 'tax-on-pay', 'payroll', 'end-total'])
    const whatIf = t.rows.filter((r) => r.cells['run']!.text === 'Work to 63')
    whatIf.forEach((r, k) => {
      expect(r.cells['tax-on-pay']!.value).toBe(ROWS[k]!.workingYear!.taxOnOutsideIncome)
      expect(r.cells['payroll']!.value).toBe(ROWS[k]!.workingYear!.payrollTax)
    })
    expect(leavesOf(t.columns).find((l) => l.id === 'tax-on-pay')!.header).toBe(copy.cashFlowsColPayIncomeTax)
    // The page's header keeps its words together with no-break spaces; the file carries plain spaces.
    expect(copy.cashFlowsColPayIncomeTax).toContain('\u00a0')
    expect(v.csv!.split('\r\n')[0]).toContain(copy.cashFlowsColPayIncomeTax.replace(/\u00a0/g, ' '))
    expect(v.csv).not.toContain('\u00a0')
    expect(v.footnotes).toEqual(expect.arrayContaining([copy.workbenchPayCheckNoteFederalState]))
  })

  it('the paired notes ride beside their columns too: the match with a put-in, Required (with no "the row says so": paired rows carry no such sentence), the no-spending note with a blank working year', () => {
    const blank = ROWS.map((r, k) => (k === 0 ? ({ ...r, spending: undefined } as LedgerYearRow) : r))
    const v = cashFlowsView(input({ offers, pick: 'paired', plan: ready(retired(ROWS)), other: ready(retired(blank)), otherName: 'Work to 63', pairedColumns: ['spending', 'put-in-pretax', 'required', 'income-tax', 'end-total'] }))
    expect(leafIds(tableOf(v).columns)).toEqual(expect.arrayContaining(['spending', 'put-in-pretax', 'required']))
    expect(v.footnotes).toEqual([copy.workbenchApproxNote, copy.workbenchMatchNote, copy.workbenchRequiredPairedNote, copy.workbenchNoSpendingNote, copy.cashFlowsPairedNote])
    expect(v.footnotes).not.toContain(copy.workbenchRequiredNote)
    // Every spending figure given: no blank-year note.
    const given = cashFlowsView(input({ offers, pick: 'paired', plan: ready(retired(ROWS)), other: ready(retired(ROWS)), otherName: 'Work to 63', pairedColumns: ['spending', 'income-tax', 'end-total'] }))
    expect(given.footnotes).toEqual([copy.workbenchApproxNote, copy.cashFlowsPairedNote])
  })

  it('a pair that owes payroll tax and no income tax on pay (an unpriced state) keeps the pay check’s notes beside the payroll column alone (milestone 4’s review, M2)', () => {
    // `dateshort` at a lifestyle offset of 1 to 3 years: both runs work, the tax on pay is $0 every year, so the
    // paired table drops that column (empty on both runs) and keeps payroll tax. Its notes still ride, as under one
    // run's table (`singleFootnotes`) and on Maps.
    const payrollOnly = ROWS.map((r) => ({ ...r, workingYear: { ...r.workingYear!, taxOnOutsideIncome: 0 } }))
    const unpriced = ready(payrollOnly, { ...META, stateTaxReading: 'unpriced', statePriced: false })
    const v = cashFlowsView(input({ offers, pick: 'paired', plan: unpriced, other: unpriced, otherName: 'Work to 63' }))
    const ids = leafIds(tableOf(v).columns)
    expect(ids).toContain('payroll')
    expect(ids).not.toContain('tax-on-pay')
    expect(v.footnotes).toEqual(expect.arrayContaining([copy.workbenchPayCheckNoteFederal, copy.workbenchPayCheckStateInW]))
  })

  it('two retired runs: no pay check columns and no pay check notes', () => {
    const v = cashFlowsView(input({ offers, pick: 'paired', plan: ready(retired(ROWS)), other: ready(retired(ROWS)), otherName: 'Work to 63' }))
    expect(leafIds(tableOf(v).columns)).toEqual(['year', 'run', 'income-tax', 'end-total'])
    expect(v.footnotes).toEqual([copy.workbenchApproxNote, copy.cashFlowsPairedNote])
  })
})

describe('cashFlowsView — the file’s name, the paired title and the notes beside the shown columns', () => {
  const offers = { working: copy.probabilityPickNew, kept: [{ id: 'k1', name: 'Work to 63 (Sam’s idea)' }], recommended: true, paired: 'Work to 63 (Sam’s idea)' }

  it('the CSV’s name carries the table, the run (the plan select’s own label) and the future', () => {
    expect(cashFlowsView(input()).csvName).toBe('cash-flows-summary-your-plan-steady.csv')
    expect(cashFlowsView(input({ offers, pick: 'kept:k1', other: ready(ROWS), otherName: 'Work to 63 (Sam’s idea)' })).csvName).toBe('cash-flows-summary-work-to-63-sam-s-idea-steady.csv')
    expect(cashFlowsView(input({ offers, pick: 'recommended', other: ready(ROWS), future: 'rough', tab: 'accounts', accounts: 'withdrawals' })).csvName).toBe(
      'cash-flows-withdrawals-recommended-rough.csv',
    )
    expect(cashFlowsView(input({ offers, pick: 'new', other: ready(ROWS), drill: 'expenses' })).csvName).toBe('cash-flows-expenses-new-what-if-steady.csv')
    expect(cashFlowsView(input({ offers, pick: 'paired', other: ready(ROWS), otherName: 'Work to 63 (Sam’s idea)' })).csvName).toBe(
      'cash-flows-paired-your-plan-and-work-to-63-sam-s-idea-steady.csv',
    )
  })

  it('the paired view’s title names it on either tab (it has no Accounts tables), never an empty heading', () => {
    for (const tab of ['summary', 'accounts'] as const) {
      const v = cashFlowsView(input({ offers, tab, pick: 'paired', other: ready(ROWS), otherName: 'x' }))
      expect(v.breadcrumb, tab).toEqual([{ label: copy.cashFlowsPickPaired, drill: null }])
      expect(v.accountsSelect).toBeNull()
    }
  })

  it('each note rides only beside the column it explains: the pay check’s with its column, Required with its own, the match with a put-in', () => {
    const top = cashFlowsView(input())
    expect(top.footnotes).toEqual(expect.arrayContaining([copy.workbenchPayCheckNoteFederalState, copy.workbenchMatchNote]))
    expect(top.footnotes, 'Required is a drill column at the top').not.toContain(copy.workbenchRequiredNote)
    expect(cashFlowsView(input({ drill: 'distribution' })).footnotes).toContain(copy.workbenchRequiredNote)
    const conversions = cashFlowsView(input({ tab: 'accounts', accounts: 'conversions' }))
    expect(conversions.footnotes).toEqual([copy.workbenchApproxNote])
    expect(cashFlowsView(input({ tab: 'accounts', accounts: 'deposits' })).footnotes).toContain(copy.workbenchMatchNote)
  })
})
