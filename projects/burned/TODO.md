# BURNED — TODO

Operator's queue. Actionable items only. **Not a diary** — git log has
the history. (Rule: `feedback-todo-is-not-a-diary.md`.)

---

## 1. Active priorities

**Triage backlog `2026-05-08-2022-5p` fully dispositioned 2026-05-09.**
All P1s closed. **Falsify Intel design-sprint cluster (#004/#005/#006)
shipped 2026-05-09** — drag-to-reorder dossier UI with redact-stamp
priority markers, card photos, and Archer-vocab "Commit File" CTA. See
§1.2 for remaining residuals.

Current state (verified 2026-05-09 end-of-session):

- Tests: 1350 pass | 6 expected fail (66/66 files green).
- Build: clean (`pnpm build`).
- Phone initial JS: ~98.40 KB gzipped (player 18.26 + shared 65.68 +
  VisualElement 14.46). **Improved** vs 2026-05-08 baseline (98.82 KB) —
  Vite extracted MinimalCard + AnimatePresence into lazy chunks. Drag/
  layout-projection chunk (~27.40 KB gz), rearrange UI (3.20 KB gz), and
  MinimalCard chunk (5.95 KB gz) all lazy + prefetched at idle.
- Triage state, run `2026-05-08-2022-5p`: **0 OPEN** · 2 BLOCKED ·
  27 RESOLVED · 7 LOW-SIGNAL · 2 KNOWN-PRODUCT · 1 DUPLICATE. P1 6 · P2 33.

### 1.1 Cluster results

| Cluster | Sev | IDs | Result |
|---|---|---|---|
| A. ConnectionOverlay blocks Intercept | 2× P1 | 001, 023 | ✅ `ba77e42e` |
| B. Back Channel cinematics flat | 3× P1 + 4× P2 | 008, 009, 012, 013, 014, 025, 028 | ✅ `6cdc51c5` |
| C. Falsify Intel rearrange | 4× P2 + 030 engine | 003, 030, 004, 005, 006 | ✅ design sprint shipped 2026-05-09 |
| D. Intercept observability | 3× P2 | 011, 022, 027 | ✅ `28ff4011` |
| E. Direct Order vocabulary | 2× P2 | 031, 032 | ✅ `cb3655cb` |
| F. Burn the Files | 3× P2 | 033, 036 ✅ · 037 🟡 | mixed (see §1.2) |
| G. Favor UX gaps | 3× P2 | 016, 017, 034 | ✅ `d3c76528` |
| H. StealReport missing card art | 1× P2 | 020 | ✅ `beed50e9` |
| I. Harness oracle false-positives | 1× P1 + 2× P2 | 002, 015 ✅ · 021 🟡 | mixed (see §1.2) |
| Singletons | — | 039 portal ✅ · 038 LOW-SIGNAL | ✅ `a24bc89f`, `d3c76528` |

### 1.2 Residual BLOCKED items (intentional, scoped)

2 issues remain BLOCKED with explicit scope notes:

- **#021 (P2)** — Seat-agent fidelity scope. Self-report-on-
  intercepted-pair-steal is a seat-agent prompt-following gap, not a
  catalog/oracle gap. Coverage-reporter already logs the divergence;
  fix lives in coverage-filter or seat-agent prompt enforcement.

- **#037 (P2)** — Motion-calibration scope. GSAP ember-pulse during
  the DramaOverlay holdMs to lift the Burn the Files phone beat from
  "status subtitle" to "fire is active." Narration baseline is in
  place via #036's deck-shuffled toast. Motion design needs eye-in-
  loop verification per `feedback-eye-in-loop-beats-calibration-for-motion`.

**Closed 2026-05-09** — #004 + #005 + #006 (Falsify Intel rearrange
design sprint): replaced tap-to-assign-number form with vertical
`Reorder.Group` drag-to-reorder. Each slot renders the canonical
`MinimalCard` (same component as hand/staging) with `compact` padding
that shifts MinimalCard's `@container (max-width: 114)` threshold —
name chrome stays visible at smaller card sizes where 3 fit in
viewport. Slot has full-bleed `BottomSheet` (new `tall` prop) so the
dossier dominates rather than reads as a modal. Redact-stamp priority
markers (01/TOP, 02/MID, 03/BOTTOM) overlay each card's bottom-right
corner with alternating hand-stamped rotation. Single-tap a card →
enlarge to detail view (description visible) with custom 8px movement
threshold to discriminate tap from drag. "Commit File" CTA pinned at
sheet bottom. Implementation: `FalsifyIntelRearrange.tsx` behind a
`lazy()` boundary — sync-importing `Reorder` would pull the ~27 KB
`layout-*` chunk into the always-loaded player entry. Rearrange UI +
drag/layout chunks prefetched at idle from `player/main.tsx`.

---

## 2. Gameplay bugs from 2026-05-08 harness run — DONE

All seven items (§2.1-§2.7) closed. Run dir at
`docs/testing/playtest/runs/2026-05-08-0935-3p` (gitignored —
`pnpm playtest:purge --session-id 2026-05-08-0935-3p` when done).

