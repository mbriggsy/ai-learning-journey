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
 *  occur (a fan percentile is ≥ 0), but |x| is taken defensively so a stray sign never prints "$-".
 *
 *  EXACT-WHEN-ROUND (Caddie O5, 2026-07-10): a value that IS a round number of thousands (M range)
 *  or hundreds (k range) renders exactly — "$2.25M", "$1.125M", "$37.5k" — instead of being rounded
 *  into a lying gridline label. niceCeil's {1.5, 3, 5}×10^k ceilings put quarter ticks at values
 *  like 2,250,000, which the old 1-decimal path labeled "$2.3M": an evenly-spaced ladder reading
 *  unevenly (against buildYTicks' own "clean figures" contract). Exactness here is the RULER naming
 *  its own gridline — not spurious precision (back-nine-design §3 bans false precision; a tick
 *  label that misstates its line's value is the opposite failure). Arbitrary values — the scrub
 *  readout's raw percentiles — miss the round-ness gate and keep the humane rounding unchanged.
 *  The gate is INTEGER arithmetic (`v % 1_000`), never a float round-trip ("1.1" × 1e6 misses
 *  1,100,000 in binary); Number→template prints the shortest exact decimal ("2.25", "1.125"). */
export function formatAxisDollar(dollars: number): string {
  const v = Math.abs(dollars)
  if (v >= 1_000_000) {
    if (v % 1_000 === 0) return `$${v / 1_000_000}M`
    const m = (v / 1_000_000).toFixed(1).replace(/\.0$/, '')
    return `$${m}M`
  }
  if (v >= 1_000) {
    if (v % 100 === 0) return `$${v / 1_000}k`
    return `$${Math.round(v / 1_000)}k`
  }
  return `$${Math.round(v)}`
}

/** ONE dialect per axis lattice (O8, 2026-07-17 — corpus rule 36, the fcc35556 axis family):
 *  `formatAxisDollar` picks its unit per-VALUE, so any $M-class ceiling whose quarters dip under
 *  $1M rendered a mixed ladder — "$750k" between "$1.5M" gridlines, an evenly-spaced ruler
 *  reading unevenly. This factory locks a lattice to its TOP tick's unit: an $≥1M ceiling
 *  formats every non-zero tick in M ("$0.75M, $1.5M, $2.25M, $3M" — quarters of the niceCeil
 *  ladder are exact dyadics, so Number→template prints the shortest exact decimal, the O5
 *  exact-when-round law), $0 stays "$0" (never "$0M" — the ruin-floor anchor reads plain).
 *  A sub-$1M ceiling keeps the per-value formatter (its quarters never cross a unit boundary
 *  in the band's reachable domain — the $0-portfolio household is screened upstream).
 *  DELIBERATE SCOPE: tick lattices only. The scrub/tooltip readout keeps per-value units
 *  ("$623k" in a sentence, never "$0.623M") — the axis is the ruler, the readout is prose. */
export function axisDollarFormatterFor(ceiling: number): (dollars: number) => string {
  if (ceiling < 1_000_000) return formatAxisDollar
  return (dollars: number): string => {
    const v = Math.abs(dollars)
    if (v === 0) return '$0'
    // The same exact-when-round gate as the per-value M branch (integer arithmetic, never a
    // float round-trip); a non-round stray falls back to the humane 1-decimal.
    if (v % 1_000 === 0) return `$${v / 1_000_000}M`
    return `$${(v / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  }
}
