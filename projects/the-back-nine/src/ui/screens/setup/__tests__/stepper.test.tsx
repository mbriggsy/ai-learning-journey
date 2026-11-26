// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryModel, type MemoryModel, type ScenarioDraft } from '@store/memoryModel'
import type { EngineClient } from '@store/engineClient'
import { clearVault, openVaultDb, writeVault } from '@store/db'
import { VAULT_DB_NAME } from '@shared/model'
import { DEV_SEEDS } from '../../../devSeeds'
import { copy, slots } from '../../../copy'
import { Stepper } from '../Stepper'
import { setupTitle } from '../stepperView'
import { WALK_HOUSEHOLDS } from './walkDrafts.fixture'

/**
 * The first-run stepper (Act 6 · RC14; `Stepper.tsx` over `stepperView.ts`), in jsdom over the store's own
 * `createMemoryModel` (start year 2026, its engine never reached). The plan's test scenarios:
 *  - A FRESH PLAN WALKS THE SIX STEPS TO COMPLETE WITH THE DRAFT THE WALK PRODUCED for the same answers, field by field, on
 *    two made-up households (one working, one retired). The expected drafts are the DELETED walk's own, recorded at RC14's
 *    base commit by driving the walk (`walkDrafts.fixture.ts`; DND 012), never built through the stepper's code;
 *  - Next with a blocking refusal opens that card's drawer with the refusal at its field;
 *  - the pre-made cards exist before any typing; a working household gets W and the money picture, a retired one does not;
 *  - THE SPENDING PERIOD'S PROVENANCE IN SETUP (`drawerSave.ts`'s header): on a fresh plan an ambiguous figure under the
 *    untapped month is asked its unit, as the walk's spend step asked; a tap (the already-checked month included) answers
 *    it for the session; the stepper's provenance (a vault, a dev seed) disarms it; a governing budget asks no unit;
 *  - the walk's flow laws, ported: a step change moves focus to the new step's title; Previous keeps every answer; Next
 *    reads the store's current draft; Complete runs every step's check (a step skipped by its chevron is checked too);
 *    the step nav yields (inert) while a drawer is open;
 *  - the no-IndexedDB-write-until-Save seam (the walk's `noWriteSeam.test.tsx`, ported with its planted control): every
 *    branch of setup, a refused Save, Previous, an account, an income stream and an abandon leave IndexedDB untouched,
 *    against the real store layer.
 */
afterEach(cleanup)

const nullClient = { runningInWorker: true, reset: () => {}, engine: {} } as unknown as EngineClient

function freshModel(start?: ScenarioDraft): MemoryModel {
  const model = createMemoryModel({
    client: nullClient,
    builders: { buildSpineParams: () => null, buildDateInput: () => null },
    mintSeed: () => 7,
    startCalendarYear: 2026,
  })
  if (start !== undefined) model.update(() => start)
  ;(model as { recompute: unknown }).recompute = vi.fn(async () => true)
  return model
}

function mount(model: MemoryModel, opts: { readonly periodConfirmed?: boolean; readonly askNames?: boolean; readonly notSaved?: boolean } = {}) {
  const onComplete = vi.fn()
  const onCancelNewPlan = vi.fn()
  render(
    <Stepper
      model={model}
      periodConfirmed={opts.periodConfirmed ?? false}
      askNames={opts.askNames ?? false}
      onComplete={onComplete}
      onCancelNewPlan={onCancelNewPlan}
      notSaved={opts.notSaved ?? true}
    />,
  )
  return { onComplete, onCancelNewPlan }
}

const card = (id: string) => document.querySelector<HTMLElement>(`[data-profile-card="${id}"]`)
const dialog = () => screen.getByRole('dialog')
// The page's title, read off the DOM: an open drawer is modal, so the page beneath leaves the accessibility tree.
const title = () => document.querySelector('main h1')?.textContent

/** Type as a person does: focus, the text, the blur that commits it. */
function type(label: string, text: string) {
  const field = within(dialog()).getByLabelText(label)
  act(() => field.focus())
  fireEvent.change(field, { target: { value: text } })
  act(() => field.blur())
}

async function pick(label: string, option: string) {
  const user = userEvent.setup({ pointerEventsCheck: 0 })
  await user.click(within(dialog()).getByRole('combobox', { name: label }))
  await user.click(await screen.findByRole('option', { name: option }))
}

