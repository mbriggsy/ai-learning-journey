// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { Result } from '../Result'
import { appModel } from '../appModel'
import { resolvedFocusKey } from '../answerView'
import { copy, slots } from '@ui/copy'
import { missingRequiredFacts } from '@intake/intakeMap'
import { DEV_SEEDS } from '../devSeeds'
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

  it('THE COMPLETED-INTAKE DEAD END (2026-08-20 walk): idle + a missing required fact + NOT computing offers the door — its siblings are gone (planted-fail: drop the idle arm → red)', () => {
    // The pristine draft has every required fact missing and NO answer was ever planted: this is
    // the frame a household lands on after finishing intake with one gated fact blank — the strip
    // says "Still needed: …" and, until 2026-09-03, the page had ZERO interactive elements.
    renderResult()
    expect(door(), 'the escape hatch is the only way to supply the missing fact').toBeInTheDocument()
    expect(screen.queryByRole('button', { name: copy.leverSequencingCta })).toBeNull()
    expect(screen.queryByRole('button', { name: copy.budgetCta })).toBeNull()
  })

  it('…and when the repair remounts the actions row while the panel is open, Close lands focus on the NEW door, never <body> (planted-fail: drop the panel’s restoreFallback → red)', async () => {
    // Supplying the missing fact from a panel row flips IntakeApp's `computing` for one beat
    // (idle with nothing missing → pending): the actions row unmounts and remounts, so the door
    // element the sheet captured at open is disconnected by close time. Simulated here through
    // the `computing` prop, which is the exact lever that unmounts the row.
    const view = render(<Result onReview={vi.fn()} save={{ kind: 'none' }} computing={false} />)
    const opener = door()!
    opener.focus()
    fireEvent.click(opener)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    view.rerender(<Result onReview={vi.fn()} save={{ kind: 'none' }} computing />)
    expect(opener.isConnected, 'the captured door unmounted with the row').toBe(false)
    view.rerender(<Result onReview={vi.fn()} save={{ kind: 'none' }} computing={false} />)
    const reborn = door()!
    expect(reborn).not.toBe(opener)
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: copy.leverCancel }))
    await waitFor(() => expect(document.activeElement).toBe(reborn))
  })

  it('an UNREPRESENTABLE-only dead end (?seed=datesolo — the retiree buys their own pre-65 coverage while the other works) reads as the strip’s WITHHOLD, never as "Still needed" (the review’s P1: nothing typed can clear it)', () => {
    appModel.update(() => DEV_SEEDS.datesolo)
    const facts = missingRequiredFacts(appModel.getSnapshot().draft)
    expect(facts.map((f) => f.labelKey)).toEqual(['employerCoverageUnpriced'])
    expect(facts[0]!.kind).toBe('unrepresentable')
    renderResult()
    fireEvent.click(door()!)
    const text = screen.getByRole('dialog').textContent ?? ''
    expect(text).toContain(copy.answerWithheldLead)
    expect(text).toContain(copy.answerCannotPrice)
    expect(text).toContain(copy.employerCoverageUnpriced)
    expect(text).toContain(copy.answerCannotPriceTail)
    expect(text).not.toContain(copy.answerStillNeeded)
    expect(text).not.toContain(copy.answerIncomplete)
  })

  it('a MIXED household (facts still to enter AND two HSAs) keeps BOTH blocks — an unentered fact never lands under "nothing here for you to add"', () => {
    appModel.update((d) => ({
      ...d,
      enteredAccounts: [
        { ownerIndex: 0, kind: 'hsa', valueToday: 50_000, manualBlend: { kind: 'exact', stockPct: 60, bondPct: 30, cashPct: 10 } },
        { ownerIndex: 1, kind: 'hsa', valueToday: 40_000, manualBlend: { kind: 'exact', stockPct: 60, bondPct: 30, cashPct: 10 } },
      ],
    }))
    const facts = missingRequiredFacts(appModel.getSnapshot().draft)
    expect(facts.some((f) => f.kind === 'unrepresentable')).toBe(true)
    expect(facts.some((f) => (f.kind ?? 'absent') === 'absent')).toBe(true)
    renderResult()
    fireEvent.click(door()!)
    const text = screen.getByRole('dialog').textContent ?? ''
    expect(text).toContain(copy.answerIncomplete) // keep-going lead: there IS something left to enter
    expect(text).toContain(copy.answerStillNeeded)
    expect(text).toContain(copy.answerCannotPrice)
    expect(text).toContain(copy.kindHsaBothSpouses)
  })

  it('while the repair compute runs (pending) the echo speaks the strip’s working line, never the quiet "edits flow into your answer"', () => {
    // Open on the dead-end frame, then the repair's compute begins: the answer flips to pending and
    // IntakeApp's `computing` withholds the row — the panel (Result-level) stays open through it.
    const view = render(<Result onReview={vi.fn()} save={{ kind: 'none' }} computing={false} />)
    fireEvent.click(door()!)
    plantAnswer({ kind: 'pending' })
    view.rerender(<Result onReview={vi.fn()} save={{ kind: 'none' }} computing />)
    const text = screen.getByRole('dialog').textContent ?? ''
    expect(text).toContain(copy.answerPending)
    expect(text).not.toContain(copy.assumptionEchoQuiet)
  })

  it('…and the aria-modal echo NAMES the missing facts there, never the quiet "edits flow into your answer" line (planted-fail: drop the echo arm → red)', () => {
    renderResult()
    fireEvent.click(door()!)
    const dialog = screen.getByRole('dialog')
    expect(dialog.textContent).toContain(copy.answerIncomplete)
    expect(dialog.textContent).toContain(copy.answerStillNeeded)
    // The overflow reads as one more fact in the SAME list — the strip's middot, not a bare space.
    const names = [...new Set(missingRequiredFacts(appModel.getSnapshot().draft).map((m) => copy[m.labelKey]))]
    expect(names.length).toBeGreaterThan(3)
    expect(dialog.textContent).toContain(` · ${slots.factsMore(names.length - 3)}`)
    expect(dialog.textContent).not.toContain(copy.assumptionEchoQuiet)
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
