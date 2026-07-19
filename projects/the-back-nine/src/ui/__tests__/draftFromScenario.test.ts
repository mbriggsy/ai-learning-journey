/**
 * The hydration inverse round-trip (U8 decrypt-on-return SLICE 2 correctness spine; Fork D).
 *
 * `vaultRoundTrip.test.ts` proves save → loadVault → unlock returns the exact ScenarioV3
 * (`currentModel()`). This proves the NEXT hop the decrypt-on-return path takes: that decoded
 * ScenarioV3 → `draftFromScenario` → the in-memory ScenarioDraft → `scenarioFromDraft` reproduces the
 * SAME ScenarioV3, byte-for-byte. Composed, the whole chain unlock → hydrate-draft → (a later re-save
 * would persist) the identical scenario is field-identity-proven — so a reload can never recompute a
 * DIFFERENT (calm-but-wrong) scenario than the one saved because a field was dropped in the strip.
 *
 * Run across EVERY real household shape (the dev-seed registry), so a future ScenarioV3 field that the
 * shallow strip mishandles fails here rather than surfacing as a silent reload drift.
 */
import { describe, expect, it } from 'vitest'
import { currentEpochDay, scenarioFromDraft } from '../scenarioFromDraft'
import { draftFromScenario } from '../draftFromScenario'
import { DEV_SEEDS, type DevSeedKey } from '../devSeeds'
import { healthcareVintageStamp } from '@engine/constants/health'
import { taxVintageStamp } from '@engine/constants/tax'
import { stateTaxVintageStamp } from '@engine/constants/stateTax'
import { dateVintageStamp } from '@engine/constants'
import { CURRENT_APP_DEFAULT_VERSION } from '@shared/appDefaults'
import { scenarioIdentity, type DrawdownOrderKey, type RothConversionPlan, type ScenarioV3 } from '@shared/model'

/** Every dev seed that is genuinely save-ready → its real, complete ScenarioV3. */
const readyScenarios: ReadonlyArray<readonly [DevSeedKey, ScenarioV3]> = (
  Object.keys(DEV_SEEDS) as DevSeedKey[]
).flatMap((key) => {
  const r = scenarioFromDraft(DEV_SEEDS[key])
  return r.ready ? [[key, r.scenario] as const] : []
})

const retiredV3 = (): ScenarioV3 => readyScenarios.find(([k]) => k === 'retired')![1]

describe('draftFromScenario — the decrypt-on-return hydration inverse', () => {
  it('the dev-seed registry yields ≥2 save-ready shapes incl. the on-track retired household (non-vacuous coverage)', () => {
    const keys = readyScenarios.map(([k]) => k)
    expect(keys).toContain('retired')
    expect(readyScenarios.length).toBeGreaterThanOrEqual(2)
  })

  it.each(readyScenarios.map(([key]) => key))(
    'round-trips %s byte-for-byte: scenarioFromDraft(draftFromScenario(v3)) === v3 (no field dropped in the strip)',
    (key) => {
      const original = readyScenarios.find(([k]) => k === key)![1]
      const hydrated = draftFromScenario(original)
      expect(hydrated.ok).toBe(true)
      if (!hydrated.ok) return
      const reencoded = scenarioFromDraft(hydrated.draft)
      expect(reencoded.ready).toBe(true)
      if (reencoded.ready) expect(reencoded.scenario).toEqual(original)
    },
  )

  it('strips EXACTLY the schemaVersion discriminant — every other v3 key survives to the draft', () => {
    const hydrated = draftFromScenario(retiredV3())
    expect(hydrated.ok).toBe(true)
    if (!hydrated.ok) return
    const { draft } = hydrated
    expect('schemaVersion' in draft).toBe(false)
    for (const k of Object.keys(retiredV3())) {
      if (k === 'schemaVersion') continue
      expect(draft).toHaveProperty(k)
    }
  })

  it('PLANTED — the round-trip is field-SENSITIVE (carries values, not a template): a one-field edit travels and does NOT compare equal', () => {
    const v3 = retiredV3()
    const hydrated = draftFromScenario(v3)
    expect(hydrated.ok).toBe(true)
    if (!hydrated.ok) return
    const altered = { ...hydrated.draft, annualSpendingReal: (hydrated.draft.annualSpendingReal ?? 0) + 1234 }
    const reencoded = scenarioFromDraft(altered)
    expect(reencoded.ready).toBe(true)
    if (reencoded.ready) {
      expect(reencoded.scenario.annualSpendingReal).toBe((v3.annualSpendingReal ?? 0) + 1234)
      expect(reencoded.scenario).not.toEqual(v3) // the changed field really traveled
    }
  })

  it('REFUSES a non-two-person shape (single-user is deferred) rather than coercing it into the two-tuple', () => {
    const v3 = retiredV3()
    // A decoded vault the codec would accept (people.length >= 1) but the draft cannot model:
    // dropping a spouse must NOT silently succeed (that would invent/erase a person on reload).
    const solo = { ...v3, people: [v3.people[0]!] } as ScenarioV3
    const trio = { ...v3, people: [v3.people[0]!, v3.people[1]!, v3.people[0]!] } as ScenarioV3
    for (const bad of [solo, trio]) {
      const hydrated = draftFromScenario(bad)
      expect(hydrated.ok).toBe(false)
      if (!hydrated.ok) expect(hydrated.reason).toBe('unsupported-shape')
    }
  })
})

