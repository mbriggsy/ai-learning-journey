import { describe, expect, it } from 'vitest'
import { composeTwoFutures, deriveTwoFuturesXTicks } from '../twoFuturesChrome'
import { deriveDecadeAgeTicks } from '../bandAnnotations'
import { copy, slots } from '../copy'
import { formatAxisDollar } from '../money'
import { twoFuturesCeiling } from '@viz/TwoFutures'
import { COHORT_FADE } from '@viz/bandGeometry'
import type { BandFan, Headline, OutcomeState, SurvivorReading, TwoArmOutcome, TwoArmReading } from '@shared/model'

/**
 * The U10 delta grammar (src/ui/twoFuturesChrome.ts — composeTwoFutures).
 *
 * viz draws, THIS layer speaks: every word from copy.ts, every number through a slot. The
 * fixtures here are built BY HAND (never engine-derived — a golden through the engine's own
 * path proves typing, not the composition rule). Each arm pins a distinct clause of the R10/R12
 * delta contract:
 *  - SURVIVOR-basis odds are the emotional headline; the QUANTIZED xOfTen (survivorReading.xOfTen)
 *    drives the words, never the raw fraction.
 *  - Equal quantized readings render the calm EVEN line even when rawDelta ≠ 0 (the quantize
 *    deliberately absorbed the difference) — never a suppressed delta, never a fabricated one.
 *  - The state rider appears iff the arms' outcome states differ; the "~N years" secondary iff
 *    both arms have a real median (rounded |Δ| ≥ 1); the chart series iff BOTH arms carry a fan.
 *  - indeterminate / infeasible outcomes compose to null (the surfaces own those calm states).
 */

const headline = (xOfTen: number, outcomeState: OutcomeState = 'on-track'): Headline => ({
  xOfTen: { value: xOfTen, marginToEdge: 0.05 },
  outcomeState,
  stateMarginToEdge: 0.05,
})

const survivor = (xOfTen: number, outcomeState: OutcomeState = 'on-track'): SurvivorReading => ({
  xOfTen: { value: xOfTen, marginToEdge: 0.05 },
  outcomeState,
  incomeStepDownMonthlyReal: 1_200,
})

// [yearsFromNow, p50, cohortFraction?] — cohortFraction defaults to 1 (a fully-living cohort);
// pass it explicitly to exercise the dead-cohort truncation (points() drops cohortFraction < full).
const fan = (points: ReadonlyArray<readonly [number, number, number?]>): BandFan => ({
  byYear: points.map(([yearsFromNow, p50, cohortFraction]) => ({
    yearsFromNow,
    p10: p50 * 0.5,
    p25: p50 * 0.75,
    p50,
    p75: p50 * 1.25,
    p90: p50 * 1.5,
    cohortFraction: cohortFraction ?? 1,
  })),
})

/** Assemble one arm. Only the fields a clause reads are set per test. */
function reading(over: Partial<TwoArmReading> & { headline: Headline; survivalFraction: number }): TwoArmReading {
  return over
}

function twoArm(over: Partial<Omit<TwoArmOutcome & { kind: 'two-arm' }, 'kind'>> = {}): TwoArmOutcome {
  return {
    kind: 'two-arm',
    with: reading({ headline: headline(8), survivalFraction: 0.85 }),
    without: reading({ headline: headline(8), survivalFraction: 0.8 }),
    rawDelta: 0.05,
    deltaBasis: 'joint',
    ...over,
  }
}

