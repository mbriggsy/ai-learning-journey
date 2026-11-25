/*
 * src/viz/scale.ts — pure band-ramp math. Maps a normalized ordered position p ∈ [0, 1]
 * (0 = the median / most-likely / highest-emphasis edge, 1 = the outer tail / lowest-emphasis
 * edge) to a stop on the clone's single-hue oklch LIGHTNESS ramp (`RC_BAND` in palette.ts).
 *
 * Pure, deterministic, engine-free. Lightness is MONOTONIC non-decreasing in p, so the band's
 * ordering survives grayscale and every CVD transform (the honest-fan contract,
 * back-nine-design §3). Finiteness is checked FIRST (a NaN passes every relational guard —
 * burned insight 010); an in-range p is then clamped to [0, 1]. The old band's own ramp (its hue
 * `BAND_HUE`, `bandStopCss`) left with the last hand-drawn chart at Act 6's RC10.
 */

import { RC_BAND } from './palette'

/** Lerp the band lightness for an ordered position p (0 = median, 1 = outer tail). */
export function bandLightnessAt(p: number): number {
  if (!Number.isFinite(p)) {
    throw new RangeError(`bandLightnessAt: p must be finite, got ${p}`)
  }
  const t = p < 0 ? 0 : p > 1 ? 1 : p
  return RC_BAND.lMedian + t * (RC_BAND.lOuter - RC_BAND.lMedian)
}

/**
 * The clone's band stop at position p as an `oklch()` string: the lerped lightness at RightCapital's hue and an
 * in-gamut chroma (`RC_BAND`). Coordinates are trimmed to 4 decimals so the rendered string is stable across recompute
 * (the screenshot-determinism contract — a band morph must be pure signal, not float jitter).
 */
export function rcBandStopCss(p: number): string {
  if (!Number.isFinite(p)) {
    throw new RangeError(`rcBandStopCss: p must be finite, got ${p}`)
  }
  return `oklch(${round4(bandLightnessAt(p))} ${round4(RC_BAND.chroma)} ${round4(RC_BAND.hue)})`
}

const round4 = (n: number): number => Math.round(n * 1e4) / 1e4
