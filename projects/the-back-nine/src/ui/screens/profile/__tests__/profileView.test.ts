import { describe, expect, it } from 'vitest'
import { ACCOUNT_KINDS } from '@shared/model'
import type { ScenarioDraft } from '@store/memoryModel'
import { workingYearCostStaleNote } from '@intake/workingYearLeftOver'
import { workingYearCostStaleness } from '@intake/workingYearQuote'
import { DEV_SEEDS } from '../../../devSeeds'
import { copy, slots } from '../../../copy'
import { cardIdOf, expensesView, familyView, goalsView, incomeView, netWorthView, savingsView, type AddMenuView, type DrawerTarget } from '../profileView'

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

  // Milestone 3's review, B7: unknown where either age is, never a "No" the draft can't back.
  it('Already claiming reads "Not answered yet" when the claim age or the current age is unknown', () => {
    const { socialSecurityClaimAge: _c, ...noClaim } = retired.people[0]
    const { currentAge: _a, ...noAge } = retired.people[1]
    const v = incomeView({ ...retired, people: [noClaim, noAge] }, false)
    expect(v.cards[0]!.rows.find((r) => r.label === copy.profileRowClaiming)?.value).toBe(copy.profileNotAnswered)
    expect(v.cards[1]!.rows.find((r) => r.label === copy.profileRowClaiming)?.value).toBe(copy.profileNotAnswered)
  })

  // Milestone 3's review, X8: the card carries the start and end and the raise rule the deleted facts page printed.
  it('an other-income card says when it pays with its end, and how it keeps up with inflation; never "Now" past its end', () => {
    const age = retired.people[0].currentAge!
    const base = { ownerIndex: 0, type: 'pension', annualRealToday: 12_000, colaMode: 'real-flat', survivorPct: 0.5 } as const
    const card = (s: Record<string, unknown>) => {
      const c = incomeView({ ...retired, incomeStreams: [{ ...base, ...s } as never] }, false).cards.find((x) => x.id === 'income-0')!
      return { pays: c.rows.find((r) => r.label === copy.profileRowPays)?.value, raise: c.rows.find((r) => r.label === copy.profileRowAgainstInflation)?.value }
    }
    expect(card({ startAge: age - 2, endAge: 70 }).pays).toBe(`Now, through age 70`)
    expect(card({ startAge: age - 2 }).pays).toBe('Now, for life')
    expect(card({ startAge: age + 1 }).pays).toBe(`From age ${age + 1}, for life`)
    expect(card({ startAge: age + 1, endAge: age + 5 }).pays).toBe(`From age ${age + 1} through age ${age + 5}`)
    expect(card({ startAge: age - 6, endAge: age - 1 }).pays).toBe(`Ended at ${age - 1}`)
    expect(card({ startAge: age }).raise).toBe(copy.incomeColaReal)
    expect(card({ startAge: age, colaMode: 'nominal-flat' }).raise).toBe(copy.incomeColaNominal)
    expect(card({ startAge: age, colaMode: 'fixed-pct', colaPct: 0.02 }).raise).toBe('Rises 2% a year')
  })

  it('the Add income menu offers every kind of other income; a read-only view has none', () => {
    const add = incomeView(working, false).add!
    // Gap 5's U4 (R1): an inheritance or gift is the last entry.
    expect(leaves(add).map((t) => (t.kind === 'new-income' ? t.type : t.kind))).toEqual(['pension', 'rental', 'alimony', 'annuity', 'other', 'new-one-time'])
    expect(incomeView(working, true).add).toBeNull()
    // Milestone 3's review, X12's class: no door words where no Add menu is drawn.
    expect(incomeView(working, false).lines).toContain(copy.profileIncomeOtherNone)
    expect(incomeView(working, true).lines).toContain(copy.profileIncomeOtherNoneReadOnly)
    expect(incomeView(working, true).lines).not.toContain(copy.profileIncomeOtherNone)
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

  // Milestone 3's review, round 2: "neither of you is working" only where both said retired.
  it('nobody working and a work status unanswered: the line names whose status is still needed on Family, never "neither of you is working"', () => {
    const { workStatus: _w, ...sam } = retired.people[1]
    expect(savingsView({ ...retired, people: [retired.people[0], sam] } as ScenarioDraft, false).lines).toEqual([slots.profileWorkUnanswered('Sam’s')])
    const { workStatus: _a, ...alex } = retired.people[0]
    expect(savingsView({ ...retired, people: [alex, sam] } as ScenarioDraft, false).lines).toEqual([slots.profileWorkUnanswered('Alex’s and Sam’s')])
  })

  it('read-only: no Add menu', () => {
    expect(savingsView(working, true).add).toBeNull()
  })

  // Milestone 3's review, X12: "Add one with Add saving" only where the Add menu is drawn.
  it('a working household with no account of a working owner: the door words with an Add menu, none on a read-only tab', () => {
    const noAccounts = { ...working, enteredAccounts: [] }
    expect(savingsView(noAccounts, false).lines).toEqual([copy.profileSavingsNoAccounts])
    expect(savingsView(noAccounts, true).lines).toEqual([copy.profileSavingsNoAccountsReadOnly])
    expect(netWorthView(noAccounts, undefined, false).empty).toBe(copy.profileNetWorthNoAccounts)
    expect(netWorthView(noAccounts, undefined, true).empty).toBe(copy.profileNetWorthNoAccountsReadOnly)
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

  it('the stopgap line, word for word (the inherited IRA’s left when its drawer landed, U13)', () => {
    const v = netWorthView(retired, undefined, false)
    expect(v.notes.slice(1)).toEqual(['B9 doesn’t ask about your home, debts or bank accounts yet.'])
  })

  it('aged balances name the year they were entered', () => {
    expect(netWorthView(retired, 2025, false).notes[0]).toBe('Balances as you entered them in 2025; what you hold now may differ.')
  })

  it('an account with no mix says the plan needs one', () => {
    const { manualBlend: _gone, ...bare } = retired.enteredAccounts[0]!
    expect(netWorthView({ ...retired, enteredAccounts: [bare] }, undefined, false).rows[0]!.mix).toBe(copy.profileMixNone)
  })

  // Each page's Add menu pinned to its own kinds (the Act 5 plan's KTD20: the hand list split per page). A kind added to
  // `ACCOUNT_KINDS` reds the first pin until Net Worth decides it, and the second until Savings does: Net Worth holds
  // every account, Savings only a kind that takes deposits (gap 3's inherited IRA sits on the first list alone).
  const kindsOf = (add: AddMenuView) => leaves(add).map((t) => (t.kind === 'new-account' ? t.accountKind : null))
  it('the Add account menu offers every account kind exactly once, under the four tax treatments, then the inherited IRA as its own entry (U13); read-only has none', () => {
    const add = netWorthView(retired, undefined, false).add!
    expect(add.items.map((i) => i.label)).toEqual([copy.investBucketPretax, copy.investBucketRoth, copy.investBucketTaxable, copy.investBucketHsa, copy.investBucketInherited])
    expect([...kindsOf(add)].sort()).toEqual([...ACCOUNT_KINDS].sort())
    expect(netWorthView(retired, undefined, true).add).toBeNull()
  })

  it('the Add saving menu offers each kind that takes deposits exactly once (all seven today), under the same four groups', () => {
    const add = savingsView(working, false).add!
    expect(add.items.map((i) => i.label)).toEqual([copy.investBucketPretax, copy.investBucketRoth, copy.investBucketTaxable, copy.investBucketHsa])
    expect([...kindsOf(add)].sort()).toEqual(['401k', '403b', 'brokerage', 'hsa', 'roth-401k', 'roth-ira', 'traditional-ira'])
  })
})

describe('the card a drawer returns focus to', () => {
  it('a record’s own card; a new record’s card once it has landed', () => {
    expect(cardIdOf({ kind: 'account', index: 1, facet: 'holdings' })).toBe('account-1')
    expect(cardIdOf({ kind: 'new-account', accountKind: 'hsa' })).toBeNull()
    expect(cardIdOf({ kind: 'new-account', accountKind: 'hsa' }, 2)).toBe('account-2')
  })
})

describe('Expenses and Goals (RC13b)', () => {
  const ids = (cards: readonly { readonly id: string }[]) => cards.map((c) => c.id)

  it('a retired household: living expenses and out-of-pocket medical, no Pre-retirement card; Goals with each stop age and Medicare, no money picture', () => {
    const d = DEV_SEEDS.retired
    expect(ids(expensesView(d).cards)).toEqual(['living', 'medical'])
    const goals = goalsView(d)
    expect(ids(goals.cards)).toEqual(['retirement-0', 'retirement-1', 'medicare'])
    expect(goals.cards[0]!.rows[0]!.value).toBe(slots.profileStoppedAt(d.people[0].retirementAge!))
    expect(goals.cards[0]!.target, 'a Retirement card opens the person drawer: one home for the work status').toEqual({ kind: 'person', index: 0 })
  })

  it('a working household: the Pre-retirement card (W and the left-over answer) and the money picture; the quote and coverage under 65', () => {
    const d = DEV_SEEDS.date
    expect(ids(expensesView(d).cards)).toEqual(['living', 'medical', 'working-cost'])
    const goals = goalsView(d)
    expect(ids(goals.cards)).toEqual(['retirement-0', 'retirement-1', 'health', 'medicare', 'money-picture'])
    expect(goals.cards[0]!.rows[0]!.value).toBe(copy.profileFindsDate)
    expect(goals.cards.find((c) => c.id === 'health')!.rows.map((r) => r.label)).toEqual([copy.profileRowPremium, copy.profileRowBenchmark, copy.profileRowCoverage])
    const picture = goals.cards.find((c) => c.id === 'money-picture')!
    expect(picture.target).toEqual({ kind: 'working-cost' })
    expect(picture.rows[0]!.label).toBe(slots.profileLeftOverIn(d.startCalendarYear))
  })

  it('THE W GAP: a working household with no W reads so on its card, and the money picture says what it waits for', () => {
    const { workingYearCost: _w, ...noW } = DEV_SEEDS.date
    const w = expensesView(noW).cards.find((c) => c.id === 'working-cost')!
    expect(w.rows[0]!.value).toBe(copy.assumptionWorkingCostUnanswered)
    const picture = goalsView(noW).cards.find((c) => c.id === 'money-picture')!
    expect(picture.rows).toEqual([])
    expect(picture.note).toBe(copy.profileMoneyPictureNoW)
  })

  // Milestone 3's review, X3: a stale W draws no ledger (it read "Left over in 2026: $16,985" where year 0 runs short).
  it('a STALE W (?seed=datesavedrisenshort): the money picture draws no rows, only the W drawer’s own stale words', () => {
    const d = DEV_SEEDS.datesavedrisenshort
    expect(workingYearCostStaleness(d), '[test setup] the seed’s W is stale').not.toBeNull()
    const picture = goalsView(d).cards.find((c) => c.id === 'money-picture')!
    expect(picture.rows).toEqual([])
    expect(picture.note).toBe(workingYearCostStaleNote(d))
    expect(picture.note).not.toContain('16,985')
  })

  it('a governing budget: the card says the budget sets the figure, with its tier split; the blank medical figure reads "Left blank"', () => {
    const d = DEV_SEEDS.budget
    const living = expensesView(d).cards[0]!
    expect(living.rows[0]!.label).toBe(copy.profileRowBudget)
    expect(living.note).toMatch(/./)
    const blank = { ...d, health: { ...d.health, oopMedicalAnnual: undefined } }
    expect(expensesView(blank).cards[1]!.rows[0]!.value).toBe(copy.workbenchFactBlank)
  })

  // Gap 4's U8: a repeat charged in the first year makes the year-0 figures that year's, and the repeat inside is named.
  it('a repeat in the first year: the figure and the split say "in your first year", and the car inside them is named; none says "a year"', () => {
    const d = DEV_SEEDS.daterepeat
    const living = expensesView(d).cards[0]!
    expect(living.rows[0]!.value).toBe(slots.workbenchFactSpendBudgetFirstYear('118,000'))
    expect(`${living.rows[0]!.label} ${living.rows[0]!.value}`, 'the label names the budget once, the value never repeats it').toBe('Set by your budget $118,000 in your first year')
    expect(living.note).toContain(slots.budgetRepeatInFirstYear('A new car', '40,000', 5, 0))
    expect(living.note).toContain(' in your first year.')
    expect(living.note).not.toContain('a year.')
    expect(expensesView(DEV_SEEDS.budget).cards[0]!.rows[0]!.value, 'no repeat: "a year" as before').toBe(slots.workbenchFactSpendBudget('65,600'))
  })
})
