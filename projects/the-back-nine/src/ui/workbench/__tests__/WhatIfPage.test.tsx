// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { useSyncExternalStore } from 'react'
import { simulate } from '@engine/simulate'
import { DATE_OFFSET_WINDOW_TOP, DATE_SEARCH_PATHS, offsetReading } from '@engine/dateSearch'
import { workingYearLeftOverShownState } from '@intake/intakeMap'
import type { EngineRunRequest, LaneResult } from '@store/runLanes'
import type { ModelAnswer, ScenarioDraft } from '@store/memoryModel'
import type { DateOffsetReading, DateSearchOutcome, SavedRecommendationV3, SimulationResult } from '@shared/model'
import WorkbenchRoom, { type TableLanes } from '../WorkbenchRoom'
import type { RailRecommendation } from '../WhatIfPage'
import type { WhatIfSlotLanes } from '../whatIfRun'
import { appModel } from '../../appModel'
import { DEV_SEEDS } from '../../devSeeds'
import { copy, slots } from '../../copy'

/**
 * The What if page (workbench plan U15; R16 to R20, R22): a control commits on blur or Enter and nothing runs before;
 * Apply reads the store at the press, writes through the writers and starts no solve; the recommendation's row runs the
 * record's own action only while current; a stop year withholds Apply; a spending Apply on a confirmed working-year
 * figure leaves the plan waiting on it; a lever put back while its run is queued never shows that run. The store is the
 * app's real one (its engine calls spied away); every lane is held until the test settles it.
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

/** A lane that holds each request until the test settles it. */
function heldLane() {
  const waiting: Held[] = []
  const request = vi.fn((req: EngineRunRequest) => new Promise<LaneResult<SimulationResult>>((resolve) => waiting.push({ req, resolve })))
  return { lane: { request }, request, waiting }
}

/** A row run's result: the engine's own one-path ledger rows. */
const rowsResult = (req: EngineRunRequest): LaneResult<SimulationResult> => {
  const out = simulate(req.params, req.seed, req.options)
  if (out.indeterminate || out.infeasible) throw new Error('[test setup] a row run failed')
  return { kind: 'ok', value: { distribution: out.distribution } as unknown as SimulationResult }
}

/** A many-futures result whose reading names the request: on the spine the count is the spending figure's ten-thousands
 *  digit (60,000 → 6), on the date route the full pass's survival is fixed. */
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
  const settleTable = () => settle([table], rowsResult)
  const settleWhatIf = async () => {
    await settle([many], manyResult)
    await settle([steady, rough], rowsResult)
  }
  return { tableLanes, whatIfLanes, table, many, steady, rough, settleTable, settleWhatIf }
}

const spine = (draft: ScenarioDraft, inputKey = 's1'): ModelAnswer =>
  ({
    kind: 'headline',
    tier: 'final',
    draft,
    inputKey,
    result: { headline: { xOfTen: { value: 7, marginToEdge: 0.1 }, outcomeState: 'borderline', stateMarginToEdge: 0.1 }, seed: SEED, distribution: {} },
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
    band: { offsetYears: offset, track: 'lifestyle' },
  } as unknown as DateSearchOutcome
  return { kind: 'date', tier: 'final', draft, outcome, inputKey } as ModelAnswer
}

/** The room over the app's store, the committed answer planted. */
function Room(props: {
  readonly answer: ModelAnswer
  readonly tableLanes: TableLanes
  readonly whatIfLanes: WhatIfSlotLanes
  readonly recommendation?: RailRecommendation
  readonly readOnly?: boolean
}) {
  const snap = useSyncExternalStore(appModel.subscribe, appModel.getSnapshot)
  return (
    <WorkbenchRoom
      save={{ kind: 'none' }}
      onBack={() => {}}
      snapshot={{ ...snap, answer: props.answer }}
      model={appModel}
      lanes={props.tableLanes}
      whatIfLanes={props.whatIfLanes}
      readOnly={props.readOnly ?? false}
      wallCalendarYear={snap.draft.startCalendarYear}
      {...(props.recommendation !== undefined ? { recommendation: props.recommendation } : {})}
    />
  )
}

async function openWhatIf(
  draft: ScenarioDraft,
  opts: { readonly answer?: ModelAnswer; readonly recommendation?: RailRecommendation; readonly readOnly?: boolean } = {},
) {
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
    />,
  )
  await l.settleTable()
  fireEvent.click(screen.getByRole('tab', { name: copy.workbenchPageWhatIf }))
  return { ...l, view, answer }
}

