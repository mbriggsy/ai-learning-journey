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
import type { UnlockResult, RecoveryUnlockResult, SaveResult } from '@store/session'
import type { RestoreResult } from '@store/backup'

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
 *
 * Returns the notice KEY directly (or null) — this success arm has no `cancelled`/silent-vs-plain
 * distinction to carry (unlike describeUnlockFailure's UnlockMessage), and BOTH call sites (App's
 * standing ViewOnlyBanner, via UnlockScreen + RestoreFlow) want exactly `UnlockCopyKey | null`.
 */
export function describeUnlockReadOnly(success: Extract<UnlockResult, { readonly ok: true }>): UnlockCopyKey | null {
  return success.readOnly ? 'unlockReadOnly' : null
}

/** The `{ ok: false }` arms of the edit-and-re-save `session.save()` update path. */
export type SaveFailure = Extract<SaveResult, { readonly ok: false }>

export type ResaveCopyKey = 'saveErrorQuota' | 'saveErrorReadOnly' | 'saveErrorFailed'

/**
 * Map a re-save refusal to its calm copy. The honesty decision here: `not-writable` on the
 * result screen means this tab cannot write — in practice a READ-ONLY open (a 2nd tab held
 * the writer at unlock; `secondTab` is captured ONCE, session.ts:295) — and the ONLY remedy
 * is a RELOAD. It must never map to `saveErrorBusy`, whose "Close it there, then try again"
 * is a retry that cannot succeed in a read-only session (the same lying-dead-end shape the
 * edit-and-re-save fix exists to retire). Exhaustive with the house `never`-default.
 */
export function describeSaveFailure(failure: SaveFailure): ResaveCopyKey {
  const reason = failure.reason
  switch (reason) {
    case 'quota':
      return 'saveErrorQuota'
    case 'not-writable':
      return 'saveErrorReadOnly'
    case 'write-failed':
      return 'saveErrorFailed'
    default: {
      const _exhaustive: never = reason
      throw new Error(`describeSaveFailure: unmapped reason ${String(_exhaustive)}`)
    }
  }
}

/** The `{ ok: false }` arms of `session.restore` / `restoreVault` (Fork A). No silent arm —
 *  restore has no `cancelled` (the session is never unlocked mid-flow), so every failure is a
 *  visible, calm message. */
export type RestoreFailure = Extract<RestoreResult, { readonly ok: false }>

export type RestoreCopyKey =
  | 'restoreFileDamaged' // the file failed the format gate, base64, or GCM under an authenticated word
  | 'restoreWrongCredential' // GCM-ambiguous: wrong word OR rotted wrap in THIS copy — steer to another copy
  | 'restoreVaultExists' // an intact vault appeared between the probe and the write (TOCTOU refusal)
  | 'unlockNewerVersion' // file envelope (newer-format) or model (newer-version) from a newer app — NEVER "damaged"
  | 'recoverEqualsError' // the backend negative-pairing mirror bounced (the UI pre-check is the fast path)
  | 'saveErrorQuota'
  | 'saveErrorFailed'

/** Where the failure lands in the flow: back on the field that can fix it, or the operational
 *  error panel. This routing IS part of the honesty decision (a wrong word must re-open the WORD
 *  field, not strand the user on a generic panel), so it lives in the seam, planted-fail tested,
 *  and the screen stays dumb wiring. A DISCRIMINATED union — the anchor narrows the key set, so
 *  the screen's per-step error state can't be handed a key that step has no field for. */
export type RestoreMessage =
  | { readonly anchor: 'file'; readonly key: 'restoreFileDamaged' | 'unlockNewerVersion' }
  | { readonly anchor: 'word'; readonly key: 'restoreWrongCredential' }
  | { readonly anchor: 'setNew'; readonly key: 'recoverEqualsError' }
  | { readonly anchor: 'operation'; readonly key: 'restoreVaultExists' | 'saveErrorQuota' | 'saveErrorFailed' }

/**
 * Map a restore failure to its calm message + the step that can fix it. Exhaustive over
 * `RestoreResult`'s fail arms — the never-default is the compile-time guard, exactly as
 * {@link describeUnlockFailure}.
 */
export function describeRestoreFailure(failure: RestoreFailure): RestoreMessage {
  const reason = failure.reason
  switch (reason) {
    case 'file-damaged':
      return { key: 'restoreFileDamaged', anchor: 'file' }

    // Both "newer" arms — the envelope (newer-format) and the model (newer-version) — are intact
    // data written by a newer app: one honest message (update the app), never "damaged".
    case 'newer-format':
    case 'newer-version':
      return { key: 'unlockNewerVersion', anchor: 'file' }

    case 'wrong-recovery-passphrase':
      return { key: 'restoreWrongCredential', anchor: 'word' }
    case 'recovery-equals-passphrase':
      return { key: 'recoverEqualsError', anchor: 'setNew' }
    case 'vault-exists':
      return { key: 'restoreVaultExists', anchor: 'operation' }
    case 'quota':
      return { key: 'saveErrorQuota', anchor: 'operation' }
    case 'write-failed':
      return { key: 'saveErrorFailed', anchor: 'operation' }
    default: {
      const _exhaustive: never = reason
      throw new Error(`describeRestoreFailure: unmapped reason ${String(_exhaustive)}`)
    }
  }
}
