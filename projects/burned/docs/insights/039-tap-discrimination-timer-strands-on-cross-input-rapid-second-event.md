---
title: "Tap-discrimination timer strands on cross-input rapid second event — adjacent card enlarges 400ms after a drifted double-tap"
date: 2026-04-29
phase: BURNED Phase 6 calibration product/UX bug — playtest finding (TODO #9)
modules: [src/client/player/hooks/useDoubleTap.ts]
tags: [react-hook, settimeout, state-machine, tap-discrimination, ux, playtest-finding]
---

## Problem

Playtest seat-1 v1 (run `2026-04-26-1303-3p`, scenario `STRAY_SELECTION_BUG`):

> "After playing Burn the Files via double-click, tried to click 'End turn
>  draw'. Got `_enlargeBackdrop` error for Call in a Favor. Pressed Escape,
>  the Call in a Favor card showed as active. ... a double-click on one
>  card appears to inadvertently select/trigger the adjacent card
>  (possibly a mis-registration issue with the double-click timing — the
>  second click of the dblclick lands on the next card)."

Reproduces deterministically: when two consecutive taps land on different
hand cards within 400 ms, an enlarge backdrop opens on the SECOND card
~400 ms after the second tap. The backdrop blocks End-turn until the user
hits Escape and manually deselects.

The agent's own diagnosis is precise: cross-card mis-registration during
an attempted double-tap. Verified mechanically below.

## Root Cause

`useDoubleTap` orchestrates a 400 ms `setTimeout` that fires the
single-tap callback if no qualifying second tap arrives. The cancellation
predicates pre-fix:

```ts
if (
  prev &&
  prev.id === id &&                    // SAME card
  now - prev.time < THRESHOLD_MS &&    // within window
  Math.abs(...) < TOLERANCE_PX         // within move
) {
  // double-tap → cancel timer, fire onDoubleTap
} else {
  // ANY other case (including cross-card within window):
  //   - cancel the OLD timer
  //   - schedule a NEW timer for the new id
}
```

A cross-card rapid tap therefore traverses the `else` branch:

1. Tap A at `t=0` schedules timer T1 for card A.
2. Tap B at `t=50` is on a different id, so the same-card double-tap
   gate fails. The else branch cancels T1 — and immediately schedules a
   NEW T2 for card B.
3. T2 fires at `t=450`. `onSingleTap('B')` runs. `enlargedId = 'B'`.
   The portalled enlarge backdrop opens with B inside, intercepting all
   pointer events on the rest of the player view.

The user's intent in step 2 was almost always one of:

- A drifted double-tap (intended A, click 2 missed and hit adjacent B).
- A genuine rapid sequential single-tap on different cards (rare).

Either way, scheduling a delayed enlargement for B 400 ms LATER strands a
modal the user did not deliberately request — and crucially, the user
has typically moved on (clicked End-turn, taken a screenshot, looked
away) by the time the backdrop appears.

## Fix

`useDoubleTap.ts` gains a third branch BEFORE the default schedule:

```ts
const isCrossCardRapid = !!prev &&
  prev.id !== id &&
  now - prev.time < DOUBLE_TAP_THRESHOLD_MS

if (isSameCardDouble) {
  cancel + reset; onDoubleTap(id)
} else if (isCrossCardRapid) {
  cancel + reset; // intentionally NO new schedule
} else {
  // first tap from a clean state — schedule single-tap as before
}
```

Cross-card rapid taps now resolve to "no action" — neither single-tap
enlargement nor stage. The user retries cleanly. No stranded backdrop.

Same-card double-tap (the primary action) is unchanged. Same-card drift
beyond move tolerance still falls through to the default branch
(schedule a fresh timer); cross-card behavior is the only change.

Verification:

- 7 new hook-level tests at `src/client/player/hooks/useDoubleTap.test.tsx`,
  exercising the actual `useRef` + `setTimeout` plumbing with
  `vi.useFakeTimers()`. The bug-repro test fails on pre-fix code,
  passes post-fix. Recovery test (drift → retry → clean double-tap)
  proves the user's intent still completes after the cancel.
- New e2e regression spec `tests/e2e/hand-cross-card-tap.spec.ts`.
  Pre-fix: produces 1 `enlargeBackdrop` element 700 ms after two rapid
  cross-card taps. Post-fix: 0.
- Earth verification via Playwright MCP against a live 2-player game
  (room `BNFD3P`): cross-card pointer-event sequence produced no
  backdrop and no stage; immediate clean same-card double-tap on the
  same hand correctly staged Dash Barlowe.

## Lesson

**Delayed-discrimination timers — those that fire only after a window
expires without a qualifying follow-up — must cancel on ALL ambiguous
follow-ups, not only on the qualifying one.**

The original code modelled "cancellation" only as same-input
confirmation. Anything else (different input within the window, no
follow-up at all) kept the timer alive. That works as long as the user's
ambiguous input is the one they intended next. But ambiguous input
within a tight window is almost always evidence the user's gesture
DIDN'T land where they aimed — exactly the moment a delayed action will
surface UI they don't want.

Generalised pattern for tap/key/scroll discrimination timers:

| Follow-up event | Pre-fix interpretation | Better interpretation |
|---|---|---|
| Same input in window | Confirm (fire double / commit) | Same |
| Different input in window | Treat as new "first tap"; reschedule | Cancel + reset; no action |
| No input in window | Fire single-tap | Same |

The "different input in window" cell is where this class of bug lives.

The harder generalisation: **any timer whose payload is a side-effect
the user can't immediately revoke** (modal, navigation, network call)
should be conservative about firing when the user's intent is unclear.
If `enlargeBackdrop` were dismissable by tapping ANYWHERE outside the
card (instead of requiring tap-on-backdrop), this bug would have been
a paper cut, not a stuck state. Both layers — the timer policy and the
recovery affordance — share responsibility.

## Related

- Insight 015 — Framer transforms vs CSS `:active` cascade (Hand cards
  rely on the same interaction surface this hook drives).
- Insight 027 — absence-of-X assertions need presence-of-Y companions
  (sibling pattern: "the timer didn't fire" needs a "the timer was
  scheduled" companion check; the new tests pair both).
- Insight 037 — AnimatePresence ref-stale on state swap (sibling
  Phase-6 calibration product/UX finding from the same run set).
