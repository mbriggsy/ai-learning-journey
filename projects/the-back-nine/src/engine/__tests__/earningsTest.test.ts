/**
 * The earnings-test producer (the working-year pay check, U3 — `docs/plans/features/
 * working-year-pay-check-build-spec.md`, R12–R15, KTD10, KTD11). Every expected figure is typed from
 * the statute's and the regulations' arithmetic, re-derived under the engine's own rounding (DND 012),
 * never from the producer: 42 U.S.C. §403(b), (f)(1), (f)(3); 20 CFR 404.434, 404.439, 404.304(f),
 * 404.412; POMS RS 00615.482, RS 02501.095; §402(q)(7). The exempt amounts themselves are read from the
 * canonical table (the single-source gate in `constants.shape.test.ts` holds that); the excess each
 * fixture derives from them is typed here.
 *
 * THE ENGINE'S ROUNDING, once: every monthly benefit is dime-floored (`applyFactorAnnual`), so a
 * benefit the research states as "$700" is $696.40 here; the month the excess runs out pays each
 * payee's share floored to the whole dollar (404.304(f), R12). Each fixture states where it parts from
 * the research's unrounded figure.
 */
import { describe, it, expect } from 'vitest'
import {
  earningsTestSchedule,
  NO_EARNINGS_TEST,
  socialSecurityPaid,
  type EarningsTestPath,
  type EarningsTestYears,
} from '@engine/earningsTest'
import { cashTermsForYear, personOffsetsFor } from '@engine/simulate'
import { earningsTestExemptAmounts, fraMonthsForBirthYear } from '@engine/constants'
import { validationMarket } from '@engine/reference/methodology'
import { mulberry32 } from '@engine/rng'
import type { PersonInputs, SimulationParams } from '@shared/model'

const cents = (x: number): number => Math.round(x * 100)

/** A spine run's params around the given people: cashTermsForYear's Social Security reads only them. */
const makeParams = (people: readonly PersonInputs[]): SimulationParams => ({
  initialPortfolio: 1000,
  annualSpendingReal: 40,
  stockWeight: 0.5,
  people,
  survivorSpendingRatio: 0.75,
  drawdownPolicy: 'proportional',
  market: validationMarket.value,
  paths: 1,
  maxHorizonYears: 30,
  longevityMode: 'fixed-horizon',
})

const person = (p: Partial<PersonInputs> & Pick<PersonInputs, 'currentAge' | 'birthYear'>): PersonInputs => ({
  sex: 'male',
  retirementAge: p.currentAge,
  earnedIncomeReal: 0,
  pia: 0,
  socialSecurityClaimAge: 67,
  ...p,
})

const pathOf = (people: PersonInputs[], deathOffsets: number[], horizonYears: number): EarningsTestPath => {
  const { offsets, higherClaimOffset } = personOffsetsFor(people)
  return { people, offsets, deathOffsets, higherClaimOffset, horizonYears }
}

const tested = (path: EarningsTestPath): EarningsTestYears => {
  const s = earningsTestSchedule(path)
  if (!s.tested) throw new Error('expected a tested schedule')
  return s
}

/** The W-absent year's Social Security, through the run's own seam. */
const owedSs = (path: EarningsTestPath, t: number): number =>
  cashTermsForYear(t, makeParams(path.people), path.offsets, path.deathOffsets, path.higherClaimOffset).ss

