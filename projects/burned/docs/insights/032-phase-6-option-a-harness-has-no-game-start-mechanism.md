---
title: "Phase 6 Option A harness has no mechanism to start the game from the lobby — first real calibration finding"
date: 2026-04-25
phase: playtest-harness Phase 6 Unit 3 (calibration)
modules: [scripts/playtest/lib/orchestrator.ts, scripts/playtest/lib/agent-launcher.ts, scripts/playtest/agents/seat-scripted.md, src/client/board, src/client/player]
tags: [playtest-harness, calibration, lobby, board-view, integration, phase-3-vs-phase-6, scope-gap, option-a]
---

## Problem

First Phase 6 Unit 3 calibration session attempt. Pre-flight green, selftest
green (after fixing a stamp-reader divergence — see "Pre-existing
prerequisites fixed" below), orchestrator booted, god WS connected, manifest
emitted, three `playtest-seat-N` agents dispatched in parallel. Each agent
successfully navigated to its `/player.html?room=PLAYTEST&name=SeatN` URL
and landed in the lobby. Then nothing happened. No god-events fired,
`events.jsonl` was never created, all three agents lobby-waited until I
killed them.

Stop messages from each agent confirmed the diagnosis verbatim:

- seat-1: *"Still waiting for the game to start. The board/orchestrator
  hasn't triggered game start yet."*
- seat-2: *"Still waiting in lobby. Let me keep polling at a slightly
  longer interval."*
- seat-3: *"Still in lobby. I'll keep polling — the orchestrator controls
  the start signal."*

## Root Cause

The "Cleared Hot" / start-the-game button lives **only on the board view**
(`src/client/board`), not on the player phone view (`src/client/player`).
In a real BURNED session a human host loads `/board.html` on the TV and
taps the start control once enough operatives have joined the lobby.

Phase 3 smoke (`pnpm playtest:smoke`) accommodated this with a Playwright-
driven board client running alongside the seat clients — the smoke
explicitly does *"host starts the game via board-view 'Cleared Hot'"*
(see TODO.md and the smoke source).

Phase 6 Unit 2.5 / Option A (commit `a07ad10a`) flipped the orchestrator
to `skipBrowserLaunch: true`, retired the orchestrator-owned chromium,
and gave each seat its own MCP-Playwright browser via the per-seat
`playwright-seat-N` MCP servers. The migration was correct as far as it
went — seat agents now own their own pages — but it silently dropped the
*board-view* client. Nobody else picked it up. Phase 6's seat-agent
prompt template (`scripts/playtest/agents/seat-scripted.md`) was written
for the seat persona only and contains no instruction to start the game,
because under the original Option A mental model that wasn't a seat's
job.

The result: a calibration harness that can boot the server, dispatch
seats, and authenticate god — but cannot, by construction, ever produce
a single game action. Confirmed empirically: 3 seats, 3 successful
navigations, 3 lobby observations, 0 god-events, 0 entries in
`events.jsonl`, 0 scenario fires.

## Fix Path Options (between-series — M4 retry-tune scope)

This is harness source change territory; under Phase 6's M4 rule it ends
the current series and pins a fresh SHA for the next. We have not run a
real series yet, so the cost is purely the time spent on the fix
itself.

### Option 1 — Orchestrator dispatches a board-view client (recommended)

Add a `launchBoardView` orchestrator opt that spawns a board.html browser
via the orchestrator's own playwright (NOT a subagent — board doesn't
need scrutiny like seats do; it just needs to tap "Cleared Hot" once).
Lifecycle:

1. Orchestrator starts servers + connects god as today.
2. Orchestrator launches one chromium board page (orchestrator-owned;
   no MCP isolation needed because board has no read-write surface to
   protect).
3. Board page polls until `seats.length >= seats config` joined, then
   taps `Cleared Hot`.
4. Game proceeds. Orchestrator runs the seat-driver as today.
5. Board page idles until session end, then closes.

