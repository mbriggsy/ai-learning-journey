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
  internal identifiers `SERVER`, `ACTOR`, `TARGET`, `OTHER_ALIVE`,
  `SPECTATOR`, `DISCONNECTED`, `BOARD`, each mapped via
  `ROW_DISPLAY_LABELS` to phase-1 D5's literal prose labels
  (`'SERVER'`, `'ACTOR'`, `'TARGET'`, `'OTHER (alive)'`,
  `'SPECTATOR (eliminated, connected)'`,
  `'DISCONNECTED (alive, not connected)'`, `'BOARD'`) ×
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
  god-message per viewer, all keyed by the same `stateVersion`, each
  carrying `expectedViewerIds: string[]` per phase-2 D4 "Split-envelope
  metadata fields." Orchestrator reassembles by `stateVersion` and
  uses `expectedViewerIds` as the authoritative completion signal
  (NOT chunk counting) before writing a single events.jsonl line.
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

### Trust Model (local-only harness, single-user)

- **Local-only operation, single trusted user.** The harness runs on the
  operator's machine (laptop / dev workstation). It assumes a trusted
  single-user environment. Specifically out of scope:
  - **Subprocess env inspection.** `PLAYTEST_TOKEN` is passed to wrangler
    via child env; on Linux any local user can read `/proc/<pid>/environ`;
    on Windows, Process Explorer exposes the same. Mitigation = trusting
    the single-user assumption. Future-work = transient-file + 0600 perms
    + unlink-post-read, not built in v1.
  - **Operator-side salt handling.** Scrub salt is minted per session and
    held in orchestrator memory. Operators who deliberately share the
    salt defeat cross-session non-reversibility — out of scope.
  - **Shared-disk access to session dirs.** Post-run `events.jsonl`
    retains `boardView`, `events[]`, and seat names verbatim (only
    `myHand` is scrubbed). Sharing a session directory outside the team
    leaks behavioral pattern data. `scripts/playtest/README.md` carries
    the operator warning; enforcement is operational, not technical.
  - **Concurrent users on the same machine.** v1 assumes one operator
    per machine; concurrent runs would need run-dir locking and are
    deferred.

### Deferred to Separate Tasks

- **Remote/cloud orchestrator.** v1 is local-only. A cloud-hosted harness is
  a future project. CI execution (nightly playtest) is also future work —
  rolling retention still applies, but operator-invoked purge has no human
  in that mode; any archive-retrieval need would need a CI gate.
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
  sharing the same `stateVersion`, each carrying `expectedViewerIds:
  string[]` per phase-2 D4 "Split-envelope metadata fields" — the
  authoritative full seated-player set the consumer compares
  `Object.keys(mergedProjections)` against for completion. Subscriber
  buffers them by `stateVersion` and flushes one merged line to
  `events.jsonl` when `Object.keys(mergedProjections)` matches
  `expectedViewerIds` as a set, OR when a short timeout elapses
  (partial-assembly is logged as a diagnostic, not silently dropped).
  Naive chunk-counting is explicitly banned — phase-2 Unit 6 Risks row
  documents why (mid-reassembly disconnects break the count invariant).
  **Close-code handling (from phase-2 Unit 4):** `4003` → abort the run
  with "god origin not allowlisted." `4004` → abort with "playtest mode
  off or token invalid — check server env." `4005` → back off 60s then
  retry at most once (the server counter resets on window roll); second
  4005 aborts. `4001` is **not** a god-auth code and is not retried on
  the god socket.
- **D5. Page navigations blocked from tool use by the seat agent
  (Phase 3 declares the allowlist contract; Phase 4 enforces it via
  the wrapper).** Phase 3's responsibility ends at: (a) handing the
  raw Playwright `Page` object out via `SeatHandle` (Unit 5 returns
  the unwrapped `page` because no Phase 3 unit needs to wrap it), AND
  (b) declaring the **allowlist contract** as two named typed constants
  exported from `scripts/playtest/lib/types.ts` (Unit 1):
  `ALLOWED_PAGE_METHODS` and `DISALLOWED_PAGE_METHODS` — both declared
  with `as const` on their tuple literals so the derived
  `AllowedPageMethod` / `DisallowedPageMethod` types are literal-string
  unions, not `string[]`. These constants are **canonical vocabulary
  only** — Phase 4's H-3b rigor pass established that the primary
  enforcement mechanism is the subagent frontmatter `tools:` whitelist
  in `.claude/agents/playtest-seat.md` (Phase 4 Unit 1b), NOT a
  TypeScript runtime wrapper (see insight 020). Claude Code enforces
  the tools whitelist at the MCP tool-surface boundary; a TypeScript
  wrapper cannot constrain a subagent driving Playwright via MCP
  because the MCP server runs in a separate process.
  Methods allowed on the Page (`ALLOWED_PAGE_METHODS`): `locator`,
  `waitFor`, `click`, `fill`, `type`, `press`, `getByRole`,
  `getByText`, `getByLabel`, `getByTestId`, `screenshot`. Methods
  forbidden (`DISALLOWED_PAGE_METHODS`): `goto`, `evaluate`,
  `addInitScript`, `route`, `setExtraHTTPHeaders`, `setOfflineMode`,
  `request`, `context`, any `network` accessor, `addLocatorHandler`,
  `setViewportSize`. The orchestrator performs the initial join flow
  itself before handing control to the agent (this is why `goto` is
  not on the allowlist). Phase 3's self-test check 5 asserts
  `ALLOWED_PAGE_METHODS` + `DISALLOWED_PAGE_METHODS` both exist as
  named exports, their intersection is empty, and
  `DISALLOWED_PAGE_METHODS` contains the eval / network / nav
  primitives. Phase 4's Unit 1b contract tests confirm that the
  subagent's frontmatter whitelist contains only tools consistent
  with `ALLOWED_PAGE_METHODS` (no `browser_evaluate`, `browser_navigate`,
  etc.). There is NO runtime TypeScript wrapper in v1 (Phase 4 D14
  removed it).
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
- **D9.1. Tri-state `FireRecord.matched` (phase-3 B4).** A FireRecord
  carries `matched: 'clean' | 'with-divergence' | 'no-fire'`:
  - `'clean'` — tier1 passed AND every present tier2/tier3 also passed.
  - `'with-divergence'` — tier1 passed (scenario triggered) AND at
    least one tier2/tier3 oracle failed. Counts toward `firedCount`
    AND emits structured notes to the divergence list output.
  - `'no-fire'` — tier1 did not match.
  Coverage rule: `firedCount` counts BOTH `'clean'` and
  `'with-divergence'` records. Rationale: tier-1 is the "did this
  scenario trigger?" signal; tier-2/3 oracles report bugs, not missed
  scenarios. The pre-B4 rule "all present tiers pass → fire" silently
  hid a fire whenever the oracle caught a divergence — exactly inverted
  signal (the catch became invisible). Divergence list is a separate
  section in `coverage.md` (phase-3 B4 / Unit 10) so triage agents see
  the bug AND the fire signal.
- **D10. Isolation self-test is a mandatory pre-flight.** `pnpm playtest:
  selftest` runs the checks. `pnpm playtest:run` refuses to start unless
  a recent self-test pass is recorded (within last 24h, recorded in a
  .last-selftest file). Stops the "forgot to run it" failure mode.
- **D11. Form-factor axis (phase-1 axis 15) is owned by the
  orchestrator, not the seat agents — and viewport cycling is scoped
  to the subset of scenarios that are viewport-sensitive.** The three
  mandatory viewports remain: **360×640** (iPhone SE / small Android),
  **390×844** (iPhone 13 / mid Android), **768×1024** (tablet / iPad
  mini). **Default viewport** for all other scenarios is **390×844**.
  **Cycling rule (phase-3 B3):** a scenario cycles all three viewports
  iff it is tagged with `min-viewport:` (the C-01/02/03/06/09/12/21
  cluster) **OR** carries a `ui-assertions:` block (seat-agent-eyeballed
  surfaces). All other scenarios run on the default viewport (390×844)
  only. Justification: the scenario-detector consumes `events.jsonl` +
  `connections.jsonl`; tier-1 (events) and tier-2 (projection-shape) are
  viewport-invariant — three identical re-runs at three viewports
  triple wallclock for zero detector-visible coverage gain. Only the
  tagged subset legitimately varies. The orchestrator sets the
  Playwright context's viewport per seat per scenario batch; scenarios
  tagged `min-viewport:` with a specific value are only fired at or
  above that viewport. Cycling policy: "same viewport for all seats in
  a scenario, rotate between scenarios" — mixed-viewport-within-a-
  scenario is a future opportunity, not v1.