describe('the research worked example, re-derived under the engine (a couple both born 1963, 2026 the plan’s first year)', () => {
  // He claimed at 62 (2025) on a PIA of $2,142.86 a month (×12 = $25,714.32), so 60 months early:
  // factor 168/240 = 0.70 → $1,500.00. She is entitled to a spousal benefit only: 50 % of his PIA =
  // $1,071.43, 60 months early at 25/36 % then 5/12 % → 156/240 = 0.65 → $696.4295, dime-floored to
  // $696.40 (the research's "$700" is unrounded). He works for $60,000 a year through 2029 (ages 63–66).
  const him = person({ currentAge: 63, birthYear: 1963, retirementAge: 67, earnedIncomeReal: 60_000, pia: 25_714.32, socialSecurityClaimAge: 62 })
  const her = person({ sex: 'female', currentAge: 63, birthYear: 1963, socialSecurityClaimAge: 62 })
  const path = pathOf([him, her], [50, 50], 8)

  it('the derived benefits are the research’s, dime-floored ($1,500.00 and $696.40 a month)', () => {
    expect(cents(path.offsets[0]!.socialSecurityReal)).toBe(1_800_000)
    expect(cents(path.offsets[1]!.spousalExcessAnnual)).toBe(835_680) // 12 × $696.40
  })

  it('2026: an excess of $17,760 holds back January–August for both, and September pays $1,338 + $669 — $8,596.20 for the year', () => {
    // §403(f)(3): (60,000 − 24,480) ÷ 2 = 17,760, a whole dollar. Charged against the family on his record
    // (§403(b)(1)): $1,500.00 + $696.40 = $2,196.40 a month. Eight full months take $17,571.20; the $188.80
    // left is charged to September, whose rest, $2,007.60, is split by 404.439 in proportion to the benefits
    // before the age reduction — his PIA against her full spousal rate, 1 : 0.5 → $1,338.40 and $669.20,
    // each under its cap ($1,500.00 / $696.40) and floored to the dollar (404.304(f)): $1,338 and $669.
    // Paid: him 3 × 1,500 + 1,338 = 5,838.00; her 3 × 696.40 + 669 = 2,758.20; $8,596.20 in all. The
    // research's $8,640 / $8,597 split an unrounded $700 and floored nothing.
    const s = tested(path)
    expect(cents(s.paid[0]!)).toBe(859_620)
    // Owed $26,356.80 (12 × 2,196.40); held back the $17,760 excess plus the 60¢ the dollar floor shaved.
    expect(cents(s.withheld[0]!)).toBe(1_776_060)
    expect(cents(s.paid[0]! + s.withheld[0]!)).toBe(cents(owedSs(path, 0)))
    expect(s.fraYearAtMost[0]).toBe(0)
  })

  it('every year 2026–2029 credits nine months to each (January–September — the partial month counts), 36 in-plan in all', () => {
    // POMS RS 00615.482 B.1–B.2: a full OR partial work deduction is a crediting month, for the spouse too
    // when the worker's work caused it. 2025's months (the research's fifth year) are before the plan: invisible.
    const s = tested(path)
    for (let t = 0; t < 4; t++) expect(cents(s.paid[t]!), `year ${t}`).toBe(859_620)
    expect(s.creditMonths).toEqual([
      { own: 36, spousal: 0, widow: 0 },
      { own: 0, spousal: 36, widow: 0 },
    ])
  })

  it('2030, their FRA year, pays the uncredited benefits; 2031 on pays both recomputed on 60 − 36 = 24 months: $1,857.10 + $892.80', () => {
    // He stops at 67 (2030), so 2030 is untested. The credited benefits are first paid the year after the
    // FRA year (KTD11): his 24 months at 5/9 % → 156/180 × $2,142.86 = $1,857.145 → $1,857.10; her 24 at
    // 25/36 % → 120/144 × $1,071.43 = $892.858 → $892.80 (never the research's $1,964 / $959, which counted
    // 2025). 12 × ($1,857.10 + $892.80) = $32,998.80.
    const s = tested(path)
    expect(cents(s.paid[4]!)).toBe(cents(owedSs(path, 4)))
    expect(s.withheld[4]).toBe(0)
    for (let t = 5; t < 8; t++) {
      expect(cents(s.paid[t]!), `year ${t}`).toBe(3_299_880)
      expect(s.withheld[t]).toBe(0)
    }
  })
})

describe('the dual-earner spouse and the 404.439 cap (both born 1964, both claimed at 62 in 2026)', () => {
  // He: PIA $2,000 a month → $1,400.00 at 62. She: her own PIA $800 → $560.00, plus the spousal excess
  // 50 % × 2,000 − 800 = $200, reduced 156/240 → $130.00, on HIS record. The family on his record is
  // $1,400 + $130 = $1,530 a month; her own $560 is on hers.
  const base = (hisPay: number, herPay: number, herRetire: number, horizonYears = 1): EarningsTestPath =>
    pathOf(
      [
        person({ currentAge: 62, birthYear: 1964, retirementAge: 65, earnedIncomeReal: hisPay, pia: 24_000, socialSecurityClaimAge: 62 }),
        person({ sex: 'female', currentAge: 62, birthYear: 1964, retirementAge: herRetire, earnedIncomeReal: herPay, pia: 9_600, socialSecurityClaimAge: 62 }),
      ],
      [50, 50],
      horizonYears,
    )

  it('his excess beyond the family total withholds his benefit and her spousal excess only — her own is paid, and the rest of the excess is forgiven', () => {
    // (80,000 − 24,480) ÷ 2 = 27,760 > 12 × 1,530 = 18,360: every month of the family is held back and the
    // other $9,400 is forgiven, never carried (POMS RS 02501.095 B.1). Her own $560 × 12 = $6,720 is paid.
    const s = tested(base(80_000, 0, 62, 2))
    expect(cents(s.paid[0]!)).toBe(672_000)
    expect(cents(s.withheld[0]!)).toBe(1_836_000)
    // The forgiven $9,400 does not reach the next year: year 1 starts over at the same $18,360.
    expect(cents(s.withheld[1]!)).toBe(1_836_000)
    // Twelve crediting months a year on each benefit his excess reached; none on her own.
    expect(s.creditMonths).toEqual([
      { own: 24, spousal: 0, widow: 0 },
      { own: 0, spousal: 24, widow: 0 },
    ])
  })

  it('in the partial month her share is capped at her $130 and the $270 the cap trims is not re-paid to him — and June still credits her', () => {
    // (40,440 − 24,480) ÷ 2 = 7,980: January–May take 5 × 1,530 = 7,650, and June is charged $330. June's
    // rest, $1,200, splits 1 : 0.5 → $800 to him (cap $1,400) and $400 to her, capped at her $130. The
    // $270 trimmed stays withheld (R12: gloomy until a primary says otherwise).
    // Paid: him 6 × 1,400 + 800 = 9,200; her spousal 6 × 130 + 130 = 910; her own 12 × 560 = 6,720 → $16,830.
    // Owed 12 × 2,090 = 25,080, so $8,250 is held back: the $7,980 excess plus the $270 trim.
    const s = tested(base(40_440, 0, 62))
    expect(cents(s.paid[0]!)).toBe(1_683_000)
    expect(cents(s.withheld[0]!)).toBe(825_000)
    // Six crediting months each, June among them for her although June paid her share in full
    // (RS 00615.482 B.2: "including months … in which the full spouse's benefit is paid after the
    // benefits for a partial month are prorated").
    expect(s.creditMonths).toEqual([
      { own: 6, spousal: 0, widow: 0 },
      { own: 0, spousal: 6, widow: 0 },
    ])
  })

  it('two earners: his excess takes the family first, then hers takes only her own remaining benefits (RS 02501.095 B.4)', () => {
    // His $7,980 as above. Her own excess: (28,480 − 24,480) ÷ 2 = 2,000, charged from January against
    // what is left of hers — her own $560 each month (her spousal is gone January–May). January–March
    // take 3 × 560 = 1,680; April is charged $320 and pays her $240. Her own: 240 + 8 × 560 = 4,720.
    // Paid 9,200 + 910 + 4,720 = $14,830; held back 7,980 + 270 + 2,000 = $10,250.
    const s = tested(base(40_440, 28_480, 63))
    expect(cents(s.paid[0]!)).toBe(1_483_000)
    expect(cents(s.withheld[0]!)).toBe(1_025_000)
    // Her spousal months are the six his excess took (hers met it already withheld January–May); her
    // own benefit earns the four her excess touched.
    expect(s.creditMonths).toEqual([
      { own: 6, spousal: 0, widow: 0 },
      { own: 4, spousal: 6, widow: 0 },
    ])
  })
})

