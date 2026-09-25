/**
 * The Social Security taxation thresholds are FROZEN BY LAW ($32k / $44k MFJ, $25k / $34k single —
 * nominal constants since 1983 / 1993, never indexed) while the engine runs in REAL (today's)
 * dollars. A frozen nominal line is worth LESS real every year, so the law taxes MORE of a benefit
 * each year out. Holding the real threshold flat is the same as indexing it — the calm-but-wrong
 * ROSY direction, growing with the horizon (the register entry filed 2026-09-24).
 *
 * The contract pinned here: `taxableSocialSecurity` deflates the nominal thresholds by the engine's
 * ONE cumulative price index for the sim year's CALENDAR year (`cumulativePriceIndex` — the
 * Trustees' CPI-W path the Part B schedule already rides: the near-term average through the
 * printed table's edge, the ultimate rate beyond; identity at and before the table's anchor).
 *
 * ORACLES ARE EXTERNALLY DERIVED (DND 012): the expected index is the CLOSED FORM
 * (1 + cpi)^n by `Math.pow` (the engine accumulates a running product — a different path to the
 * same number); the expected inclusion is the Pub 915 worksheet arithmetic written out by hand on
 * the deflated lines; the table-year equality reads the Part B schedule's own nominal ÷ real.
 */
import { describe, it, expect } from 'vitest'
import { taxableSocialSecurity } from '@engine/taxCore'
import { irmaaMagiAtFill } from '@engine/magiLandscape'
import { cumulativePriceIndex } from '@engine/priceIndex'
import { buildPartBPricingSchedule } from '@engine/healthOverlay'
import { medicareCostTrend, ssProvisionalThresholds, irmaa, partB2026 } from '@engine/constants'

const TREND = medicareCostTrend.value
const ANCHOR = TREND.anchorYear
/** The printed table's last year — premiums are verbatim for anchor+1 .. edge. */
const TABLE_EDGE = ANCHOR + TREND.premiums.length

/** The independent closed-form index: near-term years then ultimate years, each by Math.pow. */
function oracleIndex(calendarYear: number): number {
  if (calendarYear <= ANCHOR) return 1
  const nearYears = Math.min(calendarYear, TABLE_EDGE) - ANCHOR
  const ultimateYears = Math.max(0, calendarYear - TABLE_EDGE)
  return Math.pow(1 + TREND.cpiNearTermAvg, nearYears) * Math.pow(1 + TREND.cpiUltimate, ultimateYears)
}

/** Pub 915 Worksheet 1 written out by hand on a pair of (already deflated) thresholds. */
function worksheet(other: number, ss: number, base1: number, base2: number): number {
  const half = ss / 2
  const provisional = other + half
  if (provisional <= base1) return 0
  if (provisional <= base2) return Math.min(half, 0.5 * (provisional - base1))
  const fiftyBand = Math.min(half, 0.5 * (base2 - base1))
  return Math.min(0.85 * ss, fiftyBand + 0.85 * (provisional - base2))
}

