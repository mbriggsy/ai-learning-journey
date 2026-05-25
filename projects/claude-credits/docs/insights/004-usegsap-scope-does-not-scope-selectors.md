---
title: GSAP useGSAP({ scope }) does not scope selector strings — only context revert
date: 2026-05-25
phase: Phase 4 — project grid (flagged in Phase 3/4 review, P2 pending)
modules: [src/components/ProjectGrid/ProjectGrid.tsx]
tags: [gsap, usegsap, scrolltrigger, selector-scope, react, latent-trap]
---

## Problem

`ProjectGrid` runs its reveal inside `useGSAP(() => {...}, { scope: gridRef })` and
targets tiles with string selectors: `gsap.set('[data-tile]', ...)`,
`ScrollTrigger.batch('[data-tile]', ...)`, and a `refreshInit` listener that does
`gsap.set('[data-tile]', { y: 0 })`. It works perfectly — today.

## Root Cause

The `scope` option on `useGSAP` is widely assumed to scope *selectors* to the ref
subtree. It does **not**. `scope` governs the GSAP **context**: which tweens/triggers
get reverted (killed) on unmount or dependency change. A bare string selector inside
the callback is still resolved with `document.querySelectorAll('[data-tile]')` against
the **whole document**. Listener callbacks fired on GSAP's global bus (e.g.
`ScrollTrigger.addEventListener('refreshInit', ...)`) run outside the context entirely,
so they were never scoped to begin with.

Benign while exactly one component owns `[data-tile]`. The moment a second route/component
uses the same attribute, the grid's `gsap.set` hides *its* elements and the batch adopts
them — a silent cross-route hijack. (4 independent review personas flagged this; verified
against source. Currently a pending P2 — the grid is the only `[data-tile]` host so far.)

## Fix

Pass a **scoped node list**, never a bare string, for setup-time selection:

```ts
const tiles = () => gsap.utils.toArray<HTMLElement>('[data-tile]', gridRef.current)
gsap.set(tiles(), { autoAlpha: 0, y: 40 })
ScrollTrigger.batch(tiles(), { ... })
const resetTileY = () => { if (gridRef.current) gsap.set(tiles(), { y: 0 }) }
```

`gsap.utils.toArray(selector, scopeNode)` is the scoped form. (`scopeNode.querySelectorAll`
works too.) The `scope: gridRef` on `useGSAP` still earns its keep for revert/cleanup — keep it.

## Key Insight

In `@gsap/react`, **`scope` scopes lifecycle (revert), not lookup (selection).** Any string
selector inside `useGSAP` — and especially inside a global-bus listener — is document-wide.
Scope your *selections* explicitly with `gsap.utils.toArray(sel, ref.current)`; don't trust
`{ scope }` to constrain what a string matches.

## Also Applies To

- Every `ScrollTrigger.batch` / `gsap.to` / `gsap.set` with a string selector inside `useGSAP`.
- Shared `data-*` / class hooks reused across routes or components (the collision surface).
- Any "this is scoped, it's fine" assumption about a framework option — confirm what the
  option actually scopes before relying on it for isolation.