- **D12. Free-play wallclock budget (phase-1 Unit 5 Part G).** Default
  20% of session wallclock is reserved for `SCN-FREE-PLAY-*` scenarios;
  remaining 80% drives scripted catalog scenarios. Orchestrator tracks
  elapsed wallclock in each bucket and signals the seat-agent launcher
  (Phase 4) when to hand a free-play directive vs a scripted one. Config
  field `freePlayWallclockFraction` with default `0.20`. Phase 6
  calibration may retune. **Total session wallclock is bounded by
  `sessionTimeoutMs`, a required per-config field (no harness-side
  default)** — callers set it (e.g. Phase 6 series scales `60min + 10min
  × (seats-3)`; Phase 4 unit tests use 3min). Free-play budget is a
  fraction of this caller-supplied total; the two fields travel together.
- **D13. Coverage render = 7×2 info-gap matrix over absolute ≥50
  threshold.** Coverage reporter generates `coverage.md` with a grid
  keyed on the phase-1 D5 info-gap rows. **Internal identifier** →
  **literal display label** (from phase-1 D5, character-for-character):
  `SERVER` → `'SERVER'`; `ACTOR` → `'ACTOR'`; `TARGET` → `'TARGET'`;
  `OTHER_ALIVE` → `'OTHER (alive)'`; `SPECTATOR` →
  `'SPECTATOR (eliminated, connected)'`; `DISCONNECTED` →
  `'DISCONNECTED (alive, not connected)'`; `BOARD` → `'BOARD'`.
  Identifier form is used inside types and code; display form is
  emitted into `coverage.md`. Columns: **Column 1 — Projection returns
  today**, **Column 2 — Viewer should see**. Each cell totals how many
  catalog scenarios whose fire signature touched that (vantage, column)
  pair actually fired this run / session series. Success criterion per
  PRD §8.2: **≥50 distinct catalog scenarios fired** (absolute count,
  not a fraction of catalog). **Secondary gate (D13.1 / phase-3 B5):**
  every row of the 7×2 grid must have ≥1 fire — i.e. zero zero-cells
  across the 14 cells. Pass = (`firedCount >= 50`) AND
  (`zeroCellCount === 0`). A zero cell after a session series is no
  longer "just a triage signal" — it fails the run. Triage work then
  drives scenario drafting for the next catalog pass.
- **D14. Per-session playtest token + scrub salt, minted together at
  run start (phase-2 Open Questions → Phase 3).** Orchestrator does NOT
  rely on the server's single global `PLAYTEST_TOKEN` Worker secret.
  Instead, at run start, the orchestrator mints BOTH a session-scoped
  token AND a session-scoped scrub salt (see D15). Both use
  `crypto.randomBytes(32).toString('hex')` (**64 hex chars each**,
  independent values). The token is seeded into the server-controller's
  env (`PLAYTEST_TOKEN=<minted>`) before spawning wrangler dev, and is
  used on the god WS connection. The salt is held in orchestrator memory
  and passed to Unit 4b's `scrub(event, mode, salt)` on every write.
  Scope: one token + one salt per session; both invalidated on session
  end. Neither is ever logged or persisted. This is the Phase 3 answer
  to "a leaked global token unlocks every concurrent playtest room" —
  since each session mints its own, a leak is bounded to one run.
  Time-boxed rotation within a run is deferred (single-session lifetime
  is already a strict upper bound). Salt is independent of token so a
  token-leak does not compromise hash non-reversibility across sessions.
- **D15. `events.jsonl` retention + scrub policy (phase-2
  System-Wide Impact).** God-event `projections` carry full `PlayerView`
  including `myHand` contents. Once written to disk, transient in-memory
  PII becomes durable. Phase 3 ships:
  - **Scrub threat model.** The scrubber defends against (i) a session
    directory shared outside the team, and (ii) post-incident log review
    by someone who shouldn't see raw hands. It does NOT defend against a
    live-session adversary, nor against an operator who shares the salt
    value. Within-session correlation is **intentional and required for
    triage**: a triager reading `events.jsonl` must be able to follow
    "card X" from stealer's hand to target's discard by matching stable
    hashes across events in the same session. Per-session salt rotation
    guarantees hashes are non-reversible across sessions; within a
    session, stable hashes are a feature, not a flaw.
  - **Scrub rules (default ON).** `--no-scrub` is the explicit opt-out.
    When scrub is on: hash `myHand[*].id` with `sha256(salt + id).slice(0,
    12)` using the per-session salt minted in D14, and strip
    `myHand[*].type` → `'<redacted>'` before persisting. The `events:`
    array's private-event fields (`combo-steal.cardType`,
    `card-drawn.cardType`) are already server-stripped for non-party
    viewers; those stay verbatim. Scrub applies to the `projections`
    map only. `boardView` is public (already server-stripped via
    `stripPrivateEventFields` null-viewer path) and is not re-scrubbed.
    When scrub is **off** (operator passed `--no-scrub`): orchestrator
    prints a loud startup banner — `⚠️  SCRUBBER DISABLED — events.jsonl
    will contain raw player hands. Do not share this session dir.` — and
    writes lines as-received.
  - **Retention window.** Session directories under
    `docs/testing/playtest/runs/` are treated as ephemeral diagnostics.
    Rolling retention: keep the most recent 10 session dirs by default
    (config: `sessionDirRetention: number`). Older runs are **deleted**
    (directory recursive remove). No archive/tarball mode in v1 —
    archives accumulate without auto-delete, so the complexity doesn't
    pay for itself yet. If a concrete archive-retrieval need appears
    later, add an `--archive` flag then.
  - **Purge command.** `pnpm playtest:purge [--before YYYY-MM-DD]`
    deletes events.jsonl (and optionally the full session directory) for
    all matching runs. No implicit scheduled purge — operator-invoked
    only. **CI gap:** when the harness runs in CI (future), there is no
    operator; rolling retention still applies, but any archive-by-filter
    need is future work. Flagged in Scope Boundaries.
  - **gitignore.** `docs/testing/playtest/runs/**` is added to
    `.gitignore` at Unit 1. Session artifacts must not reach the repo.
  - **Residual-risk warning.** Even post-scrub, `events.jsonl` preserves
    `boardView`, `events[]`, and seat names verbatim — enough to
    reconstruct behavioral patterns (who-did-what-to-whom, steal graphs,
    decision timing). Treat session dirs as internal diagnostic
    artifacts; do not share outside the team without first running
    `pnpm playtest:purge --full-dir <run-id>`. `scripts/playtest/README.md`
    (Unit 1) repeats this warning for operators.

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
        retention.ts              ← session-dir rotation (delete past window)
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
  4. Mint per-session token (token-minter.ts): 64 hex chars from
     `crypto.randomBytes(32).toString('hex')`.
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
       e. Return SeatHandle { seatId, seatName, roomCode, page, viewport,
          logPath, suspicionPath, scenariosPath }. `roomCode` is threaded
          through from step (c) so Phase 4 can emit `{{ROOM_CODE}}`.
  9. Hand N SeatHandles + the free-play wallclock controller to Phase 4's
     seat-agent launcher. (Phase 4 owns the subagent spawn; Phase 3
     exposes the handle + wallclock signal.)
 10. Wait for all seat agents to finish (parallel launch, sequential
     synth). Track per-seat disconnect/reconnect transitions → append to
     connections.jsonl with `reason: 'natural'` by default.
 11. **Viewport cycling is scenario-scoped (D11 / phase-3 B3).** Only
     scenarios tagged `min-viewport:` OR carrying `ui-assertions:`
     trigger the rotate-tear-down-rebuild loop across all three
     mandatory viewports (360×640, 390×844, 768×1024). All other
     scenarios run on the default viewport (390×844) without rotation.
     When rotation is required: (a) before tearing down each seat's
     Playwright context, call
     `connectionLog.tag(seatId, 'disconnect', 'orchestrator-driven')`
     so the disconnect/reconnect pair lands in `connections.jsonl`
     with `reason: 'orchestrator-driven'` (tier-3 matcher filters
     these out per C8); (b) tear down contexts, update the active
     viewport, repeat steps 8-10 for the next viewport batch;
     (c) after rebuild, the natural `'reconnect'` transition is
     observed by the god-subscriber but the orchestrator pre-tagged
     it so it also lands with `reason: 'orchestrator-driven'`.
     (Servers + god WS stay up across viewport rotations to preserve
     one events.jsonl per session.)
 12. Stop servers, close contexts, close god WS.
 13. Run scenario-detector (three-tier, consuming events.jsonl +
     connections.jsonl) + coverage-reporter → coverage.md (7×2 grid,
     ≥50 threshold).
 14. Finalize session.md with end block (free-play-vs-scripted split,
     viewports exercised, coverage summary).
 15. Apply retention policy (retention.ts) — recursively delete session
     dirs older than `sessionDirRetention` (default: keep 10 most-recent).
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
7. **`window.__gameStore` dev-hook not agent-reachable (phase-4 C6):**
   The dev-launcher bundle exposes `window.__gameStore` (guarded by
   `import.meta.env.DEV`, tree-shaken in prod per CLAUDE.md). The seat
   agent MUST NOT reach this god-mode handle. This check is an
   **orchestrator-level** `page.evaluate(() => typeof
   (window as any).__gameStore)` (the orchestrator has no allowlist
   restriction — only the seat agent does) against the bundle the
   harness is about to connect to; if the global is present AND the
   harness is NOT running behind an explicit `PLAYTEST_EXPOSE_GAMESTORE=1`
   flag, the self-test fails loudly. Rationale: `__gameStore` bypasses
   projection entirely and would let any agent with `browser_evaluate`
   access the full engine state. The subagent's `tools:` whitelist
   (phase-4 C1) already excludes `browser_evaluate`, so this is a
   belt-and-suspenders check — but a bundle drift that re-exposes the
   hook in a non-DEV build would be a silent isolation break, so it is
   caught here.

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