describe('composeTwoFutures — the primary delta line', () => {
  it('SURVIVOR basis uses the survivor slot with the QUANTIZED survivor xOfTen values', () => {
    const outcome = twoArm({
      deltaBasis: 'survivor',
      with: reading({ headline: headline(8), survivorReading: survivor(9), survivalFraction: 0.9, survivorFraction: 0.87 }),
      without: reading({ headline: headline(8), survivorReading: survivor(7), survivalFraction: 0.8, survivorFraction: 0.68 }),
    })
    const view = composeTwoFutures(outcome, 'With', 'Without', slots.rothDeltaSurvivor)
    expect(view).not.toBeNull()
    // The survivor slot, fed the QUANTIZED survivor readings (9 and 7) — not the headline (8) values.
    expect(view!.deltaLine).toBe(slots.rothDeltaSurvivor(slots.xOfTen(9), slots.xOfTen(7)))
  })

  it('JOINT fallback (deltaBasis joint — either arm lacked a survivor surface) uses the joint slot on the HEADLINE odds', () => {
    const outcome = twoArm({
      deltaBasis: 'joint',
      with: reading({ headline: headline(6), survivalFraction: 0.6 }),
      without: reading({ headline: headline(4), survivalFraction: 0.4 }),
    })
    // Even though the caller passes the survivor slot, the joint basis routes to rothDeltaJoint.
    const view = composeTwoFutures(outcome, 'With', 'Without', slots.rothDeltaSurvivor)
    expect(view!.deltaLine).toBe(slots.rothDeltaJoint(slots.xOfTen(6), slots.xOfTen(4)))
    expect(view!.deltaLine).not.toBe(slots.rothDeltaSurvivor(slots.xOfTen(6), slots.xOfTen(4)))
  })

  it('EVEN case: equal quantized readings render rothDeltaEven even when rawDelta ≠ 0', () => {
    const outcome = twoArm({
      deltaBasis: 'survivor',
      rawDelta: 0.03, // a real raw difference the quantize deliberately absorbed
      with: reading({ headline: headline(8), survivorReading: survivor(8), survivalFraction: 0.83, survivorFraction: 0.8 }),
      without: reading({ headline: headline(8), survivorReading: survivor(8), survivalFraction: 0.8, survivorFraction: 0.77 }),
    })
    const view = composeTwoFutures(outcome, 'With', 'Without', slots.rothDeltaSurvivor)
    expect(view!.deltaLine).toBe(slots.rothDeltaEven(slots.xOfTen(8)))
    expect(view!.deltaLine).not.toBe(slots.rothDeltaSurvivor(slots.xOfTen(8), slots.xOfTen(8)))
  })
})

describe('composeTwoFutures — the verdict-state rider', () => {
  it('present iff the arms’ outcome states DIFFER (from without → with)', () => {
    const outcome = twoArm({
      deltaBasis: 'survivor',
      with: reading({ headline: headline(9, 'on-track'), survivorReading: survivor(9), survivalFraction: 0.9, survivorFraction: 0.88 }),
      without: reading({ headline: headline(6, 'borderline'), survivorReading: survivor(6), survivalFraction: 0.6, survivorFraction: 0.58 }),
    })
    const view = composeTwoFutures(outcome, 'With', 'Without', slots.rothDeltaSurvivor)
    expect(view!.stateLine).toBe(slots.rothStateShift(copy.outcomeBorderline, copy.outcomeOnTrack))
  })

  it('absent when the arms land in the SAME outcome state', () => {
    const outcome = twoArm({
      deltaBasis: 'survivor',
      with: reading({ headline: headline(9, 'on-track'), survivorReading: survivor(9), survivalFraction: 0.9, survivorFraction: 0.88 }),
      without: reading({ headline: headline(7, 'on-track'), survivorReading: survivor(7), survivalFraction: 0.7, survivorFraction: 0.68 }),
    })
    const view = composeTwoFutures(outcome, 'With', 'Without', slots.rothDeltaSurvivor)
    expect(view!.stateLine).toBeUndefined()
  })
})

