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

_No live prescriptions on the BURNED product. **Origin-trailer plan state (2026-05-17): Phase 0 DEEPENED (`b9617d9d`); Phase 1 DEEPENED (`43d44ef4`, 60+ amendments, 1862→2728 lines); Phase 2 DEEPENED (this commit, 35 amendments across 4 tiers, 1929→4064 lines, +3 new units 2.0/2.X/2.Y); Phases 3–7 drafted + committed (`de20650b`); deepening continues sequentially.**_

- _[`roadmap.md`](docs/plans/origin-trailer/roadmap.md) — 13 ADRs (ADR #4 + #11 revised 2026-05-17 per Phase 1 deepening: bare `<Series>` + scene-internal overlay components, NOT `<TransitionSeries>`; `@remotion/transitions` install-on-demand), R1–R15 trace, 3-axis bar-raise criteria, ~95s/2850-frame target_
- _[`phase-0-gate-resolution.md`](docs/plans/origin-trailer/phase-0-gate-resolution.md) ✅ **DEEPENED 2026-05-16** — 6 units (scaffold + 5 brainstorm gates); 39 amendments across 7 tiers landed via 8-agent parallel review + sequential-thinking + emil-design-eng synthesis_
- _[`phase-1-beat-sheet-lock.md`](docs/plans/origin-trailer/phase-1-beat-sheet-lock.md) ✅ **DEEPENED 2026-05-17** — 10 units (scene count + narration script + voice cast + transitions + cascade composition + goofy stats + music + typography + R15 chrome + briefing-room composition); 60+ amendments via same 8-agent shape + emil-design-eng_
- _[`phase-2-voice-pipeline.md`](docs/plans/origin-trailer/phase-2-voice-pipeline.md) ✅ **DEEPENED 2026-05-17** — 11 units now (NEW 2.0 preflight + 2.X Path D voice-actor ingestion + 2.Y Path B hybrid scream Voice Changer; 2.1 gutted+recast to consume Phase 1's BURNED_TRAILER_LINES instead of recreating; 2.2 engine clients fully rewritten per Context7-verified API surfaces; 2.3-2.8 deepening callouts); 35 amendments across 4 tiers via same 8-agent shape (best-practices / framework-docs / repo-research / adversarial / scope-guardian / coherence / feasibility / design-lens) + emil-design-eng_
- _[`phase-3-visual-asset-prep.md`](docs/plans/origin-trailer/phase-3-visual-asset-prep.md) — 7 units (HTP capture + card curation + briefing-room assets + R15 chrome SVGs + music procurement + title-sequence assets + visual manifest) — **next deepening target**_
- _[`phase-4-remotion-composite.md`](docs/plans/origin-trailer/phase-4-remotion-composite.md) — 10 units (Root + composition wiring + 6 scene files + transitions + per-scene Archer tests + full studio-preview render)_
- _[`phase-5-gameplay-capture.md`](docs/plans/origin-trailer/phase-5-gameplay-capture.md) — 6 units (mechanism evaluation + shot list + harness + take selection + post-process + Phase 4 re-render)_
- _[`phase-6-final-render-qa.md`](docs/plans/origin-trailer/phase-6-final-render-qa.md) — 7 units (production encode settings + render + §2 frame-pass audit + bar-raise vs UMB v3 + A/V sync + mobile crop + decode test)_
- _[`phase-7-distribution.md`](docs/plans/origin-trailer/phase-7-distribution.md) — 5 units (X-native cutdown + portfolio embed + post copy + calendar + metrics tracking)_

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

_**Next session entry: `/deepen-plan` on `phase-3-visual-asset-prep.md`.** Per `feedback-phase-plan-drafting-workflow.md`. Sequential, one phase per session. Phase 3 must absorb the cross-phase dependencies surfaced by Phase 1 deepening (HTP trace-video conditional fallback; music-bed ownership) AND verify Phase 2 deepening's `<Sequence>+<Audio>` consumption contract doesn't conflict with Phase 3's visual-manifest shape._

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
- **HOW-TO-PLAY: Imagen prompt gotcha — hex codes bake in as text**
  (caught in title plate v1). DO NOT reference hex codes like
  `#94 7226` in Imagen prompts — the model renders them as literal
  visible text in the output. Always describe colors in words ("burnt
  orange," "warm gold"). Regenerator script:
  `scripts/generate-htp-assets.ts` with `HTP_ASSET=<filename>` env var
  to target one asset (filenames: `pendleton-crest`,
  `operations-manual-plate`, `desk-scene`; or `all` for the batch).
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
