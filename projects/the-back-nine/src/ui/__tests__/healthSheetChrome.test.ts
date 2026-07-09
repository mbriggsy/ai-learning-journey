/**
 * healthSheetChrome (P3·U11) — the Healthcare sheet's PURE honesty seam (insight 048: every
 * decision the sheet renders is drivable here, planted-fail style).
 *
 * Hand-derived expectations (DND 012): household-of-2 FPL 21,150 ⇒ cliff 84,600; MFJ standard
 * deduction 32,200 (no 65+ member at the anchor) ⇒ taxable(60,000) = 27,800 ⇒ the 12% band;
 * the flat 9.96% top applicable band ⇒ drag 0.0996 on a $12,000 benchmark with PTC unexhausted
 * ⇒ shadow ≈ 22¢; headroom 84,600 − 66,600 = 18,000.
 */
import { describe, it, expect } from 'vitest'
import {
  acaAnchor,
  composeHealthSheet,
  composeRegimeFutures,
  medicareAnchor,
  medicareUnpriced,
  quotableYears,
} from '../healthSheetChrome'
import { copy, slots } from '../copy'
import type { HealthReadout, HealthReadoutYear, TwoArmOutcome } from '@shared/model'

const year = (over: Partial<HealthReadoutYear>): HealthReadoutYear => ({
  yearsFromNow: 1,
  acaNetPremiumP50: 0,
  medicareBaseP50: 0,
  irmaaSurchargeP50: 0,
  acaMagiP50: 0,
  irmaaMagiP50: 0,
  overCliffFraction: 0,
  acaPricedFraction: 0,
  cohortFraction: 1,
  ...over,
})

const draft = (over: { enhanced?: true; ages?: readonly number[]; slcsp?: number } = {}) => ({
  filing: 'mfj' as const,
  ...(over.enhanced ? { enhancedSubsidies: true as const } : {}),
  people: (over.ages ?? [60, 60]).map((a) => ({ currentAge: a })),
  health: { slcspMonthlyToday: over.slcsp ?? 1_000 },
})

describe('the anchors + the thin-cohort withdrawal', () => {
  it('quotableYears drops thin-cohort years (the band’s own COHORT_FADE.full discipline)', () => {
    const readout: HealthReadout = {
      byYear: [year({ yearsFromNow: 1 }), year({ yearsFromNow: 2, cohortFraction: 0.4 })],
    }
    expect(quotableYears(readout).map((y) => y.yearsFromNow)).toEqual([1])
  })

  it('acaAnchor = the first quotable MOSTLY-priced year; medicareAnchor = the first with a real base bill', () => {
    const readout: HealthReadout = {
      byYear: [
        year({ yearsFromNow: 1, acaPricedFraction: 0.2 }), // a minority-priced year is no anchor
        year({ yearsFromNow: 2, acaPricedFraction: 0.9, acaNetPremiumP50: 9_950 }),
        year({ yearsFromNow: 3, medicareBaseP50: 4_870 }),
      ],
    }
    expect(acaAnchor(readout)?.yearsFromNow).toBe(2)
    expect(medicareAnchor(readout)?.yearsFromNow).toBe(3)
  })
})

/** The fact under test, by id — the stepped-readout shape (cold-read 2026-07-03). */
const factOf = (view: ReturnType<typeof composeHealthSheet>, id: string) =>
  view.facts.find((f) => f.id === id)

