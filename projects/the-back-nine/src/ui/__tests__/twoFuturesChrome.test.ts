import { describe, expect, it } from 'vitest'
import { composeTwoFutures } from '../twoFuturesChrome'
import { copy, slots } from '../copy'
import { formatAxisDollar } from '../money'
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
})

const survivor = (xOfTen: number, outcomeState: OutcomeState = 'on-track'): SurvivorReading => ({
  xOfTen: { value: xOfTen, marginToEdge: 0.05 },
  outcomeState,
  incomeStepDownMonthlyReal: 1_200,
})

const fan = (points: ReadonlyArray<readonly [number, number]>): BandFan => ({
  byYear: points.map(([yearsFromNow, p50]) => ({
    yearsFromNow,
    p10: p50 * 0.5,
    p25: p50 * 0.75,
    p50,
    p75: p50 * 1.25,
    p90: p50 * 1.5,
    cohortFraction: 1,
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
    expect(s.labels.dollarMaxLabel).toBe(`~${formatAxisDollar(800_000)}`)
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
