---
title: A process rule the pilot writes into a plan is not a ruling, and nothing re-checks it — tag every process rule with who ruled it, and trace a costly habit to its source before obeying it
date: 2026-11-22
phase: The RightCapital mandate (the test-cadence ruling, 2026-11-22)
modules: [docs/plans/, CLAUDE.md, .github/workflows/]
tags: [process, rulings, who-ruled, habit, test-cadence, ci, plan-rules, provenance, briggsy-good, owner-call, design-ceiling, open-question, plain-numbers]
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

## Extended (2026-11-21, the frames-outside plan): the other direction, his calls written in as the pilot's

The same confusion runs both ways. **A decision that is his, folded as "the pilot's reading, not waited on":** the
plan's check returned two of Briggsy's calls (does the design ceiling cover the income step-down; which 20-character
name the gate measures), and both went in as pilot readings; two of three blind readers graded the plan `misleads`.
His answer then gated the unit that leaned on it, and one question dialog got both answers in minutes. **A product
bound ruled by councils before anyone asked whose household it was for:** two councils set a fit bound at the
engine's largest number; he overrode it in one message ("we don't need to solve for extremes"), once the absurd member
was in front of him in plain numbers ($83 billion a month). A reading that changes a class's axis, or a bound on what
the app must hold, is a question for him, never an assumption, and it goes to him in plain numbers.
