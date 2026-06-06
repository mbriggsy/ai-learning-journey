import { describe, it, expect } from 'vitest'
import { runTaxAwareDecumulation, type TaxOverlayConfig } from '@engine/taxOverlay'
import { runDecumulation, type PortfolioState } from '@engine/decumulation'
import { DRAWDOWN_POLICIES, NEVER_DEPLETED } from '@shared/model'
import type { AccountBuckets } from '@engine/sequencing'

// ---------------------------------------------------------------------------
// Deterministic fixtures (no RNG — the seam is a pure transform). Mixed-sign real
// returns so rebalancing + the per-year order actually matter; a flat withdrawal.
// ---------------------------------------------------------------------------
const H = 30
const STOCK_W = 0.6
const realStock = Array.from({ length: H }, (_, t) => 0.07 + 0.18 * Math.sin(t * 1.3))
const realBond = Array.from({ length: H }, (_, t) => 0.025 + 0.06 * Math.cos(t * 0.7))

const OFF: TaxOverlayConfig = { taxEnabled: false }

/** The spine's decumulation, initialised EXACTLY as simulate.ts does (stock = w·P,
 *  bond = (1−w)·P) so byte-identity is a fair comparison. */
function spine(portfolio: number, withdrawals: readonly number[]) {
  const initial: PortfolioState = { stock: STOCK_W * portfolio, bond: (1 - STOCK_W) * portfolio }
  return runDecumulation(initial, realStock, realBond, withdrawals, STOCK_W)
}

const flat = (amount: number) => Array.from({ length: H }, () => amount)

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
