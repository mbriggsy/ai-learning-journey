import { describe, it, expect } from 'vitest'
import {
  runTaxAwareDecumulation,
  ordinaryIncomeTax,
  ordinaryPlusCapitalGainsTax,
  capitalGainsTax,
  taxableSocialSecurity,
  type TaxOverlayConfig,
  type Household,
  type HouseholdYear,
  type TaxYearInputs,
} from '@engine/taxOverlay'
import { runDecumulation, type PortfolioState } from '@engine/decumulation'
import { DRAWDOWN_POLICIES, NEVER_DEPLETED } from '@shared/model'
import { totalAcrossBuckets, type AccountBuckets } from '@engine/sequencing'
import { uniformLifetimeTableDivisors, capitalGainsBreakpoints, irmaa, partB2026 } from '@engine/constants'
import { fplForHousehold } from '@engine/healthOverlay'

// ---------------------------------------------------------------------------
// Deterministic fixtures (no RNG — the seam is a pure transform). Mixed-sign real
// returns so rebalancing + the per-year order actually matter; a flat withdrawal.
// ---------------------------------------------------------------------------
const H = 30
const STOCK_W = 0.6
const realStock = Array.from({ length: H }, (_, t) => 0.07 + 0.18 * Math.sin(t * 1.3))
const realBond = Array.from({ length: H }, (_, t) => 0.025 + 0.06 * Math.cos(t * 0.7))

const OFF: TaxOverlayConfig = { taxEnabled: false, rmdEnabled: false }

/** A minimal MFJ household for the RMD/tax configs (filing fixed MFJ until the M6 switch). */
const mkHousehold = (startCalendarYear: number, owner: number, spouse?: number): Household => ({
  startCalendarYear,
  filing: 'mfj',
  owner: { birthYear: owner },
  ...(spouse !== undefined ? { spouse: { birthYear: spouse } } : {}),
})

/** The spine's decumulation, initialised EXACTLY as simulate.ts does (stock = w·P,
 *  bond = (1−w)·P) so byte-identity is a fair comparison. */
function spine(portfolio: number, withdrawals: readonly number[]) {
  const initial: PortfolioState = { stock: STOCK_W * portfolio, bond: (1 - STOCK_W) * portfolio }
  return runDecumulation(initial, realStock, realBond, withdrawals, STOCK_W)
}

const flat = (amount: number) => Array.from({ length: H }, () => amount)

/** The PUBLISHED Uniform Lifetime divisor for an age, read from the canonical constant —
 *  the external oracle for the RMD-magnitude fixtures, never recomputed from the engine. */
function ultDivisor(age: number): number {
  const row = uniformLifetimeTableDivisors.value.find((r) => r.age === age)
  if (row === undefined) throw new Error(`no Uniform Lifetime row for age ${age}`)
  return row.divisor
}

describe('taxOverlay — M1 seam + reduce-to-spine invariant', () => {
  describe('reduce-to-spine: a collapsed single pool with the overlay OFF is BYTE-IDENTICAL to the spine', () => {
    // Two scenarios: one survives the horizon, one depletes mid-horizon (exercises both
    // the terminal-value and the depletion-year code paths).
    const scenarios = [
      { name: 'survives', portfolio: 1_000_000, withdrawals: flat(40_000) },
      { name: 'depletes', portfolio: 150_000, withdrawals: flat(40_000) },
    ]
    // "Collapsed to one pool" = a single non-empty bucket. Test each bucket position.
    const singlePools: Array<[string, (p: number) => AccountBuckets]> = [
      ['pretax-only', (p) => ({ taxable: 0, pretax: p, roth: 0 })],
      ['taxable-only', (p) => ({ taxable: p, pretax: 0, roth: 0 })],
      ['roth-only', (p) => ({ taxable: 0, pretax: 0, roth: p })],
    ]

    for (const s of scenarios) {
      const expected = spine(s.portfolio, s.withdrawals)
      for (const [poolName, mk] of singlePools) {
        for (const policy of DRAWDOWN_POLICIES) {
          it(`${s.name} · ${poolName} · ${policy} → identical terminal + depletion year`, () => {
            const got = runTaxAwareDecumulation(
              mk(s.portfolio),
              realStock,
              realBond,
              s.withdrawals,
              STOCK_W,
              policy,
              OFF,
            )
            // Byte-identical (exact equality, not approximate): the total trajectory runs
            // through the SAME stepYear the spine uses.
            expect(got.terminalReal).toBe(expected.terminalReal)
            expect(got.depletionYear).toBe(expected.depletionYear)
          })
        }
      }
    }

    it('presence companion (burned/027): the survive scenario actually ran the horizon and did not deplete', () => {
      const expected = spine(1_000_000, flat(40_000))
      expect(expected.depletionYear).toBe(NEVER_DEPLETED)
      expect(expected.terminalReal).toBeGreaterThan(0)
      // and the depleting scenario genuinely depletes within the horizon (so the
      // depletion-year branch above is not asserted vacuously)
      const dep = spine(150_000, flat(40_000))
      expect(dep.depletionYear).toBeGreaterThanOrEqual(0)
      expect(dep.depletionYear).toBeLessThan(H)
    })
  })

  describe('the drawdown policy is total-neutral when tax is OFF (the CRN-neutral analogue)', () => {
    // A genuinely multi-bucket state: the policy changes WHICH bucket funds each year,
    // never the total trajectory (the total goes through the shared stepYear on the same
    // grossWithdrawal). So every policy reproduces the spine's total to the bit.
    const P = 1_000_000
    const buckets: AccountBuckets = { taxable: 300_000, pretax: 500_000, roth: 200_000 }
    const withdrawals = flat(45_000)
    const expected = spine(P, withdrawals)

    for (const policy of DRAWDOWN_POLICIES) {
      it(`${policy}: multi-bucket total trajectory === the spine, bit-for-bit`, () => {
        const got = runTaxAwareDecumulation(buckets, realStock, realBond, withdrawals, STOCK_W, policy, OFF)
        expect(got.terminalReal).toBe(expected.terminalReal)
        expect(got.depletionYear).toBe(expected.depletionYear)
        // the ledger reconciles to the authoritative total (auxiliary, so relative-close)
        const sum = got.finalBuckets.taxable + got.finalBuckets.pretax + got.finalBuckets.roth
        expect(Math.abs(sum / got.terminalReal - 1)).toBeLessThan(1e-9)
      })
    }

    it('presence companion: the policy actually moved the ledger (taxable-first ≠ pre-tax-first final buckets)', () => {
      const taxableFirst = runTaxAwareDecumulation(buckets, realStock, realBond, withdrawals, STOCK_W, 'taxable-first', OFF)
      const preTaxFirst = runTaxAwareDecumulation(buckets, realStock, realBond, withdrawals, STOCK_W, 'pre-tax-first', OFF)
      // identical TOTAL...
      expect(taxableFirst.terminalReal).toBe(preTaxFirst.terminalReal)
      // ...but a DIFFERENT bucket composition (taxable-first drains taxable, leaving more pretax)
      expect(preTaxFirst.finalBuckets.pretax).toBeLessThan(taxableFirst.finalBuckets.pretax)
      expect(preTaxFirst.finalBuckets.taxable).toBeGreaterThan(taxableFirst.finalBuckets.taxable)
    })
  })
})

describe('taxOverlay — M2 RMD forced distribution', () => {
  // A single pre-tax pool, no spending, ONE year: the cleanest probe for "did the RMD fire,
  // and by how much". With no RMD the taxable bucket stays exactly 0; an active RMD relocates
  // a 1/divisor fraction of the prior-year-end pre-tax balance into taxable. (The returns
  // arrays are length H; passing a length-1 withdrawals array runs a single year.)
  const PRETAX = 500_000
  const pretaxOnly = (p: number): AccountBuckets => ({ taxable: 0, pretax: p, roth: 0 })
  const noSpend = [0]

  function oneYear(birthYear: number, startCalendarYear: number): ReturnType<typeof runTaxAwareDecumulation> {
    const config: TaxOverlayConfig = { taxEnabled: false, rmdEnabled: true, household: mkHousehold(startCalendarYear, birthYear) }
    return runTaxAwareDecumulation(pretaxOnly(PRETAX), realStock, realBond, noSpend, STOCK_W, 'proportional', config)
  }

  describe('RMD start age is birth-year-derived (SECURE 2.0 bands 72/73/75), never a flat 73', () => {
    it('born ≤1950 → band 72: no RMD at age 71, fires at age 72 (pins the first band row)', () => {
      expect(oneYear(1948, 1948 + 71).finalBuckets.taxable).toBe(0) // age 71 < band 72
      expect(oneYear(1948, 1948 + 72).finalBuckets.taxable).toBeGreaterThan(0) // age 72
    })

    it('born 1955 → band 73: no RMD at age 72, fires at age 73', () => {
      expect(oneYear(1955, 1955 + 72).finalBuckets.taxable).toBe(0) // age 72 < band 73
      expect(oneYear(1955, 1955 + 73).finalBuckets.taxable).toBeGreaterThan(0) // age 73
    })

    it('the 1959/1960 boundary: born 1959 uses band 73; born 1960 jumps to band 75 (the wider conversion window)', () => {
      expect(oneYear(1959, 1959 + 73).finalBuckets.taxable).toBeGreaterThan(0) // born 1959, age 73 → fires
      expect(oneYear(1960, 1960 + 73).finalBuckets.taxable).toBe(0) // born 1960, age 73 < 75 → silent
      expect(oneYear(1960, 1960 + 74).finalBuckets.taxable).toBe(0) // age 74 < 75 → still silent
      expect(oneYear(1960, 1960 + 75).finalBuckets.taxable).toBeGreaterThan(0) // age 75 → fires
    })
  })

  describe('the forced-distribution magnitude = prior-year-end pre-tax ÷ the published ULT divisor (DND/012)', () => {
    // Externally-derived: the relocated fraction is exactly 1/divisor(age), the divisor being
    // the PUBLISHED Pub 590-B value — never recomputed from the engine's own RMD formula. With
    // no spending and one growth step the shared scale cancels, so taxable/total === 1/divisor.
    it('age 73 relocates 1/26.5 of pre-tax into taxable', () => {
      const got = oneYear(1955, 1955 + 73)
      expect(got.finalBuckets.taxable / got.terminalReal).toBeCloseTo(1 / ultDivisor(73), 12)
    })

    it('age 75 relocates 1/24.6 of pre-tax into taxable (the born-1960+ cohort)', () => {
      const got = oneYear(1960, 1960 + 75)
      expect(got.finalBuckets.taxable / got.terminalReal).toBeCloseTo(1 / ultDivisor(75), 12)
    })

    it('age ≥ 120 clamps to the published "120 and over" divisor (never extrapolated)', () => {
      // born 1900, startCalendarYear 2025 → age 125 → clamps to the age-120 terminal bucket.
      const got = oneYear(1900, 2025)
      expect(got.finalBuckets.taxable / got.terminalReal).toBeCloseTo(1 / ultDivisor(120), 12)
    })

    it('the basis is the GROWN prior-year-end pre-tax — a 2-year recurrence the single-year fixtures cannot pin', () => {
      // born 1955, ages 73 then 74, no spend. The shared growth factor cancels across both
      // years, so the end ratio is externally derivable from the PUBLISHED divisors ALONE:
      //   taxable/total = 1/d(73) + (1 − 1/d(73))/d(74).
      // This closed form depends on the GROWN year-0-end pre-tax being year-1's basis, so it
      // FAILS under a fixed-initial-balance basis OR a current-pre-growth basis — the exact
      // wrong-basis bugs the single-year (t=0) magnitude fixtures cannot distinguish.
      const config: TaxOverlayConfig = { taxEnabled: false, rmdEnabled: true, household: mkHousehold(1955 + 73, 1955) }
      const got = runTaxAwareDecumulation(pretaxOnly(PRETAX), realStock, realBond, [0, 0], STOCK_W, 'proportional', config)
      const d73 = ultDivisor(73)
      const d74 = ultDivisor(74)
      const expected = 1 / d73 + (1 - 1 / d73) / d74
      expect(got.finalBuckets.taxable / got.terminalReal).toBeCloseTo(expected, 12)
    })
  })

  describe('an active RMD with tax OFF is TOTAL-NEUTRAL (the corrected plan-line-186 claim)', () => {
    // A pre-tax pool, owner well past RMD age (78 → 107 over the horizon), RMD ON, tax OFF.
    // pre-tax-first spending always drains pre-tax (never the relocated taxable), so the
    // relocation is visible at the ledger and not silently undone.
    const P = 1_000_000
    const withdrawals = flat(40_000)
    // age 78 at t=0; RMD (~1M/22 ≈ 45.5k) exceeds the 40k spend, so the excess force-relocates.
    const RMD_ON: TaxOverlayConfig = { taxEnabled: false, rmdEnabled: true, household: mkHousehold(2026, 1948) }
    const run = (config: TaxOverlayConfig) =>
      runTaxAwareDecumulation(pretaxOnly(P), realStock, realBond, withdrawals, STOCK_W, 'pre-tax-first', config)

    it('the TOTAL trajectory stays byte-identical to the spine — the RMD relocates, it never moves the total', () => {
      const expected = spine(P, withdrawals)
      const rmdOn = run(RMD_ON)
      expect(rmdOn.terminalReal).toBe(expected.terminalReal)
      expect(rmdOn.depletionYear).toBe(expected.depletionYear)
    })

    it('presence companion (burned/027): the RMD genuinely relocated pre-tax→taxable at the ledger', () => {
      const rmdOn = run(RMD_ON)
      const rmdOff = run(OFF)
      // identical total (relocation is total-neutral with tax off)...
      expect(rmdOn.terminalReal).toBe(rmdOff.terminalReal)
      // ...but the RMD moved money out of pre-tax into taxable, which the OFF run never does.
      expect(rmdOff.finalBuckets.taxable).toBe(0)
      expect(rmdOn.finalBuckets.taxable).toBeGreaterThan(0)
      expect(rmdOn.finalBuckets.pretax).toBeLessThan(rmdOff.finalBuckets.pretax)
    })

    it('non-binding RMD through DEPLETION: spending exceeds the RMD, the pool depletes, the path still reduces to the spine', () => {
      // A small pre-tax pool: RMD (150k/22 ≈ 6.8k) is far under the 40k spend, so spending already
      // satisfies the forced distribution — nothing extra relocates (taxable stays 0). The pool
      // depletes mid-horizon; an active (if non-binding) RMD must not perturb that depletion, and
      // the depletion branch must zero the ledger. (A BINDING RMD cannot co-occur with depletion —
      // it keeps money IN the portfolio, easing depletion — so non-binding is the reachable case.)
      const dep = runTaxAwareDecumulation(pretaxOnly(150_000), realStock, realBond, withdrawals, STOCK_W, 'pre-tax-first', RMD_ON)
      const spineDep = spine(150_000, withdrawals)
      expect(dep.finalBuckets.taxable).toBe(0)
      // genuinely depletes within the horizon (non-vacuous)...
      expect(dep.depletionYear).toBeGreaterThanOrEqual(0)
      expect(dep.depletionYear).toBeLessThan(H)
      // ...byte-identical to the spine, with the ledger zeroed on depletion.
      expect(dep.terminalReal).toBe(spineDep.terminalReal)
      expect(dep.depletionYear).toBe(spineDep.depletionYear)
      expect(dep.finalBuckets.pretax).toBe(0)
      expect(dep.finalBuckets.roth).toBe(0)
    })

    it('proportional policy · multi-bucket · binding RMD: the total + roth are isolated, only pre-tax↔taxable move', () => {
      // {taxable, pretax, roth} summing to 1M, a real 30k proportional spend, owner age 78 → RMD
      // 800k/22 ≈ 36.4k > the 24k proportional pre-tax draw, so the excess force-relocates. This
      // exercises the proportional alloc.pretax fraction AND a co-resident roth bucket (which M3's
      // ordinary-income tax will read) — neither touched by the pre-tax-only fixtures above.
      const multi: AccountBuckets = { taxable: 100_000, pretax: 800_000, roth: 100_000 }
      const oneSpend = [30_000]
      const on = runTaxAwareDecumulation(multi, realStock, realBond, oneSpend, STOCK_W, 'proportional', RMD_ON)
      const off = runTaxAwareDecumulation(multi, realStock, realBond, oneSpend, STOCK_W, 'proportional', OFF)
      // total byte-identical to the spine (the relocation is intra-portfolio)...
      expect(on.terminalReal).toBe(spine(1_000_000, oneSpend).terminalReal)
      expect(on.terminalReal).toBe(off.terminalReal)
      // ...roth byte-identical to OFF (the RMD touches only pre-tax↔taxable, never roth)...
      expect(on.finalBuckets.roth).toBe(off.finalBuckets.roth)
      // ...and the forced excess relocated pre-tax → taxable.
      expect(on.finalBuckets.taxable).toBeGreaterThan(off.finalBuckets.taxable)
      expect(on.finalBuckets.pretax).toBeLessThan(off.finalBuckets.pretax)
    })
  })

  describe('the RMD divisor switches to Joint Life & Last Survivor for a >10yr-younger sole spouse (M6b)', () => {
    it('a >10yr-younger sole spouse uses the Joint-Life divisor — a LARGER divisor → a SMALLER forced RMD than ULT', () => {
      // owner 78 (born 1948), spouse 64 (born 1962): a 14yr gap (≥ 11) → Table II applies. The
      // published Joint Life & Last Survivor divisor for (78, 64) is 24.8 (vs Uniform Lifetime
      // age-78 = 22.0) — the larger divisor forces a SMALLER distribution. Tax OFF, RMD ON,
      // pre-tax only, no spend, ONE year → the relocated taxable fraction is exactly 1/divisor
      // (the relocation is total-neutral with tax off, contract #2 — the growth cancels).
      const withSpouse = runTaxAwareDecumulation(pretaxOnly(PRETAX), realStock, realBond, [0], STOCK_W, 'proportional', {
        taxEnabled: false,
        rmdEnabled: true,
        household: mkHousehold(2026, 1948, 1962),
      })
      const noSpouse = runTaxAwareDecumulation(pretaxOnly(PRETAX), realStock, realBond, [0], STOCK_W, 'proportional', {
        taxEnabled: false,
        rmdEnabled: true,
        household: mkHousehold(2026, 1948), // single owner → Uniform Lifetime age-78
      })
      // The relocated fraction is the published Joint-Life divisor for (78, 64), NOT ULT(78).
      expect(withSpouse.finalBuckets.taxable / withSpouse.terminalReal).toBeCloseTo(1 / 24.8, 12)
      // ...and it forces STRICTLY LESS than the no-spouse ULT(78) run (the age-gap relief).
      expect(withSpouse.finalBuckets.taxable).toBeLessThan(noSpouse.finalBuckets.taxable)
      expect(noSpouse.finalBuckets.taxable / noSpouse.terminalReal).toBeCloseTo(1 / ultDivisor(78), 12)
      // tax OFF ⇒ the relocation is total-neutral: the TOTAL stays byte-identical to the spine.
      expect(withSpouse.terminalReal).toBe(spine(PRETAX, [0]).terminalReal)
    })

    it('exactly-10-younger stays on the Uniform Lifetime Table (the gap-11 threshold, not gap-10)', () => {
      // owner 78 (born 1948), spouse 68 (born 1958): gap EXACTLY 10 → ULT (Table III already bakes
      // in a hypothetical 10-yr-younger beneficiary). Byte-identical to the single-owner ULT run.
      const gap10 = runTaxAwareDecumulation(pretaxOnly(PRETAX), realStock, realBond, [0], STOCK_W, 'proportional', {
        taxEnabled: false,
        rmdEnabled: true,
        household: mkHousehold(2026, 1948, 1958),
      })
      const noSpouse = runTaxAwareDecumulation(pretaxOnly(PRETAX), realStock, realBond, [0], STOCK_W, 'proportional', {
        taxEnabled: false,
        rmdEnabled: true,
        household: mkHousehold(2026, 1948),
      })
      expect(gap10.finalBuckets.taxable).toBe(noSpouse.finalBuckets.taxable)
      expect(gap10.finalBuckets.taxable / gap10.terminalReal).toBeCloseTo(1 / ultDivisor(78), 12)
    })
  })
})

describe('taxOverlay — M3 ordinary-income tax', () => {
  describe('ordinaryIncomeTax matches independently hand-derived 2026 fixtures (DND/012)', () => {
    // Each fixture was cross-checked by THREE independent computers + a separate hand-calc,
    // none of which saw the engine. The deduction stack = standard + age-65 addition × (65+
    // filers) + the OBBBA senior bonus (with its MAGI phase-out); the 2026 MFJ/single brackets
    // are read from the constants module. Asserted to the cent (toBeCloseTo 6 ≈ float dust only).
    it('MFJ, both 67, $150k ordinary income (senior bonus FULL) → $11,974', () => {
      // deduction 47,500 → taxable 102,500 → 2,480 + 9,120 + 374
      expect(ordinaryIncomeTax(150_000, 'mfj', 2)).toBeCloseTo(11_974, 6)
    })
    it('MFJ, both 67, $250k ordinary income (senior bonus PHASING OUT) → $35,294', () => {
      // bonus 12,000 − 0.06×(250k−150k) = 6,000 → deduction 41,500 → taxable 208,500
      expect(ordinaryIncomeTax(250_000, 'mfj', 2)).toBeCloseTo(35_294, 6)
    })
    it('single survivor, 67, $80k ordinary income → $7,065 (the half-width brackets + smaller stack)', () => {
      // bonus 6,000 − 0.06×(80k−75k) = 5,700 → deduction 23,850 → taxable 56,150
      expect(ordinaryIncomeTax(80_000, 'single', 1)).toBeCloseTo(7_065, 6)
    })
    it('income at or below the deduction stack owes nothing (no negative tax, no spurious floor)', () => {
      expect(ordinaryIncomeTax(0, 'mfj', 2)).toBe(0)
      expect(ordinaryIncomeTax(40_000, 'mfj', 2)).toBe(0) // 40k < the 47,500 deduction stack
    })

    it('taxable income exactly on a bracket edge + a dollar above the deduction (the break-condition boundary)', () => {
      // ordinary income 72,300 = deduction (47,500) + 24,800 → taxable EXACTLY 24,800, the 10/12
      // edge: the whole band is taxed at 10% and the 12% band must NOT open (break at `<= upTo`).
      expect(ordinaryIncomeTax(72_300, 'mfj', 2)).toBeCloseTo(2_480, 6)
      // a single dollar above the 47,500 deduction stack → exactly 10 cents (the first taxable $).
      expect(ordinaryIncomeTax(47_501, 'mfj', 2)).toBeCloseTo(0.1, 6)
    })
  })

  // owner + spouse both born 1959 → both 67 at startCalendarYear 2026: the full 65+ deduction
  // stack applies, but no RMD yet (band 73), isolating the ordinary tax from the RMD mechanic.
  const TAX_ON: TaxOverlayConfig = { taxEnabled: true, rmdEnabled: false, household: mkHousehold(2026, 1959, 1959) }
  const P = 1_000_000

  describe('Roth is never ordinary income; a taxable draw realizes only its GAIN (M5 evolves the M3 line)', () => {
    const oneSpend = [60_000]
    it('a Roth-only pool incurs no ordinary tax even with tax ON → byte-identical to the spine', () => {
      const got = runTaxAwareDecumulation({ taxable: 0, pretax: 0, roth: P }, realStock, realBond, oneSpend, STOCK_W, 'pre-tax-first', TAX_ON)
      const sp = spine(P, oneSpend)
      expect(got.terminalReal).toBe(sp.terminalReal)
      expect(got.depletionYear).toBe(sp.depletionYear)
    })
    it('an ALL-BASIS taxable pool realizes no gain (basis = value) → still byte-identical to the spine even with tax ON', () => {
      // M3 took "taxable draw = no tax" on faith; M5 makes it conditional on the embedded gain.
      // A freshly-deposited pool (basis = value) has zero gain, so a taxable draw is pure return
      // of basis → no cap-gains tax → byte-identical. (The gain-bearing case ends BELOW the spine —
      // tested in the M5 block.) initialTaxableBasis is required here (tax ON + taxable > 0).
      const got = runTaxAwareDecumulation({ taxable: P, pretax: 0, roth: 0 }, realStock, realBond, oneSpend, STOCK_W, 'taxable-first', TAX_ON, { initialTaxableBasis: P })
      const sp = spine(P, oneSpend)
      expect(got.terminalReal).toBe(sp.terminalReal)
      expect(got.depletionYear).toBe(sp.depletionYear)
    })
  })

  describe('tax ON makes the portfolio end BELOW the spine — the inverse of M2 total-neutrality', () => {
    const oneSpend = [60_000]
    it('presence companion (burned/027): a pre-tax pool taxed ON ends strictly below the tax-OFF run', () => {
      const buckets: AccountBuckets = { taxable: 0, pretax: P, roth: 0 }
      const on = runTaxAwareDecumulation(buckets, realStock, realBond, oneSpend, STOCK_W, 'pre-tax-first', TAX_ON)
      const off = runTaxAwareDecumulation(buckets, realStock, realBond, oneSpend, STOCK_W, 'pre-tax-first', OFF)
      expect(on.terminalReal).toBeLessThan(off.terminalReal) // the tax dollars left to the IRS
      expect(off.terminalReal).toBe(spine(P, oneSpend).terminalReal) // OFF still reduces to the spine
    })
  })

  describe('the gross-up fixed point nets exactly `spending` after the tax it triggers', () => {
    it('the engine drives gross = net + ordinaryIncomeTax(gross) to self-consistency (independently re-solved)', () => {
      const net = 100_000
      const buckets: AccountBuckets = { taxable: 0, pretax: P, roth: 0 }
      const on = runTaxAwareDecumulation(buckets, realStock, realBond, [net], STOCK_W, 'pre-tax-first', TAX_ON)
      const sp = spine(P, [net])
      // Independently re-solve the fixed point with the (golden-tested) pure tax fn. On a
      // pre-tax-only pool drawn pre-tax-first, ordinary income == the gross withdrawal.
      let gross = net
      for (let i = 0; i < 100; i++) gross = net + ordinaryIncomeTax(gross, 'mfj', 2)
      // Both runs grow by the SAME shared factor, so the terminal RATIO cancels growth and the
      // engine must have withdrawn exactly `gross` (vs the spine's `net`): a real gross-up.
      expect(gross).toBeGreaterThan(net) // sanity: tax was actually owed
      expect(on.terminalReal / sp.terminalReal).toBeCloseTo((P - gross) / (P - net), 8)
    })
  })

  describe('an active RMD now BITES: M2 was total-neutral with tax off, M3 taxes the forced income', () => {
    it('tax ON + an active RMD ends below the spine — the forced distribution itself creates the taxable income', () => {
      // owner 78 (born 1948), spouse 76 (born 1950): the full 65+ deduction stack ($47,500).
      // A $1.5M pre-tax pool forces an RMD of ~$68,182 (1.5M ÷ 22) — ABOVE both the $40k spend
      // AND the deduction, so the tax is driven by the FORCED RMD income, not the spending
      // ($40k alone is below the deduction → would owe nothing). This is the RMD biting.
      const pool = 1_500_000
      const cfg: TaxOverlayConfig = { taxEnabled: true, rmdEnabled: true, household: mkHousehold(2026, 1948, 1950) }
      const cfgRmdOnlyTaxOff: TaxOverlayConfig = { taxEnabled: false, rmdEnabled: true, household: mkHousehold(2026, 1948, 1950) }
      const buckets: AccountBuckets = { taxable: 0, pretax: pool, roth: 0 }
      const oneSpend = [40_000]
      const taxed = runTaxAwareDecumulation(buckets, realStock, realBond, oneSpend, STOCK_W, 'pre-tax-first', cfg)
      const rmdOnlyTaxOff = runTaxAwareDecumulation(buckets, realStock, realBond, oneSpend, STOCK_W, 'pre-tax-first', cfgRmdOnlyTaxOff)
      const sp = spine(pool, oneSpend)
      // M2: the RMD alone (tax off) was total-neutral === the spine...
      expect(rmdOnlyTaxOff.terminalReal).toBe(sp.terminalReal)
      // ...M3: taxing that forced ordinary income drains real cash → strictly below the spine.
      expect(taxed.terminalReal).toBeLessThan(sp.terminalReal)
      // magnitude (not just direction): the RMD (1.5M ÷ 22) exceeds the spending draw, so it IS the
      // ordinary income and the year-0 tax is fixed — independently pin the gross + the terminal ratio.
      const rmd0 = pool / ultDivisor(78)
      const expectedGross = 40_000 + ordinaryIncomeTax(rmd0, 'mfj', 2)
      expect(taxed.terminalReal / sp.terminalReal).toBeCloseTo((pool - expectedGross) / (pool - 40_000), 8)
    })
  })

  describe('the gross-up under realistic coupling (adversarial hardening)', () => {
    // Independently re-solve the per-year fixed point with the golden-tested pure tax fn, then assert
    // the engine withdrew exactly that gross via the growth-cancelling terminal ratio. `pretaxFrac` is
    // the share of the gross that is pre-tax (hence ordinary income): 1 for a pre-tax-only pool drawn
    // pre-tax-first, pretax/total for a proportional draw.
    const solveGross = (net: number, pretaxFrac: number, filing: 'mfj' | 'single', count65: number) => {
      let gross = net
      for (let i = 0; i < 200; i++) gross = net + ordinaryIncomeTax(gross * pretaxFrac, filing, count65)
      return gross
    }

    it('multi-bucket · proportional · tax ON — ordinary income is a strict FRACTION of the gross', () => {
      // {taxable, pretax, roth} all non-empty: under proportional, alloc.pretax = gross × (pretax/total),
      // so the taxed ordinary income is a fraction of the withdrawal and the gross-up spills tax-free
      // into the taxable + roth co-residents. This is the realistic regime solveGrossWithdrawal exists
      // for — the single-bucket tax-ON tests only ever drive ordinary income ∈ {0, gross}.
      const buckets: AccountBuckets = { taxable: 250_000, pretax: 500_000, roth: 250_000 }
      const total = 1_000_000
      const net = 200_000
      // All-basis taxable (basis = value) so the proportional taxable draw realizes ZERO gain —
      // isolating the "ordinary income is a fraction of the gross" property from M5's cap-gains
      // (which gets its own multi-bucket test in the M5 block).
      const on = runTaxAwareDecumulation(buckets, realStock, realBond, [net], STOCK_W, 'proportional', TAX_ON, { initialTaxableBasis: 250_000 })
      const sp = spine(total, [net])
      const gross = solveGross(net, 500_000 / total, 'mfj', 2) // ordinary income = gross × pretax share
      expect(gross).toBeGreaterThan(net) // tax was owed on the pre-tax fraction
      expect(on.terminalReal / sp.terminalReal).toBeCloseTo((total - gross) / (total - net), 8)
    })

    it('the senior-bonus phase-out is driven THROUGH the gross-up loop (the inflated-marginal regime)', () => {
      // a large net pushes the grossed-up MAGI into the MFJ 150k–350k phase-out band, where each extra
      // income dollar ALSO shrinks the bonus — the ×1.06 effective marginal rate the contraction rests
      // on. pre-tax-only, pre-tax-first → ordinary income == gross.
      const pool = 2_000_000
      const net = 160_000
      const on = runTaxAwareDecumulation({ taxable: 0, pretax: pool, roth: 0 }, realStock, realBond, [net], STOCK_W, 'pre-tax-first', TAX_ON)
      const sp = spine(pool, [net])
      const gross = solveGross(net, 1, 'mfj', 2)
      expect(gross).toBeGreaterThan(150_000) // genuinely in the phase-out band (else this proves nothing)
      expect(gross).toBeLessThan(350_000)
      expect(on.terminalReal / sp.terminalReal).toBeCloseTo((pool - gross) / (pool - net), 8)
    })

    it('tax ON depletes no LATER than the spine — the tax drains real cash faster', () => {
      // pre-tax pool, spend above the deduction so tax is owed; the pool depletes mid-horizon.
      const pool = 150_000
      const spend = flat(60_000)
      const on = runTaxAwareDecumulation({ taxable: 0, pretax: pool, roth: 0 }, realStock, realBond, spend, STOCK_W, 'pre-tax-first', TAX_ON)
      const sp = spine(pool, spend)
      // both genuinely deplete within the horizon (non-vacuous)...
      expect(sp.depletionYear).toBeGreaterThanOrEqual(0)
      expect(sp.depletionYear).toBeLessThan(H)
      expect(on.depletionYear).toBeGreaterThanOrEqual(0)
      expect(on.depletionYear).toBeLessThan(H)
      // ...tax drains faster, so it depletes no later, and the ledger zeroes on depletion.
      expect(on.depletionYear).toBeLessThanOrEqual(sp.depletionYear)
      expect(on.finalBuckets.pretax).toBe(0)
      expect(on.finalBuckets.taxable).toBe(0)
      expect(on.finalBuckets.roth).toBe(0)
    })

    it('a SINGLE-filer household grosses up through the single schedule + single phase-out', () => {
      // filing 'single', one 67-year-old (count65=1), no RMD. Exercises the single deduction stack, the
      // half-width single brackets, AND the single $75k phase-out — all end-to-end through the loop.
      const pool = 1_000_000
      const net = 80_000
      const single: TaxOverlayConfig = {
        taxEnabled: true,
        rmdEnabled: false,
        household: { startCalendarYear: 2026, filing: 'single', owner: { birthYear: 1959 } },
      }
      const on = runTaxAwareDecumulation({ taxable: 0, pretax: pool, roth: 0 }, realStock, realBond, [net], STOCK_W, 'pre-tax-first', single)
      const sp = spine(pool, [net])
      const gross = solveGross(net, 1, 'single', 1)
      expect(gross).toBeGreaterThan(net)
      expect(on.terminalReal / sp.terminalReal).toBeCloseTo((pool - gross) / (pool - net), 8)
    })
  })
})

