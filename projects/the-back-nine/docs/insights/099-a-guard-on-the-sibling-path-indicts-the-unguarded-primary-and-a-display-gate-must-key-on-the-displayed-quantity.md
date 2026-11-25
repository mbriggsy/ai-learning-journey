---
title: A guard shipped on the sibling path indicts the unguarded primary — and a display gate must key on the quantity the surface DISPLAYS, not a correlated axis
date: 2026-07-22
phase: U16 recommendation surface (ultramode fold)
modules: [src/ui/recommendationView.ts, src/ui/money.ts]
tags: [held-out-split, seed-B, inversion, guard-asymmetry, sibling-sweep, display-gate, calm-but-wrong, component-family, aria-disabled, aria-describedby, blocked-apply, state-style, said-once, message-key, message-lifetime, two-input-claim, editsKey, applied-message, action-items-tray]
---

## Problem

The U16 fold's strongest finding (three lenses converged independently; 8/8 refuter
votes RM): the primary delta hero rendered "keeps ~$X more than today's plan" via a
sign-stripping `formatDeltaDollar(|x|)` with NO check that the seed-A-crowned winner
actually displays AHEAD of the baseline at seed-B — while `runnerUpVizFor`, in the
same file, shipped exactly that guard (`winnerDisplaysAhead`) for the sibling
comparison. On a near-tie display inversion the hero would claim "$X more" while its
own viz drew the recommended bar SHORTER. The re-run boundary lens then found the
same shape one axis over: the active-hero gate checked `noChange` + `subTenthCollapse`
(a survival tenth) but never the goal-DOLLAR delta the hero displays, so a real
winner with a sub-$50 seed-B dollar edge rendered "Leaves about $0 more."

## Root Cause

Two instances of one law breaking. (1) The builder KNEW the inversion failure mode —
the sibling guard is the proof — but the knowledge stayed local to the path where it
was first noticed; nothing forced the sweep to every sibling renderer of the same
comparison. (2) The no-dollar gate was keyed to axes CORRELATED with the displayed
quantity (selection noChange, survival collapse), not to the displayed quantity
itself (the formatted goal-dollar delta), so every gate could pass while the string
the user reads was absurd.

## Fix

(30b5ae85) `winnerDisplaysAhead` mirrored onto the primary hero/viz/aria; a formatted
delta of '0' folds into the same `noDollar` routing (predicate = the REAL formatter's
output, never a re-typed threshold); inversion and zero-collapse both route to the
existing honest no-dollar register. Mutants: guard-drop and mirror-drop each red.

## Key Insight

A guard on one sibling path is an INDICTMENT of every unguarded sibling — it proves
the failure mode was known at build time, so the review question is never "is this
failure conceivable" but "grep every renderer of the same comparison for the same
guard." And a gate that protects a DISPLAYED claim must be keyed on the displayed
quantity itself (the formatter's own output), because correlated axes (survival vs
dollars, selection vs display) diverge exactly on the near-ties where honesty
matters most.

## Also Applies To

Any A-decides/B-displays surface (every future solver render); the fan/band renders
if a derived caption ever claims a direction; any place a `format*` result is
asserted positive by the surrounding copy — the "$0 more" class recurs wherever a
gate checks the model and the copy shows the formatter.

## Extended (2026-11-23): a style aimed at a component family must key on the rendered reason

The display-gate rule holds for a look as much as for a figure. A blocked-Apply look (the primary button styled as
"cannot commit") was written for the control sheets that block Apply for a stated reason, and aimed at the whole family
by `aria-disabled` alone. Two members arrive disabled for a different reason: `HealthcareSheet` opens with the picked
option equal to the applied one, and `RothLever` opens on an empty plan. Both got a loud "cannot commit" with no
sentence beside it, which is worse than a quiet disabled button. The look now keys on the rendered reason: the selector
requires `aria-describedby` as well (`.control-sheet__actions .btn-primary[aria-disabled='true'][aria-describedby]` in
`src/intake/controls.css`, whose comment reads "the look is earned by the words"). Key a family-wide state style on the
fact the user is being told, never on a state flag members reach for different reasons.

## Extended (2026-11-25, milestone 1 review round 3, b9-8): a said-once message must be keyed on every input its claim reads

The same rule governs how long a message stays up. After Apply, the Action Items tray said "Applied. Your plan now
holds these changes." and kept the words until their key moved. The key was the shown bundle alone. A new tray edit
moves only the pending edits, so the words stood beside an edit the plan did not hold, and they hid the true line,
"Your changes show once you press Refresh." The claim reads two inputs (what is shown, and that nothing waits beyond
it), and the key read one. Two of round 3's four lenses found it. Fixed in `31bf6d9e`: the key is the tray's `editsKey`,
the shown bundle plus the pending edits (`src/ui/screens/retirement/ActionItemsTray.tsx`), read on the render after the
press.

List what a message's sentence asserts, and key its lifetime on every input behind each assertion. A key on one of two
inputs makes the message true when written and false the moment the other input moves.
