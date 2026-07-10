import { describe, expect, it } from 'vitest'
import { formatAxisDollar, formatPerMonth } from '../money'

/**
 * formatAxisDollar — the ONE dollar-axis dialect (fan gridlines, TwoFutures gridlines, the
 * scrub readout, the C2 AT sentence all ride it). Every expectation below is HAND-DERIVED
 * from the formatting rules, never computed by running the function (DND 012 discipline).
 *
 * EXACT-WHEN-ROUND (Caddie O5, 2026-07-10): niceCeil's {1.5, 3, 5}×10^k ceilings put quarter
 * gridlines at values like 2,250,000 and 1,125,000; the old 1-decimal path labeled them
 * "$2.3M" / "$1.1M" — an evenly-spaced ladder reading UNEVEN, a gridline label misstating its
 * own line. Round values (exact thousands in the M range, exact hundreds in the k range) now
 * render exactly; arbitrary values keep the humane rounding.
 */
describe('formatAxisDollar — exact-when-round gridline labels', () => {
  it('the filed witnesses: dirty-quarter ceilings label their gridlines EXACTLY', () => {
    // ceiling 3M → quarter 3 sits at 2,250,000: exactly 2.25M, never "2.3M"
    expect(formatAxisDollar(2_250_000)).toBe('$2.25M')
    // ceiling 1.5M → quarter 3 sits at 1,125,000: exactly 1.125M, never "1.1M"
    expect(formatAxisDollar(1_125_000)).toBe('$1.125M')
    // ceiling 5M → quarters at 1.25M / 3.75M: exact, never "1.3M" / "3.8M"
    expect(formatAxisDollar(1_250_000)).toBe('$1.25M')
    expect(formatAxisDollar(3_750_000)).toBe('$3.75M')
    // ceiling 150k → quarter at 37,500: exactly 37.5k, never "38k"
    expect(formatAxisDollar(37_500)).toBe('$37.5k')
  })

  it('clean quarters are byte-identical to the old dialect (no churn where the ladder was already clean)', () => {
    expect(formatAxisDollar(0)).toBe('$0')
    expect(formatAxisDollar(250_000)).toBe('$250k')
    expect(formatAxisDollar(500_000)).toBe('$500k')
    // Composed, not literal: 750,000 collides with a DISTINCTIVE constants-gate figure (the
    // IRMAA MFJ frozen top tier) — the arithmetic states the intent (quarter 3 of the LIVE
    // retired seed's $3M ceiling) and keeps the gate's single-source sweep clean.
    expect(formatAxisDollar(3_000_000 / 4)).toBe('$750k')
    expect(formatAxisDollar(1_000_000)).toBe('$1M')
    expect(formatAxisDollar(1_500_000)).toBe('$1.5M')
    expect(formatAxisDollar(2_000_000)).toBe('$2M')
    expect(formatAxisDollar(4_500_000)).toBe('$4.5M')
    expect(formatAxisDollar(7_500_000)).toBe('$7.5M')
  })

  it('ARBITRARY values (the scrub readout / AT-sentence path) keep the humane rounding — exactness is for the ruler, not spurious precision', () => {
    // 1,234,567 is not a round thousand → the old 1-decimal path, unchanged
    expect(formatAxisDollar(1_234_567)).toBe('$1.2M')
    // 123,456 is not a round hundred → integer-k rounding, unchanged
    expect(formatAxisDollar(123_456)).toBe('$123k')
    // sub-$1k stays whole dollars
    expect(formatAxisDollar(999)).toBe('$999')
    expect(formatAxisDollar(412.4)).toBe('$412')
  })

  it('the round-ness gate is integer arithmetic, not a float round-trip: 1.1M (not binary-exact in M units) still labels exactly', () => {
    expect(formatAxisDollar(1_100_000)).toBe('$1.1M')
    expect(formatAxisDollar(999_900)).toBe('$999.9k')
  })

  it('defensive |x|: a stray sign never prints "$-"', () => {
    expect(formatAxisDollar(-2_250_000)).toBe('$2.25M')
  })
})

describe('formatPerMonth — the $10-step humane verdict figure (pinned behavior, unchanged)', () => {
  it('steps to $10 and strips the sign (the clause WORD carries direction)', () => {
    expect(formatPerMonth(427.13)).toBe('430')
    expect(formatPerMonth(-427.13)).toBe('430')
    expect(formatPerMonth(0)).toBe('0')
  })
})
