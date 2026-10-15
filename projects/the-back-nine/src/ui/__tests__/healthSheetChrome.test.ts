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
  composeMedicareExtrasHeldFlat,
  composeMedicareExtrasTypicalNote,
  composeRegimeFutures,
  federalConversionMarginal,
  medicareAnchor,
  medicareEraYear,
  showMedicarePricedNote,
  quotableYears,
  stateConversionMarginal,
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
  // The wire's enrolled count (council 2026-09-13) — every Medicare arm sets it EXPLICITLY: the
  // sheet's enrollment frame reads this, never the draft's ages, so a fixture that forgets it
  // composes a nobody-enrolled year (a base bill with 0 enrolled is impossible on the real wire).
  medicareEnrolledP50: 0,
  acaMagiP50: 0,
  irmaaMagiP50: 0,
  // The anchor year's Social Security (0 — nobody has claimed): the conversion tile's federal
  // term reads the bare bracket until an arm sets it.
  ssBenefitP50: 0,
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
    const view = composeHealthSheet(undefined, draft(), FRESH, undefined)
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
    const view = composeHealthSheet(readout, draft({ enhanced: true }), FRESH, undefined)
    expect(view.statusLine).toBe(slots.acaCostStatusEnhanced(VERIFIED_ON_LONG))
    expect(factOf(view, 'discount')).toBeUndefined() // no cliff exists → no discount fact at all
    expect(factOf(view, 'coverage')).toBeDefined() // the cost fact still quotes — only the cliff vanished
  })

  // ── the OVERDUE status line ────────────────────────────────────────────────────────────────
  // Past the re-verify window the recommendation beside this sheet already refuses to rank
  // ("past their re-check date"). This line used to go on speaking as though the check were
  // current — the sheet that EXPLAINS the model was the one surface not repeating the warning.
  it('PAST the re-verify window both status notes swap to their overdue variants (the sheet stops speaking as though the check were current)', () => {
    expect(composeHealthSheet(undefined, draft(), OVERDUE, undefined).statusLine).toBe(
      slots.acaCostStatusOverdue(VERIFIED_ON_LONG),
    )
    expect(composeHealthSheet(undefined, draft({ enhanced: true }), OVERDUE, undefined).statusLine).toBe(
      slots.acaCostStatusEnhancedOverdue(VERIFIED_ON_LONG),
    )
    // The figures are NOT disowned — the line still names the regime it priced under.
    expect(composeHealthSheet(undefined, draft(), OVERDUE, undefined).statusLine).toContain('stops at the cliff')
  })

  it('the boundary is STRICT: exactly at the window still reads fresh, one day later reads overdue', () => {
    // Insight 029's class — the input has to ROUTE DIFFERENTLY, so the arm must straddle the
    // exact edge. `>= WINDOW` would pass every test that only probed CHECKED_ON+WINDOW+1.
    expect(composeHealthSheet(undefined, draft(), AT_WINDOW, undefined).statusLine).toBe(
      slots.acaCostStatus(VERIFIED_ON_LONG),
    )
    expect(composeHealthSheet(undefined, draft(), AT_WINDOW + 1, undefined).statusLine).toBe(
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
        composeHealthSheet(undefined, draft(), today, undefined).statusLine ===
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
    const view = composeHealthSheet(readout, draft(), FRESH, undefined)
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
    const at2028 = composeHealthSheet(readout, draft({ ages: [61, 63], slcsp: 0, startYear: 2025 }), FRESH, undefined)
    const at2029 = composeHealthSheet(readout, draft({ ages: [61, 63], slcsp: 0, startYear: 2026 }), FRESH, undefined)
    expect(factOf(at2028, 'conversion')?.figure).toBe(slots.healthFigCents(12))
    expect(factOf(at2029, 'conversion')?.figure).toBe(slots.healthFigCents(22))
  })

  it('an OVER-cliff anchor quotes the cutoff dollar INLINE (no headroom sentence precedes it in that branch — audit 2026-07-03)', () => {
    const readout: HealthReadout = {
      byYear: [year({ acaPricedFraction: 1, acaNetPremiumP50: 20_000, acaMagiP50: 90_000, irmaaMagiP50: 85_000, overCliffFraction: 0.62 })],
    }
    const discount = factOf(composeHealthSheet(readout, draft(), FRESH, undefined), 'discount')
    expect(discount?.figure).toBeUndefined() // no room to quote past the cutoff
    expect(discount?.lines).toEqual([slots.acaCostCliffOverCliff(6, '84,600')])
  })

  it('the CEILING over-cliff frequency renders the VALENCE-NEUTRAL "more than 9 in 10" — never the good-news "better than", never a stacked "about", never "10 of 10" (council 2026-07-18 Q3, the hawk’s veto: a ≥0.95 over-cliff household must never read its vanishing discount as reassurance)', () => {
    // Below-cliff anchor (headroom branch): the cliffLine rides acaCostCliff at worstOfTen = 10.
    const headroomReadout: HealthReadout = {
      byYear: [year({ acaPricedFraction: 1, acaNetPremiumP50: 12_000, acaMagiP50: 66_600, irmaaMagiP50: 60_000, overCliffFraction: 0.97 })],
    }
    const headroomLines = factOf(composeHealthSheet(headroomReadout, draft(), FRESH, undefined), 'discount')?.lines ?? []
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
    const overLine = factOf(composeHealthSheet(overReadout, draft(), FRESH, undefined), 'discount')?.lines[0]
    expect(overLine).toBe(slots.acaCostCliffOverCliff(10, '84,600'))
    expect(overLine).toContain('In more than 9 in 10 futures')
    expect(overLine).not.toContain('better than')
    expect(overLine).not.toContain('about more than')
  })

  it('a sub-1-of-10 worst cliff fraction folds NO odds sentence into the discount fact (nothing honest to quote at the frame’s grain)', () => {
    const readout: HealthReadout = {
      byYear: [year({ acaPricedFraction: 1, acaNetPremiumP50: 9_000, acaMagiP50: 50_000, irmaaMagiP50: 45_000, overCliffFraction: 0.04 })],
    }
    const discount = factOf(composeHealthSheet(readout, draft(), FRESH, undefined), 'discount')
    expect(discount?.lines).toHaveLength(1) // the context sentence alone — no odds line
    expect(discount?.lines[0]).toBe(slots.shadowRateHeadroom('50,000', '84,600', '34,600'))
  })

  it('the Medicare anchor composes the story + the now-anchor + the singular extras carve-out (none priced → “about nothing”) + the next-step fact (tier-1 MFJ at a 150,000 anchor: step ~1,196 [99.66×12 — the 2028 bill’s price], headroom 82,000 under the line THAT year’s income meets)', () => {
    const readout: HealthReadout = {
      byYear: [year({ yearsFromNow: 1, medicareBaseP50: 4_870, medicareEnrolledP50: 2, irmaaMagiP50: 150_000 })],
    }
    const view = composeHealthSheet(readout, draft({ ages: [66, 66] }), FRESH, undefined)
    // The Medicare fact: story + the before-any-step anchor (base 4,870 + surcharge 0 → '4,900') + the
    // singular extras carve-out (this fixture prices none → the "about nothing" form).
    expect(factOf(view, 'medicare')).toEqual({
      id: 'medicare',
      eyebrow: copy.healthFactMedicare,
      figure: slots.healthFigPerYear('4,900'),
      lines: [copy.irmaaStepStory, slots.irmaaStepNowBase('4,900'), copy.irmaaStepExtrasNoneOne],
    })
    // THE PRICE FRAME (insight 134's clock): row 1's MAGI is sim-year 0's, calendar 2026, so it meets the
    // 2028 bill's lines in 2026 dollars — tier-1 MFJ = 2 × round1000(109,000 × 1.032²) = 232,000 (TWO
    // Augusts past the lines' August-2025 base, counted — insight 138; the Trustees' 3.2 %, index(2026) = 1;
    // the 2026-pinned 218,000 is two years of CPI LOW, 1c97f55d's 224,000 one). The anchor
    // income QUOTED (150,000); 232,000 − 150,000 = 82,000; both 66 → the two-of-you arm at the ×2
    // household figure, priced at the bill that income meets (2028 — V.E2 224.5 / V.E4 16.3 over 1.032²: tier 1
    // = 84.36 + 15.30 = 99.66/mo per person): 99.66 × 12 × 2 = 2,391.9 → '2,400'.
    expect(factOf(view, 'step')).toEqual({
      id: 'step',
      eyebrow: copy.healthFactStep,
      figure: slots.healthFigStepAdd('2,400'),
      lines: [slots.irmaaStepNext('232,000', '150,000', '82,000', '1,200', '2,400', true)],
    })
  })

  it('ONE spouse enrolled at the anchor quotes the per-person figure on the each-of-you arm (never a flat ×2)', () => {
    const readout: HealthReadout = {
      byYear: [year({ yearsFromNow: 1, medicareBaseP50: 2_435, medicareEnrolledP50: 1, irmaaMagiP50: 150_000 })],
    }
    const view = composeHealthSheet(readout, draft({ ages: [66, 62] }), FRESH, undefined)
    // ONE enrolled on the wire: per-person 99.66 × 12 = 1,196 → '1,200' (the 2028 bill), bothEnrolled=false (the 2026-MAGI line 232,000).
    expect(factOf(view, 'step')?.lines).toEqual([
      slots.irmaaStepNext('232,000', '150,000', '82,000', '1,200', '2,400', false),
    ])
  })

  it('a middle path already paying surcharge composes the SURCHARGED now-arm (total = base + surcharge, the split quoted)', () => {
    const readout: HealthReadout = {
      byYear: [
        year({ yearsFromNow: 1, medicareBaseP50: 4_870, irmaaSurchargeP50: 2_400, medicareEnrolledP50: 2, irmaaMagiP50: 230_000 }),
      ],
    }
    const view = composeHealthSheet(readout, draft({ ages: [66, 66] }), FRESH, undefined)
    // 4,870 + 2,400 = 7,270 → '7,300'; the surcharge itself quoted at '2,400'.
    expect(factOf(view, 'medicare')?.lines[1]).toBe(slots.irmaaStepNowSurcharged('7,300', '2,400'))
  })
})

