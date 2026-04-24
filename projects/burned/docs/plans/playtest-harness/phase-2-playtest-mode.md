---
title: "Playtest Harness — Phase 2: Playtest-Mode Server Hooks"
type: feat
status: draft
date: 2026-04-23
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
- **Dispatch + broadcast seam:** `src/server/room.ts:615-627` `handleAction`
  and `room.ts:661-665` `dispatchServerAction` both have `result.events`
  ready after `dispatch` returns. god-event broadcast sits right next to
  the existing player-broadcast.
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
- **D4. God-event is a new server→client WS message type.** Payload:
  `{ type: 'god-event', action, events, stateVersion, nowMs, projections:
  Record<playerId, PlayerView>, boardView: BoardView }`. Broadcast after
  every successful `dispatch` in playtest mode only. Normal player
  projections continue unchanged. Orchestrator opens a god-role connection
  (see D5) and subscribes. The `projections` map carries, for every seated
  player (including eliminated-but-connected spectators), the exact
  `PlayerView` that seat would see via `projectForPlayer` at the same
  dispatch moment — NOT a god-mode view. `boardView` is the TV projection
  via `projectForBoard`. Phase 1 §System-Wide Impact (lines 958-967)
  declares this contract as R7 and Phase 3's scenario-fire detector
  consumes the per-viewer snapshots to verify `projection-assertions:`
  scenarios. `PlayerView` + `BoardView` types are imported from
  `src/shared/protocol.ts` (lines 99, 127).
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

## High-Level Technical Design

> *Directional guidance for review, not implementation specification. Treat
> signatures and literals as illustrative.*

### Env + config flow

```text
wrangler.jsonc (vars.PLAYTEST_MODE = "1" only in playtest deploys)
    │
    ▼
env.PLAYTEST_MODE on Env interface
    │
    ▼
GameRoom constructor or first-connection hook
    │  reads once, caches: this.isPlaytest: boolean
    │  caches: this.playtestToken = env.PLAYTEST_TOKEN
    │
    ▼
accepts 'role=god&token=<T>' connections when isPlaytest
    │  refuses when !isPlaytest OR token mismatch
    ▼
god connection sends { type: 'playtest-config', seed, nopeWindowMs }
    │  server validates, stores { seed, nopeWindowMs } on GameRoom instance
    │  rejects if game already started
    ▼
subsequent makeDispatchContext() reads instance config
    │  injects seed → ctx.random = mulberry32(seed)
    │  injects nopeWindowMs → ctx.nopeWindowMs = nopeWindowMs
    ▼
engine.getNopeWindowDuration(ctx, alivePlayerCount)
    │  returns ctx.nopeWindowMs ?? NOPE_WINDOW_MS[tierFor(alivePlayers)]
```

### Dispatch + god-event broadcast

```text
handleAction(msg, connection)
  → enqueue(dispatch + side effects)
      │
      ▼
  result = dispatch(state, action, ctx)
  if (result.ok) {
      state' = result.state
      events = result.events
      broadcastToPlayers(state', events)       // unchanged
      if (this.isPlaytest) {
          // Per-viewer projection broadcast (Unit 6a). For every seated
          // player in state'.players, call projectForPlayer to produce the
          // exact PlayerView that seat would see at this dispatch moment.
          // projectForBoard produces the boardView. Both already honor the
          // allowlist projection + card-identity privacy rules; reusing
          // them guarantees god-events cannot accidentally leak more than
          // a seat would see.
          projections: Record<playerId, PlayerView> = {}
          for (p of state'.players) {
              projections[p.id] = projectForPlayer(state', p.id)
          }
          boardView: BoardView = projectForBoard(state')
          broadcastToGodConnections({
              type: 'god-event',
              action, events,
              stateVersion: state'.version,
              nowMs: ctx.now,
              projections,
              boardView,
          })
      }
  }
```

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

**Goal:** Add `PLAYTEST_MODE` + `PLAYTEST_TOKEN` to the `Env` interface and
`wrangler.jsonc` example values. Introduce a `src/server/playtest.ts` module
that reads and caches the flag/token and exposes `isPlaytestMode(env)` +
`matchesToken(env, token)`.

