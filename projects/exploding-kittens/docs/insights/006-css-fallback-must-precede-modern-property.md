---
title: CSS fallback declarations must precede the modern property, not follow it
date: 2026-04-06
phase: 6
modules: [src/client/player/player-hardening.css]
tags: [css, svh, dvh, viewport, mobile, cascade]
---

## Problem

Phone layout used `100vh` instead of `100svh` despite the hardening CSS explicitly declaring `100svh`. The iOS address bar animation caused layout jank — the exact problem `svh` was supposed to fix. The `svh` strategy was silently dead.

## Root Cause

The CSS declarations were in the wrong order:

```css
height: 100svh;
height: 100vh; /* fallback for older browsers */
```

CSS cascade: later declarations override earlier ones. `100vh` overwrites `100svh` in **all** browsers, including those that support `svh`. The fallback was killing the feature it was supposed to fall back from.

## Fix

Swap the order — fallback first, modern property second:

```css
height: 100vh; /* fallback */
height: 100svh;
```

Browsers that don't understand `svh` ignore line 2 and keep `100vh`. Browsers that do understand it apply `100svh`, overriding `100vh`.

## Key Insight

**CSS progressive enhancement requires fallback-then-feature ordering.** This is the opposite of how you'd write it in prose ("use svh, but fall back to vh"). The mental model "fallback = safety net after the real thing" produces the exact wrong order. The correct mental model is "start with what everything understands, then upgrade."

This is invisible in dev tools — both properties parse successfully, no warnings, no errors. The only signal is the wrong runtime behavior on the exact devices you're trying to fix.

## Also Applies To

- `color-mix()` with a solid color fallback
- `container` queries with `@media` fallback
- Any `@supports`-free progressive enhancement where two declarations target the same property
- `gap` in flexbox (Safari 14.0 doesn't support it) with `margin` fallback
