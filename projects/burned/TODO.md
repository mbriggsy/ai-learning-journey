# BURNED — TODO

## NEXT SESSION — pick up here (2026-04-25+)

**Playtest-harness Phase 3 — 12 of 13 units shipped.** Unit 10
(coverage-reporter) is the ONLY remaining unit. Phase 3 formally closes
when Unit 10 lands.

### Phase 3 state of the world

**Full test suite:** 719/719 green (698 baseline + 21 new Unit 9 tests) ·
typecheck clean · client-bundle sentinel regression intact (Phase 2 +
Phase 3 Unit 3b sentinels both assert zero matches in `dist/**/*.js`).

**Harness surface shipped:**
- `pnpm playtest:selftest` — 8-check isolation self-test (cookie / localStorage
  / WS-frame / god-non-delivery / allowlist-defined / close-codes-distinct /
  scrubber-fail-closed / retention-boundary). Runs in ~5s against live
  wrangler+vite; writes `.last-selftest` stamp only on all-pass.
- `pnpm playtest:smoke` — end-to-end Phase 3 smoke. 2-seat session in room
  `SMK<xxx>` (randomized to avoid DO-state collision on rerun), host starts
  the game via board-view "Cleared Hot", seat 0 plays one End-turn draw,
  god subscriber captures events to `events.jsonl`. 2× runs @ ~10s each,
  both pass.
- `pnpm playtest:run` — orchestrator entry with `--config / --seats / --seed
  / --viewport / --no-scrub / --allow-trace / --help`. Seat-agent dispatch
  is still the Phase 3 stub (waits for stdin sentinel); Phase 4 replaces.
- `pnpm playtest:purge` — operator-invoked session-dir purge with
  `--before / --session-id / --full-dir / --root`. Rolling retention
  (default keep 10 newest) runs automatically at end of each session via
  the orchestrator.
- **NEW (2026-04-24) — scenario-detector (`scripts/playtest/lib/scenario-detector.ts`):**
  `detectFires(catalogPath, eventsJsonlPath, connectionsJsonlPath, seatLogPaths)`
  parses SCENARIOS.md's three-tier grammar, walks events.jsonl + (optional)
  connections.jsonl, emits tri-state FireRecords (`clean` / `with-divergence`
  / `no-fire`). Hand-rolled YAML-subset parser handles all 35 production
  scenarios. Real-fixture smoke against Unit 8's live events.jsonl parses
  clean (35 FireRecords, all `no-fire` on the thin 2-event game — honest
  baseline for Phase 4 to flex).

**Harness lib modules (all under `scripts/playtest/`):** `run-session.ts`,
`selftest.ts`, `purge.ts`, `smoke.ts` entries; `lib/` has `orchestrator`,
`server-controller`, `session-secrets`, `god-subscriber`, `seat-factory`,
`run-directory`, `scrubber`, `retention`, `selftest-checks`,
**`scenario-detector` (Unit 9, shipped 2026-04-24)**, plus stub for
`coverage-reporter` (Unit 10 target). Zero imports from `src/server`
(insight 022). All types re-declared locally.

**Phase 2 fixes rolled into Phase 3 during execution:**
- **Unit 3 FIX (commit `adc75942`):** `startServers` switched from env-based
  to `pnpm exec wrangler dev --var PLAYTEST_MODE:1 --var PLAYTEST_TOKEN:<t>`.
  Wrangler does NOT propagate Node env to workerd — discovered via Unit 7
  live run. See insight 024.
- **Unit 4 fix (commit `0ff2ada4`):** god-subscriber now sets `Origin` header
  on WS open via `buildLanOriginFromWsUrl`. `ws` package sends no Origin by
  default; Phase 2 LAN gate rejected with 403 → 4003. See insight 025.
- **Unit 3 stdio drain (commit `adc75942`):** subprocess stdout/stderr now
  drained to parent's stderr with `[wrangler]` / `[vite]` prefix. Undrained
  pipes stalled wrangler at ~64 KB. See insight 026.

**Insights captured across Phase 3 (5 total, 4 prior + 1 this session):**
- **024** — `wrangler dev` requires `--var` CLI flags; Node env doesn't
  reach workerd.
- **025** — `ws` package sends no Origin header by default; server LAN
  origin gate rejects bare clients with 403 → 4003.
- **026** — Undrained subprocess stdio stalls the child at ~64 KB; use
  drain-with-prefix or `stdio: 'ignore'`.
