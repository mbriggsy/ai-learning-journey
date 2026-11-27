import { describe, expect, it } from 'vitest'
import { composeYearTable, formatTableDollars, lifespansLine, yieldLine, type ComposedTable } from '../yearTableChrome'
import { tableRunFor, type TableMeta, type TablePerson } from '../tableRun'
import { simulate } from '@engine/simulate'
import { DATE_OFFSET_WINDOW_TOP } from '@engine/dateSearch'
import { DEV_SEEDS } from '../../devSeeds'
import { copy, slots } from '../../copy'
import type { LedgerYearRow } from '@shared/model'
import type { ModelAnswer } from '@store/memoryModel'
import type { SourceAccount } from '@intake/intakeMap'

/**
 * The year-by-year table's composer (workbench plan U7): every figure is ONE field of the engine's row, read on the
 * table's one grain; nothing is added, netted or re-derived (R5); a flagged year says why in words (R13); and each
 * savings column names the accounts the run grouped into it (R6, AE1).
 */

const person = (label: string, currentAge: number, lastAge: number, you = false): TablePerson => ({
  label,
  mid: you ? 'you' : label,
  possessive: you ? 'your' : `${label}’s`,
  pronoun: you ? 'yours' : `${label}’s`,
  you,
  currentAge,
  lastAge,
})

const acct = (index: number, kind: SourceAccount['kind'], ownerIndex: number, valueToday: number): SourceAccount => ({
  index,
  kind,
  ownerIndex,
  valueToday,
})

const META: TableMeta = {
  sources: {
    taxable: [acct(0, 'brokerage', 0, 200_000)],
    roth: [acct(1, 'roth-ira', 0, 50_000), acct(2, 'roth-ira', 1, 70_000)],
    hsa: [acct(3, 'hsa', 1, 20_000)],
    pretax: [acct(4, '401k', 0, 400_000), acct(5, 'traditional-ira', 1, 300_000)],
    pretaxByPerson: [[acct(4, '401k', 0, 400_000)], [acct(5, 'traditional-ira', 1, 300_000)]],
    inherited: [],
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
    rmdToTaxable: 0,
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
    incomeNotKept: 0,
    ...over,
  }
}

/** Each column's box, line by line, as the field each line must be (the oracle is typed here by hand, from the
 *  plan's column list, never read back from the composer). */
function expectedLines(r: LedgerYearRow): Record<string, readonly number[]> {
  const wy = r.workingYear!
  return {
    'person-0': [r.payByPerson[0]!, r.otherIncomeByPerson[0]!.gross],
    'person-1': [r.payByPerson[1]!, r.otherIncomeByPerson[1]!.gross],
    'social-security': [r.socialSecurity],
    spending: [r.spending!],
    'income-tax': [r.taxPaid],
    'pay-check': [wy.taxOnOutsideIncome, wy.payrollTax],
    'from-pay': [wy.ownDeposits, wy.leftOver, r.leftOverCredit],
    health: [r.premiums.acaNet, r.premiums.medicare, r.premiums.medicareExtras],
    'pretax-moves': [r.contribution.pretax, r.rmd, r.conversion],
    taxable: [r.contribution.taxable, r.draw.taxable, r.end.taxable],
    'pretax-0': [r.pretaxDrawByPerson![0]!, r.pretaxEndByPerson![0]!],
    'pretax-1': [r.pretaxDrawByPerson![1]!, r.pretaxEndByPerson![1]!],
    roth: [r.contribution.roth, r.draw.roth, r.end.roth],
    hsa: [r.contribution.hsa, r.hsaSpend, r.end.hsa],
  }
}

/** Every number a row carries, at any depth. */
function leaves(x: unknown, out: Set<number> = new Set()): Set<number> {
  if (typeof x === 'number') out.add(x)
  else if (Array.isArray(x)) x.forEach((y) => leaves(y, out))
  else if (x !== null && typeof x === 'object') Object.values(x).forEach((y) => leaves(y, out))
  return out
}

const figuresOf = (table: ComposedTable) => table.rows.flatMap((r) => r.cells.flat()).filter((f) => f !== null)

