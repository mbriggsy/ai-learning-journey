---
title: "Origin Trailer — Phase 5: Gameplay Capture Harness + Capture"
type: feat
phase: 5
parent: docs/plans/origin-trailer/roadmap.md
origin: docs/ideation/2026-05-15-origin-trailer-brainstorm.md
created: 2026-05-16
deepened: 2026-05-17
reviewed: 2026-05-17
status: active

# Document-review absorption (2026-05-17)

7-persona CE doc-review pass: coherence (18) / feasibility (30) / product-lens (25) / design-lens (23) / security-lens (12) / scope-guardian (27) / adversarial (28) → ~80 unique findings after dedup, ~23 P0s. Absorbed inline by section + cross-phase amendments to Phase 1. Headline absorptions (the structural CALLs):

- **CALL A — Mechanism A spike PROMOTED from escalation-only to Unit 5.0 parallel-prerequisite.** Both mechanisms get characterized in a paired 30-min A/B spike BEFORE the Mechanism lock decision. Mechanism B remains default IF both pass and B is achievable; A wins if empirically competitive AND B is constrained. Pre-deepening "B locks per water-beads rule" was rhetorical, not empirical (adversarial F02 + product F3 convergent).
- **CALL B — R13 splits into R13a + R13b.** R13a = legitimacy claim ("BURNED is shipped & playable software"). R13b = aliveness claim ("playing it produces joy"). Both axes must land; mechanism choice trades off across them. Pre-deepening conflated as single test (product F1).
- **CALL C — Agent-built identity thesis-defense block added.** R14 cold-open + R15 chrome carry the "Briggsy didn't write this either" thesis. S05 humans on camera = AUDIENCE consuming a deployed product, NOT builders. Tension surfaced + reconciled (product F2).
- **CALL D — Mechanism B = physical camera capturing TV + table-with-phones (OBS Video Capture Device source).** Pre-deepening conflated Display Capture (signal-only, no phones visible) with the shot list's "phone screen + board both visible in frame" requirement. Display Capture alone CANNOT satisfy W3. Clarified throughout (design F04/F17).
- **CALL E — Approach III locks LOCAL-DEV ONLY for the dev:stack path.** Production URL captures use Approach I (natural plays, longer takes). Pre-deepening claimed Approach III + production URL coexistable; `scripts/dev-stack-top.ts:59` hardcodes `ws://127.0.0.1:8787` AND production prod-bundle verifier ENFORCES no `PLAYTEST_MODE` — physically impossible against prod (feasibility F3 + adversarial F01).
- **CALL F — REPEALED 2026-05-22.** The original CALL F amendment named Harry as R13 outside-viewer based on `user_harry.md` describing him in human-collaborator terms. Harry is AI (OpenClaw / Claude Code instance via Discord), not a human eye. The team shape is just Briggsy + Claude(s) forever (Briggsy 2026-05-22: *"there are no other players involved, it's just me and you my friend forever and ever … no future phase will change that"*). No multi-person human gate is structurally available. **Briggsy's contamination as sole judge is now an accepted residual risk**, mitigated by the surviving contamination defenses: rubric-floor objective reject, 24h cool-off, random-order top-3 watch, §2 Archer gate, fluency gate. The "Harry blind viewer" / "outside-eye blind viewer" steps in Units 5.0, 5.4, 5.6 are deleted; the ladder collapses accordingly. Cross-ref: memory `feedback-listener-panels-default-to-n1.md` + updated `user_harry.md`.
- **CALL G — Production-URL strategy decision matrix tied to mechanism:** Mechanism A → URL in frame → deploy migration HARD prereq → must show canonical `burned.pages.dev`. Mechanism B → URL not in frame → URL question moot for capture; Phase 7 owns distribution copy (product F9).

P0 technical fixes absorbed (the doc-described scripts CANNOT RUN as written; feasibility-led):

- **dev:stack seed lists use BURNED-canon cards** — pre-deepening listed `defuse,attack,skip,future-vision` (Exploding Kittens names absent from CARD_DEFS); `parseDevActionMessage` rejects with `INVALID_CARD_TYPE`. Replaced with `burn-the-files,extraction,intel-briefing,reassign,falsify-intel,direct-order,burned` throughout Units 5.2/5.3 (feasibility F1).
- **dev:stack CLI signature corrected** — pre-deepening `pnpm dev:stack defuse,extraction,...` (comma-joined, missing room arg) executes as `room='defuse,extraction,...'` with zero cards, dies at `cards.length === 0` guard. Correct: `pnpm dev:stack <ROOM> burn-the-files extraction ...` (space-separated cards as separate argv) (feasibility F2).
- **Approach III seed timing corrected** — pre-deepening "Pre-game seed: BURNED at position 7 from top of deck... then start the game" inverts the actual API. `applyDevStackDeck` rejects unless `state.phase === 'playing'` (`dev-actions.ts:159-161`); lobby phase has NO drawPile yet. Sequence is: lobby → "Cleared Hot" → game starts → dev:stack seeds top-of-pile → first player draws the seeded card on NEXT turn (feasibility F4).
- **godClient.send()/waitForAck() removed from Mechanism A pseudo-code** — `GodHandle` (`scripts/playtest/lib/god-subscriber.ts:58-71`) exposes only `disconnect()` + `onFatalClose`; no public `send`. Mechanism A path now spawns existing `scripts/dev-stack-top.ts` as a child process from the orchestrator (uses its own WS lifecycle, works today) instead of extending `GodHandle` (which would require write-side trust-model changes) (feasibility F5).
- **`pnpm playtest:run` flag wiring spelled out** — pre-deepening `--trailer-capture` + `--duration` would be rejected by `parseArgv`'s strict throw-on-unknown-arg (`run-session.ts:83-128`). New approach: ship a parallel `scripts/playtest/trailer-capture.ts` that imports `runSession` programmatically with seat-factory recordVideo wiring, avoiding the CLI parser churn AND keeping playtest harness's regular flag surface untouched (feasibility F6 + adversarial F05 re: discipline rule enforcement).
- **`verify-briggsy-sentinels.ts` scope extended** — Phase 4 owns this script hardcoded to scenes 4.2-4.7. Phase 5's 5.4/5.6 sentinels were NOT in scope. Cross-phase amendment: extend Phase 4's `SCENES` const to include phase-5 sentinels, OR ship Phase-5-owned mirror. Locked: extend Phase 4's existing script (smaller change, single source of truth) (feasibility F7).
- **HEAD_TRIM_FRAMES from env var, not hardcoded `EXAMPLE`** — pre-deepening directional code `const HEAD_TRIM_FRAMES = 318  // EXAMPLE` invites silent wrong-trim failures (verify-gameplay-clip gate passes on wrong frame). New pattern: `parseInt(process.env.HEAD_TRIM_FRAMES, 10)` with NaN assertion → explicit runtime error if unset (security F09 + adversarial F03/scope F15/design F20 convergent).
- **Mechanism A framerate-aware head-trim math** — Playwright `recordVideo` API exposes only `dir` + `size`, NO framerate option. WebM/VP8 captures at ~25fps under Chromium (variable). Pre-deepening's `/30` divisor for `HEAD_TRIM_SECONDS` would be wrong by ~17%. New pattern: ffprobe `r_frame_rate` first, divide by actual source framerate, then `fps=30` filter handles output CFR conversion (feasibility F9).
- **Atomic-swap on Windows: EXDEV + rename-over-existing handling** — pre-deepening `renameSync` mentions only EBUSY. Cross-drive scenarios throw EXDEV; Windows rename-over-existing has historically been non-atomic. New pattern: catch EXDEV → fallback to copyFileSync + unlinkSync (loses atomicity but works cross-drive); document the trade-off (feasibility F11 + adversarial F16).
- **verify-gameplay-clip gate extended** — pre-deepening checked frame count, dims, no-audio, YAVG only. Added: `pix_fmt = yuv420p` assertion; `r_frame_rate = 30/1` (CFR not VFR); optional `field_order = progressive` warning. Cross-phase amendment to Phase 4's script (feasibility F15).
- **Trim-reference event objectively defined** — "BURNED-draw lands at frame 160 ±2" pre-deepening had no objective definition of WHAT counts as "the draw moment." New definition: "first frame on which the BURNED card art is visible at ≥50% opacity on ANY active player's phone screen." Tolerance documented as ±3 frames at take-selection trim-viability filter (adversarial F07).

Composite + production design absorptions:

- **Mechanism B physical camera spec added** — tripod required (no handheld micro-shake; stat-overlay floating risk); camera height = eye-level-seated; lens prime focal length ≥35mm full-frame equivalent for DoF on phone+TV combined; phone brightness 40-60%; TV reflection kill via 30° off-axis position + matte screen if available (design F01-F04 P0s convergent).
- **Director's-eye production guidance expanded** — wardrobe direction (dark solid tops, no logos, no hoodies — Pendleton operative vibe); background dressing (manila folder w/ CLASSIFIED tape + cream ceramic mug as default props; dark bedsheet behind TV if apartment-wall-coded background) (design F05/F06).
- **§2 Archer-gate at take selection** — separate from fluency gate. Question: "Could a frame from this take appear in an Archer promotional reel? Binary yes/no, no partial." Failures bypass fluency-gate consideration regardless of W1-W6 scores (design F18 + product F4).
- **Cross-device sync moments in shot list** — W1+W3+W5 windows now NAME specific cross-device events (board animation lands at same frame as phone-screen state change; player-count chip increments; multiple phones reacting in sync) as the highest-leverage R13a "shipped & playable" visual signal (product F8).
- **Take selection rubric: 24h cooling-off + random-order re-watch** (Harry blind-viewer step REPEALED per CALL F repeal 2026-05-22) — pre-deepening Briggsy-watches-all-takes-once was anchoring-vulnerable. Ladder: rubric-floor objective reject → 24h cool-off → random-order top-3 watch → §2 Archer gate → fluency gate (product F11 + product F23/F24). The adversarial F06 "Briggsy contamination" concern is no longer mitigated by an outside human; accepted residual risk per CALL F repeal.
- **Composite-fitness test at Unit 5.6** — after take selection, render Phase 4 S05 scene IN ISOLATION (not full trailer) with the real clip + all overlays; spot-check 6 frames at clip-relative 0/90/160/240/360/510 for (a) chrome legibility, (b) head-fade reads as fade not flash, (c) iris-anchor focal point present. NOT skipped — protects against composition problems invisible until Phase 4 consumes (design F09 + adversarial F09).

Scope reductions absorbed:

