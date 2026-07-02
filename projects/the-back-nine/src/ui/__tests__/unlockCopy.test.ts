import { describe, it, expect } from 'vitest'
import {
  describeUnlockFailure,
  describeUnlockReadOnly,
  describeRestoreFailure,
  type UnlockFailure,
  type RestoreFailure,
} from '../unlockCopy'
import { copy } from '../copy'

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
  it('a read-only open returns the standing view-only key (a success WITH a caveat, not an error)', () => {
    expect(describeUnlockReadOnly({ ok: true, readOnly: true })).toEqual({ kind: 'plain', key: 'unlockReadOnly' })
  })

  it('a normal writable open is silent — no banner', () => {
    expect(describeUnlockReadOnly({ ok: true, readOnly: false })).toEqual({ kind: 'silent' })
  })

  it('the read-only key is DISTINCT from the refusal key (a success open ≠ a blocked open)', () => {
    // unlockOpenElsewhere is REFUSAL copy ("close it there, try again"); a read-only OPEN
    // succeeded and is view-only ("reload to edit"). Conflating them is the calm-but-wrong trap.
    const readOnly = describeUnlockReadOnly({ ok: true, readOnly: true })
    expect(readOnly).not.toEqual({ kind: 'plain', key: 'unlockOpenElsewhere' })
  })

  it('every key the seam can emit resolves to real, non-empty catalog copy', () => {
    // Runtime completeness for the honesty surface: a key with no copy would render blank.
    // (The type index also fails to compile if a UnlockCopyKey is not a real CopyKey.)
    const emitted = [
      describeUnlockReadOnly({ ok: true, readOnly: true }),
      describeUnlockFailure({ ok: false, reason: 'wrong-passphrase' }),
      describeUnlockFailure({ ok: false, reason: 'data-damaged', detail: '' }),
      describeUnlockFailure({ ok: false, reason: 'newer-version', got: 9 }),
      describeUnlockFailure({ ok: false, reason: 'no-vault' }),
      describeUnlockFailure({ ok: false, reason: 'open-in-another-tab' }),
      describeUnlockFailure({ ok: false, reason: 'not-locked' }),
    ]
    for (const msg of emitted) {
      if (msg.kind === 'plain') expect(copy[msg.key].length).toBeGreaterThan(0)
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
