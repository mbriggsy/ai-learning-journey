/**
 * The surviving-cohort honesty rules every chart shares: the dead-cohort gate, the fade onset, the fan's cut where the
 * cohort thins, and the screen-reader range's column. Moved out of `bandGeometry.ts` by Act 6's RC0, unchanged, so the
 * rules outlive the hand-drawn band.
 */
import type { BandSample } from './bandData'

/** The dead-cohort dollar-withdrawal gate for the hover/scrub readout: TRUE where the surviving-couple
 *  cohort has thinned past the SAME {@link COHORT_FADE}.full onset at which the fan begins to visually
 *  fade — so the readout's crisp figures withdraw EXACTLY where the band goes quiet (honesty by a shared
 *  threshold; the old band's fade, `cohortFadeOpacity`, left with `bandGeometry.ts` at Act 6's RC10). A confident "$X at age 97" on a handful
 *  of surviving couples is the calm-but-wrong sin this gate prevents. A non-finite / absent cohort reads
 *  as a FULL cohort (not thin) — the {@link BandSample} contract's documented default; live input is
 *  always finite (resolveBandData guards it), so this only governs hand-built fixtures. */
export function isThinCohort(cohortFraction: number | undefined): boolean {
  const c = Number.isFinite(cohortFraction) ? (cohortFraction as number) : 1
  return c < COHORT_FADE.full
}

/** The fade curve (cold-read-TUNABLE): opacity is FULL at/above `full`, ramps linearly to a faint
 *  `floor` at/below `floorAt`. `floor` is > 0 by design — the thin tail is DE-EMPHASIZED, never
 *  hidden (hiding it would fabricate a confident earlier horizon). */
export const COHORT_FADE = { full: 0.5, floorAt: 0.04, floor: 0.12 } as const

/**
 * Truncate a fan's grid where the surviving cohort thins below {@link COHORT_FADE}.full — the
 * chart simply ENDS where too few couples remain to say anything (N=1 cold-read 2026-07-03:
 * the faded tail spent real estate on "too few couples to show a range"; the honest cut beats
 * the honest whisper — the same law TwoFutures' median series already rides). cohortFraction
 * is monotone non-increasing (deaths only accumulate), so the last ≥-full index is a clean
 * prefix cut. Defensive arms: a fan whose SECOND year is already thin (nothing left to draw)
 * and a fan with no thin tail both pass through untouched — the caller's ≥2-years screen and
 * the fade machinery (now naturally a no-op at ≥ full) stay as belt-and-suspenders.
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

/** The cohort-cleanliness floor for the AT range column: the surviving-couple fraction a column must
 *  clear to be quoted to a screen-reader user. Deliberately ABOVE {@link COHORT_FADE}.full (0.5) — a
 *  0.5 cohort is survivor-dominated and UNFADED (the Hawk's calm-but-wrong slice). cold-read-TUNABLE:
 *  the exact value is Briggsy's owed N=1 cold-read (start firm at a well-populated 0.75); deeper →
 *  earlier/safer year, shallower → later/wider but thinner. NEVER re-typed elsewhere (one home). */
export const AT_RANGE_COHORT_MIN = 0.75

/** Pick the lattice column the AT range quotes: the DEEPEST INTERIOR column — excludes the today anchor
 *  (i=0, zero dispersion) and the horizon (i=n−1, the thinnest terminal slice) — whose cohortFraction
 *  clears `cohortMin` AND passes {@link isThinCohort} (bound to the same fade onset, so the AT channel and
 *  the visible fade withdraw together). cohortFraction is monotone non-increasing in time, so the first
 *  qualifier walking back from the horizon IS the deepest. Returns `null` when NO interior column
 *  qualifies — the honest WITHDRAWAL (silence over a fabricated range for the one reader who can't watch
 *  the fan thin). Pure + exported so the honesty gate is unit-tested, never an inline branch on an
 *  undrivable render path (insight 048). */
export function selectAtRangeColumn(samples: readonly BandSample[], cohortMin: number): number | null {
  for (let i = samples.length - 2; i >= 1; i--) {
    const c = samples[i]!.cohortFraction
    if (c !== undefined && c >= cohortMin && !isThinCohort(c)) return i
  }
  return null
}
