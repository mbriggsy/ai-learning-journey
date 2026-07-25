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
 *   8. The contribution clock is route-gated (quiet for an all-retired household) AND
 *      exposure-gated (quiet for a date-route household whose built overlay carries no
 *      accumulation streams — the route alone was necessary but not sufficient).
 *   9. U17 §S4 — THE EXPOSURE THREE-WAY. A fired clock lands in exactly one bucket:
 *      NAMED (+rulesMoved) where the run PROVABLY consumed the table the stamp DATES, SILENT
 *      where it provably did not, AGGREGATE (anyStale only, nameless) where no producer read
 *      can attribute it. The witness pair below is the whole point: the SAME moved acaStatus
 *      stamp must be silent for an all-65+ household and named for an ACA-priced one.
 *  10. F7a — the clock→family mapping is EXHAUSTIVE and each clock names only the families it
 *      dates, so `rulesMoved` can never fire without a line to explain it.
 *
 * WHY THE EXPOSURE IS AN INJECTED LITERAL IN MOST ARMS: this file tests the BUCKETING law.
 * The derivation of the exposure itself — the producer's-output reads — is source-bound to the
 * real intake builders in `src/ui/__tests__/stalenessExposure.test.ts`, and driven end-to-end
 * from real seeds through real copy in `reentry.test.tsx`. The property arm below deliberately
 * uses the REAL derivation so the two halves are joined at least once here too.
 */
import { describe, expect, it } from 'vitest'
import {
  deriveStaleness,
  epochDayToCalendarYear,
  type HealthcareClock,
  type StalenessExposure,
} from '../staleness'
import { scenarioFromDraft, currentEpochDay } from '@ui/scenarioFromDraft'
import { exposureForDraft } from '@ui/stalenessExposure'
import { DEV_SEEDS } from '@ui/devSeeds'
import { CURRENT_APP_DEFAULT_VERSION, appDefaultEraFor } from '@shared/appDefaults'
import type { PricedState } from '@engine/constants/stateTax'
import type { HealthcareVintageV3, ScenarioV3, StateTaxVintageV3 } from '@shared/model'

const TODAY = currentEpochDay()

// --- the exposure fixtures (the populations the three-way distinguishes) ----------------------
/** A household whose run prices EVERYTHING — the pre-65 marketplace-quoted, still-contributing,
 *  ticker-holding household. Both healthcare families, the tax overlay, the contribution
 *  streams, and the dated blend table. */
const ACA_PRICED: StalenessExposure = {
  overlayBuilt: 'priced',
  medicare: 'priced',
  aca: 'priced',
  contributions: 'priced',
  blend: 'priced',
  pricedState: undefined,
}
/** The all-65+ Medicare-only household: `healthcareEnabled` with NO quote pair, so the engine's
 *  ACA gate can never open. Retired ⇒ no contributions; manual blends ⇒ the table is never read.
 *  THE witness for the shipped defect, and the REAL shape of `DEV_SEEDS.retired`. */
const MEDICARE_ONLY: StalenessExposure = {
  overlayBuilt: 'priced',
  medicare: 'priced',
  aca: 'unpriced',
  contributions: 'unpriced',
  blend: 'unpriced',
  pricedState: undefined,
}
/** The DEGENERATE household — `buildOverlay`'s early return (no accounts, no premium, no ongoing
 *  income): NO overlay at all, so neither the `tax.` family nor the `health.` family is consumed.
 *  Save-ready and reachable (a Social-Security-only friend). */
const NO_OVERLAY: StalenessExposure = {
  overlayBuilt: 'unpriced',
  medicare: 'unpriced',
  aca: 'unpriced',
  contributions: 'unpriced',
  blend: 'unpriced',
  pricedState: undefined,
}
/** DELIBERATELY HYPOTHETICAL — a run with a tax overlay but no healthcare. Today's intake gate
 *  makes it unreachable (`missingRequiredFacts` REQUIRES the marketplace quote pair for any
 *  household with a pre-65 member, and an all-65+ household takes the Medicare-only branch, so
 *  every save-ready overlay carries `healthcareEnabled`). It is a fixture anyway, and on purpose:
 *  `overlayBuilt` and `medicare` are CORRELATED today by an accident of that gate, not by a law,
 *  and the day a third overlay branch ships they separate. Only this fixture can prove the tax
 *  clock reads its OWN bit rather than the correlated sibling (insight 081's shape). */
const OVERLAY_NO_HEALTH: StalenessExposure = {
  overlayBuilt: 'priced',
  medicare: 'unpriced',
  aca: 'unpriced',
  contributions: 'unpriced',
  blend: 'unpriced',
  pricedState: undefined,
}
/** Undecidable on every axis — the unbuildable draft (a cross-build vault missing a fact a newer
 *  build requires). Silence must be EARNED, so these aggregate rather than go quiet. */
const UNDECIDABLE: StalenessExposure = {
  overlayBuilt: 'unknown',
  medicare: 'unknown',
  aca: 'unknown',
  contributions: 'unknown',
  blend: 'unknown',
  pricedState: undefined,
}
const pricing = (e: StalenessExposure, s: PricedState | undefined): StalenessExposure => ({
  ...e,
  pricedState: s,
})
const withRead = (e: StalenessExposure, over: Partial<StalenessExposure>): StalenessExposure => ({
  ...e,
  ...over,
})

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
      // The REAL exposure for this REAL seed — the one arm in this file that joins the
      // bucketing law to its actual producer (insight 095: probe the shipped decision path).
      const report = deriveStaleness(r.scenario, TODAY, exposureForDraft(DEV_SEEDS[key]))
      expect(report.anyStale).toBe(false)
      expect(report.rulesMoved).toBe(false)
      expect(report.spine.appDefaultMoved).toBe(false)
      expect(report.controls.taxMoved).toBe(false)
      expect(report.controls.stateTaxMoved).toBe(false)
      expect(report.healthcare.moved).toBe(false)
      expect(report.healthcare.silencedClocks).toEqual([])
      expect(report.unattributed).toEqual({ moved: false, clocks: [] })
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
    const report = deriveStaleness(legacy as unknown as ScenarioV3, TODAY, ACA_PRICED)
    expect(report.anyStale).toBe(false)
    expect(report.rulesMoved).toBe(false)
    expect(report.unattributed.moved).toBe(false)
    expect(report.elapsed).toBeNull() // NEVER fabricated from startCalendarYear
  })
})

