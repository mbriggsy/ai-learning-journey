---
title: Surface-coherence plan review misses signature drift — rigor passes need at least one code-grounded reviewer
date: 2026-04-23
phase: playtest-harness harden pass (H-1b)
modules: [docs/plans]
tags: [planning, review, rigor-pass, methodology, confidence-scoring, citation-verification]
---

## Problem

During the Phase 2 rigor pass, a single-agent confidence scorer read the plan and returned **5/5 across all 9 dimensions** with "no load-bearing gaps found — plan is tight, recommend exiting Harden pass." The plan appeared flawless.

Five parallel document-review personas (adversarial, feasibility, coherence, security-lens, scope-guardian) then reviewed the same plan and found **three critical factual errors plus a blocking architectural divergence** — three reviewers independently caught the same signature mismatch.

## Root Cause

Two different review modes produce two different outcomes:

- **Surface-coherence scoring** asks *"does this plan read as internally consistent?"* The scorer didn't open the cited source files. It treated line-number citations as trustworthy and reasoned about the plan as a self-contained document. Every claim looked well-formed, so every score was 5/5.
- **Code-grounded review** asks *"does the plan match the code it cites?"* The personas opened `projection.ts` and `room.ts`, read actual function signatures, and compared them against the plan's prescribed call shapes. They found:
  - Plan: `projectForPlayer(state, playerId)` — actual: `projectForPlayer(state, playerId, board)` (3-arg).
  - Plan: `projectForBoard(state)` — actual: `projectForBoard(state, now, connectedPlayerIds)` (3-arg).
  - Plan claim "`buildGodProjections` is a pure function of state" — false, since `now` and `connectedPlayerIds` are required inputs outside `state`.
  - Architectural: plan emitted god-event at dispatch-site; existing `broadcastGameState` re-samples `Date.now()` + `getConnectedPlayerIds()` at broadcast-site, so the plan's core invariant ("god-event equals state-update for viewer V") would have failed by construction at runtime.

The scorer's checklists (rationale present? test scenarios present? dependency order sensible?) have no column for *"did the cited API signatures actually match reality?"* It wasn't looking.

## Fix

For Phase 2's rigor pass specifically: dispatched the five persona reviewers, integrated all load-bearing findings into the plan (signature corrections, emit-from-broadcast architectural fix, per-viewer split requirement, hibernation callouts, security hardening, CI gate).

For **future rigor passes**: when a plan cites specific source-code APIs (function signatures, file:line references, type shapes), at least one reviewer in the pass must read the cited source directly. The `adversarial-document-reviewer`, `feasibility-reviewer`, and `coherence-reviewer` personas all default to verifying citations. The `confidence-scorer` pattern does not. Use both — they catch different classes of error.

## Key Insight

**Surface coherence and factual accuracy are orthogonal.** A plan can read as perfectly consistent with itself while every external citation is wrong. Plan-internal checklists cannot detect plan-to-code drift.

The cheap fix is to always include at least one code-grounded reviewer when the plan names specific APIs or line numbers. The cost is one extra sub-agent dispatch. The alternative — shipping a plan with wrong signatures — is discovered by the implementer at TypeScript compile time, which is too late and too expensive.

**Before trusting a plan's 5/5 confidence score, ask: did the scorer read the source files the plan cites?**

## Also Applies To

- Any rigor pass on technical plans that cite function signatures, APIs, or file:line references.
- Design documents that call specific interfaces — whenever the doc's trustworthiness depends on the external world matching its claims.
- Spec reviews where the spec references existing contracts — if the reviewer only reads the spec, contract drift goes undetected.
- AI-generated documentation that references code — the LLM generating the doc may have hallucinated or outdated signatures; a second reviewer reading source catches this.
- Any two-tier review system where the cheap tier reads the artifact and the expensive tier reads the artifact's dependencies. Skipping the expensive tier because the cheap tier says "looks good" is the failure mode.
