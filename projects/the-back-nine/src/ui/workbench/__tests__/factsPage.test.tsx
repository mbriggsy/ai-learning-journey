// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { useSyncExternalStore } from 'react'
import { budgetYearZeroFullTotal } from '@budget/budgetToSpending'
import { unsavedBuffersHeld } from '@intake/unsavedBuffer'
import type { EngineRunRequest, LaneResult } from '@store/runLanes'
import { createMemoryModel, type MemoryModel, type ModelAnswer, type ParamsBuilders, type ScenarioDraft } from '@store/memoryModel'
import type { EngineClient } from '@store/engineClient'
import type { DateSearchInput } from '@engine/dateSearch'
import type { DateSearchWire } from '@engine/engineWire'
import type { SimulationResult } from '@shared/model'
import WorkbenchRoom, { type TableLanes } from '../WorkbenchRoom'
import { appModel } from '../../appModel'
import { recomputeBoth } from '../../editorSheets'
import { DEV_SEEDS } from '../../devSeeds'
import { copy, slots } from '../../copy'
import { GOVERNED, FULL } from './factDrafts'

/**
 * The facts page in the room (workbench plan U8; R14, R15, F2): each group's door opens that step's own body over the
 * walk's own `StepApi`, and each lever line its own sheet from the one home of the sheets' writes. The store is the
 * app's real one (`appModel`, its engine calls spied away); the table's lanes never answer unless a test settles them.
 */

const recompute = vi.spyOn(appModel, 'recompute').mockResolvedValue(true)

afterEach(cleanup)
beforeEach(() => {
  recompute.mockClear()
})

/** Lanes that hold every request (the table stays in its first-load frame), counting the asks. */
function pendingLanes() {
  const lane = { request: vi.fn((_req: EngineRunRequest) => new Promise<LaneResult<SimulationResult>>(() => {})) }
  const lanes: TableLanes = { steady: lane, rough: lane }
  return { lanes, lane }
}

const headline = (draft: ScenarioDraft, inputKey: string, state: 'on-track' | 'borderline'): ModelAnswer =>
  ({
    kind: 'headline',
    tier: 'final',
    draft,
    inputKey,
    result: { headline: { outcomeState: state, xOfTen: { value: state === 'on-track' ? 8 : 5, marginToEdge: 0.1 }, stateMarginToEdge: 0.1 }, distribution: {} },
  }) as unknown as ModelAnswer

/** The room over the app's store, the answer planted. */
function Room({ answer, lanes, readOnly = false }: { readonly answer: ModelAnswer; readonly lanes: TableLanes; readonly readOnly?: boolean }) {
  const snap = useSyncExternalStore(appModel.subscribe, appModel.getSnapshot)
  return (
    <WorkbenchRoom
      save={{ kind: 'none' }}
      onBack={() => {}}
      snapshot={{ ...snap, answer }}
      model={appModel}
      lanes={lanes}
      readOnly={readOnly}
      wallCalendarYear={snap.draft.startCalendarYear}
    />
  )
}

function openRoomOn(draft: ScenarioDraft, opts: { readonly answer?: ModelAnswer; readonly readOnly?: boolean } = {}) {
  act(() => appModel.update(() => draft))
  const { lanes, lane } = pendingLanes()
  const answer = opts.answer ?? { kind: 'pending' }
  const view = render(<Room answer={answer} lanes={lanes} readOnly={opts.readOnly ?? false} />)
  fireEvent.click(screen.getByRole('tab', { name: copy.workbenchPageFacts }))
  return { view, lane, lanes }
}

const door = (name: string) => screen.getByRole('button', { name: slots.workbenchFactsEditName(name) })
const draftNow = () => appModel.getSnapshot().draft

