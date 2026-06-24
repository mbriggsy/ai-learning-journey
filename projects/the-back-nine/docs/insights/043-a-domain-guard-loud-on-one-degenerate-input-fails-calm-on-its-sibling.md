---
title: A domain guard that fails loud on one degenerate input but calm on its sibling returns a plausible wrong answer
date: 2026-06-24
phase: P2 (Act 2 — Where You Stand)
modules: [src/viz/bandGeometry.ts, src/viz/bandData.ts]
tags: [fail-loud, domain-guard, calm-but-wrong, finiteness, scale, viz, confidence-band, latent-landmine, ultramode-review, R19]
---

## Problem

The U6 confidence-band ultramode review constructed a healthy fan (p10 $1M, p90 $2M, never
depleting) and rendered it at `dollarMax = 0`. It drew `M78,372L540,372L540,372L78,372Z` —
**byte-identical to a totally-ruined ($0-everywhere) household.** A fine household painted flat on
the $0 ruin baseline: the single most important honest signal, inverted. No error, no warning.

## Root Cause

`yForDollars(dollars, dollarMax)` guarded its two degenerate-input classes **asymmetrically**:

```ts
if (!Number.isFinite(dollars) || !Number.isFinite(dollarMax)) throw new RangeError(...) // LOUD
if (dollarMax <= 0) return PLOT.bottom                                                  // CALM
```

Both a non-finite ceiling and a non-positive ceiling are the *same class of caller bug* — a
degenerate y-axis scale. But the non-finite branch threw, while the non-positive branch returned a
**valid, in-range coordinate** (the plot floor). `t = v / dollarMax` would divide by zero, so the
`<= 0` line was written as "defensive" — and that defensiveness *is* the bug: it resolved a
degenerate scale to a drawable point on the ruin line. The same shape lurked in `xForYear`
(`horizonYears <= 0 → PLOT.left`). Latent today (no producer builds a real fan yet), but it lives
in a **pure leaf function any caller hits** — unlike the review's other findings, which sit at the
unbuilt U7 producer seam and only arm when it lands.

## Fix

Make `dollarMax <= 0` and `horizonYears <= 0` **throw**, mirroring the non-finite guard — a
degenerate scale has no honest state behind it (unlike a real $0 *datum*, which is a true ruin
signal), so it must refuse to draw. Regression tests assert both throw. Separately strengthened the
sibling guard `isFixedLattice` to also reject inverted (`p90 < p10`), negative, and non-finite
percentiles, proven by a new `bandData.test.ts` (it was dead, untested code).

## Key Insight

**When a function fails loud on one flavor of degenerate input, audit its *sibling* degenerate
inputs for the same treatment.** An asymmetry — loud on `NaN`/`Infinity`, calm on `0`/negative — is
a calm-but-wrong landmine, because the calm branch returns a *plausible in-range value that reads as
a real answer*. The honesty test is not "did it avoid a crash / a divide-by-zero" but "does the
returned value misrepresent reality." A scale/ceiling/denominator parameter that is zero or negative
is never a drawable state; only a real *measurement* of zero is. The asymmetry itself is the tell.

## Also Applies To

- Any normalize/project/scale function (`value / max`, `x / range`, percent-of-total) where the
  denominator can be 0 or negative — and rate/ratio denominators generally.
- The finiteness-first / R19 family ([[010-nan-passes-a-relational-guard-because-every-comparison-with-nan-is-false]],
  [[008-nan-survives-nullish-coalescing-in-an-unguarded-input-stream]],
  [[039-an-unguarded-actuarial-window-leaks-both-a-nan-and-a-negative-benefit]],
  [[028-finite-inputs-do-not-bound-the-computation-float-overflow-voids-convergence-proofs]]):
  the guard must cover the *whole* invalid domain, not the loudest corner of it.
- Review triage: a domain bug in a **pure leaf** is LIVE even when the component is unwired; rank it
  above producer-seam findings that are latent until their caller exists (cross-ref
  [[042-a-doc-cleanup-from-the-ledger-proves-coherence-not-currency]] on reachability vs. kind).
