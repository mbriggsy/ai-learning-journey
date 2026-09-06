---
title: test.fail() is the declared expected failure that reds the run the day the defect is fixed — the forcing function to delete the declaration with the remedy — but a timeout inside it is never an expected failure
date: 2026-09-05
phase: Act 4 hardening (the chart-text gate)
modules: [e2e/chart-text.spec.ts, playwright.fit.config.ts, e2e/reviewSurface.ts]
tags: [playwright, test-fail, expected-failure, known-defect, gate-hygiene, timeout, forcing-function]
---

## Problem

The gate found a real product defect (the readout's ink leaves its box on the 320 arm) whose remedy the council HELD for a cold read. A red gate cannot ship; `test.skip` hides the defect; deleting the arm loses it; a comment rots. And a first attempt at the declared arms then reddened CI anyway — the ladder instrument at 320 × root-20 hit the 120 s per-test budget on its way to the expected assertion.

## Root Cause

Playwright's `test.fail(condition, reason)` marks a test as EXPECTED to fail: the run stays green while it fails, and the run goes red when it unexpectedly PASSES — exactly the semantics a held defect needs. Two facts shaped the fix: (1) a timed-out test is reported as a failure regardless of `test.fail` (a timeout is never an expected failure), so the test must reach its expected red inside the budget; (2) once a test fails it stops, so any measurement the instrument exists to report must be taken BEFORE the expected assertion.

## Fix

`test.fail(isNarrowArm(arm), HELD_READOUT_320)` on the 320 readout arms and the root-20 ladder instrument, each naming the council entry. *(2026-09-06: the four readout declarations were deleted the day their remedy shipped — the measured flow-row seat; the ladder instrument's became a dated ACCEPTED bound instead of a `test.fail`, the other honest exit.)* The instrument tests measure and report first (`test.info().annotations` + a stdout line), assert last. The ladder instrument loads ONCE at root-20 (the CDP font-size emulation is per-target and survives navigation) instead of load-then-reload, halving its solve cost.

## Key Insight

A known, held defect belongs in the gate as a DECLARED expected failure, not as a skip, a deletion or a comment: the declaration is a forcing function — the day the remedy lands, the arm unexpectedly passes and the run reds until the declaration is removed. Two disciplines make it honest: the test must fail on its own assertion (never a timeout), and anything worth measuring is measured before that assertion.

## Also Applies To

- Any oracle whose remedy is a design fork waiting on a human read.
- Instrument arms that exist to produce numbers: annotate first, assert last.
- Per-test budgets in a suite where one test renders a CPU-bound solve twice.
