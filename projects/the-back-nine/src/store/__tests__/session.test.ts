/**
 * session.ts — the trust-seam battery (P1·U4). These are the R15/R16 evidence tests:
 * the write-gate conjunction (ONE predicate refusing unkeyed, recovery-unlocked-
 * pre-re-mint, AND second-tab writes), the in-place recovery unlock with its
 * MANDATORY new-passphrase gate, the honest lock, the pending-state contract, and
 * the no-write-in-flight producer.
 *
 * fake-indexeddb + node BroadcastChannel here; the real-browser proof (real
 * IndexedDB, real Web Locks, real BroadcastChannel) rides the U4 Playwright e2e.
 */
import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { beforeEach, describe, expect, it } from 'vitest'

import type { Scenario } from '@shared/model'
import { checkPassphraseFloor, type FloorCheckedPassphrase } from '../../crypto/kdf'
import { phraseToEntropy } from '../../crypto/recoveryPhrase'
import { loadVault, openVaultDb, type VaultDb } from '../db'
import { createSession, type VaultSession } from '../session'

const PASSPHRASE = 'plinth otter vivid casket 92 lampoon'
const NEW_PASSPHRASE = 'gallant mosaic thunder eel 7 parquet'

const MODEL: Scenario = {
  schemaVersion: 1,
  initialPortfolio: 1_000_000,
  annualSpendingReal: 52_000,
  stockWeight: 0.55,
  people: [
    {
      sex: 'female',
      currentAge: 52,
      retirementAge: 59,
      earnedIncomeReal: 110_000,
      socialSecurityReal: 26_000,
      socialSecurityClaimAge: 67,
    },
  ],
  survivorSpendingRatio: 1,
  drawdownPolicy: 'proportional',
  seed: 0x7eedf00d,
}

async function floorPass(passphrase: string): Promise<FloorCheckedPassphrase> {
  const result = await checkPassphraseFloor(passphrase)
  if (!result.ok) throw new Error('test passphrase unexpectedly below floor')
  return result.passphrase
}

/** A fresh DB + session with a vault already created (the common starting point). */
async function vaultedSession(): Promise<{ db: VaultDb; session: VaultSession; phrase: readonly string[] }> {
  const db = await openVaultDb()
  const session = createSession(db)
  const saved = await session.firstSave(MODEL, await floorPass(PASSPHRASE))
  if (!saved.ok) throw new Error(`firstSave failed: ${JSON.stringify(saved)}`)
  return { db, session, phrase: saved.recoveryPhrase }
}

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory()
})

describe('firstSave → lock → unlock (the happy trust loop)', () => {
  it('round-trips the model byte-identically — including the seed — and returns a decodable recovery phrase', async () => {
    const { session, phrase } = await vaultedSession()
    expect((await phraseToEntropy(phrase.join(' '))).ok).toBe(true)

    await session.lock()
    expect(session.status()).toBe('locked')
    expect(session.currentModel()).toBeNull()

    const unlocked = await session.unlock(PASSPHRASE)
    expect(unlocked).toEqual({ ok: true, readOnly: false })
    expect(session.currentModel()).toEqual(MODEL)
    expect(session.currentModel()!.seed).toBe(0x7eedf00d)
    await session.lock()
  })

  it('refuses a second firstSave against an existing vault (never a silent overwrite)', async () => {
    const { db, session } = await vaultedSession()
    await session.lock()
    const second = createSession(db)
    const result = await second.firstSave(MODEL, await floorPass(PASSPHRASE))
    expect(result).toEqual({ ok: false, reason: 'vault-exists' })
  })
})

