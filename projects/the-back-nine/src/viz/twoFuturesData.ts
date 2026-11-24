/**
 * The two-futures chart's data contract and pure seams (`TwoFutures.tsx` draws it; its header holds the honesty
 * contracts): the series and readout shapes, the plot box, the shared dollar lattice and ceiling, the snap-to-year and
 * the readout's lines. Moved out of `TwoFutures.tsx` by Act 6's RC0, unchanged.
 */
import { niceLattice, type DollarLattice } from './bandData'

export interface TwoFuturesPoint {
  readonly yearsFromNow: number
  readonly medianReal: number
}

/** One integer-lattice-year readout row for the hover scrub (composed by twoFuturesChrome — every
 *  figure pre-formatted, string-free viz). A per-arm value is ABSENT where that arm's series has
 *  ended (dead-cohort truncation): the line visibly stops, so the readout goes quiet with it. */
export interface TwoFuturesReadoutRow {
  readonly yearsFromNow: number
  /** Both spouses' ages at this year (the SAME slot + rule the fan's readout uses); '' when no
   *  household-ages closure was supplied — the line simply drops. */
  readonly ages: string
  readonly withValue?: string
  readonly withoutValue?: string
}

/** An intermediate x-axis year tick (between the today/horizon endpoint labels). */
export interface TwoFuturesXTick {
  readonly years: number
  readonly label: string
}

export interface TwoFuturesLabels {
  /** Direct end-of-line label for the WITH arm (e.g. "With the conversion"). */
  readonly withLabel: string
  /** Direct end-of-line label for the WITHOUT arm (e.g. "Today’s plan"). */
  readonly withoutLabel: string
  /** The y-ceiling gridline's preformatted dollar label (e.g. "~$1.2M"). Rendered only on the
   *  legacy no-yTicks path — a supplied yTicks lattice carries its own top label. */
  readonly dollarMaxLabel: string
  /** The x-axis endpoints. */
  readonly todayLabel: string
  readonly horizonLabel: string
  /** Leads the readout's ages line (the fan's own `bandReadoutAgesLabel` word). Optional so the
   *  legacy callers (and an ages-less readout) stay valid; the line drops when absent. */
  readonly readoutAgesLabel?: string
  /** The whole figure's accessible sentence (role="img" — the a11y-tree text alternative). */
  readonly ariaSummary: string
}

export const TF_VIEW = { w: 560, h: 280 } as const
/** Plot box. `left` holds the fan-parity y-label gutter (bandGeometry PLOT.left = 92 — the same
 *  fraction of the same 560-wide viewBox family, so the HTML tick column renders at the same width
 *  the band's does); `right` reserves the end-label column (134 units, in which an end label WRAPS). */
export const TF_PLOT = { left: 92, right: 148, top: 18, bottom: 252 } as const

/** A calm dollar lattice for this chart — the SAME rule the fan's axis rides (bandData.niceLattice:
 *  one nice STEP of {1, 2, 2.5, 5} × 10^e, the ceiling being that step times the covering count), so
 *  the two charts can never grow two dollar ladders (fan parity, Briggsy's station-2 cold-read
 *  2026-07-08; Card 10, 2026-09-11 — the quartered-ceiling era printed "$1.125M" here beside a fan
 *  riding $0.5M steps). A degenerate input (non-finite, ≤ 0) falls back to the lattice for $1, so the
 *  axis is never $0-tall/undrawable. Pure + exported for the planted-fail test. */
export function twoFuturesLattice(maxDollar: number): DollarLattice {
  const l = niceLattice(Number.isFinite(maxDollar) ? maxDollar : 0)
  return l.ceiling > 0 ? l : niceLattice(1)
}

/** The drawn ceiling of {@link twoFuturesLattice} — the bar-magnitude scale RecommendationViz and
 *  recommendationView share with this chart's axis (one ceiling, two charts). */
export function twoFuturesCeiling(maxDollar: number): number {
  return twoFuturesLattice(maxDollar).ceiling
}

/** Snap a viewBox x to the nearest integer lattice year (the fan's nearestLatticeIndex, on the TF
 *  plot). Clamped to [0, horizonYears]; a non-finite x or degenerate horizon yields today (0). */
export function tfNearestYear(viewBoxX: number, horizonYears: number): number {
  if (!Number.isFinite(viewBoxX) || horizonYears < 1) return 0
  const plotRight = TF_VIEW.w - TF_PLOT.right
  const t = Math.min(1, Math.max(0, (viewBoxX - TF_PLOT.left) / (plotRight - TF_PLOT.left)))
  const y = Math.round(t * horizonYears)
  return y < 0 ? 0 : y > horizonYears ? horizonYears : y
}

/** Compose the readout's lines for one lattice year (the fan's composeReadoutLines shape — a PURE
 *  seam so the quiet-where-the-line-ends honesty is unit-testable): ages first (drops when
 *  unsupplied), then per arm a label + value pair ONLY where that arm still has a median (an
 *  ended arm's pair drops with its line — never a figure past the cohort). Baseline (without)
 *  leads, mirroring the drawn stack and the delta sentence's grammar. */
export type TfReadoutLineKind = 'ages' | 'label' | 'value'
export interface TfReadoutLine {
  readonly text: string
  readonly kind: TfReadoutLineKind
}
export function composeTfReadoutLines(
  labels: TwoFuturesLabels,
  row: TwoFuturesReadoutRow,
): TfReadoutLine[] {
  const lines: TfReadoutLine[] = []
  if (row.ages && labels.readoutAgesLabel) {
    lines.push({ text: `${labels.readoutAgesLabel} ${row.ages}`, kind: 'ages' })
  }
  if (row.withoutValue !== undefined) {
    lines.push({ text: labels.withoutLabel, kind: 'label' })
    lines.push({ text: row.withoutValue, kind: 'value' })
  }
  if (row.withValue !== undefined) {
    lines.push({ text: labels.withLabel, kind: 'label' })
    lines.push({ text: row.withValue, kind: 'value' })
  }
  return lines
}