async function menu(button: string, ...items: readonly string[]) {
  const user = userEvent.setup({ pointerEventsCheck: 0 })
  await user.click(screen.getByRole('button', { name: button }))
  // fireEvent, as the tray's own test opens its nested menu: a submenu item under userEvent's pointer never selects in jsdom.
  for (const item of items) fireEvent.click(await screen.findByRole('menuitem', { name: item }))
  await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument())
}

const radio = (name: string) => act(() => fireEvent.click(within(dialog()).getByRole('radio', { name })))

async function open(id: string) {
  const c = card(id)
  expect(c, `[test setup] no card ${id} on "${title()}"`).not.toBeNull()
  act(() => fireEvent.click(c!))
  await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument())
}

async function save() {
  act(() => fireEvent.click(within(dialog()).getByRole('button', { name: copy.profileDrawerSave })))
  await waitFor(() => expect(screen.queryByRole('dialog'), `the drawer refused: ${screen.queryByRole('dialog')?.textContent?.slice(0, 300)}`).toBeNull())
}

const next = () => act(() => fireEvent.click(screen.getByRole('button', { name: copy.setupNext })))

async function names(you: string, spouse: string) {
  type(copy.setupNameYou, you)
  type(copy.setupNameSpouse, spouse)
  act(() => fireEvent.click(within(dialog()).getByRole('button', { name: copy.setupNewPlanStart })))
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
}

async function person(i: 0 | 1, born: string, sex: string, work: string, stop?: string) {
  await open(`person-${i}`)
  type(copy.birthYearLabel, born)
  await pick(copy.sexLegend, sex)
  await pick(copy.workStatusLegend, work)
  if (stop !== undefined) type(copy.stopAgeLabel, stop)
  await save()
}

async function socialSecurity(i: 0 | 1, monthly: string, year: string) {
  await open(`ss-${i}`)
  type(copy.ssAmountLabel, monthly)
  type(copy.ssClaimLabel, year)
  await save()
}

async function legs(stock: string, bond: string, cash: string) {
  type(copy.classifierStockPct, stock)
  type(copy.classifierBondPct, bond)
  type(copy.classifierCashPct, cash)
}

/** The draft with every fresh id set aside (random on both sides; the fixture's header). */
const noIds = (d: ScenarioDraft) => ({
  ...d,
  enteredAccounts: d.enteredAccounts.map(({ id: _id, ...rest }) => rest),
  budget: d.budget?.map(({ id: _id, ...rest }) => rest),
})

