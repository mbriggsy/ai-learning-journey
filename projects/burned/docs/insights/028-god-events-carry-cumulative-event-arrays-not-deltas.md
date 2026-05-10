---
title: "god-events broadcast cumulative event arrays, not deltas — flatten via `.slice(priorLen)` or double-count"
date: 2026-04-24
modules: [src/server/game/engine.ts, src/server/projection.ts, scripts/playtest/lib/scenario-detector.ts]
tags: [protocol, events-stream, god-subscriber, playtest-harness, cumulative-state, wire-format]
---

## Problem

Building Unit 9's scenario-detector required walking `events.jsonl` (a stream
of god-events, one per broadcast) and matching event sequences against the
catalog. The naive loop — `for each godEvent: for each event in godEvent.events`
— would double, triple, quadruple-count as the game progressed. A 4-broadcast
game with 4 distinct events would count them as 1 + 2 + 3 + 4 = 10 events.

## Root Cause

`events.jsonl` lines carry the **full cumulative game event history** at each
broadcast, not a delta. Evidence in source:

- `src/server/game/engine.ts` builds every `DispatchResult.state` via
  `events: [...state.events, ...newEvents, ...]` — every handler appends to
  the prior events array rather than replacing it. 10+ call sites, all the
  same pattern.
- `src/server/projection.ts:20,64` reads `state.events` unmodified
  (`stripPrivateEventFields` only masks per-viewer private fields; it does
  not trim). Both `projectForBoard` and `projectForPlayer` emit the full
  cumulative array.
- `broadcastGameState` in `room.ts` emits the projected state directly — the
  god-event envelope's `events` field is whatever the projection returned.

Net result on the wire: broadcast N carries events `[e0, e1, ..., e(k-1)]`;
broadcast N+1 carries `[e0, e1, ..., e(k-1), e_k, e_(k+1)]`. The *new* events
are only at the tail.

## Fix

Delta-flatten when walking the stream:

```ts
export function flattenEvents(godEvents: readonly GodEvent[]): GodEventForMatch[] {
  const flat: GodEventForMatch[] = []
  let priorLen = 0
  for (let g = 0; g < godEvents.length; g++) {
    const ge = godEvents[g]!
    const all = ge.events ?? []
    const newOnes = all.slice(priorLen)
    for (const ev of newOnes) {
      flat.push({ godEventIdx: g, event: ev, nowMs: ge.nowMs, projections: ge.projections, ... })
    }
    priorLen = all.length
  }
  return flat
}
```

Each new event carries a pointer back to its parent god-event so tier-2
(projection snapshot) and tier-3 (timing windows) can still read the
correct broadcast context.

## Key Insight

**Ask "is this stream cumulative or delta?" before iterating any server-
state broadcast log.** The answer is almost never on the wire — you read
it out of the emitting code. BURNED's events[] is cumulative because
`state.events` in the engine is append-only; nothing trims it before
projection. A naive "iterate everything" consumer silently multi-counts
without error.

Two diagnostic signals that the stream is cumulative:

1. Line N's array is a superset of line N-1's (by prefix equality).
2. Per-line array length grows monotonically across broadcasts.

If either holds, consumers must delta-flatten. If the protocol author
meant to emit deltas, they'd trim `state.events` before projection (and
callers would hit `events: [newOnly]` on the wire). BURNED chose
cumulative on purpose — it makes reconnect replay trivial (new client
gets full history in one broadcast) — which is why any consumer downstream
has to do the reverse work.

## Also Applies To

- Any future god-channel consumer (Phase 5 triage, post-hoc analysis tools,
  external replays) — same flattening discipline required.
- `connections.jsonl` when it lands (Unit 4+): verify whether that stream
  is append-only event-per-line (likely yes, given the structure) or a
  snapshot-per-broadcast (would need delta). Today the stub exports
  `ConnectionLog.append(event)` — per-line event, delta not needed.
- Any Redux-style state replay log that bundles full state per tick. The
  "full state" field will need diff-reconstruction if you want to iterate
  only new changes.
- SSE / WebSocket protocols that emit "current full snapshot" instead of
  "change since last" — same trap, same mitigation.
- Any logging pattern where each record carries full history for
  consumer-reconnect convenience. The convenience shifts complexity
  downstream, not out of the system.
