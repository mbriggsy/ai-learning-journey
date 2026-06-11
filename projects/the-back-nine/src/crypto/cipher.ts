/**
 * AES-GCM + the data-key (DK) lifecycle (P1·U4).
 *
 * THE KEY HIERARCHY (the U4 plan's load-bearing extension): one stable random DK
 * encrypts the model; the passphrase-derived and recovery-derived credential keys each
 * wrap DK independently. One model copy ⇒ the recovery path can never restore a STALE
 * copy; a passphrase change is a cheap re-wrap; the common save is ONE encryption.
 *
 * "WRAPPING" IS encrypt() OF THE RAW DK BYTES — never WebCrypto `wrapKey()`, which
 * would force the DK to be `extractable:true` and hand any injected script
 * `exportKey('raw', dk)` as a one-call exfiltration, bypassing PBKDF2 entirely. The
 * composites below keep the raw bytes FUNCTION-SCOPED: they exist transiently inside
 * mint/unwrap/rewrap and are never returned, stored, or closed over. Every in-memory
 * DK handle is imported `extractable:false`.
 *
 * IVs ARE MINTED INSIDE `encrypt()` — a caller structurally cannot supply (and thus
 * cannot reuse) an IV. Fresh 96-bit random IV per encryption; the per-vault save count
 * sits many orders below the 2³² random-IV collision bound. DK encrypts exactly one
 * plaintext stream (the model); the wrap keys each encrypt exactly one 32-byte block.
 *
 * GCM auth failure surfaces as the typed `CipherAuthError` so the store layer can map
 * it to the calm "that passphrase didn't unlock this" / "data damaged" states without
 * string-matching DOMExceptions.
 */

export const IV_BYTES = 12
export const DK_BYTES = 32

/** One GCM encryption: the IV it was minted with + ciphertext (auth tag included).
 *  The persisted record shapes (src/shared/model.ts) embed exactly this pair. */
export interface GcmBox {
  readonly iv: Uint8Array<ArrayBuffer>
  readonly ciphertext: Uint8Array<ArrayBuffer>
}

/** GCM authentication failure — wrong key OR tampered/truncated data. The caller
 *  distinguishes "wrong passphrase" from "data damaged" by CONTEXT (which credential
 *  was being tried), never by parsing this error. */
export class CipherAuthError extends Error {
  constructor(cause: unknown) {
    super('AES-GCM authentication failed (wrong key or damaged data)')
    this.name = 'CipherAuthError'
    this.cause = cause
  }
}

const AES_GCM_256 = { name: 'AES-GCM', length: 256 } as const

/** Encrypt `plaintext` under `key` with a FRESH internally-minted IV. */
export async function encrypt(key: CryptoKey, plaintext: Uint8Array): Promise<GcmBox> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES))
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext as BufferSource)
  return { iv, ciphertext: new Uint8Array(ciphertext) }
}

/** Decrypt a box; throws `CipherAuthError` on any authentication failure. */
export async function decrypt(key: CryptoKey, box: GcmBox): Promise<Uint8Array<ArrayBuffer>> {
  try {
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: box.iv as BufferSource },
      key,
      box.ciphertext as BufferSource,
    )
    return new Uint8Array(plaintext)
  } catch (cause) {
    throw new CipherAuthError(cause)
  }
}

async function importDataKey(raw: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', raw as BufferSource, AES_GCM_256, false, ['encrypt', 'decrypt'])
}

export interface MintedDataKey {
  /** The live DK handle — `extractable:false`, in-memory only, never persisted. */
  readonly dataKey: CryptoKey
  /** DK wrapped under the passphrase-derived key (the passphraseWrap record's box). */
  readonly passphraseWrap: GcmBox
  /** DK wrapped under the recovery-derived key (the recoveryWrap record's box). */
  readonly recoveryWrap: GcmBox
}

/**
 * Mint a fresh 256-bit DK and wrap it under BOTH credential keys in one scope — the
 * raw bytes never leave this function. The first-save flow (and restore-sets-new-
 * passphrase) is the intended caller, writing both wraps in one atomic transaction.
 */
export async function mintWrappedDataKey(passphraseKey: CryptoKey, recoveryKey: CryptoKey): Promise<MintedDataKey> {
  const raw = crypto.getRandomValues(new Uint8Array(DK_BYTES))
  const dataKey = await importDataKey(raw)
  const passphraseWrap = await encrypt(passphraseKey, raw)
  const recoveryWrap = await encrypt(recoveryKey, raw)
  return { dataKey, passphraseWrap, recoveryWrap }
}

/**
 * Open a wrap under its credential key → a live non-extractable DK handle. The raw
 * bytes exist only inside this scope. Throws `CipherAuthError` on a wrong credential.
 */
export async function unwrapDataKey(credentialKey: CryptoKey, wrap: GcmBox): Promise<CryptoKey> {
  const raw = await decrypt(credentialKey, wrap)
  return importDataKey(raw)
}

/**
 * Re-wrap DK under a NEW credential key by opening an existing wrap — the passphrase-
 * change primitive (the recovery wrap is deliberately not a parameter: it is untouched
 * by a passphrase change, the phrase-immutability contract). Fresh IV by construction.
 */
export async function rewrapDataKey(
  currentCredentialKey: CryptoKey,
  currentWrap: GcmBox,
  newCredentialKey: CryptoKey,
): Promise<GcmBox> {
  const raw = await decrypt(currentCredentialKey, currentWrap)
  return encrypt(newCredentialKey, raw)
}