describe('taxOverlay — M4 Social Security provisional-income fixed point', () => {
  // ===========================================================================
  // (T1) The pure taxableSocialSecurity helper — externally-derived fixtures (DND/012).
  // Provisional income = otherIncomeExclSS + 50% of the benefit (IRS Pub 915 Worksheet 1).
  // The frozen, un-indexed thresholds (MFJ 32k/44k, single 25k/34k) are read from the
  // constants module. Each expected number is hand-derived by an INDEPENDENT trace of the
  // published worksheet — never from the engine's own helper. The MFJ 85%-capped anchor
  // reproduces the filled-in IRS Pub 915 Worksheet 1 example (John & Mary) to the dollar.
  // SCOPE (M4): "other income" feeding provisional is the pre-tax distribution only; cap-
  // gains / taxable-basis / tax-exempt interest enter provisional in M5 (0 here).
  // ===========================================================================
  describe('taxableSocialSecurity matches independently hand-derived Pub 915 fixtures (DND/012)', () => {
    it('below the first threshold → none taxable (MFJ provisional 25k ≤ 32k)', () => {
      // SS 20k (½ = 10k) + other 15k → provisional 25k ≤ 32k → 0
      expect(taxableSocialSecurity(15_000, 20_000, 'mfj')).toBe(0)
    })

    it('exactly ON the first threshold owes nothing (the boundary is ≤, MFJ)', () => {
      // other 22k + ½ 10k = provisional EXACTLY 32k → 0 (proves the ≤ break, not <)
      expect(taxableSocialSecurity(22_000, 20_000, 'mfj')).toBe(0)
    })

    it('50% band, the 0.5×(excess) arm binds (MFJ): min(½SS, 50% of the excess over 32k)', () => {
      // SS 20k (½ = 10k) + other 30k → provisional 40k ∈ (32k, 44k]
      // min(10k, 0.5×(40k−32k = 8k) = 4k) = 4,000 (the excess arm binds, ½SS is the larger)
      expect(taxableSocialSecurity(30_000, 20_000, 'mfj')).toBeCloseTo(4_000, 6)
    })

    it('50% band, the ½SS arm binds (MFJ, small benefit): min(½SS, …) returns ½ the benefit', () => {
      // SS 8k (½ = 4k) + other 38k → provisional 42k ∈ (32k, 44k]
      // min(4k, 0.5×(42k−32k = 10k) = 5k) = 4,000 = ½SS (the ½SS arm binds — the OTHER 50%-band
      // sub-regime; a bug dropping `min(half, …)` here returns 5,000 and over-taxes the benefit).
      expect(taxableSocialSecurity(38_000, 8_000, 'mfj')).toBeCloseTo(4_000, 6)
    })

    it('85% band, the 50%-range capped at 0.5×(44k−32k) = 6k (MFJ, large benefit)', () => {
      // SS 30k (½ = 15k) + other 40k → provisional 55k > 44k
      // 50%-range = min(15k, 6k) = 6k; 0.85×(55k−44k = 11k) = 9,350; sum 15,350;
      // overall cap 0.85×30k = 25,500 → taxable 15,350 (interior; the 6k cap binds)
      expect(taxableSocialSecurity(40_000, 30_000, 'mfj')).toBeCloseTo(15_350, 6)
    })

    it('85% band, the 50%-range = ½SS when the benefit is small (MFJ)', () => {
      // SS 8k (½ = 4k) + other 42k → provisional 46k > 44k
      // 50%-range = min(4k, 6k) = 4k (½SS binds, NOT the 6k cap); 0.85×(46k−44k = 2k) = 1,700;
      // sum 5,700; overall cap 0.85×8k = 6,800 → taxable 5,700 (a DISTINCT regime from above)
      expect(taxableSocialSecurity(42_000, 8_000, 'mfj')).toBeCloseTo(5_700, 6)
    })

    it('85% OVERALL cap binds — reproduces the published IRS Pub 915 Worksheet 1 example (John & Mary, MFJ) → $34,000', () => {
      // Published example: SS 40k; pension+taxable interest 65k; tax-exempt interest 2k.
      // otherIncomeExclSS = 65k + 2k = 67k; provisional = 67k + 20k = 87k.
      // 50%-range min(20k, 6k) = 6k; 0.85×(87k−44k = 43k) = 36,550; sum 42,550;
      // overall cap 0.85×40k = 34,000 → taxable 34,000 (the cap binds; matches IRS line 19).
      expect(taxableSocialSecurity(67_000, 40_000, 'mfj')).toBeCloseTo(34_000, 6)
    })

    it('single thresholds (25k/34k) + the 0.5×(34k−25k) = 4.5k 50%-range cap', () => {
      // SS 24k (½ = 12k) + other 30k → provisional 42k > 34k (single)
      // 50%-range = min(12k, 4.5k) = 4,500; 0.85×(42k−34k = 8k) = 6,800; sum 11,300;
      // overall cap 0.85×24k = 20,400 → taxable 11,300 (exercises the single 4.5k cap)
      expect(taxableSocialSecurity(30_000, 24_000, 'single')).toBeCloseTo(11_300, 6)
    })

    it('a zero or negative benefit is never taxable (no spurious inclusion at high other-income)', () => {
      expect(taxableSocialSecurity(200_000, 0, 'mfj')).toBe(0)
      expect(taxableSocialSecurity(200_000, -5_000, 'mfj')).toBe(0)
    })
  })

  // ===========================================================================
  // Integration: SS folded INTO the gross-up fixed point. `ssBenefits` is a per-year
  // stream parallel to `netWithdrawals`; with tax OFF it is ignored, and an all-zero
  // stream reduces the overlay EXACTLY to M3. Local reference re-solves drive the fixed
  // point OUTSIDE the engine's stateful decumulation using the two GOLDEN pure fns
  // (taxableSocialSecurity validated by T1 above, ordinaryIncomeTax validated by M3), so
  // a WIRING bug — wrong provisional, taxable-SS not added to the ordinary base, gross
  // funded from the wrong bucket — makes the engine disagree with this reference. Same
  // structure as M3's `solveGross`; T1 is the independent MAGNITUDE proof.
  // ===========================================================================
  const bothBorn1959MFJ: TaxOverlayConfig = { taxEnabled: true, rmdEnabled: false, household: mkHousehold(2026, 1959, 1959) }
  const P = 1_000_000

  /** Re-solve the per-year gross with SS folded in, using ONLY the golden pure fns.
   *  `nonSSfromGross` maps a candidate gross to the ordinary income before SS (the pre-tax
   *  distribution = max(alloc.pretax, rmd)). The senior-bonus MAGI coupling is automatic:
   *  ordinaryIncomeTax reads (nonSS + taxableSS) as both the taxable base AND the MAGI. */
  const solveGrossWithSS = (
    net: number,
    nonSSfromGross: (g: number) => number,
    ss: number,
    filing: 'mfj' | 'single',
    count65: number,
  ): number => {
    let gross = net
    for (let i = 0; i < 300; i++) {
      const nonSS = nonSSfromGross(gross)
      gross = net + ordinaryIncomeTax(nonSS + taxableSocialSecurity(nonSS, ss, filing), filing, count65)
    }
    return gross
  }

  describe('reduce-to-M3: a zero SS stream (or none) is byte-identical to the no-SS gross-up', () => {
    it('ssBenefits all-zero === ssBenefits absent === the M3 fixed point', () => {
      const oneSpend = [60_000]
      const buckets: AccountBuckets = { taxable: 0, pretax: P, roth: 0 }
      const absent = runTaxAwareDecumulation(buckets, realStock, realBond, oneSpend, STOCK_W, 'pre-tax-first', bothBorn1959MFJ)
      const zeroStream = runTaxAwareDecumulation(buckets, realStock, realBond, oneSpend, STOCK_W, 'pre-tax-first', bothBorn1959MFJ, { ssBenefits: [0] })
      expect(zeroStream.terminalReal).toBe(absent.terminalReal)
      expect(zeroStream.depletionYear).toBe(absent.depletionYear)
    })
  })

  describe('reduce-to-spine: an SS stream with tax OFF is ignored (SS only matters once taxed)', () => {
    it('a positive SS stream + tax OFF → byte-identical to the spine (the OFF anchor is unperturbed)', () => {
      const oneSpend = [60_000]
      const buckets: AccountBuckets = { taxable: 0, pretax: P, roth: 0 }
      const got = runTaxAwareDecumulation(buckets, realStock, realBond, oneSpend, STOCK_W, 'pre-tax-first', OFF, { ssBenefits: flat(50_000) })
      const sp = spine(P, oneSpend)
      expect(got.terminalReal).toBe(sp.terminalReal)
      expect(got.depletionYear).toBe(sp.depletionYear)
    })
  })

  describe('SS adds taxable ordinary income → the portfolio ends BELOW the no-SS run (presence companion)', () => {
    it('pre-tax pool + RMD + a large SS benefit: including the SS drains extra cash, and the year-0 gross matches the re-solve', () => {
      // owner/spouse 78/76 (born 1948/1950): full 65+ deduction stack. A $1.5M pre-tax pool
      // forces RMD ≈ 68,182 (= 1.5M ÷ 22, > the $40k spend AND the deduction). A $60k SS
      // benefit drives provisional deep past 44k, so up to 85% of SS joins ordinary income.
      const pool = 1_500_000
      const cfg: TaxOverlayConfig = { taxEnabled: true, rmdEnabled: true, household: mkHousehold(2026, 1948, 1950) }
      const buckets: AccountBuckets = { taxable: 0, pretax: pool, roth: 0 }
      const oneSpend = [40_000]
      const withSS = runTaxAwareDecumulation(buckets, realStock, realBond, oneSpend, STOCK_W, 'pre-tax-first', cfg, { ssBenefits: [60_000] })
      const noSS = runTaxAwareDecumulation(buckets, realStock, realBond, oneSpend, STOCK_W, 'pre-tax-first', cfg, { ssBenefits: [0] })
      const sp = spine(pool, oneSpend)
      // direction: SS inclusion → strictly more tax → strictly below the no-SS run, itself below the spine.
      expect(withSS.terminalReal).toBeLessThan(noSS.terminalReal)
      expect(noSS.terminalReal).toBeLessThan(sp.terminalReal)
      // magnitude: pre-tax-first on a pre-tax-only pool → nonSS = max(gross, rmd); re-solve the gross.
      const rmd0 = pool / ultDivisor(78)
      const expectedGross = solveGrossWithSS(40_000, (g) => Math.max(g, rmd0), 60_000, 'mfj', 2)
      expect(withSS.terminalReal / sp.terminalReal).toBeCloseTo((pool - expectedGross) / (pool - 40_000), 8)
    })
  })

  describe('the MAGI coupling — taxable-SS feeds the senior-bonus phase-out, not just the bracket base', () => {
    it('SS pushes grossed-up MAGI into the MFJ 150k–350k phase-out band; the engine matches the SS-aware re-solve', () => {
      // pre-tax-only, pre-tax-first → nonSS = gross. A $200k net + a $50k SS benefit lands MAGI
      // (= gross + taxableSS) inside the phase-out band, where each SS-included dollar ALSO shrinks
      // the bonus (the ×1.06 effective-rate inflation). Re-solving with the SS-inclusive MAGI is the
      // only way to match — a model that phased the bonus on gross ALONE (ignoring taxable-SS) would
      // diverge here.
      const pool = 3_000_000
      const net = 200_000
      const on = runTaxAwareDecumulation({ taxable: 0, pretax: pool, roth: 0 }, realStock, realBond, [net], STOCK_W, 'pre-tax-first', bothBorn1959MFJ, { ssBenefits: [50_000] })
      const sp = spine(pool, [net])
      const gross = solveGrossWithSS(net, (g) => g, 50_000, 'mfj', 2)
      expect(gross + taxableSocialSecurity(gross, 50_000, 'mfj')).toBeGreaterThan(150_000) // genuinely in the phase-out band
      expect(gross + taxableSocialSecurity(gross, 50_000, 'mfj')).toBeLessThan(350_000)
      expect(on.terminalReal / sp.terminalReal).toBeCloseTo((pool - gross) / (pool - net), 8)
    })
  })

  describe('the SS-folded fixed point converges + is deterministic (no in-range default, burned/062)', () => {
    it('a torpedo case (high pre-tax draw + RMD + large SS, phase-out band) converges and repeats byte-identically', () => {
      const cfg: TaxOverlayConfig = { taxEnabled: true, rmdEnabled: true, household: mkHousehold(2026, 1948, 1950) }
      const buckets: AccountBuckets = { taxable: 0, pretax: 2_000_000, roth: 0 }
      const spend = [120_000]
      const run = () => runTaxAwareDecumulation(buckets, realStock, realBond, spend, STOCK_W, 'pre-tax-first', cfg, { ssBenefits: [70_000] })
      const a = run()
      const b = run()
      expect(Number.isFinite(a.terminalReal)).toBe(true) // converged (did not throw / NaN)
      expect(a.terminalReal).toBeGreaterThan(0)
      expect(a.terminalReal).toBe(b.terminalReal) // deterministic, byte-identical across runs
    })

    it('converges across a stress sweep of (pool, spend, SS) WITHOUT ever hitting the fail-loud cap', () => {
      // No-RMD household (both 67) so the GROSS itself drives the ordinary income (nonSS = gross), keeping
      // the full SS→provisional→tax→gross feedback live — the slow-convergence path (an RMD that exceeds
      // the draw pins nonSS to a constant and converges in one step, hiding the feedback). The SS values
      // deliberately run up to $5M with a SMALL spend (0/60k) on a LARGE pool: that is the genuinely slow
      // corner (k ≈ 0.685, 37% bracket × the ×1.85 SS torpedo, taxable-SS still uncapped) — measured ~64
      // passes at SS $1M and ~80 at $5M, the tail the 128 cap exists for. Locking it here means a future
      // trim of the cap toward 64 fails LOUD in CI (it throws for SS ≳ $1M), not silently for those users.
      // Realistic benefits (≤ $150k) converge in ≤ 32 passes. None may throw the burned/062 guard.
      const cfg = bothBorn1959MFJ
      for (const pool of [500_000, 2_000_000, 10_000_000, 50_000_000]) {
        for (const spend of [0, 60_000, 200_000, 800_000]) {
          for (const ss of [0, 40_000, 80_000, 150_000, 1_000_000, 5_000_000]) {
            expect(() =>
              runTaxAwareDecumulation({ taxable: 0, pretax: pool, roth: 0 }, realStock, realBond, [spend], STOCK_W, 'pre-tax-first', cfg, { ssBenefits: [ss] }),
            ).not.toThrow()
          }
        }
      }
    })
  })

  describe('the funding bucket changes SS taxation — this is WHY sequencing is a control (R9)', () => {
    it('a pre-tax draw raises provisional income (more SS taxed); an equal Roth draw does NOT', () => {
      // Same total portfolio, same SS, same net spend — funded pre-tax vs Roth, both 67 (no RMD).
      // A pre-tax draw IS ordinary income AND lifts provisional → more of the SS is taxed AND the
      // ordinary income itself is taxed → the pre-tax-funded run ends strictly BELOW the Roth-funded
      // run. A Roth draw is neither ordinary income nor provisional income, so with only a $50k SS
      // benefit (provisional = ½×50k = 25k ≤ the 32k MFJ floor) NONE of the SS is taxed → the Roth
      // run reduces to the spine. This SS-torpedo asymmetry is invisible to a tax-blind or SS-blind
      // model — it is the half of the sequencing lever M4 exists to expose.
      const total = 1_000_000
      const oneSpend = [50_000]
      const ss = [50_000]
      const preTaxPool = runTaxAwareDecumulation({ taxable: 0, pretax: total, roth: 0 }, realStock, realBond, oneSpend, STOCK_W, 'pre-tax-first', bothBorn1959MFJ, { ssBenefits: ss })
      const rothPool = runTaxAwareDecumulation({ taxable: 0, pretax: 0, roth: total }, realStock, realBond, oneSpend, STOCK_W, 'pre-tax-first', bothBorn1959MFJ, { ssBenefits: ss })
      const sp = spine(total, oneSpend)
      // Roth-funded: nonSS ordinary income = 0, provisional = ½×50k = 25k ≤ 32k → 0 taxable SS → no tax → spine.
      expect(taxableSocialSecurity(0, 50_000, 'mfj')).toBe(0) // the premise: at 0 other income this SS is untaxed
      expect(rothPool.terminalReal).toBe(sp.terminalReal)
      // Pre-tax-funded: the draw is ordinary income, lifts provisional past 32k → SS taxed + ordinary tax → below the Roth run.
      expect(preTaxPool.terminalReal).toBeLessThan(rothPool.terminalReal)
    })
  })

  describe('the SS stream is read per-year, aligned to netWithdrawals (not [0] / [t+1] / a silent short-stream extend)', () => {
    // A pre-tax-only pool drawn pre-tax-first with no RMD → each year nonSS = THAT year's gross (the draw is
    // far below the balance, so alloc.pretax = gross), INDEPENDENT of the balance. So the per-year gross is
    // solveGrossWithSS(net, identity, ss_t), and the overlay's total trajectory is stepYear on that gross
    // stream — matching the spine run on the same stream. A CONSTANT SS stream can't distinguish correct [t]
    // indexing from [0]/[t+1]; a VARYING stream can. (M2's 2-year recurrence is the precedent: single-year
    // fixtures cannot pin cross-year wiring, and M4 added a whole new per-year input stream.)
    const net = 50_000
    const pool = 2_000_000
    const buckets: AccountBuckets = { taxable: 0, pretax: pool, roth: 0 }
    const threeYears = [net, net, net]
    const grossFor = (ss: number) => solveGrossWithSS(net, (g) => g, ss, 'mfj', 2)

    it('a delayed-claiming stream [0, 0, 50k] taxes SS in YEAR 2 ONLY — matches the spine on the per-year-resolved grosses', () => {
      const ssStream = [0, 0, 50_000]
      const on = runTaxAwareDecumulation(buckets, realStock, realBond, threeYears, STOCK_W, 'pre-tax-first', bothBorn1959MFJ, { ssBenefits: ssStream })
      // non-vacuous: year-2 SS genuinely raises that year's gross (else the test can't discriminate the year).
      expect(grossFor(50_000)).toBeGreaterThan(grossFor(0))
      // correct per-year alignment ⇒ overlay total === spine on [solve(0), solve(0), solve(50k)]. An always-[0]
      // read uses solve(0) in year 2; an off-by-one taxes year 1 — both diverge by ~$thousands (≫ the 1e-7
      // fixed-point epsilon the closeTo tolerates).
      const ref = spine(pool, ssStream.map(grossFor))
      expect(on.terminalReal).toBeCloseTo(ref.terminalReal, 2)
      expect(on.depletionYear).toBe(ref.depletionYear)
    })

    it('an SS stream SHORTER than the horizon defaults the missing tail years to 0 SS (the ?? 0 contract), never a throw', () => {
      // length-1 stream [50k] on a 3-year horizon → year 0 taxed on SS, years 1–2 default to 0 SS (no SS that
      // year), NOT an end-of-data break (returns/withdrawals govern the horizon, not the SS stream).
      const on = runTaxAwareDecumulation(buckets, realStock, realBond, threeYears, STOCK_W, 'pre-tax-first', bothBorn1959MFJ, { ssBenefits: [50_000] })
      const ref = spine(pool, [grossFor(50_000), grossFor(0), grossFor(0)])
      expect(on.terminalReal).toBeCloseTo(ref.terminalReal, 2)
    })
  })

  describe('single-filer SS taxation is wired through the decumulation (the widow torpedo — M6 flips MFJ→single here)', () => {
    it('a single 67-yo with an SS benefit grosses up through the SINGLE 25k/34k thresholds + single schedule', () => {
      // The lone prior single-filer test (M3) ran with SS=0, short-circuiting before `filing` reached
      // taxableSocialSecurity — so the single SS path was never executed end-to-end. The survivor's half-width
      // single thresholds tax MORE of the same SS dollars than MFJ would (the widow torpedo the M6 filing flip
      // exposes). count65=1 (one 67-yo), no RMD; pre-tax-only pre-tax-first → nonSS = gross.
      const single: TaxOverlayConfig = {
        taxEnabled: true,
        rmdEnabled: false,
        household: { startCalendarYear: 2026, filing: 'single', owner: { birthYear: 1959 } },
      }
      const pool = 1_000_000
      const net = 50_000
      const on = runTaxAwareDecumulation({ taxable: 0, pretax: pool, roth: 0 }, realStock, realBond, [net], STOCK_W, 'pre-tax-first', single, { ssBenefits: [40_000] })
      const sp = spine(pool, [net])
      const gross = solveGrossWithSS(net, (g) => g, 40_000, 'single', 1)
      expect(gross).toBeGreaterThan(net) // the draw + the single-threshold taxable SS are taxed
      expect(on.terminalReal / sp.terminalReal).toBeCloseTo((pool - gross) / (pool - net), 8)
    })
  })
})

describe('taxOverlay — M5 Roth conversion + cap-gains/QD stacking', () => {
  const P = 1_000_000
  // Both 67 at startCalendarYear 2026 (full 65+ deduction stack, NO RMD yet) — isolates conversion
  // + cap-gains from the RMD mechanic, and keeps the gross itself driving ordinary income (the live
  // feedback path, not an RMD that pins nonSS to a constant).
  const TAX_ON_NO_RMD: TaxOverlayConfig = { taxEnabled: true, rmdEnabled: false, household: mkHousehold(2026, 1959, 1959) }
  // Owner 78 / spouse 76 (born 1948/1950): RMD active, full 65+ deduction stack.
  const RMD78: TaxOverlayConfig = { taxEnabled: true, rmdEnabled: true, household: mkHousehold(2026, 1948, 1950) }

  // ===========================================================================
  // (CG) The pure capitalGainsTax helper — externally-derived §1(h) stacking fixtures (DND/012).
  // capitalGainsTax(gainSubjectToTax, ordinaryTaxableIncome, filing) stacks the gain ABOVE ordinary
  // taxable income: 0% up to the zero-rate ceiling, 15% to the fifteen-rate ceiling, 20% above. Each
  // expected number is hand-traced from the published breakpoints, never from the engine's own fn.
  // ===========================================================================
  describe('capitalGainsTax stacks the gain on ordinary taxable income (DND/012)', () => {
    it('a gain wholly inside the 0% band owes nothing (MFJ, no ordinary income)', () => {
      expect(capitalGainsTax(50_000, 0, 'mfj')).toBe(0) // top 50k < the MFJ 0%-ceiling 98,900
    })
    it('a gain wholly inside the 0% band with some ordinary income below the ceiling owes nothing', () => {
      expect(capitalGainsTax(40_000, 50_000, 'mfj')).toBe(0) // top 90k < 98,900
    })
    it('a gain straddling the 0→15 ceiling pays 15% only on the portion above it (MFJ)', () => {
      // ord 80k + gain 40k → top 120k; the 98,900 ceiling splits it: 18,900 at 0%, 21,100 at 15%.
      expect(capitalGainsTax(40_000, 80_000, 'mfj')).toBeCloseTo(3_165, 6) // 0.15 × 21,100
    })
    it('a gain wholly inside the 15% band (MFJ)', () => {
      expect(capitalGainsTax(50_000, 200_000, 'mfj')).toBeCloseTo(7_500, 6) // 0.15 × 50,000
    })
    it('a gain straddling the 15→20 ceiling pays 20% only above it (MFJ)', () => {
      // ord 600k + gain 30k → top 630k; the 15%-ceiling (613,700) splits the gain: 13,700 at 15%,
      // 16,300 at 20% → 2,055 + 3,260 = 5,315.
      expect(capitalGainsTax(30_000, 600_000, 'mfj')).toBeCloseTo(5_315, 6)
    })
    it('a gain wholly inside the 20% band (MFJ, ordinary income above the 15%-ceiling)', () => {
      expect(capitalGainsTax(50_000, 700_000, 'mfj')).toBeCloseTo(10_000, 6) // 0.20 × 50,000
    })
    it('the SINGLE breakpoints are not half of MFJ — straddling the single 0→15 ceiling', () => {
      // ord 40k + gain 20k → top 60k; the single 0%-ceiling (49,450) splits it: 9,450 at 0%,
      // 10,550 at 15% → 1,582.50.
      expect(capitalGainsTax(20_000, 40_000, 'single')).toBeCloseTo(1_582.5, 6)
    })
    it('a zero or negative gain is never taxed (no negative cap-gains tax)', () => {
      expect(capitalGainsTax(0, 100_000, 'mfj')).toBe(0)
      expect(capitalGainsTax(-5_000, 100_000, 'mfj')).toBe(0)
    })
    it('the gain rate keys off TOTAL taxable income, never the gain alone (a small gain can still pay 15%)', () => {
      // a $10k gain with $300k ordinary income is entirely above the 0%-ceiling → 15%, not 0%.
      expect(capitalGainsTax(10_000, 300_000, 'mfj')).toBeCloseTo(1_500, 6)
    })
  })

  // ===========================================================================
  // (OPC) ordinaryPlusCapitalGainsTax — the deduction-shelter (the CRITICAL low-income-retiree
  // regime) + the gain-inclusive MAGI coupling + reduce-to-ordinary. Hand-derived (DND/012).
  // ===========================================================================
  describe('ordinaryPlusCapitalGainsTax shelters the gain with unused deduction + phases the bonus on gain-inclusive MAGI', () => {
    it('the unused deduction shelters the gain — a low-ordinary-income brokerage retiree owes $0 (NOT phantom tax)', () => {
      // O = 20k ordinary, gain 120k, MFJ both 65 → deduction 47,500. Ordinary taxable = 0; the leftover
      // 27,500 of deduction shelters the gain → gainTaxable 92,500, which is still < the 98,900 0%-ceiling
      // → $0. The raw-gain bug would tax the FULL 120k and invent $3,165 of phantom tax on a $0 bill.
      expect(ordinaryPlusCapitalGainsTax(20_000, 120_000, 'mfj', 2)).toBe(0)
      expect(capitalGainsTax(120_000, 0, 'mfj')).toBeCloseTo(3_165, 6) // the phantom tax the shelter avoids
    })
    it('the senior bonus phases on the GAIN-inclusive MAGI, not ordinary income alone', () => {
      // O = 120k, gain 100k → MAGI 220k (NOT 120k). Bonus = 12,000 − 0.06×(220k−150k) = 7,800 →
      // deduction 43,300 → ordinary taxable 76,700 → ordinary tax 2,480 + 6,228 = 8,708. Gain fully
      // above the deduction → gainTaxable 100k stacked on 76,700: 22,200 at 0%, 77,800 at 15% = 11,670.
      // Total 20,378. A magi=ordinary-income bug keeps the full bonus and under-taxes (~19,244).
      expect(ordinaryPlusCapitalGainsTax(120_000, 100_000, 'mfj', 2)).toBeCloseTo(20_378, 6)
    })
    it('with zero realized gain it is byte-identical to ordinaryIncomeTax (reduce-to-M3/M4 at the fn level)', () => {
      for (const o of [0, 80_000, 150_000, 250_000]) {
        expect(ordinaryPlusCapitalGainsTax(o, 0, 'mfj', 2)).toBe(ordinaryIncomeTax(o, 'mfj', 2))
        expect(ordinaryPlusCapitalGainsTax(o, 0, 'single', 1)).toBe(ordinaryIncomeTax(o, 'single', 1))
      }
    })
  })

  // A per-year gross-up re-solve using ONLY the golden pure fns (capitalGainsTax + ordinaryIncomeTax,
  // composed in ordinaryPlusCapitalGainsTax; taxableSocialSecurity for the SS layer) — the external
  // oracle for the integration tests, mirroring M3/M4's solveGross helpers. A WIRING bug (wrong draw
  // pool, gain not in provisional, gain taxed as ordinary) makes the engine disagree with this.
  const solveGrossM5 = (
    net: number,
    nonSSfromGross: (g: number) => number,
    gainFromGross: (g: number) => number,
    ss: number,
    filing: 'mfj' | 'single',
    count65: number,
  ): number => {
    let gross = net
    for (let i = 0; i < 400; i++) {
      const nonSS = nonSSfromGross(gross)
      const rg = gainFromGross(gross)
      const ordInc = nonSS + taxableSocialSecurity(nonSS + rg, ss, filing)
      gross = net + ordinaryPlusCapitalGainsTax(ordInc, rg, filing, count65)
    }
    return gross
  }

  // ===========================================================================
  // Reduce-to-spine / reduce-to-M4 with the new conversion + basis inputs.
  // ===========================================================================
  describe('reduce-to-spine / reduce-to-M4: conversions + basis never perturb the OFF or zero-input anchors', () => {
    it('a positive conversion stream with tax OFF is byte-identical to the spine (the OFF anchor is unperturbed)', () => {
      const got = runTaxAwareDecumulation({ taxable: 0, pretax: P, roth: 0 }, realStock, realBond, flat(40_000), STOCK_W, 'pre-tax-first', OFF, { conversions: flat(50_000) })
      const sp = spine(P, flat(40_000))
      expect(got.terminalReal).toBe(sp.terminalReal)
      expect(got.depletionYear).toBe(sp.depletionYear)
    })
    it('conversions all-zero === conversions absent === the M4 fixed point (pre-tax pool, tax ON)', () => {
      const buckets: AccountBuckets = { taxable: 0, pretax: P, roth: 0 }
      const absent = runTaxAwareDecumulation(buckets, realStock, realBond, [60_000], STOCK_W, 'pre-tax-first', TAX_ON_NO_RMD)
      const zeroConv = runTaxAwareDecumulation(buckets, realStock, realBond, [60_000], STOCK_W, 'pre-tax-first', TAX_ON_NO_RMD, { conversions: [0] })
      expect(zeroConv.terminalReal).toBe(absent.terminalReal)
      expect(zeroConv.depletionYear).toBe(absent.depletionYear)
    })
    it('an all-basis taxable pool (basis = value) with tax ON realizes no gain → byte-identical to the spine', () => {
      const got = runTaxAwareDecumulation({ taxable: P, pretax: 0, roth: 0 }, realStock, realBond, [60_000], STOCK_W, 'taxable-first', TAX_ON_NO_RMD, { initialTaxableBasis: P })
      const sp = spine(P, [60_000])
      expect(got.terminalReal).toBe(sp.terminalReal)
      expect(got.depletionYear).toBe(sp.depletionYear)
    })
  })

  // ===========================================================================
  // Cap-gains in the decumulation: a gain-bearing taxable draw ends BELOW the spine; the engine
  // matches the external re-solve; losses floor at 0 (no phantom refund).
  // ===========================================================================
  describe('a taxable draw realizes a pro-rata gain that bites (and matches the re-solve)', () => {
    it('a gain-bearing taxable pool ends strictly below the equal-value all-basis pool, and matches the re-solve', () => {
      const value = 2_000_000
      const basis = 500_000 // gain fraction 0.75
      const net = 300_000
      const gain = runTaxAwareDecumulation({ taxable: value, pretax: 0, roth: 0 }, realStock, realBond, [net], STOCK_W, 'taxable-first', TAX_ON_NO_RMD, { initialTaxableBasis: basis })
      const allBasis = runTaxAwareDecumulation({ taxable: value, pretax: 0, roth: 0 }, realStock, realBond, [net], STOCK_W, 'taxable-first', TAX_ON_NO_RMD, { initialTaxableBasis: value })
      const sp = spine(value, [net])
      // all-basis realizes no gain → spine; the gain pool pays cap-gains tax → strictly below.
      expect(allBasis.terminalReal).toBe(sp.terminalReal)
      expect(gain.terminalReal).toBeLessThan(allBasis.terminalReal)
      // magnitude: taxable-first on a taxable-only pool → no pretax/ordinary; the realized gain is
      // the gross × the gain fraction; re-solve the fixed point with the golden fns.
      const gross = solveGrossM5(net, () => 0, (g) => g * (1 - basis / value), 0, 'mfj', 2)
      expect(gross).toBeGreaterThan(net) // cap-gains tax was genuinely owed
      expect(gain.terminalReal / sp.terminalReal).toBeCloseTo((value - gross) / (value - net), 8)
    })

    it('a realized LOSS (basis > value) floors at 0 — no phantom refund, byte-identical to the spine', () => {
      // An underwater taxable pool: basis 800k on a 500k value. The "gain" is negative ⇒ floored to 0
      // ⇒ no cap-gains tax ⇒ byte-identical to the spine. Crucially NOT ABOVE the spine (a negative
      // tax / loss refund would push it above) — the §1211 loss benefit is OUT-but-disclosed.
      const got = runTaxAwareDecumulation({ taxable: 500_000, pretax: 0, roth: 0 }, realStock, realBond, [40_000], STOCK_W, 'taxable-first', TAX_ON_NO_RMD, { initialTaxableBasis: 800_000 })
      const sp = spine(500_000, [40_000])
      expect(got.terminalReal).toBe(sp.terminalReal)
    })
  })

  // ===========================================================================
  // Roth conversion mechanics: RMD-first legality, feasibility clamp, per-year alignment, presence.
  // ===========================================================================
  describe('Roth conversion: RMD-first legality, the feasibility clamp, per-year alignment', () => {
    it('a conversion on a pre-tax pool moves pretax→roth and ends below the no-conversion run (matches the re-solve)', () => {
      const net = 40_000
      const C = 100_000
      const buckets: AccountBuckets = { taxable: 0, pretax: P, roth: 0 }
      const withConv = runTaxAwareDecumulation(buckets, realStock, realBond, [net], STOCK_W, 'pre-tax-first', TAX_ON_NO_RMD, { conversions: [C] })
      const noConv = runTaxAwareDecumulation(buckets, realStock, realBond, [net], STOCK_W, 'pre-tax-first', TAX_ON_NO_RMD, { conversions: [0] })
      const sp = spine(P, [net])
      // presence: the conversion is ordinary income → more tax → strictly below the no-conversion run,
      // and the converted dollars now live in Roth (which the no-conversion run never funds).
      expect(withConv.terminalReal).toBeLessThan(noConv.terminalReal)
      expect(withConv.finalBuckets.roth).toBeGreaterThan(0)
      expect(noConv.finalBuckets.roth).toBe(0)
      // magnitude: pre-tax-first pre-tax-only → ordinary income = gross (the draw) + C; re-solve.
      const gross = solveGrossM5(net, (g) => g + C, () => 0, 0, 'mfj', 2)
      expect(gross).toBeGreaterThan(net)
      expect(withConv.terminalReal / sp.terminalReal).toBeCloseTo((P - gross) / (P - net), 8)
    })

    it('the conversion is ON TOP of the non-convertible RMD (it cannot satisfy or reduce it)', () => {
      // owner 78 → RMD ≈ 1.5M ÷ 22 ≈ 68k, ABOVE the 40k spend; a 100k conversion is ordinary income
      // STACKED on the forced RMD, never replacing it. So ordinary income = max(draw, rmd) + C.
      const pool = 1_500_000
      const net = 40_000
      const C = 100_000
      const buckets: AccountBuckets = { taxable: 0, pretax: pool, roth: 0 }
      const withConv = runTaxAwareDecumulation(buckets, realStock, realBond, [net], STOCK_W, 'pre-tax-first', RMD78, { conversions: [C] })
      const noConv = runTaxAwareDecumulation(buckets, realStock, realBond, [net], STOCK_W, 'pre-tax-first', RMD78, { conversions: [0] })
      const sp = spine(pool, [net])
      const rmd = pool / ultDivisor(78)
      // the conversion adds C of ordinary income on top of the RMD → strictly more tax → below no-conv.
      expect(withConv.terminalReal).toBeLessThan(noConv.terminalReal)
      // the RMD relocation still happened (pretax→taxable forced excess) AND the conversion landed in Roth.
      expect(withConv.finalBuckets.taxable).toBeGreaterThan(0)
      expect(withConv.finalBuckets.roth).toBeGreaterThan(0)
      // magnitude: ordinary income = max(draw, rmd) + C; re-solve and match the terminal ratio.
      const gross = solveGrossM5(net, (g) => Math.max(g, rmd) + C, () => 0, 0, 'mfj', 2)
      expect(withConv.terminalReal / sp.terminalReal).toBeCloseTo((pool - gross) / (pool - net), 8)
    })

    it('the conversion is clamped to [0, pretax − RMD] — over-requests all clamp to the same result', () => {
      const pool = 1_500_000
      const net = 40_000
      const buckets: AccountBuckets = { taxable: 0, pretax: pool, roth: 0 }
      // Two over-the-clamp requests (both ≫ the pretax pool) must clamp identically...
      const overA = runTaxAwareDecumulation(buckets, realStock, realBond, [net], STOCK_W, 'pre-tax-first', RMD78, { conversions: [2_000_000] })
      const overB = runTaxAwareDecumulation(buckets, realStock, realBond, [net], STOCK_W, 'pre-tax-first', RMD78, { conversions: [9_000_000] })
      const none = runTaxAwareDecumulation(buckets, realStock, realBond, [net], STOCK_W, 'pre-tax-first', RMD78, { conversions: [0] })
      expect(overA.terminalReal).toBe(overB.terminalReal)
      expect(overA.finalBuckets.roth).toBe(overB.finalBuckets.roth)
      // ...and the clamp is BINDING (a zero conversion genuinely differs).
      expect(overA.finalBuckets.roth).toBeGreaterThan(none.finalBuckets.roth)
    })

    it('the conversion stream is read per-year, aligned to netWithdrawals ([0,0,C] converts in year 2 only)', () => {
      const net = 50_000
      const pool = 2_000_000
      const buckets: AccountBuckets = { taxable: 0, pretax: pool, roth: 0 }
      const threeYears = [net, net, net]
      const grossFor = (c: number) => solveGrossM5(net, (g) => g + c, () => 0, 0, 'mfj', 2)
      const on = runTaxAwareDecumulation(buckets, realStock, realBond, threeYears, STOCK_W, 'pre-tax-first', TAX_ON_NO_RMD, { conversions: [0, 0, 100_000] })
      // non-vacuous: a year-2 conversion genuinely raises that year's gross.
      expect(grossFor(100_000)).toBeGreaterThan(grossFor(0))
      // correct [t] alignment ⇒ overlay total === spine on [solve(0), solve(0), solve(100k)]; an
      // always-[0] read or an off-by-one diverges by ~$thousands (≫ the 1e-7 fixed-point epsilon).
      const ref = spine(pool, [grossFor(0), grossFor(0), grossFor(100_000)])
      expect(on.terminalReal).toBeCloseTo(ref.terminalReal, 2)
      expect(on.depletionYear).toBe(ref.depletionYear)
    })
  })

  // ===========================================================================
  // The ledger sum-reconciliation invariant (the CRITICAL #1 guard): with conversion + RMD +
  // cap-gains all present, ΣfinalBuckets must equal the authoritative total under EVERY policy, and
  // no bucket may go negative (the pretax double-spend the draw-pool reservation prevents).
  // ===========================================================================
  describe('the bucket ledger reconciles to the authoritative total with conversion + RMD + cap-gains (every policy)', () => {
    // owner 78 (RMD active) + a low-basis taxable pool (embedded gain) + a per-year conversion +
    // an SS stream — every M5 mechanic live at once, over the full horizon.
    const multi: AccountBuckets = { taxable: 200_000, pretax: 700_000, roth: 100_000 }
    for (const policy of DRAWDOWN_POLICIES) {
      it(`${policy}: ΣfinalBuckets === terminalReal and no bucket goes negative`, () => {
        const got = runTaxAwareDecumulation(multi, realStock, realBond, flat(50_000), STOCK_W, policy, RMD78, {
          ssBenefits: flat(30_000),
          conversions: flat(60_000),
          initialTaxableBasis: 50_000, // low basis → real embedded gain
        })
        if (got.depletionYear === NEVER_DEPLETED) {
          expect(Math.abs(totalAcrossBuckets(got.finalBuckets) / got.terminalReal - 1)).toBeLessThan(1e-9)
        }
        expect(got.finalBuckets.taxable).toBeGreaterThanOrEqual(0)
        expect(got.finalBuckets.pretax).toBeGreaterThanOrEqual(0)
        expect(got.finalBuckets.roth).toBeGreaterThanOrEqual(0)
        expect(got.finalTaxableBasis).toBeGreaterThanOrEqual(0)
        expect(Number.isFinite(got.finalTaxableBasis)).toBe(true)
      })
    }

    it('the pretax double-spend trigger (pre-tax-first + pretax-heavy + a large conversion) reconciles, no negative bucket', () => {
      // The exact regime the naive "allocate on full pretax then subtract the conversion" bug drove
      // negative: pre-tax-first, a pretax-only pool, a conversion that is a large fraction of pretax.
      const buckets: AccountBuckets = { taxable: 0, pretax: P, roth: 0 }
      const got = runTaxAwareDecumulation(buckets, realStock, realBond, flat(40_000), STOCK_W, 'pre-tax-first', TAX_ON_NO_RMD, { conversions: flat(300_000) })
      if (got.depletionYear === NEVER_DEPLETED) {
        expect(Math.abs(totalAcrossBuckets(got.finalBuckets) / got.terminalReal - 1)).toBeLessThan(1e-9)
      }
      expect(got.finalBuckets.pretax).toBeGreaterThanOrEqual(0)
      expect(got.finalBuckets.taxable).toBeGreaterThanOrEqual(0)
      expect(got.finalBuckets.roth).toBeGreaterThanOrEqual(0)
    })
  })

  // ===========================================================================
  // finalTaxableBasis exposure + required-input fail-loud (burned/062).
  // ===========================================================================
  describe('finalTaxableBasis + the required-basis fail-loud gate', () => {
    it('finalTaxableBasis is 0 when the portfolio depletes (no stale basis on an empty bucket)', () => {
      // a small taxable pool spent to depletion mid-horizon.
      const got = runTaxAwareDecumulation({ taxable: 150_000, pretax: 0, roth: 0 }, realStock, realBond, flat(40_000), STOCK_W, 'taxable-first', TAX_ON_NO_RMD, { initialTaxableBasis: 100_000 })
      expect(got.depletionYear).toBeGreaterThanOrEqual(0)
      expect(got.depletionYear).toBeLessThan(H)
      expect(got.finalTaxableBasis).toBe(0)
      expect(got.finalBuckets.taxable).toBe(0)
    })

    it('a required initial taxable basis is fail-loud when tax is ON and the taxable bucket is non-empty (burned/062)', () => {
      expect(() =>
        runTaxAwareDecumulation({ taxable: 100_000, pretax: 0, roth: 0 }, realStock, realBond, [40_000], STOCK_W, 'taxable-first', TAX_ON_NO_RMD),
      ).toThrow(/initialTaxableBasis is required/)
    })

    it('an absent basis is FINE when tax is OFF (basis is never read) or the taxable bucket starts empty', () => {
      expect(() =>
        runTaxAwareDecumulation({ taxable: 100_000, pretax: 0, roth: 0 }, realStock, realBond, [40_000], STOCK_W, 'taxable-first', OFF),
      ).not.toThrow()
      expect(() =>
        runTaxAwareDecumulation({ taxable: 0, pretax: P, roth: 0 }, realStock, realBond, [40_000], STOCK_W, 'pre-tax-first', TAX_ON_NO_RMD),
      ).not.toThrow()
    })
  })

  // ===========================================================================
  // Convergence: the extended fixed point still converges across the cap-gains + conversion + SS
  // regime — INCLUDING the small-net / low-basis / large-SS corner (k ≈ 0.74) the pre-tax-only M4
  // sweep can never reach (insight 006). None may hit the fail-loud 128-pass cap.
  // ===========================================================================
  describe('the cap-gains + conversion + SS fixed point converges WITHOUT hitting the fail-loud cap (k ≈ 0.74)', () => {
    it('a low-basis taxable pool × large SS × conversions × SMALL net converges across the stress sweep', () => {
      // A mixed pool (half pretax → ordinary income, half LOW-basis taxable → large realized gain) so the
      // gain block straddles the cap-gains breakpoints while the SS torpedo is live and a conversion piles
      // on ordinary income — the k ≈ 0.74 corner. SS runs to $5M and net to 0 (the slow regime). Locking
      // this here means a future trim of the 128 cap fails LOUD in CI rather than throwing for real inputs.
      for (const pool of [500_000, 2_000_000, 10_000_000, 50_000_000]) {
        for (const spend of [0, 60_000]) {
          for (const ss of [0, 1_000_000, 5_000_000]) {
            for (const conv of [0, 200_000]) {
              const buckets: AccountBuckets = { taxable: pool / 2, pretax: pool / 2, roth: 0 }
              expect(() =>
                runTaxAwareDecumulation(buckets, realStock, realBond, [spend], STOCK_W, 'proportional', TAX_ON_NO_RMD, {
                  ssBenefits: [ss],
                  conversions: [conv],
                  initialTaxableBasis: 1, // basis ≈ 0 → near-100% of the taxable draw is realized gain
                }),
              ).not.toThrow()
            }
          }
        }
      }
    })

    it('a torpedo + cap-gains + conversion case converges deterministically (byte-identical across runs)', () => {
      const buckets: AccountBuckets = { taxable: 1_000_000, pretax: 1_000_000, roth: 0 }
      const run = () =>
        runTaxAwareDecumulation(buckets, realStock, realBond, [120_000], STOCK_W, 'proportional', RMD78, {
          ssBenefits: [70_000],
          conversions: [150_000],
          initialTaxableBasis: 100_000,
        })
      const a = run()
      const b = run()
      expect(Number.isFinite(a.terminalReal)).toBe(true)
      expect(a.terminalReal).toBeGreaterThan(0)
      expect(a.terminalReal).toBe(b.terminalReal)
      expect(a.finalTaxableBasis).toBe(b.finalTaxableBasis)
    })
  })

  // ===========================================================================
  // Integration MAGNITUDE coverage (adversarial-review gaps): the M5 couplings that a regression
  // could break while every other test stays green. Each pins the engine's terminal against an
  // EXTERNAL re-solve (solveGrossM5 / a hand-built trajectory), never the engine's own output.
  // ===========================================================================
  describe('integration magnitude: the M5 couplings under regression guard', () => {
    it('a realized gain + an SS benefit + a conversion together (proportional) match the joint re-solve', () => {
      // {taxable 600k (basis 100k → gain fraction 5/6), pretax 400k}, total 1M, both 67 (no RMD).
      // A 50k conversion → drawPool {taxable 600k, pretax 350k, roth 50k}. Under proportional,
      // alloc.pretax = gross×0.35, alloc.taxable = gross×0.60 → realizedGain = gross×0.60×(5/6) = gross×0.50.
      // The headline M5 interaction: the conversion's ordinary income AND the realized gain both ride the
      // SS-torpedo provisional, and the gain stacks at preferential rates. A regression that dropped the
      // gain from provisional income (the ~$15k-unguarded coupling the review flagged) diverges here, as
      // does dropping the conversion or mis-realizing the proportional gain.
      const value = 600_000
      const basis = 100_000
      const pretax = 400_000
      const total = 1_000_000
      const net = 80_000
      const ss = 50_000
      const C = 50_000
      const buckets: AccountBuckets = { taxable: value, pretax, roth: 0 }
      const on = runTaxAwareDecumulation(buckets, realStock, realBond, [net], STOCK_W, 'proportional', TAX_ON_NO_RMD, { ssBenefits: [ss], conversions: [C], initialTaxableBasis: basis })
      const sp = spine(total, [net])
      // proportional shares are over the conversion-reduced drawPool: pretax (400k−50k)/1M, taxable 600k/1M.
      const gross = solveGrossM5(
        net,
        (g) => g * ((pretax - C) / total) + C, // nonSS = alloc.pretax + the conversion (both ordinary)
        (g) => g * (value / total) * (1 - basis / value), // pro-rata realized gain
        ss,
        'mfj',
        2,
      )
      expect(gross).toBeGreaterThan(net) // ordinary + cap-gains + SS torpedo all genuinely owed
      expect(on.terminalReal / sp.terminalReal).toBeCloseTo((total - gross) / (total - net), 8)
    })

    it('the taxable-basis recurrence holds ACROSS years (a 2-year externally-derived fixture, M2 precedent)', () => {
      // taxable-only, taxable-first, no RMD/SS/conversion. Growth lifts the taxable VALUE but NOT the
      // basis (basis-no-scale), so the year-1 gain fraction strictly exceeds year-0's — a cross-year
      // wiring a single-year fixture cannot pin (exactly the gap M2 closed for the RMD recurrence).
      const V = 2_000_000
      const B = 500_000
      const net = 200_000
      const buckets: AccountBuckets = { taxable: V, pretax: 0, roth: 0 }
      const on = runTaxAwareDecumulation(buckets, realStock, realBond, [net, net], STOCK_W, 'taxable-first', TAX_ON_NO_RMD, { initialTaxableBasis: B })
      // Reconstruct the 2-year trajectory independently (taxable-first taxable-only → alloc.taxable = gross).
      const g0 = solveGrossM5(net, () => 0, (g) => g * (1 - B / V), 0, 'mfj', 2)
      const scale0 = spine(V, [0]).terminalReal / V // the year-0 blended growth factor (zero-withdrawal probe)
      const value1 = (V - g0) * scale0 // taxable value at the start of year 1 (grown)
      const basis1 = B * (1 - g0 / V) // basis depleted pro-rata, UNSCALED — the load-bearing recurrence
      const g1 = solveGrossM5(net, () => 0, (g) => g * (1 - basis1 / value1), 0, 'mfj', 2)
      // the year-1 gain fraction rose because growth raised value, not basis (proves basis-no-scale across years).
      expect(1 - basis1 / value1).toBeGreaterThan(1 - B / V)
      const ref = spine(V, [g0, g1])
      expect(on.terminalReal).toBeCloseTo(ref.terminalReal, 2)
    })

    it('cap-gains runs through the decumulation for a SINGLE filer (the survivor/widow-torpedo breakpoints)', () => {
      // The single 0% cap-gains ceiling is far below MFJ's, so the survivor pays 15% on gains that were
      // 0%-rated while both were alive. Exercises capitalGainsBreakpointsFor('single') end-to-end in the
      // decumulation (the pure fn covered it; no integration test did). M6 flips MFJ→single here.
      const value = 1_000_000
      const basis = 100_000
      const net = 150_000
      const single: TaxOverlayConfig = { taxEnabled: true, rmdEnabled: false, household: { startCalendarYear: 2026, filing: 'single', owner: { birthYear: 1959 } } }
      const on = runTaxAwareDecumulation({ taxable: value, pretax: 0, roth: 0 }, realStock, realBond, [net], STOCK_W, 'taxable-first', single, { initialTaxableBasis: basis })
      const sp = spine(value, [net])
      const gross = solveGrossM5(net, () => 0, (g) => g * (1 - basis / value), 0, 'single', 1)
      expect(gross).toBeGreaterThan(net) // the single breakpoints push the gain past the 0% band → tax owed
      expect(on.terminalReal / sp.terminalReal).toBeCloseTo((value - gross) / (value - net), 8)
    })
  })

  // A reference to the sourced breakpoint so the test documents the straddle regime WITHOUT inlining
  // the guarded dated figure (the single-source gate forbids it outside the constants module).
  it('the cap-gains breakpoints are read from the canonical constant (not inlined here)', () => {
    expect(capitalGainsBreakpoints.value.mfj.fifteenRateUpTo).toBeGreaterThan(capitalGainsBreakpoints.value.mfj.zeroRateUpTo)
    expect(capitalGainsBreakpoints.value.single.zeroRateUpTo).toBeLessThan(capitalGainsBreakpoints.value.mfj.zeroRateUpTo)
  })
})

