---
title: "Origin Trailer — Phase 6: Final Render + QA"
type: feat
phase: 6
parent: docs/plans/origin-trailer/roadmap.md
origin: docs/ideation/2026-05-15-origin-trailer-brainstorm.md
created: 2026-05-16
deepened: 2026-05-17
reviewed: 2026-05-17
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
- `videos/trailer/out/thumbnail.png` — single frame still for X video preview thumbnail
  (Unit 6.2 Step 3 feed-stop selection from candidate frames 1950 / 1860 / 1425 /
  2790 — pre-deepening default frame 2790 demoted to fallback per Adversarial Attack
  14 + Product-lens F3; mid-process feed-stoppers preferred over logo-closure)
- `docs/trailer/thumbnail.jpg` — README + Phase 7 Release-asset + portfolio-embed
  poster derivative (1200×675 q85 JPEG, target <100 KB) produced by Unit 6.2 Step 3
  via `ffmpeg scale=1200:675 -q:v 2`
- `videos/trailer/sample-eval/final-render-qa/qa-report.md` —
  comprehensive QA pass results (verdict-first structure per Unit 6.7
  template)
- `videos/trailer/sample-eval/final-render-qa/bar-raise-eval.md` —
  3-axis bar-raise evaluation vs UMB v3 (with side-by-side composite
  PNG per Unit 6.4 Step 6)
- `videos/trailer/sample-eval/final-render-qa/decode-test.md` —
  cold-watch agentic-SDLC decode verification (N=1 Briggsy per
  ADR #21r — supersedes the original ADR #21 N=6 panel + UMB
  control protocol 2026-05-22)
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
- ~~`videos/trailer/sample-eval/final-render-qa/decode-test-roster.md`~~ —
  REPEALED per ADR #21r (2026-05-22); no tester recruitment.
- `videos/trailer/sample-eval/final-render-qa/sample-frames/` — 10 extracted sample-
  frame PNGs + `contact-sheet.png` (2×5 tile per design-lens F12)
- `videos/trailer/sample-eval/final-render-qa/umb-samples/` — 10 UMB v3 reference
  frames + `contact-sheet.png` (2×5 tile)
- `videos/trailer/sample-eval/final-render-qa/bar-raise-pairs/` — 10 per-pair side-
  by-side composites (PRIMARY eye-in-loop artifact for bar-raise review per design-
  lens F6 — each pair is 3840×1080, readable at monitor scale; the vstack
  `bar-raise-composite.png` is auxiliary density check only)