**Execution note:** Test-first. The playtest module is small, pure, and the
unit test gates the entire phase against accidental prod leaks.

**Requirements:** R4

**Dependencies:** None.

**Files:**
- Create: `src/server/playtest.ts`
- Create: `src/server/playtest.test.ts`
- Modify: `src/server/room.ts` — add `PLAYTEST_MODE` + `PLAYTEST_TOKEN` to
  the `Env` interface (around line 934).
- Modify: `wrangler.jsonc` — add commented `vars` example + note that
  playtest deploys override.
- Modify: `.env.example` — document local playtest usage.

**Approach:**
- `isPlaytestMode(env)` returns `env.PLAYTEST_MODE === '1'`. Explicit string
  match, not truthy check.
- `matchesToken(env, provided)` constant-time compare.
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

**Verification:**
- All tests pass.
- Typecheck clean.
- `src/server/room.ts:934` `Env` interface declares both fields.

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

- [ ] **Unit 4: Accept `role=god` connections with token gate**

**Goal:** `GameRoom.onConnect` (or the connection-accept path) recognizes
`role=god&token=<T>` query params. When `isPlaytestMode` is true AND token
matches, the connection is tagged as `role: 'god'` and added to a dedicated
`godConnections` set. Otherwise rejected with `4001` close code (policy
violation).

**Execution note:** Test-first. Token gate is security-critical.

**Requirements:** R3, R4

**Dependencies:** Unit 1.

**Files:**
- Modify: `src/server/room.ts` — connection-accept handler.
- Modify: `src/server/validation.ts` — add `GodConnectionParams` Zod
  schema if query parsing is validated here.
- Create: `src/server/god-connection.test.ts` — focused tests on the
  accept/reject decision.

**Approach:**
- Query param parsing: `role=god` + `token=<value>`.
- Server rejects if playtest mode off, regardless of token presence.
- Server rejects if token missing or mismatched.
- God connections do not count toward `MAX_PLAYERS` or `MAX_CONNECTIONS`.
  Tracked separately to avoid breaking player caps.
- God connections never receive `state-update` projections — only
  `god-event` messages. Players never receive `god-event`.
- Close code `4001` for "auth failure" (policy-specific, not the standard
  WebSocket close codes which start at 4000 in the app-reserved range).

**Patterns to follow:**
- Existing origin-check in `room.ts:155-164`.
- Existing rate-limit rejection pattern.

**Test scenarios:**
- Happy path: playtest mode on + matching token → accept, tagged `god`.
- Error path: playtest mode off + anything → reject with 4001.
- Error path: playtest mode on + missing token → reject.
- Error path: playtest mode on + mismatched token → reject.
- Edge case: multiple concurrent god connections → all accepted; all
  receive god-events.
- Integration: god connection does not appear in `state.players`.

**Verification:**
- New test file passes.
- Integration test in `tests/e2e/` optional but not required (god role is
  orchestrator-only; e2e covers player flow).

- [ ] **Unit 5: `playtest-config` admin message from god connection**

**Goal:** Accept a pre-game `{ type: 'playtest-config', seed, nopeWindowMs }`
message from a god connection. Store on `GameRoom` instance. Reject after
game has started.

**Execution note:** Test-first.

**Requirements:** R1, R2, R3, R5

**Dependencies:** Unit 4.

**Files:**
- Modify: `src/server/room.ts` — god-connection message handler.
- Modify: `src/server/validation.ts` — `PlaytestConfigSchema`.
- Create: `src/server/playtest-config.test.ts`.

**Approach:**
- Zod schema: `{ type: 'playtest-config', seed: int ≥ 0, nopeWindowMs: int
  > 0 with sane upper bound (≤ 30 minutes) }`.
- Handler only accepts from god connections. Player connections rejected
  silently (log only).
- Before game start (`state.phase === 'lobby'` or absence of game) only.
- After config stored, `makeDispatchContext` (Unit 3) will read it.