describe('taxOverlay — M6a MFJ→single survivor filing switch (per-year HouseholdYear regime)', () => {
  const P = 1_000_000
  const TAX_ON_NO_RMD: TaxOverlayConfig = { taxEnabled: true, rmdEnabled: false, household: mkHousehold(2026, 1959, 1959) }
  const both1959: HouseholdYear = { living: [{ birthYear: 1959 }, { birthYear: 1959 }] }
  const survivor1959: HouseholdYear = { living: [{ birthYear: 1959 }] }

  /** SS-folded per-year gross re-solve using ONLY the golden pure fns (mirrors the M4 helper),
   *  parameterised by filing + count65 so the survivor (single) year is re-solved correctly. */
  const solveGrossWithSS = (net: number, ss: number, filing: 'mfj' | 'single', count65: number): number => {
    let gross = net
    for (let i = 0; i < 300; i++) {
      gross = net + ordinaryIncomeTax(gross + taxableSocialSecurity(gross, ss, filing), filing, count65)
    }
    return gross
  }

  describe('the stream is INERT under the reduce conditions (no perturbation of the M1–M5 anchors)', () => {
    it('an injected "both alive every year" stream is byte-identical to the static MFJ run (no transition ⇒ M5)', () => {
      const buckets = { taxable: 0, pretax: P, roth: 0 }
      const withStream = runTaxAwareDecumulation(buckets, realStock, realBond, [60_000, 60_000], STOCK_W, 'pre-tax-first', TAX_ON_NO_RMD, {
        ssBenefits: [50_000, 50_000],
        householdYears: [both1959, both1959],
      })
      const staticRun = runTaxAwareDecumulation(buckets, realStock, realBond, [60_000, 60_000], STOCK_W, 'pre-tax-first', TAX_ON_NO_RMD, {
        ssBenefits: [50_000, 50_000],
      })
      expect(withStream.terminalReal).toBe(staticRun.terminalReal)
      expect(withStream.depletionYear).toBe(staticRun.depletionYear)
    })

    it('a survivor-transition stream with tax OFF is byte-identical to the spine (the OFF anchor is unperturbed)', () => {
      const got = runTaxAwareDecumulation({ taxable: 0, pretax: P, roth: 0 }, realStock, realBond, [60_000, 60_000], STOCK_W, 'pre-tax-first', OFF, {
        householdYears: [both1959, survivor1959],
      })
      const sp = spine(P, [60_000, 60_000])
      expect(got.terminalReal).toBe(sp.terminalReal)
      expect(got.depletionYear).toBe(sp.depletionYear)
    })
  })

  describe('the widow torpedo: the survivor year taxes the SAME SS at the half-width SINGLE thresholds', () => {
    it('year 0 (both alive → MFJ) then year 1 (survivor → single) matches the per-year-resolved grosses', () => {
      // pre-tax-only, pre-tax-first, both 67 (no RMD) → each year nonSS = that year's gross. Same $40k SS
      // both years; the filing flips MFJ→single at the first death, so year 1 taxes MORE of the same SS
      // (single 25k/34k thresholds + the single deduction stack + count65 1) — the widow torpedo.
      const net = 50_000
      const ss = 40_000
      const pool = 2_000_000
      const stream = [both1959, survivor1959]
      const on = runTaxAwareDecumulation({ taxable: 0, pretax: pool, roth: 0 }, realStock, realBond, [net, net], STOCK_W, 'pre-tax-first', TAX_ON_NO_RMD, {
        ssBenefits: [ss, ss],
        householdYears: stream,
      })
      const g0 = solveGrossWithSS(net, ss, 'mfj', 2) // both alive
      const g1 = solveGrossWithSS(net, ss, 'single', 1) // survivor
      // non-vacuous: the single year genuinely taxes the same income MORE (else the flip proves nothing).
      expect(g1).toBeGreaterThan(g0)
      // correct per-year filing ⇒ overlay total === spine on [g0(mfj), g1(single)]. A model that stayed MFJ
      // in year 1 would use g0 again and diverge by ~$thousands (≫ the 1e-7 fixed-point epsilon).
      const ref = spine(pool, [g0, g1])
      expect(on.terminalReal).toBeCloseTo(ref.terminalReal, 2)
      expect(on.depletionYear).toBe(ref.depletionYear)
    })
  })

  describe('the aggregated pre-tax pool passes to the surviving spouse (RMD keys off the SURVIVOR’s age)', () => {
    it('a >RMD-age owner dies; the younger survivor inherits → the pool’s RMD PAUSES (relocates less than the static run)', () => {
      // owner born 1948 (age 78 at 2026 → RMD active), spouse born 1962 (age 64 → no RMD; band 75). Tax OFF,
      // RMD ON, pre-tax-only, no spend. Year 0: both alive → RMD on the owner (age 78), the forced excess
      // relocates pre-tax→taxable. Year 1: the survivor stream makes the YOUNG spouse (age 65 < 75) the pool
      // holder → RMD 0 (paused). The static run (no stream) keeps the dead owner as holder → year-1 RMD fires
      // again. So the survivor-aware run relocates strictly LESS — the spousal-rollover RMD-age switch.
      const PRETAX = 500_000
      const cfg: TaxOverlayConfig = { taxEnabled: false, rmdEnabled: true, household: mkHousehold(2026, 1948, 1962) }
      const buckets = { taxable: 0, pretax: PRETAX, roth: 0 }
      const survivorStream = [{ living: [{ birthYear: 1948 }, { birthYear: 1962 }] }, { living: [{ birthYear: 1962 }] }]
      const survived = runTaxAwareDecumulation(buckets, realStock, realBond, [0, 0], STOCK_W, 'pre-tax-first', cfg, { householdYears: survivorStream })
      const staticBoth = runTaxAwareDecumulation(buckets, realStock, realBond, [0, 0], STOCK_W, 'pre-tax-first', cfg)
      // year-0 RMD fired in BOTH (presence: the owner was 78) — the survivor run is non-vacuous...
      expect(survived.finalBuckets.taxable).toBeGreaterThan(0)
      // ...but the survivor run skipped year-1's forced distribution (the young heir is below RMD age) → less relocation.
      expect(survived.finalBuckets.taxable).toBeLessThan(staticBoth.finalBuckets.taxable)
      // tax OFF ⇒ both relocations are total-neutral, so the TOTAL is byte-identical to the spine in either case.
      const sp = spine(PRETAX, [0, 0])
      expect(survived.terminalReal).toBe(sp.terminalReal)
      expect(staticBoth.terminalReal).toBe(sp.terminalReal)
    })
  })
})

describe('taxOverlay — M6a bracket-fill (the injected tax-aware ceiling)', () => {
  const TAX_ON_NO_RMD: TaxOverlayConfig = { taxEnabled: true, rmdEnabled: false, household: mkHousehold(2026, 1959, 1959) }
  const RMD78: TaxOverlayConfig = { taxEnabled: true, rmdEnabled: true, household: mkHousehold(2026, 1948, 1950) }

  it('fills pre-tax only to the ceiling then draws tax-free → strictly LOWER lifetime tax than pre-tax-first', () => {
    // {pretax 1M, roth 1M}, both 67 (no RMD/SS), $100k spend, 5 years. The bracket-fill ceiling ($40k)
    // sits BELOW the $47,500 MFJ age-65 deduction, so the $40k of cheap pre-tax draw is taxed at $0 and
    // the remaining $60k comes from Roth tax-free → ZERO tax every year. pre-tax-first instead draws the
    // whole $100k from pre-tax → ordinary income far above the deduction → real tax leaves the portfolio.
    const buckets: AccountBuckets = { taxable: 0, pretax: 1_000_000, roth: 1_000_000 }
    const spend = Array.from({ length: 5 }, () => 100_000)
    const ceiling = Array.from({ length: 5 }, () => 40_000)
    const bf = runTaxAwareDecumulation(buckets, realStock, realBond, spend, STOCK_W, 'bracket-fill', TAX_ON_NO_RMD, { bracketFillCeilings: ceiling })
    const pf = runTaxAwareDecumulation(buckets, realStock, realBond, spend, STOCK_W, 'pre-tax-first', TAX_ON_NO_RMD)
    const sp = spine(2_000_000, spend)
    // the cheap $40k pre-tax draw is below the deduction → $0 tax every year → byte-identical to the spine...
    expect(bf.terminalReal).toBe(sp.terminalReal)
    // ...while pre-tax-first leaks real tax → strictly below. bracket-fill keeps more wealth: lower lifetime tax.
    expect(pf.terminalReal).toBeLessThan(sp.terminalReal)
    expect(bf.terminalReal).toBeGreaterThan(pf.terminalReal)
  })

  it('the RMD still forces ordinary income ABOVE the ceiling (the ceiling caps DISCRETIONARY draws only)', () => {
    // owner 78 → RMD ≈ 1.5M/22 ≈ 68k, far above a $20k ceiling. The forced distribution is non-discretionary,
    // so it is taxed in full regardless of the ceiling — bracket-fill cannot shelter a forced RMD. The run
    // therefore still ends BELOW the spine (the RMD bites), proving the ceiling does not suppress the RMD.
    const buckets: AccountBuckets = { taxable: 0, pretax: 1_500_000, roth: 500_000 }
    const spend = [40_000]
    const bf = runTaxAwareDecumulation(buckets, realStock, realBond, spend, STOCK_W, 'bracket-fill', RMD78, { bracketFillCeilings: [20_000] })
    const sp = spine(2_000_000, spend)
    expect(bf.terminalReal).toBeLessThan(sp.terminalReal) // the forced RMD income is taxed despite the low ceiling
    // and the RMD relocation still happened (forced excess pre-tax → taxable, beyond the $40k spend).
    expect(bf.finalBuckets.taxable).toBeGreaterThan(0)
  })

  it('an absent ceiling stream makes bracket-fill === pre-tax-first through the decumulation (the fallback)', () => {
    const buckets: AccountBuckets = { taxable: 0, pretax: 700_000, roth: 300_000 }
    const spend = flat(60_000)
    const bf = runTaxAwareDecumulation(buckets, realStock, realBond, spend, STOCK_W, 'bracket-fill', TAX_ON_NO_RMD)
    const pf = runTaxAwareDecumulation(buckets, realStock, realBond, spend, STOCK_W, 'pre-tax-first', TAX_ON_NO_RMD)
    expect(bf.terminalReal).toBe(pf.terminalReal)
    expect(bf.finalBuckets.pretax).toBe(pf.finalBuckets.pretax)
  })

  it('the gross-up converges under bracket-fill across the k≈0.74 corner (no fail-loud cap, insight 006/007)', () => {
    // A low ceiling forces the spill into a LOW-BASIS taxable pool (large realized gain straddling the
    // cap-gains breakpoints) while a large SS benefit keeps the torpedo live — the same worst-case corner
    // proportional reaches. If bracket-fill opened a HIGHER corner than the proven k≈0.74, the 128-pass cap
    // would throw here. (Roth last so the taxable spill — and its gain — is forced.)
    for (const pool of [2_000_000, 10_000_000, 50_000_000]) {
      for (const ss of [0, 1_000_000, 5_000_000]) {
        for (const ceiling of [0, 20_000]) {
          const buckets: AccountBuckets = { taxable: pool / 2, pretax: pool / 2, roth: 0 }
          expect(() =>
            runTaxAwareDecumulation(buckets, realStock, realBond, [0], STOCK_W, 'bracket-fill', TAX_ON_NO_RMD, {
              ssBenefits: [ss],
              initialTaxableBasis: 1, // basis ≈ 0 → the taxable spill is almost all realized gain
              bracketFillCeilings: [ceiling],
            }),
          ).not.toThrow()
        }
      }
    }
  })

  it('the SINGLE-filer survivor path converges across the same k≈0.74 corner (insight 006: prove, don’t assume)', () => {
    // The M4/M5 convergence sweeps were MFJ; the survivor files SINGLE. The single brackets are half-width
    // but the worst-case contraction is the SAME shape — top ordinary rate 0.37, the cap-gains 15→20% jump
    // 0.05, and the ×1.85 SS torpedo are all filing-INDEPENDENT, so k_sup ≈ 0.74 holds for single too. Rather
    // than trust that (insight 006: a probe can sample the wrong regime), drive the single-filer fixed point
    // through the small-net / low-basis / large-SS corner and confirm the 128-pass cap never throws.
    const single: TaxOverlayConfig = { taxEnabled: true, rmdEnabled: false, household: { startCalendarYear: 2026, filing: 'single', owner: { birthYear: 1959 } } }
    for (const pool of [2_000_000, 10_000_000, 50_000_000]) {
      for (const ss of [0, 1_000_000, 5_000_000]) {
        for (const conv of [0, 200_000]) {
          const buckets: AccountBuckets = { taxable: pool / 2, pretax: pool / 2, roth: 0 }
          expect(() =>
            runTaxAwareDecumulation(buckets, realStock, realBond, [0], STOCK_W, 'proportional', single, {
              ssBenefits: [ss],
              conversions: [conv],
              initialTaxableBasis: 1,
            }),
          ).not.toThrow()
        }
      }
    }
  })
})

describe('taxOverlay — M6b age-gap golden (Joint Life relief moves the after-tax outcome)', () => {
  it('one extra year of spouse-youth across the gap-11 threshold lowers forced tax → a strictly higher terminal', () => {
    // CLEAN ISOLATION of the Joint-Life switch. Both couples: owner 78 (born 1948), MFJ, and BOTH
    // spouses are 65+ (count65 = 2 → an IDENTICAL deduction stack), a large pre-tax pool with modest
    // spend so the RMD forces a TAXED distribution every year. The ONLY difference is the spouse's age
    // straddling the gap-11 threshold (so the divisor is the sole moving part):
    //   - JLLS couple: spouse 67 (born 1959) → gap 11 → Joint-Life divisor 22.7 (a SMALLER RMD)
    //   - ULT  couple: spouse 68 (born 1958) → gap 10 → Uniform Lifetime divisor 22.0 (a LARGER RMD)
    // So flat ULT OVERSTATES forced income for the age-gapped couple; the Joint-Life table relieves it,
    // and the relieved couple is taxed LESS and ends with strictly MORE (the ranking-relevant effect).
    const buckets: AccountBuckets = { taxable: 0, pretax: 2_000_000, roth: 0 }
    const spend = flat(40_000)
    const jllsCfg: TaxOverlayConfig = { taxEnabled: true, rmdEnabled: true, household: mkHousehold(2026, 1948, 1959) }
    const ultCfg: TaxOverlayConfig = { taxEnabled: true, rmdEnabled: true, household: mkHousehold(2026, 1948, 1958) }
    const jlls = runTaxAwareDecumulation(buckets, realStock, realBond, spend, STOCK_W, 'pre-tax-first', jllsCfg)
    const ult = runTaxAwareDecumulation(buckets, realStock, realBond, spend, STOCK_W, 'pre-tax-first', ultCfg)
    // Presence (burned/027): both actually paid RMD-forced tax — terminal BELOW the tax-free spine.
    const ref = spine(2_000_000, spend)
    expect(jlls.terminalReal).toBeLessThan(ref.terminalReal)
    expect(ult.terminalReal).toBeLessThan(ref.terminalReal)
    // The Joint-Life relief: the gap-11 couple forces less, is taxed less, and ends with STRICTLY MORE.
    expect(jlls.terminalReal).toBeGreaterThan(ult.terminalReal)
  })
})

