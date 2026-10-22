/**
 * The payroll-tax producer (the working-year pay check, U2). Every expected figure is typed from the
 * statute's arithmetic or an IRS worked example (DND 012), never from the producer's formula:
 * 26 U.S.C. §3101(a) 6.2 % of wages up to the wage base, §3101(b)(1) 1.45 % of all wages,
 * §3101(b)(2) 0.9 % of the return's wages above $250,000 joint / $200,000 otherwise; the 2026 wage
 * base from FR Doc 2025-19763. The wage base itself is read from the canonical table, never re-typed
 * here (the single-source gate in `constants.shape.test.ts` holds that).
 *
 * The year-0 arms run at the price-index anchor year (2026), where the frozen lines are the statute's
 * own figures; the deflation arms live with the rest of the frozen-nominal class in
 * `frozenNominalDeflation.test.ts`.
 */
import { describe, it, expect } from 'vitest'
import { payrollTaxForYear } from '@engine/payrollTax'
import { oasdiWageBase } from '@engine/constants'
import type { FilingStatus } from '@shared/model'

const Y0 = 2026
/** To the cent: the producer returns unrounded real dollars; the fixtures are cent-exact. */
const cents = (x: number): number => Math.round(x * 100)

describe('payrollTaxForYear — the IRS fixtures, to the cent', () => {
  it('Form 8959 instructions, Example 5: Erin $150,000 + Frank $175,000 on a joint return owe the 0.9 % on $75,000 — though neither employer withheld it', () => {
    // "their combined $325,000 in wages exceeds the $250,000 threshold for joint filers. Erin and Frank
    // are liable for Additional Medicare Tax on $75,000 of wages" → 0.009 × 75,000 = $675.00.
    const t = payrollTaxForYear([150_000, 175_000], 'mfj', Y0)
    expect(cents(t.additionalMedicare)).toBe(67_500)
    // The rest by hand: 6.2 % × 150,000 + 6.2 % × 175,000 = 9,300 + 10,850; 1.45 % × 325,000 = 4,712.50.
    expect(cents(t.socialSecurity)).toBe(2_015_000)
    expect(cents(t.medicare)).toBe(471_250)
    expect(cents(t.total)).toBe(2_553_750)
  })

  it('the research couple, $190,000 + $90,000 joint, owes $21,349.00 (the higher earner capped at the wage base)', () => {
    // OASDI 11,439.00 (6.2 % × the 2026 base of $184,500) + 5,580.00; HI 2,755.00 + 1,305.00;
    // the 0.9 % on 280,000 − 250,000 = 270.00 (skeptic-confirmed, verdict-payroll.json).
    const t = payrollTaxForYear([190_000, 90_000], 'mfj', Y0)
    expect(cents(t.socialSecurity)).toBe(1_701_900)
    expect(cents(t.medicare)).toBe(406_000)
    expect(cents(t.additionalMedicare)).toBe(27_000)
    expect(cents(t.total)).toBe(2_134_900)
  })

  it('a survivor filing single on $230,000 owes $15,044.00 (the $200,000 line)', () => {
    // 11,439.00 + 1.45 % × 230,000 = 3,335.00 + 0.009 × 30,000 = 270.00.
    const t = payrollTaxForYear([230_000], 'single', Y0)
    expect(cents(t.socialSecurity)).toBe(1_143_900)
    expect(cents(t.medicare)).toBe(333_500)
    expect(cents(t.additionalMedicare)).toBe(27_000)
    expect(cents(t.total)).toBe(1_504_400)
  })
})