describe('cumulativePriceIndex — the engine’s one deterministic CPI path, by calendar year', () => {
  it('is the identity at the table anchor and in every earlier year (nothing is deflated before the sourced path begins)', () => {
    expect(cumulativePriceIndex(ANCHOR)).toBe(1)
    expect(cumulativePriceIndex(ANCHOR - 1)).toBe(1)
    expect(cumulativePriceIndex(ANCHOR - 30)).toBe(1)
  })

  it('matches the closed form (1 + near)^n through the table edge, then (1 + ultimate)^m beyond it', () => {
    for (let y = ANCHOR + 1; y <= ANCHOR + 60; y++) {
      expect(cumulativePriceIndex(y), `year ${y}`).toBeCloseTo(oracleIndex(y), 9)
    }
    // Non-vacuous: the two rates genuinely differ, so a helper that used ONE rate throughout
    // would miss the oracle past the edge (2.4 % vs 3.2 % compounds to ~2 % by year 3 past it).
    expect(TREND.cpiNearTermAvg).not.toBeCloseTo(TREND.cpiUltimate, 3)
    const oneRateOnly = Math.pow(1 + TREND.cpiNearTermAvg, TABLE_EDGE + 10 - ANCHOR)
    expect(Math.abs(cumulativePriceIndex(TABLE_EDGE + 10) - oneRateOnly)).toBeGreaterThan(0.05)
  })

  it('equals the Part B schedule’s own near-term deflator (nominal ÷ real) at EVERY table year — one index, not two', () => {
    const horizon = TABLE_EDGE - ANCHOR + 5
    const schedule = buildPartBPricingSchedule(
      TREND,
      partB2026.value.standardPremiumMonthly,
      irmaa.value.tiers.map((t) => t.partDSurchargeMonthly),
      ANCHOR,
      horizon,
    )
    let checked = 0
    for (const row of TREND.premiums) {
      const t = row.calendarYear - ANCHOR
      const partBDeflator = row.nominalMonthly / schedule[t]!.baseMonthlyReal
      expect(cumulativePriceIndex(row.calendarYear), `table year ${row.calendarYear}`).toBeCloseTo(partBDeflator, 9)
      checked++
    }
    expect(checked).toBe(TREND.premiums.length) // the loop genuinely walked the printed table
    expect(checked).toBeGreaterThanOrEqual(5)
  })

  it('is strictly increasing after the anchor (a later year is never cheaper in nominal terms)', () => {
    for (let y = ANCHOR + 1; y <= ANCHOR + 60; y++) {
      expect(cumulativePriceIndex(y)).toBeGreaterThan(cumulativePriceIndex(y - 1))
    }
  })

  it('refuses a non-integer calendar year (fail-loud — a NaN year would silently price the identity)', () => {
    expect(() => cumulativePriceIndex(Number.NaN)).toThrow(/integer calendar year/)
    expect(() => cumulativePriceIndex(2030.5)).toThrow(/integer calendar year/)
  })
})