describe('taxOverlay — M6b·B per-person pre-tax splitting', () => {
  // EQUIVALENCE GOLDEN: the per-person path with ALL pre-tax on the owner reduces byte-identically
  // to the aggregate M6a path — proving the pro-rata conversion/draw splits + the sub-ledger are
  // correct (x/x = 1 and 0/x = 0 are exact, so a single non-zero holder collapses cleanly).
  describe('all-on-owner per-person split is byte-identical to the aggregate pool', () => {
    const cfgRmd: TaxOverlayConfig = { taxEnabled: false, rmdEnabled: true, household: mkHousehold(2026, 1948, 1950) }
    const cfgTax: TaxOverlayConfig = { taxEnabled: true, rmdEnabled: true, household: mkHousehold(2026, 1948, 1950) }
    const cases: Array<{ name: string; cfg: TaxOverlayConfig; buckets: AccountBuckets; inputs: TaxYearInputs }> = [
      { name: 'rmd on, tax off', cfg: cfgRmd, buckets: { taxable: 0, pretax: 1_000_000, roth: 0 }, inputs: {} },
      {
        name: 'tax on + conversion + SS + taxable basis',
        cfg: cfgTax,
        buckets: { taxable: 200_000, pretax: 800_000, roth: 0 },
        inputs: { initialTaxableBasis: 50_000, conversions: flat(30_000), ssBenefits: flat(40_000) },
      },
    ]
    for (const { name, cfg, buckets, inputs } of cases) {
      it(name, () => {
        const spend = flat(50_000)
        const agg = runTaxAwareDecumulation(buckets, realStock, realBond, spend, STOCK_W, 'proportional', cfg, inputs)
        const per = runTaxAwareDecumulation(buckets, realStock, realBond, spend, STOCK_W, 'proportional', cfg, {
          ...inputs,
          initialPretaxByPerson: [buckets.pretax, 0],
        })
        // terminalReal/depletionYear come from the authoritative `state` → byte-identical (toBe).
        expect(per.terminalReal).toBe(agg.terminalReal)
        expect(per.depletionYear).toBe(agg.depletionYear)
        // The auxiliary ledger reconciles to the same buckets + basis.
        expect(per.finalBuckets.pretax).toBeCloseTo(agg.finalBuckets.pretax, 6)
        expect(per.finalBuckets.taxable).toBeCloseTo(agg.finalBuckets.taxable, 6)
        expect(per.finalTaxableBasis).toBeCloseTo(agg.finalTaxableBasis, 6)
      })
    }

    it('a single-person household per-person split [P] is byte-identical to the aggregate', () => {
      const cfg: TaxOverlayConfig = { taxEnabled: true, rmdEnabled: true, household: mkHousehold(2026, 1948) }
      const buckets: AccountBuckets = { taxable: 0, pretax: 1_000_000, roth: 0 }
      const spend = flat(50_000)
      const agg = runTaxAwareDecumulation(buckets, realStock, realBond, spend, STOCK_W, 'pre-tax-first', cfg, { ssBenefits: flat(30_000) })
      const per = runTaxAwareDecumulation(buckets, realStock, realBond, spend, STOCK_W, 'pre-tax-first', cfg, {
        ssBenefits: flat(30_000),
        initialPretaxByPerson: [1_000_000],
      })
      expect(per.terminalReal).toBe(agg.terminalReal)
      expect(per.depletionYear).toBe(agg.depletionYear)
    })

    it('rejects a per-person split that does not sum to the aggregate pre-tax (fail-loud, burned/062)', () => {
      expect(() =>
        runTaxAwareDecumulation({ taxable: 0, pretax: 1_000_000, roth: 0 }, realStock, realBond, [0], STOCK_W, 'proportional', cfgRmd, {
          initialPretaxByPerson: [600_000, 300_000], // sums to 900k, not 1M
        }),
      ).toThrow(/must sum to the aggregate pre-tax/)
    })

    it('the engine’s OWN backstop rejects a NaN per-person entry (a NaN survives the sum guard — insight 008)', () => {
      // [NaN, 1M] is length-2 + "sums" past the sum check (Math.abs(NaN − 1M) > tol is false). Without
      // the per-entry finiteness guard this NaN-poisons the ledger / throws uncaught mid-path. The engine
      // backstops it even though validateParams already shields simulate (a direct caller hits this).
      expect(() =>
        runTaxAwareDecumulation({ taxable: 0, pretax: 1_000_000, roth: 0 }, realStock, realBond, [0], STOCK_W, 'proportional', cfgRmd, {
          initialPretaxByPerson: [NaN, 1_000_000],
        }),
      ).toThrow(/finite and ≥ 0/)
    })

    it('rejects a NEGATIVE per-person entry even when the split sums correctly', () => {
      expect(() =>
        runTaxAwareDecumulation({ taxable: 0, pretax: 1_000_000, roth: 0 }, realStock, realBond, [0], STOCK_W, 'proportional', cfgRmd, {
          initialPretaxByPerson: [-100_000, 1_100_000], // sums to 1M but one entry < 0
        }),
      ).toThrow(/finite and ≥ 0/)
    })

    it('an all-on-owner per-person run that DEPLETES matches the aggregate depletion + zeroes the ledger', () => {
      // Small pool + heavy spend → depletes mid-horizon. All-on-owner must match the aggregate path
      // exactly (terminalReal 0, same depletionYear) and zero the per-person ledger (no NaN/desync leak).
      const buckets: AccountBuckets = { taxable: 0, pretax: 150_000, roth: 0 }
      const cfg: TaxOverlayConfig = { taxEnabled: true, rmdEnabled: true, household: mkHousehold(2026, 1948, 1950) }
      const spend = flat(60_000)
      const agg = runTaxAwareDecumulation(buckets, realStock, realBond, spend, STOCK_W, 'pre-tax-first', cfg)
      const per = runTaxAwareDecumulation(buckets, realStock, realBond, spend, STOCK_W, 'pre-tax-first', cfg, { initialPretaxByPerson: [150_000, 0] })
      expect(per.depletionYear).not.toBe(NEVER_DEPLETED) // presence: it actually depleted
      expect(per.depletionYear).toBe(agg.depletionYear)
      expect(per.terminalReal).toBe(agg.terminalReal)
      // The depleted-bucket shape carries the 4th (hsa) bucket since U3 · M5 — zeroed like its siblings.
      expect(per.finalBuckets).toEqual({ taxable: 0, pretax: 0, roth: 0, hsa: 0 })
    })

    it('rejects a TOTAL reference mismatch — a living set of fresh literals matching nobody (R19 fail-loud, not silent all-dead)', () => {
      const cfg: TaxOverlayConfig = { taxEnabled: false, rmdEnabled: true, household: mkHousehold(2026, 1948, 1962) }
      // Fresh literals — value-equal to the household but DISTINCT references → match nobody. Without the
      // guard this silently marks everyone dead → zero RMD forever (calm-but-wrong). It must fail loud.
      const mismatched: HouseholdYear[] = [{ living: [{ birthYear: 1948 }, { birthYear: 1962 }] }]
      expect(() =>
        runTaxAwareDecumulation({ taxable: 0, pretax: 2_000_000, roth: 0 }, realStock, realBond, [0], STOCK_W, 'proportional', cfg, {
          initialPretaxByPerson: [1_000_000, 1_000_000],
          householdYears: mismatched,
        }),
      ).toThrow(/not one of the household canonical people/)
    })

    it('rejects a PARTIAL reference mismatch — one real ref + one stranger (the backstop must catch more than the all-dead case)', () => {
      // The future P3/P4 DIRECT caller the backstop exists for could thread ONE correct OverlayPerson ref
      // and ONE distinct-but-equal object. The OLD guard (`!alive.some`) saw a live member and PASSED —
      // then silently rolled the "dead" spouse's IRA to the survivor and forced RMD on the wrong owner's
      // age/divisor (calm-but-wrong). The count-mismatch guard rejects it. (U3-exit code-review pilot.)
      const household = mkHousehold(2026, 1948, 1962)
      const cfg: TaxOverlayConfig = { taxEnabled: false, rmdEnabled: true, household }
      const partial: HouseholdYear[] = [{ living: [household.owner, { birthYear: 1962 }] }] // owner real, spouse a stranger
      expect(() =>
        runTaxAwareDecumulation({ taxable: 0, pretax: 2_000_000, roth: 0 }, realStock, realBond, [0], STOCK_W, 'proportional', cfg, {
          initialPretaxByPerson: [1_000_000, 1_000_000],
          householdYears: partial,
        }),
      ).toThrow(/not one of the household canonical people/)
    })
  })

  // The meatiest per-person branch: BOTH spouses RMD-active with DIFFERENT own-age divisors forcing
  // into the shared taxable bucket. Externally-derived (DND/012): the relocation is the SUM of each
  // own-age forced distribution, NOT the aggregate over-forcing on a single age.
  it('two RMD-active spouses each force on their OWN published divisor (DND/012)', () => {
    // owner 80 (born 1946) + spouse 76 (born 1950), BOTH past RMD age, each $1M. Beneficiaries: owner's
    // is spouse 76 (gap 4 → ULT), spouse's is owner 80 (older → ULT). Tax OFF, no spend, one year.
    const buckets: AccountBuckets = { taxable: 0, pretax: 2_000_000, roth: 0 }
    const cfg: TaxOverlayConfig = { taxEnabled: false, rmdEnabled: true, household: mkHousehold(2026, 1946, 1950) }
    const per = runTaxAwareDecumulation(buckets, realStock, realBond, [0], STOCK_W, 'proportional', cfg, {
      initialPretaxByPerson: [1_000_000, 1_000_000],
    })
    const agg = runTaxAwareDecumulation(buckets, realStock, realBond, [0], STOCK_W, 'proportional', cfg)
    // Independent expected relocation = $1M / Uniform-Lifetime(80) + $1M / Uniform-Lifetime(76).
    const expectedRelocated = 1_000_000 / ultDivisor(80) + 1_000_000 / ultDivisor(76)
    expect(per.finalBuckets.taxable / per.terminalReal).toBeCloseTo(expectedRelocated / 2_000_000, 10)
    // RMD-relocated dollars enter taxable at FULL basis — the two-holder spill is tracked.
    expect(per.finalTaxableBasis).toBeCloseTo(expectedRelocated, 4)
    // The aggregate over-forces the WHOLE $2M on the owner's age (ULT-80) → relocates strictly more.
    expect(agg.finalBuckets.taxable / agg.terminalReal).toBeCloseTo(1 / ultDivisor(80), 10)
    expect(per.finalBuckets.taxable).toBeLessThan(agg.finalBuckets.taxable)
    expect(per.terminalReal).toBe(spine(2_000_000, [0]).terminalReal) // tax off ⇒ total-neutral
  })

  it('bracket-fill composes with the per-person split — the buckets reconcile to the authoritative total', () => {
    const cfg: TaxOverlayConfig = { taxEnabled: true, rmdEnabled: true, household: mkHousehold(2026, 1948, 1958) }
    const buckets: AccountBuckets = { taxable: 0, pretax: 1_000_000, roth: 1_000_000 }
    const r = runTaxAwareDecumulation(buckets, realStock, realBond, flat(80_000), STOCK_W, 'bracket-fill', cfg, {
      initialPretaxByPerson: [600_000, 400_000],
      bracketFillCeilings: flat(30_000),
    })
    expect(Math.abs(totalAcrossBuckets(r.finalBuckets) - r.terminalReal)).toBeLessThan(1e-6 * r.terminalReal)
  })

  it('the per-person path converges within the 128-pass cap at the small-net / large-SS corner (insight 006)', () => {
    // The convergence math is filing-/attribution-independent (per-person rmd = Σ pretax_i/divisor_i ≤
    // pool/2.0, the same bound the aggregate sweeps probe), but lock it under the SPLIT path too.
    const cfg: TaxOverlayConfig = { taxEnabled: true, rmdEnabled: true, household: mkHousehold(2026, 1946, 1950) }
    for (const ss of [0, 1_000_000, 5_000_000]) {
      expect(() =>
        runTaxAwareDecumulation({ taxable: 1, pretax: 4_000_000, roth: 0 }, realStock, realBond, [0], STOCK_W, 'proportional', cfg, {
          initialPretaxByPerson: [2_000_000, 2_000_000],
          ssBenefits: [ss],
          initialTaxableBasis: 1,
        }),
      ).not.toThrow()
    }
  })

  // Each spouse's IRA RMDs on its OWN age: a younger spouse below their RMD age is NOT forced even
  // though the older spouse is — so per-person forces LESS than the aggregate pool, which over-forces
  // the WHOLE balance on the owner's age. (The owner's >10yr-younger beneficiary also gets JLLS.)
  it('per-person forces only the RMD-age spouse; the younger spouse pauses (vs the aggregate over-forcing)', () => {
    // owner 78 (born 1948, RMD age 72 → active), spouse 64 (born 1962, RMD age 75 → NOT active).
    // Each holds $1M pre-tax ($2M total). Tax OFF, RMD ON, no spend, one year → total-neutral.
    const buckets: AccountBuckets = { taxable: 0, pretax: 2_000_000, roth: 0 }
    const cfg: TaxOverlayConfig = { taxEnabled: false, rmdEnabled: true, household: mkHousehold(2026, 1948, 1962) }
    const per = runTaxAwareDecumulation(buckets, realStock, realBond, [0], STOCK_W, 'proportional', cfg, {
      initialPretaxByPerson: [1_000_000, 1_000_000],
    })
    const agg = runTaxAwareDecumulation(buckets, realStock, realBond, [0], STOCK_W, 'proportional', cfg)
    // Per-person relocates ONLY the owner's $1M ÷ JLLS(78,64)=24.8; the spouse's $1M pauses (64 < 75).
    expect(per.finalBuckets.taxable / per.terminalReal).toBeCloseTo(1_000_000 / 24.8 / 2_000_000, 10)
    // Aggregate over-forces the whole $2M on the owner's age → relocates twice as much.
    expect(agg.finalBuckets.taxable / agg.terminalReal).toBeCloseTo(2_000_000 / 24.8 / 2_000_000, 10)
    expect(per.finalBuckets.taxable).toBeLessThan(agg.finalBuckets.taxable)
    expect(per.terminalReal).toBe(spine(2_000_000, [0]).terminalReal) // tax off ⇒ total-neutral
  })

  // Spousal rollover: the RMD-age spouse dies; their IRA passes to the younger survivor (below their
  // own RMD age) → the RMD PAUSES, so the death run relocates strictly less than the both-alive run.
  it('a deceased spouse’s IRA rolls to the younger survivor → the RMD pauses', () => {
    const owner = { birthYear: 1948 } // 78 at 2026, RMD active
    const spouse = { birthYear: 1962 } // 64 at 2026, RMD age 75 → not active
    const cfg: TaxOverlayConfig = {
      taxEnabled: false,
      rmdEnabled: true,
      household: { startCalendarYear: 2026, filing: 'mfj', owner, spouse },
    }
    const buckets: AccountBuckets = { taxable: 0, pretax: 2_000_000, roth: 0 }
    const split = [1_000_000, 1_000_000]
    // Both alive 2 years (no stream): the owner RMDs both years; the young spouse never does.
    const bothAlive = runTaxAwareDecumulation(buckets, realStock, realBond, [0, 0], STOCK_W, 'proportional', cfg, {
      initialPretaxByPerson: split,
    })
    // Owner dies after year 0 (stream: [both, spouse-only]) — SAME refs as the household (identity).
    const stream: HouseholdYear[] = [{ living: [owner, spouse] }, { living: [spouse] }]
    const ownerDies = runTaxAwareDecumulation(buckets, realStock, realBond, [0, 0], STOCK_W, 'proportional', cfg, {
      initialPretaxByPerson: split,
      householdYears: stream,
    })
    expect(ownerDies.finalBuckets.taxable).toBeGreaterThan(0) // presence: year-0 RMD fired
    // The survivor inherited the owner's IRA but is below their own RMD age → year-1 forced dist pauses.
    expect(ownerDies.finalBuckets.taxable).toBeLessThan(bothAlive.finalBuckets.taxable)
    const ref = spine(2_000_000, [0, 0]).terminalReal
    expect(ownerDies.terminalReal).toBe(ref) // tax off ⇒ total-neutral
    expect(bothAlive.terminalReal).toBe(ref)
  })

  // The after-tax value (tax ON): per-person defers the younger spouse's forced income until THEY
  // reach their own RMD age, so it is taxed less in the early years → a strictly higher terminal than
  // the aggregate model, which over-forces the whole pool on the owner's age from year 0.
  it('per-person defers the younger spouse’s forced income → strictly higher terminal (tax on)', () => {
    // owner 78 (RMD active), spouse 68 (born 1958, RMD age 73 → starts mid-horizon). Each $1M.
    const cfg: TaxOverlayConfig = { taxEnabled: true, rmdEnabled: true, household: mkHousehold(2026, 1948, 1958) }
    const buckets: AccountBuckets = { taxable: 0, pretax: 2_000_000, roth: 0 }
    const spend = flat(40_000)
    const per = runTaxAwareDecumulation(buckets, realStock, realBond, spend, STOCK_W, 'pre-tax-first', cfg, {
      initialPretaxByPerson: [1_000_000, 1_000_000],
    })
    const agg = runTaxAwareDecumulation(buckets, realStock, realBond, spend, STOCK_W, 'pre-tax-first', cfg)
    const ref = spine(2_000_000, spend)
    expect(per.terminalReal).toBeLessThan(ref.terminalReal) // presence: paid RMD-forced tax
    expect(agg.terminalReal).toBeLessThan(ref.terminalReal)
    expect(per.terminalReal).toBeGreaterThan(agg.terminalReal) // deferral → less early tax → more
  })
})

// ===========================================================================
// U3 · M3 Slice 4 — the pre-65 ACA premium-funding overlay wired into the decumulation.
// The pure solver (solveAcaFundedGross) is exhaustively golden at the unit level
// (healthOverlay.test.ts); these pin the WIRING: the outer ACA fixed point wraps the inner tax
// gross-up, the net premium leaves the portfolio (presence), the AGE GATE suppresses ACA once every
// living member is ≥65 (never a phantom post-65 subsidy), the inert paths stay byte-identical, and
// healthcare-with-tax-off fails loud. (The integrated PTC-VALUE fixtures land in Slice 5.)
// ===========================================================================
describe('taxOverlay — M3 Slice 4: the pre-65 ACA overlay wired into runTaxAwareDecumulation', () => {
  const P = 1_000_000
  const yr3 = (a: number): number[] => [a, a, a]
  // A pre-65 couple (both born 1966 → age 60 at 2026, under 65 across a 3-year horizon) so the age
  // gate is OPEN; tax on, no RMD (age 60). A pretax-only pool drawn pre-tax-first ⇒ MAGI = the gross,
  // landing ≈ 55–65k = ~260–300% FPL (FPL2 = 21,150, cliff 84,600) → UNDER the cliff with a real PTC.
  const PRE65: TaxOverlayConfig = { taxEnabled: true, rmdEnabled: false, household: mkHousehold(2026, 1966, 1966) }
  // The same couple aged past 65 (both born 1950 → age 76), tax on, no RMD ⇒ the age gate is CLOSED.
  const POST65: TaxOverlayConfig = { taxEnabled: true, rmdEnabled: false, household: mkHousehold(2026, 1950, 1950) }
  const buckets: AccountBuckets = { taxable: 0, pretax: P, roth: 0 }
  const baseNet = yr3(40_000)
  const health = (over: Partial<TaxYearInputs> = {}): TaxYearInputs => ({
    healthcareEnabled: true,
    slcsp: yr3(15_000),
    enrolledPremium: yr3(15_000),
    // A low pre-sim IRMAA-MAGI seed (below tier 1) so a POST65/MIXED run prices only the base Part B
    // premium, no surcharge (M4). PRE65 runs (count65 = 0) never read it — the seed is inert there.
    irmaaMagiSeed: [60_000, 60_000],
    ...over,
  })

  describe('presence companion: a pre-65 household actually pays a net premium that leaves the portfolio', () => {
    it('healthcare ON funds a positive net premium (a real PTC applied) and ends BELOW the tax-only run', () => {
      const on = runTaxAwareDecumulation(buckets, realStock, realBond, baseNet, STOCK_W, 'pre-tax-first', PRE65, health())
      const off = runTaxAwareDecumulation(buckets, realStock, realBond, baseNet, STOCK_W, 'pre-tax-first', PRE65)
      // a real premium was paid (presence, non-vacuous)...
      expect(on.totalNetPremiumReal).toBeGreaterThan(0)
      // ...and a real PTC offset it — the net premium is STRICTLY BELOW the full enrolled (under-cliff)...
      expect(on.totalNetPremiumReal).toBeLessThan(3 * 15_000)
      // ...the premium (and its tax gross-up) left the portfolio → strictly below the tax-only run...
      expect(on.terminalReal).toBeLessThan(off.terminalReal)
      // ...and the tax-only run prices NOTHING.
      expect(off.totalNetPremiumReal).toBe(0)
    })
  })

  describe('AGE GATE (red-team blocker): ACA prices ONLY when ≥1 living member is pre-65', () => {
    it('an all-≥65 household gets NO ACA subsidy (the age gate) — and M4 IRMAA now carries the post-65 cost (the handoff at 65)', () => {
      // The ACA→IRMAA handoff: post-65 the ACA gate zeroes any PTC (no phantom post-65 subsidy), but the
      // income-aware cost does NOT vanish — IRMAA's base Medicare premium (+ surcharge) now funds instead.
      // (Pre-M4 this was byte-identical to the tax-only run; M4 makes the post-65 healthcare cost REAL.)
      const gated = runTaxAwareDecumulation(buckets, realStock, realBond, baseNet, STOCK_W, 'pre-tax-first', POST65, health())
      const taxOnly = runTaxAwareDecumulation(buckets, realStock, realBond, baseNet, STOCK_W, 'pre-tax-first', POST65)
      expect(gated.totalNetPremiumReal).toBe(0) // ACA age gate: no pre-65 marketplace subsidy
      expect(gated.totalMedicareCostReal).toBeGreaterThan(0) // ...but IRMAA Medicare cost now fires post-65
      expect(gated.terminalReal).toBeLessThan(taxOnly.terminalReal) // the Medicare cost (+ its tax) left the portfolio
    })

    it('non-vacuous: the SAME enrolled premium DOES price for the otherwise-identical pre-65 household (age is the only mover)', () => {
      const pre = runTaxAwareDecumulation(buckets, realStock, realBond, baseNet, STOCK_W, 'pre-tax-first', PRE65, health())
      const post = runTaxAwareDecumulation(buckets, realStock, realBond, baseNet, STOCK_W, 'pre-tax-first', POST65, health())
      expect(pre.totalNetPremiumReal).toBeGreaterThan(0) // pre-65 prices...
      expect(post.totalNetPremiumReal).toBe(0) // ...≥65 does not — the age gate is the only difference
    })

    it('a MIXED-age couple (one pre-65, one ≥65) STILL prices — the gate is "ANY pre-65 member", not "ALL pre-65"', () => {
      // owner 60 (born 1966, pre-65) + spouse 71 (born 1955, ≥65) → pre65 = livingCount(2) − count65(1) = 1
      // > 0, so ACA prices on the household-of-2 FPL. This is the gate's DISCRIMINATING case: a regression
      // to `count65 === 0` (ALL pre-65) would wrongly SUPPRESS a real subsidy here — the calm-but-wrong sin.
      const MIXED: TaxOverlayConfig = { taxEnabled: true, rmdEnabled: false, household: mkHousehold(2026, 1966, 1955) }
      const mixed = runTaxAwareDecumulation(buckets, realStock, realBond, baseNet, STOCK_W, 'pre-tax-first', MIXED, health())
      expect(mixed.totalNetPremiumReal).toBeGreaterThan(0)
    })
  })

  describe('inert paths stay byte-identical (the finiteness-FIRST predicate + healthcare-off)', () => {
    it('healthcareEnabled with an all-zero enrolled stream prices nothing → byte-identical to the tax-only run', () => {
      const z = runTaxAwareDecumulation(buckets, realStock, realBond, baseNet, STOCK_W, 'pre-tax-first', PRE65, health({ enrolledPremium: yr3(0) }))
      const off = runTaxAwareDecumulation(buckets, realStock, realBond, baseNet, STOCK_W, 'pre-tax-first', PRE65)
      expect(z.totalNetPremiumReal).toBe(0)
      expect(z.terminalReal).toBe(off.terminalReal)
    })

    it('healthcare streams PRESENT but disabled (tax OFF) are inert → byte-identical to the spine', () => {
      const got = runTaxAwareDecumulation(buckets, realStock, realBond, baseNet, STOCK_W, 'pre-tax-first', OFF, {
        slcsp: yr3(15_000),
        enrolledPremium: yr3(15_000),
      })
      const sp = spine(P, baseNet)
      expect(got.terminalReal).toBe(sp.terminalReal)
      expect(got.depletionYear).toBe(sp.depletionYear)
      expect(got.totalNetPremiumReal).toBe(0)
    })
  })

  describe('fail-loud backstops (burned/062)', () => {
    it('healthcareEnabled with tax OFF throws — ACA is MAGI-driven (the overlay backstop mirrors validateParams)', () => {
      expect(() =>
        runTaxAwareDecumulation(buckets, realStock, realBond, baseNet, STOCK_W, 'pre-tax-first', OFF, health()),
      ).toThrow(/healthcareEnabled requires taxEnabled/)
    })

    it('a MISSING benchmark (slcsp) in a priced year fails loud — never a silent phantom subsidy', () => {
      // enrolled > 0 in a pre-65 year, but no slcsp[t] ⇒ NaN reaches the solver's R19 backstop ⇒ throw.
      expect(() =>
        runTaxAwareDecumulation(buckets, realStock, realBond, baseNet, STOCK_W, 'pre-tax-first', PRE65, health({ slcsp: [] })),
      ).toThrow(/slcsp/)
    })

    it('a PRESENT non-finite/negative enrolled premium fails loud at the overlay backstop — never a silent un-priced drop', () => {
      // The direct-caller (P3/P4) backstop: a corrupt enrolled premium must THROW, not fall through the
      // per-year predicate to the no-ACA branch (which would understate cost → overstate survival). For
      // +Infinity especially, the predicate would otherwise suppress the solver's own throw. (validateParams
      // already shields `simulate`; this mirrors that guard for a direct caller — the BOTH-layers discipline.)
      for (const bad of [NaN, Infinity, -1]) {
        expect(() =>
          runTaxAwareDecumulation(buckets, realStock, realBond, baseNet, STOCK_W, 'pre-tax-first', PRE65, health({ enrolledPremium: yr3(bad) })),
        ).toThrow(/enrolledPremium/)
      }
    })

    it('a PRESENT non-finite/negative slcsp fails loud at the overlay backstop too (symmetric with enrolled)', () => {
      for (const bad of [NaN, Infinity, -1]) {
        expect(() =>
          runTaxAwareDecumulation(buckets, realStock, realBond, baseNet, STOCK_W, 'pre-tax-first', PRE65, health({ slcsp: yr3(bad) })),
        ).toThrow(/slcsp/)
      }
    })
  })
})

// ===========================================================================
// U3 · M3 Slice 5 — the INTEGRATED PTC value-correctness battery (the last M3 slice).
//
// Slice 4 pinned the WIRING (presence, age gate, reduce-to-spine, fail-loud); the pure ACA solver
// is golden against a SYNTHETIC fundNet in healthOverlay.test.ts. This battery proves the integrated
// path is VALUE-correct: the REAL inner tax gross-up (solveGrossWithdrawal) feeding the REAL ACA
// outer solve produces the right dollars end-to-end — calm-but-WRONG is the sin (CLAUDE.md), so the
// honesty bar is the externally-derived number, not "> 0".
//
// EXTERNALLY DERIVED (DND/012 + insight 009): every expected figure is hand-computed below from the
// published §36B PTC formula + the committed 2026 constants, by an INDEPENDENT path — never by
// re-running the engine. A golden computed via the engine's own formula proves typing, not correctness.
//
// THE READ-OFF TRICK. One pre-65 year with ZERO market returns makes `stepYear` an identity on the
// post-withdrawal total (afterWithdrawal × (1+0)), so `terminalReal === P − grossWithdrawal` EXACTLY
// (decumulation.ts: the `bond = afterWithdrawal − stock` complement avoids any split drift). The
// converged gross — hence the inner tax AND the funded net premium — is therefore read straight off
// the terminal, and `totalNetPremiumReal` is the single year's net premium directly. Two equations
// (terminalReal, totalNetPremiumReal) pin the whole nested fixed point.
//
// THE TAX REGIME (held constant across the battery). A pre-65 MFJ couple both born 1966 → age 60 at
// startCalendarYear 2026, so count65 = 0 and the deduction stack is a FLAT MFJ standard deduction
// $32,200 (no age-65 addition, no senior bonus — both gated on count65). FPL(2) = $21,150 (2025 HHS,
// household of 2) → 400% cliff = $84,600. pre65 = livingCount(2) − count65(0) = 2 ⇒ ACA prices.
// MFJ ordinary brackets: 10% to $24,800, then 12% to $100,800. A pretax-only pool drawn pre-tax-first
// makes ordinary income = the pre-tax distributed (+ any conversion), with NO SS and NO realized gain,
// so ACA-MAGI = grossWithdrawal (+ conversion). The gross-up fixed point gross = net + tax(gross) is
// solved exactly by hand within a single bracket; the ACA bisection then finds net premium = the §36B
// contribution (SLCSP = enrolled ⇒ netPremium = min(enrolled, applicable% × MAGI)).
// ===========================================================================
describe('taxOverlay — M3 Slice 5: the integrated PTC value-correctness battery (externally derived, DND/012)', () => {
  const P = 1_000_000
  // FPL is READ through the exported helper (single-source; never re-type the HHS base — copyGuard).
  const FPL2 = fplForHousehold(2) // 21,150 (2025 HHS, household of 2)
  const CLIFF = 4 * FPL2 // 400% cliff = 84,600 (derived, never stored)
  // Both born 1966 ⇒ age 60 at 2026 (pre-65, count65 = 0). MFJ. Tax on, RMD off. count65 = 0 ⇒ the
  // deduction stack is the flat 2026 MFJ standard deduction $32,200; MFJ brackets 10% to $24,800 then
  // 12% to $100,800 (all stated in each fixture's derivation comment; the engine reads them from
  // @engine/constants — they are never re-typed in executable test code).
  const PRE65: TaxOverlayConfig = { taxEnabled: true, rmdEnabled: false, household: mkHousehold(2026, 1966, 1966) }
  const PRETAX_ONLY: AccountBuckets = { taxable: 0, pretax: P, roth: 0 }
  const Z1 = [0] // one year, ZERO return ⇒ terminalReal = P − gross EXACTLY

  /** One pre-65 zero-return year. terminalReal = P − gross; totalNetPremiumReal = the year's net premium. */
  const oneYear = (baseNet: number, inputs: TaxYearInputs, cfg: TaxOverlayConfig = PRE65) =>
    runTaxAwareDecumulation(PRETAX_ONLY, Z1, Z1, [baseNet], STOCK_W, 'pre-tax-first', cfg, inputs)

  describe('the 4 externally-derived PTC fixtures through the INTEGRATED solver', () => {
    it('under-cliff-clean: MAGI = 250% FPL lands on the 8.44% band boundary → exact PTC, net premium, gross', () => {
      // MAGI = gross = 52,875 = 2.5 × 21,150 (250% FPL). applicable% = 8.44% (band [2.5,3.0] low,
      // exact boundary, no interpolation). contribution = 0.0844 × 52,875 = 4,462.65.
      // SLCSP = enrolled = 15,000 ⇒ PTC = 15,000 − 4,462.65 = 10,537.35, net premium = 4,462.65.
      // tax(52,875): taxable = 52,875 − 32,200 = 20,675 (≤ 24,800) → 10% → 2,067.50.
      // gross = net + tax where net = baseNet + netPremium ⇒ baseNet = 52,875 − 2,067.50 − 4,462.65 = 46,344.85.
      const r = oneYear(46_344.85, { healthcareEnabled: true, slcsp: [15_000], enrolledPremium: [15_000] })
      expect(r.totalNetPremiumReal).toBeCloseTo(4_462.65, 2) // ⇒ PTC = 15,000 − 4,462.65 = 10,537.35
      expect(r.terminalReal).toBeCloseTo(P - 52_875, 2) // gross = 52,875 (MAGI exactly 250% FPL, under the cliff)
    })

    it('interpolation-interior: MAGI = 175% FPL → the LINEARLY interpolated 5.395% contribution', () => {
      // MAGI = gross = 37,012.50 = 1.75 × 21,150 (175% FPL). Band [1.5,2.0], w = 0.5 →
      // applicable% = (4.19 + 0.5×(6.60−4.19))/100 = 5.395%. contribution = 0.05395 × 37,012.50 = 1,996.824375.
      // SLCSP = enrolled = 12,000 ⇒ PTC = 10,003.175625, net premium = 1,996.824375.
      // tax(37,012.50): taxable = 4,812.50 (≤ 24,800) → 10% → 481.25.
      // baseNet = 37,012.50 − 481.25 − 1,996.824375 = 34,534.425625.
      const r = oneYear(34_534.425625, { healthcareEnabled: true, slcsp: [12_000], enrolledPremium: [12_000] })
      expect(r.totalNetPremiumReal).toBeCloseTo(1_996.824375, 2)
      expect(r.terminalReal).toBeCloseTo(P - 37_012.5, 2)
    })

    it('cliff-pair: a household just-under vs over the 400% cliff — the subsidy vanishes discontinuously', () => {
      // UNDER: MAGI = gross = 84,000 (3.972× FPL, band [3.0,4.0] flat 9.96%). contribution =
      // 0.0996 × 84,000 = 8,366.40 < enrolled 20,000 ⇒ PTC = 11,633.60, net premium = 8,366.40.
      // tax(84,000): taxable = 51,800 → 2,480 + 0.12×27,000 = 5,720. baseNet = 84,000 − 5,720 − 8,366.40 = 69,913.60.
      const under = oneYear(69_913.6, { healthcareEnabled: true, slcsp: [20_000], enrolledPremium: [20_000] })
      expect(under.totalNetPremiumReal).toBeCloseTo(8_366.4, 2) // a REAL PTC (net premium ≪ enrolled)
      expect(under.terminalReal).toBeCloseTo(P - 84_000, 2)

      // OVER: baseNet 71,000 pushes the self-consistent under-cliff MAGI to ≈ 85,392 (> 84,600), so the
      // post-bisection feasibility check rejects it → the over-cliff (PTC = 0) solve funds the FULL
      // enrolled 20,000. gross = (71,000 + 20,000) + tax(gross); in the 12% band tax = 0.12·gross − 4,360
      // ⇒ 0.88·gross = 86,640 ⇒ gross = 98,454.5454…  (MAGI 98,454.55 — comfortably over the cliff).
      const over = oneYear(71_000, { healthcareEnabled: true, slcsp: [20_000], enrolledPremium: [20_000] })
      expect(over.totalNetPremiumReal).toBe(20_000) // PTC = 0 — the WHOLE subsidy is gone over the cliff
      expect(over.terminalReal).toBeCloseTo(P - 86_640 / 0.88, 2)
      // The discontinuity: a ~1,086 baseNet step erased an 11,633.60 PTC and dropped the terminal far
      // more than that step (lost subsidy + the extra tax-grossed-up withdrawal that funds the full premium).
      expect(under.terminalReal - over.terminalReal).toBeGreaterThan(11_633.6)
    })

    it('D6 inversion (the load-bearing test): a conversion that is cheap under tax-only goes net-NEGATIVE over the cliff', () => {
      // The case that justifies D6 (a disclosed omission INVERTS which strategy wins). A pretax→roth
      // conversion adds to ordinary income (so ACA-MAGI = gross + conversion) but is intra-portfolio —
      // only its TAX leaves — so the effective rate ON the conversion = (terminal drop)/(conversion bump).
      //
      // baseNet 40,000, SLCSP = enrolled = 18,000.
      //  BASELINE conversion 29,913.60 → MAGI = 84,000 (UNDER the cliff): netPremium = 0.0996×84,000 =
      //    8,366.40 (PTC 9,633.60); tax(84,000) = 5,720; gross = 40,000 + 8,366.40 + 5,720 = 54,086.40.
      //  BUMPED conversion 39,913.60 (= +10,000) → MAGI crosses the cliff → over-cliff (PTC 0), netPremium
      //    = full 18,000; gross = (40,000 + 18,000) + tax(MAGI), MAGI = gross + 39,913.60 ⇒ in the 12% band
      //    0.88·MAGI = 93,553.60 ⇒ MAGI = 106,310.909…, tax = 8,397.3091, gross = 66,397.3091.
      const conv = (c: number) =>
        oneYear(40_000, { healthcareEnabled: true, slcsp: [18_000], enrolledPremium: [18_000], conversions: [c] })
      const base = conv(29_913.6)
      const bumped = conv(39_913.6)
      expect(base.totalNetPremiumReal).toBeCloseTo(8_366.4, 2)
      expect(base.terminalReal).toBeCloseTo(P - 54_086.4, 2)
      expect(bumped.totalNetPremiumReal).toBe(18_000) // the cliff zeroed the PTC
      expect(bumped.terminalReal).toBeCloseTo(P - 66_397.30909, 2)

      // The healthcare-AWARE effective rate on the $10,000 conversion bump: terminal fell 12,310.91 →
      // 123.1% — the conversion DESTROYED 1.23× its face value (lost subsidy 9,633.60 + extra grossed-up
      // tax 2,677.31). > 100% = net-negative (the ">100% effective rate" the healthcare doc §line 73 names).
      const Δconv = 10_000
      const healthEffRate = (base.terminalReal - bumped.terminalReal) / Δconv
      expect(healthEffRate).toBeCloseTo(1.2310909, 4)
      expect(healthEffRate).toBeGreaterThan(1) // NET-NEGATIVE — the conversion is wealth-destroying

      // The INVERSION: the SAME two conversions under a tax-ONLY model (healthcare off) cost only the
      // gross-up tax = 12%/(1−12%) = 13.636% — a CHEAP, "good" conversion. tax-only terminals:
      //   c=29,913.60 → MAGI 74,492.727, tax 4,579.1273, gross 44,579.1273.
      //   c=39,913.60 → MAGI 85,856.364, tax 5,942.7636, gross 45,942.7636.
      const taxOnly = (c: number) => oneYear(40_000, { conversions: [c] }) // NO healthcare ⇒ tax-only
      const tBase = taxOnly(29_913.6)
      const tBumped = taxOnly(39_913.6)
      expect(tBase.terminalReal).toBeCloseTo(P - 44_579.12727, 2)
      expect(tBumped.terminalReal).toBeCloseTo(P - 45_942.76364, 2)
      const taxEffRate = (tBase.terminalReal - tBumped.terminalReal) / Δconv
      expect(taxEffRate).toBeCloseTo(0.1363636, 4)
      expect(taxEffRate).toBeLessThan(1) // CHEAP under tax-only — the ranking the cliff inverts

      // The omission inverts the ranking, it does not merely blunt the delta: 13.6% → 123.1% (a ~9× jump
      // across the boundary), tax-only-cheap flipping to healthcare-aware wealth-destroying.
      expect(healthEffRate).toBeGreaterThan(taxEffRate * 8)
    })
  })

  describe('survivor death shrinks the ACA household → the 400% cliff drops to FPL-of-1 (the untested inversion)', () => {
    // When a pre-65 spouse dies, resolveYear's livingCount falls 2→1, so taxOverlay feeds
    // fplForHousehold(1) to the ACA solve — the 400% cliff drops from 4×FPL2 = 84,600 to 4×FPL1 = 62,600.
    // A survivor whose MAGI sits in (62,600, 84,600] was subsidized as a couple but is now OVER the cliff
    // (PTC=0). The mechanism (taxOverlay.ts: fplForHousehold(regime.livingCount)) shipped in M3 Slice 4,
    // but NO test exercised a mid-horizon death with ACA on — surfaced by the U3-exit code-review pilot
    // (both the genuine ce:review run and the ultracode holistic pass converged on it). The cliff dollars
    // are derived from the committed FPL constants (never re-typed); the per-year premiums use the same
    // zero-return read-off + the proven cliff-pair UNDER fixture (MAGI 84,000) for the couple year.
    const FPL1 = fplForHousehold(1) // 15,650 (2025 HHS, household of 1)
    const CLIFF1 = 4 * FPL1 // single-survivor 400% cliff = 62,600 (derived, never stored)
    const SLCSP_ENR = 20_000

    it('the cliff dollar is survivor-aware: an 84,000 MAGI is UNDER the couple cliff but OVER the single cliff', () => {
      expect(CLIFF).toBeCloseTo(84_600, 2) // couple (FPL2) — defined at the Slice-5 head
      expect(CLIFF1).toBeCloseTo(62_600, 2) // survivor (FPL1)
      expect(84_000).toBeGreaterThan(CLIFF1) // the danger band: over the single cliff…
      expect(84_000).toBeLessThan(CLIFF) // …yet under the couple cliff
    })

    // COUPLE year (livingCount 2, static MFJ): the proven cliff-pair UNDER fixture — MAGI 84,000 < 84,600
    // ⇒ a REAL PTC (contribution 0.0996×84,000 = 8,366.40; gross 84,000).
    const coupleYr = () => oneYear(69_913.6, { healthcareEnabled: true, slcsp: [SLCSP_ENR], enrolledPremium: [SLCSP_ENR] })
    // SURVIVOR year (livingCount 1): SAME baseNet/streams, but a ONE-entry living set ⇒ resolveYear derives
    // single filing + livingCount 1 ⇒ cliff 62,600. baseNet 69,913.60 alone already exceeds 62,600, so MAGI
    // is over the single cliff at every premium ⇒ PTC=0 ⇒ the FULL enrolled is funded. (No per-person ledger
    // ⇒ the aliveCanonical reference guard does not fire, so a fresh birthYear stands in — as in the M6b tests.)
    const survivorYr = () =>
      runTaxAwareDecumulation(PRETAX_ONLY, Z1, Z1, [69_913.6], STOCK_W, 'pre-tax-first', PRE65, {
        healthcareEnabled: true,
        slcsp: [SLCSP_ENR],
        enrolledPremium: [SLCSP_ENR],
        householdYears: [{ living: [{ birthYear: 1966 }] }],
      })

    it('the SAME income subsidized as a couple goes PTC=0 as a survivor (the cliff inversion)', () => {
      const couple = coupleYr()
      const survivor = survivorYr()
      // couple: a real PTC — net premium ≪ enrolled (under the 84,600 cliff)
      expect(couple.totalNetPremiumReal).toBeCloseTo(8_366.4, 2)
      expect(couple.terminalReal).toBeCloseTo(P - 84_000, 2)
      // survivor: the subsidy VANISHES — the full enrolled premium is funded (over the 62,600 cliff)
      expect(survivor.totalNetPremiumReal).toBe(SLCSP_ENR)
      // non-vacuous: the survivor genuinely pays MORE for the identical spending (the inversion)
      expect(survivor.totalNetPremiumReal).toBeGreaterThan(couple.totalNetPremiumReal)
    })

    it('a mid-horizon death FLIPS the cliff within ONE run: year 0 (couple) subsidized, year 1 (survivor) full-premium', () => {
      // The transition the static fixtures cannot reach: a 2-year stream living [both]→[survivor].
      // resolveYear must switch fplForHousehold(2)→fplForHousehold(1) at the death year.
      const transition = runTaxAwareDecumulation(PRETAX_ONLY, [0, 0], [0, 0], [69_913.6, 69_913.6], STOCK_W, 'pre-tax-first', PRE65, {
        healthcareEnabled: true,
        slcsp: [SLCSP_ENR, SLCSP_ENR],
        enrolledPremium: [SLCSP_ENR, SLCSP_ENR],
        householdYears: [{ living: [{ birthYear: 1966 }, { birthYear: 1966 }] }, { living: [{ birthYear: 1966 }] }],
      })
      const couple = coupleYr()
      const survivor = survivorYr()
      // Decomposition (zero returns ⇒ each year reads independently; the huge pre-tax pool means year 1's
      // allocation is identical to the standalone survivor year): the run's net-premium total is EXACTLY the
      // couple-year PTC'd premium + the survivor-year FULL premium → proves the FPL household size switched
      // mid-run. A model that kept livingCount=2 in year 1 would still subsidize it (≪ 20,000).
      expect(transition.totalNetPremiumReal).toBeCloseTo(8_366.4 + SLCSP_ENR, 2)
      // terminal identity: P − gross0 − gross1 = coupleYr.terminal + survivorYr.terminal − P.
      expect(transition.terminalReal).toBeCloseTo(couple.terminalReal + survivor.terminalReal - P, 2)
    })
  })

  describe('near-cliff quantization: a sub-dollar MAGI wobble cannot flip the ceil-quantized branch', () => {
    // The cliff feasibility test is `Math.ceil(MAGI) > cliffMagi` with cliffMagi = 84,600 (an integer):
    // the decision lives on the DOLLAR grid while the ACA bisection converges sub-penny (ε = 1e-6), so
    // the cents of a near-cliff MAGI never move it across the integer boundary. (Conservative by design:
    // ceil errs toward "over" — never admits a strictly-over household as eligible; insight 010.)
    it('a household one DOLLAR under the cliff keeps the full subsidy (cents are quantized away)', () => {
      // MAGI = gross = 84,599 (ceil 84,599 ≤ 84,600 ⇒ eligible). contribution = 0.0996×84,599 = 8,426.0604.
      // tax(84,599): taxable 52,399 → 2,480 + 0.12×27,599 = 5,791.88. baseNet = 84,599 − 5,791.88 − 8,426.0604 = 70,381.0596.
      const r = oneYear(70_381.0596, { healthcareEnabled: true, slcsp: [20_000], enrolledPremium: [20_000] })
      expect(r.totalNetPremiumReal).toBeCloseTo(8_426.0604, 2) // eligible: net premium ≪ enrolled, NOT 20,000
      expect(r.terminalReal).toBeCloseTo(P - 84_599, 2)
      // Determinism at the edge (a draw/float desync would jitter): the same run repeats byte-identically.
      const again = oneYear(70_381.0596, { healthcareEnabled: true, slcsp: [20_000], enrolledPremium: [20_000] })
      expect(again.terminalReal).toBe(r.terminalReal)
      expect(again.totalNetPremiumReal).toBe(r.totalNetPremiumReal)
    })

    it('a household whose under-cliff MAGI lands ~10 dollars OVER flips to the no-subsidy branch', () => {
      // baseNet 70,389.644 ⇒ self-consistent under-cliff MAGI = (70,389.644 − 4,360)/0.7804 ≈ 84,610 > 84,600
      // ⇒ feasibility rejects ⇒ over-cliff (PTC 0, full enrolled). The boundary is sharp and correctly placed.
      const r = oneYear(70_389.644, { healthcareEnabled: true, slcsp: [20_000], enrolledPremium: [20_000] })
      expect(r.totalNetPremiumReal).toBe(20_000) // over-cliff: the whole subsidy is gone
    })
  })

  describe('enhanced-subsidy toggle: flipping the regime removes the cliff and changes the result', () => {
    it('a 500%-FPL household pays the full premium under the reverted cliff but is subsidised at a flat 8.5% when enhanced', () => {
      // SAME baseNet 88,431.25 and SAME enrolled 20,000 — only the regime toggle differs.
      //  REVERTED (cliff ON): MAGI is over 84,600 ⇒ over-cliff (PTC 0), full enrolled 20,000.
      //    gross = (88,431.25 + 20,000) + tax(gross); 12% band ⇒ 0.88·gross = 104,071.25 ⇒ gross = 118,262.784.
      //  ENHANCED (no cliff): the open top band caps the contribution at a flat 8.5% ABOVE 400% FPL.
      //    MAGI = gross = 105,750 (500% FPL): contribution = 0.085×105,750 = 8,988.75 (PTC 11,011.25),
      //    net premium = 8,988.75. tax(105,750) = 2,480 + 0.12×48,750 = 8,330. baseNet = 105,750 − 8,330 − 8,988.75 = 88,431.25. ✓
      const slcsp = [20_000]
      const enrolledPremium = [20_000]
      const reverted = oneYear(88_431.25, { healthcareEnabled: true, slcsp, enrolledPremium })
      const enhanced = oneYear(88_431.25, { healthcareEnabled: true, enhancedSubsidies: true, slcsp, enrolledPremium })

      expect(reverted.totalNetPremiumReal).toBe(20_000) // cliff regime: a 500%-FPL household gets nothing
      expect(reverted.terminalReal).toBeCloseTo(P - 104_071.25 / 0.88, 2)

      expect(enhanced.totalNetPremiumReal).toBeCloseTo(8_988.75, 2) // enhanced: a real PTC over 400% FPL
      expect(enhanced.terminalReal).toBeCloseTo(P - 105_750, 2)

      // The toggle MATTERS: flipping enhanced on rescued an 11,011.25 PTC and lifted the terminal.
      expect(enhanced.totalNetPremiumReal).toBeLessThan(reverted.totalNetPremiumReal)
      expect(enhanced.terminalReal).toBeGreaterThan(reverted.terminalReal)
      expect(reverted.totalNetPremiumReal - enhanced.totalNetPremiumReal).toBeCloseTo(11_011.25, 2)
    })
  })

  // Anchor: the FPL/cliff the battery's hand-derivations assume are the ones the engine reads (a
  // constants drift that shifted FPL would silently move every fixture). FPL2 is READ through
  // fplForHousehold (single-source) and the cliff is DERIVED — neither is a re-typed source figure.
  it('the FPL anchors the battery is built on match the canonical constants', () => {
    expect(FPL2).toBe(21_150) // fplForHousehold(2) — the 2025 HHS household-of-2 guideline
    expect(CLIFF).toBe(84_600) // 4.0 × FPL(2) — the 400% cliff the fixtures straddle
  })

  // U3-exit code-review pilot (correctness-2): totalNetPremiumReal accrues ONLY for a year the portfolio
  // actually funds. A priced pre-65 year that depletes (its grossed-up withdrawal — premium included —
  // exceeds the pool) must NOT count a premium the plan failed to pay (the accrual sits AFTER the
  // depletion check). Premiums are counted only while the plan is solvent.
  describe('totalNetPremiumReal does not over-accrue in a depletion year (correctness-2)', () => {
    const priced: TaxYearInputs = { healthcareEnabled: true, slcsp: [15_000], enrolledPremium: [15_000] }

    it('a priced pre-65 year that DEPLETES accrues NO premium (terminal 0, depletionYear 0)', () => {
      const small: AccountBuckets = { taxable: 0, pretax: 5_000, roth: 0 } // ≪ the 50,000 net + premium + tax
      const r = runTaxAwareDecumulation(small, [0], [0], [50_000], STOCK_W, 'pre-tax-first', PRE65, priced)
      expect(r.depletionYear).toBe(0) // presence: it actually depleted
      expect(r.terminalReal).toBe(0)
      expect(r.totalNetPremiumReal).toBe(0) // the un-fundable year's premium is NOT counted
    })

    it('the SAME priced year with a pool that SURVIVES does accrue its premium (the zero is the depletion, not a blanket suppression)', () => {
      const big: AccountBuckets = { taxable: 0, pretax: P, roth: 0 }
      const r = runTaxAwareDecumulation(big, [0], [0], [50_000], STOCK_W, 'pre-tax-first', PRE65, priced)
      expect(r.depletionYear).toBe(NEVER_DEPLETED)
      expect(r.totalNetPremiumReal).toBeGreaterThan(0)
    })
  })
})

