---
title: Unlayered CSS modules silently override layered ones
date: 2026-04-12
phase: Phase 3 — Board View Migration
modules: [src/client/board/*.module.css, src/client/shared/*.module.css]
tags: [css, @layer, cascade, specificity, silent-failure, css-modules]
---

## Problem

Phase 3's initial plan draft provided full CSS rewrites for all 14 board + cross-view files. None of them included `@layer components { ... }` wrapping. Phase 1 had established a layer order (`@layer primitives, semantics, semantics-phone, semantics-board, components, overrides;`), and Phase 2 had wrapped all phone CSS modules in `@layer components`. But the Phase 3 rewrites were unlayered.

No CSS parser error. No build warning. No test failure. The files would have deployed and *worked* — until a Phase 1/2 component token and a Phase 3 declaration targeted the same property, at which point the unlayered Phase 3 rule would silently win, regardless of the intended cascade order.

## Root Cause

CSS `@layer` cascade priority is: **unlayered styles always beat layered styles**, regardless of specificity or source order. This is the opposite of the intuition that "layers add specificity." A `.module.css` file that omits `@layer components { ... }` isn't "in the default layer" — it's *outside all layers*, which is the highest cascade priority.

The failure mode is silent because both declarations are valid CSS. The browser picks the winner by cascade rules, not by error detection. DevTools shows the winning declaration but doesn't flag *why* it won — you'd need to know the layer system exists to notice the mismatch.

## Fix

Added `@layer components { ... }` wrapping to all 14 Phase 3 CSS module files. `fonts-mono.css` (a `@font-face` declaration, not a module) stays outside layers, matching Phase 2's `player-hardening.css` exemption.

The deepening pass caught this by cross-referencing Phase 1 §2.11 (layer order) and Phase 2 deepening item #3 (wrapping requirement) against the Phase 3 draft output. Added as universal rule #13 in §2.2.

## Key Insight

**When a codebase uses `@layer`, every new CSS file is a cascade bomb until it declares its layer.** Unlayered CSS isn't "neutral" — it's *maximally specific* in the cascade. The failure is silent: no parse error, no build error, no visual regression until two rules collide on the same property. The fix is mechanical (wrap in `@layer`), but the detection requires knowing the layer system exists. Any plan that generates CSS for a layered codebase must include layer wrapping as a structural requirement, not an afterthought.

## Also Applies To

- Any CSS-in-JS extraction that outputs unlayered stylesheets into a `@layer`-using project
- Third-party CSS libraries imported without `@layer` wrapping (e.g., `@import url(...) layer(vendor)`)
- PostCSS or Tailwind plugins that generate CSS outside the project's layer structure
- Future phases of any multi-phase CSS migration where each phase's files must participate in the same layer stack
