/**
 * backup.ts — export/restore (one mechanism) battery.
 *
 * The trust assertions: the export↔restore cycle reproduces the model through a wipe;
 * the phrase is IMMUTABLE (an old export restores after a passphrase change); the
 * format gate runs BEFORE any decrypt (foreign/corrupt files surface calm, typed —
 * never a GCM stack trace); and the NEGATIVE PAIRING is structural — the file carries
 * no passphrase wrap, so file-without-phrase recovers nothing, and phrase-without-file
 * has nothing to open.
 */
import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { beforeEach, describe, expect, it } from 'vitest'

import { BACKUP_FORMAT, type Scenario } from '@shared/model'
import { checkPassphraseFloor, type FloorCheckedPassphrase } from '../../crypto/kdf'
import { clearVault, loadVault, openVaultDb, type VaultDb } from '../db'
import { exportVault, restoreVault } from '../backup'
import { createSession, type VaultSession } from '../session'

const PASSPHRASE = 'plinth otter vivid casket 92 lampoon'
const NEW_PASSPHRASE = 'gallant mosaic thunder eel 7 parquet'

const MODEL: Scenario = {
  schemaVersion: 1,
  initialPortfolio: 900_000,
  annualSpendingReal: 48_000,
  stockWeight: 0.5,
  people: [
    {
      sex: 'male',
      currentAge: 55,
      retirementAge: 60,
      earnedIncomeReal: 80_000,
      socialSecurityReal: 30_000,
      socialSecurityClaimAge: 70,
    },
  ],
  survivorSpendingRatio: 1,
  drawdownPolicy: 'taxable-first',
  seed: 42,
}

async function floorPass(passphrase: string): Promise<FloorCheckedPassphrase> {
  const result = await checkPassphraseFloor(passphrase)
  if (!result.ok) throw new Error('test passphrase unexpectedly below floor')
  return result.passphrase
}

async function vaulted(): Promise<{ db: VaultDb; session: VaultSession; phrase: string }> {
  const db = await openVaultDb()
  const session = createSession(db)
  const saved = await session.firstSave(MODEL, await floorPass(PASSPHRASE))
  if (!saved.ok) throw new Error('firstSave failed')
  return { db, session, phrase: saved.recoveryPhrase.join(' ') }
}

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory()
})

describe('the export → wipe → restore cycle (models Safari eviction / device wipe)', () => {
  it('reproduces the model exactly, unlockable with the NEW passphrase', async () => {
    const { db, session, phrase } = await vaulted()
    const exported = await exportVault(db)
    expect(exported.ok).toBe(true)
    if (!exported.ok) return
    await session.lock()

    await clearVault(db) // the wipe
    expect(await loadVault(db)).toEqual({ kind: 'no-vault' })

    const restored = await restoreVault(db, exported.file, phrase, await floorPass(NEW_PASSPHRASE))
    expect(restored).toEqual({ ok: true })

    const reopened = createSession(db)
    expect((await reopened.unlock(NEW_PASSPHRASE)).ok).toBe(true)
    expect(reopened.currentModel()).toEqual(MODEL)
    expect(reopened.currentModel()!.seed).toBe(42)
    await reopened.lock()
  })

  it('an EARLIER export restores after a passphrase change — the phrase is immutable', async () => {
    const { db, session, phrase } = await vaulted()
    const earlyExport = await exportVault(db)
    if (!earlyExport.ok) throw new Error('export failed')

    // The passphrase changes; the phrase (and the recovery wrap in the old export) do not.
    expect((await session.setNewPassphrase(await floorPass(NEW_PASSPHRASE))).ok).toBe(true)
    await session.lock()

    await clearVault(db)
    const restored = await restoreVault(db, earlyExport.file, phrase, await floorPass(PASSPHRASE))
    expect(restored).toEqual({ ok: true })

    const reopened = createSession(db)
    expect((await reopened.unlock(PASSPHRASE)).ok).toBe(true)
    expect(reopened.currentModel()).toEqual(MODEL)
    await reopened.lock()
  })

  it('refuses to restore over a HEALTHY vault (a destructive overwrite is never silent)', async () => {
    const { db, session, phrase } = await vaulted()
    const exported = await exportVault(db)
    if (!exported.ok) throw new Error('export failed')
    await session.lock()

    const result = await restoreVault(db, exported.file, phrase, await floorPass(NEW_PASSPHRASE))
    expect(result).toEqual({ ok: false, reason: 'vault-exists' })
  })
})

