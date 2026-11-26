// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { medicareExtrasTypicalMonthly } from '@engine/constants/health'
import { formatMoney } from '@intake/moneyFormat'
import { OOP_MEDICAL_TYPICAL_HOUSEHOLD } from '@intake/referenceData'
import { intakeStepIds, writeMedicareExtras } from '@intake/steps'
import type { MemoryModel, ScenarioDraft } from '@store/memoryModel'
import { DEV_SEEDS } from '../../../../devSeeds'
import { copy, slots } from '../../../../copy'
import { setupPage } from '../../../setup/stepperView'
import { profileStore } from '../../__tests__/profileStore'
import { DrawerFor } from '../../drawerHost'
import type { DrawerTarget } from '../../profileView'
import { buildLiving, livingFormFrom } from '../expensesFields'
import { SetupPeriodContext, type SetupPeriod } from '../setupPeriod'

/**
 * THE DELETED WALK'S STEP-BODY LAWS, ON THEIR KEPT HOMES (Act 6 · RC14 deleted `questions.tsx`; its battery,
 * `questions.test.tsx`, ported here): the Profile drawers the first-run stepper and the Profile pages both open. Each arm
 * is a law that keeps a wrong number or a silent default out of the plan: the work-status branch (the stop age only for
 * a retired person, at or under the current age legal; retired to working clears it and re-opens pay), the one
 * birth-year-to-age derivation, Social Security's monthly figure and claim year shown back as entered with the full
 * retirement age and the claim window, working-year income per person with the retired slot zeroed, the out-of-pocket
 * hint and the calm M > S note, the state picker's honest roster and its leave-it-out spend help, and the Medicare
 * extras' standing line (after setup only). The sequence gates (which steps are asked) live in
 * `src/intake/__tests__/steps.test.ts`; the spend step's period discipline is the stepper's own.
 */
afterEach(cleanup)

const AFTER_SETUP = null

/** Render one drawer over the real store (`profileStore`), inside the stepper's period context when `setup` is given. */
function open(target: DrawerTarget, start: ScenarioDraft | MemoryModel, setup: SetupPeriod | null = AFTER_SETUP) {
  const store = 'getSnapshot' in start ? { model: start } : profileStore(start)
  const drawer = <DrawerFor target={target} model={store.model} open readOnly={false} onClose={() => {}} onClosed={() => {}} finalFocus={() => null} />
  const wrap = (node: ReactNode) => (setup === null ? node : <SetupPeriodContext.Provider value={setup}>{node}</SetupPeriodContext.Provider>)
  render(<>{wrap(drawer)}</>)
  const draft = () => store.model.getSnapshot().draft
  const save = () => act(() => fireEvent.click(screen.getByRole('button', { name: copy.profileDrawerSave })))
  return { model: store.model, draft, save, dialog: screen.getByRole('dialog') }
}

/** Type as a person does: focus, the text, the blur that commits it. */
function type(field: HTMLElement, text: string) {
  act(() => field.focus())
  fireEvent.change(field, { target: { value: text } })
  act(() => field.blur())
}

async function pick(label: string, option: string) {
  const user = userEvent.setup()
  await user.click(screen.getByRole('combobox', { name: label }))
  await user.click(await screen.findByRole('option', { name: option }))
}

const retired = DEV_SEEDS.retired // Alex 1960 (66) and Sam 1961 (65), both retired; no state, no out-of-pocket figure
const working = DEV_SEEDS.date // Alex 58 working, Sam 60 retired
const withPerson = (d: ScenarioDraft, i: 0 | 1, patch: Partial<ScenarioDraft['people'][0]>): ScenarioDraft => {
  const people: [ScenarioDraft['people'][0], ScenarioDraft['people'][1]] = [d.people[0], d.people[1]]
  people[i] = { ...people[i], ...patch }
  return { ...d, people }
}