describe('the facts page — its pages and its doors', () => {
  it('a real tab pattern: the facts page shows under its tab, arrow keys move between the two, and the table page keeps its place', () => {
    const { lane } = openRoomOn(DEV_SEEDS.budget, { answer: headline(DEV_SEEDS.budget, 'k1', 'on-track') })
    const facts = screen.getByRole('tab', { name: copy.workbenchPageFacts })
    expect(facts).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tabpanel')).toHaveAccessibleName(copy.workbenchPageFacts)
    expect(screen.getByRole('heading', { name: copy.workbenchFactsSpending })).toBeInTheDocument()
    fireEvent.keyDown(facts, { key: 'ArrowLeft' })
    expect(screen.getByRole('tab', { name: copy.workbenchPageTable })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: copy.workbenchPageTable })).toHaveFocus()
    expect(screen.queryByRole('heading', { name: copy.workbenchFactsSpending })).toBeNull()
    // The table's runs belong to the room, not the page: one pair for the one committed answer, whichever page shows.
    expect(lane.request).toHaveBeenCalledTimes(2)
  })

  it('a read-only tab shows the page with no door and no control that writes (U6’s rule)', () => {
    openRoomOn(FULL, { readOnly: true })
    expect(screen.getByRole('heading', { name: copy.workbenchFactsSocialSecurity })).toBeInTheDocument()
    expect(screen.getByText(copy.workbenchFactsReadOnly)).toBeInTheDocument()
    // The one other kind of button is a lever's link to the What if page (U15): it moves to a page and writes nothing,
    // and a read-only tab may try a what-if (it cannot apply one there).
    expect(screen.queryAllByRole('button').map((b) => b.textContent).filter((t) => t !== copy.workbenchFactsTry)).toEqual([copy.workbenchBack])
  })

  it('a writable tab draws one door per step group, each named for its group', () => {
    openRoomOn(FULL)
    expect(door(copy.workbenchFactsSocialSecurity)).toHaveTextContent(copy.workbenchFactsEdit)
    expect(screen.getByRole('button', { name: 'Edit the two of you' })).toBeInTheDocument()
    // The goal and the stop year have no editor here (KTD15): no door.
    expect(screen.queryByRole('button', { name: slots.workbenchFactsEditName(copy.workbenchFactGoal) })).toBeNull()
  })
})

