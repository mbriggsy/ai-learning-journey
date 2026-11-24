---
title: A fixture's hardcoded calendar year is a wall-clock read, so every gate built on it expires on New Year with no code change — and ageing the fixture's start year forks the reads derived from it
date: 2026-11-23
phase: The one-frame composites plan (KTD1, KTD2; b9-4 and b9-5, 2026-11-20)
modules: [e2e/reviewSurface.ts, src/ui/devSeeds.ts, scripts/__tests__/playwright-harness-partition.test.ts]
tags: [wall-clock, calendar-year, new-year, fixture-date, page-clock, setFixedTime, pinned-clock, gate-day, seed-build-year, yearly-return, view-day, aged-plant, start-year-doctor, timezone, utc-noon]
---

## Problem

Every dev seed carried `startCalendarYear: 2026`, and the Result's plan clock is the wall year minus that year. On
2027-01-01 every fit plant would have rendered as a plan built last year, and the saved-record arms' standing line would
have dropped from 707 to 754.5 px, past the laptop's 731 px frame, with no code change. A learnings researcher traced the
read (b9-4, 2026-11-20), and Playwright's `page.clock.setFixedTime` measured the drop in two minutes.

The plants that already showed an older plan did it by ageing `startCalendarYear` (a "start-year doctor"). That forked
the engine's two birth-year reads (`?vault=stale` is pinned BORDERLINE "as found" for it) and was refused outright on a
priced state.

## Root Cause

A fixture year stays constant only while nothing compares it with today. The app dates the plan off the wall clock
(`currentEpochDay`), so a typed year in a fixture is one half of a subtraction whose other half moves. The harness
never pinned the page's clock, so every frame the gate certified was certified for this calendar year only. The
start-year doctor broke for a related reason: the start year is not one field but an input other reads derive from, so
changing it alone builds a household no real save produces.

## Fix

The one-frame composites plan's U1 (b9-5, closed in the register on 2026-11-20):

- Every harness that renders the app (fit, fit-rv and the Caddie walk) takes its `test` from `e2e/reviewSurface.ts`,
  which pins the page clock to `GATE_DAY` before each arm and reads the page's own day back when the arm ends. The pin
  is UTC noon of a local-calendar epoch-day, because the laptop reads Eastern time and CI reads UTC, and noon UTC is the
  same calendar day in both (a midnight pin reads as the day before on the laptop). `setFixedTime` fixes `Date` only,
  so timers and animation frames keep running.
- `GATE_DAY` is read from the source (`FIRST_UNAMBIGUOUS_SAVE_DAY`), never typed. `devSeeds.test.ts` binds
  `SEED_BUILD_YEAR` to its calendar year, so rolling the seeds' year is a named job (the register's *The seeds' build
  year is 2026…*, Tier 4), never a silent date bump. `scripts/__tests__/playwright-harness-partition.test.ts` reds any
  collected spec that takes `test` from `@playwright/test`.
- An aged frame is an explicit plant viewed later: `AgedPlant.viewDay` (`RETURN_DAY` for a yearly return), re-pinned by
  `pinPlantDay`. Viewing an unchanged plan a calendar year after its save gives the aged band, the aged-balances clause
  and a coherent "Saved in 2026" on any base, Pennsylvania included. A record on it is minted under its save's
  rulebooks, and its cause list is proven at the plant.
- Proven by planted faults, each predicted first: the fixture moved to 2027-01-02 reds `?vault=rec`'s standing line at
  754 px; a recorded day the page does not read reds the read-back; the build year set to 2025 reds the binding arm.

## Key Insight

Ask of every fixture: what date does it assume, and who reads the wall clock? A typed year anywhere a computation
subtracts it from today is a timer. Pin the clock in the harness, derive the pinned day from the source, read it back,
and make time travel an explicit plant (the same save viewed later), never an edited input.

## Also Applies To

- The unit suite's own wall-clock reads (the register's *The unit suite's own wall-clock reads on 2027-01-01 are
  unmeasured*, Tier 4): the engine is clock-free by lint; the UI and the store are not.
- Staleness clocks and the "Saved in" line: an aged state is a view day, never a doctored save.
- `verify:aca` and `verify:state-tax` are wall-clock timers on purpose, the honest kind, because each names its
  `nextDue`.
- [[073]] (a wall-time stamp in the save payload breaks byte identity on the same day).