const lever = (kind: string) => document.querySelector<HTMLDetailsElement>(`.wb-lever[data-lever="${kind}"]`)!
const openLever = (kind: string) => {
  const el = lever(kind)
  el.open = true
  return el
}
const readingOf = (label: string) => screen.getByText(label, { selector: '.wb-reading__label' }).closest('.wb-reading') as HTMLElement
const applyButton = () => screen.getByRole('button', { name: copy.workbenchRailApply })
const draftNow = () => appModel.getSnapshot().draft

/** Type a figure into a rail field and commit it with a blur (the field's own commit). */
function commitFigure(label: string, text: string) {
  const field = screen.getByLabelText(label)
  act(() => field.focus())
  fireEvent.change(field, { target: { value: text } })
  act(() => field.blur())
}

describe('a control commits on blur or Enter, and nothing runs before (R18)', () => {
  it('typing changes no figure and asks no run; the commit asks once and the paired years draw once', async () => {
    const l = await openWhatIf(DEV_SEEDS.retired)
    openLever('spending')
    const field = screen.getByLabelText(copy.workbenchRailSpendTotalLabel)
    act(() => field.focus())
    fireEvent.change(field, { target: { value: '60,000' } })
    fireEvent.change(field, { target: { value: '60,00' } })
    expect(l.many.request).not.toHaveBeenCalled()
    expect(within(readingOf(copy.workbenchRailWhatIfLabel)).getByText(copy.workbenchRailEmptyReading)).toBeInTheDocument()
    fireEvent.change(field, { target: { value: '60,000' } })
    fireEvent.keyDown(field, { key: 'Enter' })
    expect(l.many.request).toHaveBeenCalledTimes(1)
    expect(l.steady.request).toHaveBeenCalledTimes(1)
    expect(l.rough.request).toHaveBeenCalledTimes(1)
    expect(l.many.request.mock.calls[0]![0].params.annualSpendingReal).toBe(60_000)
    // A blur after Enter commits nothing new: the figure is already the lever's.
    act(() => field.blur())
    expect(l.many.request).toHaveBeenCalledTimes(1)
    await l.settleWhatIf()
    expect(within(readingOf(copy.workbenchRailWhatIfLabel)).getByText(slots.xOfTen(6))).toBeInTheDocument()
    expect(document.querySelectorAll('.wb-pair')).toHaveLength(1)
    // The paired years' spending pair: the plan's figure and the what-if's, each tied to its run's row header.
    const firstYear = document.querySelector('.wb-pair__year')!
    const cells = firstYear.querySelectorAll('td')
    const headersOf = (td: Element) => (td.getAttribute('headers') ?? '').split(' ').map((id) => document.getElementById(id)?.textContent)
    expect(headersOf(cells[0]!)).toContain(copy.workbenchRailPlanLabel)
    expect(headersOf(cells[0]!)).toContain(copy.workbenchColSpending)
    const whatIfCells = firstYear.querySelectorAll('.wb-pair__what-if td')
    expect(headersOf(whatIfCells[0]!)).toContain(copy.workbenchRailWhatIfLabel)
    // On the phone form each figure carries its run's name as visible text.
    const block = document.querySelector('.wb-pair-block')!
    expect(within(block as HTMLElement).getAllByText(copy.workbenchRailPlanLabel).length).toBeGreaterThan(0)
    expect(within(block as HTMLElement).getAllByText(copy.workbenchRailWhatIfLabel).length).toBeGreaterThan(0)
  })

  it('a commit followed at once by Apply, in one task, reads the bundle the blur committed, not the render before it (insights 036, 149)', async () => {
    const l = await openWhatIf(DEV_SEEDS.retired)
    openLever('spending')
    // What-if A (60,000) is worked out: Apply is open on it.
    commitFigure(copy.workbenchRailSpendTotalLabel, '60,000')
    await l.settleWhatIf()
    expect(applyButton()).toHaveAttribute('aria-disabled', 'false')
    const field = screen.getByLabelText(copy.workbenchRailSpendTotalLabel)
    act(() => field.focus())
    fireEvent.change(field, { target: { value: '50,000' } })
    // The blur (committing B, 50,000) and the press share one task: no render between them, so the press's render still
    // holds A, worked out and open. Read from that render, the press would write A, a what-if the household just left.
    act(() => {
      field.blur()
      applyButton().click()
    })
    // It read B, the bundle the blur committed: not yet worked out, so it wrote nothing at all.
    expect(draftNow().annualSpendingReal).toBe(DEV_SEEDS.retired.annualSpendingReal)
    expect(recompute).not.toHaveBeenCalled()
    expect(l.many.request).toHaveBeenCalledTimes(2)
    expect(l.many.request.mock.calls[1]![0].params.annualSpendingReal).toBe(50_000)
  })
})

