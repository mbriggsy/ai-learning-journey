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
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { deriveResultSave, persistSeedFor } from '../resultSave'
import { validateSavedRecommendation } from '@shared/scenarioCodec'
import type { SaveReady } from '../scenarioFromDraft'
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

/**
 * THE INSIGHT-073 WITNESS for the saved-recommendation record (U17·S3·D4).
 *
 * Insight 073 NAMES U17: any stamp the U17 payload carries must join `scenarioIdentity` — or its
 * own normalizer — IN THE SAME COMMIT, and the AGED-COPY FIXTURE must ship with it. Otherwise
 * every identity compare silently becomes a CLOCK compare and every same-day test stays green.
 *
 * WHY THE EXISTING TESTS CANNOT CATCH IT: every arm above rides `DEV_SEEDS.*`, and no dev seed
 * carries a record. A record re-minted per encode (the mutant: `savedRecommendation` moved into
 * `scenarioFromDraft`'s stamped-fresh block beside the vintages) would leave all of them green —
 * there is nothing on the draft for the re-mint to overwrite. This fixture is the only thing in
 * the suite that can go red on it.
 *
 * WHY THE FIXTURE IS AGED: two SAME-DAY scenarioFromDraft calls re-stamp IDENTICALLY, so a
 * same-day comparison is blind to a re-mint by construction (that is the whole trap 073 names).
 * The disk copy therefore carries an OLD `mintedAt`, and the load-bearing assertion is that it
 * survives the hydrate → re-encode round trip UNCHANGED.
 */
