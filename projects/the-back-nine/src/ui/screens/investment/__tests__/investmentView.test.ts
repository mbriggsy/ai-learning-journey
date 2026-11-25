import { describe, expect, it } from 'vitest'
import { householdStockWeight, KIND_TO_BUCKET } from '@intake/intakeMap'
import type { EnteredAccount, WhatIfLeverV6 } from '@shared/model'
import type { ScenarioDraft } from '@store/memoryModel'
import { DEV_SEEDS } from '../../../devSeeds'
import { copy, slots } from '../../../copy'
import {
  accountMix,
  assetAllocationView,
  blendedMix,
  mixScopes,
  scopeAccounts,
  taxAllocationView,
  wholePercents,
  type AssetMixView,
  type MixScope,
} from '../investmentView'

/**
 * Investment → Asset Allocation and Tax Allocation's views (Act 6 · RC12; plan RC12's Test scenarios): the current mix is
 * the run's household blend (through `blendSourceOf`, the one home); the by-owner and by-bucket pickers sum to the whole;
 * no return or risk figure exists in the view; the what-if donut reads the lever, never the facts; the cash line shows
 * wherever cash is drawn; every printed percent comes from the one rounding rule.
 */

const base: ScenarioDraft = DEV_SEEDS.buckets
const acct = (a: Partial<EnteredAccount> & Pick<EnteredAccount, 'kind' | 'valueToday'>): EnteredAccount => ({ ownerIndex: 0, ...a })
const exact = (stockPct: number, bondPct: number, cashPct: number) => ({ kind: 'exact', stockPct, bondPct, cashPct }) as const

/** A household whose accounts read their mixes through every branch of `blendSourceOf`: a fund the table knows (whose
 *  parts sum to 97.2), a ticker the household classified, and a hand-entered mix; a ticker'd account's hand mix is a
 *  decoy the run never reads. */
const mixed: ScenarioDraft = {
  ...base,
  enteredAccounts: [
    acct({ id: 'a', kind: 'traditional-ira', valueToday: 400_000, ticker: 'ABALX', manualBlend: exact(0, 0, 100) }),
    acct({ id: 'b', ownerIndex: 1, kind: 'brokerage', valueToday: 250_000, basis: 100_000, ticker: 'ZZZQX' }),
    acct({ id: 'c', kind: 'roth-ira', valueToday: 150_000, manualBlend: exact(90, 5, 5) }),
    acct({ id: 'd', ownerIndex: 1, kind: 'hsa', valueToday: 37_000, manualBlend: exact(33, 33, 34) }),
  ],
  tickerClassifications: { ZZZQX: { kind: 'simple', choice: 'bonds' } },
}

const whatIf = (levers: readonly WhatIfLeverV6[] = []) => ({ name: copy.probabilityPickNew, levers })
const mixView = (d: ScenarioDraft, scope: MixScope = 'all', levers: readonly WhatIfLeverV6[] = []): AssetMixView => {
  const v = assetAllocationView({ draft: d, scope, whatIf: whatIf(levers) })
  if (v.kind !== 'mix') throw new Error(`expected a mix, got ${JSON.stringify(v)}`)
  return v
}

describe('wholePercents — the one rounding rule', () => {
  it('sums to 100 by largest remainder, the earlier part first on a tie', () => {
    expect(wholePercents([0.625, 0.3, 0.075])).toEqual([63, 30, 7])
    expect(wholePercents([1 / 3, 1 / 3, 1 / 3])).toEqual([34, 33, 33])
    expect(wholePercents([0.6, 0.3, 0.1])).toEqual([60, 30, 10])
    expect(wholePercents([0.994, 0.003, 0.003])).toEqual([100, 0, 0])
  })

  it('float dust never moves a point (0.1 + 0.2 reads 30, not 31)', () => {
    expect(wholePercents([0.1 + 0.2, 0.7 - 1e-12, 0])).toEqual([30, 70, 0])
  })
})

