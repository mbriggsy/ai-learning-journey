/**
 * U14 S1 — the shared candidate enumerator.
 *
 * The expected dollars are HAND-COMPOSED from the canonical constants read via their
 * accessors (DND-012 — never from the enumerator's own output): in the SS-free worlds the
 * rail maps are LINEAR, so each anchor is exact arithmetic in the comment; the SS-coupled
 * IRMAA arm is pinned by the JUST-UNDER LAW instead (metric(a) ≤ rail < metric(a+2) — the
 * property the whole grid exists to satisfy), because its exact dollar rides the Pub-915
 * inclusion ramp the engine owns.
 */
import { describe, it, expect } from 'vitest'
import { DRAWDOWN_POLICIES } from '@shared/model'
import { age65AdditionMFJ, irmaa, medicareCostTrend, ordinaryBracketsMFJ, seniorBonus, standardDeductionMFJ } from '@engine/constants'
import { acaMagiAtFill, irmaaMagiAtFill, taxableIncomeAtFill, type CommittedYearIncome } from '@engine/magiLandscape'
import {
  anchoredConversionAmounts,
  applyCandidate,
  enumerateCandidates,
  solverCandidateId,
  CONVENTIONAL_POLICY,
  SEARCHED_POLICIES,
  type CandidateStrategy,
  type ConversionAnchorContext,
} from '../candidates'
import type { SimulationParams } from '@shared/model'
import { cumulativePriceIndex } from '@engine/priceIndex'
import { irmaaScheduleAsCompared, irmaaTierApplies } from '@engine/healthOverlay'

/** A post-sunset (2030), under-65, SS-free MFJ skeleton — every rail map is LINEAR here:
 *  no senior bonus (count65 0 AND calendar past 2028), no Pub-915 coupling (ssBenefit 0). */
const linearWorld: CommittedYearIncome = {
  rmd: 0,
  conversion: 0,
  ongoingTaxable: 50_000,
  ssBenefit: 0,
  filing: 'mfj',
  count65: 0,
  calendarYear: 2030,
}

const anchorWith = (over: Partial<ConversionAnchorContext>): ConversionAnchorContext => ({
  committed: linearWorld,
  acaCliffMagi: null,
  irmaa: null,
  pretaxAvailableAtStart: 10_000_000,
  rmdAtStart: 0,
  ...over,
})

describe('the searched-policy axis (supersession item 8)', () => {
  it('searches the FOUR named policies — custom stays the out-of-grid labeled baseline', () => {
    expect(SEARCHED_POLICIES).toEqual(['proportional', 'taxable-first', 'pre-tax-first', 'bracket-fill'])
    // Derived from the shipped 5-wide tuple, never re-typed:
    expect(DRAWDOWN_POLICIES).toHaveLength(5)
    expect(CONVENTIONAL_POLICY).toBe('taxable-first')
  })
})

