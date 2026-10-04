/**
 * U16 §S1 — the live solve anchor deriver (`solver/solveAnchor.ts`): the `SimulationParams →
 * ConversionAnchorContext → CandidateSet` path that was the recorded blocker (no shipped producer
 * derived the anchor from live params). These prove the year-0 committed skeleton + the income rails
 * are SOURCE-BOUND to the same shipped seams the engine's own year-0 iteration reads — the ONE LAW.
 *
 * Committed-income expectations are INDEPENDENT (DND 012): ages/claim-ages are chosen so SS, RMD, and
 * ongoing-taxable land on plainly-derivable values (a factor-1 claim, a pre-RMD age, no income). The
 * rail assertions are WIRING checks (anchor.rail === the shipped rail function's own output) — that the
 * anchor CALLS `cliffMagiFor`/`irmaa`/`selectRmdDivisor`, never a re-typed threshold.
 */
import { describe, expect, it } from 'vitest'
import { expandRothConversion, type SimulationParams } from '@shared/model'
import { committedIncomeForYear, deriveConversionAnchor, conversionWindowFor, enumerateSolveCandidates } from '../solveAnchor'
import { applyCandidate, sameDecumulationPlan, solverCandidateId } from '../candidates'
import { cliffMagiFor, taxableIncomeAtFill } from '@engine/magiLandscape'
import { fplForHousehold } from '@engine/healthOverlay'
import {
  acaApplicablePercentage,
  age65AdditionMFJ,
  irmaa,
  medicareCostTrend,
  ordinaryBracketsMFJ,
  seniorBonus,
  standardDeductionMFJ,
} from '@engine/constants'
import { cumulativePriceIndex } from '@engine/priceIndex'
import { selectRmdDivisor } from '@engine/rmd'

const MARKET = {
  stock: { mean: 0.04, stdDev: 0.12 },
  bond: { mean: 0.015, stdDev: 0.05 },
  inflation: { mean: 0.03, stdDev: 0.041 },
  stockBondCorrelation: 0,
  space: 'simple' as const,
  returnsAreReal: true,
}

/** A retired couple, startYear 2027 so the entered ages equal `startCalendarYear − birthYear`. */
function baseRetired(over?: {
  readonly people?: SimulationParams['people']
  readonly overlay?: Partial<NonNullable<SimulationParams['overlay']>>
}): SimulationParams {
  return {
    initialPortfolio: 900_000,
    annualSpendingReal: 70_000,
    stockWeight: 0.5,
    people: over?.people ?? [
      // Alex: 67, claims AT FRA-67 (born 1960 ⇒ FRA 67) ⇒ own factor 1 ⇒ ownAnnual = PIA exactly.
      { sex: 'female', currentAge: 67, birthYear: 1960, retirementAge: 65, earnedIncomeReal: 0, pia: 30_000, socialSecurityClaimAge: 67 },
      // Sam: 62, has NOT claimed (62 < 67) ⇒ contributes 0 own + 0 spousal-excess (gate not open).
      { sex: 'male', currentAge: 62, birthYear: 1965, retirementAge: 60, earnedIncomeReal: 0, pia: 20_000, socialSecurityClaimAge: 67 },
    ],
    survivorSpendingRatio: 0.75,
    drawdownPolicy: 'proportional',
    market: MARKET,
    paths: 256,
    maxHorizonYears: 40,
    longevityMode: 'sampled',
    overlay: {
      taxEnabled: true,
      rmdEnabled: true,
      startCalendarYear: 2027,
      buckets: { taxable: 200_000, pretax: 600_000, roth: 100_000 },
      pretaxByPerson: [600_000, 0],
      initialTaxableBasis: 150_000,
      filing: 'mfj',
      ...over?.overlay,
    },
  }
}

