---
title: Single-sourcing by re-deriving a producer's INPUTS forks at its first early return — only the producer's OUTPUT cannot drift (and a regression witness unseen RED can be vacuous twice)
date: 2026-07-10
phase: Act 3 follow-up (the Medicare pricing unit — ultramode fold, wf_f185192f-11c)
modules: [ui, intake]
tags: [single-source, producer, early-return, disclosure, proxy, mutant, vacuous-witness, source-bind, medicare, counterfactual-run, producer-write, weakmap-memo, two-lists, host-list, clause-host, core-carries-decision]
---

## Problem

The Medicare unit shipped `medicarePriced = isDateRoute || healthcarePriced || medicareOnlyPriced`
in Result.tsx, commented "single-sourced with buildOverlay so enablement and disclosure never
drift" — both sides read the SAME predicate. Six review lenses independently converged on the same
defect: the SS-only $0-portfolio all-65+ household saw "Medicare's premiums for the two of you are
already in these numbers" over a run that priced NO Medicare at all.

## Root Cause

`buildOverlay` has a degenerate EARLY RETURN ($0 accounts + no premium + no income ⇒ NO overlay,
intakeMap.ts:700-705) that fires UPSTREAM of its `medicareOnly` branch. Sharing the predicate is
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

> **Out of date (corrected 2026-11-20):** the hero channel now reaches the divergence household. W9-R7's harness
> plants an answered draft (the `getSnapshot` wrapper in `src/ui/__tests__/resultPayCheckLine.test.tsx`), and since
> `2d0de57a` that file's "the hero reads the ANSWERED draft whole" list pins the hero's priced term behaviorally with
> it (its Medicare case). The source-bind in `resultControlDoors.test.tsx` still stands beside it.

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

## Extended (2026-11-23): build 2's three cases (a counterfactual run, a list two hosts test against, a host nobody listed)

The rule held three more times in build 2's copy, each in a new shape.

- **A counterfactual run is read through the producer's own write.** The check sentence's figure at the quote is the
  money picture of `writeConfirmedWorkingYearCost(d)`, the "Yes" tap's own write (`src/intake/workingYearQuote.ts`). A
  re-derived S − (quote − W) would drift from R8's cap. The cost: the re-confirmed draft is a fresh object, so the
  picture's own memo misses on every render, and `checkAtQuoteMemo` (a WeakMap keyed on the SOURCE draft, in
  `src/intake/workingYearLeftOver.ts`) carries it.
- **Two lists for one test drift.** Keep's condition on the W row (`workingYearCostKeepCondition`) tested a typed
  figure against a list of costs with no state income tax, while the Result door's list under the same $6,000 test had
  it, so a Pennsylvania household following the W row kept a figure about $4,600 too low (every working year $2,100
  cheaper). Two review lenses found it independently (L1-4, L3-1), refuter-measured; `360bea64` made the two lists one
  function (`workingCostHelpCountItems` in `src/ui/copy.ts`).
- **A fix that names its hosts misses the host nobody listed.** The walk-6 round review prescribed the moved left over's
  pair fix for two hosts (the Result's slot clause and the gate's moved line). The same words also ride a fired rules
  line as its clause (`leftOverClauseHost` on the Result, `composeReentry`'s clause host on the gate), and R1's refuter
  had called that host clean from the typed line alone. b9-5 (`5f96411d`) put the basis on the core every host already
  reads (`WorkingYearLeftOverMoved.typedBelow`, the typed-below line's own predicate), so all three followed with no call
  site changed; mutants P1 to P4 proved it.

**What the three add:** a host list in a prescription is a claim, and so is "these two lists say the same thing". Put
the decision, and the list a test reads, in the one core every host reads; then a host nobody named still follows.
