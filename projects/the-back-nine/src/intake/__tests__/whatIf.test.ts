import { describe, expect, it } from 'vitest'
import {
  applyBundle,
  withBudgetItems,
  withDrawdownPolicy,
  withEnhancedSubsidies,
  withoutBudget,
  withRothConversion,
} from '../whatIf'
import { blendSourceOf, householdStockWeight } from '../intakeMap'
import { contributionCeilingFor } from '../sanity'
import { budgetYearZeroFullTotal, commitBudgetPatch } from '@budget/budgetToSpending'
import { DATE_OFFSET_WINDOW_TOP } from '@engine/dateSearch'
import { DEV_SEEDS } from '@ui/devSeeds'
import { canonicalIdentityToken } from '@shared/model'
import type { BudgetLineItem, DrawdownOrderKey, DrawdownPolicy, EnteredAccount, RothConversionPlan, WhatIfLeverV6 } from '@shared/model'
import type { ScenarioDraft } from '@store/memoryModel'

/**
 * A what-if's bundle applied to a copy of the plan's draft (the workbench plan's U14, KTD10, KTD15, KTD16): every arm
 * writes only its own fields, a gone target is refused by name (R21), and the front-room sheets' writers moved here
 * byte-identical.
 */

const dip = DEV_SEEDS.dip
const date = DEV_SEEDS.date

/** Apply, or fail the test with the refusal. */
function applied(draft: ScenarioDraft, bundle: readonly WhatIfLeverV6[]) {
  const out = applyBundle(draft, bundle)
  if (!out.ok) throw new Error(`[test setup] refused: ${JSON.stringify(out.refusal)}`)
  return out
}

/** Every top-level draft key whose value differs (by canonical token). */
function movedKeys(a: ScenarioDraft, b: ScenarioDraft): string[] {
  const ra = a as unknown as Record<string, unknown>
  const rb = b as unknown as Record<string, unknown>
  const keys = new Set([...Object.keys(ra), ...Object.keys(rb)])
  return [...keys].filter((k) => canonicalIdentityToken(ra[k]) !== canonicalIdentityToken(rb[k])).sort()
}

/** A deep freeze: a write to the plan's draft throws. */
function frozen<T>(v: T): T {
  if (v !== null && typeof v === 'object' && !Object.isFrozen(v)) {
    Object.freeze(v)
    for (const k of Object.keys(v)) frozen((v as Record<string, unknown>)[k])
  }
  return v
}

const line = (over: Partial<BudgetLineItem> & { id: string }): BudgetLineItem & { id: string } => ({
  category: 'food',
  label: 'Groceries',
  annualAmountReal: 9_000,
  tier: 'essentials',
  startYear: 0,
  ...over,
})

