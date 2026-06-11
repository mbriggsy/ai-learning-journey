/**
 * recoveryPhrase.ts — the BIP-39 battery.
 *
 * External fixtures (DND/012): the 8 official 128-bit Trezor reference vectors
 * (trezor/python-mnemonic vectors.json, fetched 2026-06-10) pin BOTH directions of the
 * entropy↔mnemonic mapping INCLUDING the SHA-256 checksum word — never recomputed via
 * this module's own encoder. The wordlist itself is pinned by length + anchors + the
 * full-list SHA-256 (insight 021: structural invariants admit smooth corruptions — a
 * single drifted word passes length/anchor checks, only the full-content hash catches it).
 */
import { describe, expect, it, vi } from 'vitest'

import { BIP39_ENGLISH } from '../reference/bip39EnglishWordlist'
import {
  ENTROPY_BYTES,
  WORDS_IN_PHRASE,
  entropyToPhrase,
  generateRecoveryPhrase,
  phraseToEntropy,
} from '../recoveryPhrase'

const hexToBytes = (hex: string): Uint8Array<ArrayBuffer> => {
  const out = new Uint8Array(hex.length / 2)
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  return out
}

const bytesToHex = (bytes: Uint8Array): string => [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')

/** The 8 official 128-bit (12-word) vectors — trezor/python-mnemonic vectors.json, verbatim. */
const OFFICIAL_VECTORS: ReadonlyArray<{ entropy: string; mnemonic: string }> = [
  {
    entropy: '00000000000000000000000000000000',
    mnemonic: 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
  },
  {
    entropy: '7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f',
    mnemonic: 'legal winner thank year wave sausage worth useful legal winner thank yellow',
  },
  {
    entropy: '80808080808080808080808080808080',
    mnemonic: 'letter advice cage absurd amount doctor acoustic avoid letter advice cage above',
  },
  {
    entropy: 'ffffffffffffffffffffffffffffffff',
    mnemonic: 'zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo wrong',
  },
  {
    entropy: '9e885d952ad362caeb4efe34a8e91bd2',
    mnemonic: 'ozone drill grab fiber curtain grace pudding thank cruise elder eight picnic',
  },
  {
    entropy: 'c0ba5a8e914111210f2bd131f3d5e08d',
    mnemonic: 'scheme spot photo card baby mountain device kick cradle pact join borrow',
  },
  {
    entropy: '23db8160a31d3e0dca3688ed941adbf3',
    mnemonic: 'cat swing flag economy stadium alone churn speed unique patch report train',
  },
  {
    entropy: 'f30f8c1da665478f49b001d94c5fc452',
    mnemonic: 'vessel ladder alter error federal sibling chat ability sun glass valve picture',
  },
]

// ---------------------------------------------------------------------------
// 1. The vendored wordlist — shape + full-content pins (insight 021).
// ---------------------------------------------------------------------------

describe('BIP39_ENGLISH wordlist', () => {
  it('has exactly 2048 words with the canonical anchors', () => {
    expect(BIP39_ENGLISH.length).toBe(2048)
    expect(BIP39_ENGLISH[0]).toBe('abandon')
    expect(BIP39_ENGLISH[2047]).toBe('zoo')
  })

  it('matches the cross-verified upstream SHA-256 in FULL (a single drifted word fails here)', async () => {
    const joined = BIP39_ENGLISH.join('\n') + '\n'
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(joined))
    expect(bytesToHex(new Uint8Array(digest))).toBe('2f5eed53a4727b4bf8880d8f3f199efc90e58503646d9ff8eff3a2ed3b24dbda')
  })

  it('contains no duplicates and only lowercase ascii words', () => {
    expect(new Set(BIP39_ENGLISH).size).toBe(2048)
    for (const w of BIP39_ENGLISH) expect(w).toMatch(/^[a-z]+$/)
  })
})

// ---------------------------------------------------------------------------
// 2. The official vectors — both directions, checksum included.
// ---------------------------------------------------------------------------

describe('official Trezor vectors (external fixtures, DND/012)', () => {
  for (const { entropy, mnemonic } of OFFICIAL_VECTORS) {
    it(`encodes ${entropy.slice(0, 8)}… to the official mnemonic`, async () => {
      const words = await entropyToPhrase(hexToBytes(entropy))
      expect(words.join(' ')).toBe(mnemonic)
    })

    it(`decodes "${mnemonic.split(' ').slice(0, 3).join(' ')}…" back to the official entropy`, async () => {
      const result = await phraseToEntropy(mnemonic)
      expect(result.ok).toBe(true)
      if (result.ok) expect(bytesToHex(result.entropy)).toBe(entropy)
    })
  }
})

