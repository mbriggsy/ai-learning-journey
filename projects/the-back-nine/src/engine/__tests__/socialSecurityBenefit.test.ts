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

  it('the combined early-widowhood junction (RIB-LIM × age-reduction) — the value the unit exists to get right', () => {
    // deceased claimed 62 (RIB-LIM floor → $825/mo base) AND survivor claims at 61 (age factor 75.57%).
    const v = survivorBenefitAnnual(dec(1000, 62), BY, 61)
    expect(cents(v), 'cap-then-age-reduce → $623.40/mo').toBe(62_340 * 12)
    // It DIFFERS from the old naive scalar (the deceased's reduced $700/mo) — the §202 path changed the value.
    expect(v).not.toBe(annual(700))
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
    // survivor-FRA, returned survivorFull = NaN with NO throw. The entry guard now closes it.
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
