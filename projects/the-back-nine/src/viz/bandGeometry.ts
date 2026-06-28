/*
 * src/viz/bandGeometry.ts — pure SVG-path math for the ConfidenceBand. No React, no strings,
 * no engine: maps a percentile fan (real $, household-clock years) onto the band's FIXED
 * viewBox. Pure + deterministic so the path strings are stable across recompute (a morph must
 * be pure signal, never float jitter), and unit-testable without rendering (mirrors scale.ts).
 *
 * THE HONEST AXES (back-nine-design §3):
 *   - y is LINEAR portfolio value, anchored at $0 (the plot floor). A depleted path reads $0
 *     and draws TOUCHING the axis — the ruin signal a log scale could never show. Dollars are
 *     clamped to [0, dollarMax]: a $0 path sits exactly on the floor, never below it.
 *   - x is a household clock in years-from-now, linear on the FIXED domain [0, horizonYears].
 *     The domain top is held stable by the caller, so lattice x-positions never reflow on a
 *     recompute (the morph rides a constant x-lattice).
 *
 * Coordinates are trimmed to a fixed precision so the emitted `d` string is byte-stable for a
 * given fan (the screenshot-determinism contract).
 */

import type { BandSample } from './bandData'

/** The single fixed viewBox. ALL band variants (drawer + enlarged) share it; the container
 *  scales it via width:100%/height:auto + preserveAspectRatio, and `non-scaling-stroke` keeps
 *  line weight + dash geometry constant in screen px across viewports. The height reserves a
 *  label gutter BELOW the $0 baseline (PLOT.bottom) deep enough for the de-collision's stacked
 *  rows — the normal retirement-couple case (Today + two close retirements within a few years)
 *  needs THREE rows, whose deepest line lands at PLOT.bottom + 112 = 484 (< 500). */
export const VIEWBOX = { width: 560, height: 500 } as const

/** The plot rectangle inside the viewBox (room left for the y labels and the x annotations). */
export const PLOT = {
  left: 78,
  right: 540,
  top: 30,
  /** The $0 baseline — the ruin floor. */
  bottom: 372,
} as const

export const PLOT_W = PLOT.right - PLOT.left
export const PLOT_H = PLOT.bottom - PLOT.top

/** Decimal places kept in emitted coordinates (stable string, sub-pixel-smooth). */
const COORD_DP = 3
const roundCoord = (n: number): number => {
  const f = 10 ** COORD_DP
  return Math.round(n * f) / f
}

/** Map a household-clock year to an svg x. Linear on the FIXED domain [0, horizonYears].
 *  A non-positive horizon is a caller bug — fail loud (mirrors the non-finite guard), never
 *  divide by zero and never silently collapse the x-lattice onto the left edge. */
export function xForYear(yearsFromNow: number, horizonYears: number): number {
  if (!Number.isFinite(yearsFromNow) || !Number.isFinite(horizonYears)) {
    throw new RangeError('xForYear: inputs must be finite')
  }
  if (horizonYears <= 0) {
    throw new RangeError('xForYear: horizonYears must be positive (a non-positive horizon is a caller bug, never a drawable state)')
  }
  const t = clamp01(yearsFromNow / horizonYears)
  return roundCoord(PLOT.left + t * PLOT_W)
}

/** Map a real-dollar value to an svg y. LINEAR, $0 anchored at the plot floor, `dollarMax` at
 *  the plot top. Dollars are clamped to [0, dollarMax]: a depleted ($0) path lands EXACTLY on
 *  the floor (the ruin signal), never below the axis; a value above the ceiling clamps to the
 *  top rather than escaping the plot. A non-positive `dollarMax` is a caller bug — fail loud,
 *  exactly like a non-finite one: a degenerate ceiling has no honest household state behind it,
 *  and silently returning the floor would paint a HEALTHY fan flat on the $0 ruin baseline
 *  (byte-identical to total ruin) — the calm-but-wrong sin in its most literal form. */
export function yForDollars(dollars: number, dollarMax: number): number {
  if (!Number.isFinite(dollars) || !Number.isFinite(dollarMax)) {
    throw new RangeError('yForDollars: inputs must be finite')
  }
  if (dollarMax <= 0) {
    throw new RangeError('yForDollars: dollarMax must be positive (a non-positive ceiling never paints a healthy fan as ruin)')
  }
  const v = dollars < 0 ? 0 : dollars > dollarMax ? dollarMax : dollars
  const t = v / dollarMax // 0 at $0, 1 at ceiling
  return roundCoord(PLOT.bottom - t * PLOT_H)
}