describe('composeYearTable — every figure is one field of the row (R5)', () => {
  const rows = [distinctRow(0), distinctRow(1)]
  const table = composeYearTable({ rows, meta: META, view: 'steady' })

  it('each column’s box holds exactly its own named fields, line by line (a swap of two columns or two people reds it)', () => {
    rows.forEach((r, k) => {
      const want = expectedLines(r)
      expect(table.columns.map((c) => c.id)).toEqual(Object.keys(want))
      table.columns.forEach((c, i) => {
        expect(table.rows[k]!.cells[i]!.map((f) => f?.value), `${c.id}, row ${k}`).toEqual(want[c.id])
      })
    })
  })

  it('each column’s header is the one the reader sees over those fields: a swap of the two people’s headers reds it', () => {
    // The oracle is typed by hand (the U7 review's T6): the values above are tied to a column id, and the id is tied
    // to the words over it here, so Sam’s pay can never print under "Alex" with every value test still green.
    const headers: Record<string, string> = {
      'person-0': 'Sam',
      'person-1': 'Alex',
      'social-security': copy.workbenchColSocialSecurity,
      spending: copy.workbenchColSpending,
      'income-tax': copy.workbenchColIncomeTax,
      'pay-check': copy.workbenchColPayCheck,
      'from-pay': copy.workbenchColFromPay,
      health: copy.workbenchColHealth,
      'pretax-moves': copy.workbenchColPretaxMoves,
      taxable: copy.workbenchSourceTaxable,
      'pretax-0': 'Pre-tax, Sam',
      'pretax-1': 'Pre-tax, Alex',
      roth: copy.workbenchSourceRoth,
      hsa: copy.workbenchSourceHsa,
    }
    expect(Object.fromEntries(table.columns.map((c) => [c.id, c.header]))).toEqual(headers)
  })

  it('no figure is worked out: every printed value is a number the row itself carries', () => {
    const carried = new Set(rows.flatMap((r) => [...leaves(r)]))
    for (const f of figuresOf(table)) expect(carried.has(f.value), `${f.value}`).toBe(true)
  })

  it('a planted composer that nets a box (put in less taken out) is caught by the same check', () => {
    const carried = leaves(rows[0])
    const netted = rows[0]!.contribution.taxable - rows[0]!.draw.taxable
    expect(carried.has(netted)).toBe(false)
  })

  it('the row’s clock: row t is the build year plus t, and each person’s age is theirs plus t', () => {
    expect(table.rows.map((r) => r.year)).toEqual([2026, 2027])
    expect(table.rows[1]!.ages).toEqual([61, 59])
    expect(table.ageLabels).toEqual(['Sam', 'Alex'])
  })

  it('year 0’s entered pay, other income and spending print exactly; every projected figure wears "~"', () => {
    const at = (k: number, id: string) => table.rows[k]!.cells[table.columns.findIndex((c) => c.id === id)]!
    expect(at(0, 'person-0').map((f) => f?.approx)).toEqual([false, false])
    expect(at(0, 'spending')[0]?.approx).toBe(false)
    expect(at(0, 'income-tax')[0]?.approx).toBe(true)
    expect(at(1, 'person-0').map((f) => f?.approx)).toEqual([true, true])
    expect(at(1, 'spending')[0]?.approx).toBe(true)
  })

  it('on the floor pass, year 0’s spending prints exactly in a working year (the household’s figure) and wears "~" after work (the tool’s essentials)', () => {
    // The U7 review's W5: a working year's Spending is W on either pass, so a floor-pass table must not mark the
    // household's own figure as the tool's; the essentials of a year without work are the tool's own figure.
    const floor = { ...META, track: 'floor' as const }
    const spending0 = (r: LedgerYearRow) => {
      const t = composeYearTable({ rows: [r], meta: floor, view: 'steady' })
      return t.rows[0]!.cells[t.columns.findIndex((c) => c.id === 'spending')]![0]
    }
    expect(spending0(distinctRow(0))?.approx, 'a working year 0').toBe(false)
    expect(spending0(distinctRow(0, { workingYear: undefined }))?.approx, 'a year 0 without work').toBe(true)
    // …and the full pass's year 0 is the household's own spending, working or not.
    const full0 = composeYearTable({ rows: [distinctRow(0, { workingYear: undefined })], meta: META, view: 'steady' })
    expect(full0.rows[0]!.cells[full0.columns.findIndex((c) => c.id === 'spending')]![0]?.approx).toBe(false)
  })

  it('direction never rests on color: put in wears "+", taken out "−", a short year’s left over "−"', () => {
    const short = composeYearTable({
      rows: [distinctRow(0, { workingYear: { ...distinctRow(0).workingYear!, leftOver: -3_400.4 } })],
      meta: META,
      view: 'steady',
    })
    const col = (id: string) => short.columns.findIndex((c) => c.id === id)
    const box = (id: string) => short.rows[0]!.cells[col(id)]!
    expect(box('taxable').map((f) => f?.sign)).toEqual(['+', '−', ''])
    // The short year prints on the gloomy side of the grain: −$3,400.40 reads 3,401 short.
    expect(box('from-pay')[1]).toMatchObject({ value: -3_400.4, dollars: 3_401, sign: '−' })
  })
})

