// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'

/**
 * The workbench room and its door, through IntakeApp's REAL phase machine and the browser's REAL
 * history (Act 5, U6; workbench plan KTD31). Result is stubbed to a props echo (the save slot's kind,
 * the door), SaveFlow to its two callbacks; the room itself is the real lazy module. The store's answer
 * resolves only through the worker, so it is planted by wrapping `getSnapshot` (the draft stays real).
 */

const h = vi.hoisted(() => ({ model: null as unknown }))
vi.mock('../vaultSession', () => ({
  getVaultSession: async () => ({ currentModel: () => h.model, hasBackupRecord: async () => true }),
}))
vi.mock('../Result', () => ({
  Result: ({
    save,
    workbench,
  }: {
    save: { kind: string; onKeep?: () => void }
    workbench?: { onOpen: () => void; ask?: { onGo: () => void; onStay: () => void } }
  }) => (
    <div data-save-kind={save.kind}>
      result stub
      {workbench && (
        <button type="button" onClick={workbench.onOpen}>
          workbench-door-stub
        </button>
      )}
      {workbench?.ask && (
        <>
          <button type="button" onClick={workbench.ask.onStay}>
            door-ask-stay-stub
          </button>
          <button type="button" onClick={workbench.ask.onGo}>
            door-ask-go-stub
          </button>
        </>
      )}
    </div>
  ),
}))
vi.mock('../SaveFlow', () => ({
  SaveFlow: ({ onCommitted, onComplete }: { onCommitted: () => void; onComplete: () => void }) => (
    <div>
      save stub
      <button
        type="button"
        onClick={() => {
          onCommitted()
          onComplete()
        }}
      >
        save-done-stub
      </button>
    </div>
  ),
}))

import IntakeApp from '../IntakeApp'
import { appModel } from '../appModel'
import { scenarioFromDraft } from '../scenarioFromDraft'
import { DEV_SEEDS } from '../devSeeds'
import { copy } from '../copy'
import { holdUnsavedBuffer } from '@intake/unsavedBuffer'
import type { MemoryModelSnapshot, ModelAnswer } from '@store/memoryModel'

const ready = scenarioFromDraft(DEV_SEEDS.retired)
if (!ready.ready) throw new Error('workbenchRoom.test: the retired dev seed must build a persistable scenario')
h.model = ready.scenario

vi.spyOn(appModel, 'recompute').mockResolvedValue(true)

// The planted answer: a resolved one by default (a compute error is resolved — not the crunch).
const RESOLVED: ModelAnswer = { kind: 'compute-error', reason: 'planted' }
const plant: { answer: ModelAnswer } = { answer: RESOLVED }
const realGetSnapshot = appModel.getSnapshot.bind(appModel)
let cached: { base: MemoryModelSnapshot; answer: ModelAnswer; snap: MemoryModelSnapshot } | null = null
vi.spyOn(appModel, 'getSnapshot').mockImplementation((): MemoryModelSnapshot => {
  const base = realGetSnapshot()
  if (cached === null || cached.base !== base || cached.answer !== plant.answer) {
    cached = { base, answer: plant.answer, snap: { ...base, answer: plant.answer } }
  }
  return cached.snap
})

const roomHeading = () => screen.queryByRole('heading', { name: copy.workbenchHeading })

/** A saved household, past the re-entry gate, on its answer. */
async function landHydrated(readOnly = false) {
  render(<IntakeApp hydrateFromVault readOnly={readOnly} />)
  const name = readOnly ? copy.reentryContinueCta : copy.reentryAffirmCta
  fireEvent.click(await screen.findByRole('button', { name }))
  return screen.findByText('result stub')
}

async function enterRoom() {
  fireEvent.click(screen.getByRole('button', { name: 'workbench-door-stub' }))
  await screen.findByRole('heading', { name: copy.workbenchHeading })
}

/** A real history Back — sent by `go` — through jsdom's real traversal, settled on the popstate it fires
 *  (jsdom delivers it a few tasks later). */
async function backAndSettle(go: () => void = () => window.history.back()) {
  await act(async () => {
    const popped = new Promise((r) => window.addEventListener('popstate', r, { once: true }))
    go()
    await popped
  })
}
const pressBack = () => backAndSettle()
/** A real Forward; `undone` waits for the second popstate the app's own `history.back()` fires when it undoes it. */
async function pressForward(undone = false) {
  await act(async () => {
    const pops = new Promise<void>((resolve) => {
      let left = undone ? 2 : 1
      const on = () => {
        left -= 1
        if (left === 0) {
          window.removeEventListener('popstate', on)
          resolve()
        }
      }
      window.addEventListener('popstate', on)
    })
    window.history.forward()
    await pops
  })
}

beforeEach(() => {
  plant.answer = RESOLVED
  window.history.replaceState(null, '')
})
afterEach(cleanup)

