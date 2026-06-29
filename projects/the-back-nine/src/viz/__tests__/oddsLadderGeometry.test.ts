import { describe, it, expect } from 'vitest'
import {
  VIEWBOX,
  PLOT,
  PLOT_W,
  PLOT_H,
  BAR_Y,
  RUNG_YS,
  xForOffset,
  yForRung,
  domainMaxYears,
} from '../oddsLadderGeometry'
import { BAR_RUNG, LADDER_MAX_RUNG } from '../curveMarks'

/*
 * Pure coordinate math for the odds ladder. The honesty pins: the bar sits at the TRUE 8.5 midpoint
 * (clears-vs-dips reads by position), the full 0..10 ladder is never truncated, a ceiling rung lands
 * at the top (never above), and x is the true linear household clock (uneven offsets show real gaps).
 */

describe('xForOffset — the linear household-clock x', () => {
  it('anchors offset 0 at the left and the domain top at the right', () => {
    expect(xForOffset(0, 30)).toBe(PLOT.left)
    expect(xForOffset(30, 30)).toBe(PLOT.right)
  })

  it('places an interior offset at its TRUE linear position (uneven gaps are honest)', () => {
    expect(xForOffset(6, 30)).toBeCloseTo(PLOT.left + (6 / 30) * PLOT_W, 3)
    // 6 of 30 is one-fifth across — nowhere near the midpoint a categorical axis would imply
    expect(xForOffset(6, 30)).toBeLessThan(PLOT.left + PLOT_W / 2)
  })

  it('clamps an out-of-domain offset into the plot and collapses free-today onto the left edge', () => {
    expect(xForOffset(40, 30)).toBe(PLOT.right) // clamped, never escapes the plot
    expect(xForOffset(0, 0)).toBe(PLOT.left) // free-today: domain top 0, no divide-by-zero
  })

  it('fails loud on a non-finite input or a negative domain (never a NaN x)', () => {
    expect(() => xForOffset(Number.NaN, 30)).toThrow(RangeError)
    expect(() => xForOffset(5, Number.POSITIVE_INFINITY)).toThrow(RangeError)
    expect(() => xForOffset(5, -1)).toThrow(RangeError)
  })
})

describe('yForRung — the full 0..10 ladder', () => {
  it('puts rung 0 on the floor and rung 10 at the top (the full, un-truncated scale)', () => {
    expect(yForRung(0)).toBe(PLOT.bottom)
    expect(yForRung(LADDER_MAX_RUNG)).toBe(PLOT.top)
  })

  it('is linear: rung 5 lands at the plot mid-height', () => {
    expect(yForRung(5)).toBeCloseTo(PLOT.bottom - 0.5 * PLOT_H, 3)
  })

  it('clamps a ceiling rung to the top — never above it (the headroom is the never-certain signal)', () => {
    expect(yForRung(11)).toBe(PLOT.top)
    expect(yForRung(-2)).toBe(PLOT.bottom)
    expect(PLOT.top).toBeGreaterThan(0) // there IS headroom above the top rung in the viewBox
  })

  it('fails loud on a non-finite rung', () => {
    expect(() => yForRung(Number.NaN)).toThrow(RangeError)
  })
})

describe('BAR_Y — the on-track bar between failing-8 and clearing-9', () => {
  it('sits strictly between rung 8 (below) and rung 9 (above), never on a rung gridline', () => {
    // higher rung ⇒ smaller y, so clearing-9 is ABOVE (smaller y) and failing-8 BELOW (larger y).
    expect(BAR_Y).toBeLessThan(yForRung(8))
    expect(BAR_Y).toBeGreaterThan(yForRung(9))
    expect(BAR_Y).toBe(yForRung(BAR_RUNG))
    expect(BAR_Y).not.toBe(yForRung(9)) // emphatically NOT on the rung-9 gridline
  })
})

describe('RUNG_YS — the readable detent grid', () => {
  it('has one entry per rung 0..10, strictly descending in y as the rung climbs', () => {
    expect(RUNG_YS).toHaveLength(LADDER_MAX_RUNG + 1)
    expect(RUNG_YS[0]).toEqual({ rung: 0, y: PLOT.bottom })
    expect(RUNG_YS[LADDER_MAX_RUNG]).toEqual({ rung: LADDER_MAX_RUNG, y: PLOT.top })
    for (let i = 1; i < RUNG_YS.length; i++) {
      expect(RUNG_YS[i]!.y).toBeLessThan(RUNG_YS[i - 1]!.y)
    }
  })
})

describe('domainMaxYears — the window-top from the mark offsets', () => {
  it('returns the latest offset, ignores non-finite, and collapses an empty set to 0', () => {
    expect(domainMaxYears([0, 3, 6, 12, 30])).toBe(30)
    expect(domainMaxYears([0])).toBe(0) // free-today
    expect(domainMaxYears([])).toBe(0)
    expect(domainMaxYears([5, Number.NaN, 8])).toBe(8)
  })
})

describe('viewBox sanity', () => {
  it('keeps the plot inside the viewBox with a bottom gutter for the offset labels', () => {
    expect(PLOT.right).toBeLessThanOrEqual(VIEWBOX.width)
    expect(PLOT.bottom).toBeLessThan(VIEWBOX.height) // room below the floor for x labels
  })
})