- `videos/trailer/sample-eval/final-render-qa/sample-frames-cropped/` — per-frame
  mobile-crop outputs covering 1.91:1 actual + 1:1 conservative (40 PNGs + 10 2×2
  tile composites per Unit 6.6 Step 1; **broadened scope** per doc-review CALL-6 —
  pre-deepening only audited 1:1, missing X's actual mobile crop)
- `videos/trailer/sample-eval/final-render-qa/sample-frames-9x16/` — 9:16 crops +
  outlined + composites **CONDITIONAL** on Unit 6.0 Step 6 X 2026 Immersive Media
  Viewer surface verification per ADR #23 + doc-review CALL-1; if surface unverified,
  this directory is NOT produced and the 9:16 audit is skipped
- `videos/trailer/sample-eval/final-render-qa/archer-reference/` — 5 Archer screen-
  capture reference frames for §2 Layer B Archer-Fidelity verdict (Unit 6.3 Step 2 +
  CALL-4 + Adversarial Attacks 9/10/11). Local-only; gitignored per fair-use
  educational-comparison policy.
- `videos/trailer/sample-eval/final-render-qa/typography-control/` — system-ui-rendered
  control PNGs for typography font-load check (Unit 6.3 Step 2 Layer A typography
  row); produced by `scripts/render-typography-control.ts`
- ~~`videos/trailer/sample-eval/final-render-qa/decode-audio/`~~ —
  REPEALED per ADR #21r (2026-05-22); no tester voice-memo recordings.
- `videos/trailer/sample-eval/final-render-qa/briggsy-review-6.0a.signoff` —
  cool-off-plan sentinel (was "recruitment-prerequisite sentinel"
  pre-ADR-#21r; under ADR #21r 2026-05-22 the sentinel asserts the
  24h cool-off plan + decode-test.md template exist)
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
   (encoding asserts: codec=h264, profile=High, pix_fmt=yuv420p, width=1920,
   height=1080, r_frame_rate=30/1, duration ∈ [94.5, 95.5], audio codec=aac, audio
   sample_rate=48000, audio channels=1 per ADR #14, audio bit_rate ∈ [96000, 160000],
   integrated LUFS=-16 ±0.5; PLUS content asserts: input_tp > -50dB, first+last frame
   entropy > 8, GAMEPLAY_CLIP_SOURCE points at real clip not placeholder — per
   doc-review absorb of Adversarial Attack 12 + Feasibility F25).
2. **The sub-verdicts at Units 6.3-6.7 ROUTE Briggsy's attention; they do not gate
   ship.** This is the asymmetric-authority contract per CALL-3 in this doc-review
   pass (resolves Adversarial Attacks 20+21 + Product-lens F1+F7 + roadmap §10
   tiebreaker rule). Specifically:
   - Sub-verdicts at Units 6.3 (§2 ≥8/10 with two-layer rubric) / 6.4 (bar-raise
     per Step 6 matrix) / 6.5 (A/V sync within ADR #20 asymmetric tolerance) / 6.6
     (mobile-crop 1:1 + 1.91:1 + 9:16 conditional) / 6.7 (decode test —
     Briggsy cold-watch per ADR #21r 2026-05-22; PRIMARY YES or SECONDARY YES
     in Q1 free-recall surfaces autonomy — DIAGNOSTIC ONLY) / R13 acceptance
     (Phase 5 EXIT inherited) are documented in `qa-report.md`.
   - A sub-verdict FAIL routes Briggsy's attention to the failing surface and the
     correct upstream phase per the routing table. Briggsy decides whether to
     iterate or sign-off-over-the-FAIL by documenting the trade in `qa-report.md`
     + the sign-off sentinel.
   - **Briggsy's end-to-end watch (3) is the GO/NOGO authority — not the sub-
     verdict aggregate.** Per `feedback-elite-team-standard.md` + roadmap §10
     water-beads-wins tiebreaker rule.
   - **Asymmetry**: Briggsy's watch can withhold sign-off when sub-verdicts say
     PASS. Briggsy's watch CANNOT grant sign-off when the verify-script (1) FAILs —
     that gate is mechanical and non-overridable. Sub-verdict FAILs at 6.3-6.7
     route attention; Briggsy may sign-off-with-recorded-trade.
3. Briggsy watches `out/trailer.mp4` end-to-end in at least one player (Step 4a
   load-bearing gate per `feedback-elite-team-standard.md`). This is the GO/NOGO
   authority.
4. Briggsy signs off via `briggsy-review-6.4.signoff` (bar-raise) +
   `briggsy-review-6.7.signoff` (final), both git-author-checked per ADR #22. Both
   sign-offs record any sub-verdict FAILs Briggsy chose to sign over, with the
   tradeoff rationale.
5. `PHASE-6-EXIT.md` + `cutdown-frame-list.md` produced for Phase 7 hand-off (Unit
   6.8).

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
- **No-context decode test** (ADR #21 SUPERSEDED 2026-05-22 by
  ADR #21r) — does a cold viewer decode "agentic-SDLC / AI /
  autonomous" from R14 + R15 working together? Original ADR #21
  locked an N=6 outside panel; ADR #21r supersedes to **N=1 Briggsy
  cold-watch** because the team is just Briggsy + Claude(s) forever
  and no human panel is structurally available. Q1/Q2 two-question
  protocol preserved as Briggsy's own self-examination ladder; UMB
  v3 control eliminated (Briggsy is contaminated against UMB v3 too).
  Residual contamination risk accepted; see updated ADR #21r below.
- **Mobile-crop discipline audit** — does the trailer survive X's 1.91:1 in-feed
  preview crop on mobile? Per roadmap §5.3 + ADR #23, critical text must live within
  central 1:1 safe square. **An additional 9:16 vertical-feed audit is INFORMATIONAL-
  ONLY pending primary-source verification of X's 2026 Immersive Media Viewer
  surface** — Unit 6.0 Step 6 below gates the 9:16 audit on verifying the surface
  exists. If unverified, the 9:16 work is skipped without blocking Phase 6 (per
  doc-review CALL-1 + Adversarial Attack 24 + Scope-guardian F9 + Product-lens F2:
  R8 brainstorm Scope Boundaries explicitly says "No vertical / 9:16 cut. One banger
  > two compromises."). 9:16 work was added in Phase 6 deepening on the assumption
  of the surface; verification was deferred. This doc-review pass converts it from
  blocking to verify-then-execute.

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
| Bitrate cap | (none) | **(none — let CRF determine)** | File size estimate ~80-180MB for 95s @ CRF 18; well under X's 512MB cap. If pre-test render at high-entropy passage (S04 cascade peak frames 1140-1860) projects >280MB, add `--max-rate 8M --buffer-size 16M` (real Remotion 4.0.438 CLI flags per https://www.remotion.dev/docs/cli/render — pre-deepening cited fictional `--codec-options` syntax, corrected per Feasibility F3) |

**Iteration vs gold-master split — Windows reality** (per Feasibility F5 against
Remotion 4.0.438 hardware-acceleration docs): `--hardware-acceleration if-possible`
is **macOS-only** (VideoToolbox). Briggsy is on Windows 11; the flag silently
falls back to software on Windows, defeating the iteration-speed claim. Phase 6
ships two render scripts but Windows-aware:
- `pnpm render` — software libx264 `slow` (~15-45 min wall-clock on Windows; calibrate
  during Unit 6.1 Step 4). Gold master.
- `pnpm render:iterate` — software libx264 `veryfast` + CRF 23 (~3-6 min wall-clock
  on Windows). Iteration only; audio settings match gold master so codec contracts
  hold. **Never promoted to final** (CRF 23 visually-lossy vs CRF 18 gold).

When the project moves to macOS, `render:iterate` may switch to
`--hardware-acceleration if-possible` (Apple VideoToolbox; cuts wall-clock further);
the audio-bitrate-vs-VideoToolbox-encoder mismatch caveat documented at first-draft
line ~856 still applies — iterate output never promotes to final.

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

### Decode test panel size — ADR #21 SUPERSEDED 2026-05-22 by ADR #21r (just-us-forever team shape)

**Original ADR #21** locked an N=6 minimum human decode-test panel for
the 95-second full-trailer comprehension gate, with UMB v3 control
panel + priors elicitation + Q1/Q2 question protocol. The first draft
("≥1 of 2 testers") was correctly identified as statistically
toothless and the N=6 panel was sized against the R4 MUSHRA voice-
gate analog (ADR #13).

**ADR #21r SUPERSEDING LOCK 2026-05-22** — the team shape is just
Briggsy + Claude(s) forever (Briggsy 2026-05-22: *"there are no other
players involved, it's just me and you my friend forever and ever …
no future phase will change that"*). No multi-person human decode
panel is structurally available. The R4 analog (ADR #13) is also
amended the same way — Phase 0 EXIT confirms the N=6 voice panel was
never run, only deferred forward; both ADRs were architecturally
sound but operationally unrealizable.

- **Panel size: N=1 (Briggsy) — production-cert standard.** Briggsy
  watches the full 95s trailer once, cold, and answers Q1 free-recall
  + Q2 prompted-recall. No UMB v3 control panel (Briggsy is
  Briggsy-contaminated against UMB v3 also — he made both). No
  priors elicitation (Briggsy's priors are known and infinite).
- **Q1 / Q2 question protocol preserved** as Briggsy's own self-
  examination ladder. Q1-pass means Briggsy's first-pass cold-watch
  surfaces the agent-built / autonomy / shipped frame unprompted.
  Q1-fail / Q2-pass means R15 chrome is insufficient. Q1-fail / Q2-
  fail means R14 cold-open is insufficient.
- **Acceptance keyword precision preserved**: "BUILD PROCESS / AGENT
  AUTHORSHIP" counts; "RENDER TECHNOLOGY" does not.
- **Residual risk accepted**: Briggsy's contamination as sole decode-
  test subject. Mitigations: cold-watch with 24h cool-off + no in-
  composition recall priming + Q1 free-recall before Q2 prompted-
  recall. Cross-ref: memory `feedback-listener-panels-default-to-n1.md`
  + updated `user_harry.md`.

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
| Unit 6.7 decode test execution | Briggsy alone (cold-watch per ADR #21r 2026-05-22) | N=1 self-administered Q1/Q2; Briggsy types verbatim into decode-test.md (was "Briggsy + testers, Claude transcribes" pre-ADR-#21r) |
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
- **R14 + R15** (decode mechanism): Unit 6.7 (Q1/Q2 decode test —
  N=1 Briggsy cold-watch per ADR #21r, 2026-05-22 supersession of
  ADR #21 N=6 + UMB control panel).

---

## Key Technical Decisions

- **Production encode (ADR #19)**: H.264 / CRF 18 / `--x264-preset slow`
  / no `--tune` / yuv420p / AAC 128 kbps mono / faststart / no maxrate
  (conditional bitrate cap only if pre-test projects >280MB).
- **AV-sync tolerance (ADR #20)**: asymmetric — standard cues
  `[-1, +3]` frames; R3 stacked payoff `[-1, 0]` frames. Audio MUST
  NOT lead video on R3 by any amount.
- **Decode test panel (ADR #21r supersedes ADR #21 — 2026-05-22)**:
  N=1 Briggsy cold-watch with 24h cool-off + Q1/Q2 question protocol
  + keyword precision (BUILD process counts, RENDER tech does not).
  Original ADR #21 N=6 panel + UMB control + tester recruitment +
  priors elicitation is structurally unavailable (team is just
  Briggsy + Claude(s) forever).
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

### Unit 6.0 — Production Verify Script + Atomic-Swap + Cool-Off-Plan Sentinel

- [ ] **Unit 6.0: Production Verify Script + Atomic-Swap + Cool-Off-Plan Sentinel**

**Goal:** Lock in the contract-gate infrastructure BEFORE any render
work. Create `verify:trailer-final` script that machine-checks all ADR
#14 / #19 specs. Establish atomic-swap discipline for re-render
iterations. Confirm the Unit 6.7 cool-off plan + `decode-test.md`
template exist (was "tester recruitment" pre-ADR-#21r; superseded
2026-05-22 — no recruitment under ADR #21r).

**Requirements:** ADR #19 + ADR #14 enforcement; cool-off-plan
prerequisite (was "tester-recruitment prerequisite" pre-ADR-#21r);
Phase 5 atomic-swap pattern inheritance.

**Dependencies:** Phase 5 complete (`public/trailer/gameplay.mp4`
exists + Phase 5 EXIT signed off).

**Files:**

- Create: `scripts/verify-trailer-final.ts` — machine-checkable
  contract gate.
- Create: `scripts/extract-frames.ts` — shared frame-extraction helper
  consumed by Units 6.3 / 6.4 / 6.6.
- Edit: `package.json` — add `verify:trailer-final` + `extract:frames`
  scripts; update `render` for atomic-swap pattern.
- ~~Create: `videos/trailer/sample-eval/final-render-qa/decode-test-roster.md`~~ —
  REPEALED per ADR #21r (2026-05-22); no tester recruitment record.
- Create: `videos/trailer/sample-eval/final-render-qa/briggsy-review-6.0a.signoff` —
  cool-off-plan sentinel (git-author check). Under ADR #21r asserts
  the 24h cool-off plan + decode-test.md template exist (was
  "recruitment-prerequisite sentinel" pre-supersession).

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
// loudnorm in analysis mode writes JSON to STDERR (not stdout) — `execFileSync` returns
// stdout only, so we must use `spawnSync` to capture stderr. Mirrors Phase 2 helper
// `scripts/lib/ffmpeg.ts:runFFmpegJson` per phase-2-voice-pipeline.md:1143.
import { spawnSync } from 'node:child_process';
const loudnormResult = spawnSync('ffmpeg', [
  '-i', TRAILER,
  '-af', 'loudnorm=print_format=json',
  '-f', 'null', '-',
], { encoding: 'utf-8' });
const loudnormOut = (loudnormResult.stderr ?? '') + (loudnormResult.stdout ?? '');
const lufsMatch = loudnormOut.match(/"input_i"\s*:\s*"([-\d.]+)"/);
if (!lufsMatch) {
  console.error('FAIL: could not parse loudnorm input_i from FFmpeg output');
  console.error(loudnormOut.slice(-1200));
  process.exit(1);
}
const integratedLufs = Number(lufsMatch[1]);
if (!Number.isFinite(integratedLufs)) {
  console.error(`FAIL: loudnorm input_i parsed as non-finite: ${lufsMatch[1]}`);
  process.exit(1);
}
expect(integratedLufs >= -16.5 && integratedLufs <= -15.5,
       `integrated LUFS = -16 ±0.5 (ADR #14)`, integratedLufs);

// 3. Content sanity (Adversarial Attack 12 — verify name implies content but checks only
// encoding; black-silent-room-tone trailer would pass without this). Extract frame 0 and
// frame 2849, assert pixel-entropy > floor (rule out solid-color). Assert audio peak
// `input_tp` (true peak from loudnorm) > -50dB (rule out pure silence normalized to -16
// LUFS via room tone).
const tpMatch = loudnormOut.match(/"input_tp"\s*:\s*"([-\d.]+)"/);
const inputTp = tpMatch ? Number(tpMatch[1]) : NaN;
expect(Number.isFinite(inputTp) && inputTp > -50,
       `audio input_tp > -50dB (rule out silence)`, inputTp);

// Frame entropy check (cheap heuristic): extract first + last frame as 64×36 grayscale
// PNGs, count distinct intensity values. <8 distinct values across 2304 pixels = effectively
// solid color. Catches "rendered the comp but bundler stripped all assets" failure mode.
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const tmp = mkdtempSync(join(tmpdir(), 'verify-trailer-'));
try {
  for (const [label, ss] of [['first', '0'], ['last', '94.9']] as const) {
    const out = join(tmp, `${label}.png`);
    execFileSync('ffmpeg', [
      '-y', '-ss', ss, '-i', TRAILER, '-frames:v', '1',
      '-vf', 'scale=64:36,format=gray',
      out,
    ]);
    const png = readFileSync(out);
    // Count unique bytes in IDAT region (rough but adequate: <8 unique = solid-color).
    const unique = new Set(png).size;
    expect(unique > 8, `${label} frame entropy > 8 unique values (rule out solid-color)`, unique);
  }
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

// 4. Gameplay-source check — verify GAMEPLAY_CLIP_SOURCE didn't fall back to placeholder
// (per Feasibility F25 + Adversarial Attack 38). Reads the manifest set by Phase 4's
// sync-gameplay-clip.ts prerender lifecycle hook.
import { readFileSync as readSync2 } from 'node:fs';
const manifestPath = 'videos/trailer/src/lib/gameplay-clip-source.ts';
if (existsSync(manifestPath)) {
  const manifest = readSync2(manifestPath, 'utf-8');
  expect(!/gameplay-placeholder\.mp4/.test(manifest),
         `GAMEPLAY_CLIP_SOURCE points at real clip (not placeholder)`,
         manifest.match(/['"`]([^'"`]*gameplay[^'"`]*)['"`]/)?.[1] ?? '(unparseable)');
}

console.log('\nALL CHECKS PASS — trailer ready for Phase 6 QA');
process.exit(0);
```

**Verify-script naming note** (Adversarial Attack 12): `verify:trailer-final` historically
implies "this validates the trailer is ready." It now validates encoding + content
sanity (frame entropy / audio TP / non-placeholder gameplay source) — a much stronger
gate. Semantic-content audit (per-scene §2, bar-raise) still lives at Units 6.3-6.7;
they remain authoritative for "is this trailer GOOD." Verify-script catches the
"trailer file looks right but is actually broken" failure mode (black render, silent
mix, unresolved placeholder).

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
  frames: number[];     // explicit ordered frame numbers (not a glob — `-pattern_type
                        // glob` is NOT available on Windows FFmpeg builds per
                        // https://trac.ffmpeg.org/wiki/Slideshow#Globpattern; Briggsy
                        // is on Windows 11)
  prefix?: string;      // matches extractFrames default ('frame')
  padding?: number;     // matches extractFrames default (4)
  outPath: string;
  tile: string;         // e.g. '2x5' (vertical strip — 5 rows of 2 cols; reads at
                        // monitor aspect ratio better than 5x2 horizontal banner per
                        // design-lens F12)
}) {
  const { inputDir, frames, prefix = 'frame', padding = 4, outPath, tile } = opts;
  const sorted = [...frames].sort((a, b) => a - b);
  const args: string[] = ['-y'];
  for (const frame of sorted) {
    const fname = `${prefix}-${String(frame).padStart(padding, '0')}.png`;
    args.push('-i', resolve(inputDir, fname));
  }
  args.push('-filter_complex', `tile=${tile}`, outPath);
  // SAFE: argv array; cross-platform; deterministic input order from sorted frames.
  execFileSync('ffmpeg', args);
  console.log(`Contact sheet → ${outPath}`);
}
```

**Tile layout note** (design-lens F12): default `2x5` (2 columns × 5 rows). At
2-column layout each frame renders at ~50% of monitor width when scaled to viewer
window — vs `5x2` horizontal which scales each frame to ~20% width and loses
operative-face / R15-chrome detail. Vertical strip mirrors how film contact sheets
read.

**Step 3 — Atomic-swap pattern (mirrors Phase 5 `gameplay.mp4`).**

Render writes to `out/trailer.mp4.new`; verify gates the rename to
`out/trailer.mp4`. Pattern from Phase 5 deepening lines 260-263 and
Phase 4 `sync-gameplay-clip.ts` lifecycle hook.

```jsonc
// videos/trailer/package.json scripts
// CWD assumption: every script must be invoked from `videos/trailer/`. The output paths
// are relative to that cwd; finalize-trailer.ts asserts cwd at top to fail-fast on
// invocation from repo-root (per Security F10).
{
  "scripts": {
    "render": "npx remotion render src/index.ts BurnedTrailer out/trailer.mp4.new --codec h264 --crf 18 --x264-preset slow --pixel-format yuv420p --audio-codec aac --audio-bitrate 128K",
    "render:iterate": "npx remotion render src/index.ts BurnedTrailer out/trailer.mp4.iterate --codec h264 --crf 23 --x264-preset veryfast --pixel-format yuv420p --audio-codec aac --audio-bitrate 128K",
    "render:thumbnail": "npx remotion still src/index.ts BurnedTrailer out/thumbnail.png --frame 2790",
    "render:finalize": "tsx scripts/finalize-trailer.ts"
  }
}
```

`scripts/finalize-trailer.ts` — ports the hardened atomicSwap helper from Phase 5
(`phase-5-gameplay-capture.md:2823-2858`) instead of bare `renameSync`. Windows
`fs.renameSync` is NOT atomic when the destination exists (per Adversarial Attack 13);
Node throws on EBUSY/EXDEV/EEXIST that bare rename can't handle. Phase 5's atomicSwap
catches all three with named messages and EXDEV copy+unlink fallback.

```ts
import { execFileSync } from 'node:child_process';
import { copyFileSync, renameSync, unlinkSync } from 'node:fs';

const NEW = 'out/trailer.mp4.new';     // relative to cwd; cwd must end in videos/trailer
const FINAL = 'out/trailer.mp4';
const PREV = 'out/trailer.mp4.prev';

// CWD assertion (Security F10): script must be invoked from videos/trailer/.
if (!process.cwd().replace(/\\/g, '/').endsWith('videos/trailer')) {
  console.error(`FAIL: finalize-trailer.ts must be invoked from videos/trailer/ — actual cwd: ${process.cwd()}`);
  process.exit(1);
}

// SAFE: argv array — runs verify gate on .new before swap.
execFileSync('pnpm', ['verify:trailer-final', NEW], { stdio: 'inherit' });
console.log(`Verify PASS — swapping ${NEW} → ${FINAL}`);

// atomicSwap (ported from Phase 5 Unit 5.5 — phase-5-gameplay-capture.md:2830-2858).
// Strategy: rename existing FINAL → PREV first (preserve prior good); then rename
// NEW → FINAL. If second rename fails, restore PREV → FINAL.
import { existsSync } from 'node:fs';
function atomicSwap(newPath: string, finalPath: string, prevPath: string) {
  const finalExists = existsSync(finalPath);
  if (finalExists) {
    try {
      if (existsSync(prevPath)) unlinkSync(prevPath);
      renameSync(finalPath, prevPath);
    } catch (e: any) {
      if (e?.code === 'EBUSY') {
        throw new Error(
          `EBUSY swapping ${finalPath} → ${prevPath}: ` +
          `another process holds the file (Windows VLC / Films & TV / browser tab playing the trailer). ` +
          `Close all players pointing at ${finalPath} and retry.`
        );
      }
      throw e;
    }
  }
  try {
    renameSync(newPath, finalPath);
  } catch (e: any) {
    if (e?.code === 'EXDEV') {
      // Cross-drive rename — fall back to copy+unlink.
      copyFileSync(newPath, finalPath);
      unlinkSync(newPath);
    } else if (e?.code === 'EEXIST') {
      // Windows: destination wasn't actually moved by the first rename. Restore + throw.
      if (finalExists) renameSync(prevPath, finalPath);
      throw new Error(`EEXIST landing ${newPath} → ${finalPath}: prior rename did not clear destination`);
    } else {
      // Restore prior good if we moved it.
      if (finalExists && existsSync(prevPath)) renameSync(prevPath, finalPath);
      throw e;
    }
  }
  // Leave PREV in place for one cycle — Phase 6 retains the prior good render as
  // recovery if Briggsy watches the new one and wants to revert. Cleanup is manual
  // (delete `out/trailer.mp4.prev` when Briggsy confirms the new one is locked).
}

atomicSwap(NEW, FINAL, PREV);
console.log(`Atomic swap complete. Prior render preserved at ${PREV}.`);
```

(On Windows close any open VLC/browser handles pointing at the final path before the
swap to avoid EBUSY — atomicSwap surfaces this with a named message. Same hazard
documented at phase-5 lines 1641-1748.)

**~~Step 4 — Tester pre-recruitment.~~ REPEALED 2026-05-22 per ADR #21r.**

ADR #21 N=6 human panel was superseded by ADR #21r (N=1 Briggsy cold-
watch). Team is just Briggsy + Claude(s) forever; no tester
recruitment is structurally available. The recruitment-prerequisite
sentinel (`briggsy-review-6.0a.signoff`) **collapses to a cool-off
calendar gate** instead: Briggsy commits the sentinel asserting the
24h cool-off plan exists in `decode-test.md` and that final-render
date will be recorded there. No tester pool, no roster, no priors
elicitation.

**~~Step 5 — Recruitment pool feasibility check~~ REPEALED 2026-05-22 per ADR #21r.**

Recruitment-pool feasibility (Feasibility F8 + Adversarial Attack 35
escalation paths) is moot — there is no recruitment. ADR #21 → ADR
#21r supersession replaces the panel with N=1 Briggsy cold-watch.

**Step 6 — X 2026 Immersive Media Viewer verification** (per doc-review CALL-1 +
Adversarial Attack 24 + Scope-guardian F9 + Product-lens F2).

The 9:16 vertical-feed audit infrastructure (Unit 6.6 9:16 crops, Unit 6.8 9:16
cutdown feasibility, ADR #23) was added in Phase 6 deepening on the **unverified
assumption** that X 2026 has a "Immersive Media Viewer" surface (top-level vertical
tab). Original brainstorm R8 + Scope Boundaries locked "No vertical / 9:16 cut. One
banger > two compromises."

Before any 9:16 work runs in Unit 6.6 or Unit 6.8:
1. Verify via primary source: X Help center, X engineering blog, X for Business
   product page. Search for "Immersive Media Viewer" + vertical feed + 9:16 surface.
2. If primary source confirms a shipping surface in 2026:
   - Document the citation URL in `decode-test.md` header (was `decode-test-roster.md` pre-ADR-#21r) under "9:16 surface
     verification."
   - Proceed with 9:16 audit work as documented.
3. If primary source does NOT confirm a shipping surface:
   - Document the negative finding in `decode-test.md` header (was `decode-test-roster.md` pre-ADR-#21r).
   - **Skip** the 9:16 work in Units 6.6 + 6.8. Phase 6 audit reduces to 1:1 +
     1.91:1 (the actual mobile in-feed crop).
   - Inform Phase 7 via `PHASE-6-EXIT.md`: 9:16 surface unverified at Phase 6 — Phase
     7 may revisit if surface ships before distribution.

This verification is the difference between building audit infrastructure for a real
surface vs wasting cycles on speculation. Hallucinated-references discipline applies
(per `feedback-hallucinated-references.md`).

**Step 7 — Phase 4 cross-phase amendment freshness check** (per Feasibility F24).

Phase 5 deepening surfaced a Phase 4 amendment: `force_original_aspect_ratio=cover` →
`force_original_aspect_ratio=increase` in the placeholder script. Phase 6 deepening
flagged this as a cross-phase amendment. **This doc-review pass applies the amendment
to Phase 4** (see Cross-Phase Amendments section at bottom of this document). Before
Unit 6.0 sentinel commit, verify the amendment landed:

```bash
# From repo root
grep -r 'force_original_aspect_ratio=cover' videos/trailer/scripts/ videos/trailer/src/ \
  && echo "FAIL: Phase 4 amendment unapplied — cover should be increase" \
  || echo "PASS: Phase 4 amendment applied"
```

If FAIL: block Unit 6.0 sentinel; route to Phase 4 to apply the amendment first.

**Step 8 — Sentinel ceremony.**

`briggsy-review-6.0a.signoff` content (updated per ADR #21r 2026-05-22 — was "decode-test panel of N≥6 confirmed" line, now cool-off-plan line):
```
Phase 6 Unit 6.0 prerequisites cleared.
- verify:trailer-final script in place
- extract-frames.ts shared helper in place
- atomic-swap render scripts wired (atomicSwap helper ported from Phase 5)
- decode-test plan: N=1 Briggsy cold-watch per ADR #21r (decode-test.md template ready; 24h cool-off scheduled post-render)
- X 2026 Immersive Media Viewer surface: VERIFIED <citation> / UNVERIFIED <reason>
- Phase 4 force_original_aspect_ratio amendment: applied
Date: <YYYY-MM-DD>
```

Briggsy commits the sentinel under his git author identity (`briggsy007@gmail.com`).
`pnpm verify:briggsy-sentinels` enforces author-check.

**Cross-phase amendment to Phase 4** (`scripts/verify-briggsy-sentinels.ts`, per
Feasibility F27 + Adversarial Attack 28): the script's `SCENES` const must be
extended to include Phase 6 sentinel paths under `videos/trailer/sample-eval/final-
render-qa/`:
- `briggsy-review-6.0a.signoff`
- `briggsy-review-6.4.signoff`
- `briggsy-review-6.7.signoff`

Without this, `pnpm verify:briggsy-sentinels` won't validate Phase 6 sentinels — it
will exit clean because the SCENES list only covers 4.2-4.7 + 5.4/5.6. This
amendment is applied in this doc-review pass (see Cross-Phase Amendments). ~~The
verify script also extends to read `decode-test-roster.md` and assert ≥6 rows in
the Confirmed Panel table where every column is filled (Adversarial Attack 28: the
6.0a sentinel commit must be machine-verified to back the claim "N≥6 confirmed,"
not honor-system enforced).~~ — REPEALED per ADR #21r (2026-05-22): the roster
file is no longer produced, so this assertion is dropped from the verify script.

**Patterns to follow:**

- Phase 4 `scripts/verify-gameplay-clip.ts` — single-purpose gate script structure.
- Phase 5 atomic-swap pattern (lines 260-263, 1641-1748) — atomicSwap helper.
- Phase 4 ADR #22 — Briggsy sign-off ceremony.

**Test scenarios:**

- **Happy path:** verify-trailer-final.ts dry-runs against the Phase 4
  `trailer-scene-build.mp4` candidate; all assertions match the spec or produce named
  failures.
- **Edge case:** loudnorm two-pass not applied at Phase 2 → integrated LUFS drift
  outside ±0.5; verify fails with LUFS named cause; route to Phase 2 reopen.
- ~~**Edge case:** Tester recruitment falls below N=6~~ — REPEALED per ADR #21r
  (2026-05-22); no tester recruitment occurs, so this edge case is moot.
- **Edge case:** X 2026 Immersive Media Viewer unverifiable → Step 6 skip-9:16 path
  activates; Phase 6 proceeds without 9:16 audit work.
- **Edge case:** Phase 4 amendment unapplied → Step 7 grep fails; block on Phase 4
  reopen.

**Verification:**

- `scripts/verify-trailer-final.ts` exists; `pnpm verify:trailer-final <any-mp4>`
  exits 1 on missing file (smoke test before real input).
- `scripts/extract-frames.ts` exists; `import { extractFrames }` works from a
  sibling script.
- `package.json` scripts updated with `render`, `render:iterate`, `render:thumbnail`,
  `render:finalize`, `verify:trailer-final`.
- ~~`decode-test-roster.md` records ≥6 confirmed testers + X 9:16 surface verification +
  recruitment pool feasibility note.~~ — REPEALED per ADR #21r (2026-05-22). The
  X 9:16 surface verification finding moves into `decode-test.md` header instead.
- `briggsy-review-6.0a.signoff` committed under Briggsy's git author.
- `scripts/verify-briggsy-sentinels.ts` SCENES extended to include 6.0a/6.4/6.7
  (Phase 4 cross-phase amendment).
- Phase 4 `force_original_aspect_ratio` amendment applied (grep verification).

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
  --frames 1140-1860
```

Note Remotion 4.0.438 CLI uses `--frames` (plural) for range — `--frame` singular is
the `remotion still` flag only. Pre-deepening said `--frame N-M`; corrected per
Feasibility F2 verified against the Remotion CLI source.

FFprobe the output; multiply file size by `2850 / (1860-1140+1)` to project full-render
size. The cascade peak is the highest-entropy passage so the projection runs
**conservative-high** — actual full render typically lands smaller than projected
(other scenes compress better). If projection >280MB, pre-emptively add `--max-rate 8M
--buffer-size 16M` (real Remotion 4.0.438 CLI flags per
https://www.remotion.dev/docs/cli/render; pre-deepening cited fictional
`--codec-options "maxrate=8M:bufsize=16M"` — corrected per Feasibility F3).

**Two-sample projection refinement** (Adversarial Attack 19 + Feasibility F13): if S04
cascade alone over-projects, also render a 360-frame S02 dossier-hold sub-composition
(`--frames 240-599`, low-entropy passage). Weight: `(cascade_bytes_per_frame × 1320 +
hold_bytes_per_frame × 1530) ≈ projection` where 1320 is cascade-passage frames and 1530
is non-cascade. Better predictive than single-sample × frame-ratio for mixed content.

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

**Step 3 — Thumbnail extraction (feed-stop optimization).**

Pre-deepening defaulted to frame 2790 (logo-on-desk closure). Per Adversarial Attack 14
+ Product-lens F3: logo-on-desk is what most engineering Twitter scrolls PAST.
Restructured selection rule: extract MULTIPLE candidate frames; Briggsy picks based on
a feed-stop test (would I scroll-stop on this at 96px square in someone else's feed?).

Extract all 4 candidates:
```bash
# Candidate A — R3 stacked-payoff (most likely feed-stopper if extracts cleanly)
npx remotion still src/index.ts BurnedTrailer out/thumbnail-candidate-1950.png --frame 1950
# Candidate B — Cascade peak pre-stamp (high-density chrome + readable)
npx remotion still src/index.ts BurnedTrailer out/thumbnail-candidate-1860.png --frame 1860
# Candidate C — S04 stat-2 + halo (operative density + chrome)
npx remotion still src/index.ts BurnedTrailer out/thumbnail-candidate-1425.png --frame 1425
# Candidate D — S06 closure (the prior default — kept as comparison baseline)
npx remotion still src/index.ts BurnedTrailer out/thumbnail-candidate-2790.png --frame 2790
```

**Feed-stop selection test** (Briggsy eye): scale each candidate to 96×96 (or whatever
X's mobile-feed thumbnail size renders as at typical scroll distance — approximately
that). Look at them next to a few real engineering-Twitter thumbnails in the wild.
Pick the one most likely to break a scroll. Frame 1950 is the prior "reserved as
last-resort" — likely the right answer if it extracts with stamp fully opaque + halo
at readable diameter without motion blur. The mid-process moments stop scrolls; logo
closes don't.

Selection precedence (PRIMARY → fallback order):
1. **Frame 1950** (R3 stacked-payoff stamp + Dash audio reveal) — IF the extracted
   still reads composed-not-mid-motion (stamp fully opaque + halo readable).
2. **Frame 1860** (cascade peak pre-stamp) — high-density chrome, R15 visible, no
   motion blur.
3. **Frame 1425** (S04 stat 2 + halo) — operative-density flourish if 1950+1860 both
   fail composed-state check.
4. **Frame 2790** (S06 closure) — only if all prior fail the feed-stop test (kept as
   fallback for the same reason it was the prior default: extracts cleanly).

Briggsy picks; rename selected candidate to `out/thumbnail.png`.

**README derivative** (per Phase 7 deepening cross-phase amendment via Phase 7 ADR
#29 / frontend-design Tier 1.2 + per Design F8 — now in Files list + here, not buried
in Resolved Questions):

```bash
ffmpeg -y -i out/thumbnail.png -vf scale=1200:675:flags=lanczos -q:v 2 docs/trailer/thumbnail.jpg
```

Output: `docs/trailer/thumbnail.jpg` (1200×675 q85 JPEG, target <100 KB). Used by
Phase 7 Unit 7.1b Release-asset provisioning + Phase 7 Unit 7.2 portfolio-embed
poster image.

Discard the unselected candidates (`out/thumbnail-candidate-*.png`) after Briggsy
picks. Record selected frame + reasoning in `render-settings-log.md`.

**Step 4 — Cross-browser + distribution-target playback verification.**

Replace first-draft list (which included deprecated QuickTime on
Windows). Briggsy is on Windows 11 (per env block); distribution
target includes X iOS / Android mobile.

Open `out/trailer.mp4` in (verify each plays end-to-end without
errors):

**Desktop:**
- [ ] Films & TV (Windows 11 default `.mp4` handler) — native OS Microsoft Media
      Foundation check (Windows Media Player dropped per Scope F8 — same MF H.264
      stack as Films & TV, redundant coverage)
- [ ] VLC — codec-flexible reference player
- [ ] Chrome desktop — primary HTML5 target (X distribution preview)
- [ ] Edge desktop — Microsoft Edge / WebView2 decode path; catches MS-specific
      issues

**Mobile (real devices, not emulators):**
- [ ] iOS Safari (Briggsy's iPhone via TestFlight upload or local
      web-share) — X iOS in-feed uses WKWebView with Safari's codec
      stack
- [ ] Android Chrome (Briggsy's Android device — Harry-relay path
      REPEALED per `user_harry.md` 2026-05-22 update: Harry is AI, not
      a hardware-relay; if no Android available, document the gap and
      defer Android coverage to a post-ship verification) — X Android
      in-feed equivalent

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

// Sample frame selection rationale (design-lens F10): 8 frames at ~9.5s intervals
// (composition transitions across S02-S06) + frame 1950 forced for R3 stacked-payoff
// (load-bearing) + frame 45 for S01 cold-open coverage (R14 is the trailer's hook —
// must score §2). Replaces frame 2520 (was redundant S05 iris-wipe — duplicates the
// 2235 gameplay-exempt coverage with no new signal).
const SAMPLE_FRAMES = [45, 285, 570, 855, 1140, 1425, 1710, 1950, 2235, 2790];
const SOURCE = 'videos/trailer/out/trailer.mp4';
const OUT_DIR = 'videos/trailer/sample-eval/final-render-qa/sample-frames';

extractFrames({ source: SOURCE, frames: SAMPLE_FRAMES, outDir: OUT_DIR });
generateContactSheet({
  inputDir: OUT_DIR,
  frames: SAMPLE_FRAMES,
  outPath: `${OUT_DIR}/contact-sheet.png`,
  tile: '2x5',
});
```

10 PNG files + 1 contact-sheet composite (5×2 tile). Contact-sheet
forces cross-frame comparison (design-lens #3); reviewer evaluates
the contact-sheet first, then drills into individual frames if
verdict is borderline.

**Step 2 — §2 evaluation: TWO-LAYER rubric** (per doc-review pass: pre-deepening
operational rubric measured token-discipline not Archer-look — see Adversarial Attacks
9/10/11 + Product-lens F5).

§2 verdict comes from BOTH layers passing:

**Layer A — Production Discipline (operational, script-runnable by Claude)**

Renamed from "§2 operational rubric" — what it actually measures is whether the
render preserved BURNED's locked design tokens (palette, font, composition
guardrails). Necessary baseline but NOT a proxy for Archer-fidelity.

| Dimension | Operational test | Pass if | Owner |
|-----------|-----------------|---------|-------|
| **Composition guardrails** | Count distinct attention regions. Identify geometric center of largest high-contrast element. Note: this rubric prescribes the dialogue-shot composition template (≤3 regions + center anchor). Archer ALSO has high-density ensemble shots (S03 cast roster, S04 cascade) where ≥4 attention regions are correct. Such frames record "ensemble-composition" outcome and feed Layer B (Archer fidelity) instead of being treated as fails on Layer A. | ≤3 attention regions AND center anchor within middle 60% width × middle 50% height — OR frame is tagged `ensemble-composition` (S03 frame 855, S04 frames 1140/1425/1710) per `s2-frame-audit.md` per-frame metadata header | Claude script |
| **Palette discipline** | Sample 5 fixed pixels per frame (positions below). Excluding subject/character regions, measure Euclidean RGB distance to nearest locked palette token (cream, ochre, mahogany, teal, burn-fire). For gameplay frames (S05), the captured game-screen rectangle is EXEMPT (game UI palette is BURNED's runtime UI, not trailer chrome) — but the chrome surrounding the gameplay capture rect must still pass. **Gameplay capture rect coordinates** for the S05 segment are recorded in `s2-frame-audit.md` header (per Phase 4 composition lock at `videos/trailer/src/compositions/S05.tsx`; capture-rect bounding box read from that file at execution time so coords stay synced). | ≥4 of 5 sampled pixels within RGB-distance 30 of nearest locked token | Claude script |
| **Typography font-load check** | If text visible: confirm rendered glyphs use a custom font (ClashDisplay or GeneralSans), NOT a system-ui fallback. Briggsy eyeball verdict comparing the frame to a system-ui-rendered control card committed under `videos/trailer/sample-eval/final-render-qa/typography-control/control-{string}.png` (one card per visible-text string; pre-generated by `scripts/render-typography-control.ts` using Playwright + `@font-face: system-ui`). Briggsy compares frame side-by-side with control card — pass = frame glyphs visually distinct from control (custom font loaded). | Frame glyphs visually distinct from system-ui control card — OR N/A if no text visible (don't auto-pass) | Briggsy eye + Claude pre-generates controls |

**Palette-sampling 5-pixel grid coordinates** (per Design F1 + Feasibility F16):
on a 1920×1080 frame:

| Sample # | (x, y) | Region intent |
|----------|--------|---------------|
| 1 | (480, 270) | Upper-left quadrant chrome |
| 2 | (1440, 270) | Upper-right quadrant chrome |
| 3 | (960, 540) | Center (hero region) |
| 4 | (480, 810) | Lower-left quadrant chrome |
| 5 | (1440, 810) | Lower-right quadrant chrome |

Coordinates chosen to avoid subject/character/R15-chrome regions where palette
intentionally varies; sampled pixels measure background/chrome adherence. For
ensemble-composition frames the 5-sample grid may land on subject regions; record as
N/A and document in per-frame Notes.

Per-cue script: `scripts/audit-palette-tokens.ts` reads the extracted PNGs, samples
the 5 fixed coordinates, computes Euclidean RGB distance to each locked token, emits
the verdict table to `s2-frame-audit.md`. Runs in ~1 minute across 10 frames; replaces
30-seconds-per-frame human pixel-picking claim.

**Layer B — Archer-Fidelity Verdict (Briggsy eye, anchored against reference)**

Layer A passes prove "the render preserved tokens." Layer B answers the actual §2
question: *could this look like a frame from an Archer episode?* Per PRODUCT-
SPECIFICATION.md §3, the visual reference is Archer LITERAL vocabulary — not "mid-
century modern in general," not "Saul Bass." A frame that scores 3/3 on Layer A
and still doesn't feel Archer = §2 fail.

Briggsy reviews each sampled frame against 5 reference Archer stills committed at
`videos/trailer/sample-eval/final-render-qa/archer-reference/{briefing-room, dossier-
panel, cast-ensemble, action-cascade, agency-chrome}.png` (Archer-screen-capture
references — fair-use / educational comparison). Per-frame binary: would BURNED
frame N hold up in the same contact-sheet row as the Archer reference at matched
scene-type?

| Frame scene-type | Matched Archer reference |
|------------------|--------------------------|
| S02 dossier-panel frames (285, 570) | `dossier-panel.png` |
| S03 cast-ensemble (855) | `cast-ensemble.png` |
| S04 cascade (1140, 1425, 1710, 1950) | `action-cascade.png` |
| S05 gameplay (2235) | N/A (live capture; evaluate chrome surround only) |
| S06 closing (2790) | `agency-chrome.png` |
| S01 cold-open (45) | `briefing-room.png` (cold-open setting) |

Briggsy verdict per frame: PASS / FAIL / MARGINAL. **§2 PASS requires Layer A
PASS AND Layer B PASS.** Marginal frames count as FAIL on Layer B (Adversarial
Attack 9: gut-chase between PASS/MARGINAL is the failure mode the binary forbids).

Reference-frame fair-use disclaimer: Archer reference stills are screen-captures used
solely for internal QA evaluation. Not committed to public repo. Briggsy retains them
locally per `.gitignore` entry on `videos/trailer/sample-eval/final-render-qa/archer-reference/`.

The contact-sheet PNG is reviewed FIRST as a whole; cross-frame palette/composition
consistency surfaces from the contact sheet that doesn't surface from per-frame review.

**Step 3 — Per-frame audit table.**

Sample-frame mapping after deepening rebalance (frame 2520 removed as redundant
with 2235; frame 45 added for S01 cold-open §2 coverage — per design-lens F10):

```md
| Frame | Timecode | Scene  | Composition tag | Layer A Composition | Layer A Palette | Layer A Typography | Layer B Archer-fidelity | §2 Verdict | Notes |
|-------|----------|--------|-----------------|---------------------|-----------------|--------------------|--------------------------|-----------|-------|
| 45    | 1.5s     | S01    | dialogue        | ?                   | ?               | ?                  | ?                        | ?         | Cold-open R14 coverage |
| 285   | 9.5s     | S02    | dialogue        | ?                   | ?               | ?                  | ?                        | ?         | |
| 570   | 19.0s    | S02→S03| transition      | ?                   | ?               | ?                  | ?                        | ?         | |
| 855   | 28.5s    | S03    | ensemble        | n/a (ensemble tag)  | ?               | ?                  | ?                        | ?         | Cast roster reveal |
| 1140  | 38.0s    | S04    | ensemble        | n/a (ensemble tag)  | ?               | ?                  | ?                        | ?         | Cascade open |
| 1425  | 47.5s    | S04    | ensemble        | n/a (ensemble tag)  | ?               | ?                  | ?                        | ?         | Stat 2 + halo |
| 1710  | 57.0s    | S04    | ensemble        | n/a (ensemble tag)  | ?               | ?                  | ?                        | ?         | Halo + ticker |
| 1950  | 65.0s    | S04    | dialogue        | ?                   | ?               | ?                  | ?★ MUST PASS              | ?★ MUST PASS | Stacked payoff — load-bearing |
| 2235  | 74.5s    | S05    | dialogue        | ?                   | (capture-rect exempt; chrome surround sampled) | (n/a if no chrome text) | ? (chrome surround vs `agency-chrome.png`) | ? | Gameplay mid |
| 2790  | 93.0s    | S06    | dialogue        | ?                   | ?               | ?                  | ?                        | ?         | BURNED logo + R15 #4 |
```

**Header metadata** (per `s2-frame-audit.md` template):
- Gameplay capture rect coordinates (read from `videos/trailer/src/compositions/S05.tsx`): `[x, y, w, h]`.
- Palette-sampling 5-pixel grid: `[(480, 270), (1440, 270), (960, 540), (480, 810), (1440, 810)]`.
- Composition-tag rules: `ensemble` for S03 roster + S04 cascade peak; `transition` for scene boundaries; `dialogue` otherwise. Layer A Composition column is N/A for ensemble (those go through Layer B only).

Briggsy + Claude fill cells using the two-layer rubric from Step 2. Layer A
columns (Composition / Palette / Typography) are Claude-scripted where marked,
Briggsy eye-verified for Typography per Step 2. Layer B is Briggsy eye-only with
reference-frame anchoring.

**Re-evaluation rule** (Adversarial Attack 33 refinement): Marginal-frame re-
evaluation within the same audit pass is permitted **to change PASS → FAIL** (catch
defects on closer look) but NOT FAIL → PASS without a Phase 4 re-render + fresh
extraction. Bias asymmetric toward catching defects, never relaxing the bar.

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
import { existsSync, statSync } from 'node:fs';

// UMB sample timecodes per roadmap §9 — proportional to BURNED samples scaled by
// 4440/2850 = 1.558. Last sample uses 4439 not 4440 to avoid end-of-stream edge case.
// BURNED [45, 285, 570, 855, 1140, 1425, 1710, 1950, 2235, 2790] × 1.558 ≈
// [70, 444, 888, 1332, 1776, 2220, 2664, 3038, 3482, 4347]; final entry clamped to 4439
// for end-of-stream safety. Pairing in `bar-raise-composite.png` step uses this map.
const UMB_SAMPLE_FRAMES = [70, 444, 888, 1332, 1776, 2220, 2664, 3038, 3482, 4439];
// Path resolution: __dirname = `videos/trailer/scripts/`, four ../ levels reach
// `projects/`, then sibling `undercover-mob-boss/` — verified per Feasibility F20.
const UMB_SOURCE = resolve(__dirname, '../../../../undercover-mob-boss/videos/trailer/out/trailer-landscape.mp4');
const OUT_DIR = 'videos/trailer/sample-eval/final-render-qa/umb-samples';

if (!existsSync(UMB_SOURCE)) {
  throw new Error(
    `UMB v3 baseline not found at ${UMB_SOURCE} — required for bar-raise eval. ` +
    `Expected at sibling project path: <repo-parent>/undercover-mob-boss/videos/trailer/out/trailer-landscape.mp4`
  );
}
// Integrity sanity: UMB v3 is 148s; expect file > 50MB. Catches accidental empty/stub.
const umbSize = statSync(UMB_SOURCE).size;
if (umbSize < 50_000_000) {
  throw new Error(`UMB v3 baseline at ${UMB_SOURCE} is ${umbSize} bytes — expected >50MB`);
}

extractFrames({ source: UMB_SOURCE, frames: UMB_SAMPLE_FRAMES, outDir: OUT_DIR });
generateContactSheet({
  inputDir: OUT_DIR,
  frames: UMB_SAMPLE_FRAMES,
  outPath: `${OUT_DIR}/contact-sheet.png`,
  tile: '2x5',
});
```

**Step 2 — Generate side-by-side composite** (design-lens #4).

```ts
// videos/trailer/scripts/generate-bar-raise-composite.ts
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const BURNED_DIR = 'videos/trailer/sample-eval/final-render-qa/sample-frames';
const UMB_DIR = 'videos/trailer/sample-eval/final-render-qa/umb-samples';
const PAIRS_DIR = 'videos/trailer/sample-eval/final-render-qa/bar-raise-pairs';
const OUT = 'videos/trailer/sample-eval/final-render-qa/bar-raise-composite.png';

// BURNED [45, 285, 570, 855, 1140, 1425, 1710, 1950, 2235, 2790] paired with UMB
// proportional samples [70, 444, 888, 1332, 1776, 2220, 2664, 3038, 3482, 4439].
// Pairing math: UMB_frame ≈ BURNED_frame × (4440 / 2850) = ×1.558 (per roadmap §9).
const matchedPairs = [
  ['frame-0045.png', 'frame-0070.png'],
  ['frame-0285.png', 'frame-0444.png'],
  ['frame-0570.png', 'frame-0888.png'],
  ['frame-0855.png', 'frame-1332.png'],
  ['frame-1140.png', 'frame-1776.png'],
  ['frame-1425.png', 'frame-2220.png'],
  ['frame-1710.png', 'frame-2664.png'],
  ['frame-1950.png', 'frame-3038.png'],
  ['frame-2235.png', 'frame-3482.png'],
  ['frame-2790.png', 'frame-4439.png'],
];

// Per-pair side-by-side composites are the PRIMARY eye-in-loop artifact (design-lens F6).
// At 3840×1080 each they read at full-height on a 1920+-wide monitor (each frame
// renders at 960×540 — sufficient for operative-face/R15-chrome detail). The vstack
// composite below is the at-a-glance density check, NOT the primary review surface.
import { existsSync, mkdirSync } from 'node:fs';
if (!existsSync(PAIRS_DIR)) mkdirSync(PAIRS_DIR, { recursive: true });

const pairPaths: string[] = [];
matchedPairs.forEach(([burned, umb], idx) => {
  const pairOut = `${PAIRS_DIR}/pair-${String(idx).padStart(2, '0')}.png`;
  // SAFE: argv array
  execFileSync('ffmpeg', [
    '-y',
    '-i', `${BURNED_DIR}/${burned}`,
    '-i', `${UMB_DIR}/${umb}`,
    '-filter_complex', 'hstack',
    pairOut,
  ]);
  pairPaths.push(pairOut);
});

// Vertical stack all 10 pairs into the density-check composite.
const vstackArgs = [
  '-y',
  ...pairPaths.flatMap(p => ['-i', p]),
  '-filter_complex', `vstack=inputs=${pairPaths.length}`,
  OUT,
];
execFileSync('ffmpeg', vstackArgs);
console.log(`Bar-raise pairs → ${PAIRS_DIR}/pair-NN.png`);
console.log(`Bar-raise density composite → ${OUT}`);
```

The 10 `bar-raise-pairs/pair-NN.png` files are the PRIMARY eye-in-loop artifact
(scroll through 10 full-height side-by-side comparisons). The vstack
`bar-raise-composite.png` is auxiliary (~3840×10800 — useful only as
density-check; renders too small on a typical monitor to surface
operative-face/chrome detail).

**Step 3 — Axis 1: Named-operative density.**

For each of 10 BURNED frames + 10 UMB frames, count named operatives visible
(silhouette, portrait, dossier photo, illustration panel).

- **BURNED operatives** — auto-derived at execution time from
  `src/shared/card-defs.ts` per Phase 7 ADR #26 stat-verification gate.
  Canonical roster: Dash, Vera, Sable, Janet, Neal (5 named operatives in the
  deck) + Agent X (wild card) = 6 shipped. Dolores Grieves recurring NPC on
  Intercepted card art. Otto is `narrative-only-not-shipped` per Phase 1 line 49
  + roadmap §1 — Otto MAY be counted only if he visually appears in a sampled
  frame, which itself would flag a Phase 7 stat-gate failure since Otto has no
  shipped card art. Pre-deepening list said "7 active + 1 NPC" (hallucination
  caught by Adversarial Attack 1 — same shape Phase 7 ADR #26 was created to
  prevent).
- **UMB operatives** — verify UMB roster against
  `projects/undercover-mob-boss/src/shared/card-defs.ts` (or equivalent) at
  execution time; do NOT hand-type. Reference: Charon + named UMB mob-boss
  characters.

**Stat-verification step** (mirrors Phase 7 ADR #26): Before this unit runs,
Claude executes a stat-derive helper that reads BOTH project's `card-defs.ts`
and prints the canonical roster lists. The Unit 6.4 verdict then references the
helper's output, not a hand-typed list — eliminates the hallucination class at
source.

Compute averages:
```
BURNED avg operatives/frame = (sum of operative counts) / 10
UMB avg operatives/frame    = (sum of operative counts) / 10
```

Verdict: BURNED avg > UMB avg → axis 1 clears.

**Axis-1 honesty disclosure** (Adversarial Attack 7 + Product-lens F4): Axis 1 is
a STRUCTURAL-CARDINALITY axis where BURNED's source material has 6× UMB's named
roster by design (BURNED is an ensemble spy show; UMB is a single-narrator noir).
Clearing axis 1 confirms BURNED's roster is on-screen, NOT that BURNED earned a
relative-quality advance over UMB. Axis 1 alone is not a relative-quality proof;
see Step 6 verdict matrix for how axis 1 combines with axis 2 (the only axis
where BURNED and UMB compete on comparable terms).

(Marketing voice stripped per `feedback-proven-not-believed.md` — no "expected"
forecast lines.)

**Step 4 — Axis 2: §2 frame-pass rate.**

Per Unit 6.3 BURNED operational pass rate. UMB v3 pass rate per the BURNED operational
§2 rubric applied to UMB samples — i.e., the same rubric that scores BURNED also scores
UMB.

**Genre-mismatch caveat** (Adversarial Attack 8 + Product-lens F5): the BURNED
operational §2 rubric measures **palette-discipline against BURNED's locked Archer-
coded tokens** (cream/ochre/mahogany/teal/burn-fire). UMB v3 is a NOIR thriller —
desaturated grays/reds/neon by design. Applying BURNED's Archer-token palette to UMB
systematically scores UMB low not because UMB is poor-quality but because it's
off-genre. This makes axis 2 a tilted comparison.

**Two-pass axis 2 verdict to surface the tilt:**
- **Axis 2a (palette-discipline)**: BURNED operational rubric applied to both
  trailers. Records the structural-tilt outcome. BURNED is expected to clear by
  design.
- **Axis 2b (within-genre §2)**: BURNED frames against BURNED's Archer-coded rubric
  (≥8/10 threshold). This is the actual BURNED-quality check — independent of UMB.
  Axis 2b is the gate; axis 2a is documentation.

Verdict: **Axis 2b clears at ≥8/10** AND axis 2a recorded with caveat = axis 2 PASS.

Pre-deepening axis 2 simply applied BURNED rubric to UMB and called it "comparable" —
the doc-review caught the genre-tilt; deepening makes the tilt explicit + adds the
within-genre gate.

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
| Axis 3 clears + Axis 1 clears + Axis 2 fails | PASS (axis-1 advance recorded; remember structural-tilt caveat) |
| Axis 3 clears + Axis 1 fails + Axis 2 clears | PASS (axis-2 within-genre §2 advance proven — strongest relative-quality signal) |
| Axis 3 clears + Axis 1 fails + Axis 2 fails | **FAIL — no relative advance over UMB on a comparable axis** |
| Axis 3 fails + Axes 1+2 both clear | **ITERATE on Axis 3 (R3 sync/composition) — do NOT fail trailer** (Adversarial Attack 21: axes 1+2 cleared means the deeper trailer-design properties hold; R3 is a fixable Phase 4 sync issue, not a whole-trailer failure) |
| Axis 3 fails + axes 1/2 mixed or both fail | FAIL — R3 mechanism broken AND no relative advance |

**Bar-raise honesty: what this test actually measures** (Adversarial Attack 7 + 8 +
Product-lens F4):
- **Axis 1 is a structural-cardinality measurement.** BURNED has 6 named operatives by
  design; UMB has 1 narrator by design. BURNED's roster cardinality is an INPUT to the
  test, not an earned advance.
- **Axis 3 is a structural-difference axis.** R3 was BUILT into BURNED; UMB structurally
  lacks an R3 moment. Axis 3 cleared confirms BURNED has its central mechanism.
- **Axis 2b (within-genre §2) is the only axis measuring earned relative quality.**
  Both trailers compete on the same ≥8/10 frame-pass rate gate; this is the bar-raise
  that isn't tilted by design choice.
- Bar-raise as a comparative test is informative on axis 2b; axes 1+3 are confirmation
  of mechanism, not measurement of advance. The threshold (axis 3 cleared AND ≥1 of
  axes 1/2 cleared) intentionally reduces to "axis 3 mechanism intact + axis 2b quality
  gate met OR axis 1 confirmed" — the verdict matrix above respects that structure.

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
// Imports the AUDIO_ASSETS contract Phase 2 produces. Field names per Phase 2 Unit 2.8
// (phase-2-voice-pipeline.md:4451-4478) — pre-deepening referenced `cue.src` and
// `cue.id` which don't exist on AudioAsset; corrected per Feasibility F4. Real fields:
// `filename` (e.g. `s01-cue-60-sable.wav`), `staticPath` (Remotion staticFile-relative
// path), `startFrame`, `actualFrames`, `voice`, `expectedFrames`, `cueType`,
// `leadFramesHint`, `loudnessLufs`, `cadenceAdapter`.
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { AUDIO_ASSETS } from '../src/lib/audio-manifest';

const FPS = 30;
// AudioAsset.staticPath is relative to setPublicDir target ('../../public' per ADR #8).
// For ffprobe we need on-disk path from repo root: `public/<staticPath>`.
const PUBLIC_ROOT = 'public';

for (const cue of AUDIO_ASSETS) {
  const onDisk = join(PUBLIC_ROOT, cue.staticPath);
  // SAFE: argv array
  const out = execFileSync('ffprobe', [
    '-v', 'error',
    '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1',
    onDisk,
  ], { encoding: 'utf-8' });
  const sourceDurSec = Number(out.trim());
  const expectedStartSec = cue.startFrame / FPS;
  const expectedEndSec = expectedStartSec + sourceDurSec;
  console.log(
    `${cue.filename}: starts ${expectedStartSec.toFixed(3)}s (frame ${cue.startFrame}), ` +
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

| Cue filename | Expected frame | Detected frame (if cross-checked) | Drift (frames) | Tolerance window | Verdict |
|--------------|----------------|-----------------------------------|----------------|------------------|---------|
| `s01-cue-60-<speaker>.wav` | 60 | (manifest-derived or VO-only) | <±N> | [-1, +3] | OK if -1 ≤ drift ≤ +3 |
| `s02-cue-240-dash.wav` | 240 | | <±N> | [-1, +3] | OK if -1 ≤ drift ≤ +3 |
| ... | ... | ... | ... | ... | ... |
| `s04-cue-1950-dash.wav` (R3 stacked payoff) | 1950 | | <±N> | **[-1, 0]** | OK if -1 ≤ drift ≤ 0 — audio MUST NOT lead |
| `s06-cue-2790-dash.wav` (Phrasing) | 2790 | | <±N> | [-1, +3] | OK if -1 ≤ drift ≤ +3 |

(Filenames per Phase 2 convention `s{NN}-cue-{frame}-{voice}.wav`. `<speaker>` at
frame 60 resolves at Phase 0 Unit 0.3 outcome — sable / vera / janet etc. Drift table
rows are auto-generated from `audit-av-sync.ts` console output; manual entry only for
the Detected-frame column when VO-only ground-truth cross-check runs.)

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

Per `feedback-eye-in-loop-beats-calibration-for-motion`: FFmpeg astats numeric
printout misses swell shape. Briggsy LISTENS to the rendered trailer in scrub-
through windows centered on the 5 cue-map moments (single-frame listening is not
physically possible — ~1-2 second listening window per moment per Adversarial
Attack 19):

Spot-check the music-bed envelope at 5 cue-map moments:
- Frame 60 ± 30 (intro hook window): expected 100% loud
- Frame 600 ± 30 (under-S03-build window): expected 55% mid
- Frame 1900 ± 30 (cascade peak window): expected 90% loud
- Frame 1995 ± 30 (post-payoff drop window): expected 25% quiet
- Frame 2790 ± 30 (final sting window): expected 100% loud

Briggsy scrubs to ~2 seconds before each moment, plays through the window, judges
envelope feel ("feels right" / "too loud at intro" / "drop doesn't land" / etc.).
Claude runs whole-trailer astats spot-check for record. Briggsy verdict is
authority; astats numeric is supporting evidence (per Adversarial Attack 30:
astats sampling vs manifest is tautological — Briggsy's ear catches what astats
can't).

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

### Unit 6.6 — Mobile Crop Audit (1.91:1 Actual + 1:1 Conservative + Optional 9:16)

- [ ] **Unit 6.6: Mobile Crop Audit**

**Goal:** Verify critical narrative elements survive X's 1.91:1 in-feed preview crop on
mobile (the surface every X mobile viewer actually sees). Audit additionally against
the 1:1 (1080×1080) conservative safe-square per Phase 1 Unit 1.5 Step 3 (the design-
time discipline). 9:16 vertical-feed audit is GATED on Unit 6.0 Step 6 verification
of X 2026 Immersive Media Viewer surface — if verified, run; if unverified, skip
(per doc-review CALL-1).

**Requirements:** R8 (16:9 + mobile-safe central square), roadmap §5.3, ADR #23
(conditional).

**Dependencies:** Unit 6.3 (sample frames extracted via shared helper); Unit 6.0 Step 6
9:16 surface verification.

**Files:**

- Create: `videos/trailer/sample-eval/final-render-qa/mobile-crop-audit.md`.
- Create: `videos/trailer/sample-eval/final-render-qa/sample-frames-cropped/frame-{N}-mobile-composite.png`
  — per-frame visual composite [full-outlined-191 | 1.91:1 crop | full-outlined-1x1 | 1:1 crop].
- Create (conditional on 9:16 verification): `videos/trailer/sample-eval/final-render-qa/sample-frames-9x16/frame-{N}-9x16-composite.png`
  — per-frame visual composite [full-outlined-9x16 | 9:16 crop] (per Design F7).

**Approach:**

**Step 1 — Generate crops + visual composites for 1.91:1 + 1:1** (design-lens #7 + CALL-6).

Pre-deepening only audited 1:1 conservative; this missed the surface every mobile
viewer actually sees. Adversarial Attack 15 + Product-lens F6 flagged that 1:1
discipline sidelines 78% of horizontal real estate that 1.91:1 preserves. Phase 6
now audits BOTH:

- **1.91:1 (1920×1005)** — X's ACTUAL mobile in-feed crop. Crop math: 1920/1.91 =
  1005.24 → 1005px; centered means top/bottom bands of (1080-1005)/2 = 37.5 → 37
  pixels each, asymmetric by 1 pixel (top=37, bottom=38). For the audit, both bands
  are below detection threshold.
- **1:1 (1080×1080)** — Phase 1 conservative safe-square. Crop math: (1920-1080)/2 =
  420 → bands of 420 pixels each side.

Composite per frame shows [full-with-1.91:1-outline | 1.91:1 crop | full-with-1:1-
outline | 1:1 crop] — reviewer sees both safety levels at once.

```ts
// videos/trailer/scripts/audit-mobile-crops.ts
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';

const SAMPLE_FRAMES = [45, 285, 570, 855, 1140, 1425, 1710, 1950, 2235, 2790];
const SRC_DIR = 'videos/trailer/sample-eval/final-render-qa/sample-frames';
const CROP_DIR = 'videos/trailer/sample-eval/final-render-qa/sample-frames-cropped';
[CROP_DIR].forEach(d => { if (!existsSync(d)) mkdirSync(d, { recursive: true }); });

for (const frame of SAMPLE_FRAMES) {
  const padded = String(frame).padStart(4, '0');
  const src = `${SRC_DIR}/frame-${padded}.png`;

  // 1.91:1 (1920×1005) center crop — X actual mobile in-feed
  const crop191 = `${CROP_DIR}/frame-${padded}-191.png`;
  execFileSync('ffmpeg', ['-y', '-i', src, '-vf', 'crop=1920:1005:0:37', crop191]);

  // 1.91:1 outlined version (red box at boundary)
  const outlined191 = `${CROP_DIR}/frame-${padded}-outlined-191.png`;
  execFileSync('ffmpeg', ['-y', '-i', src,
    '-vf', 'drawbox=x=0:y=37:w=1920:h=1005:color=red@0.8:t=4', outlined191]);

  // 1:1 (1080×1080) center crop — conservative safe-square
  const crop1x1 = `${CROP_DIR}/frame-${padded}-1x1.png`;
  execFileSync('ffmpeg', ['-y', '-i', src, '-vf', 'crop=1080:1080:420:0', crop1x1]);

  // 1:1 outlined version
  const outlined1x1 = `${CROP_DIR}/frame-${padded}-outlined-1x1.png`;
  execFileSync('ffmpeg', ['-y', '-i', src,
    '-vf', 'drawbox=x=420:y=0:w=1080:h=1080:color=blue@0.8:t=4', outlined1x1]);

  // Composite: 2×2 tile [outlined-191 | crop-191 / outlined-1x1 | crop-1x1]
  const compositeOut = `${CROP_DIR}/frame-${padded}-mobile-composite.png`;
  execFileSync('ffmpeg', ['-y',
    '-i', outlined191, '-i', crop191, '-i', outlined1x1, '-i', crop1x1,
    '-filter_complex', '[0:v][1:v]hstack[t];[2:v][3:v]hstack[b];[t][b]vstack',
    compositeOut,
  ]);
}
```

**Step 1b — 9:16 audit (CONDITIONAL on Unit 6.0 Step 6 verification).**

Only execute if `decode-test.md` header (was `decode-test-roster.md` pre-ADR-#21r) records X 2026 Immersive Media Viewer
surface as VERIFIED. Skip entirely otherwise per CALL-1.

```ts
// videos/trailer/scripts/audit-mobile-crops-9x16.ts (only if verified)
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';

const SAMPLE_FRAMES = [45, 285, 570, 855, 1140, 1425, 1710, 1950, 2235, 2790];
const SRC_DIR = 'videos/trailer/sample-eval/final-render-qa/sample-frames';
const VERT_DIR = 'videos/trailer/sample-eval/final-render-qa/sample-frames-9x16';
if (!existsSync(VERT_DIR)) mkdirSync(VERT_DIR, { recursive: true });

for (const frame of SAMPLE_FRAMES) {
  const padded = String(frame).padStart(4, '0');
  const src = `${SRC_DIR}/frame-${padded}.png`;

  // 9:16 vertical center-crop. At 1080-pixel height, 9:16 width = 1080 × 9/16 = 607.5.
  // Round to 608 (chroma-aligned for libx264 yuv420p) — pre-deepening rounded to 607
  // which produces 656+607+657 = asymmetric 1px bands; 608 with x=656 gives
  // symmetric 656+608+656 = 1920 (per Feasibility F17).
  const vertOut = `${VERT_DIR}/frame-${padded}-9x16.png`;
  execFileSync('ffmpeg', ['-y', '-i', src, '-vf', 'crop=608:1080:656:0', vertOut]);

  // Outlined version (red box showing what 9:16 preserves)
  const outlinedOut = `${VERT_DIR}/frame-${padded}-outlined-9x16.png`;
  execFileSync('ffmpeg', ['-y', '-i', src,
    '-vf', 'drawbox=x=656:y=0:w=608:h=1080:color=red@0.8:t=4', outlinedOut]);

  // Composite: [outlined-full | 9:16 crop] hstack (Design F7 — missing in pre-deepening)
  const compositeOut = `${VERT_DIR}/frame-${padded}-9x16-composite.png`;
  execFileSync('ffmpeg', ['-y',
    '-i', outlinedOut, '-i', vertOut,
    '-filter_complex', 'hstack',
    compositeOut,
  ]);
}
```

**Step 2 — Per-frame mobile-crop audit table.**

Reviewer evaluates composite PNGs (not tables) — sees the boundary directly. Table
records verdicts. Vocabulary aligned to Phase 7 Unit 7.1 Step 6 reader (per Design F16):
`GO` = passes crop; `NEEDS-RECOMPOSE` = Phase 4 reopen for re-composition; `NOGO` =
not viable for this surface (Phase 7 skips that surface for this scene).

| Frame | 1.91:1 hero visible? | 1.91:1 verdict | 1:1 hero visible? | 1:1 verdict | 9:16 hero visible? (if verified) | 9:16 verdict (if verified) |
|-------|---------------------|----------------|-------------------|-------------|----------------------------------|----------------------------|
| 45 (S01 cold-open) | Y/N | GO/NEEDS-RECOMPOSE | Y/N | GO/NEEDS-RECOMPOSE | Y/N (or N/A skipped) | GO/NEEDS-RECOMPOSE/NOGO |
| 285 (S02 dossier) | Y/N | | Y/N | | Y/N | |
| 570 (S02→S03 boundary) | Y/N | | Y/N | | Y/N | |
| 855 (S03 roster) | Y/N | | Y/N (right-edge operatives may side-band; flourish OK) | | Y/N | |
| 1140 (S04 cascade open) | Y/N | | Y/N | | Y/N | |
| 1425 (S04 stat 2 + halo) | Y/N | | Y/N (stat = flourish) | | Y/N | |
| 1710 (S04 halo + ticker) | Y/N | | Y/N (ticker = flourish) | | Y/N | |
| 1950 (S04 stacked payoff) | Y/N | | Y/N | | Y/N | |
| 2235 (S05 gameplay) | Y/N (chrome surround visible) | | Y/N | | Y/N | |
| 2790 (S06 closing) | Y/N | | Y/N | | Y/N | |

Critical narrative elements MUST be visible at 1.91:1 (the actual mobile crop).
1:1 verdict is documentation of conservative-discipline state — failing 1:1 while
passing 1.91:1 is acceptable-for-X (record as `1.91:1=GO, 1:1=ACCEPTABLE-FAIL`).
Side-band elements (comms-ticker, side captions, S03 right-edge operatives)
acceptable as flourish even at 1.91:1.

**Step 3 — Action on failures.**

If 1.91:1 audit fails (hero outside actual mobile crop): **route to Phase 4 scene
re-composition** — this is a real mobile-viewer failure, not optional.

If 1:1 audit fails but 1.91:1 passes: ACCEPTABLE-FAIL (the trailer ships well at
X's actual crop; 1:1 was a conservative goal, not a hard requirement). Record as
known-state in `mobile-crop-audit.md` Notes column.

If 9:16 audit fails (and 9:16 is verified): **feeds Phase 7 cutdown decision** — Phase
7 Unit 7.1 Step 6 reads the per-Option 9:16 verdict and branches:
- GO → render vertical cutdown.
- NEEDS-RECOMPOSE → skip with documented reason; do NOT recompose from Phase 7.
- NOGO → skip vertical surface for this trailer.

Verdict feeds Phase 7 via `cutdown-frame-list.md` artifact (Unit 6.8).

**Step 4 — Documentation.**

`mobile-crop-audit.md` records:
- Per-frame audit table (1.91:1 + 1:1 + conditional 9:16).
- Composite PNG references (one composite per frame for 1.91:1+1:1; conditional
  9:16 composite separate per Step 1b).
- 9:16 surface verification status (from Unit 6.0 Step 6).
- 9:16 cutdown feasibility per scene (GO / NEEDS-RECOMPOSE / NOGO) — populated
  ONLY if 9:16 audit ran.

**Patterns to follow:**

- Roadmap §5.3 mobile-crop rule + ADR #23 9:16 audit addition.
- Phase 1 Unit 1.5 Step 3 safe-square design discipline.
- design-lens deepening #7 — visual artifact, not table cells.

**Test scenarios:**

- **Happy path:** All 10 frames pass 1.91:1 mobile-crop audit; most frames pass 1:1
  conservative (some marginal scenes acceptable-fail on 1:1 while passing 1.91:1);
  9:16 path (if verified) most frames pass with documented side-band acceptables.
- **Edge case:** S03 roster reveal has right-edge operatives outside 1:1 but inside
  1.91:1; acceptable as flourish (cast-density chrome, not primary hero); document
  as known-side-band. The whole point of widening to 1.91:1 audit is to reclaim
  these as visible, not failed.
- **Edge case:** 1.91:1 hero is fine, 1:1 hero clipped → ACCEPTABLE-FAIL (record;
  no Phase 4 reopen).
- **Edge case:** 1.91:1 hero clipped → real failure; route to Phase 4 scene re-
  composition.
- **Edge case:** 1.91:1 + 1:1 both pass; 9:16 clipped (if verified) → Phase 7 may
  skip vertical for that scene; not a Phase 6 fail.
- **Edge case:** 9:16 surface unverified at Unit 6.0 Step 6 → 9:16 audit skipped
  entirely; `mobile-crop-audit.md` records "9:16 surface unverified — audit skipped
  per CALL-1."

**Verification:**

- 10 frames × 4 outputs each (1.91:1 crop + 1.91:1 outlined + 1:1 crop + 1:1
  outlined) = 40 PNGs, plus 10 mobile-composite (2×2 tile) PNGs.
- If 9:16 verified: + 10 9:16 crops + 10 9:16 outlined + 10 9:16-composite PNGs.
- `mobile-crop-audit.md` populated with per-frame audit (1.91:1 + 1:1 + conditional
  9:16) + 9:16 cutdown feasibility row (conditional).

---

### Unit 6.7 — Decode Test (Briggsy cold-watch per ADR #21r) + Final QA Report

- [ ] **Unit 6.7: Decode Test + Final QA Report**

**Goal:** Run the cold-watch decode test on the full 95-second trailer
per **ADR #21r** (N=1 Briggsy cold-watch; ADR #21 N=6 human panel
SUPERSEDED 2026-05-22). Then aggregate all Phase 6 Unit results into
the final QA report + Briggsy end-to-end watch + Briggsy sentinel
sign-off.

**Requirements:** Success Criteria + R14 + R15 + ADR #21r protocol.

**Dependencies:** Units 6.0, 6.2, 6.3, 6.4, 6.5, 6.6 complete (Unit
6.0 tester-recruitment step REPEALED per ADR #21r).

**Files:**

- Create: `videos/trailer/sample-eval/final-render-qa/decode-test.md`.
- ~~Create: `videos/trailer/sample-eval/final-render-qa/decode-audio/tester-{N}.{m4a,ogg}`~~ —
  REPEALED per ADR #21r; no tester voice-memos.
- Create: `videos/trailer/sample-eval/final-render-qa/qa-report.md` —
  aggregate (verdict-first structure per design-lens #5).
- Create: `videos/trailer/sample-eval/final-render-qa/briggsy-review-6.7.signoff` —
  final QA sign-off sentinel (ADR #22).

**Approach:**

> **ACTIVE PROTOCOL — ADR #21r (2026-05-22 supersession of ADR #21).**
>
> Briggsy is the cold-watch panel of one. After a 24h cool-off from
> the final render, Briggsy watches the full 95s trailer once,
> cold (no in-composition recall priming), with sound. He answers
> Q1 (free recall) by typing 60-90 seconds of unguided text into
> `decode-test.md`. He then answers Q2 (prompted recall — "anything
> you noticed about HOW this trailer was made?"). He adjudicates
> his own response against the keyword rubric (PRIMARY / SECONDARY
> / AESTHETIC) using the same definitions ADR #21 specified.
>
> No tester recruitment. No UMB v3 control panel. No audio recording.
> No Whisper transcription. The team is just Briggsy + Claude(s)
> forever; no outside human eye is structurally available. Briggsy's
> contamination as sole decode subject is an **accepted residual
> risk**, mitigated by the 24h cool-off + cold-watch + Q1-before-Q2
> ordering. The diagnostic remains **DIAGNOSTIC, not GO/NOGO** —
> Briggsy's end-to-end watch is GO/NOGO authority per CALL-3.
>
> The ADR #21 panel-machinery prose below (Step 1 / Step 2 / Step 3)
> is preserved as audit trail with `[SUPERSEDED]` markers. Do NOT
> execute that protocol; execute this one.

**`decode-test.md` template under ADR #21r:**

```md
# Decode Test (ADR #21r — N=1 Briggsy cold-watch)

## Cool-off window
- Final render date: <YYYY-MM-DD HH:MM>
- 24h cool-off elapsed: YES at <YYYY-MM-DD HH:MM>
- Cold-watch date: <YYYY-MM-DD HH:MM>

## Q1 — free recall (typed AFTER playback, no prior priming)
Briggsy's verbatim response (60-90 sec of unguided text):
<typed>

## Q2 — prompted recall ("anything about HOW it was made?")
Briggsy's verbatim response:
<typed>

## Self-adjudication per keyword rubric
- PRIMARY trigger phrases (TOOL + BUILD verb OR CATEGORY + BUILD verb): "<quote>" / none
- SECONDARY trigger phrases (CATEGORY without BUILD verb but unambiguous AI gesture): "<quote>" / none
- AESTHETIC mentions only: "<quote>" / none
- Adjudication reasoning for ambiguous edges: <verbatim>
- Diagnostic verdict columns: primary=YES/NO, secondary=YES/NO, aesthetic=YES/NO

## Failure-route triage (if both primary + secondary = NO)
- Q1 + Q2 primary FAIL → R14 cold-open weak → consider Phase 1 Unit 1.2 reopen + Phase 2 cue 60 regen
- Q1 primary FAIL + Q2 primary PASS → R15 chrome insufficient → consider Phase 3 + Phase 4 R15 placement iteration
- Both primary + secondary FAIL → product-level brainstorm reopen
- Primary FAIL + Secondary CLEAR → water-beads decode landed via visual route; per roadmap §10 tiebreaker, sign-off-with-trade is acceptable

(Diagnostic-only per CALL-3 — Briggsy may sign-off-over per qa-report.md.)
```

---

**[SUPERSEDED 2026-05-22 by ADR #21r — preserved as audit trail; do NOT execute]**

**Step 1 — Decode test protocol (ADR #21 with doc-review tightening).**

**Status per doc-review CALL-3**: The decode test is **DIAGNOSTIC — it routes Briggsy's
attention to which signal failed (R14 cold-open vs R15 chrome vs both) and which
upstream phase to reopen. It does NOT gate Phase 6 ship/iterate** (per roadmap §10
water-beads tiebreaker + `feedback-elite-team-standard.md`). Briggsy's end-to-end watch
is GO/NOGO authority. Adversarial pass surfaced methodological problems (Hawthorne
effect, priming contamination, within-subjects order effects, N=6 noise-floor threshold)
that are tolerable in a diagnostic but untenable in a gate.

Panel size + control + priors elicitation per ADR #21 (kept as diagnostic structure;
do NOT relax just because demoted to diagnostic):
- **Listeners**: ≥6 engineering-peer testers (Unit 6.0 confirmed panel + 1 hot-spare).
- **Priors elicitation** (pre-test, scheduled ≥24h BEFORE BURNED stimulus per
  Adversarial Attack 5 — working memory flush time): for each tester, ask "When you
  see a project from Briggsy on Discord, what's your prior on how it was built?"
  Exclude testers whose unprompted answer already names "AI / agent / autonomous /
  Claude." Document elimination.
- **UMB v3 control panel** — restructured per Adversarial Attack 6 to address within-
  subjects order effects: half the panel (3 testers, "BURNED-only arm") sees ONLY
  BURNED with no UMB exposure; half (3 testers, "UMB-control arm") sees ONLY UMB v3
  with no BURNED exposure. **Between-subjects** design, eliminates order-effect
  contamination. If UMB arm surfaces autonomy ≥2 of 3 (≥67%), the recruitment pool
  is contaminated by priors and BURNED arm verdict is invalid; re-recruit. If pool
  too thin for the split (Feasibility F8 — Briggsy's Discord pool may not support 6
  testers per arm), fall back to within-subjects with explicit UMB-first order
  acknowledged as a contamination vector, treat result as weaker diagnostic signal.
- **BURNED stimulus**: full 95-second trailer played cold.
- **Q1 (free recall, asked AFTER playback)** — pre-deepening prompt capped tester
  responses at 30-60s (Adversarial Attack 4) while acceptance window is 90s; the
  prompt structurally undermined the window. Corrected prompt: "Take as long as you
  want — what comes to mind when you watch this trailer? What's it about, and if you
  have any guesses about how it was made, name those too." Record the first 90
  seconds for analysis. No time-budget framing in the question.
- **Q2 (prompted recall, asked AFTER Q1 transcript complete)**: "Anything you noticed
  about HOW this trailer was made — production process, tooling, anything like that?"
  Q2 does NOT feed the ≥3/6 threshold; it feeds failure-route triage only.

**Diagnostic-grade verdict** (NOT a Phase 6 GO/NOGO gate per CALL-3): ≥3 of 6 BURNED-arm
testers surface "AI / agent / autonomous / built itself" unprompted in Q1 (within the
90s post-stimulus window). At N=6 (or N=3 in BURNED arm under between-subjects), the
threshold is informative-not-statistical (Adversarial Attack 3: 3/6 is at the random-
noise floor for a binary outcome). Treat the verdict as: "≥3 hit → diagnostic signal
positive; record in qa-report.md. <3 hit → diagnostic signal negative; investigate via
failure-route triage (Step 3); Briggsy decides whether to iterate or sign-off-over."

**Keyword precision (ADR #21) — broadened scope per Product-lens F13 (water-beads
tiebreaker)**:
- **PRIMARY counts** (BUILD-PROCESS / AGENT-AUTHORSHIP): "AI built the game," "Claude
  wrote this," "an agent built it," "autonomous development." This is the load-bearing
  R15-chrome signal — record under `decode-test-primary` column.
- **SECONDARY counts** (AI-DETECTED via ANY vector — water-beads decode mechanism per
  roadmap §10): "looks AI-generated," "the visuals are AI," "feels like Midjourney did
  this," "this trailer was made by AI." Pre-deepening rule rejected these as "RENDER
  TECHNOLOGY"-only and excluded them — but water-beads tiebreaker says product-joy
  wins over engineering-talk-about-build. Record under `decode-test-secondary` column.
- **AESTHETIC counts** (no AI/agent reference): "polished," "Archer-coded," etc. —
  record under `decode-test-aesthetic` column. Does NOT count toward either column
  above unless tester volunteers AI/agent reference.

Diagnostic verdict combines columns: "BURNED primary ≥3/6 OR (primary + secondary) ≥4/6
= AI-decode signal positive." Avoids false-negative when testers fully decode "this is
AI" via the visual route.

**Briggsy adjudication rubric** (binds discretion per Adversarial Attack 34 — Briggsy
is trailer creator with stake in passing):
- TOOL name (Claude / Cursor / GPT / specific agent name) + BUILD verb (built / wrote /
  made / generated / coded) = PRIMARY.
- CATEGORY (AI / agent / autonomous) + BUILD verb = PRIMARY.
- CATEGORY without BUILD verb but unambiguous gesture at "this is AI work" ("feels
  AI-touched") = SECONDARY.
- Visual/aesthetic descriptors without AI/agent reference = AESTHETIC (no count).
- Ambiguous edge cases: Briggsy adjudicates with verbatim reasoning recorded in
  `decode-test.md`. For high-stakes edge cases at threshold (test verdict flips on
  one ambiguous call), Briggsy delegates to Harry or another non-creator for a
  second opinion.

**[SUPERSEDED 2026-05-22 by ADR #21r — preserved as audit trail; do NOT execute]**

**Step 2 — Tester response recording.**

**Execution path** (default — per Design F11): Briggsy schedules each tester
sequentially (one tester at a time via Discord voice DM live call OR scheduled
voice-memo upload). For live calls: Briggsy plays the trailer for the tester via
screen-share (keeps the unreleased trailer file on Briggsy's machine — per Security
F4), times the 90s reaction window manually, ends recording at the 90s mark.

**Async path** (when Briggsy cannot schedule a live slot): instruct the tester
explicitly: "Start recording immediately when the trailer ends. You have 90 seconds.
Go." Tester self-times the 90s window. Note: for between-subjects panel arms per Step
1 (3 BURNED-only + 3 UMB-control), live path is preferred to ensure each arm sees
only its assigned trailer.

**Tester consent** (per Security F3): before recording, ask "I'll be recording your
Q1 reaction and may transcribe it locally with Whisper or have Briggsy type it
verbatim. Audio stays on Briggsy's machine. OK to proceed?" Document consent in
`decode-test.md` per-tester header.

**Audio ingest**: Briggsy uploads audio to `decode-audio/tester-{N}.{m4a,ogg,opus}`
(formats per Feasibility F28 — Discord voice DMs are typically `.opus` codec in
`.ogg` containers, iOS Voice Memos are `.m4a`). Directory is gitignored (Security F4).

**Transcription** (per Feasibility F6): pre-deepening cited
`mcp__gemini-grounding__search_with_grounding` for audio transcription — but that MCP
tool does web search + grounding, NOT audio transcription. Corrected options:
- **Default**: Briggsy types verbatim during/after the live call. Lowest data-exposure
  (audio never leaves Briggsy's machine).
- **Alternative**: Local Whisper CLI — `whisper tester-{N}.m4a --output_format txt
  --model medium`. Local-only; no third-party data transfer. Requires Whisper
  installed; small startup cost but reusable across the panel.
- **Last resort**: Anthropic Claude API with audio input (if available) or Google
  Gemini API directly with audio input — but this transfers tester voice to a
  third-party service. Only with explicit tester consent per Step 2 disclosure.

Either way: path named, actor named, artifact local-not-committed, transcript committed
in `decode-test.md` body.

For each tester, recorded in `decode-test.md`. Header format aligned per Design F15
to make the YES/NO scan instant (separate verdict label from evidence quote):

```md
### Tester N — Decode primary: YES / Decode primary: NO

Pre-test profile:
- Engineering-peer? YES / NO
- Has seen UMB v3? YES / NO
- LLM/agent tooling exposure (Claude, Cursor, etc.)? YES / NO
- Panel arm: BURNED-only / UMB-control (Step 1 between-subjects design)
- Recording consent recorded: YES (date)

Stimulus + recording:
- Stimulus shown: BURNED / UMB v3
- Recording path: phone-voice-memo / discord-voice-dm / live-call
- Audio file: `decode-audio/tester-{N}.{m4a,ogg,opus}` (gitignored)
- Transcription method: briggsy-typed / whisper-local / external-api (with consent)

BURNED Q1 verbatim transcript (90-second window):
[60-90 second transcript]

BURNED Q2 verbatim transcript (if Q1 primary did NOT surface):
[prompted-recall transcript]

Briggsy keyword adjudication (rubric per Step 1):
- PRIMARY trigger phrases (if any, quoted verbatim): "[quote]" / none
- SECONDARY trigger phrases (if any): "[quote]" / none
- AESTHETIC mentions (if any): "[quote]" / none
- Adjudication reasoning (for ambiguous cases): [verbatim]
- Verdict columns: primary=YES/NO, secondary=YES/NO, aesthetic=YES/NO
```

Two YES/NO labels in the header (primary + secondary) make the diagnostic-aggregate
scan instant. Count primary-YES across BURNED-arm = primary count. Count primary-YES
OR secondary-YES = combined count.

**[SUPERSEDED 2026-05-22 by ADR #21r — preserved as audit trail; the failure-route triage logic is preserved inside the new ADR #21r template above as Briggsy's self-triage; do NOT execute the panel-version below]**

**Step 3 — Failure-route triage** (diagnostic-only per CALL-3 + scope-guardian
Challenge 3).

Decode-test diagnostic NEGATIVE (primary <3/6 AND combined primary+secondary <4/6) does
NOT block Phase 6 ship — Briggsy may sign-off-over per qa-report.md Sign-offs-over-FAILs
section. But the diagnostic surfaces WHICH signal failed, which routes Briggsy's
attention if iteration IS chosen:

- **Q1 primary fail + Q2 primary pass** for ≥3 BURNED-arm testers: signal SEEDED BUT
  NOT SURFACED → R15 chrome layer insufficient → suggest **Phase 3 + Phase 4** for R15
  placement iteration (additional R15 instances OR more visible placement). Mini-phase-
  reopen: NOT cheap (Phase 1 typography re-lock + Phase 3 asset prep + Phase 4
  placement).
- **Q1 + Q2 primary fail** for ≥3 BURNED-arm testers: signal NOT LANDING → R14 cold-
  open weak → suggest **Phase 1 Unit 1.2 reopen + Phase 2 cue 60 regen**.
- **Both primary + secondary fail across panel**: signaling mechanism (R14 + R15 +
  Dash VO + visual decode) collectively negative → suggest **product-level brainstorm
  reopen** (R14/R15 design reframe; structural change).
- **Primary fail + Secondary clear**: signal LANDS but not via R15 chrome — water-
  beads-dominated decode. Per roadmap §10 tiebreaker, this is a positive trailer
  outcome on the actual goal. Suggest accepting trailer as-is; primary-channel-only
  scoring undercounts the actual decode. Briggsy can sign-off-with-trade.

**Tester-pool exhaustion** (per Adversarial Attack 35): if Briggsy chooses to iterate
and Phase 6 re-enters Unit 6.7 after upstream phase ships, the original 6 testers are
PRIORS-POLLUTED (have seen the trailer once; second viewing is no longer cold). Phase
6 plans for this:
- Unit 6.0 Step 4 recommended recruiting 12 testers in two waves (6 + 6 reserve) per
  Step 5 feasibility check. Wave 2 runs on retest.
- Wave 2 priors are partially polluted via Discord network leakage (engineering peers
  talk). Wave 2 signal is noisier than Wave 1; accept it as such.
- **Hard cap: 2 retest waves before escalating to brainstorm-level reframe.** Beyond
  2 waves, the trailer's decode mechanism is structurally broken (not iteratively
  fixable). Briggsy decides at that point whether to ship despite negative decode
  signal (water-beads watch path) or accept the trailer needs structural reframe.

Phase 6 records routing decision + tester-pool wave status in `decode-test.md`; does
NOT execute remediation. Phase 6 is detect-not-fix.

**Step 4 — Aggregate QA report (verdict-first structure per design-lens #5).**

`qa-report.md`:

```md
# Final Trailer QA Report — Phase 6 Sign-Off

## VERDICT
**Phase 6: GO for Phase 7 distribution** / **Phase 6: ITERATE — Briggsy withheld
sign-off**

**Authority**: Briggsy end-to-end watch (Step 4a). Sub-verdicts below ROUTE attention
but do not gate ship (per doc-review CALL-3 + `feedback-elite-team-standard.md`).
Briggsy MAY sign-off-over a sub-verdict FAIL by documenting the trade in the
"Sign-offs over FAILs" section below; Briggsy MAY NOT grant GO when the
`verify:trailer-final` machine gate FAILs (that gate is non-overridable).

## Machine gate (non-overridable)
| Check | Verdict |
|-------|---------|
| `verify:trailer-final` encoding + content asserts (Unit 6.0) | PASS / FAIL |

## Sub-verdicts (diagnostic — route attention)
| Check | Verdict | Routing if FAIL |
|-------|---------|-----------------|
| §2 frame-pass rate ≥8/10 (Unit 6.3 two-layer rubric: Production Discipline + Archer-Fidelity) | PASS / FAIL | Phase 4 failing-scene rerender |
| Bar-raise vs UMB v3 (Unit 6.4 Step 6 verdict matrix) | PASS / FAIL / ITERATE-AXIS-3 | Phase 4 targeted iteration |
| Audio-video sync ADR #20 asymmetric tolerance (Unit 6.5) | PASS / FAIL | Phase 2 / Phase 4 per diagnose |
| Mobile crop audit 1.91:1 + 1:1 + conditional 9:16 (Unit 6.6) | PASS / ACCEPTABLE-FAIL-1:1 / FAIL | Phase 4 scene re-composition (FAIL only) |
| Decode test diagnostic (Unit 6.7) — Briggsy cold-watch (ADR #21r 2026-05-22): Q1 free-recall PRIMARY YES or SECONDARY YES | POSITIVE / NEGATIVE | Per Unit 6.7 active protocol routing (diagnostic-not-gate) |
| R13 acceptance (Phase 5 EXIT inherited) | PASS / FAIL | Phase 5 reopen |

## Detail per sub-verdict

For each row above, write the section in this order:

### Machine gate detail
- If PASS: `[PASS — see verify-trailer-final output in render-settings-log.md]`
- If FAIL: expanded detail with failing assertion + routing.

### §2 frame-pass rate detail
- If PASS: `[PASS — see s2-frame-audit.md per-frame table; ≥8 of 10 frames PASS Layer A + Layer B]`
- If FAIL: expanded detail with failing frames + routing.

### Bar-raise detail
- If PASS: `[PASS — see bar-raise-eval.md; verdict matrix row: <which row>]`
- If ITERATE-AXIS-3: `[ITERATE — axes 1+2 cleared, R3 sync needs Phase 4 reopen; bar-raise NOT failed per Step 6 matrix Adversarial Attack 21]`
- If FAIL: expanded detail + routing.

### A/V sync detail
- If PASS: `[PASS — see av-sync.md drift table]`
- If FAIL: expanded detail with diagnose + routing per Unit 6.5 Step 2b.

### Mobile crop detail
- If PASS or ACCEPTABLE-FAIL-1:1: `[Status: <status> — see mobile-crop-audit.md per-frame table]`
- If FAIL: expanded detail with failing frames + 1.91:1 verdict + routing.

### Decode test detail
- ALWAYS expand (decode test is diagnostic; always summarize the signal regardless of POSITIVE/NEGATIVE).
- Include: primary count / secondary count / aesthetic count / Briggsy adjudication notes / Q1 transcripts cited / Q2 transcripts cited (for FAIL paths only).

### R13 acceptance detail
- If PASS: `[PASS — see PHASE-5-EXIT.md R13 verdict]`
- If FAIL: route to Phase 5 reopen.

## Deliverable
- File: `videos/trailer/out/trailer.mp4`
- Duration: <measured>s (target 95.0 ±0.5s)
- File size: <N> MB
- Codec: H.264 High / CRF 18 / `--x264-preset slow` / yuv420p / AAC 128k mono / -16 LUFS / faststart

## Distribution-target playback verification
[Mirror from render-settings-log.md Step 4 table]

## Briggsy end-to-end watch (Step 4a — GO/NOGO authority)
- Date: <YYYY-MM-DD>
- Player(s) used: <list>
- Notes: <any observations; this is the load-bearing judgment per CALL-3>

## Sign-offs over FAILs (if Briggsy signed-off despite any sub-verdict FAIL)
- Sub-verdict that FAILed: <name>
- Briggsy's tradeoff rationale: <verbatim>
- Documented in: `briggsy-review-6.7.signoff` body

## Briggsy sign-off
- `briggsy-review-6.4.signoff`: committed under briggsy007@gmail.com on <date>
- `briggsy-review-6.7.signoff`: committed under briggsy007@gmail.com on <date>
- Hand-off to Phase 7: GO / NOGO
```

**Step 4a — Briggsy end-to-end watch (GO/NOGO authority)** (`feedback-elite-team-
standard.md` + CALL-3 asymmetric authority lock).

BEFORE sign-off, Briggsy watches `out/trailer.mp4` end-to-end in at least one
player (Films & TV / Chrome / Safari iOS / etc.). **The watch is the GO/NOGO
authority. Sub-verdicts ROUTE attention; they do NOT gate ship.**

Asymmetric authority contract:
- Briggsy's watch CAN withhold sign-off when all sub-verdicts PASS (something feels
  off; quality bar not met; water-beads not landing).
- Briggsy's watch CAN grant sign-off when sub-verdicts FAIL (sign-off-over-FAIL with
  documented tradeoff per qa-report.md Sign-offs section).
- Briggsy's watch CANNOT grant sign-off when the `verify:trailer-final` machine gate
  FAILs (encoding+content asserts are non-overridable).

**Briggsy-watch failure protocol** (per Adversarial Attack 21): if Briggsy
withholds sign-off, the path is:
1. Briggsy describes what feels off in prose ("the music swell is too loud," "S04
   cascade reads as a lot of artifacts not discipline + TASTE," "stamp slap doesn't
   land at frame 1950 it feels late").
2. Claude reproduces the issue in a sample frame, audio clip, or per-frame measurement
   that supports or refutes the prose verdict.
3. Claude maps the issue to a phase + a hypothesis ("Phase 2 cue-1950 onset drifted
   to +2 frames in final mix" / "Phase 4 cascade composition kept layered-simultaneous
   contra Phase 1 deepening lock" / "Phase 1 line text is too dense at 4.2 wps").
4. Briggsy approves the routing diagnosis OR redirects.
5. Phase 6 re-enters the affected unit after the upstream phase ships the fix.

Record watch + any withhold protocol in qa-report.md Briggsy section above.

**Step 5 — Sign-off sentinel ceremony (ADR #22).**

After Briggsy watch confirms quality (sub-verdicts route attention, do not gate per
CALL-3):

`briggsy-review-6.7.signoff` content (all-pass path):
```
Phase 6 final QA approved. GO for Phase 7 distribution.
- Machine gate verify:trailer-final: PASS
- All sub-verdicts (§2 / bar-raise / A/V sync / mobile-crop / decode diagnostic / R13): PASS
- Briggsy watched out/trailer.mp4 end-to-end on <date> in <player(s)>
- Bar-raise: PASS (verdict-matrix row: <which row>; axis 2b within-genre §2 cleared)
- Decode test diagnostic: POSITIVE (<N>/6 primary surfaced, <M>/6 secondary surfaced)
- Hand-off: GO
Date: <YYYY-MM-DD>
```

`briggsy-review-6.7.signoff` content (sign-off-over-FAIL path):
```
Phase 6 final QA approved with documented tradeoff. GO for Phase 7 distribution.
- Machine gate verify:trailer-final: PASS (non-overridable; PASS required)
- Sub-verdicts: <list of PASSes and FAILs>
- Briggsy watched out/trailer.mp4 end-to-end on <date> in <player(s)>
- Sign-off-over-FAIL: <which sub-verdict> FAILed; Briggsy chose to sign-off because
  <verbatim rationale — e.g., "decode test surfaced only 2/6 primary but Briggsy's
  watch confirmed water-beads bar met and §10 tiebreaker favors product-joy over
  engineering-talk-about-build">
- Hand-off: GO
Date: <YYYY-MM-DD>
```

Git-committed under Briggsy's git author identity (`briggsy007@gmail.com`); `pnpm
verify:briggsy-sentinels` enforces author-check.

**Step 6 — Distribution hand-off.**

If sentinel committed:
- `out/trailer.mp4` finalized
- `out/thumbnail.png` finalized
- Phase 6 exits; Phase 7 begins (Phase 7 entry gate checks sentinel)

**Patterns to follow:**

- ADR #21r decode-test protocol (supersedes ADR #21 — 2026-05-22).
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
- ~~**Edge case:** Decode test ≥3 of 6 BUT UMB control panel ALSO
  surfaced autonomy ≥2 of 6 → panel contaminated; re-recruit; re-run.~~
  — REPEALED per ADR #21r (2026-05-22). New edge case under ADR #21r:
  Briggsy's cold-watch surfaces autonomy in Q1, but he's uncertain
  whether the surfacing is honest or self-anchored → extend cool-off
  to 48-72h and re-administer Q1 with a fresh draft of `decode-test.md`.
- **Edge case:** Bar-raise clears axis 3 only → FAIL per Phase 6
  deepening threshold; route to Phase 4 axis-1 or axis-2 iteration.
- **Edge case:** Briggsy watches end-to-end and feels something is
  off that no audit caught → sign-off withheld; iterate per Briggsy
  direction; this is the eye-in-loop catching what calibration missed.

**Verification:**

- Decode test runs as Briggsy cold-watch (N=1) per ADR #21r 2026-05-22
  (was "≥6 testers + UMB control panel" pre-supersession).
- `decode-test.md` documents Briggsy's Q1/Q2 responses + self-adjudication.
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
- Decode test (Briggsy cold-watch per ADR #21r 2026-05-22): PRIMARY YES/NO, SECONDARY YES/NO — POSITIVE / NEGATIVE
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

## Notes for Phase 7 (non-binding; cutdown selection is Phase 7's call)
- Highest-signal Option per Phase 6 audit data: Option <A/B/C>
- Reasoning: <short — based on which Options preserve which signals + Briggsy's
  preference if expressed during watch>
```

**Phase 6 vs Phase 7 ownership** (per doc-review CALL-7 + Scope-guardian F3 + Product-
lens F8): Phase 6 ships AUDIT DATA per Option (frame ranges + preserved signals + 9:16
verdict if verified + raw timing-window metadata for Phase 7's ADR #25 application).
**Phase 6 does NOT make the cutdown selection.** Phase 7 has the distribution context
(timing, follow-up posts, X feed dynamics) Phase 6 lacks; Phase 7 picks A/B/C with
that context.

**Phase 7 contract (preserved from Phase 7 deepening cross-phase amendment):** Phase 7
picks ONE of the documented Options A/B/C; Phase 7 does NOT invent a 4th option. Pre-
deepening Phase 7 invented a 4th option ("Candidate B — cascade peak → gameplay" at
frames 1860–2220 — not present in any Phase 6 Option) which is structurally prevented
by the A/B/C cap. Phase 7 may override Phase 6's non-binding highest-signal note with
a `briggsy-review-7.1.signoff` sentinel documenting the override reason — but Phase 6's
note is informational, not a default Phase 7 inherits.

**Timing-window metadata per Option** (Phase 6 ships RAW data; Phase 7 ADR #25 applies
the composed-not-mid-motion verdict per CALL-7 inverted-dependency cleanup):

```md
- Segment N starts at frame X.
  - Nearest interpolate() window boundary per `transitions.ts`: frame Y, distance N frames
  - Settled-state from frame Y to frame Z (per `transitions.ts` line W)
  - (Phase 7 Unit 7.1 applies ADR #25 to make composed-not-mid-motion verdict)
```

Example for Option A/C frame 1880 (R3 stacked-payoff segment start):
- Nearest interpolate() boundary: frame 1860 (ticker-brightening ease completion per
  Phase 1 line 1326 amended row)
- Settled-state from frame 1860 to frame 1950 (held bright 1860-1950)
- Distance from boundary: 20 frames past completion (PASS-likely on ADR #25 application)

Phase 7 ADR #25 reads this metadata and produces the PASS/FAIL verdict; Phase 6 does
not anticipate that verdict.

**File-size metadata per Option** (Phase 6 ships RAW data; Phase 7 measures actual size
when it renders per Scope-guardian F4):

```md
- Full-trailer file size at production encoding: <N> MB (measured at Unit 6.1 final
  render)
- Option N frame count: <count>
- Linear-prorate estimate (low-confidence): <full_size * option_frames / 2850> MB
- (Phase 7 Unit 7.1 verifies actual size against X 512 MB cap + ADR #28 8-12 Mbps
  target when it renders the cutdown.)
```

Phase 7 verifies actual size; Phase 6 provides the prorate hint with explicit low-
confidence flag.

**9:16 cutdown feasibility — Phase 7 contract (clarified 2026-05-17, conditional per
doc-review CALL-1):** This section populated ONLY if Unit 6.0 Step 6 verified X 2026
Immersive Media Viewer surface. If unverified, omit entire 9:16 section.

If verified, Phase 7 Unit 7.1 Step 6 reads the 9:16 verdict per the selected Option
and:
- **GO** → renders second cutdown via `vf "crop=608:1080:656:0,scale=1080:1920:flags=lanczos"`
  (note: 608 not 607 per Feasibility F17 chroma-alignment fix)
- **NEEDS-RECOMPOSE** → skips with documented reason; does NOT recompose from Phase 7
  (Phase 4 work; out of Phase 7 scope)
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

### Active risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| §2 frame-pass rate <8/10 | Medium | High (per Success Criteria) | Two-layer rubric (Layer A Production Discipline + Layer B Archer-Fidelity) per Unit 6.3 Step 2; per-failure-frame recompose (Phase 4 scene iteration) routes cleanly. |
| Bar-raise axis 3 cleared but axes 1+2 both fail → bar-raise FAIL per Step 6 matrix | Medium | High | Phase 4 targeted iteration on axis 1 (operative density visibility) or axis 2b (within-genre §2). |
| Bar-raise axis 3 fails + axes 1+2 both clear | Low | Medium (NOT bar-raise FAIL per Step 6 row 5) | Phase 4 reopen on R3 sync/composition only; trailer keeps its quality bar elsewhere — per Adversarial Attack 21. |
| Decode test diagnostic NEGATIVE (Briggsy may sign-off-over) | Medium | Diagnostic-only (CALL-3 — does not block ship) | Routing-only response per Unit 6.7 Step 3; Briggsy sign-off-over-FAIL documented in qa-report.md Sign-offs section. |
| ~~Decode panel priors-polluted (≥2/3 UMB-arm surfaces autonomy)~~ | REPEALED per ADR #21r (2026-05-22) | n/a | No panel; risk is moot. Briggsy's own contamination accepted as residual risk per ADR #21r. |
| ~~Decode-test recruitment slips (pool can't support N=6 + reserves)~~ | REPEALED per ADR #21r (2026-05-22) | n/a | No recruitment; risk is moot. |
| ~~Tester-pool exhaustion across iteration waves~~ | REPEALED per ADR #21r (2026-05-22) | n/a | No tester pool; risk is moot. If Briggsy iterates Unit 6.7 across waves, each cold-watch is contaminated by prior viewings — accepted residual risk; hard cap 2 retest waves still applies as a structural-reframe trigger. |
| Audio onset drift on R3 — audio LEADS visual by ≥1 frame | Low | HARD FAIL per ADR #20 | Unit 6.5 Step 3 explicit check; diagnose-before-fix routes drift source to Phase 2 or Phase 4. |
| Audio-video drift after final encode (standard cues) | Low | Medium | Unit 6.5 manifest-driven audit; asymmetric tolerance per ADR #20. |
| Encoder muxing drift accumulation on R3 | Low-Medium (AAC frame ~21ms vs video frame 33ms boundary) | Medium per ADR #20 R3 `[-1, 0]` window | If `audit-av-sync.ts` reports R3 drift consistently near 0 with sub-frame uncertainty, run optional VO-only ground-truth cross-check (Unit 6.5 Step 1 cross-check path). Treat 0-frame measurement basis explicitly per Adversarial Attack 25. |
| ADR #14 LUFS/mono spec drift in final render | Low | High | `verify:trailer-final` machine gate (Unit 6.0) asserts LUFS ±0.5 + channels=1 via spawnSync-captured stderr (Adversarial Attack 2 fix). |
| Encoding produces file too large for X | Low | Low | Unit 6.1 Step 3 two-sample pre-test projection (cascade + dossier-hold); conditional `--max-rate 8M --buffer-size 16M` cap. |
| Encoding profile incompatible with X mobile player (Safari iOS / Android Chrome) | Low (H.264 High + AAC-LC 128k mono is universal) | Medium | Unit 6.2 Step 4 + Unit 6.1 Step 0 PROMOTE-or-RERENDER decision tests Phase 4 candidate on mobile BEFORE committing to gold render — catches incompatibility cheaper than post-render rerun. If Safari iOS shows silent video at execution, escalate to Briggsy; no pre-planned mitigation pretends to exist (Adversarial Attack 16). |
| Render-time wall-clock exceeds 30 min on Windows `--x264-preset slow` | Medium | Medium | Pre-test projection at Unit 6.1 Step 3-4 calibration; `render:iterate` software-veryfast path (~3-6 min on Windows) for iteration loops; never promoted to final per CRF mismatch. (Adversarial Attack 29: ~15-45 min range honestly bracketed, not single point.) |
| Thumbnail frame doesn't stop scroll | Medium | Low (feed-preview only, recoverable post-launch) | Step 3 feed-stop selection extracts 4 candidates (1950, 1860, 1425, 2790); Briggsy picks at 96px scale; defaults to mid-process moments, not logo-on-desk (Adversarial Attack 14). |
| Mobile crop audit reveals hero side-banded at 1.91:1 (actual X mobile crop) | Low | High | Phase 4 scene re-composition; targeted fix. (1:1 ACCEPTABLE-FAIL when 1.91:1 PASSes per CALL-6.) |
| 9:16 vertical audit fails on verified-surface scenes | Conditional on Step 6 verification | Low-Medium | Cutdown-frame-list.md (Unit 6.8) feeds Phase 7 decision (re-compose vs skip vertical surface). |
| 9:16 surface unverified at Unit 6.0 Step 6 | Medium (X 2026 Immersive Media Viewer is unverified at plan time per CALL-1) | Low (9:16 audit infrastructure skipped — no harm if surface doesn't exist) | Verify against X primary source; if unverified, document skip and inform Phase 7. |
| UMB v3 sample extraction fails (cross-project path) | Low | Low | `path.resolve` from `__dirname` with `../../../../` (Feasibility F20 corrected); existsSync + size sanity guard. |
| Briggsy sign-off lost, ambiguous, or wrong git author | Low | Medium | `.signoff` sentinels (ADR #22) git-author-checked; `pnpm verify:briggsy-sentinels` enforces; documented as labeling-convention-not-cryptographic-proof per Security F1. |
| Phase 4 cross-phase amendments unapplied at Phase 6 entry | Low (applied in this doc-review pass) | Medium | Unit 6.0 Step 7 grep verification of `force_original_aspect_ratio=increase`; `verify-briggsy-sentinels` SCENES list verified covers 6.0a/6.4/6.7. |
| Multi-phase failure mode (decode/sync/composition issue spans phases) | Medium | Medium | If sub-verdict failure cannot be cleanly attributed to ONE upstream phase per the routing table, escalate to Briggsy with diagnosis package (all candidate phases + evidence); Briggsy decides which phase reopens. (Adversarial Attack 18.) |
| PHASE-6-EXIT.md staleness if Phase 7 doesn't start within 14 days | Medium | Medium | EXIT.md valid ≤14 days post-6.7 sign-off; longer gaps require rerun of Unit 6.2 + Unit 6.6 against current X spec before Phase 7 starts. (Adversarial Attack 23.) |

### Closed risks (resolved by deepening or doc-review)

These risks are recorded for historical context; no active monitoring required.

| Risk | Resolution |
|------|------------|
| `--preset` vs `--x264-preset` regression (silent fallback to medium) | RESOLVED — deepening locked `--x264-preset slow` per ADR #19; Unit 6.0 verify-script + Phase 0 ADR sync. |
| silencedetect-on-final-mix returns empty under continuous music bed | RESOLVED — deepening replaced with Unit 6.5 manifest-driven approach. |
| `verify:trailer-final` LUFS check structurally broken (stdout vs stderr) | RESOLVED — doc-review absorb of Adversarial Attack 2 + Security F2; switched to `spawnSync` with stderr capture in Unit 6.0 Step 1. |
| FFmpeg `-pattern_type glob` not available on Windows | RESOLVED — doc-review absorb of Feasibility F1 + Adversarial Attack 17 + Design F4; `generateContactSheet` rewritten to use explicit `-i` per file. |
| `--codec-options "maxrate=8M:bufsize=16M"` is fictional Remotion CLI | RESOLVED — doc-review absorb of Feasibility F3; real flags `--max-rate` + `--buffer-size` documented + Settings table corrected. |
| `--frame 1140-1860` is wrong (Remotion uses `--frames` plural for ranges) | RESOLVED — doc-review absorb of Feasibility F2; Unit 6.1 Step 3 corrected. |
| `audit-av-sync.ts` accessed `cue.src` / `cue.id` (not on AudioAsset) | RESOLVED — doc-review absorb of Feasibility F4; switched to `cue.staticPath` + `cue.filename`. |
| `--hardware-acceleration if-possible` is macOS-only; Briggsy on Windows | RESOLVED — doc-review absorb of Feasibility F5; `render:iterate` rewritten as software libx264 veryfast for Windows. |
| Stat hallucination "7 active + 1 NPC" operatives in axis 1 | RESOLVED — doc-review absorb of Adversarial Attack 1 (Phase 7 ADR #26 stat-verification gate principle applied earlier); operative list auto-derived from `card-defs.ts`. |
| Atomic-swap was bare `renameSync` (not atomic on Windows) | RESOLVED — doc-review absorb of Feasibility F7 + Adversarial Attack 13; `atomicSwap` helper ported from Phase 5 with EBUSY/EXDEV/EEXIST handling. |
| 9:16 audit work on unverified "X 2026 Immersive Media Viewer" surface | RESOLVED — doc-review absorb of CALL-1; gated on Unit 6.0 Step 6 primary-source verification. |
| Decode-test as Phase 6 GO/NOGO gate vs roadmap §10 tiebreaker contradiction | RESOLVED — doc-review absorb of CALL-3; decode test demoted to diagnostic; Briggsy watch is authority. |
| `verify-briggsy-sentinels` SCENES const not extended for Phase 6 sentinels | RESOLVED — doc-review absorb of Feasibility F27 + Adversarial Attack 28; Phase 4 cross-phase amendment #5 applied. |
| Decode-audio + trailer.mp4 in public repo | RESOLVED — doc-review absorb of Security F4 + F5; .gitignore amendments applied. |
| Q1 prompt time-cap mismatch with 90s window | RESOLVED — doc-review absorb of Adversarial Attack 4; prompt rewritten. |
| Within-subjects order effects in UMB control panel | ~~RESOLVED — doc-review absorb of Adversarial Attack 6; between-subjects N=3+3 design.~~ — REPEALED per ADR #21r (2026-05-22): no panel exists; risk is moot. |
| Briggsy-watch authority asymmetric/undocumented | RESOLVED — doc-review absorb of Adversarial Attacks 20+21 + Product-lens F7; asymmetric-authority contract documented in Phase 6 exits-when criteria. |
| Cutdown ADR #25 framework leaking from Phase 7 into Phase 6 Unit 6.8 | RESOLVED — doc-review absorb of Scope F3 + CALL-7; Phase 6 ships timing-window metadata, Phase 7 applies ADR #25. |
| Operational §2 rubric measures token-discipline not Archer-look | RESOLVED — doc-review absorb of CALL-4 + Adversarial Attacks 9/10/11; rubric split into Layer A Production Discipline + Layer B Archer-Fidelity (reference-frame anchored). |

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
- **Decode test panel size** (ADR #21 → **ADR #21r supersedes 2026-05-22**):
  N=1 Briggsy cold-watch with 24h cool-off + Q1/Q2 + keyword precision.
  Original ADR #21 N=6 panel + UMB control + priors elicitation was
  structurally unavailable (team is just Briggsy + Claude(s) forever);
  see Critical Constraints § ADR #21r.
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
- ~~**Tester recording mechanism** (feasibility #11 + doc-review Feasibility F6 fix)~~ —
  REPEALED per ADR #21r (2026-05-22): no testers, no recording mechanism. Briggsy
  types his own Q1/Q2 responses verbatim into `decode-test.md`.
- **Cross-browser playback target list** (per Scope F8 — Windows Media Player dropped
  as redundant with Films & TV; both use Microsoft Media Foundation H.264 path): Films
  & TV + VLC + Chrome + Edge desktop + iOS Safari real device + Android Chrome real
  device + X staging upload = 7 surfaces (QuickTime deprecated on Windows since
  2016 — removed).
- **Eye-in-loop vs script-audit assignment**: documented in Critical
  Constraints section — Briggsy direct-watches Units 6.4 R3 + 6.5
  music envelope + 6.7 end-to-end; Claude script-audits Units 6.0 /
  6.1 / 6.5 manifest drift / 6.6 mobile-crop tables.

### Deferred to Implementation

- ~~**Specific decode-test tester recruitment**: Briggsy's Discord
  network. Unit 6.0 recruits (NOT deferred to Unit 6.7).~~ — REPEALED
  per ADR #21r (2026-05-22): no tester recruitment. Unit 6.0 closes
  out only the cool-off-plan sentinel.
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
- ~~Decode test recruitment: Briggsy's Discord network (Harry + others
  per `user_harry.md`). Recruit during Phase 5 execution.~~ — REPEALED
  per ADR #21r (2026-05-22): no recruitment. Harry is AI, not a
  human ear/eye; team is just Briggsy + Claude(s) forever.
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

## Cross-Phase Amendments Surfaced by Phase 6 Deepening + Doc-Review

These are amendments to OTHER phase documents that Phase 6 deepening + doc-review
surfaced. **The doc-review pass APPLIES the amendments in this same commit** (per
Scope-guardian F14: a known contradiction in another phase document is not a future
note, it is a prerequisite to Phase 6's coherence). Status per item:

1. **Phase 0 Unit 0.1 ADR (`render:final` script)**: Update CRF 16 → CRF 18 to align
   with ADR #19 canonical lock. — **APPLIED in this doc-review pass.** Phase 0
   amended at the `render:final` script row.
2. **Phase 0 Unit 0.3 decode-gate**: Clarify that N=2 protocol applies ONLY to the
   5-second cold-open binary-hook spike, NOT to Phase 6 full-trailer comprehension
   decode. (Pre-ADR-#21r wording referenced "between-subjects N=3+3 per CALL-3";
   ADR #21r supersession 2026-05-22 collapses that to **N=1 Briggsy cold-watch** —
   no panel, just diagnostic-not-gate framing preserved.) — **APPLIED in this
   doc-review pass; ADR #21r amendment 2026-05-22 additionally collapses panel to
   N=1.** Phase 0 amended at Unit 0.3 decode-gate row.
3. **Phase 4 placeholder ffmpeg filter** (carried forward from Phase 5 deepening
   surfaced amendment): `force_original_aspect_ratio=cover` →
   `force_original_aspect_ratio=increase`. — **APPLIED in this doc-review pass.**
   Phase 4 amended at the gameplay-placeholder generation script.
4. **Roadmap §3 row 6**: Confirm CRF 18 (was already 18; first-draft Phase 6 said
   CRF 17; reconciled to 18 per ADR #19). — **VERIFIED in this doc-review pass.**
   Roadmap §3 row 6 already correct.
5. **Phase 4 `scripts/verify-briggsy-sentinels.ts` SCENES const extension** (NEW per
   Feasibility F27 + Adversarial Attack 28): extend SCENES list to include
   `briggsy-review-6.0a.signoff` / `briggsy-review-6.4.signoff` /
   `briggsy-review-6.7.signoff` paths under `videos/trailer/sample-eval/final-render-
   qa/`. Without this, `pnpm verify:briggsy-sentinels` exits clean because it only
   checks 4.2-4.7 + 5.4/5.6. ~~Also extend to read `decode-test-roster.md` and assert
   ≥6 rows with complete columns.~~ (REPEALED per ADR #21r 2026-05-22: roster file
   no longer produced; assertion dropped.) — **APPLIED in this doc-review pass.**
   Phase 4 amended at the `verify-briggsy-sentinels.ts` SCENES const definition.
6. **.gitignore additions** (per Security F4 + F5): add `videos/trailer/sample-eval/
   final-render-qa/decode-audio/`, `videos/trailer/sample-eval/final-render-qa/archer-
   reference/`, `videos/trailer/out/*.mp4`, and `videos/trailer/out/*.mp4.{new,prev,iterate}`
   to project `.gitignore`. — **APPLIED in this doc-review pass.**

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
- `user_harry.md` (updated 2026-05-22) — Harry is AI; cannot serve as
  decode-test recruitment channel or any human-eye role. ADR #21 →
  ADR #21r supersession in Critical Constraints reflects this.
- `feedback-listener-panels-default-to-n1.md` — team is just Briggsy +
  Claude(s) forever; multi-person human panels structurally
  unavailable. Drives ADR #21 → ADR #21r supersession.
- `feedback-phase-plan-drafting-workflow.md` — write all phase files
  in one workflow; deepen sequentially after
- `feedback-wait-for-all-agents.md` — synthesis discipline; this
  Phase 6 deepening waited for all 8 CE personas
