/**
 * The vault's IndexedDB layer (P1·U4) — record persistence ONLY. No keys, no
 * plaintext, no session state live here: this layer moves the three single-sourced
 * record shapes (src/shared/model.ts — burned/063) in and out of one object store,
 * and its whole contract is ATOMICITY + HONEST CLASSIFICATION.
 *
 * ATOMICITY: every multi-record mutation is ONE IndexedDB transaction — IndexedDB's
 * auto-abort/rollback is the tear guard (a partial first save that wrote the
 * passphrase wrap but not the recovery wrap would strand the survivor, discovered
 * only at recovery time). A save reports success ONLY after `tx.done` resolves.
 * `rewriteModel` is the single-record degenerate case — the model re-written under
 * the EXISTING in-memory DK with a fresh IV, wraps untouched — so the P3 v1→v2 and
 * P4 v2→v3 vault upgrades inherit this atomicity instead of re-implementing it.
 *
 * DURABILITY is best-effort + backstopped: the write COMMITS before
 * `navigator.storage.persist()` is attempted; its boolean is advisory only and never
 * rolls back a successful save. Eviction (Safari ~7-day idle) surfaces on the next
 * load as the clean `no-vault` state — restore is a first-class entry point, and the
 * exported file + phrase are the real durability backstop.
 *
 * QuotaExceededError → a typed `quota` failure (the calm "use your export" state),
 * with the prior vault intact — never a false "saved".
 */
import { openDB, type IDBPDatabase, type IDBPObjectStore } from 'idb'

import {
  MODEL_RECORD_FIELDS,
  VAULT_DB_NAME,
  VAULT_STORE_NAME,
  WRAP_RECORD_FIELDS,
  type ModelRecord,
  type WrapRecord,
} from '@shared/model'

export type VaultDb = IDBPDatabase<unknown>

export interface VaultRecords {
  readonly model: ModelRecord
  readonly passphraseWrap: WrapRecord
  readonly recoveryWrap: WrapRecord
}

export type VaultLoad =
  /** First-run AND post-eviction look identical — both are this clean state. */
  | { readonly kind: 'no-vault' }
  | ({ readonly kind: 'vault' } & VaultRecords)
  /** A partial or shape-invalid record set: on-disk damage. The calm copy points at
   *  restore ("use your export") — never a half-vault handed to the crypto layer. */
  | { readonly kind: 'damaged'; readonly detail: string }

export type VaultWrite =
  | { readonly ok: true; readonly persistGranted: boolean | null }
  | { readonly ok: false; readonly reason: 'quota' }
  | { readonly ok: false; readonly reason: 'no-vault' }
  | { readonly ok: false; readonly reason: 'write-failed'; readonly detail: string }

export async function openVaultDb(): Promise<VaultDb> {
  return openDB(VAULT_DB_NAME, 1, {
    upgrade(db) {
      db.createObjectStore(VAULT_STORE_NAME)
    },
  })
}

/** Strict shape check against the single-sourced field sets: exactly the defined
 *  fields, every one a Uint8Array. An extra field is damage, not tolerance — a field
 *  this gate doesn't know is a field that could carry key material unnoticed. */
function isRecordShape(value: unknown, fields: readonly string[]): boolean {
  if (typeof value !== 'object' || value === null) return false
  const record = value as Record<string, unknown>
  if (Object.keys(record).length !== fields.length) return false
  return fields.every((f) => record[f] instanceof Uint8Array)
}

const isQuotaError = (e: unknown): boolean =>
  typeof e === 'object' && e !== null && (e as { name?: unknown }).name === 'QuotaExceededError'

/** Commit-then-ask durability: advisory only, never blocks or rolls back a save. */
async function requestPersist(): Promise<boolean | null> {
  try {
    if (typeof navigator !== 'undefined' && navigator.storage?.persist) {
      return await navigator.storage.persist()
    }
  } catch {
    // Advisory — a throwing persist() must never turn a committed save into a failure.
  }
  return null
}

