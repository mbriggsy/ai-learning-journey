---
title: N-lens convergence on a finding says nothing about its suggested fix — verifiers must judge the fix's direction as their own question, and unanimity on the remedy is not evidence
date: 2026-07-09
phase: post-rewrite shakedown (CE 3.14 persona-mining maiden flight)
modules: [SKILL.md, references/workflow-template.md]
tags: [verify-stage, convergence, suggested-fix, adversarial-verification, false-consensus, persona-mining]
---

## Problem

On the rewrite's shakedown flight (the-back-nine post-U13-fold unit, wf_53e05c8d-323), five of
seven lenses — correctness, architecture, idiom, simplicity, adversarial — independently converged
on the same real finding (the echo whitespace budget carries no max-height gate) AND independently
proposed the same fix: co-gate it to `≤840px` alongside the density tier. By the usual convergence
heuristic (the-back-nine's 017: multi-lens convergence = a beacon), a 5-lens unanimous finding
*with a unanimous remedy* reads as settled — apply it.

## Root Cause

Convergence and correctness are correlated for FINDINGS but not for FIXES. All five lenses derived
the fix the same way — pattern-match to the visible sibling ("the density tier is height-gated, so
gate this like it") — so five agreements were one inference repeated, not five independent checks.
None of them costed the fix's *consequence*: co-gating drops the system's TALLEST frame back to
base rhythm at 841px, the highest fold-pressure point, inside an 841–916px band no fit arm tests —
risking the exact fold breach the budget exists to prevent. Only the per-finding verify stage,
whose prompt explicitly asks "is the suggested fix even correct (could it be directionally wrong)?",
caught it — one verifier refuted the remedy while confirming the finding, and the safe remediation
inverted from "re-scope the CSS" to "correct the comment, land the landmine note."

## Fix

Folded per the verify verdicts, not the reviewer consensus: comment corrected + do-not-co-gate
landmine filed (the-back-nine `4a05fe00`), CSS untouched. No skill change needed — the VERIFY
prompt already carries the fix-direction question; this doc pins WHY that clause is load-bearing
so it never gets "simplified" away as redundant with the reviewers' own suggested_fix field.

## Key Insight

Convergence validates the finding, never the fix. N lenses that share an observation usually share
the inference that produced its remedy — remedy-unanimity is one vote wearing N coats. The verify
stage must treat `suggested_fix` as a fresh hypothesis with its own failure modes (What regime does
the fix create? Is THAT regime tested?), and a fold is entitled to accept a finding while rejecting
its remedy. Corollary for any review harness: if your verifiers only answer "is the bug real?",
your most dangerous output is a real bug paired with a plausible, unanimous, wrong fix.

## Also Applies To

- Any multi-agent review/design panel: judge scores converging on a winner ≠ converging on the
  winner's weakest section; verify the recommendation separately from the diagnosis.
- Human review threads: three approvals citing the same suggested change are one derivation.
- The-back-nine's own 017 beacon rule — it stays correct for findings; this is its fix-side limit.
- Deep-research syntheses: sources agreeing on a fact vs. agreeing on the recommendation drawn
  from it are different strengths of evidence.