describe('payrollTaxForYear — the edges', () => {
  it('wages exactly at the wage base pay the full 6.2 % on all of it: $11,439.00, and $2,675.25 of Medicare', () => {
    const t = payrollTaxForYear([oasdiWageBase.value], 'single', Y0)
    expect(cents(t.socialSecurity)).toBe(1_143_900)
    expect(cents(t.medicare)).toBe(267_525)
    expect(t.additionalMedicare).toBe(0)
  })

  it('pay above the base stops paying Social Security tax, never Medicare tax', () => {
    const at = payrollTaxForYear([oasdiWageBase.value], 'single', Y0)
    const above = payrollTaxForYear([oasdiWageBase.value + 10_000], 'single', Y0)
    expect(above.socialSecurity).toBe(at.socialSecurity)
    // the extra $10,000 pays exactly 1.45 % of itself: $145.00
    expect(cents(above.medicare - at.medicare)).toBe(14_500)
  })

  it('combined wages exactly AT a line owe no Additional Medicare Tax; one dollar above owes 0.9¢', () => {
    expect(payrollTaxForYear([125_000, 125_000], 'mfj', Y0).additionalMedicare).toBe(0)
    expect(payrollTaxForYear([200_000], 'single', Y0).additionalMedicare).toBe(0)
    expect(payrollTaxForYear([125_000, 125_001], 'mfj', Y0).additionalMedicare).toBeCloseTo(0.009, 9)
    expect(payrollTaxForYear([200_001], 'single', Y0).additionalMedicare).toBeCloseTo(0.009, 9)
  })

  it('the joint line is the RETURN’s, on combined wages — two earners each under $200,000 still owe it together', () => {
    // $200,000 + $60,000 joint: combined 260,000 − 250,000 → 0.009 × 10,000 = $90.00.
    expect(cents(payrollTaxForYear([200_000, 60_000], 'mfj', Y0).additionalMedicare)).toBe(9_000)
    // The same $260,000 on one single return crosses the $200,000 line by $60,000: $540.00.
    expect(cents(payrollTaxForYear([260_000], 'single', Y0).additionalMedicare)).toBe(54_000)
  })

  it('a worker at $0 adds nothing; a return with no workers owes nothing', () => {
    expect(payrollTaxForYear([0, 100_000], 'mfj', Y0)).toEqual(payrollTaxForYear([100_000], 'mfj', Y0))
    // $100,000: 6,200.00 + 1,450.00
    expect(cents(payrollTaxForYear([0, 100_000], 'mfj', Y0).total)).toBe(765_000)
    expect(payrollTaxForYear([], 'mfj', Y0)).toEqual({ socialSecurity: 0, medicare: 0, additionalMedicare: 0, total: 0 })
  })

  it('total is exactly the three taxes summed', () => {
    for (const wages of [[150_000, 175_000], [190_000, 90_000], [230_000], [40_000]]) {
      const t = payrollTaxForYear(wages, wages.length === 2 ? 'mfj' : 'single', Y0)
      expect(t.total).toBe(t.socialSecurity + t.medicare + t.additionalMedicare)
    }
  })
})

describe('payrollTaxForYear — fails loud, never a silent $0 (burned/062)', () => {
  it('a NaN, infinite or negative wage throws', () => {
    expect(() => payrollTaxForYear([Number.NaN], 'single', Y0)).toThrow(/finite and ≥ 0/)
    expect(() => payrollTaxForYear([Number.POSITIVE_INFINITY], 'single', Y0)).toThrow(/finite and ≥ 0/)
    expect(() => payrollTaxForYear([50_000, -1], 'mfj', Y0)).toThrow(/finite and ≥ 0/)
  })

  it('an unknown filing status throws (the engine has no married-filing-separately line)', () => {
    expect(() => payrollTaxForYear([50_000], 'mfs' as unknown as FilingStatus, Y0)).toThrow(/'mfj' or 'single'/)
  })

  it('a non-integer calendar year throws before any wage is read', () => {
    expect(() => payrollTaxForYear([50_000], 'single', 2026.5)).toThrow(/integer calendar year/)
    expect(() => payrollTaxForYear([], 'single', Number.NaN)).toThrow(/integer calendar year/)
    // The ORDER: with a bad wage AND a bad year, the year's guard answers. Were the wage loop first,
    // the wage's own message would throw instead (the price index's guard runs only after the loop).
    expect(() => payrollTaxForYear([Number.NaN], 'single', 2026.5)).toThrow(/\[payrollTax\] calendarYear/)
  })
})
