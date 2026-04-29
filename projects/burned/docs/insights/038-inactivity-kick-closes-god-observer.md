---
title: "Server inactivity-kick alarm closed god observer along with players → orchestrator silently lost telemetry on slow-paced sessions"
date: 2026-04-29
phase: playtest-harness Phase 6 Unit 3 (calibration retry attempt #4)
modules: [src/server/room.ts, scripts/playtest/lib/god-subscriber.ts]
tags: [playtest-harness, calibration, websocket, inactivity-timer, silent-failure, observer-exempt]
---

## Problem

Phase 6 Unit 3 calibration retry attempt #4 (Run 2 — `runs/2026-04-26-1339-3p/`).
The pipeline ran end-to-end for the first time, isolation audit passed, triage
produced 4 specs. Mid-session the orchestrator log captured:

```
[god-subscriber] server-initiated close mid-session code=1000 reason=Inactivity timeout —
no further god-events will be captured. orchestrator will not abort (lifecycle-signal contract).
```

After that line, the god connection was dead. Any later god-events the server
broadcast (player actions, kicks, terminal phase) hit zero observers. The
orchestrator's `seatDriver` race didn't notice — the `onFatalClose` promise
stays pending on code 1000 by design (insight 034 follow-up: "should 1000 BE
fatal?" was deferred).

This was the third stacked failure in the same family:
- Insight 034 (closed): heartbeat-timeout 1001 from a non-pong-replying
  subscriber — fixed at the client.
- This one: inactivity-kick 1000 from a different code path entirely — the
  server-side gameplay-inactivity timer.

## Root Cause

`src/server/room.ts:30` defines `INACTIVITY_TIMEOUT_MS = 15 * 60_000` (15
minutes). `lastActionTime` is updated at four sites — host-connect, join,
start-game, and action handlers. Every player action resets the clock.

`onAlarm` (`room.ts:374-388`) checks `Date.now() - this.lastActionTime`
against that timeout. When 15 minutes pass with no player actions:

```ts
if (elapsed >= INACTIVITY_TIMEOUT_MS) {
  this.clearAllTimers()
  this.broadcast({ type: 'error', payload: { code: 'KICKED', message: '…' } })
  for (const conn of this.getConnections()) {
    conn.close(1000, 'Inactivity timeout')   //  ← closes EVERY connection
  }
  await this.ctx.storage.deleteAll()
  return
}
```

`getConnections()` returns all attached connections — including the
god-role observer the orchestrator opened for telemetry. The kick was
designed for player rooms (clean up abandoned games, free DO resources)
but indiscriminately took out the orchestrator's read-only observer too.

The trigger in Run 2 was a frozen client-side UI: insight 035's SmartActionBox
breathe-pulse defeated Playwright's stability check, so seat agents stopped
issuing actions. After 15 minutes of no actions, the alarm fired and killed
everyone — players AND god.

This was masked in Phase 6 calibration runs prior to retry #4 because earlier
runs failed before the 15-minute mark for other reasons (insights 032/033/034).
Retry #4 was the first run to actually survive long enough to trip this.

## Why the TODO's two suggested fixes were wrong layer

The TODO entry suggested either:
1. *"send a periodic keep-alive ping from the god subscriber"*
2. *"relax the server-side idle timeout for the god connection only"*

Both are wrong:

1. **Client keepalive doesn't reset the inactivity timer.** The timer is
   driven by `lastActionTime`, which is only set inside `handleAction` /
   `handleHostConnect` / `handleJoin` / `handleStartGame`. None of those
   fire on god messages — and the only message god ever sends after
   handshake is the initial `playtest-config`. Even if god sent pings
   forever, `lastActionTime` would never advance, so the alarm would
   still fire.

2. **The inactivity timer is room-wide, not per-connection.** There's no
   per-connection alarm to relax for god. The single room-level alarm
   either fires or it doesn't.

The right fix is at the kick site: when the alarm DOES fire, exempt god
from the close loop. The semantics line up with the timer's actual purpose
(gameplay inactivity ≠ observer inactivity).

## Fix

`src/server/room.ts:381-383` (post-fix):

```ts
// God observers are exempt from the kick: the inactivity timer is a
// gameplay-level signal (no PLAYER actions for 15 min), not a WS-traffic
// signal. The orchestrator's god subscriber is read-only and never
// initiates actions; killing it here would silently halve telemetry
// for legitimately long but slow-paced games. The orchestrator owns
// the god lifecycle and disconnects on session end.
for (const conn of this.getConnections()) {
  if (this.getConnState(conn)?.role === 'god') continue
  conn.close(1000, 'Inactivity timeout')
}
```

After the fix:
- Players are kicked as before (1000 'Inactivity timeout' broadcast +
  close — protocol unchanged for clients).
- `clearAllTimers()` already killed god's heartbeat interval BEFORE the
  close loop, so the server stops pinging god — no further server-side
  bookkeeping is required.
- `storage.deleteAll()` runs as before, room state is wiped.
- God stays connected to a now-empty DO. The orchestrator's session-end
  `disconnect()` cleanly closes it via `ws.close(1000, 'orchestrator-
  disconnect')`, the server's `onClose` schedules `IDLE_ROOM_TIMEOUT_MS`
  cleanup, the DO eventually hibernates / dies.

## Why GameRoom isn't unit-testable here

`src/server/room.ts` exports only the `GameRoom` Durable Object class,
which requires Cloudflare runtime types (`DurableObjectState`, `Env`,
`Connection` from partyserver) that don't exist in vitest's Node
environment. The existing test suite covers engine.ts, projection.ts,
and god-connection.ts as pure modules, never the DO itself.

Closing this gap properly (a DO test harness with stubbed
`DurableObjectState` + `Connection`) is much larger scope than this
fix. Instead:
- The 3-line server change is small enough that diff-review is the
  proof. Logic: `if (cs?.role === 'god') continue` inside an existing
  loop. There's no algorithm to verify, no edge cases — it's a filter.
- The `phase6-heartbeat-smoke` (item #5) covers the heartbeat layer
  (insight 034 regression coverage at 60s+).
- The next real calibration session is the integration proof: absence
  of "Inactivity timeout" close events in the god log = fix held.

## What this unblocks

Long calibration sessions (5p+, slow-paced gameplay, deliberation-heavy
turns) that legitimately cross the 15-minute idle window now stay
observable. The orchestrator captures the full telemetry arc instead of
silently halving it.

## Insight Trail

- **031** — Phase 4 D15 deferred → discovered at Phase 6 Unit 3
  integration. Closed by Unit 2.5.
- **032** — Option A harness has no game-start mechanism. Closed by
  Unit 2.6.
- **033** — Board-launcher 60s timeout too tight for real agent
  dispatch. Closed by `boardViewWaitForStartTimeoutMs` defaulting to
  `sessionTimeoutMs`.
- **034** — God subscriber didn't pong; killed at 40s by heartbeat
  timeout (code 1001). Closed by pong handler.
- **035** — SmartActionBox breathe defeats Playwright stability check.
  Closed by 2026-04-26 refactor.
- **036** — WebSocket reconnect log storm from unbounded retries.
  Closed by maxRetries cap + ConnectionOverlay.
- **037** — AnimatePresence mode=wait creates ref-stale on state swap.
  Closed by stable-button refactor.
- **038 (this one)** — Server inactivity-kick took out the god observer
  along with players. Closed by exempting god from the kick close loop.

The Phase 6 calibration cycle has now produced eight distinct
insights (031-038), all from genuine harness/product gaps rather than
fixture bugs. Each was load-bearing for the next.
