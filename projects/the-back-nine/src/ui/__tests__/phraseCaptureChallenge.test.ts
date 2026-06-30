import { describe, it, expect } from 'vitest'
import { selectChallengePositions, matchChallenge, CHALLENGE_COUNT } from '../phraseCaptureChallenge'

// A 12-word fixture (real BIP-39 words; checksum-validity is irrelevant to the capture seam).
const PHRASE = [
  'abandon', 'ability', 'able', 'about',
  'above', 'absent', 'absorb', 'abstract',
  'absurd', 'abuse', 'access', 'accident',
] as const

describe('selectChallengePositions', () => {
  it('asks exactly CHALLENGE_COUNT distinct, ascending, in-range positions', () => {
    const pos = selectChallengePositions(PHRASE)
    expect(pos).toHaveLength(CHALLENGE_COUNT)
    expect(new Set(pos).size).toBe(CHALLENGE_COUNT) // distinct
    expect([...pos]).toEqual([...pos].sort((a, b) => a - b)) // ascending
    for (const p of pos) expect(p).toBeGreaterThanOrEqual(0)
    for (const p of pos) expect(p).toBeLessThan(12)
  })

  it('spreads one ask across each third (never clustered)', () => {
    const [a, b, c] = selectChallengePositions(PHRASE)
    expect(a).toBeGreaterThanOrEqual(0)
    expect(a).toBeLessThan(4)
    expect(b).toBeGreaterThanOrEqual(4)
    expect(b).toBeLessThan(8)
    expect(c).toBeGreaterThanOrEqual(8)
    expect(c).toBeLessThan(12)
  })

  it('is deterministic — the same phrase yields the same asks (stable across a "show again" round-trip)', () => {
    expect(selectChallengePositions(PHRASE)).toEqual(selectChallengePositions(PHRASE))
  })

  it('varies by phrase content (not a fixed 3/7/11 muscle-memory)', () => {
    const other = [
      'zoo', 'zone', 'zero', 'youth',
      'wrong', 'wrist', 'write', 'wreck',
      'world', 'work', 'word', 'wood',
    ] as const
    // At least one position differs between two unrelated phrases.
    expect(selectChallengePositions(other)).not.toEqual(selectChallengePositions(PHRASE))
  })

  it('throws on a non-12-word phrase rather than producing a degenerate challenge', () => {
    expect(() => selectChallengePositions(['just', 'three', 'words'])).toThrow()
  })
})

describe('matchChallenge', () => {
  const positions = selectChallengePositions(PHRASE)
  const correct: string[] = positions.map((p) => PHRASE[p]!)

  it('all words correct → allMatch', () => {
    const r = matchChallenge(PHRASE, positions, correct)
    expect(r.allMatch).toBe(true)
    expect(r.perPosition).toEqual([true, true, true])
  })

  it('one word wrong → not allMatch, with the exact failing position flagged', () => {
    const answers = [...correct]
    answers[1] = 'definitely-wrong'
    const r = matchChallenge(PHRASE, positions, answers)
    expect(r.allMatch).toBe(false)
    expect(r.perPosition).toEqual([true, false, true])
  })

  it('forgives casing and surrounding whitespace (same normalization as the decoder)', () => {
    const answers = correct.map((w) => `  ${w.toUpperCase()} `)
    expect(matchChallenge(PHRASE, positions, answers).allMatch).toBe(true)
  })

  it('a blank / missing answer is a calm non-match, never a throw', () => {
    const r = matchChallenge(PHRASE, positions, ['', '', ''])
    expect(r.allMatch).toBe(false)
    expect(r.perPosition).toEqual([false, false, false])
    expect(() => matchChallenge(PHRASE, positions, [])).not.toThrow()
  })

  it('empty positions never reads as "allMatch" (no vacuous pass)', () => {
    expect(matchChallenge(PHRASE, [], []).allMatch).toBe(false)
  })
})
