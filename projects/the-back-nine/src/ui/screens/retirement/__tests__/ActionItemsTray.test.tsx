// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { useSyncExternalStore } from 'react'
import userEvent from '@testing-library/user-event'
import { simulate } from '@engine/simulate'
import { DATE_OFFSET_WINDOW_TOP, DATE_SEARCH_PATHS, offsetReading } from '@engine/dateSearch'
import { workingYearLeftOverShownState } from '@intake/intakeMap'
import type { EngineRunRequest, LaneResult } from '@store/runLanes'
import type { ModelAnswer, ScenarioDraft } from '@store/memoryModel'
import type { DateOffsetReading, DateSearchOutcome, SavedRecommendationV3, SimulationResult } from '@shared/model'
import type { TableLanes } from '../../../shell/Shell'
import { PAGES, RoutedShell, showPage, shownScreen } from '../../../shell/__tests__/routedShell'
import type { RailRecommendation } from '../../../workbench/useWhatIf'
import type { WhatIfSlotLanes } from '../../../workbench/whatIfRun'
import { appModel } from '../../../appModel'
import { DEV_SEEDS } from '../../../devSeeds'
import { copy, slots } from '../../../copy'
import { verdictReadingText } from '../../../verdictSentence'

/**
 * Probability's Action Items tray, through the real shell over the app's real store (plan 6, RC4, "The Action Items
 * tray"; U15's What if page tests, ported to the tray): edits are pending until Refresh, and Refresh commits the whole
 * bundle once and starts one run; a press reads the figure its own blur committed (insights 036, 149); a Refresh of an
 * unchanged bundle still asks (insight 159); a run in flight keeps the left half's numbers under "Loading…"; Reset
 * returns the plan's own reading; Apply reads the store at the press, writes through the writers and starts no solve, and
 * is withheld with its reasons; the recommendation runs its own action only while current; a facts-page link and the
 * assumption panel's rows open the tray at their row. The store's engine calls are spied away; every lane is held until
 * the test settles it.
 */

const recompute = vi.spyOn(appModel, 'recompute').mockResolvedValue(true)
const dispatchSolve = vi.spyOn(appModel, 'dispatchSolve').mockResolvedValue(undefined)

afterEach(cleanup)
beforeEach(() => {
  recompute.mockClear()
  dispatchSolve.mockClear()
})

const SEED = 0xbada55

interface Held {
  readonly req: EngineRunRequest
  readonly resolve: (r: LaneResult<SimulationResult>) => void
}

function heldLane() {
  const waiting: Held[] = []
  const request = vi.fn((req: EngineRunRequest) => new Promise<LaneResult<SimulationResult>>((resolve) => waiting.push({ req, resolve })))
  return { lane: { request }, request, waiting }
}

const rowsResult = (req: EngineRunRequest): LaneResult<SimulationResult> => {
  const out = simulate(req.params, req.seed, req.options)
  if (out.indeterminate || out.infeasible) throw new Error('[test setup] a row run failed')
  return { kind: 'ok', value: { distribution: out.distribution } as unknown as SimulationResult }
}

/** A many-futures result whose count names the request: on the spine the spending figure's ten-thousands digit
 *  (60,000 → 6). */
const manyResult = (req: EngineRunRequest): LaneResult<SimulationResult> => ({
  kind: 'ok',
  value: {
    headline: { xOfTen: { value: Math.round(req.params.annualSpendingReal / 10_000) % 10, marginToEdge: 0.1 }, outcomeState: 'borderline', stateMarginToEdge: 0.1 },
    seed: req.seed,
    distribution: { survivalFraction: 0.97, floor: { survivalFraction: 0.99 } },
  } as unknown as SimulationResult,
})

function lanesFor() {
  const table = heldLane()
  const many = heldLane()
  const steady = heldLane()
  const rough = heldLane()
  const tableLanes: TableLanes = { steady: table.lane, rough: table.lane }
  const whatIfLanes: WhatIfSlotLanes = { many: many.lane, steady: steady.lane, rough: rough.lane }
  const settle = async (which: readonly { waiting: Held[] }[], how: (req: EngineRunRequest) => LaneResult<SimulationResult>) => {
    await act(async () => {
      for (const l of which) for (const w of l.waiting.splice(0)) w.resolve(how(w.req))
    })
  }
  const settleWhatIf = async () => {
    await settle([many], manyResult)
    await settle([steady, rough], rowsResult)
  }
  return { tableLanes, whatIfLanes, table, many, steady, rough, settleWhatIf, settleTable: () => settle([table], rowsResult) }
}

