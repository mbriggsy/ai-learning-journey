/*
 * src/ui/oddsLadderChrome.ts — the D2c odds-ladder's copy bundle, single-sourced (mirrors
 * bandPanelChrome.ts). The viz <OddsLadder> is string-free; this fills its labels from copy.ts so
 * a copy-key change lives in ONE place and the renderer never types a word or numeral.
 *
 * THE HONESTY SEAM lives here: `formatOdds` is slots.xOfTen — the SAME clamped mapping the headline
 * odds ride, so the plotted rung's spoken label can never print "10 of 10" (a ≥ 0.95 rung reads
 * "better than 9 in 10"), and `describeMark` routes its odds through it too, so the a11y tree never
 * speaks a certainty either.
 */
import { copy, slots } from './copy'
import type { CurveMark } from '@viz/curveMarks'
import type { OddsLadderLabels } from '@viz/OddsLadder'

/** The non-color reading of a mark (drives the a11y sentence) — crown > dip > clears > below. */
function markState(m: CurveMark): 'crown' | 'dip' | 'clears' | 'below' {
  return m.isCrown ? 'crown' : m.isDip ? 'dip' : m.clears ? 'clears' : 'below'
}

export const LADDER_LABELS: OddsLadderLabels = {
  caption: copy.ladderCaption,
  formatOdds: slots.xOfTen, // the clamped X-of-10 — never "10 of 10"
  formatOffset: slots.ladderOffsetTick,
  xAxisLabel: copy.ladderXAxis,
  barLabel: copy.ladderBarLabel,
  crownLabel: copy.ladderCrownLabel,
  // ONE sentence, TWO channels: every dot's aria-label AND the hover/scrub readout line render
  // this same worded reading (single-sourced — the two can never disagree).
  describeMark: (m) => slots.ladderMarkAria(m.offsetYears, slots.xOfTen(m.rung), markState(m)),
}