describe('composeTwoFutures — the hedged "~N years" secondary', () => {
  it('absent when |medianYearsDelta| rounds below 1 (0.4 → 0)', () => {
    const view = composeTwoFutures(twoArm({ medianYearsDelta: 0.4 }), 'With', 'Without', slots.rothDeltaSurvivor)
    expect(view!.yearsLine).toBeUndefined()
  })

  it('positive Δ reads "N more years"', () => {
    const view = composeTwoFutures(twoArm({ medianYearsDelta: 3 }), 'With', 'Without', slots.rothDeltaSurvivor)
    expect(view!.yearsLine).toBe(slots.rothYearsSecondary(3, 'more'))
  })

  it('negative Δ reads "N fewer years" (magnitude, rounded)', () => {
    const view = composeTwoFutures(twoArm({ medianYearsDelta: -2 }), 'With', 'Without', slots.rothDeltaSurvivor)
    expect(view!.yearsLine).toBe(slots.rothYearsSecondary(2, 'fewer'))
  })

  it('absent when medianYearsDelta is undefined (a never-depleting median — never fabricated)', () => {
    const view = composeTwoFutures(twoArm({}), 'With', 'Without', slots.rothDeltaSurvivor)
    expect(view!.yearsLine).toBeUndefined()
  })
})

describe('composeTwoFutures — the chart series', () => {
  it('present iff BOTH arms carry a fan with more than one point; labels compose from the arms + copy', () => {
    const withFan = fan([
      [0, 800_000],
      [30, 520_000],
    ])
    const withoutFan = fan([
      [0, 800_000],
      [30, 500_000],
    ])
    const outcome = twoArm({
      deltaBasis: 'survivor',
      with: reading({ headline: headline(9), survivorReading: survivor(9), bandFan: withFan, survivalFraction: 0.9, survivorFraction: 0.88 }),
      without: reading({ headline: headline(7), survivorReading: survivor(7), bandFan: withoutFan, survivalFraction: 0.7, survivorFraction: 0.68 }),
    })
    const view = composeTwoFutures(outcome, 'With the conversion', 'Today’s plan', slots.rothDeltaSurvivor)
    expect(view!.series).toBeDefined()
    const s = view!.series!
    // points() maps byYear → { yearsFromNow, medianReal: p50 }
    expect(s.withArm).toEqual([
      { yearsFromNow: 0, medianReal: 800_000 },
      { yearsFromNow: 30, medianReal: 520_000 },
    ])
    expect(s.labels.withLabel).toBe('With the conversion')
    expect(s.labels.withoutLabel).toBe('Today’s plan')
    expect(s.labels.dollarMaxLabel).toBe(`~${formatAxisDollar(twoFuturesCeiling(800_000))}`)
    expect(s.labels.todayLabel).toBe(slots.ladderOffsetTick(0))
    expect(s.labels.horizonLabel).toBe('30')
    expect(s.labels.ariaSummary).toBe(`${copy.twoFuturesCaption} ${view!.deltaLine}`)
  })

  it('absent when only ONE arm carries a fan', () => {
    const outcome = twoArm({
      with: reading({ headline: headline(8), bandFan: fan([[0, 800_000], [30, 520_000]]), survivalFraction: 0.85 }),
      without: reading({ headline: headline(7), survivalFraction: 0.8 }),
    })
    const view = composeTwoFutures(outcome, 'With', 'Without', slots.rothDeltaSurvivor)
    expect(view!.series).toBeUndefined()
  })

  it('absent when a fan carries only a single point (a series needs more than one)', () => {
    const outcome = twoArm({
      with: reading({ headline: headline(8), bandFan: fan([[0, 800_000]]), survivalFraction: 0.85 }),
      without: reading({ headline: headline(7), bandFan: fan([[0, 800_000]]), survivalFraction: 0.8 }),
    })
    const view = composeTwoFutures(outcome, 'With', 'Without', slots.rothDeltaSurvivor)
    expect(view!.series).toBeUndefined()
  })

  // ── the AGED-vault year-0 endpoint (ultramode 2026-07-10 — the caller-lens sibling catch:
  //    the band's year-0 was fixed to "Your save" while this chart still said "Today" over the
  //    same save-moment ages, re-splitting one screen into two time bases) ──────────────────
  const agedOutcome = () =>
    twoArm({
      with: reading({ headline: headline(8), bandFan: fan([[0, 800_000], [30, 520_000]]), survivalFraction: 0.85 }),
      without: reading({ headline: headline(7), bandFan: fan([[0, 800_000], [30, 500_000]]), survivalFraction: 0.8 }),
    })

  it('AGED (elapsed > 0) with ages: the year-0 endpoint renames to "Your save" over the SAVED ages', () => {
    const view = composeTwoFutures(agedOutcome(), 'With', 'Without', slots.rothDeltaSurvivor, [58, 59], { elapsedPlanYears: 2 })
    expect(view!.series!.labels.todayLabel).toBe(`${copy.bandClockSavedLabel} ${slots.bandClockAges(58, 59)}`)
  })

  it('AGED ages-less: the fallback endpoint word swaps to "Your save" too (never a lying "today")', () => {
    const view = composeTwoFutures(agedOutcome(), 'With', 'Without', slots.rothDeltaSurvivor, undefined, { elapsedPlanYears: 2 })
    expect(view!.series!.labels.todayLabel).toBe(copy.bandClockSavedLabel)
  })

  it('elapsed 0 (every fresh session) composes BYTE-IDENTICALLY to the anchor-less call — the no-drift pin', () => {
    expect(
      composeTwoFutures(agedOutcome(), 'With', 'Without', slots.rothDeltaSurvivor, [58, 59], { elapsedPlanYears: 0 }),
    ).toEqual(composeTwoFutures(agedOutcome(), 'With', 'Without', slots.rothDeltaSurvivor, [58, 59]))
  })
})