§2.2 (nope-window observer info gap) closed in `3c82c572` —
PlayerAlert toast persists through nope window for observers.

---

## 3. Playtest harness — DONE

Production-bar runs work. All §3.1-§3.5 items closed. Operator skill
`/playtest-run` shipped at `.claude/skills/playtest-run/SKILL.md`
(commit `57872c41`) — codifies seat + triage dispatch dances.

§3.2 (coverage threshold semantics) closed in `0a174691` — split into
per-run `threshold` (default 15) + `seriesTarget` (default 50,
informational).

The lone remaining hard prereq for "fully done" is **SCENARIOS.md
sign-off** (line 3, still DRAFT) — see §4.

---

## 4. Carryover requiring Briggsy

Real-life sessions only Briggsy can do.

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

Remaining ⏸ rows in `E2E-ISSUE-LIST` (C-13, C-15, C-16-19) are blocked
on product/asset decisions — surface in a visual review.

The 2026-05-07 couch eyeball-pack design calls all closed in this
session: StealReport stamp dropped (`17514aae` — also fixed Case 47-B
occlusion as side effect), NopeCountdownBar anchored into case banner
(`4e4431c9`), drama tier hierarchy ship-as-is, FuturePeek swipe ship-
as-is, Burned-draw drama beat verdicted distinct
(`d555af9a` — perception artifact, no fix needed).

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
- **`createTriageLauncherDriver` exists but is NOT wired into
  `runSession`** (per `run-session.ts:200-240` operator-doc comment).
  The `/playtest-run` skill landed (commit `57872c41`) but the
  in-process triage launcher driver is still a future option — the
  current skill orchestrates triage agents from the operator's side
  via Agent tool calls per the manifest. If you ever want
  in-orchestrator triage spawn, wire via `opts.waitForTriageMarker`.
- **`nopeWindowMs` is now optional end-to-end** (commit `b29ba31c`).
  Series configs (2p/3p/5p/8p/10p) and `default-config.json` no longer
  carry the field. Production tier defaults from
  `src/shared/constants.ts:NOPE_WINDOW_MS` (10s flat) take over via
  engine fallthrough at `engine.ts:1332`. `calibration.json` retains an
  explicit override (10s) for legitimate calibration deviation. Adding
  the field back to a series config means "this run deviates from
  production" — make sure that's deliberate.
- **Coverage threshold split: per-run vs series** (commit `0a174691`).
  `coverageThreshold` config field now means PER-RUN gate (default 15).
  `CoverageReport.seriesTarget` (default 50) is informational only —
  surfaced in coverage.md as cumulative across-runs context. Don't
  conflate the two; calibration.json's `coverageThreshold: 1` overrides
  the per-run gate (which is what calibration always meant).
- **Triage issue summaries are now tracked in git** (commit `37150919`).
  `runs/*/issues/*.md` and `runs/*/issues/INDEX.md` are
  gitignore-allowlisted; the rest of each run dir (logs, screenshots,
  events.jsonl, server/, scrubbed/, etc.) stays gitignored. Closure
  records survive `pnpm playtest:purge`. Adding a new gitignored file
  type under `runs/` requires no allowlist change; un-ignoring a new
  artifact type does.
- **PlayerAlert observer toast persistence semantic** (commit `3c82c572`).
  Card-played observer toast now persists through the nope window
  (`persistUntil: ['nope-window-resolved']`) for ALL non-favor cards.
  Favor stays on `persistUntil: ['favor-given']` (longer window). The
  observer X dismiss button now appears on every persistent toast,
  not just the favor case. Filtered cards (extraction / burn-the-files
  / falsify-intel / combos) still skip the toast — DramaOverlay or
  StealReport own those moments.
- **NopeCountdownBar lives INSIDE the case-banner aside** (commit
  `4e4431c9`). Pre-2026-05-08 it floated below the arena as a centered
  dark-surface band. Now it's a child of `<aside className=
  {styles.caseBanner}>` between the divider and the briefer footer.
  The case-banner's flex `justify-content: center` recomposes the
  static lines when the intercept row appears/disappears (~10px shift
  on BURNED). Read as the briefing recomposing live; flagged as
  acceptable. If reframing as a fixed-height slot becomes worth it,
  fix path is documented in commit body.
- **StealReport + FavorReport rubber stamps removed** (commits
  `17514aae` + `09a4ae44`). The rubber-stamp visual + thunk
  choreography + `--motion-duration-stamp` token are GONE. Body text
  carries the verdict on both reports. The `--motion-ease-overshoot`
  primitive stays (zero current consumers but generic curve worth
  preserving for future spring cinematics).
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
- **Pre-starting dev servers breaks the orchestrator.** `pnpm
  playtest:run` spawns its own wrangler with `PLAYTEST_TOKEN` baked in
  via `.env`. Pre-starting `pnpm dev:server` binds 8787 with no token
  → orchestrator's god-connect gets HTTP 401 → `code=4004`. Don't
  pre-start dev servers when running the harness — it owns the
  lifecycle.