describe('draftFromScenario — the U10 control levers round-trip byte-for-byte', () => {
  it('drawdownPolicy "custom" + drawdownOrder + rothConversion all survive the strip inverse together', () => {
    // A future ScenarioV3 field the shallow strip mishandles must fail HERE, so pin the three U10
    // lever fields explicitly on a real save-ready household (the biconditional: custom ⟺ order).
    const order: readonly DrawdownOrderKey[] = ['roth', 'taxable', 'pretax']
    const rothConversion: RothConversionPlan = { annualAmountReal: 30_000, startYearOffset: 1, years: 4 }
    const withLevers: ScenarioV3 = { ...retiredV3(), drawdownPolicy: 'custom', drawdownOrder: order, rothConversion }

    const hydrated = draftFromScenario(withLevers)
    expect(hydrated.ok).toBe(true)
    if (!hydrated.ok) return
    // the three lever fields reach the draft — not stripped, not re-derived
    expect(hydrated.draft.drawdownPolicy).toBe('custom')
    expect(hydrated.draft.drawdownOrder).toEqual(order)
    expect(hydrated.draft.rothConversion).toEqual(rothConversion)

    const reencoded = scenarioFromDraft(hydrated.draft)
    expect(reencoded.ready).toBe(true)
    if (reencoded.ready) expect(reencoded.scenario).toEqual(withLevers) // byte-for-byte, all three
  })
})

describe('draftFromScenario — the state-tax field round-trips (value AND absence)', () => {
  it('a PRICED retirementState (NC) survives the strip inverse byte-for-byte (the R7 seat + picker fact reaches the draft, not re-derived)', () => {
    const withState: ScenarioV3 = { ...retiredV3(), retirementState: 'NC' }
    const hydrated = draftFromScenario(withState)
    expect(hydrated.ok).toBe(true)
    if (!hydrated.ok) return
    expect(hydrated.draft.retirementState).toBe('NC')
    const reencoded = scenarioFromDraft(hydrated.draft)
    expect(reencoded.ready).toBe(true)
    if (reencoded.ready) expect(reencoded.scenario).toEqual(withState)
  })

  it("an explicit 'elsewhere' persists as itself (a chosen fact, never collapsed to absence)", () => {
    const withElsewhere: ScenarioV3 = { ...retiredV3(), retirementState: 'elsewhere' }
    const hydrated = draftFromScenario(withElsewhere)
    expect(hydrated.ok).toBe(true)
    if (!hydrated.ok) return
    expect(hydrated.draft.retirementState).toBe('elsewhere')
    const reencoded = scenarioFromDraft(hydrated.draft)
    if (reencoded.ready) expect(reencoded.scenario.retirementState).toBe('elsewhere')
  })

  it('ABSENCE is preserved: a never-asked household round-trips with retirementState still undefined (the disclosed-out posture, never defaulted to a state)', () => {
    const bare = retiredV3()
    expect(bare.retirementState).toBeUndefined()
    const hydrated = draftFromScenario(bare)
    expect(hydrated.ok).toBe(true)
    if (!hydrated.ok) return
    expect(hydrated.draft.retirementState).toBeUndefined()
    const reencoded = scenarioFromDraft(hydrated.draft)
    expect(reencoded.ready).toBe(true)
    if (reencoded.ready) expect(reencoded.scenario.retirementState).toBeUndefined()
  })
})

