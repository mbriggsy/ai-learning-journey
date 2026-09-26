/**
 * THE FROZEN-NOMINAL CLASS (the register's Tier 0 *The other frozen-nominal figures still priced FLAT in
 * real dollars…*, filed 2026-09-24 by the §86 build's review; its sibling, the SS thresholds, is pinned
 * in `ssThresholdDeflation.test.ts`). The engine runs in REAL (today's) dollars. A dollar figure the
 * STATUTE freezes in nominal terms is worth LESS real every year, so holding it flat in real dollars is
 * the same as indexing it — the calm-but-wrong ROSY direction, growing with the horizon. Each figure
 * below divides by the engine's ONE cumulative price index for its CALENDAR year
 * (`cumulativePriceIndex`) — each is compared with income of that SAME year; a figure the statute
 * INDEXES never deflates (the federal brackets and the federal standard deduction stay flat-real — the
 * test is "does the statute index it?").
 *
 *   - The NC standard deduction ($25,500 MFJ / $12,750 single — N.C.G.S. § 105-153.5(a)(1), no COLA),
 *     subtracted inside `stateIncomeTax`; the survivor's single figure deflates by the same index; PA's
 *     $0 and FL's structural 0 are untouched.
 *   - The OBBBA senior bonus ($6,000 per 65+ filer and its $75k / $150k phase-out start — P.L. 119-21,
 *     no cost-of-living clause), inside `seniorBonusFor` (every reader goes through `deductionStack`);
 *     the 6 % phase-out RATE is a rate, never deflated; the 2025–2028 window is unchanged. The bonus
 *     also phases PER PERSON (IRS Schedule 1-A lines 32–37), which the hand oracle below encodes.
 *   - The HSA age-55 catch-up ($1,000, IRC §223(b)(3)(B), outside §223(g)'s COLA) is intake-side: its
 *     arm lives in `src/intake/__tests__/intakeMap.test.ts` (the runway ceiling, `contributionCeilingInYear`).
 *   - NOT the IRMAA top tier. It IS frozen nominal through bill year 2027, but the statute compares each
 *     bill year's line with MAGI from TWO years earlier (42 U.S.C. §1395r(i)(4)(B)(i)), so its matching
 *     real line is nominal ÷ the index of the MAGI year, and through 2027 that is exactly $750k (the
 *     MAGI years are at or before the anchor). Deflating it by the BILL year was built and REFUTED on
 *     2026-09-25; `taxOverlay.test.ts` pins the statute's answer.
 *
 * ORACLES ARE EXTERNALLY DERIVED (DND 012): the index is the CLOSED FORM (1 + cpi)^n by `Math.pow`
 * (the engine accumulates a running product); each figure's rule is written out by hand on the
 * canonical accessors, never the engine's own formula.
 */
import { describe, it, expect } from 'vitest'
import { stateIncomeTax, type StateTaxYearContext } from '@engine/stateTax'
import { deductionStack } from '@engine/taxCore'
import {
  age65AdditionMFJ,
  age65AdditionSingle,
  medicareCostTrend,
  seniorBonus,
  standardDeductionMFJ,
  standardDeductionSingle,
  stateRateForYear,
  stateStandardDeductionFor,
} from '@engine/constants'

const TREND = medicareCostTrend.value
const ANCHOR = TREND.anchorYear
const TABLE_EDGE = ANCHOR + TREND.premiums.length

/** The independent closed-form index: near-term years then ultimate years, each by Math.pow. */
function oracleIndex(calendarYear: number): number {
  if (calendarYear <= ANCHOR) return 1
  const nearYears = Math.min(calendarYear, TABLE_EDGE) - ANCHOR
  const ultimateYears = Math.max(0, calendarYear - TABLE_EDGE)
  return Math.pow(1 + TREND.cpiNearTermAvg, nearYears) * Math.pow(1 + TREND.cpiUltimate, ultimateYears)
}

