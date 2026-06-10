---
title: Your FIX for a confirmed finding is also a hypothesis — adversarial verification must target the synthesizer's dispositions, not just the reviewers' findings
date: 2026-06-10
phase: P1 (C3 — the date-search boundary review)
modules: [engine/simulate, engine/dateSearch, workflow/review-cadence]
tags: [review-cadence, adversarial-verify, dispositions, fix-direction, over-rejection, insight-005]
---

## Problem

After the 12-lens C3 review, the main loop synthesized dispositions for every finding
— including a P1 fix instrument and a decideTrack guard design — with careful inline
reasoning and a Sequential-Thinking lock. The 9-agent verification stage then
**overturned both**: not the findings (which were real), but the main loop's own
chosen fixes.

## Root Cause

Insight 005 established "a review finding is a hypothesis" — but the synthesizer's
*response* to a confirmed finding carries the same epistemic status and gets none of
the same scrutiny by default. Two concrete failures: (1) the P1 blanket-reject of
zero-income still-working people rested on "no honest override value exists" — false
against source (the override figure is entered working-year **MAGI**, not
salary-derived; `model.ts` blesses `earnedIncomeReal: 0` as a first-class state), and
under the sweep's all-or-nothing policy the blanket reject would have input-failed
the product's own work-optional-by-choice demographic. (2) The decideTrack
strictly-increasing guard ("keep U9 latitude") would have **legitimized** gapped
curves — exactly the unevaluated-dip false-early crown the rule exists to prevent;
the honest v1 guard is `offsetYears === index`. Both errors were reasoned, plausible,
and wrong in ways only a source-tracing adversary caught.

## Fix

The verification stage's prompts now state the proposed disposition explicitly and
instruct refuters to attack **it** (over-rejection, contract contradiction, shipped-
test breakage, residual completeness) — not merely re-confirm the finding. R2's
"adjusted" verdict (right direction, wrong instrument) and V5's guard reversal were
the direct product of disposition-targeted prompts.

## Key Insight

**Feed the verifiers your fix, not just the finding — and let them attack the fix.**
A verify stage that only re-confirms findings rubber-stamps the synthesizer's
response to them. The two highest-value verdicts of this review were "the finding is
real AND your fix is wrong" — a verdict class that cannot exist unless the
disposition is in the prompt. Corollary: "verdict: adjusted" must be a first-class
outcome beside confirmed/refuted/abstain, or instrument-level corrections get
shoehorned into one of the wrong buckets.

## Also Applies To

- The /ultramode-code-review skill's verify stage (encode disposition-targeting).
- Any "decide-then-execute" fork where the main loop picks among reviewer-proposed
  fixes — the pick itself is the highest-leverage thing to refute.
- Plan-amendment dispositions (document vs fix vs reject) after doc reviews.
