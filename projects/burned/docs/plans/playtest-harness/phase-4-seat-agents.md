---
title: "Playtest Harness — Phase 4: Seat Agent System"
type: feat
status: draft
date: 2026-04-23
absorbed: 2026-04-23
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

Phase 4 also owns the **runtime enforcement of the tool allowlist** declared
by Phase 3 D5. Phase 3 declares the allowlist as a typed constant in
`scripts/playtest/lib/types.ts` (Unit 1); Phase 4 builds the typed wrapper
around the raw Playwright `Page` that narrows the surface to allowlisted
methods only and proves the disallowed surface cannot be reached at runtime
(per phase-3 H-2b correction: "Phase 3 self-test check 5 asserts the
allowlist definition exists; Phase 4's contract tests assert the wrapper
rejects calls to the disallowed list at runtime").

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
- **R8 (phase-1 D5 / phase-3 D13)** — Seat-agent prompt is aware of the
  7-row × 2-column info-gap matrix and logs a divergence whenever what the
  agent SEES from its role's phone differs from what the phase-1 D5 "Viewer
  should see" column declares for that role. Row labels mirrored
  character-for-character from `ROW_DISPLAY_LABELS` (Phase 3 Unit 1).
- **R9 (phase-1 D1 / spec §8.7)** — When a scenario's fire conditions
  approach, the prompt surfaces the scenario's mandatory `vibe-check:`
  prose and prompts the agent for a yes/no + prose answer. Answer is
  written to the suspicion file as an `entryType: vibe-check` entry and
  treated as first-class by Phase 5 triage (equal weight to fire
  signature per spec §8.7).
- **R10 (phase-1 Unit 5 Part G / phase-3 D12)** — Prompt renders
  differently for **free-play** vs **scripted** modes. Orchestrator
  passes a wallclock signal on each launch (default 20% free-play per
  phase-3 D12); launcher selects the matching prompt variant. Free-play
  mode removes catalog-fire pressure and emphasizes exploratory
  suspicion-logging; scripted mode emphasizes catalog-fire recognition.
- **R11 (phase-3 D5 / H-2b B9)** — Phase 4 owns the typed runtime wrapper
  around the raw Playwright `Page` that consumes Phase 3's allowlist
  constant, narrows the type at compile time, and rejects disallowed
  method calls at runtime. Contract tests prove the wrapper refuses
  `evaluate`, `addInitScript`, `route`, `context`, `network accessors`,
  `setViewportSize`, `setOfflineMode`, `request`, `setExtraHTTPHeaders`,
  `addLocatorHandler`, and arbitrary `goto` — the disallowed list from
  phase-3 D5.

## Scope Boundaries

- **In scope:** Seat-agent system prompt (scripted + free-play variants),
  tool allowlist specification + runtime wrapper enforcement, log +
  suspicion file formats (including the `entryType: vibe-check` and
  `entryType: info-gap-divergence` entries per phase-1 D1 / D5), info-gap
  matrix awareness in the prompt, free-play vs scripted mode selection,
  scenario-fire reporting protocol, the agent-launcher glue in the
  orchestrator that converts `SeatHandle` → spawned `Agent` subagent.
- **Out of scope:** Triage-agent behavior (Phase 5). Orchestrator
  infrastructure (Phase 3) — including viewport cycling, wallclock
  accounting, and connection-event tagging, all of which Phase 3 owns
  per phase-3 D11/D12/C8. Server changes (Phase 2). Calibration run
  (Phase 6).
- **Out of scope:** Strategy improvements. Seat agents don't need to win.
  Their goal is coverage + suspicion-rich logs.

**Note on orchestrator-driven reconnects (phase-3 C8).** The orchestrator
tags its own teardown/rebuild pairs between scenarios (viewport rotation,
scripted → free-play segment switches) with
`ConnectionEvent.reason: 'orchestrator-driven'`. The seat agent does NOT
read `connections.jsonl` directly (it's outside the allowlist). If an
agent observes a reconnect banner / rejoin screen between scenarios, the
prompt instructs it to treat these as expected harness transitions, not
anomalies. Real (natural) connectivity scenarios under axis 13 are driven
by scenario-declared `connection-events:` and should be flagged normally.

### Deferred to Separate Tasks

- **Agent prompt tuning.** v1 is the "first believable pass." Phase 6
  calibration sessions produce the first tuning data; tuning continues as
  living work.
- **Per-scenario specialist agents.** v1 all seats use the same prompt.
  Later we might spawn specialized "try to break Favor" agents; defer.

## Context & Research

### Relevant Code and Patterns

- **Phase 3 SeatHandle contract (mirrored character-for-character):**
  ```ts
  SeatHandle = {
    seatId: string
    seatName: string
    page: Page              // raw Playwright Page — Phase 4 wraps per R11
    viewport: Viewport      // { width, height, label }
    logPath: string
    suspicionPath: string
    scenariosPath: string   // = 'docs/testing/playtest/SCENARIOS.md'
  }
  ```
  Declared in `scripts/playtest/lib/types.ts` (Phase 3 Unit 1). The `page`
  field is the raw Playwright `Page`; the orchestrator performs the
  initial join flow BEFORE handing control to Phase 4's launcher, so the
  wrapper Phase 4 owns (Unit 6 below) can safely omit `goto` from the
  allowlist.
- **Phase 3 allowlist constant:** the method name lists declared in
  phase-3 D5 are the authoritative source. Phase 3 Unit 1 exports them as
  typed constants from `scripts/playtest/lib/types.ts`; Phase 4's wrapper
  imports and enforces them. Phase 3 D5 lists:
  - **Allowed:** `locator`, `waitFor`, `click`, `fill`, `type`, `press`,
    `getByRole`, `getByText`, `getByLabel`, `getByTestId`, `screenshot`.
  - **Disallowed:** `goto`, `evaluate`, `addInitScript`, `route`,
    `setExtraHTTPHeaders`, `setOfflineMode`, `request`, `context`,
    `network` accessors of any kind, `addLocatorHandler`,
    `setViewportSize`.
- **Phase 3 `Viewport` type (mirror):**
  `Viewport = { width: 360|390|768, height: 640|844|1024, label: string }`.
  Declared in `scripts/playtest/lib/types.ts` per phase-3 Unit 1 / D11.
- **Phase 3 `ROW_DISPLAY_LABELS` constant (mirror):** single source of
  truth mapping internal `ViewerRole` identifiers to phase-1 D5's literal
  prose labels. Phase 4's prompt renderer imports and emits these labels
  verbatim into the agent's prompt so the agent reasons in the same
  vocabulary as phase-1 and phase-3:
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
  Agents write these literal strings when logging info-gap divergences;
  Phase 3 Unit 10's regression test asserts the constant equals phase-1
  D5 prose.
- **Phase 3 `FreePlayBudget` type (mirror):**
  `FreePlayBudget = { totalMs: number, freePlayMs: number,
  scriptedMs: number, fraction: number }`. The orchestrator hands the
  active bucket identifier + elapsed-so-far to the launcher when
  spawning (or refreshing) a seat agent per phase-3 D12.
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
  reads this as part of its system prompt context (via the launcher's
  prompt renderer — D4 below keeps the catalog injected at prompt time
  rather than behind a live `Read`).
- **Phase 1 fire-signature contract** — agent self-reports scenarios by
  ID. Orchestrator's detector independently matches the god-event log; a
  self-report divergence is itself a finding.
- **Phase 1 vibe-check contract (D1):** every catalog scenario carries a
  mandatory `vibe-check:` prose field ("Did this moment feel like an
  Archer beat?"). Equal weight to fire signature per spec §8.7 acceptance
  gate. Phase 4's prompt renderer surfaces this prose and prompts the
  agent to answer.
- **Phase 1 info-gap contract (D5):** 7 rows × 2 columns per scenario.
  Column 1 = "Projection returns today" (descriptive). Column 2 =
  "Viewer should see" (prescriptive). Phase 4's prompt renderer filters
  each scenario's info-gap table to the agent's current role (one of
  SERVER/ACTOR/TARGET/OTHER (alive)/SPECTATOR (eliminated, connected)/
  DISCONNECTED (alive, not connected)/BOARD) and prompts for a
  divergence comparison.
- **Phase 1 free-play class (Unit 5 Part G):** `SCN-FREE-PLAY-*` with
  `events: []` + `shape: contains`, `vibe-check:` mandatory. Phase 4
  handles these with a distinct prompt variant.

### Institutional Learnings

- `docs/insights/008-adversarial-swarm-review-maximum-overdrive.md` —
  "hostile framing beats collaborative framing." Prompt should instruct
  the agent it *wants* to find clarity/fairness bugs, not be deferential.
- `docs/plans/_archive/engine-build/phase-6-hardening-deploy.md:553-584` — `window.__gameStore
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
- **D2. Tool allowlist is a strict whitelist, enforced in TWO layers.**
  **Layer 1 — subagent tool surface (defense-in-depth):** Agent has
  access to: Playwright browser tools via MCP (`browser_snapshot`,
  `browser_click`, `browser_fill_form`, `browser_press_key`,
  `browser_hover`, `browser_take_screenshot`, `browser_wait_for`), a
  scoped `Write`/`Edit` to its own two log paths, and nothing else.
  Specifically banned: `browser_evaluate`, `browser_run_code`, general
  `Read` outside its scenarios path, `Bash`, `Agent`, `Grep`, `Glob`.
  **Layer 2 — the typed Playwright `Page` wrapper (R11, Unit 6 below):**
  the wrapper consumes Phase 3's allowlist constant (phase-3 D5,
  declared in `scripts/playtest/lib/types.ts`) and exposes ONLY those
  methods. Even if the Layer 1 MCP surface were misconfigured, Layer 2's
  TypeScript type narrowing + runtime assertion would refuse calls to
  `evaluate`, `addInitScript`, `route`, `context`, `network` accessors,
  `setViewportSize`, `setOfflineMode`, `request`, `setExtraHTTPHeaders`,
  `addLocatorHandler`, and arbitrary `goto`.
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
  **Four `entryType` values** (R8/R9 expand the set beyond v0 two-type
  design):
  - `scenario-fire` — agent self-reports a catalog scenario trigger.
    Mandatory fields in D6.
  - `suspicion` — low-friction "this felt off" (R3).
  - `vibe-check` — Archer-beat yes/no + prose (R9 / phase-1 D1).
    Mandatory when a scenario approaches fire conditions; optional
    otherwise. Lives in `suspicionPath` (not `logPath`) so Phase 5
    triage can treat it uniformly with other aesthetic findings.
  - `info-gap-divergence` — agent's phone differs from phase-1 D5's
    "Viewer should see" column for its role (R8). Also lives in
    `suspicionPath`. Logs the literal `ROW_DISPLAY_LABELS` label for
    the agent's current role, the expected-prose from Column 2, and a
    screenshot hash.
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
- **D11. Info-gap matrix is rendered per-scenario, filtered by agent
  role (R8).** For every scripted scenario injected into the prompt, the
  renderer includes the 7×2 info-gap table from phase-1 D5, with each
  row labelled using `ROW_DISPLAY_LABELS` character-for-character. At
  prompt build time the launcher knows the agent's current role for the
  scenario (SERVER is never an agent — server is god-mode; ACTOR /
  TARGET / OTHER (alive) / SPECTATOR (eliminated, connected) /
  DISCONNECTED (alive, not connected) are the agent-facing rows;
  BOARD is a view other agents may reason about but no seat agent
  owns). The prompt instructs: "Your role for this scenario is
  `{{AGENT_ROLE_LABEL}}`. Column 1 describes what the server's
  projection returns for this role today; Column 2 describes what you
  SHOULD see per the rules + product spec. If what your phone shows
  diverges from Column 2's prose, log an `info-gap-divergence` entry in
  your suspicion file with the literal row label + expected prose +
  screenshot hash." The renderer emits ALL seven row labels into the
  prompt context block for vocabulary consistency even when the agent
  only actively checks its own row — Phase 5 triage reads the full
  vocabulary.
- **D12. `vibe-check:` surfaces near fire conditions (R9).** When the
  launcher renders a scripted scenario, the scenario's prose
  `vibe-check:` field is surfaced inline. The prompt instructs the
  agent: "When you recognize this scenario's fire conditions approaching
  (per its recognition criteria), before taking the triggering action,
  note the vibe-check prompt. Right after the fire, log an
  `entryType: vibe-check` entry in your suspicion file with
  `feltLikeArcher: yes | no` + 1-3 sentences of prose rationale.
  Phase 5 treats these equally with fire-signature findings per spec
  §8.7." For free-play scenarios, vibe-check is mandatory on EVERY
  suspicion entry the agent logs (D13).
- **D13. Free-play vs scripted mode selection (R10).** The launcher
  receives a `modeSignal: 'scripted' | 'free-play'` from the
  orchestrator per-spawn (or per refresh when a segment changes). Two
  prompt templates exist; the launcher selects the matching one.
  - **Scripted prompt** (default): full catalog injected with
    recognition criteria, fire-signature prose, vibe-check prompts,
    and role-filtered 7×2 info-gap tables. Agent actively watches for
    catalog opportunities.
  - **Free-play prompt:** catalog is NOT injected beyond a single
    summary pointer ("the full catalog exists; this segment asks you
    to ignore it"). Explicit wandering license: "play any turn
    without a target scenario in mind. Log every suspicion. Your
    suspicion entries for this segment are REQUIRED to include a
    `vibe-check:` field and should prefer the info-gap frame when
    something felt off." Fire signature for free-play scenarios is
    `events: []` + `shape: contains` per phase-1 Unit 5 Part G — the
    agent doesn't report a specific scenario ID, it just logs
    suspicions + vibe-checks, and Phase 5 triage sifts.
  The mode signal is metadata; it does NOT change the tool allowlist or
  log-path scope (those are permanent per-agent). Default wallclock
  budget per phase-3 D12: 80% scripted / 20% free-play. Phase 6
  calibration may retune.
- **D14. Wrapper construction is single-source-of-truth on the
  allowlist (R11).** The wrapper (`SeatPageWrapper`, Unit 6 below)
  imports Phase 3's allowlist constant directly; it never hand-rolls a
  parallel list. TypeScript narrows the wrapper's public type by mapping
  over the allowlist at compile time (conditional-type extraction). At
  construction, the wrapper runs a runtime invariant asserting no
  disallowed name leaks via the prototype chain (Object.getOwnProperty
  Names + Object.getPrototypeOf walk up to `Page.prototype`). If any
  disallowed method is reachable, the wrapper throws before handing
  itself to the agent. Phase 3's self-test check 5 validates the
  allowlist definition exists; Phase 4 Unit 6's contract tests validate
  the wrapper blocks forbidden calls — the two together close the
  enforcement loop.

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
  seats: SeatHandle[] of length N           // SeatHandle = {
                                            //   seatId, seatName, page,
                                            //   viewport, logPath,
                                            //   suspicionPath,
                                            //   scenariosPath
                                            // }  — phase-3 Unit 1
    │
    ▼
  For each seat:
    (a) Wrap the raw `seat.page` via new SeatPageWrapper(seat.page)
        — Unit 6 below. Wrapper imports Phase 3's allowlist constant and
        refuses disallowed methods at runtime. Hand the wrapper to the
        MCP Playwright bridge instead of the raw Page.
    (b) Determine `agentRole` for this spawn:
        'ACTOR' | 'TARGET' | 'OTHER_ALIVE' | 'SPECTATOR' | 'DISCONNECTED'
        — at spawn time, default is 'OTHER_ALIVE' / 'ACTOR' (pre-game);
        during the session, the prompt instructs the agent to re-read its
        own role each turn from phone UI cues (whose turn is it, am I
        the target of a pending prompt, am I eliminated, am I
        reconnecting). Role labels written verbatim via ROW_DISPLAY_LABELS.
    (c) Ask the orchestrator for the current `modeSignal`:
        'scripted' | 'free-play' (phase-3 D12 FreePlayBudget accounting).

  launchSeatAgents(seats, catalog, budget):
    const scriptedCatalogText = renderScriptedCatalog(catalog)  // full
    const freePlayCatalogText = renderFreePlayPointer(catalog)  // 1-liner
    return Promise.all(seats.map(seat => {
      const wrapped = new SeatPageWrapper(seat.page)   // R11, Unit 6
      const modeSignal = budget.currentBucket()        // phase-3 D12
      const template = modeSignal === 'free-play'
        ? 'scripts/playtest/agents/seat-free-play.md'
        : 'scripts/playtest/agents/seat-scripted.md'
      const catalogText = modeSignal === 'free-play'
        ? freePlayCatalogText
        : scriptedCatalogText
      return Agent({
        description: `Playtest seat ${seat.seatId} (${modeSignal})`,
        subagent_type: 'general-purpose',   // Layer 1 tool-allowlist
        prompt: buildSeatPrompt(seat, wrapped, catalogText, modeSignal, template),
      })
    }))
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

### Vibe-check entry schema (R9 / phase-1 D1)

```markdown
### seat-3 @ 2026-04-24T18:03:45-04:00 — VIBE CHECK

```yaml
entryType: vibe-check
seat: seat-3
seatName: Vera
timestamp: 2026-04-24T18:03:45-04:00
relatedScenario: SCN-CALL-IN-FAVOR-EMPTY-HAND-01
feltLikeArcher: no
vibeCheckPrompt: |
  Did this moment feel like an Archer beat? Was the auto-resolve
  funny, tense, or just mechanical?
```

The toast said "Otto had nothing to give" and the turn advanced. It
read as mechanical — no reaction shot, no comedic timing. Felt like a
test harness, not like the show. Under §2 Quality Bar this is a miss.
```

### Info-gap divergence entry schema (R8 / phase-1 D5)

```markdown
### seat-3 @ 2026-04-24T18:04:02-04:00 — INFO GAP DIVERGENCE

```yaml
entryType: info-gap-divergence
seat: seat-3
seatName: Vera
timestamp: 2026-04-24T18:04:02-04:00
myRoleLabel: 'TARGET'                       # literal ROW_DISPLAY_LABELS value
# (others: 'ACTOR', 'OTHER (alive)',
#  'SPECTATOR (eliminated, connected)',
#  'DISCONNECTED (alive, not connected)', 'BOARD')
relatedScenario: SCN-NAMED-STEAL-INTERCEPT-01
column2Expected: |
  Per rules: everything needed to decide the reactive response
  (Intercept, Favor card choice, Defuse placement). Per spec:
  clear, un-ambiguous banners per §2 Quality Bar.
observedOnPhone: |
  The reactive Intercept button flashed but the named card identity
  never appeared — no banner, no card icon in the nope-window UI.
screenshotHash: sha256-a1b2c3
```

Decision gate was live for ~2.5s before I burned defensively. Prose in
Column 2 says "clear banners." My phone had none. Either the
`projections[targetId].nopeWindow.namedSteal.namedCardType` field was
absent (projection bug) or present-but-not-rendered (UI bug). Can't
distinguish from my seat; flagged for triage.
```

### Seat agent prompt shape — scripted mode

```text
You are playing BURNED as SEAT {{SEAT_ID}} (name: "{{SEAT_NAME}}").
You are running in SCRIPTED mode (phase-3 D12 — ~80% of session wallclock).

Your single job is to (a) play the game through the phone UI, (b) when
you recognize a catalog scenario opportunity, take the action that fires
it and log the fire, (c) log any "this felt off" moment to your
suspicion file immediately, (d) when a scenario's fire conditions
approach, answer its vibe-check prompt (D12), (e) when your phone shows
something different from what the scenario's Column 2 info-gap says you
SHOULD see, log an info-gap-divergence entry (D11 / R8), (f) keep
playing until the game ends, you are eliminated (then spectate), or the
orchestrator tells you to stop.

YOU CAN ONLY SEE WHAT A HUMAN AT THIS SEAT WOULD SEE. You do not have
god-mode access. You cannot read other seats' screens, the server state,
or the game protocol. You must make decisions on what your phone shows.

YOUR TOOLS: <explicit list of allowed MCP browser calls + Write to two
paths>. The Playwright Page you interact with is a typed wrapper
(SeatPageWrapper) that exposes ONLY the phase-3 D5 allowlisted methods
(locator, waitFor, click, fill, type, press, getByRole, getByText,
getByLabel, getByTestId, screenshot). It refuses evaluate, addInitScript,
route, context, network accessors, setViewportSize, setOfflineMode,
request, setExtraHTTPHeaders, addLocatorHandler, and arbitrary goto.
Do not ask for other tools; they are not available.

YOUR OPPONENTS: <list of other seat names>. Their hands are private.
Their cardCount badges are public.

YOUR ROOM: {{ROOM_CODE}}.

YOUR VIEWPORT: {{VIEWPORT_LABEL}} ({{VIEWPORT_WIDTH}}x{{VIEWPORT_HEIGHT}}).
The orchestrator owns viewport cycling (phase-3 D11) — it does not
change mid-scenario.

INFO-GAP VOCABULARY (phase-1 D5). Every scenario declares a 7×2 info-gap
table describing what each role sees. The seven role labels are:

- 'SERVER'                               (god-mode; never an agent)
- 'ACTOR'
- 'TARGET'
- 'OTHER (alive)'
- 'SPECTATOR (eliminated, connected)'
- 'DISCONNECTED (alive, not connected)'
- 'BOARD'                                (shared TV view; no agent)

Your role for each scenario is one of ACTOR / TARGET / OTHER (alive) /
SPECTATOR (eliminated, connected) / DISCONNECTED (alive, not connected).
Use the literal label string when logging info-gap-divergence entries.

For every scripted scenario, the catalog injection below contains both:
- Column 1 — Projection returns today (descriptive)
- Column 2 — Viewer should see (prescriptive)
If your phone contradicts Column 2 for YOUR role in the scenario, that
IS the finding — log info-gap-divergence with the literal role label +
Column 2 prose + screenshot hash.

SCENARIO CATALOG (recognition, not rules — and full 7×2 info-gap tables):
{{CATALOG_TEXT}}

VIBE-CHECK (spec §8.7). Each scenario carries a mandatory vibe-check
prompt asking "Did this moment feel like an Archer beat?" Right AFTER
firing a scenario, log a vibe-check entry in your suspicion file. A
"no — felt mechanical" answer is a valid finding, not residue.

INNER LOOP (D10):
1. Take a snapshot of the page.
2. Identify what phase you're in (lobby, my turn, reactive window,
   prompt, spectator, disconnected-rejoin).
3. Identify your CURRENT role label (ACTOR / TARGET / OTHER (alive) /
   SPECTATOR (eliminated, connected) / DISCONNECTED (alive, not connected)).
4. Decide:
   - If a catalog scenario opportunity exists and you can reasonably
     exercise it, do so.
   - Otherwise, play the natural move.
   - In a reactive window, decide within ~10s of wall time (the window
     is stretched — you have time, but don't stall forever).
5. Log. Every observable transition gets a log entry. Scenario fires
   are structured. Suspicions are mandatory and low-friction. Vibe-checks
   are mandatory near fire conditions. Info-gap divergences are
   mandatory whenever your phone contradicts Column 2.

HOSTILE FRAMING: You WANT to find clarity bugs, unfair moments,
information gaps. "I don't know what's happening" is a valuable signal,
not an embarrassment — log it.

RECONNECT BANNERS (phase-3 C8). If you observe a reconnect / rejoin
screen between scenarios (viewport rotation, segment switch), that is
an expected harness transition (orchestrator-driven); do NOT flag it
as an anomaly. Real connectivity bugs appear only when a scenario's
`connection-events:` block describes them; those are worth flagging.

EXIT CONDITIONS:
- Winner screen shown → log final state, exit.
- Your phone shows "you are eliminated" → switch to spectator mode
  (keep snapshotting + logging; don't try to act). Your role label
  becomes 'SPECTATOR (eliminated, connected)'.
- Orchestrator shutdown signal → log, exit.

LOG FILE: {{LOG_PATH}} (append-only, markdown + fenced YAML).
SUSPICION FILE: {{SUSPICION_PATH}} (append-only, markdown + fenced YAML).
```

### Seat agent prompt shape — free-play mode (R10)

```text
You are playing BURNED as SEAT {{SEAT_ID}} (name: "{{SEAT_NAME}}").
You are running in FREE-PLAY mode (phase-3 D12 — ~20% of session wallclock,
phase-1 Unit 5 Part G scenario class).

This segment has NO target scenario. The full catalog exists in other
segments; here your job is to wander. Play any legal turn. Your
suspicion-logging bar is LOW — log anything that feels off, without
needing to articulate a rule violation.

YOUR TOOLS: (same wrapper as scripted mode — Phase 3 D5 allowlist only).

YOUR ROOM: {{ROOM_CODE}}. YOUR VIEWPORT: {{VIEWPORT_LABEL}}.

INFO-GAP VOCABULARY. Same 7 role labels as scripted mode. Use the
literal label when logging info-gap-divergence entries. Prefer the
info-gap frame when something feels off — "Did I have the info I
needed to decide?" is the harness's highest-value question.

MANDATORY: every suspicion entry you log during this segment MUST
include a vibe-check field (feltLikeArcher: yes | no + 1-3 sentences).
Archer-beat evaluation IS the primary signal in free-play.

Fire signature for free-play is `events: []` + `shape: contains`. You
do NOT report a scenario ID when you suspect something; just log a
suspicion (+ vibe-check + info-gap-divergence if applicable). Phase 5
triage agents sift the free-play findings.

INNER LOOP: (same 5-step loop as scripted mode.)

RECONNECT BANNERS (phase-3 C8): same rule — orchestrator-driven
reconnects are expected transitions, not findings.

EXIT CONDITIONS: (same three as scripted mode.)

LOG FILE: {{LOG_PATH}}. SUSPICION FILE: {{SUSPICION_PATH}}.
```

### Tool allowlist — two layers (phase-3 D5 + phase-4 R11)

**Layer 1 — MCP / subagent tool surface (same as v0).**

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

Explicitly NOT allowed at Layer 1:
- `browser_evaluate`, `browser_run_code` — executes JS in page, defeats
  allowlist.
- `browser_navigate` (to arbitrary URL) — defeats URL scope.
- `browser_tabs` — scope escape.
- `Read` — agent has catalog in prompt; no other file reads needed.
- `Grep`, `Glob`, `Bash`, `Agent` — out of scope.

**Layer 2 — typed Playwright Page wrapper (Unit 6, R11).**

The wrapper consumes Phase 3's allowlist constant (declared in
`scripts/playtest/lib/types.ts` per phase-3 Unit 1 / D5) and narrows the
`Page` surface at compile time + asserts at runtime. This is the
authoritative list (mirror of phase-3 D5):

Allowed `Page` methods (agents MAY call):
- `locator`, `waitFor`, `click`, `fill`, `type`, `press`,
  `getByRole`, `getByText`, `getByLabel`, `getByTestId`, `screenshot`.

Disallowed `Page` methods (wrapper refuses at runtime):
- `goto`, `evaluate`, `addInitScript`, `route`, `setExtraHTTPHeaders`,
  `setOfflineMode`, `request`, `context`, `network` accessors of any
  kind, `addLocatorHandler`, `setViewportSize`.

Rationale: the orchestrator performs the initial join flow BEFORE
handing control to the launcher (phase-3 Unit 5 / D5), so `goto` is
not needed. `setViewportSize` is owned by the orchestrator per phase-3
D11 — seat agents must not change viewports mid-session. `evaluate`
and `addInitScript` are the `__gameStoreSnapshot` god-mode escape
vectors; excluded permanently.

## Implementation Units

- [ ] **Unit 1: Seat-agent system prompts — scripted + free-play variants**

**Goal:** Write the canonical seat-agent prompts (TWO files per R10 / D13:
scripted and free-play). Embeds placeholders the launcher fills per seat.
Scripted template includes full catalog-injection + role-filtered 7×2
info-gap tables + vibe-check surfacing. Free-play template omits the
catalog and makes vibe-check mandatory per suspicion. Hostile framing
per D3-learnings.

**Execution note:** These ARE the products of the unit. No tests for prose;
Unit 5 integration-tests the prompt end-to-end.

**Requirements:** R1-R4, R6, R7, R8, R9, R10

**Dependencies:** Phase 1 catalog (for injection shape + vibe-check
prose + 7×2 info-gap). Phase 3 Unit 1 (`ROW_DISPLAY_LABELS`).

**Files:**
- Create: `scripts/playtest/agents/seat-scripted.md`.
- Create: `scripts/playtest/agents/seat-free-play.md`.

**Approach:**
- Both templates share placeholders: `{{SEAT_ID}}`, `{{SEAT_NAME}}`,
  `{{ROOM_CODE}}`, `{{VIEWPORT_LABEL}}`, `{{VIEWPORT_WIDTH}}`,
  `{{VIEWPORT_HEIGHT}}`, `{{OTHER_SEATS_JSON}}`, `{{CATALOG_TEXT}}`,
  `{{LOG_PATH}}`, `{{SUSPICION_PATH}}`, `{{SESSION_TIMEOUT_MS}}`.
- Scripted template: full HTD "scripted mode" shape above. Includes
  identity, tools (both layers), opponents, room, viewport, info-gap
  vocabulary block emitting all 7 `ROW_DISPLAY_LABELS` verbatim,
  catalog injection slot, vibe-check instructions, inner loop,
  hostile framing, orchestrator-driven-reconnect note, exit
  conditions, log + suspicion formats (including the four
  `entryType` values from D5).
- Free-play template: full HTD "free-play mode" shape above. Same
  info-gap vocabulary block, NO catalog injection, vibe-check made
  mandatory per suspicion, explicit wandering license.
- Both templates carry an anti-patterns section: "Do NOT ask the
  orchestrator for tools outside your list. Do NOT speculate about
  other seats' hands. Do NOT chain 3+ actions without logging in
  between. Do NOT flag orchestrator-driven reconnect banners as
  anomalies."

**Patterns to follow:**
- Existing agent prompts under `C:\Users\brigg\.claude\` for framing
  style (keep reference; do not copy content).

**Test scenarios:**
Test expectation: none — prose artifacts.

**Verification:**
- Every placeholder in each template matches a field the launcher
  provides (Unit 2).
- No hallucinated tool names. Both templates explicitly reference the
  Phase 3 D5 allowlist by listing methods verbatim.
- Both templates render every row label from `ROW_DISPLAY_LABELS`
  character-for-character (grep-verifiable).
- Exit conditions cover all three termination cases from D1.
- Scripted template includes the vibe-check surfacing instruction and
  the four-entryType log schema.
- Free-play template marks vibe-check mandatory per suspicion.

- [ ] **Unit 2: `agent-launcher.ts` — catalog renderer + seat spawn + mode selection**

**Goal:** Turn `SeatHandle[] + parsedCatalog + FreePlayBudget` into N
concurrent subagent spawns with filled prompts. Handles role labelling
via `ROW_DISPLAY_LABELS`, 7×2 info-gap injection, vibe-check surfacing,
and scripted-vs-free-play template selection.

**Execution note:** Test-first on the renderer; integration-tested via
Phase 6 calibration.

**Requirements:** R4, R5, R7, R8, R9, R10

**Dependencies:** Phase 1 catalog parser (reuse Phase 3 Unit 9 parser);
Phase 3 Unit 6 orchestrator integration point; Phase 3 Unit 1
(`ROW_DISPLAY_LABELS`, `Viewport`, `SeatHandle`, `FreePlayBudget`
types); Phase 4 Unit 1 (both prompt templates); Phase 4 Unit 6
(`SeatPageWrapper`).

**Files:**
- Create: `scripts/playtest/lib/agent-launcher.ts`.
- Create: `scripts/playtest/lib/agent-launcher.test.ts`.
- Modify: `scripts/playtest/lib/orchestrator.ts` — replace Phase 3 Unit 6
  stub with real launch.

**Approach:**
- `renderScriptedCatalog(catalog): string` — full per-scenario format:
  `SCN-ID | Title | Trigger: ... | Recognize when: ... | Ask yourself: ...`
  followed by the scenario's 7×2 info-gap table with rows emitted using
  `ROW_DISPLAY_LABELS` verbatim (Column 1 + Column 2) and the vibe-check
  prose. Rendered once per session; re-used per seat with per-seat role
  filtering at template-fill time.
- `renderFreePlayPointer(catalog): string` — one-line reference:
  "The catalog exists; your free-play segment intentionally ignores it.
  Log suspicions + vibe-checks + info-gap divergences freely."
- `buildSeatPrompt(seat, wrappedPage, otherSeats, catalogText, modeSignal, template): string`
  — substitutes placeholders per the chosen template (scripted or
  free-play). Includes `{{VIEWPORT_LABEL}}` / `{{VIEWPORT_WIDTH}}` /
  `{{VIEWPORT_HEIGHT}}` from `seat.viewport`, and emits the full
  `ROW_DISPLAY_LABELS` block for vocabulary consistency.
- `launchSeatAgents(seats, catalog, budget, shutdownSignal): Promise<SeatResult[]>`:
  - For each seat: construct `new SeatPageWrapper(seat.page)` (Unit 6)
    and hand the wrapper — not the raw Page — to the MCP Playwright
    bridge.
  - Read `budget.currentBucket()` (phase-3 D12 `FreePlayBudget`) to
    choose template. When the budget switches bucket mid-session,
    the orchestrator signals the launcher to teardown + respawn the
    seat in the new mode; those teardown/respawn pairs are tagged
    `reason: 'orchestrator-driven'` by the orchestrator per phase-3
    C8 — prompts instruct agents not to flag these as anomalies.
  - Parallel spawn via `Agent` tool calls with constrained `subagent_type`
    + `prompt`.
  - Each subagent's description: `Playtest seat <id> (<mode>)`.
  - Wait for all (Promise.all) per learnings.

**Patterns to follow:**
- Phase 3 Unit 9 catalog parser.
- Phase 3 Unit 1 `ROW_DISPLAY_LABELS` import.
- Existing `Agent` tool invocations elsewhere in the session.

**Test scenarios:**
- Happy path: 3 seats + 10-scenario catalog (scripted) → 3 fully rendered
  prompts, every placeholder resolved, every scenario's 7 `ROW_DISPLAY_LABELS`
  rows emitted verbatim, every scenario's vibe-check prose included.
- Happy path: 3 seats + free-play mode → 3 rendered prompts using the
  free-play template, catalog replaced with the 1-liner pointer,
  vibe-check marked mandatory.
- Happy path: mode switch mid-session → respawn uses the new template
  correctly.
- Edge case: empty catalog (e.g., smoke test) → prompt still valid with
  "no catalog loaded" note.
- Edge case: scenario with an info-gap row marked N/A → row rendered
  with "N/A" literal, not omitted (keeps vocabulary complete).
- Error path: seat handle missing required fields → throws before spawn.
- Error path: seat handle has raw Page that the wrapper rejects (disallowed
  method reachable) → throws before spawn (R11 / D14 invariant).
- Edge case: seat name contains characters needing escaping → escaped
  safely in the prompt.
- Regression: grep the rendered prompt for each
  `ROW_DISPLAY_LABELS[role]` string → all 7 present.

**Verification:**
- Unit tests pass; prompt renders through calibration.
- Both templates rendered end-to-end without missing placeholders.
- Row labels pass character-for-character regression.

- [ ] **Unit 3: Log + suspicion schema validators (four entryType values)**

**Goal:** Validate that agent-produced log files conform to the schema
so Phase 3's coverage reporter and Phase 5's triage agents can consume
them reliably. Covers all four `entryType` values from D5.

**Execution note:** Test-first.

**Requirements:** R5, R6, R8, R9

**Dependencies:** Phase 3 Unit 1 (`ROW_DISPLAY_LABELS` for the
`myRoleLabel` literal-union enforcement on `info-gap-divergence`).

**Files:**
- Create: `scripts/playtest/lib/log-schema.ts` — Zod schemas for
  `ScenarioFireEntry`, `SuspicionEntry`, `VibeCheckEntry`,
  `InfoGapDivergenceEntry`, all discriminated by `entryType`.
- Create: `scripts/playtest/lib/log-parser.ts` — walks markdown files,
  extracts fenced-YAML blocks, validates each.
- Create: `scripts/playtest/lib/log-schema.test.ts`.

**Approach:**
- Zod schemas mirror D5/D6/D7 (four variants):
  - `ScenarioFireEntry`: `entryType: 'scenario-fire'` + fields per D6
    (scenarioId, seat, seatName, timestamp, triggeringAction,
    preObservation, postObservation).
  - `SuspicionEntry`: `entryType: 'suspicion'` + severity, relatedScenario,
    questionsTried (legacy shape).
  - `VibeCheckEntry`: `entryType: 'vibe-check'` +
    relatedScenario, `feltLikeArcher: 'yes' | 'no'`, vibeCheckPrompt.
  - `InfoGapDivergenceEntry`: `entryType: 'info-gap-divergence'` +
    `myRoleLabel` constrained to the literal-string union of
    `ROW_DISPLAY_LABELS` values (i.e. `'SERVER' | 'ACTOR' | 'TARGET' |
    'OTHER (alive)' | 'SPECTATOR (eliminated, connected)' |
    'DISCONNECTED (alive, not connected)' | 'BOARD'`),
    relatedScenario, column2Expected, observedOnPhone, screenshotHash.
- `parseSeatLog(path): { entries: ValidEntry[], errors: ParseError[] }`.
- Invalid blocks logged as parse errors but don't abort — the detector
  still has partial data.

**Patterns to follow:**
- `src/server/validation.ts` Zod style.
- Phase 3 Unit 1 `ROW_DISPLAY_LABELS` as the source of the role-label
  literal union (import, don't duplicate).

**Test scenarios:**
- Happy path: valid fire entry → parsed.
- Happy path: valid suspicion entry → parsed.
- Happy path: valid vibe-check entry with `feltLikeArcher: yes` → parsed.
- Happy path: valid info-gap-divergence entry with
  `myRoleLabel: 'SPECTATOR (eliminated, connected)'` → parsed.
- Error path: YAML block missing `entryType` → parse error, not fatal.
- Error path: unknown `entryType` → parse error.
- Error path: `info-gap-divergence` with `myRoleLabel: 'SPECTATOR'`
  (drift from the literal `'SPECTATOR (eliminated, connected)'`) →
  parse error (catches prompt-renderer drift).
- Error path: `vibe-check` with `feltLikeArcher: 'maybe'` → parse error
  (yes/no literal union only).
- Edge case: empty log file → empty entries + no errors.
- Edge case: entry with extra fields → accepted (permissive).
- Edge case: fenced block not YAML (agent mistakenly used JSON) → parse
  error with helpful message.

**Verification:**
- All tests pass.
- Role-label literal union in the info-gap-divergence schema is
  sourced from `ROW_DISPLAY_LABELS` (import, not duplicate) — any
  future drift in either file fails typecheck, not silently.

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
ends cleanly. Exercises BOTH scripted and free-play modes within the
same session to prove the mode-switch respawn path (R10 / D13).

**Execution note:** Integration-first. Short-duration session; agents play
a fixed number of turns or hit timeout.

**Requirements:** R4, R5, R6, R7, R10, R11

**Dependencies:** Units 1-4, Unit 6 (wrapper); Phase 3 Units 1-8.

**Files:**
- Create: `scripts/playtest/integration/phase4-smoke.ts`.
- Modify: `package.json` — add `pnpm playtest:phase4-smoke`.

**Approach:**
- Use a short catalog (3-5 scenarios) for speed.
- `sessionTimeoutMs` set to 3 minutes.
- Configure `freePlayWallclockFraction: 0.5` for the smoke so both
  buckets exercise within the 3-minute budget.
- Assert post-session: each seat has a log file with ≥1 valid entry OR a
  clean "timed out" marker.

**Patterns to follow:**
- Phase 3 Unit 8 smoke style.

**Test scenarios:**
- Happy path: 2 seats, 3-minute timeout, 50/50 scripted/free-play →
  session ends cleanly, logs present, both `entryType: scenario-fire`
  and free-play `entryType: suspicion`+`entryType: vibe-check` entries
  observed, isolation audit green.
- Happy path: mode-switch respawn pair logged as `reason:
  'orchestrator-driven'` in `connections.jsonl` (phase-3 C8 integration).
- Error path: one subagent crashes → session records crash but other
  seat's log is still valid.
- Regression: wrapper (Unit 6) rejects a synthetic `page.evaluate`
  call → logged as a runtime wrapper-reject, does NOT fail the session
  (the wrapper is the enforcement layer; this proves it works).

**Verification:**
- `pnpm playtest:phase4-smoke` green.

- [ ] **Unit 6: `SeatPageWrapper` — typed runtime allowlist wrapper (R11 / D14)**

**Goal:** Build the typed wrapper around the raw Playwright `Page` that
consumes Phase 3's allowlist constant (declared in
`scripts/playtest/lib/types.ts` per phase-3 D5), narrows the public
surface at compile time to the allowlisted methods only, and refuses
disallowed method access at runtime. This is the enforcement half of the
phase-3 / phase-4 allowlist contract: phase-3 declares, phase-4 enforces.

**Execution note:** Test-first. The wrapper is pure TypeScript; tests
use a stubbed `Page` and assert both compile-time narrowing (via
`// @ts-expect-error` fixtures) and runtime rejection.

**Requirements:** R1, R2, R11

**Dependencies:** Phase 3 Unit 1 (`ALLOWED_PAGE_METHODS` and
`DISALLOWED_PAGE_METHODS` typed constants exported from
`scripts/playtest/lib/types.ts`).

**Files:**
- Create: `scripts/playtest/lib/seat-page-wrapper.ts`.
- Create: `scripts/playtest/lib/seat-page-wrapper.test.ts`.

**Approach:**
- Import `ALLOWED_PAGE_METHODS` (tuple of string literals) from Phase 3's
  `types.ts`. Derive the wrapper's public type at compile time:
  ```ts
  type AllowedMethod = typeof ALLOWED_PAGE_METHODS[number]
  type SeatPage = Pick<Page, AllowedMethod>
  class SeatPageWrapper {
    // exposes only AllowedMethod keys, each binding-delegated to the
    // wrapped Page; bound methods close over `this` to prevent rebind
    // escapes.
  }
  ```
- Constructor takes the raw Playwright `Page`; copies each allowed
  method onto `this` as a bound reference; stores the raw page privately
  (no exposed accessor).
- **Runtime prototype-chain invariant (D14):** on construction, walk
  `Object.getOwnPropertyNames` on `this`, `Object.getPrototypeOf(this)`,
  and their prototype chain up to `Object.prototype`; assert no
  disallowed name is reachable. If any is, throw a loud error naming
  the offending method + the prototype it leaked from. This catches
  accidental inheritance-from-Page mistakes (which would otherwise
  create silent holes).
- **Allowlist drift regression:** the test file imports the same
  `ALLOWED_PAGE_METHODS` and `DISALLOWED_PAGE_METHODS` constants from
  `types.ts`; if either changes, the wrapper's compile-type and runtime
  assertions both update automatically.
- No exposed escape hatch. The raw `Page` is inaccessible post-construction.
  Attempting to reflectively grab it (e.g. via `Object.values`) returns
  only the bound allowed methods, not the closed-over `page` reference.

**Patterns to follow:**
- TypeScript literal-tuple + `typeof [number]` narrowing pattern used in
  `src/shared/card-defs.ts`.
- Proxy-based enforcement pattern documented in internal research (no
  specific repo reference — standard JS pattern).

**Test scenarios:**
- Happy path: wrapper exposes every `ALLOWED_PAGE_METHODS` entry and
  each is callable, delegating to the wrapped Page.
- Compile-time fixture: accessing `wrapper.evaluate` produces a
  TypeScript error (`// @ts-expect-error` assertion).
- Runtime rejection: `(wrapper as any).evaluate` → wrapper has no
  such property; accessing via bracket notation returns `undefined`.
- Runtime rejection: attempting to call a disallowed method via
  prototype-chain tricks (`Reflect.get(Object.getPrototypeOf(wrapper),
  'evaluate')`) fails the invariant (method not reachable).
- Regression: wrapper construction with a mocked `Page` where
  `Object.getPrototypeOf(page)` includes a disallowed method (by
  mistake) → throws loudly on construction.
- Drift detection: if the test fixture adds a method to
  `DISALLOWED_PAGE_METHODS` not yet covered, the wrapper still refuses
  it (whole-list invariant, not per-method case).
- Isolation: two wrappers on two different raw `Page` instances do not
  share state; methods on one do not affect the other.

**Verification:**
- All runtime and compile-time tests pass.
- `pnpm typecheck` catches any future drift between the wrapper and
  Phase 3's `types.ts` constants.
- Unit 5 smoke exercises the wrapper end-to-end against a real
  Playwright `Page`.

## System-Wide Impact

- **Interaction graph:** New subagent spawns from orchestrator. Subagents
  call Playwright MCP tools (through `SeatPageWrapper` per R11) + scoped
  Write. Main orchestrator process does not intercept subagent tool calls
  (Claude's Agent tool semantics); the wrapper does the Page-surface
  enforcement.
- **Error propagation:** Subagent crash → Promise rejects → session
  result records the failure per seat, continues with remaining seats.
  Wrapper-invariant failure at construction → throws before agent spawn,
  fails fast (not after the agent is running blind).
- **State lifecycle risks:** Subagent write collisions on log files are
  prevented by single-writer-per-path convention. No append-lock needed;
  Write tool is synchronous within the subagent's turn.
- **API surface parity:** Log + suspicion schema (four `entryType`
  values per D5) is a contract with Phase 5 triage. If the schema
  changes, Phase 5 updates in lockstep. `info-gap-divergence` role-label
  union is shared with Phase 3's `ROW_DISPLAY_LABELS`; Phase 3 Unit 10's
  regression test catches drift from either side.
- **Integration coverage:** Unit 5 smoke exercises both scripted and
  free-play paths end-to-end plus the wrapper enforcement layer.
- **Unchanged invariants:** Game protocol, server behavior, Phase 2 + 3
  code untouched. The orchestrator's pre-agent setup and post-agent audit
  are the only new surfaces on the Phase 3 side. Phase 4 owns the
  wrapper + two-template prompt + four-entryType schema.

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Subagent ignores prompt constraints and tries disallowed tools | Agent tool rejects unknown tool names; disallowed MCP tool names are not mapped (Layer 1). `SeatPageWrapper` refuses disallowed methods at runtime (Layer 2, R11). Post-session audit catches any artifacts. |
| Agent discovers `browser_evaluate` via MCP server exposure | Orchestrator's MCP launch disables `browser_evaluate` + `browser_run_code` via server config. Wrapper also refuses `evaluate` on the Playwright `Page`. Audit check 5 from Phase 3 self-test verifies allowlist constant; Unit 6 contract tests verify wrapper refusal. |
| Catalog injection balloons prompt context (scripted mode) | Unit 2's `renderScriptedCatalog` emits compact per-scenario rows + the 7×2 info-gap + vibe-check prose; calibration (Phase 6) measures and tunes. Free-play mode's pointer is a 1-liner. |
| Agent produces malformed YAML → log-schema parser sees errors | Unit 3's parser logs errors but doesn't abort; partial data still useful. Prompt emphasizes exact format. Four `entryType` variants validated with discriminated Zod. |
| Spectator mode bleeds into "still playing" — agent tries to act after elimination | Prompt exit conditions explicit; agent checks phone UI for "you're eliminated" before each action; role label flips to `'SPECTATOR (eliminated, connected)'` for log vocabulary. |
| Agent self-report drift (claims SCN-X fired when it didn't) | Orchestrator's detector (Phase 3 Unit 9) cross-checks god-event log. Divergence is itself a finding per PRD §9.4. |
| Agent mis-applies role label when logging info-gap-divergence | Zod schema constrains `myRoleLabel` to the `ROW_DISPLAY_LABELS` literal-string union (Unit 3). Any drift from phase-1 D5 prose is a parse error, not silent acceptance. |
| Vibe-check becomes boilerplate `feltLikeArcher: yes` noise | Prompt emphasizes 1-3 sentences of prose rationale; Phase 5 triage filters for prose-rich entries. Calibration (Phase 6) retunes if boilerplate emerges. |
| Mode-switch respawn confuses an agent mid-game | Orchestrator tags teardown/respawn as `reason: 'orchestrator-driven'` (phase-3 C8); both prompts explicitly tell agents not to flag these. |
| `ROW_DISPLAY_LABELS` drift between phase-1 / phase-3 / phase-4 | Phase 3 Unit 10's regression test asserts the constant equals phase-1 D5 prose; Phase 4 Unit 3 imports the same constant for Zod; Phase 4 Unit 1 prompt templates grep-regression-test the labels. Three independent check sites. |
| Free-play produces only suspicions, no fires — detector sees zero coverage for free-play segments | Expected by phase-1 Unit 5 Part G design: free-play scenarios carry `events: []` / `shape: contains`. Phase 3's coverage reporter accounts for this in the free-play accounting row; fires are not expected in free-play segments. |

## Documentation / Operational Notes

- `scripts/playtest/README.md` adds a "Seat agents" section covering
  both prompt templates (scripted + free-play), the two-layer tool
  allowlist (MCP + wrapper), the four-entryType log schema, the 7-row
  info-gap vocabulary, and how to modify the prompts between sessions.
- Keep `seat-scripted.md` + `seat-free-play.md` under version control;
  changes to either affect session reproducibility and should be
  recorded in `session.md` (via the harness git SHA already captured
  at start).
- `SeatPageWrapper` is the enforcement layer for phase-3 D5's allowlist.
  Any new allowed/disallowed method lands in phase-3 `types.ts` first
  (single source of truth); the wrapper picks it up automatically via
  the typed-constant import. Do NOT hand-roll a parallel list in
  Phase 4.

## Sources & References

- **Origin:** [docs/testing/PLAYTEST-HARNESS-PRD.md](../../testing/PLAYTEST-HARNESS-PRD.md)
- **Parent roadmap:** [docs/plans/playtest-harness/roadmap.md](./roadmap.md)
- **Phase 1 catalog shape:** [docs/plans/playtest-harness/phase-1-scenarios.md](./phase-1-scenarios.md)
  - D1 `vibe-check:` field (R9 source)
  - D5 7-row × 2-column info-gap with literal row labels (R8 source)
  - Unit 5 Part G free-play class (R10 source)
- **Phase 3 contract sources:**
  [docs/plans/playtest-harness/phase-3-harness-infra.md](./phase-3-harness-infra.md)
  - Unit 1 `SeatHandle`, `Viewport`, `FreePlayBudget`, `ROW_DISPLAY_LABELS`
    types (character-for-character mirror)
  - D5 tool allowlist contract (R11 source; `ALLOWED_PAGE_METHODS` /
    `DISALLOWED_PAGE_METHODS` constants)
  - D11 viewport cycling (orchestrator-owned, not seat-agent-owned)
  - D12 free-play wallclock budget (default 20%)
  - C8 `ConnectionEvent.reason: 'natural' | 'orchestrator-driven'`
- **Phone UI source:** `src/client/player/`
- **Join flow precedent:** `tests/e2e/helpers.ts:35-38`
- **Hostile-framing learning:** `docs/insights/008-adversarial-swarm-review-maximum-overdrive.md`
- **God-mode-escape hazard:** `docs/plans/_archive/engine-build/phase-6-hardening-deploy.md:553-584`
- **Product-spec acceptance gate:** `docs/PRODUCT-SPECIFICATION.md` §8.7
  (Archer acceptance test — source for vibe-check equal weighting)
