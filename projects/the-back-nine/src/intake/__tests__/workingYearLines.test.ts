// The later-year lines' join rule, moved out of `WorkingYearLedger.test.tsx` with its function by Act 6's RC0, unchanged
// (`later` is that file's fixture, copied).
import { describe, expect, it } from 'vitest'
import type { WorkingYearLedgerLaterYear } from '@shared/model'
import { laterLines } from '../workingYearLines'

const later = (yearsIn: number, bottomLine: number, events: WorkingYearLedgerLaterYear['events'], over: Partial<WorkingYearLedgerLaterYear> = {}): WorkingYearLedgerLaterYear => ({
  yearsIn,
  calendarYear: 2026 + yearsIn,
  events,
  bottomLine,
  cash: bottomLine,
  withheldBasis: 'law',
  ...over,
})

describe('laterLines', () => {
  it('laterLines: a stillShort year joins the line before it only when CONSECUTIVE and short', () => {
    const lines = laterLines([
      later(1, -5, [{ code: 'claim', person: 0 }]),
      later(2, -5, [{ code: 'stillShort' }]),
      later(4, 7, [{ code: 'turns65', person: 1 }]),
      later(5, -1, [{ code: 'erosion' }]),
      later(6, -2, [{ code: 'stillShort' }]),
      // Never after a year that was not short, and never across a gap (the producer emits neither; the
      // join rule still holds on its own).
      later(7, 3, [{ code: 'turns65', person: 0 }]),
      later(8, -2, [{ code: 'stillShort' }]),
      later(10, -2, [{ code: 'stillShort' }]),
    ])
    expect(lines.map((l) => (l.kind === 'year' ? `y${l.year.yearsIn}` : `r${l.years.map((y) => y.yearsIn).join('-')}`))).toEqual([
      'r1-2',
      'y4',
      'r5-6',
      'y7',
      'r8',
      'r10',
    ])
  })
})