describe('the saved-recommendation record survives the real hydrate → persist-seed → clean-badge chain (insight 073)', () => {
  /** A vault saved a month ago whose recommendation was minted a month before THAT. */
  const agedVaultWithRecord = (): ScenarioV3 => ({
    ...retiredV3(),
    savedAt: currentEpochDay() - 30,
    savedRecommendation: {
      mintedAt: currentEpochDay() - 60,
      fingerprint: 'solver-run-fp/v2:{"goal"=s"leave-more"}',
      solverCodeVersion: 1,
      goal: 'leave-more',
      action: { candidateId: 'baseline:taxable-first:0', policy: 'taxable-first' },
      verdict: { grade: 'just-do-it', subTenthCollapse: false, noChange: false, surplusRegime: false, noDollarRegister: false },
      // The era is a FROZEN SNAPSHOT of the five vintage-bearing fields, ALL FIVE REQUIRED, and
      // deliberately OLDER than what this build stamps — that is what makes the fixture aged on
      // both clocks at once (the record's mint AND the rules it was priced under).
      era: {
        appDefaultVersion: 'p2-d1',
        taxVintageDetail: { taxYear: 2025, legalBasis: 'TCJA (pre-OBBBA)' },
        stateTaxVintage: { ncProfile: '{"nc":2025}', paProfile: '{"pa":2025}', flProfile: '{"fl":0}' },
        healthcareVintage: {
          coverageYear: 2025,
          acaStatus: 'enhanced',
          acaVerifiedOn: '2025-01-01',
          fplGuidelineYear: 2024,
          irmaaTopTierFrozenThrough: 2028,
          partBStandardMonthly: 185,
        },
        dateVintage: { contributionYear: 2025, blendSnapshotAsOf: '2025-01-01' },
      },
    },
  })

  it('THE MINT IS NEVER RE-STAMPED: an OLD mintedAt survives hydrate → scenarioFromDraft byte-identically (a per-encode re-mint would move it to today and turn every identity compare into a clock compare)', () => {
    const disk = agedVaultWithRecord()
    const hydrated = draftFromScenario(disk)
    expect(hydrated.ok).toBe(true)
    if (!hydrated.ok) return
    // It reaches the DRAFT (the `...rest` strip carries it — the `chosenGoal`/`retirementState` path).
    expect(hydrated.draft.savedRecommendation).toEqual(disk.savedRecommendation)
    const reencoded = scenarioFromDraft(hydrated.draft)
    expect(reencoded.ready).toBe(true)
    if (!reencoded.ready) return
    // THE LOAD-BEARING ASSERTION. The vintages beside it DID re-mint (proven below); this did not.
    expect(reencoded.scenario.savedRecommendation).toEqual(disk.savedRecommendation)
    expect(reencoded.scenario.savedRecommendation?.mintedAt).toBe(currentEpochDay() - 60)
    expect(reencoded.scenario.savedRecommendation?.era.taxVintageDetail).toEqual({
      taxYear: 2025,
      legalBasis: 'TCJA (pre-OBBBA)',
    })
    // The contrast that proves the fixture is not simply inert: the SCENARIO's own stamps re-mint
    // fresh in the very same call, so "nothing gets re-stamped here" is not why this passes.
    expect(reencoded.scenario.taxVintageDetail).toEqual(taxVintageStamp())
    expect(reencoded.scenario.savedAt).toBe(currentEpochDay())
    // Identity holds on everything but the wall-time stamp — i.e. the record is IN the identity
    // and matched. Under the re-mint mutant `mintedAt` moves to today and this goes red.
    expect(scenarioIdentity(reencoded.scenario)).toEqual(scenarioIdentity(disk))
  })

  it('THE CLEAN BADGE holds across the day boundary: IntakeApp’s real persist-seed reconstruction over an aged record-bearing vault reads CLEAN, and the seed carries the DISK’s record', () => {
    // The exact chain IntakeApp runs on decrypt-on-return (IntakeApp.tsx): decoded model →
    // draftFromScenario → scenarioFromDraft (the "normalized" operand) → the persist seed, which
    // keeps the DISK's own savedAt while everything else comes from the normalization.
    //
    // THE SEED COMES FROM THE SHIPPED PRODUCER, NOT A COPY OF IT. This test used to re-type
    // IntakeApp's four-line destructure-and-re-append under a title claiming it exercised the
    // real thing — the repo's named landmine verbatim ("a copy of a producer's arithmetic under a
    // comment claiming it matches IS NOT A PIN"), the same shape that cost stage S0 a failed
    // verification. The reconstruction is now ONE exported function (`resultSave.persistSeedFor`,
    // the persistence seam — insight 048), called here and by the component; the SOURCE-BIND arm
    // below is what proves the component still calls it (insights 032/081).
    const disk = agedVaultWithRecord()
    const hydrated = draftFromScenario(disk)
    expect(hydrated.ok).toBe(true)
    if (!hydrated.ok) return
    const normalized = scenarioFromDraft(hydrated.draft)
    expect(normalized.ready).toBe(true)
    if (!normalized.ready) return
    const persistScenario = persistSeedFor(normalized.scenario, disk.savedAt)
    // The record rode the whole chain intact — nothing on the persistence seam re-minted it.
    expect(persistScenario.savedRecommendation).toEqual(disk.savedRecommendation)
    // And the live answer (a second normalization of the same draft — what the result screen
    // recomputes from) compares CLEAN against that seed: a returning household sees "Saved",
    // not a phantom "unsaved changes" it never made.
    const live = scenarioFromDraft(hydrated.draft)
    expect(live.ready).toBe(true)
    if (!live.ready) return
    expect(deriveResultSave({ kind: 'saved', scenario: persistScenario }, live)).toEqual({ kind: 'clean' })
    // …and the badge is still a LIVE comparison, not a blanket clean: a household that edits the
    // record's identity (a fresh solve saved over it) reads dirty.
    const edited: SaveReady = {
      ready: true,
      droppedAtoms: [],
      scenario: {
        ...live.scenario,
        savedRecommendation: { ...disk.savedRecommendation!, fingerprint: 'a-different-run' },
      },
    }
    expect(deriveResultSave({ kind: 'saved', scenario: persistScenario }, edited)).toEqual({ kind: 'dirty' })
  })

  it('the round trip carries the record through the CODEC too — a record-bearing vault re-encodes byte-identically (the field is not silently dropped at the persist gate)', () => {
    const disk = agedVaultWithRecord()
    const hydrated = draftFromScenario(disk)
    expect(hydrated.ok).toBe(true)
    if (!hydrated.ok) return
    const reencoded = scenarioFromDraft(hydrated.draft)
    expect(reencoded.ready).toBe(true)
    // scenarioFromDraft round-trips through encodeScenario/decodeScenario, so a `ready:true` here
    // with the record intact proves the codec ACCEPTED it — the tolerated-drop path did not fire.
    if (reencoded.ready) expect(reencoded.scenario.savedRecommendation).toBeDefined()
  })

  // ── THE SOURCE-BIND on the CONSUMER (insights 032/081) ───────────────────────────────────
  it('IntakeApp CALLS the exported persist-seed producer — it never re-types the destructure-and-re-append', () => {
    // Calling `persistSeedFor` from the test above proves the FUNCTION is right; it proves NOTHING
    // about whether the component still routes through it. That is exactly the gap S0's verifier
    // exploited (a `+ 3` planted in Result.tsx left 1096 tests green because the seam test had
    // COPIED the arithmetic). Same idiom as `planClockSeam.test.ts`: read the component's source.
    const src = readFileSync(resolve(__dirname, '../IntakeApp.tsx'), 'utf8')
    expect(src, 'the producer is imported, not re-declared').toMatch(
      /import \{[^}]*persistSeedFor[^}]*\} from '\.\/resultSave'/,
    )
    expect(src, 'the persist seed is built by the shared producer').toMatch(
      /persistSeedFor\(normalized\.scenario, model\.savedAt\)/,
    )
    // THE MUTANT THIS KILLS: the four lines coming back inline. A re-typed `const { savedAt: … }`
    // off the normalized scenario is the copy that made the old title false.
    expect(src, 'never a re-typed savedAt strip on the persistence seam').not.toMatch(
      /savedAt: _freshStamp/,
    )
  })
})