describe('applyBundle — each arm moves only its own fields', () => {
  it('an empty bundle returns the plan’s own draft', () => {
    const out = applied(dip, [])
    expect(out.draft).toBe(dip)
    expect(out.stopOffsetYears).toBeUndefined()
  })

  it('the stop year writes nothing to the draft; it turns the calendar year into the offset', () => {
    const out = applied(dip, [{ kind: 'stop-year', calendarYear: dip.startCalendarYear + 3 }])
    expect(out.draft).toBe(dip)
    expect(out.stopOffsetYears).toBe(3)
  })

  it('the stop year’s window: 0 and the top apply; −1 and the top plus 1 are refused by name; an all-retired household is refused', () => {
    const at = (offset: number) => applyBundle(dip, [{ kind: 'stop-year', calendarYear: dip.startCalendarYear + offset }])
    expect(at(0)).toEqual({ ok: true, draft: dip, stopOffsetYears: 0 })
    expect(at(DATE_OFFSET_WINDOW_TOP)).toEqual({ ok: true, draft: dip, stopOffsetYears: DATE_OFFSET_WINDOW_TOP })
    expect(at(-1)).toEqual({ ok: false, refusal: { kind: 'stop-year-outside-window', calendarYear: dip.startCalendarYear - 1, offsetYears: -1 } })
    expect(at(DATE_OFFSET_WINDOW_TOP + 1)).toMatchObject({ ok: false, refusal: { kind: 'stop-year-outside-window' } })
    const retired = DEV_SEEDS.retired
    expect(applyBundle(retired, [{ kind: 'stop-year', calendarYear: retired.startCalendarYear + 2 }])).toEqual({
      ok: false,
      refusal: { kind: 'stop-year-all-retired' },
    })
  })

  it('a spending line lever moves the budget and the reconciled total only, through the plan’s own budget writer', () => {
    const replaced = line({ id: 'line-food', label: 'Living', annualAmountReal: 10_000 })
    const out = applied(dip, [{ kind: 'spending', op: 'replace', line: replaced }])
    expect(movedKeys(dip, out.draft)).toEqual(['annualSpendingReal', 'budget'])
    const expected = dip.budget!.map((l) => (l.id === 'line-food' ? replaced : l))
    expect(out.draft.budget).toEqual(expected)
    expect(out.draft.annualSpendingReal).toBe(budgetYearZeroFullTotal(expected, dip.health.oopMedicalAnnual))
    expect(out.draft.annualSpendingReal).toBe(dip.annualSpendingReal! - 6_000)
  })

  it('add appends a whole line, remove drops one, and several line levers commit once whatever their order', () => {
    const added = line({ id: 'new-line', category: 'gifts', label: 'Grandkids', annualAmountReal: 5_000, tier: 'discretionary' })
    const a = applied(dip, [
      { kind: 'spending', op: 'remove', lineId: 'line-housing' },
      { kind: 'spending', op: 'add', line: added },
    ])
    const b = applied(dip, [
      { kind: 'spending', op: 'add', line: added },
      { kind: 'spending', op: 'remove', lineId: 'line-housing' },
    ])
    expect(a.draft).toEqual(b.draft)
    expect(a.draft.budget!.map((l) => l.id)).toEqual(['line-food', 'line-travel', 'new-line'])
    expect(a.draft.annualSpendingReal).toBe(dip.annualSpendingReal! - 20_000 + 5_000)
  })

  it('the one-figure total moves only the total and its unit, on a draft with no budget; on a budgeted draft it is refused', () => {
    expect(date.budget, '[test setup] date has no budget').toBeUndefined()
    // The tray's row is "dollars a year", so the figure lands under "Each year" (milestone 3's review, round 3): left
    // under the default month, the Living drawer read it as the period gate's receipt.
    const monthly: ScenarioDraft = { ...date, spendEntryPeriod: 'month' }
    const out = applied(monthly, [{ kind: 'spending', op: 'total', annualSpendingReal: 70_000 }])
    expect(movedKeys(monthly, out.draft)).toEqual(['annualSpendingReal', 'spendEntryPeriod'])
    expect(out.draft).toMatchObject({ annualSpendingReal: 70_000, spendEntryPeriod: 'year' })
    expect(applyBundle(dip, [{ kind: 'spending', op: 'total', annualSpendingReal: 70_000 }])).toEqual({
      ok: false,
      refusal: { kind: 'spending-total-on-budget' },
    })
    expect(applyBundle(date, [{ kind: 'spending', op: 'add', line: line({ id: 'x' }) }])).toEqual({
      ok: false,
      refusal: { kind: 'spending-no-budget' },
    })
  })

  it('a bundle that removes every line is refused by name, never the builder’s back-to-one-number escape', () => {
    const removeAll = dip.budget!.map((l): WhatIfLeverV6 => ({ kind: 'spending', op: 'remove', lineId: l.id! }))
    expect(applyBundle(dip, removeAll)).toEqual({ ok: false, refusal: { kind: 'budget-dropped' } })
    // The floor-track household too (its floor pass needs the budget construct).
    const mixed = DEV_SEEDS.datemixed
    expect(applyBundle(mixed, mixed.budget!.map((l): WhatIfLeverV6 => ({ kind: 'spending', op: 'remove', lineId: l.id! })))).toEqual({
      ok: false,
      refusal: { kind: 'budget-dropped' },
    })
  })

  it('deposits move only that account’s deposit, and the employer figures only where the lever overrides them', () => {
    const out = applied(dip, [{ kind: 'deposits', accountId: 'acct-0-401k', annualContribution: 5_000 }])
    expect(movedKeys(dip, out.draft)).toEqual(['enteredAccounts'])
    expect(out.draft.enteredAccounts[0]).toEqual({ ...dip.enteredAccounts[0], annualContribution: 5_000 })
    expect(out.draft.enteredAccounts[1]).toBe(dip.enteredAccounts[1])
    const matched = applied(dip, [{ kind: 'deposits', accountId: 'acct-0-401k', annualContribution: 5_000, employerMatchAnnual: 2_500 }])
    expect(matched.draft.enteredAccounts[0]).toEqual({ ...dip.enteredAccounts[0], annualContribution: 5_000, employerMatchAnnual: 2_500 })
    const wide = DEV_SEEDS.tablewidest
    const hsa = applied(wide, [{ kind: 'deposits', accountId: 'acct-1-hsa', annualContribution: 4_000, hsaEmployerAnnual: 600 }])
    const at = wide.enteredAccounts.findIndex((a) => a.id === 'acct-1-hsa')
    expect(hsa.draft.enteredAccounts[at]).toEqual({ ...wide.enteredAccounts[at], annualContribution: 4_000, hsaEmployerAnnual: 600 })
  })

  it('deposits are refused on a retired owner’s account, and for an employer figure the account’s kind cannot carry', () => {
    expect(applyBundle(date, [{ kind: 'deposits', accountId: 'acct-1-roth-ira', annualContribution: 1_000 }])).toEqual({
      ok: false,
      refusal: { kind: 'deposits-owner-not-working', accountId: 'acct-1-roth-ira' },
    })
    expect(applyBundle(dip, [{ kind: 'deposits', accountId: 'acct-0-401k', annualContribution: 1_000, hsaEmployerAnnual: 500 }])).toEqual({
      ok: false,
      refusal: { kind: 'deposits-field-not-on-kind', accountId: 'acct-0-401k', field: 'hsaEmployerAnnual' },
    })
    expect(applyBundle(dip, [{ kind: 'deposits', accountId: 'acct-1-roth-ira', annualContribution: 1_000, employerMatchAnnual: 500 }])).toEqual({
      ok: false,
      refusal: { kind: 'deposits-field-not-on-kind', accountId: 'acct-1-roth-ira', field: 'employerMatchAnnual' },
    })
  })

  it('deposits over the family-wide ceiling are refused: two IRAs each under the limit alone and over it together', () => {
    const age = date.people[0].currentAge!
    const ceiling = contributionCeilingFor('traditional-ira', age)!
    const ira = (id: string, kind: EnteredAccount['kind']): EnteredAccount => ({
      id,
      ownerIndex: 0,
      kind,
      manualBlend: { kind: 'simple', choice: 'stocks' },
      valueToday: 50_000,
    })
    const plan: ScenarioDraft = { ...date, enteredAccounts: [...date.enteredAccounts, ira('ira-a', 'traditional-ira'), ira('ira-b', 'roth-ira')] }
    const share = Math.floor(ceiling * 0.6)
    // Each alone passes.
    expect(applyBundle(plan, [{ kind: 'deposits', accountId: 'ira-a', annualContribution: share }]).ok).toBe(true)
    expect(applyBundle(plan, [{ kind: 'deposits', accountId: 'ira-b', annualContribution: share }]).ok).toBe(true)
    // Together they are over the one IRA ceiling: refused by name, never trimmed by the run's family scale.
    expect(
      applyBundle(plan, [
        { kind: 'deposits', accountId: 'ira-a', annualContribution: share },
        { kind: 'deposits', accountId: 'ira-b', annualContribution: share },
      ]),
    ).toEqual({ ok: false, refusal: { kind: 'deposits-over-limit', accountId: 'ira-a', rule: 'contribution-over-ceiling' } })
    // A lever that takes the household past the plan's own entered figure on the other account is caught too.
    const entered: ScenarioDraft = {
      ...plan,
      enteredAccounts: plan.enteredAccounts.map((a) => (a.id === 'ira-a' ? { ...a, annualContribution: share } : a)),
    }
    expect(applyBundle(entered, [{ kind: 'deposits', accountId: 'ira-b', annualContribution: share }])).toEqual({
      ok: false,
      refusal: { kind: 'deposits-over-limit', accountId: 'ira-b', rule: 'contribution-over-ceiling' },
    })
  })

  it('the mix writes the household split as every account’s hand mix and clears each ticker; the plan’s accounts are untouched', () => {
    expect(dip.enteredAccounts.every((a) => a.ticker !== undefined), '[test setup] dip’s accounts carry tickers').toBe(true)
    const plan = frozen(structuredClone(dip))
    const out = applied(plan, [{ kind: 'mix', stockPct: 30, bondPct: 60, cashPct: 10 }])
    expect(movedKeys(plan, out.draft)).toEqual(['enteredAccounts'])
    for (const a of out.draft.enteredAccounts) {
      expect(a.ticker).toBeUndefined()
      expect(a.manualBlend).toEqual({ kind: 'exact', stockPct: 30, bondPct: 60, cashPct: 10 })
      expect(blendSourceOf(a, out.draft.tickerClassifications)?.kind).toBe('manual')
    }
    // The one producer of the household mix reads the split: cash folds into bonds (stock ÷ the three).
    expect(householdStockWeight(out.draft)).toBeCloseTo(0.3, 12)
    expect(plan.enteredAccounts.map((a) => a.ticker)).toEqual(['VTI', 'VFIFX'])
  })

  it('the Roth plan sets or strips the key; withdrawal order writes the pair; the regime is the one-key write', () => {
    const plan: RothConversionPlan = { annualAmountReal: 20_000, startYearOffset: 1, years: 3 }
    const roth = applied(dip, [{ kind: 'roth', conversion: { kind: 'plan', plan } }])
    expect(movedKeys(dip, roth.draft)).toEqual(['rothConversion'])
    expect(roth.draft.rothConversion).toEqual(plan)
    const none = applied(dip, [{ kind: 'roth', conversion: { kind: 'none' } }])
    expect('rothConversion' in none.draft).toBe(false)
    expect(movedKeys(dip, none.draft)).toEqual(['rothConversion'])

    const order = applied(dip, [{ kind: 'withdrawal-order', policy: 'custom', drawdownOrder: ['roth', 'pretax', 'taxable'] }])
    expect(movedKeys(dip, order.draft)).toEqual(['drawdownOrder', 'drawdownPolicy'])
    const named = applied(order.draft, [{ kind: 'withdrawal-order', policy: 'taxable-first' }])
    expect('drawdownOrder' in named.draft).toBe(false)
    expect(named.draft.drawdownPolicy).toBe('taxable-first')

    const on = applied(dip, [{ kind: 'aca-subsidy', enhanced: true }])
    expect(movedKeys(dip, on.draft)).toEqual(['enhancedSubsidies'])
    expect(on.draft.enhancedSubsidies).toBe(true)
    const off = applied(on.draft, [{ kind: 'aca-subsidy', enhanced: false }])
    expect('enhancedSubsidies' in off.draft).toBe(false)
  })

  it('one person’s claim age moves only theirs; a claim already in effect, or an age already past, is refused', () => {
    const out = applied(dip, [{ kind: 'claim-age', personIndex: 1, claimAge: 67 }])
    expect(movedKeys(dip, out.draft)).toEqual(['people'])
    expect(out.draft.people[0]).toBe(dip.people[0])
    expect(out.draft.people[1]).toEqual({ ...dip.people[1], socialSecurityClaimAge: 67 })
    // A claim in effect when the plan was built (the run's own t = 0 test: current age ≥ claim age) is a fact.
    const claimed: ScenarioDraft = { ...dip, people: [{ ...dip.people[0], socialSecurityClaimAge: 57 }, dip.people[1]] }
    expect(applyBundle(claimed, [{ kind: 'claim-age', personIndex: 0, claimAge: 70 }])).toEqual({
      ok: false,
      refusal: { kind: 'claim-age-already-claimed', personIndex: 0 },
    })
    // A claim cannot start in a year gone by.
    const older: ScenarioDraft = { ...dip, people: [{ ...dip.people[0], currentAge: 64, socialSecurityClaimAge: 67 }, dip.people[1]] }
    expect(applyBundle(older, [{ kind: 'claim-age', personIndex: 0, claimAge: 63 }])).toEqual({
      ok: false,
      refusal: { kind: 'claim-age-in-the-past', personIndex: 0, claimAge: 63 },
    })
  })
})

