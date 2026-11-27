import { describe, expect, it } from 'vitest'
import { simulate } from '@engine/simulate'
import type { InheritedPace, LedgerYearRow, WhatIfLeverV6 } from '@shared/model'
import type { ModelAnswer, ScenarioDraft } from '@store/memoryModel'
import { applyBundle } from '@intake/whatIf'
import { pairedColumnsFor } from '../../../workbench/railChrome'
import { DEV_SEEDS } from '../../../devSeeds'
import { copy, slots } from '../../../copy'
import { enteredAccountName, tableRunFor, type TableMeta } from '../../../workbench/tableRun'
import { formatTableDollars } from '../../../workbench/yearTableChrome'
import { investedKinds } from '../../dashboard/snapshotView'
import { balanceSheetView } from '../../dashboard/balanceSheetView'
import { taxAllocationView } from '../../investment/investmentView'
import { netWorthView } from '../../profile/profileView'
import { cashFlowsView, leavesOf, type AccountsTable, type CashFlowsInput, type CashFlowsTab, type SummaryDrill } from '../cashFlowsView'

/**
 * The inherited-IRA screens (the Act 5 plan's U13, slice 2) on the two-inherited dev seed (`?seed=inherited`): Alex's IRA
 * inherited in 2023 (a yearly minimum through 2033) and Alex's IRA inherited in 2021 (no yearly minimum, everything out
 * by 2031, paced in even amounts). Every figure is read off the run's own rows (the sink's per-account entries), never
 * re-derived: Cash Flows prints each account's own columns, names its last year in words and the part moved to taxable,
 * and the four pages that total the accounts agree to the dollar.
 */

const draft = DEV_SEEDS.inherited
/** A draft's steady rows and its run's meta, through the app's own table run (the paired form's two runs, U17). */
function steadyRows(d: ScenarioDraft): { readonly rows: readonly LedgerYearRow[]; readonly meta: TableMeta } {
  const run = tableRunFor({ kind: 'headline', tier: 'final', draft: d, inputKey: 'k' } as unknown as ModelAnswer)
  if (run.kind !== 'run') throw new Error(`[test setup] the inherited seed builds no table run: ${run.kind}`)
  const ask = run.views.steady
  if (ask.kind !== 'run') throw new Error('[test setup] no steady run')
  const res = simulate(ask.request.params, ask.request.seed, ask.request.options)
  return { rows: res.indeterminate || res.infeasible ? [] : (res.distribution.ledgerRows ?? []), meta: run.meta }
}
const { rows, meta } = steadyRows(draft)