describe('composeYearTable — what a year holds decides the columns', () => {
  it('a column or a line with nothing in any year is left out; a balance line stays', () => {
    const quiet = distinctRow(0, {
      workingYear: undefined,
      payByPerson: [0, 0],
      otherIncomeByPerson: [
        { gross: 0, taxable: 0 },
        { gross: 0, taxable: 0 },
      ],
      leftOverCredit: 0,
      premiums: { acaNet: 0, medicare: 5_000, irmaaSurcharge: 0, medicareExtras: 0 },
      contribution: { taxable: 0, pretax: 0, roth: 0, hsa: 0 },
    })
    const table = composeYearTable({ rows: [quiet], meta: META, view: 'steady' })
    const ids = table.columns.map((c) => c.id)
    expect(ids).not.toContain('person-0')
    expect(ids).not.toContain('pay-check')
    expect(ids).not.toContain('from-pay')
    expect(table.columns.find((c) => c.id === 'health')!.lineLabels).toEqual([copy.workbenchLineMedicare])
    expect(table.columns.find((c) => c.id === 'taxable')!.lineLabels).toEqual([copy.workbenchLineTakenOut, copy.workbenchLineLeft])
    // No put-in anywhere, so no match note; the pay-check note goes with its column; the Required line shows, so its
    // note says it is paid through what's taken out.
    expect(table.notes).toEqual([copy.workbenchApproxNote, copy.workbenchRequiredNote])
    // A future with no required withdrawal in any year drops the line, and its note with it.
    const noRmd = composeYearTable({ rows: [{ ...quiet, rmd: 0 }], meta: META, view: 'steady' })
    expect(noRmd.columns.find((c) => c.id === 'pretax-moves')!.lineLabels).not.toContain(copy.workbenchLineRequired)
    expect(noRmd.notes).toEqual([copy.workbenchApproxNote])
  })

  it('the pay check’s income tax says what it holds by the run’s state reading, and where a state’s tax on pay went instead', () => {
    // The U7 review's W1: the line holds the tax on everything that comes in outside savings, federal, plus the
    // state's where the run charges it; where the W step asked for the state's tax on pay inside W (an unpriced state,
    // or PA), the notes say it sits under Spending, never in this line. The label stays as short as before.
    const notesAt = (stateTaxReading: TableMeta['stateTaxReading']) =>
      composeYearTable({ rows: [distinctRow(0)], meta: { ...META, stateTaxReading }, view: 'steady' }).notes
    expect(notesAt('agi-derived')).toContain(copy.workbenchPayCheckNoteFederalState)
    expect(notesAt('none')).toContain(copy.workbenchPayCheckNoteFederal)
    expect(notesAt('class-based')).toEqual(
      expect.arrayContaining([copy.workbenchPayCheckNoteFederalState, copy.workbenchPayCheckStatePayInW]),
    )
    expect(notesAt('unpriced')).toEqual(expect.arrayContaining([copy.workbenchPayCheckNoteFederal, copy.workbenchPayCheckStateInW]))
    for (const reading of ['agi-derived', 'none'] as const) {
      expect(notesAt(reading)).not.toContain(copy.workbenchPayCheckStateInW)
      expect(notesAt(reading)).not.toContain(copy.workbenchPayCheckStatePayInW)
    }
    // No note claims the line is only the tax on pay (the old words), and the line is named as an income tax.
    for (const reading of ['agi-derived', 'class-based', 'none', 'unpriced'] as const) {
      for (const n of notesAt(reading)) expect(n).not.toMatch(/the tax on pay is in the pay check column/)
    }
    const payCheck = composeYearTable({ rows: [distinctRow(0)], meta: META, view: 'steady' }).columns.find((c) => c.id === 'pay-check')!
    expect(payCheck.lineLabels).toEqual([copy.workbenchLinePayIncomeTax, copy.workbenchLinePayroll])
    expect(copy.workbenchLinePayIncomeTax.length, 'a header line never wraps: as short as "Tax on pay"').toBeLessThanOrEqual('Tax on pay'.length)
  })

  it('a zero flow prints nothing (no misleading zero); a zero balance prints 0', () => {
    const r = distinctRow(0, { draw: { taxable: 0, pretax: 1, roth: 2 }, end: { taxable: 0, pretax: 3, roth: 4, hsa: 5 } })
    const table = composeYearTable({ rows: [r, distinctRow(1)], meta: META, view: 'steady' })
    const box = table.rows[0]!.cells[table.columns.findIndex((c) => c.id === 'taxable')]!
    expect(box[1]).toBeNull()
    expect(box[2]).toMatchObject({ value: 0, dollars: 0 })
  })
})

