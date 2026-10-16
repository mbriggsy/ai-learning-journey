/**
 * The shipped Medicare seeds through the REAL pipeline — buildSpineParams → runEngine with the app's
 * own options → composeHealthSheet — the council's gate for the era-loud premium card (2026-09-13,
 * 8/10): the WIRE-read enrollment frame renders `retired` (66/65) and `healthss` (62/62) — everyone
 * enrolled from the first billed year — on the one-figure arm (the era's first year, dated and "start at",
 * + his trend clause + the singular extras carve-out, 2026-10-15/16), `healthnc` (61/59) era-loud with the step card's anchor
 * UNMOVED, `healthgap` (61/40).
 *
 * Every dollar below is the engine's own output through this file's pipeline (first measured
 * 2026-09-13) at the $100 grain the sheet speaks. A constants re-verify that moves Part B or the
 * Medicare-cost trend moves them — re-run THIS gate, read the engine's numbers off the failure, and
 * re-pin; never hand-edit a number into agreement (DND 012: the expectation is derived OUTSIDE the
 * composer, by the engine's run, never by the composer's formula). This file IS the instrument.
 *
 * Lives beside the unit arms (not inside them) so the fast file stays fast: every arm is a 2,000-path run.
 */
import { describe, it, expect } from 'vitest'
import { DEV_SEEDS } from '@ui/devSeeds'
import { buildSpineParams, pricedStateForRun } from '@intake/intakeMap'
import { runEngine } from '@engine/engineProtocol'
import { acaAnchor, composeHealthSheet, medicareAnchor, medicareEraYear, quotableYears } from '@ui/healthSheetChrome'
import { copy, slots } from '@ui/copy'
import { epochDayFromIsoDate } from '@engine/validation/oracleToken'
import { acaEnhancedSubsidyStatus, irmaa, medicareCostTrend, medicareExtrasTypicalMonthly, partB2026 } from '@engine/constants/health'
import type { HealthReadout } from '@shared/model'

/** A clock inside the ACA re-verify window, RELATIVE to the live record (the status line is not
 *  under test here; the facts are). */
const FRESH = epochDayFromIsoDate(acaEnhancedSubsidyStatus.value.verifiedOn) + 1

const readoutOf = (name: 'retired' | 'health' | 'healthnc' | 'healthgap' | 'healthss'): HealthReadout => {
  const d = DEV_SEEDS[name]
  const params = buildSpineParams(d)
  if (params === null) throw new Error(`${name}: not a spine seed`)
  if (d.seed === undefined) throw new Error(`${name}: the dev seed carries no engine seed`)
  const wire = runEngine(params, d.seed, { bandFan: true, survivorConditioned: true, healthReadout: true })
  if (wire.kind !== 'resolved' || wire.healthReadout === undefined) throw new Error(`${name}: no health readout on the wire`)
  return wire.healthReadout
}
const factOf = (view: ReturnType<typeof composeHealthSheet>, id: string) => view.facts.find((f) => f.id === id)

/** THE CROSSING PRICE (the register's Tier 0 *The Medicare step card prices crossing the next surcharge
 *  step at 2026 prices…*): both seeds sit under tier 1, so the card's per-person delta is the WHOLE tier-1
 *  surcharge the engine bills in the bill year (the anchor row's MAGI year + the look-back) — derived here
 *  from the READ Trustees rows by `Math.pow`, outside the engine (DND 012): Part B = the pinned 2026 tier-1
 *  surcharge × V.E2(bill) ÷ the 2026 standard premium (the cost-share identity), Part D = V.E4(bill)[tier 1];
 *  both deflated to 2026 dollars by the near-term CPI. Returns the card's two strings at its $100 grain. */
