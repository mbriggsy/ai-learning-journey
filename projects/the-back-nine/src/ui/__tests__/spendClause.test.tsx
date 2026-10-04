// @vitest-environment jsdom
/**
 * The spend lane on the sentence (council wf_faa1af2d-052): the gate (`spendClauseFor`), the three
 * clause forms (figure-less / pending lead / sized with the edge named — the figure-less form with
 * room's two variants for an unsized reason that denies room, `within-a-step` and `survivor-short`),
 * the verified figure quoted exactly (never re-rounded), and the clause-only announce when the figure
 * lands under an unchanged verdict.
 */
import { afterEach, describe, expect, it } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { cleanup, render } from '@testing-library/react'
import { ConfidenceStatement } from '../ConfidenceStatement'
import { copy, slots } from '../copy'
import { READING_FIXTURES } from '../preview/fixtures'
import { composeVerdictReading, spendClauseFor, type VerdictDisplay } from '../verdictSentence'
import { formatSolvedSpend } from '../money'
import type { SpendAnswer } from '@store/memoryModel'
import type { SpendSolveUnsizedReason } from '@engine/spendSolve'

afterEach(cleanup)

const ROOM_SHOWN: VerdictDisplay = { xOfTen: 8, outcomeState: 'on-track', spendPerMonthReal: 6_500, direction: 'room' }
const unsized = (reason: SpendSolveUnsizedReason): SpendAnswer => ({ kind: 'resolved', outcome: { kind: 'unsized', reason, probes: 6 } })
const sized = (direction: 'room' | 'trim', monthlyReal: number): SpendAnswer => ({
  kind: 'resolved',
  outcome: { kind: 'sized', direction, monthlyReal, failedAtMonthlyReal: monthlyReal + 100, enteredMonthlyReal: 6_500, probes: 9 },
})

describe('spendClauseFor — the gate between the spend lane and the sentence', () => {
  it('sized rides only when shown ≡ raw state and the direction matches', () => {
    expect(spendClauseFor(sized('room', 7_100), ROOM_SHOWN, 'on-track')).toEqual({ kind: 'sized', monthlyReal: 7_100, failedAtMonthlyReal: 7_200 })
    // the sticky seam holds a previous state for a frame — a figure solved for the raw state must not ride
    expect(spendClauseFor(sized('room', 7_100), ROOM_SHOWN, 'over-funded')).toBeUndefined()
    // a solve for the other direction never sizes this sentence
    expect(spendClauseFor(sized('trim', 5_000), ROOM_SHOWN, 'on-track')).toBeUndefined()
  })
  it('pending rides as pending; an unsized outcome carries its REASON; idle / absent are figure-less; a no-magnitude direction is never sized', () => {
    expect(spendClauseFor({ kind: 'pending' }, ROOM_SHOWN, 'on-track')).toEqual({ kind: 'pending' })
    expect(spendClauseFor({ kind: 'idle' }, ROOM_SHOWN, 'on-track')).toBeUndefined()
    // the register's Tier 0 room sentence: the lane RAN, and why it did not size is the clause's to know
    expect(spendClauseFor({ kind: 'resolved', outcome: { kind: 'unsized', reason: 'non-monotone', probes: 7 } }, ROOM_SHOWN, 'on-track')).toEqual({ kind: 'unsized', reason: 'non-monotone' })
    expect(spendClauseFor(unsized('within-a-step'), ROOM_SHOWN, 'on-track')).toEqual({ kind: 'unsized', reason: 'within-a-step' })
    // …but only for the verdict it was solved for (the held-word seam is unsized with no reason)
    expect(spendClauseFor(unsized('survivor-short'), ROOM_SHOWN, 'over-funded')).toBeUndefined()
    expect(spendClauseFor(undefined, ROOM_SHOWN, 'on-track')).toBeUndefined()
    const hold: VerdictDisplay = { ...ROOM_SHOWN, outcomeState: 'borderline', direction: 'on-the-line' }
    expect(spendClauseFor({ kind: 'pending' }, hold, 'borderline')).toBeUndefined()
  })

  it('a sized outcome the formatter would refuse ($0, or off its own step) is UNSIZED at the gate — render never throws (the ultramode review’s F1)', () => {
    const TRIM_SHOWN: VerdictDisplay = { xOfTen: 1, outcomeState: 'off-track', spendPerMonthReal: 390, direction: 'trim' }
    const at = (monthlyReal: number, failedAtMonthlyReal: number): SpendAnswer => ({
      kind: 'resolved',
      outcome: { kind: 'sized', direction: 'trim', monthlyReal, failedAtMonthlyReal, enteredMonthlyReal: 390, probes: 5 },
    })
    expect(spendClauseFor(at(0, 100), TRIM_SHOWN, 'off-track')).toBeUndefined()
    expect(spendClauseFor(at(150, 250), TRIM_SHOWN, 'off-track')).toBeUndefined()
    expect(() => composeVerdictReading(TRIM_SHOWN, spendClauseFor(at(0, 100), TRIM_SHOWN, 'off-track'))).not.toThrow()
    // …and a well-formed one still rides (the gate is not vacuous).
    expect(spendClauseFor(at(200, 300), TRIM_SHOWN, 'off-track')).toEqual({ kind: 'sized', monthlyReal: 200, failedAtMonthlyReal: 300 })
  })
})