describe('composeYearTable — a flagged year says why (R13)', () => {
  const notesFor = (over: Partial<LedgerYearRow>, prev?: LedgerYearRow) => {
    const rows = prev === undefined ? [distinctRow(0, over)] : [prev, distinctRow(1, over)]
    return composeYearTable({ rows, meta: META, view: 'steady' }).rows.at(-1)!.notes
  }

  it('each flag sets its own sentence, and its twin without the flag sets none', () => {
    expect(notesFor({})).toEqual([])
    expect(notesFor({ ranOut: true })).toEqual([copy.workbenchRowRanOut])
    expect(notesFor({ earlyPretaxDraw: true })).toEqual([copy.workbenchRowEarlyDraw])
    expect(notesFor({ rmdToTaxable: 4_210.2 })).toEqual([slots.workbenchRowRmdMoved('4,210')])
    expect(notesFor({ workingYear: undefined, incomeNotKept: 12_000 })).toEqual([slots.workbenchRowNotKeptRetired('12,000')])
    expect(notesFor({ incomeNotKept: 3_000, leftOverCredit: 0 })).toEqual([slots.workbenchRowNotKeptNoCredit('3,000')])
  })

  it('a left over kept only in part names the cap that binds: the figure the household said, or a smaller first working year', () => {
    // The U7 review's W4: the credit is the smaller of the carried figure and this path's first-year left over
    // (`workingYearCredit`); a credit equal to the carried figure is that figure binding.
    const notesWith = (leftOverSaved: number | undefined, leftOverCredit: number) =>
      composeYearTable({
        rows: [distinctRow(0, { incomeNotKept: 2_000, leftOverCredit })],
        meta: { ...META, leftOverState: 'saved-moved', ...(leftOverSaved !== undefined ? { leftOverSaved } : {}) },
        view: 'steady',
      }).rows[0]!.notes
    expect(notesWith(25_000, 25_000), 'the figure they said binds').toEqual([slots.workbenchRowNotKeptAboveCap('2,000')])
    expect(notesWith(30_000, 25_000), 'their first working year’s left over is smaller').toEqual([
      slots.workbenchRowNotKeptAboveFirstYear('2,000'),
    ])
  })

  it('a working year’s left over credited nothing says why by the household’s real left-over answer', () => {
    // The U7 review's W3: "your answer doesn't count it as saved" only where the answer says so (spent, not sure);
    // no answer yet, or no first-year left over to ask about, a figure for a working year gone out of date, and a saved
    // answer whose first working year (on this path) has none each say their own reason.
    const said = (leftOverState: TableMeta['leftOverState']) =>
      composeYearTable({
        rows: [distinctRow(0, { incomeNotKept: 3_000, leftOverCredit: 0 })],
        meta: { ...META, leftOverState },
        view: 'steady',
      }).rows[0]!.notes
    expect(said('spent')).toEqual([slots.workbenchRowNotKeptNoCredit('3,000')])
    expect(said('not-sure')).toEqual([slots.workbenchRowNotKeptNoCredit('3,000')])
    expect(said('absent')).toEqual([slots.workbenchRowNotKeptUnsaid('3,000')])
    expect(said('not-asked')).toEqual([slots.workbenchRowNotKeptUnsaid('3,000')])
    expect(said('waiting-on-w')).toEqual([slots.workbenchRowNotKeptWaiting('3,000')])
    expect(said('saved')).toEqual([slots.workbenchRowNotKeptAboveFirstYear('3,000')])
    // Only the spent and not-sure answers are ever told their answer doesn't count the money as saved.
    for (const state of ['absent', 'not-asked', 'waiting-on-w', 'saved', 'saved-moved'] as const) {
      expect(said(state).join(' '), state).not.toMatch(/Your answer on the left over/)
    }
  })

  it('the first year after a death names the survivor and the pre-tax money that is theirs now', () => {
    const notes = notesFor({ alive: [false, true], rolledOver: true, incomeNotKept: 9_400 }, distinctRow(0))
    expect(notes).toEqual([
      slots.workbenchRowSurvivor('Alex', false),
      slots.workbenchRowRolledOver('Sam’s', 'Alex’s'),
      slots.workbenchRowNotKeptAfterDeath('9,400'),
    ])
  })

  it('a sentence that holds word for word in a run of years is said once, with the run’s last year; a moved figure starts a new run', () => {
    const rows = [
      distinctRow(0, { incomeNotKept: 16_985, leftOverCredit: 0 }),
      distinctRow(1, { incomeNotKept: 16_985, leftOverCredit: 0 }),
      distinctRow(2, { incomeNotKept: 16_985, leftOverCredit: 0 }),
      distinctRow(3, { incomeNotKept: 17_348, leftOverCredit: 0 }),
    ]
    const notes = composeYearTable({ rows, meta: META, view: 'steady' }).rows.map((r) => r.notes)
    expect(notes).toEqual([
      [slots.workbenchNoteThrough(slots.workbenchRowNotKeptNoCredit('16,985'), 2028)],
      [],
      [],
      [slots.workbenchRowNotKeptNoCredit('17,348')],
    ])
  })

  it('the rough view marks its first steady year (row 30) and only there; the steady view never does', () => {
    const rows = Array.from({ length: 32 }, (_, t) => distinctRow(t))
    const rough = composeYearTable({ rows, meta: META, view: 'rough', roughEndYear: 1995 })
    expect(rough.rows.filter((r) => r.steadyFrom !== undefined).map((r) => r.t)).toEqual([30])
    expect(rough.rows[30]!.steadyFrom).toBe(slots.workbenchRoughSteadyFrom(1995))
    const steady = composeYearTable({ rows, meta: META, view: 'steady', roughEndYear: 1995 })
    expect(steady.rows.some((r) => r.steadyFrom !== undefined)).toBe(false)
  })
})

