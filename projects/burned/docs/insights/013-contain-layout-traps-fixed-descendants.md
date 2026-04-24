---
title: "`contain: layout` (and siblings) creates a containing block that traps `position: fixed` descendants"
date: 2026-04-23
phase: playtest-harness docs migration (originally debugged 2026-04-23 EndGameControl)
modules: [src/client/board, src/client/shared]
tags: [css, modal, contain, position-fixed, containing-block, z-index]
---

## Problem

EndGameControl modal: `position: fixed`, `inset: 0`, z-index above everything,
`opacity: 1`. DOM present. Invisible. Game chrome painted through the top; clicks
went to the game, not the modal. Every z-index on the page was sanely ordered.

## Root Cause

`GameTable`'s `.table` had `contain: layout` for performance. That property
establishes a new **containing block** for any `position: fixed` descendant —
fixed is no longer relative to the viewport, it's relative to `.table`. Modal's
z-index was computed against `.table`'s stacking context and lost to siblings
higher up the tree.

Not just `contain: layout`. **Any** of these on an ancestor creates the trap:
`contain: layout|paint|strict`, `transform` (even identity), `filter`,
`perspective`, `backdrop-filter`, `will-change: transform|filter|perspective|backdrop-filter`.

## Fix

Rendered `EndGameControl` as a **sibling** of `GameTable`, not a child. Fixed
positioning resolves against the viewport again. Alternative: React portal to
`document.body`.

## Key Insight

**`position: fixed` only truly fixes to the viewport when no ancestor creates
a containing block.** Modern CSS performance/paint primitives all create one.
Before declaring a modal "fixed," walk the ancestor tree and confirm none of
those six properties appear.

When a fixed modal "doesn't appear above the app," the first diagnostic is not
z-index — it's containing-block. Ctrl-F computed styles up the tree for those
six property names.

## Also Applies To

- Tooltips, popovers, toasts, any `position: fixed` overlay.
- Cross-team landmine: a teammate adds `transform: translateZ(0)` for GPU
  promotion on a parent → silently breaks every `position: fixed` descendant
  written by another team.
- Portal decisions: if you can't guarantee a clean ancestor tree, portal.
