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
import { holdUnsavedBuffer } from '@intake/unsavedBuffer'
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

function mount(opts: { readonly kept?: readonly KeptWhatIfV6[]; readonly save?: ResultSaveProp; readonly readOnly?: boolean; readonly onWriteKept?: (edit: KeptEdit, keep?: string) => Promise<KeptWriteOutcome>; readonly onWhatIfHeld?: (held: boolean) => void; readonly base?: ScenarioDraft } = {}) {
  const draft: ScenarioDraft = { ...(opts.base ?? DEV_SEEDS.retired), seed: SEED, keptWhatIfs: opts.kept ?? KEPT }
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

  it('a drag down follows the pointer past the handle (a moved row loses its capture) and writes the order shown, once, on release', async () => {
    const write = vi.fn(async (): Promise<KeptWriteOutcome> => ({ kind: 'saved' }))
    mount({ onWriteKept: write })
    const drawer = await openList()
    const handle = within(drawer).getByRole('button', { name: slots.planListMove('Spend less') })
    fireEvent.pointerDown(handle, { button: 0, pointerId: 7, clientY: 100 })
    // The moves and the release reach the window, never the handle (a row re-inserted below has lost its capture).
    fireEvent.pointerMove(window, { pointerId: 7, clientY: 160 })
    expect([...drawer.querySelectorAll('[data-kept-row]')].map((r) => r.getAttribute('data-kept-row')), 'the row moves as the pointer passes').toEqual(['kept-b', 'kept-a'])
    expect(write, 'nothing written mid-drag').not.toHaveBeenCalled()
    fireEvent.pointerUp(document.body, { pointerId: 7, clientY: 160 })
    await waitFor(() => expect(write).toHaveBeenCalledTimes(1))
    const edit = (write.mock.calls[0] as unknown as [KeptEdit])[0]
    expect(edit(KEPT, new Set())!.map((k) => k.id)).toEqual(['kept-b', 'kept-a'])
    // Done: a later move writes nothing more.
    fireEvent.pointerMove(window, { pointerId: 7, clientY: 100 })
    fireEvent.pointerUp(window, { pointerId: 7 })
    expect(write).toHaveBeenCalledTimes(1)
  })

  it('a drawer shut mid-drag (Escape) writes no order on the release that follows', async () => {
    const write = vi.fn(async (): Promise<KeptWriteOutcome> => ({ kind: 'saved' }))
    mount({ onWriteKept: write })
    const drawer = await openList()
    const handle = within(drawer).getByRole('button', { name: slots.planListMove('Spend less') })
    fireEvent.pointerDown(handle, { button: 0, pointerId: 7, clientY: 100 })
    fireEvent.pointerMove(window, { pointerId: 7, clientY: 160 })
    fireEvent.keyDown(handle, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog', { name: copy.planListTitle })).toBeNull())
    fireEvent.pointerUp(window, { pointerId: 7, clientY: 160 })
    await act(async () => {})
    expect(write, 'the shut drawer wrote nothing').not.toHaveBeenCalled()
  })

  it('a rename landing closes only its own box: another row’s box opened while it was in flight stays', async () => {
    let land: () => void = () => {}
    const write = vi.fn(async (edit: KeptEdit): Promise<KeptWriteOutcome> => {
      const next = edit(appModel.getSnapshot().draft.keptWhatIfs ?? [], new Set())
      act(() => appModel.update((d) => ({ ...d, keptWhatIfs: next! })))
      await new Promise<void>((r) => (land = r))
      return { kind: 'saved' }
    })
    mount({ onWriteKept: write })
    const drawer = await openList()
    const rowA = () => drawer.querySelector('[data-kept-row="kept-a"]') as HTMLElement
    const rowB = () => drawer.querySelector('[data-kept-row="kept-b"]') as HTMLElement
    fireEvent.click(within(rowA()).getByRole('button', { name: copy.planListRename }))
    fireEvent.change(within(rowA()).getByRole('textbox'), { target: { value: 'Lean years' } })
    fireEvent.click(within(rowA()).getByRole('button', { name: copy.planListRenameConfirm }))
    await waitFor(() => expect(write).toHaveBeenCalledTimes(1))
    fireEvent.click(within(rowB()).getByRole('button', { name: copy.planListRename }))
    expect(within(rowB()).getByRole('textbox')).toHaveValue('Spend a lot less')
    await act(async () => land())
    expect(within(rowB()).getByRole('textbox'), 'the box opened meanwhile stays').toHaveValue('Spend a lot less')
  })

  it('a Keep box over a kept what-if deleted meanwhile goes with it; the next Keep is a new one', async () => {
    const user = userEvent.setup()
    const write = vi.fn(async (edit: KeptEdit): Promise<KeptWriteOutcome> => {
      const next = edit(appModel.getSnapshot().draft.keptWhatIfs ?? [], new Set((appModel.getSnapshot().draft.keptWhatIfs ?? []).map((k) => k.id)))
      act(() => appModel.update((d) => ({ ...d, keptWhatIfs: next! })))
      return { kind: 'saved' }
    })
    const { left } = mount({ onWriteKept: write })
    await pick(user, copy.probabilityPickerLabel, 'Spend less')
    await left.settle()
    fireEvent.click(screen.getByRole('button', { name: copy.trayHandle }))
    const tray = document.getElementById('b9-action-items') as HTMLElement
    const field = within(tray)
      .getAllByLabelText(copy.workbenchRailSpendTotalLabel)
      .find((el) => el instanceof HTMLInputElement && el.type === 'text')!
    act(() => field.focus())
    fireEvent.change(field, { target: { value: '40,000' } })
    act(() => field.blur())
    fireEvent.click(within(tray).getByRole('button', { name: copy.trayRefresh }))
    await left.settle()
    const drawer = await openList()
    fireEvent.click(within(drawer).getByRole('button', { name: copy.planListKeep }))
    fireEvent.change(within(drawer).getByLabelText(copy.planListNameLabel), { target: { value: 'Leaner' } })
    const row = drawer.querySelector('[data-kept-row="kept-a"]') as HTMLElement
    fireEvent.click(within(row).getByRole('button', { name: copy.planListDelete }))
    fireEvent.click(within(drawer).getByRole('button', { name: copy.planListDeleteGo }))
    await waitFor(() => expect(write).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(within(drawer).queryByLabelText(copy.planListNameLabel), 'the box went with the kept what-if it would replace').toBeNull())
    expect(within(drawer).getByRole('button', { name: copy.planListKeep }), 'Keep is offered again, as a new one').toBeInTheDocument()
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

  it('with no saved plan yet, a Keep over an entry not yet added asks before the save steps drop it: Stay writes nothing, Go on keeps', async () => {
    const write = vi.fn(async (): Promise<KeptWriteOutcome> => ({ kind: 'ceremony' }))
    const { left } = mount({ kept: [], save: { kind: 'first', onKeep: () => {} }, onWriteKept: write })
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
    // An entry open somewhere and not yet added (a sheet's typed form, a budget's staged rows): the guard's hold.
    const release = holdUnsavedBuffer()
    try {
      const drawer = await openList()
      fireEvent.click(within(drawer).getByRole('button', { name: copy.planListKeep }))
      fireEvent.change(within(drawer).getByLabelText(copy.planListNameLabel), { target: { value: 'Lean years' } })
      fireEvent.click(within(drawer).getByRole('button', { name: copy.planListNameConfirm }))
      const ask = await screen.findByRole('alertdialog')
      expect(ask).toHaveTextContent(copy.shellCeremonyOpenEntry)
      expect(ask, 'the what-if is being kept: never the "isn’t kept" words').not.toHaveTextContent(copy.shellCeremonyWhatIf)
      expect(write).not.toHaveBeenCalled()
      fireEvent.click(within(ask).getByRole('button', { name: copy.workbenchLeaveStay }))
      expect(screen.queryByRole('alertdialog')).toBeNull()
      expect(write).not.toHaveBeenCalled()
      fireEvent.click(within(drawer).getByRole('button', { name: copy.planListNameConfirm }))
      fireEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: copy.shellCeremonyGo }))
      await waitFor(() => expect(write).toHaveBeenCalledTimes(1))
    } finally {
      release()
    }
  })

  it('with no saved plan yet, a Keep over a deposit change still waiting for the employer’s figure asks first, naming it', async () => {
    const write = vi.fn(async (): Promise<KeptWriteOutcome> => ({ kind: 'ceremony' }))
    const { left } = mount({ base: { ...DEV_SEEDS.dip, budget: undefined }, kept: [], save: { kind: 'first', onKeep: () => {} }, onWriteKept: write })
    fireEvent.click(screen.getByRole('button', { name: copy.trayHandle }))
    const tray = document.getElementById('b9-action-items') as HTMLElement
    const type = (field: HTMLElement, text: string) => {
      act(() => field.focus())
      fireEvent.change(field, { target: { value: text } })
      act(() => field.blur())
    }
    // A spending change is run; then a lowered deposit waits for the employer's figure (it is in no bundle, and while it
    // waits Refresh and Apply stop on it, so it is lowered after the run lands).
    type(within(tray).getAllByLabelText(copy.workbenchRailSpendTotalLabel).find((el) => el instanceof HTMLInputElement && el.type === 'text')!, '30,000')
    fireEvent.click(within(tray).getByRole('button', { name: copy.trayRefresh }))
    await left.settle()
    type(within(tray).getByLabelText(/^Into .*401\(k\), dollars a year$/), '6,000')
    expect(within(tray).getByText(copy.workbenchRailEmployerWaiting)).toBeInTheDocument()
    const drawer = await openList()
    fireEvent.click(within(drawer).getByRole('button', { name: copy.planListKeep }))
    fireEvent.change(within(drawer).getByLabelText(copy.planListNameLabel), { target: { value: 'Lean years' } })
    fireEvent.click(within(drawer).getByRole('button', { name: copy.planListNameConfirm }))
    const ask = await screen.findByRole('alertdialog')
    expect(ask).toHaveTextContent(copy.shellKeepDropsWaiting)
    expect(ask).not.toHaveTextContent(copy.shellCeremonyOpenEntry)
    expect(write).not.toHaveBeenCalled()
  })

  it('a Keep box left open over a changed kept what-if never keeps another one over it: opening another drops the box, and the next Keep is a new one', async () => {
    const user = userEvent.setup()
    const write = vi.fn(async (edit: KeptEdit): Promise<KeptWriteOutcome> => {
      const next = edit(appModel.getSnapshot().draft.keptWhatIfs ?? [], new Set((appModel.getSnapshot().draft.keptWhatIfs ?? []).map((k) => k.id)))
      act(() => appModel.update((d) => ({ ...d, keptWhatIfs: next! })))
      return { kind: 'saved' }
    })
    const { left } = mount({ onWriteKept: write })
    const typeSpend = (text: string) => {
      const tray = document.getElementById('b9-action-items') as HTMLElement
      const field = within(tray)
        .getAllByLabelText(copy.workbenchRailSpendTotalLabel)
        .find((el) => el instanceof HTMLInputElement && el.type === 'text')!
      act(() => field.focus())
      fireEvent.change(field, { target: { value: text } })
      act(() => field.blur())
      fireEvent.click(within(tray).getByRole('button', { name: copy.trayRefresh }))
    }
    // "Spend less" reopened, changed and refreshed; Keep opens its box (offering to replace it), and Done leaves the box.
    await pick(user, copy.probabilityPickerLabel, 'Spend less')
    await left.settle()
    fireEvent.click(screen.getByRole('button', { name: copy.trayHandle }))
    typeSpend('40,000')
    await left.settle()
    let drawer = await openList()
    fireEvent.click(within(drawer).getByRole('button', { name: copy.planListKeep }))
    expect(within(drawer).getByLabelText(copy.planListNameLabel)).toHaveValue('Spend less')
    fireEvent.click(within(drawer).getByRole('button', { name: copy.planListDone }))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: copy.planListTitle })).toBeNull())
    // A new what-if on the left (the changed one asks first), edited and refreshed.
    await pick(user, copy.probabilityPickerLabel, copy.probabilityPickNew)
    fireEvent.click(screen.getByRole('button', { name: copy.probabilityOpenGo }))
    typeSpend('30,000')
    await left.settle()
    drawer = await openList()
    expect(within(drawer).queryByLabelText(copy.planListNameLabel), 'the old box went with the what-if it named').toBeNull()
    fireEvent.click(within(drawer).getByRole('button', { name: copy.planListKeep }))
    fireEvent.change(within(drawer).getByLabelText(copy.planListNameLabel), { target: { value: 'Lean years' } })
    fireEvent.click(within(drawer).getByRole('button', { name: copy.planListNameConfirm }))
    await waitFor(() => expect(write).toHaveBeenCalledTimes(1))
    const kept = appModel.getSnapshot().draft.keptWhatIfs ?? []
    expect(kept[0], '"Spend less" is untouched').toEqual(KEPT[0])
    expect(kept.map((k) => k.name)).toEqual(['Spend less', 'Spend a lot less', 'Lean years'])
    expect(kept[2]!.levers).toEqual([{ kind: 'spending', op: 'total', annualSpendingReal: 30_000 }])
  })

  it('a Keep box typed over a new what-if goes with it when Apply writes it to the plan: the next new what-if never comes back under that name', async () => {
    const write = vi.fn(async (): Promise<KeptWriteOutcome> => ({ kind: 'saved' }))
    const { left } = mount({ kept: [], onWriteKept: write })
    fireEvent.click(screen.getByRole('button', { name: copy.trayHandle }))
    const typeSpend = (text: string) => {
      const tray = document.getElementById('b9-action-items') as HTMLElement
      const field = within(tray)
        .getAllByLabelText(copy.workbenchRailSpendTotalLabel)
        .find((el) => el instanceof HTMLInputElement && el.type === 'text')!
      act(() => field.focus())
      fireEvent.change(field, { target: { value: text } })
      act(() => field.blur())
      fireEvent.click(within(tray).getByRole('button', { name: copy.trayRefresh }))
    }
    typeSpend('30,000')
    await left.settle()
    let drawer = await openList()
    fireEvent.click(within(drawer).getByRole('button', { name: copy.planListKeep }))
    fireEvent.change(within(drawer).getByLabelText(copy.planListNameLabel), { target: { value: 'Lean years' } })
    fireEvent.click(within(drawer).getByRole('button', { name: copy.planListDone }))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: copy.planListTitle })).toBeNull())
    // Apply writes the what-if to the plan; the left side starts a new one (its source still reads 'new').
    const tray = document.getElementById('b9-action-items') as HTMLElement
    fireEvent.click(within(tray).getByRole('button', { name: copy.workbenchRailApply }))
    await waitFor(() => expect(appModel.getSnapshot().draft.annualSpendingReal).toBe(30_000))
    typeSpend('20,000')
    await left.settle()
    drawer = await openList()
    expect(within(drawer).queryByLabelText(copy.planListNameLabel), 'the box went with the what-if it named').toBeNull()
    expect(write).not.toHaveBeenCalled()
  })

  it('a successful Keep never flashes "name taken" while its write lands (the list holds the new name at once)', async () => {
    let land: () => void = () => {}
    const write = vi.fn(async (edit: KeptEdit): Promise<KeptWriteOutcome> => {
      const next = edit(appModel.getSnapshot().draft.keptWhatIfs ?? [], new Set())
      act(() => appModel.update((d) => ({ ...d, keptWhatIfs: next! })))
      await new Promise<void>((r) => (land = r))
      return { kind: 'saved' }
    })
    const { left } = mount({ kept: [], onWriteKept: write })
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
    fireEvent.change(within(drawer).getByLabelText(copy.planListNameLabel), { target: { value: 'Lean years' } })
    fireEvent.click(within(drawer).getByRole('button', { name: copy.planListNameConfirm }))
    await waitFor(() => expect(write).toHaveBeenCalledTimes(1))
    expect(appModel.getSnapshot().draft.keptWhatIfs?.map((k) => k.name), 'the write is in flight, the name already listed').toEqual(['Lean years'])
    expect(within(drawer).queryByRole('alert'), 'no refusal on the success path').toBeNull()
    await act(async () => land())
    await waitFor(() => expect(within(drawer).getByText(slots.planListKept('Lean years'))).toBeInTheDocument())
    expect(within(drawer).queryByRole('alert')).toBeNull()
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

describe('a kept what-if refused for its line’s repeat or start, then a new amount typed in the tray (gap 4’s leftover (b))', () => {
  // `budget`'s retired household with a car bought now and every 4 years in its plan; the kept what-if was kept when the
  // car came every 5 years (or started 2 years on), so it is refused by name. The row's label speaks the plan's repeat,
  // so a figure typed there is a figure for that repeat: the replace takes the plan line's repeat and, for a line that
  // repeats, its start, and Refresh runs it. Loaded from the plan list, never edited in place (the unit suite's landmine:
  // the tray reads the answered draft).
  const car = { id: 'line-car', category: 'transportation', label: 'A new car', annualAmountReal: 30_000, tier: 'essentials', startYear: 0, everyYears: 4 } as const
  const base: ScenarioDraft = {
    ...DEV_SEEDS.budget,
    budget: [...DEV_SEEDS.budget.budget!, car],
    annualSpendingReal: DEV_SEEDS.budget.annualSpendingReal! + car.annualAmountReal,
  }
  const cases = [
    { what: 'repeat', stored: { ...car, everyYears: 5, annualAmountReal: 25_000 }, refusal: copy.workbenchRailRefusedLineRepeat },
    { what: 'start', stored: { ...car, startYear: 2, annualAmountReal: 25_000 }, refusal: copy.workbenchRailRefusedLineStart },
  ] as const

  for (const c of cases) {
    it(`refused for its ${c.what}: an amount typed in the row clears the refusal, and Refresh runs the plan line’s repeat and start`, async () => {
      const user = userEvent.setup()
      const kept: KeptWhatIfV6 = { id: 'kept-car', name: 'A cheaper car', levers: [{ kind: 'spending', op: 'replace', line: c.stored }] }
      const { left } = mount({ kept: [kept], base })
      await pick(user, copy.probabilityPickerLabel, 'A cheaper car')
      expect(left.many.request, 'refused: nothing runs').not.toHaveBeenCalled()
      expect(document.querySelector('[data-half="alternative"] [data-half-status]')!.textContent).toBe(c.refusal)
      fireEvent.click(screen.getByRole('button', { name: copy.trayHandle }))
      const tray = document.getElementById('b9-action-items') as HTMLElement
      const field = within(tray)
        .getAllByLabelText(slots.workbenchRailLineAmountEvery('A new car', 4))
        .find((el) => el instanceof HTMLInputElement && el.type === 'text')!
      act(() => field.focus())
      fireEvent.change(field, { target: { value: '28,000' } })
      act(() => field.blur())
      fireEvent.click(within(tray).getByRole('button', { name: copy.trayRefresh }))
      await waitFor(() => expect(left.many.request).toHaveBeenCalledTimes(1))
      const run = left.many.request.mock.calls[0]![0]
      // The run's budget carries the car at the typed figure on the plan's repeat and start: $28,000 in years 0, 4, 8.
      const b = run.params.budget!
      const level = (k: number) => (b.sticky[k] ?? 0) + (b.scalableEssentials[k] ?? 0) + (b.discretionary[k] ?? 0)
      expect([0, 2, 4, 5, 8].map((k) => Math.round(level(k) - level(1)))).toEqual([28_000, 0, 28_000, 0, 28_000])
    })
  }
})
