import { describe, it, expect } from 'vitest'
import { adjustOwnBenefitAnnual, householdBenefits, type BenefitPerson } from '../socialSecurityBenefit'

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
