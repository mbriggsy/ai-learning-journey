---
title: "`aria-disabled` changes who can see the state: jest-dom's `toBeEnabled` goes silently vacuous, a `:not(:disabled)` hover rule leaks the press-darken onto the blocked button, and Playwright 1.60 refuses to act on the control — three instruments, three failure directions, one attribute swap"
date: 2026-09-13
phase: Act 4 hardening (the four-faces Caddie walk, Card 14)
modules: [src/intake/GoalPicker.tsx, src/intake/SequencingControl.tsx, src/intake/controls.css, src/intake/intake.css, src/intake/__tests__/GoalPicker.test.tsx, src/intake/__tests__/sequencingControl.test.tsx, e2e/caddie-walk.spec.ts]
tags: [a11y, aria-disabled, jest-dom, css, playwright, harness, color-blind, caddie]
---

## Problem

The project's own law says a blocked control is `aria-disabled`, never native `disabled`, so it stays operable and can SAY why it is blocked (BudgetBuilder, RothLever, the passphrase step). Moving one more control onto that law — the goal picker's "See the strategy", told apart from a live primary by tint alone (Card 14) — looks like a one-attribute change. It is not: the swap changes which instruments can see the state, and each instrument fails in a different direction. jest-dom's `toBeDisabled()` reads the native property only, so it FAILS on an `aria-disabled` control (loud, fine) — but `toBeEnabled()` reads only the native property too, so it PASSES on any element that lacks it, blocked or not; every "enabled after the pick" arm that used it would have stayed green with the pick handler deleted. The hover rule was written as `.btn-primary:not(:disabled):hover { background: var(--brand-press) }` — "no press-darken on a disabled CTA" — and the instant the native attribute is gone, `:not(:disabled)` MATCHES the blocked button and hands it the brand darken: it begins to feel pressable, which is exactly what the rule exists to prevent, and no test can see it (jsdom loads no stylesheets; the new blocked rule's specificity only ties it). And Playwright 1.60's actionability waits for `enabled`, where `getAriaDisabled(element)` is `isNativelyDisabled(element) || hasExplicitAriaDisabled(element)` (coreBundle.js) — a control the harness has to REACH, a radio in a list an e2e walks by "first unchecked", would hang `.check()` and red `toBeChecked()` if it were disabled in place.

## Root Cause

`disabled` is one fact expressed through three channels — the DOM property, the CSS pseudo-class and the accessibility tree — and native `disabled` sets all three at once. `aria-disabled` sets only the third. Every consumer that was reading one of the other two keeps working on the OLD channel: jest-dom's matchers read the property, the stylesheet reads the pseudo-class, and Playwright reads the accessibility tree — the one consumer that DOES follow the swap, in the direction that blocks the harness. The swap is a contract change for every reader of the state, not a rename.

## Fix

Pin the state with the pair `toHaveAttribute('aria-disabled', 'true')` + `not.toBeDisabled()`, and the cleared state with `toHaveAttribute('aria-disabled', 'false')` — never `toBeEnabled()` on an `aria-disabled` control. Grep every `:not(:disabled)` the control's class can reach and widen it to `:not(:disabled):not([aria-disabled='true'])`; the hover leak is invisible to every gate but the eye. Decide per control which side of Playwright's fold it lives on: a control the harness must PRESS to speak its reason (a primary) may be `aria-disabled`; an option the harness must SELECT from a list must be HIDDEN when it does not apply, never disabled in place — and the household's own committed option must still be offered, tagged, or the sheet opens with no radio checked while the plan runs on it. The blocked LOOK must carry a non-hue channel the swap does not remove: the fill dropped for paper, a dashed hairline where a primary has no border, muted ink, and the reason rendered at rest as a `<span>` (a `<p>` would red the omitted-lead pins that count paragraphs in the dialog).

## Key Insight

A native attribute is a bundle; an ARIA attribute is one strand of it. When a law says "use the ARIA strand", every instrument that was reading a different strand — the matcher, the stylesheet, the harness — has to be re-pointed in the same change, and each one fails in its own direction: one goes vacuous, one leaks, one refuses. Grep the three channels before calling the swap a one-liner.

## Also Applies To

- Any `disabled` → `aria-disabled` move on a `.btn-primary` / `.btn-quiet` (the hover rule is global to the class).
- Any e2e that traverses options by state (`first unchecked`, `:not([aria-disabled])`) — hide the inapplicable option, tag the committed one.
- Any jest-dom battery that pins an enabled state with `toBeEnabled()` after an ARIA swap.
