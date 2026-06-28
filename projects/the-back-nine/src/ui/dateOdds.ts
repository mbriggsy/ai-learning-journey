/*
 * src/ui/dateOdds.ts — the date's conservative odds reading, SINGLE-SOURCED.
 *
 * A crowned (or window-edge) date carries a {@link DateGrade} whose `quantizedLowerBound` is the
 * CONSERVATIVE one-sided lower bound (the point estimate is ≥ it, the disclosed margin). This maps
 * that bound to the pinned "X of 10" frame and wraps it as odds — the SAME reading the provisional
 * `DateLine` (AnswerStrip) shows, pinned in ONE place so the elevated FuckOffDate surface and the
 * strip can never drift (the e2 lesson: an honesty-critical mapping lives once).
 *
 * The xOfTen slot's defensive clamp turns a ≥ 0.95 bound (round → 10) into "better than 9 in 10"
 * (never "10 of 10") — the same 10-of-10 honesty clamp the headline rides. Reads the bound, never
 * the point estimate (reading the lower bound is what keeps a lucky-noise offset honest, §3c).
 */
import { slots } from './copy'

/** The odds clause for a date grade's quantized lower bound, e.g. "about 9 of 10 odds". */
export function dateOddsText(quantizedLowerBound: number): string {
  return slots.withOdds(slots.xOfTen(Math.round(quantizedLowerBound * 10)))
}
