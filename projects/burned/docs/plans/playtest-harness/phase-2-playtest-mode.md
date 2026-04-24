---
title: "Playtest Harness — Phase 2: Playtest-Mode Server Hooks"
type: feat
status: locked
date: 2026-04-23
deepened: 2026-04-23
locked: 2026-04-23
locked_engine_sha: e6b31b5c
locked_projection_sha: 5e86f811
locked_room_sha: e6b31b5c
parent: docs/plans/playtest-harness/roadmap.md
origin: docs/testing/PLAYTEST-HARNESS-PRD.md
---

# Phase 2 — Playtest-Mode Server Hooks

## Overview

Add an env-flag-guarded "playtest mode" to the BURNED server that (1) stretches
the Nope/Intercept reactive window long enough for LLM agents to react, (2)
makes the RNG seedable for reproducibility, and (3) broadcasts a `god-event`
WebSocket message after every successful `dispatch` so an orchestrator can
write `events.jsonl` from outside the Workers sandbox.

The change is guarded so production builds contain no playtest code path or
sentinel string. A regression test on `dist/**/*.js` enforces this.

## Problem Frame

Three separate constraints collide:

1. **Real-time blocks LLM agents.** Nope windows are server-timed at 10s
   (`src/shared/constants.ts:6-10`). LLM decision latency is 10-30s. Agents
   miss every Nope window without stretching.
2. **Non-determinism blocks reproducibility.** Production uses CSPRNG
   (`crypto.getRandomValues` at `src/server/room.ts:840-859`). Without a
   seeded path, re-running a scenario with the same seed is impossible.
3. **Workers have no filesystem.** The PRD's earlier "server writes
   events.jsonl" language is architecturally impossible in a Durable Object.
   Events must flow to the orchestrator, which writes the file.

All three resolve cleanly by reusing seams already in the codebase:
`DispatchContext` for RNG + window duration, the existing serial action queue
for broadcast timing, and the existing WS message envelope for god-event
transport.

## Requirements Trace

- **R1 (PRD §4.5)** — Reactive window is stretched to minutes in playtest
  mode; untouched in production.
- **R2 (PRD §4.6)** — Server RNG is seedable in playtest mode; CSPRNG
  everywhere else.
- **R3 (PRD §9.2, revised)** — Server broadcasts god-event WS messages in
  playtest mode; orchestrator writes `events.jsonl`.