describe('Apply — the one write (R16, R22; insight 158)', () => {
  it('writes through the writers, recomputes, starts no solve, and the rail goes back to the plan', async () => {
    const l = await openWhatIf(DEV_SEEDS.retired)
    openLever('spending')
    commitFigure(copy.workbenchRailSpendTotalLabel, '60,000')
    await l.settleWhatIf()
    expect(applyButton()).toHaveAttribute('aria-disabled', 'false')
    fireEvent.click(applyButton())
    expect(draftNow().annualSpendingReal).toBe(60_000)
    expect(recompute.mock.calls).toEqual([['final']])
    expect(dispatchSolve).not.toHaveBeenCalled()
    expect(screen.getByText(copy.workbenchRailApplyDone, { selector: '.wb-apply__words' })).toBeInTheDocument()
    expect(within(readingOf(copy.workbenchRailWhatIfLabel)).getByText(copy.workbenchRailEmptyReading)).toBeInTheDocument()
  })

  it('closing the what-if without Apply changes nothing: back to the plan, or another page and away', async () => {
    const l = await openWhatIf(DEV_SEEDS.retired)
    const before = draftNow()
    openLever('spending')
    commitFigure(copy.workbenchRailSpendTotalLabel, '60,000')
    await l.settleWhatIf()
    fireEvent.click(screen.getByRole('button', { name: slots.workbenchRailBackName(copy.workbenchRailSpendTitle) }))
    commitFigure(copy.workbenchRailSpendTotalLabel, '50,000')
    fireEvent.click(screen.getByRole('tab', { name: copy.workbenchPageTable }))
    l.view.unmount()
    expect(draftNow()).toBe(before)
    expect(recompute).not.toHaveBeenCalled()
  })

  it('Apply moves the inputs the saved recommendation was found on, so the store’s own rule marks it stale; no solve starts', async () => {
    const goaled: ScenarioDraft = { ...DEV_SEEDS.retired, chosenGoal: 'leave-more' }
    const l = await openWhatIf(goaled)
    const fingerprint = appModel.currentDraftFingerprint()
    expect(fingerprint, '[test setup] the plan can build a solve').not.toBeNull()
    openLever('spending')
    commitFigure(copy.workbenchRailSpendTotalLabel, '60,000')
    await l.settleWhatIf()
    fireEvent.click(applyButton())
    expect(appModel.currentDraftFingerprint()).not.toBe(fingerprint)
    expect(dispatchSolve).not.toHaveBeenCalled()
  })

  it('a read-only tab can try a change and cannot apply it', async () => {
    await openWhatIf(DEV_SEEDS.retired, { readOnly: true })
    expect(screen.queryByRole('button', { name: copy.workbenchRailApply })).toBeNull()
    expect(screen.getByText(copy.workbenchRailApplyReadOnly)).toBeInTheDocument()
  })
})

describe('Apply withheld, and the working-year figure after a spending Apply', () => {
  it('a stop-year what-if withholds Apply with its reason, and a press writes nothing', async () => {
    const draft = DEV_SEEDS.dip
    const l = await openWhatIf(draft, { answer: dated({ ...draft, seed: SEED }, 5) })
    openLever('stop-year')
    fireEvent.change(within(lever('stop-year')).getByLabelText(copy.workbenchRailStopLabel), { target: { value: String(draft.startCalendarYear + 7) } })
    expect(l.many.request).toHaveBeenCalledTimes(1)
    await l.settleWhatIf()
    const words = screen.getByText(copy.workbenchRailApplyWithheldStop, { selector: '.wb-apply__words' })
    expect(applyButton()).toHaveAttribute('aria-disabled', 'true')
    expect(applyButton()).toHaveAttribute('aria-describedby', words.id)
    const before = draftNow()
    fireEvent.click(applyButton())
    expect(draftNow()).toBe(before)
    // The odds name the stop year each reads (OQ6).
    expect(within(readingOf(copy.workbenchRailPlanLabel)).getByText(slots.workbenchRailStopsPlan(draft.startCalendarYear + 5))).toBeInTheDocument()
    expect(within(readingOf(copy.workbenchRailWhatIfLabel)).getByText(slots.workbenchRailStopsWhatIf(draft.startCalendarYear + 7))).toBeInTheDocument()
  })

  it('on a plan with a confirmed working-year figure, a spending Apply says it needs confirming again and leaves the plan waiting on it', async () => {
    const draft = DEV_SEEDS.datesaved
    const l = await openWhatIf(draft, { answer: dated({ ...draft, seed: SEED }, 5) })
    openLever('spending')
    if (draft.budget !== undefined) {
      const line = draft.budget.find((x) => x.id !== undefined)!
      commitFigure(slots.workbenchRailLineAmount(line.label === '' ? copy.budgetCatOther : line.label), String(line.annualAmountReal - 6_000))
    } else {
      commitFigure(copy.workbenchRailSpendTotalLabel, String((draft.annualSpendingReal ?? 0) - 6_000))
    }
    await l.settleWhatIf()
    expect(screen.getByText(copy.workbenchRailApplyLeftOver, { selector: '.wb-apply__words' })).toBeInTheDocument()
    fireEvent.click(applyButton())
    expect(workingYearLeftOverShownState(draftNow())).toBe('waiting-on-w')
    expect(draftNow().workingYearCost).toEqual(draft.workingYearCost)
    expect(screen.getByText(new RegExp(copy.workbenchRailApplyLeftOver.slice(0, 40)), { selector: '.wb-apply__words' })).toBeInTheDocument()
  })
})

