---
title: Two defects that only the un-filtered run and the real frame could see
date: 2026-08-05
phase: Act 4 — the recommendation surface
modules: [src/ui/__tests__/devSeeds.test.ts, src/ui/money.ts, src/ui/copy.ts]
tags: [vitest-timeout, test-isolation, formatter, rounding, real-frame-verification, false-green]
---

## Problem

Two unrelated defects, found within an hour of each other, that share a shape: **the check that would
have caught each one was never actually run against the thing it was checking.**

1. `pnpm test` was RED, and had been since the commit that introduced the failure three commits earlier.
   `devSeeds.test.ts`'s `'health'` witness failed with `Test timed out in 20000ms` — not an assertion.
   It passed every time anyone pointed a filtered run at it.
2. The new winning-plan card rendered `Converting ~$140,000 a year for 9 years` on a real solve whose
   crowned amount was anchored at ~$148,300. Every unit test was green on `"140,000"`.

## Root Cause

1. The test drives the real intake builder through the real engine. Its two sibling real-solve tests in
   the same block both carry an explicit `}, 60_000)`; this one shipped **without the argument**, so it
   inherited Vitest's 20s default. Measured in isolation on an idle machine: **18.03s** — a 1.97-second
   margin that the full suite's file-level parallelism erases. The commit that added it planted and
   killed three mutants with targeted runs and never ran the suite.
2. `formatActionableDollar` shared the delta hero's step ladder — $100 / $1,000 / **$10,000** — on the
   stated ground that "the surface still speaks ONE small-figure dialect." That is an AESTHETIC argument
   sitting directly beside a docblock declaring the flooring itself "a CORRECTNESS RULE HERE, NOT A
   PRESENTATION CHOICE." Above $100k the two collided: flooring to a $10,000 step discards up to $9,999
   **a year**, and this card's window is nine years.

## Fix

1. Added the sibling timeout, plus a warning on the `solveWitness` helper naming the trap for the next
   caller: the default is ~2s from this solve's isolated cost, and **green-when-filtered is not green.**
2. Ladder stops at $1,000; worst-case under-quote $9,999 → $999. Step size does not affect SAFETY at all
   — flooring a monotone metric clears its rail at any granularity — so the coarse step bought nothing
   and cost most of a recommendation. Re-walked: the same seed now renders `~$148,000`.

## Key Insight

**A test that passes when you point at it and fails when you don't is not flaky — it is a test whose
budget was never measured against its own cost.** Any test that drives a real engine, browser, or
network needs its timeout set from a MEASURED isolated run with headroom for parallel contention, and
"I ran the ones I changed" is not evidence the suite is green.

And on the second: **when a display rule is justified aesthetically but sits next to a correctness rule,
compute what the aesthetics COST on real data.** Rounding that is safe in direction can still be
enormous in magnitude — this one silently discarded ~$75,000 of the crowned move across the window. The
unit tests could not catch it because they pinned the ladder that was written, not the ladder that was
right; only the live figure made the number concrete enough to judge. Read the real frame as a user, not
as the author of the assertions.

## Also Applies To

- Every `solveWitness`-shaped helper: real-solve, real-browser, or real-IO tests anywhere in the repo.
  The repo already knows the sibling half of this (`verify:bundle` reads a stale `dist/`; a piped exit
  code returns tail's) — this is the same family on the time axis.
- Any humane-rounding dialect whose output is ACTIONABLE (a figure the reader re-types) rather than
  merely READ. `formatDeltaDollar`/`formatAbsoluteDollar` are read; `formatActionableDollar` is typed;
  `formatEnteredDollar` is quoted back. Match the dialect to the job, never to the neighbours.
- Copy on the same card: the first heading, "How this plan gets there", also survived every green test
  and died on the real frame — "there" has no referent, and the anaphora it leaned on was broken by the
  nameplate sitting between the hero and the card.
