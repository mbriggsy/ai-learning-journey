// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { useSyncExternalStore } from 'react'
import userEvent from '@testing-library/user-event'
import type { EngineRunRequest, LaneResult } from '@store/runLanes'
import type { ModelAnswer, ScenarioDraft } from '@store/memoryModel'
import type { KeptWhatIfV6, SimulationResult } from '@shared/model'
import type { ResultSaveProp } from '../../../saveAnnouncer'
import type { TableLanes } from '../../../shell/Shell'
import { PAGES, RoutedShell } from '../../../shell/__tests__/routedShell'
import type { WhatIfSlotLanes } from '../../../workbench/whatIfRun'
import { appModel } from '../../../appModel'
import { DEV_SEEDS } from '../../../devSeeds'
import { copy, slots } from '../../../copy'
import { verdictReadingText } from '../../../verdictSentence'
import type { KeptEdit, KeptWriteOutcome } from '../planListView'

/**
 * The plan list and kept what-ifs through the real shell over the app's real store (plan 6, RC5's test scenarios): two
 * kept what-ifs compared left against right, each on its own slot with its own reading; a read-only tab lists and opens
 * kept what-ifs and offers no write; Keep with unsaved changes is not offered and says why, the write never called; a
 * reopened kept what-if, edited, reads "changed, not kept", holds, and opening another asks first; Keep writes through
 * the one write with the tray's committed bundle and the half takes the new name; a kept what-if whose account is gone
 * says so and runs nothing. The store's engine calls are spied away; every lane is held until the test settles it.
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

/** A many-futures result whose count names the request: the spending figure's ten-thousands digit (60,000 → 6). */
const manyResult = (req: EngineRunRequest): LaneResult<SimulationResult> => ({
  kind: 'ok',
  value: {
    headline: { xOfTen: { value: Math.round(req.params.annualSpendingReal / 10_000) % 10, marginToEdge: 0.1 }, outcomeState: 'borderline', stateMarginToEdge: 0.1 },
    seed: req.seed,
    distribution: { survivalFraction: 0.97, floor: { survivalFraction: 0.99 } },
  } as unknown as SimulationResult,
})
const noRows = (): LaneResult<SimulationResult> => ({ kind: 'ok', value: { distribution: { ledgerRows: [] } } as unknown as SimulationResult })

function slotLanes() {
  const many = heldLane()
  const steady = heldLane()
  const rough = heldLane()
  const lanes: WhatIfSlotLanes = { many: many.lane, steady: steady.lane, rough: rough.lane }
  const settle = async () => {
    await act(async () => {
      for (const w of many.waiting.splice(0)) w.resolve(manyResult(w.req))
      for (const l of [steady, rough]) for (const w of l.waiting.splice(0)) w.resolve(noRows())
    })
  }
  return { lanes, many, settle }
}

const spine = (draft: ScenarioDraft): ModelAnswer =>
  ({
    kind: 'headline',
    tier: 'final',
    draft,
    inputKey: 's1',
    result: { headline: { xOfTen: { value: 7, marginToEdge: 0.1 }, outcomeState: 'borderline', stateMarginToEdge: 0.1 }, seed: SEED, distribution: { terminalValuesReal: [] } },
  }) as unknown as ModelAnswer

const KEPT: readonly KeptWhatIfV6[] = [
  { id: 'kept-a', name: 'Spend less', levers: [{ kind: 'spending', op: 'total', annualSpendingReal: 60_000 }] },
  { id: 'kept-b', name: 'Spend a lot less', levers: [{ kind: 'spending', op: 'total', annualSpendingReal: 50_000 }] },
]

function Room(props: {
  readonly answer: ModelAnswer
  readonly left: WhatIfSlotLanes
  readonly right: WhatIfSlotLanes
  readonly save: ResultSaveProp
  readonly readOnly?: boolean
  readonly onWriteKept?: (edit: KeptEdit, keep?: string) => Promise<KeptWriteOutcome>
  readonly onWhatIfHeld?: (held: boolean) => void
}) {
  const snap = useSyncExternalStore(appModel.subscribe, appModel.getSnapshot)
  const table = heldLane()
  const tableLanes: TableLanes = { steady: table.lane, rough: table.lane }
  return (
    <RoutedShell
      initialRoute={PAGES.probability}
      save={props.save}
      snapshot={{ ...snap, answer: props.answer }}
      model={appModel}
      lanes={tableLanes}
      whatIfLanes={props.left}
      compareLanes={props.right}
      readOnly={props.readOnly ?? false}
      wallCalendarYear={snap.draft.startCalendarYear}
      {...(props.onWriteKept !== undefined ? { onWriteKept: props.onWriteKept } : {})}
      {...(props.onWhatIfHeld !== undefined ? { onWhatIfHeld: props.onWhatIfHeld } : {})}
    />
  )
}

