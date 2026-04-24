---
title: "Multi-Agent Playtest Harness — Roadmap"
type: feat
parent: docs/testing/PLAYTEST-HARNESS-PRD.md
date: 2026-04-23
status: draft
phases:
  - phase-1-scenarios.md
  - phase-2-playtest-mode.md
  - phase-3-harness-infra.md
  - phase-4-seat-agents.md
  - phase-5-triage-agents.md
  - phase-6-calibration-and-first-session.md
---

# Multi-Agent Playtest Harness — Roadmap

> *Parent document for the harness build. Inherits every constraint from
> `docs/testing/PLAYTEST-HARNESS-PRD.md`. When a phase file disagrees with the
> roadmap, the roadmap wins unless the roadmap is demonstrably wrong — in
> which case we update the roadmap.*

**Mission.** Build a BURNED-specific multi-agent playtest harness that
systematically surfaces the information-asymmetry and player-experience bugs
that unit tests and scripted Playwright suites cannot see. Success is measured
by one thing: the harness produces real, diagnosed issues that a human
reviewer classifies as player-experience problems — the same class of bug as
the 2026-04-22 Intercept-no-info finding, reproduced at scale.

---

## §1 — Why this exists

See PRD §1 (*Problem*) and §2 (*Goal*). In one line: the best BURNED bug so
far was found organically by Claude roleplaying a seat. This is the
systematic version of that accident.

## §2 — Quality bar

Inherited transitively from the PRD:

- **Isolation is sacred** (PRD §4.1) — no cross-agent leakage. Any breach
  invalidates the session.
- **Player POV is enforced by allowlist** (PRD §4.2) — tool scope, not agent
  self-discipline.
- **Catalog before harness** (PRD §4.3) — the scenario matrix is built and
  locked before any harness code exists.
- **Suspicion is first-class** (PRD §4.4) — "this felt off" logs carry equal
  weight to scenario fires.
- **Real-time is stretched** (PRD §4.5) — reactive windows are server-level
  configurable in playtest mode.
- **Reproducibility** (PRD §4.6) — seedable RNG, deterministic re-runs.

Every phase below must pass every principle above to exit. A phase that
violates PRD §4 does not ship, regardless of how "done" it looks.

## §3 — Phase breakdown

| # | Phase | Produces | Touches |
|---|-------|----------|---------|
| 1 | **Scenarios catalog** | `docs/testing/playtest/SCENARIOS.md` — the locked matrix. | Docs only. Zero code. |
| 2 | **Playtest-mode server hooks** | Env-flag-guarded server mode with stretched Nope window via `DispatchContext`, seedable RNG reusing the existing `ctx.random` seam, god-event WS broadcast after every successful dispatch (orchestrator writes `events.jsonl`, server does not touch filesystem). | `src/server/` — room.ts (flag read, WS broadcast, seeded ctx), `src/server/game/engine.ts` + `types.ts` (nopeWindowMs on ctx). New env flag in `wrangler.jsonc`. Regression test that prod bundle contains no playtest sentinel. |
| 3 | **Harness infrastructure** | Spawn script, browser context strategy, orchestrator skeleton, run directory scaffolding, isolation self-test. | `scripts/playtest/` (new folder). |
| 4 | **Seat agent system** | Seat agent system prompt, tool allowlist, `seat-N.log.md` + `seat-N.suspicions.md` formats, scenario-fire reporting protocol. | `scripts/playtest/agents/seat.md` (prompt), `scripts/playtest/schemas/` (formats). |
| 5 | **Triage agent system** | Triage agent prompt, inputs (seat logs + events.jsonl + code read), output format (diagnosis + proposed fix paths), concurrency model. | `scripts/playtest/agents/triage.md` (prompt), issue file schema. |
| 6 | **Calibration + first real session** | One dry-run session at low player count to verify isolation + pipeline, then one full session producing a coverage report + triaged issues. | Run artifacts under `docs/testing/playtest/runs/`. |

## §4 — Dependencies

```
phase-1 (catalog)
   │
   ├── blocks ──▶ phase-4 (seat agents consume catalog)
   └── blocks ──▶ phase-5 (triage agents consume catalog)

phase-2 (server mode)
   │
   └── blocks ──▶ phase-3 (harness needs to boot server with playtest flag)

phase-3 (harness)
   │
   ├── blocks ──▶ phase-4 (seat agents run inside harness)
   └── blocks ──▶ phase-5 (triage agents run after harness produces outputs)

phase-4 (seats) + phase-5 (triage)
   │
   └── blocks ──▶ phase-6 (calibration + first session)
```

Phases 1 and 2 are independent and may be drafted in parallel during planning,
but phase 1 is built first — per PRD §4.3, the catalog is the locked artifact
before any code.

## §5 — Non-goals (roadmap scope)

- No CI integration. Sessions are on-demand.
- No cost/perf optimization during initial build. Defer per PRD §9.5.
- No generalization beyond BURNED. Ports are future portfolio work, not
  part of this build.
- No UI for reviewing sessions. Markdown artifacts only. A viewer is a
  future nice-to-have if sessions prove valuable.

## §6 — Success criteria (roadmap level)

Inherited from PRD §8. The roadmap is done when:

1. A first session has run end-to-end.
2. That session produced a coverage report with ≥1 scenario fired per
   configured seat.
3. That session produced ≥1 triaged issue file that a human reviewer would
   classify as a real player-experience bug (not a rule violation caught by
   existing tests).
4. The isolation self-test from phase 3 has passed before the session ran.
5. Zero playtest-mode artifacts leak into production builds (verified by a
   build-time test from phase 2).

## §7 — What happens after

The harness landing is a milestone, not a finish line. Post-build loop:

1. Run sessions on demand, especially after material game-logic changes.
2. Playtest issues triaged → Briggsy promotes P0/P1 into `E2E-ISSUE-LIST.md`.
3. Catalog grows as new card types, mechanics, or edge cases are added.
4. Agent prompts improve as we learn what produces high-signal logs.

The harness is a *living instrument*, tuned across sessions. The plan delivers
v1 of the instrument; tuning is continuous work after that.
