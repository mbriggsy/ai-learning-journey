---
title: A contract transplanted between types carries its words but not its premise — and a tolerance whose population is empty fails open
date: 2026-07-25
phase: Act-4 · U17 S3 (the saved-recommendation record + the re-entry trichotomy)
modules: [src/shared/model.ts, src/shared/scenarioCodec.ts, src/store/savedRecommendation.ts, src/store/staleness.ts]
tags: [persisted-schema, absent-is-quiet, fail-open, calm-but-wrong, transplanted-contract, tolerance, staleness]
---

## Problem

S3's whole reason for existing was a fail-open hole. `deriveStaleness` compares the SCENARIO's five
vintage stamps against the current build's — but `scenarioFromDraft` **re-mints all five at every
save**, so a plan whose recommendation was saved under 2026 brackets and then re-saved after a
bracket change reads "no clock fired" while the remembered verdict was priced under superseded
rules. The fix was to give the record its own era snapshot and run the same comparator against
THAT.

The build did exactly that — and made the four stamp objects **optional**, carrying over the
scenario-level contract verbatim: *absent stamp = not-comparable = quiet, never coerced to
"unchanged."* Every `deriveStaleness` clock is gated on `saved… !== undefined`, so a record whose
era carried only `appDefaultVersion` decoded clean and pinned `rulesMoved: false` **forever** —
re-presenting a saved recommendation as CURRENT however far the rulebooks had moved. Conjunct 1
cannot backstop it: `solverRunFingerprint` excludes `consumedConstantEntries` **by design**, which
is the module header's own stated reason conjunct 3 exists.

The same fix, reintroduced one layer down. Two independent adversarial seats found it, and the new
test battery **pinned the fail-open direction as intended behavior**.

## Root Cause

The transplanted sentence was *true at its origin and false at its destination*, and nothing in the
sentence says so. On `ScenarioV3` the tolerance has a real population — a pre-U13 vault genuinely
predates the stamps, so absence there means "cannot compare," and refusing it would lock legacy
households out of their own plans. The record is born at U17, **after** all four stamps exist, and
its only minter writes them unconditionally. Absence has no population at all: it can only ever be
a minter bug.

A tolerance is a claim about a population. Copy the words without re-deriving the population and
you get a permanently-satisfied guard — which is indistinguishable from a working one in every
test, because no fixture can construct the case the premise excluded.

The direction is what makes it the cardinal sin rather than a nit: the identical rule that is
*conservative* on the scenario (stay quiet rather than cry wolf) is *optimistic* on the record
(re-present stale advice as current). The premise did not travel, and neither did the safe
direction.

## Fix

(`374299c9`) All five era fields **REQUIRED**; the codec validates each with no presence guard, and
a record that cannot say when it was priced drops via the non-fatal atom — the plan still opens.
Fail-CLOSED, matching conjunct 1's own treatment of the unanswerable case (`inputs-unavailable`).
The interface doc now **names the premise and where it fails**, rather than restating the rule. The
test that pinned the defect was rewritten, not patched — *a test that pins a defect is the defect's
second copy, not evidence* (the U17 chair's law, applied to this unit's own work).

Requiring the fields also made the exhaustiveness pin structural: the overlay is typed
`Required<Pick<ScenarioV3, keyof SavedRecommendationEraV3>>`, so dropping a key is TS2741 instead
of a green suite — which mattered, because a verifier proved deleting `appDefaultVersion` left the
entire suite green (one app-default era exists and it IS current, so that clock cannot fire).

## Lesson

**When a rule moves between types, state its premise out loud and check it holds at the
destination.** The tell is a contract sentence that reads as a general principle ("absent = not
comparable") when it is actually a fact about one type's install base. Two questions close it:

1. **What population makes this tolerance necessary?** Enumerate an actual instance. If you cannot
   name one at the destination, the tolerance is a fail-open guard wearing a safety word.
2. **Does the safe direction survive the move?** A rule that is conservative where it was written
   can be optimistic where it is pasted — same words, inverted valence.

Related: 090 (a design derived from a sibling can invert a phantom — there the referent never
shipped; here it shipped and its premise simply did not transfer), 094 (a copy that defers one of
the original's defenses inherits a rationalizing comment that is only true WITH it), 087 (the
comment channel travels with the code and must be swept), 101 (an arm's copy must describe its
predicate's whole extension, not its poster child — the same enumerate-the-population move one
layer up, in copy rather than schema).