describe('deriveConversionAnchor — the year-0 committed skeleton (source-bound, DND 012)', () => {
  it('derives committed income from params: factor-1 SS, no RMD (pre-75), no income', () => {
    const anchor = deriveConversionAnchor(baseRetired())
    expect(anchor).not.toBeNull()
    if (anchor === null) throw new Error('unreachable')
    // Alex claimed at FRA-67 ⇒ ownAnnual = PIA = 30,000 exactly; Sam unclaimed ⇒ 0; Alex is the higher
    // earner ⇒ her own spousal excess is 0. Independent of the SS sub-engine's internals.
    expect(anchor.committed.ssBenefit).toBe(30_000)
    expect(anchor.committed.rmd).toBe(0) // 67 / 62 both below their birth-year RMD start age
    expect(anchor.rmdAtStart).toBe(0)
    expect(anchor.committed.ongoingTaxable).toBe(0) // no income streams
    expect(anchor.committed.conversion).toBe(0) // the baseline skeleton
    expect(anchor.committed.filing).toBe('mfj')
    expect(anchor.committed.count65).toBe(1) // Alex 67 ≥ 65; Sam 62 < 65
    expect(anchor.committed.calendarYear).toBe(2027)
    expect(anchor.pretaxAvailableAtStart).toBe(600_000) // overlay.buckets.pretax
  })

  it('returns null for a tax-blind spine (no overlay — nothing to sequence)', () => {
    const { overlay: _drop, ...spine } = baseRetired()
    void _drop
    expect(deriveConversionAnchor(spine as SimulationParams)).toBeNull()
  })

  it('RMD at year 0 is source-bound to @engine/rmd (past the start age ⇒ pool ÷ the shipped divisor)', () => {
    // Alex 79 (born 1948, RMD start 72), sole pre-tax holder; Sam 74. rmd = pretaxByPerson ÷ the SAME
    // divisor selector the engine uses (>10yr gap here is false ⇒ ULT) — a WIRING assertion.
    const base = baseRetired({
      people: [
        { sex: 'female', currentAge: 79, birthYear: 1948, retirementAge: 65, earnedIncomeReal: 0, pia: 30_000, socialSecurityClaimAge: 70 },
        { sex: 'male', currentAge: 74, birthYear: 1953, retirementAge: 63, earnedIncomeReal: 0, pia: 20_000, socialSecurityClaimAge: 70 },
      ],
      overlay: { pretaxByPerson: [600_000, 0] },
    })
    const anchor = deriveConversionAnchor(base)!
    const expected = 600_000 / selectRmdDivisor(79, 74)
    expect(anchor.rmdAtStart).toBeCloseTo(expected, 6)
    expect(anchor.committed.rmd).toBeCloseTo(expected, 6)
  })
})