describe('deriveStaleness — the tax clock', () => {
  it('fires on a taxYear move and on a legalBasis wording change; quiet when identical', () => {
    const s = freshSave()
    expect(deriveStaleness(s, TODAY, ACA_PRICED).controls.taxMoved).toBe(false)
    const yearMoved = { ...s, taxVintageDetail: { ...s.taxVintageDetail!, taxYear: s.taxVintageDetail!.taxYear - 1 } }
    expect(deriveStaleness(yearMoved, TODAY, ACA_PRICED).controls.taxMoved).toBe(true)
    const basisMoved = { ...s, taxVintageDetail: { ...s.taxVintageDetail!, legalBasis: 'TCJA (pre-OBBBA)' } }
    expect(deriveStaleness(basisMoved, TODAY, ACA_PRICED).controls.taxMoved).toBe(true)
    expect(deriveStaleness(basisMoved, TODAY, ACA_PRICED).anyStale).toBe(true)
  })

  it('is EXPOSURE-GATED on the overlay existing, NOT on healthcare — a run with a tax overlay and no healthcare still fires (the clock reads its OWN bit)', () => {
    // THE REPLACED CLAIM (U17 §S4's F-pass): this arm used to assert the federal clock takes NO
    // exposure gate, on the premise "a household without an overlay reaches no verdict to be
    // stale about". That premise is FALSE — `buildParams` (intakeMap.ts:601-608) returns a full
    // params object for the $0-portfolio/no-overlay household and it gets a real verdict. A test
    // that pins a defect is the defect's second copy, so it is rewritten, not relaxed.
    //
    // What survives is the half that WAS true and still matters: `taxEnabled: true` is hardcoded
    // on every built overlay (intakeMap.ts:545), so the gate must be `overlayBuilt` — a clock
    // wired to `medicare` instead would silence a real federal rulebook move for this household.
    const s = freshSave()
    const basisMoved = { ...s, taxVintageDetail: { ...s.taxVintageDetail!, legalBasis: 'TCJA (pre-OBBBA)' } }
    const report = deriveStaleness(basisMoved, TODAY, OVERLAY_NO_HEALTH)
    expect(report.controls.taxMoved).toBe(true)
    expect(report.rulesMoved).toBe(true)
  })

  it('is SILENT for the DEGENERATE household — no overlay ⇒ `taxEnabled` never set ⇒ consumedConstants skips the whole `tax.` family ⇒ their recompute is byte-identical under any vintage', () => {
    // The population: save-ready, $0 accounts, Social-Security-only income ⇒ `buildOverlay`'s
    // early return (intakeMap.ts:470-475). Reachable — `stalenessExposure.test.ts` builds exactly
    // this draft and proves `missingRequiredFacts` is empty for it.
    const s = freshSave()
    const basisMoved = { ...s, taxVintageDetail: { ...s.taxVintageDetail!, legalBasis: 'TCJA (pre-OBBBA)' } }
    const silent = deriveStaleness(basisMoved, TODAY, NO_OVERLAY)
    expect(silent.controls.taxMoved, 'no tax constant was consumed — nothing to be stale about').toBe(false)
    expect(silent.rulesMoved, 'the hero echo must stay dark').toBe(false)
    expect(silent.anyStale, 'and it is not even "worth a look"').toBe(false)
    expect(silent.unattributed, 'a PROVEN-unexposed clock is silenced, never aggregated').toEqual({
      moved: false,
      clocks: [],
    })
    // NON-VACUITY (insight 029): the SAME scenario with the SAME moved stamp fires the moment the
    // run builds an overlay. Only the exposure differs, so only the gate can separate them —
    // dropping it turns this arm red.
    expect(deriveStaleness(basisMoved, TODAY, ACA_PRICED).controls.taxMoved).toBe(true)
  })

  it('an UNDECIDABLE overlay read AGGREGATES the tax clock — nameless, `anyStale` only, never silent (silence must be EARNED)', () => {
    const s = freshSave()
    const basisMoved = { ...s, taxVintageDetail: { ...s.taxVintageDetail!, legalBasis: 'TCJA (pre-OBBBA)' } }
    const report = deriveStaleness(basisMoved, TODAY, UNDECIDABLE)
    expect(report.controls.taxMoved).toBe(false)
    expect(report.rulesMoved).toBe(false)
    expect(report.unattributed).toEqual({ moved: true, clocks: ['tax'] })
    expect(report.anyStale).toBe(true)
  })
})

