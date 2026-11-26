/**
 * src/ui/screens/dashboard/balanceSheetView.ts: Dashboard → Balance Sheet's one pure composer (plan
 * docs/plans/6-rightcapital-ui-plan.md, RC16; ref 2.2; `rc-shell/balsheet-01.png`). `BalanceSheet.tsx` draws what this
 * returns and decides nothing.
 *
 * WHAT IT SHOWS. Two folder tabs (RightCapital's Historical left out: B9 keeps no history):
 * - Current: the headline "Your invested accounts total $X" with the balances' premise beside it (Snapshot's own line,
 *   with the aged-balances year where the plan was saved in an earlier year), one column per kind (taxable, pre-tax, Roth,
 *   HSA), each named on the axis with its balance printed, then the stopgap lines; the DETAILS handle opens the kinds'
 *   breakdown under the panel (RightCapital's pull tab), each kind and the total as label and value, then the premise and
 *   the stopgap lines.
 * - Details: the accounts by kind, each kind's total over its accounts, each account named by its owner and kind.
 * NO liabilities and NO net worth anywhere (critique 4): B9 holds no home, debts or bank accounts, so a "net worth" would
 * be the invested total relabelled, which reads richer than it is; the stopgap line says what is missing.
 *
 * ONE FIGURE, ONE DERIVATION: the kinds and their total are `investedKinds` (Snapshot's Invested accounts card's split:
 * each account rounded to the dollar, then summed), and the accounts, the premise and the stopgap lines are Net Worth's
 * own (`netWorthView`), word for word, so this page never prints a third wording of a line two pages already carry
 * (insights 078, 170). Every figure is one the household entered (a fact, so no "~").
 *
 * READ-ONLY (plan 4.0): the page writes nothing; its one door (to Profile → Net Worth, where accounts are added and
 * changed) is drawn only on a tab that can write.
 */
import { KIND_TO_BUCKET } from '@intake/intakeMap'
import type { ScenarioDraft } from '@store/memoryModel'
import { buildYTicks, niceLattice, type YTick } from '@viz/bandData'
import type { KindBar } from '@viz/charts/kindBarsOptions'
import { copy, slots } from '../../copy'
import { formatEnteredDollar, mmAxisFormatterFor } from '../../money'
import { BUCKET_LOOK } from '../investment/investmentView'
import { netWorthView } from '../profile/profileView'
import { investedKinds, type InvestedKindId } from './snapshotView'

export type BalanceTab = 'current' | 'details'

export interface BalanceRow {
  readonly label: string
  readonly value: string
}

export interface BalanceDetailsGroup {
  readonly id: InvestedKindId
  readonly name: string
  readonly total: string
  readonly accounts: readonly { readonly id: string; readonly name: string; readonly balance: string }[]
}

/** The door to Profile → Net Worth; absent on a read-only tab. */
export interface BalanceDoor {
  readonly label: string
}

export type BalanceSheetView =
  | {
      /** No accounts entered: the words, the stopgap lines, the door. */
      readonly kind: 'empty'
      readonly intro: string
      readonly words: string
      readonly notes: readonly string[]
      readonly door: BalanceDoor | null
    }
  | {
      readonly kind: 'kinds'
      readonly intro: string
      /** "Your invested accounts total $X". */
      readonly headline: string
      readonly total: number
      /** The balances' premise, beside the headline (Snapshot's and Net Worth's line, aged year included). */
      readonly asEntered: string
      /** The bars, or null where every account holds $0 (`zeroWords` then says so). */
      readonly chart: { readonly bars: readonly KindBar[]; readonly ticks: readonly YTick[]; readonly title: string; readonly description: string } | null
      readonly zeroWords: string | null
      /** The DETAILS handle's breakdown: each kind and the total, then the premise and the stopgap lines under its list
       *  (Snapshot's Invested accounts card prints both inside its list's card; on the phone this is a full-screen sheet,
       *  so the figures never stand without the words that qualify them). The same strings as `asEntered` and `notes`. */
      readonly breakdown: { readonly title: string; readonly rows: readonly BalanceRow[]; readonly total: BalanceRow; readonly notes: readonly string[] }
      /** The Details tab: each kind with accounts, its accounts by owner. */
      readonly details: { readonly title: string; readonly groups: readonly BalanceDetailsGroup[] }
      /** The stopgap lines (what B9 does not hold yet), under the chart and under the accounts. */
      readonly notes: readonly string[]
      readonly door: BalanceDoor | null
    }

const dollars = (v: number): string => `$${formatEnteredDollar(v)}`

export function balanceSheetView(d: ScenarioDraft, agedBalancesYear: number | undefined, readOnly: boolean): BalanceSheetView {
  const worth = netWorthView(d, agedBalancesYear, readOnly)
  // Net Worth's lines: the premise first, then the stopgap lines (its own docblock's order).
  const [asEntered, ...stopgaps] = worth.notes
  const door = readOnly ? null : { label: copy.balanceSheetChangeAccounts }
  if (d.enteredAccounts.length === 0) {
    return { kind: 'empty', intro: copy.balanceSheetIntro, words: copy.profileNetWorthNoAccountsReadOnly, notes: stopgaps, door }
  }
  const { kinds, total } = investedKinds(d)
  const max = Math.max(...kinds.map((k) => k.value))
  const lattice = niceLattice(max)
  const chart =
    lattice.intervals < 1
      ? null
      : {
          title: copy.balanceSheetChartTitle,
          description: copy.balanceSheetDescription,
          ticks: buildYTicks(lattice, mmAxisFormatterFor(lattice.ceiling)),
          bars: kinds.map(
            (k): KindBar => ({
              id: k.id,
              name: k.label,
              value: k.value,
              figure: dollars(k.value),
              colorIndex: BUCKET_LOOK[k.id].colorIndex,
              pattern: BUCKET_LOOK[k.id].pattern,
              point: slots.taxAllocPoint(k.label, dollars(k.value)),
            }),
          ),
        }
  // Each account's row from Net Worth, grouped by its kind, the first person's accounts before the second's.
  const rowById = new Map(worth.rows.map((r) => [r.id, r]))
  const groups = kinds.flatMap((k): BalanceDetailsGroup[] => {
    const accounts = d.enteredAccounts
      .map((a, index) => ({ a, index }))
      .filter(({ a }) => KIND_TO_BUCKET[a.kind] === k.id)
      .sort((x, y) => x.a.ownerIndex - y.a.ownerIndex || x.index - y.index)
      .map(({ index }) => {
        const row = rowById.get(`account-${index}`)!
        return { id: row.id, name: row.name, balance: row.balance }
      })
    return accounts.length === 0 ? [] : [{ id: k.id, name: k.label, total: dollars(k.value), accounts }]
  })
  return {
    kind: 'kinds',
    intro: copy.balanceSheetIntro,
    headline: slots.balanceSheetTotal(dollars(total)),
    total,
    asEntered: asEntered!,
    chart,
    zeroWords: chart === null ? copy.balanceSheetZero : null,
    breakdown: {
      title: copy.snapshotInvestedTitle,
      rows: kinds.map((k) => ({ label: k.label, value: dollars(k.value) })),
      total: { label: copy.snapshotInvestedTotal, value: dollars(total) },
      notes: [asEntered!, ...stopgaps],
    },
    details: { title: copy.balanceSheetDetailsTitle, groups },
    notes: stopgaps,
    door,
  }
}
