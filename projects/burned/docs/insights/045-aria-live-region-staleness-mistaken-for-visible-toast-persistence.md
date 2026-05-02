---
title: Aria-live region staleness mistaken for visible toast persistence
date: 2026-05-01
phase: post-Phase-6 — calibration-driven bug triage
modules: [src/client/shared/announce.ts, src/client/player/PlayerAlert.tsx, scripts/playtest/agents/playtest-seat.md]
tags: [accessibility, aria-live, calibration, debugging, triage, observability, false-positive]
---

## Problem

Calibration issue 003 (run `2026-05-01-1654-3p`) reported a P2 bug: "Card-played toast persists through full favor-pending sub-phase for observer." Seat-3 (alive observer) wrote in their scenario-fire log: *"Toast 'Seat2 played Call in a Favor.' persisted on screen through resolution."* Triage proposed three fix paths, all targeting React state lifecycle for `PlayerAlert`:

- Option A: clear toast on `nope-window-resolved` event
- Option B: hard-cap toast lifetime at 8–10s
- Option C: dedicated observer UI beat for `favor-pending`

A reproduction unit test (mocked hooks + stubbed `motion/react` to bypass Framer's exit animation) proved the React state lifecycle was already correct: `PlayerAlert` set the alert via `setAlert(...)`, the existing 2.8s `setTimeout` fired, `setAlert(null)` ran, and the toast cleared. None of the three fix paths would have changed any visible behavior — they targeted code that was already working.

The actual cause was elsewhere: `announce()` in `src/client/shared/announce.ts` wrote the toast text into the persistent `#sr-polite` aria-live region (`<div id="sr-polite" aria-live="polite">` mounted in `player.html`) and **never cleared it**. Playwright's `browser_snapshot` tool — which seat agents use as their primary observation surface — produces an aria tree that includes live-region text. Seat-3's snapshot at any point during the 60s favor-pending window showed the stale "Seat2 played Call in a Favor." text in the aria tree, even though the visible `<m.div>` toast had faded out at T=2.8s as designed.

## Root Cause

Aria-live regions are designed for repeated reuse: write to them, the screen reader announces, then leave them mounted for the next announcement. The persisted text isn't a UX problem for screen-reader users (announcement happens once, on `textContent` change), but it IS a problem for two adjacent consumers:

1. **Calibration agents reading aria snapshots.** They see a flat tree of accessibility nodes, including all live-region text. They cannot distinguish "currently being announced" from "left over from 30 seconds ago." A stale message in a live region looks identical to a stale message in a visible card-played toast.

2. **Assistive tech users navigating standalone aria text.** A user who scrolls through the page's accessibility tree (rather than hearing it auto-announced) encounters old announcements as if they were current content.

Both problems vanish if live regions are cleared after a delay longer than any plausible single-announcement read time. The standard `el.textContent = ''` followed by rAF + `el.textContent = message` pattern (found across web a11y guides) ensures the announcement fires; nothing in that pattern requires the text to remain after the announcement has been delivered.

## Fix

`announce()` schedules a deferred clear (`setTimeout`, 5s) that wipes `el.textContent` after the announcement should have been read. A subsequent call at the same priority cancels its predecessor's pending clear via a per-priority `Map<priorityId, Timer>`, so a fast follow-up announcement isn't wiped early.

```ts
const STALE_CLEAR_MS = 5_000
const clearTimers = new Map<string, ReturnType<typeof setTimeout>>()

export function announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
  const id = priority === 'assertive' ? 'sr-assertive' : 'sr-polite'
  const el = document.getElementById(id)
  if (!el) return

  const prev = clearTimers.get(id)
  if (prev !== undefined) clearTimeout(prev)

  el.textContent = ''
  requestAnimationFrame(() => {
    el.textContent = message
    const timer = setTimeout(() => {
      el.textContent = ''
      clearTimers.delete(id)
    }, STALE_CLEAR_MS)
    clearTimers.set(id, timer)
  })
}
```

Independent timers for `'polite'` and `'assertive'` so cross-priority announcements don't clobber each other.

## Key Insight

**Calibration agents observe the accessibility tree, not the rendered pixels. Anything an aria snapshot can read becomes part of "what the agent sees" — including persistent live-region text, hidden DOM nodes, and `aria-hidden="false"` content. A bug report of "X persisted on screen for N seconds" must be disambiguated against the question: was the persistence in pixels, or just in the a11y tree?**

This connects to the eye-in-loop > calibration thread (`feedback-eye-in-loop-beats-calibration-for-motion.md`, insight 044). Calibration agents are excellent at state assertions and shape checks. They are blind by construction to whether something is *currently visible* vs. *currently in the DOM/a11y tree*. Pixel persistence requires a screenshot diff or human observation; aria-tree persistence is what the snapshot natively reports.

A corollary: any "this UI lingered" finding from a calibration run should be cross-checked against the live-region content. If the lingering text is exactly the announcement that fired earlier, the symptom is a11y-tree staleness, not visible UI.

## Also Applies To

- Any persistent aria-live region — toast announcements, alert announcements, status-bar text-change announcements. Once you put text in a live region, it stays there until cleared. Default to clearing after announcement.
- Visually-hidden surfaces in general (`.sr-only`, off-screen menus, conditionally-rendered panels with `display: none`). Agents see structural DOM regardless of visibility. If a state is meant to be transient, prune it from the DOM (or clear its text) after the transient window closes.
- Skip-link targets and focus-trap landmarks that get repurposed across page states. The previous text can stale onto the new context.
- Anywhere you set `aria-live`, `aria-atomic`, `aria-relevant`, or `role="status"` / `role="alert"` and later assume the text "goes away on its own." It doesn't — only the announcement does. The text remains.

## Verification

Triage issue 003 reproduction test (`src/client/player/PlayerAlert.test.tsx`) mocks `motion/react` so AnimatePresence becomes a synchronous passthrough — without that, a fake-timer test cannot distinguish "React state is null" from "Framer is mid-exit and the DOM node still has its text." With the stub, the test asserts directly against React state via DOM-node presence.

`announce.test.ts` covers the cleanup behavior: 5s clear, prior-timer cancellation on new announcement, polite/assertive independence, no-op when the live region is missing.

What this insight does NOT cover: whether the visible Framer exit animation has its own bugs in production. The unit test stubs Framer; production uses the real animation. If a future report describes pixel-level toast persistence (not aria-tree persistence), that's a different bug to chase.
