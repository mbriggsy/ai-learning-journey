---
title: An oversized StructuredOutput call truncates after its first property — and the retry loop dies at the cap re-truncating every attempt
date: 2026-07-15
phase: the state-tax engine unit (pre-build council)
modules: [.claude/workflows/council.js, .claude/workflows/caddie.js]
tags: [workflow, structured-output, schema, truncation, retry, council, multi-agent, size-law]
---

## Problem

The state-tax pre-build council (wf_d04148cb-1e5) lost THREE opening seats — honesty-hawk,
fiduciary-advisor, a11y-auditor — while six sibling seats finished clean. Each dead seat's
transcript shows the same loop: a StructuredOutput call, then `Output does not match required
schema: root: must have required property 'reasoning'…`, then a shorter retry, the same error,
until the retry cap. The agents diagnosed it themselves mid-death: "the parser is dropping
everything after the first parameter." The run then wedged ~90 minutes in the hawk guard's
retry cycle.

## Root Cause

The harness TRUNCATES an oversized tool-call input — everything after the first JSON property
is cut, so the schema validator sees only `recommendation` and fails on every other required
field. The three dead seats had written ten-question ESSAYS into the call (the issue posed ten
build questions); the six survivors wrote tighter. Because the failure is output-size-dependent
it presents as flaky per-seat crashes, not a systematic law. A RETRY cannot fix it — the agent
re-emits a similarly-sized call and re-truncates identically — so the hawk guard (built for the
2026-07-09 crash) cycled correctly and still lost. Non-hawk seats had no guard at all and would
have been silently `filter(Boolean)`-discarded: insight 019's abstain-don't-discard violation.

## Fix

(efd8585e) A SIZE LAW baked into every prompt that emits a schema call — the three dead
charters plus the red-team/rebuttal/chair templates, and since then every new workflow's
finder/refuter prompts: budget each field (~150w recommendation / ~350w reasoning), one-or-two
sentences per question on a multi-question issue, and "depth belongs in your deliberation TEXT
before the call — the call is the verdict summary, not the essay." Recovery: stop the wedged
run, patch ONLY the dead seats' prompts + the not-yet-run phase templates (healthy agents'
prompts stay byte-identical), relaunch with `resumeFromRunId` + identical args — the clerk and
six healthy openers replayed from cache; only the dead seats re-ran. Proof: the resumed council
(21 agents) and the same-day 53-agent ultramode review, both carrying the law, ran zero schema
crashes.

## Key Insight

A schema-forced structured output is a SMALL-PAYLOAD channel, and an agent given a big
multi-part question will naturally overflow it — so every workflow schema with several required
string fields must ship an explicit per-field size budget in the prompt, and route depth to
free-text deliberation BEFORE the call. Treat a repeating `must have required property X` retry
loop as truncation, not disobedience: the model emitted the field; the harness cut it. And when
surgery is needed on a wedged multi-agent run, edit only the failing prompts — cache-resume
makes the healthy majority free.

## Also Applies To

Any Workflow `agent(…, {schema})` call — review finders/refuters, research dossiers, caddie
reader cards; any future council-shaped harness. The same law governs schema design itself:
prefer few, bounded string fields over "write your full analysis into this property."
