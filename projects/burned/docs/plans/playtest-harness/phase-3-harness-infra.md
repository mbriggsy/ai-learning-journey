---
title: "Playtest Harness — Phase 3: Harness Infrastructure"
type: feat
status: draft
date: 2026-04-23
parent: docs/plans/playtest-harness/roadmap.md
origin: docs/testing/PLAYTEST-HARNESS-PRD.md
---

# Phase 3 — Harness Infrastructure

## Overview

Build the orchestrator and run scaffolding: a TypeScript harness that boots
dev servers in playtest mode, opens N isolated Playwright contexts (one per
seat), subscribes to the god-event WS stream (emitted from Phase 2's
`broadcastGameState`, NOT from the dispatch site), writes `events.jsonl` with
a scrub + retention policy, lays out the run directory, runs the three-tier
scenario detector (events + projection-assertions + connection-events),
renders a coverage report over the 7-row × 2-column info-gap matrix with an
absolute ≥50 threshold, cycles each run through the three mandatory form-
factor viewports (360×640, 390×844, 768×1024), allocates a configurable
wallclock share (default 20%) to free-play scenarios, mints per-room
playtest tokens, and provides the isolation self-test that PRD §7 requires
before any real session runs. Seat agents (Phase 4) and triage agents
(Phase 5) plug into this infrastructure; they do not build it.

## Problem Frame

The harness has to be trustworthy before the agents mean anything. If seat
contexts leak into each other, if the god-event file misses messages, if the
run directory isn't laid out consistently, every subsequent session is worth
less than the first manual test. Phase 2 made the server side capable; Phase 3
makes the client side — orchestrator, Playwright fan-out, file I/O — a clean
instrument. The isolation self-test is the gate: if it fails, no session runs.

## Requirements Trace

- **R1 (PRD §6.2)** — One command boots server + N phones + N seat pages +
  run directory.
- **R2 (PRD §4.1)** — Each seat runs in an isolated Playwright context. No
  cookie / localStorage / WS-frame bleed between seats.
- **R3 (PRD §4.2)** — Seat pages never load content that exposes
  `window.__gameStoreSnapshot`. Agents get accessibility tree only.
- **R4 (PRD §6.5)** — Run directory is structured exactly as the PRD
  specifies (`session.md`, `seats/`, `suspicions/`, `server/events.jsonl`,
  `issues/`, `coverage.md`).
- **R5 (PRD §7 "Isolation enforcement must be testable")** — Self-test mode
  verifies isolation before any real session.
- **R6 (PRD §9.4)** — Orchestrator performs post-hoc scenario-fire detection
  against `events.jsonl` using the catalog's three-tier fire signatures:
  `events:` (required), `projection-assertions:` (optional, axis 11),
  `ui-assertions:` (prose; seat-agent-verified), `connection-events:`
  (optional, axis 13 connectivity), and `inference:` (optional prose).
  Detector parses all four machine-consumable tiers.
- **R7 (PRD §7 "Session determinism")** — Given same seed, events.jsonl
  replays are byte-identical at the server-state level (agent decisions may
  diverge; the game-state-evolution up to each decision point is fixed).
- **R8 (PRD §8.2, revised 2026-04-23)** — Meaningful-coverage success
  criterion is **absolute ≥50 distinct catalog scenarios fired** across the
  session series, NOT a percentage of the uncapped catalog. Coverage
  reporter renders the 7-row × 2-column info-gap matrix (from phase-1 D5 —
  SERVER, ACTOR, TARGET, OTHER-ALIVE, SPECTATOR, DISCONNECTED, BOARD ×
  "Projection returns today" | "Viewer should see") and enumerates cells hit
  vs unhit against the ≥50 absolute threshold.
- **R9 (phase-1 axis 15, orchestrator-level)** — Every session run exercises
  the three mandatory viewports: **360×640, 390×844, 768×1024**. Orchestrator
  owns the cycling; scenarios tagged with `min-viewport:` hints
  (C-01/02/03/06/09/12/21 cluster) are re-fired at each applicable viewport.
- **R10 (phase-1 Unit 5 Part G)** — Orchestrator allocates a configurable
  share of session wallclock to **free-play** scenarios (SCN-FREE-PLAY-*).
  Default 20%. Tuneable via config; Phase 6 calibration confirms.
- **R11 (phase-2 D4 / Unit 6 / Unit 6a)** — God-event envelope is
  `{ type: 'god-event', action, events, stateVersion, nowMs, projections:
  Record<string, PlayerView>, boardView: BoardView }`, emitted from
  `broadcastGameState` in the same per-connection broadcast pass as
  `state-update` + `player-update`. The orchestrator's god subscriber
  consumes `projections[viewerId]` and `boardView` as the canonical
  snapshot for `projection-assertions:` verification — structurally equal
  to the `PlayerView` that viewer received in their concurrent
  `player-update`.
- **R12 (phase-2 Unit 6 Risks — per-viewer splitting)** — When the god-event
  payload exceeds the Unit 8 budget (10-player mid-game should weigh
  < 512 KiB; above that triggers per-viewer splitting), the server emits one
  god-message per viewer, all keyed by the same `stateVersion`. Orchestrator
  reassembles by `stateVersion` before writing a single events.jsonl line.
- **R13 (phase-2 System-Wide Impact)** — Orchestrator defines and enforces
  an `events.jsonl` scrub + retention policy. God-event projections contain
  full `PlayerView` including `myHand` contents; persisting them to disk
  makes transient PII durable. Policy covers: scrub rules, retention window,
  purge command.
- **R14 (phase-2 Open Questions "Flagged for Phase 3")** — Per-room OR
  time-boxed playtest tokens, minted by the orchestrator per session rather
  than relying on the single global `PLAYTEST_TOKEN` Worker secret.

## Scope Boundaries

- **In scope:** Orchestrator script (boot, spawn contexts, subscribe god,
  reassemble split god-events, write file with scrub policy, lay out run
  dir, cycle through the three mandatory viewports, allocate free-play
  wallclock budget), isolation self-test, three-tier scenario-fire detector
  that consumes `SCENARIOS.md`'s `events:` + `projection-assertions:` +
  `connection-events:` tiers against `events.jsonl`, run directory
  scaffolding utilities, coverage report generator rendering the 7×2 info-
  gap matrix against the absolute ≥50 threshold, per-room / time-boxed
  playtest-token minter, events.jsonl retention + scrub + purge tooling.
- **In scope:** Glue that Phase 4 seat agents and Phase 5 triage agents
  will invoke — typed handoff surface.
- **Out of scope:** Seat-agent behavior or prompt (Phase 4). Triage-agent
  behavior or prompt (Phase 5). Calibration session (Phase 6). Any
  server-side change (Phase 2).
- **Out of scope:** A UI for browsing runs. Markdown + jsonl only.

### Deferred to Separate Tasks

- **Remote/cloud orchestrator.** v1 is local-only. A cloud-hosted harness is
  a future project.
- **Parallel session runs.** v1 runs one session at a time. Concurrent runs
  would need run-dir locking; defer.

## Context & Research

### Relevant Code and Patterns

- `scripts/launch-dev-chrome.ts` — prior art for multi-tab browser spawn
  with `node:child_process`, argv parsing, and clean exit. Canonical style
  for `scripts/playtest/*.ts`.
- `playwright.config.ts:18-21` — `webServer` entries with
  `reuseExistingServer: true`. Harness can reuse this config or spawn
  wrangler + vite itself.
- `tests/e2e/fixtures.ts:16-26` — `browser.newContext({...devices['iPhone 13'],
  hasTouch: true})` per-phone. This is the proven isolation model; harness
  mirrors it at N-wide fan-out.
- `tests/e2e/helpers.ts:35-38` — canonical join flow:
  `goto('/player.html?room=${code}')` → fill name input → click "Check In".
- `src/client/player/JoinScreen.tsx:30` — name regex
  `/^[a-zA-Z0-9 .!?_-]{1,12}$/`. Used in lockstep with `room.ts:39` +
  `validation.ts:120`.
- `src/shared/types.ts:29-49` — `GameEvent` taxonomy, input to the
  scenario-fire detector.
- **Phase 2 god-event contract (corrected H-1b)** — `{ type: 'god-event',
  action, events, stateVersion, nowMs, projections: Record<string,
  PlayerView>, boardView: BoardView }` over WS to `role=god&token=<T>`
  connections. Emitted from `src/server/room.ts:755-795`
  (`broadcastGameState`), NOT from the dispatch sites at `:615-627`
  (`handleAction`) or `:631-666` (`dispatchServerAction`). This is a
  by-construction guarantee — not an asserted invariant — that
  `god-event.projections[V]` structurally equals the `PlayerView` viewer V
  received in their concurrent `player-update.payload.state` for the same
  `stateVersion`. `PlayerView` type at `src/shared/protocol.ts:127`,
  `BoardView` at `src/shared/protocol.ts:99`.
- **Phase 2 `playtest-config` message** — `{ type: 'playtest-config',
  seed, nopeWindowMs }` sent pre-game from god connection. **First-write-
  wins per room.** Duplicate sends reject with `PLAYTEST_CONFIG_LOCKED`;
  post-start sends reject with `PLAYTEST_CONFIG_TOO_LATE`. Orchestrator
  MUST NOT retry a locked config write — it must error cleanly and abort
  the run rather than silently continuing with a default seed.
- **Phase 2 god-role connection params** — `role=god&token=<value>`.
  Origin gate defaults to LAN-only (`localhost`, `127.0.0.1`, RFC1918);
  additional origins via `PLAYTEST_GOD_ORIGINS` env (comma-separated).
  Rate-limited auth: 3 failures per 60s → subsequent attempts close
  `4005` before token comparison. Close codes orchestrator must
  distinguish: `4003 'Forbidden god origin'`, `4004 'Playtest mode off' /
  'Missing token' / 'Token mismatch'`, `4005 'Rate limited'`. Existing
  `4001 'Room full'` is never used for god-auth.
- **Phase 2 per-viewer split fallback** — if the Unit 8 payload budget
  (< 512 KiB at N=10 mid-game) fires, the server splits `projections`
  into one god-message per viewer, all keyed by the same `stateVersion`.
  Orchestrator's god subscriber reassembles before writing events.jsonl.

### Institutional Learnings

- `docs/insights/008-adversarial-swarm-review-maximum-overdrive.md` —
  "parallel launch, sequential synthesis." Applies: the orchestrator
  launches N seat agents concurrently but MUST wait for all to finish
  before spawning triage agents. No rolling reduction.
- Memory `feedback-wait-for-all-agents.md` — "if an agent was worth
  spawning, it's worth waiting for."
- Memory `feedback-verify-before-presenting.md` — Claude is QA. The
  isolation self-test is not optional.

### External References

None. Entirely repo-internal scaling of proven patterns.

## Key Technical Decisions

- **D1. Orchestrator is a TS script executed by tsx.** Same convention as
  `scripts/launch-dev-chrome.ts`. Single entry point
  `scripts/playtest/run-session.ts`. Shared modules in
  `scripts/playtest/lib/`.
