import { describe, expect, it } from 'vitest'
import { bandLightnessAt, rcBandStopCss } from '../scale'
import { BAND_L_MEDIAN, BAND_L_OUTER, RC_BAND } from '../palette'

/**
 * Band-ramp lerp boundaries + guards (back-nine-design §3 — the honest fan). The MONOTONIC
 * property over arbitrary positions lives in scale.pbt.test.ts; the CVD-safety of the rendered
 * ramp (luminance ordering survives grayscale + every CVD sim) lives in colorblind.test.tsx.
 * Bounds are re-derived from palette.ts (source-bind) — never re-typed here.
 */
describe('scale — band lightness lerp', () => {
  it('p=0 is the median (darkest / highest-emphasis) endpoint', () => {
    expect(bandLightnessAt(0)).toBe(BAND_L_MEDIAN)
  })

  it('p=1 is the outer-tail (lightest / lowest-emphasis) endpoint', () => {
    expect(bandLightnessAt(1)).toBe(BAND_L_OUTER)
  })

  it('the midpoint is the arithmetic mean of the endpoints', () => {
    expect(bandLightnessAt(0.5)).toBeCloseTo((BAND_L_MEDIAN + BAND_L_OUTER) / 2, 12)
  })

  it('lightens monotonically from median → tail across the unit interval', () => {
    const samples = [0, 0.2, 0.4, 0.6, 0.8, 1].map(bandLightnessAt)
    for (let i = 1; i < samples.length; i++) {
      expect(samples[i]!).toBeGreaterThan(samples[i - 1]!)
    }
  })

  it('clamps out-of-range positions to the endpoints (defensive, never extrapolates)', () => {
    expect(bandLightnessAt(-2)).toBe(BAND_L_MEDIAN)
    expect(bandLightnessAt(5)).toBe(BAND_L_OUTER)
  })

  it('throws on a non-finite position (finiteness-first — a NaN passes every relational guard)', () => {
    expect(() => bandLightnessAt(Number.NaN)).toThrow(RangeError)
    expect(() => bandLightnessAt(Number.POSITIVE_INFINITY)).toThrow(RangeError)
  })
})

describe('scale — the clone band’s CSS stop', () => {
  it('emits a stable, trimmed oklch() string at the fixed hue and chroma (no float jitter on recompute)', () => {
    expect(rcBandStopCss(0)).toBe(`oklch(${BAND_L_MEDIAN} ${RC_BAND.chroma} ${RC_BAND.hue})`)
    expect(rcBandStopCss(1)).toBe(`oklch(${BAND_L_OUTER} ${RC_BAND.chroma} ${RC_BAND.hue})`)
    // an awkward position trims deterministically to ≤ 4 decimals (0.42 + 0.4/3 = 0.5533…)
    expect(rcBandStopCss(1 / 3)).toBe(`oklch(0.5533 ${RC_BAND.chroma} ${RC_BAND.hue})`)
  })

  it('throws on a non-finite position', () => {
    expect(() => rcBandStopCss(Number.NaN)).toThrow(RangeError)
  })
})
