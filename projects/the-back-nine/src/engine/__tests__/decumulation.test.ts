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

describe('the C2 contribution credit — stepYear is the ONE crediting owner (§2)', () => {
  it('credits END-OF-YEAR: the contribution earns NO growth in its arrival year, and the growth-only total excludes it', () => {
    // total 1000, withdraw 40 → 960, rebalance 50/50 → 480/480, grow +20%/0% → 576/480
    // (growth-only 1056), THEN credit 100 split at the target weight → 626/530, total 1156.
    // Hand-derived (DND/012): the start-of-year mirror would have grown the 100 — 1156 < the
    // mirror's (960+100 rebalanced and grown) 1166, proving the conservative convention.
    const r = stepYear({ stock: 500, bond: 500 }, 0.2, 0.0, 40, 0.5, 100)
    expect(r.depleted).toBe(false)
    expect(r.growthOnlyTotal).toBeCloseTo(1056, 9)
    expect(r.state.stock).toBeCloseTo(626, 9) // 576 + 100·0.5
    expect(r.state.bond).toBeCloseTo(530, 9) // 480 + 100·0.5
    expect(totalValue(r.state)).toBeCloseTo(1156, 9)
    // The start-of-year-credited mirror (the WRONG, optimistic convention): (960+100)·blended
    // +20%/0% at 50/50 = 1060·1.1 = 1166 — the engine's 1156 sits strictly BELOW it (§2d).
    expect(totalValue(r.state)).toBeLessThan(1166)
  })

  it('contribution = 0 (and the absent argument) are byte-identical to the pre-C2 step', () => {
    const s: PortfolioState = { stock: 500, bond: 500 }
    const absent = stepYear(s, 0.2, 0.0, 40, 0.5)
    const zero = stepYear(s, 0.2, 0.0, 40, 0.5, 0)
    expect(zero.state.stock).toBe(absent.state.stock) // exact, not close-to
    expect(zero.state.bond).toBe(absent.state.bond)
    // The growth-only total IS the state total when nothing is credited (the §2c scale anchor).
    expect(absent.growthOnlyTotal).toBe(totalValue(absent.state))
  })

  it('a DEPLETED year forfeits the arrival-year contribution (the defined conservative outcome)', () => {
    // Withdrawal 40 > total 30 → depleted; the 100 contribution is NOT credited (the path
    // forfeits it — pessimistic-only, never optimistic; C2 §2).
    const r = stepYear({ stock: 30, bond: 0 }, 0.5, 0.5, 40, 1, 100)
    expect(r.depleted).toBe(true)
    expect(totalValue(r.state)).toBe(0)
    expect(r.growthOnlyTotal).toBe(0)
  })

  it('runDecumulation: the externally-derived two-year projection (end-of-year crediting, DND/012)', () => {
    // P0=1000, 100% stock, W=0, returns [+10%, 0%], contributions [100, 100]. Hand-compounded:
    //   Y0: 1000·1.10 = 1100, +100 → 1200   (the contribution earned NO year-0 growth)
    //   Y1: 1200·1.00 = 1200, +100 → 1300   ← terminal (derived by hand + the independent
    //       derivation panel, never via the engine's own formula).
    const res = runDecumulation({ stock: 1000, bond: 0 }, [0.1, 0], [0, 0], [0, 0], 1, [100, 100])
    expect(res.depletionYear).toBe(NEVER_DEPLETED)
    expect(res.terminalReal).toBeCloseTo(1300, 9)
  })

  it('runDecumulation: the contribution stream is AUXILIARY — a short/absent tail is a $0 year, never the end of data', () => {
    // Same fixture, contributions only [100]: Y0 → 1200; Y1 grows 0% + nothing → 1200. The
    // withdrawals array (length 2) alone governs the horizon.
    const short = runDecumulation({ stock: 1000, bond: 0 }, [0.1, 0], [0, 0], [0, 0], 1, [100])
    expect(short.terminalReal).toBeCloseTo(1200, 9)
    // And ABSENT ⇒ byte-identical to the pre-C2 path (exact equality, the reduce-to-spine seam).
    const absent = runDecumulation({ stock: 1000, bond: 0 }, [0.1, 0], [0, 0], [40, 40], 1)
    const zeros = runDecumulation({ stock: 1000, bond: 0 }, [0.1, 0], [0, 0], [40, 40], 1, [0, 0])
    expect(zeros.terminalReal).toBe(absent.terminalReal)
    expect(zeros.depletionYear).toBe(absent.depletionYear)
  })
})