function mount(opts: { readonly kept?: readonly KeptWhatIfV6[]; readonly save?: ResultSaveProp; readonly readOnly?: boolean; readonly onWriteKept?: (edit: KeptEdit, keep?: string) => Promise<KeptWriteOutcome>; readonly onWhatIfHeld?: (held: boolean) => void } = {}) {
  const draft: ScenarioDraft = { ...DEV_SEEDS.retired, seed: SEED, keptWhatIfs: opts.kept ?? KEPT }
  act(() => appModel.update(() => draft))
  const left = slotLanes()
  const right = slotLanes()
  render(
    <Room
      answer={spine(draft)}
      left={left.lanes}
      right={right.lanes}
      save={opts.save ?? { kind: 'clean' }}
      {...(opts.readOnly !== undefined ? { readOnly: opts.readOnly } : {})}
      {...(opts.onWriteKept !== undefined ? { onWriteKept: opts.onWriteKept } : {})}
      {...(opts.onWhatIfHeld !== undefined ? { onWhatIfHeld: opts.onWhatIfHeld } : {})}
    />,
  )
  return { left, right }
}

const leftCount = () => document.querySelector('[data-half="alternative"] [data-ring-centre]')?.textContent ?? null
const rightCount = () => document.querySelector('[data-half="compared"] [data-ring-centre]')?.textContent ?? null
const leftTitle = () => document.querySelector('[data-half="alternative"]')?.getAttribute('aria-label') ?? null

async function pick(user: ReturnType<typeof userEvent.setup>, label: string, option: string) {
  await user.click(screen.getByRole('combobox', { name: label }))
  await user.click(await screen.findByRole('option', { name: option }))
}

async function openList() {
  fireEvent.click(screen.getByRole('button', { name: copy.planListOpenLabel }))
  return screen.findByRole('dialog', { name: copy.planListTitle })
}

describe('the two-up: any two, one per picker, each side on its own slot', () => {
  it('two kept what-ifs compared left against right, neither being your plan, each with its own reading and both named in the difference line', async () => {
    const user = userEvent.setup()
    const { left, right } = mount()
    await pick(user, copy.probabilityComparedLabel, 'Spend less')
    expect(right.many.request, 'the right side asks its own run').toHaveBeenCalledTimes(1)
    expect(left.many.request, 'and the left side none').not.toHaveBeenCalled()
    await pick(user, copy.probabilityPickerLabel, 'Spend a lot less')
    expect(left.many.request, 'the left side asks its own run').toHaveBeenCalledTimes(1)
    expect(right.many.request.mock.calls[0]![0].params.annualSpendingReal).toBe(60_000)
    expect(left.many.request.mock.calls[0]![0].params.annualSpendingReal).toBe(50_000)
    await right.settle()
    await left.settle()
    await waitFor(() => expect(rightCount()).toBe(verdictReadingText('borderline', 6)))
    expect(leftCount()).toBe(verdictReadingText('borderline', 5))
    expect(leftTitle()).toBe('Spend a lot less')
    expect(document.querySelector('[data-difference]')!.textContent).toContain(
      slots.probabilityDifferenceBetween('Spend less', verdictReadingText('borderline', 6), 'Spend a lot less', verdictReadingText('borderline', 5)),
    )
    // Neither picker offers what the other side shows.
    await user.click(screen.getByRole('combobox', { name: copy.probabilityComparedLabel }))
    expect(screen.queryByRole('option', { name: 'Spend a lot less' }), 'the right picker leaves out the left side’s kept what-if').toBeNull()
  })

  it('a kept what-if whose account is gone says so and runs nothing (insight 102)', async () => {
    const user = userEvent.setup()
    const gone: KeptWhatIfV6 = { id: 'kept-gone', name: 'Save more', levers: [{ kind: 'deposits', accountId: 'no-such-account', annualContribution: 9_000 }] }
    const { right } = mount({ kept: [gone] })
    await pick(user, copy.probabilityComparedLabel, 'Save more')
    expect(right.many.request, 'nothing is run').not.toHaveBeenCalled()
    expect(document.querySelector('[data-half="compared"] [data-half-status]')!.textContent).toBe(copy.workbenchRailRefusedAccountGone)
    expect(rightCount(), 'no count on the refused side').toBeNull()
  })
})

