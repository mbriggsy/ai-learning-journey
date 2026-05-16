---
title: "Origin Trailer — Phase 4: Remotion Composite Build"
type: feat
phase: 4
parent: docs/plans/origin-trailer/roadmap.md
origin: docs/ideation/2026-05-15-origin-trailer-brainstorm.md
created: 2026-05-16
deepened: pending
reviewed: pending
status: active
---

# Phase 4 — Remotion Composite Build

## Overview

Phase 4 is where the trailer becomes a video. All six scenes get
implemented as Remotion components in `videos/trailer/src/scenes/`,
wired into a top-level `<Composition>` at `Root.tsx`, with Phase 2
audio + Phase 3 visual assets composited per the BEAT-SHEET.md cue
tables. The output is a studio-preview-quality MP4 renderable via
`pnpm render` — not yet the final QA-passed deliverable (that's
Phase 6), but visually complete and frame-accurate.

Phase 4 produces:

- `videos/trailer/src/Root.tsx` — top-level `<Composition id="BurnedTrailer">`
- `videos/trailer/src/TrailerComposition.tsx` — orchestrates all 6
  scenes + transitions
- `videos/trailer/src/scenes/S01_ColdOpen.tsx` — scene 1 component
- `videos/trailer/src/scenes/S02_BriefingSetup.tsx` — scene 2
- `videos/trailer/src/scenes/S03_MissionBackground.tsx` — scene 3
- `videos/trailer/src/scenes/S04_ReceiptsCascade.tsx` — scene 4 (load-
  bearing — R3 stacked payoff lives here)
- `videos/trailer/src/scenes/S05_GameplayDissolve.tsx` — scene 5
  (uses gameplay clip from Phase 5)
- `videos/trailer/src/scenes/S06_ClosingDirective.tsx` — scene 6
- `videos/trailer/src/transitions/` — 5 named transition components
  per Unit 1.4
- `videos/trailer/src/components/` — shared building blocks (R15
  stamps, operative-card frames, comms-ticker, etc.)
- `videos/trailer/sample-eval/composite-build/` — per-scene §2
  Archer test pass results, studio-preview screenshots at fixed
  timecodes, render-time measurements
- `videos/trailer/out/trailer-preview.mp4` — first complete render
  (studio-preview quality, not final QA)

Phase 4 exits when:
1. All 6 scenes render in studio preview without typecheck / render
   errors.
2. Each scene independently passes a §2 Archer test (visual cues
   match BEAT-SHEET.md per cue frame).
3. A full-runtime studio-preview render produces a 95-second MP4
   that plays end-to-end.
4. Briggsy signs off on the studio-preview pass for handoff to Phase 6.

---

## Problem Frame

Phases 1–3 produced specifications + assets. Phase 4 produces the
**composite**. The risk Phase 4 manages: **composition complexity**.

A scene like S04 (the cascade) integrates:
- HTP fullpage capture with `translateY` interpolation (Phase 3 Unit 3.1)
- 17 card-art halo arrangements with stamp-slap entries (Phase 3 Unit 3.2)
- 4 R15 chrome stamps + 1 comms-ticker pulse (Phase 3 Unit 3.4)
- 8 Dash VO cues spanning 33 seconds (Phase 2 audio manifest)
- 1 stacked-payoff stamp slap + 1.5-second silence beat (Phase 1 Unit 1.5)
- Cross-dissolve out via `<TransitionSeries>` + `fade()` (Phase 0 spike)

If ANY of those gets wired wrong, the cascade fails. Phase 4 absorbs
the integration risk through:

- **Per-scene componentization**: each scene is its own .tsx file
  with self-contained state + composition logic.
- **Shared component library**: R15 stamps, operative-card frames,
  comms-ticker, briefing-room background — built once in
  `src/components/`, imported by scenes.
- **Frame-constants-by-name**: all timing references go through
  `timing.ts` constants (Unit 1.1), not magic numbers.
- **Per-scene Archer test pass**: each scene independently renders +
  sampled at its cue frames vs BEAT-SHEET.md. Fails route to fix
  before Phase 4 exits.

Phase 4 is also the first time the trailer renders to actual MP4 at
studio-preview quality. Phase 0 Unit 0.5 spike validated the
integration mechanics (cross-dissolve, audio crossfade, custom-font
MP4 export, HTP placeholder). Phase 4 implements those for real, at
the trailer's full visual complexity.

The largest UNKNOWN entering Phase 4: **whether the cascade's stacked-
payoff visual lands at trailer scale**. Phase 1 Unit 1.5 specified the
layout (HTP centered + 17-mosaic halo + 4 captions + comms-ticker +
payoff stamp at frame 1950). Phase 4 implements it; Phase 4 Unit 4.9
Archer-tests it. If §2 fails, Phase 4 iterates the cascade layout
under Phase 1 Unit 1.5's lock (composition stays "layered
simultaneous"; specific element placement adjusts) — within scope, no
Phase 1 reopen.

---

## Critical Constraints Surfaced by Research

Cross-reference: roadmap §5, Phase 0 §Critical Constraints, Phase 0
Unit 0.5 spike outcomes.

### Remotion 4.0.438 + add-on packages locked

