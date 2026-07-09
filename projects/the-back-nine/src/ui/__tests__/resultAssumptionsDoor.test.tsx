// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { Result } from '../Result'
import { appModel } from '../appModel'
import { resolvedFocusKey } from '../answerView'
import { copy } from '@ui/copy'
import type { MemoryModelSnapshot } from '@store/memoryModel'

/*
 * The U12 Assumptions door + its Result wiring (P3·U12 · C1; F4 — the door takes the Review
 * door's quiet-row seat, the guided re-walk moves inside the panel).
 *
 * THE GATING LAW UNDER TEST (3-controls.md:243 — this door gates DIFFERENTLY from its four
 * siblings, deliberately): it renders when NOT computing AND (a resolved reading exists OR
 * the answer is the post-first-resolve `inputs-incomplete` demotion OR the post-first-resolve
 * fallback/error arms) — the escape hatch must stay reachable exactly where every other door
 * vanishes, because editing inputs is the way BACK from those states. The
 * hatch-reachable-while-incomplete pin is the spec's planted-fail case: gate the door on
 * focusKey alone and the inputs-incomplete arm here goes RED (mutant run at build:
 * `focusKey !== undefined` alone → this file failed → reverted).
 *
 * THE RECOMPUTE CADENCE (the ratified F6 policy): a panel edit commits ONE atomic
 * appModel.update, then SPINE → recompute('final') ONLY (the spine's tiers are byte-identical
 * — a provisional is pure waste); DATE route → provisional then final, awaited sequentially.
 *
 * Harness: the resultControlDoors.test precedent — the module appModel is real (drafts reset
 * per test), `resolvedFocusKey` is module-mocked to plant a resolved reading, and
 * `appModel.getSnapshot`/`recompute` are spied where a test needs a committed answer state /
 * a tier record without standing up the engine worker.
 */

vi.mock('../answerView', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../answerView')>()
  return { ...actual, resolvedFocusKey: vi.fn(actual.resolvedFocusKey) }
})