describe('the work-status branch (asked, never inferred): the person drawer', () => {
  it('choosing retired opens the stop age; a stop age at the current age is legal and saves, the pay zeroed', async () => {
    // Sam, 65, working and owning no account (so no deposit rule rides the move).
    const start = withPerson(retired, 1, { workStatus: 'working', retirementAge: undefined, earnedIncomeReal: 90_000 })
    const d = open({ kind: 'person', index: 1 }, start)
    expect(screen.queryByLabelText(copy.stopAgeLabel), 'a working person is asked no stop age').toBeNull()
    await pick(copy.workStatusLegend, copy.workStatusRetired)
    type(screen.getByLabelText(copy.stopAgeLabel), '65')
    d.save()
    expect(within(d.dialog).queryByRole('alert'), 'a stop age at the current age is legal').toBeNull()
    expect(d.draft().people[1]).toMatchObject({ workStatus: 'retired', retirementAge: 65, earnedIncomeReal: 0 })
  })

  it('a still-working person is never asked a retirement date, and the draft holds none (the placeholder is intakeMap’s)', () => {
    const d = open({ kind: 'person', index: 0 }, working)
    expect(d.draft().people[0].workStatus, '[test setup]').toBe('working')
    expect(screen.queryByLabelText(copy.stopAgeLabel)).toBeNull()
    expect(d.draft().people[0].retirementAge).toBeUndefined()
  })

  it('retired to working clears the stale stop age and re-opens the pay question', async () => {
    const d = open({ kind: 'person', index: 1 }, retired)
    expect(screen.getByLabelText(copy.stopAgeLabel)).toHaveValue('63')
    expect(intakeStepIds(d.draft()), '[test setup] an all-retired household is asked no pay').not.toContain('income')
    await pick(copy.workStatusLegend, copy.workStatusWorking)
    expect(screen.queryByLabelText(copy.stopAgeLabel)).toBeNull()
    d.save()
    expect(within(d.dialog).queryByRole('alert')).toBeNull()
    expect(d.draft().people[1].workStatus).toBe('working')
    expect(d.draft().people[1].retirementAge).toBeUndefined()
    expect(d.draft().people[1].earnedIncomeReal).toBeUndefined()
    expect(intakeStepIds(d.draft())).toContain('income')
  })

  it('a birth year writes birthYear AND currentAge = startCalendarYear − birthYear (one derivation site)', () => {
    const d = open({ kind: 'person', index: 0 }, retired)
    type(screen.getByLabelText(copy.birthYearLabel), '1961')
    d.save()
    expect(d.draft().people[0].birthYear).toBe(1961)
    expect(d.draft().startCalendarYear, '[test setup]').toBe(2026)
    expect(d.draft().people[0].currentAge).toBe(65)
  })
})

describe('Social Security: the monthly figure and the claim YEAR, shown back as entered', () => {
  it('the stored yearly figure shows as the monthly one (÷12), the stored claim age as its year, with the age echoed', () => {
    open({ kind: 'social-security', index: 0 }, withPerson(retired, 0, { pia: 36_000, socialSecurityClaimAge: 70 }))
    expect(screen.getByLabelText(copy.ssAmountLabel)).toHaveValue('3,000')
    expect(screen.getByLabelText(copy.ssClaimLabel)).toHaveValue('2030') // 1960 + 70, no thousands separator on a year
    expect(screen.getByText(slots.ssClaimAge(70))).toBeInTheDocument()
  })

  it('states the person’s full retirement age from the birth year, in years AND months off the cohort', () => {
    const on = open({ kind: 'social-security', index: 0 }, retired) // 1960: 67 (804 months)
    expect(on.dialog).toHaveTextContent(slots.fraEcho(804))
    cleanup()
    const off = open({ kind: 'social-security', index: 0 }, withPerson(retired, 0, { birthYear: 1959, currentAge: 67 }))
    expect(slots.fraEcho(802)).toBe('Your full retirement age is 66 years, 10 months.')
    expect(off.dialog).toHaveTextContent(slots.fraEcho(802))
  })

  it('hints the 62–70 claim window before a year is entered, then echoes the age once one lands', () => {
    open({ kind: 'social-security', index: 0 }, withPerson(retired, 0, { socialSecurityClaimAge: undefined })) // 1960: 2022 to 2030
    expect(screen.getByText(slots.ssClaimWindow(2022, 2030))).toBeInTheDocument()
    type(screen.getByLabelText(copy.ssClaimLabel), '2027')
    expect(screen.getByText(slots.ssClaimAge(67))).toBeInTheDocument()
    expect(screen.queryByText(slots.ssClaimWindow(2022, 2030))).toBeNull()
  })
})

