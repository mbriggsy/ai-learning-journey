---
title: "When asked to build instrumentation, first check whether existing instrumentation already produced unread data"
date: 2026-05-06
phase: playtest-harness/phase-7 (drafted then deferred)
modules: [docs/plans/playtest-harness/, docs/testing/playtest/runs/, docs/testing/E2E-ISSUE-LIST.md]
tags: [planning, document-review, instrumentation, observability, harness, meta-process]
---

## Problem

Briggsy asked: *"identify all playable scenarios, have agents play 10/8/6/4 — produce expected-vs-observed evidence."* I drafted a Phase 7 plan with cascade orchestrator + HUNT-mode + catalog expansion + new evidence-package writer. Estimated 38–61 hour worst-case build. Two passes of `compound-engineering:document-review` (six personas each) returned 14 findings on v1, then 54 findings on v2. **Both passes had P0 structural defects** (v1: Read-tool audit impossible under current Claude Code; v2: D-B1 residue mechanism still required Read seats don't have, token cost off 1-2 orders of magnitude, `--seed` parser rejects hex, lobby-config files claimed-to-exist that don't). Reviewer signal across product-lens / scope / adversarial converged: *the harness was already producing PRD §2 findings — 35 issue files in 3 recent runs sat unread for 5–7 days*.

## Root Cause

The framing of "build instrumentation to measure X" implicitly assumes nothing currently measures X. When the harness has already been running and emitting artifacts, the existing artifacts are the cheapest data source — but the natural drafting instinct is to design a new collection regime rather than read what was collected. The bottleneck for "we don't know what the harness produces" was never *production* (the harness ran 4 sessions in 7 days and emitted 35 triaged issues). It was *promotion*: zero of the 7 genuine player-experience findings had been moved into `E2E-ISSUE-LIST.md` and acted on.

The reviewers caught this because they had three angles I didn't: product-lens checked the PRD goal alignment, scope-guardian counted units against goal, adversarial questioned every numerical claim against existing data. None of *me drafting the plan* would have surfaced this — drafting compounds in the direction of "the plan is the answer."

## Fix

Skipped Phase 7 entirely. ~30 minutes of triage on existing run dirs (`docs/testing/playtest/runs/2026-04-29-2139-3p`, `2026-05-01-1654-3p`) classified the 35 issues: ~10 clusterer false-positives, ~3 agent self-errors, 2 already-resolved (commits 901ab99f / 38d4c7f0 / insight 045), **4 genuine open findings promoted to E2E-ISSUE-LIST as C-30 through C-33** (StatusBar favor-pending, Go Dark drama beat, phone observer narration, Direct Order turnsRemaining indicator). v2 plan parked at `status: deferred` with full review crosswalk in Appendix B for the future moment when (a) BURNED has a playtest scheduled, or (b) an engine change motivates fresh coverage measurement.

## Key Insight

**For any request shaped "build something to measure / monitor / collect / observe X," the first 30 minutes of work is reading what existing instrumentation has already collected — not drafting a plan for new instrumentation.** The cost of a 30-minute triage pass against existing artifacts is bounded; the cost of building infra to re-collect data that already exists in unread form is unbounded.

The pattern to watch for: a planning instinct that says *"we need data on X"* without first asking *"what data on X have we already collected?"* If the system has any pre-existing observability surface — playtest runs, test reports, telemetry dumps, log archives, prior session artifacts — that surface IS the cheapest first answer. Building parallel instrumentation when the existing instrumentation has unread output is a textbook case of optimizing the wrong metric.

This insight also vindicates the multi-persona document-review process for non-trivial plan documents. Six personas reading a draft caught two passes of P0s that the drafting agent (me) systematically missed. The cost of running document-review against a ~600-line plan was a fraction of the cost of executing even the cheapest unit of the plan. **Run document-review BEFORE locking units, not after committing implementation work.**

## Also Applies To

- Adding a new logger / metrics / telemetry surface — check whether existing logs answer the question first.
- Building a new test suite — check whether existing test output (CI artifacts, fast-check counterexamples, Playwright traces) already covers the case.
- Drafting a coverage-tracking spreadsheet — check whether `git log` + existing audit docs already answer the coverage question.
- Designing a new observability dashboard — check whether existing dashboards have signals nobody's reading.
- Any plan whose verb is *measure* / *track* / *capture* / *surface* / *report* against an existing system — the cheapest first move is always to read what the existing system already produced.
