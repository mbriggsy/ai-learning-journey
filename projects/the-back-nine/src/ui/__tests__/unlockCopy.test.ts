import { describe, it, expect } from 'vitest'
import {
  describeUnlockFailure,
  describeUnlockReadOnly,
  describeRestoreFailure,
  describeSaveFailure,
  type UnlockFailure,
  type RestoreFailure,
} from '../unlockCopy'
import { copy } from '../copy'

describe('describeSaveFailure — the edit-and-re-save refusal mapping', () => {
  it('quota and write-failed get their calm operational keys', () => {
    expect(describeSaveFailure({ ok: false, reason: 'quota' })).toBe('saveErrorQuota')
    expect(describeSaveFailure({ ok: false, reason: 'write-failed', detail: 'tx aborted' })).toBe('saveErrorFailed')
  })

  it('not-writable steers to RELOAD — NEVER the close-tab retry (a read-only tab cannot regain the writer without a reload)', () => {
    const key = describeSaveFailure({ ok: false, reason: 'not-writable' })
    expect(key).toBe('saveErrorReadOnly')
    // The trap arm pinned: saveErrorBusy's "Close it there, then try again" is a retry that can
    // never succeed in a read-only session (secondTab is captured once at unlock, session.ts:295).
    expect(key).not.toBe('saveErrorBusy')
    expect(copy.saveErrorReadOnly).toMatch(/reload/i)
    expect(copy.saveErrorReadOnly).not.toMatch(/close/i)
  })
})

describe('describeUnlockFailure — the honesty-critical error mapping', () => {
  it('cancellation shows nothing (not an error)', () => {
    expect(describeUnlockFailure({ ok: false, reason: 'cancelled' })).toEqual({ kind: 'silent' })
  })

  it('BOTH GCM-ambiguous credential failures map to the SAME both-ways hedge', () => {
    // wrong-passphrase and wrong-recovery-passphrase are cryptographically indistinguishable
    // from a damaged wrap opened with the right credential — so they share one hedged key,
    // never a key that asserts the credential is definitely wrong or the data definitely bad.
    const pass = describeUnlockFailure({ ok: false, reason: 'wrong-passphrase' })
    const recovery = describeUnlockFailure({ ok: false, reason: 'wrong-recovery-passphrase' })
    expect(pass).toEqual({ kind: 'plain', key: 'unlockWrongCredential' })
    expect(recovery).toEqual({ kind: 'plain', key: 'unlockWrongCredential' })
  })

  it('a newer-version vault is NEVER reported as damaged (the calm-but-wrong sin)', () => {
    const m = describeUnlockFailure({ ok: false, reason: 'newer-version', got: 9 })
    expect(m).toEqual({ kind: 'plain', key: 'unlockNewerVersion' })
    expect(m).not.toEqual({ kind: 'plain', key: 'unlockDataDamaged' })
  })

  it('genuinely-distinguishable damage (credential already authenticated) is named plainly', () => {
    expect(describeUnlockFailure({ ok: false, reason: 'data-damaged', detail: 'gcm' })).toEqual({
      kind: 'plain',
      key: 'unlockDataDamaged',
    })
  })

  it('operational reasons get calm, distinct keys', () => {
    expect(describeUnlockFailure({ ok: false, reason: 'no-vault' })).toEqual({ kind: 'plain', key: 'unlockNoVault' })
    expect(describeUnlockFailure({ ok: false, reason: 'open-in-another-tab' })).toEqual({
      kind: 'plain',
      key: 'unlockOpenElsewhere',
    })
    expect(describeUnlockFailure({ ok: false, reason: 'not-locked' })).toEqual({ kind: 'plain', key: 'unlockGeneric' })
  })

  it('every backend failure reason is explicitly mapped — none falls through (the never-default is the compile-time guard)', () => {
    // The real exhaustiveness guarantee is COMPILE-TIME: describeUnlockFailure's `default: const
    // _exhaustive: never = failure.reason` cannot compile if the backend adds a reason without calm
    // copy. This is the runtime companion — EVERY reason the two backend unions can carry resolves to
    // a real message (never the old silent fall-through to unlockGeneric, never the fail-loud throw).
    const allReasons: UnlockFailure[] = [
      { ok: false, reason: 'cancelled' },
      { ok: false, reason: 'wrong-passphrase' },
      { ok: false, reason: 'wrong-recovery-passphrase' },
      { ok: false, reason: 'data-damaged', detail: '' },
      { ok: false, reason: 'newer-version', got: 9 },
      { ok: false, reason: 'no-vault' },
      { ok: false, reason: 'open-in-another-tab' },
      { ok: false, reason: 'not-locked' },
    ]
    for (const f of allReasons) {
      const m = describeUnlockFailure(f) // throws (never default) if a reason is ever left unmapped
      if (f.reason === 'cancelled') expect(m).toEqual({ kind: 'silent' })
      else expect(m.kind === 'plain' && copy[m.key].length > 0).toBe(true)
    }
  })
})

