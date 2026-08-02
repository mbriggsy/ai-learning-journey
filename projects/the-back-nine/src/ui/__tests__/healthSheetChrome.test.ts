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
  composeMedicareExtrasTypicalNote,
  composeRegimeFutures,
  medicareAnchor,
  showMedicarePricedNote,
  quotableYears,
} from '../healthSheetChrome'
import { copy, slots } from '../copy'
import {
  epochDayFromIsoDate,
  evaluateAcaFreshnessClause,
  acaCheckOverdue,
} from '@engine/validation/oracleToken'
import { acaEnhancedSubsidyStatus } from '@engine/constants/health'
import { solverAcaFreshnessWindowDays } from '@engine/constants/solver'
import type { HealthReadout, HealthReadoutYear, TwoArmOutcome } from '@shared/model'

/** The injected clock, expressed RELATIVE to the live record rather than as a literal date —
 *  a re-verify moves `verifiedOn` roughly monthly and must never churn this file (nor tempt
 *  anyone into bumping a date they did not think about). These are test INPUTS, never the
 *  assertion, so deriving them from the producer is not the insight-081 tautology. */
const CHECKED_ON = epochDayFromIsoDate(acaEnhancedSubsidyStatus.value.verifiedOn)
const WINDOW = solverAcaFreshnessWindowDays.value
const FRESH = CHECKED_ON + 1
const AT_WINDOW = CHECKED_ON + WINDOW
const OVERDUE = CHECKED_ON + WINDOW + 1

/**
 * The formatted verified date the status slots interpolate.
 *
 * ⚠️ DELIBERATELY A SECOND IMPLEMENTATION — never an import of `healthSheetChrome`'s own
 * `verifiedOnFormatted`. The header above draws exactly this line: deriving an INPUT from the
 * producer is fine, deriving the EXPECTATION from it is the insight-081 tautology. Written
 * independently, this still reds if the sheet changes `dateStyle` or reads a different date,
 * while surviving a re-verify that only moves the day.
 *
 * ⏰ WHY IT EXISTS (2026-08-02): this was the literal `'July 26, 2026'`, typed SEVEN times here
 * and once in `src/intake/__tests__/healthcareSheet.test.tsx`. So a CORRECT ACA re-verify — which
 * `aca-last-verified.json`'s own `howToClear` requires roughly monthly, and which moves
 * `verifiedOn` by construction — turned six arms RED, and the cheapest way back to green was to
 * not move the date at all. That is the one thing `howToClear` explicitly forbids ("Do NOT just
 * bump the date"). A gate that punishes the honest action is worse than no gate: it does not fail
 * safe, it lobbies. Both files already stated this law in their own headers and broke it nine
 * lines later.
 */
const VERIFIED_ON_LONG = ((): string => {
  const [y, m, d] = acaEnhancedSubsidyStatus.value.verifiedOn.split('-').map(Number)
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'long' }).format(new Date(y!, m! - 1, d!))
})()

const year = (over: Partial<HealthReadoutYear>): HealthReadoutYear => ({
  yearsFromNow: 1,
  acaNetPremiumP50: 0,
  medicareBaseP50: 0,
  irmaaSurchargeP50: 0,
  medicareExtrasP50: 0,
  acaMagiP50: 0,
  irmaaMagiP50: 0,
  overCliffFraction: 0,
  acaPricedFraction: 0,
  cohortFraction: 1,
  ...over,
})

