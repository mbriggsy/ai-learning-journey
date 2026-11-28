---
title: A guard put in one host misses every sibling built on the same primitive — RC14 put the refused-text guard in the profile drawers and the tray's buttons, and the tray's line drawer on the kit Drawer saved a through-year "2.5" as a lifelong line again; put the guard in the primitive, and keep the primitive's own behaviour
date: 2026-11-26
phase: Act 6 milestone 3's whole-file review, rounds 1 to 3 (b9-4, b9-5, 2026-11-26)
modules: [src/ui/kit/Drawer.tsx, src/ui/kit/NumberInputs.tsx, src/ui/screens/profile/drawers/ProfileDrawer.tsx, src/ui/screens/retirement/ActionItemsTray.tsx]
tags: [guard, primitive, kit, host, sibling, refused-text, data-typed-refused, save, blur-commit, focus, portal, calm-but-wrong, single-home, grid-column-floor, minmax, min-content, break-words, word-split, seam-1088, action-items-tray, Range, hand-down, prop, stepper-re-walk, saved-plan, every-caller, balancesYearFor]
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

## Extended (2026-11-27, b9-9's U17 look and the kit tray fix `09f3954d`): a shared grid's column floors decide where words break, and two sizes can miss it

U17's pace picker, sized to its longest choice ("Even amounts, ending in a year you pick"), widened the tray's shared
`auto` control column until "Roth conversion / s" broke at 1440. Capping the picker hid that at 1440 and on the phone,
but at 1088, where both column groups sit side by side, the kit's own `minmax(6rem, 1fr)` names column under
`break-words` broke "Withdrawal" and "conversions" on households with no inherited IRA at all, and the control cell's
`min-w-0` let every picker run about 25 px into the compared column. The fix went into the primitive, as this insight
says: `minmax(min-content, 1fr)`, and `min-width: auto` from the `wide` tier.

What it adds: in a grid every row shares, one host's widest control sets every row's floor, so a fault can surface on a
household that has none of the new rows. The check that sees it reads each word through a `Range` and flags a word whose
boxes sit on two lines; no overflow or clip audit does. Measure a new row at the seam where the layout changes, not
only at the two named sizes.

## Extended (2026-11-28, b9-7, the gift half's review, round 1, `11fa931f`): a hand-down to one host misses every other host that renders its consumer

U4 handed the year the balances were last saved ([[193]]) to the shell's Income page, Blueprint and the drawers. The
stepper's re-walk (from Settings, or the re-entry gate's Update) renders the same `incomeView` and drawer host on a
saved plan, with nothing handed down, so it read the draft's load-time `savedAt`. After a re-save in a later year a gift
there lost its counts-twice note and R17 its refusal: rosy, found by 4 of 11 lenses. The gift fields' header
(`src/ui/screens/profile/drawers/oneTimeFields.ts`) named the stepper only as "the first-run stepper, before any save",
which hid the saved-plan case ([[158]]: a docstring's
"only before" is a premise a new host can break). Round 1 handed the frame to the Stepper too (`Stepper.tsx`), and round
2 pinned each hand-off ([[191]]'s 2026-11-28 extension).

What it adds: a value handed down as a prop is a guard's input, and the same rule holds. Before calling a hand-down
done, grep every caller of the consumer (the view, the drawer host) and ask which of them can run on a saved plan.
