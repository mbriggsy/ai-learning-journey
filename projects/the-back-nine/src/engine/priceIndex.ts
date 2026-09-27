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
 * plan first run later still prices against that base. Every FRESH dev seed starts in the anchor
 * year, where the two coincide; the aged vault plants (`stale` / `datestale` / `rec` / `recold` start
 * 2024, `datearrived` 2020) read index 1 through 2026 — the pre-anchor clamp, harsh, never rosy.
 *
 * Pure: a function of the calendar year and the canonical constants; reads no clock, no draw.
 * The memo is a cache of that pure function (the gross-up fixed point asks per pass, per year,
 * per path) — never state the answer depends on.
 *
 * TWO READS, TWO DOMAINS (insight 138): the index above is a LEVEL — the clamp at and before the
 * anchor is honest there (nothing is deflated before the sourced path begins). A GROWTH ratio is a
 * different read: a ratio whose base year sits in the clamped span silently deletes that span's
 * growth (the IRMAA tiers 1–4 lines ran one CPI year low that way, 1c97f55d). Growth between two
 * years goes through {@link cpiGrowth}, never through a quotient of two clamped levels.
 */
import { medicareCostTrend } from '@engine/constants'

const memo = new Map<number, number>()

/** One calendar year's CPI rate on the Trustees path: the near-term average for every year through
 *  the printed table's edge — the anchor year's OWN rate included (the averaged window, Table II.D1,
 *  opens at the anchor year) — the ultimate rate beyond it. The one rate both reads compound. */
function cpiRateFor(calendarYear: number): number {
  const trend = medicareCostTrend.value
  // The printed table covers anchor+1 .. anchor+premiums.length (verbatim years); the near-term
  // average is the deflator for exactly those years (horizon-matched, healthOverlay's derivation).
  const tableEdge = trend.anchorYear + trend.premiums.length
  return calendarYear <= tableEdge ? trend.cpiNearTermAvg : trend.cpiUltimate
}

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
  const anchor = medicareCostTrend.value.anchorYear
  let index = 1
  for (let y = anchor + 1; y <= calendarYear; y++) index *= 1 + cpiRateFor(y)
  if (!(Number.isFinite(index) && index >= 1)) {
    throw new Error(`[priceIndex] non-finite or sub-unity index at calendar ${calendarYear} (${index}) — refusing (burned/062)`)
  }
  memo.set(calendarYear, index)
  return index
}

/**
 * Prices' GROWTH from calendar year `fromYear` to `toYear` on the same Trustees path — UNCLAMPED: the
 * product of (1 + rate) over every year in (fromYear, toYear]. Equal to index(toYear) ÷ index(fromYear)
 * wherever both sit at or after the anchor (test-pinned); it differs from that quotient exactly where
 * the quotient is wrong — a base one year before the anchor, whose step INTO the anchor year the
 * clamped level would erase (insight 138).
 *
 * THE DOMAIN, fail-loud: `fromYear ≥ anchor − 1` — the Trustees path prices the anchor year's own
 * step and nothing earlier; a growth over realized years before it would be FABRICATED from a
 * forecast, so it refuses (burned/062), never a quiet 1. `toYear ≥ fromYear` — a backward read is a
 * caller's frame error, not a deflation.
 */
export function cpiGrowth(fromYear: number, toYear: number): number {
  if (!Number.isInteger(fromYear) || !Number.isInteger(toYear)) {
    throw new Error(`[priceIndex] cpiGrowth: both years must be integer calendar years (got ${fromYear} → ${toYear})`)
  }
  const anchor = medicareCostTrend.value.anchorYear
  if (fromYear < anchor - 1) {
    throw new Error(
      `[priceIndex] cpiGrowth: no sourced rate before the anchor year ${anchor} — a growth from ${fromYear} would be fabricated (burned/062)`,
    )
  }
  if (toYear < fromYear) {
    throw new Error(`[priceIndex] cpiGrowth: a backward read (${fromYear} → ${toYear}) is a frame error, never a deflation`)
  }
  let growth = 1
  for (let y = fromYear + 1; y <= toYear; y++) growth *= 1 + cpiRateFor(y)
  return growth
}