describe('a fresh plan walks the six steps to Complete with the draft the walk produced', () => {
  it('the retired household (Pat and Lee, Pennsylvania): every answer through its card, Complete, field by field', async () => {
    const model = freshModel()
    const { onComplete } = mount(model, { askNames: true })
    expect(within(dialog()).getByRole('heading', { name: copy.setupNewPlanTitle })).toBeInTheDocument()
    await names('Pat', 'Lee')
    expect(title()).toBe(setupTitle('family'))
    await person(0, '1960', copy.sexFemale, copy.workStatusRetired, '62')
    await person(1, '1963', copy.sexMale, copy.workStatusRetired, '60')
    await open('state')
    await pick(copy.profileStateLabel, copy.stateOptionPA)
    await save()
    next()
    expect(title()).toBe(setupTitle('income'))
    await socialSecurity(0, '2,400', '2030')
    await socialSecurity(1, '1,800', '2030')
    await menu(copy.profileAddIncome, copy.incomeTypePension)
    await pick(copy.incomeOwnerLegend, 'Lee')
    type(copy.incomeAmountLabel, '18,000')
    await pick(copy.incomeTimingLegend, copy.incomeTimingLater)
    type(copy.incomeStartAgeLabel, '70')
    await pick(copy.incomeColaLegend, copy.incomeColaNominal)
    type(copy.incomeSurvivorLabel, '50')
    await save()
    next()
    expect(title()).toBe(setupTitle('savings'))
    expect(screen.getByText(copy.profileSavingsNoneWorking), 'a retired household’s Savings holds one line').toBeInTheDocument()
    expect(document.querySelectorAll('[data-profile-card]')).toHaveLength(0)
    next()
    expect(title()).toBe(setupTitle('net-worth'))
    await menu(copy.profileAddAccount, copy.investBucketPretax, copy.kindTraditionalIra)
    type(copy.accountValueLabel, '800,000')
    await legs('60', '35', '5')
    await save()
    await menu(copy.profileAddAccount, copy.investBucketTaxable)
    await pick(copy.profileOwnerLabel, 'Lee')
    type(copy.accountValueLabel, '250,000')
    type(copy.accountBasisLabel, '180,000')
    await legs('70', '25', '5')
    await save()
    next()
    expect(title()).toBe(setupTitle('expenses'))
    expect(card('working-cost'), 'no W for a retired household').toBeNull()
    await open('living')
    type(copy.spendLabel, '7,500')
    radio(copy.periodMonth) // the explicit answer on the already-checked month (the walk's tap)
    await save()
    await open('medical')
    type(copy.oopLabel, '4,000')
    await save()
    next()
    expect(title()).toBe(setupTitle('goals'))
    expect(card('money-picture'), 'no money picture for a retired household').toBeNull()
    await open('health')
    type(copy.enrolledPremiumLabel, '1,100')
    type(copy.slcspLabel, '950')
    await save()
    await open('medicare')
    act(() => fireEvent.click(document.querySelector<HTMLElement>('[data-extras-person="0"] input[value="typical"]')!))
    act(() => fireEvent.click(document.querySelector<HTMLElement>('[data-extras-person="1"] input[value="none"]')!))
    type(copy.irmaaSeedTwoBackLabel, '120,000')
    type(copy.irmaaSeedOneBackLabel, '115,000')
    await save()
    act(() => fireEvent.click(screen.getByRole('button', { name: copy.setupComplete })))
    expect(onComplete).toHaveBeenCalledTimes(1)
    expect(noIds(model.getSnapshot().draft)).toEqual(noIds(WALK_HOUSEHOLDS.retired))
  }, 60_000)

  it('the working household (Alex working, Sam retired, North Carolina): W on Expenses, the money picture on Goals, Complete, field by field', async () => {
    const model = freshModel()
    const { onComplete } = mount(model, { askNames: true })
    await names('Alex', 'Sam')
    await person(0, '1968', copy.sexMale, copy.workStatusWorking)
    await person(1, '1965', copy.sexFemale, copy.workStatusRetired, '58')
    await open('state')
    await pick(copy.profileStateLabel, copy.stateOptionNC)
    await save()
    next()
    // The pre-made cards: a salary for the one who works, Social Security for both, investment income while working.
    for (const id of ['salary-0', 'ss-0', 'ss-1', 'invest-0']) expect(card(id), id).not.toBeNull()
    expect(card('salary-1'), 'no salary card for the retired one').toBeNull()
    await open('salary-0')
    type(copy.salaryLabel, '150,000')
    await save()
    await socialSecurity(0, '3,000', '2035')
    await socialSecurity(1, '1,500', '2032')
    await open('invest-0')
    type(copy.workInvestmentLabel, '5,000')
    await save()
    next()
    // Savings: one 401(k) card pre-made for the one who works, opening a new account for him.
    expect(card('new-account-0')).toHaveTextContent(slots.workbenchAccountOf('Alex’s', copy.kind401k).replace(/^a/, 'A'))
    expect(card('new-account-1')).toBeNull()
    await open('new-account-0')
    type(copy.accountValueLabel, '600,000')
    type(copy.accountContributionLabel, '23,000')
    type(copy.accountMatchLabel, '6,000')
    await legs('80', '20', '0')
    await save()
    expect(card('new-account-0'), 'the pre-made card gives way to the account').toBeNull()
    expect(card('account-0')).not.toBeNull()
    next()
    next()
    expect(title()).toBe(setupTitle('expenses'))
    await open('living')
    type(copy.spendLabel, '96,000')
    radio(copy.periodYear)
    await save()
    await open('medical')
    type(copy.oopLabel, '3,000')
    await save()
    await open('working-cost')
    expect(within(dialog()).queryByRole('radio', { name: copy.workingLedgerLeftOverSaved }), 'the W question alone on Expenses').toBeNull()
    radio(copy.workingCostDifferent)
    type(copy.workingCostAmountLabel, '90,000')
    radio(copy.periodYear)
    await save()
    next()
    expect(title()).toBe(setupTitle('goals'))
    await open('health')
    type(copy.enrolledPremiumLabel, '900')
    type(copy.slcspLabel, '800')
    radio(copy.employerCoverageCovered)
    await save()
    expect(card('medicare'), 'nobody near Medicare: the walk asked no Medicare step').toBeNull()
    await open('money-picture')
    radio(copy.workingLedgerLeftOverSaved)
    await save()
    act(() => fireEvent.click(screen.getByRole('button', { name: copy.setupComplete })))
    expect(onComplete).toHaveBeenCalledTimes(1)
    expect(noIds(model.getSnapshot().draft)).toEqual(noIds(WALK_HOUSEHOLDS.working))
  }, 60_000)
})