- **D2. One Playwright `BrowserContext` per seat, one `Page` per context.**
  Per-context isolation is the E2E fixture precedent and provides the
  strongest cookie / localStorage / WS-frame separation Playwright offers.
- **D3. Phone contexts use `devices['iPhone 13']` + `hasTouch: true`** —
  mirrors `tests/e2e/fixtures.ts`.
- **D4. God WS connection owned by orchestrator, never exposed to seat
  contexts.** Orchestrator opens one god connection per session with
  `role=god&token=<T>`. File writes happen in the orchestrator process.
  Seats cannot observe the god channel because it lives outside their
  browser context. **Inbound envelope shape (from phase-2 D4 / Unit 6):**
  `{ type: 'god-event', action, events, stateVersion, nowMs, projections:
  Record<string, PlayerView>, boardView: BoardView }`. The god subscriber
  treats `projections[viewerId]` + `boardView` as the canonical snapshot
  for downstream `projection-assertions:` scenarios — no re-projection,
  no synthesis, no inference. **Reassembly of split god-events
  (from phase-2 R12 / Unit 6 Risks):** when the server splits payloads
  per-viewer (above the 512 KiB threshold), multiple god-messages arrive
  sharing the same `stateVersion`. Subscriber buffers them by
  `stateVersion`, flushes one merged line to `events.jsonl` when all
  expected viewers report OR when a short timeout elapses
  (partial-assembly is logged as a diagnostic, not silently dropped).
  **Close-code handling (from phase-2 Unit 4):** `4003` → abort the run
  with "god origin not allowlisted." `4004` → abort with "playtest mode
  off or token invalid — check server env." `4005` → back off 60s then
  retry at most once (the server counter resets on window roll); second
  4005 aborts. `4001` is **not** a god-auth code and is not retried on
  the god socket.
- **D5. Page navigations blocked from tool use by the seat agent.**
  Orchestrator exposes the seat's `Page` object (or an equivalent handle)
  with a restricted API surface. Direct `page.goto` to arbitrary URLs is
  not part of the agent's allowlist — the orchestrator performs the
  initial join flow before handing control to the agent.
- **D6. `page.evaluate` and `page.addInitScript` are NOT in the agent's
  tool surface.** Per research finding, `window.__gameStoreSnapshot` is
  god-mode; letting an agent run arbitrary JS defeats allowlist isolation.
  Agents interact only via accessibility tree + role-based locators +
  click/fill/press.
- **D7. Run directory is timestamped + seat-count-suffixed.**
  `docs/testing/playtest/runs/YYYY-MM-DD-HHMM-<N>p/`. Orchestrator creates
  the full tree up front so seat agents can write into pre-existing paths.
- **D8. `session.md` is written at start + appended at end.** Start block:
  config (seed, nopeWindowMs, seat count, seat names, started timestamp,
  harness git SHA, catalog SHA). End block: finished timestamp, outcome,
  coverage summary, issues produced.
- **D9. Scenario-fire detector runs post-hoc, not live, and parses the full
  three-tier grammar (phase-1 D3).** After the session ends, orchestrator
  reads `events.jsonl` (whose lines include god-event `projections` +
  `boardView` per phase-2 D4) and walks it against the catalog's fire
  signatures. The grammar has these machine-consumable tiers per scenario:
  - `events:` — **required**. Ordered list of `{ type, where: <field
    matchers> }` entries. `where` supports literal match
    (`cardType: 'call-in-a-favor'`), role binding (`playerId: $ACTOR`,
    `targetId: $TARGET`), and field-presence constraints
    (`namedCardType: $PRESENT` / `$ABSENT`). For negative-signature
    scenarios (expected dispatch error), `events:` is `[]`.
  - `shape:` — **required**. One of `strict` (exact sequence, no extras),
    `contains` (subsequence, other events allowed between), or `negative`
    (no events; expect a dispatch error with a specific code). Default
    `strict`.
  - `projection-assertions:` — **optional** (axis 11 info-visibility
    scenarios only). Asserts a specific field appeared in a specific
    viewer's projection at a specific point. Verified against
    `god-event.projections[viewerId]` — the exact snapshot viewer received
    (phase-2 D4 / Unit 6a). Canonical field path for named-steal is
    `projections[<viewerId>].nopeWindow.namedSteal.namedCardType`
    (viewer-gated to stealer + target at
    `src/server/projection.ts:174`).
  - `ui-assertions:` — **optional, prose only**. Seat-agent-verified, NOT
    detector-verified. Detector ignores this tier except to list it in
    the coverage-report "awaiting seat report" column.
  - `connection-events:` — **optional** (axis 13 connectivity scenarios
    only). Shape: `{ seat, transition: 'disconnect' | 'reconnect', at:
    <event-index | timestamp-relative> }`. Detector verifies against the
    orchestrator's WS lifecycle log (separate transport from
    `events.jsonl` — see D11). Phase 3 owns this log.
  - `inference:` — **optional, prose**. Cites the `engine.ts` function +
    line that produces the pattern. Detector uses it as diagnostic
    context for near-miss matches but does not machine-verify the prose.
  Divergence findings per PRD §9.4: self-reports without detector
  corroboration, detector matches without self-report.
- **D10. Isolation self-test is a mandatory pre-flight.** `pnpm playtest:
  selftest` runs the checks. `pnpm playtest:run` refuses to start unless
  a recent self-test pass is recorded (within last 24h, recorded in a
  .last-selftest file). Stops the "forgot to run it" failure mode.
- **D11. Form-factor axis (phase-1 axis 15) is owned by the orchestrator,
  not the seat agents.** Every run cycles through three mandatory
  viewports: **360×640** (iPhone SE / small Android), **390×844**
  (iPhone 13 / mid Android), **768×1024** (tablet / iPad mini). The
  orchestrator sets the Playwright context's viewport per seat per
  scenario batch; scenarios tagged `min-viewport:` with a specific value
  are only fired at or above that viewport. Cycling policy defaults to
  "same viewport for all seats in a scenario, rotate between scenarios"
  — mixed-viewport-within-a-scenario is a future opportunity, not v1.
- **D12. Free-play wallclock budget (phase-1 Unit 5 Part G).** Default
  20% of session wallclock is reserved for `SCN-FREE-PLAY-*` scenarios;
  remaining 80% drives scripted catalog scenarios. Orchestrator tracks
  elapsed wallclock in each bucket and signals the seat-agent launcher
  (Phase 4) when to hand a free-play directive vs a scripted one. Config
  field `freePlayWallclockFraction` with default `0.20`. Phase 6
  calibration may retune.
- **D13. Coverage render = 7×2 info-gap matrix over absolute ≥50
  threshold.** Coverage reporter generates `coverage.md` with a grid
  keyed on the phase-1 D5 info-gap rows (**SERVER, ACTOR, TARGET,
  OTHER-ALIVE (alive), SPECTATOR (eliminated, connected), DISCONNECTED
  (alive, not connected), BOARD**) × two columns (**Column 1 —
  Projection returns today**, **Column 2 — Viewer should see**). Each
  cell totals how many catalog scenarios whose fire signature touched
  that (vantage, column) pair actually fired this run / session series.
  Success criterion per PRD §8.2: **≥50 distinct catalog scenarios
  fired** (absolute count, not a fraction of catalog). The 7×2 grid is
  the breakdown used to triage under-covered cells, not the pass/fail
  gate. A cell reading 0 after a session series is a scenario-drafting
  signal for the next catalog pass, not a run failure.
- **D14. Per-room / time-boxed playtest-token minter (phase-2
  Open Questions → Phase 3).** Orchestrator does NOT rely on the
  server's single global `PLAYTEST_TOKEN` Worker secret. Instead, at
  run start, the orchestrator mints a session-scoped token, seeds it
  into the server-controller's env (`PLAYTEST_TOKEN=<minted>`) before
  spawning wrangler dev, and uses the same value on the god WS
  connection. Token source: `crypto.randomBytes(32).toString('hex')` (≥
  32 hex chars). Token scope: one token per session, invalidated on
  session end. This is the Phase 3 answer to "a leaked global token
  unlocks every concurrent playtest room" — since each session mints
  its own, a leak is bounded to one run. Time-boxed rotation is deferred
  (single-session lifetime is already a strict upper bound).
- **D15. `events.jsonl` retention + scrub policy (phase-2
  System-Wide Impact).** God-event `projections` carry full `PlayerView`
  including `myHand` contents. Once written to disk, transient in-memory
  PII becomes durable. Phase 3 ships:
  - **Scrub rules:** `events.jsonl` lines are written AS RECEIVED by
    default (diagnostic fidelity for triage). A `--scrub` mode, on by
    default when `NODE_ENV !== 'development'`, hashes `myHand[*].id` and
    strips `myHand[*].type` → `'<redacted>'` before persisting. The
    `events:` array's private-event fields (`combo-steal.cardType`,
    `card-drawn.cardType`) are already server-stripped for non-party
    viewers; those stay verbatim. Scrub applies to the `projections`
    map only.
  - **Retention window:** session directories under
    `docs/testing/playtest/runs/` are treated as ephemeral diagnostics.
    Rolling retention: keep the most recent 10 session dirs by default
    (config: `sessionDirRetention: number`). Older runs are archived
    (tarballed) OR purged based on a `retentionMode: 'archive' | 'purge'`
    config field; default `'archive'`.
  - **Purge command:** `pnpm playtest:purge [--before YYYY-MM-DD]` wipes
    events.jsonl (and optionally the full session directory) for all
    matching runs. No implicit scheduled purge — operator-invoked only.
  - **gitignore:** `docs/testing/playtest/runs/**` is added to
    `.gitignore` at Unit 1. Session artifacts must not reach the repo.

## Open Questions

### Resolved During Planning

- **Seat agents as Claude subagents vs separate processes.** Claude Code
  subagents (`Agent` tool) — they natively support tool allowlists, have
  their own contexts, and integrate with the orchestrator (the main
  Claude session) with zero extra plumbing. Phase 4 details prompt + tool
  list; Phase 3 just exposes the Page handle for the subagent to drive.
- **Browser context strategy.** One context per seat — D2. Proven by E2E
  fixtures; no reason to deviate.
- **Dev server ownership.** Orchestrator boots wrangler + vite itself,
  tracks their PIDs, and shuts them down on session end. Reuses-existing-
  server behavior can be added later if needed.
- **Harness config file format.** YAML or JSON? JSON — one less dep, fits
  the rest of the repo's tooling.

### Deferred to Implementation

- **Scenario-fire detector ambiguity.** If two scenarios share a fire
  signature (possible for close variants), the detector records both as
  possibly-fired. Tie-breaking uses timestamp proximity and/or acting-player
  context. Fine-tune in code.
- **God-event backpressure.** If god-events outpace file-write speed
  (unlikely but possible in stretched-time sessions), buffer in memory and
  flush on interval. Settle at code time.
- **Seed selection policy.** v1: orchestrator generates a random 32-bit
  seed per session, records in `session.md`. Override via config file for
  reproducibility runs.

