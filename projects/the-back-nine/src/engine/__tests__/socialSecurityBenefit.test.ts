import { describe, it, expect } from 'vitest'
import {
  adjustOwnBenefitAnnual,
  householdBenefits,
  survivorBenefitAnnual,
  type BenefitPerson,
} from '../socialSecurityBenefit'

// Annual = monthly × 12 (the model stores annual; SSA states monthly). Expected
// values are HAND-DERIVED from the POMS rules / printed examples (DND/012) — never
// from the engine's own formula.
const annual = (monthly: number) => monthly * 12
const BY = 1969 // FRA 67 (804mo) — the household cohort

describe('SS benefit sub-engine — own benefit (POMS RS 00615.101/.690/.692, dime-rounded)', () => {
  it('the published percent-of-PIA factors land EXACTLY on the dime at FRA 67 (62→70% · 67→100% · 70→124%)', () => {
    const pia = annual(1000) // $1,000/mo PIA
    expect(adjustOwnBenefitAnnual(pia, 62, BY), '62 = 70% → $700/mo').toBe(annual(700))
    expect(adjustOwnBenefitAnnual(pia, 67, BY), 'FRA = 100% → $1,000/mo').toBe(annual(1000))
    expect(adjustOwnBenefitAnnual(pia, 70, BY), '70 = 124% → $1,240/mo').toBe(annual(1240))
  })

  it('the monthly dime-round is DOWN and float-exact ($1,875.55 PIA at 62 → $1,312.80/mo, not $1,312.90)', () => {
    // 1875.55 × 0.70 = 1312.885 → round DOWN to the next lower dime → 1312.80 (POMS verbatim example).
    // Compare in CENTS — the engine's integer path yields exactly $15,753.60/yr; a float `1312.8 × 12`
    // would read 15753.599999999999 (the very imprecision the integer-cents design avoids).
    expect(
      Math.round(adjustOwnBenefitAnnual(annual(1875.55), 62, BY) * 100),
      '$1,312.80/mo × 12 = $15,753.60/yr',
    ).toBe(1_575_360)
  })

  it('a delayed-credit claim for a pre-1943 birth FAILS LOUD (the step-down rate is unsourced — never default to 8%)', () => {
    expect(() => adjustOwnBenefitAnnual(annual(1000), 70, 1942)).toThrow(/1943/)
  })

  it('PIA = 0 ⇒ benefit 0 (the reduce-to-spine zero)', () => {
    expect(adjustOwnBenefitAnnual(0, 62, BY)).toBe(0)
    expect(adjustOwnBenefitAnnual(0, 70, BY)).toBe(0)
  })
})