describe('draftFromScenario — the chosenGoal field round-trips (the U15 second-beat fact)', () => {
  it('a set chosenGoal survives draft → scenario → draft byte-for-byte (a writer dropping it in the strip reds here)', () => {
    const withGoal: ScenarioV3 = { ...retiredV3(), chosenGoal: 'leave-more' }
    const hydrated = draftFromScenario(withGoal)
    expect(hydrated.ok).toBe(true)
    if (!hydrated.ok) return
    expect(hydrated.draft.chosenGoal).toBe('leave-more') // reaches the draft, not stripped
    const reencoded = scenarioFromDraft(hydrated.draft)
    expect(reencoded.ready).toBe(true)
    if (reencoded.ready) expect(reencoded.scenario).toEqual(withGoal) // byte-for-byte
  })

  it('ABSENCE is preserved: an unset chosenGoal round-trips still undefined (the unset sentinel, never defaulted)', () => {
    const bare = retiredV3()
    expect(bare.chosenGoal).toBeUndefined()
    const hydrated = draftFromScenario(bare)
    expect(hydrated.ok).toBe(true)
    if (!hydrated.ok) return
    expect(hydrated.draft.chosenGoal).toBeUndefined()
    const reencoded = scenarioFromDraft(hydrated.draft)
    expect(reencoded.ready).toBe(true)
    if (reencoded.ready) expect(reencoded.scenario.chosenGoal).toBeUndefined()
  })
})

describe('scenarioFromDraft — the healthcare vintage stamp (P3-U11, write-time truth)', () => {
  it('every save carries the CURRENT build vintage stamp', () => {
    const r = scenarioFromDraft(DEV_SEEDS.retired)
    expect(r.ready).toBe(true)
    if (r.ready) expect(r.scenario.healthcareVintage).toEqual(healthcareVintageStamp())
  })

  it('a stale stamp riding a restored draft is OVERWRITTEN at save (the persisted stamp is the vintage the on-screen answer was computed under — this build)', () => {
    const stale = {
      coverageYear: 2019, acaStatus: 'ancient', acaVerifiedOn: '2019-01-01',
      fplGuidelineYear: 2018, irmaaTopTierFrozenThrough: 2019, partBStandardMonthly: 1,
    }
    const r = scenarioFromDraft({ ...DEV_SEEDS.retired, healthcareVintage: stale })
    expect(r.ready).toBe(true)
    if (r.ready) {
      expect(r.scenario.healthcareVintage).toEqual(healthcareVintageStamp())
      expect(r.scenario.healthcareVintage).not.toEqual(stale)
    }
  })
})

