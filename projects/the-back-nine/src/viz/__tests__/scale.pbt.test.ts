import fc from 'fast-check'
import { describe, it } from 'vitest'
import { bandLightnessAt } from '../scale'
import { BAND_L_MEDIAN, BAND_L_OUTER } from '../palette'

/**
 * Property: the band lightness ramp is MONOTONIC non-decreasing and stays within its
 * declared endpoints for ANY finite position. This is the engine of the honest fan —
 * a non-monotone ramp would break the "density of ink tracks likelihood" reading and let
 * the ordering invert under grayscale (back-nine-design §3).
 */
describe('scale — band lightness properties', () => {
  const finite = fc.double({ min: -1e6, max: 1e6, noNaN: true, noDefaultInfinity: true })

  it('is monotonic non-decreasing in the position', () => {
    fc.assert(
      fc.property(finite, finite, (a, b) => {
        const [lo, hi] = a <= b ? [a, b] : [b, a]
        return bandLightnessAt(lo) <= bandLightnessAt(hi)
      }),
    )
  })

  it('never leaves the declared [median, outer] lightness band', () => {
    fc.assert(
      fc.property(finite, (p) => {
        const l = bandLightnessAt(p)
        return l >= BAND_L_MEDIAN && l <= BAND_L_OUTER
      }),
    )
  })
})
