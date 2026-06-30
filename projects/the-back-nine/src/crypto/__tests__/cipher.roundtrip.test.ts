/**
 * cipher.ts — AES-GCM round-trip + the DK lifecycle battery.
 *
 * No external vectors here ON PURPOSE: GCM ciphertexts are IV-dependent and the IV is
 * minted internally (the structural IV-reuse guard), so a published vector can't be
 * replayed through the public API. Correctness is behavioral — round-trips, cross-key
 * failures, tamper detection — on top of the platform's WebCrypto (whose own GCM is
 * the trusted primitive, same posture as reading the IRS table verbatim). The kdf
 * battery already proves our key-derivation parameterization against RFC vectors.
 */
import { describe, expect, it } from 'vitest'

import {
  CipherAuthError,
  DK_BYTES,
  IV_BYTES,
  decrypt,
  encrypt,
  mintWrappedDataKey,
  rewrapDataKey,
  unwrapDataKey,
} from '../cipher'
import { derivePassphraseKey } from '../kdf'

const utf8 = (s: string): Uint8Array<ArrayBuffer> => new TextEncoder().encode(s) as Uint8Array<ArrayBuffer>

const bytesToHex = (bytes: Uint8Array): string => [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')

async function freshAesKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])
}

/** Behavioral key-material equality for non-extractable keys (same probe as kdf tests). */
async function sameKeyMaterial(encKey: CryptoKey, decKey: CryptoKey): Promise<boolean> {
  const iv = new Uint8Array(12).fill(7)
  const probe = utf8('dk equivalence probe')
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, encKey, probe)
  try {
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, decKey, ct)
    return bytesToHex(new Uint8Array(pt)) === bytesToHex(probe)
  } catch {
    return false
  }
}

describe('encrypt / decrypt', () => {
  it('round-trips bytes exactly', async () => {
    const key = await freshAesKey()
    const plaintext = utf8('{"schemaVersion":1,"seed":305419896}')
    const box = await encrypt(key, plaintext)
    const back = await decrypt(key, box)
    expect(bytesToHex(back)).toBe(bytesToHex(plaintext))
  })

  it('mints a FRESH 12-byte IV per call — same input twice gives different iv AND ciphertext', async () => {
    const key = await freshAesKey()
    const plaintext = utf8('identical plaintext')
    const a = await encrypt(key, plaintext)
    const b = await encrypt(key, plaintext)
    expect(a.iv.length).toBe(IV_BYTES)
    expect(b.iv.length).toBe(IV_BYTES)
    expect(bytesToHex(a.iv)).not.toBe(bytesToHex(b.iv))
    expect(bytesToHex(a.ciphertext)).not.toBe(bytesToHex(b.ciphertext))
  })

  it('decrypt under a different key throws CipherAuthError (the wrong-passphrase shape)', async () => {
    const box = await encrypt(await freshAesKey(), utf8('secret'))
    await expect(decrypt(await freshAesKey(), box)).rejects.toBeInstanceOf(CipherAuthError)
  })

  it('a tampered ciphertext byte fails the auth tag', async () => {
    const key = await freshAesKey()
    const box = await encrypt(key, utf8('secret'))
    const tampered = new Uint8Array(box.ciphertext)
    tampered[0] = tampered[0]! ^ 0xff
    await expect(decrypt(key, { iv: box.iv, ciphertext: tampered })).rejects.toBeInstanceOf(CipherAuthError)
  })

  it('a tampered IV fails the auth tag', async () => {
    const key = await freshAesKey()
    const box = await encrypt(key, utf8('secret'))
    const badIv = new Uint8Array(box.iv)
    badIv[0] = badIv[0]! ^ 0xff
    await expect(decrypt(key, { iv: badIv, ciphertext: box.ciphertext })).rejects.toBeInstanceOf(CipherAuthError)
  })

  it('a truncated ciphertext fails cleanly (the "data damaged" shape, never garbage output)', async () => {
    const key = await freshAesKey()
    const box = await encrypt(key, utf8('a long enough secret to truncate meaningfully'))
    await expect(
      decrypt(key, { iv: box.iv, ciphertext: box.ciphertext.slice(0, box.ciphertext.length - 4) }),
    ).rejects.toBeInstanceOf(CipherAuthError)
  })
})

