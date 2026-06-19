---
title: A doc cleanup re-authored "from the ledger" proves coherence, not currency — it cannot catch facts that drifted in the code
date: 2026-06-19
phase: P2 (Act 2 — Where You Stand)
modules: [README.md, docs/roadmap.md, scripts/verify-doc-stats.ts]
tags: [docs, drift, test-count, single-source, verify-gate, coherence-vs-currency, cold-read, summary-surface]
---

## Problem

Weeks after an extensive doc restructure (M2–M6: "re-author present-tense from the ledger"), a 5-agent cold-read of the *fresh* root README found four accuracy bugs immediately:
1. **Stale stat** — "942 tests across 44 files" vs a live 962/45 (and the same number stale in `roadmap.md`).
2. **Summary conflation** — "25 tax/health constants verified against IRS/CMS/HHS/eCFR/**SEC**": SEC has **0** citations in `src/engine/constants/` (SEC EDGAR backs the fund-blend in `tickerBlend.ts`, a *separate* dataset); **SSA** is the heaviest non-IRS source and was *omitted*. The count `25` matched no boundary in code.
3. **Present-tense overclaim** — "mandatory encrypted export **is** the survivor's backstop": the crypto primitives are built+tested, but no UI surface invokes them and the first-Save ceremony (U8) is not-started.
4. **Wrong pointer** — "the confidence-band viz is next" when the roadmap says R40 is the next build.

## Root Cause

A doc refactor authored *from the requirements ledger* audits **narrative coherence** (voice, structure, story), never **empirical currency**. It runs no suite and greps no `src/`, so three failure modes pass straight through it: (a) facts that **drift after** the rewrite (tests added, next-build reordered); (b) **summary-surface conflation**, where a compressed front-door fuses two independently-true facts into a false composite (SEC EDGAR is real — for the fund blend, not these constants); (c) **present-tense-from-the-ledger**, which renders unbuilt *intent* as shipped *capability*. The stat also lived on two surfaces with no guard — so they diverged, violating the engine's own "a number is never re-typed" constants discipline, from which the docs were silently exempt.

## Fix

Corrected all four against source. Shipped `scripts/verify-doc-stats.ts` (`pnpm verify:doc-stats`): a drift gate that extracts each tracked surface's "NNN tests across NN files" claim and asserts it matches the **live suite**. Truth source is vitest's **own collection** (`vitest list`), not a glob — a `src/**` glob *undercounts* (misses `scripts/__tests__/**`), so a glob guard would falsely flag the correct count as stale. A missing claim **fails** (a reworded claim that silently stops being checked is the vacuous-guard trap).

## Key Insight

**A documentation cleanup and a cold-read-against-source audit different axes — coherence vs. currency — and a clean pass on one is no evidence for the other.** Re-authoring docs from a design ledger makes them well-told and self-consistent; it does nothing to make them *true against the running code today*. Any fact a doc shares with the code (counts, what's-built, agency attribution, what's-next) needs a drift gate or it WILL stale — and the most compressed surface (the root README) is where independently-true facts fuse into composite falsehoods. Mirrors externally-derived fixtures (DND 012): a value the engine computes against its own formula proves typing, not correctness; a doc authored from the ledger proves coherence, not correctness-against-reality.

## Also Applies To

- Any duplicated stat/figure across surfaces (README ↔ roadmap ↔ CLAUDE.md) — single-source it or gate it.
- "How it works" prose written in present tense while features are still planned — signpost intent vs. shipped (the mermaid solver/REC nodes, the thesis beats).
- Mechanical-step / fixture hypotheses obsoleted by later work ([[041-a-plans-mechanical-step-is-a-hypothesis-obsoleted-by-a-later-decision-in-the-same-effort]]); verifying a gate's target when writing it ([[033-verify-a-gates-target-when-writing-the-gate-not-when-clearing-it]]).
