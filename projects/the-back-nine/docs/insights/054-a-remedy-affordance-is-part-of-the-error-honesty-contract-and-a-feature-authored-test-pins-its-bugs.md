---
title: A deterministic refusal's remedy AFFORDANCE is part of the honesty contract — and a test authored with the feature pins its bugs as the spec
date: 2026-07-02
phase: Act 2 · U8 decrypt-on-return closeout
modules: [src/ui/Result.tsx, src/ui/resultSave.ts, src/ui/unlockCopy.ts, src/ui/IntakeApp.tsx]
tags: [lying-remedy, error-affordance, transient-vs-deterministic, read-only, secondTab, test-enshrined-bug, ultramode-review, insight-020-shape]
---

## Problem

The edit-and-re-save's `failed` state rendered ONE primary button — "Try again" →
`resave()` — for all three failure keys. For `saveErrorReadOnly` (backend
`not-writable` in a read-only second tab) the retry is DETERMINISTIC-fail: `secondTab`
is captured once at unlock and never re-probed, so every click re-refuses forever —
directly beneath an alert whose own copy says "Reload this page to save here." The
suite was green: `Result.test.tsx` rendered exactly `errorKey: 'saveErrorReadOnly'`
and ASSERTED the Try-again button fires `onRetry`. 7 of 10 review lenses converged on
it independently.

## Root Cause

Three compounding layers. (1) The honesty work stopped at the COPY: `describeSaveFailure`'s
header explicitly swears off the close-tab retry and maps `not-writable` to reload-steering
text — but the failed-state BUTTON stayed generic across all keys, so the affordance
contradicted its own adjacent copy. (2) The same arc had already fixed this exact shape on a
sibling surface (RestoreFlow's `vault-exists` arm → a reload button, "a retry
deterministically re-refuses") — the principle didn't transfer, the [[020]] shape at the
affordance layer: fixing the lying remedy on one surface does not protect the next surface
rendering the same failure CLASS. (3) The test was written alongside the feature by the same
hand, so it certified the feature's assumptions — including the bug. It even picked the
broken key as its example. A suite can be the bug's bodyguard.

## Fix

`Result.tsx`'s failed arm branches on the key: `saveErrorReadOnly` → a reload button
(`copy.restoreRetry` → `window.location.reload()`, matching the copy's own instruction);
transient `quota`/`write-failed` keep the genuine retry. The enshrined test now asserts
reload-not-retry for the deterministic arm. Verified live in a real two-tab session.

## Key Insight

**An error's remedy affordance is part of the honesty contract, not chrome.** Classify
every failure key as TRANSIENT (a retry can succeed — offer it) or DETERMINISTIC (the
same call re-refuses until some external state changes — the primary action must BE the
copy's stated remedy, never a re-run). The review question for any error panel: *can the
button's action actually change the outcome, or does only the sentence above it tell the
truth?* And treat a same-session sibling fix as a re-audit trigger: grep for every other
surface rendering the same failure class before calling the pattern closed — a test
written with the feature will not catch what the feature assumed.

## Also Applies To

- Any future error panel with a shared retry button over a discriminated error union
  (the Act 3 control surfaces, the solver's input-failure panels).
- `unlockCopy`'s other deterministic arms if new consumers render them with generic CTAs.
- Review practice: when a finding's fix lands, enumerate sibling surfaces of the same
  failure class in the SAME pass (the closeout caught this only because the review read
  whole files, not the diff).
