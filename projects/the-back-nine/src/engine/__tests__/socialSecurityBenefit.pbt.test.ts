import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import { adjustOwnBenefitAnnual, householdBenefits, survivorBenefitAnnual } from '../socialSecurityBenefit'

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

// POMS RS 00615.322 D, step 5, TRANSCRIBED: each low → mid → high ordering of the three amounts, and the one
// the worksheet's chart underlines as payable. It is a LOOKUP, never a min/max, so the composition under test
// cannot certify itself (DND 012). `wib` = the widow(er)'s benefit reduced for age, `pct` = 82.5% of the death
// PIA, `rib` = the deceased's reduced RIB as if alive.
type Amount = 'wib' | 'pct' | 'rib'
const RS_00615_322_D_CHART: Readonly<Record<string, Amount>> = {
  'wib<pct<rib': 'wib', // Sequence 1
  'wib<rib<pct': 'wib', // Sequence 2
  'pct<wib<rib': 'wib', // Sequence 3
  'pct<rib<wib': 'rib', // Sequence 4
  'rib<wib<pct': 'wib', // Sequence 5
  'rib<pct<wib': 'pct', // Sequence 6
}

describe('SS survivor §202 — RIB-LIM against the RS 00615.322 D worksheet (fast-check)', () => {
  it('a deceased who claimed early: every survivor start age pays the amount the worksheet chart underlines', () => {
    // WHAT THIS PINS: the COMPOSITION — given the three amounts, which one the law pays. It does not pin how each
    // amount is figured: the reduced WIB below comes from the function's own at-FRA branch, so it shares the age
    // reduction by construction (the hand goldens in socialSecurityBenefit.test.ts pin that, the graduated spans
    // included), and the RIB comes from the own-benefit path (its own goldens). Every amount is read off the PIA
    // floored to the dime (§215(a)), so a cap taken off the raw PIA — a dime high on a PIA with odd cents, the
    // rosy direction — reds here: `piaArb` draws whole ANNUAL dollars, so most monthly PIAs carry odd cents.
    // Whole-year FRAs for the deceased (1950 → 66, 1969 → 67) so "claimed at FRA" is expressible; the survivor's
    // cohorts include the graduated survivor-FRA bands (1958 → 66y4m, 1960 → 66y8m).
    const deceasedArb = fc.constantFrom({ birthYear: 1950, fraYears: 66 }, { birthYear: 1969, fraYears: 67 })
    const rowsReached = new Set<string>()
    fc.assert(
      fc.property(
        piaArb,
        deceasedArb,
        fc.integer({ min: 62, max: 66 }),
        fc.constantFrom(1950, 1956, 1958, 1960, 1969),
        fc.integer({ min: 60, max: 70 }),
        (pia, d, claimRaw, survivorBirthYear, start) => {
          const claimAge = Math.min(claimRaw, d.fraYears - 1) // strictly before FRA: a reduced RIB
          // The law's PIA: the typed one floored to a whole number of dimes a month (§215(a)), in integer cents.
          const piaDimeCents = Math.floor(Math.round(pia * 100) / 120) * 120
          const piaDime = piaDimeCents / 100
          // The three amounts (see WHAT THIS PINS above):
          //  wib — RS 00615.322 B's reduced WIB: the same PIA on a deceased who claimed AT FRA (no RIB-LIM, no DRC);
          //  rib — the deceased's own reduced benefit, as if alive;
          //  pct — 82.5% of the death PIA, dime-floored monthly (RS 00615.320 C: $374.90 → $309.29 → $309.20).
          const wib = survivorBenefitAnnual({ piaAnnual: piaDime, claimAge: d.fraYears, birthYear: d.birthYear }, survivorBirthYear, start)
          const rib = adjustOwnBenefitAnnual(piaDime, claimAge, d.birthYear)
          const pct = (Math.floor((piaDimeCents * 825) / (1000 * 12 * 10)) * 10 * 12) / 100
          const amounts: Record<Amount, number> = { wib, pct, rib }
          // Ties: the payable VALUE is the same whichever tied amount sorts first (every chart row agrees), so a
          // fixed tie-break order keeps the key deterministic without changing the expectation.
          const order = (['wib', 'pct', 'rib'] as const).slice().sort((a, b) => amounts[a] - amounts[b])
          const key = order.join('<')
          // A row counts as reached only on STRICTLY ordered amounts — a tie (a $0 PIA ties all three) sorts into
          // some key by the tie-break alone and exercises no row's distinction.
          if (amounts[order[0]!] < amounts[order[1]!] && amounts[order[1]!] < amounts[order[2]!]) rowsReached.add(key)
          const payable = RS_00615_322_D_CHART[key]!
          // The household's TYPED PIA goes in; the law's dime PIA built the expectation.
          const got = survivorBenefitAnnual({ piaAnnual: pia, claimAge, birthYear: d.birthYear }, survivorBirthYear, start)
          return Math.round(got * 100) === Math.round(amounts[payable] * 100)
        },
      ),
      { numRuns: 3000 },
    )
    // Non-vacuity: the domain reaches every row of the chart on strictly ordered amounts (a narrowed domain must not
    // certify fewer rows silently).
    expect([...rowsReached].sort(), 'every RS 00615.322 D chart row was exercised').toEqual(Object.keys(RS_00615_322_D_CHART).sort())
  })
})
