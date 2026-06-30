/**
 * Export / restore (P1·U4) — ONE mechanism, the durability backstop.
 *
 * EXPORT = the encrypted vault as a JSON file: the model box + the recoveryWrap
 * (with its KDF salt), under an explicit format + formatVersion checked BEFORE any
 * decrypt. Deliberately NO passphraseWrap (src/shared/model.ts BackupFileV1 doc):
 * the spec'd restore path re-mints a fresh passphrase wrap, and a file that the old
 * passphrase could open would hole the negative-pairing guarantee for every export
 * sitting in cloud storage. The file is exactly as protected as the vault itself —
 * AES-GCM under DK, recoverable only with the recovery passphrase. Note the export's
 * at-rest strength is now that of a memorable user-chosen credential (the 2026-06-30
 * council rework), not the old 128-bit phrase — the ceremony discloses that downgrade.
 *
 * RESTORE = file + recovery passphrase → set NEW passphrase. Mirrors the in-place
 * recovery unlock's gate (the new passphraseWrap is minted as part of the SAME
 * atomic write that lands the vault — there is never a restored vault whose
 * passphrase wrap encodes anything but the fresh passphrase). Refuses over a
 * HEALTHY vault: silently overwriting live data is the one thing a durability
 * mechanism must never do — the P2 flow clears the vault explicitly first.
 *
 * The raw DK bytes never surface here: the new wrap is minted via
 * `rewrapDataKey(recoveryKey, fileWrap, newPassphraseKey)` (function-scoped bytes,
 * cipher.ts), and the model plaintext is decrypted only to VALIDATE it (codec)
 * before the encrypted records — unchanged — are written.
 */
import {
  BACKUP_FORMAT,
  BACKUP_FORMAT_VERSION,
  type BackupFileV1,
  type WrapRecord,
} from '@shared/model'
import { decodeScenario } from '@shared/scenarioCodec'

import { CipherAuthError, decrypt, rewrapDataKey, unwrapDataKey } from '../crypto/cipher'
import { SALT_BYTES, deriveNewPassphraseKey, derivePassphraseKey, type FloorCheckedPassphrase } from '../crypto/kdf'
import { loadVault, serializeVaultWrite, writeVault, type VaultDb } from './db'

export type ExportResult =
  | { readonly ok: true; readonly file: string }
  | { readonly ok: false; readonly reason: 'no-vault' }
  | { readonly ok: false; readonly reason: 'damaged'; readonly detail: string }

export type RestoreResult =
  | { readonly ok: true }
  | {
      readonly ok: false
      /** `wrong-recovery-passphrase` is GCM-ambiguous BY NATURE: a bit-rotted recoveryWrap
       *  with the CORRECT credential is cryptographically indistinguishable from a wrong
       *  credential with an intact wrap. The P2 copy must hedge BOTH ways ("that recovery
       *  word doesn't match this backup — or the file is damaged; try another export"). */
      readonly reason: 'vault-exists' | 'file-damaged' | 'newer-format' | 'wrong-recovery-passphrase' | 'quota'
    }
  /** The backup's MODEL was written by a newer app (schemaVersion above this build's
   *  ladder) — intact data, wrong app vintage. NEVER 'file-damaged' (telling a
   *  survivor their good backup is corrupt is the calm-but-wrong sin). Distinct from
   *  'newer-format' (the file ENVELOPE version). */
  | { readonly ok: false; readonly reason: 'newer-version'; readonly got: number }
  | { readonly ok: false; readonly reason: 'write-failed'; readonly detail: string }

const toB64 = (bytes: Uint8Array): string => {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin)
}

const fromB64 = (s: string): Uint8Array<ArrayBuffer> => Uint8Array.from(atob(s), (c) => c.charCodeAt(0))

/** Serialize the vault to the BackupFileV1 JSON string (the caller owns the download). */
export async function exportVault(db: VaultDb): Promise<ExportResult> {
  const vault = await loadVault(db)
  if (vault.kind === 'no-vault') return { ok: false, reason: 'no-vault' }
  if (vault.kind === 'damaged') return { ok: false, reason: 'damaged', detail: vault.detail }

  const file: BackupFileV1 = {
    format: BACKUP_FORMAT,
    formatVersion: BACKUP_FORMAT_VERSION,
    model: { iv: toB64(vault.model.iv), ciphertext: toB64(vault.model.ciphertext) },
    recoveryWrap: {
      salt: toB64(vault.recoveryWrap.salt),
      iv: toB64(vault.recoveryWrap.iv),
      wrappedDataKey: toB64(vault.recoveryWrap.wrappedDataKey),
    },
  }
  return { ok: true, file: JSON.stringify(file) }
}

