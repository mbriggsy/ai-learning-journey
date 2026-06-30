/**
 * kdf.ts — the U4 key-derivation battery.
 *
 * External-fixture discipline (DND/012) adapted to NON-EXTRACTABLE keys: a derived
 * CryptoKey cannot be compared to a published vector directly (extractable:false is
 * the product contract), so correctness is proven in two independent layers:
 *
 *   1. HARNESS PROOFS — `crypto.subtle.deriveBits` is run against the published RFC
 *      vectors (RFC 7914 §11 for PBKDF2-HMAC-SHA-256), proving the platform primitive
 *      + this file's own hex/ASCII plumbing are right.
 *   2. EQUIVALENCE PROBES — the production derive functions are checked against an
 *      INDEPENDENT deriveBits→importKey construction using the documented parameters
 *      (600k/SHA-256/utf8). If our wiring mis-parameterizes anything (hash, iterations,
 *      salt/encoding), the probe ciphertext fails to decrypt. The RFC layer proves the
 *      probe's own assumptions. (The recovery wrap now rides this SAME PBKDF2 path — the
 *      2026-06-30 council retired the HKDF-over-128-bit-phrase recovery key.)
 *
 * The vectors below are transcribed VERBATIM from the RFC texts (fetched 2026-06-10
 * from rfc-editor.org), never recomputed locally.
 */
import { describe, expect, it } from 'vitest'

import {
  AES_KEY_BITS,
  KDF_HASH,
  PASSPHRASE_MIN_LENGTH,
  PASSPHRASE_MIN_SCORE,
  PBKDF2_ITERATIONS,
  SALT_BYTES,
  checkPassphraseFloor,
  deriveNewPassphraseKey,
  derivePassphraseKey,
} from '../kdf'

const ascii = (s: string): Uint8Array<ArrayBuffer> => new TextEncoder().encode(s) as Uint8Array<ArrayBuffer>

const hexToBytes = (hex: string): Uint8Array<ArrayBuffer> => {
  const clean = hex.replace(/\s+/g, '')
  const out = new Uint8Array(clean.length / 2)
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16)
  return out
}

const bytesToHex = (bytes: ArrayBuffer): string =>
  [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('')

/** Encrypt a fixed probe under `encKey`, decrypt under `decKey` — true iff the two
 *  keys hold identical material (the behavioral equality test for non-extractable keys). */
async function sameKeyMaterial(encKey: CryptoKey, decKey: CryptoKey): Promise<boolean> {
  const iv = new Uint8Array(12).fill(7)
  const probe = ascii('the-back-nine kdf equivalence probe')
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, encKey, probe)
  try {
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, decKey, ct)
    return bytesToHex(pt) === bytesToHex(probe.buffer as ArrayBuffer)
  } catch {
    return false
  }
}

/** The independent construction: deriveBits with explicit documented params, then
 *  importKey the raw bits as AES-GCM. Used to cross-check the production deriveKey path. */
async function independentPbkdf2Key(
  passphrase: string,
  salt: Uint8Array<ArrayBuffer>,
  iterations: number,
): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey('raw', ascii(passphrase), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, base, 256)
  return crypto.subtle.importKey('raw', bits, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt'])
}

// ---------------------------------------------------------------------------
// 1. Harness proofs — published RFC vectors, transcribed verbatim.
// ---------------------------------------------------------------------------

describe('harness proofs (external RFC vectors, DND/012)', () => {
  it('PBKDF2-HMAC-SHA-256 matches RFC 7914 §11 vector 1 (P="passwd", S="salt", c=1, dkLen=64)', async () => {
    const expected =
      '55 ac 04 6e 56 e3 08 9f ec 16 91 c2 25 44 b6 05' +
      'f9 41 85 21 6d de 04 65 e6 8b 9d 57 c2 0d ac bc' +
      '49 ca 9c cc f1 79 b6 45 99 16 64 b3 9d 77 ef 31' +
      '7c 71 b8 45 b1 e3 0b d5 09 11 20 41 d3 a1 97 83'
    const base = await crypto.subtle.importKey('raw', ascii('passwd'), 'PBKDF2', false, ['deriveBits'])
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', hash: 'SHA-256', salt: ascii('salt'), iterations: 1 },
      base,
      64 * 8,
    )
    expect(bytesToHex(bits)).toBe(bytesToHex(hexToBytes(expected).buffer as ArrayBuffer))
  })

  it('PBKDF2-HMAC-SHA-256 matches RFC 7914 §11 vector 2 (P="Password", S="NaCl", c=80000, dkLen=64)', async () => {
    const expected =
      '4d dc d8 f6 0b 98 be 21 83 0c ee 5e f2 27 01 f9' +
      '64 1a 44 18 d0 4c 04 14 ae ff 08 87 6b 34 ab 56' +
      'a1 d4 25 a1 22 58 33 54 9a db 84 1b 51 c9 b3 17' +
      '6a 27 2b de bb a1 d0 78 47 8f 62 b3 97 f3 3c 8d'
    const base = await crypto.subtle.importKey('raw', ascii('Password'), 'PBKDF2', false, ['deriveBits'])
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', hash: 'SHA-256', salt: ascii('NaCl'), iterations: 80000 },
      base,
      64 * 8,
    )
    expect(bytesToHex(bits)).toBe(bytesToHex(hexToBytes(expected).buffer as ArrayBuffer))
  })
})