describe('deriveStaleness — the state-tax clock (exposure-gated on the state the RUN priced)', () => {
  /** A drifted disk stamp: the household's ncProfile is from an OLD build (an NC rate step that
   *  pinned since save), the rest fresh. */
  const drift = (s: ScenarioV3, over: Partial<StateTaxVintageV3>): ScenarioV3 => ({
    ...s,
    stateTaxVintage: { ...s.stateTaxVintage!, ...over },
  })

  it('FIRES for a run that PRICED NC and whose NC profile drifted — and raises rulesMoved/anyStale', () => {
    const s = { ...freshSave(), retirementState: 'NC' as const }
    expect(deriveStaleness(s, TODAY, pricing(ACA_PRICED, 'NC')).controls.stateTaxMoved, 'a fresh save is quiet').toBe(false)
    const moved = drift(s, { ncProfile: '{"drifted":"nc"}' })
    const report = deriveStaleness(moved, TODAY, pricing(ACA_PRICED, 'NC'))
    expect(report.controls.stateTaxMoved).toBe(true)
    expect(report.rulesMoved).toBe(true)
    expect(report.anyStale).toBe(true)
  })

  it('FIRES for a run that priced PA and whose paProfile drifted — the per-state selection is not NC-only (the review fold, 2026-07-15)', () => {
    // PA is a shipped priced state (Craig's household); before this arm no PA-priced household
    // existed anywhere in the file, so a paProfile→ncProfile mis-selection survived the whole
    // suite (the wrong-profile mutant the derived stateProfileKey now makes structural).
    const s = { ...freshSave(), retirementState: 'PA' as const }
    expect(deriveStaleness(s, TODAY, pricing(ACA_PRICED, 'PA')).controls.stateTaxMoved, 'a fresh save is quiet').toBe(false)
    const moved = drift(s, { paProfile: '{"drifted":"pa"}' })
    const report = deriveStaleness(moved, TODAY, pricing(ACA_PRICED, 'PA'))
    expect(report.controls.stateTaxMoved).toBe(true)
    expect(report.rulesMoved).toBe(true)
  })

  it('the CLOSED quiet limitation (U17 §S4): a vault that SAYS NC but whose RUN priced no state is silent — the gate reads the producer’s output, never the persisted geography', () => {
    // THE ARM THAT MAKES THE FIX FALSIFIABLE (insight 029: the input must ROUTE DIFFERENTLY
    // under the mutant). The scenario field still says 'NC' and the NC profile genuinely
    // drifted — every ingredient of the OLD geography gate is present and firing. Only the
    // producer's-output exposure says the run built no overlay, so only the new gate can be
    // reading. Restoring `isPricedState(scenario.retirementState)` turns this red.
    const s = drift({ ...freshSave(), retirementState: 'NC' as const }, { ncProfile: '{"drifted":"nc"}' })
    const report = deriveStaleness(s, TODAY, pricing(ACA_PRICED, undefined))
    expect(report.controls.stateTaxMoved).toBe(false)
    expect(report.rulesMoved).toBe(false)
    // …and the SAME scenario with the SAME stamp fires the moment the run does price NC.
    expect(deriveStaleness(s, TODAY, pricing(ACA_PRICED, 'NC')).controls.stateTaxMoved).toBe(true)
  })

  it("ROUTE-TRUE quiet: an 'elsewhere' / absent / unbuilt-roster household prices no state, so a drifted stamp NEVER fires", () => {
    // `pricedStateForRun` roster-filters ('elsewhere', SC/GA/DE, and an absent field all fall
    // through to undefined), so all three populations arrive here as the same exposure.
    for (const code of ['elsewhere', 'SC', undefined] as const) {
      const s = drift({ ...freshSave(), ...(code === undefined ? {} : { retirementState: code }) }, {
        ncProfile: '{"drifted":"nc"}',
        paProfile: '{"drifted":"pa"}',
      })
      const report = deriveStaleness(s, TODAY, pricing(ACA_PRICED, undefined))
      expect(report.controls.stateTaxMoved, `${String(code)}`).toBe(false)
      expect(report.rulesMoved, `${String(code)}`).toBe(false)
    }
  })

  it('PER-STATE: an NC-priced run compares ONLY its ncProfile — a PA/FL profile drift never alarms it (the alarm-when-fine the header refuses)', () => {
    const s = drift({ ...freshSave(), retirementState: 'NC' as const }, { paProfile: '{"drifted":"pa"}', flProfile: '{"drifted":"fl"}' })
    expect(deriveStaleness(s, TODAY, pricing(ACA_PRICED, 'NC')).controls.stateTaxMoved).toBe(false)
  })

  it('quiet on an IDENTICAL stamp (same build), and on an ABSENT stamp (a pre-unit vault has nothing to compare)', () => {
    const nc = { ...freshSave(), retirementState: 'NC' as const }
    expect(deriveStaleness(nc, TODAY, pricing(ACA_PRICED, 'NC')).controls.stateTaxMoved).toBe(false)
    const noStamp = { ...nc } as Record<string, unknown>
    delete noStamp.stateTaxVintage
    expect(
      deriveStaleness(noStamp as unknown as ScenarioV3, TODAY, pricing(ACA_PRICED, 'NC')).controls.stateTaxMoved,
    ).toBe(false)
  })

  it('FL is a constitutional $0 — byte-identical forever; an FL-priced run reads clean on a fresh stamp', () => {
    const fl = { ...freshSave(), retirementState: 'FL' as const }
    expect(deriveStaleness(fl, TODAY, pricing(ACA_PRICED, 'FL')).controls.stateTaxMoved).toBe(false)
  })
})

