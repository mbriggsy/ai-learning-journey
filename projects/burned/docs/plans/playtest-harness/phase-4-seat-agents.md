---
title: "Playtest Harness — Phase 4: Seat Agent System"
type: feat
status: draft
date: 2026-04-23
parent: docs/plans/playtest-harness/roadmap.md
origin: docs/testing/PLAYTEST-HARNESS-PRD.md
---

# Phase 4 — Seat Agent System

## Overview

Define the seat-agent system: the system prompt, the exact tool allowlist,
the log/suspicion file formats, the scenario-fire reporting protocol, and the
launcher the Phase 3 orchestrator uses to spawn one agent per seat. The core
deliverable is a contract: "a Claude subagent with THIS prompt and THIS tool
surface, handed THIS `SeatHandle`, will play BURNED from a seat's point of
view and produce the logs that Phase 3/5 consume."

## Problem Frame

The PRD's §4.1 and §4.2 principles ("isolation sacred" / "player-POV
enforced") are the entire reason this harness exists. A weakly-scoped seat
agent defeats the whole system. The agent needs enough tools to play the
game through the UI, but not enough to peek at server state, read other
seats' screens, or execute arbitrary JavaScript in the page.

Equally important: the logs must be structured so the orchestrator's
post-hoc detector (Phase 3 Unit 9) can verify self-reports, and so triage
agents (Phase 5) can consume them without bespoke parsing.

## Requirements Trace

- **R1 (PRD §4.1)** — Agent has no mechanism to read outside its seat.
  Enforced by tool allowlist, not by agent self-discipline.
- **R2 (PRD §4.2)** — Agent sees accessibility tree + screenshots only. No
  `page.evaluate`, no `__gameStoreSnapshot`, no protocol imports.
- **R3 (PRD §4.4)** — Agent logs suspicions with equal weight to scenario
  fires. Low friction for "this felt off."
- **R4 (PRD §6.3)** — Agent follows the observe-act-log loop; exercises
  catalog scenarios when opportunity arises.
- **R5 (PRD §6.5)** — Seat logs land at `runs/<id>/seats/seat-N.log.md`;
  suspicion logs at `runs/<id>/suspicions/seat-N.suspicions.md`.
- **R6 (PRD §8.1)** — Orchestrator can audit the agent's tool calls to
  verify no isolation breach occurred.
- **R7 (PRD §8.5)** — Agent self-reports scenario fires with evidence;
  orchestrator cross-checks against the god-event log (Phase 3 Unit 9).

## Scope Boundaries

- **In scope:** Seat-agent system prompt, tool allowlist specification,
  log + suspicion file formats, scenario-fire reporting protocol, the
  agent-launcher glue in the orchestrator that converts `SeatHandle` →
  spawned `Agent` subagent.
- **Out of scope:** Triage-agent behavior (Phase 5). Orchestrator
  infrastructure (Phase 3). Server changes (Phase 2). Calibration run
  (Phase 6).
- **Out of scope:** Strategy improvements. Seat agents don't need to win.
  Their goal is coverage + suspicion-rich logs.

### Deferred to Separate Tasks

- **Agent prompt tuning.** v1 is the "first believable pass." Phase 6
  calibration sessions produce the first tuning data; tuning continues as
  living work.
- **Per-scenario specialist agents.** v1 all seats use the same prompt.
  Later we might spawn specialized "try to break Favor" agents; defer.

## Context & Research

### Relevant Code and Patterns

- **Phase 3 SeatHandle contract:** `{ seatId, seatName, page, logPath,
  suspicionPath, scenariosPath }`. Phase 4 consumes this exactly.
- `tests/e2e/helpers.ts` — `waitForPhase`, `waitForPlayerCount` patterns.
  Seat agents have analogous needs but must operate via accessibility tree
  + locators, not `__gameStoreSnapshot`.
- `src/client/player/` (19 `.tsx` components) — the visible UI surface:
  `Hand.tsx`, `SmartActionBox.tsx`, `IncomingSteal.tsx`, `PlayerAlert.tsx`,
  `StealReport.tsx`, `CardDetailSheet.tsx`, `StagingArea.tsx`, etc. Each
  has CSS-module class names and ARIA labels the agent can locate.
- `src/shared/protocol.ts` — NOT imported by the agent. The agent reads the
  DOM, not protocol types. The prompt references protocol concepts in
  plain English.
- `docs/testing/playtest/SCENARIOS.md` (Phase 1 deliverable) — agent
  reads this as part of its system prompt context.
