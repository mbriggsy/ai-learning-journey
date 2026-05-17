---
title: "BURNED Origin Trailer — Roadmap"
type: feat
parent: docs/ideation/2026-05-15-origin-trailer-brainstorm.md
created: 2026-05-16
deepened: pending
reviewed: pending
status: active
phases:
  - phase-0-gate-resolution.md             # drafted 2026-05-16
  - phase-1-beat-sheet-lock.md             # drafted 2026-05-16
  - phase-2-voice-pipeline.md              # drafted 2026-05-16
  - phase-3-visual-asset-prep.md           # drafted 2026-05-16
  - phase-4-remotion-composite.md          # drafted 2026-05-16
  - phase-5-gameplay-capture.md            # drafted 2026-05-16
  - phase-6-final-render-qa.md             # drafted 2026-05-16
  - phase-7-distribution.md                # drafted 2026-05-16
---

# BURNED Origin Trailer — Roadmap

> *Parent document for the BURNED Origin Trailer build. Inherits every
> constraint from the origin-trailer brainstorm at
> `docs/ideation/2026-05-15-origin-trailer-brainstorm.md`. When a phase
> file disagrees with the roadmap, the roadmap wins unless the roadmap is
> demonstrably wrong — in which case we update the roadmap.*

> **Status: All 8 phase files drafted (2026-05-16). Deepening
> pending — runs sequentially across all 8 phase files next.** Per
> `feedback-phase-plan-drafting-workflow.md`, the complete set of phase
> files is written in one workflow; deepening runs sequentially across
> all 8 after all are drafted.

**Mission.** Ship a ~95-second 16:9 origin trailer for BURNED that lands
the Archer-grade quality bar on every frame, telegraphs the
agentic-SDLC origin to a no-context engineering-peer viewer within the
first five seconds, and stands as the second proof point that the
autonomous-SDLC method works repeatably (UMB v3 was the first).

---

## §1 — Why This Exists

UMB v3 — `projects/undercover-mob-boss/videos/trailer/` — is the working
precedent. 9 scenes, 4440 frames at 30fps (= **148 seconds**; the
brainstorm cites ~124s — see §6 Brainstorm Corrections). Solo Charon
noir narration over a chronological SDLC trace. Shipped.

BURNED has a richer toolkit: seven named operatives in the roster
(Dash, Vera, Sable, Janet, Neal, Otto, Agent X) — **six in the deck,
one (Otto) in the basement: narrative-only-not-shipped per Phase 1
line 49 + Phase 7 stat-verification gate (ADR #26, locked 2026-05-17
during Phase 7 deepening). Captioned distribution copy must match:
"six operatives in the deck, one in the basement."** + Dolores Grieves NPC,
a locked Archer-the-show visual vocabulary, in-world Pendleton Agency
set-dressing (briefing-room dossiers, comms ticker, venetian blinds),
17 unique Imagen-generated card artworks, a 10-act how-to-play dossier
app (`src/client/howtoplay/`), and the locked product specification at
`docs/PRODUCT-SPECIFICATION.md`.

**The bar-raise is the repeat itself, not new engineering substance.**
UMB v3 told the autonomous-SDLC story for the first time. BURNED's
trailer is the second proof point: *"UMB wasn't a lucky shot — the
method works twice, at Archer-grade, with a richer toolkit landing as
instruments not decoration."* Production polish (per-frame Archer
faithfulness, Pendleton briefing format, multi-voice cast, dossier-grade
artifact storytelling) is how we make the repeat *land*; the repeat
itself is what the trailer is selling.

---

## §2 — Quality Bar

**Mission line (inherited from `docs/PRODUCT-SPECIFICATION.md` §2).**
*"BURNED is indistinguishable from a commercial party game released by
a real studio."* Trailer translation: *indistinguishable from a real
studio's promotional reel for a commercial Archer-themed party game.*

**Per-frame acceptance test.** *"Could this look like a frame from an
Archer episode?"* Binary yes/no. Every shot, every overlay, every
transition state, every cascade card, every cold-open title flash.

**Trailer-specific layers (additive to spec §2):**

- **Muted-autoplay readability.** X autoplay is muted by default. Every
  text overlay must read silently. Captions / burnt-in chrome are not
  optional — they carry narrative when audio is gone.
- **First-three-seconds discipline.** The first three seconds determine
  whether a feed viewer scroll-stops. No logo opening. No face opening.
  Bold visual + text claim, instantly. R14's compressed-Archer
  title-sequence shape satisfies this if executed.
- **Chyron-is-the-joke / visual-is-the-setup.** Comedy stat overlays land
  one beat at a time. Never visual-and-overlay punchline simultaneously.
- **Mobile-crop safety.** X serves a **1.91:1 in-feed preview crop on
  mobile**. Critical text must live within a central 1:1 safe square
  inside the 16:9 frame.
- **The water-beads test (from the elite-engineer manifesto).** The
  magic of agentic autonomous software development should disappear and
  the joy of the product itself should take over. If a reviewer reacts
  "wow Claude built this," the bar was missed. The product has to stand
  on its own. The craft has to be invisible.

---

## §3 — Phase Breakdown

| # | Phase | Produces | Gating dependency |
|---|-------|----------|-------------------|
| 0 | **Gate Resolution** | Trailer project scaffold + 5 gate evaluations under `videos/trailer/sample-eval/`. Voice cast + tone + composite-spike-viable foundation. | None — Phase 0 is the entry point. |
| 1 | **Beat Sheet Lock** | Scene-by-scene 90–100s outline with locked voice cast, locked tone, locked transition vocabulary. `videos/trailer/BEAT-SHEET.md`. | Phase 0 — all five gates resolved (cleared / restructured / cut). |
| 2 | **Voice Pipeline** | Dash sustained narration WAVs + R5 scream + R14 cold-open line, generated via `videos/trailer/scripts/generate-dash-tts.ts`. | Phase 1 — beat sheet defines the line set. |
| 3 | **Visual Asset Prep** | BURNED HTP fullpage capture, goofy-stats list with cold-read gate, card-art curation, briefing-room composition, R15 text-signal layer assets. | Phase 1 — beat sheet defines the asset inventory. (Parallel with Phase 2.) |
| 4 | **Remotion Composite Build** | All scenes assembled in `videos/trailer/src/scenes/*.tsx` at studio-preview quality. Per-scene Archer test pass. | Phases 2 + 3 — voice + visual assets ready. |
| 5 | **Gameplay Capture Harness + Capture** | Real BURNED multiplayer gameplay clip (phone-controller + TV-shared-screen) at `public/trailer/gameplay.mp4` per ADR #15 (locked 2026-05-17 per Phase 5 deepening; supersedes pre-deepening `videos/trailer/assets/gameplay.mp4`). | Deploy migration partykit → Cloudflare Workers complete (per TODO.md §1 note). |
| 6 | **Final Render + QA** | `out/trailer.mp4` at H264/CRF 18, bar-raise criteria evaluation against UMB v3 on the three locked axes. `qa-report.md`. | Phases 4 + 5 — all scenes integrated, gameplay closer in place. |
| 7 | **Distribution** | X-native cutdown + portfolio embed + distribution plan. | Phase 6 — final QA pass cleared. |

All 8 phase plans drafted (2026-05-16). Deepening runs sequentially
across all 8 phase files next, per
`feedback-phase-plan-drafting-workflow.md`. Briggsy reviews after
deepening completes.

---