**Patterns to follow:**
- Existing Zod-validated message handlers in `room.ts`.

**Test scenarios:**
- Happy path: god sends config pre-game → stored; next dispatch ctx sees
  seed + nopeWindowMs.
- Error path: sent post-start → rejected; existing config preserved.
- Error path: sent by player connection → ignored.
- Error path: malformed payload (negative seed, missing nopeWindowMs) →
  Zod reject.
- Edge case: config sent twice pre-start → second overrides first (explicit
  reconfig allowed).

**Verification:**
- Config round-trips: send → dispatch → ctx reflects values.
- Reconfig pre-start works; post-start rejected.

- [ ] **Unit 6: Broadcast `god-event` WS message on every successful dispatch**

**Goal:** After `handleAction` and `dispatchServerAction` succeed, when
`isPlaytestMode`, broadcast a `god-event` to all god connections carrying
`{ type: 'god-event', action, events, stateVersion, nowMs, projections,
boardView }`. The `projections` / `boardView` fields are computed by Unit
6a immediately before the broadcast.

**Execution note:** Test-first integration-style.

**Requirements:** R3

**Dependencies:** Units 4, 5.

**Files:**
- Modify: `src/server/room.ts` — both dispatch sites (lines 615-627 and
  661-665).
- Create: `src/server/god-broadcast.test.ts` — end-to-end: open a god
  connection, dispatch a player action, assert god connection received the
  correct event.

**Approach:**
- After `result.ok` is confirmed, in playtest mode only, iterate
  `godConnections` and `conn.send(JSON.stringify(godMsg))`.
- Respect the 4KB byte cap (use `TextEncoder`, per E-02). If event payload
  exceeds 4KB (unlikely but possible on multi-event dispatches), split by
  event or drop with a warning — decide in implementation; flag for Phase 3.
- `action` in the message is the `EngineAction` (server-injected
  `playerId`), not the raw client action.

**Patterns to follow:**
- Existing broadcast loops in `room.ts`.
- E-02 byte-cap fix (`validation.ts:27-29`).

**Test scenarios:**
- Happy path: player plays a card → god connection receives `god-event`
  with correct action + events array + stateVersion + projections map
  (one entry per seated player) + boardView.
- Edge case: playtest mode off → no god-event sent (and no god connections
  accepted per Unit 4).
- Edge case: successful dispatch with `result.events === []` → still
  broadcast (action alone is informative; projections + boardView still
  populated).
- Edge case: failed dispatch (`result.ok === false`) → no god-event.
- Edge case: multiple god connections → all receive.
- Integration: seat projection (existing `state-update`) goes to players
  only; god-event goes to god only. No cross-contamination.

**Verification:**
- Playwright or Vitest-driven integration test passes.
- No new entries in player-facing message types (god-event never leaves
  server except to god role).

- [ ] **Unit 6a: Per-viewer projection broadcast**

**Goal:** Compute the `projections: Record<playerId, PlayerView>` map and
`boardView: BoardView` that Unit 6 attaches to every `god-event`. Per
phase-1 R7 + §System-Wide Impact (lines 958-967), each entry in
`projections` is the exact `PlayerView` that seat would see — not a god-
mode view. `PlayerView` and `BoardView` are imported from
`src/shared/protocol.ts` (lines 127 and 99 respectively).

**Execution note:** Test-first. The invariant being proved is that the
god-event never carries more information to a given viewer than that
viewer would legitimately see via the existing `state-update` broadcast.
Reusing `projectForPlayer` / `projectForBoard` is what guarantees this —
Phase 3's detector can trust the snapshot because the same code produced
it that produces the live seat view.

**Requirements:** R3 (phase-2) + phase-1 R7 (downstream contract).

**Dependencies:** Unit 6.

**Files:**
- Modify: `src/server/room.ts` — at both dispatch sites (lines 615-627
  and 661-665), immediately before the `broadcastToGodConnections` call
  added in Unit 6, compute `projections` and `boardView`.
- Create: `src/server/god-projection.test.ts` — unit test that calls the
  helper directly and asserts allowlist + privacy invariants.