describe('describeUnlockReadOnly — the read-only-OPEN notice (the SUCCESS arm)', () => {
  it('a read-only open returns the standing view-only KEY directly (a success WITH a caveat, not an error)', () => {
    // The seam now returns UnlockCopyKey | null (no UnlockMessage wrapper) — both call sites want
    // exactly the key-or-null the standing ViewOnlyBanner takes, so the collapse lives HERE, once.
    expect(describeUnlockReadOnly({ ok: true, readOnly: true })).toBe('unlockReadOnly')
  })

  it('a normal writable open is null — no banner', () => {
    expect(describeUnlockReadOnly({ ok: true, readOnly: false })).toBeNull()
  })

  it('the read-only key is DISTINCT from the refusal key (a success open ≠ a blocked open)', () => {
    // unlockOpenElsewhere is REFUSAL copy ("close it there, try again"); a read-only OPEN
    // succeeded and is view-only ("reload to edit"). Conflating them is the calm-but-wrong trap.
    expect(describeUnlockReadOnly({ ok: true, readOnly: true })).not.toBe('unlockOpenElsewhere')
  })

  it('the key it emits resolves to real, non-empty catalog copy (a blank banner would be silent-but-wrong)', () => {
    // Runtime completeness for the honesty surface: a key with no copy would render blank.
    // (The type index also fails to compile if a UnlockCopyKey is not a real CopyKey.)
    const key = describeUnlockReadOnly({ ok: true, readOnly: true })
    expect(key).not.toBeNull()
    if (key !== null) expect(copy[key].length).toBeGreaterThan(0)
  })
})

describe('the copy CONTENT law — keys are routed above; these pin the WORDS (ultramode 2026-07-02)', () => {
  it('the newer-version/newer-format copy carries NO damage lexicon at all (intact data, wrong vintage)', () => {
    // The routing tests prove newer → unlockNewerVersion; this proves the STRING itself can never
    // drift into "damaged"/"corrupt" while the key stays green (the tautological toBe(copy.X) trap).
    expect(copy.unlockNewerVersion).not.toMatch(/damag|corrupt/i)
  })

  it('the GCM-ambiguous credential copy HEDGES — damage may be mentioned only as a maybe, never asserted', () => {
    for (const s of [copy.unlockWrongCredential, copy.restoreWrongCredential]) {
      expect(s).toMatch(/\b(may|might|could)\b/i) // the hedge marker must survive any rewording
      expect(s).not.toMatch(/\bis (damaged|corrupt)\b/i) // never a bare assertion of damage
    }
  })
})

describe('describeRestoreFailure — the Fork A failure routing (copy + the step that can fix it)', () => {
  it('a wrong recovery word is GCM-ambiguous: hedged copy, anchored on the WORD field', () => {
    expect(describeRestoreFailure({ ok: false, reason: 'wrong-recovery-passphrase' })).toEqual({
      key: 'restoreWrongCredential',
      anchor: 'word',
    })
  })

  it('a damaged file re-opens the FILE picker (steer to another copy, never "gone")', () => {
    expect(describeRestoreFailure({ ok: false, reason: 'file-damaged' })).toEqual({
      key: 'restoreFileDamaged',
      anchor: 'file',
    })
  })

  it('BOTH newer arms (envelope + model) read "newer app" — NEVER damaged (the calm-but-wrong sin)', () => {
    const format = describeRestoreFailure({ ok: false, reason: 'newer-format' })
    const version = describeRestoreFailure({ ok: false, reason: 'newer-version', got: 9 })
    expect(format).toEqual({ key: 'unlockNewerVersion', anchor: 'file' })
    expect(version).toEqual({ key: 'unlockNewerVersion', anchor: 'file' })
  })

  it('the backend negative-pairing mirror routes back to the set-new step', () => {
    expect(describeRestoreFailure({ ok: false, reason: 'recovery-equals-passphrase' })).toEqual({
      key: 'recoverEqualsError',
      anchor: 'setNew',
    })
  })

  it('operational arms land on the error panel with calm, distinct copy', () => {
    expect(describeRestoreFailure({ ok: false, reason: 'vault-exists' })).toEqual({
      key: 'restoreVaultExists',
      anchor: 'operation',
    })
    expect(describeRestoreFailure({ ok: false, reason: 'quota' })).toEqual({
      key: 'saveErrorQuota',
      anchor: 'operation',
    })
    expect(describeRestoreFailure({ ok: false, reason: 'write-failed', detail: 'x' })).toEqual({
      key: 'saveErrorFailed',
      anchor: 'operation',
    })
  })

  it('every backend fail reason maps, and every emitted key has real catalog copy', () => {
    const allReasons: RestoreFailure[] = [
      { ok: false, reason: 'vault-exists' },
      { ok: false, reason: 'file-damaged' },
      { ok: false, reason: 'newer-format' },
      { ok: false, reason: 'wrong-recovery-passphrase' },
      { ok: false, reason: 'recovery-equals-passphrase' },
      { ok: false, reason: 'quota' },
      { ok: false, reason: 'newer-version', got: 9 },
      { ok: false, reason: 'write-failed', detail: '' },
    ]
    for (const f of allReasons) {
      const m = describeRestoreFailure(f) // throws (never default) if a reason is ever left unmapped
      expect(copy[m.key].length).toBeGreaterThan(0)
    }
  })
})