export async function loadVault(db: VaultDb): Promise<VaultLoad> {
  const tx = db.transaction(VAULT_STORE_NAME)
  const store = tx.objectStore(VAULT_STORE_NAME)
  const [model, passphraseWrap, recoveryWrap] = await Promise.all([
    store.get('model'),
    store.get('passphraseWrap'),
    store.get('recoveryWrap'),
  ])
  await tx.done

  const present = [model, passphraseWrap, recoveryWrap].filter((r) => r !== undefined).length
  if (present === 0) return { kind: 'no-vault' }
  if (present < 3) return { kind: 'damaged', detail: `vault holds ${present} of 3 records` }

  if (!isRecordShape(model, MODEL_RECORD_FIELDS)) return { kind: 'damaged', detail: 'model record is malformed' }
  if (!isRecordShape(passphraseWrap, WRAP_RECORD_FIELDS)) {
    return { kind: 'damaged', detail: 'passphraseWrap record is malformed' }
  }
  if (!isRecordShape(recoveryWrap, WRAP_RECORD_FIELDS)) {
    return { kind: 'damaged', detail: 'recoveryWrap record is malformed' }
  }
  return {
    kind: 'vault',
    model: model as ModelRecord,
    passphraseWrap: passphraseWrap as WrapRecord,
    recoveryWrap: recoveryWrap as WrapRecord,
  }
}

type WritableVaultStore = IDBPObjectStore<
  unknown,
  [typeof VAULT_STORE_NAME],
  typeof VAULT_STORE_NAME,
  'readwrite'
>

/** Run `mutate` inside one readwrite transaction with the quota/abort plumbing shared
 *  by every write op. `mutate` may refuse (returning a failure) — the tx is aborted. */
async function inWriteTransaction(
  db: VaultDb,
  mutate: (store: WritableVaultStore) => Promise<VaultWrite | null>,
): Promise<VaultWrite> {
  const tx = db.transaction(VAULT_STORE_NAME, 'readwrite')
  try {
    const refusal = await mutate(tx.objectStore(VAULT_STORE_NAME))
    if (refusal) {
      tx.abort()
      await tx.done.catch(() => undefined)
      return refusal
    }
    await tx.done
  } catch (e) {
    try {
      tx.abort()
    } catch {
      // already aborted/finished — rollback has occurred either way
    }
    await tx.done.catch(() => undefined)
    if (isQuotaError(e)) return { ok: false, reason: 'quota' }
    return { ok: false, reason: 'write-failed', detail: e instanceof Error ? e.message : String(e) }
  }
  return { ok: true, persistGranted: await requestPersist() }
}

/** The full-vault write: first save AND restore both land here — model + both wraps,
 *  all-or-nothing. */
export async function writeVault(db: VaultDb, records: VaultRecords): Promise<VaultWrite> {
  return inWriteTransaction(db, async (store) => {
    // Per-put promises reject with AbortError if the tx aborts — the transaction's
    // own `done` carries the real outcome, so the per-put rejections are swallowed.
    void store.put(records.model, 'model').catch(() => undefined)
    void store.put(records.passphraseWrap, 'passphraseWrap').catch(() => undefined)
    void store.put(records.recoveryWrap, 'recoveryWrap').catch(() => undefined)
    return null
  })
}

/** The model-only re-encrypt entry point: a fresh box under the EXISTING DK, wraps
 *  untouched. Refuses against a vault that isn't fully present — a model record
 *  without its wraps is a stranded vault, not a save. */
export async function rewriteModel(db: VaultDb, model: ModelRecord): Promise<VaultWrite> {
  return inWriteTransaction(db, async (store) => {
    const [pw, rw] = await Promise.all([store.get('passphraseWrap'), store.get('recoveryWrap')])
    if (pw === undefined || rw === undefined) return { ok: false, reason: 'no-vault' }
    void store.put(model, 'model').catch(() => undefined)
    return null
  })
}

/** The passphrase-change record op: swap ONLY the passphrase wrap (same key, one put —
 *  the new wrap replaces the old in the same transaction). Recovery wrap untouched. */
export async function replacePassphraseWrap(db: VaultDb, wrap: WrapRecord): Promise<VaultWrite> {
  return inWriteTransaction(db, async (store) => {
    const [model, rw] = await Promise.all([store.get('model'), store.get('recoveryWrap')])
    if (model === undefined || rw === undefined) return { ok: false, reason: 'no-vault' }
    void store.put(wrap, 'passphraseWrap').catch(() => undefined)
    return null
  })
}

/** Wipe the vault (the restore-over-damaged path + tests/e2e). One transaction. */
export async function clearVault(db: VaultDb): Promise<void> {
  const tx = db.transaction(VAULT_STORE_NAME, 'readwrite')
  void tx.objectStore(VAULT_STORE_NAME).clear()
  await tx.done
}
