// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'

/**
 * The shell AS THE HOME, through IntakeApp's REAL phase machine and the browser's REAL history (Act 6 · RC4; plan 6,
 * section 3.1 "Routing" and "How the shell arrives"; RC2's door tests, re-pointed when the door and the answer page
 * went). Setup's end, a reopened vault and every dev seed land on Dashboard → Snapshot; the landing REPLACES the
 * document's entry with the first page's, so no answer page sits beneath it. SaveFlow is stubbed to its two callbacks;
 * the shell itself is the real lazy module. The store's answer resolves only through the worker, so it is planted by
 * wrapping `getSnapshot` (the draft stays real).
 *
 * What a Back press from the FIRST page does is the browser's (it leaves the app, and the leave dialog stands over
 * unsaved work and an unkept what-if: `IntakeApp.test.tsx`'s unsaved-work guard arms); jsdom cannot traverse out of
 * its document, so no arm here presses it.
 */

const h = vi.hoisted(() => ({ model: null as unknown }))
vi.mock('../vaultSession', () => ({
  getVaultSession: async () => ({ currentModel: () => h.model, hasBackupRecord: async () => true }),
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
import { copy, slots } from '../copy'
import { holdUnsavedBuffer, unsavedBuffersHeld } from '@intake/unsavedBuffer'
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

const shellUp = () => document.querySelector('main.result[data-shell-screen]') !== null
const screenShown = () => document.querySelector('main.result')?.getAttribute('data-shell-screen') ?? null
const saveState = () => document.querySelector('[data-save-state]')?.getAttribute('data-save-state') ?? null
const snapshotHeading = () => screen.findByRole('heading', { level: 1, name: copy.shellPageSnapshot }, { timeout: 15_000 })

/** A saved household, past the re-entry gate, on the home. */
async function landHydrated(readOnly = false) {
  render(<IntakeApp hydrateFromVault readOnly={readOnly} />)
  const name = readOnly ? copy.reentryContinueCta : copy.reentryAffirmCta
  fireEvent.click(await screen.findByRole('button', { name }))
  return snapshotHeading()
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
async function pressForward() {
  await act(async () => {
    const popped = new Promise((r) => window.addEventListener('popstate', r, { once: true }))
    window.history.forward()
    await popped
  })
}

const modulesNav = () => screen.getAllByRole('navigation', { name: copy.shellModulesLabel })[0]!
const goToFacts = () => fireEvent.click(within(modulesNav()).getByRole('link', { name: copy.shellModuleProfile }))
/** Retirement → Analysis (the module's first page: Probability). */
const goToAnalysis = () => fireEvent.click(within(modulesNav()).getByRole('link', { name: copy.shellModuleRetirement }))
/** Probability's Action Items tray (RC4b): Retirement → Analysis, then the handle. */
const openTray = () => {
  goToAnalysis()
  fireEvent.click(screen.getByRole('button', { name: copy.trayHandle }))
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

describe('the home', () => {
  it('a reopened vault lands on Snapshot: the landing REPLACES the document’s entry (no answer page beneath), its hash the page’s, no plan data', async () => {
    const before = window.history.length
    await landHydrated()
    expect(window.history.length, 'no entry pushed: nothing sits beneath the home').toBe(before)
    expect(window.history.state).toEqual({ b9: 'workspace', n: 1 })
    expect(window.location.search).toBe('')
    expect(window.location.hash).toBe('#/dashboard/snapshot')
    expect(saveState()).toBe('clean')
    expect(screen.queryByText(copy.workbenchDoorCta), 'no door: the shell is the home').toBeNull()
  })

  it('a dev seed lands on Snapshot too, never an answer page', async () => {
    render(<IntakeApp seed="retired" />)
    await snapshotHeading()
    expect(screenShown()).toBe('snapshot')
    expect(window.history.state).toEqual({ b9: 'workspace', n: 1 })
  })

  it('a page address left from an earlier load (a reload in the shell) is dropped: the landing names the home', async () => {
    window.history.replaceState({ b9: 'workspace', n: 3 }, '', '/#/profile/facts')
    await landHydrated()
    expect(window.location.hash).toBe('#/dashboard/snapshot')
    expect(window.history.state).toEqual({ b9: 'workspace', n: 1 })
  })
})

describe('the shell’s history', () => {
  it('each page is an entry: Back moves to the previous page, Forward to the next; the hash names the page and nothing more', async () => {
    await landHydrated()
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

  it('the wordmark goes straight home to Snapshot from any page, as one history move', async () => {
    await landHydrated()
    goToFacts()
    goToAnalysis()
    expect(screenShown()).toBe('probability')
    await backAndSettle(() => fireEvent.click(screen.getByRole('link', { name: copy.shellHomeLabel })))
    expect(screenShown()).toBe('snapshot')
    expect(window.history.state).toEqual({ b9: 'workspace', n: 1 })
  })

  it('Back with an open drawer holding an edit asks first between pages; Stay keeps it; Go back leaves', async () => {
    await landHydrated()
    goToFacts()
    const release = holdUnsavedBuffer()
    try {
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
    } finally {
      release()
    }
  })

  it('Back with nothing open moves to the previous page, no ask', async () => {
    await landHydrated()
    goToFacts()
    await pressBack()
    expect(screen.queryByText(copy.workbenchLeaveAsk)).toBeNull()
    expect(screenShown()).toBe('snapshot')
  })

  it('Save from the shell’s lock menu returns to the same page, and a Back during that ceremony is absorbed', async () => {
    // A fresh, never-saved household: the dev seed lands it on the home with the first-save control.
    render(<IntakeApp seed="retired" />)
    await snapshotHeading()
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

  it('a save ask’s Go after the plan stopped being saveable opens no ceremony and leaves Back working between pages', async () => {
    render(<IntakeApp seed="retired" />)
    await snapshotHeading()
    goToFacts()
    const release = holdUnsavedBuffer()
    try {
      await lockChoose(copy.saveCta)
      expect(screen.getByText(copy.shellCeremonyOpenEntry)).toBeInTheDocument()
      // A required fact cleared beneath the ask: the plan can no longer be saved.
      act(() => appModel.update((d) => ({ ...d, annualSpendingReal: undefined })))
      fireEvent.click(screen.getByRole('button', { name: copy.shellCeremonyGo }))
      await act(async () => {})
      expect(screen.queryByText('save stub')).toBeNull()
    } finally {
      release()
    }
    await pressBack()
    expect(screenShown(), 'the Back moved the page (never absorbed as if a ceremony were open)').toBe('snapshot')
  })

  it('a read-only tab gets the shell, with no control that writes', async () => {
    await landHydrated(true)
    expect(saveState()).toBe('view-only')
    fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${copy.lockMenuLabel}`) }))
    expect(await screen.findByText(copy.saveErrorReadOnly)).toBeInTheDocument()
    expect(screen.queryAllByRole('menuitem')).toEqual([])
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' })
    // The facts page: every fact, and no door into any of them.
    goToFacts()
    expect(screen.getByRole('heading', { name: copy.workbenchFactsSocialSecurity })).toBeInTheDocument()
    expect(screen.queryAllByRole('button', { name: new RegExp(`^${copy.workbenchFactsEdit}`) })).toEqual([])
    // No sheet mounts on a read-only tab, so no door that would open one: no gear, no health-cost door.
    expect(screen.queryByRole('button', { name: copy.shellGearLabel })).toBeNull()
    // A household with a marketplace quote and someone under 65 (the page's door would show on a writable tab).
    act(() =>
      appModel.update((d) => ({
        ...d,
        people: [{ ...d.people[0], currentAge: 62 }, d.people[1]],
        health: { ...d.health, enrolledPremiumMonthlyToday: 900, slcspMonthlyToday: 1_000 },
      })),
    )
    goToAnalysis()
    fireEvent.click(screen.getByRole('link', { name: copy.shellPageHealthCare }))
    // Retirement → Health Care (RC10): no door into a fact on a read-only tab (its tray's facts open nowhere here, and
    // this planted answer is a compute error, so the page shows its words and no tray at all).
    expect(screenShown()).toBe('health-care')
    expect(document.querySelector('main.result [data-fact-open]')).toBeNull()
    // The Action Items tray's read-only face (no Apply, Refresh still runs) is `ActionItemsTray.test.tsx`'s: this
    // planted answer is a compute error, which offers no tray at all.
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
    editAName('Jordan')
    await pressBack()
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
    // "Going back closes it": no sheet stays open over the new page, and focus lands on its heading.
    await waitFor(() => expect(screen.queryByRole('dialog'), 'the sheet closed with the leave').toBeNull())
    expect(screen.getByRole('heading', { level: 1, name: copy.shellPageSnapshot })).toHaveFocus()
    expect(unsavedBuffersHeld(), 'nothing held once the leave went').toBe(0)
  })

  it('a plain Back with a sheet open and nothing typed moves the page and closes the sheet; Forward lands focus on the page’s heading', async () => {
    await landHydrated()
    goToFacts()
    fireEvent.click(screen.getByRole('button', { name: copy.shellGearLabel }))
    await screen.findByRole('dialog')
    await pressBack()
    expect(screen.queryByText(copy.workbenchLeaveAsk), 'nothing typed: no ask').toBeNull()
    expect(screenShown()).toBe('snapshot')
    await waitFor(() => expect(screen.queryByRole('dialog'), 'the panel closed with the page').toBeNull())
    await pressForward()
    expect(screenShown()).toBe('interim-facts')
    expect(screen.getByRole('heading', { level: 2, name: copy.workbenchPageFacts })).toHaveFocus()
  })

  it('Go back over a budget closed with rows not yet applied drops those rows, as the ask says', async () => {
    await landHydrated()
    act(() =>
      appModel.update((d) => ({ ...d, budget: [{ id: 'line-food', category: 'food', label: 'Groceries', annualAmountReal: 9_600, tier: 'essentials', startYear: 0 }] })),
    )
    goToFacts()
    fireEvent.click(document.querySelector('[data-fact-open="budget"]')!)
    const sheet = await screen.findByRole('dialog')
    fireEvent.click(within(sheet).getByRole('button', { name: copy.budgetAddLine }))
    fireEvent.click(within(sheet).getByRole('button', { name: copy.budgetCancel }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(unsavedBuffersHeld(), 'the staged row holds').toBe(1)
    await pressBack()
    expect(screen.getByText(copy.workbenchLeaveAsk)).toBeInTheDocument()
    await backAndSettle(() => fireEvent.click(screen.getByRole('button', { name: copy.workbenchLeaveGo })))
    expect(screenShown()).toBe('snapshot')
    expect(unsavedBuffersHeld(), 'the row not yet added was dropped').toBe(0)
  })

  /** Open the Social Security step's sheet and type a monthly benefit for the first person, focused (never blurred). */
  function typeABenefit(monthly: string) {
    goToFacts()
    fireEvent.click(screen.getAllByRole('button', { name: slots.workbenchFactsEditName(copy.workbenchFactsSocialSecurity) })[0]!)
    const sheet = screen.getByRole('dialog', { name: copy.workbenchFactsSocialSecurity })
    const field = within(sheet).getAllByLabelText(copy.ssAmountLabel)[0]!
    act(() => field.focus())
    fireEvent.change(field, { target: { value: monthly } })
    return field
  }

  it('Go back over a figure the step refuses puts the draft back to what it held at open, and the ask says so first: a refused value never reaches the answer', async () => {
    await landHydrated()
    const before = appModel.getSnapshot().draft.people[0].pia
    // A yearly figure in the monthly box: 360,000 a year, over the benefit ceiling (the step's Continue refuses it).
    const field = typeABenefit('30,000')
    act(() => field.blur())
    expect(appModel.getSnapshot().draft.people[0].pia, 'the blur wrote it, as the walk does').toBe(360_000)
    await pressBack()
    // Never "changes you finished stay in your plan": Go puts the whole step back (round 3 of the milestone-1 review).
    expect(screen.queryByText(copy.workbenchLeaveAsk)).toBeNull()
    const ask = screen.getByRole('alertdialog', { name: copy.workbenchLeaveAskPutsBack })
    await backAndSettle(() => fireEvent.click(within(ask).getByRole('button', { name: copy.workbenchLeaveGo })))
    expect(screenShown()).toBe('snapshot')
    expect(appModel.getSnapshot().draft.people[0].pia, 'the refused figure went with the sheet').toBe(before)
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(unsavedBuffersHeld()).toBe(0)
  })

  it('a plain Back over a figure typed and never blurred ends the edit through the sheet: a figure the step takes is kept, a refused one is not', async () => {
    await landHydrated()
    const before = appModel.getSnapshot().draft.people[0].pia
    typeABenefit('2,100')
    await pressBack()
    expect(screen.queryByText(copy.workbenchLeaveAsk), 'nothing committed yet: no ask').toBeNull()
    expect(screenShown()).toBe('snapshot')
    expect(appModel.getSnapshot().draft.people[0].pia, 'the typed figure committed as the sheet closed').toBe(25_200)
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())

    typeABenefit('30,000')
    await pressBack()
    expect(screenShown()).toBe('snapshot')
    expect(appModel.getSnapshot().draft.people[0].pia, 'a refused figure never leaves').toBe(25_200)
    expect(before).not.toBe(25_200)
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

  /** Type a what-if spending figure in the Action Items tray, never refreshed: the tray now holds an edit the plan
   *  doesn't (a pending edit is typed work too, plan RC4's leave ask). */
  async function holdAWhatIf() {
    openTray()
    const field = await screen.findByLabelText(copy.workbenchRailSpendTotalLabel)
    act(() => field.focus())
    fireEvent.change(field, { target: { value: '60,000' } })
    act(() => field.blur())
    await waitFor(() => expect(field.closest('[data-changed]')).not.toBeNull())
  }

  it('moving between pages keeps it and asks nothing; the wordmark (a page move home) asks nothing either', async () => {
    await landHydrated()
    await holdAWhatIf()
    await pressBack()
    expect(screen.queryByText(copy.shellLeaveWhatIf)).toBeNull()
    expect(shellUp()).toBe(true)
    goToFacts()
    await backAndSettle(() => fireEvent.click(screen.getByRole('link', { name: copy.shellHomeLabel })))
    expect(screen.queryByText(copy.shellLeaveWhatIf)).toBeNull()
    expect(screenShown()).toBe('snapshot')
  })

  it('the re-walk (the gear’s panel) asks first and names the what-if: Stay keeps the shell, Go back leaves for the walk', async () => {
    await landHydrated()
    await holdAWhatIf()
    fireEvent.click(screen.getByRole('button', { name: copy.shellGearLabel }))
    fireEvent.click(await screen.findByRole('button', { name: copy.assumptionRewalkCta }))
    expect(await screen.findByText(copy.shellLeaveWhatIf)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: copy.workbenchLeaveStay }))
    expect(shellUp()).toBe(true)
    expect(screenShown()).toBe('probability')

    fireEvent.click(screen.getByRole('button', { name: copy.shellGearLabel }))
    fireEvent.click(await screen.findByRole('button', { name: copy.assumptionRewalkCta }))
    fireEvent.click(await screen.findByRole('button', { name: copy.workbenchLeaveGo }))
    await waitFor(() => expect(shellUp()).toBe(false))
    expect(window.location.hash, 'the walk-through’s address names no page').toBe('')
  })

  it('the plan list drawer shuts with the page: a plain Back leaves it shut, and coming back never reopens it unasked', async () => {
    await landHydrated()
    goToAnalysis()
    fireEvent.click(await screen.findByRole('button', { name: copy.planListOpenLabel }))
    expect(await screen.findByRole('dialog', { name: copy.planListTitle })).toBeInTheDocument()
    await pressBack()
    expect(screenShown()).toBe('snapshot')
    await pressForward()
    expect(screenShown()).toBe('probability')
    await act(async () => {})
    expect(screen.queryByRole('dialog', { name: copy.planListTitle }), 'the drawer stayed shut').toBeNull()
  })

  it('Reset gives the edit back to the plan: the re-walk then asks nothing', async () => {
    await landHydrated()
    await holdAWhatIf()
    fireEvent.click(screen.getByRole('button', { name: copy.trayReset }))
    fireEvent.click(screen.getByRole('button', { name: copy.shellGearLabel }))
    fireEvent.click(await screen.findByRole('button', { name: copy.assumptionRewalkCta }))
    await waitFor(() => expect(shellUp()).toBe(false))
    expect(screen.queryByText(copy.shellLeaveWhatIf)).toBeNull()
  })
})