- **Rows (7), identifier → displayLabel (phase-1 D5 literal):**
  `SERVER` → `'SERVER'`; `ACTOR` → `'ACTOR'`; `TARGET` → `'TARGET'`;
  `OTHER_ALIVE` → `'OTHER (alive)'`; `SPECTATOR` →
  `'SPECTATOR (eliminated, connected)'`; `DISCONNECTED` →
  `'DISCONNECTED (alive, not connected)'`; `BOARD` → `'BOARD'`.
  Internal identifiers appear in TypeScript types; display labels
  appear in the rendered `coverage.md`. `ROW_DISPLAY_LABELS` constant
  defined in Unit 1 is the single source of truth.
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

**Requirements:** R1, R4, R8 (defines `CoverageReport.threshold = 50` +
`zeroCellCount` + `passed` derivation that bake in the absolute ≥50
gate + secondary no-zero-cell gate per D13.1 / B5), R9, R10, R11, R13,
R14

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
  phase-2-playtest-mode.md` D4 and the HTD):
  ```ts
  interface GodEvent {
    type: 'god-event'
    action: EngineAction
    events: readonly GameEvent[]
    stateVersion: number
    nowMs: number
    projections: Record<string, PlayerView>   // keyed by playerId
    boardView: BoardView
    expectedViewerIds?: readonly string[]     // OPTIONAL — present only
                                              // on per-viewer split chunks
                                              // (phase-2 D4 "Split-envelope
                                              // metadata fields"). Required
                                              // by Unit 4 reassembly when
                                              // splitting fires; absent /
                                              // empty / redundantly equal
                                              // to Object.keys(projections)
                                              // means "unsplit, consume in
                                              // one shot."
  }
  ```
  `PlayerView` and `BoardView` are re-declared locally in this module
  (not imported from `src/shared/protocol.ts`) per D11 of the existing
  plan — the harness imports NOTHING from `src/server`, and
  `scripts/playtest/lib/types.ts` mirrors `shared/protocol.ts`'s public
  surface to avoid Workers-types pollution.
- `SeatHandle` is the handoff type Phase 4 consumes:
  `{ seatId, seatName, roomCode, page, viewport, logPath, suspicionPath,
  scenariosPath }`. The `roomCode: string` field mirrors the room the seat
  joined (Unit 5 passes it through from `createSeat`'s `roomCode` arg) so
  Phase 4's prompt renderer has a source for the `{{ROOM_CODE}}`
  placeholder without the agent needing `Read` on `config` or `session.md`.
- `Viewport = { width: 360|390|768, height: 640|844|1024, label: string }`.
- `ConnectionEvent = { seatId, transition: 'disconnect' | 'reconnect',
  atStateVersion: number, atNowMs: number, reason:
  'natural' | 'orchestrator-driven' }`. The `reason` field lets the
  Unit 9 tier-3 matcher filter out harness-internal reconnects
  (viewport rotation, seat teardown/rebuild between scenarios) so
  scenarios targeting REAL connectivity events aren't drowned by
  `orchestrator-driven` noise. Unit 4 writes `'natural'` by default;
  Unit 6 (orchestrator) explicitly writes `'orchestrator-driven'`
  when it teardown/rebuilds a seat between viewport rotations or
  between scripted + free-play segments.
- `FreePlayBudget = { totalMs: number, freePlayMs: number,
  scriptedMs: number, fraction: number }`.
- `Config` shape:
  ```ts
  interface Config {
    seats: number
    seatNames?: string[]
    seed?: number
    nopeWindowMs: number
    sessionTimeoutMs: number               // required per-config; no harness-side default.
                                           // Caller sets (e.g. Phase 6 series scales 60min + 10min/seat beyond 3;
                                           // Phase 4 unit tests use 3min). Orchestrator hard-stops the session when
                                           // wallclock since seat-join exceeds this.
    roomCode?: string
    catalogPath: string
    outputRoot: string
    viewports: Viewport[]                  // default: 360×640, 390×844, 768×1024
    freePlayWallclockFraction: number      // default: 0.20
    sessionDirRetention: number            // default: 10
    scrubMode: 'on' | 'off'                // default: 'on'; `--no-scrub` flips to 'off' with loud banner (D15)
    godReassemblyTimeoutMs: number         // default: 5000; god-event split reassembly partial-flush window
    godOriginAllowlist?: string[]          // passes through to
                                            // PLAYTEST_GOD_ORIGINS in server env
  }
  ```
- `ViewerRole` union (internal identifier, code-type-safe):
  ```ts
  type ViewerRole =
    | 'SERVER'
    | 'ACTOR'
    | 'TARGET'
    | 'OTHER_ALIVE'
    | 'SPECTATOR'
    | 'DISCONNECTED'
    | 'BOARD'
  ```
- `ROW_DISPLAY_LABELS` constant — single source of truth mapping
  internal identifiers to phase-1 D5's literal prose labels
  (character-for-character):
  ```ts
  const ROW_DISPLAY_LABELS: Record<ViewerRole, string> = {
    SERVER:       'SERVER',
    ACTOR:        'ACTOR',
    TARGET:       'TARGET',
    OTHER_ALIVE:  'OTHER (alive)',
    SPECTATOR:    'SPECTATOR (eliminated, connected)',
    DISCONNECTED: 'DISCONNECTED (alive, not connected)',
    BOARD:        'BOARD',
  }
  ```
  Unit 10's regression test asserts every entry equals phase-1 D5's
  literal prose to catch drift in either direction.
- `CoverageReport` shape surfaces the 7×2 grid + absolute count +
  secondary no-zero-cell gate (phase-3 B5 / D13.1):
  ```ts
  interface CoverageReport {
    firedCount: number                    // absolute, PRD §8.2 threshold = 50
    threshold: 50
    gridCells: Record<
      ViewerRole,
      { column1: number; column2: number; scenarioIds: string[] }
    >
    zeroCellCount: number                 // count of 14 cells with 0 fires
    passed: boolean                       // firedCount >= 50 AND zeroCellCount === 0
    firedByViewport: Record<string, string[]>
    freePlayAccounting: FreePlayBudget
    divergences: Array<{ kind: 'self-without-detector' | 'detector-without-self'
                       | 'column-1-vs-2' ; scenarioId: string; notes: string }>
    knownProductCalls: string[]
  }
  ```
- **Allowlist constants (D5 / phase-4 wrapper contract):** named exports,
  `as const`, so Phase 4's `SeatPageWrapper` derives a literal union for
  compile-time narrowing:
  ```ts
  export const ALLOWED_PAGE_METHODS = [
    'locator', 'waitFor', 'click', 'fill', 'type', 'press',
    'getByRole', 'getByText', 'getByLabel', 'getByTestId', 'screenshot',
  ] as const
  export type AllowedPageMethod = typeof ALLOWED_PAGE_METHODS[number]

  export const DISALLOWED_PAGE_METHODS = [
    'goto', 'evaluate', 'addInitScript', 'route',
    'setExtraHTTPHeaders', 'setOfflineMode', 'request', 'context',
    'addLocatorHandler', 'setViewportSize',
  ] as const
  export type DisallowedPageMethod = typeof DISALLOWED_PAGE_METHODS[number]
  ```
  Unit 7 self-test check 5 asserts both arrays exist, their
  intersection is empty, and `DISALLOWED_PAGE_METHODS` includes the
  eval / network / nav primitives.

- **`scripts/playtest/README.md` content.** Operator-facing warning
  document. Sections:
  1. **Purpose.** What the harness does + who runs it.
  2. **Trust model.** Local-only, single-user operation; see phase-3
     Scope Boundaries Trust Model for the full list.
  3. **Session dirs are diagnostic artifacts.** "`docs/testing/playtest/
     runs/<session>/events.jsonl` and `connections.jsonl` contain
     behavioral data — `boardView` snapshots, event timelines, seat
     names, steal graphs. The scrubber prevents cross-session card-ID
     correlation but does NOT prevent behavioral-pattern inference. DO
     NOT share session dirs outside the team. Before sharing any run
     externally, run `pnpm playtest:purge --full-dir <run-id>`."
  4. **`--no-scrub` is dangerous.** "`--no-scrub` writes raw `myHand`
     contents into `events.jsonl`. The orchestrator banners loudly when
     enabled. Use only for scrubber-debugging; purge immediately after."
  5. **Retention is automatic.** Rolling `sessionDirRetention: 10`
     dirs; older runs are **deleted**, not archived (v1 intentional).
     Manual `pnpm playtest:purge [--before YYYY-MM-DD | --session-id X]`
     available for explicit purges.
  6. **CI gap.** v1 assumes a human operator. CI execution (future) has
     no operator; rolling retention still applies but manual purge does
     not.

**Patterns to follow:**
- `scripts/launch-dev-chrome.ts` argv parsing style.
- Existing `src/shared/types.ts` naming conventions.

**Test scenarios:**
- Happy path: `tsc --noEmit` succeeds on the new files.
- Happy path: `pnpm playtest:run --help` prints usage (throws 'not
  implemented' on actual run is acceptable at this unit).
- Happy path: `.gitignore` excludes `docs/testing/playtest/runs/**`.
- README content: `scripts/playtest/README.md` exists and contains
  the six operator-warning sections above (doc-test: grep for each
  section heading).

**Verification:**
- Typecheck clean.
- New pnpm scripts resolve.
- `GodEvent` field names match phase-2 D4 character-for-character
  (`type`, `action`, `events`, `stateVersion`, `nowMs`, `projections`,
  `boardView`, optional `expectedViewerIds`).

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
- Healthcheck: poll `http://localhost:8787/health` (the dedicated readiness
  route shipped by phase-2 Unit 1b) until `200` with body
  `{ ok: true, playtest: true, version: <string> }`. Asserting
  `playtest === true` confirms wrangler picked up the env vars (catches
  the "I forgot to set PLAYTEST_MODE" failure mode at boot rather than
  later when the god WS rejects with `4004`). Polling the bare `/` is
  unreliable — partyserver routing defaults aren't a stable readiness
  contract. Also poll `http://localhost:5173/player.html` for vite, with
  a short timeout + retry.
- `stopServers(handles)` SIGTERMs both; SIGKILL if not down after 5s.
- Orchestrator owns the token lifecycle (mint → pass to server via env →
  pass to god-subscriber for the WS connect); server-controller is a
  conduit, not a source.
- **Log-hygiene pre-flight (C6 — token URL leak protection).** Before
  spawning subprocesses, server-controller asserts the following bans
  and aborts with an actionable error if any are set:
  1. `PLAYWRIGHT_TRACE` / any mechanism that would call
     `context.tracing.start()` — a Playwright trace captures the full
     god WS URL including `token=<T>` query-string.
  2. Wrangler `--log-level=debug` / `DEBUG=*` in spawn env — wrangler
     verbose output echoes full inbound URLs.
  3. `NODE_DEBUG` / `NODE_OPTIONS` contains `--inspect` — source-level
     debugger on the orchestrator exposes minted secrets in live memory.
  An operator who genuinely needs one of these for a one-off debug
  session must pass `--allow-trace` (explicit opt-in with a startup
  banner: `⚠️  TRACE MODE — god WS URL with token will appear in trace
  output. Do not share the trace file.`). Default: refuse to launch.

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
- Error path: token fails `token.length !== 64 || !/^[0-9a-f]{64}$/.test(token)`
  → throw with actionable message (defense-in-depth; Unit 3b should have
  already enforced this — both length and character-class check).
- Error path: servers fail healthcheck → rejects with the stderr captured.
- Health-endpoint ready detection (phase-2 Unit 1b): poller hits
  `http://localhost:8787/health` and treats `200 + { ok: true,
  playtest: true }` as the ready signal. If `playtest === false` (env
  not picked up), reject with an actionable message identifying the
  missing env var rather than waiting for the god WS to fail. If the
  poll returns 404 / non-200 for the entire timeout window, reject
  with "wrangler not ready or `/health` missing — confirm phase-2
  Unit 1b shipped." Stub fetch in unit tests; live behavior covered
  by Unit 8 smoke.
- Integration: start → healthcheck → stop cycle exits cleanly (covered in
  Unit 8 smoke).

**Verification:**
- Unit tests pass; smoke proves live behavior.
- Token flows from orchestrator → env → server → god WS in one direction.

- [ ] **Unit 3b: `session-secrets.ts` — per-session token + scrub salt minting**

**Goal:** Mint a fresh, session-scoped `PLAYTEST_TOKEN` AND a
session-scoped `scrubSalt` (D14) so a token leak is bounded to one run
AND hash non-reversibility holds across sessions. Replaces reliance on
the server's single global Worker-secret token (phase-2 flagged to
Phase 3 in Open Questions) and supplies the salt input to Unit 4b's
`scrub(event, mode, salt)`.

**Execution note:** Test-first. Both primitives are small and
security-relevant.

**Requirements:** R13 (scrub salt) + R14 (per-session token)

**Dependencies:** Unit 1.

**Files:**
- Create: `scripts/playtest/lib/session-secrets.ts`.
- Create: `scripts/playtest/lib/session-secrets.test.ts`.

**Approach:**
- `mintPlaytestToken(): string` returns
  `crypto.randomBytes(32).toString('hex')` (64 hex chars).
- `mintScrubSalt(): string` returns an INDEPENDENT
  `crypto.randomBytes(32).toString('hex')` (64 hex chars). Separate
  invocation so a token leak does not compromise salt secrecy.
- Both are pure aside from crypto; expose a
  `withRandomSource(source: () => Buffer)` override for tests.
- Minted values NEVER logged. Orchestrator treats the token as
  write-to-env-then-forget; salt stays in orchestrator memory only and
  is passed to every `scrub()` call.
- Single-session lifetime is the strict upper bound on validity for
  both. No rotation logic needed within a run (time-boxed rotation
  deferred until a concrete threat justifies it).

**Patterns to follow:**
- `src/server/validation.ts` constant-time compare convention.

**Test scenarios:**
- Happy path: 1000 calls to each of `mintPlaytestToken` and
  `mintScrubSalt` produce pairwise-distinct outputs.
- Happy path: both functions return 64 hex chars, match `/^[0-9a-f]{64}$/`.
- Independence: a single session mints one token and one salt;
  `token !== salt` for 1000 sessions (they draw from distinct
  `randomBytes` calls).
- Edge case: override random source → deterministic output for tests
  only, documented "never use in production."
- **Security: tree-shake sentinel grep (phase-3 B7).** Values are
  minted at RUNTIME — they never exist at build time, so grepping
  `dist/**/*.js` for a token or salt would always pass trivially.
  Instead, reuse phase-2 Unit 7 sentinel discipline: build the
  production bundle, then grep `dist/**/*.js` for static string
  literals that would only be present if `session-secrets.ts` got
  bundled. Required zero-match list (each is a string the production
  bundle must not contain): `'mintPlaytestToken'`, `'mintScrubSalt'`
  (function names); the literal module path fragment
  `'playtest/lib/session-secrets'`; any other string uniquely owned by
  `session-secrets.ts` (e.g., a sentinel comment string added at the
  top of the file specifically for this test). Zero matches across
  the whole list = playtest code is tree-shaken from prod. Mirrors
  phase-2 Unit 7 strategy character-for-character.

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
- `connectGod(url, token, seed, nopeWindowMs, scrubMode, scrubSalt, godReassemblyTimeoutMs?): GodHandle`
  opens the WS with `role=god&token=<token>`, sends
  `playtest-config { seed, nopeWindowMs }`, begins consuming inbound
  god-events. `scrubSalt` is the per-session salt minted by Unit 3b and
  passed to every `scrub(event, scrubMode, scrubSalt)` call below.
  `godReassemblyTimeoutMs` defaults to 5000 (see reassembly timeout
  below).
- **WS client library:** use the `ws` package directly (Node-native).
  BURNED app code uses `partysocket` in the browser; the orchestrator
  is Node-only and does NOT need partysocket's reconnection layer (god
  WS is a single connection with explicit fatal/retry semantics owned
  by Unit 6).
- **Log hygiene (C6):** never emit the full `role=god&token=<T>` URL
  to any log sink. Unit 3 additionally bans Playwright `tracing.start()`
  and wrangler `--log-level=debug` to prevent transport-layer URL
  capture. If log redaction is required for debugging, log the URL with
  `token=<REDACTED>` substitution.
- **Inbound envelope (phase-2 D4, mirrored in Unit 1 `GodEvent`):**
  `{ type: 'god-event', action, events, stateVersion, nowMs, projections,
  boardView }`. Canonical — no synthesis.
- **Per-viewer split reassembly (phase-2 Unit 6 Risks / Unit 8 —
  REQUIRED handling, not optional):** when the server's
  `projections` map would push the serialized envelope past the ~512 KiB
  soft budget (phase-2 Unit 8), the server emits MULTIPLE god-messages
  sharing the same `stateVersion`, each carrying a partial
  `projections` map (one viewer, or a small subset). Per phase-2 D4
  "Split-envelope metadata fields", every split chunk also carries
  `expectedViewerIds: string[]` — the canonical full seated-player set
  the server expects to ship projections for under that `stateVersion`.
  All chunks for a `stateVersion` carry the SAME `expectedViewerIds`
  array (redundantly authoritative). Subscriber:
  1. Maintains a `Map<stateVersion, PartialAssembly>` reassembly buffer.
     Entry shape: `{ action, events, nowMs, boardView, projections:
     Record<playerId, PlayerView>, expected: Set<playerId>, receivedAt:
     number }`.
  2. On first message for a given `stateVersion`: record `expected =
     new Set(message.expectedViewerIds)` directly from the envelope's
     metadata field (phase-2 D4). Do NOT re-derive from the connected-
     player list, do NOT count chunks. Naive counting is unsafe — if a
     seat disconnects mid-reassembly the server may emit fewer chunks
     than the original expected set, and a counting consumer would
     either hang or silently flush an incomplete merge. On subsequent
     messages for the same `stateVersion`, assert
     `message.expectedViewerIds` is byte-identical to the recorded set
     and fail-closed on mismatch (indicates a server bug — phase-2
     contract guarantees the array is constant across chunks of one
     `stateVersion`).
  3. On subsequent messages: merge `projections` entries; the shared
     fields (`action`, `events`, `nowMs`, `boardView`,
     `expectedViewerIds`) MUST be byte-identical across splits — assert
     and fail-closed on mismatch (indicates a server bug).
  4. When `new Set(Object.keys(projections))` equals `expected` as a
     set (size match + every key present): emit the merged event
     downstream (scrubber → jsonl append) and drop the buffer entry.
     Set-equality (not just size match) closes the "right count, wrong
     keys" misroute case.
  5. **Reassembly timeout (tunable):** if a `stateVersion` entry is
     still partial after `godReassemblyTimeoutMs` since `receivedAt`
     (default **5000 ms**, configurable), emit a diagnostic warning,
     flush the partial to jsonl with a `partial: true` marker (never
     silently drop), then drop the buffer entry. Timeout is a diagnostic,
     not a fatal. **Hibernation caveat:** Cloudflare Durable Object
     hibernation can pause server-side execution for tens of seconds
     during GC or isolate eviction. A 5s default is generous for normal
     network jitter but may false-positive when a DO wake straddles a
     split — Phase 6 calibration retunes based on observed inter-message
     latency at real-session scale.
  - Unsplit events (small payloads) arrive as a single message with
    `projections` already complete and `expectedViewerIds` either
    omitted, empty, or redundantly equal to `Object.keys(projections)`.
    Treat any of those three shapes as "no splitting expected, consume
    in one shot" — the buffer entry resolves immediately on the first
    message.
- **Scrub + append pipeline:** every reassembled event runs through
  `scrub(event, scrubMode, salt)` (Unit 4b) before persistence.
  Scrubber throws → god-subscriber fails-closed: log + abort the run.
  **Never** fall back to writing the raw unscrubbed event.
- In-memory append queue + 100ms flush interval. Final flush + `fsync`
  (via `fs.fdatasync`) on `close` for crash-consistency guarantee. The
  in-process queue is unbounded in v1 — Phase 6 calibration measures
  write throughput under nope-chain storms (3-5 dispatches/sec × 3
  viewports) and adds backpressure bounds only if observed queue depth
  grows unbounded. See Risks table.
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
- `ws` package for Node-side WS client (NOT `partysocket` —
  `partysocket` is browser-primary with reconnection semantics we don't
  need; the god WS has explicit close-code contracts owned by Unit 6).
- `node:fs` streaming write.
- Reassembly buffer: plain `Map`, explicit timeout via `setTimeout`
  scoped to each entry.

**Test scenarios:**
- Happy path (unsplit): 100 god-events, each with complete `projections`
  → buffer resolves immediately; file has 100 lines, each round-trips
  via `JSON.parse` and passes scrubber contract.
- Happy path (split): 3-way split for N=10 players → 3 messages arrive
  with same `stateVersion`, each carrying partial `projections` and the
  same `expectedViewerIds: string[]` (10 ids); buffer merges; one
  merged line written to jsonl when `Object.keys(mergedProjections)`
  set-equals `expectedViewerIds`; reassembly asserts
  `action`/`events`/`boardView`/`expectedViewerIds` equal across splits.
- Split byte-identity check: adversarial split where `action` differs
  between chunks → subscriber fails-closed with diagnostic (server bug
  detection).
- Split metadata-identity check: adversarial split where
  `expectedViewerIds` differs between chunks for the same `stateVersion`
  → subscriber fails-closed with diagnostic (phase-2 D4 contract
  violation).
- Set-equality completion: chunks deliver projections for the right
  COUNT of viewers but a wrong KEY (e.g. expected `[a,b,c]`, received
  `[a,b,d]`) → buffer does NOT flush on count match alone; either
  remains partial until timeout or fails-closed when a chunk's
  `Object.keys(projections)` contains an id not in `expectedViewerIds`
  (server bug — phase-2 contract).
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

**Threat model (D15):** scrubber defends against (i) a session
directory shared outside the team, and (ii) post-incident log review.
Within-session correlation of hashed IDs is **intentional** — triage
needs to follow "card X" across events within a run. Per-session salt
(D14) guarantees cross-session non-reversibility. Scrubber does NOT
defend against a live-session adversary nor operator-salt-sharing.

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
- Mode `'off'` returns the event unmodified. Only reached when the
  operator passes `--no-scrub` at orchestrator launch (D15). The
  orchestrator prints a loud startup banner before any god-event is
  written:
  `⚠️  SCRUBBER DISABLED — events.jsonl will contain raw player hands.
  Do not share this session dir.`
- No `'auto'` mode. Default is `'on'`; `'off'` requires explicit
  operator opt-in. `NODE_ENV`-sensing was removed in H-2b to close the
  "operator forgets to set NODE_ENV=production → silent raw write"
  failure mode.
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
  `scenariosPath = docs/testing/playtest/SCENARIOS.md`, and
  `roomCode` (the value passed in by the orchestrator).

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

**Requirements:** R1, R4, R13 (scrub salt — D14/D15), R14 (per-session token — D14)

**Dependencies:** Units 2, 3, 3b, 4, 4b, 5.

**Files:**
- Modify: `scripts/playtest/lib/orchestrator.ts`.
- Modify: `scripts/playtest/run-session.ts` — call `runSession` from argv.
- Create: `scripts/playtest/lib/orchestrator.test.ts` (at least happy-path
  sequencing with mocked dependencies).

**Approach:**
- `runSession(config)`:
  1. Enforce `.last-selftest` freshness → bail if stale.
  2. `createRunDirectory` + `writeSessionStart`.
  3. **Mint per-session token AND scrub salt first (Unit 3b):**
     `token = mintPlaytestToken()` and `scrubSalt = mintScrubSalt()` —
     both 64-hex-char strings from independent
     `crypto.randomBytes(32).toString('hex')` calls. Both session-scoped
     per D14 (never reuses any global `PLAYTEST_TOKEN` Worker secret;
     salt is orchestrator-memory-only, never logged, never persisted).
     Token-leak scope is bounded to this one run; salt-leak would only
     compromise within-session hash correlation, which is already
     intentional for triage (D15 threat model).
  4. `startServers(token, ...)` (Unit 3) — spawns wrangler dev with
     `PLAYTEST_MODE=1` + `PLAYTEST_TOKEN=<minted>` in the child env, and
     vite dev. Wait for both healthchecks. Salt is NOT passed to
     child env (server-side code never needs it).
  5. `connectGod(url, token, seed, nopeWindowMs, scrubMode, scrubSalt)`
     (Unit 4) — opens the god WS with `role=god&token=<minted>` using
     the SAME minted token, and plumbs `scrubMode` + `scrubSalt` into
     the god-subscriber so every god-event passes through
     `scrub(event, scrubMode, scrubSalt)` (Unit 4b) before
     `events.jsonl` append. `scrubMode` defaults to `'on'` (D15); an
     explicit `--no-scrub` on orchestrator launch flips it to `'off'`
     with a loud startup banner. Close codes 4003/4004/4005 map to
     distinct handlers per D4 (abort / abort / retry-once-then-abort);
     `PLAYTEST_CONFIG_LOCKED` on the config send aborts cleanly (phase-2
     Unit 5).
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

**Goal:** Executable self-test that verifies all **eight** isolation
and privacy checks from High-Level Technical Design. Writes
`.last-selftest` on pass.

**Execution note:** Integration-first; this phase IS the proof mechanism.

**Requirements:** R5, R13 (scrubber + retention — D15)

**Dependencies:** Units 2-6, Unit 4b (scrubber), Unit 10b (retention).

**Files:**
- Modify: `scripts/playtest/selftest.ts`.
- Create: `scripts/playtest/selftest.test.ts` (pure test of the check
  functions where possible).

**Approach:**
- Boot a minimal session (2 seats, short duration).
- Run the eight checks. Report per-check pass/fail.
- On all-pass: write `.last-selftest` with timestamp.
- On any fail: print diagnostic table, exit non-zero, do not write
  stamp.

**The eight checks:**
1. **Isolation — context separation** (existing, from HTD).
2. **Isolation — cookie scope** (existing, from HTD).
3. **Isolation — storage scope** (existing, from HTD).
4. **God delivery — god connection receives events no player-role
   connection receives** (existing).
5. **Agent allowlist definition present** (existing; wrapper
   enforcement is Phase 4's job per D5).
6. **God close codes 4003/4004/4005 surface distinctly** (existing).
7. **Scrubber invoked on every write (new — C7).** Run a minimal
   session; intercept the jsonl write path; for every god-event that
   reaches the append-queue, assert `scrub()` was called with
   non-empty salt AND the outbound line's `projections[*].myHand[*].id`
   matches `/^[0-9a-f]{12}$/` (scrubbed hash shape) AND `type` equals
   the literal `'<redacted>'`. Adversarial fixture: inject one
   malformed projection that makes `scrub()` throw → assert the run
   aborts fail-closed (no raw event reaches jsonl). Required for Check 7
   to pass.
8. **Retention evicts a synthetic dated dir (new — C7).** Create a
   fake session directory dated `(now - sessionDirRetention - 1)`
   sessions ago; run `applyRetention`; assert the fake dir is
   deleted from disk. Then create a dir at exactly the boundary
   (`now - sessionDirRetention`) and assert it is kept. Proves the
   cutoff logic, not just that the function runs.

Both Check 7 and Check 8 are **mandatory gates** — the self-test cannot
write `.last-selftest` without them passing.

**Patterns to follow:**
- Playwright's own assertion style for the WS-frame / cookie checks.
- Node `fs/promises` + `Date` for the synthetic retention fixture.

**Test scenarios:**
- Happy path: all eight checks pass → exit 0, stamp written.
- Error path: simulate one failing check (e.g., deliberately leak a cookie
  via a test-only context flag) → exit non-zero, stamp NOT written.
- Error path (Check 7 adversarial): inject malformed projection →
  scrubber throws → run aborts without raw jsonl write → Check 7
  passes by observing the abort, not by observing a scrubbed write.
- Error path (Check 8 boundary): retention boundary off-by-one
  (cutoff includes the boundary dir) → fails with diagnostic; proves
  we test the boundary, not just "some deletion happened."
- Edge case: self-test boots servers itself (does not require `runSession`
  to be working end-to-end).
- Integration: runs against real Phase 2 server code.

**Verification:**
- `pnpm playtest:selftest` green; `.last-selftest` stamp written.
- A malformed-projection fixture run confirms fail-closed scrubber
  behavior in CI.

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
- **Catalog format (phase-3 B10 reconciled with phase-1 D1 + D3).**
  Each scenario is a Markdown H3 (`### SCN-<ID>`) section. The
  per-scenario record has two parts:
  1. **Front-matter-style table** (phase-1 D1, line 162-163) for the
     mandatory fields: ID, title, category, axes, player counts, game
     moment, min-viewport, trigger conditions, why-it-matters,
     agent-recognition criteria, suspicion prompts, vibe-check.
     Rendered as a markdown table immediately after the header.
  2. **Fenced code blocks** for the three-tier fire-signature fields
     (phase-1 D3, line 176-210): `events:`, `shape:`,
     `projection-assertions:`, `ui-assertions:`, `connection-events:`,
     `inference:`, `known-product-call:`. The code blocks use
     phase-1 D3's bespoke DSL — NOT strict YAML — including `$ACTOR`
     / `$TARGET` role bindings, `$PRESENT` / `$ABSENT` sentinels, and
     literal-match shorthands (`cardType: 'call-in-a-favor'`).
