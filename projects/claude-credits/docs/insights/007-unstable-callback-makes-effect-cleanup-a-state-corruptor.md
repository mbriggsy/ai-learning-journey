---
title: An unstable callback dep turns a side-effecting useEffect cleanup into a per-render state corruptor
date: 2026-05-26
phase: 5
modules: [src/components/Gallery/Gallery.tsx]
tags: [react, useEffect, useCallback, focus-trap, scroll-lock, modal, re-render, ce-review]
---

## Problem

The Gallery lightbox opened and closed fine in manual testing and passed a Playwright clean
open→close focus check. But focus-restore-on-close intermittently landed on the wrong element,
and body scroll-lock could be left stuck. Eye-on-browser verification did not catch it; only the
multi-persona `/ce:review` (3 reviewers independently) flagged it.

## Root Cause

`Gallery` passed `onClose={() => setOpenIndex(null)}` — a fresh arrow on every render — to the
`Lightbox`, whose focus/scroll-lock `useEffect` declared `[onClose]` as its dependency. So *any*
`Gallery` re-render minted a new `onClose` identity and re-ran the effect. Crucially, that
effect's cleanup is not a pure teardown — it has side effects: it **restores focus** to the
captured `prevFocus` and **unlocks body scroll**. So each spurious re-run executed the cleanup
mid-session: `prevFocus` (originally the triggering tile) got overwritten with the close button on
the re-setup, and the scroll lock flickered off/on.

The trigger was **passive, not a user action**: a sibling gallery image's lazy-load `onError`
fires `setBroken(...)` → `Gallery` re-renders → new `onClose` → effect churn. That's why a clean
open→close test (no concurrent image loads) never reproduced it.

## Fix

`const handleClose = useCallback(() => setOpenIndex(null), [])` in `Gallery`, passed to
`Lightbox`. Stable identity → the child effect runs once per mount / cleans up once per unmount.
Verified by reproducing the exact scenario in Playwright: open → dispatch `error` on a sibling
image → Esc → focus correctly restored to the tile, scroll-lock held then released.

## Key Insight

When a `useEffect`'s **cleanup mutates app state** (focus restore, scroll lock, captured refs,
subscriptions with side effects), an unstable dependency is not a perf nit — it makes the cleanup
a **state corruptor that fires on every parent re-render**. And the re-render can be passive
(a sibling's async `onError`, a context tick), so it won't show up in interaction-only testing.
Two guards: (1) memoize callbacks passed to a child whose effect depends on them; (2) verify
modal focus/scroll-lock behavior under a **mid-open parent re-render**, not just clean open/close.

## Also Applies To

- Any portal/dialog/drawer whose effect captures `document.activeElement` and restores it on
  cleanup — the capture is only correct if the effect runs exactly once.
- Effects that lock/restore a global (`body.style.overflow`, `inert`, scroll position, event
  listeners) keyed on a callback or object dependency.
- Sits next to [[006-gsap-autoalpha-breaks-focus]] — same component, same focus-restore symptom,
  different root cause. Both passed naive tests; the review caught them. Pair the two when writing
  modal focus tests.
