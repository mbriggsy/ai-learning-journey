// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, fireEvent, within } from '@testing-library/react'
import { Result } from '../Result'
import { appModel } from '../appModel'
import { resolvedFocusKey } from '../answerView'
import { copy } from '@ui/copy'
import { resolveDevSeed } from '../devSeeds'

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
