/**
 * healthcareStreams (C3 §3b) — the per-candidate cost-stream builder.
 *
 * The contract under test: WINDOW-GATE, never reshape. The entered ACA/OOP schedules are
 * AGE-ANCHORED per-sim-year values ("what coverage would cost at each age, were you retired
 * then"); the builder only zeroes them in the household working window `[0, windowStart)`
 * and passes them through VERBATIM from `windowStart` — values are never time-shifted (two
 * candidate windows price the same absolute sim-year at the same entered value). The
 * per-person Medicare onset is `max(65 − currentAge_i, retireOffset_i)` (employer coverage
 * past 65 delays Medicare), and the working-year IRMAA-MAGI override covers exactly the
 * working window, summing the still-working members' entered figures per year.
 *
 * Every expected value is hand-derived from the §0/§3b decision text (DND/012 — the builder
 * is pure windowing arithmetic, so the external derivation is the hand-computed window).
 */
import { describe, expect, it } from 'vitest'
import {
  buildHealthcareStreams,
  medicareOnsetForPerson,
  type HealthStreamPerson,
} from '@engine/healthcareStreams'

// The §3a different-currentAge couple (the same-age fixture is BANNED as vacuous — a
// household-age bug is invisible when both ages coincide). A 55yo and a 58yo, both still
// working with retire offset 4 (the sweep's Y = 4 candidate).
const A55: HealthStreamPerson = { currentAge: 55, retireOffset: 4 }
const B58: HealthStreamPerson = { currentAge: 58, retireOffset: 4 }

describe('window-gating (§3b: healthcare-on at the tested date is STREAM construction)', () => {
  it('zeroes the working window [0, windowStart) EXPLICITLY and passes the retired window through verbatim', () => {
    const enrolled = [10_000, 10_100, 10_200, 10_300, 10_400, 10_500]
    const slcsp = [9_000, 9_100, 9_200, 9_300, 9_400, 9_500]
    const oop = [500, 510, 520, 530, 540, 550]
    const built = buildHealthcareStreams([A55, B58], { enrolledPremium: enrolled, slcsp, oopMedical: oop })
    // Working years carry an EXPLICIT 0 (the §0 household-level R33 reading: employer family
    // coverage while anyone works — an entered "no premium", never an absent hole; absent is
    // what the validateParams coverage arm treats as the error).
    expect(built.enrolledPremium).toEqual([0, 0, 0, 0, 10_400, 10_500])
    expect(built.slcsp).toEqual([0, 0, 0, 0, 9_400, 9_500])
    // OOP is gated by the SAME window (the §6 guard's sibling: no working year may carry a
    // nonzero HSA-qualified spend — the salary pays working-year medical).
    expect(built.oopMedical).toEqual([0, 0, 0, 0, 540, 550])
  })

  it('is AGE-ANCHORED: two candidate windows price the same absolute sim-year at the same entered value', () => {
    const enrolled = [10_000, 10_100, 10_200, 10_300, 10_400, 10_500]
    const y2 = buildHealthcareStreams(
      [{ ...A55, retireOffset: 2 }, { ...B58, retireOffset: 2 }],
      { enrolledPremium: enrolled },
    )
    const y4 = buildHealthcareStreams([A55, B58], { enrolledPremium: enrolled })
    // Overlapping priced range: sim-years 4 and 5 are retired under BOTH candidates and must
    // read the SAME entered value — a planted shift-by-Y transform (values moved with the
    // window instead of gated by it) would give y4[4] === entered[0] and fail here.
    expect(y2.enrolledPremium?.[4]).toBe(10_400)
    expect(y4.enrolledPremium?.[4]).toBe(10_400)
    expect(y2.enrolledPremium?.[5]).toBe(10_500)
    expect(y4.enrolledPremium?.[5]).toBe(10_500)
    // And the non-overlapping years differ exactly by the gate (0 vs the entered value).
    expect(y2.enrolledPremium?.[2]).toBe(10_200)
    expect(y4.enrolledPremium?.[2]).toBe(0)
  })

  it('the window opens when the LAST worker stops (the §0 mixed-household household-level reading)', () => {
    // A retired 66yo spouse of a still-working 58yo: premiums stay 0 while ANYONE works
    // (employer family coverage), even though the retiree is pre-Medicare... here the retiree
    // is 66 (Medicare-side), so use a retired 65−x case below for the ACA reading; the gate
    // itself is person-agnostic — max over offsets.
    const retired66: HealthStreamPerson = { currentAge: 66, retireOffset: -2 }
    const working58: HealthStreamPerson = { currentAge: 58, retireOffset: 3 }
    const built = buildHealthcareStreams([retired66, working58], {
      enrolledPremium: [1_000, 1_000, 1_000, 1_000, 1_000],
    })
    expect(built.enrolledPremium).toEqual([0, 0, 0, 1_000, 1_000])
  })

  it('an ALL-RETIRED household window-gates nothing (windowStart 0 — the spine route consumes entered streams verbatim)', () => {
    const retiredA: HealthStreamPerson = { currentAge: 62, retireOffset: -1 }
    const retiredB: HealthStreamPerson = { currentAge: 60, retireOffset: 0 }
    const enrolled = [12_000, 12_100, 12_200]
    const built = buildHealthcareStreams([retiredA, retiredB], { enrolledPremium: enrolled })
    expect(built.enrolledPremium).toEqual(enrolled)
  })

  it('preserves HOLES in the retired window (absent ≠ 0 — the coverage arm distinguishes them)', () => {
    const enrolled: number[] = [10_000]
    enrolled[3] = 10_300 // sim-years 1 and 2 are HOLES (no marketplace figure entered)
    const built = buildHealthcareStreams([{ ...A55, retireOffset: 1 }, { ...B58, retireOffset: 1 }], {
      enrolledPremium: enrolled,
    })
    expect(built.enrolledPremium?.[0]).toBe(0) // gated working year — explicit 0
    expect(built.enrolledPremium?.[3]).toBe(10_300)
    // The holes survive as holes: index 1/2 are NOT own-properties (never coerced to 0).
    expect(Object.hasOwn(built.enrolledPremium ?? [], 1)).toBe(false)
    expect(Object.hasOwn(built.enrolledPremium ?? [], 2)).toBe(false)
  })

  it('an absent entered schedule stays absent (nothing to gate — burned/062 absent-⇒-default)', () => {
    const built = buildHealthcareStreams([A55], {})
    expect(built.enrolledPremium).toBeUndefined()
    expect(built.slcsp).toBeUndefined()
    expect(built.oopMedical).toBeUndefined()
    expect(built.irmaaMagiOverride).toBeUndefined()
  })
})