- **Parser strategy.** Walk the Markdown AST keyed on `### SCN-`
  headers, extract the front-matter table rows for mandatory fields,
  then parse each fire-signature fenced code block with the bespoke
  D3 grammar (line-oriented, regex-friendly: each top-level key on
  its own line; nested arrays are bullet-indented). The parser is
  hand-rolled; importing a strict YAML loader would mis-tokenize the
  `$`-prefixed sigils.
- (Earlier draft called this "YAML-ish code block" — the literal
  contract is phase-1 D3's grammar at
  `docs/plans/playtest-harness/phase-1-scenarios.md:176-210`. Cite
  that line range from the parser source.)
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
     **Orchestrator-driven reconnect filter (C8):** before matching,
     the tier-3 matcher filters `connections.jsonl` to retain only
     entries with `reason === 'natural'`. Entries tagged
     `'orchestrator-driven'` (viewport rotation between scenarios,
     free-play → scripted seat teardown, and similar harness-internal
     lifecycle) are excluded — they would otherwise drown real
     axis-13 scenarios in bookkeeping noise. Scenarios that WANT to
     assert orchestrator-driven reconnects are out of scope for v1
     (Phase 6 calibration may surface a need; if so, add an explicit
     `reason:` field to the scenario grammar).
  Tier 3 is a separate transport from `events.jsonl`; connection
  disconnect/reconnect is NOT a god-event.