describe('the workbench door', () => {
  it('is absent while the answer is unresolved, and offered once it resolves', async () => {
    plant.answer = { kind: 'pending' }
    await landHydrated()
    expect(screen.queryByRole('button', { name: 'workbench-door-stub' })).toBeNull()
    cleanup()
    plant.answer = RESOLVED
    await landHydrated()
    expect(screen.getByRole('button', { name: 'workbench-door-stub' })).toBeInTheDocument()
  })

  it('is absent while the answer can’t be saved (the save control’s other half of the rule)', async () => {
    await landHydrated()
    expect(screen.getByRole('button', { name: 'workbench-door-stub' })).toBeInTheDocument()
    act(() => appModel.update((d) => ({ ...d, people: [{ ...d.people[0], birthYear: undefined }, d.people[1]] })))
    expect(screen.getByText('result stub')).toHaveAttribute('data-save-kind', 'none')
    expect(screen.queryByRole('button', { name: 'workbench-door-stub' })).toBeNull()
  })

  it('pressed over an entry still open on the answer, asks there first: Stay keeps the answer, Open drops it', async () => {
    await landHydrated()
    const before = window.history.length
    const release = holdUnsavedBuffer()
    try {
      fireEvent.click(screen.getByRole('button', { name: 'workbench-door-stub' }))
      expect(roomHeading()).toBeNull()
      expect(window.history.length).toBe(before)
      fireEvent.click(screen.getByRole('button', { name: 'door-ask-stay-stub' }))
      expect(screen.queryByRole('button', { name: 'door-ask-stay-stub' })).toBeNull()
      expect(screen.getByText('result stub')).toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: 'workbench-door-stub' }))
      fireEvent.click(screen.getByRole('button', { name: 'door-ask-go-stub' }))
      expect(await screen.findByRole('heading', { name: copy.workbenchHeading })).toBeInTheDocument()
    } finally {
      release()
    }
  })
})

describe('the workbench room', () => {
  it('entering pushes ONE history entry carrying no plan data; Back lands on the answer, still shown', async () => {
    await landHydrated()
    const before = window.history.length
    await enterRoom()
    expect(window.history.length).toBe(before + 1)
    expect(window.history.state).toEqual({ b9: 'room' })
    expect(window.location.search).toBe('')
    expect(window.location.hash).toBe('')
    // The saved plan's mark from the one save machine.
    expect(screen.getByText(copy.savedBadge)).toBeInTheDocument()

    await pressBack()
    expect(roomHeading()).toBeNull()
    expect(await screen.findByText('result stub')).toHaveAttribute('data-save-kind', 'clean')
  })

  it('Forward onto its entry re-enters the room; with an entry open on the answer the Forward is undone', async () => {
    await landHydrated()
    await enterRoom()
    await pressBack()
    await pressForward()
    expect(roomHeading()).toBeInTheDocument()

    await pressBack()
    const release = holdUnsavedBuffer()
    try {
      await pressForward(true)
      expect(roomHeading()).toBeNull()
      expect(screen.getByText('result stub')).toBeInTheDocument()
      expect(window.history.state).toBeNull()
    } finally {
      release()
    }
  })

  it('a room entry left under the answer (a reload in the room) never swallows the first Back', async () => {
    window.history.replaceState({ b9: 'room' }, '')
    await landHydrated()
    await enterRoom()
    await pressBack()
    expect(roomHeading()).toBeNull()
    expect(screen.getByText('result stub')).toBeInTheDocument()
  })

  it('its own back button is the same history Back', async () => {
    await landHydrated()
    await enterRoom()
    await backAndSettle(() => fireEvent.click(screen.getByRole('button', { name: copy.workbenchBack })))
    expect(roomHeading()).toBeNull()
    expect(screen.getByText('result stub')).toBeInTheDocument()
    expect(window.history.state).toBeNull()
  })

  it('a Back press with an entry open asks first and loses nothing; "Go back" then leaves', async () => {
    await landHydrated()
    await enterRoom()
    const release = holdUnsavedBuffer()
    try {
      await pressBack()
      // Still in the room, its entry back on, the ask raised.
      expect(roomHeading()).toBeInTheDocument()
      expect(window.history.state).toEqual({ b9: 'room' })
      expect(screen.getByText(copy.workbenchLeaveAsk)).toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: copy.workbenchLeaveStay }))
      expect(screen.queryByText(copy.workbenchLeaveAsk)).toBeNull()
      expect(roomHeading()).toBeInTheDocument()

      await pressBack()
      expect(screen.getByText(copy.workbenchLeaveAsk)).toBeInTheDocument()
      await backAndSettle(() => fireEvent.click(screen.getByRole('button', { name: copy.workbenchLeaveGo })))
      expect(roomHeading()).toBeNull()
      expect(screen.getByText('result stub')).toBeInTheDocument()
    } finally {
      release()
    }
  })

  it('Save from the room returns to the room, and a Back during that ceremony is absorbed', async () => {
    // A fresh, never-saved household: the dev seed lands it on its answer with the first-save control.
    render(<IntakeApp seed="retired" />)
    await screen.findByText('result stub')
    await enterRoom()
    fireEvent.click(screen.getByRole('button', { name: copy.saveCta }))
    await screen.findByText('save stub')

    await pressBack()
    expect(screen.getByText('save stub')).toBeInTheDocument()
    expect(window.history.state).toEqual({ b9: 'room' })

    fireEvent.click(screen.getByRole('button', { name: 'save-done-stub' }))
    expect(await screen.findByRole('heading', { name: copy.workbenchHeading })).toBeInTheDocument()
    expect(screen.getByText(copy.savedBadge)).toBeInTheDocument()
  })

  it('a read-only tab gets the room, with no control that writes', async () => {
    await landHydrated(true)
    await enterRoom()
    expect(screen.queryByRole('button', { name: copy.saveCta })).toBeNull()
    expect(screen.queryByRole('button', { name: copy.resaveCta })).toBeNull()
    expect(screen.queryByText(copy.savedBadge)).toBeNull()
    expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual([copy.workbenchBack])
    // The facts page too (U8): every fact, and no door into any of them.
    fireEvent.click(screen.getByRole('tab', { name: copy.workbenchPageFacts }))
    expect(screen.getByRole('heading', { name: copy.workbenchFactsSocialSecurity })).toBeInTheDocument()
    // A lever's link to the What if page (U15) moves to a page and writes nothing; it is the one other button.
    expect(screen.getAllByRole('button').map((b) => b.textContent).filter((t) => t !== copy.workbenchFactsTry)).toEqual([copy.workbenchBack])
    // The What if page (U15): a read-only tab can try a change and draws no Apply.
    fireEvent.click(screen.getByRole('tab', { name: copy.workbenchPageWhatIf }))
    expect(screen.queryByRole('button', { name: copy.workbenchRailApply })).toBeNull()
    expect(screen.getByText(copy.workbenchRailApplyReadOnly)).toBeInTheDocument()
  })
})

