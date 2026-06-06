import { describe, it, expect } from 'vitest'
import { validationMarket, productionMarket, survivorSpendingRatio } from '../methodology'

describe('methodology defaults — provenance + sanity', () => {
  it('every figure is source-stamped and directional-until-pinned', () => {
    for (const s of [validationMarket, productionMarket, survivorSpendingRatio]) {
      expect(s.citation.length).toBeGreaterThan(0)
      expect(s.directionalUntilPinned).toBe(true)
      expect(s.pinTo && s.pinTo.length).toBeGreaterThan(0)
    }
  })

  it('validation moments are historically-calibrated: stocks > bonds, real', () => {
    const m = validationMarket.value
    expect(m.stock.mean).toBeGreaterThan(m.bond.mean)
    expect(m.stock.stdDev).toBeGreaterThan(m.bond.stdDev)
    expect(m.returnsAreReal).toBe(true)
    expect(m.space).toBe('simple')
    // 50/50 real arithmetic blend ≈ 5.5% (the Pfau cross-check ~5.6%)
    const blend50 = 0.5 * m.stock.mean + 0.5 * m.bond.mean
    expect(blend50).toBeGreaterThan(0.045)
    expect(blend50).toBeLessThan(0.065)
  })

  it('production defaults are strictly more conservative than the validation set', () => {
    expect(productionMarket.value.stock.mean).toBeLessThan(validationMarket.value.stock.mean)
    expect(productionMarket.value.bond.mean).toBeLessThan(validationMarket.value.bond.mean)
    // 50/50 production real blend ≈ 3.0% (the Pfau/Kitces ~3–3.5% safe-rate regime)
    const p = productionMarket.value
    const blend50 = 0.5 * p.stock.mean + 0.5 * p.bond.mean
    expect(blend50).toBeGreaterThan(0.02)
    expect(blend50).toBeLessThan(0.04)
  })

  it('survivor-spending ratio defaults to a grounded ~0.75 in (0, 1]', () => {
    expect(survivorSpendingRatio.value).toBe(0.75)
    expect(survivorSpendingRatio.value).toBeGreaterThan(0)
    expect(survivorSpendingRatio.value).toBeLessThanOrEqual(1)
  })
})
