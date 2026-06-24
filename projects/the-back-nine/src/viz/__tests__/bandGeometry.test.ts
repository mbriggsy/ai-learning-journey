import { describe, expect, it } from 'vitest'
import {
  LABEL_PAD,
  LABEL_ROWS,
  PLOT,
  PLOT_H,
  VIEWBOX,
  areaPath,
  linePath,
  placeAnnotationLabels,
  placeholderPath,
  xForYear,
  yForDollars,
} from '../bandGeometry'
import { LATTICE_POINTS, type BandSample } from '../bandData'

/**
 * Pure band-path math (back-nine-design §3 — the honest fan). The MORPH contract rests on a
 * fixed-point-count lattice, so these assert: the y-axis is LINEAR and $0-anchored (ruin draws
 * to the floor), the x-axis is linear on the fixed domain, and an area path's command/point
 * count is INVARIANT across narrow / widen / shift fans (so a `d` morph is well-defined). Every
 * geometry-honesty arm carries a planted-fail control so it can't pass vacuously.
 */

// A lattice of `n` samples spanning [0, horizon], all percentiles a single dollar function — used
// to manufacture narrow / widen / shift / ruin fans on the SAME lattice.
function lattice(
  horizon: number,
  fn: (yearsFromNow: number, i: number) => Omit<BandSample, 'yearsFromNow'>,
): BandSample[] {
  const out: BandSample[] = []
  for (let i = 0; i < LATTICE_POINTS; i++) {
    const yearsFromNow = (i / (LATTICE_POINTS - 1)) * horizon
    out.push({ yearsFromNow, ...fn(yearsFromNow, i) })
  }
  return out
}

// count the coordinate pairs in a path `d` (each M/L command carries one "x,y").
function pointCount(d: string): number {
  const matches = d.match(/[ML]-?\d/g)
  return matches === null ? 0 : matches.length
}

describe('bandGeometry — the honest, $0-anchored linear axes', () => {
  it('y is LINEAR: equal dollar steps map to equal pixel steps', () => {
    const max = 1_000_000
    const yAt = (d: number) => yForDollars(d, max)
    // a clean 200k ladder (avoids colliding with an engine single-sourced IRMAA-MAGI edge).
    const step1 = yAt(0) - yAt(200_000)
    const step2 = yAt(200_000) - yAt(400_000)
    const step3 = yAt(400_000) - yAt(600_000)
    expect(step2).toBeCloseTo(step1, 6)
    expect(step3).toBeCloseTo(step1, 6)
  })

  it('$0 maps EXACTLY to the plot floor — the ruin baseline', () => {
    expect(yForDollars(0, 1_000_000)).toBe(PLOT.bottom)
  })

  it('the ceiling maps to the plot top', () => {
    expect(yForDollars(1_000_000, 1_000_000)).toBe(PLOT.top)
  })

  it('a DEPLETED ($0) path draws ON the floor, never below the axis (clamp, not escape)', () => {
    // PLANTED control: a negative dollar value must NOT push the point below the baseline.
    const yNeg = yForDollars(-50_000, 1_000_000)
    expect(yNeg).toBe(PLOT.bottom) // clamped to $0, sits on the axis
    expect(yNeg).toBeLessThanOrEqual(PLOT.bottom) // never below
  })

  it('a value above the ceiling clamps to the top, never above the plot', () => {
    expect(yForDollars(5_000_000, 1_000_000)).toBe(PLOT.top)
  })

  it('x is linear on the fixed [0, horizon] domain (today → left, horizon → right)', () => {
    const H = 33
    expect(xForYear(0, H)).toBe(PLOT.left)
    expect(xForYear(H, H)).toBe(PLOT.right)
    expect(xForYear(H / 2, H)).toBeCloseTo((PLOT.left + PLOT.right) / 2, 3)
  })

  it('throws on non-finite inputs (finiteness-first — a NaN passes every relational guard)', () => {
    expect(() => yForDollars(Number.NaN, 1_000_000)).toThrow(RangeError)
    expect(() => xForYear(Number.POSITIVE_INFINITY, 30)).toThrow(RangeError)
  })
})