describe('SS benefit sub-engine — Method C spousal excess (POMS RS 00615.020), NOT max()', () => {
  it('THE divergence case: a dual earner claiming early gets reduced-own IN FULL + reduced-excess, BEATING naive max()', () => {
    // own PIA $1,000/mo, worker PIA $3,000/mo, lower earner claims 62 (FRA 67).
    const people: BenefitPerson[] = [
      { piaAnnual: annual(1000), claimAge: 62, birthYear: BY }, // the lower earner
      { piaAnnual: annual(3000), claimAge: 67, birthYear: BY }, // the higher earner
    ]
    const [low, high] = householdBenefits(people)
    // own 1000×0.70 = $700/mo; excess (0.5×3000 − 1000)=$500/mo × 0.65 = $325/mo.
    expect(low!.ownAnnual, 'reduced own = $700/mo').toBe(annual(700))
    expect(low!.spousalExcessAnnual, 'reduced excess = $325/mo (the 25/36 schedule, not 5/9)').toBe(annual(325))
    const total = low!.ownAnnual + low!.spousalExcessAnnual
    expect(total, 'Method C total = $1,025/mo').toBe(annual(1025))
    // The cardinal correctness gate: naive max(own $700, spousal-as-max 0.65×$1,500=$975) = $975 —
    // Method C beats it by exactly $50/mo. A relapse to max() (or a 5/9-for-excess swap → $1,050) fails here.
    expect(total, 'beats naive max() by $50/mo').toBeGreaterThan(annual(975))
    expect(total - annual(975), 'the documented +$50/mo divergence').toBe(annual(50))
    // The higher earner is paid on no one's record → no excess.
    expect(high!.spousalExcessAnnual, 'higher earner gets no spousal excess').toBe(0)
  })

  it('at FRA, a dual earner gets exactly 50% of the higher PIA (own-in-full + full excess)', () => {
    // worker PIA $2,000/mo, lower own PIA $400/mo, lower claims at FRA 67.
    const [low] = householdBenefits([
      { piaAnnual: annual(400), claimAge: 67, birthYear: BY },
      { piaAnnual: annual(2000), claimAge: 67, birthYear: BY },
    ])
    expect(low!.ownAnnual, 'own $400/mo').toBe(annual(400))
    expect(low!.spousalExcessAnnual, 'excess (1000 − 400) = $600/mo').toBe(annual(600))
    expect(low!.ownAnnual + low!.spousalExcessAnnual, '= 50% of the $2,000 worker PIA = $1,000/mo').toBe(annual(1000))
  })

  it('equal earners get NO spousal excess (own PIA ≥ 50% of the higher PIA ⇒ excess floors to 0)', () => {
    const both = householdBenefits([
      { piaAnnual: annual(2000), claimAge: 64, birthYear: BY },
      { piaAnnual: annual(2000), claimAge: 64, birthYear: BY },
    ])
    expect(both[0]!.spousalExcessAnnual).toBe(0)
    expect(both[1]!.spousalExcessAnnual).toBe(0)
  })

  it('a single person (people-of-one) gets own only — no spousal direction', () => {
    const [solo] = householdBenefits([{ piaAnnual: annual(1500), claimAge: 62, birthYear: BY }])
    expect(solo!.spousalExcessAnnual).toBe(0)
    expect(solo!.ownAnnual, '1500 × 0.70 = $1,050/mo').toBe(annual(1050))
  })

  it('reduce-to-spine: all-PIA-zero ⇒ every stream zero', () => {
    const out = householdBenefits([
      { piaAnnual: 0, claimAge: 67, birthYear: BY },
      { piaAnnual: 0, claimAge: 67, birthYear: BY },
    ])
    expect(out).toEqual([
      { ownAnnual: 0, spousalExcessAnnual: 0 },
      { ownAnnual: 0, spousalExcessAnnual: 0 },
    ])
  })
})