describe('the plan list drawer', () => {
  it('a read-only tab lists and opens kept what-ifs, and offers no keep, copy, rename, delete or move', async () => {
    const { left } = mount({ readOnly: true, save: { kind: 'none' } })
    const drawer = await openList()
    expect(within(drawer).getByText('Spend less')).toBeInTheDocument()
    for (const word of [copy.planListCopy, copy.planListRename, copy.planListDelete, copy.planListKeep]) {
      expect(within(drawer).queryByRole('button', { name: new RegExp(`^${word}`) }), word).toBeNull()
    }
    expect(drawer.querySelector('[data-kept-handle]'), 'no drag handle').toBeNull()
    fireEvent.click(within(drawer).getByRole('button', { name: slots.planListOpenRow('Spend less') }))
    await waitFor(() => expect(leftTitle()).toBe('Spend less'))
    expect(left.many.request).toHaveBeenCalledTimes(1)
  })

  it('Keep with unsaved changes is not offered and says why; the one write is never called', async () => {
    const write = vi.fn<(edit: KeptEdit, keep?: string) => Promise<KeptWriteOutcome>>()
    mount({ save: { kind: 'dirty', onSave: () => {} }, onWriteKept: write })
    const drawer = await openList()
    expect(within(drawer).getByText(copy.planListWritesDirty)).toBeInTheDocument()
    expect(within(drawer).queryByRole('button', { name: copy.planListKeep })).toBeNull()
    expect(within(drawer).queryByRole('button', { name: new RegExp(`^${copy.planListRename}`) })).toBeNull()
    expect(write).not.toHaveBeenCalled()
  })

  it('a writable row carries Copy, Rename, Delete and its handle; Delete asks first; the arrow key moves it through the one write', async () => {
    const write = vi.fn(async (): Promise<KeptWriteOutcome> => ({ kind: 'saved' }))
    mount({ onWriteKept: write })
    const drawer = await openList()
    const row = drawer.querySelector('[data-kept-row="kept-a"]') as HTMLElement
    expect(within(row).getByRole('button', { name: copy.planListCopy })).toBeInTheDocument()
    expect(within(row).getByRole('button', { name: copy.planListRename })).toBeInTheDocument()
    fireEvent.click(within(row).getByRole('button', { name: copy.planListDelete }))
    expect(within(drawer).getByText(slots.planListDeleteAsk('Spend less'))).toBeInTheDocument()
    expect(document.activeElement, 'the safe choice is focused').toBe(within(drawer).getByRole('button', { name: copy.planListDeleteStay }))
    fireEvent.click(within(drawer).getByRole('button', { name: copy.planListDeleteStay }))
    expect(write, 'Stay writes nothing').not.toHaveBeenCalled()
    fireEvent.keyDown(within(drawer).getByRole('button', { name: slots.planListMove('Spend less') }), { key: 'ArrowDown' })
    await waitFor(() => expect(write).toHaveBeenCalledTimes(1))
    const edit = (write.mock.calls[0] as unknown as [KeptEdit])[0]
    expect(edit(KEPT, new Set())!.map((k) => k.id), 'the moved order').toEqual(['kept-b', 'kept-a'])
  })
})