describe('deriveConversionAnchor — the income rails (the exact engine pricing predicates)', () => {
  it('ACA-cliff rail: active for a pre-65 member with a priced premium ⇒ cliffMagiFor(activeTable, fpl(2))', () => {
    const base = baseRetired({
      people: [
        { sex: 'female', currentAge: 60, birthYear: 1967, retirementAge: 58, earnedIncomeReal: 0, pia: 20_000, socialSecurityClaimAge: 67 },
        { sex: 'male', currentAge: 62, birthYear: 1965, retirementAge: 60, earnedIncomeReal: 0, pia: 24_000, socialSecurityClaimAge: 67 },
      ],
      overlay: {
        healthcareEnabled: true,
        enrolledPremium: new Array<number>(40).fill(14_400),
        slcsp: new Array<number>(40).fill(13_200),
      },
    })
    const anchor = deriveConversionAnchor(base)!
    // Both pre-65, standard (non-enhanced) regime ⇒ the cliff exists; wired to the shipped rail.
    expect(anchor.acaCliffMagi).toBe(cliffMagiFor(acaApplicablePercentage.value, fplForHousehold(2)))
  })

  it('IRMAA rail: active (the shipped schedule) for EVERY window MAGI year whose bill lands inside the horizon with someone enrolled', () => {
    // Alex 67 is enrolled at every bill; the window is the pre-RMD runway (8 years, 2027–2034), and every
    // bill (k + 2 ≤ 9) sits inside the 40-year horizon ⇒ all eight MAGI years are billed.
    const base = baseRetired({ overlay: { healthcareEnabled: true } })
    const anchor = deriveConversionAnchor(base)!
    expect(anchor.irmaa?.schedule).toBe(irmaa.value)
    const frames = anchor.irmaa!.billedYears
    expect(frames.map((f) => f.calendarYear)).toEqual([2027, 2028, 2029, 2030, 2031, 2032, 2033, 2034])
    // EACH billed year carries ITS OWN committed income (the council's frame hit, wf_71f675da-8cf): Alex
    // (67, FRA 67 ⇒ factor 1) draws his $30,000 PIA from year 0 ($2,500.00 a month); Sam (62) claims at 67
    // ⇒ from 2032 her own $20,000 PIA — $1,666.66… a month, dime-floored by SSA to $1,666.60 (POMS RS
    // 00615.101) ⇒ $19,999.20 a year (her spousal half of Alex's, $15,000, is under it ⇒ no excess).
    // Hand-derived from the claim ages and the dime rule, never from the SS sub-engine.
    const both = 30_000 + 19_999.2 // the engine's person order: Alex, then Sam
    expect(frames.map((f) => f.ssBenefit)).toEqual([30_000, 30_000, 30_000, 30_000, 30_000, both, both, both])
    expect(frames.map((f) => f.count65)).toEqual([1, 1, 1, 2, 2, 2, 2, 2]) // Sam turns 65 in 2030
    expect(frames.every((f) => f.rmd === 0 && f.ongoingTaxable === 0 && f.conversion === 0 && f.filing === 'mfj')).toBe(true)
    expect(frames[0]).toEqual(anchor.committed) // the anchor's own year IS the anchor skeleton
    expect(anchor.acaCliffMagi).toBeNull() // no enrolled premium / no pre-65 member
  })

  it('THE RETIRED WITNESS (the council’s frame hit, DND 012): Social Security from 2027 moves the tier-1 window point ~$46k under the first-year point', () => {
    // `retired`’s household (devSeeds): Alex 66 (born 1960, PIA $30,000) and Sam 65 (born 1961, PIA
    // $24,000), both claiming at 67 — FRA for both, so factor 1: $0 in 2026, $30,000 in 2027 (Alex), $54,000
    // from 2028 (Sam's spousal half, $15,000, is under her own). The window: the first RMD age is 75
    // (SECURE 2.0, born 1960+) ⇒ 75 − 66 = 9 years, 2026–2034.
    const base = baseRetired({
      people: [
        { sex: 'male', currentAge: 66, birthYear: 1960, retirementAge: 65, earnedIncomeReal: 0, pia: 30_000, socialSecurityClaimAge: 67 },
        { sex: 'female', currentAge: 65, birthYear: 1961, retirementAge: 63, earnedIncomeReal: 0, pia: 24_000, socialSecurityClaimAge: 67 },
      ],
      overlay: {
        startCalendarYear: 2026,
        healthcareEnabled: true,
        buckets: { taxable: 0, pretax: 1_120_000, roth: 0 },
        pretaxByPerson: [1_120_000, 0],
      },
    })
    expect(conversionWindowFor(base)).toEqual({ startYearOffset: 0, years: 9 })
    const ss = (y: number): number => (y === 2026 ? 0 : y === 2027 ? 30_000 : 54_000)
    expect(deriveConversionAnchor(base)!.irmaa!.billedYears.map((f) => f.ssBenefit)).toEqual(
      [2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033, 2034].map(ss),
    )
    // Tier 1's MFJ line per the statute's algebra (§1395r(i)(3)(C): 2× the single line; (i)(5): × CPI from
    // August 2025 to August of bill − 1, rounded to $1,000 on the single line) over the MAGI year's level.
    // The pinned 2026 single figure and the Trustees near-term rate are READ (the constants gate); the
    // algebra is typed here (every year here sits inside the rate's table).
    const r = medicareCostTrend.value.cpiNearTermAvg
    const single2026 = irmaa.value.tiers[0]!.singleMagiThreshold
    const line1 = (y: number): number =>
      (2 * Math.round((single2026 * (1 + r) ** (y + 1 - 2025)) / 1_000) * 1_000) / (1 + r) ** (y - 2026)
    // Above the §86 base the inclusion is capped at 85 % (§86(a)(2)) — IRMAA-MAGI = conversion + 0.85 × SS.
    const room = (y: number): number => line1(y) - 0.85 * ss(y)
    let tight = 2026
    for (let y = 2027; y <= 2034; y++) {
      // Sufficient for the cap: provisional income − the $44,000 MFJ adjusted base (§86(c)(2)) ≥ the benefit.
      expect(room(y) + 0.5 * ss(y) - 44_000, `§86 premise (${y})`).toBeGreaterThanOrEqual(ss(y))
      if (room(y) < room(tight)) tight = y
    }
    expect(tight).toBe(2034) // the window's lowest tier-1 line, with both benefits riding
    expect(Math.floor(room(tight))).toBeGreaterThan(185_000) // the council's ~185.7k
    expect(Math.floor(room(tight))).toBeLessThan(186_000)
    const rails = enumerateSolveCandidates(base)!.candidates.flatMap((c) =>
      c.anchoredRail?.kind === 'irmaa-step' && c.anchoredRail.threshold < 250_000 && c.policy === 'proportional'
        ? [{ amount: c.conversion!.annualAmountReal, rail: c.anchoredRail }]
        : [],
    )
    expect(rails).toHaveLength(2)
    const firstYear = rails.find((x) => x.rail.magiYear === 2026)!
    const windowPt = rails.find((x) => x.rail.magiYear === tight)!
    expect(firstYear.amount).toBe(Math.floor(line1(2026))) // $232,000: no benefit in 2026…
    expect(firstYear.rail.firstCrossingMagiYear).toBe(2027) // …and Alex's claim puts it over the next year
    expect(windowPt.amount).toBe(Math.floor(room(tight)))
    expect(windowPt.rail.firstCrossingMagiYear).toBeNull()
  })

  it('THE RETIRED BRACKET WITNESS (b9-5, DND 012): the senior bonus ends after 2028 and Social Security arrives in 2027 — the 24,800 and 100,800 edges keep their first-year points and gain the points that hold', () => {
    // The same `retired` household as above (start 2026, both 65+ ⇒ two 65+ additions and, through 2028,
    // two OBBBA bonuses; SS $0 / $30,000 / $54,000; no other income). Taxable = a + taxable SS − the stack:
    // SD + 2 × the 65+ addition + 2 × the per-person bonus (the statute's nominal $6,000 deflated by the
    // year's level, 2025–2028 only). Every figure READ from the constants; the algebra typed here.
    const base = baseRetired({
      people: [
        { sex: 'male', currentAge: 66, birthYear: 1960, retirementAge: 65, earnedIncomeReal: 0, pia: 30_000, socialSecurityClaimAge: 67 },
        { sex: 'female', currentAge: 65, birthYear: 1961, retirementAge: 63, earnedIncomeReal: 0, pia: 24_000, socialSecurityClaimAge: 67 },
      ],
      overlay: { startCalendarYear: 2026, buckets: { taxable: 0, pretax: 1_120_000, roth: 0 }, pretaxByPerson: [1_120_000, 0] },
    })
    const anchor = deriveConversionAnchor(base)!
    expect(anchor.window!.years.map((f) => f.calendarYear)).toEqual([2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033, 2034])
    expect(anchor.window!.years[0]).toBe(anchor.committed) // the skeleton IS the window's first frame
    const ss = (y: number): number => (y === 2026 ? 0 : y === 2027 ? 30_000 : 54_000)
    expect(anchor.window!.years.map((f) => f.ssBenefit)).toEqual(anchor.window!.years.map((f) => ss(f.calendarYear)))
    expect(cumulativePriceIndex(2026)).toBe(1) // the anchor year: the bonus is its nominal figure
    const stack = (y: number): number =>
      (standardDeductionMFJ.value as number) +
      2 * (age65AdditionMFJ.value as number) +
      (y <= seniorBonus.sunsetAfter! ? (2 * seniorBonus.value.perPerson65Plus) / cumulativePriceIndex(y) : 0)
    const [e1, e2] = (ordinaryBracketsMFJ.value as ReadonlyArray<{ upTo: number | null }>).map((b) => b.upTo)
    const points = (edge: number) =>
      enumerateSolveCandidates(base)!.candidates.flatMap((c) =>
        c.anchoredRail?.kind === 'bracket-edge' && c.anchoredRail.edge === edge && c.policy === 'proportional'
          ? [{ amount: c.conversion!.annualAmountReal, rail: c.anchoredRail }]
          : [],
      )
    // THE FIRST-YEAR POINTS (no benefit in 2026): edge + the 2026 stack — the register's 72,300 / 148,300 —
    // MAGI under the bonus's phase-out start, so the bonus is whole; Alex's claim puts both over in 2027.
    for (const e of [e1!, e2!]) {
      const first = points(e).find((p) => p.rail.calendarYear === 2026)!
      expect(first.amount, `edge ${e}`).toBe(Math.floor(e + stack(2026)))
      expect(first.amount, 'premise: under the phase-out start').toBeLessThan(seniorBonus.value.phaseOutStart.mfj)
      expect(first.rail.firstCrossingYear, `edge ${e}`).toBe(2027)
    }
    expect(points(e1!).find((p) => p.rail.calendarYear === 2026)!.amount).toBe(72_300)
    expect(points(e2!).find((p) => p.rail.calendarYear === 2026)!.amount).toBe(148_300)
    // THE 100,800 WINDOW POINT: above the §86 base the inclusion is the 85 % cap (premise checked), so each
    // year's room is edge + stack(y) − 0.85 × SS(y); the least is from 2029 (no bonus, both benefits) — the
    // earliest on a tie.
    const room = (y: number): number => e2! + stack(y) - 0.85 * ss(y)
    let tight = 2026
    for (let y = 2027; y <= 2034; y++) {
      expect(room(y) + 0.5 * ss(y) - 44_000, `§86 premise (${y})`).toBeGreaterThanOrEqual(ss(y))
      if (room(y) < room(tight)) tight = y
    }
    expect(tight).toBe(2029)
    const windowPt = points(e2!).find((p) => p.rail.firstCrossingYear === null)!
    expect(windowPt.amount).toBe(Math.floor(room(tight))) // $90,400 — $57,900 under the first-year point
    expect(windowPt.rail.calendarYear).toBe(tight)
    // THE 24,800 WINDOW POINT rides the Pub-915 RAMP (its provisional income is under the 85 % cap), so its
    // exact dollar is the engine's: pinned by the JUST-UNDER LAW in its binding year and HOLDING in every
    // window year, through the shipped metric.
    const low = points(e1!).find((p) => p.rail.firstCrossingYear === null)!
    const taxableAt = (y: number, a: number): number =>
      taxableIncomeAtFill({ ...anchor.window!.years.find((f) => f.calendarYear === y)!, conversion: a }, 0)
    for (const f of anchor.window!.years) expect(taxableAt(f.calendarYear, low.amount), `holds in ${f.calendarYear}`).toBeLessThanOrEqual(e1!)
    expect(taxableAt(low.rail.calendarYear, low.amount + 2)).toBeGreaterThan(e1!)
    expect(low.amount).toBeLessThan(72_300 - 30_000) // the senior bonus AND the benefits, both off the table
  })

  it('ACA-cliff rail across the window: priced in each year by the engine’s own predicate — a living pre-65 member + a premium THAT year — and Social Security inside the priced years binds a window point', () => {
    // Born 1967 / 1965, start 2027: the elder turns 65 in 2030, the younger in 2032 ⇒ a pre-65 member
    // lives 2027–2031. The window runs to the first RMD age (the elder's 75 ⇒ 13 years, 2027–2039).
    const base = baseRetired({
      people: [
        { sex: 'female', currentAge: 60, birthYear: 1967, retirementAge: 58, earnedIncomeReal: 0, pia: 20_000, socialSecurityClaimAge: 67 },
        // The elder claims at 63 (2028) — a benefit arriving INSIDE the priced years.
        { sex: 'male', currentAge: 62, birthYear: 1965, retirementAge: 60, earnedIncomeReal: 0, pia: 24_000, socialSecurityClaimAge: 63 },
      ],
      overlay: {
        healthcareEnabled: true,
        enrolledPremium: new Array<number>(40).fill(14_400),
        slcsp: new Array<number>(40).fill(13_200),
        pretaxByPerson: [300_000, 300_000],
      },
    })
    const anchor = deriveConversionAnchor(base)!
    const cliff = cliffMagiFor(acaApplicablePercentage.value, fplForHousehold(2))
    expect(anchor.acaCliffMagi).toBe(cliff)
    expect(anchor.window!.years).toHaveLength(13)
    expect(anchor.window!.acaPricedYears).toEqual([2027, 2028, 2029, 2030, 2031])
    // ACA-MAGI is linear (the whole benefit, no Pub-915 coupling): each priced year's room is the cliff less
    // that year's committed ACA-MAGI — here the benefit alone. WIRING: the frames are the engine's seam.
    const priced = anchor.window!.years.filter((f) => anchor.window!.acaPricedYears.includes(f.calendarYear))
    expect(priced[0]!.ssBenefit).toBe(0)
    expect(priced[1]!.ssBenefit).toBeGreaterThan(0) // the elder's claim lands in 2028
    const aca = enumerateSolveCandidates(base)!.candidates.flatMap((c) =>
      c.anchoredRail?.kind === 'aca-cliff' && c.policy === 'proportional' ? [{ amount: c.conversion!.annualAmountReal, rail: c.anchoredRail }] : [],
    )
    expect(aca).toHaveLength(2)
    const first = aca.find((p) => p.rail.calendarYear === 2027)!
    expect(first.amount).toBe(Math.floor(cliff!))
    expect(first.rail.firstCrossingYear).toBe(2028)
    const maxBenefit = Math.max(...priced.map((f) => f.ssBenefit))
    const windowPt = aca.find((p) => p.rail.firstCrossingYear === null)!
    expect(windowPt.amount).toBe(Math.floor(cliff! - maxBenefit))
    // No year after 2031 binds it: the 2032+ benefits are the younger's own claim — unpriced years.
    expect(windowPt.rail.calendarYear).toBeLessThanOrEqual(2031)
  })

  it('committedIncomeForYear refuses an RMD year and a year off the horizon — the window never reaches one', () => {
    const base = baseRetired() // Alex 67 (born 1960) reaches 75 in sim year 8
    expect(() => committedIncomeForYear(base, 8)).toThrow(/RMD start age/)
    expect(() => committedIncomeForYear(base, 7)).not.toThrow()
    expect(() => committedIncomeForYear(base, 40)).toThrow(/horizon/)
    expect(() => committedIncomeForYear(base, -1)).toThrow(/horizon/)
  })

  it('IRMAA rail, MID-WINDOW ENROLLMENT (the verify pass’s missed scope): both 60 at start ⇒ billed from the year a bill first meets someone at 65', () => {
    // Both born 1967, start 2027: the window runs to the first RMD age (75 ⇒ 15 years, 2027–2041); a MAGI
    // year y bills in y + 2, and someone is 65 at that bill from y = 2030 (1967 + 65 − 2). The old gate
    // read year 0's bill alone (nobody 65 in 2029) and dropped the whole IRMAA walk — for the 12 years
    // that DO bill.
    const base = baseRetired({
      people: [
        { sex: 'female', currentAge: 60, birthYear: 1967, retirementAge: 58, earnedIncomeReal: 0, pia: 20_000, socialSecurityClaimAge: 67 },
        { sex: 'male', currentAge: 60, birthYear: 1967, retirementAge: 58, earnedIncomeReal: 0, pia: 24_000, socialSecurityClaimAge: 67 },
      ],
      overlay: { healthcareEnabled: true, pretaxByPerson: [300_000, 300_000] },
    })
    expect(conversionWindowFor(base)).toEqual({ startYearOffset: 0, years: 15 })
    const anchor = deriveConversionAnchor(base)!
    const frames = anchor.irmaa!.billedYears
    expect(frames.map((f) => f.calendarYear)).toEqual([2030, 2031, 2032, 2033, 2034, 2035, 2036, 2037, 2038, 2039, 2040, 2041])
    // Both claim at 67 (2034): her own $20,000 PIA, dime-floored monthly to $1,666.60 ⇒ $19,999.20 (POMS
    // RS 00615.101; her spousal half, $12,000, is under it), + the higher earner's $24,000 ($2,000.00 a
    // month, exact) — nothing before 2034.
    const both = 19_999.2 + 24_000 // the engine's person order: her, then him
    expect(frames.map((f) => f.ssBenefit)).toEqual([0, 0, 0, 0, both, both, both, both, both, both, both, both])
    // …and the live roster now carries IRMAA-anchored conversions, every one binding in a billed year, and
    // at least one per roster that adds no crossing in any billed year.
    const set = enumerateSolveCandidates(base)!
    const irmaaRails = set.candidates.flatMap((c) => (c.anchoredRail?.kind === 'irmaa-step' ? [c.anchoredRail] : []))
    expect(irmaaRails.length).toBeGreaterThan(0)
    expect(irmaaRails.every((r) => r.magiYear >= 2030)).toBe(true)
    expect(irmaaRails.some((r) => r.firstCrossingMagiYear === null)).toBe(true)
  })

  it('IRMAA rail: a bill past the horizon is NOT billed — the window is clamped to the horizon and so is the list', () => {
    // A 5-year horizon clamps the 8-year runway to 5 (2027–2031); a bill k + 2 must sit under 5 ⇒ k ≤ 2.
    const base = { ...baseRetired({ overlay: { healthcareEnabled: true } }), maxHorizonYears: 5 }
    const anchor = deriveConversionAnchor(base)!
    expect(anchor.irmaa?.billedYears.map((f) => f.calendarYear)).toEqual([2027, 2028, 2029])
  })

  it('IRMAA rail: null when no window year is billed (nobody reaches 65 at a bill inside the horizon)', () => {
    const base = {
      ...baseRetired({
        people: [
          { sex: 'female', currentAge: 50, birthYear: 1977, retirementAge: 50, earnedIncomeReal: 0, pia: 20_000, socialSecurityClaimAge: 67 },
          { sex: 'male', currentAge: 50, birthYear: 1977, retirementAge: 50, earnedIncomeReal: 0, pia: 24_000, socialSecurityClaimAge: 67 },
        ],
        overlay: { healthcareEnabled: true, pretaxByPerson: [300_000, 300_000] },
      }),
      maxHorizonYears: 10,
    }
    expect(deriveConversionAnchor(base)!.irmaa).toBeNull()
  })

  it('both rails null when healthcare is not priced (bracket-edge is still always enumerated)', () => {
    const anchor = deriveConversionAnchor(baseRetired())!
    expect(anchor.acaCliffMagi).toBeNull()
    expect(anchor.irmaa).toBeNull()
    // The window still rides (the bracket edges read it); no year prices ACA.
    expect(anchor.window!.acaPricedYears).toEqual([])
    expect(anchor.window!.years[0]).toBe(anchor.committed)
  })
})

