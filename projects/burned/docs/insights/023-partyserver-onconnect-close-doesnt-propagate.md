---
title: "partyserver `connection.close()` inside `onConnect` under hibernation does not promptly deliver a close frame"
date: 2026-04-24
phase: playtest-harness Phase 2
modules: [src/server/room.ts, src/server/god-connection.ts]
tags: [partyserver, cloudflare-workers, websocket, security, auth, hibernation]
---

## Problem

Unit 4 added god-connection token auth inside `GameRoom.onConnect`. The server correctly computed `evaluateGodAuth → { ok: false, closeCode: 4004, closeReason: 'Missing token' }` and called `connection.close(4004, 'Missing token')`.

The Phase 2 smoke test then observed that Node's native `WebSocket` client saw `onopen` fire and NO subsequent `onclose` event for at least 3 seconds. Server-side logs confirmed `close()` was called — but the client stayed "open." For a security-critical auth gate, this is catastrophic: the server believes it rejected the connection; the client believes it's authenticated.

## Root Cause

partyserver with `static override options = { hibernate: true }` accepts the WebSocket upgrade (responds `101 Switching Protocols`) BEFORE `onConnect` runs. The client-side `onopen` fires on the 101.

When `onConnect` then calls `connection.close(4xxx, reason)`, partyserver queues a close frame into the hibernation-managed WebSocket. Under hibernation semantics the frame doesn't flush immediately — it waits for the next hibernation wake / housekeeping cycle. On Windows/Node against `wrangler dev`, that was observed to be "much longer than 3 seconds" (test gave up waiting).

This is not a bug, it's the architecture: hibernation trades latency for memory efficiency. But it makes `onConnect`-based auth rejection effectively a null operation from the client's perspective.

## Fix

Moved god-connection auth **up to HTTP level**, inside the Worker entry `fetch()` handler, BEFORE `routePartykitRequest` runs:

```ts
if (url.searchParams.get('role') === 'god') {
  if (!isPlaytestMode(env))         return new Response('Playtest mode off', { status: 403 })
  if (!isGodOriginAllowed(origin, getGodOriginAllowlist(env)))
                                     return new Response('Forbidden god origin', { status: 403 })
  if (!token)                        return new Response('Missing token', { status: 401 })
  if (!matchesToken(env, token))     return new Response('Token mismatch', { status: 401 })
  // Fall through to routePartykitRequest — upgrade completes.
}
```

Rejections now return `401`/`403` BEFORE the WS upgrade handshake. Node's native `WebSocket` surfaces this as an `error` event within milliseconds — the client learns immediately. `onConnect` still tags the connection as `role: 'god'` and runs the DO-level rate-limiter as belt-and-suspenders.

## Key Insight

**WebSocket auth for partyserver+hibernation belongs at HTTP level, not in `onConnect`.** The `onConnect` close-code path is reliable for "client misbehaves mid-session" scenarios, but NOT for "reject this connection attempt."

More broadly: any auth gate that must be client-observable synchronously needs to run before the upgrade handshake completes (RFC 6455 §4.2.2 defines 401/403 as valid pre-upgrade rejection responses — this is the spec-intended path).

## Also Applies To

- Any future partyserver project adding pre-upgrade auth (JWT verification, OAuth bearer tokens, IP allowlists).
- PartyKit (the predecessor project) has the same hibernation + `onConnect` architecture. Same pattern applies.
- Any framework where WS upgrade is handled BEFORE the application-level connection callback runs — a broader class that includes most hibernation-capable Workers platforms. If unsure, probe with a reject-in-onConnect test against a real Node client; if the close frame takes >1s to arrive, lift the gate to HTTP.
- "Belt-and-suspenders" pattern: the HTTP-level gate is the enforcement point; `onConnect` can still double-check and hold stateful counters (rate-limiters, per-room bookkeeping) that don't exist at HTTP level.
