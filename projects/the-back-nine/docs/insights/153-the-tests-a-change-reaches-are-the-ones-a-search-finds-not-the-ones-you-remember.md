---
title: The tests a change reaches are the ones a search finds, not the ones you remember — a hand-picked "reached files" run went green twice while CI went red
date: 2026-11-23
phase: The RightCapital mandate, gap 1 (the workbench's year-by-year table, U7)
modules: [src/ui/workbench/, src/ui/devSeeds.ts, src/ui/__tests__/, scripts/__tests__/breakpoint-mirrors.test.ts]
tags: [test-cadence, reached-tests, partial-run, ci-red, grep-the-tests, sweep-tests, hand-pinned-list, guard-tests, breakpoint-mirrors, dev-seeds, source-bind, readFileSync, moved-code, regex-pin, slot-change, e2e-outside-tsconfig, coordinate-tap-arm, parallel-lanes, grep-by-field, import-search, path-reading-test, moved-surface, deleted-surface, e2e-selectors, live-copy-key, derive-from-registry, navModules, route-table, phone-menu, rc-screens, stale-expected-list, vacuous-guard]
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

## Extended (2026-11-23): a changed slot reds e2e arms no unit run reaches, and a lane sees only its own files

Three more ways the reached tests were wider than the list that was run.

- **A slot that changes what it says fails the arms that read it.** R1 (`3000a04c`) let the typed-below line take the
  Result's standing slot. The coordinate-tap fit arm (`?seed=date`, $72,000 typed under $84,000) still expected the
  line it displaced. Eight unlock arms ran green locally, and CI's full `verify:fit` failed that arm at both sizes
  (`9e9fec73` fixed it). Commit 2 of walk 7's round did it again: it changed the seat's figure and moved lines on
  typed-below drafts, the unit suite passed, and the same arm failed on both viewports in CI. The e2e specs sit outside
  the tsconfig, so neither typecheck nor a unit run sees them. Grep `e2e/` for every slot a change touches, whether
  removed, retyped or with new output, and run each arm whose draft reaches the new condition. (`docs/landmines.md`,
  the fit gate's slot bullet, carries the practice.)
- **Parallel lanes that each run their own files miss a test that reads the shape they changed.** In the walk-8 form
  spec's U2 (b9-3, `81f42077`, the typed-below line's year-paired ranges), three lanes went green on their own files. Only the full suite caught
  `src/engine/__tests__/typedBelowTaxRider.test.ts`, which asserted the near-line household's single 2029–2032 span,
  a span the new pairing split now cuts in two. Brief each lane with every consumer of the shape it changes, found by
  grepping the field (`.spans`), not the file name. Run the whole suite once before calling a composer change green.

## Extended (2026-11-24, Act 6's RC3 and RC4a): an import search misses the tests that read a file by path, and a moved surface is still driven by specs nobody opened

Two more misses, each by a builder whose own list was found by search, just not a wide enough one.

- **A source-bind test reads its file by PATH, so an import search never finds it** (b9-4, RC3, `2266e758`). The
  builder ran the 31 test files that import what it changed and missed `recSaveNoAutoWrite.test.tsx`, which reads
  `IntakeApp.tsx` with `readFileSync` and counted exactly one caller of the save gesture; Snapshot's Keep was a second.
  The orchestrator's run caught it. RC3 had 23 such path-reading tests. Find the reached tests by import AND by a
  `readFileSync` or path mention of each changed file's name.
- **A moved surface is still driven by e2e specs nobody opened** (b9-5, RC4a, `7f56682e`). RC4a deleted the old answer
  page, but `e2e/intake-fold.spec.ts` still pressed its `copy.assumptionDoorCta` door and `e2e/chart-text-rv.spec.ts`
  still waited for its invite. Both went red on CI (run 45441772275) while every run the builder and the orchestrator
  chose was green. Typecheck never sees `e2e/`, and the copy key still existed, so even the retired-key grep of
  [[086]] had nothing to find. When a surface moves or goes, grep `e2e/` for each of its copy keys and selectors, not
  only for keys being deleted.

## Extended (2026-11-25, Act 6's RC11 and RC12): when an e2e arm's claim is "matches the registry", derive the expected list from the registry, so there is no hand copy to find

Every fix above widens the search. This case is a hand-typed list that two builders missed while editing the file it
sat in, and the fix removes the list instead of searching harder for it.

- **What went red.** RC2's phone-menu arm in `e2e/rc-screens.spec.ts` asserted "the menu holds every page, in the
  nav's order" against seven hand-typed copy keys (`copy.shellPageSnapshot` through `copy.workbenchPageFacts`). RC11
  (`912caf66`) added Stress Test to the route table and RC12 (`c2ff8488`) added Asset Allocation and Tax Allocation.
  Each updated the route table's unit lists in `src/ui/shell/__tests__/routes.test.ts`, and each changed hundreds of
  lines of that same spec file for its own arms, but neither touched the menu list. CI run 45619245873, on RC11's
  commit, failed only `verify-fit` (the unit and RV chart-text jobs passed). The orchestrator's sweep missed it too, and
  RC12 landed before the fix, so the list was three pages short. Typecheck never sees `e2e/`.
- **The fix** (`897d4ac2`, b9-11). The phone menu is drawn from `navModules()` (`Shell.tsx` passes it through
  `TopBar` to `PhoneMenu`), so the arm now reads its expected labels from the same table:
  `navModules().flatMap((m) => m.pages.map((p) => p.label))`. The order stays pinned once, module by module, in
  `routes.test.ts`. A setup guard (more than 5 pages) stops the arm passing on an empty table. RC13 to RC20 each add a
  route, and none of them can red this arm with a stale list.
- **The lesson.** A hand copy of a registry inside a test is a second registry, and every new entry has to update it
  too. In `e2e/`, nothing flags a missed update before CI. When the claim is "the screen matches the registry", derive
  the expected list from the registry and pin the registry's contents in one place, its own unit test. Keep a hand list
  only where the content itself is the claim (these pages, by these names): a derived list there would agree with
  whatever the registry says, wrong or not. Give a derived list a non-empty guard, so it cannot pass on nothing.
