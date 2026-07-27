/**
 * The FULL-STORE round-trip on the REAL v3 scenario shape (U8 decrypt-on-return spine).
 *
 * The existing byte-identity test (session.test.ts:66) round-trips a hand-written v1 MODEL,
 * so the rich v3 field set (incomeStreams / filing / startCalendarYear / health / per-person
 * workStatus) never travels encode→writeVault→loadVault→decode. This closes that gap: a real
 * ScenarioV3 (built by the same scenarioFromDraft path the Save ceremony uses) is saved,
 * evicted from memory, and reopened — the WHOLE object must survive byte-for-byte. A planted
 * companion proves the round-trip is field-SENSITIVE (carries actual values, not a template).
 *
 * This is a ui-layer test on purpose: only ui may reach across store (createSession/loadVault),
 * shared (the codec, via unlock), and ui (scenarioFromDraft/devSeeds) at once.
 */
import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { beforeEach, describe, expect, it } from 'vitest'

import { checkPassphraseFloor, type FloorCheckedPassphrase } from '../../crypto/kdf'
import { loadVault, openVaultDb } from '@store/db'
import { createSession } from '@store/session'
import { currentEpochDay, scenarioFromDraft } from '../scenarioFromDraft'
import { DEV_SEEDS, doctorRecordHolds } from '../devSeeds'
import type { AnyScenario, ScenarioV3 } from '@shared/model'

const PASSPHRASE = 'plinth otter vivid casket 92 lampoon'
const RECOVERY_PASSPHRASE = 'lattice harbor cinder vellum 48 thicket'

async function floorPass(p: string): Promise<FloorCheckedPassphrase> {
  const r = await checkPassphraseFloor(p)
  if (!r.ok) throw new Error('test passphrase unexpectedly below floor')
  return r.passphrase
}

/**
 * `currentModel()` returns the `AnyScenario` MIGRATION UNION (v1 | v2 | v3), and
 * `savedRecommendation` exists on v3 alone. Narrow with a real assertion rather than a cast: a
 * reopened vault that came back as anything but v3 would be a genuine finding about the store, and
 * a bare `as ScenarioV3` would hide exactly that finding to buy a green compile.
 */
function reopenedV3(model: AnyScenario | null): ScenarioV3 {
  expect(model, 'the reopened vault carried no model at all').not.toBeNull()
  expect(model?.schemaVersion, 'the reopened model must be v3 — the record exists on no other shape').toBe(3)
  return model as ScenarioV3
}

/** A real, complete ScenarioV3 — the canonical "ready to save" form the ceremony persists. */
function builtScenario() {
  const r = scenarioFromDraft(DEV_SEEDS.retired)
  if (!r.ready) throw new Error('DEV_SEEDS.retired should be a ready draft')
  return r.scenario
}

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory()
})

