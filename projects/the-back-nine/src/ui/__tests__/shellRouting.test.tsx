// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'

/**
 * The shell and its door, through IntakeApp's REAL phase machine and the browser's REAL history (Act 6 · RC2; plan 6,
 * section 3.1 "Routing"; the workbench room's U6 tests, carried over). Result is stubbed to a props echo (the save
 * slot's kind, the door), SaveFlow to its two callbacks; the shell itself is the real lazy module. The store's answer
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
if (!ready.ready) throw new Error('shellRouting.test: the retired dev seed must build a persistable scenario')
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

/** The shell is up: its page's heading (since RC3 the door lands on Dashboard → Snapshot). */
const shellUp = () => document.querySelector('main.result[data-shell-screen]') !== null
const screenShown = () => document.querySelector('main.result')?.getAttribute('data-shell-screen') ?? null
const saveState = () => document.querySelector('[data-save-state]')?.getAttribute('data-save-state') ?? null

/** A saved household, past the re-entry gate, on its answer. */
async function landHydrated(readOnly = false) {
  render(<IntakeApp hydrateFromVault readOnly={readOnly} />)
  const name = readOnly ? copy.reentryContinueCta : copy.reentryAffirmCta
  fireEvent.click(await screen.findByRole('button', { name }))
  return screen.findByText('result stub')
}

async function enterShell() {
  fireEvent.click(screen.getByRole('button', { name: 'workbench-door-stub' }))
  await screen.findByRole('heading', { level: 1, name: copy.shellPageSnapshot }, { timeout: 15_000 })
}

/** A real history Back — sent by `go` — through jsdom's real traversal, settled on the popstate it fires. */
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

const modulesNav = () => screen.getAllByRole('navigation', { name: copy.shellModulesLabel })[0]!
const pagesNav = () => screen.getByRole('navigation', { name: copy.shellPagesLabel })
const goToFacts = () => fireEvent.click(within(modulesNav()).getByRole('link', { name: copy.shellModuleProfile }))
const goToWhatIf = () => {
  const retirement = within(modulesNav()).getByRole('link', { name: copy.shellModuleRetirement })
  // The module's word lands on its first page, Analysis; from inside the module, its sub-nav word.
  if (retirement.getAttribute('aria-current') !== 'page') fireEvent.click(retirement)
  else fireEvent.click(within(pagesNav()).getByRole('link', { name: copy.shellPageAnalysis }))
}

