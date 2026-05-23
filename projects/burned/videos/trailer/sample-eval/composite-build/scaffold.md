# Composition Scaffold Verification — Phase 4 Unit 4.1

**Date:** 2026-05-22
**Plan:** `docs/plans/origin-trailer/phase-4-remotion-composite.md` §Unit 4.1
**Status:** ✅ Scaffold renderable; carry-forward gate satisfied

---

## Compositions registered

Verified by rendering each via `pnpm exec remotion still …` against the Phase 4
master + the seven Preview compositions. Composition IDs use camelCase
(matches existing `SpikeColdOpenCandidate4` precedent) — Remotion 4.0.438
rejects underscores in IDs (`isCompositionIdValid` regex `/^[a-zA-Z0-9-]+$/`,
caught at the first still-render attempt; plan body's `Preview_S0N_…` form
was illegal). Recorded as a Phase 4 lesson; the plan body's enumeration
matches insight #061 (plan enumerations decay; verify against the runtime
validator at execution time).

| ID                              | Component               | durationInFrames        | Seconds  |
|---|---|---|---|
| `BurnedTrailer`                 | `TrailerComposition`    | `TOTAL_FRAMES` = 3180   | 106.0 s  |
| `PreviewS01ColdOpen`            | `S01_ColdOpen`          | `S01_END - S01_START` = 210 | 7.0 s   |
| `PreviewS02BriefingSetup`       | `S02_BriefingSetup`     | `S02_END - S02_START` = 360 | 12.0 s  |
| `PreviewS03MissionBackground`   | `S03_MissionBackground` | `S03_END - S03_START` = 810 | 27.0 s  |
| `PreviewS04ReceiptsCascade`     | `S04_ReceiptsCascade`   | `S04_END - S04_START` = 990 | 33.0 s  |
| `PreviewS05GameplayDissolve`    | `S05_GameplayDissolve`  | `S05_END - S05_START` = 540 | 18.0 s  |
| `PreviewS06ClosingDirective`    | `S06_ClosingDirective`  | `S06_END - S06_START` = 270 | 9.0 s   |
| `PreviewS04Peak`                | `S04_ReceiptsCascade`   | `S04_PEAK_END - S04_PEAK_START` = 390 | 13.0 s |
| `SpikeFrameTest` *(preserved)*  | `SpikeCompositionMain`  | `SPIKE_TOTAL_FRAMES`    | (Phase 0) |
| `SpikeColdOpenCandidate4` *(preserved)* | `SpikeColdOpenCandidate4` | `SPIKE_COLD_OPEN_TOTAL_FRAMES` | (Phase 0) |
| `SpikeColdOpenCandidate5` *(preserved)* | `SpikeColdOpenCandidate5` | `SPIKE_COLD_OPEN_TOTAL_FRAMES` | (Phase 0) |