describe('Next and Complete run the walk’s Continue', () => {
  const { workingYearCost: _w, workingYearLeftOver: _l, ...noW } = DEV_SEEDS.date

  it('Next over a working household with no W opens the W drawer with the gate’s refusal at its fork, and stays on the step', async () => {
    const model = freshModel(noW)
    const { onComplete } = mount(model)
    for (let i = 0; i < 4; i += 1) next()
    expect(title()).toBe(setupTitle('expenses'))
    next()
    expect(title(), 'Next refused: still on Expenses').toBe(setupTitle('expenses'))
    await waitFor(() => expect(screen.getByRole('dialog', { name: copy.profileWorkingCostName })).toBeInTheDocument())
    expect(within(dialog()).getByRole('alert')).toHaveTextContent(copy.errWorkingCostUnanswered)
    expect(onComplete).not.toHaveBeenCalled()
  })

  it('a forward chevron runs the passed steps’ checks: the Goals chevron past a missing W stops on Expenses with the W drawer open', async () => {
    const model = freshModel(noW)
    const { onComplete } = mount(model)
    // A forward chevron runs the passed steps' checks, so it stops at Expenses too.
    act(() => fireEvent.click(screen.getByRole('button', { name: /Goals/ })))
    expect(title()).toBe(setupTitle('expenses'))
    await waitFor(() => expect(screen.getByRole('dialog', { name: copy.profileWorkingCostName })).toBeInTheDocument())
    expect(onComplete).not.toHaveBeenCalled()
  })

  it('Complete over a refusal on a step already passed: a switch to working on Goals owes W on Expenses; its ✓ drops, the box beside Complete never says Complete still opens the plan, and Complete lands on Expenses with the W drawer’s alert', async () => {
    const model = freshModel(DEV_SEEDS.retired)
    const { onComplete } = mount(model, { periodConfirmed: true })
    for (let i = 0; i < 5; i += 1) next()
    expect(title()).toBe(setupTitle('goals'))
    const expensesStep = () => screen.getByRole('button', { name: new RegExp(copy.shellPageExpenses) })
    expect(expensesStep(), 'every passed step is done before the switch').toHaveAttribute('data-setup-step-state', 'done')
    await open('retirement-0')
    await pick(copy.workStatusLegend, copy.workStatusWorking)
    await save()
    expect(model.getSnapshot().draft.people[0].workStatus).toBe('working')
    expect(model.getSnapshot().draft.workingYearCost, '[test setup] no W yet').toBeUndefined()
    expect(expensesStep(), 'W is owed: no ✓ over Expenses').toHaveAttribute('data-setup-step-state', 'passed')
    const box = document.querySelector('[data-setup-missing]')
    expect(box, '[test setup] the switch leaves facts missing, so the box shows').not.toBeNull()
    expect(box, 'Complete would refuse: no "still opens"').not.toHaveTextContent(copy.setupMissingOpens)
    expect(box, 'nor "until these are in, your plan’s pages…" (milestone 3’s review, round 2)').not.toHaveTextContent(copy.setupMissingUntil)
    act(() => fireEvent.click(screen.getByRole('button', { name: copy.setupComplete })))
    expect(title(), 'Complete refused: back on Expenses').toBe(setupTitle('expenses'))
    await waitFor(() => expect(screen.getByRole('dialog', { name: copy.profileWorkingCostName })).toBeInTheDocument())
    expect(within(dialog()).getByRole('alert')).toHaveTextContent(copy.errWorkingCostUnanswered)
    expect(onComplete).not.toHaveBeenCalled()
  })

  it('"Nothing’s saved to this device yet" stands beside the nav while no plan is saved, and is gone once one is', () => {
    mount(freshModel(DEV_SEEDS.retired), { notSaved: true })
    expect(document.querySelector('[data-setup-not-saved]')).toHaveTextContent(copy.notSavedYet)
    cleanup()
    mount(freshModel(DEV_SEEDS.retired), { notSaved: false })
    expect(document.querySelector('[data-setup-not-saved]')).toBeNull()
    expect(screen.queryByText(copy.notSavedYet)).toBeNull()
  })

  it('a step change moves focus to the new step’s title; Previous keeps every answer', async () => {
    const model = freshModel(DEV_SEEDS.retired)
    mount(model)
    const before = model.getSnapshot().draft
    next()
    await waitFor(() => expect(screen.getByRole('heading', { level: 1 })).toHaveFocus())
    expect(title()).toBe(setupTitle('income'))
    act(() => fireEvent.click(screen.getByRole('button', { name: copy.setupPrevious })))
    await waitFor(() => expect(screen.getByRole('heading', { level: 1, name: setupTitle('family') })).toHaveFocus())
    expect(model.getSnapshot().draft).toBe(before)
  })

  it('while a drawer is open the step nav yields: inert, out of reach', async () => {
    mount(freshModel(DEV_SEEDS.retired))
    const nav = document.querySelector<HTMLElement>('[data-setup-nav]')!
    expect(nav).not.toHaveAttribute('inert')
    await open('person-0')
    expect(nav).toHaveAttribute('inert')
  })
})

