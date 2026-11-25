// The surviving-cohort rules' arms, moved out of `bandGeometry.test.ts` with their functions by Act 6's RC0, unchanged.
// The gate's bind to the old band's visual fade (`cohortFadeOpacity`) went with `bandGeometry.ts` at Act 6's RC10: no
// chart fades a thin tail any more (each one ends where the cohort thins), so the onset itself is the one rule left.
import { describe, expect, it } from 'vitest'
import type { BandSample } from '../bandData'
import { AT_RANGE_COHORT_MIN, COHORT_FADE, isThinCohort, selectAtRangeColumn, truncateFanAtThinCohort } from '../cohort'

describe('isThinCohort — the dead-cohort dollar-withdrawal gate (bound to the visual fade onset)', () => {
  it('withdraws (thin) strictly BELOW the COHORT_FADE.full onset, shows dollars AT/above it', () => {
    expect(isThinCohort(COHORT_FADE.full)).toBe(false) // at the onset → still crisp (matches full opacity)
    expect(isThinCohort(COHORT_FADE.full - 0.001)).toBe(true) // just below → withdraw
    expect(isThinCohort(1)).toBe(false) // full cohort → crisp
    expect(isThinCohort(0)).toBe(true) // dead cohort → withdraw
  })

  it('a non-finite or absent cohort reads as a FULL cohort (not thin) — the BandSample default', () => {
    expect(isThinCohort(undefined)).toBe(false)
    expect(isThinCohort(Number.NaN)).toBe(false)
  })
})

describe('selectAtRangeColumn — the AT (screen-reader) range column (council 2026-06-29)', () => {
  const sample = (cohortFraction: number): BandSample => ({
    yearsFromNow: 0,
    p10: 0,
    p25: 0,
    p50: 0,
    p75: 0,
    p90: 0,
    cohortFraction,
  })
  const samples = (cohorts: number[]): BandSample[] => cohorts.map(sample)

  it('the cleanliness floor sits COMFORTABLY ABOVE the fade onset (never the survivor-dominated gate edge)', () => {
    expect(AT_RANGE_COHORT_MIN).toBeGreaterThan(COHORT_FADE.full)
  })

  it('picks the DEEPEST interior column whose cohort clears the floor', () => {
    // cohort is monotone non-increasing; indices 1,2,3 clear 0.75 → the DEEPEST of them (3) is chosen.
    expect(selectAtRangeColumn(samples([1, 1, 0.9, 0.8, 0.6, 0.4, 0.2]), AT_RANGE_COHORT_MIN)).toBe(3)
  })

  it('EXCLUDES the horizon even when it qualifies (planted-fail: the terminal slice is never the AT range)', () => {
    // every column is a full cohort, so the horizon (index 4) clears too — but it is excluded, and the
    // deepest INTERIOR column (index 3) wins. Remove the n-2 cap and this returns 4.
    expect(selectAtRangeColumn(samples([1, 1, 1, 1, 1]), AT_RANGE_COHORT_MIN)).toBe(3)
  })

  it('EXCLUDES the today anchor (index 0, zero dispersion) — withdraws rather than quote it', () => {
    // only today clears the floor; every interior column is thin → withdraw to silence, NEVER index 0.
    expect(selectAtRangeColumn(samples([1, 0.4, 0.3, 0.2, 0.1]), AT_RANGE_COHORT_MIN)).toBeNull()
  })

  it('WITHDRAWS (null) when no interior column clears the floor — even a NON-thin column below it is skipped', () => {
    // 0.6 is NOT thin (> COHORT_FADE.full = 0.5) yet below the cleanliness floor → still not quoted.
    expect(isThinCohort(0.6)).toBe(false)
    expect(selectAtRangeColumn(samples([1, 0.6, 0.6, 0.6, 0.6]), AT_RANGE_COHORT_MIN)).toBeNull()
  })

  it('honors an arbitrary cohortMin (the floor is a parameter; the constant is only the production value)', () => {
    // at a 0.5 floor the same 0.6 columns qualify → the deepest interior (index 3).
    expect(selectAtRangeColumn(samples([1, 0.6, 0.6, 0.6, 0.6]), 0.5)).toBe(3)
  })

  it('an absent cohortFraction never qualifies (a hand-built fixture row is skipped, never quoted)', () => {
    const mixed = samples([1, 0.9, 0.8, 0.7, 0.6])
    const withGap = [mixed[0]!, { ...mixed[1]!, cohortFraction: undefined }, mixed[2]!, mixed[3]!, mixed[4]!]
    // index 2 (0.8) is the deepest interior clearing 0.75 — index 1's absent cohort is skipped.
    expect(selectAtRangeColumn(withGap, AT_RANGE_COHORT_MIN)).toBe(2)
  })
})

// Cold-read 2026-07-03 — the chart ENDS where the cohort thins (the honest cut replaced the
// faded tail; one law with TwoFutures' median truncation).
describe('truncateFanAtThinCohort', () => {
  const yr = (cohortFraction: number) => ({ cohortFraction })

  it('cuts the grid after the last ≥ COHORT_FADE.full year', () => {
    const grid = [yr(1), yr(0.9), yr(0.6), yr(0.5), yr(0.3), yr(0.1)]
    expect(truncateFanAtThinCohort(grid)).toEqual([yr(1), yr(0.9), yr(0.6), yr(0.5)])
  })

  it('a fan with no thin tail passes through IDENTICALLY (the no-op stays a no-op)', () => {
    const grid = [yr(1), yr(0.8), yr(0.6)]
    expect(truncateFanAtThinCohort(grid)).toBe(grid)
  })

  it('a fan already thin by its second year passes through untouched (nothing left to cut to)', () => {
    const grid = [yr(1), yr(0.2), yr(0.1)]
    expect(truncateFanAtThinCohort(grid)).toBe(grid)
  })

  it('a NaN cohort never counts as full (finiteness-first)', () => {
    const grid = [yr(1), yr(0.7), yr(Number.NaN), yr(0.1)]
    expect(truncateFanAtThinCohort(grid)).toEqual([yr(1), yr(0.7)])
  })
})