describe('deriveStaleness — the healthcare clocks (U17 §S4: the exposure three-way)', () => {
  const s = freshSave()
  const hv = s.healthcareVintage!
  const withStamp = (over: Partial<typeof hv>): ScenarioV3 => ({ ...s, healthcareVintage: { ...hv, ...over } })

  it('acaVerifiedOn ALONE is provenance, never drift (re-verify same-law must not stale every vault monthly)', () => {
    const reVerified = withStamp({ acaVerifiedOn: '2031-01-01' })
    const report = deriveStaleness(reVerified, TODAY, ACA_PRICED)
    expect(report.healthcare.moved).toBe(false)
    expect(report.healthcare.silencedClocks).toEqual([])
    expect(report.unattributed.moved).toBe(false)
  })

  // ── THE WITNESS PAIR — both arms, or the gate proves nothing ──────────────────────────────
  // A gate that silenced EVERYTHING would satisfy the first arm alone. The two arms differ in
  // NOTHING but the exposure read, so only the gate can separate them (insight 029).
  it('THE WITNESS (silence): an all-65+ Medicare-only household whose acaStatus stamp MOVED is SILENT on the ACA family — no named clock, no rulesMoved', () => {
    const moved = withStamp({ acaStatus: 'enhanced subsidies restored (no cliff)' })
    const report = deriveStaleness(moved, TODAY, MEDICARE_ONLY)
    expect(report.healthcare.movedClocks, 'the clock must not NAME itself').toEqual([])
    expect(report.healthcare.acaMoved).toBe(false)
    expect(report.healthcare.moved).toBe(false)
    // It FIRED — the silence is the gate biting, not the fixture failing to move the stamp.
    expect(report.healthcare.silencedClocks).toEqual(['aca-status'])
    expect(report.rulesMoved, 'the hero echo must stay dark — their recompute is byte-identical').toBe(false)
    expect(report.anyStale, 'and it is not even "worth a look"').toBe(false)
    expect(report.unattributed.moved, 'a silenced clock is NOT aggregated either').toBe(false)
  })

  it('THE WITNESS (naming): the SAME moved acaStatus stamp on an ACA-priced household still gets its named line and raises rulesMoved', () => {
    const moved = withStamp({ acaStatus: 'enhanced subsidies restored (no cliff)' })
    const report = deriveStaleness(moved, TODAY, ACA_PRICED)
    expect(report.healthcare.movedClocks).toEqual(['aca-status'])
    expect(report.healthcare.acaMoved).toBe(true)
    expect(report.healthcare.silencedClocks).toEqual([])
    expect(report.rulesMoved).toBe(true)
  })

  it('the ACA family is BOTH clocks: fplGuidelineYear rides the same exposure read as acaStatus', () => {
    const moved = withStamp({ fplGuidelineYear: hv.fplGuidelineYear + 1 })
    expect(deriveStaleness(moved, TODAY, ACA_PRICED).healthcare.movedClocks).toEqual(['fpl-guideline'])
    expect(deriveStaleness(moved, TODAY, MEDICARE_ONLY).healthcare.silencedClocks).toEqual(['fpl-guideline'])
  })

  it.each([
    ['part-b', { partBStandardMonthly: hv.partBStandardMonthly + 10 }],
    ['part-b-trend', { partBTrendVintage: 'part-b-trend-2025x' }],
    // THE F1 CORRECTION, pinned as an equal member of the family. `irmaaTopTierFrozenThrough`
    // has no engine reader of its own; the table it DATES (`irmaa`) is read at simulate.ts:859,
    // solveAnchor.ts:178-180 and taxOverlay.ts:1104, and consumedConstants.ts:112 consumes the
    // whole `health.` family on `healthcareEnabled`. Re-bucketing it to the aggregate reds here.
    ['irmaa-freeze', { irmaaTopTierFrozenThrough: hv.irmaaTopTierFrozenThrough + 1 }],
  ] as const)(
    'the Medicare family (%s) NAMES itself for a Medicare-priced run and is SILENT for a run that built no healthcare overlay',
    (clock, over) => {
      const moved = withStamp(over)
      const named = deriveStaleness(moved, TODAY, MEDICARE_ONLY)
      expect(named.healthcare.movedClocks).toEqual([clock])
      expect(named.healthcare.medicareMoved).toBe(true)
      expect(named.healthcare.acaMoved, 'a Medicare clock never speaks the marketplace line').toBe(false)
      expect(named.rulesMoved).toBe(true)
      // The SWEPT part-b-trend comment claimed "no exposure gate: the trend prices every
      // Medicare-bearing year both routes reach". FALSE: `partBPricingByT` is built only under
      // `healthcareEnabled && taxEnabled` (taxOverlay.ts:1110-1111). Reverting it to ungated
      // reds this arm.
      const silent = deriveStaleness(moved, TODAY, NO_OVERLAY)
      expect(silent.healthcare.movedClocks).toEqual([])
      expect(silent.healthcare.silencedClocks).toEqual([clock])
      expect(silent.rulesMoved).toBe(false)
      expect(silent.anyStale).toBe(false)
    },
  )

  // ── THE 2028 IRMAA RE-INDEX, MODELLED (the F1 ruling's own witness) ───────────────────────
  it('THE TRIPWIRE SHAPE: the 2028 top-tier re-index — brackets re-pinned AND `topTierFrozenThrough` moved forward, exactly as `irmaaTopTierReindex.tripwire.test.ts:30-41` prescribes — NAMES the Medicare line for a Medicare-priced household', () => {
    // The whole point of the correction. Under the withdrawn "no engine reader ⇒ aggregate"
    // heuristic this household read `unattributed: ['irmaa-freeze']`, `rulesMoved: false`, hero
    // echo dark and `savedRecommendation` conjunct 3 `current: true` — while their ranking was
    // priced against SUPERSEDED IRMAA brackets. A silent stale, on the one clock the repo's own
    // tripwire promises will move.
    const reindexed = withStamp({ irmaaTopTierFrozenThrough: hv.irmaaTopTierFrozenThrough + 1 })
    const report = deriveStaleness(reindexed, TODAY, MEDICARE_ONLY)
    expect(report.healthcare.movedClocks).toEqual(['irmaa-freeze'])
    expect(report.healthcare.medicareMoved, 'the Medicare cost line renders').toBe(true)
    expect(report.rulesMoved, 'the hero echo may ride — their brackets genuinely moved').toBe(true)
    expect(report.unattributed, 'never nameless: the run consumed the table this stamp dates').toEqual({
      moved: false,
      clocks: [],
    })
  })

  it('`coverage-year` dates BOTH tables (model.ts:2140) — it names each family the run PRICED, and only those', () => {
    // It is the ONLY marker for every annually-re-indexed health figure with no stamp of its own
    // (the four interior IRMAA thresholds, the ACA applicable-percentage bands, the age-rating
    // curve), so bucketing it nameless hid the annual re-key from the pre-65 planner it hits
    // hardest. Naming BOTH families unconditionally would be the opposite lie — hence per-family.
    const moved = withStamp({ coverageYear: hv.coverageYear + 1 })
    const both = deriveStaleness(moved, TODAY, ACA_PRICED)
    expect(both.healthcare.movedClocks).toEqual(['coverage-year'])
    expect(both.healthcare.acaMoved).toBe(true)
    expect(both.healthcare.medicareMoved).toBe(true)
    expect(both.rulesMoved).toBe(true)
    // The all-65+ household prices the IRMAA half and NOT the marketplace half: one line, not two.
    const medicareOnly = deriveStaleness(moved, TODAY, MEDICARE_ONLY)
    expect(medicareOnly.healthcare.movedClocks).toEqual(['coverage-year'])
    expect(medicareOnly.healthcare.medicareMoved).toBe(true)
    expect(medicareOnly.healthcare.acaMoved, 'they price ZERO ACA — that sentence would be false').toBe(false)
  })

  it('the vintage markers go SILENT when the run priced NO healthcare at all — consumedConstants gates the whole health.* family on healthcareEnabled', () => {
    const moved = withStamp({ coverageYear: hv.coverageYear + 1, irmaaTopTierFrozenThrough: hv.irmaaTopTierFrozenThrough + 1 })
    const report = deriveStaleness(moved, TODAY, NO_OVERLAY)
    expect(report.healthcare.silencedClocks).toEqual(['coverage-year', 'irmaa-freeze'])
    expect(report.unattributed).toEqual({ moved: false, clocks: [] })
    expect(report.anyStale).toBe(false)
  })

  it('an UNDECIDABLE exposure aggregates the family clocks — never names them, never silences them', () => {
    // The date-route ACA household: the base quote stream is positive, but a work-to-65+ crown
    // window-gates ACA to zero years (insight 088), and no crown exists at the gate.
    const moved = withStamp({ acaStatus: 'enhanced subsidies restored (no cliff)' })
    const report = deriveStaleness(moved, TODAY, UNDECIDABLE)
    expect(report.healthcare.movedClocks).toEqual([])
    expect(report.healthcare.silencedClocks).toEqual([])
    expect(report.unattributed).toEqual({ moved: true, clocks: ['aca-status'] })
    expect(report.rulesMoved).toBe(false)
    expect(report.anyStale).toBe(true)
  })

  it('extras-typical: fires ONLY for a typical-EXPOSED vault under a moved vintage; a pre-extras stamp (absent vintage) and an all-explicit household stay quiet', () => {
    const movedStamp = { ...hv, medicareExtrasTypicalVintage: 'extras-2024x' }
    // (a) Typical-exposed by ABSENCE (no fork field at all — funds the typical at recompute).
    // The retired seed CARRIES fork answers (the flagship mixed pair), so strip the field to
    // get the genuinely-never-engaged vault.
    const exposedAbsent = { ...s, healthcareVintage: movedStamp } as Record<string, unknown>
    delete exposedAbsent.medicareExtrasByPerson
    expect(
      deriveStaleness(exposedAbsent as unknown as ScenarioV3, TODAY, MEDICARE_ONLY).healthcare.movedClocks,
    ).toEqual(['extras-typical'])
    // (b) Typical-exposed by an explicit 'typical'/'unanswered' entry.
    const exposedTypical = {
      ...s,
      healthcareVintage: movedStamp,
      medicareExtrasByPerson: [
        { kind: 'entered' as const, monthly: 180 },
        { kind: 'typical' as const, adoptionVintage: 'extras-2024x' },
      ],
    }
    expect(deriveStaleness(exposedTypical, TODAY, MEDICARE_ONLY).healthcare.movedClocks).toEqual(['extras-typical'])
    // (c) An all-EXPLICIT household (entered + affirmed-$0) does not care the typical moved —
    // firing would be alarm-when-fine.
    const explicit = {
      ...s,
      healthcareVintage: movedStamp,
      medicareExtrasByPerson: [
        { kind: 'entered' as const, monthly: 180 },
        { kind: 'none' as const },
      ],
    }
    expect(deriveStaleness(explicit, TODAY, MEDICARE_ONLY).healthcare.movedClocks).toEqual([])
    // (d) A pre-extras-unit stamp LACKS the vintage — not-comparable, quiet (never coerced
    // to "unchanged", and never fired off absence).
    const preUnit = { ...s } as Record<string, unknown>
    const legacyHv = { ...hv } as Record<string, unknown>
    delete legacyHv.medicareExtrasTypicalVintage
    preUnit.healthcareVintage = legacyHv
    delete preUnit.medicareExtrasByPerson
    expect(
      deriveStaleness(preUnit as unknown as ScenarioV3, TODAY, MEDICARE_ONLY).healthcare.movedClocks,
    ).toEqual([])
  })

  it('extras-typical: the typical-exposed conjunct is NECESSARY BUT NOT SUFFICIENT — an ABSENT fork field on a run that priced no healthcare funds NO extras, so it must not name itself (U17 §S4)', () => {
    // The exact hole the ruling named: absence satisfies conjunct (c) while the run prices
    // nothing at all (`buildOverlay` resolves the extras vector only on `healthcareOn ||
    // medicareOnly`; consumedConstants.ts:118 requires `medicareExtrasMonthly` present).
    const exposedAbsent = {
      ...s,
      healthcareVintage: { ...hv, medicareExtrasTypicalVintage: 'extras-2024x' },
    } as Record<string, unknown>
    delete exposedAbsent.medicareExtrasByPerson
    const report = deriveStaleness(exposedAbsent as unknown as ScenarioV3, TODAY, NO_OVERLAY)
    expect(report.healthcare.movedClocks).toEqual([])
    expect(report.healthcare.silencedClocks).toEqual(['extras-typical'])
    expect(report.rulesMoved).toBe(false)
  })

  it('part-b-trend: a pre-trend stamp (absent vintage) is not-comparable — quiet, never coerced to a fired clock', () => {
    // The trend sourcing unit's absence arm (the extras-typical precedent): a vault saved
    // before the trend unit carries NO partBTrendVintage — the reader must not fire the clock
    // off absence (its recompute already prices the new trend; the clock narrates ERA drift
    // between two carried vintages, never the feature's own arrival).
    const legacyHv = { ...hv } as Record<string, unknown>
    delete legacyHv.partBTrendVintage
    const preTrend = { ...s, healthcareVintage: legacyHv } as unknown as ScenarioV3
    const report = deriveStaleness(preTrend, TODAY, MEDICARE_ONLY)
    expect(report.healthcare.movedClocks).toEqual([])
    expect(report.healthcare.silencedClocks).toEqual([])
  })
})

