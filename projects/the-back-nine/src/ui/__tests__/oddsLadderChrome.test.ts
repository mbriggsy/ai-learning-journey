import { describe, expect, it } from 'vitest'
import { LADDER_LABELS } from '../oddsLadderChrome'
import { slots } from '../copy'
import type { CurveMark } from '@viz/curveMarks'

/*
 * The ladder chrome's describeMark wiring — the seam between curveMarks' state-derived
 * `atCeiling` flag and ladderMarkAria's ceiling de-stack (council 2026-07-18 Q2). The
 * renderer is covered with injected labels (OddsLadder.test.tsx) and the flag's derivation
 * in curveMarks.test.ts; THIS pins the hand-off: a ceiling mark's sentence drops the
 * "about" (the bound is the hedge), a below-ceiling mark keeps it.
 */

const mark = (over: Partial<CurveMark>): CurveMark => ({
  offsetYears: 3,
  planOffsetYears: 3,
  rung: 8,
  atCeiling: false,
  clears: false,
  isDip: false,
  isCrown: false,
  ...over,
})

describe('LADDER_LABELS.describeMark — the ceiling de-stack wiring', () => {
  it('a CEILING mark speaks the bound alone — "better than 9 in 10", never the stacked "about better than"', () => {
    const aria = LADDER_LABELS.describeMark(mark({ rung: 10, atCeiling: true, clears: true, isDip: true }))
    expect(aria).toContain('better than 9 in 10')
    expect(aria).not.toContain('about better than')
    expect(aria).not.toContain('10 of 10')
    // Byte-pinned through the slot (the single-sourced sentence both channels render).
    expect(aria).toBe(slots.ladderMarkAria(3, slots.xOfTen(10), 'dip', true))
  })

  it('a below-ceiling mark keeps its "about" hedge (the de-stack narrows only the ceiling)', () => {
    const aria = LADDER_LABELS.describeMark(mark({ rung: 8, clears: true }))
    expect(aria).toContain(`about ${slots.xOfTen(8)}`)
    expect(aria).toBe(slots.ladderMarkAria(3, slots.xOfTen(8), 'clears', false))
  })
})
