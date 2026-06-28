import { describe, it, expect } from 'vitest'
import { deriveBandAgesAt, deriveDateBandAnnotations, deriveSpineBandAnnotations } from '../bandAnnotations'
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

describe('deriveDateBandAnnotations — the date band markers (the FUTURE work-stops marker)', () => {
  it('places a FUTURE "work stops" marker at the crowned offset (the spine deriver never does)', () => {
    const a = deriveDateBandAnnotations(58, 60, 6, 40) // fuck off in 6 years
    const ws = a.find((m) => m.id === 'work-stops')
    expect(ws).toBeDefined()
    expect(ws!.yearsFromNow).toBe(6)
    expect(ws!.label).toBe(copy.bandClockWorkStopsLabel)
    expect(ws!.ages).toBe(slots.bandClockAges(64, 66)) // 58+6 / 60+6
    expect(ws!.description).toBe(slots.bandClockWorkStopsDesc(64, 66))
  })

  it('offset 0 (work-optional TODAY) emits NO work-stops marker — Today already marks it (honest-axis law)', () => {
    const a = deriveDateBandAnnotations(58, 60, 0, 40)
    expect(a.some((m) => m.id === 'work-stops')).toBe(false)
    expect(a[0]!.id).toBe('today')
  })

  it('drops a bare decade tick that would collide with Today (a 58-year-old’s age-60 tick, 2 years out)', () => {
    const a = deriveDateBandAnnotations(58, 60, 6, 40)
    expect(a.some((m) => m.id === 'age-60')).toBe(false) // 2 years out (< pad) → yields to Today
    expect(a.some((m) => m.id === 'age-70')).toBe(true) // 12 out, clear of both named markers → kept
  })

  it('drops a bare decade tick within the pad of the work-stops moment (named marker wins)', () => {
    const a = deriveDateBandAnnotations(58, 60, 22, 40) // work-stops at age 80 (year 22)
    expect(a.some((m) => m.id === 'work-stops')).toBe(true)
    expect(a.some((m) => m.id === 'age-80')).toBe(false) // the age-80 tick collides → dropped
    expect(a.some((m) => m.id === 'age-70')).toBe(true) // age-70 (year 12) is clear → kept
  })

  it('omits the work-stops marker when the crowned offset lands within the horizon pad (shallow-horizon residual)', () => {
    // horizon 12, offset 10 ⇒ 10 ≥ 12 − 3 ⇒ the hero marker is dropped to avoid the Plan-horizon collision.
    const a = deriveDateBandAnnotations(58, 60, 10, 12)
    expect(a.some((m) => m.id === 'work-stops')).toBe(false)
  })

  it('returns markers in ascending household-clock order, Today first and Plan horizon last', () => {
    const a = deriveDateBandAnnotations(58, 60, 6, 40)
    expect(a[0]!.id).toBe('today')
    expect(a[a.length - 1]!.id).toBe('horizon')
    for (let i = 1; i < a.length; i++) {
      expect(a[i]!.yearsFromNow).toBeGreaterThan(a[i - 1]!.yearsFromNow)
    }
  })
})

describe('deriveBandAgesAt — the hover/scrub readout ages closure (single-sourced with the axis)', () => {
  it('reuses slots.bandClockAges + the SAME currentAge + yearsFromNow rule the annotations use', () => {
    const agesAt = deriveBandAgesAt(66, 64)
    // at a whole-year point it matches what a decade tick at the same x would render
    expect(agesAt(24)).toBe(slots.bandClockAges(90, 88)) // 66+24 / 64+24 — equals the age-90 tick
    expect(agesAt(0)).toBe(slots.bandClockAges(66, 64)) // today
  })

  it('rounds a FRACTIONAL lattice year to whole ages (the readout matches the whole-age axis convention)', () => {
    const agesAt = deriveBandAgesAt(66, 64)
    // a lattice point at 12.75 years → ages round to 79 / 77, never "78.75"
    expect(agesAt(12.75)).toBe(slots.bandClockAges(79, 77))
    expect(agesAt(12.4)).toBe(slots.bandClockAges(78, 76))
  })

  it('preserves the spouse age-gap at every year', () => {
    const agesAt = deriveBandAgesAt(58, 60) // B is older by 2
    expect(agesAt(10)).toBe(slots.bandClockAges(68, 70))
  })
})
