/**
 * The engine's ONE cumulative price index — the deterministic CPI path by CALENDAR year that every
 * NOMINAL-anchored figure deflates by to land in the engine's REAL (today's) dollars.
 *
 * WHY THIS EXISTS (the Social Security-thresholds Tier 0, 2026-09-24): the engine runs in real
 * dollars, so a figure the law FREEZES in nominal terms (the §86 provisional-income thresholds —
 * $32k / $44k since 1983 / 1993, never indexed) is worth LESS real every year. Holding such a figure
 * flat in real dollars is the same as indexing it — the rosy direction, growing with the horizon.
 * Every frozen-nominal figure the engine prices must divide by THIS index for its calendar year;
 * never by a hand-typed rate, never by a second index (CRN: the overlay shares one path).
 *
 * THE PATH is the Trustees' CPI-W assumption the Part B schedule already rides (`medicareCostTrend`,
 * one home): the near-term AVERAGE applied uniformly per year from the table anchor through the
 * printed table's edge, the ULTIMATE rate beyond it — the same running product
 * `buildPartBPricingSchedule` accumulates for its table years (a test pins the two equal at every
 * table year). At and before the anchor the index is 1 (nothing is deflated before the sourced path
 * begins — the Part B schedule's pre-anchor clamp, mirrored).
 *
 * The anchor is the TABLE's year, not the household's `startCalendarYear` — the engine's real
 * dollars are the anchor year's by the Part B convention (its 2026 nominal IS its 2026 real), and a
 * plan first run later still prices against that base. Every seed today starts in the anchor year,
 * where the two coincide.
 *
 * Pure: a function of the calendar year and the canonical constants; reads no clock, no draw.
 * The memo is a cache of that pure function (the gross-up fixed point asks per pass, per year,
 * per path) — never state the answer depends on.
 */
import { medicareCostTrend } from '@engine/constants'

const memo = new Map<number, number>()

/** The cumulative price level of `calendarYear` relative to the trend table's anchor year
 *  (1 at and before the anchor; > 1 after). Divide a NOMINAL figure by it to get real dollars. */
export function cumulativePriceIndex(calendarYear: number): number {
  if (!Number.isInteger(calendarYear)) {
    // NaN would compare false against every year and silently return the identity — an
    // undeflated threshold in every sim year (insight 010's shape; fail loud instead).
    throw new Error(`[priceIndex] calendarYear must be an integer calendar year (got ${calendarYear})`)
  }
  const cached = memo.get(calendarYear)
  if (cached !== undefined) return cached
  const trend = medicareCostTrend.value
  const anchor = trend.anchorYear
  // The printed table covers anchor+1 .. anchor+premiums.length (verbatim years); the near-term
  // average is the deflator for exactly those years (horizon-matched, healthOverlay's derivation).
  const tableEdge = anchor + trend.premiums.length
  let index = 1
  for (let y = anchor + 1; y <= calendarYear; y++) {
    index *= 1 + (y <= tableEdge ? trend.cpiNearTermAvg : trend.cpiUltimate)
  }
  if (!(Number.isFinite(index) && index >= 1)) {
    throw new Error(`[priceIndex] non-finite or sub-unity index at calendar ${calendarYear} (${index}) — refusing (burned/062)`)
  }
  memo.set(calendarYear, index)
  return index
}
