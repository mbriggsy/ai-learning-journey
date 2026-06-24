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
 *  line weight + dash geometry constant in screen px across viewports. */
export const VIEWBOX = { width: 560, height: 460 } as const

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
 *  A non-positive horizon collapses to the left edge (defensive — never divide by zero). */
export function xForYear(yearsFromNow: number, horizonYears: number): number {
  if (!Number.isFinite(yearsFromNow) || !Number.isFinite(horizonYears)) {
    throw new RangeError('xForYear: inputs must be finite')
  }
  if (horizonYears <= 0) return PLOT.left
  const t = clamp01(yearsFromNow / horizonYears)
  return roundCoord(PLOT.left + t * PLOT_W)
}

/** Map a real-dollar value to an svg y. LINEAR, $0 anchored at the plot floor, `dollarMax` at
 *  the plot top. Dollars are clamped to [0, dollarMax]: a depleted ($0) path lands EXACTLY on
 *  the floor (the ruin signal), never below the axis; a value above the ceiling clamps to the
 *  top rather than escaping the plot. */
export function yForDollars(dollars: number, dollarMax: number): number {
  if (!Number.isFinite(dollars) || !Number.isFinite(dollarMax)) {
    throw new RangeError('yForDollars: inputs must be finite')
  }
  if (dollarMax <= 0) return PLOT.bottom
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
  const pt = (s: BandSample, key: keyof BandSample): [number, number] => [
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

function clamp01(t: number): number {
  return t < 0 ? 0 : t > 1 ? 1 : t
}