- **Phase 1 fire-signature contract** — agent self-reports scenarios by
  ID. Orchestrator's detector independently matches the god-event log; a
  self-report divergence is itself a finding.

### Institutional Learnings

- `docs/insights/008-adversarial-swarm-review-maximum-overdrive.md` —
  "hostile framing beats collaborative framing." Prompt should instruct
  the agent it *wants* to find clarity/fairness bugs, not be deferential.
- `docs/plans/phase-6-hardening-deploy.md:553-584` — `window.__gameStore
  Snapshot` is a god-mode view. Tree-shaken from prod bundles (E-03). Dev
  bundle has it available; agents must NOT call it.
- Memory `feedback-stop-thrashing.md` — agents should not chain decisions;
  one observation, one action, one log entry, move on.
- Memory `feedback-visual-work-one-change-at-a-time.md` — same discipline
  applies to UI-driven play.

### External References

None — agent design grounded entirely in PRD + repo learnings.

## Key Technical Decisions

- **D1. Seat agent is a Claude subagent spawned via the `Agent` tool.**
  One per seat, launched concurrently by the orchestrator. Each subagent
  inherits its own context and operates independently. Orchestrator joins
  all subagents with `Promise.all` (learnings: "wait for all agents").
- **D2. Tool allowlist is a strict whitelist.** Agent has access to:
  Playwright browser tools via MCP (`browser_snapshot`, `browser_click`,
  `browser_fill_form`, `browser_press_key`, `browser_hover`,
  `browser_take_screenshot`, `browser_wait_for`), a scoped `Write`/`Edit`
  to its own two log paths, and nothing else. Specifically banned:
  `browser_evaluate`, `browser_run_code`, general `Read` outside its
  scenarios path, `Bash`, `Agent`, `Grep`, `Glob`.
- **D3. Playwright page is pre-attached via MCP.** Orchestrator launches
  the Playwright MCP server against the same browser context the SeatHandle
  owns. Agent subagent only sees that one page through MCP — it cannot
  navigate to arbitrary URLs (navigation tools are either off-allowlist or
  scoped to the pre-loaded origin + path).
- **D4. Scenario catalog is injected at prompt time, not read live.**
  Orchestrator includes the parsed scenario catalog (from
  `SCENARIOS.md`) in the agent's system prompt as structured context:
  ID, title, trigger conditions, recognition criteria, suspicion prompts.
  Prevents late-session catalog drift; also means the agent doesn't need
  filesystem `Read` access.
- **D5. Log and suspicion files have a machine-consumable schema.** Each
  entry is a fenced YAML block followed by free prose. Orchestrator's
  parser and Phase 5 triage agents read the YAML. Humans read the prose.
- **D6. Scenario fires are reported as structured log entries with the
  scenario ID + a brief observation.** Mandatory fields: scenario id,
  timestamp (local), triggering action, pre-state observation, post-state
  observation. Free prose optional.
- **D7. Suspicions are low-friction.** Any "this felt off" goes to the
  suspicion log immediately — no requirement to articulate a rule violation.
  Agent is instructed suspicions are valuable *even when wrong*.
- **D8. Agent cannot see other seats' logs.** Its `Write`/`Edit` scope is
  exactly two paths (`logPath`, `suspicionPath`). Even if the agent
  guessed another seat's path, the subagent's scoped allowlist prohibits
  writing there. Orchestrator should also validate post-session that each
  log file's only writer was the matching seat's subagent (if tooling
  exposes that — if not, documented convention).
- **D9. Elimination behavior: stay alive as spectator.** Per PRD §9.3
  resolved decision. Eliminated agent continues observing + logging but
  cannot take actions. Prompt handles this branch explicitly.
- **D10. Deterministic observation rhythm.** Agent's inner loop:
  (1) `browser_snapshot` to capture accessibility tree, (2) decide if an
  action is available, (3) take it or wait, (4) log. Prevents "I'm just
  staring at the screen" behavior and keeps logs dense.

## Open Questions

### Resolved During Planning

- **Do seat agents have access to `Read` for the scenarios path?**
  No — the catalog is injected at prompt time (D4). Cleaner isolation.
- **Do seat agents have access to `Write` for arbitrary paths inside
  their run dir?** No — exactly two paths, the log and the suspicion log.
  Everything else the agent might want to write is actually a signal the
  orchestrator or a Phase 5 triage agent should handle.