describe('SS benefit sub-engine — survivor §202 (POMS RS 00615.301/.320, RIB-LIM + lock-flat)', () => {
  // Compare in cents (the engine is exact in cents; some monthly values × 12 aren't float-clean).
  const cents = (annualDollars: number) => Math.round(annualDollars * 100)
  const dec = (piaMonthly: number, claimAge: number): BenefitPerson => ({ piaAnnual: piaMonthly * 12, claimAge, birthYear: BY })

  it('RIB-LIM floor BINDS when the deceased claimed deeply early: survivor at FRA gets 82.5% of PIA, not the deceased reduced $700', () => {
    // deceased PIA $1,000/mo, claimed 62 → actual $700/mo; 82.5% floor = $825/mo > $700 ⇒ floor binds.
    expect(cents(survivorBenefitAnnual(dec(1000, 62), BY, 67)), '$825/mo').toBe(cents(annual(825)))
  })

  it("RIB-LIM does NOT bind when the deceased claimed only moderately early: survivor gets the deceased's actual reduced benefit", () => {
    // deceased claimed 65 → $866.60/mo (> the $825 floor) ⇒ the actual reduced benefit is the cap.
    expect(cents(survivorBenefitAnnual(dec(1000, 65), BY, 67)), '$866.60/mo').toBe(86_660 * 12)
  })

  it("the deceased's DRCs FLOW THROUGH: a survivor of a delayed-to-70 worker gets 124% of PIA (no RIB-LIM — not claimed early)", () => {
    expect(cents(survivorBenefitAnnual(dec(1000, 70), BY, 67)), '$1,240/mo').toBe(cents(annual(1240)))
  })

  it('a deceased who claimed at FRA passes 100% through; the survivor at FRA gets the full $1,000/mo', () => {
    expect(cents(survivorBenefitAnnual(dec(1000, 67), BY, 67))).toBe(cents(annual(1000)))
  })

  it('the lock-flat age reduction: a survivor starting at 60 gets exactly 71.5% (28.5% max), at 67 gets 100%', () => {
    expect(cents(survivorBenefitAnnual(dec(1000, 67), BY, 60)), '71.5% → $715/mo').toBe(cents(annual(715)))
    expect(cents(survivorBenefitAnnual(dec(1000, 67), BY, 67)), '100% → $1,000/mo').toBe(cents(annual(1000)))
    // The locked factor does NOT ramp: a start at 60 and a start at 63 are DIFFERENT flat amounts,
    // each correct for its start age (the seam holds whichever flat — plan §6).
    expect(survivorBenefitAnnual(dec(1000, 67), BY, 63)).toBeGreaterThan(survivorBenefitAnnual(dec(1000, 67), BY, 60))
    expect(survivorBenefitAnnual(dec(1000, 67), BY, 63)).toBeLessThan(survivorBenefitAnnual(dec(1000, 67), BY, 67))
  })

  it('the graduated survivor-FRA cohorts reduce over THEIR span (28.5% spread over the months 60 → survivor-FRA, RS 00615.301)', () => {
    // Survivor born 1958: survivor-FRA 66y4m (796 mo), span 76. Start 63 (756 mo) = 40 months early →
    // 1 − .285 × 40/76 = .85 → $850.00. Survivor born 1960: 66y8m (800 mo), span 80; start 63 = 44 months early →
    // 1 − .285 × 44/80 = .84325 → $843.25 → $843.20. (A deceased who claimed at FRA: no RIB-LIM, the full rate is the
    // PIA.) The property test cannot see the span — its reduced WIB comes from this same formula — so these pin it.
    expect(cents(survivorBenefitAnnual(dec(1000, 67), 1958, 63)), '$850.00/mo').toBe(85_000 * 12)
    expect(cents(survivorBenefitAnnual(dec(1000, 67), 1960, 63)), '$843.20/mo').toBe(84_320 * 12)
  })

  // THE EARLY-WIDOWHOOD JUNCTION — RIB-LIM is applied AFTER the survivor's age reduction. The law reduces the
  // widow(er)'s full rate for her start age FIRST and caps the result: payable = the reduced WIB, unless it
  // exceeds BOTH 82.5% of the death PIA and the deceased's if-alive benefit (POMS RS 00615.320 A.3 — "when the
  // WIB after adjustment for the family maximum and reduction for age is more than BOTH…"; 42 U.S.C.
  // §402(e)(2)(D) "after application of subsection (q)", §402(f)(2)(D) for widowers). THE ORACLE is the
  // RS 00615.322 D worksheet: sort {reduced WIB, 82.5% death PIA, the deceased's RIB} low → high and pay the
  // amount its chart underlines. One arm per chart row below, every figure hand-derived from that chart and
  // the POMS fractions — never from this function. (Until 2026-10-27 the engine capped first and reduced
  // after: below the law on every Sequence arm here — the gloomy direction; each Sequence arm's TITLE records
  // the old figure. The FRA-66 arm records none, and the at/after-FRA arm is unmoved by construction.)
  //
  // The hand derivation, PIA $1,000/mo, deceased AND survivor FRA 67 (BY 1969):
  //   reduced WIB, 28.5% over the 84 months 60→67: 60 → .715 = $715.00 · 61 → .755714 = $755.70 · 62 → .796429
  //     = $796.40 · 63 → .837143 = $837.10 · 64 → .877857 = $877.80 · 66 → .959286 = $959.20 (dime-floored)
  //   the deceased's RIB, 5/9% a month for 36 months then 5/12%: 62 → 70% = $700.00 · 64 → 80% = $800.00 ·
  //     65 → 86.667% = $866.60 · 66 → 93.333% = $933.30
  //   82.5% of the death PIA = $825.00
  describe('RIB-LIM applies AFTER the age reduction — one arm per RS 00615.322 D chart row', () => {
    it('Sequence 1 (reduced WIB < 82.5% < RIB) pays the reduced WIB: claimed 65, survivor 61 → $755.70 (old order $654.90)', () => {
      // 755.70 < 825.00 < 866.60
      expect(cents(survivorBenefitAnnual(dec(1000, 65), BY, 61))).toBe(75_570 * 12)
    })

    it('Sequence 2 (reduced WIB < RIB < 82.5%) pays the reduced WIB: claimed 64, survivor 62 → $796.40 (old order $657.00)', () => {
      // 796.40 < 800.00 < 825.00
      expect(cents(survivorBenefitAnnual(dec(1000, 64), BY, 62))).toBe(79_640 * 12)
    })

    it('Sequence 3 (82.5% < reduced WIB < RIB) pays the reduced WIB: claimed 66, survivor 64 → $877.80 (old order $819.30)', () => {
      // 825.00 < 877.80 < 933.30
      expect(cents(survivorBenefitAnnual(dec(1000, 66), BY, 64))).toBe(87_780 * 12)
    })

    it("Sequence 4 (82.5% < RIB < reduced WIB) pays the deceased's RIB: claimed 65, survivor 66 → $866.60 (old order $831.30)", () => {
      // 825.00 < 866.60 < 959.20
      expect(cents(survivorBenefitAnnual(dec(1000, 65), BY, 66))).toBe(86_660 * 12)
    })

    it('Sequence 5 (RIB < reduced WIB < 82.5%) pays the reduced WIB: claimed 62, survivor 61 → $755.70 (old order $623.40); at 60 → $715.00 (old $589.80)', () => {
      // 700.00 < 755.70 < 825.00 — the register's junction (the old golden pinned $623.40, the defect's second copy)
      expect(cents(survivorBenefitAnnual(dec(1000, 62), BY, 61))).toBe(75_570 * 12)
      // 700.00 < 715.00 < 825.00 — the deepest reduction the aged WIB allows
      expect(cents(survivorBenefitAnnual(dec(1000, 62), BY, 60))).toBe(71_500 * 12)
    })

    it('Sequence 6 (RIB < 82.5% < reduced WIB) pays 82.5% of the death PIA: claimed 62, survivor 66 or 63 → $825.00 (old order $791.40 / $690.60)', () => {
      // 700.00 < 825.00 < 959.20, and 700.00 < 825.00 < 837.10 — the cap binds from 63 on, years before FRA.
      expect(cents(survivorBenefitAnnual(dec(1000, 62), BY, 66))).toBe(82_500 * 12)
      expect(cents(survivorBenefitAnnual(dec(1000, 62), BY, 63))).toBe(82_500 * 12)
    })

    it('the FRA-66 cohort (a 72-month span) at GN 00204.045 C’s WIB PIA of $740.50: survivor 62 / 63 / 64 → $599.80 / $634.90 / $641.70', () => {
      // Both born 1950: retirement FRA 66 (1943–54) and survivor FRA 66 (1945–56). Deceased claimed 64, 24 months
      // early: 13/15 × 740.50 = 641.77 → RIB $641.70. 82.5% × 740.50 = 610.9125 → $610.90. Reduced WIB, 28.5%
      // over 72 months: 62 → .81 = 599.805 → $599.80 (Sequence 1: 599.80 < 610.90 < 641.70 → the WIB);
      // 63 → .8575 = 634.97875 → $634.90 (Sequence 3: 610.90 < 634.90 < 641.70 → the WIB); 64 → .905 = 670.1525
      // → $670.10 (Sequence 4: 610.90 < 641.70 < 670.10 → the RIB). (GN's own example needs month-level claim
      // and start ages the whole-year API cannot express; its 36-vs-37-month figures agree with this order.)
      const dec1950: BenefitPerson = { piaAnnual: annual(740.5), claimAge: 64, birthYear: 1950 }
      expect(cents(survivorBenefitAnnual(dec1950, 1950, 62)), '$599.80/mo').toBe(59_980 * 12)
      expect(cents(survivorBenefitAnnual(dec1950, 1950, 63)), '$634.90/mo').toBe(63_490 * 12)
      expect(cents(survivorBenefitAnnual(dec1950, 1950, 64)), '$641.70/mo').toBe(64_170 * 12)
    })

    it('a deceased who claimed at or after FRA is never RIB-limited: reduced WIB on the PIA (plus DRCs) at every start age', () => {
      // claimed 67 (no reduced RIB): survivor 61 → .755714 × 1000 = $755.70, the same reduced WIB Sequence 5
      // pays — the cap never binds there. Claimed 70: the $1,240 DRC base reduced at 61 → 937.09 → $937.00.
      expect(cents(survivorBenefitAnnual(dec(1000, 67), BY, 61))).toBe(75_570 * 12)
      expect(cents(survivorBenefitAnnual(dec(1000, 70), BY, 61))).toBe(93_700 * 12)
    })

    it('a PIA typed with odd cents is floored to the dime ONCE, and every amount reads it (§215(a): "the next lower multiple of $0.10")', () => {
      // RIB path (Sequence 4): $508.02 → PIA $508.00. Deceased born 1955 (retirement FRA 66y2m), claimed 65: 14
      // months early → 166/180 × 508.00 = 468.49 → RIB $468.40 (the raw $508.02 gives $468.50, a dime high).
      // 82.5% × 508.00 = 419.10. Survivor born 1945 (survivor FRA 66y0m) starting at 65: 12 of 72 months →
      // .9525 × 508.00 = 483.87 → $483.80. 419.10 < 468.40 < 483.80 → the RIB, $468.40.
      const odd: BenefitPerson = { piaAnnual: annual(508.02), claimAge: 65, birthYear: 1955 }
      expect(cents(survivorBenefitAnnual(odd, 1945, 65)), 'the RIB on the dime PIA, $468.40/mo').toBe(46_840 * 12)
      // 82.5% path (Sequence 6): $1,000.19 → PIA $1,000.10. 82.5% × 1,000.10 = 825.08 → $825.00 (the raw PIA
      // gives $825.10). RIB 70% = 700.07 → $700.00; reduced WIB at 63, .837143 × 1,000.10 = 837.23 → $837.20.
      // 700.00 < 825.00 < 837.20 → 82.5%, $825.00.
      expect(cents(survivorBenefitAnnual(dec(1000.19, 62), BY, 63)), '82.5% of the dime PIA, $825.00/mo').toBe(82_500 * 12)
      // DRC path, survivor at FRA: $1,000.49 → PIA $1,000.40; claimed 70, × 1.24 = 1,240.496 → $1,240.40 (the raw
      // PIA gives $1,240.60, two dimes high).
      expect(cents(survivorBenefitAnnual(dec(1000.49, 70), BY, 67)), 'DRCs on the dime PIA, $1,240.40/mo').toBe(124_040 * 12)
    })
  })

  it('reduce-to-spine: a deceased with PIA 0 yields a survivor benefit of 0', () => {
    expect(survivorBenefitAnnual(dec(0, 62), BY, 60)).toBe(0)
  })

  it("survivor-FRA is keyed to the SURVIVOR's birth year, never aliased to retirement-FRA (the separate-table anti-alias)", () => {
    // Survivor born 1956: survivor-FRA = 792mo (66y0m), but retirement-FRA(1956) = 796mo (66y4m) — they DIVERGE.
    // Deceased claimed at FRA 67 → full $1,000, no RIB-LIM. At start age 66 (792mo) the survivor is AT survivor-FRA
    // → 100% → $1,000/mo. An alias to retirement-FRA (796) would make 792 < FRA → a ~1.5% age reduction (≈$985/mo).
    // This golden fails if survivorBenefitAnnual ever reads the retirement table for the survivor's age.
    expect(cents(survivorBenefitAnnual(dec(1000, 67), 1956, 66)), '100% at survivor-FRA 66y0m → $1,000/mo').toBe(cents(annual(1000)))
  })
})

