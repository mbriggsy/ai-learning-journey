import { describe, expect, it } from 'vitest'
import { composeYearTable, formatTableDollars, lifespansLine, yieldLine, type ComposedTable } from '../yearTableChrome'
import { tableRunFor, type TableMeta, type TablePerson } from '../tableRun'
import { simulate } from '@engine/simulate'
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
  },
  track: 'full',
  route: 'spine',
  startCalendarYear: 2026,
  people: [person('Sam', 60, 84), person('Alex', 58, 92)],
  investmentEntered: false,
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
    // No put-in anywhere, so no match note; the pay-check note goes with its column.
    expect(table.notes).toEqual([copy.workbenchApproxNote])
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
    expect(notesFor({ incomeNotKept: 3_000 })).toEqual([slots.workbenchRowNotKeptAboveCap('3,000')])
    expect(notesFor({ incomeNotKept: 3_000, leftOverCredit: 0 })).toEqual([slots.workbenchRowNotKeptNoCredit('3,000')])
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

  it('with investment income entered, working years are priced: taxable money only while working shows no line', () => {
    const meta = { ...META, investmentEntered: true }
    const working = distinctRow(0)
    const retiredEmpty = distinctRow(1, { ...noTaxable, payByPerson: [0, 0] })
    expect(yieldLine(meta, [working, retiredEmpty])).toBeNull()
    const retiredHolding = distinctRow(1, { payByPerson: [0, 0] })
    expect(yieldLine(meta, [working, retiredHolding])).toBe(copy.workbenchYieldAfterWork)
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

  it('a figure prints on the engine’s grain: the cent snap, then whole dollars', () => {
    expect(formatTableDollars(1_234.999)).toBe('1,235')
    expect(formatTableDollars(1_234.994)).toBe('1,234')
  })
})