describe('wrong passphrase (calm, unlimited retries)', () => {
  it('fails typed, leaves the session locked, and the Nth+1 correct attempt succeeds', async () => {
    const { session } = await vaultedSession()
    await session.lock()

    for (let attempt = 0; attempt < 3; attempt++) {
      const result = await session.unlock('not the passphrase at all')
      expect(result).toEqual({ ok: false, reason: 'wrong-passphrase' })
      expect(session.status()).toBe('locked')
      expect(session.currentModel()).toBeNull()
    }
    expect((await session.unlock(PASSPHRASE)).ok).toBe(true)
    await session.lock()
  })

  it('damaged model ciphertext under a CORRECT passphrase surfaces as data-damaged, NOT wrong-passphrase', async () => {
    const { db, session } = await vaultedSession()
    await session.lock()

    const loaded = await loadVault(db)
    if (loaded.kind !== 'vault') throw new Error('expected vault')
    const corrupted = new Uint8Array(loaded.model.ciphertext)
    corrupted[0] = corrupted[0]! ^ 0xff
    const tx = db.transaction('vault', 'readwrite')
    void tx.objectStore('vault').put({ iv: loaded.model.iv, ciphertext: corrupted }, 'model').catch(() => undefined)
    await tx.done

    const result = await session.unlock(PASSPHRASE)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('data-damaged')
  })

  it('an empty store unlocks to the clean no-vault state (restore is a first-class entry)', async () => {
    const db = await openVaultDb()
    const session = createSession(db)
    expect(await session.unlock(PASSPHRASE)).toEqual({ ok: false, reason: 'no-vault' })
  })
})

describe('the write-gate conjunction (contract #4 — ONE predicate, every clause)', () => {
  it('a locked session refuses save (no key ⇒ no write path)', async () => {
    const { session } = await vaultedSession()
    await session.lock()
    expect(await session.save(MODEL)).toEqual({ ok: false, reason: 'not-writable' })
  })

  it('recovery-unlock decrypts the model but the SAME seam refuses every write until the new passphrase is set', async () => {
    const { session, phrase } = await vaultedSession()
    await session.lock()

    const recovered = await session.recoveryUnlock(phrase.join(' '))
    expect(recovered).toEqual({ ok: true })
    expect(session.status()).toBe('recovery-unlocked')
    expect(session.currentModel()).toEqual(MODEL)

    // The planted write: key EXISTS, model decrypted — yet the gate refuses (the
    // missing clause is the current passphraseWrap, not the key).
    expect(await session.save({ ...MODEL, annualSpendingReal: 53_000 })).toEqual({ ok: false, reason: 'not-writable' })

    // The mandatory blocking gate exits ONLY through setNewPassphrase.
    expect((await session.setNewPassphrase(await floorPass(NEW_PASSPHRASE))).ok).toBe(true)
    expect(session.status()).toBe('unlocked')
    expect((await session.save({ ...MODEL, annualSpendingReal: 53_000 })).ok).toBe(true)
    await session.lock()

    // Afterward: the NEW passphrase unlocks; the recovery phrase STILL works.
    expect((await session.unlock(NEW_PASSPHRASE)).ok).toBe(true)
    await session.lock()
    expect((await session.recoveryUnlock(phrase.join(' '))).ok).toBe(true)
    await session.setNewPassphrase(await floorPass(NEW_PASSPHRASE))
    await session.lock()
  })

  it('a malformed recovery phrase fails typed BEFORE any crypto (the survivor typo pointer)', async () => {
    const { session } = await vaultedSession()
    await session.lock()
    const result = await session.recoveryUnlock('zebra zebra zebra')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('phrase-invalid')
  })

  it('a VALID-shaped but wrong recovery phrase fails as wrong-recovery-phrase (GCM, calm)', async () => {
    const { session } = await vaultedSession()
    await session.lock()
    // A checksum-valid phrase that is simply not this vault's phrase.
    const wrong = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
    const result = await session.recoveryUnlock(wrong)
    expect(result).toEqual({ ok: false, reason: 'wrong-recovery-phrase' })
  })
})

