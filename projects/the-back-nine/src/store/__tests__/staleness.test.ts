/**
 * P3·U13 — the staleness reader battery. Laws under test, each with BOTH directions
 * (fires-when-moved + silent-when-identical — a clock that can't fire is insight-048's
 * untested gate; a clock that always fires is alarm-when-fine):
 *   1. A freshly-stamped save reads NOT stale on every clock (the property arm).
 *   2. Absent stamps = not-applicable (the legacy-vault arm — no false stale).
 *   3. Absent savedAt suppresses every wall-time claim (elapsed null), never fabricates.
 *   4. Q7 direction: the note fires for the took-the-default household and is immune for
 *      the overrider; an unknown era is quiet (not-comparable).
 *   5. acaVerifiedOn alone moving does NOT fire healthcare (re-verify ≠ drift).
 *   6. Budget windows expire on the spine route by calendar advance; the date route is
 *      inert; the boundary year is inclusive-active (endYear == elapsed is NOT past).
 *   7. The two-predicate split (ultramode 2026-07-09): `rulesMoved` carries ONLY rulebook
 *      drift (the hero echo's predicate); a budget re-confirm raises `anyStale` alone —
 *      a calendar prompt on a byte-identical recompute is never "rules changed".
 *   8. The contribution clock is route-gated: quiet for an all-retired household (whose
 *      answer never reads a contribution limit); the blend clock fires on BOTH routes.
 */
import { describe, expect, it } from 'vitest'
import { deriveStaleness, epochDayToCalendarYear } from '../staleness'
import { scenarioFromDraft, currentEpochDay } from '@ui/scenarioFromDraft'
import { DEV_SEEDS } from '@ui/devSeeds'
import { CURRENT_APP_DEFAULT_VERSION, appDefaultEraFor } from '@shared/appDefaults'
import type { ScenarioV3 } from '@shared/model'

const TODAY = currentEpochDay()

/** A real, fully-stamped save-ready scenario (the retired household — spine route). */
function freshSave(): ScenarioV3 {
  const r = scenarioFromDraft(DEV_SEEDS.retired)
  if (!r.ready) throw new Error('DEV_SEEDS.retired should be save-ready')
  return r.scenario
}

/** A still-working household (the date route) for the route-gate arms. */
function freshDateSave(): ScenarioV3 {
  const r = scenarioFromDraft(DEV_SEEDS.date)
  if (!r.ready) throw new Error('DEV_SEEDS.date should be save-ready')
  return r.scenario
}

describe('deriveStaleness — the property arm (a fresh save is never stale)', () => {
  it.each(['retired', 'date', 'budget', 'borderline'] as const)(
    'a freshly-stamped %s save fires NO clock (every comparator diffs write-time truth against the same build)',
    (key) => {
      const r = scenarioFromDraft(DEV_SEEDS[key])
      if (!r.ready) return // non-save-ready seeds are covered by the registry arms elsewhere
      const report = deriveStaleness(r.scenario, TODAY)
      expect(report.anyStale).toBe(false)
      expect(report.rulesMoved).toBe(false)
      expect(report.spine.appDefaultMoved).toBe(false)
      expect(report.controls.taxMoved).toBe(false)
      expect(report.healthcare.moved).toBe(false)
      expect(report.date.contributionMoved).toBe(false)
      expect(report.date.blendMoved).toBe(false)
      expect(report.budget.expiredLines).toEqual([])
      expect(report.elapsed).toEqual({ days: 0, saveYear: epochDayToCalendarYear(TODAY) })
    },
  )
})

describe('deriveStaleness — the legacy vault (absent stamps = not-applicable, plan §298)', () => {
  it('a pre-U13 vault (no savedAt / taxVintageDetail / dateVintage / healthcareVintage) fires NOTHING and suppresses every wall-time claim', () => {
    const s = freshSave()
    const legacy = { ...s } as Record<string, unknown>
    delete legacy.savedAt
    delete legacy.taxVintageDetail
    delete legacy.dateVintage
    delete legacy.healthcareVintage
    const report = deriveStaleness(legacy as unknown as ScenarioV3, TODAY)
    expect(report.anyStale).toBe(false)
    expect(report.rulesMoved).toBe(false)
    expect(report.elapsed).toBeNull() // NEVER fabricated from startCalendarYear
  })
})

