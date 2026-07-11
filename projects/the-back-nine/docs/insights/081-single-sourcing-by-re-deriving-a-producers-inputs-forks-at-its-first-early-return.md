---
title: Single-sourcing by re-deriving a producer's INPUTS forks at its first early return — only the producer's OUTPUT cannot drift (and a regression witness unseen RED can be vacuous twice)
date: 2026-07-10
phase: Act 3 follow-up (the Medicare pricing unit — ultramode fold, wf_f185192f-11c)
modules: [ui, intake]
tags: [single-source, producer, early-return, disclosure, proxy, mutant, vacuous-witness, source-bind, medicare]
---

## Problem

The Medicare unit shipped `medicarePriced = isDateRoute || healthcarePriced || medicareOnlyPriced`
in Result.tsx, commented "single-sourced with buildOverlay so enablement and disclosure never
drift" — both sides read the SAME predicate. Six review lenses independently converged on the same
defect: the SS-only $0-portfolio all-65+ household saw "Medicare's premiums for the two of you are
already in these numbers" over a run that priced NO Medicare at all.

## Root Cause

`buildOverlay` has a degenerate EARLY RETURN ($0 accounts + no premium + no income ⇒ NO overlay,
intakeMap.ts:468-473) that fires UPSTREAM of its `medicareOnly` branch. Sharing the predicate is
sharing the producer's INPUTS — and any input-level re-derivation silently forks from the
producer's actual decision at every early return, guard, or exception path the producer has (or
grows later). The bitter part: this unit was BUILT to kill insight 080's class (an age proxy
diverging from the pricing decision), cited 080 in its comments — and recurred the class one level
up, replacing "ages as a proxy for the gate" with "the gate's inputs as a proxy for its output."

## Fix

`spineMedicarePriced(d) = buildSpineParams(d)?.overlay?.healthcareEnabled === true` — the
disclosure reads the producer's OUTPUT (the exact builder the headline run uses; null builder ⇒ no
claim). Pinned as a chain: the behavioral divergence witness at the seam (intakeMap.test), the
note-iff-prop pins at the components, and a source-bind on Result's derivation line — because the
divergence household is STRUCTURALLY unreachable through every render channel the component
harness can drive: the hero needs a planted answer the door tests don't stand up (insight 029),
and every sheet channel needs an account, which destroys the divergence itself (the early return
requires $0 accounts). The source-bind was proven RED under a planted revert-mutant, then reverted.

## Key Insight

Two rules. (1) A "single-sourced, never drifts" claim between a producer and a mirror is only true
when the mirror reads the producer's OUTPUT. Sharing input predicates is proxy-by-derivation:
sweep every mirror for input-re-derivation whenever a producer gains an early return or a new
guard (020's first-consumer lesson at the derivation level; 044's comment-is-a-claim applies to
the "never drift" comment itself). (2) Never trust a regression witness you have not SEEN go red —
the first two witnesses here were vacuous for INDEPENDENT reasons (an un-planted surface; a
channel whose precondition destroys the divergence), and both passed green under the planted
defect. Plant the mutant first; a witness that never went red proves nothing.

## Also Applies To

- Every UI mirror of an engine/build decision (`xPriced`, `xEnabled`, `xApplied`): read the built
  params / the resolved answer's artifacts, not the draft predicates that feed the builder.
- Insight 080 (the same class one level down — ages as proxy); 020 (first-consumer gating); 029
  (structurally-zero assertions); 032 (the source-bind mechanism); 048 (undrivable render paths).
- Any test harness whose mocks make a surface unconditionally absent: an absence assertion there
  is green under every defect — pair it with a planted-red proof or move the pin to a drivable seam.
