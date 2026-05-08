# BURNED — TODO

Operator's queue. Actionable items only. **Not a diary** — git log has the
history. (Rule: `feedback-todo-is-not-a-diary.md`.)

---

## 1. Active priorities — pick one

Solo-doable, ranked:

1. **Decide §2.2 + §3.2.** Two short product calls unblock the last
   two items from the 2026-05-08 harness sweep. See those sections
   below.
2. **Live mid-play state verification** — `tests/e2e/arena-states.spec.ts`.
   Drive `window.__gameStore` to force each state, screenshot for couch
   eyeball: Nope window mid-countdown, all DramaOverlay variants, Favor
   banner + staging, Triple-steal name-card sheet, FuturePeek read-only +
   rearrange. Output to `temp/arena-states/`. ~3-4h.
3. **RESOLVED-BY-SIDE-EFFECT triage sweep — partial complete 2026-05-08.**
   6 of 12 OPEN issues closed across two runs. Remaining 6 cluster as
   two work items:
   - **5× uncatalogued-scenario family** at
     `runs/2026-04-29-2139-3p/issues/` (#001, #002, #003, #011, #018) —
     seat agents fired non-catalog scenario IDs (`SESSION-START`,
     `GAME-START-OBSERVATION`, `TURN-TRANSITION-SEAT1-TO-SEAT2`,
     `INTERCEPT-WINDOW-OBSERVED-SEAT1-TURN`). Single fix: extend the
     seat-prompt or log-schema validator to reject `scenarioId` not in
     SCENARIOS.md catalog. Pair with optional Option A in selected
     issues — add catalog entries for the legitimate observed mechanics
     (turn-advance, OTHER-alive nope-window). ~1-2h.
   - **1× needs Briggsy eyeball** at
     `runs/2026-05-01-1654-3p/issues/008-scn-burned-draw-axis11-01.md` —
     Burned-draw ACTOR drama beat presence/conflation question; Option C
     recommends real-device verification before A vs B fork. Add to §4.
   Triage issue summaries are now tracked in git
   (`runs/*/issues/*.md`), so closures survive `pnpm playtest:purge`.
4. **Resume burned card escort-concept via NBP** when
   `gemini-3-pro-image-preview` stops 503ing. Script + base image staged at
   `scripts/edit-burned-door-nbp.ts`. Probe before committing time —
   external blocker, not engineering work.
5. **Visual rows brief for couch design calls** — capture before/after
   screenshots of the 4 carryover design calls in §4 below (drama beat
   tonal hierarchy, FuturePeek swipe, board nope-countdown legibility,
   StealReport stamp occlusion of `Case 47-B`) so Briggsy can verdict
   each from the couch.

E2E-ISSUE-LIST 🔴 cleanup is **DONE**. All red rows from the 2026-04-23
audit are closed.

The 2026-05-08-0935 harness sweep is **DONE** — see §2 + §3 for the
single open product call in each.

---

## 2. Gameplay bugs from 2026-05-08 harness run — closed except §2.2

Run dir: `docs/testing/playtest/runs/2026-05-08-0935-3p` (gitignored —
`pnpm playtest:purge --session-id 2026-05-08-0935-3p` when done).

- ✅ **§2.1 + §2.6 stealer-side reveal** — fixed in `ff31990d`.
  StealReport now matches both viewer roles; closed both pair-steal
  silent and triple-steal whiff feedback gaps in one shape.
- 🟡 **§2.2 nope-window observer info gap** — **needs Briggsy.**
  Decision required: should observers (non-target, non-actor) see the
  played card type during the nope window, or stay opaque so only the
  direct target sees it? 4× confirmed across runs that observers can't
  make informed Intercept decisions today. Privacy vs. clarity tradeoff
  — engineering can't pick. Once decided, fix lives at
  `src/server/projection.ts:165-183` (allowlist projection edge).
- ✅ **§2.3 Direct Order self-target** — fixed in `c961a1f1`. Card text
  said "ANY operative", engine accepts, UI was filtering self at
  `Player.tsx:514`. Conditional self-permit on
  `localTargetMode.reason === 'direct-order'`.
- ✅ **§2.4 Back Channel deck position** — closed-no-fix in `3e6c0125`.
  Engine traces correctly: S3 drew their own Burned that they had
  Extraction-placed at the bottom 33 god-events earlier. Agent missed
  their own placement + the N-1 Burned cards rule. Insight 053
  documents the audit pattern.
- ✅ **§2.5 hand badge count** — fixed in `3b7e75d9`. Bound to
  `displayHand.length` so badge matches visible hand cards during
  staging.
- ✅ **§2.7 observer Extraction drama beat** — closed-no-fix in
  `ae31defc`. Per-rAF sampler proved both beats fire on observer phone
  with sustained peaks (3117ms flip + 2100ms EXTRACTED text); agent
  perception missed the cinematic that competed with persistent
  StatusBar text. Insight 053 amended.

---

## 3. Playtest harness — clean run achieved, residual gaps mostly closed

**Status: production-bar runs work.** First clean run with production
timings (10s nope window) completed 2026-05-08 — `runs/2026-05-08-0935-3p`
finished `outcome=success` with 18 fires + 40 triage seeds.

### Residual harness defects

- ✅ **§3.1 triage promotion (docs half)** — fixed in `b29a258d`.
  `run-session.ts` comment now documents both dispatch dances (seat
  BEFORE, triage AFTER). The auto-dispatch second half remains open;
  `createTriageLauncherDriver` exists with the marker-wait loop, just
  isn't wired in. Wire it via a new opts.waitForTriageMarker flag when
  the operator skill `/playtest-run` is built.
- 🟡 **§3.2 coverage threshold = 50 vs 18 fired** — **needs Briggsy.**
  `coverage.md` says "FAILED — primary (≥50) failed: 18" while the run
  outcome is "success". Real question: is 50 a realistic per-run target,
  or a series target? Adjust threshold OR reframe the wording in
  `scripts/playtest/lib/coverage-reporter.ts`. Engineering can't pick
  without your call on what 50 represents.
- ✅ **§3.3 viewport rotation** — fixed in `873d45e9`. Round-robin per
  seat via `i % viewports.length`. `viewportsExercised` derives from
  the actual seats array. New tests in `orchestrator.test.ts §8a`.
- ✅ **§3.4 agent-logging discipline (prompt half)** — fixed in
  `56a5a3c8`. Both seat templates carry an explicit ordering rule and
  ANTI-PATTERN bullet: write to disk BEFORE the next snapshot/action,
  not at session end. The validator-feedback half (real-time schema
  rejection back to the agent) remains open — would need a Write-tool
  hook in the harness, more than a docs change.
- ✅ **§3.5 silent-timeout-as-success** — fixed in `64ecda46`. New
  `'failed-launch'` SessionOutcome variant; `detectFailedLaunch: true`
  opt-in in run-session.ts. After driver returns clean, scans
  events.jsonl for `"game-started"` — absent → demote outcome.

### Operator skill `/playtest-run` (still missing)

Codify the seat-dispatch + triage-dispatch dances as a slash command
or skill: (a) start orchestrator, (b) wait for
`agent-specs.manifest.json`, (c) dispatch `playtest-seat-N` agents in
parallel, (d) touch `agents-done.marker` when seats exit, (e) read
`triage-specs.manifest.json` after the harness returns, (f) dispatch
`playtest-triage` agents per spec, (g) regen `INDEX.md`. Both manifests
+ both markers documented in `run-session.ts:200-235`.

---

## 4. Carryover requiring Briggsy

Only Briggsy can do these.

- **Decision: nope-window observer info policy** (gates §2.2). Show card
  type to observers, or only direct target?
- **Decision: §3.2 coverage threshold** — is 50 a per-run target or a
  series target?
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
  (line 3). Hard prereq for closing §3 fully.
- **Couch design calls from the 2026-05-07 eyeball pack:**
  - Drama beat tonal hierarchy.
  - FuturePeek swipe affordance.
  - Board nope-countdown legibility from couch distance.
  - StealReport stamp occlusion of `Case 47-B` (still open — pre-existing
    visual issue I noticed but didn't touch since it's a design call).
- **Burned-draw ACTOR drama-beat presence verification** (carryover from
  triage 05-01-1654-3p #008). Question: does the DramaOverlay `card`
  variant render as a discrete fullscreen moment before DefusePlacement
  opens, or does it visually blur into the sheet's hero card? Real-device
  eyeball decides patch (Option B — visual break) vs. rip-out (Option A —
  eager-load + bundle-budget check).

Remaining ⏸ rows in `E2E-ISSUE-LIST` (C-13, C-15, C-16-19) are blocked
on product/asset decisions — surface in a visual review.

---

## 5. Landmines (still relevant)

Active warnings only. Older landmines have moved to `docs/insights/` and
`CLAUDE.md`.

- **`detectFailedLaunch: true` is OPT-IN per call site** (commit
  `64ecda46`). `pnpm playtest:run` opts in. Tests with stubbed god (no
  events.jsonl writes) leave it off so happy-path coverage tests don't
  trip on the absence of a real game. New `'failed-launch'` is a
  legitimate `SessionOutcome` variant — handle it explicitly in any
  outcome-switching code added downstream (coverage, retention,
  reporting).
- **Viewport rotation is now per-seat** (commit `873d45e9`). With 3
  viewports configured + 3 seats, each seat gets a different shape
  (round-robin via `i % viewports.length`). Don't assume all seats
  share viewports[0] anymore. `viewportsExercised` in the session
  report now reflects the actual exercised set.
- **`createTriageLauncherDriver` exists but isn't wired** (per
  `run-session.ts` updated comment). When the operator skill lands,
  wire it via a new `opts.waitForTriageMarker` flag in
  `runSession`/`run-session.ts`. The infrastructure is ready —
  emits-spec + waits-for-marker shape mirrors the seat driver.
- **`nopeWindowMs` is now optional end-to-end** (commit `b29ba31c`).
  Series configs (2p/3p/5p/8p/10p) and `default-config.json` no longer
  carry the field. Production tier defaults from
  `src/shared/constants.ts:NOPE_WINDOW_MS` (10s flat) take over via
  engine fallthrough at `engine.ts:1332`. `calibration.json` retains an
  explicit override (10s) for legitimate calibration deviation. Adding
  the field back to a series config means "this run deviates from
  production" — make sure that's deliberate.
- **`LobbyView.hostConnected: boolean` is REQUIRED** on the
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
- **`scripts/playtest/run-session.ts:200-235`** documents the operator's
  responsibility for both dispatch dances (seat + triage). Until the
  `/playtest-run` skill exists (§3), this comment is the only mention
  of the step.
- **Pre-starting dev servers breaks the orchestrator.** `pnpm
  playtest:run` spawns its own wrangler with `PLAYTEST_TOKEN` baked in
  via `.env`. Pre-starting `pnpm dev:server` binds 8787 with no token
  → orchestrator's god-connect gets HTTP 401 → `code=4004`. Don't
  pre-start dev servers when running the harness — it owns the
  lifecycle.
