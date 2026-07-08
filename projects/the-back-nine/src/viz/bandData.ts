/*
 * src/viz/bandData.ts — the ConfidenceBand's INPUT contract (U6-render).
 *
 * The band is a PURE renderer of a pre-computed percentile fan: it never touches the raw
 * engine `Distribution` (which carries only terminal values + depletion years — no per-year
 * trajectory). Producing the per-year fan from the distribution is the orchestrator's / U7's
 * job; this layer draws what it is GIVEN. That seam is what keeps the band honest — "the UI
 * never recomputes or interpolates a grade from raw paths" (back-nine-design §3) — and what
 * lets `src/viz` import only @shared (the ESLint layer boundary).
 *
 * STRING-FREE (phase-2 cross-cutting #4): no user-facing copy lives here. Every label — axis
 * ticks, the household-clock annotations, the percentile descriptions, the accessible caption —
 * arrives as a prop string from the caller (src/ui, routed through copy.ts). This file defines
 * only the SHAPES; the only literals are non-claim numeric/geometry constants.
 *
 * THE FIXED X-LATTICE (phase-2 U6 morph contract): a resolved fan is sampled on a CONSTANT
 * number of points (`LATTICE_POINTS`) across the band's own fixed max-horizon. Because the
 * point count never changes as ages / retirement years move the real horizon, the SVG path's
 * command structure is invariant — so a recompute MORPHS the `d` attribute (widen / shift /
 * narrow alike) instead of redrawing from zero (the draw-once-then-morph rule).
 */

import type { BandFan, OutcomeState } from '@shared/model'

/** The number of x-lattice sample points a resolved fan is sampled on. Constant by contract:
 *  the path point-count is lattice-derived, never horizon-derived, so a morph is well-defined
 *  no matter how the real horizon moves. Odd so a sample lands exactly on the visual midpoint. */
export const LATTICE_POINTS = 49

/** One x-lattice sample of the percentile fan, in REAL (today's) dollars. The five percentiles
 *  are the band edges the engine emits; the band never invents intermediate percentiles. A
 *  DEPLETED path reads $0 here (never negative) — the linear, $0-anchored y-axis draws the
 *  ruin case touching the floor (back-nine-design §3; the single most important honest signal). */
export interface BandSample {
  /** Household-clock position: whole/fractional years from today. 0 = today. Monotonic
   *  non-decreasing across the lattice; the last sample sits at the band's max horizon. */
  readonly yearsFromNow: number
  /** 10th percentile portfolio value (the low-futures edge), real $, ≥ 0. */
  readonly p10: number
  /** 25th percentile, real $, ≥ 0. */
  readonly p25: number
  /** 50th percentile (the most-likely path — drawn as the median overlay), real $, ≥ 0. */
  readonly p50: number
  /** 75th percentile, real $, ≥ 0. */
  readonly p75: number
  /** 90th percentile (the high-futures edge), real $, ≥ 0. */
  readonly p90: number
  /** The fraction of the household cohort still alive at this lattice point (the engine's
   *  {@link BandFanYear.cohortFraction}, resampled). OPTIONAL: {@link resolveBandData} ALWAYS sets
   *  it; a hand-built fixture may omit it (a consumer reads absent as 1 — a full cohort). Carried so
   *  the render can de-emphasize a thin late-year band — a band narrowing because couples have died
   *  must never read as rising certainty (back-nine-design §3). NOT a band EDGE (the percentile
   *  ordering above stands alone), so {@link isFixedLattice} does not gate on it. */
  readonly cohortFraction?: number
}

/** One lattice-aligned readout row for the hover/scrub tooltip (one per {@link BandSample}, same
 *  index). Every figure arrives PRE-FORMATTED through the injected formatters ({@link resolveBandData}
 *  builds them with `formatDollar` + the optional `formatAges`) so `src/viz` stays string-free — the
 *  renderer composes label WORDS (from {@link BandLabels}) around these numbers and never formats a
 *  figure itself. Built in the SAME resample loop as `samples`, so a row can NEVER drift from the
 *  drawn vertex it annotates. The honest dead-cohort suppression (a thin late-year slice withdraws its
 *  crisp dollars) is decided BY THE RENDERER off `samples[i].cohortFraction`, not stored here — the row
 *  carries the figures; the render carries the honesty gate (so the threshold lives next to the fade). */