describe('working-year income (the §3b override source, never a salary echo)', () => {
  it('writes per person and ZEROES the retired member’s slot, so the stored pair has no hole', () => {
    const start: ScenarioDraft = { ...working, health: { ...working.health, workingYearInvestmentByPerson: undefined } }
    const d = open({ kind: 'work-invest', index: 0 }, start)
    type(screen.getByLabelText(copy.workInvestmentLabel), '30,000')
    d.save()
    expect(d.draft().health.workingYearInvestmentByPerson).toEqual([30_000, 0])
  })
})

describe('the spending figure', () => {
  it('a figure in the month view is stored as the canonical YEARLY figure (×12)', () => {
    const start: ScenarioDraft = { ...retired, spendEntryPeriod: 'month' }
    const seed = livingFormFrom(start)
    const built = buildLiving(start, seed, { ...seed, entered: 7_000 })
    expect(built.ok && built.draft.annualSpendingReal).toBe(84_000)
  })
})

describe('out-of-pocket medical', () => {
  const hint = () =>
    slots.oopHint(formatMoney(OOP_MEDICAL_TYPICAL_HOUSEHOLD.annual), formatMoney(OOP_MEDICAL_TYPICAL_HOUSEHOLD.federalAverageApproxAnnual))

  it('shows the grounded below-average hint while the field is empty, and hides it once a figure is entered', () => {
    const d = open({ kind: 'medical' }, retired)
    expect(screen.getByText(hint())).toBeInTheDocument()
    type(screen.getByLabelText(copy.oopLabel), '5,000')
    expect(screen.queryByText(hint())).toBeNull()
    d.save()
    expect(d.draft().health.oopMedicalAnnual).toBe(5_000)
  })

  it('the budgetless M > S note quotes both yearly figures, clears at M = S, and never blocks Save (the engine clamps)', () => {
    const d = open({ kind: 'medical' }, { ...retired, annualSpendingReal: 6_000 })
    const NOTE = /is more than your whole spending figure/
    const box = () => screen.getByLabelText(copy.oopLabel)
    expect(screen.queryByText(NOTE)).toBeNull()
    type(box(), '6,500')
    expect(screen.getByText(slots.oopExceedsSpend(formatMoney(6_500), formatMoney(6_000)))).toBeInTheDocument()
    expect(screen.queryByRole('alert'), 'a calm note, never a refusal').toBeNull()
    type(box(), '6,000')
    expect(screen.queryByText(NOTE)).toBeNull()
    type(box(), '6,500')
    expect(screen.getByText(NOTE)).toBeInTheDocument()
    d.save()
    expect(screen.queryByRole('alert')).toBeNull()
    expect(d.draft().health.oopMedicalAnnual, 'kept as typed').toBe(6_500)
  })
})