const spine = (draft: ScenarioDraft, inputKey = 's1'): ModelAnswer =>
  ({
    kind: 'headline',
    tier: 'final',
    draft,
    inputKey,
    result: { headline: { xOfTen: { value: 7, marginToEdge: 0.1 }, outcomeState: 'borderline', stateMarginToEdge: 0.1 }, seed: SEED, distribution: { terminalValuesReal: [] } },
  }) as unknown as ModelAnswer

const curveOf = (start: number): DateOffsetReading[] =>
  Array.from({ length: DATE_OFFSET_WINDOW_TOP + 1 }, (_, y) => offsetReading({ offsetYears: y, survivalFraction: Math.min(1, start + y * 0.01) }, DATE_SEARCH_PATHS.final))

function dated(draft: ScenarioDraft, offset: number, inputKey = 'k1'): ModelAnswer {
  const trackOf = (curve: DateOffsetReading[]) => ({
    kind: 'confirmed-date',
    offsetYears: offset,
    grade: { quantizedLowerBound: curve[offset]!.quantizedLowerBound, survivalFraction: curve[offset]!.survivalFraction, marginAboveBar: 0 },
    nonMonotoneOffsets: [],
    curve,
  })
  const outcome = {
    kind: 'dates',
    tier: 'final',
    windowTopYears: DATE_OFFSET_WINDOW_TOP,
    seed: SEED,
    lifestyle: trackOf(curveOf(0.8)),
    floor: trackOf(curveOf(0.9)),
    band: { offsetYears: offset, track: 'lifestyle', fan: { byYear: [] } },
  } as unknown as DateSearchOutcome
  return { kind: 'date', tier: 'final', draft, outcome, inputKey } as ModelAnswer
}

function Room(props: { readonly answer: ModelAnswer; readonly tableLanes: TableLanes; readonly whatIfLanes: WhatIfSlotLanes; readonly recommendation?: RailRecommendation; readonly readOnly?: boolean; readonly initialRoute?: (typeof PAGES)[keyof typeof PAGES] }) {
  const snap = useSyncExternalStore(appModel.subscribe, appModel.getSnapshot)
  return (
    <RoutedShell
      initialRoute={props.initialRoute ?? PAGES.probability}
      save={{ kind: 'none' }}
      snapshot={{ ...snap, answer: props.answer }}
      model={appModel}
      lanes={props.tableLanes}
      whatIfLanes={props.whatIfLanes}
      readOnly={props.readOnly ?? false}
      wallCalendarYear={snap.draft.startCalendarYear}
      {...(props.recommendation !== undefined ? { recommendation: props.recommendation, recordCard: { record: props.recommendation.record, status: { current: props.recommendation.current } as never } } : {})}
    />
  )
}

/** Probability over a planted committed answer, the tray opened by its handle. */
function openTray(draft: ScenarioDraft, opts: { readonly answer?: ModelAnswer; readonly recommendation?: RailRecommendation; readonly readOnly?: boolean; readonly open?: boolean; readonly initialRoute?: (typeof PAGES)[keyof typeof PAGES] } = {}) {
  act(() => appModel.update(() => ({ ...draft, seed: SEED })))
  const l = lanesFor()
  const answer = opts.answer ?? spine({ ...draft, seed: SEED })
  const view = render(
    <Room
      answer={answer}
      tableLanes={l.tableLanes}
      whatIfLanes={l.whatIfLanes}
      {...(opts.recommendation !== undefined ? { recommendation: opts.recommendation } : {})}
      {...(opts.readOnly !== undefined ? { readOnly: opts.readOnly } : {})}
      {...(opts.initialRoute !== undefined ? { initialRoute: opts.initialRoute } : {})}
    />,
  )
  if (opts.open !== false) fireEvent.click(handle())
  return { ...l, view, answer }
}

const handle = () => screen.getByRole('button', { name: copy.trayHandle })
const tray = () => document.getElementById('b9-action-items') as HTMLElement
const refresh = () => within(tray()).getByRole('button', { name: copy.trayRefresh })
const applyButton = () => within(tray()).getByRole('button', { name: copy.workbenchRailApply })
const draftNow = () => appModel.getSnapshot().draft
/** The left half's ring centre (its printed count). */
const leftCount = () => document.querySelector('[data-half="alternative"] [data-ring-centre]')?.textContent ?? null
const leftBusy = () => document.querySelector('[data-half="alternative"] [aria-busy="true"]') !== null

