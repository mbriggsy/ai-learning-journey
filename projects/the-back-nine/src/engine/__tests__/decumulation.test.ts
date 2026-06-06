import { describe, it, expect } from 'vitest'
import { stepYear, runDecumulation, totalValue, type PortfolioState } from '@engine/decumulation'
import { NEVER_DEPLETED } from '@shared/model'

describe('stepYear — the pinned per-year order (withdraw → rebalance → return)', () => {
  it('applies the three operations in the contracted order', () => {
    // total 1000, withdraw 40 → 960, rebalance 50/50 → 480/480, apply +20%/0% →
    // stock 576, bond 480, total 1056.
    const s: PortfolioState = { stock: 500, bond: 500 }
    const r = stepYear(s, 0.2, 0.0, 40, 0.5)
    expect(r.depleted).toBe(false)
    expect(r.state.stock).toBeCloseTo(576, 9)
    expect(r.state.bond).toBeCloseTo(480, 9)
    expect(totalValue(r.state)).toBeCloseTo(1056, 9)
  })

  it('depletes (balances → 0) when the withdrawal exceeds the portfolio', () => {
    const r = stepYear({ stock: 30, bond: 0 }, 0.5, 0.5, 40, 1)
    expect(r.depleted).toBe(true)
    expect(totalValue(r.state)).toBe(0)
  })
})

describe('runDecumulation — mechanical golden (hand-derived, DND/012-clean)', () => {
  it('single-asset path reproduces the hand-computed terminal', () => {
    // P0=1000, 100% stock, W=40 flat, returns [+10%, −5%, 0%, +10%]:
    //   Y0 (1000−40)·1.10 = 1056.0
    //   Y1 (1056−40)·0.95 =  965.2
    //   Y2 ( 965.2−40)·1.00 = 925.2
    //   Y3 ( 925.2−40)·1.10 = 973.72   ← terminal (computed by hand, not the engine)
    const res = runDecumulation(
      { stock: 1000, bond: 0 },
      [0.1, -0.05, 0, 0.1],
      [0, 0, 0, 0],
      [40, 40, 40, 40],
      1,
    )
    expect(res.depletionYear).toBe(NEVER_DEPLETED)
    expect(res.terminalReal).toBeCloseTo(973.72, 6)
  })

  it('two-asset rebalanced path reproduces the hand-computed terminal', () => {
    // P0=1000, 50/50, W=40 flat. realStock [+20%, −10%], realBond [0%, +10%]:
    //   Y0: 1000−40=960 → 480/480 → 576/480 → total 1056
    //   Y1: 1056−40=1016 → 508/508 → 457.2/558.8 → total 1016.0  ← hand terminal
    const res = runDecumulation(
      { stock: 500, bond: 500 },
      [0.2, -0.1],
      [0.0, 0.1],
      [40, 40],
      0.5,
    )
    expect(res.depletionYear).toBe(NEVER_DEPLETED)
    expect(res.terminalReal).toBeCloseTo(1016.0, 6)
  })

  it('is byte-stable: the same inputs reproduce the identical terminal (same engine)', () => {
    const args = [
      { stock: 500, bond: 500 } as PortfolioState,
      [0.2, -0.1, 0.05],
      [0.0, 0.1, 0.02],
      [40, 40, 40],
      0.5,
    ] as const
    const a = runDecumulation(...args)
    const b = runDecumulation(...args)
    expect(a.terminalReal).toBe(b.terminalReal) // exact equality, not close-to
  })

  it('records the absolute depletion year and stops drawing after it', () => {
    // P0=100, 100% stock, 0% returns, W=50: Y0 100−50=50; Y1 50−50=0 → deplete at t=1.
    const res = runDecumulation({ stock: 100, bond: 0 }, [0, 0, 0], [0, 0, 0], [50, 50, 50], 1)
    expect(res.depletionYear).toBe(1)
    expect(res.terminalReal).toBe(0)
  })
})
