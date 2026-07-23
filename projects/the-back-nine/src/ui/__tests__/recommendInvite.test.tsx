// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, fireEvent, within } from '@testing-library/react'
import { Result } from '../Result'
import { appModel } from '../appModel'
import { resolvedFocusKey } from '../answerView'
import { copy } from '@ui/copy'
import { resolveDevSeed } from '../devSeeds'
import type { SolveAnswer } from '@store/memoryModel'

// U16 §S1 — the solve builder is now WIRED live into appModel. A goal pick therefore reaches the REAL
// dispatchSolve, so these picks run over a COMPLETE retired draft (a resolvable devSeed) rather than
// the pristine/empty one: the request builds, but no spine beat has committed (recommend-second
// ordering — everResolved false), so the solve stays `idle` (invitable, the affordance persists across
// re-picks) instead of the `blocked{buckets-defaulted}` an unbuildable empty draft would yield.
const completeRetired = () => ({ ...resolveDevSeed('fl')!, chosenGoal: undefined })

/**
 * Act-4 · U16 §S2 — the recommend-second INVITED AFFORDANCE + its wiring (Result.tsx).
 *
 * The battery pins:
 *  - the affordance is a calm quiet-row DOOR (in the sanctioned below-fold region), offered on a
 *    resolved reading, rendered STATICALLY — present immediately, no scroll-entrance / pulse (R11;
 *    the planted entrance/pulse mutant dies here);
 *  - activating it opens the GoalPicker FIRST (the goal precedes the solve);
 *  - a confirmed pick writes `chosenGoal` (in-session — no auto-save) and dispatches the solve;
 *  - a RE-pick writes the new goal and re-dispatches (the visible re-solve — request-epoch).
 *
 * resolvedFocusKey is module-mocked (the resultControlDoors precedent) so a resolved reading can be
 * planted without standing up the engine worker.
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
})

const renderResult = () => render(<Result onReview={vi.fn()} save={{ kind: 'none' }} computing={false} />)
const plantResolved = () => mockFocusKey.mockReturnValue('planted-focus-key')
const invite = () => screen.queryByRole('button', { name: copy.recommendInviteCta })
/** F-B — the STALE card's IN-CARD re-open control (its own control home; the door-row invite is retired
 *  for `stale`). Queried by its own copy, so a stale channel never depends on the door-row invite. */
const staleReopen = () => screen.queryByRole('button', { name: copy.recommendStaleReopenCta })

describe('the recommend-second invited affordance', () => {
  it('is offered as a quiet-row door on a resolved reading, STATIC (present immediately, no entrance)', () => {
    plantResolved()
    const { container } = renderResult()
    const btn = invite()
    expect(btn).toBeInTheDocument()
    // It lives in the sanctioned below-fold doors region (so spine content stays frame-protected).
    expect(container.querySelector('.result-quiet-row')?.contains(btn!)).toBe(true)
    // STATIC: exactly the calm door classes — no pulse / entrance modifier, no scroll-reveal gate
    // (R11 — invited, never engagement bait). The planted entrance/pulse mutant changes this string.
    expect(btn!.className).toBe('btn-quiet result-recommend-invite')
  })

  it('is ABSENT with no resolved reading (an affordance we don’t want used on a non-answer)', () => {
    renderResult() // focusKey undefined (the real gate over the empty model)
    expect(invite()).toBeNull()
  })

  it('activating it opens the GoalPicker FIRST (the goal precedes the solve)', () => {
    plantResolved()
    renderResult()
    expect(screen.queryByRole('dialog')).toBeNull()
    fireEvent.click(invite()!)
    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeInTheDocument()
    expect(within(dialog).getByRole('heading', { name: copy.goalPickerTitle })).toBeInTheDocument()
  })

  it('a confirmed pick writes chosenGoal in-session AND dispatches the solve (no auto-save)', () => {
    plantResolved()
    appModel.update(completeRetired) // a buildable draft ⇒ the pick's dispatch stays idle (no spine beat)
    const dispatch = vi.spyOn(appModel, 'dispatchSolve')
    renderResult()
    expect(appModel.getSnapshot().draft.chosenGoal).toBeUndefined()
    fireEvent.click(invite()!)
    const dialog = screen.getByRole('dialog')
    fireEvent.click(within(dialog).getByRole('radio', { name: /Pay less tax/ }))
    fireEvent.click(within(dialog).getByRole('button', { name: copy.goalPickerConfirmCta }))
    expect(appModel.getSnapshot().draft.chosenGoal).toBe('pay-less-tax')
    expect(dispatch).toHaveBeenCalledTimes(1)
  })

  it('a RE-pick writes the new goal and re-dispatches (the visible re-solve)', () => {
    plantResolved()
    appModel.update(completeRetired) // buildable ⇒ the solve stays idle-invitable, so the affordance persists across re-picks
    const dispatch = vi.spyOn(appModel, 'dispatchSolve')
    renderResult()
    // First pick: leave-more.
    fireEvent.click(invite()!)
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('radio', { name: /Leave more behind/ }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: copy.goalPickerConfirmCta }))
    expect(appModel.getSnapshot().draft.chosenGoal).toBe('leave-more')
    // Re-pick: the picker re-opens with the standing choice, a different goal re-dispatches.
    fireEvent.click(invite()!)
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('radio', { name: /Pay less tax/ }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: copy.goalPickerConfirmCta }))
    expect(appModel.getSnapshot().draft.chosenGoal).toBe('pay-less-tax')
    expect(dispatch).toHaveBeenCalledTimes(2)
  })
})

