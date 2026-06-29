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
 */
export function composeBandAtRange(resolved: ResolvedBandData): string | null {
  const i = selectAtRangeColumn(resolved.samples, AT_RANGE_COHORT_MIN)
  if (i === null) return null
  const row = resolved.tooltipRows[i]!
  const years = Math.round(resolved.samples[i]!.yearsFromNow)
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
