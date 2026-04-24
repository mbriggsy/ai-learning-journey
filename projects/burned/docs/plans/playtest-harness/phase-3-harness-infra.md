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
seat), subscribes to the god-event WS stream, writes `events.jsonl`, lays out
the run directory, and provides the isolation self-test that PRD §7 requires
before any real session runs. Seat agents (Phase 4) and triage agents (Phase 5)
plug into this infrastructure; they do not build it.

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
  against `events.jsonl` using the catalog's fire signatures.
- **R7 (PRD §7 "Session determinism")** — Given same seed, events.jsonl
  replays are byte-identical at the server-state level (agent decisions may
  diverge; the game-state-evolution up to each decision point is fixed).

## Scope Boundaries

- **In scope:** Orchestrator script (boot, spawn contexts, subscribe god,
  write file, lay out run dir), isolation self-test, scenario-fire detector
  that consumes `SCENARIOS.md` + `events.jsonl`, run directory scaffolding
  utilities, coverage report generator.
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
- **Phase 2 god-event contract** — `{ type: 'god-event', action, events,
  stateVersion, nowMs }` over WS to `role=god&token=<T>` connections.
- **Phase 2 `playtest-config` message** — `{ type: 'playtest-config',
  seed, nopeWindowMs }` sent pre-game from god connection.

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
  contexts.** Orchestrator opens one god connection per session. File
  writes happen in the orchestrator process. Seats cannot observe the god
  channel because it lives outside their browser context.
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
- **D9. Scenario-fire detector runs post-hoc, not live.** After the session
  ends, orchestrator reads `events.jsonl`, walks it against the catalog's
  fire signatures (Phase 1 D3), and writes `coverage.md` + divergence
  findings per PRD §9.4.
- **D10. Isolation self-test is a mandatory pre-flight.** `pnpm playtest:
  selftest` runs the checks. `pnpm playtest:run` refuses to start unless
  a recent self-test pass is recorded (within last 24h, recorded in a
  .last-selftest file). Stops the "forgot to run it" failure mode.

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
      lib/
        orchestrator.ts           ← boot, spawn, teardown
        server-controller.ts      ← wrangler + vite subprocess lifecycle
        god-subscriber.ts         ← WS god connection + events.jsonl writer
        seat-factory.ts           ← Playwright context + page + join flow
        run-directory.ts          ← layout creation + session.md writer
        scenario-detector.ts      ← parses SCENARIOS.md + matches events.jsonl
        coverage-reporter.ts      ← writes coverage.md
        types.ts                  ← shared Config, SeatHandle, SessionResult
      config/
        default-config.json       ← seat counts, timings, run options
      README.md                   ← harness operator docs

    docs/testing/playtest/
      runs/
        YYYY-MM-DD-HHMM-Np/       ← created per run
          session.md
          seats/                  ← seat-N.log.md written by Phase 4 agents
          suspicions/             ← seat-N.suspicions.md written by Phase 4
          server/events.jsonl     ← written by orchestrator (Phase 3)
          issues/                 ← created empty; Phase 5 fills
          coverage.md             ← written by orchestrator post-hoc

## High-Level Technical Design

> *Directional guidance for review, not implementation specification.*

### Orchestrator lifecycle

