# BURNED — TODO

## 🎯 NEXT SESSION — pick up here (2026-04-23 EOD)

**32 commits on `main`, not pushed. Phone verification still outstanding for
all of them.** Briggsy's logistical window for real-device testing was closed
this session; resume on that first thing next session.

### Immediate priorities (ordered)

1. **Phone-verify the 32-commit pile on a real phone + TV.** Everything since
   `origin/main` is Playwright/unit-verified only. Earth > map. Until this
   happens, "shipped" is "believed shipped."
2. **Decide push.** After phone verification, push `main` to origin or roll
   back individual commits.
3. **Host-identity cluster (P1 deferred).** B-01/B-02/B-11/B-12/B-14 —
   significant infra, design questions first.
4. **Remaining P1/P2 from `docs/testing/E2E-ISSUE-LIST.md`** — cosmetic and
   scope-decision items, pick opportunistically.

### What needs specific phone verification

| Commit | What to check |
|---|---|
| `2abadf9e` + `da39a1ba` | End Game button top-right on TV; confirm modal renders and dismisses cleanly via tap + Escape + backdrop |
| `2abadf9e` | Offline nameplate pulses red + reads `// COMMS DOWN` when a player's phone disconnects mid-turn |
| `4b7be76e` | 10s Nope window reads as "breathing room" not "interminable" at the couch |
| `16942a1b` + `e6b31b5c` | Second Noper's late tap gets the "Too late — someone intercepted first" toast (not a silent counter-nope). Counter-nope button copy reads correctly on phone. Test with 2+ real phones tapping Nope simultaneously |
| `4985fa23` | Cinematic Arc #2: non-drawer/board sees the Burned card slam-in face-down → flip to face-up with victim name caption. Eye on timing at couch distance (currently ~2s beat) |
| `d21d67ab` + `6abe26d5` + `12752819` | Falsify Intel: title reads "Falsify Intel", sheet renders immediately with cards populated (no alt-tab required), Clear button resets tap selection, Confirm Order only appears after all 3 tapped |
| IncomingSteal banner (new, uncommitted pile) | On a real 3-of-a-kind named steal: target's phone rises "// INCOMING LIFT / {STEALER} / is lifting your / {CARD NAME}" banner DURING the 10s nope window (not just post-resolution). Countdown ticks, urgent-red flip at ≤2s, banner exits clean when window resolves. Verify bystanders see no banner and no card name anywhere. Injection test + post-resolution organic verified; pre-resolution live organic screenshot never caught due to Playwright tab-switch latency. |

---

## 🛡️ PLAYTEST HARNESS — HARDEN PASS QUEUE (2026-04-23)

Six-phase plan set drafted + Phase 1 deepened + document-reviewed. Before
build (task #9) we run the Harden pass across phases 2-6. **Resume here** if
phone verification above completes or gets deferred.

**Artifact locations:**
- PRD (v0.2, §8.2 updated to absolute ≥50): `docs/testing/PLAYTEST-HARNESS-PRD.md`
- Roadmap: `docs/plans/playtest-harness/roadmap.md`
- Phase plans: `docs/plans/playtest-harness/phase-{1..6}-*.md`
- Phase 1 status: deepened + document-reviewed + all decisions integrated. 1036 lines.

**Harden sequence (do in order — each step blocks the next):**

- [ ] **H-1a** Absorb Phase 1 contracts into phase-2-playtest-mode.md (mechanical).
  Extend god-event envelope to carry `projections: Record<playerId, PlayerView>` +
  `boardView: BoardView`. Add implementation unit for per-viewer projection broadcast.
- [ ] **H-1b** Rigor pass on phase-2: `/ce:plan deepen phase-2-playtest-mode.md`
  then `/compound-engineering:document-review phase-2-playtest-mode.md`, integrate.
- [ ] **H-2a** Absorb Phase 1 contracts into phase-3-harness-infra.md (mechanical).
  Scenario-detector parses three-tier grammar incl. `connection-events:`; coverage
  reporter handles 7-row × 2-column info-gap; orchestrator owns form-factor axis
  (3 viewports 360×640, 390×844, 768×1024); tracks free-play wallclock % (default 20%);
  coverage uses absolute ≥50 not percentage.
- [ ] **H-2b** Rigor pass on phase-3 (deepen + doc-review + integrate).
- [ ] **H-3a** Absorb Phase 1 contracts into phase-4-seat-agents.md (mechanical).
  Prompt renderer handles 2-column info-gap + `vibe-check:` + free-play class.
  Also: resolve gap I flagged (tool allowlist is aspirational vs enforceable —
  needs MCP Playwright scoping verification).
- [ ] **H-3b** Rigor pass on phase-4. Extra attention to MCP scoping + subagent
  tool-constraint enforceability.
- [ ] **H-4a** Absorb Phase 1 contracts into phase-5-triage-agents.md (mechanical).
  Triage treats `vibe-check:` as first-class; free-play issues get looser
  duplicate-detection threshold; reads 2-column info-gap divergences; adds
  explicit Read access for docs/testing/E2E-ISSUE-LIST.md.
- [ ] **H-4b** Rigor pass on phase-5 (deepen + doc-review + integrate).
- [ ] **H-5a** Absorb Phase 1 contracts into phase-6-calibration-and-first-session.md
  (mechanical). Coverage success = ≥50 absolute (≥5 axis-11); default 20% wallclock
  to free-play; Unit 7 prototype-detector gate must run before series #1; series
  configs reference locked catalog's new fields.
- [ ] **H-5b** Rigor pass on phase-6 (deepen + doc-review + integrate).
- [ ] **H-6** Cross-doc coherence sweep. Verify every cross-phase contract agrees.
  Phase N outputs match Phase N+1 inputs. Terminology aligned. Produce
  `docs/plans/playtest-harness/COHERENCE-SWEEP.md`. Fix drift before lock.
- [ ] **H-7** Final lock + status flip. All 6 phase plans draft → locked with date.
  PRD v0.2 → LOCKED. Roadmap draft → active. Record engine.ts + projection.ts
  commit SHAs in each phase's lock log. This gates task #9 (build).

**Landmines for next Claude to avoid:**
- H-1a through H-5a are **mechanical edits** — no judgment, just integrate the
  contracts Phase 1 declared. Briggsy has pre-delegated this work.
- H-1b through H-5b are **rigor passes** — Briggsy delegates judgment unless a
  finding is load-bearing (architecture, premise, scope cap). Surface only those.
- Phase 1 is DONE. Don't re-deepen it. Any contradiction discovered during
  Harden where Phase 1 is wrong = update Phase 1, don't just patch downstream.
- Prototype-detector gate (phase-1 Unit 7) runs during build, NOT during Harden.

**What "done" looks like after Harden:**
- All 6 phase plans locked, all cross-phase contracts agree, coherence sweep
  clean, PRD LOCKED, ready to execute task #9 (build).

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
  3D rotation). See `docs/reviews/emil-audit-2026-04-23.md` §3.5 + §7.

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
- **Remove unused `public/assets/arena/mahogany.png`.** Superseded by 4-edge split.

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
- **Canonical game rules** → `docs/rules/RULES-REFERENCE.md`.
- **Recurring NPC character locks** → `docs/characters/` (e.g. `dolores-grieves.md`).

Nothing hides here anymore. TODO.md is for actionable items only.