/** Type a figure into a tray box and commit it with a blur (the box's own commit). */
function typeIn(label: string, text: string) {
  // The box, never the slider's own range input that shares the row's name.
  const field = within(tray())
    .getAllByLabelText(label)
    .find((el) => el instanceof HTMLInputElement && el.type === 'text')!
  act(() => field.focus())
  fireEvent.change(field, { target: { value: text } })
  act(() => field.blur())
  return field
}

describe('explicit Refresh: edits are pending, Refresh commits the bundle once and starts one run', () => {
  it('typing changes no figure and asks no run; Refresh asks once and the left half reads the new count', async () => {
    const l = openTray(DEV_SEEDS.retired)
    expect(leftCount(), '[test setup] the empty what-if reads the plan’s own count').toBe(verdictReadingText('borderline', 7))
    const field = typeIn(copy.workbenchRailSpendTotalLabel, '60,000')
    expect(l.many.request, 'a pending edit runs nothing').not.toHaveBeenCalled()
    expect(leftCount(), 'and moves no figure').toBe(verdictReadingText('borderline', 7))
    expect(within(tray()).getByText(copy.trayPending)).toBeInTheDocument()
    // The changed value's three cues sit on its box: the mark, medium weight, the 2 px left bar (never colour alone).
    const box = field.closest('[data-changed]') as HTMLElement
    expect(box).not.toBeNull()
    expect(box.className).toMatch(/font-medium/)
    expect(box.className).toMatch(/border-l-2/)
    expect(box.className).toMatch(/text-blue-ink/)
    // The pulled row's own way back is live.
    expect(within(tray()).getByRole('button', { name: slots.workbenchRailBackName(copy.workbenchRailSpendTitle) })).not.toHaveAttribute('inert')
    fireEvent.click(refresh())
    expect(l.many.request).toHaveBeenCalledTimes(1)
    expect(l.steady.request).toHaveBeenCalledTimes(1)
    expect(l.rough.request).toHaveBeenCalledTimes(1)
    expect(l.many.request.mock.calls[0]![0].params.annualSpendingReal).toBe(60_000)
    await l.settleWhatIf()
    expect(leftCount()).toBe(verdictReadingText('borderline', 6))
  })

  it('a figure typed and Refresh pressed in one task sends the figure the press’s own blur committed (insights 036, 149)', async () => {
    const l = openTray(DEV_SEEDS.retired)
    const field = within(tray()).getByLabelText(copy.workbenchRailSpendTotalLabel)
    act(() => field.focus())
    fireEvent.change(field, { target: { value: '50,000' } })
    // The blur and the press share one task: no render between them, so the press's render holds no edit at all.
    act(() => {
      field.blur()
      refresh().click()
    })
    expect(l.many.request).toHaveBeenCalledTimes(1)
    expect(l.many.request.mock.calls[0]![0].params.annualSpendingReal).toBe(50_000)
  })

  it('a Refresh of an unchanged bundle still asks once: a skip on "looks the same" is never taken (insight 159)', async () => {
    const l = openTray(DEV_SEEDS.retired)
    typeIn(copy.workbenchRailSpendTotalLabel, '60,000')
    fireEvent.click(refresh())
    fireEvent.click(refresh())
    expect(l.many.request).toHaveBeenCalledTimes(2)
    expect(l.many.request.mock.calls.map((c) => c[0].params.annualSpendingReal)).toEqual([60_000, 60_000])
  })

  it('while a run is in flight the left half keeps its numbers, faded under "Loading…"', async () => {
    const l = openTray(DEV_SEEDS.retired)
    typeIn(copy.workbenchRailSpendTotalLabel, '60,000')
    fireEvent.click(refresh())
    // The first run: the plan's own count, held, faded.
    expect(leftCount()).toBe(verdictReadingText('borderline', 7))
    expect(leftBusy()).toBe(true)
    expect(within(document.querySelector('[data-half="alternative"]') as HTMLElement).getByText(copy.probabilityLoading)).toBeInTheDocument()
    await l.settleWhatIf()
    expect(leftBusy()).toBe(false)
    typeIn(copy.workbenchRailSpendTotalLabel, '80,000')
    fireEvent.click(refresh())
    // The second: the first what-if's count stays put until the new one lands.
    expect(leftCount()).toBe(verdictReadingText('borderline', 6))
    expect(leftBusy()).toBe(true)
    await l.settleWhatIf()
    expect(leftCount()).toBe(verdictReadingText('borderline', 8))
  })

  it('Reset drops every lever, pending and committed: the plan’s own reading, and no run', async () => {
    const l = openTray(DEV_SEEDS.retired)
    typeIn(copy.workbenchRailSpendTotalLabel, '60,000')
    fireEvent.click(refresh())
    await l.settleWhatIf()
    typeIn(copy.workbenchRailSpendTotalLabel, '40,000')
    fireEvent.click(within(tray()).getByRole('button', { name: copy.trayReset }))
    expect(leftCount()).toBe(verdictReadingText('borderline', 7))
    expect(screen.getByText(copy.probabilityNoChanges)).toBeInTheDocument()
    expect(within(tray()).getByLabelText(copy.workbenchRailSpendTotalLabel)).toHaveValue(DEV_SEEDS.retired.annualSpendingReal!.toLocaleString('en-US'))
    expect(l.many.request).toHaveBeenCalledTimes(1)
  })

  it('the one-key rule: a run left behind by a newer Refresh never shows (insights 094, 159)', async () => {
    const l = openTray(DEV_SEEDS.retired)
    typeIn(copy.workbenchRailSpendTotalLabel, '60,000')
    fireEvent.click(refresh())
    typeIn(copy.workbenchRailSpendTotalLabel, '80,000')
    fireEvent.click(refresh())
    const [first, second] = l.many.waiting.splice(0)
    await act(async () => first!.resolve(manyResult(first!.req)))
    expect(leftCount(), 'the left-behind 60,000 run never renders').not.toBe(verdictReadingText('borderline', 6))
    await act(async () => second!.resolve(manyResult(second!.req)))
    expect(leftCount()).toBe(verdictReadingText('borderline', 8))
  })
})