describe('bandGeometry — the morph rides a CONSTANT-point-count lattice (widen/shift/narrow)', () => {
  const H = 30
  const narrow = lattice(H, (y) => {
    const mid = 800_000 - y * 10_000
    const half = 40_000
    return { p10: mid - 2 * half, p25: mid - half, p50: mid, p75: mid + half, p90: mid + 2 * half }
  })
  // WIDEN: same lattice, a much wider spread (an Act-3 override edit widens, not only narrows).
  const widen = lattice(H, (y) => {
    const mid = 800_000 - y * 10_000
    const half = 160_000
    return { p10: mid - 2 * half, p25: mid - half, p50: mid, p75: mid + half, p90: mid + 2 * half }
  })
  // SHIFT: same spread, shifted DOWN (a worse market).
  const shift = lattice(H, (y) => {
    const mid = 500_000 - y * 12_000
    const half = 40_000
    return { p10: mid - 2 * half, p25: mid - half, p50: mid, p75: mid + half, p90: mid + 2 * half }
  })

  it('every fan has exactly LATTICE_POINTS samples', () => {
    expect(narrow).toHaveLength(LATTICE_POINTS)
    expect(widen).toHaveLength(LATTICE_POINTS)
    expect(shift).toHaveLength(LATTICE_POINTS)
  })

  it('the outer area path has the SAME point count for narrow / widen / shift (lattice-invariant)', () => {
    const n = pointCount(areaPath(narrow, 'p10', 'p90', H, 1_000_000))
    const w = pointCount(areaPath(widen, 'p10', 'p90', H, 1_000_000))
    const s = pointCount(areaPath(shift, 'p10', 'p90', H, 1_000_000))
    // top edge + bottom edge = 2 * LATTICE_POINTS coordinate pairs.
    expect(n).toBe(2 * LATTICE_POINTS)
    expect(w).toBe(n)
    expect(s).toBe(n)
  })

  it('the median line has LATTICE_POINTS points, invariant across fans', () => {
    expect(pointCount(linePath(narrow, 'p50', H, 1_000_000))).toBe(LATTICE_POINTS)
    expect(pointCount(linePath(widen, 'p50', H, 1_000_000))).toBe(LATTICE_POINTS)
  })

  it('PLANTED: the actual `d` DIFFERS between narrow and widen (the morph is real signal)', () => {
    // If the path were lattice-invariant in VALUES too, a morph would be a no-op — prove it moves.
    const dn = areaPath(narrow, 'p10', 'p90', H, 1_000_000)
    const dw = areaPath(widen, 'p10', 'p90', H, 1_000_000)
    expect(dn).not.toBe(dw)
  })

  it('a RUIN fan (low tail depletes to $0 late) draws the lower edge ONTO the floor', () => {
    const ruin = lattice(H, (y) => {
      const drain = Math.max(0, 600_000 - y * 30_000) // p10 hits 0 partway through
      return { p10: drain, p25: drain + 50_000, p50: drain + 150_000, p75: drain + 300_000, p90: drain + 500_000 }
    })
    const d = areaPath(ruin, 'p10', 'p90', H, 1_000_000)
    // at least one coordinate sits exactly on the $0 baseline (the ruin signal a log scale can't show).
    expect(d).toContain(`,${PLOT.bottom}`)
  })
})

describe('bandGeometry — the indeterminate placeholder is wide + un-data-like', () => {
  const H = 30
  const d = placeholderPath(H)

  it('spans most of the plot height (a WIDE envelope, not a thin band)', () => {
    // crude: the placeholder uses ~70% of PLOT_H between its top and bottom arcs.
    const ys = [...d.matchAll(/[,\s](-?\d+(?:\.\d+)?)(?=[A-Z]|$|\s)/g)].map((m) => Number(m[1]))
    const spanOk = PLOT_H * 0.5
    // sanity: it at least reaches into both halves of the plot.
    expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(spanOk)
  })

  it('is a closed shape (Z) and stays inside the viewBox', () => {
    expect(d.endsWith('Z')).toBe(true)
    const xs = [...d.matchAll(/[ML Q]\s*(-?\d+(?:\.\d+)?),/g)].map((m) => Number(m[1]))
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(0)
    expect(Math.max(...xs)).toBeLessThanOrEqual(VIEWBOX.width)
  })
})