describe('mintWrappedDataKey', () => {
  const salt = new Uint8Array(16).fill(1)
  const recoverySalt = new Uint8Array(16).fill(2)

  async function credentials() {
    return {
      passphrase: await derivePassphraseKey('a perfectly serviceable passphrase', salt),
      recovery: await derivePassphraseKey('a different recovery passphrase here', recoverySalt),
    }
  }

  it('returns a non-extractable DK and two DISTINCT wraps that both unwrap to the same key material', async () => {
    const creds = await credentials()
    const minted = await mintWrappedDataKey(creds.passphrase, creds.recovery)
    expect(minted.dataKey.extractable).toBe(false)
    await expect(crypto.subtle.exportKey('raw', minted.dataKey)).rejects.toThrow()

    expect(bytesToHex(minted.passphraseWrap.ciphertext)).not.toBe(bytesToHex(minted.recoveryWrap.ciphertext))

    const viaPassphrase = await unwrapDataKey(creds.passphrase, minted.passphraseWrap)
    const viaRecovery = await unwrapDataKey(creds.recovery, minted.recoveryWrap)
    expect(await sameKeyMaterial(viaPassphrase, minted.dataKey)).toBe(true)
    expect(await sameKeyMaterial(viaRecovery, minted.dataKey)).toBe(true)
  })

  it('the wrap is GCM ciphertext of the 32 raw DK bytes (32 + 16 tag), never the raw bytes', async () => {
    const creds = await credentials()
    const minted = await mintWrappedDataKey(creds.passphrase, creds.recovery)
    expect(DK_BYTES).toBe(32)
    expect(minted.passphraseWrap.ciphertext.length).toBe(DK_BYTES + 16)
    expect(minted.recoveryWrap.ciphertext.length).toBe(DK_BYTES + 16)
  })

  it('unwrap under the WRONG credential key throws CipherAuthError (negative pairing)', async () => {
    const creds = await credentials()
    const minted = await mintWrappedDataKey(creds.passphrase, creds.recovery)
    await expect(unwrapDataKey(creds.recovery, minted.passphraseWrap)).rejects.toBeInstanceOf(CipherAuthError)
    await expect(unwrapDataKey(creds.passphrase, minted.recoveryWrap)).rejects.toBeInstanceOf(CipherAuthError)
  })

  it('an unwrapped DK is itself non-extractable', async () => {
    const creds = await credentials()
    const minted = await mintWrappedDataKey(creds.passphrase, creds.recovery)
    const unwrapped = await unwrapDataKey(creds.passphrase, minted.passphraseWrap)
    expect(unwrapped.extractable).toBe(false)
    await expect(crypto.subtle.exportKey('raw', unwrapped)).rejects.toThrow()
  })

  it('two mints produce different DKs (fresh CSPRNG bytes per vault)', async () => {
    const creds = await credentials()
    const a = await mintWrappedDataKey(creds.passphrase, creds.recovery)
    const b = await mintWrappedDataKey(creds.passphrase, creds.recovery)
    expect(await sameKeyMaterial(a.dataKey, b.dataKey)).toBe(false)
  })
})

describe('rewrapDataKey (passphrase change — recovery untouched)', () => {
  it('the new wrap opens under the new credential; the old recovery wrap still opens; ciphertext under DK stays readable', async () => {
    const oldPass = await derivePassphraseKey('the original passphrase here', new Uint8Array(16).fill(3))
    const newPass = await derivePassphraseKey('a brand new passphrase now!', new Uint8Array(16).fill(4))
    const recovery = await derivePassphraseKey('a recovery passphrase here', new Uint8Array(16).fill(5))

    const minted = await mintWrappedDataKey(oldPass, recovery)
    const model = await encrypt(minted.dataKey, new TextEncoder().encode('the plan'))

    const newWrap = await rewrapDataKey(oldPass, minted.passphraseWrap, newPass)

    // New wrap → same DK material; the model encrypted under DK stays decryptable.
    const viaNew = await unwrapDataKey(newPass, newWrap)
    expect(await sameKeyMaterial(viaNew, minted.dataKey)).toBe(true)
    const back = await decrypt(viaNew, model)
    expect(new TextDecoder().decode(back)).toBe('the plan')

    // The recovery wrap is UNTOUCHED and still opens (phrase immutability).
    const viaRecovery = await unwrapDataKey(recovery, minted.recoveryWrap)
    expect(await sameKeyMaterial(viaRecovery, minted.dataKey)).toBe(true)

    // The old passphrase wrap no longer matters, but the new wrap is a fresh box.
    expect(bytesToHex(newWrap.iv)).not.toBe(bytesToHex(minted.passphraseWrap.iv))
    expect(bytesToHex(newWrap.ciphertext)).not.toBe(bytesToHex(minted.passphraseWrap.ciphertext))
  })

  it('rewrap with a WRONG current credential fails (cannot re-key a vault you cannot open)', async () => {
    const oldPass = await derivePassphraseKey('the original passphrase here', new Uint8Array(16).fill(3))
    const wrongPass = await derivePassphraseKey('not the original passphrase', new Uint8Array(16).fill(3))
    const newPass = await derivePassphraseKey('a brand new passphrase now!', new Uint8Array(16).fill(4))
    const recovery = await derivePassphraseKey('a recovery passphrase here', new Uint8Array(16).fill(5))

    const minted = await mintWrappedDataKey(oldPass, recovery)
    await expect(rewrapDataKey(wrongPass, minted.passphraseWrap, newPass)).rejects.toBeInstanceOf(CipherAuthError)
  })
})