describe('the two-figure premium card — the era-loud frame (council 2026-09-13; the 2026-09-13 sheets walk’s Card 8)', () => {
  /** `?seed=healthnc` as the app’s own pipeline renders it (measured 2026-09-13 through the real
   *  engine — the SAME run `healthSheetSeedGate.test.ts` pins; re-run that gate to re-derive, never
   *  hand-edit): a 61/59 household — the anchor is yearsFromNow 5 with ONE enrolled (base 2,703), the
   *  first all-enrolled quotable year is 7 (base 5,765 — the base TRENDS up across the on-ramp, so a
   *  flat ×2 = 5,406 is the WRONG number). The wire’s enrolled count is what the sheet reads; the ages
   *  are only the household’s count here. */
  const healthncReadout = (): HealthReadout => ({
    byYear: [
      year({ yearsFromNow: 4, irmaaMagiP50: 66_138 }),
      year({ yearsFromNow: 5, medicareBaseP50: 2_703, medicareEnrolledP50: 1, medicareExtrasP50: 2_928, irmaaMagiP50: 46_020 }),
      year({ yearsFromNow: 6, medicareBaseP50: 2_789, medicareEnrolledP50: 1, medicareExtrasP50: 2_928, irmaaMagiP50: 46_819 }),
      year({ yearsFromNow: 7, medicareBaseP50: 5_765, medicareEnrolledP50: 2, medicareExtrasP50: 5_856, irmaaMagiP50: 41_372 }),
      year({ yearsFromNow: 8, medicareBaseP50: 6_037, medicareEnrolledP50: 2, medicareExtrasP50: 5_856, irmaaMagiP50: 42_442 }),
    ],
  })

  it('healthnc: the LOUD figure is the first all-enrolled year’s total (5,765 → 5,800); the one-enrollee on-ramp is quoted SECOND with its two-year span; neither year surcharged; the extras SPOKEN per quoted year (5,900 once both are on it, 2,900 while one is) — and the step card still reads the UNMOVED anchor (one enrolled → the each-of-you arm)', () => {
    const view = composeHealthSheet(healthncReadout(), draft({ ages: [61, 59] }), FRESH, undefined)
    expect(factOf(view, 'medicare')).toEqual({
      id: 'medicare',
      eyebrow: copy.healthFactMedicareBoth, // the hero's frame: this figure prices the years BOTH are on it
      figure: slots.healthFigPerYear('5,800'),
      lines: [
        copy.irmaaStepStory,
        slots.irmaaStepEraStart('5,800', 6, 2032),
        slots.irmaaStepOnRampSpan(2, '2,700', 4, 2030),
        copy.irmaaStepEraTrendNote,
        copy.irmaaStepBothBase,
        slots.irmaaStepExtrasAddBoth('5,900', '2,900'),
      ],
    })
    // The anchor is UNMOVED (row 5 → MAGI calendar 2030, insight 134's clock — the on-ramp line's own
    // 2030). Its line: bill 2032 carries SIX Augusts past the lines' August-2025 base (counted — insight
    // 138) = 2 × round1000(109,000 × 1.032⁶ = 131,675) = 264,000 nominal, over index(2030) = 1.032⁴ =
    // 1.134276 → 232,748 → '232,700'; 232,748 − 46,020 = 186,728 → '186,700'. (A one-year-late clock —
    // MAGI 2031, seven Augusts over 1.032⁵ — reads 232,365 → '232,400': this arm reds it.) ONE enrolled on
    // the wire at the anchor → the per-person figure on the each-of-you arm, priced at the 2032 bill (past the
    // IRA §11201 Part D reset — V.E2 290.2 / V.E4 53.7 over 1.032⁶: 96.14 + 44.45 = 140.59/mo) × 12 = 1,687 → '1,700'.
    expect(factOf(view, 'step')).toEqual({
      id: 'step',
      eyebrow: copy.healthFactStep,
      figure: slots.healthFigStepAddEach('1,700'),
      lines: [slots.irmaaStepNext('232,700', '46,000', '186,700', '1,700', '3,400', false)],
    })
    // The shipped sentence is GONE from this household: no line quotes the one-enrollee year as the era.
    expect(factOf(view, 'medicare')!.lines).not.toContain(slots.irmaaStepNowBase('2,700'))
  })

  it('medicareEraYear: the first QUOTABLE year everyone is enrolled — a thin-cohort all-enrolled year is withdrawn, the anchor itself when everyone is enrolled from the first billed year, null when never reached', () => {
    expect(medicareEraYear(healthncReadout(), 2)?.yearsFromNow).toBe(7)
    const thin: HealthReadout = {
      byYear: [
        year({ yearsFromNow: 5, medicareBaseP50: 2_703, medicareEnrolledP50: 1 }),
        year({ yearsFromNow: 7, medicareBaseP50: 5_765, medicareEnrolledP50: 2, cohortFraction: 0.4 }),
      ],
    }
    expect(medicareEraYear(thin, 2)).toBeNull()
    const both: HealthReadout = { byYear: [year({ yearsFromNow: 1, medicareBaseP50: 4_870, medicareEnrolledP50: 2 })] }
    expect(medicareEraYear(both, 2)).toBe(medicareAnchor(both))
  })

  it('the on-ramp span reads "for about a year" (run) at one year and a count word above it; ten and up stay digits; the unit "a year" rides every figure', () => {
    expect(slots.irmaaStepOnRampSpan(1, '2,700', 4, 2030)).toContain('and for about a year, only one of you')
    expect(slots.irmaaStepOnRampSpan(1, '2,700', 4, 2030)).toContain('run about ~$2,700 a year')
    expect(slots.irmaaStepOnRampSpan(3, '2,700', 4, 2030)).toContain('for about three years')
    expect(slots.irmaaStepOnRampSpan(25, '2,700', 4, 2030)).toContain('for about 25 years')
    expect(slots.irmaaStepOnRampSpan(25, '2,700', 4, 2030)).toContain('start at about ~$2,700 a year')
  })

  it('both eras are DATED from the wire (the Caddie read 2026-09-14) AND paired with their CALENDAR year (Briggsy’s eye 2026-09-24, "years out — from what?"): "about N years from now, around YYYY"; "starting now" at an anchor of zero; "a year from now" at one, never "one years"; a distance ≤ 0 keeps the year alone', () => {
    expect(slots.irmaaStepEraStart('8,100', 25, 2051)).toMatch(/^About 25 years from now, around 2051, while you’re both on Medicare/)
    expect(slots.irmaaStepEraStart('5,800', 6, 2032)).toMatch(/^About six years from now, around 2032, /)
    expect(slots.irmaaStepEraStart('5,800', 1, 2027)).toMatch(/^About a year from now, around 2027, /)
    expect(slots.irmaaStepEraStart('5,800', 0, 2026), 'an aged vault whose era has arrived keeps the year alone').toMatch(/^Around 2026, while you’re both on Medicare/)
    expect(slots.irmaaStepOnRampSpan(21, '2,700', 4, 2030)).toMatch(/^Before that, starting about four years from now, around 2030, and for about 21 years, only one of you is on Medicare/)
    expect(slots.irmaaStepOnRampSpan(6, '2,700', 0, 2026)).toMatch(/^Before that, starting now and for about six years, /)
    expect(slots.irmaaStepOnRampSpan(2, '2,700', 1, 2027)).toMatch(/^Before that, starting about a year from now, around 2027, and for about two years, /)
    // The composer feeds the wire's own rows: on the healthnc fixture the era is row 7, the anchor row 5 — spoken as
    // sim-years 6 / 4 (row k = the END of sim-year k−1, the C4 clock the step card dates by) with 2032 / 2030.
    const f = factOf(composeHealthSheet(healthncReadout(), draft({ ages: [61, 59] }), FRESH, undefined), 'medicare')!
    expect(f.lines[1]).toMatch(/^About six years from now, around 2032, /)
    expect(f.lines[2]).toMatch(/^Before that, starting about four years from now, around 2030, and for about two years, /)
  })

  it('the each-of-you arm carries BOTH counts and its hero wears its unit (the Caddie read 2026-09-14): one enrolled at the anchor → "+~$1,700 a year each" over a sentence that ALSO quotes the two-of-you figure under the era; the two-of-you arm is byte-untouched', () => {
    const one = factOf(composeHealthSheet(healthncReadout(), draft({ ages: [61, 59] }), FRESH, undefined), 'step')!
    expect(one.figure).toBe('+~$1,700 a year each')
    // The 2032 bill: 140.59 × 12 = 1,687 → '1,700'; ×2 = 3,374 → '3,400'.
    expect(one.lines[0]).toContain('add about ~$1,700 a year for each of you on Medicare.')
    expect(one.lines[0]).toContain('While you’re both on it, that’s about ~$3,400 a year.')
    // FORMATTED ONCE from the product, never 2 × the rounded figure — the seeds' bill years round the same
    // either way, so the witness rides an aged vault (plan started 2024 → MAGI 2024 → the 2026 bill, the
    // anchor's 95.7): 95.7 × 12 = 1,148.4 → '1,100'; ×2 = 2,296.8 → '2,300', where 2 × '1,100' reads 2,200.
    const aged: HealthReadout = { byYear: [year({ yearsFromNow: 1, medicareBaseP50: 2_435, medicareEnrolledP50: 1, irmaaMagiP50: 150_000 })] }
    expect(factOf(composeHealthSheet(aged, draft({ ages: [66, 62], startYear: 2024 }), FRESH, undefined), 'step')!.lines[0]).toContain(
      'add about ~$1,100 a year for each of you on Medicare. While you’re both on it, that’s about ~$2,300 a year.',
    )
    const two: HealthReadout = { byYear: [year({ yearsFromNow: 1, medicareBaseP50: 4_870, medicareEnrolledP50: 2, irmaaMagiP50: 150_000 })] }
    const both = factOf(composeHealthSheet(two, draft({ ages: [66, 66] }), FRESH, undefined), 'step')!
    expect(both.figure).toBe('+~$2,400 a year')
    expect(both.lines[0]).toMatch(/for the two of you\.$/)
    expect(both.lines[0]).not.toContain('each')
  })

  /** A three-year readout: the anchor at 1 with ONE enrolled, the era at 3 with two (span 2). */
  const twoFigure = (anchor: Partial<HealthReadoutYear>, era: Partial<HealthReadoutYear>): HealthReadout => ({
    byYear: [
      year({ yearsFromNow: 1, medicareBaseP50: 2_700, medicareEnrolledP50: 1, medicareExtrasP50: 2_900, irmaaMagiP50: 150_000, ...anchor }),
      year({ yearsFromNow: 2, medicareBaseP50: 2_700, medicareEnrolledP50: 1, medicareExtrasP50: 2_900, irmaaMagiP50: 150_000 }),
      year({ yearsFromNow: 3, medicareBaseP50: 5_800, medicareEnrolledP50: 2, medicareExtrasP50: 5_900, irmaaMagiP50: 150_000, ...era }),
    ],
  })
  const medicareFact = (r: HealthReadout) => factOf(composeHealthSheet(r, draft({ ages: [64, 62] }), FRESH, undefined), 'medicare')!

  it('the surcharge binds PER QUOTED YEAR — on-ramp only: the on-ramp figure INCLUDES its surcharge, the line re-quotes it and names the era figure as base', () => {
    const f = medicareFact(twoFigure({ irmaaSurchargeP50: 800 }, {}))
    expect(f.figure).toBe(slots.healthFigPerYear('5,800'))
    expect(f.lines[2]).toBe(slots.irmaaStepOnRampSpan(2, '3,500', 0, 2026))
    expect(f.lines[3]).toBe(copy.irmaaStepEraTrendNote)
    expect(f.lines[4]).toBe(slots.irmaaStepSurchargeOnRampOnly('3,500', '800', '5,800'))
  })
  it('… era only: the LOUD figure carries the surcharge and the line says so', () => {
    const f = medicareFact(twoFigure({}, { irmaaSurchargeP50: 1_600 }))
    expect(f.figure).toBe(slots.healthFigPerYear('7,400'))
    expect(f.lines[1]).toBe(slots.irmaaStepEraStart('7,400', 2, 2028))
    expect(f.lines[4]).toBe(slots.irmaaStepSurchargeEraOnly('7,400', '1,600', '2,700'))
  })
  it('… both', () => {
    const f = medicareFact(twoFigure({ irmaaSurchargeP50: 800 }, { irmaaSurchargeP50: 1_600 }))
    expect(f.lines[4]).toBe(slots.irmaaStepSurchargeBoth('3,500', '800', '7,400', '1,600'))
  })
  it('… neither (the one-line form); and the extras carve-out reads "about nothing" when the plan prices none in EITHER quoted year — five lines, never a sixth', () => {
    const f = medicareFact(twoFigure({ medicareExtrasP50: 0 }, { medicareExtrasP50: 0 }))
    expect(f.lines[4]).toBe(copy.irmaaStepBothBase)
    expect(f.lines[5]).toBe(copy.irmaaStepExtrasNone)
    // Six since 2026-09-24 (the ONE basis clause after the on-ramp line); the LAW this pins is the extras
    // carve-out being ONE line, never a second — the count is the as-built shape, not the rule.
    expect(f.lines).toHaveLength(6)
  })

  it('the extras carve-out binds PER QUOTED YEAR (review 2026-09-13 late): two figures when the years differ, one when they agree, the "nothing while only one of you is" arm when the on-ramp prices none — never one year’s extras spoken over both', () => {
    // The fixture’s default: on-ramp 2,900 (one enrolled), era 5,900 (two) — the engine charges extras per enrolled person.
    expect(medicareFact(twoFigure({}, {})).lines[5]).toBe(slots.irmaaStepExtrasAddBoth('5,900', '2,900'))
    // Equal at the $100 grain → the single-figure plural line.
    expect(medicareFact(twoFigure({ medicareExtrasP50: 5_900 }, {})).lines[5]).toBe(slots.irmaaStepExtrasAdd('5,900'))
    // The on-ramp prices none (the first-enrolled spouse affirmed zero), the era does.
    expect(medicareFact(twoFigure({ medicareExtrasP50: 0 }, {})).lines[5]).toBe(slots.irmaaStepExtrasAddEraOnly('5,900'))
  })

  it('NO era year (never reached inside the quotable window): the on-ramp figure with its frame stated, the extras spoken, the era NOT invented', () => {
    const readout: HealthReadout = {
      byYear: [
        year({ yearsFromNow: 5, medicareBaseP50: 2_703, medicareEnrolledP50: 1, medicareExtrasP50: 2_928, irmaaMagiP50: 46_020 }),
        year({ yearsFromNow: 6, medicareBaseP50: 2_789, medicareEnrolledP50: 1, medicareExtrasP50: 2_928, irmaaMagiP50: 46_819 }),
      ],
    }
    expect(factOf(composeHealthSheet(readout, draft({ ages: [61, 59] }), FRESH, undefined), 'medicare')).toEqual({
      id: 'medicare',
      eyebrow: copy.healthFactMedicareOne, // ONE figure, the years one of you is on it — the eyebrow says so
      figure: slots.healthFigPerYear('2,700'),
      lines: [
        copy.irmaaStepStory,
        slots.irmaaStepOnRampOpen('2,700'),
        copy.irmaaStepOnRampBase,
        slots.irmaaStepExtrasAddOne('2,900'),
        copy.irmaaStepNoEraYear,
      ],
    })
  })
  it('NO era year, surcharged on-ramp: the single-year surcharge line re-quotes the on-ramp figure', () => {
    const readout: HealthReadout = {
      byYear: [year({ yearsFromNow: 5, medicareBaseP50: 2_703, irmaaSurchargeP50: 800, medicareEnrolledP50: 1, irmaaMagiP50: 230_000 })],
    }
    const f = factOf(composeHealthSheet(readout, draft({ ages: [61, 59] }), FRESH, undefined), 'medicare')!
    expect(f.lines[1]).toBe(slots.irmaaStepOnRampOpen('3,500'))
    expect(f.lines[2]).toBe(slots.irmaaStepSurchargeOf('3,500', '800'))
    expect(f.lines[3]).toBe(copy.irmaaStepExtrasNoneOne) // ONE figure on this card — the singular none form
    expect(f.lines[4]).toBe(copy.irmaaStepNoEraYear)
  })

  it('DEGENERATE arms (the era IS the anchor — an all-65+ household like `retired`, a pre-65 couple who reach 65 the same year like `healthss`, a one-person household) keep the one-figure hero and SPEAK the extras with the singular carve-out — the no-era arm’s own law, one law for every arm (the register’s Tier 0 *The Medicare premium card on a couple who reach 65 the same year drops the drug-and-supplement line…*)', () => {
    const bothAt = (medicareExtrasP50: number): HealthReadout => ({
      byYear: [year({ yearsFromNow: 1, medicareBaseP50: 4_870, medicareEnrolledP50: 2, medicareExtrasP50, irmaaMagiP50: 90_129 })],
    })
    const bothFact = factOf(composeHealthSheet(bothAt(5_856), draft({ ages: [66, 65] }), FRESH, undefined), 'medicare')!
    expect(bothFact.eyebrow).toBe(copy.healthFactMedicare) // the per-arm frames never reach this arm
    expect(bothFact.figure).toBe(slots.healthFigPerYear('4,900')) // ⚑ the extras are SPOKEN, never folded into the hero
    expect(bothFact.lines).toEqual([
      copy.irmaaStepStory,
      slots.irmaaStepNowBase('4,900'),
      slots.irmaaStepExtrasAddOne('5,900'), // 5,856 → the $100 grain
    ])
    // The same card pricing NO extras says so — the singular "about nothing" form, never silence.
    expect(factOf(composeHealthSheet(bothAt(0), draft({ ages: [66, 65] }), FRESH, undefined), 'medicare')!.lines).toEqual([
      copy.irmaaStepStory,
      slots.irmaaStepNowBase('4,900'),
      copy.irmaaStepExtrasNoneOne,
    ])
    // The $100 grain's tie, pinned on BOTH sides (the no-era arm's own `roundDollar` predicate): $49 rounds to
    // $0 → the none form; $50 rounds to $100 → spoken. A threshold moved either way (raw `> 0`, `>= 100`,
    // `> 50`) reds one of the two.
    expect(factOf(composeHealthSheet(bothAt(49), draft({ ages: [66, 65] }), FRESH, undefined), 'medicare')!.lines[2]).toBe(
      copy.irmaaStepExtrasNoneOne,
    )
    expect(factOf(composeHealthSheet(bothAt(50), draft({ ages: [66, 65] }), FRESH, undefined), 'medicare')!.lines[2]).toBe(
      slots.irmaaStepExtrasAddOne('100'),
    )
    // The WORDS, not only the slot: the singular presupposition is why these strings exist ("Neither figure"
    // presupposed a second figure the reader could not find — review 2026-09-13 late). Both slots are the
    // composer's own producers, so a slot-built expectation cannot see a reworded string; these can.
    expect(copy.irmaaStepExtrasNoneOne).toBe(
      'That figure doesn’t count what you’d pay for drug and supplement plans, which this plan prices at about nothing.',
    )
    expect(slots.irmaaStepExtrasAddOne('5,900')).toBe(
      'That figure doesn’t count what you’d pay for drug and supplement plans, which the lines below add at about ~$5,900 a year.',
    )
    // A surcharged anchor keeps its surcharged sentence AND gains the carve-out after it.
    const surcharged: HealthReadout = {
      byYear: [year({ yearsFromNow: 1, medicareBaseP50: 4_870, irmaaSurchargeP50: 2_400, medicareEnrolledP50: 2, medicareExtrasP50: 5_856, irmaaMagiP50: 230_000 })],
    }
    expect(factOf(composeHealthSheet(surcharged, draft({ ages: [66, 66] }), FRESH, undefined), 'medicare')!.lines).toEqual([
      copy.irmaaStepStory,
      slots.irmaaStepNowSurcharged('7,300', '2,400'),
      slots.irmaaStepExtrasAddOne('5,900'),
    ])
    // One person entered, one enrolled → the era is the anchor by count; ONE person's extras.
    const solo: HealthReadout = {
      byYear: [year({ yearsFromNow: 1, medicareBaseP50: 2_435, medicareEnrolledP50: 1, medicareExtrasP50: 2_928, irmaaMagiP50: 90_000 })],
    }
    expect(factOf(composeHealthSheet(solo, draft({ ages: [66] }), FRESH, undefined), 'medicare')!.lines).toEqual([
      copy.irmaaStepStory,
      slots.irmaaStepNowBase('2,400'),
      slots.irmaaStepExtrasAddOne('2,900'),
    ])
  })

  it('equal ROUNDED totals with a DIFFERENT split are NOT degenerate (review 2026-09-13 late — a BLOCKER: the collapse spoke the anchor’s one-enrollee surcharge under the multi-year frame, a surcharge the era years never pay): the era arm composes, the on-ramp’s surcharge bound by FRAME, the era’s base rate named', () => {
    // One enrollee + a look-back surcharge (2,700 + 3,100) collides at the $100 grain with two at base (5,800).
    const equal: HealthReadout = {
      byYear: [
        year({ yearsFromNow: 1, medicareBaseP50: 2_700, irmaaSurchargeP50: 3_100, medicareEnrolledP50: 1, irmaaMagiP50: 230_000 }),
        year({ yearsFromNow: 3, medicareBaseP50: 5_800, medicareEnrolledP50: 2, irmaaMagiP50: 90_000 }),
      ],
    }
    const f = factOf(composeHealthSheet(equal, draft({ ages: [64, 62] }), FRESH, undefined), 'medicare')!
    expect(f.figure).toBe(slots.healthFigPerYear('5,800'))
    expect(f.lines).toEqual([
      copy.irmaaStepStory,
      slots.irmaaStepEraStart('5,800', 2, 2028),
      slots.irmaaStepOnRampSpan(2, '5,800', 0, 2026),
      copy.irmaaStepEraTrendNote,
      slots.irmaaStepSurchargeOnRampOnly('5,800', '3,100', '5,800'),
      copy.irmaaStepExtrasNone,
    ])
    // The two frames share one figure, so the surcharge line must bind by FRAME — it names both.
    expect(f.lines[4]).toMatch(/only one of you is on Medicare/)
    expect(f.lines[4]).toMatch(/while you’re both on it/)
    // The shipped one-figure surcharged sentence never spans the era on this household.
    expect(f.lines).not.toContain(slots.irmaaStepNowSurcharged('5,800', '3,100'))
  })

  it('the step card’s two-of-you fork reads the WIRE, never the draft’s ages (a mutant restoring the age proxy reds both halves)', () => {
    // Ages say one enrolled (66/62); the wire says two → the two-of-you arm at the ×2 figure (the 2026-MAGI line 232,000).
    const wireTwo: HealthReadout = { byYear: [year({ yearsFromNow: 1, medicareBaseP50: 4_870, medicareEnrolledP50: 2, irmaaMagiP50: 150_000 })] }
    expect(factOf(composeHealthSheet(wireTwo, draft({ ages: [66, 62] }), FRESH, undefined), 'step')!.lines).toEqual([
      slots.irmaaStepNext('232,000', '150,000', '82,000', '1,200', '2,400', true),
    ])
    // Ages say both enrolled (66/66); the wire says one (a still-working spouse — onset-aware) → each-of-you.
    const wireOne: HealthReadout = { byYear: [year({ yearsFromNow: 1, medicareBaseP50: 2_435, medicareEnrolledP50: 1, irmaaMagiP50: 150_000 })] }
    expect(factOf(composeHealthSheet(wireOne, draft({ ages: [66, 66] }), FRESH, undefined), 'step')!.lines).toEqual([
      slots.irmaaStepNext('232,000', '150,000', '82,000', '1,200', '2,400', false),
    ])
  })

  it('the era lines count from TODAY on an aged vault (the plan clock, 2026-09-24): `sincePlanBuilt` shrinks the distance and keeps the calendar year; once the era has arrived the year stands alone', () => {
    // The fresh session is the byte-identity (sincePlanBuilt 0 — every arm above). Two calendar years
    // into the plan the same rows are two years nearer; six years in, the era (2032) has arrived and
    // the on-ramp (2030) is behind us — the composer says "Around 2032" / "starting now", never a
    // negative distance and never a moved year.
    const two = factOf(composeHealthSheet(healthncReadout(), draft({ ages: [61, 59] }), FRESH, undefined, 2), 'medicare')!
    expect(two.lines[1]).toBe(slots.irmaaStepEraStart('5,800', 4, 2032))
    expect(two.lines[1]).toMatch(/^About four years from now, around 2032, /)
    expect(two.lines[2]).toBe(slots.irmaaStepOnRampSpan(2, '2,700', 2, 2030))
    expect(two.lines[2]).toMatch(/^Before that, starting about two years from now, around 2030, and for about two years, /)
    const six = factOf(composeHealthSheet(healthncReadout(), draft({ ages: [61, 59] }), FRESH, undefined, 6), 'medicare')!
    expect(six.lines[1]).toBe(slots.irmaaStepEraStart('5,800', 0, 2032))
    expect(six.lines[1]).toMatch(/^Around 2032, while you’re both on Medicare/)
    expect(six.lines[2]).toBe(slots.irmaaStepOnRampSpan(2, '2,700', -2, 2030))
    expect(six.lines[2]).toMatch(/^Before that, starting now and for about two years, /)
  })

  it('the basis clause carries no figure, no percentage, no arrow (the register’s negatives — a rate is the casino tell the calm lane hunts) and wears a catalog hedge', () => {
    // The irmaaStep* family is hedge-swept, not numeral-swept, so "about 3% a year" would pass every
    // universal gate — this arm is the only thing that reds it (a 2026-09-24 mutant survived without it).
    expect(copy.irmaaStepEraTrendNote).not.toMatch(/[\d%→↑↓]/)
    expect(copy.irmaaStepEraTrendNote).toMatch(/\b(likely|tends?|often|usually|could|may|might)\b/)
    // It renders on the era-loud arm only, after the on-ramp line (both figures in view).
    const f = medicareFact(twoFigure({}, {}))
    expect(f.lines[3]).toBe(copy.irmaaStepEraTrendNote)
    expect(f.lines[2]).toMatch(/^Before that, /)
  })
})

