---
title: Orchestrator gate on product minimum, not configured roster
date: 2026-04-29
modules: [scripts/playtest/lib/board-view-launcher.ts, scripts/playtest/lib/orchestrator.ts, src/client/board/Lobby.tsx]
tags: [playtest-harness, orchestrator, dom-attributes, polling, roster, board-launcher, calibration-finding]
---

**TL;DR.** The playtest harness's board-view launcher polled the live UI
for `button:has-text("Cleared Hot")` and clicked the moment it became
visible. That selector flips on at the **product** minimum to start a game
(`canStart = lobby.players.length >= 2`, `Lobby.tsx:35`), not at the
**configured** seat roster (`config.seats`, can be 2–10). With 3+ seats
configured, whichever seat's MCP browser was slow to boot consistently
missed the start — the orchestrator launched the game with whoever was
present at the time the *minimum* was hit. The third (or N-th) seat then
hit the in-progress server, got `GAME_ALREADY_STARTED`, and stuck on the
join screen forever (the player UI silently swallows that error — separate
issue).

The framing in TODO #6 ("third-seat-fails-to-join") was a red herring. It
wasn't a third-seat bug. It was a "first-N-1-seats-trip-the-start" bug.
The N-th seat just happened to be the slowest to boot.

## Root cause

`scripts/playtest/lib/board-view-launcher.ts` waited for the start button
text to flip to the enabled label, then clicked. It did not know how many
seats were configured. The orchestrator never told it. So the launcher
fell back on the only stable signal available in the existing UI: the
product-minimum button text.

Two things conspired:

1. **The launcher was polling on a state-machine signal it didn't actually
   want.** "Button enabled" coincides with "two players present," which
   coincides with "game can start" — but for the harness, the desired
   gate is "all configured seats present." Those three are equal only
   when `config.seats === 2`.
2. **There was no DOM-stable signal for the actual roster size.** The
   roster div used CSS-module-hashed class names; the count was rendered
   as inert text inside a child span. Nothing said `data-...="3"`.

## Fix

Stop polling for the button. Poll for the actual count.

**`src/client/board/Lobby.tsx`** — add `data-player-count={lobby.players.length}`
to the roster div. The attribute is always present (no conditional render),
updates live as players join, and survives CSS-module hash drift.

**`scripts/playtest/lib/board-view-launcher.ts`** — add `expectedPlayerCount`
to `LaunchBoardViewArgs`. Validate to integer in [2, 10] synchronously.
Wait for `[data-player-count="${expectedPlayerCount}"]` to be visible
*first* (slow wait, gets `waitForStartTimeoutMs`); THEN wait for
`button:has-text("Cleared Hot")` (incidental, fixed 5s budget); THEN click.

**`scripts/playtest/lib/orchestrator.ts`** — pass `config.seats` as
`expectedPlayerCount`. Now the gate matches the configured roster.

The two-step gate (count + button) preserves the click-against-known-good
contract: by the time we reach the button wait, the count is already
exact, so the button is guaranteed enabled.

## Earth verification

`pnpm playtest:phase6-board-launcher-smoke` — 9.4s, all 4 assertions
pass. New log breadcrumbs visible:

```
[board-view-launcher] waiting for 2 operatives ([data-player-count="2"], timeout 180000ms)
[board-view-launcher] waiting for "Cleared Hot" (timeout 5000ms)
[board-view-launcher] clicking "Cleared Hot"
```

The fact that the count waitFor resolved (didn't time out) proves the
attribute renders correctly in real DOM at the right value.

## Key Insight

When an orchestrator polls a UI for "is the right state reached," it
should poll for the **actual desired state**, not a coincidentally-
correlated signal that diverges under multi-actor timing. If the
desired state isn't visible in the DOM, **add it as a data attribute**
rather than re-deriving it from a flag that's only equal under specific
configurations.

The CSS class name is a styling concern. The data attribute is a
contract. They don't have to be the same surface.

## Related

- **Insight 032** — Phase 6 Option A had no game-start mechanism;
  the launcher was added to fill the gap.
- **Insight 033** — That same launcher's default timeout was too tight
  for real agent dispatch; this insight builds on the fix.
- **TODO #6** — "Third-seat-fails-to-join" is closed by this insight.
- **JoinScreen silent-error UX gap** — separate bug discovered along
  the way; the player UI never reads `lastError` from the store, so
  any server error during join is invisible. Worth fixing as its own
  follow-up.

Closed by the same commit that lands the fix.