- **Does the agent know its own seat ID?** Yes — passed in the prompt as
  `YOUR_SEAT_ID = seat-3` along with seat name, room code, and the initial
  screenshot. This is public information a human player at the seat would
  also know.
- **Does the agent know who the other players are (names)?** Yes —
  names are visible on the board and in the phone UI. That's public
  in-game info. The agent cannot use names to read other seats' state.
- **When does the agent exit?** Three conditions: (1) the game ends and a
  winner is declared, (2) the session timeout is reached (config
  `sessionTimeoutMs`), (3) the orchestrator sends a shutdown signal. The
  agent detects game-end via the phone UI showing a winner screen.

### Deferred to Implementation

- **Exact MCP server configuration for Playwright.** Phase 3's god-
  subscriber-style orchestration will launch the MCP server against each
  seat's page; precise argv settled at code time.
- **Prompt length vs quality tradeoff.** First draft embeds catalog in
  full (60-100 scenarios × ~300 tokens each = large-ish). Calibration
  (Phase 6) will show whether trimming to trigger-conditions-only
  preserves coverage.
- **Error recovery.** If the agent's page navigates unexpectedly (e.g.,
  disconnect screen), the agent tries to rejoin via the visible UI. If
  that fails it logs a fatal and exits. Details at code time.

## High-Level Technical Design

> *Directional guidance for review, not implementation specification.*

### Agent launcher flow

```text
orchestrator.ts runSession()
  ...after createSeat per seat...
  seats: SeatHandle[] of length N
    │
    ▼
  launchSeatAgents(seats, catalog):
    const catalogText = renderCatalogForPrompt(catalog)
    return Promise.all(seats.map(seat => Agent({
      description: `Playtest seat ${seat.seatId}`,
      subagent_type: 'general-purpose',   // with tool-allowlist constraint
      prompt: buildSeatPrompt(seat, catalogText),
    })))
```

### Log entry schema (machine + human)

```markdown
### seat-3 @ 2026-04-24T18:03:42-04:00 — SCENARIO FIRE

```yaml
entryType: scenario-fire
scenarioId: SCN-CALL-IN-FAVOR-EMPTY-HAND-01
seat: seat-3
seatName: Vera
timestamp: 2026-04-24T18:03:42-04:00
triggeringAction:
  card: call-in-a-favor
  target: seat-7 (Otto)
preObservation:
  hand: [call-in-a-favor, neal-proctor, intercepted]
  visibleTargets:
    - seat: seat-7
      name: Otto
      cardCount: 0
postObservation:
  promptShown: "Otto has no cards to give. Play continues."
  turnAdvanced: true
  handAfter: [neal-proctor, intercepted]
```

I targeted Otto because his badge said 0. The game handled it cleanly,
turn advanced back to me for my next card. No suspicion.
```

### Suspicion entry schema

```markdown
### seat-3 @ 2026-04-24T18:04:15-04:00 — SUSPICION

```yaml
entryType: suspicion
seat: seat-3
seatName: Vera
timestamp: 2026-04-24T18:04:15-04:00
severity: low | medium | high
relatedScenario: SCN-NAMED-STEAL-INTERCEPT-01   # or null
questionsTried:
  - "Did I know which card was named?"
```

I saw Dash play a triple-steal on me but I never saw which card he named
before I had to decide about Intercept. I burned it defensively. Maybe
this is fixed by the banner? I didn't see a banner. Could be a flaky
render, could be the bug is back. Worth looking at.
```

### Seat agent prompt shape

