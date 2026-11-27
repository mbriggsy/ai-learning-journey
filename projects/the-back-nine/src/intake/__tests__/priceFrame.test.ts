/**
 * Gap 4's U4 (KTD3, KTD4): the price frame of a budget line that changes at its own rate. A rated line's charge in sim
 * year t is its typed amount × (1 + g)^t ÷ the deflator of t, where the deflator is the one price index on its own base
 * for a plan built through the index's anchor year, and the build year's growth after that.
 *
 * ORACLES ARE EXTERNALLY DERIVED (DND 012): the index is the closed form (1 + cpi)^n by `Math.pow`, near-term years then
 * ultimate years, each rate read from the constants (the producer runs a product of yearly steps); the growth is
 * `Math.pow(1 + g, t)` (the producer runs a product too). Never the producer's own loop.
 */
import { describe, it, expect } from 'vitest'
import { medicareCostTrend } from '@engine/constants'
import { cumulativePriceIndex } from '@engine/priceIndex'
import { nominalDeflator, ratedLineFactor, ratedLineFactors } from '@intake/priceFrame'

const TREND = medicareCostTrend.value
const ANCHOR = TREND.anchorYear
const TABLE_EDGE = ANCHOR + TREND.premiums.length

/** Prices' growth from `from` to `to` (both at or after the anchor), by the closed form. */
function oracleGrowth(from: number, to: number): number {
  const near = Math.max(0, Math.min(to, TABLE_EDGE) - Math.max(from, ANCHOR))
  const ultimate = Math.max(0, to - Math.max(from, TABLE_EDGE))
  return Math.pow(1 + TREND.cpiNearTermAvg, near) * Math.pow(1 + TREND.cpiUltimate, ultimate)
}

const REL = 1e-12
const close = (actual: number, expected: number): void => {
  expect(Math.abs(actual - expected) / expected).toBeLessThan(REL)
}

describe('the price frame of a rated line (gap 4’s U4, KTD3 and KTD4)', () => {
  it('the constants this file reads are the ones AE2’s hand figure assumes: a 2026 anchor, 3.2 % through 2035, 2.4 % after', () => {
    expect([ANCHOR, TABLE_EDGE, TREND.cpiNearTermAvg, TREND.cpiUltimate]).toEqual([2026, 2035, 0.032, 0.024])
  })

  it('AE2: a $10,000 fixed-dollar line on a 2026 plan costs 10,000 ÷ (1.032^9 × 1.024) in calendar 2036 (sim year 10)', () => {
    const typed = 10_000
    const hand = typed / (Math.pow(1.032, 9) * 1.024)
    close(typed * ratedLineFactor(0, 2026, 10), hand)
    // About $7,355, the figure U8's read-back will quote.
    expect(Math.round(typed * ratedLineFactor(0, 2026, 10))).toBe(7_355)
  })

  it('a line rising 5 % a year: its charge in sim year 10 is 10,000 × 1.05^10 ÷ the deflator of 2036', () => {
    close(10_000 * ratedLineFactor(0.05, 2026, 10), (10_000 * Math.pow(1.05, 10)) / oracleGrowth(2026, 2036))
  })

  it('year 0 of a plan built in the anchor year charges the typed amount exactly, at every rate', () => {
    for (const g of [0, 0.024, 0.05, 0.15]) expect(ratedLineFactor(g, 2026, 0), `rate ${g}`).toBe(1)
  })

  it('an aged plan built in 2024 runs without throwing: the divisor is 1 through the anchor year and the index level in every year', () => {
    for (let t = 0; t < 40; t++) {
      const calendar = 2024 + t
      expect(nominalDeflator(2024, t), `sim year ${t}`).toBe(cumulativePriceIndex(calendar))
      if (calendar <= ANCHOR) expect(nominalDeflator(2024, t), `sim year ${t}`).toBe(1)
      else close(nominalDeflator(2024, t), oracleGrowth(ANCHOR, calendar))
    }
    // A fixed-dollar line on it: flat through 2026, then shrinking by the index.
    expect([0, 1, 2].map((t) => ratedLineFactor(0, 2024, t))).toEqual([1, 1, 1])
    close(ratedLineFactor(0, 2024, 3), 1 / 1.032)
  })

  it('a plan built in 2028 charges a fixed-dollar line its typed amount in year 0, and deflates from the build year after (the rebase)', () => {
    expect(ratedLineFactor(0, 2028, 0)).toBe(1)
    for (let t = 1; t < 30; t++) close(nominalDeflator(2028, t), oracleGrowth(2028, 2028 + t))
    close(ratedLineFactor(0.05, 2028, 7), Math.pow(1.05, 7) / oracleGrowth(2028, 2035))
  })

  it('the factors by sim year are the per-year factor at every t, the horizon long', () => {
    const factors = ratedLineFactors(0.03, 2026, 45)
    expect(factors).toHaveLength(45)
    factors.forEach((f, t) => close(f, Math.pow(1.03, t) / oracleGrowth(2026, 2026 + t)))
  })

  it('refuses a rate the bounds module refuses and a non-integer year (never a quiet factor)', () => {
    expect(() => ratedLineFactors(Number.NaN, 2026, 10)).toThrow(/rate/)
    expect(() => ratedLineFactors(0.2, 2026, 10)).toThrow(/rate/)
    expect(() => ratedLineFactors(-0.01, 2026, 10)).toThrow(/rate/)
    expect(() => nominalDeflator(2026.5, 3)).toThrow()
  })
})
