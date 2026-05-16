---
title: "Origin Trailer — Phase 6: Final Render + QA"
type: feat
phase: 6
parent: docs/plans/origin-trailer/roadmap.md
origin: docs/ideation/2026-05-15-origin-trailer-brainstorm.md
created: 2026-05-16
deepened: pending
reviewed: pending
status: active
---

# Phase 6 — Final Render + QA

## Overview

Phase 6 produces `videos/trailer/out/trailer.mp4` — the production-
grade deliverable — and runs the full QA pass against §2 Quality Bar,
bar-raise criteria (vs UMB v3), audio-video sync, R13 acceptance,
mobile-crop discipline, and engineering-peer decode of agentic-SDLC
origin (R14 + R15 combined). The output is the FINAL artifact passed
to Phase 7 for distribution.

Phase 6 produces:

- `videos/trailer/out/trailer.mp4` — final H.264 1920×1080 30fps
  trailer, CRF 18, ~95 seconds
- `videos/trailer/out/thumbnail.png` — single frame still for
  portfolio + X video preview thumbnail
- `videos/trailer/sample-eval/final-render-qa/qa-report.md` —
  comprehensive QA pass results
- `videos/trailer/sample-eval/final-render-qa/bar-raise-eval.md` —
  3-axis bar-raise evaluation vs UMB v3
- `videos/trailer/sample-eval/final-render-qa/decode-test.md` —
  no-context-engineering-peer agentic-SDLC decode verification
- `videos/trailer/sample-eval/final-render-qa/mobile-crop-audit.md` —
  X mobile 1.91:1 in-feed preview crop audit

Phase 6 exits when:
1. Final MP4 renders cleanly at expected dimensions / duration /
   format.
2. All QA passes (§2 frame-pass rate ≥ 8/10, bar-raise ≥ 1 of 3
   axes cleared, R13 acceptance, mobile-crop safe).
3. Decode test passes (≥1 of 2 engineering-peer testers surfaces
   "AI / agent / autonomous / built itself" unprompted).
4. Briggsy signs off on the final deliverable for Phase 7
   distribution.

---

## Problem Frame

Phase 4 produced `out/trailer-preview.mp4` at studio-preview quality
+ per-scene Archer-tested. Phase 5 swapped in real gameplay. Phase 6
takes the integrated composition + raises every quality dial to
production grade + runs the comprehensive QA pass.

What makes Phase 6 distinct from Phase 4 Unit 4.10:

- **Encoding settings tuned for distribution**, not iteration speed.
  Phase 4 used CRF 18 default; Phase 6 may tune CRF, preset, profile,
  pixel format, bitrate cap based on file-size + visual-quality
  trade-off for X / portfolio.
- **Comprehensive QA**, not per-scene §2. Phase 4 tested scenes in
  isolation; Phase 6 tests the integrated runtime end-to-end with
  cross-cutting criteria (audio-video sync, bar-raise axes, decode
  test).
- **Bar-raise evaluation** — the trailer's central engineering
  claim. Per brainstorm Success Criteria + roadmap §9, the trailer
  must clear UMB v3 on ≥1 of 3 sampled axes (named-operative density,
  §2 frame-pass rate, stacked-payoff moment). Phase 6 runs this
  evaluation.
- **No-context decode test** — does an engineering-peer viewer who
  hasn't seen UMB v3 decode "agentic-SDLC / AI / autonomous" from
  R14 + R15 working together? Per brainstorm Success Criteria + Phase
  0 Unit 0.3 cold-open decode-gate, this is the trailer's load-
  bearing signaling pass.
- **Mobile-crop discipline audit** — does the trailer survive X's
  1.91:1 in-feed preview crop on mobile? Per roadmap §5.3, critical
  text must live within central 1:1 safe square.

The risk Phase 6 manages: **a trailer that passes per-scene §2 tests
individually but fails as a whole**. A scene can pass §2 in isolation
yet the trailer can fail the integrated decode test or the bar-raise
test or the audio-sync test. Phase 6 catches these integration-level
failure modes.

The largest unknown at Phase 6 entry: **whether the bar-raise vs UMB
v3 holds**. Phase 4 + Phase 5 work assumed it would; Phase 6 evaluates.
If bar-raise fails on all 3 axes, the trailer doesn't clear roadmap §9
Success Criteria — Phase 6 routes back to Phase 4 for targeted
iterations (e.g., add named-operative density via cascade halo
adjustment; tune frame composition for §2 pass-rate; sharpen R3
stacked payoff land).

---

## Critical Constraints Surfaced by Research

Cross-reference: roadmap §5, Success Criteria, Phase 4 Unit 4.10.

### Production encoding settings

Per Phase 0 ADR (`pnpm render` invocation): H.264 / CRF 18 / 1920×1080
/ 30fps. Phase 6 may refine:

| Setting | Phase 4 preview | Phase 6 production target | Rationale |
|---------|-----------------|---------------------------|-----------|
| Codec | libx264 | libx264 (High profile) | X distribution spec |
| CRF | 18 | 17 (slightly higher quality) | Smaller absolute step; allowed by X 8 Mbps cap at 1080p |
| Preset | medium (default) | slow | Higher quality at same CRF |
| Pixel format | yuv420p | yuv420p | X compatibility |
| Audio codec | aac (Remotion default) | aac, 128 kbps | X audio spec (AAC-LC 128 kbps) |
| Container | mp4 | mp4 | Trivially compatible |
| Movflags | faststart (default) | faststart | Streaming-friendly |

**Lock**: CRF 17, preset slow. Final file size estimate: ~150–250 MB
for 95s @ 1080p — well under X's 512 MB non-premium cap.

### Bar-raise sampling protocol (10 frames every ~10s)

Per brainstorm Success Criteria + roadmap §9:

> Sampling protocol: 10 frames sampled at fixed timecodes (every
> ~10s) from each trailer.
>
> 1. **Named-operative density** — average count of named Pendleton
>    operatives visible per sampled frame (silhouette, portrait,
>    dossier photo, illustration panel).
> 2. **§2 frame-pass rate** — across the 10 sampled frames, how many
>    independently pass §2 Quality Bar on a fixed yes/no rubric
>    (composition, palette discipline, typographic discipline).
>    Threshold: ≥8 of 10.
> 3. **Stacked-payoff moment** — does the trailer have a single beat
>    where visual + audio reveal land simultaneously? Binary yes/no.