- **Viewport-invariance (phase-3 B3 / D11):** all three tiers operate
  exclusively on `events.jsonl` + `connections.jsonl` — neither file's
  content varies with viewport. Therefore tier-1/2/3 matching is
  viewport-invariant, and re-firing the same scenario at three
  viewports produces three identical detector outcomes. The only
  viewport-sensitive check is each scenario's `ui-assertions:` block,
  which is seat-agent-eyeballed (Phase 4) and never machine-verified
  in Phase 3. This is the structural justification for D11's
  cycling-only-on-tagged-subset rule.
- FireRecord fields: `{ scenarioId, seatId, firstEventIdx,
  lastEventIdx, nowMsRange, tier1: 'pass' | 'fail',
  tier2: 'pass' | 'fail' | 'n/a', tier3: 'pass' | 'fail' | 'n/a',
  matched: 'clean' | 'with-divergence' | 'no-fire',
  divergenceNotes?: string[] }`.
  **Tri-state coverage rule (phase-3 B4 / D9.1):**
  - `'clean'` — tier1 passed AND every present tier2/tier3 also passed.
  - `'with-divergence'` — tier1 passed (scenario DID fire) AND at least
    one present tier2/tier3 failed (oracle caught a bug). Each
    failure is captured as a structured note in `divergenceNotes` and
    relayed to the divergence list (separate output) for triage.
  - `'no-fire'` — tier1 did not match; the scenario did not trigger.
  Coverage counts `'clean'` + `'with-divergence'` BOTH as "fired" toward
  the ≥50 threshold (tier-1 passing means the scenario triggered;
  tier-2/3 divergence is a bug report, not a missed scenario). The old
  rule "all present tiers pass → fire" silently lost the scenario from
  the firedCount whenever the oracle caught a divergence — exactly
  inverted signal. New rule restores fire count + surfaces divergences
  as a separate output.
