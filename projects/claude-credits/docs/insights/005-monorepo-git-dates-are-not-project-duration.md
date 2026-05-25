---
title: Per-project git date stats are meaningless in a bulk-seeded monorepo — and source-verification won't catch it
date: 2026-05-25
phase: Phase 3/4 review
modules: [src/components/ProjectTile, tools/claude-credit/src/git-stats.ts]
tags: [monorepo, git-stats, projectAgeDays, data-honesty, verify-vs-sniff-test, phase-5-cadence]
---

## Problem

The project tile's age ribbon showed numbers that failed the sniff test:
tic-tac-toe "76d" (it was ~1 hour of work), pacman "80d", UMB "52d". The values
were internally consistent and the code that produced them was verified correct —
yet every number was a lie about how long the project took.

## Root Cause

`projectAgeDays = lastCommitISO − firstCommitISO`, **path-scoped** to the project
folder (`git-stats.ts:145`). In this monorepo both ends are polluted:

- **First commit = a bulk import, not the project's start.** Several projects trace
  to one commit literally titled *"Initial commit - Tic-Tac-Toe, PacMan, and OpenClaw
  projects"* — multiple already-finished projects dumped in together. So "first touch"
  is the **repo's birthday**, not when that project was built.
- **Last commit = any incidental later touch.** A README edit, a cross-cutting
  refactor, or (this session) the editorial `claude-credit.config.yaml` added to all
  9 projects at once. The span drifts toward **calendar age**, never work duration.

There is no clean recovery from git: the real per-project start/end is not encoded
in path-scoped commit history once bulk imports and monorepo-wide commits exist.

## Fix

Cut the ribbon. Nothing load-bearing used it — the grid sort is
file-classification-derived (`grandTotals.authoredLines`), the hero uses token/line
totals; neither touches git dates. Removed the ribbon, `formatAge`, and its tests.
Flagged that **Phase 5's planned commit-cadence/date viz inherits the same pollution**
and must change its data source before it's built.

## Key Insight

**Verifying a stat against its source proves the COMPUTATION is correct — not that the
INPUT is meaningful or the OUTPUT is trustworthy.** `projectAgeDays` computed *exactly*
what `git-stats.ts` claimed; the code was right and the number was still garbage,
because the input (path-scoped commit dates) doesn't mean what the label ("age")
implies in this repo shape. The catch came from a **human domain sniff-test**
("tic-tac-toe was an hour, not 76 days"), not from any code check. Trace-to-source
answers "is it computed right?" — it cannot answer "is it the right thing to compute?"
For derived stats, gut-check the *output against reality* as a separate gate.

The honest signal for real build-time lives in the **session JSONLs** (active-work
timestamps — the same source the token counter reads), not git calendar dates.

## Also Applies To

- Any per-folder git metric (churn, age, contributor span) in a monorepo seeded by
  imports or touched by cross-cutting commits — they all drift the same way.
- Any "I verified it against the source" claim about a *derived/displayed value* —
  source-correctness ≠ output-meaningfulness. Add a reality sniff-test for stats.
- Phase 5 commit-cadence viz (explicit downstream consumer of the same dates).