describe('SS benefit sub-engine — entry guards (fail loud; never a silent NaN or a negative benefit dollar)', () => {
  it('a non-finite claim age THROWS at every entry — a NaN would otherwise pass every relational guard and leak a silent NaN benefit (insights 008/010)', () => {
    expect(() => adjustOwnBenefitAnnual(annual(1000), NaN, BY)).toThrow(/claimAge/)
    expect(() => adjustOwnBenefitAnnual(annual(1000), Infinity, BY)).toThrow(/claimAge/)
    expect(() => householdBenefits([{ piaAnnual: annual(1000), claimAge: NaN, birthYear: BY }])).toThrow(/claimAge/)
    // The survivor path is the subtle one: a NaN deceased.claimAge made `claimedEarly` false and, at/after
    // survivor-FRA, returned a NaN benefit with NO throw. The entry guard now closes it.
    expect(() => survivorBenefitAnnual({ piaAnnual: annual(1000), claimAge: NaN, birthYear: BY }, BY, 67)).toThrow(/claimAge/)
  })

  it('an out-of-window claim age THROWS — below 62 the reduction extrapolates UNBOUNDED to a NEGATIVE benefit (pre-fix: claim 47 → −$600/yr)', () => {
    expect(() => adjustOwnBenefitAnnual(annual(1000), 47, BY)).toThrow(/\[62, 70\]/)
    expect(() => adjustOwnBenefitAnnual(annual(1000), 61, BY)).toThrow(/\[62, 70\]/)
    expect(() => adjustOwnBenefitAnnual(annual(1000), 71, BY)).toThrow(/\[62, 70\]/)
  })

  it('a non-integer claim age THROWS — claim ages are whole years (the EXACTNESS invariant needs an integer month count)', () => {
    expect(() => adjustOwnBenefitAnnual(annual(1000), 62.5, BY)).toThrow(/INTEGER/)
  })

  it('a negative PIA THROWS — never a floored $0 that masks bad input (burned/062)', () => {
    expect(() => adjustOwnBenefitAnnual(-1, 67, BY)).toThrow()
    expect(() => householdBenefits([{ piaAnnual: -1, claimAge: 67, birthYear: BY }])).toThrow()
  })

  it('a 3+-person household THROWS — it would credit multiple simultaneous spousal excesses on one record; couple (2) and people-of-one (1) still serve', () => {
    expect(() =>
      householdBenefits([
        { piaAnnual: annual(1000), claimAge: 64, birthYear: BY },
        { piaAnnual: annual(3000), claimAge: 67, birthYear: BY },
        { piaAnnual: annual(800), claimAge: 64, birthYear: BY },
      ]),
    ).toThrow(/≤ 2|couple/)
    expect(householdBenefits([{ piaAnnual: annual(1500), claimAge: 62, birthYear: BY }])).toHaveLength(1)
  })

  it('a non-integer survivorStartAge THROWS (whole-year ages)', () => {
    expect(() => survivorBenefitAnnual({ piaAnnual: annual(1000), claimAge: 67, birthYear: BY }, BY, 66.5)).toThrow(/whole year/)
  })
})