describe('anchoredConversionAmounts — the cliff-anchored grid', () => {
  it('ACA cliff (linear world): amount = cliffMagi − baseline EXACTLY (hand arithmetic: 100k − 50k = 50k)', () => {
    // ACA-MAGI baseline = rmd 0 + conversion 0 + ongoing 50,000 + ss 0 = 50,000.
    const amounts = anchoredConversionAmounts(anchorWith({ acaCliffMagi: 100_000 }))
    const aca = amounts.filter((a) => a.rail.kind === 'aca-cliff')
    // No window rides ⇒ the skeleton's year alone binds, and a one-year rail adds no crossing.
    expect(aca).toEqual([{ amountReal: 50_000, rail: { kind: 'aca-cliff', magi: 100_000, calendarYear: 2030, firstCrossingYear: null } }])
  })

  it('a committed-over household yields NO ACA anchor (nothing discretionary fits under the cliff)', () => {
    const over: CommittedYearIncome = { ...linearWorld, ongoingTaxable: 120_000 }
    const amounts = anchoredConversionAmounts(anchorWith({ committed: over, acaCliffMagi: 100_000 }))
    expect(amounts.some((a) => a.rail.kind === 'aca-cliff')).toBe(false)
  })

  it('IRMAA steps (linear world, MAGI year 2030 → bill 2032): one anchor per line above baseline, each = the largest whole dollar with 50,000 + amount ≤ the last safe MAGI AS COMPARED', () => {
    // ssBenefit 0 ⇒ IRMAA-MAGI = ordinary = ongoing 50,000 + amount (no inclusion ramp). The lines are
    // hand-composed per §1395r(i)(5), the Augusts COUNTED from each base (insight 138 — never a quotient
    // of the index's clamped levels): nominal(2032) = round1000(single × (1 + r)ⁿ), n = August 2031 minus
    // the base — SIX for tiers 1–4 (base August 2025), FIVE for the top (re-indexed from August 2026) —
    // joint by the pinned ratio, over the MAGI year's price level index(2030); an INCLUSIVE line's last
    // safe MAGI is one NOMINAL dollar under it. The rate and the level are READ; the algebra is typed here.
    const schedule = irmaa.value
    const r = medicareCostTrend.value.cpiNearTermAvg
    const level = cumulativePriceIndex(2030)
    const amounts = anchoredConversionAmounts(anchorWith({ irmaa: { schedule, billedYears: [linearWorld] } }))
    const steps = amounts.filter((a) => a.rail.kind === 'irmaa-step')
    const expected = schedule.tiers
      .map((t) => {
        const augusts = 2031 - (t.lineIndexing === 'frozen-then-cpi' ? 2026 : 2025)
        const nominalSingle = Math.round((t.singleMagiThreshold * (1 + r) ** augusts) / 1_000) * 1_000
        const line = (nominalSingle * (t.mfjMagiThreshold / t.singleMagiThreshold)) / level
        return t.lowerBoundInclusive ? line - 1 / level : line
      })
      .map((lastSafe) => Math.floor(lastSafe - 50_000))
      .filter((a) => a >= 1)
    expect(steps.map((s) => s.amountReal)).toEqual(expected)
    // …and every anchor sits ABOVE the pinned-2026-line anchor (the price gap the frame closes).
    steps.forEach((s, k) => expect(s.amountReal).toBeGreaterThan(schedule.tiers[k]!.mfjMagiThreshold - 50_000))
  })

  it('the TOP IRMAA anchor lands one whole dollar UNDER the statute’s inclusive line — never ON it (§1395r(i)(3)(C): "at least $500,000", 150 % joint)', () => {
    // Typed from the statute (DND-012), not the table: the joint top line is 1.5 × $500,000. MAGI year
    // 2024 → bill 2026: the identity frame (the IRMAA metric here reads no calendar-year figure).
    const topLine = 1.5 * 500_000
    const identityWorld: CommittedYearIncome = { ...linearWorld, calendarYear: 2024 }
    const amounts = anchoredConversionAmounts(anchorWith({ committed: identityWorld, irmaa: { schedule: irmaa.value, billedYears: [identityWorld] } }))
    const top = amounts.filter((a) => a.rail.kind === 'irmaa-step').at(-1)!
    // The rail still NAMES the line; a one-year billed window binds in its own year, so the amount holds across it.
    expect(top.rail).toEqual({ kind: 'irmaa-step', threshold: topLine, magiYear: 2024, firstCrossingMagiYear: null })
    expect(top.amountReal).toBe(topLine - 1 - 50_000) // linear world: IRMAA-MAGI = 50,000 + amount
  })

  it('the JUST-UNDER LAW holds on every anchor, including the SS-coupled IRMAA ramp (the grid’s defining property)', () => {
    // A COUPLED world: ssBenefit 40k drives the Pub-915 inclusion, so the exact dollar is the
    // engine's own piecewise ramp — the property, not a re-derived dollar, is the pin.
    const coupled: CommittedYearIncome = { ...linearWorld, ssBenefit: 40_000, ongoingTaxable: 30_000 }
    const anchor = anchorWith({ committed: coupled, acaCliffMagi: 120_000, irmaa: { schedule: irmaa.value, billedYears: [coupled] } })
    // RAIL CENSUS BEFORE THE LOOP (the c5e27180 shape, aimed at this arm's real hazard) — both
    // assertions below live INSIDE the loop. The list cannot go EMPTY in THIS world (the
    // bracket-edge branch of `anchoredConversionAmounts` is unguarded AND this household's 8,900
    // taxable baseline sits under every finite edge — a baseline in the open top band would yield
    // none, and a sub-$1 amount is dropped), so the danger is not zero iterations: it is an anchor
    // set that silently LOSES A WHOLE RAIL, keeps iterating over the rails it still has, and reports
    // GREEN with this arm's titular subject — the SS-COUPLED IRMAA ramp — never touched. The SHIPPED
    // caller sets the IRMAA context for real — `solveAnchor.deriveConversionAnchor` builds it for any
    // healthcare-priced household with someone Medicare-enrolled at a billed window year, driven live
    // by `solveDispatch` — so this loss reaches the PRODUCT, not just the suite; the sibling arms are
    // strictly weaker predicates (ascending / deduped / integer) which all survive a missing rail. So
    // census the three INDEPENDENT branches (ACA, IRMAA, bracket) by KIND, with counts read from the
    // canonical year-keyed tables rather than from the enumerator under test.
    const anchors = anchoredConversionAmounts(anchor)
    const kinds = anchors.map((a) => a.rail.kind)
    const edgeCount = (ordinaryBracketsMFJ.value as ReadonlyArray<{ upTo: number | null }>).filter(
      (b) => b.upTo !== null,
    ).length
    expect(
      anchors.length,
      'every rail is enumerated: 1 ACA cliff + one per IRMAA tier + one per finite bracket edge',
    ).toBeGreaterThanOrEqual(1 + irmaa.value.tiers.length + edgeCount)
    expect(kinds.filter((k) => k === 'aca-cliff'), 'the ACA-cliff rail is represented').toHaveLength(1)
    expect(
      kinds.filter((k) => k === 'irmaa-step'),
      'the SS-COUPLED IRMAA rail — this arm’s titular subject — is represented on EVERY tier (all mfj thresholds sit above the 41,100 coupled IRMAA-MAGI baseline)',
    ).toHaveLength(irmaa.value.tiers.length)
    expect(
      kinds.filter((k) => k === 'bracket-edge'),
      'the bracket-edge rail is represented on every finite edge above the 8,900 taxable baseline',
    ).toHaveLength(edgeCount)
    // AND the Pub-915 coupling is genuinely in its SLOPED region on at least one anchor. TRUTH OF
    // THIS WORLD, recorded so the title is not read as more than it proves: every IRMAA anchor here
    // (≥ 154,000) sits ABOVE the 85%-cap knee (a ≈ 26,941), where the inclusion is FLAT (slope 1);
    // the 1.85 ramp is ridden by the SMALLEST anchor — the 24,800 bracket edge at 8,594. Measured
    // through the SHIPPED producer, never re-derived arithmetic.
    const magiAt = (a: number): number =>
      irmaaMagiAtFill({ ...coupled, conversion: coupled.conversion + a }, 0)
    const smallest = anchors[0]!.amountReal
    expect(
      magiAt(smallest + 1) - magiAt(smallest),
      'at least one anchor rides the SLOPED Pub-915 inclusion (slope > 1), not the post-85%-cap flat (slope exactly 1)',
    ).toBeGreaterThan(1.5)
    for (const { amountReal, rail } of anchors) {
      const at = (a: number): number => {
        const c = { ...coupled, conversion: coupled.conversion + a }
        if (rail.kind === 'aca-cliff') return acaMagiAtFill(c, 0)
        if (rail.kind === 'irmaa-step') return irmaaMagiAtFill(c, 0)
        return taxableIncomeAtFill(c, 0)
      }
      const railValue = rail.kind === 'aca-cliff' ? rail.magi : rail.kind === 'irmaa-step' ? rail.threshold : rail.edge
      expect(at(amountReal), `${rail.kind} anchor ${amountReal} sits at-or-under its rail`).toBeLessThanOrEqual(railValue)
      expect(at(amountReal + 2), `${rail.kind} anchor ${amountReal}+2 crosses (just-under, not merely under)`).toBeGreaterThan(railValue)
    }
  })

  it('bracket edges (linear world): amount = edge + SD − ongoing EXACTLY (hand arithmetic per edge)', () => {
    // taxable(a) = max(0, ongoing + a − SD_mfj) ⇒ the anchor for edge e is e + SD − 50,000.
    const sd = standardDeductionMFJ.value as number
    const edges = (ordinaryBracketsMFJ.value as ReadonlyArray<{ upTo: number | null }>)
      .map((b) => b.upTo)
      .filter((u): u is number => u !== null)
    const amounts = anchoredConversionAmounts(anchorWith({}))
    const brackets = amounts.filter((a) => a.rail.kind === 'bracket-edge')
    const expected = edges.map((e) => e + sd - 50_000).filter((a) => a >= 1)
    expect(brackets.map((b) => b.amountReal)).toEqual(expected)
  })

  it('amounts are ascending, whole-dollar, and deduplicated', () => {
    const anchor = anchorWith({ acaCliffMagi: 100_000, irmaa: { schedule: irmaa.value, billedYears: [linearWorld] } })
    const amounts = anchoredConversionAmounts(anchor).map((a) => a.amountReal)
    expect(amounts).toEqual([...amounts].sort((x, y) => x - y))
    expect(new Set(amounts).size).toBe(amounts.length)
    expect(amounts.every((a) => Number.isInteger(a) && a >= 1)).toBe(true)
  })
})

