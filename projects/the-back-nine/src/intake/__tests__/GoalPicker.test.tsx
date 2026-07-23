// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { GoalPicker } from '../GoalPicker'
import { copy } from '@ui/copy'
import { RECOMMENDATION_GOALS } from '@shared/model'

/**
 * Act-4 · U16 §S2 — the GoalPicker (the Tier-2 goal choice that PRECEDES the solve).
 *
 * The battery pins the seams this stage owns:
 *  - the ControlSheet focus contract (dialog semantics, heading focus on open, Escape closes);
 *  - real labelled radios derived from the canonical RECOMMENDATION_GOALS array, each with a gloss;
 *  - the UNSET SENTINEL (burned/062): a first open pre-selects NOTHING and the confirm is disabled —
 *    never a silent default (the planted default-select mutant dies here);
 *  - a RE-pick pre-selects the standing choice and a confirmed pick calls back with the goal.
 */

// jsdom has no matchMedia (the sheet's useReducedMotion reads it) — benign stub.
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

afterEach(() => {
  cleanup()
  document.documentElement.classList.remove('control-sheet-open')
})

const noop = () => {}
const radio = (name: RegExp) => screen.getByRole('radio', { name })
const confirmBtn = () => screen.getByRole('button', { name: copy.goalPickerConfirmCta })
const leaveMore = () => radio(/Leave more behind/)
const payLess = () => radio(/Pay less tax/)

describe('GoalPicker — the dialog + radio grammar', () => {
  it('renders a labelled dialog with ONE radio per canonical goal, each carrying its gloss', () => {
    render(<GoalPicker open current={undefined} onPick={noop} onClose={noop} />)
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    // The heading names the dialog (aria-labelledby → the title).
    expect(screen.getByRole('heading', { name: copy.goalPickerTitle })).toBeInTheDocument()
    // Exactly one radio per goal in the canonical array — no more, no fewer (the vocabulary is the
    // ONE source; a goal added to the union must show up here or the copy Record breaks the build).
    expect(screen.getAllByRole('radio')).toHaveLength(RECOMMENDATION_GOALS.length)
    // Each radio's label AND its gloss are reachable text (the option isn't a bare word).
    expect(leaveMore()).toBeInTheDocument()
    expect(screen.getByText(copy.goalLeaveMoreGloss)).toBeInTheDocument()
    expect(payLess()).toBeInTheDocument()
    expect(screen.getByText(copy.goalPayLessTaxGloss)).toBeInTheDocument()
  })

  it('focuses the heading on open (never the input — the phone-keyboard law) and Escape closes', async () => {
    const onClose = vi.fn()
    // Mount CLOSED then open (the app's real shape — the announcer/focus effects must fire on the
    // open TRANSITION, not only a mounted-open first render).
    const { rerender } = render(
      <GoalPicker open={false} current={undefined} onPick={noop} onClose={onClose} />,
    )
    rerender(<GoalPicker open current={undefined} onPick={noop} onClose={onClose} />)
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument())
    // Focus lands on the heading (tabIndex -1), not a radio.
    expect(screen.getByRole('heading', { name: copy.goalPickerTitle })).toHaveFocus()
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})

describe('GoalPicker — the UNSET SENTINEL (never a silent default)', () => {
  it('a first open pre-selects NOTHING and the confirm is DISABLED', () => {
    render(<GoalPicker open current={undefined} onPick={noop} onClose={noop} />)
    // No radio is checked — the choice is genuinely unset (burned/062: never a plausible default).
    expect(screen.getAllByRole('radio').some((r) => (r as HTMLInputElement).checked)).toBe(false)
    // The confirm cannot fire a solve on an un-chosen goal.
    expect(confirmBtn()).toBeDisabled()
  })

  it('the confirm CTA is visibly MUTED until a pick — the disabled state flips to enabled on pick (F-D)', () => {
    render(<GoalPicker open current={undefined} onPick={noop} onClose={noop} />)
    // Unpicked: the native `disabled` state drives the shipped muted treatment (.btn-primary:disabled —
    // opacity, a LIGHTNESS cue, never hue), so a spouse never reads a full-saturation CTA as ready to act.
    expect(confirmBtn()).toBeDisabled()
    fireEvent.click(payLess())
    // Picking a goal flips the state — the CTA regains full saturation and its press affordance.
    expect(confirmBtn()).toBeEnabled()
  })

  it('picking a goal enables the confirm, and confirming reports THAT goal', () => {
    const onPick = vi.fn()
    render(<GoalPicker open current={undefined} onPick={onPick} onClose={noop} />)
    fireEvent.click(payLess())
    expect((payLess() as HTMLInputElement).checked).toBe(true)
    expect(confirmBtn()).toBeEnabled()
    fireEvent.click(confirmBtn())
    expect(onPick).toHaveBeenCalledTimes(1)
    expect(onPick).toHaveBeenCalledWith('pay-less-tax')
  })

  it('a confirm without a pick is inert (disabled — never a defaulted dispatch)', () => {
    const onPick = vi.fn()
    render(<GoalPicker open current={undefined} onPick={onPick} onClose={noop} />)
    fireEvent.click(confirmBtn()) // disabled ⇒ no-op
    expect(onPick).not.toHaveBeenCalled()
  })
})

describe('GoalPicker — the RE-pick (the standing choice, a new dispatch)', () => {
  it('re-opening pre-selects the standing goal (a re-pick is not the unset sentinel)', () => {
    render(<GoalPicker open current={'leave-more'} onPick={noop} onClose={noop} />)
    expect((leaveMore() as HTMLInputElement).checked).toBe(true)
    expect(confirmBtn()).toBeEnabled()
  })

  it('a re-pick reports the DIFFERENT goal (the visible re-solve trigger)', () => {
    const onPick = vi.fn()
    render(<GoalPicker open current={'leave-more'} onPick={onPick} onClose={noop} />)
    fireEvent.click(payLess())
    fireEvent.click(confirmBtn())
    expect(onPick).toHaveBeenCalledWith('pay-less-tax')
  })
})
