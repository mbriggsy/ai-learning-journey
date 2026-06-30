/**
 * U8 recovery-phrase CAPTURE seam (pure decision; insight 048) — the council's
 * hidden-then-retype subset (2026-06-30).
 *
 * The honest design: the phrase is DISMISSED before this challenge, so re-typing a small
 * positional subset forces the user to transcribe from their OWN copy — proving they wrote
 * it down, not merely read it (a visible-phrase re-type is a tautology; a bare checkbox was
 * Honesty-Hawk VETOED). This is an ENGAGEMENT NUDGE, never proof of safe storage — the
 * screen must never say "verified / you're safe". R17 is MITIGATED, never CLOSED.
 *
 * Position selection is a comprehension aid, NOT a security control: unpredictability buys
 * nothing here (the defense is the dismiss-then-transcribe flow, not anti-replay), so the
 * positions are a simple DETERMINISTIC spread — one word from each third of the phrase, so
 * the three asks never cluster, and the same phrase always yields the same asks (stable
 * across a "show my words again" round-trip and reproducible in tests). No clock/entropy.
 *
 * Holds NO user-facing strings: returns positions (numbers) and a per-position match result;
 * the screen renders the ordinal labels + the calm mismatch copy from `copy.ts`.
 */

/** How many words the user re-types. Three is enough to force transcription without making
 *  the nudge a chore (council 2026-06-30: "a 2–3 word positional subset"). */
export const CHALLENGE_COUNT = 3

/** Normalize exactly as the decoder does (`recoveryPhrase.ts` `trim().toLowerCase()`), so the
 *  capture is forgiving of casing/stray spaces the same way the real restore path is — a user
 *  who wrote "Apple" or " apple " is not wrongly told they failed. */
function normalizeWord(word: string): string {
  return word.trim().toLowerCase()
}

/** A small deterministic, well-distributed integer derived from the phrase content. Pure;
 *  used only to vary WHICH word in each third is asked, so it need not be cryptographic. */
function phraseDigest(phrase: readonly string[]): number {
  let h = 0
  for (const [i, word] of phrase.entries()) {
    for (let c = 0; c < word.length; c++) {
      // A plain rolling sum, weighted by 1-based index so word order matters.
      h = (h + word.charCodeAt(c) * (i + 1)) % 0x7fffffff
    }
  }
  return h
}

/**
 * Choose `CHALLENGE_COUNT` distinct 0-indexed positions to re-type — one from each third of
 * a 12-word phrase, deterministically picked from the phrase content (stable per phrase).
 * Returned ascending. Throws if the phrase isn't the canonical 12 words: a malformed phrase
 * must never silently produce a degenerate (e.g. clustered or out-of-range) challenge.
 */
export function selectChallengePositions(phrase: readonly string[]): readonly number[] {
  if (phrase.length !== 12) {
    throw new Error(`phrase capture expects a 12-word phrase, got ${phrase.length}`)
  }
  const h = phraseDigest(phrase)
  const third = phrase.length / CHALLENGE_COUNT // 4
  const positions: number[] = []
  for (let t = 0; t < CHALLENGE_COUNT; t++) {
    const offset = Math.floor(h / Math.pow(4, t)) % third
    positions.push(t * third + offset)
  }
  return positions
}

export interface ChallengeMatch {
  /** Every asked position matched. The screen advances only on this. */
  readonly allMatch: boolean
  /** Per-asked-position correctness, in the same order as `positions` — so the screen can
   *  mark exactly which word to re-check without revealing the others. */
  readonly perPosition: readonly boolean[]
}

/**
 * Check the user's re-typed words against the true words at the asked positions. Forgiving
 * of casing and surrounding whitespace (same normalization as the decoder). An answer that
 * is missing/blank is simply a non-match for that position (never a throw) — the screen
 * keeps the user in the challenge with a calm "take another look", never an error wall.
 */
export function matchChallenge(
  phrase: readonly string[],
  positions: readonly number[],
  answers: readonly string[],
): ChallengeMatch {
  const perPosition = positions.map((pos, i) => {
    const expected = phrase[pos]
    const given = answers[i]
    if (expected === undefined || given === undefined) return false
    return normalizeWord(given) === normalizeWord(expected)
  })
  return { allMatch: perPosition.length > 0 && perPosition.every(Boolean), perPosition }
}
