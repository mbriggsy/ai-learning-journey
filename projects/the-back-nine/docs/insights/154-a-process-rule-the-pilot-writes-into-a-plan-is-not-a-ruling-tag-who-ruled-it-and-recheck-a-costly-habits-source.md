---
title: A process rule the pilot writes into a plan is not a ruling, and nothing re-checks it — tag every process rule with who ruled it, and trace a costly habit to its source before obeying it
date: 2026-11-22
phase: The RightCapital mandate (the test-cadence ruling, 2026-11-22)
modules: [docs/plans/, CLAUDE.md, .github/workflows/]
tags: [process, rulings, who-ruled, habit, test-cadence, ci, plan-rules, provenance, briggsy-good]
---

## Problem

Every session ran CI's own whole list locally, serially, before every push: about 16 minutes a commit, and CI then
repeated it exactly. In three months of CI reds no local whole-list rerun caught a product bug the targeted runs
missed. It went on until Briggsy asked why the commits were so slow.

## Root Cause

The rule came from one line in the frames-outside plan ("CI's own list, serially, before every push", `e472aaa8`,
2026-11-21), written by the pilot alone. Once in a plan it read like a ruling, and each later session obeyed it. Nothing
re-checks a plan's process lines the way a review re-checks code, and Briggsy's own rulings pointed the other way
(finishing is part of good; no gate that catches nothing). The constraint it answered had a structural fix: CI's one
serial chain was split into parallel jobs.

## Fix

Briggsy ruled the cadence (CLAUDE.md, *Test cadence*, 2026-11-22: CI is the one full check; before a push, only
typecheck, lint, the doc gate when docs move, and the reached test files), and CI's chain was split so a cheap red no
longer stops the fit readings.

## Key Insight

A rule's authority is its author, not the document it sits in. Tag every process rule with who ruled it (his dated
ruling, a council, or the pilot), and before obeying a habit that costs real time, trace it to its source. A
pilot-written rule is a default the pilot may change, and the cheapest fix is often structural, not a stricter habit.

## Also Applies To

- Gates and checks a plan adds "for safety" that no incident ever motivated.
- A skill or CLAUDE.md line whose "why" is gone: our setup is ours to fix in the same pass (memory
  `feedback-our-setup-is-ours`); only his dated rulings need his say.
- A council's process recommendation folded into a plan without his ruling.
