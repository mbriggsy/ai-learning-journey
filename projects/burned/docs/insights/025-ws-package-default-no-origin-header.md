---
title: "`ws` package's `new WebSocket(url)` sends no Origin header by default — server origin checks reject silently"
date: 2026-04-24
modules: [scripts/playtest/lib/god-subscriber.ts, src/server/room.ts, src/server/god-connection.ts]
tags: [websocket, ws-package, origin-header, cors, partyserver, god-auth]
---

## Problem

Unit 4's god-subscriber shipped with 26/26 green unit tests. Unit 7's self-test passed all 8 checks — including Check 4 ("god frames don't bleed to player sockets"). Then Unit 8's first live smoke hit `outcome: 'aborted-fatal-close'` with close code `4003 'Forbidden god origin'`. God never connected; the event pipeline never produced output.

## Root Cause

Node's `ws` package, unlike browser `WebSocket`, sends **no `Origin` header by default**. Browsers always attach one (it's a required part of the WebSocket handshake for security); `ws` leaves it optional, on the theory that a Node client is often acting as a server-to-server peer where no browser origin exists.

Phase 2's god-auth gate (`room.ts` fetch handler, insight 023) runs an origin check BEFORE the WS upgrade:
- If `Origin` header is missing → rejected with 403 ("Forbidden god origin").
- If present and matches LAN / `PLAYTEST_GOD_ORIGINS` → accept.

So `new WebSocket('ws://127.0.0.1:8787/parties/game-room/ROOM?role=god&token=<T>')` — perfect URL, valid token — got a 403 pre-upgrade, which `ws` surfaces as `unexpected-response`, which Unit 4 correctly maps to a 4003 fatal close.

**The compounding failure:** Unit 7's Check 4 ("no god frames on player sockets") passed vacuously. Absence-of-leakage is trivially satisfied when god never connects at all. The check needed a companion "presence-of-X" assertion — god DID produce events AND they reached the god subscriber — to catch this class of failure. See insight 027 for that meta-pattern.

## Fix

Added `buildLanOriginFromWsUrl(wsUrl: string): string` that round-trips the host+port from the `ws://` URL into an `http://` origin header. For `ws://127.0.0.1:8787/parties/game-room/ROOM`, the origin is `http://127.0.0.1:8787`, which passes the LAN regex in `src/server/god-connection.ts`. God subscriber now passes `{ headers: { Origin: buildLanOriginFromWsUrl(wsUrl) } }` as the second arg to `new WebSocket(...)`. Phase 2's `scripts/playtest/phase2-smoke.ts:71` had already learned this lesson; Unit 4 just hadn't mirrored it.

## Key Insight

**`ws` ≠ browser `WebSocket`** in default header behavior — specifically Origin, but also `User-Agent`, `Cookie`, and `Sec-*` headers that the spec lets clients omit. Any server that applies browser-shaped auth/CORS checks will treat a bare `ws`-package client as an anonymous / untrusted peer.

When writing a Node WS client against a server designed to accept browsers:
1. Always explicitly set `Origin` to something the server will admit.
2. Verify via actual handshake — not via unit tests on URL construction.
3. If the handshake fails with an HTTP error code, it'll arrive as `unexpected-response`, not `close`.

## Also Applies To

- Any Node-side integration test that talks to a server via a browser-shaped protocol (`fetch`, `EventSource`, `WebSocket`). Default Node clients send fewer headers than browsers; server CORS/origin logic may reject.
- Cloudflare Workers / partyserver WS clients in general — origin checks are common.
- Any future harness unit that connects to the BURNED server as a non-browser client (e.g. a CI linter, a load-test rig).
