---
title: PartySocket's default maxRetries:Infinity + browser-native WS error logs = unbounded reconnect attempts when the server vanishes
date: 2026-04-26
updated: 2026-04-27
modules: [src/client/connection, scripts/playtest/lib/orchestrator, scripts/generate-playtest-seat-agents]
tags: [websocket, reconnect, partysocket, exponential-backoff, harness-teardown, calibration-finding]
severity: P1
---

## Problem (observed — separated from extrapolation)

Phase 6 Unit 3 calibration run `runs/2026-04-26-1303-3p/` produced two
seat agents that hit unbounded reconnect behavior:

- **Seat 2:** Was actively playing — hand=6, pile=29, Favor pending.
  At `17:33:30Z` they logged "Server crash detected." That timestamp
  matches `session.md`'s `finished-at: 2026-04-26T13:33:32` exactly. The
  orchestrator's session-end teardown killed wrangler (`stopServers`)
  while seat-2's browser tab was still live. 7 minutes of partysocket
  reconnect attempts followed → seat-2 reported "1.6M log entries" → tab
  reset to join screen.
- **Seat 3:** Never made it into the lobby — the third-seat-fails-to-join
  pattern (TODO #6). After 25+ minutes on the join screen, the page
  transitioned to "Re-establishing channel..." and seat-3 reported
  "572k+ console entries" within ~5 seconds, then unresponsive tab.

`events.jsonl` confirms only Seat1 + Seat2 actually entered the game.
Seat-3's WS handshake never completed.

## Original framing was wrong

The first version of this insight extrapolated to "any real player on
subway is one minute from a bricked tab." That was unverified. The two
triggers we actually observed were both **harness-specific**:

1. Orchestrator killed wrangler while a seat browser was still live
   (a teardown timing issue under Option A, where the orchestrator has
   no handle to seat-agent-owned MCP browsers — `seat.page === null` in
   `run-session.ts:586`).
2. Initial WS handshake never completed (third-seat-fails-to-join).

We did not observe a real-player network-drop scenario. The defensive
client-side fix below would also help that case, but the P0 framing was
unsupported by evidence.

The original draft also located the bug in `src/client/connection.ts`
reconnect logic. That file has **zero reconnect logic** — it's a thin
wrapper around the `partysocket` npm library, which manages reconnect
internally. The bug was in our default-options posture, not our code.

## Root cause (verified against partysocket source)

`partysocket@1.1.16` defaults (`node_modules/partysocket/dist/ws.js:55`):

```ts
const DEFAULT = {
  maxReconnectionDelay: 10_000,                // 10s cap
  minReconnectionDelay: 1000 + Math.random() * 4000, // 1-5s with jitter
  reconnectionDelayGrowFactor: 1.3,
  connectionTimeout: 4000,
  maxRetries: Number.POSITIVE_INFINITY,        // never gives up
  debug: false,                                // partysocket itself stays silent
}
```

Two facts compose into the storm:

- `maxRetries: Infinity` — partysocket retries forever when the server
  is unreachable. There is **no event** when reconnect fails terminally
  because there is no terminal failure. The connection layer never
  signals "give up."
- The browser's native WebSocket implementation logs
  `WebSocket connection to 'ws://...' failed:` to the devtools console
  on every failed connect attempt. This is unsuppressible from
  application code. With a 10s cap that's ~6 entries/min in the
  steady-state retry loop.

`src/client/player/main.tsx:20-21` adds `window.addEventListener('error'/'unhandledrejection')` global handlers that re-log via `console.error`,
multiplying entries on top of the native logs. None of this reaches
1.6M in 7 minutes by itself — the seat-agent's reported counts likely
also include Playwright's accumulating `browser_console_messages`
buffer plus duplicate emissions across long sessions. The exact
multiplier is uncertain, but the underlying defect (unbounded
retries + unsuppressible native logs + global handlers) is verified.

## Fix (shipped 2026-04-27)

### Client side

`src/client/connection.ts`:

- Pass explicit `maxRetries: 10` to `PartySocket`. With min delay 1-5s,
  growth 1.3x, cap 10s, this caps the retry budget at ~75-90s of
  wall-clock — long enough to ride out a brief tunnel/elevator drop,
  short enough that a real outage surfaces a refresh affordance.
- Pass a `debugLogger: () => {}` for defense in depth. Even if `debug:
  true` is ever flipped on by accident, partysocket library logs route
  to a noop.
- Track `consecutiveFailedAttempts` locally — increment on each close,
  reset on every open. When the count reaches `MAX_RETRIES`, flip
  status to `'gave-up'` and emit. partysocket itself does not signal
  this state.
- New `'gave-up'` status (added to `ConnectionStatus` union). Treated
  as "needs restart" by `connect()` short-circuit (a re-call from the
  same room while in `'gave-up'` falls through to a fresh socket).

`src/client/player/ConnectionOverlay.tsx` + `.module.css`:

- New terminal UI for `'gave-up'` — "// CHANNEL DOWN" headline (mono,
  hot-red) + "Reconnect failed. Refresh to rejoin." subtext + tappable
  Refresh button that calls `window.location.reload()`. No spinner —
  the spinner implies "we're working on it"; gave-up means "we
  stopped."

### Harness side

`scripts/generate-playtest-seat-agents.ts` + `scripts/playtest/agents/seat-{scripted,free-play}.md`:

- Added `mcp__${ns}__browser_close` to the seat-agent tool whitelist
  (12 tools, was 11).
- Updated EXIT CONDITIONS to require seat agents call
  `browser_close` before exiting. Under Option A the orchestrator has
  no handle to the seat's MCP browser — only the seat agent itself can
  close it. Failing to close before exit leaves the tab pointed at
  wrangler, which the orchestrator's `stopServers` then kills,
  triggering the partysocket reconnect loop on an orphaned browser.

The previous classification of `browser_close` as
"orchestrator-owned lifecycle" was correct for Option B (legacy shared
browser). Under Option A (per-seat MCP, calibration path) lifecycle
**must** belong to the agent — that was a deferred Option-A wiring
gap, not a relaxation of isolation.

## Verification

- `src/client/connection.test.ts` (new, 5 tests): asserts maxRetries +
  noop debugLogger are passed to PartySocket; asserts threshold +
  reset behavior of `consecutiveFailedAttempts`; asserts gave-up emits
  exactly once and a fresh `connect()` restarts the budget.
- `tests/e2e/reconnect-bounds.spec.ts` (new): asserts that forcing a
  phone offline mid-session keeps console output under 100 entries
  for 30s. Pre-fix would already be in the thousands.

**Coverage gap (acknowledged):** Playwright's `page.context().setOffline(true)`
simulates "no network" — the browser process stays alive, the WS
attempts fail at the network layer. The original observed trigger was
"server vanishes, browser keeps trying" — wrangler deliberately killed
while the browser keeps attempting connect. These are similar but not
identical. A targeted regression that kills wrangler mid-session and
keeps the browser alive would close the gap. Deferred — the bounded-
retry contract is the same regardless of trigger, and the e2e test
exercises that contract.

## Key Insight

**Library defaults assume "the server's coming back" by default. They are
wrong by default for our use case.** PartySocket's `maxRetries: Infinity`
is sensible for a multiplayer-game library where servers stay up across
deploys. It is wrong for a tab whose backend can vanish (mid-session
deploy, crash, harness teardown). Always audit library defaults at
integration time — what's "polite" for the library is "unbounded loop"
for the embedding application.

**Trace before you frame.** The original draft of this insight
extrapolated to "P0 player-facing — subway = bricked tab" without ever
verifying the trigger. Two separate things were confused:

1. The defect (real, reproducible class).
2. The trigger (harness teardown timing, NOT a real-player condition we
   observed).

Severity classification follows the intersection: a real defect with a
non-real trigger is P1 defensive, not P0 active. Briggsy caught the
overreach during review. Always separate observed-fact from extrapolated-
risk in insight write-ups, especially when severity is at stake.

## Related

- Insight 020 — subagent capability enforcement is frontmatter, not
  wrapper. The seat-agent tool whitelist edits here apply that
  pattern: a security-sensitive surface lands as a reviewable diff to
  the generator + an explicit re-run.
- Insight 031 — preferred architecture deferred then discovered at
  integration. The `browser_close` reclassification is another Option-
  A discovery — a tool that was correctly orchestrator-owned under
  Option B becomes correctly agent-owned under Option A. The
  "lifecycle belongs to the orchestrator" comment in the original
  generator was outdated for Option A.
- Insight 034 — god-subscriber heartbeat-timeout. Different layer
  (harness's own WS handler vs the player client's), but both are
  "reconnect path needs explicit terminal handling."
