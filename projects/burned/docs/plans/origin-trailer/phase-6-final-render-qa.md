---
title: "Origin Trailer — Phase 6: Final Render + QA"
type: feat
phase: 6
parent: docs/plans/origin-trailer/roadmap.md
origin: docs/ideation/2026-05-15-origin-trailer-brainstorm.md
created: 2026-05-16
deepened: 2026-05-17
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
  trailer, **CRF 18 / `--x264-preset slow` / yuv420p / AAC 128k / mono
  / +faststart (per ADR #19 — locked 2026-05-17 by Phase 6 deepening)**,
  ~95 seconds
- `videos/trailer/out/thumbnail.png` — single frame still for
  portfolio + X video preview thumbnail (default frame 2790 per Unit
  6.2 Step 3 closure rule; 1950 only if extracted still reads as
  composed-not-mid-motion)
- `videos/trailer/sample-eval/final-render-qa/qa-report.md` —
  comprehensive QA pass results (verdict-first structure per Unit 6.7
  template)
- `videos/trailer/sample-eval/final-render-qa/bar-raise-eval.md` —
  3-axis bar-raise evaluation vs UMB v3 (with side-by-side composite
  PNG per Unit 6.4 Step 6)
- `videos/trailer/sample-eval/final-render-qa/decode-test.md` —
  no-context-engineering-peer agentic-SDLC decode verification
  (N=6 panel + UMB control per ADR #21)
- `videos/trailer/sample-eval/final-render-qa/mobile-crop-audit.md` —
  X mobile 1.91:1 in-feed preview crop audit + 9:16 vertical-feed
  audit (per ADR #23)
- `videos/trailer/sample-eval/final-render-qa/render-settings-log.md` —
  consolidated encoding-settings + render-log (formerly two files;
  merged per Phase 6 deepening scope-guardian #7)
- `videos/trailer/sample-eval/final-render-qa/s2-frame-audit.md` —
  operational §2 rubric per-frame verdicts (Unit 6.3)
- `videos/trailer/sample-eval/final-render-qa/av-sync.md` — A/V sync
  per-cue drift (manifest-driven; Unit 6.5)
- `videos/trailer/sample-eval/final-render-qa/PHASE-6-EXIT.md` —
  handoff document Phase 7 reads (Unit 6.8)
- `videos/trailer/sample-eval/final-render-qa/cutdown-frame-list.md` —
  recommended X-native cutdown source frames for Phase 7 (Unit 6.8)
- `videos/trailer/sample-eval/final-render-qa/decode-test-roster.md` —
  tester recruitment record (Unit 6.0)
- `videos/trailer/sample-eval/final-render-qa/sample-frames/` — 10
  extracted sample-frame PNGs + `contact-sheet.png` (5×2 tile)
- `videos/trailer/sample-eval/final-render-qa/umb-samples/` — 10 UMB v3
  reference frames + `bar-raise-composite.png`
- `videos/trailer/sample-eval/final-render-qa/sample-frames-cropped/` —
  per-frame mobile-crop visual composites (full | 1:1 | safe-square
  outlined)
- `videos/trailer/sample-eval/final-render-qa/sample-frames-9x16/` —
  per-frame 9:16 vertical-crop visual composites
- `videos/trailer/sample-eval/final-render-qa/decode-audio/` — tester
  voice-memo recordings (`tester-{N}.{m4a,ogg}`)
- `videos/trailer/sample-eval/final-render-qa/briggsy-review-6.0a.signoff` —
  recruitment-prerequisite sentinel
- `videos/trailer/sample-eval/final-render-qa/briggsy-review-6.4.signoff` —
  bar-raise acceptance sentinel
- `videos/trailer/sample-eval/final-render-qa/briggsy-review-6.7.signoff` —
  final QA sign-off sentinel (per ADR #22)
- `scripts/verify-trailer-final.ts` — machine-checkable contract gate
  parsing ffprobe + loudnorm output (Unit 6.0)
- `scripts/extract-frames.ts` — shared helper consumed by Units 6.3
  / 6.4 / 6.6 (consolidates 3 duplicate scripts per scope-guardian #2)

Phase 6 exits when:
1. `out/trailer.mp4` exists and `pnpm verify:trailer-final` passes
   (asserts: codec=h264, profile=High, pix_fmt=yuv420p, width=1920,
   height=1080, r_frame_rate=30/1, duration ∈ [94.5, 95.5], audio
   codec=aac, audio sample_rate=48000, audio channels=1 per ADR #14,
   audio bit_rate ∈ [96000, 160000], integrated LUFS=-16 ±0.5).
2. All 6 sub-verdicts PASS (§2 frame-pass ≥8/10, bar-raise ≥1 of 3
   axes clears INCLUDING the constraint that axis 3 alone is not
   sufficient — per ADR #19 / Unit 6.4 Step 5, A/V sync within
   asymmetric tolerance per ADR #20, mobile-crop safe, decode ≥3 of 6
   testers surface autonomy hook AND UMB control panel does NOT, R13
   acceptance).
3. Briggsy watches `out/trailer.mp4` end-to-end in at least one player
   (Step 4a load-bearing gate per `feedback-elite-team-standard.md`).
4. Briggsy signs off via `briggsy-review-6.4.signoff` (bar-raise) +
   `briggsy-review-6.7.signoff` (final), both git-author-checked
   per ADR #22.
5. `PHASE-6-EXIT.md` + `cutdown-frame-list.md` produced for Phase 7
   hand-off (Unit 6.8).

**UMB v3 precedent disclosure.** Phase 6 inherits ONLY two things from
UMB v3: the `render` script shape (`npx remotion render ... --codec
h264 --crf N`) and the existence of `trailer-landscape.mp4` as a 148s
4440-frame baseline for bar-raise comparison. UMB v3 has NO Phase-6-
equivalent QA scaffold — no `sample-eval/`, no `qa-report.md`, no
`bar-raise-eval.md`, no sample-frame extraction script, no A/V sync
audit. Every Phase 6 QA artifact is BURNED-original invention. The
"per UMB precedent" phrasing in the patterns sections refers to render
command shape only; all QA scaffold is net-new.

---

## Problem Frame

Phase 4 produced `out/trailer-preview.mp4` at studio-preview quality
+ per-scene Archer-tested. Phase 4 deepening additionally surfaced a
`out/trailer-scene-build.mp4` Phase-6-deliverable-candidate that
could be promoted directly if QA clears (Unit 6.1 Step 0 reconciles
promote-vs-rerender). Phase 5 swapped in real gameplay. Phase 6
takes the integrated composition + raises every quality dial to
production grade + runs the comprehensive QA pass.

What makes Phase 6 distinct from Phase 4 Unit 4.10:

- **Encoding settings tuned for distribution**, not iteration speed.
  Phase 4 used CRF 18 default; Phase 6 LOCKS the canonical production
  encoding per ADR #19 (CRF 18 + `--x264-preset slow` + no `--tune` —
  reconciles Phase 0 ADR draft + roadmap §3 + best-practices industry
  threshold; resolves three-way contradiction).
- **Comprehensive QA**, not per-scene §2. Phase 4 tested scenes in
  isolation; Phase 6 tests the integrated runtime end-to-end with
  cross-cutting criteria (audio-video sync, bar-raise axes, decode
  test).
- **Bar-raise evaluation** — the trailer's central engineering
  claim. Per brainstorm Success Criteria + roadmap §9, the trailer
  must clear UMB v3 on ≥1 of 3 sampled axes. Phase 6 deepening
  RAISES the bar: axis 3 alone (stacked-payoff structural-difference
  axis) is necessary but NOT sufficient — bar-raise requires axis 3
  cleared AND ≥1 of axes 1/2 also cleared. UMB structurally cannot
  compete on axis 3 by design; passing only axis 3 is a tautology,
  not a relative advance.
- **No-context decode test** — does an engineering-peer viewer who
  hasn't seen UMB v3 decode "agentic-SDLC / AI / autonomous" from
  R14 + R15 working together? Per ADR #21, the panel is N=6 (not N=2
  as the brainstorm inherited from the Phase 0 Unit 0.3 5-second
  spike), includes UMB v3 control to detect priors contamination,
  and uses Q1/Q2 two-question protocol to distinguish unprompted
  decode from latent-decode.
- **Mobile-crop discipline audit** — does the trailer survive X's
  1.91:1 in-feed preview crop on mobile? Per roadmap §5.3 + ADR #23,
  critical text must live within central 1:1 safe square AND a 9:16
  vertical-feed audit is added for X's 2026 Immersive Media Viewer
  (top-level vertical tab; engineering-portfolio video that fails
  vertical crop loses a major distribution surface).

The risk Phase 6 manages: **a trailer that passes per-scene §2 tests
individually but fails as a whole**. A scene can pass §2 in isolation
yet the trailer can fail the integrated decode test or the bar-raise
test or the audio-sync test. Phase 6 catches these integration-level
failure modes.

The largest unknown at Phase 6 entry: **whether the bar-raise vs UMB
v3 holds**. Phase 4 + Phase 5 work assumed it would; Phase 6 evaluates.
If bar-raise fails (axis 3 alone is no longer sufficient per Phase 6
deepening), the trailer doesn't clear roadmap §9 Success Criteria —
Phase 6 ROUTES to the upstream phase responsible for the failing axis
(Phase 6 detects, does not fix; per scope-guardian deepening
amendment).

---

## Critical Constraints Surfaced by Research

Cross-reference: roadmap §5, §9, Phase 4 Unit 4.10, ADRs #14 / #19 /
#20 / #21 / #22 / #23.

### Production encoding settings — ADR #19 canonical lock

**Reconciled three-way contradiction** (deepening repo-research Thread
5 + best-practices F2 + coherence Finding 1): Phase 0 ADR drafted
CRF 16 for `render:final`. Roadmap §3 row 6 said CRF 18. Phase 6 first
draft said CRF 17. **ADR #19 locks CRF 18** based on industry "visually-
lossless threshold" practitioner consensus (FFmpeg H.264 wiki + slhck
CRF guide). CRF 17 vs CRF 18 is sub-perceptual on X's downstream re-
encode; CRF 16 over-encodes for distribution. Phase 0 + roadmap §3
amended to align with Phase 6 lock.

**Critical CLI flag fix** (best-practices F1 + framework-docs Claim 1):
`--preset slow` is **NOT a valid Remotion 4.0.438 CLI flag** — the
correct flag is `--x264-preset slow`. The first draft's `--preset slow`
would silently no-op and fall back to `medium`, defeating the whole
"Phase 6 production-grade vs Phase 4 preview" distinction. Phase 0
ADR's `render:final` script already used `--x264-preset` correctly; the
Phase 6 first-draft regression is fixed here.

| Setting | Phase 4 preview | Phase 6 production LOCK (ADR #19) | Rationale |
|---------|-----------------|-----------------------------------|-----------|
| Codec | libx264 | libx264 (High profile) | X distribution spec; X re-encodes any non-x264 upload defeating the purpose of x265 |
| CRF | 18 | **18** (locked; same as preview) | Industry visually-lossless threshold for 1080p H.264; CRF 17 spends ~15-20% more bytes for sub-perceptual quality gain that X's re-encode discards |
| Preset | medium (default) | **`--x264-preset slow`** | Better compression at same CRF; ~40% slower per-frame than medium, ~3-5% better visual quality at given CRF |
| Tune | (none) | **(none — explicit)** | Mixed content (illustration + capture + UI). `--tune film` over-sharpens flat illustration; `--tune animation` over-deblocks live capture. Default psy-RD calibration is the right choice for heterogeneous content (FFmpeg wiki guidance) |
| Pixel format | yuv420p | yuv420p | X compatibility |
| Resolution | 1920×1080 | 1920×1080 | locked (R8) |
| Frame rate | 30 | 30 | locked (R7) |
| Audio codec | aac (Remotion default) | aac (Mediabunny-backed per ADR #17) | locked |
| Audio bitrate | (default) | 128k | X spec (AAC-LC 128 kbps) |
| Audio channels | (default stereo) | **mono (`-ac 1`)** | ADR #14 lock; Phase 6 `verify:trailer-final` asserts `channels=1` |
| Audio sample rate | (default 48k) | 48000 | Remotion default; resampled from sources via Mediabunny per ADR #17 |
| Integrated LUFS | (uncontrolled) | **-16 ±0.5** | ADR #14 lock via two-pass loudnorm at Phase 2; Phase 6 verifies measurement, does not re-apply |
| Movflags | (default) | +faststart | streaming-friendly |
| Bitrate cap | (none) | **(none — let CRF determine)** | File size estimate ~80-180MB for 95s @ CRF 18; well under X's 512MB cap. If pre-test render at high-entropy passage (S04 cascade peak frames 1140-1860) projects >280MB, add `--codec-options "maxrate=8M:bufsize=16M"`; verify exact Remotion CLI surface via context7 at execution |

**Iteration vs gold-master split** (best-practices F11): Remotion
4.0.438 supports `--hardware-acceleration if-possible` (Apple
VideoToolbox + Windows AMF/NVENC) which is **incompatible with
`--x264-preset` + `--crf`** (quality control switches to
`--video-bitrate`). Acceptable trade-off for iteration loops where
fast wall-clock matters more than visually-lossless encode. Phase 6
ships two render scripts: `pnpm render:iterate` (hardware-accelerated;
~3-5 min) for in-Phase-6-failure-action-loop re-renders; `pnpm render`
(software libx264 slow; ~15-25 min) for the gold-master final.

### Audio-video sync thresholds — ADR #20 asymmetric tolerance

**Per perception research** (best-practices F6/F7 + adversarial Attack
3): human AV-sync detection is fundamentally **asymmetric** — audio
LEADING video is detectable at ~+20ms (ITU-R BT.1359-1) / +15ms
detectability per stage (EBU R37); audio LAGGING video is forgiving up
to -125ms (ITU detectability) / -50ms (EBU comfortable). The current
±N-frame symmetric framing in the first draft mis-models the
perceptual floor.

**ADR #20 lock:**
- **Standard cues** (S01-S03, S06 Dash VO): drift acceptable in
  range `[-1 frame, +3 frames]` (-33ms to +100ms — audio may lag video
  up to 3 frames; audio may LEAD video by no more than 1 frame).
- **R3 stacked-payoff (cue 1950)**: drift acceptable in range `[-1
  frame, 0 frames]` (-33ms to 0ms — audio may lag video by 1 frame;
  audio MUST NOT lead video at all). This is the trailer's load-
  bearing perceptual moment; an impact gesture (stamp slap) is more
  sensitive than dialogue lip-sync (no lip-reading bias to mask).
- **Audio leading visual by ANY amount on R3 is HARD FAIL** even
  within +1 frame. The ±2 frame tolerance in the first draft was
  outside the audio-lead detection floor and must not be reinstated.
- "Sub-frame drift" phrasing eliminated — all tolerances are frame-
  counted ranges. Replaces the unfalsifiable "sub-frame acceptable,
  frame-level not" language in the Risks table.

### Decode test panel size — ADR #21 (orthogonal to ADR #13 R4 voice gate)

**Per multiple agent convergence** (best-practices F8 + adversarial
Attack 2 + coherence Finding 3 + scope-guardian Challenge 1): the first-
draft "≥1 of 2 testers surfaces autonomy hook" was inherited from
Phase 0 Unit 0.3, where N=2 was acceptable for a **5-second cold-open
binary-hook spike**. Phase 6 tests the **95-second full-trailer
comprehension decode** — structurally analogous to R4's MUSHRA voice
gate (ADR #13 locked 6-8 listeners). N=2 with no control is
statistically toothless: a single Anthropic-follower default-priors
tester confirms autonomy regardless of trailer quality.

**ADR #21 lock:**
- Panel size: **N=6 minimum** (≥3 of 6 surface autonomy hook
  unprompted within the post-stimulus 90-second reaction window).
- **UMB v3 control panel**: same 6 testers also watch UMB v3 first.
  If ≥2 of 6 surface autonomy for UMB v3, the panel is contaminated
  by priors and the BURNED test is invalid; re-recruit.
- **Priors elicitation pre-test**: ask each tester "When you see a
  project from Briggsy on Discord, what's your prior on how it was
  built?" — exclude testers whose unprompted answer already names
  "AI / agent / autonomous / Claude". Document elimination reason.
- **Q1/Q2 question protocol** (per design-lens deepening #2): Q1
  free-recall opens decode evaluation; Q2 prompted-recall only feeds
  failure-route triage (Q1-fail/Q2-pass → R15 chrome insufficient;
  Q1-fail/Q2-fail → R14 cold-open insufficient).
- **Acceptance keyword precision**: surfacing "BUILD PROCESS / AGENT
  AUTHORSHIP" counts (Claude wrote this, an agent built it,
  autonomous development). Surfacing "RENDER TECHNOLOGY" does NOT
  count (AI-generated visuals, Midjourney rendered, the video is AI).

### Eye-in-loop vs script-audit assignment

**Per `feedback-eye-in-loop-beats-calibration-for-motion.md` discipline**
(repo-research Thread 3): calibration agents sample DOM/state and
miss motion-quality bugs that live BETWEEN samples. Phase 6 explicitly
assigns each verification surface to either Claude-script-audit or
Briggsy-direct-watch:

| Surface | Assignment | Rationale |
|---------|-----------|-----------|
| Unit 6.0 verify-script enforcement | Claude | Machine-checkable contract |
| Unit 6.1 settings table | Claude | Static config |
| Unit 6.2 cross-browser playback | Claude (initial) + Briggsy (final) | Briggsy must watch end-to-end before sign-off per `feedback-elite-team-standard` |
| Unit 6.3 §2 sample-frame audit | Briggsy via contact-sheet | Visual judgment; contact-sheet PNG eliminates per-row gut-fill |
| Unit 6.4 bar-raise composite | Briggsy | Side-by-side visual comparison; Claude generates composite, Briggsy reads |
| Unit 6.4 R3 stacked-payoff sync | Briggsy direct watch | Motion-sensitive; calibration agent can't feel ±1 frame |
| Unit 6.5 per-cue manifest drift | Claude | Manifest-driven arithmetic + audio-track timing |
| Unit 6.5 music-bed envelope shape | Briggsy direct listen | Per `feedback-eye-in-loop-beats-calibration-for-motion`; FFmpeg astats numeric printout misses swell shape |
| Unit 6.6 mobile-crop audit | Briggsy via visual composite | Composite PNG with safe-square outline shows boundary directly |
| Unit 6.7 decode test execution | Briggsy + testers | Out-of-band human protocol; Claude transcribes |
| Unit 6.7 qa-report aggregate | Claude (compose) + Briggsy (sign) | Briggsy sign-off via `.signoff` sentinel per ADR #22 |

### `execFileSync` argv arrays

Project security convention. All FFmpeg / FFprobe / Remotion CLI
invocations in Phase 6 scripts use the safe argv-array pattern.

### Marketing voice elimination

**Per `feedback-proven-not-believed.md`**: first-draft Unit 6.4 had
multiple "Expected: BURNED likely clears..." forecast lines. Phase 6
deepening strips these; replace with "Hypothesis at planning time
(unverified): ..." where retained at all. Bar-raise verdict is a
Phase 6 execution-time output, not a planning-time forecast.

---

## Requirements Trace

All requirements R1–R15 come together at Phase 6. Per-unit trace:

- **R1, R6** (briefing-room spine + vocab): Unit 6.3 (§2 audit
  includes vocab check on captions).
- **R2** (deadpan): Unit 6.3 (decoded as part of "could it be Archer"
  §2 composition dimension).
- **R3** (stacked-payoff): Unit 6.4 axis 3 (now necessary but not
  sufficient per Phase 6 deepening) + Unit 6.5 R3 sync (asymmetric
  tolerance per ADR #20).
- **R4, R5, R14** (voice): Unit 6.5 (audio-video sync across full
  runtime; manifest-driven per Phase 6 deepening).
- **R7** (90–100s runtime): Unit 6.0 + 6.2 (verify:trailer-final
  asserts duration ∈ [94.5, 95.5]).
- **R8** (16:9 + mobile-safe): Unit 6.6 (mobile-crop audit + 9:16
  vertical-feed audit per ADR #23).
- **R9** (music bed): Unit 6.5 (music envelope verification via
  Briggsy direct listen + spot-check).
- **R10, R11, R12** (cascade content): Unit 6.3 + Unit 6.4 (§2
  + named-operative density at S04 sample frames).
- **R13** (gameplay closer): Unit 6.3 + Unit 6.5 (S05 sample + sync);
  inherits Phase 5 R13 acceptance via PHASE-5-EXIT.md.
- **R14 + R15** (decode mechanism): Unit 6.7 (Q1/Q2 decode test
  N=6 + UMB control per ADR #21).

---

## Key Technical Decisions

- **Production encode (ADR #19)**: H.264 / CRF 18 / `--x264-preset slow`
  / no `--tune` / yuv420p / AAC 128 kbps mono / faststart / no maxrate
  (conditional bitrate cap only if pre-test projects >280MB).
- **AV-sync tolerance (ADR #20)**: asymmetric — standard cues
  `[-1, +3]` frames; R3 stacked payoff `[-1, 0]` frames. Audio MUST
  NOT lead video on R3 by any amount.
- **Decode test panel (ADR #21)**: N=6 testers + UMB control + priors
  elicitation + Q1/Q2 question protocol + keyword precision (BUILD
  process counts, RENDER tech does not).
- **Sign-off ceremony (ADR #22)**: `.signoff` sentinel files
  (briggsy-review-6.0a/6.4/6.7) committed under Briggsy's git author
  identity (`briggsy007@gmail.com`); `pnpm verify:briggsy-sentinels`
  enforces.
- **Mobile-crop discipline (ADR #23)**: 1:1 safe-square audit + 9:16
  vertical-feed audit (for X 2026 Immersive Media Viewer surface).
- **Sampling protocol**: 10 frames at fixed timecodes (Phase 6 Step 1
  list) for both BURNED and UMB v3 comparison. Same protocol both
  trailers. UMB v3 last sample uses frame 4439 not 4440 (avoid
  end-of-stream extraction edge case).
- **Bar-raise pass criterion**: axis 3 cleared (necessary) AND ≥1 of
  axes 1/2 cleared (the relative-advance proof). Axis 3 alone is a
  tautology and does NOT clear bar-raise per Phase 6 deepening.
- **§2 frame-pass rate threshold**: ≥8 of 10 sampled frames (per
  brainstorm Success Criteria + roadmap §9).
- **Failure-route routing only**: Phase 6 DETECTS failures and ROUTES
  to upstream phases; Phase 6 does NOT execute remediation menus.
- **Iteration vs gold-master split**: `render:iterate` (hardware-
  accelerated, ~3-5min) for failure-loop re-renders; `render` (software
  libx264 slow, ~15-25min) for gold master.
- **Atomic-swap pattern**: render to `out/trailer.mp4.new` → `pnpm
  verify:trailer-final` → mv to `out/trailer.mp4`. Mirrors Phase 5
  pattern; prevents partial-render-as-final.
- **`execFileSync` argv arrays** for all FFmpeg / FFprobe shell-outs.
- **Shared frame-extraction helper**: `scripts/extract-frames.ts`
  consumed by Units 6.3 / 6.4 / 6.6 (consolidates 3 duplicate scripts).

---

## Implementation Units

### Unit 6.0 — Production Verify Script + Atomic-Swap + Tester Pre-Recruitment

- [ ] **Unit 6.0: Production Verify Script + Atomic-Swap + Tester Pre-Recruitment**

**Goal:** Lock in the contract-gate infrastructure BEFORE any render
work. Create `verify:trailer-final` script that machine-checks all ADR
#14 / #19 specs. Establish atomic-swap discipline for re-render
iterations. Close out tester recruitment as a prerequisite to Unit
6.1 (recruitment has lead time; can't be deferred to Unit 6.7).

**Requirements:** ADR #19 + ADR #14 enforcement; tester-recruitment
prerequisite; Phase 5 atomic-swap pattern inheritance.

**Dependencies:** Phase 5 complete (`public/trailer/gameplay.mp4`
exists + Phase 5 EXIT signed off).

**Files:**

- Create: `scripts/verify-trailer-final.ts` — machine-checkable
  contract gate.
- Create: `scripts/extract-frames.ts` — shared frame-extraction helper
  consumed by Units 6.3 / 6.4 / 6.6.
- Edit: `package.json` — add `verify:trailer-final` + `extract:frames`
  scripts; update `render` for atomic-swap pattern.
- Create: `videos/trailer/sample-eval/final-render-qa/decode-test-roster.md` —
  tester recruitment record.
- Create: `videos/trailer/sample-eval/final-render-qa/briggsy-review-6.0a.signoff` —
  recruitment-prerequisite sentinel (git-author check).

**Approach:**

**Step 1 — Write `scripts/verify-trailer-final.ts`.**

Single-purpose Phase-6-owned gate; only consumer is Phase 6 Unit 6.2 +
Phase 6 sentinel ceremony. Pattern mirrors Phase 4's
`scripts/verify-gameplay-clip.ts` (single-file, ts-node compatible,
exit 0 PASS / exit 1 FAIL with named cause).

```ts
// scripts/verify-trailer-final.ts
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const TRAILER = process.argv[2] ?? 'videos/trailer/out/trailer.mp4';
if (!existsSync(TRAILER)) {
  console.error(`FAIL: ${TRAILER} does not exist`);
  process.exit(1);
}

// 1. ffprobe stream + format inspection
const probe = JSON.parse(
  execFileSync('ffprobe', [
    '-v', 'error',
    '-show_format', '-show_streams',
    '-of', 'json',
    TRAILER,
  ], { encoding: 'utf-8' }),
);

const format = probe.format;
const video = probe.streams.find((s: any) => s.codec_type === 'video');
const audio = probe.streams.find((s: any) => s.codec_type === 'audio');

const expect = (cond: boolean, name: string, actual: any) => {
  if (!cond) {
    console.error(`FAIL: ${name} (actual: ${JSON.stringify(actual)})`);
    process.exit(1);
  }
  console.log(`PASS: ${name}`);
};

// Format-level (note: ffprobe returns these as strings — coerce via Number())
const durationSec = Number(format.duration);
expect(durationSec >= 94.5 && durationSec <= 95.5,
       `duration ∈ [94.5, 95.5]`, durationSec);

// Video stream
expect(video.codec_name === 'h264', `video codec=h264`, video.codec_name);
expect(video.profile === 'High', `video profile=High`, video.profile);
expect(video.width === 1920 && video.height === 1080,
       `1920×1080`, [video.width, video.height]);
expect(video.r_frame_rate === '30/1',
       `r_frame_rate=30/1`, video.r_frame_rate);
expect(video.pix_fmt === 'yuv420p',
       `pix_fmt=yuv420p`, video.pix_fmt);

// Audio stream (ADR #14 lock)
expect(audio.codec_name === 'aac', `audio codec=aac`, audio.codec_name);
expect(Number(audio.sample_rate) === 48000,
       `audio sample_rate=48000`, audio.sample_rate);
expect(Number(audio.channels) === 1,
       `audio channels=1 (mono per ADR #14)`, audio.channels);
const audioBitrate = Number(audio.bit_rate);
expect(audioBitrate >= 96000 && audioBitrate <= 160000,
       `audio bit_rate ∈ [96000, 160000]`, audioBitrate);

// 2. LUFS measurement via loudnorm analysis pass (ADR #14 lock)
// loudnorm in analysis mode outputs JSON on stderr — parse the input_i field.
const loudnormOut = execFileSync('ffmpeg', [
  '-i', TRAILER,
  '-af', 'loudnorm=print_format=json',
  '-f', 'null', '-',
], { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
const lufsMatch = loudnormOut.match(/"input_i"\s*:\s*"([-\d.]+)"/);
const integratedLufs = lufsMatch ? Number(lufsMatch[1]) : NaN;
expect(integratedLufs >= -16.5 && integratedLufs <= -15.5,
       `integrated LUFS = -16 ±0.5 (ADR #14)`, integratedLufs);

console.log('\nALL CHECKS PASS — trailer ready for Phase 6 QA');
process.exit(0);
```

Wire via `package.json`:

```jsonc
{
  "scripts": {
    "verify:trailer-final": "tsx scripts/verify-trailer-final.ts"
  }
}
```

**Step 2 — Write `scripts/extract-frames.ts` shared helper.**

Replaces three duplicate frame-extraction scripts in Units 6.3 / 6.4 /
6.6. Single source of truth for accurate-seek pattern + mkdirSync
guards.

```ts
// scripts/extract-frames.ts
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

export const FPS = 30;

export function extractFrames(opts: {
  source: string;       // path to MP4
  frames: number[];     // frame numbers to extract
  outDir: string;       // output directory
  prefix?: string;      // filename prefix (default "frame")
  padding?: number;     // zero-pad width (default 4)
}) {
  const { source, frames, outDir, prefix = 'frame', padding = 4 } = opts;
  if (!existsSync(source)) {
    throw new Error(`Source not found: ${source}`);
  }
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

  for (const frame of frames) {
    const target = frame / FPS;
    // Two-stage seek: fast-seek to ~1s before target (keyframe),
    // then accurate-seek the remainder. Frame-exact + fast.
    const fastSeek = Math.max(0, target - 1).toFixed(3);
    const accurateSeek = Math.min(1, target).toFixed(3);
    const out = `${outDir}/${prefix}-${String(frame).padStart(padding, '0')}.png`;
    // SAFE: argv array
    execFileSync('ffmpeg', [
      '-y',
      '-ss', fastSeek,         // before -i: fast keyframe seek
      '-i', source,
      '-ss', accurateSeek,     // after -i: accurate decode-and-discard
      '-frames:v', '1',
      '-q:v', '2',
      out,
    ]);
    console.log(`Extracted frame ${frame} (${target.toFixed(2)}s) → ${out}`);
  }
}

export function generateContactSheet(opts: {
  inputDir: string;
  inputPattern: string;  // e.g. 'frame-%04d.png'
  outPath: string;
  tile: string;          // e.g. '5x2'
}) {
  const { inputDir, inputPattern, outPath, tile } = opts;
  // SAFE: argv array
  execFileSync('ffmpeg', [
    '-y',
    '-pattern_type', 'glob',
    '-i', resolve(inputDir, inputPattern.replace('%04d', '*')),
    '-vf', `tile=${tile}`,
    outPath,
  ]);
  console.log(`Contact sheet → ${outPath}`);
}
```

**Step 3 — Atomic-swap pattern (mirrors Phase 5 `gameplay.mp4`).**

Render writes to `out/trailer.mp4.new`; verify gates the rename to
`out/trailer.mp4`. Pattern from Phase 5 deepening lines 260-263 and
Phase 4 `sync-gameplay-clip.ts` lifecycle hook.

```jsonc
// videos/trailer/package.json scripts (production gold master)
{
  "scripts": {
    "render": "npx remotion render src/index.ts BurnedTrailer out/trailer.mp4.new --codec h264 --crf 18 --x264-preset slow --pixel-format yuv420p --audio-codec aac --audio-bitrate 128K",
    "render:iterate": "npx remotion render src/index.ts BurnedTrailer out/trailer.mp4.iterate --codec h264 --crf 18 --hardware-acceleration if-possible --video-bitrate 10M --audio-codec aac --audio-bitrate 128K",
    "render:thumbnail": "npx remotion still src/index.ts BurnedTrailer out/thumbnail.png --frame 2790",
    "render:finalize": "tsx scripts/finalize-trailer.ts"
  }
}
```

`scripts/finalize-trailer.ts`:

```ts
import { renameSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const NEW = 'videos/trailer/out/trailer.mp4.new';
const FINAL = 'videos/trailer/out/trailer.mp4';

// SAFE: argv array — runs verify gate on .new before swap
execFileSync('pnpm', ['verify:trailer-final', NEW], { stdio: 'inherit' });
console.log(`Verify PASS — swapping ${NEW} → ${FINAL}`);
renameSync(NEW, FINAL);
console.log('Atomic swap complete.');
```

(On Windows close any open VLC/browser handles pointing at the
final path before the swap to avoid EBUSY — mirrors Phase 5 EBUSY
note at phase-5 lines 1641-1748.)

**Step 4 — Tester pre-recruitment.**

Open question from first draft (line ~1229) said "Phase 6 execution
recruits." Phase 6 deepening promotes this to a prerequisite gated by
sentinel. Recruitment lead time is real; if a tester drops out at
Unit 6.7 entry, re-recruitment of UMB-naive engineering peers blocks
Phase 6 exit for days.

Briggsy reaches out via Discord (Harry et al.) for 3-6 candidates;
target panel: 6 confirmed, 1 hot-spare reserve. Each candidate
confirmed:
- engineering peer (writes code professionally)
- has NOT seen UMB v3 trailer
- can do a 5-minute no-context-watch + 2-minute reaction session
  within Phase 6 execution window

`decode-test-roster.md` template:

```md
# Decode Test Tester Roster — Phase 6 Unit 6.0

## Confirmed panel (target N=6 + 1 reserve)

| Tester | Discord handle | Engineering-peer? | UMB-naive? | Available window | Notes |
|--------|----------------|-------------------|------------|------------------|-------|
| T1 | <handle> | Y | Y | <date range> | |
| T2 | ... | | | | |
| ... | | | | | |

## Eliminated candidates (priors-elicitation)

| Candidate | Reason | Date |
|-----------|--------|------|
| <handle> | Default prior already names "Claude" / "AI" | |
```

**Step 5 — Sentinel ceremony.**

`briggsy-review-6.0a.signoff` content:
```
Phase 6 Unit 6.0 prerequisites cleared.
- verify:trailer-final script in place
- extract-frames.ts shared helper in place
- atomic-swap render scripts wired
- decode-test panel of N≥6 confirmed (see decode-test-roster.md)
Date: <YYYY-MM-DD>
```

Briggsy commits the sentinel under his git author identity
(`briggsy007@gmail.com`). `pnpm verify:briggsy-sentinels` enforces
author-check (introduced Phase 4; same script).

**Patterns to follow:**

- Phase 4 `scripts/verify-gameplay-clip.ts` — single-purpose gate
  script structure.
- Phase 5 atomic-swap pattern (lines 260-263, 1641-1748).
- Phase 4 ADR #22 — Briggsy sign-off ceremony.

**Test scenarios:**

- **Happy path:** verify-trailer-final.ts dry-runs against the
  Phase 4 `trailer-scene-build.mp4` candidate; all assertions match
  the spec or produce named failures.
- **Edge case:** loudnorm two-pass not applied at Phase 2 → integrated
  LUFS drift outside ±0.5; verify fails with LUFS named cause; route
  to Phase 2 reopen.
- **Edge case:** Tester recruitment falls below N=6 → Unit 6.7 cannot
  run; sentinel cannot be signed; Phase 6 blocks at Unit 6.0.
  Mitigation: start recruitment during Phase 5 execution, not at
  Phase 6 entry.

**Verification:**

- `scripts/verify-trailer-final.ts` exists; `pnpm verify:trailer-final
  <any-mp4>` exits 1 on missing file (smoke test before real input).
- `scripts/extract-frames.ts` exists; `import { extractFrames }`
  works from a sibling script.
- `package.json` scripts updated with `render`, `render:iterate`,
  `render:thumbnail`, `render:finalize`, `verify:trailer-final`.
- `decode-test-roster.md` records ≥6 confirmed testers.
- `briggsy-review-6.0a.signoff` committed under Briggsy's git author.

---

### Unit 6.1 — Production Render Settings Finalization + Promote-or-Rerender Decision

- [ ] **Unit 6.1: Production Render Settings Finalization + Promote-or-Rerender Decision**

**Goal:** Decide whether to promote Phase 4's `out/trailer-scene-
build.mp4` candidate directly OR re-render fresh under Phase 6 ADR #19
production settings. Validate file size + visual quality + X
distribution compatibility before committing to the gold-master
render.

**Requirements:** R8 (16:9 1920×1080), ADR #19 (production encoding
lock).

**Dependencies:** Phase 4 produces a Phase-6-deliverable-candidate
(`out/trailer-scene-build.mp4`); Phase 5 produces
`public/trailer/gameplay.mp4`; Unit 6.0 verify script in place.

**Files:**

- Edit: `videos/trailer/package.json` — `render` + `render:iterate`
  scripts per Unit 6.0 Step 3.
- Create: `videos/trailer/sample-eval/final-render-qa/render-settings-log.md`
  (consolidates first-draft's encoding-settings.md + render-log.md
  per scope-guardian #7).

**Approach:**

**Step 0 — Promote-or-rerender decision** (repo-research Thread 5).

Phase 4 deepening at phase-4 lines 478-500 explicitly says it produces
a Phase-6-deliverable-candidate. Phase 6 must decide:

1. Run `pnpm verify:trailer-final out/trailer-scene-build.mp4` against
   the Phase 4 candidate.
2. If verify PASSES on the candidate AND all sub-verdicts (Units 6.3-
   6.7) project to PASS based on Phase 4 final per-scene §2 outcomes:
   PROMOTE — rename `trailer-scene-build.mp4` → `trailer.mp4` (atomic
   `mv`).
3. If verify FAILS or any spec dimension drifts (e.g. Phase 4 candidate
   was rendered at CRF 17 not 18; or LUFS not -16 ±0.5): RERENDER under
   ADR #19 production settings.

Document the decision in `render-settings-log.md` with the verify
output that informed it.

**Step 1 — Settings table (ADR #19 canonical lock).**

Already documented in Critical Constraints "Production encoding
settings" section above. Mirror the table into `render-settings-log.md`
for execution-time reference.

**Step 2 — Render script application.**

If RERENDER path:

```bash
cd videos/trailer
pnpm render          # produces out/trailer.mp4.new
pnpm verify:trailer-final out/trailer.mp4.new   # gates the swap
pnpm render:finalize # atomic mv .new → final
pnpm render:thumbnail
```

If PROMOTE path:

```bash
# verify already passed on the candidate
mv out/trailer-scene-build.mp4 out/trailer.mp4
pnpm render:thumbnail
```

Either path produces `out/trailer.mp4` + `out/thumbnail.png` as Phase 6
gold master.

**Step 3 — Pre-render projection** (best-practices F10 + feasibility
#3) for the RERENDER path.

Before committing to the full `--x264-preset slow` render (12-25 min
Apple Silicon / 15-30 min Windows x64), run a 10-15s representative
sub-composition (recommend S04 cascade peak frames 1140-1860, the
highest-entropy passage) at ADR #19 settings:

```bash
npx remotion render src/index.ts BurnedTrailer out/test-encode.mp4 \
  --codec h264 --crf 18 --x264-preset slow --pixel-format yuv420p \
  --audio-codec aac --audio-bitrate 128K \
  --frame 1140-1860
```

FFprobe the output; multiply file size by `2850 / (1860-1140+1)` to
project full-render size. If projection >280MB, pre-emptively add
`--codec-options "maxrate=8M:bufsize=16M"` (verify exact Remotion CLI
flag surface via context7 at execution).

**Step 4 — Calibrate render-time estimate.**

Time the sub-composition render. Multiply by `(2850 / sub-frame-count)`.
Record actual estimate in `render-settings-log.md`. If projected full-
render >30 min, document iteration-budget impact + escalate to
Briggsy before committing.

**Step 5 — Document.**

`render-settings-log.md` template:

```md
# Render Settings + Log — Phase 6 Unit 6.1

## Promote-or-rerender decision
- Path: PROMOTE / RERENDER
- Phase 4 candidate verify output: <PASS/FAIL summary>
- Decision rationale: <short>

## Locked settings (ADR #19)
[Settings table mirrored from Critical Constraints]

## Pre-render projection
- Sub-composition tested: frames <N>-<M>
- Sub-render time: <N>s
- Projected full-render time: <N>min
- Sub-render file size: <N>MB
- Projected full-render file size: <N>MB
- Bitrate cap applied: yes/no (rationale)

## Full render
- Date: <YYYY-MM-DD>
- Wall-clock time: <N> minutes
- Output: out/trailer.mp4.new → (verify) → out/trailer.mp4
- Final file size: <N>MB
- Final integrated LUFS: <measured>
- GAMEPLAY_CLIP_SOURCE resolved value: <path>

## Verification commands run
- pnpm verify:trailer-final → PASS
```

**Patterns to follow:**

- Phase 0 ADR `render` script structure (CRF 18 / `--x264-preset slow`
  reconciliation per ADR #19).
- Phase 4 `sync-gameplay-clip.ts` lifecycle hook precedent for
  atomic-swap.
- Remotion CLI docs at https://www.remotion.dev/docs/cli/render +
  https://www.remotion.dev/docs/quality (verify flag names via
  context7 at execution).

**Test scenarios:**

- **Happy path PROMOTE:** Phase 4 candidate verifies clean; one `mv`
  + thumbnail render = Phase 6 Unit 6.1 done in <5 min.
- **Happy path RERENDER:** Pre-test projection lands <250MB / <25min;
  full render lands within projection; verify gate passes; atomic
  swap succeeds.
- **Edge case:** Pre-test projection >280MB → add bitrate cap; verify
  cap doesn't drop CRF below visual-quality threshold.
- **Edge case:** `--x264-preset` not recognized by Remotion 4.0.438 →
  verify via context7 at execution; if flag surface changed, escalate
  before committing.
- **Edge case:** Hardware-accel `render:iterate` produces visually
  acceptable iteration output but verify-trailer-final fails on
  audio-bitrate (VideoToolbox audio encoder differs) → only gold-
  master path uses `render`; iterate path uses `render:iterate` and
  is NEVER promoted to final.

**Verification:**

- `render-settings-log.md` documents decision + measurements.
- Either `out/trailer.mp4` produced via PROMOTE OR `out/trailer.mp4`
  produced via RERENDER + verify + finalize.
- `out/thumbnail.png` produced (per Unit 6.2 Step 3 selection rule).

---

### Unit 6.2 — Full Production Render + Distribution-Target Playback

- [ ] **Unit 6.2: Full Production Render + Distribution-Target Playback**

**Goal:** Confirm `out/trailer.mp4` plays in all distribution-target
players (not just desktop). Strong adversarial finding (Attack 10):
QuickTime on Windows 11 is deprecated since 2016; first-draft missed
Safari iOS + X-app + X staging upload — the actual mobile-feed targets.

**Requirements:** R7 (90-100s, must land 95s ±0.5s) + R8 (16:9 mobile
distribution).

**Dependencies:** Unit 6.0 + Unit 6.1 complete; Phase 4's
`sync-gameplay-clip.ts` prerender lifecycle hook resolved
`GAMEPLAY_CLIP_SOURCE` to `public/trailer/gameplay.mp4` (not the
placeholder).

**Files:**

- Existing: `videos/trailer/out/trailer.mp4` (from Unit 6.1).
- Existing: `videos/trailer/out/thumbnail.png` (from Unit 6.1).
- Append to: `videos/trailer/sample-eval/final-render-qa/render-settings-log.md`
  (playback verification section).

**Approach:**

**Step 1 — Re-verify post-Unit-6.1.**

`pnpm verify:trailer-final` already ran inside Unit 6.1; re-run as a
fresh smoke check that the final `out/trailer.mp4` (post-mv) still
passes (catches accidental mv-then-corrupt scenarios).

**Step 2 — GAMEPLAY_CLIP_SOURCE resolution check.**

Per Phase 4 deepening (lines 2542-2553), the prerender lifecycle hook
flips `GAMEPLAY_CLIP_SOURCE` from the placeholder to
`public/trailer/gameplay.mp4`. Phase 6 verifies the resolved value
landed in the render. Either:
- Read `gameplay-clip-source.ts` at render time (the constant set by
  the hook) and log to `render-settings-log.md`.
- OR FFprobe the bundled video track: extract a frame from the S05
  gameplay segment (frame ~2235); the placeholder is solid-color, the
  real gameplay is BURNED-board pixels. Visual inspection confirms
  resolution.

Record in `render-settings-log.md`:
```md
- GAMEPLAY_CLIP_SOURCE resolved value: public/trailer/gameplay.mp4
- (NOT gameplay-placeholder.mp4 — verified via gameplay-clip-source.ts at render time)
```

**Step 3 — Thumbnail extraction.**

```bash
pnpm render:thumbnail
```

Default frame: **2790** (S06 BURNED logo + R15 #4 stamp — settled
composition; reads as stand-alone still). Selection rule (per
design-lens deepening #6):

1. Default to frame 2790 (visual closure, full-composition rest state).
2. If frame 2790 looks dead in a feed-preview context (no motion sell),
   fall back to frame **180** (S01 BURNED logo land — also closure).
3. Frame **1950** (stacked-payoff) is reserved as a last-resort
   thumbnail ONLY if the extracted still shows the stamp fully
   opaque + halo at a readable diameter without motion blur. The
   stamp slap is a video MOMENT, not a feed-preview STILL — the
   instant where it lands cleanly is narrow.
4. Other fallback: frame 1860 (cascade peak pre-stamp).

Briggsy reviews the extracted thumbnail; if it doesn't read as
feed-stopping, switch frame + re-extract.

**Step 4 — Cross-browser + distribution-target playback verification.**

Replace first-draft list (which included deprecated QuickTime on
Windows). Briggsy is on Windows 11 (per env block); distribution
target includes X iOS / Android mobile.

Open `out/trailer.mp4` in (verify each plays end-to-end without
errors):

**Desktop:**
- [ ] Films & TV (Windows 11 default `.mp4` handler) — native OS check
- [ ] Windows Media Player (legacy / Media Player reissue) — secondary
      native
- [ ] VLC — codec-flexible reference player
- [ ] Chrome desktop — primary HTML5 target (X distribution preview)
- [ ] Edge desktop — Microsoft Media Foundation decode path; catches
      MS-specific issues

**Mobile (real devices, not emulators):**
- [ ] iOS Safari (Briggsy's iPhone via TestFlight upload or local
      web-share) — X iOS in-feed uses WKWebView with Safari's codec
      stack
- [ ] Android Chrome (Briggsy's Android device OR Harry-relay if no
      Android available) — X Android in-feed equivalent

**X staging upload:**
- [ ] Upload `out/trailer.mp4` to Briggsy's dev X account as an
      UNLISTED post. Verify (a) in-feed preview thumbnail renders,
      (b) tap-to-play loads + plays with audio on mobile, (c) X does
      NOT issue re-encode warnings or codec-rejection. Delete the
      staging post before Phase 7 live distribution.

(QuickTime is deprecated on Windows since April 2016 — Apple support
notice HT205771 — not included.)

**Step 5 — Document.**

Append to `render-settings-log.md`:

```md
## Distribution-target playback verification

| Player | Plays end-to-end? | Notes |
|--------|-------------------|-------|
| Films & TV | Y/N | |
| Windows Media Player | Y/N | |
| VLC | Y/N | |
| Chrome desktop | Y/N | |
| Edge desktop | Y/N | |
| iOS Safari (real device) | Y/N | |
| Android Chrome (real device) | Y/N | |
| X staging upload | Y/N | No re-encode warnings? Mobile preview OK? |
```

Briggsy end-to-end watch: see Unit 6.7 Step 4a (load-bearing gate
per `feedback-elite-team-standard.md`).

**Patterns to follow:**

- Phase 4 Unit 4.10 render verification.
- `feedback-verify-before-presenting.md` — Claude is QA before Briggsy.
- `feedback-elite-team-standard.md` — Briggsy must watch the actual
  output, not approve a report about it.

**Test scenarios:**

- **Happy path:** all 8 player surfaces play clean; X staging upload
  shows clean preview + audio on mobile.
- **Edge case:** Safari iOS shows silent video (AAC profile
  incompatibility) → re-render with `aac_low` profile flag or verify
  AAC LC vs AAC HE; X mobile users would experience silent playback.
- **Edge case:** X staging shows re-encode warning → bitrate likely
  too high; add bitrate cap and re-render.
- **Edge case:** GAMEPLAY_CLIP_SOURCE resolved to placeholder (Phase 4
  hook didn't fire) → S05 gameplay segment shows solid-color
  placeholder; re-render with explicit hook invocation.

**Verification:**

- `out/trailer.mp4` re-verified post-finalization.
- `out/thumbnail.png` reads as feed-stopping per selection rule.
- All 8 player surfaces pass.
- X staging upload clean; staging post deleted.
- `render-settings-log.md` updated.

---

### Unit 6.3 — §2 Frame-Pass Rate Sampling Audit (Operational Rubric)

- [ ] **Unit 6.3: §2 Frame-Pass Rate Sampling Audit**

**Goal:** Sample 10 frames at fixed timecodes from `out/trailer.mp4`;
evaluate each against §2 Quality Bar via OPERATIONAL rubric (Phase 6
deepening: replaces first-draft's gut-call rubric with decidable
criteria per adversarial Attack 4 + design-lens #1); compute pass
rate. Threshold ≥8/10 (per brainstorm Success Criteria).

**Requirements:** §2 Quality Bar (PRODUCT-SPECIFICATION.md), Success
Criteria bar-raise axis 2.

**Dependencies:** Unit 6.2 (trailer.mp4 exists); Unit 6.0
(extract-frames helper exists).

**Files:**

- Create: `videos/trailer/sample-eval/final-render-qa/sample-frames/frame-{N}.png` ×10.
- Create: `videos/trailer/sample-eval/final-render-qa/sample-frames/contact-sheet.png`.
- Create: `videos/trailer/sample-eval/final-render-qa/s2-frame-audit.md`.

**Approach:**

**Step 1 — Frame extraction via shared helper.**

```ts
// videos/trailer/scripts/extract-burned-samples.ts
import { extractFrames, generateContactSheet } from '../../scripts/extract-frames';

const SAMPLE_FRAMES = [285, 570, 855, 1140, 1425, 1710, 1950, 2235, 2520, 2790];
const SOURCE = 'videos/trailer/out/trailer.mp4';
const OUT_DIR = 'videos/trailer/sample-eval/final-render-qa/sample-frames';

extractFrames({ source: SOURCE, frames: SAMPLE_FRAMES, outDir: OUT_DIR });
generateContactSheet({
  inputDir: OUT_DIR,
  inputPattern: 'frame-%04d.png',
  outPath: `${OUT_DIR}/contact-sheet.png`,
  tile: '5x2',
});
```

10 PNG files + 1 contact-sheet composite (5×2 tile). Contact-sheet
forces cross-frame comparison (design-lens #3); reviewer evaluates
the contact-sheet first, then drills into individual frames if
verdict is borderline.

**Step 2 — Per-frame §2 evaluation: OPERATIONAL rubric.**

First-draft rubric ("Does the frame have a clear hero element?") is
gut-call — two reviewers produce different tables. Phase 6 deepening
replaces with decidable criteria (each takes ~30 seconds to apply per
frame):

| Dimension | Operational test | Pass if |
|-----------|-----------------|---------|
| **Composition** | Count distinct attention regions. Identify geometric center of largest high-contrast element. | ≤3 attention regions AND center anchor within middle 60% of frame width × middle 50% of frame height |
| **Palette** | Sample 5 pixels at fixed grid positions (center of each 5×3 grid cell on the contact-sheet evaluator overlay — see s2-frame-audit.md template for coordinates). Excluding subject/character/chrome regions, each sampled pixel's Euclidean RGB distance to nearest locked palette token (cream, ochre, mahogany, teal, burn-fire) measured. For gameplay frames (S05), the captured game-screen rectangle is EXEMPT but surrounding chrome must still pass. | ≥4 of 5 sampled pixels within RGB-distance 30 of nearest locked token |
| **Typography** | If text visible: render a control PNG of the same string at same font-size using system-ui fallback fonts. Overlay-compare against extracted frame. If no text visible: mark N/A (don't auto-pass). | All visible text glyphs differ from system-ui control by >2px RMS at character centers (i.e., NOT using fallback — proves locked-font load) OR N/A |

The contact-sheet PNG is reviewed FIRST as a whole; cross-frame
palette/composition consistency surfaces from the contact sheet that
doesn't surface from per-frame review.

**Step 3 — Per-frame audit table.**

Template (all verdict cells initialized to `?`, NO pre-filled checks —
design-lens #3 amendment):

```md
| Frame | Timecode | Scene | Composition | Palette | Typography | §2 Verdict | Notes |
|-------|----------|-------|-------------|---------|------------|-----------|-------|
| 285   | 9.5s     | S02   | ?           | ?       | ?          | ?         | |
| 570   | 19.0s    | S02→S03| ?          | ?       | ?          | ?         | |
| 855   | 28.5s    | S03   | ?           | ?       | ?          | ?         | |
| 1140  | 38.0s    | S04   | ?           | ?       | ?          | ?         | |
| 1425  | 47.5s    | S04   | ?           | ?       | ?          | ?         | |
| 1710  | 57.0s    | S04   | ?           | ?       | ?          | ?         | |
| 1950  | 65.0s    | S04   | ?           | ?       | ?          | ?★ MUST PASS | Stacked payoff — load-bearing |
| 2235  | 74.5s    | S05   | ?           | (gameplay-exempt for capture rect) | (n/a if no text in capture) | ? | Gameplay mid; palette exemption per Step 2 |
| 2520  | 84.0s    | S05   | ?           | (gameplay-exempt) | (n/a) | ? | Iris-wipe area |
| 2790  | 93.0s    | S06   | ?           | ?       | ?          | ?         | BURNED logo + R15 #4 |
```

Briggsy fills cells using OPERATIONAL rubric from Step 2. Marginal-
frame re-evaluation is NOT permitted within the same audit pass
(adversarial Attack 4) — re-evaluation requires Phase 4 re-render +
fresh extraction.

**Step 4 — Pass-rate computation.**

Pass count / 10. Threshold: ≥8.

- **8-10 passes:** §2 frame-pass rate clears (axis 2 of bar-raise).
- **7 or fewer:** §2 fails. Phase 6 ROUTES (does not fix) to Phase 4
  re-render of the failing frame's scene; Phase 6 re-enters Unit 6.3
  with fresh extraction after Phase 4 work lands.

**Step 5 — UMB v3 comparison.**

UMB sample extraction handled in Unit 6.4 Step 1 (single script,
not duplicated). UMB pass rate per same operational rubric applied.
Feeds Unit 6.4 axis 2.

**Step 6 — Audit documentation.**

`s2-frame-audit.md` records the per-frame table + pass rate + contact-
sheet reference + operational-rubric criteria used.

**Patterns to follow:**

- `docs/PRODUCT-SPECIFICATION.md` §2 (operational rubric derives from
  the canonical bar; this is the first attempt to make §2 machine-
  decidable).
- Phase 4 Unit 4.10 §2 sweep pattern (extended to dedicated sampling
  + contact-sheet here).
- `feedback-eye-in-loop-beats-calibration-for-motion.md` — Briggsy
  reviews the contact-sheet; this is the eye-in-loop assignment.

**Test scenarios:**

- **Happy path:** ≥8/10 frames pass §2; frame 1950 (load-bearing)
  passes.
- **Edge case:** Frame 1950 fails operational composition (e.g.
  stamp not landed at sampled instant) → MUST iterate before Phase 6
  exits; route to Phase 4 timing adjustment.
- **Edge case:** Gameplay frame 2235 fails Step 2 palette outside
  the capture-rect exemption (i.e., chrome around the gameplay
  capture goes off-palette) → Phase 4 S05 chrome composition reopens.

**Verification:**

- 10 frame PNGs + contact-sheet.png extracted.
- `s2-frame-audit.md` populated with per-frame verdict using
  operational rubric.
- Pass rate computed; threshold check verified.
- All verdicts authored by Briggsy after contact-sheet review (not
  pre-filled).

---

### Unit 6.4 — Bar-Raise Evaluation vs UMB v3 (Axis 3 Necessary, Not Sufficient)

- [ ] **Unit 6.4: Bar-Raise Evaluation vs UMB v3**

**Goal:** Evaluate BURNED trailer vs UMB v3 on the 3 bar-raise axes.
**Phase 6 deepening RAISES the threshold** (adversarial Attack 1):
bar-raise passes IFF axis 3 clears AND ≥1 of axes 1/2 also clears.
First-draft's "≥1 of 3 axes clears" was a tautology because UMB
structurally lacks axis 3 — only BURNED could ever clear it.

**Requirements:** Success Criteria + roadmap §9.

**Dependencies:** Unit 6.3 (BURNED §2 + named-operative density per
sampled frame); Unit 6.0 (extract-frames helper).

**Files:**

- Create: `videos/trailer/sample-eval/final-render-qa/bar-raise-eval.md`.
- Create: `videos/trailer/sample-eval/final-render-qa/umb-samples/frame-{N}.png` ×10.
- Create: `videos/trailer/sample-eval/final-render-qa/umb-samples/contact-sheet.png`.
- Create: `videos/trailer/sample-eval/final-render-qa/bar-raise-composite.png`
  — side-by-side 10-row [BURNED | UMB] visual comparison (design-lens #4).
- Create: `videos/trailer/sample-eval/final-render-qa/briggsy-review-6.4.signoff` —
  bar-raise acceptance sentinel.

**Approach:**

**Step 1 — Extract UMB v3 sample frames.**

Cross-project path (feasibility #9). UMB v3 file at
`projects/undercover-mob-boss/videos/trailer/out/trailer-landscape.mp4`,
sibling to BURNED. Use `path.resolve` from `__dirname` for CWD-
independence.

```ts
// videos/trailer/scripts/extract-umb-samples.ts
import { extractFrames, generateContactSheet } from '../../scripts/extract-frames';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';

// UMB sample timecodes per roadmap §9 — use 4439 not 4440 for the last
// sample to avoid end-of-stream extraction edge case
const UMB_SAMPLE_FRAMES = [444, 888, 1332, 1776, 2220, 2664, 3108, 3552, 3996, 4439];
const UMB_SOURCE = resolve(__dirname, '../../../undercover-mob-boss/videos/trailer/out/trailer-landscape.mp4');
const OUT_DIR = 'videos/trailer/sample-eval/final-render-qa/umb-samples';

if (!existsSync(UMB_SOURCE)) {
  throw new Error(
    `UMB v3 baseline not found at ${UMB_SOURCE} — required for bar-raise eval. ` +
    `Set up UMB project at sibling location: projects/undercover-mob-boss/`
  );
}

extractFrames({ source: UMB_SOURCE, frames: UMB_SAMPLE_FRAMES, outDir: OUT_DIR });
generateContactSheet({
  inputDir: OUT_DIR,
  inputPattern: 'frame-%04d.png',
  outPath: `${OUT_DIR}/contact-sheet.png`,
  tile: '5x2',
});
```

**Step 2 — Generate side-by-side composite** (design-lens #4).

```ts
// videos/trailer/scripts/generate-bar-raise-composite.ts
import { execFileSync } from 'node:child_process';

const BURNED_DIR = 'videos/trailer/sample-eval/final-render-qa/sample-frames';
const UMB_DIR = 'videos/trailer/sample-eval/final-render-qa/umb-samples';
const OUT = 'videos/trailer/sample-eval/final-render-qa/bar-raise-composite.png';

const matchedPairs = [
  ['frame-0285.png', 'frame-0444.png'],
  ['frame-0570.png', 'frame-0888.png'],
  ['frame-0855.png', 'frame-1332.png'],
  ['frame-1140.png', 'frame-1776.png'],
  ['frame-1425.png', 'frame-2220.png'],
  ['frame-1710.png', 'frame-2664.png'],
  ['frame-1950.png', 'frame-3108.png'],
  ['frame-2235.png', 'frame-3552.png'],
  ['frame-2520.png', 'frame-3996.png'],
  ['frame-2790.png', 'frame-4439.png'],
];

const rowPaths: string[] = [];
matchedPairs.forEach(([burned, umb], idx) => {
  const rowOut = `videos/trailer/sample-eval/final-render-qa/compare-row-${String(idx).padStart(2, '0')}.png`;
  // SAFE: argv array
  execFileSync('ffmpeg', [
    '-y',
    '-i', `${BURNED_DIR}/${burned}`,
    '-i', `${UMB_DIR}/${umb}`,
    '-filter_complex', 'hstack',
    rowOut,
  ]);
  rowPaths.push(rowOut);
});

// Vertical stack all 10 rows
const vstackArgs = [
  '-y',
  ...rowPaths.flatMap(p => ['-i', p]),
  '-filter_complex', `vstack=inputs=${rowPaths.length}`,
  OUT,
];
execFileSync('ffmpeg', vstackArgs);
console.log(`Bar-raise composite → ${OUT}`);
```

Single PNG with 10 rows [BURNED frame | UMB frame at matched
proportional timecode]. Briggsy reads visually in one pass.

**Step 3 — Axis 1: Named-operative density.**

For each of 10 BURNED frames + 10 UMB frames, count named operatives
visible (silhouette, portrait, dossier photo, illustration panel).

- BURNED operatives: Dash, Vera, Otto, Janet, Neal, Sable, Agent X,
  Dolores Grieves (7 active + 1 NPC).
- UMB operatives: Charon + named UMB mob-boss characters (verify
  UMB roster via `projects/undercover-mob-boss/`).

Compute averages:
```
BURNED avg operatives/frame = (sum of operative counts) / 10
UMB avg operatives/frame    = (sum of operative counts) / 10
```

Verdict: BURNED avg > UMB avg → axis 1 clears.

(Marketing voice stripped per `feedback-proven-not-believed.md` —
no "expected" forecast lines.)

**Step 4 — Axis 2: §2 frame-pass rate.**

Per Unit 6.3 BURNED operational pass rate. UMB v3 pass rate per same
operational §2 rubric applied to UMB samples.

Verdict: BURNED pass rate > UMB pass rate → axis 2 clears.

**Step 5 — Axis 3: Stacked-payoff moment.**

Binary yes/no per trailer:
- Does the trailer have a single beat where visual + audio reveal
  land simultaneously?

BURNED: YES (R3 stacked payoff at frame 1950 — stamp slap + Dash VO
"They WERE the operation." landing simultaneously).
UMB v3: NO (UMB Charon narration is continuous, no stacked-payoff
beat by design).

Axis 3 verdict: CLEARS (BURNED YES + UMB NO).

**Phase 6 deepening axis 3 framing**: Axis 3 is a structural-difference
axis where UMB cannot compete by design. **Clearing axis 3 alone is
not a bar-raise — it is confirmation that R3 was built into BURNED.**
Bar-raise requires the relative-advance proof from axes 1 or 2.

**Step 6 — Bar-raise verdict.**

**Bar-raise passes IFF axis 3 clears AND ≥1 of axes 1/2 also clears.**

| Threshold scenario | Verdict |
|--------------------|---------|
| Axis 3 clears + Axis 1 clears + Axis 2 clears | PASS (strong) |
| Axis 3 clears + Axis 1 clears + Axis 2 fails | PASS (axis-1 advance proven) |
| Axis 3 clears + Axis 1 fails + Axis 2 clears | PASS (axis-2 advance proven) |
| Axis 3 clears + Axis 1 fails + Axis 2 fails | **FAIL — no relative advance over UMB on a comparable axis** |
| Axis 3 fails (any axes 1/2) | FAIL — R3 mechanism broken |

Strips first-draft's marketing-voice "expected outcome" lines; verdict
is execution-time output not planning-time forecast.

**Step 7 — Documentation.**

```md
# Bar-Raise Evaluation vs UMB v3 — Phase 6 Unit 6.4

## Side-by-side composite
See: bar-raise-composite.png (10 rows × 2 cols — BURNED | UMB at
matched proportional timecodes)

## Axis 1 — Named-operative density
- BURNED avg: <N> operatives per sampled frame
- UMB v3 avg: <N> operatives per sampled frame
- Verdict: CLEARS / TIES / DOES NOT CLEAR

## Axis 2 — §2 frame-pass rate (operational rubric)
- BURNED: <N>/10
- UMB v3: <N>/10
- Verdict: CLEARS / TIES / DOES NOT CLEAR

## Axis 3 — Stacked-payoff moment
- BURNED: YES — R3 stacked payoff at frame 1950
- UMB v3: NO — continuous noir narration
- Verdict: CLEARS (structural-difference axis; necessary not sufficient)

## Overall bar-raise (Phase 6 deepening threshold)
- Axis 3 cleared: YES/NO
- Axes 1+2 cleared count: <N> of 2
- Threshold: axis 3 cleared AND ≥1 of axes 1/2 cleared
- VERDICT: PASS / FAIL
```

**Step 8 — Briggsy sign-off sentinel.**

After Briggsy reviews `bar-raise-composite.png` + `bar-raise-eval.md`
+ verdict matches Briggsy's eye, create
`briggsy-review-6.4.signoff`:

```
Phase 6 Unit 6.4 bar-raise evaluation accepted.
- Axis 3: <verdict>
- Axes 1 + 2: <count> cleared
- Overall: PASS / FAIL
Date: <YYYY-MM-DD>
```

Git-committed under Briggsy's author identity; checked by
`pnpm verify:briggsy-sentinels`.

**Patterns to follow:**

- Roadmap §9 acceptance protocol (Phase 6 deepening raises threshold
  per adversarial Attack 1).
- Brainstorm Success Criteria.
- `feedback-proven-not-believed.md` — no marketing voice in axis-
  verdict commentary.

**Test scenarios:**

- **Happy path:** Axis 3 cleared + at least axis 1 OR axis 2 cleared.
- **Failure mode (structural):** Axis 3 alone cleared, axes 1+2 both
  fail → bar-raise FAILS per Phase 6 deepening threshold. Route to
  Phase 4 targeted iteration (add named-operative density via S03
  reveal frame OR cascade halo adjustment; sharpen §2 frame
  composition).
- **Failure mode (R3 broken):** Axis 3 fails → R3 mechanism broken at
  composition or sync level → route to Phase 4 + Phase 1 reopen.

**Verification:**

- 10 UMB sample frames + contact sheet extracted.
- 10 BURNED frames scored on operative density.
- `bar-raise-composite.png` generated.
- `bar-raise-eval.md` documents 3-axis verdicts using Phase-6-
  deepening threshold.
- `briggsy-review-6.4.signoff` committed.

---

### Unit 6.5 — Audio-Video Sync Verification (Manifest-Driven; Asymmetric Tolerance)

- [ ] **Unit 6.5: Audio-Video Sync Verification**

**Goal:** Verify every Dash VO line + cold-open speaker line + scream
beat (if R5 kept per Phase 0/5 outcome) + music-bed envelope syncs to
the intended frame timing under ADR #20 asymmetric tolerance. **Phase
6 deepening replaces first-draft's silencedetect approach** —
silencedetect cannot work on the final mix because the music bed
plays continuously (ADR #16) and the energy envelope never falls
below the -40dB threshold. The manifest-driven approach uses
`audio-manifest.ts` as ground truth + optional VO-only ground-truth
render as cross-check.

**Requirements:** R3 (stacked-payoff sync — ADR #20 R3 tolerance),
R4 (Dash sync), R5 (scream sync — IF R5 kept per Phase 0/5 outcome),
R9 (music envelope), R14 (cold-open sync).

**Dependencies:** Unit 6.2 (trailer.mp4 final render); Phase 2
audio-manifest.ts (locked cue startFrames + actual durations).

**Files:**

- Create: `videos/trailer/sample-eval/final-render-qa/av-sync.md`.
- Create: `videos/trailer/scripts/audit-av-sync.ts` — manifest-driven
  audit script.

**Approach:**

**Step 1 — Per-cue manifest-driven verification.**

silencedetect-on-final-mix path REJECTED per framework-docs Claim 2 +
feasibility #1: music bed continuously above -40dB → zero silence
events → script returns empty.

Manifest-driven approach: read `audio-manifest.ts` `startFrame` values
+ probe source `.wav` file durations once via ffprobe. Composition-
level audio placement per ADR #16 is deterministic — final-render
drift can only come from encoder muxing (sub-frame, well under any
documented tolerance).

```ts
// videos/trailer/scripts/audit-av-sync.ts
import { execFileSync } from 'node:child_process';
import { AUDIO_ASSETS } from '../src/lib/audio-manifest';

const FPS = 30;

for (const cue of AUDIO_ASSETS) {
  // SAFE: argv array
  const out = execFileSync('ffprobe', [
    '-v', 'error',
    '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1',
    cue.src,
  ], { encoding: 'utf-8' });
  const sourceDurSec = Number(out.trim());
  const expectedStartSec = cue.startFrame / FPS;
  const expectedEndSec = expectedStartSec + sourceDurSec;
  console.log(
    `${cue.id}: starts ${expectedStartSec.toFixed(3)}s (frame ${cue.startFrame}), ` +
    `ends ${expectedEndSec.toFixed(3)}s (source ${sourceDurSec.toFixed(3)}s)`
  );
}
```

**Optional VO-only ground-truth cross-check.** Phase 4 deepening can
expose a `muteMusic` prop on `<MusicBed />`; if available, render a
`out/trailer-vo-only.mp4.iterate` (hardware-accelerated, since
ground-truth doesn't need gold-master encoding) and run
silencedetect on the stem to compare onsets against manifest. Cross-
check, not primary signal.

**Step 2 — Drift table with asymmetric tolerance** (ADR #20).

| Cue ID | Expected frame | Detected frame (if cross-checked) | Drift (frames) | Tolerance window | Verdict |
|--------|----------------|-----------------------------------|----------------|------------------|---------|
| s01-cue-60-coldopen | 60 | (manifest-derived or VO-only) | <±N> | [-1, +3] | OK if -1 ≤ drift ≤ +3 |
| s02-cue-240-dash | 240 | | <±N> | [-1, +3] | OK if -1 ≤ drift ≤ +3 |
| ... | ... | ... | ... | ... | ... |
| s04-cue-1950-dash (R3 stacked payoff) | 1950 | | <±N> | **[-1, 0]** | OK if -1 ≤ drift ≤ 0 — audio MUST NOT lead |
| s06-cue-2790-dash (Phrasing) | 2790 | | <±N> | [-1, +3] | OK if -1 ≤ drift ≤ +3 |

(Cue IDs use shorthand from Phase 1/Phase 2 contracts. Actual WAV
filenames per Phase 2 convention `s{NN}-cue-{frame}-{voice}.wav`,
e.g. `s01-cue-60-<speaker>.wav` where `<speaker>` is resolved at Phase
0 Unit 0.3 outcome — sable / vera / janet etc.)

**Step 2b — Diagnose before fixing** (`feedback-diagnose-before-fixing.md`).

If drift detected, isolate the source BEFORE proposing fix:
- Phase 2 LUFS post-process timing drift?
- Phase 4 audio `<Sequence>` placement off?
- Phase 5 atomic-swap re-encode timing (if gameplay sync)?

Don't jump to "regenerate cue 1950" without identifying which Phase
introduced the drift. Route to the correct upstream phase.

**Step 3 — Stacked-payoff R3 special verification.**

R3 acceptance requires visual stamp + audio reveal land simultaneously
at frame 1950. Phase 6 explicitly verifies:

- Extract frame 1950 from `trailer.mp4` (extracted in Unit 6.3 already).
- Verify stamp visible + at expected position (or settling — within
  ±1 frame of slap).
- Verify Dash audio for cue 1950 starts within `[-1, 0]` frames per
  ADR #20 (audio MUST NOT lead).
- **If audio leads visual by ANY amount on R3: HARD FAIL.** Audio
  lead is detectable at +20ms (less than 1 frame) per ITU BT.1359-1;
  the brain's lip-reading bias does not apply to impact gestures.

If R3 sync fails: route to Phase 2 + Phase 4 reopen per Step 2b
diagnose.

**Step 4 — Music-bed envelope verification (Briggsy direct listen).**

Per `feedback-eye-in-loop-beats-calibration-for-motion`: FFmpeg astats
numeric printout misses swell shape. Briggsy LISTENS to the rendered
trailer at the 5 sample frames to verify envelope shape, then Claude
runs astats spot-check for record:

Spot-check the music-bed RMS at 5 sampled frames:
- Frame 60: intro hook → 100% ✓ if loud
- Frame 600: under-S03-build → 55% ✓ if mid
- Frame 1900: cascade peak → 90% ✓ if loud
- Frame 1995: post-payoff drop → 25% ✓ if quiet
- Frame 2790: final sting → 100% ✓ if loud

Briggsy direct listen confirms envelope FEELS like Unit 1.7 Step 5
cue map; Claude astats numeric printout records the measured values.

**Step 5 — Documentation.**

```md
# Audio-Video Sync Verification — Phase 6 Unit 6.5

## Per-cue manifest-driven drift table
[per-cue table per Step 2 with asymmetric tolerance windows]

## Stacked-payoff R3 verification (ADR #20)
- Stamp visible at frame 1950: YES / NO
- Dash audio onset relative to frame 1950: <drift in frames>
- Audio led visual? YES (HARD FAIL) / NO
- R3 acceptance: PASS / FAIL

## Diagnose-before-fix (if any drift)
- Drift source: Phase 2 / Phase 4 / Phase 5 / muxing
- Routed to: <upstream phase>

## Music-bed envelope verification
- Briggsy listen verdict (envelope feels right?): YES / NO
- Claude astats spot-check:
  - Frame 60 intro: <level>%
  - Frame 600 build: <level>%
  - Frame 1900 peak: <level>%
  - Frame 1995 drop: <level>%
  - Frame 2790 sting: <level>%
- Envelope verdict: matches Unit 1.7 cue map / drifts

## R5 scream verification (if R5 kept per Phase 0/5 outcome)
- R5 status (from Phase 0 Unit 0.6 + Phase 5 PHASE-5-EXIT.md): <KEPT / CUT>
- (If KEPT) Cue ID: <id>; drift: <±N>; verdict: PASS / FAIL

## Overall A/V sync verdict: PASS / ITERATE
```

**Patterns to follow:**

- ADR #16 composition-level audio placement (manifest is single source
  of truth).
- ADR #20 asymmetric tolerance.
- `feedback-eye-in-loop-beats-calibration-for-motion` — Briggsy direct
  listen on music envelope.
- `feedback-diagnose-before-fixing` — isolate drift source before fix.

**Test scenarios:**

- **Happy path:** All cues land within asymmetric tolerance; R3
  stacked payoff within [-1, 0]; music envelope listened-verified.
- **Edge case:** R3 drift = +1 frame (audio leads) → HARD FAIL per
  ADR #20 → diagnose source → route to Phase 2 cue regen OR Phase 4
  Sequence-from adjustment.
- **Edge case:** Music envelope flat (no swell) → Phase 4 Unit 4.1
  MusicBed interpolate envelope needs re-tuning.
- **Edge case:** R5 status unresolved at Phase 6 entry → Phase 5
  EXIT document didn't record outcome → block until resolved.

**Verification:**

- `av-sync.md` documents per-cue drift + R3 + music envelope + R5 (if).
- All drift within asymmetric tolerance OR documented + routed.
- Music-bed envelope Briggsy-listened.

---

### Unit 6.6 — Mobile Crop Audit (1:1 Safe-Square + 9:16 Vertical)

- [ ] **Unit 6.6: Mobile Crop Audit**

**Goal:** Verify critical narrative elements survive X's 1.91:1
in-feed preview crop AND X's 2026 9:16 vertical-feed Immersive Media
Viewer crop. Each of 10 sample frames checked under both crops, with
**visual composites** (design-lens #7) — composite PNG per frame
showing [full | cropped | safe-square outlined] so reviewer SEES the
boundary, not a yes/no table cell.

**Requirements:** R8 (16:9 + mobile-safe central square), roadmap
§5.3, ADR #23.

**Dependencies:** Unit 6.3 (sample frames extracted via shared helper).

**Files:**

- Create: `videos/trailer/sample-eval/final-render-qa/mobile-crop-audit.md`.
- Create: `videos/trailer/sample-eval/final-render-qa/sample-frames-cropped/frame-{N}-mobile-composite.png`
  — per-frame visual composite [full-outlined | 1:1 crop].
- Create: `videos/trailer/sample-eval/final-render-qa/sample-frames-9x16/frame-{N}-9x16.png`
  — 9:16 center-crops per ADR #23.

**Approach:**

**Step 1 — Generate center-square (1:1) crops + visual composites** (design-lens #7).

X mobile 1.91:1 in-feed crop math: 1920 / 1.91 = **1005.24** → 1920×1005
(rounding to 1005, NOT 1006 as first-draft asserted; off-by-one fix
per framework-docs Claim 4 + coherence Finding 2). Within 1920×1080,
the crop is centered, leaving ~37-38 pixel bands top/bottom invisible
((1080 - 1005) / 2 = 37.5).

For trailer safety, BURNED targets the tighter **1:1 (1080×1080)**
central square per Phase 1 Unit 1.5 Step 3. This is more conservative
than X's actual crop. If 1:1 elements are safe, 1.91:1 elements are
definitely safe.

```ts
// videos/trailer/scripts/audit-mobile-crops.ts
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';

const SAMPLE_FRAMES = [285, 570, 855, 1140, 1425, 1710, 1950, 2235, 2520, 2790];
const SRC_DIR = 'videos/trailer/sample-eval/final-render-qa/sample-frames';
const CROP_DIR = 'videos/trailer/sample-eval/final-render-qa/sample-frames-cropped';
const VERT_DIR = 'videos/trailer/sample-eval/final-render-qa/sample-frames-9x16';
[CROP_DIR, VERT_DIR].forEach(d => { if (!existsSync(d)) mkdirSync(d, { recursive: true }); });

for (const frame of SAMPLE_FRAMES) {
  const padded = String(frame).padStart(4, '0');
  const src = `${SRC_DIR}/frame-${padded}.png`;

  // 1:1 (1080×1080) center crop
  const cropOut = `${CROP_DIR}/frame-${padded}-1x1.png`;
  execFileSync('ffmpeg', [
    '-y', '-i', src,
    '-vf', 'crop=1080:1080:420:0',
    cropOut,
  ]);

  // Outlined version (safe-square outline overlaid on full frame)
  const outlinedOut = `${CROP_DIR}/frame-${padded}-outlined.png`;
  execFileSync('ffmpeg', [
    '-y', '-i', src,
    '-vf', 'drawbox=x=420:y=0:w=1080:h=1080:color=red@0.8:t=4',
    outlinedOut,
  ]);

  // Composite [full-outlined | 1:1 crop] side-by-side
  const compositeOut = `${CROP_DIR}/frame-${padded}-mobile-composite.png`;
  execFileSync('ffmpeg', [
    '-y',
    '-i', outlinedOut,
    '-i', cropOut,
    '-filter_complex', 'hstack',
    compositeOut,
  ]);

  // 9:16 vertical center-crop per ADR #23
  // At 1080-pixel height, 9:16 width = 1080 × 9/16 = 607.5 → 607px
  // Center: x = (1920 - 607) / 2 = 656.5 → 656
  const vertOut = `${VERT_DIR}/frame-${padded}-9x16.png`;
  execFileSync('ffmpeg', [
    '-y', '-i', src,
    '-vf', 'crop=607:1080:656:0',
    vertOut,
  ]);
}
```

**Step 2 — Per-frame mobile-crop audit table.**

Reviewer evaluates composite PNGs (not tables) — sees the boundary
directly. Table records verdicts:

| Frame | 1:1 hero visible? | 1:1 R15 visible? (if any) | 9:16 hero visible? | 9:16 R15 visible? (if any) | Verdict |
|-------|-------------------|---------------------------|--------------------|----------------------------|---------|
| 285 (S02 dossier) | Y/N | n/a | Y/N | n/a | PASS/TBD |
| 570 (S02→S03 boundary) | Y/N | n/a | Y/N | n/a | |
| 855 (S03 roster) | Y/N | n/a | Y/N | n/a | |
| 1140 (S04 cascade open) | Y/N | n/a | Y/N | n/a | |
| 1425 (S04 stat 2 + halo) | Y/N | n/a (stat = flourish) | Y/N | n/a | |
| 1710 (S04 halo + ticker) | Y/N | n/a (ticker = flourish) | Y/N | n/a | |
| 1950 (S04 stacked payoff) | Y/N | Y/N | Y/N | Y/N | |
| 2235 (S05 gameplay) | Y/N | n/a | Y/N | n/a | |
| 2520 (S05 iris) | Y/N | n/a | Y/N | n/a | |
| 2790 (S06 closing) | Y/N | Y/N | Y/N | Y/N | |

Critical narrative elements MUST be visible. Side-band elements
(comms-ticker, side captions, S03 right-edge operatives in cast
roster) acceptable if documented as flourish.

**Step 3 — Action on failures.**

If 1:1 audit fails (hero outside safe-square): route to Phase 4
scene re-composition (move hero into center).

If 9:16 audit fails (hero outside 607px-wide vertical strip): **feeds
Phase 7 cutdown decision** — Phase 7 may opt to (a) skip the vertical-
feed surface for this frame's scene, (b) re-compose for vertical
safety in Phase 4, or (c) accept the loss for that scene.

Verdict feeds Phase 7 via the cutdown-frame-list.md artifact (Unit
6.8).

**Step 4 — Documentation.**

`mobile-crop-audit.md` records per-frame audit table + composite
references + 9:16 cutdown feasibility verdict (GO / NEEDS-RECOMPOSE
/ NOGO per scene).

**Patterns to follow:**

- Roadmap §5.3 mobile-crop rule + ADR #23 9:16 audit addition.
- Phase 1 Unit 1.5 Step 3 safe-square design discipline.
- design-lens deepening #7 — visual artifact, not table cells.

**Test scenarios:**

- **Happy path:** All 10 frames pass 1:1 mobile-crop audit; most
  frames pass 9:16 (some marginal scenes may fail vertical for
  acceptable reasons documented in Step 3).
- **Edge case:** S03 roster reveal has right-edge operatives outside
  1:1; acceptable IF they're flourish (cast-density chrome, not
  primary hero); document as known-side-band.
- **Edge case:** 1:1 hero is fine, 9:16 hero clipped → Phase 7 may
  skip vertical for that scene; not a Phase 6 fail.

**Verification:**

- 10 1:1 cropped frames + 10 outlined + 10 mobile-composite + 10
  9:16-cropped extracted.
- `mobile-crop-audit.md` populated with per-frame audit + 9:16 cutdown
  feasibility row.

---

### Unit 6.7 — Decode Test (N=6 + Control + Q1/Q2) + Final QA Report

- [ ] **Unit 6.7: Decode Test + Final QA Report**

**Goal:** Run the no-context-engineering-peer decode test on the full
95-second trailer per ADR #21 (N=6 panel + UMB control + Q1/Q2 +
keyword precision). Then aggregate all Phase 6 Unit results into the
final QA report + Briggsy end-to-end watch + Briggsy sentinel sign-off.

**Requirements:** Success Criteria + R14 + R15 + ADR #21 panel
protocol.

**Dependencies:** Units 6.0 (recruitment), 6.2, 6.3, 6.4, 6.5, 6.6
complete.

**Files:**

- Create: `videos/trailer/sample-eval/final-render-qa/decode-test.md`.
- Create: `videos/trailer/sample-eval/final-render-qa/decode-audio/tester-{N}.{m4a,ogg}` —
  voice-memo recordings.
- Create: `videos/trailer/sample-eval/final-render-qa/qa-report.md` —
  aggregate (verdict-first structure per design-lens #5).
- Create: `videos/trailer/sample-eval/final-render-qa/briggsy-review-6.7.signoff` —
  final QA sign-off sentinel (ADR #22).

**Approach:**

**Step 1 — Decode test protocol (ADR #21).**

Panel size + control + priors elicitation per ADR #21:
- **Listeners**: ≥6 engineering-peer testers (Unit 6.0 confirmed
  panel + 1 hot-spare reserve).
- **Priors elicitation** (pre-test): for each tester, ask "When you
  see a project from Briggsy on Discord, what's your prior on how it
  was built?" Exclude testers whose unprompted answer already names
  "AI / agent / autonomous / Claude". Document elimination.
- **UMB v3 control panel**: same 6 testers watch UMB v3 trailer
  FIRST (cold, no setup). Record whether they surface autonomy hook
  for UMB. If ≥2 of 6 do, panel contaminated by priors → re-recruit.
- **BURNED stimulus**: full 95-second trailer played cold.
- **Q1 (free recall, asked AFTER playback)**: "First thing that pops
  into your head — give me the 30-60-second dump. What do you think
  this trailer is about and how do you think it was made?"
- **Q2 (prompted recall, asked AFTER Q1 transcript complete)**:
  "Anything you noticed about HOW this trailer was made — production
  process, tooling, anything like that?" Q2 does NOT feed the ≥3/6
  threshold; it feeds failure-route triage only.

**Acceptance**: ≥3 of 6 BURNED testers surface "AI / agent /
autonomous / built itself" unprompted in Q1 (within 90s post-stimulus
reaction window, timed from end of trailer to tester's 90-second
mark).

**Keyword precision (ADR #21)**: must refer to PROJECT BUILD PROCESS
or AGENT AUTHORSHIP. Counts: "AI built the game," "Claude wrote
this," "an agent built it," "autonomous development." Does NOT count:
"looks AI-generated," "the video is AI-rendered," "the visuals are
made by Midjourney." Briggsy adjudicates ambiguous cases and records
reasoning.

**Step 2 — Tester response recording.**

**Mechanism** (feasibility #11 lock): Tester records 90-second Q1
reaction via phone voice memo OR Discord voice DM to Briggsy. Briggsy
uploads audio to `decode-audio/tester-{N}.{m4a,ogg}`. Claude transcribes
via `mcp__gemini-grounding__search_with_grounding` audio capability
OR Briggsy types verbatim during/after call. Either way: path named,
actor named, artifact committed.

For each tester, recorded in `decode-test.md`:

```md
### Tester N
**Decode: YES / NO — "<5-word trigger phrase or 'no autonomy hook surfaced'>"**

Pre-test profile:
- Engineering-peer? YES / NO
- Has seen UMB v3? YES / NO
- LLM/agent tooling exposure (Claude, Cursor, etc.)? YES / NO

UMB control:
- Surfaced autonomy hook for UMB v3? YES / NO

BURNED Q1 verbatim transcript:
[60-90 second transcript]

BURNED Q2 verbatim transcript (if Q1 didn't surface):
[prompted-recall transcript]

Briggsy keyword adjudication:
- Surfaced BUILD-PROCESS / AGENT-AUTHORSHIP terms? YES / NO
- Surfaced only RENDER-TECHNOLOGY terms? YES / NO
- Verdict: SURFACED / DID NOT SURFACE
```

Lead "Decode: YES/NO" label (design-lens #8) is mandatory at top of
each entry — saves reviewer a transcript read for go/no-go judgment.

**Step 3 — Failure-action routing only** (scope-guardian Challenge 3).

Phase 6 detects, does not fix. If <3 of 6 BURNED testers surface
autonomy hook:

- Q1-fail / Q2-pass for ≥3 of 6: signal is SEEDED BUT NOT SURFACED →
  R15 chrome layer insufficient → **route to Phase 3 + Phase 4** for
  R15 placement iteration (additional R15 instances OR more visible
  placement). NOTE: this is mini-phase-reopen, NOT cheap — Phase 1
  typography re-lock + Phase 3 asset prep + Phase 4 placement.
- Q1-fail / Q2-fail for ≥3 of 6: signal is NOT LANDING → R14 cold-
  open weak → **route to Phase 1 Unit 1.2 reopen + Phase 2 cue 60
  regen**.
- Both fail across panel: **product-level brainstorm reopen** —
  signaling mechanism (R14 + R15 + Dash VO) collectively fails to
  decode; escalate to Briggsy for structural reframe.

Phase 6 records routing decision in `decode-test.md`; does NOT execute
remediation. Phase 6 is detect-not-fix per System-Wide Impact.

**Step 4 — Aggregate QA report (verdict-first structure per design-lens #5).**

`qa-report.md`:

```md
# Final Trailer QA Report — Phase 6 Sign-Off

## VERDICT
**Phase 6: GO for Phase 7 distribution** / **Phase 6: ITERATE — <axis> failed**

## Sub-verdicts (all must PASS for GO)
| Check | Verdict | Routing if FAIL |
|-------|---------|-----------------|
| `verify:trailer-final` machine gate | PASS / FAIL | Phase 6 Unit 6.1 rerender |
| §2 frame-pass rate (≥8/10, Unit 6.3) | PASS / FAIL | Phase 4 failing-scene rerender |
| Bar-raise vs UMB v3 (axis 3 + ≥1 of axes 1/2, Unit 6.4) | PASS / FAIL | Phase 4 targeted iteration |
| Audio-video sync (asymmetric tolerance, Unit 6.5) | PASS / FAIL | Phase 2 / Phase 4 per diagnose |
| Mobile crop audit (1:1 + 9:16, Unit 6.6) | PASS / FAIL | Phase 4 scene re-composition |
| Decode test (≥3 of 6 surface, Unit 6.7) | PASS / FAIL | Per Step 3 routing |
| R13 acceptance (Phase 5 EXIT inherited) | PASS / FAIL | Phase 5 reopen |

## Detail — FAIL sections only
[Expanded detail for any FAIL sub-verdict; PASS sections collapsed below]

## Deliverable
- File: `videos/trailer/out/trailer.mp4`
- Duration: <measured>s (target 95.0 ±0.5s)
- File size: <N> MB
- Codec: H.264 High / CRF 18 / `--x264-preset slow` / yuv420p / AAC 128k mono / -16 LUFS / faststart

## Distribution-target playback verification
[Mirror from render-settings-log.md Step 4 table]

## Briggsy end-to-end watch (Step 4a)
- Date: <YYYY-MM-DD>
- Player(s) used: <list>
- Notes: <any observations>

## Briggsy sign-off
- `briggsy-review-6.4.signoff`: committed under briggsy007@gmail.com on <date>
- `briggsy-review-6.7.signoff`: committed under briggsy007@gmail.com on <date>
- Hand-off to Phase 7: GO / NOGO
```

**Step 4a — Briggsy end-to-end watch (load-bearing gate)** (`feedback-elite-team-standard.md`).

BEFORE sign-off, Briggsy watches `out/trailer.mp4` end-to-end in at
least one player (Films & TV / Chrome / Safari iOS / etc.). **Sign-
off is conditional on the watch, NOT on `qa-report.md` verdicts.**
`qa-report.md` is auxiliary evidence; the watch is authority.

Record watch in qa-report.md Briggsy section above.

**Step 5 — Sign-off sentinel ceremony (ADR #22).**

If all 6 sub-verdicts PASS + Briggsy watch confirms quality:

`briggsy-review-6.7.signoff` content:
```
Phase 6 final QA approved. GO for Phase 7 distribution.
- All 6 sub-verdicts PASS
- Briggsy watched out/trailer.mp4 end-to-end on <date>
- bar-raise: PASS (axis 3 + axes <1/2> count)
- decode: PASS (<N>/6 surfaced)
- Hand-off: GO
Date: <YYYY-MM-DD>
```

Git-committed under Briggsy's git author identity
(`briggsy007@gmail.com`); `pnpm verify:briggsy-sentinels` enforces
author-check.

**Step 6 — Distribution hand-off.**

If sentinel committed:
- `out/trailer.mp4` finalized
- `out/thumbnail.png` finalized
- Phase 6 exits; Phase 7 begins (Phase 7 entry gate checks sentinel)

**Patterns to follow:**

- ADR #21 decode-test protocol.
- ADR #22 sign-off ceremony.
- `feedback-elite-team-standard.md` — verify → then lock; Briggsy
  watches actual output.
- `feedback-verify-before-presenting.md` — Briggsy reviews actual
  rendered output.
- Phase 5 sentinel pattern (briggsy-review-5.4 / 5.6).
- `feedback-stop-thrashing.md` — one fix at a time; if decode fails
  + routes to Phase 4, execute Phase 4 work + retest + verify before
  any other change.

**Test scenarios:**

- **Happy path:** All 6 sub-verdicts PASS; Briggsy watches end-to-end;
  sentinel committed; hand-off GO.
- **Edge case:** Decode test ≥3 of 6 BUT UMB control panel ALSO
  surfaced autonomy ≥2 of 6 → panel contaminated; re-recruit; re-run.
- **Edge case:** Bar-raise clears axis 3 only → FAIL per Phase 6
  deepening threshold; route to Phase 4 axis-1 or axis-2 iteration.
- **Edge case:** Briggsy watches end-to-end and feels something is
  off that no audit caught → sign-off withheld; iterate per Briggsy
  direction; this is the eye-in-loop catching what calibration missed.

**Verification:**

- Decode test runs with ≥6 testers + UMB control panel.
- `decode-test.md` documents Q1/Q2 responses + Briggsy adjudication.
- `qa-report.md` aggregates all Phase 6 verdicts (verdict-first
  structure).
- Briggsy end-to-end watch logged.
- `briggsy-review-6.7.signoff` committed under Briggsy's git author;
  `pnpm verify:briggsy-sentinels` passes.

---

### Unit 6.8 — Phase 6 Exit + Cutdown Frame List (Phase 7 Handoff)

- [ ] **Unit 6.8: Phase 6 Exit + Cutdown Frame List**

**Goal:** Produce the two handoff artifacts Phase 7 reads — a
PHASE-6-EXIT.md handoff document (design-lens #9) mirroring Phase 5's
PHASE-5-EXIT.md pattern, AND a cutdown-frame-list.md identifying
recommended source-frame ranges for the X-native short-form cutdown
Phase 7 ships (adversarial Attack 8).

**Requirements:** Phase 7 cutdown source-of-truth contract; Phase 7
entry sentinel check.

**Dependencies:** Units 6.1-6.7 complete; sentinels signed.

**Files:**

- Create: `videos/trailer/sample-eval/final-render-qa/PHASE-6-EXIT.md`.
- Create: `videos/trailer/sample-eval/final-render-qa/cutdown-frame-list.md`.

**Approach:**

**Step 1 — Write PHASE-6-EXIT.md.**

```md
# Phase 6 Exit — Handoff to Phase 7

## Deliverable inventory
- `videos/trailer/out/trailer.mp4` — H.264 / CRF 18 / `--x264-preset slow` /
  yuv420p / 30fps 1920×1080 / AAC 128k mono / -16 LUFS / +faststart /
  <measured duration>s / <measured size> MB
- `videos/trailer/out/thumbnail.png` — frame <N> per Unit 6.2 Step 3
  selection rule

## QA verdict (summary)
- §2 frame-pass rate: <N>/10 — PASS / FAIL
- Bar-raise: axis 3 <CLEARS/FAILS> + axes 1/2 cleared <count> — PASS / FAIL
- A/V sync (asymmetric tolerance): PASS / FAIL
- Mobile crop (1:1 + 9:16): PASS / FAIL
- Decode test (N=6 + control): <N>/6 surfaced — PASS / FAIL
- R13 gameplay: PASS / FAIL
- Overall: GO / NOGO for Phase 7

## Known issues for Phase 7 to be aware of
- [Any PASS-with-notes items — e.g., S03 roster operatives in side-band; acceptable by documented rule]
- [Any deferred iterations — e.g., axis 1 bar-raise tied not cleared]
- [Any platform-specific playback edge case — e.g., Edge requires X re-encode for in-feed; mitigate via Phase 7]

## Briggsy approval
- `briggsy-review-6.4.signoff`: committed <date> by briggsy007@gmail.com
- `briggsy-review-6.7.signoff`: committed <date> by briggsy007@gmail.com
- End-to-end watch confirmed: <date> in <player>
- Hand-off to Phase 7: GO / NOGO

## Cross-phase amendments still pending (Phase 7 should not block on these)
- [List any cross-phase amendments surfaced during Phase 6 deepening that
  Phase 7 should be aware of but doesn't block on]
```

**Step 2 — Write cutdown-frame-list.md.**

Phase 7 needs to produce an X-native short-form cutdown (12-15s per
roadmap §5.4) from the 95s trailer. Phase 6 identifies which sub-runs
preserve the load-bearing signals so Phase 7 starts from a verified
spec, not a guess.

```md
# Cutdown Frame List — Phase 7 Source-of-Truth

## Required preserved signals (any X-native cutdown MUST retain ≥2 of 3)
1. R14 cold-open decode (frames 0-150 — the autonomy hook)
2. R3 stacked-payoff (frames 1880-2000 — the audio-visual co-land)
3. R13 gameplay-real (frames 2100-2700 — the "it ships" proof)

## Recommended cutdown source ranges

### Option A — Pure hook (12s)
- Frames 0-150 (cold-open + R14)
- Frames 1880-2000 (stacked payoff)
- Frames 2790-2850 (BURNED logo close + R15 #4)
- Cuts: hard
- Preserves: R14 + R3 + closer chrome
- 9:16 vertical-feed safe per Unit 6.6 audit? <YES/NO/MIXED>

### Option B — Hook + game (15s)
- Frames 0-150 (cold-open + R14)
- Frames 2235-2520 (gameplay representative segment)
- Frames 2790-2850 (closer)
- Preserves: R14 + R13 + closer chrome
- 9:16 vertical-feed safe per Unit 6.6 audit? <YES/NO/MIXED>

### Option C — Maximum density (15s)
- Frames 60-100 (R14 spike only, 1.3s)
- Frames 1880-2000 (stacked payoff)
- Frames 2235-2400 (gameplay tight)
- Frames 2790-2850 (closer)
- Preserves: R14 + R3 + R13 + closer
- Risk: dense cuts may break decode for cold viewers
- 9:16 vertical-feed safe? <YES/NO/MIXED>

## 9:16 cutdown feasibility (per Unit 6.6 9:16 audit)
- Frames safe for 9:16: <list of frame ranges>
- Frames requiring re-composition for 9:16: <list>
- Cutdown that fits 9:16 without re-composition: Option <A/B/C>

## Recommendation for Phase 7
- Primary X-native: Option <A/B/C>
- Reasoning: <short>
```

**Phase 7 contract (tightened 2026-05-17 per Phase 7 deepening
cross-phase amendment):** Phase 7 picks ONE of the documented
Options A/B/C; Phase 7 does NOT invent a 4th option. If Phase 6
marks a Primary recommendation, Phase 7 defaults to it. Phase 7 may
override the Primary only with a `briggsy-review-7.1.signoff`
sentinel documenting the override reason (e.g., cutdown standalone
§2 audit per Phase 7 ADR #25 FAILs on the Primary; an alternate
Option clears the audit). Pre-deepening Phase 7 invented a 4th
option ("Candidate B — cascade peak → gameplay" at frames 1860–
2220 — not present in any Phase 6 Option) which is now structurally
prevented.

**Composed-not-mid-motion verdict per Option (added 2026-05-17
per Phase 7 deepening + ADR #25):** Each Option's segment START_FRAMEs
must be annotated:

```md
- Composed-not-mid-motion verdict on START_FRAME of each segment:
  - Segment N (frame X): <PASS — settled state / FAIL — inside ease window per `transitions.ts` line Y>
  - (Cross-reference Unit 6.2 Step 3 selection rule + Phase 7 ADR #25)
```

For Option A/C frame 1880 (R3 stacked-payoff segment start): PASS —
20 frames past the ticker-brightening ease completion at 1860 per
Phase 1 line 1326 amended row (held bright 1860-1950).

**Expected cutdown file size per Option (added 2026-05-17 per Phase
7 deepening + ADR #28):** Each Option includes file size estimate
at production encoding (CRF 18 / `--x264-preset slow` / mono AAC
128k):

```md
- Expected file size at production encoding: <N> MB (Phase 7 hard
  cap 50 MB — well under X 512 MB cap; >50 MB triggers note-but-not-
  fail in Phase 7 Unit 7.1 cutdown-eval.md). VBR average target 8-
  12 Mbps per ADR #28; CRF 18 + preset slow naturally lands 12-18
  Mbps for action content within 25 Mbps platform ceiling.
```

**9:16 cutdown feasibility — Phase 7 contract (clarified 2026-05-17
per Phase 7 deepening):** Phase 7 Unit 7.1 Step 6 reads the 9:16
verdict per the selected Option and:
- **GO** → renders second cutdown via `vf
  "crop=607:1080:656:0,scale=1080:1920:flags=lanczos"`
- **NEEDS-RECOMPOSE** → skips with documented reason; does NOT
  recompose from Phase 7 (Phase 4 work; out of Phase 7 scope)
- **NOGO** → skips vertical surface for this trailer

**Step 3 — Final commit + Phase 6 close.**

After PHASE-6-EXIT.md + cutdown-frame-list.md committed, Phase 6 is
complete. Phase 7 entry gate checks for `briggsy-review-6.7.signoff`
+ presence of both Unit 6.8 artifacts; if all present, Phase 7
proceeds.

**Patterns to follow:**

- Phase 5 PHASE-5-EXIT.md handoff pattern.
- Cutdown frame-range surface inspired by Phase 5 mechanism selection
  exit documentation.

**Test scenarios:**

- **Happy path:** Both artifacts committed; Phase 7 entry check passes.
- **Edge case:** All 3 cutdown options fail 9:16 audit → Phase 7
  recommendation is "ship 16:9 only, skip vertical-feed surface" OR
  route to Phase 4 for vertical re-composition.

**Verification:**

- `PHASE-6-EXIT.md` exists with all sections filled.
- `cutdown-frame-list.md` exists with ≥3 cutdown options analyzed.
- Phase 7 entry sentinel check passes.

---

## System-Wide Impact

- **Interaction graph:** Phase 6 ingests Phase 4 composition output
  (possibly the `trailer-scene-build.mp4` candidate for promotion) +
  Phase 5 `public/trailer/gameplay.mp4`; produces final
  `out/trailer.mp4` + QA report + cutdown frame list. Phase 7
  receives the final + QA verdict + cutdown spec.
- **Error propagation:** Any sub-verdict failure ROUTES (does not
  fix) to the responsible upstream phase with documented diagnosis.
  No silent fail; no Phase-6-owned remediation menu.
- **State lifecycle risks:** Phase 6 produces the final asset; if
  iterations happen, atomic-swap pattern (`.new` → verify → mv)
  preserves the prior good render during each iteration.
- **API surface parity:** None — Phase 6 produces video output.
- **Integration coverage:** Phase 6 is the integrated end-to-end QA
  pass; covers all R1–R15 collectively.
- **Unchanged invariants:** BURNED game code untouched **in the
  primary path**. If Phase 6 triggers Phase 5 reopen (R13 gameplay
  retake), game-infrastructure changes (`pnpm dev:stack` deck-seed
  config, server state) are possible per Phase 5's deterministic-
  capture contract. Trailer composition code remains isolated from
  BURNED client source.

---

## Risks & Dependencies

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| §2 frame-pass rate <8/10 | Medium | High (per Success Criteria) | Operational rubric per Unit 6.3 Step 2 prevents gut-chase re-evaluation; per-failure-frame recompose (Phase 4 scene iteration) routes cleanly. |
| Bar-raise axis 3 cleared but axes 1+2 both fail → bar-raise FAIL per Phase 6 deepening threshold | Medium | High | Adversarial Attack 1 amendment; Phase 4 targeted iteration on axis 1 (named-operative density) or axis 2 (§2 frame-pass). |
| Decode test <3 of 6 surface | Medium | High | Q1/Q2 protocol distinguishes seeded-not-surfaced (Phase 3/4 fix) from not-landing (Phase 1/2 fix); routing-only response, no remediation menu. |
| Decode panel contaminated by priors (≥2 of 6 surface for UMB v3 control) | Low-Medium | High | Priors elicitation pre-test + UMB control panel; re-recruit if contaminated. |
| Decode-test recruitment slips (testers drop out / unavailable) | Medium | High | Unit 6.0 recruitment is prerequisite, not Unit 6.7 just-in-time; 1 hot-spare reserve in panel; recruitment starts during Phase 5 execution. |
| Audio onset drift on R3 — audio LEADS visual by ≥1 frame | Low | HARD FAIL per ADR #20 | Unit 6.5 Step 3 explicit check; diagnose-before-fix routes drift source to Phase 2 or Phase 4. |
| Audio-video drift after final encode (standard cues) | Low | Medium | Unit 6.5 manifest-driven audit; asymmetric tolerance per ADR #20. |
| ADR #14 LUFS/mono spec drift in final render | Low | High | `verify:trailer-final` machine gate (Unit 6.0) asserts LUFS ±0.5 + channels=1. |
| Encoding produces file too large for X | Low | Low | Unit 6.1 Step 3 pre-test projection; conditional maxrate cap. |
| Encoding profile incompatible with X mobile player (Safari iOS / Android Chrome) | **Medium** | **High** | Unit 6.2 Step 4 mandatory mobile-device playback + X staging upload before Phase 6 exit (adversarial Attack 10). |
| Render-time wall-clock exceeds 30 min on full slow-preset | Medium | Medium | Pre-test projection at Unit 6.1 Step 3; `render:iterate` hardware-accelerated path for iteration loops; software libx264 slow only for gold master. |
| Thumbnail frame doesn't sell trailer in feed preview | Low | Low | Selection rule (Unit 6.2 Step 3): default 2790; fallback 180; 1950 only if extracted still reads as composed-not-mid-motion. |
| Mobile crop audit reveals critical element side-banded (1:1) | Low | Medium | Phase 4 scene re-composition; targeted fix. |
| 9:16 vertical audit fails on scenes meant for vertical-feed surface | Medium | Low-Medium | Cutdown-frame-list.md (Unit 6.8) feeds Phase 7 decision (re-compose vs skip vertical surface). |
| UMB v3 sample extraction fails (cross-project path) | Low | Low | `path.resolve` from `__dirname` + existsSync guard with named error (Unit 6.4 Step 1). |
| `--preset` vs `--x264-preset` regression (silent fallback to medium) | Low (deepening fixed) | Medium | ADR #19 + Unit 6.0 verify-script + Phase 0 ADR sync. |
| silencedetect-on-final-mix returns empty under continuous music bed | Low (deepening replaced approach) | n/a | Unit 6.5 Step 1 manifest-driven approach. |
| Briggsy sign-off lost or ambiguous | Low | Medium | `.signoff` sentinels (ADR #22) git-author-checked; `pnpm verify:briggsy-sentinels` enforces. |
| Phase 4 follow-up `force_original_aspect_ratio=increase` cross-phase amendment not applied | Low | Medium | Phase 5 deepening surfaced this; Phase 6 cannot proceed cleanly with placeholder render if Phase 4 amendment unapplied. Verify Phase 4 amendment closed before Unit 6.1 RERENDER path. |

---

## Open Questions

### Resolved During Planning (or via Phase 6 Deepening)

- **Production encoding settings** (ADR #19): CRF 18 / `--x264-preset
  slow` / no `--tune` / yuv420p / AAC 128k mono / faststart / no
  maxrate (conditional cap only if pre-test projects >280MB).
- **CLI flag `--preset` is INVALID for Remotion** — use `--x264-preset`
  (Phase 6 deepening corrects first-draft regression; aligns with
  Phase 0 ADR `render:final` script).
- **`--tune` selection**: omit entirely; mixed content (illustration
  + capture + UI) doesn't fit `film` or `animation` tune; default psy-
  RD is correct for heterogeneous sources (FFmpeg wiki guidance).
- **libx265 / HEVC**: REJECTED. X re-encodes all uploads to H.264;
  HEVC upload yields zero delivery benefit and double-compresses.
- **CRF 17 → CRF 18 reconciliation**: industry visually-lossless
  threshold for 1080p; CRF 17 sub-perceptual gain discarded by X re-
  encode; reconciles roadmap §3 + Phase 0 ADR.
- **AV-sync tolerance** (ADR #20): asymmetric — standard cues `[-1,
  +3]` frames; R3 `[-1, 0]` frames; audio MUST NOT lead R3.
- **Decode test panel size** (ADR #21): N=6 (not N=2 first-draft
  inheritance from Phase 0 Unit 0.3 spike); + UMB control panel +
  priors elicitation + Q1/Q2 + keyword precision.
- **Sampling protocol**: 10 frames at fixed timecodes for both
  BURNED and UMB v3 comparison. UMB last sample uses frame 4439
  (not 4440 — end-of-stream edge).
- **Mobile-crop targets** (ADR #23): tighter 1:1 (1080×1080)
  safe-square within 16:9 frame AND 9:16 vertical-feed audit (607×
  1080 within 1920×1080 source).
- **Bar-raise pass threshold** (Phase 6 deepening): axis 3 cleared
  (necessary) AND ≥1 of axes 1/2 cleared (relative-advance proof).
  Axis 3 alone insufficient.
- **§2 rubric**: operational decidable criteria per Unit 6.3 Step 2
  (replaces gut-call rubric).
- **Failure-action response**: Phase 6 detects + routes to upstream
  phases; does NOT execute remediation menus (per scope-guardian
  Challenge 3).
- **silencedetect-on-final-mix**: REJECTED for VO onset detection
  (music bed continuous); manifest-driven approach via Unit 6.5
  Step 1.
- **Sign-off ceremony** (ADR #22): `.signoff` sentinels (6.0a, 6.4,
  6.7) committed under Briggsy's git author identity.
- **Atomic-swap pattern**: `.new` → verify → mv (mirrors Phase 5
  `gameplay.mp4` pattern).
- **Thumbnail selection rule**: default frame 2790 (visual closure);
  fallback 180; 1950 reserved for last-resort.
- **Thumbnail README derivative (added 2026-05-17 per Phase 7
  deepening cross-phase amendment + frontend-design Tier 1.2):**
  Additionally produce `docs/trailer/thumbnail.jpg` — 1200×675 JPEG
  q85, target <100 KB. Phase 6 generates via single FFmpeg
  invocation after `out/thumbnail.png` selection (Unit 6.2 Step 3):
  `ffmpeg -y -i out/thumbnail.png -vf scale=1200:675:flags=lanczos
  -q:v 2 docs/trailer/thumbnail.jpg`. Phase 7 Unit 7.1b references
  this derivative as a Release asset; Phase 7 Unit 7.2
  `portfolio-embed.md` may reference it as a poster image for the
  tertiary portfolio-site surface. Commit at Phase 6 close.
- **Tester recording mechanism** (feasibility #11): phone voice memo
  / Discord DM → Briggsy uploads → `decode-audio/tester-{N}.{m4a,ogg}`
  → Gemini-grounding transcription or Briggsy types verbatim.
- **Cross-browser playback target list**: Films & TV + WMP + VLC +
  Chrome + Edge desktop + iOS Safari real device + Android Chrome
  real device + X staging upload (QuickTime deprecated on Windows
  since 2016 — removed).
- **Eye-in-loop vs script-audit assignment**: documented in Critical
  Constraints section — Briggsy direct-watches Units 6.4 R3 + 6.5
  music envelope + 6.7 end-to-end; Claude script-audits Units 6.0 /
  6.1 / 6.5 manifest drift / 6.6 mobile-crop tables.

### Deferred to Implementation

- **Specific decode-test tester recruitment**: Briggsy's Discord
  network. Unit 6.0 recruits (NOT deferred to Unit 6.7).
- **Whether axis 1 (operative density) ties with UMB** vs clears —
  measurement at execution time.
- **Whether to add bitrate maxrate cap**: depends on Unit 6.1 Step 3
  pre-test projection.
- **PROMOTE vs RERENDER decision** at Unit 6.1 Step 0: depends on
  Phase 4 `trailer-scene-build.mp4` candidate verify-trailer-final
  outcome.
- **9:16 cutdown ship-decision at Phase 7**: depends on Unit 6.6 +
  Unit 6.8 cutdown-frame-list.md feasibility verdicts.

---

## Documentation / Operational Notes

- All Phase 6 artifacts land in `videos/trailer/out/` (final MP4 +
  thumbnail) and `videos/trailer/sample-eval/final-render-qa/`.
- Phase 6 final deliverables: `out/trailer.mp4` + `out/thumbnail.png`
  + `qa-report.md` + `PHASE-6-EXIT.md` + `cutdown-frame-list.md`.
- Decode test recruitment: Briggsy's Discord network (Harry + others
  per `user_harry.md`). Recruit during Phase 5 execution.
- Sign-off ceremony per ADR #22: `.signoff` sentinels committed under
  Briggsy's git author identity (`briggsy007@gmail.com`); `pnpm
  verify:briggsy-sentinels` enforces.
- `feedback-verify-before-presenting.md` — Briggsy reviews actual
  rendered MP4 in multiple players (not just Remotion studio
  preview); Step 4a is load-bearing.
- `feedback-elite-team-standard.md` — Briggsy end-to-end watch is the
  authority; qa-report.md is auxiliary evidence.
- `feedback-eye-in-loop-beats-calibration-for-motion` — direct Briggsy
  listen on music envelope; direct Briggsy watch on R3 motion.
- `feedback-stop-thrashing` — if decode fails, execute ONE Phase
  route (e.g. Phase 4 R15 placement), retest, verify; never chain
  multiple fixes.
- `feedback-diagnose-before-fixing` — if drift detected, isolate
  source before proposing fix.
- `execFileSync` argv arrays for all shell-outs.

---

## Cross-Phase Amendments Surfaced by Phase 6 Deepening

These are amendments to OTHER phase documents that Phase 6 deepening
surfaced. They do NOT block Phase 6 execution per se but should be
applied to keep the plan-set internally consistent:

1. **Phase 0 Unit 0.1 ADR (`render:final` script)**: Update CRF 16 →
   CRF 18 to align with ADR #19 canonical lock. Single source of
   truth.
2. **Phase 0 Unit 0.3 decode-gate**: Clarify that N=2 protocol applies
   ONLY to the 5-second cold-open binary-hook spike, NOT to Phase 6
   full-trailer comprehension decode (which uses N=6 + control per
   ADR #21).
3. **Phase 4 placeholder ffmpeg filter** (carried forward from Phase 5
   deepening surfaced amendment): `force_original_aspect_ratio=cover`
   → `force_original_aspect_ratio=increase`. Phase 6 cannot proceed
   cleanly on the RERENDER path if Phase 4 placeholder script is
   still broken.
4. **Roadmap §3 row 6**: Confirm CRF 18 (was already 18; first-draft
   Phase 6 said CRF 17; reconciled to 18 per ADR #19).

---

## Sources & References

**Origin documents:**
- Brainstorm: [`docs/ideation/2026-05-15-origin-trailer-brainstorm.md`](../../ideation/2026-05-15-origin-trailer-brainstorm.md)
- Roadmap: [`docs/plans/origin-trailer/roadmap.md`](./roadmap.md)
- Phase 0 plan: [`docs/plans/origin-trailer/phase-0-gate-resolution.md`](./phase-0-gate-resolution.md)
- Phase 1 plan: [`docs/plans/origin-trailer/phase-1-beat-sheet-lock.md`](./phase-1-beat-sheet-lock.md)
- Phase 2 plan: [`docs/plans/origin-trailer/phase-2-voice-pipeline.md`](./phase-2-voice-pipeline.md)
- Phase 3 plan: [`docs/plans/origin-trailer/phase-3-visual-asset-prep.md`](./phase-3-visual-asset-prep.md)
- Phase 4 plan: [`docs/plans/origin-trailer/phase-4-remotion-composite.md`](./phase-4-remotion-composite.md)
- Phase 5 plan: [`docs/plans/origin-trailer/phase-5-gameplay-capture.md`](./phase-5-gameplay-capture.md)

**UMB v3 baseline:**
- `projects/undercover-mob-boss/videos/trailer/out/trailer-landscape.mp4` (148s)
- Timing constants: `projects/undercover-mob-boss/videos/trailer/src/lib/timing-v3.ts`
- UMB render script (CRF 18 baseline, no preset): `projects/undercover-mob-boss/videos/trailer/package.json`

**Quality bar:**
- `docs/PRODUCT-SPECIFICATION.md` §2
- `CLAUDE.md` "The Contract" + Quality Bar discipline

**X / Twitter distribution specs (2026):**
- X Help video specs aggregates: socialrails.com, heyorca.com, moda.app, kapwing.com
- X 2026 Immersive Media Viewer (9:16 vertical feed surface): primary distribution surface for vertical-cutdown decision
- Mobile in-feed preview crop research (per roadmap §5.4)

**Remotion documentation (4.0.438):**
- CLI render: https://www.remotion.dev/docs/cli/render
- CLI still: https://www.remotion.dev/docs/cli/still
- Quality + CRF + `--x264-preset`: https://www.remotion.dev/docs/quality
- Encoding: https://www.remotion.dev/docs/encoding
- Hardware acceleration: https://www.remotion.dev/docs/hardware-acceleration
- Audio (Mediabunny backend): https://www.remotion.dev/docs/media/audio
- Sample rate: https://www.remotion.dev/docs/sample-rate

**FFmpeg references:**
- silencedetect filter: https://ffmpeg.org/ffmpeg-filters.html#silencedetect
  (note: not used in Phase 6 final approach; documented as REJECTED for VO
  onset detection on continuous-music-bed mix)
- astats filter: https://ffmpeg.org/ffmpeg-filters.html#astats
- crop filter: https://ffmpeg.org/ffmpeg-filters.html#crop
- drawbox filter: https://ffmpeg.org/ffmpeg-filters.html#drawbox
- tile filter (contact sheets): https://ffmpeg.org/ffmpeg-filters.html#tile
- hstack/vstack filters: https://ffmpeg.org/ffmpeg-filters.html#hstack +
  https://ffmpeg.org/ffmpeg-filters.html#vstack
- ffprobe stream info: https://ffmpeg.org/ffprobe.html
- Seeking (`-ss` placement): https://trac.ffmpeg.org/wiki/Seeking
- H.264 Encoding Guide (CRF / preset / tune): https://trac.ffmpeg.org/wiki/Encode/H.264
- loudnorm two-pass: http://k.ylo.ph/2016/04/04/loudnorm.html

**AV-sync perception research (ADR #20):**
- EBU R37 — Relative timing of sound and vision for broadcasting: https://tech.ebu.ch/docs/r/r037.pdf
- ITU-R BT.1359-1 — Relative timing of sound and vision for broadcasting: https://www.itu.int/rec/R-REC-BT.1359
- TestDevLab AV-sync developer guide 2024: https://www.testdevlab.com/blog/audio-video-synchronization

**Decode-test panel research (ADR #21):**
- NN/g How Many Test Users: https://www.nngroup.com/articles/how-many-test-users/
- GreenBook qualitative sample-size guidance 2024-2025: https://www.greenbook.org/
- HeyMarvin open-ended question guide: https://heymarvin.com/
- Maze.co qualitative research protocols 2025: https://maze.co/
- Internal precedent: roadmap §5.2 + ADR #13 R4 MUSHRA panel sizing

**Apple QuickTime Windows deprecation:**
- Apple Support HT205771

**Institutional learnings (memory):**
- `feedback-verify-before-presenting.md` — multi-player playback check;
  Claude is QA before Briggsy
- `feedback-elite-team-standard.md` — verify → then lock; Briggsy
  watches output not reports
- `feedback-eye-in-loop-beats-calibration-for-motion.md` — direct
  observation beats DOM sampling for motion-sensitive surfaces
- `feedback-stop-thrashing.md` — one fix at a time
- `feedback-diagnose-before-fixing.md` — isolate source before
  proposing fix
- `feedback-proven-not-believed.md` — no marketing voice; bar-raise
  verdict is execution output not planning forecast
- `user_harry.md` — Harry as decode-test recruitment channel
- `feedback-phase-plan-drafting-workflow.md` — write all phase files
  in one workflow; deepen sequentially after
- `feedback-wait-for-all-agents.md` — synthesis discipline; this
  Phase 6 deepening waited for all 8 CE personas