Sample timecodes for BURNED (95s total):
- Frame 285  (9.5s, S02 mid-briefing)
- Frame 570  (19s, S02→S03 boundary)
- Frame 855  (28.5s, S03 mid-mission)
- Frame 1140 (38s, S04 cascade open)
- Frame 1425 (47.5s, S04 stat 2 + halo)
- Frame 1710 (57s, S04 halo + ticker)
- Frame 1950 (65s, S04 stacked payoff) ★
- Frame 2235 (74.5s, S05 mid-gameplay)
- Frame 2520 (84s, S05 iris-wipe area)
- Frame 2790 (93s, S06 BURNED logo land)

10 fixed frames; each evaluated against §2 (yes/no) + named-operative
count.

UMB v3 sampling baseline (4440 frames @ 30fps = 148s):
- Frame 444  (14.8s)
- Frame 888  (29.6s)
- Frame 1332 (44.4s)
- Frame 1776 (59.2s)
- Frame 2220 (74.0s)
- Frame 2664 (88.8s)
- Frame 3108 (103.6s)
- Frame 3552 (118.4s)
- Frame 3996 (133.2s)
- Frame 4440 (148.0s — last frame)

UMB v3 sample frame extraction + scoring needed AS PART of Phase 6
evaluation. Stored in `bar-raise-eval.md`.

### Decode test protocol (per Phase 0 Unit 0.3, applied to full trailer)

Per Phase 0 Unit 0.3 + brainstorm R14-decode-gate:

> Voice the chosen cold-open line via TTS placeholder and play the
> 5-second clip cold (no context, no setup) to ≥2 engineering-peer
> testers who have NOT seen UMB v3. Open question: "what do you
> think this trailer is about?"
>
> Acceptance: at least one of two testers surfaces "AI / agent /
> autonomous / built itself" unprompted within their first 30
> seconds of reaction.

Phase 0 Unit 0.3 tested the 5-second cold-open spike. Phase 6 tests
the FULL 95-second trailer. Acceptance threshold inherited: ≥1 of 2
testers surfaces the decode unprompted.