describe('composeYearTable — each savings column names its accounts (R6, AE1)', () => {
  it('two Roth IRAs with different owners are one Roth column naming both; each person’s pre-tax is their own', () => {
    const table = composeYearTable({ rows: [distinctRow(0)], meta: META, view: 'steady' })
    expect(table.columns.filter((c) => c.id === 'roth')).toHaveLength(1)
    const key = Object.fromEntries(table.sourceKey.map((e) => [e.label, e.accounts]))
    expect(key[copy.workbenchSourceRoth]).toBe('Sam’s Roth IRA, Alex’s Roth IRA')
    expect(key[slots.workbenchSourcePretaxOf('Sam')]).toBe('Sam’s 401(k)')
    expect(key[slots.workbenchSourcePretaxOf('Alex')]).toBe('Alex’s Traditional IRA')
  })

  it('after a first death the survivor’s pre-tax column names the accounts rolled in, from that year', () => {
    const rows = [distinctRow(0), distinctRow(1, { alive: [false, true], rolledOver: true })]
    const key = Object.fromEntries(composeYearTable({ rows, meta: META, view: 'steady' }).sourceKey.map((e) => [e.label, e.accounts]))
    expect(key[slots.workbenchSourcePretaxOf('Alex')]).toBe(`Alex’s Traditional IRA; ${slots.workbenchRolledIn(2027, 'Sam’s 401(k)')}`)
  })

  it('taxable money with no taxable account says where it comes from', () => {
    const meta = { ...META, sources: { ...META.sources, taxable: [] } }
    const key = composeYearTable({ rows: [distinctRow(0)], meta, view: 'steady' }).sourceKey
    expect(key.find((e) => e.label === copy.workbenchSourceTaxable)?.accounts).toBe(copy.workbenchSourceNoAccount)
  })
})