describe('Asset Allocation — the current mix is the run’s', () => {
  it('the drawn stock share equals householdStockWeight to the float, through every branch of blendSourceOf', () => {
    const v = mixView(mixed)
    const run = householdStockWeight(mixed)!
    const drawn = v.current.slices.find((s) => s.id === 'stock')!.share
    expect(drawn).toBeCloseTo(run, 12)
    // The fund's own parts, over their own sum (97.2): the ticker'd account's hand mix (all cash) is never read.
    expect(accountMix(mixed.enteredAccounts[0]!, mixed.tickerClassifications)).toEqual({ stock: 58.6 / 97.2, bond: 32.4 / 97.2, cash: 6.2 / 97.2 })
    expect(accountMix(mixed.enteredAccounts[1]!, mixed.tickerClassifications)).toEqual({ stock: 0, bond: 1, cash: 0 })
  })

  it('the centre prints stocks against bonds and cash together, the parts’ own printed figures', () => {
    const v = mixView(mixed)
    const p = v.current.pcts
    expect(p.stock + p.bond + p.cash).toBe(100)
    expect(v.current.centre).toBe(slots.assetCentre(p.stock, p.bond + p.cash))
    expect(v.rows.map((r) => r.current)).toEqual([slots.assetPct(p.stock), slots.assetPct(p.bond), slots.assetPct(p.cash)])
  })

  it('a 0% part draws no slice and still prints in the table', () => {
    const allStock: ScenarioDraft = { ...base, enteredAccounts: [acct({ kind: 'roth-ira', valueToday: 10_000, manualBlend: exact(100, 0, 0) })] }
    const v = mixView(allStock)
    expect(v.current.slices.map((s) => s.id)).toEqual(['stock'])
    expect(v.rows.map((r) => r.current)).toEqual(['100%', '0%', '0%'])
  })

  it('a part that PRINTS 0% draws no slice either (a sliver under half a point, never a slice labelled "0%")', () => {
    const sliver: ScenarioDraft = { ...base, enteredAccounts: [acct({ kind: 'roth-ira', valueToday: 10_000, manualBlend: exact(99.4, 0.3, 0.3) })] }
    const v = mixView(sliver)
    expect(v.current.pcts).toEqual({ stock: 100, bond: 0, cash: 0 })
    expect(v.current.slices.map((s) => s.id)).toEqual(['stock'])
    expect(v.current.slices.every((s) => s.pct > 0)).toBe(true)
  })
})

describe('Asset Allocation — the pickers', () => {
  it('each person’s and each bucket’s accounts, by dollars, sum to the whole', () => {
    const scopes = mixScopes(mixed).map((s) => s.value)
    expect(scopes).toEqual(['all', 'owner:0', 'owner:1', 'bucket:taxable', 'bucket:pretax', 'bucket:roth', 'bucket:hsa'])
    const whole = blendedMix(mixed.enteredAccounts, mixed.tickerClassifications)!
    for (const family of ['owner:', 'bucket:']) {
      const parts = scopes.filter((s) => s.startsWith(family)).map((s) => blendedMix(scopeAccounts(mixed, s), mixed.tickerClassifications)!)
      expect(parts.reduce((t, p) => t + p.total, 0)).toBe(whole.total)
      for (const part of ['stock', 'bond', 'cash'] as const) {
        const dollars = parts.reduce((t, p) => t + p.mix[part] * p.total, 0)
        expect(dollars).toBeCloseTo(whole.mix[part] * whole.total, 6)
      }
    }
  })

  it('a scope no longer offered falls back to all accounts; a one-owner, one-bucket household offers only all', () => {
    expect(mixView(mixed, 'owner:7').scope).toBe('all')
    expect(mixScopes(DEV_SEEDS.retired).map((s) => s.value)).toEqual(['all'])
  })

  it('a bucket’s picker reads only that bucket’s accounts, each through KIND_TO_BUCKET', () => {
    expect(scopeAccounts(mixed, 'bucket:pretax').every((a) => KIND_TO_BUCKET[a.kind] === 'pretax')).toBe(true)
    expect(mixView(mixed, 'bucket:taxable').current.pcts).toEqual({ stock: 0, bond: 100, cash: 0 })
  })

  it('a scope narrower than all accounts says the plan grows every account at the one household mix (the all-accounts stock share)', () => {
    const allStock = mixView(mixed).current.pcts.stock
    for (const scope of ['owner:1', 'bucket:taxable'] as const) {
      const v = mixView(mixed, scope)
      expect(v.scope).toBe(scope)
      expect(v.notes[0]).toBe(slots.assetOneMixLine(allStock))
      expect(v.notes).toContain(copy.assetCashLine)
    }
    expect(mixView(mixed).notes).toEqual([copy.assetOneSplitNote, copy.assetCashLine])
  })
})