// ─── the conversion tile counts the RUN's priced state ───────────────────────────────────────────
// The register's Tier 0 "The health sheet's "about 22¢ all told" leaves out the North Carolina tax the
// run itself charges": "all told — the tax on it, plus the discount lost" was federal + drag only, while
// the run charged NC on every converted dollar and the sheet's "Not counted here" list had dropped state
// tax. The figure moves; the words stay. Every expectation below is hand-derived (DND 012) from the
// statute rows — NC (S.L. 2026-41 § 44.1(a)): 3.99 % in 2026, 3.49 % in 2027–2029, over a $25,500 MFJ
// standard deduction (G.S. 105-153.5(a)(1); the price index is 1 in 2026); PA: 3.07 % flat, the
// conversion exempt once every member has reached 59½ (the engine's integer proxy: 60); FL: $0 — never
// read back from `stateIncomeTax` or the composer's own formula.
describe('the conversion tile counts the RUN’s priced state (the register’s Tier 0 "about 22¢ all told")', () => {
  /** The shared ACA fixture (the hand-derived 22¢ arm above): AGI 60,000 − 32,200 = 27,800 taxable
   *  → the 12 % band; MAGI 66,600 ÷ 21,150 = 3.15 × FPL → the flat 9.96 % band, PTC live on a $12,000
   *  benchmark (12,000 − 0.0996 × 66,600 = 5,367 > 0) → drag 9.96¢. Federal + drag = 21.96 → 22¢. */
  const anchorAt = (yearsFromNow: number, irmaaMagiP50 = 60_000): HealthReadout => ({
    byYear: [
      year({ yearsFromNow, acaPricedFraction: 1, acaNetPremiumP50: 9_950, acaMagiP50: 66_600, irmaaMagiP50, overCliffFraction: 0.31 }),
    ],
  })
  const cents = (view: ReturnType<typeof composeHealthSheet>) => factOf(view, 'conversion')

  it('NC: the 2026 anchor adds 3.99¢ — 12 + 9.96 + 3.99 = 25.95 → 26¢, figure AND sentence (the words unchanged, only the numeral moves)', () => {
    expect(cents(composeHealthSheet(anchorAt(1), draft(), FRESH, 'NC'))).toEqual({
      id: 'conversion',
      eyebrow: copy.healthFactConversion,
      figure: slots.healthFigCents(26),
      lines: [slots.shadowRateLine(26)],
    })
  })

  it('NC: the rate is read at the ANCHOR’s calendar year — a 2027 anchor adds the stepped-down 3.49¢: 12 + 9.96 + 3.49 = 25.45 → 25¢ (a 2026-rate read would say 26)', () => {
    // The year is the isolated variable: identical household and anchor, only startCalendarYear moves.
    expect(cents(composeHealthSheet(anchorAt(1), draft({ startYear: 2027 }), FRESH, 'NC'))?.figure).toBe(slots.healthFigCents(25))
    // …and through the yearsIn clock: a 2026 plan whose anchor is year 2 (calendar 2027) reads the same 25¢.
    expect(cents(composeHealthSheet(anchorAt(2), draft(), FRESH, 'NC'))?.figure).toBe(slots.healthFigCents(25))
  })

  it('NC: an AGI under NC’s standard deduction pays no NC tax on that dollar — 24,000 < 25,500 → +0: taxable 0 → the 10 % band, 10 + 9.96 = 19.96 → 20¢, priced or not', () => {
    const low = anchorAt(1, 24_000)
    expect(cents(composeHealthSheet(low, draft(), FRESH, undefined))?.figure).toBe(slots.healthFigCents(20))
    expect(cents(composeHealthSheet(low, draft(), FRESH, 'NC'))?.figure).toBe(slots.healthFigCents(20))
  })

  it('NC: the state base starts from AGI, never the federal TAXABLE figure — a 50,000 AGI is 17,800 federally taxable (the 10 % band, under NC’s $25,500 deduction) yet NC taxes 50,000 − 25,500: 10 + 9.96 + 3.99 = 23.95 → 24¢ (a taxable-figure base would say 20)', () => {
    expect(cents(composeHealthSheet(anchorAt(1, 50_000), draft(), FRESH, 'NC'))?.figure).toBe(slots.healthFigCents(24))
    expect(cents(composeHealthSheet(anchorAt(1, 50_000), draft(), FRESH, undefined))?.figure).toBe(slots.healthFigCents(20))
  })

  it('NC: the deduction EDGE, to the dollar — an AGI $500 under NC’s $25,500 deduction adds nothing on the next dollar (10 + 9.96 = 19.96 → 20¢; a coarse $1,000 probe would cross the edge and say 22), and the first dollar past it is taxed (+3.99: 23.95 → 24¢)', () => {
    expect(cents(composeHealthSheet(anchorAt(1, 25_000), draft(), FRESH, 'NC'))?.figure).toBe(slots.healthFigCents(20))
    expect(cents(composeHealthSheet(anchorAt(1, 25_500), draft(), FRESH, 'NC'))?.figure).toBe(slots.healthFigCents(24))
  })

  it('PA: both sides of the qualified-age gate — a member under 59½ at the anchor is TAXED (+3.07¢: 21.96 + 3.07 = 25.03 → 25¢); every member 60+ is exempt (22¢); the gate rides the anchor’s yearsIn clock; an unknown age is taxed (the conservative arm)', () => {
    // [61, 59] at a year-0 anchor: min 59 < 59½ → the conversion is PA-taxable.
    expect(cents(composeHealthSheet(anchorAt(1), draft({ ages: [61, 59] }), FRESH, 'PA'))?.figure).toBe(slots.healthFigCents(25))
    // [61, 60]: every member at the qualified age → exempt → the federal + drag figure.
    expect(cents(composeHealthSheet(anchorAt(1), draft({ ages: [61, 60] }), FRESH, 'PA'))?.figure).toBe(slots.healthFigCents(22))
    // [61, 59] at a year-1 anchor: the younger member is 60 THERE → exempt. Today's age would say taxed.
    expect(cents(composeHealthSheet(anchorAt(2), draft({ ages: [61, 59] }), FRESH, 'PA'))?.figure).toBe(slots.healthFigCents(22))
    // An unknown age never earns the exemption (the overstating direction — never the rosy one).
    const unknownAge = { ...draft(), people: [{ currentAge: 61 }, {}] }
    expect(cents(composeHealthSheet(anchorAt(1), unknownAge, FRESH, 'PA'))?.figure).toBe(slots.healthFigCents(25))
  })

  it('FL: a priced $0 state reads byte-identical to an unpriced household (22¢ — the constitutional $0 adds nothing)', () => {
    const fl = composeHealthSheet(anchorAt(1), draft(), FRESH, 'FL')
    expect(fl).toEqual(composeHealthSheet(anchorAt(1), draft(), FRESH, undefined))
    expect(cents(fl)?.figure).toBe(slots.healthFigCents(22))
  })

  it('the cents round ONCE, over the whole sum — a sliding-band drag makes a split rounding visible: 12 + 16.22 + 3.49 (NC 2027) = 31.71 → 32¢, where rounding federal + drag and the state apart says 28 + 3 = 31', () => {
    // Hand-derived (DND 012) from the reverted table's 2.5–3.0 × FPL row (8.44 → 9.96 %, linear): at a
    // MAGI of m the contribution is (0.0084 + 0.0304 × m ÷ 21,150) × m, so across the drag probe's
    // $1,000 step 53,000 → 54,000 (2.506 → 2.553 × FPL, one band) it rises 4,482.72 → 4,644.92: 16.22¢
    // a dollar, the PTC live on the $12,000 benchmark and under the 84,600 cliff. The AGI stays 60,000
    // (the 12 % band), so the unpriced figure is 12 + 16.22 = 28.22 → 28¢.
    const sliding: HealthReadout = {
      byYear: [
        year({ yearsFromNow: 1, acaPricedFraction: 1, acaNetPremiumP50: 9_950, acaMagiP50: 53_000, irmaaMagiP50: 60_000, overCliffFraction: 0.31 }),
      ],
    }
    expect(cents(composeHealthSheet(sliding, draft({ startYear: 2027 }), FRESH, undefined))?.figure).toBe(slots.healthFigCents(28))
    expect(cents(composeHealthSheet(sliding, draft({ startYear: 2027 }), FRESH, 'NC'))?.figure).toBe(slots.healthFigCents(32))
  })

  it('UNPRICED: no priced state ⇒ the pre-change federal + drag figure, byte-identical (22¢ — the arm above this block pinned it before the state term existed); the state term is a literal 0, never a computed one', () => {
    expect(cents(composeHealthSheet(anchorAt(1), draft(), FRESH, undefined))).toEqual({
      id: 'conversion',
      eyebrow: copy.healthFactConversion,
      figure: slots.healthFigCents(22),
      lines: [slots.shadowRateLine(22)],
    })
    expect(Object.is(stateConversionMarginal({ state: undefined, filing: 'mfj', calendarYear: 2026, agi: 60_000, minLivingAge: 60 }), 0)).toBe(true)
  })
})

