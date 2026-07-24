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

  // ── the AGED-plan arm (U13 one-screen-one-time-base — the chart's turn, 2026-07-10) ──────
  // Caught live on the first `?vault=datestale` walk: the year-0 column read "Today 58 / 59"
  // beside a gate that had just said "saved about 2 years ago" — the chart spoke plan-time
  // while the hero + floor line (the U13 ultramode fold) spoke wall time.
  //
  // U17 §S0.2 (council wf_f4ced3c8-2f6) RE-AIMED the year-0 marker: it names the plan's BUILD,
  // not the save. The clock was always `startCalendarYear`-derived — build-time — so calling
  // that column 'Your save' was false for any re-saver (built last year, saved five minutes
  // ago) and contradicted the fresh "Saved to this device" badge on the same screen.

  it('AGED: year 0 renames to the BUILD marker (build-era ages + the build YEAR named) and the REAL Today lands at x = the plan clock with CURRENT ages', () => {
    const a = deriveSpineBandAnnotations(66, 64, 30, { startCalendarYear: 2024, yearsSincePlanBuilt: 2 })
    const built = a[0]!
    expect(built.id).toBe('built')
    expect(built.yearsFromNow).toBe(0)
    expect(built.label).toBe(copy.bandClockBuiltLabel)
    expect(built.ages).toBe(slots.bandClockAges(66, 64)) // the BUILD-era ages — that column IS the build
    expect(built.description).toBe(slots.bandClockBuiltDesc(2024, 66, 64))
    // …and it makes NO claim about the save (the U17 falsehood, dead in both channels).
    expect(built.label).not.toMatch(/save/i)
    expect(built.description).not.toMatch(/save/i)
    const today = a.find((m) => m.id === 'today')!
    expect(today.yearsFromNow).toBe(2)
    expect(today.label).toBe(copy.bandClockTodayLabel)
    expect(today.ages).toBe(slots.bandClockAges(68, 66)) // CURRENT ages — the reader is ON the picture
    expect(today.description).toBe(slots.bandClockTodayDesc(68, 66))
  })

  it('AGED: elapsed 0 (every fresh session) derives BYTE-IDENTICALLY to the un-anchored call — the no-drift pin', () => {
    expect(deriveSpineBandAnnotations(66, 64, 30, { startCalendarYear: 2024, yearsSincePlanBuilt: 0 })).toEqual(
      deriveSpineBandAnnotations(66, 64, 30),
    )
  })

  it('AGED: a decade tick within the pad of the wall-time Today is dropped (the named moment carries that x)', () => {
    // 68/66 aged 2: the age-70 tick sits at x = 2 — exactly the wall-Today x → dropped.
    const a = deriveSpineBandAnnotations(68, 66, 30, { startCalendarYear: 2024, yearsSincePlanBuilt: 2 })
    expect(a.some((m) => m.id === 'today' && m.yearsFromNow === 2)).toBe(true)
    expect(a.some((m) => m.id === 'age-70')).toBe(false)
    expect(a.some((m) => m.id === 'age-80')).toBe(true) // x = 12 — clear, kept
  })

  it('AGED: a decades-old plan whose today crowds the horizon keeps ONLY the honest "Plan built" rename (no off-chart Today)', () => {
    // plan clock 28 ≥ horizon 30 − pad 3 → the wall-Today marker is withheld; year 0 still renames.
    // Still INSIDE the drawable domain [0, 30) — the refusal below is the next year up.
    const a = deriveSpineBandAnnotations(66, 64, 30, { startCalendarYear: 2024, yearsSincePlanBuilt: 28 })
    expect(a[0]!.id).toBe('built')
    expect(a.some((m) => m.id === 'today')).toBe(false)
  })

  // U17 §S0.2 — the plan clock is CLAMPED to [0, horizonYears) and REFUSES ALOUD outside it.
  it('AGED: a plan clock at or past the drawn horizon REFUSES ALOUD — a skewed clock never redraws', () => {
    // At 30 (== horizon) today itself is off the right edge: there is no honest picture to
    // re-base, so the deriver throws at the producer seam rather than render a fan whose every
    // year is in the past under a wall-Today marker that does not exist on it.
    expect(() =>
      deriveSpineBandAnnotations(66, 64, 30, { startCalendarYear: 1996, yearsSincePlanBuilt: 30 }),
    ).toThrow(/skewed plan clock/)
    expect(() =>
      deriveDateBandAnnotations(58, 60, 6, 40, { startCalendarYear: 1900, yearsSincePlanBuilt: 126 }),
    ).toThrow(/skewed plan clock/)
    // A non-integer clock is indeterminate, not a value — it refuses too (never a fractional x).
    expect(() =>
      deriveSpineBandAnnotations(66, 64, 30, { startCalendarYear: 2024, yearsSincePlanBuilt: 2.5 }),
    ).toThrow(/skewed plan clock/)
  })

  it('AGED: a NEGATIVE clock (a device clock behind the build year) clamps to the fresh identity — no re-base, never a negative x', () => {
    // The producer already mints Math.max(0, …); this is the deriver's own belt: clamping to 0
    // IS the refusal to redraw (the un-anchored picture), never a marker left of year 0.
    expect(deriveSpineBandAnnotations(66, 64, 30, { startCalendarYear: 2030, yearsSincePlanBuilt: -4 })).toEqual(
      deriveSpineBandAnnotations(66, 64, 30),
    )
  })

  it('AGED: the low-end clamp is the LOAD-BEARING gate — a NON-INTEGER negative clock still lands on the fresh identity, never the refusal', () => {
    // THE MUTANT THIS KILLS (U17 §S0 verifier): weakening the guard to `years === 0` left the
    // integer arm above GREEN, because a negative integer falls through to the downstream
    // `yearsSinceBuilt > 0` gate, which nulls the aged arm anyway — the assertion never
    // witnessed the clamp it names (insight 029: an equality assertion on a structurally inert
    // surface discriminates nothing). A NON-INTEGER negative routes differently: guarded it
    // clamps to the fresh identity; unguarded it reaches the integer check and REFUSES ALOUD.
    // So this arm is the one that can tell the two implementations apart.
    expect(deriveSpineBandAnnotations(66, 64, 30, { startCalendarYear: 2030, yearsSincePlanBuilt: -2.5 })).toEqual(
      deriveSpineBandAnnotations(66, 64, 30),
    )
  })

  it('AGED: the markers stay monotonic with the wall-Today inserted', () => {
    const a = deriveSpineBandAnnotations(66, 64, 30, { startCalendarYear: 2024, yearsSincePlanBuilt: 2 })
    for (let i = 1; i < a.length; i++) {
      expect(a[i]!.yearsFromNow).toBeGreaterThan(a[i - 1]!.yearsFromNow)
    }
  })

  it('AGED: the sort is LOAD-BEARING — a deep elapsed inserts wall-Today ahead of an earlier kept decade tick (the ultramode red-path witness: delete the spine sort and this goes red)', () => {
    // 66/64 elapsed 8: wall-Today lands at x=8 BEFORE the age-70 tick at x=4 is appended
    // (|4−8| = 4 ≥ pad 3, so the tick is KEPT) — insertion order is [saved@0, today@8,
    // age-70@4, …], non-monotonic until the sort. The label stagger reads neighbors in x
    // order, so an unsorted return is a real rendering defect, not a cosmetic one.
    const a = deriveSpineBandAnnotations(66, 64, 30, { startCalendarYear: 2024, yearsSincePlanBuilt: 8 })
    expect(a.some((m) => m.id === 'age-70' && m.yearsFromNow === 4)).toBe(true)
    expect(a.some((m) => m.id === 'today' && m.yearsFromNow === 8)).toBe(true)
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

  // ── the AGED-plan arm (the `?vault=datestale` shape: floor crown 1, plan clock 2) ─────────
  it('AGED: "Plan built" at 0 + wall-Today at the plan clock, the work-stops marker untouched at its crowned offset', () => {
    const a = deriveDateBandAnnotations(58, 59, 1, 40, { startCalendarYear: 2024, yearsSincePlanBuilt: 2 })
    expect(a[0]!.id).toBe('built')
    expect(a[0]!.label).toBe(copy.bandClockBuiltLabel)
    expect(a[0]!.description).toBe(slots.bandClockBuiltDesc(2024, 58, 59))
    expect(a[0]!.ages).toBe(slots.bandClockAges(58, 59))
    const today = a.find((m) => m.id === 'today')!
    expect(today.yearsFromNow).toBe(2)
    expect(today.ages).toBe(slots.bandClockAges(60, 61)) // current ages
    // The band's own crowned offset stays in PLAN time (its x is calendar-stable) — the
    // named markers "Plan built"(0) / work-stops(1) / Today(2) tell the arrived-floor story.
    const ws = a.find((m) => m.id === 'work-stops')!
    expect(ws.yearsFromNow).toBe(1)
    const xs = a.map((m) => m.yearsFromNow)
    expect([...xs].sort((p, q) => p - q)).toEqual(xs) // ascending with the insertions
  })

  it('AGED: elapsed 0 derives byte-identically to the un-anchored call (the no-drift pin)', () => {
    expect(deriveDateBandAnnotations(58, 60, 6, 40, { startCalendarYear: 2024, yearsSincePlanBuilt: 0 })).toEqual(
      deriveDateBandAnnotations(58, 60, 6, 40),
    )
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