const mk = (over: Partial<StateTaxYearContext>): StateTaxYearContext => ({
  state: 'NC',
  filing: 'mfj',
  calendarYear: ANCHOR,
  pretaxDistribution: 0,
  conversion: 0,
  ongoingTaxable: 0,
  realizedGain: 0,
  ssBenefitTaxable: 0,
  minLivingAge: 67,
  ...over,
})

const SD_MFJ = stateStandardDeductionFor('NC', 'mfj')
const SD_SINGLE = stateStandardDeductionFor('NC', 'single')

/** The NCDOR rule by hand, on the deflated deduction. */
const handNc = (base: number, filing: 'mfj' | 'single', year: number): number =>
  stateRateForYear('NC', year) * Math.max(0, base - (filing === 'mfj' ? SD_MFJ : SD_SINGLE) / oracleIndex(year))

describe('stateIncomeTax — the NC standard deduction falls in real terms, year by year', () => {
  it('at the anchor year the deduction is the statute figure itself (year 0 is today’s dollars — byte-identical to the pre-deflation engine)', () => {
    expect(stateIncomeTax(mk({ pretaxDistribution: 60_000 }))).toBe(stateRateForYear('NC', ANCHOR) * (60_000 - SD_MFJ))
    expect(stateIncomeTax(mk({ pretaxDistribution: SD_MFJ }))).toBe(0)
  })

  it('twenty years out, the SAME real income pays NC tax on more of it — the hand rule on the deflated deduction (MFJ and the survivor’s single)', () => {
    const y = ANCHOR + 20
    const flat = stateRateForYear('NC', y) * (60_000 - SD_MFJ) // the rosy pre-fix answer
    const expected = handNc(60_000, 'mfj', y)
    // Non-vacuous: at the sourced rates the real deduction is ~$15k by year 20, so the fix moves
    // this fixture by hundreds of dollars a year (the register's "~$320/yr in year 20").
    expect(expected - flat).toBeGreaterThan(250)
    expect(stateIncomeTax(mk({ pretaxDistribution: 60_000, calendarYear: y }))).toBeCloseTo(expected, 6)
    expect(stateIncomeTax(mk({ pretaxDistribution: 40_000, filing: 'single', calendarYear: y }))).toBeCloseTo(
      handNc(40_000, 'single', y),
      6,
    )
  })

  it('a year below the deflated deduction owes nothing; one dollar of real income above it owes the rate (the kink moves, the rule does not)', () => {
    const y = ANCHOR + 12
    const realSd = SD_MFJ / oracleIndex(y)
    expect(stateIncomeTax(mk({ pretaxDistribution: realSd - 1, calendarYear: y }))).toBe(0)
    expect(stateIncomeTax(mk({ pretaxDistribution: realSd + 1_000, calendarYear: y }))).toBeCloseTo(
      stateRateForYear('NC', y) * 1_000,
      6,
    )
    // Non-vacuous: the undeflated engine would owe $0 at realSd + 1,000 (it sits under $25,500).
    expect(realSd + 1_000).toBeLessThan(SD_MFJ)
  })

  it('the TAXABLE BASE (tax ÷ that year’s rate) is non-decreasing in the calendar year for a fixed real income — the frozen line only ever catches more', () => {
    // Tax itself can fall (the enacted rate steps DOWN to 2.99 %); the base the rate applies to cannot.
    let prev = stateIncomeTax(mk({ pretaxDistribution: 50_000 })) / stateRateForYear('NC', ANCHOR)
    for (let y = ANCHOR + 1; y <= ANCHOR + 50; y++) {
      const cur = stateIncomeTax(mk({ pretaxDistribution: 50_000, calendarYear: y })) / stateRateForYear('NC', y)
      expect(cur, `year ${y}`).toBeGreaterThanOrEqual(prev - 1e-9)
      prev = cur
    }
    expect(prev).toBeGreaterThan(50_000 - SD_MFJ + 5_000) // genuinely moved over the horizon
  })

  it('PA ($0 deduction) and FL (no income tax) are untouched in every year — nothing to deflate', () => {
    for (const y of [ANCHOR, ANCHOR + 20]) {
      expect(stateIncomeTax(mk({ state: 'PA', minLivingAge: 50, pretaxDistribution: 60_000, calendarYear: y }))).toBe(
        stateRateForYear('PA', y) * 60_000,
      )
      expect(stateIncomeTax(mk({ state: 'FL', pretaxDistribution: 60_000, calendarYear: y }))).toBe(0)
    }
  })

  it('a non-integer calendar year still fails loud for a deducting state (the rate lookup’s pre-existing guard fires first — this arm pins that the deflation opened no bypass around it)', () => {
    expect(() => stateIncomeTax(mk({ pretaxDistribution: 60_000, calendarYear: Number.NaN }))).toThrow(/integer/)
    expect(() => stateIncomeTax(mk({ pretaxDistribution: 60_000, calendarYear: 2030.5 }))).toThrow(/integer/)
  })
})

