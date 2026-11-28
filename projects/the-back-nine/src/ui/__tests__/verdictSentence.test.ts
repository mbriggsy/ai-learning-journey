/**
 * The spend lane's gate and the three clause forms (council wf_faa1af2d-052), moved out of `spendClause.test.tsx` by
 * Act 6's RC0, unchanged: they assert the pure `verdictSentence.ts`, which outlives the hero (`ROOM_SHOWN`, `unsized`
 * and `sized` are that file's fixtures, copied).
 */
import { describe, expect, it } from 'vitest'
import { slots } from '../copy'
import { composeVerdictReading, reserveClauseFor, spendClauseFor, type VerdictDisplay } from '../verdictSentence'
import { formatSolvedSpend } from '../money'
import type { SpendAnswer } from '@store/memoryModel'
import type { SpendSolveUnsizedReason } from '@engine/spendSolve'

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
  it('trim, SIZED, is his two sentences — never the room sentence’s tail (Briggsy 2026-10-14: the sized form renders only off-track, so "Above that" always spanned the household’s own off-track spend)', () => {
    const sized = slots.verdictTrimSized('6,500', '5,200')
    expect(sized).toBe('Spending less than $6,500 a month would let your plan cover more futures. At about $5,200 a month, it would read on track.')
    expect(sized).not.toMatch(/close to the line|Above that/)
    // the room sentence KEEPS its named edge — the cut is trim-only
    expect(slots.verdictRoomSized('6,500', '7,100')).toContain('Above that, it starts to sit close to the line.')
  })
  it('the verified figure is quoted EXACTLY — an off-grid figure throws rather than quote a spend nobody ran', () => {
    expect(formatSolvedSpend(11_100, 100)).toBe('11,100')
    expect(() => formatSolvedSpend(11_150, 100)).toThrow()
    expect(() => formatSolvedSpend(0, 100)).toThrow()
  })
})

// Gap 4's U15 (R12's repeat half): the clause that quotes the entered spend says, right after it, when it is the first
// year's with a repeat inside it; the reserve carries the same words, so the landed clause never outgrows the box
// (insight 035).
describe('the first-year repeat inside the quoted spend (gap 4’s U15)', () => {
  const car = { name: 'A new car', amount: '40,000', everyYears: 5, more: 0 }
  const words = slots.verdictFirstYear('A new car', '40,000', 5, 0)
  const TRIM_SHOWN: VerdictDisplay = { ...ROOM_SHOWN, outcomeState: 'off-track', direction: 'trim' }

  it('room and trim, on every spend form, name the first year right after "$6,500 a month"; with no repeat the clause is unchanged', () => {
    expect(words).toBe(' in your first year, with “A new car” at $40,000 in it, which comes back every 5 years')
    for (const [shown, spend] of [
      [ROOM_SHOWN, undefined],
      [ROOM_SHOWN, { kind: 'pending' }],
      [ROOM_SHOWN, { kind: 'unsized', reason: 'budget-governed' }],
      [ROOM_SHOWN, { kind: 'unsized', reason: 'within-a-step' }],
      [ROOM_SHOWN, { kind: 'unsized', reason: 'survivor-short' }],
      [ROOM_SHOWN, { kind: 'sized', monthlyReal: 7_100, failedAtMonthlyReal: 7_200 }],
      [TRIM_SHOWN, undefined],
      [TRIM_SHOWN, { kind: 'pending' }],
      [TRIM_SHOWN, { kind: 'sized', monthlyReal: 5_000, failedAtMonthlyReal: 5_100 }],
    ] as const) {
      const plain = composeVerdictReading(shown, spend)!.clause
      const named = composeVerdictReading(shown, spend, car)!.clause
      expect(named, `${shown.direction} ${spend?.kind ?? 'idle'}`).toContain(`$6,500 a month${words}`)
      // Only the words are added: taking them out (with the comma a sentence that runs on after them needs, where it was
      // not already there) gives the clause back.
      expect([named.replace(words, ''), named.replace(`${words},`, '')], `${shown.direction} ${spend?.kind ?? 'idle'}`).toContain(plain)
      expect(composeVerdictReading(shown, spend, null)!.clause).toBe(plain)
    }
  })

  it('the hold and rethink clauses quote no figure, so they carry no first-year words', () => {
    for (const direction of ['on-the-line', 'rethink'] as const) {
      const shown: VerdictDisplay = { ...ROOM_SHOWN, outcomeState: direction === 'rethink' ? 'already-failing' : 'borderline', direction }
      expect(composeVerdictReading(shown, undefined, car)!.clause).toBe(composeVerdictReading(shown)!.clause)
    }
  })

  it('the reserve carries the words too and is never shorter than the landed sized clause', () => {
    const reserve = reserveClauseFor(ROOM_SHOWN, car)!
    expect(reserve).toContain(`$6,500 a month${words}.`)
    const landed = composeVerdictReading(ROOM_SHOWN, { kind: 'sized', monthlyReal: 19_400, failedAtMonthlyReal: 19_500 }, car)!.clause
    expect(reserve.length).toBeGreaterThanOrEqual(landed.length)
    expect(reserveClauseFor(ROOM_SHOWN, null)).toBe(reserveClauseFor(ROOM_SHOWN))
  })
})