vi.stubGlobal(
  'matchMedia',
  (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList,
)

const mockFocusKey = vi.mocked(resolvedFocusKey)
const pristineDraft = appModel.getSnapshot().draft

afterEach(() => {
  cleanup()
  appModel.update(() => pristineDraft) // the module singleton must not leak between tests
  mockFocusKey.mockReset()
  vi.restoreAllMocks()
  document.documentElement.classList.remove('control-sheet-open')
})

const renderResult = () =>
  render(<Result onReview={vi.fn()} save={{ kind: 'none' }} computing={false} />)
const plantResolved = () => mockFocusKey.mockReturnValue('planted-focus-key')
const door = () => screen.queryByRole('button', { name: copy.assumptionDoorCta })

/** Plant a committed post-first-resolve answer state on the real snapshot shape (the door
 *  gate reads `snapshot.answer.kind`; the draft stays the pristine one). */
const plantAnswer = (answer: MemoryModelSnapshot['answer']) => {
  const real = appModel.getSnapshot()
  vi.spyOn(appModel, 'getSnapshot').mockReturnValue({ ...real, answer })
}

describe('the Assumptions door — the seat swap + the hatch gate', () => {
  it('renders on a RESOLVED reading and opens the panel (the Review seat, re-purposed)', () => {
    plantResolved()
    renderResult()
    expect(door()).toBeInTheDocument()
    fireEvent.click(door()!)
    expect(screen.getByRole('heading', { name: copy.assumptionTitle })).toBeInTheDocument()
  })

  it('the old Review button is GONE from the quiet row; the guided re-walk lives INSIDE the panel (F4)', () => {
    plantResolved()
    const onReview = vi.fn()
    render(<Result onReview={onReview} save={{ kind: 'none' }} computing={false} />)
    // No re-walk affordance on the row itself…
    expect(screen.queryByRole('button', { name: copy.assumptionRewalkCta })).toBeNull()
    // …it is the panel's quiet footer row.
    fireEvent.click(door()!)
    fireEvent.click(screen.getByRole('button', { name: copy.assumptionRewalkCta }))
    expect(onReview).toHaveBeenCalledTimes(1)
  })

  it('HATCH-REACHABLE-WHILE-INCOMPLETE (the planted-fail pin): inputs-incomplete + NO focusKey still offers the door — its siblings are gone exactly there', () => {
    // An entered account (the sequencing door's OWN predicate holds) — so its absence below
    // is provably the focusKey gate, not a missing account.
    appModel.update((d) => ({
      ...d,
      enteredAccounts: [{ ownerIndex: 0, kind: 'traditional-ira', valueToday: 500_000 }],
    }))
    plantAnswer({ kind: 'inputs-incomplete' })
    renderResult() // resolvedFocusKey is NOT planted — no resolved reading exists
    expect(door(), 'the escape hatch survives the demotion').toBeInTheDocument()
    // The sibling doors gate on focusKey and are GONE — the different gate is the point.
    expect(screen.queryByRole('button', { name: copy.leverSequencingCta })).toBeNull()
    expect(screen.queryByRole('button', { name: copy.budgetCta })).toBeNull()
  })

  it('the panel MOUNTS over the fallback strip too (Result-level, outside the hero swap)', () => {
    plantAnswer({ kind: 'inputs-incomplete' })
    renderResult()
    fireEvent.click(door()!)
    const dialog = screen.getByRole('dialog')
    expect(screen.getByRole('heading', { name: copy.assumptionTitle })).toBeInTheDocument()
    // The echo's incomplete arm stands INSIDE the panel (the fallback state, named).
    expect(dialog.textContent).toContain(copy.answerIncomplete)
  })

  it('WITHHELD while computing — the door rides the actions row (the existing law)', () => {
    plantResolved()
    render(<Result onReview={vi.fn()} save={{ kind: 'none' }} computing />)
    expect(door()).toBeNull()
  })

  it('present on compute-error (editing inputs is that failure’s remedy — the old Review affordance must not vanish with the swap)', () => {
    plantAnswer({ kind: 'compute-error', reason: 'engine-unavailable' })
    renderResult()
    expect(door()).toBeInTheDocument()
  })

  it('a via-sheet row routes panel→sheet WITHOUT the panel’s exit stealing focus back out of the new modal (the sheet→sheet focus law)', async () => {
    plantResolved()
    appModel.update((d) => ({
      ...d,
      enteredAccounts: [{ ownerIndex: 0, kind: 'traditional-ira', valueToday: 500_000 }],
    }))
    renderResult()
    // jsdom clicks don't move focus — focus the door for real, as a pointer/keyboard user
    // would have it, so the panel's scaffold captures IT as the restore target.
    door()!.focus()
    fireEvent.click(door()!)
    const panel = screen.getByRole('dialog')
    fireEvent.click(within(panel).getByRole('button', { name: copy.leverSequencingCta }))
    // The sequencing sheet's heading takes focus on open…
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: copy.leverSequencingTitle })).toHaveFocus(),
    )
    // …and KEEPS it after the panel's exit animation completes (the un-guarded restore fired
    // ~200ms later and yanked focus back to the door — the defect this pin holds closed).
    await new Promise((resolve) => setTimeout(resolve, 400))
    expect(document.activeElement?.closest('.control-sheet')).not.toBeNull()
  })

  it('closing a via-panel sheet lands focus on the Assumptions door — never stranded on <body> (the restore fallback, U12 ultramode)', async () => {
    plantResolved()
    appModel.update((d) => ({
      ...d,
      enteredAccounts: [{ ownerIndex: 0, kind: 'traditional-ira', valueToday: 500_000 }],
    }))
    renderResult()
    door()!.focus()
    fireEvent.click(door()!)
    const panel = screen.getByRole('dialog')
    fireEvent.click(within(panel).getByRole('button', { name: copy.leverSequencingCta }))
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: copy.leverSequencingTitle })).toHaveFocus(),
    )
    // Let the panel's exit complete: the sheet's captured restore owner (a node inside the
    // panel — focus lived there when the Edit row was clicked) unmounts WITH the panel.
    await new Promise((resolve) => setTimeout(resolve, 400))
    // Plain-close the sheet. The disconnected owner must fall back to the Assumptions door
    // (the surface the user came through) — the bare isConnected skip left focus on <body>.
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    await waitFor(() => expect(door()).toHaveFocus())
  })
})

describe('the edit → recompute cadence (the ratified F6 policy)', () => {
  it('SPINE route: a committed panel edit recomputes FINAL-ONLY (the tiers are byte-identical — a provisional is waste)', async () => {
    plantResolved()
    const recompute = vi.spyOn(appModel, 'recompute').mockResolvedValue(undefined)
    renderResult()
    fireEvent.click(door()!)
    const input = screen.getByLabelText(copy.assumptionSurvivorRatioLabel)
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: '60' } })
    fireEvent.blur(input)
    await waitFor(() => expect(recompute).toHaveBeenCalled())
    expect(recompute.mock.calls).toEqual([['final']])
    expect(appModel.getSnapshot().draft.survivorSpendingRatio).toBe(0.6) // the atomic commit landed
  })

  it('DATE route: provisional THEN final, sequentially (the recomputeBoth cadence)', async () => {
    plantResolved()
    appModel.update((d) => ({
      ...d,
      people: [
        { ...d.people[0], workStatus: 'working' as const },
        { ...d.people[1], workStatus: 'retired' as const },
      ],
    }))
    const recompute = vi.spyOn(appModel, 'recompute').mockResolvedValue(undefined)
    renderResult()
    fireEvent.click(door()!)
    const input = screen.getByLabelText(copy.assumptionSurvivorRatioLabel)
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: '60' } })
    fireEvent.blur(input)
    await waitFor(() => expect(recompute.mock.calls.length).toBe(2))
    expect(recompute.mock.calls).toEqual([['provisional'], ['final']])
  })
})
