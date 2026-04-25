---
title: "Deferring a plan's PREFERRED option for an easier one ships an architectural mismatch that surfaces at integration, not at planning"
date: 2026-04-25
phase: playtest-harness Phase 6 Unit 2.5
modules: [.claude/agents/playtest-seat.md, .mcp.json, scripts/playtest/lib/agent-launcher.ts, scripts/playtest/lib/orchestrator.ts]
tags: [architecture, planning, agent-isolation, mcp-topology, options-A-vs-B, integration-time-discovery, claude-code-subagents]
---

## Problem

Phase 4 of the playtest-harness plan (D15) explicitly considered two
architectures for seat-agent browser isolation:

- **Option A (PREFERRED, per the plan):** one `@playwright/mcp` server
  per seat. Each `playtest-seat-N` subagent's frontmatter whitelists
  only its own `mcp__playwright-seat-N__*` tools — cross-seat tool
  calls are structurally impossible because the subagent's MCP client
  doesn't even *see* the other servers.
- **Option B (chosen for Phase 4):** one shared `playwright` MCP
  server. Cheaper to wire (no `.mcp.json` topology, one agent file
  instead of N). Isolation hand-waved as "the orchestrator owns
  navigation; subagents only get reactive tools."

Phase 4 shipped Option B with a note that A could come later if needed.
Phase 5 + Phase 6 Units 1, 2, and 4 all built on top of Option B (seat
prompts assumed `mcp__playwright__*`, the launcher's `subagentType`
was the literal `'playtest-seat'`, etc.).

Phase 6 Unit 3 (the first real session) then ran headlong into the
Option B failure mode: parent Claude conversation and ALL spawned
subagents share a single MCP Playwright browser instance. Sequential
subagents inherit the previous subagent's tab state. BURNED is a
**concurrent-reactions** game (10s Nope window, Favor responses, mid-
turn steals); N concurrent subagents cannot share one browser tab
without race-clobbering each other. The architectural mismatch was
not visible until integration time.

## Root Cause

The plan's Option A was deferred for "expedience." But the cost the
deferral was meant to defer wasn't actually deferred — it was
*hidden* and then surfaced at the worst possible moment, with all of
Phase 4 + 5 + 6 Units 1/2/4 already built atop the wrong substrate.
Unit 2.5 had to:

- Replace `.claude/agents/playtest-seat.md` with 10 generated
  per-seat agent files (`playtest-seat-1.md` through
  `playtest-seat-10.md`).
- Add 10 `playwright-seat-N` MCP server entries to `.mcp.json`.
- Add `--isolated` flag to each (otherwise the second
  `@playwright/mcp` server collides on the shared Chromium profile
  dir, erroring out with "Browser is already in use for `<path>`,
  use --isolated to run multiple instances").
- Change `SeatLaunchSpec.subagentType` from a literal `'playtest-seat'`
  to a template-literal pattern type `\`playtest-seat-${number}\``,
  with a 1-indexed `seatIndex+1` mapping.
- Thread a `{{PLAYER_URL}}` + `{{MCP_NAMESPACE}}` placeholder pair
  through the seat prompt templates (Step 1 navigation moved into
  the seat itself, since the orchestrator no longer has a shared
  browser to pre-navigate).
- Add `skipBrowserLaunch: true` to `RunSessionOptions` so the
  orchestrator stops launching its own Chromium / `createSeat × N`.
- Update agent-launcher tests, phase4-smoke assertions, etc.

Roughly 4-6 hours of code, plus the architectural correction that
all of Phases 4+5 had to live with (legacy `playtest-seat.md` stays
as a doc-only reference until the Unit 6 doc sweep).

A 15-minute validation experiment at the START of Phase 6 Unit 3
empirically confirmed `--isolated` gives each MCP server its own
browser (parent navigates to AAA → subagent navigates to BBB on its
own browser → parent still sees AAA after subagent finishes). That
experiment could have been run during Phase 4 planning. It wasn't.

## Lesson

When a plan documents Options A/B with A "PREFERRED" but you choose B
for expedience, the **deferred cost** is never deferred — it's
banked, with interest, until integration time. By then:

1. Downstream phases have built on B's contracts.
2. Switching to A becomes "fix everything that depends on B" rather
   than "build A".
3. The empirical proof you needed to even *check* whether A was
   feasible could have been a 15-minute experiment at planning time.

If the plan author wrote "PREFERRED," believe them. The justification
for picking the non-preferred option needs to be more than "B is
easier in the moment" — it needs to be a load-bearing reason that
won't dissolve when integration arrives. If you can't articulate one,
build A.

## How to Apply

Before deferring an architecturally-preferred option:

- **Run the smallest possible empirical validation** of A's premise.
  In this case, a 15-minute test of "do two `--isolated` MCP servers
  give independent browsers in this Claude Code install?"
- If the validation works, build A.
- If the validation fails, you've learned the constraint that
  *justifies* picking B — write that into the plan as the load-
  bearing reason, not "we'll come back to A later."
- If you genuinely defer to a later phase, **draw a hard arrow** in
  the plan from the deferral to the phase that closes it, AND make
  sure no downstream phase locks contracts that assume B's substrate.
  Phases 4 + 5 should not have shipped with `subagentType:
  'playtest-seat'` baked in.

## See also

- `docs/plans/playtest-harness/phase-4-seat-agents.md:363-391` —
  Phase 4 D15, the original Options A/B writeup.
- `docs/insights/020-subagent-capability-enforcement-is-frontmatter-not-wrapper.md`
  — companion insight on why frontmatter (not orchestrator wrappers)
  is the enforcement layer for subagent isolation.
