---
title: "Origin Trailer — Phase 4: Remotion Composite Build"
type: feat
phase: 4
parent: docs/plans/origin-trailer/roadmap.md
origin: docs/ideation/2026-05-15-origin-trailer-brainstorm.md
created: 2026-05-16
deepened: 2026-05-17
reviewed: 2026-05-22
status: active
---

# Phase 4 — Remotion Composite Build

## Overview

Phase 4 is where the trailer becomes a video. All six scenes get
implemented as Remotion components in `videos/trailer/src/scenes/`,
wired into a top-level `<Composition>` at `Root.tsx`, with Phase 2
audio + Phase 3 visual assets composited per the BEAT-SHEET.md cue
tables. The output is a scene-build-complete MP4 renderable via
`pnpm render` — visually complete, frame-accurate, encoded at Phase 6
quality (H264 CRF 18) — ready for Phase 6 QA to promote (or reject)
without re-rendering.

> **Deepening note (2026-05-17):** This file landed its 28-amendment
> deepening pass after Phase 0/1/2/3 (commits `b9617d9d`, `43d44ef4`,
> `e56e69e5`, [latest]). 10-agent parallel review (8 CE personas + emil
> + /brief). 8-of-10 agents converged on the headline must-absorb
> (`<TransitionSeries>` removal at S04→S05) which alone touches 15+
> sections. Plan grew 2467 → [final line count]. Three roadmap ADRs
> added (#16 audio placement, #17 audio import discipline, #18 font
> load strategy pending Unit 4.0 spike).

Phase 4 produces:

