/*
 * src/viz/scale.ts — pure band-ramp math. Maps a normalized ordered position p ∈ [0, 1]
 * (0 = the median / most-likely / highest-emphasis edge, 1 = the outer tail / lowest-emphasis
 * edge) to a stop on the single-hue oklch LIGHTNESS ramp defined in palette.ts.
 *
 * Pure, deterministic, engine-free. Lightness is MONOTONIC non-decreasing in p, so the band's
 * ordering survives grayscale and every CVD transform (the honest-fan contract,
 * back-nine-design §3). Finiteness is checked FIRST (a NaN passes every relational guard —
 * burned insight 010); an in-range p is then clamped to [0, 1].
 */

import { BAND_CHROMA, BAND_HUE, BAND_L_MEDIAN, BAND_L_OUTER } from './palette'

export interface BandStop {
  /** oklch lightness ∈ [BAND_L_MEDIAN, BAND_L_OUTER]. */
  readonly l: number
  readonly c: number
  readonly h: number
}

/** Lerp the band lightness for an ordered position p (0 = median, 1 = outer tail). */
export function bandLightnessAt(p: number): number {
  if (!Number.isFinite(p)) {
    throw new RangeError(`bandLightnessAt: p must be finite, got ${p}`)
  }
  const t = p < 0 ? 0 : p > 1 ? 1 : p
  return BAND_L_MEDIAN + t * (BAND_L_OUTER - BAND_L_MEDIAN)
}

/** The full oklch stop at position p — fixed hue + chroma, lerped lightness. */
export function bandStopAt(p: number): BandStop {
  return { l: bandLightnessAt(p), c: BAND_CHROMA, h: BAND_HUE }
}

/**
 * The CSS color for a band stop — an `oklch()` string. Consumed as an SVG fill PRESENTATION
 * attribute (CSP-safe; NOT a `style` attribute — see palette.ts CSP NOTE). Components apply it
 * to `<rect fill=…>` / `<path fill=…>`, never to an inline `style`.
 *
 * Coordinates are trimmed to 4 decimals so the rendered string is stable across recompute
 * (the screenshot-determinism contract — a band morph must be pure signal, not float jitter).
 */
export function bandStopCss(p: number): string {
  const s = bandStopAt(p)
  return `oklch(${round4(s.l)} ${round4(s.c)} ${round4(s.h)})`
}

const round4 = (n: number): number => Math.round(n * 1e4) / 1e4
