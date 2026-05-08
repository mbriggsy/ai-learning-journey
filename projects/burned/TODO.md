# BURNED — TODO

Operator's queue. Actionable items only. **Not a diary** — git log has the
history. (Rule: `feedback-todo-is-not-a-diary.md`.)

---

## 1. Active priorities — pick one

Solo-doable, ranked:

1. **Fix the playtest harness** — see §2 below. The harness was discovered
   half-broken on 2026-05-07; this is the largest unowned workstream and it
   was not surfaced in any prior session's "actionable next." Treat as
   default priority until §2 is closed or explicitly deferred again.
2. **Live mid-play state verification** — `tests/e2e/arena-states.spec.ts`.
   Drive `window.__gameStore` to force each state, screenshot for couch
   eyeball: Nope window mid-countdown, all DramaOverlay variants, Favor
   banner + staging, Triple-steal name-card sheet, FuturePeek read-only +
   rearrange. Output to `temp/arena-states/`. ~3-4h.
3. **Resume burned card escort-concept via NBP** when
   `gemini-3-pro-image-preview` stops 503ing. Script + base image staged at
   `scripts/edit-burned-door-nbp.ts`. Probe before committing time —
   external blocker, not engineering work.
4. **Visual rows brief for couch design calls** — capture before/after
   screenshots of the 4 carryover design calls in §3 below (drama beat
   tonal hierarchy, FuturePeek swipe, board nope-countdown legibility,
   StealReport stamp occlusion of `Case 47-B`) so Briggsy can verdict each
   from the couch.

E2E-ISSUE-LIST 🔴 cleanup is **DONE**. All red rows from the 2026-04-23
audit are closed. Remaining ⏸ rows are blocked on product/asset decisions
listed in §3.

---

## 2. Playtest harness — half-broken, surfaced 2026-05-07

**Status: stalled.** PRD locked, code built, but the harness has not
produced a clean run since 2026-05-01 and the operator workflow was lost.
This was hidden inside the TODO journal until tonight.

### State of the world

- **PRD locked** at `docs/testing/PLAYTEST-HARNESS-PRD.md` — v0.2,
  2026-04-23.
- **Phases 1-6 built.** Phase 7 deferred 2026-05-06 based on a misread of a
  broken-launch run (operator-step skip; not a real Phase-6 conclusion).
