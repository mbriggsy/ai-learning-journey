---
title: An absence-wait cannot synchronize — it is green BOTH before and after the awaited event, so it must be proven to WAIT
date: 2026-07-08
phase: P3 (Act 3 — the vertical-fit gate)
modules: [e2e, src/store, src/ui]
tags: [e2e, playwright, synchronization, vacuous-wait, provisional-final, tier, adversarial-review, falsifiability]
---

## Problem

The new vertical-fit gate's `gotoSeedFinal` claimed "EVERY measurement waits for the FINAL
engine tier" and implemented it as `expect('.fod-provisional, .cs-provisional').toHaveCount(0)`.
The gate ran green 13/13, and 10 planted layout mutants all went red — the gate looked
falsifiability-proven. The adversarial review then found (three lenses independently, 6/6
refuter votes) that the wait was a permanent no-op: it resolved in milliseconds and the gate
was measuring the PROVISIONAL frame.

## Root Cause

Those classes NEVER render on the result hero — `selectElevatedAnswer` builds the hero views
"provisional-free by construction" (its own docstring says so). I conflated the intake
AnswerStrip's provisional tag with a hero tag that does not exist. So the count was 0 at first
paint, 0 during the provisional window, and 0 after the final: **an absence-wait is satisfied
both BEFORE the awaited event fires and AFTER — it can only synchronize if the element
provably EXISTS in the intermediate state, which nothing checked.** The gate stayed correct
by an unstated accident: the spine route ignores the tier (provisional ≡ final byte-identical),
and the only tiered route was asserted order-only. The layout-mutant proof could not catch
this — every mutant broke the FRAME, none broke the WAIT, and the wait's failure mode is
"measures too early," invisible when early and late frames coincide.

## Fix

Made the synchronization real and falsifiable: `ModelAnswer`'s resolved arms carry a REQUIRED
`tier` (memoryModel stamps which recompute committed — the compiler holds the door on future
commit sites), `Result` mirrors it as `main.result[data-answer-tier]`, and the gate waits for
`"final"` (plus a finite-animation settle for the reveal's real translateY enter). Proven both
directions: a hardcoded-`'provisional'` mutant reds the store pin AND times out the e2e; and
the dip arm's runtime jumped 6.8s → 37.0s — the observable proof the wait went from no-op to
actually waiting for the 16k-path final sweep.

## Key Insight

**A synchronization wait is a claim with the same falsifiability obligation as an assertion —
prove it WAITS.** Absence conditions (`toHaveCount(0)`, "element gone", "attribute cleared")
are the treacherous shape: green before the event, green after, so they pass vacuously when
the element never existed on that surface at all. Two disciplines: (1) prefer waiting for the
PRESENCE of a state that only the awaited event mints (a stamp the producer writes), never the
absence of a transient; (2) demand observable evidence the wait costs time when the event is
slow — a wait whose runtime never moves when the awaited work gets 10× slower is a no-op. And
when a wait is discovered vacuous but the tests still pass, name the accidental invariant that
was protecting you (here: spine tier-invariance) — it is load-bearing and unstated, the exact
shape that breaks silently later.

## Also Applies To

Any provisional→final / skeleton→hydrated / spinner-gone wait in Playwright or Testing
Library (`waitForElementToBeRemoved` on an element that never mounted); polling loops that
wait for a flag to clear rather than a completion token to appear; the insight-016/029 family
(vacuous assertions) extended to the SYNCHRONIZATION layer; any e2e whose per-test runtime
does not change when the awaited backend tier/job is made dramatically slower.
