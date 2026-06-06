import { describe, it, expect } from 'vitest'
import { runTaxAwareDecumulation, type TaxOverlayConfig } from '@engine/taxOverlay'
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
    const config: TaxOverlayConfig = { taxEnabled: false, rmdEnabled: true, startCalendarYear, owner: { birthYear } }
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
      const config: TaxOverlayConfig = { taxEnabled: false, rmdEnabled: true, startCalendarYear: 1955 + 73, owner: { birthYear: 1955 } }
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
    const RMD_ON: TaxOverlayConfig = {
      taxEnabled: false,
      rmdEnabled: true,
      startCalendarYear: 2026,
      owner: { birthYear: 1948 },
    }
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
      const base = { taxEnabled: false as const, rmdEnabled: true as const, startCalendarYear: 2026, owner: { birthYear: 1948 } }
      const withSpouse = runTaxAwareDecumulation(pretaxOnly(PRETAX), realStock, realBond, [0], STOCK_W, 'proportional', { ...base, spouse: { birthYear: 1962 } })
      const noSpouse = runTaxAwareDecumulation(pretaxOnly(PRETAX), realStock, realBond, [0], STOCK_W, 'proportional', base)
      // spouse threaded but ignored → byte-identical to the no-spouse run...
      expect(withSpouse.finalBuckets.taxable).toBe(noSpouse.finalBuckets.taxable)
      // ...and the relocated fraction is exactly the ULT divisor for the owner's age 78 (not a JLLS value).
      expect(withSpouse.finalBuckets.taxable / withSpouse.terminalReal).toBeCloseTo(1 / ultDivisor(78), 12)
    })
  })
})
