/**
 * THE 2027-01-01 ANNUAL-ROLL TRIPWIRE — the `irmaaTopTierReindex.tripwire` idiom applied to the
 * three vintage years the whole constant table hangs from. A dated wall-clock re-verify gate, NOT
 * `reVerifyEveryBuild`: the annual roll is a KNOWN deterministic calendar event, not per-build
 * legislative volatility (the class `verify:aca` guards).
 *
 * THE GAP IT GUARDS — and it was the LAST dated constant with no gate at all. `TAX_YEAR`,
 * `COVERAGE_YEAR` and `CONTRIBUTION_YEAR` (all 2026) key every bracket, every IRMAA/ACA figure and
 * every contribution limit in the canonical table. Every OTHER dated figure here carries something:
 * ACA has a rolling `verify:aca` window, the priced states have `verify:state-tax`, IRMAA's top tier
 * has its own 2028 tripwire. These three had NOTHING. On 2027-01-01 they simply go a year stale in
 * SILENCE — the build stays green while every household is priced on last year's law. That is the
 * calm-but-wrong shape: not a crash, not a refusal, just a confidently wrong number.
 *
 * WHY A TRIPWIRE AND NOT A LIVE CLOCK: the engine reads no clock (CLAUDE.md engine purity), and it
 * must not — a constant that silently re-keyed itself off `Date` would change a saved household's
 * answer without a vintage bump. Tests ARE exempt from the clock ban, so the honest instrument is a
 * build-time gate that reds in the roll year and forces a human to do the transcription.
 *
 * ⚠️ WHAT IT DOES AND DOES NOT BUY: a red tripwire reds the GitHub check; it does NOT block a Vercel
 * deploy. That is equally true of the three tripwires already shipped, so it is the house posture
 * rather than a gap this file introduces — but do not read green-on-prod as "the roll was handled."
 *
 * TO CLEAR IT (the roll is a transcription job, never a date bump — burned/062, insight 022):
 *  1. Re-source EVERY dated figure for the new year from its primary — IRS Rev. Proc. (brackets,
 *     standard deduction, RMD tables), the IRS COLA notice (contribution limits), CMS (Part B,
 *     IRMAA), HHS (poverty guidelines), SSA (wage base, COLA).
 *  2. Bump `TAX_YEAR` / `COVERAGE_YEAR` / `CONTRIBUTION_YEAR` and every figure they key.
 *  3. Update the coupled year pins: `src/shared/__tests__/scaffold.smoke.test.ts:10-13` asserts all
 *     three literals AND `CONSTANTS_VINTAGE`, and `constants.shape.test.ts` carries per-figure pins
 *     (including the FPL guideline year). They red together by design — that is the forcing function.
 *  4. The vintage stamps move, which stales saved vaults on unlock. That is correct: their answers
 *     really were priced on the old year.
 */
import { describe, expect, it } from 'vitest'
import {
  CONSTANTS_VINTAGE,
  COVERAGE_YEAR,
  CONTRIBUTION_YEAR,
  TAX_YEAR,
  federalPovertyGuidelines,
} from '@engine/constants'

describe('the annual-roll tripwire (a re-verify gate, not a unit test)', () => {
  it('the constant table MUST be re-sourced for the new tax year — this arm goes red on 2027-01-01', () => {
    // The three years move together by construction; a split would mean a partial roll shipped,
    // which is its own defect (half the table on the new year, half on the old).
    expect(
      new Set([TAX_YEAR, COVERAGE_YEAR, CONTRIBUTION_YEAR]).size,
      'PARTIAL ROLL: TAX_YEAR / COVERAGE_YEAR / CONTRIBUTION_YEAR disagree, so some figures are on ' +
        'the new year and some on the old. Roll all three together or none.',
    ).toBe(1)
    expect(CONSTANTS_VINTAGE).toEqual({
      taxYear: TAX_YEAR,
      coverageYear: COVERAGE_YEAR,
      contributionYear: CONTRIBUTION_YEAR,
    })

    const wallYear = new Date().getFullYear()
    expect(
      wallYear,
      'TRIPWIRE: the canonical constants are keyed to ' +
        `${TAX_YEAR} and the wall clock has reached ${wallYear} — every bracket, IRMAA/ACA figure ` +
        'and contribution limit in the table is now a year stale, and NOTHING else catches it ' +
        '(these were the last dated constants with no gate). Re-source each figure from its ' +
        'primary — IRS Rev. Proc. + COLA notice, CMS, HHS, SSA — then bump the three years and the ' +
        'coupled pins in scaffold.smoke.test.ts and constants.shape.test.ts. Do NOT just bump the ' +
        'years: a date bump with stale figures is exactly the silent wrong answer this gate exists ' +
        'to prevent.',
    ).toBeLessThanOrEqual(TAX_YEAR)
  })

  it('the FPL guideline year tracks the coverage year structurally — prior-year FPL, never a re-typed literal', () => {
    // THE ROLL'S EASIEST MISTAKE. ACA deliberately applies the PRIOR year's poverty guidelines to a
    // coverage year (health.ts:108-112, and the constant's own note), so `guidelineYear` is 2025
    // while COVERAGE_YEAR is 2026 — a gap that looks like staleness and is not. The live risk cuts
    // both ways on the roll: bump COVERAGE_YEAR and forget the FPL table and the offset silently
    // becomes 2, understating income relative to poverty and OVERSTATING subsidies (the optimistic
    // direction); "fix" the apparent staleness by syncing them and the cliff moves against every
    // pre-65 household. Asserting the RELATIONSHIP rather than a literal catches both, and keeps
    // catching them after the roll — a hardcoded year only pins today.
    expect(
      federalPovertyGuidelines.value.guidelineYear,
      `FPL/coverage desync: coverage year ${COVERAGE_YEAR} must use the ${COVERAGE_YEAR - 1} poverty ` +
        'guidelines (prior-year FPL, IRC §36B). If the coverage year was just rolled, re-source the ' +
        'HHS guidelines for the new prior year (base + perAdditionalPerson) rather than editing this ' +
        'number to make the test pass — the 400% cliff dollar is DERIVED from it.',
    ).toBe(COVERAGE_YEAR - 1)
  })
})
