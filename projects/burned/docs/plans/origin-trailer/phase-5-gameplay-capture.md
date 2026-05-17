---
title: "Origin Trailer — Phase 5: Gameplay Capture Harness + Capture"
type: feat
phase: 5
parent: docs/plans/origin-trailer/roadmap.md
origin: docs/ideation/2026-05-15-origin-trailer-brainstorm.md
created: 2026-05-16
deepened: 2026-05-17
reviewed: pending
status: active
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

Three capture mechanisms remain in scope. Mechanism C (hybrid) is
**CUT** during deepening — it produces a two-source-sync problem
Phase 4 has no composition lane for, and Mechanism A + B alone
cover the design space.

| Mechanism | Pros | Cons | Resolution / framerate |
|-----------|------|------|------------------------|
| **A. Playwright multi-context (via playtest harness extension)** | Fully scripted, deterministic, no real devices, reuses tested harness infrastructure | **Records WebM/VP8 at ~1Mbps ceiling** (Playwright default) — visual quality strictly inferior to native 1080p OBS regardless of post-processing. Headless GSAP/Framer animation fidelity unverified at capture-time (spike must validate DramaOverlay BURNED beat). Browser chrome has no ambient context (cleaner-than-Archer aesthetic). | WebM/VP8 default, 1280×720 or 1920×1080 record-size; needs full re-encode to H.264 (NOT stream-copy) in post |
| **B. OBS + real devices** (board on TV, 2-3 phones held by humans) | Real touch animation, real phone screens, real human reaction, native 1080p H.264 quality, Archer-coded ambient lighting controllable | Requires Briggsy + 1-2 friends physically present; less reproducible if recapture needed; iPhone screen mirroring quality varies; production-design (lighting, camera angle, table dressing) must be deliberately directed to avoid AI-slop | OBS 1920×1080 @ 30fps native (MKV-then-remux for crash safety per OBS 30/31; or Hybrid MP4 on OBS 32+) |
| ~~**C. Hybrid: Playwright board + OBS phones**~~ | ~~Captures both halves at maximum quality~~ | **CUT during deepening.** Two-source sync produces a Phase 4 composition problem with no downstream lane. Not reconsidered unless A and B both fail completely. | n/a |

**Mechanism B locks as Phase 5 default** per water-beads rule +
visual-quality ceiling (Mechanism A's VP8 1Mbps cannot be
recovered post-hoc). Mechanism A retreats to **escalation path** if
Mechanism B logistics fail — and when invoked, MUST go via
playtest-harness extension, not parallel spike.

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

**Production URL note:** Pages project name in
`deploy-burned.yml:77` is `burned` (canonical URL `burned.pages.dev`).
The `burned-cxa.pages.dev` URL in `ActRemote.tsx` is likely a
PR-preview / canary subdomain on the same project. Verify with
Briggsy at Phase 5 execution start which production URL is
canonical for the capture session.

The largest risk Phase 5 manages: **the capture doesn't visually
sell "playable game"** — instead reads as a screen recording of a
local dev session OR as engineering footage rather than water-beads
joy. Phase 5 mitigations:
- Shot list curated for moments of REAL multiplayer drama (BURNED
  card draw, intercept stack, favor flow, defuse placement)
- Approach III hybrid (deterministic deck-seeding via
  `pnpm dev:stack` + natural human reactions on top) eliminates the
  30-second-capture-vs-natural-BURNED-timing problem while
  preserving water-beads (reactions are unscripted; only the deck
  order is rigged, which is invisible to viewers)
- Insight 050 fluency gate at take selection: Briggsy-eye continuity
  check OVERRIDES property-rubric ties
- Director's-eye production guidance for Mechanism B (camera angle,
  ambient lighting, phone-holding posture, table dressing,
  faces-cropping)

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

**Cross-phase note:** Phase 1 line 815 cue-table prose ("in-game
BURNED card draws on capture → Dash VO interjects") is ambiguous
between this interpretation and a simultaneous-beat reading. Phase 1
line 807 trim-spec is unambiguous: draw at frame 160. The two are
internally inconsistent in Phase 1; flagged for Phase 1 follow-up
amendment in Cross-Phase Amendments section below.

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
**OBSOLETE** (Phase 1 follow-up amendment flagged below).

This contract also means: if Phase 5's trim math is wrong (e.g.,
BURNED draw lands at clip-relative frame 200 not 160), the scream
beat at scene-relative frame 360 will fire on the wrong visual
context. Trim math is load-bearing.

**Trim viability filter:** Phase 5 take-selection must reject any
take whose RAW BURNED frame is < 160 (head-trim cannot pad
backward) OR whose RAW total length is < 160 + 380 = 540 frames
post-draw (Shot 5 reaction beat needs ~12.7s of post-draw content
for natural play + iris-wipe target composition). Realistic raw-take
minimum: ~30 seconds (900 frames) at 30fps.

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

### Mechanism A reality — Playwright records WebM/VP8 at ~1Mbps

If Mechanism A is invoked, the output container is **WebM (VP8)**,
NOT MP4. This has four consequences:

1. **Filename convention**: takes saved as `take-NN.webm`, not
   `.mp4`.
2. **Trim cannot be stream-copy**: WebM→MP4 requires full re-encode
   (libx264) because the container/codec differ. `ffmpeg -c copy`
   will fail with container mismatch error.
