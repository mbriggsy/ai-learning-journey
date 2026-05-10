---
title: Absence-of-X assertions need presence-of-Y companions — otherwise 'no leak' passes when 'no traffic at all'
date: 2026-04-24
modules: [scripts/playtest/lib/selftest-checks.ts]
tags: [testing, integration-testing, vacuous-truth, assertion-design, self-test]
---

## Problem

Unit 7's self-test Check 4 — "god frames don't bleed to player sockets" — was designed to catch a privacy boundary violation. It set up two player-role contexts, intercepted their WS frames, asserted none of the frames had `type: 'god-event'`. All 8 checks passed; `.last-selftest` stamp written. Unit 8's smoke then failed immediately because god never connected in the first place (insight 025). Check 4 had passed vacuously: zero god frames AND zero player frames AND zero bleed, because there was zero traffic.

## Root Cause

Negative assertions (`assert no X occurred`) are trivially satisfied when NOTHING occurred. If the setup silently fails to produce the system under test's expected traffic, every "absence" check passes without catching the upstream break.

This is a specific case of vacuous truth in tests: `∀ x ∈ ∅ : P(x)` is true for any P. If your test corpus is unintentionally empty, "none of it violated the invariant" is technically correct and operationally worthless.

Check 4's setup assumed:
1. A god WS would be opened.
2. The game would produce events.
3. Those events would show up on the god channel AND not on the player channel.

Only #3 was asserted. #1 and #2 were implicit preconditions. When #1 silently failed (god WS got 4003), the "absence-only" assertion was still satisfied.

## Fix

Every absence-of-X assertion should have a companion presence-of-Y assertion that would be violated by the same class of setup failure. For Check 4:

```ts
// Before (absence-only):
expect(seat1WsFrames).not.toContainAnyOf({ type: 'god-event' })
expect(seat2WsFrames).not.toContainAnyOf({ type: 'god-event' })

// After (absence + presence):
expect(seat1WsFrames).not.toContainAnyOf({ type: 'god-event' })       // no leak
expect(seat2WsFrames).not.toContainAnyOf({ type: 'god-event' })       // no leak
expect(godSubscriberEvents.length).toBeGreaterThan(0)                 // god DID fire
expect(godSubscriberEvents[0]).toMatchObject({ type: 'god-event' })   // shape sanity
```

The "god subscriber received at least one event" check fails loudly when god didn't connect, turning a silent vacuous pass into a surfaced upstream break.

## Key Insight

**Negative assertions need positive companions.** Any test whose pass criterion is "X didn't happen" should pair with a test whose pass criterion is "something related DID happen" — chosen so that a broken setup fails the positive check, not the negative one.

Pattern vocabulary:
- **"No leak":** add "leakable content exists AND reached the intended recipient."
- **"No errors logged":** add "at least one expected log entry exists."
- **"No unwanted side-effect":** add "the intended side-effect occurred."
- **"Feature disabled, don't allow X":** add "feature actually loaded and evaluated the disable."

Absence tests test the GUARD; presence tests test that the guard actually RAN. You need both.

## Also Applies To

- Self-tests / smoke tests / integration harnesses — anywhere the test environment boots a real system whose failure modes include "didn't boot."
- Security / auth boundary tests — "unauthorized request got no data" passes when the request never reached the server.
- Privacy / projection tests — "eliminated player didn't see hidden field" passes when they didn't get any projection.
- Feature-flag tests — "flag off disables X" passes when X never executed for any reason.
