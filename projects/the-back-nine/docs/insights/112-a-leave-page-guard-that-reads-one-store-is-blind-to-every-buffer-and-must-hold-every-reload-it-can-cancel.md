---
title: A leave-page guard that reads one store is blind to every buffer typed work lives in — and a guard that can cancel a reload must hold every mechanism that starts one
date: 2026-09-03
phase: Post-Act-4 — the 2026-08-20 intake-walk findings (the intake beforeunload guard, ranked item 3)
modules: [src/ui/IntakeApp.tsx, src/ui/unloadGuard.ts, src/ui/resultSave.ts, src/ui/UpdateToast.tsx, src/ui/updateGate.ts, src/intake/unsavedBuffer.ts, src/intake/AccountEntry.tsx, src/intake/OtherIncomeEntry.tsx, src/intake/BudgetBuilder.tsx, src/intake/RothLever.tsx]
tags: [beforeunload, unsaved-work, atomic-form, hold-counter, skipWaiting, pwa-update, version-skew, ultramode-review, derived-not-tracked, insight-058, insight-020]
---

## Problem

The intake beforeunload guard shipped against a 24-agent-verified recipe (one disk-derived decision,
`unsavedWorkPending`, disarmed at the ceremony's commit): every gate green, five mutants killed, three
scenarios witnessed live. The unit-boundary review then converged four lenses each on two holes:

1. Over a **saved-and-clean vault** (the returning household's entire session): "Add an account",
   type eight fields, reload — no dialog. `AccountEntry`, `OtherIncomeEntry`, the budget builder's rows
   and the Roth lever's plan hold a whole answer in component state until an explicit commit tap. The
   header's accepted residual was "one un-blurred field"; the real ceiling was an itemized budget.
2. The armed dialog made the PWA "Refresh now" reload **refusable after the point of no return**: in
   prompt mode the toast sends skipWaiting FIRST and the reload arrives later from the new worker's
   `controlling` event, so "Stay" cancels the reload after the new worker owns the page and has dropped
   the old build's chunks — version skew, the toast dismissed, the apply latched.

## Root Cause

1. The guard's operand was **one store**. Insight 058 named the write side (an invariant with many
   writers isn't closed by fencing one); this is the read side: "would a reload lose typed work?" has
   as many operands as there are places typed work lives, and the atomic forms are BY DESIGN not the
   store. A store-only guard is correct on a fresh intake (the first name arms it) and silently blind
   on exactly the path a returning household spends its time on.
2. SaveFlow stated the law in a comment — *"beforeunload does NOT stop the intentional reload; the
   hold is what makes the toast refuse"* — so it was a discipline each registration had to remember.
   A guard that can CANCEL a navigation changes the contract of every mechanism that INITIATES one;
   when the initiator has an irreversible step before the navigation, "cancel" is a half-apply.

## Fix

- `intake/unsavedBuffer.ts`: the updateGate hold-counter shape (idempotent release), a
  `useSyncExternalStore` pair, `bufferMoved` on the disk compare's own canonicalizer. Each typed form
  holds while its state differs from its seed — derived per render, released by effect cleanup on
  Add/Cancel/unmount. IntakeApp ORs the live count in. Single-pick sheets deliberately don't hold.
- `ui/unloadGuard.ts`: ONE hook behind both registrations — listener + `holdUpdateApply` as one fact;
  the refused tap renders `copy.updateHeld` instead of a live-looking button that does nothing.
- Both witnessed live at 1536×791 (account editor, budget sheet); fifteen mutants killed in all.

## Key Insight

**A "would a reload lose work?" guard must enumerate every buffer typed work lives in, not the one
store the app calls the draft** — atomic forms, staged sheets, anything that commits on a tap. **And
a guard that can cancel a navigation inherits every initiator of one:** find each reload / update-apply
path and pair the guard with the hold that makes it refuse BEFORE its irreversible step — a law in a
comment is not structural until one seam carries both facts. Test corollary: jsdom folds beforeunload's
two channels (`returnValue = ''` alone sets `defaultPrevented`), so pin `preventDefault()` on its own.

## Also Applies To

- Any future "unsaved" signal (dirty badge, sheet leave-confirm, autosave dot): list the buffers first —
  `grep useState` in every component that calls an `onSave`/`onApply` prop.
- Every new `beforeunload`: route it through `useUnloadGuard`, never a bare `addEventListener` (020).
- The single-pick sheets, if his eye rules a lost preview pick is work: flip it in `unsavedBuffer.ts`.