Per Phase 0 ADRs:
- **Remotion 4.0.438 pin** (ADR #1)
- **`@remotion/transitions`** (ADR #4) — for R3 cross-dissolve
- **`@remotion/media`** (ADR #5) — for `<Audio>` (newer than UMB's
  `Html5Audio`)
- **`@remotion/fonts`** (ADR #3) — for typography (self-hosted woff2)
- **`@remotion/lottie`** reserved if needed (ADR #6) — Phase 4 may
  use for chevron / reticle motion graphics if SVG is insufficient
- **`@remotion/skills`** (ADR #7) — Claude Code agent skills auto-
  load 28 rule files for Remotion work

These are installed in Phase 0 Unit 0.1; Phase 4 imports them.

### Phase 4 uses `<Series>` per-scene + `<TransitionSeries>` only at S04→S05 boundary

Per Phase 0 ADR #11: NOT every scene boundary gets `<TransitionSeries>`.
The cross-dissolve at S04→S05 (the R3 mechanic) gets one specifically.
Other boundaries (S01→S02 stamp slap, S02→S03 hard cut, S03→S04
dossier-page wipe, S05→S06 iris wipe, S06→end hard cut) use either
plain `<Series>` boundaries + per-scene transition overlay components
OR direct frame-cuts inside the master composition.

Architecturally:

```
TrailerComposition
├─ Series (or just sequenced Sequences)
│  ├─ <Sequence durationInFrames={210}><S01_ColdOpen /></Sequence>
│  ├─ <Sequence durationInFrames={360}><S02_BriefingSetup /></Sequence>
│  ├─ <Sequence durationInFrames={480}><S03_MissionBackground /></Sequence>
│  ├─ <TransitionSeries>  ← ONLY here, for R3 stacked-payoff bridge
│  │   ├─ <TransitionSeries.Sequence durationInFrames={990}><S04_ReceiptsCascade /></TransitionSeries.Sequence>
│  │   ├─ <TransitionSeries.Transition presentation={fade()} timing={linearTiming({durationInFrames: 45})} />
│  │   ├─ <TransitionSeries.Sequence durationInFrames={540}><S05_GameplayDissolve /></TransitionSeries.Sequence>
│  │   └─ ...
│  └─ <Sequence durationInFrames={270}><S06_ClosingDirective /></Sequence>
└─ <Audio> for music-bed.mp3 spanning full runtime
```

Transitions internal to a scene (e.g., S01's stamp-slap closing into
S02's briefing-room reveal) get implemented as per-scene React overlay
components within `S01_ColdOpen.tsx` / `S02_BriefingSetup.tsx`.

### `m` from `motion/react`, NOT `motion` (LazyMotion strict mode)

Per BURNED CLAUDE.md "Framer Motion" section: components use `m` from
`motion/react`, never `motion`. **This is BURNED's rule**, NOT
Remotion's — but Phase 4 scene files MAY use Framer Motion for some
animations (the brainstorm/spec don't preclude it).

**Lock**: Phase 4 uses Remotion's `interpolate()` + `useCurrentFrame()`
for the vast majority of animations. Framer Motion is NOT imported
into the trailer project — Remotion has its own animation model
designed for frame-accurate render. Mixing would introduce
non-determinism (Framer Motion uses real time / requestAnimationFrame;
Remotion's render walks frames synchronously). Single animation
paradigm = simpler debugging.

### Animation paradigm: pure-Remotion `interpolate()` + `spring()`

Standard pattern per scene:

```tsx
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

export const S01_ColdOpen: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Operative card flash entry (frame 0–30 ease-in)
  const cardOpacity = interpolate(frame, [0, 30], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Spring for stamp-slap entries (Archer-grammar transition #2)
  const stampScale = spring({
    frame: frame - 150,        // R15 #1 stamp lands at frame 150
    fps,
    config: { mass: 0.6, damping: 12, stiffness: 200 },
  });

  return (...);
};
```

Pattern adapted from UMB v3 scene files; Phase 4 may iterate spring
configs per scene aesthetic.

### Scene-internal animation libraries

Phase 4 produces a small `src/lib/animations.ts` with reusable
animation curve helpers:

```ts
// src/lib/animations.ts
import { interpolate, spring } from 'remotion';
import type { SpringConfig } from 'remotion';

export const ARCHER_STAMP_SPRING: SpringConfig = {
  mass: 0.6,
  damping: 12,
  stiffness: 200,
};

export const EASE_OUT_QUART = (t: number) => 1 - Math.pow(1 - t, 4);

export function archerStampSlap(frame: number, fps: number, landFrame: number) {
  return spring({ frame: frame - landFrame, fps, config: ARCHER_STAMP_SPRING });
}

// ... more helpers per scene need
```

### Per-scene Archer test pass

Each scene must independently pass §2 ("could this look like a frame
from an Archer episode?"). Phase 4 Unit 4.9 implements a per-scene
test where Phase 4 renders each scene as a standalone composition
+ samples a fixed set of frames + Briggsy reviews against §2.

If a scene fails: iterate the scene composition. Common failure modes:
- "Too busy" — too many elements competing at the same frame; reduce
  to 1 hero element + 1 supporting layer.
- "Reads generic" — typography / color drifted from BURNED palette;
  re-apply tokens.
- "Wrong era" — anachronistic element (modern UI shape, gradient that
  doesn't match Bass/Mancini lineage). Replace.

### Studio preview vs production render

Phase 4 ships studio-preview quality, NOT production-final QA. Two
quality bars:

- **Studio preview**: `pnpm studio` renders frames in real-time for
  iteration. Lower-quality previews. CRF target N/A (studio doesn't
  encode H264).
- **Production render**: `pnpm render` produces final H264 MP4 at
  CRF 18, 1920×1080, 30fps. THIS is the Phase 6 deliverable.

Phase 4 exits with a `pnpm render` producing `out/trailer-preview.mp4`
— a render that completes successfully end-to-end, even if Phase 6
QA hasn't yet stress-tested every frame. Studio-preview is for
Phase 4 iteration; production render is for Phase 6 QA.

### Phase 5 dependency: gameplay clip

S05 (`S05_GameplayDissolve.tsx`) needs `videos/trailer/public/
gameplay.mp4` from Phase 5. Phase 4 CAN proceed in parallel with
Phase 5 by stubbing the gameplay clip with a placeholder (e.g., a
1920×1080 black frame or UMB's gameplay-substitute PNG animated via
translateY). When Phase 5 lands, Phase 4 swaps the stub for the real
clip — single-line edit in `S05_GameplayDissolve.tsx`.

---

## Requirements Trace

- **R1** (in-world Pendleton briefing): Units 4.3 + 4.4 + 4.7
  (briefing-room scenes apply background + chrome).
- **R3** (stacked-climax visual + audio reveal): Unit 4.5 + Unit 4.8
  (cross-dissolve transition).
- **R4** (Dash sustained narration): Unit 4.1 + every scene's
  `<Audio>` placement.
- **R5** (scream cameo, conditional): Unit 4.6 (S05 scream cue at
  frame 2400).
- **R6** (Pendleton vocabulary discipline): inherited — no Phase 4
  rewrites the script.
- **R7** (90–100s runtime, 6 scenes): Unit 4.1 (composition wiring).
- **R8** (16:9 landscape, mobile-safe central square): per-scene
  safe-square audit in Unit 4.9.
- **R9** (Archer-coded music bed): Unit 4.1 (music-bed `<Audio>`
  spans full runtime).
- **R10** (HTP dossier hero): Unit 4.5 cascade.
- **R11** (goofy stats overlays): Unit 4.5 cascade caption layer.
- **R12** (Imagen card-art curation): Units 4.2 (cold-open flashes)
  + 4.4 (S03 roster reveal) + 4.5 (cascade halo).
- **R13** (gameplay footage closer): Unit 4.6 (S05 — depends on
  Phase 5 deliverable).
- **R14** (compressed-Archer cold-open): Unit 4.2.
- **R15** (on-screen text signal layer): Units 4.2 (R15 #1) + 4.5
  (R15 #2 + #3) + 4.7 (R15 #4).

---

## Key Technical Decisions

- **Per-scene component file** (`S01_ColdOpen.tsx` etc.), composed in
  `TrailerComposition.tsx`. Each scene exports a single default
  `React.FC` that renders all visual layers for its frame range.
- **Shared building-block components** live in `src/components/`:
  `R15Stamp.tsx`, `OperativeCardFrame.tsx`, `CommsTicker.tsx`,
  `BriefingRoomBackground.tsx`, `DossierFolder.tsx`,
  `PendletonCrest.tsx`. Imported by scenes; centralizes treatment
  consistency.
- **Animation helpers in `src/lib/animations.ts`**. Centralizes
  spring configs + interpolate patterns.
- **Frame constants imported from `src/lib/timing.ts`** (Phase 1
  Unit 1.1). No magic numbers in scene files.
- **Audio assets imported from `src/lib/audio-manifest.ts`** (Phase 2
  Unit 2.8). Each cue placed at `<Audio from={cue.startFrame}>`.
- **Visual assets imported via `staticFile()` + paths from
  `src/lib/visual-manifest.ts`** (Phase 3 Unit 3.7).
- **R3 cross-dissolve via `<TransitionSeries>`** only at S04→S05
  (Phase 0 ADR #11). Other transitions: per-scene overlay components.
- **Per-scene Archer test pass mandatory before composition assembly**
  (Unit 4.9). A scene that hasn't passed §2 standalone gets fixed
  before integration.
- **Studio preview = iteration; production render = Phase 6.** Phase 4
  outputs `out/trailer-preview.mp4` as the studio-preview-quality
  reference; Phase 6 produces the final H264/CRF 18 deliverable.
- **Tree-shake guard**: trailer project is isolated; nothing imports
  from BURNED's `src/client/` (which would defeat the trailer's
  isolated-package architecture). All visual content composes from
  Phase 3 static assets.

---

## Implementation Units

### Unit 4.1 — Composition Wiring + Music Bed

- [ ] **Unit 4.1: Composition Wiring + Music Bed**

**Goal:** Wire `Root.tsx` + `TrailerComposition.tsx` to orchestrate
all 6 scenes, place the music bed `<Audio>` spanning the full runtime,
and produce a renderable composition the studio preview can boot.

**Requirements:** R7, R9.

**Dependencies:** Phase 1 Unit 1.1 (timing.ts), Phase 2 Unit 2.8
(audio manifest), Phase 3 Unit 3.5 (music-bed.mp3), Phase 3 Unit 3.7
(visual manifest), Phase 0 Unit 0.1 (scaffold + package set), Phase 0
Unit 0.5 (composite spike).

**Files:**

- Edit: `videos/trailer/src/Root.tsx` — top-level `<Composition>`.
- Create: `videos/trailer/src/TrailerComposition.tsx` — full
  composition orchestrator.
- Edit: `videos/trailer/src/hooks/useFonts.ts` — replaces stub from
  Phase 0 Unit 0.1.
- Create: `videos/trailer/sample-eval/composite-build/scaffold.md` —
  verification of studio-preview boot.

**Approach:**

**Step 1 — `Root.tsx`.**

```tsx
// videos/trailer/src/Root.tsx
import React from 'react';
import { Composition } from 'remotion';
import { TrailerComposition } from './TrailerComposition';
import { TOTAL_FRAMES, FPS } from './lib/timing';
import { useFonts } from './hooks/useFonts';

export const RemotionRoot: React.FC = () => {
  useFonts();
  return (
    <>
      <Composition
        id="BurnedTrailer"
        component={TrailerComposition}
        durationInFrames={TOTAL_FRAMES}
        fps={FPS}
        width={1920}
        height={1080}
      />
    </>
  );
};
```

**Step 2 — `TrailerComposition.tsx`.**

```tsx
// videos/trailer/src/TrailerComposition.tsx
import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile } from 'remotion';
import { TransitionSeries, linearTiming } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import {
  S01_END, S02_START, S02_END, S03_START, S03_END,
  S04_START, S04_END, S05_START, S05_END, S06_START, S06_END,
  CROSS_DISSOLVE_DURATION_FRAMES,
} from './lib/timing';
import { S01_ColdOpen } from './scenes/S01_ColdOpen';
import { S02_BriefingSetup } from './scenes/S02_BriefingSetup';
import { S03_MissionBackground } from './scenes/S03_MissionBackground';
import { S04_ReceiptsCascade } from './scenes/S04_ReceiptsCascade';
import { S05_GameplayDissolve } from './scenes/S05_GameplayDissolve';
import { S06_ClosingDirective } from './scenes/S06_ClosingDirective';
import { MusicBed } from './components/MusicBed';

export const TrailerComposition: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      {/* Music bed spans full runtime; volume interpolates per Phase 1 Unit 1.7 cue map */}
      <MusicBed />

      {/* Scenes 1, 2, 3 — sequential */}
      <Sequence from={0} durationInFrames={S01_END}>
        <S01_ColdOpen />
      </Sequence>
      <Sequence from={S02_START} durationInFrames={S02_END - S02_START}>
        <S02_BriefingSetup />
      </Sequence>
      <Sequence from={S03_START} durationInFrames={S03_END - S03_START}>
        <S03_MissionBackground />
      </Sequence>

      {/* Scenes 4 + 5 — TransitionSeries bridges the R3 cross-dissolve */}
      <Sequence from={S04_START}>
        <TransitionSeries>
          <TransitionSeries.Sequence durationInFrames={S04_END - S04_START}>
            <S04_ReceiptsCascade />
          </TransitionSeries.Sequence>
          <TransitionSeries.Transition
            presentation={fade()}
            timing={linearTiming({ durationInFrames: CROSS_DISSOLVE_DURATION_FRAMES })}
          />
          <TransitionSeries.Sequence durationInFrames={S05_END - S05_START}>
            <S05_GameplayDissolve />
          </TransitionSeries.Sequence>
        </TransitionSeries>
      </Sequence>

      {/* Scene 6 — closing directive */}
      <Sequence from={S06_START} durationInFrames={S06_END - S06_START}>
        <S06_ClosingDirective />
      </Sequence>
    </AbsoluteFill>
  );
};
```

**Step 3 — `MusicBed.tsx` (full-runtime audio).**

```tsx
// videos/trailer/src/components/MusicBed.tsx
import React from 'react';
import { Audio, interpolate, staticFile } from 'remotion';

/**
 * Music bed spanning the full trailer runtime.
 * Volume curve per Phase 1 Unit 1.7 Step 5 music-cue map.
 *
 * Frame ranges + target volumes:
 *   0–60     intro hook       100%
 *   60–210   cold-open bed    40%
 *   210–570  underscore build 50%
 *   570–1050 continue build   55%
 *   1050–1680 cascade swell   60–75%
 *   1680–1860 peak intensify  90%
 *   1860–1950 peak hold       90%
 *   1950–1995 sharp drop      30%
 *   1995–2040 cross-dissolve  25%
 *   2040–2535 gameplay sparse 25%
 *   2535–2580 iris-wipe up    50%
 *   2580–2790 closing under   60%
 *   2790–2850 final sting     100%
 */
export const MusicBed: React.FC = () => (
  <Audio
    src={staticFile('audio/music-bed.mp3')}
    volume={(f) => {
      // Piecewise-linear envelope; interpolate via Remotion helper
      return interpolate(
        f,
        [   0,  60, 210, 570, 1050, 1680, 1860, 1950, 1995, 2040, 2535, 2580, 2790, 2850],
        [1.00, 1.00, 0.40, 0.50, 0.55, 0.75, 0.90, 0.90, 0.30, 0.25, 0.25, 0.50, 0.60, 1.00],
        { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
      );
    }}
  />
);
```

**Step 4 — `useFonts.ts` (per Phase 1 Unit 1.8).**

Phase 1 Unit 1.8 implementation lives here. Replaces Phase 0 Unit 0.1
stub. Loads 6 woff2 weights across Clash Display + General Sans +
JetBrains Mono.

**Step 5 — Studio-preview boot verification.**

```
pnpm studio
```

Expected: Remotion studio boots in browser; "BurnedTrailer" composition
listed; clicking it opens the timeline at 95 seconds; scrubbing
through frames reveals each scene at its expected timecode (initially
all blank stubs from skeletal scene files).

`scaffold.md`:
```md
# Composition Scaffold — Verified <date>

- Root.tsx: BurnedTrailer composition registered
- TrailerComposition: 6 scenes wired (placeholder stubs in scenes/)
- TransitionSeries bridge: S04→S05 cross-dissolve, 45 frames
- MusicBed: full runtime, 14-point volume envelope
- useFonts: 6 weights load via loadFont; render auto-blocks until ready
- Studio boot: PASS (composition visible at 95.0s)
```

**Patterns to follow:**

- UMB v3 `Root.tsx` + main composition pattern.
- Phase 0 Unit 0.5 spike composition wiring.

**Test scenarios:**

- **Happy path:** Studio boots; composition lists; scrubbing through
  reveals scene boundaries at expected frames.
- **Edge case:** Missing audio asset → render fails at MusicBed
  staticFile; clear error.
- **Edge case:** Missing font asset → loadFont rejects; render fails
  early with clear error.

**Verification:**

- `Root.tsx` typechecks; studio boots.
- `TrailerComposition.tsx` typechecks; scene stubs imported (Units
  4.2–4.7 will fill).
- `scaffold.md` verifies boot.

---

### Unit 4.2 — S01 Cold Open Scene

- [ ] **Unit 4.2: S01 Cold Open Scene**

**Goal:** Implement `S01_ColdOpen.tsx` — 7-second compressed-Archer
title sequence. 3 operative card flashes + R15 #1 classification
stamp + BURNED logo land + cold-open speaker VO + brass hook intro.

**Requirements:** R14 (cold-open), R15 (R15 #1), R4 (cold-open speech).

**Dependencies:** Unit 4.1 (composition), Phase 3 visual assets
(operative-card-frame.svg, chevron-motif-bg.svg, burned-logo-cold-
open.svg, R15 #1 stamp, cold-open card portraits), Phase 2 audio
manifest (s01-cue-60-coldopen.wav).

**Files:**

- Create: `videos/trailer/src/scenes/S01_ColdOpen.tsx`
- Create: `videos/trailer/src/components/OperativeCardFrame.tsx`
- Create: `videos/trailer/src/components/R15Stamp.tsx`
- Create: `videos/trailer/sample-eval/composite-build/s01-archer-test.md`

**Approach:**

**Step 1 — Scene component skeleton.**

```tsx
// videos/trailer/src/scenes/S01_ColdOpen.tsx
import React from 'react';
import {
  AbsoluteFill, Audio, Img, interpolate, spring,
  useCurrentFrame, useVideoConfig, staticFile,
} from 'remotion';
import { OperativeCardFrame } from '../components/OperativeCardFrame';
import { R15Stamp } from '../components/R15Stamp';
import { archerStampSlap } from '../lib/animations';
import { COLD_OPEN_CARDS } from '../lib/card-roster';
import { AUDIO_ASSETS } from '../lib/audio-manifest';

const COLD_OPEN_AUDIO = AUDIO_ASSETS.find(a => a.startFrame === 60)!;

export const S01_ColdOpen: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // ─── Card flash schedule ────────────────────────────────────
  // 3 operative cards, each visible 1.5–2s, staggered:
  //   Card 1 (cold-open speaker portrait):  frames 30–90    (2s)
  //   Card 2 (Dash portrait):                frames 90–150   (2s)
  //   Card 3 (third operative):              frames 150–180  (1s, briefer)
  // After frame 180: BURNED logo lands; R15 #1 stamp slaps at 150.

  const card1Opacity = interpolate(frame, [25, 30, 80, 90], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const card2Opacity = interpolate(frame, [85, 90, 140, 150], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const card3Opacity = interpolate(frame, [145, 150, 170, 180], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // BURNED logo land at frame 180 with spring
  const logoSpring = spring({
    frame: frame - 180,
    fps,
    config: { mass: 0.4, damping: 12, stiffness: 220 },
  });
  const logoScale = interpolate(logoSpring, [0, 1], [0.6, 1]);
  const logoOpacity = interpolate(frame, [175, 180], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ background: '#1a1a1a' }}>
      {/* Background chevron pattern */}
      <Img
        src={staticFile('assets/title-sequence/chevron-motif-bg.svg')}
        style={{ position: 'absolute', width: '100%', height: '100%' }}
      />

      {/* Card 1 — cold-open speaker portrait */}
      <AbsoluteFill style={{ opacity: card1Opacity, justifyContent: 'center', alignItems: 'center' }}>
        <OperativeCardFrame
          portraitFile={COLD_OPEN_CARDS[0].filename}
          operativeName={COLD_OPEN_CARDS[0].displayName}
        />
      </AbsoluteFill>

      {/* Card 2 — Dash portrait */}
      <AbsoluteFill style={{ opacity: card2Opacity, justifyContent: 'center', alignItems: 'center' }}>
        <OperativeCardFrame
          portraitFile={COLD_OPEN_CARDS[1].filename}
          operativeName={COLD_OPEN_CARDS[1].displayName}
        />
      </AbsoluteFill>

      {/* Card 3 — third operative */}
      <AbsoluteFill style={{ opacity: card3Opacity, justifyContent: 'center', alignItems: 'center' }}>
        <OperativeCardFrame
          portraitFile={COLD_OPEN_CARDS[2].filename}
          operativeName={COLD_OPEN_CARDS[2].displayName}
        />
      </AbsoluteFill>

      {/* R15 #1 classification stamp lands at frame 150 */}
      <R15Stamp
        svgFile="assets/r15-chrome/stamp-1-operation-pendleton.svg"
        anchor="bottom-left"
        offsetPx={{ x: 80, y: 80 }}
        landFrame={150}
      />

      {/* BURNED logo lands at frame 180 */}
      <AbsoluteFill style={{
        opacity: logoOpacity,
        transform: `scale(${logoScale})`,
        justifyContent: 'center',
        alignItems: 'center',
      }}>
        <Img src={staticFile('assets/title-sequence/burned-logo-cold-open.svg')} style={{ width: 1200 }} />
      </AbsoluteFill>

      {/* Cold-open speaker VO */}
      <Audio src={staticFile(COLD_OPEN_AUDIO.staticPath)} />
    </AbsoluteFill>
  );
};
```

(Note: the Audio inside a `<Sequence from={0}>` plays from the scene's
start; cue.startFrame=60 means the WAV's first sample should be at
scene-relative frame 60. Phase 4 verifies this in Unit 4.9 — VO line
lands at the right point relative to card flashes.)

**Step 2 — `OperativeCardFrame.tsx`.**

```tsx
// videos/trailer/src/components/OperativeCardFrame.tsx
import React from 'react';
import { Img, staticFile } from 'remotion';

export const OperativeCardFrame: React.FC<{
  portraitFile: string;
  operativeName: string;
}> = ({ portraitFile, operativeName }) => (
  <div style={{ position: 'relative', width: 800, height: 1000 }}>
    {/* Chrome template */}
    <Img
      src={staticFile('assets/title-sequence/operative-card-frame.svg')}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
    />
    {/* Portrait fills center region */}
    <Img
      src={staticFile(`assets/cards/${portraitFile}`)}
      style={{ position: 'absolute', top: 100, left: 100, width: 600, height: 700, objectFit: 'cover' }}
    />
    {/* Operative name overlay (the template's name-plate strip is at y=840) */}
    <div style={{
      position: 'absolute',
      top: 870,
      left: 0,
      right: 0,
      textAlign: 'center',
      fontFamily: 'Clash Display',
      fontWeight: 700,
      fontSize: 72,
      color: '#1a1a1a',
    }}>
      {operativeName.toUpperCase()}
    </div>
  </div>
);
```

**Step 3 — `R15Stamp.tsx`.**

```tsx
// videos/trailer/src/components/R15Stamp.tsx
import React from 'react';
import { Img, spring, useCurrentFrame, useVideoConfig, staticFile, interpolate } from 'remotion';
import { ARCHER_STAMP_SPRING } from '../lib/animations';

export const R15Stamp: React.FC<{
  svgFile: string;
  anchor: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right' | 'center';
  offsetPx?: { x: number; y: number };
  landFrame: number;
}> = ({ svgFile, anchor, offsetPx = { x: 0, y: 0 }, landFrame }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const slap = spring({
    frame: frame - landFrame,
    fps,
    config: ARCHER_STAMP_SPRING,
  });
  const scale = interpolate(slap, [0, 0.9, 1], [1.4, 0.95, 1]);
  const rotation = interpolate(slap, [0, 1], [-15, 0]);
  const opacity = interpolate(frame, [landFrame - 5, landFrame], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  const anchorStyle: React.CSSProperties = (() => {
    switch (anchor) {
      case 'bottom-left':  return { position: 'absolute', bottom: offsetPx.y, left:  offsetPx.x };
      case 'bottom-right': return { position: 'absolute', bottom: offsetPx.y, right: offsetPx.x };
      case 'top-left':     return { position: 'absolute', top:    offsetPx.y, left:  offsetPx.x };
      case 'top-right':    return { position: 'absolute', top:    offsetPx.y, right: offsetPx.x };
      case 'center':       return { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
    }
  })();

  return (
    <div style={{ ...anchorStyle, transform: `${anchorStyle.transform ?? ''} scale(${scale}) rotate(${rotation}deg)`, opacity }}>
      <Img src={staticFile(svgFile)} />
    </div>
  );
};
```

**Step 4 — Per-scene Archer test.**

`s01-archer-test.md`:

```md
# S01 Cold Open — Archer Test

## Sample frames at fixed timecodes
- [ ] Frame 30 (1.0s in): card 1 (cold-open speaker portrait) full opacity
- [ ] Frame 90 (3.0s in): card 2 (Dash portrait) full opacity, card 1 faded
- [ ] Frame 150 (5.0s in): card 3 active + R15 #1 stamp landing
- [ ] Frame 180 (6.0s in): BURNED logo landing, all cards faded
- [ ] Frame 210 (7.0s — scene end): stamp + logo holding

## §2 Quality Bar (per BURNED CLAUDE.md)
- [ ] Could this frame be from an Archer episode? (yes/no per frame)
- [ ] Composition discipline (clear hero element + supporting layers)
- [ ] Palette discipline (BURNED tokens, no off-palette colors)
- [ ] Typographic discipline (Clash Display + JetBrains Mono only)

## R14 acceptance
- [ ] Compressed-Archer shape lands within 8s (cold-open is 7s)
- [ ] 3 operative cards flash
- [ ] BURNED logo treatment lands
- [ ] R15 #1 stamp (METHOD: AUTONOMOUS) reads at frame 150+
- [ ] Cold-open speaker VO audible (Phase 2 audio)

## Verdict
- PASS / FAIL / iterate
```

**Step 5 — Render verification.**

Render S01 as standalone composition:
```
pnpm render -- --composition=S01ColdOpen
```

Per-scene render produces `out/s01-coldopen.mp4`. Briggsy reviews
against the test card.

**Patterns to follow:**

- UMB v3 scene file structure: `projects/undercover-mob-boss/videos/trailer/src/scenes/V3S01_ColdOpen.tsx`
- Phase 1 Unit 1.2 Step 2 (cold-open line) + Unit 1.10 (visual cues
  for cold open)

**Test scenarios:**

- **Happy path:** S01 renders end-to-end at studio preview; all 5
  test-frame samples pass §2.
- **Edge case:** Missing operative card webp → render fails at
  staticFile with clear error.
- **Edge case:** R15 stamp lands too soft → tune ARCHER_STAMP_SPRING
  config (mass / damping / stiffness).

**Verification:**

- `S01_ColdOpen.tsx` typechecks + renders.
- `s01-archer-test.md` all green.
- `out/s01-coldopen.mp4` plays cleanly.

---

### Unit 4.3 — S02 Briefing Setup Scene

- [ ] **Unit 4.3: S02 Briefing Setup Scene**

**Goal:** Implement `S02_BriefingSetup.tsx` — 12-second briefing-room
establishing shot. Venetian-blind shadow + dossier opens + Pendleton
crest watermark + Dash VO + comms-ticker idle text.

**Requirements:** R1, R4.

**Dependencies:** Unit 4.1, Phase 3 briefing-room assets (mahogany-
desk, venetian-blinds, dossier-folder-open, pendleton-crest, case-
banner-strip, comms-ticker-strip), Phase 2 audio (s02-cue-240-dash.wav).

**Files:**

- Create: `videos/trailer/src/scenes/S02_BriefingSetup.tsx`
- Create: `videos/trailer/src/components/BriefingRoomBackground.tsx`
- Create: `videos/trailer/src/components/DossierFolder.tsx`
- Create: `videos/trailer/src/components/PendletonCrest.tsx`
- Create: `videos/trailer/src/components/CommsTicker.tsx`
- Create: `videos/trailer/sample-eval/composite-build/s02-archer-test.md`

**Approach:**

**Step 1 — `BriefingRoomBackground.tsx`** (shared S02 + S03 + S06).

```tsx
// videos/trailer/src/components/BriefingRoomBackground.tsx
import React from 'react';
import { AbsoluteFill, Img, interpolate, useCurrentFrame, staticFile } from 'remotion';

export const BriefingRoomBackground: React.FC = () => {
  const frame = useCurrentFrame();
  // Venetian-blind shadow slowly translates across the desk
  const shadowOffset = interpolate(frame, [0, 360], [0, 60], {
    extrapolateRight: 'clamp',
  });
  return (
    <AbsoluteFill>
      <Img
        src={staticFile('assets/briefing-room/mahogany-desk.png')}
        style={{ position: 'absolute', width: '100%', height: '100%', objectFit: 'cover' }}
      />
      <Img
        src={staticFile('assets/briefing-room/venetian-blinds.svg')}
        style={{
          position: 'absolute', width: '100%', height: '100%',
          transform: `translateX(${shadowOffset}px)`,
          opacity: 0.6,
        }}
      />
    </AbsoluteFill>
  );
};
```

**Step 2 — `DossierFolder.tsx`** (open + close states with animated
transition).

```tsx
// videos/trailer/src/components/DossierFolder.tsx
import React from 'react';
import { Img, interpolate, useCurrentFrame, staticFile } from 'remotion';

export const DossierFolder: React.FC<{
  /** State of folder over time: closed at openStart-30, fully open at openStart+30. */
  openStart: number;
  /** Optional closing animation; -1 disables. */
  closeStart?: number;
}> = ({ openStart, closeStart = -1 }) => {
  const frame = useCurrentFrame();

  // Folder reads as a 60-frame open animation; closeStart triggers reverse.
  const opening = interpolate(frame, [openStart, openStart + 60], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const closing = closeStart > 0
    ? interpolate(frame, [closeStart, closeStart + 30], [0, 1], {
        extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
      })
    : 0;
  const openProgress = Math.max(0, opening - closing);

  return (
    <div style={{
      position: 'absolute',
      top: '50%', left: '50%',
      transform: 'translate(-50%, -50%)',
      width: 1000, height: 1300,
    }}>
      {/* Closed folder visible 0 → 1, fades out as openProgress increases */}
      <Img
        src={staticFile('assets/briefing-room/dossier-folder-closed.svg')}
        style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          opacity: 1 - openProgress,
        }}
      />
      {/* Open folder visible at openProgress 1 */}
      <Img
        src={staticFile('assets/briefing-room/dossier-folder-open.svg')}
        style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          opacity: openProgress,
        }}
      />
    </div>
  );
};
```

**Step 3 — `PendletonCrest.tsx` watermark.**

```tsx
// videos/trailer/src/components/PendletonCrest.tsx
import React from 'react';
import { Img, staticFile } from 'remotion';

export const PendletonCrest: React.FC<{
  size: number;
  position: { top?: number; right?: number; bottom?: number; left?: number };
  opacity?: number;
}> = ({ size, position, opacity = 0.4 }) => (
  <Img
    src={staticFile('assets/briefing-room/pendleton-crest.svg')}
    style={{ position: 'absolute', width: size, height: size, opacity, ...position }}
  />
);
```

**Step 4 — `CommsTicker.tsx`** (idle text rotation matching BURNED's
DossierFeed pattern).

```tsx
// videos/trailer/src/components/CommsTicker.tsx
import React from 'react';
import { Img, interpolate, useCurrentFrame, staticFile } from 'remotion';

// Idle lines from BURNED DossierFeed.tsx:20-25
const IDLE_LINES = [
  'CHANNEL OPEN',
  'STANDING BY',
  'AWAITING TRANSMISSION',
  'INTERCEPT CLEAR',
];

export const CommsTicker: React.FC<{
  /** Frame at which the ticker becomes visible. */
  fromFrame?: number;
  /** Optional override copy (e.g., R15 #2 active state). */
  text?: string;
}> = ({ fromFrame = 0, text }) => {
  const frame = useCurrentFrame();
  if (frame < fromFrame) return null;
  // Rotate idle text every 90 frames (~3s); pick fixed text if specified
  const idleIndex = Math.floor((frame - fromFrame) / 90) % IDLE_LINES.length;
  const display = text ?? IDLE_LINES[idleIndex];
  const opacity = interpolate(frame, [fromFrame, fromFrame + 15], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0, height: 40,
      backgroundColor: '#1a1a1a',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'JetBrains Mono', fontWeight: 500, fontSize: 22,
      color: '#947226',
      opacity,
    }}>
      // {display}
    </div>
  );
};
```

**Step 5 — `S02_BriefingSetup.tsx`.**

```tsx
// videos/trailer/src/scenes/S02_BriefingSetup.tsx
import React from 'react';
import { AbsoluteFill, Audio, staticFile } from 'remotion';
import { BriefingRoomBackground } from '../components/BriefingRoomBackground';
import { DossierFolder } from '../components/DossierFolder';
import { PendletonCrest } from '../components/PendletonCrest';
import { CommsTicker } from '../components/CommsTicker';
import { AUDIO_ASSETS } from '../lib/audio-manifest';

// S02 frames 210–570 in absolute; the scene component runs frames 0–360 relative.
// Dash VO cue 240 absolute = frame 30 relative (after 1s of establishing).
const DASH_AUDIO = AUDIO_ASSETS.find(a => a.startFrame === 240)!;

export const S02_BriefingSetup: React.FC = () => {
  return (
    <AbsoluteFill>
      <BriefingRoomBackground />
      <DossierFolder openStart={30} />     {/* Folder opens at scene-relative frame 30 (= abs 240) */}
      <PendletonCrest size={120} position={{ top: 60, left: 60 }} opacity={0.3} />
      <CommsTicker fromFrame={0} />

      {/* Dash VO at scene-relative frame 30 */}
      <Audio src={staticFile(DASH_AUDIO.staticPath)} startFrom={0} />
    </AbsoluteFill>
  );
};
```

**Step 6 — Per-scene Archer test.**

`s02-archer-test.md` mirrors S01 pattern:

```md
# S02 Briefing Setup — Archer Test

## Sample frames
- [ ] Frame 0 (scene start): briefing-room background establishes, dossier closed
- [ ] Frame 60 (2s in): dossier opening animation in progress (~50%)
- [ ] Frame 120 (4s in): folder open, case-sheet visible, Dash VO playing
- [ ] Frame 240 (8s in): mid-Dash VO, ticker rotating idle text
- [ ] Frame 360 (12s — scene end): scene-end posture before S03 cut

## §2 Quality Bar
- [ ] Mahogany desk reads warm + Archer-coded
- [ ] Venetian-blind shadow subtle, not theatrical
- [ ] Folder opening choreography natural (not too fast)
- [ ] Comms-ticker chrome reads as set-dressing, not UI
- [ ] Dash VO clearly audible over music bed

## Verdict: PASS / FAIL / iterate
```

**Patterns to follow:**

- Phase 1 Unit 1.10 S02 visual cues (background + folder + crest + ticker).
- UMB v3 establishing-shot pattern (V3S02 / V3S03 references).

**Test scenarios:**

- **Happy path:** S02 renders; folder opens cleanly; Dash VO syncs to
  open frame.
- **Edge case:** Folder closed/open SVG transition reads as a hard
  cut → ease curve adjustment in DossierFolder.
- **Audit:** Comms-ticker idle text rotation matches BURNED's actual
  DossierFeed rotation (read source for current strings).

**Verification:**

- `S02_BriefingSetup.tsx` typechecks + renders.
- `s02-archer-test.md` all green.
- Standalone render at `out/s02-briefing.mp4`.

---

### Unit 4.4 — S03 Mission Background Scene

- [ ] **Unit 4.4: S03 Mission Background Scene**

**Goal:** Implement `S03_MissionBackground.tsx` — 16-second roster
reveal scene. Dossier deepens into deck-of-120 reveal + 7 operative
portraits slide in along right edge + mid-scene dossier-page wipe +
Dash VO (two lines with mid-scene beat).

**Requirements:** R1, R4, R12 (operative portraits).

**Dependencies:** Unit 4.1, Unit 4.3 (briefing-room components),
Phase 3 card-roster, Phase 2 audio (s03-cue-600 + s03-cue-870).

**Files:**

- Create: `videos/trailer/src/scenes/S03_MissionBackground.tsx`
- Create: `videos/trailer/src/components/OperativeRosterReveal.tsx`
- Create: `videos/trailer/src/components/DeckOf120.tsx`
- Create: `videos/trailer/sample-eval/composite-build/s03-archer-test.md`

**Approach:**

**Step 1 — `DeckOf120.tsx`** — stylized representation.

12×10 grid of card backs (Pendleton crest watermarks). Approximation
of 120 cards, not literal. Animated reveal.

```tsx
// videos/trailer/src/components/DeckOf120.tsx
import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';

export const DeckOf120: React.FC<{ revealFrom: number }> = ({ revealFrom }) => {
  const frame = useCurrentFrame();
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)',
      gap: 8, width: 720, height: 600,
      position: 'absolute', top: '50%', left: '50%',
      transform: 'translate(-50%, -50%)',
    }}>
      {Array.from({ length: 120 }, (_, i) => {
        const cellRevealFrame = revealFrom + Math.floor(i / 12) * 3;
        const opacity = interpolate(frame, [cellRevealFrame, cellRevealFrame + 8], [0, 1], {
          extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
        });
        return (
          <div key={i} style={{
            backgroundColor: '#3a2218',
            border: '1px solid #947226',
            borderRadius: 4,
            opacity,
          }} />
        );
      })}
    </div>
  );
};
```

**Step 2 — `OperativeRosterReveal.tsx`.**

```tsx
// videos/trailer/src/components/OperativeRosterReveal.tsx
import React from 'react';
import { Img, interpolate, useCurrentFrame, staticFile } from 'remotion';
import { S03_ROSTER } from '../lib/card-roster';

export const OperativeRosterReveal: React.FC<{ slideFrom: number }> = ({ slideFrom }) => {
  const frame = useCurrentFrame();
  return (
    <>
      {S03_ROSTER.map((op, i) => {
        const opSlideFrame = slideFrom + i * 6;  // staggered entry
        const x = interpolate(frame, [opSlideFrame, opSlideFrame + 20], [200, 0], {
          extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
        });
        const opacity = interpolate(frame, [opSlideFrame, opSlideFrame + 20], [0, 1], {
          extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
        });
        return (
          <div key={op.filename} style={{
            position: 'absolute',
            right: 80, top: 80 + i * 140,
            width: 120, height: 168,
            transform: `translateX(${x}px)`,
            opacity,
          }}>
            <Img src={staticFile(`assets/cards/${op.filename}`)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        );
      })}
    </>
  );
};
```

**Step 3 — `S03_MissionBackground.tsx`.**

```tsx
// videos/trailer/src/scenes/S03_MissionBackground.tsx
import React from 'react';
import { AbsoluteFill, Audio, staticFile } from 'remotion';
import { BriefingRoomBackground } from '../components/BriefingRoomBackground';
import { OperativeRosterReveal } from '../components/OperativeRosterReveal';
import { DeckOf120 } from '../components/DeckOf120';
import { CommsTicker } from '../components/CommsTicker';
import { AUDIO_ASSETS } from '../lib/audio-manifest';

const FIRST_DASH = AUDIO_ASSETS.find(a => a.startFrame === 600)!;
const SECOND_DASH = AUDIO_ASSETS.find(a => a.startFrame === 870)!;

// Scene runs frames 0–480 relative (570–1050 absolute).
// First Dash VO at relative frame 30, second at relative frame 300.
// Mid-scene dossier-page wipe at relative frame ~270 (= abs 840).

export const S03_MissionBackground: React.FC = () => {
  return (
    <AbsoluteFill>
      <BriefingRoomBackground />

      {/* Operative roster slides in along right edge starting at relative frame 180 */}
      <OperativeRosterReveal slideFrom={180} />

      {/* Deck of 120 revealed mid-scene via dossier-page wipe at frame 270 */}
      <DeckOf120 revealFrom={270} />

      <CommsTicker fromFrame={0} />

      {/* Dash VO: first line at relative frame 30 (= abs 600) */}
      <Audio src={staticFile(FIRST_DASH.staticPath)} startFrom={0} />
      {/* Second Dash VO at relative frame 300 (= abs 870) — handled by scene-relative Sequence wrapping */}
      <Audio src={staticFile(SECOND_DASH.staticPath)} startFrom={0}
             /* Audio component supports `from` prop to gate WAV playback start frame */
             />
    </AbsoluteFill>
  );
};
```

(Note: Remotion's `<Audio>` doesn't have a per-instance `from` prop;
audio inside a `<Sequence from={300}>` plays starting at frame 300.
Phase 4 wraps the second Dash audio in a `<Sequence from={300}>`
inside the scene, OR places both audios at the TrailerComposition
level. Decision: keep audio at scene level — `S03_MissionBackground`
wraps each VO in its own `<Sequence>` for clarity.)

Revised scene composition:

```tsx
<AbsoluteFill>
  <BriefingRoomBackground />
  <OperativeRosterReveal slideFrom={180} />
  <DeckOf120 revealFrom={270} />
  <CommsTicker fromFrame={0} />

  <Sequence from={30} durationInFrames={FIRST_DASH.actualFrames}>
    <Audio src={staticFile(FIRST_DASH.staticPath)} />
  </Sequence>
  <Sequence from={300} durationInFrames={SECOND_DASH.actualFrames}>
    <Audio src={staticFile(SECOND_DASH.staticPath)} />
  </Sequence>
</AbsoluteFill>
```

**Step 4 — Per-scene Archer test.**

```md
# S03 Mission Background — Archer Test

## Sample frames
- [ ] Frame 0: scene starts, background continuous from S02
- [ ] Frame 60: first Dash VO mid-line
- [ ] Frame 180: roster begins sliding in along right edge
- [ ] Frame 270: dossier-page wipes; deck of 120 begins reveal
- [ ] Frame 360: deck mostly revealed, second Dash VO playing
- [ ] Frame 480 (scene end): deck fully revealed, roster all in place

## §2 Quality Bar
- [ ] Roster entry choreography reads as briefing-room formal
- [ ] Deck-of-120 reveals visually distinct from "card deck" UI cliché
- [ ] Each operative portrait readable at 120×168 thumbnail size
- [ ] Continuity with S02 mahogany desk + venetian-blind shadow
```

**Verification:**

- `S03_MissionBackground.tsx` typechecks + renders.
- `s03-archer-test.md` all green.
- Standalone render at `out/s03-mission.mp4`.

---

### Unit 4.5 — S04 Receipts Cascade (Load-Bearing)

- [ ] **Unit 4.5: S04 Receipts Cascade**

**Goal:** Implement `S04_ReceiptsCascade.tsx` — 33-second cascade
with stacked-payoff reveal. THE trailer's load-bearing scene; R3
mechanic lives here. HTP hero + 17-card halo + 4 goofy-stat captions
+ comms-ticker pulse + R15 #2 + #3 stamps + 8 Dash VO cues +
stacked-payoff stamp + payoff silence beat.

**Requirements:** R3, R10, R11, R12, R15.

**Dependencies:** Unit 4.1, Phase 1 Unit 1.5 cue table, Phase 3
all-of-Unit-3.2, Phase 3 Unit 3.4 (R15 #2 + #3), Phase 2 8 cascade
WAVs.

**Files:**

- Create: `videos/trailer/src/scenes/S04_ReceiptsCascade.tsx`
- Create: `videos/trailer/src/components/HtpDossierHero.tsx`
- Create: `videos/trailer/src/components/CardArtHalo.tsx`
- Create: `videos/trailer/src/components/GoofyStatCaption.tsx`
- Create: `videos/trailer/src/components/StackedPayoffStamp.tsx`
- Create: `videos/trailer/sample-eval/composite-build/s04-archer-test.md`

**Approach:**

**Step 1 — `HtpDossierHero.tsx`** (the load-bearing dossier scroll).

```tsx
// videos/trailer/src/components/HtpDossierHero.tsx
import React from 'react';
import { Img, interpolate, useCurrentFrame, staticFile } from 'remotion';

export const HtpDossierHero: React.FC<{
  /** Scene-relative frame at which the hero slides into position. */
  slideInFrom: number;
  /** Scene-relative frame at which scroll-down animation begins. */
  scrollFrom: number;
  /** Scene-relative frame at which scroll completes. */
  scrollTo: number;
  /** Total pixel range to scroll (negative — scroll up). */
  scrollRangePx: number;
}> = ({ slideInFrom, scrollFrom, scrollTo, scrollRangePx }) => {
  const frame = useCurrentFrame();

  // Slide-in: bottom-up entry, 60 frames
  const slideY = interpolate(frame, [slideInFrom, slideInFrom + 60], [200, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const slideOpacity = interpolate(frame, [slideInFrom, slideInFrom + 60], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  // Scroll: from 0 to scrollRangePx (negative for upward scroll)
  const scrollY = interpolate(frame, [scrollFrom, scrollTo], [0, scrollRangePx], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  return (
    <div style={{
      position: 'absolute',
      top: '50%', left: '50%',
      width: 720,
      height: 1080,
      transform: `translate(-50%, -50%) translateY(${slideY}px)`,
      opacity: slideOpacity,
      overflow: 'hidden',
    }}>
      <Img
        src={staticFile('htp-fullpage.png')}
        style={{
          width: '100%',
          transform: `translateY(${scrollY}px)`,
        }}
      />
    </div>
  );
};
```

**Step 2 — `CardArtHalo.tsx`** (17-card mosaic encircling HTP hero).

```tsx
// videos/trailer/src/components/CardArtHalo.tsx
import React from 'react';
import { Img, interpolate, useCurrentFrame, staticFile } from 'remotion';
import { CASCADE_HALO_17 } from '../lib/card-roster';

// 17 cards arranged in a ring around the HTP hero.
// Computed positions on an ellipse outside the hero rect.
// Two phases:
//   1. 3-card right-edge halo opener (frames 360–510)
//   2. 17-mosaic full halo expand (frames 510–810)

const CENTER_X = 1920 / 2;
const CENTER_Y = 1080 / 2;
const RADIUS_X = 720;
const RADIUS_Y = 480;

export const CardArtHalo: React.FC<{
  threeCardFrom: number;
  seventeenCardFrom: number;
}> = ({ threeCardFrom, seventeenCardFrom }) => {
  const frame = useCurrentFrame();

  return (
    <>
      {CASCADE_HALO_17.map((card, i) => {
        const angle = (i / CASCADE_HALO_17.length) * Math.PI * 2 - Math.PI / 2;
        const x = CENTER_X + Math.cos(angle) * RADIUS_X;
        const y = CENTER_Y + Math.sin(angle) * RADIUS_Y;

        // First 3 cards visible from threeCardFrom (staggered)
        // Remaining 14 visible from seventeenCardFrom
        const enterFrame = i < 3
          ? threeCardFrom + i * 8
          : seventeenCardFrom + (i - 3) * 4;
        const enterEnd = enterFrame + 24;
        const opacity = interpolate(frame, [enterFrame, enterEnd], [0, 1], {
          extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
        });
        const scale = interpolate(frame, [enterFrame, enterEnd], [0.6, 1], {
          extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
        });

        return (
          <div key={card.filename} style={{
            position: 'absolute',
            left: x - 90, top: y - 126,
            width: 180, height: 252,
            opacity, transform: `scale(${scale})`,
          }}>
            <Img src={staticFile(`assets/cards/${card.filename}`)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        );
      })}
    </>
  );
};
```

**Step 3 — `GoofyStatCaption.tsx`** (4 stat-pairing captions with
stamp-slap entries).

```tsx
// videos/trailer/src/components/GoofyStatCaption.tsx
import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { ARCHER_STAMP_SPRING } from '../lib/animations';

export const GoofyStatCaption: React.FC<{
  dryStat: string;
  absurdCompanion: string;
  landFrame: number;
  exitFrame: number;
  anchor: 'lower-left' | 'lower-center' | 'lower-right';
}> = ({ dryStat, absurdCompanion, landFrame, exitFrame, anchor }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const slap = spring({
    frame: frame - landFrame,
    fps,
    config: ARCHER_STAMP_SPRING,
  });
  const scale = interpolate(slap, [0, 0.9, 1], [1.4, 0.95, 1]);
  const opacity = interpolate(frame, [landFrame - 5, landFrame, exitFrame, exitFrame + 15], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const rotate = interpolate(slap, [0, 1], [-3, 0]);

  const positionStyle: React.CSSProperties = (() => {
    switch (anchor) {
      case 'lower-left':   return { position: 'absolute', bottom: 80, left: 80 };
      case 'lower-center': return { position: 'absolute', bottom: 80, left: '50%', transform: 'translateX(-50%)' };
      case 'lower-right':  return { position: 'absolute', bottom: 80, right: 80 };
    }
  })();

  return (
    <div style={{
      ...positionStyle,
      transform: `${positionStyle.transform ?? ''} scale(${scale}) rotate(${rotate}deg)`,
      opacity,
      maxWidth: 600,
    }}>
      <div style={{
        fontFamily: 'General Sans', fontWeight: 600, fontSize: 36,
        color: '#947226',
      }}>
        {dryStat.toUpperCase()}
      </div>
      <div style={{
        fontFamily: 'General Sans', fontWeight: 500, fontStyle: 'italic', fontSize: 28,
        color: '#947226', opacity: 0.8, marginTop: 8,
      }}>
        {absurdCompanion}
      </div>
    </div>
  );
};
```

**Step 4 — `StackedPayoffStamp.tsx`** (the R3 stacked-payoff visual).

```tsx
// videos/trailer/src/components/StackedPayoffStamp.tsx
import React from 'react';
import { Img, interpolate, spring, useCurrentFrame, useVideoConfig, staticFile } from 'remotion';

const PAYOFF_SPRING = { mass: 0.5, damping: 10, stiffness: 240 };

export const StackedPayoffStamp: React.FC<{ landFrame: number }> = ({ landFrame }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const slap = spring({
    frame: frame - landFrame,
    fps,
    config: PAYOFF_SPRING,
  });
  const scale = interpolate(slap, [0, 0.85, 1], [1.6, 0.95, 1]);
  const rotation = interpolate(slap, [0, 1], [-20, -3]);
  const opacity = interpolate(frame, [landFrame - 4, landFrame], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  return (
    <div style={{
      position: 'absolute',
      top: '50%', left: '50%',
      transform: `translate(-50%, -50%) scale(${scale}) rotate(${rotation}deg)`,
      opacity,
      zIndex: 100,
    }}>
      <Img src={staticFile('assets/r15-chrome/stamp-3-asset-delivered.svg')} style={{ width: 1200 }} />
    </div>
  );
};
```

**Step 5 — `S04_ReceiptsCascade.tsx`** orchestrator.

```tsx
// videos/trailer/src/scenes/S04_ReceiptsCascade.tsx
import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile } from 'remotion';
import { BriefingRoomBackground } from '../components/BriefingRoomBackground';
import { HtpDossierHero } from '../components/HtpDossierHero';
import { CardArtHalo } from '../components/CardArtHalo';
import { GoofyStatCaption } from '../components/GoofyStatCaption';
import { StackedPayoffStamp } from '../components/StackedPayoffStamp';
import { CommsTicker } from '../components/CommsTicker';
import { AUDIO_ASSETS } from '../lib/audio-manifest';

// S04 absolute frames 1050–2040; scene-relative 0–990.
// VO cues (absolute → relative):
//   1080 → 30      "Operational planning."
//   1110 → 60      "Fourteen thousand pages..."
//   1290 → 240     "Mission rehearsal: 1407 contingencies..."
//   1410 → 360     "Six of them, deliberately unrehearsed..."
//   1560 → 510     "Asset profile illustrations: 17..."
//   1680 → 630     "Operatives in the active roster: 7..."
//   1950 → 900     STACKED PAYOFF
// Stat captions (per Unit 1.6 finalists):
//   Stat 1 lower-left,   land 240,  exit 360   (matches VO 240)
//   Stat 2 lower-center, land 360,  exit 510
//   Stat 3 lower-right,  land 510,  exit 630
//   Stat 4 lower-left,   land 630,  exit 810   (replaces Stat 1 LIFO)
// HTP hero: slide-in 0–60, scroll 60–630.
// Halo 3-card: starts 360. Halo 17-mosaic: starts 510.
// R15 #2 ticker: starts 630 (lasts until cascade peak).
// Stacked payoff stamp: lands 900.

const S04_CUES = AUDIO_ASSETS.filter(a => a.scene === undefined && a.startFrame >= 1050 && a.startFrame < 2040);

export const S04_ReceiptsCascade: React.FC = () => {
  return (
    <AbsoluteFill>
      <BriefingRoomBackground />

      {/* HTP hero — slides in, scrolls down */}
      <HtpDossierHero
        slideInFrom={0}
        scrollFrom={60}
        scrollTo={630}
        scrollRangePx={-3000} // measured from Phase 3 Unit 3.1 metadata
      />

      {/* Card art halo */}
      <CardArtHalo threeCardFrom={360} seventeenCardFrom={510} />

      {/* Goofy stats (per Unit 1.6 finalists; verify with TODO single-source) */}
      <GoofyStatCaption
        dryStat="Planning: 14,000 pages"
        absurdCompanion="+ 6 sticky notes (recovered)"
        landFrame={240} exitFrame={360}
        anchor="lower-left"
      />
      <GoofyStatCaption
        dryStat="Rehearsals: 1,407 contingencies"
        absurdCompanion="6 deliberately unrehearsed (the memorable ones)"
        landFrame={360} exitFrame={510}
        anchor="lower-center"
      />
      <GoofyStatCaption
        dryStat="Asset illustrations: 17"
        absurdCompanion="(two with hats)"
        landFrame={510} exitFrame={630}
        anchor="lower-right"
      />
      <GoofyStatCaption
        dryStat="Operatives: 7"
        absurdCompanion="(plus Agent X. Don't ask.)"
        landFrame={630} exitFrame={810}
        anchor="lower-left"
      />

      {/* R15 #2 comms-ticker pulse at relative frame 630 */}
      <CommsTicker fromFrame={630} text="OPERATIVE [REDACTED] — METHOD REPEATABLE" />

      {/* Stacked-payoff stamp at relative frame 900 (absolute 1950) */}
      <StackedPayoffStamp landFrame={900} />

      {/* Audio cues — each in its own Sequence at scene-relative position */}
      {S04_CUES.map((cue) => {
        const relFrame = cue.startFrame - 1050;
        return (
          <Sequence key={cue.filename} from={relFrame} durationInFrames={cue.actualFrames}>
            <Audio src={staticFile(cue.staticPath)} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
```

(Note: the `scene` filter on AUDIO_ASSETS may need adjustment based on
Phase 2 manifest schema; the principle is filter by frame-range
inclusion. Phase 4 codifies this filter pattern as a helper for use
across scene files.)

**Step 6 — Per-scene Archer test.**

```md
# S04 Receipts Cascade — Archer Test (LOAD-BEARING)

## Sample frames
- [ ] Frame 0 (cascade open): HTP slides up from bottom
- [ ] Frame 120 (4s in): HTP scrolling, first Dash line playing
- [ ] Frame 240 (8s in): Stat 1 lands lower-left
- [ ] Frame 360 (12s in): Stat 2 lands center; 3-card halo opening
- [ ] Frame 510 (17s in): Stat 3 lands right; 17-mosaic halo expanding
- [ ] Frame 630 (21s in): Stat 4 lands left; R15 #2 ticker pulses
- [ ] Frame 810 (27s in): cascade peak — all elements in frame
- [ ] Frame 900 (30s in): STACKED PAYOFF — stamp lands, Dash line drops
- [ ] Frame 945 (31.5s in): silence beat — visual frozen
- [ ] Frame 990 (33s — scene end): cross-dissolve begins

## §2 Quality Bar (TRAILER LOAD-BEARING)
- [ ] HTP hero readable + scrolling smoothly
- [ ] Card-art halo composes around hero without obscuring it
- [ ] Goofy-stat captions readable + Archer-tone
- [ ] Stamp slap at frame 900 lands HARD (this IS the trailer moment)
- [ ] Payoff silence beat reads as INTENTIONAL pause, not error
- [ ] Mobile safe-square: HTP + halo cluster + stamp inside 1080×1080
  central square; captions OK to crop at side bands

## R3 acceptance
- [ ] Visual + audio reveal land simultaneously at frame 900 (±2 frames)
- [ ] Dash VO line "They WERE the operation." lands AT the stamp slap
- [ ] 1.5s silence beat follows reveal
- [ ] Cross-dissolve to S05 begins at frame 990

## Verdict: PASS / FAIL / iterate
```

S04 is the most likely scene to iterate. Phase 4 may need 2–3 passes
on this scene specifically.

**Verification:**

- `S04_ReceiptsCascade.tsx` typechecks + renders.
- `s04-archer-test.md` all green INCLUDING R3 acceptance (the
  load-bearing criterion).
- Standalone render at `out/s04-cascade.mp4`.

---

### Unit 4.6 — S05 Gameplay Dissolve Scene

- [ ] **Unit 4.6: S05 Gameplay Dissolve Scene**

**Goal:** Implement `S05_GameplayDissolve.tsx` — 18-second gameplay
closer. Cross-dissolve from cascade (handled by TrailerComposition's
TransitionSeries) into gameplay capture + sparse Dash VO + scream
beat (if R5 kept) + iris-wipe out at scene end.

**Requirements:** R5 (conditional scream), R13 (gameplay footage),
R15 (#2 ticker continues).

**Dependencies:** Unit 4.1, Phase 5 deliverable
(`videos/trailer/public/gameplay.mp4`) — Phase 4 stubs with
placeholder until Phase 5 lands.

**Files:**

- Create: `videos/trailer/src/scenes/S05_GameplayDissolve.tsx`
- Create: `videos/trailer/sample-eval/composite-build/s05-archer-test.md`

**Approach:**

**Step 1 — Scene with gameplay clip stub.**

```tsx
// videos/trailer/src/scenes/S05_GameplayDissolve.tsx
import React from 'react';
import { AbsoluteFill, Audio, OffthreadVideo, Sequence, staticFile } from 'remotion';
import { CommsTicker } from '../components/CommsTicker';
import { AUDIO_ASSETS } from '../lib/audio-manifest';

const SPARSE_DASH = AUDIO_ASSETS.find(a => a.startFrame === 2280)!;
const SCREAM = AUDIO_ASSETS.find(a => a.startFrame === 2400);  // undefined if R5 cut

// Scene: absolute frames 2040–2580; relative 0–540.
// Gameplay clip plays the full scene.
// Sparse Dash at relative frame 240 (= absolute 2280).
// Scream at relative frame 360 (= absolute 2400), if R5 kept.

// Phase 5 dependency: gameplay.mp4 at public/.
// Phase 4 stubs with a 1080×1920 placeholder until Phase 5 ships.

export const S05_GameplayDissolve: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      <OffthreadVideo
        src={staticFile('gameplay.mp4')}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />

      {/* R15 #2 ticker continues in S05 until ~frame 360 */}
      <CommsTicker fromFrame={0} text="OPERATIVE [REDACTED] — METHOD REPEATABLE" />

      {/* Sparse Dash VO */}
      <Sequence from={240} durationInFrames={SPARSE_DASH.actualFrames}>
        <Audio src={staticFile(SPARSE_DASH.staticPath)} />
      </Sequence>

      {/* Scream beat — R5 contingent */}
      {SCREAM && (
        <Sequence from={360} durationInFrames={SCREAM.actualFrames}>
          <Audio src={staticFile(SCREAM.staticPath)} />
        </Sequence>
      )}
    </AbsoluteFill>
  );
};
```

**Step 2 — Phase 5 dependency placeholder.**

If `public/gameplay.mp4` doesn't exist when Phase 4 runs, Remotion
fails at `<OffthreadVideo>`. Phase 4 ships a placeholder:

- A 540-frame (18s) 1920×1080 MP4 at `videos/trailer/public/gameplay-placeholder.mp4`
- Generated via FFmpeg from a single PNG (BURNED board screenshot or
  UMB's HTP capture as a stand-in)

```ts
// scripts/generate-placeholder-gameplay.ts
import { execFileSync } from 'node:child_process';

// SAFE: argv array
execFileSync('ffmpeg', [
  '-y',
  '-loop', '1',
  '-i', 'videos/trailer/public/htp-fullpage.png',
  '-c:v', 'libx264',
  '-t', '18',
  '-pix_fmt', 'yuv420p',
  '-vf', 'scale=1920:1080:force_original_aspect_ratio=cover,crop=1920:1080',
  'videos/trailer/public/gameplay.mp4',
]);
```

Phase 5 overwrites with the real capture.

**Step 3 — Per-scene Archer test.**

```md
# S05 Gameplay Dissolve — Archer Test

## Sample frames (assuming gameplay placeholder)
- [ ] Frame 0: cross-dissolve from S04 cascade settled; gameplay clip starts
- [ ] Frame 90 (3s in): full gameplay reveal; cascade fully faded
- [ ] Frame 240 (8s in): sparse Dash VO ("And — between you and me...")
- [ ] Frame 360 (12s in): scream beat (if R5 kept) over gameplay sound
- [ ] Frame 495 (16.5s in): iris-wipe begins
- [ ] Frame 540 (scene end): cross-dissolve out to S06

## §2 Quality Bar
- [ ] Real-gameplay clip reads as "BURNED is shipped + playable"
- [ ] Cross-dissolve from cascade smooth (no flicker / hard cut)
- [ ] Dash VO sparse, doesn't compete with gameplay audio
- [ ] Scream beat (R5) audibly lands on a BURNED card draw in gameplay
- [ ] R15 #2 ticker continues through cascade tail

## Verdict: PASS / FAIL / iterate
```

**Verification:**

- `S05_GameplayDissolve.tsx` typechecks + renders.
- Placeholder `gameplay.mp4` provided for Phase 4 standalone render.
- `s05-archer-test.md` complete (Briggsy may defer full verdict
  until Phase 5 lands the real capture).

---

### Unit 4.7 — S06 Closing Directive Scene

- [ ] **Unit 4.7: S06 Closing Directive Scene**

**Goal:** Implement `S06_ClosingDirective.tsx` — 9-second closing.
Iris-wipe-in from S05 + briefing-room reestablish + dossier closes +
BURNED logo lands + R15 #4 subhead + final Dash VO + final brass
sting.

**Requirements:** R1, R4, R15 (#4).

**Dependencies:** Unit 4.1, Phase 3 (closing logo, R15 #4),
Phase 2 (s06-cue-2610 + s06-cue-2790).

**Files:**

- Create: `videos/trailer/src/scenes/S06_ClosingDirective.tsx`
- Create: `videos/trailer/sample-eval/composite-build/s06-archer-test.md`

**Approach:**

**Step 1 — Scene.**

```tsx
// videos/trailer/src/scenes/S06_ClosingDirective.tsx
import React from 'react';
import { AbsoluteFill, Audio, Img, interpolate, useCurrentFrame, Sequence, staticFile, spring, useVideoConfig } from 'remotion';
import { BriefingRoomBackground } from '../components/BriefingRoomBackground';
import { DossierFolder } from '../components/DossierFolder';
import { AUDIO_ASSETS } from '../lib/audio-manifest';

const CLOSING_DASH = AUDIO_ASSETS.find(a => a.startFrame === 2610)!;
const PHRASING = AUDIO_ASSETS.find(a => a.startFrame === 2790)!;

// S06 absolute frames 2580–2850; relative 0–270.
// Iris-wipe in from frame 0 (handled by S05→S06 boundary or scene-internal mask).
// Dossier closes frames 30–60.
// BURNED logo lands at relative frame 210 (= absolute 2790).
// R15 #4 subhead lands at relative frame 220.
// Closing Dash VO at relative frame 30.
// "Phrasing" at relative frame 210 — same as logo land.

export const S06_ClosingDirective: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Iris-wipe in (the wipe shrinks from full-screen circle to nothing as it reveals scene)
  const irisRadius = interpolate(frame, [0, 45], [0, Math.hypot(960, 540)], {
    extrapolateRight: 'clamp',
  });

  // BURNED logo land at relative frame 210
  const logoSpring = spring({
    frame: frame - 210,
    fps,
    config: { mass: 0.4, damping: 12, stiffness: 220 },
  });
  const logoOpacity = interpolate(frame, [205, 210], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // R15 #4 subhead lands at relative frame 220 (10 frames after logo)
  const subheadOpacity = interpolate(frame, [215, 220], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill>
      {/* Iris-wipe mask SVG */}
      <svg style={{ position: 'absolute', width: '100%', height: '100%', zIndex: 1000 }}>
        <defs>
          <mask id="irisMask">
            <rect width="100%" height="100%" fill="black" />
            <circle cx="960" cy="540" r={irisRadius} fill="white" />
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="#000" mask="url(#irisMask)" />
      </svg>

      <BriefingRoomBackground />
      <DossierFolder openStart={-30} closeStart={30} />  {/* opens before scene start; closes at relative frame 30 */}

      {/* BURNED logo */}
      <AbsoluteFill style={{
        justifyContent: 'center', alignItems: 'center',
        opacity: logoOpacity,
        transform: `scale(${interpolate(logoSpring, [0, 1], [0.6, 1])})`,
      }}>
        <Img src={staticFile('assets/title-sequence/burned-logo-closing.svg')} style={{ width: 1200 }} />
      </AbsoluteFill>

      {/* R15 #4 subhead */}
      <div style={{
        position: 'absolute',
        bottom: 220, left: 0, right: 0,
        textAlign: 'center',
        opacity: subheadOpacity,
      }}>
        <Img src={staticFile('assets/r15-chrome/subhead-4-agent-built.svg')} style={{ width: 800 }} />
      </div>

      {/* Closing Dash VO at relative frame 30 */}
      <Sequence from={30} durationInFrames={CLOSING_DASH.actualFrames}>
        <Audio src={staticFile(CLOSING_DASH.staticPath)} />
      </Sequence>

      {/* Phrasing at relative frame 210 */}
      <Sequence from={210} durationInFrames={PHRASING.actualFrames}>
        <Audio src={staticFile(PHRASING.staticPath)} />
      </Sequence>
    </AbsoluteFill>
  );
};
```

**Step 2 — Per-scene Archer test.**

```md
# S06 Closing Directive — Archer Test

## Sample frames
- [ ] Frame 0: iris-wipe revealing briefing-room
- [ ] Frame 45: iris fully open; dossier closing
- [ ] Frame 60: folder closed; Dash VO mid-line
- [ ] Frame 210: BURNED logo lands; "Phrasing" cue
- [ ] Frame 220: R15 #4 subhead lands under logo
- [ ] Frame 270 (scene end): hard cut to black

## §2 Quality Bar
- [ ] Iris-wipe transition reads as classic title-sequence closer
- [ ] BURNED logo land has weight (spring-eased scale)
- [ ] R15 #4 subhead readable + ochre-inked
- [ ] Final "Phrasing" lands like a real Archer episode close
- [ ] Final brass sting on music bed timed to scene end

## Verdict: PASS / FAIL / iterate
```

**Verification:**

- `S06_ClosingDirective.tsx` typechecks + renders.
- `s06-archer-test.md` all green.
- Standalone render at `out/s06-closing.mp4`.

---

### Unit 4.8 — Transition Implementation

- [ ] **Unit 4.8: Transition Implementation**

**Goal:** Build the 5 named transitions from Unit 1.4's scoped
library as reusable components in `src/transitions/`. Used by:
- Unit 4.2 (S01→S02): stamp slap (S01 internal closing transition)
- Unit 4.3 (S02→S03): hard cut (no component needed, just adjacent Sequences)
- Unit 4.4 (S03→S04): dossier-page wipe
- Unit 4.1 (S04→S05): TransitionSeries cross-dissolve (already wired)
- Unit 4.7 (S05→S06): iris-wipe (scene-internal in S06)

**Requirements:** R3 (cross-dissolve specifically), R14 (cold-open
hand-off).

**Dependencies:** Unit 1.4 transition vocabulary; Units 4.2–4.7.

**Files:**

- Create: `videos/trailer/src/transitions/StampSlap.tsx` (already
  used in R15Stamp component; this is the standalone overlay variant)
- Create: `videos/trailer/src/transitions/DossierPageWipe.tsx`
- Create: `videos/trailer/src/transitions/IrisWipe.tsx`
- Edit: `videos/trailer/src/lib/animations.ts` — add helpers
- Create: `videos/trailer/sample-eval/composite-build/transitions.md`

**Approach:**

**Step 1 — Stamp Slap (overlay variant).**

S01→S02 boundary uses the R15 #1 stamp slap to bridge. The R15Stamp
component (Unit 4.2) already implements this; no separate transition
component needed.

**Step 2 — Dossier-Page Wipe (S03→S04).**

```tsx
// videos/trailer/src/transitions/DossierPageWipe.tsx
import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';

/**
 * 8-frame horizontal wipe from right edge inward.
 * Visually reads as turning a dossier page to reveal what's beneath.
 *
 * Placed at scene boundary as scene-internal overlay or
 * incorporated into a scene's tail frames.
 */
export const DossierPageWipe: React.FC<{
  durationFrames?: number;
  direction?: 'left-to-right' | 'right-to-left';
}> = ({ durationFrames = 8, direction = 'right-to-left' }) => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [0, durationFrames], [0, 100], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const clip = direction === 'right-to-left'
    ? `inset(0 ${progress}% 0 0)`
    : `inset(0 0 0 ${progress}%)`;
  return (
    <AbsoluteFill style={{
      backgroundColor: '#947226',
      clipPath: clip,
    }} />
  );
};
```

**Step 3 — Iris-Wipe (S05→S06).**

```tsx
// videos/trailer/src/transitions/IrisWipe.tsx
import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';

export const IrisWipe: React.FC<{
  /** Frame range over which iris collapses to point. */
  fromFrame: number;
  toFrame: number;
  /** Direction: 'closing' (full → point) or 'opening' (point → full). */
  direction: 'closing' | 'opening';
}> = ({ fromFrame, toFrame, direction }) => {
  const frame = useCurrentFrame();
  const maxRadius = Math.hypot(960, 540); // diagonal of half-screen
  const radius = direction === 'closing'
    ? interpolate(frame, [fromFrame, toFrame], [maxRadius, 0], {
        extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
      })
    : interpolate(frame, [fromFrame, toFrame], [0, maxRadius], {
        extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
      });
  return (
    <svg style={{ position: 'absolute', width: '100%', height: '100%', zIndex: 1000 }}>
      <defs>
        <mask id="iris">
          <rect width="100%" height="100%" fill="black" />
          <circle cx="960" cy="540" r={radius} fill="white" />
        </mask>
      </defs>
      <rect width="100%" height="100%" fill="#000" mask="url(#iris)" />
    </svg>
  );
};
```

Already inlined in `S06_ClosingDirective.tsx`; this component
extracts for reuse + clarity.

**Step 4 — Cross-Dissolve via TransitionSeries.**

Already wired in `TrailerComposition.tsx` (Unit 4.1) at the S04→S05
boundary using `@remotion/transitions`'s `<TransitionSeries.Transition
presentation={fade()} timing={linearTiming(...)} />`. No standalone
component needed.

**Step 5 — Hard cut.**

No component — `<Sequence>` boundaries with adjacent `from + duration`
produce hard cuts naturally.

**Step 6 — Inventory + use trace.**

`transitions.md`:

```md
# Transition Implementation Inventory

| Boundary | Transition | File | Frame range (abs) |
|----------|-----------|------|-------------------|
| S01 → S02 | Stamp slap | R15Stamp component (S01 internal) | 200–210 |
| S02 → S03 | Hard cut | None (Sequence boundary) | 570 |
| S03 → S04 | Dossier-page wipe | DossierPageWipe (S03 internal) | 1042–1050 |
| S04 → S05 | Cross-dissolve (R3) | TransitionSeries + fade() | 1995–2040 |
| S05 → S06 | Iris-wipe | IrisWipe (S06 internal) | 2535–2580 |
| S06 → end | Hard cut to black | None | 2850 |
```

**Patterns to follow:**

- `@remotion/transitions` docs.
- Unit 1.4 scoped library.

**Test scenarios:**

- **Happy path:** All transitions render in standalone test
  compositions without artifacts.
- **Edge case:** Iris-wipe radius clamps at full-screen diagonal
  (else circle overflows for one frame).
- **Edge case:** DossierPageWipe direction matches BEAT-SHEET.md
  (R-to-L reveals next, not previous).

**Verification:**

- 3 transition component files exist + typecheck.
- `transitions.md` documents all 6 boundary handlings.
- Each transition standalone-renders cleanly.

---

### Unit 4.9 — Per-Scene §2 Archer Test Pass

- [ ] **Unit 4.9: Per-Scene §2 Archer Test Pass**

**Goal:** Each of the 6 scenes (S01–S06) independently passes the §2
Quality Bar test card. Failed scenes iterate before Unit 4.10 full
composition assembly.

**Requirements:** §2 Quality Bar from `docs/PRODUCT-SPECIFICATION.md`.

**Dependencies:** Units 4.2–4.7 (all scene components built).

**Files:**

- Edit: 6 per-scene archer-test.md files in `sample-eval/composite-build/`.
- Create: `videos/trailer/sample-eval/composite-build/scene-pass-summary.md`

**Approach:**

**Step 1 — Standalone composition per scene.**

Each scene component is wrapped in its own `<Composition>` in
Root.tsx (alongside the main BurnedTrailer composition) for
standalone rendering.

```tsx
// Root.tsx additions
<Composition id="S01ColdOpen"          component={S01_ColdOpen}          durationInFrames={210} fps={30} width={1920} height={1080} />
<Composition id="S02BriefingSetup"     component={S02_BriefingSetup}     durationInFrames={360} fps={30} width={1920} height={1080} />
<Composition id="S03MissionBackground" component={S03_MissionBackground} durationInFrames={480} fps={30} width={1920} height={1080} />
<Composition id="S04ReceiptsCascade"   component={S04_ReceiptsCascade}   durationInFrames={990} fps={30} width={1920} height={1080} />
<Composition id="S05GameplayDissolve"  component={S05_GameplayDissolve}  durationInFrames={540} fps={30} width={1920} height={1080} />
<Composition id="S06ClosingDirective"  component={S06_ClosingDirective}  durationInFrames={270} fps={30} width={1920} height={1080} />
```

**Step 2 — Per-scene render.**

```
pnpm render -- --composition=S01ColdOpen --output=out/s01-coldopen.mp4
pnpm render -- --composition=S02BriefingSetup --output=out/s02-briefing.mp4
... (5 more)
```

**Step 3 — Briggsy reviews per-scene against test card.**

Per archer-test.md in Units 4.2–4.7. Briggsy marks PASS / FAIL /
iterate per scene.

**Step 4 — Iteration cycle for failed scenes.**

If a scene fails:

1. Identify which §2 dimension failed (composition / palette /
   typography / cue alignment).
2. Edit the scene component to address the specific failure.
3. Re-render standalone.
4. Re-test.

Max 3 iterations per scene before Phase 4 reopens (escalates back to
Phase 1 if structural issues found).

**Step 5 — Summary.**

`scene-pass-summary.md`:

```md
# Per-Scene Archer Test Summary

| Scene | Iterations | Final verdict | Notes |
|-------|------------|---------------|-------|
| S01 Cold Open | 1 | PASS | Stamp slap on-Archer |
| S02 Briefing | 2 | PASS | Folder open ease tuned in iter 2 |
| S03 Mission | 1 | PASS | Roster reveal staggered well |
| S04 Cascade | 3 | PASS | Stamp scale + payoff hold tuned iters 2–3 |
| S05 Dissolve | 1 | PASS (placeholder gameplay) | Real gameplay verdict deferred to Phase 6 |
| S06 Closing | 1 | PASS | Iris-wipe + logo land clean |

All 6 scenes pass §2 Quality Bar.
```

**Patterns to follow:**

- `docs/PRODUCT-SPECIFICATION.md` §2.
- `feedback-verify-before-presenting.md` — eyes-on-feature before
  declaring done.
- `feedback-elite-team-standard.md` — verify → then lock.

**Test scenarios:**

- **Happy path:** All 6 scenes pass on first or second iteration.
- **Edge case:** A scene fails §2 after 3 iterations → reopen Phase 1
  composition lock for that scene.
- **Anti-pattern guard:** Briggsy reviews actual rendered MP4, not
  studio preview — production-render iteration matters.

**Verification:**

- 6 per-scene archer-test.md files all green.
- `scene-pass-summary.md` lists final verdicts.
- 6 per-scene out/s0N-*.mp4 files render cleanly.

---

### Unit 4.10 — Full Composition Render + Studio-Preview Verification

- [ ] **Unit 4.10: Full Composition Render + Studio-Preview Verification**

**Goal:** Render the full BurnedTrailer composition end-to-end at
studio-preview quality. Output: `out/trailer-preview.mp4`. Verify
playable, frame-accurate, audio-synced. Briggsy signs off on the
preview for Phase 6 handoff.

**Requirements:** All R requirements collectively.

**Dependencies:** Unit 4.9 (all per-scene tests pass), Unit 4.1
(composition wired), Units 4.2–4.8 (all components built).

**Files:**

- Create: `videos/trailer/out/trailer-preview.mp4`
- Create: `videos/trailer/sample-eval/composite-build/full-render-verification.md`

**Approach:**

**Step 1 — Render.**

```
pnpm render
```

Per `package.json` script (Phase 0 Unit 0.1 ADR), renders at:
- Codec: H264
- CRF: 18 (studio-preview quality; Phase 6 may tune)
- Resolution: 1920×1080
- Frame rate: 30fps
- Output: `out/trailer-landscape.mp4` (Phase 0 default path; Phase 4
  renames to `out/trailer-preview.mp4` for clarity)

Expected render time: 5–15 minutes for a 95-second composition,
depending on machine. UMB v3's 148-second trailer rendered in ~10
minutes on Briggsy's setup; BURNED's 95-second composition should
take ~6–9 minutes.

**Step 2 — Playback verification.**

Open `out/trailer-preview.mp4` in any player. Verify:

- **Plays end-to-end** (no decode errors)
- **Duration is 95.0 seconds** ±10ms tolerance
- **Audio + video sync** at known cue frames (frame 60 cold-open
  speaker; frame 1950 stacked payoff; frame 2790 BURNED logo land)
- **No frame drops** (visual flicker / missing frames)
- **Cross-dissolve at S04→S05** smooth (no hard-cut artifact)
- **All R15 stamps visible** at their cue frames

**Step 3 — Full-runtime §2 sweep.**

A faster pass than Unit 4.9. Briggsy plays the trailer end-to-end
twice + samples 10 frames at fixed timecodes (every ~9.5 seconds):

| Sample frame | Scene | §2 check |
|--------------|-------|----------|
| 30 | S01 | Card flash 1 in frame |
| 285 | S02 | Briefing-room mid-scene |
| 540 | S03 | Roster reveal |
| 825 | S03 → S04 boundary | Dossier-page wipe |
| 1080 | S04 | Cascade opening |
| 1335 | S04 | Card-art halo expanded |
| 1590 | S04 | Comms-ticker active |
| 1845 | S04 | Cascade peak |
| 2100 | S05 | Gameplay clip mid-play |
| 2355 | S05 | Scream beat (if R5 kept) |
| 2610 | S06 | Closing Dash VO |
| 2820 | S06 | BURNED logo + R15 #4 |

Per-frame: §2 yes/no. Threshold: ≥10/12 pass (~83%) for studio-
preview signoff. (Phase 6 raises this to ≥10/10 for production.)

**Step 4 — Per-scene rendering time + bundle size.**

Document:
- Total render time
- Final MP4 size (target: 100–200 MB for 95s @ CRF 18)
- Average frame render time (helpful for Phase 6 optimization)

**Step 5 — Briggsy sign-off.**

`full-render-verification.md`:

```md
# Full Composition Render — Phase 4 Preview Sign-Off

Date: 2026-MM-DD
Render time: <N> minutes
File size: <N> MB
Duration: <measured>s (target 95.0s, drift <%>)

## Playback verification
- [ ] Plays end-to-end without decode errors
- [ ] Audio + video sync at cue frame samples
- [ ] No frame drops
- [ ] All transitions smooth
- [ ] All R15 stamps visible at cue frames

## §2 frame sweep (12 sampled frames)
- [ ] ≥10 of 12 frames pass §2

## R3 stacked-payoff verification
- [ ] Visual stamp + Dash VO line "they WERE the operation" land
  simultaneously at frame 1950 ±2 frames
- [ ] 1.5-second silence beat follows
- [ ] Cross-dissolve to S05 reads as bridge, not generic crossfade

## Briggsy sign-off
- Phase 4 studio-preview: APPROVED / ITERATE
- Hand-off to Phase 6 QA: GO / NOGO
```

**Patterns to follow:**

- UMB v3 render workflow (precedent).
- `feedback-verify-before-presenting.md` — production render
  verification, not studio preview alone.
- Phase 0 ADR (CRF 18, H264, etc.).

**Test scenarios:**

- **Happy path:** Render completes; full-runtime §2 passes;
  Briggsy signs off.
- **Edge case:** Render fails mid-way (memory / decoder issue) →
  investigate per scene; isolate failing scene; iterate.
- **Edge case:** Audio + video drift detected → check Phase 2
  manifest's `actualFrames` aligns with placed `<Audio>` durations.
- **Performance:** Render time exceeds 30 minutes → flag for Phase 6
  optimization (offthreadVideo, concurrent rendering tuning).

**Verification:**

- `out/trailer-preview.mp4` exists + plays end-to-end.
- `full-render-verification.md` documents all checks.
- Briggsy signs off; hand-off to Phase 6.

---

## System-Wide Impact

- **Interaction graph:** Phase 4 ingests Phases 1 (BEAT-SHEET +
  timing), 2 (audio manifest), 3 (visual manifest), 5 (gameplay clip
  — with stub fallback). Produces studio-preview MP4 + per-scene
  archer-test results. Phase 6 receives `out/trailer-preview.mp4`
  for QA.
- **Error propagation:** A scene's §2 failure routes to iteration
  inside Phase 4 (max 3 iterations) before escalating to Phase 1
  reopen. A render error routes to investigation + scene isolation.
- **State lifecycle risks:** Trailer project's `node_modules` lives
  in `videos/trailer/node_modules/` (isolated per Phase 0 ADR #2);
  doesn't interact with BURNED's `node_modules`. Render output lives
  in `videos/trailer/out/`; gitignored.
- **API surface parity:** None — Phase 4 produces video output, not
  user-facing surfaces.
- **Integration coverage:** Phase 0 Unit 0.5 spike validated all
  Remotion integration mechanics; Phase 4 implements them at scene
  scale.
- **Unchanged invariants:** BURNED game code untouched. Phone bundle
  budget unaffected. Trailer remains isolated package.

---

## Risks & Dependencies

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| S04 cascade composition fails §2 in iteration | High (load-bearing scene) | Medium | Unit 4.9 budgets up to 3 iterations per scene; Phase 1 reopen reserved. |
| Audio + video drift in long renders | Low | High | Phase 2 manifest uses `actualFrames` (post-processed); Unit 4.1 audio placed at scene-relative startFrame inside Sequences. |
| Phase 5 gameplay clip delayed | Medium (deploy migration in flight) | Low (placeholder enables Phase 4 standalone) | Placeholder MP4 generated in Unit 4.6 Step 2. |
| Custom-font fallback in MP4 render | Low (Phase 0 spike validated) | High | useFonts() auto-blocks render until fonts ready; render error if not. |
| Render time exceeds reasonable iteration cycle | Medium | Medium | Studio-preview iteration during build; only Unit 4.10 production render. Concurrent render tuning reserved for Phase 6. |
| TransitionSeries cross-dissolve has artifact at S04→S05 | Low (Phase 0 spike) | High (R3 broken) | Phase 0 Unit 0.5 cleared the integration; Phase 4 reuses. |
| Iris-wipe SVG mask flickers on first frame | Low | Low | Test in studio preview; adjust starting radius to ensure no zero-radius edge case. |
| Operative card frame template under-delivers visually | Medium | Medium | Phase 3 Unit 3.6 iteration with possible Imagen polish; Phase 4 fallback is to compose chrome elements as React divs instead of importing SVG. |
| Phase 1 Unit 1.5 cascade layout doesn't read in MP4 export | Medium | High (S04 fail) | Mobile-safe square audit in Unit 4.9; iteration via composition tweaks (not Phase 1 reopen unless structural). |
| Briggsy color blindness misses a color-only cue | Low (project-wide rule) | Low | Per-scene tests check typography + position + shape signal, not color. |
| ScheduleWakeup / runtime context dropouts during long renders | Low | Low | Render is synchronous + non-interactive; doesn't depend on agent context. |

---

## Open Questions

### Resolved During Planning

- **Composition architecture:** `<Series>` for most boundaries +
  `<TransitionSeries>` only for S04→S05 (Phase 0 ADR #11).
- **Animation paradigm:** pure Remotion `interpolate()` + `spring()`.
  No Framer Motion in trailer project.
- **Per-scene componentization:** each scene a single .tsx file
  composing shared components.
- **Shared component library:** R15Stamp, OperativeCardFrame,
  BriefingRoomBackground, DossierFolder, PendletonCrest, CommsTicker,
  HtpDossierHero, CardArtHalo, GoofyStatCaption, StackedPayoffStamp.
- **Phase 5 dependency handling:** placeholder MP4 generated in Phase
  4 (Unit 4.6); Phase 5 overwrites.
- **Per-scene Archer test mandatory** before full composition
  assembly (Unit 4.9).
- **Studio preview vs production render:** Phase 4 ships studio-
  preview-quality `out/trailer-preview.mp4`; Phase 6 produces final.

### Deferred to Implementation

- **Spring config tuning per scene** (ARCHER_STAMP_SPRING, payoff
  spring, logo spring) — Phase 4 iteration concerns; Phase 1 doesn't
  prescribe.
- **HTP hero scroll range exact pixel count** — depends on Phase 3
  Unit 3.1 capture output (scroll height varies by HTP content).
  Phase 4 reads metadata from `htp-capture.md`.
- **Whether iris-wipe is full-circle-to-center or skews to dossier-
  closing center** — Phase 4 iteration / aesthetic call.
- **Card-art halo ellipse dimensions** — Phase 4 may tune RADIUS_X /
  RADIUS_Y for visual weight; current values are initial guesses.
- **Goofy-stat caption typography exact sizing** — Phase 4 in-studio
  visual tuning.
- **Render time optimization** (concurrency / offthreadVideo
  thresholds) — deferred to Phase 6.

---

## Documentation / Operational Notes

- All Phase 4 artifacts land in `videos/trailer/src/`,
  `videos/trailer/out/`, and
  `videos/trailer/sample-eval/composite-build/`.
- Studio preview iteration: `pnpm studio` for live previewing.
  Production render: `pnpm render` produces `out/trailer-preview.mp4`.
- Trailer project's `node_modules` is isolated (Phase 0 ADR #2).
- Phase 5 dependency: `public/gameplay.mp4` from Phase 5 OR Phase 4's
  placeholder. Phase 4 ships with placeholder ready.
- Per-scene compositions registered alongside the main composition
  in `Root.tsx` for standalone rendering (Unit 4.9).
- Briggsy reviews actual rendered MP4 per scene + full composition,
  not studio preview alone (`feedback-verify-before-presenting.md`).
- Color blindness rule: typography + position + shape carry signal
  (`user_color_blind.md`).

---

## Sources & References

**Origin documents:**
- Brainstorm: [`docs/ideation/2026-05-15-origin-trailer-brainstorm.md`](../../ideation/2026-05-15-origin-trailer-brainstorm.md)
- Roadmap: [`docs/plans/origin-trailer/roadmap.md`](./roadmap.md)
- Phase 0 plan: [`docs/plans/origin-trailer/phase-0-gate-resolution.md`](./phase-0-gate-resolution.md)
- Phase 1 plan: [`docs/plans/origin-trailer/phase-1-beat-sheet-lock.md`](./phase-1-beat-sheet-lock.md)
- Phase 2 plan: [`docs/plans/origin-trailer/phase-2-voice-pipeline.md`](./phase-2-voice-pipeline.md)
- Phase 3 plan: [`docs/plans/origin-trailer/phase-3-visual-asset-prep.md`](./phase-3-visual-asset-prep.md)

**UMB v3 precedents:**
- Composition wiring: `projects/undercover-mob-boss/videos/trailer/src/{Root.tsx,TrailerV3.tsx}`
- Scene files: `projects/undercover-mob-boss/videos/trailer/src/scenes/V3S{01..09}_*.tsx`
- Timing constants: `projects/undercover-mob-boss/videos/trailer/src/lib/timing-v3.ts`
- Audio placement: UMB scene-internal `Html5Audio` (BURNED uses newer `@remotion/media` `<Audio>`)

**Remotion documentation:**
- TransitionSeries + fade: https://www.remotion.dev/docs/transitions/transitionseries
- Spring: https://www.remotion.dev/docs/spring
- interpolate: https://www.remotion.dev/docs/interpolate
- Audio (new): https://www.remotion.dev/docs/media/audio
- OffthreadVideo: https://www.remotion.dev/docs/offthreadvideo
- Composition: https://www.remotion.dev/docs/composition
- Sequence: https://www.remotion.dev/docs/sequence
- AbsoluteFill: https://www.remotion.dev/docs/absolute-fill
- Quality (CRF): https://www.remotion.dev/docs/quality

**BURNED quality bar:**
- `docs/PRODUCT-SPECIFICATION.md` §2 (Archer test)
- `CLAUDE.md` "The Contract" section

**Institutional learnings (memory):**
- `feedback-verify-before-presenting.md` — render-MP4 review, not studio preview
- `feedback-elite-team-standard.md` — verify → then lock
- `user_color_blind.md` — typography + position + shape carry signal
- `feedback-eye-in-loop-beats-calibration-for-motion.md` — eye-in-loop on motion
- `feedback-phase-plan-drafting-workflow.md` — write all phase files in one workflow; deepen sequentially after
