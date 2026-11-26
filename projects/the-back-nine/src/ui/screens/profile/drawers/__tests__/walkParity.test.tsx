// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ScenarioDraft } from '@store/memoryModel'
import { copy } from '../../../../copy'
import { accountFormFromDraft, buildAccountEdit } from '../accountFields'
import { buildPerson, buildState, personFormFrom, stateFormFrom } from '../familyFields'
import { buildSalary, buildSocialSecurity, buildWorkInvest, salaryFormFrom, socialSecurityFormFrom, workInvestFormFrom } from '../incomeFields'
import { buildOtherIncome, otherIncomeFormFrom } from '../otherIncomeFields'
import { buildLiving, buildMedical, livingFormFrom, medicalFormFrom } from '../expensesFields'
import { buildHealth, healthFormFrom } from '../goalsFields'
import { DrawerFor } from '../../drawerHost'
import type { DrawerTarget } from '../../profileView'
import { profileStore } from '../../__tests__/profileStore'
import { budgetYearZeroFullTotal } from '@budget/budgetToSpending'
import { WALK_PARITY } from '../../../setup/__tests__/walkDrafts.fixture'

/**
 * EVERY DRAWER FIELD WRITES THE SAME DRAFT FIELD THE WALK WROTE (plan RC13's first test scenario), compared field by field.
 * Until Act 6 · RC14 the walk's own step bodies were rendered here beside each drawer; RC14 deleted the walk, so the walk's
 * side is now what it WROTE, recorded from those same steps at RC14's base commit (`walkDrafts.fixture.ts`'s `WALK_PARITY`:
 * each case's starting draft and the draft the walk left). The drawer side starts from the recorded draft, never a dev
 * seed that may move later (DND 012: the expected value is the walk's, never the drawers' own code).
 */
afterEach(cleanup)

/** Type into a field as a person does: focus, the text, blur (the fields commit on blur). */
function typeInto(el: HTMLElement, text: string): void {
  fireEvent.focus(el)
  fireEvent.change(el, { target: { value: text } })
  fireEvent.blur(el)
}

const at = (key: string) => {
  const c = WALK_PARITY[key]
  if (c === undefined) throw new Error(`[test setup] no recorded walk case ${key}`)
  return c
}

describe('Family', () => {
  it('a person’s name, birth year (and the age it derives) and sex: the names step’s writes', () => {
    const { start, walked } = at('person')
    const seed = personFormFrom(start, 0)
    const drawer = buildPerson(start, 0, seed, { ...seed, name: 'Alexis', birthYear: 1958, sex: 'female' })
    expect(drawer.ok && drawer.draft).toEqual(walked)
  })

  it('still working to retired, with the age work stopped: the work step’s writes', () => {
    const { start, walked } = at('workToRetired')
    const seed = personFormFrom(start, 0)
    const drawer = buildPerson(start, 0, seed, { ...seed, workStatus: 'retired', retirementAge: 57 })
    expect(drawer.ok && drawer.draft).toEqual(walked)
  })

  it('retired to still working: the work step’s writes', () => {
    const { start, walked } = at('retiredToWorking')
    const seed = personFormFrom(start, 1)
    const drawer = buildPerson(start, 1, seed, { ...seed, workStatus: 'working' })
    expect(drawer.ok && drawer.draft).toEqual(walked)
  })

  it('the home state: the state step’s write', () => {
    const { start, walked } = at('state')
    expect(buildState(start, stateFormFrom(start), { state: 'PA' }).draft).toEqual(walked)
  })
})

describe('Income', () => {
  it('a salary: the income step’s write', () => {
    const { start, walked } = at('salary')
    const drawer = buildSalary(start, 0, salaryFormFrom(start, 0), { pay: 160_000 })
    expect(drawer.ok && drawer.draft).toEqual(walked)
  })

  it('Social Security, the monthly figure and the year it starts: the Social Security step’s writes', () => {
    const { start, walked } = at('socialSecurity')
    const drawer = buildSocialSecurity(start, 1, socialSecurityFormFrom(start, 1), { monthly: 2_150, claimYear: 2029 })
    expect(drawer.ok && drawer.draft).toEqual(walked)
  })

  it('investment income while working: the working-income step’s write', () => {
    const { start, walked } = at('workInvest')
    const drawer = buildWorkInvest(start, 0, workInvestFormFrom(start, 0), { amount: 35_000 })
    expect(drawer.ok && drawer.draft).toEqual(walked)
  })

  it('a new pension: the other-income entry’s stream, put where the walk’s loop puts it', () => {
    const { start, walked } = at('pension')
    const seed = otherIncomeFormFrom(start, { type: 'pension' })
    const drawer = buildOtherIncome(start, 'new', seed, { ...seed, annualRealToday: 18_000, receivingNow: false, startAge: 70, colaMode: 'nominal-flat', survivorPct: 0.5 })
    expect(drawer.ok && drawer.draft).toEqual(walked)
  })
})