describe('the IRMAA window — one flat amount repeats across years whose lines AND income MOVE (the Tier 1 year-0 anchors entry)', () => {
  // A candidate converts ONE real amount every year of the pre-RMD window (`applyCandidate` expands it
  // flat), but each year's MAGI meets its OWN bill's lines in its own price frame — lines that move with
  // the $1,000 rounding and the Trustees path's near-term → ultimate edge — ON TOP OF that year's own
  // committed income (Social Security arrives at a claim age). An anchor judged on year 0's lines and
  // income alone crosses its own tier in any year whose line sits lower or whose income sits higher —
  // the label lies there (council wf_71f675da-8cf).
  const world2026: CommittedYearIncome = { ...linearWorld, calendarYear: 2026 } // ss 0 ⇒ IRMAA-MAGI = 50,000 + amount
  /** Every year from..to at `frame`'s committed income — only the calendar (the lines) moves. */
  const framesOf = (frame: CommittedYearIncome, from: number, to: number): [CommittedYearIncome, ...CommittedYearIncome[]] => {
    const frames: CommittedYearIncome[] = []
    for (let y = from; y <= to; y++) frames.push({ ...frame, calendarYear: y })
    return frames as [CommittedYearIncome, ...CommittedYearIncome[]]
  }
  const irmaaPoints = (anchor: ConversionAnchorContext) =>
    anchoredConversionAmounts(anchor).flatMap((a) => (a.rail.kind === 'irmaa-step' ? [{ amountReal: a.amountReal, rail: a.rail }] : []))
  /** Hand-composed MFJ lines from the statute + the READ Trustees rate (DND 012 — never the enumerator's
   *  output): tiers 1–4 index by CPI from August 2025, the top ("at least $500,000", 150 % joint,
   *  §1395r(i)(3)(C)) from August 2026 after its freeze through bill 2027 (§1395r(i)(5)(C)); each rounded
   *  to $1,000 on the SINGLE line; a MAGI year y bills in y + 2, so its line carries CPI to August of
   *  y + 1; in real dollars it sits over the MAGI year's level (1 + r)^(y − 2026); an INCLUSIVE line's
   *  last safe MAGI is one NOMINAL dollar under it. The premise: every rate read here is the near-term
   *  average (asserted in the first arm). */
  const r = medicareCostTrend.value.cpiNearTermAvg
  const lineOf = (tierIdx: number, y: number): { line: number; lastSafe: number } => {
    const t = irmaa.value.tiers[tierIdx]!
    const base = t.lineIndexing === 'frozen-then-cpi' ? 2026 : 2025
    const nominalSingle = Math.round((t.singleMagiThreshold * (1 + r) ** (y + 1 - base)) / 1_000) * 1_000
    const level = (1 + r) ** (y - 2026)
    const line = ((t.mfjMagiThreshold / t.singleMagiThreshold) * nominalSingle) / level
    return { line, lastSafe: t.lowerBoundInclusive ? line - 1 / level : line }
  }
  const TOP = irmaa.value.tiers.length - 1

  it('THE WITNESS (the top tier — F12-invariant): a 2026 start billed 2026–2030 keeps the first-year point AND gains one that stays under the top line in EVERY billed year', () => {
    const trend = medicareCostTrend.value
    expect(trend.anchorYear).toBe(2026)
    expect(trend.anchorYear + trend.premiums.length).toBeGreaterThanOrEqual(2031)
    expect(irmaa.value.tiers[TOP]!.singleMagiThreshold).toBe(500_000) // typed from the statute
    let minYear = 2026
    for (let y = 2027; y <= 2030; y++) if (lineOf(TOP, y).lastSafe < lineOf(TOP, minYear).lastSafe) minYear = y
    // NON-VACUITY (the b9-10 landmine — a price fix can make a witness vacuous): the window's lowest top
    // line is NOT year 0's, so the year-0 amount genuinely crosses the top tier inside this window.
    expect(minYear).not.toBe(2026)
    const yearZeroAmount = Math.floor(lineOf(TOP, 2026).lastSafe - 50_000)
    let firstCross: number | null = null
    for (let y = 2027; y <= 2030 && firstCross === null; y++) if (50_000 + yearZeroAmount >= lineOf(TOP, y).line) firstCross = y
    expect(firstCross).not.toBeNull()

    const points = irmaaPoints(anchorWith({ committed: world2026, irmaa: { schedule: irmaa.value, billedYears: framesOf(world2026, 2026, 2030) } }))
    const topPoints = points.filter((p) => p.rail.threshold > 700_000) // MFJ tier 4 sits near 436k, the top near 774k
    expect(topPoints).toHaveLength(2)
    const [windowPoint, firstYear] = topPoints // ascending: the window's lower line is the smaller amount
    // The first-year point is KEPT (the register's ⚑ NEGATIVE) and says where it stops holding.
    expect(firstYear!.amountReal).toBe(yearZeroAmount)
    expect(firstYear!.rail.magiYear).toBe(2026)
    expect(firstYear!.rail.firstCrossingMagiYear).toBe(firstCross)
    expect(firstYear!.rail.threshold).toBeCloseTo(lineOf(TOP, 2026).line, 6)
    // The window point binds in the window's lowest-line year and adds no crossing in any billed year.
    expect(windowPoint!.amountReal).toBe(Math.floor(lineOf(TOP, minYear).lastSafe - 50_000))
    expect(windowPoint!.rail.magiYear).toBe(minYear)
    expect(windowPoint!.rail.firstCrossingMagiYear).toBeNull()
    expect(windowPoint!.rail.threshold).toBeCloseTo(lineOf(TOP, minYear).line, 6)
  })

  it('THE INCOME WITNESS (the council’s frame hit): Social Security arriving mid-window moves the window point by 85 % of the benefit — never judged on year 0’s income', () => {
    // `retired`’s shape in the linear world: no other income, Social Security 0 in 2026, $30,000 from
    // 2027 (one spouse claims), $54,000 from 2028 (both). Above the §86 thresholds the inclusion is capped
    // at 85 % of the benefit (26 U.S.C. §86(a)(2)) — the premise, checked by hand: provisional income
    // (the conversion + half the benefit) sits far over the $44,000 base amount wherever an IRMAA line
    // binds, so the taxable part is 0.85 × SS in every such year (a deflating threshold only lowers it).
    const ss = (y: number): number => (y === 2026 ? 0 : y === 2027 ? 30_000 : 54_000)
    const noIncome: CommittedYearIncome = { ...world2026, ongoingTaxable: 0 }
    const frames = [2026, 2027, 2028, 2029, 2030].map((y) => ({ ...noIncome, calendarYear: y, ssBenefit: ss(y) })) as [
      CommittedYearIncome,
      ...CommittedYearIncome[],
    ]
    const TIER1 = 0
    let tight = 2026
    const roomOf = (y: number): number => lineOf(TIER1, y).lastSafe - 0.85 * ss(y)
    for (let y = 2027; y <= 2030; y++) {
      // Sufficient for the cap: provisional income − the $44,000 MFJ adjusted base (§86(c)(2)) ≥ the
      // benefit ⇒ 0.85 × (PI − base) ≥ 0.85 × SS, so the 85 % term is the smaller one.
      expect(roomOf(y) + 0.5 * ss(y) - 44_000, `§86 premise (${y})`).toBeGreaterThanOrEqual(ss(y))
      if (roomOf(y) < roomOf(tight)) tight = y
    }
    expect(tight).toBeGreaterThanOrEqual(2028) // a year both benefits ride — never year 0's frame
    const points = irmaaPoints(anchorWith({ committed: frames[0], irmaa: { schedule: irmaa.value, billedYears: frames } }))
    const tier1 = points.filter((p) => p.rail.threshold < 250_000)
    expect(tier1).toHaveLength(2)
    const [windowPoint, firstYear] = tier1
    // Year 0 (no benefit yet) sits right at the line; one spouse's claim puts it over in 2027.
    expect(firstYear!.amountReal).toBe(Math.floor(lineOf(TIER1, 2026).lastSafe))
    expect(firstYear!.rail.firstCrossingMagiYear).toBe(2027)
    // The window point is the tightest year's room: its line less 85 % of both benefits.
    expect(windowPoint!.amountReal).toBe(Math.floor(roomOf(tight)))
    expect(windowPoint!.rail.magiYear).toBe(tight)
    expect(windowPoint!.rail.firstCrossingMagiYear).toBeNull()
    expect(firstYear!.amountReal - windowPoint!.amountReal).toBeGreaterThan(45_000)
  })

  it('firstCrossingMagiYear is exactly the first billed year the amount adds a crossing — read through the BILL’s own predicate, on the SS-coupled ramp', () => {
    // 2026–2033: tiers 1, 2, 3 and the top each dip inside the window (tier 4 not until 2035), so both
    // kinds of point exist. The bill's predicate (`irmaaTierApplies` on the schedule AS COMPARED for each
    // year, at that year's IRMAA-MAGI) is the judge — the enumerator and the bill must agree about which
    // dollar crosses.
    const coupled: CommittedYearIncome = { ...world2026, ssBenefit: 40_000, ongoingTaxable: 30_000 }
    const frames = framesOf(coupled, 2026, 2033)
    const points = irmaaPoints(anchorWith({ committed: coupled, irmaa: { schedule: irmaa.value, billedYears: frames } }))
    const magiAt = (f: CommittedYearIncome, a: number): number => irmaaMagiAtFill({ ...f, conversion: a }, 0)
    let held = 0
    let crossed = 0
    for (const { amountReal, rail } of points) {
      const binding = irmaaScheduleAsCompared(irmaa.value, rail.magiYear)
      const tierIdx = binding.tiers.findIndex((t) => t.mfjMagiThreshold === rail.threshold)
      expect(tierIdx, `the rail names a line of its binding year (${rail.magiYear})`).toBeGreaterThanOrEqual(0)
      const tierAt = (f: CommittedYearIncome) => irmaaScheduleAsCompared(irmaa.value, f.calendarYear).tiers[tierIdx]!
      const firstCross = frames.find((f) => !irmaaTierApplies(magiAt(f, 0), tierAt(f), 'mfj') && irmaaTierApplies(magiAt(f, amountReal), tierAt(f), 'mfj'))
      expect(rail.firstCrossingMagiYear, `amount ${amountReal} (tier ${tierIdx + 1})`).toBe(firstCross?.calendarYear ?? null)
      // Just-under in its binding year: two more dollars cross that year's line.
      const bindingFrame = frames.find((f) => f.calendarYear === rail.magiYear)!
      expect(irmaaTierApplies(magiAt(bindingFrame, amountReal + 2), binding.tiers[tierIdx]!, 'mfj')).toBe(true)
      if (rail.firstCrossingMagiYear === null) held++
      else crossed++
    }
    expect(crossed, 'a first-year point that crosses exists (non-vacuous)').toBeGreaterThan(0)
    expect(held, 'every tier keeps a point that holds across the window').toBe(irmaa.value.tiers.length)
  })

  it('NO SILENT VANISH: a tier committed income already crosses in one billed year still anchors on the years it does not', () => {
    // 2026's committed income ($240,000) is over tier 1's line; 2027–2028's ($50,000) is far under it. A
    // walk keyed on the first year's baseline would drop tier 1 for the whole window — a quietly narrower
    // grid (burned/062). The crossing the baseline already makes is excluded, never the tier.
    const frames: [CommittedYearIncome, ...CommittedYearIncome[]] = [
      { ...world2026, ongoingTaxable: 240_000 },
      { ...world2026, calendarYear: 2027 },
      { ...world2026, calendarYear: 2028 },
    ]
    const points = irmaaPoints(anchorWith({ committed: frames[0], irmaa: { schedule: irmaa.value, billedYears: frames } }))
    const tier1 = points.filter((p) => p.rail.threshold < 250_000)
    expect(tier1).toHaveLength(1) // no first-year point (its year is already over); the window point stands
    const tight = lineOf(0, 2027).lastSafe < lineOf(0, 2028).lastSafe ? 2027 : 2028
    expect(tier1[0]!.rail.magiYear).toBe(tight)
    expect(tier1[0]!.amountReal).toBe(Math.floor(lineOf(0, tight).lastSafe - 50_000))
    expect(tier1[0]!.rail.firstCrossingMagiYear).toBeNull()
  })

  it('a window whose lines never bind tighter than year 0 adds NOTHING — the grid is the first-year walk exactly', () => {
    // MAGI 2026–2027 at constant income: every tier's 2027 line sits at or above 2026's (the measured
    // table), so each tier's first-year point already holds.
    const one = irmaaPoints(anchorWith({ committed: world2026, irmaa: { schedule: irmaa.value, billedYears: [world2026] } }))
    const two = irmaaPoints(anchorWith({ committed: world2026, irmaa: { schedule: irmaa.value, billedYears: framesOf(world2026, 2026, 2027) } }))
    expect(two).toEqual(one)
    expect(two).toHaveLength(irmaa.value.tiers.length)
    expect(two.every((p) => p.rail.firstCrossingMagiYear === null && p.rail.magiYear === 2026)).toBe(true)
  })

  it('MID-WINDOW ENROLLMENT: year 0 is not billed ⇒ every point binds in a billed year, and the first BILLED year keeps its own point', () => {
    // A household first enrolled mid-window (the verify pass's missed scope): only 2029–2031's MAGI is
    // billed. Year 0's lines are not a surcharge this household pays, so nothing anchors to them.
    const frames = framesOf(world2026, 2029, 2031)
    const points = irmaaPoints(anchorWith({ committed: world2026, irmaa: { schedule: irmaa.value, billedYears: frames } }))
    const years = frames.map((f) => f.calendarYear)
    for (const { rail } of points) expect(years).toContain(rail.magiYear)
    // Per tier: the first BILLED year's point (2029), plus a holding window point exactly when it crosses.
    for (let i = 0; i < irmaa.value.tiers.length; i++) {
      const ofTier = points.filter((p) => Math.abs(p.rail.threshold - lineOf(i, p.rail.magiYear).line) < 1e-6)
      const first = ofTier.find((p) => p.rail.magiYear === 2029)
      expect(first, `tier ${i + 1} keeps its first-billed-year point`).toBeDefined()
      expect(first!.amountReal).toBe(Math.floor(lineOf(i, 2029).lastSafe - 50_000))
      if (first!.rail.firstCrossingMagiYear === null) expect(ofTier, `tier ${i + 1}`).toHaveLength(1)
      else {
        expect(ofTier, `tier ${i + 1}`).toHaveLength(2)
        expect(ofTier.find((p) => p !== first)!.rail.firstCrossingMagiYear).toBeNull()
      }
    }
  })

  it('the billed-year frames are a contract, checked loud: non-empty, ascending, never before the anchor, one filing, conversion 0, the anchor’s own year IS the anchor', () => {
    const at = (frames: CommittedYearIncome[]) => () =>
      anchoredConversionAmounts(
        anchorWith({ committed: world2026, irmaa: { schedule: irmaa.value, billedYears: frames as [CommittedYearIncome, ...CommittedYearIncome[]] } }),
      )
    const y = (calendarYear: number, over: Partial<CommittedYearIncome> = {}): CommittedYearIncome => ({ ...world2026, calendarYear, ...over })
    expect(at([])).toThrow(/billedYears/)
    expect(at([y(2026.5)])).toThrow(/billedYears/)
    expect(at([y(2027), y(2026)])).toThrow(/ascending/)
    expect(at([y(2026), y(2026)])).toThrow(/ascending/)
    expect(at([y(2025), y(2026)])).toThrow(/before the anchor/)
    expect(at([y(2026), y(2027, { filing: 'single' })])).toThrow(/filing/)
    expect(at([y(2026), y(2027, { conversion: 1 })])).toThrow(/conversion 0/)
    expect(at([y(2026), y(2027, { ssBenefit: Number.NaN })])).toThrow(/finite/)
    expect(at([y(2026, { ssBenefit: 1 }), y(2027)])).toThrow(/anchor skeleton/)
    expect(at([y(2026), y(2027)])).not.toThrow()
  })
})

