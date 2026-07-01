import { describe, it, expect } from 'vitest'
import { describeUnlockFailure, describeUnlockReadOnly, type UnlockFailure } from '../unlockCopy'
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

  it('the input type is the real backend failure union (compile-time exhaustiveness)', () => {
    // A representative value typed as the real union — if the backend adds a reason and the
    // seam is not updated, this assignment (and the switch) fail to compile.
    const f: UnlockFailure = { ok: false, reason: 'wrong-passphrase' }
    expect(describeUnlockFailure(f).kind).toBe('plain')
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