**Approach:**
- Add a helper (named export from a new module, NOT from `room.ts` per
  the room-exports landmine) e.g. `src/server/god-projection.ts`
  exporting `buildGodProjections(state): { projections: Record<playerId,
  PlayerView>, boardView: BoardView }`.
- Inside, iterate `state.players` (including eliminated-but-seated
  spectators — they still receive full `PlayerView` broadcasts per the
  engine invariant cited in CLAUDE.md). For each, call
  `projectForPlayer(state, player.id)` at `src/server/projection.ts:54`.
  Call `projectForBoard(state)` at `src/server/projection.ts:11` for the
  TV view.
- Do NOT spread `state` into the envelope, do NOT synthesize a custom
  per-viewer view, do NOT call any private engine helper that bypasses
  projection. The allowlist pattern + `stripPrivateEventFields` +
  `augmentNopeWindowForPlayer` viewer-gate are the privacy contract;
  going around them reintroduces E-01 class leaks.
- Disconnected-but-seated players: include them in the map (same
  `projectForPlayer` call). Spectator view is explicitly in scope per
  phase-1 D5 row 5.

**Patterns to follow:**
- `src/server/projection.ts` existing functions — reuse, do not
  re-implement.
- Allowlist projection pattern per CLAUDE.md "Security Conventions".

**Test scenarios:**
- Happy path: 4-player mid-game state → `projections` map has 4 entries
  keyed by playerId; each entry equals `projectForPlayer(state,
  playerId)` exactly (structural equality).
- Happy path: `boardView` equals `projectForBoard(state)` exactly.
- Privacy invariant (ACTOR): for a state with a pending named-steal,
  `projections[stealerId].nopeWindow.namedSteal.namedCardType` is
  populated (matches phase-1 Unit 4 `projection-assertions:` field path
  at phase-1 line 670).
- Privacy invariant (TARGET): same field populated on
  `projections[targetId]` — viewer-gated branch at
  `src/server/projection.ts:174` fires for target.
- Privacy invariant (OTHER-ALIVE): same field ABSENT on
  `projections[otherAliveId]` — viewer gate rejects non-stealer non-
  target.
- Privacy invariant (private event fields): for a combo-steal event,
  assert `projections[otherAliveId].events` does not contain the stolen
  `cardType` — `stripPrivateEventFields` at
  `src/server/projection.ts:217` must have run.
- Spectator: eliminated-but-connected player's projection entry present,
  `myHand` returns `player?.hand ?? []` per `projection.ts:78` + `:96`.
- Disconnected player: included in map; `BoardPlayer.isConnected: false`
  round-trips.
- Regression: playtest mode off → helper never called (Unit 6 gate).

**Verification:**
- All test scenarios pass.
- `buildGodProjections` is a pure function of `state` — no I/O, no
  mutation. Verified by a property test: calling twice with same state
  returns structurally equal results.
- The invariant "god-event contents for viewer V equals what V's
  `state-update` contains" is proved structurally by the reuse of
  `projectForPlayer` / `projectForBoard`; the dedicated test asserts
  this explicitly for a named-steal fixture.
- Phase 3's detector can consume `god-event.projections[viewerId]` and
  `god-event.boardView` as the source-of-truth snapshot for
  `projection-assertions:` scenarios per phase-1 R7.

- [ ] **Unit 7: Prod-bundle sentinel regression test**

**Goal:** Build the worker bundle without `PLAYTEST_MODE` set and assert
that sentinel strings (`'god-event'`, `'playtest-config'`, `'role=god'`)
do not appear in the output.

**Requirements:** R4

**Dependencies:** Units 1-6.

**Files:**
- Modify: `scripts/verify-prod-bundle.ts` — extend existing verifier with
  playtest sentinels.
- Modify: `package.json` — ensure `pnpm verify:bundle` covers this.
- Create: `src/server/playtest-sentinels.test.ts` — runs the verifier as a
  test so CI + `pnpm test` catches regressions.

**Approach:**
- Mirror E-03's `__gameStore` sentinel check. Grep `dist/**/*.js` (or the
  wrangler output — confirm actual dist path) for each sentinel.
