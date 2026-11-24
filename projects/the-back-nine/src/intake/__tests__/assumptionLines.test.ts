// The working-year row's arm, moved out of `assumptionPanel.test.tsx` with its function by Act 6's RC0, unchanged.
import { describe, expect, it } from 'vitest'
import { DEV_SEEDS } from '@ui/devSeeds'
import type { ScenarioDraft } from '@store/memoryModel'
import { methodologyArmFor } from '../assumptionLines'
import { missingRequiredFacts } from '../intakeMap'
import { confirmedWorkingYearCost } from '../workingYearQuote'

// The pay check's U9: which arm the working-year methodology row renders. The BUILT run decides
// (`workingYearCostForRun`, insight 132); where no run can be built, the build's own carriage rule
// stands in — `buildDateInput` lands W exactly when a date-route draft holds an answer.
describe('methodologyArmFor — the working-year row’s arm (U9, KTD22)', () => {
  const withW = (d: ScenarioDraft): ScenarioDraft => {
    const w = confirmedWorkingYearCost(d)
    if (w === null) throw new Error('[test setup] the seed quotes $0 — no W to confirm')
    return { ...d, workingYearCost: w }
  }
  /** `date` with no W answer at all — every date seed carries W since U10, so the W-free twin is built here. */
  const { workingYearCost: _seedW, ...dateNoW } = DEV_SEEDS.date

  it('a date-route run carrying W reads the pay check’s arm; the same draft without W reads today’s row', () => {
    expect(methodologyArmFor(withW(dateNoW))).toBe('workingCost')
    expect(methodologyArmFor(dateNoW)).toBe('default')
  })

  it('an all-retired draft never reads the pay check’s arm, even holding a stored W (the spine never carries it)', () => {
    const retired = DEV_SEEDS.retired
    expect(methodologyArmFor({ ...retired, workingYearCost: { kind: 'entered', amountReal: 60_000, entryPeriod: 'year', stateTaxReading: 'unpriced' } })).toBe('default')
  })

  it('an unbuildable date-route draft reads the arm its build would carry: W held ⇒ the pay check’s arm, none ⇒ today’s', () => {
    const unbuildable: ScenarioDraft = { ...dateNoW, annualSpendingReal: undefined }
    expect(missingRequiredFacts(unbuildable).length, 'the fixture really is unbuildable').toBeGreaterThan(0)
    expect(methodologyArmFor(unbuildable)).toBe('default')
    expect(
      methodologyArmFor({ ...unbuildable, workingYearCost: { kind: 'entered', amountReal: 84_000, entryPeriod: 'year', stateTaxReading: 'unpriced' } }),
    ).toBe('workingCost')
  })

  it('the fallback carries only what a build would: an entered $0 reads today’s row, and so does an unbuildable all-retired draft holding W', () => {
    const unbuildable: ScenarioDraft = { ...dateNoW, annualSpendingReal: undefined }
    expect(
      methodologyArmFor({ ...unbuildable, workingYearCost: { kind: 'entered', amountReal: 0, entryPeriod: 'month', stateTaxReading: 'unpriced' } }),
    ).toBe('default')
    const retiredUnbuildable: ScenarioDraft = {
      ...DEV_SEEDS.retired,
      annualSpendingReal: undefined,
      budget: undefined,
      workingYearCost: { kind: 'entered', amountReal: 60_000, entryPeriod: 'year', stateTaxReading: 'unpriced' },
    }
    expect(missingRequiredFacts(retiredUnbuildable).length, 'the fixture really is unbuildable').toBeGreaterThan(0)
    expect(methodologyArmFor(retiredUnbuildable)).toBe('default')
  })
})
