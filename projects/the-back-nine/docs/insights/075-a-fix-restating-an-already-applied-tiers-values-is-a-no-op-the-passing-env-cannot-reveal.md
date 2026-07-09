---
title: A fix that re-states values an existing tier already applies is a no-op — and the passing environment structurally cannot reveal that; prove the fix MOVES the measured value in the failing regime
date: 2026-07-09
phase: P3 (Act 3 · U13 ultramode fold — the CI-red saga)
modules: [ui/styles/confidence.css, e2e/vertical-fit.spec.ts]
tags: [css, cascade, density-tier, no-op-fix, ci-only-failure, text-metrics, cross-platform, verify-the-delta]
---

## Problem

The `?vault=stale` fit arm failed on ubuntu CI only (the R13 disclaimer at 804px vs the 791
fold) while passing three times locally on Windows. The first fix — a `:has()`-scoped
whitespace budget stepping the frame's gaps to `--space-3`/`--space-2` — passed every local
gate, shipped, and CI came back red with the disclaimer at the *byte-identical* 804. The fix
had changed nothing anywhere it mattered.

## Root Cause

The short-laptop density tier (`≤840px`, council 2026-07-08) already applies exactly those
token values at every viewport the fit law serves — including CI's 791px. The "fix" re-stated
the cascade's existing outcome, so computed values were identical before and after. Local
verification couldn't catch it: the local runs were green *before* the fix too (the failure
lives only in ubuntu's text metrics), so "local still green" carried zero information. Even the
drift simulation misled — its control arm `!important`-forced a 16px-gap world that never
exists at that viewport height, manufacturing a phantom 24px "recovery."

## Fix

Stepped the echo frame one token BELOW the density tier (rows/lead 12→8, notes 8→4) and — the
process fix — verified the change **moved the measured value** before shipping: computed
`rowGap` read 8px (was 12), the disclaimer bottom read 744 (was 776), and the simulated-drift
arm landed at 772 ≤ 791. CI went green on the next push.

## Key Insight

When a fix targets a failure you cannot reproduce (CI-only, prod-only), "all local gates still
pass" is vacuous — local passed before the fix too. The only meaningful pre-ship evidence is a
**measured delta**: read the computed style / resolved track / rendered geometry in the fixed
regime (or its closest simulation) and confirm it CHANGED by the intended amount. And before
writing any tiered/media-query CSS fix, check what the cascade already resolves to at the
failing condition — a tier you forgot about may already own the values you're about to
"introduce." Related: 033 (verify the gate's target when writing it) — this is its fix-side
mirror: verify the FIX's effect where the failure lives, not where the tests run.

## Also Applies To

- Any future density-tier adjustment: three tiers now touch the two-pane gaps (base, density,
  the echo `:has()` budget) — always probe computed values at the target viewport, never reason
  from the source tokens alone.
- Config/env fixes for CI-only failures (a setting the CI profile already overrides).
- The cross-platform text-metric class itself: the tightest frame is environment-dependent
  (self-hosted fonts still hint differently across OSes) — a frame within ~1 line-height of the
  fold locally is not proven until the CI arm passes on CI's own metrics.