describe('Savings and Net Worth', () => {
  it('an account’s yearly deposit and match: the account entry’s account, the id carried, put back in its place', () => {
    const { start, walked } = at('accountDeposits')
    const seed = accountFormFromDraft(start, { index: 0 })
    const drawer = buildAccountEdit(start, 0, seed, { ...seed, annualContribution: 22_000, employerMatchAnnual: 6_000 })
    // The whole draft, not the accounts alone (milestone 3's review, H8): a stray write anywhere else is caught. The walk's
    // entry asked no fund (it held a hand-typed mix only); the drawer keeps this account's fund, as it was.
    const [first, ...others] = walked.enteredAccounts
    expect(drawer.ok && drawer.draft).toEqual({ ...walked, enteredAccounts: [{ ...first!, ticker: 'VTI' }, ...others] })
  })

  it('a new brokerage account, its balance, cost basis and hand-typed mix: the account entry’s account (its fresh id aside)', () => {
    const { start, walked } = at('newBrokerage')
    const seed = accountFormFromDraft(start, { kind: 'brokerage', ownerIndex: 0 })
    const drawer = buildAccountEdit(start, 'new', seed, { ...seed, valueToday: 250_000, basis: 180_000, legs: { stock: '70', bond: '25', cash: '5' } })
    const { id: _walkId, ...walkedRest } = walked.enteredAccounts.at(-1)!
    const added = drawer.ok ? drawer.draft.enteredAccounts.at(-1)! : undefined
    const { id: drawerId, ...drawerRest } = added!
    // The whole draft, the new account's id aside (milestone 3's review, H8).
    const idAside = (d: ScenarioDraft, rest: typeof walkedRest): ScenarioDraft => ({ ...d, enteredAccounts: [...d.enteredAccounts.slice(0, -1), rest as never] })
    expect(drawer.ok && idAside(drawer.draft, drawerRest)).toEqual(idAside(walked, walkedRest))
    expect(drawerId, 'a new account is minted an id no account holds').toMatch(/./)
    expect(start.enteredAccounts.some((a) => a.id === drawerId)).toBe(false)
  })
})

/** Render a Profile drawer over the real store, run each of `steps` (each its own act), press Save; the store's draft. */
async function drawer(target: DrawerTarget, start: ScenarioDraft, ...steps: readonly (() => void)[]): Promise<ScenarioDraft> {
  const { model } = profileStore(start)
  render(<DrawerFor target={target} model={model} open readOnly={false} onClose={() => {}} onClosed={() => {}} finalFocus={() => null} />)
  for (const step of steps) act(step)
  act(() => fireEvent.click(screen.getByRole('button', { name: copy.profileDrawerSave })))
  await waitFor(() => expect(screen.queryByRole('alert'), 'the drawer refused the Save').toBeNull())
  return model.getSnapshot().draft
}

/** The draft fields an Expenses or Goals drawer writes (the stamps it does not write, the seed's own, are equal anyway). */
const factsOf = (d: ScenarioDraft) => ({
  annualSpendingReal: d.annualSpendingReal,
  spendEntryPeriod: d.spendEntryPeriod,
  budget: d.budget,
  survivorSpendingRatio: d.survivorSpendingRatio,
  health: d.health,
  medicareExtrasByPerson: d.medicareExtrasByPerson,
  workingYearCost: d.workingYearCost,
  workingYearLeftOver: d.workingYearLeftOver,
})

