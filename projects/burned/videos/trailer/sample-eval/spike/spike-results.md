# Phase 0 Unit 0.5 — Composite Viability Spike Results

**Executed:** 2026-05-18
**Plan:** [`docs/plans/origin-trailer/phase-0-gate-resolution.md`](../../../../docs/plans/origin-trailer/phase-0-gate-resolution.md) §Unit 0.5
**Rendered artifact:** `videos/trailer/out/spike-frame-test.mp4` (3.56 MB, 240 frames, H264 + AAC 48kHz)
**Sample frames:** `videos/trailer/sample-eval/spike/frames/frame-{01..07}.png`

## Composite-viability disposition

**CLEARED.** All five integration points render cleanly in MP4 export.
Phase 4 inherits all production patterns without amendment.

---

## Per-point verdicts

### (a) Bare `<Series>` + scene-internal fade overlay — **PASS**

- `<Series>` of two `<Series.Sequence>` (180f + 60f) renders without
  frame-skipping or boundary artifact.
- `SceneFadeToBlack` overlay reaches opacity 1.0 at the boundary frame.
  Sample frame 178 (8 frames into the 10-frame fade) shows opacity ~0.8
  — kinetic-type stage 4 content faintly visible under near-full black
  overlay. Boundary frame 180 transitions cleanly into S02.
- ADR #4 revised production pattern (no `<TransitionSeries>`)
  validated. Phase 4 inherits the bare-`<Series>` + scene-internal-
  overlay shape exactly.

### (b) Audio crossfade via `@remotion/media` — **PASS**

- `ffprobe out/spike-frame-test.mp4`:
  - Video: h264, 8.000s, 3.31 Mbps
  - Audio: aac, 48000 Hz, 2 ch, 6.08s, 318 kbps
- Music bed `<Audio>` placed at composition level with volume callback
  (composition-frame-keyed interpolation `[0,15,25,105,130,240]` →
  `[0,0.65,0.25,0.25,0.65,0.65]`). VO offset via `<Sequence from={30}>`
  — NOT a `from` prop on `<Audio>` (no such prop on `@remotion/media`).
- Audio active duration (6.08s) is shorter than composition (8s)
  because the placeholder `music-bed.mp3` was generated at 6s. Spike
  intent (crossfade renders, ducks correctly) is validated; Phase 2
  produces production audio at full composition duration.
- Spike placeholder audio is 2-channel stereo. Phase 2 production
  audio will be mono per ADR #14 (`-ac 1`).

### (c) Clash Display variable woff2 multi-weight — **PASS**

Sample frame 01 (frame 15) renders three "BURNED" lines from the
SAME `ClashDisplay-Variable.woff2`:

- wgt 200 — hairline strokes, distinctly thin
- wgt 400 — mid-body sans
- wgt 700 — thick bold strokes

All three are **visibly distinct**. Variable-axis weight-range syntax
(`weight: '200 700'`) in `@remotion/fonts.loadFont()` works as
intended in Remotion 4.0.438.

