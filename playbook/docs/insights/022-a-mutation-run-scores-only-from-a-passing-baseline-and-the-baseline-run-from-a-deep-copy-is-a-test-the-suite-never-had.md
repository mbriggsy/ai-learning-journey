---
title: A mutation run scores only from a passing baseline, and the baseline run from a deep copy is a test the suite never had
date: 2026-11-12
phase: the plan step's own skill (U1 to U3's reviews)
modules: [projects/archive/skills/ultramode-plan/lib/run-record.mjs]
tags: [mutation-testing, mutants, baseline, vacuity, scratch-copy, path-length, max-path, windows, git, core-longpaths, review]
---

## Problem

- **Mutants find vacuous fixes.** The U1 review's vacuity lens planted each mutant in a copy and ran the tests: a Rise taken over helper turns, a dropped effort field, a removed SECRET word. Each mutant that survived showed a review fix no test held.
- **A failing baseline kills everything.** U2's first scratch run read 38 of 38 mutants killed. Its copy lacked `bench/`, so the entry test failed on every run, mutant or not. With the copy fixed and a passing baseline required first, the true count was 37 of 38.
- **A failing baseline can be the code.** U3's suite passed from the short test path and failed 6 tests from the deeper scratch copy: git on Windows cannot open a path past 260 characters when `core.longpaths` is unset.

## Root Cause

- A mutant counts as killed when any test fails, so a run whose unmutated copy already fails scores every mutant as killed.
- A suite that only ever runs from one short path has never tested its own path lengths. The scratch copy was the first run from somewhere else.

## Fix

- Each surviving U1 mutant became a fixture.
- The harness runs the unmutated copy first and refuses to score unless it passes.
- U3's code hands git the bytes on stdin instead of a deep path (`hash-object --stdin --path=`, `commit -F -`), and a test forces a deep path.

## Key Insight

Run the unmutated copy first and refuse to score until it passes. When it fails, find out why before fixing the harness: the copy may be wrong, or the code may be. A run from a new place is a test of the code's assumptions about place.

## Also Applies To

- Any A/B or before-and-after harness: check that the control passes before reading the treatment.
- CI that runs from a short path while users install deep.
- Fault-injection runs: confirm the system is healthy before injecting.