export interface BandTooltipRow {
  /** Both spouses' ages at this lattice year (e.g. "67 / 65"), via the injected `formatAges` (the same
   *  `slots.bandClockAges` the x-axis annotations use, so the readout ages match the axis). '' when no
   *  ages closure was supplied (the defensive arm — a fan resolved without a household clock). */
  readonly ages: string
  /** The 10th-percentile (low-futures) value, humane (e.g. "$600k"). */
  readonly low: string
  /** The 50th-percentile (most-likely) value, humane (e.g. "$1.2M"). */
  readonly median: string
  /** The 90th-percentile (high-futures) value, humane (e.g. "$2M"). */
  readonly high: string
}

/** A y-axis dollar gridline. The band decides the PIXEL position from `dollars`; the caller
 *  supplies the already-formatted `label` (Intl currency lives in the ui layer, never here). */
export interface YTick {
  /** The real-dollar value of this gridline (0 ≤ dollars ≤ dollarMax). */
  readonly dollars: number
  /** The formatted label (e.g. "$500k"), supplied by the caller. */
  readonly label: string
}

/** A household-clock annotation at a load-bearing moment (a retirement, the survivor two-regime
 *  boundary, the horizon end). NON-COLOR by construction: it renders as a vertical rule + text,
 *  never a hue cue. Both spouses' ages live in `ages` (never a calendar, never a single age). */
export interface XAnnotation {
  /** A stable key for React reconciliation across morphs. */
  readonly id: string
  /** Household-clock position (years from today) of the vertical rule. */
  readonly yearsFromNow: number
  /** The moment's name (e.g. "Survivor years"), supplied by the caller. */
  readonly label: string
  /** Both spouses' ages at this moment (e.g. "~86 / 84"), supplied by the caller. */
  readonly ages: string
  /** The accessible sentence for this annotation's `aria-label` (the reader is color blind —
   *  the signal must reach the a11y tree as text). Supplied by the caller. */
  readonly description: string
}

/** Two in-place text callouts that name the band's regions directly on the chart (never a
 *  color legend — back-nine-design §2). Positions are caller-chosen in band-data terms. */
export interface BandCallout {
  readonly id: string
  readonly yearsFromNow: number
  /** Real-dollar y-position of the callout text. */
  readonly dollars: number
  readonly text: string
}

/** Every string the band renders. Centralizing them here keeps `src/viz` string-free — the
 *  caller (src/ui) fills these from the typed copy catalog. */
export interface BandLabels {
  /** The accessible name of the whole figure (`role="img"` caption) — a plain-language
   *  description of what the fan shows, for the screen-reader user. */
  readonly caption: string
  /** Accessible name of the y-axis group (e.g. "Portfolio value, today's dollars"). */
  readonly yAxisLabel: string
  /** Accessible name of the x-axis group (e.g. "Years from now"). */
  readonly xAxisLabel: string
  /** Legend rows describing the three emphasis tiers, in plain words (most-likely / middle
   *  half / 8-in-10). The legend is supplementary; the in-place callouts carry the primary
   *  non-color signal. */
  readonly legendMedian: string
  readonly legendInner: string
  readonly legendOuter: string
  /** Hover/scrub readout label words (composed by the renderer around the pre-formatted
   *  {@link BandTooltipRow} numbers — the renderer never types a figure or a sentence). All
   *  band-scoped chrome, supplied from `copy.ts`. */
  readonly readoutAgesLabel: string
  /** Leads the range line (e.g. "8 in 10 land between") — echoes `legendOuter`'s p10–p90 framing. */
  readonly readoutRangeLabel: string
  /** Joins the two range figures (e.g. " – ") — the separator lives in copy, like the ages "/" slot. */
  readonly readoutRangeJoiner: string
  /** Leads the median line (e.g. "Most likely") — never "expected"/"projected" (no-prediction law). */
  readonly readoutMedianLabel: string
  /** Replaces the dollar lines where the surviving-couple cohort has thinned past the fade onset — the
   *  honest withdrawal of crisp figures where the fan goes quiet (e.g. "Too few couples to show a range."). */
  readonly readoutThinNote: string
}