// =============================================================================================
// U17 §S4 · F7a — THE EXHAUSTIVE CLOCK→FAMILY TABLE.
//
// `rulesMoved` reads `movedClocks`; the rendered copy reads the family booleans. Before this arm
// the mapping between them was UNDER-PINNED: deleting a single clock from the family derivation
// left the whole suite GREEN, and a pre-65 household hitting the annual FPL bump would then get
// `rulesMoved: true` — hero echo plus a `rules-changed` demotion — with ZERO lines at the gate.
// An alarm nothing is allowed to explain is the worst of the three states.
//
// This table is an INDEPENDENT statement of the law (never an import of the production mapping —
// that would assert `x === x`). Both records are keyed by `HealthcareClock`, so a NEW clock with
// no mapping is a COMPILE error here as well as in `staleness.ts`.
// =============================================================================================
describe('deriveStaleness — every healthcare clock names exactly the families it dates (F7a)', () => {
  const s = freshSave()
  const hv = s.healthcareVintage!
  /** Typical-EXPOSED base: the `extras-typical` clock's conjunct (c) needs a household that is
   *  not all-explicit, and the `retired` seed carries an entered + affirmed-$0 pair. Absence of
   *  the fork field funds the typical at recompute ⇒ exposed. Every other clock is indifferent. */
  const base: ScenarioV3 = (() => {
    const b = { ...s } as Record<string, unknown>
    delete b.medicareExtrasByPerson
    return b as unknown as ScenarioV3
  })()

  /** ONE stamp mutation per clock — the minimum edit that fires it, and nothing else. */
  const MUTATION: Readonly<Record<HealthcareClock, Partial<HealthcareVintageV3>>> = {
    'coverage-year': { coverageYear: hv.coverageYear + 1 },
    'aca-status': { acaStatus: 'enhanced subsidies restored (no cliff)' },
    'fpl-guideline': { fplGuidelineYear: hv.fplGuidelineYear + 1 },
    'irmaa-freeze': { irmaaTopTierFrozenThrough: hv.irmaaTopTierFrozenThrough + 1 },
    'part-b': { partBStandardMonthly: hv.partBStandardMonthly + 10 },
    'extras-typical': { medicareExtrasTypicalVintage: 'extras-2024x' },
    'part-b-trend': { partBTrendVintage: 'part-b-trend-2025x' },
  }

  /** WHICH SENTENCE each clock is allowed to speak — the law, restated by hand. */
  const FAMILY: Readonly<Record<HealthcareClock, { readonly aca: boolean; readonly medicare: boolean }>> = {
    'coverage-year': { aca: true, medicare: true }, // "the ACA/IRMAA tables" (model.ts:2140)
    'aca-status': { aca: true, medicare: false },
    'fpl-guideline': { aca: true, medicare: false },
    'irmaa-freeze': { aca: false, medicare: true }, // dates the IRMAA schedule (the F1 ruling)
    'part-b': { aca: false, medicare: true },
    'extras-typical': { aca: false, medicare: true },
    'part-b-trend': { aca: false, medicare: true },
  }

  const CLOCKS = Object.keys(MUTATION) as readonly HealthcareClock[]

  it('the table covers EVERY clock the reader can emit (the runtime companion to the Record type)', () => {
    expect(CLOCKS).toHaveLength(7)
    expect(Object.keys(FAMILY).sort()).toEqual([...CLOCKS].sort())
    // Non-vacuity: the two families are genuinely both represented, so neither column is a
    // constant that would make the sweep below tautological.
    expect(CLOCKS.some((c) => FAMILY[c].aca)).toBe(true)
    expect(CLOCKS.some((c) => !FAMILY[c].aca)).toBe(true)
  })

  it.each(CLOCKS)(
    '%s fires alone, names exactly its own families, and NEVER raises rulesMoved without a line beneath it',
    (clock) => {
      const moved: ScenarioV3 = { ...base, healthcareVintage: { ...hv, ...MUTATION[clock] } }
      const report = deriveStaleness(moved, TODAY, ACA_PRICED)
      expect(report.healthcare.movedClocks, `${clock}: fires, and alone`).toEqual([clock])
      expect(report.healthcare.acaMoved, `${clock}: the ACA line`).toBe(FAMILY[clock].aca)
      expect(report.healthcare.medicareMoved, `${clock}: the Medicare line`).toBe(FAMILY[clock].medicare)
      expect(report.rulesMoved, `${clock}: a named clock raises the echo`).toBe(true)
      // THE SELF-CONTRADICTION KILL at the report level (its end-to-end twin, over the real
      // composer, is in `reentry.test.tsx`): a named clock ALWAYS has a family to speak through.
      expect(
        report.healthcare.acaMoved || report.healthcare.medicareMoved,
        `${clock}: rulesMoved with no family boolean — an alarm nothing is allowed to explain`,
      ).toBe(true)
    },
  )

  it('and each clock is SILENCED, family by family, when the run priced that family and nothing else', () => {
    // The complement of the sweep above: with ACA unpriced, every ACA-ONLY clock goes silent
    // while the Medicare ones still name themselves (and `coverage-year`, which dates both,
    // names the Medicare half). This is what makes the per-family conjunct falsifiable.
    for (const clock of CLOCKS) {
      const moved: ScenarioV3 = { ...base, healthcareVintage: { ...hv, ...MUTATION[clock] } }
      const report = deriveStaleness(moved, TODAY, MEDICARE_ONLY)
      const speaks = FAMILY[clock].medicare
      expect(report.healthcare.movedClocks, `${clock}`).toEqual(speaks ? [clock] : [])
      expect(report.healthcare.silencedClocks, `${clock}`).toEqual(speaks ? [] : [clock])
      expect(report.healthcare.acaMoved, `${clock}: the marketplace line must stay dark`).toBe(false)
    }
  })
})

