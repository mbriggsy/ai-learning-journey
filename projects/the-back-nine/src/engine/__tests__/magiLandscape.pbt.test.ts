/**
 * magiLandscape — structural properties (fast-check). The targeted DND-012 fixtures live in
 * magiLandscape.test.ts; these pin the invariants the headroom translation RESTS on: metric
 * monotonicity in the fill, and headroom soundness (the returned fill never crosses its rail,
 * and one more dollar always would — the ceiling is tight, not merely safe).
 */
import { describe, it } from 'vitest'
import fc from 'fast-check'
import {
  acaMagiAtFill,
  irmaaMagiAtFill,
  taxableIncomeAtFill,
  acaCliffFillHeadroom,
  irmaaStepFillHeadroom,
  bracketEdgeFillHeadroom,
  nextIrmaaThresholdAbove,
  nextBracketEdgeAbove,
  type CommittedYearIncome,
} from '../magiLandscape'
import { irmaa } from '@engine/constants'

const ctxArb: fc.Arbitrary<CommittedYearIncome> = fc.record({
  rmd: fc.integer({ min: 0, max: 300_000 }),
  conversion: fc.integer({ min: 0, max: 500_000 }),
  ongoingTaxable: fc.integer({ min: 0, max: 300_000 }),
  ssBenefit: fc.integer({ min: 0, max: 120_000 }),
  filing: fc.constantFrom<'mfj' | 'single'>('mfj', 'single'),
  count65: fc.integer({ min: 0, max: 2 }),
  // The sunset unit: sample calendar years SPANNING the senior bonus's 2025–2028 window
  // (both edges + outside on both sides), so every property below is pinned in bonus-priced
  // AND bonus-sunset years alike — the ratified "holds every year" arm.
  calendarYear: fc.integer({ min: 2023, max: 2036 }),
})

const fillArb = fc.integer({ min: 0, max: 1_000_000 })

describe('magiLandscape — properties', () => {
  it('all three fill metrics are monotone non-decreasing in the fill', () => {
    fc.assert(
      fc.property(ctxArb, fillArb, fc.integer({ min: 0, max: 200_000 }), (c, f, bump) => {
        return (
          acaMagiAtFill(c, f + bump) >= acaMagiAtFill(c, f) &&
          irmaaMagiAtFill(c, f + bump) >= irmaaMagiAtFill(c, f) &&
          taxableIncomeAtFill(c, f + bump) >= taxableIncomeAtFill(c, f)
        )
      }),
    )
  })

  it('ACA headroom soundness: the returned fill sits at-or-under the cliff, and (when clamped by committed income) the baseline is genuinely over', () => {
    fc.assert(
      fc.property(ctxArb, fc.integer({ min: 10_000, max: 200_000 }), (c, cliff) => {
        const h = acaCliffFillHeadroom(c, cliff)
        // Sound AND tight (the IRMAA/bracket siblings' clause): the fill holds the cliff and
        // one more dollar always crosses it — the ceiling is the LARGEST safe fill, not
        // merely a safe one (ultramode 2026-07-03 closed this asymmetry).
        if (h > 0) return acaMagiAtFill(c, h) <= cliff && acaMagiAtFill(c, h + 1) > cliff
        // h === 0: either the committed baseline is already over, or the room is exactly zero.
        return acaMagiAtFill(c, 0) >= cliff || acaMagiAtFill(c, 1) > cliff
      }),
    )
  })

  it('IRMAA headroom soundness: never crosses the next threshold, and one more dollar always would (tight, not merely safe)', () => {
    fc.assert(
      fc.property(ctxArb, (c) => {
        const baseline = irmaaMagiAtFill(c, 0)
        const rail = nextIrmaaThresholdAbove(baseline, c.filing, irmaa.value)
        const h = irmaaStepFillHeadroom(c, irmaa.value)
        if (rail === null) return h === Number.POSITIVE_INFINITY
        // Sound: the fill holds the rail (strictly-over fires the tier, at-rail is safe)…
        if (!(irmaaMagiAtFill(c, h) <= rail + 1e-3)) return false
        // …and tight: the metric's slope is ≥ 1 above the free below-RMD zone, so +$1 crosses.
        return irmaaMagiAtFill(c, h + 1) > rail - 1e-3
      }),
      { numRuns: 200 },
    )
  })

  it('bracket-edge headroom soundness: holds the edge, and one more dollar crosses it', () => {
    fc.assert(
      fc.property(ctxArb, (c) => {
        const baseline = taxableIncomeAtFill(c, 0)
        const edge = nextBracketEdgeAbove(baseline, c.filing)
        const h = bracketEdgeFillHeadroom(c)
        if (edge === null) return h === Number.POSITIVE_INFINITY
        if (!(taxableIncomeAtFill(c, h) <= edge + 1e-3)) return false
        return taxableIncomeAtFill(c, h + 1) > edge - 1e-3
      }),
      { numRuns: 200 },
    )
  })
})
