---
title: A test that builds its fixture paths with the code under test lets a mutant of that code move the fixtures out of the sandbox and into the real folder
date: 2026-10-22
phase: our-setup U3 step 8b (Q8's --bg arm in a trusted folder)
modules: [projects/hooks/tests/probes.test.mjs, projects/hooks/probes/lib.mjs]
tags: [mutation-testing, test-isolation, sandbox, fixtures, temp-dir, probes, cleanup, side-effects, review-rounds]
---

## Problem
Step 8b gave the probes one trusted folder in the real temp dir (`lib.mjs` `trustedDir()`) and taught `--cleanup` to take each run's folder inside it. Its tests made fixture folders under each test's own fresh temp root, and two mutation runs went 16/16 and 23/23 killed. The trusted folder was meant to be empty before the probe rerun, but `rmdir` failed. It held three test fixtures (`claude-probe-q8-bg-ccc333`, `...-xyz123/claude-probe-nested`, `other-name`), and the real temp dir held two more workspaces. Their times matched the two mutation runs to the minute.

## Root Cause
- **The tests built their fixture paths with the function under test.** `bgRunIn` and its siblings used `path.join(trustedDir(r.tmp), ...)`. Mutant M13 (`trustedDir` ignores its argument) sent every one of them to the real trusted folder. The tests still went red and the mutant counted as killed, but by then the folders were made. Fixtures that a cleanup test later deleted were gone. The three that tests only listed stayed.
- **A cleanup line after the first assert never runs once that assert fails.** Mutant M10 (`workspace` ignores `root`) made the `arm()` test's first workspace in the real temp dir. The test threw before its `rmSync`, which sat in a `finally` around a later block only.
- **Nothing looked at the real folders after a run.** A mutant counts as killed when the suite goes red. That says nothing about what the mutated code did to the disk on the way.

## Fix
- **Fixture paths are built separately from the code under test:** `const trustedIn = (tmp) => path.join(tmp, TRUSTED_NAME)` in four places. `trustedDir` is checked by its own asserts (`trustedDir(t) === join(t, TRUSTED_NAME)`), so M13 still fails the suite (4 tests now) without moving anything.
- **The `arm()` test cleans up everything it listed:** a `finally` over the whole body removes every entry in `ctx.made`, whichever assert failed.
- **The mutation script diffs the real roots:** it lists the real temp dir's `claude-probe-*` entries and the trusted folder's contents before the run and after it, and exits 3 with "SANDBOX LEAK" on any new entry. The rerun: 23/23 killed, "sandbox held". The five leaked folders were empty and were deleted by name.

## Key Insight
A mutant isn't only a wrong answer that tests catch. It is wrong code that **runs**, with the suite's privileges, before the assert that kills it. If a test computes where to write with the code under test, a mutant of that code decides where the test writes. So:
1. **Never derive a fixture's location from the code under test.** Build it from the test's own root, and assert the function separately.
2. **Put cleanup in a `finally` that covers the whole test,** keyed by what the code recorded, so a failing assert can't skip it.
3. **Diff the real roots around every mutation run.** "Killed" is about the verdict. Whether the run left the disk as it found it is a separate check.

## Also Applies To
- Any function a test uses to name a real location: a config dir, a home-relative path, a cache root, a log folder, a database URL.
- Mutation runs on code that deletes (`--cleanup`, prune, rollback). A mutant can delete for real, so run them on a copy and diff what they could touch.
- Tests that clean up in `after()`: a crash or kill skips it as well. Cleanup keyed by the code's own records is safer.