describe('the full-store round-trip on the REAL v3 scenario shape (field fidelity through IndexedDB)', () => {
  it('a real ScenarioV3 survives firstSave → loadVault → unlock byte-for-byte (the whole v3 field set)', async () => {
    const scenario = builtScenario()
    // Guard the fixture is genuinely the rich v3 shape, not a v1 stand-in — else the round-trip
    // proves nothing the existing v1 test doesn't already cover.
    expect(scenario.schemaVersion).toBe(3)
    expect(scenario.incomeStreams).toBeDefined()
    expect(scenario.people.length).toBeGreaterThan(0)

    const db = await openVaultDb()
    const session = createSession(db)
    const saved = await session.firstSave(scenario, await floorPass(PASSPHRASE), await floorPass(RECOVERY_PASSPHRASE))
    expect(saved.ok).toBe(true)
    await session.lock()

    // The encrypted model landed on disk; unlock is the only load→decrypt→decode path.
    expect((await loadVault(db)).kind).toBe('vault')
    const reopened = createSession(db)
    expect((await reopened.unlock(PASSPHRASE)).ok).toBe(true)
    // WHOLE-object fidelity — a codec that dropped or defaulted ANY v3 field fails right here.
    expect(reopened.currentModel()).toEqual(scenario)
    await reopened.lock()
  })

  it('PLANTED DROP — the round-trip is field-SENSITIVE: a one-field change travels, and does not compare equal to the original', async () => {
    // Proves the store carries actual field values (not a template/defaults): a codec that
    // silently substituted a field would surface as the altered scenario comparing equal to
    // the original. Both assertions must hold for the fidelity claim to be non-vacuous.
    const scenario = builtScenario()
    const altered = { ...scenario, annualSpendingReal: scenario.annualSpendingReal + 1234 }

    const db = await openVaultDb()
    const session = createSession(db)
    expect((await session.firstSave(altered, await floorPass(PASSPHRASE), await floorPass(RECOVERY_PASSPHRASE))).ok).toBe(
      true,
    )
    await session.lock()

    const reopened = createSession(db)
    expect((await reopened.unlock(PASSPHRASE)).ok).toBe(true)
    expect(reopened.currentModel()).toEqual(altered)
    expect(reopened.currentModel()).not.toEqual(scenario) // the changed field really traveled
    await reopened.lock()
  })

  // U17 §S6 — THE SAVED RECOMMENDATION'S FIRST TRIP THROUGH DISK. S3 built the record and S5 mints
  // it, but until now it was proven at the CODEC and HYDRATION layers only: every arm above rides
  // `DEV_SEEDS.retired`, which carries no `savedRecommendation`, so the richest sub-object in the
  // v3 shape had never met real WebCrypto or IndexedDB.
  //
  // WHY THAT GAP HAS TEETH RATHER THAN BEING BELT-AND-BRACES: the record is the codec's ONE
  // TOLERATED NON-FATAL DROP — a record the decoder dislikes is DELETED and the rest of the vault
  // opens normally. So the failure mode here is not a thrown error, it is a scenario that comes
  // back SILENTLY RECORD-FREE, which renders as an absent card rather than a broken vault. And the
  // transport is exactly where DND 009 bites: `JSON.stringify` nulls the values a structured field
  // can carry, and the record is dense with numbers (epoch days, a solver version, the era stamps).
  it('a scenario CARRYING a saved recommendation survives the REAL crypto + IndexedDB round-trip — record included', async () => {
    const scenario = doctorRecordHolds(builtScenario(), currentEpochDay())
    // FIXTURE GUARD, never decoration: without a record on the way IN, every assertion below is
    // vacuously true and this arm would pass forever while proving nothing (insight 048).
    expect(scenario.savedRecommendation, 'the fixture must actually carry a record').toBeDefined()

    const db = await openVaultDb()
    const session = createSession(db)
    expect(
      (await session.firstSave(scenario, await floorPass(PASSPHRASE), await floorPass(RECOVERY_PASSPHRASE))).ok,
    ).toBe(true)
    await session.lock()

    const reopened = createSession(db)
    expect((await reopened.unlock(PASSPHRASE)).ok).toBe(true)
    const back = reopenedV3(reopened.currentModel())
    // Named FIRST and on its own, so a tolerated drop reports itself as "the record vanished"
    // rather than as an opaque whole-object inequality the next reader has to diff by hand.
    expect(back.savedRecommendation, 'the record survived the vault — never silently dropped').toBeDefined()
    expect(back.savedRecommendation, 'and every field of it, byte-for-byte').toEqual(scenario.savedRecommendation)
    expect(back, 'and the scenario around it is untouched').toEqual(scenario)
    await reopened.lock()
  })

  it('PLANTED DROP (record) — the round-trip is field-sensitive INSIDE the record, not just around it', async () => {
    // The companion that makes the arm above non-vacuous in the other direction: whole-object
    // equality could hold through a codec that re-minted the record from defaults. Move one field
    // the record identifies itself by and prove THAT value is what came back.
    const scenario = doctorRecordHolds(builtScenario(), currentEpochDay())
    const record = scenario.savedRecommendation
    expect(record, 'the fixture must actually carry a record').toBeDefined()
    if (record === undefined) return
    const altered = { ...scenario, savedRecommendation: { ...record, mintedAt: record.mintedAt - 77 } }

    const db = await openVaultDb()
    const session = createSession(db)
    expect(
      (await session.firstSave(altered, await floorPass(PASSPHRASE), await floorPass(RECOVERY_PASSPHRASE))).ok,
    ).toBe(true)
    await session.lock()

    const reopened = createSession(db)
    expect((await reopened.unlock(PASSPHRASE)).ok).toBe(true)
    expect(
      reopenedV3(reopened.currentModel()).savedRecommendation?.mintedAt,
      'the altered mint date really traveled',
    ).toBe(record.mintedAt - 77)
    expect(reopened.currentModel()).not.toEqual(scenario)
    await reopened.lock()
  })
})