describe('Apply — the one write (R16, R22; insight 158)', () => {
  it('writes through the writers, recomputes, starts no solve, and the tray goes back to the plan', async () => {
    const l = openTray(DEV_SEEDS.retired)
    typeIn(copy.workbenchRailSpendTotalLabel, '60,000')
    fireEvent.click(refresh())
    await l.settleWhatIf()
    expect(applyButton()).toHaveAttribute('aria-disabled', 'false')
    fireEvent.click(applyButton())
    expect(draftNow().annualSpendingReal).toBe(60_000)
    expect(recompute.mock.calls).toEqual([['final']])
    expect(dispatchSolve).not.toHaveBeenCalled()
    expect(within(tray()).getByText(copy.workbenchRailApplyDone)).toBeInTheDocument()
  })

  it('"Applied" is said once: a later what-if Reset back to the plan never brings it back', async () => {
    const l = openTray(DEV_SEEDS.retired)
    typeIn(copy.workbenchRailSpendTotalLabel, '60,000')
    fireEvent.click(refresh())
    await l.settleWhatIf()
    fireEvent.click(applyButton())
    expect(within(tray()).getByText(copy.workbenchRailApplyDone)).toBeInTheDocument()
    typeIn(copy.workbenchRailSpendTotalLabel, '50,000')
    fireEvent.click(refresh())
    fireEvent.click(within(tray()).getByRole('button', { name: copy.trayReset }))
    expect(within(tray()).queryByText(copy.workbenchRailApplyDone)).toBeNull()
  })

  it('a figure typed and Apply pressed in one task reads the edit the blur committed: not yet run, so it writes nothing', async () => {
    const l = openTray(DEV_SEEDS.retired)
    typeIn(copy.workbenchRailSpendTotalLabel, '60,000')
    fireEvent.click(refresh())
    await l.settleWhatIf()
    expect(applyButton()).toHaveAttribute('aria-disabled', 'false')
    const field = within(tray()).getByLabelText(copy.workbenchRailSpendTotalLabel)
    act(() => field.focus())
    fireEvent.change(field, { target: { value: '50,000' } })
    // Read from the press's render, Apply would write 60,000, a what-if the household just left.
    act(() => {
      field.blur()
      applyButton().click()
    })
    expect(draftNow().annualSpendingReal).toBe(DEV_SEEDS.retired.annualSpendingReal)
    expect(recompute).not.toHaveBeenCalled()
    expect(within(tray()).getByText(copy.trayApplyRefreshFirst)).toBeInTheDocument()
  })

  it('a refusal Apply said goes when its state moves on: pressed mid-run it goes when the run lands; "waits for Refresh" goes when Back undoes the edit', async () => {
    const l = openTray(DEV_SEEDS.retired)
    const words = () => tray().querySelector('[data-tray-words]')!.textContent
    typeIn(copy.workbenchRailSpendTotalLabel, '60,000')
    fireEvent.click(refresh())
    // An aria-disabled Apply still takes a press.
    fireEvent.click(applyButton())
    expect(words()).toBe(copy.workbenchRailApplyWaiting)
    await l.settleWhatIf()
    expect(applyButton()).toHaveAttribute('aria-disabled', 'false')
    expect(words(), 'the run landed: Apply is open, and no longer said to wait').toBe('')
    typeIn(copy.workbenchRailSpendTotalLabel, '50,000')
    fireEvent.click(applyButton())
    expect(within(tray()).getByText(copy.trayApplyRefreshFirst)).toBeInTheDocument()
    fireEvent.click(within(tray()).getByRole('button', { name: slots.workbenchRailBackName(copy.workbenchRailSpendTitle) }))
    expect(within(tray()).queryByText(copy.trayApplyRefreshFirst), 'Back undid the edit Apply waited on').toBeNull()
    expect(draftNow().annualSpendingReal).toBe(DEV_SEEDS.retired.annualSpendingReal)
  })

  it('leaving without Apply changes nothing: Reset, or another page and away', async () => {
    const l = openTray(DEV_SEEDS.retired)
    const before = draftNow()
    typeIn(copy.workbenchRailSpendTotalLabel, '60,000')
    fireEvent.click(refresh())
    await l.settleWhatIf()
    showPage('table')
    l.view.unmount()
    expect(draftNow()).toBe(before)
    expect(recompute).not.toHaveBeenCalled()
  })

  it('Apply moves the inputs the saved recommendation was found on, so the store’s own rule marks it stale; no solve starts', async () => {
    const goaled: ScenarioDraft = { ...DEV_SEEDS.retired, chosenGoal: 'leave-more' }
    const l = openTray(goaled)
    const fingerprint = appModel.currentDraftFingerprint()
    expect(fingerprint, '[test setup] the plan can build a solve').not.toBeNull()
    typeIn(copy.workbenchRailSpendTotalLabel, '60,000')
    fireEvent.click(refresh())
    await l.settleWhatIf()
    fireEvent.click(applyButton())
    expect(appModel.currentDraftFingerprint()).not.toBe(fingerprint)
    expect(dispatchSolve).not.toHaveBeenCalled()
  })

  it('a read-only tab can try a change, Refresh still runs, and there is no Apply', async () => {
    const l = openTray(DEV_SEEDS.retired, { readOnly: true })
    expect(within(tray()).queryByRole('button', { name: copy.workbenchRailApply })).toBeNull()
    typeIn(copy.workbenchRailSpendTotalLabel, '60,000')
    fireEvent.click(refresh())
    expect(l.many.request).toHaveBeenCalledTimes(1)
    expect(within(tray()).queryByRole('button', { name: copy.workbenchRailApply })).toBeNull()
    expect(within(tray()).getByText(copy.workbenchRailApplyReadOnly)).toBeInTheDocument()
  })

  it('a stop-year what-if withholds Apply with its reason, and a press writes nothing; the left ring names its own year', async () => {
    const draft = DEV_SEEDS.dip
    const l = openTray(draft, { answer: dated({ ...draft, seed: SEED }, 5) })
    typeIn(copy.workbenchRailStopLabel, String(draft.startCalendarYear + 7))
    fireEvent.click(refresh())
    expect(l.many.request).toHaveBeenCalledTimes(1)
    await l.settleWhatIf()
    const words = within(tray()).getByText(copy.workbenchRailApplyWithheldStop)
    expect(applyButton()).toHaveAttribute('aria-disabled', 'true')
    expect(applyButton()).toHaveAttribute('aria-describedby', words.id)
    const before = draftNow()
    fireEvent.click(applyButton())
    expect(draftNow()).toBe(before)
    expect(document.querySelector('[data-half="alternative"]')!.textContent).toContain(String(draft.startCalendarYear + 7))
  })

  it('on a plan with a confirmed working-year figure, a spending Apply says it needs confirming again and leaves the plan waiting on it', async () => {
    const draft = DEV_SEEDS.datesaved
    const l = openTray(draft, { answer: dated({ ...draft, seed: SEED }, 5) })
    if (draft.budget !== undefined) {
      const line = draft.budget.find((x) => x.id !== undefined)!
      typeIn(slots.workbenchRailLineAmount(line.label === '' ? copy.budgetCatOther : line.label), String(line.annualAmountReal - 6_000))
    } else {
      typeIn(copy.workbenchRailSpendTotalLabel, String((draft.annualSpendingReal ?? 0) - 6_000))
    }
    fireEvent.click(refresh())
    await l.settleWhatIf()
    expect(within(tray()).getByText(copy.workbenchRailApplyLeftOver)).toBeInTheDocument()
    fireEvent.click(applyButton())
    expect(workingYearLeftOverShownState(draftNow())).toBe('waiting-on-w')
    expect(draftNow().workingYearCost).toEqual(draft.workingYearCost)
  })
})