describe('Keep, a changed kept what-if, and the ask before another drops it', () => {
  it('a reopened kept what-if, edited and refreshed, reads "changed, not kept" and holds; opening another asks first, and Stay keeps it', async () => {
    const user = userEvent.setup()
    const held = vi.fn<(held: boolean) => void>()
    const { left } = mount({ onWhatIfHeld: held })
    await pick(user, copy.probabilityPickerLabel, 'Spend less')
    await left.settle()
    expect(held).toHaveBeenLastCalledWith(false)
    fireEvent.click(screen.getByRole('button', { name: copy.trayHandle }))
    const tray = document.getElementById('b9-action-items') as HTMLElement
    const field = within(tray)
      .getAllByLabelText(copy.workbenchRailSpendTotalLabel)
      .find((el) => el instanceof HTMLInputElement && el.type === 'text')!
    act(() => field.focus())
    fireEvent.change(field, { target: { value: '40,000' } })
    act(() => field.blur())
    fireEvent.click(within(tray).getByRole('button', { name: copy.trayRefresh }))
    await waitFor(() => expect(leftTitle()).toBe(slots.probabilityKeptChanged('Spend less')))
    expect(held).toHaveBeenLastCalledWith(true)
    await pick(user, copy.probabilityPickerLabel, copy.probabilityPickNew)
    expect(screen.getByText(copy.probabilityOpenDropsAsk)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: copy.workbenchLeaveStay }))
    expect(leftTitle(), 'Stay keeps the changed what-if').toBe(slots.probabilityKeptChanged('Spend less'))
  })

  it('Keep names the committed bundle through the one write; the half takes the new name and no longer holds', async () => {
    const write = vi.fn(async (edit: KeptEdit, keep?: string): Promise<KeptWriteOutcome> => {
      const next = edit(appModel.getSnapshot().draft.keptWhatIfs ?? [], new Set())
      expect(keep, 'a Keep names the id to reopen').toBeDefined()
      act(() => appModel.update((d) => ({ ...d, keptWhatIfs: next! })))
      return { kind: 'saved' }
    })
    const held = vi.fn<(held: boolean) => void>()
    const { left } = mount({ kept: [], onWriteKept: write, onWhatIfHeld: held })
    fireEvent.click(screen.getByRole('button', { name: copy.trayHandle }))
    const tray = document.getElementById('b9-action-items') as HTMLElement
    const field = within(tray)
      .getAllByLabelText(copy.workbenchRailSpendTotalLabel)
      .find((el) => el instanceof HTMLInputElement && el.type === 'text')!
    act(() => field.focus())
    fireEvent.change(field, { target: { value: '30,000' } })
    act(() => field.blur())
    fireEvent.click(within(tray).getByRole('button', { name: copy.trayRefresh }))
    await left.settle()
    const drawer = await openList()
    fireEvent.click(within(drawer).getByRole('button', { name: copy.planListKeep }))
    const box = within(drawer).getByLabelText(copy.planListNameLabel)
    fireEvent.change(box, { target: { value: 'Lean years' } })
    fireEvent.click(within(drawer).getByRole('button', { name: copy.planListNameConfirm }))
    await waitFor(() => expect(write).toHaveBeenCalledTimes(1))
    const kept = appModel.getSnapshot().draft.keptWhatIfs ?? []
    expect(kept.map((k) => k.name)).toEqual(['Lean years'])
    expect(kept[0]!.levers).toEqual([{ kind: 'spending', op: 'total', annualSpendingReal: 30_000 }])
    await waitFor(() => expect(leftTitle()).toBe('Lean years'))
    expect(held).toHaveBeenLastCalledWith(false)
  })

  it('an empty name and a taken name are refused in words under the box; nothing is written', async () => {
    const write = vi.fn(async (): Promise<KeptWriteOutcome> => ({ kind: 'saved' }))
    const { left } = mount({ onWriteKept: write })
    fireEvent.click(screen.getByRole('button', { name: copy.trayHandle }))
    const tray = document.getElementById('b9-action-items') as HTMLElement
    const field = within(tray)
      .getAllByLabelText(copy.workbenchRailSpendTotalLabel)
      .find((el) => el instanceof HTMLInputElement && el.type === 'text')!
    act(() => field.focus())
    fireEvent.change(field, { target: { value: '30,000' } })
    act(() => field.blur())
    fireEvent.click(within(tray).getByRole('button', { name: copy.trayRefresh }))
    await left.settle()
    const drawer = await openList()
    fireEvent.click(within(drawer).getByRole('button', { name: copy.planListKeep }))
    fireEvent.click(within(drawer).getByRole('button', { name: copy.planListNameConfirm }))
    expect(within(drawer).getByRole('alert')).toHaveTextContent(copy.planListNameEmpty)
    fireEvent.change(within(drawer).getByLabelText(copy.planListNameLabel), { target: { value: ' spend LESS ' } })
    fireEvent.click(within(drawer).getByRole('button', { name: copy.planListNameConfirm }))
    expect(within(drawer).getByRole('alert')).toHaveTextContent(copy.planListNameTaken)
    expect(write).not.toHaveBeenCalled()
  })
})

describe('insight 159: a reopened kept what-if, edited and put back while its run is in flight, settles on what is shown', () => {
  it('the put-back bundle is asked again (never skipped as "the same"), and the edited run landing late never shows', async () => {
    const user = userEvent.setup()
    const { left } = mount()
    await pick(user, copy.probabilityPickerLabel, 'Spend less')
    await left.settle()
    expect(leftCount()).toBe(verdictReadingText('borderline', 6))
    fireEvent.click(screen.getByRole('button', { name: copy.trayHandle }))
    const tray = document.getElementById('b9-action-items') as HTMLElement
    const box = () =>
      within(tray)
        .getAllByLabelText(copy.workbenchRailSpendTotalLabel)
        .find((el) => el instanceof HTMLInputElement && el.type === 'text')!
    const typeIn = (text: string) => {
      const field = box()
      act(() => field.focus())
      fireEvent.change(field, { target: { value: text } })
      act(() => field.blur())
    }
    // Edited (40,000) and refreshed: its run is in flight.
    typeIn('40,000')
    fireEvent.click(within(tray).getByRole('button', { name: copy.trayRefresh }))
    expect(left.many.request).toHaveBeenCalledTimes(2)
    // Put back to the kept figure and refreshed while that run is still in flight: asked again.
    typeIn('60,000')
    fireEvent.click(within(tray).getByRole('button', { name: copy.trayRefresh }))
    expect(left.many.request, 'the put-back bundle is asked again').toHaveBeenCalledTimes(3)
    expect(left.many.request.mock.calls[2]![0].params.annualSpendingReal).toBe(60_000)
    await left.settle()
    await waitFor(() => expect(leftCount()).toBe(verdictReadingText('borderline', 6)))
    expect(leftTitle(), 'back at its kept bundle: kept, not changed').toBe('Spend less')
  })
})