- **027** — Absence-of-X assertions need presence-of-Y companions;
  selftest Check 4 passed vacuously when god never connected.
- **028 (NEW 2026-04-24)** — god-events broadcast cumulative event arrays,
  not deltas. Any consumer must delta-flatten via `.slice(priorLen)` or
  massively over-count. Verified at engine.ts (10+ append sites) +
  projection.ts (no trim). Applies to Phase 5 triage + any replay tool.

### Known follow-ups (ordered by urgency)

1. **Unit 10 — coverage-reporter.** Renders `coverage.md` as 7×2 info-gap
   grid with `firedCount >= 50 AND zeroCellCount === 0` pass gate. Plan
   locked at `docs/plans/playtest-harness/phase-3-harness-infra.md:1912`.
   Depends on Unit 9 (now shipped). Pure consumer of `FireRecord[]`;
   expected scope: smaller than Unit 9 (~200 lines impl + ~200 lines
   tests). Types already defined: `CoverageReport` in
   `scripts/playtest/lib/types.ts:263` with `firedCount` / `threshold: 50`
   / `gridCells: Record<ViewerRole, {column1, column2, scenarioIds}>` /
   `zeroCellCount` / `passed` / `firedByViewport` /
   `freePlayAccounting` / `divergences` / `knownProductCalls`.
   `scenario-detector` exports `FireRecord` (with `ScenarioFire` legacy
   alias — coverage-reporter currently imports the alias).
2. **Workerd orphan processes on Windows (Unit 8 finding).** Every smoke
   run leaks 2 workerd.exe processes because `stopServers` SIGTERMs the
   `pnpm exec wrangler` intermediary and doesn't propagate to the
   grandchild workerd. Fix path: spawn with `detached: true` + use
   `taskkill //F /T /PID <wranglerPid>` on Windows, OR switch to a process
   group / Job Object. Smoke surfaces this as a warn line so pressure stays
   on it. CLAUDE.md recovery is `taskkill //F //IM workerd.exe && rm -rf
   .wrangler/state`.
3. **Port 5173 vite collision (Unit 8 finding).** `pollViteHealth` doesn't
   verify it's the orchestrator's vite vs a pre-existing user vite. Today
   accidental coexistence works; could mask a dev-server regression. Fix:
   hash an orchestrator-ID into a request header OR probe a harness-only
   endpoint.
4. **Phase 3 Unit 7 selftest polish:** selftest.ts inlines the wrangler
   spawn rather than calling the fixed `startServers`. Works correctly
   but duplicates wrangler-spawn discipline; migrating is low-risk polish
   after Unit 10 lands. Noted in commit `adc75942`.
5. **Negative-shape dispatch-rejection evidence (Unit 9 known limitation).**
   scenario-detector currently defaults `shape: negative` scenarios to
   `no-fire` because dispatch errors don't produce god-events today.
   When Phase 4 seat agents land (or whenever rejection logging lands),
   upgrade `tier1Match` in `scenario-detector.ts` to check for positive
   rejection evidence and fire `clean` when observed. Full context in
   the code comment at the `shape === 'negative'` branch.
6. **Phase 4 — seat agents.** Plan locked. Consumes Unit 5's `SeatHandle`
   + Unit 1's `ALLOWED_PAGE_METHODS` allowlist. Subagent tools-whitelist
   per `.claude/agents/playtest-seat.md` is the enforcement surface
   (insight 020).
7. **Phase 5 — triage agents.** Plan locked.
8. **Phase 6 — first REAL session.** STOP before this runs autonomously;
   eye-in-loop required.
9. **IncomingSteal banner real-device verification** (`82af35f9`) — still
   pending from prior sessions. Playwright + unit tests green, phone-side
   pre-resolution screenshot never caught. Earth > map.
10. **Host-identity cluster (P1 deferred).** B-01/B-02/B-11/B-12/B-14 —
    significant infra, design questions first.
11. **Remaining P1/P2 from `docs/testing/E2E-ISSUE-LIST.md`** — cosmetic
    and scope-decision items, pick opportunistically.

### Phase 1 Column divergences — candidates for E2E-ISSUE-LIST.md additions

Still open from Phase 1 drafting. Full text in
`docs/testing/playtest/SCENARIOS.md` §Column divergences. Highlights:

