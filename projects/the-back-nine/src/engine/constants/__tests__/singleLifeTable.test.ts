/**
 * The Single Life Table golden (U11, gap 3): 26 CFR 1.401(a)(9)-9(b) / Pub 590-B (2025) Table I.
 *
 * The full vector is pinned (insight 021: anchors and monotonicity leave almost any smooth wrong curve green), typed
 * from the two-source diff's own output (the eCFR XML keyed by age against Pub 590-B read with `pdftotext -raw`, 121
 * of 121 equal; the data module's header has the method), never read back off the module. The anchors are the IRS's
 * own worked examples, an axis apart from the table: the regulation's "the 14.1-year life expectancy for a
 * 76-year-old under the Single Life Table" (-9(f)(2)(ii)) and Pub 590-B's "You become age 57 in 2026 … Your
 * applicable denominator for 2026 is 29.8".
 */
import { describe, expect, it } from 'vitest'
import { singleLifeTable } from '../tax'

// Typed from the diff output (index = age, 0 to 119, then the source's "120+" row).
const PRIMARY = [
  84.6, 83.7, 82.8, 81.8, 80.8, 79.8, 78.8, 77.9, 76.9, 75.9,
  74.9, 73.9, 72.9, 71.9, 70.9, 69.9, 69.0, 68.0, 67.0, 66.0,
  65.0, 64.1, 63.1, 62.1, 61.1, 60.2, 59.2, 58.2, 57.3, 56.3,
  55.3, 54.4, 53.4, 52.5, 51.5, 50.5, 49.6, 48.6, 47.7, 46.7,
  45.7, 44.8, 43.8, 42.9, 41.9, 41.0, 40.0, 39.0, 38.1, 37.1,
  36.2, 35.3, 34.3, 33.4, 32.5, 31.6, 30.6, 29.8, 28.9, 28.0,
  27.1, 26.2, 25.4, 24.5, 23.7, 22.9, 22.0, 21.2, 20.4, 19.6,
  18.8, 18.0, 17.2, 16.4, 15.6, 14.8, 14.1, 13.3, 12.6, 11.9,
  11.2, 10.5, 9.9, 9.3, 8.7, 8.1, 7.6, 7.1, 6.6, 6.1,
  5.7, 5.3, 4.9, 4.6, 4.3, 4.0, 3.7, 3.4, 3.2, 3.0,
  2.8, 2.6, 2.5, 2.3, 2.2, 2.1, 2.1, 2.1, 2.0, 2.0,
  2.0, 2.0, 2.0, 1.9, 1.9, 1.8, 1.8, 1.6, 1.4, 1.1,
  1.0,
]

describe('the Single Life Table (26 CFR 1.401(a)(9)-9(b); Pub 590-B Table I)', () => {
  const t = singleLifeTable.value

  it('carries every one of the 121 printed rows, the full vector pinned (insight 021)', () => {
    expect(PRIMARY).toHaveLength(121)
    expect(t.byAge).toEqual(PRIMARY)
  })

  it('returns the IRS’s own printed figures: 29.8 at 57, 31.6 at 55, 14.1 at 76', () => {
    expect(t.byAge[57]).toBe(29.8)
    expect(t.byAge[55]).toBe(31.6)
    expect(t.byAge[76]).toBe(14.1)
  })

  it('keeps the flat, irregular tail exactly as printed (105 to 119, then "120+")', () => {
    expect(t.byAge.slice(105)).toEqual([2.1, 2.1, 2.1, 2.0, 2.0, 2.0, 2.0, 2.0, 1.9, 1.9, 1.8, 1.8, 1.6, 1.4, 1.1, 1.0])
    expect(t.lastAge).toBe(120)
    expect(t.lastAgeLabel).toBe('120+')
    expect(t.byAge).toHaveLength(t.lastAge + 1)
  })

  it('every value is a finite one-decimal figure that never rises with age (DND/009)', () => {
    for (const [age, v] of t.byAge.entries()) {
      expect(Number.isFinite(v) && v > 0, `age ${age}`).toBe(true)
      expect(Math.round(v * 10) / 10, `age ${age} is one decimal`).toBe(v)
      if (age > 0) expect(v, `age ${age} never rises`).toBeLessThanOrEqual(t.byAge[age - 1]!)
    }
  })

  it('ships pinned to a dated primary read (every tax-on run consumes every tax.* entry)', () => {
    expect(singleLifeTable.directionalUntilPinned).toBe(false)
    expect(singleLifeTable.citation).toMatch(/26 CFR 1\.401\(a\)\(9\)-9\(b\), read 2026-11-27/)
    expect(singleLifeTable.pinTo).toMatch(/Table I/)
  })
})
