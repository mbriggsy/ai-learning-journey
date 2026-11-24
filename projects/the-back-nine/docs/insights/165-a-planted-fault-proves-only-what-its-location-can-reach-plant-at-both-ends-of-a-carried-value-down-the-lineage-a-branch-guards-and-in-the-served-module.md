---
title: "A planted fault proves only what its location can reach: mutants planted at a carried value's consumer left its producer unpinned, a branch no input reached shipped untested, and a survivor can be a state the browser or the domain never shows, not a blind arm"
date: 2026-11-23
phase: build 2 (the surplus question) — the Phase A engine review, U4's mutant pass, the go-live's fit verifiers; the frames-outside plan's rung 3; the seat plan's U2
modules: [src/engine/moneyGrain.ts, src/engine/taxOverlay.ts, src/engine/__tests__/workingYearCredit.test.ts, src/intake/gestureHold.ts, src/ui/styles/survivor.css, e2e/vertical-fit.spec.ts]
tags: [mutation-testing, planted-fault, plant-location, producer-consumer, carried-value, both-ends, float-lineage, knife-edge, unreachable-branch, served-module, page-route, equivalent-mutant, domain-equivalent, browser-equivalent, react-19, useEffect, layout-effect, jsdom-probe, allAlive]
---

## Problem

Five mutant passes in build 2 and the work after it hit the same wall from different sides. Each time, a fault was
planted, and the result said less than it seemed to.

- **The consumer was planted, the producer was not.** KTD5's `allAlive` flag is "carried, never re-derived": the
  producer (`cashTermsForYear`) computes it, and `workingYearCredit` (`src/engine/moneyGrain.ts`) reads it to pay
  nothing in a year a member has died. U4's 15 mutants all sat in `taxOverlay.ts`, the consumer side, and the "member
  dies" scenario typed its terms by hand. So `allAlive: true` hard-coded at the producer credited every survivor
  working year, with the whole suite green. Nine of the Phase A engine review's twelve lenses found it (fixed in
  `9c51d2bb`).
- **A branch no household reaches shipped untested.** `taxOverlay.ts` has a knife-edge branch: the post-draw ledger
  reads 0 while `stepYear`'s state stays positive, by one float step. It shipped with its test (C2) unwritten, because
  no ordinary input lands there.
- **An e2e arm's claim to catch a race rested on the builder's word.** The coordinate-tap arm is the one gate for
  insight 149's label-forwarded click, the reason `src/intake/gestureHold.ts` releases one task late. Nothing had
  shown that arm fails when the release is wrong.
- **A survivor that no planted frame could ever kill.** In the frames-outside plan's rung 3, M4 (a bare
  `.survivor__stepdown` rule, the echo key dropped) survived, as predicted.
- **A timing fault that no browser arm could fail.** In the seat plan's U2, the fault "close the survivor fold in a
  `useEffect`" stayed green in every real-browser arm.

## Root Cause

A plant tests only the path from its location to an assertion, so where it goes decides what it can prove.

- **A carried value has two ends.** A plant at the consumer proves the consumer obeys the value. Only a plant at the
  producer proves the value is right. When the tests feed the consumer hand-typed terms, the producer is never run at
  all.
- **A branch guarded by float dust is unreachable by meaningful inputs.** Only the arithmetic that creates the dust
  reaches it, and its outputs look like its sibling branch's, so even a test that reaches it cannot tell which branch
  ran.
- **An e2e arm runs the code the dev server serves, not the code you edited in a scratch copy.** The way to plant a
  fault there without touching the tree is to change what the browser is served.
- **Some states never happen.** M4's rule needs a frame carrying both the echo (a yearly return) and the floor relief's
  trim note. Every echo frame planted is an aged return, and the plan clock withholds the trim note on an aged plan, so
  no planted frame carries both. The mutant is equivalent ON THE PLANT SET: the domain never brings the two together
  there. A same-year stale return with a floor relief (`statestale`'s doctor over a budget household) would; it is not
  planted.
- **Some states never reach a frame.** React 19.2 committed the effect's close in the same flush as the edit's
  discrete-event commit, before any MutationObserver callback or paint. Traced on a planted dev server: one observer
  batch held the flag and the close together, and the first animation frame read it closed. A state that never paints
  is one no household sees and no browser arm can read.

## Fix

- **Plant at both ends.** The allAlive pin runs the producer's real path for a household with a death and checks it
  against an independent witness (the floor's joint filing), beside the consumer plants.
- **Plant the lineage, then prove the plant landed.** `src/engine/__tests__/workingYearCredit.test.ts` ("THE
  KNIFE-EDGE") searches a small grid for a Roth-only pool T and a stock weight w where w·T + (1 − w)·T lands one float
  step above T, with a need of exactly T. That reaches the branch every time. Because the outputs alone cannot tell the
  branch from its sibling, U4's mutants M4a–c (each arm's credit dropped) are the proof that the test sees the branch.
- **Swap the served module.** The go-live's fit verifier used Playwright's `page.route` to serve
  `/src/intake/gestureHold.ts` with the release moved back into the click listener. On both mouse and touch, the
  label-wrapped radio stored a figure the household never saw, so the arm is proven to fail, and the tree was never
  touched.
- **Name an equivalent survivor, and say which world it is equivalent in.** M4 is recorded as equivalent on the plant
  set, and the CSS comment names the rule. The useEffect form is pinned where its state exists: a per-commit
  layout-effect probe in jsdom fails on it and pins the render-phase close. The browser arm's proof is a plant a
  household could see (the close at the answer's landing), never the unseeable one.

## Key Insight

**Before planting, ask what the plant's location can reach: which end of the value, which branch, which build, and
which states the real world can show.** Plant a carried value at its producer as well as its consumer, with the
producer's real path running. Reach a dust-guarded branch by planting the arithmetic that makes the dust, and prove the
landing with a mutant. Plant an e2e fault in what the browser is served. And when a plant survives, check whether the
state it creates can exist, on the plant set (the domain) or in a painted frame (the browser), before calling the arm
blind. If it cannot, the mutant is equivalent there; pin the rule in the layer that can see it and say so.

## Also Applies To

- Any flag or figure computed once and carried (a "carried, never re-derived" contract): the U17 S0 "bind both halves"
  lesson is the same rule for a pair.
- Any branch guarded by `<= 0` or an equality on floats: find the dust that reaches it, never a hand-typed edge.
- Any e2e arm whose claim rests on a builder's "discriminates by" column (insight 126's 2026-11-23 extension).
- Insight 126 (predict the kill set first) and insight 149 (the race the served-module plant proved the arm catches).