describe('the age gap: an older spouse past FRA on a younger worker’s record', () => {
  it('loses months to his excess, keyed on HIS full retirement age, and earns no credit for them', () => {
    // He: born 1966, 60 in 2026, claims at 62 (2028), works to 65 for $60,000. She: born 1958 (FRA 66y8m),
    // 70 in 2028, spousal only, claimed at 62 (deemed): 56 months early → 160/240 × $1,000 = $666.66 →
    // $666.60. In 2028 the family is $1,400 + $666.60 = $2,066.60; his $17,760 excess takes eight months
    // ($16,532.80), and September's rest, $839.40, splits $559.60 / $279.80 → $559 and $279. Paid: him
    // 3 × 1,400 + 559 = 4,759; her 3 × 666.60 + 279 = 2,278.80 → $7,037.80.
    const path = pathOf(
      [
        person({ currentAge: 60, birthYear: 1966, retirementAge: 65, earnedIncomeReal: 60_000, pia: 24_000, socialSecurityClaimAge: 62 }),
        person({ sex: 'female', currentAge: 68, birthYear: 1958, socialSecurityClaimAge: 62 }),
      ],
      [50, 50],
      5,
    )
    expect(cents(path.offsets[1]!.spousalExcessAnnual)).toBe(799_920)
    const s = tested(path)
    expect(s.paid[0]).toBe(0)
    expect(s.withheld[0]).toBe(0)
    for (const t of [2, 3, 4]) expect(cents(s.paid[t]!), `year ${t}`).toBe(703_780)
    // Nine crediting months a year for him (ages 62–64); none for her — the months withheld fall after her
    // FRA, outside her 56-month reduction period, so none can be removed from it (§402(q)(7)).
    expect(s.creditMonths).toEqual([
      { own: 27, spousal: 0, widow: 0 },
      { own: 0, spousal: 0, widow: 0 },
    ])
  })
})