/**
 * Build a FILLED band-area path between a lower and an upper percentile across the lattice:
 * the upper edge left→right, then the lower edge right→left, closed. Straight line segments
 * between lattice points — honest (no smoothing that invents values between samples); a dense
 * lattice reads smooth on screen. The command STRUCTURE is fixed by the lattice length, so two
 * fans of the same lattice produce interpolation-compatible `d` strings (the morph contract).
 */
export function areaPath(
  samples: readonly BandSample[],
  lowerKey: 'p10' | 'p25',
  upperKey: 'p90' | 'p75',
  horizonYears: number,
  dollarMax: number,
): string {
  if (samples.length === 0) return ''
  const pt = (s: BandSample, key: 'p10' | 'p25' | 'p75' | 'p90'): [number, number] => [
    xForYear(s.yearsFromNow, horizonYears),
    yForDollars(s[key], dollarMax),
  ]
  let d = ''
  // upper edge, left → right
  samples.forEach((s, i) => {
    const [x, y] = pt(s, upperKey)
    d += `${i === 0 ? 'M' : 'L'}${x},${y}`
  })
  // lower edge, right → left
  for (let i = samples.length - 1; i >= 0; i--) {
    const [x, y] = pt(samples[i]!, lowerKey)
    d += `L${x},${y}`
  }
  return `${d}Z`
}

/** Build the median polyline (the p50 overlay) left→right. Drawn as a stroked, unfilled path,
 *  rendered as an OPACITY overlay on top of the fills — never part of a morphed envelope. */
export function linePath(
  samples: readonly BandSample[],
  key: 'p50',
  horizonYears: number,
  dollarMax: number,
): string {
  if (samples.length === 0) return ''
  let d = ''
  samples.forEach((s, i) => {
    const x = xForYear(s.yearsFromNow, horizonYears)
    const y = yForDollars(s[key], dollarMax)
    d += `${i === 0 ? 'M' : 'L'}${x},${y}`
  })
  return d
}

/**
 * The indeterminate placeholder envelope: a deliberately WIDE band that does NOT trace any
 * data. Two gentle arcs (a wide top, a wide bottom) spanning most of the plot height, with a
 * dashed boundary applied at the stroke level (the non-color texture). NO median. This shape
 * is intentionally un-data-like so it can never be mistaken for a confident answer.
 */
export function placeholderPath(horizonYears: number): string {
  const x0 = xForYear(0, horizonYears)
  const x1 = xForYear(horizonYears, horizonYears)
  const top = roundCoord(PLOT.top + PLOT_H * 0.18)
  const bottom = roundCoord(PLOT.bottom - PLOT_H * 0.12)
  const midX = roundCoord((x0 + x1) / 2)
  // wide envelope: a shallow top arc and a shallow bottom arc, closed.
  return (
    `M${x0},${top}` +
    `Q${midX},${roundCoord(top - PLOT_H * 0.06)} ${x1},${top}` +
    `L${x1},${bottom}` +
    `Q${midX},${roundCoord(bottom + PLOT_H * 0.06)} ${x0},${bottom}` +
    `Z`
  )
}

/** Clamp an svg x to the plot's horizontal span (a label rule never escapes the plot). */
export function clampX(x: number): number {
  return x < PLOT.left ? PLOT.left : x > PLOT.right ? PLOT.right : x
}

// ── dead-cohort de-emphasis (back-nine-design §3) ─────────────────────────────────────────────
// A band slice backed by FEW surviving couples is small-sample noise (the late-year jitter — a $0
// floor or a fortune from a handful of paths). It must draw QUIET: present (we DO model those years,
// so it is never erased — that would read as a confident early end) but never shouting a small-cohort
// spike as if it were signal. The render fades the fan's opacity along x by cohortFraction; this is
// the pure tuning math (unit-tested), consumed as SVG-mask gradient stops by ConfidenceBand.

/** The fade curve (cold-read-TUNABLE): opacity is FULL at/above `full`, ramps linearly to a faint
 *  `floor` at/below `floorAt`. `floor` is > 0 by design — the thin tail is DE-EMPHASIZED, never
 *  hidden (hiding it would fabricate a confident earlier horizon). */
export const COHORT_FADE = { full: 0.5, floorAt: 0.04, floor: 0.12 } as const

/** Map a sample's cohortFraction (∈ [0,1]) to its band opacity. A non-finite cohort draws at the
 *  floor (defensive — a thin/garbled slice is quiet, never confidently full). */
export function cohortFadeOpacity(cohortFraction: number): number {
  const { full, floorAt, floor } = COHORT_FADE
  if (!Number.isFinite(cohortFraction)) return floor
  const t = clamp01((cohortFraction - floorAt) / (full - floorAt))
  return roundCoord(floor + (1 - floor) * t)
}

