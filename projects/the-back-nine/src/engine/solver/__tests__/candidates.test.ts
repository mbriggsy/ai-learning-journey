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
import { irmaa, standardDeductionMFJ, ordinaryBracketsMFJ } from '@engine/constants'
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
  irmaaSchedule: null,
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
    expect(aca).toEqual([{ amountReal: 50_000, rail: { kind: 'aca-cliff', magi: 100_000 } }])
  })

  it('a committed-over household yields NO ACA anchor (nothing discretionary fits under the cliff)', () => {
    const over: CommittedYearIncome = { ...linearWorld, ongoingTaxable: 120_000 }
    const amounts = anchoredConversionAmounts(anchorWith({ committed: over, acaCliffMagi: 100_000 }))
    expect(amounts.some((a) => a.rail.kind === 'aca-cliff')).toBe(false)
  })

  it('IRMAA steps (linear world): one anchor per threshold above baseline, each = threshold − ongoing EXACTLY', () => {
    // ssBenefit 0 ⇒ IRMAA-MAGI = ordinary = ongoing 50,000 + amount (no inclusion ramp), so
    // each anchor is threshold − 50,000 — hand-composed from the canonical tier table.
    const schedule = irmaa.value
    const amounts = anchoredConversionAmounts(anchorWith({ irmaaSchedule: schedule }))
    const steps = amounts.filter((a) => a.rail.kind === 'irmaa-step')
    const expected = schedule.tiers
      .map((t) => t.mfjMagiThreshold)
      .map((thr) => thr - 50_000)
      .filter((a) => a >= 1)
    expect(steps.map((s) => s.amountReal)).toEqual(expected)
  })

  it('the JUST-UNDER LAW holds on every anchor, including the SS-coupled IRMAA ramp (the grid’s defining property)', () => {
    // A COUPLED world: ssBenefit 40k drives the Pub-915 inclusion, so the exact dollar is the
    // engine's own piecewise ramp — the property, not a re-derived dollar, is the pin.
    const coupled: CommittedYearIncome = { ...linearWorld, ssBenefit: 40_000, ongoingTaxable: 30_000 }
    const anchor = anchorWith({ committed: coupled, acaCliffMagi: 120_000, irmaaSchedule: irmaa.value })
    // RAIL CENSUS BEFORE THE LOOP (the c5e27180 shape, aimed at this arm's real hazard) — both
    // assertions below live INSIDE the loop. The list cannot go EMPTY in THIS world (the
    // bracket-edge branch, candidates.ts:263, is unguarded AND this household's 8,900 taxable
    // baseline sits under every finite edge — a baseline in the open top band would yield none,
    // and a sub-$1 amount is dropped), so the danger is not zero iterations: it is an anchor set
    // that silently LOSES A WHOLE RAIL, keeps iterating over the rails it still has, and reports
    // GREEN with this arm's titular subject — the SS-COUPLED IRMAA ramp — never touched. Nothing
    // else in the suite can catch that: this file is the only TEST that ENUMERATES a non-null
    // `irmaaSchedule`. The SHIPPED caller sets it for real — `solveAnchor.ts:176-180` assigns
    // `irmaa.value` for any healthcare-priced household with someone Medicare-enrolled at the bill
    // year, driven live by `solveDispatch.ts:73` — so this loss reaches the PRODUCT, not just the
    // suite; `solveAnchor.test.ts:122-128` asserts the anchor FIELD and never enumerates, and the
    // sibling arms are strictly weaker predicates (ascending / deduped / integer, lines 117-119)
    // which all survive a missing rail. So census the three INDEPENDENT branches (candidates.ts:235
    // ACA, :247 IRMAA, :263 bracket) by KIND, with counts read from the canonical year-keyed tables
    // rather than from the enumerator under test.
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
    const anchor = anchorWith({ acaCliffMagi: 100_000, irmaaSchedule: irmaa.value })
    const amounts = anchoredConversionAmounts(anchor).map((a) => a.amountReal)
    expect(amounts).toEqual([...amounts].sort((x, y) => x - y))
    expect(new Set(amounts).size).toBe(amounts.length)
    expect(amounts.every((a) => Number.isInteger(a) && a >= 1)).toBe(true)
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
      rail: { kind: 'aca-cliff', magi: 100_000 },
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
        irmaaSchedule: null,
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
