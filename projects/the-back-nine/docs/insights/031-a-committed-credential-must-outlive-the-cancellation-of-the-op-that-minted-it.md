---
title: A committed credential must outlive the cancellation of the op that minted it — cancelling firstSave after the vault write strands the phrase
date: 2026-06-10
phase: P1·U4 (the encrypted store — first save / restore)
modules: [store/session, store/backup]
tags: [cancellation, credential, recovery-phrase, first-save, stranded-vault, race, partial-completion]
---

## Problem

Folding the insight-030 generation checks into `firstSave` mechanically — "cancel
everywhere the token changed" — would have produced: derive → mint → vault write
COMMITS → gen check fails (a lock landed) → return `'cancelled'`. The vault now exists
on disk, encrypted under a DK whose only recovery credential (the 12-word phrase) was
generated inside the op and returned to NOBODY. The next unlock prompts for a
passphrase the user has (fine) — but if they ever lose it, the phrase that should be
their recovery door was never seen by a human. The cancellation created a permanently
under-credentialed vault, strictly worse than the race being fixed.

## Root Cause

Cancellation semantics were being applied uniformly to an op whose steps differ in
kind: in-memory installs are revocable (skip them, GC cleans up), but a committed
durable write that MINTED A CREDENTIAL is not. Once the write lands, the credential's
delivery to the caller is part of the durability contract, not part of the cancellable
op state.

## Fix

`firstSave` gen-checks BEFORE the vault write (a clean cancel — nothing on disk), but
once the serialized write commits it ALWAYS returns `{ ok: true, recoveryPhrase }`,
gating only the in-memory installs on the generation. Same rule in `setNewPassphrase`:
a wrap re-mint that committed reports ok (the passphrase DID change on disk) even if a
lock cancelled the in-memory credential swap.

## Key Insight

Place the point-of-no-return consciously: every cancellable async op that performs a
durable side effect has exactly one — before it, cancel cleanly and completely; after
it, the op must COMPLETE ITS REPORTING obligations even though its state effects are
cancelled. Anything the caller can only ever learn from THIS invocation (a minted
credential, a generated recovery code, an allocated external ID) belongs to the
reporting obligation, never to the cancellable remainder.

## Also Applies To

- The P2 first-save UI flow: the mandatory phrase-display/export step must consume the
  result even if the session locked mid-save (the phrase rides the result, not the
  session state).
- Any future server-ish allocation (e.g., a cloud-backup upload token): cancellation
  after the allocation must still surface the allocated handle.
- Restore: the new-passphrase wrap commits atomically WITH the vault, so restore has no
  equivalent window (the design dodges the problem — keep it that way).