describe('the yield stopgap (KTD32) and the lifespans line (KTD4)', () => {
  const noTaxable = { start: { taxable: 0, pretax: 1, roth: 1, hsa: 1 }, end: { taxable: 0, pretax: 1, roth: 1, hsa: 1 } }

  it('shows where a year holds taxable money, including money only a required withdrawal moved there', () => {
    expect(yieldLine(META, [distinctRow(0)])).toBe(copy.workbenchYieldAllYears)
    expect(yieldLine(META, [distinctRow(0, noTaxable)])).toBeNull()
    const rmdOnly = distinctRow(0, { ...noTaxable, rmdToTaxable: 4_000, end: { ...noTaxable.end, taxable: 4_100 } })
    expect(yieldLine(META, [rmdOnly])).toBe(copy.workbenchYieldAllYears)
  })

  it('with investment income in the run, working years are priced: taxable money only while working shows no line', () => {
    const meta = { ...META, investmentByPerson: [12_000, 0] }
    const working = distinctRow(0)
    const retiredEmpty = distinctRow(1, { ...noTaxable, payByPerson: [0, 0] })
    expect(yieldLine(meta, [working, retiredEmpty])).toBeNull()
    const retiredHolding = distinctRow(1, { payByPerson: [0, 0] })
    expect(yieldLine(meta, [working, retiredHolding])).toBe(copy.workbenchYieldAfterWork)
  })

  it('a year is priced only where someone paid that year carries investment income in the run', () => {
    // The engine adds a person's figure only in a year that person works: a year where only the person with none
    // works prices no yield, so its taxable money shows the line.
    const meta = { ...META, investmentByPerson: [12_000, 0] }
    const onlyTheOtherWorks = distinctRow(0, { payByPerson: [0, 90_000] })
    expect(yieldLine(meta, [onlyTheOtherWorks])).toBe(copy.workbenchYieldAfterWork)
    expect(yieldLine(meta, [distinctRow(0, { payByPerson: [80_000, 0] })])).toBeNull()
  })

  it('names the first to die at their own age and the survivor at the couple’s last year; one person alone', () => {
    expect(lifespansLine(META.people)).toBe(slots.workbenchLivesTwo('Sam', false, 'Sam’s', 84, 'Alex', 92))
    expect(lifespansLine([person('You', 61, 88, true)])).toBe(slots.workbenchLivesOne('you', true, 'your', 88))
  })
})