describe('Expenses', () => {
  it('the spending figure and its unit: the spend step’s two writes (the digits typed, then the unit tapped)', () => {
    const { start, walked } = at('spend')
    const seed = livingFormFrom(start)
    const built = buildLiving(start, seed, { ...seed, entered: 7_500, period: 'year' })
    expect(built.ok && factsOf(built.draft)).toEqual(factsOf(walked))
  })

  it('the same through the drawer itself: typed, the unit tapped, Saved', async () => {
    const { start, walked } = at('spend')
    const saved = await drawer({ kind: 'living' }, start, () => {
      typeInto(screen.getByLabelText(copy.spendLabel), '7,500')
      fireEvent.click(screen.getByRole('radio', { name: copy.periodYear }))
    })
    expect(factsOf(saved)).toEqual(factsOf(walked))
  })

  it('a budget line by line: the builder’s Apply (the atomic reconciliation patch), its fresh line’s id aside', async () => {
    const { start, walked } = at('budget')
    const saved = await drawer(
      { kind: 'living' },
      start,
      () => fireEvent.click(screen.getByRole('radio', { name: copy.profileLivingApproachBudget })),
      () => fireEvent.click(screen.getByRole('button', { name: copy.budgetAddLine })),
      () => typeInto(screen.getByLabelText(copy.budgetAmountLabel), '24,000'),
    )
    const noIds = (d: ScenarioDraft) => ({ ...factsOf(d), budget: d.budget?.map(({ id: _id, ...rest }) => rest) })
    expect(walked.budget?.length, '[fixture] the walk applied one line').toBe(1)
    expect(noIds(saved)).toEqual(noIds(walked))
    expect(saved.budget?.[0]?.id, 'the drawer’s line is minted its own id').toMatch(/./)
  })

  it('out-of-pocket medical under a governing budget: the step’s own re-reconciling write', () => {
    const { start, walked } = at('oopUnderBudget')
    const built = buildMedical(start, medicalFormFrom(start), { oop: 6_000 })
    expect(built.ok && factsOf(built.draft)).toEqual(factsOf(walked))
    expect(walked.health.oopMedicalAnnual, '[fixture] the walk wrote the figure').toBe(6_000)
    expect(walked.annualSpendingReal, 'the total re-reconciled in the same write').toBe(budgetYearZeroFullTotal(start.budget!, 6_000))
  })
})

describe('Goals', () => {
  it('the marketplace quote pair: the quote step’s writes', () => {
    const { start, walked } = at('healthQuote')
    const seed = healthFormFrom(start)
    const built = buildHealth(start, seed, { ...seed, enrolled: 1_250, slcsp: 1_050 })
    expect(built.ok && factsOf(built.draft)).toEqual(factsOf(walked))
  })

  it('coverage while the other works: the employer-coverage step’s write', () => {
    const { start, walked } = at('coverage')
    const seed = healthFormFrom(start)
    const built = buildHealth(start, seed, { ...seed, covered: false })
    expect(built.ok && factsOf(built.draft)).toEqual(factsOf(walked))
  })

  it('a person’s own extras figure and the look-back income: the extras fork’s and the look-back step’s writes', async () => {
    const { start, walked } = at('medicare')
    const saved = await drawer(
      { kind: 'medicare' },
      start,
      () => fireEvent.click(document.querySelector<HTMLElement>('[data-extras-person="0"] input[value="entered"]')!),
      () => typeInto(screen.getByLabelText(copy.medicareExtrasAmountLabel), '250'),
      () => {
        typeInto(screen.getByLabelText(copy.irmaaSeedTwoBackLabel), '180,000')
        typeInto(screen.getByLabelText(copy.irmaaSeedOneBackLabel), '175,000')
      },
    )
    expect(factsOf(saved)).toEqual(factsOf(walked))
  })
})

describe('Pre-retirement living expenses (the W step and the money picture, after the walk)', () => {
  it('a stale "yes" answered again: the W step’s write, through the drawer’s own face', async () => {
    const { start, walked } = at('workingCostStaleYes')
    const saved = await drawer({ kind: 'working-cost' }, start, () => fireEvent.click(screen.getByRole('radio', { name: copy.workingCostYes })))
    expect(factsOf(saved)).toEqual(factsOf(walked))
  })

  it('a figure of its own, by the year: "a different figure", the figure typed, the unit tapped', async () => {
    const { start, walked } = at('workingCostOwnFigure')
    const saved = await drawer(
      { kind: 'working-cost' },
      start,
      () => fireEvent.click(screen.getByRole('radio', { name: copy.workingCostDifferent })),
      () => typeInto(screen.getByRole('textbox', { name: copy.workingCostAmountLabel }), '90,000'),
      () => fireEvent.click(screen.getByRole('radio', { name: copy.periodYear })),
    )
    expect(saved.workingYearCost).toMatchObject({ kind: 'entered', amountReal: 90_000, entryPeriod: 'year' })
    expect(factsOf(saved)).toEqual(factsOf(walked))
  })

  it('the left-over question’s "All of it": the money-picture step’s write, the figure on screen stored', async () => {
    const { start, walked } = at('leftOverSaved')
    const saved = await drawer({ kind: 'working-cost' }, start, () => fireEvent.click(screen.getByRole('radio', { name: copy.workingLedgerLeftOverSaved })))
    expect(saved.workingYearLeftOver?.kind, '[fixture] the walk stored a reply').toBe('saved')
    expect(factsOf(saved)).toEqual(factsOf(walked))
  })
})