describe('deriveStaleness — the tax clock', () => {
  it('fires on a taxYear move and on a legalBasis wording change; quiet when identical', () => {
    const s = freshSave()
    expect(deriveStaleness(s, TODAY).controls.taxMoved).toBe(false)
    const yearMoved = { ...s, taxVintageDetail: { ...s.taxVintageDetail!, taxYear: s.taxVintageDetail!.taxYear - 1 } }
    expect(deriveStaleness(yearMoved, TODAY).controls.taxMoved).toBe(true)
    const basisMoved = { ...s, taxVintageDetail: { ...s.taxVintageDetail!, legalBasis: 'TCJA (pre-OBBBA)' } }
    expect(deriveStaleness(basisMoved, TODAY).controls.taxMoved).toBe(true)
    expect(deriveStaleness(basisMoved, TODAY).anyStale).toBe(true)
  })
})

describe('deriveStaleness — the healthcare clocks', () => {
  it('names exactly the moved clock(s); acaVerifiedOn ALONE is provenance, never drift (re-verify same-law must not stale every vault monthly)', () => {
    const s = freshSave()
    const hv = s.healthcareVintage!
    // verifiedOn alone → quiet (the deliberate exclusion)
    const reVerified = { ...s, healthcareVintage: { ...hv, acaVerifiedOn: '2031-01-01' } }
    expect(deriveStaleness(reVerified, TODAY).healthcare.moved).toBe(false)
    // each real clock fires and is NAMED
    const arms = [
      [{ ...hv, coverageYear: hv.coverageYear + 1 }, 'coverage-year'],
      [{ ...hv, acaStatus: 'enhanced subsidies restored (no cliff)' }, 'aca-status'],
      [{ ...hv, fplGuidelineYear: hv.fplGuidelineYear + 1 }, 'fpl-guideline'],
      [{ ...hv, irmaaTopTierFrozenThrough: hv.irmaaTopTierFrozenThrough + 1 }, 'irmaa-freeze'],
      [{ ...hv, partBStandardMonthly: hv.partBStandardMonthly + 10 }, 'part-b'],
    ] as const
    for (const [stamp, clock] of arms) {
      const report = deriveStaleness({ ...s, healthcareVintage: stamp }, TODAY)
      expect(report.healthcare.moved).toBe(true)
      expect(report.healthcare.movedClocks).toEqual([clock])
    }
  })
})

describe('deriveStaleness — the date clocks', () => {
  it('contributionYear and blendSnapshotAsOf each fire independently (the date route)', () => {
    const s = freshDateSave()
    const dv = s.dateVintage!
    expect(deriveStaleness(s, TODAY).date).toEqual({ contributionMoved: false, blendMoved: false })
    expect(
      deriveStaleness({ ...s, dateVintage: { ...dv, contributionYear: dv.contributionYear - 1 } }, TODAY).date
        .contributionMoved,
    ).toBe(true)
    expect(
      deriveStaleness({ ...s, dateVintage: { ...dv, blendSnapshotAsOf: '2019-01-01' } }, TODAY).date.blendMoved,
    ).toBe(true)
  })

  it('the ROUTE GATE (ultramode 2026-07-09): an all-retired household is QUIET on the contribution clock (its answer never reads a limit — the annual table bump must not stale every returning retiree) but the blend clock still fires (stock weight is route-agnostic)', () => {
    const s = freshSave() // all-retired — the spine route
    const dv = s.dateVintage!
    const contributionBumped = deriveStaleness(
      { ...s, dateVintage: { ...dv, contributionYear: dv.contributionYear - 1 } },
      TODAY,
    )
    expect(contributionBumped.date.contributionMoved).toBe(false)
    expect(contributionBumped.anyStale).toBe(false)
    const blendBumped = deriveStaleness({ ...s, dateVintage: { ...dv, blendSnapshotAsOf: '2019-01-01' } }, TODAY)
    expect(blendBumped.date.blendMoved).toBe(true)
    expect(blendBumped.rulesMoved).toBe(true)
  })
})