3. **Visual quality is CEILED at VP8 ~1Mbps target bitrate**
   (Playwright's encoder default). Post-processing cannot recover
   detail that VP8 never encoded. This makes Mechanism A's visual
   quality strictly inferior to Mechanism B's native 1080p H.264
   OBS capture, regardless of trailer-side encode quality.
4. **Frame-accurate trim requires `-ss AFTER -i` + re-encode** (NOT
   `-ss BEFORE -i + -c copy`). The "fast keyframe seek" pattern
   drifts to nearest preceding keyframe (up to ~2-8s on default GOP
   sizes for both VP8 and OBS-default H.264).

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

### dev:stack / dev:give available for Approach III

Per `package.json:13-15`:
```
"dev:stack": "tsx scripts/dev-stack-top.ts",
"dev:give":  "tsx scripts/dev-give-card.ts",
"dev:take":  "tsx scripts/dev-take-card.ts",
```

These dev-action scripts are tested infrastructure (see
`src/server/dev-actions.test.ts:11-87`) that send `dev-stack-deck` /
`dev-give-card` / `dev-take-card` payloads to the room's
dev-action handler. Phase 5 Unit 5.2 adopts **Approach III** —
deterministic deck-seeding via `dev:stack` before each take, so
BURNED lands at a predictable deck position relative to the
turn-rotation cadence. Real human play and reactions happen on top
of the seeded deck. The deck order is INVISIBLE to viewers; the
reactions are UNSCRIPTED. Water-beads preserved; capture-budget
collapsed from 3-5 sessions × 30s-windows-that-miss-BURNED to
1-2 sessions × predictable BURNED-draw timing.

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

### Brainstorm's tiebreaker-rule applies

Per brainstorm: *"When (a) 'engineers talk about how it was built'
and (b) 'water-beads / product-joy takes over' conflict in the edit
bay, water-beads wins. The build is the subtext; the game is the
text. The cascade earns its place by feeling like Archer
set-dressing, not a credits roll."*

For S05 gameplay clip: water-beads-wins means the clip sells **joy
of playing BURNED**, not "look at the engineering." Mechanism B
real-device capture preserves real human reactions (hands holding
phones, audible laughter eyes flicking up to TV, leans-in). The
Mechanism A path produces a clean engineering aesthetic that has
less ambient context. **Mechanism B is the water-beads choice; the
quality and aliveness ceiling are aligned.**

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

- **Capture mechanism**: Mechanism B (OBS + real devices) is the
  **locked default** per water-beads rule + visual-quality ceiling.
  Mechanism A (Playwright multi-context via playtest-harness
  extension) is **escalation path** if Mechanism B logistics fail.
  Mechanism C (hybrid) **CUT during deepening**.
- **BURNED-draw target frame**: clip-relative frame 160 (~5.33s in).
  NOT frame 360 (that's the scream cue).
- **Approach III adopted**: deterministic deck-seeding via
  `pnpm dev:stack burned,...` + natural human play. Approach I
  (multiple natural takes without seeding) retained as fallback.
  Approach II (engineered full sequence) rejected.
- **Resolution**: native 1920×1080 if Mechanism B; for Mechanism A
  if invoked, record at 1920×1080 viewport size for the BOARD
  context only (NOT for phone contexts — see Unit 5.3).
- **Framerate**: 30fps target. Mechanism A records at Playwright
  default; Mechanism B captures native 30fps OR 60fps with
  downsample-in-post via `fps=30` filter (NOT `-r 30`).
- **Audio**: three-layer belt-and-suspenders (capture silent +
  `ffmpeg -an` + `<OffthreadVideo muted />`).
- **Output path**: `public/trailer/gameplay.mp4` per ADR #15.
- **Atomic swap**: write `.new` → `pnpm verify:gameplay-clip` →
  `mv` on PASS.
- **Post-process**: single-pass re-encode (libx264 CRF 18 preset
  slow `-ss AFTER -i` `-frames:v 540` `-an` `-map 0:v:0`); NO
  stream-copy intermediate.
- **First ffmpeg/ffprobe callsite in BURNED**: project security
  convention `execFileSync('ffmpeg', [argv-array])` per Phase 2
  deepening lock. CI must verify ffmpeg ≥5.0 installed.
- **`pnpm verify:gameplay-clip` consumption**: Phase 4 owns the
  script (`scripts/verify-gameplay-clip.ts`); Phase 5 invokes it,
  does NOT re-implement.
- **`scripts/generate-placeholder-gameplay.ts`**: Phase 5 OWNS
  this script per Phase 4 deepening cross-phase dep (Phase 4 Unit
  4.6 sketches the file but designates Phase 5 ownership).
- **Take selection**: insight 050 fluency gate overrides
  property-rubric on ties. Briggsy-eye continuity check is
  load-bearing.
- **Sentinel files**: `briggsy-review-5.4.signoff` (take selection)
  + `briggsy-review-5.6.signoff` (R13 acceptance); wired to
  `pnpm verify:briggsy-sentinels` git-author check per Phase 4
  pattern.
- **Exit doc**: `PHASE-5-EXIT.md` mirrors Phase 0/1/2/3/4 exit-doc
  pattern.

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

- Create: `videos/trailer/sample-eval/gameplay-capture/PHASE-5-PREFLIGHT.md`

**Approach:**

**Step 1 — Path discipline verification.**

```bash
# Confirm Phase 4 sync script exists at expected path
test -f scripts/sync-gameplay-clip.ts && echo "OK sync script"

# Confirm Phase 4 verify script exists
test -f scripts/verify-gameplay-clip.ts && echo "OK verify script"

# Confirm Phase 0 setPublicDir points where ADR #15 expects
rg "setPublicDir" videos/trailer/src/
# Expect: setPublicDir('../../public')
```

If any of these fail, Phase 4 deepening's Unit 4.6 deliverables
have not landed — Phase 5 entry is blocked until they do.

**Step 2 — Insight 035 status verification.**

```bash
# Verify breathe animation lives on ::after, NOT directly on .action
rg --multiline 'breathe.*infinite alternate' src/client/player/SmartActionBox.module.css
# Expect: matches within .action::after { ... animation: breathe ... } block
# AND .drawIntense::after { ... animation: breatheIntense ... } block
# Should NOT match .action { ... animation: breathe ... } directly
```

If the animation is on `.action` (not `.action::after`), insight 035
fix has regressed — Mechanism A is BLOCKED until restored.

**Step 3 — Playtest harness availability.**

```bash
# Verify the multi-context Playwright harness exists
test -d scripts/playtest && echo "OK harness"
test -f scripts/playtest/run-session.ts && echo "OK orchestrator"
test -f scripts/playtest/lib/seat-factory.ts && echo "OK seat factory"
```

If absent, Mechanism A (which extends the harness) is BLOCKED —
fall through to Mechanism B only.

**Step 4 — Dev-action availability.**

```bash
# Verify dev:stack / dev:give exist for Approach III
pnpm dev:stack --help 2>&1 | head -1
pnpm dev:give --help 2>&1 | head -1
test -f scripts/dev-stack-top.ts && echo "OK dev:stack"
test -f scripts/dev-give-card.ts && echo "OK dev:give"
test -f src/server/dev-actions.ts && echo "OK dev-actions handler"
```

If absent, Approach III is BLOCKED — fall through to Approach I
(natural multiple takes, 30s+ windows, BURNED-draw timing variance
accepted).

**Step 5 — Deploy migration status check.**

```bash
# Production URL probe (both candidate URLs)
curl -sI https://burned.pages.dev/board.html | head -1
curl -sI https://burned-cxa.pages.dev/board.html | head -1
curl -sI https://burned.briggsy007.workers.dev/health | head -1
```

Capture which URL responds 200. If neither Pages URL responds OR
the worker URL does not 200 on `/health`:

- **Migration deadline gate**: if today is on or after 2026-05-24,
  Phase 5 unblocks via local-dev fallback unconditionally
  (degrades production credibility; visual quality unaffected).
- **Otherwise**: escalate to Briggsy + Harry to verify Cloudflare
  dashboard state (CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID
  secrets, Worker name binding, Pages domain binding).

**Step 6 — Local-dev fallback LAN setup (if invoked).**

If deploy migration not green AND deadline has passed AND
Mechanism B (real devices) is selected, real phones must reach the
dev host via LAN IP:

```bash
# 1. Get laptop LAN IP
ipconfig | grep "IPv4"   # Windows; record 192.168.x.x

# 2. Start Vite dev with --host so LAN can reach it
pnpm dev -- --host 0.0.0.0    # binds 5173 to all interfaces

# 3. Start Wrangler dev with --ip so LAN can reach the WSS endpoint
pnpm dev:server -- --ip 0.0.0.0    # binds 8787 to all interfaces

# 4. Windows Firewall: allow inbound on 5173 + 8787
# (One-time per machine; via Settings → Network → Firewall)

# 5. Phones navigate to http://192.168.x.x:5173/player.html?room=CODE
# (NOT localhost — phones can't resolve a remote host's localhost)

# 6. Verify board's WebSocket target — board.html may need a query
# param or local config to point WSS at ws://192.168.x.x:8787 rather
# than the production WSS URL.
```

**Cross-platform note:** macOS uses `ifconfig`/`networksetup -getinfo`
for LAN IP discovery; Windows uses `ipconfig`. Firewall config
differs accordingly.

**Setup time:** ~30 min first session, ~5 min subsequent. Document
in the per-session log.

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

**Step 9 — PHASE-5-PREFLIGHT.md authoring.**

Record the verification results:

```md
# Phase 5 Preflight — <YYYY-MM-DD>

## Path discipline
- [ ] scripts/sync-gameplay-clip.ts exists
- [ ] scripts/verify-gameplay-clip.ts exists
- [ ] setPublicDir('../../public') confirmed

## Insight 035 status
- [ ] breathe animation on .action::after (NOT .action directly)

## Playtest harness
- [ ] scripts/playtest/run-session.ts present
- [ ] scripts/playtest/lib/seat-factory.ts present

## Dev actions
- [ ] pnpm dev:stack available
- [ ] pnpm dev:give available
- [ ] src/server/dev-actions.ts present

## Deploy migration
- [ ] Production URL: <chosen> responds 200
- [ ] OR: deadline 2026-05-24 passed → local-dev fallback locked
- [ ] LAN IP recorded: <if Mechanism B + local-dev>

## FFmpeg version
- [ ] ffmpeg >= 5.0 (recorded: <version>)

## Decisions
- Capture mechanism lock: <A | B>
- Production URL: <burned.pages.dev | burned-cxa.pages.dev | local-dev>
- Approach: <III (default, dev:stack) | I (natural multi-take fallback)>
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

- All Step 1-8 checks executed and recorded.
- PHASE-5-PREFLIGHT.md committed at
  `videos/trailer/sample-eval/gameplay-capture/PHASE-5-PREFLIGHT.md`.
- Decisions captured (mechanism, URL, approach).

---

### Unit 5.1 — Capture Mechanism Lock + Spike

- [ ] **Unit 5.1: Capture Mechanism Lock + Spike**

**Goal:** Confirm Mechanism B viability OR escalate to Mechanism A
(via playtest-harness extension). Lock the mechanism + document the
trade-off in `capture-log.md`.

**Requirements:** R13.

**Dependencies:** Unit 5.0 (preflight green).

**Files:**

- Create: `videos/trailer/sample-eval/gameplay-capture/capture-log.md`
  (consolidated mechanism-eval + harness-build + session log per
  consolidation cut SC-6 below)
- (Mechanism A path only): edit `scripts/playtest/run-session.ts`
  + `scripts/playtest/lib/seat-factory.ts` to add `--trailer-capture`
  mode + `recordVideo` context option

**Approach:**

**Step 1 — Mechanism B logistics check.**

Briggsy logistics: can 1-2 friends + 2-hour capture window be
scheduled within Phase 5 timeline? Harry counts (per `user_harry.md`
memory: "OpenClaw wizard, communicates via Discord, been with us
since day 1").

- **YES** (default expectation): Mechanism B locks. Skip to Step 3.
- **NO**: proceed to Step 2 for Mechanism A spike.

**Step 2 — Mechanism A escalation: playtest-harness extension
spike** (ONLY IF Mechanism B impossible).

Mechanism A reuses the playtest harness wholesale + adds `recordVideo`.
The harness already handles:

- Multi-context Playwright orchestration (`seat-factory.ts:144-153`
  spawns iPhone-13 contexts per seat)
- Correct DOM selectors (`seat-factory.ts:160-161`:
  `input[type="text"]` + `button:has-text("Check In")`)
- Server lifecycle (`server-controller.ts` spawns wrangler + vite
  with `PLAYTEST_TOKEN`)
- God-event subscriber for state observation
- Seat-driver agents that play coherent BURNED games

**Spike scope** (60-90 min time-box):

1. Add `recordVideo` option to seat-factory's `newContext`:
   ```ts
   // scripts/playtest/lib/seat-factory.ts (DIRECTIONAL EDIT)
   const context = await browser.newContext({
     ...iPhone13,
     hasTouch: true,
     viewport: { width: viewport.width, height: viewport.height },
     // NEW: optional video recording for trailer capture
     ...(trailerCapture ? {
       recordVideo: {
         dir: `videos/trailer/sample-eval/gameplay-capture/takes/seat-${seatId}/`,
         size: { width: viewport.width, height: viewport.height },
       },
     } : {}),
   })
   ```
   **CRITICAL**: `recordVideo.size` MUST match viewport dimensions
   1:1 — using 1920×1080 on a 390×844 phone-viewport context
   produces letterboxed garbage with black bars.

2. Add `--trailer-capture` flag to `run-session.ts` that:
   - Sets `trailerCapture: true` in seat-factory invocations
   - Adds a board-context recording at native 1920×1080
   - Extends session duration to 45s (enough for setup + 18s
     capture + tail)
   - Reads from `pnpm dev:stack burned,extraction,defuse,...`
     (Approach III) so BURNED lands at predictable deck position

3. Run the spike: `pnpm playtest:run --trailer-capture --seats 3`

4. Verify outputs:
   - WebM file(s) per context — **not MP4** (Playwright records VP8)
   - DramaOverlay BURNED beat visible at full duration in board
     recording (NOT clipped or frozen; GSAP/Framer fidelity
     acceptance criterion)
   - File length matches session length

**Acceptance criteria for Mechanism A spike:**

- (a) WebM file is non-empty and decodes successfully via ffprobe
- (b) Board recording shows DramaOverlay BURNED beat playing at
  full visible duration (~3-4s on screen)
- (c) Per-context recording delivers ≥28fps measured via
  `ffprobe -count_frames -show_entries stream=nb_read_frames` over
  recorded duration
- (d) Memory peak during 45s session stays below 4GB RSS (laptop
  feasibility)

**If (a)-(d) all PASS:** Mechanism A is viable. Lock with the
note that visual quality is VP8 ~1Mbps ceiling (strictly inferior
to Mechanism B's native 1080p H.264).

**If ANY of (a)-(d) FAIL:** Mechanism A is NOT viable. Either
escalate to Mechanism B (despite logistics) OR pause Phase 5 until
logistics resolve.

**Step 3 — Mechanism B spike + scene config.**

Setup:
- TV (or external monitor at 1920×1080 @ 60Hz preferred) running
  board view (production URL OR LAN IP per Unit 5.0)
- 2-3 phones loaded with player view, joined as players
- OBS capturing the TV display at 1920×1080 @ 30fps
- Camera angle: **30° to TV** (NOT dead-on); captures TV screen
  plus 1-2 phones in-hand within the central horizontal band
  (mobile-safe-square per Critical Constraints)

Capture ~45 seconds of natural play. Approach III: deck pre-seeded
via `pnpm dev:stack burned,extraction,defuse,attack,...` so BURNED
lands at draw position N (calibrate N per game-flow rate; ~5-7
draws into the round typically lands at clip-relative frame ~160
after head-trim).

OBS recording settings (per Step 4 scene config):

- Encoder: NVENC HEVC or NVENC H.264 on NVIDIA GPU (CQP 18,
  Look-ahead ON, Max Quality preset). Fallback: x264 CRF 18 medium.
- Resolution: 1920×1080
- FPS: 30 (verify — OBS defaults to 60 on most modern displays;
  must explicitly set 30 in Settings → Video → Common FPS Values)
- Container: **MKV** on OBS 30/31 (then ffmpeg remux to MP4 per
  Unit 5.5 Step 0) OR **Hybrid MP4** on OBS 32+ (crash-safe)
- Audio: ALL audio sources muted at the scene level

**Step 4 — OBS scene config (Mechanism B).**

Scene composition:

- **Source 1**: Display Capture (Primary Monitor / TV) at 1920×1080
- **Source 2 (optional)**: Window Capture for board.html if TV
  mirroring is unstable (fallback only)
- **Audio sources**: all muted (Display Capture audio off,
  Microphone disabled, Game/Window Capture audio off)

**Director's-eye production guidance** (mandatory; per design-lens
findings):

- **Camera angle**: 30° to TV (NOT dead-on). Captures both TV
  screen and 1-2 phones in-hand within frame. Dead-on reads as
  surveillance footage; 30° reads as gameplay-from-the-table.
- **Ambient lighting**: warm lamps (2700-3000K) at side angles.
  AVOID overhead fluorescent (reads as office, not Archer).
  Teal-gelled practical light visible in background is ideal
  (Archer-coded warmth/teal palette).
- **Table dressing**: ONE OR TWO practical objects at table edge
  (water glass, notepad). AVOID game boxes, laptops, or anything
  that reads "software demo." Briefing-room cream/mahogany tones
  preferred.
- **Player posture**: phones held in hand (NOT flat on table).
  Held reads as actively playing; flat reads as watching.
- **Faces**: crop below eyeline OR frame from behind. Full faces
  on screen read less Archer-world (Archer's visual grammar is
  graphic + posed, not documentary). Hands + bodies-from-shoulders
  is the Archer-coded frame.
- **Frame-0 luminance preference**: aim for mid-tone-to-dark first
  frame (lights dimmer, blinds nearly-closed background, phones
  face-down or off until pickup). Phase 4's mandatory
  `S05HeadFadeFromBlack` overlay carries the chapter break either
  way; this is craft optimization.
- **Mobile-safe-square awareness**: TV screen center within
  x=[420, 1500] band of 1920×1080 frame; BURNED-draw beat phone +
  TV both in this band.
- **Lower-40px ticker reservation**: bottom 40px clean (table edge
  or subtle gradient; no critical content).
- **Iris-anchor at frames 480-540**: primary reaction subject
  center-frame within ±400px of (960, 540). Tell players to
  "freeze for a beat" after BURNED-draw reaction so camera settles
  before iris.

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

| Window | Relative frames | Duration | Capture direction |
|--------|-----------------|----------|-------------------|
| **W1 ESTABLISHING** | 0-90 | 3s | Wide enough to read multiplayer; board chrome (CASE BANNER + DiscardFan) clearly visible; phones held by 1-2 players in foreground; first frame mid-tone-to-dark preferred. Players gameplay-state: active round mid-game; ≥2 cards in DiscardFan; 2-4 players seated. |
| **W2 BUILDUP** | 90-160 | 2.3s | Continue active play; visible card play (player tap → board animation lands); rising tension toward BURNED moment. Approach III: Briggsy directs play tempo so the active player about to draw at frame ~160 is positioned to be visible. |
| **W3 BURNED DRAW (CRITICAL)** | 160-280 | 4s | **The trailer's emotional anchor.** Player draws BURNED card; phone screen shows BURNED card face; board shows DramaOverlay BURNED beat playing. BOTH visible in frame. Mobile-safe-square: phone + board within x=[420, 1500] central band. |
| **W4 DASH VO INTIMACY** | 240-300 | 2s | Overlaps W3 partially. Camera should favor closer-on-phone OR closer-on-reaction during this window — Dash VO is a confidential aside, audio register intimate. Player visibly registers what happened (raised eyebrow, slight lean). |
| **W5 SCREAM + REACTION** | 360-480 | 4s | If R5=kept, scream lands at 360 layered over visible aftermath. Genuine reaction body language: lean-in, gesture, cover-mouth. Real laughter, real "no!", real shock. (If R5=cut, this window is silent reaction continuation.) |
| **W6 IRIS TARGET** | 480-540 | 2s | Settle the frame — primary subject center, minimal motion. Camera holds steady. Iris-wipe begins at 495. Players "freeze for a beat" per director's-eye direction. |

Total: 18 seconds. Six capture-direction windows; one continuous
take. Shot transitions are NOT cut points — they are guidance for
where the camera operator's attention should be at each moment.

**Step 3 — Approach III deck choreography.**

Phase 5 default: deterministic deck-seeding via `pnpm dev:stack`
+ natural human play.

**Why Approach III** (replacing Approach I as default):

- Approach I (multiple natural takes, no seeding) struggles with
  30-second capture windows. BURNED draws naturally after 60-300s
  in real play; landing the draw within trim-rescuable distance
  of clip-relative frame 160 across 3-5 takes is statistically
  unreliable. Phase 5 budget collapses to setup-burn.
- Approach III: seed the deck so BURNED is the Nth card drawn
  (calibrate N to ~5-7 draws-into-the-round, which lands at
  clip-relative frame ~160 after head-trim). Real human play +
  reactions happen on top. The deck order is INVISIBLE to viewers.
  Reactions are UNSCRIPTED.
- Approach II (engineered full sequence) still rejected — would
  require scripting all card plays + would read as artificial in
  the action sequencing, not just the deck order.

**Concrete invocation** (calibrate exact card sequence at capture
time):

```bash
# Pre-game seed: BURNED at position 7 from top of deck (calibrate
# per game-flow rate; ~5-7 draws-in lands at relative frame ~160)
pnpm dev:stack defuse,extraction,attack,skip,future-vision,direct-order,burned,...

# Then start the game and play naturally
# BURNED will draw at turn ~5-7 depending on Skip/Attack usage
```

**Calibration**: first capture session, run 2-3 calibration plays
with stop-watch on first 10 turns; measure average seconds-to-draw
when seeding at positions 5, 6, 7, 8. Pick the position that
produces a draw closest to 5.33s into a CAPTURE window (starting
from "Cleared Hot" → first card animation).

**Approach I fallback** (if Approach III dev-actions are unavailable
or undesired):

- Multiple natural takes; capture 60+ seconds per take (NOT 30);
  apply trim-viability filter at take-selection.
- Reject takes where raw BURNED frame < 160 (head-trim cannot
  pad backward).
- Reject takes where raw total length < (raw_BURNED_frame + 380)
  (Shot 5 reaction beat needs 12.7s post-draw content).
- Practical implication: each take should be 60-90 seconds of raw
  capture to allow head-trim freedom; ~10 takes per session needed
  to land 1-2 with BURNED in the right position.

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

**Approach (Mechanism A — playtest-harness extension):**

The playtest harness already provides 95% of what Mechanism A
needs. Phase 5 adds the missing 5%: video recording + trailer-mode
flag.

**Step A.1 — Audit existing harness surface.**

Required reading before editing:

- `scripts/playtest/run-session.ts` (orchestrator)
- `scripts/playtest/lib/seat-factory.ts` (context creation per seat)
- `scripts/playtest/lib/server-controller.ts` (wrangler + vite
  lifecycle; insight 026 stdio drain pattern applies)
- `scripts/playtest/lib/orchestrator.ts` (game-flow coordination)

**Step A.2 — Add `--trailer-capture` mode flag.**

CLI argv via `node:util.parseArgs` strict mode (per Phase 2
deepening lock):

```ts
// scripts/playtest/run-session.ts (DIRECTIONAL EDIT)
const args = parseArgs({
  options: {
    'trailer-capture': { type: 'boolean', default: false },
    'seats':           { type: 'string',  default: '3' },
    // existing args preserved
  },
})

const trailerCapture = args.values['trailer-capture'] === true
```

**Step A.3 — Add `recordVideo` to context creation.**

```ts
// scripts/playtest/lib/seat-factory.ts (DIRECTIONAL EDIT)
const context = await browser.newContext({
  ...iPhone13,
  hasTouch: true,
  viewport: { width: viewport.width, height: viewport.height },
  // NEW per Phase 5 Unit 5.3 — trailer-mode video recording
  ...(trailerCapture ? {
    recordVideo: {
      // CRITICAL: size MUST match viewport 1:1 or letterboxing occurs
      dir: `videos/trailer/sample-eval/gameplay-capture/takes/seat-${seatId}/`,
      size: { width: viewport.width, height: viewport.height },
    },
  } : {}),
})
```

**Step A.4 — Add board-context recording at 1920×1080.**

The board-view-launcher (`scripts/playtest/lib/board-view-launcher.ts`
per insight 032) doesn't currently record video. Add similar
`recordVideo` option to its newContext call, with `viewport: {
width: 1920, height: 1080 }` matching record size.

**Step A.5 — Approach III deck seeding integration.**

Before "Start Game" click in orchestrator, send `dev-stack-deck`
via the existing dev-action WSS message:

```ts
// scripts/playtest/lib/orchestrator.ts (DIRECTIONAL EDIT)
if (trailerCapture) {
  await godClient.send({
    type: 'dev-stack-deck',
    cards: ['defuse', 'extraction', 'attack', 'skip',
            'future-vision', 'direct-order', 'burned', /* ... */],
  })
  // Wait for ack
  await godClient.waitForAck('dev-stack-deck')
}
```

**Step A.6 — Run trailer-capture sessions.**

```bash
# 3 seats, trailer-mode, 45s window
pnpm playtest:run --trailer-capture --seats 3 --duration 45
```

Outputs land at `videos/trailer/sample-eval/gameplay-capture/takes/
seat-{1,2,3}/<uuid>.webm` + `board/<uuid>.webm`.

**Approach (Mechanism B — OBS + real devices):**

**Step B.1 — OBS pre-flight check** (per session).

Open OBS Settings → Video → Common FPS Values. Confirm **30**.
(OBS often defaults to 60.) Settings → Output → Container:
**MKV** (or Hybrid MP4 on OBS 32+). Encoder: NVENC HEVC if
available, else x264 CRF 18 medium.

Verify Display Capture preview shows the actual TV content (NOT a
black square — HDCP-protected outputs cause black-out; if so,
switch to Window Capture for the board.html browser window).

**Step B.2 — Production-design pre-flight** (per session).

Run through the director's-eye checklist from Unit 5.1 Step 4
before recording:

- Camera angle 30° to TV? Y/N
- Warm ambient lighting (no overhead fluorescent)? Y/N
- Table dressing (1-2 practical objects, no game boxes)? Y/N
- Phone-holding posture (phones held, not flat)? Y/N
- Faces cropped at eyeline or behind? Y/N
- Frame-0 mid-tone-to-dark preference set up? Y/N
- Mobile-safe-square: TV center within x=[420, 1500]? Y/N
- Lower 40px clean (no critical content)? Y/N

If ANY answer is N, fix before recording.

**Step B.3 — Approach III deck seeding for Mechanism B.**

In a separate terminal on the dev host:

```bash
# Seed deck with BURNED at position 7 (or calibrated N from Unit 5.2)
pnpm dev:stack defuse,extraction,attack,skip,future-vision,direct-order,burned,...
```

Verify the dev-action acknowledged (server log shows
`dev-stack-deck ok`).

**Step B.4 — Capture session execution.**

1. Host clicks OBS "Start Recording"
2. Host clicks "Cleared Hot" on board (the real selector per
   `Lobby.tsx:104-110` — NOT "Start")
3. Players + Briggsy play through ~45 seconds; BURNED draws at
   the seeded position around 5-7 turns in
4. Players freeze briefly after BURNED-draw reaction (for iris
   anchor)
5. Host clicks OBS "Stop Recording" ~5 seconds after BURNED-draw
   reaction settles
6. Take saved to `videos/trailer/sample-eval/gameplay-capture/
   takes/take-NN.mkv`

**Step B.5 — MKV → MP4 remux (OBS 30/31 only; skip on 32+ Hybrid MP4).**

```bash
# Lossless remux (no re-encode; safe with -c copy because container
# both has H.264 already)
ffmpeg -i takes/take-01.mkv -c copy takes/take-01.mp4
```

**Step B.6 — Placeholder script ownership** (both mechanisms; pre-Phase-5-ship).

Phase 5 OWNS `scripts/generate-placeholder-gameplay.ts` per Phase 4
deepening cross-phase dep. The script writes an 18-second silent
MP4 looping a placeholder image (typically `htp-fullpage.png` or a
black frame) to `public/trailer/gameplay-placeholder.mp4`. Phase 4
standalone-render consumes this before Phase 5 ships the real
clip.

```ts
// scripts/generate-placeholder-gameplay.ts (DIRECTIONAL; Phase 5 owns)
// SAFE: execFileSync with argv arrays (project security convention)
import { execFileSync } from 'node:child_process'

const SOURCE_IMG = 'public/trailer/htp-fullpage.png'  // OR 'public/trailer/placeholder-black.png'
const OUTPUT     = 'public/trailer/gameplay-placeholder.mp4'

execFileSync('ffmpeg', [
  '-y',
  '-loop', '1',
  '-i', SOURCE_IMG,
  '-c:v', 'libx264',
  '-t', '18',
  '-pix_fmt', 'yuv420p',
  // NOTE: Phase 4's pre-deepening sketch used force_original_aspect_ratio=cover,
  // which is INVALID ffmpeg syntax (valid values: disable|decrease|increase).
  // Using `increase` here matches the Unit 5.5 encode pattern.
  '-vf', 'scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,setsar=1',
  '-r', '30',
  '-an',
  '-map', '0:v:0',
  '-movflags', '+faststart',
  OUTPUT,
])
console.log(`[generate-placeholder-gameplay] wrote ${OUTPUT}`)
```

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

**Step 1 — Session budget allocation.**

Per scope-guardian + adversarial findings: first session is
setup-heavy. Budget:

| Session | Purpose | Expected output |
|---------|---------|-----------------|
| 1 | Setup pass — OBS config verified, friends know how to play, calibration of Approach III seed position N | 0-2 usable takes |
| 2 | First real capture session | 3-5 takes, hopefully 1-2 ship-able |
| 3 | Second capture session | 3-5 takes |
| 4 | Contingency / re-shoot | 0-3 takes |

Total: 4 sessions × ~2 hours. Adjust based on actual yield.

**Step 2 — Per-session execution.**

Pre-flight (each session):

- Production URL + WSS health probe (or local-dev verified)
- R5 outcome confirmed from PHASE-0-EXIT.md (so take selection
  knows whether scream cue alignment matters)
- OBS recording profile verified (FPS=30, encoder, container)
- Director's-eye production checklist run-through
- Approach III deck seed prepared

Capture loop:

1. Seed deck via `pnpm dev:stack ...` (Approach III)
2. Players join via QR/URL hash (Mechanism B) or via harness
   (Mechanism A)
3. Host clicks OBS Start Recording → "Cleared Hot" on board
4. ~45-60 seconds of natural play; BURNED draws at the seeded
   position
5. Brief freeze after BURNED-draw reaction settles
6. Host stops recording
7. Take saved + named (`take-01.mp4`, `take-02.mp4`, ...)
8. Re-seed deck for next take

**Step 3 — Per-take evaluation rubric (CALIBRATION FLOOR).**

For each take, evaluate against shot windows + property criteria:

| Window | Criterion | ✓/✗/partial | Notes |
|--------|-----------|--------------|-------|
| W1 (establishing) | Multiplayer dynamic visible; board chrome readable | | |
| W2 (buildup) | Visible card-play action; rising tension | | |
| W3 (BURNED draw) | Card visible on phone; DramaOverlay visible on board | | |
| W4 (Dash VO intimacy) | Close enough to read reaction face / phone | | |
| W5 (scream + reaction) | Genuine body-language reaction (lean, gesture, cover-mouth) | | |
| W6 (iris target) | Center-frame focal point; minimal motion | | |

**Take scoring**:
- 6/6 = ideal
- 5/6 = ship-able
- 4/6 = marginal (recapture preferred)
- < 4/6 = reject

**NOTE**: AUDIO IS STRIPPED IN UNIT 5.5. Do NOT rate on audio
quality. Score visual content only.

**Step 4 — Fluency gate (insight 050; LOAD-BEARING).**

Per `docs/insights/050-agent-verification-misses-perceptual-continuities.md`:
property-style checklists pass takes that read as DEAD on
perceptual fluency. The rubric in Step 3 is a CALIBRATION FLOOR —
takes below 5/6 are rejected; takes at 5/6 or 6/6 proceed to the
fluency gate.

**Fluency gate** (Briggsy-eye only; CANNOT be agent-scored):

Briggsy watches each top-2 candidate take FULL-SPEED, ONCE, with
sound (Phase 2 Dash VO + Phase 1 music bed dubbed in temp if
available; otherwise silent). Open-text question:

> *"Does this take feel like a real playable game in your hands?
> Does watching it produce a real reaction — laugh, lean-in,
> 'oh shit', interest?"*

Optional fluency signals (not a checklist; just things Briggsy may
notice on first watch):

- Does at least one player look up at TV during the DramaOverlay
  animation?
- Is there at least one genuine physical reaction (lean, gesture,
  cover-mouth) during BURNED draw?
- Lighting consistent warm-tone throughout (no auto-exposure shifts)?
- Phone-holding posture maintained (no mid-take put-down)?
- DramaOverlay BURNED beat visible at full duration (not clipped
  by another player's action or camera shift)?

A take scoring 6/6 on property rubric but NO on fluency = reject
(or recapture).

A take scoring 5/6 with strong fluency may BEAT a 6/6 with weak
fluency.

**Step 5 — Trim-viability filter.**

For each candidate take, identify the BURNED-draw raw-frame
position via ffprobe + visual scrub:

```bash
# Open the take and scrub to where BURNED card draws; record raw frame
ffmpeg -i takes/take-NN.mp4 -vf scale=480:270 -an out/take-NN-preview.mp4
# (Or just open the .mkv/.mp4 in any player and note the timecode)
```

Compute trim plan:
- `BURNED_DRAW_RAW_FRAME` = N (per visual scrub)
- `HEAD_TRIM_FRAMES` = BURNED_DRAW_RAW_FRAME - 160
- `TAIL_TRIM_TARGET_FRAME` = HEAD_TRIM_FRAMES + 540

**Reject** the take if:
- `HEAD_TRIM_FRAMES < 0`: BURNED drew before frame 160; head-trim
  cannot pad backward.
- `TAIL_TRIM_TARGET_FRAME > TOTAL_RAW_FRAMES`: not enough
  post-draw content for Shot 5 + iris.

**Step 6 — Selected take.**

Pick the take that:
1. Scores ≥ 5/6 on property rubric
2. Passes fluency gate (Briggsy YES)
3. Passes trim-viability filter
4. BURNED-draw lands closest to the head-trim sweet spot (smaller
   head trim = more establishing time visible)
5. R5 outcome alignment: if R5=kept, scream cue at relative frame
   360 lands on visibly dramatic reaction window (not flat).

Tiebreaker hierarchy (per adversarial scenario 17):
- (a) If both takes score equal: BURNED-draw beat quality is
  highest weight
- (b) If tied: Shot 5 reaction quality (iris-wipe context)
- (c) If tied: Briggsy's gut on full-speed first viewing (fluency)
- (d) If unresolved after 3 minutes of review: pick the take seen
  FIRST (fatigue corrupts second viewing more)

**Step 7 — Take selection documentation.**

Append to `capture-log.md`:

```md
## Take selection (Unit 5.4)

### Session log
- Session 1 (<YYYY-MM-DD>): setup; <N> calibration takes
- Session 2 (<YYYY-MM-DD>): <N> takes captured
- ... (continues)

### Per-take rubric scores
| Take | Date | W1 | W2 | W3 | W4 | W5 | W6 | Score | BURNED raw frame | Trim viable | Fluency | Notes |
|------|------|----|----|----|----|----|----|-------|------------------|-------------|---------|-------|
| 01 | ... | ✓ | ✓ | ✓ | partial | ✗ | ✓ | 5/6 | 245 | ✓ | YES | best Shot 4 |
| 02 | ... | ✓ | ✓ | ✓ | ✓ | ✓ | partial | 5/6 | 89 | ✗ (negative head trim) | n/a | rejected — BURNED too early |
| 06 | ... | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 6/6 | 478 | ✓ | YES | SELECTED |

### Selected: take-06.mp4
- BURNED-draw raw frame: 478
- Head trim: 478 - 160 = 318 frames (10.6s)
- Trimmed clip target: frames 318 to 858 (= 540 frames @ 30fps)
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
# this author check
touch videos/trailer/sample-eval/gameplay-capture/briggsy-review-5.4.signoff
git add videos/trailer/sample-eval/gameplay-capture/briggsy-review-5.4.signoff
git commit -m "phase-5: briggsy-review-5.4.signoff (take-06 selected)"
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

**Step 1 — Single-pass frame-accurate re-encode.**

Per framework-docs + best-practices findings: the pre-deepening
two-stage stream-copy-then-re-encode pattern is WRONG. `ffmpeg -ss
BEFORE -i + -c copy` drifts to nearest keyframe (up to 8s on
default OBS GOP). Single-pass re-encode with `-ss AFTER -i` +
`-frames:v 540` is frame-precise.

```ts
// scripts/post-process-gameplay.ts (DIRECTIONAL)
// SAFE: execFileSync with argv arrays (project security convention)
import { execFileSync } from 'node:child_process'
import { renameSync } from 'node:fs'

// Inputs from take-selection.md / capture-log.md:
// SOURCE = videos/trailer/sample-eval/gameplay-capture/gameplay-raw.<ext>
// HEAD_TRIM_FRAMES = (BURNED_DRAW_RAW_FRAME - 160)  ← example: 478 - 160 = 318
const SOURCE = 'videos/trailer/sample-eval/gameplay-capture/gameplay-raw.mp4'
const STAGING = 'public/trailer/gameplay.mp4.new'
const FINAL = 'public/trailer/gameplay.mp4'

const HEAD_TRIM_FRAMES = 318  // EXAMPLE — substitute from capture-log.md per take
const HEAD_TRIM_SECONDS = HEAD_TRIM_FRAMES / 30

// Single-pass re-encode. `-ss AFTER -i` is frame-accurate
// (decode-side seek). `-frames:v 540` is count-precise (NOT `-t`
// which is wallclock-based and rounds). `fps=30` filter (NOT `-r 30`)
// properly drops/duplicates frames if source is 60fps. `-map 0:v:0`
// + `-an` strips audio.
execFileSync('ffmpeg', [
  '-y',
  '-i', SOURCE,
  '-ss', HEAD_TRIM_SECONDS.toString(),
  '-frames:v', '540',
  '-vf', 'fps=30,scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,setsar=1',
  '-c:v', 'libx264',
  '-crf', '18',
  '-preset', 'slow',
  '-pix_fmt', 'yuv420p',
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
console.log(`OK encoded ${STAGING}`)
```

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

**Step 3 — Atomic swap.**

```ts
// Continued in scripts/post-process-gameplay.ts
// Atomic rename — on Windows, fs.renameSync over open file throws EBUSY.
// Document the "close Remotion studio before swap" prerequisite.
try {
  renameSync(STAGING, FINAL)
  console.log(`OK atomic swap ${STAGING} → ${FINAL}`)
} catch (err) {
  console.error('FAIL atomic swap — is Remotion studio holding a handle?')
  console.error('Close pnpm studio + retry, or rm the destination first.')
  throw err
}
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

**Step 3 — R13 acceptance via fluency gate** (insight 050;
LOAD-BEARING).

Per brainstorm Success Criteria: *"the closing gameplay dissolve
[is recognized as] a real playable game by an engineering-peer
viewer."*

Briggsy watches the full S05 + S06 segment ONCE, full-speed,
WITHOUT a property checklist. Single open-text question:

> *"Does watching this feel like watching real friends play BURNED?"*

If YES: R13 PASS.

If NO: surface specifically what didn't land (not which property
failed). Routes:
- "Reaction reads as forced" → recapture session
- "Game state looks staged" → recapture with different Approach III
  seed position
- "DramaOverlay missed the moment" → check post-process trim math
- "Iris-wipe edge competes with motion" → recapture Shot 6 with
  tighter freeze
- "S05 head-fade reads as flash" → re-pick a darker-frame-0 take

**Step 4 — Sentinel + documentation.**

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
# Briggsy commits the signoff sentinel
touch videos/trailer/sample-eval/gameplay-capture/briggsy-review-5.6.signoff
git add videos/trailer/sample-eval/gameplay-capture/briggsy-review-5.6.signoff
git commit -m "phase-5: briggsy-review-5.6.signoff (R13 accepted)"
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
  Unit 5.4 take selection or recapture.
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
  `<OffthreadVideo>`; integration validated by Unit 5.6 re-render.
  `pnpm verify:gameplay-clip` ffprobe gate catches contract drift.
- **Unchanged invariants:** BURNED game code untouched. Phone
  bundle budget unaffected. Trailer remains isolated.

---

## Risks & Dependencies

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Deploy migration drags past Phase 5 deadline (2026-05-24) | Medium (5 single-line changes uncommitted) | Medium | Local-dev fallback documented + concrete LAN setup checklist in Unit 5.0; trailer URL = LAN IP; visual quality unaffected. |
| Mechanism B logistics fail (no friends available) | Medium | Medium | Mechanism A escalation via playtest-harness extension. Visual quality trade-off documented (VP8 ~1Mbps ceiling) in capture-log.md. |
| Mechanism A spike fails GSAP/Framer fidelity acceptance | Medium | High (forces back to B) | Spike at Unit 5.1 Step A.6 explicitly verifies DramaOverlay BURNED beat at full duration. If fail, B logistics escalate even at higher cost. |
| BURNED-draw timing variance across takes with Approach I fallback | High (without Approach III) | Medium | Approach III default — deterministic deck-seeding via `pnpm dev:stack` collapses variance. Fall back to Approach I only if dev-actions unavailable. |
| Real-device capture has phone bezel / hand obstruction over critical chrome | Medium | Low | Director's-eye production guidance (camera 30°, mobile-safe-square awareness); reshoot with adjusted framing if needed. |
| Mic accidentally captures player voice | Low | Low | Three-layer audio defense: capture silent + `ffmpeg -an` + `<OffthreadVideo muted />`. `verify:gameplay-clip` audio-stream-absence gate. |
| Captured clip reads as less alive than Phase 4 placeholder | Low | Medium | Take selection fluency gate (insight 050) override property rubric on ties; recapture allowed across sessions. |
| OBS recording settings produce file that won't play in Remotion | Low | Medium | Unit 5.5 re-encode to known-good H.264 yuv420p MP4; Phase 4's `verify-gameplay-clip` ffprobe gate validates Remotion-compatibility. |
| Re-render time after gameplay swap blocks Phase 6 | Low | Low | Re-render is ~6-9 minutes; absorb in Phase 6 schedule. |
| FFmpeg trim introduces frame-count drift (off-by-N) | Low (single-pass re-encode + `-frames:v 540`) | High | `verify:gameplay-clip` asserts exactly 540 frames; gate failure prevents swap. |
| Windows EBUSY on atomic rename (Remotion studio holding handle) | Medium (Briggsy is Windows-primary) | Low | Documented in Unit 5.5 Step 3; close studio before swap. |
| Phase 4 S05 scene file changed during Phase 5 idle, breaks integration | Low | Low | Re-render in Unit 5.6 catches breakage; Phase 4 contract pinned by `verify:gameplay-clip` gate. |
| Insight 035 regresses (someone moves breathe animation back onto `.action`) | Very Low | High | Unit 5.0 preflight Step 2 explicitly verifies; harness CI tests would catch it before Phase 5 entry. |
| Pre-flight deploy migration verification fails due to wrong-URL guess | Medium | Low | Probe BOTH candidate URLs (`burned.pages.dev` AND `burned-cxa.pages.dev`); record which responds. |
| First-frame YAVG > 76.5 (bright frame 0) | Medium (depends on take) | Low (cosmetic) | Phase 4's mandatory `S05HeadFadeFromBlack` overlay carries the chapter break regardless. Optimization opportunity, not correctness gate. |
| Iris-wipe collapses on empty frame center | Medium (without direction) | Medium | Iris-frame composition test at take selection (frame 510 pause). Reject takes that fail. |

---

## Open Questions

### Resolved During Planning (deepening pass)

- **Capture mechanism**: Mechanism B locked default per
  water-beads + visual-quality ceiling. Mechanism A as escalation
  via playtest-harness extension. Mechanism C cut entirely.
- **BURNED-draw target frame**: clip-relative frame **160** (NOT
  360). Scream cue at frame 360 is a separate reaction beat.
- **Trim ownership**: Phase 5 trims; Phase 4 consumes pre-trimmed.
  No `gameplay-markers.json`.
- **Approach III adopted**: deterministic deck-seeding via
  `pnpm dev:stack` is the default. Approach I (natural multi-take)
  is fallback only.
- **Audio policy**: 3-layer belt-and-suspenders (capture silent +
  `ffmpeg -an` + `<OffthreadVideo muted />`).
- **Output path**: `public/trailer/gameplay.mp4` per ADR #15.
  Sample-eval at `videos/trailer/sample-eval/gameplay-capture/`.
- **Atomic swap**: write `.new` → `pnpm verify:gameplay-clip` →
  `mv` on PASS.
- **Post-process**: single-pass re-encode (libx264 CRF 18 preset
  slow); NO stream-copy intermediate; `-ss AFTER -i` for frame
  accuracy; `fps=30` filter (NOT `-r 30`); `-map 0:v:0 -an` audio
  strip.
- **`verify:gameplay-clip` consumption**: Phase 4 owns the script;
  Phase 5 invokes via `pnpm verify:gameplay-clip` — does NOT
  re-implement.
- **`scripts/generate-placeholder-gameplay.ts` ownership**: Phase 5
  owns. Phase 4 sketches it but designates Phase 5 ownership per
  Phase 4 deepening cross-phase dep.
- **Take selection**: insight 050 fluency gate overrides property
  rubric on ties; Briggsy-eye is load-bearing.
- **Sentinel files**: `briggsy-review-5.4.signoff` + `briggsy-review-5.6.signoff`
  per Phase 4 git-author pattern.
- **Exit document**: `PHASE-5-EXIT.md` (see template below).
- **Production URL**: probe both `burned.pages.dev` (Pages project
  name = `burned`) and `burned-cxa.pages.dev` (likely canary) at
  Unit 5.0 preflight; default to whichever responds 200.
- **Final format**: 1920×1080 H.264 CRF 18 30fps no-audio MP4 with
  faststart.

### Deferred to Implementation

- **Specific URL** (production migration target): `BURNED_URL` env
  var configures; default determined at Unit 5.0 preflight.
- **Approach III seed-position N calibration**: depends on
  game-flow rate per capture session; calibrate at Unit 5.4
  Session 1.
- **R5 outcome alignment specifics**: read from `PHASE-0-EXIT.md`
  at Unit 5.4 pre-flight; if scream cut, take-selection weighs
  BURNED-draw alignment as primary; if scream kept, also weighs
  visible reaction at relative frame 360.
- **Real-device friend recruitment scheduling** (Mechanism B):
  Briggsy / Harry / others — scheduled per session availability.
- **OBS Hybrid MP4 vs MKV+remux**: depends on installed OBS
  version (30/31 → MKV; 32+ → Hybrid MP4); verified at Unit 5.0
  preflight.
- **NVENC vs x264 encoder choice**: depends on Briggsy's GPU;
  verified at Unit 5.0 preflight.
- **Local-dev LAN setup specifics** (firewall config, WSS scheme
  for board client): verified at Unit 5.0 preflight if fallback
  invoked.

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

### PHASE-5-EXIT.md template

Phase 5 ships a single exit document Phase 6 reads:

```md
# Phase 5 Exit — <YYYY-MM-DD>

## Capture mechanism
- Locked: <A | B>
- Production URL used: <burned.pages.dev | burned-cxa.pages.dev | local-dev LAN>
- Approach: <III | I fallback>
- Friends recruited: <names if Mechanism B>
- Sessions: <count> (setup: <N>, capture: <N>, contingency: <N>)

## Selected take
- Filename: take-NN.<ext>
- BURNED-draw raw frame: <N>
- Head-trim frames: <N>
- Output clip-relative BURNED-draw frame: 160

## Output
- Path: public/trailer/gameplay.mp4
- Frames: 540 (verified)
- Dimensions: 1920×1080
- Framerate: 30/1
- Audio: stripped (no streams)
- First-frame YAVG: <value>
  - Head-fade engagement: <cosmetic | load-bearing>
- File size: <N> MB
- SHA256: <hash if recorded>

## R5 alignment
- Scream cue outcome (from PHASE-0-EXIT.md): <kept | cut>
- If kept: scream cue at scene-relative frame 360 lands on:
  <description of visible reaction at that frame>

## Briggsy sentinels
- briggsy-review-5.4.signoff: committed by <git-author>
- briggsy-review-5.6.signoff: committed by <git-author>

## Phase 6 read-points
- Phase 6 acceptance reads: out/trailer-scene-build.mp4 (re-rendered
  in Unit 5.6 with real gameplay clip)
- Phase 6 may re-render with production encoding settings (per
  Phase 4 deepening amendment TIER 2 #8: re-render is NOT precluded
  by Phase 5 ship).
- Phase 6 mobile-crop audit: BURNED-draw beat verified within
  x=[420, 1500] safe-square band.

## Operational notes for Phase 6
- gameplay-clip-source.ts: pointing at trailer/gameplay.mp4 (NOT placeholder)
- Run `pnpm sync-gameplay && pnpm render` if re-rendering from scratch
- If Phase 6 needs to roll back to placeholder: `rm public/trailer/gameplay.mp4`
  + `pnpm sync-gameplay` flips constant back to placeholder
```

### Cross-phase amendments surfaced by Phase 5 deepening

Items flagged for upstream/lateral plan amendments. These do NOT
land in this commit but are surfaced for the relevant plan's next
deepening or review pass:

**Phase 1 follow-up amendments** (Phase 1 deepening's obsolete
content):
- **Phase 1 Step 6 line 803-808**: retire the
  `gameplay-raw.mp4 + gameplay-markers.json` contract; replace
  with: "Phase 5 ships pre-trimmed `public/trailer/gameplay.mp4`
  (540 frames, 18.0s @ 30fps, audio-stripped). The BURNED-draw
  moment lands at clip-relative frame 160. Phase 4 consumes via
  `<OffthreadVideo src={staticFile(...)} muted />` with no
  trim props (NOT `startFrom`/`endAt`)."
- **Phase 1 Step 6 line 815**: clarify cue table — "BURNED card
  draws on capture at scene-relative frame 160 (CLIP VISUAL);
  Dash VO scream interjects at scene-relative frame 360 (200
  frames / 6.67s after draw — Sterling-CODED delayed reaction,
  NOT simultaneous beat)."
- **Phase 1 System-Wide Impact lines 2453-2467**: update to match
  the pre-trimmed contract; remove `gameplay-markers.json`
  references.

**Phase 4 follow-up amendments**:
- **Phase 4 Unit 4.6 Step 2 line 2708** placeholder script: invalid
  ffmpeg filter syntax `force_original_aspect_ratio=cover` (valid
  values are `disable|decrease|increase`). Should be `increase`.
  Will crash placeholder generation on first invocation. Phase 5's
  Unit 5.3 Step B.6 placeholder script (owned by Phase 5) uses the
  correct `increase` syntax; Phase 4's sketch needs the same fix.

**Roadmap follow-up amendments**:
- **Roadmap §3 row 5 (line 110)**: path drift — currently reads
  `videos/trailer/assets/gameplay.mp4`; should be
  `public/trailer/gameplay.mp4` per ADR #15.

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

**Playwright references** (Mechanism A; if invoked):
- Multi-context: https://playwright.dev/docs/api/class-browsercontext
- Video recording (WebM/VP8 default): https://playwright.dev/docs/videos
- Record-video-size + viewport interplay: https://playwright.dev/docs/api/class-browser#browser-new-context

**OBS references** (Mechanism B):
- OBS Studio: https://obsproject.com/
- OBS recording settings: https://obsproject.com/wiki/Settings-Guide
- NVENC OBS guide: https://www.nvidia.com/en-us/geforce/guides/broadcasting-guide/
- Hybrid MP4 (OBS 32+): https://obsproject.com/forum/threads/obs-32-0-released.179800/

**FFmpeg references:**
- Stream copy + seeking (NOT used in Phase 5 final encode; documented for completeness): https://ffmpeg.org/ffmpeg.html#Stream-copy + https://trac.ffmpeg.org/wiki/Seeking
- Scale + crop filters: https://ffmpeg.org/ffmpeg-filters.html#scale-1
- `fps` filter (proper frame decimation): https://ffmpeg.org/ffmpeg-filters.html#fps
- `signalstats` filter (luminance probe): https://ffmpeg.org/ffmpeg-filters.html#signalstats
- CRF + preset H.264: https://trac.ffmpeg.org/wiki/Encode/H.264
- Stream selection (`-map`): https://ffmpeg.org/ffmpeg.html#Stream-selection

**Cloudflare references:**
- Pages clean URLs: https://developers.cloudflare.com/pages/configuration/serving-pages/
- Wrangler Workers deploy: https://developers.cloudflare.com/workers/wrangler/

**Trailer-editing references** (take selection + cut count):
- Derek Lieu trailer editing: https://www.derek-lieu.com/editing
- "What Game Trailers Can Learn From Film History": https://www.derek-lieu.com/blog/2023/1/7/what-game-trailers-can-learn-from-film-history

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