describe('the FRA calendar year (KTD11)', () => {
  it('born 1960, claimed at 64: the year before is withheld at the lower amount and credited; the FRA year runs the stopgap and credits nothing; the year after pays the credit', () => {
    // PIA $2,000 → 36 months early → 144/180 → $1,600.00. Pay $90,000.
    // Age 66 (wholly before): (90,000 − 24,480) ÷ 2 = 32,760 > 12 × 1,600 = 19,200 — all twelve months
    // held back, credited. Age 67 (the FRA year, the stopgap): 11/12 × 90,000 = 82,500; (82,500 − 65,160)
    // ÷ 3 = 5,780 against eleven months: three full ($4,800), April charged $980 and paying $620, May–
    // December paid ($12,800) → $13,420, nothing credited. Age 68: 36 − 12 = 24 months → 156/180 ×
    // $2,000 = $1,733.33 → $1,733.30, × 12 = $20,799.60.
    const path = pathOf(
      [person({ currentAge: 66, birthYear: 1960, retirementAge: 69, earnedIncomeReal: 90_000, pia: 24_000, socialSecurityClaimAge: 64 })],
      [50],
      3,
    )
    const s = tested(path)
    expect(s.paid[0]).toBe(0)
    expect(cents(s.withheld[0]!)).toBe(1_920_000)
    expect(s.fraYearAtMost[0]).toBe(0)
    expect(cents(s.paid[1]!)).toBe(1_342_000)
    expect(cents(s.withheld[1]!)).toBe(578_000)
    expect(s.fraYearAtMost[1], 'the stopgap year is "at most"').toBe(1)
    expect(cents(s.paid[2]!)).toBe(2_079_960)
    expect(s.withheld[2], 'no test after the FRA year').toBe(0)
    expect(s.creditMonths[0]).toEqual({ own: 12, spousal: 0, widow: 0 })
  })

  it('his stopgap withholds his wife’s spousal months too — and credits her none of them, though she is years from her own FRA', () => {
    // He: born 1960, 66 in year 0, claimed at 64 ($1,600), works to 69 for $90,000. She: born 1963, 63,
    // spousal only, claimed at 62: 50 % × 2,000 = $1,000, 60 months early → 0.65 → $650. Family $2,250.
    // Year 0 (his 66, wholly before FRA): 32,760 > 12 × 2,250 = 27,000 — all held back, twelve credits each.
    // Year 1 (his FRA year, the stopgap): 5,780 against eleven months — two full ($4,500), March charged
    // $1,280, whose $970 rest splits $646.67 / $323.33 → $646 and $323. Paid: him 646 + 9 × 1,600 =
    // 15,046; her 323 + 9 × 650 = 6,173 → $21,219; held back 27,000 − 21,219 = $5,781. The three months
    // credit nobody (KTD11: the stopgap's months are "at most", so they never raise a later benefit).
    // Year 2 (his 68): his 12 credits → 156/180 × 2,000 = $1,733.30; she is 65, uncredited: $28,599.60.
    // Year 5 (her 68, past her FRA year): her 12 credits → 48 months early → 168/240 × 1,000 = $700.00:
    // 12 × (1,733.30 + 700) = $29,199.60. Had the stopgap credited her three months, 45 → $712.50.
    const path = pathOf(
      [
        person({ currentAge: 66, birthYear: 1960, retirementAge: 69, earnedIncomeReal: 90_000, pia: 24_000, socialSecurityClaimAge: 64 }),
        person({ sex: 'female', currentAge: 63, birthYear: 1963, socialSecurityClaimAge: 62 }),
      ],
      [50, 50],
      6,
    )
    const s = tested(path)
    expect(s.paid[0]).toBe(0)
    expect(cents(s.paid[1]!)).toBe(2_121_900)
    expect(cents(s.withheld[1]!)).toBe(578_100)
    expect(s.fraYearAtMost[1]).toBe(1)
    expect(cents(s.paid[2]!)).toBe(2_859_960)
    expect(cents(s.paid[5]!)).toBe(2_919_960)
    expect(s.creditMonths).toEqual([
      { own: 12, spousal: 0, widow: 0 },
      { own: 0, spousal: 12, widow: 0 },
    ])
  })

  it('the stopgap uses the higher amount on eleven twelfths of the pay: at or under it, nothing is held back', () => {
    // 11/12 × pay ≤ the higher amount ⇔ pay ≤ 12/11 of it; one dollar above that, (11/12 × pay − amount) ÷ 3
    // is under a dollar and floors to 0. The year is tested, and holds back nothing.
    const at = Math.floor((earningsTestExemptAmounts.value.higherAnnual * 12) / 11)
    const path = pathOf(
      [person({ currentAge: 67, birthYear: 1959 + 1, retirementAge: 68, earnedIncomeReal: at + 1, pia: 24_000, socialSecurityClaimAge: 64 })],
      [50],
      1,
    )
    const s = tested(path)
    expect(s.withheld[0]).toBe(0)
    expect(Object.is(s.paid[0], owedSs(path, 0))).toBe(true)
  })

  it('born 1959 (FRA 66y10m), claimed at 62: the age-67 year is the stopgap at NINE months; the age-66 year is withheld at the lower amount, and — since it may hold FRA — credits nothing', () => {
    // 58 months early → 170/240 × $2,000 = $1,416.666 → $1,416.60. Pay $90,000.
    // Age 66: 32,760 > 12 × 1,416.60 = 16,999.20 — all held back; no credit (the year can hold FRA for a
    // January or February birth, where crediting all twelve months would credit two months past it).
    // Age 67: a December 1959 birth reaches 66y10m in October, so the year holds at most nine pre-FRA
    // months (20 CFR 404.430: the higher amount reaches "the months prior to the month in which you reach
    // full retirement age"). 9/12 × 90,000 = 67,500; (67,500 − 65,160) ÷ 3 = 780, charged to January:
    // its $636.60 rest floors to $636.00. Paid 636 + 11 × 1,416.60 = $16,218.60; held back $780.60.
    const path = pathOf(
      [person({ currentAge: 66, birthYear: 1959, retirementAge: 68, earnedIncomeReal: 90_000, pia: 24_000, socialSecurityClaimAge: 62 })],
      [50],
      3,
    )
    const s = tested(path)
    expect(s.paid[0]).toBe(0)
    expect(s.fraYearAtMost[0], 'a year that may hold FRA is "at most" too').toBe(1)
    expect(cents(s.paid[1]!)).toBe(1_621_860)
    expect(cents(s.withheld[1]!)).toBe(78_060)
    expect(s.fraYearAtMost[1]).toBe(1)
    expect(s.creditMonths[0]).toEqual({ own: 0, spousal: 0, widow: 0 })
    expect(cents(s.paid[2]!), 'nothing to credit, so age 68 pays the uncredited benefit').toBe(1_699_920)
  })

  it('a spousal excess his filing starts in HER FRA year is still tested there — the engine prices it as her early claim (review wf_bb2c6dec-c1c)', () => {
    // He: born 1959, 67, PIA $3,500, files at 69 or 70. She: born 1962, 64, own PIA $800 claimed at 62
    // ($560); her spousal excess 50 % × 3,500 − 800 = $950, reduced at HER claim age 62 (deemed filing)
    // → 0.65 → $617.50. She works to 68 for $150,000. Her FRA year is t = 3. Her stopgap excess:
    // (11/12 × 150,000 − 65,160) ÷ 3 = 24,113 > 11 × ($560 + $617.50) = $12,952.50 — eleven months of
    // BOTH held back, whether his filing started the excess the year before or that same year. (Before
    // the fix, his filing at 70 left the excess untested: $6,160 held back, $6,792.50 rosy.)
    const withheldAtT3 = (hisClaim: number): number => {
      const path = pathOf(
        [
          person({ currentAge: 67, birthYear: 1959, retirementAge: 67, pia: 42_000, socialSecurityClaimAge: hisClaim }),
          person({ sex: 'female', currentAge: 64, birthYear: 1962, retirementAge: 68, earnedIncomeReal: 150_000, pia: 9_600, socialSecurityClaimAge: 62 }),
        ],
        [50, 50],
        5,
      )
      expect(cents(path.offsets[1]!.spousalExcessAnnual)).toBe(741_000) // 12 × $617.50
      const s = tested(path)
      expect(s.fraYearAtMost[3]).toBe(1)
      return cents(s.withheld[3]!)
    }
    expect(withheldAtT3(70)).toBe(1_295_250)
    expect(withheldAtT3(69)).toBe(1_295_250)
  })

  it('a widow(er) benefit she was entitled to before her FRA year stays tested there, whatever her own claim at 67 does (review wf_bb2c6dec-c1c)', () => {
    // He: born 1962, never filed, dies at 65 (offset 1): her base is his full PIA, $2,500. She: born 1962,
    // 64, widowed at 65 — 24 of 84 months early → 77,160/84,000 × 2,500 = $2,296.43 → $2,296.40. She works
    // to 68 for $120,000; her own PIA is $1,200. Her FRA year is t = 3. Before FRA she is paid only the
    // widow(er) benefit, so that is what her stopgap excess, (110,000 − 65,160) ÷ 3 = 14,946, reaches: six
    // full months ($13,778.40), July charged $1,167.60 and paying $1,128.00 (floored), five more full →
    // $12,610.00 — the same whether her own claim starts that year (at 67) or never (at 70). Before the
    // fix the claim at 67 shielded $1,200 a month of it: $15,496.40 paid.
    const paidAtT3 = (herPia: number, herClaim: number, hisPia = 30_000): EarningsTestYears => {
      const path = pathOf(
        [
          person({ currentAge: 64, birthYear: 1962, retirementAge: 64, pia: hisPia, socialSecurityClaimAge: 67 }),
          person({ sex: 'female', currentAge: 64, birthYear: 1962, retirementAge: 68, earnedIncomeReal: 120_000, pia: herPia, socialSecurityClaimAge: herClaim }),
        ],
        [1, 50],
        5,
      )
      return tested(path)
    }
    expect(cents(paidAtT3(14_400, 67).paid[3]!)).toBe(1_261_000)
    expect(cents(paidAtT3(14_400, 70).paid[3]!)).toBe(1_261_000)
    // Her own benefit the larger ($2,000 against a widow(er) $1,500 × 0.918571 = $1,377.80): the engine
    // pays her own all year (the disclosed claim-at-FRA residual), but before FRA she was entitled only to
    // the widow(er) benefit, so eleven months of $1,377.80 are chargeable: ten full ($13,778.00), November
    // charged $1,168.00 against it ($831.20 left of her $2,000), December whole. Paid 10 × 622.20 + 831.20 +
    // 2,000 = $9,053.20; held back $14,946.80. Before the fix: $24,000 paid, nothing held back.
    const ownWins = paidAtT3(24_000, 67, 18_000)
    expect(cents(ownWins.paid[3]!)).toBe(905_320)
    expect(cents(ownWins.withheld[3]!)).toBe(1_494_680)
    expect(ownWins.fraYearAtMost[3]).toBe(1)
  })

  it('a claim made at 67 is never tested — the engine pays it as entitled at FRA', () => {
    const path = pathOf(
      [person({ currentAge: 67, birthYear: 1960, retirementAge: 69, earnedIncomeReal: 200_000, pia: 24_000, socialSecurityClaimAge: 67 })],
      [50],
      3,
    )
    expect(earningsTestSchedule(path)).toBe(NO_EARNINGS_TEST)
  })
})