describe('applyBundle — a gone target is refused by name, never re-targeted (R21)', () => {
  it('a line or an account no longer in the plan', () => {
    expect(applyBundle(dip, [{ kind: 'spending', op: 'replace', line: line({ id: 'deleted-line' }) }])).toEqual({
      ok: false,
      refusal: { kind: 'line-gone', lineId: 'deleted-line' },
    })
    expect(applyBundle(dip, [{ kind: 'spending', op: 'remove', lineId: 'deleted-line' }])).toEqual({
      ok: false,
      refusal: { kind: 'line-gone', lineId: 'deleted-line' },
    })
    expect(applyBundle(dip, [{ kind: 'deposits', accountId: 'deleted-account', annualContribution: 1 }])).toEqual({
      ok: false,
      refusal: { kind: 'account-gone', accountId: 'deleted-account' },
    })
    // A line deleted and a new one added at its position: the lever still says gone.
    const swapped: ScenarioDraft = { ...dip, budget: dip.budget!.map((l) => (l.id === 'line-food' ? { ...l, id: 'fresh-id' } : l)) }
    expect(applyBundle(swapped, [{ kind: 'spending', op: 'remove', lineId: 'line-food' }])).toEqual({
      ok: false,
      refusal: { kind: 'line-gone', lineId: 'line-food' },
    })
  })

  it('an added line whose id the plan already holds, and two levers on one target, are refused', () => {
    expect(applyBundle(dip, [{ kind: 'spending', op: 'add', line: line({ id: 'line-food' }) }])).toEqual({
      ok: false,
      refusal: { kind: 'line-already-there', lineId: 'line-food' },
    })
    expect(
      applyBundle(dip, [
        { kind: 'claim-age', personIndex: 0, claimAge: 65 },
        { kind: 'claim-age', personIndex: 0, claimAge: 67 },
      ]),
    ).toEqual({ ok: false, refusal: { kind: 'duplicate-target', lever: 'claim-age', target: 'person:0' } })
  })
})

