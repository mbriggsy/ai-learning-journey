import { describe, expect, it } from 'vitest'
import { accountSources, sourceBalance } from '@intake/intakeMap'
import type { ScenarioDraft } from '@store/memoryModel'
import { kindBarsOptions, SIDEWAYS_MAX_WIDTH, sidewaysTicks } from '@viz/charts/kindBarsOptions'
import { DEV_SEEDS } from '../../../devSeeds'
import { copy, slots } from '../../../copy'
import { netWorthView } from '../../profile/profileView'
import { balanceSheetView, type BalanceSheetView } from '../balanceSheetView'
import { investedKinds } from '../snapshotView'

/**
 * Balance Sheet's composer (Act 6 · RC16, the plan's RC16 test scenarios): the total is the entered balances; no
 * liability or net worth figure exists anywhere in the view; the premise (aged where it applies) and the stopgap lines
 * are Snapshot's and Net Worth's own words; an empty plan and a one-kind plan read honestly; a read-only tab draws no door.
 */

const BUCKETS = DEV_SEEDS.buckets
const kindsOf = (v: BalanceSheetView) => {
  if (v.kind !== 'kinds') throw new Error(`expected the kinds view, got ${v.kind}`)
  return v
}
const withAccounts = (accounts: ScenarioDraft['enteredAccounts']): ScenarioDraft => ({ ...BUCKETS, enteredAccounts: accounts }) as ScenarioDraft

describe('Balance Sheet: the invested total, by kind', () => {
  it('the total and each bar equal the entered balances, in the order taxable, pre-tax, Roth, HSA, each named and printed', () => {
    const v = kindsOf(balanceSheetView(BUCKETS, undefined, false))
    const src = accountSources(BUCKETS)
    const sums = [src.taxable, src.pretax, src.roth, src.hsa].map(sourceBalance)
    const total = sums.reduce((s, x) => s + x, 0)
    expect(total).toBeGreaterThan(0)
    expect(v.total).toBe(total)
    expect(v.headline).toBe(slots.balanceSheetTotal(`$${total.toLocaleString('en-US')}`))
    expect(v.chart).not.toBeNull()
    expect(v.chart!.bars.map((b) => b.value)).toEqual(sums)
    expect(v.chart!.bars.map((b) => b.name)).toEqual([copy.snapshotInvestedTaxable, copy.snapshotInvestedPretax, copy.snapshotInvestedRoth, copy.snapshotInvestedHsa])
    expect(v.chart!.bars.map((b) => b.figure)).toEqual(sums.map((s) => `$${s.toLocaleString('en-US')}`))
    // The breakdown and the Details tab carry the same figures: one split, one derivation.
    expect(v.breakdown.rows.map((r) => r.value)).toEqual(v.chart!.bars.map((b) => b.figure))
    expect(v.breakdown.total.value).toBe(`$${total.toLocaleString('en-US')}`)
    expect(v.details.groups.map((g) => g.total)).toEqual(v.chart!.bars.filter((b) => v.details.groups.some((g) => g.id === b.id)).map((b) => b.figure))
    // The axis runs from $0 to a lattice that covers the tallest bar.
    const ticks = v.chart!.ticks
    expect(ticks[0]!.dollars).toBe(0)
    expect(ticks[ticks.length - 1]!.dollars).toBeGreaterThanOrEqual(Math.max(...sums))
  })

  it('the split is Snapshot’s card’s own (each account rounded first), and Net Worth’s total agrees with it, cents or not', () => {
    const cents = withAccounts([
      { id: 'c-brokerage', ownerIndex: 0, kind: 'brokerage', ticker: 'VTI', valueToday: 10.4 },
      { id: 'c-roth', ownerIndex: 0, kind: 'roth-ira', ticker: 'VTI', valueToday: 10.4 },
      { id: 'c-hsa', ownerIndex: 1, kind: 'hsa', ticker: 'VTI', valueToday: 10.4 },
    ] as ScenarioDraft['enteredAccounts'])
    const v = kindsOf(balanceSheetView(cents, undefined, false))
    expect(v.total).toBe(investedKinds(cents).total)
    expect(v.total).toBe(30)
    expect(netWorthView(cents, undefined, false).total).toBe('$30')
  })

  it('no liability and no net worth figure exists anywhere in the view, on any seed or tab', () => {
    for (const d of [BUCKETS, DEV_SEEDS.retired, DEV_SEEDS.dip, withAccounts([])]) {
      for (const readOnly of [false, true]) {
        const words = JSON.stringify(balanceSheetView(d, 2024, readOnly))
        expect(words).not.toMatch(/net worth|liabilit|debts? of|mortgage/i)
      }
    }
  })
})

