---
title: "God-subscriber didn't respond to server heartbeat pings → killed at 40s → silent telemetry loss for the rest of the session"
date: 2026-04-25
phase: playtest-harness Phase 6 Unit 3 (calibration retry attempt #2)
modules: [scripts/playtest/lib/god-subscriber.ts, src/server/room.ts]
tags: [playtest-harness, calibration, websocket, heartbeat, silent-failure, defense-in-depth, real-vs-smoke]
---

## Problem

Phase 6 Unit 3 calibration retry attempt #2. Pre-flight green, selftest fresh,
orchestrator booted, board-view tapped "Cleared Hot," game reached
`phase=playing`, three Claude seat agents independently played and produced
real telemetry (3 seat logs, 3 suspicion files including a found product
discoverability finding).

But the orchestrator's `events.jsonl` had only **1 line** for a 12-minute
game. The wrangler log showed:

```
[broadcastGameState] phase=playing host=1 players=2 god=1 untyped=0 failures=0   ← god connected
[broadcastGameState] phase=playing host=1 players=3 god=0 untyped=0 failures=0   ← god gone
[broadcastGameState] phase=playing host=1 players=3 god=0 untyped=0 failures=0
```

God subscriber dropped silently between two broadcasts early in the session.
The orchestrator never noticed. Agents kept playing for 12 more minutes —
producing zero new captured god-events. Coverage was 0/50, triage had nothing
real to chew on.

## Root Cause (two stacked bugs)

### Bug A — god-subscriber didn't respond to heartbeat pings

`src/server/room.ts:1083-1095` runs a heartbeat: every 30s the server sends
`{type: 'ping'}` to every connection and tracks per-connection
`lastPongTimes`. If 30s + 10s = 40s elapses without inbound activity from
that connection, the server closes it with **code 1001 'Heartbeat
timeout'**.

`src/server/room.ts:273` is the critical line: *"Any message counts as
heartbeat activity"* — the server doesn't require a literal `pong`, just any
inbound traffic. So even a noop reply would have kept the connection alive.

`scripts/playtest/lib/god-subscriber.ts:onInboundMessage` (pre-fix) handled
exactly two message types: `playtest-config-ack` (handshake) and `god-event`
(the data we want). Anything else — including ping — was silently dropped.
The subscriber sent its initial `playtest-config` at connect, then sent
nothing for the rest of the session. After 40s the server killed it.

### Bug B — close handler treats 1000/1001 as "non-fatal silent"

`scripts/playtest/lib/god-subscriber.ts:611-616` (pre-fix):

```ts
default:
  if (code === 1000 || code === 1001) {
    // Clean server close — not fatal by itself. Leave onFatalClose
    // pending; the orchestrator notices via its own lifecycle signal.
    return
  }
```

The comment says "the orchestrator notices via its own lifecycle signal." It
doesn't. The orchestrator's race against `onFatalClose` is the only signal
it has. With `onFatalClose` left pending forever, the orchestrator silently
kept waiting on the seat-driver until `sessionTimeoutMs` (15min) elapsed.

Bug A is the proximate cause. Bug B is a latent defense-in-depth gap —
without bug A it would never fire, but with bug A it amplified silent
failure into 12 minutes of dark.

## Fix

### Bug A fix — pong handler

Add a case to `onInboundMessage`:

```ts
if (parsed['type'] === 'ping') {
  try {
    ws.send(JSON.stringify({ type: 'pong', payload: {} }))
  } catch (err) {
    console.error(`[god-subscriber] failed to send pong: …`)
  }
  return
}
```

### Bug B fix — defense-in-depth log

Don't change the not-fatal semantics (orchestrator still doesn't abort on
1000/1001), but log loudly so future silent closes are visible:

```ts
if (code === 1000 || code === 1001) {
  console.warn(
    `[god-subscriber] server-initiated close mid-session ` +
    `code=${code} reason=${reasonStr || '(none)'} — ` +
    `no further god-events will be captured. orchestrator ` +
    `will not abort (lifecycle-signal contract).`,
  )
  return
}
```

Future audit: should server-initiated 1000/1001 mid-session BE fatal? Today
the orchestrator's session-timeout is the only safety net — if the operator
sets a 15min timeout, the harness can lose 14 of 15 minutes silently. A
follow-up insight could explore making 1000/1001 fatal-by-default with an
opt-out for graceful shutdowns.

## Why the smokes didn't catch this

The `phase4-smoke`, `phase5-smoke`, `phase6-launcher-smoke`, and
`phase6-board-launcher-smoke` all run for under 60 seconds. The server's
heartbeat timeout fires at 40s. Smokes that complete in 10-30s never trigger
the heartbeat.

The only test that exercises a real session past 40s is **live calibration**.
This is a recurrence of insight 033's lesson: smokes catch mechanism bugs;
calibration catches latency / time-dependent bugs.

A targeted regression test (heartbeat-aware smoke that runs ≥60s) would have
caught this. Worth adding as a Phase 6 follow-up.

## Insight Trail (Phase 6 Unit 3 calibration cycle)

- **031** — Phase 4 D15 deferred → discovered at integration (per-seat MCP
  isolation; closed by Unit 2.5).
- **032** — No game-start mechanism under Option A; agents lobby-waited
  forever (closed by Unit 2.6 — orchestrator-owned board client).
- **033** — Board launcher's 60s default timeout too tight for real Claude
  agent dispatch; agents arrived after the click deadline (closed by
  `boardViewWaitForStartTimeoutMs` defaulting to `sessionTimeoutMs`).
- **034 (this one)** — God subscriber's silent heartbeat death; harness ran
  but observed nothing for 12 minutes.

Calibration found four distinct harness gaps in three live attempts. Each
caught earlier would have been cheaper, but each was undetectable without
running the harness against real Claude agents at real session lengths.

## Lesson

**Silent failure compounds.** Bug A (no pong) by itself would just kill the
connection. Bug B (silent 1001 handling) by itself would just be a debt
note. Together they produced 12 minutes of fake-running harness — orchestrator
showed `outcome=success`, isolation audit PASS, triage produced specs — all
while telemetry was zero from t=40s onward. Outcome reporting passed every
check that wasn't "did we actually capture data."

The defense-in-depth log fix is small but important: even if no current
caller cares about the fatal signal, surface the SILENT close as a console
warning so the next operator running a session sees "I lost god at 40s" in
their log instead of "everything looks fine; no telemetry though, weird."

**Generalization:** treat any path that says "we'll silently leave $X
pending; the upstream will notice some other way" as a failed contract until
you can name the upstream signal. If you can't name it, the failure mode is
silent.

## Next

Verify the fix with a targeted retry. If it sticks, Unit 3 calibration is
ready to produce real coverage data.
