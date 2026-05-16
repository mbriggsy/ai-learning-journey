---
title: "Origin Trailer — Phase 5: Gameplay Capture Harness + Capture"
type: feat
phase: 5
parent: docs/plans/origin-trailer/roadmap.md
origin: docs/ideation/2026-05-15-origin-trailer-brainstorm.md
created: 2026-05-16
deepened: pending
reviewed: pending
status: active
---

# Phase 5 — Gameplay Capture Harness + Capture

## Overview

Phase 5 produces the **live gameplay footage** for S05's closer:
real BURNED multiplayer gameplay captured in a way that visually
sells "BURNED is shipped and playable" within ~18 seconds of screen
time. Output: `videos/trailer/public/gameplay.mp4` consumed by Phase
4's S05 scene via `<OffthreadVideo>`.

This is the trailer's **only phase that requires running BURNED end-
to-end as a real product** — Phase 4 composes assets but doesn't
boot a game. Phase 5 boots a game, runs through a curated game-flow
sequence, captures it, and post-processes for trailer integration.

Phase 5 produces:

- `videos/trailer/public/gameplay.mp4` — the captured clip,
  1920×1080 @ 30fps, ~18 seconds, music-bed-only audio (any in-game
  audio either stripped or never captured per brainstorm Scope
  Boundaries)
- `videos/trailer/scripts/capture-gameplay.ts` — the capture harness
  (Playwright-based or OBS-based depending on Unit 5.1 mechanism
  decision)
- `videos/trailer/scripts/shot-list.ts` — the typed shot-list
  definition (game-phase sequence to capture)
- `videos/trailer/sample-eval/gameplay-capture/` — capture proofs,
  per-shot verification, post-processing log

Phase 5 exits when:
1. `public/gameplay.mp4` exists at expected dimensions + duration.
2. Briggsy signs off on the captured clip visually selling "BURNED
   is shipped + playable" + the §2 Archer test.
3. Phase 4 S05 scene re-renders successfully with the real clip
   (placeholder swapped out).

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
for invention."** No prior art. UMB v3 captured an HTP scroll (Phase
3 Unit 3.1 precedent in spirit) but never captured live gameplay
with multi-context state.

Three viable mechanisms to evaluate:

| Mechanism | Pros | Cons | Resolution / framerate |
|-----------|------|------|------------------------|
| **A. Playwright multi-context + page.video()** | Fully scripted, deterministic, no real devices | Headless rendering may not visually match real phone screens (no actual touch/tap "feel"); WebSocket sync may need orchestration | Per Playwright config — typically 1280×720 @ ~30fps; needs upscale for trailer 1920×1080 |
| **B. OBS + real devices** (board on TV, 2–3 phones held by humans) | Real touch animation, real phone screens, real human reaction | Requires Briggsy + 1–2 friends physically present; less reproducible if recapture needed; iPhone screen mirroring quality varies | OBS 1920×1080 @ 30/60fps; quality matches consumer screen recording |
| **C. Hybrid: Playwright board + OBS phones** | Captures both halves at maximum quality | Two capture sources to sync; orchestration heavy | Mixed; requires PiP composition in Phase 4 or Phase 5 |
| **D. Headless WSS replay** | No real game runtime; replay pre-recorded WSS messages through clients | Doesn't capture real visuals — clients still render; same as A | Same as A |

The brainstorm doesn't pre-select. Unit 5.1 evaluates A vs B vs C
against the gameplay-clip requirements (~18s, visually convincing,
multiplayer feel, music-bed-only audio).

The brainstorm's gating dependency: **"Deploy migration partykit →
Cloudflare Workers complete (per TODO.md §1 note)."** The trailer
captures a deployed, multi-device-accessible version of BURNED. The
in-flight deploy migration is at the BURNED project root (TODO.md §1
note 2026-05-16); Phase 5 cannot begin until that's complete OR
Phase 5 uses local-dev capture as fallback if migration drags out.

The largest risk Phase 5 manages: **the capture doesn't visually
sell "playable game"** — instead reads as a screen recording of a
local dev session. Phase 5 mitigation: shot list curated for moments
of REAL multiplayer drama (BURNED card draw, intercept stack, favor
flow, defuse placement) rather than empty lobby or static board
views. The clip is 18 seconds; every second must carry visual
weight.

---

## Critical Constraints Surfaced by Research

Cross-reference: roadmap §5.6, brainstorm Outstanding Questions.

### Deploy migration is a hard prerequisite

TODO.md §1 (2026-05-16 squeaky) flags:
> *5 modified files at squeaky time + 1 untracked file are an in-
> progress deploy migration (partykit → Cloudflare Workers,
> `mbriggsy.partykit.dev` → `briggsy007.workers.dev`, adding
> `burned-cxa.pages.dev` as allowed origin). Deliberately NOT swept
> into this squeaky commit — deserves its own deployment commit when
> ready.*

Phase 5 starts AFTER the deploy migration completes + production URL
is verified accessible across devices. If deploy migration drags
out, Phase 5 has a fallback: capture against **local Vite dev +
Wrangler dev** with all clients pointing at `localhost:8787`. The
fallback degrades the "captured on production" credibility but
unblocks Phase 5 from drift on a migration that isn't critical-path
for the trailer beyond "URL must work."

### 18-second window forces shot-list discipline

S05 budget: ~18 seconds of gameplay clip (Phase 1 Unit 1.5 frame
2040–2535, dissolve in at 2040, iris-wipe at 2535). Within 18s, the
clip must:

- Establish multiplayer (multiple players visible)
- Show phone-controller + TV-shared-screen relationship
- Land at least one dramatic moment (BURNED card draw OR intercept
  OR cinematic equivalent)
