---
title: A producer's-output predicate must read the producer of the run the surface DESCRIBES — a sibling's producer transfers only for transform-invariant fields
date: 2026-07-17
phase: Act 3 (oracle lane — the O16 reconciliation pass, the ultramode fold's P1)
modules: [intake/intakeMap, ui/Result, engine/dateSearch]
tags: [producer-output, insight-081, predicate, date-route, window-gating, disclosure, preview]
---

## Problem

The O16 pass built `acaPricedForRun` with full insight-080/081 discipline — read the BUILT
overlay, never the draft; conservative false arms for the degenerate/unknown-age/Medicare-only
households — by mirroring the proven state sibling `pricedStateForRun` exactly: a route-safe
union over `buildSpineParams(d)?.overlay` and `buildDateInput(d)?.params.overlay`. The
ultramode review's correctness and adversary-boundary lenses independently converged on the
same P1: on the date route the base overlay's quote stream is positive for any member pre-65
TODAY, but the Roth preview the note sits beside runs the CROWNED candidate, whose transform
(`buildCandidateParams` → `healthcareStreams`) window-gates ACA to post-crown pre-65 years. A
work-to-65+ crown prices ZERO ACA years while the predicate read TRUE — so the note affirmed
"the income-based discount itself is already in these numbers" for a household whose run
prices no discount at all.

## Root Cause

"Read the producer's output" is under-specified when a route has TWO producers: the pre-sweep
base input and the per-candidate transform the answer actually runs. The state sibling reads
the base overlay VALIDLY — but only because `retirementState` is Y-invariant (the candidate
transform's destructure-and-respread never touches it). The quote stream is exactly what the
transform DOES touch. Copying the sibling's producer copied an invariance assumption that the
new field violates. The insight-081 class one level deeper: 081 was "the builder's inputs vs
the builder's output"; this is "the base producer's output vs the transform's output."

## Fix

`acaPricedForRun(d, crownedOffsetYears)` now reads
`buildControlPreviewParams(d, crownedOffsetYears)?.overlay` — the EXACT params builder the
two-arm preview beside the note executes (spine: the spine params; date: the crowned
window-gated candidate; no crown: null ⇒ conservative false, and the note only renders beside
a landed preview anyway). A work-to-65+ crown witness arm pins it (offset 8 ⇒ false, retire-now
⇒ true); the base-overlay mutant was planted red and reverted.

## Key Insight

A disclosure predicate must be keyed to the producer of THE RUN THE SURFACE DESCRIBES — for a
note beside a preview, that is the preview's own params builder, not the route's base input.
Before mirroring a sibling predicate's producer, name the field's invariance across every
transform between that producer and the described run: a Y-invariant field (retirement state)
may be read at the base; a Y-dependent stream (window-gated quotes, contributions, onsets) must
be read downstream of the transform. The tell at review time: the sibling analogy in the code
comment was doing load-bearing work the field couldn't support.

## Also Applies To

- Any future disclosure keyed off `buildDateInput`'s base overlay: `medicareOnsetSimYear`,
  `oopMedical`, accumulation streams are all transform-touched — read the candidate.
- The same trap in reverse: reading the crowned candidate for a claim about the SWEEP
  (all candidates) — the described run there is the sweep, not one candidate.
- Insight 080's family tree: 080 (a second producer of a flag), 081 (inputs vs output),
  088 (base producer vs transform output) — each is "the predicate and the run diverged at a
  seam nobody re-checked."