describe('deposits — the employer’s figure at a lower deposit (D7)', () => {
  const depositField = () => within(tray()).getByLabelText(/^Into .*401\(k\), dollars a year$/)

  it('lowering the own deposit asks for the employer’s figure, and Refresh runs nothing for it until the figure is given', async () => {
    const draft = DEV_SEEDS.dip
    const l = openTray(draft, { answer: dated({ ...draft, seed: SEED }, 5) })
    expect(within(tray()).queryByLabelText(copy.workbenchRailEmployerLabel)).toBeNull()
    const own = depositField()
    act(() => own.focus())
    fireEvent.change(own, { target: { value: '6,000' } })
    act(() => own.blur())
    const employer = within(tray()).getByLabelText(copy.workbenchRailEmployerLabel)
    expect(employer).toHaveValue('')
    expect(within(tray()).getByText(copy.workbenchRailEmployerWaiting)).toBeInTheDocument()
    fireEvent.click(refresh())
    expect(l.many.request, 'no deposits lever without the employer’s figure').not.toHaveBeenCalled()
    act(() => employer.focus())
    fireEvent.change(employer, { target: { value: '3,000' } })
    act(() => employer.blur())
    fireEvent.click(refresh())
    expect(l.many.request).toHaveBeenCalledTimes(1)
    expect(within(tray()).queryByText(copy.workbenchRailEmployerWaiting)).toBeNull()
  })

  it('a plan edit that removes the account takes its wait with it: nothing still says it waits for the employer', async () => {
    const draft = DEV_SEEDS.dip
    openTray(draft, { answer: dated({ ...draft, seed: SEED }, 5) })
    const own = depositField()
    act(() => own.focus())
    fireEvent.change(own, { target: { value: '6,000' } })
    act(() => own.blur())
    expect(within(tray()).getByText(copy.workbenchRailEmployerWaiting)).toBeInTheDocument()
    // The account leaves the plan (a facts-page edit); the answer shown is still the one figured before it.
    act(() => appModel.update((d) => ({ ...d, enteredAccounts: d.enteredAccounts.filter((a) => a.kind !== '401k') })))
    expect(within(tray()).queryByText(copy.workbenchRailEmployerWaiting)).toBeNull()
  })

  it('raising it asks nothing: the plan’s employer figure stands', async () => {
    const draft = DEV_SEEDS.dip
    const l = openTray(draft, { answer: dated({ ...draft, seed: SEED }, 5) })
    const own = depositField()
    act(() => own.focus())
    fireEvent.change(own, { target: { value: '30,000' } })
    act(() => own.blur())
    expect(within(tray()).queryByLabelText(copy.workbenchRailEmployerLabel)).toBeNull()
    fireEvent.click(refresh())
    expect(l.many.request).toHaveBeenCalledTimes(1)
  })
})

