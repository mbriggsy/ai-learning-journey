/**
 * db.ts — the vault's IndexedDB battery (fake-indexeddb here; the REAL-browser
 * IndexedDB proof rides the U4 Playwright e2e — a shim green is a map, not Earth).
 *
 * The trust-load-bearing assertions:
 *  - every multi-record mutation is ONE transaction (counted at the native
 *    IDBDatabase.prototype seam — not assumed from the API shape);
 *  - a torn/aborted transaction leaves the PRIOR vault intact (platform rollback,
 *    proven against the same DB the production code writes);
 *  - quota failure reports failure with the prior vault intact — never a false "saved";
 *  - the no-key-leak gate (burned/063): every stored record carries EXACTLY the
 *    single-sourced field sets, and no planted raw secret (passphrase utf8 bytes,
 *    recovery entropy, model plaintext) appears anywhere in the stored bytes.
 */
import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  BACKUP_NOTE_KEY,
  MODEL_RECORD_FIELDS,
  VAULT_KEYS,
  VAULT_STORE_NAME,
  WRAP_RECORD_FIELDS,
  type ModelRecord,
  type WrapRecord,
} from '@shared/model'
import {
  clearVault,
  loadVault,
  markBackupMade,
  openVaultDb,
  readBackupNote,
  replacePassphraseWrap,
  rewriteModel,
  writeVault,
} from '../db'

const bytes = (...vals: number[]): Uint8Array<ArrayBuffer> => new Uint8Array(vals)

function fixtureVault(): { model: ModelRecord; passphraseWrap: WrapRecord; recoveryWrap: WrapRecord } {
  return {
    model: { iv: bytes(1, 2, 3), ciphertext: bytes(10, 11, 12, 13) },
    passphraseWrap: { salt: bytes(21, 22), iv: bytes(23, 24), wrappedDataKey: bytes(25, 26, 27) },
    recoveryWrap: { salt: bytes(31, 32), iv: bytes(33, 34), wrappedDataKey: bytes(35, 36, 37) },
  }
}

