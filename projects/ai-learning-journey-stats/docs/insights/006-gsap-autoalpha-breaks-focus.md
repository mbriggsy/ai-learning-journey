---
title: GSAP autoAlpha on a modal breaks child focusability — the focus trap silently never engages
date: 2026-05-26
phase: 5
modules: [src/components/Gallery/Gallery.tsx]
tags: [gsap, autoAlpha, visibility, focus-trap, accessibility, modal, lightbox, playwright]
---

## Problem

The Phase 5 Gallery lightbox opened and animated in correctly, but a Playwright check found
focus was NOT on the close button after opening (`focusOnClose: false`). The focus trap — which
relies on the close button holding focus — silently never engaged, so Tab/Esc handling and
focus-restore-on-close were all dead on arrival, with no error in the console.

## Root Cause

The overlay faded in with GSAP `autoAlpha`. **`autoAlpha` is opacity + `visibility`** — `autoAlpha: 0`
sets `visibility: hidden`. The reveal was structured as `gsap.fromTo(overlay, { autoAlpha: 0 }, …)`,
so on the first frame the overlay (and everything inside it) was `visibility: hidden`. The focus
effect ran right after that layout-effect set and called `closeButton.focus()` — but **a
`visibility: hidden` element is not focusable**, so `.focus()` was a silent no-op. The animation
then brought visibility back, but focus had already failed and was never retried.

## Fix

Animate the overlay with plain **`opacity`**, not `autoAlpha`:
```ts
gsap.fromTo(overlayRef.current, { opacity: 0 }, { opacity: 1, … })
```
The overlay is conditionally mounted (it only exists while open), so there's no need for
`visibility` toggling to keep it out of the tab order when closed — unmounting already does that.
Plain `opacity: 0` keeps the element visible-to-focus, so `closeButton.focus()` on mount works and
the trap engages.

## Key Insight

`autoAlpha` is the right default for scroll-reveals (it also pulls hidden elements out of the a11y
tree), but it is **wrong for any container you need to programmatically focus into on mount** —
`visibility: hidden` makes descendants unfocusable. When a modal/dialog/lightbox animates in AND
moves focus inside itself, fade it with `opacity`, never `autoAlpha`.

**Test corollary (caught the same bug, then nearly hid the fix):** a programmatic
`element.click()` does NOT move focus to the element — only a real mouse/keyboard activation does.
So a "focus restored to trigger on close" assertion will falsely FAIL after `.click()` alone
(prevFocus was `body`, not the trigger). Verify focus-restore with `el.focus(); el.click();` to
model a real user, or the test lies about a correct implementation.

## Also Applies To

- Any `role="dialog"` / popover / drawer that animates in and traps focus (the whole class).
- `gsap.set(el, { autoAlpha: 0 })` hidden states on anything containing a focus target.
- Playwright/jsdom interaction tests asserting on `document.activeElement` after a synthetic click.
- Inverse case still holds: KEEP `autoAlpha` for scroll-reveal blocks/tiles (insight 004 pattern) —
  there you WANT the hidden element out of the tab order until it reveals.
