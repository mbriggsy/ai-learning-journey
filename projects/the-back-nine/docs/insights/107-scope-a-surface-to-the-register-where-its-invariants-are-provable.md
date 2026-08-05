---
title: Five hard render problems, three of which had no branch to write — the register was the proof
date: 2026-08-05
phase: Act 4 — the recommendation surface (U16/U17 follow-on)
modules: [src/ui/recommendationView.ts, src/ui/RecommendationSurface.tsx, src/ui/money.ts]
tags: [design-panel, defensive-branching, invariants, render-register, unwitnessable-branch, scoping]
---

## Problem

A 16-agent design panel had found **five hard problems** with naming the winning strategy on the
committed recommendation surface, and judged no proposal shippable as written. Three of them read as
branch work:

1. the crowned conversion amount must round DOWN or it quotes a figure past the rail it was anchored
   under — but `SolveArm` carries no `anchoredRail`, so a renderer cannot tell a rail-anchored grid
   amount from the household's own unscreened figure;
2. the crowned WINDOW carries the same defect the start year was rejected for, and `years` has no upper
   bound anywhere (the codec checks integer ≥ 1; the lever field has no max);
3. `custom` must never render as `leverPolicyCustom` ("My own order") — a first-person radio caption
   inside a card whose whole job is naming the order — so it needs a bucket-list branch.

Each invited a defensive branch, and (3) invited a THIRD ui bucket-label map (the intake one is
module-private; `reentryChrome.ts`'s points at different strings). No dev seed produces a `custom`
winner, so that branch would have shipped unwitnessable.

## Root Cause

The problems were stated against "the card", but the card renders in two registers and **the
invariants differ between them.** The surface's own mode predicate already encodes it:

`ACTIVE ⇒ noDollar false ⇒ payload.noChange false ⇒ sameDecumulationPlan(winner, userBaseline) false`
⇒ **the crowned plan is provably not the household's own** ⇒ the winner is a GRID arm.

Every grid amount is rail-floored, every grid window is horizon-clamped at offset 0, and `custom` is
excluded from `SEARCHED_POLICIES` — so the only custom candidate is the injected user baseline, and
crowning THAT makes `sameDecumulationPlan` compare it with itself, which lands in no-change. All three
problems are properties of the no-change register leaking into a card specified register-blind.

## Fix

Scoped the card to ACTIVE and wrote the three-step proof on the composer. Problems 1–3 need no branch:
the flooring dialect is unconditionally safe there, the window is clamped there, and `custom` is
unreachable there. The `custom` guard still ships as a fail-closed `return undefined` — belt to the
proof's braces — with a test pinning the reasoning rather than the behaviour of a live path.

What the register does NOT cover got its own dialect instead of a branch: the household's own entered
figure is quoted by a new `formatEnteredDollar` (exact), because flooring a number they typed is a
misquote. The dialects split by PROVENANCE — a figure we propose floors, a figure they entered does not.

## Key Insight

**When a spec lists N defensive branches, check whether one of them is a register you could scope to.**
A render surface usually has a mode predicate already; if the invariants you need are theorems in one
mode and merely hopes in another, scoping is not a scope CUT — it is the proof, and it deletes branches
instead of testing them.

The tell that you are in this situation: a branch you cannot witness. Here, no seed could produce a
`custom` winner — which was not an inconvenience to route around but the **evidence** that the branch
was unreachable in the register being built. An unwitnessable branch is either dead code or a missing
proof; treat it as a question about scope before writing it.

The residue matters too: name what the scoping did NOT cover, in the queue, with the reason. The
no-change register still does not name the plan, and that is filed as an increment with its blocker
stated (mint the custom-winner seed first) rather than left as an implied gap.

## Also Applies To

- Any view model with a mode/register union (`RecommendationView`, the date-route vs spine split) where
  a new field's safety argument differs per arm.
- Formatter selection generally: `formatActionableDollar` vs `formatEnteredDollar` is the same shape —
  the safe choice depends on PROVENANCE, and provenance is often decidable from the register even when
  the payload does not carry a flag for it (insight 020's "a guard gated on its first consumer").
- Solver-adjacent copy: whenever a sentence's truth depends on `noChange`, remember `mode` is NOT
  `noChange` — it also fires on a seed-B display inversion and a $0 delta collapse.
