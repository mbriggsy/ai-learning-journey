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
import type {
  BandFan,
  BandFanYear,
  DollarAdjustment,
  Headline,
  OutcomeState,
  SurvivorReading,
} from '@shared/model'
import type { XAnnotation } from '@viz/bandData'

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
  stateMarginToEdge: 0,
})
const dollar = (value: number, direction: DollarAdjustment['direction']): DollarAdjustment => ({
  perMonthReal: { value, marginToEdge: 0 },
  direction,
})

/** One representative couple's household-clock markers — the x-axis the band reads against (Today /
 *  work stops / plan horizon). Shared across every fixture; passed to the band so its x-axis isn't
 *  bare. In the real product these are derived from the scenario (the retirement ages, the horizon). */
export const HOUSEHOLD_ANNOTATIONS: readonly XAnnotation[] = [
  { id: 'today', yearsFromNow: 0, label: 'Today', ages: '63 / 61', description: 'Today — ages 63 and 61' },
  { id: 'retire', yearsFromNow: 2, label: 'Work stops', ages: '65 / 63', description: 'Work stops — around ages 65 and 63' },
  { id: 'horizon', yearsFromNow: 30, label: 'Plan horizon', ages: '93 / 91', description: 'The plan horizon — ages 93 and 91' },
]

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
    dollar: dollar(-1180, 'rethink'),
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

// --- survivor readout fixtures (U7 e2) -------------------------------------------------------------
// The "as the survivor" reading the engine NEVER tags 'indeterminate' (selectOutcomeState reserves
// that for the degenerate-input early-return, which fires before any survivor reading is built), so
// the survivor states are the five WORDED ones. Each carries a representative pre-tax income cliff;
// the survivor reading typically lands BELOW the joint headline (the honest fragility signal).

/** The five states a survivor reading can carry — the worded outcomes (no indeterminate). */
export type WordedOutcomeState = Exclude<OutcomeState, 'indeterminate'>

const survivorReading = (
  xOfTen: number,
  outcomeState: WordedOutcomeState,
  incomeStepDownMonthlyReal: number,
): SurvivorReading => ({ xOfTen: { value: xOfTen, marginToEdge: 0 }, outcomeState, incomeStepDownMonthlyReal })

/** One representative survivor reading per worded state — the harness + the test both drive off
 *  this. The X-of-10 and the income cliff are illustrative, not engine-validated. */
export const SURVIVOR_FIXTURES: Record<WordedOutcomeState, SurvivorReading> = {
  'over-funded': survivorReading(9, 'over-funded', 880),
  'on-track': survivorReading(8, 'on-track', 1090),
  borderline: survivorReading(7, 'borderline', 1280),
  'off-track': survivorReading(4, 'off-track', 1520),
  'already-failing': survivorReading(0, 'already-failing', 1840),
}

/** The residual where the income cliff rounds to ~$0 — the step-down clause must SUPPRESS (never
 *  render "steps down about $0"). The value is a sub-$5 residual (formatPerMonth rounds |x| < $5 to
 *  "0"), deliberately NOT a literal 0: it sits in the (0, $5) interval where the formatter-based
 *  guard `formatPerMonth(x) !== '0'` and a naive `x !== 0` check DISAGREE. A raw-`!== 0` regression
 *  would render "$0" here, so this fixture's test fails loud (burned/070 — pin the property on a
 *  value that exercises it, never one where both checks happen to agree). */
export const SURVIVOR_NO_STEPDOWN: SurvivorReading = survivorReading(6, 'borderline', 3)

/** The companion just ABOVE the rounding boundary: formatPerMonth(6) = "10", so the clause MUST show
 *  ("steps down about $10"). Together with SURVIVOR_NO_STEPDOWN it straddles the formatter boundary
 *  the guard rides — pinning that suppression never over-fires on a small-but-real income drop. */
export const SURVIVOR_TINY_STEPDOWN: SurvivorReading = survivorReading(7, 'borderline', 6)

/** Display order for the survivor harness — same covered-first order as the joint grid. */
export const SURVIVOR_PREVIEW_ORDER: readonly WordedOutcomeState[] = [
  'over-funded',
  'on-track',
  'borderline',
  'off-track',
  'already-failing',
]
