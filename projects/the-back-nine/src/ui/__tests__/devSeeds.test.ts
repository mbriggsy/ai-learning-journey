import { describe, expect, it } from 'vitest'
import { DEV_SEEDS } from '../devSeeds'
import { buildDateInput, buildSpineParams, isDateRoute, missingRequiredFacts } from '@intake/intakeMap'
import { validateParams } from '@engine/simulate'
import { buildCandidateParams, DATE_OFFSET_WINDOW_TOP, DATE_SEARCH_PATHS } from '@engine/dateSearch'

/**
 * The dev-seed validity proof (the SAME render-anchor coupling intakeMap.test.ts
 * pins): a seed jumps straight to `phase='result'`, so it MUST build params the
 * REAL engine validator accepts — otherwise the seed lands on an indeterminate /
 * input-failure screen instead of the worded answer it exists to reach. Proven
 * against `validateParams`, not the seed's own formula (DND 012 spirit).
 */
describe('dev seeds reach a worded (engine-accepted) answer', () => {
  it('the all-retired seed builds ACCEPTED spine params', () => {
    const d = DEV_SEEDS.retired
    expect(isDateRoute(d)).toBe(false)
    expect(missingRequiredFacts(d)).toEqual([])
    const params = buildSpineParams(d)
    expect(params).not.toBeNull()
    expect(validateParams(params!)).toBeNull() // accepted — no UI/engine drift
  })

  it('the still-working seed builds input EVERY date candidate accepts (all-or-nothing sweep)', () => {
    const d = DEV_SEEDS.date
    expect(isDateRoute(d)).toBe(true)
    expect(missingRequiredFacts(d)).toEqual([])
    const input = buildDateInput(d)
    expect(input).not.toBeNull()
    for (let y = 0; y <= DATE_OFFSET_WINDOW_TOP; y += 1) {
      expect(
        validateParams(buildCandidateParams(input!, y, DATE_SEARCH_PATHS.provisional)),
        `candidate Y=${y}`,
      ).toBeNull()
    }
  })
})