/** A RESOLVED fan — a real distribution to draw. */
export interface ResolvedBandData {
  readonly kind: 'resolved'
  /** The outcome state the engine tagged this distribution with. FORWARD-CARRY: no renderer reads it
   *  yet (the band's geometry is state-agnostic). It is threaded here — rather than re-derived — so a
   *  future a11y-caption / surrounding-copy consumer reads the engine's authority tag instead of
   *  recomputing it (the "UI re-derives nothing" law). Wire it into the a11y caption or drop it when
   *  that consumer lands (roadmap U7/D2). */
  readonly outcomeState: OutcomeState
  /** The percentile fan on the fixed x-lattice (length === {@link LATTICE_POINTS}). */
  readonly samples: readonly BandSample[]
  /** The y-axis ceiling in real $ (the linear scale tops out here; $0 is always the floor).
   *  Held stable across recomputes by the caller so a morph is pure signal, not a rescale. */
  readonly dollarMax: number
  /** The band's max horizon in years (the x-axis domain top; the fixed viewBox maps [0, this]
   *  → the plot width). Held stable across recomputes so the lattice x-positions don't reflow. */
  readonly horizonYears: number
  readonly yTicks: readonly YTick[]
  readonly annotations: readonly XAnnotation[]
  readonly callouts: readonly BandCallout[]
  /** Lattice-aligned readout rows for the hover/scrub tooltip (length === {@link LATTICE_POINTS},
   *  index-parallel to `samples`). Always emitted (the dollar figures are free from the same resample);
   *  `ages` is '' when no `formatAges` closure was supplied. The renderer reads `tooltipRows[i]` for the
   *  pre-formatted strings and `samples[i]` for the position + cohort-fade gate at the scrubbed index. */
  readonly tooltipRows: readonly BandTooltipRow[]
}

/** The INDETERMINATE placeholder — the expected first answer. A deliberately WIDE, low-emphasis
 *  envelope with NO median and a distinct non-color texture (a sparse dashed boundary), visually
 *  unlike the real band. It carries no percentile data: rendering any thin/precise band or flat
 *  line in this mode is FORBIDDEN (it would read as a confident answer when there is none —
 *  back-nine-design §3). The horizon + axis labels still arrive so the frame reads as the band. */
export interface IndeterminateBandData {
  readonly kind: 'indeterminate'
  readonly horizonYears: number
  readonly dollarMax: number
  readonly yTicks: readonly YTick[]
  readonly annotations: readonly XAnnotation[]
  /** The in-place placeholder note (e.g. "The range opens up as you answer"), supplied by the
   *  caller — the calm "no band yet" text on the wide envelope. */
  readonly placeholderNote: string
}

/** What the band renders: a resolved fan OR the indeterminate placeholder. (Pending and
 *  compute-error are NON-band modes — the band is simply not mounted; U7 owns those.) */
export type BandViewData = ResolvedBandData | IndeterminateBandData

/** True iff `samples` is a well-formed fixed lattice: the exact contracted length, monotonic
 *  non-decreasing in `yearsFromNow`, and — per sample — FINITE, NON-NEGATIVE, ORDERED percentiles
 *  (0 ≤ p10 ≤ p25 ≤ p50 ≤ p75 ≤ p90, the {@link BandSample} contract). A malformed fan is a
 *  CALLER bug: the producer (U7's distribution→fan step) MUST call this and fail loud BEFORE
 *  handing the band a fan — never draw a silently-wrong band (the calm-but-wrong sin: a
 *  wrong-length fan breaks the morph's constant point-count; an inverted fan, p90 < p10, draws the
 *  low-futures edge ABOVE the high-futures edge as a confident shape). The band itself is a PURE
 *  renderer and does not re-validate (back-nine-design §3 — it draws what it is GIVEN); this guard
 *  lives at the producer seam. (Wired by U7; proven now by `bandData.test.ts` so it can't rot.) */
