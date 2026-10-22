/**
 * Federal payroll tax for one working year (the working-year pay check — `docs/plans/features/
 * working-year-pay-check-build-spec.md`, KTD9 / U2): the employee's share of FICA on the year's
 * wages, which a working year pays out of its pay before anything is left to spend.
 *
 *  - Social Security (OASDI): 6.2 % of each person's wages up to the wage base (26 U.S.C.
 *    §3101(a)), per PERSON.
 *  - Medicare (HI): 1.45 % of each person's wages, all of them (§3101(b)(1)).
 *  - The Additional Medicare Tax: 0.9 % of the RETURN's combined wages above its filing status's
 *    line (§3101(b)(2)) — $250,000 joint, $200,000 single — each line FROZEN in nominal dollars,
 *    so it is divided by the engine's one price index for the calendar year (`priceIndex.ts`):
 *    the identity at the anchor year, a lower real line every later year (insight 135).
 *
 * WAGES ARE GROSS PAY: 401(k), 403(b) and 457(b) elective deferrals stay in FICA wages
 * (§3121(v)(1)(A); IRS Publication 15), unlike the income-tax base. The wage base is wage-indexed and
 * held flat in real dollars (its constant's note says which way that leans). Filing status is the
 * year's own regime filing status; the engine has no married-filing-separately status. Payroll tax
 * never reduces the income-tax base (§275(a)(1)(A)) — this producer feeds the pay check's money out
 * and nothing else.
 *
 * PURE: a function of the wages, the filing status, the calendar year and the canonical constants;
 * reads no clock, consumes no draw. Fails loud on a non-finite or negative wage, an unknown filing
 * status or a non-integer calendar year — never a silent $0 (burned/062).
 */
import { additionalMedicareTax, hiRate, oasdiRate, oasdiWageBase } from '@engine/constants'
import { cumulativePriceIndex } from '@engine/priceIndex'
import type { FilingStatus } from '@shared/model'

/** One year's payroll tax, by the three taxes it is made of (real $). `total` is their sum. */
export interface PayrollTaxYear {
  /** Social Security (OASDI): 6.2 % of each person's wages up to the wage base, summed. */
  readonly socialSecurity: number
  /** Medicare (HI): 1.45 % of every person's wages, summed. */
  readonly medicare: number
  /** The Additional Medicare Tax: 0.9 % of the return's combined wages above its (deflated) line. */
  readonly additionalMedicare: number
  /** The year's payroll tax: the three summed. */
  readonly total: number
}

/**
 * The employee payroll tax a return owes on one calendar year's wages.
 *
 * @param wagesByWorker each living worker's gross wages this year (real $), one entry per worker
 *   on the return (a $0 entry is harmless).
 * @param filing the year's filing status: joint while both spouses live, single after a death.
 * @param calendarYear the sim year's calendar year (`startCalendarYear + t`).
 */
export function payrollTaxForYear(
  wagesByWorker: readonly number[],
  filing: FilingStatus,
  calendarYear: number,
): PayrollTaxYear {
  if (!Number.isInteger(calendarYear)) {
    throw new Error(`[payrollTax] calendarYear must be an integer calendar year (got ${calendarYear})`)
  }
  if (filing !== 'mfj' && filing !== 'single') {
    throw new Error(`[payrollTax] filing must be 'mfj' or 'single' (got ${String(filing)}) — no default line (burned/062)`)
  }
  const base = oasdiWageBase.value
  const ssRate = oasdiRate.value
  const medicareRate = hiRate.value
  let socialSecurity = 0
  let medicare = 0
  let combined = 0
  for (const wages of wagesByWorker) {
    if (!Number.isFinite(wages) || wages < 0) {
      throw new Error(`[payrollTax] each worker's wages must be finite and ≥ 0 (got ${wages}) — insight 010`)
    }
    socialSecurity += ssRate * Math.min(wages, base)
    medicare += medicareRate * wages
    combined += wages
  }
  const amt = additionalMedicareTax.value
  // The statute's NOMINAL line in the calendar year's REAL dollars (one index, one home).
  const line = (filing === 'mfj' ? amt.thresholdMfj : amt.thresholdSingle) / cumulativePriceIndex(calendarYear)
  const additionalMedicare = amt.rate * Math.max(0, combined - line)
  return { socialSecurity, medicare, additionalMedicare, total: socialSecurity + medicare + additionalMedicare }
}
