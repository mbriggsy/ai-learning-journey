---
title: An async cancel/lock authority that only acts at its END lets every in-flight op resurrect cancelled state — it must be synchronous at entry and generation-checked after every await
date: 2026-06-10
phase: P1·U4 (the encrypted store — the session state machine)
modules: [store/session, store/db]
tags: [race, async, state-machine, lock, cancellation, generation-token, epoch, web-locks, finally, adversarial-review]
---

## Problem

The U4 session's `lock()` looked correct and its battery was green (23 tests), but the
temporal adversary constructed four interleavings that broke the trust contract: a lock
during `unlock()`'s ~1s PBKDF2 derive was silently overwritten (keys + model installed
AFTER the user locked); a lock during `setNewPassphrase()`'s derive wedged the session
into a keyless fake-`'unlocked'` (its catch restored a stale pre-lock status over the
drop); a save issued during `lock()`'s drain await passed the write gate and landed a
post-lock disk write; and a rejecting Web Locks request made `lock()` throw BEFORE
`dropSecrets()`, leaving secrets resident. The correctness lens had traced the same
file and called it correct — it verified the save-BEFORE-lock case, which IS correct.

## Root Cause

`lock()` exercised its authority only at its END (drop + status flip after an await),
and the long-running ops read/wrote session state across `await` boundaries with no
re-check that a lock had intervened. A KDF derive is a 0.5–1.5 s suspension — these are
wide deterministic windows, not hairline races. The session even HAD a generation
counter (`lockEpoch`, built for the engine-result discard contract) — but its own ops
never consulted it.

## Fix

The triad (all three are load-bearing):
1. **Synchronous authority at entry:** `lock()` bumps the epoch and raises a `locking`
   flag before its first await; `locking` is a clause of the ONE write-gate predicate
   and of every op's entry guard.
2. **Generation checks after every await:** each op captures `gen = epoch` at entry and
   re-checks after each await — before any disk write, any state install, and any
   catch/finally status restore. A failed check returns a typed `'cancelled'`.
3. **Local captures of working refs:** ops copy the credential refs to locals at entry,
   so a concurrent `dropSecrets()` surfaces as the gen-checked `'cancelled'` — never a
   null-deref masquerading as a crypto error (our first fix attempt failed exactly
   there: the GCM-flavored TypeError arrived before the gen check did).
   And the drop itself sits in `lock()`'s `finally` — a cancel that cannot fail to
   cancel. (Implementation footnote: `void run.finally(cb)` re-propagates a rejection
   into an unhandled void — accounting side-channels need `.then(onOk, onErr)`.)

## Key Insight

In an async state machine, any "authority" action (lock, cancel, logout, teardown) that
takes effect only when IT finishes is fiction: every suspended op holds a stale view and
will faithfully install it afterward. Authority = a synchronous token bump at entry +
every op re-validating the token after every await it returns from — and the op's
failure path must be designed so cancellation looks like cancellation (locals, typed
result), not like a different bug. Meta-lesson for reviews: the correctness lens
verified the sequential contract and PASSED it honestly; only the adversary explicitly
assigned the TEMPORAL angle generated the during-window interleavings. Lens diversity is
angle diversity — N reviewers on the same angle ≈ 1.

## Also Applies To

- The future crypto-worker fallback (if ever built): worker-side derives outliving a lock.
- P2's engine-run discard (the `lockEpoch` consumer) — same token, same rule.
- Any UI flow with debounced autosaves racing logout/lock (the save-during-drain shape).
- Service-worker update acceptance vs in-flight writes (the `whenNoWriteInFlight` snapshot
  covers the tail at CALL time only; the handler must re-check before `skipWaiting`).
