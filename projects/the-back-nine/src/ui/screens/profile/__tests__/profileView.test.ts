import { describe, expect, it } from 'vitest'
import { ACCOUNT_KINDS } from '@shared/model'
import { DEV_SEEDS } from '../../../devSeeds'
import { copy } from '../../../copy'
import { cardIdOf, familyView, incomeView, netWorthView, savingsView, type AddMenuView, type DrawerTarget } from '../profileView'

/**
 * Profile → Family, Income, Savings and Net Worth's composer (Act 6 · RC13a; plan RC13's cards and test scenarios): the cards
 * keep B9's input order and the retired / working split, a read-only view carries no write action (plan 4.0), Net Worth
 * says "Invested accounts" and carries both stopgap lines word for word (retyped here by hand: a copy edit must move
 * this pin too), and the Add menus offer every account kind once.
 */

const retired = DEV_SEEDS.retired // two retired people, one traditional IRA
const working = DEV_SEEDS.date // Alex still working, Sam retired; a 401(k) and a Roth IRA by fund

const ids = (v: { readonly cards: readonly { readonly id: string }[] }) => v.cards.map((c) => c.id)
const leaves = (add: AddMenuView): DrawerTarget[] => add.items.flatMap((i) => ('items' in i ? i.items.map((l) => l.target) : [i.target]))

describe('Family', () => {
  it('the Client and Co-client cards, then the home state; a retired person shows the age they stopped', () => {
    const v = familyView(retired)
    expect(ids(v)).toEqual(['person-0', 'person-1', 'state'])
    expect(v.cards[0]!.kind).toBe(copy.profileKindClient)
    expect(v.cards[1]!.kind).toBe(copy.profileKindCoClient)
    expect(v.cards[0]!.rows.find((r) => r.label === copy.profileRowWork)?.value).toBe('Stopped at 65')
    expect(familyView(working).cards[0]!.rows.find((r) => r.label === copy.profileRowWork)?.value).toBe(copy.workStatusWorking)
  })

  it('an unanswered home state says so and names what it means, never a default state', () => {
    const { retirementState: _none, ...noState } = retired
    expect(familyView(noState).cards[2]!.note).toBe(copy.profileStateUnanswered)
    expect(familyView({ ...retired, retirementState: 'PA' }).cards[2]!.note).toBe(copy.stateOptionPA)
  })
})

describe('Income', () => {
  it('a retired household: no Salary and no investment-income-while-working card, a Social Security card each', () => {
    expect(ids(incomeView(retired, false))).toEqual(['ss-0', 'ss-1'])
  })

  it('a working household: Salary for the working person only, then Social Security, then the working-year income, then other income, in the walk’s order', () => {
    const withPension = {
      ...working,
      incomeStreams: [{ ownerIndex: 1, type: 'pension', annualRealToday: 12_000, startAge: 60, colaMode: 'real-flat', survivorPct: 0.5 } as const],
    }
    expect(ids(incomeView(withPension, false))).toEqual(['salary-0', 'ss-0', 'ss-1', 'invest-0', 'income-0'])
  })

  it('Already claiming reads the engine’s own test (the current age has reached the claim age)', () => {
    const claimed = { ...retired, people: [{ ...retired.people[0], socialSecurityClaimAge: 65 }, retired.people[1]] as const }
    const v = incomeView(claimed, false)
    expect(v.cards[0]!.rows.find((r) => r.label === copy.profileRowClaiming)?.value).toBe(copy.profileYes)
    expect(v.cards[1]!.rows.find((r) => r.label === copy.profileRowClaiming)?.value).toBe(copy.profileNo)
  })

  it('the Add income menu offers every kind of other income; a read-only view has none', () => {
    const add = incomeView(working, false).add!
    expect(leaves(add).map((t) => (t.kind === 'new-income' ? t.type : null))).toEqual(['pension', 'rental', 'alimony', 'annuity', 'other'])
    expect(incomeView(working, true).add).toBeNull()
  })
})

describe('Savings', () => {
  it('one card per account whose owner still works; a retired owner’s account carries no deposits', () => {
    expect(ids(savingsView(working, false))).toEqual(['account-0'])
    const card = savingsView(working, false).cards[0]!
    expect(card.rows.map((r) => r.label)).toEqual([copy.accountContributionLabel, copy.accountMatchLabel, copy.profileRowLimit])
  })

  it('nobody working: no cards, no Add menu, the line that says why', () => {
    const v = savingsView(retired, false)
    expect(v.cards).toEqual([])
    expect(v.add).toBeNull()
    expect(v.lines).toEqual([copy.profileSavingsNoneWorking])
  })

  it('read-only: no Add menu', () => {
    expect(savingsView(working, true).add).toBeNull()
  })
})

describe('Net Worth', () => {
  it('the plum band is "Invested accounts" and its total the entered balances’ sum, never "Total Net Worth"', () => {
    const v = netWorthView(working, undefined, false)
    expect(v.bandLabel).toBe('Invested accounts')
    expect(v.bandLabel).not.toMatch(/net worth/i)
    expect(v.total).toBe('$1,100,000')
    expect(v.rows.map((r) => r.id)).toEqual(['account-0', 'account-1'])
    expect(v.rows[0]!.mix).toMatch(/^Mix: the fund VTI \(/)
  })

  it('both stopgap lines, word for word', () => {
    const v = netWorthView(retired, undefined, false)
    expect(v.notes).toContain('B9 doesn’t ask about your home, debts or bank accounts yet.')
    expect(v.notes).toContain('An inherited IRA can’t be entered as its own kind yet; entered as a traditional IRA it reads too rosy.')
  })

  it('aged balances name the year they were entered', () => {
    expect(netWorthView(retired, 2025, false).notes[0]).toBe('Balances as you entered them in 2025; what you hold now may differ.')
  })

  it('an account with no mix says the plan needs one', () => {
    const { manualBlend: _gone, ...bare } = retired.enteredAccounts[0]!
    expect(netWorthView({ ...retired, enteredAccounts: [bare] }, undefined, false).rows[0]!.mix).toBe(copy.profileMixNone)
  })

  it('the Add account menu offers every account kind exactly once, under the four tax treatments; read-only has none', () => {
    const add = netWorthView(retired, undefined, false).add!
    expect(add.items.map((i) => i.label)).toEqual([copy.investBucketPretax, copy.investBucketRoth, copy.investBucketTaxable, copy.investBucketHsa])
    const kinds = leaves(add).map((t) => (t.kind === 'new-account' ? t.accountKind : null))
    expect([...kinds].sort()).toEqual([...ACCOUNT_KINDS].sort())
    expect(netWorthView(retired, undefined, true).add).toBeNull()
  })
})

describe('the card a drawer returns focus to', () => {
  it('a record’s own card; a new record’s card once it has landed', () => {
    expect(cardIdOf({ kind: 'account', index: 1, facet: 'holdings' })).toBe('account-1')
    expect(cardIdOf({ kind: 'new-account', accountKind: 'hsa' })).toBeNull()
    expect(cardIdOf({ kind: 'new-account', accountKind: 'hsa' }, 2)).toBe('account-2')
  })
})