describe('passphrase change while unlocked', () => {
  it('re-wraps with fresh salt AND iv; recovery phrase unaffected; old passphrase dead', async () => {
    const { db, session, phrase } = await vaultedSession()
    const before = await loadVault(db)
    if (before.kind !== 'vault') throw new Error('expected vault')

    expect((await session.setNewPassphrase(await floorPass(NEW_PASSPHRASE))).ok).toBe(true)
    const after = await loadVault(db)
    if (after.kind !== 'vault') throw new Error('expected vault')

    expect([...after.passphraseWrap.salt]).not.toEqual([...before.passphraseWrap.salt])
    expect([...after.passphraseWrap.iv]).not.toEqual([...before.passphraseWrap.iv])
    expect(after.recoveryWrap).toEqual(before.recoveryWrap)
    expect(after.model).toEqual(before.model)
    await session.lock()

    expect(await session.unlock(PASSPHRASE)).toEqual({ ok: false, reason: 'wrong-passphrase' })
    expect((await session.unlock(NEW_PASSPHRASE)).ok).toBe(true)
    await session.lock()
    expect((await session.recoveryUnlock(phrase.join(' '))).ok).toBe(true)
    await session.setNewPassphrase(await floorPass(NEW_PASSPHRASE))
    await session.lock()
  })

  it('is refused while locked (available only with a live session key)', async () => {
    const { session } = await vaultedSession()
    await session.lock()
    const result = await session.setNewPassphrase(await floorPass(NEW_PASSPHRASE))
    expect(result).toEqual({ ok: false, reason: 'no-session-key' })
  })
})

describe('save (the model-only re-encrypt path)', () => {
  it('rewrites ONLY the model record with a fresh IV; wraps byte-identical; in-memory model updates', async () => {
    const { db, session } = await vaultedSession()
    const before = await loadVault(db)
    if (before.kind !== 'vault') throw new Error('expected vault')

    const updated = { ...MODEL, annualSpendingReal: 55_000 }
    expect((await session.save(updated)).ok).toBe(true)
    expect(session.currentModel()).toEqual(updated)

    const after = await loadVault(db)
    if (after.kind !== 'vault') throw new Error('expected vault')
    expect(after.passphraseWrap).toEqual(before.passphraseWrap)
    expect(after.recoveryWrap).toEqual(before.recoveryWrap)
    expect([...after.model.iv]).not.toEqual([...before.model.iv])
    await session.lock()
  })

  it('two saves of the SAME model produce different iv and ciphertext (freshness)', async () => {
    const { db, session } = await vaultedSession()
    await session.save(MODEL)
    const first = await loadVault(db)
    await session.save(MODEL)
    const second = await loadVault(db)
    if (first.kind !== 'vault' || second.kind !== 'vault') throw new Error('expected vault')
    expect([...first.model.iv]).not.toEqual([...second.model.iv])
    expect([...first.model.ciphertext]).not.toEqual([...second.model.ciphertext])
    await session.lock()
  })
})

describe('the honest lock', () => {
  it('drops the key and model references; the epoch advances (engine-result discard predicate)', async () => {
    const { session } = await vaultedSession()
    const epochBefore = session.lockEpoch()
    await session.lock()
    expect(session.status()).toBe('locked')
    expect(session.currentModel()).toBeNull()
    expect(await session.save(MODEL)).toEqual({ ok: false, reason: 'not-writable' })
    expect(session.lockEpoch()).toBe(epochBefore + 1)
  })

  it('an engine run started before a lock is discardable: the epoch its result carries is stale', async () => {
    const { session } = await vaultedSession()
    const epochAtRunStart = session.lockEpoch()
    await session.lock()
    // The P2 consumer's rule: render only if the epoch is still current.
    expect(session.lockEpoch()).not.toBe(epochAtRunStart)
  })

  it('a lock during an in-flight save commits the save FIRST, then locks (queued, never torn)', async () => {
    const { db, session } = await vaultedSession()
    const updated = { ...MODEL, annualSpendingReal: 61_000 }
    const savePromise = session.save(updated)
    const lockPromise = session.lock() // issued while the save is in flight
    const [saveResult] = await Promise.all([savePromise, lockPromise])
    expect(saveResult.ok).toBe(true)
    expect(session.status()).toBe('locked')

    const loaded = await loadVault(db)
    expect(loaded.kind).toBe('vault')
    const reopened = createSession(db)
    expect((await reopened.unlock(PASSPHRASE)).ok).toBe(true)
    expect(reopened.currentModel()).toEqual(updated)
    await reopened.lock()
  })
})

