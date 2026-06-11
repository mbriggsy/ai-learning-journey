/**
 * The two key-derivation primitives + the passphrase floor (P1·U4).
 *
 * PASSPHRASE → KEY: PBKDF2-HMAC-SHA-256 @ 600,000 iterations (OWASP's WebCrypto-native
 * figure — findings §Strand 2; Argon2id stays a WASM-era option only), 16-byte random
 * salt, deriving AES-GCM-256 with `extractable:false`. The derivation is the SOLE
 * at-rest defense (extractable:false stops script exfiltration of an unlocked key only;
 * the offline attacker brute-forces the passphrase against the blob directly), which is
 * why the passphrase floor below is a security boundary, not UX polish.
 *
 * RECOVERY PHRASE → KEY: the 12-word phrase already carries full 128-bit entropy, so the
 * correct primitive is key-EXPANSION — HKDF-SHA-256 (PBKDF2's password-stretching adds
 * nothing against a 128-bit secret). IKM = the phrase's decoded entropy bytes (NOT the
 * utf8 words — the canonical byte content survives wordlist-presentation concerns),
 * salt = the recoveryWrap record's own 16-byte salt, and the MANDATORY pinned `info`
 * domain-separation string. `info` is what prevents a key collision if a second HKDF use
 * over the same phrase is ever added; its `/v1` suffix is the future rotation lever.
 *
 * THE FLOOR GATES WRAP-MINTING, NEVER UNLOCK. `deriveNewPassphraseKey` (the set path —
 * minting a new passphraseWrap) accepts only the `FloorCheckedPassphrase` brand that
 * `checkPassphraseFloor` mints, so a weak passphrase structurally cannot reach a wrap.
 * `derivePassphraseKey` (the unlock path) takes a raw string on purpose: zxcvbn's
 * scoring drifts across library versions, and a floor on unlock would let a future
 * re-score of the user's REAL passphrase brick their own vault — the calm-but-wrong
 * class, survivor edition. A vault can only ever hold a floor-passing passphrase, so
 * the asymmetry loses nothing.
 *
 * zxcvbn-ts is loaded via dynamic import: its dictionaries are heavy and the floor only
 * runs at passphrase-set — they must never ride the entry chunk (the ≤300 KiB budget).
 */

export const PBKDF2_ITERATIONS = 600_000
export const KDF_HASH = 'SHA-256'
export const SALT_BYTES = 16
export const AES_KEY_BITS = 256
/** Mandatory HKDF domain separation (the /v1 enables future rotation). Pinned here
 *  beside the PBKDF2 params per the U4 plan — never inlined at a call site. */
export const HKDF_RECOVERY_INFO = 'the-back-nine/recovery-wrap/v1'
/** The pinned passphrase floor (plan-level decision, U4 → P2·U8): zxcvbn-ts score ≥ 3
 *  AND an independent length ≥ 12 — the sole at-rest defense is KDF hardness, so both
 *  clauses are load-bearing (strong-but-short and long-but-common each fail one). */
export const PASSPHRASE_MIN_SCORE = 3
export const PASSPHRASE_MIN_LENGTH = 12

const utf8 = new TextEncoder()

/** The exact PBKDF2 parameter object both the production deriveKey and any
 *  equivalence test must share — single-sourced so a drift is impossible. */
export function pbkdf2Params(salt: Uint8Array): Pbkdf2Params {
  return { name: 'PBKDF2', hash: KDF_HASH, salt: salt as BufferSource, iterations: PBKDF2_ITERATIONS }
}

/** The exact HKDF parameter object for the recovery wrap (pinned info baked in). */
export function hkdfRecoveryParams(salt: Uint8Array): HkdfParams {
  return { name: 'HKDF', hash: KDF_HASH, salt: salt as BufferSource, info: utf8.encode(HKDF_RECOVERY_INFO) as BufferSource }
}

const AES_DERIVED_KEY = { name: 'AES-GCM', length: AES_KEY_BITS } as const

