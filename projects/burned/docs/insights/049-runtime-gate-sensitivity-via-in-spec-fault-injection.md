---
title: Runtime-gate sensitivity is proven by in-spec fault injection, not by temp production regressions
date: 2026-05-05
modules: [tests/e2e/drama-beat-timing.spec.ts, tests/e2e/framer-hand-enlarge-shape.spec.ts, tests/e2e/framer-bottom-sheet-shape.spec.ts, tests/e2e/framer-status-strip-shape.spec.ts]
tags: [runtime-gate, testing, sensitivity, fault-injection, workflow]
---

## Problem

Each runtime gate (drama-beat-timing + 3 Framer cinematic gates) needs a
sensitivity proof: "if production code regresses in the bug class this
test exists to catch, the test fires." Without a sensitivity proof, a
green test is theater — it might be passing because nothing's wrong OR
because the assertion is too loose.

The temptation is to **temporarily regress production code** to verify
the test fails:

1. Edit `Hand.tsx`: `filter: 'blur(4px)'` → `filter: 'blur(0px)'`
2. Run test → confirm red
3. Revert
4. Run test → confirm green

This is correct in spirit but has compounding problems.

## Root Cause

Three issues with temp-production-regression sensitivity checks:

1. **Forgetting to revert.** Any pause, distraction, or context switch
   between step 2 and step 3 leaves prod broken. CRLF / linter races on
   the file flip make `git diff` show the entire file changed, masking
   whether the actual code returned to baseline.

2. **Sandbox / hook escalation.** After three rounds of edit-prod /
   revert-prod cycles in a session, the Claude Code sandbox correctly
   flagged the pattern as "intentionally introducing a known visual
   regression into production source code" and denied the next attempt.
   Right call by the sandbox — repeated production-code temp-edits
   shouldn't be normal.

3. **One-time proof, not a regression test.** The sensitivity is verified
   AT THE MOMENT of the temp regression, not on every CI run. Future
   tightening of the assertion (e.g., raising a tolerance bound) doesn't
   re-validate.

## Fix

Bake the sensitivity proof **into the spec** as a third test:

```ts
test('FAULT INJECTION: <bug-class shape> fails the canary', async (...) => {
  // Paint a synthetic element directly into the DOM with the EXACT shape
  // the bug-class produces. No production code involvement.
  await page.evaluate(() => {
    const synth = document.createElement('...')
    // ... paint the bug shape ...
  })

  // The same shape-derivation function the real test uses MUST fail on
  // this synthetic shape.
  const trace = await readTrace(page)
  expect(deriveShape(trace).peakSustainedMs).toBeLessThan(HEALTHY_FLOOR)
})
```

All four gates (drama-beat + 3 Framer) now follow this pattern:

- drama-beat — paints a clipped opacity arc (250ms enter, no peak hold,
  immediate exit) directly on the overlay element
- hand-enlarge — paints a scale-only arc with NO blur (proves the
  co-ordination invariant fails)
- bottom-sheet — paints a translateY arc that holds at 150px (never
  reaches 0 — proves the time-to-peak canary fires)
- status-strip — paints two simultaneous spans at opacity 0.7 (proves
  the mode="wait" overlap detector fires)

## Key Insight

**Sensitivity is a property of the test, not a one-time observation.**
Bake the proof into the spec so every CI run re-validates it. If a
future maintainer softens the assertion thresholds, the fault-injection
canary fails first and visibly — they can't accidentally widen the
assertion past the bug-class signature.

The synthetic-shape approach also removes the "did I revert prod?"
risk entirely. The fault is contained inside `page.evaluate`'s sandbox
and torn down at test end.

When the sandbox denies a temp-production-regression edit, that's a
signal to write a fault-injection test instead — the sandbox's pattern-
detection is enforcing the better engineering pattern.

## Also Applies To

- Any future runtime gate using per-rAF sampling — drama-beat is the
  template; build the fault-injection canary alongside the real test.
- Visual regression tests (pixel-diff) — synthetic-shape diffs prove
  the diff threshold catches the bug-class without committing baseline
  images derived from a temp regression.
- Performance budgets — instead of temporarily slowing a function to
  verify the budget catches it, inject a synthetic delay via a
  test-only shim and assert the budget alarms.