describe('the spending period in setup (the walk’s force-confirm, kept)', () => {
  it('a fresh plan: a figure in the ambiguous band under the untapped month is asked its unit; the tap answers it', async () => {
    const model = freshModel(DEV_SEEDS.retired)
    model.update((d) => ({ ...d, annualSpendingReal: undefined, spendEntryPeriod: 'month', budget: undefined }))
    mount(model)
    for (let i = 0; i < 4; i += 1) next()
    await open('living')
    type(copy.spendLabel, '9,000')
    act(() => fireEvent.click(within(dialog()).getByRole('button', { name: copy.profileDrawerSave })))
    expect(within(dialog()).getByRole('alert')).toHaveTextContent(copy.periodConfirmPrompt)
    expect(model.getSnapshot().draft.annualSpendingReal, 'nothing refused reached the plan').toBeUndefined()
    radio(copy.periodMonth)
    await save()
    expect(model.getSnapshot().draft.annualSpendingReal).toBe(108_000)
    // Answered for the session: a later figure in the same unit is not asked again, and Next passes.
    await open('living')
    type(copy.spendLabel, '9,500')
    await save()
    expect(model.getSnapshot().draft.annualSpendingReal).toBe(114_000)
    next()
    expect(title()).toBe(setupTitle('goals'))
  })

  it('an unambiguous figure saves on the untapped month unasked (the walk’s floor)', async () => {
    const model = freshModel(DEV_SEEDS.retired)
    model.update((d) => ({ ...d, annualSpendingReal: undefined, spendEntryPeriod: 'month', budget: undefined }))
    mount(model)
    for (let i = 0; i < 4; i += 1) next()
    await open('living')
    type(copy.spendLabel, '5,000')
    await save()
    expect(model.getSnapshot().draft.annualSpendingReal).toBe(60_000)
  })

  it('the stepper’s provenance (a vault or a dev seed answered it before) asks nothing over a figure the gate would have asked', async () => {
    // $78,000 shown as a year's figure: past the floor in its unit, so the road that saved it asked its unit.
    const model = freshModel({ ...DEV_SEEDS.retired, spendEntryPeriod: 'year' })
    mount(model, { periodConfirmed: true })
    for (let i = 0; i < 4; i += 1) next()
    await open('living')
    type(copy.spendLabel, '9,000')
    await save()
    expect(model.getSnapshot().draft).toMatchObject({ annualSpendingReal: 9_000, spendEntryPeriod: 'year' })
  })

  // Milestone 3's review, round 2: a figure under the floor in its shown unit was never asked, so provenance over it
  // vouches for no unit (`periodGateTrips`).
  it('provenance over a figure never asked (6,500 under the month): a figure past the floor is asked its unit', async () => {
    const model = freshModel(DEV_SEEDS.retired)
    mount(model, { periodConfirmed: true })
    for (let i = 0; i < 4; i += 1) next()
    await open('living')
    type(copy.spendLabel, '9,000')
    act(() => fireEvent.click(within(dialog()).getByRole('button', { name: copy.profileDrawerSave })))
    expect(within(dialog()).getByRole('alert')).toHaveTextContent(copy.periodConfirmPrompt)
    expect(model.getSnapshot().draft.annualSpendingReal, 'nothing refused reached the plan').toBe(78_000)
  })

  it('Next on Expenses over an unanswered ambiguous figure (a draft that came in with it, no provenance) opens Living at the figure', async () => {
    const model = freshModel({ ...DEV_SEEDS.retired, annualSpendingReal: 120_000, spendEntryPeriod: 'month', budget: undefined })
    mount(model)
    for (let i = 0; i < 4; i += 1) next()
    next()
    expect(title()).toBe(setupTitle('expenses'))
    await waitFor(() => expect(screen.getByRole('dialog', { name: copy.profileKindLiving })).toBeInTheDocument())
    expect(within(dialog()).getByRole('alert')).toHaveTextContent(copy.periodConfirmPrompt)
  })

  it('a governing budget asks no unit (its lines are yearly figures)', async () => {
    const model = freshModel(DEV_SEEDS.budget)
    mount(model)
    for (let i = 0; i < 4; i += 1) next()
    next()
    expect(title()).toBe(setupTitle('goals'))
  })
})

