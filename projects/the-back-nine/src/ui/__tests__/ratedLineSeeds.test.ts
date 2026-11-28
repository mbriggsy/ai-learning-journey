/**
 * Gap 4's U4 on real dev seeds, through the app's own `buildDateInput` and the date search's candidate builder: a budget
 * line that changes at its own rate costs, in a calendar year, the same whatever stop the search tests (R4), and its
 * cost there is its typed amount grown at its rate from the plan's first year and divided by the one price index (R3).
 * Engine tests never import `@ui`, so the seed-built arms live beside the seeds.
 *
 * The two witnesses are `dip`'s household with one field each (`datefixed`: the $20,000 Home line stays the same dollar
 * amount; `daterising`: the $16,000 Living line goes up 5 % a year). Each line's charge is read as the seed's year
 * spend less its unrated twin's (`dip`, the same draft without the field), at the same stop and sim year, plus the
 * line's typed amount (what the twin charges for it).
 *
 * ORACLES (DND 012): the price index by `Math.pow` from its constants, typed in each comment; never the producer's loop.
 */
import { describe, expect, it } from 'vitest'
import { DEV_SEEDS } from '../devSeeds'
import { buildDateInput } from '@intake/intakeMap'
import { buildCandidateParams, DATE_OFFSET_WINDOW_TOP } from '@engine/dateSearch'
import { cashTermsForYear, personOffsetsFor, validateParams } from '@engine/simulate'
import { earningsTestSchedule } from '@engine/earningsTest'
import type { ScenarioDraft } from '@store/memoryModel'

/** The year's spend at sim year `t` on the candidate that stops work in `stop` years, everyone alive. */
function spendAt(draft: ScenarioDraft, stop: number, t: number): number {
  const input = buildDateInput(draft)
  if (input === null) throw new Error('fixture: the seed builds no date input')
  const candidate = buildCandidateParams(input, stop, 1)
  const { offsets, higherClaimOffset } = personOffsetsFor(candidate.people)
  const horizon = candidate.maxHorizonYears
  const deaths = candidate.people.map(() => horizon)
  const schedule = earningsTestSchedule({ people: candidate.people, offsets, deathOffsets: deaths, higherClaimOffset, horizonYears: horizon })
  return cashTermsForYear(t, candidate, offsets, deaths, higherClaimOffset, schedule).spendingReal
}

// 2036 is sim year 10 on a 2026 plan: nine years at the near-term 3.2 % (2027–2035) and one at the ultimate 2.4 %.
const GROWTH_2026_TO_2036 = Math.pow(1.032, 9) * 1.024

describe('a rated line’s two frames, pinned where they differ (the review of gap 4’s line half)', () => {
  // A plan built away from the anchor year: intake must hand the compile the plan's OWN build year (KTD3), never the
  // anchor or the wall clock. 2028 to 2038: seven years at 3.2 % (2029–2035) and three at the ultimate 2.4 % (2036–2038).
  it('a fixed-dollar line on a plan built in 2028 charges its typed amount in year 0 and 1 ÷ (1.032^7 × 1.024^3) of it in 2038', () => {
    const input = buildDateInput({ ...DEV_SEEDS.datefixed, startCalendarYear: 2028 })
    if (input === null) throw new Error('fixture: the 2028 plan builds no date input')
    const factors = input.params.budget?.rated?.[0]?.factorByT
    expect(factors?.[0]).toBe(1)
    expect(factors?.[10]).toBeCloseTo(1 / (Math.pow(1.032, 7) * Math.pow(1.024, 3)), 12)
  })

  // On the date route k and t part: a line on only in k 2..4 at a stop of 5 is charged in sim years 7..9 and no others,
  // each at its calendar year's factor. On the all-retired route k ≡ t, so only this arm tells `amountByK[k]` from `[t]`.
  it('a fixed-dollar Home line on in years 2 to 4 after a stop of 5 costs 20,000 ÷ 1.032^t in sim years 7, 8 and 9 only', () => {
    const windowed = (d: ScenarioDraft): ScenarioDraft => ({
      ...d,
      annualSpendingReal: 58_000,
      budget: d.budget!.map((l) => (l.label === 'Home' ? { ...l, startYear: 2, endYear: 4 } : l)),
    })
    for (let t = 6; t <= 10; t++) {
      const charge = spendAt(windowed(DEV_SEEDS.datefixed), 5, t) - spendAt(windowed(DEV_SEEDS.dip), 5, t) + (t >= 7 && t <= 9 ? 20_000 : 0)
      expect(charge, `sim year ${t}`).toBeCloseTo(t >= 7 && t <= 9 ? 20_000 / Math.pow(1.032, t) : 0, 6)
    }
  })
})

describe('a rated line on the date route (gap 4’s U4, AE2 and R4)', () => {
  it('the premises: both witnesses are `dip` with one field, built in 2026, reconciled at the typed $78,000, and every candidate stop validates', () => {
    for (const key of ['datefixed', 'daterising'] as const) {
      const draft = DEV_SEEDS[key]
      expect(draft.startCalendarYear, key).toBe(2026)
      const input = buildDateInput(draft)
      if (input === null) throw new Error(`fixture: ${key} builds no date input`)
      expect(input.params.annualSpendingReal, key).toBe(78_000)
      expect(input.params.budget?.rated, key).toHaveLength(1)
      for (let y = 0; y <= DATE_OFFSET_WINDOW_TOP; y++) {
        expect(validateParams(buildCandidateParams(input, y, 1)), `${key} at a stop of ${y}`).toBeNull()
      }
    }
    expect(DEV_SEEDS.datefixed.budget?.find((l) => l.label === 'Home')?.growthRate).toBe(0)
    expect(DEV_SEEDS.daterising.budget?.find((l) => l.label === 'Living')?.growthRate).toBe(0.05)
  })

  it('AE2: the fixed-dollar Home line costs 20,000 ÷ (1.032^9 × 1.024) in 2036 on a stop of 0 and of 5 alike (about $14,710)', () => {
    const hand = 20_000 / GROWTH_2026_TO_2036
    for (const stop of [0, 5]) {
      const charge = spendAt(DEV_SEEDS.datefixed, stop, 10) - spendAt(DEV_SEEDS.dip, stop, 10) + 20_000
      expect(charge, `stop ${stop}`).toBeCloseTo(hand, 6)
    }
    expect(Math.round(hand)).toBe(14_710)
  })

  it('the Living line rising 5 % a year costs 16,000 × 1.05^10 ÷ the same growth in 2036, on a stop of 0 and of 5 alike', () => {
    const hand = (16_000 * Math.pow(1.05, 10)) / GROWTH_2026_TO_2036
    for (const stop of [0, 5]) {
      const charge = spendAt(DEV_SEEDS.daterising, stop, 10) - spendAt(DEV_SEEDS.dip, stop, 10) + 16_000
      expect(charge, `stop ${stop}`).toBeCloseTo(hand, 6)
    }
  })
})