describe('survivors (§403(f)(9), 404.311(b), RS 00615.320 B.2.c / .598 / .585)', () => {
  it('the deceased’s months withheld while alive raise the RIB-LIM cap from the year after their would-be FRA year: $825.00 → $866.60 (a step case)', () => {
    // He: born 1964, claimed at 62 (2026) on a PIA of $1,000 → $700.00; works ages 62–64 for $100,000, so
    // every month is held back (36 credits) — then dies at 65 (offset 3), before his FRA. She: born 1958,
    // past her FRA when widowed (71), spousal only while he lived. Her widow(er) benefit is unreduced
    // ($1,000), capped by RIB-LIM at max(82.5 % × 1,000, his "if alive" benefit): $825.00 until his
    // would-be FRA year (age 67, offset 5) is over, then max(825, 156/180 × 1,000 = $866.666 → $866.60).
    // He never receives his own credit (404.412).
    const path = pathOf(
      [
        person({ currentAge: 62, birthYear: 1964, retirementAge: 65, earnedIncomeReal: 100_000, pia: 12_000, socialSecurityClaimAge: 62 }),
        person({ sex: 'female', currentAge: 68, birthYear: 1958, socialSecurityClaimAge: 62 }),
      ],
      [3, 50],
      8,
    )
    const s = tested(path)
    expect(s.creditMonths[0]).toEqual({ own: 36, spousal: 0, widow: 0 })
    for (let t = 3; t <= 5; t++) {
      expect(cents(s.paid[t]!), `year ${t}`).toBe(990_000)
      expect(Object.is(s.paid[t], owedSs(path, t)), `year ${t} is the uncredited cap`).toBe(true)
    }
    for (let t = 6; t < 8; t++) expect(cents(s.paid[t]!), `year ${t}`).toBe(1_039_920)
  })

  it('a credit that cannot lift the payable amount pays nothing more: claimed at 64 with five credits, the widow starting at 61 stays at $755.70 (a no-step case)', () => {
    // He: born 1964, claims at 64 (2028) on PIA $1,000 → $800.00; that year pays $32,480: (32,480 −
    // 24,480) ÷ 2 = 4,000 = five full months, five credits. He dies at 65 (offset 3). She: born 1968, 61
    // then: her widow(er) benefit, 72 of 84 months early → 63,480/84,000 × 1,000 = $755.71 → $755.70. The
    // cap moves from max(825, 800) = $825 to max(825, 149/180 × 1,000 = $827.70) — both above $755.70, so
    // the payable amount never moves (RS 00615.585 B.3: "No increase can be paid").
    const path = pathOf(
      [
        person({ currentAge: 62, birthYear: 1964, retirementAge: 65, earnedIncomeReal: 32_480, pia: 12_000, socialSecurityClaimAge: 64 }),
        person({ sex: 'female', currentAge: 58, birthYear: 1968, socialSecurityClaimAge: 62 }),
      ],
      [3, 50],
      8,
    )
    const s = tested(path)
    expect(s.creditMonths[0]).toEqual({ own: 5, spousal: 0, widow: 0 })
    for (let t = 3; t < 8; t++) expect(cents(s.paid[t]!), `year ${t}`).toBe(906_840)
  })

  it('a widow who starts at 60 and works to 65 is tested on her own pay and credited at 62 (paid from 63) and at survivor FRA (paid from 68)', () => {
    // He: born 1962, 64, planned to claim at 67, dies at 66 (offset 2) never having filed: her base is his
    // full PIA, $1,000. She: born 1968, widowed at 60 — the benefit locks at 60: 71.5 % → $715.00. She
    // works ages 60–64 for $32,480: an excess of $4,000 a year against her own benefits only.
    //  - Ages 60–62 at $715.00: five full months ($3,575), June charged $425 and paying $290 → 6 credits.
    //    Paid 290 + 6 × 715 = $4,580.
    //  - The at-62 recompute counts the 12 months before 62 (ages 60–61): 72 months early → $755.70, first
    //    paid at 63. Ages 63–64: five full ($3,778.50), June charged $221.50 and paying $534 → 6 credits.
    //    Paid 534 + 6 × 755.70 = $5,068.20.
    //  - The at-FRA recompute counts every month before survivor FRA: 5 × 6 = 30 → 54 months early →
    //    68,610/84,000 × 1,000 = $816.79 → $816.70, first paid the year after her FRA year (68).
    // The worker's own earnings never withheld her benefit: he died before any survivor year.
    const path = pathOf(
      [
        person({ currentAge: 64, birthYear: 1962, retirementAge: 66, earnedIncomeReal: 50_000, pia: 12_000, socialSecurityClaimAge: 67 }),
        person({ sex: 'female', currentAge: 58, birthYear: 1968, retirementAge: 65, earnedIncomeReal: 32_480, socialSecurityClaimAge: 70 }),
      ],
      [2, 50],
      12,
    )
    const s = tested(path)
    for (const t of [2, 3, 4]) expect(cents(s.paid[t]!), `age ${58 + t}`).toBe(458_000)
    for (const t of [5, 6]) expect(cents(s.paid[t]!), `age ${58 + t}`).toBe(506_820)
    for (const t of [7, 8, 9]) expect(cents(s.paid[t]!), `age ${58 + t}, retired, before the FRA recompute`).toBe(906_840)
    for (const t of [10, 11]) expect(cents(s.paid[t]!), `age ${58 + t}`).toBe(980_040)
    expect(s.creditMonths[1]).toEqual({ own: 0, spousal: 0, widow: 30 })
  })

  it('a dead worker’s earnings never withhold the widow(er) benefit, even with work planned past the death', () => {
    // He planned to work to 70 for $200,000 and claimed at 62; he dies at 66 (offset 2). Her survivor years
    // hold back nothing (404.311(b): his entitlement ended before the month of death; §403(b)(1)(B)).
    const path = pathOf(
      [
        person({ currentAge: 64, birthYear: 1962, retirementAge: 70, earnedIncomeReal: 200_000, pia: 24_000, socialSecurityClaimAge: 62 }),
        person({ sex: 'female', currentAge: 66, birthYear: 1960, socialSecurityClaimAge: 67 }),
      ],
      [2, 50],
      8,
    )
    const s = tested(path)
    expect(s.withheld[0]! + s.withheld[1]!).toBeGreaterThan(0)
    for (let t = 2; t < 8; t++) {
      expect(s.withheld[t], `survivor year ${t}`).toBe(0)
    }
  })

  it('the last year alive is a full year: a worker alive through their FRA year is charged the stopgap there (§403(f)(3))', () => {
    // Born 1960, claimed at 64, alive through 67 (dies at offset 2 from 66): age 66 is wholly before, age
    // 67 is the stopgap on the full twelve-month year's pay — the figures of the FRA-year arm above.
    const path = pathOf(
      [
        person({ currentAge: 66, birthYear: 1960, retirementAge: 70, earnedIncomeReal: 90_000, pia: 24_000, socialSecurityClaimAge: 64 }),
        person({ sex: 'female', currentAge: 60, birthYear: 1966, socialSecurityClaimAge: 67 }),
      ],
      [2, 50],
      3,
    )
    const s = tested(path)
    expect(cents(s.withheld[1]!)).toBe(578_000)
    expect(s.fraYearAtMost[1]).toBe(1)
  })
})

