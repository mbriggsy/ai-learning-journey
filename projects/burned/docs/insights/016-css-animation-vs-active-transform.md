---
title: "Continuous CSS animations override `:active { transform }` every frame — must `animation: none` in `:active`"
date: 2026-04-23
modules: [src/client/player/SmartActionBox]
tags: [css, animation, active, transform, press-feedback, keyframes]
---

## Problem

SmartActionBox has three continuous `@keyframes` animations (`breathe`,
`breatheIntense`, `interceptPulse`) writing `transform: scale(1 → 1.01/1.03)`.
Added `:active { transform: scale(0.97) }` for press feedback. Press felt inert.
DevTools mid-press: `:active` rule matched, not struck. Computed transform came
from the active animation frame, not the pseudo-class.

## Root Cause

CSS animations write `transform` on every composited frame. Animation frames
apply above static pseudo-class values for the same property. `:active` scale
briefly "wins" at press instant, but the next animation frame (~16ms) overwrites.

Not the same as insight 015 (inline vs pseudo). Here both are CSS rules — but
animation frames beat static pseudo-class values.

## Fix

`:active` must **suspend the animation** while applying the override:

```css
.btn:not(:disabled):not([aria-disabled="true"]):active {
  animation: none;
  transform: scale(0.97);
}
```

On release, animation restarts from frame 0. Brief jump back to starting scale —
press/release is fast enough that it reads as snap-back, not a glitch.

## Key Insight

**If an element has a continuous `@keyframes` animation on a property, any
`:active`/`:hover` override on that same property must also zero the animation.**
Otherwise the animation wins the frame-by-frame race.

Animations and pseudo-classes are additive at the property level only when they
target different properties. Same property = animation wins unless suspended.

## Also Applies To

- Pulsing "primary action" buttons needing press/hover states.
- Loading spinners with `animation: rotate` needing an interaction state.
- `opacity` animations with `:active { opacity: N }` — suspend in `:active`.
- Different-property case is safe: `animation: pulse` on `transform` + `:active
  { filter: brightness(1.1) }` doesn't conflict — different properties.
