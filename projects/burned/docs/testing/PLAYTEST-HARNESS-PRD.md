# BURNED — Multi-Agent Playtest Harness PRD

**Status:** v0.2 — open questions resolved
**Author:** Claude (drafting), Briggsy (reviewing)
**Created:** 2026-04-23

## 1. Problem

BURNED's bugs cluster in **information asymmetry** — what a player *sees* vs what
the system *knows*. Unit tests and Playwright scripts can't find these, because
the test author always knows everything. The bugs are only visible from inside
a player's limited view.

Example from 2026-04-22: on a Named Steal, the target saw *that* their hand was
being stolen from, but not *which card was named*. The target therefore had no
information to decide whether to burn an Intercept. This wasn't a rule
violation — it was an experience failure that only surfaced when Claude
organically roleplayed as the target seat. That single observation produced a
feature-level fix.

We need a way to produce more observations like that, at scale, from real
player-POV vantage points, systematically — not serendipitously.

## 2. Goal

Build a BURNED-specific harness that spawns N isolated LLM agents, one per
player seat, who drive the real BURNED phone UI via Playwright and play the
game from a strict player's point of view. Agents exercise a curated catalog
of gameplay scenarios, log their experience, flag suspicions, and surface
issues for a pool of triage agents to diagnose.

**Success looks like:** running a playtest session produces a coverage report
(which scenarios fired, in which seats), a batch of issue files (real player-POV
findings with diagnosis and proposed fix paths), and zero incidents of agents
peeking at information they shouldn't have.

## 3. Non-goals

- **Not a reusable framework.** BURNED-specific scenarios, BURNED UI selectors,
  BURNED protocol. Port later if the portfolio expands.
- **Not a strategy engine.** Agents don't need to play to win. They need to
  play to *cover scenarios*.
- **Not a replacement for Playwright E2E tests.** The existing 15-test suite
  stays. This is a complementary discovery tool, not a regression gate.
- **Not a CI gate.** Sessions are slow, LLM-driven, and expensive. Run on
  demand, not per commit.

## 4. Principles (non-negotiable)

### 4.1 Isolation is sacred

Each seat agent is spawned in its own subagent context with no shared memory,
no meta-channel, no access to other agents' logs. The *only* information an
agent receives about the game state is what its own phone screen shows through
Playwright's accessibility tree. If two agents need to coordinate, they do so
only via channels the game itself exposes (e.g. the in-game comms ticker).

**Rationale:** The Intercept bug was visible *because* the target lacked info.
Any cross-talk — even well-intentioned coordination — reconstructs the
god's-eye-view and makes asymmetry bugs invisible.

### 4.2 Player POV enforcement

Seat agents have a strictly scoped tool allowlist:
- Playwright (scoped to their own phone URL)
- Write access only to their own run log and suspicion log
- **No** Read access to server code, protocol, or other seats' screens
- **No** access to the god-mode event log

Any tool call outside this allowlist is a harness bug, not an agent choice.

### 4.3 Scenario catalog before harness

We write the scenario matrix first, as its own artifact. No agent code is built
until the catalog is reviewed and locked. A harness without a catalog is agents
wandering randomly; a catalog without a harness is still useful as a manual
checklist.

### 4.4 Suspicion is first-class

Agents log two kinds of signals with equal weight:
- **Scenario fires** — "I triggered SCN-014 Named Steal on empty hand."
- **Suspicions** — "The turn ended and I don't understand why." "I expected to
  see X, I saw Y." "This felt unfair."

The second class is where the best findings live. Agents are instructed to log
suspicions aggressively, even when they can't articulate a rule violation.

### 4.5 Real-time is broken for LLMs — stretch it

BURNED's reactive windows (Nope, Intercept) are seconds. LLM decision latency
is 10-30s. The server must support a **playtest mode** that either stretches
reactive windows to minutes or pauses the turn clock while any seat is
"thinking." Without this, agents miss every Nope window and we get false "I
didn't react" signals. This is a real code change in the server, not a harness
feature.

### 4.6 Reproducibility