describe('composeTwoFutures — the dead-cohort truncation (the series ends where the living cohort thins)', () => {
  it('truncates each arm to the leading cohortFraction ≥ COHORT_FADE.full prefix (the onset year is retained)', () => {
    // A point AT the onset (COHORT_FADE.full) is kept (>=); below it the median is noise wearing a
    // line's confidence — the chart simply ends.
    const cohorts = [1.0, COHORT_FADE.full, 0.3, 0.1]
    const withFan = fan([
      [0, 800_000, cohorts[0]],
      [10, 700_000, cohorts[1]],
      [20, 400_000, cohorts[2]],
      [30, 200_000, cohorts[3]],
    ])
    const withoutFan = fan([
      [0, 800_000, cohorts[0]],
      [10, 690_000, cohorts[1]],
      [20, 390_000, cohorts[2]],
      [30, 190_000, cohorts[3]],
    ])
    const outcome = twoArm({
      deltaBasis: 'survivor',
      with: reading({ headline: headline(9), survivorReading: survivor(9), bandFan: withFan, survivalFraction: 0.9, survivorFraction: 0.88 }),
      without: reading({ headline: headline(7), survivorReading: survivor(7), bandFan: withoutFan, survivalFraction: 0.7, survivorFraction: 0.68 }),
    })
    const view = composeTwoFutures(outcome, 'With', 'Without', slots.rothDeltaSurvivor)
    expect(view!.series).toBeDefined()
    expect(view!.series!.withArm.map((p) => p.yearsFromNow)).toEqual([0, 10])
    expect(view!.series!.withoutArm.map((p) => p.yearsFromNow)).toEqual([0, 10])
  })

  it('both arms truncate at the SAME year (CRN-shared deaths ⇒ one cohort schedule across both arms)', () => {
    const cohorts = [1.0, 0.9, 0.6, 0.2, 0.05] // ≥0.5 through index 2 (year 16); dropped at index 3
    const mk = (base: number): BandFan =>
      fan([
        [0, base, cohorts[0]],
        [8, base - 100_000, cohorts[1]],
        [16, base - 200_000, cohorts[2]],
        [24, base - 300_000, cohorts[3]],
        [32, base - 350_000, cohorts[4]],
      ])
    const outcome = twoArm({
      deltaBasis: 'survivor',
      with: reading({ headline: headline(9), survivorReading: survivor(9), bandFan: mk(900_000), survivalFraction: 0.9, survivorFraction: 0.88 }),
      without: reading({ headline: headline(7), survivorReading: survivor(7), bandFan: mk(880_000), survivalFraction: 0.7, survivorFraction: 0.68 }),
    })
    const view = composeTwoFutures(outcome, 'With', 'Without', slots.rothDeltaSurvivor)
    const withArm = view!.series!.withArm
    const withoutArm = view!.series!.withoutArm
    expect(withArm.at(-1)!.yearsFromNow).toBe(withoutArm.at(-1)!.yearsFromNow)
    expect(withArm.at(-1)!.yearsFromNow).toBe(16)
  })
})