/** Open the lock menu and press one of its items. */
async function lockChoose(label: string) {
  fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${copy.lockMenuLabel}`) }))
  fireEvent.click(await screen.findByRole('menuitem', { name: label }))
}

beforeEach(() => {
  plant.answer = RESOLVED
  window.history.replaceState(null, '', '/')
})
afterEach(cleanup)

describe('the door', () => {
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
      expect(shellUp()).toBe(false)
      expect(window.history.length).toBe(before)
      fireEvent.click(screen.getByRole('button', { name: 'door-ask-stay-stub' }))
      expect(screen.queryByRole('button', { name: 'door-ask-stay-stub' })).toBeNull()
      expect(screen.getByText('result stub')).toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: 'workbench-door-stub' }))
      fireEvent.click(screen.getByRole('button', { name: 'door-ask-go-stub' }))
      expect(await screen.findByRole('heading', { level: 1, name: copy.shellPageSnapshot }, { timeout: 15_000 })).toBeInTheDocument()
    } finally {
      release()
    }
  })
})

describe('the shell’s history', () => {
  it('entering pushes ONE entry carrying no plan data, its hash the page’s; Back lands on the answer, still shown', async () => {
    await landHydrated()
    const before = window.history.length
    await enterShell()
    expect(window.history.length).toBe(before + 1)
    expect(window.history.state).toEqual({ b9: 'workspace', n: 1 })
    expect(window.location.search).toBe('')
    expect(window.location.hash).toBe('#/dashboard/snapshot')
    // The saved plan's state on the bar, from the one save machine.
    expect(saveState()).toBe('clean')

    await pressBack()
    expect(shellUp()).toBe(false)
    expect(await screen.findByText('result stub')).toHaveAttribute('data-save-kind', 'clean')
    expect(window.location.hash).toBe('')
  })

  it('each page is an entry: Back moves to the previous page, Forward to the next; the hash names the page and nothing more', async () => {
    await landHydrated()
    await enterShell()
    goToFacts()
    expect(screenShown()).toBe('interim-facts')
    expect(window.location.hash).toBe('#/profile/facts')
    expect(window.history.state).toEqual({ b9: 'workspace', n: 2 })
    // Nothing about the plan in the address or the entry: no figure, no name.
    const names = appModel.getSnapshot().draft.people.map((p) => p.name ?? '').filter((n) => n !== '')
    for (const text of [window.location.href, JSON.stringify(window.history.state)]) {
      for (const name of names) expect(text).not.toContain(name)
      expect(text.replace(/^[a-z]+:\/\/[^/]+/, '')).not.toMatch(/\d{3,}/)
    }

    await pressBack()
    expect(screenShown()).toBe('snapshot')
    expect(window.location.hash).toBe('#/dashboard/snapshot')
    await pressForward()
    expect(screenShown()).toBe('interim-facts')
  })

  it('Forward onto its entry re-enters the shell; with an entry open on the answer the Forward is undone', async () => {
    await landHydrated()
    await enterShell()
    await pressBack()
    await pressForward()
    expect(shellUp()).toBe(true)

    await pressBack()
    const release = holdUnsavedBuffer()
    try {
      await pressForward(true)
      expect(shellUp()).toBe(false)
      expect(screen.getByText('result stub')).toBeInTheDocument()
      expect(window.history.state).toBeNull()
    } finally {
      release()
    }
  })

  it('a shell entry left under the answer (a reload in the shell) never swallows the first Back', async () => {
    window.history.replaceState({ b9: 'workspace', n: 3 }, '', '/#/profile/facts')
    await landHydrated()
    // The stale page address is dropped on landing: the answer's address names no page.
    expect(window.location.hash).toBe('')
    await enterShell()
    await pressBack()
    expect(shellUp()).toBe(false)
    expect(screen.getByText('result stub')).toBeInTheDocument()
  })

  it('the wordmark goes straight back to the answer from any page, as one history move', async () => {
    await landHydrated()
    await enterShell()
    goToFacts()
    goToWhatIf()
    await backAndSettle(() => fireEvent.click(screen.getByRole('link', { name: copy.shellHomeLabel })))
    expect(shellUp()).toBe(false)
    expect(screen.getByText('result stub')).toBeInTheDocument()
    expect(window.history.state).toBeNull()
  })

  it('Back with an open drawer holding an edit asks first, between pages and out of the shell; Stay keeps it; Go back leaves', async () => {
    await landHydrated()
    await enterShell()
    goToFacts()
    const release = holdUnsavedBuffer()
    try {
      // Between pages: still on the facts page, its entry back on, the ask raised.
      await pressBack()
      expect(screenShown()).toBe('interim-facts')
      expect(window.history.state).toEqual({ b9: 'workspace', n: 2 })
      expect(window.location.hash).toBe('#/profile/facts')
      expect(screen.getByText(copy.workbenchLeaveAsk)).toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: copy.workbenchLeaveStay }))
      expect(screen.queryByText(copy.workbenchLeaveAsk)).toBeNull()
      expect(screenShown()).toBe('interim-facts')

      await pressBack()
      await backAndSettle(() => fireEvent.click(screen.getByRole('button', { name: copy.workbenchLeaveGo })))
      expect(screenShown()).toBe('snapshot')

      // Out of the shell: the same ask, the same Go back.
      await pressBack()
      expect(shellUp()).toBe(true)
      expect(window.history.state).toEqual({ b9: 'workspace', n: 1 })
      expect(screen.getByText(copy.workbenchLeaveAsk)).toBeInTheDocument()
      await backAndSettle(() => fireEvent.click(screen.getByRole('button', { name: copy.workbenchLeaveGo })))
      expect(shellUp()).toBe(false)
      expect(screen.getByText('result stub')).toBeInTheDocument()
    } finally {
      release()
    }
  })

  it('Back with nothing open moves to the previous page, no ask', async () => {
    await landHydrated()
    await enterShell()
    goToFacts()
    await pressBack()
    expect(screen.queryByText(copy.workbenchLeaveAsk)).toBeNull()
    expect(screenShown()).toBe('snapshot')
  })

  it('Save from the shell’s lock menu returns to the same page, and a Back during that ceremony is absorbed', async () => {
    // A fresh, never-saved household: the dev seed lands it on its answer with the first-save control.
    render(<IntakeApp seed="retired" />)
    await screen.findByText('result stub')
    await enterShell()
    goToFacts()
    expect(saveState()).toBe('first')
    await lockChoose(copy.saveCta)
    await screen.findByText('save stub')

    await pressBack()
    expect(screen.getByText('save stub')).toBeInTheDocument()
    expect(window.history.state).toEqual({ b9: 'workspace', n: 2 })
    expect(window.location.hash).toBe('#/profile/facts')

    fireEvent.click(screen.getByRole('button', { name: 'save-done-stub' }))
    await waitFor(() => expect(screenShown()).toBe('interim-facts'))
    expect(saveState()).toBe('clean')
  })

  it('a read-only tab gets the shell, with no control that writes', async () => {
    await landHydrated(true)
    await enterShell()
    expect(saveState()).toBe('view-only')
    fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${copy.lockMenuLabel}`) }))
    expect(await screen.findByText(copy.saveErrorReadOnly)).toBeInTheDocument()
    expect(screen.queryAllByRole('menuitem')).toEqual([])
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' })
    // The facts page: every fact, and no door into any of them.
    goToFacts()
    expect(screen.getByRole('heading', { name: copy.workbenchFactsSocialSecurity })).toBeInTheDocument()
    expect(screen.queryAllByRole('button', { name: new RegExp(`^${copy.workbenchFactsEdit}`) })).toEqual([])
    // The What if page: a read-only tab can try a change and draws no Apply.
    goToWhatIf()
    expect(screen.queryByRole('button', { name: copy.workbenchRailApply })).toBeNull()
    expect(screen.getByText(copy.workbenchRailApplyReadOnly)).toBeInTheDocument()
  })
})