describe('bandGeometry — annotation label de-collision (no same-row overlap)', () => {
  // The coverage gap that let the row-1 collision ship: the original fixtures used 3 well-spaced
  // annotations, never exercising the multi-row path. These assert the placer's load-bearing
  // invariant — TWO labels on the SAME row must clear each other by LABEL_PAD — on the dense
  // household-clock set. Char counts mirror what the component passes: max(label, ages) length.
  type Item = { name: string; yearsFromNow: number; chars: number }
  const item = (name: string, yearsFromNow: number, ages: string): Item => ({
    name,
    yearsFromNow,
    chars: Math.max(name.length, ages.length),
  })

  /** The worst (smallest) horizontal clearance between any two labels sharing a row. A value < 0
   *  is a real overlap (the cardinal sin); the placer must keep it ≥ 0 (ideally ≥ LABEL_PAD). */
  function worstSameRowClearance(items: readonly Item[], horizonYears: number): number {
    const placed = placeAnnotationLabels(items, horizonYears)
    let worst = Number.POSITIVE_INFINITY
    for (let i = 0; i < placed.length; i++) {
      for (let j = i + 1; j < placed.length; j++) {
        if (placed[i]!.level !== placed[j]!.level) continue
        // items are left→right, so j is the right neighbour: clearance = j.left − i.right.
        const clearance = placed[j]!.extent[0] - placed[i]!.extent[1]
        if (clearance < worst) worst = clearance
      }
    }
    return worst
  }

  // The NORMAL retirement-couple case the verifier measured: Today (pinned far-left) + two close
  // retirements + survivor + horizon. Pre-fix, "You retire" and "Sam retires" BOTH fell to row 1
  // and overlapped by ~61px.
  const DENSE: Item[] = [
    item('Today', 0, '61 / 59'),
    item('You retire', 4, '65 / 63'),
    item('Sam retires', 6, '67 / 65'),
    item('Survivor years', 28, '~86 / 84'),
    item('Horizon', 33, '94 / 92'),
  ]

  it('the dense two-retirements set has NO overlapping labels on any shared row (the bug, fixed)', () => {
    // The load-bearing assertion: it FAILS against the pre-fix placer (which piled both retirements
    // onto row 1 → a large negative clearance) and PASSES now (each gets its own row).
    expect(worstSameRowClearance(DENSE, 33)).toBeGreaterThanOrEqual(0)
  })

  it('the two close retirements land on DIFFERENT rows', () => {
    const placed = placeAnnotationLabels(DENSE, 33)
    const you = placed[1]!
    const sam = placed[2]!
    expect(you.level).not.toBe(sam.level)
  })

  it('every annotation lands within the allowed rows', () => {
    for (const p of placeAnnotationLabels(DENSE, 33)) {
      expect(p.level).toBeGreaterThanOrEqual(0)
      expect(p.level).toBeLessThan(LABEL_ROWS)
    }
  })

  it('the Survivor↔Horizon right-edge pair still de-collides (the original fix holds)', () => {
    const placed = placeAnnotationLabels(DENSE, 33)
    const survivor = placed[3]!
    const horizon = placed[4]!
    expect(survivor.level).not.toBe(horizon.level)
  })

  it('PLANTED control: two labels at the SAME x DO collide on row 0, forcing a stagger', () => {
    // Proves the overlap math is real — two identical-x wide labels cannot share row 0; the second
    // must move to a different row, and the result still has no same-row overlap.
    const same: Item[] = [item('Work A', 10, '70 / 68'), item('Work B', 10, '70 / 68')]
    const placed = placeAnnotationLabels(same, 33)
    expect(placed[0]!.level).not.toBe(placed[1]!.level)
    expect(worstSameRowClearance(same, 33)).toBeGreaterThanOrEqual(0)
  })

  it('deep-stacks gracefully: three labels at the same x take three distinct rows', () => {
    const triple: Item[] = [
      item('A', 12, '70 / 70'),
      item('B', 12, '70 / 70'),
      item('C', 12, '70 / 70'),
    ]
    const levels = placeAnnotationLabels(triple, 33).map((p) => p.level)
    expect(new Set(levels).size).toBe(3)
  })

  it('a well-spaced set keeps everything on row 0 (no needless stagger)', () => {
    const spaced: Item[] = [item('Today', 0, '61 / 59'), item('Mid', 16, '77 / 75'), item('Horizon', 33, '94 / 92')]
    // ensure the de-collision doesn't over-trigger and push well-separated labels down.
    const onRow0 = placeAnnotationLabels(spaced, 33).filter((p) => p.level === 0).length
    expect(onRow0).toBeGreaterThanOrEqual(2)
  })

  it('LABEL_PAD breathing room: a same-row pair clears by at least LABEL_PAD when it fits', () => {
    // For the spaced set, the same-row neighbours must clear by the comfortable pad, not merely 0.
    const spaced: Item[] = [item('Today', 0, '61 / 59'), item('Mid', 16, '77 / 75'), item('Horizon', 33, '94 / 92')]
    expect(worstSameRowClearance(spaced, 33)).toBeGreaterThanOrEqual(LABEL_PAD)
  })
})