describe('the format gate (checked BEFORE decrypt)', () => {
  it('a non-JSON file → file-damaged, never a crash', async () => {
    const { db, phrase, session } = await vaulted()
    await session.lock()
    await clearVault(db)
    const result = await restoreVault(db, 'not json at all {', phrase, await floorPass(NEW_PASSPHRASE))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('file-damaged')
  })

  it('a foreign JSON file (wrong format marker) → file-damaged', async () => {
    const { db, phrase, session } = await vaulted()
    await session.lock()
    await clearVault(db)
    const foreign = JSON.stringify({ format: 'some-other-app', formatVersion: 1 })
    const result = await restoreVault(db, foreign, phrase, await floorPass(NEW_PASSPHRASE))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('file-damaged')
  })

  it('a NEWER format version → the calm newer-format state (never a mis-parse)', async () => {
    const { db, phrase, session } = await vaulted()
    const exported = await exportVault(db)
    if (!exported.ok) throw new Error('export failed')
    await session.lock()
    await clearVault(db)
    const bumped = JSON.stringify({ ...JSON.parse(exported.file), formatVersion: 2 })
    const result = await restoreVault(db, bumped, phrase, await floorPass(NEW_PASSPHRASE))
    expect(result).toEqual({ ok: false, reason: 'newer-format' })
  })
})

describe('negative pairing (proven, not believed)', () => {
  it('the exported file structurally carries NO passphrase wrap — exactly format/formatVersion/model/recoveryWrap', async () => {
    const { db, session } = await vaulted()
    const exported = await exportVault(db)
    if (!exported.ok) throw new Error('export failed')
    await session.lock()
    const parsed = JSON.parse(exported.file) as Record<string, unknown>
    expect(Object.keys(parsed).sort()).toEqual(['format', 'formatVersion', 'model', 'recoveryWrap'])
    expect(parsed.format).toBe(BACKUP_FORMAT)
  })

  it('the file WITHOUT the right phrase recovers nothing (wrong phrase → typed fail, nothing written)', async () => {
    const { db, phrase: _phrase, session } = await vaulted()
    const exported = await exportVault(db)
    if (!exported.ok) throw new Error('export failed')
    await session.lock()
    await clearVault(db)

    const wrongPhrase =
      'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
    const result = await restoreVault(db, exported.file, wrongPhrase, await floorPass(NEW_PASSPHRASE))
    expect(result).toEqual({ ok: false, reason: 'wrong-recovery-phrase' })
    expect(await loadVault(db)).toEqual({ kind: 'no-vault' }) // nothing partial landed
  })

  it('a malformed phrase fails typed before any crypto', async () => {
    const { db, session } = await vaulted()
    const exported = await exportVault(db)
    if (!exported.ok) throw new Error('export failed')
    await session.lock()
    await clearVault(db)
    const result = await restoreVault(db, exported.file, 'only three words', await floorPass(NEW_PASSPHRASE))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('phrase-invalid')
  })

  it('a tampered MODEL ciphertext with the CORRECT phrase → file-damaged (context distinguishes damage from a wrong phrase)', async () => {
    const { db, phrase, session } = await vaulted()
    const exported = await exportVault(db)
    if (!exported.ok) throw new Error('export failed')
    await session.lock()
    await clearVault(db)

    const parsed = JSON.parse(exported.file) as { model: { ciphertext: string } }
    const bytes = Uint8Array.from(atob(parsed.model.ciphertext), (c) => c.charCodeAt(0))
    bytes[0] = bytes[0]! ^ 0xff
    parsed.model.ciphertext = btoa(String.fromCharCode(...bytes))
    const result = await restoreVault(db, JSON.stringify(parsed), phrase, await floorPass(NEW_PASSPHRASE))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('file-damaged')
  })
})

describe('export failure modes', () => {
  it('exporting an absent vault fails typed', async () => {
    const db = await openVaultDb()
    const result = await exportVault(db)
    expect(result).toEqual({ ok: false, reason: 'no-vault' })
  })
})
