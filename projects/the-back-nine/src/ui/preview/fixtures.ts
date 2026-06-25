/*
 * src/ui/preview/fixtures.ts — representative readings + per-year fans for the U7 preview harness
 * (and the ConfidenceStatement test). Hand-built, deterministic data — NOT engine output — chosen
 * so each outcome state reads honestly: the over-funded band climbs and never touches $0; the
 * already-failing band collapses to the floor (the ruin signal back-nine-design §3 demands); the
 * off-track band's low edge depletes mid-horizon. The numbers are illustrative, not validated.
 *
 * The fan is built to satisfy the BandFan contract (contiguous integer years from the today anchor;
 * per year FINITE, NON-NEGATIVE, ORDERED p10 ≤ p25 ≤ p50 ≤ p75 ≤ p90; cohortFraction thinning late)
 * so resolveBandData's producer-seam guard accepts it.
 */
import type { BandFan, BandFanYear, DollarAdjustment, Headline, OutcomeState } from '@shared/model'

interface FanShape {
  /** Whole-year horizon (the fan runs 0..years). */
  readonly years: number
  /** Today's portfolio (the anchor — every percentile equals this at year 0). */
  readonly start: number
  /** Total relative change of the median across the horizon (+ grows, − declines). */
  readonly drift: number
  /** Relative half-spread at the horizon (the band widens linearly from 0 at today). */
  readonly spread: number
  /** Fraction of the couple cohort still alive at the horizon (thins late). */
  readonly thin: number
}

/** Build an honest, ordered, non-negative fan. Ordering + the $0 floor are enforced by
 *  construction (each edge clamped against its neighbour), so the lattice is well-formed. */
function makeFan(shape: FanShape): BandFan {
  const { years, start, drift, spread, thin } = shape
  const byYear: BandFanYear[] = []
  for (let t = 0; t <= years; t++) {
    const frac = t / years
    const center = start * (1 + drift * frac)
    const halfFar = start * spread * frac
    const p50 = Math.max(0, center)
    const p75 = Math.max(p50, center + halfFar * 0.6)
    const p90 = Math.max(p75, center + halfFar * 1.15)
    const p25 = Math.min(p50, Math.max(0, center - halfFar * 0.6))
    const p10 = Math.min(p25, Math.max(0, center - halfFar * 1.3))
    const cohortFraction = 1 - (1 - thin) * frac * frac
    byYear.push({ yearsFromNow: t, p10, p25, p50, p75, p90, cohortFraction })
  }
  return { byYear }
}

const HORIZON = 30
const START = 1_400_000

const headline = (value: number, outcomeState: OutcomeState): Headline => ({
  xOfTen: { value, marginToEdge: 0 },
  outcomeState,
})
const dollar = (value: number, direction: DollarAdjustment['direction']): DollarAdjustment => ({
  perMonthReal: { value, marginToEdge: 0 },
  direction,
})

export interface ReadingFixture {
  readonly headline: Headline
  readonly dollar: DollarAdjustment
  /** Omitted for indeterminate (the range mode shows no band). */
  readonly band?: BandFan
}

/** One representative reading per engine state — the harness + the test both drive off this. */
export const READING_FIXTURES: Record<OutcomeState, ReadingFixture> = {
  'over-funded': {
    headline: headline(9, 'over-funded'),
    dollar: dollar(920, 'room'),
    band: makeFan({ years: HORIZON, start: START, drift: 0.7, spread: 0.9, thin: 0.2 }),
  },
  'on-track': {
    headline: headline(8, 'on-track'),
    dollar: dollar(410, 'room'),
    band: makeFan({ years: HORIZON, start: START, drift: 0.1, spread: 0.85, thin: 0.2 }),
  },
  borderline: {
    headline: headline(7, 'borderline'),
    dollar: dollar(0, 'on-the-line'),
    band: makeFan({ years: HORIZON, start: START, drift: -0.05, spread: 0.95, thin: 0.25 }),
  },
  'off-track': {
    headline: headline(4, 'off-track'),
    dollar: dollar(-360, 'trim'),
    band: makeFan({ years: HORIZON, start: START, drift: -0.5, spread: 1.0, thin: 0.3 }),
  },
  'already-failing': {
    headline: headline(0, 'already-failing'),
    dollar: dollar(-1180, 'trim'),
    band: makeFan({ years: HORIZON, start: START, drift: -1.05, spread: 0.8, thin: 0.35 }),
  },
  indeterminate: {
    headline: headline(0, 'indeterminate'),
    dollar: dollar(0, 'on-the-line'),
  },
}

/** Display order for the harness — covered states first, then the line, then short, then the
 *  no-verdict range. */
export const PREVIEW_ORDER: readonly OutcomeState[] = [
  'over-funded',
  'on-track',
  'borderline',
  'off-track',
  'already-failing',
  'indeterminate',
]