```text
pnpm playtest:run [--config path] [--seats N] [--seed S]
    │
    ▼
run-session.ts
  1. Load config (default + overrides).
  2. Precondition gate: isolation self-test stamp < 24h old → else bail.
  3. Create run directory (run-directory.ts) with empty tree.
  4. Start servers (server-controller.ts): wrangler dev with PLAYTEST_MODE=1
     and a generated PLAYTEST_TOKEN; vite dev. Wait for both healthchecks.
  5. Open god WS (god-subscriber.ts) with role=god&token=<T>.
  6. Send 'playtest-config' { seed, nopeWindowMs } to server.
  7. Create N seats (seat-factory.ts):
       a. newContext({...devices['iPhone 13'], hasTouch: true}).
       b. newPage().
       c. Navigate to /player.html?room=<CODE>.
       d. Join with seat name from config.
       e. Return SeatHandle { seatId, page, name, logPath, suspicionPath }.
  8. Hand N SeatHandles to Phase 4's seat-agent launcher. (Phase 4 owns
     the subagent spawn; Phase 3 exposes the handle.)
  9. Wait for all seat agents to finish (parallel launch, sequential synth).
 10. Stop servers, close contexts, close god WS.
 11. Run scenario-detector + coverage-reporter → coverage.md.
 12. Finalize session.md with end block.
 13. Exit. Phase 5 triage is a separate follow-up command on the run dir.
```

### God subscriber data path

```text
WS frames from server on role=god connection
  → each message = { type: 'god-event', action, events, stateVersion, nowMs }
    │
    ▼
  JSON.stringify(message) + '\n'
    │
    ▼
  appendFile(run/server/events.jsonl, line)
```

Buffered with an in-memory queue + flush-on-interval for backpressure; flush
final on session end before the file is closed.

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
6. **Token gate:** A connection attempted with wrong token is rejected with
   close code 4001. (Validates Phase 2 Unit 4 from the harness perspective.)

Writes `.last-selftest` timestamp on pass. Fails loudly with a table of what
broke.

### Scenario-fire detector (scenario-detector.ts)

```text
Inputs: docs/testing/playtest/SCENARIOS.md, run/server/events.jsonl
Output: coverage map { scenarioId: [ { seatId, firstFireAt, matchConfidence } ] }
```

Algorithm:
1. Parse SCENARIOS.md → array of `{ id, fireSignature: GameEvent[] }`.
2. Walk events.jsonl in order.
3. For each action dispatch, check whether the emitted events match any
   scenario's fire signature (order-sensitive, starting from the signature's
   first event type).
4. Record fires with acting-player seat id + timestamp.
5. Record divergences: scenarios agents self-reported but events don't
   support, and events that match catalog signatures but weren't
   self-reported.

### Coverage reporter (coverage-reporter.ts)

Renders `coverage.md`:
- Table of all catalog scenarios × fired/not-fired × seats.
- List of scenarios fired once.
- List of scenarios fired many times.
- List of scenarios not fired.
- Divergence findings (self-report vs detector).
- Known-product-call scenarios surfaced (noted, not counted against
  "findings" total).

## Implementation Units

- [ ] **Unit 1: `scripts/playtest/` scaffolding + `types.ts` contracts**

**Goal:** Establish the folder, shared types, and empty module stubs so
each subsequent unit has a clear slot.

**Requirements:** R1, R4

**Dependencies:** None.

**Files:**
- Create: `scripts/playtest/README.md`
- Create: `scripts/playtest/lib/types.ts` — `Config`, `SeatHandle`,
  `SessionResult`, `GodEvent`, `CoverageReport` types.
- Create: `scripts/playtest/config/default-config.json`.
- Modify: `package.json` — add `pnpm playtest:run`, `pnpm playtest:selftest`
  scripts.
- Create: empty stubs for `run-session.ts`, `selftest.ts`, and each
  `lib/*.ts` module (with typed exports only, throwing `Error('not
  implemented')` — the scaffolding compiles).

**Approach:**
- Types mirror Phase 2's god-event shape for `GodEvent`.
- `SeatHandle` is the handoff type Phase 4 consumes:
  `{ seatId, seatName, page, logPath, suspicionPath, scenariosPath }`.
- `Config` shape:
  `{ seats: number, seatNames?: string[], seed?: number, nopeWindowMs:
  number, roomCode?: string, catalogPath: string, outputRoot: string }`.

**Patterns to follow:**
- `scripts/launch-dev-chrome.ts` argv parsing style.
- Existing `src/shared/types.ts` naming conventions.