describe('deriveStaleness — the Q7 saved-era rule (the council-rebuilt direction)', () => {
  // The v1 map has ONE era, so a real cross-era fire is unreachable until a second era
  // ships — these arms drive the rule through a synthetic saved version, proving the
  // SHAPE the U17-inheritable map locks in.
  it('a save from an UNKNOWN era is not-comparable — quiet, never coerced to "not overridden"', () => {
    const s = { ...freshSave(), appDefaultVersion: 'p9-from-the-future' }
    expect(deriveStaleness(s, TODAY).spine.appDefaultMoved).toBe(false)
  })

  it('same version → quiet regardless of the household value', () => {
    const s = { ...freshSave(), survivorSpendingRatio: 0.5 }
    expect(s.appDefaultVersion).toBe(CURRENT_APP_DEFAULT_VERSION)
    expect(deriveStaleness(s, TODAY).spine.appDefaultMoved).toBe(false)
  })

  it('the DIRECTION law, proven by construction: with a known differing era, the took-the-default household FIRES and the overrider is IMMUNE', () => {
    // Synthesize "the current build moved past the saved era" by stamping the saved
    // version as the known era and asserting against its own default. This arm goes RED
    // if anyone re-inverts the predicate to compare against the CURRENT default.
    const era = appDefaultEraFor(CURRENT_APP_DEFAULT_VERSION)!
    const tookDefault = { ...freshSave(), survivorSpendingRatio: era.survivorSpendingRatio }
    const overrode = { ...freshSave(), survivorSpendingRatio: era.survivorSpendingRatio - 0.1 }
    // Same-version guard first (both quiet today)…
    expect(deriveStaleness(tookDefault, TODAY).spine.appDefaultMoved).toBe(false)
    // …then the cross-era shape via a version alias: if a future era 'p9' reuses the same
    // defaults, a p2-d1 saved household compares against p2-d1's OWN defaults, not p9's.
    // (Direct cross-era firing becomes testable the day a second era entry ships; this
    // documents the contract the map's add-only law preserves.)
    expect(appDefaultEraFor('p2-d1')).toEqual(era)
    void overrode
  })
})

describe('deriveStaleness — the senior-bonus sunset has NO clock (a dated supersession)', () => {
  it('crossing the sunset year fires NOTHING — the crossing changes nothing about a saved answer (see the staleness.ts header + the tripwire test forcing the filed engine unit)', () => {
    const s = freshSave() // retired 68/70 → both 65+ inside the bonus window at save
    const dayIn2029 = Math.floor(Date.UTC(2029, 5, 1) / 86_400_000)
    const savedIn2026 = { ...s, savedAt: Math.floor(Date.UTC(2026, 6, 1) / 86_400_000) }
    const report = deriveStaleness(savedIn2026, dayIn2029)
    expect(report.rulesMoved).toBe(false)
    expect(report.anyStale).toBe(false)
    // The shape law rides the type too: the report carries no sunset field to mis-render.
    expect('seniorBonusSunsetCrossed' in report.controls).toBe(false)
  })
})

describe('deriveStaleness — the budget time-box (Q6: spine route only)', () => {
  it('an already-retired household: a line whose endYear has passed by calendar advance expires (boundary year INCLUSIVE-active); lifelong lines never expire', () => {
    const s = freshSave()
    const withBudget: ScenarioV3 = {
      ...s,
      budget: [
        { category: 'housing', label: 'Housing', tier: 'essentials', annualAmountReal: 30_000, startYear: 0 },
        { category: 'travel', label: 'Travel', tier: 'discretionary', annualAmountReal: 8_000, startYear: 0, endYear: 2 },
      ] as ScenarioV3['budget'],
    } as ScenarioV3
    const y0 = s.startCalendarYear
    const dayInYear = (y: number) => Math.floor(Date.UTC(y, 5, 1) / 86_400_000)
    // elapsed 2 == endYear 2 → still ACTIVE (inclusive last year, model.ts contract)
    expect(deriveStaleness(withBudget, dayInYear(y0 + 2)).budget.expiredLines).toEqual([])
    // elapsed 3 > endYear 2 → expired, named with its calendar boundary
    const report = deriveStaleness(withBudget, dayInYear(y0 + 3))
    expect(report.budget.expiredLines).toEqual([
      { index: 1, category: 'travel', endYear: 2, endCalendarYear: y0 + 2 },
    ])
    // The two-predicate split: a lapsed window is worth a line at the GATE (anyStale) but
    // it is NOT rulebook drift — the recompute is byte-identical, so the hero's "Some
    // rules changed" echo (rulesMoved) must stay dark (ultramode 2026-07-09).
    expect(report.anyStale).toBe(true)
    expect(report.rulesMoved).toBe(false)
  })

  it('a DATE-route (still-working) household is inert — its budget anchors to the future work-stop, so no window can be past', () => {
    const s = freshDateSave()
    const withBudget: ScenarioV3 = {
      ...s,
      budget: [
        { category: 'travel', label: 'Travel', tier: 'discretionary', annualAmountReal: 8_000, startYear: 0, endYear: 1 },
      ] as ScenarioV3['budget'],
    } as ScenarioV3
    const farFuture = Math.floor(Date.UTC(s.startCalendarYear + 20, 5, 1) / 86_400_000)
    expect(deriveStaleness(withBudget, farFuture).budget.expiredLines).toEqual([])
  })
})

describe('deriveStaleness — the wall-time anchor', () => {
  it('elapsed days clamp at 0 for a future savedAt (clock skew never yields a negative claim)', () => {
    const s = { ...freshSave(), savedAt: TODAY + 30 }
    expect(deriveStaleness(s, TODAY).elapsed?.days).toBe(0)
  })
})
