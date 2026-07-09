---
title: A modal-close focus-restore guard that reads focus position at exit-complete must exempt the dying dialog's OWN subtree — real browsers fire the callback while the node is still attached
date: 2026-07-09
phase: P3·U12 (the AssumptionPanel — the sheet→sheet routing guard)
modules: [src/intake/controlSheet.tsx]
tags: [focus-management, modal, onExitComplete, animate-presence, jsdom-vs-browser, live-walk, a11y, regression, sheet-family]
---

## Problem

U12's AssumptionPanel added sheet→sheet routing (a via-sheet row closes the panel and opens the
fact's own editor in the same click), so the family scaffold gained a guard: at
`onExitComplete`, if focus already lives inside a sheet, skip the focus-restore — restoring to
our trigger would STEAL focus back out of the newly-opened modal. The guard's jsdom pin was
green, the mutant (guard removed) was proven red, the battery passed. The live walk then found
**every sheet's plain close — panel and pre-U12 sheets alike — stranding focus on `<body>`**:
the guard had regressed the whole family's shipped restore behavior.

## Root Cause

The guard's predicate was "is `document.activeElement` inside ANY `.control-sheet`/`.budget-sheet`?"
In a real browser, framer-motion's `onExitComplete` can fire while the dying dialog is **still
attached to the DOM**, with focus still sitting on the Close/Cancel button the user just clicked
— *inside a sheet*. The guard read its own dying dialog as "another modal owns focus" and
suppressed the restore; React then detached the node and focus fell to `<body>`. In jsdom the
detach happens before the callback, so `activeElement` is already `body` and the pin exercised
only the happy path — the component test was structurally incapable of seeing the failure
(the insight-048/064 family, now at the FOCUS-TIMING layer).

## Fix

The predicate exempts the dying dialog's own subtree before asking whether a sheet owns focus:

    const withinDying = dialogRef.current !== null && dialogRef.current.contains(active)
    if (!withinDying && active instanceof HTMLElement &&
        active.closest('.control-sheet, .budget-sheet') !== null) return

Re-proven live in both directions: a plain close restores focus to the opening door; sheet→sheet
routing leaves focus inside the NEXT sheet's heading with no ~200ms steal-back.

## Key Insight

**A guard that inspects global focus position inside a teardown callback is reasoning about a
DOM whose timing differs by environment.** Any exit-complete / unmount-adjacent callback may run
before OR after the node leaves the tree — so a predicate like "focus is inside an X" must
always partition *which* X: the dying instance's own subtree is the caller's, not evidence of a
rival. Write such guards as "focus is inside an X **that is not me**." And the test discipline:
a focus-restore behavior pinned only in jsdom is pinned against jsdom's teardown ORDER, not the
browser's — any modal-close focus contract needs one real-browser arm (the fit-gate harness
already exists; the cost is one `page.evaluate`).

## Also Applies To

- Every future consumer of the ControlSheet scaffold (the U13 re-entry surfaces, Act-4's
  recommendation sheets) — the guard is now correct at the family level.
- Any "don't act if someone else holds the resource" check inside a teardown callback (scroll
  locks counting open modals, body-class cleanup, `aria-hidden` siblings) — the dying instance
  must never count itself.
- The BandEnlargeModal if it ever gains routing into a sheet.