describe('enumerateSolveCandidates — a valid live roster', () => {
  it('produces the conventional baseline + ≥1 anchored conversion + the user baseline', () => {
    const set = enumerateSolveCandidates(baseRetired())
    expect(set).not.toBeNull()
    if (set === null) throw new Error('unreachable')
    expect(set.candidates.some((c) => c.provenance === 'conventional-baseline')).toBe(true)
    expect(set.candidates.some((c) => c.conversion !== null)).toBe(true) // bracket-edge headroom exists
    expect(set.candidates.some((c) => c.provenance === 'user-baseline')).toBe(true)
  })

  // ── THE BASELINE ARM IS THE HOUSEHOLD'S OWN PLAN (the 2026-08-03 calm-but-wrong fix) ───────────
  //
  // The surface calls this arm "your plan today" in four shipped strings. Until this fix the injected
  // baseline was minted `conversion: null` unconditionally — there was no field in which a conversion
  // could even be expressed — so a household running the shipped Roth lever was measured against
  // their order with their conversion DELETED. These pin both halves of the repair, and the first is
  // the whole claim in one line: applying the baseline candidate must land back on the household's
  // own spine params, byte-for-byte.
  it("the user baseline REDUCES TO THE SPINE — applying it reproduces the household's own params exactly", () => {
    const plan = { annualAmountReal: 40_000, startYearOffset: 0, years: 5 }
    const base = baseRetired({ overlay: { conversions: expandRothConversion(plan, 40) } })
    const set = enumerateSolveCandidates(base, plan)
    if (set === null) throw new Error('unreachable')
    const user = set.candidates.find((c) => c.provenance === 'user-baseline')
    if (user === undefined) throw new Error('the user baseline is injected unconditionally')

    // (a) the plan RIDES the candidate — not `null`, and not a re-anchored grid amount.
    expect(user.conversion).toEqual(plan)
    // (b) …and it survives the shared apply seam as the household's own schedule. `toEqual(base)` is
    //     the load-bearing assertion: the arm on screen beside "your plan today" IS today's plan.
    //     (`drawdownPolicy` already matches; `applyCandidate` strips-then-re-expands the conversions.)
    expect(applyCandidate(base, user)).toEqual(base)
  })

  it('a household running NO conversion keeps the conversion-0 arm — absence, never a zero-fill', () => {
    const base = baseRetired()
    const set = enumerateSolveCandidates(base, undefined)
    if (set === null) throw new Error('unreachable')
    const user = set.candidates.find((c) => c.provenance === 'user-baseline')!
    expect(user.conversion).toBeNull()
    // Reduce-to-spine holds on this side too, and `conversions` is ABSENT rather than an all-zero
    // vector (the presence-keyed reduce-to-spine signal, model.ts's expander contract).
    const applied = applyCandidate(base, user)
    expect(applied).toEqual(base)
    expect('conversions' in applied.overlay!).toBe(false)
  })

  it('a plan entirely past the horizon is DROPPED — the same decision `intakeMap` makes, so no throw', () => {
    // `expandRothConversion` returns undefined for a window past the horizon, so `buildOverlay` writes
    // no `conversions` key at all. The seam must mirror that: carrying the plan here would hand
    // `applyCandidate` a conversion it refuses by contract (a loud throw on a live solve).
    const pastHorizon = { annualAmountReal: 40_000, startYearOffset: 40, years: 5 }
    expect(expandRothConversion(pastHorizon, 40)).toBeUndefined()
    const base = baseRetired() // no `conversions` on the overlay — exactly what buildOverlay produces
    const set = enumerateSolveCandidates(base, pastHorizon)
    if (set === null) throw new Error('unreachable')
    const user = set.candidates.find((c) => c.provenance === 'user-baseline')!
    expect(user.conversion).toBeNull()
    expect(() => applyCandidate(base, user)).not.toThrow()
  })

  it('the baseline arm is now IDENTIFIABLE by amount — the candidate id stops being always `:0`', () => {
    // `solverCandidateId` is `provenance:policy:amount`, and the run fingerprint serializes the
    // candidate's full fields. A converting baseline that still minted `:0` would collide in id with
    // the conversion-free arm it is no longer equivalent to.
    const plan = { annualAmountReal: 40_000, startYearOffset: 0, years: 5 }
    const base = baseRetired({ overlay: { conversions: expandRothConversion(plan, 40) } })
    const user = enumerateSolveCandidates(base, plan)!.candidates.find((c) => c.provenance === 'user-baseline')!
    expect(solverCandidateId(user)).toBe('baseline:proportional:40000')
    // …and it is NOT the same plan as its conversion-free twin (what `noChange` reads).
    const bare = enumerateSolveCandidates(baseRetired())!.candidates.find((c) => c.provenance === 'user-baseline')!
    expect(sameDecumulationPlan(user, bare)).toBe(false)
  })

  it('the pre-RMD conversion window: years = min runway to the first RMD start age, clamped ≥ 1', () => {
    // Alex 67 (RMD 75) ⇒ 8; Sam 62 (RMD 75) ⇒ 13 ⇒ min 8.
    expect(conversionWindowFor(baseRetired())).toEqual({ startYearOffset: 0, years: 8 })
    // A post-RMD household clamps to a 1-year window (still legal + headroom-filtered).
    const old = baseRetired({
      people: [
        { sex: 'female', currentAge: 79, birthYear: 1948, retirementAge: 65, earnedIncomeReal: 0, pia: 30_000, socialSecurityClaimAge: 70 },
        { sex: 'male', currentAge: 78, birthYear: 1949, retirementAge: 63, earnedIncomeReal: 0, pia: 20_000, socialSecurityClaimAge: 70 },
      ],
    })
    expect(conversionWindowFor(old)).toEqual({ startYearOffset: 0, years: 1 })
  })
})