describe('the Recommended side (R22)', () => {
  const plan = { annualAmountReal: 30_000, startYearOffset: 1, years: 4 }
  const record = (rothConversion?: SavedRecommendationV3['action']['rothConversion']) =>
    ({ action: { candidateId: 'opaque', policy: 'custom', drawdownOrder: ['roth', 'taxable', 'pretax'], ...(rothConversion !== undefined ? { rothConversion } : {}) } }) as unknown as SavedRecommendationV3

  it('runs the record’s own order and Roth plan on landing, and the tray offers no editable control while it shows', async () => {
    const draft = DEV_SEEDS.retired
    expect(draft.drawdownPolicy, '[test setup] the plan’s order differs').not.toBe('custom')
    const l = openTray(draft, { recommendation: { record: record({ kind: 'plan', plan }), current: true } })
    await waitFor(() => expect(l.many.request).toHaveBeenCalledTimes(1))
    const params = l.many.request.mock.calls[0]![0].params
    expect(params.drawdownPolicy).toBe('custom')
    expect(params.drawdownOrder).toEqual(['roth', 'taxable', 'pretax'])
    expect(params.overlay?.conversions?.[1]).toBe(30_000)
    expect(tray().querySelectorAll('input, [role="combobox"]')).toHaveLength(0)
    expect(within(tray()).getByText(copy.workbenchRailRecShowing)).toBeInTheDocument()
    // Back to the household's own: the rows come back.
    fireEvent.click(within(tray()).getByRole('button', { name: copy.workbenchRailRecLeave }))
    expect(within(tray()).getByLabelText(copy.workbenchRailSpendTotalLabel)).toBeInTheDocument()
  })

  it('a record that goes stale while it is shown: the household’s own what-if returns, and its same-bundle Refresh still asks (insight 159)', async () => {
    const rec = record({ kind: 'plan', plan })
    const l = openTray(DEV_SEEDS.retired, { recommendation: { record: rec, current: true } })
    await waitFor(() => expect(l.many.request, '[test setup] the record ran on landing').toHaveBeenCalledTimes(1))
    l.view.rerender(<Room answer={l.answer} tableLanes={l.tableLanes} whatIfLanes={l.whatIfLanes} recommendation={{ record: rec, current: false }} />)
    typeIn(copy.workbenchRailSpendTotalLabel, '60,000')
    fireEvent.click(refresh())
    expect(l.many.request).toHaveBeenCalledTimes(2)
    fireEvent.click(refresh())
    expect(l.many.request, 'the same bundle again: one more ask').toHaveBeenCalledTimes(3)
  })

  it('a record the store no longer reads as current, or one saved before version 6, runs nothing', async () => {
    for (const rec of [
      { record: record({ kind: 'plan', plan }), current: false },
      { record: record(undefined), current: true },
    ] as const) {
      const l = openTray(DEV_SEEDS.retired, { recommendation: rec })
      expect(l.many.request).not.toHaveBeenCalled()
      expect(within(tray()).getByLabelText(copy.workbenchRailSpendTotalLabel), 'the household’s own what-if stands').toBeInTheDocument()
      cleanup()
    }
  })
})

