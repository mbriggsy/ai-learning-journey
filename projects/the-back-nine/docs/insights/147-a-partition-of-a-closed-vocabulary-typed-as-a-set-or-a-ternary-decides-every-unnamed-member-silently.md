---
title: "A partition of a closed vocabulary typed as a Set or a ternary decides every UNNAMED member silently — the state-tax reading's two homes lumped Florida with North Carolina (\"either way\" where the run only flatters) and would drop a line for any reading added later; an exhaustive Record<Vocabulary, …> names every member once and makes tsc find every home"
date: 2026-10-31
phase: the pay check's whole-file review (Phase C, b9-9) — advisory a3, findings c6 / c7, rulings 41 and 42
modules: [src/ui/assumptionRegistry.ts, src/intake/WorkingYearLedger.tsx]
tags: [typescript, exhaustive, record, partition, vocabulary, set-membership, ternary, default-arm, copy-selection, compile-time, sign-partition, tie, zero, percentile, fan-place, slotOf, stop-line, account-kinds, inherited-ira, type-level-test, control-arm, exported-tuple, type-checker-scan, slice-order, compiler-forced, refusal-list, questions-owed]
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

> **Out of date (corrected 2026-11-27):** `src/intake/WorkingYearLedger.tsx` (this insight's `modules:`) was deleted
> with the walk at Act 6 · RC14 (`c43d7a50`). The current `STATE_TAX_IN_W` homes are `src/intake/workingYearLedgerRows.ts`
> and `src/intake/workingYearQuote.ts`; `WORK_STATE_KEY` still lives in `src/ui/assumptionRegistry.ts`.

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

## Extended (2026-11-23): a numeric comparison is a closed vocabulary too, and its unnamed member is the tie

The same silent decision happens with no type in sight, wherever code sorts a number into words by its sign or its
place:
- **Signs.** A working year's figure is short, exactly zero, or left over. Year 0 at exactly $0 is neither short nor
  left over, and folding it into `firstShort` printed "comes up $0 short" (mutant E6, `workingYearLeftOver.ts`). The
  partition had three members and the code named two. ([[146]]'s zero grain decides what "exactly zero" means.)
- **Places against a fan.** The first run of `scripts/measure-one-future.ts` (b9-8, U4's measurement) printed 141 stop
  lines saying the rough future sat above the middle line. Every one was $0 against a band whose percentiles were all
  $0 (the futures out of money), placed "over p90" by strict less-than slots. A total equal to a percentile sits at
  it, and a year where the run and the middle line are both $0 is counted apart (`slotOf`, `tiedAtZero`).

**Rule:** when a comparison turns a number into words, list its members, the tie and the zero included, and put the
tie rule in the slot function itself, never in the reader. Before believing a stop line or a printed place, read the
numbers it was computed from.

## Extended (2026-11-27, gap 3's inherited IRA, b9-1 to b9-10): four ways a growing vocabulary still leaks past the Record

Gap 3 added `inherited` to the account kinds, and four lessons came out of it.

- **A test that every home fails to compile when the vocabulary grows needs a control arm, and a plant that keeps the
  tree compiling** (b9-2, U10's type-level arm in `src/shared/__tests__/accountKindHomes.test.ts`, `e786a4ba`). The
  control proves the tree compiles clean inside the same declarations, so a program that cannot resolve a module, which
  reds every arm, never passes as "every home failed". A `Partial<…>` or `Record<string, …>` plant on a home reds the
  control first under `noUncheckedIndexedAccess` and proves nothing about the grown arm. The realistic regression, a
  hand-typed union beside the vocabulary, compiles today, and the grown arm drops exactly that home (13 of 14). A closed
  vocabulary that other code iterates needs ONE exported tuple, as `ACCOUNT_KINDS` is, or each hand-typed copy omits a
  member silently.
- **A scan for a choice decided by omission keys on the type checker, never on literal text** (b9-1, U10). The literal
  `'hsa'` lives in four vocabularies here (account kinds, tax buckets, icon names, deposit families), and a grep of kind
  literals in comparisons flagged buckets and icons beside kinds. Asking the checker whether every string-literal member
  of a compared type is an `ACCOUNT_KINDS` member separated them exactly, and a planted bucket comparison on `'hsa'`
  stays quiet.
- **Exhaustive records pull every home into the commit that extends the vocabulary** (b9-5, U13's schema step
  `d55681ab`). U13's plan split its slices by file, giving slice 2 Snapshot, Balance Sheet, Tax Allocation and
  Blueprint's legend. But `KIND_BUCKETS` gaining `inherited` made each of those fail to compile in slice 1's schema
  commit, and their honest look was design work still to do. The fix was a typed hold per page
  (`Exclude<KindBucket, 'inherited'>`, since lifted) and a reorder: the screens before the drawer that makes the kind
  reachable. Order slices by what the compiler forces and by what each commit makes reachable, never by file list, and
  have a plan that extends a closed vocabulary list the homes its own records will force.
- **A refusal list in a plan is a list of questions owed** (b9-10, gap 3's review). KTD17 named "a trust or estate"
  among the refused cases, but the decision tree had no question that could reach it, so an IRA that came through an
  estate ran on the heir's ten-year rule, which is rosy. The vocabulary leaked where the plan named the case in prose
  and no code asked for it. Check that each refused case has the question that refuses it, with a test per refusal
  reason keyed by `InheritedRefusal` (`src/intake/inheritedIraQuestions.ts`).
