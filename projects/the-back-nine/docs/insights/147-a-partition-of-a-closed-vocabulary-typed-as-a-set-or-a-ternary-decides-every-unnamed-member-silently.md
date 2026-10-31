---
title: "A partition of a closed vocabulary typed as a Set or a ternary decides every UNNAMED member silently — the state-tax reading's two homes lumped Florida with North Carolina (\"either way\" where the run only flatters) and would drop a line for any reading added later; an exhaustive Record<Vocabulary, …> names every member once and makes tsc find every home"
date: 2026-10-31
phase: the pay check's whole-file review (Phase C, b9-9) — advisory a3, findings c6 / c7, rulings 41 and 42
modules: [src/ui/assumptionRegistry.ts, src/intake/WorkingYearLedger.tsx]
tags: [typescript, exhaustive, record, partition, vocabulary, set-membership, ternary, default-arm, copy-selection, compile-time]
---

## Problem

`WorkingYearStateTaxReading` has four members (`agi-derived` NC, `none` FL, `class-based` PA, `unpriced`), and two
surfaces choose words by it: the assumptions sheet's K7 line and the money picture's where-the-state-tax-went line.
Before the review, one home was a Set (`WORK_STATE_TAXED = new Set(['agi-derived', 'none'])`, keep K7's line or drop
it) and the other a ternary (`unpriced ? … : class-based ? … : null`). The copy lens found K7 telling a Florida
household "either way" — the run charges no state tax, the least any work state can, so the gap only flatters — and
an advisory (a3) flagged the partition as typed twice, non-exhaustively.

## Root Cause

A Set membership test and a ternary with a default arm are partitions that never name most of their members. Every
member not listed lands in the in/out bucket or the `null` arm by omission, and that is a decision nobody reviewed:
FL sat in NC's bucket because the Set's question ("is the work state taxed?") was coarser than the sentence's
("which way does the gap lean?"). And a fifth reading added later would compile clean in both homes and silently take
the default — no line, or the wrong one.

## Fix

Two exhaustive Records keyed by the vocabulary: `WORK_STATE_KEY: Record<WorkingYearStateTaxReading, CopyKey>` (one K7
sentence per reading — ruling 41: NC "either way", FL and PA/unpriced each a rosy-group sentence) and `STATE_TAX_IN_W:
Record<WorkingYearStateTaxReading, {…} | null>` (ruling 42). Each member's answer is a line a reviewer reads; a new
member fails to compile in every home.

## Key Insight

**When code chooses behavior by a closed vocabulary, type the choice as `Record<Vocabulary, …>` — never a Set, a
ternary chain or a `switch` with a `default`.** A partition that does not name a member decides it silently, and the
decision is invisible both to the reviewer (no line says "FL → this") and to the compiler (a new member type-checks).
An explicit `null` value is fine: it is a reviewed answer, not an omission. The tell: a vocabulary-keyed choice whose
source text lists fewer members than the type has.

## Also Applies To

- Every copy selection keyed by a reading, a route, an outcome state or a household shape (the spend help's key
  choice, `spendHelpKeyFor`; every renderer of the outcome-state enum).
- [[086]] — splitting a copy key into gated variants orphans every renderer not re-pointed; a Record makes the
  orphan a compile error.
- [[081]] — a mirror that re-derives a producer's inputs forks at its first early return; two hand-typed partitions
  of one vocabulary are two mirrors.