- **PHASE-5-PREFLIGHT.md ceremony commit DROPPED** — preflight checks remain (they're load-bearing) but recorded in `capture-log.md` mechanism-lock header instead of a separate committed markdown (scope F1).
- **Director's-eye checklist DRY'd** — defined once in Unit 5.1 Step 4; Unit 5.3 Step B.2 cross-refs ("run Unit 5.1 Step 4 checklist; all Y before recording") (scope F9).
- **`recordVideo` directional code lives in Unit 5.3 only** — removed from Unit 5.1 spike (Unit 5.1's purpose is viability question, not build) (scope F8).
- **Approach I fallback trimmed to one paragraph** — full re-specification was duplicate; trim-viability logic lives once in Unit 5.4 (scope F7).
- **PHASE-5-EXIT.md template trimmed** — 55-line template → 4 facts + Phase 6 read-points (scope F13).
- **Insight citation noise trimmed** — first-citation only for insights 050/035/026/022/021; downstream callsites strip inline parentheticals (scope F14).
- **Per-take rubric table simplified** — full 13-col table only for trim-viable takes; rejected takes get one-line dismissal (scope F5).
- **Briggsy sentinel content payload** — sentinel commits now require 2-3 sentence free-text payload (what landed Archer-grade for 5.4; what landed §2 + R13a + R13b for 5.6); rubber-stamp signoffs caught in own writing (adversarial F20).

Cross-phase amendments TRIGGERED THIS COMMIT:

- **Phase 1 lines 1140-1152 (`phase-1-beat-sheet-lock.md`):** retire `gameplay-markers.json` + `<OffthreadVideo startFrom={inPoint} endAt={inPoint + 540}>` contract; replace with pre-trimmed contract reference (Phase 4 deepening lock + this Phase 5 deepening) (feasibility F13 + coherence F1).
- **Phase 1 line 815:** disambiguate cue-table prose; "BURNED card draws on capture" is the visual draw event at frame 160, NOT simultaneous with the frame 360 scream (coherence F1 + adversarial F28).
- **Phase 4's `verify-briggsy-sentinels.ts`:** extend `SCENES` to include phase-5 paths (feasibility F7).
- **Phase 4's `verify-gameplay-clip.ts`:** extend ffprobe gate (pix_fmt + r_frame_rate + field_order warnings) (feasibility F15).

Rejects (findings considered + NOT absorbed):

- **Product F25 (question 18s budget)** — defer to Phase 1 reopen if signaled by Phase 6 panel; not opening here.
- **Scope F2 (collapse Unit 5.0 into 5.1)** — kept Unit 5.0 as its own unit; the 8 preflight checks catch real cross-phase contract drift (load-bearing per F8/F13/F15 feasibility convergence). What scope-guardian called "ceremony" is actually substantive verification. Only dropped the committed PREFLIGHT.md artifact (per scope F1).
- **Scope F12 (Phase 4 ffmpeg bug)** — out of Phase 5 review scope; deferred to Phase 4 plan amendment.
- **Adversarial F14 (calendar deadline 2026-05-24 → state condition)** — kept calendar gate; state-conditions can drift indefinitely, calendar gives Phase 5 entry a definite trigger. Documented limitation.

Phase 5 grew 2283 → ~2750 lines (1.20× growth). Most growth is in Unit 5.0 (added Mechanism A parallel spike step + ~~Harry recruitment~~ — Harry recruitment REPEALED 2026-05-22 per CALL F repeal), Unit 5.1 (rebalanced from B-default-with-A-escalation to A-and-B-parallel-spike-then-lock), Unit 5.4 (24h cool-off + ~~Harry outside-eye~~ + §2 gate ladder; Harry outside-eye REPEALED), and the absorption header you are reading now.
---

# Phase 5 — Gameplay Capture Harness + Capture

## Overview

Phase 5 produces the **live gameplay footage** for S05's closer:
real BURNED multiplayer gameplay captured in a way that visually
sells "BURNED is shipped and playable" within ~18 seconds of screen
time. Output: **`public/trailer/gameplay.mp4`** (BURNED root
`public/` per ADR #15) — 1920×1080 @ 30fps, exactly 540 frames,
audio-stripped, BURNED-draw lands at **clip-relative frame 160**
(per Phase 1 Unit 1.2 Step 6 lock). Phase 4's S05 consumes via
`<OffthreadVideo src={staticFile('trailer/gameplay.mp4')} muted />`
with NO `startFrom`/`endAt` props (Phase 4 deepening locked the
pre-trimmed contract; see Critical Constraints below).

This is the trailer's **only phase that requires running BURNED
end-to-end as a real product** — Phase 4 composes assets but doesn't
boot a game. Phase 5 boots a game, runs through a choreographed
game-flow sequence, captures it, post-processes for trailer
integration, and atomically swaps the file into place.

### R13 splits — two axes that both must land

Pre-deepening "make BURNED look real" was a single fuzzy test. R13
actually carries TWO distinct claims that the gameplay clip must
deliver simultaneously:

- **R13a — Legitimacy claim ("BURNED is shipped & playable software").**
  A first-time viewer watching the 18s clip should perceive the
  game as a real deployed product, not a mockup. Most directly
  evidenced by visual signals a mockup cannot fake: cross-device
  state synchronization, multiple phones reacting in sync to a
  single board event, player-count chip incrementing, COMMS ticker
  scrolling content matched to the moment. **Software-side claim.**
- **R13b — Aliveness claim ("playing BURNED produces joy").**
  The same viewer should perceive that the players in the clip are
  actually enjoying themselves; the game has emotional payoff, not
  just functional correctness. Most directly evidenced by visible
  reactions: leans-in, eyes flicking up, real laughter (audio
  stripped, but visible body language carries it), the cover-mouth
  moment after BURNED draws. **Human-side claim.**

**Mechanism choice trades off across the two axes** (see Problem
Frame for the matrix). Both must land. A pure R13a optimization
(scripted Mechanism A capture) reads as sterile demo reel; a pure
R13b optimization (handheld Mechanism B with no software signals)
reads as "hangout, not shipped product." Phase 5's primary job is
landing both, not maximizing either in isolation.

### Agent-built identity — S05 humans on camera ≠ S05 humans built it

The trailer's payoff thesis (per Phase 1 R15 #5 closing card) is:
**"DRAFTED, RENDERED, AND SHIPPED BY AUTONOMOUS AGENTS. — Briggsy
didn't write this part either."** Phase 5 is the ONE section of
the trailer that puts real humans on screen (Mechanism B path) or
risks them being absent entirely (Mechanism A path). Either choice
must resolve the surface tension with the agent-built thesis:

- **S05 humans = AUDIENCE consuming a deployed product, NOT builders
  of the product.** R14 cold-open ("the machine that built it") +
  R15 chrome (running classification-stamp + closing card at frame
  2835) carry the agent-built thesis explicitly. S05 carries the
  "and look — it works, and the people who play it enjoy it" beat.
  The two claims are complementary, not competing. Phase 5 capture
  must NOT inadvertently coach players to look like builders or
  developers — players should read as PLAYERS (relaxed posture,
  reaction-driven, not screen-leaning-with-mouse-and-keyboard).
- **Mechanism choice intersects identity:** Mechanism A (Playwright
  headless, no humans on screen) cleanly preserves the agent-built
  thesis but produces R13b drift (no aliveness signal — sterile
  demo). Mechanism B (humans visible) cleanly carries R13b but
  must be DIRECTED so the humans read as audience, not builders.
  Phase 5 Unit 5.1 Step 4 director's-eye checklist enforces this
  (no dev-style poses — no laptops, no monitors-in-frame, no
  developer wardrobe).

This tension is reconciled, not eliminated. If a Phase 6 panel
member surfaces "the humans looked like devs" the failure mode is
Unit 5.1 production-direction, NOT mechanism choice.

Phase 5 produces:

- `public/trailer/gameplay.mp4` — the captured + trimmed clip,
  1920×1080 @ 30fps, exactly 540 frames (18.0s), audio stream
  absent (`ffmpeg -an` + `-map 0:v:0`), BURNED-draw at clip-relative
  frame 160 (5.33s in)
- `videos/trailer/sample-eval/gameplay-capture/` — capture proofs,
  per-take logs, post-process log, take-selection record
- `videos/trailer/sample-eval/gameplay-capture/PHASE-5-EXIT.md` —
  handoff document Phase 6 reads
- `videos/trailer/sample-eval/gameplay-capture/briggsy-review-5.4.signoff` —
  take-selection sentinel (git-author check; per Phase 4 deepening
  pattern)
- `videos/trailer/sample-eval/gameplay-capture/briggsy-review-5.6.signoff` —
  R13 acceptance sentinel
- (Mechanism A path only) `scripts/playtest/run-session.ts`
  EXTENSION via `--trailer-capture` mode flag + `recordVideo` on
  context creation (do NOT reinvent the harness)

Phase 5 exits when:
1. `public/trailer/gameplay.mp4` exists and `pnpm verify:gameplay-clip`
   gate passes (Phase 4-owned script: 540 frames, 1920×1080, no
   audio stream, YAVG luminance logged).
2. Briggsy signs off via `briggsy-review-5.4.signoff` (take
   selection) + `briggsy-review-5.6.signoff` (R13 acceptance).
3. Phase 4 S05 scene re-renders successfully with the real clip
   (Phase 4's `scripts/sync-gameplay-clip.ts` lifecycle hook flips
   `GAMEPLAY_CLIP_SOURCE` constant to point at real file).
4. `PHASE-5-EXIT.md` documents: mechanism used, take selected,
   capture date, BURNED-draw raw frame, head-trim frames,
   first-frame YAVG luminance, R5 outcome scream alignment.

---

## Problem Frame

Per brainstorm Outstanding Questions §Deferred-to-Planning:

> **[Affects R13][Technical + Creative]** Gameplay capture mechanism
> AND shot list. Mechanism: Playwright multi-context with video
> trace? OBS + real devices? Headless WSS replay? Briggsy + a friend
> on real phones? Specify resolution, framerate, aspect-fit for the
> 16:9 cut. Shot list: which screens, which game phases, which player
> counts, which dramatic beats. The product is capture-ready; the
> harness is not.

Per roadmap §5.6: **"Playwright `page.video()` / trace-video gameplay
capture (R13) — brand-new. Phase 5 budgets a full standalone phase
for invention."** No prior art for live gameplay capture across
multi-context state, but Phase 5 deepening surfaces two important
precedents that change the framing:

1. **The BURNED playtest harness at `scripts/playtest/` already
   runs multi-context Playwright across BURNED with correct DOM
   selectors, `PLAYTEST_TOKEN` auth, and `dev:give`/`dev:stack`
   dev-action hooks for choreographed plays.** Adding `recordVideo`
   to its context creation is a 2-3 line change. If Mechanism A is
   invoked, it MUST extend the harness — NOT build a parallel
   spike. Repo-research verified this: the harness has
   `seat-factory.ts:160-161` joining via `input[type="text"]` +
   `button:has-text("Check In")` (the correct selectors), handles
   `PLAYTEST_TOKEN` via `--var KEY:VALUE` to wrangler, and exposes
   god-event subscriber for state observation. Building a from-
   scratch spike would re-implement 95% of what already ships.

2. **Insight 035 (SmartActionBox breathe animation defeats Playwright
   stability) is RESOLVED.** Verified in
   `src/client/player/SmartActionBox.module.css:136-143`: the
   breathe animation now lives on `.action::after` pseudo-element;
   the button DOM stays stable for Playwright agents. Comment at
   line 130 confirms: *"Pulse glow + scale live on ::after so the
   button DOM stays stable for Playwright agents (insight 035)."*
   Phase 5 Mechanism A is unblocked on this specific gotcha.

Two capture mechanisms remain in scope. Mechanism C (hybrid) was
**CUT** during deepening (two-source-sync produces a Phase 4
composition problem with no downstream lane).

**Doc-review absorption: Mechanism B vs A parallel spike** — the
pre-deepening "B locks per water-beads + VP8-1Mbps ceiling" framing
was rhetorical not empirical. The water-beads rule (brainstorm
line 55) is an EDIT-BAY tiebreaker between "engineering" vs
"product joy" framings, NOT a capture-mechanism selection rule. The
VP8-ceiling argument is a quality-CEILING test, not a quality-FLOOR
test for R13. Neither establishes that B beats A at delivering R13
empirically. Unit 5.0 Step 6a (NEW) runs a 30-minute parallel A/B
spike with identical Approach III seed; Unit 5.1 locks the mechanism
based on empirical fluency comparison + R13a/R13b axis-tradeoff
recognition, not on rhetorical priors.

| Mechanism | Strengths (R13a/R13b axis) | Weaknesses (R13a/R13b axis) | Resolution / framerate |
|-----------|-----|-----|---|
| **A. Playwright multi-context (via playtest harness extension)** | **R13a strong** — clean pixel-perfect rendering, browser chrome can SHOW canonical production URL (`burned.pages.dev`) as deployment evidence, deterministic + reproducible across iterations. Fully scripted; no real devices; reuses tested playtest-harness infrastructure (`scripts/playtest/`). **R13a-vs-AI-slop**: headless browser recording risks reading as CI artifact / demo reel without aliveness signals. | **R13b weak** — no humans on camera, no real reactions, no ambient context. Records WebM/VP8 at Playwright's encoder default (~1Mbps target, ~25fps internal cadence — see Critical Constraints "Mechanism A reality"). Headless GSAP/Framer animation fidelity unverified at capture-time (DramaOverlay BURNED beat must be validated in Unit 5.0 spike). Cleaner-than-Archer aesthetic (no ambient practicals; flat-rendered UI). | WebM/VP8 default, viewport-matched size, ~25-30fps variable; needs full re-encode to H.264 (NOT stream-copy) in post; framerate-aware head-trim math required |
| **B. OBS + real devices** (board on TV, 2-3 phones held by humans, captured via physical camera or screen-mirror + OBS) | **R13b strong** — real touch animation, real phone screens, real human reaction (visible body language even with audio stripped). Native 1080p quality if camera + lighting controlled. Archer-coded ambient lighting / table dressing achievable with director's-eye discipline. | **R13a moderate-to-strong IF directed well** — phones-reacting-in-sync IS the cross-device-multiplayer signal a mockup can't fake (per R13a Definition). **R13a-vs-AI-slop**: undirected reads as "guy filming his living room" / YouTube DIY walkthrough; the Archer aesthetic is photographically antagonistic (Archer = flat-color illustration; reality = ambient + reflections + DoF). Production-design discipline is load-bearing AND requires friend availability. iPhone-screen-photographed-by-camera has viewing-angle color shift + reflection risk + DoF challenges. | OBS 1920×1080 @ 30fps native (MKV-then-remux for crash safety per OBS 30/31; or Hybrid MP4 on OBS 32+); CAMERA SOURCE is OBS **Video Capture Device** not Display Capture (see CALL D below) |
| ~~**C. Hybrid: Playwright board + OBS phones**~~ | ~~Captures both halves at maximum quality~~ | **CUT during deepening.** Two-source sync produces a Phase 4 composition problem with no downstream lane. Not reconsidered unless A and B both fail completely. | n/a |

**Mechanism lock procedure (revised per CALL A):** Unit 5.0 Step 6a
spikes BOTH mechanisms in parallel (30-min budget) — minimum viable
capture of 10s each with the same Approach III seed. Unit 5.1 Step 1
compares the two against fluency rubric + §2 Archer gate; locks
the mechanism that LANDS BOTH R13a and R13b best. Default tiebreaker
if both pass equivalently: Mechanism B (Archer-aesthetic ceiling
favors human-in-room ambient when production-design is controllable;
matches brainstorm tiebreaker rule's water-beads intent in spirit).
If Mechanism B logistics fail (no friends scheduled by Step 6c
deadline) OR Mechanism B spike fails production-design floor:
Mechanism A locks default unconditionally — NOT as "escalation,"
as a first-class option.

**Mechanism A path: child-process orchestration (CALL revised
post-feasibility F5).** Pre-deepening pseudocode called fictional
`godClient.send()` / `waitForAck()` methods. `GodHandle`
(`scripts/playtest/lib/god-subscriber.ts:58-71`) exposes ONLY
`disconnect()` + `onFatalClose`; no public send. Implementation:
Mechanism A orchestrator spawns existing `scripts/dev-stack-top.ts`
as a child process via `execFileSync('pnpm', ['dev:stack', room, ...cards])`.
The dev-stack-top script has its OWN god-client lifecycle (mints
fresh PLAYTEST_TOKEN, opens god-WS, sends `dev-stack-deck`,
disconnects). This is cleaner than extending `GodHandle` with write
side (which would change the trust model from read-only-observer to
write-side dev-action injector). See Unit 5.3 Step A.5 for argv
shape.

**Mechanism A path: parallel script, NOT --trailer-capture flag
(CALL revised post-feasibility F6).** Pre-deepening `pnpm playtest:run
--trailer-capture --duration 45` would be rejected by `parseArgv`'s
strict throw-on-unknown-arg. Implementation: ship parallel
`scripts/playtest/trailer-capture.ts` that imports `runSession`
programmatically with seat-factory `recordVideo` wiring. Keeps the
playtest harness's regular CLI surface untouched; trailer-capture
mode is a separate entry point with explicit options. Discipline
question (adversarial F05 — "MUST extend harness, not spike") is
resolved by IMPORTING from the harness libs (`scripts/playtest/lib/*`),
not duplicating them.

The brainstorm's gating dependency: **"Deploy migration partykit →
Cloudflare Workers complete (per TODO.md §1 note)."** Concrete
state as of 2026-05-17: 5 single-line code changes uncommitted
(board.html, player.html, public/_headers, ActRemote.tsx, room.ts)
+ 1 untracked CI workflow (`.github/workflows/deploy-burned.yml`).
Shippable in minutes once Briggsy + Harry verify Cloudflare
dashboard side (CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID,
Pages binding for `burned-cxa.pages.dev`). **Phase 5 entry gate**
(Unit 5.0): if migration is not green by **2026-05-24** (one week
from candidate Phase 5 entry), Phase 5 unblocks via local-dev
fallback unconditionally — production credibility degrades
slightly but visual quality is unchanged.

### Production URL strategy matrix (CALL G)

Per feasibility F3+F12 + product F9: URL strategy depends on
mechanism, not independently chosen. The pre-deepening "verify with
Briggsy at execution start" hand-off is wrong because the URL
question is settled BY the mechanism choice:

| Mechanism locked | URL visible in capture? | Deploy migration status required? | URL question owner |
|-----|-----|-----|-----|
| **A (Playwright)** | YES (browser chrome may show URL bar; even if hidden, page-rendered context is the deployed URL) | **HARD prerequisite** — must show canonical `burned.pages.dev` (NOT `burned-cxa.pages.dev` auto-generated preview which undermines "shipped"; NOT `http://192.168.x.x:5173` local-dev which catastrophically fails R13a) | Phase 5 (capture-time gating) |
| **B (OBS physical camera)** | NO — capture frames the TV + table-with-phones; no URL bar visible | Desirable but NOT blocking for capture; Phase 7 distribution copy carries production URL textually | Phase 7 (distribution copy) |

> **⚠️ CORRECTION (2026-06-01): the research below is WRONG.** `burned.pages.dev`
> is **not ours** — it's squatted by an unrelated Cloudflare account (verified: it
> serves a parked error page). `burned-cxa.pages.dev` was **not** a preview/canary;
> it was the *production* subdomain, collision-suffixed because `burned.pages.dev`
> was already taken globally. The project has since been migrated to **`burnedgame`**
> → canonical URL is now **`burnedgame.pages.dev`**. See `docs/DEPLOY.md` for the
> verified truth. (The trailer was already captured under the old URL; this note
> exists so the false claim doesn't propagate.)

~~The pre-deepening "Pages project name is `burned`" research holds:
canonical URL is `burned.pages.dev`. The `burned-cxa.pages.dev` URL
in `ActRemote.tsx` IS a PR-preview / canary subdomain (verified post-
absorption — Cloudflare Pages auto-generates `<project>-<short>.pages.dev`
preview URLs for non-canonical deploys; `cxa` is the short-hash).
Phase 5 entry under Mechanism A FORCES canonical URL OR aborts.~~

**Phase 5 entry gate (Unit 5.0): if migration is not green by
2026-05-24** (one week from candidate Phase 5 entry):

- **Mechanism A path:** Phase 5 is BLOCKED — local-dev fallback
  (`http://192.168.x.x:5173`) catastrophically fails R13a "shipped &
  playable." Either resolve the migration (escalate to Briggsy +
  Harry on Cloudflare dashboard side) OR switch to Mechanism B
  unconditionally.
- **Mechanism B path:** Phase 5 proceeds with local-dev fallback;
  URL is not in frame so capture is not impacted. Phase 7 carries
  the URL textually post-migration.

Adversarial F14 notes the 2026-05-24 calendar gate may go stale if
Phase 5 doesn't start near 2026-05-17. Held as calendar gate
deliberately — state-conditions (e.g., "no migration commits in 7
days") can drift indefinitely; the calendar trigger gives Phase 5
entry a definite decision point. If Phase 5 entry is delayed past
2026-05-24, treat the deadline as triggered (deploy is either green
or it's not).

### Mechanism B physical camera architecture (CALL D)

Pre-deepening Mechanism B conflated TWO different capture setups:

- **Setup 1 — OBS Display Capture (signal-path-only):** OBS captures
  the board's digital display output (the TV's signal). NO physical
  camera. Output is pixel-perfect board UI — but **phones are NOT
  visible in frame** because the TV signal carries only the board
  view, not the table or hands.
- **Setup 2 — OBS Video Capture Device (physical camera):** A
  physical camera (phone, DSLR, webcam) is mounted at ~30° to the
  TV, framing TV + table + phones-in-hand together. OBS captures
  the camera's output as a Video Capture Device source. Output is
  the **table-scene framing** with TV + phones-in-foreground all
  visible.

The Phase 5 SHOT LIST (Unit 5.2 W3) requires "phone screen + board
both visible in frame at the BURNED-draw beat." **Display Capture
ALONE cannot satisfy this** — design F04/F17 P0. Mechanism B as
defaulted in this plan = **Setup 2 (physical camera + OBS Video
Capture Device)** unless otherwise specified.

**Setup 1 (Display Capture) is a Mechanism B' VARIANT** that may
substitute IF the shot list is rewritten to land R13 on board-UI
signals only (cross-device sync visible via the board view's player
chips + COMMS ticker scrolling, without phones-in-frame). Unit 5.1
Step 1 lock decision considers this variant as a fallback if Setup 2
production-design fails (e.g., apartment lighting unrecoverable).

**Camera rig spec (Mechanism B Setup 2):**
- Camera class: phone-on-tripod (e.g., iPhone 14 Pro+ mounted via
  cold shoe / clamp) OR mirrorless / DSLR with 24-35mm equivalent
  prime lens at f/4-5.6 (deep DoF essential — phone-and-TV must
  both be in focus). Phone-camera-on-tripod is the default
  (achievable without additional gear).
- **Tripod REQUIRED** (no handheld). Handheld micro-shake causes
  stat-overlay floating in Phase 4 composition (overlays glued to
  moving plate read as post-production tells; product F7 +
  design F02).
- Camera height: eye-level seated at the table (reads as "at the
  table with the players"); NOT chest-height standing (reads as
  surveillance) and NOT tabletop level (reads as documentary).
- Distance from TV: such that TV occupies ≥50% of frame width with
  phones held at table-edge clearly visible in lower-mid foreground.
- Angle: ~25-35° off-axis from TV normal (NOT dead-on which reads
  as surveillance; NOT >45° which keystones TV image outside
  mobile-safe-square per design F10/adversarial F19). **Calibrate
  at Unit 5.1 Step 3** with framing-test shot.

**Production design checklist** (consolidated; defined once here,
cross-referenced from Unit 5.3 per scope F9):
- **Lighting:** warm practicals 2700-3000K only; NO overhead
  fluorescent. Two-three lamps minimum to kill flat-shadow
  apartment-light. Aim a key light at the table from camera-rear
  angle so phone screens are illuminated indirectly (not
  reflection-blowing the phone glass).
- **Phone brightness:** set to 40-60% (NOT auto, NOT max). Auto
  overshoots in warm-ambient → blown highlights at the BURNED
  draw beat (design F03 P0). Test one preview frame: can you read
  text on the phone screen in the recording?
- **Wardrobe:** players in dark solid tops, no logos, no hoodies.
  Pendleton-operative vibe (cream/mahogany/teal solids preferred),
  not living-room hoodie (design F05).
- **Background dressing:** behind TV — dark bedsheet OR position
  TV close-cropped so background doesn't show. ON the table —
  manila folder with "CLASSIFIED" tape + cream ceramic mug as
  default props (briefing-room read). NO laptops, NO monitors, NO
  game boxes, NO software-demo signals — these undercut the
  agent-built thesis (S05 humans must read as AUDIENCE, NOT
  builders; per Overview agent-built identity block) (design F06 +
  product F2).
- **Reflections:** test capture for TV-glass reflections (room
  lights, camera lens, faces). Re-position camera angle to kill
  reflections at the TV center (the BURNED-draw landing zone).
- **Hands:** visible but sleeves dark; faces cropped below eyeline
  OR framed from behind (PII reduction; security F02 + design F05).
- **Audio capture on Mechanism B:** OBS scene MUST mute all sources
  (Display Capture audio off, Mic disabled, Video Capture Device
  audio off). Per three-layer audio policy. ONE exception (adversarial
  F26): a single dedicated "audio-archive" take MAY be captured
  WITH audio enabled and archived separately at
  `videos/trailer/sample-eval/gameplay-capture/audio/archive-take-NN.m4a`
  — Phase 6 may consult if R5=cut chuckle-SFX needs real laughter
  reference. NEVER used for the trailer clip itself (still triple-
  stripped).

### Largest risk + mitigations

The largest risk Phase 5 manages: **the capture doesn't visually
sell BOTH R13a (shipped + playable software) AND R13b (real joy of
playing)** — instead reading as a screen recording of a local dev
session, engineering footage, OR YouTube DIY walkthrough rather
than Archer-coded gameplay. Phase 5 mitigations:
- Empirical mechanism A/B spike (Unit 5.0 Step 6a) — locks the
  best-fit mechanism for THIS R13a+R13b trade-off, not theoretical
- Shot list (Unit 5.2 Step 2) curated for cross-device sync moments
  (R13a-defining: phones reacting in sync to board events, player-
  count chip incrementing, COMMS ticker scrolling content matched
  to the moment) + reaction-driven moments (R13b-defining: BURNED
  card draw, intercept stack, defuse placement)
- Approach III deterministic deck-seeding (Unit 5.2 Step 3) +
  natural human reactions on top — local-dev-only path; reactions
  are unscripted (the deck order is rigged + invisible to viewers,
  reactions are not)
- §2 Archer gate at take selection (Unit 5.4) — separate from
  fluency gate; binary YES/NO: "could this frame appear in an
  Archer episode?" If NO, take rejected regardless of W1-W6 scores
- Multi-stage take-selection ladder (Unit 5.4) — rubric floor →
  24h cooling-off → random-order top-3 watch → §2 gate → fluency
  gate (Harry outside-eye step REPEALED per CALL F repeal
  2026-05-22; Briggsy contamination accepted as residual risk)
- Director's-eye production checklist (above) — Mechanism B
  load-bearing for both R13a (cross-device signals visible) and
  R13b (joy visible without slop)

---

## Critical Constraints Surfaced by Research

Cross-reference: roadmap §5.6, brainstorm Outstanding Questions,
Phase 4 deepening commit `9e31ae4b`, Phase 1 deepening commit
`43d44ef4`, insights 026/035/050/022.

### Path discipline (ADR #15)

**All Phase 5 render-consumed artifacts land at `public/trailer/...`
inside BURNED's root `public/`.** Phase 0 ADR #8
`Config.setPublicDir('../../public')` resolves `staticFile()` against
BURNED's `public/` directory; Phase 4's `scripts/sync-gameplay-clip.ts`
calls `existsSync(resolve('public/trailer/gameplay.mp4'))`. Phase 5
writing to `videos/trailer/public/gameplay.mp4` (the pre-deepening
path) is UNREACHABLE — the file would never be discovered by Phase
4's lifecycle hook, S05 would silently render the placeholder forever.

`videos/trailer/sample-eval/gameplay-capture/` remains the correct
location for ALL non-render artifacts: takes/, raw/, intermediate
trimmed, logs, signoff sentinels, eval markdowns. Sample-eval is
reserved (per ADR #15) for files Remotion render does NOT load.

### BURNED-draw clip-relative frame 160 (NOT 360)

Per Phase 1 Unit 1.2 Step 6 lock (line 807): **BURNED-draw lands
at scene-relative frame 160** (~5.33s into S05). Phase 5
pre-deepening had frame 360 throughout — that was wrong. Frame 360
is the SCREAM cue (R5-contingent), which is a REACTION beat **200
frames after the draw**, NOT simultaneous with it.

S05 cue timeline (relative frames):

| Relative frame | Beat | Note |
|----------------|------|------|
| 0 | Hard cut entry from S04; S05HeadFadeFromBlack overlay frames 0-15 ramps black→frame-0 | Phase 4 owns the fade overlay |
| 0-159 | Active gameplay establishing; multiplayer dynamic visible | R15 chrome ticker continues |
| **160** | **BURNED card draws; DramaOverlay BURNED beat begins** | R15 chrome "OPERATIVE [REDACTED] — METHOD REPEATABLE" at frame 160 + 0 |
| 160-280 | DramaOverlay BURNED beat plays out (in-game cinematic) | ~4s |
| 280-360 | Visible reaction window; players reacting to the draw | Lead-in to scream beat |
| 240 | Sparse Dash VO: "And — between you and me — they appear to be enjoying it." | Phase 4 composition-level audio |
| 360 | Scream cue (R5-contingent): "VERAAA!!!" | Sterling-CODED deadpan-late reaction; if R5=cut, beat replaced with chuckle SFX from gameplay |
| 360-450 | Continuation; aftermath visible | |
| 450-540 | Tail; iris-wipe begins at frame 495 (S05_END - 45 per Phase 1) | Frame composition must support iris collapse |

**This reframing eliminates a category of conflations in
pre-deepening Phase 5.** Draw and scream are not the same beat; the
trailer's narrative grammar is "visual surprise → sardonic delayed
VO reaction" (Archer-coded), not "scream sound effects on draw
moment" (action-movie-coded).

**Cross-phase note (RESOLVED THIS COMMIT):** Phase 1 line 815
cue-table prose disambiguated as part of this doc-review absorption.
"In-game BURNED card draws on capture" = the visual draw event at
clip-relative frame 160, NOT simultaneous with the frame 360 scream
beat. Phase 1 amendment landed in the same commit (coherence F1 +
adversarial F28).

### Pre-trimmed contract — Phase 5 trims, Phase 4 consumes verbatim

Phase 4 deepening (commit `9e31ae4b`) locked the consumption pattern
at `phase-4-remotion-composite.md:2559-2562`:

```tsx
<Sequence from={0} durationInFrames={540}>
  <OffthreadVideo
    src={staticFile(GAMEPLAY_CLIP_SOURCE)}
    muted
    // NO startFrom / NO endAt / NO trimBefore / NO trimAfter
  />
</Sequence>
```

**Trim ownership = Phase 5.** Phase 5 ships
`public/trailer/gameplay.mp4` already trimmed to exactly 540 frames
with BURNED-draw at clip-relative frame 160. Phase 4 plays it
start-to-end. There is NO `gameplay-markers.json` artifact; the
markers contract from Phase 1 deepening's earlier formulation is
**OBSOLETE** — Phase 1 lines 1140-1152 amendment landed in the same
commit as this doc-review absorption (feasibility F13).

This contract also means: if Phase 5's trim math is wrong (e.g.,
BURNED draw lands at clip-relative frame 200 not 160), the scream
beat at scene-relative frame 360 will fire on the wrong visual
context. Trim math is load-bearing.

**BURNED-draw reference event — objective definition (adversarial F07):**
The pre-deepening "BURNED-draw lands at frame 160 ±2" had no
objective definition of WHAT counts as "the draw moment" — three
candidate events sit 30+ frames apart:

- Candidate (a): the frame the BURNED card image FIRST becomes
  visible on the active player's phone screen at ≥50% opacity.
- Candidate (b): the frame the board's DramaOverlay BURNED beat
  begins (overlay starts ramping in).
- Candidate (c): the frame the deck-top card is flipped on the
  board's discard fan.

**Locked: Candidate (a).** This is the player-side perceptual
event — the moment the drawer-player FIRST sees BURNED. Phase 4's
DramaOverlay begins ~6-8 frames AFTER candidate (a) (server-broadcast
latency + Framer Motion mount delay). Phase 1's cue-table beat at
relative frame 160 is candidate (a); subsequent DramaOverlay
animation occupies frames ~166-280.

**Trim viability filter:** Phase 5 take-selection must reject any
take whose RAW BURNED frame (event (a)) is < 160 (head-trim cannot
pad backward) OR whose RAW total length is < 160 + 380 = 540 frames
post-draw (Shot 5 reaction beat needs ~12.7s of post-draw content
for natural play + iris-wipe target composition). Realistic raw-take
minimum: ~30 seconds (900 frames) at 30fps.

**Trim tolerance: ±3 frames** of clip-relative frame 160. Phase 4's
S05 composition is frame-160-anchored; ±3 frames is the perceptual
floor for DramaOverlay-vs-Dash-VO-at-240 timing alignment. Outside
±3 → re-trim, do NOT accept.

### Atomic-swap pattern

Phase 4 line 2722-2724 defines the handoff procedure:

```
1. Phase 5 writes public/trailer/gameplay.mp4.new
2. pnpm verify:gameplay-clip ./public/trailer/gameplay.mp4.new  ← ffprobe gate
3. If PASS: mv public/trailer/gameplay.mp4.new public/trailer/gameplay.mp4
4. If FAIL: surface failure (duration drift / has audio / wrong aspect); re-encode
```

Reasons:
- Remotion's `<OffthreadVideo>` may have an open read handle; on
  Windows `fs.renameSync` over an open file throws EBUSY. Atomic
  swap minimizes the window.
- If `pnpm render` or `pnpm studio` is in-flight when Phase 5
  overwrites, partial-file reads corrupt the render output.
- Phase 4's `sync-gameplay-clip.ts` prerender hook checks
  `existsSync` for the final filename, not `.new` — the atomic
  rename triggers the source-of-truth flip.

**Windows note:** If Briggsy keeps `pnpm studio` running during a
Phase 5 capture session, close studio BEFORE the swap to avoid
EBUSY. Document in `PHASE-5-EXIT.md`.

### Audio policy — three-layer belt-and-suspenders

Per Phase 2 deepening contract #3 + Phase 4 deepening:

1. **Capture silent** (preferred): OBS scene config mutes all audio
   sources OR Playwright records context with no audio attached.
2. **`ffmpeg -an` + `-map 0:v:0`** in Phase 5 Unit 5.5 post-process
   explicitly drops audio streams (handles OBS-captured silent PCM
   tracks that would otherwise persist).
3. **`<OffthreadVideo muted />`** in Phase 4 Unit 4.6 scene
   composition is the final gate.

All three are intentional. The `pnpm verify:gameplay-clip` ffprobe
gate fails if ANY audio stream is present (including silent PCM),
so layer 2 must execute even when layer 1 succeeds.

### Mobile-safe-square constraint (X-feed 1.91:1 crop)

Per roadmap §5.3: X serves a 1.91:1 in-feed preview crop on mobile.
Critical visual content must live within the central 1:1 safe
square inside the 16:9 frame.

**For Phase 5:** the BURNED-draw beat at clip-relative frame 160 is
the trailer's emotional climax. The phone screen (showing the
BURNED card) and the board TV (showing the DramaOverlay BURNED
beat) MUST land within the central horizontal band x=420 to x=1500
(the central 1080px of 1920). Capture composition direction:

- **Mechanism B**: position camera so that TV screen center sits
  within x=[420, 1500] band; phones held in foreground also within
  this band when visible during the BURNED-draw beat.
- **Mechanism A**: if invoked, the board context (1920×1080) is
  full-width — but the critical UI elements (DramaOverlay center,
  active player indicator) typically already sit center-frame, so
  this constraint is automatically satisfied.

The establishing shot (Shot 1, frames 0-90) MAY push to edges for
context, but the BURNED-draw beat and Dash VO frame 240 ("between
you and me") are high-priority safe-square moments.

### Frame-0 luminance / head-fade interaction

Phase 4's `S05HeadFadeFromBlack` overlay (mandatory per Phase 4
deepening amendment TIER 1 #5) ramps black→frame-0 opacity over 15
frames. Phase 4's `pnpm verify:gameplay-clip` measures first-frame
mean luminance via FFmpeg `signalstats` YAVG (range 0-255):

- **YAVG ≤ 76.5** (≤30% luminance): natural fade-friendly; head-fade
  is cosmetic insurance.
- **YAVG > 76.5**: head-fade is LOAD-BEARING for the hard-cut
  chapter break; do NOT remove the overlay; soft-warning logged.

**Phase 5 capture direction** (optional optimization): prefer
establishing shots where frame 0 is mid-tone-to-dark — venetian
blinds nearly-closed, room ambient warm-not-overhead, players'
hands holding phones at the lower band, board mid-game with dim
DiscardFan rather than full-bright lobby. If natural lighting
demands frame 0 is bright, the mandatory head-fade carries the
chapter break either way — this is not a correctness gate, but a
craft optimization.

### Iris-wipe center anchor (frames 495-540)

Phase 4's iris-wipe is a circular SVG mask collapsing from full
frame to 0% radius, anchored at frame center (960, 540 in 1920×1080).
**The last 3 seconds of gameplay.mp4 must support iris collapse.**
Capture direction:

- **Frames 480-540** (last 2 seconds): primary subject (player
  reaction OR board CASE BANNER OR active gameplay) sits center-frame
  within ~400px radius of (960, 540).
- Background motion minimal in this window — auto-exposure shifts,
  hand crossings through center, sudden camera moves all jank the
  iris collapse.
- **Mechanism B direction**: tell players to freeze for a beat
  after BURNED-draw reaction so the camera settles before iris
  starts.

**Iris-frame composition test** in take selection: pause take at
clip-relative frame 510 (mid-iris-collapse moment); is there a
clear focal point within the central 30% of the frame? If NO, take
is rejected for iris incompatibility.

### Lower-40px ticker reservation (R15 #2)

Phase 4's R15 #2 comms-ticker continues through S05 (per Phase 4
Requirements Trace, line 588). The ticker occupies the lower ~40px
band of the 1920×1080 frame as a composition-level overlay.

**Phase 5 capture direction**: ensure no critical subject (phone
bezels, hands, player bodies, ASCII chrome) sits in the bottom 40
pixels of the capture frame. Table edge should appear as clean
surface or subtle gradient in this band. Phase 4's ticker renders
with appropriate backdrop opacity but a visually cluttered band
underneath degrades readability.

### Mechanism A reality — Playwright records WebM/VP8 at ~1Mbps, VARIABLE framerate

If Mechanism A is invoked, the output container is **WebM (VP8)**,
NOT MP4. This has FIVE consequences (5th surfaced post-feasibility F9):

1. **Filename convention**: takes saved as `take-NN.webm`, not
   `.mp4`.
2. **Trim cannot be stream-copy**: WebM→MP4 requires full re-encode
   (libx264) because the container/codec differ. `ffmpeg -c copy`
   will fail with container mismatch error.
3. **Visual quality is CEILED at VP8 ~1Mbps target bitrate**
   (Playwright's encoder default). Post-processing cannot recover
   detail that VP8 never encoded. **Doc-review caveat:** this is a
   quality-CEILING test, not a quality-FLOOR test. VP8 1Mbps of
   clean pixel-perfect React UI at 1920×1080 is plausibly sharper
   than handheld-camera-photographed-iPhone-screen-through-reflections.
   Empirical A/B spike (Unit 5.0 Step 6a) settles this for R13.
4. **Frame-accurate trim requires `-ss AFTER -i` + re-encode** (NOT
   `-ss BEFORE -i + -c copy`). The "fast keyframe seek" pattern
   drifts to nearest preceding keyframe (up to ~2-8s on default GOP
   sizes for both VP8 and OBS-default H.264).
5. **Framerate is VARIABLE, not 30fps** (per feasibility F9).
   Playwright's `recordVideo` API (verified @ `playwright-core@1.59.1`
   `types/types.d.ts:23060-23089`) exposes ONLY `dir` + `size` — NO
   framerate option. WebM/VP8 captures at internal browser cadence,
   typically ~25fps under Chromium, sometimes 28-30fps under light
   load. Pre-deepening's `/30` divisor for HEAD_TRIM_SECONDS would
   be wrong by ~17% if actual source is 25fps. **Correct math:**
   Unit 5.5 Step 0 ffprobes the raw take, reads `r_frame_rate`,
   uses ACTUAL source framerate as the divisor for HEAD_TRIM_SECONDS,
   THEN applies `fps=30` filter to ensure CFR 30fps output.

### Insight 035 RESOLVED — Mechanism A click stability unblocked

Verified in `src/client/player/SmartActionBox.module.css:131-143`:
the breathe animation now lives on `.action::after` pseudo-element
(content: '', position: absolute, inset: 0); the `<button
className={styles.action}>` DOM stays stable for Playwright agents.

This was a Phase 6 calibration blocker (`docs/insights/035-...md`)
that has shipped. Phase 5 Mechanism A's `locator.click()` on
SmartActionBox action buttons will pass actionability checks. The
RELATED constraints that remain (selectors must match real DOM,
headless GSAP/Framer fidelity must be validated in spike) are
addressed in Unit 5.1.

### dev:stack / dev:give available for Approach III — LOCAL-DEV ONLY (CALL E)

Per `package.json:13-15`:
```
"dev:stack": "tsx scripts/dev-stack-top.ts",
"dev:give":  "tsx scripts/dev-give-card.ts",
"dev:take":  "tsx scripts/dev-take-card.ts",
```

These dev-action scripts are tested infrastructure (see
`src/server/dev-actions.test.ts:11-87`) that send `dev-stack-deck` /
`dev-give-card` / `dev-take-card` payloads to the room's
dev-action handler.

**Approach III is LOCAL-DEV ONLY (CALL E + feasibility F3 + adversarial
F01).** `scripts/dev-stack-top.ts:59` hardcodes the god-WS URL:

```ts
const url = `ws://127.0.0.1:8787/parties/game-room/${encodeURIComponent(room)}?role=god&token=...`
```

The script can ONLY reach a local wrangler dev server. Production
Workers deploys leave `PLAYTEST_MODE` unset (enforced by
`scripts/verify-prod-bundle.ts` which greps `dist/**` for sentinel
strings); god-WS upgrades close 4004 against production. **Approach
III against production URL is physically impossible** — even if
`dev:stack` were redirected, prod's `evaluateGodAuth` rejects.

The decision matrix:

| Mechanism × URL | Approach III viable? | Notes |
|---|---|---|
| A + production URL | NO | Approach III blocked; use Approach I (natural plays, longer takes) |
| A + local-dev | YES | Mechanism A spike runs against local wrangler with PLAYTEST_MODE=1 + minted PLAYTEST_TOKEN |
| B + production URL | NO | Approach III blocked; use Approach I |
| B + local-dev | YES | Mechanism B + local-dev LAN setup per Unit 5.0 Step 6 |

Per CALL E lock: **if Approach III is desired (cheaper capture
budget, predictable BURNED-draw), the capture session uses local-dev.**
Production-URL capture forces Approach I (natural plays, 60+
seconds per take, BURNED-draw timing accepted).

**Approach III deck-seeding sequence (corrected per feasibility F4):**

Pre-deepening "pre-game seed: BURNED at position 7 → start the
game" inverts the actual API. `applyDevStackDeck` (`dev-actions.ts:159-161`):

```ts
if (state.phase !== 'playing') {
  return { ok: false, code: 'NOT_PLAYING' }
}
```

The lobby phase has NO `drawPile` yet — engine constructs the deck
only on game start. Correct sequence:

1. Board boots, lobby phase, players join, room code visible.
2. Operator clicks "Cleared Hot" → game enters `playing` phase →
   engine constructs initial drawPile.
3. **THEN** dev:stack runs: `pnpm dev:stack <ROOM> <card> <card> ...`
   (note: space-separated card argv, NOT comma-joined — feasibility F2).
   This prepends the seed list to TOP of the existing draw pile.
4. Next player draw is the FIRST seeded card.

The "BURNED at position 7" framing means: 6 other cards seeded
BEFORE burned in the cards argv → BURNED draws on the 7th draw
after seeding completes. The position is determined by argv order,
NOT by separate seeking. Multi-dimensional caveat (adversarial F15):
Skip/Attack/Reassign cards can shift the per-turn-count math (Skip
ends a turn without a draw; Attack adds a turn to the target;
Direct-Order routes a card to a specific player). Calibration
sequence (Unit 5.2 Step 3) iterates seed-ordering until 3 consecutive
plays land BURNED at clip-relative frame 160 ±60 raw frames.

**Approach III preserves R13b aliveness** (reactions are unscripted;
only the deck order is rigged + invisible to viewers) AND collapses
capture budget from 3-5 sessions × 30s-windows-that-miss-BURNED to
1-2 sessions × predictable BURNED-draw timing.

**Approach III anticipation-tell mitigation (adversarial F10):**
The drawer-player will visibly anticipate the BURNED moment if they
KNOW the seed. To preserve unscripted reactions: only the OPERATOR
(Briggsy) knows the seed; players are told "we're seeding a deck
order for capture pacing reasons" without specifying which card
lands when. The OPERATOR may or may not be one of the players —
preferred is operator-only-not-player (Briggsy operates camera +
seeds + watches OBS; friends play; Briggsy is the director, not
on-camera).

### 18-second window forces shot-list discipline

S05 budget: 540 frames @ 30fps = 18.0s. Within 18s, the clip must:

- Establish multiplayer (multiple players visible) — frames 0-160
- Show phone-controller + TV-shared-screen relationship — throughout
- Land the BURNED-draw moment at clip-relative frame 160
- Carry the DramaOverlay BURNED beat through frames 160-280
- Support sparse Dash VO at frame 240
- Support optional scream cue at frame 360 (R5-contingent)
- End with reaction + iris-wipe-compatible composition frames 480-540

Per Derek Lieu trailer-editing best practice ("fewer cuts, longer
takes" produces more authentic feel), the 18 seconds should read
as ONE continuous take (with R15 chrome overlays cycling above)
rather than 5 quick cuts. Shot list (Unit 5.2) is **capture-time
direction** for what should be visible at each window, not edit-time
cut points.

### Brainstorm's tiebreaker-rule — EDIT-BAY scope, NOT mechanism-lock scope

Per brainstorm: *"When (a) 'engineers talk about how it was built'
and (b) 'water-beads / product-joy takes over' conflict in the edit
bay, water-beads wins. The build is the subtext; the game is the
text. The cascade earns its place by feeling like Archer
set-dressing, not a credits roll."*

**Doc-review correction (adversarial F02 + product F3):** Pre-
deepening cited this rule as load-bearing for Mechanism B lock.
That is the wrong scope. The brainstorm's water-beads-wins rule
is an EDIT-BAY tiebreaker between competing framings of the
SAME content (engineering-narrative vs joy-narrative). It is NOT
a capture-mechanism selection rule. Applying it to mechanism
choice smuggles in an undefended priority on R13b (aliveness)
over R13a (legitimacy) — but the spec carries both axes equally
(per Overview R13 splits block).

**For the gameplay clip:** water-beads-wins applies at Phase 4/6
composition + Unit 5.4 take selection — if a take captures
joyful play AND a competing take captures more cross-device
software signals, the joyful one wins on the tiebreaker IF the
software-signal take fails R13b. But both takes must independently
pass R13a (shipped-software claim) — water-beads doesn't replace
the legitimacy axis.

**Mechanism choice tradeoff** (Unit 5.0 Step 6a spike + Unit 5.1
lock decision):

- Mechanism B (humans visible) carries R13b strongly if
  director's-eye discipline holds; carries R13a moderately via
  cross-device sync visible in frame (phones reacting in unison).
- Mechanism A (browser-rendered, no humans) carries R13a strongly
  (clean evidence of deployed-software running) but is R13b-weak
  without aliveness signals.
- Empirical spike compares both; locks the mechanism that LANDS
  BOTH axes best for the actual content, not theoretical
  argument.

---

## Requirements Trace

- **R13** (live gameplay footage closer): Unit 5.2 (shot list) +
  Unit 5.3 (capture) + Unit 5.4 (take selection) + Unit 5.6
  (acceptance).
- **R5** (Vera scream cameo, conditional): Unit 5.4 take-selection
  weighs BURNED-draw alignment with frame 160 (the visual draw);
  the scream cue at frame 360 lands as a delayed reaction beat
  regardless of R5 outcome (if R5=cut, replaced with chuckle SFX
  from gameplay).
- **R8** (16:9 landscape): Unit 5.5 post-processing aspect-fit
  produces 1920×1080 native.
- **R15** (on-screen text signal layer): not directly Phase 5,
  but R15 #2 comms-ticker continues through S05; Phase 5 reserves
  lower 40px band per Critical Constraints.

---

## Key Technical Decisions

- **Capture mechanism**: locked at Unit 5.1 Step 1 AFTER paired
  empirical A/B spike (Unit 5.0 Step 6a, 30-min budget). Both
  mechanisms are first-class candidates; no a-priori default. If
  both spikes pass equivalently AND Mechanism B logistics are
  scheduled by Step 6c deadline, B is the default tiebreaker (per
  brainstorm intent though not the brainstorm RULE — see Critical
  Constraints). If B logistics fail OR B spike fails production-design
  floor, A locks unconditionally. Mechanism C (hybrid) **CUT
  during deepening**.
- **Mechanism B = physical camera + OBS Video Capture Device** (NOT
  Display Capture; see Critical Constraints "Mechanism B physical
  camera architecture"). Display Capture is Setup 1 fallback for
  board-UI-only R13 framing.
- **R13 axes locked**: R13a (legitimacy / "shipped & playable") +
  R13b (aliveness / "joy of playing") — both required (see Overview).
- **BURNED-draw target frame**: clip-relative frame 160 (~5.33s in)
  at trim tolerance ±3 frames. NOT frame 360 (that's the scream
  cue). Reference event definition: first frame on which the BURNED
  card art is visible at ≥50% opacity on ANY active player's phone
  screen (per Critical Constraints "BURNED-draw reference event").
- **Approach III adopted, LOCAL-DEV ONLY** (CALL E + feasibility F3):
  deterministic deck-seeding via `pnpm dev:stack <ROOM> <card> <card> ...`
  (space-separated argv, BURNED-canon card names — see Unit 5.2)
  AFTER game enters `playing` phase, + natural human play. Approach
  I (natural multi-take without seeding) retained as fallback AND
  required when production-URL captured. Approach II (engineered
  full sequence) rejected.
- **Resolution**: native 1920×1080 if Mechanism B; for Mechanism A
  if invoked, record at 1920×1080 viewport size for the BOARD
  context only (NOT for phone contexts — see Unit 5.3).
- **Framerate target**: 30fps CFR output. Mechanism A captures at
  variable browser cadence (~25-30fps); Unit 5.5 Step 0 ffprobes
  the raw take's `r_frame_rate`, uses ACTUAL source framerate as
  divisor for HEAD_TRIM_SECONDS, then applies `fps=30` filter for
  CFR conversion (feasibility F9). Mechanism B captures native
  30fps OR 60fps with downsample-in-post via `fps=30` filter (NOT
  `-r 30`).
- **HEAD_TRIM_FRAMES**: read from `process.env.HEAD_TRIM_FRAMES`
  with NaN-assertion startup guard. Hardcoded `// EXAMPLE` value
  in directional code REMOVED (feasibility/security/scope/design F09/F15/F20 convergent).
- **Audio**: three-layer belt-and-suspenders (capture silent +
  `ffmpeg -an` + `<OffthreadVideo muted />`). **Exception:** ONE
  dedicated audio-archive take per Mechanism B session captured
  WITH audio at `videos/trailer/sample-eval/gameplay-capture/audio/`
  for Phase 6 reference only; never used for the trailer clip
  itself (adversarial F26).
- **Output path**: `public/trailer/gameplay.mp4` per ADR #15.
- **Atomic swap**: write `.new` → `pnpm verify:gameplay-clip` →
  `mv` on PASS. Windows EXDEV fallback: catch + use
  copyFileSync + unlinkSync (loses atomicity but works cross-drive;
  per feasibility F11 + adversarial F16).
- **Post-process**: single-pass re-encode (libx264 CRF 18 preset
  slow `-ss AFTER -i` `-frames:v 540` `-an` `-map 0:v:0`); NO
  stream-copy intermediate. **Encode time: 5-15 min** depending on
  machine (per feasibility F10 — `slow` preset on 1080p is ~0.5-1s/frame
  on consumer CPUs). Use `medium` preset for take-iteration
  exploration; `slow` only for final selected take encode.
- **First ffmpeg/ffprobe callsite in BURNED**: project security
  convention `execFileSync('ffmpeg', [argv-array])` per Phase 2
  deepening lock. CI must verify ffmpeg ≥5.0 installed.
- **`pnpm verify:gameplay-clip` consumption**: Phase 4 owns the
  script (`scripts/verify-gameplay-clip.ts`); Phase 5 invokes it,
  does NOT re-implement. Phase 4 extends the script (cross-phase
  amendment landed this commit) with pix_fmt + r_frame_rate + field_order
  assertions (feasibility F15).
- **`scripts/generate-placeholder-gameplay.ts`**: ownership-split
  per scope F16 / circular-dep resolution — Phase 4 ships a SIMPLE
  inline placeholder (one ffmpeg-anullsrc + color-source command,
  no parameterization) early in Phase 4 work; Phase 5 owns the
  PARAMETERIZED version that arrives during Unit 5.3 Step B.6
  (configurable duration / luminance / overlay text for development).
- **Take selection ladder**: rubric-floor objective reject → 24h
  cool-off → random-order top-3 watch → §2 Archer gate → fluency
  gate. (Harry outside-eye step REPEALED 2026-05-22 per CALL F
  repeal.) Pre-deepening Briggsy-watches-once-and-picks was
  anchoring-vulnerable (product F11 + product F23); the surviving
  defenses still mitigate that. The adversarial F06 "Briggsy
  contamination as sole judge" concern is now accepted residual risk.
- **Sentinel files** (content-payload required, adversarial F20):
  `briggsy-review-5.4.signoff` (take selection — commit msg requires
  2-3 sentence free-text payload describing what landed Archer-grade)
  + `briggsy-review-5.6.signoff` (R13 acceptance — payload describes
  what landed R13a + R13b); wired to `pnpm verify:briggsy-sentinels`
  git-author check per Phase 4 pattern (cross-phase amendment to
  Phase 4's `SCENES` const landed this commit per feasibility F7).
- **Exit doc**: `PHASE-5-EXIT.md` — trimmed template (4 facts +
  Phase 6 read-points, per scope F13). Mirrors Phase 0/1/2/3/4
  exit-doc pattern in spirit, NOT length.
- **PHASE-5-PREFLIGHT.md DROPPED** (scope F1): preflight checks
  remain (load-bearing per F8/F13/F15 feasibility) but record into
  `capture-log.md` mechanism-lock header, NOT a separate committed
  markdown.
- ~~**Harry as outside-viewer for R13** (CALL F)~~ — **REPEALED
  2026-05-22.** Harry is AI; the team is just Briggsy + Claude(s)
  forever. No outside human eye is available for the R13 acceptance
  gate. Briggsy's contamination as sole judge is accepted residual
  risk, mitigated by surviving defenses (rubric floor, 24h cool-off,
  random-order watch, §2 Archer gate, fluency gate). Cross-ref:
  updated `user_harry.md` + `feedback-listener-panels-default-to-n1.md`.

---

## Implementation Units

### Unit 5.0 — Prerequisites + Contract Sync

- [ ] **Unit 5.0: Prerequisites + Contract Sync**

**Goal:** Pre-flight verification that all Phase 4/5 contract
surfaces are in place + production URL accessible (or local-dev
fallback decided) + insight 035 status verified + harness +
dev-actions available. Mirrors Phase 2 deepening's Unit 2.0
preflight pattern.

**Requirements:** All R# (gates Phase 5 entry).

**Dependencies:** Phase 4 deepening committed (achieved; commit
`9e31ae4b`).

**Files:**

- Create: `videos/trailer/sample-eval/gameplay-capture/capture-log.md`
  (mechanism-lock header records all preflight outcomes; no
  separate PHASE-5-PREFLIGHT.md per scope F1).

**Approach:**

**Step 0 — Hard Phase 4 deliverables prerequisite (NEW per feasibility F8).**

Phase 5 is unblockable without Phase 4 IMPLEMENTATION (not just
deepened plans). Pre-deepening Unit 5.0 Step 1 verified file
existence but didn't acknowledge that AS OF doc-review absorption
(2026-05-17) Phase 4 itself was deepened but not built. Hard
prerequisite check:

```bash
# Phase 4 deliverables must be CODE-COMPLETE not just deepened
test -d videos/trailer/src/ && echo "OK Phase 4 src tree exists"
test -f videos/trailer/src/Root.tsx && echo "OK Phase 4 entry"
test -f scripts/sync-gameplay-clip.ts && echo "OK Phase 4 sync hook"
test -f scripts/verify-gameplay-clip.ts && echo "OK Phase 4 verify gate"
test -d public/trailer/ && echo "OK public/trailer/ exists"
```

If any FAIL → Phase 5 is BLOCKED. Phase 4 must execute first.
Capture-log.md records the verification with date stamp.

**Step 1 — Path discipline verification.**

```bash
# Confirm Phase 0 setPublicDir points where ADR #15 expects
rg "setPublicDir" videos/trailer/src/
# Expect: setPublicDir('../../public')
```

If absent, Phase 0 ADR #8 has not landed at code level — Phase 5
entry blocked.

**Step 2 — Insight 035 status verification (BEHAVIORAL, not CSS-grep; adversarial F17).**

Pre-deepening grepped CSS source for the fix-shape (`.action::after`).
That's a fix-shape audit, not a behavioral verification. The actual
insight 035 outcome is "Playwright `locator.click()` does NOT throw
actionability error on the action button while breathe animation
plays." Behavioral test:

```bash
# CSS-grep retained as cheap fast-path check
rg --multiline 'breathe.*infinite alternate' src/client/player/SmartActionBox.module.css
# Expect: matches within .action::after / .drawIntense::after blocks

# BEHAVIORAL: spike the actual click stability
# (Mechanism A path only — Mechanism B doesn't use Playwright)
pnpm test:insight-035-spike  # runs ONE Playwright locator.click() against
                              # an animating action button in headless mode;
                              # asserts no actionability error
```

(`scripts/playtest/spikes/insight-035-spike.ts` — owned by Phase 5
Unit 5.3 Step A.0 to build during Mechanism A spike; record current
behavior in capture-log.md.)

If CSS grep fails OR behavioral spike throws → Mechanism A is
BLOCKED. Mechanism B unaffected (no Playwright dependency).

**Step 3 — Playtest harness availability.**

```bash
# Verify the multi-context Playwright harness exists
test -d scripts/playtest && echo "OK harness"
test -f scripts/playtest/run-session.ts && echo "OK orchestrator"
test -f scripts/playtest/lib/seat-factory.ts && echo "OK seat factory"
```

If absent, Mechanism A (which extends the harness) is BLOCKED —
fall through to Mechanism B only.

**Step 4 — Dev-action availability + FUNCTIONAL smoke test (per coherence F11).**

Pre-deepening checked file existence only. If dev-actions handler
has a bug, files exist + Phase 5 advances + Unit 5.2 capture-time
discovers the failure. Smoke test:

```bash
# Existence checks (cheap fast-path)
test -f scripts/dev-stack-top.ts && echo "OK dev:stack file"
test -f scripts/dev-give-card.ts && echo "OK dev:give file"
test -f src/server/dev-actions.ts && echo "OK dev-actions handler"

# Usage-smoke (verify CLI signature works)
pnpm dev:stack 2>&1 | head -3
# Expect output: usage / help message naming <room> as positional arg
# If output contains 'cards.length === 0' or 'INVALID_CARD_TYPE',
# the CLI signature is wrong — abort.

# FUNCTIONAL smoke: spin up local wrangler + Vite, run a smoke
# dev:stack against a test room, assert success
pnpm dev:cleanup  # kill any prior workerd
pnpm dev:server &  # local wrangler dev :8787 with PLAYTEST_MODE=1
sleep 5
# Mint a test room + smoke
pnpm dev:stack PHASE5SMOKE burned 2>&1 | tee dev-stack-smoke.log
# Expect: log shows successful god-WS connect + ack
# If shows NOT_PLAYING: game must enter playing phase first
#   (smoke gate verifies the WIRING; phase-guard test is Unit 5.2)
```

If absent or smoke fails, Approach III is BLOCKED — fall through
to Approach I (natural multiple takes, 60s+ windows, BURNED-draw
timing variance accepted).

**Note:** Approach III also requires local-dev path (CALL E +
feasibility F3). Production-URL captures auto-fall-through to
Approach I regardless of dev-action availability.

**Step 5 — Deploy migration status check + URL strategy decision matrix (per CALL G).**

```bash
# Production URL probe (both candidate URLs)
curl -sI https://burned.pages.dev/board.html | head -1
curl -sI https://burned-cxa.pages.dev/board.html | head -1
curl -sI https://burned.briggsy007.workers.dev/health | head -1
```

Capture which URL responds 200. **URL decision is COUPLED to
mechanism choice** (per CALL G):

| Outcome | Mechanism A path | Mechanism B path |
|---|---|---|
| `burned.pages.dev` responds 200 | USE `burned.pages.dev` (canonical; show in capture) | URL not in frame; record `burned.pages.dev` for Phase 7 distribution |
| Only `burned-cxa.pages.dev` responds 200 | **PHASE 5 BLOCKED for Mechanism A** — canonical URL not green; preview URL undermines "shipped" | OK — URL not in frame; Phase 7 should still wait for canonical for distribution copy |
| Neither responds | If today < 2026-05-24: escalate (see below). If today >= 2026-05-24: see deadline gate |
| Migration deadline 2026-05-24 passed without canonical green | **Mechanism A path: hard block, abort Phase 5 or force-switch to Mechanism B** | OK — local-dev fallback (Step 6); Phase 7 inherits the deferred migration as a tracking item |

If neither Pages URL responds AND today < 2026-05-24: escalate to
Briggsy + Harry to verify Cloudflare dashboard state
(CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID secrets, Worker name
binding, Pages domain binding). Phase 5 entry deferred until
resolution or deadline.

**Step 6 — Local-dev fallback LAN setup (if invoked).**

If deploy migration not green AND deadline has passed AND
Mechanism B (real devices) is selected, real phones must reach the
dev host via LAN IP. Pre-deepening Step 6 hand-waved board WSS
redirection ("may need a query param or local config"); concrete
mechanism (per feasibility F3 — `dev:stack` hardcoded to localhost
is a related-but-different concern from board WSS):

```bash
# 1. Get laptop LAN IP
ipconfig | grep "IPv4"   # Windows; record 192.168.x.x

# 2. Start Vite dev with --host so LAN can reach it
pnpm dev -- --host 0.0.0.0    # binds 5173 to all interfaces

# 3. Start Wrangler dev with --ip so LAN can reach the WSS endpoint
pnpm dev:server -- --ip 0.0.0.0    # binds 8787 to all interfaces

# 4. Windows Firewall: allow inbound on 5173 + 8787
# IMPORTANT (security F06): scope rules to LAN subnet (e.g., 192.168.0.0/16),
# NOT "Any" remote address. Remove after the session.

# 5. Phones navigate to http://192.168.x.x:5173/player.html?room=CODE
# (NOT localhost — phones can't resolve a remote host's localhost)

# 6. Board WSS target redirect (CONCRETE mechanism — feasibility F3):
# `ActRemote.tsx` reads VITE_PARTYKIT_HOST env at build time. For LAN
# capture session, set VITE_PARTYKIT_HOST=192.168.x.x:8787 in
# `.env.local` BEFORE starting vite. Restart Vite to pick up the env.
# Verify board.html network tab shows WS to 192.168.x.x:8787.
echo "VITE_PARTYKIT_HOST=192.168.x.x:8787" > .env.local
pnpm dev -- --host 0.0.0.0
# Phones must use SAME VITE_PARTYKIT_HOST (read from served page bundle)
```

**Cross-platform note:** macOS uses `ifconfig`/`networksetup -getinfo`
for LAN IP discovery; Windows uses `ipconfig`. Firewall config
differs accordingly.

**Setup time:** ~30 min first session, ~5 min subsequent. Document
in capture-log.md mechanism-lock header.

**Network safety (security F06 + F10):** LAN capture uses unencrypted
WS. Perform on a trusted private network (home). Avoid coffee shops
or hotel WiFi — `PLAYTEST_TOKEN` and per-connection auth are not
sniffable-safe in those environments.

**Step 6a — PARALLEL MECHANISM A/B SPIKE (NEW per CALL A, time-box 30 min total).**

Both mechanisms are first-class candidates. This step characterizes
each empirically BEFORE Unit 5.1 locks the mechanism.

**Mechanism A spike (15 min):**

```bash
# Prereq: local wrangler running (Step 6 setup) + Approach III local-dev path
pnpm tsx scripts/playtest/spikes/trailer-capture-spike.ts \
  --mechanism=A --duration=45 --output=spike-A.webm
# (Script to author at Unit 5.3 Step A.0; this is a thin
# wrapper around scripts/playtest/lib/* with recordVideo wired.
# 1 board + 3 seat contexts, runs through a seeded ~45s capture.)
```

Capture-log records (Mechanism A spike outcomes):
- WebM file produced at `spike-A.webm`? ✓/✗
- ffprobe nb_read_frames ≥ 1000 (= ~33s at 30fps, ~25s at 25fps)? ✓/✗
- ffprobe inter-PTS deltas: no gap > 50ms across the 45s window? ✓/✗
- DramaOverlay BURNED beat visible in capture (frame-by-frame
  verify against in-real-device reference)? ✓/✗
- Memory peak under 4GB RSS during recording? ✓/✗
- §2 informal Archer-aesthetic eyeball: cleaner-than-Archer demo-reel
  aesthetic OR redeemable through trailer composition? Y/N

**Mechanism B spike (15 min):**

```bash
# Prereq: OBS installed, scene configured, camera mounted on tripod
# (per Mechanism B physical camera spec in Critical Constraints)
# Start OBS recording → run 30s of natural BURNED play (no seeding required for spike)
# Stop recording → produces spike-B.mkv (or .mp4 on OBS 32+)
```

Capture-log records (Mechanism B spike outcomes):
- MKV/MP4 file produced? ✓/✗
- 1920×1080 @ 30fps native? ✓/✗
- Phone screens readable in frame (BURNED card art visible if drawn)? ✓/✗
- §2 informal Archer-aesthetic eyeball: production-design lands
  (lighting / wardrobe / background / no apartment tells)? Y/N
- Stat-overlay-fit eyeball: handheld micro-shake absent? Y/N (tripod check)
- TV-reflection check: room lights / camera lens not visible in
  TV glass at BURNED-draw landing zone? Y/N

**Spike comparison (Unit 5.1 Step 1 lock decision feeds from this):**

| Axis | Mechanism A spike outcome | Mechanism B spike outcome |
|---|---|---|
| R13a — cross-device sync visible | (record) | (record) |
| R13b — aliveness signals | (record) | (record) |
| §2 Archer-aesthetic | (record Y/N) | (record Y/N) |
| Capture-iteration latency (re-record speed) | (record min) | (record min) |
| Production constraint cost | (zero — all local; agents) | (1-2 friends + tripod + lighting) |

**Step 6b — Friend recruitment status gate (Mechanism B only; per product F5).**

```bash
# Hard check: if Mechanism B is in spike, friend availability must
# be confirmed within 7 days of Phase 5 entry, OR Mechanism A locks
# unconditionally per CALL A. Harry does NOT count as Mechanism B
# physical participant (he's remote per `user_harry.md`).
# Record in capture-log.md:
#   - Friend 1 alias: <stage name>; date confirmed: <YYYY-MM-DD>
#   - Friend 2 alias: <stage name>; date confirmed: <YYYY-MM-DD>
#   - Session 1 scheduled date: <YYYY-MM-DD>
# If no friend confirmation by 7 days → Mechanism A locks
```

**Note on naming:** Friend names are recorded as agreed STAGE
NAMES / aliases (Pendleton Agency operative codenames preferred),
NEVER legal first names (security F01/F02). Players will use these
aliases when joining the BURNED game so the board displays codenames
(e.g., "DASH TO ACT") not real names → no PII in the trailer
capture frames.

**Step 6c — Phase 0 exit document verification (per coherence F12).**

```bash
test -f videos/trailer/sample-eval/PHASE-0-EXIT.md && echo "OK Phase 0 exit doc"
grep -q "^## R5" videos/trailer/sample-eval/PHASE-0-EXIT.md && echo "OK R5 outcome locked"
grep -q "^## Voice Cast" videos/trailer/sample-eval/PHASE-0-EXIT.md && echo "OK voice cast locked"
```

If absent → upstream deliverable missing → Phase 5 BLOCKED until
Phase 0 exits.

R5 outcome (kept | cut) determines take-selection rubric weighting
on frame 360 reaction window (Unit 5.4). Pre-deepening read R5 at
Unit 5.4 pre-flight (after 1-2 sessions captured); per adversarial
F11 + coherence F12, this is too late — capture decisions are
already locked. Read at Unit 5.0 pre-flight; if R5 = TBD → Phase 0
must reopen before Phase 5 captures.

**Step 6d — Camera rig spec lock (Mechanism B; per design F01).**

```md
# Recorded in capture-log.md
## Camera rig
- Camera class: <phone make+model on tripod | DSLR/mirrorless + lens>
- Lens focal length / aperture: <e.g., iPhone 14 Pro 26mm equiv @ f/1.78>
- Tripod confirmed: <Y/N>
- DoF calibrated for phone+TV both in focus at planned distance: <Y/N>
- Camera height: eye-level seated (recorded: <cm>)
- TV-to-camera distance: <cm>
- Camera off-axis angle: 25-35° (calibrated at Unit 5.1 Step 3 framing test)
```

If camera spec cannot meet DoF requirement → Mechanism B blocked
on camera; either acquire suitable gear OR fall through to
Mechanism A.

**Step 7 — Playwright availability (Mechanism A only).**

```bash
# Confirm Playwright installed + Chromium downloaded
pnpm exec playwright --version
test -d node_modules/playwright-core && echo "OK Playwright core"
```

**Step 8 — FFmpeg version pin (per Phase 2 deepening lock).**

```bash
# Minimum FFmpeg 5.0; recommended 6.0+
ffmpeg -version | head -1    # e.g. "ffmpeg version 6.1.1"
```

If `ffmpeg --version | grep -E "version ([5-9]|[1-9][0-9])"` fails,
upgrade FFmpeg before Unit 5.5.

**Step 8a — OBS version + scene config (Mechanism B only; per feasibility F14).**

```bash
# Get OBS version (Windows: file path varies)
"$LOCALAPPDATA/Programs/obs-studio/bin/64bit/obs64.exe" --version
# Record in capture-log.md:
#   - OBS version: <e.g., 30.2.1>
#   - Container path: MKV → remux (if OBS 30/31) | Hybrid MP4 (if OBS 32+)
```

OBS scene config is NOT committed to repo (security F07: scene .json
files embed absolute paths). Document the scene config IN PROSE in
`capture-log.md`'s mechanism-lock header:
- Source 1: Video Capture Device — `<camera name>` @ 1920×1080 @ 30fps
- Source 2: Display Capture (Mechanism B' fallback only) — Primary Monitor
- All audio sources muted (Display Capture audio off, Mic disabled,
  VCD audio off) EXCEPT for the one dedicated audio-archive take
  per Mechanism B session
- Recording format: MKV (OBS 30/31) → ffmpeg remux to MP4; OR Hybrid
  MP4 directly (OBS 32+)
- Encoder: NVENC H.264 preferred (if Nvidia GPU); x264 medium-CRF18 fallback
- Output color space: yuv420p limited-range; verify with ffprobe

**Step 9 — ~~Harry recruitment for R13 outside-viewer check (CALL F)~~ REPEALED 2026-05-22.**

CALL F was repealed — Harry is AI; no outside human eye is available.
Step 9 is deleted. R13 acceptance at Unit 5.6 runs on Briggsy's
judgment alone with the surviving contamination defenses (rubric
floor, 24h cool-off, random-order top-3 watch, §2 Archer gate,
fluency gate). See deepening header CALL F repeal note. Cross-ref:
updated `user_harry.md` + `feedback-listener-panels-default-to-n1.md`.

**Step 10 — capture-log.md mechanism-lock header (REPLACES pre-deepening PHASE-5-PREFLIGHT.md; per scope F1).**

Record the verification results IN-PLACE at the head of capture-log.md
(NOT in a separate committed PREFLIGHT.md file):

```md
# Phase 5 Capture Log

## Mechanism-lock header — <YYYY-MM-DD>

### Phase 4 prerequisites
- [ ] videos/trailer/src/ exists (CODE-COMPLETE not just deepened)
- [ ] scripts/sync-gameplay-clip.ts exists
- [ ] scripts/verify-gameplay-clip.ts exists (+ pix_fmt/r_frame_rate assertions per cross-phase amendment)
- [ ] public/trailer/ exists

### Phase 0 prerequisites
- [ ] PHASE-0-EXIT.md exists + R5 outcome locked: <kept|cut>

### Path discipline
- [ ] setPublicDir('../../public') confirmed

### Insight 035 status (CSS + behavioral)
- [ ] CSS grep passes
- [ ] Behavioral spike (Mechanism A only): locator.click() no-throw

### Playtest harness
- [ ] scripts/playtest/run-session.ts present
- [ ] scripts/playtest/lib/seat-factory.ts present
- [ ] scripts/playtest/lib/god-subscriber.ts present
- [ ] scripts/playtest/lib/orchestrator.ts present

### Dev actions
- [ ] pnpm dev:stack file + functional smoke (assert god-WS connect + ack)
- [ ] pnpm dev:give file
- [ ] src/server/dev-actions.ts present

### Deploy migration
- Production URL: <burned.pages.dev | burned-cxa.pages.dev | local-dev>
- Canonical URL status: <responds 200 | preview only | none>
- Migration deadline 2026-05-24: <not yet | passed>
- LAN IP recorded (if Mechanism B + local-dev): <192.168.x.x>

### FFmpeg
- ffmpeg version: <recorded>

### OBS (if Mechanism B)
- OBS version: <recorded>
- Container path: <MKV-then-remux | Hybrid MP4>
- Encoder: <NVENC | x264>

### Camera rig (if Mechanism B)
- Camera class: <recorded>
- Lens / aperture: <recorded>
- Tripod confirmed: <Y/N>
- TV-to-camera distance / off-axis angle: <recorded>

### Friend recruitment (if Mechanism B)
- Friend 1 stage name: <name>; confirmed date: <YYYY-MM-DD>
- Friend 2 stage name: <name>; confirmed date: <YYYY-MM-DD>
- Session 1 scheduled: <YYYY-MM-DD>

### ~~Harry recruitment (R13 outside-viewer)~~ — REPEALED 2026-05-22
Section omitted; CALL F repeal removed the outside-viewer step.
R13 acceptance is Briggsy-N=1 with surviving contamination defenses.

### Empirical A/B spike outcomes
- Mechanism A spike: PASS | FAIL — <one-line summary>
- Mechanism B spike: PASS | FAIL — <one-line summary>
- §2 Archer-aesthetic informal eyeball: A: Y/N | B: Y/N
- Iteration-latency comparison: A: <min> | B: <min>

### Decisions LOCKED for Phase 5 capture
- Capture mechanism: <A | B | B' (Display Capture variant)>
- Production URL: <chosen>
- Approach: <III (local-dev only) | I (natural multi-take)>
- Mechanism A rationale: <one paragraph IF A locked>
- Mechanism B rationale: <one paragraph IF B locked>
- Briggsy initials + date: <____ / <YYYY-MM-DD>>
```

**Patterns to follow:**

- Phase 2 Unit 2.0 preflight pattern (PHASE-0-EXIT.md ingest +
  engine/voice lock).
- TODO.md landmines for `pnpm dev:cleanup` (kills orphan
  workerd/vite if a prior session left stale processes).

**Test scenarios:**

- **Happy path:** All checks PASS; PHASE-5-PREFLIGHT.md committed;
  Unit 5.1 entry unblocked.
- **Deploy migration not done, before deadline:** flag for Briggsy
  resolution.
- **Deploy migration not done, after deadline:** local-dev fallback
  locks; LAN IP recorded; Unit 5.1 proceeds.
- **Insight 035 regressed:** abort Phase 5; reopen insight 035 fix
  as a blocking BURNED CSS task.
- **FFmpeg < 5.0:** upgrade required; abort until resolved.

**Verification:**

- All Step 0-10 checks executed and recorded.
- `capture-log.md` mechanism-lock header committed at
  `videos/trailer/sample-eval/gameplay-capture/capture-log.md`.
- Mechanism + URL + Approach + camera-rig + friend-recruitment
  decisions captured with Briggsy initials + date.

---

### Unit 5.1 — Capture Mechanism Lock + Spike

- [ ] **Unit 5.1: Capture Mechanism Lock + Spike**

**Goal:** Lock the capture mechanism BASED ON empirical A/B spike
outcomes from Unit 5.0 Step 6a + friend-availability gate from
Step 6b. Compare both mechanisms' spike outputs against R13a/R13b
axis criteria + §2 Archer aesthetic; lock the winner. Calibrate
the locked mechanism's setup for capture readiness.

**Requirements:** R13.

**Dependencies:** Unit 5.0 (preflight green; both spikes captured;
friend recruitment status known).

**Files:**

- Update: `videos/trailer/sample-eval/gameplay-capture/capture-log.md`
  (mechanism-lock decision + camera/scene calibration)
- (Mechanism A path only): `scripts/playtest/spikes/insight-035-spike.ts`
  + `scripts/playtest/spikes/trailer-capture-spike.ts` (built in
  Unit 5.0 Step 6a; promoted to production by Unit 5.3 Step A.0)

**Approach:**

**Step 1 — Mechanism lock decision (revised per CALL A).**

Compare Unit 5.0 Step 6a spike outcomes across the R13 axes:

| Decision input | Mechanism A | Mechanism B |
|---|---|---|
| Spike PASS (all acceptance criteria met) | Y/N | Y/N |
| R13a — software-shipped signal in capture | strong (rendered URL visible if Mechanism A path) | moderate (cross-device sync visible in board+phones-in-frame) |
| R13b — aliveness signal in capture | absent (no humans) | strong-if-directed |
| §2 Archer aesthetic eyeball | (record verdict) | (record verdict) |
| Logistics gate (friends recruited by 7-day deadline) | n/a (no humans needed) | (Y/N — Step 6b) |
| Iteration latency (re-record speed) | low (programmatic) | high (re-schedule humans) |

**Lock procedure:**

1. **Both spikes PASS, both §2 verdicts Y, Mechanism B logistics
   gate PASS** → Mechanism B locks (default tiebreaker: B's
   R13b signal is harder to fake post-hoc than A's R13a; A's
   R13a can be partially recovered in trailer composition with
   browser-chrome overlay if needed). Document trade.
2. **Only Mechanism A spike PASS OR Mechanism B logistics fail** →
   Mechanism A locks. NOT "escalation" — A is the first-class
   locked option. R13b mitigation: Phase 4 composition (S04 tail
   overlay + iris-wipe + stat captions) carries some aliveness via
   pacing + cuts; accept the trade.
3. **Only Mechanism B spike PASS** → Mechanism B locks; Mechanism A
   is fallback IF Mechanism B captures all fail at Unit 5.4.
4. **Both spikes FAIL** → Phase 5 BLOCKED. Diagnose root cause
   (insight 035 regression / Cloudflare migration / OBS config /
   camera DoF). Reopen Unit 5.0.
5. **Both spikes PASS but §2 verdicts split** → §2 verdict wins
   over R13a/R13b math (Archer aesthetic is the spec's binary;
   axis math is decision-support).

**Step 2 — Mechanism A scene + spike-to-production promotion** (if A
locked):

The Unit 5.0 Step 6a Mechanism A spike script
(`scripts/playtest/spikes/trailer-capture-spike.ts`) is promoted in
Unit 5.3 Step A.0 to a production capture script at
`scripts/playtest/trailer-capture.ts`. Phase 5 capture sessions
import `runSession` from the harness libs and pass a
TrailerCaptureOptions config (parallel script, NOT a `--trailer-capture`
CLI flag on the playtest harness's main entry — per feasibility F6).

**Step 3 — Mechanism B scene config + calibration shot** (if B locked):

Setup:
- TV (or external monitor at 1920×1080 @ 60Hz preferred) running
  board view (production URL OR LAN IP per Unit 5.0 + URL strategy
  matrix in Critical Constraints)
- 2-3 phones loaded with player view, joined as players (codename
  aliases per Unit 5.0 Step 6b)
- OBS capturing the table scene via **Video Capture Device** source
  (physical camera framing TV + phones-in-hand; per Critical
  Constraints "Mechanism B physical camera architecture"). Display
  Capture is ONLY used if Mechanism B' variant is locked (board-UI-only
  R13 framing).
- Camera mounted on tripod per camera-rig spec; 25-35° off-axis

**Calibration shot** (test framing before capture begins; per
adversarial F19 + design F10):

1. Take one OBS preview frame with a sample card held at TV center
   (manually emulating the BURNED card art at the draw moment).
2. Verify: TV center sits within x=[420, 1500] mobile-safe-square
   band. Card art readable at ≥50% opacity equivalent.
3. Verify: phones in lower-mid foreground (NOT lower 40px which is
   ticker-reserved per Phase 4 R15 #2).
4. Verify: iris-anchor zone (frame center ±400px) shows a clear
   focal area without table-edge or hand crossings.
5. Verify: no TV-glass reflections of room lights or camera in
   the BURNED-draw landing zone.

If any verification fails → adjust camera angle / position / lighting
+ retake calibration frame. Iterate until all pass. Time-box: 20 min.

OBS recording settings:

- Encoder: NVENC HEVC or NVENC H.264 on NVIDIA GPU (CQP 18,
  Look-ahead ON, Max Quality preset). Fallback: x264 CRF 18 medium.
- Resolution: 1920×1080
- FPS: **30 (verify Settings → Video → Common FPS Values)**. OBS
  defaults to 60 on most modern displays; explicit override required.
- Container: **MKV** on OBS 30/31 (then ffmpeg remux to MP4 per
  Unit 5.5 Step 0) OR **Hybrid MP4** on OBS 32+ (crash-safe)
- Color space: yuv420p output (verify with ffprobe post-encode)
- Audio: ALL sources muted at scene level (per three-layer audio
  policy)

**Step 4 — Director's-eye production checklist (DEFINED in Critical
Constraints "Mechanism B physical camera architecture"; cross-ref
here, per scope F9).**

Re-run the production checklist from Critical Constraints. ALL items
Y before Step 5 capture-log update.

**Operational reminders** (per-session bias, not full checklist):
- Tripod confirmed locked-down (no handheld micro-shake)
- Lighting warm-temperature, NO overhead fluorescent
- Phone brightness 40-60% on all phones
- Players in wardrobe (dark solid tops, no logos, no hoodies)
- Background dressed (manila folder + mug, OR dark bedsheet behind TV)
- Reflections killed
- Audio sources muted in OBS (EXCEPT for the one audio-archive take)

**Step 5 — Capture-log documentation.**

`capture-log.md` consolidates mechanism evaluation + setup +
session-by-session record:

```md
# Capture Log — Phase 5

## Mechanism lock (Unit 5.1)
- Date: <YYYY-MM-DD>
- Locked: <A | B>
- Rationale: <Mechanism B default per water-beads; A as escalation;
  C cut per scope-guardian deepening>
- Production URL: <burned.pages.dev | burned-cxa.pages.dev | local-dev>
- Approach: <III default | I fallback>
- Friends recruited (Mechanism B): <name list>
- Spike output: <if Mechanism A — link to first WebM>

## OBS scene config (Mechanism B only)
- OBS version: <e.g., 31.0.1>
- Container: <MKV | Hybrid MP4 (OBS 32+)>
- Encoder: <NVENC HEVC | NVENC H.264 | x264 CRF 18>
- Resolution × FPS: 1920×1080 @ 30fps
- Audio: all sources muted
- Camera angle: 30° to TV
- Lighting: <warm lamps notes>
- Table dressing: <notes>

## Sessions (filled progressively)
### Session 1 — <YYYY-MM-DD>
- Setup tax (first session expected ~30 min)
- Takes attempted: <N>
- Takes saved: <N>
- Best take: <filename>
- Notes: <per-take observations>

(continues for sessions 2-N)
```

**Patterns to follow:**

- `feedback-eye-in-loop-beats-calibration-for-motion.md` — direct
  observation over rubric metrics.
- Phase 3 Unit 3.7 capture-log consolidation pattern.

**Test scenarios:**

- **Mechanism B happy path**: OBS captures 45s at 1920×1080 @
  30fps; takes/take-01.mkv plays cleanly; mid-game UI visible
  end-to-end.
- **Mechanism A happy path** (escalation): WebM file decodes;
  DramaOverlay BURNED beat visible at full duration in board
  recording.
- **Frame-rate mismatch (OBS captured at 60fps)**: caught in
  Unit 5.5 raw-take ffprobe; force-downsample via `fps=30` filter.
- **Production URL down**: fall through to local-dev per Unit 5.0
  preflight.
- **DramaOverlay clips in Mechanism A headless capture**: spike
  fails (c); escalate to Mechanism B.

**Verification:**

- `capture-log.md` records mechanism lock + rationale.
- Spike output present (if Mechanism A invoked).
- OBS scene config verified visually (if Mechanism B).

---

### Unit 5.2 — Shot List + Approach III Deck Choreography

- [ ] **Unit 5.2: Shot List + Approach III Deck Choreography**

**Goal:** Define the 18-second curated gameplay sequence with
BURNED-draw at clip-relative frame 160, scream cue at relative
frame 360 as separate reaction beat. Specify Approach III deck
seeding for deterministic BURNED placement. Apply composition
constraints (mobile-safe-square, iris-anchor, frame-0 luminance,
lower-40px ticker).

**Requirements:** R13 + S05 cue timings from Phase 1 Unit 1.2 Step 6.

**Dependencies:** Unit 5.1 (mechanism locked).

**Files:**

- Append to: `videos/trailer/sample-eval/gameplay-capture/capture-log.md`
  (shot list section)
- NO TypeScript shot-list module (`shot-list.ts` CUT during
  deepening per scope-guardian — no consumers, markdown table
  suffices)

**Approach:**

**Step 1 — S05 cue map review (final-state, post Phase 1+5
deepening).**

S05 absolute frames 2040-2580 (clip-relative 0-540):

| Relative frame | Beat | Audio | Visual need |
|----------------|------|-------|-------------|
| 0 | Hard cut entry from S04; S05HeadFadeFromBlack overlay frames 0-15 ramps black→frame-0 | Music bed at 25% | Frame 0 prefer YAVG ≤ 76.5 (mid-tone-to-dark) |
| 0-160 | Active gameplay establishing; multiplayer visible | Music bed continuous | Phones + board both readable; mobile-safe-square applies |
| **160** | **BURNED card draws — DramaOverlay BURNED beat begins** | Music bed | Phone screen shows BURNED card; board shows DramaOverlay cinematic |
| 160-280 | DramaOverlay BURNED beat plays out (in-game cinematic ~4s) | Music bed | Players visibly turn attention to TV |
| 240 | Sparse Dash VO: "And — between you and me — they appear to be enjoying it." | VO layered over music bed | INTIMATE register — close-on-phone or close-on-reaction preferred; NOT wide shot |
| 280-360 | Reaction window — players reacting to the draw | Music bed | Genuine body language: lean-in, cover-mouth, point at TV |
| 360 | Scream cue (R5-contingent): "VERAAA!!!" Sterling-CODED deadpan-late | VO layered over music bed | Continuation of reaction; no need for "draw moment" visual — that already happened at 160 |
| 360-480 | Aftermath; continued play | Music bed | |
| 480-540 | Tail; iris-wipe begins at 495 (S05_END - 45) | Music bed rising to 50% | Primary subject center-frame ±400px of (960, 540); minimal motion |

**Step 2 — Shot list (capture-time direction; NOT edit-time cuts).**

Per Derek Lieu's "fewer cuts, longer takes" principle for trailer
authenticity, the 18 seconds should read as ONE continuous take
with R15 chrome overlays cycling above — not 5 quick cuts. The
"shots" below are CAPTURE-TIME framing windows for the camera
operator (Mechanism B) or context-state expectations (Mechanism A),
not separate clip segments.

| Window | Relative frames | Duration | Capture direction | R13a/R13b axis-target |
|--------|---|---|---|---|
| **W1 ESTABLISHING** | 0-90 | 3s | Wide enough to read multiplayer; board chrome (CASE BANNER + DiscardFan) clearly visible; phones held by 1-2 players in foreground; first frame mid-tone-to-dark preferred. **Cross-device sync moment:** a card play lands on the board (animation) at the SAME frame a phone-screen state changes (e.g., card vanishes from hand). Players gameplay-state: active round mid-game; ≥2 cards in DiscardFan; 2-4 players seated. | R13a (player chip increments visible in lobby/board transition; cross-device sync) |
| **W2 BUILDUP** | 90-160 | 2.3s | Continue active play; visible card play (player tap → board animation lands); rising tension toward BURNED moment. **Cross-device sync moment:** COMMS ticker scrolls scene-matched content (e.g., "OPERATIVE EN ROUTE — DO NOT INTERFERE"). Briggsy directs play tempo (off-camera, hand-signal to designated drawer 5s before expected draw) so the active player at frame ~160 is positioned to be visible. | R13a (COMMS ticker = software-side signal; ticker scrolling content matched to moment is mockup-proof) |
| **W3 BURNED DRAW (CRITICAL)** | 160-280 | 4s | **The trailer's emotional anchor.** Player draws BURNED card; **phone screen shows BURNED card face AT clip-relative frame 160** (per Critical Constraints reference-event definition); board shows DramaOverlay BURNED beat starting ~6-8 frames AFTER frame 160; **a second player's phone visibly registers** (e.g., goes from active-hand-state to spectator-disabled-action OR shows "WAIT — INTERCEPT?" prompt). BOTH the drawer's phone AND the board AND a second phone visible in frame. Mobile-safe-square: drawer's phone + board within x=[420, 1500] central band. | R13a STRONG (multi-device synchronization — drawer phone + board + second phone reacting in unison = mockup-impossible) + R13b moderate (drawer's reaction starts here) |
| **W4 DASH VO INTIMACY** | 240-300 | 2s | Overlaps W3 partially. **Hold the W3 frame** — DO NOT push in / zoom / refocus. Dash VO is layered audio (Phase 4 composition); the "intimate register" is delivered by VO tone, not camera move. A camera move during a single-take shot risks jarring composition — and Mechanism B is single-take fixed-rig (per design F02). Player visibly registers what happened (raised eyebrow, slight lean) — let body language carry. | R13b (player recognition response = visible aliveness signal) |
| **W5 SCREAM + REACTION** | 360-480 | 4s | If R5=kept, scream lands at 360 layered over visible aftermath. **Cross-device sync moment:** all 2-3 phones visibly in same game-state at ~frame 420 (e.g., all showing "waiting for [PlayerName]" OR similar settled state). Genuine reaction body language: lean-in, gesture, cover-mouth, real laughter, real "no!", real shock. **Rotate which player draws BURNED across takes** so the same person isn't always the drawer (desensitization mitigation per design F13). In sessions 3+, consider a fresh player who hasn't seen the DramaOverlay animation. (If R5=cut, this window is silent reaction continuation.) | R13b STRONG (multiple reactions to one event = peak aliveness signal) + R13a (cross-device settled state = peak software signal) |
| **W6 IRIS TARGET** | 480-540 | 2s | Settle the frame — primary subject center within ±400px of (960, 540), minimal motion. Camera holds steady (tripod). Iris-wipe begins at 495. Players "freeze for a beat" per director's-eye direction. **Frame 510 pause-check (Briggsy at Unit 5.4 take-selection):** extract via `ffmpeg -i take.mp4 -vf 'select=eq(n\,510)' -frames:v 1 iris-check.jpg`, verify clear focal point within central 30% of frame; if absent, take rejected for iris incompatibility. | R13b (resting body language; not strictly needed for R13a) |

Total: 18 seconds. Six capture-direction windows; one continuous
take. Shot transitions are NOT cut points — they are guidance for
where the camera operator's attention should be at each moment.
**The cross-device sync moments in W1/W2/W3/W5 are the highest-leverage
R13a signal** — mockup videos cannot fake simultaneous state changes
across independent devices. Phase 5 take-selection (Unit 5.4) weighs
these moments heavily.

**Step 3 — Approach III deck choreography (CORRECTED per feasibility F1/F2/F4 + adversarial F18).**

Phase 5 default (LOCAL-DEV path only per CALL E): deterministic
deck-seeding via `pnpm dev:stack` AFTER game enters playing phase,
+ natural human play on top.

**Why Approach III** (replacing Approach I as default for local-dev):

- Approach I (multiple natural takes, no seeding) struggles with
  even 60-second capture windows. BURNED draws naturally after
  60-300s in real play; landing the draw within trim-rescuable
  distance of clip-relative frame 160 across 3-5 takes is
  statistically unreliable. Phase 5 budget collapses to setup-burn.
- Approach III: seed the deck so BURNED is the first card drawn
  AFTER the seeded prefix runs. Real human play + reactions happen
  on top. The deck order is INVISIBLE to viewers. Reactions are
  UNSCRIPTED (anticipation-tell mitigation: only the OPERATOR
  knows the seed, players are told "we're seeding for pacing"
  without specifics).
- Approach II (engineered full sequence) still rejected — would
  require scripting all card plays + would read as artificial in
  the action sequencing, not just the deck order.

**Concrete invocation** (CORRECTED — pre-deepening had wrong CLI
signature + EK card names + pre-game seed inversion):

```bash
# Step 1: BOOT board + lobby. Note the room code displayed in lobby
#         (6-char alphanumeric).
#         Example: room code = "BURN17"

# Step 2: Players join lobby via QR or URL hash. Use codename
#         aliases (NOT real names) per Unit 5.0 Step 6b PII
#         protection.

# Step 3: Click "Cleared Hot" on the board → game enters `playing`
#         phase → engine constructs initial drawPile.
#         (CRITICAL: applyDevStackDeck rejects unless phase === 'playing'
#          per `src/server/dev-actions.ts:159-161`. Pre-deepening
#          "pre-game seed" inversion is impossible.)

# Step 4: NOW seed the deck top via dev:stack. Syntax: positional
#         <room> + space-separated card argv (NOT comma-joined; per
#         scripts/dev-stack-top.ts:42-48).
#         CANON card names from src/shared/card-defs.ts (NOT EK
#         names defuse/attack/skip/future-vision which don't exist
#         in BURNED — INVALID_CARD_TYPE on parse).

pnpm dev:stack BURN17 burn-the-files extraction intel-briefing reassign falsify-intel direct-order burned

# Effect: the 7 listed cards are prepended to TOP of the existing
# drawPile in left-to-right order. NEXT player draw is "burn-the-files"
# (position 1). Subsequent draws: extraction, intel-briefing, reassign,
# falsify-intel, direct-order, BURNED (position 7 = 7th draw).

# Step 5: Players play naturally from the seeded top. BURNED draws
# on the 7th draw after seeding completes IF no Skip/Attack/Reassign
# perturbations. See calibration below.
```

**BURNED-canon card names** (from `src/shared/card-defs.ts:12-29` —
verified via feasibility agent against actual code state):

Action cards (eligible for seeding into the action-cards portion of
the deck):
- `burned` — game-loss
- `extraction` — defuse equivalent
- `reassign` — direct-target swap
- `direct-order` — force draw on target
- `go-dark` — skip
- `intel-briefing` — see-future
- `falsify-intel` — alter-future
- `burn-the-files` — discard from top
- `back-channel` — attack-2-turns
- `call-in-a-favor` — favor / steal
- `intercepted` — nope

Operative cards (paired-collection, NOT seeded — they're collected
in deal):
- `agent-x`, `dash-barlowe`, `vera-khan`, `sable-ashworth`,
  `janet-broadside`, `neal-proctor`

`dev:stack` accepts only action-card types (operative cards have
different deck semantics).

**Calibration (CORRECTED per adversarial F15):**

The plan's pre-deepening "seed at positions 5, 6, 7, 8" is wrong
framing. With Approach III, BURNED's position is set by argv order
(if `burned` is at position 7 in the cards argv, it's the 7th draw
after seeding). The variable to calibrate is **total real-time
elapsed from "Cleared Hot" to the 7th draw** — which is multi-
dimensional (Skip/Attack/Reassign/Direct-Order all shift per-turn
count). Calibration:

1. Run a calibration play with the canonical 7-card seed prefix.
2. Stopwatch from "Cleared Hot" click to BURNED draw event (the
   visual BURNED-card-render on the drawer's phone).
3. Repeat 3 times. Target: BURNED draws between 5.0s-7.0s after
   "Cleared Hot" → land at clip-relative frame 160 ±60 raw frames
   after head-trim.
4. If consistently too fast (BURNED at <5.0s): add MORE filler
   cards before `burned` in the argv (e.g., 8-card prefix instead
   of 6).
5. If consistently too slow (BURNED at >7.0s): SUBTRACT filler
   cards before `burned`.
6. Iterate until 3 consecutive plays land BURNED within ±2 seconds
   of target.

`dev:stack` accepts up to 10 cards in the argv (per Zod schema in
`dev-actions.ts:30`); a typical calibrated seed uses 6-8 cards
including BURNED.

**Approach I fallback** (PRODUCTION-URL path OR Approach III
dev-actions unavailable; trimmed per scope F7):

If Approach III is not available (production URL captured, or
dev-actions blocked, or local-dev wrangler not running): capture
60-90s natural takes; apply trim-viability filter at Unit 5.4
take-selection (reject takes where raw BURNED frame < 160 OR raw
total length < raw_BURNED_frame + 380). Realistic yield: 1-2
usable takes per session × 10 takes per session ≈ 60-90 minutes
of pure capture; substantial setup tax for landing.

**Step 4 — Shot-list documentation in capture-log.md.**

Append the W1-W6 table + the deck-choreography seed pattern to
`capture-log.md` under a "Shot list (capture direction)" section.

**Patterns to follow:**

- Phase 1 Unit 1.5 Step 2 cue table pattern.
- `feedback-eye-in-loop-beats-calibration-for-motion.md` —
  capture-time direction is calibration-time work; not edit-time.
- Derek Lieu trailer-editing: "fewer cuts, longer takes" for
  authenticity (sourced from best-practices research Finding 11).

**Test scenarios:**

- **Happy path:** Shot list documented; W1-W6 align with cue map.
- **Approach III calibration:** seed position N produces BURNED
  draw at ~5.33s into 3 of 3 calibration plays.
- **Approach III fallback:** if dev-action handler refuses payload,
  switch to Approach I with extended take windows.

**Verification:**

- Shot list table in `capture-log.md`.
- Approach III deck-seeding command documented.
- Calibration position N recorded.

---

### Unit 5.3 — Capture Harness Build

- [ ] **Unit 5.3: Capture Harness Build**

**Goal:** Stand up the capture-mechanism-specific harness.

**Requirements:** R13.

**Dependencies:** Unit 5.1 (mechanism locked), Unit 5.2 (shot list).

**Files:**

- **Mechanism A path**: edit existing
  `scripts/playtest/lib/seat-factory.ts` +
  `scripts/playtest/run-session.ts` to add `--trailer-capture` mode.
  NO new from-scratch script.
- **Mechanism B path**: no source-code changes needed. OBS scene
  config + capture checklist live in `capture-log.md`.
- (Both paths): `scripts/generate-placeholder-gameplay.ts` —
  Phase 5 OWNS this script (Phase 4 cross-phase dep). Creates the
  18s placeholder MP4 that Phase 4 standalone-render consumes
  before Phase 5 ships the real clip.

**Approach (Mechanism A — parallel script importing harness libs;
per feasibility F5/F6 + adversarial F05):**

Pre-deepening proposed extending `pnpm playtest:run` with a
`--trailer-capture` CLI flag. That doesn't work — `parseArgv` at
`scripts/playtest/run-session.ts:83-128` throws on unknown args
(not `node:util.parseArgs`; a hand-rolled parser). Adding the flag
would require switching parsers + threading through Config +
RunSessionOptions + seat-factory + matching tests.

**Locked approach: parallel `scripts/playtest/trailer-capture.ts`**
that IMPORTS from harness libs (`scripts/playtest/lib/*`) but has
its OWN entry point + options surface. Discipline rule from
pre-deepening ("MUST extend harness not parallel spike") is upheld
in spirit — the harness's lifecycle code is REUSED, not duplicated.
The CLI surface is what's separate, and that's the right separation
(playtest harness's flags shouldn't grow trailer concerns).

**Step A.0 — Promote Unit 5.0 Step 6a spike to production script.**

The Unit 5.0 spike (`scripts/playtest/spikes/trailer-capture-spike.ts`)
becomes the basis of the production capture script. Move/refactor:

```ts
// scripts/playtest/trailer-capture.ts (NEW production script)
import { runSession } from './run-session'  // existing harness entry
import { spawnSync } from 'node:child_process'

interface TrailerCaptureOptions {
  seats: number  // typically 3
  duration: number  // typically 45 (seconds)
  outputDir: string  // 'videos/trailer/sample-eval/gameplay-capture/takes/'
  deckSeed: string[]  // BURNED-canon cards per Approach III
  room: string  // typically 'BURN-N' deterministic
}

async function trailerCapture(opts: TrailerCaptureOptions) {
  // 1. Spawn local wrangler + vite via existing server-controller
  // 2. Configure seat-factory with recordVideo wiring (per Step A.3)
  // 3. Configure board-view-launcher with recordVideo at 1920×1080
  // 4. Have board enter the lobby + mint room code = opts.room
  // 5. Players join (seat-factory handles the JOIN flow)
  // 6. Host clicks "Cleared Hot" → game enters `playing` phase
  // 7. SPAWN dev-stack-top as child process (NOT godClient.send):
  spawnSync('pnpm', ['dev:stack', opts.room, ...opts.deckSeed], {
    stdio: 'inherit',
  })
  // 8. Hold for opts.duration seconds while seats play seeded
  //    sequence; recording captures all contexts
  // 9. Stop all contexts; recordings finalize to opts.outputDir
}
```

Why child-process spawn of `dev:stack` (NOT extend GodHandle):
- `GodHandle` is read-only-observer; adding write-side `send()` is
  a trust-model change (god-WS now writes dev-actions).
- `dev-stack-top.ts` is tested infrastructure; spawning it as
  child process reuses the tested codepath verbatim.
- Cleaner separation: orchestrator coordinates timing; dev-stack
  child-process owns its own WS lifecycle (mint token, connect,
  send, disconnect).

**Step A.1 — Audit existing harness surface.**

Required reading before editing:

- `scripts/playtest/run-session.ts` (orchestrator)
- `scripts/playtest/lib/seat-factory.ts` (context creation per seat)
- `scripts/playtest/lib/server-controller.ts` (wrangler + vite
  lifecycle; insight 026 stdio drain pattern applies)
- `scripts/playtest/lib/orchestrator.ts` (game-flow coordination)
- `scripts/playtest/lib/god-subscriber.ts` (`GodHandle` surface —
  confirm read-only-observer; do NOT add write methods)
- `scripts/playtest/lib/board-view-launcher.ts` (per insight 032;
  needed for Step A.4 board recording)

**Step A.2 — Add `trailerCapture` option threading to seat-factory.**

```ts
// scripts/playtest/lib/seat-factory.ts (DIRECTIONAL EDIT)
// Add to CreateSeatOptions interface:
interface CreateSeatOptions {
  // existing fields...
  trailerCapture?: {
    enabled: boolean
    outputDir: string  // 'videos/trailer/sample-eval/gameplay-capture/takes/seat-NN/'
  }
}

// In createSeat() body, in the newContext call:
const context = await browser.newContext({
  ...iPhone13,
  hasTouch: true,
  viewport: { width: viewport.width, height: viewport.height },
  // NEW per Phase 5 Unit 5.3 — trailer-mode video recording
  ...(opts.trailerCapture?.enabled ? {
    recordVideo: {
      // CRITICAL: size MUST match viewport 1:1 or letterboxing
      dir: opts.trailerCapture.outputDir,
      size: { width: viewport.width, height: viewport.height },
    },
  } : {}),
})

// Inline assertion to catch future viewport/recordVideo size drift:
if (opts.trailerCapture?.enabled && recordVideo.size.width !== viewport.width) {
  throw new Error('trailerCapture: recordVideo.size MUST match viewport 1:1')
}
```

This is an OPT-IN field on the existing options interface (no breaking
changes to existing playtest harness consumers).

**Step A.3 — (renumbered, content moved to A.2)**

**Step A.4 — Add board-context recording at 1920×1080.**

The board-view-launcher (`scripts/playtest/lib/board-view-launcher.ts`
per insight 032) doesn't currently record video. Add analogous
trailerCapture option to its `newContext` call, with `viewport: {
width: 1920, height: 1080 }` matching record size. Confirm pre-
deepening assumed-tiny-edit is actually small by READING the file
first — pre-deepening hand-waved as "similar `recordVideo` option."

**Step A.5 — Approach III deck seeding via child-process spawn.**

After board context boots + lobby loads + room code minted + seats
join + host clicks "Cleared Hot" (game enters `playing` phase):

```ts
// scripts/playtest/trailer-capture.ts (production capture script)
// CORRECTED per feasibility F5: NOT godClient.send (doesn't exist).
// Spawn dev-stack-top.ts as child process; reuses tested codepath.
import { spawnSync } from 'node:child_process'

async function seedDeck(room: string, cards: string[]) {
  const result = spawnSync('pnpm', ['dev:stack', room, ...cards], {
    stdio: 'inherit',
    timeout: 10_000,
  })
  if (result.status !== 0) {
    throw new Error(`dev:stack failed with status ${result.status} — see stderr above`)
  }
}

// In trailerCapture() main flow, AFTER board reaches `playing` phase:
await seedDeck(opts.room, opts.deckSeed)
// Wait briefly for board state to settle (dev-action lands then
// game receives the seeded drawPile):
await new Promise(r => setTimeout(r, 500))
// Continue with seat-driver play loop
```

`dev-stack-top.ts` mints its own PLAYTEST_TOKEN + opens god-WS +
sends `dev-stack-deck` + disconnects. The trailer-capture orchestrator
just waits for the child-process to exit cleanly. Trust model
preserved (GodHandle remains read-only-observer).

**Step A.6 — Run trailer-capture sessions (CORRECTED).**

```bash
# Parallel entry point — NOT pnpm playtest:run (which doesn't accept
# --trailer-capture / --duration). Imports harness libs internally.
pnpm tsx scripts/playtest/trailer-capture.ts \
  --seats 3 \
  --duration 45 \
  --room BURN17 \
  --seed burn-the-files,extraction,intel-briefing,reassign,falsify-intel,direct-order,burned
```

Add the script entry to `package.json` scripts:
```json
"trailer:capture": "tsx scripts/playtest/trailer-capture.ts"
```

Outputs land at `videos/trailer/sample-eval/gameplay-capture/takes/
seat-{1,2,3}/<uuid>.webm` + `board/<uuid>.webm` (per-context WebM
files; concat or pick per-take post-hoc).

**Approach (Mechanism B — OBS + real devices):**

**Step B.1 — OBS pre-flight check** (per session).

Open OBS Settings → Video → Common FPS Values. Confirm **30**.
(OBS often defaults to 60.) Settings → Output → Container:
**MKV** (or Hybrid MP4 on OBS 32+). Encoder: NVENC HEVC if
available, else x264 CRF 18 medium.

Verify Video Capture Device source preview shows the actual table
+ TV scene (per CALL D — Mechanism B = physical camera, NOT
Display Capture). If Mechanism B' variant (Display Capture only)
is locked, verify TV signal preview shows board UI (NOT a black
square — HDCP rarely fires for non-protected browser content, but
if it does, the fallback is to capture the LAPTOP's local board.html
window directly via Window Capture and accept "TV in frame" becomes
"laptop screen in frame" — per adversarial F22).

**Step B.2 — Production-design pre-flight** (per session; cross-refs
the Critical Constraints "Mechanism B physical camera architecture"
checklist defined ONCE there, per scope F9).

Run through the director's-eye checklist. If ANY answer is N,
fix before recording.

**Step B.3 — Approach III deck seeding for Mechanism B (CORRECTED).**

After "Cleared Hot" → game enters `playing` phase, then in a
SEPARATE terminal on the dev host (the operator's laptop running
local wrangler; per CALL E Approach III local-dev only):

```bash
# Get room code from board lobby (visible on TV; 6-char alphanumeric)
# Example: ROOM = "BURN17"

# Seed deck top via dev:stack — CORRECTED CLI signature
# (BURNED-canon cards, space-separated argv, positional <room>)
pnpm dev:stack BURN17 burn-the-files extraction intel-briefing reassign falsify-intel direct-order burned
```

Verify the dev-action acknowledged (server log shows
`dev-stack-deck ok` or similar). If error `INVALID_CARD_TYPE`:
verify cards against `src/shared/card-defs.ts:12-29`. If error
`NOT_PLAYING`: game has not transitioned to playing phase yet
(click "Cleared Hot" first). If error `404` or
connection-refused: local wrangler not running, OR room code typo.

**Step B.4 — Capture session execution.**

1. Pre-recording: confirm tripod locked, lighting matches preview
   from calibration shot, phones at 40-60% brightness, players in
   wardrobe, background dressed
2. Host clicks OBS "Start Recording"
3. Host clicks "Cleared Hot" on board (selector per `Lobby.tsx:104-110`)
4. **THEN** Approach III seed via Step B.3 (dev:stack runs against
   playing-phase room)
5. Players + Briggsy (or operator-only) play through ~30-45 seconds;
   BURNED draws at the seeded position
6. Briggsy off-camera hand-signal to designated drawer 5s before
   expected draw (per adversarial F14 stage-direction; Briggsy
   is NOT a player in this configuration — he's director)
7. Players freeze briefly after BURNED-draw reaction (for iris
   anchor)
8. Host clicks OBS "Stop Recording" ~5 seconds after BURNED-draw
   reaction settles
9. Take saved to `videos/trailer/sample-eval/gameplay-capture/
   takes/take-NN.mkv` (Mechanism B's audio source = silent except
   for the one dedicated audio-archive take per session)

**Phone-screen-stay-awake reminder (per adversarial F25):** before
each session, ALL players set phone Auto-Lock to NEVER (iOS
Settings → Display & Brightness → Auto-Lock → Never). HEARTBEAT
timeout on dropped phones during 45s captures = wasted take.

**Step B.5 — MKV → MP4 remux (OBS 30/31 only; skip on 32+ Hybrid MP4).**

```bash
# Lossless remux (no re-encode; safe with -c copy because container
# both has H.264 already)
ffmpeg -i takes/take-01.mkv -c copy takes/take-01.mp4
```

**Step B.6 — Placeholder script ownership split (per scope F16 / circular-dep).**

Pre-deepening: Phase 4 "sketches" but Phase 5 "owns" the
`scripts/generate-placeholder-gameplay.ts` script. This created a
circular dep — Phase 4 needs a placeholder file during Phase 4
development (BEFORE Phase 5 starts), but Phase 5 owns the script.
Locked split:

- **Phase 4 ships a SIMPLE one-shot placeholder inline** during
  Phase 4 Unit 4.6 (no parameterization, hardcoded black-frame +
  silent 18s MP4). One ffmpeg command in Phase 4's plan. This
  unblocks Phase 4 standalone-render.
- **Phase 5 OWNS `scripts/generate-placeholder-gameplay.ts`**
  (PARAMETERIZED version with configurable duration, luminance,
  overlay text). Built during Unit 5.3 Step B.6 below. Phase 5's
  version REPLACES Phase 4's simple placeholder when Phase 5 runs.

Phase 5's parameterized version:

```ts
// scripts/generate-placeholder-gameplay.ts (Phase 5 owned)
// SAFE: execFileSync with argv arrays (project security convention)
import { execFileSync } from 'node:child_process'
import { parseArgs } from 'node:util'

const { values } = parseArgs({
  options: {
    duration: { type: 'string', default: '18' },        // seconds
    luminance: { type: 'string', default: 'midtone' },  // black | midtone | bright
    overlay: { type: 'string', default: '' },           // optional overlay text
    output: { type: 'string', default: 'public/trailer/gameplay-placeholder.mp4' },
  },
  strict: true,
})

const luminanceMap: Record<string, string> = {
  black: '0x000000',
  midtone: '0x333333',
  bright: '0xdddddd',
}
const color = luminanceMap[values.luminance!] ?? luminanceMap.midtone

execFileSync('ffmpeg', [
  '-y',
  '-f', 'lavfi',
  '-i', `color=c=${color}:s=1920x1080:r=30`,
  '-t', values.duration!,
  '-c:v', 'libx264',
  '-preset', 'medium',
  '-pix_fmt', 'yuv420p',
  ...(values.overlay ? ['-vf', `drawtext=text='${values.overlay}':fontcolor=white:fontsize=72:x=(w-tw)/2:y=(h-th)/2`] : []),
  '-an',
  '-map', '0:v:0',
  '-movflags', '+faststart',
  values.output!,
])
console.log(`[generate-placeholder-gameplay] wrote ${values.output}`)
```

(Note: `force_original_aspect_ratio` filter NOT used here because
source is lavfi `color` filter at exact 1920×1080 — no scaling
needed. Cross-phase amendment to Phase 4's placeholder ffmpeg syntax
flagged separately per Phase 4 plan.)

**Patterns to follow:**

- `scripts/playtest/lib/seat-factory.ts:144-153` — context creation
  precedent.
- Insight 026 — drain subprocess stdio if Phase 5 ever spawns
  ffmpeg as a long-running process (one-shot execFileSync is fine
  for ~10-30s encodes).
- Insight 022 — Phase 5 scripts MUST NOT import anything that
  transitively touches `partyserver` (room.ts quarantine zone).
- Phase 2 deepening: `execFileSync` argv-arrays; no shell strings.
- Vanity room codes: per `feedback-burned-vanity-room-codes.md`,
  random codes are hostile on phone keyboard during capture. The
  playtest harness mints its own `CAL`-prefixed code; for
  Mechanism B real-device sessions, friends can use QR-code scan
  + URL hash from the board view to avoid manual entry.

**Test scenarios:**

- **Mechanism A spike pass**: WebM files generated; DramaOverlay
  BURNED beat visible at full duration.
- **Mechanism B happy path**: take-01.mkv captured; remux to
  take-01.mp4 succeeds; mid-game UI visible end-to-end.
- **Placeholder script**: produces 18s MP4 at correct path; Phase 4
  standalone render consumes it.
- **OBS HDCP black-out**: pre-flight check catches it; switch to
  Window Capture.
- **Production URL stale**: switch to local-dev fallback per
  Unit 5.0.

**Verification:**

- Mechanism A: harness extension committed; trailer-capture mode
  produces WebM output.
- Mechanism B: OBS scene config + director's-eye production
  checklist verified; at least one spike take captured.
- Placeholder script: `pnpm tsx scripts/generate-placeholder-gameplay.ts`
  produces `public/trailer/gameplay-placeholder.mp4` (18s, silent).

---

### Unit 5.4 — Gameplay Capture Run + Take Selection (Fluency Gate)

- [ ] **Unit 5.4: Gameplay Capture Run + Take Selection (Fluency Gate)**

**Goal:** Run capture sessions; pick the take that best satisfies
the shot list AND the insight-050 fluency gate. Selected take
saved as `gameplay-raw.<ext>` for Unit 5.5 post-processing.

**Requirements:** R13 + R5 (alignment with scream cue at relative
frame 360 if R5=kept).

**Dependencies:** Unit 5.3 (harness built), Unit 5.0 (production
URL OR local-dev fallback decided).

**Files:**

- Create: `videos/trailer/sample-eval/gameplay-capture/takes/take-{NN}.{mp4,webm}` —
  raw captures
- Append to: `capture-log.md` — session log + per-take rubric +
  selection rationale
- Create: `videos/trailer/sample-eval/gameplay-capture/briggsy-review-5.4.signoff` —
  Briggsy git-authored sentinel
- Create: `videos/trailer/sample-eval/gameplay-capture/gameplay-raw.{mp4,webm}` —
  selected take copy (symlink OR cp depending on platform)

**Approach:**

**Step 1 — Session budget allocation + improvement loop.**

Pre-deepening 4-session yield-forecast was speculation. Per
scope F6 + adversarial F23: state minimum + a session-retrospective
improvement loop instead.

**Phase 5 minimum exit criterion:** ≥ 3 takes captured AND at
least 1 take passes the full take-selection ladder (Steps 3-7).

**Session 1 reality:** setup-heavy (~30 min setup tax: OBS config
verified, tripod calibrated, lighting set, friends briefed on
codename aliases, calibration of Approach III seed). Expect 0-2
usable takes.

**Session retrospective requirement:** after EACH session, record
in `capture-log.md`:
- What prevented the best take of the session from scoring on all
  axes?
- What changes to production design / calibration / player
  direction will be made for the next session?
- Without this loop, repeated sessions will reproduce the same
  failures. The retrospective IS the improvement mechanism.

**Calendar gate:** if 3 sessions yield zero takes passing the full
ladder, root-cause the failure (production design vs Approach III
calibration vs mechanism choice) BEFORE Session 4. Session 4 is
NOT "another attempt with same setup" — it's "redesigned attempt
with surfaced fix."

**Step 2 — Per-session execution.**

Pre-flight (each session):

- Production URL + WSS health probe (or local-dev verified)
- R5 outcome confirmed already at Unit 5.0 Step 6c (NOT
  re-confirmed here; pre-deepening read R5 at Unit 5.4 too late
  per adversarial F11)
- OBS recording profile verified (FPS=30, encoder, container)
- Director's-eye production checklist run-through (cross-ref
  Critical Constraints "Mechanism B physical camera architecture")
- Approach III deck seed prepared (Mechanism B locked + local-dev)
  OR Mechanism A trailer-capture script prepared
- Phone Auto-Lock = NEVER on all phones
- BURNED-drawer rotated across sessions for desensitization
  mitigation (design F13)

Capture loop:

1. Host clicks OBS Start Recording → "Cleared Hot" on board (Game
   enters `playing` phase)
2. **THEN** Approach III seed: `pnpm dev:stack <ROOM> burn-the-files extraction intel-briefing reassign falsify-intel direct-order burned`
3. Players play through ~30-45 seconds of natural seeded play;
   BURNED draws at position 7 of seed (≈5-7 seconds after
   "Cleared Hot")
4. Briggsy hand-signal to designated drawer 5s before expected
   draw (off-camera direction)
5. Brief freeze after BURNED-draw reaction settles (iris anchor)
6. Host stops recording
7. Take saved + named (`take-01.mp4`, `take-02.mp4`, ...)
8. Brief logging: 1-line description + timestamp; full rubric AFTER
   session not during
9. Re-seed deck for next take (re-call dev:stack with same argv)

**Step 3 — Per-take evaluation rubric (CALIBRATION FLOOR; tightened W4 per design F11).**

For each take, evaluate against shot windows + property criteria:

| Window | Criterion | ✓/✗/partial | Notes |
|--------|-----------|--------------|-------|
| W1 (establishing) | Multiplayer dynamic visible; board chrome readable; at least one cross-device sync moment visible | | |
| W2 (buildup) | Visible card-play action; rising tension; COMMS ticker content matched to moment | | |
| W3 (BURNED draw) | Drawer's phone shows BURNED card at clip-relative frame 160 ±3; board DramaOverlay starting ~6-8 frames after; second player's phone visibly registers | | |
| W4 (Dash VO intimacy) | Drawer's phone screen occupies ≥25% of frame height at some point during frames 240-300, OR drawer's face shows visible recognition response (non-neutral expression) — tightened from "close enough to read" per design F11 | | |
| W5 (scream + reaction) | Genuine body-language reaction (lean, gesture, cover-mouth); all phones in same settled game-state by ~frame 420 (cross-device sync moment) | | |
| W6 (iris target) | Center-frame focal point within ±400px of (960, 540); minimal motion; frame 510 pause-check via ffmpeg JPEG extraction (per shot list W6) | | |

**Take scoring**:
- 6/6 = ideal
- 5/6 = ship-able (proceed to ladder Steps 4-7)
- 4/6 = marginal (proceed only if no 5+ takes available)
- < 4/6 = reject

**NOTE**: AUDIO IS STRIPPED IN UNIT 5.5. Do NOT rate on audio
quality. Score visual content only.

**Rubric table for REJECTED takes (per scope F5):** rejected takes
get ONE LINE in the capture-log table (`take-NN | <date> | rejected — <one-line reason>`)
NOT the full 13-column rubric. Save the full table for trim-viable
candidates only.

**Step 4 — 24h cooling-off + §2 Archer gate + fluency gate
(NEW LADDER per product F11 + adversarial F06 + product F23 + design F18).**

Pre-deepening collapsed take-selection into a single Briggsy-watches-
once gate. New ladder spaces the gates across time + viewers to
mitigate anchoring + fatigue:

**Step 4a — Rubric-floor objective reject.** All takes scoring < 5/6
on the Step 3 rubric are rejected. Recorded with one-line reason.

**Step 4b — 24-hour cooling-off.** No take selection within 24 hours
of a session's last capture. Briggsy's eye is fatigue-degraded after
2 hours of capture watching. Sleep on it. (If shipping pressure
forces compression, document the trade in capture-log.md.)

**Step 4c — Random-order top-3 re-watch.** Briggsy re-watches the
top-3 rubric-pass takes IN RANDOM ORDER (use `shuf` or shake-then-
draw to randomize; pre-deepening "watch in capture order" anchored
on first-take). Each take watched full-speed ONCE. Briggsy writes
1-2 free-text sentences per take describing what landed and what
didn't.

**Step 4d — §2 Archer gate (NEW per design F18 + product F4).**
For each top-3 take, Briggsy applies the binary spec test:

> *"Could a frame from this take appear in an Archer promotional
> reel? Binary YES/NO — not partial."*

If NO, that take is rejected REGARDLESS of rubric score, fluency
gate outcome, or trim-viability. The §2 quality bar from
PRODUCT-SPECIFICATION.md §2 is the project's binary; Phase 5
applies it to its own output.

Specific reject signals (NOT exhaustive; documenting helps Briggsy
articulate the §2 verdict):
- Overhead fluorescent ceiling visible in any frame → REJECT
- Hand visibly trembles → REJECT (tripod failed; re-shoot if
  possible)
- Phone bezel reflects identifiable apartment-element → REJECT
- Wall art reads modern apartment (NOT briefing-room) → REJECT
- Table edge reads consumer-grade (NOT mahogany / Pendleton) → REJECT

**Step 4e — Fluency gate (insight 050; revised question phrasing
per product F24).**

Pre-deepening single closed-question "does this feel real" primes
the cooperative answer. Revised to 3 open questions:

1. *"Describe what you see in 1-2 sentences without saying 'BURNED'
   or 'Archer.'"* (Forces concrete observation, not vibes vocabulary.)
2. *"On a 1-10 scale how confident are you a stranger would describe
   this as a real game?"* (Quantifies the perception, surfaces
   uncertainty.)
3. *"If you had to ship this AND someone said 'fix one thing,' what?"*
   (Forces engagement with flaws; high-signal answer.)

A take passing §2 + scoring 7+ on Q2 + having a NON-DEAL-BREAKER
answer to Q3 advances to Step 5.

**~~Step 4f — Harry outside-eye blind viewer check (CALL F)~~ —
REPEALED 2026-05-22.**

CALL F was repealed (Harry is AI; no human outside-eye available).
Step 4f is deleted. Briggsy's contamination as sole judge is
accepted residual risk, mitigated by Step 4d (§2 Archer gate) +
Step 4e (fluency gate) + 24h cool-off + random-order top-3 watch.
Cross-ref: deepening header CALL F repeal note.

**Step 5 — Trim-viability filter (with objective tolerance per adversarial F07).**

For each take passing Step 4, identify the BURNED-draw raw-frame
position via the OBJECTIVE reference event definition (Critical
Constraints "BURNED-draw reference event"):

```bash
# Extract candidate range frames for visual scrub
ffprobe -count_frames -select_streams v:0 -show_entries stream=nb_read_frames \
  -of default=noprint_wrappers=1:nokey=1 takes/take-NN.mp4
# (Faster than full re-encode for take-iteration; saves 5-15 min per take)

# Visual scrub: find the FIRST frame where BURNED card art is
# visible at ≥50% opacity on the drawer's phone screen
# (this is candidate (a) from Critical Constraints reference-event
# definition; NOT candidate (b) DramaOverlay-start, NOT candidate
# (c) deck-flip)
```

Compute trim plan:
- `BURNED_DRAW_RAW_FRAME` = N (per visual scrub; reference event (a))
- For Mechanism A WebM: ffprobe `r_frame_rate` first, use as
  source-fps divisor (NOT hardcoded 30 — per feasibility F9)
- `HEAD_TRIM_FRAMES` = BURNED_DRAW_RAW_FRAME - 160 (target clip-frame 160)
- `TAIL_TRIM_TARGET_FRAME` = HEAD_TRIM_FRAMES + 540

**Reject** the take if:
- `HEAD_TRIM_FRAMES < 0`: BURNED drew too early; head-trim cannot
  pad backward
- `HEAD_TRIM_FRAMES > 600` (= 20 seconds at 30fps): excessive head
  trim; W1 establishing has too much dead pre-draw content
  (sweet spot is 60-300 frames = 2-10 seconds head trim; not zero
  because W1 needs real establishing time — per adversarial F04)
- `TAIL_TRIM_TARGET_FRAME > TOTAL_RAW_FRAMES`: not enough
  post-draw content for W5 + iris

**Step 6 — Selected take.**

Pick the take that:
1. Passes §2 Archer gate (Step 4d)
2. Passes fluency gate (Step 4e — Q2 ≥ 7, Q3 actionable)
3. Passes trim-viability filter (Step 5)
4. R5 outcome alignment (if R5=kept, scream cue at relative frame
   360 lands on visibly dramatic reaction window per W5 criterion)

Tiebreaker hierarchy (Step 4f Harry-check tiebreaker REPEALED 2026-05-22):
- (a) If two takes pass all three gates: BURNED-draw beat quality is
  highest weight (the trailer's emotional anchor)
- (b) If tied: cross-device sync moment richness (R13a signal)
- (c) If tied: fluency-gate Q2 confidence score (Briggsy's own; was
  previously Harry's per pre-2026-05-22 wording)
- (d) If still tied: take with the SMALLER head-trim (more
  establishing W1 = more aliveness setup)
- Note: pre-deepening tiebreaker (d) was "pick FIRST seen" — that's
  anchoring-as-feature. Removed per scope F26.

**Step 7 — Take selection documentation.**

Append to `capture-log.md`:

```md
## Take selection (Unit 5.4)

### Session log
- Session 1 (<YYYY-MM-DD>): setup; <N> calibration takes
- Session 2 (<YYYY-MM-DD>): <N> takes captured
- ... (continues)

### Per-take rubric scores (full table for trim-viable takes; rejected takes get one-line per scope F5; Harry column REPEALED 2026-05-22)
| Take | Date | W1 | W2 | W3 | W4 | W5 | W6 | Score | BURNED raw frame | Trim viable | §2 / Fluency | Notes |
|------|------|----|----|----|----|----|----|-------|------------------|-------------|---------|-------|
| 01 | ... | ✓ | ✓ | ✓ | ✓ | partial | ✓ | 5/6 | 220 | ✓ (head trim 60f = 2.0s) | §2 Y / Fluency Q2=7 | runner-up |
| 06 | ... | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 6/6 | 280 | ✓ (head trim 120f = 4.0s) | §2 Y / Fluency Q2=9 | SELECTED |

### Rejected (one-line per scope F5)
- `take-02 | <date> | rejected — BURNED drew too early (raw frame 89 < 160 floor)`
- `take-03 | <date> | rejected — overhead fluorescent visible in W1; §2 fail`
- `take-04 | <date> | rejected — drawer face mid-laugh during DramaOverlay; obscures phone screen at W3`
- `take-05 | <date> | rejected — fluency Q2 score 4 ("looks like an ad recording")`

### Selected: take-06.mp4
- BURNED-draw raw frame: 280 (reference event = first frame BURNED card art visible at ≥50% opacity on drawer phone)
- Head trim: 280 - 160 = 120 frames (4.0s — within sweet spot 60-300 frames)
- Trimmed clip target: frames 120 to 660 (= 540 frames @ 30fps)
- ±3 frame trim tolerance met (verified by ffprobe + visual scrub)

(Pre-deepening example showed take-06 with head trim 318 frames /
10.6s — that contradicted the sweet-spot criterion. Fixed per
adversarial F04 — sweet-spot is non-zero positive value, NOT
maximized. 60-300 frames = real W1 establishing time. <60 frames =
cold-open feel; >300 = too much dead pre-draw.)
- R5 outcome alignment: scream cue at relative frame 360 lands on
  player visibly leaning back — STRONG alignment

### Briggsy sign-off
Take 06 selected — APPROVED.
(briggsy-review-5.4.signoff written by Briggsy git-author)
```

**Step 8 — Sentinel + raw save.**

```bash
# Symlink (Linux/macOS) or cp (Windows) the selected take
cp videos/trailer/sample-eval/gameplay-capture/takes/take-06.mp4 \
   videos/trailer/sample-eval/gameplay-capture/gameplay-raw.mp4

# Briggsy commits the signoff sentinel via git with his author identity
# (briggsy007@gmail.com); Phase 4's verify:briggsy-sentinels gates on
# this author check (per adversarial F20 — sentinel commit message
# requires content payload, NOT rubber-stamp)
touch videos/trailer/sample-eval/gameplay-capture/briggsy-review-5.4.signoff
git add videos/trailer/sample-eval/gameplay-capture/briggsy-review-5.4.signoff
git commit -m "$(cat <<'EOF'
phase-5: briggsy-review-5.4.signoff (take-NN selected)

What landed Archer-grade:
- <2-3 sentences free-text, what specifically lands the §2 bar in
  this take. Required, not optional. Boilerplate / hedge-language
  ('looks good', 'I think this works') is the rush-tell — if you
  catch yourself writing it, the take needs more review.
EOF
)"
```

**Patterns to follow:**

- `feedback-eye-in-loop-beats-calibration-for-motion.md` — direct
  observation of real-world output, not metrics alone.
- Insight 050 — fluency reads over property checklists.
- Phase 4 `briggsy-review-N.signoff` git-author pattern (Phase 4
  Unit 4.9 NEW Step 3a `scripts/verify-briggsy-sentinels.ts`).
- `feedback-imagen-budget.md` adapted: multiple takes ≠ over-budget;
  budget is across sessions, not per take.

**Test scenarios:**

- **Happy path**: a take scores 6/6, passes fluency, passes
  trim-viability; Briggsy approves.
- **Edge case — best take has negative head-trim**: rejected;
  recapture in next session with earlier draws-into-the-round
  calibration.
- **Edge case — all takes score 5/6 with different strengths**:
  apply tiebreaker hierarchy.
- **Edge case — Approach III seed position drifts (BURNED keeps
  landing too early or too late)**: recalibrate N for next session.

**Verification:**

- ≥ 3 takes captured.
- `capture-log.md` records rubric + fluency + trim-viability.
- Selected take saved as `gameplay-raw.<ext>`.
- `briggsy-review-5.4.signoff` written by Briggsy git author.

---

### Unit 5.5 — Post-Processing (Single-Pass Re-Encode + Atomic Swap)

- [ ] **Unit 5.5: Post-Processing (Single-Pass Re-Encode + Atomic Swap)**

**Goal:** Trim selected take to exactly 540 frames + place
BURNED-draw at clip-relative frame 160 + aspect-fit to 1920×1080 +
strip audio + atomic-swap into `public/trailer/gameplay.mp4`.

**Requirements:** R8 (16:9 landscape), R13.

**Dependencies:** Unit 5.4 (gameplay-raw.<ext> selected + head-trim
plan recorded).

**Files:**

- Create: `scripts/post-process-gameplay.ts` — the processing
  script (Phase 5 owns)
- Output: `public/trailer/gameplay.mp4` — final (gitignored per
  Phase 4 Unit 4.6 contract)
- Append to: `capture-log.md` — post-process log section

**Approach:**

**Step 0 — Source framerate detection (NEW per feasibility F9).**

For Mechanism A WebM source: framerate is VARIABLE (~25-30fps under
Chromium). For Mechanism B native MP4/MKV source: framerate is the
OBS configured value (typically 30fps but verify). Detect actual
source framerate FIRST; use as divisor for HEAD_TRIM_SECONDS math.

```ts
// scripts/post-process-gameplay.ts (Step 0)
import { execFileSync } from 'node:child_process'

function getSourceFramerate(source: string): number {
  const probe = execFileSync('ffprobe', [
    '-v', 'error',
    '-select_streams', 'v:0',
    '-show_entries', 'stream=r_frame_rate',
    '-of', 'default=nokey=1:noprint_wrappers=1',
    source,
  ]).toString().trim()
  // r_frame_rate is "num/den" form, e.g. "30/1" or "30000/1001"
  const [num, den] = probe.split('/').map(Number)
  const fps = num / (den || 1)
  if (!isFinite(fps) || fps < 1) {
    throw new Error(`getSourceFramerate: invalid r_frame_rate "${probe}"`)
  }
  return fps
}
```

**Step 1 — Single-pass frame-accurate re-encode (HEAD_TRIM_FRAMES env-var; framerate-aware).**

Per framework-docs + best-practices findings: the pre-deepening
two-stage stream-copy-then-re-encode pattern is WRONG. `ffmpeg -ss
BEFORE -i + -c copy` drifts to nearest keyframe (up to 8s on
default OBS GOP). Single-pass re-encode with `-ss AFTER -i` +
`-frames:v 540` is frame-precise.

Pre-deepening hardcoded `HEAD_TRIM_FRAMES = 318 // EXAMPLE` in
directional code. Per security F09 + design F20 + adversarial F03:
this invites silent wrong-trim failures (verify-gameplay-clip gate
passes on wrong frame). Locked: read HEAD_TRIM_FRAMES from env var
with NaN-assertion startup guard.

```ts
// scripts/post-process-gameplay.ts (DIRECTIONAL)
// SAFE: execFileSync with argv arrays (project security convention)
import { execFileSync } from 'node:child_process'
import { renameSync, copyFileSync, unlinkSync, existsSync } from 'node:fs'

// Inputs:
// SOURCE = videos/trailer/sample-eval/gameplay-capture/gameplay-raw.<ext>
// HEAD_TRIM_FRAMES = from env var (record in capture-log.md per take)
const SOURCE = 'videos/trailer/sample-eval/gameplay-capture/gameplay-raw.mp4'
const STAGING = 'public/trailer/gameplay.mp4.new'
const FINAL = 'public/trailer/gameplay.mp4'

const HEAD_TRIM_FRAMES = parseInt(process.env.HEAD_TRIM_FRAMES ?? '', 10)
if (isNaN(HEAD_TRIM_FRAMES) || HEAD_TRIM_FRAMES < 0) {
  throw new Error(
    'HEAD_TRIM_FRAMES env var not set or invalid.\n' +
    'Read selected take BURNED-draw raw frame from capture-log.md, then:\n' +
    '  HEAD_TRIM_FRAMES=$((BURNED_DRAW_RAW_FRAME - 160)) pnpm tsx scripts/post-process-gameplay.ts'
  )
}

const sourceFps = getSourceFramerate(SOURCE)
console.log(`Source framerate: ${sourceFps.toFixed(2)} fps`)
const HEAD_TRIM_SECONDS = HEAD_TRIM_FRAMES / sourceFps

// Single-pass re-encode. `-ss AFTER -i` is frame-accurate
// (decode-side seek). `-frames:v 540` is count-precise (NOT `-t`
// which is wallclock-based and rounds). `fps=30` filter (NOT `-r 30`)
// properly drops/duplicates frames if source is 25fps (Mechanism A)
// or 60fps (Mechanism B optional high-fps). `-map 0:v:0` + `-an`
// strips audio.
//
// PRESET CHOICE (per scope F20):
// - Exploration / take iteration: use 'medium' for fast cycles
//   (~30s-1min encode time)
// - Final selected take only: use 'slow' for quality (~5-15 min
//   encode time on 1080p × 18s output)
// Read PRESET from env var; default 'slow' for safety.
const PRESET = process.env.FFMPEG_PRESET ?? 'slow'

execFileSync('ffmpeg', [
  '-y',
  '-i', SOURCE,
  '-ss', HEAD_TRIM_SECONDS.toString(),
  '-frames:v', '540',
  '-vf', 'fps=30,scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,setsar=1',
  '-c:v', 'libx264',
  '-crf', '18',
  '-preset', PRESET,
  '-pix_fmt', 'yuv420p',
  '-color_range', 'tv',
  '-map', '0:v:0',
  '-an',
  '-movflags', '+faststart',
  STAGING,
], {
  // execFileSync maxBuffer default 1MB — too small for slow-preset
  // 1080p ffmpeg stderr (per-frame progress). Raise to 50MB defensive
  // bound; drain stderr via stdio passthrough.
  maxBuffer: 50 * 1024 * 1024,
  stdio: ['ignore', 'pipe', 'inherit'],
})
console.log(`OK encoded ${STAGING} (preset=${PRESET}, expect ~${PRESET==='slow' ? '5-15 min' : '30s-1min'})`)
```

**Decode-side seek + slow preset combine to 5-15 min encode time
(per feasibility F10).** Document the expectation up-front so
operators don't worry about ffmpeg "hanging" — it's just decoding +
encoding through the trim point. Use `FFMPEG_PRESET=medium` for
exploration encode of multiple candidate takes; promote to `slow`
only for the final selected take.

**Step 2 — `pnpm verify:gameplay-clip` gate** (Phase 4-owned script).

```ts
// Continued in scripts/post-process-gameplay.ts
// Invoke Phase 4's verify script (do NOT re-implement)
try {
  execFileSync('pnpm', ['verify:gameplay-clip', STAGING], {
    stdio: 'inherit',
    maxBuffer: 50 * 1024 * 1024,
  })
  console.log('OK verify:gameplay-clip passed')
} catch (err) {
  console.error('FAIL verify:gameplay-clip — review staging file:', STAGING)
  console.error('Common causes: frame count != 540, audio stream present, dims != 1920×1080.')
  // Do NOT mv staging to final on failure; surface for re-encode.
  process.exit(1)
}
```

`pnpm verify:gameplay-clip` (Phase 4 deliverable at
`scripts/verify-gameplay-clip.ts`) asserts:
- Exactly 540 video frames (`stream=nb_frames` via ffprobe)
- Dimensions 1920×1080
- No audio stream (`-select_streams a` returns empty)
- First-frame YAVG luminance (logged; warns if > 76.5 — informs
  head-fade engagement, not a hard fail)

**Step 3 — Atomic swap (with EXDEV fallback per feasibility F11 + adversarial F16).**

```ts
// Continued in scripts/post-process-gameplay.ts
// Three Windows failure modes addressed:
//   (a) EBUSY — Remotion studio holds open file handle
//   (b) EXDEV — STAGING and FINAL on different drives (cross-drive rename)
//   (c) rename-over-existing-file non-atomicity in some node versions

function atomicSwap(staging: string, final: string) {
  try {
    // Primary path: atomic rename (works when both on same drive,
    // no open handles)
    renameSync(staging, final)
    console.log(`OK atomic swap ${staging} → ${final}`)
  } catch (err: any) {
    if (err.code === 'EXDEV') {
      // Cross-drive: copyFileSync + unlinkSync (loses atomicity but
      // works cross-drive)
      console.warn('EXDEV — falling back to non-atomic copy+unlink')
      copyFileSync(staging, final)
      unlinkSync(staging)
      console.log(`OK non-atomic swap ${staging} → ${final}`)
    } else if (err.code === 'EBUSY' || err.code === 'EPERM') {
      console.error('FAIL atomic swap — file held open by another process.')
      console.error('Likely Remotion studio. Close `pnpm studio` + retry.')
      throw err
    } else if (err.code === 'EEXIST') {
      // Some Windows node versions: rename refuses to overwrite.
      // Fallback: explicit unlink-then-rename.
      console.warn('EEXIST — falling back to unlink-then-rename')
      unlinkSync(final)
      renameSync(staging, final)
      console.log(`OK swap (unlink+rename) ${staging} → ${final}`)
    } else {
      throw err
    }
  }
}

atomicSwap(STAGING, FINAL)

// SHA256 hash for handoff verification (per scope F21 + adversarial F03)
// Phase 6 reads this from PHASE-5-EXIT.md to verify clip didn't drift
// between phases.
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
const sha = createHash('sha256').update(readFileSync(FINAL)).digest('hex')
console.log(`SHA256: ${sha}`)
// Record SHA in capture-log.md post-process section
```

**Step 4 — Phase 4 lifecycle trigger.**

After the swap, Phase 4's `sync-gameplay-clip.ts` regenerates
`gameplay-clip-source.ts` on next `pnpm render` / `pnpm studio` /
`pnpm install` via the prerender/prestudio/postinstall lifecycle
hooks. Phase 5 doesn't invoke it directly — but Unit 5.6 will need
to `pnpm sync-gameplay && pnpm render` explicitly to ensure pickup.

**Step 5 — Post-process log.**

Append to `capture-log.md`:

```md
## Post-process log (Unit 5.5)

- Raw take: gameplay-raw.mp4 (selected from take-06)
- Source duration: 30.2s (906 frames @ 30fps native)
- Head trim: 318 frames (10.6s)
- Output frames: 540 (18.000s)
- Output dimensions: 1920×1080
- Output framerate: 30/1
- Audio: stripped (`-an` + `-map 0:v:0`)
- Encode: libx264 CRF 18 preset slow yuv420p faststart
- First-frame YAVG: <value from verify-gameplay-clip log>
  - YAVG ≤ 76.5: natural fade-friendly; head-fade cosmetic
  - YAVG > 76.5: head-fade is load-bearing for chapter-break
- File size: <N> MB
- Atomic swap: gameplay.mp4.new → gameplay.mp4
- verify:gameplay-clip: PASS
```

**Patterns to follow:**

- FFmpeg seek-after-input for frame accuracy:
  https://trac.ffmpeg.org/wiki/Seeking
- `execFileSync` argv arrays (project security convention per
  Phase 2 deepening).
- Insight 026 — maxBuffer + stdio drain for ffmpeg.
- Phase 4 atomic-swap contract (line 2722-2724).
- Phase 4 `verify-gameplay-clip.ts` ownership (do NOT re-implement).

**Test scenarios:**

- **Happy path**: single-pass re-encode produces 540-frame 1920×1080
  30fps MP4; verify gate passes; atomic swap succeeds.
- **Mechanism A source is WebM**: ffmpeg accepts WebM input; encode
  to MP4 transcodes cleanly (no `-c copy` needed because container
  + codec both change).
- **Edge case — verify gate fails on frame count drift**: do NOT
  swap; re-encode with adjusted parameters.
- **Edge case — Windows EBUSY on rename**: close Remotion studio +
  retry.
- **Edge case — frame rate mismatch** (source 60fps from OBS):
  `fps=30` filter properly decimates; no judder.

**Verification:**

- `public/trailer/gameplay.mp4` exists at expected dimensions +
  duration.
- `pnpm verify:gameplay-clip ./public/trailer/gameplay.mp4` PASSES
  (re-run post-swap for belt-and-suspenders).
- BURNED-draw lands at clip-relative frame 160 (visual scrub
  confirms).
- `capture-log.md` post-process section complete.

---

### Unit 5.6 — Phase 4 Re-render + R13 Acceptance

- [ ] **Unit 5.6: Phase 4 Re-render + R13 Acceptance**

**Goal:** Re-run Phase 4's full composition render with the real
`gameplay.mp4` (replacing the placeholder via the sync-gameplay
lifecycle hook). Verify S05 reads as intended. R13 acceptance via
fluency gate.

**Requirements:** R13.

**Dependencies:** Unit 5.5 (gameplay.mp4 final + verify passed).

**Files:**

- Re-render: `videos/trailer/out/trailer-scene-build.mp4` — full
  composition with real gameplay
- Append to: `capture-log.md` — re-render verification section
- Create: `videos/trailer/sample-eval/gameplay-capture/briggsy-review-5.6.signoff`

**Approach:**

**Step 1 — Re-render with explicit lifecycle invocation.**

```bash
cd videos/trailer
# Remove stale render to avoid reviewing a cached output
rm -f out/trailer-scene-build.mp4
# Explicit sync-gameplay (also runs via prerender hook but be explicit)
pnpm sync-gameplay
# Render
pnpm render
```

Phase 4's `sync-gameplay-clip.ts` detects
`public/trailer/gameplay.mp4` exists and regenerates
`gameplay-clip-source.ts` to point at the real clip. The next
render picks it up.

**Step 2 — Full-runtime verification.**

Open `out/trailer-scene-build.mp4`. Verify against Phase 4 Unit
4.10's verification card:

- All 12 sample frames pass §2 Quality Bar (including the 2 S05
  samples at relative frames 90 + 240).
- BURNED-draw moment lands at absolute frame 2200 (= S05 start
  2040 + relative 160), ±2 frames.
- Scream cue (if R5=kept) at absolute frame 2400 (= S05 start +
  relative 360) lands on visible reaction window.
- Iris-wipe at S05→S06 transitions cleanly out of the gameplay
  clip.
- S05HeadFadeFromBlack overlay carries the hard-cut chapter break.

**Step 2.5 — Composite-fitness test (NEW per design F09 + adversarial F09).**

Pre-deepening jumped from re-render → fluency gate. Per design F09:
the SELECTED take may compose fine in isolation but reveal problems
once Phase 4 overlays land on top. Add a composite-fitness step BEFORE
the full-trailer R13 fluency gate.

Procedure:

1. Render Phase 4's S05 scene IN ISOLATION (not full trailer):
   `cd videos/trailer && pnpm render -- src/Root.tsx Preview_S05 out/s05-composite-fitness.mp4`
   (Preview_S05 per Phase 4 deepening locked).

2. Extract 6 sample frames via ffmpeg at clip-relative frames:
   ```bash
   for f in 0 90 160 240 360 510; do
     ffmpeg -i out/s05-composite-fitness.mp4 -vf "select=eq(n\,$f)" -frames:v 1 \
       fitness-f${f}.png
   done
   ```

3. Briggsy spot-checks each frame:
   - **f0 (head-fade)**: reads as fade-to-black, NOT flash. YAVG
     transition smooth across frames 0-15
   - **f90 (W1 establishing)**: chrome text legible against gameplay
     background; no overlap with stat caption
   - **f160 (BURNED draw)**: critical-text overlays + DramaOverlay
     stamp positions don't clash with the drawer's phone-screen
     content; stat caption backdrop legibility holds
   - **f240 (Dash VO)**: side-band-right composition not cropping
     mobile-X autoplay
   - **f360 (scream cue if R5=kept)**: scream overlay typography
     readable over gameplay frame motion
   - **f510 (iris-wipe)**: clear focal point in center ±400px;
     iris collapse target visible

4. **If ANY frame fails** → reopen take-selection (Unit 5.4) with
   the surfaced failure mode. Do NOT advance to Step 3.

5. If all 6 frames pass → proceed to Step 3.

This step catches composition problems that pre-deepening would only
surface in Phase 6 (too late — full trailer already rendered).

**Step 3 — R13 acceptance via multi-gate ladder** (revised per
adversarial F11 + product F11 + design F18).

Pre-deepening single Briggsy fluency-question was contamination-
maxed (Briggsy designed everything). Revised: §2 + 3-question
fluency gate (Harry outside-eye step REPEALED 2026-05-22 per CALL F
repeal — Harry is AI; mirrors Unit 5.4 Step 4 ladder as amended;
applied at FULL-TRAILER scope, not single-take scope).

**Step 3a — §2 Archer gate at full-trailer scope.**

Briggsy watches the full trailer (with real S05 gameplay) ONCE,
full-speed, with sound. Single binary question:

> *"Could a frame from this trailer appear in an Archer promotional
> reel?"*

If NO → reopen take-selection OR Phase 4 composition issue (route
per failure-mode-to-unit map below).

**Step 3b — Fluency gate (open questions per product F24).**

Briggsy answers 3 open questions about the full trailer:

1. *"Describe the closing 18s in 1-2 sentences without saying 'BURNED'
   or 'Archer.'"*
2. *"On a 1-10 scale how confident are you a stranger would describe
   this as a real shipped game?"*
3. *"If you had to ship this AND someone said 'fix one thing,' what?"*

Pass: Q2 score ≥ 7 AND Q3 answer is non-deal-breaker (a tweak, not
a redo).

**~~Step 3c — Harry outside-eye R13 acceptance (CALL F)~~ — REPEALED 2026-05-22.**

CALL F was repealed; Step 3c is deleted. R13 acceptance runs on
**Briggsy's own judgment** at Step 3a (§2) + Step 3b (fluency). The
failure-mode-to-unit map below is preserved as a self-diagnostic
checklist Briggsy applies during his own fluency-gate Q3 ("if you
had to ship this AND someone said 'fix one thing,' what?") — the
"Surfaces" column now reads as Briggsy's own observations, not
Harry's. If Briggsy can't articulate which failure mode applies,
R13 is uncertain — extend 24h cool-off, re-watch random-order, then
re-evaluate.

**R13 failure-mode-to-unit map** (Briggsy self-diagnostic; original
adversarial F15 trigger still applies — pattern preserved, source of
observation changed from Harry to Briggsy per CALL F repeal):

| Observation surface | Likely failure | Route to |
|---|---|---|
| "Reaction reads as forced" | W5 capture issue | Unit 5.4 reopen (recapture) |
| "Game state looks staged" | Approach III seed visible / players coached | Unit 5.2 reopen (different seed + less coaching) |
| "DramaOverlay missed the moment" | Trim math off | Unit 5.5 reopen (retrim) |
| "Iris-wipe edge competes with motion" | W6 freeze failed | Unit 5.4 reopen (re-pick take with cleaner W6) OR Unit 5.1 Step 4 (camera ops fix) |
| "S05 head-fade reads as flash" | Frame-0 too bright | Unit 5.4 reopen (re-pick darker-frame-0 take) |
| "Looks like a mockup" | Production-design floor failure | Unit 5.1 reopen (Mechanism / production design rework) |
| "Demo reel aesthetic" | Mechanism A's §2 risk | Mechanism reopen (switch to B if available) |
| "Apartment / home video tells" | Mechanism B production-design failure | Unit 5.1 Step 4 reopen (lighting / wardrobe / background) |

**Step 4 — Sentinel + documentation (with content payload per adversarial F20).**

Append to `capture-log.md`:

```md
## Phase 4 re-render + R13 acceptance (Unit 5.6)

- Re-render date: <YYYY-MM-DD>
- Render duration: <N> minutes
- Output file size: <N> MB
- gameplay-clip-source.ts: pointing at trailer/gameplay.mp4 (real)
  (NOT placeholder)

### §2 sample frame verification
- [ ] S05 relative frame 0 (head-fade): § PASS
- [ ] S05 relative frame 160 (BURNED draw): § PASS
- [ ] S05 relative frame 240 (Dash VO): § PASS
- [ ] S05 relative frame 360 (scream cue if R5=kept): § PASS
- [ ] S05 relative frame 510 (iris-wipe): § PASS

### R13 fluency gate
- Verdict: <PASS | FAIL>
- If FAIL: what didn't land: <Briggsy text>
- If FAIL: route: <recapture | re-trim | re-pick take>

### Briggsy sign-off
<PASS = briggsy-review-5.6.signoff written; FAIL = unit reopens>
```

```bash
# Briggsy commits the signoff sentinel (per adversarial F20 — content payload required)
touch videos/trailer/sample-eval/gameplay-capture/briggsy-review-5.6.signoff
git add videos/trailer/sample-eval/gameplay-capture/briggsy-review-5.6.signoff
git commit -m "$(cat <<'EOF'
phase-5: briggsy-review-5.6.signoff (R13 accepted)

What landed R13a (legitimacy / shipped):
- <2-3 sentences free-text. What cross-device sync signals / software
  signals make this read as shipped + playable, not mockup.>

What landed R13b (aliveness / joy):
- <2-3 sentences free-text. What player reactions / body language /
  cross-device cohesion make this read as real joy, not staged.>

~~Harry's verbatim answer~~ (REPEALED 2026-05-22 — CALL F repeal;
Harry is AI, no outside human eye):
- Section omitted; R13 runs on Briggsy's own fluency-gate answers.

§2 verdict + reasoning:
- <Y/N + 1-2 sentences why this could/couldn't appear in Archer
  episode frame.>
EOF
)"
```

**Patterns to follow:**

- Phase 4 Unit 4.10 verification pattern.
- `feedback-verify-before-presenting.md` — render-MP4 review.
- Insight 050 — fluency over property.
- Phase 4 briggsy-sentinel git-author verification.

**Test scenarios:**

- **Happy path**: re-render succeeds; verify-gameplay-clip remains
  PASS; fluency YES; R13 ACCEPTED.
- **Edge case — BURNED-draw frame drift**: re-pick a different
  take OR adjust head-trim in Unit 5.5.
- **Edge case — S05 reads less alive than placeholder**: take
  selection reopen.
- **Edge case — Phase 4 composition changed during Phase 5
  execution**: re-read Phase 4 Unit 4.6 contract; reconcile any
  drift before re-render.

**Verification:**

- `out/trailer-scene-build.mp4` re-rendered with real gameplay.
- Fluency gate YES.
- `briggsy-review-5.6.signoff` written by Briggsy git author.
- `capture-log.md` re-render section complete.

---

## System-Wide Impact

- **Interaction graph:** Phase 5 ingests Unit 5.0 preflight
  (deploy migration state, insight 035 status, harness +
  dev-actions availability) + Phase 1 S05 cue map + Phase 4 S05
  scene + Phase 2 sparse-Dash + scream audio cues. Produces
  `public/trailer/gameplay.mp4` consumed by Phase 4 S05's
  `<OffthreadVideo>`. Re-renders Phase 4's deliverable via
  `sync-gameplay-clip` lifecycle hook.
- **Error propagation:** Failed capture → recapture session →
  iterate. Failed `verify:gameplay-clip` gate → re-encode with
  adjusted parameters (do NOT swap). Failed R13 fluency → reopen
  Unit 5.4 take selection or recapture per failure-mode-to-unit
  map in Unit 5.6 Step 3c.
- **State lifecycle risks:** Phase 5 depends on BURNED being
  deployed + accessible OR local-dev fallback working with phones
  on LAN. Atomic-swap pattern guards against partial-file reads
  during in-flight Remotion renders. `gameplay-clip-source.ts`
  lifecycle hook (Phase 4-owned) flips source-of-truth on
  prerender/prestudio/postinstall.
- **API surface parity:** Phase 5 USES BURNED's user-facing
  surface to capture gameplay + uses dev-action surface
  (`dev-stack-deck`, `dev-give-card`) for Approach III seeding. No
  BURNED game-code modification beyond optional `data-testid`
  attribute additions if Mechanism A path is invoked and existing
  harness selectors prove insufficient.
- **Integration coverage:** Phase 4 S05 scene imports the clip via
  `<OffthreadVideo>`; integration validated by Unit 5.6 re-render
  + composite-fitness test (NEW Step 2.5). `pnpm verify:gameplay-clip`
  ffprobe gate catches contract drift (cross-phase amendment to
  Phase 4 extends gate per feasibility F15).
- **Unchanged invariants:** BURNED game code untouched. Phone
  bundle budget unaffected. Trailer remains isolated.

### Parallelizable work during Phase 5 wait-states (NEW per product F22)

Phase 5 has natural wait-states (friend scheduling, 24h take-selection
cool-off, encode time). Per product F22 opportunity-cost mitigation:
list of Phase 6/7 work that can begin during Phase 5 in-flight:

- **Phase 6 Unit 6.0 `verify-trailer-final` script** — can be built
  in advance, parameterized to consume Phase 4's eventual final
  composition output. Not gated on Phase 5 output.
- **Phase 6 Unit 6.4 contact-sheet generation script** — can be
  built + tested against the placeholder S05 + the existing S01-S04
  Phase 4 scenes. Real S05 swap is cheap once ready.
- **Phase 6 Unit 6.5 cross-browser audit checklist** — can be drafted
  + browser-matrix prepared in advance.
- **Phase 7 Unit 7.0 distribution copy + X-native cutdown logistics** —
  fully parallelizable; URL stewardship + post copy can be drafted
  during Phase 5.
- **Phase 7 metrics-tracking dashboard setup** — fully parallelizable;
  Analytics / engagement targets can be configured before launch.

Wait-states are not idle states. Document Phase 6/7 prep work in
each phase plan's "Phase 5 in-flight tasks" subsection (cross-phase
amendment surfaced; not blocking this commit).

---

## Risks & Dependencies

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Deploy migration drags past Phase 5 deadline (2026-05-24) | Medium (5 single-line changes uncommitted) | Medium (Mechanism A) / Low (Mechanism B) | Mechanism-coupled mitigation per URL strategy matrix (CALL G). Mechanism A path: local-dev URL in frame catastrophically fails R13a → either resolve migration OR force Mechanism B. Mechanism B path: LAN setup documented in Unit 5.0 Step 6; URL not in frame so unaffected. |
| Mechanism B logistics fail (no friends available within 7 days) | Medium | Medium | **Mechanism A locks unconditionally** (no longer "escalation" — first-class fallback per CALL A). Mechanism B' SOLO fallback also available (per adversarial F10): Briggsy operates 2-3 phones on his own desk + OBS captures all surfaces. R13b aliveness signal degrades but R13a + §2 floor preserved. |
| Mechanism A spike fails GSAP/Framer fidelity | Medium | High (forces back to B or Mechanism B') | Parallel A/B spike at Unit 5.0 Step 6a explicitly verifies DramaOverlay BURNED beat at full duration via behavioral test, not file-existence. If both spikes fail → Phase 5 blocks pending root-cause (insight 035 regression OR Cloudflare migration OR camera DoF). |
| BURNED-draw timing variance with Approach I fallback (production-URL path) | High | Medium | Approach III is LOCAL-DEV only (CALL E). Production-URL captures default to Approach I (60-90s takes, 10 takes/session ≈ 1-2 ship-able). Budget set accordingly in Unit 5.4 Step 1 retrospective improvement loop. |
| Real-device capture has phone bezel / hand obstruction over critical chrome | Medium | Low | Calibration shot in Unit 5.1 Step 3 verifies framing pre-capture; reshoot with adjusted framing if needed. |
| Mic accidentally captures player voice | Low | Low | Three-layer audio defense (capture silent + `ffmpeg -an` + `<OffthreadVideo muted />`) + `verify:gameplay-clip` audio-stream-absence gate. |
| Captured clip reads as less alive than Phase 4 placeholder | Low | Medium | §2 Archer gate + 3-question fluency gate at Unit 5.6 (multi-gate ladder per product F11 + product F23/F24). Harry outside-eye step REPEALED 2026-05-22 per CALL F repeal — Briggsy contamination accepted as residual risk. Multiple recapture sessions allowed via session-retrospective improvement loop. |
| Stat-caption overlays float over handheld micro-shake (Phase 4 composite tells) | Medium without tripod / Low with tripod | Medium | **Tripod REQUIRED** for Mechanism B (Critical Constraints "Mechanism B physical camera architecture" + product F7). Unit 5.6 composite-fitness test (Step 2.5) extracts 6 sample frames + verifies overlay stability before R13 acceptance. |
| OBS recording settings produce file that won't play in Remotion | Low | Medium | Unit 5.5 re-encode to known-good H.264 yuv420p MP4; Phase 4's `verify-gameplay-clip` ffprobe gate validates Remotion-compatibility (extended this commit with pix_fmt + r_frame_rate + field_order assertions per feasibility F15). |
| Re-render time after gameplay swap blocks Phase 6 | Low | Low | Re-render is ~6-9 minutes; absorb in Phase 6 schedule. Phase 6 prep work parallelizable during Phase 5 (per System-Wide Impact parallelizable section). |
| FFmpeg trim introduces frame-count drift (off-by-N) | Low (single-pass re-encode + `-frames:v 540`) | High | `verify:gameplay-clip` asserts exactly 540 frames; gate failure prevents swap. HEAD_TRIM_FRAMES env-var + framerate-aware math (Mechanism A WebM) closes the divisor-mismatch failure (feasibility F9). |
| Windows EBUSY / EXDEV / EEXIST on atomic rename | Medium (Briggsy is Windows-primary) | Low | atomicSwap() function handles all three: EBUSY → user-prompt to close studio; EXDEV → copyFileSync+unlinkSync fallback; EEXIST → unlink-then-rename. SHA256 logged post-swap for Phase 6 handoff verification. |
| Mechanism A WebM framerate variance (~25fps vs assumed 30fps) | High (Mechanism A) | High without mitigation | Unit 5.5 Step 0 ffprobes source `r_frame_rate`; HEAD_TRIM_SECONDS divides by ACTUAL fps; `fps=30` filter converts output to CFR 30fps (feasibility F9). |
| HEAD_TRIM_FRAMES hardcoded wrong value → silent wrong-trim → verify-gameplay-clip PASSES but BURNED at wrong scene frame | Was Medium (pre-deepening); now Low | High | Env-var-with-NaN-assertion startup guard (security F09 + design F20 + adversarial F03). Wrong-trim now fails LOUDLY at script startup, not silently at runtime. |
| `dev:stack` invocation fails — wrong card names (EK names absent in CARD_DEFS) | Was certain (pre-deepening); now N/A | Was High | BURNED-canon cards documented throughout (feasibility F1). `parseDevActionMessage` INVALID_CARD_TYPE error now caught at Unit 5.0 Step 4 functional smoke test. |
| `dev:stack` invocation fails — wrong CLI signature (comma-joined vs space-separated argv) | Was certain (pre-deepening); now N/A | Was High | Corrected CLI signature documented throughout (feasibility F2). |
| Approach III seed fails — game still in lobby phase at dev:stack call | Was certain (pre-deepening); now N/A | Was High | Sequence corrected: "Cleared Hot" → playing phase → THEN dev:stack (feasibility F4). |
| Approach III against production URL fails — dev:stack hardcoded localhost | Was certain (pre-deepening); now N/A | Was High | Approach III is LOCAL-DEV ONLY (CALL E); production-URL captures use Approach I (feasibility F3 + adversarial F01). |
| Mechanism A godClient.send() call fails — method doesn't exist | Was certain (pre-deepening); now N/A | Was High | Use child-process spawn of `pnpm dev:stack` instead; preserves GodHandle read-only trust model (feasibility F5). |
| `pnpm playtest:run --trailer-capture` rejected by parseArgv | Was certain (pre-deepening); now N/A | Was High | Parallel script `scripts/playtest/trailer-capture.ts` imports harness libs programmatically; no CLI flag wiring needed (feasibility F6). |
| `verify-briggsy-sentinels` doesn't check phase-5 sentinels | Was Medium | Low | Cross-phase amendment extends Phase 4's `SCENES` const to include phase-5 paths (feasibility F7). |
| Phase 4 deliverables not built before Phase 5 entry | High (current state 2026-05-17) | High | Unit 5.0 Step 0 hard prerequisite check; Phase 5 blocks until Phase 4 implementation complete (feasibility F8). |
| Phase 4 S05 scene file changed during Phase 5 idle, breaks integration | Low | Low | Re-render in Unit 5.6 catches breakage; Phase 4 contract pinned by `verify:gameplay-clip` gate. |
| Insight 035 regresses (someone moves breathe animation back onto `.action`) | Very Low | High | Unit 5.0 preflight Step 2 explicitly verifies via CSS-grep + behavioral spike (adversarial F17). |
| Pre-flight deploy migration verification fails due to wrong-URL guess | Was Medium (pre-deepening); now Low | Low | URL strategy matrix locks the decision in Unit 5.0 Step 5 based on which URL responds + which mechanism is locked (CALL G). |
| First-frame YAVG > 76.5 (bright frame 0) | Medium (depends on take) | Low (cosmetic) | Phase 4's mandatory `S05HeadFadeFromBlack` overlay carries the chapter break regardless. Optimization opportunity, not correctness gate. |
| Iris-wipe collapses on empty frame center | Medium (without direction) | Medium | Iris-frame composition test at take selection (frame 510 pause via ffmpeg JPEG extraction per W6 criterion). Reject takes that fail. |
| Player names visible on phone/board → PII in committed/distributed footage | Medium (default behavior) | Medium | Codename aliases mandatory pre-session per Unit 5.0 Step 6b (security F01/F02). Recorded as stage names, never legal names. |
| Room code captured in trailer → viewer could join active room | Low (Mechanism B; phones-but-not-board generally in frame) / Higher (Mechanism A; full board UI captured) | Low (room expires after inactivity) | Capture-room is destroyed pre-distribution; verify by attempting to join the captured room code after capture (should 404 or be expired). Phase 7 distribution post-capture confirms (security F03). |
| Friend scheduling slip → Phase 5 schedule slip → Phase 6/7 cascade slip | Medium | High | Unit 5.0 Step 6b 7-day friend-confirmation gate triggers Mechanism A auto-lock if missed. Phase 6/7 parallelizable work documented (product F22). |
| Briggsy contamination as sole judge → R13 false-PASS | Medium | High | **ACCEPTED RESIDUAL RISK** as of 2026-05-22 (CALL F repeal — Harry outside-eye step deleted because Harry is AI, not a human eye; team is just Briggsy + Claude(s) forever, no human gate available). Surviving mitigations: 24h cool-off, random-order top-3 re-watch, §2 Archer gate, fluency gate (product F11 + product F23/F24). adversarial F06 ("Briggsy contamination as sole judge") no longer mitigated by outside human, only by the temporal + ladder defenses. Cross-ref: deepening header CALL F repeal note. |

---

## Open Questions

### Resolved During Planning (deepening pass + doc-review absorption)

- **Capture mechanism**: locked at Unit 5.1 Step 1 based on Unit 5.0
  Step 6a parallel A/B spike outcomes. Both mechanisms first-class
  candidates; tiebreaker = Mechanism B IF logistics + spike pass; A
  unconditional if B logistics fail. Mechanism C cut entirely.
  (Revised per CALL A from pre-deepening "B locks per water-beads.")
- **R13 axes locked**: R13a (legitimacy) + R13b (aliveness) both
  required; mechanism trades off across them; explicit recognition
  unlocks better decisions (CALL B).
- **Agent-built identity tension reconciled**: S05 humans = audience,
  not builders; R14 cold-open + R15 chrome carry agent-built thesis;
  director's-eye discipline ensures players read as players (CALL C).
- **Mechanism B = physical camera (OBS Video Capture Device), NOT
  Display Capture alone**: Display Capture is Mechanism B' variant
  for board-UI-only R13 framing (CALL D).
- **BURNED-draw target frame**: clip-relative frame **160 ±3** (NOT
  360). Reference event = first frame BURNED card art visible at
  ≥50% opacity on drawer's phone screen. Scream cue at frame 360 is
  a separate reaction beat.
- **Trim ownership**: Phase 5 trims; Phase 4 consumes pre-trimmed.
  No `gameplay-markers.json` (retired this commit per feasibility F13).
- **Approach III is LOCAL-DEV ONLY** (CALL E + feasibility F3):
  deterministic deck-seeding via `pnpm dev:stack <ROOM> <card> <card> ...`
  (BURNED-canon cards, space-separated argv, room positional). Approach
  I for production-URL captures.
- **Approach III seed-after-game-start sequence locked**: lobby →
  "Cleared Hot" → playing phase → THEN dev:stack (feasibility F4).
- **Mechanism A path: child-process spawn of dev-stack-top** (NOT
  fictional GodHandle.send/waitForAck — feasibility F5).
- **Mechanism A path: parallel script `scripts/playtest/trailer-capture.ts`
  importing harness libs** (NOT --trailer-capture CLI flag on
  playtest:run — feasibility F6).
- **Audio policy**: 3-layer belt-and-suspenders (capture silent +
  `ffmpeg -an` + `<OffthreadVideo muted />`); ONE audio-archive
  take per Mechanism B session captured WITH audio for Phase 6
  reference only (adversarial F26).
- **Output path**: `public/trailer/gameplay.mp4` per ADR #15.
  Sample-eval at `videos/trailer/sample-eval/gameplay-capture/`.
- **Atomic swap**: write `.new` → `pnpm verify:gameplay-clip` →
  atomicSwap() with EBUSY/EXDEV/EEXIST handling on PASS. SHA256
  logged post-swap (feasibility F11 + adversarial F16).
- **Post-process**: single-pass re-encode (libx264 CRF 18 preset
  configurable via FFMPEG_PRESET env var; default `slow` for ship);
  HEAD_TRIM_FRAMES from env var with NaN-assertion startup guard;
  framerate-aware via ffprobe `r_frame_rate`; `fps=30` filter for
  CFR; `-map 0:v:0 -an` audio strip; `-color_range tv`.
- **`verify:gameplay-clip` consumption**: Phase 4 owns the script;
  Phase 5 invokes via `pnpm verify:gameplay-clip` — does NOT
  re-implement. Phase 4 extends gate per cross-phase amendment
  (pix_fmt + r_frame_rate + field_order assertions; feasibility F15).
- **`scripts/generate-placeholder-gameplay.ts` ownership split**:
  Phase 4 ships simple inline placeholder during Phase 4 work;
  Phase 5 owns parameterized version that lands at Unit 5.3 Step B.6
  (scope F16).
- **Take selection ladder**: rubric-floor → 24h cool-off → random-
  order top-3 watch → §2 Archer gate → 3-question fluency gate.
  (Harry outside-eye step REPEALED 2026-05-22 per CALL F repeal —
  Harry is AI, no human outside eye.) Pre-deepening single-Briggsy-
  watch contamination-vulnerability mitigated by the temporal +
  ladder defenses; adversarial F06 residual risk accepted (product
  F11 + product F23/F24 + design F18).
- **§2 Archer gate at take selection (separate from fluency)**:
  binary YES/NO; failures reject regardless of rubric score
  (design F18 + product F4).
- **Sentinel files with content payload** (adversarial F20):
  `briggsy-review-5.4.signoff` + `briggsy-review-5.6.signoff`
  commits require 2-3 sentence free-text payload describing what
  landed. Rubber-stamp/hedge-language signoffs caught in own writing.
- **`verify-briggsy-sentinels` scope extended**: Phase 4's script
  hardcoded to scenes 4.2-4.7; cross-phase amendment landed this
  commit to include phase-5 sentinels (feasibility F7).
- **PHASE-5-PREFLIGHT.md ceremony DROPPED** (scope F1): preflight
  outcomes record in `capture-log.md` mechanism-lock header.
- **PHASE-5-EXIT.md template trimmed** to 4 facts + Phase 6
  read-points (scope F13; see template below).
- ~~**Harry as R13 outside-viewer** (CALL F)~~ — **REPEALED
  2026-05-22.** Harry is AI; no outside human eye is available.
  R13 acceptance runs on Briggsy's judgment alone. See deepening
  header CALL F repeal note.
- **Production URL strategy matrix mechanism-coupled** (CALL G):
  Mechanism A → URL in frame → deploy migration hard prereq.
  Mechanism B → URL not in frame → Phase 7 owns distribution copy.
- **Final format**: 1920×1080 H.264 CRF 18 30fps no-audio MP4 with
  faststart + yuv420p + tv color range.

### Deferred to Implementation

- **Approach III seed calibration** (3 consecutive plays ±2s of
  5.33s target; iterate filler-card count in argv per Unit 5.2 Step 3).
- **R5 outcome alignment specifics**: read from `PHASE-0-EXIT.md`
  at Unit 5.0 Step 6c (NOT Unit 5.4 — too late per adversarial F11).
- **OBS Hybrid MP4 vs MKV+remux**: depends on installed OBS
  version (30/31 → MKV; 32+ → Hybrid MP4); verified at Unit 5.0
  Step 8a.
- **NVENC vs x264 encoder choice**: depends on Briggsy's GPU;
  verified at Unit 5.0 Step 8a.
- **Local-dev LAN setup specifics** (firewall scope, board WSS
  redirect via VITE_PARTYKIT_HOST env): verified at Unit 5.0
  Step 6 if fallback invoked.
- **Camera rig spec finalization** (camera class, lens, distance,
  height): per Unit 5.0 Step 6d + Unit 5.1 Step 3 calibration shot.
- **Friend recruitment names + dates**: Unit 5.0 Step 6b at Phase 5
  entry; 7-day confirmation gate.

---

## Documentation / Operational Notes

- All Phase 5 capture artifacts land at
  `videos/trailer/sample-eval/gameplay-capture/` (takes, logs,
  evals, sentinels). The **only** Phase-5-produced asset that goes
  to BURNED root `public/` is the final `gameplay.mp4` (per ADR #15).
- Capture sessions are physical events (Mechanism B): schedule
  + 1-2 friend recruitment + 2-hour window per session.
- Session budget: 4 sessions total (1 setup + 2 capture + 1
  contingency).
- `BURNED_URL` env var configures the capture target URL —
  production or local-dev LAN IP fallback.
- `execFileSync` argv arrays throughout (project security
  convention per Phase 2 deepening).
- Take selection: rubric is CALIBRATION FLOOR; fluency gate is
  LOAD-BEARING. Don't ship a 6/6 take that reads dead.
- `pnpm verify:gameplay-clip` (Phase 4-owned) is the cross-phase
  contract gate — Phase 5 does NOT re-implement.
- Atomic-swap (`.new` → verify → `mv`) prevents partial-file reads
  during in-flight Remotion renders.
- Briggsy-sentinel git-author check (Phase 4-owned `pnpm
  verify:briggsy-sentinels`) — Phase 5's signoffs must be authored
  by `briggsy007@gmail.com`.

### PHASE-5-EXIT.md template (TRIMMED per scope F13)

Phase 5 ships a single short exit document Phase 6 reads. Pre-
deepening 55-line template had fields already captured in
capture-log.md OR knowable at plan-time. Trimmed to 4 facts +
Phase 6 read-points + R13 audit summary.

```md
# Phase 5 Exit — <YYYY-MM-DD>

## 4 facts Phase 6 needs

1. **Mechanism used**: <A | B | B'>
2. **Selected take**: <take-NN; capture date>
3. **Clip path**: `public/trailer/gameplay.mp4`
4. **`pnpm verify:gameplay-clip`**: PASS (run date)

## R13 audit summary
- §2 Archer gate (Step 3a): PASS — <one-line rationale>
- Fluency gate Q2 score (Step 3b): <N>/10
- ~~Harry outside-eye verdict (Step 3c)~~ — REPEALED 2026-05-22 (CALL F)
- R13a (legitimacy / shipped) verdict: PASS — <Briggsy fluency rationale>
- R13b (aliveness / joy) verdict: PASS — <Briggsy fluency rationale>

## R5 alignment
- Scream cue outcome (from PHASE-0-EXIT.md): <kept | cut>
- If kept: scream cue at scene-relative frame 360 lands on:
  <description of visible reaction at that frame>

## File integrity
- SHA256: <hash from atomic-swap log>

## Phase 6 read-points
- Phase 6 acceptance reads: out/trailer-scene-build.mp4 (re-rendered
  in Unit 5.6 with real gameplay clip)
- Phase 6 may re-render with production encoding settings (per
  Phase 4 deepening amendment TIER 2 #8: re-render is NOT precluded
  by Phase 5 ship).
- Phase 6 mobile-crop audit: BURNED-draw beat verified within
  x=[420, 1500] safe-square band.

## Panel-feedback absorption flow (Phase 6 reopen procedure per
adversarial F15)
- If Phase 6 panel (N=6 testers per ADR #21) surfaces a R13
  failure, map the failure to Unit 5.X per the failure-mode table
  in Unit 5.6 Step 3c.
- Phase 5 reopen path: rerun the relevant unit (5.1 / 5.2 / 5.3 /
  5.4 / 5.5 / 5.6) with the surfaced failure addressed.
- DO NOT reopen the WHOLE phase; surgical-unit reopen only.

## Operational notes for Phase 6
- gameplay-clip-source.ts: pointing at trailer/gameplay.mp4 (NOT placeholder)
- Run `pnpm sync-gameplay && pnpm render` if re-rendering from scratch
- If Phase 6 needs to roll back to placeholder: `rm public/trailer/gameplay.mp4`
  + `pnpm sync-gameplay` flips constant back to placeholder

## Detail-on-demand
Full capture-log.md (mechanism-lock header + per-session retrospective
+ post-process log + take-selection rubric + R13 audit) at
`videos/trailer/sample-eval/gameplay-capture/capture-log.md`.
Phase 6 reads it for granular detail; PHASE-5-EXIT.md is the
4-fact summary.
```

### Cross-phase amendments surfaced by Phase 5 deepening

**LANDED THIS COMMIT** (doc-review absorption pass):

**Phase 1 amendments** (`phase-1-beat-sheet-lock.md`):
- **Phase 1 lines ~1140-1152**: retired
  `gameplay-raw.mp4 + gameplay-markers.json` contract; replaced
  with pre-trimmed contract reference (Phase 4 deepening + Phase 5
  deepening + doc-review absorption). Phase 4 consumes via
  `<OffthreadVideo src={staticFile('trailer/gameplay.mp4')} muted />`
  with no trim props.
- **Phase 1 line ~815**: cue-table prose disambiguated. "BURNED card
  draws on capture" = visual draw event at clip-relative frame 160,
  NOT simultaneous with frame 360 scream beat. Dash VO scream at
  frame 360 is a Sterling-CODED delayed reaction, 200 frames /
  6.67s after the visual draw.

**Phase 4 amendments** (`phase-4-remotion-composite.md`):
- **`scripts/verify-briggsy-sentinels.ts` `SCENES` const extended**
  to include `phase-5` sentinel paths (`5.4`, `5.6`); was hardcoded
  to scenes 4.2-4.7 only (feasibility F7).
- **`scripts/verify-gameplay-clip.ts` gate extended** with
  `pix_fmt = yuv420p` assertion, `r_frame_rate = 30/1` (CFR not
  VFR) assertion, optional `field_order = progressive` warning
  (feasibility F15).

**FLAGGED for next plan amendment** (not absorbed this commit;
the items below are out of scope for Phase 5 review):

**Phase 4 follow-up amendments**:
- **Phase 4 Unit 4.6 Step 2 line ~2708** placeholder script: invalid
  ffmpeg filter syntax `force_original_aspect_ratio=cover` (valid
  values are `disable|decrease|increase`). Should be `increase`.
  Will crash placeholder generation on first invocation. Phase 5's
  Unit 5.3 Step B.6 placeholder script uses the correct syntax; Phase
  4's simple inline placeholder needs the same fix. (Noted by scope F12;
  to be applied in Phase 4 plan next-touch.)

**Roadmap follow-up amendments**:
- **Roadmap §3 row 5 (line ~110)**: path drift — currently reads
  `videos/trailer/assets/gameplay.mp4`; should be
  `public/trailer/gameplay.mp4` per ADR #15.

**Phase 6/7 parallelizable work surface** (per product F22):
- Phase 6 plan needs "Phase 5 in-flight work" subsection enumerating
  Unit 6.0 verify-script, Unit 6.4 contact-sheet script, Unit 6.5
  browser-matrix checklist as parallelizable.
- Phase 7 plan needs "Phase 5 in-flight work" subsection enumerating
  distribution copy + cutdown logistics + metrics dashboard setup
  as parallelizable.

---

## Sources & References

**Origin documents:**
- Brainstorm: [`docs/ideation/2026-05-15-origin-trailer-brainstorm.md`](../../ideation/2026-05-15-origin-trailer-brainstorm.md)
- Roadmap: [`docs/plans/origin-trailer/roadmap.md`](./roadmap.md)
- Phase 0 plan: [`docs/plans/origin-trailer/phase-0-gate-resolution.md`](./phase-0-gate-resolution.md)
- Phase 1 plan: [`docs/plans/origin-trailer/phase-1-beat-sheet-lock.md`](./phase-1-beat-sheet-lock.md)
- Phase 4 plan: [`docs/plans/origin-trailer/phase-4-remotion-composite.md`](./phase-4-remotion-composite.md)

**BURNED gameplay surfaces consumed:**
- Board view: `src/client/board/`
- Player view: `src/client/player/`
- DramaOverlay BURNED beat: `src/client/shared/DramaOverlay.tsx`
- NopeCountdownBar: `src/client/board/NopeCountdownBar.tsx` (NOT `shared/` — corrected per Phase 5 deepening)
- CASE BANNER: `src/client/board/GameTable.tsx:67-88` (inline `.caseBanner` aside; NOT `CaseBanner.tsx` which doesn't exist — corrected per Phase 5 deepening, matching Phase 1 + Phase 3 deepening notes)
- DiscardFan: `src/client/board/DiscardFan.tsx`
- SmartActionBox: `src/client/player/SmartActionBox.tsx` (+ `.module.css` line 136-143 for insight 035 fix verification)
- Join screen selectors: `src/client/player/JoinScreen.tsx:228-266` (`input[type="text"]`, `button:has-text("Check In")`)
- Lobby selectors: `src/client/board/Lobby.tsx:104-110` (`button:has-text("Cleared Hot")`)

**Playtest harness (Mechanism A precedent):**
- `scripts/playtest/run-session.ts` (orchestrator)
- `scripts/playtest/lib/seat-factory.ts` (context creation per seat; line 144-153 viewport + 160-161 selectors)
- `scripts/playtest/lib/server-controller.ts` (wrangler + vite lifecycle with PLAYTEST_TOKEN; insight 026 stdio drain)
- `scripts/playtest/lib/orchestrator.ts` (game-flow coordination)
- `scripts/playtest/agents/seat-scripted.md` (seat-driver pattern)
- `pnpm playtest:run` (existing CLI entry)

**Dev-action surface (Approach III):**
- `src/server/dev-actions.ts` (dev-action handler)
- `src/server/dev-actions.test.ts` (parser contract tests, lines 11-87)
- `scripts/dev-stack-top.ts` → `pnpm dev:stack`
- `scripts/dev-give-card.ts` → `pnpm dev:give`
- `scripts/dev-take-card.ts` → `pnpm dev:take`

**External docs (trimmed per scope F23; defensive citations removed,
working references only):**

- Playwright recordVideo + viewport (Mechanism A): https://playwright.dev/docs/api/class-browser#browser-new-context
- FFmpeg seek-after-input frame accuracy (Unit 5.5): https://trac.ffmpeg.org/wiki/Seeking
- FFmpeg `fps` filter for CFR conversion (Unit 5.5): https://ffmpeg.org/ffmpeg-filters.html#fps
- FFmpeg `signalstats` YAVG (verify-gameplay-clip): https://ffmpeg.org/ffmpeg-filters.html#signalstats
- Derek Lieu trailer-editing (Unit 5.2 shot list rationale only;
  removed duplicate citations): https://www.derek-lieu.com/editing

**Institutional learnings (memory):**
- `feedback-eye-in-loop-beats-calibration-for-motion.md` — direct
  observation over rubric metrics
- `feedback-verify-before-presenting.md` — render-MP4 review,
  not studio preview
- `feedback-burned-vanity-room-codes.md` — phone friction with
  random room codes (acknowledged; QR/URL-hash mitigates)
- `user_harry.md` — Harry as potential capture-session participant
- `feedback-phase-plan-drafting-workflow.md` — write all phase
  files in one workflow; deepen sequentially after
- `feedback-elite-team-standard.md` — hardening = feature works
  end-to-end, NOT green unit tests on broken code

**BURNED insights consumed:**
- `docs/insights/021-strip-before-validate-is-an-atomicity-gap-class.md` — atomic-swap pattern rationale
- `docs/insights/022-partyserver-cloudflare-scheme-breaks-vitest-node.md` — room.ts quarantine zone (Phase 5 scripts must not import partyserver)
- `docs/insights/026-undrained-subprocess-stdio-stalls-at-64kb.md` — execFileSync maxBuffer + stdio drain
- `docs/insights/035-smartactionbox-breathe-animation-defeats-playwright-stability-check.md` — RESOLVED; verified at Unit 5.0 Step 2
- `docs/insights/050-agent-verification-misses-perceptual-continuities.md` — fluency gate over property rubric (Unit 5.4 Step 4 + Unit 5.6 Step 3)