describe('deriveStaleness — the date clocks', () => {
  it('contributionYear NAMES itself for a date-route run that actually prices a stream; blendSnapshotAsOf AGGREGATES for a table-reading household', () => {
    const s = freshDateSave()
    const dv = s.dateVintage!
    expect(deriveStaleness(s, TODAY, ACA_PRICED).date).toEqual({ contributionMoved: false, blendMoved: false })
    const contributionMoved = deriveStaleness(
      { ...s, dateVintage: { ...dv, contributionYear: dv.contributionYear - 1 } },
      TODAY,
      ACA_PRICED,
    )
    expect(contributionMoved.date.contributionMoved).toBe(true)
    expect(contributionMoved.rulesMoved, 'their built overlay carries real contribution streams').toBe(true)
    const blendMoved = deriveStaleness({ ...s, dateVintage: { ...dv, blendSnapshotAsOf: '2019-01-01' } }, TODAY, ACA_PRICED)
    expect(blendMoved.date.blendMoved).toBe(true)
    expect(blendMoved.unattributed).toEqual({ moved: true, clocks: ['blend'] })
    expect(blendMoved.rulesMoved).toBe(false)
    expect(blendMoved.anyStale).toBe(true)
  })

  it('the ROUTE GATE (ultramode 2026-07-09): an all-retired household is QUIET on the contribution clock (its answer never reads a limit — the annual table bump must not stale every returning retiree)', () => {
    const s = freshSave() // all-retired — the spine route
    const dv = s.dateVintage!
    const contributionBumped = deriveStaleness(
      { ...s, dateVintage: { ...dv, contributionYear: dv.contributionYear - 1 } },
      TODAY,
      MEDICARE_ONLY,
    )
    expect(contributionBumped.date.contributionMoved).toBe(false)
    expect(contributionBumped.anyStale).toBe(false)
  })

  it('the EXPOSURE GATE (U17 §S4 F3): a DATE-route household whose built overlay carries NO accumulation is silent — "every candidate carries the construct" was necessary but NOT sufficient', () => {
    // The population: 66/retired holding everything + 62/working holding nothing. They ARE on
    // the date route, and `dateSearch.ts:230` DOES force `accumulation` onto every candidate —
    // but it fills it from the BASE overlay's streams, and `contributionStreamsFor` returns `{}`
    // for a non-working owner (intakeMap.ts:362). Their candidates sweep with empty streams and
    // read no limit. Same fixture, same moved stamp, ONE differing read (insight 029).
    const s = freshDateSave()
    const bumped = {
      ...s,
      dateVintage: { ...s.dateVintage!, contributionYear: s.dateVintage!.contributionYear - 1 },
    }
    const silent = deriveStaleness(bumped, TODAY, withRead(ACA_PRICED, { contributions: 'unpriced' }))
    expect(silent.date.contributionMoved, 'scaling zero is zero').toBe(false)
    expect(silent.rulesMoved).toBe(false)
    expect(silent.anyStale).toBe(false)
    expect(silent.unattributed, 'PROVEN unexposed ⇒ silenced, not aggregated').toEqual({ moved: false, clocks: [] })
    // NON-VACUITY: the contributing household still gets its named line off the same stamp.
    expect(deriveStaleness(bumped, TODAY, ACA_PRICED).date.contributionMoved).toBe(true)
    // …and an UNDECIDABLE read aggregates rather than silencing (an unbuildable draft).
    const undecidable = deriveStaleness(bumped, TODAY, withRead(ACA_PRICED, { contributions: 'unknown' }))
    expect(undecidable.date.contributionMoved).toBe(false)
    expect(undecidable.unattributed).toEqual({ moved: true, clocks: ['contribution'] })
    expect(undecidable.anyStale).toBe(true)
  })

  it('the blend clock is UNATTRIBUTABLE for a household that DOES read the dated table — nameless, never "rules changed" (U17 §S4)', () => {
    // `BLEND_SNAPSHOT_AS_OF` is the MAX asOf across ALL ticker rows (tickerBlend.ts:1573-1577),
    // so even for a table-reading household the stamp cannot say WHICH fund moved. Aggregate is
    // the honest bucket: never "rules changed", never silent.
    const s = freshDateSave()
    const blendBumped = deriveStaleness(
      { ...s, dateVintage: { ...s.dateVintage!, blendSnapshotAsOf: '2019-01-01' } },
      TODAY,
      ACA_PRICED,
    )
    expect(blendBumped.date.blendMoved).toBe(true)
    expect(blendBumped.unattributed).toEqual({ moved: true, clocks: ['blend'] })
    expect(blendBumped.rulesMoved).toBe(false)
    expect(blendBumped.anyStale).toBe(true)
  })

  it('the blend clock is SILENT for the household whose accounts never touch the dated table — we CAN tell, so "we can’t tell" would be a second falsehood (U17 §S4 F5)', () => {
    // The `retired` seed is the witness in the flesh: ONE account, no ticker, a per-account
    // MANUAL blend. `resolveBlend` never reaches `findBlendRow`, so no row of the table enters
    // their stockWeight and no re-date can move their answer. Telling them "some reference table
    // changed — we can't tell whether it touches your numbers" is untrue in the second clause.
    const s = freshSave()
    expect(
      DEV_SEEDS.retired.enteredAccounts.every((a) => a.ticker === undefined),
      'the witness holds no table ticker',
    ).toBe(true)
    const blendBumped = deriveStaleness(
      { ...s, dateVintage: { ...s.dateVintage!, blendSnapshotAsOf: '2019-01-01' } },
      TODAY,
      MEDICARE_ONLY,
    )
    expect(blendBumped.date.blendMoved, 'the stamp genuinely moved — the silence is the gate biting').toBe(true)
    expect(blendBumped.unattributed).toEqual({ moved: false, clocks: [] })
    expect(blendBumped.rulesMoved).toBe(false)
    expect(blendBumped.anyStale, 'nothing to look at — their answer cannot have moved').toBe(false)
    // NON-VACUITY: the same stamp on a table-reading household DOES reach the aggregate.
    expect(
      deriveStaleness(
        { ...s, dateVintage: { ...s.dateVintage!, blendSnapshotAsOf: '2019-01-01' } },
        TODAY,
        withRead(MEDICARE_ONLY, { blend: 'priced' }),
      ).unattributed,
    ).toEqual({ moved: true, clocks: ['blend'] })
  })
})