## Output Structure

    scripts/playtest/
      run-session.ts              ← entry point for `pnpm playtest:run`
      selftest.ts                 ← entry point for `pnpm playtest:selftest`
      purge.ts                    ← entry point for `pnpm playtest:purge`
      lib/
        orchestrator.ts           ← boot, spawn, teardown, viewport cycling,
                                    free-play wallclock accounting
        server-controller.ts      ← wrangler + vite subprocess lifecycle
        token-minter.ts           ← per-session PLAYTEST_TOKEN minting
        god-subscriber.ts         ← WS god connection + split-god-event
                                    reassembly + events.jsonl writer
        connection-log.ts         ← WS lifecycle log (disconnect/reconnect
                                    events keyed by seat + stateVersion) —
                                    feeds axis-13 detector
        seat-factory.ts           ← Playwright context + page + join flow +
                                    viewport assignment
        run-directory.ts          ← layout creation + session.md writer
        scrubber.ts               ← events.jsonl scrub policy (hashes
                                    myHand ids, strips hand types)
        retention.ts              ← session-dir rotation (archive or purge)
        scenario-detector.ts      ← parses SCENARIOS.md's three-tier grammar
                                    (events + projection-assertions +
                                    connection-events + inference) +
                                    matches events.jsonl + connection-log
        coverage-reporter.ts      ← writes coverage.md (7×2 info-gap grid,
                                    ≥50 absolute threshold)
        types.ts                  ← shared Config, SeatHandle, SessionResult,
                                    GodEvent, CoverageReport, ConnectionEvent
      config/
        default-config.json       ← seat counts, timings, viewports,
                                    freePlayWallclockFraction, retention
      README.md                   ← harness operator docs

    docs/testing/playtest/
      runs/                       ← gitignored; ephemeral diagnostics
        YYYY-MM-DD-HHMM-Np/       ← created per run
          session.md
          seats/                  ← seat-N.log.md written by Phase 4 agents
          suspicions/             ← seat-N.suspicions.md written by Phase 4
          server/events.jsonl     ← written by orchestrator (Phase 3),
                                    scrubbed per D15 unless --no-scrub
          server/connections.jsonl← WS lifecycle log (D9 axis-13 source)
          issues/                 ← created empty; Phase 5 fills
          coverage.md             ← written by orchestrator post-hoc,
                                    rendered as 7×2 info-gap grid

## High-Level Technical Design

> *Directional guidance for review, not implementation specification.*

### Orchestrator lifecycle

```text
pnpm playtest:run [--config path] [--seats N] [--seed S] [--viewport WxH]
    │
    ▼
run-session.ts
  1. Load config (default + overrides). Assert freePlayWallclockFraction ∈
     [0, 1]; default 0.20. Assert viewport list contains at minimum one of
     {360×640, 390×844, 768×1024} per R9.
  2. Precondition gate: isolation self-test stamp < 24h old → else bail.
  3. Create run directory (run-directory.ts) with empty tree; start
     connection-log.jsonl.
  4. Mint per-session token (token-minter.ts): 32 hex chars from
     crypto.randomBytes.
  5. Start servers (server-controller.ts): wrangler dev with
     PLAYTEST_MODE=1 and PLAYTEST_TOKEN=<minted>; vite dev. Wait for both
     healthchecks.
  6. Open god WS (god-subscriber.ts) with role=god&token=<minted>.
     - On close code 4003 → abort: "god origin not allowlisted."
     - On close code 4004 → abort: "playtest mode off or token invalid."
     - On close code 4005 → back off 60s and retry exactly once; second
       4005 aborts.
  7. Send 'playtest-config' { seed, nopeWindowMs } to server.
     - On success → store, continue.
     - On PLAYTEST_CONFIG_LOCKED → abort cleanly (do NOT retry). First
       writer already locked the room; run cannot proceed with a
       deterministic seed.
     - On PLAYTEST_CONFIG_TOO_LATE → abort; game already started,
       orchestrator state is inconsistent.
  8. Create N seats (seat-factory.ts), assigning the run's target
     viewport to each context:
       a. newContext({
            ...devices[<iPhone13|iPhoneSE|iPadMini>],
            hasTouch: true,
            viewport: { width, height },
          }).
       b. newPage().
       c. Navigate to /player.html?room=<CODE>.
       d. Join with seat name from config.
       e. Return SeatHandle { seatId, page, name, viewport, logPath,
          suspicionPath }.
  9. Hand N SeatHandles + the free-play wallclock controller to Phase 4's
     seat-agent launcher. (Phase 4 owns the subagent spawn; Phase 3
     exposes the handle + wallclock signal.)
 10. Wait for all seat agents to finish (parallel launch, sequential
     synth). Track per-seat disconnect/reconnect transitions → append to
     connections.jsonl.
 11. If multi-viewport cycling is configured, tear down contexts, update
     the active viewport, and repeat steps 8-10 for the next viewport
     batch in the run. (Servers + god WS stay up across viewport rotations
     to preserve one events.jsonl per session.)
 12. Stop servers, close contexts, close god WS.
 13. Run scenario-detector (three-tier, consuming events.jsonl +
     connections.jsonl) + coverage-reporter → coverage.md (7×2 grid,
     ≥50 threshold).
 14. Finalize session.md with end block (free-play-vs-scripted split,
     viewports exercised, coverage summary).
 15. Apply retention policy (retention.ts) — archive or purge older
     session dirs per config.
 16. Exit. Phase 5 triage is a separate follow-up command on the run dir.
```

### God subscriber data path

```text
WS frames from server on role=god connection
  → each message = {
       type: 'god-event',
       action,
       events,
       stateVersion,
       nowMs,
       projections: Record<string, PlayerView>,  // phase-2 D4
       boardView: BoardView,                     // phase-2 D4
     }
    │
    │  split-god-event reassembly (phase-2 R12 / Unit 6 Risks):
    │  if server emits one message per viewer (payload budget fallback),
    │  messages carry the same stateVersion and a partial projections map.
    │  Subscriber buffers by stateVersion, merges when all expected
    │  viewers accounted for OR a timeout elapses (partial flushed with
    │  diagnostic annotation, never silently dropped).
    ▼
  scrubber.ts (if scrub mode):
    hash projections[*].myHand[*].id; strip projections[*].myHand[*].type
    ( events[] private fields already server-stripped per viewer — leave
      as received; projections map is the durable-PII surface )
    ▼
  JSON.stringify(mergedMessage) + '\n'
    │
    ▼
  appendFile(run/server/events.jsonl, line)
```

Buffered with an in-memory queue + flush-on-interval for backpressure; flush
final on session end before the file is closed. Connection-level events
(god WS close, server-reported stateVersion gaps) appended to
`run/server/connections.jsonl` in parallel for the axis-13 detector.

### Seat-factory join flow

```text
seat-factory.ts createSeat(context, roomCode, seatName, seatId)
  page = await context.newPage()
  await page.goto(`/player.html?room=${roomCode}`)
  await page.locator('input[type="text"]').fill(seatName)
  await page.locator('button:has-text("Check In")').click()
  await page.waitForSelector(lobbySelector)   // proof of join
  return SeatHandle {...}
```

### Isolation self-test (selftest.ts)

Runs a minimal harness session (2 seats) and checks:

1. **Cookie isolation:** Seat 1 sets a cookie via join; seat 2's
   `context.cookies()` returns an empty list for the same URL.
2. **LocalStorage isolation:** Seat 1's page stores a value; seat 2 cannot
   read it.
3. **WS frame isolation:** Seat 1 intercepts its own WS frames via
   `page.on('websocket')`; seat 2's interception does not see seat 1's
   frames.
4. **God-event non-delivery to players:** Seat 1 intercepts WS frames;
   asserts NO `god-event` messages arrive. God subscriber receives them.
5. **`__gameStoreSnapshot` not exposed to agent:** Seat 1 agent's tool
   allowlist (loaded from Phase 4 spec) does not include `page.evaluate`
   or any JS-eval primitive. (Validates the allowlist definition, not a
   runtime behavior.)
6. **Token gate:** A god connection attempted with wrong token is
   rejected with close code **4004** `'Token mismatch'` (NOT 4001, which
   is reserved for room-full). Validates Phase 2 Unit 4 from the harness
   perspective. Additional checks: forbidden origin → 4003; 3+ rapid
   token-mismatch attempts → 4005 before token comparison runs.

Writes `.last-selftest` timestamp on pass. Fails loudly with a table of what
broke.

### Scenario-fire detector (scenario-detector.ts)

```text
Inputs:
  docs/testing/playtest/SCENARIOS.md   (three-tier grammar: events +
                                        projection-assertions +
                                        connection-events + shape +
                                        inference + ui-assertions)
  run/server/events.jsonl              (god-events with full envelope:
                                        { type, action, events, stateVersion,
                                          nowMs, projections, boardView })
  run/server/connections.jsonl         (WS lifecycle: disconnect / reconnect
                                        per seat per stateVersion)
  run/seats/seat-N.log.md              (Phase 4 self-reports)

Output:
  Coverage map {
    scenarioId: [
      { seatId, firstFireAt, matchConfidence,
        tiers: {
          events:        'matched' | 'partial' | 'not-matched',
          projectionAsserts: 'matched' | 'missing-projection' | 'n/a',
          connectionEvents:  'matched' | 'n/a',
          ui:            'seat-reported' | 'not-reported' | 'n/a',
        },
      }
    ]
  }
```

Algorithm (three-tier grammar per phase-1 D3, consumed per D9 above):
1. Parse SCENARIOS.md → array of `{ id, events, shape, projectionAsserts?,
   connectionEvents?, uiAssertions?, inference? }`.
2. Walk events.jsonl in order.
3. For each god-event, evaluate the `events:` tier against scenario
   signatures using `shape: 'strict' | 'contains' | 'negative'`.
4. For scenarios with `projection-assertions:` (axis 11), evaluate the
   assertion against the event's `projections[<viewerId>]` snapshot — the
   exact `PlayerView` that viewer saw (phase-2 D4 / Unit 6a by-construction
   guarantee). Canonical path example:
   `projections[<targetId>].nopeWindow.namedSteal.namedCardType` present
   vs absent (viewer-gated at `src/server/projection.ts:174`).
5. For scenarios with `connection-events:` (axis 13), join events.jsonl by
   `stateVersion` with connections.jsonl entries (the WS lifecycle log
   owned by Phase 3 — separate transport, same run directory) and verify
   the declared `{ seat, transition, at }` sequence.
6. Record fires with acting-player seat id + timestamp + per-tier status.
7. Record divergences: scenarios agents self-reported but events +
   projections + connections don't corroborate; scenarios where all
   machine-verified tiers matched but no seat self-report fires.

### Coverage reporter (coverage-reporter.ts)

Renders `coverage.md` keyed on the phase-1 D5 **7-row × 2-column
info-gap matrix**:

- **Rows (7):** SERVER, ACTOR, TARGET, OTHER-ALIVE, SPECTATOR,
  DISCONNECTED, BOARD.
- **Columns (2):** Column 1 — "Projection returns today" (descriptive,
  cites `src/server/projection.ts`); Column 2 — "Viewer should see"
  (prescriptive, cites `docs/RULES-REFERENCE.md` +
  `docs/PRODUCT-SPECIFICATION.md` + §8.7 Archer acceptance).
