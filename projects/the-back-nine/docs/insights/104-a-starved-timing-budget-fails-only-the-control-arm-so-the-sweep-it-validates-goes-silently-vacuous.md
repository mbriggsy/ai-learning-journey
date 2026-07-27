---
title: A starved timing budget fails only the CONTROL arm — the sweep it validates goes silently vacuous
date: 2026-07-27
phase: Act 4 · U17 §S5
modules: [src/ui/__tests__/recSaveNoAutoWrite.test.ts, src/ui/IntakeApp.tsx]
tags: [test-vacuity, burned-070, ci-only-failure, flush-budget, macrotask, non-vacuity-control, act]
---

## Problem

CI run `30277757106` went red on exactly one arm while the same commit ran 3164/3164 green on
Windows. The failing arm was not a feature test — it was `recSaveNoAutoWrite`'s **non-vacuity
control**, the arm whose only job is to prove that the negative sweep beside it ("no render, mount,
recompute, solve commit or draft edit ever writes a record") is a real refusal rather than an absent
door. It asserted the tap mints exactly once and got zero.

## Root Cause

The file shares ONE flush budget between both directions: `settle()` = `FLUSH_ROUNDS` macrotask turns,
each wrapped in `act()`. The gesture's `import('./vaultSession')` → `openVaultDb()` → session chain
measures **7–9 turns locally** against a budget of **30** — apparently 3× margin. Under a 3163-test
parallel run on ubuntu those turns are starved by CPU contention (the same shape this repo already
files against its heavy engine battery), and the chain did not complete inside 30.

**The asymmetry is the whole finding.** When the budget is starved:

- the NEGATIVE arms still pass — silence is exactly what they assert, and a starved run is silent;
- the POSITIVE control is the only arm that can fail.

So a starved run does not report "the sweep is unsound." It reports one broken control beside a
green sweep — and if that control is quarantined, re-run until green, or its budget quietly raised,
the sweep survives as decoration. Every arm in it passes on a machine where the code under test never
got the chance to misbehave.

## Fix

Not a bigger constant. The wait is inherently racy, so a larger number relocates the failure to the
next unlucky runner — and it was priced: at 150 the lifecycle arm blew vitest's 5s default outright,
because every round pays a full `act()` at ~8ms.

1. **The control POLLS to a 4× ceiling, then asserts its MEASURED cost `<= FLUSH_ROUNDS`.** This
   converts the sweep's soundness from an assumption into a per-run measurement: if the chain ever
   outgrows what the sweep waits, the control reds *loudly* instead of the sweep going quietly
   vacuous. A fixed budget on both sides can never surface that, on any machine.
2. **30 → 60**, with an explicit `{ timeout: 30_000 }` on each settle-heavy arm — the repo's own
   documented idiom for an arm whose local runtime nears the default.

Pre-warming the module was considered and rejected: every arm asserts an empty IndexedDB as its first
line, so warming the session would create the database.

## Key Insight

**A negative sweep and its non-vacuity control must not share an unmeasured budget — because the
failure mode is asymmetric.** Anything that starves the budget (CI contention, a slower runner, an
added `await` in the path) breaks only the control while leaving every negative arm green. The green
arms are then meaningless and nothing says so.

The repair is to make the control **measure** what the sweep **assumes**. A control that merely
asserts "the door opens" proves the door exists; a control that asserts "the door opened within the
budget the sweep concluded silence from" proves the sweep. Only the second survives a slow machine.

Corollary: a CI-only red on a control arm is never "a flake to re-run." It is the sweep beside it
announcing that it has stopped testing anything.

## Also Applies To

- Any `burned/070` control-arm pairing in this repo — `solveNoAutoSave`, the CSP header gate
  (insight 016), the copyGuard adversarial corpus, the CVD planted-fail probe.
- `waitFor`/`findBy` defaults in RTL, and any "flush N ticks then assert absence" helper.
- Polling gates outside tests: a health check that concludes "no errors" from a fixed window, where
  only the paired positive probe can reveal the window was too short.