describe('the ACA-cliff and bracket-edge window — one flat amount meets a different frame each year (the b9-4 sibling of the IRMAA window)', () => {
  // The register's Tier 1 *The solver's ACA-cliff and bracket-edge anchors sit under their rail only in
  // YEAR 0's committed frame…*: a candidate converts ONE amount every window year, but the deduction stack
  // shrinks when the OBBBA senior bonus ends after 2028, and Social Security arrives at a claim age (85 %
  // of it into taxable income above the §86 thresholds, ALL of it into ACA-MAGI). Every expected dollar
  // below is typed from the statute + the READ constants (DND 012 — never the enumerator's output).
  const sd = standardDeductionMFJ.value as number
  const add65 = age65AdditionMFJ.value as number
  const sb = seniorBonus.value
  const edges = (ordinaryBracketsMFJ.value as ReadonlyArray<{ upTo: number | null }>)
    .map((b) => b.upTo)
    .filter((u): u is number => u !== null)
  /** Every year from..to at `frame`'s committed income, `over(y)` patching a year. */
  const yearsOf = (
    frame: CommittedYearIncome,
    from: number,
    to: number,
    over: (y: number) => Partial<CommittedYearIncome> = () => ({}),
  ): [CommittedYearIncome, ...CommittedYearIncome[]] => {
    const out: CommittedYearIncome[] = []
    for (let y = from; y <= to; y++) out.push({ ...frame, calendarYear: y, ...over(y) })
    return out as [CommittedYearIncome, ...CommittedYearIncome[]]
  }
  const withWindow = (years: [CommittedYearIncome, ...CommittedYearIncome[]], acaPricedYears: number[] = [], acaCliffMagi: number | null = null) =>
    anchorWith({ committed: years[0], acaCliffMagi, window: { years, acaPricedYears } })
  const edgePoints = (anchor: ConversionAnchorContext, edge: number) =>
    anchoredConversionAmounts(anchor).flatMap((a) => (a.rail.kind === 'bracket-edge' && a.rail.edge === edge ? [{ amountReal: a.amountReal, rail: a.rail }] : []))

  it('THE BONUS WITNESS: a both-65+ couple 2026–2030 keeps the first-year point (the bonus’s room, crossing in 2027) AND gains the point that holds once the bonus is gone (2029)', () => {
    // Taxable = ongoing + a − (SD + 2 × the 65+ addition + 2 × the per-person bonus), the bonus being the
    // statute's NOMINAL $6,000 deflated by the year's price level inside 2025–2028 and 0 from 2029. At the
    // first edge the MAGI sits far under the phase-out start (checked), so the bonus is whole.
    const E = edges[0]!
    const through = seniorBonus.sunsetAfter!
    expect(through).toBe(2028) // P.L. 119-21: the bonus ends after tax year 2028
    const bonus = (y: number): number => (y <= through ? (2 * sb.perPerson65Plus) / cumulativePriceIndex(y) : 0)
    const room = (y: number): number => E + sd + 2 * add65 + bonus(y) - 50_000
    expect(50_000 + room(2026), 'premise: MAGI under the phase-out start — the bonus is whole').toBeLessThan(sb.phaseOutStart.mfj / cumulativePriceIndex(2026))
    expect(cumulativePriceIndex(2027), 'premise: the price level rises in 2027, so the nominal bonus shrinks in real dollars').toBeGreaterThan(1)
    const both65: CommittedYearIncome = { ...linearWorld, count65: 2, calendarYear: 2026 }
    const points = edgePoints(withWindow(yearsOf(both65, 2026, 2030)), E)
    expect(points).toHaveLength(2)
    const [windowPoint, firstYear] = points // ascending: the bonus-free years leave less room
    expect(firstYear!.amountReal).toBe(Math.floor(room(2026)))
    expect(firstYear!.rail).toEqual({ kind: 'bracket-edge', edge: E, calendarYear: 2026, firstCrossingYear: 2027 })
    expect(windowPoint!.amountReal).toBe(Math.floor(room(2029)))
    expect(windowPoint!.rail).toEqual({ kind: 'bracket-edge', edge: E, calendarYear: 2029, firstCrossingYear: null })
    expect(firstYear!.amountReal - windowPoint!.amountReal, 'the two points sit the whole bonus apart').toBe(Math.floor(room(2026)) - Math.floor(room(2029)))
  })

  it('THE INCOME WITNESS: Social Security arriving mid-window moves the window point by 85 % of the benefit — never judged on year 0’s income', () => {
    // Post-sunset, under 65 (no bonus, no 65+ addition): taxable = a + taxableSS − SD. At the SECOND edge
    // the provisional income sits far over the §86 MFJ adjusted base (checked), so the taxable part is the
    // 85 % cap, 0.85 × SS (26 U.S.C. §86(a)(2); a deflating threshold only lowers it).
    const E = edges[1]!
    const ss = (y: number): number => (y === 2030 ? 0 : y === 2031 ? 30_000 : 54_000)
    const room = (y: number): number => E + sd - 0.85 * ss(y)
    for (const y of [2031, 2032, 2033]) {
      expect(room(y) + 0.5 * ss(y) - 44_000, `§86 premise (${y}): PI − the adjusted base ≥ the benefit`).toBeGreaterThanOrEqual(ss(y))
    }
    const noIncome: CommittedYearIncome = { ...linearWorld, ongoingTaxable: 0 }
    const points = edgePoints(withWindow(yearsOf(noIncome, 2030, 2033, (y) => ({ ssBenefit: ss(y) }))), E)
    expect(points).toHaveLength(2)
    const [windowPoint, firstYear] = points
    expect(firstYear!.amountReal).toBe(Math.floor(room(2030)))
    expect(firstYear!.rail).toMatchObject({ calendarYear: 2030, firstCrossingYear: 2031 })
    expect(windowPoint!.amountReal).toBe(Math.floor(room(2032))) // both benefits ride from 2032; the earliest on a tie
    expect(windowPoint!.rail).toMatchObject({ calendarYear: 2032, firstCrossingYear: null })
  })

  it('THE ACA WITNESS: the cliff binds only in the years the engine PRICES under it — Social Security moves it by the WHOLE benefit, an unpriced year never binds', () => {
    // ACA-MAGI = ongoing + a + the whole benefit (no Pub-915 coupling), against ONE cliff dollar.
    const cliff = 100_000
    const ss = (y: number): number => [0, 10_000, 20_000, 60_000][y - 2030]!
    const frames = yearsOf({ ...linearWorld, ssBenefit: 0 }, 2030, 2033, (y) => ({ ssBenefit: ss(y) }))
    // 2033 is NOT priced (say, both on Medicare): its $60,000 of benefit must not bind the cliff anywhere.
    const aca = anchoredConversionAmounts(withWindow(frames, [2030, 2031, 2032], cliff)).filter((a) => a.rail.kind === 'aca-cliff')
    expect(aca).toEqual([
      { amountReal: cliff - 50_000 - 20_000, rail: { kind: 'aca-cliff', magi: cliff, calendarYear: 2032, firstCrossingYear: null } },
      { amountReal: cliff - 50_000, rail: { kind: 'aca-cliff', magi: cliff, calendarYear: 2030, firstCrossingYear: 2031 } },
    ])
    // Year 0 UNPRICED, a later year priced: no first-year point (year 0 owes no premium), the priced year's own.
    const later = anchoredConversionAmounts(withWindow(frames, [2032], cliff)).filter((a) => a.rail.kind === 'aca-cliff')
    expect(later).toEqual([{ amountReal: cliff - 50_000 - 20_000, rail: { kind: 'aca-cliff', magi: cliff, calendarYear: 2032, firstCrossingYear: null } }])
  })

  it('NO SILENT VANISH: an edge year 0’s income already passes still anchors on the years it does not — including edges BELOW year 0’s baseline', () => {
    // 2030's committed income ($200,000) is over the first two edges; 2031–2032's ($50,000) is under both.
    const frames = yearsOf(linearWorld, 2030, 2032, (y) => (y === 2030 ? { ongoingTaxable: 200_000 } : {}))
    for (const E of [edges[0]!, edges[1]!]) {
      expect(200_000 - sd, `premise: year 0 is already over ${E}`).toBeGreaterThan(E)
      const points = edgePoints(withWindow(frames), E)
      expect(points, `edge ${E}`).toEqual([
        { amountReal: E + sd - 50_000, rail: { kind: 'bracket-edge', edge: E, calendarYear: 2031, firstCrossingYear: null } },
      ])
    }
  })

  it('a window whose frames never bind tighter than year 0 adds NOTHING — the grid is the first-year walk exactly', () => {
    const one = anchoredConversionAmounts(withWindow([linearWorld]))
    const three = anchoredConversionAmounts(withWindow(yearsOf(linearWorld, 2030, 2032)))
    expect(three).toEqual(one)
    // …and an ABSENT window (the U14 oracle fixtures) is that same walk.
    expect(anchoredConversionAmounts(anchorWith({}))).toEqual(one)
  })

  it('firstCrossingYear is exactly the first window year the amount adds a crossing, and every point is just-under in its binding year — on the SS-coupled ramp, every edge', () => {
    const coupled: CommittedYearIncome = { ...linearWorld, count65: 2, calendarYear: 2026, ssBenefit: 0, ongoingTaxable: 30_000 }
    const frames = yearsOf(coupled, 2026, 2031, (y) => ({ ssBenefit: y < 2028 ? 0 : 40_000 }))
    const taxableAt = (f: CommittedYearIncome, a: number): number => taxableIncomeAtFill({ ...f, conversion: a }, 0)
    let held = 0
    let crossed = 0
    for (const { amountReal, rail } of anchoredConversionAmounts(withWindow(frames))) {
      if (rail.kind !== 'bracket-edge') continue
      const firstCross = frames.find((f) => taxableAt(f, 0) <= rail.edge && taxableAt(f, amountReal) > rail.edge)
      expect(rail.firstCrossingYear, `amount ${amountReal} (edge ${rail.edge})`).toBe(firstCross?.calendarYear ?? null)
      const binding = frames.find((f) => f.calendarYear === rail.calendarYear)!
      expect(taxableAt(binding, amountReal), 'at-or-under in its binding year').toBeLessThanOrEqual(rail.edge)
      expect(taxableAt(binding, amountReal + 2), 'just-under: two more dollars cross').toBeGreaterThan(rail.edge)
      if (rail.firstCrossingYear === null) held++
      else crossed++
    }
    expect(crossed, 'a first-year point that crosses exists (non-vacuous)').toBeGreaterThan(0)
    expect(held, 'every edge keeps a point that holds across the window').toBe(edges.length)
  })

  it('the window is a contract, checked loud: starts AT the skeleton, ascending, priced years a subset, a cliff dollar iff a priced year', () => {
    const y = (calendarYear: number, over: Partial<CommittedYearIncome> = {}): CommittedYearIncome => ({ ...linearWorld, calendarYear, ...over })
    const at = (years: CommittedYearIncome[], priced: number[] = [], cliff: number | null = null) => () =>
      anchoredConversionAmounts(anchorWith({ acaCliffMagi: cliff, window: { years: years as [CommittedYearIncome, ...CommittedYearIncome[]], acaPricedYears: priced } }))
    expect(at([])).toThrow(/window\.years is empty/)
    expect(at([y(2031)])).toThrow(/not at the anchor skeleton/)
    expect(at([y(2030), y(2030)])).toThrow(/ascending/)
    expect(at([y(2030, { ongoingTaxable: 1 })])).toThrow(/anchor skeleton/)
    expect(at([y(2030), y(2031, { conversion: 1 })])).toThrow(/conversion 0/)
    expect(at([y(2030), y(2031)], [2032], 100_000)).toThrow(/not a window year/)
    expect(at([y(2030), y(2031)], [2031, 2030], 100_000)).toThrow(/ascending/)
    expect(at([y(2030), y(2031)], [2031], null)).toThrow(/present iff/)
    expect(at([y(2030), y(2031)], [], 100_000)).toThrow(/present iff/)
    expect(at([y(2030), y(2031)], [2031], 100_000)).not.toThrow()
  })
})