describe('the step sheet — the walk’s own step, over the plan', () => {
  it('Done is the walk’s Continue: a firing rule keeps the sheet open with its error; a fixed value closes it, and the edit recomputes once (spine: the final alone)', async () => {
    const draft: ScenarioDraft = {
      ...DEV_SEEDS.budget,
      people: [{ ...DEV_SEEDS.budget.people[0], socialSecurityClaimAge: 75 }, DEV_SEEDS.budget.people[1]],
    }
    openRoomOn(draft)
    fireEvent.click(door(copy.workbenchFactsSocialSecurity))
    const sheet = screen.getByRole('dialog', { name: copy.workbenchFactsSocialSecurity })
    fireEvent.click(within(sheet).getByRole('button', { name: copy.workbenchFactsDone }))
    expect(screen.getByRole('dialog', { name: copy.workbenchFactsSocialSecurity })).toBeInTheDocument()
    expect(within(sheet).getAllByRole('alert').length).toBeGreaterThan(0)
    expect(recompute).not.toHaveBeenCalled()

    const claim = within(sheet).getAllByLabelText(copy.ssClaimLabel)[0]!
    const birthYear = draft.people[0].birthYear!
    fireEvent.focus(claim)
    fireEvent.change(claim, { target: { value: String(birthYear + 67) } })
    fireEvent.blur(claim)
    fireEvent.click(within(sheet).getByRole('button', { name: copy.workbenchFactsDone }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(draftNow().people[0].socialSecurityClaimAge).toBe(67)
    expect(recompute.mock.calls).toEqual([['final']])
  })

  it('dismiss is the walk’s Back: a figure the step would refuse is discarded (`discardOnBack`), and the moved draft recomputes (date route: provisional, then final)', async () => {
    const draft: ScenarioDraft = { ...FULL, workingYearCost: { kind: 'entered', amountReal: 0, entryPeriod: 'year', stateTaxReading: 'agi-derived' } }
    openRoomOn(draft)
    fireEvent.click(door(copy.workbenchFactsWorkingYear))
    const sheet = screen.getByRole('dialog', { name: copy.workbenchFactsWorkingYear })
    fireEvent.keyDown(sheet, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(draftNow().workingYearCost).toBeUndefined()
    await waitFor(() => expect(recompute.mock.calls).toEqual([['provisional'], ['final']]))
  })

  it('editing out-of-pocket medical under a governing budget leaves the spending total reconciled — the step’s own write (insight 058)', async () => {
    const draft = DEV_SEEDS.budget
    expect(draft.budget, '[test setup] a budget governs').toBeDefined()
    openRoomOn(draft)
    fireEvent.click(door(copy.workbenchFactsMedical))
    const sheet = screen.getByRole('dialog', { name: copy.workbenchFactsMedical })
    const oop = within(sheet).getByLabelText(copy.oopLabel)
    fireEvent.focus(oop)
    fireEvent.change(oop, { target: { value: '9,000' } })
    fireEvent.blur(oop)
    fireEvent.click(within(sheet).getByRole('button', { name: copy.workbenchFactsDone }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    const after = draftNow()
    expect(after.health.oopMedicalAnnual).toBe(9_000)
    expect(after.budget).toEqual(draft.budget)
    expect(after.annualSpendingReal).toBe(budgetYearZeroFullTotal(after.budget ?? [], 9_000))
    expect(after.annualSpendingReal).not.toBe(draft.annualSpendingReal)
  })

  it('while the draft differs from the draft at open, the sheet holds the leave guard; ending the edit lets go', async () => {
    openRoomOn(FULL)
    fireEvent.click(screen.getByRole('button', { name: 'Edit the two of you' }))
    const sheet = screen.getByRole('dialog', { name: copy.workbenchFactsPeople })
    expect(unsavedBuffersHeld()).toBe(0)
    const name = within(sheet).getAllByLabelText(copy.nameLabel)[0]!
    fireEvent.change(name, { target: { value: 'Alexandra' } })
    fireEvent.blur(name)
    expect(draftNow().people[0].name).toBe('Alexandra')
    expect(unsavedBuffersHeld()).toBe(1)
    fireEvent.click(within(sheet).getByRole('button', { name: copy.workbenchFactsDone }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(unsavedBuffersHeld()).toBe(0)
  })

  it('an edit redraws the table and the pinned answer: its recompute’s new answer asks the table’s lanes again', async () => {
    const draft = DEV_SEEDS.budget
    act(() => appModel.update(() => draft))
    const { lanes, lane } = pendingLanes()
    const view = render(<Room answer={headline(draft, 'k1', 'on-track')} lanes={lanes} />)
    expect(lane.request).toHaveBeenCalledTimes(2)
    fireEvent.click(screen.getByRole('tab', { name: copy.workbenchPageFacts }))
    fireEvent.click(door(copy.workbenchFactsMedical))
    const oop = within(screen.getByRole('dialog')).getByLabelText(copy.oopLabel)
    fireEvent.focus(oop)
    fireEvent.change(oop, { target: { value: '7,500' } })
    fireEvent.blur(oop)
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: copy.workbenchFactsDone }))
    await waitFor(() => expect(recompute).toHaveBeenCalledWith('final'))
    // The store commits the edit's answer (planted here: the recompute is spied away).
    view.rerender(<Room answer={headline(draftNow(), 'k2', 'borderline')} lanes={lanes} />)
    expect(lane.request).toHaveBeenCalledTimes(4)
    expect(lane.request.mock.calls[2]![0].params).not.toEqual(lane.request.mock.calls[0]![0].params)
    expect(screen.getByText(new RegExp(`^${copy.outcomeBorderline}:`), { selector: '.wb-pin__real .wb-pin__lead' })).toBeInTheDocument()
  })
})

describe('the lever lines — since U15 the order, the Roth plan and the regime link to the What if page; the budget keeps its sheet', () => {
  it('the withdrawal order, the Roth plan and the subsidy regime draw no Edit door, only a link to the What if page', () => {
    openRoomOn(GOVERNED)
    for (const name of [copy.assumptionDrawdownName, copy.assumptionRothName, copy.assumptionRegimeName]) {
      expect(screen.queryByRole('button', { name: slots.workbenchFactsEditName(name) }), name).toBeNull()
    }
    expect(screen.getByRole('button', { name: slots.workbenchFactsTryName(copy.assumptionDrawdownName) })).toBeInTheDocument()
    // The budget's lines link to the rail AND keep their sheet: the rail changes a line's amount and kind, adds and
    // takes out lines; the sheet also edits a line's years and category (the report's two-door note).
    expect(screen.getByRole('button', { name: slots.workbenchFactsTryName(copy.workbenchFactBudget) })).toBeInTheDocument()
  })

  const cases: readonly { readonly door: string; readonly opens: () => HTMLElement }[] = [
    { door: copy.workbenchFactBudget, opens: () => screen.getByRole('heading', { name: copy.budgetSheetTitle }) },
    // While a budget governs, the spending total's door is the budget too, as the panel's governed row routes.
    { door: copy.workbenchFactsSpending, opens: () => screen.getByRole('heading', { name: copy.budgetSheetTitle }) },
  ]
  for (const c of cases) {
    it(`"${c.door}" opens its own sheet`, () => {
      openRoomOn(GOVERNED)
      fireEvent.click(door(c.door))
      expect(c.opens()).toBeInTheDocument()
    })
  }

  for (const seat of ['survivor-ratio', 'heir-bracket'] as const) {
    it(`the ${seat} line opens the assumptions panel landed at its own row`, () => {
      openRoomOn(GOVERNED)
      fireEvent.click(door(seat === 'survivor-ratio' ? copy.assumptionSurvivorRatioLabel : copy.assumptionHeirBracketLabel))
      const panel = screen.getByRole('dialog', { name: copy.assumptionTitle })
      expect(document.activeElement).toBe(panel.querySelector(`[data-assumption-seat="${seat}"]`))
      // In the room the panel offers no re-walk (it would leave the room): the facts page opens each step instead.
      expect(within(panel).queryByRole('button', { name: copy.assumptionRewalkCta })).toBeNull()
    })
  }

  it('in the room, the panel’s collections row has no door: the facts page’s Accounts and Other income doors are theirs (A4)', () => {
    openRoomOn(GOVERNED)
    fireEvent.click(door(copy.assumptionSurvivorRatioLabel))
    const panel = screen.getByRole('dialog', { name: copy.assumptionTitle })
    expect(panel.querySelector('[data-assumption-seat="collections"]'), '[test setup] the row is drawn').not.toBeNull()
    expect(within(panel).queryByRole('button', { name: copy.assumptionViaIntakeCta })).toBeNull()
  })
})

describe('the step sheet’s ending (U8 review: A1, A2, A3, C2)', () => {
  it('a figure typed and never blurred lands before the ending: Escape keeps it, and its recompute runs (A1)', async () => {
    openRoomOn(DEV_SEEDS.budget)
    fireEvent.click(door(copy.workbenchFactsMedical))
    const sheet = screen.getByRole('dialog', { name: copy.workbenchFactsMedical })
    const oop = within(sheet).getByLabelText(copy.oopLabel)
    act(() => oop.focus())
    fireEvent.change(oop, { target: { value: '7,500' } })
    fireEvent.keyDown(sheet, { key: 'Escape' })
    expect(draftNow().health.oopMedicalAnnual).toBe(7_500)
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(recompute.mock.calls).toEqual([['final']])
  })

  it('a dismiss never lets a refused value in: the draft goes back to what it held at open, typed or blurred (A2)', async () => {
    const atOpen = DEV_SEEDS.budget.people[0].pia
    for (const blur of [true, false]) {
      openRoomOn(DEV_SEEDS.budget)
      fireEvent.click(door(copy.workbenchFactsSocialSecurity))
      const sheet = screen.getByRole('dialog', { name: copy.workbenchFactsSocialSecurity })
      const pia = within(sheet).getAllByLabelText(copy.ssAmountLabel)[0]!
      act(() => pia.focus())
      fireEvent.change(pia, { target: { value: '30,000' } })
      if (blur) {
        act(() => pia.blur()) // a real blur: focus leaves the field, as a press elsewhere does
        expect(draftNow().people[0].pia, '[test setup] the refused monthly figure landed').toBe(360_000)
      }
      fireEvent.keyDown(sheet, { key: 'Escape' })
      expect(draftNow().people[0].pia, `blurred: ${blur}`).toBe(atOpen)
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
      cleanup()
    }
  })

  it('the spending step’s in-place budget builder holds the sheet open: Done does nothing and a backdrop press is ignored (C2)', () => {
    openRoomOn(DEV_SEEDS.retired)
    fireEvent.click(door(copy.workbenchFactsSpending))
    const sheet = screen.getByRole('dialog', { name: copy.workbenchFactsSpending })
    fireEvent.click(within(sheet).getByRole('button', { name: copy.budgetCta }))
    expect(sheet.querySelector('.budget-inline'), '[test setup] the builder opened in place').not.toBeNull()
    fireEvent.click(within(sheet).getByRole('button', { name: copy.workbenchFactsDone }))
    fireEvent.mouseDown(sheet.parentElement!)
    expect(screen.getByRole('dialog', { name: copy.workbenchFactsSpending }).querySelector('.budget-inline')).not.toBeNull()
  })
})

/** A store whose engine answers only when the test says, every date sweep logged (U8 review A3's shape). */
function heldStore() {
  const sweeps: { readonly spend: number; readonly tier: string }[] = []
  const pending: ((w: DateSearchWire) => void)[] = []
  const client = {
    runningInWorker: true,
    reset: () => {},
    engine: {
      ping: async () => 'pong' as const,
      run: async () => {
        throw new Error('no spine run here')
      },
      setLatestEpoch: async () => {},
      runDateSearch: (input: unknown, _seed: number, tier: string) => {
        sweeps.push({ spend: (input as { spend: number }).spend, tier })
        return new Promise<DateSearchWire>((resolve) => pending.push(resolve))
      },
      runTwoArm: async () => ({ kind: 'calm-error', reason: 'unused' }) as const,
      runSpendSolve: async () => ({ kind: 'calm-error', reason: 'unused' }) as const,
      setLatestSpendEpoch: async () => {},
      runSolve: () => new Promise(() => {}),
    },
  } as unknown as EngineClient
  const builders: ParamsBuilders = {
    buildSpineParams: () => null,
    buildDateInput: (d) => (d.annualSpendingReal !== undefined ? ({ spend: d.annualSpendingReal } as unknown as DateSearchInput) : null),
  }
  const model = createMemoryModel({ client, builders, mintSeed: () => 7 })
  /** Answer every sweep in flight, in order, until none is left. */
  const settle = async () => {
    for (let i = 0; i < 20 && pending.length > 0; i++) {
      await act(async () => {
        pending.shift()!({ kind: 'date-search', outcome: { kind: 'input-failure', reason: 'held' } } as DateSearchWire)
        await new Promise((r) => setTimeout(r, 0))
      })
    }
  }
  return { model, sweeps, pending, settle }
}

function StoreRoom({ model, lanes }: { readonly model: MemoryModel; readonly lanes: TableLanes }) {
  const snap = useSyncExternalStore(model.subscribe, model.getSnapshot)
  return <WorkbenchRoom save={{ kind: 'none' }} onBack={() => {}} snapshot={snap} model={model} lanes={lanes} wallCalendarYear={snap.draft.startCalendarYear} />
}

describe('an edit put back to its value at open still ends on the live draft’s answer (U8 review A3)', () => {
  it('A → B → A inside one sheet, while an earlier edit’s pair is in flight: the shown answer is the live draft’s', async () => {
    const { model, sweeps, pending, settle } = heldStore()
    const working = (d: ScenarioDraft): ScenarioDraft => ({
      ...d,
      people: [{ ...d.people[0], workStatus: 'working' }, { ...d.people[1], workStatus: 'retired' }],
      annualSpendingReal: 80_000,
    })
    act(() => model.update(working))
    const first = recomputeBoth(model)
    await settle()
    await first
    // An earlier edit, its provisional/final pair in flight (another sheet's ending).
    act(() => model.update((d) => ({ ...d, annualSpendingReal: 84_000 })))
    const earlier = recomputeBoth(model)
    render(<StoreRoom model={model} lanes={pendingLanes().lanes} />)
    fireEvent.click(screen.getByRole('tab', { name: copy.workbenchPageFacts }))
    fireEvent.click(door(copy.workbenchFactsSpending))
    const sheet = screen.getByRole('dialog', { name: copy.workbenchFactsSpending })
    const field = within(sheet).getByLabelText(copy.spendLabel)
    const type = (monthly: string) => {
      act(() => field.focus())
      fireEvent.change(field, { target: { value: monthly } })
      act(() => field.blur())
    }
    type('7,500') // B: $90,000 a year
    // The earlier provisional lands; its final is built from the LIVE draft (B).
    await act(async () => {
      pending.shift()!({ kind: 'date-search', outcome: { kind: 'input-failure', reason: 'held' } } as DateSearchWire)
      await new Promise((r) => setTimeout(r, 0))
    })
    expect(sweeps.at(-1), '[test setup] a final built from B is in flight').toEqual({ spend: 90_000, tier: 'final' })
    type('7,000') // back to A: the draft at open
    fireEvent.click(within(sheet).getByRole('button', { name: copy.workbenchFactsDone }))
    await settle()
    await earlier
    await settle()
    const s = model.getSnapshot()
    expect(s.draft.annualSpendingReal).toBe(84_000)
    expect((s.answer as { draft?: ScenarioDraft }).draft?.annualSpendingReal, 'the shown answer is the live draft’s').toBe(84_000)
    expect(s.refiguring).toBe(false)
  })
})