describe('SS benefit sub-engine — non-FRA-67 cohorts (the graduated-FRA band + the DERIVED DRC month cap, NEVER a literal 36 — plan §3 landmine)', () => {
  // 1958-born → retirement-FRA 66y8m = 800 months. Values HAND-DERIVED from the POMS month-count rules (DND/012),
  // never from the engine. These two goldens are the only coverage of the graduated-FRA table + the derived cap.
  const BY58 = 1958
  it('delayed-to-70 at FRA 66y8m: the DRC cap is 40 months (840−800), NOT 36 → 1.26667× ; a literal-36 cap would under-credit to 1.24×', () => {
    // 40 increment months × 2/3 of 1% = +26.667% → $1,266.66… → dime-floor DOWN → $1,266.60/mo.
    expect(Math.round(adjustOwnBenefitAnnual(annual(1000), 70, BY58) * 100), '$1,266.60/mo × 12').toBe(126_660 * 12)
    expect(adjustOwnBenefitAnnual(annual(1000), 70, BY58), 'NOT the literal-36 regression value $1,240/mo').not.toBe(annual(1240))
  })
  it('claim-62 at FRA 66y8m: 56 months early (36×5/9% + 20×5/12% = 28.333%) → 0.71667× → $716.60/mo', () => {
    expect(Math.round(adjustOwnBenefitAnnual(annual(1000), 62, BY58) * 100), '$716.60/mo × 12').toBe(71_660 * 12)
  })
})

