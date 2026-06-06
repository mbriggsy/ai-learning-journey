import { describe, it, expect } from 'vitest'
import {
  runTaxAwareDecumulation,
  ordinaryIncomeTax,
  taxableSocialSecurity,
  type TaxOverlayConfig,
  type Household,
} from '@engine/taxOverlay'
import { runDecumulation, type PortfolioState } from '@engine/decumulation'
import { DRAWDOWN_POLICIES, NEVER_DEPLETED } from '@shared/model'
import type { AccountBuckets } from '@engine/sequencing'
import { uniformLifetimeTableDivisors } from '@engine/constants'

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

  describe('the RMD divisor seam stubs to ULT regardless of spouse (M2 — the JLLS grid is deferred)', () => {
    it('a >10yr-younger sole spouse still uses the Uniform Lifetime divisor (spouse threaded but ignored)', () => {
      // owner 78 (born 1948), spouse 64 (born 1962) — a 14yr gap that WILL switch to the Joint-Life
      // & Last-Survivor table (a SMALLER RMD) once its grid is transcribed (M6). M2 deliberately
      // stubs to ULT: the relocated fraction must equal the no-spouse ULT result (1/divisor(78))
      // exactly, AND this exercises the spouseAge thread that is otherwise dead in tests.
      const withSpouse = runTaxAwareDecumulation(pretaxOnly(PRETAX), realStock, realBond, [0], STOCK_W, 'proportional', {
        taxEnabled: false,
        rmdEnabled: true,
        household: mkHousehold(2026, 1948, 1962),
      })
      const noSpouse = runTaxAwareDecumulation(pretaxOnly(PRETAX), realStock, realBond, [0], STOCK_W, 'proportional', {
        taxEnabled: false,
        rmdEnabled: true,
        household: mkHousehold(2026, 1948),
      })
      // spouse threaded but ignored → byte-identical to the no-spouse run...
      expect(withSpouse.finalBuckets.taxable).toBe(noSpouse.finalBuckets.taxable)
      // ...and the relocated fraction is exactly the ULT divisor for the owner's age 78 (not a JLLS value).
      expect(withSpouse.finalBuckets.taxable / withSpouse.terminalReal).toBeCloseTo(1 / ultDivisor(78), 12)
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

  describe('only the pre-tax distribution is ordinary income in M3 (Roth + taxable basis deferred to M5)', () => {
    const oneSpend = [60_000]
    it('a Roth-only pool incurs no ordinary tax even with tax ON → byte-identical to the spine', () => {
      const got = runTaxAwareDecumulation({ taxable: 0, pretax: 0, roth: P }, realStock, realBond, oneSpend, STOCK_W, 'pre-tax-first', TAX_ON)
      const sp = spine(P, oneSpend)
      expect(got.terminalReal).toBe(sp.terminalReal)
      expect(got.depletionYear).toBe(sp.depletionYear)
    })
    it('a taxable-only pool incurs no ORDINARY tax in M3 (its gain is cap-gains, M5) → byte-identical to the spine', () => {
      const got = runTaxAwareDecumulation({ taxable: P, pretax: 0, roth: 0 }, realStock, realBond, oneSpend, STOCK_W, 'taxable-first', TAX_ON)
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
      const on = runTaxAwareDecumulation(buckets, realStock, realBond, [net], STOCK_W, 'proportional', TAX_ON)
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
      const zeroStream = runTaxAwareDecumulation(buckets, realStock, realBond, oneSpend, STOCK_W, 'pre-tax-first', bothBorn1959MFJ, [0])
      expect(zeroStream.terminalReal).toBe(absent.terminalReal)
      expect(zeroStream.depletionYear).toBe(absent.depletionYear)
    })
  })

  describe('reduce-to-spine: an SS stream with tax OFF is ignored (SS only matters once taxed)', () => {
    it('a positive SS stream + tax OFF → byte-identical to the spine (the OFF anchor is unperturbed)', () => {
      const oneSpend = [60_000]
      const buckets: AccountBuckets = { taxable: 0, pretax: P, roth: 0 }
      const got = runTaxAwareDecumulation(buckets, realStock, realBond, oneSpend, STOCK_W, 'pre-tax-first', OFF, flat(50_000))
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
      const withSS = runTaxAwareDecumulation(buckets, realStock, realBond, oneSpend, STOCK_W, 'pre-tax-first', cfg, [60_000])
      const noSS = runTaxAwareDecumulation(buckets, realStock, realBond, oneSpend, STOCK_W, 'pre-tax-first', cfg, [0])
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
      const on = runTaxAwareDecumulation({ taxable: 0, pretax: pool, roth: 0 }, realStock, realBond, [net], STOCK_W, 'pre-tax-first', bothBorn1959MFJ, [50_000])
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
      const run = () => runTaxAwareDecumulation(buckets, realStock, realBond, spend, STOCK_W, 'pre-tax-first', cfg, [70_000])
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
              runTaxAwareDecumulation({ taxable: 0, pretax: pool, roth: 0 }, realStock, realBond, [spend], STOCK_W, 'pre-tax-first', cfg, [ss]),
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
      const preTaxPool = runTaxAwareDecumulation({ taxable: 0, pretax: total, roth: 0 }, realStock, realBond, oneSpend, STOCK_W, 'pre-tax-first', bothBorn1959MFJ, ss)
      const rothPool = runTaxAwareDecumulation({ taxable: 0, pretax: 0, roth: total }, realStock, realBond, oneSpend, STOCK_W, 'pre-tax-first', bothBorn1959MFJ, ss)
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
      const on = runTaxAwareDecumulation(buckets, realStock, realBond, threeYears, STOCK_W, 'pre-tax-first', bothBorn1959MFJ, ssStream)
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
      const on = runTaxAwareDecumulation(buckets, realStock, realBond, threeYears, STOCK_W, 'pre-tax-first', bothBorn1959MFJ, [50_000])
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
      const on = runTaxAwareDecumulation({ taxable: 0, pretax: pool, roth: 0 }, realStock, realBond, [net], STOCK_W, 'pre-tax-first', single, [40_000])
      const sp = spine(pool, [net])
      const gross = solveGrossWithSS(net, (g) => g, 40_000, 'single', 1)
      expect(gross).toBeGreaterThan(net) // the draw + the single-threshold taxable SS are taxed
      expect(on.terminalReal / sp.terminalReal).toBeCloseTo((pool - gross) / (pool - net), 8)
    })
  })
})