- Fail if any sentinel found.
- Provide clear error message pointing to which sentinel leaked and which
  guard likely failed.

**Patterns to follow:**
- `scripts/verify-prod-bundle.ts` existing structure.
- E-03 in `E2E-ISSUE-LIST.md`.

**Test scenarios:**
- Happy path: production build → all sentinels absent → test passes.
- Error path: deliberately remove a guard (local only) → test fails with
  actionable message.
- Integration: runs inside `pnpm test` and `pnpm verify:bundle`.

**Verification:**
- `pnpm build && pnpm verify:bundle` exits 0.
- Running the test with a sabotaged guard fails loudly.

- [ ] **Unit 8: Smoke test — full playtest round trip**

**Goal:** End-to-end proof that Phase 2 works: boot wrangler dev with
`PLAYTEST_MODE=1`, connect as god, send config with seed=42 +
nopeWindowMs=60000, have a test player play one card, assert god connection
received the god-event, and stop.

**Requirements:** R1, R2, R3, R5

**Dependencies:** Units 1-6.

**Files:**
- Create: `scripts/playtest/phase2-smoke.ts` — runs wrangler dev, opens a
  WS god connection, asserts one god-event, shuts down.
- Modify: `package.json` — add `pnpm playtest:smoke` script.

**Approach:**
- Spawn a one-shot smoke against a real dev server.
- Use `partysocket` or raw WS client — whichever is simpler for a script.
- Not a Vitest test — a standalone verification. Vitest handles unit
  behavior; this is the "actually works end to end" gate.

**Patterns to follow:**
- `scripts/launch-dev-chrome.ts` process-spawn style.

**Test scenarios:**
- Happy path: smoke script exits 0 after verifying one god-event carrying
  `projections` (one entry per seated player, keyed by playerId) and
  `boardView`.
- Error path: if `PLAYTEST_MODE` unset, smoke script exits non-zero with
  instructions to set the flag.
- Invariant check: for the one observed god-event, assert
  `projections[<test-player-id>]` is structurally equal to that player's
  most recent `state-update` payload (confirms Unit 6a reuse of
  `projectForPlayer` worked end-to-end).

**Verification:**
- `pnpm playtest:smoke` green locally against `pnpm dev:server`.

## System-Wide Impact

- **Interaction graph:** New WS message type `god-event` (server → god
  role) carrying `{ type, action, events, stateVersion, nowMs,
  projections: Record<playerId, PlayerView>, boardView: BoardView }`. New
  admin message `playtest-config` (god role → server). No changes to
  existing player ↔ server messages. Phase 1 R7 (lines 958-967) declares
  the `projections` + `boardView` fields as the canonical shape; Phase 3's
  detector consumes them.
- **Error propagation:** Malformed `playtest-config` → Zod reject, WS stays
  open. Malformed god auth → connection rejected 4001.
- **State lifecycle risks:** `playtestSeed` + `playtestNopeWindowMs` are
  instance state on the `GameRoom`. Hibernation must persist them OR
  orchestrator must resend `playtest-config` on re-hydrate. Decision: keep
  them ephemeral; if a room hibernates mid-session, the orchestrator's
  reconnect logic re-sends config. Cheaper than persisting. If game-in-
  progress hibernation is a real concern, Phase 3 will revisit.
- **API surface parity:** Prod clients never see god-event. Prod builds
  verified by Unit 7.
- **Integration coverage:** Unit 8 smoke + Unit 6 god-broadcast integration
  prove the full path.
