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
import { uniformLifetimeTableDivisors, capitalGainsBreakpoints } from '@engine/constants'

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
      expect(per.finalBuckets).toEqual({ taxable: 0, pretax: 0, roth: 0 })
    })

    it('rejects a living set that is not the household’s own OverlayPerson references (R19 fail-loud, not silent all-dead)', () => {
      const cfg: TaxOverlayConfig = { taxEnabled: false, rmdEnabled: true, household: mkHousehold(2026, 1948, 1962) }
      // Fresh literals — value-equal to the household but DISTINCT references → match nobody. Without the
      // guard this silently marks everyone dead → zero RMD forever (calm-but-wrong). It must fail loud.
      const mismatched: HouseholdYear[] = [{ living: [{ birthYear: 1948 }, { birthYear: 1962 }] }]
      expect(() =>
        runTaxAwareDecumulation({ taxable: 0, pretax: 2_000_000, roth: 0 }, realStock, realBond, [0], STOCK_W, 'proportional', cfg, {
          initialPretaxByPerson: [1_000_000, 1_000_000],
          householdYears: mismatched,
        }),
      ).toThrow(/matches no household person/)
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
