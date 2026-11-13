---
title: A probe proves only the case it actually exercises; compare against a control from the same source, try every rule the fix writes, and keep the condition standing at the moment the claim is about
date: 2026-11-12
phase: the plan step's own skill (U1's platform probe and its reviews)
modules: [projects/archive/skills/ultramode-plan/bench/probe/probe.mjs]
tags: [probes, platform-behavior, control, decoys, deny-rules, short-names, mcp, workflow, background-job, session-alive, measurement]
---

*The `ultramode-plan` code this lesson came from is archived at `projects/archive/skills/ultramode-plan/` (2026-11-12); the lesson stands on its own.*

## Problem

- **No control.** A removed MCP tool and a never-loaded one answer alike ("No such tool available"), so a check that a tool was removed passed whether or not the removal worked.
- **Not every rule tried.** U1's fix wrote deny rules for every short-name spelling of a path. Round 2 found no decoy in the probe for the short-name Edit and Write rules under `~/.claude`, the exact-file rules with a short last name (`SETTIN~1.JSO`) included. The probe tried the rule that had failed, not the rules the fix wrote.
- **The condition gone too soon.** The probe meant to show that a background Workflow keeps the session alive. In the first U1 run the Workflow finished mid-turn, which proves nothing about waiting.

## Root Cause

Each probe would have read the same with the fix absent. A probe answers the question it actually poses, and here that question was narrower than the claim: one rule instead of the set, a tool missing for any reason instead of one removed, a job that ended before the moment in question.

## Fix

- The `mcp` check passes only when a claude.ai connector of the same kind is offered, so "removed" is compared with something that would otherwise be there.
- The probe builds its decoys from the same `spellings` the deny set uses.
- The skill was reordered so the Workflow launches last and the turn ends with it still pending.

## Key Insight

For each probe, ask: what would this read if the fix were absent, or the platform worked the other way? If the answer is the same, add a control from the same source. Generate the probe's cases from the same list the fix uses. Make the probe's condition hold at the exact moment the claim is about.

## Also Applies To

- "It's blocked now" tests that never showed it was reachable before.
- Allowlist or denylist tests that cover the reported case only.
- Timeout and keep-alive tests whose work finishes before the timer matters.
