/**
 * The working-years constants (the working-year pay check — `docs/plans/features/
 * working-year-pay-check-build-spec.md`, KTD13): the federal payroll-tax figures a working year
 * pays on its wages (read by `payrollTax.ts`), and the Social Security earnings test's exempt
 * amounts and withholding rates (read by `earningsTest.ts`). Each key landed in the commit that
 * created the code its WITNESS row names (KTD13's witness law).
 *
 * Every figure was read from its primary on 2026-10-21 and confirmed by a skeptic at a second
 * host (the research is in the pay-check research folder: `research-payroll.json` +
 * `verdict-payroll.json`, `research-earnings-test.json` + `verdict-earnings-test.json`). Two kinds
 * of dollar figure live here, and the consumer treats them differently in the engine's REAL dollars:
 *  - WAGE-INDEXED (the OASDI wage base, by the national average wage index, 42 U.S.C. §430(b); the
 *    earnings test's two exempt amounts, by the same index, §403(f)(8)(B)): held FLAT in real terms.
 *    Real wages grow, so the real figures grow too. Holding the base flat taxes pay above it slightly
 *    LOW in later years (rosy, small); holding the exempt amounts flat withholds slightly MORE than
 *    the law in later working years (gloomy then, with a small rosy echo through the extra credit
 *    months) — each disclosed with its figure.
 *  - FROZEN NOMINAL (the two Additional Medicare Tax lines of §3101(b)(2); the Form 8959
 *    instructions: "aren't indexed for inflation"): the constant stays the statute's figure, and the
 *    consumer divides it by the engine's one price index for its calendar year (`priceIndex.ts`).
 * The rates are statute. The spine reads NOTHING from here.
 */
import { sourced, type ConstantEntry } from './types'

/** The year the year-keyed figures here govern (the wage base is the 2026 figure). */
export const WORKING_YEARS_YEAR = 2026

/** The employee's Social Security (OASDI) tax rate, per person, on wages up to the wage base. */
export const oasdiRate = sourced(0.062, {
  citation:
    '26 U.S.C. §3101(a) ("a tax equal to 6.2 percent of the wages", LII, read 2026-10-21; govinfo 2023 edition identical) + IRS Publication 15 (2026) ("For 2026, the social security tax rate is 6.2% (amount withheld) each for the employer and employee")',
  directionalUntilPinned: false,
  pinTo: '26 U.S.C. §3101(a)',
  legalBasis: '26 U.S.C. §3101(a)',
  note: 'The employee share only: the employer’s matching 6.2 % is never the household’s money out. Wages are FICA wages (§3121(a)): elective deferrals stay IN them — 401(k) by §3121(v)(1)(A); 403(b) by the salary-reduction carve-out in §3121(a)(5)(D); 457(b) because a §457(a) plan is not an exempt governmental plan (§3121(v)(3)(A)) and its deferrals count when the work is done (§3121(v)(2)(A), (C)); Pub 15 (2026) §15 rows 2, 4, 8 — so the consumer passes gross pay. Gross pay over-reads FICA wages by any §125 cafeteria-plan amounts (pre-tax health premiums, a cafeteria-plan HSA: §3121(a)(5)(G)); charging them errs gloomy, the plan’s K11, disclosed until intake asks.',
})

/** The 2026 OASDI contribution and benefit base: the most of each person's wages the 6.2 % reaches. */
export const oasdiWageBase = sourced(184_500, {
  citation:
    'FR Doc 2025-19763, 90 FR 49047 (SSA, "Cost-of-Living Increase and Other Determinations for 2026", read 2026-10-21: "The OASDI contribution and benefit base is $184,500 for remuneration paid in 2026") + IRS Topic 751 ("For earnings in 2026, this base limit is $184,500.") + IRS Publication 15 (2026)',
  directionalUntilPinned: false,
  pinTo: 'FR Doc 2025-19763 (federalregister.gov, 2025-11-03)',
  legalBasis: '42 U.S.C. §430(b) (the wage-indexed base)',
  note: 'Per PERSON: a worker with two employers gets the excess credited back on the return. WAGE-INDEXED (the national average wage index), so it is held FLAT in real dollars: real wages grow, so the real base grows and pay above it is taxed slightly LOW in later years (rosy, small; disclosed). Never quote a 2027 figure before the 2027 Federal Register notice is read.',
})

/** The employee's Medicare (HI) tax rate, per person, on ALL wages (no base). */
export const hiRate = sourced(0.0145, {
  citation:
    '26 U.S.C. §3101(b)(1) ("a tax equal to 1.45 percent of the wages", LII, read 2026-10-21) + IRS Topic 751 ("There\'s no wage base limit for Medicare tax.") + IRS Publication 15 (2026) ("1.45% each for the employee and employer, unchanged from 2025")',
  directionalUntilPinned: false,
  pinTo: '26 U.S.C. §3101(b)(1)',
  legalBasis: '26 U.S.C. §3101(b)(1)',
  note: 'The employee share only. No wage base: every dollar of FICA wages pays it.',
})

/** The Additional Medicare Tax (§3101(b)(2)): 0.9 % of the RETURN's combined Medicare wages above
 *  its filing status's line. The lines are FROZEN NOMINAL. */
