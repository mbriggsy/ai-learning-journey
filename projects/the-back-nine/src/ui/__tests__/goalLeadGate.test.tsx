// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, fireEvent, within } from '@testing-library/react'
import type { MemoryModelSnapshot, StickyDisplay } from '@store/memoryModel'
import { OUTCOME_STATES, RECOMMENDATION_GOALS, type OutcomeState } from '@shared/model'

/**
 * Act-4 · U16 §S2 — THE WIRING half of the goal picker's verdict-gated lead.
 *
 * `GoalPicker.test.tsx` owns the COMPONENT half (the prop is honored in both directions). This file
 * owns the only thing that half cannot see: which value `Result.tsx` actually passes. Both halves are
 * needed — a hardcoded `basicsCovered={true}` (or `={false}`) in Result leaves the component battery
 * fully green while shipping exactly the defect: exercising the callee proves the callee, never the
 * call site (the `recSaveNoAutoWrite.test.tsx` precedent, which stands up the real store for the same
 * reason).
 *
 * THE CLAIM: `copy.goalPickerIntro` — "With the basics covered, pick the one thing your plan should
 * lean toward." — is FALSE on a household the strategy door still opens the picker for ("Already
 * short — 0 of 10"). The lead is gated on the sticky DISPLAY triple the verdict sentence itself
 * renders from, as a POSITIVE list, and it is OMITTED rather than reworded when the premise fails —
 * the failing-cohort words are Briggsy's and are not authored yet (docs/backlog.md, "The goal picker
 * tells an already-failing household \"with the basics covered\"").
 *
 * 'borderline' ("On the line") is deliberately a LEAD-RENDERING state: the Caddie killed that premise
 * tension with receipts (docs/caddie/cold-read-log.md, the 2026-07-23 U16 recommend-second walk,
 * Card 1 `solve:nc`), and the table below is the pin that a later sweep cannot quietly re-litigate it.
 *
 * THE TWO PLANTS, and why each is the honest one:
 *  - `resolvedFocusKey` is module-mocked (the recommendInvite.test.tsx precedent) so the invite door
 *    is offered without standing up the engine worker;
 *  - `appModel.getSnapshot` is wrapped around the REAL store to inject the `displayed` triple a
 *    committed spine verdict would have resolved. Nothing else is faked — the door, the picker, and
 *    the gate expression under test are all the shipped ones. The wrapper MEMOIZES: `useSyncExternalStore`
 *    requires a stable snapshot identity between changes, and a fresh object per call re-renders forever.
 */

const planted = vi.hoisted(() => ({ displayed: null as StickyDisplay | null }))

vi.mock('../answerView', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../answerView')>()
  return { ...actual, resolvedFocusKey: vi.fn(actual.resolvedFocusKey) }
})

vi.mock('../appModel', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../appModel')>()
  let lastRaw: MemoryModelSnapshot | undefined
  let lastDisplayed: StickyDisplay | null | undefined
  let cached: MemoryModelSnapshot | undefined
  return {
    appModel: {
      ...actual.appModel,
      getSnapshot: (): MemoryModelSnapshot => {
        const raw = actual.appModel.getSnapshot()
        if (cached === undefined || raw !== lastRaw || planted.displayed !== lastDisplayed) {
          lastRaw = raw
          lastDisplayed = planted.displayed
          cached = { ...raw, displayed: planted.displayed }
        }
        return cached
      },
    },
  }
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

import { Result } from '../Result'
import { resolvedFocusKey } from '../answerView'
import { copy } from '../copy'

const mockFocusKey = vi.mocked(resolvedFocusKey)

afterEach(() => {
  cleanup()
  document.documentElement.classList.remove('control-sheet-open')
  planted.displayed = null
  mockFocusKey.mockReset()
})

/** A committed spine verdict in DISPLAY form — only `outcomeState` is read by the gate; the rest is
 *  the triple's real shape (the sentence's count + $/mo clause), never a partial cast. */
const displayFor = (outcomeState: OutcomeState): StickyDisplay => ({
  xOfTen: 7,
  outcomeState,
  perMonthDollar: 0,
  direction: 'on-the-line',
})

/** Open the picker through the SHIPPED door: the quiet-row invite, on a resolved reading. */
const openPicker = () => {
  mockFocusKey.mockReturnValue('planted-focus-key')
  render(<Result onReview={vi.fn()} save={{ kind: 'none' }} computing={false} />)
  fireEvent.click(screen.getByRole('button', { name: copy.recommendInviteCta }))
  return within(screen.getByRole('dialog'))
}

/** The gate's POSITIVE list, stated once here as the table the arms below drive. A state that is not
 *  listed `true` gets SILENCE — never an inherited claim. */
const LEAD_STATES: readonly (readonly [OutcomeState, boolean])[] = [
  ['on-track', true],
  ['over-funded', true],
  // The Caddie-cleared arm — see the docblock. Flipping this to `false` re-opens a settled call.
  ['borderline', true],
  ['off-track', false],
  ['already-failing', false],
]

describe('the goal picker’s lead is verdict-gated at the wiring', () => {
  for (const [outcomeState, leads] of LEAD_STATES) {
    it(`${leads ? 'renders' : 'omits'} the lead on a '${outcomeState}' verdict`, () => {
      planted.displayed = displayFor(outcomeState)
      const dialog = openPicker()
      if (leads) expect(dialog.getByText(copy.goalPickerIntro)).toBeInTheDocument()
      else expect(dialog.queryByText(copy.goalPickerIntro)).not.toBeInTheDocument()
    })
  }

  it('omits the lead when NO spine verdict stands — and the dialog is still fully usable', () => {
    // `displayed` is null on the indeterminate frame and on the date route / error /
    // inputs-incomplete alike, which is what silences the lead there rather than the door.
    planted.displayed = null
    const dialog = openPicker()
    expect(dialog.queryByText(copy.goalPickerIntro)).not.toBeInTheDocument()
    expect(dialog.getByRole('heading', { name: copy.goalPickerTitle })).toBeInTheDocument()
    expect(dialog.getAllByRole('radio')).toHaveLength(RECOMMENDATION_GOALS.length)
    expect(dialog.getByRole('button', { name: copy.goalPickerConfirmCta })).toBeInTheDocument()
  })

  it('decides EVERY non-indeterminate outcome state (a new state can never inherit the claim)', () => {
    // 'indeterminate' is unreachable in a display triple by construction (memoryModel resolves one
    // only on a non-indeterminate spine headline), so the table owns the other five — and a sixth
    // state added to the engine's union reds HERE until someone decides which way it reads.
    expect([...LEAD_STATES.map(([s]) => s)].sort()).toEqual(
      OUTCOME_STATES.filter((s) => s !== 'indeterminate')
        .slice()
        .sort(),
    )
  })
})
