# BURNED — TODO

Operator's queue. Actionable items only. **Not a diary** — git log has the
history. (Rule: `feedback-todo-is-not-a-diary.md`.)

---

## 1. Active priorities — pick one

Solo-doable, ranked:

1. **Fix the gameplay bugs the harness just surfaced** — see §2 below.
   Production-timing harness run on 2026-05-08 (`runs/2026-05-08-0935-3p`)
   produced 18 scenario fires, 3 with-divergence captures, and 7 distinct
   gameplay findings. Two of them have now been confirmed across 4
   independent runs (last night + today's 3 seats) and are the leveraged
   work for the project right now.
2. **Fix the residual harness gaps** — see §3 below. Triage-promotion,
   coverage-threshold sanity, viewport rotation, and the agent-logging
   discipline gap. Smaller leverage than §2 but bounded fixes.
3. **Live mid-play state verification** — `tests/e2e/arena-states.spec.ts`.
   Drive `window.__gameStore` to force each state, screenshot for couch
   eyeball: Nope window mid-countdown, all DramaOverlay variants, Favor
   banner + staging, Triple-steal name-card sheet, FuturePeek read-only +
   rearrange. Output to `temp/arena-states/`. ~3-4h.
4. **Resume burned card escort-concept via NBP** when
   `gemini-3-pro-image-preview` stops 503ing. Script + base image staged at
   `scripts/edit-burned-door-nbp.ts`. Probe before committing time —
   external blocker, not engineering work.
5. **Visual rows brief for couch design calls** — capture before/after
   screenshots of the 4 carryover design calls in §4 below (drama beat
   tonal hierarchy, FuturePeek swipe, board nope-countdown legibility,
   StealReport stamp occlusion of `Case 47-B`) so Briggsy can verdict each
   from the couch.

E2E-ISSUE-LIST 🔴 cleanup is **DONE**. All red rows from the 2026-04-23
audit are closed.

---

## 2. Gameplay bugs from 2026-05-08 harness run

Findings ranked by leverage (multi-run confirmation + severity).
Run dir: `docs/testing/playtest/runs/2026-05-08-0935-3p` (gitignored —
`pnpm playtest:purge --session-id 2026-05-08-0935-3p` when done).

### 2.1 Pair-steal silent on stealer side (HIGH — confirmed 4×)

**Symptom.** Stealer fires a pair, target loses a card, stealer's hand
gains the card with **no reveal moment**. Just appears in hand. TARGET
sees the Incident Report dialog (vibe win); ACTOR sees nothing.

**Confirmed by.** Last night (run `2026-05-08-0116-3p`, seat-1 finding),
this morning seat-1 finding ("pair steals resolved invisibly … no 'you
stole X' reveal moment"), this morning seat-2 finding (same), this
morning seat-3 finding (target side reported, stealer side missing).

**Where to fix.** Stealer-side reveal currently absent. The TARGET-side
StealReport mounts at `src/client/player/components/StealReport.tsx`.
There is no symmetric stealer-side dialog. Either:
- Add a stealer-side `StealReport` variant — stealer sees what they took
  (named card or random-revealed card identity), with the same
  bureaucratic-deadpan framing as the target side.
- Or repurpose the existing component bidirectionally with a
  `viewerRole: 'stealer' | 'target'` prop.

**Acceptance test.** Pair-steal hits → stealer phone shows a dialog
naming the specific card stolen, dismissable, with vibe equivalent to
target's Incident Report.

### 2.2 Nope-window observer info gap (HIGH — confirmed 4× — 2026-04-22 PRD class)

**Symptom.** During a nope window, observer (non-target, non-actor) sees
only `Intercept · Xs` countdown button. **No indication of what card was
played.** Observer cannot make an informed Intercept decision. This is
the PRD-target class from 2026-04-22.

**Confirmed by.** Same 4 runs as §2.1. Quote (seat-2 today, after 6+
nope-window observations): *"the staging area showed only 'Intercept ·
Xs' countdown with no indication of what card was played. Observer
cannot make an informed intercept decision."*

**Where to fix.** Nope-window projection currently strips card identity
from non-principals. The info-gap lives at `src/server/projection.ts:165-183`
(per CLAUDE.md landmine). Real product question — show card type to
observers? Or only to the direct target?

**Decision needed before fix.** Briggsy: should observer see card type
during nope window, or only the direct target? Today's harness output is
3 independent agents saying "I can't make an informed Intercept call,"
which is the lived UX — but it's also a privacy-vs-clarity tradeoff
worth a deliberate call.

### 2.3 Direct Order self-target excluded from UI (MEDIUM — copy/UI mismatch)

**Symptom.** Card flavor text says "ANY operative" → engine accepts
self-target → UI's TargetSelect dialog **filters out the acting player**
from the option list. Self-Direct-Order is a legal joke per
`RULES-REFERENCE §13.8` and is engine-tested by
`rules-gaps-exhaustive.test.ts:220-244`.

**Confirmed by.** Seat-1 today (logged ui-spec-divergence):
*"SCN-DIRECT-ORDER-SELF-TARGET-01: Direct Order target dialog excludes
self. Card text says 'ANY operative' but UI filters out the acting
player."*

**Where to fix.** `src/client/player/components/TargetSelect.tsx` —
remove the self-exclusion filter for Direct Order specifically (or
unconditionally if the engine allows self-target everywhere it offers
TargetSelect). Verify with `engine-phaseN.test.ts` that engine accepts.

### 2.4 Back Channel / deck position anomaly (HIGH — needs engine trace)

**Symptom.** Seat-3 played Intel Briefing → top 3 cards revealed at
positions 1/2/3 (Burned at pos 2 → drew the top → Burned now at pos 1
of 6-card deck). Seat-1 played Go Dark (no deck change). Seat-3 played
Back Channel (bottom-draw → should be position 6 of 6). **Got Burned.**

**Confirmed by.** Seat-3 today (logged HIGH suspicion). Either:
(a) Back Channel doesn't actually draw from the bottom of the pile;
(b) deck state shifted between Intel Briefing and Back Channel via some
intermediate event (Burned-on-top auto-advance? Seat-1 turn rotation?).

**Where to trace.**
- `src/server/game/engine.ts:503-511` — `applyDrawFromBottom`.
- `src/server/game/engine.ts:655` — `performDraw(state, playerId, 'bottom', ...)`.
- Cross-reference `events.jsonl` from the run dir against the seat-3
  log timeline to identify what moved between the Intel peek and the
  Back Channel draw.

**Acceptance test.** A property-based test in
`engine-phase3.test.ts` (or wherever Back Channel currently has
coverage) that asserts: starting deck `[A, B, C, D, E, F]` (positions
1..6 from top), `applyDrawFromBottom(state)` returns card `F`. Confirm
no rotation / no shuffle / no peek-clearing side-effect.

### 2.5 Hand counter doesn't decrement on staging (LOW — UX clarity)

**Symptom.** Player double-taps card → card appears in staging area
→ **hand count badge unchanged until the play actually commits**
(post-nope-window). Reads as "did my stage register?" friction.

**Where to fix.** Hand-count badge in `src/client/player/components/Hand.tsx`
(or wherever `myHand.length` is displayed). Subtract staged-card count
from the displayed hand count, OR show staging-area cards as visually
distinct from "in hand" so the count delta is obvious without arithmetic.

### 2.6 Triple-steal whiff feedback missing on actor side (MEDIUM)

**Symptom.** Actor names a card type the target doesn't have → combo
discards silently → **no "Seat3 doesn't have Extraction" message to
actor**. Hand count drops; actor cannot distinguish hit from miss.

**Where to fix.** Same place as §2.1 (stealer-side reveal) — either
extend the stealer-side StealReport to handle whiff, or add a separate
"NamedSteal whiff" toast. Wire to engine event `combo-steal { found:
false, cardType: <named> }` (per CLAUDE.md engine invariants).

### 2.7 Observer Extraction drama beat is weak (MEDIUM — §2 Quality Bar)

**Symptom.** When ACTOR draws Burned and dodges via Extraction,
observers see only "EXTRACTED" briefly (~4s) in the status bar. **No
cinematic overlay visible on observer's phone.** Per CLAUDE.md:
"DramaOverlay burned is 2 beats for non-drawer, 1 beat for drawer.
Board always sees both beats." So observers SHOULD see a 2-beat overlay
— this is a regression or a projection bug.

**Where to trace.** `src/client/player/components/DramaOverlay.tsx` —
verify the non-drawer 2-beat path is actually mounting on phone-sized
viewports. Possible cause: the DramaOverlay queue processor may be
deduplicating beats, or the projection isn't including the burned-drawn
event for non-drawers.

---

## 3. Playtest harness — clean run achieved, residual gaps

**Status: production-bar runs work.** First clean run with production
timings (10s nope window) completed 2026-05-08 — `runs/2026-05-08-0935-3p`
finished `outcome=success` with 18 fires + 40 triage seeds. Refactor
landed in `b29ba31c` makes `nopeWindowMs` an optional override; series
configs use production-default fallthrough.

### Residual harness defects (lower leverage than §2)

1. **Triage promotion gap.** `triage-specs/` writes 40 seed JSONs but
   `issues/` stays empty and `INDEX.md` reports 0 issues. The
   `playtest-triage` agents never get dispatched. Fix path:
   - Document the triage-dispatch step (mirroring the existing
     seat-dispatch step in `scripts/playtest/run-session.ts:208-212`)
     so the operator knows to dispatch 40+ triage agents per run.
   - Or auto-dispatch from the orchestrator post-marker (significant
     change — currently the orchestrator runs triage-pipeline
     in-process but only generates seeds, doesn't run the agent diagnoses).
2. **Coverage threshold = 50 vs 18 fired.** `coverage.md` reports
   "FAILED — primary (≥50) failed: 18" but `outcome=success`.
   Contradictory framing. Real question: is 50 a realistic per-run
   target, or a series target? Adjust threshold OR reframe the
   "failed" wording in `scripts/playtest/lib/coverage-reporter.ts`.
3. **No viewport rotation.** session.md reports
   `viewports exercised: (none)` despite 3 viewports configured. Either
   the orchestrator doesn't drive rotation in scripted mode, or the
   counter is broken. Investigate `scripts/playtest/lib/orchestrator.ts`
   viewport-cycling code path.
4. **Agent-logging discipline gap.** Seat-1 wrote 12 vibe-check
   entries to file (good). Seat-2 reported 8 in summary but wrote 1.
   Seat-3 reported 7 but wrote 0. Either schema-validator is silently
   rejecting entries, or agent prompts let agents conflate "I'll
   vibe-check" with actually writing to disk. Tighten prompt: explicit
   "write to file BEFORE proceeding to next action" rule, and surface
   schema-validator rejections in the agent's tool-call response.
5. **Silent-timeout-as-success (still real, didn't trip today).**
   The 2026-05-07 finding stands. `pnpm playtest:run` still exits
   `success` if the orchestrator times out at 60min with empty seats.
   ~5-line fix: detect `expectedSeats > 0 && seatsJoined === 0` in
   `scripts/playtest/lib/orchestrator.ts` → emit
   `outcome: 'failed-launch'`.

### Operator skill `/playtest-run` (still missing)

The seat-dispatch + marker dance is documented in
`scripts/playtest/run-session.ts:208-212` but only as a code comment.
Codify as a slash command or skill: (a) start orchestrator, (b) wait
for `agent-specs.manifest.json`, (c) dispatch `playtest-seat-N` agents
in parallel, (d) touch `agents-done.marker` when seats exit.

### Outstanding from prior runs (still OPEN — sweep stale)

- 9 OPEN at `docs/testing/playtest/runs/2026-04-29-2139-3p/issues/`.
- 2 OPEN at `docs/testing/playtest/runs/2026-05-01-1654-3p/issues/`.

Many likely incidentally resolved by later commits — worth a
RESOLVED-BY-SIDE-EFFECT triage sweep after §2 lands.

---

## 4. Carryover requiring Briggsy

Only Briggsy can do these.

- **Decision: nope-window observer info policy** (gates §2.2). Show card
  type to observers, or only direct target?
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
  - StealReport stamp occlusion of `Case 47-B`.

Remaining ⏸ rows in `E2E-ISSUE-LIST` (C-13, C-15, C-16-19) are blocked
on product/asset decisions — surface in a visual review.

---

## 5. Landmines (still relevant)

Active warnings only. Older landmines have moved to `docs/insights/` and
`CLAUDE.md`.

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
- **`scripts/playtest/run-session.ts:208-212`** documents the operator's
  responsibility for the seat-agent-dispatch dance. Until the
  `/playtest-run` skill exists (§3), this comment is the only mention
  of the step.
- **Pre-starting dev servers breaks the orchestrator.** `pnpm
  playtest:run` spawns its own wrangler with `PLAYTEST_TOKEN` baked in
  via `.env`. Pre-starting `pnpm dev:server` binds 8787 with no token
  → orchestrator's god-connect gets HTTP 401 → `code=4004`. Don't
  pre-start dev servers when running the harness — it owns the
  lifecycle.
