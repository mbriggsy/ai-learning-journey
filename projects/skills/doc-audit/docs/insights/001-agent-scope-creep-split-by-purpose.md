---
title: Agent scope creep — split by purpose, not method
date: 2026-04-09
modules: [SKILL.md]
tags: [agents, scope-creep, architecture, eval, skill-design]
---

## Problem

Agent 4 in doc-audit grew from 5 checks (duplication only) to 12 checks across 3 distinct jobs (duplication + contradiction + presentation consistency) over 3 iterations. Each addition was justified by a specific eval failure, but cumulatively the agent was doing 3 different things grouped by technique (cross-file comparison), not by purpose.

During a self-audit, Agent 4 caught 7 of 8 issues but missed that its OWN README summary omitted a feature it was supposed to check for — attention fatigue from too many responsibilities.

## Root Cause

The checks were grouped by METHOD (all require cross-file comparison) rather than PURPOSE (finding duplicates vs finding conflicts vs finding format mismatches). When an agent has too many distinct objectives, it spreads attention thin and misses edge cases in each.

## Fix

Split Agent 4 into:
- **Agent 4: Duplication Detector** (5 checks) — "is this repeated?"
- **Agent 5: Consistency Checker** (7 checks) — "does this conflict or mismatch?"

Ran iteration 4 eval: 20/20 assertions, 100% pass rate maintained. Reports were cleaner and more focused.

## Key Insight

Group agents by PURPOSE, not METHOD. Sharing a technique (cross-file comparison) does not equal sharing a mission. When an agent accumulates checks that answer fundamentally different questions, it's time to split — even if the checks use similar mechanics. The signal is attention fatigue: the agent catches most issues but starts missing the long tail.

## Also Applies To

- Any multi-agent skill where agents accumulate checks over iterations
- Eval-driven improvement loops — each iteration adds scope, watch for the inflection point where more checks = worse coverage per check
- General prompt design: one clear objective per agent > multiple objectives with shared technique
