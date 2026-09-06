---
title: A synthetic touch tap at an element's EXACT edge dispatches no pointerdown to it on a DPR-3 context, while elementFromPoint at the same coordinate returns the element — inset synthetic taps by 1 px
date: 2026-09-05
phase: Act 4 hardening (the chart-text gate)
modules: [e2e/chart-text.spec.ts, src/viz/ConfidenceBand.tsx]
tags: [playwright, touch, pointer-events, hit-testing, dpr, flake, lattice]
---

## Problem

The readout sweep taps lattice column 0 at `cap.x + 0` — the capture rect's exact left edge. On the 390 × 844 @3 arm the readout never rendered; on the 320 × 800 @2 arm the same tap pinned it. `document.elementFromPoint(cap.x, y)` in the page returned the capture rect on both arms.

## Root Cause

Measured with a fresh load per probe (a same-column re-tap dismisses, so no confound): on the @3 context a tap at 0, 0.34 and 0.5 px inside the edge produced no readout; 1 px and 2 px inside did. The browser's touch hit-test quantizes the touch point (device-pixel rounding, touch-area rounding) before dispatch, so a coordinate that `elementFromPoint` resolves to the element can still land the `pointerdown` on its neighbour. `elementFromPoint` is not the dispatch path.

## Fix

The sweep's x is clamped 1 px inside both ends: `Math.min(cap.right − 1, Math.max(cap.x + 1, …))`. The scrub snaps to the NEAREST lattice column, so columns 0 and 48 are still visited; only the touch lands on the rect.

## Key Insight

`elementFromPoint` proves what layout thinks is under a coordinate, not what a synthesized input event will hit after quantization. Never drive an oracle from an element's exact bounding edge; inset by a device pixel or more. When a touch arm fails only at one DPR, suspect the input path before the component.

## Also Applies To

- Any sweep across a capture surface (TwoFutures' scrub, the ladder's readout) at its first/last position.
- `page.mouse.move` to an exact edge is more forgiving but not guaranteed — same inset.
- Real fingers never land on an exact edge; this is a harness fact, not a product one — do not "fix" the component.