describe('Balance Sheet: the honesty lines', () => {
  it('the premise and the stopgap lines are Net Worth’s own, word for word; the aged year where the plan was saved earlier', () => {
    const fresh = kindsOf(balanceSheetView(BUCKETS, undefined, false))
    expect(fresh.asEntered).toBe(copy.snapshotInvestedAsEntered)
    expect(fresh.notes).toEqual([copy.snapshotInvestedStopgap, copy.profileInheritedIraStopgap])
    expect([fresh.asEntered, ...fresh.notes]).toEqual(netWorthView(BUCKETS, undefined, false).notes)
    const aged = kindsOf(balanceSheetView(BUCKETS, 2024, false))
    expect(aged.asEntered).toBe(slots.snapshotInvestedAsEnteredIn(2024))
    expect(aged.notes).toContain(copy.snapshotInvestedStopgap)
  })

  it('the DETAILS breakdown (a full-screen sheet on the phone) carries the same premise and stopgap lines under its list, aged year included', () => {
    const aged = kindsOf(balanceSheetView(BUCKETS, 2024, false))
    expect(aged.breakdown.notes).toEqual([aged.asEntered, ...aged.notes])
    expect(aged.breakdown.notes[0]).toBe(slots.snapshotInvestedAsEnteredIn(2024))
    expect(aged.breakdown.notes.join(' ')).toContain('entered them in 2024; what you hold now may differ')
    expect(aged.breakdown.notes).toContain(copy.snapshotInvestedStopgap)
    const fresh = kindsOf(balanceSheetView(BUCKETS, undefined, false))
    expect(fresh.breakdown.notes).toEqual(netWorthView(BUCKETS, undefined, false).notes)
  })
})

describe('Balance Sheet: the edge plans', () => {
  it('an empty plan prints no figure and no chart: the words, the stopgap line, and the door on a writable tab', () => {
    const v = balanceSheetView(withAccounts([]), undefined, false)
    expect(v.kind).toBe('empty')
    if (v.kind !== 'empty') return
    expect(v.words).toBe(copy.profileNetWorthNoAccountsReadOnly)
    expect(v.notes).toContain(copy.snapshotInvestedStopgap)
    expect(JSON.stringify(v)).not.toMatch(/\$\d/)
    expect(v.door).not.toBeNull()
  })

  it('a one-kind plan keeps all four kinds named, the empty three printed "$0", and lists one kind on Details', () => {
    const v = kindsOf(
      balanceSheetView(withAccounts([{ id: 'r', ownerIndex: 1, kind: 'roth-ira', ticker: 'VTI', valueToday: 250_000 }] as ScenarioDraft['enteredAccounts']), undefined, false),
    )
    expect(v.chart!.bars.map((b) => b.figure)).toEqual(['$0', '$0', '$250,000', '$0'])
    expect(v.details.groups.map((g) => g.id)).toEqual(['roth'])
    expect(v.details.groups[0]!.accounts).toHaveLength(1)
    expect(v.headline).toBe(slots.balanceSheetTotal('$250,000'))
  })

  it('accounts that all hold $0 draw no bars and say so', () => {
    const v = kindsOf(balanceSheetView(withAccounts([{ id: 'z', ownerIndex: 0, kind: 'brokerage', ticker: 'VTI', valueToday: 0 }] as ScenarioDraft['enteredAccounts']), undefined, false))
    expect(v.chart).toBeNull()
    expect(v.zeroWords).toBe(copy.balanceSheetZero)
  })

  it('Details lists each kind’s accounts, the first person’s before the second’s', () => {
    const d = withAccounts([
      { id: 'b', ownerIndex: 1, kind: '401k', ticker: 'VTI', valueToday: 100 },
      { id: 'a', ownerIndex: 0, kind: 'traditional-ira', ticker: 'VTI', valueToday: 200 },
    ] as ScenarioDraft['enteredAccounts'])
    const v = kindsOf(balanceSheetView(d, undefined, false))
    const rows = netWorthView(d, undefined, false).rows
    expect(v.details.groups).toHaveLength(1)
    expect(v.details.groups[0]!.accounts.map((a) => a.name)).toEqual([rows[1]!.name, rows[0]!.name])
    expect(v.details.groups[0]!.total).toBe('$300')
  })
})