// ---------------------------------------------------------------------------
// 3. Generation — CSPRNG only, 128 bits, round-trips.
// ---------------------------------------------------------------------------

describe('generateRecoveryPhrase', () => {
  it('produces 12 words, every one from the wordlist', async () => {
    const words = await generateRecoveryPhrase()
    expect(words).toHaveLength(WORDS_IN_PHRASE)
    const set = new Set(BIP39_ENGLISH)
    for (const w of words) expect(set.has(w)).toBe(true)
  })

  it('draws its entropy from crypto.getRandomValues with exactly 16 bytes', async () => {
    const spy = vi.spyOn(crypto, 'getRandomValues')
    try {
      await generateRecoveryPhrase()
      expect(spy).toHaveBeenCalled()
      const arg = spy.mock.calls[0]![0] as Uint8Array
      expect(arg.byteLength).toBe(ENTROPY_BYTES)
    } finally {
      spy.mockRestore()
    }
  })

  it('round-trips through phraseToEntropy (the checksum it mints is valid)', async () => {
    const words = await generateRecoveryPhrase()
    const decoded = await phraseToEntropy(words.join(' '))
    expect(decoded.ok).toBe(true)
    if (decoded.ok) {
      const reEncoded = await entropyToPhrase(decoded.entropy)
      expect(reEncoded).toEqual(words)
    }
  })

  it('two generations differ (sanity, 2^-128 collision)', async () => {
    const a = await generateRecoveryPhrase()
    const b = await generateRecoveryPhrase()
    expect(a.join(' ')).not.toBe(b.join(' '))
  })
})

// ---------------------------------------------------------------------------
// 4. Decode failure modes — the survivor's typo fail-fast (calm, specific).
// ---------------------------------------------------------------------------

describe('phraseToEntropy failure modes', () => {
  const valid = OFFICIAL_VECTORS[4]!.mnemonic // ozone drill grab …

  it('rejects a wrong word count, naming what it got', async () => {
    const eleven = valid.split(' ').slice(0, 11).join(' ')
    const result = await phraseToEntropy(eleven)
    expect(result).toEqual({ ok: false, reason: 'wrong-word-count', got: 11 })
  })

  it('rejects an unknown word, NAMING the word (the typo pointer)', async () => {
    const typo = valid.replace('drill', 'drilll')
    const result = await phraseToEntropy(typo)
    expect(result).toEqual({ ok: false, reason: 'unknown-word', word: 'drilll' })
  })

  it('rejects a valid-words-wrong-checksum phrase (a swapped word fails fast, not at GCM)', async () => {
    // Replace the final (checksum-bearing) word with a different valid word.
    const swapped = valid.split(' ')
    swapped[11] = swapped[11] === 'zoo' ? 'abandon' : 'zoo'
    const result = await phraseToEntropy(swapped.join(' '))
    expect(result).toEqual({ ok: false, reason: 'bad-checksum' })
  })

  it('rejects transposed words via the checksum', async () => {
    const words = valid.split(' ')
    const transposed = [words[1]!, words[0]!, ...words.slice(2)].join(' ')
    const result = await phraseToEntropy(transposed)
    expect(result).toEqual({ ok: false, reason: 'bad-checksum' })
  })

  it('normalizes case + surrounding/internal whitespace before decoding (survivor typing reality)', async () => {
    const messy = '  Ozone   DRILL grab fiber curtain grace pudding thank cruise elder eight picnic '
    const result = await phraseToEntropy(messy)
    expect(result.ok).toBe(true)
    if (result.ok) expect(bytesToHex(result.entropy)).toBe('9e885d952ad362caeb4efe34a8e91bd2')
  })
})

// ---------------------------------------------------------------------------
// 5. Fail-loud input domain (burned/062 — no silent partial support).
// ---------------------------------------------------------------------------

describe('entropyToPhrase input domain', () => {
  it('rejects non-16-byte entropy loudly (only the 12-word form exists in this product)', async () => {
    await expect(entropyToPhrase(new Uint8Array(20))).rejects.toThrow(/16/)
    await expect(entropyToPhrase(new Uint8Array(0))).rejects.toThrow(/16/)
  })
})