export function isFixedLattice(samples: readonly BandSample[]): boolean {
  if (samples.length !== LATTICE_POINTS) return false
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i]!
    if (i > 0 && !(s.yearsFromNow >= samples[i - 1]!.yearsFromNow)) return false
    if (
      !Number.isFinite(s.p10) ||
      !Number.isFinite(s.p25) ||
      !Number.isFinite(s.p50) ||
      !Number.isFinite(s.p75) ||
      !Number.isFinite(s.p90)
    ) {
      return false
    }
    if (!(s.p10 >= 0 && s.p10 <= s.p25 && s.p25 <= s.p50 && s.p50 <= s.p75 && s.p75 <= s.p90)) {
      return false
    }
  }
  return true
}

/** Round a positive value UP to a humane axis ceiling (1 / 1.5 / 2 / 3 / 4 / 5 / 6 / 8 / 10 × 10^k)
 *  so the band's top gridline is a clean figure ≥ the value. Returns 0 for a non-positive input
 *  (NaN-safe via `!(x > 0)`). NOTE: the input is NOT guaranteed positive — `initialPortfolio === 0`
 *  is a VALID decumulation run (validateParams' `finiteNonNeg` accepts 0; only the accumulation
 *  construct rejects it, simulate.ts §683), so an all-$0 fan (a $0-portfolio, income-funded
 *  household) yields maxP90 = 0 ⇒ this returns 0. resolveBandData fails loud on that AT THE SEAM
 *  (below) — the `dollarMax > 0` yForDollars requires is enforced there, never left to the renderer.
 *  EXPORTED for TwoFutures' axis ceiling (fan parity, Briggsy's station-2 cold-read 2026-07-08):
 *  ONE humane ladder across both charts, so their quarter-ticks are clean figures by the same
 *  construction — never a second re-typed scale. */
export function niceCeil(x: number): number {
  if (!(x > 0)) return 0
  const mag = 10 ** Math.floor(Math.log10(x))
  const norm = x / mag // [1, 10)
  const niceNorm = [1, 1.5, 2, 3, 4, 5, 6, 8, 10].find((s) => s >= norm) ?? 10
  return niceNorm * mag
}

/** The y-axis gridlines: `TICK_INTERVALS + 1` evenly-spaced lines INCLUDING $0 (the ruin-floor anchor
 *  — back-nine-design §3, the linear $0-anchored axis whose whole point is drawing the depletion-to-$0
 *  case). SINGLE-SOURCED so the indeterminate PLACEHOLDER band (which must sit at the same size as a
 *  resolved card) and a resolved band cannot drift apart — the match is a guarantee, not a coincidence
 *  of two copies of the loop. `formatDollar` is the caller's currency formatter (the string-free layer
 *  — Intl lives in ui, never here). */
export function buildYTicks(dollarMax: number, formatDollar: (dollars: number) => string): YTick[] {
  const TICK_INTERVALS = 4
  const yTicks: YTick[] = []
  for (let k = 0; k <= TICK_INTERVALS; k++) {
    const dollars = (k / TICK_INTERVALS) * dollarMax
    yTicks.push({ dollars, label: formatDollar(dollars) })
  }
  return yTicks
}

/** Build a renderable {@link ResolvedBandData} from the engine's per-year {@link BandFan}.
 *
 * THE PRODUCER SEAM (back-nine-design §3; the deferred U6-review obligation, now wired). The band
 * is a PURE renderer — it draws what it is GIVEN and never re-validates. THIS is the one place the
 * raw per-year fan becomes drawable geometry, and the one place the honesty guards fire:
 *
 *  - **Resample** the fan's integer-year grid (`yearsFromNow` 0, 1, …, horizon) onto the FIXED
 *    {@link LATTICE_POINTS}-point x-lattice by linear interpolation. A convex combination of two
 *    ordered, non-negative percentile tuples stays ordered + non-negative, so the lattice is
 *    well-formed by construction — and the guard below proves it rather than trusting it.
 *  - **Horizon = the fan's LAST living-cohort year** (the household horizon — the band ends where
 *    the last couple does, never a fabricated tail past the cohort). It is STABLE across recomputes
 *    under one seed (mortality is CRN-invariant), so a same-seed recompute MORPHS; a seed/horizon
 *    change is a RE-DRAW (the morph contract — `ConfidenceBand` owns that branch).
 *  - **`dollarMax` ≥ max(p90)** across the lattice (a humane ceiling) — the asymmetric scale guard,
 *    so the top edge never escapes the plot (the deferred U6-review seam; pairs with `yForDollars`'
 *    fail-loud on a non-positive ceiling).
 *  - **`isFixedLattice` THROW** before returning — a malformed fan is a PRODUCER bug, never a
 *    silently-wrong band (the calm-but-wrong sin). The planted-fail tests prove the throw can fire.
 *  - **`cohortFraction`** rides on each sample (resampled from the fan) so the render can
 *    de-emphasize a thin late-year band — the cohort thinning is honest signal, never hidden.
 *
 * STRING-FREE (the `src/viz` layer boundary): y-tick LABELS arrive through `formatDollar` (the
 * caller's `copy.ts` currency formatter — a function, never a literal); the household-clock
 * `annotations`/`callouts` are caller-supplied decorations passed through verbatim. */