/** Gradient stops for the cohort-fade mask: one per sample, `offset` = its position on the fixed
 *  x-lattice (i/(n-1) — the lattice is evenly spaced, so this maps to its svg x), `opacity` from the
 *  fade curve. An absent cohortFraction (a hand-built fixture) reads as a full cohort. */
export function cohortFadeStops(
  samples: readonly { readonly cohortFraction?: number }[],
): { readonly offset: number; readonly opacity: number }[] {
  const n = samples.length
  return samples.map((s, i) => ({
    offset: n <= 1 ? 1 : roundCoord(i / (n - 1)),
    opacity: cohortFadeOpacity(s.cohortFraction ?? 1),
  }))
}

// ── annotation label placement (pure, testable) ──────────────────────────────────────────────
// The household-clock annotations (Today / each retirement / survivor boundary / horizon) render
// as a vertical rule + a two-line text label (name + both spouses' ages). When two moments sit
// close on the x-axis their labels would overprint, so the placer stacks a colliding label onto a
// lower ROW. The placement is WIDTH-AWARE (a wide, edge-anchored label collides even at a generous
// center-gap) and lives HERE as pure math so it is unit-testable without rendering.

export type LabelAnchor = 'start' | 'middle' | 'end'

/** Comfortable clear-space (viewBox px) required between two same-row label boxes. */
export const LABEL_PAD = 12
/** Approx advance width (viewBox px) of one glyph at the 12.5px Source Sans 3 label — generous so
 *  placement errs toward breathing room rather than overlap. */
export const LABEL_CHAR_PX = 6.6
/** Rows the placer may stack into. THREE — the normal retirement-couple case clusters THREE close
 *  moments at the left (Today, pinned at the edge, plus two retirements a few years out and a few
 *  years apart), so two rows cannot separate them (Today pushes the first retirement to row 1, and
 *  the second retirement then collides with it there). The viewBox height reserves room for all
 *  three rows below the $0 baseline (deepest line at PLOT.bottom + 112 < VIEWBOX.height). */
export const LABEL_ROWS = 3

/** Anchor for a label at viewBox x: end-anchored near the right edge (so its text never spills past
 *  the plot), start-anchored near the left, middle otherwise. */
export function labelAnchor(x: number): LabelAnchor {
  return x > PLOT.right - 28 ? 'end' : x < PLOT.left + 28 ? 'start' : 'middle'
}

/** The horizontal box [left, right] a label occupies, given its anchor + its widest line's length. */
export function labelExtent(x: number, anchor: LabelAnchor, chars: number): [number, number] {
  const w = chars * LABEL_CHAR_PX
  if (anchor === 'end') return [x - w, x]
  if (anchor === 'start') return [x, x + w]
  return [x - w / 2, x + w / 2]
}

export interface PlacedLabel {
  /** The annotation's clamped svg x (where the rule sits). */
  readonly x: number
  readonly anchor: LabelAnchor
  /** The row this label stacks onto (0 = top row, 1 = staggered below). */
  readonly level: number
  /** The label's occupied [left, right] box, for overlap assertions. */
  readonly extent: readonly [number, number]
}

/**
 * Greedy multi-row label placement. For each annotation (LEFT→RIGHT by `yearsFromNow`), drop its
 * label onto the FIRST row whose running right-edge it clears by {@link LABEL_PAD} — consulting
 * THAT row's edge, not always row 0 (the row-1 collision bug: two close labels both fell to row 1
 * and overlapped because row 1's own running edge was written but never read). If no row clears
 * (extreme density) it lands on the last row — a rare graceful degrade, never a crash.
 *
 * Each input carries the moment's x-year and its widest text line's char count (max of the name
 * line and the ages line). Returns one {@link PlacedLabel} per input, in the same order.
 */
export function placeAnnotationLabels(
  items: readonly { readonly yearsFromNow: number; readonly chars: number }[],
  horizonYears: number,
): PlacedLabel[] {
  const rowRight = new Array<number>(LABEL_ROWS).fill(Number.NEGATIVE_INFINITY)
  return items.map((it) => {
    const x = clampX(xForYear(it.yearsFromNow, horizonYears))
    const anchor = labelAnchor(x)
    const extent = labelExtent(x, anchor, it.chars)
    let level = rowRight.findIndex((edge) => extent[0] >= edge + LABEL_PAD)
    if (level === -1) level = LABEL_ROWS - 1
    rowRight[level] = extent[1]
    return { x, anchor, level, extent }
  })
}

function clamp01(t: number): number {
  return t < 0 ? 0 : t > 1 ? 1 : t
}
