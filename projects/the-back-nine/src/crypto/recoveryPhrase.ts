/**
 * The recovery phrase (P1·U4): BIP-39 English, 12 words = 128 bits, generated ONCE and
 * immutable for the life of the data (rotation is out of MVP scope).
 *
 * Entropy source is `crypto.getRandomValues` ONLY (the U0 weak-RNG lint extends here —
 * Math.random is banned in src/crypto/**). The phrase's DECODED entropy bytes are the
 * HKDF IKM for the recovery-wrapping key (kdf.ts) — decoding validates the BIP-39
 * SHA-256 checksum first, so a mistyped or transposed word fails FAST with a specific,
 * calm reason instead of surfacing later as an opaque GCM failure. That distinction is
 * survivor-path UX: "word 'drilll' isn't in the list" is recoverable at the keyboard;
 * a bare "couldn't decrypt" is a support call with no support line.
 *
 * Wire format notes:
 *  - 128 entropy bits + 4 checksum bits (the first 4 bits of SHA-256(entropy)) = 132
 *    bits = 12 × 11-bit wordlist indices, big-endian throughout (the BIP-39 layout).
 *  - Only the 12-word form exists in this product — other entropy sizes fail loud
 *    (burned/062: no silent partial support).
 */
import { BIP39_ENGLISH } from './reference/bip39EnglishWordlist'

export const ENTROPY_BYTES = 16
export const WORDS_IN_PHRASE = 12
const CHECKSUM_BITS = 4n
const INDEX_BITS = 11n
const INDEX_MASK = 0x7ffn

/** O(1) word → index; also the membership check for the unknown-word fail-fast. */
const WORD_INDEX: ReadonlyMap<string, number> = new Map(BIP39_ENGLISH.map((w, i) => [w, i]))

async function checksumNibble(entropy: Uint8Array): Promise<bigint> {
  const digest = await crypto.subtle.digest('SHA-256', entropy as BufferSource)
  return BigInt(new Uint8Array(digest)[0]! >> 4)
}

/**
 * Entropy (exactly 16 bytes) → the 12 words. The checksum word is derived per BIP-39;
 * the official Trezor vectors pin this end-to-end.
 */
export async function entropyToPhrase(entropy: Uint8Array): Promise<readonly string[]> {
  if (entropy.length !== ENTROPY_BYTES) {
    throw new Error(`recovery-phrase entropy must be exactly ${ENTROPY_BYTES} bytes (got ${entropy.length})`)
  }
  let acc = 0n
  for (const byte of entropy) acc = (acc << 8n) | BigInt(byte)
  acc = (acc << CHECKSUM_BITS) | (await checksumNibble(entropy))
  const words: string[] = []
  for (let i = WORDS_IN_PHRASE - 1; i >= 0; i--) {
    const index = Number((acc >> (INDEX_BITS * BigInt(i))) & INDEX_MASK)
    words.push(BIP39_ENGLISH[index]!)
  }
  return words
}

export type PhraseDecode =
  | { readonly ok: true; readonly entropy: Uint8Array<ArrayBuffer> }
  | { readonly ok: false; readonly reason: 'wrong-word-count'; readonly got: number }
  | { readonly ok: false; readonly reason: 'unknown-word'; readonly word: string }
  | { readonly ok: false; readonly reason: 'bad-checksum' }

/**
 * Phrase → entropy, checksum-validated. Normalizes the way a person actually types
 * (case, stray/internal whitespace) before judging the words, so only REAL errors
 * surface. The three failure shapes are deliberately distinct: count and unknown-word
 * point at the exact problem; bad-checksum (right words, wrong order/choice) is the
 * honest "one of these words is wrong, the phrase knows which family it came from".
 */
export async function phraseToEntropy(phrase: string): Promise<PhraseDecode> {
  const words = phrase.trim().toLowerCase().split(/\s+/).filter((w) => w.length > 0)
  if (words.length !== WORDS_IN_PHRASE) return { ok: false, reason: 'wrong-word-count', got: words.length }
  let acc = 0n
  for (const word of words) {
    const index = WORD_INDEX.get(word)
    if (index === undefined) return { ok: false, reason: 'unknown-word', word }
    acc = (acc << INDEX_BITS) | BigInt(index)
  }
  const claimedChecksum = acc & ((1n << CHECKSUM_BITS) - 1n)
  let entropyBig = acc >> CHECKSUM_BITS
  const entropy = new Uint8Array(ENTROPY_BYTES)
  for (let i = ENTROPY_BYTES - 1; i >= 0; i--) {
    entropy[i] = Number(entropyBig & 0xffn)
    entropyBig >>= 8n
  }
  if ((await checksumNibble(entropy)) !== claimedChecksum) return { ok: false, reason: 'bad-checksum' }
  return { ok: true, entropy }
}

/**
 * Mint a fresh 12-word phrase from 128 bits of CSPRNG entropy. Generated once at first
 * save; the display/print threat model (screenshot, heap persistence) is owned by
 * P2·U8 — this layer never stores the phrase, it only returns it to the caller.
 */
export async function generateRecoveryPhrase(): Promise<readonly string[]> {
  const entropy = crypto.getRandomValues(new Uint8Array(ENTROPY_BYTES))
  return entropyToPhrase(entropy)
}
