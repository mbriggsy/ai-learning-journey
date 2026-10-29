---
title: A rule about the platform is a map until a run measures it, whoever wrote it down; a verdict holds only for the bytes that produced it
date: 2026-10-21
phase: our-setup U2 (fixture harness, platform probes, hooks CI)
modules: []
tags: [probes, platform-behavior, hooks, harness, code-review, adversarial-verify, measurement, powershell, permission-denials, model-switch, verdict-hash]
---

*The probe and harness code this lesson came from was flushed on 2026-10-29 (`git show bd5ee4a2^:projects/hooks/probes/`); the lesson stands on its own.*

## Problem
U2's harness scores hooks the way Claude Code does, and its probes settle what the platform really does. Across five review rounds, confident statements about the platform were wrong, from three different sources:
- **Our own earlier finding.** #42250 (filed 2026-04) said only error-path output reaches the model. Probe Q1 measured `additionalContext` reaching it on PostToolUse and Stop, and a Stop context extending the turn. The round-1 harness had not modeled that: it scored a Stop context as letting Claude stop.
- **A reviewer.** A round-5 verifier said a null `CreationDate` cast to `[DateTimeOffset]` becomes year 0001, so `run.mjs`'s undated-child branch could never fire, and it proposed a guarded query. Its own reasoning said "from docs and language rules; not run".
- **The probe's own guard.** On CLI 2.1.307, Q6 went from CONTRADICTED to INCONCLUSIVE. Its guard voided two arms because the model called the Skill tool, which "registers the once hook afresh".

## Root Cause
Each one was a rule written down from reading, never checked against a run:
- One line of Windows PowerShell 5.1 settled the reviewer's claim. The unguarded cast prints `{"StartMs":null}`, so the branch is reachable. The proposed guard prints `{"StartMs":{}}`: a regression presented as a fix.
- Q6's own run record answered the guard:
  - The `-p` result's `permission_denials` lists both Skill calls by `tool_use_id`. They were denied, never ran, and so registered nothing. Both came before any Read.
  - Those arms' `modelUsage` shows a second model (claude-opus-4-8) doing the work, where the clean arms used one. So "a CLI change, or noise?" was neither: the model had switched.
- The reference leaves gaps, and the harness fills some by analogy: deny-over-ask across PreToolUse's two output forms comes from the multi-hook precedence line. That is sound only while it is labeled unmeasured.

## Fix
- **The reviewer's claim:** declined, with the measurement written into the triage. No code change. The test comment it called wrong was right.
- **Q6:**
  - `skillUse(caps, json)` counts a Skill call as denied only when its `tool_use_id` is on the run's `permission_denials`. Only calls that ran void an arm.
  - The evidence now names each arm's models.
  - On the next run, an arm's model switched and the CLI denied its call again. The arm stayed readable, and Q6 read a measured CONTRADICTED, matching every 2.1.306 run.
- **Harness comments:** every rule cites a probe. Where none exists, the comment says the rule is unmeasured and which reference line it was inferred from.
- **Verdict hash:** every verdict carries a hash of its def plus `lib.mjs` plus `capture.mjs`. One lib edit voids all 17 verdicts and forces one full rerun. A verdict is evidence about the bytes that produced it, never about the unit in general.

## Key Insight
A sentence about platform behavior is a map, whoever wrote it: the docs, the harness, a reviewer, or last season's finding. Before acting on one:
1. **Was it run or reasoned?** A verifier that says "not run" is handing you a hypothesis, not a verdict.
2. **If one command can measure it, measure it.** That costs less than the fix it would justify, and a fix built on a wrong platform claim can be a regression.
3. **Read the surprising run's own record before blaming the platform**: `permission_denials`, `modelUsage`, `num_turns`. It usually says why.
4. **Tie each verdict to the bytes it was read from**, and void it when they change.

## Also Applies To
- Adversarial verifiers judging OS, shell, CLI or runtime behavior from source alone: have them say "not run", then measure.
- Any test double that encodes an outside system (an HTTP mock, a fake clock, a stub CLI). It stays a map until a check against the real system agrees.
- "Did the new version change it?" questions: check the model and the permission record before blaming the version.