- Read as "real game in progress" not "loading screen / lobby"
- Support sparse Dash VO ("And — between you and me — they appear to
  be enjoying it.") at frame 2280 (240 relative)
- Optionally support a scream beat at frame 2400 (360 relative) — if
  R5 kept, the captured clip should have someone DRAW BURNED at that
  exact moment OR Phase 5 captures multiple takes and Phase 4 syncs

Shot list per Unit 5.2.

### Audio policy: music-bed-only, no player voice

Per brainstorm Scope Boundaries:
> *"Gameplay capture audio is music-bed-only — any player voice in
> the captured clip must be stripped or never captured; the voice
> cap of 3 includes the captured clip's audio surface."*

Two options:
- **Capture silent**: phones in airplane-mode mic-disabled mode OR
  Playwright captures without audio.
- **Capture + strip**: capture with player voice; Phase 5 post-
  process strips the audio track entirely; Phase 4's MusicBed +
  Dash VO is the sole audio in S05.

Either works. Phase 5 default: capture silent (no mic activation).

### Resolution + framerate target: 1920×1080 @ 30fps

Phase 4 composition is 1920×1080 @ 30fps. Capture clip must match OR
upscale cleanly. Playwright headless typically produces 1280×720 @
~30fps; upscaling to 1920×1080 introduces blur but acceptable for an
18-second clip not at primary focus.

OBS captures natively at any resolution including 1920×1080. If
mechanism B (OBS + real devices) wins, capture at native 1920×1080.

### Brainstorm's tiebreaker-rule applies

Per brainstorm: *"When (a) 'engineers talk about how it was built'
and (b) 'water-beads / product-joy takes over' conflict in the edit
bay, water-beads wins. The build is the subtext; the game is the
text. The cascade earns its place by feeling like Archer set-
dressing, not a credits roll."*

For S05 gameplay clip: water-beads-wins means the clip should sell
**joy of playing BURNED**, not "look at the engineering." If a real-
device capture (mechanism B) reads as more joyful (real human
reactions, real phone-in-hand) than headless Playwright (mechanism
A), B wins regardless of reproducibility.

### Brainstorm-stated gameplay shot inventory (R10 dossier reference)

Brainstorm R13: "Live gameplay footage closer — actual phone-
controller + TV-shared-screen multiplayer capture."

Specific moments that visually sell BURNED:
- Player phone showing hand of operative cards
- Board view showing CASE BANNER + DiscardFan + ActionBox
- A card play action (player taps card, animation plays on board)
- The DramaOverlay BURNED draw moment (Phase 1 §3.5 ships beats —
  the visual + audio drama IS the trailer-grade moment)
- Intercept window with NopeCountdownBar (the dial)
- Multi-player dynamics (more than 2 players visible on TV board)

Shot list draws from these.

---

## Requirements Trace

- **R13** (live gameplay footage closer): Unit 5.2 (shot list) + Unit
  5.4 (capture).
- **R5** (Vera scream cameo, conditional): Unit 5.4 if the captured
  clip contains a BURNED draw at the right relative frame; Phase 4
  syncs.
- **R8** (16:9 landscape): Unit 5.5 (post-processing aspect-fit if
  capture isn't native 1920×1080).
- **R15** (on-screen text signal layer): not directly Phase 5 — but
  the R15 #2 comms-ticker continues through S05 per Phase 4 Unit
  4.6, so the captured gameplay clip's edges must accommodate ticker
  overlay (lower 40px-band reserved).

---

## Key Technical Decisions

- **Capture mechanism**: TBD by Unit 5.1 evaluation. Default
  starting hypothesis is **Mechanism B (OBS + real devices)** for
  water-beads-wins reasons; Playwright fallback if logistics fail.
- **Resolution**: native 1920×1080 if Mechanism B; 1280×720 upscaled
  if Mechanism A. Either way, Phase 5 ships at 1920×1080.
- **Framerate**: 30fps. Match Phase 4 composition framerate.
- **Audio**: capture silent (no mic). Phase 4 supplies all audio.
- **Shot list**: 18-second curated game-flow sequence ending on a
  BURNED draw OR equivalent climax (per Unit 5.2).
- **Recapture tolerance**: Phase 5 may need multiple takes. Budget:
  3–5 capture sessions; each ~2 hours including setup.
- **Production URL**: deploy migration must complete first;
  `burned-cxa.pages.dev` or successor URL. Fallback to local-dev
  documented.
- **Post-processing in FFmpeg via `execFileSync` argv arrays** —
  project security convention.
- **Take selection**: Phase 5 captures multiple takes (3–5); Briggsy
  selects best take based on visual + dramatic content. Selection
  documented.

---

## Implementation Units

### Unit 5.1 — Capture Mechanism Evaluation + Lock

- [ ] **Unit 5.1: Capture Mechanism Evaluation + Lock**

**Goal:** Evaluate Mechanism A (Playwright multi-context), B (OBS +
real devices), or C (hybrid). Lock the mechanism per the water-beads
rule + logistical feasibility. Document the decision + setup
prerequisites.

**Requirements:** R13 (capture mechanism is the load-bearing decision
for the closer).

**Dependencies:** Deploy migration partykit → Cloudflare Workers
complete (or fallback to local-dev decided).

**Files:**

- Create: `videos/trailer/sample-eval/gameplay-capture/mechanism-eval.md` —
  per-mechanism evaluation, lock decision.

**Approach:**

**Step 1 — Per-mechanism quick spike.**

A 5-minute spike of each mechanism. NOT full implementation — just
enough to evaluate feasibility + visual quality.

**Mechanism A — Playwright multi-context spike:**

```ts
// scripts/spike-playwright-capture.ts
import { chromium } from 'playwright';
import { existsSync, mkdirSync } from 'node:fs';

async function main() {
  const browser = await chromium.launch();
  const recordOpts = {
    recordVideo: { dir: 'sample-eval/gameplay-capture/spike-playwright/', size: { width: 1280, height: 720 } },
  };
  // Spawn 3 contexts: board + 2 players
  const boardCtx = await browser.newContext({ ...recordOpts, viewport: { width: 1920, height: 1080 } });
  const player1Ctx = await browser.newContext({ ...recordOpts, viewport: { width: 390, height: 844 } });
  const player2Ctx = await browser.newContext({ ...recordOpts, viewport: { width: 390, height: 844 } });

  const boardPage = await boardCtx.newPage();
  const p1Page = await player1Ctx.newPage();
  const p2Page = await player2Ctx.newPage();

  const URL = process.env.BURNED_URL ?? 'http://localhost:5173';
  await boardPage.goto(`${URL}/board.html`);
  // Get the room code from board screen
  // ... navigate player pages to /player.html?room=XXX
  // ... orchestrate a few card plays

  await new Promise(r => setTimeout(r, 30_000)); // 30s capture window

  await boardCtx.close();
  await player1Ctx.close();
  await player2Ctx.close();
  await browser.close();
  // Each context generates a video file on close
}

main().catch(console.error);
```

Output: 3 separate video files (one per context). Phase 5 composites
in post if Mechanism A picked.

Evaluation: visual quality of board + phone in 720p? Animation
smoothness? Multiplayer feel?

**Mechanism B — OBS + real devices spike:**

Setup: TV (or external monitor) with board view full-screen; 2
phones with player.html loaded; OBS recording the TV at 1920×1080
@ 30fps.

Capture: ~30s of natural multi-player play. Real human hands holding
phones, real reactions.

Output: a single 1920×1080 MP4. Higher production value but requires
physical setup.

Evaluation: does the capture read as MORE alive than Mechanism A?
Per water-beads rule.

**Mechanism C — Hybrid spike:**

Skip for now. Hybrid requires both A and B; if A or B alone clears,
Hybrid is over-engineering.

**Step 2 — Evaluation matrix.**

| Criterion | Weight | A (Playwright) | B (OBS+devices) |
|-----------|--------|----------------|-----------------|
| Visual quality | High | 720p upscale; clean but flat | 1080p native; phone screens slightly blurry but human-real |
| Multiplayer feel | High | Synthetic — no real-time human reactions | Real — hands holding phones |
| Reproducibility | Medium | High (re-run script) | Low (must reassemble setup) |
| Setup time | High | Low (15 min) | High (2+ hours with 2 friends) |
| Audio policy | Trivial | Silent by default | Mic-off, no capture issue |
| Water-beads test | DECIDING | Less alive | More alive |

**Step 3 — Lock decision.**

Per water-beads rule + brainstorm Tiebreaker, **Mechanism B locks**
unless logistics make B impossible. Logistics check: can Briggsy
recruit 1–2 friends + arrange a 2-hour capture window within Phase 5
timeline?

If yes (default expectation): lock B.
If no: fall back to A; document the trade-off in mechanism-eval.md.

**Step 4 — Recapture-tolerance budget.**

Phase 5 budgets 3–5 capture sessions (each session = setup +
multiple takes). Phase 5 doesn't lock the take until Unit 5.4
runs.

**Step 5 — Documentation.**

`mechanism-eval.md`:

```md
# Capture Mechanism Evaluation — Phase 5 Unit 5.1

## Mechanism A — Playwright multi-context
- Spike: `scripts/spike-playwright-capture.ts`
- Output: 3 video files (board + 2 players, separate contexts)
- Visual quality: 720p upscale to 1080p, slight blur
- Multiplayer feel: synthetic — programmatic taps, no human reaction
- Reproducibility: HIGH
- Setup time: ~15 minutes

## Mechanism B — OBS + real devices
- Setup: TV/monitor running board.html, 2 phones running player.html,
  OBS capturing TV at 1920×1080/30fps
- Output: single 1920×1080 MP4 file
- Visual quality: native 1080p
- Multiplayer feel: REAL — human reactions visible
- Reproducibility: LOW — requires reassembly
- Setup time: ~2 hours including friend recruitment

## Lock: <A or B>
Date: <YYYY-MM-DD>
Logistics check (B only): <feasible / not feasible>
Rationale: <per water-beads rule + logistical feasibility>
```

**Patterns to follow:**

- Phase 3 Unit 3.1 Playwright pattern (capture-htp-scroll-burned.ts)
  for Mechanism A skeleton.
- OBS Studio 30/31.x (verify version available to Briggsy).

**Test scenarios:**

- **Spike A passes:** 3 video files generated; manual playback
  confirms 720p board + player viewports.
- **Spike B passes:** OBS captures TV at 1080p; manual playback
  confirms phones visible in frame.
- **Decision recorded:** mechanism-eval.md commits the choice.

**Verification:**

- Mechanism locked in mechanism-eval.md.
- Spike output exists for whichever mechanism was evaluated.
- Logistics confirmed (friends available if B chosen).

---

### Unit 5.2 — Shot List Definition

- [ ] **Unit 5.2: Shot List Definition**

**Goal:** Define the 18-second curated gameplay sequence: which game
phases, which dramatic beats, which player count, which screens
visible. Output: `shot-list.ts` + storyboard.

**Requirements:** R13 + S05 cue timings from Phase 1 Unit 1.2 Step 6.

**Dependencies:** Unit 5.1 (mechanism locked).

**Files:**

- Create: `videos/trailer/scripts/shot-list.ts`
- Create: `videos/trailer/sample-eval/gameplay-capture/shot-list.md` —
  human-readable storyboard.

**Approach:**

**Step 1 — S05 cue map review (from Phase 1 Unit 1.2 Step 6).**

S05 absolute frames 2040–2580 (relative 0–540):

| Relative frame | Beat | Audio | Visual need |
|----------------|------|-------|-------------|
| 0–60 | Cross-dissolve from S04 cascade settles into gameplay | Music bed at 25% | Gameplay clip starts; reads as "real game" within 1 second |
| 60–240 | Initial game presence | Sparse music; no Dash VO | Multiplayer dynamic visible — phones in foreground, board on TV |
| 240–290 | Sparse Dash VO drops | Dash: "And — between you and me — they appear to be enjoying it." | Continue gameplay; ideally a card play or intercept action overlaps |
| 360–405 | Scream beat (R5 contingent) | Dash: "VERAAA!!!" | A player draws the BURNED card on capture; DramaOverlay BURNED beat plays |
| 405–495 | Reaction beat | Music bed 25% | Real human reaction to BURNED draw (gasp, "no!", laugh) |
| 495–540 | Iris-wipe begins | Music bed rising to 50% | Frame freezes naturally as iris-wipe overlays |

**Step 2 — 18-second shot list (5 shots).**

| Shot # | Relative frames | Duration | Description |
|--------|----------------|----------|-------------|
| Shot 1 | 0–90 | 3s | **ESTABLISHING SHOT**: Wide shot of phones + TV. Board shows CASE BANNER + DiscardFan + active player indicator. 1–2 player hands visible holding phones. Multiple operative cards visible in DiscardFan. |
| Shot 2 | 90–240 | 5s | **CARD PLAY**: Closeup or medium shot of a player tapping a card on their phone; cut to board showing the card animating into DiscardFan with sticker pop. Dash card or Attack card or Defuse — visually rich. |
| Shot 3 | 240–360 | 4s | **DASH VO MOMENT**: Continue active play, multiple player phones visible, music + Dash VO ("they appear to be enjoying it") on top. Visual content: maybe a steal action or intercept window opening (NopeCountdownBar visible). |
| Shot 4 | 360–450 | 3s | **BURNED DRAW CLIMAX (R5 hook)**: Player draws BURNED card; phone screen shows the BURNED card face revealed; cut to board showing DramaOverlay's BURNED beat playing (the cinematic moment). |
| Shot 5 | 450–540 | 3s | **REACTION + IRIS-WIPE TARGET**: Wide shot, real human reactions to BURNED draw (gasps, "oh no", laughter). Frame composition supports iris-wipe collapsing toward center at frame ~510. |

Total: 18 seconds. Each shot has a clear visual goal.

**Step 3 — `shot-list.ts`.**

```ts
// videos/trailer/scripts/shot-list.ts
export interface GameplayShot {
  shotNumber: number;
  /** Relative-to-S05 frame range. */
  startFrame: number;
  endFrame: number;
  /** Description for capture-time direction. */
  description: string;
  /** Critical visual content. */
  visualGoal: string;
  /** Game-state precondition for the shot to land. */
  gameStatePrecondition: string;
  /** Optional audio cue this shot aligns with. */
  alignedAudioCue?: string;
}

export const GAMEPLAY_SHOTS: readonly GameplayShot[] = [
  {
    shotNumber: 1,
    startFrame: 0,
    endFrame: 90,
    description: 'ESTABLISHING SHOT — wide of phones + TV',
    visualGoal: 'Multiplayer dynamic visible; board chrome (CASE BANNER + DiscardFan) clearly readable',
    gameStatePrecondition: 'Active round mid-game; 2–4 players seated; at least 2 cards in DiscardFan',
  },
  {
    shotNumber: 2,
    startFrame: 90,
    endFrame: 240,
    description: 'CARD PLAY — phone tap → board animation',
    visualGoal: 'Player taps card; card animates into DiscardFan with sticker pop',
    gameStatePrecondition: 'Player has a visually rich card in hand (Dash / Attack / Defuse)',
  },
  {
    shotNumber: 3,
    startFrame: 240,
    endFrame: 360,
    description: 'DASH VO MOMENT — continue play with VO overlay',
    visualGoal: 'Visible game progression; possible intercept window (NopeCountdownBar)',
    gameStatePrecondition: 'Active card-play turn with intercept potential',
    alignedAudioCue: 'Dash VO at relative frame 240 ("And — between you and me...")',
  },
  {
    shotNumber: 4,
    startFrame: 360,
    endFrame: 450,
    description: 'BURNED DRAW CLIMAX — R5 hook target',
    visualGoal: 'Player draws BURNED; phone shows BURNED card; board shows DramaOverlay BURNED beat',
    gameStatePrecondition: 'Deck has exactly 1 BURNED card remaining (~5–8 cards left in deck); active player draws',
    alignedAudioCue: 'Scream "VERAAA!!!" at relative frame 360 (if R5 kept)',
  },
  {
    shotNumber: 5,
    startFrame: 450,
    endFrame: 540,
    description: 'REACTION + IRIS-WIPE TARGET',
    visualGoal: 'Real human reactions; composition supports iris-wipe collapse',
    gameStatePrecondition: 'Post-BURNED-draw beat; players reacting',
  },
] as const;
```

**Step 4 — Game-state choreography.**

To land Shot 4 (BURNED draw at relative frame 360), the captured
game session must be ENGINEERED to have the BURNED card remaining
when a specific player draws at the target moment. Two approaches:

- **Approach I — Multiple takes:** Run the game naturally; capture
  4+ takes; pick the take where BURNED draws closest to frame 360.
  Phase 4 syncs the timing in post.
- **Approach II — Engineered deck:** Use BURNED's dev-action handler
  to seed a specific deck order so BURNED lands at the target draw.
  Requires `pnpm dev` + dev-action injection.

Lock: **Approach I (multiple takes)**. Engineering the deck is
fragile and reads as artificial; multiple takes lets real-game
variation produce the moment naturally. Take selection is
documented per Unit 5.4.

**Step 5 — Shot-list storyboard documentation.**

`shot-list.md` mirrors `shot-list.ts` with prose + storyboard
sketches per shot. Optional: ASCII storyboards for the visual goals.

**Patterns to follow:**

- UMB v3 shot-list precedent (if any — verify; UMB used cascade
  composition rather than discrete shots).
- Phase 1 Unit 1.5 Step 2 cue table pattern.

**Test scenarios:**

- **Happy path:** Shot list lands in `shot-list.ts` + `shot-list.md`
  with all 5 shots documented.
- **Coverage:** Total shot durations sum to 540 frames (S05 length).
- **Pre-condition check:** Each shot's precondition is achievable in
  a natural game session.

**Verification:**

- `shot-list.ts` typechecks.
- `shot-list.md` documents per-shot direction + visual goal.
- Take-engineering decision (Approach I) locked.

---

### Unit 5.3 — Capture Harness Build

- [ ] **Unit 5.3: Capture Harness Build**

**Goal:** Build the capture-mechanism-specific harness. Mechanism A
= Playwright script; Mechanism B = OBS scene config + checklist.

**Requirements:** R13.

**Dependencies:** Unit 5.1 (mechanism locked), Unit 5.2 (shot list).

**Files:**

- (Mechanism A): Create: `videos/trailer/scripts/capture-gameplay-playwright.ts`
- (Mechanism B): Create: `videos/trailer/sample-eval/gameplay-capture/obs-scene-config.md`
- Create: `videos/trailer/sample-eval/gameplay-capture/harness-build.md`

**Approach (Mechanism A path):**

```ts
// videos/trailer/scripts/capture-gameplay-playwright.ts
import 'dotenv/config';
import { chromium, type BrowserContext } from 'playwright';
import { existsSync, mkdirSync } from 'node:fs';
import { GAMEPLAY_SHOTS } from './shot-list';

const URL = process.env.BURNED_URL ?? 'https://burned-cxa.pages.dev';
const OUT_DIR = 'videos/trailer/sample-eval/gameplay-capture/takes';

async function main() {
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch();

  const recordOpts = (subdir: string) => ({
    recordVideo: { dir: `${OUT_DIR}/${subdir}`, size: { width: 1920, height: 1080 } },
  });

  // Board view: TV-shared-screen
  const boardCtx = await browser.newContext({
    ...recordOpts('board'),
    viewport: { width: 1920, height: 1080 },
  });
  const boardPage = await boardCtx.newPage();
  await boardPage.goto(`${URL}/board.html`);

  // Wait for room code to render
  const roomCode = await boardPage.locator('[data-room-code]').textContent({ timeout: 30_000 });
  if (!roomCode) throw new Error('Room code did not render on board');
  console.log(`Room code: ${roomCode}`);

  // Spawn 3 player contexts (3 phones)
  const players: BrowserContext[] = [];
  for (let i = 1; i <= 3; i++) {
    const pCtx = await browser.newContext({
      ...recordOpts(`player-${i}`),
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 3,
    });
    const pPage = await pCtx.newPage();
    await pPage.goto(`${URL}/player.html?room=${roomCode}`);
    // Player joins with a generated name
    await pPage.fill('input[name="playerName"]', `Player ${i}`);
    await pPage.click('button:has-text("Join")');
    players.push(pCtx);
  }

  // Wait for board to show "ready to start"
  await boardPage.waitForTimeout(5000);
  // Host start game
  await boardPage.click('button:has-text("Start")', { timeout: 10_000 });

  // Run scripted card plays — this is shot list choreography
  // Approach I (multiple takes natural play): simulate ~20s of natural plays
  // ...

  // Capture for 30s (longer than the 18s S05 budget; Phase 5 takes 30s and trims)
  await boardPage.waitForTimeout(30_000);

  await boardCtx.close();
  for (const p of players) await p.close();
  await browser.close();

  console.log(`Take complete. Videos in ${OUT_DIR}/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

(Note: scripted card plays are non-trivial — Phase 5 may iterate
the play sequence over multiple takes per Approach I.)

**Approach (Mechanism B path):**

`obs-scene-config.md` lists the OBS scene setup:

```md
# OBS Scene Config — Phase 5 Mechanism B

## Source 1: Display Capture (Primary Monitor / TV)
- Source type: Display Capture
- Display: External TV (1920×1080 @ 60Hz preferred)
- Source rectangle: full display
- Position: full canvas

## Source 2 (optional): Window Capture (board.html browser window)
- If TV mirroring is unstable, capture the board.html window
  directly via the host laptop's browser.
- Window: BURNED board (browser window title pattern)

## Audio
- Mute all audio sources. The trailer's S05 audio comes from Phase 2 +
  Phase 1's music bed; capture audio is discarded.

## Recording settings
- Output Mode: Advanced
- Encoder: x264 (or NVENC if GPU acceleration available)
- Rate Control: CRF, value 18 (production-quality)
- Resolution: 1920×1080
- FPS: 30
- Container: MP4

## Capture checklist
1. TV running board.html via host laptop browser; full-screen mode
2. Phones loaded with player.html?room=XXX, joined as 2–3 players
3. Music + ambient room sound disabled (no audio capture)
4. Host starts OBS recording
5. Host clicks "Start Game" on board
6. Multi-player session plays through ~30 seconds of natural game
7. Host stops OBS recording after BURNED-draw beat lands
8. Take saved to videos/trailer/sample-eval/gameplay-capture/takes/take-NN.mp4
```

**Patterns to follow:**

- Playwright multi-context: https://playwright.dev/docs/api/class-browsercontext
- OBS Studio: https://obsproject.com/
- BURNED room-code chrome (per board.html DOM): `data-room-code`
  attribute or similar.

**Test scenarios:**

- **Happy path A:** Playwright script runs; 4 video files (1 board + 3 players) saved to takes/.
- **Happy path B:** OBS captures 30s clip to takes/take-01.mp4; mid-game scene visible end-to-end.
- **Edge case:** Production URL fails (deploy not migrated) → script
  switches to local-dev URL via env var.
- **Edge case:** Player join fails (room-code mismatch / timeout) →
  retry once; if still fails, fall back to manual join.
- **Recapture tolerance:** Harness supports running multiple takes
  iteratively (`pnpm tsx ... --take=01`, `--take=02`).

**Verification:**

- Harness builds + runs without errors.
- One spike take captured to verify mechanism end-to-end.
- `harness-build.md` documents setup + invocation.

---

### Unit 5.4 — Gameplay Capture Run + Take Selection

- [ ] **Unit 5.4: Gameplay Capture Run + Take Selection**

**Goal:** Run 3–5 capture sessions, picking the take that best
satisfies the shot list. Selected take saved as `gameplay-raw.mp4`.

**Requirements:** R13 + R5 (if R5 kept, take must include a BURNED
draw at suitable moment).

**Dependencies:** Unit 5.3 (harness built), deploy migration
complete OR local-dev fallback.

**Files:**

- Create: `videos/trailer/sample-eval/gameplay-capture/takes/take-{01..05}.mp4` —
  raw captures.
- Create: `videos/trailer/sample-eval/gameplay-capture/take-selection.md`
- Create: `videos/trailer/sample-eval/gameplay-capture/gameplay-raw.mp4` —
  the selected take.

**Approach:**

**Step 1 — Capture session execution.**

For each session, ~2 hours of total time:

1. Pre-flight check:
   - Production URL accessible? (or local-dev fallback)
   - 1–2 friends available (Mechanism B)?
   - OBS recording settings verified
   - Phones charged + on Wi-Fi
2. Run capture (~30s per take, multiple takes per session)
3. Review takes immediately; log per-take notes

**Step 2 — Per-take evaluation rubric.**

For each take, evaluate against shot list:

| Shot | Achieved? | Notes |
|------|-----------|-------|
| Shot 1 (establishing) | ✓ / ✗ / partial | Notes on visual quality |
| Shot 2 (card play) | ✓ / ✗ / partial | Which card; visual richness |
| Shot 3 (Dash VO moment) | ✓ / ✗ / partial | Intercept window opened? |
| Shot 4 (BURNED draw) | ✓ / ✗ / partial | Frame at which BURNED drawn; reaction visible |
| Shot 5 (reaction + iris) | ✓ / ✗ / partial | Real reaction; iris-wipe compatible composition |

Score: 5/5 = ideal; 4/5 = ship-able; 3/5 = recapture; <3/5 = bad
take.

**Step 3 — Take selection.**

Pick the take that:
1. Hits all 5 shots (or 4 of 5 ship-able)
2. BURNED draw lands closest to the target frame 360 (Phase 4 will
   sync by trimming a few frames at clip head)
3. Real human reactions feel ALIVE (water-beads rule)
4. Visual quality acceptable (focus, exposure, framing)

If no take hits 4+/5, run another session.

**Step 4 — Selected take + frame-trim plan.**

Selected take's raw length is ~30 seconds. S05 needs ~18 seconds.
Phase 5 Unit 5.5 trims:

- **Head trim**: cut N frames from start to align BURNED draw with
  S05 relative frame 360. N depends on per-take BURNED-draw frame.
- **Tail trim**: total final length 540 frames (18s).

Documented in `take-selection.md`:

```md
# Take Selection — Phase 5 Unit 5.4

## Session log
- Session 1 (date): 4 takes captured. Take 02 best (4/5 score).
- Session 2 (date): 2 takes captured. Take 06 (5/5 score, BURNED at perfect timing).

## Selected take: take-06.mp4
- Raw length: 32.4s (972 frames)
- BURNED draw at raw frame 472 (15.7s in)
- Target: BURNED draw at S05 relative frame 360 (12.0s in)
- Head trim: 112 frames (3.7s)
- Tail trim: 320 frames after target (10.7s remaining post-trim)
- Final clip: 540 frames (18s) starting at original raw frame 112

## Briggsy sign-off
Take 06 selected. APPROVED.
```

**Step 5 — Raw save.**

Copy selected take to `videos/trailer/sample-eval/gameplay-capture/gameplay-raw.mp4`
for Phase 5 Unit 5.5 post-processing.

**Patterns to follow:**

- `feedback-eye-in-loop-beats-calibration-for-motion.md` — direct
  observation of real-world output, not metrics alone.
- `feedback-imagen-budget.md` adapted: multiple takes ≠ over-budget;
  budget is across the whole session, not per take.

**Test scenarios:**

- **Happy path:** Best take achieves 5/5; trim plan straightforward.
- **Edge case:** Multiple takes score 4/5 with different strengths;
  Briggsy picks based on water-beads-rule preference (most alive).
- **Edge case:** No take hits 4+/5 → recapture session; document
  why.

**Verification:**

- Takes captured + saved.
- `take-selection.md` documents per-take rubric scores.
- Selected take saved as `gameplay-raw.mp4`.
- Briggsy signs off on selection.

---

### Unit 5.5 — Gameplay Post-Processing

- [ ] **Unit 5.5: Gameplay Post-Processing**

**Goal:** Trim selected take to 18s + aspect-fit to 1920×1080 + strip
audio + final encode as `public/gameplay.mp4` ready for Phase 4 S05
import.

**Requirements:** R8 (16:9 landscape), R13.

**Dependencies:** Unit 5.4 (gameplay-raw.mp4 selected).

**Files:**

- Create: `videos/trailer/public/gameplay.mp4` — final.
- Create: `videos/trailer/scripts/post-process-gameplay.ts` — the
  processing script.
- Create: `videos/trailer/sample-eval/gameplay-capture/post-process.md`

**Approach:**

**Step 1 — Trim head + tail per Unit 5.4 plan.**

Using `execFileSync` (project security pattern):

```ts
// videos/trailer/scripts/post-process-gameplay.ts
import { execFileSync } from 'node:child_process';

const RAW = 'videos/trailer/sample-eval/gameplay-capture/gameplay-raw.mp4';
const TRIMMED = 'videos/trailer/sample-eval/gameplay-capture/gameplay-trimmed.mp4';
const FINAL = 'videos/trailer/public/gameplay.mp4';

// From take-selection.md: head trim 112 frames, total 540 frames = 18s
const HEAD_SECONDS = 112 / 30;  // 3.733s
const DURATION_SECONDS = 540 / 30;  // 18.0s

// Trim with stream copy (lossless)
// SAFE: argv array
execFileSync('ffmpeg', [
  '-y',
  '-ss', String(HEAD_SECONDS),
  '-i', RAW,
  '-t', String(DURATION_SECONDS),
  '-c', 'copy',
  '-an',                          // strip audio
  TRIMMED,
]);
console.log('OK trimmed');
```

**Step 2 — Aspect-fit + final encode.**

If Mechanism B captured at native 1920×1080, no aspect adjustment
needed. If Mechanism A captured at 1280×720, upscale to 1920×1080.

```ts
// Final encode: scale to 1920×1080, H.264 CRF 18, 30fps, no audio
// SAFE: argv array
execFileSync('ffmpeg', [
  '-y',
  '-i', TRIMMED,
  '-vf', 'scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,setsar=1',
  '-c:v', 'libx264',
  '-crf', '18',
  '-preset', 'slow',              // higher-quality encode for trailer asset
  '-pix_fmt', 'yuv420p',
  '-r', '30',                      // force 30fps
  '-an',                          // strip audio (redundant; already stripped)
  '-movflags', '+faststart',
  FINAL,
]);
console.log('OK encoded to', FINAL);
```

**Step 3 — Duration + dimensions verification.**

```ts
// SAFE: argv array
const out = execFileSync('ffprobe', [
  '-v', 'error',
  '-select_streams', 'v:0',
  '-show_entries', 'stream=width,height,duration,r_frame_rate',
  '-of', 'json',
  FINAL,
], { encoding: 'utf-8' });
const probe = JSON.parse(out);
const stream = probe.streams[0];
console.log(`Final clip:
  Dimensions: ${stream.width}×${stream.height} (expected 1920×1080)
  Duration: ${stream.duration}s (expected 18.0s)
  Frame rate: ${stream.r_frame_rate} (expected 30/1)
`);
```

Expected output:
- 1920×1080
- 18.000s ±0.05s
- 30/1 frame rate

**Step 4 — Final inspection.**

Open `public/gameplay.mp4` in any player. Verify:
- Plays smoothly start-to-end
- BURNED draw lands at ~12.0s in (Phase 4 S05 relative frame 360)
- No audio (silent track)
- Composition supports iris-wipe overlay in last ~3 seconds

**Step 5 — Post-process log.**

```md
# Gameplay Post-Process Log

- Raw take: take-06.mp4 (32.4s)
- Head trim: 3.733s (112 frames)
- Tail trim: <calculated>s
- Final duration: 18.000s
- Final dimensions: 1920×1080
- Final framerate: 30fps
- Audio: stripped
- Encode settings: H.264 CRF 18, preset slow, yuv420p, faststart
- File size: <N> MB
```

**Patterns to follow:**

- FFmpeg trim with stream-copy: https://ffmpeg.org/ffmpeg.html#Stream-copy
- FFmpeg scale + crop: https://ffmpeg.org/ffmpeg-filters.html#scale-1
- Project security rule: `execFileSync` with argv arrays.

**Test scenarios:**

- **Happy path:** Trim + encode produces 18.0s 1920×1080 30fps MP4.
- **Edge case:** Mechanism A 720p source → upscale produces visible
  but acceptable blur; Briggsy reviews trade-off.
- **Edge case:** Frame rate mismatch (source 60fps from OBS) →
  re-encode forces 30fps; check no motion-judder artifacts.
- **Security:** No shell-string interpolation in FFmpeg calls.

**Verification:**

- `public/gameplay.mp4` exists at expected dimensions + duration.
- Probe output matches spec.
- Visual inspection confirms BURNED-draw timing + no audio.
- `post-process.md` logs the encode.

---

### Unit 5.6 — Phase 4 Re-render with Real Clip

- [ ] **Unit 5.6: Phase 4 Re-render with Real Clip**

**Goal:** Re-run Phase 4's full composition render with the real
`gameplay.mp4` (replacing the placeholder). Verify S05 reads as
intended; the real-gameplay closer lands per R13 acceptance.

**Requirements:** R13.

**Dependencies:** Unit 5.5 (gameplay.mp4 final).

**Files:**

- Re-render: `videos/trailer/out/trailer-preview.mp4` — full
  composition with real gameplay.
- Create: `videos/trailer/sample-eval/gameplay-capture/phase-4-rerender.md`

**Approach:**

**Step 1 — Re-render.**

The Phase 4 S05 scene file (`S05_GameplayDissolve.tsx`) imports
`staticFile('gameplay.mp4')` via `<OffthreadVideo>`. Unit 5.5
overwrote the placeholder at this path. No Phase 4 code edit needed
— next `pnpm render` picks up the new clip.

```
cd videos/trailer
pnpm render
```

**Step 2 — Full-runtime verification.**

Open the new `out/trailer-preview.mp4`. Verify against Phase 4 Unit
4.10's verification card:

- All 12 sample frames pass §2 (including the 2 S05 samples).
- BURNED-draw moment lands at frame 2400 (within ±5 frames of
  Phase 1 Unit 1.2 Step 6 spec).
- Scream beat (if R5 kept) aligns with the gameplay clip's BURNED
  draw.
- Iris-wipe at S05→S06 transitions cleanly out of the gameplay clip.

**Step 3 — R13 acceptance check.**

Per brainstorm Success Criteria: *"the closing gameplay dissolve [is
recognized as] a real playable game by an engineering-peer viewer."*

Briggsy reviews S05 segment specifically:
- Reads as REAL game in progress? (not screen recording of empty
  lobby)
- Multiplayer dynamic visible? (multiple players or phones)
- Card play action visible? (taps + animations land)
- Dramatic moment lands? (BURNED draw)
- Reaction visible? (human response to BURNED)

R13 PASS if 4/5. FAIL routes to: regrade take selection (Phase 5
Unit 5.4) or recapture.

**Step 4 — Documentation.**

```md
# Phase 4 Re-render with Real Gameplay — Verification

## Render
- Date: <YYYY-MM-DD>
- Time: <N> minutes
- File size: <N> MB

## Verification
- [ ] S05 segment plays real gameplay clip
- [ ] BURNED draw at frame 2400 ±5 frames
- [ ] Scream beat aligned (if R5 kept)
- [ ] Iris-wipe at frame 2535 transitions cleanly
- [ ] §2 sample frames at 2100 + 2355 pass

## R13 acceptance (5 criteria)
- [ ] Reads as REAL game (not empty lobby)
- [ ] Multiplayer visible
- [ ] Card play action visible
- [ ] Dramatic moment lands
- [ ] Reaction visible
- Verdict: PASS / FAIL

## Briggsy sign-off
- S05 with real gameplay clip: APPROVED / ITERATE
```

**Patterns to follow:**

- Phase 4 Unit 4.10 verification pattern.
- `feedback-verify-before-presenting.md` — render-MP4 review.

**Test scenarios:**

- **Happy path:** Re-render succeeds; full verification passes;
  R13 PASS.
- **Edge case:** BURNED-draw frame drift from target → re-trim in
  Unit 5.5 (slide head trim by ±N frames); re-render.
- **Edge case:** S05 visual reads as less alive than placeholder →
  Phase 5 Unit 5.4 take-selection reopen; recapture if needed.

**Verification:**

- `out/trailer-preview.mp4` re-rendered with real gameplay clip.
- `phase-4-rerender.md` documents verification.
- Briggsy signs off on S05 + R13 acceptance.

---

## System-Wide Impact

- **Interaction graph:** Phase 5 ingests deploy-migration completion
  (or local-dev fallback) + Phase 1 S05 cue map + Phase 4 S05 scene
  + Phase 2 sparse-Dash + scream audio cues. Produces gameplay.mp4
  consumed by Phase 4 S05. Re-renders Phase 4 deliverable.
- **Error propagation:** Failed capture → recapture session →
  iterate. Failed R13 acceptance → re-evaluate take selection or
  recapture.
- **State lifecycle risks:** Phase 5 depends on BURNED being
  deployed + accessible. Deploy migration in flight at TODO.md §1;
  Phase 5 cannot start until that's resolved (or fallback to local).
- **API surface parity:** Phase 5 USES BURNED's user-facing surface
  to capture gameplay. No BURNED code modification.
- **Integration coverage:** Phase 4 S05 scene imports the clip via
  `<OffthreadVideo>`; integration validated by Unit 5.6 re-render.
- **Unchanged invariants:** BURNED game code untouched. Phone bundle
  budget unaffected. Trailer remains isolated.

---

## Risks & Dependencies

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Deploy migration drags out past Phase 5 start | Medium (in flight 2026-05-16) | High (blocks Phase 5) | Local-dev fallback documented; trailer URL = localhost; visual quality unaffected. |
| Mechanism B logistics fail (no friends available) | Medium | Medium | Mechanism A fallback. Visual quality trade-off documented in mechanism-eval.md. |
| Playwright headless capture doesn't render BURNED's GSAP animations | Medium | High (Mechanism A fails) | Spike in Unit 5.1 validates animations capture. If fails, fall back to OBS even at higher logistical cost. |
| BURNED-draw timing variance across takes too wide | Medium | Medium | Multiple-takes Approach I; pick the take with BURNED at closest target frame. Phase 4 syncs by trim. |
| Real-device capture has phone bezel / hand obstruction over critical chrome | Medium | Low | Reshoot with adjusted framing. |
| Mic accidentally captures player voice violating brainstorm Scope | Low | Medium | OBS audio sources muted in checklist (Unit 5.3 Step 2 obs-scene-config). Phase 5 Unit 5.5 strips audio as belt-and-suspenders. |
| Captured clip reads as less alive than Phase 4 placeholder | Low | Medium | Take selection rubric favors alive-ness; multiple sessions allowed. |
| OBS recording settings produce file that won't play in Remotion | Low | Medium | Unit 5.5 re-encode to known-good H.264 yuv420p MP4. |
| Re-render time after gameplay swap blocks Phase 6 | Low | Low | Re-render is ~6–9 minutes; absorb in Phase 6 schedule. |
| FFmpeg trim introduces audio-video desync (despite strip) | Low | Low | Stream-copy trim preserves video; audio strip happens before trim. |
| Phase 4 S05 scene file changed during Phase 5 idle, breaks clip integration | Low | Low | Re-render in Unit 5.6 catches any breakage immediately. |

---

## Open Questions

### Resolved During Planning

- **Capture mechanism**: TBD by Unit 5.1 evaluation. Default
  hypothesis Mechanism B (OBS + real devices) per water-beads rule;
  Mechanism A fallback.
- **Audio policy**: capture silent + Unit 5.5 strip as belt-and-
  suspenders.
- **Shot list**: 5 shots, 18 seconds total, BURNED-draw climax at
  shot 4.
- **Take engineering**: Approach I (multiple takes natural play), not
  Approach II (engineered deck) — alive-ness wins.
- **Deploy migration dependency**: Phase 5 blocked until migration
  complete; local-dev fallback documented.
- **Final format**: 1920×1080 H.264 CRF 18 30fps no-audio MP4.

### Deferred to Implementation

- **Specific URL** (production migration target): may shift between
  Phase 5 start and end; `BURNED_URL` env var configures.
- **Real-device friend recruitment**: Briggsy / Harry / others —
  scheduled per session availability.
- **Specific shot 4 take selection**: depends on capture sessions;
  Unit 5.4 picks.
- **Whether iris-wipe edge composition needs cropping the clip's
  last frames**: Phase 4 may iterate after Unit 5.6 if iris-wipe
  doesn't land cleanly.
- **Mechanism A scripted-play sequence**: if Mechanism A selected,
  exact play sequence (which player taps which card when) needs
  implementation; deferred to Unit 5.3 execution.

---

## Documentation / Operational Notes

- All Phase 5 artifacts land in
  `videos/trailer/sample-eval/gameplay-capture/` (takes, logs,
  evals) and `videos/trailer/public/gameplay.mp4` (final clip).
- Capture sessions are physical events (Mechanism B): schedule
  + 1–2 friend recruitment + 2-hour window per session.
- `BURNED_URL` env var configures the capture target URL —
  production or local-dev fallback.
- `execFileSync` argv arrays throughout (project security
  convention).
- Take selection is Briggsy's judgment call; rubric guides but
  doesn't override.
- R13 acceptance check (Unit 5.6) is the load-bearing pass — if S05
  doesn't sell "real game," the closer doesn't land.

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
- NopeCountdownBar: `src/client/shared/NopeCountdownBar.tsx`
- CASE BANNER: `src/client/board/CaseBanner.tsx`
- DiscardFan: `src/client/board/DiscardFan.tsx`

**Playwright references:**
- Multi-context: https://playwright.dev/docs/api/class-browsercontext
- Video recording: https://playwright.dev/docs/videos
- Network conditions (for live URL captures): https://playwright.dev/docs/api/class-browsercontext#browser-context-set-extra-http-headers

**OBS references:**
- OBS Studio: https://obsproject.com/
- OBS recording settings: https://obsproject.com/wiki/Settings-Guide

**FFmpeg references:**
- Stream copy trim: https://ffmpeg.org/ffmpeg.html#Stream-copy
- Scale + crop filters: https://ffmpeg.org/ffmpeg-filters.html#scale-1
- CRF + preset: https://trac.ffmpeg.org/wiki/Encode/H.264

**Institutional learnings (memory):**
- `feedback-eye-in-loop-beats-calibration-for-motion.md` — direct
  observation over rubric metrics
- `feedback-verify-before-presenting.md` — render-MP4 review,
  not studio preview
- `user_harry.md` — Harry as potential capture-session participant
- `feedback-phase-plan-drafting-workflow.md` — write all phase
  files in one workflow; deepen sequentially after
