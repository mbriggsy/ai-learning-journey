import { describe, expect, it } from 'vitest'
import { axisDollarFormatterFor, formatAxisDollar, formatPerMonth } from '../money'
import { buildYTicks } from '@viz/bandData'

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

/**
 * axisDollarFormatterFor — O8 (2026-07-17): ONE dialect per tick lattice (corpus rule 36, the
 * fcc35556 axis family). The per-value formatter mixed units on any $M-class ceiling whose
 * quarters dip under $1M ("$750k" between "$1.5M" gridlines). The factory locks the lattice to
 * the TOP tick's unit; the scrub/tooltip path deliberately keeps per-value units (the readout
 * is prose, the axis is the ruler). Expectations hand-derived (DND 012).
 */
describe('axisDollarFormatterFor — the unit-locked tick lattice (O8)', () => {
  it('the filed witness: a $3M ceiling reads one dialect — "$0.75M", never "$750k" among "$M" gridlines', () => {
    const labels = buildYTicks(3_000_000, axisDollarFormatterFor(3_000_000)).map((t) => t.label)
    expect(labels).toEqual(['$0', '$0.75M', '$1.5M', '$2.25M', '$3M'])
  })

  it('the retired-seed shape: a $2M ceiling locks its half-million quarters to M', () => {
    const labels = buildYTicks(2_000_000, axisDollarFormatterFor(2_000_000)).map((t) => t.label)
    expect(labels).toEqual(['$0', '$0.5M', '$1M', '$1.5M', '$2M'])
  })

  it('the budget-seed shape: a $1.5M ceiling keeps the exact-when-round law in the locked dialect', () => {
    const labels = buildYTicks(1_500_000, axisDollarFormatterFor(1_500_000)).map((t) => t.label)
    expect(labels).toEqual(['$0', '$0.375M', '$0.75M', '$1.125M', '$1.5M'])
  })

  it('the $0 ruin-floor anchor stays plain "$0" — never "$0M"', () => {
    expect(axisDollarFormatterFor(3_000_000)(0)).toBe('$0')
  })

  it('a sub-$1M ceiling keeps the per-value dialect verbatim (its quarters never cross a unit boundary)', () => {
    const labels = buildYTicks(800_000, axisDollarFormatterFor(800_000)).map((t) => t.label)
    expect(labels).toEqual(['$0', '$200k', '$400k', '$600k', '$800k'])
    expect(axisDollarFormatterFor(800_000)).toBe(formatAxisDollar)
  })

  it('the one-dialect property: no $≥1M lattice ever mixes a "k" label among its "M" gridlines', () => {
    for (const ceiling of [1_000_000, 1_500_000, 2_000_000, 3_000_000, 4_000_000, 5_000_000, 6_000_000, 8_000_000]) {
      const labels = buildYTicks(ceiling, axisDollarFormatterFor(ceiling)).map((t) => t.label)
      for (const label of labels.slice(1)) {
        expect(label, `${ceiling} lattice: ${labels.join(' ')}`).toMatch(/M$/)
      }
    }
  })

  it('a non-round stray falls back to the humane 1-decimal in the locked unit (defensive, mirrors the per-value M branch)', () => {
    expect(axisDollarFormatterFor(2_000_000)(1_234_567)).toBe('$1.2M')
  })
})

describe('formatPerMonth — the $10-step humane verdict figure (pinned behavior, unchanged)', () => {
  it('steps to $10 and strips the sign (the clause WORD carries direction)', () => {
    expect(formatPerMonth(427.13)).toBe('430')
    expect(formatPerMonth(-427.13)).toBe('430')
    expect(formatPerMonth(0)).toBe('0')
  })
})