const draft = (over: { enhanced?: true; ages?: readonly number[]; slcsp?: number; startYear?: number } = {}) => ({
  filing: 'mfj' as const,
  // The sunset unit (C4): the anchor's calendar year = startCalendarYear + yearsIn windows
  // the senior bonus out of the shadow-rate stack past 2028. 2026 = the in-window anchor
  // every pre-unit expectation was derived at; the readout crossing arm overrides it.
  startCalendarYear: over.startYear ?? 2026,
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
    const view = composeHealthSheet(undefined, draft(), FRESH)
    // NON-VACUITY RECEIPT for the derivation above, and the reason it is not a weaker predicate
    // than the literal it replaced: the expectation must still be a HUMANE LONG date. A `dateStyle`
    // slip renders "Aug 2, 2026" (`medium`) or "8/2/26" (`short`), and a lazy "fix" to this file
    // would interpolate the raw ISO "2026-08-02" — the full month name kills all three, so the
    // format stays pinned exactly as tightly as the hardcoded string pinned it.
    expect(
      VERIFIED_ON_LONG,
      'the dated status line speaks a full-month-name long date; medium/short/ISO must all fail here',
    ).toMatch(
      /^(January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2}, \d{4}$/,
    )
    expect(view.statusLine).toBe(slots.acaCostStatus(VERIFIED_ON_LONG))
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
    const view = composeHealthSheet(readout, draft({ enhanced: true }), FRESH)
    expect(view.statusLine).toBe(slots.acaCostStatusEnhanced(VERIFIED_ON_LONG))
    expect(factOf(view, 'discount')).toBeUndefined() // no cliff exists → no discount fact at all
    expect(factOf(view, 'coverage')).toBeDefined() // the cost fact still quotes — only the cliff vanished
  })

  // ── the OVERDUE status line ────────────────────────────────────────────────────────────────
  // Past the re-verify window the recommendation beside this sheet already refuses to rank
  // ("past their re-check date"). This line used to go on speaking as though the check were
  // current — the sheet that EXPLAINS the model was the one surface not repeating the warning.
  it('PAST the re-verify window both status notes swap to their overdue variants (the sheet stops speaking as though the check were current)', () => {
    expect(composeHealthSheet(undefined, draft(), OVERDUE).statusLine).toBe(
      slots.acaCostStatusOverdue(VERIFIED_ON_LONG),
    )
    expect(composeHealthSheet(undefined, draft({ enhanced: true }), OVERDUE).statusLine).toBe(
      slots.acaCostStatusEnhancedOverdue(VERIFIED_ON_LONG),
    )
    // The figures are NOT disowned — the line still names the regime it priced under.
    expect(composeHealthSheet(undefined, draft(), OVERDUE).statusLine).toContain('stops at the cliff')
  })

  it('the boundary is STRICT: exactly at the window still reads fresh, one day later reads overdue', () => {
    // Insight 029's class — the input has to ROUTE DIFFERENTLY, so the arm must straddle the
    // exact edge. `>= WINDOW` would pass every test that only probed CHECKED_ON+WINDOW+1.
    expect(composeHealthSheet(undefined, draft(), AT_WINDOW).statusLine).toBe(
      slots.acaCostStatus(VERIFIED_ON_LONG),
    )
    expect(composeHealthSheet(undefined, draft(), AT_WINDOW + 1).statusLine).toBe(
      slots.acaCostStatusOverdue(VERIFIED_ON_LONG),
    )
  })

  it('THE BIND: the sheet and the token never disagree about the same fact — one calendar, two consumers', () => {
    // The defect this closes was not a wrong string; it was TWO surfaces reading one record with
    // only one of them owning a calendar. Pin the biconditional across the edge, so a future
    // change to either side's window fails HERE rather than shipping a calm sheet beside a
    // refusing recommendation.
    const acaRun = {
      overlay: { enrolledPremium: 12_000 },
    } as unknown as Parameters<typeof evaluateAcaFreshnessClause>[0]

    for (const today of [FRESH, AT_WINDOW - 1, AT_WINDOW, AT_WINDOW + 1, OVERDUE + 400]) {
      const tokenRefuses = evaluateAcaFreshnessClause(acaRun, today) !== null
      const sheetSaysOverdue =
        composeHealthSheet(undefined, draft(), today).statusLine ===
        slots.acaCostStatusOverdue(VERIFIED_ON_LONG)
      expect(sheetSaysOverdue, `today=${today}: sheet and token must agree`).toBe(tokenRefuses)
      expect(acaCheckOverdue(today), `today=${today}: the shared predicate is the one source`).toBe(
        tokenRefuses,
      )
    }
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
    const view = composeHealthSheet(readout, draft(), FRESH)
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
        slots.acaCostCliff(3), // 0.31 → 3 of 10
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

  it('the shadow rate CROSSES the senior-bonus sunset with the engine (C4, council 2026-07-09): the same anchor reads 12¢ at a 2028 calendar and 22¢ at 2029', () => {
    // The year is the ISOLATED variable: identical household (61 + 63 ⇒ count65 = 1 at the
    // yearsIn-3 anchor), identical anchor MAGI 138,000, drag zeroed (slcsp 0) — only the
    // startCalendarYear moves the anchor across the boundary. Hand-derived (DND/012):
    //   2025 + 3 = 2028 (in-window):  D = 32,200 + 1,650 + 6,000 = 39,850 ⇒ taxable 98,150
    //     ⇒ the 12% band (≤ 100,800) ⇒ 12¢.
    //   2026 + 3 = 2029 (post-sunset): D = 33,850 ⇒ taxable 104,150 ⇒ the 22% band ⇒ 22¢.
    // A readout that ignored the calendar would quote 12¢ against an engine pricing 22% —
    // the single-producer drift C4 exists to forbid.
    const readout: HealthReadout = {
      byYear: [
        year({
          yearsFromNow: 4,
          acaPricedFraction: 1,
          acaNetPremiumP50: 9_000,
          acaMagiP50: 80_000,
          irmaaMagiP50: 138_000,
        }),
      ],
    }
    const at2028 = composeHealthSheet(readout, draft({ ages: [61, 63], slcsp: 0, startYear: 2025 }), FRESH)
    const at2029 = composeHealthSheet(readout, draft({ ages: [61, 63], slcsp: 0, startYear: 2026 }), FRESH)
    expect(factOf(at2028, 'conversion')?.figure).toBe(slots.healthFigCents(12))
    expect(factOf(at2029, 'conversion')?.figure).toBe(slots.healthFigCents(22))
  })

  it('an OVER-cliff anchor quotes the cutoff dollar INLINE (no headroom sentence precedes it in that branch — audit 2026-07-03)', () => {
    const readout: HealthReadout = {
      byYear: [year({ acaPricedFraction: 1, acaNetPremiumP50: 20_000, acaMagiP50: 90_000, irmaaMagiP50: 85_000, overCliffFraction: 0.62 })],
    }
    const discount = factOf(composeHealthSheet(readout, draft(), FRESH), 'discount')
    expect(discount?.figure).toBeUndefined() // no room to quote past the cutoff
    expect(discount?.lines).toEqual([slots.acaCostCliffOverCliff(6, '84,600')])
  })

  it('the CEILING over-cliff frequency renders the VALENCE-NEUTRAL "more than 9 in 10" — never the good-news "better than", never a stacked "about", never "10 of 10" (council 2026-07-18 Q3, the hawk’s veto: a ≥0.95 over-cliff household must never read its vanishing discount as reassurance)', () => {
    // Below-cliff anchor (headroom branch): the cliffLine rides acaCostCliff at worstOfTen = 10.
    const headroomReadout: HealthReadout = {
      byYear: [year({ acaPricedFraction: 1, acaNetPremiumP50: 12_000, acaMagiP50: 66_600, irmaaMagiP50: 60_000, overCliffFraction: 0.97 })],
    }
    const headroomLines = factOf(composeHealthSheet(headroomReadout, draft(), FRESH), 'discount')?.lines ?? []
    const cliffLine = headroomLines[headroomLines.length - 1]!
    expect(cliffLine).toBe(slots.acaCostCliff(10))
    expect(cliffLine).toContain('In more than 9 in 10 futures')
    expect(cliffLine).not.toContain('better than')
    expect(cliffLine).not.toContain('about more than')
    expect(cliffLine).not.toContain('10 of 10')

    // Over-cliff anchor: the inline-cutoff sibling rides the same adverse ceiling.
    const overReadout: HealthReadout = {
      byYear: [year({ acaPricedFraction: 1, acaNetPremiumP50: 20_000, acaMagiP50: 90_000, irmaaMagiP50: 85_000, overCliffFraction: 0.96 })],
    }
    const overLine = factOf(composeHealthSheet(overReadout, draft(), FRESH), 'discount')?.lines[0]
    expect(overLine).toBe(slots.acaCostCliffOverCliff(10, '84,600'))
    expect(overLine).toContain('In more than 9 in 10 futures')
    expect(overLine).not.toContain('better than')
    expect(overLine).not.toContain('about more than')
  })

  it('a sub-1-of-10 worst cliff fraction folds NO odds sentence into the discount fact (nothing honest to quote at the frame’s grain)', () => {
    const readout: HealthReadout = {
      byYear: [year({ acaPricedFraction: 1, acaNetPremiumP50: 9_000, acaMagiP50: 50_000, irmaaMagiP50: 45_000, overCliffFraction: 0.04 })],
    }
    const discount = factOf(composeHealthSheet(readout, draft(), FRESH), 'discount')
    expect(discount?.lines).toHaveLength(1) // the context sentence alone — no odds line
    expect(discount?.lines[0]).toBe(slots.shadowRateHeadroom('50,000', '84,600', '34,600'))
  })

  it('the Medicare anchor composes the story + the now-anchor + the next-step fact (tier-1 MFJ at a 150,000 anchor: step ~1,148 [95.7×12], headroom 68,000)', () => {
    const readout: HealthReadout = {
      byYear: [year({ yearsFromNow: 1, medicareBaseP50: 4_870, irmaaMagiP50: 150_000 })],
    }
    const view = composeHealthSheet(readout, draft({ ages: [66, 66] }), FRESH)
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
    const view = composeHealthSheet(readout, draft({ ages: [66, 62] }), FRESH)
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
    const view = composeHealthSheet(readout, draft({ ages: [66, 66] }), FRESH)
    // 4,870 + 2,400 = 7,270 → '7,300'; the surcharge itself quoted at '2,400'.
    expect(factOf(view, 'medicare')?.lines[1]).toBe(slots.irmaaStepNowSurcharged('7,300', '2,400'))
  })
})

