---
title: A dispatch threshold in a verify fan-out is a SILENT abstention channel — findings it drops never reach any bin, and the aggregate looks complete
date: 2026-07-18
phase: Act 4 · the U14 ultramode-review fold
modules: [process — multi-agent review workflows]
tags: [workflow, verify, abstain, threshold, insight-019, insight-084, review-fold, ultramode-review]
---

## Problem

The U14 ultramode review's verify stage dispatched 2 refuters per finding — but only for
findings with `confidence >= 50` (a script-level filter meant to save refuter budget on the
finder's own low-confidence hunches). Three confidence-25 findings were never verified at
all: no vote, no crash, no named residue. The journal's aggregate looked complete — 25
findings, 40 votes, the counts reconciled — and the session that read only the named-so-far
summary would have folded the review "whole" while silently skipping three findings. When
fresh refuters finally ran them, TWO of the three were confirmed real and folded (the ACA
freshness window missing from the ε-guard list; `mean()`'s NaN blindness against its own
"refuse, never NaN" comment).

## Root Cause

Insight 019 taught that a CRASHED verifier must read as ABSTAIN, not refutation — but the
fix there watched the *failure* side-channel. A dispatch-time threshold is a third channel:
the finding never enters the verify stage, so it produces neither a vote NOR a failure.
Nothing downstream distinguishes "verified and clean" from "never sent." The filter's
intent (don't waste refuters on weak hunches) conflated *priority* with *disposition* —
a low-confidence finding is a cheaper-to-verify claim, not a false one. Finder confidence
is the FINDER's self-report; two of the three sub-threshold findings were real.

## Fix

The fold read the journal WHOLE (every finder result, not just the vote list), diffed the
findings-set against the votes-set, and dispatched fresh refuters for the intersection gap —
alongside the 4 crashed-abstention re-runs the TODO already named. Future review scripts:
a dispatch filter must route sub-threshold findings to a NAMED `unverified[]` bin in the
returned result (so the coordinator sees the drop), or verify everything with cheaper
effort instead of not at all.

## Key Insight

**Every path a finding can take through a verify pipeline must terminate in a named bin —
confirmed, refuted, abstained, or unverified — and the aggregate must carry all four.**
Crashes (019), truncation deaths (084), and dispatch thresholds are three shapes of the
same failure: work that silently never happened, indistinguishable in the output from work
that happened and found nothing. The audit move is always the same set-diff: enumerate what
ENTERED the stage, enumerate what EXITED with a verdict, and explain every member of the
difference by name.

## Also Applies To

- Any sampled/quota'd verification (e.g. "verify the top-N findings") — the untouched tail
  needs a named bin.
- CI matrices that skip legs on a condition — a skipped leg reported as absent reads as
  green.
- The Caddie's reader panels: a lens dropped for budget must be listed as not-run on the
  card, never omitted.