Why this is the right shape:
- Mirrors the Phase 3 smoke architecture, which we already know works.
- Doesn't touch the seat-agent prompt template or per-seat MCP
  isolation — those were correctly built and shouldn't be reopened.
- Doesn't change product behavior (no auto-start in the engine, no
  god-side start command).
- Smallest blast radius: one new orchestrator dep.

### Option 2 — Server-side auto-start when N seats joined

Modify the engine / lobby to auto-start when player count reaches the
configured target. Rejected because it changes product behavior — real
BURNED sessions wait on a human host tap. Calibration shouldn't drift
the engine semantics.

### Option 3 — God WS sends a start-game action

Extend the god protocol to accept a "start the game" message. Server
support doesn't exist today; building it adds protocol surface that
real product flow doesn't need. Rejected for the same product-creep
reason as Option 2, plus more code.

## Pre-existing prerequisites fixed during the same session

While diagnosing the failure, three other harness defects surfaced and
were fixed in-session as prerequisites; surfacing them here for the
audit trail.

1. **Selftest stamp dual-line format vs orchestrator's single-line
   reader.** `scripts/playtest/selftest.ts:writeStamp` writes
   `<ISO>\n<JSON>\n`. `scripts/playtest/lib/orchestrator.ts:
   defaultReadSelftestStamp` called `.trim()` and passed the whole
   buffer (newline + JSON) to `Date.parse`, which returns NaN. The
   orchestrator then reported "stamp absent" against a freshly-written
   stamp. Fix: split on `\r?\n`, take line 1, parse. Six new unit
   tests guard the regression. Pre-flight's reader was already
   multi-line aware — it had a different parser entirely. Two readers
   for the same file is itself a smell; deferred consolidation is
   noted as a follow-up.

2. **Selftest's wrangler shutdown leaks workerd on Windows.**
   `scripts/playtest/selftest.ts:shutdownProcess` uses
   `child.kill('SIGTERM')` against a `shell: true` spawn. On Windows
   that only kills `cmd.exe`; pnpm + wrangler + workerd survive as
   orphans holding port 8787. The 2026-04-24 fix in
   `server-controller.ts:stopServers` (taskkill /F /T) never reached
   selftest. Calibration attempt #2 hit a 401 because the orchestrator's
   god WS reached a stale workerd from a prior selftest with a
   different `PLAYTEST_TOKEN`. Workaround: skip re-running selftest
   between tooling steps when the stamp is still <24h. Real fix:
   migrate selftest to use `startServers`/`stopServers`. Already on
   the TODO follow-ups list as "Phase 3 Unit 7 selftest polish."

3. **Vite/wrangler port-collision detection.** `server-controller.ts`
   defaults `viteBaseUrl = http://localhost:5173`, and
   `pollViteHealth` hardcodes the same. When 5173 is squatted (e.g.
   by a leaked vite from a prior failed run), the orchestrator's
   own vite lands on 5175, but the seat-agent player URLs still
   point at 5173 — they would silently hit the squatter. This was
   also already on the TODO follow-ups list ("Port 5173 vite
   collision"); no plumbing change made this session, only stale
   processes were killed manually before each retry.

## Lesson

Insight 031 captured "preferred architecture deferred → discovered at
integration." This is a recurrence of the same pattern: the Option A
seat-isolation architecture was completed correctly in isolation, but
the *integration question* — what is the new architecture's analogue
of the Phase 3 smoke's board-view client? — was never asked. Each unit
under Phase 6 had its plan, tests, and smoke, but the harness as a
whole had nothing testing the question "can this run a single game
end-to-end without a human?"

This is exactly what Phase 6 Unit 3 (live calibration) is designed to
catch. Phase 6's plan calls calibration *"the harness is an instrument;
running it uncalibrated is like shipping a scale that hasn't been
zeroed."* The instrument was untunable until calibration revealed the
zero point was offset by a missing component. Calibration earned its
keep on the first attempt.

## Next

Implement Option 1. New units, fresh SHA pin, retry calibration. Three
selftest / port-collision follow-ups remain open in TODO.md and become
prerequisite cleanups before the first real series.