/** Parse + format-gate the file BEFORE any cryptography. Returns null on damage. */
function parseBackupFile(text: string): BackupFileV1 | 'damaged' | 'newer-format' {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return 'damaged'
  }
  if (typeof parsed !== 'object' || parsed === null) return 'damaged'
  const obj = parsed as Record<string, unknown>
  if (obj.format !== BACKUP_FORMAT) return 'damaged'
  if (typeof obj.formatVersion !== 'number' || !Number.isInteger(obj.formatVersion)) return 'damaged'
  if (obj.formatVersion > BACKUP_FORMAT_VERSION) return 'newer-format'
  if (obj.formatVersion !== BACKUP_FORMAT_VERSION) return 'damaged'

  const model = obj.model as Record<string, unknown> | undefined
  const wrap = obj.recoveryWrap as Record<string, unknown> | undefined
  const isB64Field = (v: unknown): v is string => typeof v === 'string' && v.length > 0
  if (!model || !isB64Field(model.iv) || !isB64Field(model.ciphertext)) return 'damaged'
  if (!wrap || !isB64Field(wrap.salt) || !isB64Field(wrap.iv) || !isB64Field(wrap.wrappedDataKey)) return 'damaged'
  return obj as unknown as BackupFileV1
}

/**
 * Restore a backup file with the recovery phrase, setting a NEW (floor-checked)
 * passphrase — the device-wiped survivor's door. One atomic vault write; nothing
 * lands on any failure path.
 */
export async function restoreVault(
  db: VaultDb,
  fileText: string,
  recoveryPassphrase: string,
  newPassphrase: FloorCheckedPassphrase,
): Promise<RestoreResult> {
  // Fast-path refusal before any crypto (UX); the AUTHORITATIVE check re-runs inside
  // the serialized critical section with the write (two no-vault tabs racing restores
  // cannot both pass that one — the U4 boundary-review TOCTOU fold).
  const existing = await loadVault(db)
  if (existing.kind === 'vault') return { ok: false, reason: 'vault-exists' }

  const file = parseBackupFile(fileText)
  if (file === 'damaged') return { ok: false, reason: 'file-damaged' }
  if (file === 'newer-format') return { ok: false, reason: 'newer-format' }

  let modelIv: Uint8Array<ArrayBuffer>
  let modelCiphertext: Uint8Array<ArrayBuffer>
  let recoverySalt: Uint8Array<ArrayBuffer>
  let recoveryIv: Uint8Array<ArrayBuffer>
  let recoveryWrapped: Uint8Array<ArrayBuffer>
  try {
    modelIv = fromB64(file.model.iv)
    modelCiphertext = fromB64(file.model.ciphertext)
    recoverySalt = fromB64(file.recoveryWrap.salt)
    recoveryIv = fromB64(file.recoveryWrap.iv)
    recoveryWrapped = fromB64(file.recoveryWrap.wrappedDataKey)
  } catch {
    return { ok: false, reason: 'file-damaged' } // invalid base64 is file damage
  }

  // The recovery credential is a user-chosen passphrase: derive via the UNLOCK path
  // (raw string, never floor-gated — a future zxcvbn re-score must not brick a real
  // backup) over the file's own recoveryWrap salt.
  const recoveryKey = await derivePassphraseKey(recoveryPassphrase, recoverySalt)
  const fileWrap = { iv: recoveryIv, ciphertext: recoveryWrapped }

  let dk: CryptoKey
  try {
    dk = await unwrapDataKey(recoveryKey, fileWrap)
  } catch (e) {
    if (e instanceof CipherAuthError) return { ok: false, reason: 'wrong-recovery-passphrase' }
    throw e
  }

  // The phrase OPENED the wrap — a GCM failure on the model is file damage; a
  // structurally invalid plaintext is equally a damaged backup; but an intact model
  // written by a NEWER app is its own honest state, never "damaged".
  try {
    const plaintext = await decrypt(dk, { iv: modelIv, ciphertext: modelCiphertext })
    const decoded = decodeScenario(plaintext)
    if (!decoded.ok) {
      if (decoded.reason === 'newer-version') return { ok: false, reason: 'newer-version', got: decoded.got }
      return { ok: false, reason: 'file-damaged' }
    }
  } catch (e) {
    if (e instanceof CipherAuthError) return { ok: false, reason: 'file-damaged' }
    throw e
  }

  // Mint the fresh passphrase wrap (raw DK stays function-scoped in cipher.ts) and
  // land everything in ONE atomic write, with the no-vault check INSIDE the same
  // serialized critical section (check-then-write is atomic realm-wide + cross-tab).
  const newSalt = crypto.getRandomValues(new Uint8Array(SALT_BYTES))
  const newPassKey = await deriveNewPassphraseKey(newPassphrase, newSalt)
  const newWrapBox = await rewrapDataKey(recoveryKey, fileWrap, newPassKey)
  const passphraseWrap: WrapRecord = { salt: newSalt, iv: newWrapBox.iv, wrappedDataKey: newWrapBox.ciphertext }

  const written = await serializeVaultWrite(async () => {
    const check = await loadVault(db)
    if (check.kind === 'vault') return 'vault-exists' as const
    return writeVault(db, {
      model: { iv: modelIv, ciphertext: modelCiphertext },
      passphraseWrap,
      recoveryWrap: { salt: recoverySalt, iv: recoveryIv, wrappedDataKey: recoveryWrapped },
    })
  })
  if (written === 'vault-exists') return { ok: false, reason: 'vault-exists' }
  if (!written.ok) {
    if (written.reason === 'quota') return { ok: false, reason: 'quota' }
    return { ok: false, reason: 'write-failed', detail: written.reason === 'no-vault' ? 'vault missing' : written.detail }
  }
  return { ok: true }
}