**Test scenarios:**
- Happy path: `tsc --noEmit` succeeds on the new files.
- Happy path: `pnpm playtest:run --help` prints usage (throws 'not
  implemented' on actual run is acceptable at this unit).

**Verification:**
- Typecheck clean.
- New pnpm scripts resolve.

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

**Goal:** Start both dev servers with playtest env vars; wait for
healthchecks; teardown cleanly on session end and on fatal errors.

**Execution note:** Test-first where feasible (contract tests on
configuration building). Live subprocess behavior covered by Unit 8 smoke.

**Requirements:** R1, R7

**Dependencies:** Unit 1; Phase 2 Unit 1 (env vars).

**Files:**
- Modify: `scripts/playtest/lib/server-controller.ts`.
- Create: `scripts/playtest/lib/server-controller.test.ts` (for pure bits
  like env construction, command building).

**Approach:**
- `startServers(config): ServerHandles` spawns wrangler (`pnpm dev:server`)
  with `PLAYTEST_MODE=1` + generated `PLAYTEST_TOKEN`, and vite
  (`pnpm dev`). Tracks PIDs.
- Healthcheck: poll `http://localhost:8787/` (or the configured origin) and
  `http://localhost:5173/player.html` with a short timeout + retry.
- `stopServers(handles)` SIGTERMs both; SIGKILL if not down after 5s.
- Emits tokens to the orchestrator; orchestrator passes to god-subscriber.

**Patterns to follow:**
- `scripts/launch-dev-chrome.ts` child_process usage.
- `playwright.config.ts:18-21` webServer patterns.

**Test scenarios:**
- Happy path: command + env construction produces the expected argv + env
  map (unit-testable without spawning).
- Edge case: PLAYTEST_TOKEN generation is cryptographically random (uses
  `crypto.randomBytes` or equivalent), length ≥ 32 hex chars.
- Error path: servers fail healthcheck → rejects with the stderr captured.
- Integration: start → healthcheck → stop cycle exits cleanly (covered in
  Unit 8 smoke).

**Verification:**
- Unit tests pass; smoke proves live behavior.

- [ ] **Unit 4: `god-subscriber.ts` — WS subscription + `events.jsonl` writer**

**Goal:** Open one WS as `role=god`, send `playtest-config`, receive
`god-event` stream, append each to `events.jsonl`.

**Execution note:** Test-first on the serialization/append logic.
Integration-tested via Unit 8.

**Requirements:** R3, R4

**Dependencies:** Unit 1; Phase 2 Units 4, 5, 6.

**Files:**
- Modify: `scripts/playtest/lib/god-subscriber.ts`.
- Create: `scripts/playtest/lib/god-subscriber.test.ts`.

**Approach:**
- `connectGod(url, token, seed, nopeWindowMs): GodHandle` opens the WS,
  sends config, begins appending inbound god-events to the jsonl.
- In-memory queue + 100ms flush interval. Final flush on `close`.
- JSONL format: one `god-event` per line, exactly as received. No
  re-serialization of the `action` or `events` sub-objects — preserves
  fidelity.
- `disconnect(handle)` flushes pending, closes WS, closes file handle.
- Errors on god connection = fatal (log + abort session).

**Patterns to follow:**
- `partysocket` for client WS (used by BURNED app code).
- `node:fs` streaming write.

**Test scenarios:**
- Happy path: 100 god-events received → file has 100 lines, each
  round-trips via `JSON.parse`.
- Edge case: WS closed mid-flush → pending messages are flushed on close.
- Error path: token rejected → connection closes 4001; handle surfaces the
  failure.
- Edge case: event payload contains quotes/newlines → serialized safely
  (standard JSON handles; test explicitly).
- Integration: under Unit 8 smoke, one round-trip event.

**Verification:**
- events.jsonl is valid JSONL.

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

**Goal:** Sequence Units 2-5 into a single session lifecycle. Expose
`runSession(config): Promise<SessionResult>` that Phase 4's seat-agent
launcher will call after it has been written.

**Requirements:** R1, R4

**Dependencies:** Units 2-5.

**Files:**
- Modify: `scripts/playtest/lib/orchestrator.ts`.
- Modify: `scripts/playtest/run-session.ts` — call `runSession` from argv.
- Create: `scripts/playtest/lib/orchestrator.test.ts` (at least happy-path
  sequencing with mocked dependencies).

**Approach:**
- `runSession(config)`:
  1. Enforce `.last-selftest` freshness → bail if stale.
  2. `createRunDirectory` + `writeSessionStart`.
  3. `startServers` with generated token.
  4. `connectGod` with token + config.
  5. Launch Playwright browser.
  6. For each seat: `createSeat`.
  7. Stub seat-agent dispatch — for Phase 3, the stub waits for a
     hardcoded duration or a sentinel signal from stdin. Phase 4 replaces
     the stub with actual agent launches.
  8. On completion: `appendSessionEnd`, shut down in reverse.
- On any error: tear down in reverse; write error to session.md's end
  block.

**Patterns to follow:**
- Linear orchestration with try/finally for teardown.

**Test scenarios:**
- Happy path (mocked): all steps invoked in order.
- Error path (mocked): error in step 4 → steps 3 torn down, session.md
  end block contains the error.
- Error path (mocked): stale selftest → bails before step 3.
- Integration: Unit 8 smoke runs the full sequence.

**Verification:**
- Mock-driven tests pass; smoke green.

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

- [ ] **Unit 9: `scenario-detector.ts` — catalog parser + event matcher**

**Goal:** Parse `SCENARIOS.md`, extract `id` + `fireSignature`, walk
`events.jsonl`, record scenario fires with seat/time metadata.

**Execution note:** Test-first; pure-function matchers are easy to unit-
test with fixture JSONL.

**Requirements:** R6

**Dependencies:** Units 1, 4. Catalog from Phase 1.

**Files:**
- Modify: `scripts/playtest/lib/scenario-detector.ts`.
- Create: `scripts/playtest/lib/scenario-detector.test.ts`.
- Create: `scripts/playtest/lib/fixtures/` — sample scenario catalog snippet
  + sample events.jsonl for tests.

**Approach:**
- Parse catalog via a simple markdown walker keyed on `### SCN-` headers
  and the "Fire signature" code block. Regex-friendly format from Phase 1.
- `matchFires(signatures, events): FireRecord[]` walks the event log with a
  sliding window.
- FireRecord fields: `{ scenarioId, seatId, firstEventIdx, lastEventIdx,
  nowMsRange }`.

**Patterns to follow:**
- `node:stream/promises` or simple line-reader for jsonl consumption.

**Test scenarios:**
- Happy path: single scenario, single fire → one FireRecord.
- Edge case: two scenarios with identical signatures → both recorded (tie
  flagged).
- Edge case: scenario with `skip-burned` as part of signature not present
  in events → not matched.
- Error path: malformed events.jsonl line → skipped with warning, not
  fatal.
- Integration: real catalog from Phase 1 + events from Unit 8 smoke
  produce at least one matched scenario.

**Verification:**
- Unit tests pass with fixture data.

- [ ] **Unit 10: `coverage-reporter.ts` — writes `coverage.md`**

**Goal:** Consume scenario-detector output + self-reports from seat logs
(Phase 4 will produce these) and render `coverage.md` per PRD §6.7.

**Execution note:** Test-first on rendering.

**Requirements:** R6

**Dependencies:** Unit 9.

**Files:**
- Modify: `scripts/playtest/lib/coverage-reporter.ts`.
- Create: `scripts/playtest/lib/coverage-reporter.test.ts`.

**Approach:**
- `renderCoverage(catalog, fireRecords, selfReports, knownProductCalls):
  string` returns markdown.
- Sections: summary table, fired scenarios, unfired scenarios, divergences
  (self-report vs detector), known-product-call suppression notes.

**Patterns to follow:**
- Existing `E2E-ISSUE-LIST.md` table format.

**Test scenarios:**
- Happy path: 10 scenarios, 3 fired, no divergence → markdown has correct
  counts and rows.
- Edge case: scenario self-reported but no detector match → divergence
  section records it.
- Edge case: detector match without self-report → divergence section
  records it.
- Edge case: known-product-call scenario fired → noted but not counted as a
  "new finding."

**Verification:**
- Unit tests pass.

## System-Wide Impact

- **Interaction graph:** New WS client (god subscriber) against the
  Phase 2 god connection. New subprocess management (wrangler + vite under
  orchestrator). New filesystem I/O (run directory + events.jsonl).
- **Error propagation:** Harness failures fail the session. Server
  failures bubble through god subscriber into session.md end block. Agent
  failures (Phase 4) surface per-seat but don't crash the orchestrator —
  coverage is still reported.
- **State lifecycle risks:** PIDs tracked + reaped on teardown. File
  handles closed explicitly. Playwright contexts closed on session end.
- **API surface parity:** Orchestrator consumes only Phase 2's public
  contract (god WS, playtest-config message). If Phase 2 changes, Phase 3
  updates in lockstep.
- **Integration coverage:** Unit 8 smoke exercises the full pipeline.
  Unit 7 self-test gates real sessions.
- **Unchanged invariants:** No server code touched. No shared protocol
  changed. `src/` stays untouched except as consumer (the harness imports
  nothing from `src/server/`; types are reproduced locally under
  `scripts/playtest/lib/types.ts` to avoid the Workers-types pollution).

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Playwright context isolation turns out to be less strict than assumed | Unit 7 self-test proves it; failure blocks real sessions via the stamp gate. |
| Seat agents find a way to call `page.evaluate` (escape the allowlist) | Phase 4 writes the allowlist; Phase 3 only defines what's on offer. Self-test check 5 validates that Phase 4's allowlist does not include eval primitives. |
| God subscriber misses events during backpressure | Unit 4 queue + flush on close. Smoke validates lossless delivery for small runs; real sessions re-verify. |
| PID leaks on crash | try/finally + process-group SIGTERM. Unit 8 asserts no orphans. |
| Run-dir collision on concurrent runs | Session id collision handler (Unit 2); concurrent runs formally out of v1 scope. |
| Harness git SHA recorded stale (Claude forgets) | `session.md` writer reads SHA at start via `git rev-parse HEAD` — automated. |
| Dev servers already running from separate terminal | Orchestrator detects (health endpoint responds before spawn) and aborts with clear message — do NOT reuse, because flag + token would be unset. |

## Documentation / Operational Notes

- `scripts/playtest/README.md` documents operator commands, config file
  shape, and troubleshooting.
- `CLAUDE.md` gets a new **Playtest Harness** section pointing to the PRD,
  roadmap, and the three scripts (run, selftest, smoke).

## Sources & References

- **Origin:** [docs/testing/PLAYTEST-HARNESS-PRD.md](../../testing/PLAYTEST-HARNESS-PRD.md)
- **Parent roadmap:** [docs/plans/playtest-harness/roadmap.md](./roadmap.md)
- **Phase 2 god-event contract:** [docs/plans/playtest-harness/phase-2-playtest-mode.md](./phase-2-playtest-mode.md)
- **Playwright fixture pattern:** `tests/e2e/fixtures.ts:16-26`
- **Join flow:** `tests/e2e/helpers.ts:35-38`
- **Multi-process spawn prior art:** `scripts/launch-dev-chrome.ts`
- **Memory feedback:** `feedback-wait-for-all-agents.md`,
  `feedback-verify-before-presenting.md`,
  `docs/insights/008-adversarial-swarm-review-maximum-overdrive.md`