- `ui-assertions:` and `inference:` are diagnostic-only (never machine-
  verified) — surfaced verbatim in the coverage report for seat-agent
  corroboration.

**Patterns to follow:**
- `node:stream/promises` or simple line-reader for jsonl consumption.
- Role-binding unification via a small scope map, not a full Prolog.

**Test scenarios:**
- Tier-1 happy path: strict-shape scenario, single fire → one FireRecord
  with `tier1='pass'`, `tier2='n/a'`, `tier3='n/a'`, `matched='clean'`.
- Tier-1 `contains` shape: sparse event stream with extras → matches
  (`matched='clean'`).
- Tier-1 `negative` shape: dispatch error with cited code present → counts
  as fire (`matched='clean'`); same dispatch without error → not fired
  (`matched='no-fire'`).
- Tier-1 miss: events stream lacks the required shape → no FireRecord OR
  FireRecord with `tier1='fail'`, `matched='no-fire'`.
- Tier-2 happy path: axis-11 named-steal scenario with
  `projectionAssertions` against
  `projections[$TARGET].nopeWindow.namedSteal.namedCardType = $PRESENT` →
  tier1 passes on events window, tier2 reads the god-event projection
  snapshot and sees the field → `matched='clean'`, fire recorded.
- **Tier-2 divergence (phase-3 B4):** tier1 passes but
  `projections[$TARGET]` is missing the named-steal field → `tier1='pass'`,
  `tier2='fail'`, **`matched='with-divergence'`**. Counts toward
  `firedCount` AND emits a divergence note enumerating
  `{ scenarioId, tier: 2, viewer: 'TARGET', path:
  'nopeWindow.namedSteal.namedCardType', expected: '$PRESENT',
  observed: '$ABSENT' }`. The divergence is a projection-layer bug
  report (the scenario DID fire — the engine reached the named-steal
  state — and the oracle caught the projection bug). Old rule would
  have hidden this fire from the count entirely.