describe('the facts page through the real phase machine (U8)', () => {
  /** Open a facts-page group's sheet and type a new first name for the first person: the draft moves. */
  function editAName(name: string) {
    fireEvent.click(screen.getByRole('tab', { name: copy.workbenchPageFacts }))
    fireEvent.click(screen.getByRole('button', { name: 'Edit the two of you' }))
    const sheet = screen.getByRole('dialog', { name: copy.workbenchFactsPeople })
    const field = within(sheet).getAllByLabelText(copy.nameLabel)[0]!
    fireEvent.change(field, { target: { value: name } })
    fireEvent.blur(field)
    return sheet
  }

  it('an edit marks the saved plan unsaved, and the room offers its save', async () => {
    await landHydrated()
    await enterRoom()
    expect(screen.getByText(copy.savedBadge)).toBeInTheDocument()
    const sheet = editAName('Robin')
    fireEvent.click(within(sheet).getByRole('button', { name: copy.workbenchFactsDone }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(screen.getByRole('button', { name: copy.resaveCta })).toBeInTheDocument()
    expect(appModel.getSnapshot().draft.people[0].name).toBe('Robin')
  })

  it('a real Back press with an open step sheet that moved the draft asks first, over the sheet; Stay keeps it open; Go back leaves, keeping the finished edit', async () => {
    await landHydrated()
    await enterRoom()
    editAName('Jordan')
    await pressBack()
    // Still in the room, its entry back on, the ask raised over the open sheet, where it can be read and pressed.
    expect(roomHeading()).toBeInTheDocument()
    expect(window.history.state).toEqual({ b9: 'room' })
    const ask = screen.getByRole('alertdialog', { name: copy.workbenchLeaveAsk })
    expect(within(ask).getByRole('button', { name: copy.workbenchLeaveStay })).toHaveFocus()
    expect(screen.getByRole('dialog', { name: copy.workbenchFactsPeople })).toBeInTheDocument()

    fireEvent.click(within(ask).getByRole('button', { name: copy.workbenchLeaveStay }))
    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(screen.getByRole('dialog', { name: copy.workbenchFactsPeople })).toBeInTheDocument()

    // The ask holds the keyboard over the sheet (the U8 review's C3): Tab moves between its two choices only, and
    // Escape is Stay; a scrim takes the presses meant for the sheet or the room.
    await pressBack()
    const held = screen.getByRole('alertdialog', { name: copy.workbenchLeaveAsk })
    const stay = within(held).getByRole('button', { name: copy.workbenchLeaveStay })
    const go = within(held).getByRole('button', { name: copy.workbenchLeaveGo })
    expect(held.closest('.workbench__ask-layer'), 'the ask rides its scrim').not.toBeNull()
    fireEvent.keyDown(stay, { key: 'Tab' })
    expect(go).toHaveFocus()
    fireEvent.keyDown(go, { key: 'Tab', shiftKey: true })
    expect(stay).toHaveFocus()
    fireEvent.keyDown(stay, { key: 'Escape' })
    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(screen.getByRole('dialog', { name: copy.workbenchFactsPeople })).toBeInTheDocument()

    await pressBack()
    const again = screen.getByRole('alertdialog', { name: copy.workbenchLeaveAsk })
    await backAndSettle(() => fireEvent.click(within(again).getByRole('button', { name: copy.workbenchLeaveGo })))
    expect(roomHeading()).toBeNull()
    expect(screen.getByText('result stub')).toHaveAttribute('data-save-kind', 'dirty')
    expect(appModel.getSnapshot().draft.people[0].name).toBe('Jordan')
  })
})
