---
title: A crashed verifier is not a refutation — a verify-stage aggregation that treats missing votes as "discard" silently loses real findings
date: 2026-06-10
phase: P1·U3·M5 (the HSA spend-side boundary review)
modules: [process — multi-agent review workflows]
tags: [workflow, verify, majority-vote, false-negative, resume, session-limit, ultramode-review]
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
(`Workflow({scriptPath, resumeFromRunId})`): the journal returns every completed reviewer +
verifier from cache and re-runs only the dead agents. All 4 zero-vote findings came back
CONFIRMED (P3) and were folded. Future scripts: score `abstain` (votes.length === 0) as its
own outcome that re-queues, never as a discard.

## Key Insight

**In any multi-agent verify/judge stage, "no votes" must be a first-class ABSTAIN outcome,
never folded into "rejected."** An infrastructure failure (rate limit, crash, timeout) on
the verifier side otherwise masquerades as a substantive verdict, and the pipeline's output
looks complete — same counts, same shape — while silently missing its most expensive work.
Check the failure side-channel before trusting the aggregate, and lean on resume/journal
machinery: re-verifying only the dead agents cost ~1/4 of the original run.

## Also Applies To

Any LLM-as-judge pipeline with quorum logic (eval harnesses, CI review bots); the
deep-research verify stage (the first occurrence); any `parallel().filter(Boolean)` whose
nulls carry meaning the downstream reduction erases; human processes too — an unreturned
review request is not an approval or a rejection.
