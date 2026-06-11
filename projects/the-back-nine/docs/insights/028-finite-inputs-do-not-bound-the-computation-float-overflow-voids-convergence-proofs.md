---
title: Finite inputs do not bound the computation — float overflow voids a convergence proof (and the green test pinning it)
date: 2026-06-10
phase: P1·U3·M6 (the solver output contract + boundary review)
modules: [src/engine/simulate.ts, src/engine/taxOverlay.ts]
tags: [float-overflow, Infinity, NaN, convergence, validateParams, R19, domain-bounds, infeasible-sentinel, DND-009, saturation]
---

## Problem

M6's infeasible-sentinel work needed a reachability statement: can any `validateParams`-passing
input make the overlay throw mid-path? I derived a careful answer — NO: every known throw has a
gate mirror, and the gross-up's 128-pass cap is closed by *float saturation* (a monotone
contraction's iterates cannot 2-cycle, so they become exactly constant within ~95–105 passes at
ANY scale). The argument was sound enough to survive my own scrutiny AND get encoded into a
passing test ("a 1e200 SS benefit RESOLVES under the cap"). The boundary review's claim-refuter
then produced two counterexamples: a gate-valid **1e300 portfolio** that TRIPS the 128-pass cap,
and a gate-valid **900%/yr market mean** that RESOLVES with `Infinity` counted as a SURVIVING
terminal — crossing the wire in surfaces that explicitly contract DND/009 finiteness.

## Root Cause

The saturation proof silently assumes the iterates are **finite**. `validateParams` checked every
input for `Number.isFinite` but bounded no MAGNITUDES — and finiteness of inputs does not bound
the computation: a finite 1e300 portfolio compounds past `Number.MAX_VALUE` in a few gate-valid
years. Once a bucket is `Infinity`, the proof's premises die: `Infinity − Infinity = NaN` inside
the gross-up makes `|nextGross − gross| < ε` false forever (the cap throws), or — worse — the
overflow lands where nothing compares it and the run RESOLVES with `Infinity` as a survivor (the
calm-but-wrong-OPTIMISTIC escape). Every convergence/fail-loud story in the engine implicitly
held only on a bounded domain nobody had declared.

## Fix

Two layers (the two-layer rule applied to the engine's own float domain):
- **The cause — computable-domain bounds at the R19 gate** (`ENGINE_MAX_DOLLAR` 1e12,
  `ENGINE_MAX_MOMENT` 1.0, `ENGINE_MAX_HORIZON_YEARS` 120): far beyond any real household input
  (zero false-reject risk), they make mean-path compounding provably finite (ln(1e12)+120·ln 2 ≈
  111 ≪ 709) AND close the gross-up's convergence story by the plain eps-bound (~113 worst-case
  passes < 128) — the saturation argument is retired, not repaired.
- **The consequence — a per-path finiteness seam** at simulate's collection site (both arms,
  throw-or-nothing): any residual non-finite terminal/surface (the measure-zero stochastic tail,
  future cap drift) routes to the typed infeasible sentinel, never a resolved `Infinity`.

## Key Insight

**A convergence or fail-loud guarantee proved over "all finite inputs" is a guarantee over an
undeclared domain.** Float overflow re-opens every closed story: `Infinity` is finite-input
reachable by compounding, and its first arithmetic encounter yields either a non-converging NaN
or a silently-optimistic resolved result. Declare the computable domain as an explicit gated
bound (generous to users, provable to the math), then re-derive the worst case INSIDE it.
Meta-lesson (insight 026 one level up): the refuted claim was not a fix but a THEORY — already
encoded in a green test. A green test pinning a wrong premise is worse than no test: it
manufactures confidence. Adversarial verification must target the synthesizer's *arguments*,
and "the strongest input I could imagine" (1e200 SS) is not "the strongest input" (1e300
principal — a different axis entirely; the probe sampled one regime, insight 006's lesson again).

## Also Applies To

Any iterative solver whose cap was justified by analysis (the ACA bisection, future solvers);
any engine accepting user magnitudes without upper bounds (percentile math, compounding
projections); any DND/009-style "finite on the wire" contract — finiteness must be enforced at
the OUTPUT seam, not assumed from input checks; WASM promotion (the same domain bounds must
carry over — fixed-width arithmetic changes where overflow lands, not whether).