describe('the facts page through the real phase machine (U8)', () => {
  /** Open a facts-page group's sheet and type a new first name for the first person: the draft moves. */
  function editAName(name: string) {
    goToFacts()
    fireEvent.click(screen.getByRole('button', { name: 'Edit the two of you' }))
    const sheet = screen.getByRole('dialog', { name: copy.workbenchFactsPeople })
    const field = within(sheet).getAllByLabelText(copy.nameLabel)[0]!
    fireEvent.change(field, { target: { value: name } })
    fireEvent.blur(field)
    return sheet
  }

  it('an edit marks the saved plan unsaved, and the lock menu offers its save', async () => {
    await landHydrated()
    await enterShell()
    expect(saveState()).toBe('clean')
    const sheet = editAName('Robin')
    fireEvent.click(within(sheet).getByRole('button', { name: copy.workbenchFactsDone }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(saveState()).toBe('dirty')
    fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${copy.lockMenuLabel}`) }))
    expect(await screen.findByRole('menuitem', { name: copy.resaveCta })).toBeInTheDocument()
    expect(appModel.getSnapshot().draft.people[0].name).toBe('Robin')
  })

  it('a real Back press with an open step sheet that moved the draft asks first, over the sheet; Stay keeps it open; Go back leaves, keeping the finished edit', async () => {
    await landHydrated()
    await enterShell()
    editAName('Jordan')
    await pressBack()
    // Still on the facts page, its entry back on, the ask raised over the open sheet, where it can be read and pressed.
    expect(screenShown()).toBe('interim-facts')
    expect(window.history.state).toEqual({ b9: 'workspace', n: 2 })
    const ask = screen.getByRole('alertdialog', { name: copy.workbenchLeaveAsk })
    expect(within(ask).getByRole('button', { name: copy.workbenchLeaveStay })).toHaveFocus()
    expect(screen.getByRole('dialog', { name: copy.workbenchFactsPeople })).toBeInTheDocument()

    fireEvent.click(within(ask).getByRole('button', { name: copy.workbenchLeaveStay }))
    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(screen.getByRole('dialog', { name: copy.workbenchFactsPeople })).toBeInTheDocument()

    // The ask holds the keyboard over the sheet (the U8 review's C3): Tab moves between its two choices only, and
    // Escape is Stay; a scrim takes the presses meant for the sheet or the page.
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
    expect(screenShown()).toBe('snapshot')
    expect(appModel.getSnapshot().draft.people[0].name).toBe('Jordan')
  })
})

describe('an unkept what-if (plan 6, section 3.1)', () => {
  // A provisional reading of the retired seed: the rail offers its levers, and neither the table nor the what-if asks
  // an engine run on a provisional answer (the worker never starts here).
  beforeEach(() => {
    plant.answer = {
      kind: 'headline',
      tier: 'provisional',
      draft: DEV_SEEDS.retired,
      inputKey: 'k1',
      result: { headline: { outcomeState: 'on-track', xOfTen: { value: 8, marginToEdge: 0.1 }, stateMarginToEdge: 0.1 }, distribution: {} },
    } as unknown as ModelAnswer
  })

  /** Commit a what-if spending figure on the What if page: the what-if now holds a change the plan doesn't. */
  async function holdAWhatIf() {
    goToWhatIf()
    const spending = document.querySelector<HTMLDetailsElement>('.wb-lever[data-lever="spending"]')!
    spending.open = true
    const field = within(spending).getByLabelText(copy.workbenchRailSpendTotalLabel)
    act(() => field.focus())
    fireEvent.change(field, { target: { value: '60,000' } })
    act(() => field.blur())
    await waitFor(() => expect(spending.querySelector('.wb-lever__mark:not(.wb-lever__mark--off)')).not.toBeNull())
  }

  it('Back out of the shell asks first and names the what-if; moving between pages keeps it and asks nothing', async () => {
    await landHydrated()
    await enterShell()
    await holdAWhatIf()
    // Between pages the what-if survives: no ask.
    await pressBack()
    expect(screen.queryByText(copy.shellLeaveWhatIf)).toBeNull()
    expect(screenShown()).toBe('snapshot')
    // Out of the shell: the ask, in the what-if's own words (never the open entry's).
    await pressBack()
    expect(shellUp()).toBe(true)
    expect(screen.getByText(copy.shellLeaveWhatIf)).toBeInTheDocument()
    expect(screen.queryByText(copy.workbenchLeaveAsk)).toBeNull()
    await backAndSettle(() => fireEvent.click(screen.getByRole('button', { name: copy.workbenchLeaveGo })))
    expect(shellUp()).toBe(false)
    expect(screen.getByText('result stub')).toBeInTheDocument()
  })

  it('the wordmark asks first too, and Stay keeps the shell', async () => {
    await landHydrated()
    await enterShell()
    await holdAWhatIf()
    fireEvent.click(screen.getByRole('link', { name: copy.shellHomeLabel }))
    expect(screen.getByText(copy.shellLeaveWhatIf)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: copy.workbenchLeaveStay }))
    expect(shellUp()).toBe(true)
    expect(screenShown()).toBe('interim-whatif')
  })
})
