---
title: Thirteen times the helpers bought a plan that lost; the faults that decided the trial were found by a few close reads of the code and of the whole plan, not by more reviewers
date: 2026-11-12
phase: the plan-step trial (ce-plan against ultramode-plan on the Back Nine's early-withdrawal charge)
modules: [playbook/README.md, projects/the-back-nine/docs/plans/features/early-withdrawal-charge-build-spec.md]
tags: [plan-step, trial, ce-plan, ultramode-plan, helpers, cost, weekly-meter, review-volume, close-read, blind-readers, builder, rules, owner, lenses, research, code-reading, findings-count]
---

## Problem

The trial gave one job, the Back Nine's 10% early-withdrawal charge, to two plan steps:
- `ultramode-plan`: 2 sessions, 367 helpers, about 47.3M helper tokens and about 16 weekly-meter points. Its check confirmed 69 findings over two rounds and folded 77 (`566d750c`).
- ce-plan: 1 session, 14 helpers, 3.5M helper tokens and 3 points. Its check found 31 and applied 17.

Briggsy's blind pick and two of three blind readers chose ce-plan's plan (`8d3c91e6`). The owner reader picked ours, and two of the three readers called it close: ours was more right in places (the 59½ line, the Roth basis deflated each year, build 2 named). So 353 more helpers bought, at best, a few rules gotten right and a plan that was harder to build.

The faults that decided it were found cheaply:
- **A rosy leak in the code the charge keys on.** One of ce-plan's three research helpers worked it out by hand from `advancePerPersonLedger`: when one spouse's $20,000 required withdrawal meets a $10,000 need, $25,000 leaves pre-tax and $20,000 is taxed. It said no test had run it, so the plan's U1 confirms it before U3 fixes it; two blind readers traced it in the code and it held. Our plan cites the same function and keeps its split without naming the leak.
- **Traps for the builder.** Three blind readers (builder, rules, owner: 3 helpers, 0.56M helper tokens) each read a whole plan and opened the code it cites. In ours, the builder reader counted about 40 existing hand-worked test households the charge would turn red, against a plan to re-derive only the 8 oracle cases. In ce-plan's, the readers found that build 2 is never named, the Roth basis is held flat in a real-dollar engine, U3's witness step is missing and U5's shape-test claim is wrong. Both plans' full checks had missed all of it.

## Root Cause

- A reviewer hunts faults in the plan's text, one lens at a time. The leak was in the code, and only a helper that ran the code's numbers by hand found it.
- The builder trap shows only to someone who reads the whole plan as its builder and counts what the change touches. No reviewer was asked "would you build from this, and where would you fail first?"
- More reviewers of one kind find more findings of that kind. Ours confirmed dozens and folded them all, which packed the plan (insight 028's extension).

## Fix

- ce-plan stays the plan step (Briggsy, 2026-11-12: "Ce-plan as the plan step - cool"), and `ultramode-plan` is retired.
- The three blind readers join the plan step after ce-plan's run (Briggsy: "Love the three blind mice add-on!"): one plan, the same three lenses, each reader returning its faults with line numbers and whether it would build from the plan. The lead checks each fault against the code before fixing the plan (the playbook TODO's START HERE item 3).

## Key Insight

A helper count is a cost, not coverage. Spend a plan step on a few close reads: research that works numbers through the code the change depends on, and whole-plan reads from the seats that use the plan (who builds it, what the rules say, what the owner needs), each opening what the plan cites. Judge a plan step by a blind read of what it produced, never by how many findings it confirmed.

## Also Applies To

- Code review: one reviewer tracing a value through the code finds what many skimming the diff miss.
- Any process scored by its activity (findings, tests, reviewers) instead of by a blind read of what it produced.
- Choosing between two tools: a blind side-by-side on one real job settles what their feature lists cannot.
