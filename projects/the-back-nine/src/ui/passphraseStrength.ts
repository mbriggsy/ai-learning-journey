/**
 * U8 passphrase-strength seam (pure decision; insight 048).
 *
 * The component is dumb wiring — the floor DECISION lives here so it is unit-driven
 * (planted-fail tested), never inlined in a render path jsdom can't exercise. It is a
 * thin, honest wrapper over the crypto-layer floor (`checkPassphraseFloor`, the SOLE
 * minter of the `FloorCheckedPassphrase` brand) that re-shapes the result for the calm,
 * meter-less UI: it names WHICH floor (length / guessability) is unmet so the screen can
 * say it as TEXT (no scary red meter — the back-nine-design intake law + plan U8 §A11y).
 *
 * It contains NO user-facing strings — the two floor messages live in `copy.ts` (the one
 * copyGuard-enumerated surface), keyed off `lengthUnmet` / `scoreUnmet`. The floor numbers
 * are SOURCE-BOUND from `@crypto/kdf` (burned/063 single-source) — never re-typed here, so
 * a floor change is impossible to drift.
 */
import {
  checkPassphraseFloor,
  PASSPHRASE_MIN_LENGTH,
  PASSPHRASE_MIN_SCORE,
  type FloorCheckedPassphrase,
} from '@crypto/kdf'

/** Re-exported so a single import gives the screen both the check and the floor
 *  numbers it may surface — all source-bound, never literals. */
export { PASSPHRASE_MIN_LENGTH, PASSPHRASE_MIN_SCORE }

/** The meter-less floor verdict the passphrase screen renders. Both clauses are
 *  independent (a strong-but-short and a long-but-common passphrase each fail exactly
 *  one), so both flags can be true at once — the screen shows the full picture in one
 *  pass, mirroring `checkPassphraseFloor`'s both-reasons-together contract. */
export interface PassphraseVerdict {
  /** The passphrase clears the floor (both clauses). */
  readonly ok: boolean
  /** Below the code-point length floor (`PASSPHRASE_MIN_LENGTH`). */
  readonly lengthUnmet: boolean
  /** Below the zxcvbn-ts guessability floor (`PASSPHRASE_MIN_SCORE`). */
  readonly scoreUnmet: boolean
  /** The branded passphrase — present IFF `ok`. Only this can reach a wrap-mint
   *  (`firstSave` / `setNewPassphrase`), so the screen passes it straight through. */
  readonly passphrase: FloorCheckedPassphrase | null
}

/** An empty passphrase is not "weak", it is simply not-yet-entered — the screen shows
 *  no floor message for it (calm: silent while the field is blank, checked on attempt).
 *  This is the only verdict a synchronous caller can produce; a real evaluation is async
 *  (zxcvbn loads its dictionaries via dynamic import). */
export const EMPTY_VERDICT: PassphraseVerdict = {
  ok: false,
  lengthUnmet: false,
  scoreUnmet: false,
  passphrase: null,
}

/**
 * Evaluate a candidate passphrase against the floor. Async because the guessability
 * estimator's dictionaries are dynamically imported (kept off the entry chunk). Per the
 * intake validation law this runs on blur / on attempt-to-advance, never per keystroke.
 */
export async function evaluatePassphrase(passphrase: string): Promise<PassphraseVerdict> {
  if (passphrase.length === 0) return EMPTY_VERDICT
  const result = await checkPassphraseFloor(passphrase)
  if (result.ok) {
    return { ok: true, lengthUnmet: false, scoreUnmet: false, passphrase: result.passphrase }
  }
  return {
    ok: false,
    lengthUnmet: result.reasons.includes('below-min-length'),
    scoreUnmet: result.reasons.includes('below-min-score'),
    passphrase: null,
  }
}

/** Pure, synchronous confirm-field check. A passphrase and its confirmation must match
 *  byte-for-byte before `firstSave` — surfaced as its own calm message, distinct from the
 *  floor (a matching-but-weak pair fails the floor; a strong-but-mistyped pair fails this). */
export function passphrasesMatch(passphrase: string, confirmation: string): boolean {
  return passphrase.length > 0 && passphrase === confirmation
}
