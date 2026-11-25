import { describe, expect, it } from 'vitest'
import type { DateOffsetReading, Headline, OutcomeState } from '@shared/model'
import type { ElevatedAnswer } from '../answerView'
import { planClockAnchor } from '../bandAnnotations'
import { copy, slots } from '../copy'
import { ringFace, ringReading } from '../ringReading'
import type { WhatIfReading } from '../workbench/whatIfRun'

/**
 * The ring's one composer (Act 6 · RC3, plan 4.0 "The ring"; insight 089): every centre word through the X-of-10 slots,
 * the ceiling a bound with no second hedge, `indeterminate` no number and no arc, `already-failing` its 0 and an empty
 * arc, the date route's caption the stop year its reading is taken at, and never "10 of 10".
 */

const headline = (outcomeState: OutcomeState, value: number): WhatIfReading => ({
  kind: 'headline',
  headline: { outcomeState, xOfTen: { value, marginToEdge: 0.1 }, stateMarginToEdge: 0.1 } as Headline,
})
const offset = (offsetYears: number, quantizedLowerBound: number, track: 'full' | 'floor' = 'full'): WhatIfReading => ({
  kind: 'offset',
  reading: { offsetYears, quantizedLowerBound, survivalFraction: quantizedLowerBound, clears: quantizedLowerBound >= 0.85 } as DateOffsetReading,
  track,
})

describe('ringFace: one reading, one face', () => {
  it('a count of 7 prints "7 of 10" through the slot and fills a 70% arc, captioned with its outcome word', () => {
    expect(ringFace(headline('borderline', 7))).toEqual({ arc: 7, centre: slots.xOfTen(7), caption: copy.outcomeBorderline })
  })

  it('the over-funded ceiling prints the bound "better than 9 in 10" with no second hedge, and a full-less-one arc', () => {
    const face = ringFace(headline('over-funded', 9))
    expect(face.centre).toBe(slots.xOfTenAtCeiling())
    expect(face.centre).not.toMatch(/about|~/)
    expect(face.arc).toBe(9)
  })

  it('indeterminate prints no number and draws no arc', () => {
    const face = ringFace(headline('indeterminate', 0))
    expect(face.arc).toBeUndefined()
    expect(face.centre).toBeUndefined()
    expect(face.caption).toBe(copy.snapshotRingNoReading)
  })

  it('already-failing prints its 0 and draws an empty arc', () => {
    expect(ringFace(headline('already-failing', 0))).toEqual({ arc: 0, centre: slots.xOfTen(0), caption: copy.outcomeAlreadyFailing })
  })

  it('a date curve entry of 0.86 reads 9, captioned with the stop year from its own offset', () => {
    const face = ringFace(offset(6, 0.86), 2026)
    expect(face).toEqual({ arc: 9, centre: slots.xOfTen(9), caption: slots.snapshotRingStopIn(2032) })
  })

  it('a reading of the essentials-only pass says so under the ring: the floor count never reads as the full budget’s', () => {
    const face = ringFace(offset(7, 0.88, 'floor'), 2026)
    expect(face).toEqual({ arc: 9, centre: slots.xOfTen(9), caption: slots.snapshotRingStopIn(2033), note: copy.snapshotRingEssentialsNote })
    expect(ringFace(offset(7, 0.88), 2026).note, 'the full pass carries no such line').toBeUndefined()
  })

  it('a stop year the plan has passed keeps its count and says the year is past (the odds chart’s own test), on either pass', () => {
    // Built 2020, read in 2026: offset 5 is 2025, passed; offset 6 is 2026, this year, not passed.
    expect(ringFace(offset(5, 0.86), 2020, 6)).toEqual({ arc: 9, centre: slots.xOfTen(9), caption: slots.snapshotRingStoppedIn(2025) })
    expect(ringFace(offset(5, 0.86, 'floor'), 2020, 6)).toMatchObject({ caption: slots.snapshotRingStoppedIn(2025), note: copy.snapshotRingEssentialsNote })
    expect(ringFace(offset(6, 0.86), 2020, 6).caption).toBe(slots.snapshotRingStopIn(2026))
    expect(ringFace(offset(5, 0.86), 2020).caption, 'a fresh plan (clock 0) has passed nothing').toBe(slots.snapshotRingStopIn(2025))
  })

  it('a date curve entry at the ceiling (rung 10) prints the bound, never "10 of 10", and a full-less-one arc', () => {
    const face = ringFace(offset(3, 0.97), 2026)
    expect(face.centre).toBe(slots.xOfTenAtCeiling())
    expect(face.arc).toBe(9)
  })

  it('never prints "10 of 10", across every count and every bound', () => {
    const states: OutcomeState[] = ['over-funded', 'on-track', 'borderline', 'off-track', 'already-failing', 'indeterminate']
    for (const s of states) for (let n = 0; n <= 10; n++) expect(ringFace(headline(s, n)).centre ?? '').not.toContain('10 of 10')
    for (let q = 0; q <= 1; q += 0.01) expect(ringFace(offset(2, q), 2026).centre).not.toContain('10 of 10')
  })
})

describe('ringReading: the ring card over the elevated answer', () => {
  const anchor = planClockAnchor(2026, 2026)
  const noDate = { kind: 'no-date-in-window', nonMonotoneOffsets: [], curve: [] } as const

  it('no date in the window: the no-date words above the ring, and the ring names the window top’s year', () => {
    const elevated = { kind: 'date', view: { kind: 'dates', floor: noDate, lifestyle: noDate, windowTopYears: 10 } } as unknown as ElevatedAnswer
    const snapshot = { answer: { kind: 'date', draft: { startCalendarYear: 2026 } } } as never
    const view = ringReading(elevated, offset(10, 0.6), snapshot, anchor)
    expect(view.kind).toBe('reading')
    if (view.kind !== 'reading') return
    expect(view.lead).toBe(slots.noDateInWindow(10))
    expect(view.face.caption).toBe(slots.snapshotRingStopIn(2036))
    expect(view.face.centre).toBe(slots.xOfTen(6))
  })

  it('a provisional date answer wears the provisional tag; a re-figuring one the re-figuring line instead (one slot)', () => {
    const base = { kind: 'dates', floor: noDate, lifestyle: noDate, windowTopYears: 10 }
    const snapshot = { answer: { kind: 'date', draft: { startCalendarYear: 2026 } } } as never
    const provisional = ringReading({ kind: 'date', view: { ...base, provisional: true } } as unknown as ElevatedAnswer, offset(10, 0.6), snapshot, anchor)
    expect(provisional.kind === 'reading' && provisional.eyebrow).toBe(copy.answerProvisionalTag)
    const refig = ringReading({ kind: 'date', view: { ...base, provisional: true, refiguring: true } } as unknown as ElevatedAnswer, offset(10, 0.6), snapshot, anchor)
    expect(refig.kind === 'reading' && refig.eyebrow).toBe(copy.answerRefiguringVerdict)
  })

  it('pending gives no number; a compute error gives the retry; the fallback gives no figure', () => {
    const snapshot = { answer: { kind: 'pending' } } as never
    expect(ringReading({ kind: 'spine', view: { kind: 'pending' } }, null, snapshot, anchor)).toEqual({ kind: 'pending' })
    const onRetry = () => {}
    expect(ringReading({ kind: 'spine', view: { kind: 'compute-error', onRetry } }, null, snapshot, anchor)).toEqual({ kind: 'compute-error', onRetry })
    expect(ringReading({ kind: 'fallback' }, null, snapshot, anchor)).toEqual({ kind: 'fallback' })
  })
})
