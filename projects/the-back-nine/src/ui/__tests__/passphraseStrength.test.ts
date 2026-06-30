import { describe, it, expect } from 'vitest'
import {
  evaluatePassphrase,
  passphrasesMatch,
  EMPTY_VERDICT,
  PASSPHRASE_MIN_LENGTH,
  PASSPHRASE_MIN_SCORE,
} from '../passphraseStrength'
import { PASSPHRASE_MIN_LENGTH as KDF_MIN_LENGTH, PASSPHRASE_MIN_SCORE as KDF_MIN_SCORE } from '@crypto/kdf'

describe('passphraseStrength — source-bound floor', () => {
  it('re-exports the crypto-layer floor unchanged (no drift, no re-typed literal)', () => {
    // The values are asserted against the real numbers in kdf.test.ts; here we only
    // prove the UI seam forwards the SAME constants, so a floor change can't desync.
    expect(PASSPHRASE_MIN_LENGTH).toBe(KDF_MIN_LENGTH)
    expect(PASSPHRASE_MIN_SCORE).toBe(KDF_MIN_SCORE)
  })

  it('an empty passphrase is not-yet-entered, not "weak" — no floor message', async () => {
    expect(await evaluatePassphrase('')).toEqual(EMPTY_VERDICT)
    expect(EMPTY_VERDICT.ok).toBe(false)
    expect(EMPTY_VERDICT.lengthUnmet).toBe(false)
    expect(EMPTY_VERDICT.scoreUnmet).toBe(false)
  })

  it('a short passphrase flags lengthUnmet (and never mints the brand)', async () => {
    const v = await evaluatePassphrase('Tg7!q') // 5 code points — below the length floor
    expect(v.ok).toBe(false)
    expect(v.lengthUnmet).toBe(true)
    expect(v.passphrase).toBeNull()
  })

  it('a long-but-trivial passphrase flags scoreUnmet only (length clears)', async () => {
    const v = await evaluatePassphrase('aaaaaaaaaaaa') // 12 chars: length OK, guessability floor fails
    expect(v.ok).toBe(false)
    expect(v.lengthUnmet).toBe(false)
    expect(v.scoreUnmet).toBe(true)
    expect(v.passphrase).toBeNull()
  })

  it('a strong, long passphrase clears the floor and carries the brand through', async () => {
    const v = await evaluatePassphrase('x7K!q2vB9mZ4wL1p') // 16 random code points, no pattern/dictionary
    expect(v.ok).toBe(true)
    expect(v.lengthUnmet).toBe(false)
    expect(v.scoreUnmet).toBe(false)
    expect(v.passphrase).not.toBeNull()
    expect(v.passphrase?.value).toBe('x7K!q2vB9mZ4wL1p')
  })

  it('length counts code points — surrogate pairs cannot inflate past the floor', async () => {
    // 8 astral glyphs = 8 code points (16 UTF-16 units). A naive .length would read 16
    // and wrongly clear the floor; the seam must see it as below-length.
    const v = await evaluatePassphrase('😀😀😀😀😀😀😀😀')
    expect(v.lengthUnmet).toBe(true)
  })
})

describe('passphrasesMatch', () => {
  it('matches identical non-empty passphrases', () => {
    expect(passphrasesMatch('x7K!q2vB9mZ4wL1p', 'x7K!q2vB9mZ4wL1p')).toBe(true)
  })
  it('rejects a mismatch', () => {
    expect(passphrasesMatch('x7K!q2vB9mZ4wL1p', 'x7K!q2vB9mZ4wL1q')).toBe(false)
  })
  it('two empty strings do not "match" (nothing entered is not a confirmed pair)', () => {
    expect(passphrasesMatch('', '')).toBe(false)
  })
})