describe('enumerateCandidates — the full set + the RMD-first legality filter', () => {
  const window = { startYearOffset: 4, years: 4 }

  it('the conventional-order / conversion-0 baseline is ALWAYS present (case (v)’s requirement)', () => {
    const { candidates } = enumerateCandidates({ anchor: anchorWith({}), window })
    const baseline = candidates.filter(
      (c) => c.provenance === 'conventional-baseline' && c.policy === CONVENTIONAL_POLICY && c.conversion === null,
    )
    expect(baseline).toHaveLength(1)
  })

  it('K = 4 policies × (1 + feasible amounts), and every grid conversion carries its window + rail', () => {
    const anchor = anchorWith({ acaCliffMagi: 100_000 })
    const { candidates } = enumerateCandidates({ anchor, window })
    const nAmounts = anchoredConversionAmounts(anchor).length
    expect(candidates).toHaveLength(4 * (1 + nAmounts))
    for (const c of candidates) {
      if (c.conversion !== null) {
        expect(c.conversion.startYearOffset).toBe(4)
        expect(c.conversion.years).toBe(4)
        expect(c.anchoredRail).toBeDefined()
      }
    }
  })

  it('an over-headroom amount is REJECTED with the sentinel — recorded, never silently scored (insight 027)', () => {
    // Headroom = pretaxAvailable 30,000 − rmd 10,000 = 20,000; the 50,000 ACA anchor exceeds it.
    const anchor = anchorWith({ acaCliffMagi: 100_000, pretaxAvailableAtStart: 30_000, rmdAtStart: 10_000 })
    const { candidates, rejected } = enumerateCandidates({ anchor, window })
    expect(rejected).toContainEqual({
      amountReal: 50_000,
      rail: { kind: 'aca-cliff', magi: 100_000, calendarYear: 2030, firstCrossingYear: null },
      reason: 'exceeds-post-rmd-headroom',
      headroomReal: 20_000,
    })
    expect(candidates.some((c) => c.conversion?.annualAmountReal === 50_000)).toBe(false)
    // The conversion-0 arms survive the filter (a legality filter never removes the baseline).
    expect(candidates.filter((c) => c.conversion === null)).toHaveLength(4)
  })

  it('the user baseline is out-of-grid and labeled; the custom⟺order biconditional is enforced', () => {
    const { candidates } = enumerateCandidates({
      anchor: anchorWith({}),
      window,
      userBaseline: { policy: 'custom', drawdownOrder: ['roth', 'pretax', 'taxable'] },
    })
    const user = candidates.filter((c) => c.provenance === 'user-baseline')
    expect(user).toEqual([
      { policy: 'custom', conversion: null, provenance: 'user-baseline', drawdownOrder: ['roth', 'pretax', 'taxable'] },
    ])
    expect(() =>
      enumerateCandidates({ anchor: anchorWith({}), window, userBaseline: { policy: 'custom' } }),
    ).toThrow(/biconditional/)
    expect(() =>
      enumerateCandidates({
        anchor: anchorWith({}),
        window,
        userBaseline: { policy: 'proportional', drawdownOrder: ['roth', 'pretax', 'taxable'] },
      }),
    ).toThrow(/biconditional/)
  })

  it('window + anchor domain guards fail loud (insight 010 — finiteness first, integers only)', () => {
    expect(() => enumerateCandidates({ anchor: anchorWith({}), window: { startYearOffset: -1, years: 4 } })).toThrow()
    expect(() => enumerateCandidates({ anchor: anchorWith({}), window: { startYearOffset: 0, years: 0 } })).toThrow()
    expect(() =>
      enumerateCandidates({ anchor: anchorWith({ pretaxAvailableAtStart: Number.NaN }), window }),
    ).toThrow(/finite/)
    expect(() => enumerateCandidates({ anchor: anchorWith({ rmdAtStart: Number.NaN }), window })).toThrow(/finite/)
  })
})

