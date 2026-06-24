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

import type { OutcomeState } from '@shared/model'

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
}

/** A RESOLVED fan — a real distribution to draw. */
export interface ResolvedBandData {
  readonly kind: 'resolved'
  /** The outcome state the engine tagged this distribution with (carried for the a11y text +
   *  so a consumer can vary surrounding copy; the band's geometry is state-agnostic). */
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
 *  non-decreasing in `yearsFromNow`. A malformed fan is a caller bug — fail loud, never draw a
 *  silently-wrong band (the calm-but-wrong sin). */
export function isFixedLattice(samples: readonly BandSample[]): boolean {
  if (samples.length !== LATTICE_POINTS) return false
  for (let i = 1; i < samples.length; i++) {
    if (!(samples[i]!.yearsFromNow >= samples[i - 1]!.yearsFromNow)) return false
  }
  return true
}
