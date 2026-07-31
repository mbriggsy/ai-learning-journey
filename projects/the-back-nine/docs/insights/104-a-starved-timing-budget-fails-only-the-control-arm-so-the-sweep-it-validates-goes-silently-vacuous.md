---
title: A starved timing budget fails only the CONTROL arm — the sweep it validates goes silently vacuous
date: 2026-07-27
phase: Act 4 · U17 §S5
modules: [src/ui/__tests__/recSaveNoAutoWrite.test.tsx, src/ui/IntakeApp.tsx]
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

> ## ⚠️ UPDATE 2026-07-31 — THIS FIX DID NOT HOLD, AND THE SENTENCE THAT FOLLOWED IT WAS FALSE
>
> CI run `30599862965` red the same control again: **63 turns against the raised 60-turn budget.** The
> arm did its job — it announced that the sweep beside it had gone vacuous for that run — but the
> repair above only bought one cycle, because it re-priced the budget instead of removing what the
> budget was racing.
>
> **STRUCK: _"Pre-warming the module was considered and rejected: every arm asserts an empty IndexedDB
> as its first line, so warming the session would create the database."_** That is false, and believing
> it is what kept the real fix off the table for two cycles. Importing `vaultSession` resolves a
> MODULE; it opens nothing. Proof, all read end to end: `vaultSession.ts:19-20` declares
> `dbPromise`/`sessionPromise` as bare uninitialized bindings and the open lives in `getDb()` (`:23-25`);
> `db.ts`'s module scope holds only a string const, an arrow and `realmWriteChain = Promise.resolve()`;
> `session.ts`'s `new BroadcastChannel` is inside `createSession` (`:261`); `backup.ts` declares only
> functions. The test file already depended on this before the repair — it imports `openVaultDb`
> statically and its planted control asserts an EMPTY database list *before* calling it.
>
> **THE REAL FIX:** resolve the chunk in `beforeEach`, so the wall-clock stage leaves the timed window
> entirely. Measured on one Windows box, serially: **7 / 8 / 9 turns before, 1 turn after.** The poll
> and the `<= FLUSH_ROUNDS` certificate STAY — they are what will catch the next regression — but they
> now certify a residual instead of a chunk resolution.
>
> **TWO CLAIMS ABOVE ARE DEMOTED, NOT DELETED.** (a) The `~8ms` per-round price is regime-dependent:
> an *idle* `settle()` runs ≈16 ms/turn (a Windows timer-tick artifact), while the poll loop that
> actually times the import runs ≈4–6 ms/turn, because libuv has pending work. A single figure cannot
> describe both, and the budget is spent in the second regime. (b) **"CPU contention starved the
> turns" is now at most a contributing cause, not the established one** — the CI control arm is 293 ms
> total and carries no per-turn instrumentation, so the log is consistent BOTH with cheap CI turns
> (import ≈60 ms) and with contention making turns dearer. Do not close this as "starvation, solved";
> insight 106 exists to punish exactly that. What IS established is structural and machine-independent:
> **the budget was denominated in macrotask turns while the dominant stage was wall-clock, so no
> constant was ever portable.**
>
> The Key Insight below is untouched and still correct — only the mechanism and the rejected remedy
> were wrong.

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