describe('composeHealthSheet', () => {
  it('with NO series (the date route / pre-resolve) it composes the dated status line alone', () => {
    const view = composeHealthSheet(undefined, draft())
    expect(view.statusLine).toBe(slots.acaCostStatus('June 4, 2026'))
    expect(view.facts).toEqual([])
  })

  it('an APPLIED enhanced regime swaps the status note to the what-if variant and drops every cliff line (no cliff exists)', () => {
    const readout: HealthReadout = {
      byYear: [
        year({
          yearsFromNow: 1,
          acaPricedFraction: 1,
          acaNetPremiumP50: 8_000,
          acaMagiP50: 66_600,
          irmaaMagiP50: 60_000,
          overCliffFraction: 0.3,
        }),
      ],
    }
    const view = composeHealthSheet(readout, draft({ enhanced: true }))
    expect(view.statusLine).toBe(slots.acaCostStatusEnhanced('June 4, 2026'))
    expect(factOf(view, 'discount')).toBeUndefined() // no cliff exists → no discount fact at all
    expect(factOf(view, 'coverage')).toBeDefined() // the cost fact still quotes — only the cliff vanished
  })

  it('the reverted regime composes every ACA line with the hand-derived figures (cost / cliff odds / 22¢ shadow / 18,000 headroom)', () => {
    const readout: HealthReadout = {
      byYear: [
        year({
          yearsFromNow: 1,
          acaPricedFraction: 1,
          acaNetPremiumP50: 9_950,
          acaMagiP50: 66_600,
          irmaaMagiP50: 60_000,
          overCliffFraction: 0.31,
        }),
      ],
    }
    const view = composeHealthSheet(readout, draft())
    // The coverage fact: figure anchor + the source-named sentence (9,950 humane-rounds).
    expect(factOf(view, 'coverage')).toEqual({
      id: 'coverage',
      eyebrow: copy.healthFactCoverage,
      figure: slots.healthFigPerYear('10,000'),
      lines: [slots.acaCostNet('10,000')],
    })
    // The discount fact folds context THEN odds (the odds sentence leans on the named line).
    expect(factOf(view, 'discount')).toEqual({
      id: 'discount',
      eyebrow: copy.healthFactDiscount,
      figure: slots.healthFigRoom('18,000'), // 84,600 − 66,600
      lines: [
        slots.shadowRateHeadroom('66,600', '84,600', '18,000'),
        slots.acaCostCliff(slots.xOfTen(3)), // 0.31 → 3 of 10
      ],
    })
    // taxable = 60,000 − 32,200 = 27,800 → 12% band; drag = 9.96% (flat top band, PTC live) → 22¢.
    expect(factOf(view, 'conversion')).toEqual({
      id: 'conversion',
      eyebrow: copy.healthFactConversion,
      figure: slots.healthFigCents(22),
      lines: [slots.shadowRateLine(22)],
    })
  })

  it('an OVER-cliff anchor quotes the cutoff dollar INLINE (no headroom sentence precedes it in that branch — audit 2026-07-03)', () => {
    const readout: HealthReadout = {
      byYear: [year({ acaPricedFraction: 1, acaNetPremiumP50: 20_000, acaMagiP50: 90_000, irmaaMagiP50: 85_000, overCliffFraction: 0.62 })],
    }
    const discount = factOf(composeHealthSheet(readout, draft()), 'discount')
    expect(discount?.figure).toBeUndefined() // no room to quote past the cutoff
    expect(discount?.lines).toEqual([slots.acaCostCliffOverCliff(slots.xOfTen(6), '84,600')])
  })

  it('a sub-1-of-10 worst cliff fraction folds NO odds sentence into the discount fact (nothing honest to quote at the frame’s grain)', () => {
    const readout: HealthReadout = {
      byYear: [year({ acaPricedFraction: 1, acaNetPremiumP50: 9_000, acaMagiP50: 50_000, irmaaMagiP50: 45_000, overCliffFraction: 0.04 })],
    }
    const discount = factOf(composeHealthSheet(readout, draft()), 'discount')
    expect(discount?.lines).toHaveLength(1) // the context sentence alone — no odds line
    expect(discount?.lines[0]).toBe(slots.shadowRateHeadroom('50,000', '84,600', '34,600'))
  })

  it('the Medicare anchor composes the story + the now-anchor + the next-step fact (tier-1 MFJ at a 150,000 anchor: step ~1,148 [95.7×12], headroom 68,000)', () => {
    const readout: HealthReadout = {
      byYear: [year({ yearsFromNow: 1, medicareBaseP50: 4_870, irmaaMagiP50: 150_000 })],
    }
    const view = composeHealthSheet(readout, draft({ ages: [66, 66] }))
    // The Medicare fact: story + the before-any-step anchor (base 4,870 + surcharge 0 → '4,900').
    expect(factOf(view, 'medicare')).toEqual({
      id: 'medicare',
      eyebrow: copy.healthFactMedicare,
      figure: slots.healthFigPerYear('4,900'),
      lines: [copy.irmaaStepStory, slots.irmaaStepNowBase('4,900')],
    })
    // Threshold NAMED (218,000); the anchor income QUOTED (150,000); 218,000 − 150,000 = 68,000;
    // both 66 → the two-of-you arm at the ×2 household figure: 95.7 × 12 × 2 = 2,296.8 → '2,300'.
    expect(factOf(view, 'step')).toEqual({
      id: 'step',
      eyebrow: copy.healthFactStep,
      figure: slots.healthFigStepAdd('2,300'),
      lines: [slots.irmaaStepNext('218,000', '150,000', '68,000', '2,300', true)],
    })
  })

  it('ONE spouse enrolled at the anchor quotes the per-person figure on the each-of-you arm (never a flat ×2)', () => {
    const readout: HealthReadout = {
      byYear: [year({ yearsFromNow: 1, medicareBaseP50: 2_435, irmaaMagiP50: 150_000 })],
    }
    const view = composeHealthSheet(readout, draft({ ages: [66, 62] }))
    // 66 is enrolled, 62 is not: per-person 95.7 × 12 = 1,148.4 → '1,100', bothEnrolled=false.
    expect(factOf(view, 'step')?.lines).toEqual([
      slots.irmaaStepNext('218,000', '150,000', '68,000', '1,100', false),
    ])
  })

  it('a middle path already paying surcharge composes the SURCHARGED now-arm (total = base + surcharge, the split quoted)', () => {
    const readout: HealthReadout = {
      byYear: [
        year({ yearsFromNow: 1, medicareBaseP50: 4_870, irmaaSurchargeP50: 2_400, irmaaMagiP50: 230_000 }),
      ],
    }
    const view = composeHealthSheet(readout, draft({ ages: [66, 66] }))
    // 4,870 + 2,400 = 7,270 → '7,300'; the surcharge itself quoted at '2,400'.
    expect(factOf(view, 'medicare')?.lines[1]).toBe(slots.irmaaStepNowSurcharged('7,300', '2,400'))
  })
})

