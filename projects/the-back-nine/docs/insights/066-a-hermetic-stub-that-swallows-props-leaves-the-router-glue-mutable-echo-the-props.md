---
title: A hermetic stub that swallows props leaves the router glue mutable — echo the props into the DOM
date: 2026-07-03
phase: Act 3 (the hardening sweep between U10 and U11)
modules: [ui]
tags: [testing, mutation-survival, mocks, props-echo, integration-glue, readOnly, ultramode-review]
---

## Problem

Both verified findings of the hardening-sweep ultramode review (10 lenses, 7 clean) had the
same shape: two WELL-TESTED seams joined by unpinned glue. `resultSave.test.ts` pinned
`deriveResultSave(…, readOnly)` at the leaf; `App.test.tsx` pinned `entry.notice → ViewOnlyBanner`.
Yet mutating either connecting expression — App's `readOnly={entry.notice !== null}` derivation
(inverted to `===`) or IntakeApp's `deriveResultSave(persist, saveReady, readOnly)` third argument
(dropped) — left the whole 1815-test suite green, while a read-only tab would show the lying
"Save your changes" dead-end the Fork-C-ii fix existed to retire.

## Root Cause

`App.test.tsx` stubbed IntakeApp to a prop-SWALLOWING marker (`() => <div>intake stub</div>`) to
stay hermetic (no engine/crypto graph). Hermeticity was right; the stub's SHAPE was wrong: a marker
proves the child mounted, but every prop the router COMPUTES for it dies unasserted at the mock
boundary. The glue between two seam-tested units is exactly the code neither unit's test can see
(family: 048's honesty gate in an undrivable path — here the path was drivable; the mock just
discarded the evidence).

## Fix

(1) Upgraded the stub to a props-ECHO — render the routed prop into a data-attribute
(`data-read-only={String(readOnly)}`) and assert it in BOTH arms; the inversion mutant now fails
both tests. (2) A thin `IntakeApp.test.tsx` with `Result` stubbed to echo `save.kind` and the
vault session faked, driving the REAL hydrate path (`currentModel → draftFromScenario →
scenarioFromDraft → deriveResultSave`); the dropped-third-arg mutant fails exactly the read-only
arm while the writable twin stays green. All three mutants proven red-then-green.

## Key Insight

A hermetic mock is a coverage BOUNDARY: everything that crosses it unasserted is mutable for free.
When a test stubs a child to isolate a router/glue layer, echo the routed props into the DOM and
assert them — one data-attribute converts the mock from a coverage hole into a mutant killer at
zero hermeticity cost. Audit rule: for any `vi.mock` of a component, ask which props the code
under test COMPUTES for it; each computed-but-unechoed prop is a surviving-mutant seam.

## Also Applies To

- Any router-level test stubbing lazy children (the same file's RecoveryFlow/RestoreFlow markers —
  currently fine because App computes no verdict props for them; the rule is per COMPUTED prop).
- The sweep's sibling finding is the 027 family (proxy predicate ≠ hazard domain) in a new costume:
  the DEV-seed provenance keyed on INTENT (`seed != null` — the request) not EFFECT
  (`devSeedApplied` — a draft actually APPLIED), so a bogus `?seed=` key disarmed the R19
  spend-period force-confirm on the null-resolution path. Where DCE forbids a render-time resolve,
  a state flag set inside the apply block is the safe shape.
- Worker-wire tests that mock the engine client: echo the params the store computes (tier,
  opt-in flags) or they are mutable for free.