describe('the fast path, and nothing withheld', () => {
  it('a path with no tested year returns the one shared no-test schedule', () => {
    // Retired, or working but not yet claimed, or past FRA, or dead before work: nothing is tested.
    const retired = pathOf([person({ currentAge: 63, birthYear: 1963, pia: 24_000, socialSecurityClaimAge: 62 })], [50], 10)
    const unclaimed = pathOf([person({ currentAge: 60, birthYear: 1966, retirementAge: 64, earnedIncomeReal: 90_000, pia: 24_000, socialSecurityClaimAge: 65 })], [50], 10)
    const pastFra = pathOf([person({ currentAge: 68, birthYear: 1958, retirementAge: 72, earnedIncomeReal: 90_000, pia: 24_000, socialSecurityClaimAge: 62 })], [50], 10)
    for (const p of [retired, unclaimed, pastFra]) expect(earningsTestSchedule(p)).toBe(NO_EARNINGS_TEST)
    expect(Object.isFrozen(NO_EARNINGS_TEST)).toBe(true)
  })

  it('a tested worker paid at or under the lower amount gets a schedule that withholds nothing, Object.is the run’s Social Security every year', () => {
    const lower = earningsTestExemptAmounts.value.lowerAnnual
    for (const pay of [0, lower, lower + 1]) {
      // lower + 1: (1) ÷ 2 floors to 0.
      const path = pathOf(
        [
          person({ currentAge: 63, birthYear: 1963, retirementAge: 67, earnedIncomeReal: pay, pia: 25_714.32, socialSecurityClaimAge: 62 }),
          person({ sex: 'female', currentAge: 63, birthYear: 1963, socialSecurityClaimAge: 62 }),
        ],
        [50, 50],
        10,
      )
      const s = tested(path)
      for (let t = 0; t < 10; t++) {
        expect(s.withheld[t]).toBe(0)
        expect(Object.is(s.paid[t], owedSs(path, t)), `pay ${pay}, year ${t}`).toBe(true)
      }
      expect(s.creditMonths.every((c) => c.own === 0 && c.spousal === 0 && c.widow === 0)).toBe(true)
    }
  })
})