beforeEach(() => {
  // A fresh factory per test — full isolation without cross-test deleteDB choreography.
  globalThis.indexedDB = new IDBFactory()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('loadVault classification', () => {
  it('an empty store → the clean no-vault state (first-run AND post-eviction; never a throw)', async () => {
    const db = await openVaultDb()
    expect(await loadVault(db)).toEqual({ kind: 'no-vault' })
  })

  it('a full write → vault with all three records byte-intact', async () => {
    const db = await openVaultDb()
    const v = fixtureVault()
    expect((await writeVault(db, v)).ok).toBe(true)
    const loaded = await loadVault(db)
    expect(loaded.kind).toBe('vault')
    if (loaded.kind === 'vault') {
      expect(loaded.model).toEqual(v.model)
      expect(loaded.passphraseWrap).toEqual(v.passphraseWrap)
      expect(loaded.recoveryWrap).toEqual(v.recoveryWrap)
    }
  })

  it('a PARTIAL record set → damaged (the restore pointer), never no-vault and never a half-vault', async () => {
    const db = await openVaultDb()
    const v = fixtureVault()
    // Plant a torn vault directly (bypassing the API on purpose — this models on-disk damage).
    const tx = db.transaction(VAULT_STORE_NAME, 'readwrite')
    await tx.objectStore(VAULT_STORE_NAME).put(v.model, 'model')
    await tx.done
    const loaded = await loadVault(db)
    expect(loaded.kind).toBe('damaged')
  })

  it('a shape-invalid record → damaged (a record with a missing field is corruption, not data)', async () => {
    const db = await openVaultDb()
    const v = fixtureVault()
    await writeVault(db, v)
    const tx = db.transaction(VAULT_STORE_NAME, 'readwrite')
    await tx.objectStore(VAULT_STORE_NAME).put({ salt: bytes(1), iv: bytes(2) }, 'recoveryWrap')
    await tx.done
    const loaded = await loadVault(db)
    expect(loaded.kind).toBe('damaged')
  })
})

describe('atomicity', () => {
  it('writeVault commits all three records in EXACTLY ONE transaction (counted at the native seam)', async () => {
    const db = await openVaultDb()
    const spy = vi.spyOn(IDBDatabase.prototype, 'transaction')
    await writeVault(db, fixtureVault())
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('an aborted multi-write rolls back COMPLETELY — the prior vault stays intact', async () => {
    const db = await openVaultDb()
    const original = fixtureVault()
    await writeVault(db, original)

    // A torn replacement: write a new model + new passphraseWrap, then abort.
    const tx = db.transaction(VAULT_STORE_NAME, 'readwrite')
    const store = tx.objectStore(VAULT_STORE_NAME)
    void store.put({ iv: bytes(9), ciphertext: bytes(9, 9) }, 'model').catch(() => undefined)
    void store
      .put({ salt: bytes(9), iv: bytes(9), wrappedDataKey: bytes(9) }, 'passphraseWrap')
      .catch(() => undefined)
    tx.abort()
    await tx.done.catch(() => undefined)

    const loaded = await loadVault(db)
    expect(loaded.kind).toBe('vault')
    if (loaded.kind === 'vault') {
      expect(loaded.model).toEqual(original.model)
      expect(loaded.passphraseWrap).toEqual(original.passphraseWrap)
    }
  })

  it('an interrupted FIRST save leaves NO partial vault', async () => {
    const db = await openVaultDb()
    const v = fixtureVault()
    const tx = db.transaction(VAULT_STORE_NAME, 'readwrite')
    const store = tx.objectStore(VAULT_STORE_NAME)
    void store.put(v.model, 'model').catch(() => undefined)
    void store.put(v.passphraseWrap, 'passphraseWrap').catch(() => undefined)
    tx.abort() // dies before the recoveryWrap lands
    await tx.done.catch(() => undefined)
    expect(await loadVault(db)).toEqual({ kind: 'no-vault' })
  })

  it('a quota failure mid-write reports failure, and the PRIOR vault is untouched (never a false saved)', async () => {
    const db = await openVaultDb()
    const original = fixtureVault()
    await writeVault(db, original)

    vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(() => {
      throw new DOMException('quota exceeded', 'QuotaExceededError')
    })
    const replacement = {
      model: { iv: bytes(9), ciphertext: bytes(9) },
      passphraseWrap: { salt: bytes(9), iv: bytes(9), wrappedDataKey: bytes(9) },
      recoveryWrap: { salt: bytes(9), iv: bytes(9), wrappedDataKey: bytes(9) },
    }
    const result = await writeVault(db, replacement)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('quota')
    vi.restoreAllMocks()

    const loaded = await loadVault(db)
    expect(loaded.kind).toBe('vault')
    if (loaded.kind === 'vault') expect(loaded.model).toEqual(original.model)
  })
})

describe('writeVault is TOTAL (clears stale strays in the same transaction)', () => {
  it('a stray record beyond the three defined keys does not survive a full-vault write', async () => {
    const db = await openVaultDb()
    const tx = db.transaction(VAULT_STORE_NAME, 'readwrite')
    void tx.objectStore(VAULT_STORE_NAME).put({ junk: bytes(1) }, 'strayKey').catch(() => undefined)
    await tx.done

    await writeVault(db, fixtureVault())
    const keys = await db.getAllKeys(VAULT_STORE_NAME)
    expect([...keys].sort()).toEqual(['model', 'passphraseWrap', 'recoveryWrap'])
  })
})

describe('rewriteModel (the model-only re-encrypt entry point — the P3/P4 vault-upgrade primitive)', () => {
  it('replaces ONLY the model record; both wraps stay byte-identical', async () => {
    const db = await openVaultDb()
    const v = fixtureVault()
    await writeVault(db, v)
    const newModel: ModelRecord = { iv: bytes(40, 41, 42), ciphertext: bytes(50, 51) }
    expect((await rewriteModel(db, newModel)).ok).toBe(true)
    const loaded = await loadVault(db)
    expect(loaded.kind).toBe('vault')
    if (loaded.kind === 'vault') {
      expect(loaded.model).toEqual(newModel)
      expect(loaded.passphraseWrap).toEqual(v.passphraseWrap)
      expect(loaded.recoveryWrap).toEqual(v.recoveryWrap)
    }
  })

  it('refuses to write into a vault that does not exist (a model without wraps is a stranded vault)', async () => {
    const db = await openVaultDb()
    const result = await rewriteModel(db, { iv: bytes(1), ciphertext: bytes(2) })
    expect(result.ok).toBe(false)
    expect(await loadVault(db)).toEqual({ kind: 'no-vault' })
  })
})

describe('replacePassphraseWrap (the passphrase-change record op)', () => {
  it('swaps the passphrase wrap; model + recoveryWrap untouched', async () => {
    const db = await openVaultDb()
    const v = fixtureVault()
    await writeVault(db, v)
    const newWrap: WrapRecord = { salt: bytes(61), iv: bytes(62), wrappedDataKey: bytes(63, 64) }
    expect((await replacePassphraseWrap(db, newWrap)).ok).toBe(true)
    const loaded = await loadVault(db)
    expect(loaded.kind).toBe('vault')
    if (loaded.kind === 'vault') {
      expect(loaded.passphraseWrap).toEqual(newWrap)
      expect(loaded.model).toEqual(v.model)
      expect(loaded.recoveryWrap).toEqual(v.recoveryWrap)
    }
  })

  it('refuses against a missing vault (nothing to re-key)', async () => {
    const db = await openVaultDb()
    const result = await replacePassphraseWrap(db, { salt: bytes(1), iv: bytes(2), wrappedDataKey: bytes(3) })
    expect(result.ok).toBe(false)
  })
})

describe('the backup-made sentinel (U8-tail — a plaintext sibling note, OUTSIDE VAULT_KEYS)', () => {
  it('mark → read roundtrip: absent reads 0, first mark → 1, a second mark → 2 (monotone)', async () => {
    const db = await openVaultDb()
    await writeVault(db, fixtureVault())
    expect(await readBackupNote(db)).toBe(0) // absent by construction — no note is written by writeVault
    expect((await markBackupMade(db)).ok).toBe(true)
    expect(await readBackupNote(db)).toBe(1)
    expect((await markBackupMade(db)).ok).toBe(true)
    expect(await readBackupNote(db)).toBe(2)
  })

  it('a MALFORMED note reads 0 (a torn count / wrong shape re-offers, never a false "backup exists")', async () => {
    const db = await openVaultDb()
    await writeVault(db, fixtureVault())
    // A structured-clone-torn count (null) and a wrong-shape blob are BOTH malformed → 0 (the safe
    // direction: readBackupNote > 0 gates the door, so 0 means "re-offer", never "claim one exists").
    for (const planted of [{ exportedCount: null }, { exportedCount: Number.NaN }, { nope: 1 }]) {
      const tx = db.transaction(VAULT_STORE_NAME, 'readwrite')
      void tx.objectStore(VAULT_STORE_NAME).put(planted, BACKUP_NOTE_KEY).catch(() => undefined)
      await tx.done
      expect(await readBackupNote(db)).toBe(0)
    }
  })

  it('markBackupMade REFUSES no-vault (a note without a vault is meaningless) and writes nothing', async () => {
    const db = await openVaultDb()
    expect(await markBackupMade(db)).toEqual({ ok: false, reason: 'no-vault' })
    expect(await readBackupNote(db)).toBe(0) // the refusal aborts its own transaction — nothing landed
    expect(await loadVault(db)).toEqual({ kind: 'no-vault' })
  })

  it('the note lives OUTSIDE VAULT_KEYS — a fourth stored key that never flips loadVault off "vault"', async () => {
    const db = await openVaultDb()
    await writeVault(db, fixtureVault())
    await markBackupMade(db)
    const keys = await db.getAllKeys(VAULT_STORE_NAME)
    expect([...keys].sort()).toEqual(['backupNote', 'model', 'passphraseWrap', 'recoveryWrap'])
    expect((await loadVault(db)).kind).toBe('vault') // the note is not one of loadVault's three records
  })

  it('writeVault CLEARS the note in the same transaction — a re-minted/restored vault starts note-less', async () => {
    const db = await openVaultDb()
    await writeVault(db, fixtureVault())
    await markBackupMade(db)
    expect(await readBackupNote(db)).toBe(1)
    await writeVault(db, fixtureVault()) // the first-save/restore full write clears the store first
    expect(await readBackupNote(db)).toBe(0)
    const keys = await db.getAllKeys(VAULT_STORE_NAME)
    expect([...keys].sort()).toEqual(['model', 'passphraseWrap', 'recoveryWrap']) // the keys==VAULT_KEYS invariant holds
  })

  it('clearVault CLEARS the note too (the wipe path leaves nothing behind)', async () => {
    const db = await openVaultDb()
    await writeVault(db, fixtureVault())
    await markBackupMade(db)
    expect(await readBackupNote(db)).toBe(1)
    await clearVault(db)
    expect(await readBackupNote(db)).toBe(0)
  })

  // The insight-058 audit's OTHER half: the two identity writers that deliberately KEEP the note.
  // Pinning the keeps (not just the clears) guards the honesty reasoning against a future
  // "make every write clear the note" refactor that would falsely re-nag.
  it('replacePassphraseWrap KEEPS the note — the recoveryWrap-based backup file still restores, so it stays honest', async () => {
    const db = await openVaultDb()
    await writeVault(db, fixtureVault())
    await markBackupMade(db)
    expect((await replacePassphraseWrap(db, fixtureVault().passphraseWrap)).ok).toBe(true)
    expect(await readBackupNote(db)).toBe(1)
  })

  it('rewriteModel KEEPS the note — the older-model file is still an off-device artifact (presence-only; staleness is U13)', async () => {
    const db = await openVaultDb()
    await writeVault(db, fixtureVault())
    await markBackupMade(db)
    expect((await rewriteModel(db, fixtureVault().model)).ok).toBe(true)
    expect(await readBackupNote(db)).toBe(1)
  })
})

describe('the no-key-leak gate (burned/063 — single-sourced shapes, planted secrets)', () => {
  it('the store holds EXACTLY the three defined keys with EXACTLY the defined field sets, and no planted secret byte-pattern appears anywhere', async () => {
    // Build a REAL vault through the real crypto layer so the test plants true secrets.
    const { derivePassphraseKey } = await import('../../crypto/kdf')
    const { mintWrappedDataKey, encrypt } = await import('../../crypto/cipher')

    const passphrase = 'a genuinely load-bearing passphrase'
    const passphraseBytes = new TextEncoder().encode(passphrase)
    const recoveryPassphrase = 'a different recovery secret entirely'
    const recoveryBytes = new TextEncoder().encode(recoveryPassphrase)
    const modelPlaintext = new TextEncoder().encode('{"schemaVersion":1,"secret":"the plan"}')

    const passSalt = new Uint8Array(16).fill(1)
    const recSalt = new Uint8Array(16).fill(2)
    const passKey = await derivePassphraseKey(passphrase, passSalt)
    const recKey = await derivePassphraseKey(recoveryPassphrase, recSalt)
    const minted = await mintWrappedDataKey(passKey, recKey)
    const modelBox = await encrypt(minted.dataKey, modelPlaintext)

    const db = await openVaultDb()
    await writeVault(db, {
      model: { iv: modelBox.iv, ciphertext: modelBox.ciphertext },
      passphraseWrap: { salt: passSalt, iv: minted.passphraseWrap.iv, wrappedDataKey: minted.passphraseWrap.ciphertext },
      recoveryWrap: { salt: recSalt, iv: minted.recoveryWrap.iv, wrappedDataKey: minted.recoveryWrap.ciphertext },
    })

    // 1. Exactly the three defined keys — nothing extra can carry key material unnoticed.
    const tx = db.transaction(VAULT_STORE_NAME)
    const keys = await tx.objectStore(VAULT_STORE_NAME).getAllKeys()
    expect([...keys].sort()).toEqual([...VAULT_KEYS].sort())

    // 2. Exactly the single-sourced field sets — the shape the serializer writes IS the
    //    shape this gate asserts (adding a field fails here until the gate learns it).
    const records = new Map<string, Record<string, unknown>>()
    for (const key of VAULT_KEYS) {
      records.set(key, (await db.get(VAULT_STORE_NAME, key)) as Record<string, unknown>)
    }
    expect(Object.keys(records.get('model')!).sort()).toEqual([...MODEL_RECORD_FIELDS].sort())
    expect(Object.keys(records.get('passphraseWrap')!).sort()).toEqual([...WRAP_RECORD_FIELDS].sort())
    expect(Object.keys(records.get('recoveryWrap')!).sort()).toEqual([...WRAP_RECORD_FIELDS].sort())

    // 3. No planted secret appears in ANY stored byte field (subsequence scan).
    const contains = (haystack: Uint8Array, needle: Uint8Array): boolean => {
      outer: for (let i = 0; i + needle.length <= haystack.length; i++) {
        for (let j = 0; j < needle.length; j++) {
          if (haystack[i + j] !== needle[j]) continue outer
        }
        return true
      }
      return false
    }
    const allStoredBytes: Uint8Array[] = []
    for (const record of records.values()) {
      for (const value of Object.values(record)) {
        expect(value).toBeInstanceOf(Uint8Array)
        allStoredBytes.push(value as Uint8Array)
      }
    }
    for (const blob of allStoredBytes) {
      expect(contains(blob, passphraseBytes)).toBe(false)
      expect(contains(blob, recoveryBytes)).toBe(false)
      expect(contains(blob, modelPlaintext)).toBe(false)
    }
  })
})