// ─── the conversion tile prices the Social Security a converted dollar pulls into tax ────────────
// The register's Tier 0 "The health sheet's conversion tile prices the federal tax at the bare bracket
// rate — a household drawing Social Security before 65 reads "about 22¢ all told" where the run charges
// about 32¢". The run taxes the benefit through IRS Pub 915 Worksheet 1, so a converted dollar with
// provisional income in the 50 % / 85 % phase adds $0.50 / $0.85 of taxable benefit too. Every
// expectation below is hand-derived (DND 012) from the statute, never read back from `taxCore` or the
// composer: the §86 MFJ lines $32,000 / $44,000 (frozen — the price index is 1 in 2026); the 2026 MFJ
// brackets (10 % to $24,800, 12 % to $100,800, 22 % to $211,400) over the $32,200 standard deduction
// (+ $1,650 per 65+ filer); the OBBBA senior bonus, $6,000 per 65+ filer less 6 % of MAGI over
// $150,000, 2025–2028 only (Schedule 1-A). `slcsp: 0` isolates the federal term (no benchmark, no drag).
describe('the conversion tile prices the Social Security a converted dollar pulls into tax (the register’s Tier 0 "the bare bracket rate")', () => {
  /** One ACA-priced anchor year carrying an AGI, an ACA MAGI and the year's Social Security. */
  const withBenefit = (agi: number, acaMagi: number, ssBenefit: number): HealthReadout => ({
    byYear: [
      year({ yearsFromNow: 1, acaPricedFraction: 1, acaNetPremiumP50: 9_950, acaMagiP50: acaMagi, irmaaMagiP50: agi, ssBenefitP50: ssBenefit, overCliffFraction: 0.31 }),
    ],
  })
  const cents = (view: ReturnType<typeof composeHealthSheet>) => factOf(view, 'conversion')

  it('the 85 % phase (the register’s worked example): $40,000 of benefit over $40,000 of other income — provisional 60,000 → taxable benefit 6,000 + 0.85 × 16,000 = 19,600 → AGI 59,600, 27,400 taxable (12 %); one more dollar adds 1.85 taxable → 22.2¢, + the 9.96¢ drag (MAGI 80,000 = 3.78 × FPL, PTC live: 12,000 − 7,968 > 0) = 32.16 → 32¢, figure AND sentence (the bare bracket said 22)', () => {
    expect(cents(composeHealthSheet(withBenefit(59_600, 80_000, 40_000), draft({ ages: [62, 62] }), FRESH, undefined))).toEqual({
      id: 'conversion',
      eyebrow: copy.healthFactConversion,
      figure: slots.healthFigCents(32),
      lines: [slots.shadowRateLine(32)],
    })
    expect(federalConversionMarginal({ filing: 'mfj', calendarYear: 2026, count65: 0, agi: 59_600, ssBenefit: 40_000 })).toBeCloseTo(0.222, 9)
  })

  it('the 50 % phase, $500 under the 85 % line — $20,000 of benefit over $33,500: provisional 43,500 → taxable benefit min(10,000, 0.5 × 11,500) = 5,750 → AGI 39,250, 7,050 taxable (10 %); one more dollar adds 1.5 → 15¢ (the bare bracket said 10; a $1,000 probe would cross into the 85 % phase and say 17)', () => {
    expect(cents(composeHealthSheet(withBenefit(39_250, 53_500, 20_000), draft({ ages: [62, 62], slcsp: 0 }), FRESH, undefined))?.figure).toBe(slots.healthFigCents(15))
    expect(federalConversionMarginal({ filing: 'mfj', calendarYear: 2026, count65: 0, agi: 39_250, ssBenefit: 20_000 })).toBeCloseTo(0.15, 9)
  })

  it('past the 85 %-of-benefit cap the benefit adds nothing — $20,000 over $60,000: provisional 70,000 → min(0.85 × 20,000, 6,000 + 0.85 × 26,000) = 17,000, the cap → AGI 77,000, 44,800 taxable (12 %) → 12¢, the bare bracket (an "85 % phase ⇒ × 1.85" shortcut would say 22)', () => {
    expect(cents(composeHealthSheet(withBenefit(77_000, 80_000, 20_000), draft({ ages: [62, 62], slcsp: 0 }), FRESH, undefined))?.figure).toBe(slots.healthFigCents(12))
  })

  it('a SHELTERED anchor keeps the tile’s convention — $30,000 over $20,000: provisional 35,000 → taxable benefit 1,500 → AGI 21,500, under the 32,200 deduction: the run charges no federal tax on the next dollar; the tile reads the first bracket, 10¢, as it always has (multiplying that rate by the live 1.5 slope would say 15)', () => {
    expect(cents(composeHealthSheet(withBenefit(21_500, 50_000, 30_000), draft({ ages: [62, 62], slcsp: 0 }), FRESH, undefined))?.figure).toBe(slots.healthFigCents(10))
  })

  it('the senior bonus’s phase-out adds its slope with NO benefit — one 65+ filer at AGI 170,000 in 2026: the deduction 32,200 + 1,650 + (6,000 − 0.06 × 20,000) = 38,650 shrinks 6¢ per dollar → 131,350 taxable (22 %) × 1.06 = 23.32 → 23¢ (over the cliff, no drag); in 2029, past the bonus’s sunset, the bare 22¢', () => {
    const highAgi = withBenefit(170_000, 170_000, 0)
    expect(cents(composeHealthSheet(highAgi, draft({ ages: [66, 62] }), FRESH, undefined))?.figure).toBe(slots.healthFigCents(23))
    expect(cents(composeHealthSheet(highAgi, draft({ ages: [66, 62], startYear: 2029 }), FRESH, undefined))?.figure).toBe(slots.healthFigCents(22))
  })

  it('incoherent medians never throw or read NaN — a $200,000 benefit whose own taxable floor (provisional 100,000 at zero other income → 6,000 + 0.85 × 56,000 = 53,600) exceeds the 40,000 AGI clamps the other income at 0, where the benefit is in the 85 % phase: 7,800 taxable (10 %) × 1.85 = 0.185', () => {
    expect(federalConversionMarginal({ filing: 'mfj', calendarYear: 2026, count65: 0, agi: 40_000, ssBenefit: 200_000 })).toBeCloseTo(0.185, 9)
  })

  it('NO BENEFIT ⇒ the bare bracket, byte-identical: both slopes add an exact 0 (12 % at AGI 60,000 — Object.is, never a near-equal), and the household above every one of these arms still reads 22¢', () => {
    expect(Object.is(federalConversionMarginal({ filing: 'mfj', calendarYear: 2026, count65: 0, agi: 60_000, ssBenefit: 0 }), 0.12)).toBe(true)
    expect(cents(composeHealthSheet(withBenefit(60_000, 66_600, 0), draft(), FRESH, undefined))?.figure).toBe(slots.healthFigCents(22))
  })
})

