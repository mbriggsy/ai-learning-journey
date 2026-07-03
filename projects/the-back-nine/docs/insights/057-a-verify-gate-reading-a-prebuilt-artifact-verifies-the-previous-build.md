---
title: A verify gate that reads a pre-built artifact verifies the PREVIOUS build — a stale dist/ is a false green
date: 2026-07-02
phase: P3 (U9b — the budget UI)
modules: [scripts]
tags: [verify-bundle, stale-artifact, false-green, byte-budget, gate-integrity, dist, build-freshness]
---

## Problem

Closing the U9b builder increment, `pnpm verify:bundle` reported **221.8 KiB — OK**,
byte-identical to the figure from BEFORE the session added a whole new component tree
(BudgetBuilder + BudgetLineItem + a stylesheet + ~60 copy entries, statically imported
into the entry). A green gate — for a bundle that could not possibly be unchanged.

## Root Cause

`verify:bundle` (`scripts/verify-prod-bundle.ts`) measures the modulepreload target in
`dist/index.html` — it **reads whatever build artifact happens to be on disk and never
builds or checks freshness**. `dist/` was two hours stale (the previous session's
build), so the gate faithfully verified the *previous* build against the budget and
stamped the *current* source green. Nothing lies anywhere: the script does exactly what
it says; the failure is the unstated premise that dist/ corresponds to HEAD. In CI the
premise holds (the pipeline builds first); run ad-hoc at a session boundary it silently
doesn't. The tell that saved it: a **byte-identical** figure across a change that had to
move it — suspicious enough to check `ls -la dist/` (timestamps 2h old) and re-run after
a fresh `pnpm build` → 225.2 KiB, still green, now genuinely.

## Fix

Fresh `pnpm build` before the verify (the honest number: 225.2 KiB ≤ 300). Filed as a
TODO landmine with the standing rule: **never quote `verify:bundle` (or any dist-reading
gate) without a fresh build in the same breath**. Prescription for the U9b close: chain
freshness into the gate itself — either `"verify:bundle": "vite build && tsx …"` or a
fail-loud staleness assert in the script (newest `src/**` mtime > `dist/index.html`
mtime ⇒ refuse with "stale dist — run pnpm build").

## Key Insight

A gate that reads a **generated artifact** verifies the artifact, not the source — its
green is only as current as the last generation, and it degrades silently because the
stale run *looks identical to a passing run*. Every such gate needs its generation step
chained in, or a freshness assert that refuses to measure a stale artifact (the
burned/070 shape: a verification that can silently no-op manufactures false confidence
— staleness is the no-op nobody plants a test for). And treat a **suspiciously unchanged
metric across a change that must move it** as a stop-the-line signal, exactly like a
suspiciously green suite: byte-identical output is evidence the measurement didn't run
against your change, not evidence the change was free.

## Also Applies To

- `verify:csp` / any e2e harness serving `dist/` — same premise; a stale dist tests
  yesterday's markup against today's claims.
- `verify:doc-stats` if it ever reads a generated coverage/count artifact instead of
  running the live suite.
- The DCE proofs ("grep dist/ for the dev passphrase = 0") — run against a stale dist
  they prove the PREVIOUS build was clean, not this one.