describe('the Edit drawer and an added spending line', () => {
  const budgeted = Object.values(DEV_SEEDS).find((d) => !d.people.some((p) => p.workStatus === 'working') && (d.budget ?? []).some((l) => l.id !== undefined))!

  it('hiding a row takes it out of the tray and drops its pending edit; Select all brings it back', async () => {
    openTray(DEV_SEEDS.retired)
    const order = within(tray()).getByRole('combobox', { name: copy.workbenchRailOrderTitle })
    expect(order).toBeInTheDocument()
    fireEvent.click(within(tray()).getByRole('button', { name: copy.trayEdit }))
    const drawer = await screen.findByRole('dialog', { name: copy.trayEditTitle })
    fireEvent.click(within(drawer).getByRole('checkbox', { name: copy.workbenchRailOrderTitle }))
    fireEvent.click(within(drawer).getByRole('button', { name: copy.traySave }))
    await waitFor(() => expect(within(tray()).queryByRole('combobox', { name: copy.workbenchRailOrderTitle })).toBeNull())
    fireEvent.click(within(tray()).getByRole('button', { name: copy.trayEdit }))
    const again = await screen.findByRole('dialog', { name: copy.trayEditTitle })
    fireEvent.click(within(again).getByRole('checkbox', { name: copy.trayEditSelectAll }))
    fireEvent.click(within(again).getByRole('button', { name: copy.traySave }))
    await waitFor(() => expect(within(tray()).getByRole('combobox', { name: copy.workbenchRailOrderTitle })).toBeInTheDocument())
  })

  it('"Add new items" opens the spending line drawer; the saved line sits in Expenses with the green "+" dot, its words and its name as a link back to its drawer', async () => {
    expect(budgeted, '[test setup] a retired seed with a budget').toBeDefined()
    openTray(budgeted)
    fireEvent.click(within(tray()).getByRole('button', { name: copy.trayEdit }))
    const drawer = await screen.findByRole('dialog', { name: copy.trayEditTitle })
    fireEvent.click(within(drawer).getByRole('button', { name: copy.trayEditAddNew }))
    fireEvent.click(await screen.findByRole('menuitem', { name: copy.traySectionExpenses }))
    fireEvent.click(await screen.findByRole('menuitem', { name: copy.trayEditAddLine }))
    const line = await screen.findByRole('dialog', { name: copy.trayLineTitle })
    fireEvent.change(within(line).getByLabelText(copy.budgetLineLabelLabel), { target: { value: 'Boat' } })
    const amount = within(line).getByLabelText(copy.budgetAmountLabel)
    act(() => amount.focus())
    fireEvent.change(amount, { target: { value: '9,000' } })
    act(() => amount.blur())
    fireEvent.click(within(line).getByRole('button', { name: copy.traySave }))
    const link = await within(tray()).findByRole('button', { name: 'Boat' })
    const row = link.closest('[data-tray-row]') as HTMLElement
    expect(within(row).getByText(copy.workbenchRailLineNew)).toBeInTheDocument()
    fireEvent.click(link)
    expect(await screen.findByRole('dialog', { name: copy.trayLineTitle })).toBeInTheDocument()
  })
})

