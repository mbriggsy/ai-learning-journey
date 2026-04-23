import { describe, it, expect } from 'vitest'
import { messageByteLength } from './validation'

// E-02 cap constant — kept in sync with room.ts MAX_MESSAGE_BYTES but
// asserted here to lock the expected budget. If the room.ts constant
// moves, update this alongside so the attack-vector test stays honest.
const EXPECTED_CAP_BYTES = 4096

// Regression: overnight E2E audit 2026-04-23 E-02. `String.length` counts
// UTF-16 code units; a 4-byte UTF-8 emoji is 2 code units, so a 4096-char
// message using 4-byte glyphs weighs ~16KB on the wire — a 4x bypass of
// the DoS guard. Cap must measure bytes, not characters.

describe('messageByteLength (E-02 regression)', () => {
  it('ASCII: 1 byte per char', () => {
    expect(messageByteLength('hello')).toBe(5)
    expect(messageByteLength('a'.repeat(1000))).toBe(1000)
  })

  it('2-byte UTF-8 (Latin-1 supplement): counts bytes, not chars', () => {
    // "é" is 1 code unit but 2 UTF-8 bytes.
    expect(messageByteLength('é')).toBe(2)
    expect('é'.length).toBe(1)
    expect(messageByteLength('é'.repeat(3000))).toBe(6000)
  })

  it('4-byte UTF-8 (surrogate-pair emoji): counts bytes, not chars', () => {
    // 🔥 is 2 code units (surrogate pair) but 4 UTF-8 bytes.
    expect(messageByteLength('🔥')).toBe(4)
    expect('🔥'.length).toBe(2)
    expect(messageByteLength('🔥'.repeat(1000))).toBe(4000)
  })

  it('mixed ASCII + emoji: sum of byte lengths', () => {
    const msg = 'hi 🔥🔥'
    // 'h' + 'i' + ' ' = 3 bytes, 2× 🔥 = 8 bytes, total 11
    expect(messageByteLength(msg)).toBe(11)
  })

  it('the audit attack vector fails the cap', () => {
    // 1025 × 🔥 = 4100 bytes > 4096. Previously 1025 × 🔥 = 2050 code
    // units, which would pass the old `.length` cap of 4096.
    const attack = '🔥'.repeat(1025)
    expect(attack.length).toBe(2050) // <= 4096 code units (would have passed)
    expect(messageByteLength(attack)).toBe(4100) // > 4096 bytes (now blocked)
    expect(messageByteLength(attack)).toBeGreaterThan(EXPECTED_CAP_BYTES)
  })

  it('exactly-at-cap ASCII passes', () => {
    const msg = 'a'.repeat(EXPECTED_CAP_BYTES)
    expect(messageByteLength(msg)).toBe(EXPECTED_CAP_BYTES)
  })

  it('just-over-cap ASCII exceeds', () => {
    const msg = 'a'.repeat(EXPECTED_CAP_BYTES + 1)
    expect(messageByteLength(msg)).toBeGreaterThan(EXPECTED_CAP_BYTES)
  })
})