describe('Asset Allocation — the what-if side', () => {
  const lever: WhatIfLeverV6 = { kind: 'mix', stockPct: 80, bondPct: 15, cashPct: 5 }

  it('the what-if donut reads the lever, never the facts', () => {
    const a = mixView(mixed, 'all', [lever])
    const b = mixView(DEV_SEEDS.retired, 'all', [lever])
    expect(a.whatIf).toEqual(b.whatIf)
    expect(a.whatIf.kind === 'mix' && a.whatIf.donut.pcts).toEqual({ stock: 80, bond: 15, cash: 5 })
    expect(a.whatIf.kind === 'mix' && a.whatIf.from).toBe(slots.assetWhatIfFrom(copy.probabilityPickNew))
  })

  it('no what-if: the words say which, and the Detail shows no shift; a what-if with no mix lever says it keeps the plan’s mix', () => {
    const none = mixView(mixed)
    expect(none.whatIf).toEqual({ kind: 'none', words: copy.assetNoWhatIfOpen })
    expect(none.rows.every((r) => r.whatIf === null)).toBe(true)
    expect(none.detail.axisMax).toBeNull()
    const other = mixView(mixed, 'all', [{ kind: 'aca-subsidy', enhanced: false }])
    expect(other.whatIf).toEqual({ kind: 'none', words: copy.assetNoWhatIfMix })
  })

  it('the shifts are the printed figures’ own difference, on a symmetric scale of whole tens', () => {
    const v = mixView(DEV_SEEDS.retired, 'all', [lever])
    expect(v.detail.rows.map((r) => r.shift)).toEqual([20, -15, -5])
    expect(v.detail.rows.map((r) => r.shiftText)).toEqual(['+20%', '−15%', '−5%'])
    expect(v.detail.axisMax).toBe(20)
    expect(v.detail.rows.map((r) => r.growsLike)).toEqual([copy.assetStocks, copy.assetBonds, copy.assetBonds])
  })
})

describe('Asset Allocation — honesty', () => {
  it('no return or risk figure exists anywhere in the view', () => {
    const text = JSON.stringify(mixView(mixed, 'all', [{ kind: 'mix', stockPct: 50, bondPct: 40, cashPct: 10 }]))
    expect(/return|deviation|volatil|risk|σ|sigma/i.test(text.replace(copy.assetCashLine, ''))).toBe(false)
  })

  it('the cash line shows wherever cash is drawn (both tabs read the same notes)', () => {
    const v = mixView(mixed)
    expect(v.rows.some((r) => r.part === 'cash')).toBe(true)
    expect(v.notes).toContain(copy.assetCashLine)
    expect(v.notes).toContain(copy.assetOneSplitNote)
  })

  it('an account with no mix: no donut, each such account named (never a default split)', () => {
    const d: ScenarioDraft = { ...mixed, tickerClassifications: {} }
    const v = assetAllocationView({ draft: d, scope: 'all', whatIf: whatIf() })
    expect(householdStockWeight(d)).toBeNull()
    expect(v).toEqual({ kind: 'words', words: [slots.assetUnresolved(['Sam’s Brokerage / taxable'], false)] })
  })

  it('no accounts, or accounts holding $0: the words, no donut', () => {
    expect(assetAllocationView({ draft: { ...base, enteredAccounts: [] }, scope: 'all', whatIf: whatIf() })).toEqual({ kind: 'words', words: [copy.assetNoAccounts] })
    const zero = { ...base, enteredAccounts: [acct({ kind: 'roth-ira', valueToday: 0, manualBlend: exact(60, 40, 0) })] }
    expect(assetAllocationView({ draft: zero, scope: 'all', whatIf: whatIf() })).toEqual({ kind: 'words', words: [copy.assetZero] })
  })
})

