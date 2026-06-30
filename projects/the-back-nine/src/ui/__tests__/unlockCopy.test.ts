import { describe, it, expect } from 'vitest'
import { describeUnlockFailure, type UnlockFailure } from '../unlockCopy'

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

  it('the input type is the real backend failure union (compile-time exhaustiveness)', () => {
    // A representative value typed as the real union — if the backend adds a reason and the
    // seam is not updated, this assignment (and the switch) fail to compile.
    const f: UnlockFailure = { ok: false, reason: 'wrong-passphrase' }
    expect(describeUnlockFailure(f).kind).toBe('plain')
  })
})
