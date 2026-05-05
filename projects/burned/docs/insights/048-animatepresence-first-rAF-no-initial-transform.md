---
title: AnimatePresence has a one-rAF window where content reads as `transform: none` before `initial` applies
date: 2026-05-05
modules: [src/client/shared/BottomSheet.tsx, tests/e2e/framer-bottom-sheet-shape.spec.ts]
tags: [framer-motion, animatepresence, runtime-gate, per-frame-sampling]
---

## Problem

Building the BottomSheet runtime gate. Per-rAF sampler tracking the sheet's
content `translateY` (parsed from computed transform matrix) showed an
unexpected first frame:

```
frame 0:  t=680ms  tY=0     bG=664   ← content briefly at viewport top
frame 1:  t=697ms  tY=192   bG=-192  ← initial={translateY 100%} applied
frame 2:  t=714ms  tY=174   bG=-174  ← spring animating toward 0
...
frame N:  t=1764ms tY=0     bG=0     ← settled at viewport bottom
```

Frame 0 reports `translateY 0` AND a viewport-bottom-gap of 664px (content
at the TOP of the viewport, not bottom). One frame later, Framer's
`initial={translateY 100%}` applied and the cinematic ran cleanly.

The position-invariant assertion (peak bottom-gap ≤ 50px, insight 013
catch) was flake-failing because frame 0's tY=0 frame got included in the
"peak" filter, polluting the median bottom-gap with the wrong number.

## Root Cause

When AnimatePresence's child first mounts, there's a one-rAF window where
the element is **in the DOM** with computed `transform: none` (read as
translateY 0) **before Framer applies the `initial` prop**. The element
sits at its natural CSS-layout position for that frame.

For BottomSheet, the natural layout position differs from the eventually-
settled position because the parent `<dialog>` is still resolving its
top-layer placement (`showModal()` enters the top layer; CSS `inset: auto
0 0 0` is honored after the first paint, not at mount). So the first
frame's getBoundingClientRect can be far from where the cinematic settles.

## Fix

Activation-detection in the shape-derivation function skips frames before
Framer's `initial` applies. Anchor "Framer engaged" to the first frame
where translateY > 50px — the initial 100% offset proves Framer's
pipeline has run:

```ts
function findActivation(trace) {
  const startIdx = trace.findIndex(f => Number.isFinite(f.translateYPx))
  const framerStartIdx = trace.findIndex(
    f => Number.isFinite(f.translateYPx) && f.translateYPx > 50,
  )
  return { startIdx, framerStartIdx }
}
```

Peak measurement starts at `framerStartIdx`, not `startIdx`. The pre-
Framer frame is filtered out cleanly, the cinematic is measured against
its real arc.

## Key Insight

**Per-rAF samplers on AnimatePresence content must filter out the
pre-`initial` mount frame.** The `initial` prop applies at first paint,
but `requestAnimationFrame` can fire BEFORE that paint commits — the
sampler reads the un-initialized state for one tick.

The detection trick: anchor activation to a frame that proves Framer's
pipeline ran (e.g., `translateY > 50` on a 100%→0 cinematic, or
`scale > 0.4` on a 0.35→1 cinematic, or `opacity < 0.5` on a 0→1).
Whatever distinct early-state value the `initial` prop sets, look for it.

This is NOT a Framer bug — it's a fundamental React-mount ordering
question. The element exists in DOM before any `useLayoutEffect` /
animation hook runs. Any per-frame sampler will see it.

## Also Applies To

- Drama-beat sampler (`tests/e2e/drama-beat-timing.spec.ts`) — works only
  because GSAP timelines are constructed in a `useEffect` after mount, AND
  the overlay starts at opacity 0 (not opacity 0 → 1), so a pre-init frame
  reads as opacity 0 too. If the drama overlay ever moves to a non-zero
  initial, the same filter pattern will be needed.
- Framer hand→enlarge gate (`tests/e2e/framer-hand-enlarge-shape.spec.ts`)
  — uses `Number.isFinite(cardScale)` to detect activation, which works
  because the enlarge card portal mounts only when `enlargedId` is set; the
  pre-Framer frame happens but its scale reads as NaN (matrix `none`).
  Different mechanism, same outcome.
- Any future runtime gate sampling AnimatePresence cinematics — bake the
  `findActivation` filter into the helper from day one. Saves a debug pass.