export const additionalMedicareTax = sourced(
  { rate: 0.009, thresholdMfj: 250_000, thresholdSingle: 200_000 },
  {
    citation:
      '26 U.S.C. §3101(b)(2) ("a tax equal to 0.9 percent of wages … in excess of— (A) in the case of a joint return, $250,000, … (C) in any other case, $200,000", LII, read 2026-10-21) + the Instructions for Form 8959 (2025 edition, read 2026-10-21: "The threshold amounts below aren\'t indexed for inflation"; its Example 5) + IRS Topic 560',
    directionalUntilPinned: false,
    pinTo: '26 U.S.C. §3101(b)(2); the Instructions for Form 8959',
    legalBasis: '26 U.S.C. §3101(b)(2)',
    note: 'Per RETURN: a joint return combines both spouses’ wages against the one $250,000 line; a single return (a survivor) uses $200,000. Employee only, no employer share. The employer’s $200,000 withholding trigger is NOT the liability and is not modeled. The lines are FROZEN in nominal dollars — the constant stays the statute’s figure; the consumer deflates each by the engine’s one price index for its calendar year (priceIndex.ts), never here. The engine has no married-filing-separately status, so the $125,000 line is not carried.',
  },
)

/** The Social Security earnings test's two 2026 ANNUAL exempt amounts, per beneficiary: the lower
 *  one for every year wholly before the year the beneficiary reaches full retirement age, the higher
 *  one for the earnings of the months before full retirement age in that year. */
export const earningsTestExemptAmounts = sourced(
  { lowerAnnual: 24_480, higherAnnual: 65_160 },
  {
    citation:
      'FR Doc 2025-19763, 90 FR 49047 (SSA, "Cost-of-Living Increase and Other Determinations for 2026", read 2026-10-21: "The lower annual exempt amount is $24,480 under the retirement earnings test." and "The higher annual exempt amount is $65,160 under the retirement earnings test."; "The annual exempt amounts are exactly 12 times the monthly amounts" — $2,040 and $5,430) + POMS RS 02501.025 D (secure.ssa.gov, the second host: "2026 | $24,480 | $2,040 | $2 over $24,480" and "$65,160 | $5,430 | $3 over $65,160")',
    directionalUntilPinned: false,
    pinTo: 'FR Doc 2025-19763 (federalregister.gov, 2025-11-03)',
    legalBasis: '42 U.S.C. §403(f)(3), (f)(8) (the wage-indexed exempt amounts); 20 CFR 404.430',
    note: 'Per BENEFICIARY, on the beneficiary’s own earnings: gross wages for services in the year (20 CFR 404.429(c)), never pensions, investment income or Social Security (§403(f)(5)). The HIGHER amount applies in full to the earnings of the months before full retirement age, even when there are fewer than twelve (20 CFR 404.430(a)(1)). WAGE-INDEXED (§403(f)(8)(B), a ratchet), so it is held FLAT in real dollars: real wages grow, so the real amounts grow and the engine withholds slightly MORE than the law in later working years (gloomy then; the extra withheld months are also credited back, a small rosy echo on long-lived paths). The monthly amounts apply only in a grace year (404.435), which an annual engine whose work stops on a year boundary never reaches. Never quote a 2027 figure before the 2027 Federal Register notice is read.',
  },
)

/** The earnings test's two withholding rates (§403(f)(3)): $1 of benefits for every $2 of earnings
 *  above the lower amount in a year wholly before the full-retirement-age year, and $1 for every $3
 *  above the higher amount in that year. Exact integer fractions — "33⅓ percent" has no exact float. */
export const earningsTestWithholdingRates = sourced(
  { beforeFraYear: { withheld: 1, per: 2 }, fraYear: { withheld: 1, per: 3 } },
  {
    citation:
      '42 U.S.C. §403(f)(3) (LII, read 2026-10-21: "an individual\'s excess earnings for a taxable year shall be 33⅓ percent of his earnings for such year in excess of the product of the applicable exempt amount … in the case of an individual who has attained (or, but for the individual\'s death, would have attained) retirement age … before the close of such taxable year, or 50 percent of his earnings for such year in excess of such product in the case of any other individual … The excess earnings … if not a multiple of $1, shall be reduced to the next lower multiple of $1.") + POMS RS 02501.080 B.1.d ("Divide the remainder by 2, then round down to the next lower dollar") and B.2.a ("Divide the amount of earnings over the exempt amount by 3 … round down to the next lower dollar")',
    directionalUntilPinned: false,
    pinTo: '42 U.S.C. §403(f)(3)',
    legalBasis: '42 U.S.C. §403(f)(3)',
    note: 'Statute, not a dated figure. The consumer takes the rate of the earner’s own year (the lower-amount rate before the full-retirement-age year, the higher-amount rate in it), and floors the excess to the next lower whole dollar.',
  },
)

/** The full working-years table — also the iteration surface for the shape test. */
export const workingYearsConstants = {
  oasdiRate,
  oasdiWageBase,
  hiRate,
  additionalMedicareTax,
  earningsTestExemptAmounts,
  earningsTestWithholdingRates,
} satisfies Record<string, ConstantEntry>