describe('medicareUnpriced — the post-65 unpriced-domain predicate (the veto condition)', () => {
  it('true only when EVERY member is a known 65+ (the exact complement of the intake’s pre-65 gate)', () => {
    expect(medicareUnpriced([{ currentAge: 67 }, { currentAge: 66 }])).toBe(true)
    // exactly 65 is STILL the unpriced domain (the intake gate is `< 65`) — kills the `<=` mutant.
    expect(medicareUnpriced([{ currentAge: 67 }, { currentAge: 65 }])).toBe(true)
    expect(medicareUnpriced([{ currentAge: 67 }, { currentAge: 64 }])).toBe(false) // a pre-65 member prices healthcare
    expect(medicareUnpriced([{ currentAge: 67 }, {}])).toBe(false) // an unknown age is not a claim
    expect(medicareUnpriced([])).toBe(false)
  })
})

describe('composeRegimeFutures — the cost-headline compose', () => {
  const arm = (surv: number, cost?: number) => ({
    headline: { xOfTen: { value: surv, marginToEdge: 0.05 }, outcomeState: 'on-track' as const, stateMarginToEdge: 0.05 },
    survivalFraction: surv / 10,
    ...(cost !== undefined ? { lifetimeHealthCostMedianReal: cost } : {}),
  })
  const outcome = (withCost?: number, withoutCost?: number): TwoArmOutcome => ({
    kind: 'two-arm',
    with: arm(8, withCost),
    without: arm(7, withoutCost),
    rawDelta: 0.1,
    deltaBasis: 'joint',
  })

  it('HEADLINES the lifetime health-cost delta and demotes the odds line to the second row (council 2026-07-03)', () => {
    const view = composeRegimeFutures(outcome(96_040, 128_010), true)
    expect(view?.deltaLine).toBe(slots.subsidyRegimeCostDelta('96,000', '128,000'))
    expect(view?.stateLine).toBe(slots.rothDeltaJoint(slots.xOfTen(8), slots.xOfTen(7)))
  })

  it('falls back to the shared compose when either arm lacks the cost median (never a fabricated dollar)', () => {
    const view = composeRegimeFutures(outcome(96_000, undefined), false)
    expect(view?.deltaLine).toBe(slots.rothDeltaJoint(slots.xOfTen(8), slots.xOfTen(7)))
  })
})