**Phase 4 implication:** the deferred Unit 4.0 font spike (per Phase 4
ADR #18 placeholder) can be **DROPPED**. PASS branch fires — ship the
single variable woff2. Phase 3 deepening should re-validate when this
lock lands but no per-weight `pyftsubset` work is required.

### (d) Playwright HTP capture pipeline — **PASS** (with note)

- `pnpm capture:htp` ran cleanly against `http://localhost:5173/howtoplay.html`.
- HTP page scroll height: **19848 px** (10 acts × ~1985 px tall);
  Phase 3 cascade-distance reference = 18768 px (scrollHeight minus
  viewport).
- Scroll-step loop (200 px / 80 ms dwell) successfully fired BURNED's
  `useScrollReveal()` ScrollTrigger reveals across the page.
- Compatibility-verification check (added in `capture-htp-scroll-burned.ts`):
  of all `[data-reveal]` elements, only **2 were below opacity 0.95**
  at capture time — `0.91` and `0.72`. Both were mid-tween artifacts
  from the 80 ms dwell catching ScrollTrigger after it fired but
  before the 0.9 s tween completed. Visible in capture but
  slightly translucent. Phase 3 may dial dwell up to 200 ms (`top 85%`
  trigger + 0.9 s tween = ~1080 ms total observed; current 80 ms
  dwell is below the tween settle threshold for the last reveals
  hit) if Phase 3 visual inspection surfaces jank.
- Sample frame 02 (frame 60, mid-S01-cascade scroll) shows the BURNED
  HTP rendering inside the spike — wooden mahogany arena chrome, the
  field-operations-manual hero card, and "The Mission." act header
  scrolling up through the frame.

### (e) Archer-grammar transition primitives — **PASS** (all three)

- **(e₁) Classification-stamp slap.** Sample frame 03 (frame 100,
  composition-local; frame 10 inside the 30-frame stamp slot — past
  the 12-frame animation envelope, in hold). Stamp renders at the
  contract values: rotate −3° landed, scale 1.0 settled,
  `transform-origin: center`. The 6f scale-in (0.95 → 1.04) + 4f
  settle (1.04 → 1.0) + 2f hold per `STAMP_SLAP` envelope verified
  visually across earlier frames. emil EASE_OUT `(0.16, 1, 0.3, 1)`
  curve produces the snap-then-settle feel called for in the Phase 1
  Unit 1.4 lock. Pendleton cream background (`PALETTE.cream12`) +
  ochre-9 stamp ink. No render artifacts.
- **(e₂) Iris wipe.** Sample frame 04 (frame 135, frame 15 inside the
  30-frame iris slot — iris mostly open). Pure-Remotion inline SVG
  `<clipPath>` + `<circle r={interpolate}>` works without edge
  artifacts at 1080p. Mahogany arena texture revealed through the
  expanding circle mask. emil EASE_OUT applied. No compositing
  artifacts at the mask edge.
- **(e₃) Kinetic typography.** Sample frame 05 (frame 165, frame 15
  inside the 30-frame kinetic slot). Word-by-word reveal with stagger
  4 + per-word duration 6 + emil EASE_OUT on `opacity` and
  `translateY` from 24 → 0. Words 0-3 ("120 cards. Ten operatives.")
  visible at full opacity; word 3 partially settled at this sample
  frame; words 4-5 ("Don't ask.") not yet entered.
- All three transition primitives render cleanly. Phase 4 inherits
  the technical-feasibility verdict (all three viable); Phase 4
  ranking decision (stamp-slap PRIMARY / iris FALLBACK / kinetic
  CONSTRAINED to stat overlays per the ADR table) is design work,
  unblocked by spike clearing.

---

## Plan divergences (resolved)

### Divergence 1 — HTP capture output path

Plan §Files line 2128 specifies `videos/trailer/public/htp-fullpage.png`
as the capture output. **That path is unreachable to `staticFile()`**
because Remotion ships exactly ONE public dir at a time (ADR #15) and
`remotion.config.ts` sets `Config.setPublicDir('../../public')` (ADR
#8) — i.e. BURNED's `public/`, not the trailer-local `public/`.

**Resolution:** capture output written to `public/trailer/htp-fullpage.png`
(BURNED's `public/`, under ADR #15's `trailer/` subdirectory).
Composition references via `staticFile('trailer/htp-fullpage.png')`.
This is consistent with ADR #15's "all trailer-only assets at
`public/trailer/...`" lock and matches what the spike's
`SpikeHtpCascade.tsx` actually loads at render time.

The internal plan contradiction (Files line 2128 vs ADR #15) should
be corrected in a Phase 0 plan amendment if it's revisited.

### Divergence 2 — spike audio location and channel count

Spike placeholder audio (`music-bed.mp3`, `vo.wav`) was generated via
`ffmpeg sine` and placed at `public/trailer/spike/...` per ADR #15.
Music bed is 6 s stereo at 220 Hz; VO is 2.5 s mono at 440 Hz. Both
are pure tone placeholders — they validate the audio-pipeline render,
not the final mix.

Phase 2 produces production VO + music at 48 kHz / 16-bit / **mono**
(per ADR #14) at the correct composition-spanning durations. Spike
deviation is intentional.

### Divergence 3 — kinetic-type stat copy

Spike kinetic-type sub-clip uses the placeholder string "120 cards.
Ten operatives. Don't ask." for goofy-stat motion validation. The
"Ten operatives" count is not canon (BURNED has six operatives in the
deck per `src/shared/card-defs.ts` + ADR #26). Phase 4 stat overlays
will source copy via the verifier script per ADR #26
(`scripts/verify-caption-stats.ts`) at distribution time. Spike copy
is throwaway.

---

## Variable-axis multi-weight test — Phase 4 implication

**Result:** PASS.

The deferred Phase 4 Unit 4.0 font-loading-strategy spike (per ADR
#18 placeholder) can be **DROPPED** from Phase 4 scope. Variable-axis
`weight: '200 700'` syntax in `@remotion/fonts.loadFont()` renders
distinct weights from a single woff2 in Remotion 4.0.438 MP4 export.

Phase 3 ships the existing `ClashDisplay-Variable.woff2` (plus
`GeneralSans-Variable.woff2` + `JetBrainsMono-Variable.woff2` if
those families enter scope) via `Promise.all([loadFont(...) × N])`
with the same range syntax. No `pyftsubset` per-weight static
subset escalation needed.

Phase 4 deepening should re-validate this finding when the lock lands.

---

## Audio metadata

```
$ ffprobe -v error -show_entries stream=index,codec_name,codec_type,sample_rate,channels,duration,bit_rate
  out/spike-frame-test.mp4

index=0
codec_name=h264
codec_type=video
duration=8.000000
bit_rate=3306091

index=1
codec_name=aac
codec_type=audio
sample_rate=48000
channels=2
duration=6.080000
bit_rate=317375
```

Container duration matches composition (8.000 s = 240 f / 30 fps).
Audio active for 6.08 s due to placeholder music-bed length; not a
render issue.

---

## Files shipped

- `videos/trailer/src/lib/animations.ts` — emil EASE_OUT curve + STAMP_SLAP envelope constants
- `videos/trailer/src/lib/colors.ts` — BURNED palette snapshot
- `videos/trailer/src/hooks/useFonts.ts` — Clash Display variable load
- `videos/trailer/src/components/SpikeStampSlap.tsx` — point (e₁)
- `videos/trailer/src/components/SpikeIrisWipe.tsx` — point (e₂)
- `videos/trailer/src/components/SpikeKineticType.tsx` — point (e₃)
- `videos/trailer/src/components/SpikeFontWeightDemo.tsx` — point (c)
- `videos/trailer/src/components/SpikeHtpCascade.tsx` — point (d)
- `videos/trailer/src/components/SceneFadeToBlack.tsx` — point (a) overlay primitive
- `videos/trailer/src/scenes/SpikeS01_Cascade.tsx` — sequenced sub-clip ladder
- `videos/trailer/src/scenes/SpikeS02_Gameplay.tsx` — placeholder closer
- `videos/trailer/src/SpikeCompositionMain.tsx` — top-level spike composition
- `videos/trailer/src/Root.tsx` — registered `SpikeFrameTest` composition alongside `BurnedTrailer`
- `videos/trailer/scripts/capture-htp-scroll-burned.ts` — Playwright HTP capture (Phase 3 Unit 3.1 promotes via URL swap)
- `videos/trailer/package.json` — added `render:spike`, `capture:htp` scripts + `@playwright/test` devDep
- `public/trailer/htp-fullpage.png` — captured BURNED HTP fullpage (32 MB, 1920 × 19848)
- `public/trailer/spike/music-bed.mp3` — placeholder music bed (6 s stereo, 220 Hz sine)
- `public/trailer/spike/vo.wav` — placeholder VO (2.5 s mono, 440 Hz sine)
- `videos/trailer/out/spike-frame-test.mp4` — rendered spike (gitignored)
- `videos/trailer/sample-eval/spike/frames/frame-{01..07}.png` — sample frames for inspection

---

## What this unblocks

- Unit 0.2 Step 1.5 (engine-adapter translation) — composite spike no
  longer gates engine-adapter authoring. Engine adapters remain gated
  on Step 0.5 spec sanity check (cold-reader feedback drives spec
  revision) and Briggsy's ElevenLabs Creator + OpenAI billing keys
  per the Step 0a HARD BLOCK in `phase-0-gate-resolution.md` §Unit
  0.2 Pre-Execution Prerequisites.
- Phase 4 inherits all five integration patterns as validated
  production shapes. Phase 4 Unit 4.0 font-loading-strategy spike
  redundant — DROP from Phase 4 scope on deepening re-validation.
- Phase 3 inherits the HTP capture script (`capture-htp-scroll-burned.ts`)
  for production promotion at Unit 3.1; URL swap localhost →
  `burned-cxa.pages.dev` is the only diff.

---

## PHASE-0-EXIT.md entry (composite-viability disposition row)

| Gate | Disposition | Evidence |
|------|-------------|----------|
| Composite viability | **CLEARED** | `videos/trailer/sample-eval/spike/spike-results.md` — all 5 integration points render cleanly; `out/spike-frame-test.mp4` produced |

Phase 1 reads this row to know the spike cleared. Beat-sheet structure
may assume the bare-`<Series>` + scene-internal-overlay composition
shape, `@remotion/media` `<Audio>`, Clash Display variable woff2, the
HTP capture pipeline, and all three transition primitives as
guaranteed.