- **Cell value:** count of catalog scenarios whose fire signature
  populated this (row, column) pair that actually fired this run /
  session series, plus a list of fired scenario IDs on hover / inline.

Sections:
- **Absolute threshold banner** — `Fired: <N> / target: 50`. Per PRD §8.2
  (revised 2026-04-23), success = **N ≥ 50** distinct catalog scenarios
  fired across the session series. This is the pass/fail gate.
- **7×2 grid** — renders cell counts. Zero cells are drafting signals
  for the next catalog pass.
- **Column-divergence findings** — scenarios where Column 1 ≠ Column 2
  at lock time. These are first-class findings per phase-1 D5, surfaced
  even if the scenario "fired."
- **Form-factor breakdown** — for each viewport (360×640, 390×844,
  768×1024), a row listing scenarios fired under that viewport.
- **Free-play wallclock accounting** — elapsed seconds in free-play
  vs scripted; actual ratio vs configured `freePlayWallclockFraction`.
- **Fired once / fired many / not fired** lists.
- **Divergence findings** — self-report vs detector mismatches per tier.
- **Known-product-call scenarios** — surfaced, not counted against the
  ≥50 total.

## Implementation Units

- [ ] **Unit 1: `scripts/playtest/` scaffolding + `types.ts` contracts**

**Goal:** Establish the folder, shared types, and empty module stubs so
each subsequent unit has a clear slot.

**Requirements:** R1, R4, R9, R10, R11, R13, R14

**Dependencies:** None.

**Files:**
- Create: `scripts/playtest/README.md`
- Create: `scripts/playtest/lib/types.ts` — `Config`, `SeatHandle`,
  `SessionResult`, `GodEvent`, `CoverageReport`, `ConnectionEvent`,
  `Viewport`, `FreePlayBudget` types.
- Create: `scripts/playtest/config/default-config.json`.
- Modify: `package.json` — add `pnpm playtest:run`, `pnpm playtest:selftest`,
  `pnpm playtest:purge` scripts.
- Modify: `.gitignore` — ignore `docs/testing/playtest/runs/**`.
- Create: empty stubs for `run-session.ts`, `selftest.ts`, `purge.ts`, and
  each `lib/*.ts` module (with typed exports only, throwing `Error('not
  implemented')` — the scaffolding compiles).

**Approach:**
- `GodEvent` mirrors Phase 2 Unit 6's outgoing envelope character-for-
  character (field names pulled from `docs/plans/playtest-harness/
  phase-2-playtest-mode.md:161-183` D4 and the HTD at line 348):
  ```ts
  interface GodEvent {
    type: 'god-event'
    action: EngineAction
    events: readonly GameEvent[]
    stateVersion: number
    nowMs: number
    projections: Record<string, PlayerView>   // keyed by playerId
    boardView: BoardView
  }
  ```
  `PlayerView` and `BoardView` are re-declared locally in this module
  (not imported from `src/shared/protocol.ts`) per D11 of the existing
  plan — the harness imports NOTHING from `src/server`, and
  `scripts/playtest/lib/types.ts` mirrors `shared/protocol.ts`'s public
  surface to avoid Workers-types pollution.
- `SeatHandle` is the handoff type Phase 4 consumes:
  `{ seatId, seatName, page, viewport, logPath, suspicionPath,
  scenariosPath }`.
- `Viewport = { width: 360|390|768, height: 640|844|1024, label: string }`.
- `ConnectionEvent = { seatId, transition: 'disconnect' | 'reconnect',
  atStateVersion: number, atNowMs: number }`.
- `FreePlayBudget = { totalMs: number, freePlayMs: number,
  scriptedMs: number, fraction: number }`.
- `Config` shape:
  ```ts
  interface Config {
    seats: number
    seatNames?: string[]
    seed?: number
    nopeWindowMs: number
    roomCode?: string
    catalogPath: string
    outputRoot: string
    viewports: Viewport[]                  // default: 360×640, 390×844, 768×1024
    freePlayWallclockFraction: number      // default: 0.20
    sessionDirRetention: number            // default: 10
    retentionMode: 'archive' | 'purge'     // default: 'archive'
    scrubMode: 'on' | 'off' | 'auto'       // 'auto' = on unless NODE_ENV=development
    godOriginAllowlist?: string[]          // passes through to
                                            // PLAYTEST_GOD_ORIGINS in server env
  }
  ```
- `CoverageReport` shape surfaces the 7×2 grid + absolute count:
  ```ts
  interface CoverageReport {
    firedCount: number                    // absolute, PRD §8.2 threshold = 50
    threshold: 50
    gridCells: Record<
      'SERVER'|'ACTOR'|'TARGET'|'OTHER_ALIVE'|'SPECTATOR'|
      'DISCONNECTED'|'BOARD',
      { column1: number; column2: number; scenarioIds: string[] }
    >
    firedByViewport: Record<string, string[]>
    freePlayAccounting: FreePlayBudget
    divergences: Array<{ kind: 'self-without-detector' | 'detector-without-self'
                       | 'column-1-vs-2' ; scenarioId: string; notes: string }>
    knownProductCalls: string[]
  }
  ```

**Patterns to follow:**
- `scripts/launch-dev-chrome.ts` argv parsing style.
- Existing `src/shared/types.ts` naming conventions.