- **R4 (PRD §7 non-functional: "Playtest mode must be opt-in; never boots
  accidentally in prod")** — env-flag gated with prod-bundle regression test.
- **R5 (PRD §4.6 reproducibility)** — Given same seed + same actions, deck
  evolution is identical re-run to re-run.

## Scope Boundaries

- **In scope:** Nope window duration override via `DispatchContext`,
  seedable RNG via `DispatchContext.random` (reusing the existing seam),
  god-event WS broadcast, playtest-mode env flag wiring in `wrangler.jsonc`
  and the `Env` interface, prod-bundle sentinel regression test.
- **Out of scope:** Stretching prompt timeouts — per learnings research,
  BURNED removed server prompt timeouts as deliberate product policy. Only
  the Nope window has a server-side timer worth stretching.
- **Out of scope:** Orchestrator-side file writing (that is Phase 3).
- **Out of scope:** Agent behavior (Phase 4).

### Deferred to Separate Tasks

- **Room-nuke timeout stretching (15-minute `INACTIVITY_TIMEOUT_MS`, 30-min
  `IDLE_ROOM_TIMEOUT_MS`):** defer until a session actually bumps against
  them. If sessions run under 15 min wallclock, no change needed.

## Context & Research

### Relevant Code and Patterns

- **RNG seam (reuse):** `src/server/room.ts:840-859` `makeDispatchContext()`
  builds `ctx.random` / `ctx.randomInt` from `crypto.getRandomValues`. The
  engine calls it via `ctx.random()` — pure seam, nothing else to invent.
- **Seedable RNG template:** `src/server/game/engine.test.ts:9-22` already
  defines a deterministic `makeCtx(seed)` using a linear-congruential
  generator for unit tests. Lift this pattern (or `mulberry32` per the
  phase-6-hardening-deploy plan line 592) into a playtest-mode path.
- **Phase-6 hardening plan precedent:** `docs/plans/_archive/engine-build/phase-6-hardening-deploy.md`
  lines 586-592 already names `TEST_TIMEOUT_SCALE` env var and `devSeed`
  query-param conventions. Align.
- **Nope window duration source:** `src/server/game/engine.ts:1301-1329`
  `createNopeWindow` + `getNopeWindowDuration(alivePlayerCount)`. Reads
  `NOPE_WINDOW_MS` from `src/shared/constants.ts:6-10`. The engine embeds
  `deadlineMs = ctx.now + duration` into `NopeWindow` — stretched duration
  propagates via projection (`src/server/projection.ts:142-147`) without
  client changes.
- **Timer scheduler:** `src/server/room.ts:686-706` `scheduleNopeExpiry`
  reads `deadlineMs` from state and sets `setTimeout`. Hibernation restore
  re-schedules correctly (`room.ts:121-146`). No change here — consumer
  handles stretched durations transparently.
- **Dispatch + broadcast seam:** `src/server/room.ts:615-627`
  (`handleAction`) and `:631-666` (`dispatchServerAction`) both call
  `broadcastGameState()` at `:755-795` after a successful dispatch. That
  single broadcast function already computes `boardView` once via
  `projectForBoard(state, now, connectedPlayerIds)` at `:762` and then
  per-player `projectForPlayer(state, playerId, boardView)` at `:782`.
  **The god-event emission must be added to `broadcastGameState` itself,
  NOT to the dispatch sites** — emitting at the dispatch site would
  re-sample `Date.now()` + `getConnectedPlayerIds()` and the god-event's
  `projections[V]` would not structurally equal viewer V's concurrent
  `player-update.payload.state`. Dispatch sites set a transient
  `pendingGodEventTrigger` (action + events + stateVersion + nowMs) and
  `broadcastGameState` reads + clears it. See D4 + Unit 6.
- **Env-var convention:** no server env vars exist today. Wrangler binds
  vars via `wrangler.jsonc` `vars` block and they arrive on the `Env`
  interface (`room.ts:934-936`). Worker runtime, not `process.env`.
- **Constants landmine:** `src/shared/constants.ts` is in `src/shared/`.
  Per CLAUDE.md, `src/shared/` is zero-runtime-dep, pure types + constants.
  Any env-reading code stays in `src/server/`. The override path is a
  server-side reader that injects into `DispatchContext`; `shared/constants.ts`
  remains untouched as the default.
- **Room exports landmine:** `src/server/room.ts` may ONLY export `GameRoom`
  (per memory `project-burned-workers-entry-no-exports.md`). Any helper like
  `readPlaytestFlag()` goes in a new file `src/server/playtest.ts` or into
  `src/server/validation.ts` (which already mirrors constants for this
  reason).

### Institutional Learnings

- `docs/insights/005-stale-timers-need-generation-counters.md` — any timer
  reset path must increment a generation counter and reject stale callbacks.
  `NopeWindow.generation` already exists. Stretching the window is a new
  duration, NOT a reset, so the existing generation contract holds. But if
  we ever add a "pause window while any agent is thinking" it MUST increment
  generation on every pause/unpause.
- `docs/plans/_archive/engine-build/phase-6-hardening-deploy.md:553-592` — `TEST_TIMEOUT_SCALE`
  env convention + `devSeed` query-param + DCE-grep regression test. Reuse
  names where aligned.
- E-03 in `docs/testing/E2E-ISSUE-LIST.md` — prod-bundle sentinel regression
  test (greps `dist/**/*.js` for `__gameStore`). Mirror this for playtest.

### External References

None — entirely repo-internal patterns.

## Key Technical Decisions

- **D1. Single env flag, single source of truth.** `PLAYTEST_MODE=1` on the
  Workers `Env`. Read once per room lifecycle, cached on the `GameRoom`
  instance. If the flag is unset or `'0'`, zero branches execute — the
  guarded paths are effectively dead code that Vite/esbuild can tree-shake
  in theory, though Workers bundling makes runtime branching safer than
  compile-time DCE.
- **D2. Stretch via `DispatchContext`, not via mutating `NOPE_WINDOW_MS`.**
  `src/shared/constants.ts` stays immutable defaults. `DispatchContext`
  gains optional `nopeWindowMs?: number`. `getNopeWindowDuration` reads
  from ctx when present, else from shared constant. Shared constants are
  still the default production source.
- **D3. Seed via `DispatchContext.random`, not a new RNG wrapper.**
  `makeDispatchContext(seed?: number)` — when `seed` is provided (only in
  playtest mode), use `mulberry32(seed)`. Otherwise CSPRNG. Engine already
  consumes `ctx.random`; no engine change required.
- **D4. God-event is a new server→client WS message type, emitted from
  `broadcastGameState` (NOT from the dispatch site).** Payload:
  `{ type: 'god-event', action, events, stateVersion, nowMs, projections:
  Record<playerId, PlayerView>, boardView: BoardView }`. The existing
  `broadcastGameState` at `src/server/room.ts:755-795` already computes the
  `boardView` once via `projectForBoard(state, now, connectedPlayerIds)` at
  line 762 and reuses it to produce each player's `PlayerView` via
  `projectForPlayer(state, playerId, boardView)` at line 782. Emitting the
  god-event in the **same** per-connection loop — with a third `role: 'god'`
  branch — is the only architecture that guarantees
  `god-event.projections[V]` is the exact `PlayerView` that viewer V's
  concurrent `player-update` payload carries. Emitting at the dispatch site
  (`handleAction` line 625, `dispatchServerAction` line 664) would re-sample
  `Date.now()` + `getConnectedPlayerIds()` and duplicate projection work,
  silently breaking structural equality with the broadcast. The dispatch
  sites therefore must pass the triggering `action` + `events` +
  `stateVersion` through to `broadcastGameState` (via a transient instance
  field set pre-broadcast and cleared after — so the non-dispatch callers
  at `room.ts:473, 654, 735-738` that also call `broadcastGameState` simply
  see a null transient and emit no god-event). Phase 1 §System-Wide Impact
  (phase-1-scenarios.md:958-967) declares this contract as R7 and Phase 3's
  scenario-fire detector consumes the per-viewer snapshots to verify
  `projection-assertions:` scenarios. `PlayerView` + `BoardView` types are
  imported from `src/shared/protocol.ts` (lines 127, 99).

  **Split-envelope metadata fields (when per-viewer splitting fires).**
  The unsplit envelope above is complete on its own — `projections` already
  keys every seated player, so the consumer knows the set by reading
  `Object.keys(projections)`. When the Unit 8 payload budget (~512 KiB at
  N=10) fires and the server falls back to per-viewer splitting per the
  Risks table, EACH split chunk carries an additional field:
  `expectedViewerIds: string[]` — the canonical, authoritative list of
  playerIds the server expects to ship projections for across the full
  set of chunks keyed by this `stateVersion`. All chunks for a given
  `stateVersion` carry the SAME `expectedViewerIds` array (redundantly,
  so any first-arrived chunk is authoritative — consumers do not need
  to wait for a designated header chunk). The consumer's reassembly
  buffer is complete when `Object.keys(mergedProjections)` equals
  `expectedViewerIds` as a set. `expectedViewerIds` is derived by the
  emitter from `Object.keys(projections)` of the full (pre-split)
  projections map — i.e. every SEATED player (including eliminated-but-
  seated spectators and disconnected seats), matching phase-2 D4's
  "iterate `state.players`, not `state.players.filter(isAlive)`" rule
  in Unit 6a. `expectedViewerIds` is required on split envelopes and
  omitted (or redundantly included) on the unsplit envelope — the
  consumer (Phase 3 Unit 4) treats `expectedViewerIds.length === 0 ||
  undefined` as "no splitting expected, consume in one shot." Consumers
  MUST NOT infer completion from naive counting or from observed
  `projections` sizes across chunks, because if the set of seated
  players changed mid-reassembly the observed count would lie. The
  field is an internal contract between Unit 6's split emitter and
  Phase 3 Unit 4's reassembly buffer; it is NOT part of the public
  player/host protocol and does not flow to any non-god connection.
- **D5. God-role is a new connection role, gated by `PLAYTEST_MODE` + an
  auth token.** Connection query-param `role=god&token=<value>`. Server
  rejects `role=god` when `PLAYTEST_MODE` is unset or token mismatches.
  Token is a Workers secret in playtest deployments. Playtest-mode local
  dev reads the token from the same env. Non-god roles never receive
  god-events.
- **D6. Seed is set once per room, via a `PlaytestConfig` admin message.**
  Orchestrator sends `{ type: 'playtest-config', seed, nopeWindowMs }`
  over the god connection before the game starts. Server stores it on the
  `GameRoom` instance; `makeDispatchContext` reads from there. Rejected
  if playtest flag is off or game has already started.
- **D7. Regression test on prod bundle.** Like E-03: grep `dist/**/*.js`
  for sentinel strings (`'god-event'`, `'playtest-config'`). Fail build if
  any appear — means tree-shake leaked. Use `dead_code: true` in bundle
  config + explicit `if (!isPlaytest) return;` guards to help DCE.
- **D8. Nope window stretched value is a multiplier, not a replacement.**
  Orchestrator sends `nopeWindowMs` as explicit value (e.g. 300_000 = 5 min)
  per session, not a scale factor. Simpler. `TEST_TIMEOUT_SCALE` (phase-6)
  is for timeout-scale semantics across many timers — we only have one
  timer to stretch.

## Open Questions

### Resolved During Planning

- **Why not use `process.env`?** Workers runtime doesn't expose
  `process.env`. `Env` interface via `wrangler.jsonc` is the Workers-native
  path.
- **Why broadcast god-events via WS instead of HTTP endpoint?** WS is
  already in flight, dispatch is already in the WS request cycle, and
  appending a broadcast costs nothing extra. HTTP endpoint would need
  polling or server push — strictly worse.
- **Why not stretch via a multiplicative env var (like phase-6's
  `TEST_TIMEOUT_SCALE`)?** `TEST_TIMEOUT_SCALE` was designed for multiple
  timers. We have one timer (Nope window). Explicit value is simpler and
  makes intent clearer (a session is "Nope window = 5 min" not "timers ×
  30").
- **Why token-gate the god role?** Defense in depth. Env flag guards the
  code path; token guards accidental subscription from a non-orchestrator
  client. Prod builds fail closed on both.

### Deferred to Implementation

- **Exact seed-RNG algorithm.** mulberry32 vs LCG vs xorshift32. All three
  are acceptable; pick mulberry32 to align with phase-6 plan's reference.
  Final selection at code time.
- **God-event batching.** If a single dispatch emits many events, broadcast
  as one message with `events: [...]` array — already the shape of
  `DispatchResult.events`. No per-event spam.
- **Token storage at orchestrator.** Env var file, argv, or config file.
  Settle in Phase 3 (harness plans the orchestrator's config surface).

### Flagged for Phase 3

- **Per-room or time-boxed tokens.** This phase ships ONE global
  `PLAYTEST_TOKEN` Worker secret. A leak unlocks every concurrent playtest
  room. Phase 3 should mint per-room tokens via the orchestrator (token
  known only to the orchestrator + the specific DO for the lifetime of
  that session) OR use time-boxed tokens that rotate. Do NOT solve here —
  the LAN-only origin gate + first-write-wins config are sufficient
  mitigations for the Phase 2 surface.
- **`events.jsonl` retention + scrub.** God-event projections contain full
  `PlayerView` including hand contents. Phase 3 writes these to disk. The
  retention policy (how long, where, redacted or raw, committed or
  gitignored) is Phase 3's contract. This phase flags it as a downstream
  obligation so Phase 3 cannot ship without addressing it.

## High-Level Technical Design

> *Directional guidance for review, not implementation specification. Treat
> signatures and literals as illustrative.*

### Env + config flow

```text
wrangler.jsonc (vars.PLAYTEST_MODE = "1" only in playtest deploys)
    │  CI gate asserts production block does NOT include
    │  PLAYTEST_MODE or PLAYTEST_TOKEN (Documentation / Operational Notes).
    ▼
env.PLAYTEST_MODE + env.PLAYTEST_TOKEN + optional env.PLAYTEST_GOD_ORIGINS
    │
    ▼
GameRoom constructor (or first-connection hook)
    │  reads once, caches: this.isPlaytest: boolean
    │  caches: this.playtestToken = env.PLAYTEST_TOKEN
    │  caches: this.godOriginAllowlist = parse(env.PLAYTEST_GOD_ORIGINS)
    │         ∪ { localhost, 127.0.0.1, RFC1918 ranges }
    │
    ▼
onConnect('role=god&token=<T>'):
    │  1. If !this.isPlaytest         → close 4004 'Playtest mode off'
    │  2. If godAuthFailures over limit → close 4005 'Rate limited'
    │  3. If origin ∉ allowlist       → close 4003 'Forbidden god origin'
    │  4. If !constantTimeEq(token, this.playtestToken)
    │                                  → close 4004 'Token mismatch', bump failures
    │  5. Otherwise → connection.setState({ role: 'god' }); accept
    │                 (hibernation-safe; getConnections() re-derives the set)
    ▼
god connection sends { type: 'playtest-config', seed, nopeWindowMs }
    │  enqueued via this.enqueue() → serial queue ordering vs start-game
    │  first-write-wins:
    │    - if playtestConfigLocked → error PLAYTEST_CONFIG_LOCKED
    │    - elif state.phase !== 'lobby' → error PLAYTEST_CONFIG_TOO_LATE
    │    - else: store + set playtestConfigLocked = true
    ▼
subsequent makeDispatchContext() reads instance config
    │  injects seed → ctx.random = mulberry32(seed)
    │  injects nopeWindowMs → ctx.nopeWindowMs = nopeWindowMs
    ▼
engine.getNopeWindowDuration(ctx, alivePlayerCount)
    │  returns ctx.nopeWindowMs ?? NOPE_WINDOW_MS[tierFor(alivePlayers)]
```

### Dispatch + broadcast-site god-event emission

God-events emit from `broadcastGameState`, NOT from the dispatch site, so
the `projections` map attached to a god-event is produced by the exact same
`projectForPlayer(state, playerId, boardView)` call (with the exact same
`boardView`) that concurrently builds the player-update payloads. This is a
by-construction guarantee — not an asserted invariant — that
`god-event.projections[V]` structurally equals the `player-update.payload.state`
that viewer V's socket receives in the same broadcast pass.

```text
handleAction(msg, connection)                        // room.ts:615-627
  → enqueue(dispatch + side effects)
      │
      ▼
  result = dispatch(this.gameState, engineAction, ctx)
  if (result.ok) {
      this.gameState = result.state
      // Stash dispatch trigger for broadcastGameState to read.
      this.pendingGodEventTrigger = {
          action: engineAction,
          events: result.events,
          stateVersion: result.state.stateVersion,
          nowMs: ctx.now,
      }
      this.updateNopeTimer(result)
      this.broadcastGameState()                      // emits god-event inline
      void this.persistState()
  }

broadcastGameState():                                // room.ts:755-795
  const now = Date.now()
  const state = this.gameState
  const connectedIds = this.getConnectedPlayerIds()
  const boardView = projectForBoard(state, now, connectedIds)         // ONCE
  const boardRaw  = JSON.stringify({ type: 'state-update', payload: boardView, ... })

  // Prepare god-event payload ONCE if this broadcast was triggered by a
  // dispatch AND playtest mode is on. Reuses the same boardView. Iterates
  // state.players (not connected ids) so eliminated-but-seated spectators
  // and disconnected seats are included — consistent with CLAUDE.md
  // "Eliminated players still receive full PlayerView broadcasts."
  let godRaw: string | null = null
  const trigger = this.pendingGodEventTrigger
  this.pendingGodEventTrigger = null                 // clear for idempotency
  if (this.isPlaytest && trigger) {
      const projections: Record<string, PlayerView> = {}
      for (const p of state.players) {
          projections[p.id] = projectForPlayer(state, p.id, boardView)
      }
      const godMsg = {
          type: 'god-event',
          action:        trigger.action,
          events:        trigger.events,
          stateVersion:  trigger.stateVersion,
          nowMs:         trigger.nowMs,
          projections,
          boardView,
      }
      godRaw = JSON.stringify(godMsg)
  }

  for (const conn of this.getConnections()) {
      const connState = this.getConnState(conn)
      try {
          if (connState?.role === 'host') {
              conn.send(boardRaw)
          } else if (connState?.role === 'player') {
              const playerMsg = {
                  type: 'player-update',
                  payload: {
                      state: projectForPlayer(state, connState.playerId, boardView),
                      private: state.phase === 'playing'
                          ? getPrivateData(state, connState.playerId)
                          : {},
                  },
                  ...
              }
              conn.send(JSON.stringify(playerMsg))
          } else if (connState?.role === 'god' && godRaw) {
              conn.send(godRaw)
          }
      } catch { /* per-connection try/catch — one failing socket
                   must NOT abort the rest of the broadcast */ }
  }
```

Non-dispatch callers of `broadcastGameState` (reconnect resync at
`room.ts:473`, the force-clear-nope fallback at `:654`, and the queue
error-recovery fallbacks at `:735-738`) simply see `pendingGodEventTrigger
=== null` and skip god-event emission. `dispatchServerAction` at `:631-666`
populates the trigger exactly like `handleAction`.

### Nope window duration override (pseudo-sketch)

```ts
// engine.ts (directional — actual signatures decided at code time)
function getNopeWindowDuration(ctx: DispatchContext, alive: number): number {
  if (ctx.nopeWindowMs != null) return ctx.nopeWindowMs
  const tier = alive <= 2 ? 0 : alive <= 5 ? 1 : 2
  return NOPE_WINDOW_MS[tier]
}
```

### DispatchContext additions

```ts
// src/server/game/types.ts:91-95 (directional)
interface DispatchContext {
  now: number
  random: () => number
  randomInt: (maxExclusive: number) => number
  nopeWindowMs?: number          // NEW — optional, playtest-only
}
```

## Implementation Units

- [ ] **Unit 1: Define playtest config surface + env wiring**

**Goal:** Add `PLAYTEST_MODE`, `PLAYTEST_TOKEN`, and `PLAYTEST_GOD_ORIGINS`
(optional, comma-separated allowlist — see Unit 4) to the `Env` interface and
`wrangler.jsonc` example values. Introduce a `src/server/playtest.ts` module
that reads and caches the flag/token and exposes `isPlaytestMode(env)` +
`matchesToken(env, token)` + `getGodOriginAllowlist(env): string[]`.

**Execution note:** Test-first. The playtest module is small, pure, and the
unit test gates the entire phase against accidental prod leaks.

**Requirements:** R4

**Dependencies:** None.

**Files:**
- Create: `src/server/playtest.ts`
- Create: `src/server/playtest.test.ts`
- Modify: `src/server/room.ts` — add `PLAYTEST_MODE`, `PLAYTEST_TOKEN`, and
  optional `PLAYTEST_GOD_ORIGINS` to the `Env` interface (around line 934).
- Modify: `wrangler.jsonc` — add commented `vars` example + note that
  playtest deploys override.
- Modify: `.env.example` — document local playtest usage.

**Approach:**
- `isPlaytestMode(env)` returns `env.PLAYTEST_MODE === '1'`. Explicit string
  match, not truthy check.
- `matchesToken(env, provided)` constant-time compare.
- `getGodOriginAllowlist(env)` returns `env.PLAYTEST_GOD_ORIGINS?.split(',').map(s => s.trim()).filter(Boolean) ?? []`. Unit 4's god-connection handler consults this list; an empty list means "LAN + localhost defaults only."
- Never logs token value.
- Exports named functions only; no default export.

**Patterns to follow:**
- `src/server/validation.ts` — constants mirror + named-export style.
- Existing `Env` interface block.

**Test scenarios:**
- Happy path: `PLAYTEST_MODE='1'` → `isPlaytestMode` returns `true`.
- Edge case: `PLAYTEST_MODE` unset / `undefined` → returns `false`.
- Edge case: `PLAYTEST_MODE='0'` / `'true'` / `'false'` → returns `false`
  (only `'1'` is truthy).
- Edge case: `PLAYTEST_TOKEN` unset → `matchesToken(env, anything)` returns
  `false`.
- Edge case: token length mismatch → returns `false` (no early-exit timing
  leak).
- Happy path: exact token match → `true`.
- Happy path: `PLAYTEST_GOD_ORIGINS='https://playtest.internal,http://localhost:8787'` → `getGodOriginAllowlist` returns both entries, whitespace-trimmed.
- Edge case: `PLAYTEST_GOD_ORIGINS` unset → returns `[]` (empty allowlist; Unit 4 falls back to LAN + localhost defaults).

**Verification:**
- All tests pass.
- Typecheck clean.
- `src/server/room.ts:934` `Env` interface declares all three fields (`PLAYTEST_MODE`, `PLAYTEST_TOKEN`, optional `PLAYTEST_GOD_ORIGINS`).

- [ ] **Unit 1b: `/health` readiness endpoint (ships in ALL builds — dev, playtest, prod)**

**Goal:** Add a lightweight `GET /health` route to the Worker that returns
`200` with `{ ok: true, playtest: boolean, version: string }`. Phase 3
Unit 3 (server-controller) polls this as the wrangler+DO readiness probe;
absent this endpoint, polling the bare `/` is fragile (partyserver routing
defaults vary, returns are not guaranteed-200, response timing is coupled
to Durable Object wake instead of just Worker boot).

**Execution note:** Test-first. Tiny, pure, and the readiness probe phase-3
depends on must be guaranteed-stable across env modes. NOT playtest-only —
the endpoint ships in production too because it's safe (no data, no auth-
gated info) and lets external tooling probe Worker liveness without
inventing one later.

**Requirements:** Cross-phase contract for phase-3 Unit 3 readiness
detection. (No new R-row required — supports R3 transport indirectly by
making harness boot deterministic.)

**Dependencies:** Unit 1 (reads `isPlaytestMode(env)` for the
informational `playtest` flag). PROTOCOL_VERSION already exists in
`src/shared/protocol.ts` for the `version` stamp.

**Files:**
- Modify: `src/server/room.ts` — add `/health` interception in the
  default-export `fetch` handler BEFORE partyserver's routing (so the
  route is unambiguous and never collides with a `/parties/...` URL
  that partyserver claims). Per the room-exports landmine, only
  `GameRoom` is exported; the `fetch` handler is the existing default
  export, untouched in shape — only its body gains a route check.
- Create: `src/server/health.test.ts` — tests the response shape +
  status against a stubbed Request.

**Approach:**
- Inside the existing default-export `fetch(request, env, ctx)` handler:
  ```ts
  const url = new URL(request.url)
  if (request.method === 'GET' && url.pathname === '/health') {
    return new Response(JSON.stringify({
      ok: true,
      playtest: isPlaytestMode(env),
      version: PROTOCOL_VERSION,
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }
  // existing partyserver routing continues below
  ```
- `playtest: boolean` is informational ONLY. It exposes whether the
  Worker is running with `PLAYTEST_MODE=1` — useful for harness
  sanity-checks ("did wrangler actually pick up my env?") and for
  operational eyeballing. It does NOT leak the token, the seed, or
  any game state. A prod deployment that accidentally shipped
  `PLAYTEST_MODE=1` would surface here for ops, which is the desired
  failure-loud behavior.
- `version: string` is the server build stamp — `PROTOCOL_VERSION`
  from `src/shared/protocol.ts` is the closest existing canonical
  value. (If a finer-grained build SHA is wanted later, this is the
  surface to extend; out of scope here.)
- The route runs BEFORE any Durable Object lookup. No DO wake, no
  partyserver Room creation, no DB access. Worker-process-only.
- Available in production: GET to `https://burned.pages.dev/health`
  responds the same way. The endpoint is bare-public (no auth, no
  rate-limit) because the response carries no actionable secrets.
  Aggressive polling is bounded by Cloudflare's per-Worker request
  ceiling, not by any code in this plan.

**Patterns to follow:**
- Existing Worker default-export `fetch` handler shape in `room.ts`
  (whatever it currently is — the change is additive at the top).
- `isPlaytestMode` from Unit 1.

**Test scenarios:**
- Happy path: `GET /health` → status 200, JSON body
  `{ ok: true, playtest: false, version: <PROTOCOL_VERSION> }` when
  `PLAYTEST_MODE` unset.
- Happy path: `GET /health` with `PLAYTEST_MODE='1'` → same shape but
  `playtest: true`.
- Edge case: `POST /health` (or any non-GET) → falls through to the
  partyserver router (i.e. NOT a 200 from this branch). Test asserts
  the route is method-gated.
- Edge case: `GET /healthcheck` or `GET /health/foo` → falls through
  (exact-pathname match, not prefix).
- Edge case: response time on a cold Worker invocation is < 100ms
  measured locally. (Not asserted as a hard gate — wrangler dev cold
  start variance is wide. Documented as expectation for phase-3 Unit
  3's polling cadence.)
- Independence: the response does NOT trigger Durable Object
  instantiation. Verified by asserting no `GameRoom` constructor side
  effect (e.g. log line) fires when only `/health` is hit.

**Verification:**
- All tests pass; typecheck clean.
- Manual eyeball: `pnpm dev:server` then `curl http://localhost:8787/health`
  → 200 + JSON.
- Phase-3 Unit 3 ready-probe (which polls `/health`) reaches 200
  before the orchestrator opens the god WS — provable via Unit 8
  smoke ordering.

- [ ] **Unit 2: Extend `DispatchContext` with optional `nopeWindowMs`**

**Goal:** Thread an optional duration override into the existing pure ctx.

**Execution note:** Test-first. The engine change is one line; the test
matrix proves both default and override paths.

**Requirements:** R1

**Dependencies:** None (orthogonal to Unit 1).

**Files:**
- Modify: `src/server/game/types.ts` — add `nopeWindowMs?: number` to
  `DispatchContext` (around line 91).
- Modify: `src/server/game/engine.ts` — update `getNopeWindowDuration` to
  consult ctx first.
- Modify: `src/server/game/engine.test.ts` — extend `makeCtx` helper to
  accept an override.
- Create: `src/server/game/engine-playtest-mode.test.ts` — dedicated
  coverage of the override path.

**Approach:**
- `getNopeWindowDuration(ctx, alive)` returns `ctx.nopeWindowMs ??
  NOPE_WINDOW_MS[tierForAlive(alive)]`.
- Default remains the shared-constants tier.
- Override value applies uniformly (not tiered).

**Patterns to follow:**
- Existing `makeCtx(seed)` in `engine.test.ts:9-22`.

**Test scenarios:**
- Happy path: ctx with no override, 2-player game → tier-0 duration.
- Happy path: ctx with no override, 8-player game → tier-2 duration.
- Happy path: ctx with `nopeWindowMs: 60000`, any player count → 60000.
- Edge case: `nopeWindowMs: 0` → still uses 0 (explicit override beats
  default, even if degenerate).
- Edge case: `nopeWindowMs: undefined` → same as not set.
- Integration: full Nope scenario with override propagates to
  `NopeWindow.deadlineMs` (cross-check via `act(state, action, ctx)`).

**Verification:**
- New test file passes.
- Existing engine tests unaffected.

- [ ] **Unit 3: Seedable RNG path in `makeDispatchContext`**

**Goal:** When playtest mode is active AND a seed has been configured on
the `GameRoom`, `makeDispatchContext` returns a ctx whose `random` /
`randomInt` are driven by mulberry32 seeded with that value. Otherwise
CSPRNG (unchanged).

**Execution note:** Test-first. Determinism is the whole point; prove it.

**Requirements:** R2, R5

**Dependencies:** Unit 1 (needs `isPlaytestMode`).

**Files:**
- Modify: `src/server/room.ts` — `makeDispatchContext` (line 840-859)
  accepts or reads `this.playtestSeed` and branches.
- Create: `src/server/rng.ts` — exports `mulberry32(seed: number): () =>
  number` and `randomIntFromRandom(rand: () => number, max: number): number`.
- Create: `src/server/rng.test.ts`.

**Approach:**
- Keep `makeDispatchContext` signature as close to current as possible.
- Add instance fields `this.playtestSeed?: number`,
  `this.playtestNopeWindowMs?: number` on `GameRoom`.
- When the god `playtest-config` message arrives (Unit 5), these fields get
  set.
- `makeDispatchContext` reads them; falls back to CSPRNG when unset.

**Patterns to follow:**
- Existing `makeDispatchContext` function body.
- `engine.test.ts:9-22` LCG template (we're using mulberry32 but the
  injection shape is identical).

**Test scenarios:**
- Happy path: same seed → same sequence of 100 calls.
- Happy path: different seeds → different sequences.
- Edge case: seed `0` → produces a valid sequence (not a no-op).
- Edge case: seed unset → CSPRNG path produces numbers in `[0, 1)` with
  enough variance across 1000 calls (sanity, not a distribution test).
- Integration: `makeDispatchContext()` called twice with same seed + same
  context state → deterministic result when paired with a seeded shuffle.

**Verification:**
- Same-seed runs of `startGameWith(8, ctxSeeded(42))` produce identical
  initial deck orderings.
- CSPRNG path unchanged from today (regression: existing `engine.pbt.test.ts`
  property tests still pass).

- [ ] **Unit 4: Accept `role=god` connections with stricter gate + rate-limited auth**

**Goal:** `GameRoom.onConnect` (or the connection-accept path) recognizes
`role=god&token=<T>` query params. When `isPlaytestMode` is true AND the
request origin is in the god-origin allowlist AND the token matches, the
connection is tagged as `role: 'god'` and persisted via `connection.setState`
(so `getConnections()` can re-derive the god-connection set after
hibernation — see System-Wide Impact). Otherwise rejected with close code
`4004` (distinct from the existing `4001 'Room full'` at `room.ts:172` and
`4003 'Forbidden origin'` at `:162`). Repeated auth failures from the same
source are rate-limited and close with `4005`.

**Execution note:** Test-first. Token gate is security-critical. Close-code
collision with `room.ts:172` would make debugging god-auth failures
impossible from the client side.

**Requirements:** R3, R4

**Dependencies:** Unit 1.

**Files:**
- Modify: `src/server/room.ts` — connection-accept handler at `:152-178`;
  add `'god'` variant to `ConnState` at `:64-66`.
- Modify: `src/server/validation.ts` — add `GodConnectionParams` Zod
  schema (strict) for query parsing.
- Create: `src/server/god-connection.test.ts` — focused tests on the
  accept/reject decision.

**Approach:**
- Query param parsing: `role=god` + `token=<value>`. Parse via
  `new URL(ctx.request.url).searchParams` inside `onConnect`.
- **Origin allowlist is stricter than the player allowlist at
  `room.ts:155-164`.** God connections accept ONLY: `http://localhost:*`,
  `http://127.0.0.1:*`, RFC1918 ranges (`192.168.*`, `10.*`,
  `172.16-31.*`), and any origin in an optional `PLAYTEST_GOD_ORIGINS`
  env var (comma-separated). Public-internet origins — including
  `https://burned.pages.dev` — are rejected with `4003` even if the
  token is correct. Rationale: god role is omniscient; a leaked token
  must not be exploitable without also controlling a LAN endpoint.
- **Rejection sequence:** playtest mode off → `4004 'Playtest mode off'`.
  Origin not allowlisted for god role → `4003 'Forbidden god origin'`.
  Token missing → `4004 'Missing token'`. Token mismatch → `4004
  'Token mismatch'`. Constant-time compare for the token check (Unit 1).
- **Auth rate-limit.** Maintain a `godAuthFailures: Map<string, { count,
  windowStart }>` keyed by request source (remote IP from `ctx.request`
  CF headers if available; else origin). On 3+ failures in 60s, close
  subsequent attempts with `4005 'Rate limited'` and do NOT even evaluate
  the token. Reset counter on any successful auth (or on window roll).
  Worker instance is the GameRoom DO, so this is per-room — acceptable.
- **Persistence across hibernation.** `connection.setState({ role: 'god' })`
  is the ONLY state a god connection carries. Per partyserver hibernation
  semantics, WS attachment state on the connection survives hibernation;
  the DO's instance-level `godConnections: Set<>` field does NOT. Therefore
  the plan deliberately uses `getConnections()` + a role-tag filter rather
  than a shadow set. See System-Wide Impact hibernation row.
- God connections do not count toward `MAX_PLAYERS` or `MAX_CONNECTIONS`.
  Iterate `getConnections()` and skip `role === 'god'` when enforcing
  the cap at `:167-174`.
- God connections never receive `state-update` / `player-update` payloads
  — only `god-event` messages (Unit 6 branch in `broadcastGameState`).
  Players never receive `god-event`.

**Patterns to follow:**
- Existing origin-check in `room.ts:155-164`.
- Existing rate-limit pattern in `isRateLimited` at `:861-872` (adapt
  the per-second message limit pattern into per-minute auth failures).

**Test scenarios:**
- Happy path: playtest mode on + LAN origin + matching token → accept,
  tagged `role: 'god'`.
- Error path: playtest mode off + anything → reject with `4004`.
- Error path: playtest mode on + public-internet origin + matching token
  → reject with `4003` (origin gate precedes token check).
- Error path: playtest mode on + LAN origin + missing token → reject
  with `4004`.
- Error path: playtest mode on + LAN origin + mismatched token → reject
  with `4004`.
- Error path: 3 consecutive token mismatches within 60s → 4th attempt
  closes with `4005` BEFORE token comparison runs (verified by not
  logging a token-mismatch error on the 4th).
- Edge case: multiple concurrent god connections (same origin, same
  token) → all accepted; all receive god-events.
- Edge case: god connection does not count toward `MAX_CONNECTIONS`
  (12 player/host conns + 1 god → accept).
- Integration: god connection does not appear in `state.players`.
- Regression: existing close code `4001` is preserved for room-full
  rejections; no god-auth path uses `4001`.

**Verification:**
- New test file passes.
- Integration test in `tests/e2e/` optional but not required (god role is
  orchestrator-only; e2e covers player flow).
- Close-code map in test file doubles as the public contract: `4003 =
  forbidden origin, 4004 = god auth, 4005 = god rate-limited`.

- [ ] **Unit 5: `playtest-config` admin message from god connection (first-write-wins, queue-safe)**

**Goal:** Accept a pre-game `{ type: 'playtest-config', seed, nopeWindowMs }`
message from a god connection. Store on `GameRoom` instance. **First write
wins per room** — subsequent `playtest-config` messages are rejected with
a `PLAYTEST_CONFIG_LOCKED` error back to the sending god connection.
Rejected once the game is no longer in `lobby`. Writes go through the
serial action queue so a `playtest-config` cannot land mid-transition out
of `lobby`.

**Execution note:** Test-first. First-write-wins closes a seed-rewrite
attack vector: even if two god connections are present (or a compromised
token), the seed is nailed down by the first legitimate config and cannot
be silently re-rolled before `start-game`.

**Requirements:** R1, R2, R3, R5

**Dependencies:** Unit 4.

**Files:**
- Modify: `src/server/room.ts` — god-connection message handler (new
  switch case in `onMessage` at `:207-238`).
- Modify: `src/server/validation.ts` — `PlaytestConfigSchema`.
- Create: `src/server/playtest-config.test.ts`.

**Approach:**
- Zod schema: `{ type: 'playtest-config', seed: z.int().min(0),
  nopeWindowMs: z.int().min(1).max(30 * 60_000) }`. `.strict()` so unknown
  keys are rejected (matches convention in `validation.ts`).
- Handler only runs for connections with `connState.role === 'god'`.
  Player / host connections silently log-and-drop (no error message back
  — prevents probing).
- **Queue-routed writes.** The config write executes inside
  `this.enqueue()` like every other state mutation (see `:209-222`).
  `state.phase` is read inside the queued task, not at message-receive
  time. This closes the race between a late `playtest-config` and an
  early `handleStartGame`: whichever enqueues first wins. Rationale:
  `makeDispatchContext` at `:840-859` reads `this.playtestSeed` /
  `this.playtestNopeWindowMs` inside `handleAction` / `dispatchServerAction`
  — both of which run inside the same queue. Placing the config write
  on the same queue makes "config is set before any dispatch reads it"
  a total order, not a happens-before guess.
- **First-write-wins.** `GameRoom` gains a private `playtestConfigLocked:
  boolean`. The queued task:
  1. If `playtestConfigLocked === true` → send `PLAYTEST_CONFIG_LOCKED`
     error to the god connection and return.
  2. Else if `this.gameState !== null && this.gameState.phase !== 'lobby'`
     → send `PLAYTEST_CONFIG_TOO_LATE` and return. (Note:
     `this.gameState === null` is the "no lobby yet" case — also an
     acceptable pre-game time; accept.)
  3. Else → store `seed` + `nopeWindowMs` on the instance and set
     `playtestConfigLocked = true`.
- `makeDispatchContext` (Unit 3) reads the locked fields on every
  dispatch.
- **Hibernation consequence.** These fields reset on hibernate. After a
  hibernated room wakes (the god connection would have disconnected on
  the way down), the orchestrator detects the closed god socket,
  reconnects, and re-sends `playtest-config`. Because
  `playtestConfigLocked` also reset, the re-send is accepted. This is
  the intended recovery path — see System-Wide Impact hibernation row.

**Patterns to follow:**
- Existing Zod-validated message handlers in `room.ts:206-238`.
- `enqueue(fn, connection)` wrapper at `:721-742` for the queue-routing
  pattern + error-back-to-sender semantics.

**Test scenarios:**
- Happy path: god sends config pre-game → stored; next dispatch ctx sees
  seed + nopeWindowMs.
- Lock path: config sent twice pre-start → second REJECTED with
  `PLAYTEST_CONFIG_LOCKED`; first values preserved.
- Error path: sent post-start → rejected with `PLAYTEST_CONFIG_TOO_LATE`;
  existing config preserved.
- Error path: sent by player connection → silently dropped (no response,
  no log except internal debug).
- Error path: malformed payload (negative seed, missing nopeWindowMs) →
  Zod reject with `INVALID_MESSAGE`.
- Race: god sends `playtest-config` and a player sends `start-game` in
  the same tick → whichever reaches the queue first wins, and the
  outcome is deterministic given queue-enter order. Assert: if config
  enqueues first, it is applied; if `start-game` enqueues first, config
  is rejected with `PLAYTEST_CONFIG_TOO_LATE`. No "applied then
  overwritten" outcome is possible.
- Hibernation recovery: store config, simulate hibernate (manually clear
  instance fields in test), orchestrator re-sends → accepted (lock
  reset with instance).

**Verification:**
- Config round-trips: send → dispatch → ctx reflects values.
- First-write-wins: second `playtest-config` errors out, state unchanged.
- Queue-routing: a unit test that interleaves `playtest-config` +
  `start-game` proves ordering is deterministic with no "torn write."

- [ ] **Unit 6: Emit `god-event` from `broadcastGameState` in the per-connection loop**

**Goal:** Extend `broadcastGameState` at `src/server/room.ts:755-795` with
a third `role === 'god'` branch that sends the pre-built `god-event`
payload computed once at the top of the broadcast pass. The dispatch
sites at `:615-627` and `:631-666` populate a transient
`this.pendingGodEventTrigger = { action, events, stateVersion, nowMs }`
immediately before calling `broadcastGameState`, and the broadcast clears
it after reading. Non-dispatch callers of `broadcastGameState` (reconnect
resync at `:473`, force-clear-nope fallback at `:654`, queue-error
fallbacks at `:735-738`) leave the trigger `null` and emit no god-event.

**Execution note:** Test-first integration-style. This is the ONE
architectural decision that makes Unit 6a's by-construction guarantee
possible. Emitting the god-event at the dispatch site (the previous plan)
re-samples `Date.now()` and `getConnectedPlayerIds()` and would make
`god-event.projections[V] === player-update.payload.state` an asserted
invariant rather than a structural one.

**Requirements:** R3

**Dependencies:** Units 4, 5, 6a.

**Files:**
- Modify: `src/server/room.ts`:
  - Add instance field `private pendingGodEventTrigger: { action:
    EngineAction; events: readonly GameEvent[]; stateVersion: number;
    nowMs: number } | null = null`.
  - At `:614-626` (`handleAction`): build `ctx`, call `dispatch`, on
    `result.ok` set `pendingGodEventTrigger = { action: engineAction,
    events: result.events, stateVersion: result.state.stateVersion,
    nowMs: ctx.now }` BEFORE `broadcastGameState()`.
  - At `:631-666` (`dispatchServerAction`): same pattern on `result.ok`.
  - At `:755-795` (`broadcastGameState`): read + clear the trigger at
    the top, build `godRaw` iff `isPlaytest && trigger !== null` (using
    the Unit 6a helper for projections + the already-computed
    `boardView`), and add a `connState?.role === 'god'` branch in the
    per-connection loop that sends `godRaw`.
- Create: `src/server/god-broadcast.test.ts` — end-to-end: open a god
  connection, dispatch a player action, assert god connection received
  the correct event AND the same player's concurrent `player-update`
  carries a structurally identical `PlayerView` under
  `payload.state`.

**Approach:**
- **Per-connection try/catch parity.** The existing loop at `:771-792`
  wraps every `conn.send` call in `try { ... } catch { sendFailures++ }`.
  The god-role branch MUST follow the same pattern — a single god
  connection in a half-closed race state must not prevent host + player
  sockets from receiving their state-update. Never wrap the whole loop
  in one try/catch.
- Respect outbound size. Workers have a 1MiB per-message outbound limit
  (NOT the 4KB inbound cap in `validation.ts:13,27-29`). Compute
  `messageByteLength(godRaw)` and assert it's under 1MiB for safety.
  Budget row in Risks & Dependencies quantifies expected payload size
  at N=10 players. Per-viewer splitting (one god-message per viewer,
  all keyed by the same `stateVersion` so the orchestrator can
  reassemble) is documented in the Risks table as the fallback design
  if the Unit 8 smoke size assertion ever fires. NOT implemented as
  part of Unit 6 — only as a defined, ready-to-land fallback.
  **When splitting does land**, the emitter snapshots
  `expectedViewerIds = Object.keys(projections)` of the full (pre-split)
  projections map BEFORE partitioning, then attaches the SAME
  `expectedViewerIds` array to every split chunk for that
  `stateVersion`. This is the authoritative completion signal phase-3's
  reassembly buffer consumes (see D4 "Split-envelope metadata fields"
  and Risks row). The array is derived from the full seated roster, NOT
  from the connected-player subset, so eliminated-but-seated and
  disconnected seats are included — matching Unit 6a's iterate-
  `state.players` rule.
- `action` in the message is the `EngineAction` (with server-injected
  `playerId`), not the raw client action (matches engine log-level view).
- **god-event payload is built ONCE per broadcast** and the same
  pre-serialized `godRaw` string is sent to every god connection. Never
  re-run `buildGodProjections` per connection inside the loop — that
  would defeat the point of the broadcast-site architecture and cost
  O(god_count × player_count) projection work.
- **Outbound shape assertion (defense-in-depth).** Before broadcasting,
  assert the god-event payload conforms to an outgoing Zod schema:
  `GodEventOutgoing = z.object({ type: z.literal('god-event'), action:
  EngineActionSchema, events: z.array(GameEventSchema), stateVersion:
  z.int().min(0), nowMs: z.int().min(0), projections: z.record(z.string(),
  PlayerViewSchema), boardView: BoardViewSchema })`. Running in playtest
  mode only; gate on `isPlaytest` so production bundles tree-shake the
  schema. Cheap insurance against a future projection change accidentally
  leaking a raw state field into the wire. On failure, log + drop the
  god-event (do NOT close the god connection) and increment a metric;
  Phase 3 surfaces this as a calibration blocker.

**Patterns to follow:**
- Existing broadcast loop in `room.ts:755-795`, including `hostCount /
  playerCount / sendFailures` logging — extend with `godCount`.
- E-02 inbound byte-cap fix (`validation.ts:13,27-29`) as the template
  for `messageByteLength` usage (not the cap value itself).

**Test scenarios:**
- Happy path: player plays a card → god connection receives one
  `god-event` carrying the correct `action` + `events` array +
  `stateVersion` + `projections` map (one entry per seated player) +
  `boardView`. Exactly one message per dispatch per god connection.
- Structural equality: concurrent with the god-event, each player
  connection receives a `player-update` whose `payload.state` is
  `JSON.stringify`-equal to `godEvent.projections[thatPlayerId]`.
- Edge case: playtest mode off → no god-event sent (and no god
  connections accepted per Unit 4). `pendingGodEventTrigger` is never
  populated.
- Edge case: successful dispatch with `result.events === []` → still
  broadcast (action alone is informative; projections + boardView still
  populated).
- Edge case: failed dispatch (`result.ok === false`) → no god-event;
  `pendingGodEventTrigger` stays `null`.
- Edge case: multiple god connections → all receive the same
  pre-serialized `godRaw` string.
- Edge case: non-dispatch `broadcastGameState` caller (reconnect
  re-broadcast) fires → no god-event emitted.
- Resilience: one god connection throws on `send` (simulated half-close)
  → other god connections AND all host/player sockets still receive
  their respective payloads. `sendFailures` counter increments.
- Integration: seat projection (existing `state-update` / `player-update`)
  goes to host/players only; god-event goes to god only. No
  cross-contamination.

**Verification:**
- Vitest-driven integration test passes.
- No new entries in player-facing message types (god-event never leaves
  server except to god role).
- Broadcast-loop log line extends to include `god=<n>` so operator can
  eyeball distribution in a smoke run.

- [ ] **Unit 6a: `buildGodProjections` helper (pure, correct signature, reuses broadcast's boardView)**

**Goal:** Provide the pure helper `buildGodProjections(state, boardView,
connectedPlayerIds) → Record<string, PlayerView>` that Unit 6 calls once
per broadcast to populate the god-event's `projections` map. The helper
does NOT compute `boardView` itself — it consumes the `boardView` already
built by `projectForBoard(state, now, connectedPlayerIds)` at
`broadcastGameState` `:762`, so both the god-event and the concurrent
`player-update` payloads share one immutable `boardView` instance. Per
phase-1 R7 + §System-Wide Impact (phase-1-scenarios.md:958-967), each
entry is the exact `PlayerView` that seat would see — NOT a god-mode
view.

**Execution note:** Test-first. The invariant being proved is that a
god-event never carries more information to a given viewer than that
viewer would legitimately see via the existing `player-update` broadcast.
The by-construction guarantee is: because Unit 6 calls the SAME
`projectForPlayer(state, playerId, boardView)` (same `state`, same
`boardView`) for both the player-update and the god-event's
`projections[playerId]`, both outputs are the same JS object reference.
No asserted invariant can fail because no separate computation exists.

**Requirements:** R3 (phase-2) + phase-1 R7 (downstream contract).

**Dependencies:** None from Unit 6 (Unit 6 depends on this — order
corrected).

**Files:**
- Create: `src/server/god-projection.ts` — named export
  `buildGodProjections`. Lives in its own module per the room-exports
  landmine (`src/server/room.ts` may ONLY export `GameRoom`).
- Create: `src/server/god-projection.test.ts` — unit test that calls the
  helper directly and asserts allowlist + privacy invariants.
- Modify: `src/server/room.ts:755-795` (`broadcastGameState`) — import
  + call the helper in the god-event preparation block; pass the
  already-computed `boardView` + `connectedPlayerIds`.

**Approach:**
- **Signature (verified against actual `projection.ts`):**
  ```ts
  // src/server/god-projection.ts
  import type { PlayerView, BoardView } from '@shared/protocol'
  import type { PlayingState, GameOverState } from './game/types'
  import { projectForPlayer } from './projection'

  export function buildGodProjections(
    state: PlayingState | GameOverState,
    boardView: BoardView,
    connectedPlayerIds: ReadonlySet<string>,  // reserved for parity with
                                              // projectForBoard's signature
                                              // and future use; currently
                                              // unused by projectForPlayer
  ): Record<string, PlayerView> {
    const projections: Record<string, PlayerView> = {}
    for (const p of state.players) {
      projections[p.id] = projectForPlayer(state, p.id, boardView)
    }
    return projections
  }
  ```
  Note: `projectForPlayer` actual signature (per
  `src/server/projection.ts:54-58`) is `(state, playerId, board) →
  PlayerView`. It accepts the pre-computed `board` and internally invokes
  `augmentNopeWindowForPlayer` + `stripPrivateEventFields` with the
  viewer's `playerId`. `projectForBoard` (at `projection.ts:11-15`) is
  `(state, now, connectedPlayerIds) → BoardView` — the caller (Unit 6 in
  `broadcastGameState`) already invoked it and holds the result.
- Iterate `state.players` (NOT `state.players.filter(p => p.isAlive)`).
  Eliminated-but-seated players still receive full `PlayerView`
  broadcasts per the engine invariant cited in CLAUDE.md "Engine
  Invariants" (`projectForPlayer` at `projection.ts:78` + `:96` returns
  `player?.hand ?? []`). Spectator view is explicitly in scope per
  phase-1 D5 row 5. Disconnected-but-seated players are likewise
  included — their `BoardPlayer.isConnected: false` flows through
  `projectForBoard` via `connectedPlayerIds.has(p.id)` at
  `projection.ts:16`.
- **Expected-viewer-set derivation (split contract).** `Object.keys` of
  the returned `projections` map is the canonical expected-viewer set
  for that broadcast pass — every SEATED player, regardless of alive /
  connected status. When Unit 6 falls back to per-viewer splitting
  (Risks row), it snapshots `expectedViewerIds = Object.keys(projections)`
  from this helper's return BEFORE partitioning, then attaches the same
  array to every split chunk under that `stateVersion` (see D4 "Split-
  envelope metadata fields"). The set MUST equal the projections-map
  keys exactly — phase-3 Unit 4 reassembly compares
  `Object.keys(mergedProjections)` against `expectedViewerIds` as a set
  for completion detection. Any divergence (e.g. helper iterates a
  filtered subset) makes reassembly hang or silently mis-complete. The
  test scenarios below pin this contract; the property test asserts
  `Object.keys(buildGodProjections(state, board, conn)) ===
  state.players.map(p => p.id)` as a set.
- Do NOT spread `state` into the envelope, do NOT synthesize a custom
  per-viewer view, do NOT call any private engine helper that bypasses
  projection. The allowlist pattern + `stripPrivateEventFields` +
  `augmentNopeWindowForPlayer` viewer-gate (at `projection.ts:165-183`
  and `:217-241`) are the privacy contract; going around them
  reintroduces E-01 class leaks.
- **Purity statement (corrected).** `buildGodProjections` is a pure
  function of `(state, boardView, connectedPlayerIds)` — NOT of `state`
  alone. `state` alone is insufficient because `projectForBoard` samples
  `now` + `connectedPlayerIds`, and `projectForPlayer` inherits those
  decisions via `board`. The property test must vary all three inputs.

**Patterns to follow:**
- `src/server/projection.ts` existing functions — reuse, do not
  re-implement.
- Allowlist projection pattern per CLAUDE.md "Security Conventions".

**Test scenarios:**
- Happy path: 4-player mid-game `state` + pre-computed `boardView` +
  `connectedPlayerIds` containing all 4 → `projections` map has 4
  entries keyed by `playerId`; each entry equals
  `projectForPlayer(state, playerId, boardView)` exactly (reference
  equality of produced objects, not just structural — same call, same
  result).
- Privacy invariant (ACTOR): for a state with a pending named-steal,
  `projections[stealerId].nopeWindow.namedSteal.namedCardType` is
  populated (matches phase-1 Unit 4 `projection-assertions:` field path
  at phase-1 line 670).
- Privacy invariant (TARGET): same field populated on
  `projections[targetId]` — viewer-gated branch at
  `src/server/projection.ts:174` fires for target.
- Privacy invariant (OTHER-ALIVE): same field ABSENT on
  `projections[otherAliveId]` — viewer gate at `projection.ts:174`
  rejects non-stealer non-target.
- Privacy invariant (private event fields): for a `combo-steal` event,
  assert `projections[otherAliveId].events` does not contain the stolen
  `cardType` — `stripPrivateEventFields` at `projection.ts:217-241`
  must have run.
- Private event fields (card-drawn): `projections[drawerId].events`
  contains `cardType`; `projections[otherAliveId].events` does NOT.
  Verifies the 2026-04-23 E2E audit P0 fix at `projection.ts:231-238`.
- Spectator: eliminated-but-seated player's projection entry present,
  `myHand` returns `player?.hand ?? []` per `projection.ts:78` + `:96`.
- Disconnected player: `connectedPlayerIds` excludes them; they appear
  in `projections` AND their `BoardPlayer.isConnected === false` round-
  trips through the shared `boardView`.
- Property test: for random valid `(state, boardView, connectedPlayerIds)`
  triples where `boardView === projectForBoard(state, now,
  connectedPlayerIds)` for some `now`, calling `buildGodProjections`
  twice with the same triple returns structurally equal results (pure).
- Property test: different `connectedPlayerIds` sets produce different
  `BoardPlayer.isConnected` flags in the `boardView` (caller's
  responsibility) but do NOT change which players appear in
  `projections` — every seated player is always keyed.

**Verification:**
- All test scenarios pass.
- `buildGodProjections` is pure w.r.t. `(state, boardView,
  connectedPlayerIds)` — no I/O, no mutation, no `Date.now()`, no
  `crypto.getRandomValues`. Verified by a property test (same inputs →
  structurally equal outputs).
- The invariant "god-event contents for viewer V equals what V's
  `player-update` contains" is proved BY CONSTRUCTION — Unit 6 feeds
  the same `state` + same `boardView` through `projectForPlayer(state,
  V, boardView)` for both destinations.
- Phase 3's detector consumes `god-event.projections[viewerId]` and
  `god-event.boardView` as the source-of-truth snapshot for
  `projection-assertions:` scenarios per phase-1 R7.

- [ ] **Unit 7: Prod-bundle sentinel + import-graph isolation regression tests**

**Goal:** Two independent checks prevent playtest code from shipping to
production:
1. **Sentinel check (string-level).** Build the worker bundle without
   `PLAYTEST_MODE` set and assert sentinel strings
   (`'god-event'`, `'playtest-config'`, `'role=god'`,
   `'PLAYTEST_TOKEN'`, `'mulberry32'`) do not appear in
   `dist/**/*.js`.
2. **Import-graph isolation (module-level).** Assert that no module
   imported transitively from `src/server/room.ts`'s production code
   path (i.e. excluding code behind the `isPlaytest` flag branch)
   references `src/server/god-projection.ts`, `src/server/playtest.ts`,
   or `src/server/rng.ts`. The string check catches leaks via literals;
   the import-graph check catches leaks via unreachable-but-reachable
   code that DCE missed.

**Requirements:** R4

**Dependencies:** Units 1-6.

**Files:**
- Modify: `scripts/verify-prod-bundle.ts` — extend existing verifier
  with playtest sentinels AND import-graph analysis.
- Modify: `package.json` — ensure `pnpm verify:bundle` covers this.
- Create: `src/server/playtest-sentinels.test.ts` — runs the verifier
  as a test so CI + `pnpm test` catches regressions.
- Create: `scripts/verify-import-graph.ts` — parses `dist/` source maps
  (or runs `tsc --traceResolution` / `rollup-plugin-visualizer`) and
  confirms playtest modules are not in the production entry's
  transitive closure.

**Approach:**
- **Sentinel check** — mirror E-03's `__gameStore` sentinel pattern.
  Grep `dist/**/*.js` for each sentinel string. Fail with a clear
  error identifying which sentinel leaked and which guard likely
  failed (e.g. "`'role=god'` found → check Unit 4 origin-gate guard").
- **Import-graph check** — the stronger defense. Walk the import graph
  starting from `src/server/room.ts` (production entry), and for every
  import edge that is reachable WITHOUT crossing an `isPlaytest`-
  guarded branch, assert none of `{playtest.ts, god-projection.ts,
  rng.ts}` appear. Implementation options, pick whichever is lowest-
  cost to maintain:
  - Parse `dist/*.js.map` source-map sources list.
  - Use `ts-morph` or TypeScript compiler API to walk `import`
    declarations.
  - Use `@rollup/plugin-visualizer` output JSON as the graph source.
  Record the chosen approach in the Unit 7 implementation commit — the
  choice is mechanical, not a design decision.
- Why both checks: strings can absence while dead code lingers (tree-
  shake missed a branch); code can be absent while a constant name
  leaks into a tooltip or error message. Defense in depth is cheap.

**Patterns to follow:**
- `scripts/verify-prod-bundle.ts` existing structure.
- E-03 in `docs/testing/E2E-ISSUE-LIST.md`.

**Test scenarios:**
- Happy path: production build → all sentinels absent, no playtest
  modules in prod import graph → test passes.
- Error path (sentinel): deliberately remove a guard (local only) →
  sentinel test fails with actionable message pointing at which
  sentinel leaked.
- Error path (import graph): deliberately add `import { mulberry32 }
  from './rng'` at the top of `room.ts` (outside any guard) → import-
  graph test fails listing the offending import edge.
- Integration: both checks run inside `pnpm test` and `pnpm
  verify:bundle`.

**Verification:**
- `pnpm build && pnpm verify:bundle` exits 0.
- Running either test with a sabotaged guard fails loudly and
  independently — a string leak does not shadow an import leak, or
  vice versa.

- [ ] **Unit 8: Smoke test — full playtest round trip + payload + CPU budget**

**Goal:** End-to-end proof that Phase 2 works AND stays within outbound
payload + CPU budgets even at the roster's worst case (N = 10 players
mid-game). Boots wrangler dev with `PLAYTEST_MODE=1`, connects as god,
sends config with `seed=42 + nopeWindowMs=60000`, has a test player play
one card, asserts god connection received the god-event, measures
payload size and projection-build time, shuts down.

**Requirements:** R1, R2, R3, R5

**Dependencies:** Units 1-6a.

**Files:**
- Create: `scripts/playtest/phase2-smoke.ts` — runs wrangler dev, opens
  a WS god connection, asserts one god-event, records payload size +
  CPU timing, shuts down.
- Create: `src/server/god-projection.bench.test.ts` — in-process
  Vitest bench that loads a 10-player mid-game fixture and measures
  `buildGodProjections` wall time. Asserts a soft budget; flags if
  exceeded.
- Modify: `package.json` — add `pnpm playtest:smoke` script.

**Approach:**
- Spawn a one-shot smoke against a real dev server. Use `partysocket`
  or raw WS client — whichever is simpler for a script.
- Use two fixtures: a 4-player happy path and a **10-player mid-game
  saturation fixture** (all seats alive, hands populated per engine
  shuffle). The 10-player case is where payload size and CPU matter.
- **Payload budget assertion.** Compute `messageByteLength(godRaw)`
  (via `TextEncoder` per `validation.ts:27-29`). Assert `< 512 KiB`
  for the 10-player fixture — well under the Workers 1 MiB outbound
  cap. If this fires, per-viewer splitting (see Risks row) is the
  fallback: split `projections` into one god-message per viewer, all
  keyed by the same `stateVersion` so the orchestrator can reassemble.
- **CPU budget assertion.** `buildGodProjections` wall time at N=10
  must stay under **10 ms** in the Vitest bench. If this fires,
  consider (a) caching the per-viewer projection list across the
  broadcast pass if multiple god-events fire in a burst (nope chain),
  or (b) documenting a player-count cap at 8 for playtest mode. Do
  NOT silently ignore a budget breach — it indicates the quadratic
  `stripPrivateEventFields` per-viewer work is becoming a bottleneck.
- Not a Vitest test for the smoke script — it's a standalone
  verification. The bench test IS a Vitest assertion so CI flags
  regressions.

**Patterns to follow:**
- `scripts/launch-dev-chrome.ts` process-spawn style.
- `validation.ts:27-29` `messageByteLength` for byte measurement.

**Test scenarios:**
- Happy path (4 players): smoke script exits 0 after verifying one
  god-event carrying `projections` (one entry per seated player, keyed
  by `playerId`) and `boardView`.
- Payload budget (10 players): smoke script builds the 10-player
  fixture, performs one dispatch, verifies `messageByteLength(godRaw)
  < 512 KiB`.
- CPU budget (10 players): Vitest bench asserts `buildGodProjections`
  completes in < 10 ms averaged over 100 iterations.
- Error path: if `PLAYTEST_MODE` unset, smoke script exits non-zero
  with instructions to set the flag.
- Invariant check: for the one observed god-event, assert
  `JSON.stringify(projections[<test-player-id>]) ===
  JSON.stringify(<test-player-id>'s most recent player-update
  payload.state)` — confirms Unit 6's broadcast-site emission +
  Unit 6a's same-boardView reuse produce structurally identical
  viewer PlayerViews.
- Regression guard: if a future change introduces a divergence
  (e.g. recomputing `now` inside `buildGodProjections`), the smoke
  invariant fails.

**Verification:**
- `pnpm playtest:smoke` green locally against `pnpm dev:server`.
- Bench test green in `pnpm test`.
- Payload + CPU measurements logged to stdout for operator eyeball;
  a future tightening of the budget starts from this recorded
  baseline.

## System-Wide Impact

- **Interaction graph:** New WS message type `god-event` (server → god
  role ONLY) emitted from `broadcastGameState` in the same per-connection
  loop that emits `state-update` (host) + `player-update` (player),
  carrying `{ type, action, events, stateVersion, nowMs, projections:
  Record<playerId, PlayerView>, boardView: BoardView }`. Because all three
  message families share one `state` + `boardView` + `now` snapshot per
  broadcast pass, `god-event.projections[V]` is the literal same object
  as the `PlayerView` delivered to viewer V's `player-update.payload.state`
  in the same pass — no asserted invariant, a structural one. New admin
  message `playtest-config` (god role → server). No changes to existing
  player ↔ server messages. Phase 1 R7 (phase-1-scenarios.md:958-967)
  declares the `projections` + `boardView` fields as the canonical shape;
  Phase 3's detector consumes them.
- **Error propagation:** Malformed `playtest-config` → Zod reject,
  `INVALID_MESSAGE` back to god connection, WS stays open. Duplicate
  `playtest-config` → `PLAYTEST_CONFIG_LOCKED`. Post-start `playtest-config`
  → `PLAYTEST_CONFIG_TOO_LATE`. Malformed god auth → close `4004`.
  Rate-limited god auth → close `4005`. Forbidden god origin → close
  `4003`.
- **Hibernation + god connections.** `GameRoom` has `hibernate: true` at
  `room.ts:71`. Instance fields (`playtestSeed`, `playtestNopeWindowMs`,
  `playtestConfigLocked`, `pendingGodEventTrigger`, the god-auth failure
  counter) are LOST when the DO hibernates. Per-connection state tagged
  via `connection.setState({ role: 'god' })` survives — so the set of
  god connections is reconstructed on wake by iterating `getConnections()`
  and filtering on `connState.role === 'god'`. The plan deliberately
  does NOT maintain a shadow `godConnections: Set<>` field because it
  would drift out of sync across hibernation. On wake, the orchestrator
  detects its WS is closed, reconnects, and re-sends `playtest-config`
  (accepted because `playtestConfigLocked` reset with the instance).
  Cheaper than DO-storage-persisting the config.
- **State lifecycle risks:** Config re-send after hibernation is the ONLY
  recovery path. If the orchestrator doesn't re-send, the post-wake
  dispatch uses CSPRNG + default nope window — scenario reproducibility
  is silently lost. Phase 3 MUST log "awaiting playtest-config after
  reconnect" on the god socket until the config lands, so a missed re-
  send is visible.
- **events.jsonl privacy scope.** God-event projections flow to the
  orchestrator and get persisted to `events.jsonl` in Phase 3. These
  contain full `PlayerView` for every seat — including hand contents
  via `myHand` at `projection.ts:78, 96`. The file therefore leaves the
  DO's privacy boundary. Phase 3 OWES a retention + scrub policy
  (rotation, redaction, or a documented "developer-eyes-only,
  never-committed" rule). Flagged here so Phase 3 plan must address it;
  not solved in this phase.
- **API surface parity:** Prod clients never see god-event or
  playtest-config. Prod builds verified by Unit 7 (both sentinel strings
  + import-graph isolation).
- **Integration coverage:** Unit 8 smoke + Unit 6 god-broadcast
  integration + Unit 6a privacy-invariant tests prove the full path.
- **Unchanged invariants:** Existing player protocol, all engine rules,
  state projection allowlist, 4KB inbound message cap, rate-limit,
  origin check, pure dispatch, serial action queue, CSPRNG-by-default
  for production. Unit 6a relies on the allowlist projection + card-
  identity privacy rules remaining intact: it reuses `projectForPlayer`
  and `projectForBoard` rather than synthesizing a new view, so any
  change to the projection contract propagates into god-events
  automatically.

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Env-flag read path has a bug and playtest code executes in prod | Unit 1 tests the read paths exhaustively. Unit 7 prod-bundle test catches sentinel leaks AND import-graph leaks. Token gate (Unit 4) is a third defense even if flag leaks. |
| God-event outbound payload size at N=10 players | Workers **outbound** limit is 1 MiB per message (NOT the 4 KiB INBOUND cap at `validation.ts:13,27-29` — those enforce the size of messages the server ACCEPTS). At 10 players with full mid-game state, `{ projections: 10× PlayerView, boardView: BoardView }` is expected to weigh 30-60 KB gzipped, ~200-400 KB raw — well under 1 MiB but non-trivial. Unit 8 smoke asserts `< 512 KiB` for the 10-player fixture (half of the outbound ceiling as a margin). **Fallback (documented here, not implemented unless Unit 8 fires):** per-viewer splitting — emit one god-message per viewer, all keyed by the same `stateVersion` so the orchestrator reassembles. Each split chunk MUST carry `expectedViewerIds: string[]` (D4 "Split-envelope metadata fields") — the authoritative full seated-player set the consumer's reassembly buffer compares against `Object.keys(mergedProjections)` for completion. Naive count-based completion is unsafe: if a seat disconnects mid-reassembly the server might emit fewer chunks than the original expected set, and a counting consumer would either hang waiting for a phantom chunk or silently flush an incomplete merge. `expectedViewerIds` makes the set explicit and stable across reassembly. Orchestrator reassembly logic lives in Phase 3 Unit 4 and consumes this field as the completion signal. |
| CPU cost of `buildGodProjections` at N=10 during a nope-chain storm | A 3-5-dispatch-per-second nope chain multiplied by 10 `projectForPlayer` calls per dispatch is the worst case. Unit 8 bench asserts `buildGodProjections` < 10 ms at N=10; Unit 6 reuses the `boardView` and pre-serializes `godRaw` exactly once so god-connection count does NOT multiply projection work. If the bench fails, document a playtest cap of 8 seats (still covers the party-game sweet spot) — NOT a silent regression. |
| Unit 6a diverges from live `player-update` projection | Risk eliminated by architecture, not by assertion. Unit 6a is invoked FROM `broadcastGameState` with the same `state` + `boardView` + `connectedPlayerIds` that the player-update branch uses, so both paths produce `projectForPlayer(state, playerId, boardView)` outputs that are the literal same JS object. No divergence is possible without introducing a new code path. Unit 6a's test asserts reference / structural equality as a regression tripwire. |
| Hibernation loses playtest config + god-connection field | Addressed in System-Wide Impact. Instance fields reset on hibernate; god connections are re-derived from `getConnections()` filtered by `connState.role === 'god'` (setState survives hibernation). Orchestrator re-sends `playtest-config` after any reconnect. |
| `playtest-config` race vs `start-game` | Unit 5 routes `playtest-config` writes through the same `this.enqueue()` serial queue that `handleStartGame` uses (`room.ts:209-222`). Whichever enqueues first wins; no torn writes possible. |
| Seed-rewrite attack via duplicate `playtest-config` | Unit 5 enforces first-write-wins per room — subsequent configs rejected with `PLAYTEST_CONFIG_LOCKED`. Closes the vector where a second god connection (or compromised token) could silently re-roll the seed before `start-game`. |
| Global `PLAYTEST_TOKEN` leak = omniscient access to every active room | Acknowledged. Current plan uses a single Worker-secret token, which means a leak unlocks every concurrent playtest room. **Mitigations active in this phase:** LAN-only origin gate (Unit 4), rate-limited auth (Unit 4), first-write-wins config (Unit 5). **Deferred to Phase 3:** per-room minted tokens OR time-boxed tokens. Flagged in Open Questions. |
| `events.jsonl` privacy scope leaves DO boundary | Addressed in System-Wide Impact. God-event projections contain full hand contents via `myHand`. Phase 3 owes a retention + scrub policy; flagged here so Phase 3 plan cannot silently skip it. |
| Seeded shuffle diverges between Node-test harness and Workers runtime | Unit 3 uses mulberry32 (pure JS, identical across runtimes). LCG alternative same guarantee. |
| `TEST_TIMEOUT_SCALE` from phase-6 plan and `PLAYTEST_MODE` diverge | This phase names its own env var; if phase-6 also ships `TEST_TIMEOUT_SCALE`, they coexist (different purposes). Briggsy to decide whether to merge names later. |
| Tree-shake doesn't eliminate guarded paths in Workers build | Unit 7 defends on two fronts: sentinel strings must be absent AND the import graph must not reach playtest modules from production entry. If one catches a leak the other missed, we find it. |
| Close-code collision with existing 4001 (room-full) | Unit 4 uses 4004 (god auth failure) and 4005 (god auth rate-limited). 4001 at `room.ts:172` remains reserved for room-full. Test scenarios assert the distinction. |

## Documentation / Operational Notes

- Add a **Playtest Mode** section to `CLAUDE.md` describing the env flag,
  god connection shape, and the "prod must not see sentinels" invariant.
- Playtest deployments (if any — current assumption is local dev only)
  use a separate Worker binding with `PLAYTEST_MODE=1` + a distinct
  `PLAYTEST_TOKEN` generated per session.
- Operational: rotating the token invalidates live orchestrator
  connections. Out of scope for v1; flagged for Phase 3 (per-room or
  time-boxed tokens).
- **CI gate on production `wrangler.jsonc`.** Wrangler per-environment
  `vars` blocks are easy to misset — a dev engineer can accidentally
  deploy `PLAYTEST_MODE='1'` to prod. Add a CI assertion in the existing
  `pnpm verify:bundle` pipeline (or a sibling script): parse
  `wrangler.jsonc` and assert the production environment block does NOT
  contain `PLAYTEST_MODE` or `PLAYTEST_TOKEN` under `vars`. This is
  config-level defense; Unit 7 is bundle-level defense; they are
  complementary, not redundant. A leaked flag in the config would be
  caught at deploy time by this gate even if the bundle contains the
  guarded code paths (which Unit 7 already permits, as long as sentinels
  + imports are absent).
- **Close-code public contract.** When god-auth fails, the client sees
  one of: `4003 'Forbidden god origin'`, `4004 'Playtest mode off' /
  'Missing token' / 'Token mismatch'`, `4005 'Rate limited'`. Document
  these in `CLAUDE.md` alongside the existing `4001 'Room full'` so
  orchestrator authors (Phase 3) can distinguish retry-worthy (4005)
  from config-fix-needed (4003, 4004).
- **Outbound payload budget.** Publish the Unit 8 measured baseline (raw
  + gzipped bytes for the 10-player god-event) in `CLAUDE.md`'s
  "Protocol Landmines" section. Future changes that balloon the payload
  past 512 KiB should trigger the per-viewer split design, not a
  silent drift.
- **`/health` endpoint (Unit 1b) ships in production.** Document in
  `CLAUDE.md` "Workers / Protocol Landmines" that GET `/health` is a
  bare-public, no-auth route returning `{ ok, playtest, version }`. It
  is intentionally exposed in prod builds because (a) it carries no
  actionable secrets, (b) the `playtest: true` field surfaces an
  accidental playtest-mode prod deploy as a loud failure mode, and
  (c) external readiness probes (CI, harness, monitoring) need a
  stable contract that doesn't depend on partyserver's routing
  defaults. Removing or auth-gating `/health` would break phase-3
  Unit 3's readiness detection.

## Sources & References

- **Origin:** [docs/testing/PLAYTEST-HARNESS-PRD.md](../../testing/PLAYTEST-HARNESS-PRD.md)
- **Parent roadmap:** [docs/plans/playtest-harness/roadmap.md](./roadmap.md)
- **RNG seam:** `src/server/room.ts:840-859` (`makeDispatchContext`),
  `src/server/game/engine.test.ts:9-22` (seedable-ctx template).
- **Nope window source:** `src/server/game/engine.ts:1301-1329`
  (`createNopeWindow` + `getNopeWindowDuration`), `src/shared/constants.ts:6-10`.
- **Broadcast site (rewrite target):** `src/server/room.ts:755-795`
  (`broadcastGameState`). `projectForBoard` called once at `:762` with
  `(state, now, connectedPlayerIds)`. `projectForPlayer` called per-player
  at `:782` with `(state, playerId, boardView)`. This is the architecture
  the god-event emission mirrors.
- **Dispatch sites (god-event trigger population):** `src/server/room.ts:615-627`
  (`handleAction`), `:631-666` (`dispatchServerAction`). Non-dispatch
  callers of `broadcastGameState` that must NOT emit a god-event:
  `:473` (reconnect resync), `:654` (force-clear-nope fallback), `:735-738`
  (queue-error fallbacks).
- **Connection state + hibernation:** `GameRoom` declared at
  `src/server/room.ts:70-71` with `static override options = { hibernate:
  true }`. `ConnState` discriminated union at `:64-66` — add `'god'`
  variant. `connection.setState` calls at `:314, 434, 453` show the
  pattern that the god branch mirrors. `getConnections()` at call sites
  `:254, 291, 307, 370, 445, 750, 771, 814` is the hibernation-safe
  iteration primitive.
- **Origin allowlist (pattern for stricter god-role gate):**
  `src/server/room.ts:152-164`. Close code `4003` is the existing
  "forbidden origin" code and is the one god-role reuses for public-
  internet rejections; `4001` at `:172` is "room full" and MUST NOT be
  reused for god-auth (close-code collision — minor fix row in review).
- **Inbound message cap (definitional, NOT outbound):**
  `src/server/validation.ts:13` (`MAX_MESSAGE_BYTES = 4096`),
  `:27-29` (`messageByteLength` helper). Workers outbound is 1 MiB —
  different budget, relevant to Unit 6 size assertion.
- **Env precedent:** `docs/plans/_archive/engine-build/phase-6-hardening-deploy.md:586-592`.
- **Sentinel regression test precedent:** E-03 in
  `docs/testing/E2E-ISSUE-LIST.md`.
- **Timer generation pattern:**
  `docs/insights/005-stale-timers-need-generation-counters.md`.
- **Memory landmine:** `project-burned-workers-entry-no-exports.md` —
  `room.ts` may only export `GameRoom` (helpers live in
  `src/server/validation.ts` or new modules like
  `src/server/god-projection.ts`).
- **Serial action queue:** `src/server/room.ts:721-742` (`enqueue`
  wrapper + per-task error recovery).
- **Private event field contract:** `src/server/projection.ts:217-241`
  (`stripPrivateEventFields`). Two current cases: `combo-steal.cardType`
  at `:222-230`, `card-drawn.cardType` at `:231-238` (E2E audit
  2026-04-23 P0 fix).
- **Viewer-gated named-steal projection:**
  `src/server/projection.ts:133-156` (`projectNopeWindow`),
  `:165-183` (`augmentNopeWindowForPlayer`). Viewer gate at `:174`.
- **Per-viewer projection contract (from Phase 1):** R7 declared at
  `docs/plans/playtest-harness/phase-1-scenarios.md:78-84`, concrete gap
  called out at `phase-1-scenarios.md:958-967`. `PlayerView` at
  `src/shared/protocol.ts:127`, `BoardView` at `src/shared/protocol.ts:99`.
- **Wrangler CI gate precedent:** the existing
  `scripts/verify-prod-bundle.ts` is the pattern for a CI-executed
  assertion. Extend with a `wrangler.jsonc` parse step to assert the
  production `vars` block does NOT include `PLAYTEST_MODE` /
  `PLAYTEST_TOKEN`. See Documentation / Operational Notes.
- **`/health` route + version stamp (Unit 1b):** intercept GET
  `/health` in the Worker default-export `fetch` handler before
  partyserver routing. Response uses `PROTOCOL_VERSION` from
  `src/shared/protocol.ts` for the `version` field and
  `isPlaytestMode(env)` (Unit 1) for the informational `playtest`
  flag. Consumed by phase-3 Unit 3 as the wrangler+DO ready probe in
  place of polling the bare `/`. Ships in all builds.
