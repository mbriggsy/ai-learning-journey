---
title: A guard put in one host misses every sibling built on the same primitive — RC14 put the refused-text guard in the profile drawers and the tray's buttons, and the tray's line drawer on the kit Drawer saved a through-year "2.5" as a lifelong line again; put the guard in the primitive, and keep the primitive's own behaviour
date: 2026-11-26
phase: Act 6 milestone 3's whole-file review, rounds 1 to 3 (b9-4, b9-5, 2026-11-26)
modules: [src/ui/kit/Drawer.tsx, src/ui/kit/NumberInputs.tsx, src/ui/screens/profile/drawers/ProfileDrawer.tsx, src/ui/screens/retirement/ActionItemsTray.tsx]
tags: [guard, primitive, kit, host, sibling, refused-text, data-typed-refused, save, blur-commit, focus, portal, calm-but-wrong, single-home]
---

## Problem

RC14 (`c43d7a50`) found that a drawer's Save ran past a box holding text it had refused, so a through-year typed "2.5"
was saved as a lifelong budget line under its own error. It guarded the profile drawers' frame (`ProfileDrawer.tsx`)
and the tray's Refresh and Apply. Milestone 3's round 1 (`4be1d777`) found the same "2.5" saved again through the tray's
line drawer, which is portalled and built straight on the kit `Drawer`, not on ProfileDrawer.

## Root Cause

The fact the guard needs (this box refused its text) is known by the kit's number input, and the action it guards (Save)
lives in the kit's Drawer. The guard was written in the hosts that RC14 happened to be fixing, one layer above the
primitive, so every host built on the primitive without that wrapper skipped it. Nothing listed the siblings.

## Fix

Round 1 put the guard in the primitive: the kit Drawer's Save blurs a focused box inside the drawer (so a typed figure
commits), then, while any box carries `data-typed-refused` (set by the kit's number input in the blur's own task),
calls no `onSave` and moves focus to that box. Round 2 kept the primitive's own behaviour: the first version blurred
Save itself, so the guard now blurs only a focused element other than the pressed button. Round 3 checked the other half
of the contract: every caller's `onSave` reads its values through a ref (`edit.read()`, the line drawer's `lineRef`), so
the commit made by that blur reaches the same press.

## Key Insight

Put a guard where the fact and the action meet, which is usually the shared primitive, not the host you are fixing.
When a guard must live in a host, grep every other host of the same primitive in the same commit. A guard moved into a
primitive changes it for every caller: check that it keeps the primitive's existing behaviour (focus, scroll, events),
and that each caller reads its state in a way the guard's side effects reach.

## Also Applies To

- [[144]]: a mark that vouches for a fact must live in the component that sees the fact.
- Any kit control with a cross-cutting rule: a dialog's leave ask, a list's empty state, a number box's refusal words.
- [[149]]: the blur-in-press order this guard depends on.