describe('applyBundle never writes the plan’s draft', () => {
  it('every lever kind on a deep-frozen plan', () => {
    const plan = frozen(structuredClone(dip))
    const before = canonicalIdentityToken(plan)
    const out = applyBundle(plan, [
      { kind: 'stop-year', calendarYear: plan.startCalendarYear + 4 },
      { kind: 'spending', op: 'replace', line: line({ id: 'line-food', annualAmountReal: 12_000 }) },
      { kind: 'deposits', accountId: 'acct-0-401k', annualContribution: 6_000 },
      { kind: 'mix', stockPct: 50, bondPct: 50, cashPct: 0 },
      { kind: 'roth', conversion: { kind: 'none' } },
      { kind: 'withdrawal-order', policy: 'pre-tax-first' },
      { kind: 'claim-age', personIndex: 0, claimAge: 66 },
      { kind: 'aca-subsidy', enhanced: true },
    ])
    expect(out.ok).toBe(true)
    expect(canonicalIdentityToken(plan)).toBe(before)
  })
})

describe('the front-room sheets’ writers moved byte-identical (U14: one set of writers)', () => {
  // The expressions `src/ui/editorSheets.tsx` held inline before the move, verbatim.
  const old = {
    budgetApply: (d: ScenarioDraft, items: readonly BudgetLineItem[]) => ({ ...d, ...commitBudgetPatch(items, d.health.oopMedicalAnnual) }),
    budgetEscape: (d: ScenarioDraft) => ({ ...d, budget: undefined }),
    sequencing: (d: ScenarioDraft, policy: DrawdownPolicy, order: readonly DrawdownOrderKey[] | undefined) => {
      const { drawdownOrder: _order, ...rest } = d
      return { ...rest, drawdownPolicy: policy, ...(order !== undefined ? { drawdownOrder: order } : {}) }
    },
    rothApply: (d: ScenarioDraft, plan: RothConversionPlan) => ({ ...d, rothConversion: plan }),
    rothRemove: (d: ScenarioDraft) => {
      const { rothConversion: _plan, ...rest } = d
      return rest
    },
    regime: (d: ScenarioDraft, enhanced: boolean) => {
      const { enhancedSubsidies: _regime, ...rest } = d
      return enhanced ? { ...rest, enhancedSubsidies: true } : rest
    },
  }
  /** Same values AND the same key order (a JSON write keeps insertion order). */
  const same = (a: object, b: object) => {
    expect(a).toStrictEqual(b)
    expect(Object.keys(a)).toEqual(Object.keys(b))
  }
  const drafts: readonly ScenarioDraft[] = [dip, date, DEV_SEEDS.order, DEV_SEEDS.retired, { ...dip, enhancedSubsidies: true }]

  it('each writer equals the expression it replaced, on drafts with and without each key', () => {
    const items = [line({ id: 'a' }), line({ id: 'b', category: 'travel', tier: 'discretionary', annualAmountReal: 3_000 })]
    const plan: RothConversionPlan = { annualAmountReal: 15_000, startYearOffset: 0, years: 5 }
    for (const d of drafts) {
      same(withBudgetItems(d, items), old.budgetApply(d, items))
      same(withoutBudget(d), old.budgetEscape(d))
      same(withDrawdownPolicy(d, 'custom', ['taxable', 'roth', 'pretax']), old.sequencing(d, 'custom', ['taxable', 'roth', 'pretax']))
      same(withDrawdownPolicy(d, 'proportional', undefined), old.sequencing(d, 'proportional', undefined))
      same(withRothConversion(d, plan), old.rothApply(d, plan))
      same(withRothConversion(d, undefined), old.rothRemove(d))
      same(withEnhancedSubsidies(d, true), old.regime(d, true))
      same(withEnhancedSubsidies(d, false), old.regime(d, false))
    }
  })
})
