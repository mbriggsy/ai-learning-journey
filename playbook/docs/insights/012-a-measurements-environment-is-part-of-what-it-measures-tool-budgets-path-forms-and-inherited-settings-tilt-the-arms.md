---
title: A measurement's environment is part of what it measures; tool output budgets, path forms and inherited settings can hide a real defect or tilt the arms
date: 2026-10-31
phase: the brief recall fix (the plan check, U3 and U6)
modules: [projects/skills/distill-and-brief/brief/bench/rescore.workflow.js, projects/skills/distill-and-brief/brief/bench/make-rescore.mjs, projects/skills/distill-and-brief/docs/plans/brief-recall-fix-plan.md]
tags: [measurement, environment, bench-vs-real, tool-output-limit, preview, grep-head-limit, absolute-paths, glob, short-path, effort, inherited-settings, workflow]
---

## Problem

- **Tool budgets.** Past about 30,000 characters Claude Code shows a 2 KB preview of a tool result, and Grep stops at 250 lines unless told otherwise. A Grep of the Back Nine's 148 titles is about 49 KB with paths. The old recipe's "more than 25 candidates, tighten" step kept its header print, about 1,000 characters a lesson, under the limit. The plan's first draft removed that step without noticing (caught by the plan check, `a77d32f6`).
- **Path form.** The bench gave helpers absolute paths. An absolute Glob pattern survives the doubled slash that `<dir>/` plus `/*-term*.md` makes, while a real brief's relative pattern finds nothing. The 90 runs would have scored a recipe whose filename search was dead in real use (caught by a P1 recheck, fixed in `7f73faf1`).
- **Inherited setup.** The measured session's scratch path put 160 characters before each lesson's filename, against 73 in the session that built the bench. That pushes the old recipe's path-heavy Grep prints past the preview more often, which tilts the test toward the candidate. The helpers' effort level came from whatever the session ran at.

## Root Cause

- A bench is a second environment. Each difference from real use (path form, folder depth, tool limits, the session's settings) changes what the arms see, and it rarely hits them equally: here the old recipe printed paths and the new one did not.
- A cap or a step can be holding an invisible budget. Removing it looks like a pure gain until the output meets the limit.

## Fix

- The new recipe's listing and header print go through `corpus.mjs` with no paths, paged under 20,000 characters (the plan's KTD2); every Grep sets `head_limit: 0`; helpers read any saved tool result in full, and the results record each time.
  > **Out of date (corrected 2026-11-04):** this new recipe never went live. The re-score measured a miss on 2026-11-01, and every candidate was deleted under the plan's KTD7. The live brief is still the old recipe; its corpus card and size cap live in `projects/skills/distill-and-brief/brief/corpus.mjs` (`CAP`), and the miss's numbers live in `projects/skills/distill-and-brief/docs/plans/brief-recall-fix-plan.md`.
- The filename Glob takes the folder as its path, the form a real brief uses (`7f73faf1`).
- The copies went to helpers by the scratchpad's 8.3 short path (`dir /x` gives it), 95 characters before a filename. The harness sets each helper's effort to xhigh (`954f8fd8`), the level its baseline ran at, read back from each helper transcript's `"effort"`.

## Key Insight

Before a measured run, list every way the bench differs from real use (paths, depth, tool limits, inherited settings) and ask of each one: does it hit the arms equally? Then run each step once in the real form as well. And when a change removes a cap or a step, ask what budget it was holding: a print that fit because of it may not fit without it.

## Also Applies To

- A/B harnesses that run in CI containers but ship to user machines.
- Prompt or recipe evals that use absolute paths, mock tools, or a model setting other than production's.
- Any "tighten" or "limit" step feeding a size-limited sink: a preview, a context window, a message cap.
