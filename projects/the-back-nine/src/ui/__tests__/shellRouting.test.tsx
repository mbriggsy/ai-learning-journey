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
import { copy } from '../copy'
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
/** Profile → Expenses in ONE move (one history entry), by the phone menu: the Profile word lands on Net Worth, its first
 *  page. (RC13b: the facts page these walks used is gone; Expenses is a Profile page with drawers.) */
const goToFacts = () => {
  fireEvent.click(screen.getByRole('button', { name: copy.shellMenuOpen }))
  fireEvent.click(within(screen.getByRole('dialog', { name: copy.shellMenuTitle })).getByRole('link', { name: copy.shellPageExpenses }))
}
const card = (id: string) => document.querySelector<HTMLElement>(`[data-profile-card="${id}"]`)!
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
    expect(screenShown()).toBe('profile-expenses')
    expect(window.location.hash).toBe('#/profile/expenses')
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
    expect(screenShown()).toBe('profile-expenses')
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
      expect(screenShown()).toBe('profile-expenses')
      expect(window.history.state).toEqual({ b9: 'workspace', n: 2 })
      expect(window.location.hash).toBe('#/profile/expenses')
      expect(screen.getByText(copy.workbenchLeaveAsk)).toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: copy.workbenchLeaveStay }))
      expect(screen.queryByText(copy.workbenchLeaveAsk)).toBeNull()
      expect(screenShown()).toBe('profile-expenses')

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
    expect(window.location.hash).toBe('#/profile/expenses')

    fireEvent.click(screen.getByRole('button', { name: 'save-done-stub' }))
    await waitFor(() => expect(screenShown()).toBe('profile-expenses'))
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
    // A Profile page: every fact on its card, and a drawer that opens with no control that writes (plan 4.0).
    goToFacts()
    expect(screen.getByRole('heading', { name: copy.shellPageExpenses })).toBeInTheDocument()
    fireEvent.click(card('medical'))
    const drawer = await screen.findByRole('dialog', { name: copy.profileKindMedical })
    expect(within(drawer).queryByRole('button', { name: copy.profileDrawerSave })).toBeNull()
    fireEvent.click(within(drawer).getByRole('button', { name: copy.profileDrawerCancel }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    // The gear opens Settings on a read-only tab too (RC18): every value shows, and no row carries a door (plan 4.0).
    fireEvent.click(screen.getByRole('button', { name: copy.shellGearLabel }))
    expect(await screen.findByRole('heading', { name: copy.settingsTitle, level: 1 })).toBeInTheDocument()
    expect(screen.getByText(copy.settingsIntroReadOnly)).toBeInTheDocument()
    expect(document.querySelectorAll('[data-assumption-seat]').length).toBeGreaterThan(0)
    expect(document.querySelector('[data-settings-door]')).toBeNull()
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

describe('a Profile drawer through the real phase machine (RC13b, in place of the facts page’s sheets, U8)', () => {
  /** Open Expenses' Out-of-pocket medical drawer and type a yearly figure (blurred unless `keepFocus`). */
  async function typeMedical(text: string, keepFocus = false) {
    goToFacts()
    fireEvent.click(card('medical'))
    const drawer = await screen.findByRole('dialog', { name: copy.profileKindMedical })
    const field = within(drawer).getByLabelText(copy.oopLabel)
    act(() => field.focus())
    fireEvent.change(field, { target: { value: text } })
    if (!keepFocus) act(() => field.blur())
    return drawer
  }

  it('a Save marks the saved plan unsaved, and the lock menu offers its save', async () => {
    await landHydrated()
    expect(saveState()).toBe('clean')
    const drawer = await typeMedical('4,500')
    fireEvent.click(within(drawer).getByRole('button', { name: copy.profileDrawerSave }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(saveState()).toBe('dirty')
    fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${copy.lockMenuLabel}`) }))
    expect(await screen.findByRole('menuitem', { name: copy.resaveCta })).toBeInTheDocument()
    expect(appModel.getSnapshot().draft.health.oopMedicalAnnual).toBe(4_500)
  })

  it('a real Back press over a drawer holding a change asks inside it, in its own words; Stay keeps it; Go back leaves and drops the change', async () => {
    await landHydrated()
    const before = appModel.getSnapshot().draft.health.oopMedicalAnnual
    await typeMedical('4,500')
    await pressBack()
    expect(screenShown()).toBe('profile-expenses')
    expect(window.history.state).toEqual({ b9: 'workspace', n: 2 })
    const drawer = screen.getByRole('dialog', { name: copy.profileKindMedical })
    expect(within(drawer).getByText(copy.profileLeaveAskUnsaved)).toBeInTheDocument()
    expect(screen.queryByText(copy.workbenchLeaveAsk), 'never asked on the page beneath the drawer').toBeNull()
    fireEvent.click(within(drawer).getByRole('button', { name: copy.workbenchLeaveStay }))
    expect(within(drawer).queryByText(copy.profileLeaveAskUnsaved)).toBeNull()
    expect(screen.getByRole('dialog', { name: copy.profileKindMedical })).toBeInTheDocument()

    await pressBack()
    const again = screen.getByRole('dialog', { name: copy.profileKindMedical })
    await backAndSettle(() => fireEvent.click(within(again).getByRole('button', { name: copy.workbenchLeaveGo })))
    expect(screenShown()).toBe('snapshot')
    expect(appModel.getSnapshot().draft.health.oopMedicalAnnual, 'the change was in the drawer, never in the plan').toBe(before)
    await waitFor(() => expect(screen.queryByRole('dialog'), 'the drawer closed with the leave').toBeNull())
    expect(unsavedBuffersHeld(), 'nothing held once the leave went').toBe(0)
  })

  it('a figure typed and never blurred is unsaved work too: a Back asks first, never dropping it silently', async () => {
    await landHydrated()
    await typeMedical('4,500', true)
    await pressBack()
    expect(screenShown()).toBe('profile-expenses')
    expect(within(screen.getByRole('dialog', { name: copy.profileKindMedical })).getByText(copy.profileLeaveAskUnsaved)).toBeInTheDocument()
  })

  it('a plain Back with a drawer open and nothing changed moves the page and closes it; Forward lands focus on the page’s heading', async () => {
    await landHydrated()
    goToFacts()
    fireEvent.click(card('medical'))
    await screen.findByRole('dialog', { name: copy.profileKindMedical })
    await pressBack()
    expect(screen.queryByText(copy.profileLeaveAskUnsaved), 'nothing changed: no ask').toBeNull()
    expect(screenShown()).toBe('snapshot')
    await waitFor(() => expect(screen.queryByRole('dialog'), 'the drawer closed with the page').toBeNull())
    await pressForward()
    expect(screenShown()).toBe('profile-expenses')
    expect(screen.getByRole('heading', { name: copy.shellPageExpenses })).toHaveFocus()
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

  it('the re-walk (on the gear’s Settings page since RC18) asks first and names the what-if: Stay keeps the shell, Go back leaves for the walk', async () => {
    await landHydrated()
    await holdAWhatIf()
    fireEvent.click(screen.getByRole('button', { name: copy.shellGearLabel }))
    fireEvent.click(await screen.findByRole('button', { name: copy.assumptionRewalkCta }))
    expect(await screen.findByText(copy.shellLeaveWhatIf)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: copy.workbenchLeaveStay }))
    expect(shellUp()).toBe(true)
    expect(screenShown()).toBe('settings')

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
