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
import { scenarioFromDraft } from '../scenarioFromDraft'
import { DEV_SEEDS } from '../devSeeds'

const PASSPHRASE = 'plinth otter vivid casket 92 lampoon'
const RECOVERY_PASSPHRASE = 'lattice harbor cinder vellum 48 thicket'

async function floorPass(p: string): Promise<FloorCheckedPassphrase> {
  const r = await checkPassphraseFloor(p)
  if (!r.ok) throw new Error('test passphrase unexpectedly below floor')
  return r.passphrase
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
})