// ===========================================================================
// U3 · M4 — the post-65 IRMAA 2-year-lagged feed-forward wired into runTaxAwareDecumulation.
//
// The pure surcharge step function is golden at the unit level (healthOverlay.test.ts M4). This
// battery proves the INTEGRATION: the year-t Medicare cost = base Part B premium + IRMAA surcharge
// (from IRMAA-MAGI[t−2]), funded inside the gross-up, accrued to totalMedicareCostReal. It pins the
// load-bearing M4 contracts a quick read would miss:
//   - the lag is EXACTLY 2 years (a year-0 conversion moves the surcharge at year 2, never 0/1) — insight 014;
//   - the surcharge keys off IRMAA-MAGI (TAXABLE SS), not ACA-MAGI (FULL SS) — the same dollars as SS
//     escape a surcharge that the same dollars as a conversion trigger (the TODO mandate);
//   - the survivor MFJ→single threshold flip is itself lagged +2yr (year t uses filing[t−2]) — insight 014;
//   - reduce-to-spine: with no Medicare-enrolled member the cost is 0 and the path is byte-identical.
//
// EXTERNALLY DERIVED (DND/012): the base premium + the per-tier surcharge are READ from the committed
// constants (re-typing a dated figure trips the copyGuard); the per-year-cost FORMULA (count × (base +
// surcharge) × 12) is the independent hand oracle, never `medicareAnnualCost` itself.
// ===========================================================================
describe('taxOverlay — M4: the post-65 IRMAA feed-forward (externally derived, DND/012)', () => {
  const PP = 2_000_000 // a big pretax pool — these multi-year runs never deplete
  const POOL: AccountBuckets = { taxable: 0, pretax: PP, roth: 0 }
  // Both born 1959 ⇒ age 67 at 2026 (Medicare-enrolled every year, count65 = 2). MFJ, tax on, RMD off
  // (67 < the 73 RMD-start age — no RMD to muddy MAGI). The healthcare cost is pure IRMAA (no pre-65
  // member ⇒ ACA never prices, so slcsp/enrolledPremium are omitted).
  const POST65: TaxOverlayConfig = { taxEnabled: true, rmdEnabled: false, household: mkHousehold(2026, 1959, 1959) }
  const IRMAA_SCHED = irmaa.value
  const BASE = partB2026.value.standardPremiumMonthly // read, never re-typed (copyGuard)
  const lowSeed = [60_000, 60_000] // pre-sim IRMAA-MAGI below tier 1 ⇒ base premium only, no surcharge
  // The independent hand oracle for one year's full Medicare cost: count × (base + surcharge) × 12.
  const surchargeMonthly = (tierIdx: number) =>
    IRMAA_SCHED.tiers[tierIdx]!.partBSurchargeMonthly + IRMAA_SCHED.tiers[tierIdx]!.partDSurchargeMonthly
  const medicareAnnual = (count: number, tierIdx: number | null) =>
    count * (BASE + (tierIdx === null ? 0 : surchargeMonthly(tierIdx))) * 12
  const run = (net: readonly number[], inputs: TaxYearInputs, cfg: TaxOverlayConfig = POST65) =>
    runTaxAwareDecumulation(POOL, realStock, realBond, net, STOCK_W, 'pre-tax-first', cfg, inputs)

  it('presence + value: a post-65 couple funds the base Part B premium (×2 enrolled, ×12) that leaves the portfolio', () => {
    const on = run([40_000], { healthcareEnabled: true, irmaaMagiSeed: lowSeed })
    const off = run([40_000], {})
    expect(on.totalMedicareCostReal).toBeCloseTo(medicareAnnual(2, null), 4) // 2 enrolled, base only (low seed)
    expect(on.terminalReal).toBeLessThan(off.terminalReal) // the cost (+ its tax gross-up) left the portfolio
    expect(off.totalMedicareCostReal).toBe(0) // healthcare off prices nothing (reduce-to-spine)
  })

  it('a high pre-sim seed drives the IRMAA surcharge: tier selected on the MFJ threshold, charged ×2 enrolled', () => {
    // seed[0] = $1 over the MFJ tier-1 threshold ⇒ tier 1 (lower-bound-exclusive), filing[t−2] = MFJ
    // (pre-sim, both alive), count65 = 2 ⇒ 2 × (base + tier-1 surcharge) × 12.
    const seedHi = [IRMAA_SCHED.tiers[0]!.mfjMagiThreshold + 1, 60_000]
    const r = run([40_000], { healthcareEnabled: true, irmaaMagiSeed: seedHi })
    expect(r.totalMedicareCostReal).toBeCloseTo(medicareAnnual(2, 0), 4)
  })

  it('the lag is EXACTLY 2 years: a year-0 conversion moves the surcharge at year 2, NEVER years 0 or 1 (insight 014)', () => {
    const bigConv = [IRMAA_SCHED.tiers[1]!.mfjMagiThreshold, 0, 0] // a year-0 conversion that lifts MAGI[0] over a tier
    const noConv = [0, 0, 0]
    const inputs = (conv: number[]): TaxYearInputs => ({ healthcareEnabled: true, irmaaMagiSeed: lowSeed, conversions: conv })
    // 2-year horizon: years 0,1 surcharge keys off the (low) SEED, never the conversion ⇒ BYTE-identical
    // Medicare cost with vs without the year-0 conversion. Proves there is no 0-lag and no 1-lag.
    expect(run([40_000, 40_000], inputs(bigConv)).totalMedicareCostReal).toBe(
      run([40_000, 40_000], inputs(noConv)).totalMedicareCostReal,
    )
    // 3-year horizon: year 2 reads IRMAA-MAGI[0], which the year-0 conversion pushed over a tier ⇒ strictly
    // MORE Medicare cost. The effect appears for the FIRST time at year 2 — the +2 lag, exactly.
    expect(run([40_000, 40_000, 40_000], inputs(bigConv)).totalMedicareCostReal).toBeGreaterThan(
      run([40_000, 40_000, 40_000], inputs(noConv)).totalMedicareCostReal,
    )
  })

  it('the surcharge keys off IRMAA-MAGI (TAXABLE SS), not ACA-MAGI (FULL SS): SS dollars escape a surcharge that conversion dollars trigger', () => {
    const bigSS = 240_000
    // Run SS: a large SS benefit. IRMAA-MAGI counts only the TAXABLE portion (≪ full benefit here — the
    // 85% cap is not even reached), so year-2's IRMAA-MAGI[0] ≈ a small ordinary draw + ~$100k taxable SS
    // ≈ $135k, well below the MFJ tier-1 threshold ($218k) ⇒ NO surcharge in any year (years 0,1 from the
    // low seed, year 2 from IRMAA-MAGI[0]). If the engine WRONGLY used ACA-MAGI = full SS, IRMAA-MAGI[0]
    // would be ≈ $275k (> $218k) and year 2 WOULD be surcharged — so the exact base-only total proves taxable-SS.
    const runSS = run([20_000, 20_000, 20_000], { healthcareEnabled: true, irmaaMagiSeed: lowSeed, ssBenefits: [bigSS, bigSS, bigSS] })
    // Run CONV: the SAME $240k delivered as a fully-ordinary year-0 Roth conversion ⇒ IRMAA-MAGI[0] ≫ $218k
    // ⇒ year 2 IS surcharged. The contrast isolates the SS treatment as the only mover.
    const runConv = run([20_000, 20_000, 20_000], { healthcareEnabled: true, irmaaMagiSeed: lowSeed, conversions: [bigSS, 0, 0] })
    expect(runSS.totalMedicareCostReal).toBeCloseTo(medicareAnnual(2, null) * 3, 4) // all 3 years base only — no surcharge
    expect(runConv.totalMedicareCostReal).toBeGreaterThan(runSS.totalMedicareCostReal) // the conversion DID trigger year 2
  })

  it('the survivor MFJ→single threshold flip is lagged +2yr: the widow(er)’s penalty lands at year d+2 (insight 014)', () => {
    // owner + spouse both born 1955 (age 71 at 2026, Medicare every year). The spouse dies at offset 2 ⇒
    // both alive years 0,1; the survivor (owner) alone from year 2. Filing[t] is MFJ years 0,1 then single.
    // The IRMAA threshold for year t uses filing[t−2], so the survivor is still MFJ-thresholded in years 2,3
    // and only flips to the (tighter) single thresholds at year 4 = d+2. A conversion in years 1 and 2 puts
    // IRMAA-MAGI[1] and IRMAA-MAGI[2] ≈ $150k — between the single tier-1 ($109k) and MFJ tier-1 ($218k)
    // thresholds. So year 3 (uses MAGI[1], MFJ-thresholded) is NOT surcharged, but year 4 (uses MAGI[2],
    // single-thresholded) IS — same income, only the threshold column moved, exactly 2 years after the death.
    const owner = { birthYear: 1955 }
    const spouse = { birthYear: 1955 }
    const cfg: TaxOverlayConfig = { taxEnabled: true, rmdEnabled: false, household: { startCalendarYear: 2026, filing: 'mfj', owner, spouse } }
    const living: HouseholdYear[] = [
      { living: [owner, spouse] }, // year 0
      { living: [owner, spouse] }, // year 1
      { living: [owner] }, // year 2 — spouse died at offset 2 (survivor files single from here)
      { living: [owner] }, // year 3
      { living: [owner] }, // year 4
    ]
    const inputs = (years: number): TaxYearInputs => ({
      healthcareEnabled: true,
      irmaaMagiSeed: lowSeed,
      conversions: [0, 90_000, 90_000, 0, 0].slice(0, years), // years 1,2 → MAGI[1],MAGI[2] ≈ $150k
      householdYears: living.slice(0, years),
    })
    const net = [40_000, 40_000, 40_000, 40_000, 40_000]
    const total = (years: number) => run(net.slice(0, years), inputs(years), cfg).totalMedicareCostReal
    // Isolate each year's Medicare cost by horizon differencing.
    const year3Cost = total(4) - total(3) // survivor, MFJ-thresholded (filing[1]) on MAGI[1] ≈ $150k < $218k
    const year4Cost = total(5) - total(4) // survivor, SINGLE-thresholded (filing[2]) on MAGI[2] ≈ $150k > $109k
    expect(year3Cost).toBeCloseTo(medicareAnnual(1, null), 4) // 1 survivor, NO surcharge (still MFJ-thresholded)
    expect(year4Cost).toBeGreaterThan(medicareAnnual(1, null)) // the single-threshold surcharge has now landed
    expect(year4Cost).toBeGreaterThan(year3Cost) // the widow(er)’s penalty — same income, +2yr after the death
  })

  it('reduce-to-spine + determinism: IRMAA is inert with healthcare off, and a healthcare-on run is byte-stable', () => {
    const off = run([40_000, 40_000], {})
    const spineRun = spine(PP, [40_000, 40_000])
    expect(off.totalMedicareCostReal).toBe(0)
    expect(off.terminalReal).toBeCloseTo(spineRun.terminalReal, 6) // tax-off + single-pool ⇒ the spine
    const a = run([40_000, 40_000], { healthcareEnabled: true, irmaaMagiSeed: lowSeed })
    const b = run([40_000, 40_000], { healthcareEnabled: true, irmaaMagiSeed: lowSeed })
    expect(a.totalMedicareCostReal).toBe(b.totalMedicareCostReal) // deterministic (zero draws)
    expect(a.terminalReal).toBe(b.terminalReal)
  })

  it('fail-loud (burned/062): a Medicare-enrolled early year with NO seed throws — never a default-0 phantom surcharge', () => {
    // POST65 both 67 ⇒ count65 = 2 in year 0, which needs IRMAA-MAGI[−2] = irmaaMagiSeed[0]. Absent ⇒ throw
    // (the direct-caller backstop; validateParams returns indeterminate for `simulate`). A default 0 would
    // zero the surcharge → understate cost → overstate survival (the cardinal calm-but-wrong sin).
    expect(() => run([40_000], { healthcareEnabled: true })).toThrow(/irmaaMagiSeed/)
    expect(() => run([40_000], { healthcareEnabled: true, irmaaMagiSeed: [Number.NaN, 60_000] })).toThrow(/irmaaMagiSeed|finite/)
  })

  // ---- U3·M4 holistic review (opus, 2026-06-07): close the test gaps the review + the break-the-code
  //      adversary surfaced. ALL are value-level regression guards on correct code (zero production bugs
  //      found); each is externally derived (DND/012). ----

  it('the per-year seed index is load-bearing: seed[0] bills year 0, seed[1] bills year 1 (a constant-first-seed regression fails here) — adversary', () => {
    // Distinct seeds: A is $1 over the MFJ tier-1 threshold ⇒ year 0 is surcharged at tier 1; B is below ⇒
    // year 1 is base-only. seed[0]→year0 (IRMAA-MAGI[−2]), seed[1]→year1 (IRMAA-MAGI[−1]). The only existing
    // distinct-valued seed fixture runs a 1-year horizon (reads seed[0] only) and every multi-year fixture
    // uses an EQUAL seed — so a regression reading seed[0] (or any wrong offset) for year 1 passes them all.
    const A = IRMAA_SCHED.tiers[0]!.mfjMagiThreshold + 1 // tier 1 (lower-bound-exclusive)
    const B = 60_000 // below tier 1 ⇒ base only
    const distinct: TaxYearInputs = { healthcareEnabled: true, irmaaMagiSeed: [A, B] }
    const year0 = run([40_000], distinct).totalMedicareCostReal
    const both = run([40_000, 40_000], distinct).totalMedicareCostReal
    expect(year0).toBeCloseTo(medicareAnnual(2, 0), 4) // seed[0] = A ⇒ tier 1 at year 0
    expect(both - year0).toBeCloseTo(medicareAnnual(2, null), 4) // seed[1] = B ⇒ base only at year 1
  })

  it('cross-65 feed-forward (the MAIN path, NO seed): a pre-65 year records the IRMAA-MAGI that bills the first post-65 surcharge 2 years later', () => {
    // Couple born 1963 ⇒ age 63,64 (pre-65, count65 = 0) in years 0,1 and 65 (count65 = 2) in year 2. No
    // seed: year 2's surcharge reads irmaaMagiHistory[0], RECORDED in the pre-65 year 0. A regression that
    // gated that recording on count65 > 0 would leave history[0] undefined ⇒ the year-2 backstop throws ⇒
    // this test fails loud. A $900k year-0 conversion makes IRMAA-MAGI[0] = gross + conversion ≥ the
    // conversion > $750k MFJ ⇒ the top tier (index 4) BY CONSTRUCTION, robust to the gross-up's tax detail.
    const cross: TaxOverlayConfig = { taxEnabled: true, rmdEnabled: false, household: mkHousehold(2026, 1963, 1963) }
    const inputs: TaxYearInputs = { healthcareEnabled: true, conversions: [900_000, 0, 0] } // NO irmaaMagiSeed
    const total = (years: number) => run([40_000, 40_000, 40_000].slice(0, years), inputs, cross).totalMedicareCostReal
    expect(total(2)).toBe(0) // years 0,1 pre-65 ⇒ zero Medicare cost (count65 = 0)
    expect(total(3) - total(2)).toBeCloseTo(medicareAnnual(2, 4), 4) // year 2: first surcharge, top tier, from pre-65 history[0]
  })

  it('the pre-65 ACA-priced year records IRMAA-MAGI off TAXABLE SS (the ACA branch uses irmaaMagi, not acaMagi), across the 65 handoff', () => {
    // Both born 1963 ⇒ years 0,1 pre-65 AND ACA-priced (enrolled premium present) ⇒ irmaaMagiHistory is
    // recorded via the ACA branch; year 2 both 65 ⇒ reads history[0]. A $240k benefit delivered as SS counts
    // only its TAXABLE portion in IRMAA-MAGI (≪ full) ⇒ a lower year-2 tier; the SAME dollars as a Roth
    // conversion are fully ordinary ⇒ a higher tier. If the ACA-branch recording wrongly used acaMagi (FULL
    // SS), the SS run's history[0] would equal the conversion run's and the two totals would TIE.
    const cross: TaxOverlayConfig = { taxEnabled: true, rmdEnabled: false, household: mkHousehold(2026, 1963, 1963) }
    const aca: TaxYearInputs = { healthcareEnabled: true, slcsp: [15_000, 15_000], enrolledPremium: [15_000, 15_000] }
    const bigSS = 240_000
    const runSS = run([20_000, 20_000, 20_000], { ...aca, ssBenefits: [bigSS, bigSS, bigSS] }, cross)
    const runConv = run([20_000, 20_000, 20_000], { ...aca, conversions: [bigSS, 0, 0] }, cross)
    // taxable-SS keeps the SS run at a lower IRMAA tier than the fully-ordinary conversion run; acaMagi would tie them.
    expect(runSS.totalMedicareCostReal).toBeLessThan(runConv.totalMedicareCostReal)
  })

  describe('totalMedicareCostReal does not over-accrue in a depletion year (the named landmine)', () => {
    it('a post-65 year that DEPLETES accrues NO Medicare cost (the accrual sits AFTER the depletion check)', () => {
      const small: AccountBuckets = { taxable: 0, pretax: 5_000, roth: 0 } // ≪ the 50,000 net + Medicare + tax
      const r = runTaxAwareDecumulation(small, [0], [0], [50_000], STOCK_W, 'pre-tax-first', POST65, {
        healthcareEnabled: true,
        irmaaMagiSeed: lowSeed,
      })
      expect(r.depletionYear).toBe(0) // presence: it actually depleted
      expect(r.totalMedicareCostReal).toBe(0) // the un-fundable year's Medicare cost is NOT counted
    })
    it('the SAME post-65 year with a pool that SURVIVES does accrue (the zero is the depletion, not blanket suppression)', () => {
      const r = runTaxAwareDecumulation(POOL, [0], [0], [50_000], STOCK_W, 'pre-tax-first', POST65, {
        healthcareEnabled: true,
        irmaaMagiSeed: lowSeed,
      })
      expect(r.depletionYear).toBe(NEVER_DEPLETED)
      expect(r.totalMedicareCostReal).toBeGreaterThan(0)
    })
  })
})

// ===========================================================================
// U3 · M5 — the HSA 4th bucket (SPEND side), Slice 1: the bucket TYPE rides the
// ledger. hsa is MEDICAL-EARMARKED: it shares the one market draw (contract #2)
// but is never a general drawdown source; absent/0 ⇒ byte-identical (reduce-to-
// spine, the as-we-go default). Spend mechanics land in the later M5 slices.
// ===========================================================================
describe('taxOverlay — M5 · Slice 1: the hsa bucket rides (reduce-to-spine + the general-depletion guard)', () => {
  describe('reduce-to-spine: an EXPLICIT hsa: 0 is byte-identical to the spine (the absent-hsa anchor is the untouched existing suite)', () => {
    const scenarios = [
      { name: 'survives', portfolio: 1_000_000, withdrawals: flat(40_000) },
      { name: 'depletes', portfolio: 150_000, withdrawals: flat(40_000) },
    ]
    for (const s of scenarios) {
      const expected = spine(s.portfolio, s.withdrawals)
      for (const policy of DRAWDOWN_POLICIES) {
        it(`${s.name} · pretax-only + hsa: 0 · ${policy} → identical terminal + depletion year`, () => {
          const got = runTaxAwareDecumulation(
            { taxable: 0, pretax: s.portfolio, roth: 0, hsa: 0 },
            realStock,
            realBond,
            s.withdrawals,
            STOCK_W,
            policy,
            OFF,
          )
          expect(got.terminalReal).toBe(expected.terminalReal)
          expect(got.depletionYear).toBe(expected.depletionYear)
        })
      }
    }
  })

  describe('a riding hsa > 0 shares the ONE market draw and is untouched by general draws', () => {
    const G = 1_000_000
    const HSA = 120_000
    const W = flat(40_000)

    it('decomposition: terminal(general + hsa) === terminal(general-only) + the grown hsa (presence companion: it genuinely grew)', () => {
      // Same draws funded from the same general pool; the hsa rides untouched. The general
      // trajectory is therefore IDENTICAL (same stepYear inputs year-for-year is false — the
      // authoritative total includes hsa — but the LEDGER decomposes exactly: every general
      // bucket evolves on drawn-vs-scale arithmetic whose inputs match the general-only run,
      // and the hsa grows by the same shared factor). Pin the decomposition through the API:
      const withHsa = runTaxAwareDecumulation(
        { taxable: 0, pretax: G, roth: 0, hsa: HSA },
        realStock, realBond, W, STOCK_W, 'pre-tax-first', OFF,
      )
      const generalOnly = runTaxAwareDecumulation(
        { taxable: 0, pretax: G, roth: 0 },
        realStock, realBond, W, STOCK_W, 'pre-tax-first', OFF,
      )
      // The hsa grew by the cumulative shared blended factor = a zero-withdrawal spine on HSA alone
      // (each year: rebalance to w, grow by the blended return — the same one-draw factor every
      // bucket shares; an hsa-specific return assumption would break this identity).
      const grownHsa = spine(HSA, flat(0)).terminalReal
      expect(withHsa.depletionYear).toBe(generalOnly.depletionYear)
      expect(withHsa.finalBuckets.hsa).toBeGreaterThan(HSA) // presence: it actually grew (returns are net-positive)
      expect(Math.abs((withHsa.finalBuckets.hsa ?? NaN) / grownHsa - 1)).toBeLessThan(1e-9)
      expect(Math.abs(withHsa.terminalReal / (generalOnly.terminalReal + grownHsa) - 1)).toBeLessThan(1e-9)
      // and the general buckets match the general-only run (the draws never touched hsa):
      expect(Math.abs((withHsa.finalBuckets.pretax || 0) / (generalOnly.finalBuckets.pretax || 1) - 1)).toBeLessThan(1e-9)
    })

    it('tax ON: the riding hsa changes NOTHING about the taxed general trajectory (decomposes identically)', () => {
      const cfg: TaxOverlayConfig = { taxEnabled: true, rmdEnabled: false, household: mkHousehold(2026, 1966, 1968) }
      // tax ON + hsa > 0 requires the owner identity (Slice 2). With NO oopMedical stream and
      // healthcare OFF (no Medicare cost priced — medicareCost = 0 even after the owner turns 65
      // at t = 5), the qualified cap is 0 every year: the hsa rides untouched, so the OFF-arm
      // decomposition identity must hold under tax too.
      const withHsa = runTaxAwareDecumulation(
        { taxable: 0, pretax: G, roth: 0, hsa: HSA },
        realStock, realBond, W, STOCK_W, 'pre-tax-first', cfg, { hsaOwnerIndex: 0 },
      )
      const generalOnly = runTaxAwareDecumulation(
        { taxable: 0, pretax: G, roth: 0 },
        realStock, realBond, W, STOCK_W, 'pre-tax-first', cfg,
      )
      const grownHsa = spine(HSA, flat(0)).terminalReal
      expect(withHsa.depletionYear).toBe(generalOnly.depletionYear)
      expect(Math.abs(withHsa.terminalReal / (generalOnly.terminalReal + grownHsa) - 1)).toBeLessThan(1e-9)
    })
  })

  describe('the GENERAL-DEPLETION guard: a fat hsa can never fund general spending (the M5 laundering bug discriminator)', () => {
    it('general pool exhausted + fat hsa ⇒ DEPLETED (stranded hsa forfeited, the conservative direction)', () => {
      // year 0: gross need 60k > generalDrawable 50k, while the hsa-inclusive total (1.05M) could
      // "afford" it — a laundering implementation (no guard) survives for years on HSA dollars.
      const r = runTaxAwareDecumulation(
        { taxable: 50_000, pretax: 0, roth: 0, hsa: 1_000_000 },
        realStock, realBond, flat(60_000), STOCK_W, 'taxable-first', OFF,
      )
      expect(r.depletionYear).toBe(0)
      expect(r.terminalReal).toBe(0)
      expect(r.finalBuckets).toEqual({ taxable: 0, pretax: 0, roth: 0, hsa: 0 })
    })

    it('control arm: the SAME dollars all-general survives — the depletion above came from the split, not the total', () => {
      const r = runTaxAwareDecumulation(
        { taxable: 1_050_000, pretax: 0, roth: 0 },
        realStock, realBond, flat(60_000), STOCK_W, 'taxable-first', OFF,
      )
      expect(r.depletionYear).toBe(NEVER_DEPLETED)
    })

    it('the exact-exhaustion year is still fundable (strict >, not ≥) and depletion lands the NEXT year', () => {
      // year 0 draws the general pool to exactly 0 (no growth applied to a zeroed bucket);
      // year 1 then has gross 1 > general 0 ⇒ depleted at t = 1 with the hsa still riding.
      const r = runTaxAwareDecumulation(
        { taxable: 60_000, pretax: 0, roth: 0, hsa: 100_000 },
        realStock, realBond, [60_000, 1, 1], STOCK_W, 'taxable-first', OFF,
      )
      expect(r.depletionYear).toBe(1)
    })
  })

  describe('R19 backstop (direct caller): a bad hsa fails LOUD at the overlay (mirror of validateParams)', () => {
    it('NaN / negative / Infinity hsa throws with the descriptive message (finiteness before any compare — insight 010)', () => {
      for (const bad of [NaN, -1, Infinity]) {
        expect(() =>
          runTaxAwareDecumulation(
            { taxable: 0, pretax: 100_000, roth: 0, hsa: bad },
            realStock, realBond, flat(10_000), STOCK_W, 'pre-tax-first', OFF,
          ),
        ).toThrow(/hsa/)
      }
    })
  })
})

