import { describe, expect, it } from 'vitest'
import { simulate } from '@engine/simulate'
import type { LedgerYearRow } from '@shared/model'
import type { ModelAnswer } from '@store/memoryModel'
import { DEV_SEEDS } from '../../../devSeeds'
import { copy, slots } from '../../../copy'
import { tableRunFor, type TableMeta } from '../../../workbench/tableRun'
import { formatTableDollars } from '../../../workbench/yearTableChrome'
import { investedKinds } from '../../dashboard/snapshotView'
import { balanceSheetView } from '../../dashboard/balanceSheetView'
import { taxAllocationView } from '../../investment/investmentView'
import { netWorthView } from '../../profile/profileView'
import { cashFlowsView, leavesOf, type AccountsTable, type CashFlowsInput, type CashFlowsTab } from '../cashFlowsView'

/**
 * The inherited-IRA screens (the Act 5 plan's U13, slice 2) on the two-inherited dev seed (`?seed=inherited`): Alex's IRA
 * inherited in 2023 (a yearly minimum through 2033) and Alex's IRA inherited in 2021 (no yearly minimum, everything out
 * by 2031, paced in even amounts). Every figure is read off the run's own rows (the sink's per-account entries), never
 * re-derived: Cash Flows prints each account's own columns, names its last year in words and the part moved to taxable,
 * and the four pages that total the accounts agree to the dollar.
 */

const draft = DEV_SEEDS.inherited
const run = tableRunFor({ kind: 'headline', tier: 'final', draft, inputKey: 'k' } as unknown as ModelAnswer)
if (run.kind !== 'run') throw new Error(`[test setup] the inherited seed builds no table run: ${run.kind}`)
const meta: TableMeta = run.meta
const ask = run.views.steady
if (ask.kind !== 'run') throw new Error('[test setup] no steady run')
const res = simulate(ask.request.params, ask.request.seed, ask.request.options)
const rows: readonly LedgerYearRow[] = res.indeterminate || res.infeasible ? [] : (res.distribution.ledgerRows ?? [])

const view = (tab: CashFlowsTab, accounts: AccountsTable = 'end') =>
  cashFlowsView({
    tab,
    drill: null,
    maps: { t: null, choice: 'flow' },
    readOnly: false,
    accounts,
    future: 'steady',
    pick: 'plan',
    offers: { working: null, kept: [], recommended: false, paired: null },
    plan: { kind: 'ready', rows, meta, updating: false, answerKey: 'k' },
    roughYears: { start: 1966, end: 1995, years: 30 },
    wallCalendarYear: draft.startCalendarYear,
    stateClause: null,
  } satisfies CashFlowsInput)

const yearOf = (r: LedgerYearRow) => draft.startCalendarYear + r.t
const NAMES = ['Alex’s IRA inherited in 2023', 'Alex’s IRA inherited in 2021'] as const