const view = (tab: CashFlowsTab, accounts: AccountsTable = 'end', drill: SummaryDrill | null = null, tableMeta: TableMeta = meta) =>
  cashFlowsView({
    tab,
    drill,
    maps: { t: null, choice: 'flow' },
    readOnly: false,
    accounts,
    future: 'steady',
    pick: 'plan',
    offers: { working: null, kept: [], recommended: false, paired: null },
    plan: { kind: 'ready', rows, meta: tableMeta, updating: false, answerKey: 'k' },
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

  it('two of one heir’s from deaths in the same year read apart by their place in the entered order', () => {
    const sameYear: ScenarioDraft = {
      ...draft,
      enteredAccounts: draft.enteredAccounts.map((a) => (a.kind === 'inherited-ira' && a.inherited !== undefined ? { ...a, inherited: { ...a.inherited, ownerDeathYear: 2023 } } : a)),
    }
    const inherited = sameYear.enteredAccounts.filter((a) => a.kind === 'inherited-ira')
    expect(inherited.map((a) => enteredAccountName(sameYear, a))).toEqual([slots.inheritedIraOfNth('Alex’s', 2023, 1, 2), slots.inheritedIraOfNth('Alex’s', 2023, 2, 2)])
    // Different death years keep the plain name.
    expect(draft.enteredAccounts.filter((a) => a.kind === 'inherited-ira').map((a) => enteredAccountName(draft, a))).toEqual(NAMES)
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
    // The household's own pre-tax pair is named too, so no Required column reads as the year's whole required amount.
    expect(groups.map((g) => g.header)).toEqual([copy.workbenchSourcePretax, ...NAMES])
    expect(leavesOf([groups[0]!]).map((l) => l.id)[0]).toBe('rmd')
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

  it('Cash Flows → Summary / Planned distribution: beside the inherited IRAs the household’s own required column names its source; with none it keeps its plain name', () => {
    const requiredHeader = (m: TableMeta) => {
      const v = view('summary', 'end', 'distribution', m)
      if (v.body.kind !== 'table') throw new Error(v.body.kind)
      return leavesOf(v.body.columns).find((l) => l.id === 'rmd')?.header
    }
    expect(requiredHeader(meta)).toBe(slots.workbenchPairRequiredOf(copy.workbenchSourcePretax))
    expect(requiredHeader({ ...meta, inherited: [] })).toBe(copy.workbenchPairRequired)
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

/**
 * U17, the pace lever, on the same seed: each rule other than the plan's own, as the tray writes it, changes only that
 * account's pace on the what-if's copy (field by field, as U14's arms are proven), and Cash Flows' paired form shows that
 * account's own required and taken columns, the what-if's differing from the plan's in some year.
 */
describe('U17: an inherited IRA’s pace, tried beside the plan', () => {
  const IDS = ['acct-0-inherited-ira-2023', 'acct-0-inherited-ira-2021'] as const
  // The 2023 account's plan is "only what the law requires"; the 2021 account's is "even amounts" (the seed's facts).
  const OTHER_RULES: readonly (readonly [number, InheritedPace])[] = [
    [0, { kind: 'even' }],
    [0, { kind: 'even-to-year', lastYear: 2029 }],
    [1, { kind: 'law-minimum' }],
    [1, { kind: 'even-to-year', lastYear: 2028 }],
  ]
  const withPace = (d: ScenarioDraft, accountId: string, pace: InheritedPace | undefined): ScenarioDraft => ({
    ...d,
    enteredAccounts: d.enteredAccounts.map((a) => (a.id === accountId && a.inherited !== undefined ? { ...a, inherited: { ...a.inherited, pace: pace ?? a.inherited.pace } } : a)),
  })

  it.each(OTHER_RULES)('account %i, %j: the what-if’s copy differs from the plan in that account’s pace alone, and its paired columns differ from the plan’s', (k, pace) => {
    const accountId = IDS[k]!
    const lever: WhatIfLeverV6 = { kind: 'inherited-pace', accountId, pace }
    const applied = applyBundle(draft, [lever])
    if (!applied.ok) throw new Error(applied.refusal.kind)
    expect(applied.draft.enteredAccounts.find((a) => a.id === accountId)?.inherited?.pace).toEqual(pace)
    // Put the plan's pace back on the copy and it is the plan's draft, every field: nothing else moved.
    const planPace = draft.enteredAccounts.find((a) => a.id === accountId)!.inherited!.pace
    expect(withPace(applied.draft, accountId, planPace)).toEqual(draft)

    const whatIf = steadyRows(applied.draft)
    const columns = pairedColumnsFor([lever], draft)
    expect(columns).toEqual([`inherited-required:${accountId}`, `inherited-taken:${accountId}`, 'income-tax', 'end-total'])
    const v = cashFlowsView({
      tab: 'summary',
      drill: null,
      maps: { t: null, choice: 'flow' },
      readOnly: false,
      accounts: 'end',
      future: 'steady',
      pick: 'paired',
      offers: { working: null, kept: [], recommended: false, paired: copy.probabilityPickNew },
      plan: { kind: 'ready', rows, meta, updating: false, answerKey: 'k' },
      other: { kind: 'ready', rows: whatIf.rows, meta: whatIf.meta, updating: false, answerKey: 'k' },
      otherName: copy.probabilityPickNew,
      pairedColumns: columns,
      roughYears: { start: 1966, end: 1995, years: 30 },
      wallCalendarYear: draft.startCalendarYear,
      stateClause: null,
    } satisfies CashFlowsInput)
    if (v.body.kind !== 'table') throw new Error(v.body.kind)
    const leaves = leavesOf(v.body.columns)
    const taken = leaves.find((l) => l.id === `inherited-taken:${accountId}`)
    expect(taken?.header).toBe(slots.workbenchPairTakenFrom(NAMES[k]!))
    expect(leaves.find((l) => l.id === `inherited-required:${accountId}`)?.header).toBe(slots.workbenchPairRequiredOf(NAMES[k]!))
    expect(leaves.some((l) => l.id.includes(IDS[1 - k]!)), 'the other account’s columns stay out').toBe(false)
    // Each cell is its own run's entry for that account: the plan's row over the what-if's.
    const byKey = new Map(v.body.rows.map((r) => [r.key, r]))
    let differs = false
    for (const r of rows) {
      const p = byKey.get(`${r.t}-plan`)!.cells[`inherited-taken:${accountId}`]?.value ?? null
      const w = byKey.get(`${r.t}-whatIf`)?.cells[`inherited-taken:${accountId}`]?.value ?? null
      expect(p ?? 0, `${yearOf(r)} plan`).toBeCloseTo(formatTableDollars(r.inherited![k]!.taken) === '0' ? 0 : r.inherited![k]!.taken, 6)
      if (p !== w) differs = true
    }
    expect(differs, 'the what-if’s taken column differs from the plan’s in some year').toBe(true)
    expect(v.footnotes).toContain(copy.cashFlowsInheritedRequiredNote)
  })
})

describe('the opening total a rate divides by (gap 3’s review, round 3)', () => {
  it('leaves out an inherited balance leaving the plan at the year’s top: the rate is on the money the household keeps', async () => {
    const { startTotal, withdrawn } = await import('../analysisRuns')
    const { ledgerRowStartTotal } = await import('@engine/sequencing')
    const row = rows.find((r) => (r.inherited?.[0]?.start ?? 0) > 0)!
    const e = row.inherited![0]!
    // The row the account leaves in: its whole opening balance exits, nobody's income and no withdrawal.
    const exitRow: LedgerYearRow = { ...row, inherited: row.inherited!.map((x, k) => (k === 0 ? { ...x, leftTheRun: e.start, taken: 0, movedToTaxable: 0, end: 0 } : x)) }
    expect(startTotal(exitRow)).toBeCloseTo(ledgerRowStartTotal(exitRow) - e.start, 6)
    expect(startTotal(row), 'no exit: the engine’s own total').toBe(ledgerRowStartTotal(row))
    expect(withdrawn(exitRow)).toBeLessThan(withdrawn(row) + 1e-9)
  })
})
