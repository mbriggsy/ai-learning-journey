/*
 * src/ui/dateOdds.ts — the date's conservative odds reading, SINGLE-SOURCED.
 *
 * A crowned (or window-edge) date carries a {@link DateGrade} whose `quantizedLowerBound` is the
 * CONSERVATIVE one-sided lower bound (the point estimate is ≥ it, the disclosed margin). This maps
 * that bound to the pinned "X of 10" frame and wraps it as odds — the SAME reading the provisional
 * `DateLine` (AnswerStrip) shows, pinned in ONE place so the elevated FuckOffDate surface and the
 * strip can never drift (the e2 lesson: an honesty-critical mapping lives once).
 *
 * A ≥ 0.95 bound (round → 10) rides the ceiling BY NAME: "better than 9 in 10 odds" (never
 * "10 of 10") — the same 10-of-10 honesty clamp the headline rides, WITHOUT the "about" hedge
 * ("better than" is already the bound; "about better than 9 in 10 odds" was the double hedge
 * the rule-36 sweep killed — council 2026-07-18 Q2; the branch reads the COUNT, never a
 * rendered string). Reads the bound, never the point estimate (reading the lower bound is
 * what keeps a lucky-noise offset honest, §3c).
 */
import { slots } from './copy'

/** The odds clause for a date grade's quantized lower bound, e.g. "about 9 of 10 odds"
 *  (at the ceiling: "better than 9 in 10 odds"). */
export function dateOddsText(quantizedLowerBound: number): string {
  const n = Math.round(quantizedLowerBound * 10)
  return n >= 10 ? slots.withOddsAtCeiling() : slots.withOdds(slots.xOfTen(n))
}
