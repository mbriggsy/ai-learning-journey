---
title: AnimatePresence mode='wait' replaces the click target on state swap — Playwright ref goes stale even when the breathe fix holds
date: 2026-04-26
modules: [src/client/player/SmartActionBox.tsx]
tags: [framer-motion, animatepresence, playwright, ref-stale, state-transition, calibration-finding]
---

## Problem

Insight 035 lifted SmartActionBox's continuous `breathe` / `breatheIntense` / `interceptPulse` animations off the button DOM and onto `::after` pseudo-elements, satisfying Playwright's stability check during steady-state. The fix verified end-to-end via the regression smoke `phase6-smartactionbox-clickability-smoke` — agents can click `.action` cleanly when the state has settled.

Phase 6 Unit 3 calibration retry exposed a SECOND, distinct failure mode on the same button:

> seat-1 v2 (run 2): "The Playwright click on the action button returned a ref-stale error, suggesting the animation/transition replaced the DOM node mid-click."
>
> seat-1 v2 (final report): "Insight 035 confirmed: SmartActionBox breathe animation causes Playwright ref invalidation on action button clicks."

The agent's diagnosis is wrong (the breathe is on `::after`, the button DOM is stable). But the symptom is real: a `ref-stale` error occurred at click time, not a stability timeout.

Crucially: **the click registered on the server side anyway** (hand 8→7, card played). The button DOM was replaced AFTER Playwright sent the click but BEFORE Playwright completed the post-click verification. Server saw the action; agent saw a tool-call error; both true.

## Root Cause

`SmartActionBox.tsx` wraps its rendered content in `<AnimatePresence mode="wait">`:

```tsx
<AnimatePresence mode="wait">
  {state.interactive ? (
    <m.button key={state.key} ...>{content}</m.button>
  ) : (
    <m.div key={state.key} ...>{content}</m.div>
  )}
</AnimatePresence>
```

When the SmartActionBox state transitions (e.g., `target-burn-the-files` → `draw` after the card is played), Framer Motion:

1. Plays the EXIT transition on the old `<m.button>` (different `key`).
2. Unmounts it.
3. Mounts a new `<m.button>` (or `<m.div>`) with the new `key`.
4. Plays the ENTER transition on the new node.

`mode="wait"` makes 1+2 happen BEFORE 3+4 (no overlap). Total swap time is roughly 2× `quickFade` duration (~150–300ms).

Playwright MCP's `browser_click` workflow:

1. Take a snapshot, capture refs.
2. Operator passes `ref=eXXX` to click.
3. Tool resolves `ref` → element handle.
4. Issue `dispatchEvent(click)` against the handle.
5. Verify post-click state (visibility, focus, etc.).

If the snapshot's `eXXX` ref points to the OLD button, and the click triggers a state change that causes AnimatePresence to unmount the OLD button between steps 4 and 5, the ref handle goes stale. The click went through (step 4 succeeded), but step 5 throws "node was detached from the DOM."

## Why Insight 035's Fix Doesn't Cover This

Insight 035 was about **continuous** keyframe animations writing `transform: scale(...)` every frame on the button DOM, defeating the stability check (Playwright requires the bounding rect to be unchanged between two consecutive frames). The fix moved the keyframes to a pseudo-element so the button itself stays still during steady-state.

This insight is about **discrete** state-swap unmounts. The button DOM is stable while it exists, but its existence is bounded by Framer's mount/unmount lifecycle. When `state.key` changes, the entire `<m.button>` unmounts. No amount of `::after`-pseudo-element-magic prevents that — the unmount IS the design.

## Fix Path Options

### Option 1 — Don't unmount the button on every state swap

Refactor SmartActionBox to keep the same `<button>` DOM node across states, animating only the content / className. This requires hoisting AnimatePresence to wrap only the *inner* content (text), not the button itself. Drawback: loses the "exit + enter" choreography Framer was orchestrating; would need a hand-rolled crossfade on the inner text.

### Option 2 — Settle-then-click pattern in the harness

Update the seat-agent prompt template to include a "wait for stability" beat AFTER any state-changing snapshot. E.g., after `browser_click`, wait 400ms via `browser_wait_for { time: 0.4 }` to let AnimatePresence finish the swap before issuing the next snapshot. Doesn't fix the underlying race; trades correctness for the agent's tolerance.

### Option 3 — Accept and document

The click DOES register server-side. The "failure" is purely cosmetic in the harness logs. We could teach the agent to recognize the specific error string "node was detached" and treat it as success, not failure. Brittle, but cheap.

### Recommendation

Option 1 if we want the harness to look clean and not produce false-positive "click failed" entries; Option 2 if we want a quick stop-gap; Option 3 if we accept the noise. Probably do Option 1 the next time SmartActionBox is touched for product reasons — don't refactor purely for the harness.

## Key Insight

**Two distinct Playwright failure modes share the same surface:** stability timeout (continuous animation) and ref-stale (discrete unmount). Insight 035 fixed the first; this is the second. Naming them apart prevents future "we already fixed that" confusion.

The general pattern: **for any element that can be clicked by an automation tool, separate `is the element painting?` (steady-state stability) from `is the element guaranteed to exist for the duration of the click?` (lifecycle stability).** The first is solved by isolating animations; the second is solved by isolating unmounts.

## Related

- Insight 035 — continuous animation defeats Playwright stability check (steady-state failure mode).
- Insight 015 — Framer transforms vs CSS cascade (sibling concern: Framer owns the transform on certain elements; affects how interactive states are layered).
- Insight 016 — CSS animation vs `:active` transform (sibling concern within the same SmartActionBox file).