describe('showMedicarePricedNote — the route-aware priced-Medicare disclosure seam (insight 080)', () => {
  it('shows the priced-in disclosure exactly when the run PRICED Medicare AND no Healthcare door is reached', () => {
    // Priced + no door (the all-65+ household, spine or date route): its ONLY Medicare surface.
    expect(showMedicarePricedNote({ medicarePriced: true, reachesHealthDoor: false })).toBe(true)
    // Priced + a door (the ACA-priced household): the sheet already carries the residual
    // (controlHealthOmissionsNote) — no hero duplicate (one honest home per fact).
    expect(showMedicarePricedNote({ medicarePriced: true, reachesHealthDoor: true })).toBe(false)
    // Not priced ⇒ nothing to affirm (both door arms).
    expect(showMedicarePricedNote({ medicarePriced: false, reachesHealthDoor: false })).toBe(false)
    expect(showMedicarePricedNote({ medicarePriced: false, reachesHealthDoor: true })).toBe(false)
  })

  it('is STRUCTURALLY age-free — the seam takes PRICING FACTS, so no age can re-key it (the insight-080 fix)', () => {
    // The age-mutation witness is TYPE-LEVEL: there is no `people[]`/age parameter to mutate. Passing
    // one is a compile error (excess-property check) — the predecessor `medicareUnpriced(people)`
    // keyed off exactly this and silently lied once dateSearch became a second producer of the flag.
    // @ts-expect-error — an age/people[] input is UNREPRESENTABLE on the pricing-fact seam
    showMedicarePricedNote({ medicarePriced: true, reachesHealthDoor: false, people: [{ currentAge: 40 }] })
    // Behavioral arm: the decision depends ONLY on the pricing facts — identical for every household
    // that shares them, whatever the ages behind the run.
    expect(showMedicarePricedNote({ medicarePriced: true, reachesHealthDoor: false })).toBe(true)
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

  it('collapses to the even arm when both medians ROUND to one formatted figure (Caddie 2026-07-10 — never "~$99,800 versus ~$99,800")', () => {
    // 99,840 and 99,790 differ raw but both land on the $100 rounding grain at 99,800.
    const view = composeRegimeFutures(outcome(99_840, 99_790), true)
    expect(view?.deltaLine).toBe(slots.subsidyRegimeCostEven('99,800'))
    expect(view?.deltaLine).not.toContain('versus')
    // the odds line still demotes to the second row exactly like the delta arm.
    expect(view?.stateLine).toBe(slots.rothDeltaJoint(slots.xOfTen(8), slots.xOfTen(7)))
  })

  it('keeps the versus sentence when the formatted figures genuinely differ by one grain', () => {
    // 99,840 rounds to 99,800; 99,860 rounds to 99,900 — adjacent grains stay a real compare.
    const view = composeRegimeFutures(outcome(99_840, 99_860), true)
    expect(view?.deltaLine).toBe(slots.subsidyRegimeCostDelta('99,800', '99,900'))
  })
})

// ===========================================================================
// composeMedicareExtrasTypicalNote — the F5 population-A HERO appendix (the
// extras ultramode review's one confirmed finding, 2026-07-12: the door half
// had end-to-end proof, the hero composer's arm selection had none). The live
// producer chain is transitively pinned by the fit gate (?vault=stale's
// row-gap 2px holds only under :has(.cs-medicare-residual--typical), stamped
// off this composer's output) — these arms pin the SELECTION logic itself.
// ===========================================================================
describe('composeMedicareExtrasTypicalNote — the hero on-typical appendix (F5, population A)', () => {
  const person = (
    who: string,
    provenance: 'entered' | 'affirmed-zero' | 'typical',
    monthly: number,
  ) => ({ who, provenance, monthly })

  it('a NULL view (no Medicare-bearing overlay) makes NO claim', () => {
    expect(composeMedicareExtrasTypicalNote(null)).toBeUndefined()
  })

  it('an entered/affirmed household needs NO typical caveat', () => {
    expect(
      composeMedicareExtrasTypicalNote([person('Pat', 'entered', 220), person('Sam', 'affirmed-zero', 0)]),
    ).toBeUndefined()
  })

  it('ONE on-typical person is named — and it is the TYPICAL person, never positionally person 1', () => {
    // The who-correctness trap: person 2 rides the typical, person 1 entered — the sentence
    // must name Sam with Sam's OWN figure (typicals[0] AFTER the filter, not view[0]).
    expect(
      composeMedicareExtrasTypicalNote([person('Pat', 'entered', 220), person('Sam', 'typical', 187)]),
    ).toBe(slots.medicareExtrasTypicalOne('Sam', '187'))
  })

  it('BOTH on-typical collapses to ONE sentence (the triple-note anaphora lesson, U13)', () => {
    expect(
      composeMedicareExtrasTypicalNote([person('Pat', 'typical', 203), person('Sam', 'typical', 203)]),
    ).toBe(slots.medicareExtrasTypicalBoth('203'))
  })

  it('the figure rides the humane thousands format (1250 → "1,250")', () => {
    expect(
      composeMedicareExtrasTypicalNote([person('Pat', 'typical', 1_250)]),
    ).toBe(slots.medicareExtrasTypicalOne('Pat', '1,250'))
  })
})
