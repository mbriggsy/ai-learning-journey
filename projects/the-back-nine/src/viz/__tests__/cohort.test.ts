// The surviving-cohort rule's arms, moved out of `bandGeometry.test.ts` with their functions by Act 6's RC0. The
// dead-cohort readout gate, the fade's floor and the screen-reader range column went with the hand-drawn band at RC10
// (nothing read them any more): the cut below is the one rule left, at the one onset.
import { describe, expect, it } from 'vitest'
import { truncateFanAtThinCohort } from '../cohort'

// Cold-read 2026-07-03 — the chart ENDS where the cohort thins (the honest cut replaced the faded tail).
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
