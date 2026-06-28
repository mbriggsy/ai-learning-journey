/*
 * src/ui/bandPanelChrome.ts — the confidence-band drawer's copy bundles, single-sourced.
 *
 * Both elevated surfaces that mount a <ConfidenceBandPanel> — the spine {@link ConfidenceStatement}
 * and the date {@link FuckOffDate} — hand it the SAME labels + chrome: it is the same band, only the
 * per-year data and the household-clock annotations differ by route. Single-sourcing the bundles keeps
 * a copy-key change in ONE place and stops the two surfaces from drifting into two slightly-different
 * band captions/legends (the project's read-don't-retype discipline).
 */
import { copy } from './copy'
import type { BandLabels } from '@viz/bandData'
import type { BandPanelChrome } from '@viz/ConfidenceBandPanel'

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
