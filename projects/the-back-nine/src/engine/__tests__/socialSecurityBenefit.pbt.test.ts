import { describe, it } from 'vitest'
import fc from 'fast-check'
import { adjustOwnBenefitAnnual, householdBenefits } from '../socialSecurityBenefit'

// Annual real PIA (integer $), whole-year claim age in the deemed-filing window.
const piaArb = fc.integer({ min: 0, max: 200_000 })
const claimArb = fc.integer({ min: 62, max: 70 })
const BY = 1969 // FRA 67

describe('SS benefit sub-engine — properties (fast-check)', () => {
  it('own benefit is finite, non-negative, and bounded within [0.70, 1.24]×PIA across the 62–70 window', () => {
    fc.assert(
      fc.property(piaArb, claimArb, (pia, claim) => {
        const b = adjustOwnBenefitAnnual(pia, claim, BY)
        // dime-rounding shaves at most $0.10/mo = $1.20/yr off the lower bound.
        return Number.isFinite(b) && b >= 0 && b <= pia * 1.24 + 1e-6 && b >= pia * 0.7 - 1.2 - 1e-6
      }),
    )
  })

  it('own benefit is monotone non-decreasing in PIA (more PIA never pays less)', () => {
    fc.assert(
      fc.property(piaArb, fc.integer({ min: 0, max: 50_000 }), claimArb, (pia, bump, claim) => {
        return adjustOwnBenefitAnnual(pia + bump, claim, BY) >= adjustOwnBenefitAnnual(pia, claim, BY)
      }),
    )
  })

  it('Method C never under-pays vs own, excess ≥ 0, and the higher earner has no spousal excess', () => {
    fc.assert(
      fc.property(piaArb, claimArb, piaArb, claimArb, (p0, c0, p1, c1) => {
        const out = householdBenefits([
          { piaAnnual: p0, claimAge: c0, birthYear: BY },
          { piaAnnual: p1, claimAge: c1, birthYear: BY },
        ])
        const shapeOk = out.every(
          (b) => Number.isFinite(b.ownAnnual) && Number.isFinite(b.spousalExcessAnnual) && b.spousalExcessAnnual >= 0 && b.ownAnnual >= 0,
        )
        const hiIdx = p1 > p0 ? 1 : 0 // householdBenefits resolves a PIA tie to the first
        return shapeOk && out[hiIdx]!.spousalExcessAnnual === 0
      }),
    )
  })

  it('the lower earner with own PIA < 50% of the higher PIA always receives a positive spousal excess (the floor the model exists to credit)', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 40_000 }), fc.integer({ min: 100_000, max: 200_000 }), claimArb, (lowPia, highPia, claim) => {
        const [low] = householdBenefits([
          { piaAnnual: lowPia, claimAge: claim, birthYear: BY },
          { piaAnnual: highPia, claimAge: 67, birthYear: BY },
        ])
        // lowPia < 0.5×highPia by construction (≤40k vs ≥100k), so an excess is owed.
        return low!.spousalExcessAnnual > 0
      }),
    )
  })
})
