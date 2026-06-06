import { describe, it, expect } from 'vitest'
import { toRealSeries, rollingSuccessRate, backtestWindow, type BacktestConfig } from '@engine/historical'
import { SHILLER_1925_1995 } from '@engine/reference/shillerSeries'

const real = toRealSeries(SHILLER_1925_1995)

describe('toRealSeries — nominal → real deflation', () => {
  it('starts at 1926 (the first year with a prior CPI) and is 70 years long', () => {
    expect(real.length).toBe(70) // 1926..1995
    expect(real[0]?.year).toBe(1926)
    expect(real[real.length - 1]?.year).toBe(1995)
  })

  it('applies the exact Fisher real-return formula (clean synthetic case, DND/012)', () => {
    // nominal +21% under exactly +10% inflation → real = 1.21/1.10 − 1 = 0.10 exactly;
    // nominal +10% under +10% inflation → real = 1.10/1.10 − 1 = 0 exactly.
    const synthetic = toRealSeries([
      { year: 1924, cpi: 100, stockNominal: 0, bondNominal: 0 },
      { year: 1925, cpi: 110, stockNominal: 0.21, bondNominal: 0.1 },
    ])
    expect(synthetic).toHaveLength(1)
    expect(synthetic[0]?.realStock).toBeCloseTo(0.1, 12)
    expect(synthetic[0]?.realBond).toBeCloseTo(0.0, 12)
  })

  it('the 1926 Shiller real stock return is a sane ~7% (directional sanity)', () => {
    // nominal 10.73% under 1926 inflation (17.9/17.3 ≈ 3.47%) → ≈ 7.0% real.
    expect(real[0]?.realStock).toBeGreaterThan(0.06)
    expect(real[0]?.realStock).toBeLessThan(0.08)
  })
})

describe('Trinity-style rolling backtest (DIRECTIONAL — Shiller govt bonds)', () => {
  const cfg5050: BacktestConfig = {
    initialPortfolio: 1000,
    withdrawalRate: 0.04,
    stockWeight: 0.5,
    horizonYears: 30,
  }

  it('runs the 41 overlapping 30-year windows of 1926–1995', () => {
    const res = rollingSuccessRate(real, cfg5050)
    expect(res.windows).toBe(41) // 1926–1955 … 1966–1995
  })

  it('50/50 / 4% / 30yr lands directionally near the published 95% (right band)', () => {
    const res = rollingSuccessRate(real, cfg5050)
    // DIRECTIONAL band, not exact: the committed series uses Shiller long-term
    // GOVERNMENT bonds (yield-as-return, lower vol), so a govt-bond Trinity recreation
    // runs at the high end (~95–100%) vs Trinity's 95% corporate. Exact is gated on
    // pinning the long-term-corporate series (P1 exit gate).
    console.log(`[directional] 50/50 4% 30yr success = ${(res.rate * 100).toFixed(1)}% (${res.successes}/${res.windows})`)
    // Observed 100% (41/41) — the documented govt-bond recreation value (Pfau): the
    // Shiller long-term-government yield-as-return has near-zero vol, so it runs at
    // the TOP of the band vs Trinity's 95% corporate. ≥95% is the directional floor.
    expect(res.rate).toBeGreaterThanOrEqual(0.95)
    expect(res.rate).toBeLessThanOrEqual(1.0)
  })

  it('the 100%-bond diagnostic: bonds are NOT safe (materially below 50/50)', () => {
    // §Strand-4 diagnostic — a correct inflation-adjusted engine must show bonds
    // doing POORLY (Trinity 100%-bond/4% ≈ 70%). With Shiller govt yield-as-return,
    // real bond returns are crushed in the 1966–1981 high-inflation windows.
    const bond = rollingSuccessRate(real, { ...cfg5050, stockWeight: 0 })
    const blend = rollingSuccessRate(real, cfg5050)
    console.log(`[directional] 100%-bond 4% 30yr success = ${(bond.rate * 100).toFixed(1)}% (${bond.successes}/${bond.windows})`)
    // Observed 56.1% (23/41) — directionally the "bonds do poorly" regime (Trinity
    // corporate ≈ 70%; lower here with govt yield-as-return). The point is the SHAPE:
    // bonds are demonstrably not safe under inflation-adjusted withdrawals.
    expect(bond.rate).toBeLessThan(blend.rate)
    expect(bond.rate).toBeGreaterThan(0.4)
    expect(bond.rate).toBeLessThan(0.75)
  })
})

describe('backtestWindow — boundary behaviour', () => {
  it('returns false for a window that runs past the data', () => {
    expect(backtestWindow(real, real.length - 5, {
      initialPortfolio: 1000,
      withdrawalRate: 0.04,
      stockWeight: 0.5,
      horizonYears: 30,
    })).toBe(false)
  })
})
