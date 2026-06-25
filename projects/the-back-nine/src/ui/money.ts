/*
 * src/ui/money.ts — the ui-layer money FORMATTERS for the U7 answer surface.
 *
 * Numbers (not copy) — the sanctioned numeric channel feeds copy SLOTS a pre-formatted string,
 * so the copyGuard's free-numeral scan never sees a hardcoded figure (copy.ts SLOT DISCIPLINE).
 * The intake layer has its own `formatMoney` (src/intake/fields.tsx); ui does not reach across to
 * it (the copy.ts convention) and must NOT import @engine for a display constant (no ui→engine
 * coupling exists, and the rounding below is a PRESENTATION choice, not the engine's grid). Pure
 * Intl — no React, no state.
 *
 * Both are HUMANE by design (back-nine-design §3 "no spurious precision"): the dollar grammar is a
 * coarse first-answer hint, not a solve, so it rounds to a calm figure and never shows cents.
 */

const grouped = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })

/** $/month magnitudes round to this for a calm verdict figure ("$430", never "$427.13"). A UI
 *  display choice (humane precision) — deliberately NOT imported from the engine's DOLLAR_STEP
 *  (ui owns its own presentation; it shares the $10 granularity only because the same humane
 *  rounding is right in both places). */
const PER_MONTH_DISPLAY_STEP = 10

/** A $/month magnitude for the verdict clause — sign-agnostic (the clause WORD carries the
 *  direction: "room" / "less"), rounded so "$430", never "$427.13". Pre-formats the slot input,
 *  so the rendered clause stays free of a hardcoded numeral. */
export function formatPerMonth(perMonthReal: number): string {
  const stepped =
    Math.round(Math.abs(perMonthReal) / PER_MONTH_DISPLAY_STEP) * PER_MONTH_DISPLAY_STEP
  return grouped.format(stepped)
}

/** A humane y-axis tick — "$0", "$1.2M", "$500k". The band fan tops out in the low millions for a
 *  couple, so k/M suffixes keep the gridline legible without false precision. Negative inputs can't
 *  occur (a fan percentile is ≥ 0), but |x| is taken defensively so a stray sign never prints "$-". */
export function formatAxisDollar(dollars: number): string {
  const v = Math.abs(dollars)
  if (v >= 1_000_000) {
    const m = (v / 1_000_000).toFixed(1).replace(/\.0$/, '')
    return `$${m}M`
  }
  if (v >= 1_000) return `$${Math.round(v / 1_000)}k`
  return `$${Math.round(v)}`
}