describe('composeTwoFutures — the y-ceiling label annotates the DRAWN gridline, not the raw max', () => {
  it('formats twoFuturesCeiling(max), a value distinct from the raw data max', () => {
    // 1_234_567 raw → $1.2M; its humane-ladder ceiling 1_500_000 → $1.5M. The label sits on the
    // DRAWN ceiling line, so it must read the ceiling (understating its own gridline is the bug).
    const withFan = fan([
      [0, 1_234_567, 1],
      [30, 900_000, 1],
    ])
    const withoutFan = fan([
      [0, 1_000_000, 1],
      [30, 800_000, 1],
    ])
    const outcome = twoArm({
      with: reading({ headline: headline(8), bandFan: withFan, survivalFraction: 0.85 }),
      without: reading({ headline: headline(7), bandFan: withoutFan, survivalFraction: 0.8 }),
    })
    const view = composeTwoFutures(outcome, 'With', 'Without', slots.rothDeltaSurvivor)
    expect(view!.series!.labels.dollarMaxLabel).toBe(`~${formatAxisDollar(twoFuturesCeiling(1_234_567))}`)
    expect(view!.series!.labels.dollarMaxLabel).not.toBe(`~${formatAxisDollar(1_234_567)}`) // ceiling ≠ raw
  })
})

describe('composeTwoFutures — the non-two-arm outcomes compose to null', () => {
  it('indeterminate → null (the lever’s calm closed state owns it)', () => {
    const outcome: TwoArmOutcome = { kind: 'indeterminate', reason: 'no-pretax' }
    expect(composeTwoFutures(outcome, 'With', 'Without', slots.rothDeltaSurvivor)).toBeNull()
  })

  it('infeasible → null (the M6 sentinel; a calm error surface owns it)', () => {
    const outcome: TwoArmOutcome = { kind: 'infeasible', reason: 'overlay-failed' }
    expect(composeTwoFutures(outcome, 'With', 'Without', slots.rothDeltaSurvivor)).toBeNull()
  })
})

/* ── the fan-parity axis + scrub chrome (station-2 cold-read 2026-07-08) ─────────────────────── */

describe('composeTwoFutures — the y-axis dollar lattice (the fan’s OWN tick builder)', () => {
  const outcomeWithFans = (top: number): TwoArmOutcome =>
    twoArm({
      with: reading({ headline: headline(8), bandFan: fan([[0, top], [30, 500_000]]), survivalFraction: 0.85 }),
      without: reading({ headline: headline(7), bandFan: fan([[0, top - 10_000], [30, 480_000]]), survivalFraction: 0.8 }),
    })

  it('emits 5 ticks (quarters + the $0 ruin floor) over the humane ceiling, formatAxisDollar-worded', () => {
    // max 590_000 → ladder ceiling 600_000 → quarters 0 / 150k / 300k / 450k / 600k — every label
    // a clean figure BY CONSTRUCTION (the whole point of sharing the fan's ladder).
    const view = composeTwoFutures(outcomeWithFans(590_000), 'With', 'Without', slots.rothDeltaSurvivor)
    const ticks = view!.series!.yTicks
    expect(ticks.map((t) => t.dollars)).toEqual([0, 150_000, 300_000, 450_000, 600_000])
    expect(ticks.map((t) => t.label)).toEqual(['$0', '$150k', '$300k', '$450k', '$600k'])
  })

  it('the lattice top IS the drawn ceiling (the dollarMaxLabel’s own value — one scale, two words)', () => {
    const view = composeTwoFutures(outcomeWithFans(1_234_567), 'With', 'Without', slots.rothDeltaSurvivor)
    const top = view!.series!.yTicks.at(-1)!
    expect(top.dollars).toBe(twoFuturesCeiling(1_234_567))
    expect(view!.series!.labels.dollarMaxLabel).toBe(`~${top.label}`)
  })

  // O8 (2026-07-17) — the unit-locked lattice, wired: a $3M-class ceiling's sub-$1M quarter
  // reads "$0.75M", never "$750k" among "$M" gridlines (one dialect per axis, rule 36). This
  // is the CALL-SITE pin — reverting twoFuturesChrome's tick builder to the per-value
  // formatter goes red here (the factory's own arms live in money.test).
  it('a mixed-magnitude ceiling emits ONE dialect (the filed "$750k among $M" witness, killed)', () => {
    const view = composeTwoFutures(outcomeWithFans(2_900_000), 'With', 'Without', slots.rothDeltaSurvivor)
    const labels = view!.series!.yTicks.map((t) => t.label)
    expect(labels).toEqual(['$0', '$0.75M', '$1.5M', '$2.25M', '$3M'])
  })
})