export function resolveBandData(
  fan: BandFan,
  outcomeState: OutcomeState,
  opts: {
    readonly formatDollar: (dollars: number) => string
    readonly annotations?: readonly XAnnotation[]
    readonly callouts?: readonly BandCallout[]
    /** Maps a lattice year (years-from-now, possibly fractional) to the household ages string for the
     *  hover/scrub readout — the ui-supplied closure built from `slots.bandClockAges` + the draft's
     *  currentAge (string-free: viz never owns the copy slot or the age math). Absent ⇒ every row's
     *  `ages` is '' (the band still resolves; the readout simply omits the ages line). */
    readonly formatAges?: (yearsFromNow: number) => string
  },
): ResolvedBandData {
  const grid = fan.byYear
  if (grid.length < 2) {
    throw new RangeError('resolveBandData: a fan needs at least the today anchor + one year')
  }
  // The grid is contiguous integer years (anchor 0, then 1, 2, … — buildBandFan's contract), so
  // grid[k] IS the yearsFromNow=k entry and floor(x)/ceil(x) index it directly.
  const horizonYears = grid[grid.length - 1]!.yearsFromNow

  const samples: BandSample[] = []
  const tooltipRows: BandTooltipRow[] = []
  let maxP90 = 0
  for (let i = 0; i < LATTICE_POINTS; i++) {
    const x = (i / (LATTICE_POINTS - 1)) * horizonYears
    const lo = Math.min(Math.floor(x), grid.length - 1)
    const hi = Math.min(lo + 1, grid.length - 1)
    const frac = x - lo
    const a = grid[lo]!
    const b = grid[hi]!
    const lerp = (pa: number, pb: number) => pa + frac * (pb - pa)
    // p10 / p50 / p90 are pulled out (not just inlined into the sample) because the readout row reuses
    // the SAME interpolated values — one computation feeds both the drawn vertex and its tooltip figure.
    const p10 = lerp(a.p10, b.p10)
    const p50 = lerp(a.p50, b.p50)
    const p90 = lerp(a.p90, b.p90)
    if (p90 > maxP90) maxP90 = p90
    // cohortFraction is the honesty signal — a band narrowing because COUPLES DIED must never read as
    // rising certainty (model.ts §BandFanYear). isFixedLattice gates the band EDGES only, so guard the
    // cohort signal HERE, finiteness-FIRST (insight 008/010 — a NaN passes every relational compare).
    const cohortFraction = lerp(a.cohortFraction, b.cohortFraction)
    if (!Number.isFinite(cohortFraction) || cohortFraction < 0 || cohortFraction > 1) {
      throw new RangeError(
        'resolveBandData: cohortFraction outside its [0,1] contract (NaN / <0 / >1) — the cohort-thinning honesty signal would draw a false certainty',
      )
    }
    samples.push({
      yearsFromNow: x,
      p10,
      p25: lerp(a.p25, b.p25),
      p50,
      p75: lerp(a.p75, b.p75),
      p90,
      cohortFraction,
    })
    // The lattice-aligned readout row — built from the SAME interpolated percentiles + year as the
    // sample above, so a figure can never drift from the vertex it annotates. Pre-formatted through the
    // injected formatters (string-free viz); `ages` is '' when no household-clock closure was supplied.
    tooltipRows.push({
      ages: opts.formatAges?.(x) ?? '',
      low: opts.formatDollar(p10),
      median: opts.formatDollar(p50),
      high: opts.formatDollar(p90),
    })
  }

  // dollarMax ≥ max(p90) — the asymmetric scale guard. niceCeil already returns ≥ its input; the
  // Math.max is a float-dust backstop so the `≥` is unconditional (the top edge never escapes).
  const dollarMax = Math.max(niceCeil(maxP90), maxP90)

  // FAIL LOUD AT THE SEAM on a non-positive ceiling (the `dollarMax > 0` yForDollars requires). An
  // all-$0 fan is VALID — a $0-portfolio, income-funded decumulation household (validateParams accepts
  // initialPortfolio === 0; only the accumulation construct rejects it, simulate.ts §683) — so it is
  // ordered + finite and isFixedLattice rightly accepts it, yet it has NO honest dollar scale
  // (maxP90 = 0 ⇒ dollarMax = 0). Throw HERE, the documented producer seam, rather than let yForDollars
  // throw mid-render: the $0-portfolio household renders its verdict WITHOUT a portfolio band (the
  // caller — D2 — screens this case; there is nothing to plot but the $0 floor).
  if (!(dollarMax > 0)) {
    throw new RangeError(
      'resolveBandData: an all-$0 fan ($0-portfolio household) has no positive dollar scale — render the verdict without a portfolio band',
    )
  }

  // THE PRODUCER SEAM GUARD (deferred U6-review): fail loud on a malformed fan BEFORE the band ever
  // draws it — never a silently-wrong band (back-nine-design §3; the calm-but-wrong sin).
  if (!isFixedLattice(samples)) {
    throw new RangeError(
      'resolveBandData: produced a malformed lattice (length / monotonic year / ordered-percentile contract) — a producer bug, never drawn',
    )
  }

  // y-ticks INCLUDING the $0 ruin-floor anchor — single-sourced via buildYTicks so the indeterminate
  // placeholder band matches a resolved card's gridlines by construction, not by a duplicated loop.
  const yTicks = buildYTicks(dollarMax, opts.formatDollar)

  return {
    kind: 'resolved',
    outcomeState,
    samples,
    dollarMax,
    horizonYears,
    yTicks,
    annotations: opts.annotations ?? [],
    callouts: opts.callouts ?? [],
    tooltipRows,
  }
}