describe('applyCandidate — the shared apply seam (the buildArmParams discipline)', () => {
  const base: SimulationParams = {
    initialPortfolio: 1000,
    annualSpendingReal: 40,
    stockWeight: 0.5,
    people: [
      { sex: 'male', currentAge: 65, birthYear: 1961, retirementAge: 65, earnedIncomeReal: 0, pia: 0, socialSecurityClaimAge: 65 },
    ],
    survivorSpendingRatio: 0.75,
    drawdownPolicy: 'proportional',
    market: { stock: { mean: 0, stdDev: 0 }, bond: { mean: 0, stdDev: 0 }, inflation: { mean: 0, stdDev: 0 }, stockBondCorrelation: 0, space: 'simple', returnsAreReal: true },
    paths: 100,
    maxHorizonYears: 30,
    longevityMode: 'fixed-horizon',
    overlay: {
      taxEnabled: true,
      rmdEnabled: true,
      startCalendarYear: 2026,
      buckets: { taxable: 0, pretax: 1000, roth: 0 },
      filing: 'mfj',
      conversions: [5, 5, 5], // the base's own schedule — a candidate must STRIP it
    },
  }

  it('a conversion candidate carries EXACTLY its own plan (base conversions stripped), expanded to absolute years', () => {
    const out = applyCandidate(base, {
      policy: 'bracket-fill',
      conversion: { annualAmountReal: 20_000, startYearOffset: 2, years: 2 },
      provenance: 'grid',
    })
    expect(out.drawdownPolicy).toBe('bracket-fill')
    expect(out.overlay?.conversions).toEqual([0, 0, 20_000, 20_000])
  })

  it('the conversion-0 arm is genuinely conversion-FREE (absence — the reduce-to-spine signal, never a zero-fill)', () => {
    const out = applyCandidate(base, { policy: 'taxable-first', conversion: null, provenance: 'conventional-baseline' })
    expect(out.overlay).toBeDefined()
    expect('conversions' in out.overlay!).toBe(false)
  })

  it('every field the candidate does not name is the base’s byte-for-byte, and DRAW DIMENSIONS never move (the S3 CRN premise)', () => {
    const out = applyCandidate(base, {
      policy: 'pre-tax-first',
      conversion: { annualAmountReal: 10_000, startYearOffset: 0, years: 1 },
      provenance: 'grid',
    })
    expect(out.paths).toBe(base.paths)
    expect(out.maxHorizonYears).toBe(base.maxHorizonYears)
    expect(out.people).toBe(base.people) // reference-equal — never rebuilt
    expect(out.market).toBe(base.market)
    expect(out.overlay?.buckets).toBe(base.overlay!.buckets)
  })

  it('drawdownOrder rides ONLY a custom candidate; a base order is stripped for named-policy candidates', () => {
    const basedOrder: SimulationParams = { ...base, drawdownPolicy: 'custom', drawdownOrder: ['roth', 'pretax', 'taxable'] }
    const named = applyCandidate(basedOrder, { policy: 'proportional', conversion: null, provenance: 'grid' })
    expect('drawdownOrder' in named).toBe(false)
    const custom = applyCandidate(base, {
      policy: 'custom',
      conversion: null,
      provenance: 'user-baseline',
      drawdownOrder: ['roth', 'pretax', 'taxable'],
    })
    expect(custom.drawdownOrder).toEqual(['roth', 'pretax', 'taxable'])
  })

  it('a conversion candidate on an overlay-less base fails loud (tax must be ON to price a conversion)', () => {
    const { overlay: _o, ...spineBase } = base
    expect(() =>
      applyCandidate(spineBase, { policy: 'proportional', conversion: { annualAmountReal: 1, startYearOffset: 0, years: 1 }, provenance: 'grid' }),
    ).toThrow(/overlay/)
  })

  it('a window entirely past the horizon fails LOUD (U14 fold) — never a silent conversion-0 twin under a conversion-bearing id', () => {
    // expandRothConversion returns undefined at startYearOffset ≥ horizon; the old spread
    // silently dropped the key, scoring this candidate byte-identical to the conversion-0 arm.
    expect(() =>
      applyCandidate(base, {
        policy: 'bracket-fill',
        conversion: { annualAmountReal: 20_000, startYearOffset: base.maxHorizonYears, years: 2 },
        provenance: 'grid',
      }),
    ).toThrow(/entirely past the .*horizon/)
    // The boundary CONTROL: the last in-horizon year is legal and expands (fail-loud is not over-broad).
    const lastYear = applyCandidate(base, {
      policy: 'bracket-fill',
      conversion: { annualAmountReal: 20_000, startYearOffset: base.maxHorizonYears - 1, years: 2 },
      provenance: 'grid',
    })
    expect(lastYear.overlay?.conversions).toHaveLength(base.maxHorizonYears)
    expect(lastYear.overlay?.conversions?.[base.maxHorizonYears - 1]).toBe(20_000)
  })
})