- `videos/trailer/src/Root.tsx` — top-level `<Composition id="BurnedTrailer">` + 6 `<Composition id="Preview_S0N_…">` standalone scene previews
- `videos/trailer/src/TrailerComposition.tsx` — orchestrates all 6 scenes + composition-level audio timeline (per ADR #16) + music bed
- `videos/trailer/src/scenes/S01_ColdOpen.tsx` — scene 1 (pure visual; no audio inside)
- `videos/trailer/src/scenes/S02_BriefingSetup.tsx` — scene 2 (pure visual)
- `videos/trailer/src/scenes/S03_MissionBackground.tsx` — scene 3 (pure visual, 6 operatives + Otto-aside typographic chrome)
- `videos/trailer/src/scenes/S04_ReceiptsCascade.tsx` — scene 4 (load-bearing — R3 stacked payoff lives here; sequential revelation per Phase 1 lock; consumes `cascade-ring-layout.json`)
- `videos/trailer/src/scenes/S05_GameplayDissolve.tsx` — scene 5 (uses gameplay clip from Phase 5 + scream cameo if R5 kept; `<OffthreadVideo muted />`)
- `videos/trailer/src/scenes/S06_ClosingDirective.tsx` — scene 6 (R15 #4 split-layer chrome at frame 2820)
- `videos/trailer/src/components/burned-vocabulary/` — 10 files vendored from BURNED howtoplay per Phase 3 Unit 3.0 (consumed by trailer scenes; `pnpm verify:vocab-sync` enforces drift catch)
- `videos/trailer/src/components/` — trailer-native shared building blocks (R15Stamp split-layer, BriefingRoomBackground, DossierFolder, CommsTicker, HtpDossierHero, CardArtHalo, GoofyStatCaption, S04TailFadeToBlack overlay, MusicBed; ~~FadeTransition vendored from UMB v3~~ **SUPERSEDED-BY-EXISTING `SceneFadeToBlack.tsx`** per Unit 4.0a triage 2026-05-22 — see `videos/trailer/sample-eval/composite-build/umb-v3-component-triage.md`)
- `videos/trailer/src/lib/animations.ts` — single curve registry (3 emil-locked easings + 2 named springs + archer-slap helper; NO inline curves in scene files)
- `videos/trailer/src/lib/tokens.css` — fixed-value shim cloning BURNED `primitives.css` subset (per Phase 4 deepening fork: Option C; isolated-package architecture preserved)
- `videos/trailer/src/lib/htp-capture-metadata.json` — imported constant for `HtpDossierHero` scrollRangePx (Phase 3 Unit 3.1 contract-add)
- `videos/trailer/sample-eval/composite-build/` — per-scene Archer test signoffs (`briggsy-review-4.N.signoff` sentinel files gate Unit 4.10 entry), font-spike outcome, UMB v3 component triage, scene timing-shape spec results, full-render verification
- `videos/trailer/out/trailer-scene-build.mp4` — first complete render at H264/CRF 18 (Phase 6 deliverable candidate, not "studio preview"; renamed per amendment SA-1)

Phase 4 exits when:
1. ~~Unit 4.0 font spike resolved~~ **DROPPED 2026-05-22 — RESOLVED-BY-PHASE-0.** Phase 0 Unit 0.5 already cleared variable-axis weight resolution. See `videos/trailer/sample-eval/spike/spike-results.md` §(c) + insight 066. Carry-forward at Unit 4.1: first composite render visually validates all 3 families at distinct weights.
2. Unit 4.0a UMB v3 component triage table populated (per insight 052; read existing instrumentation FIRST).
3. All 6 scenes render in studio preview without typecheck / render errors.
4. Each scene independently passes a §2 Archer test AND has its `briggsy-review-4.N.signoff` sentinel file present.
5. Full-runtime master render produces `out/trailer-scene-build.mp4`: 95.0s ±10ms, no decode errors, no frame drops, all R15 stamps at cue frames, hard cut at S04→S05 reads as deliberate (not glitch), music-bed envelope continuous across cut.
6. `tests/scene-timing-shape.spec.ts` passes (cascade + closing per-frame opacity/transform within tolerance) AND its fault-injection canary fires correctly.
7. Briggsy signs off on the scene-build pass for handoff to Phase 6.

---

## Problem Frame

Phases 1–3 produced specifications + assets. Phase 4 produces the
**composite**. The risk Phase 4 manages: **composition complexity**.

A scene like S04 (the cascade) integrates:
- HTP fullpage capture (`public/trailer/htp-fullpage.png` per ADR #15) consumed by `HtpDossierHero` with translateY interpolation; scrollRangePx imported from `htp-capture-metadata.json` (Phase 3 Unit 3.1 contract-add)
- 17 card-art halo arrangements — geometry consumed from `cascade-ring-layout.json` (Phase 3 Unit 3.4); per-card position (angle, radius, z-order) + 2-frame entry stagger per Phase 1 Unit 1.5 lock
- 4 R15 chrome stamps in SPLIT-LAYER format (frame.svg + text.svg per stamp, outer rotate/scale wrapper)
- 1 comms-ticker pulse with R15 #2 override text
- 8 Dash VO cues spanning 33 seconds — placed at composition level per ADR #16 (NOT inside the scene file)
- 1 stacked-payoff stamp slap at frame 1950 + 1.0-second visual hold per Phase 1 lock
- Hard cut at S04→S05 (frame 2040) per Phase 1 deepening (NOT cross-dissolve; ADR #4 + #11 revised)
- `S04TailFadeToBlack` scene-internal overlay on tail frames 2025-2040 — masks the briefing-room→BURNED-board palette jump that pure hard cut cannot (per amendment MA-1 + adversarial Finding 3)

If ANY of those gets wired wrong, the cascade fails. Phase 4 absorbs
the integration risk through:

- **Per-scene componentization**: each scene is its own .tsx file with self-contained visual state. Scenes are PURE VISUAL — audio lives at composition level (ADR #16; UMB v3 `TrailerV3.tsx:59-63` precedent).
- **Vendored BURNED vocabulary** (`videos/trailer/src/components/burned-vocabulary/`): 10 files copied from `src/client/howtoplay/components/` at Phase 3 Unit 3.0 entry. Drift catcher `pnpm verify:vocab-sync` runs as CI gate.
- **Trailer-native shared component library**: R15Stamp (split-layer), BriefingRoomBackground, DossierFolder, CommsTicker, HtpDossierHero, CardArtHalo, GoofyStatCaption, S04TailFadeToBlack overlay, MusicBed. ~~FadeTransition (vendored from UMB v3 per amendment SA-5)~~ **SUPERSEDED-BY-EXISTING `SceneFadeToBlack.tsx`** (Phase 0 spike artifact at `videos/trailer/src/components/SceneFadeToBlack.tsx` — explicit `startFrame` + `durationFrames` API, no `useVideoConfig` dep). Unit 4.0a triage 2026-05-22 — see `videos/trailer/sample-eval/composite-build/umb-v3-component-triage.md`.
- **Single curve registry** (`src/lib/animations.ts`): 3 emil-locked easing curves (EASE_OUT, EASE_IN_OUT, EASE_DRAWER) + 2 named springs (ARCHER_STAMP_SPRING, PAYOFF_SPRING variant) + archer-slap helper (`scale(0.95) → scale(1.04) → scale(1.0)` per Phase 1 lock). NO inline curves in scene files.
- **Single token shim** (`src/lib/tokens.css`): fixed-value clone of BURNED `primitives.css` subset per Phase 4 deepening fork (Option C). Isolated-package architecture preserved.
- **Frame-constants-by-name**: all timing references go through `timing.ts` constants (Unit 1.1), not magic numbers.
- **Briggsy-eye sentinel-file gating**: each scene exits on a `briggsy-review-4.N.signoff` file written by Briggsy after reviewing the actual rendered MP4 (per insight 050; agent verification systematically misses perceptual continuities). Unit 4.10 master render gated on all 6 sentinels present.

Phase 4 is also the first time the trailer renders to actual MP4 at
Phase 6 deliverable quality. Phase 0 Unit 0.5 spike validated the
integration mechanics (audio crossfade, custom-font MP4 export, HTP
placeholder). Phase 4 implements those for real, at the trailer's full
visual complexity.

The largest UNKNOWN entering Phase 4: **whether Remotion 4.0.438 accepts
the variable woff2 weight-axis syntax**. Phase 3 deepening surfaced
this as the deferred spike; Phase 4 deepening absorbs it as NEW Unit
4.0 (font load spike, time-box 60 min) BEFORE any composition work
starts. PASS → ship 3 variable woff2 files per Phase 1 lock; FAIL →
escalate to Phase 3 for per-weight `pyftsubset` subsetting.

The second largest UNKNOWN: **whether the cascade's stacked-payoff
visual lands at trailer scale UNDER the sequential-revelation
composition constraint** (Phase 1 deepening anti-pattern guard: no
frame except 1950 payoff has >2 elements at full visual weight).
Phase 4 implements via element-lifecycle envelopes that enforce the
guard; Unit 4.9 Archer-tests it. If §2 fails, Unit 4.9's structured
3-branch escalation procedure routes to (a) value-tunable (Unit 4.5
reopen with value-search bracket), (b) composition-structural (Phase 1
Unit 1.5 reopen), or (c) scene-existence (brainstorm reopen). The cap
+ procedure replaces the original "3 iterations max then reopen" which
had no defined escalation path.

---

## Critical Constraints Surfaced by Research

Cross-reference: roadmap §5, Phase 0 §Critical Constraints, Phase 0
Unit 0.5 spike outcomes, Phase 1/2/3 deepening locks.

### Remotion 4.0.438 + add-on packages locked

Per Phase 0 ADRs (revised through Phase 4 deepening):

- **Remotion 4.0.438 pin** (ADR #1) — note: `<Audio from>` and `<Audio durationInFrames>` props shipped in **4.0.445** (post-pin). All Phase 4 audio offsetting uses the contract #2 `<Sequence>` wrapping pattern; upgrading to ≥4.0.445 is a Phase 6 polish item.
- **`@remotion/fonts`** (ADR #3) — for typography (self-hosted woff2). Variable woff2 weight-axis syntax UNRESOLVED in 4.0.x docs; Unit 4.0 spike at Phase 4 entry resolves this OR escalates to Phase 3 per-weight subsetting.
- **`@remotion/transitions`** (ADR #4 revised) — install ON-DEMAND only, NOT used at composition level. Phase 4 has **ZERO** consumers post-deepening: TransitionSeries removed from S04→S05 (per Phase 1 deepening hard-cut lock); iris-wipe + dossier-page-wipe hand-rolled per UMB v3 precedent. Package install deferred unless future iteration discovers a need for `iris()` / `addSound()` primitives as overlay-component helpers.
- **`@remotion/media`** (ADR #5) — for `<Audio>` (newer than UMB's `Html5Audio`). ALL Phase 4 `<Audio>` imports MUST come from `@remotion/media`, NOT the core `'remotion'` `<Audio>` (which is the legacy `<Html5Audio>` wrapper with different rendering semantics). ESLint `no-restricted-imports` rule enforces this (per ADR #17). `<Img>` + `<OffthreadVideo>` from `'remotion'` core.
- **`@remotion/lottie`** reserved if needed (ADR #6) — Phase 4 has zero current consumers; install on-demand.
- **`@remotion/skills`** (ADR #7) — Claude Code agent skills auto-load 28 rule files for Remotion work.

These are installed in Phase 0 Unit 0.1; Phase 4 imports them (except `@remotion/transitions` + `@remotion/lottie`, both deferred).

### Composition architecture: bare `<Series>` + scene-internal overlays (ADR #11 revised)

Per Phase 1 deepening (commit `43d44ef4`) + roadmap ADR #4 + #11 revision:
**ALL scene boundaries are hard cuts via bare `<Series>` of
`<Series.Sequence>`** (or equivalent sibling `<Sequence>` blocks).
`<TransitionSeries>` is NOT used at the composition level — it would
overlap scenes during the transition window (`60+60−15=105` overlap
pattern per Context7 `@remotion/transitions` docs), shortening the
composite total by the transition duration and breaking every
absolute audio cue placed by Phase 2's manifest.

Scene-to-scene transitions (where any are needed) are implemented as
**scene-internal overlay components** rendered inside scene tail/head
frames — not as TransitionSeries presentations. This matches UMB v3
`TrailerV3.tsx:28-56` precedent exactly (grep verified zero
TransitionSeries usage across the UMB trailer src).

Architecturally:

```
TrailerComposition
├─ Series
│  ├─ <Series.Sequence durationInFrames={210}><S01_ColdOpen /></Series.Sequence>
│  ├─ <Series.Sequence durationInFrames={360}><S02_BriefingSetup /></Series.Sequence>
│  ├─ <Series.Sequence durationInFrames={480}><S03_MissionBackground /></Series.Sequence>
│  ├─ <Series.Sequence durationInFrames={990}><S04_ReceiptsCascade /></Series.Sequence>  ← S04 includes the S04TailFadeToBlack overlay on frames 2025-2040 (scene-relative 975-990)
│  ├─ <Series.Sequence durationInFrames={540}><S05_GameplayDissolve /></Series.Sequence>  ← S05 includes MANDATORY S05HeadFadeFromBlack overlay on frames 0-15 (scene-relative; per amendment TIER 1 #5)
│  └─ <Series.Sequence durationInFrames={270}><S06_ClosingDirective /></Series.Sequence>
├─ {AUDIO_ASSETS.map(asset => <Sequence key={asset.filename} from={asset.startFrame - (asset.leadFramesHint ?? 0)} durationInFrames={asset.actualFrames}><Audio src={staticFile(asset.staticPath)} /></Sequence>)}  ← Composition-level audio timeline per ADR #16; consumes Phase 2 manifest directly
└─ <MusicBed />  ← Full-runtime music bed; volume envelope continuous across the S04→S05 hard cut
```

Scene transition handling:

| Boundary | Mechanism | Spec |
|---|---|---|
| S01 → S02 | Stamp slap (R15 #1) | S01-internal R15Stamp lands frame 150 (scene-relative); slap motion bridges into S02 |
| S02 → S03 | Hard cut | None — Series boundary |
| S03 → S04 | Dossier-page wipe | S03-internal `DossierPageWipe` overlay on tail frames |
| S04 → S05 | Hard cut + S04TailFadeToBlack | S04-internal black overlay opacity 0→1 over frames 975-990 (scene-relative); masks briefing-room→BURNED-board palette jump that pure cut cannot |
| S05 → S06 | Iris-wipe | S06-internal `IrisWipe` overlay on head frames (single inline source; Unit 4.8 extracts but DOES NOT duplicate per amendment SA-5) |
| S06 → end | Hard cut to black | None |

Optional polish: vendor UMB v3's `FadeTransition.tsx` (~30 lines, from
`projects/undercover-mob-boss/videos/trailer/src/components/FadeTransition.tsx`)
as a 5-10 frame scene-end fade-to-black on hard-cut boundaries
(S02→S03, S03→S04, S06→end) to avoid any jarring boundary. Decision
deferred to Unit 4.9 perceptual review.

### Audio placement at composition level (ADR #16)

ALL VO cue `<Audio>` elements live in `TrailerComposition.tsx`, NOT
inside scene files. Scene files are PURE VISUAL.

Pattern (consumed from Phase 2 audio manifest):

```tsx
{AUDIO_ASSETS.map(asset => (
  <Sequence
    key={asset.filename}
    from={asset.startFrame - (asset.leadFramesHint ?? 0)}
    durationInFrames={asset.actualFrames}
  >
    <Audio src={staticFile(asset.staticPath)} />
  </Sequence>
))}
```

Rationale (per ADR #16): single source of truth (audio-manifest.ts),
single placement site (TrailerComposition.tsx), scene files become
pure visual + frame-math-free. Matches UMB v3 `TrailerV3.tsx:59-63`
precedent exactly. Eliminates per-scene `cue.startFrame - sceneStart`
arithmetic. Makes Phase 2 → Phase 4 contract changes trivially
absorbable (Phase 2 ships new manifest version → Phase 4 picks up via
import, no scene-file edits).

The music bed (`<MusicBed />`) lives at the same composition level
spanning full runtime with a 14-anchor volume envelope; envelope
interpolation is CONTINUOUS across the S04→S05 hard visual cut (no
audio crossfade needed; per best-practices Finding 3 — interpolate
prevents zipper noise). The music bed is the ONLY audio element other
than the composition-level VO map.

### ADR #15 staticFile path discipline

All `staticFile()` callsites adhere to the ADR #15 directory partition:

| Asset class | Path | Example callsite |
|---|---|---|
| BURNED existing game assets | `staticFile('assets/...')` | `staticFile('assets/cards/dash-barlowe.webp')`, `staticFile('assets/arena/mahogany-horizontal.png')`, `staticFile('assets/howtoplay/pendleton-crest.png')` |
| Phase 3 NEW trailer-only assets | `staticFile('trailer/...')` | `staticFile('trailer/r15-chrome/stamp-1-frame.svg')`, `staticFile('trailer/r15-chrome/stamp-1-text.svg')`, `staticFile('trailer/briefing-room/venetian-blinds.svg')`, `staticFile('trailer/title-sequence/burned-logo-cold-open.svg')`, `staticFile('trailer/htp-fullpage.png')`, `staticFile('trailer/gameplay.mp4')`, `staticFile('trailer/audio/music-bed.mp3')` |

**`staticFile()` does NOT validate existence at call time.** Wrong
paths fail silently until render-time when the consuming `<Img>` /
`<Audio>` / `<OffthreadVideo>` tries to fetch the URL. Phase 4 audits
ALL staticFile callsites against the partition during Unit 4.0a UMB
v3 component triage; CI gate (`pnpm verify:trailer-paths`) checks for
`staticFile('assets/r15-chrome/...')` / `staticFile('assets/briefing-room/...')`
/ `staticFile('htp-fullpage.png')` / `staticFile('gameplay.mp4')` /
similar Phase 3-NEW-asset-at-BURNED-path drift via `rg --pcre2` regex.

### R15 chrome split-layer architecture

Per Phase 3 deepening contract #10: each R15 chrome instance is **2
SVG files** (`-frame.svg` + `-text.svg`) at `public/trailer/r15-chrome/`.
The outer wrapper component applies `transform-origin: center` +
`rotate(${tilt}deg) ${scaleSlap(frame)}` to BOTH layers as a single
transform. Monolithic SVG with baked-in `transform="rotate()"` would
deform during the overshoot animation, breaking the Archer-grammar
slap.

R15Stamp.tsx component API:

```tsx
<R15Stamp
  frameSvg="trailer/r15-chrome/stamp-1-frame.svg"
  textSvg="trailer/r15-chrome/stamp-1-text.svg"
  anchor="bottom-left"
  offsetPx={{ x: 500, y: 80 }}    /* x: 500 keeps the 800px-wide stamp inside the 1080×1080 mobile safe-square per amendment TIER 3 #11 */
  width={800}                     /* Phase 3 stamp #1 natural SVG width — REQUIRED per amendment TIER 1 #4 */
  height={260}                    /* Phase 3 stamp #1 natural SVG height */
  tiltDeg={-12}
  landFrame={150}
/>
```

Renders two `<Img position: absolute, inset: 0>` inside an outer
`<div>` with **explicit `width` + `height`** (per amendment TIER 1 #4)
plus `transformOrigin: 'center'` and a single
`transform: \`rotate(${tilt}deg) ${scaleSlap(frame)}\`` applied to both
SVG layers as a unit. The explicit dimensions establish a real visual
center for the overshoot pivot — without them the wrapper collapses to
0×0 and the layers visually split apart during the stamp slap.

### `m` from `motion/react`, NOT `motion` (LazyMotion strict mode) — N/A for trailer

Per BURNED CLAUDE.md "Framer Motion" section. **This is BURNED's
rule**, NOT Remotion's. **Lock for Phase 4**: Phase 4 uses
Remotion's `interpolate()` + `useCurrentFrame()` + `spring()`
exclusively. Framer Motion is NOT imported into the trailer project
— Remotion has its own animation model designed for frame-accurate
render. Mixing would introduce non-determinism (Framer Motion uses
real time / requestAnimationFrame; Remotion's render walks frames
synchronously). Single animation paradigm = simpler debugging.

### Animation paradigm: pure-Remotion + emil curve registry

Standard pattern per scene (visual-only; audio lives at composition):

```tsx
import { AbsoluteFill, Img, interpolate, useCurrentFrame, useVideoConfig, staticFile } from 'remotion';
import { EASE_OUT, archerStampSlap } from '../lib/animations';
import { Stamp } from '../components/burned-vocabulary/Stamp';  // Vendored per Phase 3 Unit 3.0

export const S01_ColdOpen: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Card flash entry — EASE_OUT not linear (emil)
  const cardOpacity = interpolate(frame, [25, 30], [0, 1], {
    easing: EASE_OUT,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Stamp slap helper — archer-grammar shape (scale 0.95 → 1.04 → 1.0)
  const { scale, rotate, opacity } = archerStampSlap({ frame, fps, landFrame: 150, tiltDeg: -12 });

  return (...);
};
```

Pattern adapted from UMB v3 scene files; per-curve choices come from
the single `src/lib/animations.ts` registry (next subsection).

### Single curve registry: `src/lib/animations.ts`

Per emil + Phase 1 deepening: ONE file owns ALL animation curves +
spring configs + the archer-slap helper. Scene files MAY NOT define
inline curves.

```ts
// src/lib/animations.ts
import { interpolate, spring, Easing } from 'remotion';
import type { SpringConfig } from 'remotion';

// ─── Easing curves (per Phase 1 deepening lock; emil curves) ──
// EASE_OUT — snap-into-place; asymmetric fast in / slow settle. Use for entry animations.
export const EASE_OUT = Easing.bezier(0.16, 1, 0.3, 1);

// EASE_IN_OUT — symmetric continuous gesture. Use for transitions that need to feel like one continuous motion.
export const EASE_IN_OUT = Easing.bezier(0.65, 0, 0.35, 1);

// EASE_DRAWER — surface reveal (dossier folder open, HTP slide-in).
export const EASE_DRAWER = Easing.bezier(0.32, 0.72, 0, 1);

// ─── Spring configs ───────────────────────────────────────────
export const ARCHER_STAMP_SPRING: SpringConfig = {
  mass: 0.6,
  damping: 12,
  stiffness: 200,
};

// Payoff variant — tighter, more aggressive overshoot for THE trailer moment
export const PAYOFF_SPRING: SpringConfig = {
  mass: 0.5,
  damping: 10,
  stiffness: 240,
};

// Cold-open logo (snappy)
export const LOGO_SPRING_COLD: SpringConfig = {
  mass: 0.3,
  damping: 10,
  stiffness: 240,
};

// Closing logo (settled, cinematic)
export const LOGO_SPRING_CLOSING: SpringConfig = {
  mass: 0.5,
  damping: 14,
  stiffness: 180,
};

// ─── Archer slap helper (Phase 1 deepening shape: scale 0.95 → 1.04 → 1.0) ──
export function archerStampSlap({
  frame,
  fps,
  landFrame,
  tiltDeg = 0,
  config = ARCHER_STAMP_SPRING,
}: {
  frame: number;
  fps: number;
  landFrame: number;
  tiltDeg?: number;
  config?: SpringConfig;
}) {
  const slap = spring({ frame: frame - landFrame, fps, config });
  // scale starts SMALLER (0.95), overshoots UP (1.04), settles at 1.0 — per Phase 1 emil lock
  const scale = interpolate(slap, [0, 0.6, 1], [0.95, 1.04, 1.0]);
  const rotate = interpolate(slap, [0, 1], [tiltDeg * 1.5, tiltDeg]);  // overshoots tilt then settles
  const opacity = interpolate(frame, [landFrame - 5, landFrame], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  return { scale, rotate, opacity };
}

// ─── Stat caption envelope (asymmetric 200ms in / 1s+ read / 400ms out per Phase 1 lock) ──
// At 30fps: 6 frames in / hold to exitFrame-12 / 12 frames out
export function statCaptionEnvelope({
  frame,
  landFrame,
  exitFrame,
}: { frame: number; landFrame: number; exitFrame: number }) {
  return interpolate(
    frame,
    [landFrame, landFrame + 6, exitFrame - 12, exitFrame],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );
}
```

NO ad-hoc helpers in scene files. NO inline scale curves. If a scene
needs a curve that isn't in this file, add it HERE first.

### Per-scene Archer test pass + Briggsy-eye sentinel files

Each scene must independently pass §2 ("could this look like a frame
from an Archer episode?"). Per insight 050 (agent verification
systematically misses perceptual continuities), the §2 read is a
fluency judgment — agent-class property checks (composition / palette
/ typography / cue alignment) are necessary but insufficient.
**Briggsy's eye on the actual rendered MP4 is mandatory.**

Phase 4 Unit 4.9 implements per-scene tests where Phase 4 renders each
scene as a standalone `<Composition id="Preview_S0N_…">` + Briggsy
reviews the encoded MP4 (NOT studio preview — production-encoded MP4
is the perceptual surface). Each scene exit writes a sentinel file:

```
videos/trailer/sample-eval/composite-build/briggsy-review-4.{N}.signoff
```

Unit 4.10 (full composition render) entry is gated on all 6 sentinels
present. Mirrors Phase 3 deepening's `briggsy-review-3.N.signoff`
pattern.

If a scene fails: structured 3-branch escalation procedure (Unit 4.9
Step 4 — per amendment SA-3 + adversarial Finding 5):

- **(a) Value-tunable failure** (radius, font size, spring config, frame timing): Phase 4 reopens Unit 4.5 (or relevant scene unit) with documented value-search bracket.
- **(b) Composition-structural failure** (which elements occupy which screen regions): Phase 1 Unit 1.5 reopens for the affected scene.
- **(c) Scene-existence failure** (the scene shouldn't exist as designed): brainstorm reopens.

Pre-iteration calibration: Briggsy + Claude pre-agree on the four §2
sub-dimensions (composition / palette / typography / cue alignment)
and pre-rank them. Iter-N must NAME the failing dimension in writing
before any edit. Iter 1 fail → iter 2: ONE edit batch addressing the
named dimension. Iter 2 fail → iter 3: if SAME dimension still
failing, structural signal — escalate immediately. If DIFFERENT
dimension failing, iter 3 is justified. Iter 3 fail → escalation tree
(a/b/c above).

### Quantitative motion-shape gate (NEW per amendment NN-2/NN-3)

Per insight 049 (sensitivity is a property of the test, not a one-time
observation), Phase 4 ships:

```
tests/scene-timing-shape.spec.ts
```

Playwright spec that samples per-frame opacity/transform for the
load-bearing cascade (S04) + closing (S06) motion sequences. Three
specs per scene:

1. Real-render shape — must match expected envelope per Phase 1 timing lock
2. Synthetic-clipped shape (fault injection) — paint a clipped opacity arc directly into the DOM; the same shape-derivation function MUST fail
3. Synthetic-correct shape — paint a correct shape; the function MUST pass

Pattern mirrors BURNED's `tests/e2e/drama-beat-timing.spec.ts` (4
existing runtime gates use the same fault-injection-canary-in-spec
shape).

Vibe-quality feedback ("feels off", "blink") MUST trigger this spec
FIRST (per insight 044 — triage hypothesis-anchoring) before any
speculative scene edit.

### Phase 4 → Phase 3 asset escalation procedure (NEW per amendment NN-7)

If a Phase 3-shipped asset fails §2 in MP4 export, Phase 4 emits:

```
videos/trailer/sample-eval/composite-build/phase-3-asset-escalation-{asset-name}.md
```

…describing the failure mode + why Remotion-side patching (filter /
color-shift / overlay) would NOT fix it. Phase 3 regenerates the
asset. This follows insight 018's "remove the problem element, don't
fight the prior" generalization to cross-phase asset escalation.

### Phase 4 output = Phase 6 deliverable candidate (renamed per amendment SA-1)

Phase 4 produces `out/trailer-scene-build.mp4` (renamed from
`trailer-preview.mp4` per best-practices Finding 6 + adversarial
Finding 6) at **H264 / CRF 18 / 1920×1080 / 30fps** — SAME encoding
as the Phase 6 deliverable. The differential between Phase 4 exit and
Phase 6 exit is NOT encoding quality (identical bits) — it's the
acceptance gate.

Phase 4 exit acceptance:
- Full render completes without decode errors
- Master §2 frame sweep: ≥10 of 12 sampled frames pass
- All 6 per-scene `briggsy-review-4.N.signoff` sentinels present
- `tests/scene-timing-shape.spec.ts` passes (cascade + closing) + fault-injection canary fires
- Music bed envelope continuous across S04→S05 hard cut (no audible click; Unit 4.10 spot-check)

Phase 6 acceptance (additional, different categories from Phase 4):
- Palette spot-check via per-frame oklab sampling
- Mobile-safe 1:1 central square audit at 12 sample frames
- LUFS verification at -16 per ADR #14
- Cold-decode test on a fresh machine (no font cache, no media cache)

**Phase 4 produces a deliverable CANDIDATE — not a final-render commitment.** Per document-review amendment TIER 2 #8 (adversarial conf 0.85 + product-lens convergent): Phase 6's acceptance tests MAY require composition-level changes that trigger a re-render — this is the expected outcome for any non-trivial QA finding. Concrete examples:
- **LUFS drift detected at Phase 6** → `MusicBed.tsx` envelope edit → re-render required.
- **Palette miss at Phase 6 oklab sampling** → `tokens.css` value adjustment → re-render required.
- **Cold-decode font fallback** (variable woff2 not loading on Phase 6's cold machine) → `useFonts.ts` retry/fallback logic → re-render required.
- **Mobile-safe audit failure** → scene-file position adjustment (e.g., S03 roster or R15 #1 anchor offset) → re-render required.

The pre-deepening "Phase 6 does NOT re-render unless QA requires composition-level change" carveout was PROCESS THEATER — the listed Phase 6 acceptance tests are EXACTLY the categories that force re-renders if they fail. Re-render is the expected workflow for non-trivial Phase 6 findings, not the exception. Phase 4 sign-off carries this honest framing forward: "the candidate is ready for Phase 6 acceptance testing," NOT "Phase 4 is final and Phase 6 just adds stamps."

What the SA-1 rename DOES eliminate: the original plan's `trailer-preview.mp4` vs Phase 6's `trailer-final.mp4` distinction implied lower encoding quality at Phase 4 (e.g., CRF 23 → 18). That threshold differential was wrong — Phase 4 encodes at the same H264/CRF 18 settings as Phase 6, so the "preview" vs "final" naming would have invited soft Phase 4 sign-offs that deferred quality decisions to a Phase 6 that may never get the headroom to be strict. Rename + identical encoding fixes that. But the acceptance-test differential is real, and re-renders driven by Phase 6 findings are expected — not avoided.

### Iteration cadence + fast-iteration window (per amendment SA-2)

Realistic Phase 4 wall-clock budget:

- Per-scene render: 0.5-2 min (S01=~30s, S04=~2min, S06=~36s)
- Master full render: 6-9 min (95s at UMB v3's ~4-frames/sec rate)
- Briggsy review per pass: ~1× clip length
- **Best case** (no S04 thrash): ~3 hours of Phase 4 wall-time
- **Realistic** (S04 needs 2-3 iterations): 2-3 sessions

Fast-iteration window for S04 (the load-bearing scene):

```tsx
// Root.tsx
<Composition
  id="Preview_S04Peak"
  component={S04_ReceiptsCascade}
  durationInFrames={390}  // frames 600-990 scene-relative (the payoff window only)
  fps={30}
  width={1920}
  height={1080}
  defaultProps={{ scenePreviewStartFrame: 600 }}  // see Unit 4.5 for the prop pattern
/>
```

Cuts S04 iteration time from ~2 min to ~30s per pass — Briggsy + Claude
tune the load-bearing payoff window without re-rendering the 20s
buildup each pass.

### Phase 5 dependency: gameplay clip + Phase 5 handoff contract

S05 (`S05_GameplayDissolve.tsx`) needs `public/trailer/gameplay.mp4`
from Phase 5 (per ADR #15 partition). Phase 4 ships with a
**placeholder** at `public/trailer/gameplay-placeholder.mp4` (separate
file, NOT overwrite) so Phase 4 standalone render works during Phase
5 in-flight; S05 switches via a build-time-generated constant
(`videos/trailer/src/lib/gameplay-clip-source.ts`, written by
`scripts/sync-gameplay-clip.ts` running as the prerender/prestudio/postinstall
lifecycle hook; per document-review amendment TIER 1 #2 — `existsSync`
cannot run inside a Remotion scene file because `node:fs` is unavailable
in the browser-rendered scene context and would crash at render time).

Both files in `.gitignore`. Atomic swap pattern when Phase 5 ships:

```
1. Phase 5 writes public/trailer/gameplay.mp4.new
2. pnpm verify:gameplay-clip ./public/trailer/gameplay.mp4.new  ← ffprobe gate
3. If gate passes: mv public/trailer/gameplay.mp4.new public/trailer/gameplay.mp4
4. If gate fails: surface the failure (duration drift / has audio / wrong aspect)
```

`pnpm verify:gameplay-clip` (NEW Phase 4 deliverable, Unit 4.6 Step 3):
- Asserts clip is EXACTLY 540 frames @ 30fps (18.000s ±0 frames)
- Asserts clip is 1920×1080 landscape
- Asserts clip has NO audio track (Phase 5 ships `ffmpeg -an`; this gate confirms)

Phase 4 also adds `muted` to `<OffthreadVideo>` as belt-and-suspenders
per Phase 2 contract #3 (eliminates a decode-time perf penalty AND
catches any future Phase 5 re-encode that accidentally sneaks audio
back in).

---

## Requirements Trace

- **R1** (in-world Pendleton briefing): Units 4.3 + 4.4 + 4.7 (briefing-room scenes apply background + chrome).
- **R3** (stacked-climax visual + audio reveal + gameplay dissolve): Unit 4.5 (stamp lands at frame 1950, 1.0s visual hold, VO `they WERE the operation` lands at same frame) + Unit 4.6 (S05 entry via hard cut after S04TailFadeToBlack overlay). **R3 mechanic is HARD CUT after payoff hold, NOT cross-dissolve** (Phase 1 deepening commit `43d44ef4`). The reveal lives ENTIRELY inside S04; the S04→S05 boundary closes the cascade scene, doesn't bridge it.
- **R4** (Dash sustained narration): Unit 4.1 composition-level audio timeline (per ADR #16) — ALL `<Audio>` cues live in `TrailerComposition.tsx`, NOT inside scene files.
- **R5** (scream cameo, conditional on Phase 0 PHASE-0-EXIT.md outcome): Unit 4.6 (S05 scream cue at frame 2400, `voice: 'dash'` with `cadenceAdapter.prefixTag: '[shouts]'` per Phase 2 voice union). Placement at composition level per ADR #16.
- **R6** (Pendleton vocabulary discipline): inherited — Phase 4 doesn't rewrite the script; consumes Phase 1's `BURNED_TRAILER_LINES` via Phase 2 audio manifest.
- **R7** (90–100s runtime, 6 scenes): Unit 4.1 composition wiring (TOTAL_FRAMES=2850 = 95.0s @ 30fps).
- **R8** (16:9 landscape, mobile-safe central square): per-scene safe-square audit in Unit 4.9 + safe-square overlay debug component for studio-preview iteration. Phase 6 owns the formal cold-decode mobile crop test.
- **R9** (Archer-coded music bed): Unit 4.1 `<MusicBed />` spans full runtime with 14-anchor volume envelope; envelope interpolation continuous across S04→S05 hard cut.
- **R10** (HTP dossier hero): Unit 4.5 cascade. Consumes `public/trailer/htp-fullpage.png` per ADR #15. `scrollRangePx` imported from `htp-capture-metadata.json` (Phase 3 Unit 3.1 contract-add per amendment SA-7).
- **R11** (goofy stats overlays with cold-read-gate finalists): Unit 4.5 cascade caption layer. `GoofyStatCaption` uses Clash Display 700 (per Phase 3 deepening lock; supersedes plan's prior General Sans usage) with semi-transparent classification-bar backdrop. Asymmetric envelope per emil/Phase 1 lock: 200ms in / 1s+ read / 400ms out. Decays to 30% chrome at side-band-right (not full fade to 0) per design-lens — preserves cascade history visual.
- **R12** (Imagen card-art curation): Units 4.2 (cold-open flashes) + 4.4 (S03 roster reveal — 6 operatives + Otto-aside typographic chrome) + 4.5 (cascade halo — `cascade-ring-layout.json` per-card geometry).
- **R13** (gameplay footage closer): Unit 4.6 (S05). Hard dependency on Phase 5 `public/trailer/gameplay.mp4`. Phase 4 ships `public/trailer/gameplay-placeholder.mp4` for standalone-render parallelism. Swap via `pnpm verify:gameplay-clip` ffprobe gate (NOT single-line edit; per amendment SA-6 + adversarial Finding 4).
- **R14** (compressed-Archer cold-open): Unit 4.2.
- **R15** (on-screen text signal layer): Units 4.2 (R15 #1) + 4.5 (R15 #2 + #3) + 4.7 (R15 #4). **Split-layer architecture**: each R15 = 2 SVG files (frame.svg + text.svg) per Phase 3 contract #10. R15 #4 filename `subhead-4-field-ready-{frame,text}.svg` at frame 2820 (NOT `subhead-4-agent-built.svg` at 2800 per Phase 3 deepening copy + frame revision).

---

## Key Technical Decisions

- **Per-scene component file** (`S01_ColdOpen.tsx` etc.) composed in `TrailerComposition.tsx`. Each scene exports a single default `React.FC` that renders all VISUAL layers for its frame range. **Scenes are pure visual — audio lives at composition level per ADR #16.**
- **Composition-level audio timeline (NEW ADR #16, per amendment MA-11 + Fork 1).** All VO `<Audio>` cues placed via `{AUDIO_ASSETS.map(asset => <Sequence from={asset.startFrame - (asset.leadFramesHint ?? 0)} durationInFrames={asset.actualFrames}><Audio src={staticFile(asset.staticPath)} /></Sequence>)}` in `TrailerComposition.tsx`. **Composition-level placement pattern matches UMB v3 `TrailerV3.tsx:59-63` precedent.** Eliminates per-scene cue-frame arithmetic. `leadFramesHint` consumption per Phase 2 contract #4 (payoff 1950 = 2 frames; scream 2400 = 1 frame; default 0). Music bed (`<MusicBed />`) is the ONLY other audio at composition level — spans full runtime; volume envelope continuous across S04→S05 hard cut.
- **`<Audio>` import discipline (NEW ADR #17, per amendment MA-2).** `<Audio>` imports ONLY from `@remotion/media`, NEVER from `'remotion'` core (which is the legacy `<Html5Audio>` wrapper). ESLint `no-restricted-imports` rule enforces. Mixed backends cause sample-rate drift over 95s + different volume-callback timing + different prop sets. `<Img>` + `<OffthreadVideo>` stay from `'remotion'` core. **Note: ADR #17 is a DELIBERATE DIVERGENCE from UMB v3, NOT an inheritance.** UMB v3 `TrailerV3.tsx:2` imports `Html5Audio` from `'remotion'` core. BURNED's ADR #17 swap to `@remotion/media` is motivated by Remotion docs delta (Mediabunny backend vs legacy Html5Audio) — better frame-accuracy, sample-rate stability, modern volume-callback semantics. The composition-level placement pattern (ADR #16) IS inherited from UMB; the audio-backend choice is independent.
- **Bare `<Series>` + scene-internal overlays (ADR #11 revised; per amendment MA-1).** NO `<TransitionSeries>` at composition level. R3 = hard cut at S04→S05 (Phase 1 deepening lock). `S04TailFadeToBlack` scene-internal overlay (frames 2025-2040 scene-relative) masks the briefing-room→BURNED-board palette jump that pure hard cut cannot.
- **Vendored BURNED vocabulary** (per Phase 3 Unit 3.0): 10 files copied from `src/client/howtoplay/components/` into `videos/trailer/src/components/burned-vocabulary/`. CI gate `pnpm verify:vocab-sync` runs `diff -r` against source. Phase 4 imports vocabulary via relative path (`./components/burned-vocabulary/Stamp`, etc.).
- **Token-import strategy: Option C fixed-value shim** (per Fork 3 + amendment SA-7). `videos/trailer/src/lib/tokens.css` clones the relevant subset of BURNED `primitives.css` token values (e.g., `--color-ochre-9: #947226`, `--color-cream-12: ...`, `--color-burned-fire: #be2e27`). Vendored `.module.css` files reference these tokens. Isolated-package architecture preserved (ADR #2); NO cross-package CSS import. Drift risk bounded: trailer has explicit fork point.
- **R15 split-layer architecture** (Phase 3 contract #10; per amendment MA-5). Each R15 instance = 2 SVG files (`-frame.svg` + `-text.svg`). `R15Stamp.tsx` API takes both files + outer wrapper applies single transform.
- **Cascade-ring-layout.json consumed** (Phase 3 contract #12; per amendment MA-10). `CardArtHalo.tsx` imports per-card position (angle, radius, z-order) + 2-frame entry stagger from `src/lib/cascade-ring-layout.json` — does NOT compute geometry inline. Composition enforces SEQUENTIAL revelation with focal hierarchy (Phase 1 deepening lock; anti-pattern guard: no frame except 1950 payoff has >2 elements at full visual weight).
- **Trailer-native shared components** in `src/components/`: `R15Stamp.tsx` (split-layer), `BriefingRoomBackground.tsx`, `DossierFolder.tsx`, `CommsTicker.tsx`, `HtpDossierHero.tsx`, `CardArtHalo.tsx`, `GoofyStatCaption.tsx`, `S04TailFadeToBlack.tsx`, `MusicBed.tsx`, vendored `FadeTransition.tsx` (from UMB v3 per amendment SA-5). Per amendment SA-5: `PendletonCrest`, `OperativeRosterReveal`, `StackedPayoffStamp` are INLINED into their consumers (single-use wrappers add no value). `DeckOf120` is CUT (invented 12×10 grid not in Phase 1 BEAT-SHEET; Phase 1 narration says "Fourteen thousand pages. Six sticky notes." not "120 cards").
- **Single curve registry** (`src/lib/animations.ts`; per amendment MA-8): 3 emil-locked easings (EASE_OUT (0.16,1,0.3,1), EASE_IN_OUT, EASE_DRAWER), 4 named springs (ARCHER_STAMP_SPRING, PAYOFF_SPRING, LOGO_SPRING_COLD, LOGO_SPRING_CLOSING), `archerStampSlap()` helper enforcing `scale(0.95) → 1.04 → 1.0` overshoot shape (Phase 1 lock), `statCaptionEnvelope()` helper enforcing asymmetric 6/30+/12 frame envelope. NO inline curves in scene files.
- **Frame constants imported from `src/lib/timing.ts`** (Phase 1 Unit 1.1). No magic numbers in scene files. `CROSS_DISSOLVE_DURATION_FRAMES` REMOVED from timing.ts (no consumer post-deepening).
- **Audio assets imported from `src/lib/audio-manifest.ts`** (Phase 2 Unit 2.8). All cues placed at composition level per ADR #16 (NOT inside scene files).
- **Visual assets via `staticFile()` + ADR #15 path discipline.** BURNED game assets at `staticFile('assets/...')`; Phase 3 NEW trailer-only assets at `staticFile('trailer/...')`. `staticFile()` does NOT validate existence at call time — wrong paths fail silently until render-time. CI gate `pnpm verify:trailer-paths` regexes for known drift patterns.
- **Variable woff2 weight syntax — NEW Unit 4.0 spike at Phase 4 entry** (per amendment MA-7 + ADR #18 pending). Remotion 4.0.x docs do NOT document `weight: '200 700'` range syntax with `@remotion/fonts.loadFont()`. Spike resolves PASS (ship 3 variable files) OR FAIL (escalate to Phase 3 for per-weight `pyftsubset` subsetting before Unit 4.1).
- **Per-scene `<Composition>` registration prefixed `Preview_`** (per amendment SA-4). 6 `<Composition id="Preview_S0N_…">` entries alongside master `<Composition id="BurnedTrailer">` for standalone scene render via `pnpm render -- src/Root.tsx Preview_S01_ColdOpen out/s01.mp4` (positional ID per Remotion 4.0.x CLI, NOT `--composition=` flag). Plus `Preview_S04Peak` (frames 600-990 only) for fast-iteration of the load-bearing payoff window.
- **Per-scene Archer test pass + Briggsy-eye sentinel files mandatory before Unit 4.10 entry** (per amendment NN-1 + document-review amendment TIER 2 #7). `briggsy-review-4.N.signoff` per scene; Unit 4.10 gated on `pnpm verify:briggsy-sentinels` exit-0 (git-author check, NOT existsSync — sentinels must be authored by `briggsy007@gmail.com` so Claude cannot fabricate them). Mirrors Phase 3 deepening pattern + closes honor-system loophole.
- **Phase 4 output = Phase 6 deliverable CANDIDATE** (per amendment SA-1 + document-review amendment TIER 2 #8 honest framing). `out/trailer-scene-build.mp4` at H264/CRF 18 — IDENTICAL encoding to Phase 6 deliverable. Phase 6 acceptance tests are ADDITIONAL DIFFERENT categories (palette/mobile/LUFS/cold-decode) AND MAY require composition-level edits that trigger re-render — re-render is the expected workflow for non-trivial Phase 6 findings, not the exception.
- **Tree-shake guard**: trailer project is isolated; ONLY the explicit `burned-vocabulary/` vendored copies cross the BURNED↔trailer boundary, and they cross via copy (not import). The trailer's `node_modules` is isolated per ADR #2. All visual content composes from `staticFile()` + vendored components + trailer-native components.

---

## Implementation Units

### Unit 4.0 — Font Load Spike (NEW per deepening amendment MA-7) — **DROPPED 2026-05-22 — RESOLVED-BY-PHASE-0**

> **DROPPED 2026-05-22.** Phase 0 Unit 0.5 already validated `weight: '200 700'` variable-axis syntax in Remotion 4.0.438 MP4 export. Evidence: `videos/trailer/sample-eval/spike/spike-results.md` §(c) — PASS verdict + explicit "Phase 4 Unit 4.0 spike redundant — DROP from Phase 4 scope on deepening re-validation" instruction at L240. `videos/trailer/src/hooks/useFonts.ts` already ships production variable-axis pattern for all 3 families (Clash Display + General Sans + JetBrains Mono). `videos/trailer/out/spike-frame-test.mp4` on disk. Deepening MA-7 missed the Phase 0 disposition — documented at [`docs/insights/066-prior-phase-exit-dispositions-can-supersede-later-units.md`](../../insights/066-prior-phase-exit-dispositions-can-supersede-later-units.md). Body below preserved for audit trail. **Carry-forward closure**: Unit 4.1 first composite render visually validates all 3 families at non-default weights to close the residual Phase 0 coverage gap (Phase 0 only MP4-verified Clash Display at 3 weights).

- [x] ~~**Unit 4.0: Font Load Spike**~~ — DROPPED 2026-05-22 (Phase 0 Unit 0.5 resolved)

**Goal:** Resolve whether `@remotion/fonts.loadFont()` in Remotion 4.0.438 accepts a variable-axis weight range string (`weight: '200 700'`) when pointed at a single variable woff2 file. PASS path: ship 3 variable woff2 (per Phase 1 contract #21). FAIL path: escalate to Phase 3 for per-weight `pyftsubset` subsetting before Unit 4.1 begins. Output: PHASE-4-FONT-SPIKE.md decision document Phase 4 Unit 4.1 consumes.

**Requirements:** R7 (composition wiring requires fonts loaded before render).

**Dependencies:** Phase 0 Unit 0.1 (scaffold + `@remotion/fonts` install), Phase 1 Unit 1.8 (typography spec — Clash Display + General Sans + JetBrains Mono Variable).

**Files:**

- Create: `videos/trailer/sample-eval/composite-build/font-spike/` directory.
- Create: `videos/trailer/sample-eval/composite-build/font-spike/SpikeComposition.tsx` — temporary spike-only composition (60 frames, single scene).
- Create: `videos/trailer/sample-eval/composite-build/font-spike/spike.mp4` — rendered output.
- Create: `videos/trailer/sample-eval/composite-build/PHASE-4-FONT-SPIKE.md` — decision document.
- Edit: `videos/trailer/src/hooks/useFonts.ts` — implements per the spike outcome (3 variable files PASS path OR N per-weight files FAIL path).

**Approach:**

**Step 1 — Spike composition.** Build a 60-frame composition rendering 6 text lines at weights 200/300/400/500/600/700 from `ClashDisplay-Variable.woff2`:

```tsx
// SpikeComposition.tsx — directional sketch (NOT implementation specification)
// Load font via @remotion/fonts variable-axis syntax
loadFont({
  family: 'Clash Display',
  url: staticFile('fonts/ClashDisplay-Variable.woff2'),
  weight: '200 700',  // THE SPIKE QUESTION: does this work?
});

// Render 6 lines at each weight (200, 300, 400, 500, 600, 700)
// Visual inspection: are intermediate weights actually rendered, or does Remotion fall back to a single weight?
```

**Step 2 — Render the spike.** `pnpm render -- src/Root.tsx FontSpike out/font-spike.mp4`. PASS criterion: ALL 6 lines render at perceptibly distinct weights (200 light → 700 bold gradient visible). FAIL criterion: lines render at the SAME weight (Remotion ignored the range syntax).

**Step 3 — Decision + PHASE-4-FONT-SPIKE.md.**

```md
# Phase 4 Font Spike — Decision (date)

## Verdict
- PASS / FAIL

## Evidence
- Spike render: sample-eval/composite-build/font-spike/spike.mp4
- Frame samples at each weight: [screenshots]

## Implementation path
- IF PASS: useFonts() loads 3 variable woff2 files via Promise.all + range weight syntax.
- IF FAIL: Escalate to Phase 3 for per-weight pyftsubset subsetting; useFonts() loads N static-weight files (estimated 5 per family × 3 families = 15 woff2 files).

## Phase 3 escalation (if FAIL)
- New asset deliverables to public/fonts/: ClashDisplay-{200,400,500,600,700}.woff2; same for GeneralSans + JetBrainsMono.
- Generation script: `scripts/subset-variable-fonts.ts` runs `pyftsubset --variation-instance="wght=N"` per target weight.
- Phase 4 Unit 4.1 useFonts() switches to per-weight Promise.all pattern (UMB v3 precedent: useFonts.ts:1-37, single-weight loadFont per file).
```

**Step 4 — useFonts.ts implementation per the spike outcome.** Two branches; one ships:

PASS branch (3 variable files):
```ts
// useFonts.ts — directional sketch
export function useFonts() {
  useEffect(() => {
    Promise.all([
      loadFont({ family: 'Clash Display', url: staticFile('fonts/ClashDisplay-Variable.woff2'), weight: '200 700' }),
      loadFont({ family: 'General Sans', url: staticFile('fonts/GeneralSans-Variable.woff2'), weight: '200 700' }),
      loadFont({ family: 'JetBrains Mono', url: staticFile('fonts/JetBrainsMono-Variable.woff2'), weight: '200 700' }),
    ]);
  }, []);
}
```

FAIL branch (N static files, per-weight Promise.all):
```ts
// useFonts.ts — directional sketch (UMB v3 precedent)
const WEIGHTS = [200, 400, 500, 600, 700];
const FAMILIES: Array<{family: string; baseName: string}> = [
  { family: 'Clash Display', baseName: 'ClashDisplay' },
  { family: 'General Sans', baseName: 'GeneralSans' },
  { family: 'JetBrains Mono', baseName: 'JetBrainsMono' },
];

export function useFonts() {
  useEffect(() => {
    Promise.all(
      FAMILIES.flatMap(f =>
        WEIGHTS.map(w =>
          loadFont({ family: f.family, url: staticFile(`fonts/${f.baseName}-${w}.woff2`), weight: String(w) })
        )
      )
    );
  }, []);
}
```

**Time-box:** 60 minutes. If the spike runs over, FAIL path is the safe default (per-weight subsetting works on every Remotion version).

**Patterns to follow:**

- UMB v3 `useFonts.ts:1-37` (per-weight pattern; FAIL-branch precedent).
- Remotion docs `packages/docs/docs/fonts-api/load-font.mdx` (Context7-fetched during Phase 3 framework-docs deepening).
- `packages/skills/skills/remotion/rules/local-fonts.md` (Promise.all pattern for multi-weight).

**Test scenarios:**

- **Spike PASS:** Render output shows 6 visually-distinct text weights.
- **Spike FAIL:** Render output shows 1 weight (likely a fallback) or rendering error at `loadFont()`.
- **Edge case:** `weight: '200 700'` accepted by `loadFont()` API but Chrome renders single weight in MP4 export — surfaces as render PASS but visual FAIL. Spike's visual-inspection step catches this.

**Verification:**

- `out/font-spike.mp4` renders without errors.
- PHASE-4-FONT-SPIKE.md verdict documented.
- `useFonts.ts` implementation matches the verdict's branch.

---

### Unit 4.0a — UMB v3 Component Triage (NEW per deepening amendment NN-4) — **COMPLETED 2026-05-22**

- [x] **Unit 4.0a: UMB v3 Component Triage** — completed 2026-05-22; decision doc at `videos/trailer/sample-eval/composite-build/umb-v3-component-triage.md`. Net: **ZERO** components vendored. FadeTransition SUPERSEDED-BY-EXISTING `SceneFadeToBlack.tsx` (deepening miss — same family as insight 066); 5 TAKE-AS-INSPIRATION (TextReveal / DocumentScroll / StatsCounter / KenBurns / CardReveal); 7 SKIP (FilmGrain confirmed via Briggsy visual eval at `temp/film-grain-eval/`; 6 UMB-terminal aesthetics).

**Goal:** Before inventing Phase 4 shared components, read UMB v3's 12 shipped trailer components and decide for each whether to (i) clone-and-adapt, (ii) take-as-inspiration-only, or (iii) skip-not-applicable. Output: `videos/trailer/sample-eval/composite-build/umb-v3-component-triage.md` table that bounds Phase 4 invention to actual gaps. Per insight 052 — read existing instrumentation FIRST.

**Requirements:** R1, R3, R10, R11, R12, R13, R15 (all visual requirements benefit from precedent triage).

**Dependencies:** ~~Unit 4.0 (font spike resolved)~~ **DROPPED 2026-05-22** (see Unit 4.0 banner — Phase 0 Unit 0.5 already resolved). No remaining blockers; vendor work proceeds.

**Files:**

- Create: `videos/trailer/sample-eval/composite-build/umb-v3-component-triage.md` — triage table.
- Optionally create (per triage outcome): vendored copies in `videos/trailer/src/components/` of UMB v3 components Phase 4 decides to clone-and-adapt.

**Approach:**

**Step 1 — Read UMB v3 component inventory.** `projects/undercover-mob-boss/videos/trailer/src/components/` contains 12 shipped components (verified Phase 4 deepening via Glob):

- `CardReveal.tsx`
- `CompactTerminalStrip.tsx`
- `DocumentScroll.tsx`
- `FadeTransition.tsx`
- `FilmGrain.tsx`
- `GamesCounter.tsx`
- `KenBurns.tsx`
- `MultiTerminal.tsx`
- `SimulationChaos.tsx`
- `SplitScreen.tsx`
- `StatsCounter.tsx`
- `TerminalSimulation.tsx`
- `TextReveal.tsx`

**Step 2 — Map each to Phase 4 need.** Tentative mapping (refine via actual file reads):

| UMB v3 | Phase 4 need | Decision (recommendation) |
|---|---|---|
| `FadeTransition.tsx` | Scene-end fade for hard-cut boundaries | **CLONE-AND-ADAPT** — already cited in amendment SA-5 + Critical Constraints; ~30 lines, scene-end fade-to-black using `useVideoConfig().durationInFrames` |
| `TextReveal.tsx` | R15 text-layer animation (split-layer architecture, text-half) | **CLONE-AND-ADAPT** if shape matches — may simplify R15Stamp text-layer animation |
| `DocumentScroll.tsx` | `HtpDossierHero` translateY scroll animation | **TAKE-AS-INSPIRATION** — UMB scrolled a multi-page document; BURNED scrolls a single HTP capture; pattern adapts but specifics differ |
| `StatsCounter.tsx` | `GoofyStatCaption` chyron layer | **TAKE-AS-INSPIRATION** — UMB counted to a number; BURNED states a stat. Reuse the chyron pattern; rewrite the counting logic. |
| `KenBurns.tsx` | Briefing-room background slow-pan? | **TAKE-AS-INSPIRATION** if slow-pan desired on S02/S03/S06 BriefingRoomBackground |
| `FilmGrain.tsx` | Trailer-wide film-grain overlay? | **DECIDE AT TRIAGE** — Phase 1 / Phase 3 don't mandate; could be Archer-coded polish; budget 30 min eval |
| `CardReveal.tsx` | S01 cold-open card flashes | **TAKE-AS-INSPIRATION** — UMB cards differed visually; pattern adapts |
| `CompactTerminalStrip.tsx`, `MultiTerminal.tsx`, `SimulationChaos.tsx`, `SplitScreen.tsx`, `TerminalSimulation.tsx`, `GamesCounter.tsx` | UMB-specific aesthetics not in BURNED scope | **SKIP** — BURNED is Pendleton briefing-room, not terminal/sim aesthetic |

**Step 3 — Triage decision document.**

```md
# UMB v3 Component Triage — Phase 4 (date)

## Triage table
[Final table per Step 2, with actual file-read verification]

## CLONE-AND-ADAPT decisions
For each: target Phase 4 file path, what changes from UMB, why this is cheaper than from-scratch.

## TAKE-AS-INSPIRATION decisions
For each: which Phase 4 component reuses the pattern, what's borrowed (shape / sequencing / animation grammar), what's rewritten (specifics).

## SKIP decisions
For each: why this UMB component doesn't apply to BURNED.

## Net Phase 4 component inventory
After triage: [list of components Phase 4 will actually build, with cleared "invented from scratch" stamps]
```

**Step 4 — Apply triage outcome.** Vendored UMB v3 components copied into `videos/trailer/src/components/` with header comment citing the UMB source line range. Take-as-inspiration components don't get copied; the inspiration is cited in the Phase 4 component's docstring.

**Patterns to follow:**

- Insight 052 (`docs/insights/052-instrumentation-bottleneck-is-promotion-not-production.md`) — read existing instrumentation FIRST.
- Phase 3 Unit 3.0 vendoring pattern (10 BURNED howtoplay files copied into `burned-vocabulary/`) — similar pattern, different source.

**Test scenarios:**

- **Happy path:** Triage completes; ≤3 components vendored from UMB; remaining Phase 4 components legitimately new (not duplicating UMB).
- **Edge case:** UMB component looks like a fit but file-read reveals tight coupling to UMB-specific assets/timing — moved to SKIP with rationale.

**Verification:**

- `umb-v3-component-triage.md` exists with decisions documented per UMB component.
- Vendored UMB v3 components (if any) exist at `videos/trailer/src/components/` with header citations.

---

### Unit 4.1 — Composition Wiring + Music Bed

- [ ] **Unit 4.1: Composition Wiring + Music Bed**

**Goal:** Wire `Root.tsx` + `TrailerComposition.tsx` to orchestrate all 6 scenes via bare `<Series>` (NOT `<TransitionSeries>` per ADR #11 revised), place the composition-level audio timeline (`AUDIO_ASSETS.map(...)` per ADR #16) + `<MusicBed />` spanning full runtime, register 6 `Preview_S0N_…` standalone scene compositions plus `Preview_S04Peak` fast-iteration composition, and produce a renderable composition the studio preview can boot.

**Requirements:** R3, R4, R7, R9.

**Dependencies:** ~~Unit 4.0 (font spike resolved)~~ **DROPPED 2026-05-22** (Phase 0 Unit 0.5 resolved — see Unit 4.0 banner), Unit 4.0a (UMB component triage applied), Phase 1 Unit 1.1 (timing.ts), Phase 2 Unit 2.8 (audio manifest at `src/lib/audio-manifest.ts` exporting `AUDIO_ASSETS`), Phase 3 Unit 3.5 (music-bed.mp3 at `public/trailer/audio/music-bed.mp3` per ADR #15), Phase 3 Unit 3.7 (visual manifest), Phase 0 Unit 0.1 (scaffold + package set), Phase 0 Unit 0.5 (composite spike). **Carry-forward gate**: first composite render visually validates all 3 families (Clash Display + General Sans + JetBrains Mono) at non-default weights — closes Phase 0 residual coverage gap.

**Files:**

- Edit: `videos/trailer/src/Root.tsx` — top-level `<Composition>` + 6 `Preview_` scene compositions + `Preview_S04Peak`.
- Create: `videos/trailer/src/TrailerComposition.tsx` — full composition orchestrator with composition-level audio timeline + bare `<Series>` scene wiring.
- Create: `videos/trailer/src/components/MusicBed.tsx` — full-runtime music with 14-anchor volume envelope.
- Edit: `videos/trailer/src/hooks/useFonts.ts` — implementation per Unit 4.0 spike outcome (NOT a stub anymore).
- Create: `videos/trailer/src/lib/tokens.css` — Option C fixed-value shim per Fork 3 (clones BURNED `primitives.css` subset).
- Create: `videos/trailer/sample-eval/composite-build/scaffold.md` — verification of studio-preview boot.
- (Optional) Create `videos/trailer/.eslintrc.cjs` with `no-restricted-imports` rule blocking `Audio` from `'remotion'` per ADR #17.

**Approach:**

**Step 1 — `Root.tsx`** (directional sketch — NOT implementation specification).

```tsx
// videos/trailer/src/Root.tsx — DIRECTIONAL
import React from 'react';
import { Composition } from 'remotion';
import { TrailerComposition } from './TrailerComposition';
import {
  TOTAL_FRAMES, FPS,
  S01_END, S02_START, S02_END, S03_START, S03_END,
  S04_START, S04_END, S05_START, S05_END, S06_START, S06_END,
  S04_PEAK_START, S04_PEAK_END,  // NEW per fast-iteration window per amendment SA-2
} from './lib/timing';
import { useFonts } from './hooks/useFonts';
import { S01_ColdOpen } from './scenes/S01_ColdOpen';
import { S02_BriefingSetup } from './scenes/S02_BriefingSetup';
import { S03_MissionBackground } from './scenes/S03_MissionBackground';
import { S04_ReceiptsCascade } from './scenes/S04_ReceiptsCascade';
import { S05_GameplayDissolve } from './scenes/S05_GameplayDissolve';
import { S06_ClosingDirective } from './scenes/S06_ClosingDirective';

export const RemotionRoot: React.FC = () => {
  useFonts();
  return (
    <>
      {/* Master composition — Phase 6 deliverable artifact source */}
      <Composition
        id="BurnedTrailer"
        component={TrailerComposition}
        durationInFrames={TOTAL_FRAMES}
        fps={FPS}
        width={1920}
        height={1080}
      />

      {/* Per-scene Preview_ compositions — Briggsy reviews each standalone before master assembly (Unit 4.9) */}
      <Composition id="Preview_S01_ColdOpen"         component={S01_ColdOpen}         durationInFrames={S01_END}                      fps={FPS} width={1920} height={1080} />
      <Composition id="Preview_S02_BriefingSetup"    component={S02_BriefingSetup}    durationInFrames={S02_END - S02_START}          fps={FPS} width={1920} height={1080} />
      <Composition id="Preview_S03_MissionBackground" component={S03_MissionBackground} durationInFrames={S03_END - S03_START}        fps={FPS} width={1920} height={1080} />
      <Composition id="Preview_S04_ReceiptsCascade"  component={S04_ReceiptsCascade}  durationInFrames={S04_END - S04_START}          fps={FPS} width={1920} height={1080} />
      <Composition id="Preview_S05_GameplayDissolve" component={S05_GameplayDissolve} durationInFrames={S05_END - S05_START}          fps={FPS} width={1920} height={1080} />
      <Composition id="Preview_S06_ClosingDirective" component={S06_ClosingDirective} durationInFrames={S06_END - S06_START}          fps={FPS} width={1920} height={1080} />

      {/* Fast-iteration window for the load-bearing payoff (per amendment SA-2) */}
      {/* Frames 600-990 scene-relative = the cascade peak + payoff hold + S04TailFadeToBlack */}
      {/* Cuts S04 iteration time from ~2 min to ~30 s per pass */}
      <Composition
        id="Preview_S04Peak"
        component={S04_ReceiptsCascade}
        durationInFrames={S04_PEAK_END - S04_PEAK_START}
        fps={FPS}
        width={1920}
        height={1080}
        defaultProps={{ scenePreviewStartFrame: S04_PEAK_START }}  // see Unit 4.5 for prop pattern
      />
    </>
  );
};
```

`timing.ts` additions: `S04_PEAK_START = 600` (scene-relative; absolute 1650), `S04_PEAK_END = 990` (scene-relative; absolute 2040). `CROSS_DISSOLVE_DURATION_FRAMES` REMOVED (no consumer post-deepening).

CLI invocation (per amendment SA-4 + framework-docs Finding 7): use positional composition-ID, NOT `--composition=` flag:

```
pnpm render -- src/Root.tsx Preview_S01_ColdOpen out/s01-coldopen.mp4
pnpm render -- src/Root.tsx Preview_S04Peak out/s04-peak.mp4  # fast iteration loop
pnpm render -- src/Root.tsx BurnedTrailer out/trailer-scene-build.mp4  # full render
```

`package.json` scripts: `"render": "remotion render"` (NO embedded composition-ID; pass via positional arg). Add `"render:full": "remotion render src/Root.tsx BurnedTrailer out/trailer-scene-build.mp4"` as convenience alias for Unit 4.10.

**Step 2 — `TrailerComposition.tsx`** (directional sketch — NOT implementation specification).

```tsx
// videos/trailer/src/TrailerComposition.tsx — DIRECTIONAL
import React from 'react';
import { AbsoluteFill, Sequence, Series, staticFile } from 'remotion';
import { Audio } from '@remotion/media';  // per ADR #17 — NOT from 'remotion' core
import {
  S01_END, S02_START, S02_END, S03_START, S03_END,
  S04_START, S04_END, S05_START, S05_END, S06_START, S06_END,
} from './lib/timing';
import { AUDIO_ASSETS } from './lib/audio-manifest';  // Phase 2 deliverable
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
      {/* Music bed spans full runtime; volume envelope continuous across S04→S05 hard cut */}
      <MusicBed />

      {/* Visual: bare Series for all 6 scenes — hard cuts at every boundary per ADR #11 revised */}
      <Series>
        <Series.Sequence durationInFrames={S01_END}>
          <S01_ColdOpen />
        </Series.Sequence>
        <Series.Sequence durationInFrames={S02_END - S02_START}>
          <S02_BriefingSetup />
        </Series.Sequence>
        <Series.Sequence durationInFrames={S03_END - S03_START}>
          <S03_MissionBackground />
        </Series.Sequence>
        <Series.Sequence durationInFrames={S04_END - S04_START}>
          <S04_ReceiptsCascade />  {/* S04 includes S04TailFadeToBlack overlay on its tail frames per amendment MA-1 */}
        </Series.Sequence>
        <Series.Sequence durationInFrames={S05_END - S05_START}>
          <S05_GameplayDissolve />
        </Series.Sequence>
        <Series.Sequence durationInFrames={S06_END - S06_START}>
          <S06_ClosingDirective />
        </Series.Sequence>
      </Series>

      {/* Audio: composition-level timeline per ADR #16 — ALL VO cues live here, NOT in scene files */}
      {/* Phase 2 audio-manifest.ts shape: AudioAsset { filename, voice, staticPath, startFrame, actualFrames, leadFramesHint?, ... } */}
      {/* See Phase 2 Unit 2.1 for the exported BURNED_TRAILER_LINES → AUDIO_ASSETS mapping */}
      {AUDIO_ASSETS.map(asset => (
        <Sequence
          key={asset.filename}
          from={asset.startFrame - (asset.leadFramesHint ?? 0)}
          durationInFrames={asset.actualFrames}
        >
          <Audio src={staticFile(asset.staticPath)} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
```

**Why bare `<Series>` instead of `<TransitionSeries>`** (per amendment MA-1):

- Phase 1 deepening (commit `43d44ef4`) locked R3 = hard cut after 1.0s payoff visual hold at S04→S05 (NOT cross-dissolve).
- Roadmap ADR #11 revised — bare `<Series>` + scene-internal overlays.
- `<TransitionSeries>` overlaps sequences during transition (`60+60−15=105` overlap pattern), shortening composite total by transition duration. Plan's prior 45-frame transition would shrink TOTAL_FRAMES from 2850 to 2805 — breaking every absolute audio cue placement from Phase 2's manifest and leaving a 45-frame BLACK GAP before S06's `from={2580}`.
- UMB v3 `TrailerV3.tsx:28-56` precedent: bare `<Series>` for all 9 scenes, ZERO `<TransitionSeries>` usage (grep-verified).
- `@remotion/transitions` package has ZERO Phase 4 consumers post-deepening — install deferred per ADR #4 revised.

**Why composition-level audio** (per amendment MA-11 + new ADR #16):

- Matches UMB v3 `TrailerV3.tsx:59-63` precedent exactly.
- Single source of truth: Phase 2 `audio-manifest.ts`.
- Scene files become pure visual — no per-scene cue-frame arithmetic (S04 currently does `cue.startFrame - 1050` inline; this disappears).
- `leadFramesHint` consumption cleanly in one place.
- Phase 2 contract changes (new cues, edited frames) absorbed via import — no scene-file edits.

**Why `<Audio>` from `@remotion/media`** (per amendment MA-2 + new ADR #17):

- Core `'remotion'` `<Audio>` is the LEGACY `<Html5Audio>` wrapper — different rendering semantics (FFmpeg vs Mediabunny), different volume-callback timing, different prop set (`startFrom`/`endAt` vs `trimBefore`/`trimAfter`).
- Mixed backends in one composition = sample-rate drift over 95s.
- ESLint `no-restricted-imports` rule (`.eslintrc.cjs`):

```js
// .eslintrc.cjs — directional
module.exports = {
  rules: {
    'no-restricted-imports': ['error', {
      paths: [{
        name: 'remotion',
        importNames: ['Audio'],
        message: 'Use Audio from @remotion/media per ADR #17 — core remotion Audio is the legacy Html5Audio wrapper.',
      }],
    }],
  },
};
```

**Step 3 — `MusicBed.tsx`** (full-runtime audio; directional sketch).

```tsx
// videos/trailer/src/components/MusicBed.tsx — DIRECTIONAL
import React from 'react';
import { Audio } from '@remotion/media';  // per ADR #17 — NOT from 'remotion'
import { interpolate, staticFile } from 'remotion';

/**
 * Music bed spanning the full trailer runtime.
 * Volume envelope per Phase 1 Unit 1.7 Step 5 music-cue map, REVISED per:
 *   - amendment MA-1: S04→S05 is now a HARD CUT at frame 2040 (NOT cross-dissolve)
 *     — envelope must be continuous across the cut (no audio crossfade; per best-practices Finding 3)
 *   - amendment SA-8: silence-beat depth deepened from 0.30 → 0.08 at frame 1995-2000
 *     to produce a true breath (emil; 0.30 dilutes the R3 payoff impact)
 *
 * Frame ranges + target volumes (REVISED):
 *   0–60     intro hook       100%
 *   60–210   cold-open bed    40%
 *   210–570  underscore build 50%
 *   570–1050 continue build   55%
 *   1050–1680 cascade swell   60–75%
 *   1680–1860 peak intensify  90%
 *   1860–1950 peak hold       90%
 *   1950–1995 sharp drop      30%  (toward silence beat)
 *   1995–2000 silence beat    8%   (true breath; SA-8 deepened)
 *   2000–2040 recovery        25%  (smooth ramp through the visual cut)
 *   2040–2535 gameplay sparse 25%  (continuous through cut; interpolation prevents zipper noise)
 *   2535–2580 iris-wipe up    50%
 *   2580–2790 closing under   60%
 *   2790–2849 final sting     100%
 */
export const MusicBed: React.FC = () => (
  <Audio
    src={staticFile('trailer/audio/music-bed.mp3')}  // per ADR #15 — NOT 'audio/music-bed.mp3'
    volume={(f) => {
      return interpolate(
        f,
        [   0,  60, 210, 570, 1050, 1680, 1860, 1950, 1995, 2000, 2040, 2535, 2580, 2790, 2849],
        [1.00, 1.00, 0.40, 0.50, 0.55, 0.75, 0.90, 0.90, 0.30, 0.08, 0.25, 0.25, 0.50, 0.60, 1.00],
        { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
      );
    }}
  />
);
```

Music-envelope-at-hard-cut design notes (per best-practices Finding 3):

- The 5pp gain ramp from 0.30→0.25 across the S04→S05 boundary is INTENTIONAL — `interpolate()` produces a continuous curve at sample granularity, preventing the zipper noise that would occur with discrete gain steps. The visual cut at frame 2040 is hard; the audio underbed flows through smoothly.
- DO NOT add a music-track crossfade at the cut. Best-practices analysis: linear interpolation across the cut frame is the industry-standard pattern for "hard visual cut, smooth audio underbed."
- The visual transition tool is `S04TailFadeToBlack` overlay (scene-internal in S04, NOT a music intervention) per amendment MA-1 + adversarial Finding 3.

**Step 4 — `useFonts.ts` (per Unit 4.0 spike outcome).**

Implementation branch per Unit 4.0 spike verdict:

- **Spike PASS** (3 variable woff2 files, range weight syntax): `Promise.all([loadFont({ family, url: staticFile('fonts/<Family>-Variable.woff2'), weight: '200 700' }) × 3])`. Render auto-blocks until promise resolves (`@remotion/fonts` integrates with `delayRender` automatically per ADR #3).
- **Spike FAIL** (per-weight static subsets from Phase 3 `pyftsubset` escalation): `Promise.all([loadFont(...) × N×3])` per UMB v3 `useFonts.ts:1-37` precedent (single-weight loadFont per file, ~15 total calls).

`useFonts()` is called inside `RemotionRoot` (Step 1) — Remotion's render auto-tracks the returned promise for delayRender; render blocks until all fonts ready (per Phase 0 §5.5 + ADR #3 — no manual `delayRender`/`continueRender` needed; no "works in studio, falls back in MP4" trap).

The PHASE-4-FONT-SPIKE.md document from Unit 4.0 documents which branch shipped + the spike's render-side evidence.

**Step 5 — `tokens.css` (Option C fixed-value shim per Fork 3).**

Per amendment SA-7 + Phase 3 Unit 3.0 deferred-to-Phase-4 decision: trailer's `videos/trailer/src/lib/tokens.css` clones the relevant subset of BURNED `src/client/styles/primitives.css` token VALUES (NOT a path-import). Vendored `.module.css` files in `burned-vocabulary/` reference these tokens; trailer-native components consume them via standard CSS.

```css
/* videos/trailer/src/lib/tokens.css — DIRECTIONAL (Option C fixed-value shim) */
/* Cloned subset of BURNED primitives.css per Phase 4 deepening fork 3. */
/* When BURNED tokens evolve, this file MAY drift — that's by design (isolated package per ADR #2). */
/* Re-sync via manual review when adopting new vocabulary; pnpm verify:vocab-sync catches CSS drift in vendored components. */

:root {
  /* Ochre scale (per Phase 1 deepening lock — Radix-style scale+step) */
  --color-ochre-3: #...;   /* light ochre — caption chrome backgrounds */
  --color-ochre-9: #947226;
  --color-ochre-12: #...;  /* darkest ochre — borders */

  /* Cream scale */
  --color-cream-3: #...;
  --color-cream-12: #...;

  /* Burned-fire (specific brand color) */
  --color-burned-fire: #be2e27;  /* NOT #c63b1e per Phase 3 deepening repo-research */

  /* Mahogany scale */
  --color-mahogany-3: #...;
  --color-mahogany-12: #...;

  /* Ink scale */
  --color-ink-3: #...;
  --color-ink-12: #...;
}
```

(Exact hex values filled in by reading BURNED's actual `primitives.css` at Unit 4.1 execution time.)

**Step 6 — Studio-preview boot verification.**

```
pnpm studio
```

Expected: Remotion studio boots in browser; ALL 8 compositions listed (`BurnedTrailer` master + 6 `Preview_S0N_…` + `Preview_S04Peak`); clicking `BurnedTrailer` opens the timeline at 95.0s; scrubbing through frames reveals each scene at its expected timecode (initially all blank stubs from skeletal scene files); audio sidebar shows ALL VO cues from AUDIO_ASSETS as separate Sequence-wrapped Audio elements + MusicBed full-runtime audio.

`scaffold.md`:

```md
# Composition Scaffold — Verified <date>

## Compositions registered
- BurnedTrailer (master, TOTAL_FRAMES=2850, 95.0s) ✓
- Preview_S01_ColdOpen (210 frames, 7.0s) ✓
- Preview_S02_BriefingSetup (360 frames, 12.0s) ✓
- Preview_S03_MissionBackground (480 frames, 16.0s) ✓
- Preview_S04_ReceiptsCascade (990 frames, 33.0s) ✓
- Preview_S05_GameplayDissolve (540 frames, 18.0s) ✓
- Preview_S06_ClosingDirective (270 frames, 9.0s) ✓
- Preview_S04Peak (390 frames, 13.0s — fast iteration of frames 600-990) ✓

## Architecture verifications
- bare <Series> + 6 <Series.Sequence> ✓ (no <TransitionSeries>)
- Composition-level audio map ✓ (X cues placed from AUDIO_ASSETS per ADR #16)
- MusicBed full runtime, 15-point volume envelope (revised per SA-8 silence beat depth) ✓
- useFonts: [3 variable / N static] per Unit 4.0 spike verdict ✓
- tokens.css shim loaded ✓ (Option C per Fork 3)
- ESLint no-restricted-imports rule active ✓ (Audio from 'remotion' blocked)

## Studio boot
- PASS (master composition visible at 95.0s; all Preview_ compositions selectable)
- Scrubbing through master timeline shows scene boundaries at expected absolute frames (210, 570, 1050, 2040, 2580)
- No console errors; fonts visible in DevTools as loaded
```

**Patterns to follow:**

- UMB v3 `Root.tsx` + `TrailerV3.tsx` pattern (`projects/undercover-mob-boss/videos/trailer/src/`) — bare `<Series>` shape verified zero `<TransitionSeries>` usage; composition-level `V3_AUDIO_TIMELINE` map at lines 59-63 is the audio-placement precedent.
- Phase 0 Unit 0.5 spike composition wiring.
- Remotion `packages/docs/docs/series.mdx` ("`<Series>` functions as `<Sequence>` under the hood since v4.0.443").
- Remotion `packages/docs/docs/miscellaneous/snippets/combine-compositions.mdx` (multi-Composition Root pattern).

**Test scenarios:**

- **Happy path:** Studio boots; all 8 compositions list; scrubbing through master timeline reveals scene boundaries at expected absolute frames; `pnpm render -- src/Root.tsx Preview_S01_ColdOpen out/s01.mp4` produces a valid MP4.
- **Edge case:** Missing audio asset → render fails at composition-level Sequence's Audio src; clear error pointing to manifest entry filename.
- **Edge case:** Missing font asset → loadFont rejects (Unit 4.0 caught this via spike); render fails early.
- **Edge case:** ESLint rule `no-restricted-imports` correctly blocks `import { Audio } from 'remotion'` at lint time (NOT just at typecheck). Verify with intentional violation in a sandbox edit.
- **Edge case:** `staticFile('trailer/audio/music-bed.mp3')` resolves correctly per ADR #15 (file at `public/trailer/audio/music-bed.mp3`, NOT `public/audio/music-bed.mp3`). Verify by `pnpm render` succeeding on `Preview_S04Peak` (which depends on MusicBed).
- **Integration:** Per-scene `Preview_` compositions standalone-render WITHOUT music bed AND WITHOUT VO cues (since both live at master composition level). This is correct behavior — standalone scenes verify visual-only composition (per amendment SA-10).

**Verification:**

- `Root.tsx` typechecks; studio boots with all 8 compositions registered.
- `TrailerComposition.tsx` typechecks; bare `<Series>` of 6 scene Sequences renders without `<TransitionSeries>` import; composition-level audio map iterates AUDIO_ASSETS correctly.
- `MusicBed.tsx` typechecks; `<Audio>` imports from `@remotion/media`; volume envelope continuous across frame 2040 (no console warning re: discontinuous interpolation).
- `useFonts.ts` typechecks per Unit 4.0 verdict branch.
- `tokens.css` loaded; vendored `burned-vocabulary/*.module.css` files reference the tokens without missing-token errors.
- ESLint passes — no `Audio from 'remotion'` violations.
- `scaffold.md` verifies boot.

---

### Unit 4.2 — S01 Cold Open Scene

- [ ] **Unit 4.2: S01 Cold Open Scene**

**Goal:** Implement `S01_ColdOpen.tsx` — 7-second compressed-Archer title sequence. 3 operative card flashes + R15 #1 classification stamp (split-layer) + BURNED logo land. **Cold-open speaker VO + brass hook intro are placed at composition level per ADR #16**, NOT inside the scene file. Scene is PURE VISUAL.

**Requirements:** R14 (cold-open), R15 (R15 #1).

**Dependencies:** Unit 4.0 (font spike), Unit 4.0a (UMB v3 triage — verify TextReveal applicability for R15 text-layer animation; verify CardReveal applicability for operative card flashes), Unit 4.1 (composition wired), Phase 3 visual assets at `public/trailer/` (operative-card-frame.svg, chevron-motif-bg.svg, burned-logo-cold-open.svg, R15 #1 stamp split-layer frame+text SVGs), Phase 3 BURNED card portraits at `public/assets/cards/` (existing).

**Files:**

- Create: `videos/trailer/src/scenes/S01_ColdOpen.tsx` (pure visual, no `<Audio>`).
- Create: `videos/trailer/src/components/R15Stamp.tsx` (split-layer API per amendment MA-5).
- Create: `videos/trailer/src/components/OperativeCardFrame.tsx` (or consume vendored `Card.tsx` from `burned-vocabulary/` if shape matches — Unit 4.0a triage decides).
- Create: `videos/trailer/sample-eval/composite-build/s01-archer-test.md`.
- Create: `videos/trailer/sample-eval/composite-build/briggsy-review-4.1.signoff` (written by Briggsy at sign-off; required for Unit 4.10 entry).

**Approach:**

**Step 1 — Scene component skeleton** (directional sketch — NOT implementation specification; PURE VISUAL, no `<Audio>` per ADR #16).

```tsx
// videos/trailer/src/scenes/S01_ColdOpen.tsx — DIRECTIONAL
import React from 'react';
import {
  AbsoluteFill, Img, interpolate, spring,
  useCurrentFrame, useVideoConfig, staticFile,
} from 'remotion';
// NOTE: NO `Audio` import — audio lives at composition level per ADR #16
import { OperativeCardFrame } from '../components/OperativeCardFrame';
import { R15Stamp } from '../components/R15Stamp';
import { EASE_OUT, LOGO_SPRING_COLD, archerStampSlap } from '../lib/animations';
import { COLD_OPEN_CARDS } from '../lib/card-roster';

export const S01_ColdOpen: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // ─── Card flash schedule (per Phase 1 Unit 1.10 S01 cues) ──
  //   Card 1 (cold-open speaker portrait):  frames 30–90    (2s)
  //   Card 2 (Dash portrait):                frames 90–150   (2s)
  //   Card 3 (third operative):              frames 150–180  (1s, briefer)
  // After frame 180: BURNED logo lands; R15 #1 stamp slaps at 150.

  // EASE_OUT curve (emil — snap into place) instead of linear (amendment MA-8)
  const card1Opacity = interpolate(frame, [25, 30, 80, 90], [0, 1, 1, 0], { easing: EASE_OUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const card2Opacity = interpolate(frame, [85, 90, 140, 150], [0, 1, 1, 0], { easing: EASE_OUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const card3Opacity = interpolate(frame, [145, 150, 170, 180], [0, 1, 1, 0], { easing: EASE_OUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // BURNED logo land at frame 180 — LOGO_SPRING_COLD (snappy, distinct from LOGO_SPRING_CLOSING per amendment SA-9)
  const logoSpring = spring({ frame: frame - 180, fps, config: LOGO_SPRING_COLD });
  // scale STARTS small, overshoots, settles — per Phase 1 lock (amendment MA-8)
  const logoScale = interpolate(logoSpring, [0, 0.6, 1], [0.95, 1.04, 1.0]);
  const logoOpacity = interpolate(frame, [175, 180], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ background: '#1a1a1a' }}>
      {/* Background chevron pattern — Phase 3 NEW asset per ADR #15 */}
      <Img
        src={staticFile('trailer/title-sequence/chevron-motif-bg.svg')}
        style={{ position: 'absolute', width: '100%', height: '100%' }}
      />

      {/* Card 1 — cold-open speaker portrait (existing BURNED asset per ADR #15) */}
      <AbsoluteFill style={{ opacity: card1Opacity, justifyContent: 'center', alignItems: 'center' }}>
        <OperativeCardFrame portraitFile={COLD_OPEN_CARDS[0].filename} operativeName={COLD_OPEN_CARDS[0].displayName} />
      </AbsoluteFill>

      {/* Card 2 — Dash portrait */}
      <AbsoluteFill style={{ opacity: card2Opacity, justifyContent: 'center', alignItems: 'center' }}>
        <OperativeCardFrame portraitFile={COLD_OPEN_CARDS[1].filename} operativeName={COLD_OPEN_CARDS[1].displayName} />
      </AbsoluteFill>

      {/* Card 3 — third operative */}
      <AbsoluteFill style={{ opacity: card3Opacity, justifyContent: 'center', alignItems: 'center' }}>
        <OperativeCardFrame portraitFile={COLD_OPEN_CARDS[2].filename} operativeName={COLD_OPEN_CARDS[2].displayName} />
      </AbsoluteFill>

      {/* R15 #1 classification stamp — split-layer per amendment MA-5 */}
      {/*
        R15 #1 MOBILE SAFE-SQUARE POSITION per document-review amendment TIER 3 #11 (design-lens F-007 conf 0.88):
        Pre-deepening offsetPx.x was 80 — stamp left-edge at x=80 spanning to x=880 (800px wide).
        Mobile safe-square left boundary is x=420, so 340px of the stamp's left edge was INVISIBLE
        on mobile (cropped). Stamp text and frame edge would have looked broken on the primary surface.

        Fix: offsetPx.x=500 places stamp left-edge at x=500 spanning to x=1300 — fully inside safe-square
        (x=420 to x=1500). Archer chrome grammar adapted: the stamp still bottom-anchored, just shifted
        inward from the literal screen edge.

        Trade-off accepted: desktop viewers see the stamp slightly more toward screen center instead of
        flush against the bottom-left corner. Per Phase 7 X-mobile-primary distribution.
      */}
      <R15Stamp
        frameSvg="trailer/r15-chrome/stamp-1-frame.svg"
        textSvg="trailer/r15-chrome/stamp-1-text.svg"
        anchor="bottom-left"
        offsetPx={{ x: 500, y: 80 }}  /* mobile safe-square per amendment TIER 3 #11 (was x: 80 — outside x=420 left crop) */
        width={800}    /* per amendment TIER 1 #4 — Phase 3 stamp #1 natural SVG width */
        height={260}   /* per amendment TIER 1 #4 — Phase 3 stamp #1 natural SVG height */
        tiltDeg={-12}
        landFrame={150}
      />

      {/* BURNED logo lands at frame 180 — scale 0.95 → 1.04 → 1.0 per Phase 1 lock */}
      <AbsoluteFill style={{
        opacity: logoOpacity,
        transform: `scale(${logoScale})`,
        justifyContent: 'center',
        alignItems: 'center',
      }}>
        <Img src={staticFile('trailer/title-sequence/burned-logo-cold-open.svg')} style={{ width: 1200 }} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
```

(NOTE: the cold-open speaker VO from Phase 2's manifest plays via the composition-level `AUDIO_ASSETS.map()` in `TrailerComposition.tsx` — it doesn't appear in this scene file at all. Verification: Unit 4.9 standalone-renders S01 WITHOUT audio, then full master renders WITH audio — both pass §2 visual; audio-visual sync verified ONLY in master per amendment SA-10.)

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

**Step 3 — `R15Stamp.tsx`** (SPLIT-LAYER per amendment MA-5; directional sketch).

```tsx
// videos/trailer/src/components/R15Stamp.tsx — DIRECTIONAL (split-layer architecture)
import React from 'react';
import { Img, useCurrentFrame, useVideoConfig, staticFile } from 'remotion';
import { archerStampSlap, ARCHER_STAMP_SPRING, PAYOFF_SPRING } from '../lib/animations';

export const R15Stamp: React.FC<{
  /** Phase 3 trailer-only asset path; resolves under public/trailer/r15-chrome/ per ADR #15 */
  frameSvg: string;
  textSvg: string;
  anchor: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right' | 'center';
  offsetPx?: { x: number; y: number };
  /**
   * Outer wrapper EXPLICIT dimensions — REQUIRED per document-review amendment TIER 1 #4
   * (design-lens F-003 conf 0.87). Both child <Img>s use `position: absolute, inset: 0`, which
   * collapses to 0×0 if the parent has no width/height. `transform-origin: center` would then
   * pivot around (0, 0) — and during the archerStampSlap overshoot (scale 0.95 → 1.04 → 1.0) the
   * frame.svg and text.svg layers visually split apart instead of slapping together as one stamp.
   * Set width + height to the SVG's natural dimensions (per Phase 3 R15 inventory below — e.g.,
   * stamp #1 frame.svg is 800×260, set width: 800 height: 260).
   */
  width: number;
  height: number;
  /** Default tilt range -15deg → 0deg; specific tilt per Phase 3 deepening per-stamp lock */
  tiltDeg?: number;
  landFrame: number;
  /** Use PAYOFF_SPRING for the R3 stacked-payoff stamp at frame 1950; ARCHER_STAMP_SPRING otherwise */
  variant?: 'standard' | 'payoff';
}> = ({ frameSvg, textSvg, anchor, offsetPx = { x: 0, y: 0 }, width, height, tiltDeg = -12, landFrame, variant = 'standard' }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Archer slap helper enforces scale(0.95) → scale(1.04) → scale(1.0) overshoot per Phase 1 lock
  const config = variant === 'payoff' ? PAYOFF_SPRING : ARCHER_STAMP_SPRING;
  const { scale, rotate, opacity } = archerStampSlap({ frame, fps, landFrame, tiltDeg, config });

  const anchorStyle: React.CSSProperties = (() => {
    switch (anchor) {
      case 'bottom-left':  return { position: 'absolute', bottom: offsetPx.y, left:  offsetPx.x };
      case 'bottom-right': return { position: 'absolute', bottom: offsetPx.y, right: offsetPx.x };
      case 'top-left':     return { position: 'absolute', top:    offsetPx.y, left:  offsetPx.x };
      case 'top-right':    return { position: 'absolute', top:    offsetPx.y, right: offsetPx.x };
      case 'center':       return { position: 'absolute', top: '50%', left: '50%' };
    }
  })();

  // Outer wrapper applies SINGLE transform to BOTH frame.svg + text.svg.
  // Explicit width + height (per amendment TIER 1 #4) establish a real center for transform-origin
  // so the archerStampSlap overshoot keeps frame.svg + text.svg locked together as one stamp.
  // Monolithic SVG with baked rotate would deform text during overshoot — split-layer keeps them rigid relative to each other.
  return (
    <div
      style={{
        ...anchorStyle,
        width,
        height,
        opacity,
        transformOrigin: 'center',
        transform: anchor === 'center'
          ? `translate(-50%, -50%) scale(${scale}) rotate(${rotate}deg)`
          : `scale(${scale}) rotate(${rotate}deg)`,
      }}
    >
      {/* Frame layer — fills wrapper via inset: 0; explicit wrapper width/height makes this work */}
      <Img src={staticFile(frameSvg)} style={{ position: 'absolute', inset: 0 }} />
      {/* Text layer — separate file so the overshoot doesn't deform letterforms; also fills wrapper */}
      <Img src={staticFile(textSvg)} style={{ position: 'absolute', inset: 0 }} />
    </div>
  );
};
```

R15 SVG file inventory (Phase 3 deliverables per amendment MA-4 + ADR #15; natural dimensions are AUTHORITATIVE for the `width`/`height` props per amendment TIER 1 #4 — Phase 3 Unit 3.4 SVG export pins these):

| Stamp | frame.svg | text.svg | Natural W×H | Scene | Land frame (absolute) |
|---|---|---|---|---|---|
| #1 OPERATION PENDLETON | `public/trailer/r15-chrome/stamp-1-frame.svg` | `public/trailer/r15-chrome/stamp-1-text.svg` | 800×260 (Phase 3 lock) | S01 | 150 |
| #2 OPERATIVE [REDACTED] — METHOD REPEATABLE | `public/trailer/r15-chrome/stamp-2-frame.svg` | `public/trailer/r15-chrome/stamp-2-text.svg` | 960×180 (Phase 3 lock) | S04 (comms-ticker pulse) | 1680 |
| #3 ASSET DELIVERED — THEY WERE THE OPERATION | `public/trailer/r15-chrome/stamp-3-frame.svg` | `public/trailer/r15-chrome/stamp-3-text.svg` | 1200×280 (Phase 3 lock; safe-square critical) | S04 (R3 stacked payoff) | 1950 (variant: 'payoff') |
| #4 OPERATION STATUS: FIELD-READY | `public/trailer/r15-chrome/subhead-4-field-ready-frame.svg` | `public/trailer/r15-chrome/subhead-4-field-ready-text.svg` | 1000×220 (Phase 3 lock) | S06 | 2820 (per amendment MA-6 — was 2800 / agent-built) |

Natural-dimension caveat: Phase 3 Unit 3.4 SVG export pins these as the viewBox / intrinsic size. If Phase 3 ships with different dimensions, Phase 4 reads the actual values from each SVG header (`<svg width="..." height="...">`) and passes them through. Mismatch between table values and on-disk values surfaces at Unit 4.2 execution — Phase 3 deliverable wins; Phase 4 adapts the prop values.

**Step 4 — Per-scene Archer test.**

`s01-archer-test.md`:

```md
# S01 Cold Open — Archer Test

## Sample frames at fixed timecodes
- [ ] Frame 30 (1.0s in): card 1 (cold-open speaker portrait) full opacity, EASE_OUT entry shape visible
- [ ] Frame 90 (3.0s in): card 2 (Dash portrait) full opacity, card 1 faded out per asymmetric envelope
- [ ] Frame 150 (5.0s in): card 3 active + R15 #1 stamp landing — verify split-layer slap (frame + text move together at overshoot scale 1.04, then settle to 1.0)
- [ ] Frame 180 (6.0s in): BURNED logo landing (snappy LOGO_SPRING_COLD scale 0.95 → 1.04 → 1.0; NOT starting from 1.4 or 0.6), all cards faded
- [ ] Frame 210 (7.0s — scene end): stamp + logo holding

## §2 Quality Bar (per BURNED CLAUDE.md + insight 050 Briggsy-eye continuities)
- [ ] Could this frame be from an Archer episode? (BRIGGSY EYE — fluency read, not property checklist; insight 050)
- [ ] Composition discipline (clear hero element + supporting layers)
- [ ] Palette discipline (tokens.css values resolved correctly; no off-palette colors)
- [ ] Typographic discipline (Clash Display + JetBrains Mono only; weights per Unit 4.0 spike outcome)

## Motion polish (per emil + Phase 1 lock)
- [ ] R15Stamp scale shape is 0.95 → 1.04 → 1.0 (NOT 1.4 → 0.95 → 1.0); verify via slow-motion playback of frames 145-160
- [ ] EASE_OUT curve visible on card opacity entries (snap-into-place, NOT linear)
- [ ] LOGO_SPRING_COLD feels distinct from LOGO_SPRING_CLOSING (S06) — snappy vs settled

## R14 acceptance
- [ ] Compressed-Archer shape lands within 8s (cold-open is 7s)
- [ ] 3 operative cards flash
- [ ] BURNED logo treatment lands
- [ ] R15 #1 stamp reads at frame 150+

## Briggsy-eye sentinel
- [ ] Per amendment NN-1: Briggsy writes `briggsy-review-4.1.signoff` after reviewing actual rendered MP4 (not studio preview alone). Unit 4.10 entry gated on sentinel presence.

## Verdict
- PASS / FAIL / iterate (3-branch escalation per Unit 4.9 if iter 3 fails)
```

**Step 5 — Render verification.**

Render S01 as standalone composition:
```
pnpm render -- src/Root.tsx Preview_S01_ColdOpen out/s01-coldopen.mp4
```

(Positional composition-ID per Remotion 4.0.x CLI per amendment SA-4 + framework-docs Finding 7; NOT `--composition=` flag.)

Per-scene render produces `out/s01-coldopen.mp4`. Briggsy reviews the actual encoded MP4 (per insight 050 — agent eyeball pass insufficient). Sentinel file `briggsy-review-4.1.signoff` written on PASS.

**Patterns to follow:**

- UMB v3 scene file structure: `projects/undercover-mob-boss/videos/trailer/src/scenes/V3S01_ColdOpen.tsx` — single FC export, AbsoluteFill wrapper, frame math inline.
- UMB v3 `CardReveal.tsx` — if Unit 4.0a triage decides TAKE-AS-INSPIRATION for card-flash pattern.
- Phase 1 Unit 1.2 Step 2 (cold-open line) + Unit 1.10 (visual cues for cold open).
- `src/lib/animations.ts` — single curve registry per amendment MA-8; no inline curves.

**Test scenarios:**

- **Happy path:** S01 renders end-to-end at production encode; all 5 test-frame samples pass §2; sentinel file written.
- **Edge case:** Missing operative card webp → render fails at staticFile (`assets/cards/dash-barlowe.webp`); clear error pointing to roster entry.
- **Edge case:** R15 #1 frame.svg or text.svg missing → render fails on the split-layer Img source; clear error pointing to `public/trailer/r15-chrome/stamp-1-…`.
- **Edge case:** R15 stamp slap reads wrong direction (1.4 → 1.0 not 0.95 → 1.04 → 1.0) → indicates archerStampSlap helper bug OR a scene file bypassed the helper with inline scale curve; fix per single-curve-registry rule.
- **Edge case:** EASE_OUT curve looks linear → indicates animations.ts shim not picking up Remotion's Easing.bezier; verify import + fall back to inline bezier expression.
- **Integration (master only per amendment SA-10):** Composition-level cold-open speaker VO from AUDIO_ASSETS plays at correct absolute frame (60) when S01 renders inside `BurnedTrailer` master; standalone `Preview_S01_ColdOpen` renders silent. Both correct.

**Verification:**

- `S01_ColdOpen.tsx` typechecks (no `Audio` import — ESLint blocks via no-restricted-imports per ADR #17), renders standalone.
- `R15Stamp.tsx` typechecks with split-layer API; renders both Img layers under single transform.
- `s01-archer-test.md` all green.
- `out/s01-coldopen.mp4` plays cleanly (silent — VO is composition-level).
- `briggsy-review-4.1.signoff` written by Briggsy after eye-on-MP4 review.

---

### Unit 4.3 — S02 Briefing Setup Scene

- [ ] **Unit 4.3: S02 Briefing Setup Scene**

**Goal:** Implement `S02_BriefingSetup.tsx` — 12-second briefing-room establishing shot. Venetian-blind shadow + dossier opens + Pendleton crest watermark + comms-ticker (HOLDING ONE LINE per design-lens, NOT rotating during VO). **Dash VO is composition-level per ADR #16.** Plus optional depth-plane foreground element per Phase 1 Unit 1.10 deepening (brass nameplate / manila folder stack / doorframe vignette — Phase 4 picks).

**Requirements:** R1.

**Dependencies:** Unit 4.0a (UMB v3 component triage — verify KenBurns applicability for briefing-room slow-pan), Unit 4.1 (composition wired), Phase 3 briefing-room assets at `public/trailer/briefing-room/` for NEW set-dressing (venetian-blinds.svg, dossier-folder-{open,closed}.svg, depth-plane SVG) + existing BURNED assets at `public/assets/arena/mahogany-horizontal.png` AND `public/assets/howtoplay/pendleton-crest.png` per amendment MA-4.

**Files:**

- Create: `videos/trailer/src/scenes/S02_BriefingSetup.tsx` (pure visual, no `<Audio>`).
- Create: `videos/trailer/src/components/BriefingRoomBackground.tsx` (shared S02 + S03 + S06).
- Create: `videos/trailer/src/components/DossierFolder.tsx`.
- ~~Create: `videos/trailer/src/components/PendletonCrest.tsx`~~ — INLINED per amendment SA-5 (4-line static wrapper not worth a component; use vendored `Crest.tsx` from `burned-vocabulary/` OR inline `<Img>` directly).
- Create: `videos/trailer/src/components/CommsTicker.tsx` (hold-one-line-during-VO behavior per design-lens).
- Create: `videos/trailer/sample-eval/composite-build/s02-archer-test.md`.
- Create: `videos/trailer/sample-eval/composite-build/briggsy-review-4.3.signoff` (Briggsy sign-off; required for Unit 4.10 entry).

**Approach:**

**Step 1 — `BriefingRoomBackground.tsx`** (shared S02 + S03 + S06; directional sketch).

```tsx
// videos/trailer/src/components/BriefingRoomBackground.tsx — DIRECTIONAL
import React from 'react';
import { AbsoluteFill, Img, interpolate, useCurrentFrame, staticFile } from 'remotion';
import { EASE_DRAWER } from '../lib/animations';

export const BriefingRoomBackground: React.FC = () => {
  const frame = useCurrentFrame();
  // Venetian-blind shadow slowly translates across the desk (1.5-2px/frame per Phase 1 deepening — survives H.264)
  const shadowOffset = interpolate(frame, [0, 360], [0, 60], {
    easing: EASE_DRAWER,
    extrapolateRight: 'clamp',
  });
  return (
    <AbsoluteFill>
      {/* Mahogany — EXISTING BURNED asset per ADR #15 + Phase 3 deepening repo-research Finding 6 */}
      <Img
        src={staticFile('assets/arena/mahogany-horizontal.png')}
        style={{ position: 'absolute', width: '100%', height: '100%', objectFit: 'cover' }}
      />
      {/* Venetian blinds — NEW Phase 3 trailer asset per ADR #15; OR replicate CSS-blinds pattern from src/client/board/GameTable.tsx:21-22 if Phase 3 doesn't ship */}
      <Img
        src={staticFile('trailer/briefing-room/venetian-blinds.svg')}
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

**Step 2 — `DossierFolder.tsx`** (open + close states with animated transition; directional sketch).

```tsx
// videos/trailer/src/components/DossierFolder.tsx — DIRECTIONAL
import React from 'react';
import { Img, interpolate, useCurrentFrame, staticFile } from 'remotion';
import { EASE_DRAWER } from '../lib/animations';

export const DossierFolder: React.FC<{
  /** State of folder over time: closed at openStart-30, fully open at openStart+60. */
  openStart: number;
  /** Optional closing animation; -1 disables. */
  closeStart?: number;
}> = ({ openStart, closeStart = -1 }) => {
  const frame = useCurrentFrame();

  // EASE_DRAWER curve (emil/Phase 1 lock) — surface reveal feel, not linear
  const opening = interpolate(frame, [openStart, openStart + 60], [0, 1], {
    easing: EASE_DRAWER,
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const closing = closeStart > 0
    ? interpolate(frame, [closeStart, closeStart + 30], [0, 1], {
        easing: EASE_DRAWER,
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
      {/* Closed folder — NEW Phase 3 trailer asset per ADR #15 */}
      <Img
        src={staticFile('trailer/briefing-room/dossier-folder-closed.svg')}
        style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          opacity: 1 - openProgress,
        }}
      />
      {/* Open folder — NEW Phase 3 trailer asset per ADR #15 */}
      <Img
        src={staticFile('trailer/briefing-room/dossier-folder-open.svg')}
        style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          opacity: openProgress,
        }}
      />
    </div>
  );
};
```

**Step 3 — Pendleton crest watermark** — INLINED per amendment SA-5 (no PendletonCrest component). Scene files render `<Img src={staticFile('assets/howtoplay/pendleton-crest.png')} style={{ position: 'absolute', width: 120, height: 120, top: 60, left: 60, opacity: 0.3 }} />` directly. (Existing BURNED asset per amendment MA-4 + repo-research Finding 6; `.png` NOT `.svg`.)

Optionally consume vendored `<Crest>` from `burned-vocabulary/` if Unit 4.0a triage decides that's a cleaner consumer interface than a raw `<Img>`. Decide at Unit 4.0a execution.

**Step 4 — `CommsTicker.tsx`** (hold-one-line-during-VO per design-lens; directional sketch).

```tsx
// videos/trailer/src/components/CommsTicker.tsx — DIRECTIONAL
import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';

// Idle lines — verified against src/client/board/DossierFeed.tsx:20-25 (repo-research Finding 8)
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
  /**
   * Per design-lens deepening: HOLD ONE LINE during a Dash VO window;
   * rotate only between VOs. If holdDuringFrames is set, idle rotation pauses inside that range.
   * Pass scene-relative frame ranges where Dash VO is sounding (look up from Phase 2 manifest cross-reference).
   * Default: rotate every 90 frames (~3s) — but this pulls eye during VO. Override per scene.
   */
  holdDuringFrames?: Array<[number, number]>;
  rotationFrames?: number;  // default 90
}> = ({ fromFrame = 0, text, holdDuringFrames = [], rotationFrames = 90 }) => {
  const frame = useCurrentFrame();
  if (frame < fromFrame) return null;

  // If we're inside a VO hold range, freeze the index at the line active when the hold started
  let displayFrame = frame;
  for (const [start, end] of holdDuringFrames) {
    if (frame >= start && frame <= end) {
      displayFrame = start;  // freeze rotation index at hold-start
      break;
    }
  }

  const idleIndex = Math.floor((displayFrame - fromFrame) / rotationFrames) % IDLE_LINES.length;
  const display = text ?? IDLE_LINES[idleIndex];
  const opacity = interpolate(frame, [fromFrame, fromFrame + 15], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0, height: 40,
      backgroundColor: 'var(--color-ink-12)',  // from tokens.css per Fork 3
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'JetBrains Mono', fontWeight: 500, fontSize: 22,
      color: 'var(--color-ochre-9)',  // from tokens.css per Fork 3
      opacity,
    }}>
      // {display}
    </div>
  );
};
```

Per amendment + design-lens: each consumer passes `holdDuringFrames` for the Dash VO windows visible in that scene to prevent the ticker from pulling the eye away from VO landings. E.g., S02 passes `[[30, 360]]` if Dash VO spans the whole scene.

**Step 5 — `S02_BriefingSetup.tsx`** (pure visual; directional sketch).

```tsx
// videos/trailer/src/scenes/S02_BriefingSetup.tsx — DIRECTIONAL (pure visual, no Audio)
import React from 'react';
import { AbsoluteFill, Img, staticFile } from 'remotion';
import { BriefingRoomBackground } from '../components/BriefingRoomBackground';
import { DossierFolder } from '../components/DossierFolder';
import { CommsTicker } from '../components/CommsTicker';

// S02 frames 210-570 absolute (scene-relative 0-360).
// Dash VO cue 240 absolute (= scene-relative 30) plays via composition-level audio map (ADR #16).
// CommsTicker holds during VO window per design-lens — Dash speaks scene-relative 30-330; hold from frame 30 onward.

export const S02_BriefingSetup: React.FC = () => {
  return (
    <AbsoluteFill>
      <BriefingRoomBackground />
      <DossierFolder openStart={30} />     {/* Folder opens at scene-relative frame 30 (= abs 240) */}

      {/* Inlined Pendleton crest watermark per amendment SA-5 — existing BURNED asset */}
      <Img
        src={staticFile('assets/howtoplay/pendleton-crest.png')}
        style={{ position: 'absolute', width: 120, height: 120, top: 60, left: 60, opacity: 0.3 }}
      />

      {/* Optional: Phase 1 Unit 1.10 depth-plane foreground element (Phase 4 picks Option A brass nameplate / B manila folders / C doorframe vignette) */}
      {/* Recommend Option A — brass nameplate M. PENDLETON / BUREAU CHIEF; render as <Img src={staticFile('trailer/briefing-room/brass-nameplate.svg')} ...> at bottom-right */}

      {/* Comms ticker holds during Dash VO scene-relative 30-330 (per design-lens) */}
      <CommsTicker fromFrame={0} holdDuringFrames={[[30, 330]]} />
    </AbsoluteFill>
  );
};
```

**Step 6 — Per-scene Archer test.**

`s02-archer-test.md`:

```md
# S02 Briefing Setup — Archer Test

## Sample frames (standalone — Dash VO from composition NOT present in scene-only render)
- [ ] Frame 0 (scene start): briefing-room background establishes, dossier closed, venetian-blind shadow starting position
- [ ] Frame 60 (2s in): dossier opening animation in progress (~50%), EASE_DRAWER curve visible (not linear)
- [ ] Frame 120 (4s in): folder open, case-sheet visible, comms-ticker holding one line (per design-lens hold-during-VO behavior — verify ticker text NOT rotating)
- [ ] Frame 240 (8s in): scene mid-state, ticker still holding same line, depth-plane element present
- [ ] Frame 360 (12s — scene end): scene-end posture before S03 hard cut

## Master-render-only checks (per amendment SA-10)
- [ ] Composition-level Dash VO from AUDIO_ASSETS plays from absolute frame 240 — synced to dossier-open animation at scene-relative 30 (= absolute 240)
- [ ] Comms-ticker holds DURING the VO window, doesn't pull eye

## §2 Quality Bar (per CLAUDE.md + insight 050 Briggsy-eye)
- [ ] Could this be from an Archer episode? (fluency read)
- [ ] Mahogany desk reads warm + Archer-coded
- [ ] Venetian-blind shadow subtle, not theatrical
- [ ] Folder opening choreography natural (EASE_DRAWER not linear)
- [ ] Comms-ticker chrome reads as set-dressing, not UI; holds one line during VO

## Briggsy-eye sentinel
- [ ] `briggsy-review-4.3.signoff` written after Briggsy reviews actual rendered MP4

## Verdict: PASS / FAIL / iterate (3-branch escalation per Unit 4.9)
```

**Patterns to follow:**

- Phase 1 Unit 1.10 S02 visual cues (background + folder + crest + ticker + depth-plane).
- UMB v3 establishing-shot pattern (V3S02 / V3S03 references) — possibly KenBurns slow-pan per Unit 4.0a triage.
- `src/client/board/DossierFeed.tsx:20-25` for verified idle-text array (already correct in CommsTicker).

**Test scenarios:**

- **Happy path:** S02 renders pure visual (no audio); folder opens with EASE_DRAWER feel; standalone-render produces clean MP4. Master render adds Dash VO at composition level.
- **Edge case:** Folder closed/open SVG transition reads as a hard cut → check EASE_DRAWER easing wired through interpolate option, not stripped.
- **Edge case:** CommsTicker rotates during VO (didn't honor holdDuringFrames) → debug the freeze-frame logic in CommsTicker.
- **Asset existence:** `staticFile('assets/arena/mahogany-horizontal.png')` + `staticFile('trailer/briefing-room/venetian-blinds.svg')` + `staticFile('trailer/briefing-room/dossier-folder-{open,closed}.svg')` + `staticFile('assets/howtoplay/pendleton-crest.png')` — all resolve to files that exist on disk. CI gate `pnpm verify:trailer-paths` catches drift.

**Verification:**

- `S02_BriefingSetup.tsx` typechecks pure visual (no `Audio` import).
- `BriefingRoomBackground.tsx`, `DossierFolder.tsx`, `CommsTicker.tsx` typecheck + render.
- `s02-archer-test.md` all green.
- Standalone render at `out/s02-briefing.mp4` produces clean silent MP4.
- `briggsy-review-4.3.signoff` written.

---

### Unit 4.4 — S03 Mission Background Scene

- [ ] **Unit 4.4: S03 Mission Background Scene**

**Goal:** Implement `S03_MissionBackground.tsx` — 16-second roster reveal scene. **6 operative portraits + Otto-aside typographic BASEMENT chrome** (per Fork 2 + amendment MA-9 — Phase 3 deepening locked NOT 7 card-art slots; matches Phase 1 narration "Seven on the roster, six in the deck, one in the basement. Don't ask."). Mid-scene dossier-page wipe. **DeckOf120 component CUT** per amendment SA-5 (invented 12×10 grid not in Phase 1 BEAT-SHEET; Phase 1 narration says "Fourteen thousand pages. Six sticky notes." not "120 cards"). Two Dash VO lines play via composition-level audio per ADR #16.

**Requirements:** R1, R12 (operative portraits).

**Dependencies:** Unit 4.1, Unit 4.3 (briefing-room components — `BriefingRoomBackground`, `CommsTicker`), Phase 3 card-roster (6 operative webps verified on disk: dash-barlowe, vera-khan, sable-ashworth, janet-broadside, neal-proctor, agent-x), Phase 1 deepening roster aside lock.

**Files:**

- Create: `videos/trailer/src/scenes/S03_MissionBackground.tsx` (pure visual; includes inline roster reveal + Otto-aside per amendment SA-5).
- ~~Create: `videos/trailer/src/components/OperativeRosterReveal.tsx`~~ — INLINED per amendment SA-5 (single-use 16-line JSX; not worth a component).
- ~~Create: `videos/trailer/src/components/DeckOf120.tsx`~~ — CUT per amendment SA-5 (not in Phase 1 BEAT-SHEET).
- Create: `videos/trailer/src/transitions/DossierPageWipe.tsx` (mid-scene wipe).
- Create: `videos/trailer/sample-eval/composite-build/s03-archer-test.md`.
- Create: `videos/trailer/sample-eval/composite-build/briggsy-review-4.4.signoff`.

**Approach:**

**Step 1 — DeckOf120 CUT.** Per amendment SA-5 + design-lens AI-slop risk + scope-guardian: the 12×10 grid is an AI-slop "many things in a circle" shape that's not in Phase 1 BEAT-SHEET. Phase 1 narration: "Fourteen thousand pages. Six sticky notes." NOT "120 cards." The mid-scene dossier-page wipe routes to the operative-roster reveal directly, not to a deck visualization.

If a "deck of 120" visual is wanted in future iteration, it must come from Phase 1 BEAT-SHEET amendment first, not Phase 4 invention.

(REMOVED — original DeckOf120 component sketch deleted per deepening.)

<details><summary>Original Step 1 (removed for reference)</summary>

The original draft proposed a 12×10 grid of card backs. CUT. See above rationale.

```tsx — REMOVED
// REMOVED per Phase 4 deepening amendment SA-5
```

</details>

**Step 2 — `OperativeRosterReveal` INLINED into S03 scene** per amendment SA-5 (single-use, no reuse, no props worth a component boundary).

The 6-operative roster is `S03_ROSTER` in `src/lib/card-roster.ts` (export `S03_ROSTER` with **exactly 6** entries: dash-barlowe, vera-khan, sable-ashworth, janet-broadside, neal-proctor, agent-x). Phase 4 deepening locks roster length: 6. Otto is NOT in `S03_ROSTER` — Otto-aside is separate typographic chrome (Step 2b).

**Step 2b — Otto-aside typographic chrome** (per Fork 2 — Typographic BASEMENT option). Phase 1 narration roster aside lock: "Seven on the roster, six in the deck, one in the basement. Don't ask." The Otto aside chrome lands at scene-relative frame 240 (after both Dash VO lines have established the roster lineup), lower-right corner, holds through scene end:

```tsx
{/* Per amendment MA-9 + Fork 2 — Typographic Otto-aside */}
{frame >= 240 && (
  <div style={{
    position: 'absolute',
    bottom: 80,
    right: 80,
    fontFamily: 'JetBrains Mono',
    fontWeight: 500,
    fontSize: 18,
    color: 'var(--color-ochre-3)',  // light ochre — chrome marginalia register, not hero
    letterSpacing: '0.1em',
    opacity: interpolate(frame, [240, 250], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
  }}>
    // OPERATIVE 07: BASEMENT &mdash; DO NOT ASK
  </div>
)}
```

Lands as classified marginalia, not chrome banner. Reads as "the documentation tells you not to ask" — matches Phase 1 narration register. NO Phase 3 asset dependency. NO Otto portrait shown (he's literally in the basement; the asset-absence IS the joke).

**Step 3 — `S03_MissionBackground.tsx`** (directional sketch; pure visual, no Audio).

```tsx
// videos/trailer/src/scenes/S03_MissionBackground.tsx — DIRECTIONAL (pure visual)
import React from 'react';
import { AbsoluteFill, Img, interpolate, useCurrentFrame, staticFile } from 'remotion';
import { BriefingRoomBackground } from '../components/BriefingRoomBackground';
import { CommsTicker } from '../components/CommsTicker';
import { DossierPageWipe } from '../transitions/DossierPageWipe';
import { EASE_OUT } from '../lib/animations';
import { S03_ROSTER } from '../lib/card-roster';  // length === 6 exactly

// Scene runs frames 0-480 relative (absolute 570-1050).
// Dash VO cues at absolute 600 (relative 30) + absolute 870 (relative 300) — composition level per ADR #16.
// Mid-scene dossier-page wipe at relative frame ~270 (= abs 840) — reveals roster fully.
// Otto-aside typographic chrome at relative frame 240+ (Step 2b).

export const S03_MissionBackground: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill>
      <BriefingRoomBackground />

      {/* Inlined OperativeRosterReveal per amendment SA-5 — 6 operatives slide in along right edge starting relative frame 180 */}
      {/*
        MOBILE SAFE-SQUARE POSITION per document-review amendment TIER 3 #11 (design-lens F-007 conf 0.88):
        Pre-deepening position was right: 80, width: 120 — cards landed at x=1720-1840 on a 1920-wide canvas,
        ENTIRELY OUTSIDE the 1080×1080 mobile safe-square (x=420 to x=1500). Trailer's primary distribution
        channel is X (mobile-first per Phase 7), so the roster would have been INVISIBLE on the primary surface.

        Fix: right: 500, width: 120 places card right-edge at x=1420 (inside safe-square right boundary x=1500
        with 80px breathing room). Card left-edge at x=1300, well inside the safe-square. Six cards stack
        vertically at the right edge of the safe-square — Archer chrome grammar adapted for the mobile crop.

        Trade-off vs desktop view: the roster now sits 420px from the desktop's right edge instead of 80px.
        Desktop viewer sees the same composition centered slightly more toward the middle. Per emil's "good
        defaults matter more than options" — the default must work for primary viewing context.

        Alternative not chosen: document roster as "desktop-only chrome; mobile crop intentional." Rejected
        because the goofy stat payoff lands in S04 and the roster reveal is part of the S03 → S04 setup —
        losing it on mobile breaks the narrative beat sheet's stat-context payoff.
      */}
      {S03_ROSTER.map((op, i) => {
        const opSlideFrame = 180 + i * 6;  // staggered entry, 2-frame stagger like cascade-ring-layout
        const x = interpolate(frame, [opSlideFrame, opSlideFrame + 20], [200, 0], {
          easing: EASE_OUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
        });
        const opacity = interpolate(frame, [opSlideFrame, opSlideFrame + 20], [0, 1], {
          easing: EASE_OUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
        });
        return (
          <div key={op.filename} style={{
            position: 'absolute',
            right: 500, top: 80 + i * 140,    /* mobile safe-square per amendment TIER 3 #11 (was right: 80 — outside x=1500 crop) */
            width: 120, height: 168,
            transform: `translateX(${x}px)`,
            opacity,
          }}>
            <Img src={staticFile(`assets/cards/${op.filename}`)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        );
      })}

      {/* Otto-aside typographic chrome per Step 2b (Fork 2 — BASEMENT option) */}
      {frame >= 240 && (
        <div style={{
          position: 'absolute',
          bottom: 80, right: 80,
          fontFamily: 'JetBrains Mono', fontWeight: 500, fontSize: 18,
          color: 'var(--color-ochre-3)',
          letterSpacing: '0.1em',
          opacity: interpolate(frame, [240, 250], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
        }}>
          // OPERATIVE 07: BASEMENT &mdash; DO NOT ASK
        </div>
      )}

      {/* Mid-scene dossier-page wipe at relative frame 270 — reveals full roster (NO deck-of-120) */}
      {frame >= 270 && frame <= 278 && (
        <DossierPageWipe />
      )}

      {/* CommsTicker holds during Dash VO windows (relative 30-90 + 300-360 approximately) */}
      <CommsTicker fromFrame={0} holdDuringFrames={[[30, 90], [300, 360]]} />
    </AbsoluteFill>
  );
};
```

Audio (Dash 600 + 870) lives at composition level per ADR #16; not present in this scene file. Standalone-render of `Preview_S03_MissionBackground` produces silent MP4 — that's correct. Master render adds audio.

**Step 4 — Per-scene Archer test.**

```md
# S03 Mission Background — Archer Test

## Sample frames (standalone — Dash VO from composition NOT present in scene-only render)
- [ ] Frame 0: scene starts, background continuous from S02
- [ ] Frame 60: scene visual mid-state (silent in standalone)
- [ ] Frame 180: roster begins sliding in along right edge (EASE_OUT visible)
- [ ] Frame 240: Otto-aside typographic chrome lands lower-right ("// OPERATIVE 07: BASEMENT — DO NOT ASK")
- [ ] Frame 270-278: dossier-page wipe transition
- [ ] Frame 360: roster fully in place
- [ ] Frame 480 (scene end): full posture before S04 hard cut

## Master-render-only checks (per amendment SA-10)
- [ ] Composition-level Dash VO #1 (abs 600) lands at scene-relative 30 (1.0s into scene)
- [ ] Composition-level Dash VO #2 (abs 870) lands at scene-relative 300 (10.0s into scene)
- [ ] Otto-aside copy lands AFTER the roster establishes lineup (sets up the "Seven on the roster..." narration)
- [ ] CommsTicker holds during BOTH VO windows (relative 30-90 + 300-360)

## §2 Quality Bar (per CLAUDE.md + insight 050 Briggsy-eye)
- [ ] Could this be from an Archer episode? (fluency read)
- [ ] Roster entry choreography reads as briefing-room formal (EASE_OUT not linear)
- [ ] 6 operative portraits readable at 120×168 thumbnail
- [ ] Otto-aside reads as classified marginalia, NOT chrome banner (subtle ochre-3, JetBrains Mono, lower-right corner — matches Phase 1 narration register)
- [ ] Continuity with S02 mahogany desk + venetian-blind shadow

## Briggsy-eye sentinel
- [ ] `briggsy-review-4.4.signoff` written

## Verdict: PASS / FAIL / iterate
```

**Verification:**

- `S03_MissionBackground.tsx` typechecks pure visual (no `Audio` import).
- `S03_ROSTER` exports length === 6 (verified at typecheck via TS literal type assertion if possible).
- `DossierPageWipe.tsx` typechecks + renders.
- `s03-archer-test.md` all green.
- Standalone render at `out/s03-mission.mp4` produces clean silent MP4.
- `briggsy-review-4.4.signoff` written.

---

### Unit 4.5 — S04 Receipts Cascade (Load-Bearing)

- [ ] **Unit 4.5: S04 Receipts Cascade**

**Goal:** Implement `S04_ReceiptsCascade.tsx` — 33-second cascade with stacked-payoff reveal. **THE trailer's load-bearing scene; R3 mechanic lives here AS A HARD CUT after 1.0s payoff hold** (Phase 1 deepening, NOT cross-dissolve). HTP hero + 17-card halo (geometry from `cascade-ring-layout.json` per Phase 3 contract #12) + 4 goofy-stat captions (Clash Display 700 with classification-bar backdrop per Phase 3 contract #13; asymmetric envelope decaying to 30% chrome at side-band-right per design-lens) + comms-ticker pulse (R15 #2 override) + R15 #2 + #3 stamps (SPLIT-LAYER per amendment MA-5; R15 #3 = payoff variant) + payoff silence beat at frame 1950-2040 + S04TailFadeToBlack overlay at frames 975-990 scene-relative (per amendment MA-1). 8 Dash VO cues play via composition-level audio per ADR #16 — NOT in this scene file. **Sequential revelation with focal hierarchy** per Phase 1 deepening anti-pattern guard: NO frame except 1950 payoff has >2 elements at full visual weight.

**Requirements:** R3, R10, R11, R12, R15.

**Dependencies:** Unit 4.0 (font spike), Unit 4.0a (UMB v3 triage — verify DocumentScroll applicability for HtpDossierHero, StatsCounter for GoofyStatCaption), Unit 4.1, Phase 1 Unit 1.5 cue table (revised sequential-revelation lock), Phase 3 Unit 3.1 HTP capture + `htp-capture-metadata.json` contract-add, Phase 3 Unit 3.2 (17 card-art), Phase 3 Unit 3.4 (R15 #2 + #3 split-layer SVGs), Phase 3 Unit 3.5 (`cascade-ring-layout.json` per-card geometry + 2-frame entry stagger), Phase 2 8 cascade WAVs in AUDIO_ASSETS manifest.

**Files:**

- Create: `videos/trailer/src/scenes/S04_ReceiptsCascade.tsx` (pure visual; consumes `scenePreviewStartFrame` prop for `Preview_S04Peak` fast-iteration window).
- Create: `videos/trailer/src/components/HtpDossierHero.tsx` (consumes `htp-capture-metadata.json` for `scrollRangePx`; has opacity prop for design-lens drop-to-50% at payoff stamp land).
- Create: `videos/trailer/src/components/CardArtHalo.tsx` (consumes `cascade-ring-layout.json` per-card geometry; right-edge-only at 40% per design-lens, NOT full 360° at 100%).
- Create: `videos/trailer/src/components/GoofyStatCaption.tsx` (Clash Display 700 per Phase 3 lock; asymmetric envelope; decay-to-30% chrome at side-band-right NOT fade to 0).
- Create: `videos/trailer/src/components/S04TailFadeToBlack.tsx` (scene-internal overlay per amendment MA-1 + adversarial Finding 3).
- ~~Create: `videos/trailer/src/components/StackedPayoffStamp.tsx`~~ — INLINED per amendment SA-5 (use `R15Stamp variant="payoff"` for the frame-1950 R3 stamp; no separate component).
- Create: `videos/trailer/sample-eval/composite-build/s04-archer-test.md`.
- Create: `videos/trailer/sample-eval/composite-build/briggsy-review-4.5.signoff`.

**Approach:**

**Step 1 — `HtpDossierHero.tsx`** (load-bearing dossier scroll; directional sketch with opacity-drop prop for sequential-revelation focal hierarchy).

```tsx
// videos/trailer/src/components/HtpDossierHero.tsx — DIRECTIONAL
import React from 'react';
import { Img, interpolate, useCurrentFrame, staticFile } from 'remotion';
import { EASE_DRAWER } from '../lib/animations';
import HTP_META from '../lib/htp-capture-metadata.json';  // Phase 3 Unit 3.1 contract-add per amendment SA-7

export const HtpDossierHero: React.FC<{
  slideInFrom: number;
  scrollFrom: number;
  scrollTo: number;
  /** OPTIONAL — if provided, hero drops to this opacity at this frame range (e.g., 50% at payoff stamp land per design-lens). */
  opacityDropToFrame?: number;
  opacityDropToValue?: number;  // default 0.5
}> = ({ slideInFrom, scrollFrom, scrollTo, opacityDropToFrame, opacityDropToValue = 0.5 }) => {
  const frame = useCurrentFrame();

  // Slide-in: bottom-up entry, 60 frames, EASE_DRAWER per emil/Phase 1 lock
  const slideY = interpolate(frame, [slideInFrom, slideInFrom + 60], [200, 0], {
    easing: EASE_DRAWER, extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const slideOpacity = interpolate(frame, [slideInFrom, slideInFrom + 60], [0, 1], {
    easing: EASE_DRAWER, extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  // Scroll: from 0 to -scrollRangePx (negative for upward scroll); range from htp-capture-metadata.json
  const scrollY = interpolate(frame, [scrollFrom, scrollTo], [0, -HTP_META.scrollRangePx], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  // Focal-hierarchy opacity drop per design-lens — hero recedes to 50% when payoff stamp lands (frame ~870-900) so the stamp owns the focal weight at frame 1950
  const focalOpacity = opacityDropToFrame !== undefined
    ? interpolate(frame, [opacityDropToFrame - 30, opacityDropToFrame], [1, opacityDropToValue], {
        extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
      })
    : 1;

  return (
    <div style={{
      position: 'absolute',
      top: '50%', left: '50%',
      width: 720,
      height: 1080,
      transform: `translate(-50%, -50%) translateY(${slideY}px)`,
      opacity: slideOpacity * focalOpacity,
      overflow: 'hidden',
    }}>
      <Img
        src={staticFile('trailer/htp-fullpage.png')}  // per ADR #15 — NOT 'htp-fullpage.png' at root
        style={{
          width: '100%',
          transform: `translateY(${scrollY}px)`,
        }}
      />
    </div>
  );
};
```

If Phase 3 ships `htp-scroll.webm` (Playwright trace-video) instead of static PNG, HtpDossierHero swaps to `<OffthreadVideo src={staticFile('trailer/htp-scroll.webm')} muted />` consumption — Phase 4 deepening defers this branch to PHASE-3-EXIT.md handoff (the file Phase 3 ships locks which capture format is used; Phase 4 reads + implements the matching branch). Both branches share the same outer `<div>` structure; only the inner content swaps.

**Step 2 — `CardArtHalo.tsx`** (consumes `cascade-ring-layout.json` per Phase 3 contract #12; right-edge-only at 40% per design-lens Finding 1, NOT full 360° at 100%; directional sketch).

```tsx
// videos/trailer/src/components/CardArtHalo.tsx — DIRECTIONAL
import React from 'react';
import { Img, interpolate, useCurrentFrame, staticFile } from 'remotion';
import { EASE_OUT } from '../lib/animations';
import LAYOUT from '../lib/cascade-ring-layout.json';  // Phase 3 Unit 3.4 deliverable

// Schema expected from Phase 3 cascade-ring-layout.json:
//   { cards: Array<{ filename: string, x: number, y: number, scale: number, zIndex: number, entryStaggerFrame: number, anchor?: 'right-edge' | 'center-full' }> }
//
// Per design-lens Finding 1 + Phase 1 deepening:
//   - Default opacity: 40% (NOT 100%) — cards form a CHROME halo, not the focal element
//   - Position: right-edge ellipse arc only (NOT full 360°) — HTP hero stays focal-center
//   - Entry stagger: 2-frame intervals per Phase 1 Unit 1.5 lock (NOT 4-frame as plan draft had)
//   - Cards enter sequentially in two waves: 3-card (right-edge opener) + 14-card (full halo expand)

export const CardArtHalo: React.FC<{
  threeCardFrom: number;
  seventeenCardFrom: number;
}> = ({ threeCardFrom, seventeenCardFrom }) => {
  const frame = useCurrentFrame();

  return (
    <>
      {LAYOUT.cards.map((card, i) => {
        // Use per-card geometry from JSON — NO inline Math.cos/sin computation
        // First 3 cards: 3-card wave starting at threeCardFrom + per-card 2-frame stagger from JSON
        // Remaining 14: 17-mosaic wave starting at seventeenCardFrom + per-card 2-frame stagger from JSON
        const baseFrame = i < 3 ? threeCardFrom : seventeenCardFrom;
        const enterFrame = baseFrame + card.entryStaggerFrame;
        const enterEnd = enterFrame + 24;

        const opacity = interpolate(frame, [enterFrame, enterEnd], [0, 0.4], {  // target 40% per design-lens
          easing: EASE_OUT,
          extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
        });
        // scale per archer-grammar shape (0.95 starting, NOT 0.6 — match Phase 1 lock)
        const scale = interpolate(frame, [enterFrame, enterEnd], [0.95, card.scale ?? 1.0], {
          easing: EASE_OUT,
          extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
        });

        return (
          <div key={card.filename} style={{
            position: 'absolute',
            left: card.x, top: card.y,
            width: 180, height: 252,
            opacity, transform: `scale(${scale})`,
            zIndex: card.zIndex,
          }}>
            <Img src={staticFile(`assets/cards/${card.filename}`)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        );
      })}
    </>
  );
};
```

If `cascade-ring-layout.json` schema differs from this expected shape, Phase 4 implementation reads the actual schema from Phase 3 deliverable and adapts. The contract is per-card position + entry stagger; the field names are Phase 3's call. Phase 4 deepening Appendix C will print the actual exported TS shape once Phase 3 lands the file.

**Step 3 — `GoofyStatCaption.tsx`** (Clash Display 700 per Phase 3 contract #13; asymmetric envelope per emil/Phase 1; decay-to-30% chrome at side-band-right per design-lens, NOT fade to 0; directional sketch).

```tsx
// videos/trailer/src/components/GoofyStatCaption.tsx — DIRECTIONAL
import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { archerStampSlap, ARCHER_STAMP_SPRING, statCaptionEnvelope } from '../lib/animations';

export const GoofyStatCaption: React.FC<{
  dryStat: string;
  absurdCompanion: string;
  landFrame: number;
  exitFrame: number;
  anchor: 'lower-left' | 'lower-center' | 'lower-right';
  /**
   * Per design-lens deepening: caption decays to 30% chrome at side-band-right after exitFrame,
   * NOT fade to 0. Preserves cascade history visual. Override with decayToZero=true if a specific
   * caption truly should exit entirely.
   */
  decayToChrome?: boolean;  // default true
  /**
   * Lifts the caption up from its anchor baseline by N pixels. Use for the receipts-stack pattern
   * (per document-review amendment TIER 1 #6; design-lens F-002 conf 0.91) when two captions share
   * the same anchor and a vertical stack reads better than slot-overwrite. Default 0.
   *
   * Example: Stat 1 at lower-left (default bottom=80), Stat 4 at lower-left with verticalOffsetPx=120
   * sits at bottom=200 — the four receipts pile up the lower-left corner thematically.
   */
  verticalOffsetPx?: number;  // default 0
}> = ({ dryStat, absurdCompanion, landFrame, exitFrame, anchor, decayToChrome = true, verticalOffsetPx = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // archerStampSlap helper enforces 0.95 → 1.04 → 1.0 shape (per Phase 1 lock; amendment MA-8)
  const { scale, rotate } = archerStampSlap({ frame, fps, landFrame, tiltDeg: -3, config: ARCHER_STAMP_SPRING });

  // Asymmetric envelope: 6 frames in / hold to exitFrame-12 / 12 frames out (per Phase 1 lock)
  // The 12-frame fade-out at exitFrame drops opacity from 1.0 to 0 via statCaptionEnvelope.
  // chromeDecay then holds at 0.30 from exitFrame onward (NOT 1.0 at exitFrame).
  //
  // IMPORTANT: chromeDecay STARTS at 0.30 (not 1.0) at exitFrame so the exiting stat
  // immediately drops to chrome register at the boundary. This prevents the anti-pattern
  // guard breach (per design-lens F-001): if chromeDecay started at 1.0 and decayed to
  // 0.30 over 12 frames, there would be a 12-frame window at every stat transition
  // (frames 360/510/630) where HTP + exiting stat (full weight) + entering stat (rising
  // to full) = 3 elements at full visual weight, violating Phase 1's "no frame except
  // 1950 payoff has >2 elements at full visual weight" anti-pattern guard.
  const baseEnvelope = statCaptionEnvelope({ frame, landFrame, exitFrame });
  const chromeDecay = decayToChrome
    ? interpolate(frame, [exitFrame, exitFrame + 60], [0.30, 0.30], {
        extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
      })
    : interpolate(frame, [exitFrame, exitFrame + 12], [1, 0], {
        extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
      });

  // Composite: baseEnvelope handles entry → hold → 12-frame fade-out to ~0.30;
  // at exitFrame the baseEnvelope reaches 0 (envelope range [0,1,1,0]),
  // chromeDecay starts at 0.30 — the seam is the 12-frame fade-out FROM 1.0 to 0.30,
  // then chromeDecay holds at 0.30 until scene end. Continuous; no boundary spike.
  const opacity = frame < exitFrame ? baseEnvelope : chromeDecay;

  const bottomPx = 80 + verticalOffsetPx;  // baseline 80px from bottom-edge + optional stack offset
  const positionStyle: React.CSSProperties = (() => {
    switch (anchor) {
      case 'lower-left':   return { position: 'absolute', bottom: bottomPx, left: 80 };
      case 'lower-center': return { position: 'absolute', bottom: bottomPx, left: '50%' };
      case 'lower-right':  return { position: 'absolute', bottom: bottomPx, right: 80 };
    }
  })();

  return (
    <div style={{
      ...positionStyle,
      transform: anchor === 'lower-center'
        ? `translateX(-50%) scale(${scale}) rotate(${rotate}deg)`
        : `scale(${scale}) rotate(${rotate}deg)`,
      opacity,
      maxWidth: 600,
    }}>
      {/* Semi-transparent classification-bar backdrop per Phase 3 contract #13 */}
      <div style={{
        backgroundColor: 'color-mix(in oklab, var(--color-ink-12) 70%, transparent)',
        padding: '8px 16px',
        borderLeft: '3px solid var(--color-burned-fire)',  // #be2e27 per Phase 1 deepening color lock
      }}>
        {/* Clash Display 700 — per Phase 3 contract #13 (NOT General Sans 600 as prior draft had) */}
        <div style={{
          fontFamily: 'Clash Display', fontWeight: 700, fontSize: 36,
          color: 'var(--color-cream-12)',
          textTransform: 'uppercase',
          letterSpacing: '0.02em',
        }}>
          {dryStat}
        </div>
        <div style={{
          fontFamily: 'Clash Display', fontWeight: 500, fontStyle: 'italic', fontSize: 28,
          color: 'var(--color-cream-12)', opacity: 0.8, marginTop: 8,
        }}>
          {absurdCompanion}
        </div>
      </div>
    </div>
  );
};
```

**Step 4 — Stacked payoff stamp INLINED into S04 scene** per amendment SA-5. Use `R15Stamp variant="payoff"` directly:

```tsx
<R15Stamp
  frameSvg="trailer/r15-chrome/stamp-3-frame.svg"
  textSvg="trailer/r15-chrome/stamp-3-text.svg"
  anchor="center"
  width={1200}         // per amendment TIER 1 #4 — Phase 3 stamp #3 natural SVG width (safe-square critical)
  height={280}         // per amendment TIER 1 #4 — Phase 3 stamp #3 natural SVG height
  tiltDeg={-3}
  landFrame={900}      // scene-relative; absolute 1950 = R3 stamp + Dash VO "they WERE the operation" land simultaneously
  variant="payoff"     // uses PAYOFF_SPRING (mass 0.5 damping 10 stiffness 240) instead of ARCHER_STAMP_SPRING
/>
```

archerStampSlap helper enforces 0.95 → 1.04 → 1.0 scale shape (NOT 1.6 → 0.95 → 1.0 as plan draft had — wrong direction per amendment MA-8). The payoff variant uses snappier spring constants for the trailer-moment "weight," not a different scale shape.

**Step 4b — `S04TailFadeToBlack.tsx`** (NEW per amendment MA-1 + adversarial Finding 3; scene-internal overlay that masks the briefing-room→BURNED-board palette jump at the S04→S05 hard cut).

```tsx
// videos/trailer/src/components/S04TailFadeToBlack.tsx — DIRECTIONAL
import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { EASE_IN_OUT } from '../lib/animations';

/**
 * Renders a full-screen black overlay that fades in on S04's tail frames (scene-relative 975-990).
 * Masks the visual palette jump from briefing-room S04 to BURNED-board S05 at the hard cut.
 * Per amendment MA-1 + adversarial Finding 3: pure hard cut produces visible palette jump that
 * the 0.5 dB music dip cannot mask. ADR #11 endorses scene-internal overlays as the transition tool.
 *
 * Paired with MANDATORY S05HeadFadeFromBlack on S05 frames 0-15 (opacity 1 → 0) for a 15+15 = 30-frame
 * "fade through black" — Archer chapter-break grammar without softening into cross-dissolve generic.
 * Symmetry is REQUIRED per amendment TIER 1 #5: S05 frame 0 = first gameplay frame (bright UI), so the
 * S04 fade must be closed by a matching S05 head fade — otherwise frame 2039=black → frame 2040=bright
 * is the exact perceptual glitch this overlay was designed to mask in the first place.
 */
export const S04TailFadeToBlack: React.FC<{
  /** Default 975 (scene-relative; absolute 2025). 15 frames before scene end at 990. */
  startFrame?: number;
}> = ({ startFrame = 975 }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [startFrame, startFrame + 15], [0, 1], {
    easing: EASE_IN_OUT,
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  return <AbsoluteFill style={{ backgroundColor: '#000', opacity, zIndex: 1000 }} />;
};
```

**REQUIRED PAIRING** (per document-review amendment TIER 1 #5; adversarial conf 0.88): the symmetric `S05HeadFadeFromBlack` overlay at S05 frames 0-15 (opacity 1 → 0) is MANDATORY, NOT optional. See Unit 4.6 Step 1c for the component sketch + the executable evidence chain (`verify:gameplay-clip` luminance gate + `verify:s05-head-fade` grep gate). The pre-deepening framing called this "optional Unit 4.9 polish"; that was wrong because S05 frame 0 = first frame of gameplay.mp4 (bright UI), and the S04 fade-to-black would close into a perceptual jump if the S05 side didn't open at black to match.

**Step 5 — `S04_ReceiptsCascade.tsx`** orchestrator (pure visual; audio at composition level per ADR #16; supports `scenePreviewStartFrame` prop for `Preview_S04Peak` fast-iteration; directional sketch).

```tsx
// videos/trailer/src/scenes/S04_ReceiptsCascade.tsx — DIRECTIONAL (pure visual)
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { BriefingRoomBackground } from '../components/BriefingRoomBackground';
import { HtpDossierHero } from '../components/HtpDossierHero';
import { CardArtHalo } from '../components/CardArtHalo';
import { GoofyStatCaption } from '../components/GoofyStatCaption';
import { R15Stamp } from '../components/R15Stamp';
import { CommsTicker } from '../components/CommsTicker';
import { S04TailFadeToBlack } from '../components/S04TailFadeToBlack';

// S04 absolute frames 1050-2040; scene-relative 0-990.
// VO cues live at composition level per ADR #16; not in this file.
// Cue table (absolute → relative) for cross-reference:
//   1080 → 30      "Operational planning."
//   1110 → 60      "Fourteen thousand pages..."
//   1290 → 240     "Mission rehearsal: 1407 contingencies..."
//   1410 → 360     "Six of them, deliberately unrehearsed..."
//   1560 → 510     "Asset profile illustrations: 17..."
//   1680 → 630     "Operatives in the active roster: 7..."
//   1950 → 900     STACKED PAYOFF (R3 stamp + Dash VO "they WERE the operation" land simultaneously)
//
// Visual cues (scene-relative):
//   HTP hero: slide-in 0-60, scroll 60-630, opacity drop to 50% at frame 870 (focal hierarchy per design-lens)
//   Halo wave 1 (3-card right-edge): starts 360, 40% opacity per design-lens
//   Halo wave 2 (14-card full halo): starts 510, 40% opacity per design-lens
//   Stat captions: land 240/360/510/630, exit 360/510/630/810 (decay to 30% chrome per design-lens, NOT fade to 0)
//   R15 #2 ticker pulse: starts 630 (lasts until cascade peak around frame 870)
//   R15 #2 ticker reverts to idle ticker at 870
//   R15 #3 stacked-payoff stamp: lands 900 (variant: 'payoff', uses PAYOFF_SPRING)
//   Payoff hold: frames 900-975 (visual freeze, music drops to silence-beat 8%)
//   S04TailFadeToBlack: frames 975-990 (15-frame fade-to-black overlay)
//   Hard cut to S05 at frame 990 (= absolute 2040)

export const S04_ReceiptsCascade: React.FC<{
  /** For Preview_S04Peak fast-iteration: starts the scene at this scene-relative frame (e.g., 600 to skip the buildup). */
  scenePreviewStartFrame?: number;
}> = ({ scenePreviewStartFrame = 0 }) => {
  // Per document-review amendment TIER 1 #1 (design-lens F-010 conf 0.82 + feasibility convergent conf 0.88):
  // wrap the entire scene in <Sequence from={-scenePreviewStartFrame}> so children's useCurrentFrame()
  // returns offset-applied values. Without this, the prop is declared but NEVER consumed — Preview_S04Peak
  // renders frames 0-389, every child landFrame > 389 never fires, the cascade peak (landFrame=900) is invisible.
  //
  // <Sequence from={X}> means the sequence starts at parent frame X. With X = -scenePreviewStartFrame
  // (negative), the sequence has already been "playing" for scenePreviewStartFrame frames at the parent's
  // frame 0. Children calling useCurrentFrame() inside the sequence read frame N + scenePreviewStartFrame.
  //
  // Master render: scenePreviewStartFrame=0 → <Sequence from={0}> → no-op shift (frames unchanged).
  // Preview_S04Peak: scenePreviewStartFrame=600 → <Sequence from={-600}> → preview frame 0 reads as 600,
  // preview frame 300 reads as 900 (cascade peak land), preview frame 389 reads as 989 (end of fade).
  //
  // EXECUTION NOTE: verify Remotion accepts negative `from` on <Sequence> at Unit 4.5 execution time.
  // If runtime errors: fall back to prop-drill (offset prop passed to every child, child adds to its
  // internal useCurrentFrame() reading). Both patterns produce identical visual output; Sequence is the
  // idiomatic Remotion pattern (no per-child plumbing) so we prefer it.

  return (
    <Sequence from={-scenePreviewStartFrame}>
      <AbsoluteFill>
        <BriefingRoomBackground />

      {/* HTP hero — slides in, scrolls, drops to 50% opacity at payoff stamp land for focal hierarchy */}
      <HtpDossierHero
        slideInFrom={0}
        scrollFrom={60}
        scrollTo={630}
        opacityDropToFrame={870}      // Per design-lens — hero recedes to 50% at frame 870 so the payoff stamp at 900 owns focal weight at 1950 absolute
        opacityDropToValue={0.5}
      />

      {/* Card art halo — geometry from cascade-ring-layout.json, 40% opacity (chrome layer) per design-lens */}
      <CardArtHalo threeCardFrom={360} seventeenCardFrom={510} />

      {/* Goofy stats (per Phase 1 Unit 1.6 finalists — Clash Display 700, decay to 30% chrome at exit per design-lens) */}
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
      {/*
        Stat 4 collision resolution per document-review amendment TIER 1 #6 (design-lens F-002 conf 0.91):
        Stat 1 (anchor="lower-left", land=240, exit=360) sits at chrome 30% in the lower-left corner
        from frame ~372 onward. Stat 4 lands at frame 630 — if both use bare anchor="lower-left" with
        default bottom=80, they paint at IDENTICAL coordinates with no z-index disambiguation
        (Stat 1 chrome shows through Stat 4's classification-bar at high transparency).

        Two options the Phase 4 executor picks between at scene-build time:

        OPTION A (default — receipts-stack metaphor; emil cohesion):
          anchor="lower-left" + verticalOffsetPx={120}
          Stat 4 sits at bottom=200, ABOVE Stat 1's residual chrome. Four receipts pile up the
          lower-left corner — thematically locked to S04 RECEIPTS Cascade. Requires the
          verticalOffsetPx prop added by amendment TIER 1 #6.

        OPTION B (anchor reassignment; simpler but Stat 3 overlap):
          anchor="lower-right" (or "lower-center") with verticalOffsetPx={0}
          Eliminates Stat 1 collision but Stat 3 (also lower-right, exit=630) is decaying to
          chrome at the exact frame Stat 4 lands. Same overlap mechanic at the OPPOSITE side.

        Pick at execution if Phase 1 Unit 1.6 locked Stat 4 anchor:
          - Phase 1 lock = lower-left → must use OPTION A
          - No Phase 1 lock → either works; default OPTION A for cohesion
      */}
      <GoofyStatCaption
        dryStat="Operatives: 7"
        absurdCompanion="(plus Agent X. Don't ask.)"
        landFrame={630} exitFrame={810}
        anchor="lower-left"
        verticalOffsetPx={120}  /* OPTION A default — stacks above Stat 1 residual chrome */
      />

      {/* R15 #2 comms-ticker pulse at relative frame 630 — text override active until cascade peak */}
      <CommsTicker fromFrame={630} text="OPERATIVE [REDACTED] — METHOD REPEATABLE" />

      {/* R3 stacked-payoff stamp at relative frame 900 (= absolute 1950). Inlined R15Stamp with variant="payoff" per amendment SA-5. */}
      {/* Per amendment MA-5: SPLIT-LAYER frame.svg + text.svg with outer rotate/scale wrapper. */}
      {/* archerStampSlap helper enforces scale 0.95 → 1.04 → 1.0 per Phase 1 lock. */}
      <R15Stamp
        frameSvg="trailer/r15-chrome/stamp-3-frame.svg"
        textSvg="trailer/r15-chrome/stamp-3-text.svg"
        anchor="center"
        width={1200}   /* per amendment TIER 1 #4 — Phase 3 stamp #3 natural SVG width (safe-square critical) */
        height={280}   /* per amendment TIER 1 #4 — Phase 3 stamp #3 natural SVG height */
        tiltDeg={-3}
        landFrame={900}
        variant="payoff"
      />

        {/* S04TailFadeToBlack — scene-internal overlay per amendment MA-1 + adversarial Finding 3 */}
        {/* Masks the briefing-room S04 → BURNED-board S05 palette jump at the hard cut at frame 990 (= absolute 2040) */}
        <S04TailFadeToBlack startFrame={975} />
      </AbsoluteFill>
    </Sequence>
  );
};
```

VO cues live in `TrailerComposition.tsx` audio map — Phase 2 ships AUDIO_ASSETS with their absolute startFrame values; the composition map handles placement uniformly. Standalone `Preview_S04_ReceiptsCascade` renders silent (visual-only); master render adds VO at composition level.

`Preview_S04Peak` (frames 600-990 in `Root.tsx`): standalone-renders the cascade peak + payoff + S04TailFadeToBlack in ~30s per pass. Use this for emil-tuning of the payoff window without re-rendering the 20s buildup each iteration.

**Step 6 — Per-scene Archer test (LOAD-BEARING; expanded).**

```md
# S04 Receipts Cascade — Archer Test (LOAD-BEARING)

## Sample frames (standalone — Dash VO from composition NOT present in scene-only render)
- [ ] Frame 0 (cascade open): HTP slides up from bottom with EASE_DRAWER curve
- [ ] Frame 120 (4s in): HTP scrolling, no captions yet (1 focal element)
- [ ] Frame 240 (8s in): Stat 1 lands lower-left with archer slap (0.95 → 1.04 → 1.0); HTP still focal (≤2 elements at full visual weight per Phase 1 anti-pattern guard)
- [ ] Frame 270 (9s in): Stat 1 decaying to 30% chrome at side-band-right (NOT fade to 0); HTP focal
- [ ] Frame 360 (12s in): Stat 2 lands center; 3-card halo opening at 40% opacity right-edge-only; HTP focal
- [ ] Frame 510 (17s in): Stat 3 lands right; 17-mosaic halo expanding at 40%; HTP focal
- [ ] Frame 630 (21s in): Stat 4 lands left; R15 #2 ticker text override active ("OPERATIVE [REDACTED] — METHOD REPEATABLE"); HTP focal
- [ ] Frame 810 (27s in): cascade peak — ALL chrome elements at 30-40% opacity; HTP focal (≤2 full-weight elements per anti-pattern guard)
- [ ] Frame 870 (29s in): HTP drops to 50% opacity (focal hierarchy hand-off to incoming stamp)
- [ ] Frame 900 (30s in): STACKED PAYOFF — R15 #3 stamp (split-layer frame+text) lands with PAYOFF_SPRING; archer slap shape 0.95 → 1.04 → 1.0; tilt -3°
- [ ] Frame 945 (31.5s in): silence beat — visual frozen, payoff stamp at full opacity, music-bed dropped to 0.08 (per amendment SA-8)
- [ ] Frame 975 (32.5s in): S04TailFadeToBlack begins (black overlay opacity 0 → 1 over 15 frames)
- [ ] Frame 990 (33s — scene end): scene cuts to black, hard cut to S05 follows immediately

## Master-render-only checks (per amendment SA-10)
- [ ] All 8 Dash VO cues land at correct absolute frames (1080/1110/1290/1410/1560/1680/1830/1950)
- [ ] R3 reveal: Dash VO "they WERE the operation" lands AT absolute frame 1950 (= scene-relative 900) simultaneously with R15 #3 stamp
- [ ] Music bed: smooth interpolation 0.30 → 0.08 → 0.25 across the silence beat + hard cut (no audible click; spot-check at frames 1950, 1995, 2040)
- [ ] CommsTicker holds during VO windows (verify ticker text doesn't rotate while Dash is speaking)

## §2 Quality Bar (TRAILER LOAD-BEARING; per CLAUDE.md + insight 050 Briggsy-eye)
- [ ] Could THIS frame be from an Archer episode? (fluency read; Briggsy-eye, not agent checklist)
- [ ] **Anti-pattern guard:** NO frame except 1950 payoff has >2 elements at full visual weight (verify via per-frame element-opacity sample at frames 240, 360, 510, 630, 810)
- [ ] Sequential revelation — elements enter + decay in waves; reads as building toward payoff, NOT layered-simultaneous AI-slop
- [ ] HTP hero readable + scrolling smoothly with EASE_DRAWER
- [ ] Card-art halo at 40% opacity right-edge-only — reads as CHROME, NOT focal
- [ ] Goofy-stat captions: Clash Display 700, classification-bar backdrop, decay to 30% chrome (not fade to 0) — preserves cascade history
- [ ] Stamp slap at frame 900 lands HARD with 0.95 → 1.04 → 1.0 shape (NOT inverted 1.6 → 0.95 → 1.0)
- [ ] Payoff silence beat reads as INTENTIONAL pause, not error; music 0.08 = true breath
- [ ] S04TailFadeToBlack reads as Archer chapter-break punctuation, NOT generic crossfade
- [ ] Mobile safe-square (per amendment TIER 3 #11): HTP + halo cluster + stamp #3 (1200×280 centered at frame 1950) all inside 1080×1080 central square (x=420 to x=1500). S03 roster (Unit 4.4) AND S01 R15 #1 stamp (Unit 4.2) now positioned inside safe-square per amendment TIER 3 #11 — verify here that the S04→S03 reverse-flow still reads (roster's right-anchored cards visually pivot toward center, not against the literal right edge). Captions OK to crop at side bands; stat 4 verticalOffsetPx=120 keeps the receipts pile inside the lower-left safe-square corner.

## R3 acceptance (HARD CUT — per Phase 1 deepening lock)
- [ ] Visual + audio reveal land simultaneously at frame 1950 (±2 frames)
- [ ] Dash VO line "they WERE the operation." lands AT the stamp slap
- [ ] 1.0s payoff visual hold (frames 1950-2040) — stamp + halo + music silence-beat all freeze
- [ ] S04TailFadeToBlack overlay covers the boundary visual transition (frames 2025-2040)
- [ ] Hard cut to S05 at frame 2040 (NOT cross-dissolve; ADR #11 revised)

## Motion-shape automation gate (per amendment NN-3)
- [ ] `tests/scene-timing-shape.spec.ts` passes for S04 — verifies per-frame opacity/transform envelope matches expected shape within tolerance
- [ ] Fault-injection canary in same spec FIRES on synthetic clipped shape (proves the gate is sensitive)

## Briggsy-eye sentinel
- [ ] `briggsy-review-4.5.signoff` written after Briggsy reviews actual rendered MP4 of `Preview_S04_ReceiptsCascade` AND `Preview_S04Peak` (both must pass §2 independently)

## Verdict
- PASS / FAIL / iterate (3-branch escalation per Unit 4.9 if iter 3 fails — composition-structural failures route to Phase 1 Unit 1.5 reopen)

S04 is the most likely scene to iterate. Phase 4 budgets up to 3 passes (per Unit 4.9 structured escalation); `Preview_S04Peak` enables ~30s iteration cycles instead of ~2 min.
```

**Verification:**

- `S04_ReceiptsCascade.tsx` typechecks pure visual (no `Audio` import).
- `HtpDossierHero.tsx` typechecks; consumes `htp-capture-metadata.json`; opacity drop prop works.
- `CardArtHalo.tsx` typechecks; consumes `cascade-ring-layout.json` per-card geometry (NO inline Math.cos/sin).
- `GoofyStatCaption.tsx` typechecks; Clash Display 700; decay-to-chrome behavior.
- `S04TailFadeToBlack.tsx` typechecks; renders black overlay at correct frames.
- `R15Stamp` split-layer renders correctly with `variant="payoff"`.
- `s04-archer-test.md` all green INCLUDING R3 acceptance (the load-bearing criterion).
- Standalone renders at `out/s04-cascade.mp4` AND `out/s04-peak.mp4` (fast-iter window).
- `tests/scene-timing-shape.spec.ts` S04 specs pass + fault-injection canary fires.
- `briggsy-review-4.5.signoff` written.

---

### Unit 4.6 — S05 Gameplay Dissolve Scene

- [ ] **Unit 4.6: S05 Gameplay Dissolve Scene**

**Goal:** Implement `S05_GameplayDissolve.tsx` — 18-second gameplay closer. **Hard cut entry from S04** (S04 owns the S04TailFadeToBlack overlay on its tail; S05 starts black-to-gameplay-reveal). Gameplay capture via `<OffthreadVideo muted>` per amendment MA-3 + Phase 2 contract #3 (belt-and-suspenders; Phase 5 ships `ffmpeg -an` audio-stripped, muted prop catches any future re-encode that sneaks audio back in). Sparse Dash VO + scream beat (if R5 kept) play via composition-level audio map per ADR #16. Iris-wipe-out at scene end (renders into S06's iris-wipe-in via S05 tail / S06 head overlap is NOT used — bare Series boundary, S06 handles the iris on its head frames).

**Requirements:** R5 (conditional scream), R13 (gameplay footage), R15 (#2 ticker continues into S05 from S04).

**Dependencies:** Unit 4.1, Phase 5 deliverable `public/trailer/gameplay.mp4` per ADR #15 (NOT `videos/trailer/public/gameplay.mp4`) — Phase 4 ships `public/trailer/gameplay-placeholder.mp4` parallel file (NOT overwrite per amendment SA-6 + adversarial Finding 10).

**Files:**

- Create: `videos/trailer/src/scenes/S05_GameplayDissolve.tsx` (pure visual; no `<Audio>`).
- Create: `scripts/generate-placeholder-gameplay.ts` (writes to `public/trailer/gameplay-placeholder.mp4` per ADR #15).
- Create: `scripts/verify-gameplay-clip.ts` (ffprobe gate; consumed by `pnpm verify:gameplay-clip` script).
- Edit: `.gitignore` to ignore both `public/trailer/gameplay.mp4` AND `public/trailer/gameplay-placeholder.mp4`.
- Create: `videos/trailer/sample-eval/composite-build/s05-archer-test.md`.
- Create: `videos/trailer/sample-eval/composite-build/briggsy-review-4.6.signoff`.

**Approach:**

**Step 1 — Scene with gameplay clip** (directional sketch; pure visual, audio at composition level).

```tsx
// videos/trailer/src/scenes/S05_GameplayDissolve.tsx — DIRECTIONAL (pure visual)
import React from 'react';
import { AbsoluteFill, OffthreadVideo, Sequence, staticFile } from 'remotion';
import { CommsTicker } from '../components/CommsTicker';
import { S05HeadFadeFromBlack } from '../components/S05HeadFadeFromBlack';
import { GAMEPLAY_CLIP_SOURCE } from '../lib/gameplay-clip-source';

// Scene: absolute frames 2040-2580; relative 0-540.
// Hard cut entry from S04 (S04's S04TailFadeToBlack closes the boundary; S05 opens to gameplay reveal).
// Gameplay clip plays the full scene.
// Sparse Dash + scream beat play via composition-level audio map per ADR #16.

// Per document-review amendment TIER 1 #2 (feasibility conf 0.88):
// GAMEPLAY_CLIP_SOURCE is generated at build time by scripts/sync-gameplay-clip.ts (runs as the
// prerender/prestudio lifecycle hook). We CANNOT call existsSync('public/trailer/gameplay.mp4')
// from this scene — node:fs is unavailable in Remotion's browser-rendered scene context and will
// crash at render time. See Step 1b for the sync script + package.json lifecycle hooks.

export const S05_GameplayDissolve: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      {/* Wrap OffthreadVideo in Sequence durationInFrames=540 so Remotion catches Phase 5 duration drift instead of silently truncating (per amendment MA-3 + adversarial Finding 4) */}
      <Sequence from={0} durationInFrames={540}>
        <OffthreadVideo
          src={staticFile(GAMEPLAY_CLIP_SOURCE)}
          muted  // per Phase 2 contract #3 + ADR #17 spirit — belt-and-suspenders even though Phase 5 ships ffmpeg -an
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </Sequence>

      {/* R15 #2 ticker continues from S04 into S05 until ~frame 360 (scene-relative) */}
      <CommsTicker fromFrame={0} text="OPERATIVE [REDACTED] — METHOD REPEATABLE" />

      {/* S05HeadFadeFromBlack — MANDATORY per document-review amendment TIER 1 #5 (adversarial conf 0.88). */}
      {/* S04 tail ends at full opacity-1 black (S04TailFadeToBlack frame 990 = absolute 2040). S05 frame 0 is the */}
      {/* gameplay clip's first frame — likely a bright BURNED-board UI frame. Without this overlay we go from */}
      {/* frame 2039=full-black → frame 2040=bright UI — EXACTLY the perceptual jump S04TailFadeToBlack was */}
      {/* designed to mask. The fade works only if S05 opens at black too. NOT optional polish. */}
      <S05HeadFadeFromBlack endFrame={15} />
    </AbsoluteFill>
  );
};
```

**Step 1b — Build-time gameplay-clip source sync** (per document-review amendment TIER 1 #2; feasibility conf 0.88).

Why this exists: amendment SA-6 introduced the placeholder-vs-real selector via `existsSync('public/trailer/gameplay.mp4')`. The pre-deepening sketch called `existsSync` at the scene's module top-level, importing from `'node:fs'`. **This crashes at render time** — Remotion bundles scene files for browser-context rendering (the studio preview pane is a Chromium iframe; server-side render uses the same browser bundle running headless). `node:fs` is not available in either context. We move the check OUT of the scene file into a pre-render script that writes a TypeScript constant the scene imports.

`scripts/sync-gameplay-clip.ts`:

```ts
// scripts/sync-gameplay-clip.ts — DIRECTIONAL
// Runs as prerender / prestudio / postinstall hook; writes a TS constant the scene imports at module load.
// SAFE: no shell-out; reads filesystem, writes one TS file. execFileSync not needed.
import { existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const REAL = resolve('public/trailer/gameplay.mp4');
const PLACEHOLDER = resolve('public/trailer/gameplay-placeholder.mp4');
const OUT = resolve('videos/trailer/src/lib/gameplay-clip-source.ts');

const chosen = existsSync(REAL) ? 'trailer/gameplay.mp4' : 'trailer/gameplay-placeholder.mp4';
const stamp = new Date().toISOString();

const body = `// GENERATED by scripts/sync-gameplay-clip.ts on ${stamp}
// DO NOT EDIT — regenerated on every prerender/prestudio/postinstall.
// Source of truth: whichever of public/trailer/gameplay.mp4 or gameplay-placeholder.mp4 exists.
// staticFile() resolves these against Phase 0 ADR #8 setPublicDir('../../public') — paths are relative to BURNED public/.
export const GAMEPLAY_CLIP_SOURCE = ${JSON.stringify(chosen)} as const;
export const GAMEPLAY_CLIP_IS_PLACEHOLDER = ${chosen.endsWith('placeholder.mp4')} as const;
`;

writeFileSync(OUT, body, 'utf8');
console.log(`[sync-gameplay-clip] wrote ${OUT} → ${chosen}`);
```

`videos/trailer/package.json` lifecycle hooks:

```json
{
  "scripts": {
    "sync-gameplay": "tsx scripts/sync-gameplay-clip.ts",
    "postinstall": "pnpm sync-gameplay",
    "prerender": "pnpm sync-gameplay",
    "prestudio": "pnpm sync-gameplay",
    "studio": "remotion studio src/Root.tsx",
    "render": "remotion render"
  }
}
```

Lifecycle behavior:
- **First clone:** `pnpm install` triggers `postinstall` → sync script runs → `gameplay-clip-source.ts` written with placeholder (since gameplay.mp4 doesn't exist yet). First `pnpm studio` works immediately.
- **Phase 5 ships locally:** `gameplay.mp4` lands. Next `pnpm studio` or `pnpm render` triggers prestudio/prerender → sync script regenerates → file now points at real clip. Scene picks up real clip on bundler re-evaluation.
- **CI run:** no `gameplay.mp4` present. postinstall regenerates with placeholder. CI proceeds with placeholder consistently.

Why we don't `.gitignore` the generated file:
- First clone needs the file to exist before any npm script runs. Gitignoring it makes `pnpm install` fail at module-resolution time (`import { GAMEPLAY_CLIP_SOURCE }` against missing file).
- Solution: commit the file with placeholder as default. Script overwrites on every regeneration. `git status` may show drift between placeholder and real-clip selection — that drift is INTENTIONAL state ("I have gameplay.mp4 locally"). Reset to placeholder before any commit that isn't promoting Phase 5 ship (`pnpm sync-gameplay` runs against a missing gameplay.mp4 to reset).
- Alternative: gitignore + commit a `gameplay-clip-source.example.ts` and a postinstall hook that `cp`s example → real. Adds complexity for ~zero benefit since the file is 4 lines.

Committed default file body (the placeholder choice — overwritten on first sync-gameplay run):

```ts
// videos/trailer/src/lib/gameplay-clip-source.ts (COMMITTED DEFAULT — regenerated by scripts/sync-gameplay-clip.ts)
export const GAMEPLAY_CLIP_SOURCE = 'trailer/gameplay-placeholder.mp4' as const;
export const GAMEPLAY_CLIP_IS_PLACEHOLDER = true as const;
```

Acceptance: `tsx scripts/sync-gameplay-clip.ts` runs cleanly with no `gameplay.mp4` present → writes placeholder constant. Touch `public/trailer/gameplay.mp4` (empty file) → rerun → writes real-clip constant. Remove → rerun → reverts. Roundtrip verified.

VO cues (sparse Dash at absolute 2280, scream cue at absolute 2400 conditional on R5 kept) live in `TrailerComposition.tsx` audio map. Phase 2 manifest exposes the scream cue conditionally — if Phase 0 PHASE-0-EXIT.md locks R5=cut, the scream WAV is not in AUDIO_ASSETS at all; the map renders without it.

**Step 1c — `S05HeadFadeFromBlack.tsx`** (MANDATORY per document-review amendment TIER 1 #5; adversarial conf 0.88).

Why this is NOT optional: amendment MA-1 added `S04TailFadeToBlack` as an S04 scene-internal overlay (frames 975-990 scene-relative; opacity 0→1) to mask the briefing-room → BURNED-board palette jump at the S04→S05 hard cut. The pre-deepening framing called the symmetric S05-side overlay "optional polish for Unit 4.9 perceptual review." That framing was wrong: `S04TailFadeToBlack` closes S04 at full opacity-1 black at frame 2040, but S05 frame 0 = first frame of `gameplay.mp4`. The gameplay clip's first frame is almost certainly a bright BURNED game-board UI frame (the cards are dealt, hand is fanned, blotter visible). **Frame 2039=full black → frame 2040=bright UI is EXACTLY the perceptual jump the fade was designed to mask in the first place.** The fade-through-black grammar only works if BOTH sides go through black. Optional polish is wrong shape; this is the closing brace of the transition.

```tsx
// videos/trailer/src/components/S05HeadFadeFromBlack.tsx — DIRECTIONAL (Archer chapter-break, symmetric pair to S04TailFadeToBlack)
import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { EASE_IN_OUT } from '../lib/animations';

/**
 * Black overlay on S05's head frames 0-endFrame. Opacity 1 → 0 over endFrame frames.
 * Pair with S04TailFadeToBlack (S04 tail frames 975-990, opacity 0 → 1) for a
 * 15+15 = 30-frame total "fade through black" Archer chapter-break grammar.
 *
 * Symmetric duration with S04TailFadeToBlack (15 frames each side) is the intended pairing —
 * even though emil's asymmetric enter/exit rule prefers fast-exit for UI feedback, this is NOT
 * a UI press; it's a deliberate cinematic chapter break. Symmetric is the Archer grammar.
 */
export const S05HeadFadeFromBlack: React.FC<{
  /** Last frame at which the overlay is non-zero; opacity reaches 0 here. Default 15 = 0.5s. */
  endFrame?: number;
}> = ({ endFrame = 15 }) => {
  const frame = useCurrentFrame();
  if (frame > endFrame) return null;  // performance: stop rendering past the visible window

  const opacity = interpolate(
    frame,
    [0, endFrame],
    [1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE_IN_OUT }
  );

  return (
    <AbsoluteFill style={{ background: '#000', opacity, pointerEvents: 'none' }} />
  );
};
```

Belt-and-suspenders: the `pnpm verify:gameplay-clip` ffprobe gate (Step 3) ALSO checks the first frame's mean luminance — if it's ≤30% the head fade may be considered redundant (still no harm), if it's >30% the head fade is load-bearing and missing it is a §2 failure. The component is always present; the luminance gate is the executable evidence that we caught the failure mode.

**Step 2 — Placeholder gameplay clip lifecycle** (per amendment SA-6 + adversarial Finding 10).

Placeholder is a SEPARATE FILE from the real gameplay clip — NOT an overwrite. Phase 4 ships `scripts/generate-placeholder-gameplay.ts`:

```ts
// scripts/generate-placeholder-gameplay.ts — DIRECTIONAL
import { execFileSync } from 'node:child_process';

// SAFE: execFileSync argv array per project-wide convention (Phase 2 deepening lock; security_reminder_hook caught)
// Writes to public/trailer/gameplay-placeholder.mp4 per ADR #15 (NOT videos/trailer/public/)
execFileSync('ffmpeg', [
  '-y',
  '-loop', '1',
  '-i', 'public/trailer/htp-fullpage.png',  // BURNED HTP capture stand-in
  '-c:v', 'libx264',
  '-t', '18',
  '-pix_fmt', 'yuv420p',
  // `force_original_aspect_ratio=cover` was invalid syntax — FFmpeg accepts
  // `disable | decrease | increase`. Phase 5 deepening surfaced; Phase 6 doc-review
  // cross-phase amendment #3 applies the fix: `increase` upscales the smaller
  // dimension to match, then crop trims overflow — same intent as the broken `cover`.
  '-vf', 'scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080',
  '-an',  // strip audio — matches Phase 5's audio-stripped contract
  'public/trailer/gameplay-placeholder.mp4',
]);
```

Both `public/trailer/gameplay.mp4` AND `public/trailer/gameplay-placeholder.mp4` in `.gitignore` (NEVER committed).

S05 picks at build-time via the generated `gameplay-clip-source.ts` constant (see Step 1b) — config flip, not file overwrite. When Phase 5 lands `gameplay.mp4` locally, the next `pnpm render`/`pnpm studio` triggers the `prerender`/`prestudio` hook which regenerates the constant pointing at the real clip. The `existsSync` check lives in the `scripts/sync-gameplay-clip.ts` Node script — NOT in the scene file, which cannot import `node:fs`.

**Step 3 — Phase 5 handoff contract** (per amendment MA-3 + adversarial Finding 4 — replaces the original "single-line edit" lie).

Phase 5 → Phase 4 handoff procedure:

1. Phase 5 writes `public/trailer/gameplay.mp4.new`
2. Run `pnpm verify:gameplay-clip ./public/trailer/gameplay.mp4.new` — ffprobe gate
3. If gate passes: `mv public/trailer/gameplay.mp4.new public/trailer/gameplay.mp4`
4. If gate fails: surface failure (duration drift / has audio / wrong aspect); Phase 5 re-encodes

`scripts/verify-gameplay-clip.ts`:

```ts
// scripts/verify-gameplay-clip.ts — DIRECTIONAL
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const file = process.argv[2];
if (!file) { console.error('Usage: verify-gameplay-clip <file>'); process.exit(1); }

// 1. Video stream probe — duration, frame count, dimensions
const probe = execFileSync('ffprobe', [
  '-v', 'error',
  '-select_streams', 'v:0',
  '-show_entries', 'stream=duration,nb_frames,width,height',
  '-show_streams',
  '-of', 'json',
  file,
]);

// Assert: nb_frames === 540, duration ≈ 18.000s, width === 1920, height === 1080
// Print PASS / FAIL with specific failure mode for each assertion

// 2. Audio absence check — fails if ANY audio stream present (Phase 5 contract: ffmpeg -an stripped)
const audioProbe = execFileSync('ffprobe', [
  '-v', 'error',
  '-select_streams', 'a',
  '-show_entries', 'stream=codec_type',
  '-of', 'json',
  file,
]);
// audioProbe.streams should be empty array (no audio tracks)

// 3. FIRST-FRAME LUMINANCE GATE per document-review amendment TIER 1 #5 (adversarial conf 0.88).
// The fade-through-black grammar at the S04→S05 hard cut only works if BOTH sides open at black.
// S04TailFadeToBlack lands at full-opacity black at scene-internal frame 990. S05 frame 0 must
// be ≤30% mean luminance (effectively black/dark) OR the S05HeadFadeFromBlack overlay must
// cover the brightness via its 15-frame opacity 1→0 ramp (which is now MANDATORY per amendment).
//
// Use ffmpeg's signalstats filter to compute mean luma (YAVG, 0-255 range).
const tmp = mkdtempSync(join(tmpdir(), 'gameplay-clip-luma-'));
try {
  const lumaOut = execFileSync('ffprobe', [
    '-v', 'error',
    '-f', 'lavfi',
    '-i', `movie=${file},select=eq(n\\,0),signalstats`,
    '-show_entries', 'frame_tags=lavfi.signalstats.YAVG',
    '-of', 'json',
  ]);
  const yavg = Number(JSON.parse(lumaOut.toString()).frames[0].tags['lavfi.signalstats.YAVG']);
  // YAVG range 0-255; 30% of 255 = 76.5. Frame 0 mean luma > 76.5 means the head fade is
  // load-bearing — the grep gate (verify:s05-head-fade) ensures the overlay is present;
  // we log here for visibility into how much fade is doing the work.
  const LUMA_THRESHOLD = 76.5;
  if (yavg > LUMA_THRESHOLD) {
    console.warn(`[verify-gameplay-clip] frame-0 mean luminance YAVG=${yavg.toFixed(1)} > ${LUMA_THRESHOLD} (30%).`);
    console.warn('  S05HeadFadeFromBlack overlay is LOAD-BEARING for the chapter-break fade — do NOT remove it.');
    // Soft warning, not hard FAIL — the mandatory overlay handles it. Hard FAIL lives in
    // verify:s05-head-fade (grep gate) which confirms the overlay is actually in the scene file.
  } else {
    console.log(`[verify-gameplay-clip] frame-0 YAVG=${yavg.toFixed(1)} ≤ ${LUMA_THRESHOLD} — natural fade-friendly.`);
  }
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
```

NPM script: `"verify:gameplay-clip": "tsx scripts/verify-gameplay-clip.ts"` in trailer's package.json.

Companion grep check `scripts/verify-s05-head-fade.ts` (Phase 4 deliverable per amendment TIER 1 #5): greps `videos/trailer/src/scenes/S05_GameplayDissolve.tsx` for `<S05HeadFadeFromBlack` import + JSX use; exits 0 if present, exits 1 if missing. Wired as `pnpm verify:s05-head-fade` and added to Unit 4.10 anti-regression checks (Documentation/Operational Notes CI gates). Makes the "S05HeadFadeFromBlack is mandatory" rule executable instead of honor-system.

**Step 4 — Per-scene Archer test.**

```md
# S05 Gameplay Dissolve — Archer Test

## Sample frames (standalone — placeholder render; Dash + scream from composition NOT present)
- [ ] Frame 0: HARD CUT entry from S04 (S04TailFadeToBlack closed; S05 opens to gameplay frame 1 — quick reveal feel)
- [ ] Frame 90 (3s in): full gameplay reveal; S04 fully gone (black-to-frame-1 reads as Archer chapter break, NOT cross-dissolve)
- [ ] Frame 240 (8s in): scene mid-state (silent in standalone; Dash plays in master)
- [ ] Frame 360 (12s in): scene mid-state (silent in standalone; scream plays in master IF R5 kept)
- [ ] Frame 495 (16.5s in): scene tail; CommsTicker still active (per Phase 1 — R15 #2 ticker carries from S04 through cascade tail)
- [ ] Frame 540 (scene end): hard cut to S06 (S06 owns iris-wipe-IN on its own head frames; NOT scene-internal here)

## Master-render-only checks (per amendment SA-10)
- [ ] Composition-level sparse Dash VO at absolute frame 2280 (= scene-relative 240) lands cleanly over gameplay audio bed
- [ ] If R5 kept: scream cue at absolute 2400 (= scene-relative 360) audibly lands on a BURNED card-draw moment in the gameplay clip
- [ ] If R5 cut: scream WAV is not in AUDIO_ASSETS; no scream renders (verify clean composition without dead-Sequence)
- [ ] Music bed envelope at 0.25 throughout S05 (sparse gameplay underbed)

## §2 Quality Bar (per CLAUDE.md + insight 050 Briggsy-eye)
- [ ] Could this be from an Archer episode? (fluency read on the gameplay-clip-as-set-dressing read)
- [ ] Real-gameplay clip reads as "BURNED is shipped + playable" (Phase 5 verdict)
- [ ] Hard cut entry from S04 reads as DELIBERATE punctuation, NOT glitch (S04TailFadeToBlack does the heavy lifting)
- [ ] R15 #2 ticker continues through cascade tail without visual collision against gameplay UI

## R13 acceptance (Phase 5 dependency — deferred verdict until Phase 5 ships)
- [ ] Real gameplay clip plays cleanly; phone-controller + TV-shared-screen capture reads as authentic multiplayer (NOT staged)
- [ ] `pnpm verify:gameplay-clip` gate passes (540 frames, 1920×1080, no audio track)

## Briggsy-eye sentinel
- [ ] `briggsy-review-4.6.signoff` written (Briggsy may defer FULL verdict to Phase 5; sentinel writes after placeholder render verified)

## Verdict: PASS (placeholder) / FAIL / iterate
```

**Verification:**

- `S05_GameplayDissolve.tsx` typechecks pure visual (no `Audio` import; OffthreadVideo + Sequence + CommsTicker only).
- Placeholder `public/trailer/gameplay-placeholder.mp4` generated; standalone render of `Preview_S05_GameplayDissolve` produces clean MP4.
- `scripts/verify-gameplay-clip.ts` typechecks; runs against placeholder file as smoke test.
- `.gitignore` entries for `public/trailer/gameplay.mp4` and `public/trailer/gameplay-placeholder.mp4`; verify with `git check-ignore` after generation.
- `s05-archer-test.md` placeholder-render checkboxes green (full verdict deferred to Phase 5).
- `briggsy-review-4.6.signoff` written for placeholder render; Phase 6 re-evaluates after Phase 5 ships real clip.

---

### Unit 4.7 — S06 Closing Directive Scene

- [x] **Unit 4.7: S06 Closing Directive Scene** — landed 2026-05-23 R1.1. Scene replaces Unit 4.1 scaffold; new `transitions/IrisWipe.tsx` SSoT (SA-5) + `LOGO_SPRING_CLOSING` (settled NOT snappy per SA-9, mass 0.9 / damp 18 / stiff 110) + R15 #5 hand-authored split-layer SVGs (Phase 3 deepening miss filled in by Phase 4 — Unit 3.4 stopped at 4 R15 instances; #5 lock came AFTER 3.4 ship). Verification doc at `videos/trailer/sample-eval/composite-build/s06-archer-test.md`; agent-eye PASS, briggsy-eye sentinel pending. R1→R1.1 patch absorbed: dossier fades to 0 (not 0.15) over 60-110 to prevent closed-folder PENDLETON-text bleeding into R15 stamp landing zone; R15 #5 text SVG adds stroke + ink-halo filter for ochre-9-on-mahogany contrast. R15 #4 absolute land frame = 3150 (= scene-rel 240, on Phrasing! second syllable per audio-manifest); R15 #5 = 3165 (post-Phrasing). Visual-manifest R15_CHROME count 8→10 (test updated).

**Goal:** Implement `S06_ClosingDirective.tsx` — 9-second closing. Iris-wipe-in on S06 head frames 0-45 (scene-internal overlay from `transitions/IrisWipe.tsx` per amendment SA-5 — SINGLE-SOURCE; no duplicate inline copy). Briefing-room reestablish + dossier closes + BURNED logo lands (LOGO_SPRING_CLOSING — settled, NOT snappy per amendment SA-9) + **R15 #4 SPLIT-LAYER at frame 240 scene-relative (= absolute 2820) with filename `subhead-4-field-ready-{frame,text}.svg`** per amendment MA-6 (corrects pre-deepening filename `subhead-4-agent-built.svg` and frame 2800 drift). Closing Dash VO + "Phrasing" cue + final brass sting play via composition-level audio per ADR #16.

**Requirements:** R1, R15 (#4).

**Dependencies:** Unit 4.1, Unit 4.3 (BriefingRoomBackground + DossierFolder), Unit 4.8 (IrisWipe.tsx single source), Phase 3 (closing logo `trailer/title-sequence/burned-logo-closing.svg`, R15 #4 split-layer SVGs `trailer/r15-chrome/subhead-4-field-ready-{frame,text}.svg`).

**Files:**

- Create: `videos/trailer/src/scenes/S06_ClosingDirective.tsx` (pure visual; no inline IrisWipe — imports from `transitions/IrisWipe.tsx`).
- Create: `videos/trailer/sample-eval/composite-build/s06-archer-test.md`.
- Create: `videos/trailer/sample-eval/composite-build/briggsy-review-4.7.signoff`.

**Approach:**

**Step 1 — Scene** (directional sketch; pure visual; iris-wipe imported from transitions/, NOT inlined).

```tsx
// videos/trailer/src/scenes/S06_ClosingDirective.tsx — DIRECTIONAL (pure visual)
import React from 'react';
import { AbsoluteFill, Img, interpolate, useCurrentFrame, staticFile, spring, useVideoConfig } from 'remotion';
import { BriefingRoomBackground } from '../components/BriefingRoomBackground';
import { DossierFolder } from '../components/DossierFolder';
import { R15Stamp } from '../components/R15Stamp';
import { IrisWipe } from '../transitions/IrisWipe';  // single source per amendment SA-5
import { LOGO_SPRING_CLOSING, EASE_OUT } from '../lib/animations';

// S06 absolute frames 2580-2850; scene-relative 0-270.
// Iris-wipe-IN on head frames 0-45 (scene-internal overlay).
// Dossier closes frames 30-60.
// BURNED logo lands at relative frame 210 (= absolute 2790) with LOGO_SPRING_CLOSING (settled, NOT snappy per amendment SA-9).
// R15 #4 SPLIT-LAYER subhead lands at relative frame 240 (= absolute 2820 per amendment MA-6, NOT 220/2800 as prior draft had).
// Closing Dash VO at absolute 2610 + Phrasing cue at absolute 2790 play via composition-level audio per ADR #16.

export const S06_ClosingDirective: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // BURNED logo land at relative frame 210 — LOGO_SPRING_CLOSING (settled, cinematic; distinct from S01 LOGO_SPRING_COLD per amendment SA-9)
  const logoSpring = spring({ frame: frame - 210, fps, config: LOGO_SPRING_CLOSING });
  // scale shape per Phase 1 lock: 0.95 → 1.04 → 1.0 (NOT 0.6 → 1 as prior draft had)
  const logoScale = interpolate(logoSpring, [0, 0.6, 1], [0.95, 1.04, 1.0]);
  const logoOpacity = interpolate(frame, [205, 210], [0, 1], { easing: EASE_OUT, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill>
      {/* Iris-wipe-IN — extracted to transitions/IrisWipe.tsx per amendment SA-5 (single source; NO duplicate inline code) */}
      <IrisWipe fromFrame={0} toFrame={45} direction="opening" />

      <BriefingRoomBackground />
      {/* Dossier opens before scene start (openStart=-30), closes at relative frame 30 */}
      <DossierFolder openStart={-30} closeStart={30} />

      {/* BURNED logo lands at relative frame 210 with LOGO_SPRING_CLOSING + scale 0.95 → 1.04 → 1.0 per Phase 1 lock */}
      <AbsoluteFill style={{
        justifyContent: 'center', alignItems: 'center',
        opacity: logoOpacity,
        transform: `scale(${logoScale})`,
      }}>
        <Img src={staticFile('trailer/title-sequence/burned-logo-closing.svg')} style={{ width: 1200 }} />
      </AbsoluteFill>

      {/* R15 #4 SPLIT-LAYER subhead — per amendment MA-5 + MA-6 */}
      {/* Filename: subhead-4-field-ready-{frame,text}.svg (NOT subhead-4-agent-built.svg) */}
      {/* Frame: 240 scene-relative = 2820 absolute (NOT 220/2800) */}
      {/* Copy: "OPERATION STATUS: FIELD-READY" (NOT "AGENT-BUILT, ARCHER-GRADE") */}
      <R15Stamp
        frameSvg="trailer/r15-chrome/subhead-4-field-ready-frame.svg"
        textSvg="trailer/r15-chrome/subhead-4-field-ready-text.svg"
        anchor="center"
        offsetPx={{ x: 0, y: 220 }}  /* offset below center to clear logo above */
        width={1000}                 /* per amendment TIER 1 #4 — Phase 3 stamp #4 natural SVG width */
        height={220}                 /* per amendment TIER 1 #4 — Phase 3 stamp #4 natural SVG height */
        tiltDeg={0}                  /* no tilt for closing subhead — reads as documented status, not slapped */
        landFrame={240}
        variant="standard"
      />
    </AbsoluteFill>
  );
};
```

Composition-level audio (Dash 2610 + Phrasing 2790) plays via the AUDIO_ASSETS map in TrailerComposition.tsx. Standalone `Preview_S06_ClosingDirective` renders silent; master render adds audio.

**Step 2 — Per-scene Archer test.**

```md
# S06 Closing Directive — Archer Test

## Sample frames (standalone — Dash + Phrasing from composition NOT present in scene-only render)
- [ ] Frame 0: iris-wipe-IN reveal-fully-black starting state (radius=0, BURNED-board fully covered by iris mask)
- [ ] Frame 22: iris-wipe half-open (briefing-room half-revealed)
- [ ] Frame 45: iris fully open; dossier mid-close
- [ ] Frame 60: folder fully closed
- [ ] Frame 210: BURNED logo lands with LOGO_SPRING_CLOSING + scale 0.95 → 1.04 → 1.0 (settled feel, NOT snappy)
- [ ] Frame 240 (= absolute 2820 per MA-6): R15 #4 split-layer subhead lands under logo with text "OPERATION STATUS: FIELD-READY"
- [ ] Frame 270 (scene end): hard cut to black (composition end)

## Master-render-only checks (per amendment SA-10)
- [ ] Composition-level Closing Dash VO at absolute frame 2610 (= scene-relative 30) lands cleanly over closing music bed
- [ ] Phrasing cue at absolute frame 2790 (= scene-relative 210) lands AT the logo-land frame — synchronized punctuation
- [ ] Final brass sting on music bed timed to scene end (frame 2849 = volume 1.00 per MusicBed envelope)

## §2 Quality Bar (per CLAUDE.md + insight 050 Briggsy-eye)
- [ ] Could this be from an Archer episode? (fluency read)
- [ ] Iris-wipe transition reads as classic title-sequence closer (NOT generic Apple Keynote)
- [ ] BURNED logo land feels SETTLED (LOGO_SPRING_CLOSING distinct from S01 LOGO_SPRING_COLD); cinematic NOT snappy
- [ ] R15 #4 subhead readable + ochre-inked + split-layer alignment crisp (frame.svg + text.svg in register)
- [ ] R15 #4 lands AS DOCUMENTED STATUS not as slapped chrome (tilt=0, no archer-slap rotation)
- [ ] Final "Phrasing" lands like a real Archer episode close (master-render verification only)

## Briggsy-eye sentinel
- [ ] `briggsy-review-4.7.signoff` written

## Verdict: PASS / FAIL / iterate
```

**Verification:**

- `S06_ClosingDirective.tsx` typechecks pure visual (no `Audio` import); imports `IrisWipe` from transitions/ (single source per SA-5).
- R15 #4 staticFile paths point to `trailer/r15-chrome/subhead-4-field-ready-frame.svg` and `-text.svg` (NOT `subhead-4-agent-built.svg`).
- R15 #4 land frame is 240 scene-relative (= absolute 2820), NOT 220/2800.
- LOGO_SPRING_CLOSING used (NOT generic logo spring nor LOGO_SPRING_COLD).
- `s06-archer-test.md` all green.
- Standalone render at `out/s06-closing.mp4` produces clean silent MP4.
- `briggsy-review-4.7.signoff` written.

---

### Unit 4.8 — Transition Implementation

- [x] **Unit 4.8: Transition Implementation** — landed 2026-05-24. Most components shipped en-route to scene units (DossierPageWipe via S03 work; IrisWipe via Unit 4.7; S04TailFadeToBlack via Unit 4.5; S05HeadFadeFromBlack via Unit 4.6; SceneFadeToBlack carried over from Phase 0 spike). Unit 4.8 ships the remaining inventory + grep gate: `sample-eval/composite-build/transitions.md` (6-boundary inventory + ADR lineage + anti-regression-gate table + optional `SceneFadeToBlack` polish note); `scripts/verify-no-transition-series.ts` greps every .ts/.tsx under `videos/trailer/src/` for `<TransitionSeries>` JSX or `from '@remotion/transitions'` imports (comments tolerated; PASSED 65 src files clean). `pnpm verify:no-transition-series` npm script wired. Pre-emptive `SceneFadeToBlack` polish deferred to Unit 4.9 Briggsy-eye drive.

**Goal:** Build the named scene-internal transition overlays (per ADR #11 revised — NO `<TransitionSeries>` at composition level). Per amendment SA-5: `IrisWipe` lives ONLY in `transitions/` (S06 imports, NOT inline duplicate); `S04TailFadeToBlack` lives in `components/` (created in Unit 4.5); `FadeTransition` vendored from UMB v3 as optional scene-end fade for hard-cut polish. Boundary inventory:

- S01 → S02: Stamp slap (S01-internal R15 #1 stamp; no separate transition component)
- S02 → S03: Hard cut (Series boundary; no component)
- S03 → S04: Dossier-page wipe (S03-internal `DossierPageWipe` overlay on tail frames)
- S04 → S05: Hard cut + `S04TailFadeToBlack` overlay on S04 tail (per amendment MA-1 — `S04TailFadeToBlack.tsx` already created in Unit 4.5)
- S05 → S06: Iris-wipe (S06-internal `IrisWipe direction="opening"` on head frames; transitions/IrisWipe.tsx single source per SA-5)
- S06 → end: Hard cut to black (Composition end)

Optional polish: `FadeTransition` vendored from UMB v3 (~30 lines, scene-end fade-to-black using `useVideoConfig().durationInFrames`) — applied to S02/S03/S06 hard-cut boundaries if Unit 4.9 perceptual review finds them too jarring.

**Requirements:** R14 (cold-open hand-off via S01 stamp slap).

**Dependencies:** Unit 4.0a (UMB v3 triage — FadeTransition decision), Unit 1.4 transition vocabulary; Units 4.2–4.7 (consume transitions).

**Files:**

- Create: `videos/trailer/src/transitions/DossierPageWipe.tsx` (consumed by S03).
- Create: `videos/trailer/src/transitions/IrisWipe.tsx` (consumed by S06; SINGLE SOURCE per amendment SA-5 — S06 does NOT inline a duplicate).
- (Optional per Unit 4.0a triage) Create: `videos/trailer/src/components/FadeTransition.tsx` (vendored from UMB v3 `projects/undercover-mob-boss/videos/trailer/src/components/FadeTransition.tsx`).
- Edit: `videos/trailer/src/lib/animations.ts` — already covered in Unit 4.1 (single curve registry per amendment MA-8).
- Create: `videos/trailer/sample-eval/composite-build/transitions.md` — inventory + use trace.

**Approach:**

**Step 1 — Stamp Slap (overlay variant)** — N/A. S01→S02 boundary uses the R15 #1 stamp slap to bridge. The R15Stamp component (Unit 4.2) already implements this; no separate transition component needed.

**Step 2 — Dossier-Page Wipe (S03→S04)** (directional sketch).

```tsx
// videos/trailer/src/transitions/DossierPageWipe.tsx — DIRECTIONAL
import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { EASE_IN_OUT } from '../lib/animations';

/**
 * 8-frame horizontal wipe from right edge inward.
 * Visually reads as turning a dossier page to reveal what's beneath.
 *
 * Placed at scene boundary as scene-internal overlay on S03 tail frames.
 */
export const DossierPageWipe: React.FC<{
  durationFrames?: number;
  direction?: 'left-to-right' | 'right-to-left';
}> = ({ durationFrames = 8, direction = 'right-to-left' }) => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [0, durationFrames], [0, 100], {
    easing: EASE_IN_OUT,
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const clip = direction === 'right-to-left'
    ? `inset(0 ${progress}% 0 0)`
    : `inset(0 0 0 ${progress}%)`;
  return (
    <AbsoluteFill style={{
      backgroundColor: 'var(--color-ochre-9)',  // from tokens.css per Fork 3 (NOT bare #947226)
      clipPath: clip,
    }} />
  );
};
```

**Step 3 — Iris-Wipe (S05→S06)** SINGLE SOURCE per amendment SA-5 (S06 imports this file; NO inline duplicate).

```tsx
// videos/trailer/src/transitions/IrisWipe.tsx — DIRECTIONAL
import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { EASE_IN_OUT } from '../lib/animations';

export const IrisWipe: React.FC<{
  /** Frame range (scene-relative) over which iris collapses/opens. */
  fromFrame: number;
  toFrame: number;
  /** Direction: 'closing' (full → point) or 'opening' (point → full). */
  direction: 'closing' | 'opening';
}> = ({ fromFrame, toFrame, direction }) => {
  const frame = useCurrentFrame();
  const maxRadius = Math.hypot(960, 540); // diagonal of half-screen
  const radius = direction === 'closing'
    ? interpolate(frame, [fromFrame, toFrame], [maxRadius, 0], {
        easing: EASE_IN_OUT,
        extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
      })
    : interpolate(frame, [fromFrame, toFrame], [0, maxRadius], {
        easing: EASE_IN_OUT,
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

Edge case verification: at `fromFrame` for `opening` direction, radius=0 → mask=fully black → rect=fully visible → scene HIDDEN (correct: scene reveal hasn't started). At `toFrame` for `opening`, radius=maxRadius → mask=fully white inside diagonal-radius circle → rect=transparent there → scene VISIBLE. Symmetric reverse for `closing`. No zero-radius edge-case bug.

**Step 4 — `S04TailFadeToBlack` (S04→S05 hard cut overlay)** — already created in Unit 4.5 Step 4b per amendment MA-1. NOT a separate transition file; it's an S04 scene-internal component that fires on the scene's tail frames (975-990 scene-relative). Boundary inventory below references it for completeness.

**Step 5 — ~~`FadeTransition` vendored from UMB v3 (optional)~~ SUPERSEDED-BY-EXISTING `SceneFadeToBlack.tsx`** (Unit 4.0a triage 2026-05-22).

`videos/trailer/src/components/SceneFadeToBlack.tsx` (Phase 0 Unit 0.5 spike artifact, 35 lines) already implements scene-internal fade-to-black with a CLEANER API than UMB's FadeTransition: explicit `startFrame` + `durationFrames` (caller-anchored), no `useVideoConfig().durationInFrames` dep. UMB-vendor template was a deepening miss — same family as insight 066. See `videos/trailer/sample-eval/composite-build/umb-v3-component-triage.md`.

**Usage** for optional S02/S03/S06 hard-cut tail polish:

```tsx
import { SceneFadeToBlack } from '../components/SceneFadeToBlack'

// inside a scene component (last 10 frames of the scene fade to black)
<SceneFadeToBlack startFrame={SCENE_FRAMES - 10} durationFrames={10} />
```

DON'T apply preemptively; let Unit 4.9 perceptual review drive. If review surfaces a jarring hard cut, drop SceneFadeToBlack into the affected scene's tail and re-render.

**Step 6 — Cross-dissolve via TransitionSeries — REMOVED.** Per ADR #11 revised + Phase 1 deepening hard-cut lock + amendment MA-1: the S04→S05 boundary is a hard cut (handled by `S04TailFadeToBlack` overlay on S04 tail). NO `<TransitionSeries>` at composition level. `@remotion/transitions` package has zero Phase 4 consumers — install deferred per ADR #4 revised.

**Step 7 — Hard cuts.** No component — `<Series.Sequence>` adjacent siblings produce hard cuts naturally.

**Step 8 — Inventory + use trace.**

`transitions.md`:

```md
# Transition Implementation Inventory

| Boundary | Mechanism | File | Frame range (abs) |
|----------|-----------|------|-------------------|
| S01 → S02 | Stamp slap (R15 #1 bridges) | R15Stamp component (S01 internal) | 200–210 |
| S02 → S03 | Hard cut (optional `SceneFadeToBlack` tail polish per Unit 4.9 review) | None / `SceneFadeToBlack.tsx` (existing — Phase 0 spike artifact) | 570 |
| S03 → S04 | Dossier-page wipe | transitions/DossierPageWipe.tsx (S03 tail) | 1042–1050 |
| S04 → S05 | Hard cut + S04TailFadeToBlack overlay | components/S04TailFadeToBlack.tsx (S04 tail 2025-2040) | 2040 |
| S05 → S06 | Iris-wipe-IN | transitions/IrisWipe.tsx (S06 head 0-45) — SINGLE SOURCE per amendment SA-5 | 2580–2625 |
| S06 → end | Hard cut to black | None (Composition end at frame 2850) | 2850 |
```

NOTE: NO `<TransitionSeries>` row. ADR #11 revised: bare `<Series>` + scene-internal overlays.

**Patterns to follow:**

- UMB v3 `FadeTransition.tsx` (vendored per SA-5 if Unit 4.0a triage approves).
- Phase 1 Unit 1.4 scoped transition library.
- ADR #11 revised — bare `<Series>` + scene-internal overlays only.

**Test scenarios:**

- **Happy path:** All transitions render in standalone test compositions without artifacts; boundary inventory in transitions.md matches scene file imports.
- **Edge case:** Iris-wipe `radius=0` at fromFrame produces fully-black mask (scene hidden) for `opening` direction; verify via single-frame render at scene-relative 0.
- **Edge case:** DossierPageWipe direction matches BEAT-SHEET.md (R-to-L reveals next, not previous).
- **Edge case:** S04TailFadeToBlack overlay opacity actually reaches 1.0 at frame 990 (scene-relative); EASE_IN_OUT curve doesn't undershoot.
- **Anti-regression:** `pnpm verify:no-transition-series` grep check that `TransitionSeries` import does NOT appear anywhere in `videos/trailer/src/` — guards against ADR #11 regression.

**Verification:**

- 2 transition component files (`DossierPageWipe.tsx`, `IrisWipe.tsx`) exist + typecheck.
- `S04TailFadeToBlack.tsx` in `components/` (created in Unit 4.5) renders correctly at scene tail.
- `FadeTransition.tsx` vendored from UMB v3 (Unit 4.0a triage decision — if applied) typechecks; usage optional.
- `transitions.md` documents all 6 boundary handlings; NO `<TransitionSeries>` row.
- Each transition standalone-renders cleanly.
- `pnpm verify:no-transition-series` passes (zero matches in src/).

---

### Unit 4.9 — Per-Scene §2 Archer Test Pass

- [~] **Unit 4.9: Per-Scene §2 Archer Test Pass (R1 partial — 2026-05-24)** — R1 ships the gate infrastructure + summary placeholder; motion-shape specs deferred to R2 (Playwright + Remotion studio lifecycle wiring is heavyweight, better isolated). Shipped R1:
  - `src/components/SafeSquareOverlay.tsx` — env-gated debug overlay (`REMOTION_SAFE_SQUARE=1`), zero render cost when off; dashed 1080² center guide + crosshairs + corner-coordinate labels.
  - `scripts/verify-briggsy-sentinels.ts` — git-author gate per amendment TIER 2 #7. Currently FAILS with `MISSING: briggsy-review-4.{6,7}.signoff` (4.2-4.5 sentinels present + authored briggsy007@gmail.com from earlier ship; 4.6 + 4.7 pending Briggsy eye-check). Phase 5 + Phase 6 sentinel paths inlined as commented-out — uncomment when those phases begin.
  - `sample-eval/composite-build/scene-pass-summary.md` — 6-row roll-up table + Unit 4.10 entry checklist + R2 deferred-spec note + 3 R2 open questions for S06.
  - `pnpm verify:briggsy-sentinels` npm script wired.

  Deferred to Unit 4.9 R2:
  - `tests/scene-timing-shape.spec.ts` (studio-stage Playwright spec — per amendment NN-2)
  - `tests/scene-timing-shape-mp4.spec.ts` (encoded-MP4 vitest+ffmpeg+pixelmatch spec — per amendment TIER 2 #10)
  Both require either Remotion studio dev-server lifecycle wiring or snapshot-baseline bootstrap; each is its own ~half-day unit.

  Unit 4.10 entry remains gated on: Briggsy commits the missing 4.6 + 4.7 sentinels (or explicitly defers); motion-shape specs land in R2.

**Goal:** Each of the 6 scenes (S01–S06) independently passes the §2 Quality Bar test card. Briggsy reviews the actual rendered MP4 (per insight 050 — agent eyeball pass insufficient). Each scene writes a `briggsy-review-4.N.signoff` sentinel file on PASS. Unit 4.10 entry gated on all 6 sentinels present. Failed scenes iterate per structured 3-branch escalation procedure (per amendment SA-3 — replaces the original "max 3 iterations then reopen" which had no defined escalation path). Plus per amendment NN-2/NN-3: quantitative `tests/scene-timing-shape.spec.ts` for cascade + closing with fault-injection canary.

**Requirements:** §2 Quality Bar from `docs/PRODUCT-SPECIFICATION.md`, R8 (mobile safe-square audit).

**Dependencies:** Units 4.2–4.7 (all scene components built), Unit 4.0a (UMB v3 triage — Briggsy reviewed against precedent).

**Files:**

- Edit: 6 per-scene archer-test.md files in `sample-eval/composite-build/` (already created in Units 4.2-4.7).
- Create: 6 `briggsy-review-4.N.signoff` sentinel files (Briggsy writes per scene).
- Create: `videos/trailer/sample-eval/composite-build/scene-pass-summary.md`.
- Create: `videos/trailer/tests/scene-timing-shape.spec.ts` (Playwright spec; cascade + closing per-frame opacity/transform sampling + fault-injection canary).
- Create: `videos/trailer/src/components/SafeSquareOverlay.tsx` (debug overlay drawing 1080×1080 center guide during studio-preview iteration).

**Approach:**

**Step 1 — Per-scene compositions already registered in Root.tsx** (Unit 4.1 Step 1). Six `Preview_S0N_…` compositions plus `Preview_S04Peak` fast-iteration window.

**Step 2 — Per-scene render** (positional CLI per amendment SA-4 + framework-docs Finding 7).

```
pnpm render -- src/Root.tsx Preview_S01_ColdOpen          out/s01-coldopen.mp4
pnpm render -- src/Root.tsx Preview_S02_BriefingSetup     out/s02-briefing.mp4
pnpm render -- src/Root.tsx Preview_S03_MissionBackground out/s03-mission.mp4
pnpm render -- src/Root.tsx Preview_S04_ReceiptsCascade   out/s04-cascade.mp4
pnpm render -- src/Root.tsx Preview_S04Peak               out/s04-peak.mp4   # fast iter
pnpm render -- src/Root.tsx Preview_S05_GameplayDissolve  out/s05-dissolve.mp4
pnpm render -- src/Root.tsx Preview_S06_ClosingDirective  out/s06-closing.mp4
```

**Step 3 — Briggsy reviews per-scene against test card** — eye-on-actual-MP4 (per insight 050; agent eyeball pass insufficient). Per archer-test.md in Units 4.2–4.7. Briggsy marks PASS / FAIL / iterate per scene + writes `briggsy-review-4.N.signoff` sentinel on PASS.

`SafeSquareOverlay.tsx` debug component (NEW — toggle via env var during studio-preview iteration to overlay 1080×1080 center safe-square guide on top of any scene). Mobile R8 audit confirms critical text inside center.

**Step 3a — Sentinel git-author enforcement** (per document-review amendment TIER 2 #7; adversarial conf 0.86 + product-lens convergent conf 0.78).

The pre-deepening sentinel mechanism was honor-system: `briggsy-review-4.N.signoff` existence in `sample-eval/composite-build/` gates Unit 4.10 entry, but Claude can `touch` those files in 2 seconds. The whole point of insight 050 + amendment NN-1 was to put a human eye in the loop on perceptual continuities — a check Claude can satisfy by writing an empty file defeats that. Replace existsSync with a git-author check: the sentinel file's last commit must be authored by Briggsy.

`scripts/verify-briggsy-sentinels.ts`:

```ts
// scripts/verify-briggsy-sentinels.ts — DIRECTIONAL
// SAFE: execFileSync argv arrays per project-wide convention.
// Asserts each sentinel's last commit is authored by briggsy007@gmail.com. Exits 1
// with named failures if any sentinel is missing or authored by anyone else
// (including Claude / claude@anthropic.com / undefined).
//
// Scope extended per cross-phase amendments:
//   - Phase 4 scenes: 4.2-4.7 (composite-build/)
//   - Phase 5 sentinels: 5.4 + 5.6 (gameplay-capture/) — added Phase 5 deepening
//   - Phase 6 sentinels: 6.0a, 6.4, 6.7 (final-render-qa/) — added Phase 6
//     doc-review cross-phase amendment #5
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

const REQUIRED_AUTHOR = 'briggsy007@gmail.com';

// All sentinel paths the project requires, with their source phase.
const SENTINELS: { path: string; phase: string }[] = [
  // Phase 4 scenes 4.2-4.7
  ...[2, 3, 4, 5, 6, 7].map((n) => ({
    path: `videos/trailer/sample-eval/composite-build/briggsy-review-4.${n}.signoff`,
    phase: 'Phase 4',
  })),
  // Phase 5 sentinels
  { path: 'videos/trailer/sample-eval/gameplay-capture/briggsy-review-5.4.signoff', phase: 'Phase 5' },
  { path: 'videos/trailer/sample-eval/gameplay-capture/briggsy-review-5.6.signoff', phase: 'Phase 5' },
  // Phase 6 sentinels
  { path: 'videos/trailer/sample-eval/final-render-qa/briggsy-review-6.0a.signoff', phase: 'Phase 6' },
  { path: 'videos/trailer/sample-eval/final-render-qa/briggsy-review-6.4.signoff', phase: 'Phase 6' },
  { path: 'videos/trailer/sample-eval/final-render-qa/briggsy-review-6.7.signoff', phase: 'Phase 6' },
];

let failures: string[] = [];

for (const { path, phase } of SENTINELS) {
  if (!existsSync(path)) {
    failures.push(`MISSING: ${path} (${phase})`);
    continue;
  }
  let authorEmail = '';
  try {
    authorEmail = execFileSync('git', ['log', '-1', '--format=%ae', '--', path], {
      encoding: 'utf8',
    }).trim();
  } catch (e) {
    failures.push(`UNTRACKED (no commit history): ${path}`);
    continue;
  }
  if (authorEmail === '') {
    failures.push(`UNTRACKED (empty git log): ${path}`);
  } else if (authorEmail !== REQUIRED_AUTHOR) {
    failures.push(`WRONG AUTHOR: ${path} authored by ${authorEmail} (expected ${REQUIRED_AUTHOR})`);
  }
}

// Phase 6 Unit 6.0 Step 8 — decode-test-roster.md must back the 6.0a sentinel with
// ≥6 confirmed-panel rows (Adversarial Attack 28: don't honor-system the recruitment
// claim).
const rosterPath = 'videos/trailer/sample-eval/final-render-qa/decode-test-roster.md';
const sixOhAPath = 'videos/trailer/sample-eval/final-render-qa/briggsy-review-6.0a.signoff';
if (existsSync(sixOhAPath)) {
  if (!existsSync(rosterPath)) {
    failures.push(`MISSING ROSTER: ${rosterPath} required to back ${sixOhAPath}`);
  } else {
    const rosterText = readFileSync(rosterPath, 'utf-8');
    // Count rows under the "Confirmed panel" table (T1..TN rows with all columns filled).
    // Simple heuristic: count `| T\d+ |` markers where the row has ≥4 non-empty cells.
    const matches = rosterText.match(/\|\s*T\d+\s*\|[^\n]+\|[^\n]+\|[^\n]+\|/g) ?? [];
    const filledRows = matches.filter((row) => {
      const cells = row.split('|').slice(1, -1).map((c) => c.trim());
      return cells.length >= 4 && cells.slice(0, 4).every((c) => c.length > 0 && c !== '<handle>');
    });
    if (filledRows.length < 6) {
      failures.push(`ROSTER UNDERCOUNT: ${rosterPath} has ${filledRows.length} confirmed rows; ≥6 required for 6.0a sentinel`);
    }
  }
}

if (failures.length) {
  console.error('[verify-briggsy-sentinels] FAILED:');
  for (const f of failures) console.error('  ' + f);
  process.exit(1);
}
console.log(`[verify-briggsy-sentinels] OK — all sentinels (Phase 4 / 5 / 6) authored by ${REQUIRED_AUTHOR}.`);
```

NPM script: `"verify:briggsy-sentinels": "tsx scripts/verify-briggsy-sentinels.ts"` in trailer's package.json. Unit 4.10 entry is gated on `pnpm verify:briggsy-sentinels` exit-0 (Phase 4 scope: 4.2-4.7). Phase 5 + Phase 6 also depend on the script — its SCENES list now covers Phase 5 (5.4 + 5.6) and Phase 6 (6.0a + 6.4 + 6.7) sentinels per Phase 6 doc-review cross-phase amendment #5. Wired into the CI gate list (Documentation/Operational Notes).

How Briggsy commits the sentinel: open a terminal, `cd projects/burned/videos/trailer/sample-eval/composite-build/`, run `git add briggsy-review-4.N.signoff && git commit -m "review: S0N pass"`. Claude can't impersonate (git config user.email is local — Briggsy's machine commits with briggsy007@gmail.com; CI/Claude runs would commit with different identities and the script catches them).

Honest about the limits: this gates AGAINST Claude writing the file. It does NOT prevent Briggsy from rubber-stamping without actually reviewing — that's the human's discipline problem, not a check we can mechanize. The check stops "Claude wrote the sentinel and claimed Briggsy reviewed."

**Step 4 — Iteration cycle for failed scenes** (3-branch escalation per amendment SA-3 + adversarial Finding 5).

**Pre-iteration calibration.** Briggsy + Claude pre-agree on the four §2 sub-dimensions (composition / palette / typography / cue alignment) and pre-rank them. Iter-N must NAME the failing dimension in writing BEFORE any edit.

**Vibe-quality "feels off" feedback** (per insight 044 — triage hypothesis-anchoring + learnings agent Finding 1; updated per document-review amendment TIER 2 #9): triggers `tests/scene-timing-shape.spec.ts` first to surface quantitative shape, NOT speculative scene edits. The motion-shape spec produces per-frame opacity/transform samples; deviation from expected envelope tells whether the issue is value-tunable (timing) or composition-structural — BUT note the spec's narrow coverage (see "Inference rules" below).

**Inference rules** (per document-review amendment TIER 2 #9; scope-guardian SG-03 + adversarial conf 0.83 + feasibility convergent). The spec only samples HtpDossierHero + R15 #3 stamp + S04TailFadeToBlack on S04 and BURNED logo + R15 #4 on S06. The 14-of-17 cascade halo cards, the 4 GoofyStatCaption envelopes, the BriefingRoomBackground venetian-blind shadow, the music silence-beat curve, and many other elements are UNSAMPLED.

- **FAIL** → real envelope deviates from expected: the issue IS value-tunable in a sampled element. Loop into 3-branch (a) value-tunable path.
- **PASS** → the sampled elements match expected envelope. This does NOT prove the issue is composition-structural. It only narrows the issue to either (i) an UNSAMPLED element (one of the 14 cascade cards / stat envelope / music silence-beat / shadow / etc.) OR (ii) composition-structural. **Walk unsampled elements FIRST** via per-element opacity inspection in studio preview before escalating to Phase 1 Unit 1.5 reopen.
  - Concrete walk: studio preview the affected scene at the failing frame; toggle individual element visibility (component-tree comments to comment in/out); ask "does removing element X eliminate the off-feel?" Inspect cards 4-17 individually, each stat envelope, music silence-beat at 1995-2000, BriefingRoomBackground shadow at S02/S03.
  - Only if no single unsampled element changes the feel → escalate to (b) composition-structural per Phase 1 Unit 1.5 reopen.

**Escalation procedure**:

- **Iter 1 fail → iter 2**: ONE edit batch addressing the single named dimension.
- **Iter 2 fail → iter 3**: If SAME dimension still failing, that's a structural signal — escalate immediately. If DIFFERENT dimension failing, iter 3 is justified.
- **Iter 3 fail → 3-branch escalation tree**:
  - **(a) Value-tunable failure** (radius, font size, spring config, frame timing, opacity threshold) → Phase 4 reopens the affected scene unit (Unit 4.2-4.7) with documented value-search bracket. Other scenes continue in parallel. Shared component changes (BriefingRoomBackground, CommsTicker, R15Stamp) FROZEN during reopen.
  - **(b) Composition-structural failure** (which elements occupy which screen regions, sequential-revelation ordering, focal hierarchy) → Phase 1 Unit 1.5 reopens for the affected scene. Phase 4 work pauses on that scene; other scenes continue.
  - **(c) Scene-existence failure** (the scene shouldn't exist as designed; whole-cloth rethink) → brainstorm reopens. Phase 4 pauses entirely.
  - Briggsy calls (a)/(b)/(c) — Claude proposes diagnosis but Briggsy makes the call.

**Step 5 — Quantitative motion-shape spec, STUDIO-STAGE VARIANT** (NEW per amendment NN-2 + NN-3 + learnings Finding 6; scope clarified per document-review amendment TIER 2 #10).

**Scope explicitly limited:** this spec samples the studio-rendered DOM (Playwright drives Remotion's studio preview pane, reads computed styles per frame). It verifies that the COMPONENT IMPLEMENTATION produces the right per-frame envelope shape — that `archerStampSlap()` actually returns scale 0.95→1.04→1.0, that `interpolate()` configs are correct, that no spring config has drifted. It does NOT verify the rendered MP4. Studio rendering ≠ MP4 encoding: H264 compression smoothing, GOP boundaries, and frame timing drift between studio's 60fps live preview and 30fps render output all surface only in the encoded MP4. Step 5b (below) handles the encoded-output side.

`tests/scene-timing-shape.spec.ts` (Playwright spec):

```ts
// videos/trailer/tests/scene-timing-shape.spec.ts — DIRECTIONAL (STUDIO-STAGE)
// Scope: verifies component-implementation envelope shape via DOM sampling on Remotion studio preview.
// Does NOT verify the encoded MP4 output — see scene-timing-shape-mp4.spec.ts (Step 5b) for that.
import { test, expect } from '@playwright/test';

test.describe('S04 cascade timing shape (studio-stage)', () => {
  test('real render shape matches expected envelope', async ({ page }) => {
    // Navigate to studio preview of Preview_S04Peak (http://localhost:3000/Preview_S04Peak)
    // Sample opacity/transform of HtpDossierHero + R15 #3 stamp at frames 600-990
    // Expected: HTP opacity drop to 0.5 at frame 870; R15 #3 scale 0.95 → 1.04 → 1.0 between 900-918; S04TailFadeToBlack 0→1 between 975-990
    // Assert shape within ±5% tolerance per frame
  });

  test('FAULT INJECTION: synthetic clipped shape fails the canary', async ({ page }) => {
    // Paint a synthetic clipped opacity arc directly into the page DOM
    // The same shape-derivation function the real test uses MUST fail on this synthetic shape
    // Ensures the gate is sensitive (per insight 049 — sensitivity is a property of the test)
  });

  test('FAULT INJECTION: synthetic correct shape passes', async ({ page }) => {
    // Paint the EXPECTED shape directly; verifies the gate's "PASS" path works
  });
});

test.describe('S06 closing timing shape (studio-stage)', () => {
  // Same 3-spec pattern: real + clipped-fault + correct-fault
});
```

Pattern: mirrors BURNED's existing `tests/e2e/drama-beat-timing.spec.ts` + 3 Framer cinematic gates. Vibe-quality "feels off" feedback runs this spec FIRST (per insight 044) before speculative edits — but with the narrowing rules above (Step 4 + Appendix B) because the spec's coverage is partial.

**Step 5b — Motion-shape spec, ENCODED-MP4 VARIANT** (NEW per document-review amendment TIER 2 #10; scope-guardian SG-03 + feasibility conf 0.80).

Why this is separate from Step 5: H264 encoding can smooth or quantize per-frame opacity changes invisibly to component-implementation testing. A scene that passes Step 5's studio-stage spec at studio frame rates may still ship with subtly-smeared timing in the encoded MP4 — particularly at GOP boundaries (every ~30-60 frames in standard H264) where the encoder can shift inter-frame deltas. Phase 4's deliverable IS the encoded MP4, so we need an MP4-side gate too.

`tests/scene-timing-shape-mp4.spec.ts` (vitest + ffmpeg frame extraction):

```ts
// videos/trailer/tests/scene-timing-shape-mp4.spec.ts — DIRECTIONAL (ENCODED-MP4)
// Runs AFTER `pnpm render -- src/Root.tsx Preview_S04Peak out/s04-peak.mp4`.
// Pipeline: ffmpeg-extract sampled frames at known timecodes; per-pixel image-diff against
// expected-envelope snapshots stored in tests/fixtures/scene-timing-shape/expected/*.png.
// Tolerance: per-pixel ±8 luma + per-frame ≥95% pixel-pass rate (accounts for H264 quantization noise).
import { describe, it, expect, beforeAll } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { PNG } from 'pngjs';  // or sharp / jimp — pick at execution
import pixelmatch from 'pixelmatch';

describe('S04 cascade encoded-MP4 shape', () => {
  beforeAll(() => {
    // Ensure out/s04-peak.mp4 exists; if not, prompt: 'run pnpm render Preview_S04Peak first'
    if (!existsSync('out/s04-peak.mp4')) {
      throw new Error('out/s04-peak.mp4 missing — run `pnpm render -- src/Root.tsx Preview_S04Peak out/s04-peak.mp4` first');
    }
  });

  // Sample frames: cascade-start (preview frame 0 = absolute 1650), stat-3-land (preview frame 150 = absolute 1800),
  // payoff (preview frame 300 = absolute 1950), payoff-hold (preview frame 320 = absolute 1970), fade-mid (preview frame 380 = absolute 2030)
  for (const { previewFrame, label } of [
    { previewFrame: 0, label: 'cascade-start' },
    { previewFrame: 150, label: 'stat-3-land' },
    { previewFrame: 300, label: 'payoff' },
    { previewFrame: 320, label: 'payoff-hold' },
    { previewFrame: 380, label: 'fade-mid' },
  ]) {
    it(`frame ${previewFrame} (${label}) matches expected envelope snapshot`, () => {
      // Extract frame N as PNG via ffmpeg
      execFileSync('ffmpeg', [
        '-y', '-v', 'error',
        '-i', 'out/s04-peak.mp4',
        '-vf', `select=eq(n\\,${previewFrame})`,
        '-vframes', '1',
        `tests/fixtures/scene-timing-shape/actual/s04-peak-${label}.png`,
      ]);

      // Pixel-diff against expected
      const actual = PNG.sync.read(readFileSync(`tests/fixtures/scene-timing-shape/actual/s04-peak-${label}.png`));
      const expected = PNG.sync.read(readFileSync(`tests/fixtures/scene-timing-shape/expected/s04-peak-${label}.png`));
      const { width, height } = expected;
      const diff = new PNG({ width, height });
      const mismatchedPixels = pixelmatch(expected.data, actual.data, diff.data, width, height, { threshold: 0.08 });
      const totalPixels = width * height;
      const passRate = 1 - (mismatchedPixels / totalPixels);
      expect(passRate).toBeGreaterThanOrEqual(0.95);
    });
  }
});
```

Snapshot lifecycle: first run captures `expected/*.png` from a Briggsy-approved render (one-time bootstrap; commit to repo). Subsequent runs compare future renders against the baseline. When an intentional scene edit changes the envelope, regenerate the snapshot (`pnpm test:scene-timing-shape-mp4:update`) and commit the new baseline with a clear commit message naming the changed scene + reason.

NPM script: `"test:scene-timing-shape-mp4": "vitest run tests/scene-timing-shape-mp4.spec.ts"` in trailer's package.json. Added to Unit 4.10 anti-regression checks alongside the studio-stage variant.

**Step 6 — Phase 4 → Phase 3 asset escalation** (per amendment NN-7).

If a Phase 3-shipped asset (briefing-room SVG, R15 chrome, HTP capture, card art) fails §2 in MP4 export, Phase 4 emits:

```
videos/trailer/sample-eval/composite-build/phase-3-asset-escalation-{asset-name}.md
```

…describing the failure mode + why Remotion-side patching (filter / color-shift / overlay) would NOT fix it. Phase 3 regenerates the asset. Phase 4 does NOT patch in Remotion.

**Step 7 — Summary.**

`scene-pass-summary.md`:

```md
# Per-Scene Archer Test Summary

| Scene | Iterations | Sentinel | Final verdict | Notes |
|-------|------------|----------|---------------|-------|
| S01 Cold Open | 1 | briggsy-review-4.2.signoff ✓ | PASS | Stamp slap shape 0.95→1.04→1.0 correct |
| S02 Briefing | 2 | briggsy-review-4.3.signoff ✓ | PASS | EASE_DRAWER folder tuned in iter 2 |
| S03 Mission | 1 | briggsy-review-4.4.signoff ✓ | PASS | Otto BASEMENT chrome landed |
| S04 Cascade | 3 | briggsy-review-4.5.signoff ✓ | PASS | Sequential revelation + emil curves locked iters 2-3; motion-shape spec passes |
| S05 Dissolve | 1 | briggsy-review-4.6.signoff ✓ | PASS (placeholder gameplay) | Real gameplay verdict deferred to Phase 6 |
| S06 Closing | 1 | briggsy-review-4.7.signoff ✓ | PASS | IrisWipe single-source, R15 #4 frame=2820 |

All 6 sentinel files present — Unit 4.10 entry unlocked.
```

**Patterns to follow:**

- `docs/PRODUCT-SPECIFICATION.md` §2.
- `feedback-verify-before-presenting.md` — eyes-on-feature before declaring done.
- `feedback-elite-team-standard.md` — verify → then lock.
- `feedback-eye-in-loop-beats-calibration-for-motion.md` — motion validation rule.
- `docs/insights/049-runtime-gate-sensitivity-via-in-spec-fault-injection.md` — fault-injection canary in-spec.
- `docs/insights/050-agent-verification-misses-perceptual-continuities.md` — Briggsy-eye on continuities.
- `docs/insights/044-triage-fix-paths-anchor-investigation-toward-presented-hypotheses.md` — vibe-quality feedback triggers instrumentation first.
- `docs/insights/052-instrumentation-bottleneck-is-promotion-not-production.md` — Unit 4.0a UMB v3 triage applies same principle.
- BURNED `tests/e2e/drama-beat-timing.spec.ts` — runtime-gate pattern template.

**Test scenarios:**

- **Happy path:** All 6 scenes pass on first or second iteration; all 6 sentinel files present; motion-shape spec + fault-injection canaries pass.
- **Edge case:** S04 cascade fails §2 on iter 1 due to layered-simultaneous composition; iter 2 enforces sequential revelation via per-element opacity envelopes; iter 2 passes.
- **Edge case:** S04 cascade fails §2 after 3 iterations on the SAME dimension (composition-structural) → Phase 1 Unit 1.5 reopen triggers; other 5 scenes continue parallel.
- **Edge case:** A Phase 3-shipped asset (e.g., briefing-room mahogany-horizontal.png) renders too saturated in MP4 export → Phase 4 → Phase 3 escalation emits `phase-3-asset-escalation-mahogany.md`; Phase 3 regenerates with Imagen prompt amendment.
- **Anti-pattern guard:** Briggsy reviews actual rendered MP4 (not studio preview alone — production-encoded MP4 is the perceptual surface per insight 050).
- **Sensitivity guard:** Fault-injection canary in `tests/scene-timing-shape.spec.ts` MUST fire on synthetic-clipped shape (else the real-render assertion is theater).

**Verification:**

- 6 per-scene archer-test.md files all green.
- 6 `briggsy-review-4.N.signoff` sentinel files present (Briggsy-written; Unit 4.10 entry gated).
- `scene-pass-summary.md` lists final verdicts + iteration counts + escalation paths if any.
- 7 per-scene out/s0N-*.mp4 + s04-peak.mp4 files render cleanly.
- `tests/scene-timing-shape.spec.ts` passes (real + 2 fault-injection per scene).
- `pnpm verify:no-transition-series` passes (regression guard).

---

### Unit 4.10 — Full Composition Render + Scene-Build Verification

- [ ] **Unit 4.10: Full Composition Render + Scene-Build Verification**

**Goal:** Render the full BurnedTrailer composition end-to-end at H264/CRF 18 (IDENTICAL encoding to Phase 6 deliverable per amendment SA-1 — no threshold differential). Output: `out/trailer-scene-build.mp4` (renamed from `trailer-preview.mp4` per best-practices Finding 6 + adversarial Finding 6). Verify playable, frame-accurate, audio-synced, music-bed continuous across S04→S05 hard cut. Briggsy signs off on scene-build for Phase 6 handoff. Phase 6 acceptance = ADDITIONAL different tests (palette spot-check, mobile-safe audit, LUFS verification per ADR #14, cold-decode test), NOT stricter pass rate.

**Requirements:** All R requirements collectively.

**Dependencies:** Unit 4.9 (all 6 `briggsy-review-4.N.signoff` sentinels present; motion-shape spec passes), Unit 4.1 (composition wired), Units 4.2–4.8 (all components built).

**Files:**

- Create: `videos/trailer/out/trailer-scene-build.mp4` (renamed; not `trailer-preview.mp4`).
- Create: `videos/trailer/sample-eval/composite-build/full-render-verification.md`.

**Approach:**

**Step 1 — Render.**

```
pnpm render:full
# or equivalently: pnpm render -- src/Root.tsx BurnedTrailer out/trailer-scene-build.mp4
```

Per `package.json` script (Phase 0 Unit 0.1 ADR; amendment SA-4 corrected CLI), renders at:
- Codec: H264
- CRF: 18 (IDENTICAL to Phase 6 deliverable; no threshold differential per amendment SA-1)
- Resolution: 1920×1080
- Frame rate: 30fps
- Output: `out/trailer-scene-build.mp4`

Expected render time: 6–9 minutes for a 95-second composition (UMB v3's 148-second trailer rendered in ~10 minutes on Briggsy's setup; BURNED is ~64% of that). With S04 iteration via `Preview_S04Peak` (fast-iter window 13s = ~30s render), total Phase 4 wall-time budget is 2-3 sessions, NOT a single 6-9 min render (per amendment SA-2 + adversarial Finding 7 — original plan understated this; corrected here).

**Step 2 — Playback verification.**

Open `out/trailer-scene-build.mp4` in any player. Verify:

- **Plays end-to-end** (no decode errors)
- **Duration is 95.0 seconds** ±10ms tolerance
- **Audio + video sync** at known cue frames (frame 60 cold-open speaker; frame 1950 stacked payoff stamp + Dash "they WERE the operation"; frame 2790 BURNED logo land + Phrasing; frame 2820 R15 #4 subhead)
- **No frame drops** (visual flicker / missing frames)
- **Hard cut at S04→S05** reads as DELIBERATE Archer chapter break (S04TailFadeToBlack overlay does the work — NO visible cross-dissolve, NO jarring palette jump)
- **All R15 stamps visible** at their cue frames; split-layer composition crisp (frame.svg + text.svg in register; no rotation deformation)
- **Music bed continuous across S04→S05 hard cut** — NO audible click at frame 2040; volume envelope flows smoothly through cut frame (per best-practices Finding 3; spot-check at frames 1950, 1995, 2000, 2040)
- **Music bed never overwhelms a Dash VO line** — spot-check at frames 60, 240, 1080, 1950, 2610 (per amendment SA-10). Overwhelm detected → adjust MusicBed envelope at those windows. Master-only fix; no scene file changes.

**Step 3 — Full-runtime §2 sweep.**

Per insight 050: Briggsy plays the trailer end-to-end twice (eye-on-MP4, not studio preview alone) + samples 12 frames at fixed timecodes (every ~7.5 seconds):

| Sample frame | Scene | §2 check focus |
|--------------|-------|----------|
| 30 | S01 | Card flash 1 in frame; EASE_OUT entry visible |
| 285 | S02 | Briefing-room mid-scene; venetian-blind shadow visible |
| 540 | S03 | Roster reveal mid-stagger |
| 825 | S03 → S04 boundary | DossierPageWipe transition |
| 1080 | S04 | Cascade opening; HTP slide-in |
| 1335 | S04 | Card-art halo at 40% chrome opacity |
| 1590 | S04 | CommsTicker R15 #2 text override active |
| 1845 | S04 | Cascade peak — anti-pattern guard: ≤2 elements at full visual weight |
| 1995 | S04 | Payoff silence beat — music at 0.08, stamp at full opacity |
| 2040 | S04→S05 boundary | S04TailFadeToBlack ends, hard cut to gameplay; no audible click |
| 2355 | S05 | Scream beat (if R5 kept) |
| 2820 | S06 | BURNED logo + R15 #4 split-layer "FIELD-READY" |

Per-frame: §2 yes/no. Threshold: ≥10/12 pass for Phase 4 sign-off. Per amendment SA-1: this is the SAME threshold the Phase 6 deliverable evaluates against — distinction is acceptance TESTS not stricter PASS rate. Phase 6 adds palette / mobile-safe / LUFS / cold-decode tests.

**Step 4 — Per-scene rendering time + bundle size.**

Document:
- Total render time
- Final MP4 size (target: 100–200 MB for 95s @ CRF 18)
- Average frame render time (helpful for Phase 6 optimization)

**Step 5 — Briggsy sign-off.**

`full-render-verification.md`:

```md
# Full Composition Render — Phase 4 Scene-Build Sign-Off

Date: 2026-MM-DD
Render time: <N> minutes (target: 6-9 min)
File size: <N> MB (target: 100-200 MB)
Duration: <measured>s (target 95.0s, drift <%>)

## Sentinel files (Unit 4.9 gate — git-author check per amendment TIER 2 #7)
Run `pnpm verify:briggsy-sentinels` — exits 0 only if all 6 are present AND authored by briggsy007@gmail.com:
- [ ] briggsy-review-4.2.signoff (S01) present + Briggsy-authored
- [ ] briggsy-review-4.3.signoff (S02) present + Briggsy-authored
- [ ] briggsy-review-4.4.signoff (S03) present + Briggsy-authored
- [ ] briggsy-review-4.5.signoff (S04) present + Briggsy-authored
- [ ] briggsy-review-4.6.signoff (S05) present + Briggsy-authored
- [ ] briggsy-review-4.7.signoff (S06) present + Briggsy-authored

## Playback verification
- [ ] Plays end-to-end without decode errors
- [ ] Audio + video sync at cue frame samples
- [ ] No frame drops
- [ ] All transitions smooth (DossierPageWipe / S04TailFadeToBlack / IrisWipe)
- [ ] All R15 stamps visible at cue frames; split-layer composition crisp
- [ ] Hard cut at S04→S05 reads as DELIBERATE Archer chapter break (NOT glitch)
- [ ] Music bed continuous across S04→S05 hard cut (no audible click; spot-check 1950/1995/2000/2040)
- [ ] Music bed never overwhelms a Dash VO line (spot-check 60/240/1080/1950/2610)

## §2 frame sweep (12 sampled frames)
- [ ] ≥10 of 12 frames pass §2 (Briggsy-eye fluency read per insight 050)

## R3 stacked-payoff verification
- [ ] Visual stamp + Dash VO line "they WERE the operation" land simultaneously at frame 1950 ±2 frames
- [ ] 1.0-second payoff visual hold (frames 1950-2040)
- [ ] Music silence beat at 0.08 between frames 1995-2000 reads as TRUE BREATH (not dilution)
- [ ] S04TailFadeToBlack frames 2025-2040 transition to S05 reads as Archer chapter punctuation
- [ ] R3 = hard cut delivered (NOT cross-dissolve; ADR #11 revised)

## Motion-shape spec gate
- [ ] tests/scene-timing-shape.spec.ts S04 + S06 real-render specs PASS
- [ ] tests/scene-timing-shape.spec.ts fault-injection canaries FIRE on synthetic-clipped shape

## Anti-regression checks
- [ ] pnpm verify:no-transition-series passes (zero matches in src/)
- [ ] pnpm verify:trailer-paths passes (no staticFile('assets/...') drift for Phase 3 NEW assets)
- [ ] pnpm verify:vocab-sync passes (vendored burned-vocabulary matches BURNED source)

## Briggsy sign-off
- Phase 4 scene-build: APPROVED / ITERATE
- Hand-off to Phase 6 QA: GO / NOGO
- Phase 6 acceptance is ADDITIONAL tests (palette / mobile-safe / LUFS per ADR #14 / cold-decode), NOT stricter pass rate
- Phase 6 does NOT re-render unless a composition-level change is required
```

**Patterns to follow:**

- UMB v3 render workflow (precedent).
- `feedback-verify-before-presenting.md` — production render verification, not studio preview alone.
- `feedback-elite-team-standard.md` — verify → then lock.
- Phase 0 ADR (CRF 18, H264, etc.).

**Test scenarios:**

- **Happy path:** Render completes; full-runtime §2 ≥10/12; Briggsy signs off; sentinel files all present.
- **Edge case:** Render fails mid-way (memory / decoder issue) → investigate per scene; isolate failing scene via per-scene Preview_ composition; iterate.
- **Edge case:** Audio + video drift detected → check Phase 2 manifest's `actualFrames` + `leadFramesHint` aligns with placed `<Sequence>` durations at composition level.
- **Edge case (now MOOT — closed by amendment TIER 1 #5):** Hard cut S04→S05 was previously open to "if Unit 4.9 finds jarring, add S05HeadFadeFromBlack." Mandatory S05HeadFadeFromBlack now ships with the scene by default; the symmetric 15+15 fade through black is a baseline, not a remediation.
- **Edge case:** Music-bed click at hard cut detected → verify MusicBed envelope interpolation is continuous (NOT step function); confirm `interpolate()` clamp settings.
- **Performance:** Render time exceeds 15 minutes → flag for Phase 6 optimization (offthreadVideo concurrency, render-cache).

**Verification:**

- `out/trailer-scene-build.mp4` exists + plays end-to-end.
- `full-render-verification.md` documents all checks (including sentinel + anti-regression + motion-shape gates).
- Briggsy signs off; hand-off to Phase 6.
- Trailer is Phase 6 input candidate (identical encoding; only acceptance differential is Phase 6's additional tests).

---

## System-Wide Impact

- **Interaction graph:** Phase 4 ingests Phases 1 (BEAT-SHEET + timing), 2 (AUDIO_ASSETS manifest at composition level per ADR #16), 3 (vendored burned-vocabulary + cascade-ring-layout.json + htp-capture-metadata.json + R15 split-layer SVGs + briefing-room assets per ADR #15), 5 (gameplay clip via build-time existsSync switch — placeholder fallback per amendment SA-6). Produces `out/trailer-scene-build.mp4` + per-scene archer-test signoff sentinels + UMB v3 component triage table + font spike outcome + motion-shape spec results. Phase 6 receives `out/trailer-scene-build.mp4` for QA — re-renders only on QA-driven composition-level change.
- **Error propagation:** A scene's §2 failure routes through structured 3-branch escalation (Unit 4.9 amendment SA-3): value-tunable → Unit 4.5 reopen with value-search bracket; composition-structural → Phase 1 Unit 1.5 reopen; scene-existence → brainstorm reopen. Shared components frozen during reopen. Other scenes continue in parallel. A render error routes to per-scene isolation via `Preview_S0N_…` standalone renders.
- **State lifecycle risks:** Trailer project's `node_modules` lives in `videos/trailer/node_modules/` (isolated per Phase 0 ADR #2). Render output lives in `videos/trailer/out/`; gitignored. `public/trailer/gameplay.mp4` + `public/trailer/gameplay-placeholder.mp4` both `.gitignored` per amendment SA-6 (lifecycle hardening — never committed; atomic-swap via `.new` intermediate).
- **API surface parity:** None — Phase 4 produces video output, not user-facing surfaces.
- **Integration coverage:** Phase 0 Unit 0.5 spike validated Remotion integration mechanics for hard cuts + audio crossfade + custom-font MP4 export. Phase 4 implements at trailer scale + adds new mechanics not in spike: composition-level audio map per ADR #16; vocabulary vendoring boundary; cascade-ring-layout.json consumption; R15 split-layer architecture; S04TailFadeToBlack scene-internal overlay; per-scene Preview_ compositions + fast-iteration Preview_S04Peak window.
- **Cross-phase contract surface:** Phase 4 = first downstream consumer of Phase 2's AUDIO_ASSETS shape AND Phase 3's visual-manifest + cascade-ring-layout.json + vendored burned-vocabulary + R15 split-layer SVG inventory. Contract changes upstream → Phase 4 absorbs via re-import (no scene-file edits needed for audio shape; vocab vendor refresh required for component shape).
- **Unchanged invariants:** BURNED game code untouched (vendored vocabulary is COPY not import). BURNED Phone bundle budget unaffected (trailer is isolated package). Trailer's `pnpm-lock.yaml` independent from BURNED's. CI gate `pnpm verify:vocab-sync` catches BURNED↔vendored drift.
- **NEW CI gates added by Phase 4 deepening:**
  - `pnpm verify:vocab-sync` — `diff -r` of vendored burned-vocabulary against BURNED source (already specified in Phase 3 Unit 3.0).
  - `pnpm verify:no-transition-series` — grep guard against `TransitionSeries` import regression per ADR #11 revised.
  - `pnpm verify:trailer-paths` — regex check for `staticFile('assets/...')` drift on what should be Phase 3 NEW assets per ADR #15.
  - `pnpm verify:gameplay-clip` — ffprobe gate for Phase 5 handoff (540 frames / 1920×1080 / no audio).
  - `tests/scene-timing-shape.spec.ts` — quantitative motion-shape gate for cascade + closing with fault-injection canary.
- **ESLint regression guards:** `no-restricted-imports` rule blocking `Audio` from `'remotion'` per ADR #17 (prevents accidental legacy `<Html5Audio>` adoption).

---

## Risks & Dependencies

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| S04 cascade composition fails §2 in iteration | High (load-bearing scene) | Medium | Unit 4.9 structured 3-branch escalation procedure (per amendment SA-3); Preview_S04Peak fast-iter window cuts iteration time from ~2 min to ~30 s; motion-shape spec triggers on vibe-quality feedback before speculative edits. |
| Audio + video drift in long renders | Low | High | Phase 2 manifest uses `actualFrames` + `leadFramesHint`; Unit 4.1 audio placed at composition level via single map per ADR #16 (single source of truth eliminates per-scene drift). |
| Phase 5 gameplay clip delayed or contract-broken | Medium | Low | `gameplay-placeholder.mp4` separate file (NOT overwrite per amendment SA-6); build-time switch via `scripts/sync-gameplay-clip.ts` generating `gameplay-clip-source.ts` constant on prerender/prestudio (per document-review amendment TIER 1 #2 — scene-file `node:fs` crashes Remotion browser context); `pnpm verify:gameplay-clip` ffprobe gate (per amendment MA-3) catches duration/audio/aspect drift before swap. |
| ~~Variable woff2 weight syntax unsupported in Remotion 4.0.438~~ **RESOLVED-BY-PHASE-0 2026-05-22** | ~~Medium (UNRESOLVED per Phase 3 deepening)~~ N/A | ~~Medium~~ N/A | Phase 0 Unit 0.5 spike (`spike-results.md` §(c), 2026-05-18) validated `weight: '200 700'` PASS in Remotion 4.0.438. `useFonts.ts` ships production variable-axis pattern. Unit 4.0 DROPPED. Stale "UNRESOLVED per Phase 3 deepening" was a cascade from agents who didn't read Phase 0 exit. See insight 066. |
| Render time exceeds reasonable iteration cycle | Medium → realistically 2-3 sessions for S04 thrash | Medium | Preview_S04Peak fast-iter window; studio-preview for layout iteration; production render only at Unit 4.9 sentinel + Unit 4.10. Per amendment SA-2: cadence subsection in Documentation/Operational Notes makes wall-time budget explicit. |
| Music-bed click at S04→S05 hard cut | Low | Medium (R3 broken-feel) | Continuous `interpolate()` envelope across cut frame produces no zipper noise per best-practices Finding 3; spot-check at frames 1995/2000/2040 in Unit 4.10 Step 2. |
| Visual palette jump at S04→S05 hard cut not masked by music | Medium | High (R3 reads as glitch not punctuation) | `S04TailFadeToBlack` scene-internal overlay frames 2025-2040 per amendment MA-1 + adversarial Finding 3; **MANDATORY** symmetric `S05HeadFadeFromBlack` on S05 frames 0-15 per amendment TIER 1 #5 (was "optional Unit 4.9 polish" — pre-deepening framing wrong; baseline fade-through-black needs both sides); executable evidence via `pnpm verify:gameplay-clip` (luminance gate) + `pnpm verify:s05-head-fade` (grep gate). |
| Iris-wipe SVG mask zero-radius edge case | Low (verified in Unit 4.8 Step 3) | Low | EASE_IN_OUT clamps starting + ending radius; opening at fromFrame=0 produces fully-black mask (scene hidden) — correct behavior. |
| cascade-ring-layout.json schema mismatch | Low (Phase 3 deepening locked the shape) | High (CardArtHalo breaks at typecheck) | Appendix C prints actual exported TS shape; Phase 4 deepening directional sketch documents EXPECTED shape; Phase 3 deliverable confirms or amends. |
| Otto-aside typographic chrome reads as chrome-banner not marginalia | Medium | Low | Briggsy-eye verification in S03 archer-test; design-lens specifies font + weight + color + position (lower-right, JetBrains Mono 500, ochre-3, 18pt) to enforce marginalia register. |
| Phase 3 NEW asset fails §2 in MP4 export | Medium | High (delays Phase 4 exit) | Phase 4 → Phase 3 asset escalation procedure per amendment NN-7 (emit `phase-3-asset-escalation-<asset>.md`; Phase 3 regenerates; Phase 4 does NOT patch in Remotion). |
| Vocab sync drift between BURNED howtoplay components + vendored copies | Low | Medium | `pnpm verify:vocab-sync` CI gate (Phase 3 Unit 3.0); Phase 4 deepening adds `pnpm verify:no-transition-series` + `pnpm verify:trailer-paths` companion guards. |
| Briggsy-eye sentinel files skipped (premature Unit 4.10 entry) | Low | High (would ship sub-§2 master render) | Unit 4.10 dependency on all 6 sentinel files; build-time existsSync check before render. |
| Motion-shape spec false-passes (gate too lenient) | Low | Medium | Fault-injection canary in same spec file per insight 049 (synthetic-clipped shape MUST fail; synthetic-correct MUST pass). |
| Briggsy color blindness misses a color-only cue | Low (project-wide rule) | Low | Per-scene tests check typography + position + shape signal, not color. Color tokens in `tokens.css` shim per Fork 3 use Radix-style scale+step values verified for CVD per insight 051. |
| ESLint rule bypass (Audio from 'remotion' regression) | Low | Medium | `no-restricted-imports` rule enforced at lint AND typecheck; CI fails if any Phase 4 source imports Audio from core 'remotion'. |
| ScheduleWakeup / runtime context dropouts during long renders | Low | Low | Render is synchronous + non-interactive; doesn't depend on agent context. |

---

## Open Questions

### Resolved During Phase 4 Deepening (2026-05-17)

- **Composition architecture:** bare `<Series>` of `<Series.Sequence>` for ALL scene boundaries; NO `<TransitionSeries>` at composition level (per amendment MA-1 + ADR #11 revised). UMB v3 `TrailerV3.tsx:28-56` precedent.
- **R3 mechanic:** HARD CUT at S04→S05 after 1.0s payoff visual hold (per Phase 1 deepening commit `43d44ef4`; NOT cross-dissolve).
- **S04→S05 visual transition:** `S04TailFadeToBlack` scene-internal overlay on S04 tail frames 2025-2040 (per amendment MA-1 + adversarial Finding 3) — masks the briefing-room→BURNED-board palette jump.
- **Audio placement:** Composition-level via `AUDIO_ASSETS.map()` in `TrailerComposition.tsx` (NEW ADR #16; per Fork 1 + UMB v3 precedent). Scene files become pure visual.
- **Audio import discipline:** `<Audio>` ONLY from `@remotion/media`, NEVER from `'remotion'` core (NEW ADR #17; ESLint `no-restricted-imports` rule).
- **staticFile path discipline:** Phase 3 NEW assets at `staticFile('trailer/...')` per ADR #15; BURNED existing assets at `staticFile('assets/...')`. CI gate `pnpm verify:trailer-paths`.
- **R15 chrome architecture:** SPLIT-LAYER (frame.svg + text.svg) per Phase 3 contract #10; outer wrapper applies single transform.
- **Animation paradigm:** pure Remotion `interpolate()` + `spring()`. NO Framer Motion in trailer project. Single curve registry at `src/lib/animations.ts` (3 emil easings + 4 named springs + archer-slap helper); NO inline curves in scene files.
- **Stamp slap shape:** `scale(0.95) → scale(1.04) → scale(1.0)` per Phase 1 lock (NOT inverted `1.4 → 0.95 → 1.0` as pre-deepening had per amendment MA-8).
- **Stat caption typography:** Clash Display 700 with semi-transparent classification-bar backdrop per Phase 3 contract #13 (NOT General Sans 600 as pre-deepening had).
- **Stat caption envelope:** Asymmetric 6/30+/12 frame envelope per Phase 1 lock (NOT symmetric 5/(end)/15).
- **Stat caption exit behavior:** Decay to 30% chrome at side-band-right per design-lens (NOT fade to 0).
- **Per-scene componentization:** each scene a single .tsx file (pure visual) composing shared components; audio at composition level.
- **Token-import strategy:** Option C — fixed-value shim at `src/lib/tokens.css` per Fork 3. Clones BURNED `primitives.css` subset. Isolated-package architecture preserved.
- **Trailer-native shared components:** R15Stamp (split-layer), BriefingRoomBackground, DossierFolder, CommsTicker, HtpDossierHero, CardArtHalo, GoofyStatCaption, S04TailFadeToBlack, MusicBed, vendored FadeTransition (optional per Unit 4.0a triage). Per amendment SA-5: `PendletonCrest`, `OperativeRosterReveal`, `StackedPayoffStamp` INLINED (single-use single-prop wrappers). `DeckOf120` CUT (not in Phase 1 BEAT-SHEET).
- **Vocabulary vendoring:** Phase 3 Unit 3.0 vendored 10 BURNED howtoplay files at Phase 3 entry; Phase 4 imports from `./components/burned-vocabulary/` (NOT path-import from BURNED).
- **Phase 5 dependency handling:** `gameplay-placeholder.mp4` as separate file per amendment SA-6 (NOT overwrite); build-time switch via `scripts/sync-gameplay-clip.ts` writing `videos/trailer/src/lib/gameplay-clip-source.ts` (runs as prerender/prestudio/postinstall — per document-review amendment TIER 1 #2; scene-file `node:fs` import crashes Remotion browser context); atomic swap via `.new` intermediate + `pnpm verify:gameplay-clip` ffprobe gate.
- **Per-scene Archer test mandatory:** sentinel-file gating (`briggsy-review-4.N.signoff`) per amendment NN-1; Unit 4.10 entry gated.
- **§2 iteration escalation:** structured 3-branch procedure per amendment SA-3 (value-tunable / composition-structural / scene-existence) replaces undefined "max 3 iter then reopen Phase 1."
- **Output naming:** `out/trailer-scene-build.mp4` (per amendment SA-1; renamed from `trailer-preview.mp4` to eliminate threshold-differential process theater on encoding quality). Phase 4 exit = Phase 6 deliverable CANDIDATE; Phase 6 acceptance = additional DIFFERENT categories (palette/mobile/LUFS/cold-decode) AND MAY require composition-level edits that trigger re-render (per document-review amendment TIER 2 #8 — re-render is expected workflow for non-trivial Phase 6 findings, not the exception).
- **S03 Otto-aside:** Typographic BASEMENT option (per Fork 2 + amendment MA-9). Lower-right, JetBrains Mono 500, 18pt, ochre-3, "// OPERATIVE 07: BASEMENT — DO NOT ASK".
- **S03 roster cap:** Exactly 6 operatives (NOT 7); Otto handled via aside chrome.
- **`cascade-ring-layout.json` consumption:** Phase 4 imports JSON for per-card position + entry stagger (per amendment MA-10); NO inline geometry math.
- **Sequential revelation in S04:** Per Phase 1 deepening anti-pattern guard — no frame except 1950 payoff has >2 elements at full visual weight. Halo at 40% chrome opacity right-edge-only (per design-lens Finding 1). HTP hero drops to 50% at payoff stamp land (focal hand-off).
- **Music silence-beat depth:** 0.08 at frame 1995-2000 per amendment SA-8 (NOT 0.30); true breath for R3 payoff.
- **Logo spring asymmetry:** S01 LOGO_SPRING_COLD (snappy) vs S06 LOGO_SPRING_CLOSING (settled) per amendment SA-9.
- **R15 #4 filename + frame:** `subhead-4-field-ready-{frame,text}.svg` at frame 2820 per amendment MA-6 (NOT `subhead-4-agent-built.svg` at 2800).
- **CommsTicker behavior:** Hold one line during VO windows per design-lens (NOT rotate every 3s — pulls eye).
- **Per-scene `<Composition>` registration:** `Preview_S0N_…` prefix per amendment SA-4; CLI positional invocation `pnpm render -- src/Root.tsx Preview_… out/...` (NOT `--composition=` flag).
- **Fast-iteration window for S04:** `Preview_S04Peak` composition (frames 600-990 only) per amendment SA-2; ~30s iter time vs ~2 min full S04.

### Deferred to Implementation

- ~~**Variable woff2 weight spike outcome** (NEW Unit 4.0; per amendment MA-7)~~ **RESOLVED-BY-PHASE-0 2026-05-22** — Phase 0 Unit 0.5 PASS verdict (`spike-results.md` §(c)); `useFonts.ts` already ships production variable-axis pattern for all 3 families. Unit 4.0 DROPPED. See insight 066.
- **UMB v3 component triage decisions** (NEW Unit 4.0a; per amendment NN-4) — which of 12 UMB components are CLONE-AND-ADAPT / TAKE-AS-INSPIRATION / SKIP. Documented in `umb-v3-component-triage.md` at execution time.
- **Spring constant fine-tuning per scene** — ARCHER_STAMP_SPRING / PAYOFF_SPRING / LOGO_SPRING_COLD / LOGO_SPRING_CLOSING defaults documented per Phase 1 lock; per-scene tuning happens in Unit 4.9 iteration if §2 review needs it.
- **HTP hero scroll range exact pixel count** — consumed from `htp-capture-metadata.json` at Phase 3 deliverable land.
- **Whether to apply ~~FadeTransition vendored~~ `SceneFadeToBlack` polish to hard-cut boundaries** (S02→S03, S03→S04, S06→end) — per Unit 4.9 perceptual review. (Unit 4.0a triage 2026-05-22: FadeTransition vendoring SUPERSEDED by existing `SceneFadeToBlack.tsx` — use that primitive if Unit 4.9 calls for boundary polish.)
- ~~**Whether to add S05HeadFadeFromBlack overlay** (S05 frames 0-15) for symmetric "fade through black" with S04TailFadeToBlack — per Unit 4.9 perceptual review.~~ **CLOSED** by document-review amendment TIER 1 #5 — S05HeadFadeFromBlack is MANDATORY (not Unit 4.9 conditional); see Unit 4.6 Step 1c + `verify:s05-head-fade` grep gate.
- **Render time optimization** (concurrency / offthreadVideo render-cache thresholds) — deferred to Phase 6.
- **Depth-plane foreground element pick for S02** (Option A brass nameplate / B manila folders / C doorframe vignette) — Phase 4 picks at execution per Phase 1 Unit 1.10 deepening flag.
- **Optional captions for accessibility** (`@remotion/captions`) — Phase 6 polish decision (per best-practices Finding 7).

---

## Documentation / Operational Notes

- All Phase 4 artifacts land in `videos/trailer/src/`, `videos/trailer/out/`, and `videos/trailer/sample-eval/composite-build/`.
- Studio preview iteration: `pnpm studio` for live previewing (browser-only, no MP4).
- Per-scene render: `pnpm render -- src/Root.tsx Preview_S0N_… out/sN.mp4` (positional ID per amendment SA-4).
- Fast-iter window for S04: `pnpm render -- src/Root.tsx Preview_S04Peak out/s04-peak.mp4` (~30 s render vs ~2 min full S04).
- Full master render: `pnpm render:full` (alias for `pnpm render -- src/Root.tsx BurnedTrailer out/trailer-scene-build.mp4`).
- Trailer project's `node_modules` is isolated (Phase 0 ADR #2). Vendored `burned-vocabulary/` from BURNED howtoplay enforced via `pnpm verify:vocab-sync`.
- Phase 5 dependency: `public/trailer/gameplay.mp4` per ADR #15 (NOT `videos/trailer/public/gameplay.mp4`). Phase 4 ships `public/trailer/gameplay-placeholder.mp4` parallel file; S05 build-time `existsSync` switch.
- Per-scene `Preview_` compositions + `Preview_S04Peak` registered alongside master `BurnedTrailer` in `Root.tsx` for standalone rendering (Unit 4.9).
- Briggsy reviews actual rendered MP4 per scene + full composition, not studio preview alone (`feedback-verify-before-presenting.md` + insight 050). Sentinel-file gating (`briggsy-review-4.N.signoff`) enforces.
- Color blindness rule: typography + position + shape carry signal (`user_color_blind.md`). Color tokens via `tokens.css` shim per Fork 3.
- **Phase 4 → Phase 3 asset escalation procedure** (per amendment NN-7): if Phase 3-shipped asset fails §2 in MP4 export, emit `phase-3-asset-escalation-<asset>.md` instead of patching in Remotion. Phase 3 regenerates the asset. Don't fight Imagen priors in post (per insight 018 generalization).
- **Phase 4 Execution Cadence** (NEW per amendment SA-2): per-scene render 0.5-2 min; full master render 6-9 min; Briggsy review ~1× clip length per pass. Best case ~3 hours of Phase 4 wall-time. Realistic with S04 thrash: 2-3 sessions. Use `Preview_S04Peak` for fast-iter to keep S04 cycles under 1 min.
- **Vibe-quality feedback workflow** (per amendment NN-6 + insight 044): "feels off" / "blink" / "something's wrong" feedback from Briggsy triggers `tests/scene-timing-shape.spec.ts` FIRST (quantitative motion-shape sampling); speculative scene edits only after the spec output suggests where to look.
- **ESLint regression guard:** `.eslintrc.cjs` includes `no-restricted-imports` rule blocking `Audio` from `'remotion'` per ADR #17.
- **CI gates** (added by Phase 4 deepening; expanded by document-review amendments TIER 1 #5 + TIER 2 #7 + TIER 2 #10):
  - `pnpm verify:vocab-sync` (Phase 3 deliverable; ran in Phase 4 too)
  - `pnpm verify:no-transition-series` (Phase 4 deliverable; regression guard for ADR #11)
  - `pnpm verify:trailer-paths` (Phase 4 deliverable; regression guard for ADR #15)
  - `pnpm verify:gameplay-clip <file>` (Phase 4 deliverable; ffprobe gate for Phase 5 handoff per amendment MA-3 + first-frame luminance gate per amendment TIER 1 #5)
  - `pnpm verify:s05-head-fade` (NEW per amendment TIER 1 #5; grep gate confirming S05HeadFadeFromBlack overlay is in S05_GameplayDissolve.tsx — closes "mandatory overlay" honor-system loophole)
  - `pnpm verify:briggsy-sentinels` (NEW per amendment TIER 2 #7; git-author check on all 6 briggsy-review-4.N.signoff files — replaces existsSync sentinel check; closes "Claude can fabricate signoffs" honor-system loophole; gates Unit 4.10 entry)
  - `pnpm test:scene-timing-shape` (Playwright spec per amendments NN-2/NN-3; STUDIO-STAGE — cascade + closing + fault-injection canaries; component-implementation envelope verification)
  - `pnpm test:scene-timing-shape-mp4` (NEW per amendment TIER 2 #10; vitest + ffmpeg frame-extract + pixel-diff against committed expected snapshots — ENCODED-MP4 envelope verification, complements studio-stage spec since H264 encoding can drift timing invisibly to component tests)

---

## Sources & References

**Origin documents:**
- Brainstorm: [`docs/ideation/2026-05-15-origin-trailer-brainstorm.md`](../../ideation/2026-05-15-origin-trailer-brainstorm.md)
- Roadmap: [`docs/plans/origin-trailer/roadmap.md`](./roadmap.md)
- Phase 0 plan: [`docs/plans/origin-trailer/phase-0-gate-resolution.md`](./phase-0-gate-resolution.md)
- Phase 1 plan: [`docs/plans/origin-trailer/phase-1-beat-sheet-lock.md`](./phase-1-beat-sheet-lock.md)
- Phase 2 plan: [`docs/plans/origin-trailer/phase-2-voice-pipeline.md`](./phase-2-voice-pipeline.md)
- Phase 3 plan: [`docs/plans/origin-trailer/phase-3-visual-asset-prep.md`](./phase-3-visual-asset-prep.md)

**Phase 4 deepening artifacts (2026-05-17):**
- `.context/compound-engineering/ce-plan/deepen/phase-4/_shared-context.md` — 38-contract bundle shared across 10 agents
- 9 agent artifacts under `.context/compound-engineering/ce-plan/deepen/phase-4/` (best-practices / framework-docs / repo-research / adversarial / scope-guardian / coherence summary in task-notification / emil / learnings / brief; design-lens partial; feasibility crashed but coverage absorbed via other agents)

**UMB v3 precedents:**
- Composition wiring: `projects/undercover-mob-boss/videos/trailer/src/{Root.tsx,TrailerV3.tsx}` — bare `<Series>` shape verified zero `<TransitionSeries>` usage (Phase 4 deepening repo-research)
- Composition-level audio map: `projects/undercover-mob-boss/videos/trailer/src/TrailerV3.tsx:59-63` (ADR #16 precedent)
- Scene files: `projects/undercover-mob-boss/videos/trailer/src/scenes/V3S{01..09}_*.tsx` — single FC export, AbsoluteFill wrapper pattern
- Shared components: `projects/undercover-mob-boss/videos/trailer/src/components/*.tsx` (12 files — Unit 4.0a triage target)
- Timing constants: `projects/undercover-mob-boss/videos/trailer/src/lib/timing-v3.ts`
- `useFonts.ts`: `projects/undercover-mob-boss/videos/trailer/src/hooks/useFonts.ts:1-37` — per-weight `loadFont()` precedent (FAIL-branch path for Unit 4.0 font spike)
- `FadeTransition.tsx`: `projects/undercover-mob-boss/videos/trailer/src/components/FadeTransition.tsx:1-43` — scene-end fade-to-black mechanism (Unit 4.8 Step 5 optional vendor)

**Remotion 4.0.x documentation** (Context7-fetched during deepening framework-docs pass):
- `packages/docs/docs/series.mdx` — bare `<Series>` semantics (>= v4.0.443 "functions as `<Sequence>` under the hood")
- `packages/docs/docs/transitions/transitionseries.mdx` — TransitionSeries overlap math (`60+60−15=105` pattern; informed ADR #11 revised)
- `packages/docs/docs/media/audio.mdx` — `<Audio>` API from `@remotion/media`; `from` + `durationInFrames` props "Available from: v4.0.445" (post-ADR-#1 pin)
- `packages/docs/docs/offthreadvideo.mdx` — `muted` boolean prop documented
- `packages/docs/docs/fonts-api/load-font.mdx` — single-weight `loadFont()` examples; variable-axis range syntax UNRESOLVED (Unit 4.0 spike)
- `packages/docs/docs/composition.mdx` — multi-Composition Root pattern
- `packages/docs/docs/miscellaneous/snippets/combine-compositions.mdx` — canonical multi-Composition snippet
- `packages/docs/docs/cli/render.mdx` — positional composition-ID CLI invocation
- `packages/docs/docs/staticfile.mdx` — no compile-time validation; URL synthesis only at render
- `packages/docs/docs/config.mdx` — `setPublicDir` semantics
- `packages/docs/docs/multiple-fps.mdx` — `useVideoConfig()` fps inheritance
- `packages/docs/docs/spring.mdx`, `packages/docs/docs/interpolate.mdx`
- `packages/skills/skills/remotion/rules/local-fonts.md` — Promise.all loading pattern
- `packages/skills/skills/remotion/rules/transitions.md` — transition presentation patterns
- `packages/skills/skills/remotion/rules/audio.md` — volume callback pattern

**BURNED quality bar:**
- `docs/PRODUCT-SPECIFICATION.md` §2 (Archer test)
- `CLAUDE.md` "The Contract" section
- `src/client/board/DossierFeed.tsx:20-25` — verified CommsTicker idle-text source
- `src/client/board/GameTable.tsx:67-88` — inline `.caseBanner` aside (replaces ghost `CaseBanner.tsx` reference)
- `src/client/board/GameTable.tsx:21-22` — CSS-blinds pattern (fallback if Phase 3 doesn't ship venetian-blinds.svg)
- `src/client/howtoplay/components/{Card,ClassificationBanner,Crest,DossierPage,EyebrowLabel,Marginalia,PlayCTA,ReadingProgress,RedactBar,Stamp}.tsx` — vocabulary vendor source (10 files; Phase 3 Unit 3.0)
- `src/client/howtoplay/acts/ActRoster.tsx:153-158` — Otto-exclusion aside; roster narration source

**BURNED institutional insights (docs/insights/):**
- `docs/insights/050-agent-verification-misses-perceptual-continuities.md` — Briggsy-eye sentinel-file gating (amendment NN-1)
- `docs/insights/052-instrumentation-bottleneck-is-promotion-not-production.md` — Unit 4.0a UMB v3 component triage (amendment NN-4)
- `docs/insights/049-runtime-gate-sensitivity-via-in-spec-fault-injection.md` — motion-shape spec fault-injection canary (amendments NN-2/NN-3)
- `docs/insights/044-triage-fix-paths-anchor-investigation-toward-presented-hypotheses.md` — vibe-quality feedback triggers instrumentation first (amendment NN-6)
- `docs/insights/018-imagen-priors-engineer-around-dont-fight.md` — Phase 4 → Phase 3 asset escalation (amendment NN-7 generalization)
- `docs/insights/029-downstream-plans-reference-prose-that-no-parser-extracts.md` — Appendix C prints actual TS shapes (amendment NN-5)
- `docs/insights/031-preferred-architecture-deferred-then-discovered-at-integration.md` — Unit 4.0 font spike as numbered gate (amendment MA-7)

**Institutional learnings (memory):**
- `feedback-verify-before-presenting.md` — render-MP4 review, not studio preview
- `feedback-elite-team-standard.md` — verify → then lock
- `user_color_blind.md` — typography + position + shape carry signal
- `feedback-eye-in-loop-beats-calibration-for-motion.md` — eye-in-loop on motion
- `feedback-phase-plan-drafting-workflow.md` — write all phase files in one workflow; deepen sequentially after

**External research** (best-practices agent):
- Gemini-grounded scan for 2026 Remotion industry composition patterns
- Replit Agent 4 + Cursor 3 reels (roadmap §5.4) — pattern references current as of 2026-05-17
- `@remotion/captions` flagged as Phase 6 polish option for accessibility

---

## Appendix A — Phase 4 Execution Cadence

Realistic per-pass timings + session budget per amendment SA-2.

**Per-scene render times** (extrapolated from UMB v3's ~4-frames/sec rate):
- S01 ColdOpen (210 frames / 7s): ~30s render
- S02 BriefingSetup (360 frames / 12s): ~48s render
- S03 MissionBackground (480 frames / 16s): ~64s render
- S04 ReceiptsCascade (990 frames / 33s): ~132s render (~2.2 min)
- S04Peak fast-iter window (390 frames / 13s): ~30s render (~17% of full S04)
- S05 GameplayDissolve (540 frames / 18s): ~72s render
- S06 ClosingDirective (270 frames / 9s): ~36s render
- BurnedTrailer master (2850 frames / 95s): ~6-9 min render

**Per-pass cycle**: render → Briggsy review (~1× clip length) → Claude edit → re-render.

**Best case** (no S04 thrash): ~3 hours of Phase 4 wall-time.

**Realistic** (S04 thrash to iter 2-3 + 1-2 other scenes iter 2): 2-3 sessions.

**Fast-iter strategy**:
- Use `Preview_S04Peak` for S04 motion tuning (~30s × 3 iter = 1.5 min vs ~6.5 min for full S04 × 3)
- Use `pnpm studio` (no encode) for layout-only iteration; switch to `pnpm render` only when production encoding is the variable
- Run `tests/scene-timing-shape.spec.ts` on vibe-quality feedback BEFORE editing (per insight 044)

---

## Appendix B — Per-Scene Escalation Procedures

Per amendment SA-3 + adversarial Finding 5. Replaces the original "max 3 iter then reopen Phase 1" which had no defined escalation path.

**Pre-iteration calibration**: Briggsy + Claude pre-agree on the four §2 sub-dimensions (composition / palette / typography / cue alignment) and pre-rank them. Iter-N must NAME the failing dimension in writing BEFORE any edit.

**Iter 1 fail → iter 2**: ONE edit batch addressing the single named dimension.

**Iter 2 fail → iter 3**: If SAME dimension still failing, structural signal — escalate immediately. If DIFFERENT dimension failing, iter 3 justified.

**Iter 3 fail → 3-branch escalation tree**:

| Failure type | Examples | Escalation target | Other-scene impact |
|---|---|---|---|
| **(a) Value-tunable** | spring config, radius, font size, opacity threshold, frame timing | Phase 4 scene unit reopen with documented value-search bracket | Other scenes continue in parallel; shared components FROZEN |
| **(b) Composition-structural** | which elements occupy which screen regions, sequential-revelation ordering, focal hierarchy | Phase 1 Unit 1.5 reopen for the affected scene | Phase 4 work pauses on affected scene; other scenes continue |
| **(c) Scene-existence** | the scene shouldn't exist as designed; whole-cloth rethink | Brainstorm reopen | Phase 4 pauses entirely |

Briggsy calls (a)/(b)/(c). Claude proposes diagnosis but Briggsy makes the call.

**Vibe-quality feedback workflow** (per insight 044 + document-review amendment TIER 2 #9): "feels off" / "blink" / "something's wrong" triggers `tests/scene-timing-shape.spec.ts` FIRST. The quantitative shape sampling narrows but doesn't fully diagnose:
- **FAIL** → value-tunable in a sampled element → 3-branch (a) path.
- **PASS** → narrows to either UNSAMPLED elements (14-of-17 cascade cards, GoofyStatCaption envelopes, music silence-beat at 1995-2000, BriefingRoomBackground shadow, etc.) OR composition-structural. Walk unsampled elements first via per-element opacity inspection in studio preview before escalating to (b) Phase 1 Unit 1.5 reopen. PASS is necessary-but-not-sufficient evidence for composition-structural — don't skip the unsampled walk.

**Master-fail-after-standalone-pass decision tree** (per amendment SA-10):
- (i) Intra-scene failure (same in standalone + master) → scene unit reopen
- (ii) Cross-scene continuity failure (only in master) → master-level fix
- (iii) Music-bed-vs-VO mix failure (only in master) → `MusicBed.tsx` envelope tweak

---

## Appendix C — Phase 1/2/3 Exported TS Shapes (per amendment NN-5)

Per insight 029 (parser-scope drift): prose-quoting field names creates ambiguity. This appendix prints the actual exported TypeScript shapes Phase 4 consumes. Filled in at Phase 4 execution time when Phase 1/2/3 deliverables land; this section starts as placeholders.

```ts
// FROM: videos/trailer/src/lib/audio-manifest.ts (Phase 2 Unit 2.8 deliverable)
// SCHEMA (EXPECTED — verify against actual when Phase 2 lands):

export interface AudioAsset {
  filename: string;            // e.g. "s01-cue-60-coldopen.wav"
  voice: 'dash' | 'sable' | 'janet' | 'vera';
  staticPath: string;          // e.g. "trailer/audio/s01-cue-60-coldopen.wav" per ADR #15
  startFrame: number;          // absolute composition frame
  actualFrames: number;        // post-processing duration
  leadFramesHint?: number;     // Phase 4 composition map subtracts this from startFrame for perceptual A/V sync
  cueType?: 'sustained' | 'list' | 'payoff' | 'scream' | 'phrasing';
  driftToleranceOverride?: number;
  contextPrimingPrevious?: string;
  contextPrimingNext?: string;
  cadenceAdapter?: { engine: string; prefixTag: string; notes?: string };
}

export const AUDIO_ASSETS: readonly AudioAsset[];
```

```ts
// FROM: videos/trailer/src/lib/cascade-ring-layout.json (Phase 3 Unit 3.4 deliverable)
// SCHEMA (EXPECTED — verify against actual when Phase 3 lands):

interface CascadeRingLayout {
  cards: Array<{
    filename: string;           // e.g. "burned.webp"
    x: number;                  // top-left x in 1920×1080 canvas
    y: number;                  // top-left y in 1920×1080 canvas
    scale: number;              // target scale (typically 0.9-1.1)
    zIndex: number;
    entryStaggerFrame: number;  // 2-frame stagger per Phase 1 Unit 1.5 lock
    anchor?: 'right-edge' | 'center-full';
  }>;
}
```

```ts
// FROM: videos/trailer/src/lib/htp-capture-metadata.json (Phase 3 Unit 3.1 contract-add per amendment SA-7)
// SCHEMA (EXPECTED):

interface HtpCaptureMetadata {
  scrollRangePx: number;     // pixel range HtpDossierHero scrolls (positive int; HtpDossierHero negates for upward scroll)
  pageHeightPx: number;      // captured full-page height
  viewportPx: { width: number; height: number };
  captureMode: 'static-png' | 'trace-webm';  // determines HtpDossierHero render branch
}
```

```ts
// FROM: videos/trailer/src/lib/timing.ts (Phase 1 Unit 1.1)
// PHASE 4 ADDITIONS per amendment SA-2:

export const TOTAL_FRAMES = 2850;
export const FPS = 30;

export const S01_END = 210;
export const S02_START = 210;
export const S02_END = 570;
export const S03_START = 570;
export const S03_END = 1050;
export const S04_START = 1050;
export const S04_END = 2040;
export const S05_START = 2040;
export const S05_END = 2580;
export const S06_START = 2580;
export const S06_END = 2850;

// NEW per Phase 4 deepening — fast-iter window
export const S04_PEAK_START = S04_START + 600;   // absolute 1650
export const S04_PEAK_END = S04_END;             // absolute 2040

// REMOVED per amendment MA-1 — TransitionSeries removed, no cross-dissolve constant needed
// export const CROSS_DISSOLVE_DURATION_FRAMES = 45;  // GONE
```

---

## Appendix D — UMB v3 Component Triage (lives in Unit 4.0a output, not the plan)

Per scope-guardian SG-11: the triage table belongs in `videos/trailer/sample-eval/composite-build/umb-v3-component-triage.md` (Unit 4.0a's actual deliverable), NOT duplicated here. Unit 4.0a Step 2 already pre-populates the tentative decisions for all 12 UMB components; the execution-time output captures Briggsy's confirmed decisions + the per-component rationale. Maintaining a placeholder table in the plan creates drift risk between two locations for the same content.

**See Unit 4.0a Step 2** for the canonical triage table.
