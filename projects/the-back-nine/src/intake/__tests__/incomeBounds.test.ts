import { describe, it, expect } from 'vitest'
import { COLA_PCT_MAX, COLA_PCT_MIN, colaRateInRange } from '@shared/incomeBounds'
import { productionMarket } from '@engine/reference/methodology'

/**
 * The grounded fixed-pct COLA band (Council of Elders 2026-07-01; docs/insights/049, council-log).
 * The bound is a domain judgment, so it carries a citation and a SOURCE-BIND (rider a): if a future
 * inflation re-pin outran the ceiling, the "generous above any real COLA" grounding would silently
 * become false. This test is the ground-truth guard against that drift.
 */
describe('income bounds — the fixed-pct COLA range gate', () => {
  it('the ceiling stays AT OR ABOVE the model inflation mean — a future inflation re-pin cannot silently un-ground it', () => {
    // productionMarket.value.inflation.mean is the deflator the overlay compile divides by
    // (intakeMap.ts:540-544 → otherIncome.ts). If it rose above COLA_PCT_MAX, a fixed-pct COLA at the
    // ceiling would be real-declining and the grounding claim would be false — bind them.
    expect(COLA_PCT_MAX.value).toBeGreaterThanOrEqual(productionMarket.value.inflation.mean)
  })

  it('the literal ceiling is EXACTLY parsePercent("5") so a real 5% rider clears the inclusive bound (no float razor-edge)', () => {
    // The council's load-bearing float fact: 5/100 (what parsePercent('5') returns, fields.tsx:172) is
    // the SAME IEEE-754 double as the literal 0.05, so an entered 5% is <= 0.05 with zero risk — which
    // is exactly why 0.05 (not a padded 0.06) has an EMPTY false-reject set.
    expect(5 / 100).toBe(COLA_PCT_MAX.value)
    expect(colaRateInRange(5 / 100)).toBe(true)
  })

  it('admits [-1, 0) (a decaying stream is conservative) and every real COLA, excludes the never-deplete band', () => {
    expect(colaRateInRange(COLA_PCT_MIN.value)).toBe(true) // -1 inclusive (the crash-guard floor)
    expect(colaRateInRange(-0.02)).toBe(true) // nominally decaying — the non-sin direction, allowed
    expect(colaRateInRange(0)).toBe(true)
    expect(colaRateInRange(0.03)).toBe(true) // a real 3% pension COLA
    expect(colaRateInRange(COLA_PCT_MAX.value)).toBe(true) // 0.05 inclusive
    expect(colaRateInRange(0.06)).toBe(false)
    expect(colaRateInRange(0.3)).toBe(false) // the ~$689M/yr fat-finger sin
    expect(colaRateInRange(-1.5)).toBe(false)
  })

  it('each bound carries a non-empty citation (grounded, never a guessed default — burned/062)', () => {
    expect(COLA_PCT_MAX.citation.length).toBeGreaterThan(0)
    expect(COLA_PCT_MIN.citation.length).toBeGreaterThan(0)
  })
})
