---
title: Borrowed Framer `m` components render at their hidden `initial` state under Remotion — reconstruct the shell, don't import it
date: 2026-05-29
phase: Origin trailer v2 — plan-B (hybrid) payoff
modules: [videos/origin-trailer/src/scenes, src/client/shared]
tags: [remotion, framer-motion, living-ui, cross-package-import, root-cause, motion, trailer]
---

## Problem

Plan B (hybrid) needs the *real* BURNED product on screen at the payoff beats.
The cross-package borrow path was already proven for inert pieces
(`FoundationProof` renders a real card: real data + CSS + art + `CardIcon`). The
natural next step was to borrow a real prop-driven SCREEN wholesale — `GameOver`
takes plain props (`players`, `winnerId`, `eliminationOrder`), no store — wrap it
in the game's `MotionProvider`, feed mock data, render a still.

Result: only the **non-motion chrome** rendered ("// Case 47-B · Closed",
"[ Classified ]"). The entire body — winner name, subtitle, rankings — was
**blank**. Swapping the async `MotionProvider` for a synchronous one
(`LazyMotion features={domMax}` eagerly, not via the async loader) did **not**
fix it. The body stayed empty.

## Root Cause

`GameOver`'s body is built from Framer `m.div` / `m.header` / `m.button`, each
with `initial={{ opacity: 0, ... }}` → `animate={{ opacity: 1 }}`. **Framer
animates on its own `requestAnimationFrame` wall-clock, which Remotion's
single-frame still capture never advances.** So every `m` element is captured at
or near its `initial` state — `opacity: 0` — i.e. invisible. The chrome rendered
only because it is NOT wrapped in motion components.

This is not an async-load problem (sync features didn't help) and not a
store-coupling problem (`GameOver` is fully prop-driven). It is a **clock
mismatch**: Framer's timeline ≠ Remotion's frame timeline. It is the same wall
the locked LIVING-UI decision already named — *"live ANIMATED components stay
home; inert pieces cross"* — observed from the other side.

(Related: insight 002 — LazyMotion's "lazy" is only the feature bundle. Here the
feature bundle loads fine; the animation *clock* is the problem.)

## Fix

**Borrow the inert real UI; reconstruct the animated shell.** `WinnerProof`
imports the *real* `GameOver.module.css`, the real `PlayerIcon`, the real
`WINNER_MESSAGES` pool, and the real token legend — then rebuilds the markup
with plain `div`s (no `m`) and drives the staggered entrance off Remotion's
`useCurrentFrame` + `spring`/`interpolate`, mirroring `GameOver`'s Framer delays
converted to frames. Output is **pixel-identical** to the live screen (same CSS
classes, icons, data) and **fully frame-deterministic**.

## Key Insight

**A component being prop-driven (not store-coupled) is necessary but NOT
sufficient to borrow it wholesale into Remotion. If it uses Framer `m` with an
`initial`→`animate` entrance, it will render at the hidden `initial` state in a
still.** The borrow boundary is not "does it need the store" — it is **"does its
visible output depend on a non-Remotion animation clock."**

Decision rule when borrowing a game component into the trailer:
1. Uses the live `gameStore` / `useSharedSelectors`? → can't cross; rebuild from real CSS.
2. Uses Framer `m` with an entrance animation? → don't import the component; **reconstruct the shell from its real CSS module + real presentational helpers, Remotion-drive the motion.**
3. Pure presentational, no `m`, no store (e.g. `MinimalCard`, `PlayerIcon`, `CardIcon`, token CSS, card art/data)? → borrow wholesale (the `FoundationProof` path).

The reconstruction keeps the product's exact pixels (it reuses the real stylesheet) while moving the motion onto the frame clock — so it costs layout-rebuild effort, not visual fidelity.

## Also Applies To

- **Every remaining Framer-coupled payoff piece** (player `Hand`, board chrome): same reconstruction pattern — borrow CSS + cards, rebuild the shell, Remotion-drive.
- **Any Remotion project importing an existing app's React components** — audit for Framer/GSAP/CSS-transition entrances before assuming a still will capture them.
- **Verification discipline:** a clean typecheck + a no-error render is NOT proof the UI rendered — only *looking at the pixels* caught the empty body. Render the still, read the image.
