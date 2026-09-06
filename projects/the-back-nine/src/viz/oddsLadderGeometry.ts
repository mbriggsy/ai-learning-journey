/*
 * src/viz/oddsLadderGeometry.ts — pure SVG coordinate math for the D2c OddsLadder (council-decided
 * 2026-06-28). No React, no strings, no engine: maps a discrete set of {@link CurveMark}s onto the
 * ladder's FIXED viewBox. Pure + deterministic so the rendered geometry is stable across recompute
 * (a morph must be pure signal, never float jitter) and unit-testable without rendering — mirrors
 * bandGeometry.ts.
 *
 * THE HONEST AXES (back-nine-design §3 — no truncated / exaggerating axes):
 *   - y is the FULL 0..{@link LADDER_MAX_RUNG} integer odds ladder. rung 0 sits on the plot floor,
 *     rung 10 at the top. The top rung is the engine's CEILING ("better than 9 in 10") — NO position
 *     ever means "10 of 10 / certain" (the curveMarks atCeiling clamp + the injected slots.xOfTen
 *     ceiling label carry that). The on-track bar draws at the TRUE {@link BAR_RUNG} = 8.5 midpoint
 *     between the highest failing rung (8) and the lowest clearing rung (9), so clears-vs-dips reads
 *     by POSITION (above/below the bar), never by hue.
 *   - x is the household clock in whole years-from-now, linear on [0, domainMaxYears] (the window
 *     top). A mark sits at its TRUE offset position, so uneven sweep spacing shows the real time gaps
 *     — never evenly-spaced/categorical, which would distort "how soon".
 *
 * Coordinates are trimmed to a fixed precision so the emitted geometry is byte-stable for a given
 * mark set (the screenshot-determinism contract).
 */

import { BAR_RUNG, LADDER_MAX_RUNG } from './curveMarks'

/** The single fixed viewBox. Both ladder render contexts share it; the container scales it via
 *  width:100% + preserveAspectRatio, and `non-scaling-stroke` holds line weight constant across
 *  viewports. Landscape (time across, a short 0–10 ladder up) — the ladder is wider than tall.
 *  The svg holds GEOMETRY ONLY (council wf_ecbe0ab2-7bb, 2026-09-05 — "SVG draws, HTML writes"):
 *  the x-axis offset labels + caption are an HTML block in flow under the svg, so the height
 *  reserves no label gutter below the floor — just an 8-unit margin. (Was 340 with a 64-unit
 *  gutter for svg text that rendered at 7.0–8.7 CSS px.) */
export const VIEWBOX = { width: 560, height: 284 } as const

/** The plot rectangle inside the viewBox: room left for the rung axis + the bar's "on track" label
 *  (HTML at --text-xs, end-anchored 8 units left of the axis. 84 units = 0.15 of the figure, and
 *  "on track" is a FIXED 44.3px of ink at --text-xs, so the column holds it only above a ~365px
 *  figure: measured inside at 358/408/496 (2026-09-05); on the chart-text gate's 320 arm the 288px
 *  figure gives a 43.2px column and the label sits ~1px into the page gutter — rendered by that arm,
 *  bounded there by `main.result` (the page column, the ladder's only padded ancestor), never by the
 *  figure. What yields there is HELD council work (docs/council-log.md 2026-09-05): do NOT tighten
 *  the bound and do NOT move `left` off the 92 it shares with bandGeometry and TF_PLOT to buy the
 *  pixel back), a top margin so a rung-10 (ceiling) dot has headroom (it is
 *  never clipped at the very edge — the headroom is itself the "you can never reach certain"
 *  signal; the crown's callout stacks ABOVE its dot at every rung below the ceiling and sits BESIDE it
 *  only at rung 10 — OddsLadder's CROWN_SIDE_RUNG), and the floor at the bottom. */
export const PLOT = {
  left: 92,
  right: 528,
  /** 56 (was 40 in the svg-text era): the headroom above the ceiling rung now also seats the crown's
   *  two-line HTML callout ABOVE a rung-9 dot on the narrowest arm. A rung-9 crown gets MORE than
   *  these 56 units: its dot sits one rung lower (yForRung(9) = 78) and the callout's bottom anchors
   *  a further CROWN_RING_R + 5 = 14 units up, at 64 — which on a 358px phone figure renders ~41 CSS
   *  px against a callout measured at 36.6 px, ~4 px of clearance (2026-09-05). On the 320 arm and
   *  at a raised browser font that clearance goes negative — what yields is HELD council work
   *  (docs/council-log.md 2026-09-05); moving this value was REJECTED there (64 ties by 0.17px, 68
   *  compresses every rung on every arm). */
  top: 56,
  /** rung 0 — the floor (0 of 10). */
  bottom: 276,
} as const

