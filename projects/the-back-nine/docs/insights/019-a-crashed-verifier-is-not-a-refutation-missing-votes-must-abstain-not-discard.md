---
title: A crashed verifier is not a refutation — a verify-stage aggregation that treats missing votes as "discard" silently loses real findings
date: 2026-06-10
phase: P1·U3·M5 (the HSA spend-side boundary review)
modules: [process — multi-agent review workflows]
tags: [workflow, verify, majority-vote, false-negative, resume, session-limit, ultramode-review, resumeFromRunId, positional-cache, nested-verifier-rerun, journal]
---

## Problem

The M5 ultramode review fanned out 11 reviewers → dedup → an adversarial-verify stage
(majority vote; 3 refuters on P0/P1). The run "completed" with 18 confirmed / 14 discarded —
but 9 verify agents had died mid-run on a session limit. Four genuinely distinct, ultimately
REAL findings (two missing overlay backstops, an exact byte-identity gap, an untested
subsystem combination) sat in the DISCARDED pile, indistinguishable from refuted ones.

## Root Cause

The aggregation step scored each finding as `confirmed = (real votes × 2 > votes.length)`.
A finding whose verifiers all crashed has `votes.length === 0`, so the majority test is
`0 > 0` → false → **discarded**. The judgment "no verifier confirmed this" and the outage
"no verifier RAN" collapse into the same bucket. Nothing in the result distinguishes them —
only the side-channel `failures` block reveals that the votes never existed. This is the
second occurrence of the shape (the deep-research workflow's "refuted" verdicts were
verifier-crash false negatives too — `memory/reference-deep-research-workflow-broken`), now
in a hand-written script rather than a vendored one.

## Fix

Read the `failures` block before trusting any verify-stage output; cross off "discarded"
findings whose vote count is zero — they are UNVERIFIED, not refuted. Then resume the run
(`Workflow({scriptPath, resumeFromRunId})`). On this run the resume re-verified the dead
agents, and all 4 zero-vote findings came back CONFIRMED (P3) and were folded. Do not count on
a resume costing only the dead agents (see the correction below). Future scripts: score `abstain` (votes.length === 0) as its
own outcome that re-queues, never as a discard.

## Key Insight

**In any multi-agent verify/judge stage, "no votes" must be a first-class ABSTAIN outcome,
never folded into "rejected."** An infrastructure failure (rate limit, crash, timeout) on
the verifier side otherwise masquerades as a substantive verdict, and the pipeline's output
looks complete — same counts, same shape — while silently missing its most expensive work.
Check the failure side-channel before trusting the aggregate, then resume. A resume can cost
far more than the dead agents (the correction below).

## Also Applies To

Any LLM-as-judge pipeline with quorum logic (eval harnesses, CI review bots); the
deep-research verify stage (the first occurrence); any `parallel().filter(Boolean)` whose
nulls carry meaning the downstream reduction erases; human processes too — an unreturned
review request is not an approval or a rejection.

## Corrected (2026-11-23): a resume replays by position, so it can re-run every verifier

This file's Fix used to say the journal "re-runs only the dead agents". A later resume disproved it. On 2026-09-25 a
206-agent review died on a session limit and was resumed with `resumeFromRunId`. The finders came back from cache, but
every nested verifier after the first call whose order was not fixed ran again. The journal shows 384 agents started
and 299 results, and two verdicts changed between the first pass and the re-run.

The cause is how the Workflow tool's cache works: it is positional. Calls replay from cache only up to the first call
that failed, changed, moved or never started; that call and every call after it run again, even if their own prompt
did not change. Nested verifiers are launched as each finder returns, so they start in a different order on every run. The first
reordered call ends the replay, and the rest of the run is paid for again. (The tool's current description says a call refused by a usage
limit usually re-runs without ending the replay. A reordered call still ends it.)

The lessons: budget a resume as a full second pass over everything after the first call whose order can vary. Read the
journal's started/results counts against the first run. Treat a verdict that changed between passes as a split that
needs a tie-break, not as the later pass winning.