describe('deriveTwoFuturesXTicks — intermediate year ticks between the endpoints', () => {
  it('decade steps on a long horizon, stopping clear of the horizon label’s pad', () => {
    // 30y: 10, 20 (30 − 3 pad excludes 30 itself — the horizon endpoint already labels it).
    expect(deriveTwoFuturesXTicks(30).map((t) => t.years)).toEqual([10, 20])
    // 24y: 10, 20 (21 is the last eligible year; 20 ≤ 21).
    expect(deriveTwoFuturesXTicks(24).map((t) => t.years)).toEqual([10, 20])
  })

  it('five-year steps on a short horizon; none at all when even one tick could not fit', () => {
    expect(deriveTwoFuturesXTicks(12).map((t) => t.years)).toEqual([5])
    expect(deriveTwoFuturesXTicks(16).map((t) => t.years)).toEqual([5, 10])
    expect(deriveTwoFuturesXTicks(7)).toEqual([])
  })
})

describe('composeTwoFutures — the per-year readout rows (the scrub’s honest column)', () => {
  // CONTIGUOUS integer-year fans — the engine’s real byYear grid shape (buildBandFan’s contract);
  // the sparse grids elsewhere in this file exercise series drawing, but rows are per-year.
  const contiguous = (medians: readonly number[], cohorts?: readonly number[]): BandFan =>
    fan(medians.map((m, y) => [y, m, cohorts?.[y] ?? 1] as const))

  it('one row per integer year, both arms’ dollars pre-formatted with the AXIS formatter', () => {
    const outcome = twoArm({
      with: reading({ headline: headline(8), bandFan: contiguous([800_000, 741_000, 700_000]), survivalFraction: 0.85 }),
      without: reading({ headline: headline(7), bandFan: contiguous([790_000, 730_000, 680_000]), survivalFraction: 0.8 }),
    })
    const view = composeTwoFutures(outcome, 'With', 'Without', slots.rothDeltaSurvivor)
    const rows = view!.series!.rows
    expect(rows.map((r) => r.yearsFromNow)).toEqual([0, 1, 2])
    expect(rows[1]).toMatchObject({
      withValue: formatAxisDollar(741_000),
      withoutValue: formatAxisDollar(730_000),
    })
  })

  it('a truncated arm’s value is ABSENT past its last drawn year — never a median past the cohort', () => {
    // The WITH arm’s cohort thins below COHORT_FADE.full at year 2; the WITHOUT arm survives it.
    const outcome = twoArm({
      with: reading({
        headline: headline(8),
        bandFan: contiguous([800_000, 741_000, 700_000], [1, COHORT_FADE.full, 0.2]),
        survivalFraction: 0.85,
      }),
      without: reading({ headline: headline(7), bandFan: contiguous([790_000, 730_000, 680_000]), survivalFraction: 0.8 }),
    })
    const view = composeTwoFutures(outcome, 'With', 'Without', slots.rothDeltaSurvivor)
    const rows = view!.series!.rows
    expect(rows[1]!.withValue).toBe(formatAxisDollar(741_000)) // the onset year is retained (≥)
    expect(rows[2]!.withValue).toBeUndefined() // ended — quiet, exactly where the line stops
    expect(rows[2]!.withoutValue).toBe(formatAxisDollar(680_000)) // the surviving arm still speaks
  })

  it('the ages line rides the household pair (the fan’s own slot + rule); absent ages ⇒ empty', () => {
    const outcome = twoArm({
      with: reading({ headline: headline(8), bandFan: contiguous([800_000, 741_000]), survivalFraction: 0.85 }),
      without: reading({ headline: headline(7), bandFan: contiguous([790_000, 730_000]), survivalFraction: 0.8 }),
    })
    const withAges = composeTwoFutures(outcome, 'With', 'Without', slots.rothDeltaSurvivor, [66, 64])
    expect(withAges!.series!.rows[1]!.ages).toBe(slots.bandClockAges(67, 65))
    expect(withAges!.series!.labels.readoutAgesLabel).toBe(copy.bandReadoutAgesLabel)
    const noAges = composeTwoFutures(outcome, 'With', 'Without', slots.rothDeltaSurvivor)
    expect(noAges!.series!.rows[1]!.ages).toBe('')
  })
})