describe('deposits — the employer’s figure at a lower deposit (D7; the plan’s U15)', () => {
  const depositField = () => within(lever('deposits')).getByLabelText(/^Into .*401\(k\), dollars a year$/)
  const commitIn = (field: HTMLElement, text: string) => {
    act(() => field.focus())
    fireEvent.change(field, { target: { value: text } })
    act(() => field.blur())
  }

  it('lowering the own deposit on an account with an employer dollar asks for the employer’s figure and runs nothing until it is given', async () => {
    const draft = DEV_SEEDS.dip
    const l = await openWhatIf(draft, { answer: dated({ ...draft, seed: SEED }, 5) })
    openLever('deposits')
    expect(within(lever('deposits')).queryByLabelText(copy.workbenchRailEmployerLabel)).toBeNull()
    commitIn(depositField(), '6,000')
    const employer = within(lever('deposits')).getByLabelText(copy.workbenchRailEmployerLabel)
    expect(employer).toHaveValue('')
    expect(within(lever('deposits')).getByText(copy.workbenchRailEmployerWaiting)).toBeInTheDocument()
    expect(l.many.request).not.toHaveBeenCalled()
    commitIn(employer, '3,000')
    expect(l.many.request).toHaveBeenCalledTimes(1)
    expect(within(lever('deposits')).queryByText(copy.workbenchRailEmployerWaiting)).toBeNull()
  })

  it('raising it asks nothing: the plan’s employer figure stands', async () => {
    const draft = DEV_SEEDS.dip
    const l = await openWhatIf(draft, { answer: dated({ ...draft, seed: SEED }, 5) })
    openLever('deposits')
    commitIn(depositField(), '10,000')
    expect(within(lever('deposits')).queryByLabelText(copy.workbenchRailEmployerLabel)).toBeNull()
    expect(l.many.request).toHaveBeenCalledTimes(1)
  })
})

describe('the saved recommendation’s row (R22)', () => {
  const plan = { annualAmountReal: 30_000, startYearOffset: 1, years: 4 }
  const record = (rothConversion?: SavedRecommendationV3['action']['rothConversion']) =>
    ({
      action: { candidateId: 'opaque', policy: 'custom', drawdownOrder: ['roth', 'taxable', 'pretax'], ...(rothConversion !== undefined ? { rothConversion } : {}) },
    }) as unknown as SavedRecommendationV3

  it('runs the record’s own order and Roth plan, which differ from the plan’s, with no editable control', async () => {
    const draft = DEV_SEEDS.retired
    expect(draft.drawdownPolicy, '[test setup] the plan’s order differs').not.toBe('custom')
    expect(draft.rothConversion, '[test setup] the plan converts nothing').toBeUndefined()
    const l = await openWhatIf(draft, { recommendation: { record: record({ kind: 'plan', plan }), current: true } })
    expect(l.many.request).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: copy.workbenchRailRecTry }))
    expect(l.many.request).toHaveBeenCalledTimes(1)
    const params = l.many.request.mock.calls[0]![0].params
    expect(params.drawdownPolicy).toBe('custom')
    expect(params.drawdownOrder).toEqual(['roth', 'taxable', 'pretax'])
    expect(params.overlay?.conversions?.[1]).toBe(30_000)
    const rail = document.querySelector('.wb-rail') as HTMLElement
    expect(rail.querySelectorAll('input, select, textarea')).toHaveLength(0)
    expect(within(rail).getByText(copy.workbenchRailRecShowing)).toBeInTheDocument()
  })

  it('a record the store no longer reads as current, or one saved before version 6, says so and runs nothing', async () => {
    for (const [rec, words] of [
      [{ record: record({ kind: 'plan', plan }), current: false }, copy.workbenchRailRecStale],
      [{ record: record(undefined), current: true }, copy.workbenchRailRecOld],
    ] as const) {
      const l = await openWhatIf(DEV_SEEDS.retired, { recommendation: rec })
      expect(screen.getByText(words)).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: copy.workbenchRailRecTry })).toBeNull()
      expect(l.many.request).not.toHaveBeenCalled()
      cleanup()
    }
  })
})

