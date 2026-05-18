# BURNED — TODO

Operator's queue. Actionable items only. **Not a diary** — git log has
the history. (Rule: `feedback-todo-is-not-a-diary.md`.)

---

## 1. Active priorities

Current state (verified 2026-05-17 mid-session):

- Tests: **1407 pass** | 6 expected fail (68/68 files green) — unchanged, no code shipped this session.
- Typecheck: clean (`pnpm typecheck`) — last verified at 2026-05-16 squeaky.
- Phone player entry: **19.17 KB gz**. Total initial JS still under the 100 KB phone ceiling.
- DramaOverlay lazy chunk: **2.34 KB gz**.
- HOW-TO-PLAY bundle: `howtoplay-*.js` 99.04 KB (33.90 KB gz) + `howtoplay-*.css` 65.83 KB (10.68 KB gz) + shared GSAP chunk 69.42 KB (27.21 KB gz).
- Protocol: v6.

_No live prescriptions on the BURNED product. **Origin-trailer plan state (2026-05-17 mid-session): Phases 0/1/2/3/4/5/6 doc-review applied; Phase 7 pending. Phase 6 doc-review absorbed THIS COMMIT — 7-persona pass (coherence 5 / feasibility 30 / product-lens 25 / design-lens 17 / security-lens 10 / scope-guardian 18 / adversarial 38 = ~143 raw findings, ~90 unique absorbed across all severities). 2468→3258 lines (1.32× growth — modest, deepening already absorbed many fixes). 7 strategic CALLs locked: CALL-1 (9:16 audit GATED on Unit 6.0 Step 6 X 2026 Immersive Media Viewer primary-source verification — pre-deepening assumed surface, doc-review converts to verify-then-execute); CALL-2 (bar-raise honesty section — axes 1+3 are structural givens by design, axis 2b is the only earned-relative-quality axis; verdict matrix updated to reflect); CALL-3 (decode test DEMOTED from Phase 6 GO/NOGO gate to DIAGNOSTIC — resolves roadmap §10 water-beads tiebreaker contradiction + Briggsy-watch authority asymmetry; sub-verdicts route attention, Briggsy end-to-end watch is GO/NOGO authority); CALL-4 (§2 rubric SPLIT into Layer A Production Discipline + Layer B Archer-Fidelity — pre-deepening operational rubric measured token-discipline not Archer-look; Layer B anchored against 5 Archer reference frames committed local-only); CALL-5 (cross-phase amendments APPLIED in this pass — Phase 0 CRF 16→18 + Unit 0.3 scope clarification + Phase 4 force_original_aspect_ratio=cover→increase + Phase 4 verify-briggsy-sentinels SCENES extension); CALL-6 (mobile crop adds 1.91:1 audit alongside 1:1 conservative — 1:1 was sidelining 78% of horizontal real estate that X delivers; 1:1 fail with 1.91:1 pass = ACCEPTABLE-FAIL); CALL-7 (cutdown ownership cleanup — Phase 6 ships timing-window metadata, Phase 7 applies ADR #25; Primary recommendation demoted to non-binding note). P0 mechanical fixes: LUFS verify-script broken (`execFileSync` stdout, FFmpeg loudnorm writes stderr — gate was permanently failing as written; switched to `spawnSync` stderr capture); FFmpeg `-pattern_type glob` NOT available on Windows (rewrote `generateContactSheet` with explicit `-i` per file); `--frame N-M` is invalid (Remotion CLI uses `--frames` plural for ranges); `--codec-options "maxrate=8M:bufsize=16M"` is fictional (real flags `--max-rate` + `--buffer-size`); `audit-av-sync.ts` accessed `cue.src`/`cue.id` not on AudioAsset (switched to `cue.staticPath` + `cue.filename`); `--hardware-acceleration if-possible` is macOS-only and Briggsy on Windows (rewrote `render:iterate` as software libx264 veryfast); stat hallucination "7 active + 1 NPC" operatives (auto-derive from card-defs.ts per Phase 7 ADR #26 principle); bare `renameSync` not atomic on Windows (ported Phase 5 `atomicSwap` with EBUSY/EXDEV/EEXIST handling); UMB cross-project path off by one `../` (fixed). Content-sanity asserts added to verify-script (frame entropy + audio TP + non-placeholder gameplay source — catches "encoding right but content broken" failure mode). qa-report restructured for verdict-first + asymmetric Briggsy-authority + Sign-offs-over-FAILs section. Decode test restructured: between-subjects N=3+3 panel (BURNED-only arm + UMB-control arm), priors elicitation 24h pre-test, Q1 prompt time-cap removed, keyword precision broadened to PRIMARY+SECONDARY counts (water-beads tiebreaker), Briggsy adjudication rubric binds discretion, transcription via local Whisper or Briggsy-types-verbatim (Gemini-grounding cited but doesn't do audio — removed). Mobile crop adds 1.91:1 actual + 1:1 conservative + conditional 9:16. Thumbnail selection now feed-stop test across 4 candidates (1950/1860/1425/2790) — pre-deepening defaulted to logo-on-desk. Cross-browser checks dropped redundant WMP (same MF stack as Films & TV). Cross-phase amendments LANDED same commit (Phase 0 CRF + Unit 0.3 scope; Phase 4 placeholder fix + verify-briggsy-sentinels SCENES extension to cover 6.0a/6.4/6.7 + roster row-count check; .gitignore additions for decode-audio/ + archer-reference/ + videos/trailer/out/*.mp4). Phase 6 frontmatter `reviewed: 2026-05-17`. Doc-review sweep continues sequentially through Phase 7.**_

- _[`roadmap.md`](docs/plans/origin-trailer/roadmap.md) — **23 ADRs now** (NEW ADR #19 production encoding canonical lock + ADR #20 AV-sync asymmetric tolerance + ADR #21 decode-test panel N=6 + UMB control + Q1/Q2 + keyword precision + ADR #22 sign-off ceremony `.signoff` sentinels + ADR #23 9:16 vertical-feed audit added 2026-05-17 per Phase 6 deepening), R1–R15 trace, **bar-raise threshold RAISED** (axis 3 necessary not sufficient), ~95s/2850-frame target_
- _[`phase-0-gate-resolution.md`](docs/plans/origin-trailer/phase-0-gate-resolution.md) ✅ **DEEPENED 2026-05-16 + DOCUMENT-REVIEW APPLIED 2026-05-17** — 6 units (scaffold + 5 brainstorm gates); 39 deepening amendments across 7 tiers + 59 doc-review findings absorbed (3 P0 / 22 P1 / 28 P2 / 6 P3) across 7 CE personas (coherence / feasibility / product-lens / design-lens / security-lens / scope-guardian / adversarial); 1971→3103 lines (1.57× growth); Step 0.5 markdown-review REPLACED with audio pre-flight (output-not-process rule); Step 0a probe REWRITTEN as shell-agnostic Node script with real TTS-endpoint probes + char-budget tripwire; Step 3a hosting reranked (Tunnel default + Pages-with-Worker option 2; PHP-runtime gap closed); ADR #4-aligned scaffold (no `@remotion/transitions` pre-install; bare `<Series>` + scene-internal overlay pattern); VOICE_DIRECTION grep-of-comments replaced with executable Vitest assertions on actual API payloads; Path D 21-day hard deadline + AI-disclosure contract template + Brainstorm-Restructure Option (iv) form-factor pivot; ADR #21 keyword-precision aligned in Unit 0.3; PHASE-0-EXIT.md template restructured (Voice Cast + Cold-Open Line at top as Phase 1 blockers; model-version-pin field added; amendment procedure documented; provisional-until-Phase-6 flag); listener pool independence rule (cross-unit overlap forbidden); Ceiling-band halt procedure + 3-iteration cap + Phase 6 rollback contract_
- _[`phase-1-beat-sheet-lock.md`](docs/plans/origin-trailer/phase-1-beat-sheet-lock.md) ✅ **DEEPENED 2026-05-17 + DOCUMENT-REVIEW APPLIED 2026-05-17** — 10 units; 60+ deepening amendments via 8-agent shape + emil-design-eng; **+ 83 raw doc-review findings → ~50 unique absorbed across 7 CE personas (coherence / feasibility / product-lens / design-lens / security-lens / scope-guardian / adversarial-document-reviewer). 2728→3550 lines (1.30× growth). Three product re-opens Briggsy-resolved live: (1) cold-open Candidate #5 PROMOTED over #4 ("Briggsy didn't write this one either" — carries explicit repeatability + autonomous-build claim that #4's "machine" double meaning was decode-fragile on); (2) cascade content KEPT as locked SDLC-translated engineering output, Open Risk flagged for Phase 6 critical-engineering-peer §2 screening (loses water-beads tiebreaker by design); (3) R15 cold-decode STRENGTHENED via NEW R15 #5 closing card at frame 2835 ("DRAFTED, RENDERED, AND SHIPPED BY AUTONOMOUS AGENTS." + subhead "Briggsy didn't write this part either." bookending the new S01 line). P0 mechanical fixes: cascade payoff line COLLAPSED to 4-word truth-collision (prior 16-word was 8.0 wps = 5× over declared 1.6-1.8 ceiling — deepening claimed Resolved but wasn't); Stat 4 source-fix ("research budget" matches ActRoster:153-158 exactly; "in the basement" was Phase 1 fiction); JetBrains Mono variable-axis '100 800' → '100 900' typo; Font copy path ADR #15 violation removed (use BURNED's public/fonts/ via Phase 0 ADR #8 setPublicDir); Line schema extended with 7 fields Phase 2 needs (cueType + expectedFrames + leadFramesHint + driftToleranceOverride + fadeInMs + fadeOutMs + skipSilenceremove); per-line table absolute frames invariant; S05 trim-to-target locked; S01 visual composition added; Phase 0 wps-band gap closed (Phase-1-authored bands, Phase 2 validates); Path A/B/C vs D unit split. P1: Sterling-scream reframe (recognition IS the joke), Phrasing! close earned via "Hold it tight" innuendo, script.test.ts simplified to id-comment-reference, R6 grep PowerShell-ported, cold-read gate per-reviewer-floor consensus, side-band-right coords moved INSIDE safe-square (mobile-X autoplay was cropping accumulation), dossier-wipe direction clarified, S05 gameplay audio treatment specified, Suno fallback hardened with marketplace tier elevated + music_disclosure_required flag for Phase 7, player-name scrub gap closed in gameplay-markers.json contract, briefing-room layered-simultaneous rule applied to S02/S03/S06. P2/P3: CASE BANNER per-scene copy table, dossier interior content spec, S03 portraits vs S04 halo reconciled (6 action cards locked: burned/intercepted/burn-the-files/extraction/intel-briefing/direct-order), hat-count audit moved pre-gate, Open Questions Resolved-During-Planning section trimmed, Suno litigation procedural status stripped, banned-transition list trimmed to style prohibitions only, R6 vocab list organized by 9 categories, BEAT-SHEET.signoff sentinel added per ADR #22, citation-verification step added._
- _[`phase-2-voice-pipeline.md`](docs/plans/origin-trailer/phase-2-voice-pipeline.md) ✅ **DEEPENED 2026-05-17** — 11 units now (NEW 2.0 preflight + 2.X Path D voice-actor ingestion + 2.Y Path B hybrid scream Voice Changer; 2.1 gutted+recast to consume Phase 1's BURNED_TRAILER_LINES instead of recreating; 2.2 engine clients fully rewritten per Context7-verified API surfaces; 2.3-2.8 deepening callouts); 35 amendments across 4 tiers via same 8-agent shape (best-practices / framework-docs / repo-research / adversarial / scope-guardian / coherence / feasibility / design-lens) + emil-design-eng_
- _[`phase-3-visual-asset-prep.md`](docs/plans/origin-trailer/phase-3-visual-asset-prep.md) ✅ **DEEPENED 2026-05-17** — 8 units now (NEW 3.0 vocabulary vendoring + 3.1-3.7 with Path B hybrid architecture lock); 69 amendments across 5 tiers via same 8-agent shape (best-practices / framework-docs / repo-research / adversarial / scope-guardian / coherence / feasibility / design-lens) + emil-design-eng + /brief_
- _[`phase-4-remotion-composite.md`](docs/plans/origin-trailer/phase-4-remotion-composite.md) ✅ **DEEPENED 2026-05-17** — 12 units now (NEW 4.0 font load spike + NEW 4.0a UMB v3 component triage + 4.1-4.10 with composition-level audio architecture + R15 split-layer + cascade-ring-layout consumption + sequential revelation enforcement + S04TailFadeToBlack scene-internal overlay + Otto-aside typographic BASEMENT + emil curve registry + Briggsy-eye sentinel-file gating + motion-shape Playwright spec + 3-branch escalation procedure + Phase 5 ffprobe handoff contract); 28 amendments across 4 tiers (8 must-absorb / 10 should-absorb / 7 net-new / 3 NEW ADRs); 10-agent parallel review (8 CE personas + emil-design-eng + /brief; design-lens partial; feasibility crashed twice with coverage absorbed via framework-docs + adversarial + scope-guardian + repo-research)_
- _[`phase-5-gameplay-capture.md`](docs/plans/origin-trailer/phase-5-gameplay-capture.md) ✅ **DEEPENED 2026-05-17 + DOCUMENT-REVIEW APPLIED 2026-05-17** — 7 units (5.0-5.6); 25 TIER 1 + 20 TIER 2 amendments + 6 structural cuts + 4 cross-phase amendments (deepening pass) + ~80 unique findings absorbed across 7 CE personas (doc-review pass; 2283→3599 lines / 1.58× growth). 7 strategic CALLs: Mechanism A spike PROMOTED to Unit 5.0 parallel-prereq; R13 split (R13a legitimacy + R13b aliveness); agent-built identity defense; Mechanism B = physical-camera-OBS-VCD not Display-Capture-alone; Approach III LOCAL-DEV-ONLY; Harry as outside-viewer; URL strategy mechanism-coupled. P0 fixes: BURNED-canon dev:stack cards (CARD_DEFS verified), CLI sig corrected (space-separated argv + room positional), seed-after-game-start sequence, godClient.send→child-process spawn (was fictional), parallel trailer-capture script (parseArgv strict rejected --trailer-capture flag), verify-briggsy-sentinels cross-phase extension, HEAD_TRIM_FRAMES env-var-NaN-assert (was hardcoded EXAMPLE 318), framerate-aware head-trim for VFR WebM, atomicSwap EXDEV/EEXIST handling, verify-gameplay-clip pix_fmt/r_frame_rate/field_order assertions. Take selection: rubric → 24h cool-off → random-order top-3 → §2 Archer gate → 3-Q fluency → Harry blind viewer. PHASE-5-PREFLIGHT.md ceremony dropped. PHASE-5-EXIT.md trimmed to 4 facts. Phase 1 cross-phase amendments landed SAME commit (retired gameplay-markers.json+startFrom/endAt; cue-table disambiguation; codename-alias subsumes scrub field). Phase 1: 3560→3601 lines._
- _[`phase-6-final-render-qa.md`](docs/plans/origin-trailer/phase-6-final-render-qa.md) ✅ **DEEPENED 2026-05-17 + DOCUMENT-REVIEW APPLIED 2026-05-17** — 9 units (6.0-6.8); ~45 deepening amendments + ~90 unique doc-review findings absorbed across 7 CE personas (coherence 5 / feasibility 30 / product-lens 25 / design-lens 17 / security-lens 10 / scope-guardian 18 / adversarial 38 = 143 raw). 2468→3258 lines (1.32× growth — modest). 7 strategic CALLs: CALL-1 9:16 audit gated on verification (was unverified speculation); CALL-2 bar-raise honesty (axes 1+3 structural givens, axis 2b only earned-quality axis); CALL-3 decode test DEMOTED to diagnostic (resolves §10 tiebreaker contradiction; Briggsy watch is GO/NOGO authority); CALL-4 §2 rubric SPLIT into Layer A Production Discipline + Layer B Archer-Fidelity (reference-frame-anchored); CALL-5 cross-phase amendments APPLIED in pass; CALL-6 mobile crop adds 1.91:1 actual alongside 1:1; CALL-7 cutdown ownership cleanup (Phase 6 ships metadata, Phase 7 applies ADR #25). P0 fixes: LUFS verify-script stderr capture (was reading stdout — gate permanently failed); FFmpeg glob unavailable on Windows; `--frame` vs `--frames` plural; `--codec-options` fictional → `--max-rate` + `--buffer-size`; `audit-av-sync.ts` `cue.src`/`cue.id` not on AudioAsset; `--hardware-acceleration` macOS-only; stat hallucination 7 active+1 NPC (auto-derive from card-defs.ts); bare `renameSync` not atomic on Windows (port Phase 5 `atomicSwap`); UMB path off by one `../`. Phase 6 verify-script extended with content sanity (frame entropy + audio TP + non-placeholder gameplay source). qa-report verdict-first + asymmetric Briggsy authority + Sign-offs-over-FAILs section. Decode test between-subjects N=3+3 panel + priors elicitation 24h pre-test + broadened keyword precision (PRIMARY+SECONDARY water-beads counts). Cross-phase amendments LANDED: Phase 0 CRF 16→18 + Unit 0.3 scope clarification; Phase 4 force_original_aspect_ratio=cover→increase + verify-briggsy-sentinels SCENES extension covering 6.0a/6.4/6.7 + decode-test-roster row-count check; .gitignore additions for decode-audio/ + archer-reference/ + videos/trailer/out/*.mp4. Phase 6 frontmatter `reviewed: 2026-05-17`._
- _[`phase-7-distribution.md`](docs/plans/origin-trailer/phase-7-distribution.md) — 9 units (deepened 2026-05-17, ~50 amendments + 4 NEW units 7.0 stat-verification gate / 7.1b Release asset / 7.6 pre-post verify gate / 7.7 pin lifecycle); ADRs #24-29 added during deepening — **next doc-review target**_

_**Locked decisions during initial drafting pass:**_
- _ADR #13 "Sterling-CODED, not Sterling-cloned" (Phase 0; voice analog of Archer-CODED — mimicry of style, never replication of identity)_
- _Project-wide security convention: `execFileSync` argv arrays for all shell-outs (caught by `security_reminder_hook` during Phase 2 drafting; codified throughout Phases 2/3/5/6/7)_
- _6-scene layout, 95s/2850-frame total, BURNED-typography inheritance (Phase 1; cascade composition revised below per Phase 1 deepening)_
- _Per-line WAV granularity + EBU R128 -23 LUFS post-processing (Phase 2)_
- _HTP rendering via UMB-clone of `capture-htp-scroll.ts` + Phase 0 ADR #8 `setPublicDir('../../public')` for card-art read-through (Phase 3)_
- _Pure-Remotion animation paradigm (no Framer Motion in trailer project) (Phase 4)_
- _Mechanism B default (OBS + real devices) per water-beads rule, Mechanism A fallback (Phase 5)_
- _3-post X distribution sequence: flagship + cutdown quote + pinned (Phase 7)_

_**Locked decisions during Phase 1 deepening pass (2026-05-17, `43d44ef4`):**_
- _R3 cross-dissolve REPLACED with hard cut at S04→S05 after 1.0s payoff visual hold (more Archer per design-lens; dissolves 3 internal timing contradictions; removes need for `<TransitionSeries>` overlap math)_
- _**Bare `<Series>` + scene-internal overlay components** (NOT `<TransitionSeries>`) — matches UMB v3 TrailerV3.tsx precedent exactly. Roadmap ADR #4 + #11 revised._
- _Cascade composition: **sequential revelation with focal hierarchy** (was layered-simultaneous; failed §2.2 design-lens as AI-slop-shaped). Anti-pattern guard: no frame except 1950 payoff stamp has >2 elements at full visual weight_
- _Variable woff2 fonts (3 files: ClashDisplay/GeneralSans/JetBrainsMono-Variable), not 6 weight-specific files. Promise.all loading pattern per Phase 0 prescription_
- _R6 grep regex rewritten — POSIX ERE lookahead unsupported on Windows; rg --pcre2 + 2-pass; vocabulary 11→25 terms_
- _Per-cue wps validated (first-draft cue table had Stat 3 at 3.0 wps + S04 opener at 4.5 wps — unbuildable for Sterling-coded delivery); band 1.9-2.3 sustained / 2.4-2.6 list / 1.6-1.8 payoff_
- _Udio struck from candidate pool (Nov 2025 settlement disabled exports); Suno Pro/Premier ToS corrected; Artlist Pro $199/yr is the minimum tier (was $50/yr Social tier — doesn't cover portfolio embed); Suno Pro $10/mo budgeted as expected fallback_
- _Roster reframe: "Seven on the roster, six in the deck, one in the basement. Don't ask." (matches `ActRoster.tsx:153-158` Otto-exclusion aside; first-draft "seven" mismatched on-screen dossier)_
- _Color tokens use Radix-style scale+step (`--color-cream-12`, `--color-ochre-3`, `--color-burned-fire`); bare-family tokens (`--color-cream`, `--color-mahogany`, `--color-ink`) do NOT exist in primitives.css_
- _CaseBanner.tsx ghost-reference → `GameTable.tsx:67-88` inline `.caseBanner` aside_
- _useFonts.ts Promise.all pattern (was sync flag-then-async loads; race condition fixed)_
- _Sterling-screams-Lana identity-replication framing rewritten to cadence-spec citation only (ADR #13 compliance)_
- _R15 #4 reframed to status grammar ("OPERATION STATUS: FIELD-READY") differentiating from #3 origin claim_
- _emil custom easing curves added (EASE_OUT / EASE_IN_OUT / EASE_DRAWER); asymmetric stat-caption timing (200ms in / 1s read / 400ms decay); stamp slap never scale(0) — scale(0.95) → 1.04 overshoot → 1.0 settle_
- _Briefing-room S02 depth-plane foreground element added (manila folder stack / brass nameplate / doorframe vignette — Phase 4 picks); venetian-blind shadow 1.5-2px/frame (survives H.264; was 0.5px = subpixel)_
- _script.ts machine contract added for Phase 2 (typed `BURNED_TRAILER_LINES` const; UMB precedent: TRAILER_V3_PROMPTS)_
- _Vitest devDep + test scripts added to trailer package.json (Phase 0 scaffold gap)_
- _S05 budget tolerance band 14-22s (`S05_BUDGET_MIN/MAX_FRAMES`)_
- _R11-cut bridge line drafted inline (was punted to Phase 2 execution)_
- _Cold-read gate N=3 + 0-2 scale + recorded stimulus + consensus on pairings (was N=1 binary)_

_**Cross-phase dependencies surfaced by Phase 1 deepening** (Phases 2/3/5/7 must absorb during their own deepening passes):_
- _**Phase 2:** ✅ ABSORBED in Phase 2 deepening — consumes `script.ts` (not Markdown) for line set; per-engine cadenceAdapter (ElevenLabs `[shouts]` vs Gemini `[mood: shouting]`); `script.test.ts` asserts sync with BEAT-SHEET.md_
- _**Phase 3:** budget BOTH static-PNG AND Playwright trace-video paths for HTP capture (conditional on Phase 3-entry perceptual gate)_
- _**Phase 3:** take ownership of `videos/trailer/public/audio/music-bed.mp3` (was double-claimed by Phase 1 Unit 1.7 verification)_
- _**Phase 5:** ship `gameplay-raw.mp4` + `gameplay-markers.json` contract (in-point + BURNED-draw-frame); Phase 4 trims via `<OffthreadVideo startFrom={M} endAt={M + S05_BUDGET_TARGET_FRAMES}>` to land BURNED draw at scene-relative frame 160_
- _**Phase 7:** carry explicit "built by autonomous agents" cold-viewer decode in distribution copy (R15 chrome in trailer carries engineering-peer confirmation only; cold-decode signal lives in Phase 7 metadata)_

_**Locked decisions during Phase 2 deepening pass (2026-05-17, this commit):**_
- _Phase 2 `SCRIPT_CUES` literal GUTTED — Phase 2 consumes Phase 1's `BURNED_TRAILER_LINES` directly via `script.ts` import; `script-lines.ts` file removed (single source of truth)_
- _Voice union aligned to Phase 1's `'dash'|'sable'|'janet'|'vera'` (drops invented `'cold-open-speaker'` + `'dash-scream'` cells); scream cue is `voice: 'dash'` with `cadenceAdapter.prefixTag: '[shouts]'` steering_
- _**Gemini gemini.ts MUST `pcmToWav()` wrap** — Gemini returns raw 24kHz PCM, NOT formatted WAV; original draft wrote raw PCM as `.wav` (invalid file FFmpeg/Remotion can't decode); helper ported verbatim from UMB `generate-narrator.ts:127-155`_
- _ElevenLabs `model_id: 'eleven_v3'` (NOT `eleven_multilingual_v2` which silently ignores audio tags); `[shouts]` not `[scream]` (Context7-verified — `[scream]` undocumented; tags SELF-CLOSING in v3); `[pause:Xms]` REMOVED (doesn't exist in v3 — only qualitative `[pause]`/`[short pause]`/`[long pause]`)_
- _Gemini model name corrected to `'gemini-2.5-flash-preview-tts'` (was `'gemini-3.1-flash-tts'` — doesn't exist as of 2026)_
- _OpenAI snapshot pin `'gpt-4o-mini-tts-2025-03-20'` (Context7-corroborated compliance regression on later snapshots)_
- _`<Audio from={frame}>` language REMOVED — prop doesn't exist on `@remotion/media`'s `<Audio>`. Phase 4 placement pattern: `<Sequence from={asset.startFrame - leadFramesHint}><Audio src={staticFile(asset.staticPath)} /></Sequence>` per Phase 0 ADR #5 + Context7 verification_
- _FFmpeg `silenceremove` REWRITTEN to areverse-sandwich pattern (was `start_periods=1:start_duration=0:...:stop_periods=1:stop_duration=0` which can cut interior silence + drop final syllables)_
- _**`loudnorm` TWO-PASS workflow** (single-pass drifts ±2-3 LU on clips <30s per k.ylo.ph canonical guide; every Phase 2 cue is in the danger zone)_
- _**LUFS target -16** (NOT -23 broadcast) — compromise for X/YouTube portfolio distribution; preserves dynamic range for cadence + payoff contrast_
- _Audio format lock: 48kHz / 16-bit signed LE PCM / **MONO** (`-ac 1` on every FFmpeg invocation; matches anullsrc silence; eliminates concat-demuxer codec-mismatch)_
- _FFmpeg ≥5.0 minimum version pin (≥6.0 recommended); Unit 2.0 preflight enforces_
- _**NEW Unit 2.0** — Prerequisites + Preflight + PHASE-0-EXIT.md ingest (single source of truth for engine/voice/model lock; no `TTS_ENGINE` env var override)_
- _**NEW Unit 2.X** — Path D Voice-Actor WAV Ingestion (replaces Units 2.2-2.4 when PHASE-0-EXIT.md locks engine=voice-actor)_
- _**NEW Unit 2.Y** — Path B Hybrid Scream Voice Changer (replaces scream cue branch of Unit 2.2 when R5 outcome = kept-via-B)_
- _Three-tier Phase 1 reconciliation escalation ladder (Tier 0 silent absorb → Tier 1 Phase 2 regen → Tier 2 Phase 1 line-trim via Step 2a reopen procedure → Tier 3 timing.ts → Tier 4 TOTAL_FRAMES roadmap reopen)_
- _Per-cue tolerance bands by cue type (sustained ±5% / list ±7% / payoff ±4% / scream ±20%) replace flat ±5%/±20%_
- _Hash-based skip-or-regen invalidation (sidecar `${wav}.meta.json` sha256 of inputs; stale WAVs auto-regen on Phase 1 text edits without `--force`)_
- _Atomic-write pattern across all FS writes (`${path}.tmp` intermediate + atomic-rename); mid-process crash recovery_
- _JSONL machine-readable generation log alongside Markdown human-readable; Phase 6 QA + Phase 7 retrospective consume programmatically_
- _Cumulative TTS spend tracker with hard abort at $30 ceiling (`tts-spend.json`; `TTS_BUDGET_OVERRIDE=1` for explicit override)_
- _ElevenLabs `previous_text` / `next_text` context-priming LOCKED ENABLED for same-scene adjacent Dash cues (PROMOTED from "Deferred to Implementation")_
- _Engine model version pins recorded in PHASE-0-EXIT.md (PROMOTED from "Deferred")_
- _Sentinel-file gating between units (`cadence-consistency-signoff.txt` → Unit 2.4; `phase-1-reconciliation-signoff.txt` → Unit 2.8)_
- _Per-cue fade-in/fade-out shape overrides (default 30ms/30ms; payoff 1950 = 5ms in / 30ms out; phrasing 2790 = 30ms in / 50ms out + qsin curve; scream 2400 = 0ms in / 30ms out)_
- _Scream-attack preservation: SKIP `silenceremove` entirely for cue 2400 (preserve full attack envelope)_
- _Audio lead-frames hint on AudioAsset (Phase 4 places audio 1-2 frames before visual sync target for perceptual A/V sync; payoff 1950 = 2 frames; scream 2400 = 1 frame)_
- _"Phrasing." cue expectedFrames RAISED 12 → 27 frames (Sterling-CODED deliberate delivery is ~0.9s not 0.4s); drift tolerance ±20%_
- _Three per-engine VOICE_DIRECTION guard variants codified inline at each engine client's API call site (per Phase 0 Unit 0.2 deepening; Phase 2 lifts to production-script)_
- _Linear (not exponential) backoff per UMB precedent: 5s/10s/15s + jitter; max 30s elapsed; `INTER_CALL_DELAY_MS = 2000` between successful cues_
- _CLI argv via `node:util.parseArgs` strict mode replaces hand-rolled parser_
- _"UMB v3 audio processing pipeline" pattern reference REMOVED — hallucinated (UMB has NO post-processing pipeline; Phase 2's FFmpeg work is NEW for BURNED)_
- _Engine billing math correction (216 words ≈ 1300 chars not 1000; ~$0.39/run × 5 iterations ≈ $2 total under $30 ceiling)_

_**Cross-phase dependencies surfaced by Phase 2 deepening** (Phases 1/3/4/5 must absorb during their own deepening passes):_
- _**Phase 1 follow-up amendments (flagged not triggered):** Add 7 optional fields to `Line` type (`expectedFrames` / `cueType` / `driftToleranceOverride` / `fadeInMs` / `fadeOutMs` / `skipSilenceremove` / `leadFramesHint` / `contextPrimingPrevious` / `contextPrimingNext`); per-cue overrides per Phase 2 Unit 2.1 §Step 4 table; frame numbering canonicalization to absolute (Phase 1's S05/S06 table mixes scene-relative); beat encoding canonical format `{{BEAT_NNNMS}}` marker tokens (text-edit-robust; replaces fragile afterWord index)_
- _**Phase 0 follow-up amendment (flagged not triggered):** PHASE-0-EXIT.md template extension — add `Model ID:` field under §Voice Cast Lock; add per-voice-cell voice ID fields (Sable/Janet/Vera) when those are the locked cold-open speakers_
- _**Phase 4 deepening must absorb:** voice union `'dash'|'sable'|'janet'|'vera'` (NOT `'cold-open-speaker'|'dash-scream'`); `<Sequence from={asset.startFrame - leadFramesHint}><Audio src={staticFile(asset.staticPath)} /></Sequence>` pattern (NOT `<Audio from>`); `leadFramesHint` consumption per cue; `<OffthreadVideo muted />` for S05 gameplay clip_
- _**Phase 5 deepening must absorb:** ship `gameplay.mp4` AUDIO-STRIPPED (`ffmpeg -an`) for belt-and-suspenders with Phase 4's `muted` prop (Phase 1 deepening's `gameplay-markers.json` contract still governs S05 scream cue alignment)_

_**Locked decisions during Phase 0 deepening pass:**_
- _ADR #6 refined: `@remotion/lottie` install ON-DEMAND only (cut from Unit 0.1 scaffold; Unit 0.5 spike decides necessity per YAGNI)_
- _Roadmap §5.2 rewritten: acceptance threshold is **register-recognition** (Sterling-CODED cluster terms + joint-pass + ±10 MUSHRA vs non-Benjamin reference), NOT actor-identity confusion (previous framing contradicted ADR #13)_
- _`BurnedDisplay` = Clash Display (variable woff2 already in BURNED at `/public/fonts/`, weight 700; no new font face forked for trailer)_
- _Archer-grammar transition primary = classification-stamp slap (continuity with DramaOverlay stamp-reveal motion grammar); iris wipe = documented fallback; kinetic typography = constrained to goofy-stat overlays only (the AI-trailer cliché, NOT for scene-to-scene)_
- _R15 chrome placement minimum-spec: bottom-third + BURNED orange/teal (`--paper-signal-orange` / `--paper-ink`) + Clash Display_
- _Unit ordering: 0.6 before 0.3 (R5 outcome filters R14 candidate pool — brainstorm's stated resolution order now operationally enforced)_
- _Vera→Dash timbre coherence bug fixed (the screamer is Dash; the addressee is Vera)_
- _Path B = Instant Voice Cloning only (Professional eliminated; removes 30-min recording schedule dependency)_
- _Path D = Sub-phase 0a deliverable (not in-flight ladder step); Brainstorm-Restructure terminal with three honest options (synthetic-tinged Dash / non-Dash briefer / abandon)_
- _PHASE-0-EXIT.md template specified at plan time so Phase 1 consumes without back-reading 5 eval files_
- _VOICE_DIRECTION guards = per-engine variants (ElevenLabs bracket-tag-only / Gemini section-marker / OpenAI separate-parameter); generalized from UMB's Gemini-only original_
- _ElevenLabs steering surface corrected: NOT long-form natural-language; uses numeric `voice_settings` + sparse bracket tags + Voice Design prompt. cadence-spec.md gets translated into three per-engine adapter files in Step 1.5_
- _Pricing math: real engine ceiling ~$24 (ElevenLabs $22 + Gemini ~$1 + OpenAI ~$1), not $37; $50 envelope retained as safety margin_
- _WebMUSHRA hosting: Cloudflare Pages subpath default ($0, permanent URL, survives laptop-asleep)_

_**Locked decisions during Phase 3 deepening pass (2026-05-17, this commit):**_
- _**HYBRID architecture (NEW)** — Path A (Remotion imports BURNED React components) formally REJECTED for 3 technical reasons (CSS module bundler diff / `window.matchMedia` absent / GSAP ScrollTrigger needs real-scroll vs Remotion's time-driven model) + 1 empirical reason (UMB has zero cross-package imports). Path C (raw SVG reimplementation) rejected on §2.2 quality-bar grounds. **Path B HYBRID locked**: set-dressing PNGs via staticFile through Phase 0 ADR #8; React chrome vocabulary (Stamp + Crest + RedactBar + ClassificationBanner + DossierPage + .module.css peers — 10 files) COPIED into `videos/trailer/src/components/burned-vocabulary/` at Phase 3 Unit 3.0 entry; `diff -r` CI catch via `pnpm verify:vocab-sync`_
- _**Public-directory architecture (NEW ADR #15)** — All Phase 3 NEW trailer-only assets land in `public/trailer/...` inside BURNED's existing `public/`. Single `setPublicDir('../../public')` (Phase 0 ADR #8) reaches both BURNED game assets via `staticFile('assets/...')` and trailer-only via `staticFile('trailer/...')`. `videos/trailer/public/` reserved for sample-eval artifacts (Remotion doesn't render from there). Resolves the silent-404 collision the pre-deepening plan would have hit_
- _**NEW Unit 3.0 — BURNED HTP Vocabulary Vendoring** (`vendor-burned-vocab.ts` + `verify-vocab-sync.ts` scripts; vendored at Phase 3 entry, CI-gated for drift)_
- _**R15 #4 triple-drift fixed** — Copy "AGENT-BUILT, ARCHER-GRADE" → "OPERATION STATUS: FIELD-READY" (Phase 1 Unit 1.9 lock); frame 2800 → 2820; filename `subhead-4-agent-built.svg` → `subhead-4-field-ready-{frame,text}.svg`. Downstream Phase 4 line 1880 sync required during Phase 4 deepening_
- _**Card-roster table REPLACED** — 9 hallucinated filenames (`vera-aubrey`, `sable-vance`, `janet-mallory`, `dolores-grieves`, `otto-...`, `counter`, `skip`, `defuse`, `steal-2`, `shuffle`, etc.) ALL absent on disk. Replaced with verified 17-webp Glob output: 6 operative portraits (`dash-barlowe`, `vera-khan`, `sable-ashworth`, `janet-broadside`, `neal-proctor`, `agent-x`) + 11 action cards using BURNED's rethemed names. NO Otto card art (roster-only per spec §1); NO Dolores card art (she's on Intercepted card per memory). S03 roster reveal = 6 card-art + Otto-aside chrome (NOT "all 7" as pre-deepening claimed) matching Phase 1 narration "Seven on the roster, six in the deck, one in the basement."_
- _**R15 chrome SPLIT-LAYER architecture** — each R15 instance produces 2 SVG files (`-frame.svg` + `-text.svg`); Phase 4 composes with `transform-origin: center` for Phase 1 Unit 1.4 stamp-slap motion. Monolithic SVG with baked `transform="rotate()"` would break the overshoot animation_
- _**R15 chrome color tokens** — `--color-ochre-9` (#947226), `--color-burned-fire` (**#be2e27** — NOT `#c63b1e` as pre-deepening had). SVGs consume via `currentColor` + Phase 4-applied inline style OR inlined `<style>` block. CVD probe script (`scripts/probe-r15-chrome-cvd.ts`) verifies both pairs clear deuter/prot/trit at 0.10 oklab floor per insight 051_
- _**HTP capture positive-completion gate** replaces 80ms timing heuristic — `page.waitForFunction(() => [...querySelectorAll('[data-reveal]')].every(el => getComputedStyle(el).opacity === '1'))` is the primary gate; `ScrollTrigger.getAll().forEach(progress(1))` fallback if useScrollReveal exposes window globals in DEV. UMB's 80ms-per-200px-scroll is 20× faster than BURNED's 900ms GSAP tween duration; pre-deepening would have produced partial-opacity captures_
- _**HTP capture URL: production primary** (`https://burned-cxa.pages.dev/howtoplay` — no `.html`, Pages strips per TODO landmine); localhost fallback for script development. Phase 0 explicitly deferred this to Phase 3 post-deploy-migration_
- _**HTP capture DPR=1** (was DPR=2). UMB precedent + 4× source decode cost reduction. Phase 6 renders with `--scale=2` for output-side crispness_
- _**Playwright package: `@playwright/test`** (NOT bare `'playwright'`). BURNED root has `@playwright/test ^1.59.1` devDep; UMB precedent matches; scripts run from BURNED root cwd_
- _**Imagen budget consolidation** — Original 4 escalation paths (cold-open <$5, crest <$1, mahogany unbudgeted, logo polish <$2) summed >$5 cap. Post-inventory: mahogany (existing `arena/mahogany-horizontal.png`), crest (existing `howtoplay/pendleton-crest.png` + inline SVG in Crest.tsx), logo polish (existing `howtoplay/operations-manual-plate.png`) all CUT — Imagen budget consumed only by operative-card-frame template (<$5 cap retained). Running spend tracker at `imagen-spend.md` with hard abort at $5 + `IMAGEN_BUDGET_OVERRIDE=1` explicit override_
- _**Imagen prompt structure** mandatory per insight 050 — fractional layout directive + continuity prescription + emotional payload + Archer-character anchor + style block + negative suppressors. Insight 018 stop-gate codified inline (4-iter same-failure → re-architect via remove/recontextualize/stronger-IP-ref/minimum-viable). UMB asset-prompts.ts `--only` flag + `#FF00FF` chroma-key extraction pattern adopted for clean transparency_
- _**Hex codes in Imagen prompts RESOLVED** — Pre-deepening plan + TODO.md landmine said "DO NOT reference hex codes." Visual inspection of shipped assets (pendleton-crest, operations-manual-plate, blotter, mahogany) shows NO bake-in. Working recipe: hex codes OK IF explicit "NO additional text NO words NO numbers NO hex codes NO color codes" negatives at end (BURNED's `generate-htp-assets.ts` + `generate-briefing-assets.ts` both use this pattern + shipped clean). TODO landmine reword: see new landmine entry below_
- _**Music source pool (per Phase 1 Unit 1.7 deepening)** — Artlist Pro / Epidemic Sound Pro $199-204/yr minimum (Musicbed dropped, Udio dropped); Suno Pro $10/mo EXPECTED fallback. Audition pool 20-30 per platform (was 10-15). Pre-execution account verification gate at Unit 3.5 Step 0; license rights-trail (PDF for Path A, billing screenshot + DDEX disclosure for Path B); encode script gated on `existsSync('music-license.pdf')`_
- _**CaseBanner.tsx GHOST REFERENCE fixed** — Phase 3 lines 836-838 cited non-existent `src/client/board/CaseBanner.tsx`. Replaced with `GameTable.tsx:67-72` inline JSX per Phase 1 Unit 1.10 explicit directive. CASE BANNER + COMMS ticker reference renders via Playwright crop of BURNED live components for Phase 4 visual-diff_
- _**Phase 1 Unit 1.10 depth-plane add ABSORBED** — Phase 1 deepening added foreground depth-plane element (Option A brass nameplate / B manila folders stack / C doorframe vignette) with explicit "add to Phase 3 unit 3.3 briefing-room-assets shot list." Phase 3 had missed; deepening adds as Unit 3.3 Step 7 (default Option A = brass nameplate "M. PENDLETON / BUREAU CHIEF")_
- _**Asset tier taxonomy NEW** (HERO / TEXTURE / CHROME) — added to Critical Constraints + manifest entry field. Drives Phase 4 composition priority._
- _**Briggsy-eyeball gates** at exit of Units 3.1, 3.3, 3.4, 3.6 (4 novel-visual units). Fluency questions (NOT property checks) per insight 050. Phase 4 import gated on `briggsy-review-3.N.signoff` sentinel file presence_
- _**Cascade-ring-layout.json** ships at `videos/trailer/src/lib/cascade-ring-layout.json` — per-card ring position (angle, radius, z-order) + 2-frame entry stagger per Phase 1 Unit 1.5 lock. Codifies "sequential revelation, NOT layered-simultaneous" so Phase 4 can't accidentally render the AI-slop shape_
- _**Stat captions resolved**: pure React text (Clash Display 700) on semi-transparent classification-bar backdrop, composed inline by Phase 4. NO Phase 3 asset deliverable for stat captions_
- _**Visual-manifest SIMPLIFIED to hand-edited** (~25 entries). Pre-deepening codegen + .meta.json sidecar CUT (no churn driver for static visuals; sidecars never materialized). `safeSquareRole` becomes REQUIRED field per-entry. Phase 0 ships empty stub `VISUAL_ASSETS: readonly VisualAsset[] = [] as const` mirroring Phase 2's audio-manifest stub pattern_
- _**PHASE-3-EXIT.md** template — single document Phase 4 reads for HTP outcome, capture method, card-roster assignments, R15 filenames+frames, music-bed track+duration+license-path, briefing-room inventory, Imagen spend actual. Mirrors Phase 0/1/2 exit-document pattern_
- _**Per-unit eval markdowns CONSOLIDATED** — 4 per-unit MDs (htp-capture, briefing-room-assets, r15-chrome, title-sequence) merged into single `asset-inventory.md`. music-audition-log.md + card-curation.md + music-license.pdf kept standalone_
- _**Safe-square composite proofs NEW** (Unit 3.7 Step 4) — per-asset-family PNG at 1920×1080 with 1080×1080 center-square guide overlay. Critical for R15 stamp #3 (1200×280 at -3° rotation, mobile-crop risk). Briggsy verifies critical text inside center before Phase 4 imports_

_**Cross-phase dependencies surfaced by Phase 3 deepening** (Phase 4 must absorb during its own deepening pass):_
- _**Phase 4 imports BURNED vocabulary from `./components/burned-vocabulary/`** (NOT `../../src/client/howtoplay/components/` — Path B hybrid; Path A formally rejected). Token-import strategy decision (Option A vendor / B path-import / C shim per Unit 3.0 README) deferred to Phase 4 deepening_
- _**Phase 4 `<Img>` + `<OffthreadVideo>` from `'remotion'` core** (NOT `@remotion/media` — only `<Audio>` migrated to @remotion/media per Phase 0 ADR #5)_
- _**Phase 4 staticFile paths**: `staticFile('trailer/r15-chrome/stamp-1-frame.svg')` for Phase 3 NEW assets; `staticFile('assets/{cards,arena,roster,howtoplay}/...')` for BURNED existing assets (per ADR #8 + ADR #15)_
- _**Phase 4 R15 split-layer composition**: `<AbsoluteFill style={{ transformOrigin: 'center', transform: ` rotate(${tilt}deg) ${scaleSlap(frame)}` }}>` wrapping two `<Img>` (frame + text) per stamp. Phase 4 line 1880 references the OLD R15 #4 filename `subhead-4-agent-built.svg` — must update to `subhead-4-field-ready-frame.svg` + `subhead-4-field-ready-text.svg` during Phase 4 deepening_
- _**Phase 4 R15 #4 frame**: 2820 (was 2800)_
- _**Phase 4 cascade halo composition**: import `cascade-ring-layout.json` for per-card geometry + entry stagger; CANNOT compose layered-simultaneous_
- _**Phase 4 stat captions**: pure React text in Clash Display 700 with semi-transparent classification-bar backdrop; NO Phase 3 asset to import_
- _**Phase 4 Otto S03 handling**: 6 card-art operatives slide in + Otto-aside chrome (REDACTED placeholder / `arena/portrait-otto.png` with classification-bar / typographic "BASEMENT" reference — Phase 4 picks). NOT 7 operatives_
- _**Phase 4 trace-video fallback**: output is `.webm` (Playwright recordVideo default); Phase 4 OffthreadVideo decodes; Phase 6 may optionally transcode to `.mp4`_
- _**Phase 4 SPIKE NEEDED at entry**: variable woff2 `weight: '200 700'` syntax with `@remotion/fonts.loadFont()`. Framework-docs research found Remotion docs only demonstrate single-weight or per-weight-file loading; variable-range syntax unresolved. Either resolves at spike OR Phase 4 splits the 3 variable woff2 into per-weight static subsets_
- _**Phase 4 imports `useFonts()` BEFORE rendering ANY scene** to ensure JetBrains Mono + Clash Display load before SVG text renders in MP4 export_
- _**Phase 4 imports vendored vocabulary CSS modules**: Phase 4 entry decision per Unit 3.0 README — vendor token CSS files (Option A) OR path-import from BURNED (Option B) OR ship fixed-value shim (Option C)_

_**Locked decisions during Phase 4 deepening pass (2026-05-17, this commit):**_
- _**TransitionSeries REMOVED across 15+ sections** — bare `<Series>` of `<Series.Sequence>` for ALL scene boundaries; NO composition-level `<TransitionSeries>`; UMB v3 `TrailerV3.tsx:28-56` precedent confirmed via grep (8-of-10 agents convergent finding); R3 = HARD CUT after 1.0s payoff hold per Phase 1 deepening, NOT cross-dissolve; `CROSS_DISSOLVE_DURATION_FRAMES` removed from timing.ts_
- _**ADR #16 NEW — Composition-level audio placement** — `{AUDIO_ASSETS.map(asset => <Sequence from={asset.startFrame - (asset.leadFramesHint ?? 0)} durationInFrames={asset.actualFrames}><Audio src={staticFile(asset.staticPath)} /></Sequence>)}` in TrailerComposition.tsx; scenes pure visual; matches UMB v3 `TrailerV3.tsx:59-63` precedent_
- _**ADR #17 NEW — `<Audio>` from `@remotion/media` ONLY** + ESLint `no-restricted-imports` rule blocking `Audio` from `'remotion'` core; legacy core `<Audio>` = `<Html5Audio>` wrapper with different rendering semantics; mixed backends cause sample-rate drift over 95s_
- _**ADR #18 NEW (placeholder) — Font load strategy pending Unit 4.0 spike outcome** — variable woff2 `weight: '200 700'` syntax with `@remotion/fonts.loadFont()` UNRESOLVED in Remotion 4.0.x docs; spike at Phase 4 entry resolves PASS (3 variable files) or FAIL (Phase 3 per-weight pyftsubset escalation); PHASE-4-FONT-SPIKE.md documents verdict_
- _**NEW Unit 4.0 — Font Load Spike** (BEFORE Unit 4.1; time-box 60 min) per amendment MA-7_
- _**NEW Unit 4.0a — UMB v3 Component Triage** (read existing 12 UMB components BEFORE inventing Phase 4 components) per insight 052 + amendment NN-4; outputs `umb-v3-component-triage.md` deciding CLONE-AND-ADAPT / TAKE-AS-INSPIRATION / SKIP per UMB component_
- _**S04TailFadeToBlack scene-internal overlay** on S04 tail frames 2025-2040 (per amendment MA-1 + adversarial Finding 3) masks the briefing-room→BURNED-board palette jump that pure hard cut can't (music-bed 0.5dB dip insufficient)_
- _**R15 split-layer architecture** (per amendment MA-5) — each R15 = 2 SVG files (frame.svg + text.svg) with outer `transform-origin: center` + rotate/scale wrapper; R15Stamp.tsx API takes `{frameSvg, textSvg, anchor, offsetPx, tiltDeg, landFrame, variant}` for both standard + payoff cases_
- _**R15 #4 filename + frame drift fixed** (per amendment MA-6) — `subhead-4-field-ready-{frame,text}.svg` at absolute frame 2820 (was `subhead-4-agent-built.svg` at 2800)_
- _**Stamp slap shape direction INVERTED in plan, corrected** (per amendment MA-8) — `scale(0.95) → scale(1.04) overshoot → scale(1.0) settle` per Phase 1 lock; plan had `1.4 → 0.95 → 1.0` (wrong direction, started bigger)_
- _**Single curve registry at `src/lib/animations.ts`** — 3 emil easings (EASE_OUT (0.16,1,0.3,1), EASE_IN_OUT, EASE_DRAWER) + 4 named springs (ARCHER_STAMP_SPRING, PAYOFF_SPRING, LOGO_SPRING_COLD, LOGO_SPRING_CLOSING) + `archerStampSlap()` + `statCaptionEnvelope()` helpers; NO inline curves in scene files (per amendment MA-8 + scope-guardian)_
- _**Stat caption typography** Clash Display 700 with semi-transparent classification-bar backdrop per Phase 3 contract #13 (NOT General Sans 600); asymmetric 6/30+/12 frame envelope per Phase 1 lock (NOT symmetric 5/(end)/15); decay-to-30%-chrome at side-band-right per design-lens (NOT fade to 0)_
- _**S03 roster cap: 6 operatives** (Phase 4 line 1077 had "7 portraits" — corrected to 6 + Otto-aside)_
- _**S03 Otto-aside: Typographic BASEMENT** (per Fork 2) — lower-right JetBrains Mono 500 18pt ochre-3 "// OPERATIVE 07: BASEMENT — DO NOT ASK"; NO Phase 3 asset dependency; matches Phase 1 narration "Seven on the roster, six in the deck, one in the basement. Don't ask."_
- _**Token-import strategy: Option C — fixed-value shim** (per Fork 3) — `videos/trailer/src/lib/tokens.css` clones BURNED `primitives.css` subset; isolated-package architecture preserved (ADR #2); NO cross-package CSS import_
- _**cascade-ring-layout.json consumption** (per amendment MA-10) — CardArtHalo imports per-card geometry + entry stagger from JSON; NO inline Math.cos/sin; right-edge-only at 40% chrome opacity per design-lens (NOT full 360° at 100%)_
- _**Sequential revelation enforcement in S04** per Phase 1 anti-pattern guard — no frame except 1950 payoff has >2 elements at full visual weight; HTP hero drops to 50% opacity at payoff stamp land (focal hand-off per design-lens); halo + stats decay to 30% chrome (NOT fade to 0)_
- _**Component reductions** (per amendment SA-5 + scope-guardian) — INLINED: PendletonCrest (use existing BURNED `assets/howtoplay/pendleton-crest.png` directly or vendored Crest), OperativeRosterReveal (single-use 16-line JSX in S03), StackedPayoffStamp (use `R15Stamp variant="payoff"` directly). CUT: DeckOf120 (invented 12×10 grid not in Phase 1 BEAT-SHEET; Phase 1 narration "Fourteen thousand pages. Six sticky notes." not "120 cards"). De-dup: IrisWipe single source in transitions/IrisWipe.tsx (S06 imports; NO inline duplicate). Optional vendor: FadeTransition.tsx from UMB v3 for hard-cut polish_
- _**ADR #15 staticFile path corrections** across 12+ callsites (per amendment MA-4) — `assets/...` → `trailer/...` for Phase 3 NEW assets (briefing-room SVGs, R15 chrome, title-sequence, htp-fullpage, gameplay.mp4, music-bed); subtle: `mahogany-desk.png` → `assets/arena/mahogany-horizontal.png` (existing BURNED; NOT briefing-room/), `pendleton-crest.svg` → `assets/howtoplay/pendleton-crest.png` (existing BURNED; .png NOT .svg)_
- _**`<OffthreadVideo muted />`** on S05 + Sequence-wrap durationInFrames=540 to catch Phase 5 duration drift (per amendment MA-3)_
- _**Phase 5 handoff contract** with `pnpm verify:gameplay-clip` ffprobe gate (540 frames @ 30fps / 1920×1080 / no audio); placeholder is SEPARATE FILE `gameplay-placeholder.mp4` not overwrite (per amendment SA-6); build-time existsSync switch; both .gitignored_
- _**Output renamed `out/trailer-scene-build.mp4`** per amendment SA-1 (drops studio-preview-vs-production process theater; identical encoding to Phase 6 deliverable; Phase 6 acceptance = ADDITIONAL different tests, NOT stricter pass rate)_
- _**Per-scene `<Composition>` `Preview_` prefix** per amendment SA-4 + positional CLI `pnpm render -- src/Root.tsx Preview_… out/...` (NOT `--composition=` flag)_
- _**Fast-iteration `Preview_S04Peak` composition** (frames 600-990 only; ~30s render vs ~2 min full S04) per amendment SA-2 — enables emil-tuning of payoff window without re-rendering buildup_
- _**Briggsy-eye sentinel-file gating** `briggsy-review-4.N.signoff` per scene; Unit 4.10 entry gated; per insight 050 (agent verification systematically misses perceptual continuities) + amendment NN-1_
- _**Structured 3-branch §2 escalation procedure** (value-tunable → Phase 4 scene unit reopen / composition-structural → Phase 1 Unit 1.5 reopen / scene-existence → brainstorm reopen) per amendment SA-3; pre-iteration calibration; vibe-quality feedback triggers motion-shape spec FIRST per insight 044_
- _**`tests/scene-timing-shape.spec.ts` Playwright spec** with fault-injection canary (cascade + closing per-frame opacity/transform sampling; mirrors BURNED's drama-beat-timing.spec.ts pattern) per amendments NN-2/NN-3 + insight 049_
- _**Music-bed silence-beat depth** 0.08 at frame 1995-2000 per amendment SA-8 (was 0.30; 0.30 dilutes R3 payoff impact per emil)_
- _**Asymmetric logo springs** S01 LOGO_SPRING_COLD (snappy mass:0.3 damping:10 stiffness:240) vs S06 LOGO_SPRING_CLOSING (settled mass:0.5 damping:14 stiffness:180) per amendment SA-9_
- _**CommsTicker hold-during-VO behavior** — `holdDuringFrames: Array<[start, end]>` prop freezes ticker rotation during Dash VO windows (rotating ticker pulls eye per design-lens)_
- _**CI gates added by Phase 4 deepening**: `pnpm verify:no-transition-series` (ADR #11 regression guard) / `pnpm verify:trailer-paths` (ADR #15 regression guard) / `pnpm verify:gameplay-clip` (Phase 5 handoff ffprobe gate) / `pnpm test:scene-timing-shape` (motion-shape Playwright spec)_
- _**Phase 4 → Phase 3 asset escalation procedure** (per amendment NN-7 + insight 018 generalization) — if Phase 3 asset fails §2 in MP4 export, emit `phase-3-asset-escalation-<asset>.md`; Phase 3 regenerates; Phase 4 does NOT patch in Remotion_
- _**Appendix C prints actual Phase 1/2/3 exported TS shapes** per amendment NN-5 + insight 029 (no prose-quoting field names; print AudioAsset / CascadeRingLayout / HtpCaptureMetadata / timing.ts constants)_

_**Cross-phase dependencies surfaced by Phase 4 deepening** (Phase 5 must absorb during its own deepening pass):_
- _**Phase 5 ships `public/trailer/gameplay.mp4`** per ADR #15 (NOT `videos/trailer/public/gameplay.mp4`; NOT `public/gameplay.mp4`). **NB: Phase 5 plan currently writes to `videos/trailer/public/gameplay.mp4` (8+ refs grep-verified prior session); MUST be updated to `public/trailer/gameplay.mp4` during Phase 5 deepening per document-review amendment TIER 1 #3 (feasibility conf 0.95). The pre-deepening path is unreachable to Phase 0 ADR #8's `setPublicDir('../../public')` — if Phase 5 ships there, master trailer ships without real gameplay.**_
- _**Phase 5 ships gameplay.mp4 AUDIO-STRIPPED** (`ffmpeg -an`) per amendment MA-3; Phase 4's `<OffthreadVideo muted />` is belt-and-suspenders. Phase 5 deepening must lock this contract_
- _**Phase 5 atomic swap pattern**: write `gameplay.mp4.new` → run `pnpm verify:gameplay-clip` ffprobe gate → if PASS `mv` to `gameplay.mp4`; if FAIL re-encode. Three failure modes Phase 5 must own: duration drift (must be exactly 540 frames @ 30fps), audio not stripped, aspect mismatch (must be 1920×1080)_
- _**Phase 5 takes ownership of placeholder generation script** at `scripts/generate-placeholder-gameplay.ts` — Phase 4 Unit 4.6 Step 2 specifies the format (loops single PNG via ffmpeg, audio stripped); Phase 5 may extend or replace as part of its harness work_
- _**Phase 5 first-frame luminance requirement** (per document-review amendment TIER 1 #5; adversarial conf 0.88): the gameplay clip's frame 0 should ideally be ≤30% mean luminance (YAVG≤76.5) — if brighter, Phase 4's MANDATORY S05HeadFadeFromBlack overlay carries the chapter-break fade. `pnpm verify:gameplay-clip` logs the YAVG for visibility; Phase 5 doesn't HAVE to deliver a dark first frame, but if the clip is bright, document the dependency on the head-fade overlay in Phase 5's exit doc so Phase 6 acceptance knows what's masking what._

_**Cross-phase dependencies Phase 3 must absorb** (deferred re-deepening if Phase 3 reopens):_
- _**`public/trailer/htp-capture-metadata.json` contract-add** — Phase 4 imports `{ scrollRangePx, pageHeightPx, viewportPx, captureMode }` as TS-typed JSON; Phase 3 Unit 3.1 `capture-htp-scroll.ts` must write this sidecar alongside the PNG (per amendment SA-7 + repo-research Finding 14)_
- _**Variable woff2 FAIL-branch escalation**: if Phase 4 Unit 4.0 spike fails, Phase 3 owns running `pyftsubset --variation-instance="wght=N"` per family per weight (~15 static woff2 files total)_
- _**`cascade-ring-layout.json` schema confirmation**: Phase 4 EXPECTS `{ cards: Array<{ filename, x, y, scale, zIndex, entryStaggerFrame, anchor? }> }` per Appendix C; Phase 3 deliverable confirms or amends + Phase 4 adapts at execution_

_**Phase 4 document-review pass APPLIED 2026-05-17.** All 11 approved amendments (TIER 1 #1-2, #4-6 + TIER 2 #7-10 + TIER 3 #11) landed in `docs/plans/origin-trailer/phase-4-remotion-composite.md`. Plan grew from 3523 → ~3900 lines (the +200-400 estimate was right). Companion roadmap untouched (3 new ADRs #16/#17/#18 already landed in deepening pass). Amendment #3 (Phase 5 path drift) absorbed as a cross-phase dep into the Phase 5 must-absorb list above — Phase 5 deepening picked it up (see below)._

_**Locked decisions during Phase 5 deepening pass (2026-05-17, this commit):**_
- _**Mechanism B locked default** per water-beads rule + visual-quality ceiling — Mechanism A's WebM/VP8 ~1Mbps capture is strictly inferior to OBS native 1080p H.264 regardless of post-processing. Mechanism A retreats to **escalation path** if Mechanism B logistics fail. **Mechanism C (hybrid) CUT entirely** during deepening — produces two-source-sync problem with no Phase 4 composition lane._
- _**Mechanism A path = playtest-harness extension** (NOT parallel spike). Repo-research confirmed `scripts/playtest/` already handles multi-context Playwright with correct selectors (`input[type="text"]` + `button:has-text("Check In")` per `seat-factory.ts:160-161`), PLAYTEST_TOKEN auth, god-event subscriber, full BURNED game orchestration. Phase 5 adds `--trailer-capture` mode flag + `recordVideo` on context creation (~2-3 line additive change), NOT 50+ hours of reinvention._
- _**BURNED-draw target = clip-relative frame 160** (NOT 360). Phase 1 Unit 1.2 Step 6 line 807 lock is canonical. Pre-deepening Phase 5 had 360 throughout (lines 132, 442, 451, 508, 525, 530, 781, 808, 813, 1034) — all corrected. Frame 360 is the SCREAM cue (R5-contingent), a separate REACTION beat 200 frames / 6.67s after the draw (Sterling-CODED deadpan-late reaction, NOT simultaneous-with-draw)._
- _**Pre-trimmed contract — Phase 5 owns trim, Phase 4 consumes verbatim** (Phase 4 deepening locked this; Phase 1's earlier `gameplay-raw.mp4 + gameplay-markers.json + startFrom/endAt` contract is OBSOLETE). Phase 5 ships exactly 540-frame `public/trailer/gameplay.mp4` with BURNED-draw at clip-relative frame 160; Phase 4's `<OffthreadVideo>` consumes with no trim props._
- _**Approach III adopted as default** — deterministic deck-seeding via `pnpm dev:stack burned,extraction,...` + natural human play on top. Approach I (multiple natural takes) retained as fallback only. Approach II (engineered full sequence) still rejected. Resolves the 30s-capture-window-vs-natural-BURNED-timing problem while preserving water-beads (deck order invisible to viewers; reactions unscripted)._
- _**Atomic-swap pattern locked** — write `public/trailer/gameplay.mp4.new` → `pnpm verify:gameplay-clip` ffprobe gate → `mv` on PASS. Phase 5 consumes Phase 4's `scripts/verify-gameplay-clip.ts` (does NOT re-implement). Windows EBUSY-on-rename mitigation: close Remotion studio before swap._
- _**Single-pass frame-accurate re-encode** in Unit 5.5 — `ffmpeg -i SOURCE -ss HEAD_SECONDS -frames:v 540 -vf "fps=30,scale=...,crop=..." -c:v libx264 -crf 18 -preset slow -map 0:v:0 -an -movflags +faststart`. The pre-deepening two-stage `-c copy` stream-copy trim + re-encode was BROKEN (`-ss BEFORE -i + -c copy` drifts to nearest keyframe, up to 8s on default OBS GOP). `-ss AFTER -i` is decode-side seek (frame-accurate); `-frames:v 540` is count-precise (NOT `-t` which is wallclock-based and GOP-snaps); `fps=30` filter (NOT `-r 30` which only rewrites timestamps)._
- _**Audio policy = 3-layer belt-and-suspenders** (capture silent + `ffmpeg -an` + `<OffthreadVideo muted />`). All three intentional. `verify:gameplay-clip` audio-stream-absence gate fails if ANY audio stream present (including silent PCM)._
- _**Insight 035 verified RESOLVED at Unit 5.0 Step 2** — `src/client/player/SmartActionBox.module.css:136-143` shows breathe animation on `.action::after` pseudo-element; button DOM stays stable for Playwright agents. Comment at line 130 confirms. 2 of 8 review agents incorrectly flagged this as unfixed; repo-research + framework-docs + my own verification confirm shipped._
- _**NEW Unit 5.0 — Prerequisites + Contract Sync** (mirrors Phase 2 Unit 2.0 preflight pattern). Verifies: ADR #15 path discipline, insight 035 status, playtest-harness availability, dev-actions availability, deploy migration state (5 single-line uncommitted changes + 1 untracked CI workflow; deadline gate 2026-05-24 for local-dev fallback), FFmpeg ≥5.0, optional LAN setup for Mechanism B local-dev fallback (vite `--host 0.0.0.0`, wrangler `--ip 0.0.0.0`, laptop LAN IP, firewall)._
- _**Director's-eye production guidance for Mechanism B** (mandatory; design-lens 0/3 → addressed) — camera 30° to TV (NOT dead-on), warm ambient lighting (NOT overhead fluorescent), table dressing (1-2 practical objects), phones held in hand (NOT flat), faces cropped at eyeline or behind, frame-0 mid-tone-to-dark preference, mobile-safe-square awareness (TV center within x=[420, 1500]), lower 40px clean for R15 ticker, iris-anchor at frames 480-540 ±400px of (960, 540)._
- _**Take selection fluency gate** (insight 050; LOAD-BEARING) — rubric is CALIBRATION FLOOR (< 5/6 rejected); takes scoring 5/6 or 6/6 proceed to Briggsy-eye fluency check. Single open-text question: "Does this feel like a real playable game in your hands?" Fluency OVERRIDES rubric on ties. R13 acceptance at Unit 5.6 follows same fluency-gate pattern (NOT property re-check)._
- _**Trim-viability filter** at take selection — reject takes where BURNED raw frame < 160 (head-trim cannot pad backward) OR raw total < (raw_BURNED + 380) (Shot 5 reaction beat needs 12.7s post-draw content)._
- _**Session budget = 4 sessions** (1 setup + 2 capture + 1 contingency). Session 1 budgeted explicitly as setup-pass (OBS config verified, friends know how to play, Approach III seed-position N calibrated). NOT a capture session._
- _**Briggsy-sentinel files** `briggsy-review-5.4.signoff` (take selection) + `briggsy-review-5.6.signoff` (R13 acceptance) per Phase 4 git-author pattern. Wired to `pnpm verify:briggsy-sentinels`._
- _**PHASE-5-EXIT.md** template at `videos/trailer/sample-eval/gameplay-capture/PHASE-5-EXIT.md` — single document Phase 6 reads. Records: mechanism, URL, approach, friends, sessions, selected take + BURNED raw frame + head-trim, output stats + YAVG, R5 alignment, sentinel commits, Phase 6 re-render notes._
- _**Sample-eval consolidation** — 7 markdowns (mechanism-eval / shot-list / harness-build / obs-scene-config / take-selection / post-process / phase-4-rerender) → **3 markdowns** (capture-log.md / PHASE-5-PREFLIGHT.md / PHASE-5-EXIT.md). Mirrors Phase 3 deepening's asset-inventory consolidation pattern._
- _**`shot-list.ts` CUT** — TypeScript interface with 6 fields and no consumers. Shot list lives as markdown table in `capture-log.md`. If a future iteration needs typed constants, easy to add._
- _**Phase 5 owns `scripts/generate-placeholder-gameplay.ts`** (Phase 4 cross-phase dep was unclaimed). Phase 5 builds it at Unit 5.3 Step B.6 using the correct `force_original_aspect_ratio=increase` syntax (the pre-deepening Phase 4 sketch used `cover` which is INVALID ffmpeg syntax — Phase 4 follow-up amendment surfaced)._
- _**DOM selectors aligned to actual BURNED**: `input[type="text"]` (NOT `input[name="playerName"]`), `button:has-text("Check In")` (NOT `button:has-text("Join")`), `button:has-text("Cleared Hot")` (NOT `button:has-text("Start")`), URL hash or `.${styles.roomCode}` (NOT `[data-room-code]`). Per `seat-factory.ts:160-161` + `JoinScreen.tsx:228-266` + `Lobby.tsx:104-110`._
- _**Ghost refs fixed**: `src/client/board/CaseBanner.tsx` (doesn't exist) → `GameTable.tsx:67-88` inline `.caseBanner` aside (matches Phase 1 + Phase 3 deepening lock); `src/client/shared/NopeCountdownBar.tsx` → `src/client/board/NopeCountdownBar.tsx`._
- _**Production URL probe both candidates** at Unit 5.0 Step 5 — `burned.pages.dev` (Pages project name = `burned` per `deploy-burned.yml:77`) AND `burned-cxa.pages.dev` (likely canary subdomain on same project). Default to whichever responds 200._
- _**Path drift fixed**: 5 occurrences of `videos/trailer/public/gameplay.mp4` in Phase 5 + 1 in roadmap §3 row 5 (`videos/trailer/assets/gameplay.mp4`) — all corrected to `public/trailer/gameplay.mp4` per ADR #15._
- _**Recordvideo.size = viewport-size 1:1** (NOT 1920×1080 for phone contexts) — phone viewports 390×844 with recordVideo at 1920×1080 produce letterboxed black-border garbage. If Mechanism A invoked, phone-context recordings match viewport dimensions; board context uses 1920×1080 viewport + matching recordVideo size._
- _**Cross-platform atomic-rename caveat documented** — Node `fs.renameSync` is atomic on POSIX but throws EBUSY on Windows over an open file handle. Close Remotion studio before swap; documented in Unit 5.5 Step 3 + PHASE-5-EXIT.md._
- _**Insights consumed**: 021 (atomic-swap pattern), 022 (room.ts quarantine — Phase 5 scripts must not import partyserver), 026 (execFileSync maxBuffer 50MB + stdio drain), 035 (RESOLVED verification), 050 (fluency gate over property rubric)._

_**Cross-phase dependencies surfaced by Phase 5 deepening** (Phases 1/4/Roadmap/Phase 6/Phase 7 must absorb during their own deepening or re-deepening passes):_
- _**Phase 1 follow-up amendments (flagged not triggered)**: (a) Step 6 line 803-808 retire the `gameplay-raw.mp4 + gameplay-markers.json + startFrom/endAt` contract (obsoleted by Phase 4 deepening's pre-trimmed lock); replace with pre-trimmed contract language; (b) Step 6 line 815 cue table prose ambiguity ("in-game BURNED card draws on capture → Dash VO interjects") should clarify draw at clip-relative frame 160 + scream cue 200 frames later at frame 360 are SEPARATE BEATS, not simultaneous; (c) System-Wide Impact lines 2453-2467 remove `gameplay-markers.json` references; (d) overall update to match Phase 4 + Phase 5 deepening's pre-trimmed contract_
- _**Phase 4 follow-up amendment (flagged not triggered)**: Unit 4.6 Step 2 line 2708 placeholder script uses INVALID ffmpeg filter syntax `force_original_aspect_ratio=cover` — must be `increase` (only valid values are `disable|decrease|increase`). Will crash placeholder generation on first invocation. Phase 5's `scripts/generate-placeholder-gameplay.ts` (Phase 5-owned per cross-phase dep) uses the correct `increase` syntax. Phase 4 plan body's sketch needs same fix._
- _**Roadmap §3 row 5 path fix LANDED in this commit** — `videos/trailer/assets/gameplay.mp4` → `public/trailer/gameplay.mp4` per ADR #15._
- _**Phase 6 deepening must absorb**: (a) Phase 6 re-render with production encoding settings is NOT precluded by Phase 5 ship — per Phase 4 deepening amendment TIER 2 #8, Phase 6 acceptance MAY require re-render (4 concrete examples: LUFS drift / palette miss / cold-decode / mobile-safe failure); (b) Phase 6's mobile-safe-square audit verifies BURNED-draw beat within x=[420, 1500] central band; (c) PHASE-5-EXIT.md is the read-point for Phase 6 acceptance gating; (d) Phase 6 inherits the `pnpm verify:gameplay-clip` ffprobe gate as a re-validation step if it re-renders gameplay-bearing scenes; (e) Phase 6 may also surface Phase 5 take-selection reopen if R13 fluency fails at full-pipeline review_
- _**Phase 7 deepening must absorb**: (a) X-native cutdown (7-15s per roadmap §5.4) MUST preserve the BURNED-draw beat within the cutdown's safe-square band; (b) "built by autonomous agents" cold-viewer decode lives in Phase 7 metadata/copy (R15 chrome in trailer carries engineering-peer confirmation only — per Phase 1 deepening cross-phase dep)_

_**Amendments-applied summary** (one line each for quick audit):_
- _TIER 1 #1 scenePreviewStartFrame fix — Unit 4.5 Step 5 wraps S04 body in `<Sequence from={-scenePreviewStartFrame}>`; comment block documents the negative-`from` mechanism + execution-time prop-drill fallback._
- _TIER 1 #2 existsSync browser crash — Unit 4.6 Step 1 + NEW Step 1b. Scene imports `GAMEPLAY_CLIP_SOURCE` from `videos/trailer/src/lib/gameplay-clip-source.ts`; `scripts/sync-gameplay-clip.ts` writes the file via prerender/prestudio/postinstall lifecycle hook; existsSync runs OUT of the Remotion browser context._
- _TIER 1 #3 Phase 5 path drift — landed in Phase 5 cross-phase deps above (`videos/trailer/public/...` → `public/trailer/...`). Phase 5 deepening MUST absorb._
- _TIER 1 #4 R15Stamp wrapper dimensions — Unit 4.2 Step 3 R15Stamp gains REQUIRED `width` + `height` props; all 5 call sites updated; R15 SVG natural-dimensions table added per stamp (#1 800×260 / #2 960×180 / #3 1200×280 / #4 1000×220)._
- _TIER 1 #5 S05 first-frame fade — Unit 4.6 Step 1 + NEW Step 1c. `S05HeadFadeFromBlack` MANDATORY (not optional polish); component sketch added; `verify-gameplay-clip` extended with ffmpeg signalstats YAVG luminance gate; NEW `verify-s05-head-fade` grep gate locks the overlay's presence in the scene file; downstream "optional" framing in JSDoc + edge case + risks + open questions all flipped to "mandatory"; old "open question" struck through as CLOSED._
- _TIER 1 #6 Stat 1/4 collision — Unit 4.5 Step 5 GoofyStatCaption gains optional `verticalOffsetPx` prop; Stat 4 receipts-stack-metaphor lock at `verticalOffsetPx={120}` (default Option A); comment block documents both options (anchor reassignment vs vertical stack) for execution-time pick._
- _TIER 2 #7 Sentinel git-author — Unit 4.9 NEW Step 3a. `scripts/verify-briggsy-sentinels.ts` greps each `briggsy-review-4.N.signoff` git author email; CI-gates Unit 4.10 entry on `pnpm verify:briggsy-sentinels`; replaces existsSync honor-system; Critical Constraints summary + sentinel file checklist in Unit 4.10 both updated._
- _TIER 2 #8 Phase 6 acceptance honesty — Critical Constraints "Phase 4 output = Phase 6 deliverable candidate" subsection rewritten; "no re-render unless composition-level" carveout REMOVED; honest framing "Phase 6 acceptance MAY require re-render" with 4 concrete examples (LUFS drift / palette miss / cold-decode / mobile-safe failure); operational-notes summary updated._
- _TIER 2 #9 Motion-shape inference rule — Unit 4.9 Step 4 "vibe-quality feedback" workflow + Appendix B both rewritten. Spec PASS no longer asserts composition-structural; narrows to UNSAMPLED elements (cascade cards 4-17 / stat envelopes / music silence-beat / shadow) OR composition-structural. Walk unsampled first before Phase 1 Unit 1.5 reopen._
- _TIER 2 #10 Studio-vs-MP4 gap — Unit 4.9 Step 5 scoped as STUDIO-STAGE only; NEW Step 5b adds `tests/scene-timing-shape-mp4.spec.ts` (vitest + ffmpeg frame-extract + pixelmatch pixel-diff against committed expected snapshots). CI gate `pnpm test:scene-timing-shape-mp4` added._
- _TIER 3 #11 Mobile safe-square — Unit 4.4 S03 OperativeRosterReveal moves from `right: 80` to `right: 500` (cards inside x=1500 right crop). Unit 4.2 S01 R15 #1 moves from `offsetPx.x: 80` to `offsetPx.x: 500` (stamp inside x=420 left crop). API-reference example updated; Unit 4.5 archer-test R8 acceptance line acknowledges the new positions; comment blocks document the Phase-7-X-mobile-primary rationale._

_**Document-review findings DEFERRED to execution-time review** (NOT applied; kept here as the audit trail for next-time review):_
- _Tier 3 NOT-chosen: SG-04 drop verify:no-transition-series gate (kept as belt-and-suspenders), SG-07 move SafeSquareOverlay out of src/ (accepted in src/), SG-01 collapse Unit 4.0a (kept as formal triage)_
- _Adversarial: 28-amendment wholesale-apply coupling (accepted, no companion amendments.md needed), font spike pass-criterion gray-zone (Unit 4.0 execution decides), cascade-ring-layout schema contract test (Phase 3 deliverable lands first), ESLint Audio vendor-boundary (revisit at Unit 4.0a triage), ESLint flat-config vs legacy (verify at Unit 4.1 execution)_
- _Product-lens: ADR #16/#17 trajectory scope (live with ADR ledger at trailer-pipeline altitude), goal-work alignment / protected-time allocation (Briggsy manages cadence in-session), opportunity cost vs BURNED polish (Briggsy's product-call for project priorities)_
- _Design-lens: CommsTicker freeze design rationale (F-004 — execution decides), silence-beat timing walkthrough (F-005 — execution clarifies), iris-wipe + dossier-close overlap rationale (F-006 — execution validates), tokens.css hex placeholders (F-008 — fill at Unit 4.1 execution time per existing instruction), CVD compliance verification (F-009 — Briggsy color-blindness rule covers it)_
- _Feasibility: ffprobe assumed on PATH (P2 — add prereq check at Unit 4.6 execution if CI integration needed), ESLint flat-config (verify at Unit 4.1), atomic swap TOCTOU (acceptable — in-flight renders complete with whichever path they resolved at start), multi-Composition Root memory (P3 — measure at execution)_
- _Coherence: 9 minor polish items (P2/P3 — clarification gates and cross-reference adds; defer to Unit 4.0a/4.1 execution)_

_**Next session entry sequence:**_

_1. **Commit the Phase 5 deepening package** as a single commit (matches Phase 0/1/2/3/4 deepening commit pattern). Suggested commit subject: `docs(burned): Phase 5 deepening pass + roadmap §3 row 5 path fix`. Includes `phase-5-gameplay-capture.md` (deepening; 1235→~1700 lines), `roadmap.md` (§3 row 5 path fix + §11 Phase 5 deepened status), `TODO.md` (this updated state). EXCLUDES quarantined deploy-migration files (board.html / player.html / _headers / ActRemote.tsx / room.ts / deploy-burned.yml — separate deployment commit when ready)._
_2. **`/deepen-plan` on `phase-6-final-render-qa.md`.** Per `feedback-phase-plan-drafting-workflow.md`. Sequential, one phase per session. Phase 6 must absorb: (a) Phase 4's deepening amendment TIER 2 #8 — Phase 6 acceptance MAY require re-render (4 concrete examples: LUFS drift / palette miss / cold-decode / mobile-safe failure); (b) Phase 5's PHASE-5-EXIT.md as the gating read-point; (c) Phase 5's `pnpm verify:gameplay-clip` ffprobe gate as a re-validation step if Phase 6 re-renders; (d) Phase 5 take-selection reopen route if R13 fluency fails at full-pipeline review; (e) mobile-safe-square audit verifying BURNED-draw beat within x=[420, 1500]; (f) the QA report bar-raise criteria vs UMB v3 per roadmap §9 (named-operative density / §2 frame-pass rate / stacked-payoff moment). Same 8-agent deepening shape + emil-design-eng + /brief as Phases 1-5._
_3. **Sequentially after Phase 6:** Phase 7 deepening — same pattern. Then Phase 1/4 follow-up amendments (Phase 1 retire `gameplay-markers.json`; Phase 4 fix `force_original_aspect_ratio=cover` → `increase` in placeholder script). Then Briggsy reviews all deepened plans → Phase 0 execution begins._

_**Session state at end (2026-05-17 — this session):**_
- _Uncommitted changes: `docs/plans/origin-trailer/phase-5-gameplay-capture.md` (~1700 lines = deepening pass with 25 TIER 1 + 20 TIER 2 amendments + 6 structural cuts), `docs/plans/origin-trailer/roadmap.md` (§3 row 5 path fix + §11 Phase 5 deepened status), `TODO.md` (this update), plus pre-existing uncommitted deploy-migration files (board.html, player.html, public/_headers, src/client/howtoplay/acts/ActRemote.tsx, src/server/room.ts) deliberately quarantined per prior TODO landmine._
- _Scratch artifacts: `.context/compound-engineering/ce-plan/deepen/phase-5/` (if present; gitignored; no longer load-bearing — amendments applied + checked off above)._
- _All 25 TIER 1 amendments verified against TODO §1 prescriptions before applying; sequential-thinking used for synthesis ordering + emil-design-eng framework loaded for design-judgment cluster (Mechanism B director's-eye guidance, iris-anchor composition, frame-0 luminance, fluency gate calibration). 8-agent parallel review shape: best-practices / framework-docs / repo-research / adversarial / scope-guardian / coherence / feasibility / design-lens — all returned cleanly._

_Note: 5 modified files (board.html, player.html, public/\_headers, src/client/howtoplay/acts/ActRemote.tsx, src/server/room.ts) + 1 untracked file (`../../.github/workflows/deploy-burned.yml`) are an in-progress deploy migration (partykit → Cloudflare Workers, `mbriggsy.partykit.dev` → `briggsy007.workers.dev`, adding `burned-cxa.pages.dev` as allowed origin). Deliberately NOT swept into either origin-trailer commit — deserves its own deployment commit when ready._

---

## 2. Landmines

Active warnings only. Older landmines have moved to `docs/insights/` and
`CLAUDE.md`.

- **Absolute-positioned cards in `.fan` are anchored to `.piles` center,
  not `.fan` center** (commit `b274a12b`, 2026-05-14). The three discard
  layers (`.top`, `.behind1`, `.behind2`) are `position: absolute` with
  no explicit top/left, which puts their static position at the center
  of the nearest flex parent. The flex chain is `.piles` (centered) →
  `.pileSection` (centered) → `.fan` (centered) → cards. Because every
  link is centered, the cards' fixed positions are determined by
  `.piles` center, not `.fan` center. **Consequence:** changing `.fan`
  width does NOT move the cards or change which pixels get clipped at
  the `.piles overflow:hidden` boundary. The cards spill 0.827W from
  fan-center after rotation; the clip ancestor (`.piles`) must be wide
  enough to contain that spread, period. Bumping `.fan` width is a NOP
  from the user's POV. If you ever see "fan-width edit didn't change
  anything," that's why — go widen the column, not the frame. Geometry
  scratchpad lives in `DiscardFan.module.css` next to the `.fan` rule.
- **Blotter grid is 50/50 by intention** (commit `b274a12b`). Don't
  revert to 40/60 favoring COMMS without re-running the math at the
  iPad-tall-viewport 300px card-width floor. The hero discard's
  rotated peek-card bbox is ~496px wide there; 40% column = 395px
  content area = 50px clipped per side, every game. COMMS's longest
  event line (~38 chars ≈ 270-300px) fits easily at 50%.
- **`// CAPS LETTERSPACED` is non-interactive chrome vocabulary**
  (commit `96744440`, 2026-05-14). Codebase-wide pattern: `//
  Deploy Operative`, `// Briefing`, `// Operation`, `// Standing By`,
  `// CHANNEL OPEN` — all static labels. Putting `// LABEL` on a
  tappable element camouflages affordance: users read it as another
  label, not a link. First Operations Manual ship used `// OPERATIONS
  MANUAL` and Briggsy flagged it as visually indistinguishable from
  the surrounding chrome. Fix was to drop the `//` prefix and replace
  with a trailing `→` arrow (the brief's PlayCTA established that
  vocabulary already). When adding a new interactive element to a
  classified-chrome surface, reach for `→` / `↗` / a bracket-shape
  container — NOT the `//` prefix.
- **Touch-device affordance needs its own gate** (commit `96744440`).
  `@media (hover: hover) and (pointer: fine)` is the project-wide
  guard against phantom sticky-hover on touch (per `MinimalCard`,
  `joinButton`, `startButton`, `reclaimButton`, `playAgain`). Side
  effect: any hover-only affordance signal is INVISIBLE on phones.
  Pattern shipped for the Operations Manual arrow: a parallel `@media
  (hover: none) and (pointer: coarse)` rule that drives a slow
  periodic transform-keyframe attract loop on the arrow. Touch
  devices get the equivalent "alive" cue. Use this dual-gate pattern
  whenever a new tappable element relies on hover motion as its
  affordance signal — phones see neither hover nor `:active` until
  AFTER the tap, so without the touch-side attract loop the element
  reads as static.
- **HOW-TO-PLAY back/CTA return-trip pattern** (commit `96744440`,
  `src/client/howtoplay/returnToGame.ts`). The brief's "Back" link
  and bottom CTA both used `href="/"` which 404s in Vite dev (no
  root index) and lands on the wrong surface in prod (Pages
  `_redirects` sends `/` → `/board.html`, wrong for phone readers
  who came from `/player.html?room=X` and would lose room context).
  Fix: `returnToGame` onClick handler. If `window.history.length > 1`
  → `history.back()` (same-tab nav case). Else → `window.close()`
  (new-tab from `target="_blank"` case — closes brief, user lands
  back on their game tab with state intact). `e.preventDefault`
  blocks the broken href fallback; middle/right-click still follows
  href as a niche escape hatch. Any future link inside HOW-TO-PLAY
  that needs to "return to game" should use this helper, NOT a
  hardcoded href. Adding HOW-TO-PLAY entry points from other game
  surfaces is fine — the existing `target="_blank"` on those source
  links makes `window.close()` the natural return path.
- **HOW-TO-PLAY: card aspect contract** (commit `22b2d683`). Card
  source art is MIXED aspect: 11 action cards are 384×384 (1:1
  square), 6 operative cards are 269×384 (2:3 portrait). The howtoplay
  `Card` component renders at portrait 5:7 frame with
  `object-fit: contain` so every source pixel survives. Action cards
  display as a centered square with ~20% matting top + bottom;
  operatives nearly fill the frame with ~1% side letterbox. This
  matches the in-game `MinimalCard.module.css` aspect-ratio: 5/7 +
  contain pattern (line 33, 81-85). Do NOT force 1:1 with cover —
  that crops operative heads.
- **HOW-TO-PLAY: card label corners + amber color** (commit `9ef77e7d`,
  refined `f87dc09e`). The card label's bottom-corner radius is now
  `var(--card-radius-inner)` = `calc(--card-radius - --card-border-w)`
  for concentric curves with the visible inner edge. Label `border-top`
  uses the SAME `color-mix(in oklab, var(--color-ochre-9) 35%,
  transparent)` as the card's outer border — different opacity reads
  as misaligned even when geometry is correct.
- **HOW-TO-PLAY: card treatments use REAL border-width, not inset
  box-shadow** (commit `f87dc09e`). `.tx-glow` overrides
  `--card-border-w: 2px` + `border-color: var(--drama-amber)`.
  `.tx-burn` overrides `--card-border-w: 3px` (border-color already
  burn-fire). DO NOT add `box-shadow: ... inset` ring layers back —
  inset shadows paint BELOW content per spec, so the label's solid
  background overpaints them at the label's vertical extent, making
  the colored ring visibly shrink AT the label (reads as "label is
  wider than the rest of the card"). Real borders shrink the content
  area so the label fits inside the ring automatically; the existing
  `--card-radius-inner` calc resolves concentric corners.
- **HOW-TO-PLAY: card-width tokens live on `.desk`, NOT on `.card`**
  (commit `f87dc09e`). `--card-w-sm/md/lg` are defined in
  `styles.css` on `.desk` as defaults. Defining them on `.card` (the
  prior location) blocks inheritance — outer scopes (e.g. ActLoop's
  `.handFan` portrait override) couldn't override the local
  declaration. If you ever need a per-context card size, set the
  token on a parent of `.card`, NOT on `.card` itself.
- **HOW-TO-PLAY: hand-fan portrait card bump scoped to `.handFan`**
  (commit `f87dc09e`, ActLoop.module.css). On portrait orientation,
  `.handFan` overrides `--card-w-sm` to `clamp(95px, 70px + 8vw, 130px)`
  and tightens overlap to `margin-inline: -2.75rem`. Landscape uses
  the default token from `.desk`. If you add another fanned hand
  surface, scope its own token override the same way — don't bump
  the global default.
- **HOW-TO-PLAY: bottom marginalia clears the bottom aside via
  `margin-bottom: 3rem`** (commit `f87dc09e`). Each act with a
  bottom aside/summary box adds `margin-bottom: 3rem` to that
  element so the absolutely-positioned bottom-left handwritten
  Marginalia (78% opacity blue) doesn't bleed into the dark aside
  above. Marginalia's `position: absolute; bottom: 1rem` puts it in
  the same y-band as the aside's bottom edge by default. Combos uses
  `:last-of-type` because it has back-to-back asides — only the last
  one needs the clearance. If you add a new act with a bottom aside +
  bottom-left marginalia, follow the same pattern.
- **HOW-TO-PLAY: FileTab component is GONE** (commit `f87dc09e`).
  Removed across all 10 acts + component files deleted. The
  decorative folder-tab overlapped body copy on phone and didn't
  earn its keep. Don't reintroduce — if you need a visual
  section-marker on phone, design for the constrained width first.
- **HOW-TO-PLAY: vite entry registration** (commit `b48fd4fd`). The
  `howtoplay` entry is in `vite.config.ts` `rolldownOptions.input`
  alongside board/player. Don't remove it. Dev URL is
  `/howtoplay.html`; prod URL is `/howtoplay` (Cloudflare Pages strips
  `.html`).
- **HOW-TO-PLAY: Imagen prompt gotcha — hex codes WITHOUT trailing
  negatives bake in as text** (caught in title plate v1; reworded
  2026-05-17 per Phase 3 deepening repo-research). Original landmine
  said "DO NOT reference hex codes like `#94 7226` in Imagen prompts."
  Visual inspection of shipped assets (`public/assets/howtoplay/
  pendleton-crest.png` + `operations-manual-plate.png` +
  `public/assets/arena/blotter.png` + `mahogany-horizontal.png` —
  all generated by `scripts/generate-htp-assets.ts` +
  `scripts/generate-briefing-assets.ts` which BOTH use hex codes in
  prompts) shows ZERO baked hex-text. **Working recipe**: hex codes
  are OK IF every prompt ends with explicit negative suppressors —
  "absolutely NO additional text NO words NO numbers NO hex codes NO
  color codes beyond [whitelisted text if any]". The shipping
  scripts use this pattern; the outputs are clean. The original
  landmine warning was overstated. **Rule**: hex codes safe with
  negative suppressors at end; hex codes unsafe without them.
  Regenerator script: `scripts/generate-htp-assets.ts` with
  `HTP_ASSET=<filename>` env var to target one asset (filenames:
  `pendleton-crest`, `operations-manual-plate`, `desk-scene`; or
  `all` for the batch).
- **HOW-TO-PLAY: separate mono font import** (commit `b48fd4fd`). The
  page imports `src/client/howtoplay/fonts-mono-htp.css` for
  JetBrains Mono. Cannot share `src/client/shared/fonts-mono.css`
  because that one is documented board-only (per its header comment).
  If you add another mono-using surface, follow the per-surface
  font-face declaration pattern, not import-the-board's-file.
- **HOW-TO-PLAY: scroll-reveal motion ownership** (commit `b48fd4fd`).
  GSAP + ScrollTrigger registered ONCE on the howtoplay page via
  `useScrollReveal()` mounted at App root. Every `<DossierPage>` gets
  a `data-reveal` attribute and animates on enter. Reduced-motion
  branch sets `opacity: 1` immediately. Don't add another
  ScrollTrigger.register() call elsewhere on this page; the singleton
  guard handles it.
- **`detectFailedLaunch: true` is OPT-IN per call site** (commit
  `64ecda46`). `pnpm playtest:run` opts in. Tests with stubbed god (no
  events.jsonl writes) leave it off so happy-path coverage tests don't
  trip on the absence of a real game. New `'failed-launch'` is a
  legitimate `SessionOutcome` variant — handle it explicitly in any
  outcome-switching code added downstream (coverage, retention,
  reporting).
- **Viewport rotation is now per-seat** (commit `873d45e9`). With 3
  viewports configured + 3 seats, each seat gets a different shape
  (round-robin via `i % viewports.length`). Don't assume all seats
  share viewports[0] anymore. `viewportsExercised` in the session
  report now reflects the actual exercised set.
- **`createTriageLauncherDriver` exists but is NOT wired into
  `runSession`** (per `run-session.ts:200-240` operator-doc comment).
  The `/playtest-run` skill landed (commit `57872c41`) but the
  in-process triage launcher driver is still a future option — the
  current skill orchestrates triage agents from the operator's side
  via Agent tool calls per the manifest. If you ever want
  in-orchestrator triage spawn, wire via `opts.waitForTriageMarker`.
- **`nopeWindowMs` is now optional end-to-end** (commit `b29ba31c`).
  Series configs (2p/3p/5p/8p/10p) and `default-config.json` no longer
  carry the field. Production tier defaults from
  `src/shared/constants.ts:NOPE_WINDOW_MS` (10s flat) take over via
  engine fallthrough at `engine.ts:1332`. `calibration.json` retains an
  explicit override (10s) for legitimate calibration deviation. Adding
  the field back to a series config means "this run deviates from
  production" — make sure that's deliberate.
- **Coverage threshold split: per-run vs series** (commit `0a174691`).
  `coverageThreshold` config field now means PER-RUN gate (default 15).
  `CoverageReport.seriesTarget` (default 50) is informational only —
  surfaced in coverage.md as cumulative across-runs context. Don't
  conflate the two; calibration.json's `coverageThreshold: 1` overrides
  the per-run gate (which is what calibration always meant).
- **Triage issue summaries are now tracked in git** (commit `37150919`).
  `runs/*/issues/*.md` and `runs/*/issues/INDEX.md` are
  gitignore-allowlisted; the rest of each run dir (logs, screenshots,
  events.jsonl, server/, scrubbed/, etc.) stays gitignored. Closure
  records survive `pnpm playtest:purge`. Adding a new gitignored file
  type under `runs/` requires no allowlist change; un-ignoring a new
  artifact type does.
- **PlayerAlert observer toast persistence semantic** (commit `3c82c572`).
  Card-played observer toast now persists through the nope window
  (`persistUntil: ['nope-window-resolved']`) for ALL non-favor cards.
  Favor stays on `persistUntil: ['favor-given']` (longer window). The
  observer X dismiss button now appears on every persistent toast,
  not just the favor case. Filtered cards (extraction / burn-the-files
  / falsify-intel / combos) still skip the toast — DramaOverlay or
  StealReport own those moments.
- **NopeCountdownBar lives INSIDE the case-banner aside, in a
  fixed-height `.nopeSlot`** (commits `4e4431c9` original + 2026-05-11
  slot-reserve follow-up). The dial is wrapped in `<div
  className={styles.nopeSlot}>` whose `height: var(--size-nope-slot)`
  reserves the dial's column contribution whether the dial is mounted
  or not. This prevents the case-banner's `justify-content: center`
  from shifting the static briefing chunk by ~70 px on
  mount/unmount (the original "~10 px acceptable" call from 4e4431c9
  was an eyeball estimate — real measured shift was 70 px). If the
  NopeCountdownBar wrapper's natural height changes (new content,
  font-scale tweak, dial geometry change), keep `--size-nope-slot` in
  `semantic.board.css` ≥ wrapper natural max height across the
  viewport band — otherwise the slot will overflow OR collapse and
  the bounce returns.
- **StealReport + FavorReport rubber stamps removed** (commits
  `17514aae` + `09a4ae44`). The rubber-stamp visual + thunk
  choreography + `--motion-duration-stamp` token are GONE. Body text
  carries the verdict on both reports. The `--motion-ease-overshoot`
  primitive stays (zero current consumers but generic curve worth
  preserving for future spring cinematics).
- **`LobbyView.hostConnected: boolean` is REQUIRED** on the
  server-projected lobby view. New lobby-view fixtures must include
  `hostConnected: true|false`.
- **`host-connect` payload may carry `sessionToken?: string`** (B-01).
  Optional in Zod (`z.string().uuid().optional()`); board clients mint a
  UUID via `getOrCreateHostSessionToken()`. Old clients that don't send
  fall through to no-token branch.
- **WS close code `4002`** reserved for E-08 identify-timeout closures.
  Don't reuse.
- **`hostSession` persists across DO restarts** via `ctx.storage`. Clear
  in storage AND in-memory if you ever need to forcibly evict a host.
- **Zod v4 strictly enforces RFC 4122 v4 UUID** version + variant bits.
  Test fixtures need real-shaped UUIDs (not all-1s patterns).
  `crypto.randomUUID()` produces conforming output.
- **`PROTOCOL_VERSION = 6`** (was 5, bumped 2026-05-10 for `host-action`
  pause/resume + `NopeWindowView.pausedAtMs`). Hard-refresh dev tabs
  after pulling any protocol bump. `protocolVersion?: number` on the
  `join` payload — optional in Zod so old clients hit
  `PROTOCOL_MISMATCH` not a generic Zod failure.
- **`deriveInteractionPermission` requires a `nopeWindowActive: boolean`
  arg** (2026-05-11 — `play-in-flight` gate). When the actor's card
  is in flight awaiting intercept resolution, staging is blocked.
  Chain-intercept (Counter button) still works — routes through
  SmartActionBox, not staging. New `'play-in-flight'`
  `InteractionBlockReason` variant — handle it in any
  reason-switching code added downstream. Favor-response branch
  short-circuits before the new gate so a chained nope on a Favor
  doesn't lock the target. Test file `useInteractionPermission.test.ts`
  has the three regression cases.
- **Sheet button race-class convention.** Every sheet with a terminal
  action button (NameCard, FuturePeek, DefusePlacement, TargetSelect)
  uses the two-track guard pattern: sync `submittedRef` + async
  `submitted` state. New sheets follow the same shape.
- **Triage closure hygiene** (caught 2026-05-09 on Falsify sprint
  #004/#005/#006). When a fix commit closes one or more triage issues,
  three updates land in the SAME commit (or an immediate follow-up):
  (1) **Subject line cites issue ID(s)** — `fix(...): close X-NN — summary`.
  Topic-only refs (`"TODO #11"`) hide commits from `E2E-ISSUE-LIST`
  git-grep audits and from triage-archeology grep.
  (2) **Issue body Status field flips** — `🟡 BLOCKED ...` →
  `✅ RESOLVED`, with a `**Resolution:**` line citing the commit SHA +
  what shipped. Preserve the original `**Disposition:**` as
  `**Original disposition (pre-fix):**` for audit trail.
  (3) **Regenerate INDEX.md** — `pnpm exec tsx
  scripts/playtest/regen-issue-index.ts <RUN_DIR>/issues`. INDEX is
  derivative of the body Status fields; skipping (2) leaves it stale
  even after regen. Note: the script wants the `issues/` subdir as its
  arg, NOT the run dir. The `.claude/skills/playtest-run/SKILL.md:230`
  example writes `<RUN_DIR>` which is wrong — use the `issues/` path.
- **Pre-starting dev servers breaks the orchestrator.** `pnpm
  playtest:run` spawns its own wrangler with `PLAYTEST_TOKEN` baked in
  via `.env`. Pre-starting `pnpm dev:server` binds 8787 with no token
  → orchestrator's god-connect gets HTTP 401 → `code=4004`. Don't
  pre-start dev servers when running the harness — it owns the
  lifecycle.
- **Persistence is fire-and-forget for normal play actions, AWAITED
  for dev-actions** (commit `36c1af9f`, 2026-05-13). `room.ts`
  calls `void this.persistState()` at 13+ call sites for play /
  reconnect / host actions — in production this is fine (worker is
  stable, no hot-reload). In dev mode, wrangler hot-reload between a
  mutation and the storage write can revert state on DO
  reinstantiation. The dev-action handler at `room.ts:521-555` now
  uses `await this.persistState()` because dev-actions are operator
  intent with no retry path. Normal play actions remain fire-and-
  forget — they have natural retry via gameplay if a hot-reload
  swallows a write. If you add a new dev-action OR observe a real
  production persistence race, follow the dev-action handler's
  pattern: `async () => { ... await this.persistState(); ... }`. The
  `enqueue` task signature was widened to `() => void | Promise<void>`
  to support this — `actionQueue.then(task)` naturally chains async
  tasks.
- **Phrasing! queue — surfaces resolved** (2026-05-14 / 2026-05-15).
  (1) Lobby/idle copy: SKIPPED — "Awaiting check-in" / "Opening secure
  channel" already tonally strong in Pendleton voice; explicit
  Phrasing! callout would cheapen it. (2) ConnectionOverlay strings:
  SKIPPED — too transient/rare for a beat to land. (3) DramaOverlay
  BURNED-draw beat: SHIPPED 2026-05-15 as `BURNED_PHRASING_POOL` in
  DramaOverlay.tsx — 6 wire-report sub-caption variants ("// CASE
  CLOSED", "// FILE TERMINATED", "// COVER COMPROMISED", "// OPERATIVE
  BURNED", "// CASE CLOSED. NEXT.", "// TOAST.") that surface beneath
  the victim-name caption on the non-drawer/board cinematic. These are
  **tonal cousins, not literal Phrasing! catchphrase landings** — they
  juxtapose formal `//` chrome with Archer-deadpan kickers ("TOAST.",
  "NEXT.") rather than the double-entendre-plus-callout pattern of
  spec §3.5 shipped beats. A literal "...Phrasing." landing on the
  BURNED cinematic was considered but rejected: the cinematic is the
  game's heaviest dramatic moment and a comedic callout would compete
  with the beat. If a future surface wants a literal Phrasing! landing,
  spec §3.5 catalog remains the source of truth.