- **Unchanged invariants:** Existing player protocol, all engine rules,
  state projection allowlist, 4KB message cap, rate-limit, origin check,
  pure dispatch, serial action queue, CSPRNG-by-default for production.
  Unit 6a relies on the allowlist projection + card-identity privacy
  rules remaining intact: it reuses `projectForPlayer` and
  `projectForBoard` rather than synthesizing a new view, so any change
  to the projection contract propagates into god-events automatically.

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Env-flag read path has a bug and playtest code executes in prod | Unit 1 tests the read paths exhaustively. Unit 7 prod-bundle test catches sentinel leaks. Token gate (Unit 4) is a second defense even if flag leaks. |
| God-event payload exceeds 4KB | Unit 6 acknowledges and flags for Phase 3 (orchestrator chunking). Default events-array size is small; 4KB is generous. **Updated with Unit 6a:** adding `projections: Record<playerId, PlayerView>` + `boardView: BoardView` multiplies payload by N+1 viewers. At 10 players with full mid-game state the envelope likely exceeds 4KB. Server's 4KB cap is for INBOUND messages (`validation.ts:27-29`); outbound god-events are not capped the same way. Flag for Phase 3 verification — if outbound caps exist, Unit 6a splits per-viewer into multiple messages keyed by the same `stateVersion`. |
| Unit 6a diverges from live `state-update` projection | Unit 6a MUST call the same `projectForPlayer` / `projectForBoard` functions that the live broadcast uses. Regression test in `god-projection.test.ts` asserts structural equality of `projections[viewerId]` against the `state-update` payload for that viewer. Any future projection change that touches one path and not the other is caught by this test. |
| Hibernation loses playtest config | Addressed in System-Wide Impact; orchestrator re-sends on reconnect. |
| Seeded shuffle diverges between Node-test harness and Workers runtime | Unit 3 uses mulberry32 (pure JS, identical across runtimes). LCG alternative same guarantee. |
| `TEST_TIMEOUT_SCALE` from phase-6 plan and `PLAYTEST_MODE` diverge | This phase names its own env var; if phase-6 also ships `TEST_TIMEOUT_SCALE`, they coexist (different purposes). Briggsy to decide whether to merge names later. |
| Tree-shake doesn't eliminate guarded paths in Workers build | Acceptable — Unit 7 only requires sentinel strings absent, not code branches absent. If branches linger but strings don't, prod can't activate them. |

## Documentation / Operational Notes

- Add a **Playtest Mode** section to `CLAUDE.md` describing the env flag,
  god connection shape, and the "prod must not see sentinels" invariant.
- Playtest deployments (if any — current assumption is local dev only) use a
  separate Worker binding with `PLAYTEST_MODE=1` + a distinct `PLAYTEST_TOKEN`
  generated per session.
- Operational: rotating the token invalidates live orchestrator connections.
  Out of scope for v1; flagged for Phase 3.

## Sources & References

- **Origin:** [docs/testing/PLAYTEST-HARNESS-PRD.md](../../testing/PLAYTEST-HARNESS-PRD.md)
- **Parent roadmap:** [docs/plans/playtest-harness/roadmap.md](./roadmap.md)
- **RNG seam:** `src/server/room.ts:840-859`, `src/server/game/engine.test.ts:9-22`
- **Nope window source:** `src/server/game/engine.ts:1301-1329`,
  `src/shared/constants.ts:6-10`
- **Dispatch sites:** `src/server/room.ts:615-627`, `661-665`
- **Env precedent:** `docs/plans/_archive/engine-build/phase-6-hardening-deploy.md:586-592`
- **Sentinel regression test precedent:** E-03 in
  `docs/testing/E2E-ISSUE-LIST.md`
- **Timer generation pattern:**
  `docs/insights/005-stale-timers-need-generation-counters.md`
- **Memory landmine:** `project-burned-workers-entry-no-exports.md` —
  room.ts may only export `GameRoom`.
- **Per-viewer projection contract (from Phase 1):** R7 declared at
  `docs/plans/playtest-harness/phase-1-scenarios.md:78-84`, concrete gap
  called out at `phase-1-scenarios.md:958-967`. `PlayerView` at
  `src/shared/protocol.ts:127`, `BoardView` at `src/shared/protocol.ts:99`.
  `projectForPlayer` at `src/server/projection.ts:54`, `projectForBoard`
  at `src/server/projection.ts:11`. Viewer-gated named-steal projection
  at `src/server/projection.ts:165-183` (gate on :174). Private-event
  stripping at `src/server/projection.ts:217-241`.