describe('the one-key rule on the page (insights 094, 159)', () => {
  it('a lever pulled, put back and another pulled while the first run is queued: the first run never shows', async () => {
    const l = await openWhatIf(DEV_SEEDS.retired)
    openLever('spending')
    commitFigure(copy.workbenchRailSpendTotalLabel, '60,000')
    expect(l.many.request).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: slots.workbenchRailBackName(copy.workbenchRailSpendTitle) }))
    commitFigure(copy.workbenchRailSpendTotalLabel, '80,000')
    expect(l.many.request).toHaveBeenCalledTimes(2)
    // The first (60,000) lands late: it never renders under the newer bundle.
    const [first, second] = l.many.waiting.splice(0)
    await act(async () => first!.resolve(manyResult(first!.req)))
    const whatIf = readingOf(copy.workbenchRailWhatIfLabel)
    expect(within(whatIf).queryByText(slots.xOfTen(6))).toBeNull()
    expect(within(whatIf).getByText(copy.workbenchRailWorking)).toBeInTheDocument()
    await act(async () => second!.resolve(manyResult(second!.req)))
    expect(within(whatIf).getByText(slots.xOfTen(8))).toBeInTheDocument()
  })

  it('the rail keeps its open lever and its focus when the pinned answer lands (insight 047)', async () => {
    act(() => appModel.update(() => ({ ...DEV_SEEDS.retired, seed: SEED })))
    const l = lanesFor()
    const view = render(<Room answer={spine({ ...DEV_SEEDS.retired, seed: SEED })} tableLanes={l.tableLanes} whatIfLanes={l.whatIfLanes} />)
    fireEvent.click(screen.getByRole('tab', { name: copy.workbenchPageWhatIf }))
    openLever('withdrawal-order')
    const radio = within(lever('withdrawal-order')).getAllByRole('radio')[0]!
    act(() => radio.focus())
    view.rerender(<Room answer={spine({ ...DEV_SEEDS.retired, seed: SEED }, 's2')} tableLanes={l.tableLanes} whatIfLanes={l.whatIfLanes} />)
    expect(lever('withdrawal-order').open).toBe(true)
    expect(radio).toHaveFocus()
  })
})

describe('the facts page’s lever lines link to the What if page and open no editor (U8’s swap)', () => {
  for (const [label, kind] of [
    [copy.assumptionDrawdownName, 'withdrawal-order'],
    [copy.assumptionRothName, 'roth'],
  ] as const) {
    it(`"${label}" opens the What if page at its lever, and no sheet`, async () => {
      await openWhatIf(DEV_SEEDS.retired)
      fireEvent.click(screen.getByRole('tab', { name: copy.workbenchPageFacts }))
      fireEvent.click(screen.getByRole('button', { name: slots.workbenchFactsTryName(label) }))
      expect(screen.getByRole('tab', { name: copy.workbenchPageWhatIf })).toHaveAttribute('aria-selected', 'true')
      expect(screen.queryByRole('dialog')).toBeNull()
      expect(lever(kind).open).toBe(true)
      expect(lever(kind).querySelector('summary')).toHaveFocus()
    })
  }

  it('the subsidy regime too: its line links to the What if page and opens no editor', async () => {
    await openWhatIf(DEV_SEEDS.health)
    fireEvent.click(screen.getByRole('tab', { name: copy.workbenchPageFacts }))
    expect(screen.queryByRole('button', { name: slots.workbenchFactsEditName(copy.assumptionRegimeName) })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: slots.workbenchFactsTryName(copy.assumptionRegimeName) }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(lever('aca-subsidy').open).toBe(true)
  })
})
