---
title: A catch block spanning the durability point-of-no-return reports a COMMITTED write as "didn't finish" — one try per durability regime
date: 2026-07-02
phase: P2 (U8 — decrypt-on-return SLICE 2, surface 4; found by the slice-2 ultramode review)
modules: [src/ui/RestoreFlow.tsx, src/store/session.ts, src/store/backup.ts]
tags: [try-catch, durability, point-of-no-return, restore, calm-but-wrong, error-copy, post-commit]
---

## Problem

RestoreFlow's `runRestore` wrapped the whole sequence — `session.restore` (the durable vault
commit) AND the post-commit `session.unlock` re-entry — in ONE try. The `{ok:false}` unlock
refusal was routed correctly (the vault is healthy → exit to the unlock screen), but a THROWN
unlock (session rethrows non-CipherAuthError programming errors; a transient IndexedDB read can
throw) fell into the shared catch, which renders `saveErrorFailed`: **"Saving didn't finish. Try
again."** — after the restore had durably committed. A false durability claim on the survivor's
re-entry door, plus a misleading remedy (the retry then hits `vault-exists`, a second dead-end).

## Root Cause

The try/catch boundary was drawn around the *task* ("do the restore flow") while the copy it
guards describes a *durability regime* ("your save didn't finish"). Between `restore` returning
ok and the function's end, the world has crossed the point-of-no-return — the on-disk state the
error copy talks about is already true — but the exception routing didn't change with it. The
typed-result arm got regime-aware handling; the THROW path silently kept pre-commit semantics,
because a catch's scope is invisible in a linear read of the happy path.

## Fix

Split the try at the commit: `session.restore` stays under the outer catch (pre-commit failures
→ "didn't finish" + retry, honest); the post-commit `unlock` sits in its OWN try whose failure —
refusal or throw alike — routes to the unlock-screen door with a comment naming the rule ("past
this line no path may read 'didn't finish'"). Planted-fail test: restore ok + unlock rejects →
`onExitToUnlock`, and `saveErrorFailed` never renders.

## Key Insight

**Draw catch boundaries at durability points-of-no-return, not around tasks.** Any function that
performs a durable commit and then continues has two error regimes — before the commit the
honest report is "it didn't happen"; after, it is "it happened; the follow-up hiccupped" — and a
single catch can only speak one of those truths. The review question for any `try` containing a
commit: *what does this catch's copy claim about the on-disk state, and is that claim true from
every line the try covers?* This is the caller-side dual of [[031]] (the op must complete its
reporting obligations post-commit): the CALLER must also re-route its failure reporting once the
commit lands, or a thrown follow-up converts a success into a reported failure.

## Also Applies To

- `SaveFlow`'s firstSave → export sequence (export failure after the atomic commit must never
  read as "not saved" — currently separate steps, which is why it's safe; keep it that way).
- Any write-then-notify / write-then-refresh pattern: commit + cache invalidation, commit + SW
  `skipWaiting`, POST + follow-up GET — a shared catch mislabels phase-2 failures as phase-1.
- The typed-result arm being handled while the THROW arm regresses is the tell: audit both exits
  of every post-commit call.
