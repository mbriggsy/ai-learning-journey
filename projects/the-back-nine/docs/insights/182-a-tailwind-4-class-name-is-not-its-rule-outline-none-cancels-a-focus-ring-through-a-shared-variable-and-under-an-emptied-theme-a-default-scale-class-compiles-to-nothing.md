---
title: A Tailwind 4 class name is not its rule — `outline-none` cancels `focus:outline-2` through a shared variable, so three controls had no keyboard focus ring for two units, and under theme.css's `--*: initial` ten default-scale classes (`animate-spin`, `rounded-tl-2xl`, `max-w-2xl` …) compiled to nothing, so the loader never turned and Blueprint's corners drew square; check the computed style or the built CSS, never the class list
date: 2026-11-26
phase: Act 6 milestone 4's whole-file review (b9-8, round 1)
modules: [src/ui/styles/theme.css, src/ui/kit/TextInput.tsx, src/ui/kit/VaultCard.tsx, src/ui/screens/]
tags: [tailwind, tailwind-4, outline-none, outline-hidden, focus-ring, focus-visible, keyboard, a11y, tw-outline-style, css-variable, theme-reset, initial, default-scale, dead-class, animate-spin, rounded, built-css, computed-style, screenshot-blind, silent-no-op]
---

## Problem

Milestone 4's review found two sets of classes that drew nothing, both in screens shipped since early Act 6 under
every test and every look shot.

- **No focus ring.** The kit's text input, the vault's passphrase box and the export textarea carried
  `outline-none focus:outline-2 …`. Tabbing into them showed no ring at all, from RC13a and RC19 on. The screenshots
  never showed it: a shot is taken with nothing focused.
- **Dead default-scale classes.** Ten classes in the screens (`max-w-2xl`, `leading-tight`, `font-mono`, `ease-out`,
  `rounded-tl-2xl`, `animate-spin` among them) produced no CSS. Tax Strategies' "working it out" loader never turned,
  and Blueprint's top corners drew square: a filed "known" item whose cause nobody had found.

## Root Cause

- **The outline pair.** In Tailwind 4, `outline-none` sets `--tw-outline-style: none` as well as `outline-style: none`,
  and `focus:outline-2` sets `outline-style: var(--tw-outline-style)` with the width. On the same element the variable
  wins, so on focus the style resolves to `none` and the 2 px ring has no style to draw with. `outline-hidden` sets the
  same variable (read in `tailwindcss@4.3.5`'s `dist/lib.js`), so swapping to it, the review seat's first fix, changes
  nothing.
- **The emptied theme.** `src/ui/styles/theme.css` opens its `@theme` with `--*: initial`, so Tailwind's default scales
  (spacing steps, radii, leading, fonts, easings, animations) are gone and only the role-named tokens exist. The
  scanner still treats `rounded-tl-2xl` as a candidate, but with no `--radius-2xl` there is nothing to emit, and
  nothing warns.

Both have the same shape: the class list reads correctly, the build passes, and the rule in the browser is not the one
the name promises.

## Fix

`af889009`: `outline-none` deleted wherever a `focus:outline-*` follows (`TextInput.tsx` and `VaultCard.tsx` carry a
comment saying why). The dead default-scale words were deleted where the reviewed look did not need them. Where it did,
they got role tokens: `--animate-spin` for the loader, and `--radius-card` for the corners through `rounded-*-card`.

## Key Insight

In Tailwind 4 a class is a set of declarations and CSS variables, and two classes can meet through a variable that
neither name mentions. Under a theme that resets the defaults, a default-scale class is a silent no-op. Neither shows
up in a class-list review, a type check or a screenshot. Check a focus ring by the computed `outline-style` of a
focused element in a real browser. Check that any class you rely on exists by grepping the built CSS for its rule.
Here, a scale class ships only through a role token defined in theme.css.

## Also Applies To

- Other Tailwind 4 families built on `--tw-*` variables (rings and shadows, borders, transforms, filters) have not been
  checked here: before pairing a reset class with a state class in one of them, read both rules in `dist/lib.js` or
  check the focused or hovered element's computed style.
- Any new screen class copied from Tailwind's docs or another project: under `--*: initial`, check it exists before it
  carries a look.
- Focus-visible states in general: the look instrument and fit arms shoot unfocused frames, so a missing ring needs its
  own computed-style check.