/**
 * F2 — the re-open control is REAL from a stale / compute-error channel (the notes promise "re-open", so
 * the control that fulfils that promise must exist). F-B (U16 chair fix) splits the two homes: the STALE
 * channel carries its re-open control INSIDE the stale card (`.rec-note--stale`, NOT the door-row invite);
 * the compute-error channel still uses the door-row invite. F4 — the whole recommend-second surface is
 * ROUTE-GATED to the all-retired route (a route flip must not strand an orphaned rec note in the date
 * hero). The solve channel is planted by spying getSnapshot (the store's stale/error/committed arms need
 * the worker to reach organically); the draft rides the same snapshot so the route predicate reads it.
 */
const staleSolve: SolveAnswer = { kind: 'stale', label: 'inputs-changed' }
const errorSolve: SolveAnswer = { kind: 'compute-error', reason: 'worker died' }
/** Freeze a snapshot with a chosen solve + route. Reads the REAL base first (before the spy), then
 *  overrides draft + solve; a working person on person 0 makes it the date route. */
const plantSnapshot = (solve: SolveAnswer, dateRoute = false) => {
  const retired = completeRetired()
  // A working person 0 makes it the date route (isDateRoute reads workStatus). Rebuilding the people
  // tuple widens it to an array, so the assembled draft is cast back to the retired draft type (test-only).
  const draft = dateRoute
    ? ({
        ...retired,
        people: [{ ...retired.people[0], workStatus: 'working' as const }, retired.people[1]],
      } as unknown as typeof retired)
    : retired
  const wasMocked = vi.isMockFunction(appModel.getSnapshot)
  const base = appModel.getSnapshot() // real pristine on the first plant; the frozen one on a re-plant
  const snap = { ...base, draft, solve }
  if (wasMocked) vi.mocked(appModel.getSnapshot).mockReturnValue(snap)
  else vi.spyOn(appModel, 'getSnapshot').mockReturnValue(snap)
  return snap
}

describe('the recommend-second RE-invite (F2 stale/compute-error) + the date-route gate (F4)', () => {
  it('F-B: from STALE, the re-open control is INSIDE the stale card — NOT the door-row invite (ONE control home)', () => {
    plantResolved()
    plantSnapshot(staleSolve)
    const { container } = renderResult()
    const card = container.querySelector('.rec-note--stale')
    expect(card?.textContent, 'the stale card renders its heading + body').toContain(copy.recommendStaleBody)
    // The promise and its action share ONE home: the control lives INSIDE the stale card…
    const reopen = staleReopen()
    expect(reopen, 'the in-card re-open control the card promises is REAL').toBeInTheDocument()
    expect(card?.contains(reopen!), 'and it lives INSIDE the stale card, not the doors region').toBe(true)
    // …and the door-row invite is RETIRED for the stale channel (no second control for the same promise).
    expect(invite(), 'no prepended door-row invite in the stale state').toBeNull()
  })

  it('F2: from COMPUTE-ERROR, the re-invite returns alongside the unavailable note (door-row invite kept)', () => {
    plantResolved()
    plantSnapshot(errorSolve)
    const { container } = renderResult()
    expect(container.querySelector('.rec-note--unavailable')?.textContent).toContain(copy.recommendUnavailable)
    expect(invite(), 'compute-error keeps the door-row invite (untouched by F-B)').toBeInTheDocument()
  })

  it('F-B: a pick from the STALE card RE-DISPATCHES (the in-card control opens the picker → the visible re-solve)', () => {
    plantResolved()
    appModel.update(completeRetired) // a buildable real draft so the dispatch runs cleanly
    plantSnapshot(staleSolve)
    const dispatch = vi.spyOn(appModel, 'dispatchSolve')
    renderResult()
    fireEvent.click(staleReopen()!)
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('radio', { name: /Pay less tax/ }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: copy.goalPickerConfirmCta }))
    expect(dispatch, 'a fresh solve is dispatched from the stale card').toHaveBeenCalledTimes(1)
  })

  it('F4: the recommend-second surface is ABSENT on the date route (no orphaned stale card); a flip back re-mounts it', () => {
    plantResolved()
    const spy = vi.spyOn(appModel, 'getSnapshot')
    // Committed-then-route-flipped: the store still holds the stale beat, but the household is now a
    // date route — the surface must not render it inside the date hero.
    plantSnapshot(staleSolve, /* dateRoute */ true)
    const { container, rerender } = renderResult()
    expect(container.querySelector('.recommendation-surface'), 'the whole surface is gated out on the date route').toBeNull()
    expect(container.querySelector('.rec-note--stale'), 'no orphaned stale card in the date hero').toBeNull()
    expect(staleReopen(), 'and no in-card re-open control on the date route').toBeNull()
    // Flip back to the all-retired (spine) route: the stale card + its in-card re-open control return.
    plantSnapshot(staleSolve, /* dateRoute */ false)
    rerender(<Result onReview={vi.fn()} save={{ kind: 'none' }} computing={false} />)
    expect(container.querySelector('.rec-note--stale'), 'the stale card renders on the spine route').not.toBeNull()
    expect(staleReopen(), 'the in-card re-open control returns').toBeInTheDocument()
    void spy
  })
})