```text
You are playing BURNED as SEAT seat-3 (name: "Vera").

Your single job is to (a) play the game through the phone UI, (b) when
you recognize a catalog scenario opportunity, take the action that fires
it and log the fire, (c) log any "this felt off" moment to your
suspicion file immediately, (d) keep playing until the game ends, you
are eliminated (then spectate), or the orchestrator tells you to stop.

YOU CAN ONLY SEE WHAT A HUMAN AT THIS SEAT WOULD SEE. You do not have
god-mode access. You cannot read other seats' screens, the server state,
or the game protocol. You must make decisions on what your phone shows.

YOUR TOOLS: <explicit list of allowed MCP browser calls + Write to two
paths>. Do not ask for other tools; they are not available.

YOUR OPPONENTS: <list of other seat names>. Their hands are private.
Their cardCount badges are public.

YOUR ROOM: <room code>.

SCENARIO CATALOG (recognition, not rules):
<injected catalogText — for each scenario: id, title, trigger
conditions, recognition criteria, suspicion prompts>.

INNER LOOP:
1. Take a snapshot of the page.
2. Identify what phase you're in (lobby, my turn, reactive window,
   prompt, spectator).
3. Decide:
   - If a catalog scenario opportunity exists and you can reasonably
     exercise it, do so.
   - Otherwise, play the natural move.
   - In a reactive window, decide within ~10s of wall time (the window
     is stretched — you have time, but don't stall forever).
4. Log. Every observable transition gets a log entry. Scenario fires
   are structured. Suspicions are mandatory and low-friction.

HOSTILE FRAMING: You WANT to find clarity bugs, unfair moments,
information gaps. "I don't know what's happening" is a valuable signal,
not an embarrassment — log it.

EXIT CONDITIONS:
- Winner screen shown → log final state, exit.
- Your phone shows "you are eliminated" → switch to spectator mode
  (keep snapshotting + logging; don't try to act).
- Orchestrator shutdown signal → log, exit.

LOG FILE: <logPath> (append-only, markdown + fenced YAML).
SUSPICION FILE: <suspicionPath> (append-only, markdown + fenced YAML).
```

### Tool allowlist (exact — enforced by orchestrator)

Allowed MCP Playwright tools:
- `browser_snapshot`
- `browser_click`
- `browser_fill_form`
- `browser_type`
- `browser_press_key`
- `browser_hover`
- `browser_take_screenshot`
- `browser_wait_for`
- `browser_navigate_back` (allowed only for in-app back; navigation to new
  URLs is blocked by MCP server config — the page never leaves the game)