**Test scenarios:**
- Happy path: `tsc --noEmit` succeeds on the new files.
- Happy path: `pnpm playtest:run --help` prints usage (throws 'not
  implemented' on actual run is acceptable at this unit).
- Happy path: `.gitignore` excludes `docs/testing/playtest/runs/**`.

**Verification:**
- Typecheck clean.
- New pnpm scripts resolve.
- `GodEvent` field names match phase-2 D4 character-for-character
  (`type`, `action`, `events`, `stateVersion`, `nowMs`, `projections`,
  `boardView`).

- [ ] **Unit 2: `run-directory.ts` — layout creator + `session.md` writer**

**Goal:** Deterministic, test-covered run-directory creation and
`session.md` lifecycle.

**Execution note:** Test-first; the layout is a contract consumed by
Phase 4, Phase 5, and post-hoc tooling.

**Requirements:** R4

**Dependencies:** Unit 1.

**Files:**
- Modify: `scripts/playtest/lib/run-directory.ts`.
- Create: `scripts/playtest/lib/run-directory.test.ts`.

**Approach:**
- `createRunDirectory(root, sessionId): RunDirPaths` creates the full tree.
- `writeSessionStart(paths, config): void` writes the start block.
- `appendSessionEnd(paths, result): void` appends the end block.
- Session id format: `YYYY-MM-DD-HHMM-<seats>p` (local time, no seconds).

**Patterns to follow:**
- `node:fs/promises` for all I/O.

**Test scenarios:**
- Happy path: creates all expected subdirectories.
- Happy path: `session.md` contains start fields (seed, nopeWindowMs, seat
  count, seat names, started-at, harness SHA, catalog SHA).
- Error path: root path doesn't exist → throws with actionable message.
- Edge case: session id collision (rerun same minute, same seat count) →
  appends `-2`, `-3`, etc.
- Integration: `appendSessionEnd` preserves start block content.

**Verification:**
- All tests pass; tree exists; markdown opens cleanly.

- [ ] **Unit 3: `server-controller.ts` — wrangler + vite subprocess lifecycle**

**Goal:** Start both dev servers with playtest env vars (including the
per-session token from Unit 3b); wait for healthchecks; teardown cleanly
on session end and on fatal errors.

**Execution note:** Test-first where feasible (contract tests on
configuration building). Live subprocess behavior covered by Unit 8 smoke.

**Requirements:** R1, R7, R14

**Dependencies:** Unit 1; Unit 3b (token minter); Phase 2 Unit 1 (env vars).

**Files:**
- Modify: `scripts/playtest/lib/server-controller.ts`.
- Create: `scripts/playtest/lib/server-controller.test.ts` (for pure bits
  like env construction, command building).

**Approach:**
- `startServers(config, token): ServerHandles` spawns wrangler
  (`pnpm dev:server`) with `PLAYTEST_MODE=1` + `PLAYTEST_TOKEN=<token>`
  (minted by Unit 3b per-session — NOT generated here) + optional
  `PLAYTEST_GOD_ORIGINS=<config.godOriginAllowlist.join(',')>`, and vite
  (`pnpm dev`). Tracks PIDs.
- Healthcheck: poll `http://localhost:8787/` (or the configured origin) and
  `http://localhost:5173/player.html` with a short timeout + retry.
- `stopServers(handles)` SIGTERMs both; SIGKILL if not down after 5s.
- Orchestrator owns the token lifecycle (mint → pass to server via env →
  pass to god-subscriber for the WS connect); server-controller is a
  conduit, not a source.

**Patterns to follow:**
- `scripts/launch-dev-chrome.ts` child_process usage.
- `playwright.config.ts:18-21` webServer patterns.

**Test scenarios:**
- Happy path: command + env construction produces the expected argv + env
  map including `PLAYTEST_MODE=1`, `PLAYTEST_TOKEN=<passed>`, and
  `PLAYTEST_GOD_ORIGINS` when configured (unit-testable without spawning).
- Edge case: `config.godOriginAllowlist` empty/undefined → env does NOT
  set `PLAYTEST_GOD_ORIGINS` (server falls back to LAN + localhost
  defaults per phase-2 Unit 1).
- Error path: token passed in is < 32 hex chars → throw with actionable
  message (defense-in-depth; Unit 3b should have already enforced this).
- Error path: servers fail healthcheck → rejects with the stderr captured.
- Integration: start → healthcheck → stop cycle exits cleanly (covered in
  Unit 8 smoke).

**Verification:**
- Unit tests pass; smoke proves live behavior.
- Token flows from orchestrator → env → server → god WS in one direction.

- [ ] **Unit 3b: `token-minter.ts` — per-session `PLAYTEST_TOKEN` minting**

**Goal:** Mint a fresh, session-scoped `PLAYTEST_TOKEN` so a token leak is
bounded to one run. Replaces reliance on the server's single global
Worker-secret token (phase-2 flagged to Phase 3 in Open Questions).

**Execution note:** Test-first. Token generation is small and
security-relevant.

**Requirements:** R14

**Dependencies:** Unit 1.

**Files:**
- Create: `scripts/playtest/lib/token-minter.ts`.
- Create: `scripts/playtest/lib/token-minter.test.ts`.

**Approach:**
- `mintPlaytestToken(): string` returns
  `crypto.randomBytes(32).toString('hex')` (64 hex chars).
- `mintPlaytestToken` is pure aside from crypto; exposes a
  `withRandomSource(source: () => Buffer)` override for tests.
- Minted tokens never logged. Orchestrator treats the value as
  write-to-env-then-forget; only the in-memory reference survives until
  the god WS connects.
- Single-session lifetime is the strict upper bound on validity. No
  rotation logic needed within a run (kept simple; time-boxed rotation
  deferred until a concrete threat justifies it).

**Patterns to follow:**
- `src/server/validation.ts` constant-time compare convention.

**Test scenarios:**
- Happy path: minted tokens differ across 1000 calls.
- Happy path: minted tokens are 64 hex chars, match `/^[0-9a-f]{64}$/`.
- Edge case: override random source → deterministic output for tests
  only, but documented "never use in production."
- Security: minted token is never returned from any getter that logs;
  grepping `dist/**/*.js` for a specific test-minted token (after a
  build) finds zero matches (prod bundle must not ship playtest paths —
  reuses phase-2 Unit 7 sentinel discipline).

**Verification:**
- All tests pass.
- Typecheck clean.

- [ ] **Unit 4: `god-subscriber.ts` — WS subscription + per-viewer split reassembly + `events.jsonl` writer**

**Goal:** Open one WS as `role=god`, send `playtest-config`, receive
`god-event` stream (including per-viewer splits for large payloads),
**reassemble** split events by `stateVersion`, scrub each via Unit 4b,
append to `events.jsonl`.

**Execution note:** Test-first on the serialization/append/reassembly
logic. Integration-tested via Unit 8.

**Requirements:** R3, R4, R12 (per-viewer split handling — phase-2 Unit 6 Risks / Unit 8)

**Dependencies:** Unit 1, Unit 4b (scrubber); Phase 2 Units 4, 5, 6, 6a.

**Files:**
- Modify: `scripts/playtest/lib/god-subscriber.ts`.
- Create: `scripts/playtest/lib/god-subscriber.test.ts`.

**Approach:**
- `connectGod(url, token, seed, nopeWindowMs, scrubMode): GodHandle` opens
  the WS with `role=god&token=<token>`, sends `playtest-config { seed,
  nopeWindowMs }`, begins consuming inbound god-events.
- **Inbound envelope (phase-2 D4, mirrored in Unit 1 `GodEvent`):**
  `{ type: 'god-event', action, events, stateVersion, nowMs, projections,
  boardView }`. Canonical — no synthesis.
- **Per-viewer split reassembly (phase-2 Unit 6 Risks / Unit 8 —
  REQUIRED handling, not optional):** when the server's
  `projections` map would push the serialized envelope past the ~512 KiB
  soft budget (phase-2 Unit 8), the server emits MULTIPLE god-messages
  sharing the same `stateVersion`, each carrying a partial
  `projections` map (one viewer, or a small subset). Subscriber:
  1. Maintains a `Map<stateVersion, PartialAssembly>` reassembly buffer.
     Entry shape: `{ action, events, nowMs, boardView, projections:
     Record<playerId, PlayerView>, expected: Set<playerId>, receivedAt:
     number }`.
  2. On first message for a given `stateVersion`: record `expected`
     viewer set (the server includes the full connected-player list in
     the envelope metadata — consume it, do not re-derive).
  3. On subsequent messages: merge `projections` entries; the shared
     fields (`action`, `events`, `nowMs`, `boardView`) MUST be
     byte-identical across splits — assert and fail-closed on mismatch
     (indicates a server bug).
  4. When `Object.keys(projections).length === expected.size`: emit the
     merged event downstream (scrubber → jsonl append) and drop the
     buffer entry.
  5. **Reassembly timeout:** if a `stateVersion` entry is still partial
     after **5 seconds** since `receivedAt`, emit a diagnostic warning,
     flush the partial to jsonl with a `partial: true` marker (never
     silently drop), then drop the buffer entry. Timeout is a diagnostic,
     not a fatal.
  - Unsplit events (small payloads) arrive as a single message with
    `projections` already complete — identical code path, the buffer
    entry resolves immediately.
- **Scrub + append pipeline:** every reassembled event runs through
  `scrub(event, scrubMode, salt)` (Unit 4b) before persistence.
  Scrubber throws → god-subscriber fails-closed: log + abort the run.
  **Never** fall back to writing the raw unscrubbed event.
- In-memory append queue + 100ms flush interval. Final flush on `close`.
- JSONL format: one scrubbed `god-event` per line; `action`, `events`,
  and `boardView` preserved verbatim from server (scrubber leaves them
  alone). `projections` is scrubbed per D15.
- `disconnect(handle)` flushes pending, closes WS, closes file handle.
- **Close-code handling (phase-2 Unit 4):** fatal ONLY for auth / origin
  / rate-limit failures — `4003` (forbidden god origin), `4004` (god
  auth), `4005` (rate-limited; retry-once semantics owned by Unit 6
  orchestrator, this handle surfaces the close code to the orchestrator
  and exits). `4001` is NOT a god-auth code (phase-2 Unit 4 test vector
  — that's room-full); treat as protocol error. Per-viewer split is
  **normal flow**, not an error.

**Patterns to follow:**
- `partysocket` for client WS (used by BURNED app code).
- `node:fs` streaming write.
- Reassembly buffer: plain `Map`, explicit timeout via `setTimeout`
  scoped to each entry.

**Test scenarios:**
- Happy path (unsplit): 100 god-events, each with complete `projections`
  → buffer resolves immediately; file has 100 lines, each round-trips
  via `JSON.parse` and passes scrubber contract.
- Happy path (split): 3-way split for N=10 players → 3 messages arrive
  with same `stateVersion`, each carrying partial `projections`; buffer
  merges; one merged line written to jsonl; reassembly asserts
  `action`/`events`/`boardView` equal across splits.
- Split byte-identity check: adversarial split where `action` differs
  between chunks → subscriber fails-closed with diagnostic (server bug
  detection).
- Reassembly timeout: 2 of 3 splits received, 3rd never arrives → after
  5s, partial flushed with `partial: true` marker, warning logged.
- Scrubber throw: scrubber throws on malformed projection → subscriber
  aborts run (fail-closed); jsonl is NOT written with raw event.
- Edge case: WS closed mid-flush → pending messages are flushed on close.
- Error path: close code 4004 (token rejected) → handle surfaces the
  failure to orchestrator for fatal abort (auth class).
- Error path: close code 4003 (origin forbidden) → handle surfaces for
  fatal abort.
- Error path: close code 4005 (rate-limited) → handle surfaces for
  orchestrator retry-once semantics.
- Edge case: event payload contains quotes/newlines → serialized safely
  (standard JSON handles; test explicitly).
- Integration: under Unit 8 smoke, one unsplit round-trip event and one
  forced-split event both land correctly in jsonl.

**Verification:**
- events.jsonl is valid JSONL.
- Reassembly produces byte-equal merged output regardless of split count.
- Scrubber is invoked for every line written.

- [ ] **Unit 4b: `scrubber.ts` — events.jsonl privacy scrubber** *(D15)*

**Goal:** Strip or hash private fields from god-events before the
`god-subscriber` persists them to `events.jsonl`. `projections` carry
full `PlayerView` including `myHand` contents; once on disk, transient
in-memory PII becomes durable. Scrubber is the privacy boundary between
server wire format and disk.

**Execution note:** Pure-function-first; same input always yields same
output. Deterministic under a given hash salt.

**Requirements:** R4, R13 (D15 retention + scrub policy)

**Dependencies:** Unit 1.

**Files:**
- Create: `scripts/playtest/lib/scrubber.ts`.
- Create: `scripts/playtest/lib/scrubber.test.ts`.

**Approach:**
- `scrub(event: GodEvent, mode: 'on' | 'off', salt: string): GodEvent`
  returns a new object with `projections` scrubbed per D15:
  - For every `viewerId` in `projections`, replace each
    `myHand[i].id` with `sha256(salt + id).slice(0, 12)` (hash-and-truncate
    for stable cross-event correlation without reversibility).
  - Replace each `myHand[i].type` with the literal string
    `'<redacted>'`.
  - Leave card COUNTS intact (positions in `myHand` preserved — triage
    still needs to see "hand went from 4 → 3").
  - Leave `boardView` UNTOUCHED (already public — no card identities to
    begin with per `src/server/projection.ts:11-52`).
  - Leave `events[]` UNTOUCHED — server-side `stripPrivateEventFields`
    (`projection.ts:217-241`) already removed the `combo-steal.cardType`
    and `card-drawn.cardType` for non-party viewers; the god-event log
    preserves these verbatim for triage fidelity per D4.
- Mode `'off'` returns the event unmodified (dev-only diagnostic path).
- Mode `'auto'` resolved at orchestrator boot (D15): on when
  `NODE_ENV !== 'development'`, else off.
- Pure: no I/O, no side effects, no dates — deterministic in `(event,
  mode, salt)`.

**Patterns to follow:**
- `crypto.createHash('sha256')` per Node docs.
- Immutable-return convention: deep-clone the `projections` substructure,
  leave everything else referentially equal.

**Test scenarios:**
- Happy path (scrub on): event with `projections: { p1: { myHand:
  [{id:'a', type:'attack'}, {id:'b', type:'burned'}] } }` →
  output has `myHand: [{id:'<12hex>', type:'<redacted>'}, ...]`;
  count preserved; order preserved.
- Happy path (scrub on): `boardView` with `players: [{ cardCount: 4 }]`
  → identical byte-for-byte after scrub.
- Happy path (scrub on): combo-steal event in `events[]` has its
  already-stripped `cardType: null` for non-party viewers preserved
  verbatim; the party viewer's `cardType: 'attack'` is ALSO preserved
  verbatim (events[] is outside scrub scope).
- Determinism: `scrub(e, 'on', salt)` called twice returns `===` byte-
  equal output for stable JSON serialization.
- Mode off: `scrub(e, 'off', salt)` returns `e` unchanged (identity).
- Fail-closed contract: if the scrubber THROWS (e.g. malformed
  projection), the god-subscriber MUST propagate the error and fail the
  write — NEVER fall back to writing the raw event. Test asserts that
  a malformed input throws rather than returns partial.
- Salt rotation: different salts produce different hashed IDs for the
  same input.

**Verification:**
- Unit tests pass.
- Pure-function assertion: `scrub` has no imports from `fs`, `process`,
  or any I/O module (lint check).

- [ ] **Unit 5: `seat-factory.ts` — per-seat context + page + join flow**

**Goal:** Given a browser and a seat config, produce a `SeatHandle` ready
to hand to a Phase 4 agent.

**Execution note:** Test-first where pure (URL building, name validation).
Integration-tested via Unit 8.

**Requirements:** R1, R2

**Dependencies:** Units 1, 3.

**Files:**
- Modify: `scripts/playtest/lib/seat-factory.ts`.
- Create: `scripts/playtest/lib/seat-factory.test.ts`.

**Approach:**
- `createSeat(browser, roomCode, seatName, seatId, runPaths): Promise<SeatHandle>`.
- New `browser.newContext({ ...devices['iPhone 13'], hasTouch: true })`.
- `context.newPage()`.
- Navigate, fill, click per `tests/e2e/helpers.ts:35-38`.
- Wait for lobby selector (name pill appears) — proof of join.
- Return handle with `logPath = <run>/seats/seat-<id>.log.md`,
  `suspicionPath = <run>/suspicions/seat-<id>.suspicions.md`,
  `scenariosPath = docs/testing/playtest/SCENARIOS.md`.

**Patterns to follow:**
- `tests/e2e/fixtures.ts:16-26`.
- `tests/e2e/helpers.ts:35-38`.

**Test scenarios:**
- Happy path: URL built correctly with room code.
- Edge case: seat name fails name regex → throws before navigation.
- Edge case: join times out (server not ready) → throws with actionable
  message.
- Integration (via Unit 8): 2 seats join successfully in the same room.

**Verification:**
- Integration proves end-to-end join.

- [ ] **Unit 6: `orchestrator.ts` — glue**

**Goal:** Sequence Units 2-5 (+ 3b) into a single session lifecycle. Expose
`runSession(config): Promise<SessionResult>` that Phase 4's seat-agent
launcher will call after it has been written.

**Requirements:** R1, R4, R14 (per-session token — D14)

**Dependencies:** Units 2, 3, 3b, 4, 5.

**Files:**
- Modify: `scripts/playtest/lib/orchestrator.ts`.
- Modify: `scripts/playtest/run-session.ts` — call `runSession` from argv.
- Create: `scripts/playtest/lib/orchestrator.test.ts` (at least happy-path
  sequencing with mocked dependencies).

**Approach:**
- `runSession(config)`:
  1. Enforce `.last-selftest` freshness → bail if stale.
  2. `createRunDirectory` + `writeSessionStart`.
  3. **Mint per-session token first (Unit 3b):** `token =
     mintPlaytestToken()` → 32-hex-char string from
     `crypto.randomBytes(32).toString('hex')`. Token is session-scoped per
     D14 (never reuses any global `PLAYTEST_TOKEN` Worker secret); leak
     scope is bounded to this one run.
  4. `startServers(token, ...)` (Unit 3) — spawns wrangler dev with
     `PLAYTEST_MODE=1` + `PLAYTEST_TOKEN=<minted>` in the child env, and
     vite dev. Wait for both healthchecks.
  5. `connectGod(url, token, seed, nopeWindowMs)` (Unit 4) — opens the
     god WS with `role=god&token=<minted>` using the SAME minted value.
     Close codes 4003/4004/4005 map to distinct handlers per D4 (abort /
     abort / retry-once-then-abort); `PLAYTEST_CONFIG_LOCKED` on the
     config send aborts cleanly (phase-2 Unit 5).
  6. Launch Playwright browser.
  7. For each seat: `createSeat` (Unit 5).
  8. Stub seat-agent dispatch — for Phase 3, the stub waits for a
     hardcoded duration or a sentinel signal from stdin. Phase 4 replaces
     the stub with actual agent launches.
  9. On completion: `appendSessionEnd`, shut down in reverse. Token goes
     out of scope on process exit — no cross-session reuse.
- On any error: tear down in reverse; write error to session.md's end
  block. Token is never logged or persisted beyond the child env + god
  WS URL (which stays in-process).

**Patterns to follow:**
- Linear orchestration with try/finally for teardown.
- Token plumbing: mint → env → connect. Never parse from config file,
  never read from global env.

**Test scenarios:**
- Happy path (mocked): mint → startServers → connectGod all invoked in
  order; the string passed to `startServers` child env equals the string
  passed to `connectGod` URL.
- Error path (mocked): error in step 5 (connectGod) → step 4 servers torn
  down, session.md end block contains the error.
- Error path (mocked): stale selftest → bails before step 3 (token never
  minted).
- Error path (mocked): `PLAYTEST_CONFIG_LOCKED` on step 5 config send →
  aborts cleanly without retry.
- Error path (mocked): close code 4005 on god socket → backs off 60s,
  retries once, second 4005 aborts.
- Regression: the token string used for server env and god WS URL are
  literally `===` identical (assert via spy).
- Integration: Unit 8 smoke runs the full sequence and asserts the god WS
  URL's token query param matches the `PLAYTEST_TOKEN` env read by the
  Worker child.

**Verification:**
- Mock-driven tests pass; smoke green.
- Token identity assertion passes (mint output === startServers env ===
  connectGod URL).

- [ ] **Unit 7: `selftest.ts` — isolation self-test**

**Goal:** Executable self-test that verifies all six isolation checks
from High-Level Technical Design. Writes `.last-selftest` on pass.

**Execution note:** Integration-first; this phase IS the proof mechanism.

**Requirements:** R5

**Dependencies:** Units 2-6.

**Files:**
- Modify: `scripts/playtest/selftest.ts`.
- Create: `scripts/playtest/selftest.test.ts` (pure test of the check
  functions where possible).

**Approach:**
- Boot a minimal session (2 seats, short duration).
- Run the six checks. Report per-check pass/fail.
- On all-pass: write `.last-selftest` with timestamp.
- On any fail: print diagnostic table, exit non-zero, do not write
  stamp.

**Patterns to follow:**
- Playwright's own assertion style for the WS-frame / cookie checks.

**Test scenarios:**
- Happy path: all six checks pass → exit 0, stamp written.
- Error path: simulate one failing check (e.g., deliberately leak a cookie
  via a test-only context flag) → exit non-zero, stamp NOT written.
- Edge case: self-test boots servers itself (does not require `runSession`
  to be working end-to-end).
- Integration: runs against real Phase 2 server code.

**Verification:**
- `pnpm playtest:selftest` green.

- [ ] **Unit 8: End-to-end smoke — no seat agents, 2 stub seats, full round trip**

**Goal:** Prove the full Phase 3 pipeline: boot → connect god → join 2 seats
→ one seat plays a known card → god-event written to events.jsonl → shut
down cleanly.

**Execution note:** Integration-first.

**Requirements:** R1, R3, R4

**Dependencies:** Units 2-6.

**Files:**
- Create: `scripts/playtest/smoke.ts`.
- Modify: `package.json` — add `pnpm playtest:smoke`.

**Approach:**
- Invoke `runSession` with a "stub seat driver" that makes one
  deterministic play on seat 1 and quits.
- Assertions:
  - `events.jsonl` exists and has ≥ 1 valid line.
  - `session.md` has start + end blocks.
  - Servers are stopped after run.
  - No orphan PIDs.

**Patterns to follow:**
- `scripts/verify-prod-bundle.ts` assertion style.

**Test scenarios:**
- Happy path: exit 0, files present, server stopped.
- Error path: if servers fail to boot, smoke reports the specific failure.

**Verification:**
- `pnpm playtest:smoke` green locally.

- [ ] **Unit 9: `scenario-detector.ts` — catalog parser + three-tier matcher**

**Goal:** Parse `SCENARIOS.md`'s three-tier fire-signature grammar
(phase-1 D3 / phase-3 D9), walk `events.jsonl` + the orchestrator's WS
lifecycle log (`connections.jsonl`, D11), record scenario fires with
seat/time metadata, and flag divergences against seat-agent self-reports.

**Execution note:** Test-first; pure-function matchers are easy to unit-
test with fixture JSONL.

**Requirements:** R6

**Dependencies:** Units 1, 4, 4b. Catalog from Phase 1.

**Files:**
- Modify: `scripts/playtest/lib/scenario-detector.ts`.
- Create: `scripts/playtest/lib/scenario-detector.test.ts`.
- Create: `scripts/playtest/lib/fixtures/` — sample scenario catalog snippet
  + sample events.jsonl + sample connections.jsonl for tests.

**Approach:**
- Parse catalog via a simple markdown walker keyed on `### SCN-` headers
  and the YAML-ish fire-signature code block. Regex-friendly format from
  Phase 1 §Scenario record shape.
- Per-scenario parsed record (mirrors phase-1 D3 / phase-3 D9 grammar
  character-for-character):
  ```ts
  interface ScenarioRecord {
    id: string                                    // `SCN-<CARD>-<AXIS>-<NN>`
    description: string                           // header text after the id
    tier: 'axis-11' | 'axis-13' | 'other'         // derived from which
                                                  // optional blocks appear
    preconditions: string[]                       // prose "Trigger
                                                  // conditions" bullets;
                                                  // diagnostic-only (not
                                                  // machine-verified)
    fireSignature: {
      events: Array<{                             // REQUIRED; [] for negative
        type: string
        where: Record<string, string | '$ACTOR' | '$TARGET'
                      | '$PRESENT' | '$ABSENT'>
      }>
      shape: 'strict' | 'contains' | 'negative'   // REQUIRED; default 'strict'
      projectionAssertions?: Array<{              // OPTIONAL (axis 11 only)
        viewer: 'ACTOR' | 'TARGET' | 'OTHER_ALIVE' | 'SPECTATOR'
              | 'DISCONNECTED' | 'BOARD'
        path: string                              // e.g. 'nopeWindow.
                                                  // namedSteal.namedCardType'
        expect: '$PRESENT' | '$ABSENT' | string   // literal or sentinel
      }>
      uiAssertions?: string                       // OPTIONAL; prose only,
                                                  // seat-agent-verified
      inference?: string                          // OPTIONAL; cites engine.ts
                                                  // function + line
    }
    connectionEvents?: Array<{                    // OPTIONAL (axis 13 only)
      seat: string
      transition: 'disconnect' | 'reconnect'
      at: number | string                         // event-index | timestamp-
                                                  // relative
    }>
    knownProductCall?: string                     // D4 (phase-1) — E2E-
                                                  // ISSUE-LIST link
  }
  ```
- `matchFires(scenarios, events, connections): FireRecord[]` runs three
  tiers:
  1. **Tier 1 — events matcher.** Walks `events.jsonl` with a sliding
     window per `shape:`. `strict` = exact subsequence with no extras
     between; `contains` = subsequence, extras allowed; `negative` =
     asserts a dispatch-error code, no events. Role bindings (`$ACTOR`,
     `$TARGET`) unify across the window.
  2. **Tier 2 — projection-assertions matcher.** For scenarios with
     `projectionAssertions`, verifies the god-event's `projections[viewerId]`
     snapshot at the matched window contains (or is absent) the cited
     field path. Canonical example: named-steal's
     `projections[<viewerId>].nopeWindow.namedSteal.namedCardType`
     (phase-2 Unit 6a / `projection.ts:174` viewer-gating). No re-projection
     — reads whatever the server put on the wire.
  3. **Tier 3 — connection-events matcher.** For axis-13 scenarios with
     `connectionEvents`, cross-references `connections.jsonl` (WS
     lifecycle log, D11) against the stated transitions, checking the
     declared `at:` index falls within the matched events window.
  Tier 3 is a separate transport from `events.jsonl`; connection
  disconnect/reconnect is NOT a god-event.
- FireRecord fields: `{ scenarioId, seatId, firstEventIdx, lastEventIdx,
  nowMsRange, tier1: 'pass' | 'fail', tier2: 'pass' | 'fail' | 'n/a',
  tier3: 'pass' | 'fail' | 'n/a' }`. A scenario counts as "fired" only if
  all present tiers pass.
- `ui-assertions:` and `inference:` are diagnostic-only (never machine-
  verified) — surfaced verbatim in the coverage report for seat-agent
  corroboration.

**Patterns to follow:**
- `node:stream/promises` or simple line-reader for jsonl consumption.
- Role-binding unification via a small scope map, not a full Prolog.

**Test scenarios:**
- Tier-1 happy path: strict-shape scenario, single fire → one FireRecord
  with `tier1='pass'`, `tier2='n/a'`, `tier3='n/a'`.
- Tier-1 `contains` shape: sparse event stream with extras → matches.
- Tier-1 `negative` shape: dispatch error with cited code present → counts
  as fire; same dispatch without error → not fired.
- Tier-2 happy path: axis-11 named-steal scenario with
  `projectionAssertions` against
  `projections[$TARGET].nopeWindow.namedSteal.namedCardType = $PRESENT` →
  tier1 passes on events window, tier2 reads the god-event projection
  snapshot and sees the field → fire recorded.
- Tier-2 divergence: tier1 passes but `projections[$TARGET]` is missing
  the named-steal field → `tier2='fail'`, logged as a projection-layer
  finding, NOT counted as a fire.
- Tier-3 happy path: axis-13 reconnect-before-resolve scenario with
  `connectionEvents: [{ seat: 'alice', transition: 'disconnect', at: 3 },
  { seat: 'alice', transition: 'reconnect', at: 7 }]` → matcher consults
  `connections.jsonl`, confirms both transitions occurred within the
  events window → fire recorded.
- Tier-3 missing connection log: axis-13 scenario but no matching
  transitions in `connections.jsonl` → `tier3='fail'`, not a fire.
- Edge case: two scenarios with identical tier-1 signatures differing only
  in tier-2 → both evaluated; tier-2 disambiguates.
- Error path: malformed events.jsonl line → skipped with warning, not
  fatal.
- Error path: malformed connections.jsonl line → skipped with warning.
- Integration: real catalog from Phase 1 + events + connections from
  Unit 8 smoke produce at least one matched scenario from each of the
  three tiers (one `events`-only, one with `projectionAssertions`, one
  with `connectionEvents`).

**Verification:**
- Unit tests pass with fixture data for all three tiers.
- Tier identification (`'axis-11' | 'axis-13' | 'other'`) derived solely
  from which optional blocks are present in the parsed signature.

- [ ] **Unit 10: `coverage-reporter.ts` — writes `coverage.md` (7×2 info-gap grid, absolute ≥50)**

**Goal:** Consume scenario-detector output (Unit 9) + seat self-reports
(Phase 4) and render `coverage.md` as the phase-3 D13 / phase-1 D5 **7×2
info-gap grid** with an **absolute ≥50 fired-scenario** pass/fail gate
(PRD §8.2) — not a percentage of catalog.

**Execution note:** Test-first on rendering. The grid structure is pure-
function output from the `CoverageReport` type (Unit 1).

**Requirements:** R6

**Dependencies:** Units 1, 9.

**Files:**
- Modify: `scripts/playtest/lib/coverage-reporter.ts`.
- Create: `scripts/playtest/lib/coverage-reporter.test.ts`.

**Approach:**
- `buildReport(catalog, fireRecords, selfReports, knownProductCalls,
  freePlayAccounting): CoverageReport` returns the Unit 1 `CoverageReport`
  struct (character-for-character) — pure, no I/O.
- `renderCoverage(report: CoverageReport): string` returns markdown. The
  two are separated so tests can assert the struct without parsing
  rendered markdown.
- Grid rows (phase-1 D5 / phase-3 D13, character-for-character):
  **SERVER, ACTOR, TARGET, OTHER_ALIVE, SPECTATOR, DISCONNECTED, BOARD**
  (7 rows).
- Grid columns (phase-1 D5, character-for-character):
  **Column 1 — Projection returns today** (descriptive, cites
  `src/server/projection.ts`) and **Column 2 — Viewer should see**
  (prescriptive, cites `docs/RULES-REFERENCE.md` +
  `docs/PRODUCT-SPECIFICATION.md` + Archer §3 acceptance test) (2
  columns).
- Each cell tallies the scenarios whose fire signature touched that
  (vantage, column) pair AND fired this run. `gridCells[row].column1` /
  `.column2` / `.scenarioIds` mirrors the Unit 1 shape.
- **Pass/fail gate (PRD §8.2):** `report.firedCount >= 50` →
  `PASS`; else → `UNDER-COVERED` with unhit-per-vantage breakdown. The
  7×2 grid is the TRIAGE view, not the gate — a cell reading 0 after a
  session series is a scenario-drafting signal for the next catalog
  pass, not a run failure (D13, final paragraph).
- Markdown sections, in order:
  1. **Summary banner** — `Fired: <N> / target: 50` + PASS / UNDER-COVERED
     verdict.
  2. **7×2 info-gap grid** — markdown table, 7 rows × 2 data columns
     (row label, column1 count, column2 count, scenarioIds summary).
  3. **Fired by viewport** — per-viewport scenario list (D11 three
     viewports).
  4. **Free-play accounting** — free-play vs scripted wallclock split
     (D12).
  5. **Fired scenarios** — flat list with tier-pass breakdown from Unit 9.
  6. **Unfired scenarios** — grouped by axis, each with the vantage cell
     it WOULD have covered.
  7. **Divergences** — self-report vs detector, column-1 vs column-2
     mismatches (the D5 "break the oracle-is-SUT tautology" findings).
  8. **Known product calls** — scenarios fired that carry
     `known-product-call:` tags; noted, suppressed from "new findings"
     count per phase-1 D4.

**Patterns to follow:**
- Existing `E2E-ISSUE-LIST.md` table format for finding rows.
- Markdown table header pinned to D5's exact column labels:
  `| Vantage | Column 1 — Projection returns today | Column 2 — Viewer should see |`.

**Test scenarios:**
- Happy path: `firedCount = 50` → banner shows `Fired: 50 / target: 50`,
  verdict `PASS`.
- Happy path: `firedCount = 60`, 20 in SERVER col1, 10 in ACTOR col2, etc.
  → grid cells total correctly; grid sum equals sum-of-scenario
  (vantage, column) pairs touched, NOT `firedCount` (one scenario can
  touch multiple cells).
- Fail path: `firedCount = 48` → verdict `UNDER-COVERED`; under-covered
  cells listed.
- Edge case: all axis-11 scenarios fired tier1 but failed tier2 projection-
  assertion → grid credits column1 (events matched) but flags column2 as
  a divergence (oracle says viewer "should see" field; projection doesn't
  return it today).
- Edge case: scenario self-reported but no detector match → `divergences`
  array contains `{ kind: 'self-without-detector', ... }`; rendered in
  Divergences section.
- Edge case: detector match without self-report → `{ kind: 'detector-
  without-self', ... }` rendered.
- Edge case: known-product-call scenario fired → appears in Known product
  calls section, NOT in Fired scenarios count toward the `firedCount`
  gate (per phase-1 D4 suppression contract).
- Edge case: 2-player session has no OTHER_ALIVE row content → renders
  the row with `n/a` cells, does not crash.
- Regression: grid row labels and column labels are literal strings from
  phase-1 D5; a test asserts exact equality to catch drift.

**Verification:**
- Unit tests pass.
- Column labels are character-for-character equal to phase-1 D5.
- `firedCount >= threshold (=50)` maps to PASS verdict unambiguously.

- [ ] **Unit 10b: `retention.ts` + `purge.ts` — session-dir rotation + operator purge** *(D15)*

**Goal:** Implement D15's rolling session-directory retention and the
operator-invoked purge command. Stops disk from growing unbounded;
gives operators a safe wipe path when session data is no longer needed.

**Execution note:** Test-first on policy logic (pure selection of what to
rotate / purge); integration-tested for FS ops.

**Requirements:** R4, R13 (D15 retention policy)

**Dependencies:** Unit 1 (types, config shape).

**Files:**
- Create: `scripts/playtest/lib/retention.ts`.
- Create: `scripts/playtest/lib/retention.test.ts`.
- Create: `scripts/playtest/purge.ts` — entry point for `pnpm
  playtest:purge`.
- Modify: `scripts/playtest/lib/orchestrator.ts` — call
  `applyRetention(config)` at Unit 6 step 15.

**Approach:**
- `selectForRotation(dirs: DirEntry[], sessionDirRetention: number):
  { keep: DirEntry[]; rotate: DirEntry[] }` — pure. Sort by session
  timestamp descending, keep top `sessionDirRetention` (default 10),
  rotate the rest.
- `selectForPurge(dirs: DirEntry[], before?: Date):
  { purge: DirEntry[]; keep: DirEntry[] }` — pure. If `before` provided,
  purge everything older; else purge nothing (explicit date required at
  CLI per D15 "operator-invoked only").
- `applyRetention(config: Config): Promise<RetentionResult>` — reads
  `docs/testing/playtest/runs/`, calls `selectForRotation`, then for each
  rotated dir: archive (tar.gz under `runs/_archive/`) or delete per
  `config.retentionMode`. Default `'archive'`.
- `purge(cli: { before?: string; sessionId?: string; fullDir?: boolean }):
  Promise<PurgeResult>` — the `pnpm playtest:purge` entry. Accepts
  `--before YYYY-MM-DD` OR a specific session id. `--full-dir` deletes
  the entire session directory; default deletes only `events.jsonl`
  (preserves `session.md`, `coverage.md`, `issues/` for post-mortem).
- All retention decisions are logged to `docs/testing/playtest/runs/
  _retention.log` (append-only, one JSON line per run).

**Patterns to follow:**
- `node:fs/promises` for FS ops.
- `tar` stream via `node-tar` (already a transitive dep via wrangler) for
  archive mode.
- CLI arg parsing style from `scripts/launch-dev-chrome.ts`.

**Test scenarios:**
- `selectForRotation` happy path: 15 dirs, retention=10 → keeps 10 newest,
  rotates 5 oldest.
- `selectForRotation` no-op: 5 dirs, retention=10 → keeps all 5, rotates
  none.
- `selectForPurge` with `before='2026-04-01'`: dirs dated before purged;
  dirs on/after kept.
- `selectForPurge` without `before`: empty purge set (operator-invoked
  only; no implicit deletion).
- CLI override: `pnpm playtest:purge --before 2026-04-01` calls
  `selectForPurge` with the parsed date; `--session-id
  2026-04-23-1430-3p` restricts to that one id.
- Retention-mode archive: rotated dir becomes `runs/_archive/
  <session-id>.tar.gz`; original dir removed; archive round-trips via
  `tar -xzf`.
- Retention-mode purge: rotated dir deleted outright; no archive written.
- Config override honored: passing `sessionDirRetention: 3` keeps 3,
  rotates all others; default is 10 per D15.
- Orchestrator integration: Unit 6 step 15 calls `applyRetention` after
  `appendSessionEnd`; session just written is never rotated (it IS one
  of the top N).

**Verification:**
- Unit tests pass.
- `pnpm playtest:purge --help` prints usage.
- Default `sessionDirRetention` is literal `10` per D15.

## System-Wide Impact

- **Interaction graph:** New WS client (god subscriber) against the
  Phase 2 god connection. New subprocess management (wrangler + vite
  under orchestrator). New filesystem I/O: run directory tree,
  `events.jsonl` (scrubbed per D15), `connections.jsonl` (WS lifecycle
  log per D11), `_retention.log`, optional archive tarballs under
  `runs/_archive/`.
- **God-event consumption is broadcast-site emission, not dispatch-
  time (phase-2 D4).** The harness makes NO assumption that god-events
  are produced at `dispatch` call sites; they're emitted from
  `broadcastGameState`'s per-connection loop (phase-2 Unit 6). Unit 4
  treats each inbound message as a projection-snapshot tied to
  `stateVersion` + `nowMs`, period. If Phase 2 ever moves the emission
  point, Unit 4's contract is unchanged — envelope shape (phase-2 D4)
  is what's load-bearing.
- **Per-viewer split reassembly (phase-2 Unit 6 Risks / Unit 8).**
  Unit 4 MUST reassemble multi-message splits keyed by `stateVersion`
  before any downstream consumer sees the event. The 512 KiB soft
  budget (phase-2 Unit 8) triggers splits at N=10 players; reassembly
  is REQUIRED flow, not an optional fallback. Diagnostic `partial:
  true` marker for unresolved reassembly after 5s — never silent drop.
- **events.jsonl write path: reassemble → scrub → append.** Every
  line that lands on disk has been (1) merged from its constituent
  per-viewer splits, (2) run through Unit 4b scrubber
  (`projections[*].myHand[*].id` hashed, `.type` redacted; `events[]`
  and `boardView` preserved verbatim), (3) then flushed via Unit 4's
  100ms append queue. Scrubber throws → run aborts; we never fall
  back to raw writes (D15 privacy boundary).
- **Retention + purge (D15).** Unit 10b enforces a rolling
  `sessionDirRetention` (default 10 newest session dirs; older dirs
  archived by default or purged per config). Operator purge (`pnpm
  playtest:purge`) is explicit — no implicit scheduled deletion.
  `docs/testing/playtest/runs/**` gitignored at Unit 1; session
  artifacts never reach the repo.
- **Per-session token minted locally (phase-3 D14, not global).** Unit
  6 mints a 32-hex-char token at run start via Unit 3b; seeds it into
  the wrangler child env (`PLAYTEST_TOKEN`) and uses the same value in
  the god WS URL. No reliance on any global Worker secret. Leak scope
  = one session. Token rotation = session end (implicit, via process
  scope).
- **Hibernation rebuild path (phase-2 alignment).** On Worker
  hibernation wake, the server's projection/broadcast loop rebuilds
  god connections via `this.getConnections()` filtered by the
  `role=god` connection tag (phase-2 Unit 4). Harness-side Unit 4
  continues to consume whatever arrives; the harness does not
  distinguish "fresh WS" from "post-hibernation WS" — reassembly
  buffer keys on `stateVersion` either way.
- **Error propagation — distinct handlers per failure class:**
  - `PLAYTEST_CONFIG_LOCKED` (phase-2 Unit 5) → Unit 6 aborts the run
    cleanly; the room is owned by another playtest-config writer and
    no deterministic seed can be installed. No retry.
  - `PLAYTEST_CONFIG_TOO_LATE` (phase-2 Unit 5) → Unit 6 aborts; game
    already started, orchestrator state is inconsistent.
  - Close code `4003` (forbidden god origin, phase-2 Unit 4) →
    fatal abort with operator-actionable message ("god origin not
    allowlisted — check `PLAYTEST_GOD_ORIGINS`").
  - Close code `4004` (god auth, phase-2 Unit 4) → fatal abort
    ("playtest mode off or token invalid — check server env").
  - Close code `4005` (god rate-limited, phase-2 Unit 4) → Unit 6
    backs off 60s, retries once; second `4005` aborts.
  - Scrubber throw (Unit 4b) → fail-closed: abort run, no raw write.
  - Reassembly timeout (Unit 4) → diagnostic only; partial flushed.
  - Seat-agent failures (Phase 4) → surface per-seat in the seat log,
    do not crash the orchestrator. Coverage is still reported for
    completed seats.
- **State lifecycle risks:** PIDs tracked + reaped on teardown. File
  handles closed explicitly. Playwright contexts closed on session
  end. Reassembly buffer drained on disconnect (partials flushed).
  Token goes out of scope on orchestrator exit.
- **API surface parity:** Orchestrator consumes only Phase 2's public
  contract (god WS envelope per D4, `playtest-config` admin message
  per Unit 5, close-code map per Unit 4, `buildGodProjections` output
  shape per Unit 6a). If Phase 2 changes any of these, Phase 3
  updates in lockstep — Unit 1 types are the pinned contract.
- **Integration coverage:** Unit 8 smoke exercises the full pipeline
  end-to-end including at least one forced-split event. Unit 7 self-
  test gates real sessions.
- **Unchanged invariants:** No server code touched. No shared protocol
  changed. `src/` stays untouched except as consumer (the harness
  imports nothing from `src/server/`; types are mirrored locally under
  `scripts/playtest/lib/types.ts` to avoid Workers-types pollution).

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Playwright context isolation turns out to be less strict than assumed | Unit 7 self-test proves it; failure blocks real sessions via the stamp gate. |
| Seat agents find a way to call `page.evaluate` (escape the allowlist) | Phase 4 writes the allowlist; Phase 3 only defines what's on offer. Self-test check 5 validates that Phase 4's allowlist does not include eval primitives. |
| God-event payload exceeds 512 KiB soft budget at N=10 players, triggering per-viewer splits | Unit 4 REQUIRES reassembly — buffer keyed on `stateVersion`, merges per-viewer splits into one merged event before scrubber + jsonl write. 5s partial-flush diagnostic catches stuck reassemblies. Smoke (Unit 8) asserts both unsplit and forced-split paths round-trip correctly. Server is the authority on split boundary (phase-2 Unit 6 Risks); harness is pure consumer. |
| Scrubber (Unit 4b) throws on malformed projection and raw events get persisted | Fail-closed contract: Unit 4 aborts the run on scrubber throw; raw-write fallback is explicitly banned. Unit tests assert a throw propagates instead of returning partial. Unit 7 self-test could include an adversarial fixture projection to prove fail-closed behavior in CI. |
| Per-session token mint leaks (e.g. via env dump, crash log) | D14 bounds leak scope to one session by design — token is never persisted, never logged, goes out of scope at orchestrator exit. Unit 6 plumbs token via child env only; lint check in Unit 1 bans `console.log(token)`-class statements. No time-boxed rotation mid-run — session lifetime IS the rotation. |
| Token mint collision across rapid sequential sessions | `crypto.randomBytes(32)` = 2^256 space; collision probability is irrelevant. If the Worker's `PLAYTEST_CONFIG_LOCKED` still fires (prior session hasn't cleaned up), orchestrator aborts cleanly and reports. |
| God subscriber misses events during backpressure | Unit 4 queue + flush on close + reassembly buffer with timeout. Smoke validates lossless delivery for small runs; real sessions re-verify. |
| Hibernation mid-session drops god connection | Phase 2 rebuilds via `getConnections()` filtered by `role=god` tag. Harness reassembly buffer keys on `stateVersion` — it does not care whether the WS is a fresh or post-hibernation connection. |
| PID leaks on crash | try/finally + process-group SIGTERM. Unit 8 asserts no orphans. |
| Run-dir collision on concurrent runs | Session id collision handler (Unit 2); concurrent runs formally out of v1 scope. |
| Retention archives balloon disk usage | Default `retentionMode: 'archive'` tarballs older runs but does not auto-delete archives. Operator invokes `pnpm playtest:purge` explicitly (D15, Unit 10b); no implicit scheduled purge. |
| Harness git SHA recorded stale (Claude forgets) | `session.md` writer reads SHA at start via `git rev-parse HEAD` — automated. |
| Dev servers already running from separate terminal | Orchestrator detects (health endpoint responds before spawn) and aborts with clear message — do NOT reuse, because flag + minted token would be unset in the pre-existing process. |

## Documentation / Operational Notes

- `scripts/playtest/README.md` documents operator commands, config file
  shape, and troubleshooting.
- `CLAUDE.md` gets a new **Playtest Harness** section pointing to the PRD,
  roadmap, and the three scripts (run, selftest, smoke).

## Sources & References

- **Origin:** [docs/testing/PLAYTEST-HARNESS-PRD.md](../../testing/PLAYTEST-HARNESS-PRD.md)
- **Parent roadmap:** [docs/plans/playtest-harness/roadmap.md](./roadmap.md)

**Phase 1 (upstream contracts):**
- **D3 — three-tier fire-signature grammar (events / shape /
  projection-assertions / ui-assertions / connection-events /
  inference):** `docs/plans/playtest-harness/phase-1-scenarios.md:176-210`.
- **D5 — 7-row × 2-column info-gap table (SERVER, ACTOR, TARGET,
  OTHER_ALIVE, SPECTATOR, DISCONNECTED, BOARD × Column 1 "Projection
  returns today" / Column 2 "Viewer should see"):**
  `docs/plans/playtest-harness/phase-1-scenarios.md:222-256`.
- **Coverage axes (15, including axis 11 info-visibility, axis 13
  connectivity, axis 15 form-factor):**
  `docs/plans/playtest-harness/phase-1-scenarios.md:429-452`.
- **Coverage target (absolute ≥50, NOT a percentage):** PRD §8.2, cited
  by phase-1 R4 at
  `docs/plans/playtest-harness/phase-1-scenarios.md:65-66` and adopted
  here as phase-3 D13 (see above).

**Phase 2 (upstream contracts):**
- **D4 — god-event envelope emitted from `broadcastGameState` (NOT
  dispatch-site):** `docs/plans/playtest-harness/phase-2-playtest-mode.md:160-183`.
- **Unit 4 — `role=god` acceptance, close codes 4003 / 4004 / 4005:**
  `docs/plans/playtest-harness/phase-2-playtest-mode.md:561-655`.
- **Unit 5 — `playtest-config` first-write-wins + `PLAYTEST_CONFIG_LOCKED`
  error:** `docs/plans/playtest-harness/phase-2-playtest-mode.md:656-748`.
- **Unit 6 — emit-from-broadcast implementation + per-viewer split
  fallback:** `docs/plans/playtest-harness/phase-2-playtest-mode.md:749-867`.
- **Unit 6a — `buildGodProjections(state, boardView, connectedPlayerIds)`
  pure helper:** `docs/plans/playtest-harness/phase-2-playtest-mode.md:868-1087`.
- **Unit 8 — payload budget (< 512 KiB at N=10) + per-viewer split trigger:**
  `docs/plans/playtest-harness/phase-2-playtest-mode.md:1117-1122`.

**Engine / projection anchors:**
- **`broadcastGameState` (god-event emission site):**
  `src/server/room.ts:755-795`.
- **`projectForBoard(state, now, connectedPlayerIds)`:**
  `src/server/projection.ts:11-52`.
- **`projectForPlayer(state, playerId, boardView)`:**
  `src/server/projection.ts:54-100`.
- **`augmentNopeWindowForPlayer` (named-steal viewer-gating at `:174`):**
  `src/server/projection.ts:165-183`.
- **`stripPrivateEventFields` (non-party card-identity scrub):**
  `src/server/projection.ts:217-241`.

**Harness precedent:**
- **Playwright fixture pattern:** `tests/e2e/fixtures.ts:16-26`.
- **Join flow:** `tests/e2e/helpers.ts:35-38`.
- **Multi-process spawn prior art:** `scripts/launch-dev-chrome.ts`.

**Memory feedback / insights:**
- `feedback-wait-for-all-agents.md`
- `feedback-verify-before-presenting.md`
- `docs/insights/008-adversarial-swarm-review-maximum-overdrive.md`
