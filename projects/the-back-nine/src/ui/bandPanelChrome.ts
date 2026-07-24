/*
 * src/ui/bandPanelChrome.ts — the confidence-band drawer's copy bundles, single-sourced.
 *
 * Both elevated surfaces that mount a <ConfidenceBandPanel> — the spine {@link ConfidenceStatement}
 * and the date {@link FuckOffDate} — hand it the SAME labels + chrome: it is the same band, only the
 * per-year data and the household-clock annotations differ by route. Single-sourcing the bundles keeps
 * a copy-key change in ONE place and stops the two surfaces from drifting into two slightly-different
 * band captions/legends (the project's read-don't-retype discipline).
 */
import { copy, slots } from './copy'
import { formatAxisDollar } from './money'
import type { BandSavedAnchor } from './bandAnnotations'
import type { BandLabels, ResolvedBandData } from '@viz/bandData'
import type { BandPanelChrome } from '@viz/ConfidenceBandPanel'
import { selectAtRangeColumn, AT_RANGE_COHORT_MIN } from '@viz/bandGeometry'

/** The band's accessible labels (caption, axes, the supplementary legend rows). */
export const BAND_LABELS: BandLabels = {
  caption: copy.bandCaption,
  yAxisLabel: copy.bandYAxis,
  xAxisLabel: copy.bandXAxis,
  legendMedian: copy.bandLegendMedian,
  legendInner: copy.bandLegendInner,
  legendOuter: copy.bandLegendOuter,
  readoutAgesLabel: copy.bandReadoutAgesLabel,
  readoutRangeLabel: copy.bandReadoutRangeLabel,
  readoutRangeJoiner: copy.bandReadoutRangeJoiner,
  readoutMedianLabel: copy.bandReadoutMedianLabel,
  readoutThinNote: copy.bandReadoutThinNote,
}

/** The drawer chrome (pull-tab overline, enlarge trigger, modal title + close). */
export const BAND_CHROME: BandPanelChrome = {
  pull: copy.bandPull,
  enlargeLabel: copy.bandStudyRange,
  modalTitle: copy.bandModalTitle,
  closeLabel: copy.bandClose,
}

/**
 * Compose the screen-reader-only band range sentence — the AT portfolio-range parity (Council
 * 2026-06-29, `docs/council-log.md`). The sighted reader gets the fan + the pointer/scrub readout
 * (aria-hidden); the SR reader gets this ONE static sentence so they hear the band's $ range too.
 *
 * SINGLE-SOURCED: it quotes the SAME resampled `tooltipRows` figures the scrub shows, at the column the
 * pure {@link selectAtRangeColumn} picks (deepest cohort-clean INTERIOR column) — so the two channels
 * physically cannot diverge. SURVIVOR-NEUTRAL anchor (years-from-now, never the both-alive ages). The $0
 * low edge is spoken AS depletion, never a soft "$0". Returns `null` to WITHDRAW (no cohort-clean column
 * — the honest silence, mirroring the scrub's dead-cohort thin-note). Pure off the resolved data, so it
 * re-renders WITH the band on a provisional→final scale re-key (insight 047), never a stranded figure.
 *
 * O3 RATIFIED AS-DESIGNED (council 2026-07-10, wf_27e87ceb-745; CLOSED same day by the low-edge
 * probe — PASS on all three fixtures): the IQR "middle half" band, the y-tick dollar ladder, and
 * the legend text owe this sentence NOTHING — the sighted scrub itself quotes p10/p50/p90 and never
 * an IQR figure (parity is with the sighted NUMERIC channel, and folding p25/p75 in would hand the
 * SR reader MORE precision than any sighted reader gets); the y-ticks are a position→dollar decoder
 * the SR reader is handed pre-decoded; the legend's two load-bearing tiers are verbatim in the
 * sentence. Do NOT add a second SR sentence or an SR tick-ladder. The red team's anchor-direction
 * doubt was MEASURED, not reasoned away: on date/datesplit/retired the anchor column IS the
 * couple-clean region's minimum low edge (anchorIsCleanMin true ×3 — the numbers live in the
 * docs/council-log.md O3 row); every lower low sits in the survivor-dominated 0.5–0.75 band the
 * Briggsy-approved AT_RANGE_COHORT_MIN margin deliberately excludes (his cold-read-TUNABLE knob).
 */
export function composeBandAtRange(
  resolved: ResolvedBandData,
  savedAnchor?: BandSavedAnchor,
): string | null {
  const i = selectAtRangeColumn(resolved.samples, AT_RANGE_COHORT_MIN)
  if (i === null) return null
  const row = resolved.tooltipRows[i]!
  // "About N years OUT" re-bases to WALL time on an aged plan (the one-screen-one-time-base
  // law's last un-anchored text — ultramode 2026-07-10, mildly OPTIMISTIC direction: a plan-time
  // count overstates the remaining runway by the years since the plan was BUILT). The COLUMN
  // stays plan-time data (the same resampled figures the scrub shows); only the spoken distance
  // re-derives. Math.max(0, …) is defensive-only: the anchor column sits ≥ ~15y deep for any
  // real household while the plan clock is codec-bounded to ~6.
  const yearsSinceBuilt = savedAnchor?.yearsSincePlanBuilt ?? 0
  const years = Math.max(0, Math.round(resolved.samples[i]!.yearsFromNow) - yearsSinceBuilt)
  // Depletion by the DISPLAYED figure (never a soft "$0"), tested against the SAME formatter the row
  // uses (so a lerp-dust $0.4 that formats to "$0" is caught too). Three honest shapes, median first:
  //  - median reads $0 ⇒ TOTAL depletion (already-failing): the savings are most likely gone — "$0 but
  //    the hardest futures run out" would be self-contradictory (a $0 median IS the floor).
  //  - low reads $0, median positive ⇒ the median holds but the low futures deplete: speak it AS ruin.
  //  - otherwise ⇒ the normal range-first sentence.
  const zeroStr = formatAxisDollar(0)
  if (row.median === zeroStr) return slots.bandAtRangeGone(years)
  if (row.low === zeroStr) return slots.bandAtRangeRuin(years, row.median)
  return slots.bandAtRange(years, row.low, row.high, row.median)
}