Allowed file tools:
- `Write` with path = `logPath` (preload), append semantics
- `Write` with path = `suspicionPath` (preload), append semantics
  (If the Agent tool doesn't support scoped Write, the prompt hard-constrains
  the agent to those two paths AND Phase 3 post-session audit verifies no
  other files were written in the run dir by that seat's subagent.)

Explicitly NOT allowed:
- `browser_evaluate`, `browser_run_code` — executes JS in page, defeats
  allowlist.
- `browser_navigate` (to arbitrary URL) — defeats URL scope.
- `browser_tabs` — scope escape.
- `Read` — agent has catalog in prompt; no other file reads needed.
- `Grep`, `Glob`, `Bash`, `Agent` — out of scope.

## Implementation Units

- [ ] **Unit 1: Seat-agent system prompt (`scripts/playtest/agents/seat.md`)**

**Goal:** Write the canonical seat-agent prompt. Embeds placeholders the
launcher fills per seat. Includes full catalog-injection template. Hostile
framing per D3-learnings.

**Execution note:** This IS the product of the unit. No tests for prose;
Unit 5 integration-tests the prompt end-to-end.

**Requirements:** R1-R4, R6, R7

**Dependencies:** Phase 1 catalog (for injection shape).

**Files:**
- Create: `scripts/playtest/agents/seat.md`.

**Approach:**
- Markdown document with clearly marked `{{SEAT_ID}}`, `{{SEAT_NAME}}`,
  `{{ROOM_CODE}}`, `{{OTHER_SEATS_JSON}}`, `{{CATALOG_TEXT}}`,
  `{{LOG_PATH}}`, `{{SUSPICION_PATH}}`, `{{SESSION_TIMEOUT_MS}}`
  placeholders.
- Sections: identity, tools, opponents, room, catalog, inner loop, hostile
  framing, exit conditions, log formats.
- Explicit anti-patterns section: "Do NOT ask the orchestrator for tools
  outside your list. Do NOT speculate about other seats' hands. Do NOT
  chain 3+ actions without logging in between."

**Patterns to follow:**
- Existing agent prompts under `C:\Users\brigg\.claude\` for framing
  style (keep reference; do not copy content).

**Test scenarios:**
Test expectation: none — prose artifact.

**Verification:**
- Every placeholder matches a field the launcher provides.
- No hallucinated tool names.
- Exit conditions cover all three termination cases from D1.

- [ ] **Unit 2: `agent-launcher.ts` — catalog renderer + seat spawn**

**Goal:** Turn `SeatHandle[] + parsedCatalog` into N concurrent subagent
spawns with filled prompts.

**Execution note:** Test-first on the renderer; integration-tested via
Phase 6 calibration.

**Requirements:** R4, R5, R7

**Dependencies:** Phase 1 catalog parser (reuse Phase 3 Unit 9 parser);
Phase 3 Unit 6 orchestrator integration point.

**Files:**
- Create: `scripts/playtest/lib/agent-launcher.ts`.
- Create: `scripts/playtest/lib/agent-launcher.test.ts`.
- Modify: `scripts/playtest/lib/orchestrator.ts` — replace Phase 3 Unit 6
  stub with real launch.

**Approach:**
- `renderCatalogForPrompt(catalog): string` — compact format per scenario:
  `SCN-ID | Title | Trigger: ... | Recognize when: ... | Ask yourself: ...`.
- `buildSeatPrompt(seat, otherSeats, catalogText, template): string` —
  substitutes placeholders.
- `launchSeatAgents(seats, catalog, shutdownSignal): Promise<SeatResult[]>`:
  - Parallel spawn via `Agent` tool calls with constrained `subagent_type`
    + `prompt`.
  - Each subagent's description: `Playtest seat <id>`.
  - Wait for all (Promise.all) per learnings.

**Patterns to follow:**
- Phase 3 Unit 9 catalog parser.
- Existing `Agent` tool invocations elsewhere in the session.

**Test scenarios:**
- Happy path: 3 seats + 10-scenario catalog → 3 fully rendered prompts,
  every placeholder resolved.
- Edge case: empty catalog (e.g., smoke test) → prompt still valid with
  "no catalog loaded" note.
- Error path: seat handle missing required fields → throws before spawn.
- Edge case: seat name contains characters needing escaping → escaped
  safely in the prompt.

**Verification:**
- Unit tests pass; prompt renders through calibration.

- [ ] **Unit 3: Log + suspicion schema validators**

**Goal:** Validate that agent-produced log files conform to the schema
so Phase 3's coverage reporter and Phase 5's triage agents can consume
them reliably.

**Execution note:** Test-first.

**Requirements:** R5, R6

**Dependencies:** None — pure.

**Files:**
- Create: `scripts/playtest/lib/log-schema.ts` — Zod schemas for
  `ScenarioFireEntry` and `SuspicionEntry`.
- Create: `scripts/playtest/lib/log-parser.ts` — walks markdown files,
  extracts fenced-YAML blocks, validates each.
- Create: `scripts/playtest/lib/log-schema.test.ts`.

**Approach:**
- Zod schemas mirror D5/D6/D7.
- `parseSeatLog(path): { entries: ValidEntry[], errors: ParseError[] }`.
- Invalid blocks logged as parse errors but don't abort — the detector
  still has partial data.

**Patterns to follow:**
- `src/server/validation.ts` Zod style.

**Test scenarios:**
- Happy path: valid fire entry → parsed.
- Happy path: valid suspicion entry → parsed.
- Error path: YAML block missing `entryType` → parse error, not fatal.
- Error path: unknown `entryType` → parse error.
- Edge case: empty log file → empty entries + no errors.
- Edge case: entry with extra fields → accepted (permissive).
- Edge case: fenced block not YAML (agent mistakenly used JSON) → parse
  error with helpful message.

**Verification:**
- All tests pass.

- [ ] **Unit 4: Post-session agent behavior audit**

**Goal:** After a session ends, audit each seat agent's tool-call history
(if the Agent tool exposes it) and/or inspect the run directory for rule
violations: writes outside allowed paths, attempted nav changes, attempted
eval calls surfaced in error logs.

**Execution note:** Integration-style, runs at end of `runSession`.

**Requirements:** R1, R2, R6

**Dependencies:** Units 1-3.

**Files:**
- Create: `scripts/playtest/lib/isolation-audit.ts`.
- Create: `scripts/playtest/lib/isolation-audit.test.ts`.

**Approach:**
- After all seats finish, walk the run directory:
  - Confirm each seat wrote only to its expected log + suspicion paths.
  - Confirm no unexpected files under `seats/` or `suspicions/`.
- If the Agent tool exposes per-call history, verify no disallowed tool
  name appears. If not, document as a known gap (flag for Phase 6).
- Write `isolation-audit.md` in the run dir.
- Any violation fails the session even after agents exit — the coverage
  report is still written but `session.md` flags the run as
  `status: ISOLATION_BREACH`.

**Patterns to follow:**
- Phase 3 Unit 7 self-test style.

**Test scenarios:**
- Happy path: run dir with exactly expected files → audit passes.
- Error path: extra file in `seats/` → audit fails, session flagged.
- Error path: file outside expected paths written under run dir by an
  agent → audit fails.
- Edge case: agent crashed early, wrote only one log entry → audit
  passes (empty-but-scoped is fine).

**Verification:**
- Audit runs at end of `runSession`; failure flips session status.

- [ ] **Unit 5: Integration test — 2-seat smoke, agents spawn and log**

**Goal:** Verify the Phase 4 plumbing: two seats join, each spawns a
subagent, each produces a log file with at least one valid entry, session
ends cleanly.

**Execution note:** Integration-first. Short-duration session; agents play
a fixed number of turns or hit timeout.

**Requirements:** R4, R5, R6, R7

**Dependencies:** Units 1-4; Phase 3 Units 1-8.

**Files:**
- Create: `scripts/playtest/integration/phase4-smoke.ts`.
- Modify: `package.json` — add `pnpm playtest:phase4-smoke`.

**Approach:**
- Use a short catalog (3-5 scenarios) for speed.
- `sessionTimeoutMs` set to 3 minutes.
- Assert post-session: each seat has a log file with ≥1 valid entry OR a
  clean "timed out" marker.

**Patterns to follow:**
- Phase 3 Unit 8 smoke style.

**Test scenarios:**
- Happy path: 2 seats, 3-minute timeout → session ends cleanly, logs
  present, isolation audit green.
- Error path: one subagent crashes → session records crash but other
  seat's log is still valid.

**Verification:**
- `pnpm playtest:phase4-smoke` green.

## System-Wide Impact

- **Interaction graph:** New subagent spawns from orchestrator. Subagents
  call Playwright MCP tools + scoped Write. Main orchestrator process
  does not intercept subagent tool calls (Claude's Agent tool semantics).
- **Error propagation:** Subagent crash → Promise rejects → session
  result records the failure per seat, continues with remaining seats.
- **State lifecycle risks:** Subagent write collisions on log files are
  prevented by single-writer-per-path convention. No append-lock needed;
  Write tool is synchronous within the subagent's turn.
- **API surface parity:** Log + suspicion schema is a contract with
  Phase 5 triage. If the schema changes, Phase 5 updates in lockstep.
- **Integration coverage:** Unit 5 smoke exercises end-to-end.
- **Unchanged invariants:** Game protocol, server behavior, Phase 2 + 3
  code untouched. The orchestrator's pre-agent setup and post-agent audit
  are the only new surfaces.

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Subagent ignores prompt constraints and tries disallowed tools | Agent tool rejects unknown tool names; disallowed MCP tool names are not mapped. Post-session audit catches any artifacts. |
| Agent discovers `browser_evaluate` via MCP server exposure | Orchestrator's MCP launch disables `browser_evaluate` + `browser_run_code` via server config. Audit check 5 from Phase 3 self-test verifies. |
| Catalog injection balloons prompt context | Unit 2's `renderCatalogForPrompt` produces a compact per-scenario line. Calibration (Phase 6) measures and tunes. |
| Agent produces malformed YAML → log-schema parser sees errors | Unit 3's parser logs errors but doesn't abort; partial data still useful. Prompt emphasizes exact format. |
| Spectator mode bleeds into "still playing" — agent tries to act after elimination | Prompt exit conditions explicit; agent checks phone UI for "you're eliminated" before each action. |
| Agent self-report drift (claims SCN-X fired when it didn't) | Orchestrator's detector (Phase 3 Unit 9) cross-checks god-event log. Divergence is itself a finding per PRD §9.4. |

## Documentation / Operational Notes

- `scripts/playtest/README.md` adds a "Seat agents" section covering prompt
  template, tool allowlist, schema, and how to modify the prompt between
  sessions.
- Keep `seat.md` under version control; changes to it affect session
  reproducibility and should be recorded in `session.md` (via the harness
  git SHA already captured at start).

## Sources & References

- **Origin:** [docs/testing/PLAYTEST-HARNESS-PRD.md](../../testing/PLAYTEST-HARNESS-PRD.md)
- **Parent roadmap:** [docs/plans/playtest-harness/roadmap.md](./roadmap.md)
- **Phase 1 catalog shape:** [docs/plans/playtest-harness/phase-1-scenarios.md](./phase-1-scenarios.md)
- **Phase 3 SeatHandle contract:** [docs/plans/playtest-harness/phase-3-harness-infra.md](./phase-3-harness-infra.md)
- **Phone UI source:** `src/client/player/`
- **Join flow precedent:** `tests/e2e/helpers.ts:35-38`
- **Hostile-framing learning:** `docs/insights/008-adversarial-swarm-review-maximum-overdrive.md`
- **God-mode-escape hazard:** `docs/plans/phase-6-hardening-deploy.md:553-584`