describe('the producer over a seeded population (every path, every year)', () => {
  // Couples (nine in ten) and singles, ages 52–72, PIAs $0–$48,000 (a quarter $0), claims 62–70, pay $0–
  // $160,000 (a fifth at or under the lower amount), working 0–8 more years, deaths anywhere 0–30 (wider
  // than the sampled deaths on purpose: the laws below hold on the whole input domain).
  const rand = mulberry32(20261027)
  const int = (lo: number, hi: number): number => lo + Math.floor(rand() * (hi - lo + 1))
  const someone = (sex: 'male' | 'female'): PersonInputs => {
    const currentAge = int(52, 72)
    return person({
      sex,
      currentAge,
      birthYear: 2026 - currentAge,
      retirementAge: currentAge + int(0, 8),
      earnedIncomeReal: rand() < 0.2 ? int(0, 24_000) : int(25_000, 160_000),
      pia: rand() < 0.25 ? 0 : int(100_000, 4_800_000) / 100,
      socialSecurityClaimAge: int(62, 70),
    })
  }
  const HORIZON = 30
  const PATHS = Array.from({ length: 1_200 }, () => {
    const people = rand() < 0.9 ? [someone('male'), someone('female')] : [someone('female')]
    return pathOf(people, people.map(() => int(0, 30)), HORIZON)
  })

  it('pays owed less withheld; withholds only in a tested working year; credits never exceed a benefit’s months early; and with no credit, every year is Object.is the run', () => {
    const reach = { tested: 0, untested: 0, withheldYears: 0, survivorWithheld: 0, atMostYears: 0, credited: 0, identityYears: 0 }
    for (const path of PATHS) {
      const s = earningsTestSchedule(path)
      if (!s.tested) {
        reach.untested++
        continue
      }
      reach.tested++
      const credited = s.creditMonths.some((c) => c.own + c.spousal + c.widow > 0)
      if (credited) reach.credited++
      for (let t = 0; t < HORIZON; t++) {
        const owed = owedSs(path, t)
        expect(s.withheld[t]).toBeGreaterThanOrEqual(0)
        expect(s.paid[t]).toBeGreaterThanOrEqual(0)
        expect(Number.isInteger(cents(s.withheld[t]!)) && Number.isFinite(s.paid[t]!)).toBe(true)
        const working = path.people.some((p, i) => t < path.deathOffsets[i]! && t < p.retirementAge - p.currentAge)
        if (s.withheld[t]! > 0) {
          reach.withheldYears++
          expect(working, 'only a working year withholds').toBe(true)
          if (path.deathOffsets.some((d) => t >= d)) reach.survivorWithheld++
        }
        if (s.fraYearAtMost[t]) reach.atMostYears++
        if (!credited) {
          // No credit anywhere on the path: the year pays exactly what is owed less what was held back,
          // and a year with nothing held back is the run's own float.
          expect(cents(s.paid[t]! + s.withheld[t]!)).toBe(cents(owed))
          if (s.withheld[t] === 0) {
            expect(Object.is(s.paid[t], owed), `year ${t}: ${JSON.stringify(path.people)}`).toBe(true)
            reach.identityYears++
          }
        }
      }
      path.people.forEach((p, i) => {
        const early = fraMonthsForBirthYear(p.birthYear, 'retirement') - p.socialSecurityClaimAge * 12
        expect(s.creditMonths[i]!.own).toBeLessThanOrEqual(Math.max(0, early))
        expect(s.creditMonths[i]!.spousal).toBeLessThanOrEqual(Math.max(0, early))
      })
    }
    for (const [branch, count] of Object.entries(reach)) expect(count, `the population reaches '${branch}'`).toBeGreaterThan(20)
  })
})