/** A composed hover/scrub readout line: its display `text` (label words + the row's pre-formatted
 *  figures) and a semantic `kind` the renderer maps to a CSS class. The renderer owns only the
 *  kind→class mapping; the WHAT-to-show decision lives in {@link composeReadoutLines}. */
export type ReadoutLineKind = 'ages' | 'label' | 'value' | 'note'
export interface ReadoutLine {
  readonly text: string
  readonly kind: ReadoutLineKind
}

/**
 * Compose the readout's lines for one lattice column — the honesty-critical WHAT-to-show decision,
 * extracted as a PURE seam (mirroring nearestLatticeIndex / cohortFadeOpacity) so a regression that
 * re-shows crisp dollars on a dead cohort fails LOUD in a unit test instead of shipping green.
 *
 * - `thin` (the caller passes {@link isThinCohort}(sample.cohortFraction)) WITHDRAWS the crisp dollar
 *   lines and shows the calm note instead — the dead-cohort dollar suppression. When NOT thin, the
 *   spread leads (range first, the median LAST and subordinate, labelled "most likely" — never a
 *   prediction). Every figure arrives PRE-FORMATTED on the row (string-free viz); this only arranges
 *   label words around them.
 * - The ages line drops when `row.ages` is '' (no household-clock closure was supplied).
 */
export function composeReadoutLines(labels: BandLabels, row: BandTooltipRow, thin: boolean): ReadoutLine[] {
  const lines: ReadoutLine[] = []
  if (row.ages) lines.push({ text: `${labels.readoutAgesLabel} ${row.ages}`, kind: 'ages' })
  if (thin) {
    lines.push({ text: labels.readoutThinNote, kind: 'note' })
  } else {
    lines.push({ text: labels.readoutRangeLabel, kind: 'label' })
    lines.push({ text: `${row.low}${labels.readoutRangeJoiner}${row.high}`, kind: 'value' })
    lines.push({ text: labels.readoutMedianLabel, kind: 'label' })
    lines.push({ text: row.median, kind: 'value' })
  }
  return lines
}
