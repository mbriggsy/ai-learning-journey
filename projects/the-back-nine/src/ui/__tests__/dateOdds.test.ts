import { describe, it, expect } from 'vitest'
import { dateOddsText } from '../dateOdds'
import { slots } from '../copy'

/*
 * The date odds mapping — the single source the elevated FuckOffDate surface and the provisional
 * DateLine both read. Pins the conservative-lower-bound reading and the 10-of-10 honesty clamp.
 */
describe('dateOddsText — the single-sourced date odds reading', () => {
  it('maps the quantized lower bound through the pinned "X of 10" frame, wrapped as odds', () => {
    // 0.84 → round(8.4) = 8 → "8 of 10"; 0.86 → round(8.6) = 9 → "9 of 10"
    expect(dateOddsText(0.84)).toBe(slots.withOdds(slots.xOfTen(8)))
    expect(dateOddsText(0.86)).toBe(slots.withOdds(slots.xOfTen(9)))
  })

  it('rides the 10-of-10 honesty clamp — a ≥0.95 bound reads "better than 9 in 10", never "10 of 10"', () => {
    // 0.95 → round(9.5) = 10 → xOfTen(10) → the ceiling proportion (NOT a count)
    const odds = dateOddsText(0.95)
    expect(odds).toContain('better than 9 in 10')
    expect(odds).not.toContain('10 of 10')
  })

  it('reads the LOWER bound, not the point estimate (the conservative grade — §3c)', () => {
    // a 0.84 lower bound reads 8-of-10 even though a higher point estimate exists; the mapping is a
    // pure function of the bound it is given (the caller passes grade.quantizedLowerBound).
    expect(dateOddsText(0.84)).toBe(slots.withOdds(slots.xOfTen(8)))
  })
})
