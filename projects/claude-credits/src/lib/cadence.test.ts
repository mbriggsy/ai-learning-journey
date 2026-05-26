import { describe, it, expect } from 'vitest'
import type { GitStats } from '@/types'
import { isCadenceTrustworthy, MONOREPO_BULK_IMPORT_DAY } from './cadence'

type Timeline = GitStats['timeline']

const timeline = (activeDays: number, dates: string[]): Timeline =>
  ({
    activeDays,
    commitsByDay: dates.map((date) => ({ date, count: 1 })),
    peakDay: null,
    largestSingleCommit: null,
  }) as unknown as Timeline

describe('isCadenceTrustworthy', () => {
  it('genuinely-iterated project (no bulk-import day, ample active days) → true', () => {
    // burned-shaped: 38 active days across Apr–May, never touches Feb 21.
    expect(isCadenceTrustworthy(timeline(38, ['2026-04-08', '2026-05-01', '2026-05-24']))).toBe(true)
  })

  it('bulk-imported toy (history includes the 2026-02-21 import day) → false', () => {
    // tic-tac-toe-shaped: the false origin spike lives on the repo birthday.
    expect(isCadenceTrustworthy(timeline(3, [MONOREPO_BULK_IMPORT_DAY, '2026-05-09']))).toBe(false)
  })

  it('too few active days to be a rhythm (< 5) → false even without the import day', () => {
    expect(isCadenceTrustworthy(timeline(4, ['2026-03-01', '2026-03-02', '2026-03-03', '2026-03-04']))).toBe(false)
  })

  it('exactly 5 active days, bulk-import-free → true (boundary)', () => {
    expect(
      isCadenceTrustworthy(timeline(5, ['2026-03-01', '2026-03-02', '2026-03-03', '2026-03-04', '2026-03-05'])),
    ).toBe(true)
  })

  it('the import day disqualifies even a high-active-day project (date check is independent)', () => {
    expect(isCadenceTrustworthy(timeline(40, [MONOREPO_BULK_IMPORT_DAY, '2026-04-08', '2026-05-24']))).toBe(false)
  })

  it('empty commitsByDay / non-repo → false', () => {
    expect(isCadenceTrustworthy(timeline(0, []))).toBe(false)
  })

  it('null / undefined timeline → false (never throws)', () => {
    expect(isCadenceTrustworthy(null)).toBe(false)
    expect(isCadenceTrustworthy(undefined)).toBe(false)
  })
})