Scene-duration arithmetic vs `TOTAL_FRAMES`: 210 + 360 + 810 + 990 + 540 + 270
= 3180. Asserted in `timing.test.ts`; durations derived from `timing.ts`,
not transcribed from the plan body (plan body still references the pre-Tier-4
2850-frame budget per insight #061).

`Preview_S04Peak` registers with `defaultProps={{ scenePreviewStartFrame:
S04_PEAK_START }}`. Skeletal S04 accepts the prop but does NOT honor it
yet (renders its own first 390 frames); Unit 4.5 wires the offset rendering.

## Architecture verifications

- ✅ Bare `<Series>` + 6 `<Series.Sequence>` per ADR #11 revised — no
  `<TransitionSeries>`. Scene boundaries are hard cuts; transitions are
  scene-internal overlays (deferred to Units 4.2–4.7).
- ✅ Composition-level audio timeline per ADR #16. `AUDIO_ASSETS.map` mounts
  16 cues at composition level via `<Sequence>` wrappers; scene files are
  pure visual.
- ✅ `<Audio>` from `@remotion/media`, NOT `'remotion'` core. ADR #17 ESLint
  guard installed at `eslint.config.js` (`no-restricted-imports` scoped to
  `videos/trailer/src/**/*.{ts,tsx}`).
- ✅ `<MusicBed />` spans full runtime with a 15-anchor volume envelope.
  Anchors re-derived from the Phase 1 Unit 1.7 authoring + a uniform +330
  shift at and after the new S04_START (= 1380) per Unit 2.7 Tier-4 expansion.
  Envelope shape relative to scene events preserved.
- ✅ Token shim at `src/lib/tokens.css` cloned from BURNED's
  `src/client/shared/tokens/primitives.css` (Option C fork — fixed-value
  shim; isolated-package architecture preserved per ADR #2).
- ✅ `useFonts()` resolved Phase 0 Unit 0.5 carry-forward — production
  shape unchanged; three variable woff2 calls (Clash Display / General
  Sans / JetBrains Mono).

## Font-validation carry-forward gate

Unit 4.0 (font-load spike) DROPPED — Phase 0 Unit 0.5 already validated
variable-axis weight resolution (per insight #066). The deepening pass's
carry-forward: first composite render must visually validate all 3
families × non-default weights.

**Evidence:** `out/scaffold-s01-font-validation.png` (rendered 2026-05-22
via `pnpm exec remotion still src/index.ts PreviewS01ColdOpen
out/scaffold-s01-font-validation.png --frame 0`). The S01 scene mounts
a 3×3 panel showing Clash Display, General Sans, and JetBrains Mono each
rendered at weights 300 / 500 / 700. Visual inspection: variable axis
resolves at distinct stroke weights for every cell. Phase 0's claim that
`weight: '200 700'` syntax works in MP4 export carries through to Unit
4.1's first composite render. ✅

## Phase 2 staticPath discipline correction (Phase 4 Unit 4.1 carry-back)

While re-rendering the master at frame 1500 to verify the audio map mounts,
caught a Phase 2 → Phase 3 ADR #15 mismatch:

- `cueStaticPath()` emitted `audio/lines/<file>` (broken — resolves through
  `setPublicDir('../../public')` to a non-existent `<BURNED-root>/public/
  audio/lines/<file>`).
- TTS WAVs lived at `videos/trailer/public/audio/lines/` (a tree the trailer's
  publicDir does NOT serve).
- Result: Remotion 404'd on every VO cue at master-composition mount.
- Phase 3.5's music bed correctly followed ADR #15 (`trailer/audio/...`);
  Phase 2 didn't. The visual-manifest's forward drift gate would have caught
  this for visuals but no equivalent test existed for audio.

**Fix (single commit with Unit 4.1):**
1. `scripts/lib/cue-filename.ts`: `cueStaticPath` now emits
   `trailer/audio/lines/<file>` per ADR #15.
2. Six script `WAV_DIR` / `OUT_DIR` / `LINES_DIR` constants moved from
   `TRAILER_ROOT/public/audio/lines` to `TRAILER_ROOT/../../public/trailer/
   audio/lines` (BURNED-root canonical location).
3. Moved 16 `.wav` + 16 `.processed` sidecars + 16 raw WAVs + 16 SHA256
   `.meta` sidecars from `videos/trailer/public/audio/lines/` to
   `<BURNED>/public/trailer/audio/lines/`. Trailer-local `public/audio/`
   dir removed (empty post-move).
4. Regenerated `src/lib/audio-manifest.ts` (16 entries, all
   `staticPath: trailer/audio/lines/<file>`).
5. Root `.gitignore` adds `public/trailer/audio/lines/` (TTS WAVs stay
   gitignored at the new location).
6. NEW `src/lib/audio-manifest.test.ts` mirrors `visual-manifest.test.ts`
   forward drift gate: every entry resolves to a real file, every prefix
   is `trailer/audio/lines/`. 4 new assertions; this is the regression
   net that prevents this class of bug from recurring silently.
7. `visual-manifest.test.ts` `EXCLUDED_TRAILER_DIRS` adds
   `trailer/audio/lines` (owned by audio-manifest, not visual-manifest).

**Verification:** `pnpm exec remotion still src/index.ts BurnedTrailer
out/scaffold-master-frame-1500.png --frame 1500` — produced 0 audio 404s
(prior run produced 1+ per VO cue overlapping the rendered frame). S04
scaffold renders at scene-relative frame 120, confirming the bare
`<Series>` boundary math at the absolute → scene-relative transform.

## Test surface

- `pnpm typecheck` (root + trailer): clean.
- `pnpm test` (trailer): **219 passed (+4 over 215 baseline)**, 11 files,
  zero expected-fail. New tests in `audio-manifest.test.ts` close the
  Phase 2 path-discipline gap.

## Outstanding (carry-forward into Unit 4.2+)

- Skeletal scenes (S01–S06) ship per-scene scaffold visuals. Each unit
  4.2–4.7 replaces the scaffold with real content, repurposing the
  `ScaffoldSceneFrame` helper or deleting it when no consumer remains.
- `S04_ReceiptsCascade` ignores `scenePreviewStartFrame` prop (skeletal).
  Unit 4.5 wires the offset rendering pattern.
- Master render at full runtime + H264 encode is Unit 4.10 territory,
  not Unit 4.1.
