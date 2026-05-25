---
title: Removing a field across many docs — verification-grep blind spots
date: 2026-05-25
phase: claude-credits scope-change reconciliation (preflight → phase plans)
modules: [docs/plans, docs/ideation.md, docs/editorial.md]
tags: [reconciliation, grep, verification, drift, scope-change, code-review, field-removal, symbol-removal]
---

## Problem
A product pivot removed the `meta` projects concept (plus the `kind` discriminator and the CTA `cta.ts` plumbing) from an already-deepened 11-phase plan set. After propagating the change across 8 docs AND running a verification grep that came back "clean," a 3-reviewer `/ce:review` still surfaced ~8 surviving stale references — including a **P1 type declaration** (`meta: ProjectReport[]`) and a pre-existing sort-key contradiction (`allBytes` vs the locked `authoredLines`).

## Root Cause
The verification grep searched for the **known usage shapes** of the removed field — `report\.meta`, `meta\.length`, `\.\.\.report\.meta`. Those matched call-sites but were blind to the same symbol in other forms:
- a **type declaration** (`meta: ProjectReport[]`)
- a **diagram label** (Mermaid `walk projects[]+meta[]`)
- an **error-message string literal** (`"... across projects[]+meta[]"`)
- a **test fixture** (`{ projectName, kind: 'active', ... }`)
- prose **exemplars** ("the meta projects ship `tokens:null`")

Two compounding traps:
1. **Scope chosen by assumption.** I reconciled only the phases I *assumed* used the field (0/4/5/6/7). phase-2 and phase-3 also consumed `report.meta` — caught only because I later grepped *all* plans, not the scoped subset.
2. **Regex adjacency.** `allBytes desc` never matched `` `grandTotals.allBytes` desc `` — backticks and words sat between the tokens.

## Fix
- After a removal, grep the **bare identifier** (`\bmeta\b`, `\bkind\b`, `cta`) across ALL docs and triage every hit — don't grep only the call-shapes you remember writing.
- Scope a reconciliation by greping **every consumer first**, before deciding which files/agents to touch.
- Treat an independent 2nd-eyes review (`/ce:review` correctness + maintainability) as part of verification for cross-doc removals, not a rubber stamp. It structurally finds what a single self-grep cannot.

## Key Insight
When you delete a field/symbol that lived in many places, your verification must search for the **identifier itself**, not the **shapes you remember using it in**. The references that bite are in forms you didn't think to grep: type signatures, diagrams, string literals, fixtures, prose. A "clean" grep only proves *the patterns you wrote* are gone — not that the symbol is.

**Corollary (a second instance, same week): an empty grep result is NOT proof of absence.** A wrong glob, a too-narrow alternation, or a brace-expansion that silently matches nothing returns "0 hits" that looks identical to a true absence. Real cost: a deploy-URL grep over project files returned "No matches," so a live project (`burned-cxa.pages.dev`, plainly in the project's own README) was recorded as "not deployed." **When a "no matches" is surprising or load-bearing (e.g. "this project has no deploy URL," "this symbol is fully removed"), confirm the absence with a direct read of the obvious file before acting on it.**

## Also Applies To
- Renaming/removing a function, prop, or DB column across a real codebase (not just docs).
- Deepening-drift (header amended, body code-block left stale) — same family: fix bodies, grep the bare name.
- Any "I updated all the references" claim — verify by the bare identifier, and let an independent reviewer check.