describe('the pending-state contract (the KDF never silently blocks the UI story)', () => {
  it('status reads "unlocking" synchronously after unlock() is called', async () => {
    const { session } = await vaultedSession()
    await session.lock()
    const pending = session.unlock(PASSPHRASE)
    expect(session.status()).toBe('unlocking')
    await pending
    expect(session.status()).toBe('unlocked')
    await session.lock()
  })

  it('status reads "securing" during a passphrase set', async () => {
    const { session } = await vaultedSession()
    const pending = session.setNewPassphrase(await floorPass(NEW_PASSPHRASE))
    expect(session.status()).toBe('securing')
    await pending
    expect(session.status()).toBe('unlocked')
    await session.lock()
  })

  it('a failed unlock restores the locked state (no pending-state wedge)', async () => {
    const { session } = await vaultedSession()
    await session.lock()
    await session.unlock('definitely not the passphrase')
    expect(session.status()).toBe('locked')
  })
})

describe('isWriteInFlight / whenNoWriteInFlight (the U0 PWA-update signal, produced HERE)', () => {
  it('reads true during an in-flight save, false after commit; the deferral promise resolves only after commit', async () => {
    const { session } = await vaultedSession()
    expect(session.isWriteInFlight()).toBe(false)

    const savePromise = session.save({ ...MODEL, annualSpendingReal: 58_000 })
    expect(session.isWriteInFlight()).toBe(true)

    let deferredFired = false
    void session.whenNoWriteInFlight().then(() => {
      deferredFired = true
    })
    await Promise.resolve()
    expect(deferredFired).toBe(false) // the simulated update event would NOT reload here

    await savePromise
    expect(session.isWriteInFlight()).toBe(false)
    await session.whenNoWriteInFlight()
    expect(deferredFired).toBe(true) // …and reloads only once the write committed
    await session.lock()
  })
})

describe('single-active-writer (BroadcastChannel second-tab detection)', () => {
  it('a second session unlocking an already-unlocked vault is READ-ONLY; its planted write is refused by the same seam', async () => {
    const { db, session: tabA } = await vaultedSession()

    const tabB = createSession(db)
    const result = await tabB.unlock(PASSPHRASE)
    expect(result).toEqual({ ok: true, readOnly: true })
    expect(tabB.currentModel()).toEqual(MODEL) // reading is fine
    expect(await tabB.save({ ...MODEL, annualSpendingReal: 99_000 })).toEqual({ ok: false, reason: 'not-writable' })

    // The first tab keeps full write access.
    expect((await tabA.save({ ...MODEL, annualSpendingReal: 57_000 })).ok).toBe(true)
    await tabA.lock()
    await tabB.lock()
  })

  it('after the active tab locks, a fresh unlock becomes the writer', async () => {
    const { db, session: tabA } = await vaultedSession()
    await tabA.lock()

    const tabB = createSession(db)
    expect(await tabB.unlock(PASSPHRASE)).toEqual({ ok: true, readOnly: false })
    expect((await tabB.save({ ...MODEL, annualSpendingReal: 56_000 })).ok).toBe(true)
    await tabB.lock()
  })

  it('a recovery unlock against a vault active in another tab is refused outright (its only exit is a write)', async () => {
    const { db, session: tabA, phrase } = await vaultedSession()
    const tabB = createSession(db)
    const result = await tabB.recoveryUnlock(phrase.join(' '))
    expect(result).toEqual({ ok: false, reason: 'open-in-another-tab' })
    await tabA.lock()
  })
})