const tier1CrossingAt = (billYear: number): { each: string; both: string } => {
  const t = medicareCostTrend.value
  const deflator = Math.pow(1 + t.cpiNearTermAvg, billYear - t.anchorYear)
  const partB = (irmaa.value.tiers[0]!.partBSurchargeMonthly * t.premiums.find((r) => r.calendarYear === billYear)!.nominalMonthly) /
    partB2026.value.standardPremiumMonthly
  const partD = t.partDIrmaa.find((r) => r.calendarYear === billYear)!.addOnsMonthly[0]!
  const perPersonYear = ((partB + partD) / deflator) * 12
  const fmt = (v: number) => (Math.round(v / 100) * 100).toLocaleString('en-US')
  return { each: fmt(perPersonYear), both: fmt(perPersonYear * 2) }
}

describe('the Medicare premium card on the shipped seeds, through the real engine', () => {
  it('`retired` (66/65): everyone enrolled from the first billed year → the era IS the anchor → the one-figure card framed as the era’s first year, "start at" and dated (here "Around 2026" — both enrolled today, distance 0; since 2026-10-15, b9-toronto3) + the base-rate line + the singular extras carve-out (2,640 → 2,600) (base 4,870 → 4,900; MAGI 90,129 → 90,100; the 2026-MAGI line 232,000 [2 × round1000(109,000 × 1.032²) — the 2028 bill’s, TWO Augusts past the lines’ August-2025 base, in 2026 dollars]; headroom 141,871 → 141,900; the two-of-you step, priced at the 2028 BILL’s scales: 99.66/mo per person → 1,196 → 1,200 each, 2,392 → 2,400 for two — the 2026 anchor’s 95.7 read 1,100 / 2,300)', () => {
    const readout = readoutOf('retired')
    expect(medicareEraYear(readout, 2)).toBe(medicareAnchor(readout))
    const view = composeHealthSheet(readout, DEV_SEEDS.retired, FRESH, pricedStateForRun(DEV_SEEDS.retired))
    // The extras, derived from the seed's OWN fork entries (DND 012 — never the composer's read): Alex's
    // entered $220/mo + Sam's affirmed none → 220 × 12 = 2,640 a year → '2,600'. One law for every arm
    // (2026-10-15): this card never renders (`retired` has no pre-65 member, so no Healthcare door), but
    // its composition speaks the carve-out AND the first-year frame like every other two-person card. The
    // date, derived outside the composer: both 65+ in the start year, so the first bill is row 1 → 2026,
    // distance 0 → "Around 2026".
    expect(DEV_SEEDS.retired.medicareExtrasByPerson).toEqual([{ kind: 'entered', monthly: 220 }, { kind: 'none' }])
    expect(medicareAnchor(readout)?.medicareExtrasP50).toBeCloseTo(220 * 12, 6)
    expect(medicareAnchor(readout)?.yearsFromNow).toBe(1)
    expect(factOf(view, 'medicare')).toEqual({
      id: 'medicare',
      eyebrow: copy.healthFactMedicareBoth,
      figure: slots.healthFigPerYear('4,900'),
      lines: [
        copy.irmaaStepStory,
        slots.irmaaStepEraStart('4,900', 0, 2026),
        copy.irmaaStepOnRampBase,
        copy.irmaaStepTrendNoteOne,
        slots.irmaaStepExtrasAddOne('2,600'),
      ],
    })
    expect(factOf(view, 'step')).toEqual({
      id: 'step',
      eyebrow: copy.healthFactStep,
      figure: slots.healthFigStepAdd('2,400'),
      lines: [slots.irmaaStepNext('232,000', '90,100', '141,900', '1,200', '2,400', true)],
    })
    expect(tier1CrossingAt(2028), 'the literals above ARE the Trustees-row derivation for the 2028 bill').toEqual({ each: '1,200', both: '2,400' })
  })

  it('`healthnc` (61/59): the anchor is year 5 with ONE enrolled (2,703), the era is year 7 with two (5,765) → the loud figure 5,800, the on-ramp 2,700 over two years, neither surcharged, the extras spoken per quoted year (5,856 → 5,900 once both are on it; 2,928 → 2,900 while one is) — and the step card keeps the anchor (MAGI 46,078 → the each-of-you arm; 46,020 before the NC standard deduction was deflated per sim year, 2026-09-25) against the line its MAGI year (2030) meets: 2 × round1000(109,000 × 1.032⁶) ÷ 1.032⁴ = 232,748 → 232,700 (SIX Augusts past the August-2025 base); headroom 186,670 → 186,700; the crossing priced at the 2032 BILL’s scales (past the IRA §11201 Part D reset): 140.59/mo per person → 1,687 → 1,700 each, 3,374 → 3,400 for two — the 2026 anchor’s 95.7 read 1,100 / 2,300, ~35 % low', () => {
    const readout = readoutOf('healthnc')
    const anchor = medicareAnchor(readout)
    const era = medicareEraYear(readout, 2)
    expect(anchor?.yearsFromNow).toBe(5)
    expect(anchor?.medicareEnrolledP50).toBe(1)
    expect(era?.yearsFromNow).toBe(7)
    expect(era?.medicareEnrolledP50).toBe(2)
    const view = composeHealthSheet(readout, DEV_SEEDS.healthnc, FRESH, pricedStateForRun(DEV_SEEDS.healthnc))
    expect(factOf(view, 'medicare')).toEqual({
      id: 'medicare',
      eyebrow: copy.healthFactMedicareBoth,
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
    expect(factOf(view, 'step')).toEqual({
      id: 'step',
      eyebrow: copy.healthFactStep,
      figure: slots.healthFigStepAddEach('1,700'),
      lines: [slots.irmaaStepNext('232,700', '46,100', '186,700', '1,700', '3,400', false)],
    })
    expect(tier1CrossingAt(2032), 'the literals above ARE the Trustees-row derivation for the 2032 bill').toEqual({ each: '1,700', both: '3,400' })
  })

  it('`healthgap` (61/40 — the wide-gap witness, council wf_9921d7e3-55b): the enrolled median is NON-MONOTONIC (one at 25, two at 26, one at 27 — the elder gone on the median path), the era arm fires on that one-year window by the bare first-crossing rule the council KEPT, the hero is framed by its eyebrow, the on-ramp span reads 21 years', () => {
    const readout = readoutOf('healthgap')
    const at = (yearsFromNow: number) => readout.byYear.find((y) => y.yearsFromNow === yearsFromNow)!
    expect(medicareAnchor(readout)?.yearsFromNow).toBe(5)
    expect(at(5).medicareEnrolledP50).toBe(1)
    // The blip, pinned: the both-enrolled median window is exactly year 26.
    expect(at(25).medicareEnrolledP50).toBe(1)
    expect(at(26).medicareEnrolledP50).toBe(2)
    expect(at(27).medicareEnrolledP50).toBe(1)
    const era = medicareEraYear(readout, 2)
    expect(era?.yearsFromNow).toBe(26)
    const view = composeHealthSheet(readout, DEV_SEEDS.healthgap, FRESH, pricedStateForRun(DEV_SEEDS.healthgap))
    const fact = factOf(view, 'medicare')!
    expect(fact.eyebrow).toBe(copy.healthFactMedicareBoth)
    expect(fact.figure).toBe(slots.healthFigPerYear('8,100'))
    expect(fact.lines[1]).toBe(slots.irmaaStepEraStart('8,100', 25, 2051))
    expect(fact.lines[2]).toBe(slots.irmaaStepOnRampSpan(21, '2,700', 4, 2030))
    expect(fact.lines[3], 'the ONE basis clause — why this pair is 3× while the extras pair is 2× (Briggsy 2026-09-24)').toBe(copy.irmaaStepEraTrendNote)
    expect(fact.lines[4]).toBe(copy.irmaaStepBothBase)
    expect(fact.lines[5]).toBe(slots.irmaaStepExtrasAddBoth('5,900', '2,900'))
  }, 120_000)

  it('`healthss` (62/62 — a pre-65 couple who reach 65 the SAME year, the one door-bearing seed on the one-figure arm): both enrolled from the first billed year → the era IS the anchor → the one-figure hero framed as the era’s FIRST year — DATED and "start at" (the register’s Tier 0 *The one-figure Medicare card quotes the cheapest Medicare year as every year…*: "In your plan’s Medicare years … about ~$5,200" while the run’s two-of-you years rise to ~$7,700 in today’s dollars by 2047) — and the drug-and-supplement carve-out SPOKEN under it (the register’s Tier 0 *The Medicare premium card on a couple who reach 65 the same year drops the drug-and-supplement line…*)', () => {
    const readout = readoutOf('healthss')
    const anchor = medicareAnchor(readout)
    expect(anchor?.medicareEnrolledP50, 'both enrolled in the first billed year — read off the wire, never re-derived from ages').toBe(2)
    expect(medicareEraYear(readout, 2)).toBe(anchor)
    // The DATE, derived OUTSIDE the composer (DND 012): both are 62 in the seed's start year, so both turn 65
    // three calendar years in — 2026 + 3 = 2029, "about three years from now". On the wire that bill is row 4
    // (row k = the END of sim-year k − 1, the C4 clock), and the anchor must land there.
    const [a, b] = DEV_SEEDS.healthss.people.map((p) => p.currentAge)
    expect([a, b, DEV_SEEDS.healthss.startCalendarYear]).toEqual([62, 62, 2026])
    expect(anchor?.yearsFromNow, 'the first billed year is the 65th birthday year — row 4').toBe(65 - 62 + 1)
    // The extras, derived OUTSIDE the composer (DND 012): `healthss` leaves the extras field ABSENT, which the
    // intake funds at the typical figure per enrolled person (`medicareExtrasTypicalMonthly` — CMS's 2026 Part D
    // base beneficiary premium + the Medigap Plan G anchor), × 12 × the two enrolled.
    expect(DEV_SEEDS.healthss.medicareExtrasByPerson).toBeUndefined()
    const typicalYearForTwo = medicareExtrasTypicalMonthly() * 12 * 2
    expect(anchor?.medicareExtrasP50).toBeCloseTo(typicalYearForTwo, 6)
    const extrasF = (Math.round(typicalYearForTwo / 100) * 100).toLocaleString('en-US')
    expect(extrasF, 'the literal the walk quoted').toBe('5,900')
    const view = composeHealthSheet(readout, DEV_SEEDS.healthss, FRESH, pricedStateForRun(DEV_SEEDS.healthss))
    expect(factOf(view, 'medicare')).toEqual({
      id: 'medicare',
      // The frame word agrees with the sentence beneath ("while you're both on …") — never a third frame.
      eyebrow: copy.healthFactMedicareBoth,
      figure: slots.healthFigPerYear('5,200'), // ⚑ never the extras folded in (the 2026-09-14 "eyebrow" ruling); the figure stays the anchor year's
      lines: [
        copy.irmaaStepStory,
        slots.irmaaStepEraStart('5,200', 3, 2029),
        copy.irmaaStepOnRampBase,
        copy.irmaaStepTrendNoteOne, // his clause (2026-10-16): the basis AND the direction — "start at" alone read as WHEN
        slots.irmaaStepExtrasAddOne(extrasF),
      ],
    })
    // The sentences the walk reads, as literals — the slots above are the composer's own producers, so a
    // reworded slot would pass a slot-built expectation; these cannot.
    const lines = factOf(view, 'medicare')!.lines
    expect(lines[1]).toBe(
      'About three years from now, around 2029, while you’re both on Medicare, Part B premiums and any income surcharge start at about ~$5,200 a year for your household.',
    )
    expect(lines[2]).toBe('That would be the base rate, with no income surcharge on the middle-of-the-road path.')
    expect(lines[3]).toBe('Even in today’s dollars, each person’s Part B premium is likely to keep rising.')
    expect(lines[4]).toBe(
      'That figure doesn’t count what you’d pay for drug and supplement plans, which the lines below add at about ~$5,900 a year.',
    )
    // THE DEFECT, pinned on the engine's own run: the anchor year is the two-of-you era's CHEAPEST quotable
    // year — every later two-of-you year on the median path bills at least as much (the sourced real Part B
    // escalator), so an undated "in your plan's Medicare years … about" frame is the rosier read. A
    // re-sourced trend that ever made a later both-enrolled year CHEAPER reds this, and the "start at" frame
    // would then need a council, not a re-pin.
    const anchorTotal = anchor!.medicareBaseP50 + anchor!.irmaaSurchargeP50
    const laterBoth = quotableYears(readout).filter(
      (y) => y.yearsFromNow > anchor!.yearsFromNow && y.medicareEnrolledP50 >= 2,
    )
    expect(laterBoth.length, 'the era spans many quotable years').toBeGreaterThan(10)
    expect(Math.min(...laterBoth.map((y) => y.medicareBaseP50 + y.irmaaSurchargeP50))).toBeGreaterThanOrEqual(anchorTotal)
    // The pre-fix sentence never renders on this seed.
    expect(lines).not.toContain(slots.irmaaStepNowBase('5,200'))
  }, 120_000)
})

/** THE CONVERSION TILE ON THE PRICED SEEDS (the register's Tier 0 "The health sheet's "about 22¢ all
 *  told" leaves out the North Carolina tax the run itself charges") — the real pipeline end to end:
 *  `pricedStateForRun` (the run's own decision, the sheet's `statePricedNote`) → composeHealthSheet.
 *  `healthnc` and `healthgap` are the only shipped seeds that render this tile AND price a state: `nc`
 *  / `pa` / `fl` spread the all-65+ `retired` couple (no pre-65 member → no Healthcare door, no ACA
 *  anchor) and `datenc` rides the date route (no readout on the wire). Both priced seeds anchor at
 *  yearsFromNow 1 — calendar 2026, ages 61/59 (healthgap 61/40) — on the SAME engine median AGI,
 *  66,031.95, and `health` (their state-absent twin) at 65,124.64. Hand-derived (DND 012), never read
 *  off the composer: federal — 66,032 − 32,200 = 33,832 taxable (no 65+ member), inside the MFJ 12 %
 *  band (24,800–100,800); `health` 65,125 − 32,200 = 32,925, the same band. Drag — 66,032 ÷ 21,150 =
 *  3.12 × FPL (healthgap identical; `health` 3.08), the flat 9.96 % band (300–400 %), the credit live
 *  (16,800 − 0.0996 × 66,032 = 10,223 > 0) → 9.96¢. NC — the 2026 step of S.L. 2026-41 § 44.1(a),
 *  3.99 %, on a base far above the $25,500 MFJ standard deduction (price index 1 in 2026; Social
 *  Security unclaimed until 67, so the base is the whole AGI) → 3.99¢. All told: 12 + 9.96 + 3.99 =
 *  25.95 → 26¢ — the sheet shipped 22¢ until this unit; the twin keeps 12 + 9.96 = 21.96 → 22¢. */
describe('the conversion tile on the priced seeds, through the real engine', () => {
  it('`healthnc` and `healthgap` (NC-priced) read 26¢ all told; their unpriced twin `health` keeps 22¢', () => {
    for (const name of ['healthnc', 'healthgap'] as const) {
      expect(pricedStateForRun(DEV_SEEDS[name]), `${name}: the run prices NC`).toBe('NC')
      const readout = readoutOf(name)
      expect(acaAnchor(readout)?.yearsFromNow, `${name}: the anchor is calendar 2026`).toBe(1)
      const view = composeHealthSheet(readout, DEV_SEEDS[name], FRESH, pricedStateForRun(DEV_SEEDS[name]))
      expect(factOf(view, 'conversion'), name).toEqual({
        id: 'conversion',
        eyebrow: copy.healthFactConversion,
        figure: slots.healthFigCents(26),
        lines: [slots.shadowRateLine(26)],
      })
    }
    expect(pricedStateForRun(DEV_SEEDS.health), 'the twin prices no state').toBeUndefined()
    const twin = composeHealthSheet(readoutOf('health'), DEV_SEEDS.health, FRESH, pricedStateForRun(DEV_SEEDS.health))
    expect(factOf(twin, 'conversion')?.figure).toBe(slots.healthFigCents(22))
  }, 120_000)
})

/** THE EARLY-CLAIM WITNESS (the register's Tier 0 "The health sheet's conversion tile prices the federal
 *  tax at the bare bracket rate — …") — the real pipeline end to end on `healthss`, the one shipped seed
 *  whose ACA anchor year draws a benefit. Hand-derived (DND 012), never read off the composer: the anchor
 *  is yearsFromNow 1 (calendar 2026, both 62). The benefit: a $28,000 and a $22,000 PIA claimed 60 months
 *  before FRA 67, 30 % off (36 × 5/9 % + 24 × 5/12 %), dime-floored monthly (POMS RS 00615.101) —
 *  1,633.30 + 1,283.30 = 2,916.60 × 12 = 34,999.20. On the engine's median AGI, 54,669: the other income
 *  O solves O + 6,000 + 0.85 × (O + 17,499.60 − 44,000) = 54,669 → O ≈ 38,483, provisional ≈ 55,983 — the
 *  85 % phase, under the 85 %-of-benefit cap (16,185 < 29,749). Taxable 54,669 − 32,200 = 22,469, the 10 %
 *  band → federal 0.10 × 1.85 = 18.5¢. Drag: the ACA MAGI 73,482 ÷ 21,150 = 3.47 × FPL, the flat 9.96 %
 *  band, the credit live (16,800 − 0.0996 × 73,482 = 9,481 > 0) → 9.96¢. All told 28.46 → 28¢; the bare
 *  bracket read 10 + 9.96 = 19.96 → 20¢. */
describe('the conversion tile on the early-claim seed, through the real engine', () => {
  it('`healthss` (both 62, both claiming at 62) reads 28¢ all told — the benefit a converted dollar pulls into tax, priced (the bare bracket read 20¢)', () => {
    expect(pricedStateForRun(DEV_SEEDS.healthss), 'no priced state — the move is federal alone').toBeUndefined()
    const readout = readoutOf('healthss')
    const anchor = acaAnchor(readout)
    expect(anchor?.yearsFromNow, 'the anchor is calendar 2026').toBe(1)
    expect(anchor?.ssBenefitP50, 'the anchor year’s benefit: two dime-floored 62-claims').toBeCloseTo(34_999.2, 6)
    // The derivation's bands, asserted on the wire, so an engine drift that leaves one reds HERE with its
    // reason rather than as a bare cents mismatch. AGI inside the 10 % band (32,200 + 24,800 = 57,000) and
    // past the 85 % line: provisional clears 44,000 exactly when O > 44,000 − 17,499.60 = 26,500.40, i.e.
    // AGI > 26,500.40 + 6,000 = 32,500.40 — and the cap (0.85 × 34,999.20 = 29,749.32) first binds at
    // provisional 71,940, an AGI near 84,190, far above 57,000. The ACA MAGI in the flat band, under the cliff.
    expect(anchor!.irmaaMagiP50).toBeGreaterThan(32_500.4)
    expect(anchor!.irmaaMagiP50).toBeLessThan(57_000)
    expect(anchor!.acaMagiP50).toBeGreaterThan(3 * 21_150)
    expect(anchor!.acaMagiP50).toBeLessThan(84_600)
    const view = composeHealthSheet(readout, DEV_SEEDS.healthss, FRESH, pricedStateForRun(DEV_SEEDS.healthss))
    expect(factOf(view, 'conversion')).toEqual({
      id: 'conversion',
      eyebrow: copy.healthFactConversion,
      figure: slots.healthFigCents(28),
      lines: [slots.shadowRateLine(28)],
    })
  }, 120_000)
})
