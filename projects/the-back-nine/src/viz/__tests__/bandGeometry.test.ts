import { describe, expect, it } from 'vitest'
import {
  AT_RANGE_COHORT_MIN,
  COHORT_FADE,
  LABEL_PAD,
  LABEL_ROWS,
  PLOT,
  PLOT_H,
  PLOT_W,
  READOUT_GAP,
  READOUT_TOP,
  READOUT_W,
  VIEWBOX,
  areaPath,
  cohortFadeOpacity,
  cohortFadeStops,
  isThinCohort,
  linePath,
  nearestLatticeIndex,
  placeAnnotationLabels,
  placeholderPath,
  placeReadoutBox,
  selectAtRangeColumn,
  xForYear,
  yForDollars,
  truncateFanAtThinCohort,
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

  it('throws on a non-POSITIVE ceiling / horizon (a degenerate scale is a caller bug — never paint ruin)', () => {
    // The asymmetry this closes: a non-finite scale already threw, but a non-positive one used to
    // fail CALM — yForDollars collapsed EVERY value onto the $0 floor, painting a HEALTHY fan as
    // total ruin (the literal calm-but-wrong sin); xForYear collapsed the x-lattice to the left.
    expect(() => yForDollars(900_000, 0)).toThrow(RangeError)
    expect(() => yForDollars(900_000, -1)).toThrow(RangeError)
    expect(() => xForYear(5, 0)).toThrow(RangeError)
    expect(() => xForYear(5, -1)).toThrow(RangeError)
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

// ── dead-cohort de-emphasis (back-nine-design §3) ─────────────────────────────────────────────
describe('cohortFadeOpacity — fade the small-cohort tail without erasing it', () => {
  it('a full cohort draws at full opacity, a near-dead cohort at the faint floor', () => {
    expect(cohortFadeOpacity(1)).toBe(1)
    expect(cohortFadeOpacity(COHORT_FADE.full)).toBe(1) // at/above `full` → full
    expect(cohortFadeOpacity(COHORT_FADE.floorAt)).toBeCloseTo(COHORT_FADE.floor, 6)
    expect(cohortFadeOpacity(0)).toBeCloseTo(COHORT_FADE.floor, 6)
  })

  it('the floor is > 0 — the tail is DE-EMPHASIZED, never hidden (hiding fabricates an earlier horizon)', () => {
    expect(COHORT_FADE.floor).toBeGreaterThan(0)
    expect(cohortFadeOpacity(0.01)).toBeGreaterThan(0)
  })

  it('is monotonic non-decreasing in cohortFraction (more survivors ⇒ never fainter)', () => {
    let prev = -1
    for (let c = 0; c <= 1.0001; c += 0.05) {
      const o = cohortFadeOpacity(c)
      expect(o).toBeGreaterThanOrEqual(prev)
      prev = o
    }
  })

  it('a non-finite cohort is drawn faint, never confidently full (defensive)', () => {
    expect(cohortFadeOpacity(Number.NaN)).toBeCloseTo(COHORT_FADE.floor, 6)
    expect(cohortFadeOpacity(Number.POSITIVE_INFINITY)).toBeCloseTo(COHORT_FADE.floor, 6)
  })
})

describe('cohortFadeStops — the mask gradient stops along the lattice', () => {
  it('emits one stop per sample, offsets spanning 0→1, opacity tracking cohortFraction', () => {
    // a thinning cohort: full at today, near-dead at the horizon
    const samples = Array.from({ length: LATTICE_POINTS }, (_, i) => ({
      cohortFraction: 1 - i / (LATTICE_POINTS - 1),
    }))
    const stops = cohortFadeStops(samples)
    expect(stops).toHaveLength(LATTICE_POINTS)
    expect(stops[0]!.offset).toBe(0)
    expect(stops[stops.length - 1]!.offset).toBe(1)
    // today (full cohort) is fully opaque; the horizon (cohort 0) is the faint floor
    expect(stops[0]!.opacity).toBe(1)
    expect(stops[stops.length - 1]!.opacity).toBeCloseTo(COHORT_FADE.floor, 6)
    // opacity is monotone non-increasing as the cohort thins left→right
    for (let i = 1; i < stops.length; i++) {
      expect(stops[i]!.opacity).toBeLessThanOrEqual(stops[i - 1]!.opacity)
    }
  })

  it('an absent cohortFraction (a hand-built fixture) reads as a full cohort — full opacity', () => {
    const stops = cohortFadeStops([{}, {}, {}])
    for (const s of stops) expect(s.opacity).toBe(1)
  })
})

// ── the hover/scrub geometry (snap + readout placement) ───────────────────────────────────────
describe('nearestLatticeIndex — snap a cursor x to the nearest sampled column', () => {
  const N = LATTICE_POINTS // 49

  it('the plot edges snap to the first / last lattice index', () => {
    expect(nearestLatticeIndex(PLOT.left, N)).toBe(0)
    expect(nearestLatticeIndex(PLOT.right, N)).toBe(N - 1)
  })

  it('the exact plot midpoint snaps to the middle lattice index (49 is odd → a real midpoint)', () => {
    expect(nearestLatticeIndex(PLOT.left + PLOT_W / 2, N)).toBe((N - 1) / 2)
  })

  it('an x EXACTLY on a lattice vertex returns that index (round-trip with xForYear)', () => {
    // pick a few indices, map to their x via the same domain xForYear uses, snap back.
    for (const i of [1, 7, 24, 40, 48]) {
      const x = PLOT.left + (i / (N - 1)) * PLOT_W
      expect(nearestLatticeIndex(x, N)).toBe(i)
    }
  })

  it('rounds to the NEAREST vertex (just past the half-step rounds up)', () => {
    const stepX = PLOT_W / (N - 1)
    // a hair past the midpoint between vertex 10 and 11 rounds to 11
    expect(nearestLatticeIndex(PLOT.left + 10.5 * stepX + 0.01, N)).toBe(11)
    // a hair before rounds to 10
    expect(nearestLatticeIndex(PLOT.left + 10.5 * stepX - 0.01, N)).toBe(10)
  })

  it('clamps an out-of-plot cursor to the valid index range (never a NaN / out-of-bounds index)', () => {
    expect(nearestLatticeIndex(PLOT.left - 9999, N)).toBe(0)
    expect(nearestLatticeIndex(PLOT.right + 9999, N)).toBe(N - 1)
  })

  it('defensive: a non-finite x or a degenerate lattice count yields the today anchor (0)', () => {
    expect(nearestLatticeIndex(Number.NaN, N)).toBe(0)
    expect(nearestLatticeIndex(200, 1)).toBe(0)
    expect(nearestLatticeIndex(200, 0)).toBe(0)
  })
})

describe('placeReadoutBox — the box never clips an edge AND never paints over the rule', () => {
  it('a left-half scrub puts the box to the RIGHT of the rule; a right-half scrub flips it LEFT', () => {
    const leftRule = PLOT.left + 0.2 * PLOT_W
    const rightRule = PLOT.left + 0.9 * PLOT_W
    expect(placeReadoutBox(leftRule, READOUT_W).tx).toBe(leftRule + READOUT_GAP)
    // right-half rule flips the box LEFT; its right edge is the rule minus the gap.
    const right = placeReadoutBox(rightRule, READOUT_W)
    expect(right.tx + READOUT_W).toBeCloseTo(rightRule - READOUT_GAP, 6)
  })

  // The CORE invariant of the flip fix: at EVERY lattice vertex the box must stay inside the plot AND
  // never contain the rule x (the opaque box must not paint over the live "where I'm pointing" rule).
  // The old fixed-0.6 threshold violated this for the dead-center vertices (i≈24–28); this sweep is the
  // planted regression guard — it FAILS against the old threshold and passes now.
  it('at every one of the 49 lattice vertices the box stays in-plot AND the rule x is never inside it', () => {
    for (let i = 0; i < LATTICE_POINTS; i++) {
      const scrubX = PLOT.left + (i / (LATTICE_POINTS - 1)) * PLOT_W
      const { tx } = placeReadoutBox(scrubX, READOUT_W)
      // in-plot (no left/right clip)
      expect(tx, `vertex ${i} left edge`).toBeGreaterThanOrEqual(PLOT.left)
      expect(tx + READOUT_W, `vertex ${i} right edge`).toBeLessThanOrEqual(PLOT.right + 1e-6)
      // rule NOT strictly inside the box span [tx, tx+W] (no occlusion of the rule/dots)
      const ruleInside = scrubX > tx + 1e-6 && scrubX < tx + READOUT_W - 1e-6
      expect(ruleInside, `vertex ${i} (x=${scrubX.toFixed(1)}) rule inside box [${tx.toFixed(1)}, ${(tx + READOUT_W).toFixed(1)}]`).toBe(false)
    }
  })

  it('forces the edge clamp non-vacuously: a left-flipped scrub just past the boundary clamps tx to PLOT.left', () => {
    // scrubX just above the flip boundary (PLOT.right − GAP − W = 302): the left-placed raw (scrubX −
    // GAP − W) goes below PLOT.left and MUST clamp to PLOT.left — deleting the clamp would clip the left
    // edge here. (At the old test's edges the clamp never fired, so it could be deleted green.)
    const scrubX = PLOT.right - READOUT_GAP - READOUT_W + 4 // 306
    const { tx } = placeReadoutBox(scrubX, READOUT_W)
    expect(tx).toBe(PLOT.left)
    expect(tx + READOUT_W).toBeLessThanOrEqual(PLOT.right)
    expect(scrubX).toBeGreaterThanOrEqual(tx + READOUT_W) // rule still clear of (right-of) the box
  })

  it('is pinned to the fixed top gutter (never bobs with the cursor, never covers the mid-plot median)', () => {
    expect(placeReadoutBox(PLOT.left + 50, READOUT_W).ty).toBe(READOUT_TOP)
    expect(placeReadoutBox(PLOT.right - 50, READOUT_W).ty).toBe(READOUT_TOP)
    expect(READOUT_TOP).toBeLessThan((PLOT.top + PLOT.bottom) / 2) // sits above the plot's vertical middle
  })
})

describe('isThinCohort — the dead-cohort dollar-withdrawal gate (bound to the visual fade onset)', () => {
  it('withdraws (thin) strictly BELOW the COHORT_FADE.full onset, shows dollars AT/above it', () => {
    expect(isThinCohort(COHORT_FADE.full)).toBe(false) // at the onset → still crisp (matches full opacity)
    expect(isThinCohort(COHORT_FADE.full - 0.001)).toBe(true) // just below → withdraw
    expect(isThinCohort(1)).toBe(false) // full cohort → crisp
    expect(isThinCohort(0)).toBe(true) // dead cohort → withdraw
  })

  it('the withdrawal onset is PINNED to the visual fade onset — both switch at COHORT_FADE.full, same direction', () => {
    // The honesty coupling: the readout stops showing crisp dollars EXACTLY where the fan stops being
    // full-opacity. If someone moves one onset and not the other, this fails loud.
    expect(isThinCohort(COHORT_FADE.full)).toBe(false)
    expect(cohortFadeOpacity(COHORT_FADE.full)).toBe(1) // full opacity at the onset
    expect(isThinCohort(COHORT_FADE.full - 0.05)).toBe(true)
    expect(cohortFadeOpacity(COHORT_FADE.full - 0.05)).toBeLessThan(1) // already fading just below
  })

  it('a non-finite or absent cohort reads as a FULL cohort (not thin) — the BandSample default', () => {
    expect(isThinCohort(undefined)).toBe(false)
    expect(isThinCohort(Number.NaN)).toBe(false)
  })
})

describe('selectAtRangeColumn — the AT (screen-reader) range column (council 2026-06-29)', () => {
  const sample = (cohortFraction: number): BandSample => ({
    yearsFromNow: 0,
    p10: 0,
    p25: 0,
    p50: 0,
    p75: 0,
    p90: 0,
    cohortFraction,
  })
  const samples = (cohorts: number[]): BandSample[] => cohorts.map(sample)

  it('the cleanliness floor sits COMFORTABLY ABOVE the fade onset (never the survivor-dominated gate edge)', () => {
    expect(AT_RANGE_COHORT_MIN).toBeGreaterThan(COHORT_FADE.full)
  })

  it('picks the DEEPEST interior column whose cohort clears the floor', () => {
    // cohort is monotone non-increasing; indices 1,2,3 clear 0.75 → the DEEPEST of them (3) is chosen.
    expect(selectAtRangeColumn(samples([1, 1, 0.9, 0.8, 0.6, 0.4, 0.2]), AT_RANGE_COHORT_MIN)).toBe(3)
  })

  it('EXCLUDES the horizon even when it qualifies (planted-fail: the terminal slice is never the AT range)', () => {
    // every column is a full cohort, so the horizon (index 4) clears too — but it is excluded, and the
    // deepest INTERIOR column (index 3) wins. Remove the n-2 cap and this returns 4.
    expect(selectAtRangeColumn(samples([1, 1, 1, 1, 1]), AT_RANGE_COHORT_MIN)).toBe(3)
  })

  it('EXCLUDES the today anchor (index 0, zero dispersion) — withdraws rather than quote it', () => {
    // only today clears the floor; every interior column is thin → withdraw to silence, NEVER index 0.
    expect(selectAtRangeColumn(samples([1, 0.4, 0.3, 0.2, 0.1]), AT_RANGE_COHORT_MIN)).toBeNull()
  })

  it('WITHDRAWS (null) when no interior column clears the floor — even a NON-thin column below it is skipped', () => {
    // 0.6 is NOT thin (> COHORT_FADE.full = 0.5) yet below the cleanliness floor → still not quoted.
    expect(isThinCohort(0.6)).toBe(false)
    expect(selectAtRangeColumn(samples([1, 0.6, 0.6, 0.6, 0.6]), AT_RANGE_COHORT_MIN)).toBeNull()
  })

  it('honors an arbitrary cohortMin (the floor is a parameter; the constant is only the production value)', () => {
    // at a 0.5 floor the same 0.6 columns qualify → the deepest interior (index 3).
    expect(selectAtRangeColumn(samples([1, 0.6, 0.6, 0.6, 0.6]), 0.5)).toBe(3)
  })

  it('an absent cohortFraction never qualifies (a hand-built fixture row is skipped, never quoted)', () => {
    const mixed = samples([1, 0.9, 0.8, 0.7, 0.6])
    const withGap = [mixed[0]!, { ...mixed[1]!, cohortFraction: undefined }, mixed[2]!, mixed[3]!, mixed[4]!]
    // index 2 (0.8) is the deepest interior clearing 0.75 — index 1's absent cohort is skipped.
    expect(selectAtRangeColumn(withGap, AT_RANGE_COHORT_MIN)).toBe(2)
  })
})

// Cold-read 2026-07-03 — the chart ENDS where the cohort thins (the honest cut replaced the
// faded tail; one law with TwoFutures' median truncation).
describe('truncateFanAtThinCohort', () => {
  const yr = (cohortFraction: number) => ({ cohortFraction })

  it('cuts the grid after the last ≥ COHORT_FADE.full year', () => {
    const grid = [yr(1), yr(0.9), yr(0.6), yr(0.5), yr(0.3), yr(0.1)]
    expect(truncateFanAtThinCohort(grid)).toEqual([yr(1), yr(0.9), yr(0.6), yr(0.5)])
  })

  it('a fan with no thin tail passes through IDENTICALLY (the no-op stays a no-op)', () => {
    const grid = [yr(1), yr(0.8), yr(0.6)]
    expect(truncateFanAtThinCohort(grid)).toBe(grid)
  })

  it('a fan already thin by its second year passes through untouched (nothing left to cut to)', () => {
    const grid = [yr(1), yr(0.2), yr(0.1)]
    expect(truncateFanAtThinCohort(grid)).toBe(grid)
  })

  it('a NaN cohort never counts as full (finiteness-first)', () => {
    const grid = [yr(1), yr(0.7), yr(Number.NaN), yr(0.1)]
    expect(truncateFanAtThinCohort(grid)).toEqual([yr(1), yr(0.7)])
  })
})