describe('the home state (a changeable best guess)', () => {
  const STATE_ARMS = [copy.stateOptionNC, copy.stateOptionPA, copy.stateOptionFL, copy.stateOptionElsewhere]

  it('offers exactly NC, PA, FL and somewhere else, with nothing pre-selected', async () => {
    open({ kind: 'state' }, retired)
    const box = screen.getByRole('combobox', { name: copy.profileStateLabel })
    expect(box).toHaveTextContent(copy.profileNotAnswered)
    await userEvent.setup().click(box)
    const options = await screen.findAllByRole('option')
    expect(options.map((o) => o.textContent?.trim())).toEqual(STATE_ARMS)
    for (const o of options) expect(o).not.toHaveAttribute('aria-selected', 'true')
  })

  it('a priced state is written; "somewhere else" persists an explicit elsewhere, never absence', async () => {
    for (const [label, state] of [
      [copy.stateOptionNC, 'NC'],
      [copy.stateOptionPA, 'PA'],
      [copy.stateOptionFL, 'FL'],
      [copy.stateOptionElsewhere, 'elsewhere'],
    ] as const) {
      const d = open({ kind: 'state' }, retired)
      expect(d.draft().retirementState, '[test setup] never asked').toBeUndefined()
      await pick(copy.profileStateLabel, label)
      d.save()
      expect(d.draft().retirementState).toBe(state)
      cleanup()
    }
  })

  it('an unanswered state blocks nothing and writes no silent default', () => {
    const d = open({ kind: 'state' }, retired)
    d.save()
    expect(screen.queryByRole('alert')).toBeNull()
    expect(d.draft().retirementState).toBeUndefined()
  })

  it('a priced state flips the spend help to leave the state bill OUT; elsewhere or unanswered keeps the keep-it-inside words verbatim', async () => {
    const priced = open({ kind: 'state' }, retired)
    await pick(copy.profileStateLabel, copy.stateOptionNC)
    priced.save()
    cleanup()
    open({ kind: 'living' }, priced.model)
    expect(screen.getByText(copy.spendHelpStatePriced)).toBeInTheDocument()
    expect(screen.queryByText(copy.spendHelp)).toBeNull()
    cleanup()
    for (const start of [{ ...retired, retirementState: 'elsewhere' } as const, retired]) {
      open({ kind: 'living' }, start)
      expect(screen.getByText(copy.spendHelp)).toBeInTheDocument()
      expect(screen.queryByText(copy.spendHelpStatePriced)).toBeNull()
      cleanup()
    }
  })
})

describe('the Medicare extras: the standing line for an unanswered fork (after setup only)', () => {
  const fig = formatMoney(Math.round(medicareExtrasTypicalMonthly()))
  const { medicareExtrasByPerson: _answered, ...unanswered } = retired
  const section = (i: 0 | 1) => document.querySelector<HTMLElement>(`[data-extras-person="${i}"]`)!

  it('after setup, an unanswered fork names the funded typical in-sentence, and checks no arm on the reader’s behalf', () => {
    open({ kind: 'medicare' }, unanswered)
    for (const i of [0, 1] as const) {
      expect(within(section(i)).getByText(slots.medicareExtrasPanelStanding(fig))).toBeInTheDocument()
      for (const r of within(section(i)).getAllByRole('radio')) expect(r).not.toBeChecked()
    }
  })

  it('an answered fork carries no standing line (the picked state has its own voice)', () => {
    open({ kind: 'medicare' }, writeMedicareExtras(unanswered, 0, { kind: 'none' }))
    expect(within(section(0)).queryByText(slots.medicareExtrasPanelStanding(fig))).toBeNull()
    expect(within(section(1)).getByText(slots.medicareExtrasPanelStanding(fig)), '[test setup] the other person’s is still open').toBeInTheDocument()
  })

  it('in setup, the blank fork stays silent: mid-answer, never steered', () => {
    open({ kind: 'medicare' }, unanswered, { periodConfirmed: false, spendPeriodAnswered: false, markSpendPeriodAnswered: () => {} })
    expect(screen.queryByText(slots.medicareExtrasPanelStanding(fig))).toBeNull()
    for (const r of screen.getAllByRole('radio')) expect(r).not.toBeChecked()
  })
})

describe('the stepper’s Goals step asks the walk’s health and Medicare questions by the walk’s gates', () => {
  const goalsCards = (d: ScenarioDraft) => {
    const page = setupPage(d, 'goals')
    return page.kind === 'cards' ? page.view.cards.map((c) => c.id) : []
  }

  it('the Medicare card only with a member 64+, the health card until everyone is proven 65+', () => {
    const young = withPerson(withPerson(retired, 0, { currentAge: 63, birthYear: 1963 }), 1, { currentAge: 60, birthYear: 1966 })
    expect(goalsCards(young)).not.toContain('medicare')
    expect(goalsCards(young)).toContain('health')
    const near = withPerson(young, 0, { currentAge: 64, birthYear: 1962 })
    expect(goalsCards(near)).toContain('medicare')
    expect(goalsCards(retired), 'both 65+').not.toContain('health')
    expect(goalsCards(retired)).toContain('medicare')
  })
})