describe('the Roth row carries the Roth sheet’s honesty lines while it holds a plan (plan 5.2’s port)', () => {
  it('None shows no Roth lines; a set amount each year, typed whole, shows the funding and omissions notes; None again takes them away', async () => {
    const user = userEvent.setup()
    openTray(DEV_SEEDS.retired)
    const row = () => tray().querySelector('[data-tray-row="roth"]') as HTMLElement
    expect(within(row()).queryByText(copy.rothFundingNote), 'None: no plan in either column').toBeNull()
    await user.click(within(row()).getByRole('combobox'))
    await user.click(await screen.findByRole('option', { name: copy.workbenchRailRothAmount }))
    await within(tray()).findByLabelText(copy.leverRothAmountLabel)
    typeIn(copy.leverRothAmountLabel, '20,000')
    await waitFor(() => expect(within(row()).getByText(copy.rothFundingNote)).toBeInTheDocument())
    const omissions = [copy.rothOmissionsNote, copy.rothOmissionsNoteStatePriced, copy.rothOmissionsNoteAll65, copy.rothOmissionsNoteStatePricedAll65, copy.rothOmissionsNoteAcaPriced, copy.rothOmissionsNoteStatePricedAcaPriced]
    expect(omissions.some((o) => within(row()).queryByText(o) !== null), 'one of the omissions note’s arms').toBe(true)
    await user.click(within(row()).getByRole('combobox'))
    await user.click(await screen.findByRole('option', { name: copy.workbenchRailRothNone }))
    await waitFor(() => expect(within(row()).queryByText(copy.rothFundingNote)).toBeNull())
  })
})

describe('doors into a lever open the tray at its row, and no sheet', () => {
  for (const [label, lever] of [
    [copy.assumptionDrawdownName, 'withdrawal-order'],
    [copy.assumptionRothName, 'roth'],
  ] as const) {
    it(`the facts page’s "${label}" opens Probability with the tray at its row`, async () => {
      openTray(DEV_SEEDS.retired, { open: false })
      showPage('facts')
      fireEvent.click(screen.getByRole('button', { name: slots.workbenchFactsTryName(label) }))
      expect(shownScreen()).toBe('probability')
      expect(screen.queryByRole('dialog')).toBeNull()
      expect(handle()).toHaveAttribute('aria-expanded', 'true')
      await waitFor(() => expect(tray().querySelector(`[data-tray-group="${lever}"]`)!.contains(document.activeElement)).toBe(true), { timeout: 5_000 })
    })
  }

  it('with a current saved recommendation, a door’s first trip to Probability shows the household’s own what-if at the row it asked for, never Recommended', async () => {
    const record = { action: { candidateId: 'opaque', policy: 'custom', drawdownOrder: ['roth', 'taxable', 'pretax'], rothConversion: { kind: 'none' } } } as unknown as SavedRecommendationV3
    // The facts page first: Probability has not shown yet this session, so its landing pick (Recommended) is still owed.
    openTray(DEV_SEEDS.retired, { open: false, initialRoute: PAGES.facts, recommendation: { record, current: true } })
    fireEvent.click(screen.getByRole('button', { name: slots.workbenchFactsTryName(copy.assumptionDrawdownName) }))
    expect(shownScreen()).toBe('probability')
    expect(handle()).toHaveAttribute('aria-expanded', 'true')
    await waitFor(() => expect(tray().querySelector('[data-tray-group="withdrawal-order"]')!.contains(document.activeElement)).toBe(true), { timeout: 5_000 })
    expect(within(tray()).queryByText(copy.workbenchRailRecShowing), 'the record’s words are not what the tray shows').toBeNull()
    expect(document.querySelector('[data-half="alternative"]')!.getAttribute('aria-label')).toBe(copy.probabilityPickNew)
  })

  it('the assumption panel’s withdrawal-order row opens the tray at its row (the sheet it opened is gone)', async () => {
    openTray(DEV_SEEDS.retired, { open: false })
    fireEvent.click(screen.getByRole('button', { name: copy.shellGearLabel }))
    const panel = await screen.findByRole('dialog')
    fireEvent.click(within(panel).getByRole('button', { name: new RegExp(`^(${copy.leverSequencingCta}|${copy.leverSequencingEditCta})$`) }))
    await waitFor(() => expect(handle()).toHaveAttribute('aria-expanded', 'true'), { timeout: 5_000 })
    expect(shownScreen()).toBe('probability')
    await waitFor(() => expect(tray().querySelector('[data-tray-group="withdrawal-order"]')!.contains(document.activeElement)).toBe(true), { timeout: 5_000 })
  })
})
