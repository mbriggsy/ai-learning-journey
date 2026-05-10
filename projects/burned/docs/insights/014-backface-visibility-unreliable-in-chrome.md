---
title: "`backface-visibility: hidden` breaks when Chrome collapses `rotateY(0deg)` to a 2D identity matrix"
date: 2026-04-23
modules: [src/client/board/DramaOverlay, src/client/shared/motion]
tags: [css, 3d-transform, backface-visibility, rotateY, chrome, card-flip, framer-motion]
---

## Problem

Card-flip animation: two stacked faces, parent rotates `rotateY 0 → 180`, each
face uses `backface-visibility: hidden` so only the front-facing face should
render. Works in Firefox and Safari. In Chrome, both faces ghost through each
other at the endpoints — especially at `rotateY === 0` the back of the face-up
card bleeds through, and vice versa at 180°.

## Root Cause

Chrome's compositor optimizes transforms. When `rotateY(0deg)` resolves to
identity, Chrome collapses the child's transform matrix to **2D identity**, not
3D identity. Backface culling requires a 3D rendering context; once collapsed
to 2D, `backface-visibility: hidden` has nothing to cull against.

`translateZ(0.0001px)` and `transform-style: preserve-3d` on the faces do not
reliably prevent the collapse. Firefox and Safari preserve 3D context more
aggressively and happen to work.

## Fix

Drop `backface-visibility` entirely. Use **opacity crossfade at the edge-on
midpoint**: both faces render continuously; `face-down` opacity 1 → 0 at
`rotateY >= 90°`, `face-up` 0 → 1 at the same threshold. The switch happens
when the card is edge-on (visible area ≈ zero), so it's imperceptible.

## Key Insight

**CSS 3D-only features silently degrade when a browser flattens the transform
matrix to 2D.** Browsers are free to optimize any 3D transform that resolves
to identity-or-2D, and the spec doesn't require 3D context to be preserved.
Don't trust backface culling as a correctness primitive — treat it as a hint.

If an animation's correctness depends on "this element is rotated X° and
therefore invisible," use an explicit visibility mechanism (opacity, display)
keyed to the rotation angle, not a 3D-rendering side effect.

## Also Applies To

- Any card-flip, book-page-turn, tile-reveal using `rotateY`/`rotateX`.
- Framer Motion's `rotateY` animations — the framework doesn't protect against
  this.
- `transform-style: preserve-3d` on ancestors is NOT sufficient when the
  animated element itself resolves to a 2D transform at any frame.
- Debug tip: Chrome DevTools "Layers" panel shows 3D rendering contexts. If
  your face isn't in its own layer, backface culling is not guaranteed.
