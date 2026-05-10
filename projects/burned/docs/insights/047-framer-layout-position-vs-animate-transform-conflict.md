---
title: Framer `layout="position"` + `popLayout` is a structural fast-snap, not an animate.transform conflict
date: 2026-05-05
updated: 2026-05-05
modules: [src/client/player/Hand.tsx, src/client/shared/MinimalCard.tsx, tests/e2e/framer-hand-reorder-shape.spec.ts]
tags: [framer-motion, animation, layout, transform, runtime-gate, misdiagnosis]
---

## Problem

Building a runtime gate for the Hand-reorder cinematic. When a card stages
out, the remaining cards' `layout="position"` should animate them into the
gap. Sampling card[1]'s `getBoundingClientRect().left` per rAF showed the
position jumping from old to new in **one frame** (single 16ms tick), with
no smooth interpolation.

## Original (Incorrect) Hypothesis

The Hand slot has both `layout="position"` AND an explicit `animate.transform`:

```tsx
<m.div
  layout={dealComplete ? 'position' : false}
  animate={{ opacity: 1, transform: 'translateX(0px) scale(1)' }}
  exit={{ opacity: 0, transform: 'scale(0.7)' }}
  transition={MOTION.snappy}
>
```

The first version of this insight claimed: `layout="position"` works by
animating `transform` from `translate(delta)` back to `translate(0)`, and
the explicit `animate.transform` clobbers the layout-derived value. The
proposed fix was to split `transform` into separate `x` / `scale`
motion-value props (which would supposedly compose) OR remove `transform`
from `animate` entirely.

**This hypothesis was wrong.**

## Actual Root Cause

The runtime gate (`tests/e2e/framer-hand-reorder-shape.spec.ts`) tested
four fix variants — every one produced the same instant snap when
`AnimatePresence mode="popLayout"` was on the parent:

| Variant | Snap shape |
|---|---|
| Split `x` / `scale` motion-value props | Instant 282px jump in 1 frame |
| Drop `x` / `scale` from `animate` entirely | Instant 282px jump in 1 frame |
| Outer `m.div` (layout-only) + inner `m.div` (visual transforms) | Instant 282px jump in 1 frame |
| Explicit `transition.layout: MOTION.snappy` (and `MOTION.deliberate`) | Instant 282px jump in 1 frame |

`onLayoutAnimationStart` / `onLayoutAnimationComplete` callbacks DID fire,
so Framer is running a layout animation — it just completes within one
rAF tick. The small ringing oscillation (~12px overshoot at t=300-450ms)
is the spring's residual; the main 282px shift is structural reflow,
**not** spring-interpolated.

The structural reason: `popLayout` removes the exiting card from the DOM's
layout flow inside Framer's render-cycle. By the time the projection node
measures pre-stage and post-stage positions, both measurements are in
adjacent rAF frames with no in-between for a spring to interpolate.

`animate.transform` was a red herring. The original `transform` string and
the four fix variants all produce identical traces.

### One real bug found in passing

The `dealComplete` toggle on the `layout` prop itself was load-bearing-
broken. With `layout={dealComplete ? 'position' : false}`, Framer skips
projection-node initialization on the false branch and the slot never
participates in layout animations even after `dealComplete` flips true.
`onLayoutAnimationStart` callbacks never fire. With `layout="position"`
always-on, callbacks fire (and the snap-with-residual-ringing happens).
This doesn't change the visible cinematic but does mean the original gate
wasn't running its intended motion at all.

We chose **not** to fix this in the same session because:
1. The user-visible behavior is identical (snap-fill either way).
2. The toggle's original intent was preventing layout animations during
   the deal-in stagger — a small concern that a future session can revisit
   alongside any actual change to the deal-in cinematic.
3. Touching it would change cinematics outside the scope of "test the
   hand-reorder shape," and the runtime gate now pins the behavior so a
   future change can't silently regress it.

## What Ships

- Hand.tsx is **unchanged**. The fast-snap is the intended cinematic;
  Briggsy hasn't perceived it as a problem (insight's own original
  acknowledgement: "Nobody's complained — the snap is fast enough that it
  reads as part of the staging exit motion").
- The runtime gate (`framer-hand-reorder-shape.spec.ts`) pins the fast-
  snap shape and detects the realistic regression risk: any change that
  slows the cinematic into a perceptible two-phase or laggy spring.
- Fault-injection canary paints a synthetic two-phase shape (smooth Phase
  1 → 350ms plateau → snap to final) and asserts both `timeToSettleMs`
  and `midPlateauMs` thresholds trip — proves the gate is sensitive to
  the actual regression we'd see if someone removed `mode="popLayout"`.

## Sensitivity Verified

Temporarily removing `mode="popLayout"` from `Hand.tsx` flips the gate red
with both:

- `timeToSettleMs measured 533ms; max 500ms`
- `midPlateauMs measured 333-350ms; max 150ms`

The two-phase shape it produces (smooth Phase 1 ~107px during card[0]'s
exit + late ~175px snap when card[0] is removed from DOM) is visually
WORSE than the current single fast-snap. So the gate also functions as
a deterrent against well-meaning future "cleanups" that drop `popLayout`
on the assumption the spring will run smoothly without it.

## Key Insight

**`popLayout` + `layout="position"` is a fast-snap by structure, not a
multi-frame spring.** Don't try to "fix" the snap by splitting `transform`
into `x`/`scale` props — they don't compose with layout-derived translate
in the way the first version of this insight assumed, and the snap
behavior survives every variation.

If a future session genuinely wants a multi-frame spring on hand-reorder,
the fix is structural: animate the slot's WIDTH or `flex-basis` during
exit so the layout footprint collapses gradually (not a transform mask).
That removes the need for `popLayout` entirely. But the bar is "is this
better than what users see today?" — and today's snap reads cleanly as
part of the staging cinematic.

- **Runtime gates kill speculation.** The first version of this insight
  shipped a hypothesis without the gate to test it. Four variants of the
  proposed fix produced identical traces; the empirical answer was "the
  hypothesis was wrong."
- **`onLayoutAnimationStart` / `onLayoutAnimationComplete` are the
  cheapest diagnostic tools available** for "is the layout animation
  even running?" Pipe browser console to test stdout via
  `page.on('console', ...)` and you have a 30-second sanity check.
- **Conditional `layout` props are footguns.** `layout={cond ? 'position' : false}`
  reads as "turn it on conditionally," but Framer skips projection-node
  setup on the falsy branch and never retrofits later. If you need to
  gate layout animation, gate the PARENT's mount or use a different
  mechanism — don't toggle `layout` on the same element.
- **Fault injection should target the ACTUAL regression risk, not a
  hypothesized bug.** The first canary in this gate painted an instant-
  jump synthetic — but the production code already produces that shape
  by design. The corrected canary paints a two-phase synthetic (the real
  regression risk if `popLayout` is removed), and now the gate is a
  meaningful deterrent.

## Also Applies To

- **`StagingArea.tsx`** uses the same `popLayout` + `layout="position"`
  pattern. Its reorder probably has the same fast-snap shape — not yet
  gated. Future gate slice candidate.
- **Any `AnimatePresence mode="popLayout"` + layout="position"`
  combination** in this codebase. The fast-snap is the rule, not the
  exception. Don't try to make these spring-smooth by tweaking
  `transition` props.