describe('solverCandidateId — provenance-widened + injective (U15 §S0.4)', () => {
  it('the three provenance arms give DISTINCT ids for the SAME policy:amount', () => {
    const grid: CandidateStrategy = { policy: 'taxable-first', conversion: null, provenance: 'grid' }
    const conventional: CandidateStrategy = { policy: 'taxable-first', conversion: null, provenance: 'conventional-baseline' }
    const userBaseline: CandidateStrategy = { policy: 'taxable-first', conversion: null, provenance: 'user-baseline' }
    expect(solverCandidateId(grid)).toBe('grid:taxable-first:0')
    expect(solverCandidateId(conventional)).toBe('conventional:taxable-first:0')
    expect(solverCandidateId(userBaseline)).toBe('baseline:taxable-first:0')
    expect(new Set([grid, conventional, userBaseline].map(solverCandidateId)).size).toBe(3)
  })

  it('resolves the MODAL collision: a non-custom userBaseline no longer aliases the conventional taxable-first:0', () => {
    // The fold's named gap: when the user's CURRENT strategy IS the common default (taxable-first),
    // the injected userBaseline and the enumerator's conventional baseline both minted `taxable-first:0`.
    const { candidates } = enumerateCandidates({
      anchor: {
        committed: { rmd: 0, conversion: 0, ongoingTaxable: 0, ssBenefit: 0, filing: 'mfj', count65: 0, calendarYear: 2026 },
        acaCliffMagi: null,
        irmaa: null,
        pretaxAvailableAtStart: 400_000,
        rmdAtStart: 0,
      },
      window: { startYearOffset: 0, years: 1 },
      userBaseline: { policy: 'taxable-first' },
    })
    const ids = candidates.map(solverCandidateId)
    // Injective by construction: the WHOLE enumerated set has no duplicate id.
    expect(new Set(ids).size).toBe(ids.length)
    // Both taxable-first:0 candidates exist, now DISTINCTLY (the two real points, different jobs).
    expect(ids).toContain('conventional:taxable-first:0')
    expect(ids).toContain('baseline:taxable-first:0')
  })

  it('a conversion arm carries its whole-dollar amount in the id', () => {
    const c: CandidateStrategy = {
      policy: 'taxable-first',
      conversion: { annualAmountReal: 20_000, startYearOffset: 0, years: 3 },
      provenance: 'grid',
    }
    expect(solverCandidateId(c)).toBe('grid:taxable-first:20000')
  })
})
