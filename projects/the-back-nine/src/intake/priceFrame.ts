/**
 * The price frame of a figure the household types in dollars that do not follow general inflation (gap 4's plan,
 * `docs/plans/features/spending-line-repeat-and-rate-build-spec.md`, KTD3 and KTD4): a budget line that changes at its
 * own rate (U4), and later a loan's fixed payment (U6). The engine runs in real dollars, so such a figure is grown in
 * dollars and divided by the ONE price index (`@engine/priceIndex`), never by a hand-typed rate or the flat 3 % the
 * income streams use (the register's open one-inflation-path entry).
 *
 * THE DEFLATOR (KTD3). The engine's real dollars are the price index's anchor year's (`priceIndex.ts`'s header). With
 * C = `startCalendarYear` + t and B′ = the later of the build year and the anchor year (read from the constants, never
 * typed), a dollar figure in sim year t is divided by `cpiGrowth(B′, C)` for C after B′, and by 1 otherwise. For a plan
 * built in or before the anchor year that is exactly `cumulativePriceIndex(C)`, the level every frozen-dollar figure in
 * the same run already reads (test-pinned). For a plan built later it rebases to the build year, on purpose: the
 * household typed the figure in the build year's dollars, so year 0 charges exactly what it typed. A GROWTH read, so
 * `cpiGrowth`, never a quotient of two clamped levels (insight 138).
 *
 * THE FACTOR (KTD4). A rate is a dollar increase that REPLACES general inflation: 0 is the same dollar amount every
 * year. It grows from the plan's year 0, because a line carries no year it was typed in. The factor in sim year t is
 * (1 + g)^t ÷ the deflator of t. The growth is a running product, never `Math.pow`: a product of IEEE doubles is
 * bit-identical on every JS engine, a transcendental need not be (`CLAUDE.md`, cross-engine robustness).
 *
 * Intake, not the engine and not the budget compile, owns it: the compile imports `@shared` only and knows no calendar
 * year (KTD1), and the engine only multiplies by what it is handed. Pure: a function of its arguments and the canonical
 * constants; reads no clock.
 */
import { medicareCostTrend } from '@engine/constants'
import { cpiGrowth } from '@engine/priceIndex'
import { growthRateInRange } from '@shared/spendingBounds'

/** KTD3's divisor for a dollar figure in sim year `t` of a plan built in `startCalendarYear`. */
export function nominalDeflator(startCalendarYear: number, t: number): number {
  if (!Number.isInteger(startCalendarYear) || !Number.isInteger(t) || t < 0) {
    throw new Error(`[priceFrame] nominalDeflator needs an integer build year and a sim year ≥ 0 (got ${startCalendarYear}, ${t})`)
  }
  const base = Math.max(startCalendarYear, medicareCostTrend.value.anchorYear)
  const calendar = startCalendarYear + t
  return calendar > base ? cpiGrowth(base, calendar) : 1
}

/** A rated line's price factor in every sim year 0 .. `horizonYears` − 1 (KTD4): (1 + g)^t ÷ {@link nominalDeflator}. */
export function ratedLineFactors(growthRate: number, startCalendarYear: number, horizonYears: number): number[] {
  if (!Number.isFinite(growthRate) || !growthRateInRange(growthRate)) {
    throw new Error(`[priceFrame] a line's yearly rate must be a finite fraction from 0 to 0.15 (got ${growthRate})`)
  }
  if (!Number.isInteger(horizonYears) || horizonYears <= 0) {
    throw new Error(`[priceFrame] ratedLineFactors needs a positive integer horizon (got ${horizonYears})`)
  }
  const factors = new Array<number>(horizonYears)
  let growth = 1
  for (let t = 0; t < horizonYears; t++) {
    if (t > 0) growth *= 1 + growthRate
    factors[t] = growth / nominalDeflator(startCalendarYear, t)
  }
  return factors
}

/** The factor in one sim year, for a read-back that names one later year's cost (the Living drawer's, gap 4's U8):
 *  the same figure the run charges, never a second derivation. */
export function ratedLineFactor(growthRate: number, startCalendarYear: number, t: number): number {
  return ratedLineFactors(growthRate, startCalendarYear, t + 1)[t]!
}