describe('scenarioFromDraft — the U13 stamps (write-time truth, the healthcareVintage contract widened)', () => {
  it('every save carries the CURRENT build tax + date vintages, the CURRENT app-default version, and a fresh epoch-day savedAt', () => {
    const r = scenarioFromDraft(DEV_SEEDS.retired)
    expect(r.ready).toBe(true)
    if (!r.ready) return
    expect(r.scenario.taxVintageDetail).toEqual(taxVintageStamp())
    expect(r.scenario.dateVintage).toEqual(dateVintageStamp())
    expect(r.scenario.stateTaxVintage).toEqual(stateTaxVintageStamp())
    expect(r.scenario.appDefaultVersion).toBe(CURRENT_APP_DEFAULT_VERSION)
    expect(r.scenario.savedAt).toBe(currentEpochDay())
  })

  it('STALE U13 stamps riding a restored draft are ALL overwritten at save — a re-saved old vault never re-writes its old provenance as if current', () => {
    const r = scenarioFromDraft({
      ...DEV_SEEDS.retired,
      savedAt: 18_263, // 2020 — a five-year-old save
      taxVintageDetail: { taxYear: 2019, legalBasis: 'TCJA (pre-OBBBA)' },
      dateVintage: { contributionYear: 2019, blendSnapshotAsOf: '2019-01-01' },
      // A DRIFTED state-tax stamp (the state-tax unit): an old-build NC profile riding a restored
      // draft — the drifted-vault clean-badge law (insight 079) demands it re-mint fresh at save.
      stateTaxVintage: { ncProfile: '{"stale":"nc"}', paProfile: '{"stale":"pa"}', flProfile: '{"stale":"fl"}' },
      appDefaultVersion: 'p0-ancient',
    })
    expect(r.ready).toBe(true)
    if (!r.ready) return
    expect(r.scenario.savedAt).toBe(currentEpochDay())
    expect(r.scenario.taxVintageDetail).toEqual(taxVintageStamp())
    expect(r.scenario.dateVintage).toEqual(dateVintageStamp())
    expect(r.scenario.stateTaxVintage).toEqual(stateTaxVintageStamp())
    expect(r.scenario.appDefaultVersion).toBe(CURRENT_APP_DEFAULT_VERSION)
  })

  it('the round trip holds on scenarioIdentity when the persisted savedAt is an OLD day, and the stamp re-mints fresh (the normalizer arm — a raw byte compare would read every next-day session dirty)', () => {
    const r = scenarioFromDraft(DEV_SEEDS.retired)
    expect(r.ready).toBe(true)
    if (!r.ready) return
    // Simulate a vault saved a month ago: identical content, older wall-time stamp.
    const oldSave: ScenarioV3 = { ...r.scenario, savedAt: currentEpochDay() - 30 }
    const hydrated = draftFromScenario(oldSave)
    expect(hydrated.ok).toBe(true)
    if (!hydrated.ok) return
    const reencoded = scenarioFromDraft(hydrated.draft)
    expect(reencoded.ready).toBe(true)
    if (!reencoded.ready) return
    // Identity holds on everything but the wall-time stamp…
    expect(scenarioIdentity(reencoded.scenario)).toEqual(scenarioIdentity(oldSave))
    // …and the stamp itself re-mints fresh, never replayed from the old vault.
    expect(reencoded.scenario.savedAt).toBe(currentEpochDay())
    expect(reencoded.scenario.savedAt).not.toBe(oldSave.savedAt)
  })

  it('the DRIFTED-VAULT clean-badge law (state-tax unit): a disk vault whose stateTaxVintage is from an OLD build re-mints fresh on hydrate → scenarioIdentity matches a fresh save (reads CLEAN, not falsely dirty)', () => {
    const fresh = retiredV3()
    // Simulate a vault saved under an older build: identical content, a DRIFTED state-tax stamp on
    // disk (the vintage stamp is IN scenarioIdentity — not savedAt-stripped — so a naive compare
    // would read dirty on load). The clean-badge law holds because BOTH the persist seed and the
    // current answer come from scenarioFromDraft under the CURRENT build, which re-mints the stamp.
    const drifted: ScenarioV3 = {
      ...fresh,
      stateTaxVintage: { ncProfile: '{"old":"nc"}', paProfile: '{"old":"pa"}', flProfile: '{"old":"fl"}' },
    }
    const hydrated = draftFromScenario(drifted)
    expect(hydrated.ok).toBe(true)
    if (!hydrated.ok) return
    const reencoded = scenarioFromDraft(hydrated.draft)
    expect(reencoded.ready).toBe(true)
    if (!reencoded.ready) return
    // The re-mint erases the drift: the hydrated vault's identity equals a FRESH save's identity
    // (the dirty-compare operand) — so deriveResultSave reads 'clean', never a false 'dirty' on load.
    expect(scenarioIdentity(reencoded.scenario)).toEqual(scenarioIdentity(fresh))
    expect(reencoded.scenario.stateTaxVintage).toEqual(stateTaxVintageStamp())
    expect(reencoded.scenario.stateTaxVintage).not.toEqual(drifted.stateTaxVintage)
  })
})