// ===========================================================================
// U3 · M5 · Slice 2 — the QUALIFIED-SPEND mechanics (externally derived, DND/012).
//
// THE READ-OFF TRICK (the M3 Slice-5 idiom): zero-return years make stepYear an
// identity on the post-outflow total, so terminalReal = P_total − Σ(gross + hsaSpend)
// EXACTLY, and the parallel surfaces read each year's figures directly. THE TAX
// REGIME mirrors M3 Slice 5: MFJ both born 1966 (age 60 at 2026, count65 = 0,
// flat $32,200 standard deduction; 10% to $24,800 taxable, then 12%) — every
// expected gross below is the hand-solved fixed point gross = fundingNet + tax(gross),
// never an engine re-run.
// ===========================================================================
describe('taxOverlay — M5 · Slice 2: qualified HSA spend (cap-only stream, MAGI-invisible funding)', () => {
  const G = 1_000_000
  const PRE65: TaxOverlayConfig = { taxEnabled: true, rmdEnabled: false, household: mkHousehold(2026, 1966, 1966) }

  it('the headline: HSA pays the OOP, the gross-up funds ONLY the rest — the medical never enters the tax base', () => {
    // baseNet 60,000, oop 10,000, hsa 50,000 (owner 0, under 65 — privilege closed, but OOP is
    // qualified at any age). hsaSpend = min(50,000, 10,000 + 0, 60,000) = 10,000.
    // fundingNet = 60,000 − 10,000 = 50,000. Hand-solved gross-up (10% bracket):
    //   gross = 50,000 + 0.10 × (gross − 32,200)  ⇒  0.9·gross = 46,780  ⇒  gross = 51,977.77̄
    //   (taxable 19,777.78 ≤ 24,800 ✓ — the bracket assumption holds).
    // Year outflow = gross + hsaSpend; terminal = (G + 50,000) − gross − 10,000.
    const r = runTaxAwareDecumulation(
      { taxable: 0, pretax: G, roth: 0, hsa: 50_000 },
      [0], [0], [60_000], STOCK_W, 'pre-tax-first', PRE65,
      { oopMedical: [10_000], hsaOwnerIndex: 0 },
    )
    const gross = 46_780 / 0.9
    expect(r.terminalReal).toBeCloseTo(G + 50_000 - gross - 10_000, 6)
    expect(r.totalQualifiedHsaSpendReal).toBe(10_000)
    expect(r.finalBuckets.hsa).toBeCloseTo(40_000, 6) // (50,000 − 10,000) × scale-of-1 (zero returns)
    expect(r.depletionYear).toBe(NEVER_DEPLETED)
  })

  it('control arm: the SAME spending with hsa = 0 grosses up the FULL 60,000 — and crosses into the 12% bracket', () => {
    // fundingNet = 60,000 (no HSA). 10%-bracket solve gives taxable 30,888.89 > 24,800 — REJECTED;
    // 12% bracket: gross = 60,000 + 2,480 + 0.12 × (gross − 57,000) ⇒ 0.88·gross = 55,640
    // ⇒ gross = 63,227.27̄  (taxable 31,027.27 in the 12% band ✓).
    // The 11,249.49 gross gap vs the HSA arm IS the MAGI-invisibility dividend made visible.
    const r = runTaxAwareDecumulation(
      { taxable: 0, pretax: G, roth: 0 },
      [0], [0], [60_000], STOCK_W, 'pre-tax-first', PRE65,
      { oopMedical: [10_000] }, // present but INERT at hsa = 0 (cap-only)
    )
    expect(r.terminalReal).toBeCloseTo(G - 55_640 / 0.88, 6)
    expect(r.totalQualifiedHsaSpendReal).toBe(0)
  })

  it('cap-only is FALSIFIABLE: at hsa = 0 an OOP-bearing year is BYTE-IDENTICAL to the OOP-absent year (a fundingNet-joined arm fails)', () => {
    const mk = (inputs: TaxYearInputs) =>
      runTaxAwareDecumulation(
        { taxable: 0, pretax: G, roth: 0, hsa: 0 },
        realStock, realBond, flat(60_000), STOCK_W, 'pre-tax-first', PRE65, inputs,
      )
    const withOop = mk({ oopMedical: flat(10_000) })
    const without = mk({})
    expect(withOop.terminalReal).toBe(without.terminalReal) // byte-identical — the stream sizes a cap, never the need
    expect(withOop.depletionYear).toBe(without.depletionYear)
    expect(withOop.totalQualifiedHsaSpendReal).toBe(0)
  })

  it('the prior-year-end balance is the cap base: a 15,000 HSA against 10,000/yr OOP spends 10,000 then 5,000 (the 2-year recurrence)', () => {
    // y0: spend min(15,000, 10,000, 60,000) = 10,000 → fundingNet 50,000 → gross 51,977.77̄ (above).
    // y0-end hsa = 5,000 (zero growth). y1: spend min(5,000, 10,000, 60,000) = 5,000 — the BALANCE
    // binds (a fixed-initial-balance bug would spend 10,000 again); fundingNet = 55,000 → 12% band:
    //   0.88·gross = 55,000 + 2,480 − 6,840 = 50,640 ⇒ gross = 57,545.45̄  (taxable 25,345.45 ✓).
    const r = runTaxAwareDecumulation(
      { taxable: 0, pretax: G, roth: 0, hsa: 15_000 },
      [0, 0], [0, 0], [60_000, 60_000], STOCK_W, 'pre-tax-first', PRE65,
      { oopMedical: [10_000, 10_000], hsaOwnerIndex: 0 },
    )
    const gross0 = 46_780 / 0.9
    const gross1 = 50_640 / 0.88
    expect(r.totalQualifiedHsaSpendReal).toBe(15_000)
    expect(r.finalBuckets.hsa).toBeCloseTo(0, 8)
    expect(r.terminalReal).toBeCloseTo(G + 15_000 - (gross0 + 10_000) - (gross1 + 5_000), 6)
  })

  it('the oopMedical stream is read PER-YEAR, aligned to netWithdrawals ([0, 0, X] spends in year 2 only)', () => {
    // y0/y1: no OOP ⇒ no spend ⇒ gross 63,227.27̄ each (the control-arm solve). y2: spend 10,000 ⇒
    // gross 51,977.77̄. A [t]→[0] indexing bug (or a constant-stream read) fails the terminal.
    const r = runTaxAwareDecumulation(
      { taxable: 0, pretax: G, roth: 0, hsa: 50_000 },
      [0, 0, 0], [0, 0, 0], [60_000, 60_000, 60_000], STOCK_W, 'pre-tax-first', PRE65,
      { oopMedical: [0, 0, 10_000], hsaOwnerIndex: 0 },
    )
    const grossNoSpend = 55_640 / 0.88
    const grossSpend = 46_780 / 0.9
    expect(r.totalQualifiedHsaSpendReal).toBe(10_000)
    expect(r.terminalReal).toBeCloseTo(G + 50_000 - 2 * grossNoSpend - (grossSpend + 10_000), 6)
  })

  it('the ACA loop-breaker: HSA-funded medical adds 10,000 of REAL spending without moving MAGI or the premium', () => {
    // CONTROL = the M3 under-cliff-clean fixture verbatim: baseNet 46,344.85, slcsp = enrolled =
    // 15,000 → MAGI 52,875 (250% FPL exactly), net premium 4,462.65, gross 52,875.
    // HSA ARM: baseNet 56,344.85 (10,000 MORE real spending) + oop 10,000 paid by the HSA ⇒
    // fundingNet = 46,344.85 — the IDENTICAL inner problem ⇒ the SAME MAGI 52,875 and the SAME
    // 4,462.65 net premium. The household spent 10,000 more with ZERO subsidy cost — the
    // loop-breaking lever (research §4a: HSA spending counts toward NEITHER MAGI).
    const control = runTaxAwareDecumulation(
      { taxable: 0, pretax: G, roth: 0 },
      [0], [0], [46_344.85], STOCK_W, 'pre-tax-first', PRE65,
      { healthcareEnabled: true, slcsp: [15_000], enrolledPremium: [15_000] },
    )
    const hsaArm = runTaxAwareDecumulation(
      { taxable: 0, pretax: G, roth: 0, hsa: 50_000 },
      [0], [0], [56_344.85], STOCK_W, 'pre-tax-first', PRE65,
      { healthcareEnabled: true, slcsp: [15_000], enrolledPremium: [15_000], oopMedical: [10_000], hsaOwnerIndex: 0 },
    )
    expect(control.totalNetPremiumReal).toBeCloseTo(4_462.65, 2)
    expect(hsaArm.totalNetPremiumReal).toBeCloseTo(4_462.65, 2) // SAME premium — MAGI did not move
    expect(control.terminalReal).toBeCloseTo(G - 52_875, 2)
    expect(hsaArm.terminalReal).toBeCloseTo(G + 50_000 - 52_875 - 10_000, 2) // same gross + the hsa outflow
    expect(hsaArm.totalQualifiedHsaSpendReal).toBe(10_000)
  })

  describe('R19 (direct caller): the slice-2 inputs fail LOUD at the overlay backstop', () => {
    it('a NaN / negative / +Infinity oopMedical entry throws (a real dollar cost has no +Infinity sentinel)', () => {
      for (const bad of [NaN, -1, Infinity]) {
        expect(() =>
          runTaxAwareDecumulation(
            { taxable: 0, pretax: G, roth: 0, hsa: 10_000 },
            [0], [0], [40_000], STOCK_W, 'pre-tax-first', PRE65,
            { oopMedical: [bad], hsaOwnerIndex: 0 },
          ),
        ).toThrow(/oopMedical/)
      }
    })

    it('tax on + hsa > 0 with NO owner identity throws — a person-0 default is an in-range default (burned/062)', () => {
      expect(() =>
        runTaxAwareDecumulation(
          { taxable: 0, pretax: G, roth: 0, hsa: 10_000 },
          [0], [0], [40_000], STOCK_W, 'pre-tax-first', PRE65,
        ),
      ).toThrow(/hsaOwnerIndex/)
    })

    it('an out-of-range / non-integer owner index throws', () => {
      for (const bad of [-1, 2, 0.5]) {
        expect(() =>
          runTaxAwareDecumulation(
            { taxable: 0, pretax: G, roth: 0, hsa: 10_000 },
            [0], [0], [40_000], STOCK_W, 'pre-tax-first', PRE65,
            { hsaOwnerIndex: bad },
          ),
        ).toThrow(/hsaOwnerIndex/)
      }
    })

    it('hsa = 0 needs NO owner identity (the requirement keys to a live hsa, not the field family)', () => {
      expect(() =>
        runTaxAwareDecumulation(
          { taxable: 0, pretax: G, roth: 0, hsa: 0 },
          [0], [0], [40_000], STOCK_W, 'pre-tax-first', PRE65,
        ),
      ).not.toThrow()
    })
  })
})

// ===========================================================================
// U3 · M5 · Slices 3–4 — OWNER-AGE KEYING, the ACA-PREMIUM TRAP, and the
// LAUNDERING negative battery (externally derived, DND/012).
//
// THE DIFFERENCING IDENTITY (zero-return years): when the HSA pays the WHOLE
// Medicare cost, the gross-up solves the IDENTICAL fixed point as a healthcare-
// OFF run (fundingNet = net in both), so
//     terminal_withHsa − terminal_off = H − medicareCost      EXACTLY
// — no tax-table hand-derivation needed, and any gross-up drag (a planted arm
// that routes the premium through the taxable withdrawal) breaks the identity.
// The Medicare oracle is the M4 hand formula: count × (BASE + surcharge) × 12,
// with BASE read from the committed constant (copyGuard — never re-typed).
// ===========================================================================
describe('taxOverlay — M5 · Slices 3–4: owner-age keying, the ACA-premium trap, the laundering battery', () => {
  const P = 1_000_000
  const HSA = 100_000
  const BASE = partB2026.value.standardPremiumMonthly
  const lowSeed = [60_000, 60_000] // pre-sim IRMAA-MAGI below tier 1 ⇒ base premium only
  const Z1 = [0]

  describe('the owner-65+ Medicare-premium privilege (Pub 969 exception 4 — owner-age-keyed)', () => {
    // Both born 1959 ⇒ 67 at 2026: count65 = 2, Medicare cost = 2 × BASE × 12 (low seed, no surcharge).
    const BOTH67: TaxOverlayConfig = { taxEnabled: true, rmdEnabled: false, household: mkHousehold(2026, 1959, 1959) }
    const mc2 = 2 * BASE * 12

    it('owner 65+: the HSA pays the ENTIRE Medicare premium — the gross-up never sees it (the differencing identity)', () => {
      const withHsa = runTaxAwareDecumulation(
        { taxable: 0, pretax: P, roth: 0, hsa: HSA },
        Z1, Z1, [40_000], STOCK_W, 'pre-tax-first', BOTH67,
        { healthcareEnabled: true, irmaaMagiSeed: lowSeed, hsaOwnerIndex: 0 },
      )
      const off = runTaxAwareDecumulation(
        { taxable: 0, pretax: P, roth: 0 },
        Z1, Z1, [40_000], STOCK_W, 'pre-tax-first', BOTH67,
      )
      expect(withHsa.totalQualifiedHsaSpendReal).toBeCloseTo(mc2, 8) // EXACTLY the premium — never the 40k spending (laundering floor)
      expect(withHsa.totalMedicareCostReal).toBeCloseTo(mc2, 8) // the gross-cost surface still accrues the full bill
      expect(withHsa.terminalReal - off.terminalReal).toBeCloseTo(HSA - mc2, 6) // zero gross-up drag — HSA paid it all
      expect(withHsa.finalBuckets.hsa).toBeCloseTo(HSA - mc2, 6)
    })

    // The DISCRIMINATING PAIR (insight 015): an age-gap couple — owner born 1966 (60), spouse born
    // 1959 (67). count65 = 1 ⇒ Medicare cost = 1 × BASE × 12. ONLY the hsaOwnerIndex differs between
    // the two arms; a wrong-index (or rmdOwner-keyed, or any-member-65+) mutation fails one of them.
    const GAP: TaxOverlayConfig = { taxEnabled: true, rmdEnabled: false, household: mkHousehold(2026, 1966, 1959) }
    const mc1 = 1 * BASE * 12

    it('the UNDER-65 owner closes the privilege — a 65+ SPOUSE does not open it (the negative arm)', () => {
      const r = runTaxAwareDecumulation(
        { taxable: 0, pretax: P, roth: 0, hsa: HSA },
        Z1, Z1, [40_000], STOCK_W, 'pre-tax-first', GAP,
        { healthcareEnabled: true, irmaaMagiSeed: lowSeed, hsaOwnerIndex: 0 },
      )
      const noHsaSameBill = runTaxAwareDecumulation(
        { taxable: 0, pretax: P, roth: 0 },
        Z1, Z1, [40_000], STOCK_W, 'pre-tax-first', GAP,
        { healthcareEnabled: true, irmaaMagiSeed: lowSeed },
      )
      expect(r.totalQualifiedHsaSpendReal).toBe(0) // privilege CLOSED — the spouse's premium is not qualified
      expect(r.terminalReal - noHsaSameBill.terminalReal).toBeCloseTo(HSA, 6) // the hsa rode fully untouched
    })

    it('the SAME fixture with the 65+ spouse as OWNER opens it (the positive arm of the pair)', () => {
      const r = runTaxAwareDecumulation(
        { taxable: 0, pretax: P, roth: 0, hsa: HSA },
        Z1, Z1, [40_000], STOCK_W, 'pre-tax-first', GAP,
        { healthcareEnabled: true, irmaaMagiSeed: lowSeed, hsaOwnerIndex: 1 },
      )
      const off = runTaxAwareDecumulation(
        { taxable: 0, pretax: P, roth: 0 },
        Z1, Z1, [40_000], STOCK_W, 'pre-tax-first', GAP,
      )
      expect(r.totalQualifiedHsaSpendReal).toBeCloseTo(mc1, 8) // privilege OPEN via the owner's age
      expect(r.terminalReal - off.terminalReal).toBeCloseTo(HSA - mc1, 6) // the differencing identity again
    })

    it('SPOUSAL ROLLOVER re-keys the privilege at the death year (insight 014 — test the crossing, not the endpoints)', () => {
      // Person 0 born 1959 (67, Medicare every year); person 1 born 1966 (60) OWNS the HSA.
      // y0: owner(60) alive ⇒ privilege CLOSED ⇒ spend 0 (the bill is grossed up).
      // y1: the OWNER DIES ⇒ the HSA rolls to the 67yo survivor ⇒ privilege OPENS ⇒ spend = BASE×12.
      // A planted privilege-dies-with-the-owner arm yields 0; an always-open arm yields 2×BASE×12;
      // a rollover-to-wrong-person arm yields 0 — the single-year total discriminates all three.
      const cfg: TaxOverlayConfig = { taxEnabled: true, rmdEnabled: false, household: mkHousehold(2026, 1959, 1966) }
      const hh = cfg.taxEnabled ? cfg.household : (undefined as never)
      const years = [
        { living: [hh.owner, hh.spouse!] }, // y0: both alive (the SAME refs — the canonical-people contract)
        { living: [hh.owner] }, // y1: the HSA-owning spouse died
      ]
      const r = runTaxAwareDecumulation(
        { taxable: 0, pretax: P, roth: 0, hsa: HSA },
        [0, 0], [0, 0], [40_000, 40_000], STOCK_W, 'pre-tax-first', cfg,
        { healthcareEnabled: true, irmaaMagiSeed: lowSeed, hsaOwnerIndex: 1, householdYears: years },
      )
      expect(r.totalQualifiedHsaSpendReal).toBeCloseTo(1 * BASE * 12, 8) // y1 ONLY — the crossing year pinned
      expect(r.finalBuckets.hsa).toBeCloseTo(HSA - 1 * BASE * 12, 6)
    })
  })

  describe('the ACA-premium trap (wired): a fat HSA never touches the marketplace premium', () => {
    it('a priced ACA year funds the FULL net premium from the portfolio — HSA spend stays 0 (oop = 0, owner pre-65)', () => {
      // The M3 250%-FPL fixture + a fat HSA: MAGI 52,875, net premium 4,462.65 — UNCHANGED by the
      // HSA (a planted cap-includes-premium arm would pay 4,462.65 from the HSA and shift both
      // surfaces + the terminal). Both born 1966 (60) ⇒ count65 = 0, the M3 tax regime verbatim.
      const PRE65: TaxOverlayConfig = { taxEnabled: true, rmdEnabled: false, household: mkHousehold(2026, 1966, 1966) }
      const r = runTaxAwareDecumulation(
        { taxable: 0, pretax: P, roth: 0, hsa: HSA },
        Z1, Z1, [46_344.85], STOCK_W, 'pre-tax-first', PRE65,
        { healthcareEnabled: true, slcsp: [15_000], enrolledPremium: [15_000], hsaOwnerIndex: 0 },
      )
      expect(r.totalNetPremiumReal).toBeCloseTo(4_462.65, 2) // the §36B bill, fully portfolio-funded
      expect(r.totalQualifiedHsaSpendReal).toBe(0) // THE TRAP: the marketplace premium is not HSA-payable
      expect(r.terminalReal).toBeCloseTo(P + HSA - 52_875, 2) // gross unchanged; the hsa rode untouched
    })
  })
})

// ===========================================================================
// U3 · M5 · Slice 5 — the 4-bucket ledger reconciliation (the CRITICAL #1 guard
// extended to the hsa bucket) under EVERY policy with every mechanic live.
// ===========================================================================
describe('taxOverlay — M5 · Slice 5: Σ(4 buckets) === terminalReal under every policy with everything live', () => {
  // Market returns + RMD (born 1952 ⇒ RMD active) + conversions + SS + a live hsa draining against
  // a real OOP stream — the densest co-live configuration the overlay supports pre-M6.
  const cfg: TaxOverlayConfig = { taxEnabled: true, rmdEnabled: true, household: mkHousehold(2026, 1952, 1955) }
  const buckets: AccountBuckets = { taxable: 300_000, pretax: 500_000, roth: 150_000, hsa: 50_000 }
  const inputs: TaxYearInputs = {
    initialTaxableBasis: 200_000,
    conversions: flat(10_000),
    ssBenefits: flat(30_000),
    oopMedical: flat(6_000),
    hsaOwnerIndex: 0,
    healthcareEnabled: true,
    irmaaMagiSeed: [60_000, 60_000],
    // The per-person pre-tax ledger runs CO-LIVE with the hsa bucket (the M5 boundary review found
    // the combination — the realistic couple configuration — exercised by zero tests; sums to 500k).
    initialPretaxByPerson: [350_000, 150_000],
  }

  for (const policy of DRAWDOWN_POLICIES) {
    it(`${policy}: the 4-bucket sum reconciles to the terminal and no bucket goes negative`, () => {
      const got = runTaxAwareDecumulation(buckets, realStock, realBond, flat(45_000), STOCK_W, policy, cfg, inputs)
      // The fixture is sized to SURVIVE — assert it, so the reconciliation can never go silently
      // vacuous behind a depletion branch (the M5 boundary review caught the unguarded `if`).
      expect(got.depletionYear).toBe(NEVER_DEPLETED)
      expect(Math.abs(totalAcrossBuckets(got.finalBuckets) / got.terminalReal - 1)).toBeLessThan(1e-9)
      expect(got.finalBuckets.taxable).toBeGreaterThanOrEqual(0)
      expect(got.finalBuckets.pretax).toBeGreaterThanOrEqual(0)
      expect(got.finalBuckets.roth).toBeGreaterThanOrEqual(0)
      expect(got.finalBuckets.hsa ?? 0).toBeGreaterThanOrEqual(0)
      // presence (burned/027): the hsa genuinely spent against the OOP stream (non-vacuous sweep)
      expect(got.totalQualifiedHsaSpendReal).toBeGreaterThan(0)
    })
  }
})

// ===========================================================================
// U3 · M5 — the BOUNDARY-REVIEW battery (the ultramode pass on the M5 unit).
// Each test below closes a verified mutation-survival seam or crossing gap the
// review found: a wrong implementation that passed the pre-review green suite
// now fails a named fixture (insights 014/015).
// ===========================================================================
describe('taxOverlay — M5 boundary review: the verified seams', () => {
  const BASE = partB2026.value.standardPremiumMonthly
  const lowSeed = [60_000, 60_000]

  it('a GENERAL-DEPLETION year accrues NO totalQualifiedHsaSpendReal (the third parallel surface gets the sibling depletion test)', () => {
    // tax ON + live hsa + oop > 0, general pool too small for the year-0 gross: the spend WAS
    // computed (5,000) but the year is unfundable — the guard breaks BEFORE the accrual, so the
    // surface must read 0 (an inline accrual, or the guard moved below the accruals, fails here —
    // exactly the over-accrue class the totalNetPremiumReal / totalMedicareCostReal siblings pin).
    const cfg: TaxOverlayConfig = { taxEnabled: true, rmdEnabled: false, household: mkHousehold(2026, 1966, 1966) }
    const r = runTaxAwareDecumulation(
      { taxable: 10_000, pretax: 0, roth: 0, hsa: 100_000 },
      [0], [0], [30_000], STOCK_W, 'taxable-first', cfg,
      { oopMedical: [5_000], hsaOwnerIndex: 0, initialTaxableBasis: 10_000 },
    )
    expect(r.depletionYear).toBe(0)
    expect(r.terminalReal).toBe(0)
    expect(r.totalQualifiedHsaSpendReal).toBe(0) // the unfundable year paid nothing
    expect(r.totalNetPremiumReal).toBe(0)
    expect(r.totalMedicareCostReal).toBe(0)
  })

  it('the owner AGING INTO 65 mid-run opens the privilege at the birthday year (insight 014 — the third crossing)', () => {
    // Both born 1962 ⇒ 64 at t=0 (count65 = 0, no Medicare cost), 65 at t=1 (count65 = 2, the
    // privilege opens via the owner''s OWN birthday — no death involved). oop = 0 isolates the
    // premium component: y0 spend 0 (nothing priced), y1 spend = 2×BASE×12 (low seed, base only).
    // A frozen age-at-year-0 implementation (ownerIs65Plus hoisted out of the loop — the plausible
    // P4 hot-loop refactor) yields 0 and fails.
    const cfg: TaxOverlayConfig = { taxEnabled: true, rmdEnabled: false, household: mkHousehold(2026, 1962, 1962) }
    const r = runTaxAwareDecumulation(
      { taxable: 0, pretax: 1_000_000, roth: 0, hsa: 100_000 },
      [0, 0], [0, 0], [40_000, 40_000], STOCK_W, 'pre-tax-first', cfg,
      { healthcareEnabled: true, irmaaMagiSeed: lowSeed, hsaOwnerIndex: 0 },
    )
    const mc1 = 2 * BASE * 12
    expect(r.totalQualifiedHsaSpendReal).toBeCloseTo(mc1, 8) // year 1 ONLY — the crossing pinned
    expect(r.finalBuckets.hsa).toBeCloseTo(100_000 - mc1, 6)
  })

  it('fundingNeed includes the Medicare cost: a tiny-net heavy-medical year spends net + medicareCost, never just net', () => {
    // Both 67, net = 1,000 (an SS-covered household), oop = 50,000 (a heavy medical year),
    // hsa = 100,000. cap = oop + mc (owner 65+); fundingNeed = net + mc BINDS:
    // spend = 1,000 + 2×BASE×12. A `fundingNeed: net` mutation spends only 1,000 — the seam the
    // review found undiscriminated (every prior fixture had the clamp slack). fundingNet then = 0
    // ⇒ gross = 0 (nothing to tax) ⇒ terminal = P + H − spend exactly (zero returns).
    const cfg: TaxOverlayConfig = { taxEnabled: true, rmdEnabled: false, household: mkHousehold(2026, 1959, 1959) }
    const P = 1_000_000
    const r = runTaxAwareDecumulation(
      { taxable: 0, pretax: P, roth: 0, hsa: 100_000 },
      [0], [0], [1_000], STOCK_W, 'pre-tax-first', cfg,
      { healthcareEnabled: true, irmaaMagiSeed: lowSeed, oopMedical: [50_000], hsaOwnerIndex: 0 },
    )
    const spend = 1_000 + 2 * BASE * 12
    expect(r.totalQualifiedHsaSpendReal).toBeCloseTo(spend, 8)
    expect(r.terminalReal).toBeCloseTo(P + 100_000 - spend, 6)
  })

  it('R19: a direct caller threading value-equal (non-canonical) OverlayPerson refs with a live hsa fails LOUD — the aggregate-path mirror of the per-person reference guard', () => {
    // The owner-alive re-key (`rmdOwner === hsaOwnerPerson`) is reference-identity logic; fresh
    // `{ birthYear }` literals would silently re-key a spouse-owned HSA to living[0]''s age (the
    // optimistic direction). The hoisted guard must throw — exactly like the per-person path does.
    const cfg: TaxOverlayConfig = { taxEnabled: true, rmdEnabled: false, household: mkHousehold(2026, 1966, 1959) }
    expect(() =>
      runTaxAwareDecumulation(
        { taxable: 0, pretax: 1_000_000, roth: 0, hsa: 100_000 },
        [0], [0], [40_000], STOCK_W, 'pre-tax-first', cfg,
        {
          healthcareEnabled: true,
          irmaaMagiSeed: lowSeed,
          hsaOwnerIndex: 1,
          householdYears: [{ living: [{ birthYear: 1966 }, { birthYear: 1959 }] }], // fresh literals — NOT the canonical refs
        },
      ),
    ).toThrow(/canonical people/)
  })
})

// ===========================================================================
// U3 · M5 — boundary-review fold #2 (the four findings whose verifiers had to
// be re-run): exact absent-vs-zero equality under TAX ON, the hsa × per-person-
// ledger co-live arm, and the two missing overlay backstops.
// ===========================================================================
describe('taxOverlay — M5 boundary review #2: the re-verified seams', () => {
  const BASE = partB2026.value.standardPremiumMonthly
  const lowSeed = [60_000, 60_000]

  it('hsa ABSENT vs hsa: 0 is byte-identical under TAX ON + healthcare (toBe-exact — the zero===absent sibling ssBenefits/conversions already have)', () => {
    // The dense Slice-5 fixture, hsa: 0 vs the key OMITTED. hsaOwnerIndex stays in BOTH arms (the
    // membership guard accepts an in-range index regardless of liveness; the required-guard fires
    // only when hsaLive). A presence-keyed (`!== undefined`) split anywhere in the engine would
    // diverge here — this is the tripwire for the SCHEDULED C2 hsaLive re-derivation.
    const cfg: TaxOverlayConfig = { taxEnabled: true, rmdEnabled: true, household: mkHousehold(2026, 1952, 1955) }
    const inputs: TaxYearInputs = {
      initialTaxableBasis: 200_000,
      conversions: flat(10_000),
      ssBenefits: flat(30_000),
      oopMedical: flat(6_000),
      hsaOwnerIndex: 0,
      healthcareEnabled: true,
      irmaaMagiSeed: lowSeed,
    }
    const zero = runTaxAwareDecumulation(
      { taxable: 300_000, pretax: 500_000, roth: 150_000, hsa: 0 },
      realStock, realBond, flat(45_000), STOCK_W, 'pre-tax-first', cfg, inputs,
    )
    const absent = runTaxAwareDecumulation(
      { taxable: 300_000, pretax: 500_000, roth: 150_000 },
      realStock, realBond, flat(45_000), STOCK_W, 'pre-tax-first', cfg, inputs,
    )
    expect(zero.terminalReal).toBe(absent.terminalReal)
    expect(zero.depletionYear).toBe(absent.depletionYear)
    expect(zero.totalQualifiedHsaSpendReal).toBe(absent.totalQualifiedHsaSpendReal)
    expect(zero.totalNetPremiumReal).toBe(absent.totalNetPremiumReal)
    expect(zero.totalMedicareCostReal).toBe(absent.totalMedicareCostReal)
    expect(zero.finalBuckets).toEqual(absent.finalBuckets)
  })

  it('hsa × per-person pretax ledger CO-LIVE: the owner-death year fires BOTH same-year re-keys (ledger rollover + hsa privilege) and still reconciles', () => {
    // Person 0 born 1952 (74 — RMD active, 65+); person 1 born 1962 (64) owns the HSA. Person 1
    // dies after year 0: the SAME year must (a) roll person 1''s pre-tax IRA to the survivor
    // (the M6b ledger re-key) AND (b) roll the HSA to the 65+ survivor — opening the
    // Medicare-premium privilege (the M5 re-key). The two sub-ledgers are only ever tested in
    // isolation elsewhere; a regression in their interaction passes every other test.
    const cfg: TaxOverlayConfig = { taxEnabled: true, rmdEnabled: true, household: mkHousehold(2026, 1952, 1962) }
    const hh = cfg.taxEnabled ? cfg.household : (undefined as never)
    const years = [
      { living: [hh.owner, hh.spouse!] }, // y0: both alive (canonical refs — the guard requires them)
      { living: [hh.owner] }, // y1: the HSA-owning spouse died
      { living: [hh.owner] },
    ]
    const r = runTaxAwareDecumulation(
      { taxable: 0, pretax: 500_000, roth: 0, hsa: 100_000 },
      [0, 0, 0], [0, 0, 0], [40_000, 40_000, 40_000], STOCK_W, 'pre-tax-first', cfg,
      {
        initialTaxableBasis: 0,
        initialPretaxByPerson: [350_000, 150_000],
        householdYears: years,
        healthcareEnabled: true,
        irmaaMagiSeed: lowSeed,
        hsaOwnerIndex: 1,
      },
    )
    // y0: owner(64) alive ⇒ privilege CLOSED (count65 = 1, the bill grossed up, spend 0).
    // y1, y2: the HSA rolled to the 65+ survivor ⇒ spend = 1 × BASE × 12 each year (low seed).
    expect(r.totalQualifiedHsaSpendReal).toBeCloseTo(2 * (1 * BASE * 12), 6)
    // and the 4-bucket ledger still reconciles to the terminal with both re-keys fired:
    expect(Math.abs(totalAcrossBuckets(r.finalBuckets) / r.terminalReal - 1)).toBeLessThan(1e-9)
    expect(r.depletionYear).toBe(NEVER_DEPLETED)
  })

  describe('the two missing overlay backstops (R19 at BOTH layers — the direct-caller throws)', () => {
    const cfg: TaxOverlayConfig = { taxEnabled: true, rmdEnabled: false, household: mkHousehold(2026, 1966, 1966) }

    it('a NaN / −Infinity / negative bracketFillCeilings entry throws up-front (it was frontline-only — the NaN silently zeroed the ledger, and a live hsa turned that into a FALSE depletion)', () => {
      for (const bad of [NaN, -1, Number.NEGATIVE_INFINITY]) {
        expect(() =>
          runTaxAwareDecumulation(
            { taxable: 0, pretax: 1_000_000, roth: 0, hsa: 50_000 },
            [0], [0], [40_000], STOCK_W, 'bracket-fill', cfg,
            { bracketFillCeilings: [bad], hsaOwnerIndex: 0 },
          ),
        ).toThrow(/bracketFillCeilings/)
      }
      // +Infinity stays LEGAL — the explicit no-ceiling sentinel (the bracket-fill default).
      expect(() =>
        runTaxAwareDecumulation(
          { taxable: 0, pretax: 1_000_000, roth: 0, hsa: 50_000 },
          [0], [0], [40_000], STOCK_W, 'bracket-fill', cfg,
          { bracketFillCeilings: [Number.POSITIVE_INFINITY], hsaOwnerIndex: 0 },
        ),
      ).not.toThrow()
    })

    it('a negative / NaN netWithdrawals entry throws up-front (a negative draw would MINT money into the portfolio — hsa included; a NaN sails to a NaN terminal)', () => {
      for (const bad of [-20_000, NaN]) {
        expect(() =>
          runTaxAwareDecumulation(
            { taxable: 0, pretax: 1_000_000, roth: 0, hsa: 50_000 },
            [0], [0], [bad], STOCK_W, 'pre-tax-first', cfg,
            { hsaOwnerIndex: 0 },
          ),
        ).toThrow(/netWithdrawals/)
      }
    })
  })
})