describe('the three clause forms', () => {
  it('room: sized names the verified figure AND the edge; pending is the first sentence alone; unsized keeps the shipped tail', () => {
    expect(composeVerdictReading(ROOM_SHOWN, { kind: 'sized', monthlyReal: 7_100, failedAtMonthlyReal: 7_200 })!.clause).toBe(slots.verdictRoomSized('6,500', '7,100'))
    expect(slots.verdictRoomSized('6,500', '7,100')).toContain('Above that, it starts to sit close to the line.')
    expect(composeVerdictReading(ROOM_SHOWN, { kind: 'pending' })!.clause).toBe(slots.verdictRoomLead('6,500'))
    expect(composeVerdictReading(ROOM_SHOWN)!.clause).toBe(slots.verdictRoomClause('6,500'))
  })
  it('room, UNSIZED FOR A REASON THAT DENIES ROOM (the register’s Tier 0 room sentence): `within-a-step` and `survivor-short` never claim room; every other reason keeps the shipped tail', () => {
    const at = (reason: SpendSolveUnsizedReason) => composeVerdictReading(ROOM_SHOWN, spendClauseFor(unsized(reason), ROOM_SHOWN, 'on-track'))!.clause
    expect(at('within-a-step')).toBe(slots.verdictRoomWithinStep('6,500'))
    expect(at('survivor-short')).toBe(slots.verdictRoomSurvivorShort('6,500'))
    for (const reason of ['within-a-step', 'survivor-short'] as const) {
      expect(at(reason), reason).not.toMatch(/room/i) // the lane RAN and found none to quote — no "room" claim of any size
      expect(at(reason), reason).not.toContain('doesn’t work out how much more') // the lane did work it out
    }
    for (const reason of ['non-monotone', 'unbracketed', 'below-grid'] as const) {
      expect(at(reason), reason).toBe(slots.verdictRoomClause('6,500'))
    }
  })

  it('trim mirrors it', () => {
    const trim: VerdictDisplay = { xOfTen: 1, outcomeState: 'off-track', spendPerMonthReal: 10_000, direction: 'trim' }
    expect(composeVerdictReading(trim, { kind: 'sized', monthlyReal: 6_400, failedAtMonthlyReal: 6_500 })!.clause).toBe(slots.verdictTrimSized('10,000', '6,400'))
    expect(composeVerdictReading(trim, { kind: 'pending' })!.clause).toBe(slots.verdictTrimLead('10,000'))
    expect(composeVerdictReading(trim)!.clause).toBe(slots.verdictTrimClause('10,000'))
  })
  it('the verified figure is quoted EXACTLY — an off-grid figure throws rather than quote a spend nobody ran', () => {
    expect(formatSolvedSpend(11_100, 100)).toBe('11,100')
    expect(() => formatSolvedSpend(11_150, 100)).toThrow()
    expect(() => formatSolvedSpend(0, 100)).toThrow()
  })
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