Server RNG must be seedable in playtest mode. A recorded seed + scenario log
must allow a re-run to reproduce the exact sequence of cards, draws, and
outcomes. Production code continues to use CSPRNG; playtest mode overrides.

## 5. Actors

| Actor | Role |
|-------|------|
| **Orchestrator (Claude)** | Boots the harness, spawns seat + triage agents, maintains coverage matrix, presents findings. |
| **Seat agent** | One per player, 2-10 per session. Plays from player POV, logs experience + suspicions. Cannot see outside its seat. |
| **Triage agent** | Spawned per issue. Reads the relevant seat logs + god-mode event log + code. Produces diagnosis + proposed fix paths. Does not implement fixes. |
| **Briggsy (reviewer)** | Reviews coverage reports and triaged issues. Approves which fixes to build. |

## 6. Functional requirements

### 6.1 Scenario catalog (`docs/testing/playtest/SCENARIOS.md`)

A matrix document enumerating every playable scenario worth observing, keyed
by stable ID (`SCN-001`, etc.). Each entry:
- **ID**
- **Title**
- **Trigger conditions** (card played, target state, hand state, deck state)
- **Why it matters** (what bug class this surfaces)
- **How an agent recognises they hit it**

Coverage target: every card type × every response state × meaningful deck/hand
edge cases. Estimated 60-100 scenarios for Full Party Pack.

### 6.2 Harness startup

One command boots:
- BURNED server in playtest mode (stretched timings + seed override + god-mode
  event sink enabled)
- N phone browser contexts (one per seat), each with its own Playwright page
- N seat agents, each pointed at its own page + seat log + scenario catalog
- Run directory with a fixed layout (see 6.5)

### 6.3 Seat agent behavior

Each seat agent runs a loop:
1. Observe phone screen.
2. If it's my turn and I have a scenario opportunity, take the action that
   fires the scenario. Log the fire (ID + action + before/after observation).
3. If a reactive window opens (Nope, Intercept, Favor response), decide based
   on my visible hand and log what I saw vs wished I had seen.
4. Log suspicions aggressively.
5. Continue until I'm eliminated or the game ends.

### 6.4 Triage agent behavior

Triggered per open issue. Given: seat logs referencing the issue, god-mode
event log, read access to code. Produces, in the same issue file:
- **Diagnosis** — root cause
- **Proposed fix path(s)** — 1-3 options with tradeoffs
- **No code changes**

### 6.5 Run directory layout

```
docs/testing/playtest/runs/YYYY-MM-DD-HHMM-<seat-count>p/
  session.md              ← summary, seed, config, coverage table
  seats/
    seat-1.log.md
    seat-2.log.md
    ...
  suspicions/
    seat-1.suspicions.md
    ...
  server/
    events.jsonl          ← god-mode log, ONLY triage reads this
  issues/
    001-<slug>.md
    002-<slug>.md
    ...
  coverage.md             ← which SCN-IDs fired, in which seats
```

### 6.6 Issue file format

Harmonize with `E2E-ISSUE-LIST.md` voice. Each file:
- Title, severity (P0/P1/P2), source seats, linked scenario IDs
- Player-POV summary (what the seat agent saw)
- God-mode reality (what actually happened server-side)
- Diagnosis (triage agent)
- Proposed fix paths (triage agent)
- Status: 🔴 OPEN → 🟡 TRIAGED → ⏸ BLOCKED (awaiting Briggsy) → 🟢 FIXED

### 6.7 Coverage report

At session end, orchestrator produces `coverage.md`:
- Table of all catalog scenarios × fired/not-fired × which seats fired them
- Scenarios fired once, scenarios fired many times, scenarios not fired
- Surfaces gaps to inform the next session's configuration

## 7. Non-functional requirements

- **Isolation enforcement must be testable.** Before running a real session,
  the harness has a self-test mode that verifies seat agents cannot read outside
  their allowlist.
- **Playtest mode must be opt-in.** No production code path can accidentally
  boot with stretched timings or seedable RNG. Guarded by an env flag that is
  *never* set in prod builds.
- **God-mode sink is opt-in.** Writes to `server/events.jsonl` only when
  playtest mode is active. Production server never writes this.