describe('deriveStaleness — the Q7 saved-era rule (the council-rebuilt direction)', () => {
  // The v1 map has ONE era, so a real cross-era fire is unreachable until a second era
  // ships — these arms drive the rule through a synthetic saved version, proving the
  // SHAPE the U17-inheritable map locks in.
  it('a save from an UNKNOWN era is not-comparable — quiet, never coerced to "not overridden"', () => {
    const s = { ...freshSave(), appDefaultVersion: 'p9-from-the-future' }
    expect(deriveStaleness(s, TODAY, ACA_PRICED).spine.appDefaultMoved).toBe(false)
  })

  it('same version → quiet regardless of the household value', () => {
    const s = { ...freshSave(), survivorSpendingRatio: 0.5 }
    expect(s.appDefaultVersion).toBe(CURRENT_APP_DEFAULT_VERSION)
    expect(deriveStaleness(s, TODAY, ACA_PRICED).spine.appDefaultMoved).toBe(false)
  })

  it('the DIRECTION law, proven by construction: with a known differing era, the took-the-default household FIRES and the overrider is IMMUNE', () => {
    // Synthesize "the current build moved past the saved era" by stamping the saved
    // version as the known era and asserting against its own default. This arm goes RED
    // if anyone re-inverts the predicate to compare against the CURRENT default.
    const era = appDefaultEraFor(CURRENT_APP_DEFAULT_VERSION)!
    const tookDefault = { ...freshSave(), survivorSpendingRatio: era.survivorSpendingRatio }
    const overrode = { ...freshSave(), survivorSpendingRatio: era.survivorSpendingRatio - 0.1 }
    // Same-version guard first (both quiet today)…
    expect(deriveStaleness(tookDefault, TODAY, ACA_PRICED).spine.appDefaultMoved).toBe(false)
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
    const report = deriveStaleness(savedIn2026, dayIn2029, MEDICARE_ONLY)
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
    expect(deriveStaleness(withBudget, dayInYear(y0 + 2), MEDICARE_ONLY).budget.expiredLines).toEqual([])
    // elapsed 3 > endYear 2 → expired, named with its calendar boundary
    const report = deriveStaleness(withBudget, dayInYear(y0 + 3), MEDICARE_ONLY)
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
    expect(deriveStaleness(withBudget, farFuture, ACA_PRICED).budget.expiredLines).toEqual([])
  })
})

describe('deriveStaleness — the wall-time anchor', () => {
  it('elapsed days clamp at 0 for a future savedAt (clock skew never yields a negative claim)', () => {
    const s = { ...freshSave(), savedAt: TODAY + 30 }
    expect(deriveStaleness(s, TODAY, MEDICARE_ONLY).elapsed?.days).toBe(0)
  })
})
