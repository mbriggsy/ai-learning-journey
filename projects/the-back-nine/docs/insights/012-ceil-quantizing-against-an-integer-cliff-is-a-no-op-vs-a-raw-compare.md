---
title: Ceil-quantizing MAGI against an integer cliff does NOT absorb float noise — it equals a raw `>` compare
date: 2026-06-07
phase: P1·U3 (M3 Slice 5 — the integrated PTC value-correctness battery)
modules: [src/engine/healthOverlay.ts]
tags: [quantization, cliff, relational-branch, insight-010, float-noise, ACA, IRMAA, confidence-quantization]
---

## Problem

The 400%-FPL cliff branch quantizes before comparing: `Math.ceil(converged.magi) > cliffMagi`, with
`cliffMagi = 84,600`. The comment + the CLAUDE.md landmine ("quantize MAGI before the relational cliff
branch", citing insight 010 + the `confidence.ts` headline-quantization pattern) imply this ABSORBS
near-edge float noise the way `confidence.ts` quantizes the headline to a coarse grid before the
band-edge decision. While deriving the near-cliff fixture I found it does no such thing.

## Root Cause

`cliffMagi` is an INTEGER and the quantization grid is whole dollars — the SAME grid the threshold
sits on. For integer `N`: `ceil(x) > N  ⟺  ceil(x) ≥ N+1  ⟺  x > N`. So `ceil(magi) > 84,600` is
byte-identical in outcome to a raw `magi > 84,600` for every input. Bisection float dust at the exact
cliff (`84,600.0000003` vs `84,599.9999997`) flips the branch under BOTH forms equally — the ceil
adds nothing. Quantization only absorbs noise when its grid is COARSER than (or offset from) the
decision threshold (confidence.ts: a 1% grid under a band edge that does NOT land on a grid line). A
grid equal to the threshold's own grid is a no-op for the branch.

## Fix

None needed — the `ceil` is still CORRECT, just for a different reason than "noise absorption":
ACA-MAGI is a whole-dollar quantity (Form 8962), so discarding sub-dollar dust is right, and `ceil`
rounds toward "over the cliff" = the CONSERVATIVE direction (never overstate the subsidy → never
overstate survival; the cardinal calm-but-wrong guard). The near-cliff test was framed around what it
actually proves (sub-dollar cents quantize away; the boundary is at 84,600 inclusive and sharp), not
the false "noise can't flip it at the exact cliff" claim.

## Key Insight

**Quantizing to the same grid a threshold lives on is a no-op for a relational branch.** Before
trusting "quantize before the compare" to stabilize an edge, check whether the grid is actually coarser
than / offset from the threshold — otherwise `quantize(x) ⊕ N ≡ x ⊕ N` and you've added a comforting
line of code that changes nothing. Exact-threshold inputs are measure-zero in real (float-messy) runs
anyway; lean on the conservative ROUNDING DIRECTION, not on the quantization "absorbing" the edge.

## Also Applies To

M4 IRMAA — its MAGI step-thresholds are integers; do NOT add a `ceil`/`round` "for noise protection"
expecting it to stabilize an exact-threshold MAGI (it won't). Any step-function / cliff with an
integer (or grid-aligned) threshold. Cross-check against [[010-nan-passes-a-relational-guard-because-every-comparison-with-nan-is-false]]
(finiteness-first still applies — a NaN MAGI is rejected before this branch) and the `confidence.ts`
headline quantization (which DOES help, because its grid is deliberately coarser than the band edge).
