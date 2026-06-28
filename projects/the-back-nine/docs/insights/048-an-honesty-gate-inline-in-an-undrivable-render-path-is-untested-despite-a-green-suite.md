---
title: An honesty gate inlined in a render path the test env can't drive is untested despite a green suite
date: 2026-06-28
phase: P2 (D2 — the band hover/scrub tooltip)
modules: [src/viz/ConfidenceBand.tsx, src/viz/bandData.ts, src/viz/bandGeometry.ts]
tags: [testability, honesty-gate, pure-seam, jsdom, getScreenCTM, render-time-decision, calm-but-wrong, planted-fail, ultramode-review]
---

## Problem

The band scrub readout withholds crisp dollars on a dead cohort — `thin = (cohortFraction ?? 1) <
COHORT_FADE.full` → show a calm note instead of `$X` (the cardinal-rule guard against a confident
"$1.5M at age 97" on a handful of surviving couples). It worked live in Chromium. Yet the ultramode
review (8 lenses, **unanimous** #1 finding) flagged it: the gate had **zero** automated coverage, and
a regression that flipped `<`→`>`, dropped the branch, or moved the threshold would ship with all 1313
tests + lint + typecheck **green** — silently reintroducing the exact calm-but-wrong sin.

## Root Cause

The decision was wedged **inline in a non-exported render component** (`ScrubReadout`), and that render
path was **structurally undrivable in jsdom**: the scrubber only mounts after `onPointerMove → locate`,
and `locate` calls `e.currentTarget.getScreenCTM()`, which jsdom returns `null` for (the component
correctly bails — `if (!ctm) return null`). So no `fireEvent.pointer*` can ever set `idx`, the readout
never renders, and no assertion can reach it. Meanwhile every **sibling** decision in the same module
(`nearestLatticeIndex`, `cohortFadeOpacity`, `placeReadoutBox`) was a pure, planted-fail-tested helper.
The one render-time honesty decision was the lone exception — invisible to the suite, so its green said
nothing about it. ("Verified live" proves it works once; it is not a regression guard.)

## Fix

Extract the decision into pure, exported helpers and leave the component only the dumb wiring:
- `isThinCohort(cohortFraction)` in `bandGeometry.ts` — bound to the SAME `COHORT_FADE.full` onset as
  the visual fade (a test asserts both switch at the threshold, same direction).
- `composeReadoutLines(labels, row, thin)` in `bandData.ts` — returns `{text, kind}[]`; the component
  maps `kind → className` and nothing else. Planted-fail control: `thin ⇒` the row's `low/median/high`
  figures are **absent** (assert NOT-contains, not just note-present).

Secondary (same review): `placeReadoutBox`'s flip used a magic `0.6·PLOT_W` threshold **wider** than the
box-clip boundary, so the opaque readout box clamped back over the live scrubber rule for the dead-center
lattice vertices; the edge-only test was **vacuous** (the clamp never fired at i=0/i=48). Fixed by
deriving the flip from box-fit (`scrubX + GAP + boxW > PLOT.right`) and **sweeping all 49 vertices** in
the test (rule x never inside the box), plus a case that forces the clamp.

## Key Insight

A correctness/honesty gate **inline in a render path the test environment can't drive** is effectively
untested no matter how green the suite is — and a coarse-grained "it renders" smoke test won't reach it.
Extract the *decision* to a pure seam that carries its own planted-fail control; the component keeps only
presentation wiring. The tell: a module where every other decision is a tested pure helper and one lives
in JSX — that one is the gap. And a guard's test is vacuous if its load-bearing branch never executes for
the inputs asserted (sweep the discrete domain, not just the endpoints — [[029]]).

## Also Applies To

- Any render-time honesty/precision/withhold decision (verdict-state copy selection, error-vs-silent
  branches, the survivor-readout suppression) wedged into a component jsdom can't mount.
- `getScreenCTM`/layout-dependent interaction code generally — the pointer→DOM math is undrivable in
  jsdom; push the *decision* out and cover the *wiring* with a live/e2e pass.
- Sibling of [[015]] (only a generative adversary finds mutation-survival seams) and [[038]] (the same
  band's CVD honesty needs a planted-fail, never trusted prose) — the band's "every honesty arm carries
  a planted-fail control" bar, here applied to a *render-time* arm.