- **`docs/testing/playtest/SCENARIOS.md` is still DRAFT** — never
  signed off. Lock is a real prerequisite (line 3: "Lock status: DRAFT —
  pending Briggsy sign-off"). 35 H3 scenarios + 55 H4 = 90 entries.
- **6 of the last 10 runs failed to launch any seats** — empty `seats/`
  dir, orchestrator timed out at 60min waiting for `agents-done.marker`.
  Last failed run: `docs/testing/playtest/runs/2026-05-06-2338-2p/`.
  Diagnosed root cause: the operator (the Claude conversation that runs
  `pnpm playtest:run`) must read `<runDir>/agent-specs.manifest.json` and
  Agent-dispatch `playtest-seat-N` per entry. This step was missed on most
  runs. See `scripts/playtest/run-session.ts:208-212`.
- **3 working runs produced 35 issue files; 11 still OPEN:**
  - 9 OPEN in `docs/testing/playtest/runs/2026-04-29-2139-3p/issues/` —
    22 issues (2 RESOLVED, 3 LOW-SIGNAL, 8 KNOWN-PRODUCT-CALL, 9 OPEN).
  - 2 OPEN in `docs/testing/playtest/runs/2026-05-01-1654-3p/issues/` —
    10 issues (1 RESOLVED, 2 LOW-SIGNAL, 5 KNOWN-PRODUCT-CALL, 2 OPEN).

### Harness defects to fix

1. **Silent-timeout-looks-like-success.** `pnpm playtest:run` on
   2026-05-06-2338-2p exited with `outcome: success` despite 0 seats
   joined, 0 issues, 0 fires. Should hard-fail with a distinct outcome.
   ~5-line change in `scripts/playtest/lib/orchestrator.ts` —
   detect `expectedSeats > 0 && seatsJoined === 0` and set
   `outcome: 'failed-launch'`.
2. **Coverage aggregator never fires non-zero** even on working runs that
   produced 22 issues. Counter layer is disconnected from agent-logged
   fires. Investigate `coverage-reporter.ts` vs the seat-log fire stream.
3. **Catalog drift.** Production catalog has 90 scenarios; pre-flight
   calibration uses `scripts/playtest/fixtures/mini-catalog.md` (6 entries
   only). Determine whether mini-catalog is supposed to be the canonical
   pre-flight target or is now stale; align coverage report numbers.

### Missing operator skill

- No `/playtest-run` skill or slash command exists. Procedure lives only
  in comments at `scripts/playtest/run-session.ts:208-212`. End state: a
  skill that codifies (a) start orchestrator, (b) wait for
  `agent-specs.manifest.json`, (c) parallel-Agent-dispatch the
  `playtest-seat-N` agents, (d) touch `agents-done.marker` when seats
  exit. Until this skill exists, every operator that runs the harness
  re-discovers the gap.

### Sequenced fix path

1. Add `outcome: 'failed-launch'` exit in orchestrator (defect #1).
2. Write the `/playtest-run` skill (codify the manifest → dispatch →
   marker dance).
3. Run a real session against current main; produce a working run; verify
   coverage aggregator actually counts fires (defect #2).
4. Resolve catalog drift (defect #3) with whatever the working-run number
   tells us about the right pre-flight target.
5. Triage the 11 OPEN issues from prior runs (now reachable with a working
   harness).
6. Get Briggsy to sign off SCENARIOS.md → flip status: DRAFT → LOCKED.

---

## 3. Carryover requiring Briggsy

Only Briggsy can do these.

- **Real-device playtest** — iPad Pro 1366 + 4-8 phones. Verify
  triple-steal deferred commit, Favor staging, discard hero from couch,
  Burned two-beat on non-drawer phones, Emil press-feedback on phone +
  TV, Nameplate flip 400ms vs 250ms, perspective 1000px vs 600px.
- **8-player stress test** — PlayerStrip layout at max count on real TV;
  COMMS scroll under event volume; nameplate legibility from couch;
  verify tile growth at 1920 + 4K beyond the 1366×1024 baseline.
- **Physical hardware verification** — push to Cloudflare Pages, open on
  actual TV with phone controllers.
- **Canonical 200% zoom human-run pass** (spec §2.3 protocol).
- **First-time-player session** (spec Phase 5 §2.7).
- **Visual review meeting** (spec §2.2.5) — GameOver glow, Nope emerald
  saturation, Baveuse font, drama-accent CARD FACE inspection (Reassign /
  Direct Order / Go Dark / Intel Briefing / Falsify Intel / Burn the
  Files / Back Channel — §2.5 #4 WCAG residual lives there).
- **Sign off `docs/testing/playtest/SCENARIOS.md`** — still DRAFT
  (line 3). Hard prereq for closing §2.
- **Couch design calls from the 2026-05-07 eyeball pack:**
  - Drama beat tonal hierarchy.
  - FuturePeek swipe affordance.
  - Board nope-countdown legibility from couch distance.
  - StealReport stamp occlusion of `Case 47-B`.

Remaining ⏸ rows in `E2E-ISSUE-LIST` (C-13, C-15, C-16-19) are blocked on
product/asset decisions, not engineering — surface in a visual review.

---

## 4. Landmines (still relevant)

Active warnings only. Older landmines have moved to `docs/insights/` and
`CLAUDE.md`.

- **`LobbyView.hostConnected: boolean` is now REQUIRED** on the
  server-projected lobby view. New lobby-view fixtures must include
  `hostConnected: true|false`.
- **`host-connect` payload may carry `sessionToken?: string`** (B-01).
  Optional in Zod (`z.string().uuid().optional()`); board clients mint a
  UUID via `getOrCreateHostSessionToken()`. Old clients that don't send
  fall through to no-token branch.
- **WS close code `4002`** reserved for E-08 identify-timeout closures.
  Don't reuse.
- **`hostSession` persists across DO restarts** via `ctx.storage`. Clear
  in storage AND in-memory if you ever need to forcibly evict a host.
- **Zod v4 strictly enforces RFC 4122 v4 UUID** version + variant bits.
  Test fixtures need real-shaped UUIDs (not all-1s patterns).
  `crypto.randomUUID()` produces conforming output.
- **`PROTOCOL_VERSION = 5`** (was 4). Hard-refresh dev tabs after pulling
  the B-12 fix. `protocolVersion?: number` on the `join` payload —
  optional in Zod so old clients hit `PROTOCOL_MISMATCH` not a generic
  Zod failure.
- **Sheet button race-class convention.** Every sheet with a terminal
  action button (NameCard, FuturePeek, DefusePlacement, TargetSelect)
  uses the two-track guard pattern: sync `submittedRef` + async
  `submitted` state. New sheets follow the same shape.
- **Audit pattern catch.** Fix commits should cite the issue ID in the
  subject line (`fix(...): close X-NN — summary`). Topic-only refs
  (`"TODO #11"`) hide commits from `E2E-ISSUE-LIST` git-grep audits.
- **`scripts/playtest/run-session.ts:208-212`** documents the operator's
  responsibility for the agent-dispatch dance. Until §2's `/playtest-run`
  skill exists, this comment is the only mention of the step that breaks
  6 of every 10 runs.