// ===========================================================================
// The earnings test's CREDITS (the pay check's U3 — `docs/plans/features/working-year-pay-check-build-
// spec.md`, KTD10): a benefit recomputed with its withheld months taken out of its early-claim reduction
// (42 U.S.C. §402(q)(7); 20 CFR 404.412; POMS RS 00615.490 B.1 — the normal tiers on n − credits, never the
// pre-1978 §402(q)(10) ratio). Every figure hand-derived from the per-month fractions (DND 012).
// ===========================================================================
describe('SS benefit sub-engine — earnings-test credits (§402(q)(7))', () => {
  const cents = (annualDollars: number) => Math.round(annualDollars * 100)
  const monthly = (monthlyCents: number) => monthlyCents * 12

  it('own benefit: 60 months early less 36 credits = 24 at 5/9 % → 156/180 → $866.60; less 12 = 48 → 0.75 → $750.00; less all 60 → the full PIA', () => {
    const pia = annual(1000)
    expect(cents(adjustOwnBenefitAnnual(pia, 62, BY, 36))).toBe(monthly(86_660))
    expect(cents(adjustOwnBenefitAnnual(pia, 62, BY, 12)), '36 × 5/9 % + 12 × 5/12 % = 25 %').toBe(monthly(75_000))
    expect(cents(adjustOwnBenefitAnnual(pia, 62, BY, 60))).toBe(monthly(100_000))
    expect(Object.is(adjustOwnBenefitAnnual(pia, 62, BY, 0), adjustOwnBenefitAnnual(pia, 62, BY)), 'credits 0 is the uncredited path').toBe(true)
  })

  it('the research’s worker: PIA $2,142.86, 45 credits → 15 months → 165/180 → $1,964.28, dime-floored to $1,964.20', () => {
    // The research's $1,964.26 applies §402(q)(8) (round the REDUCTION up to the dime) to a PIA with odd
    // cents; the engine dime-floors the benefit instead — the register's *A typed Social Security amount
    // with odd cents is never rounded to the dime…*. On a dime-multiple PIA the two agree.
    expect(cents(adjustOwnBenefitAnnual(annual(2142.86), 62, BY, 45))).toBe(monthly(196_420))
  })

  it('a graduated-FRA cohort recomputes on its own months early: 1958, claim 62 = 56 months, less 20 → 36 → 0.80 → $800.00', () => {
    expect(cents(adjustOwnBenefitAnnual(annual(1000), 62, 1958, 20))).toBe(monthly(80_000))
  })

  it('credits beyond the months early, a fractional credit, or any credit on an unreduced claim THROW — the factor would pass 1', () => {
    expect(() => adjustOwnBenefitAnnual(annual(1000), 62, BY, 61)).toThrow(/\[0, 60\]/)
    expect(() => adjustOwnBenefitAnnual(annual(1000), 62, BY, 1.5)).toThrow(/whole number/)
    expect(() => adjustOwnBenefitAnnual(annual(1000), 62, BY, -1)).toThrow(/whole number/)
    expect(() => adjustOwnBenefitAnnual(annual(1000), 67, BY, 1)).toThrow(/\[0, 0\]/)
    expect(() => adjustOwnBenefitAnnual(annual(1000), 70, BY, 1)).toThrow(/\[0, 0\]/)
  })

  it('householdBenefits credits each benefit on its own schedule: his own 36 → $1,733.30; her spousal excess 36 at 25/36 % → 120/144 → $833.30', () => {
    // His PIA $2,000 at 62 → $1,400; with 36 credits, 156/180 × 2,000 = $1,733.33 → $1,733.30. Hers: spousal
    // only, 50 % × 2,000 = $1,000, 60 months early → 0.65 → $650; with 36 credits, 120/144 → $833.33 → $833.30.
    const people: BenefitPerson[] = [
      { piaAnnual: annual(2000), claimAge: 62, birthYear: BY },
      { piaAnnual: 0, claimAge: 62, birthYear: BY },
    ]
    const credited = householdBenefits(people, [{ own: 36, spousal: 0 }, { own: 0, spousal: 36 }])
    expect(cents(credited[0]!.ownAnnual)).toBe(monthly(173_330))
    expect(cents(credited[1]!.spousalExcessAnnual)).toBe(monthly(83_330))
    // A dual earner's excess recomputes alone: her own PIA $800 → excess $200, 36 credits → $166.66 → $166.60.
    const dual = householdBenefits(
      [people[0]!, { piaAnnual: annual(800), claimAge: 62, birthYear: BY }],
      [{ own: 0, spousal: 0 }, { own: 0, spousal: 36 }],
    )
    expect(cents(dual[1]!.spousalExcessAnnual)).toBe(monthly(16_660))
    expect(cents(dual[1]!.ownAnnual), 'her own benefit carries no credits: $560').toBe(monthly(56_000))
  })

  it('householdBenefits with zero credits is Object.is the uncredited call; spousal credits on a person with no excess, or a misaligned array, THROW', () => {
    const people: BenefitPerson[] = [
      { piaAnnual: annual(2000), claimAge: 63, birthYear: BY },
      { piaAnnual: annual(450.55), claimAge: 62, birthYear: BY },
    ]
    const plain = householdBenefits(people)
    const zero = householdBenefits(people, [{ own: 0, spousal: 0 }, { own: 0, spousal: 0 }])
    plain.forEach((b, i) => {
      expect(Object.is(zero[i]!.ownAnnual, b.ownAnnual)).toBe(true)
      expect(Object.is(zero[i]!.spousalExcessAnnual, b.spousalExcessAnnual)).toBe(true)
    })
    expect(() => householdBenefits(people, [{ own: 0, spousal: 1 }, { own: 0, spousal: 0 }])).toThrow(/no spousal excess/)
    expect(() => householdBenefits(people, [{ own: 0, spousal: 0 }])).toThrow(/index-aligned/)
  })

  describe('the widow(er) benefit', () => {
    const dec = (piaMonthly: number, claimAge: number): BenefitPerson => ({ piaAnnual: piaMonthly * 12, claimAge, birthYear: BY })

    it('her own credits come out of her months early on the 28.5 % schedule: started at 60, 12 credits → 72 of 84 → $755.70; all 84 → the full $1,000', () => {
      // The deceased claimed at FRA, so no RIB-LIM: 1,000 × (1 − 0.285 × 72/84) = $755.714 → $755.70.
      expect(cents(survivorBenefitAnnual(dec(1000, 67), BY, 60, { widow: 12, deceased: 0 }))).toBe(monthly(75_570))
      expect(cents(survivorBenefitAnnual(dec(1000, 67), BY, 60, { widow: 84, deceased: 0 }))).toBe(monthly(100_000))
      expect(() => survivorBenefitAnnual(dec(1000, 67), BY, 60, { widow: 85, deceased: 0 })).toThrow(/\[0, 84\]/)
      expect(() => survivorBenefitAnnual(dec(1000, 67), BY, 67, { widow: 1, deceased: 0 }), 'no months early at survivor FRA').toThrow(/\[0, 0\]/)
    })

    it('the deceased’s credits raise the cap’s "if alive" benefit: claimed at 62, she starts at FRA — 28 credits leave $825.00, 29 give $827.70, 36 give $866.60', () => {
      // Payable = min(her age-reduced benefit, max(82.5 % × PIA, his if-alive benefit)); at her FRA the first
      // is the PIA itself. His if-alive benefit with c credits: (180 − (60 − c)) / 180 × 1,000 for 60 − c ≤ 36:
      // c = 28 → 148/180 → $822.20 (under the $825 floor); c = 29 → 149/180 → $827.70; c = 36 → $866.60.
      expect(cents(survivorBenefitAnnual(dec(1000, 62), BY, 67, { widow: 0, deceased: 28 }))).toBe(monthly(82_500))
      expect(cents(survivorBenefitAnnual(dec(1000, 62), BY, 67, { widow: 0, deceased: 29 }))).toBe(monthly(82_770))
      expect(cents(survivorBenefitAnnual(dec(1000, 62), BY, 67, { widow: 0, deceased: 36 }))).toBe(monthly(86_660))
    })

    it('a higher cap pays nothing more when her reduced benefit is already under the old one (RS 00615.585 B.3): claimed 64, five credits, she starts at 61 → $755.70 either way', () => {
      const uncredited = survivorBenefitAnnual(dec(1000, 64), BY, 61)
      expect(cents(uncredited)).toBe(monthly(75_570))
      expect(survivorBenefitAnnual(dec(1000, 64), BY, 61, { widow: 0, deceased: 5 })).toBe(uncredited)
      // And her own credits raise her reduced benefit only up to the cap: claimed 62, she starts at 61 with
      // 12 credits → 60 of 84 early → 66,900/84,000 × 1,000 = $796.43 → $796.40, under the $825 cap.
      expect(cents(survivorBenefitAnnual(dec(1000, 62), BY, 61, { widow: 12, deceased: 0 }))).toBe(monthly(79_640))
      expect(cents(survivorBenefitAnnual(dec(1000, 62), BY, 61, { widow: 24, deceased: 0 })), '48 early → $837.10, capped at $825').toBe(monthly(82_500))
    })

    it('credits on a deceased who claimed at or after FRA THROW (nothing to remove); zero credits are Object.is the uncredited call across a sweep', () => {
      expect(() => survivorBenefitAnnual(dec(1000, 67), BY, 62, { widow: 0, deceased: 1 })).toThrow(/did not claim early/)
      for (const pia of [0, 1000, 1234.5, 2875.55]) {
        for (const claim of [62, 63, 64, 65, 66, 67, 68, 70]) {
          for (const start of [60, 61, 63, 65, 67, 70]) {
            const plain = survivorBenefitAnnual(dec(pia, claim), BY, start)
            expect(Object.is(survivorBenefitAnnual(dec(pia, claim), BY, start, { widow: 0, deceased: 0 }), plain), `${pia}/${claim}/${start}`).toBe(true)
          }
        }
      }
    })
  })
})
