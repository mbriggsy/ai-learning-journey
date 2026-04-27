---
title: "Player WebSocket reconnect generates an unbounded log storm — 1.6M console entries in seconds, browser hangs"
date: 2026-04-26
phase: playtest-harness Phase 6 Unit 3 (calibration retry)
modules: [src/client/connection, src/client/player/Player.tsx]
tags: [websocket, reconnect, exponential-backoff, console-logging, p0-product-bug, calibration-finding]
severity: P0
---

## Problem

Phase 6 Unit 3 calibration produced two seat agents that independently hit the same failure when the wrangler dev server became unreachable mid-session:

- **Seat 3 (run 1, CALAM6):** "browser accumulated **572,062+ console log entries** in a ~5-second window. … browser tab completely hung."
- **Seat 2 (run 1, CALAM6):** "Reconnect loop generated **1.6 million console entries** with no exponential backoff, eventually crashing the page."

Two seats, same trigger (server unreachable during a live session), same failure mode (unbounded console log accumulation), two scales of measurement. The browser became unresponsive in both cases — Playwright MCP tool calls timed out at 30–60s after the storm began.

This is a **player-facing P0 product bug**, not a harness bug. Any real player whose phone briefly loses connectivity (subway, elevator, weak wifi) is one minute of disconnection away from a bricked tab. The harness merely surfaced it because it ran agents long enough for the server-side teardown to coincide with active client sessions.

## Root Cause (hypothesis — not yet traced to source)

The client's WebSocket reconnect logic almost certainly:

1. Attempts reconnect immediately on close.
2. Logs every attempt + every error (likely both at `console.error` AND something else like a status-store dispatch that re-fires).
3. Has no exponential backoff — each failed attempt fires another attempt within milliseconds.
4. Has no upper-bound retry count or "giving up" surface.

Result: a tight loop that writes to `console` faster than the browser's devtools / log buffer can absorb, eventually starving the JS thread.

The exact code path is in `src/client/connection.ts` (or wherever `connect`/`onReconnect` live — the agent reports cite "Re-establishing channel..." dialog text which is rendered by a connection state component).

## Fix Path Sketch

Three things, in order:

1. **Exponential backoff** with jitter. Standard pattern: 250ms → 500ms → 1s → 2s → 4s → 8s, capped at e.g. 30s, jittered by ±20%. No tighter than ~250ms first attempt.
2. **Upper-bound retry count** OR an absolute time cap. After e.g. 60s of failing reconnects, surface a "Connection lost — refresh to rejoin" UI and STOP retrying. Player decides what to do.
3. **Throttle the logging.** Even if backoff ships, the connection layer should never log more than ~1 line per reconnect attempt. No nested loggers in WS event handlers.

Verification: write a Playwright test that kills the server mid-session, waits 30s, asserts `await page.evaluate(() => console.entries?.length ?? 0) < 100` (or however we count) AND `await page.locator('text=refresh to rejoin').isVisible()`.

## Why Calibration Caught This

The harness ran agents for 60–80 minutes during sessionTimeoutMs experiments. Real production sessions might never exceed 15 minutes. The bug exists in production code today; production users haven't surfaced it because they don't keep tabs open through 30+ minutes of connectivity gaps.

Two seats reproducing it independently — at vastly different scales (572k vs 1.6M log entries) — confirms it's deterministic given the right trigger window, not a once-off race.

## Lesson

**Long-running test sessions surface unbounded loops that short test sessions cannot.** Coverage smokes (5-30s) never run long enough for an exponential-no-backoff loop to manifest as a hang. Calibration sessions (30+ min) do. Adding a "kill the server mid-session, wait 30s" assertion to the test surface — even outside calibration — would catch this class of bug going forward.

## Related

- Insight 034 — god-subscriber heartbeat-timeout (different layer; that's the harness's own WS handler, not the player client). Both are WebSocket reconnect concerns; both deserve scrutiny independently.
- The "Re-establishing channel..." UI runs indefinitely with no upper-bound (independently noted by seat-1 v2). Same root cause: no escalation surface.