## §4 — Architectural Decisions

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | **Remotion 4.0.438 pin** | Inherited from UMB v3. Within 4.x stability policy (additive only). Working render pipeline. |
| 2 | **Isolated package** at `projects/burned/videos/trailer/` (not added to `pnpm-workspace.yaml` packages: array); BURNED HTP component vocabulary VENDORED at Phase 3 entry (revised 2026-05-17 per Phase 3 deepening) | Mirrors UMB pattern — stub workspace, own `node_modules` + `pnpm-lock.yaml`. Avoids leaking Remotion deps into BURNED's phone bundle. **Path A (cross-package React import) formally REJECTED** for 3 technical reasons (CSS module bundler diff / `window.matchMedia` absence / GSAP ScrollTrigger needs real scroll, Remotion drives time) + 1 empirical reason (UMB's `videos/trailer/src/TrailerV3.tsx` has zero cross-package imports). **Path B HYBRID locked**: set-dressing PNGs via `staticFile` through Phase 0 ADR #8; in-frame React chrome (Stamp + Crest + RedactBar + ClassificationBanner + DossierPage + `.module.css` peers — 10 files total) COPIED into `videos/trailer/src/components/burned-vocabulary/` at Phase 3 Unit 3.0 entry. Drift catcher: `pnpm verify:vocab-sync` (`diff -r` check) runs as CI gate. |
| 3 | **Self-hosted woff2 via `@remotion/fonts`** | UMB precedent. `loadFont()` from `@remotion/fonts` returns a promise Remotion auto-tracks for `delayRender` — no manual machinery, no studio-vs-export font fallback trap. **NOT `@remotion/google-fonts`.** |
| 4 | **`@remotion/transitions` — install ON-DEMAND, NOT used at composition level** (revised 2026-05-17 per Phase 1 deepening) | Original brainstorm intent: required for R3 cross-dissolve via `<TransitionSeries>`. Phase 1 deepening replaced the cross-dissolve with a hard cut after the payoff visual hold (more Archer per design-lens; resolves 3 internal timing contradictions; avoids TransitionSeries overlap-math conflict with `timing.ts` declared sums). BURNED uses **bare `<Series>` + scene-internal overlay components** (stamp slap, dossier-page wipe, iris wipe) — matches UMB v3 precedent exactly. `@remotion/transitions` may still be installed for the `iris()` / `addSound()` primitives as overlay-component helpers — Phase 4 micro-spike decides necessity. |
| 5 | **ADD `@remotion/media`** (UMB uses legacy `Html5Audio`) | Newer `<Audio>` component (4.0.x) — better frame-accuracy, Mediabunny-backed. Required for R3's audio crossfade and R9's music bed. |
| 6 | **`@remotion/lottie` — install ON-DEMAND** | Reserved for R14 chevron / target-reticle motion graphics if static SVG won't deliver. **NOT pre-installed in Unit 0.1.** Phase 0 Unit 0.5 spike validates all three Archer-grammar transition candidates (stamp-slap primary / iris wipe fallback / kinetic typography for stat overlays) in pure Remotion FIRST. Install only if a candidate's pure-Remotion render fails (YAGNI — the spike decides necessity). |
| 7 | **INSTALL `@remotion/skills`** | Remotion Agent Skills for Claude Code (Jan 2026 release, ~126k installs). 28 rule files auto-load when Claude touches Remotion code. Fundamentally improves the agentic iteration story. |
| 8 | **`Config.setPublicDir('../../public')`** | UMB pattern. Trailer reads BURNED's existing public/ — card art, fonts, audio — without duplication. |
| 9 | **VOICE_DIRECTION anti-pattern guard** | Inline comment at TTS API call site mirroring UMB's `generate-narrator.ts:195-198`. Gemini TTS reads ALL text verbatim — style instructions become spoken audio. Codify on first write of `generate-dash-tts.ts`. |
| 10 | **TTS-budget envelope: $50** | Research-corrected from brainstorm's $10. Real engine-eval cost across ElevenLabs Creator ($22) + Gemini ($10) + OpenAI ($5) + WebMUSHRA hosting ($0–20). Hybrid path adds $200–500. |
| 11 | **No `<TransitionSeries>` at composition level — bare `<Series>` + scene-internal overlay components** (revised 2026-05-17 per Phase 1 deepening) | UMB v3 TrailerV3.tsx (verified lines 28-56) uses bare `<Series>` of `<Series.Sequence>` with ZERO scene-boundary transitions. FadeTransition exists in UMB only as scene-internal element fader (V3S08, etc.). BURNED inherits this composition shape exactly. Scene transitions (stamp slap, dossier-page wipe, iris wipe) are overlay components rendered inside scene tail/head frames, NOT TransitionSeries presentations. This avoids the `<TransitionSeries>` overlap-math (`total = sum - transitions`) that would contradict `timing.ts`'s declared TOTAL_FRAMES=2850. |
| 12 | **All phase files drafted in one workflow** | Per `feedback-phase-plan-drafting-workflow.md` (corrected 2026-05-16): write the complete set of phase files sequentially in one drafting workflow. Mid-drafting stops are for Claude's context-density management, never for Briggsy's review. Deepen all phases sequentially AFTER they're written, not per-phase during drafting. Briggsy reviews output, not intermediate planning artifacts. |
| 13 | **Sterling-CODED, not Sterling-cloned** (locked 2026-05-16) | BURNED's visuals scream Archer without being Archer (per `docs/PRODUCT-SPECIFICATION.md` §3.6 "verified influences" — Bass, Ditko, Mad Men, OSS 117 as influences, not literal reproductions; `project-burned-creative-direction` memory). **Voice follows the same principle:** Sterling-CODED cadence (deadpan mid-Atlantic clip, sardonic lift, deliberate pace, declarative falling intonation on punchlines) without being a Benjamin clone or impression. This is a design choice first; the legal floor (see §5.1) aligns with it. |
| 14 | **Audio loudness target: -16 LUFS** (locked 2026-05-17 per Phase 2 deepening) | Compromise between EBU R128 broadcast (-23 LUFS — too quiet for X muted-autoplay portfolio distribution; X's linear normalization gains UP but doesn't restore dynamic range) and platform-target (-14 LUFS — over-compressed, kills Sterling-CODED cadence + R3 payoff dynamic contrast). -16 LUFS (Apple Podcasts target) preserves dynamic range for cadence + payoff impact while landing audibly "present" in X feed. `loudnorm=I=-16:LRA=9:TP=-1.5` two-pass workflow per k.ylo.ph/loudnorm canonical guide (single-pass inaccurate for clips <30s — every Phase 2 cue is in the danger zone). Audio format also locked: 48kHz / 16-bit signed LE PCM / **MONO** (`-ac 1` on every FFmpeg invocation). |
| 15 | **Public-directory architecture: all trailer-only assets at `public/trailer/...` inside BURNED's `public/`** (locked 2026-05-17 per Phase 3 deepening) | Phase 0 ADR #8 set `Config.setPublicDir('../../public')` pointing at BURNED's `public/` directory. Remotion supports exactly ONE public directory at a time — files at `videos/trailer/public/...` are UNREACHABLE to `staticFile()` during render. Pre-deepening Phase 3 wrote new trailer assets to `videos/trailer/public/assets/{briefing-room,r15-chrome,title-sequence}/` which would 404 silently at Phase 4 render time. **Lock:** all NEW Phase 3 trailer-only assets (R15 chrome SVGs, NEW briefing-room SVGs, NEW title-sequence SVGs, music-bed MP3, HTP fullpage capture) land at `public/trailer/...` inside BURNED's existing `public/`. Single `setPublicDir` works for both: `staticFile('assets/cards/...')` reaches BURNED game assets via ADR #8; `staticFile('trailer/...')` reaches trailer-only assets via this ADR. `videos/trailer/public/` becomes RESERVED for sample-eval artifacts that Remotion render does NOT load (safe-square composite proofs, reference renders, audition clips). |
| 16 | **Composition-level audio placement** (locked 2026-05-17 per Phase 4 deepening) | Phase 4 deepening verified UMB v3 `TrailerV3.tsx:59-63` precedent: ALL VO `<Audio>` elements placed at composition level via single `{AUDIO_ASSETS.map(asset => <Sequence from={asset.startFrame - (asset.leadFramesHint ?? 0)} durationInFrames={asset.actualFrames}><Audio src={staticFile(asset.staticPath)} /></Sequence>)}` in `TrailerComposition.tsx`, NOT inside scene files. Pre-deepening Phase 4 mixed scene-internal `<Audio>` (S01/S02 had bare `<Audio>` calls without Sequence wrap or with nonexistent `startFrom` prop) with scene-internal `<Sequence>` wrap (S03/S04/S05/S06) — inconsistent across 6 scenes. Composition-level audio is single source of truth (`audio-manifest.ts`), single placement site, scene files become pure visual + frame-math-free, `leadFramesHint` consumption per Phase 2 contract #4 cleanly in one place, Phase 2 contract changes absorbed via re-import (no scene-file edits). Music bed (`<MusicBed />`) sits alongside at composition level; envelope interpolation continuous across the S04→S05 hard cut (no audio crossfade — per best-practices Finding 3, `interpolate()` prevents zipper noise at the cut frame). |
| 17 | **`<Audio>` import discipline — `@remotion/media` only, ESLint-enforced** (locked 2026-05-17 per Phase 4 deepening) | Core `'remotion'` package STILL exports `<Audio>` for back-compat in 4.0.x — it's the legacy `<Html5Audio>` wrapper. `import { Audio } from 'remotion'` compiles + renders, but produces inferior audio extraction (FFmpeg vs Mediabunny), different volume-callback frame timing, and different prop sets (`startFrom`/`endAt` vs `trimBefore`/`trimAfter`). Mixed backends in one composition cause sample-rate drift over 95s. Phase 4 deepening repo-research found 8 callsites importing `Audio` from `'remotion'` core in the pre-deepening plan (S01 + S02 + S03 + S04 + S05 + S06 + MusicBed + TrailerComposition). **Lock**: `import { Audio } from '@remotion/media'` for ALL `<Audio>` usage; `<Img>` + `<OffthreadVideo>` stay from `'remotion'` core. ESLint `no-restricted-imports` rule in `.eslintrc.cjs` blocks `Audio` from `'remotion'` at lint time. CI fails on regression. |
| 18 | **Font loading strategy — pending Unit 4.0 spike outcome** (placeholder locked 2026-05-17 per Phase 4 deepening; outcome locked at Phase 4 execution) | Phase 3 deepening framework-docs research found Remotion 4.0.x docs do NOT document variable-axis weight range syntax (`weight: '200 700'`) with `@remotion/fonts.loadFont()`. BURNED `public/fonts/` ships exactly 3 variable woff2 files (ClashDisplay/GeneralSans/JetBrainsMono-Variable.woff2) per Phase 1 deepening typography lock. Phase 4 deepening pulls the deferred spike into a NEW Unit 4.0 (60-min time-box) BEFORE composition wiring. **PASS branch**: ship 3 variable woff2 files via `Promise.all([loadFont({weight: '200 700'}) × 3])`. **FAIL branch**: escalate to Phase 3 for per-weight `pyftsubset --variation-instance="wght=N"` subsetting (~5 weights × 3 families = 15 static woff2); `useFonts.ts` loads them via UMB v3's per-weight Promise.all precedent. ADR #18 outcome documented in `videos/trailer/sample-eval/composite-build/PHASE-4-FONT-SPIKE.md` at execution; this row updates to record verdict. |
| 19 | **Production encoding canonical lock — CRF 18 / `--x264-preset slow` / no `--tune`** (locked 2026-05-17 per Phase 6 deepening) | Phase 6 deepening reconciled a three-way contradiction: Phase 0 ADR drafted CRF 16 for `render:final`; roadmap §3 row 6 said CRF 18; Phase 6 first-draft said CRF 17. **Lock at CRF 18** per industry visually-lossless threshold (FFmpeg H.264 wiki + slhck CRF guide). CRF 17 vs 18 is sub-perceptual on X's downstream re-encode; CRF 16 over-encodes for distribution. **Critical CLI flag fix**: `--preset slow` is **NOT a valid Remotion 4.0.438 CLI flag** — the correct flag is `--x264-preset slow`. The first-draft `--preset` would silently no-op and fall back to `medium`. `--tune` omitted: mixed content (Imagen illustration + Playwright capture + Remotion chrome) doesn't fit `film` or `animation`; default psy-RD calibration is correct for heterogeneous sources. Full lock: libx264 High profile / CRF 18 / `--x264-preset slow` / no `--tune` / yuv420p / 1920×1080 / 30fps / AAC 128k / **mono** (ADR #14) / +faststart / no maxrate cap (conditional addition only if Unit 6.1 Step 3 pre-test projects >280MB). Iteration loops use `pnpm render:iterate` (hardware-accelerated, ~3-5min); gold master uses `pnpm render` (software libx264 slow, ~15-25min on Apple Silicon / 15-30min Windows). Both gated by `pnpm verify:trailer-final` (Unit 6.0) before atomic-swap `.new` → mv. Phase 0 ADR `render:final` updated 2026-05-17 to CRF 18 + `--x264-preset slow` to align. |
| 20 | **AV-sync tolerance asymmetric — audio MUST NOT lead visual on R3** (locked 2026-05-17 per Phase 6 deepening) | Human AV-sync detection is fundamentally asymmetric: audio LEADING video detectable at ~+20ms (ITU-R BT.1359-1) / +15ms per-stage (EBU R37); audio LAGGING video forgiving up to -125ms (ITU detectability) / -50ms (EBU comfortable). Phase 6 first-draft's ±N-frame symmetric framing mis-modeled the perceptual floor. **Lock**: Standard cues (S01-S03, S06 Dash VO) drift acceptable in range `[-1 frame, +3 frames]` (-33ms to +100ms — audio may lag video up to 3 frames; audio may lead video by no more than 1 frame). **R3 stacked-payoff (cue 1950)** drift acceptable in range `[-1 frame, 0 frames]` (-33ms to 0ms — audio may lag video by 1 frame; audio MUST NOT lead video at all). Audio leading visual by ANY amount on R3 is HARD FAIL even within +1 frame — the brain detects audio-lead at <1 frame for impact gestures (no lip-reading bias to mask). "Sub-frame drift" phrasing eliminated; all tolerances are frame-counted ranges. Phase 6 Unit 6.5 verifies via manifest-driven approach (silencedetect-on-final-mix REJECTED because the music bed plays continuously above -40dB — see ADR #16 — so the filter returns zero events). |
| 21 | **Decode-test panel N=6 + UMB control + Q1/Q2 + keyword precision** (locked 2026-05-17 per Phase 6 deepening) | Phase 6 first-draft inherited "≥1 of 2 testers" from Phase 0 Unit 0.3, where N=2 was acceptable for a **5-second cold-open binary-hook spike** (low cost, low statistical bar). Phase 6's full-trailer 95-second comprehension decode is the structural analog of R4's MUSHRA voice gate (ADR #13 locked 6-8 listeners). N=2 with no control is statistically toothless: a single Anthropic-follower default-priors tester confirms autonomy regardless of trailer quality. **Lock**: (a) Panel N=6 minimum (≥3 of 6 surface autonomy hook unprompted within post-stimulus 90-second reaction window). (b) UMB v3 CONTROL PANEL: same 6 testers watch UMB v3 trailer first; if ≥2 of 6 surface autonomy for UMB, panel is contaminated by priors and BURNED test invalid → re-recruit. (c) Priors elicitation pre-test: exclude testers whose unprompted answer to "what's your prior on how a Briggsy project is built?" already names AI/agent/Claude. (d) Q1/Q2 two-question protocol: Q1 free-recall feeds the threshold; Q2 prompted-recall feeds failure-route triage only (Q1-fail/Q2-pass = R15 chrome insufficient; Q1-fail/Q2-fail = R14 cold-open insufficient). (e) Keyword precision: surfacing BUILD PROCESS / AGENT AUTHORSHIP counts ("Claude wrote this", "agent built it", "autonomous development"); RENDER TECHNOLOGY does NOT count ("AI-rendered visuals", "Midjourney-generated"). Phase 0 Unit 0.3 protocol explicitly NOT extended to Phase 6 — different stimulus class, different N. |
| 22 | **Briggsy sign-off ceremony — `.signoff` sentinels with git-author check** (formalized 2026-05-17 per Phase 6 deepening; pattern established Phase 4) | Phase 5 introduced `.signoff` sentinel files (`briggsy-review-5.4.signoff` + `briggsy-review-5.6.signoff`) committed under Briggsy's git author identity (`briggsy007@gmail.com`); `pnpm verify:briggsy-sentinels` enforces author-check. Phase 6 deepening formalizes the pattern at roadmap level so all phases (5 onward) consistently use it. **Lock**: every Briggsy approval gate produces a `.signoff` sentinel file in the relevant `sample-eval/<phase>/` directory; file content includes verdict + date; file is committed under Briggsy's git author identity (NOT Claude's); `pnpm verify:briggsy-sentinels` runs in CI + at phase-entry gates to enforce. Phase 6 produces: `briggsy-review-6.0a.signoff` (recruitment prereq), `briggsy-review-6.4.signoff` (bar-raise acceptance), `briggsy-review-6.7.signoff` (final QA + hand-off). Phase 7 entry gate checks for `briggsy-review-6.7.signoff` before distribution. Markdown text fields like `## Briggsy sign-off: APPROVED` are auxiliary record — the sentinel file is the load-bearing audit artifact. |
| 23 | **Mobile-crop discipline + 9:16 vertical-feed audit** (locked 2026-05-17 per Phase 6 deepening) | Roadmap §5.3 locked 1:1 (1080×1080) safe-square within 1920×1080 for X's 1.91:1 in-feed mobile preview crop (more conservative than X's actual ~1920×1005 crop; if 1:1 is safe, 1.91:1 is definitely safe). Phase 6 deepening ADDS 9:16 vertical-feed audit per X's 2026 Immersive Media Viewer (top-level vertical tab; engineering-portfolio video that fails 9:16 loses a major distribution surface). **Lock**: Phase 6 Unit 6.6 produces TWO crop audits per sample frame — 1:1 (1080×1080 centered, `crop=1080:1080:420:0`) AND 9:16 (607×1080 centered at 1080-pixel height, `crop=607:1080:656:0` — `1080 × 9/16 = 607.5` → 607px). Visual composites PER FRAME, not just verdict tables (design-lens discipline): full-frame with safe-square outline overlaid + 1:1 crop + 9:16 crop. 1:1 hero outside safe-square → Phase 4 scene re-composition. 9:16 hero outside vertical-strip → feeds Phase 7 cutdown decision (re-compose for vertical safety, skip vertical-feed for that scene, or accept loss). 9:16 cutdown feasibility verdict in cutdown-frame-list.md (Phase 6 Unit 6.8). Also: mobile-crop math fix — X's 1.91:1 crop at 1920 wide is 1920×1005 (NOT 1920×1006 as first-draft asserted; 1920 ÷ 1.91 = 1005.24). |
| 24 | **Cutdown closure: hard cut + X autoplay loop, no fade-out** (locked 2026-05-17 per Phase 7 deepening) | Phase 7 cutdown render MUST NOT apply `-vf fade=t=out` or `-af afade=t=out` filters to trailing frames. Inherits Phase 1 Unit 1.4 transition vocabulary lock (hard cut replaced cross-dissolve; "more Archer; dissolves 3 internal contradictions"). Multi-agent convergence: emil (Archer vocabulary inheritance), adversarial (X re-encode banding risk on gradient fades to black over high-detail gameplay), feasibility (low-luma quantization on gradient fade tails under H.264 quantization). Closure mechanic is the X autoplay loop seam (cut from last gameplay/closer frame back to cutdown frame 0 — composed-state per ADR #25). Edit pattern: omit fade filters from `scripts/render-cutdown.ts` FFmpeg invocation. Cross-cuts Phase 1 Unit 1.4 + Phase 7 Unit 7.1. |
| 25 | **Cutdown frame-0 anchor: composed-not-mid-motion + IS the X autoplay-entry image** (locked 2026-05-17 per Phase 7 deepening) | Cutdown START_FRAME must land on a settled compositional state — NOT inside an active `interpolate()` window in `videos/trailer/src/lib/transitions.ts`. Cutdown frame 0 is the X autoplay-entry image for 80%+ of feed impressions; the "static thumbnail" (`out/thumbnail.png` per Phase 6 Unit 6.2 frame 2790 default) is only served in paused state. Extends Phase 6 Unit 6.2 Step 3 selection rule (composed-not-mid-motion) to cutdowns. Per Phase 1 disambig (line 1326 amendment 2026-05-17): brightening ease completes AT frame 1860 (held bright 1860-1950); Option A/C START_FRAME 1880 lands 20 frames past ease completion (+0.5s buffer). Phase 6 Unit 6.8 cutdown-frame-list.md must annotate each Option's segment START_FRAMEs with composed-not-mid-motion verdicts (cross-phase amendment). Multi-agent: emil (frame-by-frame transition timing analysis) + design-lens (information-architecture of in-feed thumbnail interaction states). |
| 26 | **Distribution stat-verification gate** (locked 2026-05-17 per Phase 7 deepening) | Any numeric or roster claim in trailer captions, README copy, pinned-tweet copy, or thread copy MUST derive from a verifier script (`scripts/verify-caption-stats.ts`, Phase 7 Unit 7.0) that parses the codebase at write time. Hand-typed numbers banned. Verifier output `videos/trailer/distribution/verified-stats.json` is the canonical source; captions reference the JSON keys. Hard-asserts include `operatives_in_deck === 6` (matches Phase 1 line 49 trailer narration "six in the deck, one in the basement"). Fixes pre-deepening hallucinations: Phase 7 first-draft "7 operatives" (codebase `src/shared/card-defs.ts` has 5 operatives + Agent X wild = 6 entries); "Approximately 14,000 pages" follow-up tweet line (Phase 1 line 1584 explicitly flags as unverified — narration uses it as fictional in-character cadence; using it as a tweet stat passes it off as real → CUT). Multi-agent: adversarial (grep + count evidence) + repo-research (card-defs.ts line citations) + brief (institutional gap — no docs/insights/ entry on stat discipline at distribution boundary). Inherits `feedback-stats-single-source.md`. **Pattern propagates forward to next agentic-SDLC project distribution** (Phase 7 generates the pattern; no UMB v3 inheritance per brief's negative finding). |
| 27 | **Distribution post sequence: 3-beat burst within first 2-3 hours via self-reply thread** (locked 2026-05-17 per Phase 7 deepening) | Phase 7 distribution sequence is: Post 1 at T+0 (flagship 95s with attached MP4), Post 2 self-reply at T+90min (cutdown 12-15s with attached MP4), Post 2b self-reply at T+2-3h (genuine tooling-stack thread, NO R15 chrome verbal echo per chyron-is-the-joke rule). Pinned tweet at D+7 is separate from the burst. **NOT 24h-spaced quote-tweets** (the pre-deepening shape) — quote-tweets restart distribution; self-replies inherit thread visibility within the 24h algorithmic momentum window. 2026 engineering-Twitter convergence pattern across Replit Agent 3/4, Cursor 0.50/3, Anthropic Code-with-Claude launches; Buffer/sproutsocial 2026 algo data corroborates the 50-70%-of-impressions-in-first-30-60-min window. Multi-agent: best-practices + design-lens (algo self-quote penalty concern). Cross-references: link-demotion regime (no links in Post 1 or Post 2 — Variation A locked at zero links; any link content goes in Post 2b or later); chyron-is-the-joke rule (Post 2b is genuine technical content — Cloudflare Workers / React 19 / Framer Motion / Remotion / Imagen 4 / Claude Code — NOT an R15 verbal echo). |
| 28 | **Bitrate target 8-12 Mbps VBR for 1080p X uploads** (locked 2026-05-17 per Phase 7 deepening; supersedes roadmap §5.4 "5-8 Mbps") | X re-encodes uploads regardless; the bitrate target is survival-of-re-encode, not artificial cap-under-shoot. 2026 aggregator convergence (wavespeed.ai, sproutsocial, postful.ai, contentgrip, mashable, kapwing) targets 8-12 Mbps for 1080p. Phase 6 production encoding (CRF 18 / `--x264-preset slow` per ADR #19) naturally lands 12-18 Mbps VBR average for action content — within the 25 Mbps platform ceiling. Roadmap §5.4 corrected inline 2026-05-17. Phase 6 Unit 6.0 verify-trailer-final and Phase 7 Unit 7.6 verify-cutdown-ready both validate bitrate within the corrected range. Multi-agent: best-practices (primary, 6 aggregator sources cross-validated); framework-docs (Cloudflare Pages 25 MiB cap reinforces "fit native upload — don't fallback-host"). |
| 29 | **GitHub README inline-video embed mechanism: drag-drop user-attachments URL only** (locked 2026-05-17 per Phase 7 deepening) | GitHub README sanitizer STRIPS HTML `<video>` and `<iframe>` tags. Markdown image-link to MP4 URL (`[![thumb](png)](release.mp4)`) does NOT inline-play; renders as clickable thumbnail download. The ONLY mechanism producing inline `<video>` in `README.md` is the drag-drop user-attachments URL pattern: edit README in github.com web editor, drag MP4 into buffer, GitHub auto-uploads and injects `https://github.com/user-attachments/assets/<UUID>` bare URL which renders as native `<video>` player. Attachment cap: 10 MB free / 100 MB paid; BURNED flagship (~200 MB) does NOT fit, cutdown (~25-40 MB) does → README embed defaults to inline-cutdown + linked-flagship via Release CTAs. Multi-agent: framework-docs (Context7 GitHub docs cite + community discussion #173635) + feasibility (corroboration) + best-practices. Phase 7 Unit 7.2 procedure consumed. Also kills the pre-deepening "Cloudflare Pages Option II" fallback (25 MiB asset cap — structurally broken for 95s trailer at production encoding). |

---

## §5 — Critical Constraints (Research-Surfaced)

These were not visible in the brainstorm but matter at planning time.

### §5.1 — Sterling-CODED, not Sterling-cloned (design principle + legal floor align)

**The design principle (locked 2026-05-16, ADR #13).** BURNED's visuals
scream Archer without being Archer — Saul Bass, Steve Ditko, Mad Men,
1960 Bond, OSS 117, Pink Panther named as influences in spec §3.6, none
literally reproduced. **The voice follows the same rule.** We want
Sterling-CODED cadence (deadpan mid-Atlantic clip, sardonic lift on
terminal syllables, deliberate pace, declarative falling intonation on
punchlines, the barely-audible exhale that reads as "I am exhausted by
you specifically") without being a Benjamin clone or recognizable
impression. **Mimicry of style; never replication of identity.**

This is the design choice. The legal floor aligns with it as supporting
context:

**ElevenLabs Prohibited Use Policy (updated Sept 3 2025)** forbids
unauthorized impersonation including voice replication of any
identifiable person without consent. Audio is traceable to the user
account.

**Statutory frameworks reinforce this:**

- **Tennessee ELVIS Act 2024** — first state law specifically classifying
  unconsented voice clones as actionable.
- **Proposed federal NO FAKES Act** — Senate, 2026; would federalize
  the right-of-publicity claim for voice.
- **EU AI Act (Aug 2025 phased rollout)** — classifies unconsented
  voice cloning of identifiable public figures as high-risk.

**Right-of-publicity claims survive "satire" framing for commercial
content.** Even non-monetized promotional content asserts identity
ownership; satire framing doesn't waive that.

**Operative rule:** No engine is asked to produce a recognizable
Benjamin / Sterling Archer voice. The R4 work in Unit 0.2 instead
**characterizes Benjamin's distinctive Sterling cadence as teachable
specs** (pitch range, pace, mannerisms, intonation contours), then
applies those specs as TTS steering on ANY voice — preset, owned-clone,
or voice-actor. The acceptance test is *"does this voice land in the
Sterling-coded register?"* — character-archetype recognition, not
actor recognition.

### §5.2 — Blind-tester protocol: MUSHRA, register-recognition framing

Industry standard for "does this fool listeners" research is **MUSHRA**
(ITU-R BS.1534-3). The brainstorm specifies "≥2 testers, blind
protocol" — research shows this is too thin for statistical confidence
on a voice authenticity question. **6–8 listeners minimum** for an
informal research pass (8–12 for a formal one).

**Stimuli per ADR #13 (Sterling-CODED, not Sterling-cloned):** 3–4 TTS
candidates + low-quality anchor + **non-Benjamin Sterling-coded
reference clip** (voice-actor portfolio sample in the deadpan-spy
register) used as the cadence target — NOT as an identity reference.
The reference anchors the MUSHRA score scale; it never serves as a
clone-match target. Question phrasing avoids "which is fake"
leading-the-witness. Open-source hosting via **WebMUSHRA** (ed.ac.uk).

**Acceptance threshold for R4 (register-recognition, NOT
actor-identity):**
- ≥4 of 6 listeners' open-description responses include ≥2 terms from
  the Sterling-coded register cluster (*deadpan / dry / mid-Atlantic /
  sardonic / spy / detective / film-noir / Archer-coded /
  briefing-room*).
- ≥5 of 6 listeners say *Yes* or *Mixed* on character-fit ("does this
  voice match a fictional spy-agency briefer named Dash Barlowe, ~90%
  of trailer runtime?").
- **Joint pass:** ≥4 listeners clear character-fit AND register-cluster
  AND don't flag obviously-synthetic — **same listener across all
  three dimensions**.
- ≤1 of 6 flags "obviously synthetic" on the uncanny-check (with
  free-text capture of what sounded synthetic, for triage).
- MUSHRA naturalness within **±10 points of the non-Benjamin
  Sterling-coded reference clip** (reference-anchored, not absolute).

**Bonus-signal disambiguation:** if a listener invokes Archer/Sterling
unprompted ("sounds Sterling-y," "reminds me of Archer"), the protocol
follows up: *"does it sound like the same actor, or the same style?"*
*Same style* → register pass (target achieved). *Same actor* → engines
drifted toward impression and a Step 4 re-spec is triggered. See Phase
0 Unit 0.2 Step 4 + spectrum bands (Floor / Target / Ceiling).

### §5.3 — Twitter/X mobile crop resolved

The brainstorm flagged a "pressure test before planning" question about
whether to add a center-safe-zone composition rule (Dependencies
§Distribution surface). **Resolved:** X serves a **1.91:1 in-feed
preview crop on mobile**. Critical text must live within a central 1:1
safe square inside the 16:9 frame. No separate vertical track required
— just composition discipline.

### §5.4 — Engineering-Twitter trailer best practices (2026)

- **Runtime sweet spot for portfolio trailers: 60–90s.** BURNED's
  90–100s envelope is at the top end. Acceptable.
- **For X-native in-feed cutdown: 7–15s.** Phase 7 ships a flagship 95s
  + a 12s X-native cutdown (selected per Phase 6 Unit 6.8 Options
  A/B/C; Phase 7 picks one — does not invent a 4th option).
- **Dead tropes:** slow logo intros, narrator-on-camera, "Hi I'm X..."
  openings, synth-piano underscore, before/after stopwatch splits.
- **Alive:** working product in motion in second 1, UI speaks, text
  overlays carry the narrative because feed autoplay is muted.
- **Reference points (no single canonical "AI built this" trailer):**
  Replit Agent 3 + 4 launch reels (Sept 2025, March 2026) — real-time
  screen recording, no narration, captions only. Cursor 0.50 "Agent
  Revolution" + Cursor 3 "Mission Control" — screen-recorded multi-file
  refactor, ambient sound, visible code touching real files. **Pattern:
  show artifact working in second 1, never explain in VO, let chyron
  carry the joke.** **Post sequence pattern (per ADR #27 locked
  2026-05-17 during Phase 7 deepening): 3-beat burst within first
  2-3 hours via self-reply thread — Replit/Cursor/Anthropic launch
  cadence convergence; NOT 24h-spaced quote-tweets.**
- **X video specs (2026):** MP4/MOV, H.264 High profile, AAC-LC
  128 kbps **mono** audio (per ADR #14). 30 fps recommended (60
  supported). **8–12 Mbps VBR for 1080p** (X re-encodes regardless;
  goal is survival of re-encode with minimal degradation; hard cap
  at upload 25 Mbps; per ADR #28 locked 2026-05-17 during Phase 7
  deepening — supersedes pre-deepening "5–8 Mbps" figure which
  under-shoots 2026 X re-encode survival targets; CRF 18 +
  `--x264-preset slow` per ADR #19 naturally lands 12-18 Mbps VBR
  average for action content). Non-premium cap 2:20 / 512 MB.
  Premium / Premium Plus unlocks longer caps + extended-character
  captions (~25k); affects 4 Phase 7 decisions per Phase 7 entry
  gate.

### §5.5 — Composite-spike key risk: font fallback in MP4 export

Brainstorm flags the studio-vs-export font risk as a spike requirement.
**Resolved by architecture:** `@remotion/fonts.loadFont()` automatically
blocks render until the font is ready — no manual `delayRender` /
`continueRender` machinery. The "works in studio, falls back in MP4"
trap is specifically the manual `FontFace` API path. UMB's `useFonts`
hook proves the pattern.

### §5.6 — No prior art for several Phase 5 / Phase 4 patterns

- **Playwright `page.video()` / trace-video gameplay capture** (R13) —
  brand-new. Phase 5 budgets a full standalone phase for invention.
- **Expressive TTS for screams** (R5) — UMB only did calm noir. The
  "Archer-grade authentic or cut" framing in the brainstorm is correct.
  Real human scream + Voice Changer post-processing is the documented
  industry pattern when synthesis fails.
- **Mid-century brass / bossa music bed sourcing** (R9) — brainstorm
  defers to planning. Three candidate sources (generative / royalty-free
  / licensed) resolved in Phase 3.
- **Composite multi-source video** (Imagen art + Playwright page scroll
  + real gameplay footage + live TTS in one timeline) — UMB came close
  (HTP scroll + Imagen art + chaos sim) but never integrated real
  gameplay footage. Phase 4 budget accounts for this.

---

## §6 — Brainstorm Corrections Surfaced by Research

These are factual updates to the brainstorm that planning carries
forward. The brainstorm itself remains the locked requirements contract
— these notes correct numbers / claims that don't reshape requirements.

| # | Brainstorm claim | Research finding | Disposition |
|---|------------------|------------------|-------------|
| C1 | UMB v3 runtime "~124s" (Problem Frame + Key Decisions §90–100s runtime) | Authoritative source `timing-v3.ts` — total is **4440 frames @ 30fps = 148.0s**. | BURNED 95s vs UMB 148s. Recalculated scene density: BURNED 95s / 6 scenes = 15.8s/scene; UMB 148s / 9 scenes = 16.4s/scene. **"Comparable density" defense in brainstorm Key Decisions holds, with corrected numbers.** |
| C2 | TTS evaluation budget "$10 across both jobs" (R5-research-gate) | Real envelope for one-off voice eval: <$50 (ElevenLabs Creator $22 + Gemini $10 + OpenAI $5 + MUSHRA hosting $0–20). Hybrid path: $200–500. | **Plan budget: $50 ceiling for engine evaluation, separate $0–500 line item for hybrid VO if Path C triggers.** |
| C3 | R4 / R14 testers: "≥2 testers, blind protocol" | MUSHRA protocol (ITU-R BS.1534-3) requires 6–8 minimum listeners for informal voice-authenticity confidence. | **Plan tightens R4 + R14 acceptance to 6–8 testers with WebMUSHRA-style protocol.** |
| C4 | R14 candidate cold-open lines | Three of five named candidates (Vera "kid did it. Again. Show-off.", Sable "He did it again! Twice! TWICE!", Janet "Apparently the second one shipped") **lack the machine-wordplay R14 explicitly requires** ("machine"/"autonomous"/"wrote itself"/"built itself" double-meaning). | **Two NEW candidate lines proposed for Phase 0 Unit 0.3 testing:** (i) *"He's a machine, this kid. Honestly at this point I'm just impressed."* (ii) *"Briggsy didn't write this one either. He's getting good at not writing them."* (echoes UMB v3 cold-open hook). |
| C5 | Brainstorm R4-acceptance-gate framing reads as "produce a Sterling-mistakable voice" | The design intent was always Sterling-CODED, not Sterling-cloned — mirroring BURNED's "Archer w/o being Archer" visual rule. Legal floor (ElevenLabs ToS + Tennessee ELVIS Act + EU AI Act + NO FAKES Act, right-of-publicity surviving satire framing) aligns with the design choice. | **R4 reframed as cadence-match gate.** New Step 0 in Unit 0.2 characterizes Benjamin's distinctive cadence as teachable specs; engines steer to those specs on any voice. MUSHRA tests register recognition, not actor recognition. See §5.1 + Phase 0 Unit 0.2. |
| C6 | Brainstorm Dependencies §Distribution surface deferred the Twitter mobile-crop pressure test | X serves 1.91:1 in-feed preview crop on mobile. **Resolution: critical text inside central 1:1 safe square within 16:9 frame.** | **Composition discipline rule added; no separate vertical track required.** |
| C7 | Phase 7 pre-deepening caption "7 operatives" (Variation A) | `src/shared/card-defs.ts` ships 5 operatives + Agent X (wild) = 6 entries; `public/assets/cards/` ships 6 operative `.webp` files (no `otto.webp`). Trailer narration (Phase 1 line 49) says "six in the deck, one in the basement." Roadmap §1 line 50 hallucinated a 7-operative roster matching narration ROLE-count without distinguishing deck-vs-basement. | **Caption corrected to "six operatives in the deck, one in the basement" per ADR #26 stat-verification gate (locked 2026-05-17 during Phase 7 deepening). Roadmap §1 amended inline 2026-05-17 to clarify Otto-in-basement is narrative-only-not-shipped. Future agentic-SDLC project distribution inherits the verifier-script pattern (`scripts/verify-caption-stats.ts`).** |
| C8 | Phase 7 pre-deepening follow-up tweet "Approximately 14,000 pages of forensic dossiers" | Phase 1 line 1584 explicitly says: *"NOTE: previous draft's '14,000 pages' was unverified; Step 5 must run actual `wc -w` if a pages-stat is wanted."* The narration uses it as fictional in-character cadence; using it as a tweet stat passes it off as a real number. | **CUT during Phase 7 deepening 2026-05-17. Post 2b tooling-stack thread rewritten without fabricated stats — uses verifiable claims (Cloudflare Workers Durable Objects / React 19 / Framer Motion / Remotion 4.0 / Imagen 4 / Claude Code) corresponding to actual `package.json` dependencies.** |
| C9 | Phase 7 pre-deepening Post 2 timing "24 hours after Post 1 quote-tweet" | 2026 engineering-Twitter convergence pattern (Replit Agent 3/4, Cursor 0.50/3, Anthropic Code-with-Claude launches; Buffer/sproutsocial 2026 algo data) shows layered burst within first 24h algo window — NOT 24h-spaced posts. Quote-tweets restart distribution; self-replies inherit the window. | **Post sequence reshaped to 3-beat burst T+0 / T+90min / T+2-3h via self-reply thread per ADR #27 (locked 2026-05-17). Post 2 is now a self-reply, not a quote-tweet. Pinned tweet at D+7 remains separate from the burst.** |
| C10 | Phase 7 pre-deepening README embed `[![thumb](png)](release.mp4)` markdown-image-link to MP4 + tertiary HTML `<video>` snippet | GitHub README sanitizer STRIPS `<video>` and `<iframe>` tags; markdown image-link to MP4 URL renders as clickable thumbnail download, NOT inline player. The ONLY mechanism producing inline `<video>` in README is the drag-drop user-attachments URL pattern (Context7 GitHub docs + community discussion #173635). Cloudflare Pages "Option II" fallback hosting has a **25 MiB asset cap** — 95s trailer at production encoding is 60–95 MB; option structurally broken. | **README embed locked to drag-drop user-attachments mechanism per ADR #29 (locked 2026-05-17). Phase 7 Unit 7.2 procedure rewritten. Cloudflare Pages Option II CUT entirely. Cutdown (~25–40 MB) used as inline-played embed; flagship via Release CTAs (GitHub Release asset cap is 2 GiB per asset — not 100 MB as pre-deepening Phase 7 risk row asserted).** |

---

## §7 — Requirements Trace (R1–R15 → Phases)

| R# | Requirement | Owning phase(s) |
|----|-------------|-----------------|
| R1 | Spine: in-world Pendleton Agency briefing | Phase 1 (beat sheet) + Phase 4 (scene composition) |
| R2 | Tone: deadpan, played straight | Phase 0 Unit 0.4 (tone gate) + Phase 1 (locks the thesis) |
| R3 | Climax: stacked visual cascade + audio reveal + gameplay dissolve | Phase 0 Unit 0.5 (spike) + Phase 4 (build) |
| R4 | Dash sustained narration ~90% runtime | Phase 0 Unit 0.2 (gate) + Phase 2 (production) |
| R5 | Vera scream cameo, authentic or cut | Phase 0 Unit 0.6 (gate) + Phase 2 (production if cleared) |
| R6 | Pendleton vocabulary discipline end-to-end | Phase 1 (script gate) + Phase 2 (translation key applied) |
| R7 | 90–100s runtime, 5–7 scenes | Phase 1 (scene count lock) |
| R8 | 16:9 landscape only | All phases (architectural invariant) |
| R9 | Music bed: Archer-coded mid-century brass / bossa | Phase 3 (sourcing) + Phase 4 (mix) |
| R10 | HTP dossier hero in cascade | Phase 0 Unit 0.5 (capture spike) + Phase 3 (production capture) + Phase 4 (scene build) |
| R11 | Goofy stats with comedy-first companion pairing | Phase 3 (stat-list draft + cold-read gate) + Phase 4 (overlay build) |
| R12 | Imagen-generated card art curation | Phase 3 (selection from 17 existing artworks) + Phase 4 (scene composition) |
| R13 | Live gameplay footage closer | Phase 5 (capture harness + capture) + Phase 4 (closer integration) |
| R14 | Compressed-Archer-title-sequence cold-open + repeatability declaration | Phase 0 Unit 0.3 (decode gate) + Phase 4 (build) |
| R15 | On-screen text signal layer for agentic-SDLC origin | Phase 0 Unit 0.5 (spike validates rendering) + Phase 3 (chrome design) + Phase 4 (placement) |

---

## §8 — Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Legal exposure on Sterling-cadence TTS | High (default path is prohibited) | High (project blocker) | Path A clones Briggsy's owned voice; Path C hybrid uses voice actor; no cloning of Benjamin. See §5.1 + Phase 0 Unit 0.2 ladder. |
| TTS authenticity fails across all legal engines | Medium | High (forces restructure) | Path D — restructure to non-Dash briefer (Janet-M, Vera, Sable) using their established voice DNA. Path E — abandon. Documented in Phase 0 Unit 0.2 fail-action ladder. |
| Composite spike reveals font fall-back in MP4 export | Low (`@remotion/fonts` auto-blocks) | Medium | Spike validates end-to-end before beat-sheet locks. UMB's `useFonts` precedent. |
| Composite spike reveals Remotion 4.0.438 incompatibility with one of (transitions / media / lottie) | Low | Medium | Pin to latest 4.0.x compatible release; fallback is UMB's `Series` + `Html5Audio` pattern (audio crossfade becomes manual frame-math). |
| Gameplay capture mechanism greenfield | High (no prior art) | Medium | Phase 5 budgeted as full standalone phase; precedent invention expected; spike at Phase 0 captures HTP only, gameplay deferred. |
| Deploy migration mid-flight affects capture URLs | Medium (in flight 2026-05-16) | Medium | Phase 0 spike uses local Vite dev URL (`http://localhost:5173/howtoplay.html`); production capture deferred to Phase 3 (HTP) + Phase 5 (gameplay) after migration completes. |
| Stats drift between trailer build and ship | Medium | Low | Adopt `feedback-stats-single-source.md` discipline — grep all surfaces (TODO.md, README, trailer scene files, narrator-prompts) on any count change. |
| MUSHRA tester recruitment delay | Low | Low | 6 minimum listeners; Briggsy's network + Discord (Harry et al.) likely sufficient; if not, fall back to Path C hybrid which doesn't need testers. |
| VOICE_DIRECTION anti-pattern reintroduced by future agent | Low (guard codified) | High (corrupts every WAV) | Inline comment at TTS API call site, mirroring UMB's `generate-narrator.ts:195-198`. Lint-grep optional follow-up. |
| Stat-overlay cold-read gate fails | Medium | Low | R11 fail-action: cascade becomes purely visual (card art + dossier + gameplay), comedy-stats cut. Documented in brainstorm Deferred-to-Planning. |

---

## §9 — Bar-Raise Criteria (vs UMB v3)

The trailer must clear UMB v3 on at least one of these three dimensions
on a fixed sampling protocol (per brainstorm Success Criteria):

1. **Named-operative density** — average count of named Pendleton
   operatives visible per sampled frame (silhouette, portrait, dossier
   photo, illustration panel). 10 frames sampled at fixed timecodes
   (every ~10s) from each trailer.
2. **§2 frame-pass rate** — across 10 sampled frames, how many
   independently pass §2 Quality Bar ("could be a frame from an Archer
   episode") on a fixed yes/no rubric (composition, palette discipline,
   typographic discipline). Threshold: ≥8 of 10.
3. **Stacked-payoff moment** — does the trailer have a single beat
   where visual + audio reveal land simultaneously (cascade + Dash VO
   reveal per R3)? UMB v3 doesn't have this. Binary yes/no.

**Parity-with-UMB is not the goal; relative advance on at least one of
these axes is.** Axis 4 from the brainstorm's prior version (absence
of LinkedIn-coded stats) was dropped — R11's cold-read-through gate
makes it table stakes, not a bar-raise dimension.

---

## §10 — Tiebreaker Rule

When (a) "engineers talk about how it was built" and (b) "water-beads /
product-joy takes over" conflict in the edit bay, **water-beads wins.**
The build is the subtext; the game is the text. The cascade earns its
place by feeling like Archer set-dressing, not a credits roll.

---

## §11 — Status & Next Steps

- ✅ **Brainstorm landed:** `docs/ideation/2026-05-15-origin-trailer-brainstorm.md` (2026-05-15, two-pass document review, 15 requirements, 5 Resolve-Before-Planning gates).
- ✅ **Roadmap written:** this file (2026-05-16; ADR #4 + #11 revised 2026-05-17 per Phase 1 deepening; ADR #14 added 2026-05-17 per Phase 2 deepening; ADR #15 added 2026-05-17 per Phase 3 deepening; ADR #2 refined 2026-05-17 per Phase 3 deepening; ADRs #16/#17/#18 added 2026-05-17 per Phase 4 deepening; ADRs #19/#20/#21/#22/#23 added 2026-05-17 per Phase 6 deepening; ADRs #24/#25/#26/#27/#28/#29 added 2026-05-17 per Phase 7 deepening; §5.4 bitrate corrected 2026-05-17 per ADR #28; §1 roster clarified 2026-05-17 per ADR #26; §6 brainstorm corrections C7/C8/C9/C10 added 2026-05-17).
- ✅ **Phase 0 plan written:** `phase-0-gate-resolution.md` (2026-05-16).
- ✅ **Phases 1–7 plans written:** all 7 drafted 2026-05-16 in one workflow per `feedback-phase-plan-drafting-workflow.md`.
- 🟡 **Deepening pass (all 8 phases, sequentially):** in progress.
  - ✅ Phase 0 DEEPENED 2026-05-16 (`b9617d9d`) — 39 amendments, 7 tiers.
  - ✅ Phase 1 DEEPENED 2026-05-17 (`43d44ef4`) — 60+ amendments, 1862→2728 lines.
  - ✅ Phase 2 DEEPENED 2026-05-17 (`e56e69e5`) — 35 amendments, 4 tiers, 1929→4064 lines, +3 new units (2.0/2.X/2.Y); roadmap ADR #14 added.
  - ✅ Phase 3 DEEPENED 2026-05-17 (`[prior commit]`) — 69 amendments, 5 tiers, 1737→4379 lines (2.52× growth ratio), +1 new unit (3.0 vocabulary vendoring); roadmap ADR #2 refined + NEW ADR #15 (public-directory architecture).
  - ✅ Phase 4 DEEPENED 2026-05-17 (`9e31ae4b`) — 28 amendments (8 must-absorb + 10 should-absorb + 7 net-new + 3 NEW ADRs), 10-agent parallel review (8 CE personas + emil + /brief; design-lens partial; feasibility crashed twice — coverage absorbed via other agents), 2467→3527 lines (1.43× growth; bounded by SA-5 component reductions), +2 new units (4.0 font spike + 4.0a UMB v3 component triage); roadmap NEW ADR #16 (composition-level audio) + ADR #17 (Audio import discipline) + ADR #18 (font load strategy — placeholder, outcome filled at Unit 4.0 execution). Reinforces ADR #4 + #11 revised (zero `<TransitionSeries>` consumers confirmed) + ADR #15 (path discipline audit).
  - ✅ Phase 5 DEEPENED 2026-05-17 (`f601857b`) — 25 TIER 1 + 20 TIER 2 amendments + 6 structural cuts + 4 cross-phase amendments surfaced, 8-agent parallel review (8 CE personas + emil + /brief), 1235→~1700 lines (1.38× growth; bounded by Mechanism C cut + sample-eval consolidation), +1 NEW unit (5.0 prerequisites + contract sync). Locks: Mechanism B default + A as harness-extension escalation + C cut; BURNED-draw at clip-relative frame 160 (NOT 360); Approach III hybrid (`pnpm dev:stack` deterministic deck-seed + natural play); single-pass frame-accurate re-encode; atomic-swap pattern (`.new` → `pnpm verify:gameplay-clip` → mv); insight 035 RESOLVED verification; §3 row 5 path corrected to `public/trailer/gameplay.mp4`. Cross-phase amendments surfaced for Phase 1 (retire `gameplay-markers.json` contract) + Phase 4 (placeholder script invalid ffmpeg filter `force_original_aspect_ratio=cover` → `increase`).
  - ✅ Phase 6 DEEPENED 2026-05-17 (this commit) — ~45 amendments absorbed (11 multi-agent-convergence TIER 1 + 23 single-source TIER 2 + 7 structural cuts/restructures + 4 cross-phase amendments), 8-agent parallel review (8 CE personas: best-practices / framework-docs / repo-research / adversarial / scope-guardian / coherence / feasibility / design-lens) + /brief, 1293→2413 lines (1.87× growth; driven by 2 NEW units + operational §2 rubric + 5 new ADRs absorbed), +2 NEW units (6.0 verify-script + atomic-swap + tester pre-recruitment; 6.8 PHASE-6-EXIT + cutdown-frame-list). Locks: production encoding canonical (ADR #19 — CRF 18 / `--x264-preset slow` / no `--tune` reconciles three-way contradiction; `--preset` regression fixed); AV-sync asymmetric tolerance (ADR #20 — audio MUST NOT lead R3); decode-test panel N=6 + UMB control + Q1/Q2 + keyword precision (ADR #21 — fixes N=2 inherited-from-spike error); sign-off ceremony `.signoff` sentinels (ADR #22 — formalizes Phase 5 pattern at roadmap level); 9:16 vertical-feed audit added to mobile-crop (ADR #23 — X 2026 Immersive Media Viewer surface). Phase 6 bar-raise threshold RAISED: axis 3 cleared alone is insufficient (UMB structurally lacks axis 3 by design); requires axis 3 cleared AND ≥1 of axes 1/2 cleared. silencedetect-on-final-mix REJECTED for VO onset detection (continuous music bed above -40dB → zero events); manifest-driven approach via Unit 6.5. Operational §2 rubric replaces gut-call rubric (composition: focal-region count + center anchor; palette: 5-pixel grid sample with RGB-distance threshold; typography: control-render overlay comparison). Failure-action ladder REPLACED with routing-only (Phase 6 detects, does not fix). Cross-phase amendments surfaced for Phase 0 (Unit 0.1 ADR CRF 16 → CRF 18 to align with ADR #19; Unit 0.3 decode-gate clarifies N=2 protocol applies only to 5-second spike) + Phase 4 (carry forward `force_original_aspect_ratio=increase` from Phase 5 deepening) + roadmap §3 row 6 (confirmed CRF 18).
  - ✅ Phase 7 DEEPENED 2026-05-17 (this commit) — ~50 amendments absorbed across 10 CE personas (best-practices / framework-docs / repo-research / adversarial / scope-guardian / coherence / feasibility / design-lens) + emil-design-eng + frontend-design + /brief, sequential-thinking synthesis (10 thoughts), 5 high-stakes claims verified against source before incorporation. Plan: 1052 → ~1500-2000 lines (deepening multiplier comparable to Phase 6's 1.87×). +4 NEW units (7.0 stat-verification gate + 7.1b Release asset provisioning + 7.6 pre-post verify gate + 7.7 pin lifecycle sentinel), 1 consolidated unit (pre-deepening 7.5 metrics-tracking folds into 7.4 calendar per scope-guardian). +6 NEW roadmap ADRs (#24 hard-cut cutdown closure + #25 composed-not-mid-motion frame-0 anchor + #26 distribution stat-verification gate + #27 3-beat burst post sequence + #28 bitrate 8-12 Mbps + #29 README drag-drop user-attachments embed mechanism). Cross-phase amendments: Phase 1 Unit 1.5 line 1326 disambiguation (brightening ease completes AT 1860, held bright 1860-1950) + Phase 6 Unit 6.8 cutdown-frame-list.md contract tightening (Phase 7 picks A/B/C; composed-not-mid-motion verdicts on segment START_FRAMEs; expected file size; 9:16 verdict propagation) + Phase 6 Unit 6.2 thumbnail README derivative output (`docs/trailer/thumbnail.jpg` 1200×675 q85 <100KB) + roadmap §1 roster clarification + §5.4 bitrate fix + §6 brainstorm corrections C7/C8/C9/C10. Phase 7 is the FIRST documented distribution pass for any agentic-SDLC project under Briggsy's portfolio (UMB v3 has no distribution post-mortem per /brief negative finding); patterns propagate forward — they do not inherit backward. Resolved framework-docs vs feasibility disagreement on FFmpeg `-ss` placement: framework-docs verified `-ss BEFORE -i` IS frame-accurate post-FFmpeg-2.1 via default `-accurate_seek=true`; synthesis still picks Phase 5 canonical `-ss AFTER -i` for project consistency + audio-packet-boundary safety + ADR #20 R3-must-not-lead-visual guarantee. Stat-verification gate eliminates "7 operatives" hallucination (codebase ships 6: 5 operatives + Agent X wild; trailer narration locks "six in the deck, one in the basement") and "Approximately 14,000 pages" fabrication (Phase 1 line 1584 explicitly flagged).
- ✅ **All 8 phases now deepened.**
- ⏸ **Briggsy review of deepened plans:** pending — Phase 7 deepening completes the sequential pass.
- ⏸ **Phase 0 execution:** begins after Briggsy reviews deepened plans.

**Open carry-forward decisions** (resolve at Phase 0 → Phase 1 boundary,
not now):
- Phase 0 Unit 0.5 spike outcome — does Lottie-inside-Remotion land for
  Archer transition vocabulary, or do we need post-processing?
- Phase 0 Unit 0.2 outcome — which TTS engine + voice path clears the
  R4 bar (Path A/B/C/D)?
- Phase 1 scene count lock — 5, 6, or 7 scenes from the 5–7 range.

---

## §12 — Sources & References

**Origin documents:**
- Brainstorm: [`docs/ideation/2026-05-15-origin-trailer-brainstorm.md`](../../ideation/2026-05-15-origin-trailer-brainstorm.md)
- Product specification: [`docs/PRODUCT-SPECIFICATION.md`](../../PRODUCT-SPECIFICATION.md)

**UMB v3 trailer precedent:**
- Composition: `projects/undercover-mob-boss/videos/trailer/src/{Root.tsx,TrailerV3.tsx}`
- Scenes: `projects/undercover-mob-boss/videos/trailer/src/scenes/V3S{01..09}_*.tsx`
- Timing: `projects/undercover-mob-boss/videos/trailer/src/lib/timing-v3.ts` (authoritative 148s)
- Narrator pipeline: `projects/undercover-mob-boss/scripts/generate-narrator.ts` (VOICE_DIRECTION guard at lines 195–198)
- Narrator prompts: `projects/undercover-mob-boss/scripts/narrator-prompts.ts` (TRAILER_V3_PROMPTS)
- HTP capture: `projects/undercover-mob-boss/scripts/capture-htp-scroll.ts`
- Goofy-stats exemplar: `projects/undercover-mob-boss/videos/trailer/src/scenes/V3S08_ThePunchline.tsx`

**BURNED assets the trailer consumes:**
- Card art: `public/assets/cards/` (17 unique webp — verified 2026-05-16)
- HTP app: `src/client/howtoplay/App.tsx` (10 acts: Cover → Mission → Roster → Loop → Arsenal → Combos → TurnInheritance → Intercept → Remote → Signoff)
- Dash voice DNA: `src/client/howtoplay/acts/ActRoster.tsx` (Dash dossier + flourish, the strongest Sterling-cadence material), `ActArsenal.tsx` (tactic lines with Phrasing! beats), `ActMission.tsx` (M's briefing cadence — proves briefer-voice register), `ActIntercept.tsx` (counting-fingers Phrasing line)
- BURNED Phrasing! wire-report pool: `src/client/shared/DramaOverlay.tsx:187` (6 sub-captions usable as R15 chrome)
- COMMS ticker idle lines: `src/client/board/DossierFeed.tsx:20-25` (`CHANNEL OPEN`, `STANDING BY`, `AWAITING TRANSMISSION`, `INTERCEPT CLEAR`)
- Verified stats source: `TODO.md` §1 (2026-05-16 squeaky) — 1407 tests pass / 6 expected fail / 68/68 files green / phone player 19.17 KB gz / DramaOverlay lazy 2.34 KB gz / HOW-TO-PLAY 99.04 KB JS + 65.83 KB CSS + 69.42 KB GSAP chunk / Protocol v6

**Remotion documentation:**
- TransitionSeries + fade: https://www.remotion.dev/docs/transitions/transitionseries
- Fonts API: https://www.remotion.dev/docs/fonts-api/load-font
- OffthreadVideo: https://www.remotion.dev/docs/offthreadvideo
- Quality (CRF, codecs): https://www.remotion.dev/docs/quality
- Lottie: https://www.remotion.dev/docs/lottie
- Remotion Agent Skills (Jan 2026): https://github.com/remotion-dev/skills

**TTS engine landscape (2026):**
- ElevenLabs v3 + Prohibited Use Policy (Sept 3 2025): elevenlabs.io, audioscripter.com
- Gemini 3.1 Flash TTS (launched April 15 2026): blog.google, google.dev
- OpenAI gpt-4o-mini-tts: openai.com
- Voice actor marketplaces: voices.com, voice123.com

**Legal references for voice cloning:**
- Tennessee ELVIS Act 2024
- Proposed federal NO FAKES Act (Senate, 2026)
- EU AI Act (Aug 2025 phased): rock.law, holonlaw.com
- ElevenLabs traceability: biometricupdate.com, regulations.gov (Sen. Hassan April 2026 inquiry)

**Audio evaluation protocols:**
- MUSHRA: ITU-R BS.1534-3
- WebMUSHRA (open-source): ed.ac.uk
- MOS comparison: audiolabs-erlangen.de
- Reference-matching bias: openreview.net 2025

**X / Twitter video specs (2026):**
- Specs: moda.app, sprinklr.com, postful.ai, X Help
- Engineering-trailer references: replit.com (Agent 3 + 4 launches), cursor.com (0.50 + 3 launches), anthropic.com (Code with Claude 2026 keynote clips)

**Institutional learnings (memory):**
- `feedback-narrator-voice-direction.md` — VOICE_DIRECTION anti-pattern
- `feedback-stats-single-source.md` — stat drift discipline
- `feedback-imagen-budget.md` — one-test-image-first protocol
- `feedback-imagen4-over-nbp.md` — Imagen 4 preferred for any new asset
- `feedback-wow-over-simplicity.md` — visual richness over "cut layers" advice
- `feedback-phase-plan-drafting-workflow.md` — write all phase files in one workflow; deepen sequentially after
- `feedback-wait-for-all-agents.md` — synthesis discipline
- `feedback-eye-in-loop-beats-calibration-for-motion.md` — motion validation rule (applies to Phase 4 scene timing review)

**Brainstorm-corrections sources (§6):**
- UMB v3 runtime: `projects/undercover-mob-boss/videos/trailer/src/lib/timing-v3.ts` (authoritative 4440 frames @ 30fps)
- TTS budget envelope: cross-engine pricing scan via vendr.com + engine pricing pages
- MUSHRA listener count: ITU-R BS.1534-3 + ed.ac.uk reference implementations
