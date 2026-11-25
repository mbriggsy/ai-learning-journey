---
title: A process rule the pilot writes into a plan is not a ruling, and nothing re-checks it — tag every process rule with who ruled it, and trace a costly habit to its source before obeying it
date: 2026-11-22
phase: The RightCapital mandate (the test-cadence ruling, 2026-11-22)
modules: [docs/plans/, CLAUDE.md, .github/workflows/]
tags: [process, rulings, who-ruled, habit, test-cadence, ci, plan-rules, provenance, briggsy-good, owner-call, design-ceiling, open-question, plain-numbers, ruling-scope, refuter-split, queue-approval, tier-sweep, put-to-briggsy, only-when-asked, you-make-the-call, asking-direction]
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

## Extended (2026-11-23): refuters who split on whether a ruling exists have found a call that is still his

In the 2026-10-31 register-wide tier sweep, two refuters judging the same entries split on authority, not on facts.
One read D7 plus his "yep, seems right" on the queue as ruling the entries' dependents; the other read a queue approval
as ruling the ORDER only. Neither side could be proven from the record, because the record never said. Asked in plain
words, he ruled in one answer and both entries moved. When readers disagree about whether a ruling covers a case, that
disagreement is the finding: the call is still his, so ask; never pick the side that lets the work go on.

## Extended (2026-11-23, gap 2's re-check, b9-3): "put to Briggsy" written by the pilot is not his ruling either

The same rule runs in the asking direction. A plan carried lines that said a call would be "put to Briggsy", and a
harness carried "start it again only when asked". Both were written by the pilot, and both pulled the pilot into
stopping to ask him about calls that were the pilot's own. His answer: "You're smarter than me, you make the call"
(memory `feedback-act-on-confident-resolutions`; the workbench plan's 2026-11-23 amendment records it). A line telling
the pilot to ask is a process rule like any other: its author is who wrote it, not the person it names. The calls that
stay his are his dated rulings and the classes he keeps (money, public, irreversible, policy, low confidence, and a
real split on whether a ruling covers the case, above); everything else the pilot decides and records.
