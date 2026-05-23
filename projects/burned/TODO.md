# BURNED — TODO

Operator's queue. Actionable items only. **Not a diary** — git log has
the history. (Rule: `feedback-todo-is-not-a-diary.md`.)

---

## 1. Active priorities

### Current state (verified 2026-05-22)

- Tests: **1407 pass** | 6 expected fail (68/68 files green)
- Trailer subpackage tests: **219 pass | 0 expected-fail** (11 files;
  script-coverage drift gate green — every cue has a WAV, 16/16;
  card-roster drift gates green — 17/17 webps in sync;
  visual-manifest drift gates green — every Path B asset in
  manifest, every manifest entry on disk;
  audio-manifest drift gate NEW Unit 4.1 — every cue staticPath
  resolves to a real file at `<BURNED>/public/trailer/audio/lines/<f>`,
  every staticPath prefixed `trailer/audio/lines/` per ADR #15)
- Typecheck: clean (`pnpm typecheck` root + `videos/trailer/`)
- Phone player entry: **19.17 KB gz**
- DramaOverlay lazy chunk: **2.34 KB gz**
- HOW-TO-PLAY bundle: `howtoplay-*.js` **33.90 KB gz** + `howtoplay-*.css`
  **10.68 KB gz** + shared GSAP chunk **27.21 KB gz**
- Protocol version: **v6**
- Trailer runtime: **3180f / 106s @ 30fps** (TOTAL_FRAMES)
- Phase 2 ElevenLabs spend: **$0.87 / $50** ceiling (residual budget
  available for any Phase 3+ regen)

### Origin trailer

Plans (8) drafted, deepened, document-reviewed at
`docs/plans/origin-trailer/` (phase-0 through phase-7 + `roadmap.md`
ADR ledger). Sequential phase execution.

**Phase 0 / 1 / 2 / 3 — ✅ CLOSED.** Cleared sequentially 2026-05-18 →
2026-05-22. See plan checkboxes + git log for unit history. Per-phase
EXIT docs + sign-off sentinels under
`videos/trailer/sample-eval/voice-pipeline/` + `videos/trailer/PHASE-0-EXIT.md`
+ `videos/trailer/PHASE-3-EXIT.md`.

Hand-off contracts now in place:
- **Phase 1 → Phase 2/3/4:** `videos/trailer/BEAT-SHEET.md` (frozen).
- **Phase 2 → Phase 4:** `videos/trailer/src/lib/audio-manifest.ts` —
  16 typed `AudioAsset` entries (R5=keep; 86.10s cumulative measured
  audio across 106s composition window). Phase 4 imports for
  `<Audio>` placement per asset-inventory.md hand-off doc.
- **Phase 3 → Phase 4:** `videos/trailer/src/lib/visual-manifest.ts`
  + `videos/trailer/PHASE-3-EXIT.md`. Manifest helper exports:
  `HTP_ASSET` (1), `R15_CHROME` (8 SVGs), `BRIEFING` (10),
  `TITLE_SEQ` (4), `MUSIC_BED` (1). Card-art SSoT remains
  `card-roster.ts` (not duplicated in visual-manifest).

**Phase 3 — ✅ CLOSED** (Unit 3.7 landed 2026-05-22). Final units:
Unit 3.0 (HTP vocab vendoring + drift gate), Unit 3.1 (HTP fullpage
capture 1920×19848 against production), Unit 3.2 (17-entry typed
card-roster + cascade-halo column geometry + bidirectional drift
tests), Unit 3.3 (briefing-room set-dressing — 4 NEW SVGs:
venetian-blinds, depth-plane Option A brass nameplate, dossier-
folder-closed, dossier-folder-open), Unit 3.4 (R15 chrome stamps
SPLIT-LAYER — 8 SVGs for 4 R15 instances × frame + text; CVD probe
clears STRICT 0.10 oklab floor across 6 pairs / 3 deficiency sims),
Unit 3.5 (music bed — "Spy Glass" by Kevin MacLeod CC-BY 4.0, $0
paid), Unit 3.6 (cold-open title-sequence — 3 NEW SVGs + composite
proof), **Unit 3.7 (typed visual-manifest + 12 drift-gate tests + 9
per-family safe-square composites + 2 cross-family scene composites
[S02 frame-300 briefing reveal + S04 frame-1950 cascade payoff
stamp slap] + PHASE-3-EXIT.md hand-off doc).** Cumulative Imagen
spend: **$0.00 / $6 cap.**

**Phase 4 — IN-FLIGHT** (entry 2026-05-22). Remotion composite at
`docs/plans/origin-trailer/phase-4-remotion-composite.md`. Entry
prerequisite status:
- **Token-import strategy** — LOCKED Option C (fixed-value shim) at
  Phase 4 deepening 2026-05-17 per Fork 3 + amendment SA-7.
- ~~**Variable woff2 weight `'200 700'` syntax SPIKE**~~
  **RESOLVED-BY-PHASE-0 (correction 2026-05-22).** Phase 0 Unit 0.5
  already validated. `useFonts.ts` ships production variable-axis
  pattern. Phase 4 Unit 4.0 DROPPED — see insight 066 + Phase 4 plan
  Unit 4.0 banner. Deepening MA-7 missed the Phase 0 disposition.
- **Briefing-room reference renders** (`case-banner-reference.png`,
  `comms-ticker-reference.png`) deferred to Phase 4 invocation —
  needs BURNED in playing-state game.

**Unit 4.0a — COMPLETED 2026-05-22.** Decision doc at `videos/trailer/
sample-eval/composite-build/umb-v3-component-triage.md`. Net: **ZERO**
UMB v3 components vendored. FadeTransition SUPERSEDED-BY-EXISTING
`SceneFadeToBlack.tsx` (Phase 0 spike artifact; deepening miss — same
family as insight 066); 5 TAKE-AS-INSPIRATION; 7 SKIP (incl. FilmGrain
confirmed via Briggsy visual eval).

**Unit 4.1 — COMPLETED 2026-05-22.** Verification doc at
`videos/trailer/sample-eval/composite-build/scaffold.md`. Net: 8 Remotion
compositions registered (`BurnedTrailer` master + 6 `PreviewS0N…`
standalone + `PreviewS04Peak` fast-iteration window) using camelCase IDs
(Remotion 4.0.438 `isCompositionIdValid` rejects underscores — caught at
first still-render; plan body's `Preview_S0N_…` form was illegal).
Skeletal scenes scaffolded with shared `ScaffoldSceneFrame` helper +
S01-specific 3×3 font-validation panel. `<MusicBed>` 15-anchor envelope
re-derived against TOTAL_FRAMES=3180 (plan body's anchors were for the
pre-Tier-4 2850-frame budget — insight #061 enumeration decay). ESLint
`no-restricted-imports` rule blocks core `Audio` import per ADR #17
(scoped to `videos/trailer/src/**`; root `pnpm lint` now includes the
trailer subdir).

**Unit 4.1 carry-back: Phase 2 staticPath discipline correction.** During
master render verification, Remotion 404'd on every VO cue. Root cause:
`cueStaticPath()` emitted `audio/lines/<f>` but ADR #15 + the trailer's
`setPublicDir('../../public')` require `trailer/audio/lines/<f>`. Phase
3.5's music bed got the convention right; Phase 2 missed it. Fix
(included in same commit): moved 16 .wav + 16 .processed + 16 raw + 16
.sha256 sidecars from `videos/trailer/public/audio/lines/` → BURNED-root
`public/trailer/audio/lines/`; updated `cueStaticPath` helper + 6 script
WAV/LINES/OUT dir constants + script-coverage test + preflight gitignore
pattern; regenerated `audio-manifest.ts`; added NEW
`audio-manifest.test.ts` mirroring `visual-manifest.test.ts`'s file-
existence forward gate (4 new assertions; would have caught the original
drift). Trailer-local `public/audio/` dir removed (empty post-move). Root
`.gitignore` adds `public/trailer/audio/lines/`. `visual-manifest.test.ts`
`EXCLUDED_TRAILER_DIRS` adds `trailer/audio/lines` (owned by audio
manifest).

**Phase 4 next unit:** Unit 4.2 — S01 Cold Open implementation. Replaces
the Unit 4.1 skeletal S01 (which currently doubles as the font-validation
surface). Once Unit 4.2 lands, the 3×3 font panel migrates to a one-off
evidence artifact at `sample-eval/composite-build/font-validation.png`
and `S01_ColdOpen` becomes content-only.

**Phase 2 carry-forwards → Phase 3+** (stitch / silenceremove
generalizations):

- **`silencedetect` writes to STDERR, not stdout** (caught + fixed
  2026-05-21 Unit 2.6). Same gotcha as Unit 2.5's `loudnorm`. Project
  pattern: any FFmpeg filter that emits diagnostic data needs
  `spawnSync` capture, not `execFileSync` (which returns stdout
  only). Both Unit 2.5 (`runFFmpegJson`) and Unit 2.6
  (`detectSilences`) now use spawnSync — if another silencedetect /
  loudnorm / volumedetect / showinfo-style filter joins the pipeline,
  copy that pattern.
- **Phase 1 doc-drift on BEAT-token format** (logged 2026-05-21).
  Phase 2 plan §Unit 2.6 deepening claims Phase 1 ships `[BEAT NNNms]`
  (integer milliseconds) but `src/lib/script.ts` actually ships
  `[BEAT 0.3s]` (decimal seconds). `stitch-beats.ts` parser handles
  BOTH. If Phase 1 reopens in Unit 2.7, decide on ONE canonical form
  and update the plan + script + parser to match — currently
  resilient-by-accident.
- **Per-segment trim cushion = 5 ms inside stitch, 50 ms in
  post-process** (LANDMINE, 2026-05-21). Two different
  `start_silence` values intentionally. If you ever generalize the
  silenceremove helper into a shared utility, parameterize the
  cushion — they are NOT the same number for the same reason.
  `stitch-beats.ts` comment explains.

**Phase 2 carry-forwards → Phase 4 mix tests** (loudness drift +
FFmpeg muxer gotcha):

- **Loudnorm drift on short cues (≤3s).** Per current
  `audio-manifest.ts`: s04-cue-1380 ("Operational planning") -17.95,
  s04-cue-1530 -19.17, s04-cue-1890 ("Seventeen asset illustrations…")
  -17.27, s04-cue-2280 (S04-payoff "They WERE the operation.") -17.21
  — all measure 1-3 LU off the -16 target after two-pass loudnorm.
  Known limitation per k.ylo.ph/loudnorm.html — two-pass mitigates
  but doesn't eliminate on clips <3s. Phase 4 Remotion bed-ducking
  math may need a tiny bump on these specific cues if mix tests show
  them ducking too far. Track but don't pre-correct. (Re-derive
  frames from the manifest, not from this list — insight #061.)
- **FFmpeg muxer inference fails on `.wav.tmp` filenames** (caught +
  fixed 2026-05-21 Unit 2.5). FFmpeg picks output muxer from the
  filename extension; `.tmp` isn't a known audio format and FFmpeg
  refuses to run. Fix shipped: explicit `-f wav` on both atomic-write
  passes in `post-process-tts.ts`. If you add another FFmpeg
  invocation with a `.tmp` target elsewhere, copy the `-f wav` (or
  whatever target format) flag.

**Phase 2 carry-forwards → Phase 4 + future TTS work** (regen + hash
+ audition hygiene):

- **S06-phrasing actual vs expected drift.** Phase 1 ships
  `expectedFrames: 12`; codegen-measured actual is 19f. Briggsy
  ear-locked the delivery — `expectedFrames` not amended. Phase 4
  uses `actualFrames` from the manifest for audio placement; the
  `expectedFrames` stays as the original budget for reference. If a
  future Phase 1 reopen amends the script, regen the manifest.
- **Hash-input gap (CARRY OVER, EXTENDED).** `hashCueInputs` covers
  cue.text + engine + voiceId + prefixTag + adapter SHA + priming key
  — but NOT in-client overrides:
  · `cold-open-prototype.ts COLD_OPEN_SPEAKER.voiceSettings`
    (Janet cuntiness)
  · `tts-clients/elevenlabs.ts SCREAM_AUDITED_SETTINGS` (Vera scream)
  · `tts-clients/elevenlabs.ts PHRASING_INTERJECTIVE_SETTINGS`
    (S06-phrasing — NEW 2026-05-21)
  Future tunes of any of those need `--force` to re-render, OR add a
  source-file SHA to the hash inputs. Same class of bug as the original
  adapter-SHA gap doc-review caught.
- **Audition WAV artifacts.** `videos/trailer/sample-eval/voice-pipeline/
  mallory-audition/` (5 Shared Library auditions + Eleanor) and
  `mallory-design/` (3 Voice Design previews) are gitignored locally.
  Keep on disk for reference; they don't ship.
- **`previous_text` / `next_text` re-enable.** `eleven_v3` model
  doesn't support context-priming yet (API returns 400
  `unsupported_model`). Gated off in `tts-clients/elevenlabs.ts`;
  re-enable when ElevenLabs ships v3 priming. Priming map
  (`context-priming-overrides.json`) preserved for that future.

**Phase 1 carry-forwards → Phase 3/4/6:**

- **Cold-read gate for Unit 1.6** — operational standard is **N=1
  Briggsy self-read** (24h cool-off + MUSHRA-shaped Likert rubric per
  ADR #13r). Pre-drafted R11-cut bridge lines activate if the
  self-read hard-fails. Memory: `feedback-listener-panels-default-to-n1.md`.
- **Phase 4 — S06 closing-card breathing room** may surface 45–50
  frames reads cleaner than the locked floor of 40 frames.
- **Phase 4 voice-filter scoring fix** — Path A scoring treats
  female-voice keyword matches equally with male; picked voice
  (Roger) is correct via gender label bonus, but ranking
  presentation is misleading. Fix when revisited.

---

## 2. Landmines

Active warnings only. Older landmines have moved to `docs/insights/` and
`CLAUDE.md`.

- **Playwright composite scripts write a temp HTML under `public/trailer/`**
  (LANDMINE, 2026-05-22 Unit 3.7). Both
  `build-operative-card-composite-proof.ts` and
  `build-safe-square-composites.ts` write `__safe-square-temp.html` /
  `__composite-proof-temp.html` into BURNED's `public/trailer/` so
  file:// asset references resolve same-origin (Chromium treats
  setContent + file:// as cross-origin and silently fails image loads
  with naturalWidth=0). Scripts cleanup in `finally`; if a script is
  killed between writeFile and unlink, the temp leaks.
  · `visual-manifest.test.ts` canary catches leaks: `it('rejects the
    temp HTML composite-proof file leaking into the manifest tree')`.
  · Any new Playwright composite script MUST follow the same pattern
    (write temp to `BURNED_ROOT/public/trailer/__<slug>-temp.html`,
    pathToFileURL navigation, finally-block unlink). Update the canary
    if the temp filename convention changes.

- **Janet voice = Eleanor + cunty-matriarch-tuned, NOT Sloane, NOT
  Roger defaults** (RE-LOCKED 2026-05-19 by Phase 2 Unit 2.3 cunty
  canary). Janet's locked voice is **Eleanor – Gracious and
  Authoritative** (`2qQJWjw5XdG80GreshqG`, ElevenLabs Shared Library,
  British, age=old). Voice settings: `stability: 0.40,
  similarity_boost: 0.75, style: 0.45, use_speaker_boost: true,
  speed: 0.85` — pushed close to expression ceiling (style 0.45) and
  drawled (speed 0.85) to land the Jessica-Walter-Mallory-Archer DNA
  Briggsy was after.
  · Iteration history: v1 Sarah → too reassuring; v2 Sloane → too
    polished / not cunty enough per Phase 2 canary; v3 (current)
    Eleanor → cleared on 2026-05-19 listening.
  · The British accent works because the Q-from-Bond cadence reference
    is British anyway; Mallory's character DNA transfers across the
    accent shift. Brief: "always drinking but you'd never know it" +
    Q-energy crisp diction + experienced-not-frail.
  · Phase 4 Janet dialogue MUST use `COLD_OPEN_SPEAKER.voiceSettings`
    from `cold-open-prototype.ts`, NOT the Roger defaults from
    `cadence-spec-elevenlabs.json`. Contract test in
    `cold-open-prototype.test.ts` enforces the voiceId + settings
    shape; renderer `tts-clients/elevenlabs.ts resolveVoiceSettings()`
    branches by `voice === 'janet'`. SSoT.
  · Phase 4 may want similar voice locks for Sable / Vera / Neal /
    Otto / Agent X if they speak — each needs its own audition cycle
    following the Phase 2 Unit 2.3 pattern (Shared Library scout +
    Voice Design fallback).

- **Dash voice = Roger + arrogant-Sterling tuned, scream uses ORIGINAL
  Roger profile** (RE-LOCKED 2026-05-19 by Phase 2 Unit 2.3). Dash's
  voice is Roger (`CwhRBWXzGAHq8TQ4Fs17`, ElevenLabs Voice Library)
  with arrogant-briefer settings: `stability: 0.55, similarity_boost:
  0.75, style: 0.35, use_speaker_boost: true, speed: 0.95` (in
  `sample-eval/r4-dash/cadence-spec-elevenlabs.json`). All non-scream
  Dash cues use prefix tag `[sarcastic]` (was `[deadpan]`).
  · LANDMINE: the scream cue (`[shouts]`) does NOT inherit the
    arrogant-briefer retune. `tts-clients/elevenlabs.ts
    resolveVoiceSettings()` detects `cadencePrefixTag === '[shouts]'`
    and returns the ORIGINAL Phase 0 Unit 0.6 audited profile
    (`stability: 0.70, style: 0.15, speed: 0.95`) — the Sterling-LANA
    acoustic shape was tuned at those specific values. If you tweak
    Roger again for briefer cues, the scream stays isolated via the
    in-client override. If you tweak the scream, edit
    `SCREAM_AUDITED_SETTINGS` in `elevenlabs.ts`, NOT the adapter.

- **Phrasing! cue (`S06-phrasing`) uses interjective Roger profile,
  NOT arrogant-briefer defaults** (LOCKED 2026-05-21 by Phase 2 Unit
  2.4). The `Phrasing.` callback reads as a snappy rise-fall contour
  (rise on `Phra-`, fall on `-sing.`), not the slow drawled
  arrogant-briefer cadence. Tagged `cadenceAdapter.prefixTag =
  '[excited]'` in `script.ts`; `resolveVoiceSettings()` branches on
  `cadencePrefixTag === '[excited]' && voice === 'dash'` and returns
  `PHRASING_INTERJECTIVE_SETTINGS` (`stability: 0.30, similarity_boost:
  0.75, style: 0.65, use_speaker_boost: true, speed: 1.05`).
  · Cleared by Briggsy on the first iteration ("phrasing landed!").
  · If you tweak Phrasing, edit `PHRASING_INTERJECTIVE_SETTINGS` in
    `elevenlabs.ts` — same in-client override pattern as Vera scream.
    Hash-input gap landmine applies: changes need `--force --only
    S06-phrasing` to invalidate the cached WAV.
  · No primary-source phonetic analysis of Benjamin's Phrasing!
    delivery exists (Gemini lit search 2026-05-21 turned up zero
    voice-director notes / interview quotes / fan phonetic breakdowns).
    The current tuning is INFERRED from Sterling-CODED principles +
    Briggsy's ear, not documented Benjamin technique. If a future
    primary source surfaces, re-evaluate against it.

- **ElevenLabs Creator tier silently downgrades PCM `output_format`
  to MP3** (caught 2026-05-19 Phase 2 Unit 2.3). Per ElevenLabs docs:
  "PCM with 44.1kHz sample rate requires Pro tier or above." On
  Creator, requesting `pcm_8000`/`pcm_16000`/`pcm_22050`/`pcm_24000`/
  `pcm_32000`/`pcm_44100`/`pcm_48000` returns 200 OK with **MP3 bytes**
  (default `mp3_44100_128`). NO error, NO warning. Wrapping the MP3
  bytes in a fake WAV header produces a malformed file (codec=mp3
  inside RIFF/WAVE container). Detection: ffprobe shows codec_name=mp3
  + tiny duration vs expected size + ID3 header at byte 0x2A.
  · **Fix shipped**: `tts-clients/elevenlabs.ts` requests
    `output_format: 'mp3_44100_192'` (Creator-tier ceiling, transparent
    for voice), then FFmpeg-converts MP3 → 48kHz mono 16-bit PCM WAV
    via `mp3ToWav48kMono()` in `lib/ffmpeg.ts` before returning the
    Buffer. On-disk artifact format unchanged.
  · If Briggsy ever upgrades to Pro tier, the PCM path becomes
    available and the MP3-intermediate step can be eliminated. Until
    then, the conversion is the contract.

- **ElevenLabs `eleven_v3` does NOT support `previous_text` /
  `next_text` context priming** (caught 2026-05-19 Phase 2 Unit 2.3).
  API returns 400 `{"code": "unsupported_model"}`. The Phase 2 plan
  deepening assumed v3 supported it; it doesn't (yet). Gated off in
  `tts-clients/elevenlabs.ts` via `if (args.modelId !== 'eleven_v3')`
  check; priming params stripped from request body for v3. Priming map
  `context-priming-overrides.json` preserved for future v3 support OR
  for a model swap (other ElevenLabs models DO support priming).

- **Hash invalidation gaps** (known, 2026-05-19). `hashCueInputs()` in
  `generate-dash-tts.ts` hashes `cue.text + engine + voiceId +
  prefixTag + adapter-SHA + priming-key`. Changes to the following
  sources do NOT invalidate cached WAVs — require `--force`:
  · `scripts/cold-open-prototype.ts COLD_OPEN_SPEAKER.voiceSettings`
    (Janet cuntiness knobs)
  · `scripts/tts-clients/elevenlabs.ts SCREAM_AUDITED_SETTINGS`
    (scream override profile)
  · Any in-client override branching logic in `resolveVoiceSettings()`
  Fix path (future patch): add SHA of `cold-open-prototype.ts` and
  `tts-clients/elevenlabs.ts` source content to hash inputs. Same
  class of bug as the original adapter-SHA gap doc-review caught.

- **Origin-trailer doc drift after Unit 0.6 §3.6 expansion** (2026-05-18,
  closure of `ed03e598`). The Sterling-LANA four-axis characterization
  (flat pitch + amp jump + first-vowel drag + accent anchor) now lives
  in `videos/trailer/sample-eval/r4-dash/cadence-spec.md` §3.6 and the
  ElevenLabs adapter notes. Stale references in:
  · `cadence-spec-gemini.md:136` and `cadence-spec-openai.md:48,92` —
    encode the original 2-axis "volume-discontinuous-not-pitch" framing
    only. Currently dead-code (Path C engines dropped to backup per
    Unit 0.2 disposition); if either engine is ever reactivated for
    Phase 4/6 fallback, re-derive each adapter's scream section from
    `cadence-spec.md` §3.6 before rendering, otherwise the engine will
    produce a no-drag burst instead of the Sterling-LANA call.
  · `docs/plans/origin-trailer/phase-1-beat-sheet-lock.md` lines 414,
    415, 1224, 1234, 1441 inline `"VERAAA!!!"` rather than pointing at
    the `PARAGRAPH_3_SCREAM` constant. When Phase 1 beat-sheet-lock
    executes, fix: replace the inline string with a constant reference
    so the canonical `VEEEEEEEERAAAA!!!` text is what ships.
  · `docs/plans/origin-trailer/phase-0-gate-resolution.md` references
    to "VERAAA!!!" are HISTORICAL (the eval procedure that resolved to
    the new canonical text). Don't retroactively edit — they document
    the path, not the destination.

- **Push to Briggsy's repos is now autonomous; force-push to
  main/master is the carve-out.** Policy inverted 2026-05-18 after
  the auto-mode classifier blocked `/distill` citing two autonomous
  Phase 0 Unit 0.2 pushes (`56c8b9ba` + `4d6aac64`). Briggsy's
  correction: *"and let's update whatever command that allows you to
  push w/o me say 'yes' every time, I've never said no."* The
  binding rule lives in `~/.claude/settings.json` `autoMode.allow`
  (natural-language rule the classifier LLM reads at decision
  time). Memory cross-ref: [[feedback-push-without-asking]]. The
  one carve-out: force-push to main/master still needs explicit
  ask per the system-prompt's "NEVER force-push to main/master"
  rule. Non-force pushes to main/master and pushes (force or not)
  to feature branches all clear without confirmation.
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
- **Phrasing!-cousin wire-reports live in `BURNED_PHRASING_POOL`**
  (DramaOverlay.tsx). 6 `//`-chrome / Archer-deadpan-kicker variants
  surface beneath the victim-name caption on the BURNED-draw
  cinematic — tonal cousins, NOT literal Phrasing! landings. Literal
  "...Phrasing." was considered for this surface and rejected (would
  compete with the heaviest dramatic beat). Future literal Phrasing!
  surfaces consult spec §3.5 catalog as source of truth; the BURNED
  cinematic is reserved for the cousin pool.