describe('Tax Allocation', () => {
  it('each bucket that holds an account, in RightCapital’s order, its balances summed; the buckets sum to the whole', () => {
    const v = taxAllocationView(mixed, null, undefined)
    if (v.kind !== 'buckets') throw new Error('expected buckets')
    expect(v.buckets.map((b) => [b.id, b.total])).toEqual([
      ['taxable', 250_000],
      ['pretax', 400_000],
      ['roth', 150_000],
      ['hsa', 37_000],
    ])
    expect(v.buckets.reduce((t, b) => t + b.share, 0)).toBeCloseTo(1, 12)
    expect(v.total).toBe('$837,000')
    expect(v.list).toBeNull()
  })

  it('picking a bucket lists its accounts by owner and kind; a bucket the plan no longer holds lists nothing', () => {
    const v = taxAllocationView(DEV_SEEDS.buckets, 'roth', undefined)
    if (v.kind !== 'buckets') throw new Error('expected buckets')
    expect(v.list).toEqual({ title: slots.taxAllocListTitle(copy.investBucketRoth, 1), rows: [{ name: 'Alex’s Roth IRA', figure: '$200,000' }] })
    const gone = taxAllocationView(DEV_SEEDS.buckets, 'hsa', undefined)
    expect(gone.kind === 'buckets' && gone.picked).toBeNull()
  })

  it('the entered balances carry Snapshot’s two lines beside the same sums: as entered (in the aged year where one is given) and what B9 does not ask about', () => {
    const fresh = taxAllocationView(mixed, null, undefined)
    const aged = taxAllocationView(mixed, null, 2025)
    if (fresh.kind !== 'buckets' || aged.kind !== 'buckets') throw new Error('expected buckets')
    expect(fresh.notes).toEqual([copy.snapshotInvestedAsEntered, copy.snapshotInvestedStopgap])
    expect(aged.notes).toEqual([slots.snapshotInvestedAsEnteredIn(2025), copy.snapshotInvestedStopgap])
  })

  it('cents: each account rounds first, so the listed accounts sum to their part and the parts to the hole’s total', () => {
    const cents: ScenarioDraft = {
      ...base,
      enteredAccounts: [
        acct({ kind: 'brokerage', valueToday: 1_000.6, basis: 500 }),
        acct({ kind: 'traditional-ira', valueToday: 2_000.3 }),
        acct({ kind: 'traditional-ira', valueToday: 3_000.3 }),
      ],
    }
    const v = taxAllocationView(cents, 'pretax', undefined)
    if (v.kind !== 'buckets') throw new Error('expected buckets')
    expect(v.buckets.map((b) => b.figure)).toEqual(['$1,001', '$5,000'])
    expect(v.list?.rows.map((r) => r.figure)).toEqual(['$2,000', '$3,000'])
    expect(v.total).toBe('$6,001')
  })

  it('no accounts, or accounts holding $0: Tax Allocation’s own words (it draws no mix)', () => {
    expect(taxAllocationView({ ...base, enteredAccounts: [] }, null, undefined)).toEqual({ kind: 'words', words: [copy.taxAllocNoAccounts] })
    const zero = { ...base, enteredAccounts: [acct({ kind: 'roth-ira', valueToday: 0, manualBlend: exact(60, 40, 0) })] }
    expect(taxAllocationView(zero, null, undefined)).toEqual({ kind: 'words', words: [copy.taxAllocZero] })
    expect(copy.taxAllocNoAccounts).not.toMatch(/mix/)
    expect(copy.taxAllocZero).not.toMatch(/mix/)
  })

  it('patterns and colours: the withdrawal stacks’ own, never colour alone', () => {
    const v = taxAllocationView(mixed, null, undefined)
    if (v.kind !== 'buckets') throw new Error('expected buckets')
    expect(v.buckets.map((b) => `${b.colorIndex}:${b.pattern}`)).toEqual(['0:solid', '2:hatch', '1:dots', '4:lines'])
  })
})
