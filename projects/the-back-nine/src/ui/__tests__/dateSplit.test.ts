import { describe, it, expect } from 'vitest'
import type { DateOffsetReading, DateTrackOutcome } from '@shared/model'
import { composeDateSplit, isFloorLifestyleInverted } from '../dateSplit'

const curveRow = (offsetYears: number, quantizedLowerBound: number): DateOffsetReading => ({
  offsetYears,
  survivalFraction: quantizedLowerBound + 0.02,
  quantizedLowerBound,
  clears: quantizedLowerBound >= 0.85,
})

const datedTrack = (
  offsetYears: number,
  qlb = 0.9,
  kind: 'confirmed-date' | 'window-edge-unconfirmed' = 'confirmed-date',
): DateTrackOutcome => ({
  kind,
  offsetYears,
  grade: { quantizedLowerBound: qlb, survivalFraction: qlb + 0.02, marginAboveBar: qlb - 0.85 },
  nonMonotoneOffsets: [],
  curve: [curveRow(0, 0.7), curveRow(offsetYears, qlb)],
})

const noDateTrack = (bestBound = 0.6, nonMonotoneOffsets: readonly number[] = []): DateTrackOutcome => ({
  kind: 'no-date-in-window',
  nonMonotoneOffsets,
  curve: [curveRow(0, 0.3), curveRow(5, bestBound)],
})

describe('composeDateSplit — the floor/lifestyle date composition (council 2026-07-02, insight 048)', () => {
  it('the DEGENERATE: two value-equal DATED tracks (distinct objects) compose SINGLE — never a doubled date', () => {
    const floor = datedTrack(6)
    const lifestyle = datedTrack(6)
    expect(floor).not.toBe(lifestyle)
    const view = composeDateSplit(floor, lifestyle)
    expect(view).toEqual({ kind: 'single', track: floor })
  })

  it('two value-equal NO-DATE tracks compose SINGLE (the how-close rung and disclosures agree)', () => {
    const view = composeDateSplit(noDateTrack(0.6), noDateTrack(0.6))
    expect(view.kind).toBe('single')
  })

  it('floor EARLIER than lifestyle (the normal split) ⇒ split: lifestyle is the hero, the floor line reads covered, NOT inverted', () => {
    const floor = datedTrack(4)
    const lifestyle = datedTrack(9)
    const view = composeDateSplit(floor, lifestyle)
    expect(view).toEqual({
      kind: 'split',
      lifestyle,
      floor: { kind: 'covered', offsetYears: 4, quantizedLowerBound: 0.9, unconfirmed: false },
      inverted: false,
    })
  })

  it('floor dated + lifestyle NO-DATE (the mixed arm) ⇒ split with the no-date hero — the work-optional claim reads the LIFESTYLE track', () => {
    const floor = datedTrack(4)
    const lifestyle = noDateTrack(0.75)
    const view = composeDateSplit(floor, lifestyle)
    expect(view.kind).toBe('split')
    if (view.kind !== 'split') return
    expect(view.lifestyle).toBe(lifestyle)
    expect(view.floor).toEqual({ kind: 'covered', offsetYears: 4, quantizedLowerBound: 0.9, unconfirmed: false })
    expect(view.inverted).toBe(false)
  })

  it('the R27 INVERSION, both dated (floor LATER than lifestyle) ⇒ inverted=true — the subsidy-cause disclosure MUST ride', () => {
    const floor = datedTrack(9)
    const lifestyle = datedTrack(4)
    const view = composeDateSplit(floor, lifestyle)
    expect(view.kind).toBe('split')
    if (view.kind !== 'split') return
    expect(view.inverted).toBe(true)
    expect(view.floor).toEqual({ kind: 'covered', offsetYears: 9, quantizedLowerBound: 0.9, unconfirmed: false })
  })

  it('the EXTREME inversion (floor no-date while lifestyle dated) ⇒ split, floor line not-within-window, inverted=true', () => {
    const floor = noDateTrack(0.7)
    const lifestyle = datedTrack(5)
    const view = composeDateSplit(floor, lifestyle)
    expect(view).toEqual({
      kind: 'split',
      lifestyle,
      floor: { kind: 'not-within-window' },
      inverted: true,
    })
  })

  it('BOTH no-date but different how-close rungs ⇒ split (quiet severity disclosure), NOT inverted', () => {
    const floor = noDateTrack(0.5)
    const lifestyle = noDateTrack(0.75)
    const view = composeDateSplit(floor, lifestyle)
    expect(view).toEqual({
      kind: 'split',
      lifestyle,
      floor: { kind: 'not-within-window' },
      inverted: false,
    })
  })

  it('planted-fail: SAME offset, different KIND (window-edge floor vs confirmed lifestyle) ⇒ split — the edge hedge is information', () => {
    const floor = datedTrack(6, 0.9, 'window-edge-unconfirmed')
    const lifestyle = datedTrack(6)
    const view = composeDateSplit(floor, lifestyle)
    expect(view.kind).toBe('split')
    if (view.kind !== 'split') return
    expect(view.floor).toEqual({ kind: 'covered', offsetYears: 6, quantizedLowerBound: 0.9, unconfirmed: true })
  })

  it('planted-fail: same crowns, different NON-MONOTONE disclosures ⇒ split (a single render would hide one track’s dip)', () => {
    const floor = datedTrack(6)
    const lifestyle = { ...datedTrack(6), nonMonotoneOffsets: [3] }
    expect(composeDateSplit(floor, lifestyle).kind).toBe('split')
  })

  it('planted-fail: same crowns, different GRADE bounds ⇒ split (the odds line differs)', () => {
    const floor = datedTrack(6, 0.9)
    const lifestyle = datedTrack(6, 0.85)
    expect(composeDateSplit(floor, lifestyle).kind).toBe('split')
  })
})

describe('isFloorLifestyleInverted', () => {
  it('both dated: inverted iff floor offset exceeds lifestyle offset', () => {
    expect(isFloorLifestyleInverted(datedTrack(9), datedTrack(4))).toBe(true)
    expect(isFloorLifestyleInverted(datedTrack(4), datedTrack(9))).toBe(false)
    expect(isFloorLifestyleInverted(datedTrack(6), datedTrack(6))).toBe(false)
  })

  it('floor no-date while lifestyle dated is the extreme inversion', () => {
    expect(isFloorLifestyleInverted(noDateTrack(), datedTrack(5))).toBe(true)
  })

  it('lifestyle no-date is NEVER inverted (the floor clearing first is the expected direction)', () => {
    expect(isFloorLifestyleInverted(datedTrack(4), noDateTrack())).toBe(false)
    expect(isFloorLifestyleInverted(noDateTrack(), noDateTrack())).toBe(false)
  })
})
