---
title: The tests a change reaches are the ones a search finds, not the ones you remember — a hand-picked "reached files" run went green twice while CI went red
date: 2026-11-23
phase: The RightCapital mandate, gap 1 (the workbench's year-by-year table, U7)
modules: [src/ui/workbench/, src/ui/devSeeds.ts, src/ui/__tests__/, scripts/__tests__/breakpoint-mirrors.test.ts]
tags: [test-cadence, reached-tests, partial-run, ci-red, grep-the-tests, sweep-tests, hand-pinned-list, guard-tests, breakpoint-mirrors, dev-seeds, source-bind, readFileSync, moved-code, regex-pin]
---

## Problem

The project's cadence is "before a push: typecheck, lint, and the unit test files the change reaches" — never the whole
suite (CLAUDE.md, *Test cadence*). U7 slice 2 (b9-10) ran its own five test files plus IntakeApp and Result, 169 green,
and CI's unit job then failed three tests in two files nobody had named: U6's room test
(`src/ui/__tests__/workbenchRoom.test.tsx`, nearly the same name as the slice's own `WorkbenchRoom.test.tsx`; the
table's error state had drawn a second "Back to your answer") and the breakpoint guard
(`scripts/__tests__/breakpoint-mirrors.test.ts`: the stylesheet had added three new width seams where the project
allows one). The next session (b9-1) added one dev seed, ran the seed file and found its three hand-typed counts red,
then searched for every test that sweeps the seed registry: fourteen more files, one of which
(`stalenessExposure.test.ts`) pins the buildable date seeds by hand and went red on the new key.

## Root Cause

"The files the change reaches" was answered from memory, and memory lists the files that test the CHANGED module.
The tests that actually read a change are wider: tests that sweep a registry (`Object.keys(DEV_SEEDS)` and its kin),
tests that pin a hand-typed list or count of what a registry holds, guards that scan every file of a type (a
stylesheet's width seams, tokens, the two-pane floor), and a second test of the same component written by an earlier
unit under a near-identical name. None of them imports the changed file by a name you would think of.

## Fix

Before a push, find the reached tests by search, not by recall:
- grep the tests for each changed module's name AND for the registry or symbol it adds to (b9-1: grep
  `Object.keys(DEV_SEEDS)|Object.entries(DEV_SEEDS)|keyof typeof DEV_SEEDS` found the fourteen sweeps);
- add every guard that scans the touched file type (a `.css` change: `breakpoint-mirrors`, the token and two-pane
  guards; a copy change: `copyGuard`);
- run them in one background batch and read the log's own exit line (an `echo` after the command reports 0
  whatever the run returned).

## Key Insight

A partial run is only as good as the list it runs, and a list written from memory names the tests that test the
change, never the tests that READ it. The ones that read it (registry sweeps, hand-pinned counts, file-type guards,
an older twin test) are found by searching for what the change adds, not for what it is called.

## Also Applies To

- A new copy key: copyGuard's sample tables and any test that enumerates `copy` or `slots`.
- A new engine field on a shared row type: every fixture builder that constructs that type literally.
- A new route or phase: every test that enumerates phases or history states.
- The doc gates: a test count or a moved line is read by `verify:doc-stats`, which no unit file names.

## Extended (2026-11-23): a source-bind test reads a file by NAME, so a moved call reds it, and a moved derivation can leave it green on the wrong file

Some tests pin code by reading a source file and matching a regex (`readFileSync` of the caller). U13's first pass ran
only the touched suites and missed `src/ui/__tests__/stalenessExposure.test.ts` failing: it pins IntakeApp's
`deriveStaleness(...)` call shape by regex (insight 108: green-when-filtered is not green). U8 (b9-2) hit the other
direction: the Roth lever's live Medicare derivation moved from `Result.tsx` into `src/ui/editorSheets.tsx`, and
`resultControlDoors.test.tsx`'s pin still read `Result.tsx`, which kept other `spineMedicarePriced(` lines, so reverting
the moved line to the old age predicate stayed green (U8's review, lens A). Before changing a call's shape or moving
code, grep the tests for `readFileSync` of the file it lives in and for the function's name inside a regex; when code
moves, move its pin with it and keep the pin's negative arm over both files.