describe('the table on a real run (the engine’s own rows through the composer)', () => {
  const answerFor = (draft: (typeof DEV_SEEDS)['retired']): ModelAnswer =>
    ({ kind: 'headline', tier: 'final', draft, inputKey: 'k' }) as unknown as ModelAnswer

  for (const name of ['retired', 'buckets'] as const) {
    it(`${name}: both views run, and every printed figure is a field of its own row`, () => {
      const run = tableRunFor(answerFor(DEV_SEEDS[name]))
      expect(run.kind).toBe('run')
      if (run.kind !== 'run') return
      for (const view of ['steady', 'rough'] as const) {
        const ask = run.views[view]
        expect(ask.kind).toBe('run')
        if (ask.kind !== 'run') continue
        const out = simulate(ask.request.params, ask.request.seed, ask.request.options)
        expect(out.indeterminate).toBe(false)
        const rows = out.indeterminate || out.infeasible ? [] : (out.distribution.ledgerRows ?? [])
        expect(rows.length).toBeGreaterThan(10)
        const table = composeYearTable({ rows, meta: run.meta, view, roughEndYear: 1995 })
        table.rows.forEach((tr, k) => {
          const carried = leaves(rows[k])
          for (const f of tr.cells.flat()) if (f !== null) expect(carried.has(f.value)).toBe(true)
        })
        expect(table.rows[0]!.year).toBe(DEV_SEEDS[name].startCalendarYear)
      }
    })
  }

  it('a floor-pass date: both views record the essentials pass, the lifestyle twin the full pass, and a working year 0’s spending prints exactly', () => {
    // The U7 review's T3: the floor pass on each request (the band's own track) was untested end to end.
    // `datemixed`: the essentials floor dates (7 years out), the full lifestyle doesn't.
    const draft = DEV_SEEDS.datemixed
    const at = (track: 'floor' | 'lifestyle') =>
      tableRunFor({
        kind: 'date',
        tier: 'final',
        draft,
        outcome: { kind: 'dates', tier: 'final', windowTopYears: DATE_OFFSET_WINDOW_TOP, seed: 1, band: { offsetYears: 7, track } },
        inputKey: 'k',
      } as unknown as ModelAnswer)
    const floor = at('floor')
    const lifestyle = at('lifestyle')
    if (floor.kind !== 'run' || lifestyle.kind !== 'run') throw new Error('[test setup] datemixed: no table run')
    expect(floor.meta.track).toBe('floor')
    for (const view of ['steady', 'rough'] as const) {
      const f = floor.views[view]
      const l = lifestyle.views[view]
      if (f.kind !== 'run' || l.kind !== 'run') throw new Error(`[test setup] datemixed ${view}: refused`)
      expect(f.request.options?.ledgerTrack, `${view}: the floor pass`).toBe('floor')
      expect(l.request.options?.ledgerTrack, `${view}: the lifestyle twin records the full pass`).toBeUndefined()
    }
    const ask = floor.views.steady
    if (ask.kind !== 'run') return
    const out = simulate(ask.request.params, ask.request.seed, ask.request.options)
    const rows = out.indeterminate || out.infeasible ? [] : (out.distribution.ledgerRows ?? [])
    expect(rows.length).toBeGreaterThan(10)
    const table = composeYearTable({ rows, meta: floor.meta, view: 'steady' })
    const spending = table.columns.findIndex((c) => c.id === 'spending')
    expect(rows[0]!.workingYear, 'year 0 is a working year').toBeDefined()
    expect(table.rows[0]!.cells[spending]![0], 'year 0’s spending is the household’s own figure for a working year').toMatchObject({
      value: rows[0]!.workingYear!.workingYearCost,
      approx: false,
    })
    // After work stops the floor pass's essentials are the tool's figure: "~".
    const afterWork = table.rows.findIndex((_, k) => rows[k]!.workingYear === undefined)
    expect(afterWork).toBeGreaterThan(0)
    expect(table.rows[afterWork]!.cells[spending]![0]?.approx).toBe(true)
  })

  it('a figure prints on the engine’s grain: the cent snap, then whole dollars', () => {
    expect(formatTableDollars(1_234.999)).toBe('1,235')
    expect(formatTableDollars(1_234.994)).toBe('1,234')
  })
})
