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

/** The Q1 recommendation DELTA hero magnitude — grouped with thousands separators and rounded to a
 *  humane, magnitude-scaled step so a comparative reads calm and never spuriously precise
 *  (back-nine-design §3): "$48,000", "$6,300", "$230,000" — never "$47,832". SIGN-AGNOSTIC on purpose
 *  (|x|): the copy WORD carries the direction ("more" / "less"), exactly like {@link formatPerMonth}, so
 *  the slot never renders a bare "$-". The delta is a bequest/lifetime-tax figure (tens of thousands to
 *  low millions), so the step scales: nearest $100 under $10k, nearest $1,000 under $100k, nearest
 *  $10,000 above — two significant figures, the ruler naming a calm gridline, not a solve. Pre-formats
 *  the slot input so the rendered comparative carries no hardcoded numeral (copy.ts SLOT DISCIPLINE). */
export function formatDeltaDollar(deltaReal: number): string {
  const v = Math.abs(deltaReal)
  const step = v < 10_000 ? 100 : v < 100_000 ? 1_000 : 10_000
  return grouped.format(Math.round(v / step) * step)
}

/** The recommendation lockup's ABSOLUTE-magnitude prose dialect — the portfolio-scale figures quoted in
 *  a sentence (the §S2 leave-more median quote + the §S3b viz-aria endpoint magnitudes). The DELTA hero is
 *  a difference ({@link formatDeltaDollar}); these are the portfolio LEVELS the sentence compares, and a
 *  couple's bequest/portfolio level runs in the low millions, where "$4,240,000" of full grouped digits
 *  reads as a spreadsheet cell, not calm prose. So a level ≥ $1M joins the SPINE's humane "$X.XM" dialect
 *  (the same one the confidence band's scrub readout speaks) — ONE decimal, deliberately NOT
 *  formatAxisDollar's exact-when-round two-decimal RULER precision (a sentence is prose, not a gridline;
 *  back-nine-design §3 no-spurious-precision). A sub-$1M level stays GROUPED humane digits via
 *  formatDeltaDollar (never formatAxisDollar's "$Xk" axis unit), so the lockup's small-figure dialect is
 *  the delta's, never a third one. SIGN-AGNOSTIC (|x|): the copy WORD carries direction, like the family.
 *  Returns BARE of the "$" glyph (unlike formatAxisDollar) — the copy SLOT supplies it (copy.ts SLOT
 *  DISCIPLINE), so the rendered sentence carries no hardcoded numeral. The $1M unit boundary is the SAME
 *  one formatAxisDollar draws (the shared prose/axis dialect line). */
export function formatAbsoluteDollar(dollars: number): string {
  const v = Math.abs(dollars)
  if (v < 1_000_000) return formatDeltaDollar(v)
  return `${(v / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
}

/**
 * THE ACTIONABLE dialect — a dollar the reader may RE-TYPE INTO A CONTROL, rounded DOWN.
 *
 * ⚠️ ROUNDING DOWN IS A CORRECTNESS RULE HERE, NOT A PRESENTATION CHOICE, AND IT IS THE ONLY
 * DIFFERENCE FROM {@link formatDeltaDollar}. Every conversion amount the solver proposes is built by
 * `largestWholeDollarWithin(metric, rail, …)` — the LARGEST WHOLE DOLLAR keeping an ACA-cliff /
 * IRMAA-step / bracket-edge metric AT OR UNDER its threshold. One dollar more crosses the rail. The
 * delta dialect rounds to NEAREST, so an anchored $43,600 renders "$44,000" — four hundred dollars
 * PAST the cliff the solver constructed that candidate to sit under, quoted to a household that can
 * type it straight into the Roth lever and eat a full unsubsidized premium for the year. A calm,
 * plausible figure whose only defect is that acting on it costs money: the cardinal sin exactly.
 *
 * FLOORING IS SAFE BY CONSTRUCTION, not by luck: each rail metric is MONOTONE in the amount, so every
 * value at or below the anchor clears the same rail the anchor clears.
 *
 * UNCONDITIONAL, and that is forced rather than preferred: `SolveArm` carries no `anchoredRail`, so a
 * renderer cannot tell a rail-anchored grid amount from the household's own unscreened figure. On the
 * household's own (already round) amount the floor is a no-op, so the safe branch costs nothing and
 * the unsafe branch cannot be reached by mistake.
 *
 * Same humane step ladder as the delta dialect, so the surface still speaks ONE small-figure dialect;
 * bare of the "$" glyph, which the copy slot supplies (copy.ts SLOT DISCIPLINE). The sub-step guard is
 * not defensive dressing — without it a figure smaller than its own step floors to "$0", which would
 * be a rendered falsehood rather than a rounding.
 */
export function formatActionableDollar(dollars: number): string {
  const v = Math.max(0, dollars)
  const step = v < 10_000 ? 100 : v < 100_000 ? 1_000 : 10_000
  const stepped = Math.floor(v / step) * step
  return grouped.format(stepped >= 1 ? stepped : Math.floor(v))
}

/** The heir-bracket disclosure percent — the assumed IRD bracket (a fraction in [0,1)) as a whole
 *  percent for the leave-more heir-bracket note ("about 24%"). Humane: rounded to a whole percent (a
 *  bequest bracket is a coarse assumption, never spuriously precise — back-nine-design §3). Sign-free
 *  (a bracket is ≥ 0); the copy WORD ("about") carries the hedge. Pre-formats the slot input so the
 *  rendered note carries no hardcoded numeral (copy.ts SLOT DISCIPLINE). */
export function formatBracketPercent(bracketFraction: number): string {
  return `${Math.round(Math.abs(bracketFraction) * 100)}`
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
