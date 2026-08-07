---
title: The verification passed because it never actually ran
date: 2026-08-07
phase: machinery-rebuild
modules: [tests/, scripts/merge_picks.py, draft-kit/draft_engine.py]
tags: [testing, verification, tdd, silent-failure, tooling, characterization-tests]
---

## Problem

Two draft-day-critical guards were hand-verified across six cases in a scratch directory, and the
results were written into the commit message. A four-lens adversarial review then confirmed **18
findings** against that commit — including `picks.json` containing `null`, a case the plan had
**named as an acceptance criterion** and which did not pass.

Then, while fixing those, three more verification steps quietly did nothing. Four in one session.

## Root Cause

Every one was a step that **can silently succeed at doing nothing**:

| Step | How it no-oped |
|---|---|
| Six hand-run cases | Lived only as prose in a commit message. Nothing re-ran them, so nothing could catch the missing seventh. |
| A characterization diff | Baseline came from `git show HEAD:draft-kit/…` — but the repo root is `ai-learning-journey`, so the path was wrong, the file was **empty**, and "6 added, 0 removed" was measured against nothing. |
| A patch script | Used `str.replace`, which returns the string unchanged on no-match. **3 of 5 substitutions** silently did not apply. |
| A green test suite | Contained a `skip`. The skipped test was the only cover for the deep-suspect path, and it skipped because the fixture never triggered it. |

The commit-message case is the root of the other three: with no test file, every check was ad-hoc,
and ad-hoc checks have no failure mode when they don't run.

## Fix

Tests first, derived from the findings, written to fail before touching code. That immediately
exposed a fifth instance: several new assertions **passed for the wrong reason**, because they
asserted on whole stdout — and a board name appears in BEST AVAILABLE whether or not the warning
fired. Scoping them to the warning block turned "4 failures" into the true **10**.

39 tests at first, 46 after the last two findings, zero skipped.

## Key Insight

**A verification step must be able to fail loudly. If it can't, it isn't verification.**

Concrete rules this bought:

- Prefer tools that **error on no-match** (`Edit`) over ones that silently no-op (`str.replace`).
- Assert the **precondition** of a characterization test — a baseline that produces no output is a
  failed test run, not a clean diff. Check the byte count.
- A green suite with a skip in it **is not green**. A skip is untested behaviour wearing the same
  colour as tested behaviour.
- Scope an assertion to the region under test. `assertIn(name, whole_output)` passes whenever the
  name appears *anywhere*, which for any rendering of a list is always.
- "Verified" in a commit message means "I looked once." Only a file that re-runs means it.

## Also Applies To

- The board generator and schema gate (U4/U6): the gate must validate **all 174 rows**, because
  both known break modes are latent — a float `vbdDelta` passes an empty-picks smoke run and dies
  three picks in. A smoke test that cannot fail is the same bug as above, wearing a lab coat.
- The Nightly Feud's degrade path — it must be tested by deliberately removing cargo, not by
  waiting for a feed to die.
- Any future "I checked it by hand" claim in this project. Write the file.