describe('socialSecurityPaid — the one read U5 makes', () => {
  it('pays the composed figure on an untested path, the schedule’s on a tested one, and throws past the horizon', () => {
    const working = pathOf(
      [person({ currentAge: 63, birthYear: 1963, retirementAge: 67, earnedIncomeReal: 60_000, pia: 24_000, socialSecurityClaimAge: 62 })],
      [50],
      3,
    )
    const s = tested(working)
    expect(socialSecurityPaid(s, 1, 99)).toBe(s.paid[1])
    expect(socialSecurityPaid(NO_EARNINGS_TEST, 40, 1_234.5)).toBe(1_234.5)
    for (const t of [3, -1, 1.5]) expect(() => socialSecurityPaid(s, t, 0), `t ${t}`).toThrow(/outside the schedule's horizon/)
  })
})

describe('errors fail loud', () => {
  const good = (): EarningsTestPath =>
    pathOf([person({ currentAge: 63, birthYear: 1963, retirementAge: 67, earnedIncomeReal: 60_000, pia: 24_000, socialSecurityClaimAge: 62 })], [50], 5)

  it('a non-finite, negative or over-cap wage throws', () => {
    for (const w of [Number.NaN, Number.POSITIVE_INFINITY, -1, 2e12]) {
      const p = good()
      const offsets = [{ ...p.offsets[0]!, earnedIncomeReal: w }]
      expect(() => earningsTestSchedule({ ...p, offsets }), `wage ${w}`).toThrow(/wages must be finite/)
    }
  })

  it('a non-finite or negative benefit throws, and so does a benefit that is not twelve whole monthly cents', () => {
    for (const b of [Number.NaN, -1]) {
      const p = good()
      expect(() => earningsTestSchedule({ ...p, offsets: [{ ...p.offsets[0]!, socialSecurityReal: b }] }), `benefit ${b}`).toThrow(/must be finite/)
    }
    const p = good()
    expect(() => earningsTestSchedule({ ...p, offsets: [{ ...p.offsets[0]!, socialSecurityReal: 20_000.01 }] })).toThrow(/twelve whole monthly cents/)
  })

  it('misaligned inputs, a fractional death offset and a bad horizon throw', () => {
    const p = good()
    expect(() => earningsTestSchedule({ ...p, deathOffsets: [50, 50] })).toThrow(/index-aligned/)
    expect(() => earningsTestSchedule({ ...p, deathOffsets: [2.5] })).toThrow(/whole year/)
    expect(() => earningsTestSchedule({ ...p, horizonYears: -1 })).toThrow(/horizonYears/)
    expect(() => earningsTestSchedule({ ...p, horizonYears: 1.5 })).toThrow(/horizonYears/)
  })
})
