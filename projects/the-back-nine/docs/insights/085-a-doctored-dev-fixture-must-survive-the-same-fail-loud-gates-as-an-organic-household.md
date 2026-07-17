---
title: A doctored dev fixture must survive the same fail-loud gates as an organic household — and every doctor needs an engine-acceptance pin
date: 2026-07-16
phase: the state-carrying seed increment (post state-tax unit)
modules: [src/ui/devSeeds.ts, src/engine/simulate.ts, src/ui/__tests__/devSeeds.test.ts]
tags: [dev-seeds, aged-vault, doctorStaleVault, validateParams, priced-state, R19, fail-loud, fixtures]
---

## Problem

The new `?vault=statestale` plant (the NC household aged ~2 years via the existing
`doctorStaleVault`) unlocked and gated correctly — but after the affirm, the recompute rendered
the AnswerStrip FALLBACK ("Your answer takes shape as you go."), no verdict hero, no NC clause.
`data-answer-tier="final"` was present, every unit test was green, and the un-doctored control
(`?vault=stale`) rendered a full verdict. Caught only by the fit builder's insight-033 live
drive, *before* the arm was pinned.

## Root Cause

The full doctor ages `startCalendarYear` −2 (→ 2024) for save-moment coherence. The engine's own
priced-state lower bound (`simulate.ts:640-643`, added by the state-tax unit's ultramode fold —
its comment literally names "an aged dev plant" as the anticipated caller) REFUSES a priced-NC
household whose year-0 precedes NC's earliest rate row (2026), demoting the run to the R19 calm
indeterminate. The engine was right both times: the doctored household was **organically
impossible** — `retirementState` shipped 2026-07-15, so no genuinely-2024 save could carry it.
The doctor fabricated a household outside the domain the engine prices, and nothing pinned that
the doctored output was *engine-admissible*: the plant's tests proved the clock FIRES
(staleness) and the badge reads CLEAN (identity) — never that the engine would accept the
scenario at all.

## Fix

`statestale` rides its own light doctor (`doctorStateStaleVault`: `savedAt` −150d + the
household's own state profile diverged; `startCalendarYear` and all sibling vintages untouched),
recorded as a dated F2 supersession in the increment brief. The missing test class is now Arm 2
of the statestale battery: hydrate the doctored scenario → `buildSpineParams` →
`validateParams` accepts → the run resolves to a REAL `outcomeState` (never indeterminate).
The review fold completed the pair: `agedStateProfile` throws on a schedule-less state (FL can
never diverge) and `doctorStaleVault` throws on a priced-state base (prose became enforcement).

## Key Insight

A doctored fixture is a **new producer of persisted state**, and the engine's fail-loud gates
are part of its consumer chain. Every vault doctor therefore needs an **engine-acceptance pin**
— the doctored output driven through the real hydrate → build → validate chain to a real
outcome — alongside its purpose pins. And age a fixture only within the domain the engine
prices: a "coherently aged" household that predates the feature it carries is a contradiction
the engine will (correctly) refuse. When a deep fail-loud guard ships (insight 076's shape),
sweep the DEV FIXTURE producers too, not just the app's gates — the guard's own comment naming
"an aged dev plant" was written five days before an aged dev plant hit it.

## Also Applies To

Any fixture factory that back-dates persisted payloads (migration test corpora, seeded demo
tenants, replay archives); any dev/test writer of a shape the engine validates (`?seed=` drafts
already have this via the auto-iterated validator arm — the doctors were the unpinned writer);
future aged plants for units whose fields ship later than the plant's fabricated save date.
