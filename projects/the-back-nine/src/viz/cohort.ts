/**
 * The surviving-cohort honesty rule every chart shares: the fan is CUT where the surviving cohort thins, at one onset
 * ({@link COHORT_FADE}.full) that the health readout's quotable years read too (`src/ui/healthSheetChrome.ts`). Moved out
 * of `bandGeometry.ts` by Act 6's RC0; the dead-cohort readout gate, the fade's floor and the screen-reader range column
 * left with the hand-drawn band and its readout at RC10, when nothing read them any more.
 */

/** The thin-cohort onset: below `full` of the couples still alive, too few remain to say anything about a range or a
 *  median (cold-read-TUNABLE). */
export const COHORT_FADE = { full: 0.5 } as const

/**
 * Truncate a fan's grid where the surviving cohort thins below {@link COHORT_FADE}.full — the
 * chart simply ENDS where too few couples remain to say anything (N=1 cold-read 2026-07-03:
 * the faded tail spent real estate on "too few couples to show a range"; the honest cut beats
 * the honest whisper). cohortFraction is monotone non-increasing (deaths only accumulate), so the
 * last ≥-full index is a clean prefix cut. Defensive arms: a fan whose SECOND year is already thin
 * (nothing left to draw) and a fan with no thin tail both pass through untouched.
 */
export function truncateFanAtThinCohort<T extends { readonly cohortFraction: number }>(byYear: readonly T[]): readonly T[] {
  let lastFull = -1
  for (let i = 0; i < byYear.length; i++) {
    const c = byYear[i]!.cohortFraction
    if (Number.isFinite(c) && c >= COHORT_FADE.full) lastFull = i
  }
  if (lastFull < 1 || lastFull === byYear.length - 1) return byYear
  return byYear.slice(0, lastFull + 1)
}
