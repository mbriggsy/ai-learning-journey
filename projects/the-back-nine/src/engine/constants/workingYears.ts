/**
 * The working-years constants (the working-year pay check — `docs/plans/features/
 * working-year-pay-check-build-spec.md`, KTD13): the federal payroll-tax figures a working year
 * pays on its wages. The earnings-test figures join this table with their producer (KTD13's
 * witness law: a key lands only in the commit that creates the code its WITNESS row names).
 *
 * Every figure was read from its primary on 2026-10-21 and confirmed by a skeptic at a second
 * host (the research is in the pay-check research folder: `research-payroll.json` +
 * `verdict-payroll.json`). Two kinds of dollar figure live here, and the consumer treats them
 * differently in the engine's REAL dollars:
 *  - WAGE-INDEXED (the OASDI wage base, by the national average wage index, 42 U.S.C. §430(b)):
 *    held FLAT in real terms. Real wages grow, so the real base grows too; holding it flat taxes
 *    pay above it slightly LOW in later years (rosy, small) — disclosed with the figure.
 *  - FROZEN NOMINAL (the two Additional Medicare Tax lines, §3101(b)(2): "aren't indexed for
 *    inflation"): the constant stays the statute's figure, and the consumer divides it by the
 *    engine's one price index for its calendar year (`priceIndex.ts`), never here.
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
  note: 'The employee share only: the employer’s matching 6.2 % is never the household’s money out. Wages are FICA wages (§3121(a)): 401(k), 403(b) and 457(b) elective deferrals stay IN them (§3121(v)(1)(A); Pub 15), so the consumer passes gross pay.',
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

/** The full working-years table — also the iteration surface for the shape test. */
export const workingYearsConstants = {
  oasdiRate,
  oasdiWageBase,
  hiRate,
  additionalMedicareTax,
} satisfies Record<string, ConstantEntry>