export const PLOT_W = PLOT.right - PLOT.left
export const PLOT_H = PLOT.bottom - PLOT.top

/** Decimal places kept in emitted coordinates (stable string, sub-pixel-smooth). */
const COORD_DP = 3
const roundCoord = (n: number): number => {
  const f = 10 ** COORD_DP
  return Math.round(n * f) / f
}

function clamp01(t: number): number {
  return t < 0 ? 0 : t > 1 ? 1 : t
}

/** Map a household-clock offset (whole years from now) to an svg x. Linear on the FIXED domain
 *  [0, domainMaxYears]. A non-finite input is a caller bug — fail loud. domainMaxYears === 0 is the
 *  legitimate free-today degenerate (every evaluated offset is today): all marks collapse onto the
 *  left edge rather than divide by zero. A negative domain is impossible (offsets are ≥ 0) → throw. */
export function xForOffset(offsetYears: number, domainMaxYears: number): number {
  if (!Number.isFinite(offsetYears) || !Number.isFinite(domainMaxYears)) {
    throw new RangeError('xForOffset: inputs must be finite')
  }
  if (domainMaxYears < 0) {
    throw new RangeError('xForOffset: domainMaxYears must be ≥ 0 (offsets are never negative)')
  }
  if (domainMaxYears === 0) return PLOT.left // free-today: every offset is today
  const t = clamp01(offsetYears / domainMaxYears)
  return roundCoord(PLOT.left + t * PLOT_W)
}

/** Map an odds rung (0..{@link LADDER_MAX_RUNG}) to an svg y. LINEAR, rung 0 at the floor, rung 10 at
 *  the top. The rung is clamped to [0, MAX]: a ceiling mark (rung 10) lands at the top, never above
 *  it; the headroom above sits between PLOT.top and the viewBox edge. A non-finite rung is a caller
 *  bug — fail loud (never a NaN y painting a dot at the origin). */
export function yForRung(rung: number): number {
  if (!Number.isFinite(rung)) {
    throw new RangeError('yForRung: rung must be finite')
  }
  const r = rung < 0 ? 0 : rung > LADDER_MAX_RUNG ? LADDER_MAX_RUNG : rung
  const t = r / LADDER_MAX_RUNG // 0 at rung 0 (floor), 1 at rung 10 (top)
  return roundCoord(PLOT.bottom - t * PLOT_H)
}

/** The on-track bar's y — drawn at the TRUE 8.5 midpoint between failing-8 and clearing-9, so a
 *  clearing dot (rung ≥ 9) reads visibly above it and a failing dot (rung ≤ 8) below. Single-sourced
 *  from {@link BAR_RUNG} (bound to the engine's BANDS.onTrack·10 in curveMarks.test.ts). */
export const BAR_Y = yForRung(BAR_RUNG)

/** The y of every integer rung 0..10, for the faint reference grid the renderer draws (the ladder's
 *  rungs are the readable detents — odds are read at this coarse grid, never a smooth %). */
export const RUNG_YS: readonly { readonly rung: number; readonly y: number }[] = Array.from(
  { length: LADDER_MAX_RUNG + 1 },
  (_, rung) => ({ rung, y: yForRung(rung) }),
)

/** The household-clock domain top for a mark set: the latest evaluated offset (≈ the window top).
 *  Anchoring x at [0, maxOffset] places the rightmost mark at the right edge and keeps today (offset
 *  0) at the left — the honest household clock. An empty set yields 0 (the free-today collapse). */
export function domainMaxYears(offsets: readonly number[]): number {
  let max = 0
  for (const o of offsets) if (Number.isFinite(o) && o > max) max = o
  return max
}

/** Snap a viewBox x to the NEAREST evaluated offset's index — the ladder scrub's locate (the band's
 *  nearestLatticeIndex analog, cold-read 2026-07-03: the ladder reads by hover like the fan chart).
 *  Pure + exported for the unit test; ≤ 11 marks makes the linear scan the simplest honest thing.
 *  A non-finite x or an empty set yields null (never a NaN index). */
export function nearestOffsetIndex(
  x: number,
  offsets: readonly number[],
  domainMax: number,
): number | null {
  if (!Number.isFinite(x) || offsets.length === 0) return null
  let best = 0
  let bestDist = Number.POSITIVE_INFINITY
  for (let i = 0; i < offsets.length; i++) {
    const d = Math.abs(xForOffset(offsets[i]!, domainMax) - x)
    if (d < bestDist) {
      bestDist = d
      best = i
    }
  }
  return best
}
