---
title: "Board-view-launcher's 60s default timeout is too tight for real Claude-agent dispatch — second harness gap caught by calibration"
date: 2026-04-25
phase: playtest-harness Phase 6 Unit 3 (calibration retry attempt #1)
modules: [scripts/playtest/lib/board-view-launcher.ts, scripts/playtest/lib/orchestrator.ts]
tags: [playtest-harness, calibration, timeouts, integration, real-vs-smoke, insight-trail]
---

## Problem

First Unit 3 calibration retry attempt (post-Unit-2.6 / post-selftest-hardening).
Pre-flight green, selftest stamp 10 min old, orchestrator booted, board chromium
launched and navigated to `/board.html#PLAYTEST`, manifest emitted, three
`playtest-seat-N` agents dispatched. Then:

- All 3 agents successfully reached the lobby (5 WS connections to PLAYTEST in
  the wrangler log: 1 god + 1 board + 3 seats).
- `[orchestrator] board-view start sequence failed (non-fatal; seat-driver will
  time out if no game starts): locator.waitFor: Timeout 60000ms exceeded.`
- The board's `started` promise rejected at 60s. The page stayed open but the
  click logic was a one-shot — no retry.
- Game never started; agents lobby-waited; seat-3's stop summary read
  verbatim: *"Still in lobby. Waiting for the game to start."*

Same lobby-stuck symptom as insight 032 (calibration attempt #1), DIFFERENT
root cause.

## Root Cause

`scripts/playtest/lib/board-view-launcher.ts` defaults `waitForStartTimeoutMs`
to **60_000 (60 seconds)**. The comment said *"generous, since seats are
remote-dispatched Claude agents that take a few seconds each to navigate."*

That estimate was wrong. Real Claude Code agent dispatch takes 30-90s+ per
agent before the first `browser_navigate` call lands — agents need to spin up,
read their prompt, and reach Step 1. For 3 agents in parallel the slowest
determines arrival time. 60s was sometimes-enough-but-rarely.

The `phase6-board-launcher-smoke` validated the launcher with **real
Playwright seats** that join the lobby in <1s. That smoke gave a false sense of
"it works in production conditions" — production conditions for Phase 6 means
real Claude agents, not real Playwright contexts. The smoke proved the
mechanism, not the latency profile.

Compounding error: the orchestrator's `launchBoardView` wiring (Unit 2.6) did
NOT plumb `waitForStartTimeoutMs` through. Whatever the launcher's default
was, that's what calibration got. Even with awareness of the latency gap, the
operator had no knob to turn.

## Fix

Two-part:

1. **Orchestrator defaults `waitForStartTimeoutMs` to `config.sessionTimeoutMs`.**
   The board waits as long as the session itself can run — no artificial
   inner cap. If the session can run for 15 minutes (calibration default),
   the board can wait for 15 minutes. The session-level timeout is the only
   deadline that matters; the launcher should never time out before the
   session does.

2. **Add `boardViewWaitForStartTimeoutMs?: number` opt to `RunSessionOptions`.**
   Tests / smokes / future callers can override (the smoke uses the
   launcher's own 60s default since real Playwright joins fast; calibration
   uses 15 min from sessionTimeoutMs).

Code:

```ts
// orchestrator.ts
boardView = await launchBoardView({
  roomCode,
  viteBaseUrl: opts.boardViewViteBaseUrl ?? 'http://localhost:5173',
  waitForStartTimeoutMs:
    opts.boardViewWaitForStartTimeoutMs ?? config.sessionTimeoutMs,
  logger,
})
```

The launcher's own 60s default stays — direct callers (the smoke) get the
old behavior; the orchestrator overrides it to a sensible per-session value.

## Lesson

**Smokes that mock the consumer can't surface latency profiles of the real
consumer.** The board-launcher smoke used Playwright seats in place of agents
because that's what's available in a Node script. The smoke validated:

- Browser launch
- Navigation
- Wait → click → idle
- Teardown
- 0 zombies

It did NOT validate the timing profile of the actual production caller (Claude
agent dispatch). The smoke and Unit 3 calibration are complementary — the
smoke catches mechanism bugs, calibration catches timing/latency bugs.

This is a recurrence of insight 029's pattern (downstream consumers reference
data that upstream only captured as authorial prose) at a different layer:
the smoke captured "the mechanism works" but Unit 3 needed "the mechanism
works at the latency the real producer operates at."

## Insight Trail

- **insight 031** — Phase 4 D15 Option A deferred → discovered at Phase 6
  Unit 3 integration (per-seat MCP isolation).
- **insight 032** — Phase 6 Unit 3 calibration attempt #1 caught: no
  game-start mechanism under Option A.
- **insight 033 (this one)** — Phase 6 Unit 3 calibration attempt #2 caught:
  game-start mechanism's wait timeout too tight for real-agent latency.

Three calibration attempts have caught three different harness gaps. Each
caught earlier would have been cheaper. Calibration is doing exactly what the
plan called it to do — *"the harness is an instrument; running it
uncalibrated is like shipping a scale that hasn't been zeroed."*

## Next

Retry calibration with the timeout fix in place. If a third gap surfaces, the
pattern is worth examining as a meta-finding — what kind of integration tests
would have caught all three before live calibration?
