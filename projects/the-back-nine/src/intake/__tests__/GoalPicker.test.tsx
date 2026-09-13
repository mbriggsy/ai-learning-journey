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
 *  - the UNSET SENTINEL (burned/062): a first open pre-selects NOTHING and the confirm is BLOCKED —
 *    `aria-disabled` with a rendered, announced reason, never native `disabled` (Card 14a, 2026-09-13;
 *    the BudgetBuilder law) and never a silent default (the planted default-select mutant dies here);
 *  - a RE-pick pre-selects the standing choice and a confirmed pick calls back with the goal;
 *  - the INTRO LEAD IS VERDICT-GATED (`basicsCovered`) — omitted, never reworded, when the verdict
 *    the household just read does not support its premise, and the dialog stays fully usable.
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
/** Card 14a — the blocked confirm's rendered reason (a <span>, never a <p> / .field-help: see the
 *  omitted-lead arm below for why that element choice is itself pinned). */
const blockedReasons = () => Array.from(document.querySelectorAll('.control-sheet__blocked'))
const leaveMore = () => radio(/Leave more behind/)
const payLess = () => radio(/Pay less tax/)

describe('GoalPicker — the dialog + radio grammar', () => {
  it('renders a labelled dialog with ONE radio per canonical goal, each carrying its gloss', () => {
    render(<GoalPicker open basicsCovered current={undefined} onPick={noop} onClose={noop} />)
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

  it('focuses the heading on open (never the input — the phone-keyboard law); Escape closes, AND so does a VISIBLE Close', async () => {
    const onClose = vi.fn()
    // Mount CLOSED then open (the app's real shape — the announcer/focus effects must fire on the
    // open TRANSITION, not only a mounted-open first render).
    const { rerender } = render(
      <GoalPicker open={false} basicsCovered current={undefined} onPick={noop} onClose={onClose} />,
    )
    rerender(<GoalPicker open basicsCovered current={undefined} onPick={noop} onClose={onClose} />)
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument())
    // Focus lands on the heading (tabIndex -1), not a radio.
    expect(screen.getByRole('heading', { name: copy.goalPickerTitle })).toHaveFocus()
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
    // …and a VISIBLE way out, which this sheet did not have until 2026-08-02. Escape and the
    // backdrop always dismissed it, so nobody was trapped — but ON A PHONE there is no Escape key
    // and the only exit was an undiscoverable backdrop tap, while every other sheet in the family
    // pairs its primary with a quiet Close. Asserted through the SAME `copy.leverCancel` handle the
    // family uses, so a reword moves all of them together and this arm cannot go stale against a
    // re-typed literal.
    fireEvent.click(screen.getByRole('button', { name: copy.leverCancel }))
    expect(onClose).toHaveBeenCalledTimes(2)
  })
})

describe('GoalPicker — the UNSET SENTINEL (never a silent default)', () => {
  it('a first open pre-selects NOTHING and the confirm is BLOCKED — operable, so it can say why', () => {
    render(<GoalPicker open basicsCovered current={undefined} onPick={noop} onClose={noop} />)
    // No radio is checked — the choice is genuinely unset (burned/062: never a plausible default).
    expect(screen.getAllByRole('radio').some((r) => (r as HTMLInputElement).checked)).toBe(false)
    // The confirm cannot fire a solve on an un-chosen goal — and it is `aria-disabled`, never native
    // `disabled` (the BudgetBuilder law), so it stays focusable and pressable to SPEAK the reason.
    // jest-dom's `toBeDisabled` reads the native property only, which is exactly why the pair below
    // is the pin and a bare `toBeEnabled` never could be (it passes on any element without the property).
    expect(confirmBtn()).toHaveAttribute('aria-disabled', 'true')
    expect(confirmBtn()).not.toBeDisabled()
  })

  it('the confirm CTA carries a channel beyond tint until a pick, and the state flips on pick (F-D)', () => {
    render(<GoalPicker open basicsCovered current={undefined} onPick={noop} onClose={noop} />)
    // Unpicked: `aria-disabled` drives the shipped blocked treatment — the control-sheet rule drops the
    // FILL (paper + a dashed hairline + muted ink), and the reason renders beside it. Opacity alone was
    // the defect Card 14a closed. jsdom loads no stylesheets, so the LOOK is pinned in Chromium
    // (the real-browser look) and the STATE is pinned here.
    expect(confirmBtn()).toHaveAttribute('aria-disabled', 'true')
    expect(confirmBtn()).not.toBeDisabled()
    fireEvent.click(payLess())
    // Picking a goal flips the state — the CTA regains its fill and its press affordance.
    expect(confirmBtn()).toHaveAttribute('aria-disabled', 'false')
  })

  it('picking a goal enables the confirm, and confirming reports THAT goal', () => {
    const onPick = vi.fn()
    render(<GoalPicker open basicsCovered current={undefined} onPick={onPick} onClose={noop} />)
    fireEvent.click(payLess())
    expect((payLess() as HTMLInputElement).checked).toBe(true)
    expect(confirmBtn()).toHaveAttribute('aria-disabled', 'false')
    fireEvent.click(confirmBtn())
    expect(onPick).toHaveBeenCalledTimes(1)
    expect(onPick).toHaveBeenCalledWith('pay-less-tax')
  })

  it('a confirm without a pick never dispatches — the handler’s own guard refuses it, now that the click reaches it', () => {
    const onPick = vi.fn()
    render(<GoalPicker open basicsCovered current={undefined} onPick={onPick} onClose={noop} />)
    // aria-disabled is advisory: the click REACHES confirm(), and the guard — not the DOM — refuses it.
    fireEvent.click(confirmBtn())
    expect(onPick).not.toHaveBeenCalled()
  })
})

describe('GoalPicker — the blocked confirm (aria-disabled + the rendered reason; Card 14a)', () => {
  it('is aria-disabled and STILL OPERABLE — never a native disabled (the BudgetBuilder law)', () => {
    render(<GoalPicker open basicsCovered current={undefined} onPick={noop} onClose={noop} />)
    expect(confirmBtn()).toHaveAttribute('aria-disabled', 'true')
    expect(confirmBtn()).not.toBeDisabled()
  })

  it('renders the reason at rest — a <span>, not a <p>, and the CTA points at it', () => {
    render(<GoalPicker open basicsCovered current={undefined} onPick={noop} onClose={noop} />)
    const r = blockedReasons()
    expect(r).toHaveLength(1)
    expect(r[0]!.tagName).toBe('SPAN')
    expect(r[0]!.textContent).toBe(copy.goalPickerConfirmBlocked)
    expect(r[0]!.classList.contains('field-help')).toBe(false)
    expect(r[0]!.closest('p')).toBeNull()
    expect(r[0]!.id).not.toBe('')
    expect(confirmBtn()).toHaveAttribute('aria-describedby', r[0]!.id)
  })

  it('a blocked press dispatches NOTHING and SPEAKS the reason through the sheet live region', async () => {
    const onPick = vi.fn()
    const onClose = vi.fn()
    // Mount CLOSED then open — the announcer binds by ControlSheet's CALLBACK ref on the open
    // transition (insight 060), which is the app's real shape.
    const { rerender } = render(
      <GoalPicker open={false} basicsCovered current={undefined} onPick={onPick} onClose={onClose} />,
    )
    rerender(<GoalPicker open basicsCovered current={undefined} onPick={onPick} onClose={onClose} />)
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument())
    fireEvent.click(confirmBtn())
    expect(onPick).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
    // The control-sheet family's live region (rothLever / sequencingControl read the same node).
    expect(document.querySelector('.control-sheet .sr-only[role="status"]')!.textContent).toBe(
      copy.goalPickerConfirmBlocked,
    )
  })

  it('a pick clears the block: the attribute flips, the reason is gone, and the confirm dispatches', () => {
    const onPick = vi.fn()
    render(<GoalPicker open basicsCovered current={undefined} onPick={onPick} onClose={noop} />)
    fireEvent.click(payLess())
    expect(confirmBtn()).toHaveAttribute('aria-disabled', 'false')
    expect(blockedReasons()).toHaveLength(0)
    expect(confirmBtn()).not.toHaveAttribute('aria-describedby')
    fireEvent.click(confirmBtn())
    expect(onPick).toHaveBeenCalledWith('pay-less-tax')
  })

  it('the way out is still ONE tap while the primary is blocked (R8’s never-a-gate)', () => {
    const onClose = vi.fn()
    render(<GoalPicker open basicsCovered current={undefined} onPick={noop} onClose={onClose} />)
    // Green before and after — the non-vacuity arm for the sibling pins above.
    fireEvent.click(screen.getByRole('button', { name: copy.leverCancel }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})

describe('GoalPicker — the RE-pick (the standing choice, a new dispatch)', () => {
  it('re-opening pre-selects the standing goal (a re-pick is not the unset sentinel)', () => {
    render(<GoalPicker open basicsCovered current={'leave-more'} onPick={noop} onClose={noop} />)
    expect((leaveMore() as HTMLInputElement).checked).toBe(true)
    expect(confirmBtn()).toHaveAttribute('aria-disabled', 'false')
  })

  it('a re-pick reports the DIFFERENT goal (the visible re-solve trigger)', () => {
    const onPick = vi.fn()
    render(<GoalPicker open basicsCovered current={'leave-more'} onPick={onPick} onClose={noop} />)
    fireEvent.click(payLess())
    fireEvent.click(confirmBtn())
    expect(onPick).toHaveBeenCalledWith('pay-less-tax')
  })
})

describe('GoalPicker — the lead is verdict-gated', () => {
  it('renders the intro only when the household’s verdict supports its premise', () => {
    render(<GoalPicker open basicsCovered current={undefined} onPick={noop} onClose={noop} />)
    expect(screen.getByText(copy.goalPickerIntro)).toBeInTheDocument()
    cleanup()
    // The already-failing cohort: the lead would assert what the verdict one tap above just denied,
    // so it is OMITTED — the dialog stays fully usable without it (title, both radios, the confirm).
    render(
      <GoalPicker open basicsCovered={false} current={undefined} onPick={noop} onClose={noop} />,
    )
    expect(screen.queryByText(copy.goalPickerIntro)).not.toBeInTheDocument()
    // …and NOTHING stands in its place. The absence of that ONE key is not the contract —
    // "OMITTED, never swapped" is: silence is the only wording true on every cohort until the
    // failing-cohort lead is authored, and those words are Briggsy's (GoalPicker.tsx's
    // `basicsCovered` docblock). So the oracle is SILENCE, measured structurally rather than by
    // naming the one key a swap would replace: GoalPicker.tsx:103 is the picker's ONLY `<p>` AND
    // its ONLY `.field-help`, and the ControlSheet scaffold contributes neither — so a substituted
    // lead in either shape reds HERE while the `queryByText` above stays green.
    // CARD 14a RECONCILIATION: the blocked confirm's reason renders on EVERY cohort, this one included,
    // and it is deliberately a <span class="control-sheet__blocked"> — so the two counts below stay green
    // AND stay meaningful: GoalPicker.tsx's lead is still the picker's ONLY `<p>` and ONLY `.field-help`.
    // The distinction is principled, not a dodge: the omitted-lead law reserves words about the
    // HOUSEHOLD'S VERDICT to Briggsy; this sentence is about the dialog's own control and is true on all
    // five OutcomeStates. The positive arm below makes that a PINNED decision — a lead smuggled into the
    // span reds here.
    const failingDialog = screen.getByRole('dialog')
    expect(failingDialog.querySelectorAll('p'), 'no prose lead at all').toHaveLength(0)
    expect(failingDialog.querySelectorAll('.field-help'), 'nothing wearing the lead class').toHaveLength(0)
    const reason = failingDialog.querySelectorAll('.control-sheet__blocked')
    expect(reason, 'the CONTROL’s precondition still speaks on the cohort whose LEAD is omitted').toHaveLength(1)
    expect(reason[0]!.textContent).toBe(copy.goalPickerConfirmBlocked)
    expect(screen.getByRole('heading', { name: copy.goalPickerTitle })).toBeInTheDocument()
    expect(screen.getAllByRole('radio')).toHaveLength(RECOMMENDATION_GOALS.length)
    expect(confirmBtn()).toBeInTheDocument()
  })
})
