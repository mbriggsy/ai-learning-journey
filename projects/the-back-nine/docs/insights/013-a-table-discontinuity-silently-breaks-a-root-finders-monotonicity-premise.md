---
title: A discontinuity in a sourced table silently breaks a root-finder's monotonicity premise — segment the bracket at the jump
date: 2026-06-07
phase: P1·U3 (the U3-exit code-review pilot — the first formal ce:review pass on src/engine/**)
modules: [src/engine/healthOverlay.ts]
tags: [fixed-point, bisection, monotonicity, discontinuity, ACA, IRMAA, optimizer-curse, calm-but-wrong, code-review-pilot, insight-006, insight-007]
---

## Problem

`solveAcaFundedGross` solved the same-year premium↔MAGI circularity by bisecting the residual
`r(P) = netPremium(P) − P` over `[0, enrolled]`, with a comment asserting `r` is "monotone DECREASING …
a unique root exists and bisection is unconditionally convergent." That premise is FALSE in the default
(2026 reverted) regime: the §36B applicable-percentage table JUMPS at 133% FPL (2.10% → 3.14%, a real IRS
discontinuity, correctly transcribed). As the candidate net premium `P` rises, ACA-MAGI rises; when MAGI
crosses 1.33×FPL the contribution jumps up ~$293, the PTC drops, so `netPremium(P)` — and `r(P)` — JUMP
UP. The residual is monotone within each band but not across the jump, so **two self-consistent equilibria
can bracket it** (an under-133% one at 2.10%, an over-133% one at 3.14%). The single bisection still
terminates, but converges to whichever root its midpoint sequence funnels toward — typically the more
expensive over-133% root — overstating the premium / understating survival, or biasing a solver ranking in
a band MAGI-management deliberately targets. No test, insight, or doc caught it; `TODO.md` even propagated
the false "monotone" claim. Every existing fixture passed because `flatMagi` holds MAGI constant (no
crossing) and `linearMagi` was only ever pointed at the 400% cliff, never the 133% kink.

## Root Cause

A root-finder's convergence guarantee rests on a **shape assumption about the function**, and that shape is
only as true as the data feeding it. Here the data is a sourced federal table whose legislated structure has
an upward step the algorithm's author didn't carry into the convergence reasoning. Bisection needs the
residual monotone on the bracket; an upward jump in `applicable%` injects an upward jump in `r`, voiding it.
The 400% cliff was hoisted into an explicit two-candidate branch precisely because it is a discontinuity —
but the 133% jump is the SAME class of hazard and was left inside the naive bisection. (Distinct from
[[006-gross-up-convergence-probe-wrong-regime]] / [[007-capgains-stacking-raised-convergence-k-and-broke-automatic-contraction]],
which are about the contraction RATE of the inner gross-up; this is about the outer residual losing
monotonicity entirely.)

## Fix

Make the solver table-driven about its own discontinuities. `applicablePctDiscontinuityFractions(table)`
returns the FPL fractions where a band's low % ≠ the previous band's high % (reverted: one, at 1.33;
enhanced: none — every band joins continuously). The solver maps each in-range threshold to the net premium
where MAGI crosses it (MAGI is monotone in `P`, so an inner bisection finds it), SPLITS `[0, enrolled]` at
those points, bisects each now-monotone segment, and returns the **cheapest feasible self-consistent root**
(the rational household's equilibrium — consistent with the existing under-cliff-over-over-cliff "pick
cheaper" rule). With no discontinuity in range — including the entire enhanced table — there is one segment
and the path is byte-identical to the prior single bisection, so every existing fixture is untouched.
Two subtleties: (1) at the exact split `P` the threshold belongs to the NEXT band, so sample each interior
upper edge at `hi − ε` to keep the segment on its own monotone branch; (2) continuous KINKS (slope changes
with matching endpoints) need no split — only true JUMPS do.

## Key Insight

**A root-finder inherits its data's discontinuities. "Monotone, unique root" is a claim about the function
ON the bracket, and a sourced step-table can falsify it without any code change.** When you hoist one
discontinuity out of an iterator (the 400% cliff), audit the table for EVERY other one — and prefer
deriving the split points FROM the table over hard-coding the one you happened to notice. A bisection that
"converges" is not the same as a bisection that converges to the RIGHT (or a deterministic, or the
cost-correct) root when multiple equilibria exist.

## Also Applies To

**M4 IRMAA is a step function** — its surcharge brackets are hard cliffs in MAGI; any solver/feed-forward
that searches over an IRMAA-affected quantity faces the same multi-root hazard at each step edge (and recall
[[012-ceil-quantizing-against-an-integer-cliff-is-a-no-op-vs-a-raw-compare]]: the integer-threshold ceil is
conservative-by-rounding, not noise-absorbing). More broadly: any fixed point / bisection over a quantity
whose cost curve is piecewise-defined from a sourced schedule (tax brackets crossing a deduction phase-out,
CSR thresholds at 150/200/250% FPL, the SS-torpedo inclusion kinks). Before trusting a monotonicity comment,
grep the table the residual reads for adjacent-band value mismatches. And the process lesson behind the
catch: a FRESH whole-layer review found this where per-milestone, stream-scoped adversarial reviews could
not — cross-cutting invariants (the residual's global shape) are invisible to a review aimed at one new
stream. (See `TODO.md` for the pilot's per-persona effectiveness verdict + the adopted review cadence.)