describe('Start a new plan', () => {
  it('the names drawer opens first; Start writes the two names as the Family drawer does; Cancel goes back', async () => {
    const model = freshModel()
    const { onCancelNewPlan } = mount(model, { askNames: true })
    await names('  Jordan ', 'Riley')
    const people = model.getSnapshot().draft.people
    expect([people[0].name, people[1].name]).toEqual(['Jordan', 'Riley'])
    expect(onCancelNewPlan).not.toHaveBeenCalled()
    cleanup()
    const again = mount(freshModel(), { askNames: true })
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' })
    await waitFor(() => expect(again.onCancelNewPlan).toHaveBeenCalledTimes(1))
  })
})

describe('the no-IndexedDB-write-until-Save seam (against the REAL store layer; the walk’s, ported)', () => {
  const databaseNames = async () => (await indexedDB.databases()).map((d) => d.name ?? '<unnamed>')

  // The walk's `noWriteSeam.test.tsx` control, ported: a probe that could never see a write would be vacuously green.
  it('PLANTED CONTROL: a real write through db.ts IS detected by the probe (non-vacuous)', async () => {
    expect(await databaseNames()).toEqual([])
    const db = await openVaultDb()
    const bytes = (n: number) => new Uint8Array([n, n, n])
    await writeVault(db, {
      model: { iv: bytes(1), ciphertext: bytes(2) },
      passphraseWrap: { salt: bytes(3), iv: bytes(4), wrappedDataKey: bytes(5) },
      recoveryWrap: { salt: bytes(6), iv: bytes(7), wrappedDataKey: bytes(8) },
    })
    expect(await databaseNames()).not.toEqual([]) // the probe CAN fail
    await clearVault(db)
    db.close()
    // Back to the no-write baseline for the real arm below (fake-indexeddb is one global per process).
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.deleteDatabase(VAULT_DB_NAME)
      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error as Error)
    })
    expect(await databaseNames()).toEqual([])
  })

  it('names, a refused Save, Previous, an account, an income stream and an abandon leave IndexedDB untouched', async () => {
    expect(await databaseNames()).toEqual([])
    const model = freshModel()
    mount(model, { askNames: true })
    await names('Pat', 'Lee')
    await open('person-0')
    type(copy.birthYearLabel, '1960')
    await pick(copy.workStatusLegend, copy.workStatusRetired)
    type(copy.stopAgeLabel, '70') // in the future: refused
    act(() => fireEvent.click(within(dialog()).getByRole('button', { name: copy.profileDrawerSave })))
    expect(within(dialog()).getByRole('alert')).toBeInTheDocument()
    expect(await databaseNames()).toEqual([])
    type(copy.stopAgeLabel, '62')
    await save()
    next()
    act(() => fireEvent.click(screen.getByRole('button', { name: copy.setupPrevious })))
    next()
    await menu(copy.profileAddIncome, copy.incomeTypePension)
    type(copy.incomeAmountLabel, '30,000')
    await pick(copy.incomeTimingLegend, copy.incomeTimingNow)
    await pick(copy.incomeColaLegend, copy.incomeColaReal)
    type(copy.incomeSurvivorLabel, '50')
    await save()
    expect(model.getSnapshot().draft.incomeStreams).toHaveLength(1)
    next()
    next()
    await menu(copy.profileAddAccount, copy.investBucketRoth, copy.kindRothIra)
    type(copy.accountValueLabel, '250,000')
    await save()
    expect(model.getSnapshot().draft.enteredAccounts).toHaveLength(1)
    expect(await databaseNames()).toEqual([])
    cleanup() // the abandon
    expect(await databaseNames()).toEqual([])
  }, 60_000)
})