// ===========================================================================
// C2 — the signed per-bucket contribution-inflow term (§2c): the after-the-scale
// fold, the destination/direction goldens, the per-person ledger credit, the
// RMD-overlap differencing identity, the hsaLive re-derive, §6, and the R19
// backstop. Every expected dollar is externally derived (hand math + the
// independent derivation panel — DND/012), never via the engine's own formula.
// ===========================================================================
describe('C2 — the contribution fold (§2c): destination, direction, and the externally-derived projections', () => {
  it('DESTINATION golden: the named bucket takes exactly the contribution; the others change only by growth', () => {
    // Hand-derived + panel-confirmed (fixture B): buckets 600/300/100 (total 1000), w 0.5, both
    // returns +10%, net 0, 50 → pretax end-of-year. Scale = 1100/1000 = 1.1 (the GROWTH-ONLY
    // total): taxable 660, pretax 330 + 50 = 380, roth 110, terminal 1150. A proportional SMEAR
    // (scale = 1150/1000 = 1.15) would read taxable 690 — fails; a BEFORE-the-scale fold
    // ((300+50)·1.1 = 385) fails too (phantom arrival-year growth).
    const got = runTaxAwareDecumulation(
      { taxable: 600, pretax: 300, roth: 100 },
      [0.1],
      [0.1],
      [0],
      0.5,
      'proportional',
      OFF,
      { contributions: [{ taxableByPerson: [0], pretaxByPerson: [50], rothByPerson: [0], hsaByPerson: [0] }] },
    )
    expect(got.depletionYear).toBe(NEVER_DEPLETED)
    expect(got.finalBuckets.taxable).toBeCloseTo(660, 9)
    expect(got.finalBuckets.pretax).toBeCloseTo(380, 9)
    expect(got.finalBuckets.roth).toBeCloseTo(110, 9)
    expect(got.terminalReal).toBeCloseTo(1150, 9)
  })

  it('DIRECTION golden (§2d): end-of-year crediting lands strictly BELOW the start-of-year mirror', () => {
    // The start-of-year-credited mirror (the WRONG, optimistic convention) compounds the 50:
    // (1000 + 50)·1.1 = 1155. The engine's 1150 is strictly below — the conservative convention
    // shipped, never its optimistic mirror (a falsely-earlier work-optional date).
    const got = runTaxAwareDecumulation(
      { taxable: 600, pretax: 300, roth: 100 },
      [0.1],
      [0.1],
      [0],
      0.5,
      'proportional',
      OFF,
      { contributions: [{ taxableByPerson: [0], pretaxByPerson: [50], rothByPerson: [0], hsaByPerson: [0] }] },
    )
    expect(got.terminalReal).toBeCloseTo(1150, 9)
    expect(got.terminalReal).toBeLessThan(1155)
  })

  it('ROTH destination golden: the roth credit lands in roth exactly; siblings grow only (the wave-2 discrimination gap)', () => {
    // The same hand-derived fixture-B family with the destination moved to roth (the wave-2
    // testing lens caught roth as the ONE §2c channel never pinned to a discriminating value —
    // a sum-preserving reroute of cRoth survived the suite): scale 1.1; roth 100·1.1 + 50 = 160;
    // taxable 660 and pretax 330 growth-only; terminal 1150. A reroute of the roth credit into
    // any sibling now diverges from BOTH the credited and the growth-only assertions.
    const got = runTaxAwareDecumulation(
      { taxable: 600, pretax: 300, roth: 100 },
      [0.1],
      [0.1],
      [0],
      0.5,
      'proportional',
      OFF,
      { contributions: [{ taxableByPerson: [0], pretaxByPerson: [0], rothByPerson: [50], hsaByPerson: [0] }] },
    )
    expect(got.finalBuckets.taxable).toBeCloseTo(660, 9)
    expect(got.finalBuckets.pretax).toBeCloseTo(330, 9)
    expect(got.finalBuckets.roth).toBeCloseTo(160, 9)
    expect(got.terminalReal).toBeCloseTo(1150, 9)
  })

  it('TAXABLE projection: a taxable contribution raises value AND basis at full, unscaled value (tax ON)', () => {
    // Hand-derived + panel-confirmed (fixture C): taxable 1000 (basis 1000), returns +10% then
    // 0%, net 0, +100 taxable end of each year → value 1300, basis 1200 (growth never touches
    // basis; each contribution enters at full basis — after-tax dollars).
    const cfg: TaxOverlayConfig = { taxEnabled: true, rmdEnabled: false, household: mkHousehold(2026, 1980) }
    const got = runTaxAwareDecumulation(
      { taxable: 1000, pretax: 0, roth: 0 },
      [0.1, 0],
      [0.1, 0],
      [0, 0],
      0.5,
      'proportional',
      cfg,
      {
        initialTaxableBasis: 1000,
        contributions: [
          { taxableByPerson: [100], pretaxByPerson: [0], rothByPerson: [0], hsaByPerson: [0] },
          { taxableByPerson: [100], pretaxByPerson: [0], rothByPerson: [0], hsaByPerson: [0] },
        ],
      },
    )
    expect(got.terminalReal).toBeCloseTo(1300, 9)
    expect(got.finalBuckets.taxable).toBeCloseTo(1300, 9)
    expect(got.finalTaxableBasis).toBeCloseTo(1200, 9)
  })

  it('ZERO-VALUED contribution entries are byte-identical to an absent stream (everything live, tax ON)', () => {
    // The reduce-to-spine-class exactness check on the densest co-live fixture (the M5 Slice-5
    // configuration): a stream of all-zero YearContributions folds as exact IEEE no-ops.
    const cfg: TaxOverlayConfig = { taxEnabled: true, rmdEnabled: true, household: mkHousehold(2026, 1952, 1955) }
    const buckets: AccountBuckets = { taxable: 300_000, pretax: 500_000, roth: 150_000, hsa: 50_000 }
    const dense: TaxYearInputs = {
      initialTaxableBasis: 200_000,
      conversions: flat(10_000),
      ssBenefits: flat(30_000),
      oopMedical: flat(6_000),
      hsaOwnerIndex: 0,
      healthcareEnabled: true,
      irmaaMagiSeed: [60_000, 60_000],
      initialPretaxByPerson: [350_000, 150_000],
    }
    const zeroC: TaxYearInputs = {
      ...dense,
      contributions: flat(0).map(() => ({ taxableByPerson: [0, 0], pretaxByPerson: [0, 0], rothByPerson: [0, 0], hsaByPerson: [0, 0] })),
    }
    const absent = runTaxAwareDecumulation(buckets, realStock, realBond, flat(45_000), STOCK_W, 'proportional', cfg, dense)
    const zeros = runTaxAwareDecumulation(buckets, realStock, realBond, flat(45_000), STOCK_W, 'proportional', cfg, zeroC)
    expect(zeros.terminalReal).toBe(absent.terminalReal) // exact, not close-to
    expect(zeros.finalBuckets).toEqual(absent.finalBuckets)
    expect(zeros.finalTaxableBasis).toBe(absent.finalTaxableBasis)
  })

  it('Σbuckets reconciles + the inflow GROWS the total (presence companion) under the dense co-live fixture', () => {
    const cfg: TaxOverlayConfig = { taxEnabled: true, rmdEnabled: true, household: mkHousehold(2026, 1952, 1955) }
    const buckets: AccountBuckets = { taxable: 300_000, pretax: 500_000, roth: 150_000, hsa: 50_000 }
    const dense: TaxYearInputs = {
      initialTaxableBasis: 200_000,
      conversions: flat(10_000),
      ssBenefits: flat(30_000),
      oopMedical: flat(6_000),
      hsaOwnerIndex: 0,
      healthcareEnabled: true,
      irmaaMagiSeed: [60_000, 60_000],
      initialPretaxByPerson: [350_000, 150_000],
    }
    const withC: TaxYearInputs = {
      ...dense,
      // Five inflow years across all four destinations (the hsa entry exercises the live-hsa fold).
      contributions: Array.from({ length: 5 }, () => ({ taxableByPerson: [5_000, 0], pretaxByPerson: [3_000, 2_000], rothByPerson: [1_000, 0], hsaByPerson: [500, 0] })),
    }
    const base = runTaxAwareDecumulation(buckets, realStock, realBond, flat(45_000), STOCK_W, 'proportional', cfg, dense)
    const got = runTaxAwareDecumulation(buckets, realStock, realBond, flat(45_000), STOCK_W, 'proportional', cfg, withC)
    expect(got.depletionYear).toBe(NEVER_DEPLETED)
    // The 4-bucket reconciliation guard holds with the inflow live (the total now GROWS by it).
    expect(Math.abs(totalAcrossBuckets(got.finalBuckets) / got.terminalReal - 1)).toBeLessThan(1e-9)
    expect(got.terminalReal).toBeGreaterThan(base.terminalReal) // burned/027 presence companion
  })
})

describe('C2 — the per-person ledger credit (§2c) and the RMD-overlap identity (§2)', () => {
  it('credits the CONTRIBUTOR’s own slot: next year’s per-person RMD prices off the credited ledger', () => {
    // Hand-derived + panel-confirmed (fixture D, two independent derivations agreeing to 7
    // decimals): owner 75 (ULT 24.6 → 23.7 at 76 — the spouse is EXACTLY 10 years younger, so
    // the JLLS >10yr switch stays off), spouse 65 (no RMD until 75). Ledger [1000, 1000], zero
    // returns, zero draws, RMD on / tax off; +100 → the SPOUSE's slot at the end of year 0.
    //   y0: owner RMD 1000/24.6 = 40.650406504… → taxable; spouse slot 1000 + 100 = 1100.
    //   y1: owner RMD 959.349593…/23.7 = 40.478885801… → taxable.
    //   final: taxable 81.129292…, pretax 2018.870708…, terminal 2100 (conservation).
    // The WRONG-credit mutant (the 100 on the OWNER's slot) inflates year-1's RMD base:
    // taxable would read 85.348701… — this fixture discriminates the slot (insight 015).
    const cfg: TaxOverlayConfig = { taxEnabled: false, rmdEnabled: true, household: mkHousehold(2026, 1951, 1961) }
    const got = runTaxAwareDecumulation(
      { taxable: 0, pretax: 2000, roth: 0 },
      [0, 0],
      [0, 0],
      [0, 0],
      0.5,
      'proportional',
      cfg,
      {
        initialPretaxByPerson: [1000, 1000],
        contributions: [{ taxableByPerson: [0, 0], pretaxByPerson: [0, 100], rothByPerson: [0, 0], hsaByPerson: [0, 0] }],
      },
    )
    expect(got.depletionYear).toBe(NEVER_DEPLETED)
    expect(got.finalBuckets.taxable).toBeCloseTo(81.1292923, 6)
    expect(got.finalBuckets.pretax).toBeCloseTo(2018.8707077, 6)
    expect(got.terminalReal).toBeCloseTo(2100, 9)
  })

  it('RMD-age OVERLAP companion: a working year (net 0) with a forced RMD gross-up still credits exactly C (§2c is overlap-safe)', () => {
    // A 75-year-old still-working owner: net 0 (the §7 clamp's working-year value), RMD forced,
    // tax ON → the year carries a REAL outflow (the RMD's tax) and an inflow at once. The
    // differencing identity (insight 011-ext): the contribution never enters the solver, so the
    // with-C and without-C arms differ by EXACTLY C — in the pretax bucket and the terminal —
    // while the gross (read back via zero returns: gross = P − terminal_without) is unchanged.
    const cfg: TaxOverlayConfig = { taxEnabled: true, rmdEnabled: true, household: mkHousehold(2026, 1951) }
    const run = (contributions?: TaxYearInputs['contributions']) =>
      runTaxAwareDecumulation(
        { taxable: 0, pretax: 1_000_000, roth: 0 },
        [0],
        [0],
        [0],
        0.5,
        'pre-tax-first',
        cfg,
        { ...(contributions ? { contributions } : {}) },
      )
    const withC = run([{ taxableByPerson: [0], pretaxByPerson: [200], rothByPerson: [0], hsaByPerson: [0] }])
    const without = run()
    const gross = 1_000_000 - without.terminalReal
    expect(gross).toBeGreaterThan(0) // the forced-RMD tax really flowed in a net-0 year
    expect(withC.terminalReal - without.terminalReal).toBeCloseTo(200, 6)
    expect(withC.finalBuckets.pretax - without.finalBuckets.pretax).toBeCloseTo(200, 6)
    expect(withC.finalBuckets.taxable).toBeCloseTo(without.finalBuckets.taxable, 9) // untouched by C
  })

  it('a contribution credited to a DEAD person’s slot fails loud (the caller owns death truncation, §7)', () => {
    const hh = mkHousehold(2026, 1951, 1961)
    const cfg: TaxOverlayConfig = { taxEnabled: false, rmdEnabled: true, household: hh }
    expect(() =>
      runTaxAwareDecumulation(
        { taxable: 0, pretax: 2000, roth: 0 },
        [0],
        [0],
        [0],
        0.5,
        'proportional',
        cfg,
        {
          initialPretaxByPerson: [1000, 1000],
          householdYears: [{ living: [hh.owner] }], // the spouse is dead at t=0
          contributions: [{ taxableByPerson: [0, 0], pretaxByPerson: [0, 100], rothByPerson: [0, 0], hsaByPerson: [0, 0] }], // …yet carries a credit
        },
      ),
    ).toThrow(/DEAD person/)
  })

  it('the dead-slot guard fires on the AGGREGATE pre-tax path too (C2 boundary review — insight 020, the property not the consumer)', () => {
    // NO initialPretaxByPerson (the aggregate pool — pretaxLedger null) and NO hsa: pre-fix,
    // `alive` was never computed on this path, so a dead spouse's pretax credit summed silently
    // into cPretaxTotal and inflated the aggregate pool — the calm-but-wrong-OPTIMISTIC phantom
    // contribution the §7 guard exists to forbid. The guard is now gated on the PROPERTY (a
    // per-person credit meeting a death signal), so deleting it on either path goes red here.
    const hh = mkHousehold(2026, 1951, 1961)
    const cfg: TaxOverlayConfig = { taxEnabled: false, rmdEnabled: true, household: hh }
    expect(() =>
      runTaxAwareDecumulation(
        { taxable: 0, pretax: 2000, roth: 0 },
        [0],
        [0],
        [0],
        0.5,
        'proportional',
        cfg,
        {
          householdYears: [{ living: [hh.owner] }], // the spouse is dead at t=0
          contributions: [{ taxableByPerson: [0, 0], pretaxByPerson: [0, 100], rothByPerson: [0, 0], hsaByPerson: [0, 0] }],
        },
      ),
    ).toThrow(/DEAD person/)
  })

  it('a contributions channel with MORE slots than the canonical people fails loud (excess slots cannot be death-vetted)', () => {
    const hh = mkHousehold(2026, 1951, 1961)
    const cfg: TaxOverlayConfig = { taxEnabled: false, rmdEnabled: true, household: hh }
    expect(() =>
      runTaxAwareDecumulation(
        { taxable: 0, pretax: 2000, roth: 0 },
        [0],
        [0],
        [0],
        0.5,
        'proportional',
        cfg,
        { contributions: [{ taxableByPerson: [0, 0], pretaxByPerson: [0, 0, 100], rothByPerson: [0, 0], hsaByPerson: [0, 0] }] },
      ),
    ).toThrow(/canonical people/)
  })
})

describe('C2 — hsaLive is re-derived from the inflow (the M5 forward landmine, resolved)', () => {
  const cfg: TaxOverlayConfig = { taxEnabled: true, rmdEnabled: false, household: mkHousehold(2026, 1980) }
  const hsaInflow: TaxYearInputs['contributions'] = [
    { taxableByPerson: [0], pretaxByPerson: [0], rothByPerson: [0], hsaByPerson: [5_000] },
  ]

  it('a positive hsa inflow alone makes the run hsa-live: the owner identity is REQUIRED', () => {
    expect(() =>
      runTaxAwareDecumulation(
        { taxable: 100_000, pretax: 0, roth: 0 }, // hsa bucket ABSENT — pre-C2 this run was not hsa-live
        [0, 0],
        [0, 0],
        [2_000, 2_000],
        0.5,
        'proportional',
        cfg,
        { initialTaxableBasis: 100_000, contributions: hsaInflow },
      ),
    ).toThrow(/hsaOwnerIndex/)
  })

  it('the spend mechanics are LIVE for a contributed-from-zero hsa (the landmine’s silent-dark failure mode)', () => {
    // hsa starts ABSENT; 5,000 arrives end of year 0; year 1's 1,000 OOP is then HSA-paid.
    // Under the OLD initial-balance-only derivation the spend mechanics stayed dark and the
    // qualified spend would read 0 — exactly the silent, optimistic hole the re-derive closes.
    // Zero returns: terminal = 100,000 + 5,000 − 2,000 (y0 gross) − 2,000 (y1 gross 1,000 +
    // hsa-paid 1,000) = 101,000; basis == value throughout so the draws realize no gain (tax 0).
    const got = runTaxAwareDecumulation(
      { taxable: 100_000, pretax: 0, roth: 0 },
      [0, 0],
      [0, 0],
      [2_000, 2_000],
      0.5,
      'proportional',
      cfg,
      { initialTaxableBasis: 100_000, hsaOwnerIndex: 0, oopMedical: [0, 1_000], contributions: hsaInflow },
    )
    expect(got.totalQualifiedHsaSpendReal).toBeCloseTo(1_000, 9)
    expect(got.terminalReal).toBeCloseTo(101_000, 6)
    expect(got.finalBuckets.hsa).toBeCloseTo(4_000, 6) // 5,000 in − 1,000 qualified out
  })
})

describe('C2 — §6 overlay arm, the R19 backstop, and the depleted-year forfeit', () => {
  it('§6: a PRICED ACA year carrying a contribution throws (the falsifiable empty-overlap invariant)', () => {
    const cfg: TaxOverlayConfig = { taxEnabled: true, rmdEnabled: false, household: mkHousehold(2026, 1980) }
    expect(() =>
      runTaxAwareDecumulation(
        { taxable: 0, pretax: 50_000, roth: 0 },
        [0],
        [0],
        [0],
        0.5,
        'proportional',
        cfg,
        {
          healthcareEnabled: true,
          enrolledPremium: [12_000],
          slcsp: [11_000],
          contributions: [{ taxableByPerson: [0], pretaxByPerson: [100], rothByPerson: [0], hsaByPerson: [0] }],
        },
      ),
    ).toThrow(/priced ACA year cannot carry a contribution/)
  })

  it('R19 backstop: a NaN or negative contribution entry throws up-front (finiteness FIRST)', () => {
    const bad: Array<TaxYearInputs['contributions']> = [
      [{ taxableByPerson: [Number.NaN], pretaxByPerson: [0], rothByPerson: [0], hsaByPerson: [0] }],
      [{ taxableByPerson: [0], pretaxByPerson: [-5], rothByPerson: [0], hsaByPerson: [0] }],
      [{ taxableByPerson: [0], pretaxByPerson: [0], rothByPerson: [0], hsaByPerson: [Number.POSITIVE_INFINITY] }],
      // FINITE per-slot entries whose ASSEMBLED sum overflows to +Infinity (the wave-2 adversary):
      // per-entry finiteness alone would pass this, and the Infinity credit would ride to a
      // non-finite terminal reported as survived. The Σ arm of the backstop rejects it.
      [{ taxableByPerson: [0, 0], pretaxByPerson: [1.5e308, 1.5e308], rothByPerson: [0, 0], hsaByPerson: [0, 0] }],
    ]
    for (const contributions of bad) {
      expect(() =>
        runTaxAwareDecumulation(
          { taxable: 1000, pretax: 0, roth: 0 },
          [0],
          [0],
          [0],
          0.5,
          'proportional',
          OFF,
          { contributions },
        ),
      ).toThrow(/contribution/)
    }
  })

  it('a year the portfolio cannot fund FORFEITS its contribution (the defined conservative outcome, §2)', () => {
    // A working-year overlay-FORCED flow exceeding the balance: SS 200k claimed-while-working
    // drives a tax bill far beyond the 100-dollar portfolio → depleted at t = 0; the year-0
    // contribution (and every later one) is forfeited — terminal 0, never 0 + C (pessimistic-
    // only; `indeterminate` stays reserved for input failure).
    const cfg: TaxOverlayConfig = { taxEnabled: true, rmdEnabled: false, household: mkHousehold(2026, 1980) }
    const got = runTaxAwareDecumulation(
      { taxable: 0, pretax: 100, roth: 0 },
      [0, 0],
      [0, 0],
      [0, 0],
      0.5,
      'proportional',
      cfg,
      {
        ssBenefits: [200_000, 200_000],
        contributions: [
          { taxableByPerson: [0], pretaxByPerson: [50], rothByPerson: [0], hsaByPerson: [0] },
          { taxableByPerson: [0], pretaxByPerson: [50], rothByPerson: [0], hsaByPerson: [0] },
        ],
      },
    )
    expect(got.depletionYear).toBe(0)
    expect(got.terminalReal).toBe(0)
    expect(totalAcrossBuckets(got.finalBuckets)).toBe(0)
  })
})

// ===========================================================================
// C3 §3b — the per-person Medicare ONSET (the enrolled count), the ADDITIVE
// working-year IRMAA-MAGI override, and the bridge-mask fail-loud arms.
//
// THE SPLIT UNDER TEST: ONLY the IRMAA gate + pricing count key off the per-person
// onset (`medicareEnrolledCount` — living ∩ {t ≥ onset_i}); `count65` stays BIOLOGICAL
// for the §63(f)/senior-bonus deduction stack and the ACA pre65 denominator. A member
// working past 65 (onset > their 65th sim-year) accrues ZERO Medicare cost ENTIRELY —
// base Part B included — while keeping the age-65 deduction. Absent signal ⇒ the
// biological predicate VERBATIM (byte-identity).
//
// EXTERNALLY DERIVED (DND/012): the hand oracle is count × (base + surcharge) × 12 off
// the committed constants (never medicareAnnualCost itself); every fixture parameter is
// walked through the engine's selection predicates (insight 023 — tier thresholds are
// MFJ here because mkHousehold pins filing 'mfj').
// ===========================================================================
describe('taxOverlay — C3 §3b: per-person Medicare onset + additive override + the bridge-mask arms', () => {
  const PP = 2_000_000
  const POOL: AccountBuckets = { taxable: 0, pretax: PP, roth: 0 }
  const IRMAA_SCHED = irmaa.value
  const BASE = partB2026.value.standardPremiumMonthly
  const lowSeed = [60_000, 60_000]
  const surchargeMonthly = (tierIdx: number) =>
    IRMAA_SCHED.tiers[tierIdx]!.partBSurchargeMonthly + IRMAA_SCHED.tiers[tierIdx]!.partDSurchargeMonthly
  const medicareAnnual = (count: number, tierIdx: number | null) =>
    count * (BASE + (tierIdx === null ? 0 : surchargeMonthly(tierIdx))) * 12
  // A still-working 66yo (born 1960, age 66 at 2026): onset [3] = Medicare at the work stop.
  const W66: TaxOverlayConfig = { taxEnabled: true, rmdEnabled: false, household: mkHousehold(2026, 1960) }
  const run = (net: readonly number[], inputs: TaxYearInputs, cfg: TaxOverlayConfig) =>
    runTaxAwareDecumulation(POOL, realStock, realBond, net, STOCK_W, 'pre-tax-first', cfg, inputs)

  it('work-past-65 suppression: a 66yo with onset 3 accrues ZERO Medicare cost (base included) through the working years — and needs NO seed', () => {
    // Years 0..2: enrolled count 0 (onset 3) ⇒ the IRMAA block never runs ⇒ no seed demanded
    // (the biological predicate would have REQUIRED seed[0]/seed[1] — the false-rejection class)
    // and totalMedicareCostReal stays 0 ENTIRELY (the pricing count gates base + surcharge both).
    const on = run([40_000, 40_000, 40_000], { healthcareEnabled: true, medicareOnsetSimYear: [3] }, W66)
    expect(on.totalMedicareCostReal).toBe(0)
    // count65 stays BIOLOGICAL (the 66yo keeps the age-65 deduction): the healthcare-on run with
    // zero Medicare cost and no priced ACA is BYTE-identical to healthcare-off — a re-keyed
    // count65 would shrink the deduction, raise the tax, and break this exact equality.
    const off = run([40_000, 40_000, 40_000], {}, W66)
    expect(on.terminalReal).toBe(off.terminalReal)
  })

  it('the DISCRIMINATING pair: absent onset = biological (enrolled from t=0, seed demanded, base priced) — supplied onset delays it', () => {
    // Absent signal: the 66yo is biologically enrolled in years 0,1 ⇒ the seed throw fires.
    expect(() => run([40_000, 40_000], { healthcareEnabled: true }, W66)).toThrow(/irmaaMagiSeed/)
    // Seed supplied: the SAME run prices base Part B ×1 ×12 per year — vs ZERO under onset [3].
    const biological = run([40_000, 40_000], { healthcareEnabled: true, irmaaMagiSeed: lowSeed }, W66)
    expect(biological.totalMedicareCostReal).toBeCloseTo(medicareAnnual(1, null) * 2, 4)
  })

  it('enrollment STARTS at the onset: year 3 prices off the override-free recorded history (base tier)', () => {
    const r = run([40_000, 40_000, 40_000, 40_000], { healthcareEnabled: true, medicareOnsetSimYear: [3] }, W66)
    // Years 0..2 free; year 3: lag = 1 → history[1] (computed ≈ a 40k gross-up MAGI ≪ tier 1) → base only.
    expect(r.totalMedicareCostReal).toBeCloseTo(medicareAnnual(1, null), 4)
  })

  it('the retired-spouse discriminator: a retired 67yo spouse of a still-working 66yo IS priced from t=0 (per-person, never household max)', () => {
    // owner born 1960 (66, working — onset 3); spouse born 1959 (67, retired — onset −2).
    const cfg: TaxOverlayConfig = { taxEnabled: true, rmdEnabled: false, household: mkHousehold(2026, 1960, 1959) }
    const r = run([40_000, 40_000, 40_000], { healthcareEnabled: true, medicareOnsetSimYear: [3, -2], irmaaMagiSeed: lowSeed }, cfg)
    // EXACTLY one enrolled member each of years 0..2: a household max(65th, work-stop) design
    // would price ZERO (nobody until year 3); a biological-only design would price ×2. Both fail.
    expect(r.totalMedicareCostReal).toBeCloseTo(medicareAnnual(1, null) * 3, 4)
  })

  it('absent-onset byte-identity: an explicit biological onset array reproduces the absent-signal run EXACTLY', () => {
    const post65: TaxOverlayConfig = { taxEnabled: true, rmdEnabled: false, household: mkHousehold(2026, 1959, 1959) }
    const absent = run([40_000, 40_000, 40_000], { healthcareEnabled: true, irmaaMagiSeed: lowSeed }, post65)
    // Born 1959 ⇒ age 67 at 2026 ⇒ biological onset = 65 − 67 = −2 per person.
    const explicit = run(
      [40_000, 40_000, 40_000],
      { healthcareEnabled: true, irmaaMagiSeed: lowSeed, medicareOnsetSimYear: [-2, -2] },
      post65,
    )
    expect(explicit.totalMedicareCostReal).toBe(absent.totalMedicareCostReal)
    expect(explicit.terminalReal).toBe(absent.terminalReal)
  })

  describe('the working-year IRMAA-MAGI override (ADDITIVE into history — §3b)', () => {
    // Onset 2 (= the lookback): the FIRST enrolled year (t=2) lag-reads t=0, a working year.
    const onset2: TaxYearInputs = { healthcareEnabled: true, medicareOnsetSimYear: [2] }
    const net3 = [0, 0, 0] // working years carry net 0 (the §7 clamp's overlay-side value)

    it('control (the ≈$0-tier symptom): with NO override, the lag-read working year prices the lowest tier', () => {
      const r = run(net3, onset2, W66)
      // history[0] = computed-only ≈ $0 (net 0, no conversion) → year 2 base only — the exact
      // silent understatement the override exists to prevent (here it is the FIXTURE, not a bug:
      // the validateParams arm + the mask arm are what forbid this configuration in production).
      expect(r.totalMedicareCostReal).toBeCloseTo(medicareAnnual(1, null), 4)
    })

    it('the override prices the surcharge implied by working-year income (above tier-1 — below it a $0 surcharge proves nothing)', () => {
      // override 230k > MFJ tier-1 218k ⇒ year 2 bills tier 1.
      const r = run(net3, { ...onset2, irmaaMagiOverride: [230_000, 230_000] }, W66)
      expect(r.totalMedicareCostReal).toBeCloseTo(medicareAnnual(1, 0), 4)
    })

    it('ADDITIVITY: a working-year Roth conversion lands ON TOP of the override (a planted replacement-write fails)', () => {
      // history[0] = 230k (override) + 50k (the conversion is computed nonSSordinary) = 280k >
      // MFJ tier-2 274k ⇒ tier 2. A replacement write reads 230k ⇒ tier 1; max() likewise.
      const r = run(net3, { ...onset2, irmaaMagiOverride: [230_000, 230_000], conversions: [50_000, 0, 0] }, W66)
      expect(r.totalMedicareCostReal).toBeCloseTo(medicareAnnual(1, 1), 4)
    })
  })

  describe('the bridge-mask fail-loud arms (mask-conditional — the recorded §3b limitation)', () => {
    it('the masked LAGGED-READ throw: a bridge year at the lagged index with no finite override coverage throws (the seed-throw mirror)', () => {
      expect(() =>
        run([0, 0, 0], { healthcareEnabled: true, medicareOnsetSimYear: [2], bridgeYearMask: [true, true, false] }, W66),
      ).toThrow(/irmaaMagiOverride/)
      // Override coverage of the masked lagged index satisfies the arm (no throw).
      const ok = run(
        [0, 0, 0],
        { healthcareEnabled: true, medicareOnsetSimYear: [2], bridgeYearMask: [true, true, false], irmaaMagiOverride: [230_000, 230_000] },
        W66,
      )
      expect(ok.totalMedicareCostReal).toBeCloseTo(medicareAnnual(1, 0), 4)
    })

    it('the masked ACA price-gate throw: a priced ACA year on a bridge year is wage-blind — unpriceable, rejected', () => {
      // A pre-65 single (born 1970, 56): year 0 priced (enrolled 12k, slcsp 11k) on a masked bridge year.
      const pre65: TaxOverlayConfig = { taxEnabled: true, rmdEnabled: false, household: mkHousehold(2026, 1970) }
      const inputs: TaxYearInputs = { healthcareEnabled: true, enrolledPremium: [12_000], slcsp: [11_000] }
      expect(() => run([40_000], { ...inputs, bridgeYearMask: [true] }, pre65)).toThrow(/wage-blind|BRIDGE/)
      // Control: the same year unmasked prices normally (the probe works; the arm is the only difference).
      const ok = run([40_000], { ...inputs, bridgeYearMask: [false] }, pre65)
      expect(ok.totalNetPremiumReal).toBeGreaterThan(0)
    })
  })

  describe('backstop guards (insights 008/010 — NaN-first at the overlay layer)', () => {
    it('rejects a NaN / non-integer onset, a misaligned onset, a NaN override, and a non-boolean mask', () => {
      const inputs = (extra: Partial<TaxYearInputs>): TaxYearInputs => ({ healthcareEnabled: true, irmaaMagiSeed: lowSeed, ...extra })
      expect(() => run([40_000], inputs({ medicareOnsetSimYear: [Number.NaN] }), W66)).toThrow(/medicareOnsetSimYear/)
      expect(() => run([40_000], inputs({ medicareOnsetSimYear: [1.5] }), W66)).toThrow(/medicareOnsetSimYear/)
      expect(() => run([40_000], inputs({ medicareOnsetSimYear: [0, 0] }), W66)).toThrow(/medicareOnsetSimYear/)
      expect(() => run([40_000], inputs({ irmaaMagiOverride: [Number.NaN] }), W66)).toThrow(/irmaaMagiOverride/)
      expect(() => run([40_000], inputs({ irmaaMagiOverride: [-1] }), W66)).toThrow(/irmaaMagiOverride/)
      expect(() => run([40_000], inputs({ bridgeYearMask: [1 as unknown as boolean] }), W66)).toThrow(/bridgeYearMask/)
    })

    it('the onset is the FOURTH consumer of OverlayPerson reference identity (insight 020): distinct-but-equal living refs throw', () => {
      const hh = mkHousehold(2026, 1959, 1959)
      const cfg: TaxOverlayConfig = { taxEnabled: true, rmdEnabled: false, household: hh }
      const strangers: HouseholdYear[] = [{ living: [{ birthYear: 1959 }, { birthYear: 1959 }] }]
      // With the onset supplied, the reference-integrity guard must fire (the enrolled count keys
      // onset by canonical reference match — a stranger ref would silently fall back biological).
      expect(() =>
        run([40_000], { healthcareEnabled: true, irmaaMagiSeed: lowSeed, medicareOnsetSimYear: [-2, -2], householdYears: strangers }, cfg),
      ).toThrow(/canonical people/)
      // Control: WITHOUT the onset (and no other consumer), the same strangers run fine —
      // resolveYear reads them age-wise only (the pre-C3 behavior, unchanged).
      const ok = run([40_000], { healthcareEnabled: true, irmaaMagiSeed: lowSeed, householdYears: strangers }, cfg)
      expect(ok.totalMedicareCostReal).toBeCloseTo(medicareAnnual(2, null), 4)
    })
  })
})