describe('Balance Sheet: read-only', () => {
  it('a read-only tab draws no door (the page’s only action), on the full and the empty plan', () => {
    expect(balanceSheetView(BUCKETS, undefined, true).door).toBeNull()
    expect(balanceSheetView(withAccounts([]), undefined, true).door).toBeNull()
    expect(balanceSheetView(BUCKETS, undefined, false).door).toEqual({ label: copy.balanceSheetChangeAccounts })
  })
})

describe('kindBarsOptions: the picture the composer states', () => {
  it('one column per kind on a linear axis from $0 to the last tick, each printing its own figure, never deferred', () => {
    const v = kindsOf(balanceSheetView(BUCKETS, undefined, false))
    const words = { title: 't', description: 'd', credits: 'c', end: 'e', legend: 'l', legendItem: 'i' }
    const o = kindBarsOptions({ bars: v.chart!.bars, ticks: v.chart!.ticks, words, height: 260 })
    const y = o.yAxis as { min: number; max: number; type: string; tickPositions: number[] }
    expect(y.type).toBe('linear')
    expect(y.min).toBe(0)
    expect(y.max).toBe(v.chart!.ticks[v.chart!.ticks.length - 1]!.dollars)
    const series = (o.series as { data: { y: number; custom: { figure: string } }[]; dataLabels: { defer: boolean } }[])[0]!
    expect(series.data.map((p) => p.y)).toEqual(v.chart!.bars.map((b) => b.value))
    expect(series.data.map((p) => p.custom.figure)).toEqual(v.chart!.bars.map((b) => b.figure))
    expect(series.dataLabels.defer).toBe(false)
    expect((o.xAxis as { categories: string[] }).categories).toEqual(v.chart!.bars.map((b) => b.name))
    // Upright by default (stated, so Highcharts' undo of the phone rule restores it); sideways at or under the width where
    // four of the widest figures and their gaps no longer fit across, with right room for the longest figure.
    expect(o.chart!.inverted).toBe(false)
    expect(SIDEWAYS_MAX_WIDTH).toBe(440)
    const rules = o.responsive!.rules!
    expect(rules).toHaveLength(1)
    expect(rules[0]!.condition!.maxWidth).toBe(SIDEWAYS_MAX_WIDTH)
    expect(rules[0]!.chartOptions!.chart!.inverted).toBe(true)
    expect(rules[0]!.chartOptions!.chart!.spacingRight).toBeGreaterThan(o.chart!.spacingRight!)
    // Sideways the value axis keeps $0, the middle tick where the intervals divide evenly, and the ceiling.
    expect(sidewaysTicks([0, 200, 400, 600, 800])).toEqual([0, 400, 800])
    expect(sidewaysTicks([0, 250, 500, 750])).toEqual([0, 750])
    expect(sidewaysTicks([0, 500, 1000])).toEqual([0, 500, 1000])
  })
})