describe('per-person Medicare onset (§3b: onset_i = max(65 − currentAge_i, retireOffset_i))', () => {
  it('a still-working person enrolls at the LATER of their 65th sim-year and their work stop', () => {
    expect(medicareOnsetForPerson(55, 4)).toBe(10) // 65th sim-year (10) > work stop (4)
    expect(medicareOnsetForPerson(58, 4)).toBe(7) // 65th sim-year (7) > work stop (4)
  })

  it('working past 65 DELAYS Medicare to the work stop (employer coverage — the only off-switch for a 65+ worker)', () => {
    expect(medicareOnsetForPerson(66, 3)).toBe(3) // 65th sim-year was −1; enrollment at the work stop
  })

  it('an already-retired person collapses to their 65th sim-year (a retired 66yo IS enrolled from t = 0)', () => {
    // max(65−66, −2) = −1: already enrolled before the sim — every t ≥ 0 reads enrolled. The
    // household max(65, A) form would have zeroed this person during a spouse's working years.
    expect(medicareOnsetForPerson(66, -2)).toBeLessThanOrEqual(0)
    expect(medicareOnsetForPerson(60, -1)).toBe(5) // retired but pre-65: enrolls at their 65th sim-year
  })

  it('the built streams carry one onset per person, people-aligned', () => {
    const built = buildHealthcareStreams([A55, B58], {})
    expect(built.medicareOnsetSimYear).toEqual([10, 7])
  })
})

describe('the working-year IRMAA-MAGI override (§3b: ADDITIVE into history; built conservatively-high from entered income)', () => {
  it('covers EXACTLY the working window, summing the still-working members per year', () => {
    const built = buildHealthcareStreams([A55, B58], { workingYearIrmaaMagiByPerson: [120_000, 80_000] })
    expect(built.irmaaMagiOverride).toEqual([200_000, 200_000, 200_000, 200_000])
  })

  it('a mixed household sums ONLY the still-working member (per-person windows, not a household scalar)', () => {
    const retired: HealthStreamPerson = { currentAge: 66, retireOffset: -2 }
    const working: HealthStreamPerson = { currentAge: 58, retireOffset: 3 }
    const built = buildHealthcareStreams([retired, working], {
      workingYearIrmaaMagiByPerson: [70_000, 90_000],
    })
    // The retired member's figure never enters (their working window is empty) — only the
    // worker's 90k covers the 3 bridge years.
    expect(built.irmaaMagiOverride).toEqual([90_000, 90_000, 90_000])
  })

  it('staggered stops: each member drops out of the sum at THEIR OWN work stop', () => {
    const early: HealthStreamPerson = { currentAge: 55, retireOffset: 2 }
    const late: HealthStreamPerson = { currentAge: 58, retireOffset: 5 }
    const built = buildHealthcareStreams([early, late], {
      workingYearIrmaaMagiByPerson: [100_000, 60_000],
    })
    expect(built.irmaaMagiOverride).toEqual([160_000, 160_000, 60_000, 60_000, 60_000])
  })

  it('an all-retired household has NO override (no working years to cover)', () => {
    const built = buildHealthcareStreams(
      [{ currentAge: 66, retireOffset: -2 }],
      { workingYearIrmaaMagiByPerson: [70_000] },
    )
    expect(built.irmaaMagiOverride).toBeUndefined()
  })

  it('rejects a figures array misaligned to the people (never silently re-indexed)', () => {
    expect(() =>
      buildHealthcareStreams([A55, B58], { workingYearIrmaaMagiByPerson: [120_000] }),
    ).toThrow(/people/)
  })
})

describe('structural misuse fails loud (builder inputs are buildCandidateParams arithmetic, not user streams)', () => {
  it('rejects a non-finite currentAge / retireOffset (a NaN offset silently mis-windows every stream — insight 010)', () => {
    expect(() => buildHealthcareStreams([{ currentAge: Number.NaN, retireOffset: 4 }], {})).toThrow()
    expect(() => buildHealthcareStreams([{ currentAge: 55, retireOffset: Number.NaN }], {})).toThrow()
  })

  it('rejects an empty household', () => {
    expect(() => buildHealthcareStreams([], {})).toThrow()
  })
})