- **Atomicity-gap bug class** (insight 021) — 4 scenarios re-surface the
  pre-A-01 strip-before-validate pattern: Extraction proactive,
  Direct Order eliminated-target, Back-Channel empty-deck, Favor
  self-target. Same dispatch-time-guard repair template as A-01.
- Favor auto-resolve TARGET-silence on empty-hand or Burned-only hand
  (correct engine, weak UX).
- Intel → Back-Channel `pendingFuture` clearing semantics — product call.
- Spectator `namedCardType` visibility — engine correct (closed: see
  Phase 1 plan-doc correction, insight trail).
- Board-drama variant for Burned draw (known: C-15).

### Phase 1 catalog gaps (intentional — documented)

- D-03 simultaneous-Nope UX — no dedicated scenario; Phase 3 orchestrator
  can script on demand if needed.
- B-13 active-player-mid-turn disconnect — adjacent to
  `SCN-CONN-NAME-CARD-PENDING-DISCONNECT-01`; not dedicated.
- Free-play scenarios (4) omit the 7-row info-gap by design.

### IncomingSteal banner — what to check (commit `82af35f9`)

On a real 3-of-a-kind named steal, target's phone shows `// INCOMING LIFT /
{STEALER} / is lifting your / {CARD NAME}` banner DURING the 10s nope window
(not just post-resolution). Countdown ticks, urgent-red flip at ≤2s, banner
exits clean when the window resolves. Verify bystanders see no banner and no
card name anywhere.

---

## 🛡️ PLAYTEST HARNESS — HARDEN PASS COMPLETE (2026-04-23 overnight)

All 6 phase plans **LOCKED**, PRD v0.2 **LOCKED**, roadmap **active**. Ready
to execute builds when Briggsy greenlights (builds were descoped overnight —
harden-only was the final scope).

**Artifact locations (all LOCKED 2026-04-23 against engine/room @ `e6b31b5c`,
projection @ `5e86f811`):**
- PRD: `docs/testing/PLAYTEST-HARNESS-PRD.md` — v0.2 LOCKED
- Roadmap: `docs/plans/playtest-harness/roadmap.md` — active
- Phase plans: `docs/plans/playtest-harness/phase-{1..6}-*.md` — all `status: locked`
- Coherence audit: `docs/plans/playtest-harness/COHERENCE-SWEEP.md`

**Insights captured:**
- `docs/insights/019-surface-coherence-review-misses-signature-drift.md` —
  surface-level confidence scoring misses code-grounded drift; rigor passes
  need at least one code-grounded reviewer.
- `docs/insights/020-subagent-capability-enforcement-is-frontmatter-not-wrapper.md`
  — TypeScript wrappers can't restrict Claude subagents; enforcement lives at
  `.claude/agents/*.md` frontmatter `tools:` whitelist because MCP tools
  cross process boundaries.

**Next steps:**
- ✅ **Phase 2 SHIPPED 2026-04-24** — 10 units, full suite 527/527, live
  smoke green.
- ✅ **Phase 3 (12 of 13 units) SHIPPED** — Units 1, 2, 3, 3b, 4, 4b, 5, 6,
  7, 8, 9, 10b landed. Full suite 719/719. Live `pnpm playtest:smoke`
  passes ~10s × 2 runs. See top-of-file §"Phase 3 state of the world".
- **Phase 3 completion:** Unit 10 (coverage-reporter) is the last
  remaining unit. Pure consumer of Unit 9's `FireRecord[]`.
- Execute Phase 4 → Phase 5 per locked plans. Phase 6 is the first real
  session; STOP before Phase 6 without eye-in-loop verification.
- Insights 019 + 020 should guide future rigor passes on agent-native plans.
  Insights 022 + 023 fed into Phase 3 scope decisions (room.ts quarantine;
  HTTP-level auth gate). Insights 024-027 cover wrangler `--var`, ws
  Origin headers, stdio backpressure, and absence-tests-need-presence-
  companions. Insight 028 (god-events are cumulative, not delta) applies
  to any future events.jsonl consumer (Phase 5 triage, replay tools).

### Sequential-vs-parallel analysis (Briggsy's end-of-session question)

**Premise tested:** Phase N learns from Phase N-1. Answer: **YES, strongly
verified.** Every H-Na absorption inherited a material architectural
correction from the preceding H-(N-1)b rigor pass:

- H-1b → H-2a: god-event emission site moved from dispatch to
  `broadcastGameState`. Phase 3 Unit 4 reassembly architecture depends on
  this. Parallel run would have built Phase 3 on the wrong assumption.
- H-2b → H-3a: `expectedViewerIds` + `/health` added to Phase 2 upstream.
  Phase 4 consumes both. Parallel run would have missed them.
- H-3b → H-4a: `SeatPageWrapper` deleted, custom `.claude/agents/playtest-
  seat.md` pattern introduced, `info-gap-divergence` → `ui-spec-divergence`
  rename. Phase 5's Unit 1b + 4 entryType consumption depends on all three.
  Parallel run would have had to rewrite Phase 5 after the fact.
- H-4b → H-5a: role-drift demoted to LOW-SIGNAL, Column-1 analysis
  scrubber-aware-limited. Phase 6 calibration decisions reference both.
  Parallel run would have missed.
- H-5b had no downstream.

**Counterfactual time estimate:** Pure parallel absorptions + parallel rigor
would save ~2-3h wall time but would require a second pass to propagate
every cross-phase correction surfaced during rigor — effectively converging
back to sequential + coherence-sweep fixes. The "savings" get eaten by
rework churn, and the intermediate state (each phase locked on wrong
upstream) invites partial commits that are hard to unwind.

**Recommendation:** Keep sequential for any plan set where downstream
phases demand contracts from upstream. Parallel is fine for orthogonal
work (different subsystems, no shared contract surface). The premise
held; sequential was the right call.


---

## Active Priorities

### 1. BURNED CARD CINEMATIC ARC — sub-steps #3 and #4

Sub-steps #1 (drawer card-fill) and #2 (non-drawer/board card-flip) SHIPPED
(see phone-verify table above). #3 and #4 remain.

**Sub-step #3 — DefusePlacement hero card.** Sheet is currently text-only
("Hide the Burned Card" + position buttons). Drawer just dodged death — hero
the Burned card at the top of the sheet during position-pick. Visual continuity
from drama → decision: "this is what you're hiding, where?"

**Sub-step #4 — Regen the Burned card art.** Once #3 lands, the illustration
becomes the visual keystone. Direct Order + Intercepted shipped; Burned is the
only action card still at original Apr-9 quality.

Art concept pitches for #4:
- **A. Operative caught in flashbulb exposure** — bright white/amber flashbulb
  blast from outside frame, operative silhouette caught mid-turn looking
  toward camera, surprise/recognition expression, dark city street or rooftop.
  Pure noir "the moment your cover is blown."
- **B. Photograph emerging from developer tray** — close-up overhead of
  darkroom developer tray, B&W surveillance photo of the operative fully
  developed, red darkroom light overhead. Ties to Intel Briefing's photography
  vocabulary.
- **C. Cinematic upgrade of the current explosion concept** — keep the badge-
  in-flames idea but go full Archer-spec: operative's spy ID card with photo,
  burning at edges against dark void, embers and smoke rising.

**Claude's lean:** A (flashbulb exposure) — most narratively precise for
"Burned" = identity exposed. Tonally different from Direct Order / Intercepted
(both interiors) — exterior/action beat adds variety.

Process per regen:
1. Archive current: `public/assets/cards/_archive/burned-<date>-<reason>.webp`.
2. Tighten prompt in `scripts/generate-cards.ts` — minimum-viable wins.
3. `set -a && source .env && set +a && npx tsx scripts/generate-cards.ts --only=burned`.
4. Critically eyeball the temp PNG — state flaws, don't narrate hopes.
5. `npx tsx scripts/process-assets.ts` once approved.

### 2. Real-device playtest

Live 4-8 player test on iPad Pro 1366 + phones. Verify:

- Triple-steal deferred commit — cards return on cancel, nope window opens
  AFTER the name.
- Favor-target banner + staging (no sheet modal).
- Discard hero sizing reads from couch distance.
- Burned two-beat drama sequence on non-drawer phones.
- Card-drawn toast fires for drawer only on safe draw.
- `pnpm dev:launch` debugging ergonomics.
- Emil pass on-phone: SmartActionBox `:active` scale lands during breathing;
  card-tap squeeze reads tactile; hand→enlarge blur doesn't stutter on Safari;
  sheets press feedback doesn't fight overscroll.
- Emil pass on-TV: briefing cascade reads as a coherent arc; idle ticker stays
  ambient once real COMMS accumulate; Lobby disabled sheen subtle; status
  strip crossfade on turn handoff doesn't ghost.
- Emil Phase 3 on-phone: StagingArea enlarge no longer stutters; DefusePlacement
  ± steppers feel tactile at 0.95 press; PendingPromptBanner crossfade on
  defuse → favor-response swap reads as status line.
- Emil Phase 3 on-TV: NopeCountdownBar fade-in; PendingPromptBanner 6px lift
  at couch distance; Lobby startButton hover on desktop, not sticky on hybrid
  touch; GameOver 80ms stagger at 10 players.
- Emil Q verification: Nameplate flip 400ms vs 250ms (crisp brass click vs
  heavy coin flip); perspective 1000px vs 600px (flat fade-swap vs physical
  3D rotation).

### 3. 8-player stress test

Verify PlayerStrip layout at max count on real TV, COMMS scroll under event
volume, nameplate legibility from couch distance. At 1366×1024, strip math
leaves ~34px headroom with all 10 tiles; verify at 1920 and 4K that tiles
grow proportionally.

### 4. Live mid-play state verification — `tests/e2e/arena-states.spec.ts`

Playwright: 3-player game, drive `window.__gameStore` dev hook to force each
state, screenshot each. Target states: Nope window mid-countdown, DramaOverlay
(BURNED → EXTRACTED, ELIMINATED, INTERCEPTED, WINS), Favor banner + staging,
Triple-steal name-card sheet pre-commit and post-name, FuturePeek (read-only
and rearrange). Output to `temp/arena-states/` for eyeball review. ~30 min
per state; ~3-4 hours for the full set.

### 5. Physical hardware verification

Push commits, deploy to Cloudflare Pages (wrangler), open on actual TV with
phone controllers.

### 6. Extend PlayerAlert coverage (optional)

- **Reassign / Direct Order target** — no direct event type; victim only
  learns via `turn-started` with `turnsRemaining > 1`. Probably fine as-is
  because the target's phone sits dormant — when they come back, staging is
  lit and status reads "Your turn · 3 turns".
- **Your card was intercepted** — optimistic snapback + board DramaOverlay
  already communicate this; explicit phone toast would remove ambiguity.
  Skip until playtest reveals confusion.

### 7. Execute CSS Phase 5 — Verification & Acceptance

`/ce:work docs/plans/css-foundation-rebuild/phase-5-verification-acceptance.md`

### 8. Desk redesign follow-ups

- **Color check** — color blindness + reading of manila/cordovan/brass/mahogany
  palette. Needs a color-sighted eye (Harry?) before touching manila-face,
  brass tones, or tab hex. All reds currently unified through
  `--color-accent-burned`.
- **Phase 5.5 assets (skipped)** — ashtray + stubbed cigar, whisky tumbler,
  closed dossier stack. Need Imagen generation to hit quality bar. Candidates:
  upper-left desk (ashtray), opposite corner (tumbler catching venetian-blind
  light), below/beside active dossier (closed stack = "other cases").
- **Status strip height** — `.statusStrip` went 44 → 56px to host plate +
  stand. Verify on real TV that piles/dossier vertical band isn't squeezed.

### 9. Optional polish

- **Brass studs on wood frame.** CSS pseudo-elements (small radial-gradient
  dots at regular intervals on `.woodTop/.woodBottom`).

### 10. Optional test coverage expansion (deferred until visual layer stabilizes)

- **Card-drawn toast E2E** (~30 min). Extend Tier 1 spec: active phone taps
  `End turn · draw`, assert `PlayerAlert` renders `You drew {name}.`.
- **Pixel-diff regression** (~2h setup + ongoing baseline maintenance).
  Playwright `toHaveScreenshot()` with committed baselines. Requires
  `MotionConfig reducedMotion="always"` in test mode + fixed server RNG seed.
  Defer until after CSS Phase 5 lands — mid-rebuild baselines churn too fast.


---

## Landmines

Landmines no longer live in TODO.md. They found their right homes on
2026-04-23:

- **Hard-won lessons** (problem → root cause → fix → pattern) → `docs/insights/`. See `013-018` for the recent migration batch.
- **Architectural conventions** (protocol, engine invariants, client patterns, motion rules, dev tooling, Imagen workflow) → `CLAUDE.md`.
- **Canonical game rules** → `docs/RULES-REFERENCE.md`.

Nothing hides here anymore. TODO.md is for actionable items only.