describe('the two-inherited seed', () => {
  it('[test setup] runs whole, one ledger per inherited IRA in the entered order, each named by its owner’s death year', () => {
    expect(rows.length).toBeGreaterThan(10)
    expect(rows.every((r) => r.inherited?.length === 2)).toBe(true)
    expect(meta.inherited.map((i) => i.name)).toEqual(NAMES)
    expect(meta.inherited.map((i) => i.label)).toEqual(NAMES)
  })

  it('Cash Flows → Accounts, Ending balance: one column per inherited IRA, each its own year-end balance', () => {
    const v = view('accounts', 'end')
    if (v.body.kind !== 'table') throw new Error(v.body.kind)
    const leaves = leavesOf(v.body.columns)
    expect(leaves.find((l) => l.id === 'inherited-0')?.header).toBe(NAMES[0])
    expect(leaves.find((l) => l.id === 'inherited-1')?.header).toBe(NAMES[1])
    v.body.rows.forEach((row, k) => {
      expect(row.cells['inherited-0']?.value).toBe(rows[k]!.inherited![0]!.end)
      expect(row.cells['inherited-1']?.value).toBe(rows[k]!.inherited![1]!.end)
    })
  })

  it('Cash Flows → Accounts, Required withdrawals: each inherited IRA a group of its own, the required amount beside what came out, the law’s last year named in words', () => {
    const v = view('accounts', 'rmd')
    if (v.body.kind !== 'table') throw new Error(v.body.kind)
    const groups = v.body.columns.filter((c) => c.kind === 'group')
    expect(groups.map((g) => g.header)).toEqual(NAMES)
    v.body.rows.forEach((row, k) => {
      const e = rows[k]!.inherited!
      for (const i of [0, 1]) {
        expect(row.cells[`inherited-${i}-taken`]?.value ?? 0, `${yearOf(rows[k]!)}: what came out is never under the law's figure`).toBeGreaterThanOrEqual(
          row.cells[`inherited-${i}-required`]?.value ?? 0,
        )
        if (e[i]!.required !== 0 && formatTableDollars(e[i]!.required) !== '0') expect(row.cells[`inherited-${i}-required`]?.value).toBe(e[i]!.required)
      }
    })
    // The 2021 account owes no yearly minimum: nothing is required before its last year, and everything left in it then.
    const last2021 = rows.find((r) => r.inherited![1]!.last)!
    expect(yearOf(last2021)).toBe(2031)
    expect(last2021.inherited![1]!.required).toBe(last2021.inherited![1]!.start)
    expect(rows.filter((r) => r.t < last2021.t).every((r) => r.inherited![1]!.required === 0)).toBe(true)
    expect(yearOf(rows.find((r) => r.inherited![0]!.last)!)).toBe(2033)
    expect(v.yearNotes).toContain(slots.cashFlowsYearNote(2031, slots.cashFlowsInheritedLastNote(NAMES[1])))
    expect(v.yearNotes).toContain(slots.cashFlowsYearNote(2033, slots.cashFlowsInheritedLastNote(NAMES[0])))
    expect(v.footnotes).toContain(copy.cashFlowsInheritedRequiredNote)
  })

  it('the part of a withdrawal the year did not need moves to taxable: its column, and its sentence in that year', () => {
    const moved = rows.flatMap((r) => r.inherited!.map((e, i) => ({ r, e, i }))).filter(({ e }) => formatTableDollars(e.movedToTaxable) !== '0')
    expect(moved.length, '[test setup] the seed moves some to taxable once Social Security starts').toBeGreaterThan(0)
    const v = view('accounts', 'rmd')
    if (v.body.kind !== 'table') throw new Error(v.body.kind)
    const { r, e, i } = moved[0]!
    expect(v.body.rows[r.t]?.cells[`inherited-${i}-moved`]?.value).toBe(e.movedToTaxable)
    expect(v.yearNotes).toContain(slots.cashFlowsYearNote(yearOf(r), slots.cashFlowsInheritedMovedNote(formatTableDollars(e.movedToTaxable), NAMES[i]!)))
  })

  it('Cash Flows → Summary: each inherited IRA’s withdrawal is its own column under Planned distribution', () => {
    const v = view('summary')
    if (v.body.kind !== 'table') throw new Error(v.body.kind)
    const leaves = leavesOf(v.body.columns)
    expect(leaves.find((l) => l.id === 'draw-inherited-0')?.header).toBe(slots.workbenchPairTakenFrom(NAMES[0]))
    expect(leaves.find((l) => l.id === 'draw-inherited-1')?.header).toBe(slots.workbenchPairTakenFrom(NAMES[1]))
    expect(v.stopgaps, 'the stopgap names only bank accounts now that the table carries inherited IRAs').toContain(copy.workbenchKindsMissing)
    expect(copy.workbenchKindsMissing).not.toMatch(/inherited/i)
  })

  it('Net Worth’s, Snapshot’s, Balance Sheet’s and Tax Allocation’s totals agree to the dollar, and Tax Allocation’s parts sum to its total, the inherited IRA its own part', () => {
    const kinds = investedKinds(draft)
    expect(kinds.kinds.map((k) => k.id)).toEqual(['taxable', 'pretax', 'roth', 'hsa', 'inherited'])
    expect(kinds.kinds.find((k) => k.id === 'inherited')?.value).toBe(340_000)
    expect(kinds.kinds.find((k) => k.id === 'pretax')?.value, 'never inside pre-tax').toBe(700_000)
    const total = kinds.total
    const sheet = balanceSheetView(draft, undefined, false)
    if (sheet.kind !== 'kinds') throw new Error(sheet.kind)
    expect(sheet.total).toBe(total)
    const alloc = taxAllocationView(draft, null, undefined)
    if (alloc.kind !== 'buckets') throw new Error(alloc.kind)
    expect(alloc.buckets.map((b) => b.id)).toEqual(['taxable', 'pretax', 'roth', 'hsa', 'inherited'])
    expect(alloc.buckets.reduce((s, b) => s + b.total, 0)).toBe(total)
    expect(alloc.buckets.find((b) => b.id === 'inherited')).toMatchObject({ colorIndex: 13, pattern: 'zigzag', total: 340_000 })
    const worth = netWorthView(draft, undefined, false)
    expect(worth.total).toBe(alloc.total)
    // A household with no inherited IRA prints no $0 inherited row.
    expect(investedKinds(DEV_SEEDS.buckets).kinds.map((k) => k.id)).toEqual(['taxable', 'pretax', 'roth', 'hsa'])
  })
})
