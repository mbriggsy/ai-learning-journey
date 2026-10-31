---
title: A producer's-output predicate must read the producer of the run the surface DESCRIBES — a sibling's producer transfers only for transform-invariant fields
date: 2026-07-17
phase: Act 3 (oracle lane — the O16 reconciliation pass, the ultramode fold's P1)
modules: [intake/intakeMap, ui/Result, engine/dateSearch]
tags: [producer-output, insight-081, predicate, date-route, window-gating, disclosure, preview, input-vs-output-surface, draft-reading, scope-label, per-reading]
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

## Extended (2026-10-31) — input surfaces read the draft; output surfaces read the producer, per reading

Two Phase B cases sharpen which producer a surface must read:
- **Ruling 5 (b9-1).** KTD18 took the W question's state reading from the BUILT run, which is `undefined` on any
  unbuildable draft — so the W step would have told an NC household the opposite of the spend step, and staled its
  answer when a skipped question was filled. An INPUT surface reads the draft (`spendHelpKeyFor`'s doctrine), the same
  source as its sibling input surface; an OUTPUT surface reads the producer of the run it describes. Decide which a
  new surface is before copying a sibling's predicate.
- **The re-walk (b9-5).** "Income tax on that income" read as every income tax where the run charged federal only. A
  label is a claim about scope, and the producer owns scope: the fix read the run's own state slice. The chair's first
  rule (point at W only where the slice is $0) was wrong for PA, whose run prices its tax on investment income and
  leaves its tax on pay to W. A real-seed arm per reading (NC / PA / unpriced / FL) caught it before landing. Key the
  words to what the producer did, per reading — never to one inferred proxy ([[147]] types that partition).
