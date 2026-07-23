---
title: A guard shipped on the sibling path indicts the unguarded primary — and a display gate must key on the quantity the surface DISPLAYS, not a correlated axis
date: 2026-07-22
phase: U16 recommendation surface (ultramode fold)
modules: [src/ui/recommendationView.ts, src/ui/money.ts]
tags: [held-out-split, seed-B, inversion, guard-asymmetry, sibling-sweep, display-gate, calm-but-wrong]
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