- **Session determinism.** Given the same seed + same seat agent prompts + same
  scenario catalog, re-runs produce the same *game state* evolution (agent
  *decisions* may vary because LLMs, but the deck/RNG is fixed).

## 8. Success criteria

A playtest session is successful if:

1. **No isolation breaches.** Seat agents never read tool outputs they
   shouldn't have access to. Verified by orchestrator audit of subagent tool
   calls.
2. **Meaningful coverage.** ≥50 distinct catalog scenarios fired across the
   session series (absolute count, not a percentage — revised 2026-04-23
   after catalog cap was lifted; percentage against an uncapped catalog is
   a moving target). Of those, at least 5 must be axis-11 (information-
   visibility) scenarios, since axis-11 is the class the harness is
   uniquely positioned to surface.
3. **Real findings.** At least one issue file is produced that a human reviewer
   would classify as a genuine player-experience problem — not a rule violation
   caught by existing tests, but an *asymmetry or clarity bug*.
4. **Reproducible re-run.** Any issue with a recorded seed can be reproduced on
   demand.
5. **Zero false "done."** No agent claims a scenario fired without log evidence
   of the corresponding game event.

## 9. Resolved decisions

Answers to the original open questions, locked 2026-04-23 with Briggsy:

1. **Seat count strategy — variety.** Run sessions at multiple player counts
   (minimum 2, 3, 5, 8, 10). Different counts gate different scenarios;
   coverage is only complete when the full range has been exercised.
2. **God-mode log transport — WS god-event channel, orchestrator writes
   file.** Cloudflare Workers have no filesystem, so the server cannot write
   `events.jsonl` itself. In playtest mode the server broadcasts a
   `god-event` WebSocket message after every successful `dispatch`, carrying
   `{action, events, stateVersion, nowMs}`. The orchestrator maintains a
   dedicated god-mode WS subscription (one per run) and appends each message
   to `events.jsonl` in the run directory. Triage agents read the file. The
   server-side broadcast is gated by the playtest-mode env flag; production
   never sends these messages.
3. **Agent elimination — spectator mode ON, re-evaluate.** Eliminated seat
   agents stay alive as spectators and keep logging what their (now-inactive)
   phone screen shows plus any visible board-level state they can read.
   **Re-evaluation trigger:** after two full sessions, review spectator logs
   and decide whether they produced any signal. If not, switch to release-on-
   elimination.
4. **Scenario-fire detection — both (self-report + post-hoc).** Agents
   self-report when they believe they fired a scenario. Orchestrator
   post-processes `events.jsonl` against the catalog to independently mark
   fires. Divergence between the two is its own finding ("agent thought they
   fired X but server disagreed" is a player-clarity bug by definition). See
   §6.7 for how this feeds the coverage report.
5. **Cost / time budget — deferred.** Run at natural pace first. Revisit if
   wallclock or token cost becomes the limiting factor.
6. **Triage concurrency — unbounded pool.** One triage agent per open issue,
   spawned concurrently. If we hit practical limits (rate caps, context
   contention) we'll add a pool cap at that point, not pre-emptively.
7. **Issue harmonization — separate tracker, promote on review.** Playtest
   issues live in `docs/testing/playtest/runs/*/issues/` as raw discovery
   output. After Briggsy reviews a session, P0/P1 findings are promoted into
   `E2E-ISSUE-LIST.md` with a back-reference to their source run. P2 findings
   stay in the run directory unless/until promoted.

## 10. Remaining unknowns

These will be resolved during the plan phase, not here:

- Exact shape of the playtest-mode server hooks (env flag, config loader,
  where the seedable RNG wrapper lives).
- Whether seat agents run as Claude Code subagents (Agent tool) or as a
  separate process pool invoked by the orchestrator.
- Browser context strategy (one shared browser with N pages vs N independent
  contexts vs N independent browsers).

## 11. Out of scope (explicit)

- Agents that *win*. They play to cover, not to win.
- Cross-session memory. Each seat agent starts fresh; learning between sessions
  happens only via updates to the scenario catalog and agent prompts.
- Multi-agent cooperation mechanics. Rule 4.1.
- Generalizing to other games. Rule §3.
