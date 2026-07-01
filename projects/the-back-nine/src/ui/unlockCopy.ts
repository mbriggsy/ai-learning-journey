/**
 * U8 decrypt-on-return error→copy seam (pure decision; insight 048).
 *
 * The honesty-critical mapping the council and the backend's error taxonomy demand: a
 * GCM-AMBIGUOUS credential failure (`wrong-passphrase` / `wrong-recovery-passphrase`) is
 * cryptographically indistinguishable from a bit-rotted wrap opened with the RIGHT
 * credential — so its copy must hedge BOTH ways, typo-first and damage-second, and must
 * NEVER assert "corrupt" (telling a survivor their good backup is broken is the
 * calm-but-wrong sin). Since the 2026-06-30 council rework BOTH credentials are
 * user-chosen passphrases — there is no longer a structurally-distinguishable phrase
 * error (the old BIP-39 bad-checksum / unknown-word / wrong-count class is gone), so a
 * wrong recovery credential hedges exactly like a wrong daily passphrase. `newer-version`
 * is its own calm class (update the app), never "damaged". This distinction is the whole
 * reason the seam exists — it is the planted-fail-tested decision; the screen is dumb
 * wiring that renders `copy[key]`.
 *
 * Holds NO strings: returns a copy KEY, so `copyGuard` stays the single enumerated
 * honesty surface.
 */
import type { UnlockResult, RecoveryUnlockResult } from '@store/session'

/** The `{ ok: false }` arms of both decrypt-on-return paths (passphrase unlock + recovery
 *  unlock). Typed off the real results so a NEW backend reason fails to compile here until
 *  it is given calm copy — a reason can never reach the user as a raw enum. */
type FailArm<T> = Extract<T, { readonly ok: false }>
export type UnlockFailure = FailArm<UnlockResult> | FailArm<RecoveryUnlockResult>

export type UnlockCopyKey =
  | 'unlockWrongCredential' // GCM-ambiguous: typo-first, damage-second, never "corrupt"
  | 'unlockDataDamaged' // distinguishable damage (credential already authenticated)
  | 'unlockNewerVersion' // saved by a newer app version — NEVER "damaged"
  | 'unlockNoVault' // the vault is gone (evicted between load and unlock)
  | 'unlockOpenElsewhere' // open in another tab — close it there first
  | 'unlockReadOnly' // a read-only OPEN succeeded (2nd tab holds the writer) — reload to edit
  | 'unlockGeneric' // not-locked / unexpected — a calm catch-all, no alarm

export type UnlockMessage =
  | { readonly kind: 'silent' } // user cancelled — show nothing
  | { readonly kind: 'plain'; readonly key: UnlockCopyKey }

/**
 * Map a decrypt-on-return failure to the calm message the screen should show. The
 * exhaustive switch is the contract: every reason is named, and the GCM-ambiguous vs
 * newer distinction is encoded HERE, once.
 */
export function describeUnlockFailure(failure: UnlockFailure): UnlockMessage {
  // Switch on the captured discriminant (not `failure.reason` inline) so the default narrows a
  // string-literal union to `never` — narrowing the whole `failure` object to `never` instead makes
  // `.reason` an error on `never` rather than the clean exhaustiveness binding below.
  const reason = failure.reason
  switch (reason) {
    case 'cancelled':
      return { kind: 'silent' }

    // GCM-ambiguous — both credentials are now user-chosen passphrases, so a wrong
    // recovery credential hedges both ways exactly like a wrong daily passphrase.
    case 'wrong-passphrase':
    case 'wrong-recovery-passphrase':
      return { kind: 'plain', key: 'unlockWrongCredential' }

    case 'data-damaged':
      return { kind: 'plain', key: 'unlockDataDamaged' }
    case 'newer-version':
      return { kind: 'plain', key: 'unlockNewerVersion' }
    case 'no-vault':
      return { kind: 'plain', key: 'unlockNoVault' }
    case 'open-in-another-tab':
      return { kind: 'plain', key: 'unlockOpenElsewhere' }
    case 'not-locked':
      // A benign non-failure (the session simply wasn't locked) — a calm catch-all, no alarm.
      return { kind: 'plain', key: 'unlockGeneric' }
    default: {
      // Compile-time exhaustiveness + runtime fail-loud (the sequencing.ts pattern): a NEW backend
      // fail reason makes this `never` assignment fail to compile until it is given calm copy above —
      // the guarantee this seam's header + test claim. The prior trailing `return unlockGeneric`
      // silently swallowed an unmapped reason into the no-alarm generic (insight 048: calm-but-wrong
      // on the honesty-critical decrypt-on-return surface). Unreachable while the types are honest
      // (same-realm typed input, never worker-crossed), so the throw never faces a user.
      const _exhaustive: never = reason
      throw new Error(`describeUnlockFailure: unmapped reason ${String(_exhaustive)}`)
    }
  }
}

/**
 * The read-only-OPEN notice — the SUCCESS arm's counterpart to describeUnlockFailure.
 * A read-only open is a SUCCESS with a caveat, never a failure: a second tab holds the
 * writer, so this tab decrypted the plan but cannot save. It is rendered as a STANDING
 * `role='status'` banner (never `role='alert'` — nothing went wrong), and it steers to
 * RELOAD, not "close the other tab": `secondTab` is captured ONCE at unlock and never
 * re-probed (session.ts), so this tab stays read-only until a reload re-runs the writer
 * probe — telling the user to close the other tab would promise an edit this tab can't
 * grant without a reload (calm-but-wrong). Silent on a normal writable open.
 *
 * Typed off the SUCCESS arm so a change to its shape (e.g. readOnly → an enum) breaks
 * HERE at compile time, exactly as the failure seam is typed off the {ok:false} arms.
 */
export function describeUnlockReadOnly(success: Extract<UnlockResult, { readonly ok: true }>): UnlockMessage {
  return success.readOnly ? { kind: 'plain', key: 'unlockReadOnly' } : { kind: 'silent' }
}