- Tier-3 happy path: axis-13 reconnect-before-resolve scenario with
  `connectionEvents: [{ seat: 'alice', transition: 'disconnect', at: 3 },
  { seat: 'alice', transition: 'reconnect', at: 7 }]` → matcher consults
  `connections.jsonl`, confirms both transitions occurred within the
  events window → `matched='clean'`, fire recorded.
- **Tier-3 divergence (phase-3 B4):** axis-13 scenario fires on
  events (tier1 pass) but expected reconnect transition missing in
  `connections.jsonl` → `tier3='fail'`, **`matched='with-divergence'`**,
  divergence note `{ scenarioId, tier: 3, expected: 'reconnect at 7',
  observed: 'no reconnect transition' }`. Counts toward `firedCount`.
- Mixed-tier divergence: tier1 passes, tier2 passes, tier3 fails →
  `matched='with-divergence'`, divergence note enumerates only the
  failed tier(s).
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

**Requirements:** R6, R8 (this unit IS the implementation of the
absolute ≥50 + no-zero-cell gates declared by R8 + D13.1; computes
both gates, renders verdict, surfaces zero-cell + with-divergence
counts in the summary banner).

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
- Grid rows (7), internal identifiers → phase-1 D5 literal display
  labels via `ROW_DISPLAY_LABELS` (from Unit 1):
  `SERVER` → `'SERVER'`; `ACTOR` → `'ACTOR'`; `TARGET` → `'TARGET'`;
  `OTHER_ALIVE` → `'OTHER (alive)'`; `SPECTATOR` →
  `'SPECTATOR (eliminated, connected)'`; `DISCONNECTED` →
  `'DISCONNECTED (alive, not connected)'`; `BOARD` → `'BOARD'`.
  `renderCoverage` emits the display labels; types and test identities
  use the internal form.
- Grid columns (phase-1 D5, character-for-character):
  **Column 1 — Projection returns today** (descriptive, cites
  `src/server/projection.ts`) and **Column 2 — Viewer should see**
  (prescriptive, cites `docs/RULES-REFERENCE.md` +
  `docs/PRODUCT-SPECIFICATION.md` + Archer §3 acceptance test) (2
  columns).
- Each cell tallies the scenarios whose fire signature touched that
  (vantage, column) pair AND fired this run. `gridCells[row].column1` /
  `.column2` / `.scenarioIds` mirrors the Unit 1 shape.
- **Pass/fail gate (PRD §8.2 + phase-3 D13.1 / B5).** Two conjoint
  gates:
  - **Primary (R8 absolute count):** `report.firedCount >= 50`. Per
    D9.1 / B4, `firedCount` includes BOTH `matched='clean'` AND
    `matched='with-divergence'` records (a tier-2/3 oracle finding is
    a bug report, not a missed scenario).
  - **Secondary (no-zero-cell):** `report.zeroCellCount === 0`. Every
    one of the 14 cells (7 rows × 2 columns) must have ≥1 fire; if
    `DISCONNECTED × Column 1` or `SPECTATOR × Column 2` (or any other
    cell) reads 0, the run fails. Without this gate, 50 fires can
    concentrate in 2 cells while the vantages most likely to expose
    projection bugs stay at zero — gameable. Pass = (`firedCount >= 50`)
    AND (`zeroCellCount === 0`); else `UNDER-COVERED` with the failing
    gate(s) and breakdown reported.
- Markdown sections, in order:
  1. **Summary banner** — `Fired: <N> / target: 50` + PASS /
     UNDER-COVERED verdict + `Zero cells: <K>` (D13.1 secondary gate)
     + `With-divergence: <M>` (count of FireRecord
     `matched='with-divergence'`).
  2. **7×2 info-gap grid** — markdown table, 7 rows × 2 data columns
     (row label, column1 count, column2 count, scenarioIds summary).
     Cells reading 0 highlighted; row labels emit via
     `ROW_DISPLAY_LABELS` (Unit 1, B2).
  3. **Fired by viewport** — per-viewport scenario list (D11 three
     viewports). Tagged-scenario subset only per B3.
  4. **Free-play accounting** — free-play vs scripted wallclock split
     (D12).
  5. **Fired scenarios** — flat list with `matched` state +
     tier-pass breakdown from Unit 9 (`clean` and `with-divergence`
     entries; `no-fire` entries surfaced under section 6 instead).
  6. **Unfired scenarios** — `matched='no-fire'` records grouped by
     axis, each with the vantage cell it WOULD have covered.
  7. **Divergence list (phase-3 B4 / D9.1).** Two sub-categories:
     a) **Tier-2/3 oracle divergences** — every FireRecord with
     `matched='with-divergence'`, enumerating per-failure
     `{ scenarioId, tier, viewer | seat | path, expected, observed }`
     from `divergenceNotes`. These ARE bug reports against the SUT
     (projection-layer or connection-lifecycle); the underlying
     scenario still counts toward `firedCount`.
     b) **Self-vs-detector divergences** — self-report-without-detector
     and detector-without-self-report mismatches (the D5 "break the
     oracle-is-SUT tautology" findings).
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
- Happy path: `firedCount = 60`, 20 in SERVER col1, 10 in ACTOR col2,
  etc., `zeroCellCount = 0` → `passed=true`, verdict `PASS`. Grid
  cells total correctly; grid sum equals sum-of-scenario (vantage,
  column) pairs touched, NOT `firedCount` (one scenario can touch
  multiple cells).
- Fail path (primary gate): `firedCount = 48`, `zeroCellCount = 0` →
  `passed=false`, verdict `UNDER-COVERED — primary (≥50) failed`;
  under-covered cells listed.
- **Fail path (secondary gate, phase-3 B5):** `firedCount = 80` (well
  past primary), but ALL fires concentrate in `SERVER × Column 1` and
  `ACTOR × Column 1` while `DISCONNECTED × Column 1`,
  `DISCONNECTED × Column 2`, `SPECTATOR × Column 2` etc. read 0 →
  `zeroCellCount = 12` (or however many), `passed=false`, verdict
  `UNDER-COVERED — secondary (no-zero-cell) failed`; failing cells
  enumerated. Without this case the suite is gameable: an 80-fire
  ACTOR-only run would PASS while DISCONNECTED projection bugs stay
  invisible.
- **Tri-state coverage counting (phase-3 B4 / D9.1):** a scenario
  with `matched='with-divergence'` (tier1 pass, tier2 fail) → counted
  toward `firedCount` AND surfaced under section 7 (Divergence list)
  with the structured note. Same scenario with `matched='no-fire'`
  → NOT counted toward `firedCount` and surfaced under section 6
  (Unfired scenarios) instead.
- **Mixed tri-state scenario:** 40 `clean` fires + 15
  `with-divergence` fires + 100 `no-fire` records →
  `firedCount = 55` (40 + 15), `passed` depends on zeroCellCount;
  Divergence list section 7 enumerates 15 entries.
- Edge case: all axis-11 scenarios fired tier1 but failed tier2
  projection-assertion → every record `matched='with-divergence'`;
  grid credits column1 (events matched) AND column2 (still touched
  by the scenario's vantage); divergence list enumerates the tier-2
  projection-layer findings; `firedCount` includes every scenario
  (none silently lost).
- Edge case: scenario self-reported but no detector match → `divergences`
  array contains `{ kind: 'self-without-detector', ... }`; rendered in
  Divergences section 7b.
- Edge case: detector match without self-report → `{ kind: 'detector-
  without-self', ... }` rendered.
- Edge case: known-product-call scenario fired → appears in Known product
  calls section, NOT in Fired scenarios count toward the `firedCount`
  gate (per phase-1 D4 suppression contract).
- Edge case: 2-player session has no OTHER_ALIVE row content → renders
  the row with `n/a` cells, does not crash.
- Regression: for every `ViewerRole` internal identifier, the test
  asserts `ROW_DISPLAY_LABELS[role]` equals phase-1 D5's literal prose
  (`'SERVER'`, `'ACTOR'`, `'TARGET'`, `'OTHER (alive)'`,
  `'SPECTATOR (eliminated, connected)'`,
  `'DISCONNECTED (alive, not connected)'`, `'BOARD'`). Catches drift in
  either direction. Column labels are likewise asserted
  character-for-character against phase-1 D5.

**Verification:**
- Unit tests pass.
- Column labels are character-for-character equal to phase-1 D5
  (asserted via `ROW_DISPLAY_LABELS`).
- `passed` is true iff `firedCount >= 50` AND `zeroCellCount === 0`
  (phase-3 D13.1 / B5); both gates required.
- Tri-state `matched` (clean / with-divergence / no-fire) drives both
  `firedCount` (clean + with-divergence) and divergence-list
  population (with-divergence only) per D9.1 / B4.

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
  `docs/testing/playtest/runs/`, calls `selectForRotation`, then for
  each rotated dir: **delete it recursively**. No archive mode in v1 —
  `retentionMode` flag was removed in H-2b because archives accumulate
  without auto-delete, trading one disk-pressure problem for another
  with no concrete retrieval need. If a concrete archive-retrieval
  requirement appears later, re-add `--archive` as an explicit flag
  then.
- `purge(cli: { before?: string; sessionId?: string; fullDir?: boolean }):
  Promise<PurgeResult>` — the `pnpm playtest:purge` entry. Accepts
  `--before YYYY-MM-DD` OR a specific session id. `--full-dir` deletes
  the entire session directory; default deletes only `events.jsonl`
  (preserves `session.md`, `coverage.md`, `issues/` for post-mortem).
- All retention decisions are logged to `docs/testing/playtest/runs/
  _retention.log` (append-only, one JSON line per run).

**Patterns to follow:**
- `node:fs/promises` for FS ops.
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
- Retention deletion: rotated dir is deleted recursively; no tarball
  written (v1 has no archive mode — removed in H-2b).
- Retention boundary: dir at exactly the `sessionDirRetention`-th
  newest position is KEPT; the `(N+1)`-th newest is deleted. Test
  both sides of the boundary explicitly.
- Config override honored: passing `sessionDirRetention: 3` keeps 3,
  deletes all others; default is 10 per D15.
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
  log per D11, `reason`-tagged per C8), `_retention.log`. No archive
  tarballs (v1 retention = delete only).
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
  **deleted recursively** — archive mode removed in H-2b). Operator
  purge (`pnpm playtest:purge`) is explicit — no implicit scheduled
  deletion. `docs/testing/playtest/runs/**` gitignored at Unit 1;
  session artifacts never reach the repo.
