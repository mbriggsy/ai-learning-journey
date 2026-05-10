---
title: Pub/sub feature-detection breaks when emission is gated by a transient internal flag, not by the message-shape contract
date: 2026-04-24
modules: [src/server/room.ts, scripts/playtest/pre-flight.ts]
tags: [pub-sub, emission-gates, feature-detection, websockets, capability-probes, plan-vs-reality, partyserver, god-events]
---

## Problem

Phase 6 Unit 1's check 5 was specified as: "open a god WebSocket against
an empty room, send a no-op action, and feature-detect `expectedViewerIds`
on the returned `god-event` envelope (phase-2 D4)." Wired it: god WS
connected with 101 Switching Protocols, `playtest-config-ack` arrived,
but no `god-event` envelope ever fired. Added a host-connect trigger via
a second WS (since `handleHostConnect` calls `broadcastGameState`); both
connections accepted with 101, still no `god-event`. Probe timed out at
10s every invocation.

## Root Cause

`src/server/room.ts:902-911`:

```ts
private broadcastGameState(): void {
  if (!this.gameState || this.gameState.phase === 'lobby') return
  const trigger = this.pendingGodEventTrigger
  this.pendingGodEventTrigger = null
  ...
  if (trigger !== null && isPlaytestMode(this.env)) { /* emit god-event */ }
}
```

`god-event` emission is gated by **two** conditions, neither of which
is reachable from any single client message in an empty room:

1. `gameState.phase !== 'lobby'` — host-connect / first join keeps
   the room in lobby phase. `broadcastLobbyState` runs instead, and
   that path doesn't emit god-events at all.
2. `pendingGodEventTrigger !== null` — set ONLY by the engine-action
   dispatch sites (handleAction → engine.dispatch), then read-and-cleared
   inside this same function. Lobby transitions, host-connect, simple
   joins, reconnects, error resyncs all leave it null on purpose
   ("non-dispatch callers leave the trigger null → no god-event emitted"
   per the comment two lines up at room.ts:907-911).

So a probe that wants to assert envelope shape cannot get an envelope
without driving a full game: host-connect + ≥2 joins + start-game + at
least one action dispatch. Way beyond a pre-flight gate's scope.

## Fix

Redefined Unit 1 check 5 as a **handshake probe**: open god WS, send
`playtest-config`, await `playtest-config-ack` with `ok: true`. That
proves wrangler boot, `/health playtest:true`, god origin gate, god
token gate, and playtest mode wired — every precondition the real
probe needs. The pure shape assertion (`assertGodEnvelopeShape`) stays
exported in `scripts/playtest/pre-flight.ts` for Phase 6 Unit 3 to
import and run against the FIRST real god-event during the calibration
session — which is the right moment, because by then the game flow has
naturally dispatched an action and the envelope is on the wire.

## Key Insight

**Verify the gate condition, not the publishable shape, when reading a
pub/sub contract.** "The system emits messages of type T with field F"
describes the message contract. "...iff condition C holds at emission
time" describes the gate. A consumer that only reads the message
contract will write code that's correct about T+F but unreachable when
C is restrictive. For empty-state probes specifically: ask "what's the
minimum stimulus to make the gate fire?" before designing the probe. If
that stimulus is more than a handshake message, the probe must drive a
larger flow OR the assertion has to move to a later moment when the
gate naturally fires.

The cheap prevention: when a plan says "open X, send Y, assert Z on
the response," walk the call sites in the producer code and confirm the
emission path Z travels is reachable from Y alone. If it's gated by a
transient flag set elsewhere, document the gate or move the assertion.

This is adjacent to insight 029 (downstream plans reference structured
data upstream doesn't extract) but more general — not just about
parsers, about ANY conditional emission gate.

## Also Applies To

- Any pub/sub feature-detection that runs against an idle / empty
  subject. Health probes, capability probes, version-discovery
  endpoints — if the message you're feature-detecting only fires on
  state changes, an empty-state probe will silently time out.
- WebSocket protocols where the server emits typed envelopes
  conditionally (typed-event-only-on-mutation patterns).
- Any test fixture that asserts "first emitted message has shape X"
  without ensuring the subject under test reached a state where it
  emits AT ALL.
- Plan reviews on harness / tooling code that probes a system: if the
  probe's assertion targets a field on a conditionally-emitted message,
  the plan should name the trigger explicitly and audit it against the
  producer's gate.
