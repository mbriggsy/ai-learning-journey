---
title: A copy string that promises an affordance is a UI contract — pair every promise verb with a rendered-control test in every state that shows the string
date: 2026-07-22
phase: U16 recommendation surface (ultramode fold)
modules: [src/ui/Result.tsx, src/ui/RecommendationSurface.tsx, src/ui/copy.ts]
tags: [copy-contract, affordance, stranded-state, stale, compute-error, blocked, dead-end, calm-but-wrong]
---

## Problem

Three independent fold lenses (architecture, reliability, adversary-temporal — 7/7
refuter votes RM) converged on one family: after a committed recommendation, any
draft edit demoted the solve channel to `stale`, whose note read "re-open it
whenever you'd like" — but `solveInvitable` fired only for idle/goal-unset and the
re-pick door rendered only on the `recommended` view, so NO control existed anywhere
that could re-open anything. Same family: `compute-error`'s "try again" with no
button, and `blocked{buckets-defaulted}` rendering literally NOTHING (a no-headroom
household that picked a goal watched the invite vanish into a silent blank).

## Root Cause

The copy and the gating were authored as separate concerns. The note-writer wrote
the honest next step ("re-open it"); the gate-writer enumerated the states that
START a flow (idle, goal-unset) — and nobody owned the conjunction "every state that
SHOWS this string also renders the control it promises." The payload-shape law
("a shape without a render is a broken state") was enforced for the committed arms
but the blocked/demoted arms slipped through as null-renders.

## Fix

(30b5ae85) `solveInvitable` broadened to stale + compute-error (the invite door
returns beside the note, wired to the same GoalPicker → dispatch path);
`blocked{buckets-defaulted}` renders a calm named-reason steer
(`recommendBucketsNote`); the rec surface route-gated so the promise never renders
where the feature doesn't exist (the date route). Tests: re-dispatch proven from
stale; blank-render mutant red.

## Key Insight

Copy that names an action the user can take is a CONTRACT, not prose — "re-open,"
"try again," "you can adjust" each assert a control exists. The test obligation is
the conjunction, per state: for every state that renders the string, assert the
promised control renders AND drives the promised transition. The sweep is
mechanical: grep copy.ts for promise verbs, map each key to the states that show
it, demand a control test per state. A silent null-render arm is the same defect
one step earlier — the state promises nothing and delivers nothing, which reads as
breakage to the user who just acted.

## Also Applies To

Every future solve-channel state (U17's re-entry copy explicitly promises
re-validation); the vault unlock/staleness notes; any "adjust it in your
assumptions" disclosure — each names a door that must exist on every surface the
sentence reaches.
