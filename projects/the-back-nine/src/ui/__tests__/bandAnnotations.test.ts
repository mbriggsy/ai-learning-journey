import { describe, it, expect } from 'vitest'
import { deriveSpineBandAnnotations } from '../bandAnnotations'
import { copy, slots } from '../copy'

describe('deriveSpineBandAnnotations — the spine band household-clock markers', () => {
  it('brackets named endpoints (Today, Plan horizon) around intermediate decade-age ticks', () => {
    const a = deriveSpineBandAnnotations(66, 64, 49) // a full-horizon couple (age 115)
    expect(a[0]!.id).toBe('today')
    expect(a[a.length - 1]!.id).toBe('horizon')
    // the intermediate ticks are the primary person's round decades, capped at 100
    expect(a.slice(1, -1).map((m) => m.id)).toEqual(['age-70', 'age-80', 'age-90', 'age-100'])
    // honesty: a "work stops" marker would point into the past for a retired couple — never emitted
    expect(a.some((m) => m.id === 'retire' || /work/i.test(m.label))).toBe(false)
  })

  it('the intermediate ticks carry just the ages (no named word), the spouse age-gap preserved', () => {
    const a = deriveSpineBandAnnotations(66, 64, 49)
    const tick90 = a.find((m) => m.id === 'age-90')
    expect(tick90).toBeDefined()
    expect(tick90!.label).toBe('') // ticks have no named word — only the endpoints do
    expect(tick90!.yearsFromNow).toBe(24) // 90 − 66
    expect(tick90!.ages).toBe(slots.bandClockAges(90, 88)) // gap of 2 preserved (66/64 → 90/88)
    expect(tick90!.description).toBe(slots.bandClockAgesDesc(90, 88))
  })

  it('caps ticks at age 100 — the faded, vanishing-cohort tail is not cluttered with marks', () => {
    const a = deriveSpineBandAnnotations(66, 64, 49) // horizon is age 115
    expect(a.some((m) => m.id === 'age-100')).toBe(true)
    expect(a.some((m) => m.id === 'age-110')).toBe(false)
  })

  it('keeps ticks clear of the horizon endpoint (no tick crowds Plan horizon)', () => {
    // horizon 22 (age 88): a 90 tick would land past it; 70 + 80 sit clear
    const a = deriveSpineBandAnnotations(66, 64, 22)
    expect(a.slice(1, -1).map((m) => m.id)).toEqual(['age-70', 'age-80'])
  })

  it('places Today at year 0 with both current ages', () => {
    const [today] = deriveSpineBandAnnotations(66, 64, 30)
    expect(today!.yearsFromNow).toBe(0)
    expect(today!.label).toBe(copy.bandClockTodayLabel)
    expect(today!.ages).toBe(slots.bandClockAges(66, 64))
    expect(today!.description).toBe(slots.bandClockTodayDesc(66, 64))
  })

  it('anchors the plan-horizon marker at the fan’s ACTUAL last year, ages advanced to it', () => {
    // A fan that ends at 22 (the last couple died before maxHorizon) — the marker must track 22, not 30.
    const a = deriveSpineBandAnnotations(66, 64, 22)
    const horizon = a.find((m) => m.id === 'horizon')!
    expect(horizon.yearsFromNow).toBe(22)
    expect(horizon.label).toBe(copy.bandClockHorizonLabel)
    expect(horizon.ages).toBe(slots.bandClockAges(88, 86)) // 66+22 / 64+22
    expect(horizon.description).toBe(slots.bandClockHorizonDesc(88, 86))
  })

  it('the markers are monotonic in yearsFromNow (the band x-axis is a forward clock)', () => {
    const a = deriveSpineBandAnnotations(70, 68, 18)
    for (let i = 1; i < a.length; i++) {
      expect(a[i]!.yearsFromNow).toBeGreaterThan(a[i - 1]!.yearsFromNow)
    }
  })
})