- **Per-session token minted locally (phase-3 D14, not global).** Unit
  6 mints a 64-hex-char token at run start via Unit 3b; seeds it into
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
| Retention fills disk with old session dirs | Default rolling retention = 10 most-recent dirs (config `sessionDirRetention`); older dirs are **deleted recursively** by `applyRetention` at run end (Unit 10b). Archive mode was considered and dropped in H-2b (archives have their own disk-pressure problem with no retrieval consumer). If explicit retention of specific runs is needed, operator skips them via `--before` filter on `pnpm playtest:purge`. **CI gap:** when harness runs in CI (future work), rolling retention still applies, but there is no human operator — document the constraint in Scope Boundaries. |
| Harness git SHA recorded stale (Claude forgets) | `session.md` writer reads SHA at start via `git rev-parse HEAD` — automated. |
| Dev servers already running from separate terminal | Orchestrator detects (health endpoint responds before spawn) and aborts with clear message — do NOT reuse, because flag + minted token would be unset in the pre-existing process. |
| Form-factor cycling tripled wallclock without coverage gain (pre-B3) | D11 / phase-3 B3 scope reduction: viewport rotation only fires for scenarios tagged `min-viewport:` OR carrying `ui-assertions:`. All other scenarios run on the default viewport (390×844). Tier-1/2/3 detector is viewport-invariant by construction (consumes `events.jsonl` + `connections.jsonl` only), so re-running viewport-insensitive scenarios at three viewports produces three identical outcomes — pure wallclock waste. Estimated wallclock reduction vs naïve cycling: ~3× on the untagged majority, while still cycling the tagged subset where seat-agent eyeballing varies by viewport. |
| Subprocess env exposes `PLAYTEST_TOKEN` via `/proc/<pid>/environ` (Linux) or Process Explorer (Windows) | v1 assumes local-only, single-trusted-operator deployment; this is explicitly scoped in Scope Boundaries > Trust Model. Mitigation = trusting the single-user assumption. Future-work (not built): transient file with `0600` perms that the orchestrator unlinks post-read. |
| God WS URL with `token=<T>` query-string captured by Playwright `tracing.start()` or wrangler `--log-level=debug` | Unit 3 pre-flight aborts the orchestrator if `PLAYWRIGHT_TRACE`, `DEBUG=*`, or `--log-level=debug` is set. Explicit `--allow-trace` opt-in for one-off debugging prints a startup banner warning the operator that traces will contain the token. Default: refuse to launch. |
| Scrubber `'auto'` mode silently skipped when operator forgets `NODE_ENV=production` | Removed in H-2b (C3). Default is `'on'`. `'off'` requires explicit `--no-scrub` at orchestrator launch AND prints a loud `⚠️ SCRUBBER DISABLED` banner before any god-event writes. No NODE_ENV-sensing. |
| Within-session hash correlation lets triager identify repeat cards | **Intentional** per D15 threat model. Scrubber's promise is cross-session non-reversibility (per-session salt) + triage fidelity (stable hash within-session); it does NOT promise within-session unlinkability. Sharing session dirs outside the team is the operational risk; see `scripts/playtest/README.md` warning. |
| Orchestrator-driven viewport rotation pollutes `connections.jsonl` with spurious axis-13 transitions | `ConnectionEvent.reason` field (`'natural' \| 'orchestrator-driven'`) added in C8. Unit 6 step 11 explicitly tags its teardown/rebuild disconnects and reconnects as `'orchestrator-driven'`. Unit 9 tier-3 matcher filters `connections.jsonl` to `reason === 'natural'` before scenario matching. Scenarios targeting harness-internal transitions are out of v1 scope. |
| `events.jsonl` fsync semantics: crash loses un-flushed events | Unit 4 does `fs.fdatasync` on close for deterministic flush; 100ms queue window is the only in-flight exposure. Backpressure is unbounded in v1 — Phase 6 calibration measures queue depth under nope-chain storms and adds bounds if observed growth exceeds operator memory budget. |
| Cloudflare DO hibernation pause exceeds `godReassemblyTimeoutMs` default (5000ms) → spurious partial flush | Timeout is tunable via config (`godReassemblyTimeoutMs`). Phase 6 calibration retunes against observed inter-message latency at real-session scale. Partial flush is diagnostic (marks `partial: true`), not fatal — stuck reassembly still produces a line. |
| `PLAYTEST_CONFIG_LOCKED` after orchestrator crash leaves room locked until DO eviction | v1 workaround: operator restarts wrangler (loses seed reproducibility for that run). Phase 2 could add an admin-unlock message in future work; out of v1 scope. Orchestrator aborts cleanly with actionable message ("config already locked — restart wrangler to recover"). |

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
- **D5 — 7-row × 2-column info-gap table.** Phase-1 prose labels
  (literal): `SERVER`, `ACTOR`, `TARGET`, `OTHER (alive)`,
  `SPECTATOR (eliminated, connected)`,
  `DISCONNECTED (alive, not connected)`, `BOARD`. Phase-3 mirrors
  these character-for-character via `ROW_DISPLAY_LABELS` (Unit 1)
  while internal types use identifiers `SERVER`, `ACTOR`, `TARGET`,
  `OTHER_ALIVE`, `SPECTATOR`, `DISCONNECTED`, `BOARD`. Columns:
  `Column 1 — Projection returns today` /
  `Column 2 — Viewer should see`.
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
  `docs/plans/playtest-harness/phase-2-playtest-mode.md:690-784`.
- **Unit 5 — `playtest-config` first-write-wins + `PLAYTEST_CONFIG_LOCKED`
  error:** `docs/plans/playtest-harness/phase-2-playtest-mode.md:785-877`.
- **Unit 6 — emit-from-broadcast implementation + per-viewer split
  fallback:** `docs/plans/playtest-harness/phase-2-playtest-mode.md:878-1006`.
- **Unit 6a — `buildGodProjections(state, boardView, connectedPlayerIds)`
  pure helper:** `docs/plans/playtest-harness/phase-2-playtest-mode.md:1007-1166`.
- **Unit 8 — payload budget (< 512 KiB at N=10) + per-viewer split trigger:**
  `docs/plans/playtest-harness/phase-2-playtest-mode.md:1242-1318`.

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
