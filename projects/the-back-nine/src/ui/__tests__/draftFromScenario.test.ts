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
import { scenarioFromDraft } from '../scenarioFromDraft'
import { draftFromScenario } from '../draftFromScenario'
import { DEV_SEEDS, type DevSeedKey } from '../devSeeds'
import { healthcareVintageStamp } from '@engine/constants/health'
import type { DrawdownOrderKey, RothConversionPlan, ScenarioV3 } from '@shared/model'

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
