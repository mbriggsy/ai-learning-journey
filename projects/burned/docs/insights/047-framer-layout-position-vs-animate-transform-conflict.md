---
title: Framer `layout="position"` + explicit `animate.transform` silently fights itself
date: 2026-05-05
modules: [src/client/player/Hand.tsx, src/client/shared/MinimalCard.tsx]
tags: [framer-motion, animation, layout, transform, runtime-gate]
---

## Problem

Building a runtime gate for the Hand-reorder cinematic. When a card stages
out, the remaining cards' `layout="position"` should animate them into the
gap. Sampling card[1]'s `getBoundingClientRect().left` per rAF showed the
position jumping from old to new in **one frame** (single 16ms tick), with
no smooth interpolation. Earlier "passing" tests turned out to be sampler
bugs (data-test-attribute selectors stripped on React re-renders) — the
real cinematic was instant the whole time.

## Root Cause

The Hand slot has both `layout="position"` AND an explicit `animate.transform`:

```tsx
<m.div
  layout={dealComplete ? 'position' : false}
  animate={{ opacity: 1, transform: 'translateX(0px) scale(1)' }}
  exit={{ opacity: 0, transform: 'scale(0.7)' }}
  transition={MOTION.snappy}
>
```

`layout="position"` works by measuring before/after positions, computing a
delta, and animating `transform` from `translate(delta)` back to `translate(0)`.
The explicit `animate.transform` sets `transform: translateX(0px) scale(1)`
every render, clobbering the layout-derived value. Net result: layout
position changes immediately; transform is always at the resting state;
no visible animation.

Framer's docs acknowledge this: *"If the explicitly-defined animate prop
is not the same as `layout` props, both can run together."* Sharing
`transform` means they don't compose — the explicit value wins silently.

## Fix

None applied this session. The conflict has shipped in production since
`Hand.tsx` was authored. User-facing experience: card flies to staging
cleanly, remaining cards snap to fill the gap. Nobody's complained — the
snap is fast enough that it reads as part of the staging exit motion.

If you want the layout animation to actually run, **split the explicit
transform into separate `x` and `scale` motion-value props** (which
compose with layout-derived transform via Framer's animator) OR remove
`transform` from `animate` entirely and let the resting transform stay 0.

## Key Insight

**`layout` and explicit `animate.transform` share one CSS property —
the explicit value silently wins.** No error, no warning, no visible
failure — just an animation that doesn't run. Easy to ship without
noticing because nothing fails loudly.

When auditing or building runtime gates for layout animations, sample
the visible position per rAF and verify motion is **multi-frame**.
Shape-derivation must include both a `min-duration` floor AND a
`mid-transit-frames` floor — a max-only `settle-time` check passes
both a real spring AND an instant jump. The framer-bottom-sheet and
framer-status-strip gates assert min duration ≥ 150ms and mid-transit
frames ≥ 10 specifically because of this finding.

## Also Applies To

- Any Framer cinematic combining `layout` / `layoutId` with an explicit
  `animate.transform` on the same element. Audit StagingArea, DiscardFan,
  PlayerStrip — anywhere FLIP-style position animations and explicit
  transforms coexist.
- Runtime gates for layout animations — single-frame jumps must be
  detected as failures, not as fast successes.
- The same conflict shape exists for `filter`, `opacity`, `x`, `y`, etc.
  if `layout` is configured to animate them. Whichever property is
  explicitly set in `animate` wins.