// ---------------------------------------------------------------------------
// 2. Pinned constants — the spec figures (findings §Strand 2 + the U4 plan).
// ---------------------------------------------------------------------------

describe('pinned constants', () => {
  it('pins the §Strand 2 KDF parameters exactly', () => {
    expect(PBKDF2_ITERATIONS).toBe(600_000)
    expect(KDF_HASH).toBe('SHA-256')
    expect(SALT_BYTES).toBe(16)
    expect(AES_KEY_BITS).toBe(256)
  })

  it('pins the passphrase floor (zxcvbn score ≥ 3 AND independent length ≥ 12)', () => {
    expect(PASSPHRASE_MIN_SCORE).toBe(3)
    expect(PASSPHRASE_MIN_LENGTH).toBe(12)
  })
})

// ---------------------------------------------------------------------------
// 3. Production wiring — equivalence probes against the independent construction.
// ---------------------------------------------------------------------------

describe('derivePassphraseKey (unlock path)', () => {
  const salt = new Uint8Array(16).fill(3)

  it('derives exactly the documented PBKDF2-600k/SHA-256/utf8 key (equivalence probe)', async () => {
    const ours = await derivePassphraseKey('a perfectly serviceable passphrase', salt)
    const independent = await independentPbkdf2Key('a perfectly serviceable passphrase', salt, 600_000)
    expect(await sameKeyMaterial(ours, independent)).toBe(true)
    expect(await sameKeyMaterial(independent, ours)).toBe(true)
  })

  it('is deterministic: same passphrase + salt twice → interchangeable keys', async () => {
    const a = await derivePassphraseKey('a perfectly serviceable passphrase', salt)
    const b = await derivePassphraseKey('a perfectly serviceable passphrase', salt)
    expect(await sameKeyMaterial(a, b)).toBe(true)
  })

  it('a different salt yields a different key (the probe fails to decrypt)', async () => {
    const a = await derivePassphraseKey('a perfectly serviceable passphrase', salt)
    const b = await derivePassphraseKey('a perfectly serviceable passphrase', new Uint8Array(16).fill(4))
    expect(await sameKeyMaterial(a, b)).toBe(false)
  })

  it('the derived key is NOT extractable (script-exfiltration guard)', async () => {
    const key = await derivePassphraseKey('a perfectly serviceable passphrase', salt)
    expect(key.extractable).toBe(false)
    await expect(crypto.subtle.exportKey('raw', key)).rejects.toThrow()
  })

  it('does NOT gate on the floor — a weak passphrase still derives (unlock must never be lockout-able by scorer drift)', async () => {
    // A vault can only ever have a floor-passing passphrase, but the UNLOCK path
    // derives whatever the user typed: a wrong weak guess must surface as a GCM
    // failure ("didn't unlock"), and a future zxcvbn version re-scoring the user's
    // real passphrase below the floor must never brick the unlock. (The floor gates
    // wrap-MINTING — deriveNewPassphraseKey — not derivation per se.)
    const key = await derivePassphraseKey('weak', salt)
    expect(key.type).toBe('secret')
  })
})

// ---------------------------------------------------------------------------
// 4. The passphrase floor — gates wrap-minting, never unlock.
// ---------------------------------------------------------------------------

describe('checkPassphraseFloor', () => {
  it('rejects a passphrase below the independent length floor even if it scores well', async () => {
    // 11 code points of high-entropy junk — likely score ≥ 3, but length < 12.
    const result = await checkPassphraseFloor('xK9#mQ2$vL7')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reasons).toContain('below-min-length')
  })

  it('rejects a long-but-trivial passphrase on score (length alone is not the floor)', async () => {
    const result = await checkPassphraseFloor('aaaaaaaaaaaaaaaaaaaa')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reasons).toContain('below-min-score')
      expect(result.reasons).not.toContain('below-min-length')
    }
  })

  it('a weak short passphrase reports BOTH reasons (calm UI gets the full picture)', async () => {
    const result = await checkPassphraseFloor('password')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reasons).toContain('below-min-length')
      expect(result.reasons).toContain('below-min-score')
    }
  })

  it('counts length in CODE POINTS, not UTF-16 units (surrogate pairs cannot inflate the floor)', async () => {
    // 6 emoji = 12 UTF-16 units but only 6 code points — must FAIL the length floor.
    const result = await checkPassphraseFloor('😀😀😀😀😀😀')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reasons).toContain('below-min-length')
  })

  it('passes a genuinely strong ≥12 passphrase and mints the floor-checked carrier', async () => {
    const result = await checkPassphraseFloor('plinth otter vivid casket 92 lampoon')
    expect(result.ok).toBe(true)
  })

  it('the floor-checked carrier derives the SAME key the raw string would (the set path is not a different derivation)', async () => {
    const salt = new Uint8Array(16).fill(5)
    const checked = await checkPassphraseFloor('plinth otter vivid casket 92 lampoon')
    expect(checked.ok).toBe(true)
    if (!checked.ok) return
    const viaSet = await deriveNewPassphraseKey(checked.passphrase, salt)
    const viaUnlock = await derivePassphraseKey('plinth otter vivid casket 92 lampoon', salt)
    expect(await sameKeyMaterial(viaSet, viaUnlock)).toBe(true)
  })
})
