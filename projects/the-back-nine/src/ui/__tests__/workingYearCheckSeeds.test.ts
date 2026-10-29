/**
 * The working-year pay check on a real dev seed (A6 of `docs/plans/features/working-year-pay-check-build-spec.md`,
 * U5's "Working widow(er)" scenario): `datemixed`'s draft, through the app's own `buildDateInput`, with W added
 * here (no seed carries W until Phase C). Engine tests never import `@ui`, so the seed-built arm lives beside the
 * seeds. Every expected figure is typed by hand from the primaries (DND 012).
 */
import { describe, expect, it } from 'vitest'
import { DEV_SEEDS } from '../devSeeds'
import { buildDateInput } from '@intake/intakeMap'
import { buildCandidateParams } from '@engine/dateSearch'
import { cashTermsForYear, personOffsetsFor } from '@engine/simulate'
import { earningsTestSchedule } from '@engine/earningsTest'
import { prepareWorkingYearFloor, workingYearCashLines } from '@engine/taxOverlay'

const cents = (x: number): number => Math.round(x * 100)

describe('a working widow(er) on `datemixed` (Y = 8): her whole widow(er) benefit is held back, and the year runs short', () => {
  // Alex (58, born 1968, $95,000, PIA $26,000, claiming at 67) and Sam (59, born 1967, $85,000, PIA $22,000,
  // claiming at 67), both working; Y = 8 keeps both at work through 2033. Sam dies at the end of 2032 (death
  // offset 7), at 66, before ever filing. In 2033 (t = 7) Alex is a 65-year-old widow still working.
  //
  // HER WIDOW(ER) BENEFIT, by hand: Sam died unfiled before his full retirement age, so her benefit rests on his
  // full PIA, $22,000 a year (20 CFR 404.338; no RIB-LIM — he never claimed early). It starts at 65, 24 months
  // before her survivor FRA of 67 (1968), so it is reduced 28.5 % × 24 / 84 = 8.142857 %: $1,833.33 × 0.9185714
  // = $1,684.047 a month, dime-floored to $1,684.00 — $20,208.00 a year.
  // THE EARNINGS TEST, by hand: 2033 is wholly before the year she reaches 67, so her excess is ($95,000 −
  // $24,480) ÷ 2 = $35,260 (§403(f)(3), the 2026 exempt amount held real-flat) — far above $20,208, so the whole
  // year's benefit is withheld (her own record pays nothing yet: she claims at 67).
  // THE CHECK, by hand (2033, single after the death; Alex is 65; no priced state):
  //   pay $95,000; Social Security paid $0; no ongoing income; no deposits on this draft;
  //   payroll = 6.2 % × 95,000 + 1.45 % × 95,000 = 5,890 + 1,377.50 = $7,267.50;
  //   tax on the pay: 95,000 − (16,100 + the $2,050 single age-65 addition) = 76,850 taxable →
  //     1,240 + 12 % × 38,000 + 22 % × 26,450 = 1,240 + 4,560 + 5,819 = $11,619 (the senior bonus sunset after 2028);
  //   W = $98,000 (the draft's year-0 lines, $90,000, plus its $8,000 medical); her survivor year holds the sticky
  //     $42,000 (housing $24,000 + utilities $5,000 + everything-else $5,000 + the medical $8,000) whole and
  //     scales the rest: W_7 = 42,000 + 0.75 × 56,000 = $84,000;
  //   cash = 95,000 − 7,267.50 − 11,619 − 84,000 = −$7,886.50 ⇒ short $7,886.50.
  const draft = DEV_SEEDS.datemixed
  const base = buildDateInput(draft)
  if (base === null) throw new Error('fixture: datemixed builds no date input')
  const input = { ...base, workingYearCostReal: 98_000 }
  const candidate = buildCandidateParams(input, 8, 1)
  const { offsets, higherClaimOffset } = personOffsetsFor(candidate.people)
  const horizon = candidate.maxHorizonYears
  const deaths = [horizon, 7] // Alex lives on; Sam dies at the end of year 6
  const schedule = earningsTestSchedule({ people: candidate.people, offsets, deathOffsets: deaths, higherClaimOffset, horizonYears: horizon })

  it('the premises: the draft’s order, ages, pay and budget are the ones the hand derivation reads', () => {
    expect(candidate.people.map((p) => [p.currentAge, p.earnedIncomeReal, p.pia, p.socialSecurityClaimAge])).toEqual([
      [58, 95_000, 26_000, 67],
      [59, 85_000, 22_000, 67],
    ])
    expect(offsets.map((o) => o.retire)).toEqual([8, 8])
    expect(candidate.budget?.sticky[0]).toBe(42_000)
    expect(candidate.budget!.scalableEssentials[0]! + candidate.budget!.discretionary[0]!).toBe(56_000)
    expect(candidate.survivorSpendingRatio).toBe(0.75)
  })

  it('2033: the $20,208 widow(er) benefit is wholly withheld, so the year’s Social Security is $0', () => {
    if (!schedule.tested) throw new Error('expected the earnings test to reach her')
    expect(cents(schedule.withheld[7]!)).toBe(2_020_800)
    expect(schedule.paid[7]).toBe(0)
    expect(cashTermsForYear(7, candidate, offsets, deaths, higherClaimOffset, schedule).ss).toBe(0)
  })

  it('2033 runs short by $7,886.50: pay $95,000 − payroll $7,267.50 − tax $11,619 − W_7 $84,000', () => {
    const cash = cashTermsForYear(7, candidate, offsets, deaths, higherClaimOffset, schedule)
    const check = cash.workingYearCheck
    if (check === undefined || cash.workingYearOutside === undefined) throw new Error('expected a clamped, checked year')
    expect(check.wagesByPerson).toEqual([95_000, 0])
    expect(check.ongoingGross).toBe(0)
    expect(check.ownDeposits).toBe(0)
    expect(check.workingYearCost).toBe(84_000)
    // The floor as the year loop prepares it for this year: single after the death, one member 65+, 2033.
    const floor = prepareWorkingYearFloor(cash.workingYearOutside, { ssBenefit: cash.ss, filing: 'single', count65: 1, calendarYear: 2033, minLivingAge: 65 })
    const lines = workingYearCashLines(check, floor)
    expect(cents(lines.payroll.total)).toBe(726_750)
    expect(cents(lines.taxOnOutsideIncome)).toBe(1_161_900)
    expect(cents(lines.shortfall)).toBe(788_650)
  })

  it('the W-absent twin is paid the benefit and carries no check — the earnings test is W’s alone (KTD1)', () => {
    const twin = buildCandidateParams(base, 8, 1)
    const cash = cashTermsForYear(7, twin, offsets, deaths, higherClaimOffset)
    expect(cents(cash.ss)).toBe(2_020_800)
    expect(cash.workingYearCheck).toBeUndefined()
  })
})