// ===========================================================================
// M6 — the FINAL cross-overlay integration battery (externally derived, DND/012).
//
// Everything before this block tests each overlay's seam mostly in ISOLATION (ACA in the
// M3 battery, IRMAA in the M4 battery, HSA in the M5 battery, each with its own
// reduce-to-spine + presence arms). M6's contract is the COUPLING: the same household,
// the same year, every income-aware cost live at once — because the costs FEED each
// other (the Medicare bill raises the funding net the ACA solve prices; the HSA's
// qualified spend lowers it; the ACA years' converged MAGIs are the history the IRMAA
// bill lag-reads two years later) and a regression in the coupling is invisible to
// every single-overlay fixture.
//
// DERIVATION REGIME (the zero-return read-off, insight 011 — every fixture):
//   - A pretax-only pool drawn pre-tax-first, no SS, no realized gain ⇒ MAGI = gross.
//   - ZERO market returns ⇒ terminalReal = P − Σ(gross + hsaSpend) EXACTLY.
//   - The gross-up in one named bracket regime reduces to a LINEAR closed form
//     (12% MFJ, count65 = 1, full senior bonus: tax = 0.12·g − 5,278 on taxable in
//     (24,800, 100,800); 22% single survivor, bonus PHASED: D(g) = 28,650 − 0.06·g ⇒
//     tax = 0.2332·g − 11,591 on taxable in (50,400, 105,700)) — each fixture's comment
//     names its regime and the solved value is checked interior to it (insight 023).
//   - The ACA root in the FLAT 300–400%-FPL band (9.96%) is the linear self-consistent
//     solution M = (fundingNet + (enrolled − slcsp) − 5,278) / (0.88 − 0.0996);
//     net premium = (enrolled − slcsp) + 0.0996·M.
// Every expected value was derived by this hand algebra AND cross-checked by an
// independent 6-deriver / 2-method panel (numeric fixed-point iteration vs closed form)
// + a rule-selection boundary audit (insight 023) — never by the engine (DND/012).
// Dollar figures from the federal tables are READ from @engine/constants (copyGuard).
// ===========================================================================
describe('taxOverlay — M6: the cross-overlay integration battery (ACA × IRMAA × HSA, externally derived, DND/012)', () => {
  const IRMAA_SCHED = irmaa.value
  const BASE = partB2026.value.standardPremiumMonthly
  const surchargeMonthly = (tierIdx: number) =>
    IRMAA_SCHED.tiers[tierIdx]!.partBSurchargeMonthly + IRMAA_SCHED.tiers[tierIdx]!.partDSurchargeMonthly
  const medicareAnnual = (count: number, tierIdx: number | null) =>
    count * (BASE + (tierIdx === null ? 0 : surchargeMonthly(tierIdx))) * 12

  describe('the dual-regime year: ONE household pays IRMAA ×1 (MFJ column) AND receives ACA-PTC, same income, same year', () => {
    // The plan's named scenario (phase-1 U3 "IRMAA enrolled-count + seeding"): an age-gap couple —
    // owner born 1960 (66, Medicare-enrolled) + spouse born 1963 (63, the marketplace member).
    // count65 = 1, medicareEnrolledCount = 1, pre65 = livingCount(2) − count65(1) = 1 ⇒ BOTH
    // regimes price simultaneously: the Medicare bill is a CONSTANT addend to the spending the
    // ACA fixed point funds (fundingNet = net + medicareCost), so the IRMAA column choice
    // propagates INTO the ACA premium — the cross-overlay coupling under test. The existing
    // MIXED-age test (the age gate) asserts only the ACA side; the ×1 enrolled count was
    // previously pinned only at the healthOverlay unit level, never integrated.
    //
    // TAX REGIME (both arms): MFJ, count65 = 1 ⇒ deduction = 32,200 + 1,650 + senior bonus
    // 6,000 (full — MAGI ≪ 150,000) = 39,850; the root's taxable sits in the 12% band ⇒
    // tax = 2,480 + 0.12·(taxable − 24,800) = 0.12·g − 5,278. ACA: the root MAGI sits in the
    // FLAT 300–400% band (9.96%) ⇒ M = (fundingNet + 2,000 − 5,278)/0.7804 with
    // enrolled 16,000 / slcsp 14,000; netPremium = 2,000 + 0.0996·M.
    const P = 1_000_000
    const MIXED: TaxOverlayConfig = { taxEnabled: true, rmdEnabled: false, household: mkHousehold(2026, 1960, 1963) }
    const oneYr = (net: number, seed0: number) =>
      runTaxAwareDecumulation({ taxable: 0, pretax: P, roth: 0 }, [0], [0], [net], STOCK_W, 'pre-tax-first', MIXED, {
        healthcareEnabled: true,
        slcsp: [14_000],
        enrolledPremium: [16_000],
        irmaaMagiSeed: [seed0],
      })

    it('arm 1 — a seed BETWEEN the single and MFJ tier-1 thresholds bills the MFJ column (base only, ×1) while the ACA premium prices off the Medicare-inclusive gross', () => {
      // seed 150,000: OVER the single tier-1 threshold (109,000) but UNDER MFJ tier-1 (218,000) —
      // the column discriminator: a single-column regression would charge tier 1 here. ×1 enrolled
      // (never ×2 — only the 66yo is on Medicare): medicareCost = 1 × base × 12 = 2,434.80.
      // fundingNet = 55,000 + 2,434.80 = 57,434.80 ⇒ M = (57,434.80 + 2,000 − 5,278)/0.7804
      // = 69,396.2071 (3.281× FPL, flat-band interior; taxable 29,546.21, 12%-band interior).
      // netPremium = 2,000 + 0.0996·M = 8,911.8622. terminal = P − M.
      const r = oneYr(55_000, 150_000)
      expect(r.totalMedicareCostReal).toBeCloseTo(medicareAnnual(1, null), 8) // MFJ column, ×1, base only
      expect(r.totalNetPremiumReal).toBeCloseTo(8_911.8622, 2)
      expect(r.terminalReal).toBeCloseTo(P - 69_396.2071, 2)
    })

    it('arm 2 — a seed over the MFJ tier-1 threshold fires the surcharge ×1 AND raises the ACA premium through the funding coupling', () => {
      // seed = the MFJ tier-1 threshold + 2,000 (strictly over tier 1, well under tier 2) ⇒
      // medicareCost = 1 × (base + tier-1 surcharge) × 12 = 3,583.20. The EXTRA 1,148.40 of
      // Medicare cost flows INTO the ACA solve: fundingNet = 58,583.20 ⇒
      // M = (58,583.20 + 2,000 − 5,278)/0.7804 = 70,867.7601 (3.351× FPL ✓; taxable 31,017.76 ✓);
      // netPremium = 9,058.4289 — HIGHER than arm 1 by 0.0996·ΔM (the coupling: a Medicare
      // surcharge erodes the ACA subsidy through the funded MAGI; a model pricing the two
      // overlays independently would hold the premium fixed across the arms).
      const r = oneYr(55_000, IRMAA_SCHED.tiers[0]!.mfjMagiThreshold + 2_000)
      expect(r.totalMedicareCostReal).toBeCloseTo(medicareAnnual(1, 0), 8) // tier 1 fired, still ×1
      expect(r.totalNetPremiumReal).toBeCloseTo(9_058.4289, 2)
      expect(r.terminalReal).toBeCloseTo(P - 70_867.7601, 2)
    })
  })

  describe('all three cost surfaces live in ONE year: ACA premium + Medicare cost + HSA qualified spend', () => {
    // The same 66+63 household with a 50,000 HSA owned by the 66yo (65+ ⇒ the Medicare-premium
    // spend privilege is OPEN) and 5,000 of OOP medical. The HSA pays the WHOLE medical stack
    // (oop + the owner's Medicare premium — the ACA premium structurally NOT in the cap), and
    // that payment feeds BACK into the ACA solve: fundingNet = net + medicareCost − hsaSpend,
    // so both MAGIs genuinely drop and the PTC RISES — the loop-breaking lever, priced through
    // all three overlays at once.
    const TOTAL = 1_050_000
    const MIXED: TaxOverlayConfig = { taxEnabled: true, rmdEnabled: false, household: mkHousehold(2026, 1960, 1963) }
    const allThree = () =>
      runTaxAwareDecumulation(
        { taxable: 0, pretax: 1_000_000, roth: 0, hsa: 50_000 },
        [0],
        [0],
        [60_500],
        STOCK_W,
        'pre-tax-first',
        MIXED,
        {
          healthcareEnabled: true,
          slcsp: [14_000],
          enrolledPremium: [16_000],
          irmaaMagiSeed: [150_000],
          oopMedical: [5_000],
          hsaOwnerIndex: 0,
        },
      )

    it('values: the HSA pays oop + the owner’s Medicare premium; the ACA solve prices off the HSA-reduced funding net; all three totals land exactly', () => {
      // medicareCost = 2,434.80 (MFJ column, base, ×1 — arm-1 regime). qualified cap =
      // 5,000 + 2,434.80 = 7,434.80 (< balance 50,000, < need 62,934.80) ⇒ hsaSpend = 7,434.80.
      // fundingNet = 60,500 + 2,434.80 − 7,434.80 = 55,500 ⇒ M = (55,500 + 2,000 − 5,278)/0.7804
      // = 66,916.9657 (3.164× FPL ✓ flat band; taxable 27,066.97 ✓ 12% band).
      // netPremium = 2,000 + 0.0996·M = 8,664.9298. terminal = 1,050,000 − M − hsaSpend
      // (the HSA outflow leaves the portfolio beside the gross). hsa after = 50,000 − 7,434.80.
      const r = allThree()
      expect(r.totalMedicareCostReal).toBeCloseTo(medicareAnnual(1, null), 8)
      expect(r.totalQualifiedHsaSpendReal).toBeCloseTo(5_000 + medicareAnnual(1, null), 8)
      expect(r.totalNetPremiumReal).toBeCloseTo(8_664.9298, 2)
      expect(r.terminalReal).toBeCloseTo(TOTAL - 66_916.9657 - 7_434.8, 2)
      expect(r.finalBuckets.hsa).toBeCloseTo(42_565.2, 6)
    })

    it('the loop-breaking lever, cross-overlay: the no-HSA twin pays a strictly HIGHER ACA premium off the SAME spending (MAGI genuinely dropped)', () => {
      // Twin: identical but hsa absent + no oop (total 1,000,000). fundingNet = 62,934.80 ⇒
      // M = (62,934.80 + 2,000 − 5,278)/0.7804 = 76,443.8749 (3.614× FPL ✓; taxable 36,593.87 ✓);
      // netPremium = 9,613.8099. The HSA-funded household's premium is ~949 LOWER — the
      // MAGI-invisibility of qualified HSA spend, measured THROUGH the integrated ACA solve.
      const twin = runTaxAwareDecumulation(
        { taxable: 0, pretax: 1_000_000, roth: 0 },
        [0],
        [0],
        [60_500],
        STOCK_W,
        'pre-tax-first',
        MIXED,
        { healthcareEnabled: true, slcsp: [14_000], enrolledPremium: [16_000], irmaaMagiSeed: [150_000] },
      )
      expect(twin.totalNetPremiumReal).toBeCloseTo(9_613.8099, 2)
      expect(twin.totalQualifiedHsaSpendReal).toBe(0)
      expect(allThree().totalNetPremiumReal).toBeLessThan(twin.totalNetPremiumReal)
    })
  })

  describe('both survivor clocks in ONE scenario: ACA stops at the death year; IRMAA bills MFJ thresholds for 2 more years, then flips', () => {
    // Owner born 1959 (67 — Medicare-enrolled, SURVIVES); spouse born 1965 (61 — the marketplace
    // member, dies at the end of year 1). Five zero-return years, enrolled 16,000 / slcsp 14,000
    // supplied for ALL five (so the ACA stop at t=2 is the DEATH's doing, never the stream
    // ending — and never the spouse aging into 65, which a static-household regression would
    // hit only at t=4). The ACA years run OVER the 400% cliff (probe-at-0 MAGI 104,723 > 84,600)
    // ⇒ PTC = 0, netPremium = the full enrolled 16,000 EXACTLY (no bisection — the over-cliff
    // branch is closed-form), keeping the clock assertions byte-clean.
    //
    // THE TWO CLOCKS (one death event, t=2):
    //   ACA: pre65 = livingCount(1) − count65(1) = 0 from t=2 ⇒ the premium stops IMMEDIATELY.
    //   IRMAA: year t bills IRMAA-MAGI[t−2] against filing[t−2] ⇒ t=2,3 still bill the MFJ
    //   column (both alive at the lagged years 0,1); the SINGLE column first bites at t=4 —
    //   on a MAGI recorded at t=2. Both lagged MAGIs (history[1] = 122,905.45 from the
    //   ACA-priced year, history[2] = 118,471.31 from the survivor year) sit BETWEEN the
    //   single tier-1 threshold (109,000) and the MFJ tier-1 threshold (218,000), and below
    //   single tier-2 (137,000) — so the t=3→t=4 bill jump is PURELY the threshold column
    //   flipping, the mistimed-widow-penalty mechanism itself (insight 014: the crossing year).
    //
    // PER-YEAR DERIVATIONS (each value interior to its named regime — insight 023):
    //   t=0,1 (MFJ, count65=1, full bonus, 12% band): over-cliff gross funds fundingNet + 16,000
    //     = 95,000 + 2,434.80 + 16,000 ⇒ g = (113,434.80 − 5,278)/0.88 = 122,905.4545
    //     (taxable 83,055.45 ∈ (24,800, 100,800) ✓; MAGI < 150,000 ⇒ bonus full ✓).
    //   t=2,3 (single survivor, count65=1, bonus PHASED, 22% band): D(g) = 16,100 + 2,050 +
    //     (6,000 − 0.06(g − 75,000)) = 28,650 − 0.06g ⇒ tax = 0.2332·g − 11,591 ⇒
    //     g = (100,000 + 2,434.80 − 11,591)/0.7668 = 118,471.3093 (bonus 3,391.72 ∈ (0, 6,000) ✓;
    //     taxable 96,929.59 ∈ (50,400, 105,700) ✓).
    //   t=4 (single, tier-1 surcharge now in the bill): g = (100,000 + 3,583.20 − 11,591)/0.7668
    //     = 119,968.9619 (bonus 3,301.86 ✓; taxable 98,517.10 ✓).
    // TOTALS: medicare = 4 × 2,434.80 + 3,583.20 = 13,322.40; premium = 2 × 16,000 = 32,000;
    // terminal = 2,000,000 − (2×122,905.4545 + 2×118,471.3093 + 119,968.9619) = 1,397,277.5103.
    const owner = { birthYear: 1959 }
    const spouse = { birthYear: 1965 }
    const cfg: TaxOverlayConfig = {
      taxEnabled: true,
      rmdEnabled: false,
      household: { startCalendarYear: 2026, filing: 'mfj', owner, spouse },
    }
    const living: HouseholdYear[] = [
      { living: [owner, spouse] }, // t=0
      { living: [owner, spouse] }, // t=1
      { living: [owner] }, // t=2 — the death year (ACA stops HERE; IRMAA still bills MFJ)
      { living: [owner] }, // t=3 — IRMAA still MFJ (filing[1])
      { living: [owner] }, // t=4 — IRMAA flips to SINGLE (filing[2]) — the widow penalty lands
    ]
    const NETS = [95_000, 95_000, 100_000, 100_000, 100_000]
    const runYears = (years: number) =>
      runTaxAwareDecumulation(
        { taxable: 0, pretax: 2_000_000, roth: 0 },
        [0, 0, 0, 0, 0].slice(0, years),
        [0, 0, 0, 0, 0].slice(0, years),
        NETS.slice(0, years),
        STOCK_W,
        'pre-tax-first',
        cfg,
        {
          healthcareEnabled: true,
          slcsp: [14_000, 14_000, 14_000, 14_000, 14_000].slice(0, years),
          enrolledPremium: [16_000, 16_000, 16_000, 16_000, 16_000].slice(0, years),
          irmaaMagiSeed: [150_000, 150_000],
          householdYears: living.slice(0, years),
        },
      )

    it('the ACA clock is IMMEDIATE: the premium accrues for exactly the two both-alive years and stops at the death year (streams still present)', () => {
      // Horizon differencing pins WHICH years paid: t=0,1 pay the full over-cliff 16,000 each;
      // t=2 pays NOTHING though enrolled[2] = 16,000 is present — the death, not the data, ended it.
      expect(runYears(2).totalNetPremiumReal).toBe(32_000) // over-cliff ⇒ EXACT (no bisection)
      expect(runYears(3).totalNetPremiumReal).toBe(32_000) // t=2 added ZERO — the immediate clock
      expect(runYears(5).totalNetPremiumReal).toBe(32_000)
    })

    it('the IRMAA clock is +2yr: t=2,3 bill the MFJ column (no surcharge on a 109k–218k MAGI); the single column — and the surcharge — first land at t=4', () => {
      // Per-year Medicare cost via horizon differencing. t=2: lag reads MAGI[0] = 122,905.45
      // against filing[0] = MFJ ⇒ under 218,000 ⇒ base only — the widow is STILL billed as MFJ
      // (the mistimed-penalty mechanism). t=4: lag reads MAGI[2] = 118,471.31 against
      // filing[2] = SINGLE ⇒ over 109,000 ⇒ tier-1 surcharge ×1. A current-filing regression
      // (filing[t]) would surcharge t=2,3 too; a current-MAGI regression (MAGI[t]) moves the
      // dollar values; a dead-member-billing regression (the spouse turns 65 at t=4 — dead)
      // would bill ×2 at t=4. Each fails these exact figures.
      const t2Cost = runYears(3).totalMedicareCostReal - runYears(2).totalMedicareCostReal
      const t3Cost = runYears(4).totalMedicareCostReal - runYears(3).totalMedicareCostReal
      const t4Cost = runYears(5).totalMedicareCostReal - runYears(4).totalMedicareCostReal
      expect(t2Cost).toBeCloseTo(medicareAnnual(1, null), 8) // MFJ column at t=2 — no surcharge
      expect(t3Cost).toBeCloseTo(medicareAnnual(1, null), 8) // MFJ column at t=3 — no surcharge
      expect(t4Cost).toBeCloseTo(medicareAnnual(1, 0), 8) // SINGLE column at t=4 — tier 1, ×1
    })

    it('the full 5-year value chain lands exactly (terminal + both health totals — the integrated cross-overlay golden)', () => {
      const r = runYears(5)
      expect(r.depletionYear).toBe(NEVER_DEPLETED)
      expect(r.totalMedicareCostReal).toBeCloseTo(4 * medicareAnnual(1, null) + medicareAnnual(1, 0), 8)
      expect(r.totalNetPremiumReal).toBe(32_000)
      expect(r.terminalReal).toBeCloseTo(1_397_277.5103, 2)
    })
  })

  // -------------------------------------------------------------------------
  // M6 Slice 2 — totalTaxPaidReal, the FOURTH parallel accounting surface (the
  // solver output contract's lifetime-tax half). Externally derived (DND/012):
  // every expected tax is the hand-solved closed form, never the engine's.
  // -------------------------------------------------------------------------
  describe('totalTaxPaidReal — the lifetime-tax accounting surface (M6 Slice 2)', () => {
    it('a tax-only zero-return year reads back the exact hand-solved tax (gross − net)', () => {
      // MFJ both born 1966 (60 — count65 = 0 ⇒ flat 32,200 deduction). net 50,000, 10% regime:
      // g = (50,000 − 3,220)/0.9 = 51,977.7778 (taxable 19,777.78 ≤ 24,800 ✓) ⇒ tax = 1,977.7778.
      const cfg: TaxOverlayConfig = { taxEnabled: true, rmdEnabled: false, household: mkHousehold(2026, 1966, 1966) }
      const r = runTaxAwareDecumulation({ taxable: 0, pretax: 1_000_000, roth: 0 }, [0], [0], [50_000], STOCK_W, 'pre-tax-first', cfg, {})
      expect(r.totalTaxPaidReal).toBeCloseTo(1_977.7778, 2)
      expect(r.terminalReal).toBeCloseTo(1_000_000 - 51_977.7778, 2)
    })

    it('a dual-regime year separates the FOUR surfaces exactly: tax ≠ premium ≠ Medicare ≠ HSA (the arm-1 fixture decomposed)', () => {
      // The dual-regime arm-1 fixture: gross = 69,396.2071 funds fundingNet 57,434.80 +
      // premium 8,911.8622 + TAX — so tax = 0.12·g − 5,278 = 3,049.5448 (the 12%-regime
      // closed form, panel-confirmed). Each cost lands on ITS OWN surface, none double-counted:
      // gross = fundingNet + premium + tax reconciles to the dollar.
      const MIXED: TaxOverlayConfig = { taxEnabled: true, rmdEnabled: false, household: mkHousehold(2026, 1960, 1963) }
      const r = runTaxAwareDecumulation({ taxable: 0, pretax: 1_000_000, roth: 0 }, [0], [0], [55_000], STOCK_W, 'pre-tax-first', MIXED, {
        healthcareEnabled: true,
        slcsp: [14_000],
        enrolledPremium: [16_000],
        irmaaMagiSeed: [150_000],
      })
      expect(r.totalTaxPaidReal).toBeCloseTo(3_049.5448, 2)
      // The reconciliation identity: the year's gross (= P − terminal) decomposes EXACTLY into
      // spending + Medicare + premium + tax (the four ways a dollar leaves beyond the portfolio).
      const gross = 1_000_000 - r.terminalReal
      expect(gross).toBeCloseTo(55_000 + r.totalMedicareCostReal + r.totalNetPremiumReal + r.totalTaxPaidReal, 6)
    })

    it('tax OFF ⇒ 0; a sub-deduction year ⇒ EXACTLY 0 (gross === net, no float residue)', () => {
      const off = runTaxAwareDecumulation({ taxable: 0, pretax: 500_000, roth: 0 }, [0], [0], [20_000], STOCK_W, 'pre-tax-first', OFF, {})
      expect(off.totalTaxPaidReal).toBe(0)
      // Tax ON but the draw sits under the deduction stack: the gross-up converges at gross = net
      // on its first pass ⇒ tax = net − net = 0 exactly (no accumulated dust on the new surface).
      const cfg: TaxOverlayConfig = { taxEnabled: true, rmdEnabled: false, household: mkHousehold(2026, 1966, 1966) }
      const sub = runTaxAwareDecumulation({ taxable: 0, pretax: 500_000, roth: 0 }, [0], [0], [20_000], STOCK_W, 'pre-tax-first', cfg, {})
      expect(sub.totalTaxPaidReal).toBe(0)
    })

    it('a depletion year accrues NO tax (the fourth surface sits AFTER the depletion check, like its three siblings)', () => {
      // net 95,000 on a 100,000 pool: the gross-up converges ABOVE the pool (the capped-alloc
      // fixed point lands ≈ 102,640 with ≈ 7,640 of computed tax), the year cannot fund it ⇒
      // depleted at t = 0 — and the tax the year FAILED to pay is never counted (the same
      // over-accrual class the premium/Medicare/HSA siblings pin). An accrual placed BEFORE
      // the depletion check would report ≈ 7,640 here, not 0 — the discriminating arm.
      const cfg: TaxOverlayConfig = { taxEnabled: true, rmdEnabled: false, household: mkHousehold(2026, 1966, 1966) }
      const r = runTaxAwareDecumulation({ taxable: 0, pretax: 100_000, roth: 0 }, [0], [0], [95_000], STOCK_W, 'pre-tax-first', cfg, {})
      expect(r.depletionYear).toBe(0)
      expect(r.totalTaxPaidReal).toBe(0)
    })
  })
})

// ===========================================================================
// R40 · U3 — seam 2 (the ongoing-income taxable enters nonSSordinary ONCE — KTD-1) and the
// KTD-9 IRMAA decouple, at the overlay level. The MAGI math is golden (taxableSocialSecurity,
// irmaaMagi, the M4 feed-forward above); these pin the WIRING: §86 rose ONCE (not doubled), the
// gross-up nets the unclamped taxable, and the clamped working-year taxable lifts IRMAA-MAGI
// WITHOUT minting a phantom withdrawal. Externally-derived where a magnitude is asserted (DND/012).
// ===========================================================================
describe('taxOverlay — R40 seam 2: the ongoing-income taxable enters ordinary income ONCE (KTD-1)', () => {
  const P = 1_000_000
  const POOL: AccountBuckets = { taxable: 0, pretax: P, roth: 0 }
  const bothBorn1959MFJ: TaxOverlayConfig = { taxEnabled: true, rmdEnabled: false, household: mkHousehold(2026, 1959, 1959) }

  /** Re-solve one year's gross with SS + the ongoing-income taxable folded in, using ONLY the
   *  golden pure fns. `nonSSfromGross(g)` = the pre-tax distribution; `ongoingTaxable` is the new
   *  R40 ordinary term. The §86 provisional reads (nonSS-ordinary), so the ongoing taxable enters
   *  the §86 base too — but EXACTLY ONCE (it is one addend in nonSSordinary). A WIRING bug that
   *  added it to both the ordinary base AND the §86 base separately would double the §86 effect and
   *  diverge from this reference. */
  const solveGross = (
    net: number,
    nonSSfromGross: (g: number) => number,
    ss: number,
    ongoingTaxable: number,
    count65: number,
  ): number => {
    let gross = net
    for (let i = 0; i < 300; i++) {
      const nonSS = nonSSfromGross(gross) + ongoingTaxable
      gross = net + ordinaryIncomeTax(nonSS + taxableSocialSecurity(nonSS, ss, 'mfj'), 'mfj', count65)
    }
    return gross
  }

  it('a fully-taxable ongoing stream matches the SS-aware re-solve with ONE ongoing addend (not doubled)', () => {
    // pre-tax-only, pre-tax-first ⇒ nonSS = max(gross, 0) = gross. $40k net + $30k SS + $25k ongoing
    // taxable. The ongoing taxable enters nonSSordinary once; the §86 provisional reads that same
    // single value. The engine's gross must equal solveGross with ongoingTaxable counted ONCE.
    const net = 40_000
    const ss = 30_000
    const ongoing = 25_000
    const r = runTaxAwareDecumulation(POOL, realStock, realBond, [net], STOCK_W, 'pre-tax-first', bothBorn1959MFJ, {
      ssBenefits: [ss],
      ongoingTaxableGrossUp: [ongoing],
    })
    const sp = spine(P, [net])
    const expectedGross = solveGross(net, (g) => g, ss, ongoing, 2)
    // year-0 gross = P − terminalReal/(spine growth ratio): match the gross via the terminal ratio.
    expect(r.terminalReal / sp.terminalReal).toBeCloseTo((P - expectedGross) / (P - net), 7)
  })

  it('§86 rose ONCE: the taxable-SS lift from the ongoing income equals a SINGLE application, never double', () => {
    // Externally-derived (DND/012). MFJ. A pre-tax draw such that without the ongoing income the SS
    // is in the (32k, 44k] middle band, and with it the same band — so the §86 marginal is a clean
    // 0.5 on the ongoing dollars (no band crossing). nonSS-without = 20k; SS = 20k (½ = 10k):
    // provisional = 30k < 32k ⇒ 0 taxable. Add ongoing 6k ⇒ nonSS 26k, provisional 36k ∈ (32k,44k]
    // ⇒ taxable = 0.5 × (36k − 32k) = 2,000. The §86 helper IS the oracle; this asserts the ongoing
    // taxable enters its base exactly once (a double-count would give 0.5 × (42k − 32k) = 5,000).
    const ss = 20_000
    const without = taxableSocialSecurity(20_000, ss, 'mfj')
    const withOngoing = taxableSocialSecurity(20_000 + 6_000, ss, 'mfj')
    expect(without).toBe(0)
    expect(withOngoing).toBeCloseTo(2_000, 6) // single application of the ongoing 6k into the §86 base
    // The double-count shape (ongoing added to nonSS AND separately to the §86 other-income term):
    const doubled = taxableSocialSecurity(20_000 + 6_000 + 6_000, ss, 'mfj')
    expect(doubled).toBeCloseTo(5_000, 6) // what a seam-3 double-edit would have produced — refuted
    expect(withOngoing).not.toBeCloseTo(doubled, 1)
  })

  it('reduce-to-spine: an ongoing-taxable stream with tax OFF is ignored (the OFF anchor is unperturbed)', () => {
    const got = runTaxAwareDecumulation(POOL, realStock, realBond, [60_000], STOCK_W, 'pre-tax-first', OFF, {
      ongoingTaxableGrossUp: flat(25_000),
      ongoingTaxableIrmaaOnly: flat(25_000),
    })
    const sp = spine(P, [60_000])
    expect(got.terminalReal).toBe(sp.terminalReal)
    expect(got.depletionYear).toBe(sp.depletionYear)
  })

  it('a NaN ongoing-taxable entry fails loud (the overlay backstop; insights 008/010)', () => {
    expect(() =>
      runTaxAwareDecumulation(POOL, realStock, realBond, [40_000], STOCK_W, 'pre-tax-first', bothBorn1959MFJ, {
        ongoingTaxableGrossUp: [Number.NaN],
      }),
    ).toThrow(/ongoingTaxableGrossUp/)
    expect(() =>
      runTaxAwareDecumulation(POOL, realStock, realBond, [40_000], STOCK_W, 'pre-tax-first', bothBorn1959MFJ, {
        ongoingTaxableIrmaaOnly: [-1],
      }),
    ).toThrow(/ongoingTaxableIrmaaOnly/)
  })
})

describe('taxOverlay — R40 · KTD-9: the IRMAA decouple (clamped working-year taxable lifts IRMAA-MAGI, never the gross-up)', () => {
  // Reuse the M4 post-65 IRMAA fixture geometry. Both born 1959 (age 67, Medicare every year, no RMD
  // < 73). A big pretax pool that never depletes. The IRMAA surcharge for year t reads IRMAA-MAGI[t−2].
  const PP = 2_000_000
  const POOL: AccountBuckets = { taxable: 0, pretax: PP, roth: 0 }
  const POST65: TaxOverlayConfig = { taxEnabled: true, rmdEnabled: false, household: mkHousehold(2026, 1959, 1959) }
  const IRMAA_SCHED = irmaa.value
  const BASE = partB2026.value.standardPremiumMonthly
  const lowSeed = [60_000, 60_000]
  const surchargeMonthly = (tierIdx: number) =>
    IRMAA_SCHED.tiers[tierIdx]!.partBSurchargeMonthly + IRMAA_SCHED.tiers[tierIdx]!.partDSurchargeMonthly
  const medicareAnnual = (count: number, tierIdx: number | null) =>
    count * (BASE + (tierIdx === null ? 0 : surchargeMonthly(tierIdx))) * 12
  const run = (net: readonly number[], inputs: TaxYearInputs) =>
    runTaxAwareDecumulation(POOL, realStock, realBond, net, STOCK_W, 'pre-tax-first', POST65, inputs)

  it('the gross-up feed lifts IRMAA-MAGI through the +2 lag (an unclamped ongoing stream surcharges year 2)', () => {
    // A year-0 ongoing taxable above the MFJ tier-1 threshold via the gross-up feed lands in
    // IRMAA-MAGI[0] (it rode nonSSordinary), so year 2 (reading MAGI[0]) is surcharged. Years 0,1
    // read the low seed ⇒ base only. The directional pin that the gross-up feed reaches IRMAA-MAGI.
    const big = IRMAA_SCHED.tiers[1]!.mfjMagiThreshold
    const withOngoing = run([20_000, 20_000, 20_000], { healthcareEnabled: true, irmaaMagiSeed: lowSeed, ongoingTaxableGrossUp: [big, 0, 0] })
    const noOngoing = run([20_000, 20_000, 20_000], { healthcareEnabled: true, irmaaMagiSeed: lowSeed })
    expect(withOngoing.totalMedicareCostReal).toBeGreaterThan(noOngoing.totalMedicareCostReal)
  })

  it('the KTD-9 decouple: the IRMAA-ONLY feed lifts IRMAA-MAGI[0] WITHOUT minting a withdrawal — year-2 surcharge rises, year-0 terminal is UNCHANGED', () => {
    // The wages-only clamped path: the ongoing taxable rides ongoingTaxableIrmaaOnly (NOT the
    // gross-up). It must (a) NOT mint any extra withdrawal — the year-0/1 cash trajectory is
    // identical to no-ongoing (the wages funded its tax outside the portfolio), AND (b) still lift
    // IRMAA-MAGI[0] over a tier so year 2's surcharge fires. A naive "add to the gross-up" wire
    // would drain the portfolio in year 0 (failing a); a "drop it from IRMAA" wire would leave the
    // surcharge flat (failing b — the optimistic sin KTD-9 exists to prevent).
    const big = IRMAA_SCHED.tiers[1]!.mfjMagiThreshold
    const irmaaOnly = run([20_000, 20_000, 20_000], { healthcareEnabled: true, irmaaMagiSeed: lowSeed, ongoingTaxableIrmaaOnly: [big, 0, 0] })
    const noOngoing = run([20_000, 20_000, 20_000], { healthcareEnabled: true, irmaaMagiSeed: lowSeed })
    // (b) the surcharge fires at year 2 — the IRMAA-only feed DID reach IRMAA-MAGI.
    expect(irmaaOnly.totalMedicareCostReal).toBeGreaterThan(noOngoing.totalMedicareCostReal)
    // (a) NO phantom withdrawal: run a 2-year horizon (years 0,1 — before the lagged surcharge bites)
    // and confirm the terminal is byte-identical to no-ongoing. The IRMAA-only feed touched neither
    // the gross-up nor the netting in years 0,1, so the cash trajectory is unperturbed there.
    const irmaaOnly2 = run([20_000, 20_000], { healthcareEnabled: true, irmaaMagiSeed: lowSeed, ongoingTaxableIrmaaOnly: [big, 0] })
    const noOngoing2 = run([20_000, 20_000], { healthcareEnabled: true, irmaaMagiSeed: lowSeed })
    expect(irmaaOnly2.terminalReal).toBe(noOngoing2.terminalReal) // no phantom withdrawal minted
    expect(irmaaOnly2.totalTaxPaidReal).toBe(noOngoing2.totalTaxPaidReal) // the IRMAA-only feed paid no tax through the portfolio
  })

  it('counted ONCE: the IRMAA-only feed adds EXACTLY its dollars to IRMAA-MAGI (the surcharge tier matches the wages+pension sum)', () => {
    // Externally-derived (DND/012). Seed a wages-only working-year IRMAA-MAGI override JUST below the
    // tier-1 threshold; the pension's IRMAA-only taxable pushes the sum over. The year-2 surcharge
    // must be tier-1 (sum > threshold), proving wages + pension are counted once each — not the
    // pension dropped (sum below ⇒ no surcharge) nor double-counted (sum over a higher tier).
    const T1 = IRMAA_SCHED.tiers[0]!.mfjMagiThreshold
    const T2 = IRMAA_SCHED.tiers[1]!.mfjMagiThreshold
    const wages = T1 - 10_000 // just under tier 1 alone
    // STRADDLE the tier boundary so the exact tier-1 total kills BOTH mutants at once (literals stay
    // SYMBOLIC — T1/T2 are read from the constant, never re-typed; the copyGuard greps src for inlined
    // dated figures, so no raw threshold appears here):
    //  • counted-once: wages + pension ⇒ tier 1 (T1 < wages+pension < T2).
    //  • double-count: wages + 2×pension ⇒ tier 2 (≥ T2) — a DIFFERENT, higher cost.
    // (wages = T1 − 10k and pension = 40k straddle given the shipped T1/T2 gap; the asserts below
    //  prove the straddle off the constant, not off a typed number.)
    const pension = 40_000
    expect(wages + pension).toBeGreaterThan(T1)
    expect(wages + pension).toBeLessThan(T2)
    expect(wages + 2 * pension).toBeGreaterThanOrEqual(T2) // double-count would cross into tier 2
    // irmaaMagiOverride is the wages-only component (KTD-9 re-spec); ongoingTaxableIrmaaOnly is the
    // pension. Both land at the SAME history site, additively, each once. The draws are 0 so the
    // computed gross-up MAGI is ≈$0 — IRMAA-MAGI[0] = wages + pension exactly.
    const r = run([0, 0, 0], {
      healthcareEnabled: true,
      irmaaMagiSeed: lowSeed,
      irmaaMagiOverride: [wages, 0, 0],
      ongoingTaxableIrmaaOnly: [pension, 0, 0],
      // bridgeYearMask absent (post-65, no bridge) so the override coverage gate is inert here.
    })
    // year 2 reads IRMAA-MAGI[0] = wages + pension ⇒ tier 1 (count 2). Years 0,1 base only (low seed).
    const expected = medicareAnnual(2, null) * 2 + medicareAnnual(2, 0)
    expect(r.totalMedicareCostReal).toBeCloseTo(expected, 4)
    // The fixture STRADDLES the tier boundary, so the exact tier-1 total refutes BOTH mutants:
    //  • DROPPED-pension (IRMAA-MAGI[0] = wages alone < T1 ⇒ all base, strictly less).
    //  • DOUBLE-count (wages + 2×pension ≥ T2 ⇒ tier-2 cost, strictly greater than tier-1).
    // Only counting wages + pension exactly once lands in (T1, T2) ⇒ the tier-1 `expected` above.
    const droppedPension = medicareAnnual(2, null) * 3
    expect(r.totalMedicareCostReal).toBeGreaterThan(droppedPension)
  })

  // ── KTD-9 TRIPWIRE — the copy half, NOW LANDED (R40 U4) ─────────────────────────────────────
  // WHAT this closes: the KTD-9 IRMAA-MAGI DOUBLE-COUNT for an already-receiving taxable stream
  //   (a pension/rental paying during a §7-clamped WORKING year). KTD-9 was a coupled 2-part change:
  //   (1) the engine owns each modeled stream's IRMAA-MAGI in all years — shipped in U3 (the
  //       `ongoingTaxableIrmaaOnly` feed at the history site, asserted by the tests above); and
  //   (2) re-spec the working-year override as WAGES / non-modeled-MAGI ONLY and INVERT the intake
  //       copy to "working-year income EXCLUDING anything you entered as a retirement income stream"
  //       — LANDED in U4; refined to Option B then SPLIT into two fields (C3, council 2026-06-29):
  //       the intake collects pay (`workPay*`) + working-year investment income (`workInvestment*`)
  //       separately, EXCLUDING modeled streams, and `intakeMap.buildDateInput` composes their SUM
  //       into the engine's `workingYearIrmaaMagiByPerson` — i.e. the same non-modeled override this
  //       test seeds, here with working-year investment income = 0 (wages alone).
  // U4 RECIPE EXECUTED: with the inverted copy, a still-working driver types WAGES ALONE into
  //   `workingYearIrmaaMagiByPerson` → it compiles to `irmaaMagiOverride` (healthcareStreams.ts ~163)
  //   carrying wages only, and the engine adds the pension ONCE via `ongoingTaxableIrmaaOnly`
  //   (taxOverlay.ts ~1652) → IRMAA-MAGI = wages + pension, counted exactly once. The `.skip` is
  //   dropped; the tier-1 assertion now PASSES because the MECHANIC is correct (the override is
  //   wages-only), not because the assertion was weakened — it is the same `expectedCountedOnce`
  //   contract the deferred tripwire always documented.
  // This test BOTH arms (the closed-landmine control): the wages-only override lands tier-1 (counted
  //   once), AND the OLD whole-income override (`wages + pension`, what the pre-U4 copy produced) is
  //   re-run as a NEGATIVE control and shown to land tier-2 (the double-count) — so the test proves
  //   the copy inversion is what moved the cost, never a vacuous re-assert. Once the wages-only path
  //   is the live one, a regression of the copy back to whole-income would re-mint the double-count
  //   and flip the wages-only arm — caught loud here.
  // Ref: KTD-9 in docs/decisions/other-income-r40.md (~line 89) + the risk→mitigation row.
  // Constants discipline: T1/T2 are read symbolically off the `irmaa` constant — NO dated dollar
  //   threshold is inlined here or in this comment (the copyGuard/constants-shape gate greps for it).
  it('KTD-9 tripwire (copy half LANDED in U4): the wages-only override counts an already-receiving pension ONCE in IRMAA-MAGI (and the old whole-income override would double-count)', () => {
    const T1 = IRMAA_SCHED.tiers[0]!.mfjMagiThreshold
    const T2 = IRMAA_SCHED.tiers[1]!.mfjMagiThreshold
    const wages = T1 - 10_000
    const pension = 40_000
    // The straddle: wages + pension ∈ (T1, T2) ⇒ tier 1 (counted once);
    // wages + 2×pension ≥ T2 ⇒ tier 2 — a DIFFERENT, higher cost (the double-count signature).
    expect(wages + pension).toBeGreaterThan(T1)
    expect(wages + pension).toBeLessThan(T2)
    expect(wages + 2 * pension).toBeGreaterThanOrEqual(T2)

    // POST-U4 live path: the inverted copy makes the user enter WAGES ALONE into the override; the
    // engine adds the already-receiving pension once via the IRMAA-only feed. IRMAA-MAGI[0] =
    // wages + pension exactly ⇒ year-2 tier-1 cost (the contract).
    const wagesOnly = run([0, 0, 0], {
      healthcareEnabled: true,
      irmaaMagiSeed: lowSeed,
      irmaaMagiOverride: [wages, 0, 0], // U4: override = wages-only (the copy now says so)
      ongoingTaxableIrmaaOnly: [pension, 0, 0],
    })
    const expectedCountedOnce = medicareAnnual(2, null) * 2 + medicareAnnual(2, 0)
    expect(wagesOnly.totalMedicareCostReal).toBeCloseTo(expectedCountedOnce, 4)

    // NEGATIVE CONTROL (the closed landmine): the PRE-U4 whole-income override (wages + pension)
    // would double-count the pension (the engine adds it again) → wages + 2×pension ≥ T2 ⇒ tier-2,
    // a STRICTLY HIGHER cost. This proves the copy inversion is what moved the cost — and that a
    // copy regression to whole-income would be caught here, not silently shipped.
    const wholeIncome = run([0, 0, 0], {
      healthcareEnabled: true,
      irmaaMagiSeed: lowSeed,
      irmaaMagiOverride: [wages + pension, 0, 0],
      ongoingTaxableIrmaaOnly: [pension, 0, 0],
    })
    expect(wholeIncome.totalMedicareCostReal).toBeGreaterThan(wagesOnly.totalMedicareCostReal)
  })
})