/**
 * The UNLOCK-path derivation: passphrase string → AES-GCM-256 CryptoKey,
 * `extractable:false`. Deliberately NOT floor-gated (see the header).
 * ~0.5–1.5 s on a mid-tier phone — every caller renders the pending state
 * (the U4 state-machine contract); never assume the platform off-threads it.
 */
export async function derivePassphraseKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey('raw', utf8.encode(passphrase) as BufferSource, 'PBKDF2', false, [
    'deriveKey',
  ])
  return crypto.subtle.deriveKey(pbkdf2Params(salt), base, AES_DERIVED_KEY, false, ['encrypt', 'decrypt'])
}

declare const floorChecked: unique symbol
/** A passphrase that has passed the floor — mintable ONLY by `checkPassphraseFloor`.
 *  The brand is the structural seam: wrap-minting code paths accept this type and
 *  never a raw string, so "deriveKey is unreachable below the floor" holds by
 *  construction on the set path. */
export interface FloorCheckedPassphrase {
  readonly [floorChecked]: true
  readonly value: string
}

export type FloorReason = 'below-min-length' | 'below-min-score'
export type FloorResult =
  | { readonly ok: true; readonly passphrase: FloorCheckedPassphrase }
  | { readonly ok: false; readonly reasons: readonly FloorReason[] }

/** zxcvbn-ts v3 scorer, memoized: the installed 3.0.4 API is the module-global
 *  `zxcvbnOptions.setOptions` + `zxcvbn(password)` (ZxcvbnFactory is a later major).
 *  The dictionary setup is expensive and the options static, so configure once.
 *  Dynamic import keeps the heavy dictionaries out of every static import graph. */
let scorer: Promise<(password: string) => { score: number }> | undefined
function loadZxcvbn() {
  scorer ??= Promise.all([
    import('@zxcvbn-ts/core'),
    import('@zxcvbn-ts/language-common'),
    import('@zxcvbn-ts/language-en'),
  ]).then(([core, common, en]) => {
    core.zxcvbnOptions.setOptions({
      translations: en.translations,
      graphs: common.adjacencyGraphs,
      dictionary: { ...common.dictionary, ...en.dictionary },
    })
    return core.zxcvbn
  })
  return scorer
}

/**
 * The floor check — the ONLY minter of `FloorCheckedPassphrase`. Length counts CODE
 * POINTS (not UTF-16 units) so surrogate pairs can't inflate a 6-character passphrase
 * past the floor. Both failing reasons are reported together so the calm UI (P2·U8)
 * can show the full picture in one pass.
 */
export async function checkPassphraseFloor(passphrase: string): Promise<FloorResult> {
  const reasons: FloorReason[] = []
  if ([...passphrase].length < PASSPHRASE_MIN_LENGTH) reasons.push('below-min-length')
  const zxcvbn = await loadZxcvbn()
  if (zxcvbn(passphrase).score < PASSPHRASE_MIN_SCORE) reasons.push('below-min-score')
  if (reasons.length > 0) return { ok: false, reasons }
  return { ok: true, passphrase: { value: passphrase } as FloorCheckedPassphrase }
}

/**
 * The SET-path derivation: identical key math to `derivePassphraseKey`, but reachable
 * only through the floor brand — minting a new passphraseWrap under a weak passphrase
 * is a compile-time error, not a runtime hope.
 */
export async function deriveNewPassphraseKey(checked: FloorCheckedPassphrase, salt: Uint8Array): Promise<CryptoKey> {
  return derivePassphraseKey(checked.value, salt)
}

/**
 * The RECOVERY-path derivation: 128-bit phrase entropy → HKDF-SHA-256 → AES-GCM-256,
 * `extractable:false`, with the pinned domain-separation info.
 */
export async function deriveRecoveryKey(entropy: Uint8Array, salt: Uint8Array): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey('raw', entropy as BufferSource, 'HKDF', false, ['deriveKey'])
  return crypto.subtle.deriveKey(hkdfRecoveryParams(salt), base, AES_DERIVED_KEY, false, ['encrypt', 'decrypt'])
}