If Phase 6 decode test fails despite Phase 0 spike passing, the
failure mode is likely:
- R14 cold-open works in isolation but R15 chrome layer (R15 #1, #2,
  #3, #4) doesn't reinforce enough — surface more visible chrome OR
  rewrite cold-open line for stronger autonomy signal.
- The middle of the trailer (S02–S05) buries the autonomy hook under
  in-world vocabulary — possibly add more R15 instances or sharpen
  Dash VO phrasing.

### X / Twitter video distribution specs (per roadmap §5.4)

Phase 6 ensures the final MP4 meets X's 2026 specs:
- Format: MP4 / MOV (chose MP4)
- Codec: H.264 High profile (locked)
- Audio: AAC-LC 128 kbps
- Recommended: 30 fps (locked at 30)
- Bitrate cap: 5–8 Mbps VBR for 1080p (don't overshoot — X re-encodes)
- Non-premium cap: 2:20 length / 512 MB file
- BURNED: 95s, target ~150–250 MB → well under cap

### Mobile-crop discipline (1:1 safe square within 16:9)

Per roadmap §5.3: X serves a **1.91:1 in-feed preview crop on
mobile**. Phase 6 verifies critical narrative elements live within
the central 1080×1080 safe square of the 1920×1080 frame.

Sampled audit at the same 10 timecodes as bar-raise sampling. Per
frame: critical-element-in-safe-square? yes/no.

### `execFileSync` argv arrays

Project security convention. All FFmpeg / FFprobe invocations in
Phase 6 scripts use the safe pattern.

---

## Requirements Trace

- All requirements R1–R15 come together at Phase 6. Per-unit trace:
  - **R1, R6** (briefing-room spine + vocab): Unit 6.3 (§2 audit
    includes vocab check on captions).
  - **R2** (deadpan): Unit 6.4 (decoded as part of "could it be
    Archer" §2 dimension).
  - **R3** (stacked-payoff): Unit 6.4 (bar-raise axis 3 binary
    yes/no).
  - **R4, R5, R14** (voice): Unit 6.5 (audio-video sync across full
    runtime).
  - **R7** (90–100s runtime): Unit 6.2 (final render duration audit).
  - **R8** (16:9 + mobile-safe): Unit 6.6 (mobile-crop audit).
  - **R9** (music bed): Unit 6.5 (audio mix verification).
  - **R10, R11, R12** (cascade content): Unit 6.3 + Unit 6.4 (§2
    + named-operative density at S04 sample frames).
  - **R13** (gameplay closer): Unit 6.3 + Unit 6.5 (S05 sample + sync).
  - **R14 + R15** (decode mechanism): Unit 6.7 (decode test).

---

## Key Technical Decisions

- **Production encode**: H.264 / CRF 17 / preset slow / yuv420p /
  AAC 128 kbps / faststart. Tuned from Phase 4 preview defaults.
- **Sampling protocol**: 10 frames at fixed timecodes (Phase 6 Step 1
  list) for both BURNED and UMB v3 comparison. Same protocol both
  trailers.
- **Decode test panel**: 2 engineering-peer testers minimum, neither
  having seen UMB v3 (Phase 0 Unit 0.3 protocol inherited).
  Threshold: ≥1 of 2 surfaces "AI / agent / autonomous / built
  itself" unprompted.
- **Mobile-crop audit**: same 10 sampling frames; per-frame check
  for critical-element-in-safe-square.
- **Bar-raise pass criterion**: at least 1 of 3 axes clears
  (brainstorm "relative advance on at least one of these axes").
- **§2 frame-pass rate threshold**: ≥8 of 10 sampled frames (per
  brainstorm Success Criteria).
- **Failure-route options**: per-failure mode, Phase 6 documents
  whether to (a) iterate within Phase 6 (tune encoding settings,
  recompose marginal scenes), (b) reopen Phase 4 (composition
  iteration), or (c) reopen Phase 1 (structural change).
- **`execFileSync` argv arrays** for all FFmpeg / FFprobe shell-outs.

---

## Implementation Units

### Unit 6.1 — Production Render Settings Finalization

- [ ] **Unit 6.1: Production Render Settings Finalization**

**Goal:** Lock the encoding settings for the final render. Tune from
Phase 4's CRF 18 defaults to Phase 6's production-grade. Validate
file size + visual quality + X distribution compatibility.

**Requirements:** R8 (16:9 1920×1080), inherited Phase 0 ADRs.

**Dependencies:** Phase 4 trailer-preview.mp4 + Phase 5 real-gameplay
re-render.

**Files:**

- Edit: `videos/trailer/package.json` — `render` script updated with
  production settings.
- Edit: `videos/trailer/remotion.config.ts` — encoding parameters
  if any live there.
- Create: `videos/trailer/sample-eval/final-render-qa/encoding-settings.md`

**Approach:**

**Step 1 — Settings table.**

| Parameter | Phase 4 default | Phase 6 lock | Notes |
|-----------|----------------|--------------|-------|
| Codec | libx264 | libx264 | H.264 |
| H.264 profile | (default) | high | X spec |
| CRF | 18 | 17 | One step quality up |
| Preset | medium | slow | Better compression at same CRF |
| Pixel format | yuv420p | yuv420p | X compatibility |
| Resolution | 1920×1080 | 1920×1080 | locked |
| Frame rate | 30 | 30 | locked |
| Audio codec | aac (Remotion default) | aac | locked |
| Audio bitrate | (default) | 128k | X spec |
| Movflags | (default) | +faststart | streaming-friendly |
| Bitrate cap | (none) | (none — let CRF determine) | If file > 300 MB, add maxrate=8M / bufsize=16M |

**Step 2 — Render script updated.**

```jsonc
// videos/trailer/package.json scripts
{
  "scripts": {
    "render": "remotion render src/index.ts BurnedTrailer out/trailer.mp4 --codec h264 --crf 17 --preset slow --pixel-format yuv420p --audio-codec aac --audio-bitrate 128k",
    "render:preview": "remotion render src/index.ts BurnedTrailer out/trailer-preview.mp4 --codec h264 --crf 18",
    "render:thumbnail": "remotion still src/index.ts BurnedTrailer out/thumbnail.png --frame 1950"
  }
}
```

(`render:thumbnail` produces a still from frame 1950 — the stacked-
payoff stamp. The most representative single-frame of the trailer.
X video upload uses this as the in-feed thumbnail.)

Verify these flags map to actual Remotion CLI flags by reading
Remotion docs at https://www.remotion.dev/docs/cli/render. Adapt as
needed.

**Step 3 — Verify settings application.**

Run a short test render (2–5 second sub-composition) with the new
settings; FFprobe the output:

```bash
ffprobe -v error -show_streams out/test-encode.mp4
```

Verify:
- `codec_name=h264`
- `profile=High`
- `pix_fmt=yuv420p`
- `audio codec_name=aac`
- `audio bit_rate≈128000`

**Step 4 — Document settings.**

`encoding-settings.md`:
```md
# Production Encoding Settings — Phase 6 Unit 6.1

## Locked settings
- Video codec: libx264 (H.264 High profile)
- CRF: 17
- Preset: slow
- Pixel format: yuv420p
- Resolution: 1920×1080
- Frame rate: 30 fps
- Audio codec: AAC-LC
- Audio bitrate: 128 kbps
- Container: MP4 with +faststart

## Estimated outputs
- File size: ~150–250 MB for 95s
- Bitrate (avg): ~12–22 Mbps (X re-encodes; not a problem)
- Within X non-premium cap: 95s ≤ 140s ✓ ; <512 MB ✓

## Verification commands
- ffprobe -v error -show_streams out/trailer.mp4
```

**Patterns to follow:**

- Phase 0 ADR `render` script structure.
- Remotion CLI docs (verify flag names).

**Test scenarios:**

- **Happy path:** Test render produces MP4 with all expected
  stream properties via FFprobe.
- **Edge case:** If `--preset slow` isn't a valid Remotion CLI flag,
  passed via `--codec-options` or fork mechanism — verify against
  current Remotion 4.0.438 docs.
- **Edge case:** File size at full render >300 MB → add bitrate cap
  via `maxrate=8M:bufsize=16M`.

**Verification:**

- `package.json` render script updated.
- Test render verifies settings application.
- `encoding-settings.md` documents lock.

---

### Unit 6.2 — Full Production Render

- [ ] **Unit 6.2: Full Production Render**

**Goal:** Run the full production render. Output:
`out/trailer.mp4`. Verify duration, dimensions, codec, audio,
playability.

**Requirements:** R7 (90–100s, must land 95s ±0.5s).

**Dependencies:** Unit 6.1 (settings locked), Phase 5 Unit 5.6
(gameplay.mp4 integrated).

**Files:**

- Create: `videos/trailer/out/trailer.mp4` — final.
- Create: `videos/trailer/out/thumbnail.png` — single frame still.
- Create: `videos/trailer/sample-eval/final-render-qa/render-log.md`

**Approach:**

**Step 1 — Run render.**

```bash
cd videos/trailer
pnpm render
```

Expected: 6–12 minutes render time (single-pass slow-preset H.264
1920×1080 30fps; per-frame ~80–160ms render time).

**Step 2 — FFprobe verification.**

```bash
# SAFE: execFileSync usage from a Node script if scripted; CLI by hand for one-off
ffprobe -v error -show_format -show_streams out/trailer.mp4 -of json > out/trailer-probe.json
```

Verify in `trailer-probe.json`:
- `format.duration` ≈ 95.0 ± 0.05s
- `format.bit_rate` ≈ 12–22 Mbps
- `format.size` ≈ 150–250 MB
- video stream: `codec_name=h264`, `profile=High`, `width=1920`,
  `height=1080`, `r_frame_rate=30/1`, `pix_fmt=yuv420p`
- audio stream: `codec_name=aac`, `bit_rate≈128000`, `sample_rate=48000`

**Step 3 — Thumbnail render.**

```bash
pnpm render:thumbnail
```

Output: `out/thumbnail.png` from frame 1950 (the stacked-payoff
moment). Single representative still.

If frame 1950 doesn't render well as a thumbnail (e.g., mid-
animation state with intermediate opacity), fall back to alternative
frames:
- Frame 180 (BURNED logo land in S01)
- Frame 1860 (cascade peak before stamp land)
- Frame 2790 (BURNED logo + R15 #4 land in S06)

**Step 4 — Playback verification.**

Open `out/trailer.mp4` in:
- macOS QuickTime / Windows Media Player (native player)
- VLC (codec compatibility check)
- Chrome / Edge (browser HTML5 video — important for X distribution
  preview)

Each must play end-to-end without errors.

**Step 5 — Document render.**

```md
# Production Render — Phase 6 Unit 6.2

## Render
- Date: <YYYY-MM-DD>
- Time: <N> minutes
- File: out/trailer.mp4

## FFprobe verification
- Duration: <measured>s (target 95.0s, drift <%>)
- File size: <N> MB
- Average bitrate: <N> Mbps
- Video codec: h264 / High / yuv420p
- Resolution: 1920×1080 / 30fps
- Audio codec: AAC-LC / 128 kbps / 48 kHz

## Thumbnail
- out/thumbnail.png from frame 1950
- Visual content: stacked-payoff stamp + HTP hero + halo

## Playback verification
- [ ] QuickTime / VLC: plays end-to-end
- [ ] Chrome HTML5 video: plays end-to-end
- [ ] No decode errors / frame drops
```

**Patterns to follow:**

- Phase 4 Unit 4.10 render verification.
- `feedback-verify-before-presenting.md` — render-MP4 review.

**Test scenarios:**

- **Happy path:** Render completes; FFprobe verifies all spec
  expectations; playback clean in all 3 players.
- **Edge case:** Duration drift >0.05s → Phase 2 Unit 2.7
  reconciliation reopen.
- **Edge case:** File size >300 MB → add bitrate cap via maxrate.
- **Edge case:** Playback fails in one player but not others → codec
  compatibility issue; check pix_fmt + profile.

**Verification:**

- `out/trailer.mp4` exists at expected specs.
- `out/thumbnail.png` exists.
- `render-log.md` documents results.

---

### Unit 6.3 — §2 Frame-Pass Rate Sampling Audit

- [ ] **Unit 6.3: §2 Frame-Pass Rate Sampling Audit**

**Goal:** Sample 10 frames at fixed timecodes from
`out/trailer.mp4`; evaluate each against §2 Quality Bar; compute
pass rate. Threshold ≥8/10 (per brainstorm Success Criteria).

**Requirements:** §2 Quality Bar (PRODUCT-SPECIFICATION.md), Success
Criteria bar-raise axis 2.

**Dependencies:** Unit 6.2 (trailer.mp4 exists).

**Files:**

- Create: `videos/trailer/sample-eval/final-render-qa/sample-frames/frame-{N}.png`
  — extracted frames per sample timecode.
- Create: `videos/trailer/scripts/extract-sample-frames.ts` — frame
  extraction helper.
- Create: `videos/trailer/sample-eval/final-render-qa/s2-frame-audit.md`

**Approach:**

**Step 1 — Frame extraction.**

```ts
// videos/trailer/scripts/extract-sample-frames.ts
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';

const SAMPLE_FRAMES = [285, 570, 855, 1140, 1425, 1710, 1950, 2235, 2520, 2790];
const FPS = 30;
const INPUT = 'videos/trailer/out/trailer.mp4';
const OUT_DIR = 'videos/trailer/sample-eval/final-render-qa/sample-frames';

if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

for (const frame of SAMPLE_FRAMES) {
  const seconds = frame / FPS;
  const out = `${OUT_DIR}/frame-${frame.toString().padStart(4, '0')}.png`;
  // SAFE: argv array
  execFileSync('ffmpeg', [
    '-y',
    '-ss', String(seconds.toFixed(3)),
    '-i', INPUT,
    '-frames:v', '1',
    '-q:v', '2',
    out,
  ]);
  console.log(`Extracted frame ${frame} (${seconds.toFixed(2)}s) → ${out}`);
}
```

Outputs 10 PNG files in `sample-frames/`.

**Step 2 — Per-frame §2 evaluation rubric.**

For each frame, evaluate against three §2 sub-dimensions:

| Dimension | Yes / No |
|-----------|----------|
| **Composition** | Does the frame have a clear hero element + supporting layers? Not too busy? Not too empty? |
| **Palette** | BURNED's locked palette (cream, ochre, mahogany, teal, burn-fire)? No off-palette colors? |
| **Typography** | Clash Display + General Sans + JetBrains Mono only? No system-ui fallback? |

A frame PASSES §2 if all 3 dimensions yes. FAILS if any dimension no.

**Step 3 — Per-frame audit table.**

```md
| Frame | Timecode | Scene | Composition | Palette | Typography | §2 Verdict | Notes |
|-------|----------|-------|-------------|---------|------------|-----------|-------|
| 285   | 9.5s     | S02   | ✓           | ✓       | ✓          | PASS      | Briefing-room mid; dossier opening |
| 570   | 19.0s    | S02→S03| ✓          | ✓       | ✓          | PASS      | Boundary clean |
| 855   | 28.5s    | S03   | ✓           | ✓       | ✓          | PASS      | Operative roster reveal |
| 1140  | 38.0s    | S04   | ?           | ✓       | ✓          | <verdict> | Cascade opening |
| 1425  | 47.5s    | S04   | ?           | ✓       | ✓          | <verdict> | Stat 2 + halo expanding |
| 1710  | 57.0s    | S04   | ?           | ✓       | ✓          | <verdict> | Halo + ticker |
| 1950  | 65.0s    | S04   | ★ critical  | ✓       | ✓          | ★ MUST PASS | Stacked payoff — load-bearing |
| 2235  | 74.5s    | S05   | ?           | ?       | (n/a — game) | <verdict> | Gameplay mid; capture palette varies |
| 2520  | 84.0s    | S05   | ?           | ?       | (n/a)      | <verdict> | Iris-wipe area |
| 2790  | 93.0s    | S06   | ✓           | ✓       | ✓          | PASS      | BURNED logo + R15 #4 |
```

(Briggsy fills the `?` cells; the table is templated for Phase 6
execution.)

**Step 4 — Pass-rate computation.**

Pass count / 10. Threshold: ≥8.

- **8–10 passes:** §2 frame-pass rate clears.
- **7 or fewer:** §2 fails; route to Phase 6 iteration (recompose
  failing scene's marginal frames) OR Phase 4 reopen.

**Step 5 — Compare against UMB v3 baseline.**

Extract UMB v3 sample frames using the same script (modified for
UMB's `out/trailer-landscape.mp4` + UMB sample timecodes per roadmap
§9). Evaluate against the SAME §2 rubric. Record UMB pass rate.

BURNED bar-raise: BURNED pass rate > UMB pass rate (preferred but
not required for bar-raise axis 2 — see Unit 6.4).

**Step 6 — Audit documentation.**

`s2-frame-audit.md` records the per-frame table + pass rate + UMB
comparison.

**Patterns to follow:**

- `docs/PRODUCT-SPECIFICATION.md` §2.
- Phase 4 Unit 4.10 §2 sweep pattern (extended to dedicated
  sampling here).

**Test scenarios:**

- **Happy path:** ≥8/10 frames pass §2.
- **Edge case:** Frame 1950 (load-bearing) fails → MUST iterate
  before Phase 6 exits.
- **Edge case:** Multiple gameplay-scene frames fail palette
  (gameplay capture has different palette than briefing scenes) →
  acceptable; gameplay reads as REAL game which IS Archer set-
  dressing for the closer. Mark "palette-n/a-game" verdict.

**Verification:**

- 10 frame PNGs extracted.
- `s2-frame-audit.md` populated with per-frame verdict.
- Pass rate computed; threshold check verified.

---

### Unit 6.4 — Bar-Raise Evaluation vs UMB v3

- [ ] **Unit 6.4: Bar-Raise Evaluation vs UMB v3**

**Goal:** Evaluate BURNED trailer vs UMB v3 on the 3 bar-raise axes.
Threshold: ≥1 of 3 axes clears (BURNED ≥ UMB).

**Requirements:** Success Criteria + roadmap §9.

**Dependencies:** Unit 6.3 (BURNED §2 + named-operative density per
sampled frame).

**Files:**

- Create: `videos/trailer/sample-eval/final-render-qa/bar-raise-eval.md`
- Create: `videos/trailer/sample-eval/final-render-qa/umb-samples/frame-{N}.png`
  — UMB v3 reference frames extracted.

**Approach:**

**Step 1 — Extract UMB v3 sample frames.**

Adapt Unit 6.3's extraction script to UMB v3's `trailer-landscape.mp4`
+ UMB sample timecodes (per roadmap §9 list: 444, 888, 1332, 1776,
2220, 2664, 3108, 3552, 3996, 4440).

Output: `videos/trailer/sample-eval/final-render-qa/umb-samples/frame-{NNNN}.png`
× 10.

**Step 2 — Axis 1: Named-operative density.**

For each of 10 BURNED sampled frames + 10 UMB sampled frames, count
the named operatives visible (silhouette, portrait, dossier photo,
illustration panel).

- BURNED operatives counted: Dash, Vera, Otto, Janet, Neal, Sable,
  Agent X, Dolores Grieves (7 active + 1 NPC).
- UMB operatives counted: Charon + named UMB mob-boss characters
  (verify UMB roster per `projects/undercover-mob-boss/`).

Compute averages:
```
BURNED avg operatives/frame = (sum of operative counts) / 10
UMB avg operatives/frame    = (sum of operative counts) / 10
```

Threshold: BURNED avg > UMB avg → axis 1 clears.

Expected: BURNED S03 roster reveal alone has 7 operatives visible
at frame 855. S04 cascade halo has up to 17 cards (8 of which are
operatives by curation). BURNED likely clears axis 1.

**Step 3 — Axis 2: §2 frame-pass rate.**

Per Unit 6.3 BURNED pass rate. UMB v3 pass rate per same §2 rubric
applied to UMB samples.

Threshold: BURNED pass rate > UMB pass rate → axis 2 clears.

Expected: BURNED's tighter visual lock (per-frame Archer test)
likely clears axis 2.

**Step 4 — Axis 3: Stacked-payoff moment.**

Binary yes/no per trailer:
- Does the trailer have a single beat where visual + audio reveal
  land simultaneously?

BURNED: yes (R3 stacked payoff at frame 1950 — stamp slap + Dash VO
"They WERE the operation." landing simultaneously).
UMB v3: no (UMB Charon narration is continuous, no stacked-payoff
beat by design).

Threshold: BURNED yes + UMB no → axis 3 clears.

Expected: BURNED clears axis 3 by definition.

**Step 5 — Bar-raise verdict.**

Bar-raise passes IFF ≥1 of 3 axes clears.

Expected outcome: BURNED clears at least axis 3 (stacked-payoff
moment); likely clears axes 1 and 2 also. Strong bar-raise pass.

**Step 6 — Documentation.**

```md
# Bar-Raise Evaluation vs UMB v3 — Phase 6 Unit 6.4

## Axis 1 — Named-operative density
- BURNED avg: <N> operatives per sampled frame
- UMB v3 avg: <N> operatives per sampled frame
- Verdict: CLEARS / TIES / DOES NOT CLEAR

## Axis 2 — §2 frame-pass rate
- BURNED: <N>/10
- UMB v3: <N>/10
- Verdict: CLEARS / TIES / DOES NOT CLEAR

## Axis 3 — Stacked-payoff moment
- BURNED: <YES — R3 stacked payoff at frame 1950>
- UMB v3: <NO — continuous noir narration>
- Verdict: CLEARS

## Overall bar-raise
- Axes cleared: <N> of 3
- Threshold: ≥1
- VERDICT: PASS / FAIL
```

**Patterns to follow:**

- Roadmap §9 acceptance protocol.
- Brainstorm Success Criteria.

**Test scenarios:**

- **Happy path:** BURNED clears all 3 axes; strong bar-raise.
- **Expected minimum:** BURNED clears axis 3 only (stacked-payoff
  moment which UMB doesn't have); still passes threshold.
- **Failure mode:** BURNED clears 0 of 3 → Phase 4 reopen + targeted
  iteration (e.g., add named-operative density via additional S03
  reveal frame OR cascade halo adjustment).

**Verification:**

- 10 UMB sample frames extracted + scored.
- 10 BURNED frames scored on operative density.
- `bar-raise-eval.md` documents 3-axis verdicts.
- Overall bar-raise pass / fail.

---

### Unit 6.5 — Audio-Video Sync Verification

- [ ] **Unit 6.5: Audio-Video Sync Verification**

**Goal:** Verify every Dash VO line + cold-open speaker line + scream
beat (if R5) + music-bed envelope syncs to the intended frame
timing. No audio drift across the 95-second runtime.

**Requirements:** R3 (stacked-payoff sync), R4 (Dash sync), R5
(scream sync), R9 (music envelope), R14 (cold-open sync).

**Dependencies:** Unit 6.2 (trailer.mp4 final render).

**Files:**

- Create: `videos/trailer/sample-eval/final-render-qa/av-sync.md`
- Create: `videos/trailer/scripts/audit-av-sync.ts` — automated
  audit script.

**Approach:**

**Step 1 — Per-cue audio-onset detection.**

For each cue in Phase 2 `audio-manifest.ts`, detect the audio onset
(energy threshold crossing) in the trailer's audio track. Compare
against the expected `startFrame`.

```ts
// videos/trailer/scripts/audit-av-sync.ts
import { execFileSync } from 'node:child_process';
import { AUDIO_ASSETS } from '../src/lib/audio-manifest';

const FPS = 30;
const TRAILER = 'videos/trailer/out/trailer.mp4';

// Use FFmpeg's `astats` or `silencedetect` filter to find non-silent regions
// SAFE: argv array
const out = execFileSync('ffmpeg', [
  '-i', TRAILER,
  '-af', 'silencedetect=noise=-40dB:duration=0.3',
  '-f', 'null',
  '-',
], { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
// silencedetect emits messages on stderr; parse for silence_start / silence_end markers
// Each gap between silence_end and next silence_start is a vocal cue.
console.log(out);
// ... parse + match against expected cue startFrames
```

**Step 2 — Drift table.**

| Cue | Expected frame | Detected frame | Drift (frames) | Verdict |
|-----|----------------|----------------|-----------------|---------|
| s01-cue-60-coldopen | 60 | <detected> | <±N> | OK if ≤3 |
| s02-cue-240-dash | 240 | <detected> | <±N> | OK if ≤3 |
| ... | ... | ... | ... | ... |
| s04-cue-1950-dash (stacked payoff) | 1950 | <detected> | <±N> | MUST be ≤2 |
| s06-cue-2790-dash (Phrasing) | 2790 | <detected> | <±N> | OK if ≤3 |

Tolerance: ±3 frames (100ms) standard cue; ±2 frames (66ms) for
stacked-payoff (R3 load-bearing).

**Step 3 — Stacked-payoff special verification.**

R3 acceptance requires visual stamp + audio reveal land
simultaneously at frame 1950. Phase 6 explicitly verifies:

- Extract frame 1950 from `trailer.mp4` (extracted in Unit 6.3 already)
- Verify stamp visible + at expected position (or settling — within
  1-2 frames of slap)
- Verify Dash audio for cue 1950 starts within ±2 frames

If R3 sync fails: regenerate Phase 2 cue 1950 with timing adjustment
OR Phase 4 adjust scene-internal `<Sequence from={N}>` placement.

**Step 4 — Music-bed envelope verification.**

Spot-check the music-bed volume at 5 sampled frames:
- Frame 60: intro hook → 100% ✓ if loud
- Frame 600: under-S03-build → 55% ✓ if mid
- Frame 1900: cascade peak → 90% ✓ if loud
- Frame 1995: post-payoff drop → 25% ✓ if quiet
- Frame 2790: final sting → 100% ✓ if loud

Confirm music swells + drops match Unit 1.7 Step 5 cue map.

**Step 5 — Documentation.**

```md
# Audio-Video Sync Verification — Phase 6 Unit 6.5

## Per-cue sync table
[per-cue table per Step 2]

## Stacked-payoff R3 verification
- Stamp visible at frame 1950: YES / NO
- Dash audio onset at frame 1950: <detected frame> (drift <±N>)
- R3 acceptance: PASS / FAIL

## Music-bed envelope spot-check
- Frame 60 intro: <level>%
- Frame 600 build: <level>%
- Frame 1900 peak: <level>%
- Frame 1995 drop: <level>%
- Frame 2790 sting: <level>%
- Envelope verdict: matches Unit 1.7 cue map / drifts

## Overall A/V sync verdict: PASS / ITERATE
```

**Patterns to follow:**

- FFmpeg silencedetect / astats for onset detection.
- `execFileSync` argv pattern.

**Test scenarios:**

- **Happy path:** All cues land within ±3 frames; R3 stacked payoff
  within ±2; music envelope matches.
- **Edge case:** Stacked-payoff drift ±3 frames → MUST iterate
  (Phase 4 or Phase 2 adjustment).
- **Edge case:** Music envelope flat (no swell) → Phase 4 Unit 4.1
  MusicBed interpolate envelope needs re-tuning.

**Verification:**

- `av-sync.md` documents per-cue drift + R3 + music envelope.
- All drift within tolerance OR documented + routed to fix.

---

### Unit 6.6 — Mobile Crop Audit

- [ ] **Unit 6.6: Mobile Crop Audit**

**Goal:** Verify critical narrative elements survive X's 1.91:1
in-feed preview crop on mobile. Each of 10 sample frames checked
for safe-square containment.

**Requirements:** R8 (16:9 + mobile-safe central square), roadmap §5.3.

**Dependencies:** Unit 6.3 (sample frames extracted).

**Files:**

- Create: `videos/trailer/sample-eval/final-render-qa/mobile-crop-audit.md`
- Create: `videos/trailer/sample-eval/final-render-qa/sample-frames-cropped/frame-{N}.png`
  — center-square crops for audit.

**Approach:**

**Step 1 — Generate center-square crops.**

X mobile in-feed crop is **1.91:1**, which at 1920 wide is
1920×1006. Within the 1920×1080 source, the crop is centered, leaving
37 pixel bands top + bottom invisible.

For trailer safety, BURNED targets the tighter **1:1 (1080×1080)**
central square per Phase 1 Unit 1.5 Step 3. This is more
conservative than X's actual crop. If 1:1 elements are safe, 1.91:1
elements are definitely safe.

```ts
// extract-cropped-samples.ts
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';

const SAMPLE_FRAMES = [285, 570, 855, 1140, 1425, 1710, 1950, 2235, 2520, 2790];
const OUT_DIR = 'videos/trailer/sample-eval/final-render-qa/sample-frames-cropped';
if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

for (const frame of SAMPLE_FRAMES) {
  const src = `videos/trailer/sample-eval/final-render-qa/sample-frames/frame-${frame.toString().padStart(4, '0')}.png`;
  const dst = `${OUT_DIR}/frame-${frame.toString().padStart(4, '0')}-1x1.png`;
  // SAFE: argv array
  // Crop 1080×1080 from center of 1920×1080
  // crop=W:H:X:Y where X=(1920-1080)/2=420, Y=0
  execFileSync('ffmpeg', [
    '-y',
    '-i', src,
    '-vf', 'crop=1080:1080:420:0',
    dst,
  ]);
}
```

**Step 2 — Per-frame audit.**

For each cropped frame, evaluate:

| Element | Visible in 1:1 crop? |
|---------|----------------------|
| Hero element (HTP / stamp / logo / character) | yes/no |
| R15 chrome stamp (if frame contains one) | yes/no |
| Dash VO subject (if cue active) | yes (audio always plays) |

Critical narrative elements MUST be visible. Side-band elements
(comms-ticker, side captions) OK to crop.

| Frame | Hero in 1:1? | R15 in 1:1 (if any)? | Verdict |
|-------|--------------|----------------------|---------|
| 285 (S02 dossier) | ✓ | n/a | PASS |
| 570 (S02→S03 boundary) | ✓ | n/a | PASS |
| 855 (S03 roster) | ?? — roster on right edge; some operatives outside safe-square | n/a | TBD |
| 1140 (S04 cascade open) | ✓ HTP hero | n/a | PASS |
| 1425 (S04 stat 2 + halo) | ✓ HTP + center halo | stat caption side-band | PASS (stat = flourish) |
| 1710 (S04 halo + ticker) | ✓ HTP + halo | R15 #2 ticker = side-band | PASS (ticker = flourish) |
| 1950 (S04 stacked payoff) | ✓ stamp + HTP hero | R15 #3 stamp center | PASS |
| 2235 (S05 gameplay) | ✓ gameplay center | n/a | PASS |
| 2520 (S05 iris) | ✓ iris-wipe centered | n/a | PASS |
| 2790 (S06 closing) | ✓ BURNED logo + R15 #4 centered | ✓ | PASS |

**Step 3 — Action on failures.**

If a frame has hero outside 1:1 safe-square:
- Phase 4 scene re-composition (move hero into center)
- Phase 1 reopen if structural

**Step 4 — Documentation.**

`mobile-crop-audit.md` records the per-frame audit table + verdicts.

**Patterns to follow:**

- Roadmap §5.3 mobile-crop rule.
- Phase 1 Unit 1.5 Step 3 safe-square design discipline.

**Test scenarios:**

- **Happy path:** All 10 frames pass mobile-crop audit.
- **Edge case:** S03 roster reveal has right-edge operatives outside
  1:1; acceptable IF they're flourish (cast-density chrome, not
  primary hero); document as known-side-band.

**Verification:**

- 10 cropped frames extracted.
- `mobile-crop-audit.md` populated.
- Critical-element-in-safe-square per frame documented.

---

### Unit 6.7 — Decode Test + Final QA Report

- [ ] **Unit 6.7: Decode Test + Final QA Report**

**Goal:** Run the no-context-engineering-peer decode test on the full
95-second trailer. Brainstorm Success Criteria threshold: ≥1 of 2
testers surfaces "AI / agent / autonomous / built itself" unprompted.
Then aggregate all Phase 6 Unit results into the final QA report
+ Briggsy sign-off.

**Requirements:** Success Criteria + R14 + R15 + Phase 0 Unit 0.3
decode-gate inherited.

**Dependencies:** Units 6.2, 6.3, 6.4, 6.5, 6.6 complete.

**Files:**

- Create: `videos/trailer/sample-eval/final-render-qa/decode-test.md`
- Create: `videos/trailer/sample-eval/final-render-qa/qa-report.md` —
  aggregate.

**Approach:**

**Step 1 — Decode test protocol.**

Inherited from Phase 0 Unit 0.3, applied to full trailer:

- **Listeners**: 2 engineering-peer testers minimum, neither having
  seen UMB v3. Briggsy's network + Discord recruitment (Harry et al.).
- **Stimulus**: full 95-second trailer played cold. No setup, no
  context, no questions before play.
- **Open question (asked AFTER playback)**: "What do you think this
  trailer is about?" Tester narrates stream-of-consciousness for 60
  seconds.
- **Acceptance**: ≥1 of 2 testers surfaces "AI / agent / autonomous /
  built itself" unprompted within the first 60 seconds of reaction.

**Step 2 — Tester response recording.**

For each tester:
- Pre-test profile: engineering-peer? watched UMB v3? Archer
  familiarity?
- Post-test response: verbatim transcript of their 60-second
  reaction.
- Decode acceptance: tester surfaces autonomy hook? yes/no.
- Optional secondary signals: tester recognized §2 Archer reference?
  Tester decoded "Pendleton briefing room"?

**Step 3 — Failure-action ladder.**

If 0 of 2 testers surfaces autonomy hook:
- **Option A — Surface more R15 chrome**: add 1–2 more R15 instances
  in S02 or S03 to reinforce. Re-render.
- **Option B — Rewrite cold-open line**: Phase 0 Unit 0.3 fail-mode
  rewrite — more explicit phrasing ("He wrote himself a sequel" /
  "The machine learned to ship"). Phase 1 Unit 1.2 reopens; Phase 2
  regen cue 60.
- **Option C — Add closing R15 stamp #4 explicit text**: change
  "AGENT-BUILT, ARCHER-GRADE" to more explicit "AUTONOMOUSLY BUILT,
  ARCHER-GRADE" — though "agent-built" should decode for engineering
  peers natively.
- **Option D — Brainstorm reopen**: if R14 + R15 + Dash VO collectively
  don't decode, the trailer's signaling mechanism fails — brainstorm-
  level reopen with Briggsy.

**Step 4 — Aggregate QA report.**

`qa-report.md`:

```md
# Final Trailer QA Report — Phase 6 Sign-Off

## Deliverable
- File: `videos/trailer/out/trailer.mp4`
- Duration: <measured>s (target 95.0s)
- File size: <N> MB
- Codec: H.264 High / CRF 17 / preset slow / yuv420p / AAC 128k

## §2 frame-pass rate (Unit 6.3)
- Pass: <N>/10
- Threshold: ≥8/10
- Verdict: PASS / FAIL

## Bar-raise vs UMB v3 (Unit 6.4)
- Axis 1 (named-operative density): CLEARS / TIES / FAILS
- Axis 2 (§2 frame-pass rate): CLEARS / TIES / FAILS
- Axis 3 (stacked-payoff moment): CLEARS
- Threshold: ≥1 axis clears
- Verdict: PASS / FAIL

## Audio-video sync (Unit 6.5)
- All cues within tolerance: YES / NO
- R3 stacked payoff sync: YES / NO
- Music envelope matches: YES / NO
- Verdict: PASS / FAIL

## Mobile crop audit (Unit 6.6)
- All 10 frames safe-square-PASS: YES / NO
- Verdict: PASS / FAIL

## Decode test (this unit)
- Testers: <names / IDs>
- Tester 1 verdict: SURFACED / DID NOT SURFACE
- Tester 2 verdict: SURFACED / DID NOT SURFACE
- Threshold: ≥1 of 2 surfaces
- Verdict: PASS / FAIL

## R13 acceptance (Phase 5 Unit 5.6 inherited)
- Gameplay clip reads as real game: YES / NO
- Verdict: PASS / FAIL

## Overall Phase 6 verdict
- All 6 sub-verdicts PASS: GO for Phase 7 distribution
- ≥1 sub-verdict FAIL: iterate before Phase 7 hand-off

## Briggsy sign-off
- Phase 6 final: APPROVED / ITERATE
- Hand-off to Phase 7: GO / NOGO
```

**Step 5 — Distribution hand-off.**

If all PASS + Briggsy approves:
- `out/trailer.mp4` finalized
- `out/thumbnail.png` finalized
- Phase 6 exits; Phase 7 begins

**Patterns to follow:**

- Phase 0 Unit 0.3 decode-gate protocol (5-second clip; Phase 6
  scales to 95-second).
- `feedback-elite-team-standard.md` — verify → then lock.
- `feedback-verify-before-presenting.md` — Briggsy reviews actual
  rendered output.

**Test scenarios:**

- **Happy path:** All 6 sub-verdicts PASS; Briggsy signs off.
- **Edge case:** Decode test fails 0/2 → fail-action ladder; most
  likely Option A (more R15 chrome) cheapest.
- **Edge case:** Bar-raise clears only axis 3 → still PASS but
  consider axis 1 + 2 improvements as polish opportunity.
- **Edge case:** R13 gameplay fails after Phase 5 sign-off → Phase 5
  reopen; recapture.

**Verification:**

- Decode test runs with 2 testers minimum.
- `decode-test.md` documents responses.
- `qa-report.md` aggregates all Phase 6 verdicts.
- Briggsy signs off.

---

## System-Wide Impact

- **Interaction graph:** Phase 6 ingests Phase 4 composition output
  + Phase 5 gameplay clip; produces final `out/trailer.mp4` + QA
  report. Phase 7 receives the final + QA verdict.
- **Error propagation:** Any sub-verdict failure routes to a Phase 4
  or Phase 5 or Phase 1 reopen with documented scope. No silent fail.
- **State lifecycle risks:** Phase 6 produces the final asset; if
  iterations happen, multiple renders may be produced before lock.
- **API surface parity:** None — Phase 6 produces video output.
- **Integration coverage:** Phase 6 is the integrated end-to-end
  QA pass; covers all R1–R15 collectively.
- **Unchanged invariants:** BURNED game code untouched. Trailer
  remains isolated.

---

## Risks & Dependencies

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| §2 frame-pass rate <8/10 | Medium | High (per Success Criteria) | Per-failure-frame recompose (Phase 4 scene iteration); typically 1–2 frames need polish. |
| Bar-raise axis 3 (stacked payoff) accidentally undermined by Phase 4 iteration | Low | High | Unit 6.4 audits explicitly; if axis 3 fails, R3 mechanism broken — Phase 4 + Phase 1 reopen. |
| Decode test fails 0/2 | Medium | High | Fail-action ladder Step 3; multi-path remediation. |
| Audio-video drift after final encode | Low | Medium | Unit 6.5 audit catches; sub-frame drift acceptable, frame-level not. |
| Encoding produces file too large for X | Low | Low | maxrate cap available as fallback. |
| Encoding profile incompatible with X HTML5 player | Low | Medium | Cross-browser playback test in Unit 6.2 Step 4. |
| Thumbnail frame doesn't sell trailer in feed preview | Low | Low | Multiple thumbnail candidates available; pick best. |
| Mobile crop audit reveals critical element side-banded | Low | Medium | Phase 4 scene re-composition; targeted fix. |
| Render time exceeds reasonable iteration cycle | Low | Low | ~10 min per render; iteration budget reasonable. |
| UMB v3 sample extraction fails (file path / codec issue) | Low | Low | Use Phase 4 extract-sample-frames pattern; UMB MP4 confirmed playable elsewhere. |

---

## Open Questions

### Resolved During Planning

- **Production encoding settings**: CRF 17 / preset slow / yuv420p /
  AAC 128k / faststart.
- **Sampling protocol**: 10 frames at fixed timecodes per trailer.
- **Decode-test panel**: 2 engineering-peer testers minimum,
  neither having seen UMB v3.
- **Mobile-crop target**: tighter 1:1 (1080×1080) safe-square within
  16:9 frame (more conservative than X's 1.91:1 actual crop).
- **Bar-raise pass threshold**: ≥1 of 3 axes clears.
- **Failure-action ladder**: per-sub-verdict, documented routes to
  Phase 4 / Phase 5 / Phase 1 reopens.

### Deferred to Implementation

- **Specific decode-test tester recruitment**: Briggsy's Discord
  network. Phase 6 execution recruits.
- **Whether to add second-pass thumbnail candidate**: depends on
  Unit 6.2 thumbnail extraction quality.
- **Whether axis 1 (operative density) ties with UMB** vs clears —
  measurement at execution time.
- **Whether to add bitrate maxrate cap**: depends on file size of
  initial render.

---

## Documentation / Operational Notes

- All Phase 6 artifacts land in `videos/trailer/out/` (final MP4 +
  thumbnail) and `videos/trailer/sample-eval/final-render-qa/`.
- Phase 6 final deliverable: `out/trailer.mp4` + `out/thumbnail.png`.
- Decode test recruitment: Briggsy's Discord network (Harry + others
  per `user_harry.md`).
- `feedback-verify-before-presenting.md` — Briggsy reviews actual
  rendered MP4 in multiple players, not Remotion studio preview.
- `execFileSync` argv arrays for all shell-outs.

---

## Sources & References

**Origin documents:**
- Brainstorm: [`docs/ideation/2026-05-15-origin-trailer-brainstorm.md`](../../ideation/2026-05-15-origin-trailer-brainstorm.md)
- Roadmap: [`docs/plans/origin-trailer/roadmap.md`](./roadmap.md)
- Phase 0 plan: [`docs/plans/origin-trailer/phase-0-gate-resolution.md`](./phase-0-gate-resolution.md)
- Phase 1 plan: [`docs/plans/origin-trailer/phase-1-beat-sheet-lock.md`](./phase-1-beat-sheet-lock.md)
- Phase 4 plan: [`docs/plans/origin-trailer/phase-4-remotion-composite.md`](./phase-4-remotion-composite.md)
- Phase 5 plan: [`docs/plans/origin-trailer/phase-5-gameplay-capture.md`](./phase-5-gameplay-capture.md)

**UMB v3 baseline:**
- `projects/undercover-mob-boss/videos/trailer/out/trailer-landscape.mp4` (148s)
- Timing constants: `projects/undercover-mob-boss/videos/trailer/src/lib/timing-v3.ts`

**Quality bar:**
- `docs/PRODUCT-SPECIFICATION.md` §2
- `CLAUDE.md` "The Contract" + Quality Bar discipline

**X / Twitter distribution specs:**
- Specs reference: https://help.twitter.com/en/using-twitter/tweeting-gifs-and-videos
- Mobile in-feed preview crop research (per roadmap §5.4)

**Remotion documentation:**
- CLI render: https://www.remotion.dev/docs/cli/render
- Quality + CRF: https://www.remotion.dev/docs/quality

**FFmpeg references:**
- silencedetect filter: https://ffmpeg.org/ffmpeg-filters.html#silencedetect
- astats filter: https://ffmpeg.org/ffmpeg-filters.html#astats
- crop filter: https://ffmpeg.org/ffmpeg-filters.html#crop
- ffprobe stream info: https://ffmpeg.org/ffprobe.html

**Institutional learnings (memory):**
- `feedback-verify-before-presenting.md` — multi-player playback check
- `feedback-elite-team-standard.md` — verify → then lock
- `user_harry.md` — Harry as decode-test recruitment
- `feedback-eye-in-loop-beats-calibration-for-motion.md` — direct
  observation
- `feedback-phase-plan-drafting-workflow.md` — write all phase
  files in one workflow; deepen sequentially after
