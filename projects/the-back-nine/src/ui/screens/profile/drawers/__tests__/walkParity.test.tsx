// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { useState } from 'react'
import { intakeSteps } from '@intake/questions'
import type { StepApi } from '@intake/stepChecks'
import { AccountEntry } from '@intake/AccountEntry'
import { OtherIncomeEntry } from '@intake/OtherIncomeEntry'
import type { EnteredAccount, IncomeStream } from '@shared/model'
import type { ScenarioDraft } from '@store/memoryModel'
import { DEV_SEEDS } from '../../../../devSeeds'
import { copy } from '../../../../copy'
import { accountFormFromDraft, buildAccountEdit } from '../accountFields'
import { buildPerson, buildState, personFormFrom, stateFormFrom } from '../familyFields'
import { buildSalary, buildSocialSecurity, buildWorkInvest, salaryFormFrom, socialSecurityFormFrom, workInvestFormFrom } from '../incomeFields'
import { buildOtherIncome, otherIncomeFormFrom } from '../otherIncomeFields'

/**
 * EVERY DRAWER FIELD WRITES THE SAME DRAFT FIELD THE WALK WROTE (plan RC13's first test scenario), compared field by field
 * on a seed: the walk's own step body (`intakeSteps`, and the account and income entry forms) is rendered over a stand-in
 * `StepApi`, the same values are typed into it, and the draft it leaves is compared with the drawer's build from the same
 * seed. The walk's components are only rendered here (the drawers import none of them).
 */
afterEach(cleanup)

/** Render a walk step's body over the draft, run each of `steps` (each its own render, so a field a step reveals is
 *  there for the next), return the draft the step left. */
function walk(stepId: string, start: ScenarioDraft, ...steps: readonly (() => void)[]): ScenarioDraft {
  let latest = start
  function Host() {
    const [d, setD] = useState(start)
    latest = d
    const api: StepApi = {
      draft: d,
      update: (m) => setD((prev) => m(prev)),
      commitField: () => {},
      clearTouched: () => {},
      violationsFor: () => [],
    }
    const step = intakeSteps(d).find((s) => s.id === stepId)
    if (step === undefined) throw new Error(`[test setup] no ${stepId} step on this draft`)
    return <>{step.render(api)}</>
  }
  render(<Host />)
  for (const step of steps) act(step)
  return latest
}

/** Type into a walk field as a person does: focus, the text, blur (the walk commits on blur). */
function typeInto(el: HTMLElement, text: string): void {
  fireEvent.focus(el)
  fireEvent.change(el, { target: { value: text } })
  fireEvent.blur(el)
}

const person = (name: string) => screen.getByRole('group', { name })
const retired = DEV_SEEDS.retired // Alex and Sam, both retired
const working = DEV_SEEDS.date // Alex working, Sam retired

describe('Family', () => {
  it('a person’s name, birth year (and the age it derives) and sex: the names step’s writes', () => {
    const walked = walk('names', retired, () => {
      // The group is named by the person's name, so it is found before the name changes.
      const alex = person('Alex')
      typeInto(within(alex).getByLabelText(copy.birthYearLabel), '1958')
      fireEvent.click(within(alex).getByRole('radio', { name: copy.sexFemale }))
      typeInto(within(alex).getByLabelText(copy.nameLabel), 'Alexis')
    })
    const seed = personFormFrom(retired, 0)
    const drawer = buildPerson(retired, 0, seed, { ...seed, name: 'Alexis', birthYear: 1958, sex: 'female' })
    expect(drawer.ok && drawer.draft).toEqual(walked)
  })

  it('still working to retired, with the age work stopped: the work step’s writes', () => {
    const walkedAge = walk(
      'work',
      working,
      () => fireEvent.click(within(person('Alex')).getByRole('radio', { name: copy.workStatusRetired })),
      () => typeInto(within(person('Alex')).getByLabelText(copy.stopAgeLabel), '57'),
    )
    const seed = personFormFrom(working, 0)
    const drawer = buildPerson(working, 0, seed, { ...seed, workStatus: 'retired', retirementAge: 57 })
    expect(drawer.ok && drawer.draft).toEqual(walkedAge)
  })

  it('retired to still working: the work step’s writes', () => {
    const walked = walk('work', retired, () => fireEvent.click(within(person('Sam')).getByRole('radio', { name: copy.workStatusWorking })))
    const seed = personFormFrom(retired, 1)
    const drawer = buildPerson(retired, 1, seed, { ...seed, workStatus: 'working' })
    expect(drawer.ok && drawer.draft).toEqual(walked)
  })

  it('the home state: the state step’s write', () => {
    const walked = walk('retirement-state', retired, () => fireEvent.click(screen.getByRole('radio', { name: copy.stateOptionPA })))
    const seed = stateFormFrom(retired)
    expect(buildState(retired, seed, { state: 'PA' }).draft).toEqual(walked)
  })
})