describe('showMedicarePricedNote — the route-aware priced-Medicare disclosure seam (insight 080)', () => {
  it('shows the priced-in disclosure exactly when the run PRICED Medicare AND no Healthcare door is reached', () => {
    // Priced + no door (the all-65+ household, spine or date route): its ONLY Medicare surface.
    expect(showMedicarePricedNote({ medicarePriced: true, reachesHealthDoor: false })).toBe(true)
    // Priced + a door (the ACA-priced household): the sheet carries the held-flat line + its own
    // omissions list (composeMedicareExtrasHeldFlat, below) — no hero duplicate (one honest home per fact).
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

// ===========================================================================
// composeMedicareExtrasHeldFlat — the door sheet's held-flat line (closes the register's Tier 0
// "A pre-65 household is never told its Medicare extra-coverage premiums are held flat"). The
// engine charges the extras REAL-FLAT; the all-65+ verdict says so, and the door household's
// verdict residual is withheld (showMedicarePricedNote), so the sheet's extras block is its one
// home. These arms pin the GATE — the view's presence alone, $0 included (one rule with the
// all-65+ Tail); healthcareSheet.test pins the rendered position under the per-person dollars.
// ===========================================================================
describe('composeMedicareExtrasHeldFlat — the door sheet’s held-flat line (F5, population B)', () => {
  const person = (
    who: string,
    provenance: 'entered' | 'affirmed-zero' | 'typical',
    monthly: number,
  ) => ({ who, provenance, monthly })

  it('a NULL view (no Medicare-bearing overlay) makes NO claim', () => {
    expect(composeMedicareExtrasHeldFlat(null)).toBeNull()
  })

  it('every figure $0 STILL wears the line — a $0 held flat can run higher too, and the all-65+ Tail speaks unconditionally (one rule, both homes)', () => {
    // A dollar-keyed gate (> 0) or a provenance-keyed one (anything but affirmed-zero) would fall
    // silent on one of these — the optimistic-direction silence the verify pass reversed.
    expect(
      composeMedicareExtrasHeldFlat([person('Pat', 'affirmed-zero', 0), person('Sam', 'affirmed-zero', 0)]),
    ).toBe(copy.medicareExtrasSheetHeldFlat)
    expect(composeMedicareExtrasHeldFlat([person('Pat', 'affirmed-zero', 0)])).toBe(copy.medicareExtrasSheetHeldFlat)
    expect(
      composeMedicareExtrasHeldFlat([person('Pat', 'entered', 0), person('Sam', 'affirmed-zero', 0)]),
    ).toBe(copy.medicareExtrasSheetHeldFlat)
  })

  it('one ENTERED figure above $0 wears the line', () => {
    expect(composeMedicareExtrasHeldFlat([person('Pat', 'entered', 185)])).toBe(copy.medicareExtrasSheetHeldFlat)
  })

  it('the TYPICAL figure wears the line', () => {
    expect(
      composeMedicareExtrasHeldFlat([person('Pat', 'typical', 203), person('Sam', 'typical', 203)]),
    ).toBe(copy.medicareExtrasSheetHeldFlat)
  })

  it('MIXED $0 + above $0 wears the line — one premium the block shows is enough, in either position', () => {
    // Either position: no per-person gate may ever silence the line.
    expect(
      composeMedicareExtrasHeldFlat([person('Pat', 'affirmed-zero', 0), person('Sam', 'entered', 220)]),
    ).toBe(copy.medicareExtrasSheetHeldFlat)
    expect(
      composeMedicareExtrasHeldFlat([person('Pat', 'typical', 203), person('Sam', 'affirmed-zero', 0)]),
    ).toBe(copy.medicareExtrasSheetHeldFlat)
  })

  it('the words are HIS, lifted from the verdict tail — the two homes can never diverge (drift-pin)', () => {
    // The all-65+ verdict reads `verdictResidualTail` (a period graft + the sentence); the door sheet
    // reads the bare sentence. Reword either alone and this reds.
    expect(copy.verdictResidualTail).toBe(`. ${copy.medicareExtrasSheetHeldFlat}`)
  })
})