describe('composeTwoFutures — the x-axis speaks the fan’s ages dialect (Briggsy’s 2026-07-10 cold-read: consistency)', () => {
  // A 30-year horizon so the decade rule yields real intermediate ticks.
  const longFan = (start: number) =>
    fan([
      [0, start],
      [10, start - 50_000],
      [20, start - 100_000],
      [30, start - 150_000],
    ])
  const outcome = () =>
    twoArm({
      with: reading({ headline: headline(8), bandFan: longFan(800_000), survivalFraction: 0.85 }),
      without: reading({ headline: headline(7), bandFan: longFan(790_000), survivalFraction: 0.8 }),
    })

  it('known ages: endpoints + intermediate ticks all carry ages — BY the fan’s own canonical rule', () => {
    const view = composeTwoFutures(outcome(), 'With', 'Without', slots.rothDeltaSurvivor, [66, 65])
    const s = view!.series!
    // The today endpoint: the fan's word + the ages pair (one row of the fan's endpoint grammar).
    expect(s.labels.todayLabel).toBe(`${copy.bandClockTodayLabel} ${slots.bandClockAges(66, 65)}`)
    // The right endpoint: the AGES at the chart's own last drawn year — deliberately NOT the
    // fan's "Plan horizon" word (this chart ends at the dead-cohort truncation, which can be an
    // earlier year than the fan's horizon; one word must never name two different years).
    expect(s.labels.horizonLabel).toBe(slots.bandClockAges(96, 95))
    expect(s.labels.horizonLabel).not.toContain(copy.bandClockHorizonLabel)
    // The intermediate ticks ARE the fan's decade-age rule — consistency by construction, not
    // by a parallel loop that could drift (deriveDecadeAgeTicks is the one canonical home).
    expect(s.xTicks).toEqual(
      deriveDecadeAgeTicks(66, 65, 30).map((t) => ({ years: t.yearsFromNow, label: t.ages })),
    )
    // And it is non-vacuous: a 66/65 couple over 30 years really gets decade ticks.
    expect(s.xTicks.map((t) => t.label)).toEqual([
      slots.bandClockAges(70, 69),
      slots.bandClockAges(80, 79),
      slots.bandClockAges(90, 89),
    ])
  })

  it('ages unknown: the year-count fallback holds (no fabricated ages, the legacy labels)', () => {
    const view = composeTwoFutures(outcome(), 'With', 'Without', slots.rothDeltaSurvivor)
    const s = view!.series!
    expect(s.labels.todayLabel).toBe(slots.ladderOffsetTick(0))
    expect(s.labels.horizonLabel).toBe('30')
    expect(s.xTicks).toEqual(deriveTwoFuturesXTicks(30))
  })
})