describe('the OBBBA senior bonus — its dollar figures fall in real terms inside the 2025–2028 window', () => {
  const SB = seniorBonus.value
  /** The statute's bonus by hand — IRS Schedule 1-A lines 32–37: ONE reduced amount per qualifying
   *  person (line 35), entered once per spouse — on the deflated amount AND the deflated start. */
  const handBonus = (filing: 'mfj' | 'single', count65: number, magi: number, year: number): number => {
    if (year < 2025 || year > 2028 || count65 === 0) return 0
    const idx = oracleIndex(year)
    const start = (filing === 'mfj' ? SB.phaseOutStart.mfj : SB.phaseOutStart.single) / idx
    const line35 = Math.max(0, SB.perPerson65Plus / idx - SB.phaseOutRatePerDollar * Math.max(0, magi - start))
    return line35 * count65
  }
  /** The indexed parts of the stack (flat-real by law) — subtracted to isolate the bonus. */
  const indexedParts = (filing: 'mfj' | 'single', count65: number): number =>
    filing === 'mfj'
      ? standardDeductionMFJ.value + age65AdditionMFJ.value * count65
      : standardDeductionSingle.value + age65AdditionSingle.value * count65
  const bonusIn = (filing: 'mfj' | 'single', count65: number, magi: number, year: number): number =>
    deductionStack(filing, count65, magi, year) - indexedParts(filing, count65)

  it('in the anchor year the bonus is the statute figure itself (byte-identical to the pre-deflation engine)', () => {
    expect(deductionStack('mfj', 2, 100_000, ANCHOR)).toBe(indexedParts('mfj', 2) + 2 * SB.perPerson65Plus)
  })

  it('in 2028 a both-65+ couple under the phase-out gets the DEFLATED $12,000 — ~$730 less deduction than the flat figure (the register’s figure)', () => {
    const flat = 2 * SB.perPerson65Plus
    const expected = handBonus('mfj', 2, 100_000, 2028)
    expect(flat - expected).toBeGreaterThan(700) // non-vacuous
    expect(flat - expected).toBeLessThan(800)
    expect(bonusIn('mfj', 2, 100_000, 2028)).toBeCloseTo(expected, 6)
  })

  it('inside the phase-out band the START deflates too — 2027, MFJ at $200k MAGI: the hand rule on both deflated figures', () => {
    const expected = handBonus('mfj', 2, 200_000, 2027)
    // Deflating only the amount (not the start) would land ~$550 away — the start is its own figure.
    const amountOnly =
      2 * (SB.perPerson65Plus / oracleIndex(2027) - SB.phaseOutRatePerDollar * (200_000 - SB.phaseOutStart.mfj))
    expect(Math.abs(expected - amountOnly)).toBeGreaterThan(50)
    expect(bonusIn('mfj', 2, 200_000, 2027)).toBeCloseTo(expected, 6)
    expect(bonusIn('single', 1, 100_000, 2027)).toBeCloseTo(handBonus('single', 1, 100_000, 2027), 6)
  })

  it('the window is unchanged — nothing before 2025 or after 2028, deflated or not', () => {
    expect(bonusIn('mfj', 2, 100_000, 2029)).toBe(0)
    expect(bonusIn('mfj', 2, 100_000, 2045)).toBe(0)
  })
})