describe('taxableSocialSecurity — the frozen nominal thresholds fall in real terms, year by year', () => {
  const MFJ = ssProvisionalThresholds.value.mfj
  const SINGLE = ssProvisionalThresholds.value.single

  it('at the anchor year the Pub 915 fixtures are byte-identical to the pre-deflation engine (year 0 is today’s dollars)', () => {
    // The DND-012 fixtures of taxOverlay.test.ts T1, re-stated at the anchor year: identity index.
    expect(taxableSocialSecurity(15_000, 20_000, 'mfj', ANCHOR)).toBe(0)
    expect(taxableSocialSecurity(30_000, 20_000, 'mfj', ANCHOR)).toBeCloseTo(4_000, 6)
    expect(taxableSocialSecurity(40_000, 30_000, 'mfj', ANCHOR)).toBeCloseTo(15_350, 6)
    expect(taxableSocialSecurity(67_000, 40_000, 'mfj', ANCHOR)).toBeCloseTo(34_000, 6)
    expect(taxableSocialSecurity(30_000, 24_000, 'single', ANCHOR)).toBeCloseTo(11_300, 6)
  })

  it('twenty years out, a FIXED provisional income has more of the benefit taxed — the hand worksheet on the deflated lines', () => {
    const y = ANCHOR + 20
    const idx = oracleIndex(y)
    // $30k other + ½ × $20k = $40k provisional. At the anchor: 50 % of ($40k − $32k) = $4,000.
    // At year 20 the lines sit at $32k / idx and $44k / idx (≈ $18.6k / $25.5k at the sourced
    // rates), so the same $40k is deep in the 85 % tier.
    const expected = worksheet(30_000, 20_000, MFJ.fiftyPctOver / idx, MFJ.eightyFivePctOver / idx)
    expect(expected).toBeGreaterThan(4_000 * 3) // non-vacuous: the deflation moves this fixture by thousands
    expect(taxableSocialSecurity(30_000, 20_000, 'mfj', y)).toBeCloseTo(expected, 6)
    // The single schedule deflates by the SAME index.
    const expectedSingle = worksheet(18_000, 20_000, SINGLE.fiftyPctOver / idx, SINGLE.eightyFivePctOver / idx)
    expect(taxableSocialSecurity(18_000, 20_000, 'single', y)).toBeCloseTo(expectedSingle, 6)
  })

  it('is NON-DECREASING in the calendar year for a fixed income (the law only ever catches more)', () => {
    for (const [other, ss, filing] of [
      [20_000, 20_000, 'mfj'],
      [30_000, 20_000, 'mfj'],
      [15_000, 24_000, 'single'],
    ] as const) {
      let prev = taxableSocialSecurity(other, ss, filing, ANCHOR)
      for (let y = ANCHOR + 1; y <= ANCHOR + 50; y++) {
        const cur = taxableSocialSecurity(other, ss, filing, y)
        expect(cur, `${filing} ${other}/${ss} year ${y}`).toBeGreaterThanOrEqual(prev)
        prev = cur
      }
      // and it genuinely moved over the horizon (never a vacuous monotone-flat pass)
      expect(prev).toBeGreaterThan(taxableSocialSecurity(other, ss, filing, ANCHOR))
    }
  })

  it('stays CONTINUOUS in income at the deflated kinks (the gross-up contraction’s property survives the deflation)', () => {
    const y = ANCHOR + 15
    const idx = cumulativePriceIndex(y)
    const ss = 30_000
    const eps = 1e-6
    for (const kink of [MFJ.fiftyPctOver / idx, MFJ.eightyFivePctOver / idx]) {
      const other = kink - ss / 2 // provisional lands exactly on the kink
      const below = taxableSocialSecurity(other - eps, ss, 'mfj', y)
      const above = taxableSocialSecurity(other + eps, ss, 'mfj', y)
      expect(Math.abs(above - below)).toBeLessThan(1e-3)
    }
  })

  it('above the 85 % ceiling the deflation changes NOTHING — the cap, not the line, binds there (the shipped seeds do NOT sit here: their tier arm binds, and their headlines moved)', () => {
    // $200k other + ½ × $40k: the cap binds in every year — the deflated lines only move the
    // point where the cap STARTS binding, never the cap itself. A $54k benefit's cap is ~$46k of
    // inclusion while a ~$50k provisional's tier arm is ~$12k — that is why `retired` MOVED.
    expect(taxableSocialSecurity(200_000, 40_000, 'mfj', ANCHOR)).toBeCloseTo(34_000, 9)
    expect(taxableSocialSecurity(200_000, 40_000, 'mfj', ANCHOR + 40)).toBeCloseTo(34_000, 9)
  })

  it('refuses a non-integer calendar year (fail-loud, the taxCore idiom — never a silently undeflated year)', () => {
    expect(() => taxableSocialSecurity(30_000, 20_000, 'mfj', Number.NaN)).toThrow(/integer calendar year/)
    // The guard sits BEFORE the zero-benefit early return: a desynced caller fails on its first call,
    // not on the first year a benefit arrives (the index helper's own guard cannot see this path).
    expect(() => taxableSocialSecurity(30_000, 0, 'mfj', Number.NaN)).toThrow(/integer calendar year/)
  })
})

describe('the SECOND caller — the MAGI landscape prices the same deflated lines (the Roth headroom reads the year’s real thresholds)', () => {
  it('irmaaMagiAtFill on the same committed income is HIGHER twenty years out — the landscape forwards its calendarYear, never a literal', () => {
    const base = { rmd: 0, conversion: 0, ongoingTaxable: 30_000, ssBenefit: 20_000, filing: 'mfj' as const, count65: 2 }
    const atAnchor = irmaaMagiAtFill({ ...base, calendarYear: ANCHOR }, 0)
    const atTwenty = irmaaMagiAtFill({ ...base, calendarYear: ANCHOR + 20 }, 0)
    // At the anchor: ordinary 30k + taxable SS 4,000 (the Pub 915 fixture). Twenty years out the
    // same $40k provisional sits deep in the 85 % tier of the deflated lines — the hand worksheet.
    expect(atAnchor).toBeCloseTo(30_000 + 4_000, 6)
    const idx = oracleIndex(ANCHOR + 20)
    const mfj = ssProvisionalThresholds.value.mfj
    const expected = 30_000 + worksheet(30_000, 20_000, mfj.fiftyPctOver / idx, mfj.eightyFivePctOver / idx)
    expect(atTwenty).toBeCloseTo(expected, 6)
    expect(atTwenty - atAnchor).toBeGreaterThan(10_000) // non-vacuous: thousands, never a rounding wobble
  })
})