/**
 * THE WRITE-SIDE RULING on the codec's one tolerated drop (the F-pass, amended 2026-07-25).
 *
 * `scenarioFromDraft` runs `decodeScenario(encodeScenario(candidate))` as its SAVE gate, so the
 * READ-side tolerance ("never make a household's whole plan unopenable at unlock") reached a path
 * it was never charter'd for: an S5 mint that emitted an invalid record got it silently DELETED
 * and still returned a bare `ready: true`. `session.save` would then write a record-free scenario
 * while the draft kept the record, and `deriveResultSave` — which compares two POST-codec operands
 * — would read CLEAN. The household is told "Saved" about a record the vault does not have.
 *
 * THE FIRST CUT REFUSED THE SAVE, AND THAT WAS WORSE. `ready: false` is the INCOMPLETE-ANSWER arm;
 * `deriveResultSave` maps it to `{ kind: 'none' }`, so a household with a complete answer, a real
 * vault and unsaved edits would watch the save CTA, the badge and the aged-balances clause all
 * vanish, unexplained (`SaveReady.detail` has no reader outside `scenarioFromDraft`) — over a
 * defect in OUR minting code. That is the lying dead-end resultSave.ts's own header says this
 * machine exists to make UNREPRESENTABLE.
 *
 * SO: the plan saves, the drop is REPORTED on `droppedAtoms`, and the refusal belongs at the
 * surface that made the promise (S5's gesture). The root fix is upstream of both —
 * `validateSavedRecommendation` refuses at the MINT, so a droppable record never reaches a draft.
 *
 * THREE ARMS, and the trio is what makes it non-vacuous: a gate that reported everything as
 * dropped would satisfy the first alone, and one that dropped everything would satisfy the first
 * two.
 */
