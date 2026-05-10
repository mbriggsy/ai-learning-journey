---
title: "Framer-managed transforms lose the CSS cascade war — can't layer CSS `:active` on the same element"
date: 2026-04-23
modules: [src/client/player/Hand, src/client/board/PlayerStrip]
tags: [framer-motion, css-cascade, active, transform, press-feedback]
---

## Problem

Added `:active { scale(0.97) }` to Framer-animated Hand `.slot` and PlayerStrip
`.tile`. Scale never applied on press. No errors, no DevTools warning. The
`:active` rule matched in the Styles panel but computed `transform` came from
Framer's inline style.

## Root Cause

Framer writes `transform` as an **inline style** on the animating element every
frame. In CSS cascade specificity, inline styles beat pseudo-class rules from
stylesheets. `:active { transform }` needed `!important` to win — correctness-
adjacent violence we don't want. So Framer's inline value wins every frame.

## Fix

Apply press feedback to the **inner element, not the Framer-animated one**. In
Hand: press feedback on `MinimalCard` inside the slot. In PlayerStrip: active-
tile lift is CSS on `.tile[data-active]`; Framer only owns opacity on entry.
Framer and CSS never race for the same transform on the same element.

## Key Insight

**One source of truth per CSS property per element.** If a JS motion library
controls `transform` on element X, CSS can't layer additional transforms on
element X via pseudo-classes. Clean division: library owns entry/exit +
continuous animations; CSS owns hover/active/focus on a child or sibling.

When a motion library is involved, design the element hierarchy so
**interactive states live on a child of the animated element**.

## Also Applies To

- GSAP, React Spring, Motion One — any library writing inline transforms has
  the same cascade behavior.
- Same rule for `opacity`/`filter`/`scale` driven by the library: layer CSS
  hover/active on a child.
- Debug tip: if `:active` doesn't apply and there's an animation on the same
  element, DevTools' Computed panel shows the inline winner. Styles panel
  won't show `:active` as struck — it's matched but losing.
