import { describe, it, expect } from 'vitest'
import type { Headline, OutcomeState } from '@shared/model'
import { floorRelief } from '../twoTier'

const reading = (x: number, outcomeState: OutcomeState = 'on-track'): Headline => ({
  xOfTen: { value: x, marginToEdge: 0.03 },
  outcomeState,
  stateMarginToEdge: 0.03,
})

/** A fresh plan: the run's year 0 is this calendar year. */
const FRESH = 0

describe('floorRelief — the two-tier spine gate (council 2026-07-02, insight 048)', () => {
  it('ABSENT floor reading (no budget rode) ⇒ null — the single-metric statement stands alone', () => {
    expect(floorRelief(reading(7), undefined, FRESH)).toBeNull()
  })

  it('the DEGENERATE collapse: a value-equal floor reading ⇒ null (single-metric VERBATIM, never a doubled tier pair)', () => {
    const hero = reading(7)
    // Deliberately a DIFFERENT object with equal rendered fields — the gate must be value
    // equality, never identity (with a budget the engine always emits two genuine readings;
    // identity across the worker wire is not a contract).
    const floor = reading(7)
    expect(floor).not.toBe(hero)
    expect(floorRelief(hero, floor, FRESH)).toBeNull()
  })

  it('a floor that clears MORE futures than the full lifestyle ⇒ the relief line renders (the reading passes through verbatim) with the trim note', () => {
    const hero = reading(7)
    const floor = reading(10)
    expect(floorRelief(hero, floor, FRESH)).toEqual({ reading: floor, showTrimNote: true })
    expect(floorRelief(hero, floor, FRESH)!.reading).toBe(floor)
  })

  it('planted-fail: an equal COUNT with a different STATE still earns the line (already-failing is keyed to the floor’s own depletion)', () => {
    const hero = reading(0, 'off-track')
    const floor = reading(0, 'already-failing')
    // The gate must discriminate on EVERY rendered field — a state-only difference is
    // information, not noise.
    expect(floorRelief(hero, floor, FRESH)).toEqual({ reading: floor, showTrimNote: true })
  })

  it('planted-fail: an equal STATE with a different COUNT earns the line', () => {
    const hero = reading(7)
    const floor = reading(9)
    expect(floorRelief(hero, floor, FRESH)).toEqual({ reading: floor, showTrimNote: true })
  })

  it('the TRIM NOTE names the count’s own assumption, so on a fresh plan it rides EVERY earned relief line — a floor that does not hold included (Briggsy, 2026-10-16)', () => {
    expect(floorRelief(reading(3, 'off-track'), reading(6, 'borderline'), FRESH)!.showTrimNote).toBe(true)
    expect(floorRelief(reading(3, 'off-track'), reading(5, 'off-track'), FRESH)).toEqual({
      reading: reading(5, 'off-track'),
      showTrimNote: true,
    })
    expect(floorRelief(reading(9, 'on-track'), reading(10, 'over-funded'), FRESH)!.showTrimNote).toBe(true)
  })

  it('planted-fail: an UNKNOWN plan clock withholds the note — fail closed (a mount that threaded no anchor)', () => {
    expect(floorRelief(reading(3, 'off-track'), reading(10, 'over-funded'), undefined)).toEqual({
      reading: reading(10, 'over-funded'),
      showTrimNote: false,
    })
  })

  it('planted-fail: on an AGED plan the note is withheld on every state — the count’s year 0 is the build year, so “starting now” would be false', () => {
    for (const planClock of [1, 2, 5]) {
      for (const floor of [reading(10, 'over-funded'), reading(9), reading(6, 'borderline'), reading(4, 'off-track')]) {
        const relief = floorRelief(reading(3, 'off-track'), floor, planClock)
        expect(relief, `clock ${planClock}: the relief LINE itself still renders`).not.toBeNull()
        expect(relief!.reading).toBe(floor)
        expect(relief!.showTrimNote, `clock ${planClock}, ${floor.outcomeState}`).toBe(false)
      }
    }
  })
})
