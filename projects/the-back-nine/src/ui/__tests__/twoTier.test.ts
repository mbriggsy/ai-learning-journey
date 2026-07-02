import { describe, it, expect } from 'vitest'
import type { Headline, OutcomeState } from '@shared/model'
import { floorRelief } from '../twoTier'

const reading = (x: number, outcomeState: OutcomeState = 'on-track'): Headline => ({
  xOfTen: { value: x, marginToEdge: 0.03 },
  outcomeState,
})

describe('floorRelief — the two-tier spine gate (council 2026-07-02, insight 048)', () => {
  it('ABSENT floor reading (no budget rode) ⇒ null — the single-metric statement stands alone', () => {
    expect(floorRelief(reading(7), undefined)).toBeNull()
  })

  it('the DEGENERATE collapse: a value-equal floor reading ⇒ null (single-metric VERBATIM, never a doubled tier pair)', () => {
    const hero = reading(7)
    // Deliberately a DIFFERENT object with equal rendered fields — the gate must be value
    // equality, never identity (with a budget the engine always emits two genuine readings;
    // identity across the worker wire is not a contract).
    const floor = reading(7)
    expect(floor).not.toBe(hero)
    expect(floorRelief(hero, floor)).toBeNull()
  })

  it('a floor that clears MORE futures than the full lifestyle ⇒ the relief line renders (the reading passes through verbatim)', () => {
    const hero = reading(7)
    const floor = reading(10)
    expect(floorRelief(hero, floor)).toBe(floor)
  })

  it('planted-fail: an equal COUNT with a different STATE still earns the line (already-failing is keyed to the floor’s own depletion)', () => {
    const hero = reading(0, 'off-track')
    const floor = reading(0, 'already-failing')
    // The gate must discriminate on EVERY rendered field — a state-only difference is
    // information, not noise.
    expect(floorRelief(hero, floor)).toBe(floor)
  })

  it('planted-fail: an equal STATE with a different COUNT earns the line', () => {
    const hero = reading(7)
    const floor = reading(9)
    expect(floorRelief(hero, floor)).toBe(floor)
  })
})
