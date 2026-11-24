// @vitest-environment jsdom
/**
 * The spend lane on the sentence (council wf_faa1af2d-052): the gate (`spendClauseFor`), the three
 * clause forms (figure-less / pending lead / sized, room's with its edge named and trim's with none
 * since Briggsy's 2026-10-14 cut — the figure-less form with room's two variants for an unsized
 * reason that denies room, `within-a-step` and `survivor-short`), the verified figure quoted exactly
 * (never re-rounded), and the clause-only announce when the figure lands under an unchanged verdict.
 * Since Act 6's RC0 the gate's and the clause forms' arms live in `verdictSentence.test.ts` (they assert the pure
 * composer, which outlives this hero); this file keeps the hero's announce.
 */
import { afterEach, describe, expect, it } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { cleanup, render } from '@testing-library/react'
import { ConfidenceStatement } from '../ConfidenceStatement'
import { copy, slots } from '../copy'
import { READING_FIXTURES } from '../preview/fixtures'
import type { SpendAnswer } from '@store/memoryModel'

afterEach(cleanup)

const sized = (direction: 'room' | 'trim', monthlyReal: number): SpendAnswer => ({
  kind: 'resolved',
  outcome: { kind: 'sized', direction, monthlyReal, failedAtMonthlyReal: monthlyReal + 100, enteredMonthlyReal: 6_500, probes: 9 },
})

describe('the hero: the figure landing under an unchanged verdict', () => {
  const view = (spend?: SpendAnswer) => ({ kind: 'reading' as const, ...READING_FIXTURES['on-track'], ...(spend ? { spend } : {}) })
  const live = (c: HTMLElement) => c.querySelector('.confidence > .sr-only[role="status"]')!

  it('pending → sized: the clause re-keys and ANNOUNCES ITSELF ALONE; the word + count lines are not re-keyed', () => {
    const { container, rerender } = render(<ConfidenceStatement view={view({ kind: 'pending' })} />)
    const pending = container.querySelector('.cs-magnitude')!
    expect(pending).toHaveAttribute('data-spend', 'pending')
    expect(pending.querySelector('.cs-magnitude__line:not(.cs-magnitude__reserve)')!.textContent).toBe(slots.verdictRoomLead('6,500'))
    // the reserve holds the WIDEST sized form's height — invisible AND out of the a11y tree
    const reserve = pending.querySelector('.cs-magnitude__reserve')!
    expect(reserve).toHaveAttribute('aria-hidden', 'true')
    expect(reserve.textContent).toBe(slots.verdictRoomSized('6,500', '19,500'))
    const wordBefore = container.querySelector('.cs-word__text')
    const readingBefore = container.querySelector('.cs-reading')
    rerender(<ConfidenceStatement view={view(sized('room', 7_100))} />)
    expect(container.querySelector('.cs-magnitude')!.textContent).toBe(slots.verdictRoomSized('6,500', '7,100'))
    expect(container.querySelector('.cs-magnitude')).toHaveAttribute('data-spend', 'sized')
    expect(container.querySelector('.cs-magnitude__reserve')).toBeNull() // the reserve leaves with the pending state
    expect(live(container).textContent).toBe(slots.verdictRoomSized('6,500', '7,100')) // the clause, not the verdict
    expect(container.querySelector('.cs-word__text')).toBe(wordBefore) // same node — never remounted
    expect(container.querySelector('.cs-reading')).toBe(readingBefore)
    expect(container.textContent).toContain(copy.outcomeOnTrack)
  })
})