describe('Income', () => {
  it('a salary: the income step’s write', () => {
    const walked = walk('income', working, () => typeInto(within(person('Alex')).getByLabelText(copy.salaryLabel), '160,000'))
    const seed = salaryFormFrom(working, 0)
    const drawer = buildSalary(working, 0, seed, { pay: 160_000 })
    expect(drawer.ok && drawer.draft).toEqual(walked)
  })

  it('Social Security, the monthly figure and the year it starts: the Social Security step’s writes', () => {
    const walked = walk('social-security', retired, () => {
      typeInto(within(person('Sam')).getByLabelText(copy.ssAmountLabel), '2,150')
      typeInto(within(person('Sam')).getByLabelText(copy.ssClaimLabel), '2029')
    })
    const seed = socialSecurityFormFrom(retired, 1)
    const drawer = buildSocialSecurity(retired, 1, seed, { monthly: 2_150, claimYear: 2029 })
    expect(drawer.ok && drawer.draft).toEqual(walked)
  })

  it('investment income while working: the working-income step’s write', () => {
    const walked = walk('working-income', working, () => typeInto(within(person('Alex')).getByLabelText(copy.workInvestmentLabel), '35,000'))
    const seed = workInvestFormFrom(working, 0)
    const drawer = buildWorkInvest(working, 0, seed, { amount: 35_000 })
    expect(drawer.ok && drawer.draft).toEqual(walked)
  })

  it('a new pension: the other-income entry’s stream, put where the walk’s loop puts it', () => {
    let saved: IncomeStream | undefined
    render(<OtherIncomeEntry draft={retired} onSave={(s) => (saved = s)} onCancel={() => {}} />)
    act(() => {
      fireEvent.click(screen.getByRole('radio', { name: copy.incomeTypePension }))
      typeInto(screen.getByLabelText(copy.incomeAmountLabel), '18,000')
      fireEvent.click(screen.getByRole('radio', { name: copy.incomeTimingLater }))
    })
    act(() => {
      typeInto(screen.getByLabelText(copy.incomeStartAgeLabel), '70')
      fireEvent.click(screen.getByRole('radio', { name: copy.incomeColaNominal }))
      typeInto(screen.getByLabelText(copy.incomeSurvivorLabel), '50')
    })
    act(() => fireEvent.click(screen.getByRole('button', { name: copy.otherIncomeSave })))
    expect(saved, '[test setup] the walk built a stream').toBeDefined()
    const walked: ScenarioDraft = { ...retired, incomeStreams: [...retired.incomeStreams, saved!] }
    const seed = otherIncomeFormFrom(retired, { type: 'pension' })
    const drawer = buildOtherIncome(retired, 'new', seed, { ...seed, annualRealToday: 18_000, receivingNow: false, startAge: 70, colaMode: 'nominal-flat', survivorPct: 0.5 })
    expect(drawer.ok && drawer.draft).toEqual(walked)
  })
})

describe('Savings and Net Worth', () => {
  it('an account’s yearly deposit and match: the account entry’s account, the id carried, put back in its place', () => {
    let saved: EnteredAccount | undefined
    const initial = working.enteredAccounts[0]!
    render(<AccountEntry draft={working} initial={initial} onSave={(a) => (saved = a)} onCancel={() => {}} />)
    act(() => {
      typeInto(screen.getByLabelText(copy.accountContributionLabel), '22,000')
      typeInto(screen.getByLabelText(copy.accountMatchLabel), '6,000')
    })
    act(() => fireEvent.click(screen.getByRole('button', { name: copy.accountSave })))
    expect(saved, '[test setup] the walk built the account').toBeDefined()
    const walkedAccounts = [...working.enteredAccounts]
    walkedAccounts[0] = saved!
    const seed = accountFormFromDraft(working, { index: 0 })
    const drawer = buildAccountEdit(working, 0, seed, { ...seed, annualContribution: 22_000, employerMatchAnnual: 6_000 })
    // The walk's entry asks no fund (it holds a hand-typed mix only); the drawer keeps this account's fund, as it was.
    expect(drawer.ok && drawer.draft.enteredAccounts[0]).toEqual({ ...saved!, ticker: 'VTI' })
    expect(drawer.ok && drawer.draft.enteredAccounts[1]).toEqual(walkedAccounts[1])
  })

  it('a new brokerage account, its balance, cost basis and hand-typed mix: the account entry’s account (its fresh id aside)', () => {
    let saved: EnteredAccount | undefined
    render(<AccountEntry draft={retired} onSave={(a) => (saved = a)} onCancel={() => {}} />)
    act(() => {
      fireEvent.click(screen.getByRole('radio', { name: copy.kindBrokerage }))
    })
    act(() => {
      typeInto(screen.getByLabelText(copy.accountValueLabel), '250,000')
      typeInto(screen.getByLabelText(copy.accountBasisLabel), '180,000')
      typeInto(screen.getByLabelText(copy.classifierStockPct), '70')
      typeInto(screen.getByLabelText(copy.classifierBondPct), '25')
      typeInto(screen.getByLabelText(copy.classifierCashPct), '5')
    })
    act(() => fireEvent.click(screen.getByRole('button', { name: copy.accountSave })))
    expect(saved, '[test setup] the walk built the account').toBeDefined()
    const seed = accountFormFromDraft(retired, { kind: 'brokerage', ownerIndex: 0 })
    const drawer = buildAccountEdit(retired, 'new', seed, { ...seed, valueToday: 250_000, basis: 180_000, legs: { stock: '70', bond: '25', cash: '5' } })
    const { id: _walkId, ...walkedRest } = saved!
    const added = drawer.ok ? drawer.draft.enteredAccounts.at(-1)! : undefined
    const { id: drawerId, ...drawerRest } = added!
    expect(drawerRest).toEqual(walkedRest)
    expect(drawerId, 'a new account is minted an id no account holds').toMatch(/./)
    expect(retired.enteredAccounts.some((a) => a.id === drawerId)).toBe(false)
  })
})