describe('scenarioFromDraft — a dropped atom on the WRITE side is a MINTER DEFECT, reported not swallowed', () => {
  const draftWithRecord = (record: unknown) => {
    const hydrated = draftFromScenario(retiredV3())
    if (!hydrated.ok) throw new Error('the retired seed should hydrate')
    return { ...hydrated.draft, savedRecommendation: record as ScenarioV3['savedRecommendation'] }
  }

  /** A valid record built against the retired seed's OWN stamps (all five era fields present). */
  const validRecord = (): NonNullable<ScenarioV3['savedRecommendation']> => {
    const s = retiredV3()
    if (
      s.taxVintageDetail === undefined ||
      s.stateTaxVintage === undefined ||
      s.healthcareVintage === undefined ||
      s.dateVintage === undefined
    ) {
      throw new Error('a real save stamps all four vintages')
    }
    return {
      mintedAt: currentEpochDay() - 5,
      fingerprint: 'solver-run-fp/v2:{"goal"=s"leave-more"}',
      solverCodeVersion: 1,
      goal: 'leave-more',
      action: { candidateId: 'baseline:taxable-first:0', policy: 'taxable-first' },
      verdict: { grade: 'just-do-it', subTenthCollapse: false, noChange: false, surplusRegime: false, noDollarRegister: false },
      era: {
        appDefaultVersion: s.appDefaultVersion,
        taxVintageDetail: s.taxVintageDetail,
        stateTaxVintage: s.stateTaxVintage,
        healthcareVintage: s.healthcareVintage,
        dateVintage: s.dateVintage,
      },
    }
  }

  /** The exact shape the codec refuses (a stampless era pins every rulebook clock quiet forever),
   *  and the exact shape a half-written mint would emit. */
  const badRecord = () => ({ ...validRecord(), era: { appDefaultVersion: retiredV3().appDefaultVersion } })

  it('an INVALID record is REPORTED on droppedAtoms — naming the atom and the codec’s own reason — and is gone from the saved scenario', () => {
    const out = scenarioFromDraft(draftWithRecord(badRecord()))
    expect(out.ready).toBe(true)
    if (!out.ready) return
    expect(out.droppedAtoms).toHaveLength(1)
    expect(out.droppedAtoms[0]).toContain('savedRecommendation')
    // The codec's own named path rides along, so S5's refusal can say WHY without re-validating.
    expect(out.droppedAtoms[0]).toContain('taxVintageDetail')
    // …and it really is gone. A REPORTED drop that still shipped the atom would be the worst of
    // both: a scary note over a scenario that saved the bad record anyway.
    expect(out.scenario.savedRecommendation).toBeUndefined()
  })

  it('the household’s PLAN still saves through a dropped record — their edits are never collateral for our minter bug', () => {
    // The specific regression: `ready: false` here routed to `deriveResultSave`'s `{kind:'none'}`,
    // silently withdrawing the save CTA and the badge from a household whose answer was complete.
    const out = scenarioFromDraft(draftWithRecord(badRecord()))
    expect(out.ready).toBe(true)
    if (!out.ready) return
    expect(deriveResultSave({ kind: 'unsaved' }, out)).toEqual({ kind: 'first' })
    // The plan itself is intact and byte-identical to the same draft with no record at all — the
    // drop took the atom and nothing else.
    const withoutRecord = scenarioFromDraft(draftWithRecord(undefined))
    expect(withoutRecord.ready).toBe(true)
    if (!withoutRecord.ready) return
    expect(out.scenario).toEqual(withoutRecord.scenario)
  })

  it('a draft carrying a VALID record returns an EMPTY droppedAtoms with the record on the scenario (the report never widened into flagging real saves)', () => {
    const out = scenarioFromDraft(draftWithRecord(validRecord()))
    expect(out.ready).toBe(true)
    if (!out.ready) return
    expect(out.droppedAtoms).toEqual([])
    expect(out.scenario.savedRecommendation).toEqual(validRecord())
  })

  /**
   * THE ROOT FIX, pinned: S5 validates its own mint BEFORE the record reaches the draft, so the
   * write-side drop is unreachable by construction rather than handled after the fact. Both
   * directions, because a validator that refused everything would satisfy the first arm alone.
   */
  it('validateSavedRecommendation refuses at the MINT with the codec’s own reason, and accepts a real record', () => {
    const refused = validateSavedRecommendation(badRecord())
    expect(refused.ok).toBe(false)
    if (refused.ok) return
    expect(refused.detail).toContain('taxVintageDetail')
    expect(validateSavedRecommendation(validRecord())).toEqual({ ok: true })
  })

  /**
   * SOURCE-BIND (insights 032 + 081): the two arms above prove the FUNCTIONS. Neither proves that
   * `scenarioFromDraft` still routes the codec's report into `droppedAtoms` rather than re-deriving
   * or hard-coding it — a re-typed `droppedAtoms: []` would keep every arm above green except the
   * first, and a future refactor that reinstated the `ready: false` refusal would keep them ALL
   * green while silently restoring the dead-end. Bind the consumer to the producer's own field.
   */
  it('scenarioFromDraft forwards the CODEC’s droppedAtoms and never re-refuses the save', () => {
    const src = readFileSync(resolve(__dirname, '../scenarioFromDraft.ts'), 'utf8')
    expect(src, 'the ready arm forwards the decode’s own report').toMatch(
      /ready: true,\s*scenario: decoded\.scenario,\s*droppedAtoms: decoded\.droppedAtoms/,
    )
    // THE MUTANT THIS KILLS: the first-cut refusal coming back. Any `ready: false` gated on the
    // drop re-introduces the silent `{kind:'none'}` dead-end.
    expect(src, 'a dropped atom never refuses the whole save').not.toMatch(/droppedAtoms\.length\s*>\s*0/)
  })
})
