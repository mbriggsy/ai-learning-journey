---
title: "Origin Trailer — Phase 2: Voice Pipeline"
type: feat
phase: 2
parent: docs/plans/origin-trailer/roadmap.md
origin: docs/ideation/2026-05-15-origin-trailer-brainstorm.md
created: 2026-05-16
deepened: 2026-05-17
reviewed: pending
status: active
---

<!--
  Deepening pass landed 2026-05-17 via 8-agent parallel review
  (best-practices, framework-docs, repo-research, adversarial,
  scope-guardian, coherence, feasibility, design-lens) + emil-design-eng
  lens applied to cadence + delivery polish decisions. Tiered amendments
  below mirror Phase 1's deepening commit shape (43d44ef4).

  Load-bearing fixes (would fail at first execution):
  - `SCRIPT_CUES` literal DELETED — Phase 2 now consumes Phase 1's
    `BURNED_TRAILER_LINES` from `videos/trailer/src/lib/script.ts`
    directly. `script-lines.ts` file removed; Phase 2 derives runtime
    fields (filename, expectedFrames extension) from `Line` type.
  - Voice union aligned to Phase 1's `'dash'|'sable'|'janet'|'vera'`.
    `'cold-open-speaker'` + `'dash-scream'` cells removed; scream is
    `voice: 'dash'` with `cadenceAdapter.prefixTag: '[shouts]'`.
  - Gemini `pcmToWav()` wrapper added (Gemini returns raw 24kHz PCM,
    NOT formatted WAV — Phase 2's gemini.ts was writing invalid files).
    Verbatim port from UMB precedent `generate-narrator.ts:127-155`.
  - ElevenLabs `model_id: 'eleven_v3'` (was `eleven_multilingual_v2`
    which does NOT interpret audio tags — silent failure mode).
  - ElevenLabs `[scream]` REPLACED with `[shouts]` (verified undocumented
    via Context7; `[shouts]` is the canonical Sterling-CODED volume-
    discontinuous tag). Tags are SELF-CLOSING in v3 — no `[/shouts]`.
  - ElevenLabs `[pause:600ms]` syntax REMOVED — does NOT exist in v3
    (only qualitative `[pause]`/`[short pause]`/`[long pause]`).
    Precision intra-line beats route through FFmpeg silence stitch
    on ALL engines, not just OpenAI fallback.
  - Gemini model name `'gemini-3.1-flash-tts'` REPLACED with
    `'gemini-2.5-flash-preview-tts'` (verified current 2026 model).
  - `<Audio from={frame}>` language REMOVED from plan narrative — the
    `from` prop DOES NOT EXIST on `<Audio>` from `@remotion/media`.
    Offsets via `<Sequence from={N}><Audio src=.../></Sequence>` per
    Phase 0 ADR #5 + Context7 verification.
  - FFmpeg `silenceremove` syntax REWRITTEN to areverse-sandwich
    pattern (trim only leading/trailing; the original
    `stop_periods=1:stop_duration=0` can prematurely cut interior
    silence and drop final syllables).
  - FFmpeg `concat` channel-layout mismatch fix: `-ac 1` mono lock
    on every FFmpeg invocation + anullsrc silence (concat-demuxer
    with `-c copy` requires matching codec params; stereo cue +
    mono silence = corrupt output).
  - `loudnorm` TWO-PASS workflow (single-pass drifts ±2-3 LU on
    clips <30s per k.ylo.ph/loudnorm canonical guide; every Phase 2
    cue is in the danger zone).
  - Atomic-write pattern across all FS writes (write to `.tmp`,
    atomic-rename on success; mid-process crash recovery).
  - VOICE_DIRECTION guard — per-engine variants codified at each
    engine client's API call site (3 variants per Phase 0 deepening
    Key Tech Decisions §VOICE_DIRECTION).

  Structural additions:
  - NEW Unit 2.0 — Prerequisites + Preflight + PHASE-0-EXIT.md
    parsing. Asserts trailer scaffold exists, FFmpeg ≥5.0 on PATH,
    .env keys present, and parses Phase 0 exit document to extract
    engine + voice IDs + cadence-spec adapter path + scream outcome
    + model version pin. Single source of truth — no `TTS_ENGINE`
    env var override.
  - NEW Unit 2.X — Path D Voice-Actor WAV Ingestion (conditional).
    Triggers if Phase 0 Unit 0.2 Sub-phase 0a outcome is Path D
    (voice actor). Skips Units 2.2-2.4 (no TTS API calls); ingests
    actor-delivered WAVs via `path-d-manifest.json` mapping;
    routes through Unit 2.5 post-processing.
  - NEW Unit 2.Y — Path B Hybrid Scream Voice Changer (conditional).
    Triggers if Phase 0 Unit 0.6 outcome is `kept-via-B`. Replaces
    Path A `[shouts]` generation for cue 2400 (S05 scream). Reads
    source recording from Phase 0 deliverable; calls ElevenLabs
    Speech-to-Speech with Dash voice ID.
  - Per-engine cadence-spec adapter file consumption (Phase 0 ships
    THREE adapters — `cadence-spec-elevenlabs.json`,
    `cadence-spec-gemini.md`, `cadence-spec-openai.md`. Phase 2 reads
    the one matching the locked engine, NOT the source cadence-spec.md).
  - Per-line `cadenceAdapter` consumption (Phase 1 ships per-line;
    Phase 2's engine clients prepend `prefixTag` from the Line, not
    from hardcoded voice-cell logic).
  - Hash-based skip-or-regen invalidation (sidecar `${wav}.meta.json`
    tracks `sha256(text + engine + voice_id + cadenceAdapter)`;
    stale WAVs auto-regenerate without requiring `--force`).
  - JSONL generation log sidecar (`generation-log.jsonl` machine-
    readable per-cue per-run records for Phase 6 QA + Phase 7
    retrospective).
  - Per-cue tolerance bands by cue type (sustained ±5% / list ±7% /
    payoff ±4% / scream ±20%) — Phase 1's wps bands inform tolerance.
  - Sentinel-file gating between units (Unit 2.3 writes
    `cadence-consistency-signoff.txt` on green; Unit 2.4 asserts;
    Unit 2.7 writes `phase-1-reconciliation-signoff.txt`; Unit 2.8
    asserts).
  - TTS cumulative spend tracker + hard abort at $30 ceiling
    (`tts-spend.json`; `TTS_BUDGET_OVERRIDE=1` env var for explicit
    override).
  - ElevenLabs `previous_text` / `next_text` context-priming
    PROMOTED from "Deferred to Implementation" to LOCKED ENABLED for
    same-scene adjacent Dash cues. Cross-scene boundaries omit
    (cold scene break intentional).

  Design locks (emil-design-eng lens applied):
  - LUFS target: **-16 LUFS** (NOT -23 broadcast). Compromise between
    EBU R128 (-23) and YouTube/X normalization (-14); preserves
    dynamic range for Sterling-CODED cadence + R3 payoff contrast.
    `loudnorm=I=-16:LRA=9:TP=-1.5`.
  - Audio format: 48kHz / 16-bit signed LE PCM / **MONO** (`-ac 1`
    on every FFmpeg invocation; narration is single-voice).
  - FFmpeg minimum version: 5.0 (loudnorm two-pass + start_silence
    parameter; recommended 6.0 for silenceremove detection mode).
  - Engine model pins recorded in PHASE-0-EXIT.md (ElevenLabs:
    `eleven_v3` for tag cues; OpenAI: `gpt-4o-mini-tts-2025-03-20`
    snapshot per Context7-verified compliance regression on later
    snapshots; Gemini: `gemini-2.5-flash-preview-tts`).
  - Per-cue fade-in/fade-out shape (default 30ms/30ms; S04 payoff
    1950 = 5ms/30ms hard-land on stamp slap; "…Phrasing." cue 2790
    = 30ms/50ms let punchline ring; scream cue 2400 = 0ms/30ms
    preserve attack envelope + `curve=qsin`).
  - Scream-attack preservation: SKIP `silenceremove` entirely for
    scream cue (preserve full attack); KEEP `loudnorm` (-16 LUFS);
    `fadeInMs: 0`.
  - Audio lead-frames hint per cue (`leadFramesHint?: number` on
    AudioAsset; payoff 1950 = 2, scream 2400 = 1; Phase 4 places
    audio at `from={asset.startFrame - (asset.leadFramesHint ?? 0)}`
    for perceptual A/V sync; audio leads visual by 1-2 frames at 30fps).
  - "Phrasing." cue expectedFrames RAISED 12 → 27 frames (Sterling-
    CODED deliberate delivery of "…Phrasing." at 1.6-1.8 wps payoff
    cadence is ~0.9s, not 0.4s). Drift tolerance ±20%.
  - Linear (not exponential) backoff per UMB precedent:
    `5000 * (attempt + 1)` ms (5s/10s/15s) + jitter; max-elapsed
    cap 30s; `INTER_CALL_DELAY_MS = 2000` between successful calls.
  - CLI args via `node:util.parseArgs` (strict mode; rejects typos
    silently ignored by hand-rolled parser).

  Hallucinated references corrected:
  - "UMB v3 audio processing pipeline" (Unit 2.5 original Patterns)
    is HALLUCINATED — UMB has NO post-processing pipeline. Verified
    via repo-research-analyst agent. Replaced with "NEW for BURNED;
    no UMB precedent."
  - "$3 per full run from 216 words" math was wrong (216 words ≈
    1300 chars not 1000); corrected to ~$0.39/run × 5 iterations
    ≈ $2 total well under $30 ceiling.

  Cross-phase dependencies surfaced for downstream absorption
  (Phases 3/4/5/7 deepenings must consume):
  - **Phase 1** (potential follow-up amendments, flagged not triggered):
    add `expectedFrames` + `cueType` fields to Line; add `[BEAT NNNms]`
    canonical text-embedded tokens; canonicalize S05/S06 frame
    numbering to absolute (Phase 1 currently mixes scene-relative
    notation).
  - **Phase 4** must absorb: voice union `'dash'|'sable'|'janet'|'vera'`
    (NOT old Phase 2 union); `<Sequence from={asset.startFrame}>` +
    `<Audio src={staticFile(asset.staticPath)}>` placement pattern
    (NOT `<Audio from>`); `leadFramesHint` consumption; `<OffthreadVideo
    muted />` for S05 gameplay.
  - **Phase 5** must ship `gameplay.mp4` AUDIO-STRIPPED
    (`ffmpeg -an`) for belt-and-suspenders with Phase 4's `muted`
    prop; `gameplay-markers.json` contract from Phase 1 deepening
    still governs S05 scream cue alignment.

  Plan: 1929 → expected ~2900 lines.
-->


# Phase 2 — Voice Pipeline

## Overview

Phase 2 produces the trailer's audio narration assets: every Dash line,
the cold-open speaker line, and (if R5 kept) the Dash-shouts-Vera's-
name beat. Output lands as WAV files at `videos/trailer/public/audio/`
ready for Phase 4 Remotion scene composition.

Phase 2 absorbs:

- The line set from **`videos/trailer/src/lib/script.ts`** — the locked
  machine contract Phase 1 Unit 1.2 ships as `BURNED_TRAILER_LINES:
  readonly Line[]`. Phase 2 imports + consumes directly; never
  redefines line text, voice assignments, or frame placement.
- The voice cast lock from Phase 1 Unit 1.3 — `voice: 'dash'|'sable'|
  'janet'|'vera'` per line, plus optional `cadenceAdapter` per line
  carrying per-engine `prefixTag` (e.g., `'[shouts]'` on S05-scream).
- The **per-engine cadence-spec adapter** from Phase 0 Unit 0.2 Step
  1.5 — one of `cadence-spec-elevenlabs.json` (numeric voice_settings
  + bracket-tag annotations + optional Voice Design prompt),
  `cadence-spec-gemini.md` (Director's Chair structured prompt with
  `## DIRECTOR'S NOTES` / `### TRANSCRIPT` section markers), or
  `cadence-spec-openai.md` (~500-word instruction string). Phase 2
  reads the adapter file matching the engine Phase 0 locked.
- The locked Phase 0 Unit 0.2 winning path (A/B/C/D) recorded in
  **`videos/trailer/PHASE-0-EXIT.md`** under §Voice Cast Lock.
- The Phase 0 Unit 0.3 cold-open line + speaker lock recorded in
  PHASE-0-EXIT.md §R14 Cold-Open Line Lock.
- The Phase 0 Unit 0.6 scream-outcome (`kept-via-A` /
  `kept-via-B` / `cut`) recorded in PHASE-0-EXIT.md §R5 Scream
  Outcome.
- The engine model version pin recorded in PHASE-0-EXIT.md per
  Tier 3 deepening lock (no `@latest` aliases; dated snapshot
  required where engine supports).

Phase 2 produces:

- `videos/trailer/scripts/preflight.ts` — prerequisite + version
  check + PHASE-0-EXIT.md parser (Unit 2.0).
- `videos/trailer/scripts/generate-dash-tts.ts` — the production TTS
  generator (descendant of Phase 0's `generate-tts-eval.ts`).
- `videos/trailer/scripts/tts-clients/` — per-engine clients
  (`elevenlabs.ts`, `gemini.ts`, `openai.ts`) + dispatch
  (`index.ts`) + WAV utilities (`wav-utils.ts` with `pcmToWav` +
  `isValidWav` helpers ported verbatim from UMB precedent
  `generate-narrator.ts:127-162`).
- `videos/trailer/scripts/lib/` — shared utilities: `atomic-write.ts`,
  `ffmpeg.ts` (preflight + runFFmpegJson helper), `phase-0-exit.ts`
  (parser), `cost-tracker.ts` (cumulative spend tracker with hard
  abort at $30).
- `videos/trailer/scripts/ingest-path-d.ts` — Path D voice-actor WAV
  ingestion (Unit 2.X; conditional).
- `videos/trailer/scripts/hybrid-scream.ts` — Path B hybrid scream
  via ElevenLabs Voice Changer (Unit 2.Y; conditional).
- `videos/trailer/scripts/audit-durations.ts` — Unit 2.4 audit.
- `videos/trailer/scripts/post-process-tts.ts` — Unit 2.5
  FFmpeg post-process pipeline (two-pass loudnorm to -16 LUFS,
  areverse-sandwich silenceremove, scream-attack-preservation
  override, atomic writes).
- `videos/trailer/scripts/stitch-beats.ts` — Unit 2.6 intra-line beat
  stitch (S03 cues have `[BEAT 0.3s]` markers per Phase 1; S04
  payoff is TWO cues per Phase 1 deepening, NOT intra-cue beat).
- `videos/trailer/scripts/stitch-full-audio.ts` — Unit 2.7 reconciliation
  sign-off audio stitch (overrun-aware; supports both kept-via-A/B and
  cut scream outcomes).
- `videos/trailer/scripts/generate-audio-manifest.ts` — Unit 2.8 codegen.
- `videos/trailer/public/audio/lines/` — one WAV per cue (per-line
  granularity, NOT one-monolithic-VO).
- `videos/trailer/public/audio/lines/raw/` — preserved pre-post-process
  WAVs for fallback.
- `videos/trailer/sample-eval/voice-pipeline/` — duration validation,
  word-count reconciliation against Phase 1 budget, signoff log,
  cadence-consistency record, JSONL generation log, spend log,
  Path D / Path B intake records.
- `videos/trailer/src/lib/audio-manifest.ts` + `audio-manifest-types.ts` —
  typed manifest Phase 4 consumes (`AUDIO_ASSETS: readonly AudioAsset[]`).
  Initial scaffold stub ships `[] as const` so Phase 4 imports always
  resolve; Unit 2.8 codegen overwrites the data file post-reconciliation.
- The VOICE_DIRECTION anti-pattern guard codified as **THREE per-engine
  variants** at each engine client's API call site (per Phase 0
  Unit 0.2 Key Tech Decisions §VOICE_DIRECTION).
- Audio post-processing applied (two-pass loudnorm to -16 LUFS,
  areverse-sandwich silence trim, per-cue fade-in/fade-out shape
  override hooks, mono 48kHz PCM_S16LE lock) so Phase 4 imports
  WAVs at predictable level + duration + channel layout.

Phase 2 exits when:

1. Every `BURNED_TRAILER_LINES` cue (filtered by Phase 0 outcomes —
   excluding scream cue if R5=cut) has a corresponding post-processed
   WAV in `public/audio/lines/`.
2. Every WAV passes duration tolerance vs Phase 1 word-count-pacing
   budget — per-cue-type bands: **sustained ±5% / list ±7% / payoff
   ±4% / scream ±20%**.
3. Every WAV passes loudness audit: integrated -16 LUFS ±1 LU; true-
   peak ≤-1.5 dBTP.
4. `cadence-consistency-signoff.txt` sentinel written by Unit 2.3
   (canary cleared).
5. `phase-1-reconciliation-signoff.txt` sentinel written by Unit 2.7
   (Briggsy signs off on full-runtime audio-only playback — lines +
   intra-line beats stitched, music-bed bypassed, no video).
6. `audio-manifest.ts` codegen has typechecked + Phase 4 imports
   resolve cleanly (verified via `pnpm typecheck` in `videos/trailer/`).
7. Cumulative TTS spend ≤$30 (per `tts-spend.json`).

---

## Problem Frame

Phase 0 Unit 0.2 produced TTS evaluation WAVs for 3 sample paragraphs
across multiple engine candidates. That run validated **whether a
path clears the Sterling-CODED cadence-match bar**. It did NOT produce
trailer-ready WAVs.

Phase 2 produces the trailer's actual audio. Differences from Phase 0
Unit 0.2:

- **Scale**: 15 distinct line cues across 6 scenes (~216 words) vs
  Phase 0's 3 paragraph samples. **(Cue count is 15 in the standard
  R5=kept branch; 14 if R5=cut.)**
- **Engine + voice path locked**: Phase 2 generates against the single
  winning path Phase 0 recorded in `PHASE-0-EXIT.md` §Voice Cast Lock.
  Phase 2 does NOT maintain a runtime engine switch — the engine is
  resolved from the exit document, not from a `TTS_ENGINE` env var.
- **Per-line granularity**: each cue produces its own WAV (not one
  monolithic VO). Phase 4 places each WAV via `<Sequence
  from={asset.startFrame}><Audio src={staticFile(asset.staticPath)} />
  </Sequence>`. (`<Audio>` from `@remotion/media` has NO `from` prop;
  offsets via `<Sequence>` per Phase 0 ADR #5.)
- **Post-processing**: two-pass loudnorm to -16 LUFS + areverse-
  sandwich silence-trim + per-cue fade override hooks applied so WAVs
  land at predictable level + duration + channel layout. The
  cadence-spec STEERING produces the *performance*; the post-processing
  produces the *technical* uniformity Phase 4 needs.
- **Anti-pattern hardening**: VOICE_DIRECTION guard codified
  permanently as THREE per-engine variants at each engine client's API
  call site (per Phase 0 Unit 0.2 Key Tech Decisions §VOICE_DIRECTION;
  Phase 0 had the guards in eval-script, Phase 2 lifts to production-
  script).
- **Path branching**: Phase 2 plan handles ALL four Phase 0 outcome
  branches explicitly — Path A (TTS via preset voice), Path B (TTS via
  Briggsy Instant Voice Clone), Path C (Gemini/OpenAI engine), Path D
  (voice-actor delivered WAVs — Unit 2.X ingestion replaces Units
  2.2-2.4). Plus the R5 scream sub-branch: Path A (TTS `[shouts]`
  tag), Path B (hybrid ElevenLabs Voice Changer — Unit 2.Y), or cut
  (skip scream cue entirely).

The largest risk Phase 2 manages: **drift between Phase 1's word-
count-pacing estimate and Phase 2's actual WAV duration.** Phase 1
estimates per-cue durations against three wps bands: **sustained
1.9-2.3 wps / list 2.4-2.6 wps / payoff 1.6-1.8 wps**. Phase 2
generates the WAV; the actual duration may drift ±2-10% from estimate
depending on cue type. If line durations drift, Phase 4's frame-
accurate scene composition breaks — either VO runs past the scene
boundary, or scene visuals run over silence.

Phase 2's reconciliation (Unit 2.7) routes drift through a **three-
tier escalation ladder** that intentionally treats Phase 1 reopen as
the LAST resort, not the first:

- **Tier 0 — Absorbed silently into Phase 4 intra-scene flex** if
  drift ≤±2% per cue AND total ≤±1%. Phase 2 logs it; no action.
- **Tier 1 — Phase 2 regen** with pacing-adjusted steering if drift
  >Tier-0 but <±5% per cue / <±2% total. Re-run cue with cadence
  steering adjusted on the per-engine adapter file (no Phase 1 touch).
- **Tier 2 — Phase 1 line-trim** if drift >Tier-1 on a specific cue
  (>±5% sustained / >±7% list / >±4% payoff / >±20% scream).
  Trim 1-3 words from cue.text in `script.ts` + BEAT-SHEET.md sync
  via Phase 1's `script.test.ts`. Phase 1 reopen procedure invoked
  (Unit 2.7 Step 2a).
- **Tier 3 — Phase 1 timing.ts adjustment** if Tier-2 line-trim
  unavailable (e.g., line already minimal) OR multiple cues drift in
  same direction (systemic). Expand/contract a scene's frame budget.
  Roadmap status update required.
- **Tier 4 — TOTAL_FRAMES adjustment** (last resort). Move 2850 →
  2820 or 2880; R7 allows 90-100s (2700-3000 frames). Roadmap-level
  reopening.

Expected drift profile (NOT triggering reconciliation): ±3-7% per cue
across TTS variance norms. The reconciliation is for genuine breakage,
not routine variance.

---

## Critical Constraints Surfaced by Research

Cross-reference: roadmap §5, Phase 0 §Critical Constraints, Phase 1
§Critical Constraints.

### Per-line WAV granularity, not monolithic VO

UMB v3 generated one WAV per narrator scene (~9 WAVs for 9 scenes).
BURNED's cascade alone has 8+ distinct cues with frame-accurate timing
requirements. **Per-line granularity** lets Phase 4 place each cue at
its exact frame via `<Sequence from={asset.startFrame}><Audio
src={staticFile(asset.staticPath)} /></Sequence>` without depending
on total-WAV-duration alignment.

Trade-off: more WAV files (14-15 vs UMB's 9). Mitigation: file naming
convention encodes scene + cue-frame + voice cell
(`s04-cue-1290-dash.wav`) derived FROM Phase 1's `Line` type via a
`cueFilename(line: Line): string` helper — NOT stored on the line
itself. Phase 4 imports are mechanical via the Phase 2 manifest.

**Filename convention (DEEPENING — voice union aligned to Phase 1):**
`s{NN}-cue-{frame}-{voice}.wav` where `voice ∈ {dash, sable, janet,
vera}`. The scream cue is `s05-cue-2400-dash.wav` (NOT `dash-scream`)
because Phase 1's contract treats it as a regular Dash line with
`cadenceAdapter.prefixTag: '[shouts]'` steering, not a separate voice
cell.

### VOICE_DIRECTION anti-pattern is a code-level guard, not a process

Per `feedback-narrator-voice-direction.md` (made twice; cost UMB
production runs): Gemini and ElevenLabs and OpenAI TTS engines READ
ALL TEXT VERBATIM. A line that includes "Dash, deadpan: ..." in the
script body produces a WAV where the voice literally says "Dash
deadpan colon" before delivering the line.

Phase 0 Unit 0.2 Key Tech Decisions §VOICE_DIRECTION codifies THREE
per-engine guard variants. Phase 2 reinforces by lifting each guard
to its engine client's inline API-call site:

```ts
// ELEVENLABS: text payload may contain ONLY the script + sparse
//   [bracket] audio tags interpreted by v3 (e.g., [shouts], [whispers]).
//   Free prose mixed into the text gets read aloud verbatim.
//   Cadence-spec maps to voice_settings numbers + sparse inline
//   bracket tags + an (optional) Voice Design prompt to mint the
//   voice — NEVER to free prose appended to the script payload.

// GEMINI 2.5 FLASH PREVIEW TTS: cadence-spec lives in the Director's Chair
//   "Director's Notes" section of the prompt, ABOVE the Transcript
//   section marker. The section markers (## DIRECTOR'S NOTES,
//   ### TRANSCRIPT) are load-bearing — without them, the cadence-spec
//   will be spoken aloud as part of the audio.

// OPENAI gpt-4o-mini-tts: cadence-spec goes in the `instructions`
//   API parameter, NEVER in `input`. These are separate top-level
//   fields and must stay that way.
```

Each variant lands as an inline comment ABOVE its engine's API call
in `tts-clients/{elevenlabs,gemini,openai}.ts`. Lint-grep candidate
follow-up: assert all three guard variants exist in source via grep.

**Per-engine cadence-spec adapter consumption (DEEPENING).** Phase 0
Unit 0.2 Step 1.5 ships THREE adapter files derived from the source
`cadence-spec.md`:

| Engine | Adapter file | Contains |
|--------|--------------|----------|
| **ElevenLabs v3** | `cadence-spec-elevenlabs.json` | Numeric `voice_settings` + per-paragraph bracket-tag annotations + optional Voice Design prompt. ElevenLabs v3 does NOT accept long-form natural-language steering — needs numbers + sparse tags. |
| **Gemini 2.5 Flash Preview TTS** | `cadence-spec-gemini.md` | Director's Chair structured prompt with section markers (`## AUDIO PROFILE`, `## SCENE`, `## DIRECTOR'S NOTES`, `### TRANSCRIPT`). |
| **OpenAI gpt-4o-mini-tts** | `cadence-spec-openai.md` | ~500-word instruction string for the `instructions` API parameter. |

Phase 2 reads `videos/trailer/sample-eval/r4-dash/cadence-spec-${engine}.{json|md}`
matching the engine PHASE-0-EXIT.md locked. The raw `cadence-spec.md`
is the source of truth Phase 0 produced; Phase 2 NEVER consumes it
directly — only the per-engine adapter.

**Per-line cadenceAdapter consumption (DEEPENING).** Phase 1's `Line`
type ships per-cue `cadenceAdapter?: { engine, prefixTag, notes }`
(e.g., `prefixTag: '[shouts]'` on S05-scream cue). Phase 2's engine
clients prepend `cue.cadenceAdapter?.prefixTag ?? ''` to the text
payload at the API call site — NOT hardcoded `voice === 'dash-scream'`
logic (the old Phase 2 draft's pattern). Engines without inline-tag
support (Gemini, OpenAI for some tag types) ignore the prefixTag and
rely on the per-engine cadence-spec adapter for systemic cadence
steering.

### Shell-injection safety rule for shell-out scripts

Node's `child_process` module exposes two synchronous functions
relevant here: the shell-interpolating one (BANNED in Phase 2) and
the argv-array one (`execFileSync`, REQUIRED). The shell-interpolating
variant builds a system shell command from a template literal — known
injection-vector class. Project security rule: **use `execFileSync`
(synchronous variant of `execFile`)** with argv arrays. Phase 2
scripts shell out to FFmpeg + FFprobe. This is the project-wide
standard per the `security_reminder_hook` guidance.

```ts
// CORRECT — argv array, no shell expansion
import { execFileSync } from 'node:child_process';
execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', file]);
```

All Phase 2 scripts use this pattern. Filenames in Phase 2 are
internally-generated (derived from `BURNED_TRAILER_LINES`) so injection
risk is low even under shell, but the pattern discipline matters —
agents working on the trailer should not learn the shell-interpolating
variant as the project style. The `runFFmpegJson` + `runFFprobe`
helpers in `scripts/lib/ffmpeg.ts` (see Unit 2.0) capture stderr via
`stdio: ['ignore', 'pipe', 'pipe']` so parse-from-stderr operations
(loudnorm pass-1 JSON) work reliably.

### FFmpeg version pin (DEEPENING)

Phase 2 hard-depends on FFmpeg + FFprobe. Pin: **FFmpeg ≥5.0 minimum;
≥6.0 recommended**.

- 5.0+ required: loudnorm `print_format=json` (pass-1 measurement),
  loudnorm `linear=true` mode (pass-2 application), `start_silence`
  parameter on silenceremove, areverse-sandwich pattern reliability.
- 6.0+ recommended: silenceremove `detection=peak|rms` parameter
  (cleaner trim on noisy backgrounds), refined `afade` curve variants.

Preflight check in Unit 2.0 runs `ffmpeg -version` + `ffprobe -version`
on PATH and parses the first line; fail-fast with install instructions
(Windows: `winget install Gyan.FFmpeg`; macOS: `brew install ffmpeg`;
Linux: `apt-get install ffmpeg`) on missing or insufficient version.

### Engine billing matters at production scale

Phase 0 Unit 0.2 capped engine-eval spend at $50. Phase 2 budget:

- **ElevenLabs v3**: ~216 words ≈ **1300 chars** (avg ~6 chars/word
  including spaces — DEEPENING CORRECTION; original plan's "1000
  chars" was 35% off) at $0.30/1000-chars (Creator tier) = ~$0.39
  per full run. With 5 iterations (canary + initial + 3 regen for
  drift) = **~$2**. Worst case with per-cue regen ladder
  (~30 single-cue generations across the eval) = **~$5-6**.
- **Gemini 2.5 Flash Preview TTS**: ~$0.075/1M-output-tokens, ~216
  words ≈ ~300 output tokens per cue, 15 cues ≈ **<$0.01** per run.
  Negligible at any iteration count.
- **OpenAI gpt-4o-mini-tts**: $15/1M-chars ≈ **$0.02 per run**.

Phase 2 budget: **$30 ceiling** for all production TTS generation +
regen iterations + Path B Voice Changer minutes (negligible — ~25
chars billed for one scream conversion). (Cumulative with Phase 0
Unit 0.2's $50 cap = $80 across both phases — well within budget.)

**Cumulative spend tracker (DEEPENING).** Phase 2 enforces the
ceiling via `scripts/lib/cost-tracker.ts`. Each successful TTS API
call appends to `videos/trailer/sample-eval/voice-pipeline/tts-spend.json`
with `{ runId, ts, cueId, engine, charsBilled, estimatedCostUsd }`.
At script startup the tracker sums lifetime spend; if total >$30 the
script aborts with:

```
ERROR: Phase 2 TTS budget exceeded: $32.17 > $30 ceiling.
Either:
  (a) Set TTS_BUDGET_OVERRIDE=1 in .env to continue (Briggsy
      approval recommended).
  (b) Reduce iteration count via --only / --scene targeting.
  (c) Reset spend tracker: rm sample-eval/voice-pipeline/tts-spend.json
      (only if starting a fresh budget cycle post-rework).
```

If Path D (voice actor) won Phase 0 Unit 0.2, Phase 2 budget rolls
to whatever the actor's per-revision rate allows (separate line item;
not within the $30 TTS ceiling). Per Phase 0 Unit 0.2 ladder Path D
Sub-phase 0a Brief Memo, Briggsy explicitly approves the actor spend
before casting begins. Unit 2.X handles ingestion of actor-delivered
WAVs.

### Audio post-processing has a quality bar (DEEPENING — LUFS + two-pass)

Raw TTS output is rarely Phase-4-ready. Issues:

- **Volume inconsistency** across WAVs (some lines louder).
- **Leading/trailing silence** (engines often include 200–500ms of
  silence at clip boundaries).
- **Channel layout drift** (different engines return different
  channel counts — ElevenLabs default mono, Gemini PCM mono after
  pcmToWav wrap, OpenAI mono).
- **Sample rate drift** (ElevenLabs 22050/44100, Gemini 24000,
  OpenAI 24000 — Phase 4 wants uniform 48000).

Phase 2 includes post-processing via FFmpeg (NEW for BURNED — no UMB
precedent; UMB shipped raw Gemini PCM at 24kHz unprocessed because
its NLE editing pass handled normalization downstream):

- **`loudnorm` TWO-PASS** targeting **-16 LUFS** (DEEPENING — was -23
  broadcast). Rationale: X/Twitter normalizes to ~-14 LUFS; YouTube
  to -14; Apple Podcasts to -16. A -23 LUFS master uploaded to X
  plays audibly QUIETER than surrounding feed content (X's linear
  normalization gains UP but doesn't restore dynamic range). -16 LUFS
  is the compromise: louder than broadcast (-23), softer than full
  platform-targeted (-14); preserves dynamic range for Sterling-CODED
  cadence + R3 payoff contrast.
  
  Single-pass loudnorm is **INACCURATE for short clips <30s** per
  k.ylo.ph/2016/04/04/loudnorm.html (FFmpeg author's canonical guide).
  Every Phase 2 cue is in the danger zone (0.9s to ~12s). Two-pass
  workflow: Pass 1 measures (`loudnorm=I=-16:LRA=9:TP=-1.5:print_format=json
  -f null -`), parses JSON from stderr; Pass 2 applies with measured
  values + `linear=true` for pure linear gain (NOT dynamic compression).
  
  Final loudnorm params: `loudnorm=I=-16:LRA=9:TP=-1.5:measured_I=...:
  measured_TP=...:measured_LRA=...:measured_thresh=...:offset=...:
  linear=true:print_format=summary`.

- **`silenceremove` areverse-sandwich pattern** (DEEPENING — was
  `start_periods=1:start_duration=0:...:stop_periods=1:stop_duration=0:...`
  which can prematurely cut interior silence and drop final syllables
  per FFmpeg silenceremove docs). Correct pattern trims ONLY leading
  + trailing:
  
  ```
  silenceremove=start_periods=1:start_silence=0.05:start_threshold=-50dB:detection=peak,
  areverse,
  silenceremove=start_periods=1:start_silence=0.05:start_threshold=-50dB:detection=peak,
  areverse
  ```
  
  Threshold `-50dB` for paced lines; `-30dB` for any non-scream
  expressive cue. **SKIP silenceremove entirely for the scream cue
  (S05-2400)** — the scream IS the attack envelope; trimming would
  shave the leading transient and break stamp-coincident A/V sync.
  
- **`afade` per-cue fade-in/fade-out** with per-cue overrides
  (DEEPENING). Default: 30ms in / 30ms out, linear. Overrides:
  - S04 payoff cue 1950: **5ms** in (hard land coincident with
    heavy 16-frame stamp slap) / 30ms out.
  - S04 "Phrasing." cue (S06 2790): 30ms in / **50ms** out
    (let the deadpan punchline ring).
  - Scream cue (S05 2400): **0ms** in (preserve attack envelope) /
    30ms out + `curve=qsin` (quarter-sine — smoother than default
    linear `tri` curve, matches mid-century-bumper audio aesthetic).

- **Channel + sample rate lock**: `-ar 48000 -ac 1 -c:a pcm_s16le`
  on every FFmpeg invocation (DEEPENING — was missing `-ac 1`).
  Narration is mono; saves ~50% file size; eliminates per-engine
  layout drift; matches anullsrc silence generator's
  `channel_layout=mono` (eliminates concat-demuxer codec-mismatch
  errors per FFmpeg docs).

- **Loudness measurement audit** post-process: re-run `ffprobe
  -show_entries format_tags=loudnorm` after each cue's post-process
  to verify integrated -16 LUFS ±1 LU. Record in
  `loudness-audit.jsonl` per cue.

### Per-cue tolerance bands by cue type (DEEPENING)

Phase 1's wps bands (1.9-2.3 sustained / 2.4-2.6 list / 1.6-1.8 payoff)
inform per-cue-type drift tolerance:

```ts
const TOLERANCE_BY_TYPE: Record<CueType, number> = {
  sustained: 0.05,  // ±5% — paced lines
  list:      0.07,  // ±7% — list reads tolerate slight pace variance
  payoff:    0.04,  // ±4% — payoff lines are visual-sync load-bearing
  scream:    0.20,  // ±20% — expressive cue, low-wordcount
};
```

Single-word expressive cues ("…Phrasing.") use the `scream` tolerance
(±20%) via `Line.driftToleranceOverride?: 0.20`. Cue type is determined
by Phase 1's `Line.cueType` field — flagged as cross-phase Phase 1
follow-up amendment if not present (Phase 2 deepening surfaces the
gap; Phase 1 reopens to add the field).

### Atomic-write pattern (DEEPENING)

All FS writes in Phase 2 use atomic-rename pattern via
`scripts/lib/atomic-write.ts` helper:

```ts
export function atomicWriteSync(path: string, data: Buffer | string): void {
  const tmp = `${path}.tmp`;
  try {
    writeFileSync(tmp, data);
    renameSync(tmp, path);  // POSIX rename is atomic on same FS
  } catch (e) {
    try { unlinkSync(tmp); } catch {}  // best-effort cleanup
    throw e;
  }
}
```

Applied to: cue WAV writes (Unit 2.2), post-process outputs (Unit 2.5
— with `${final}.tmp` intermediate), manifest emission (Unit 2.8),
stitch outputs (Unit 2.6 + 2.7). Mid-process crash leaves either the
original intact OR the new file complete — never partial. Combined
with hash-based skip-or-regen (sidecar `${wav}.meta.json` tracks
sha256 of inputs), re-runs after crash recovery work correctly.

### Brainstorm cut-handling for R5 propagates (DEEPENING — three branches)

Phase 0 Unit 0.6 outcome is recorded in PHASE-0-EXIT.md §R5 Scream
Outcome as `[kept-via-A (TTS) | kept-via-B (hybrid) | cut]`. Phase 2's
generator branches at cue 2400:

- **`kept-via-A`**: route to Unit 2.2 `elevenlabs.ts` with
  `cadenceAdapter.prefixTag = '[shouts]'` prepended to text. Default
  Path A pipeline.
- **`kept-via-B`**: route to **Unit 2.Y** — Hybrid Scream Voice Changer.
  Reads source recording from `sample-eval/r5-scream/source-recording.wav`
  (Phase 0 deliverable; Briggsy-recorded human scream at peak ~-3
  dBFS). Calls ElevenLabs Speech-to-Speech: `POST /v1/speech-to-speech/
  {voiceId}` with `model_id: 'eleven_multilingual_sts_v2'`, multipart
  audio file, `remove_background_noise: false` (assumes clean source).
  Output `s05-cue-2400-dash.wav` routes into Unit 2.5 post-processing
  with scream-attack-preservation overrides.
- **`cut`**: skip cue 2400 entirely. AUDIO_ASSETS manifest omits the
  entry (`AUDIO_ASSETS.filter(a => a.filename !== 's05-cue-2400-dash.wav')`).
  Phase 4 places gameplay-audio-chuckle SFX (Phase 5 deliverable) at
  the budgeted frame instead. No orphan WAV; manifest typechecks.

---

## Requirements Trace

- **R4** (Dash sustained narration ~90% runtime): Unit 2.4 (Dash
  generation run); Unit 2.7 (verification — Phase 1 Unit 1.3 Step 4
  arithmetic re-validated against actual WAV durations).
- **R5** (Vera scream cameo, authentic or cut): Unit 2.6 (scream
  generation, conditional on Phase 0 Unit 0.6 outcome) — see Step 5
  inside Unit 2.4 + the intra-line beat note in Unit 2.6.
- **R6** (Pendleton vocabulary discipline): Unit 2.1 (line-set
  ingestion) re-runs the R6 grep before any API call; Phase 1 Unit
  1.2 grep is the upstream check, Phase 2 is the redundant audit.
- **R14** (cold-open speaker): Unit 2.4 cold-open cue.
- **R15** (on-screen text signal layer): not directly Phase 2 — but
  R15 stamps DO sometimes coincide with VO cues; Phase 2's cue
  timings inform Phase 3's R15 chrome animation timing.

---

## Key Technical Decisions

- **Phase 1's `script.ts` is the single source of truth for line
  content + frame placement.** Phase 2 imports `BURNED_TRAILER_LINES:
  readonly Line[]` from `videos/trailer/src/lib/script.ts` directly.
  Phase 2 NEVER re-defines line text, voice, or frame data. Phase 1's
  existing `script.test.ts` is the BEAT-SHEET.md ↔ script.ts drift
  gate; Phase 2 doesn't duplicate that test. Phase 2 adds a separate
  `script-coverage.test.ts` asserting every `BURNED_TRAILER_LINES`
  entry has a corresponding generated WAV after a full pipeline run.
  (DEEPENING — was a parallel `script-lines.ts` + `SCRIPT_CUES`
  literal that drifted from Phase 1's deepened text; gutted.)
- **`generate-dash-tts.ts` is per-cue, engine-from-PHASE-0-EXIT.md,
  idempotent.** Skip logic uses **hash-based invalidation** (sidecar
  `${wav}.meta.json` tracks `sha256(text + engine + voice_id +
  cadenceAdapter)`). Skip iff WAV exists AND sidecar SHA matches
  current SHA. Stale WAVs (text edited since generation) auto-
  regenerate without requiring `--force`. `--force` regenerates all
  cues unconditionally (waste of $2-6 budget — use sparingly).
- **Per-cue WAV naming convention**: `s{NN}-cue-{frame}-{voice}.wav`.
  Examples: `s01-cue-60-sable.wav` (cold-open speaker per Phase 0
  Unit 0.3 outcome), `s04-cue-1950-dash.wav`, `s05-cue-2400-dash.wav`
  (scream — voice cell IS dash; cadenceAdapter steers the shout).
  Derived FROM Phase 1's `Line` via `cueFilename(line: Line): string`
  helper — never stored on the Line itself.
- **VOICE_DIRECTION inline guard codified per-engine at API call site
  (3 variants)** per Phase 0 Unit 0.2 Key Tech Decisions. Each engine
  client's API call has its variant comment inline; see Critical
  Constraints §VOICE_DIRECTION above for the three guards.
- **Cadence-spec lives in the engine's steering API surface via the
  per-engine adapter file** (Phase 0 Unit 0.2 Step 1.5 deliverable).
  Engine-specific routing reads the matching adapter:
  - **ElevenLabs v3**: reads `cadence-spec-elevenlabs.json`; spreads
    `voice_settings` from JSON; applies sparse bracket-tag annotations
    per-paragraph from the JSON; optional Voice Design prompt for
    minting a new voice. Plus `previous_text` / `next_text`
    **ENABLED** for same-scene adjacent Dash cues (LOCKED — was
    "Deferred to Implementation"; ElevenLabs SDK confirms these are
    real top-level fields in `BodyTextToSpeechFull` per Context7
    verification).
  - **Gemini 2.5 Flash Preview TTS**: reads `cadence-spec-gemini.md`;
    injects content into Director's Chair section markers
    (`## AUDIO PROFILE` / `## SCENE` / `## DIRECTOR'S NOTES` /
    `### TRANSCRIPT`). `systemInstruction` field is secondary to
    the section-marker pattern (Gemini TTS docs canonically use the
    structured-prompt-in-user-content pattern).
  - **OpenAI gpt-4o-mini-tts**: reads `cadence-spec-openai.md` (~500-
    word distilled instruction); passes via `instructions` API
    parameter; `input` parameter has ONLY the cue text.
  - **Voice actor (Path D)**: cadence-spec is the casting brief; no
    API. Unit 2.X ingests delivered WAVs and routes through Unit 2.5
    post-processing.
- **Per-line `cadenceAdapter` from Phase 1's `Line` type prepends to
  text payload at API call site** for engines with inline-tag support
  (ElevenLabs `[shouts]`; ElevenLabs `[whispers]`; etc.). Engines
  without inline-tag support ignore the prefixTag and rely on the
  per-engine cadence-spec adapter for systemic steering. Replaces
  the old hardcoded `voice === 'dash-scream'` branch in Phase 2's
  draft.
- **Engine selection is from PHASE-0-EXIT.md, NOT a `TTS_ENGINE` env
  var** (DEEPENING — single source of truth). The
  `scripts/lib/phase-0-exit.ts` parser reads the locked engine path
  from the Voice Cast Lock section. CLI `--engine` flag exists for
  canary debug runs but warns loudly if it disagrees with the locked
  value.
- **Engine model version pins per engine** (DEEPENING — promoted from
  "Deferred to Implementation"):
  - ElevenLabs: `model_id: 'eleven_v3'` for cues with
    cadenceAdapter.prefixTag (the `eleven_multilingual_v2` model does
    NOT interpret audio tags — silent failure mode).
  - OpenAI: `model: 'gpt-4o-mini-tts-2025-03-20'` (snapshot pin —
    Context7-verified community-corroborated compliance regression on
    later snapshots like `2025-12-15`).
  - Gemini: `model: 'gemini-2.5-flash-preview-tts'` (was
    `'gemini-3.1-flash-tts'` — does not exist as of 2026 docs).
  - All three values cross-validated with PHASE-0-EXIT.md's engine
    model record + ElevenLabs/OpenAI/Gemini response headers' model
    revision fields (where exposed).
- **Gemini returns base64 PCM, not WAV — `pcmToWav()` wrapper MANDATORY**
  (DEEPENING — port from UMB precedent `generate-narrator.ts:127-155`).
  Gemini PCM is 24kHz / 16-bit / mono. Wrap with 44-byte WAV header
  before returning Buffer. `isValidWav()` runtime guard at the write
  boundary in `generate-dash-tts.ts` catches future regressions
  (RIFF + WAVE magic-byte check at offsets 0-3 + 8-11). ElevenLabs
  (`Accept: audio/wav` header + `output_format` body field) and
  OpenAI (`response_format: 'wav'`) both return properly-formatted
  WAVs — no wrapper needed for those paths.
- **All shell-outs use `execFileSync` with argv arrays**, never the
  shell-interpolating variant. Project-wide security convention
  enforced by `security_reminder_hook`.
- **Phase 2 reconciliation against Phase 1 is mandatory** but routes
  drift through a **three-tier escalation ladder** that intentionally
  treats Phase 1 reopen as the LAST resort, not the first. See
  Problem Frame §Phase 2's reconciliation. Tolerance bands per
  cue type: sustained ±5% / list ±7% / payoff ±4% / scream ±20%.
- **Audio post-processing in FFmpeg via TWO-PASS `loudnorm`** targeting
  **-16 LUFS** (DEEPENING — was -23 broadcast). Two-pass workflow:
  Pass 1 measures via `print_format=json -f null -`; parse JSON from
  stderr; Pass 2 applies measured values with `linear=true` for pure
  linear gain. Single-pass is inaccurate for clips <30s (every Phase 2
  cue is in the danger zone).
- **Atomic-write pattern (DEEPENING)** for every FS write — write to
  `${path}.tmp`, atomic-rename to final on success, delete tmp on
  error. Survives mid-process crashes.
- **Linear (not exponential) backoff** per UMB precedent (DEEPENING).
  All engine clients use `5000 * (attempt + 1) + jitter` ms (5s/10s/15s
  + ~0-1s jitter), max 3 attempts, total retry budget capped at 30s
  per cue. `INTER_CALL_DELAY_MS = 2000` between successful cues to
  avoid burst-rate-limiting on `--force` regen runs.
- **Sentinel-file gating between units (DEEPENING)** — Unit 2.3
  writes `cadence-consistency-signoff.txt` on green canary; Unit 2.4
  asserts sentinel before full-batch generation. Unit 2.7 writes
  `phase-1-reconciliation-signoff.txt` on Briggsy sign-off; Unit 2.8
  asserts before manifest codegen. Prevents accidental out-of-order
  execution.
- **All TTS API keys loaded via `.env`** before script execution.
  Per Briggsy autonomy rule (CLAUDE.md): script auto-loads `.env` via
  `import 'dotenv/config'` — does NOT ask Briggsy to run any shell
  preamble. **Preflight (Unit 2.0)** verifies per-engine keys present
  per the locked engine before any API call.

---

## Implementation Units

Sequential execution order: **2.0 (preflight) → 2.1 (contract verification)
→ 2.2 (generator) → 2.3 (canary, GATES Unit 2.4) → 2.4 (full gen + audit)
→ 2.5 (post-process) → 2.6 (intra-line beats) → 2.7 (reconciliation,
GATES Unit 2.8) → 2.8 (manifest)**.

Conditional branches (executed in place of the default TTS pipeline,
NOT in addition):
- **Unit 2.X** (Path D voice-actor ingestion) replaces Units 2.2-2.4
  when PHASE-0-EXIT.md locks `engine: voice-actor`.
- **Unit 2.Y** (Path B hybrid scream Voice Changer) replaces the
  scream-cue branch of Unit 2.2 when PHASE-0-EXIT.md locks
  `R5 outcome: kept-via-B`.

---

### Unit 2.0 — Prerequisites + Preflight + PHASE-0-EXIT.md Ingest

- [ ] **Unit 2.0: Prerequisites + Preflight + PHASE-0-EXIT.md Ingest**

**Goal:** Verify Phase 2 has everything it needs BEFORE any TTS API
call. Resolve the single source of truth for engine choice + voice
IDs + cadence-spec adapter path + scream outcome + model version pins
by parsing `PHASE-0-EXIT.md`. Surface every gap as a fail-fast error
with concrete remediation instructions.

**Requirements:** Cross-cutting — every Unit 2.1–2.8 depends on
preflight passing.

**Dependencies:** Phase 0 closed (PHASE-0-EXIT.md exists + populated);
Phase 1 closed (`script.ts` + `timing.ts` + BEAT-SHEET.md exist);
trailer subproject scaffolded per Phase 0 Unit 0.1.

**Files:**

- Create: `videos/trailer/scripts/preflight.ts` — entry point invoked
  by every Phase 2 script's `main()`.
- Create: `videos/trailer/scripts/lib/phase-0-exit.ts` — markdown
  parser that extracts the locked engine, voice IDs, scream outcome,
  model pins, cadence-spec adapter path.
- Create: `videos/trailer/scripts/lib/ffmpeg.ts` — version check,
  `runFFmpegJson` (parses pass-1 loudnorm JSON from stderr),
  `runFFprobe` wrappers.
- Create: `videos/trailer/scripts/lib/env.ts` — `assertEnv(key)`
  helper that throws structured error with concrete remediation.
- Create: `videos/trailer/sample-eval/voice-pipeline/preflight-log.md`
  — per-run preflight result; appended on each invocation.

**Approach:**

**Step 1 — Trailer scaffold check.**

```ts
// scripts/preflight.ts
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const TRAILER_ROOT = 'videos/trailer';
const REQUIRED_FILES = [
  'package.json',
  'src/lib/script.ts',            // Phase 1 Unit 1.2 deliverable
  'src/lib/timing.ts',            // Phase 1 Unit 1.1 deliverable
  'BEAT-SHEET.md',                // Phase 1 Unit 1.1+ deliverable
  'PHASE-0-EXIT.md',              // Phase 0 closing deliverable
  'sample-eval/r4-dash/cadence-spec.md',  // Phase 0 Unit 0.2 Step 0
];

for (const rel of REQUIRED_FILES) {
  const abs = join(TRAILER_ROOT, rel);
  if (!existsSync(abs)) {
    throw new Error(
      `Preflight: missing required file ${abs}.\n` +
      `Phase 2 requires Phase 0 + Phase 1 closure. Run Phase 0/1 ` +
      `before invoking Phase 2 scripts.`
    );
  }
}
```

**Step 2 — Trailer package.json devDeps + scripts verification.**

Per Phase 1 Unit 1.1 Step 2a (deepened), `videos/trailer/package.json`
must include `vitest` + `tsx` + `dotenv` in devDependencies plus
`test`, `tts`, `tts:force`, `tts:dry-run` scripts. Verify:

```ts
const pkg = JSON.parse(readFileSync(join(TRAILER_ROOT, 'package.json'), 'utf-8'));
const REQUIRED_DEVDEPS = ['vitest', 'tsx', 'dotenv'];
const missing = REQUIRED_DEVDEPS.filter((k) => !pkg.devDependencies?.[k]);
if (missing.length) {
  throw new Error(
    `Preflight: missing devDependencies in ${TRAILER_ROOT}/package.json: ` +
    `${missing.join(', ')}.\n` +
    `Run: cd ${TRAILER_ROOT} && pnpm add -D ${missing.join(' ')}`
  );
}
```

**Step 3 — FFmpeg + FFprobe version check.**

```ts
// scripts/lib/ffmpeg.ts
import { execFileSync } from 'node:child_process';

const MIN_FFMPEG_VERSION = 5;

export function ffmpegPreflight(): void {
  for (const bin of ['ffmpeg', 'ffprobe']) {
    let output: string;
    try {
      output = execFileSync(bin, ['-version'], {
        encoding: 'utf-8',
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch (e: unknown) {
      const code = (e as { code?: string }).code;
      throw new Error(
        `Preflight: ${bin} not found on PATH (${code ?? 'unknown error'}).\n` +
        `Install:\n` +
        `  Windows: winget install Gyan.FFmpeg  OR  choco install ffmpeg\n` +
        `  macOS:   brew install ffmpeg\n` +
        `  Linux:   apt-get install ffmpeg`
      );
    }
    const match = /version (\d+)\.(\d+)(?:\.(\d+))?/.exec(output);
    if (!match) {
      throw new Error(`Preflight: ${bin} returned unparseable version: ${output.split('\n')[0]}`);
    }
    const major = parseInt(match[1], 10);
    if (major < MIN_FFMPEG_VERSION) {
      throw new Error(
        `Preflight: ${bin} ${match[1]}.${match[2]} is below minimum ${MIN_FFMPEG_VERSION}.0.\n` +
        `Upgrade per install instructions above (loudnorm two-pass + areverse-silenceremove require ≥5.0).`
      );
    }
    console.log(`OK ${bin} ${match[1]}.${match[2]}`);
  }
}
```

**Step 4 — `PHASE-0-EXIT.md` parser.**

Phase 0 deepening locked the PHASE-0-EXIT.md template (Phase 0 plan
lines 1819-1897). Parser extracts the locked values:

```ts
// scripts/lib/phase-0-exit.ts
import { readFileSync } from 'node:fs';

export interface Phase0ExitConfig {
  /** Winning Path A/B/C/D — drives engine routing. */
  clearedPath: 'A' | 'B' | 'C' | 'Sub-phase-0a-D' | 'Brainstorm-Restructure';
  /** Locked engine identifier — matches Line.cadenceAdapter.engine enum. */
  engine: 'elevenlabs-v3' | 'gemini-tts' | 'openai-tts' | 'voice-actor';
  /** Per-engine model ID pin (e.g., 'eleven_v3', 'gpt-4o-mini-tts-2025-03-20'). */
  modelId: string;
  /** Per-voice voice IDs (e.g., dash → '21m00Tcm4TlvDq8ikWAM'). */
  voiceIds: Readonly<Record<'dash' | 'sable' | 'janet' | 'vera', string | null>>;
  /** Path to the per-engine cadence-spec adapter file (per Phase 0 Step 1.5). */
  cadenceAdapterPath: string;
  /** R5 scream outcome from Unit 0.6. */
  r5Outcome: 'kept-via-A' | 'kept-via-B' | 'cut';
  /** R14 cold-open speaker name (locked from Unit 0.3 outcome). */
  coldOpenSpeaker: 'sable' | 'janet' | 'vera';
  /** R14 cold-open line text (verbatim from Unit 0.3 lock). */
  coldOpenLine: string;
}

export function parsePhase0Exit(path = 'videos/trailer/PHASE-0-EXIT.md'): Phase0ExitConfig {
  const md = readFileSync(path, 'utf-8');

  const findSection = (header: string): string => {
    const re = new RegExp(`## ${header}\\s*\\n([\\s\\S]*?)(?=^## |\\Z)`, 'm');
    const m = re.exec(md);
    if (!m) throw new Error(`PHASE-0-EXIT.md missing section: ## ${header}`);
    return m[1];
  };
  const findField = (section: string, key: string): string => {
    const re = new RegExp(`^- ${key}:\\s*(.+)$`, 'm');
    const m = re.exec(section);
    if (!m) throw new Error(`PHASE-0-EXIT.md section missing field: ${key}`);
    return m[1].trim();
  };

  const voiceCast = findSection('Voice Cast Lock \\(Unit 0\\.2\\)');
  const scream = findSection('R5 Scream Outcome \\(Unit 0\\.6\\)');
  const r14 = findSection('R14 Cold-Open Line Lock \\(Unit 0\\.3\\)');

  return {
    clearedPath: findField(voiceCast, 'Cleared path') as Phase0ExitConfig['clearedPath'],
    engine: findField(voiceCast, 'Engine') as Phase0ExitConfig['engine'],
    modelId: findField(voiceCast, 'Model ID'),  // Phase 0 template extension per Phase 2 deepening
    voiceIds: {
      dash:  findField(voiceCast, 'Voice ID / actor identifier'),
      sable: tryFindField(voiceCast, 'Sable voice ID'),
      janet: tryFindField(voiceCast, 'Janet voice ID'),
      vera:  tryFindField(voiceCast, 'Vera voice ID'),
    },
    cadenceAdapterPath: findField(voiceCast, 'Engine-adapter file path'),
    r5Outcome: findField(scream, 'Outcome').replace(/\s*\(.*\)\s*$/, '') as Phase0ExitConfig['r5Outcome'],
    coldOpenSpeaker: findField(r14, 'Speaker character').toLowerCase() as Phase0ExitConfig['coldOpenSpeaker'],
    coldOpenLine: findField(r14, 'Line \\(verbatim\\)'),
  };
}

function tryFindField(section: string, key: string): string | null {
  try { return new RegExp(`^- ${key}:\\s*(.+)$`, 'm').exec(section)?.[1].trim() ?? null; }
  catch { return null; }
}
```

**Cross-phase Phase 0 follow-up amendment surfaced**: Phase 0
PHASE-0-EXIT.md template needs to add `Model ID:` field under Voice
Cast Lock (currently mentioned only in Phase 0 budget reconciliation
section). And add per-voice-cell voice ID fields (Sable / Janet /
Vera) when those are the locked cold-open speakers. Flag for Phase 0
re-deepen — Phase 2 deepening surfaces the gap, Phase 0 absorbs.

**Step 5 — Per-engine `.env` key check.**

```ts
// scripts/lib/env.ts
import 'dotenv/config';  // auto-load .env per Briggsy autonomy rule

const REQUIRED_BY_ENGINE: Readonly<Record<string, readonly string[]>> = {
  'elevenlabs-v3': ['ELEVENLABS_API_KEY'],
  'gemini-tts':    ['GEMINI_API_KEY'],
  'openai-tts':    ['OPENAI_API_KEY'],
  'voice-actor':   [],  // no API calls; Unit 2.X ingestion only
};

export function assertEnv(key: string): string {
  const v = process.env[key];
  if (!v) {
    throw new Error(
      `Preflight: missing required .env key '${key}'.\n` +
      `Add to .env at BURNED project root. See PHASE-0-EXIT.md ` +
      `Voice Cast Lock for the locked voice IDs.`
    );
  }
  return v;
}

export function assertEngineEnv(engine: string): void {
  const required = REQUIRED_BY_ENGINE[engine];
  if (!required) throw new Error(`Preflight: unknown engine '${engine}'`);
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length) {
    throw new Error(
      `Preflight: missing .env keys for engine '${engine}': ${missing.join(', ')}.\n` +
      `Set in .env at BURNED project root.`
    );
  }
}
```

**Step 6 — Per-cell voice ID assertion (post Phase-0-Exit parse).**

```ts
// preflight.ts (continued)
import { parsePhase0Exit } from './lib/phase-0-exit';
import { assertEngineEnv } from './lib/env';

const cfg = parsePhase0Exit();
assertEngineEnv(cfg.engine);

// Voice ID per active voice cell — fails fast if the locked Phase 0
// outcome references a cell whose env var is unset.
const activeVoices: Array<keyof typeof cfg.voiceIds> = ['dash', cfg.coldOpenSpeaker];
if (cfg.r5Outcome !== 'cut') activeVoices.push('dash');  // scream cue uses dash voice
for (const cell of new Set(activeVoices)) {
  if (cfg.engine !== 'voice-actor' && !cfg.voiceIds[cell]) {
    throw new Error(
      `Preflight: PHASE-0-EXIT.md missing voice ID for active cell '${cell}'.\n` +
      `Update PHASE-0-EXIT.md §Voice Cast Lock with the engine-specific voice identifier.`
    );
  }
}
```

**Step 7 — Cadence-spec adapter file check.**

```ts
// preflight.ts (continued)
import { existsSync } from 'node:fs';

if (cfg.engine !== 'voice-actor' && !existsSync(cfg.cadenceAdapterPath)) {
  throw new Error(
    `Preflight: per-engine cadence-spec adapter missing: ${cfg.cadenceAdapterPath}.\n` +
    `Phase 0 Unit 0.2 Step 1.5 should ship this file. Re-run Phase 0 Step 1.5 ` +
    `or verify PHASE-0-EXIT.md §Voice Cast Lock 'Engine-adapter file path:' is correct.`
  );
}
```

**Step 8 — Sentinel sanity for downstream gate units.**

`preflight()` is non-destructive — only checks. Each downstream Phase
2 script invokes:

```ts
// generate-dash-tts.ts, audit-durations.ts, post-process-tts.ts, etc.
import { ffmpegPreflight } from './lib/ffmpeg';
import { parsePhase0Exit } from './lib/phase-0-exit';
import { assertEngineEnv } from './lib/env';

async function main() {
  ffmpegPreflight();
  const cfg = parsePhase0Exit();
  assertEngineEnv(cfg.engine);
  // ... unit-specific logic ...
}
```

**Step 9 — Preflight log.**

After each invocation, append to
`sample-eval/voice-pipeline/preflight-log.md`:

```md
## Preflight 2026-MM-DD HH:MM
- ffmpeg: 6.1.1 ✓
- ffprobe: 6.1.1 ✓
- PHASE-0-EXIT.md parsed: engine=elevenlabs-v3, dash voice=21m00Tcm4..., model=eleven_v3
- R5 outcome: kept-via-A
- Cold-open speaker: sable
- Cadence adapter: sample-eval/r4-dash/cadence-spec-elevenlabs.json ✓
- .env keys verified for engine elevenlabs-v3 ✓
```

**Patterns to follow:**

- UMB precedent: `projects/undercover-mob-boss/scripts/generate-narrator.ts`
  (`dotenv/config` import + structured error messages on missing env)
- Phase 0 Unit 0.2 Step 0a account-readiness check pattern.
- `execFileSync` argv arrays per project security convention.

**Test scenarios:**

- **Happy path:** All checks pass; preflight-log.md records green.
- **Edge case:** Missing FFmpeg → fail-fast with platform-specific
  install instructions.
- **Edge case:** Missing `ELEVENLABS_API_KEY` when engine=elevenlabs →
  fail-fast naming the exact env var.
- **Edge case:** PHASE-0-EXIT.md missing a required field → fail-fast
  with the field name + which Phase 0 unit ships it.
- **Edge case:** Cadence-spec adapter file path resolved to a missing
  file → fail-fast with Phase 0 Step 1.5 reference.
- **Anti-pattern guard:** No script in `videos/trailer/scripts/`
  invokes a TTS API or FFmpeg without calling `ffmpegPreflight()` +
  `parsePhase0Exit()` + `assertEngineEnv()` first. Grep audit:
  `rg --pcre2 '(execFileSync|fetch|generateContent)' videos/trailer/scripts/ -l`
  → every result must also contain `ffmpegPreflight`.

**Verification:**

- `scripts/preflight.ts` runs cleanly when invoked directly:
  `pnpm tsx videos/trailer/scripts/preflight.ts`.
- `scripts/lib/phase-0-exit.ts` typechecks.
- `scripts/lib/ffmpeg.ts` `ffmpegPreflight()` succeeds.
- `scripts/lib/env.ts` `assertEnv()` + `assertEngineEnv()` typecheck.
- `preflight-log.md` populated after invocation.
- Downstream Phase 2 scripts all `import` + invoke preflight in
  `main()`.

---

### Unit 2.1 — Consume Phase 1's `BURNED_TRAILER_LINES` Contract

- [ ] **Unit 2.1: Consume Phase 1's `BURNED_TRAILER_LINES` Contract**

**Goal:** Phase 2 imports `BURNED_TRAILER_LINES` from Phase 1's
`videos/trailer/src/lib/script.ts` — the single source of truth for
line content, voice assignments, frame placement, and per-cue
`cadenceAdapter`. Phase 2 NEVER re-defines line text or frame data.
Phase 2 adds a derivation helper (`cueFilename`) + a coverage test
(`script-coverage.test.ts`) + flags cross-phase Phase 1 follow-up
amendments surfaced during deepening.

**Requirements:** R4, R5, R6, R14.

**Dependencies:** Phase 1 Unit 1.2 + Unit 1.3 closed (script.ts +
BEAT-SHEET.md cue tables locked). Unit 2.0 preflight passes.

**Files:**

- Create: `videos/trailer/scripts/lib/cue-filename.ts` — derives
  `s{NN}-cue-{frame}-{voice}.wav` from `Line`.
- Create: `videos/trailer/src/lib/script-coverage.test.ts` — asserts
  every `BURNED_TRAILER_LINES` entry has a generated WAV after
  pipeline run.
- Edit (cross-phase Phase 1 follow-up): `videos/trailer/src/lib/script.ts`
  — Phase 1's `Line` type extends with optional Phase-2 fields
  (`expectedFrames`, `cueType`, `driftToleranceOverride`,
  `fadeInMs`, `fadeOutMs`, `skipSilenceremove`, `leadFramesHint`,
  `contextPrimingPrevious`, `contextPrimingNext`). See cross-phase
  amendment block below.

**Approach:**

**Step 0 — DELETED: SCRIPT_CUES literal.** The pre-deepening Phase 2
draft created `videos/trailer/src/lib/script-lines.ts` with a
hardcoded `SCRIPT_CUES` array re-defining the line set. This is
GUTTED. Phase 1's deepening locked `script.ts` + `BURNED_TRAILER_LINES`
as the canonical machine contract; Phase 2 consumes, never recreates.
Stale Phase 2 SCRIPT_CUES had at least 5 lines that drifted from
Phase 1's deepened text (Stat 4 Otto-reframe, payoff-cue split, S03
beat markers — see Phase 1 deepening commit `43d44ef4`).

**Step 1 — Verify Phase 1's `script.ts` contract present.**

`Unit 2.0` preflight already verified the file exists. This step
verifies the SHAPE matches Phase 2's expectations:

```ts
// scripts/verify-script-contract.ts
import { BURNED_TRAILER_LINES, type Line } from '../src/lib/script.js';

// Compile-time assertions via TypeScript:
const _check: readonly Line[] = BURNED_TRAILER_LINES;
const _fields: keyof Line = '' as 'id' | 'scene' | 'frame' | 'voice' | 'text' | 'cadenceAdapter';

// Runtime assertions:
if (BURNED_TRAILER_LINES.length < 14 || BURNED_TRAILER_LINES.length > 16) {
  throw new Error(`BURNED_TRAILER_LINES has ${BURNED_TRAILER_LINES.length} entries; expected 14-16`);
}
for (const line of BURNED_TRAILER_LINES) {
  if (!['dash', 'sable', 'janet', 'vera'].includes(line.voice)) {
    throw new Error(`Line ${line.id} has invalid voice ${line.voice}`);
  }
  if (line.scene < 'S01' || line.scene > 'S06') {
    throw new Error(`Line ${line.id} has invalid scene ${line.scene}`);
  }
}
```

**Step 2 — Derive `cueFilename` helper.**

```ts
// videos/trailer/scripts/lib/cue-filename.ts
import type { Line } from '../../src/lib/script.js';

/**
 * Derives the per-cue WAV filename from a Phase 1 Line.
 * Filename is derived, NOT stored on Line — naming is a Phase 2
 * concern that can change without reopening Phase 1.
 *
 * Convention: s{NN}-cue-{frame}-{voice}.wav
 * Examples: s01-cue-60-sable.wav, s04-cue-1950-dash.wav,
 *           s05-cue-2400-dash.wav (scream — voice cell IS dash;
 *           cadenceAdapter.prefixTag='[shouts]' steers the shout).
 */
export function cueFilename(line: Line): string {
  return `${line.scene.toLowerCase()}-cue-${line.frame}-${line.voice}.wav`;
}

/** Static-path for Remotion `staticFile()` consumption in Phase 4. */
export function cueStaticPath(line: Line): string {
  return `audio/lines/${cueFilename(line)}`;
}
```

**Step 3 — `script-coverage.test.ts`.**

Phase 2's drift-prevention test asserts every `BURNED_TRAILER_LINES`
entry has a generated WAV after a pipeline run completes:

```ts
// videos/trailer/src/lib/script-coverage.test.ts
import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { BURNED_TRAILER_LINES, type Line } from './script';
import { cueFilename } from '../../scripts/lib/cue-filename';
import { parsePhase0Exit } from '../../scripts/lib/phase-0-exit';

describe('script-coverage', () => {
  it('every line in BURNED_TRAILER_LINES has a generated WAV', () => {
    const cfg = parsePhase0Exit();
    const linesDir = 'videos/trailer/public/audio/lines';
    const missing: string[] = [];

    for (const line of BURNED_TRAILER_LINES) {
      // Filter out cue 2400 if R5 is cut (no scream WAV expected).
      if (line.frame === 2400 && line.voice === 'dash' && cfg.r5Outcome === 'cut') continue;

      const wav = join(linesDir, cueFilename(line));
      if (!existsSync(wav)) missing.push(cueFilename(line));
    }

    expect(missing, `Missing WAVs after pipeline run: ${missing.join(', ')}`).toEqual([]);
  });

  it('cueFilename produces valid Remotion staticFile paths', () => {
    for (const line of BURNED_TRAILER_LINES) {
      const filename = cueFilename(line);
      expect(filename).toMatch(/^s0[1-6]-cue-\d+-(dash|sable|janet|vera)\.wav$/);
    }
  });

  it('no two lines share a filename (collision check)', () => {
    const filenames = BURNED_TRAILER_LINES.map(cueFilename);
    expect(new Set(filenames).size).toBe(filenames.length);
  });
});
```

Phase 1's `script.test.ts` (BEAT-SHEET.md ↔ script.ts drift gate)
remains the canonical drift test for line text — Phase 2 does not
duplicate.

**Step 4 — Cross-phase Phase 1 follow-up amendments surfaced (FLAG ONLY, NOT TRIGGER).**

Phase 2 deepening surfaces seven Phase 1 follow-up amendments to
`script.ts` that would tighten Phase 2's pipeline. **DO NOT trigger
a Phase 1 reopen now** — flag for Phase 1's next deepening pass or
absorb post-execution when Phase 2 hits the first need. The Phase 1
reopen procedure (Unit 2.7 Step 2a) is the canonical mechanism if
absorbed during Phase 2 execution.

The proposed `Line` type extensions:

```ts
// videos/trailer/src/lib/script.ts — Phase 1 follow-up amendment proposal
export type Line = {
  readonly id: string;
  readonly scene: 'S01'|'S02'|'S03'|'S04'|'S05'|'S06';
  readonly frame: number;             // absolute frame (canonicalize from Phase 1's mixed scene-relative)
  readonly voice: 'dash'|'sable'|'janet'|'vera';
  readonly text: string;
  readonly cadenceAdapter?: {
    readonly engine: 'elevenlabs-v3'|'gemini-tts'|'openai-tts'|'voice-actor';
    readonly prefixTag?: string;      // e.g., '[shouts]'
    readonly notes?: string;
  };
  // NEW per Phase 2 deepening — all optional, default values documented below:
  /** Phase 1 word-count-pacing estimate in frames. Phase 2 reconciles against this. */
  readonly expectedFrames?: number;
  /** Cue type — drives Phase 2's tolerance band lookup. */
  readonly cueType?: 'sustained' | 'list' | 'payoff' | 'scream';
  /** Override default tolerance for this cue type (default = TOLERANCE_BY_TYPE[cueType]). */
  readonly driftToleranceOverride?: number;
  /** Per-cue fade-in in ms (default 30; payoff cue 1950 = 5; scream cue 2400 = 0). */
  readonly fadeInMs?: number;
  /** Per-cue fade-out in ms (default 30; "Phrasing." cue 2790 = 50). */
  readonly fadeOutMs?: number;
  /** Skip silenceremove entirely for this cue (default false; scream cue 2400 = true). */
  readonly skipSilenceremove?: boolean;
  /** Audio lead-frames hint — Phase 4 places audio this many frames before visual sync target. */
  readonly leadFramesHint?: number;
  /** ElevenLabs context-priming previous_text — same-scene adjacent cue text for cadence flow. */
  readonly contextPrimingPrevious?: string;
  /** ElevenLabs context-priming next_text — same-scene adjacent cue text for cadence flow. */
  readonly contextPrimingNext?: string;
};
```

**Recommended per-cue overrides** (Phase 1 follow-up amendment
applies to these specific lines):

| Cue id | Field | Value | Rationale |
|--------|-------|-------|-----------|
| S01-coldopen | cueType | `'sustained'` | Cold-open speaker single line |
| S01-coldopen | contextPrimingPrevious | 2-3 lines of in-character speech from Phase 0 cadence-spec reference | Single-line cadence context starvation mitigation per Decision-Lens Agent 8 |
| S02-greeting | cueType | `'sustained'` | Briefing-room formality |
| S03-roster | cueType | `'list'` | List of operatives |
| S03-mission | cueType | `'list'` | Deck-of-120 list |
| S04-htp-1 / S04-htp-2 | cueType | `'sustained'` | Cascade scroll lines |
| S04-stat-1..4 | cueType | `'list'` | Stat captions |
| S04-payoff-a | cueType | `'payoff'` | R3 stacked-payoff first half |
| S04-payoff-a | fadeInMs | `5` | Hard land coincident with stamp slap |
| S04-payoff-a | leadFramesHint | `2` | Audio enters 2 frames before visual sync |
| S04-payoff-b | cueType | `'payoff'` | R3 stacked-payoff second half |
| S05-pleasure | cueType | `'sustained'` | Sparse-over-gameplay |
| S05-scream | cueType | `'scream'` | Volume-discontinuous outburst |
| S05-scream | fadeInMs | `0` | Preserve attack envelope |
| S05-scream | skipSilenceremove | `true` | Don't trim attack transient |
| S05-scream | leadFramesHint | `1` | Audio enters 1 frame before visual sync |
| S06-close | cueType | `'sustained'` | Deliberate close |
| S06-phrasing | cueType | `'payoff'` | Punchline cadence (1.6-1.8 wps) |
| S06-phrasing | expectedFrames | `27` | Sterling-CODED 0.9s, NOT 0.4s; was wrong on draft |
| S06-phrasing | fadeOutMs | `50` | Let punchline ring |
| S06-phrasing | driftToleranceOverride | `0.20` | Single-word expressive cue tolerance |

**Frame numbering canonicalization** (Phase 1 follow-up): Phase 1's
deepened BURNED_TRAILER_LINES table has S04 absolute frames AND
S05/S06 scene-relative frames (`240 (S05-rel)`, `30 (S06-rel)`).
Inconsistent. Canonicalize to ABSOLUTE so Phase 4's `<Sequence
from={line.frame}>` placement is unambiguous. Conversions:

| Cue | Phase 1 (raw) | Absolute |
|-----|---------------|----------|
| S05-pleasure | 240 (S05-rel) | 2040 + 240 = **2280** |
| S05-scream | 360 (S05-rel) | 2040 + 360 = **2400** |
| S06-close | 30 (S06-rel) | 2580 + 30 = **2610** |
| S06-phrasing | 210 (S06-rel) | 2580 + 210 = **2790** |

These are the values Phase 2 expects. If Phase 1's deepened script.ts
still has scene-relative notation, the Phase 1 follow-up amendment
canonicalizes to absolute. If already absolute, no change needed.

**Patterns to follow:**

- Phase 1 Unit 1.2 Step 0 `Line` type definition (the contract Phase 2
  consumes).
- TypeScript `as const` for compile-time literal type narrowing on
  the readonly array.
- `feedback-stats-single-source.md` discipline — one machine contract,
  one source of truth.

**Test scenarios:**

- **Happy path:** `pnpm test script-coverage.test.ts` passes after a
  full Phase 2 pipeline run (Unit 2.4 completes).
- **Happy path:** `cueFilename` produces unique filenames for all
  BURNED_TRAILER_LINES entries.
- **Edge case (R5=cut):** `script-coverage.test.ts` correctly skips
  the scream cue when PHASE-0-EXIT.md outcome is `cut`.
- **Drift guard:** Phase 1's existing `script.test.ts` catches
  BEAT-SHEET.md ↔ script.ts drift. Phase 2 doesn't duplicate.

**Verification:**

- `cueFilename` + `cueStaticPath` typecheck clean.
- `script-coverage.test.ts` exists; expected to fail until Unit 2.4
  generates all WAVs.
- Cross-phase Phase 1 follow-up amendments documented in
  `sample-eval/voice-pipeline/phase-1-followup-amendments.md`
  (records the seven proposed Line type extensions + per-cue overrides
  + frame numbering canonicalization for future Phase 1 reopen).

---

### Unit 2.2 — `generate-dash-tts.ts` Production Script

- [ ] **Unit 2.2: `generate-dash-tts.ts` Production Script**

**Goal:** Build the production TTS generator that reads
`BURNED_TRAILER_LINES` from Phase 1's `script.ts` (imported via
Unit 2.1 helpers), generates per-cue WAVs via the engine PHASE-0-EXIT.md
locked, applies the matching per-engine cadence-spec adapter as
steering payload (NEVER prepended to script text), prepends per-line
`cadenceAdapter.prefixTag` to text payload at engine clients with
inline-tag support (ElevenLabs `[shouts]`), writes WAVs atomically to
`public/audio/lines/`, and uses hash-based skip-or-regen
(filename-existence + sidecar `${wav}.meta.json` sha) to invalidate
stale WAVs without requiring `--force`.

**Requirements:** R4, R5 (conditional via PHASE-0-EXIT.md outcome),
R14, plus the VOICE_DIRECTION anti-pattern guard (cross-cutting; three
per-engine variants codified inline).

**Dependencies:** Unit 2.0 (preflight passes; PHASE-0-EXIT.md parsed),
Unit 2.1 (`BURNED_TRAILER_LINES` contract verified + `cueFilename`
helper available), Phase 0 Unit 0.2 outputs (engine path + voice IDs
+ per-engine cadence-spec adapter file).

**Files:**

- Create: `videos/trailer/scripts/generate-dash-tts.ts` — the
  generator script (consumes BURNED_TRAILER_LINES; engine-agnostic
  loop; hash-based regen; cost tracker integration).
- Create: `videos/trailer/scripts/tts-clients/elevenlabs.ts` — Path
  A/B engine client (v3 model, [shouts] tag, voice_settings from
  per-engine adapter JSON, previous_text/next_text context-priming).
- Create: `videos/trailer/scripts/tts-clients/gemini.ts` — Path C
  engine client (gemini-2.5-flash-preview-tts, pcmToWav wrap on PCM
  response, Director's Chair structured prompt).
- Create: `videos/trailer/scripts/tts-clients/openai.ts` — Path C
  engine client (gpt-4o-mini-tts-2025-03-20 snapshot pin, instructions
  param, response_format wav).
- Create: `videos/trailer/scripts/tts-clients/wav-utils.ts` — port
  `pcmToWav` + `isValidWav` verbatim from UMB
  `generate-narrator.ts:127-162`.
- Create: `videos/trailer/scripts/tts-clients/index.ts` — engine
  dispatch on PHASE-0-EXIT.md locked engine.
- Create: `videos/trailer/scripts/lib/cost-tracker.ts` — cumulative
  TTS spend tracker with hard abort at $30.
- Create: `videos/trailer/public/audio/lines/.gitkeep`.
- Create: `videos/trailer/sample-eval/voice-pipeline/generation-log.md` —
  human-readable per-run summary.
- Create: `videos/trailer/sample-eval/voice-pipeline/generation-log.jsonl` —
  machine-readable per-cue per-run log (DEEPENING — for Phase 6 QA +
  Phase 7 retrospective consumption).

**Approach:**

**Step 1 — Generator skeleton (BURNED_TRAILER_LINES consumer with
PHASE-0-EXIT.md ingest + hash-based regen + cost tracker).**

```ts
// videos/trailer/scripts/generate-dash-tts.ts
import 'dotenv/config';  // auto-load .env per Briggsy autonomy rule
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { parseArgs } from 'node:util';
import { join } from 'node:path';
import { BURNED_TRAILER_LINES } from '../src/lib/script.js';
import { cueFilename, cueStaticPath } from './lib/cue-filename.js';
import { ffmpegPreflight } from './lib/ffmpeg.js';
import { parsePhase0Exit, type Phase0ExitConfig } from './lib/phase-0-exit.js';
import { assertEngineEnv } from './lib/env.js';
import { atomicWriteSync } from './lib/atomic-write.js';
import { trackSpend, assertWithinBudget } from './lib/cost-tracker.js';
import { generateForCue } from './tts-clients/index.js';
import { isValidWav } from './tts-clients/wav-utils.js';

const TRAILER_ROOT = 'videos/trailer';
const OUT_DIR = join(TRAILER_ROOT, 'public/audio/lines');
const META_DIR = join(OUT_DIR, '.meta');

function parseCli() {
  const { values } = parseArgs({
    args: process.argv.slice(2).filter((a) => a !== '--'),
    options: {
      force:     { type: 'boolean', default: false },
      'dry-run': { type: 'boolean', default: false },
      only:      { type: 'string', multiple: true },  // cue ids
      scene:     { type: 'string' },                  // 'S04' or '4'
      engine:    { type: 'string' },                  // CLI override (warns)
    },
    allowPositionals: false,
    strict: true,  // rejects unknown flags loudly
  });
  return {
    force: values.force ?? false,
    dryRun: values['dry-run'] ?? false,
    onlyIds: (values.only ?? []) as readonly string[],
    scene: values.scene ?? null,
    engineOverride: values.engine ?? null,
  };
}

function hashCueInputs(cue: typeof BURNED_TRAILER_LINES[number], engine: string, voiceId: string): string {
  const tag = cue.cadenceAdapter?.prefixTag ?? '';
  return createHash('sha256').update(`${cue.text}|${engine}|${voiceId}|${tag}`).digest('hex');
}

async function main() {
  // Preflight (Unit 2.0) — fails fast if FFmpeg missing or PHASE-0-EXIT.md unparsable
  ffmpegPreflight();
  const cfg: Phase0ExitConfig = parsePhase0Exit();
  assertEngineEnv(cfg.engine);
  await assertWithinBudget();  // aborts if cumulative spend > $30

  const args = parseCli();
  if (args.engineOverride && args.engineOverride !== cfg.engine) {
    console.warn(
      `WARN: --engine ${args.engineOverride} disagrees with ` +
      `PHASE-0-EXIT.md locked ${cfg.engine}. Using ${args.engineOverride} ` +
      `(canary debug mode).`
    );
  }
  const engine = args.engineOverride ?? cfg.engine;

  if (engine === 'voice-actor') {
    console.log('Path D (voice-actor) locked: skipping TTS generation.');
    console.log('Run Unit 2.X: pnpm tsx videos/trailer/scripts/ingest-path-d.ts');
    process.exit(0);
  }

  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
  if (!existsSync(META_DIR)) mkdirSync(META_DIR, { recursive: true });

  // Read per-engine cadence-spec adapter (NOT the raw cadence-spec.md;
  // Phase 0 Step 1.5 derives per-engine adapters from it)
  const cadenceAdapter = readFileSync(cfg.cadenceAdapterPath, 'utf-8');

  for (const cue of BURNED_TRAILER_LINES) {
    // Filter: skip scream cue if R5 cut
    if (cue.frame === 2400 && cfg.r5Outcome === 'cut') {
      console.log(`SKIP ${cueFilename(cue)} (R5 outcome: cut)`);
      continue;
    }
    // Filter: route scream to Unit 2.Y if R5=kept-via-B
    if (cue.frame === 2400 && cfg.r5Outcome === 'kept-via-B') {
      console.log(`SKIP ${cueFilename(cue)} (R5 outcome: kept-via-B; run Unit 2.Y pnpm tsx scripts/hybrid-scream.ts)`);
      continue;
    }
    // CLI filters
    if (args.scene && !cue.scene.endsWith(args.scene.replace(/^S0?/, ''))) continue;
    if (args.onlyIds.length && !args.onlyIds.includes(cue.id)) continue;

    const outPath = join(OUT_DIR, cueFilename(cue));
    const metaPath = join(META_DIR, `${cueFilename(cue)}.sha256`);

    // Resolve voice ID for this cue from PHASE-0-EXIT.md
    const voiceId = cfg.voiceIds[cue.voice];
    if (!voiceId) {
      throw new Error(`No voice ID locked for cell '${cue.voice}' in PHASE-0-EXIT.md`);
    }
    const expectedHash = hashCueInputs(cue, engine, voiceId);

    // Hash-based skip (DEEPENING — replaces filename-existence-only)
    if (!args.force && existsSync(outPath) && existsSync(metaPath)) {
      const storedHash = readFileSync(metaPath, 'utf-8').trim();
      if (storedHash === expectedHash) {
        console.log(`SKIP ${cueFilename(cue)} (sha match — no regen needed)`);
        continue;
      }
      console.log(`STALE ${cueFilename(cue)} (text/engine/voice changed — regenerating)`);
    }

    if (args.dryRun) {
      console.log(`DRY-RUN ${cueFilename(cue)}: "${cue.text.slice(0, 60)}..."`);
      continue;
    }

    console.log(`GEN  ${cueFilename(cue)}...`);

    // Per-line cadenceAdapter.prefixTag prepends at API call site
    // (cleaner than hardcoded voice-cell logic; engines without inline-tag
    // support ignore the prefix)
    const wavBuf = await generateForCue({
      text: cue.text,
      voice: cue.voice,
      voiceId,
      cadenceAdapter,           // per-engine adapter file content
      cadencePrefixTag: cue.cadenceAdapter?.prefixTag,
      modelId: cfg.modelId,
      contextPrimingPrevious: cue.contextPrimingPrevious,  // ElevenLabs only
      contextPrimingNext:     cue.contextPrimingNext,
    });

    if (!isValidWav(wavBuf)) {
      throw new Error(
        `Invalid WAV returned for ${cueFilename(cue)} — likely Gemini path missing pcmToWav wrap. ` +
        `Check gemini.ts adapter.`
      );
    }

    atomicWriteSync(outPath, wavBuf);
    atomicWriteSync(metaPath, expectedHash);

    // Cost tracking + JSONL log
    await trackSpend(cue, engine, wavBuf.byteLength);

    console.log(`OK   ${cueFilename(cue)} (${wavBuf.byteLength} bytes)`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

**Step 2 — ElevenLabs client (DEEPENING — v3 model + [shouts] + cadenceAdapter consumption + context-priming).**

```ts
// videos/trailer/scripts/tts-clients/elevenlabs.ts
import { Buffer } from 'node:buffer';
import { assertEnv } from '../lib/env.js';

interface ElevenLabsAdapter {
  voice_settings: {
    stability: number;        // 0–1; 0.5 is "Natural" preset balanced
    similarity_boost: number; // 0–1
    style: number;            // 0–1; v3 docs warn >0.5 can hallucinate
    use_speaker_boost: boolean;
  };
  /** v3 mode if minting a Voice Design voice */
  v3_mode?: 'Creative' | 'Natural' | 'Robust';
  /** Per-paragraph bracket-tag annotations applied to specific cue ids */
  bracketAnnotationsByCueId?: Readonly<Record<string, readonly string[]>>;
}

export async function generateElevenLabs(args: {
  text: string;
  voice: 'dash' | 'sable' | 'janet' | 'vera';
  voiceId: string;
  cadenceAdapter: string;             // raw cadence-spec-elevenlabs.json content
  cadencePrefixTag?: string;          // e.g., '[shouts]' from Line.cadenceAdapter
  modelId: string;                    // 'eleven_v3' for cues with tag support
  contextPrimingPrevious?: string;
  contextPrimingNext?: string;
}): Promise<Buffer> {
  const apiKey = assertEnv('ELEVENLABS_API_KEY');
  const adapter: ElevenLabsAdapter = JSON.parse(args.cadenceAdapter);

  const url = `https://api.elevenlabs.io/v1/text-to-speech/${args.voiceId}`;

  // ELEVENLABS: text payload may contain ONLY the script + sparse
  //   [bracket] audio tags interpreted by v3 (e.g., [shouts], [whispers]).
  //   Free prose mixed into the text gets read aloud verbatim.
  //   Cadence-spec maps to voice_settings numbers + sparse inline
  //   bracket tags + an (optional) Voice Design prompt to mint the
  //   voice — NEVER to free prose appended to the script payload.
  //   v3 tags are SELF-CLOSING: `[shouts]text` not `[shouts]text[/shouts]`.
  //   [pause:Xms] DOES NOT EXIST in v3 — only [pause], [short pause],
  //   [long pause]. Precision intra-line beats route through FFmpeg
  //   silence stitch in Unit 2.6, NOT inline tags.

  // Per-line prefix tag (e.g., '[shouts]' for S05-scream)
  const scriptText = args.cadencePrefixTag
    ? `${args.cadencePrefixTag}${args.text}`
    : args.text;

  const body: Record<string, unknown> = {
    text: scriptText,
    voice_settings: adapter.voice_settings,
    model_id: args.modelId,  // 'eleven_v3' for tag interpretation
    output_format: 'pcm_48000',  // PCM 48kHz; lower latency + matches Phase 2 sample rate
  };

  // Context-priming (DEEPENING — LOCKED enabled per Tier 3 amendment)
  if (args.contextPrimingPrevious) body.previous_text = args.contextPrimingPrevious;
  if (args.contextPrimingNext) body.next_text = args.contextPrimingNext;

  // Linear backoff per UMB precedent (5s/10s/15s + jitter; max 30s total)
  const MAX_RETRIES = 3;
  const BASE_DELAY_MS = 5000;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'audio/wav',
      },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const arrayBuf = await res.arrayBuffer();
      // ElevenLabs `output_format: 'pcm_48000'` returns raw PCM — wrap in WAV header
      const pcm = Buffer.from(arrayBuf);
      // Note: if using `Accept: audio/wav` without `output_format=pcm_*`, response
      // is already WAV-headed; switch wrapping logic on output_format value.
      const { pcmToWav } = await import('./wav-utils.js');
      return pcmToWav(pcm, 48000);
    }

    if (res.status === 401 || res.status === 403) {
      throw new Error(`ElevenLabs auth failure ${res.status}: ${await res.text()}`);
    }

    if (res.status === 429 || res.status >= 500) {
      const delay = BASE_DELAY_MS * attempt + Math.floor(Math.random() * 1000);
      console.warn(`ElevenLabs ${res.status}, retry ${attempt}/${MAX_RETRIES} in ${delay}ms`);
      if (attempt < MAX_RETRIES) await new Promise((r) => setTimeout(r, delay));
      continue;
    }

    throw new Error(`ElevenLabs ${res.status}: ${await res.text()}`);
  }

  throw new Error('ElevenLabs retries exhausted');
}
```

**Step 3 — Gemini client (DEEPENING — correct model name + pcmToWav wrap + Director's Chair prompt).**

```ts
// videos/trailer/scripts/tts-clients/gemini.ts
import { GoogleGenAI } from '@google/genai';
import { Buffer } from 'node:buffer';
import { assertEnv } from '../lib/env.js';
import { pcmToWav } from './wav-utils.js';

const VOICE_PRESETS: Readonly<Record<string, string>> = {
  // PHASE-0-EXIT.md voiceIds map to Gemini preset names per Phase 0 Unit 0.2
  // outcome. Common Gemini TTS preset names (2026): Algenib, Alnilam, Charon,
  // Iapetus, Achernar, Erinome, Kore. Phase 0 picks the Sterling-coded one.
};

export async function generateGemini(args: {
  text: string;
  voice: 'dash' | 'sable' | 'janet' | 'vera';
  voiceId: string;                   // Gemini preset name from PHASE-0-EXIT.md
  cadenceAdapter: string;            // raw cadence-spec-gemini.md content
  cadencePrefixTag?: string;
  modelId: string;                   // 'gemini-2.5-flash-preview-tts'
}): Promise<Buffer> {
  const apiKey = assertEnv('GEMINI_API_KEY');
  const ai = new GoogleGenAI({ apiKey });

  // GEMINI 2.5 FLASH PREVIEW TTS: cadence-spec lives in the Director's Chair
  //   "Director's Notes" section of the prompt, ABOVE the Transcript
  //   section marker. The section markers (## DIRECTOR'S NOTES,
  //   ### TRANSCRIPT) are load-bearing — without them, the cadence-spec
  //   will be spoken aloud as part of the audio.
  //   Gemini does NOT support SSML <break> tags; intra-line precision
  //   beats route through Unit 2.6 FFmpeg silence stitch.
  //   Per-line cadencePrefixTag (e.g., '[mood: shouting]') goes inside
  //   the user content text in front of the Transcript marker.

  // Director's Chair structured prompt: per-engine adapter file IS the
  // prompt body up to the Transcript marker. Phase 2 appends the cue
  // text after the adapter-defined Transcript marker.
  const promptText = `${args.cadenceAdapter.trim()}

### TRANSCRIPT
${args.cadencePrefixTag ? `${args.cadencePrefixTag}\n` : ''}${args.text}`;

  const response = await ai.models.generateContent({
    model: args.modelId,  // 'gemini-2.5-flash-preview-tts'
    config: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: args.voiceId },
        },
      },
    },
    contents: [{ role: 'user', parts: [{ text: promptText }] }],
  });

  const audioPart = response.candidates?.[0]?.content?.parts?.[0];
  if (!audioPart?.inlineData?.data) {
    throw new Error('Gemini returned no audio data');
  }

  // CRITICAL (DEEPENING): Gemini returns base64 RAW PCM @ 24kHz mono,
  // NOT a formatted WAV. UMB precedent generate-narrator.ts:127-155
  // wraps with 44-byte WAV header before returning. Writing raw PCM
  // as .wav produces an invalid file that FFmpeg/Remotion cannot decode.
  const pcm = Buffer.from(audioPart.inlineData.data, 'base64');
  return pcmToWav(pcm, 24000);  // Gemini fixed 24kHz / 16-bit / mono
}
```

**Step 4 — OpenAI client (DEEPENING — snapshot pin + instructions param + correct response_format handling).**

```ts
// videos/trailer/scripts/tts-clients/openai.ts
import OpenAI from 'openai';
import { Buffer } from 'node:buffer';
import { assertEnv } from '../lib/env.js';

const VOICES: Readonly<Record<string, string>> = {
  // Phase 0 Unit 0.2 outcome picks Sterling-CODED preset per voice cell.
  // Current valid OpenAI voices (2026): alloy, ash, ballad, coral, echo,
  // fable, nova, onyx, sage, shimmer, verse, marin, cedar. PHASE-0-EXIT.md
  // records the voice cell → preset mapping.
};

export async function generateOpenAI(args: {
  text: string;
  voice: 'dash' | 'sable' | 'janet' | 'vera';
  voiceId: string;                    // OpenAI preset name (e.g., 'onyx', 'ash', 'marin')
  cadenceAdapter: string;             // raw cadence-spec-openai.md content (~500 words)
  cadencePrefixTag?: string;          // OpenAI doesn't honor inline tags; ignored
  modelId: string;                    // 'gpt-4o-mini-tts-2025-03-20' snapshot pin
}): Promise<Buffer> {
  const apiKey = assertEnv('OPENAI_API_KEY');
  const openai = new OpenAI({ apiKey, maxRetries: 3 });  // SDK handles linear backoff

  // OPENAI gpt-4o-mini-tts: cadence-spec goes in the `instructions`
  //   API parameter, NEVER in `input`. These are separate top-level
  //   fields and must stay that way.
  //   `instructions` parameter has no published cap; observed steering
  //   prompts run 150–500 words. The cadence-spec-openai.md adapter
  //   is distilled to ~500 words for this constraint.

  const audio = await openai.audio.speech.create({
    model: args.modelId,
    voice: args.voiceId,
    input: args.text,             // raw text ONLY; no direction prepend
    instructions: args.cadenceAdapter,
    response_format: 'wav',       // returns WAV with header (no pcmToWav needed)
  });

  return Buffer.from(await audio.arrayBuffer());
}
```

**Step 5 — `wav-utils.ts` (port UMB pcmToWav + isValidWav verbatim, sample-rate-parameterized).**

```ts
// videos/trailer/scripts/tts-clients/wav-utils.ts
import { Buffer } from 'node:buffer';

const NUM_CHANNELS = 1;        // narration mono
const BITS_PER_SAMPLE = 16;

/**
 * Wraps raw PCM audio bytes in a WAV container by prepending a
 * 44-byte RIFF/WAVE header. Verbatim port from UMB precedent
 * `projects/undercover-mob-boss/scripts/generate-narrator.ts:127-155`,
 * generalized for sample-rate parameter (UMB hardcoded 24000 for
 * Gemini; Phase 2 uses 24000 for Gemini AND 48000 for ElevenLabs
 * pcm_48000 output format).
 *
 * Byte layout (44-byte header + raw PCM payload):
 *   0-3   'RIFF' ASCII
 *   4-7   UInt32LE fileSize - 8 = 36 + dataSize
 *   8-11  'WAVE' ASCII
 *   12-15 'fmt ' (trailing space — sub-chunk ID)
 *   16-19 UInt32LE 16 (fmt sub-chunk size for PCM)
 *   20-21 UInt16LE 1 (PCM format code)
 *   22-23 UInt16LE NUM_CHANNELS (= 1 for mono)
 *   24-27 UInt32LE sampleRate
 *   28-31 UInt32LE byteRate = sampleRate × channels × bytesPerSample
 *   32-33 UInt16LE blockAlign = channels × bytesPerSample
 *   34-35 UInt16LE BITS_PER_SAMPLE (= 16)
 *   36-39 'data' ASCII
 *   40-43 UInt32LE dataSize (PCM byte length)
 *   44+   raw PCM payload
 */
export function pcmToWav(pcmData: Buffer, sampleRate: number): Buffer {
  const dataSize = pcmData.length;
  const byteRate = sampleRate * NUM_CHANNELS * (BITS_PER_SAMPLE / 8);
  const blockAlign = NUM_CHANNELS * (BITS_PER_SAMPLE / 8);

  const header = Buffer.alloc(44);

  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write('WAVE', 8);

  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);              // PCM
  header.writeUInt16LE(NUM_CHANNELS, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(BITS_PER_SAMPLE, 34);

  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcmData]);
}

/**
 * Runtime guard catching malformed WAVs (e.g., raw PCM that wasn't
 * wrapped via pcmToWav). Called at the write boundary in
 * generate-dash-tts.ts before atomicWriteSync.
 */
export function isValidWav(buf: Buffer): boolean {
  if (buf.length < 44) return false;
  return buf.toString('ascii', 0, 4) === 'RIFF' &&
         buf.toString('ascii', 8, 12) === 'WAVE';
}
```

**Step 6 — `tts-clients/index.ts` engine dispatch (DEEPENING — engine names match Phase 1 `Line.cadenceAdapter.engine` enum exactly).**

```ts
// videos/trailer/scripts/tts-clients/index.ts
import { generateElevenLabs } from './elevenlabs.js';
import { generateGemini } from './gemini.js';
import { generateOpenAI } from './openai.js';
import type { Buffer } from 'node:buffer';

export interface GenerateForCueArgs {
  text: string;
  voice: 'dash' | 'sable' | 'janet' | 'vera';
  voiceId: string;
  cadenceAdapter: string;
  cadencePrefixTag?: string;
  modelId: string;
  contextPrimingPrevious?: string;
  contextPrimingNext?: string;
}

/**
 * Engine dispatch reads engine identifier from PHASE-0-EXIT.md
 * (resolved upstream in generate-dash-tts.ts main()). Engine names
 * match Phase 1 Line.cadenceAdapter.engine enum exactly.
 *
 * Path D ('voice-actor') is handled upstream in main() — skips TTS
 * generation entirely; routes to Unit 2.X ingestion script.
 */
export async function generateForCue(args: GenerateForCueArgs & { engine: string }): Promise<Buffer> {
  switch (args.engine) {
    case 'elevenlabs-v3': return generateElevenLabs(args);
    case 'gemini-tts':    return generateGemini(args);
    case 'openai-tts':    return generateOpenAI(args);
    case 'voice-actor':
      throw new Error(
        'voice-actor path: manual recording, see Unit 2.X ingestion. ' +
        'This dispatch should not be reached for Path D.'
      );
    default:
      throw new Error(`Unknown engine: ${args.engine}. Valid: elevenlabs-v3 | gemini-tts | openai-tts | voice-actor`);
  }
}
```

**Step 7 — Cost tracker (DEEPENING — cumulative spend with hard abort at $30).**

```ts
// videos/trailer/scripts/lib/cost-tracker.ts
import { existsSync, readFileSync, appendFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Line } from '../../src/lib/script.js';

const SPEND_LOG = 'videos/trailer/sample-eval/voice-pipeline/tts-spend.json';
const HARD_CEILING_USD = 30;

interface SpendEntry {
  runId: string;
  ts: string;
  cueId: string;
  engine: string;
  charsBilled: number;
  estimatedCostUsd: number;
}

const COST_PER_CHAR_USD: Readonly<Record<string, number>> = {
  'elevenlabs-v3': 0.30 / 1000,        // $0.30 per 1k chars Creator tier
  'gemini-tts':    0.075 / 1_000_000,  // negligible
  'openai-tts':    15 / 1_000_000,     // $15 per 1M chars
};

function readSpendLog(): readonly SpendEntry[] {
  if (!existsSync(SPEND_LOG)) return [];
  const lines = readFileSync(SPEND_LOG, 'utf-8').trim().split('\n').filter(Boolean);
  return lines.map((l) => JSON.parse(l) as SpendEntry);
}

function totalSpend(): number {
  return readSpendLog().reduce((sum, e) => sum + e.estimatedCostUsd, 0);
}

export async function assertWithinBudget(): Promise<void> {
  const total = totalSpend();
  const override = process.env.TTS_BUDGET_OVERRIDE === '1';
  if (total > HARD_CEILING_USD && !override) {
    throw new Error(
      `Phase 2 TTS spend cap exceeded: $${total.toFixed(2)} > $${HARD_CEILING_USD} ceiling.\n` +
      `Either:\n` +
      `  (a) Set TTS_BUDGET_OVERRIDE=1 in .env to continue (Briggsy approval recommended).\n` +
      `  (b) Reduce iteration count via --only / --scene targeting.\n` +
      `  (c) Reset spend tracker: rm ${SPEND_LOG} (only if starting a fresh budget cycle).`
    );
  }
}

export async function trackSpend(cue: Line, engine: string, bytesWritten: number): Promise<void> {
  const rate = COST_PER_CHAR_USD[engine] ?? 0;
  const charsBilled = cue.text.length;
  const entry: SpendEntry = {
    runId: process.env.RUN_ID ?? new Date().toISOString().replace(/[:.]/g, ''),
    ts: new Date().toISOString(),
    cueId: cue.id,
    engine,
    charsBilled,
    estimatedCostUsd: charsBilled * rate,
  };
  if (!existsSync(dirname(SPEND_LOG))) mkdirSync(dirname(SPEND_LOG), { recursive: true });
  appendFileSync(SPEND_LOG, JSON.stringify(entry) + '\n');
}
```

**Step 8 — CLI invocation.**

`package.json` scripts:
```jsonc
{
  "scripts": {
    "preflight":   "tsx scripts/preflight.ts",
    "tts":         "tsx scripts/generate-dash-tts.ts",
    "tts:force":   "tsx scripts/generate-dash-tts.ts --force",
    "tts:dry-run": "tsx scripts/generate-dash-tts.ts --dry-run"
  }
}
```

Invocation examples:
- `pnpm tts` — generate all missing/stale WAVs (hash-based)
- `pnpm tts:force` — regenerate all (unconditional)
- `pnpm tts -- --scene 4` — only S04 cues
- `pnpm tts -- --only S04-payoff-a --only S04-payoff-b` — specific cues
- `pnpm tts -- --engine gemini-tts` — engine override (warns vs PHASE-0-EXIT.md)
- `pnpm tts:dry-run` — list what would generate (no API calls)

**Step 9 — Generation log (markdown human-readable + JSONL machine-readable).**

After each cue is processed in the main loop, append to BOTH:

```md
## sample-eval/voice-pipeline/generation-log.md
## Run 2026-MM-DD HH:MM (engine=elevenlabs-v3 / cadence-spec sha=abc123)
- s01-cue-60-sable.wav      GEN  4.2s  (expected 4.4s, -4.5%)  $0.013
- s02-cue-240-dash.wav      GEN  11.8s (expected 11.7s, +0.9%) $0.041
...
- s04-cue-1950-dash.wav     SKIP (sha match — no regen)
TOTAL: 14 generated, 1 skipped, 0 retried. $0.39 estimated spend.
Cumulative Phase 2 spend: $2.17 / $30 ceiling.
```

```jsonl
// sample-eval/voice-pipeline/generation-log.jsonl
{"runId":"...","ts":"...","cueId":"S01-coldopen","engine":"elevenlabs-v3","modelId":"eleven_v3","voiceId":"...","durationFrames":132,"expectedFrames":132,"driftPct":0.0,"bytesWritten":48044,"estimatedCostUsd":0.013,"retries":0,"status":"GEN","shaText":"..."}
```

Phase 6 QA + Phase 7 retrospective consume the JSONL programmatically.

**Patterns to follow:**

- UMB precedent: `projects/undercover-mob-boss/scripts/generate-narrator.ts`
  — VOICE_DIRECTION guard at lines 194-198 (Gemini-specific; Phase 2
  generalizes to 3 per-engine variants); `pcmToWav()` at lines 127-155
  (Phase 2 ports verbatim, parameterizes sample rate); MAX_RETRIES +
  linear backoff at line 21 + lines 240-247; `dotenv/config` import
  pattern (UMB doesn't; Phase 2 evolves per Briggsy autonomy rule).
- `node:util.parseArgs` with `strict: true` (UMB precedent at
  `generate-narrator.ts:61-71`); rejects unknown flags loudly.
- Hash-based skip-or-regen pattern (sidecar `${wav}.meta.json` with
  sha256 of inputs).
- Cumulative spend tracker with hard ceiling abort (`tts-spend.json`).

**Test scenarios:**

- **Happy path:** First invocation generates 14-15 WAVs across all
  scenes (15 if R5=kept-via-A; 14 if R5=cut/kept-via-B). Second
  invocation hash-skips all (no regen).
- **Happy path:** `--only S04-payoff-a` filters to just that cue.
- **Happy path:** `--dry-run` lists target WAVs without API calls.
- **Edit-and-rerun:** Edit a cue's `text` in Phase 1's `script.ts`;
  rerun `pnpm tts` (no `--force`); the edited cue auto-regens via
  hash-mismatch detection; other cues skip.
- **Edge case:** Missing API key → fatal error with concrete
  remediation message (which env var, which engine, where to set).
- **Edge case:** API 429 → 3-attempt retry with linear backoff
  (5s/10s/15s + jitter); aborts after total budget exceeded.
- **Edge case:** API 401/403 → fatal exit, no retry (don't burn
  money chasing a bad key).
- **Edge case:** R5=cut → cue 2400 skipped; manifest excludes;
  `script-coverage.test.ts` passes.
- **Edge case:** R5=kept-via-B → cue 2400 skipped in this script;
  message points executor to Unit 2.Y (`pnpm hybrid-scream`).
- **Edge case:** Engine=voice-actor → script exits immediately
  pointing to Unit 2.X.
- **Edge case:** Cumulative spend exceeds $30 → fatal abort unless
  `TTS_BUDGET_OVERRIDE=1`.
- **Edge case:** Gemini returns PCM not WAV → `isValidWav()` guard
  catches; clear error pointing to `pcmToWav` wrap requirement.
- **Anti-pattern guard:** Grep for prepended direction in script
  payloads: `rg --pcre2 '(deadpan:|style:|voice_direction|\\[deadpan\\])' videos/trailer/scripts/tts-clients/`
  → returns zero matches (only inline VOICE_DIRECTION guard
  comments).
- **Anti-pattern guard:** Grep for shell-interpolated child_process
  calls: `rg 'execSync\\(' videos/trailer/scripts/` → returns zero
  matches (all FFmpeg invocations use execFileSync argv arrays).

**Verification:**

- `generate-dash-tts.ts` exists + typechecks clean.
- Per-engine clients exist (only the Phase-0-locked one is actually
  invoked; others archived to `tts-clients/archived/` post-Phase-0
  execution per Tier 2 amendment).
- `wav-utils.ts` with `pcmToWav` + `isValidWav` typechecks.
- All 14-15 WAVs land in `public/audio/lines/` with sidecar
  `.meta.json` SHA files.
- VOICE_DIRECTION guard comment blocks intact (3 per-engine variants
  at API call sites).
- Generation log filed per run (both `.md` + `.jsonl`).
- TTS spend log filed; cumulative spend ≤ $30.

---

### Unit 2.3 — Cadence-Spec Steering Integration (Canary Pass)

- [ ] **Unit 2.3: Cadence-Spec Steering Integration**

> **DEEPENING NOTES (2026-05-17).** Amendments inherited from
> top-of-file deepening block:
> (1) Canary consumes per-engine cadence-spec adapter (NOT raw
> cadence-spec.md) matching PHASE-0-EXIT.md locked engine.
> (2) Per-cue cadenceAdapter.prefixTag prepended to text payload at
> API call site for engines with inline-tag support.
> (3) Structured 5-point Likert rubric replaces prose listening
> criteria (Register cluster / Pace match / Volume range / Articulation
> — each scored 0-5 vs Phase 0 reference; any dimension <4 routes to
> Step 3 fail-action).
> (4) On green canary, write `cadence-consistency-signoff.txt` sentinel
> in `sample-eval/voice-pipeline/`. Unit 2.4 asserts the sentinel
> before proceeding to full-batch generation (prevents accidental
> pre-canary execution).
> (5) Record `modelId` + cadence-spec adapter SHA + engine response
> revision header (where exposed) in `cadence-consistency.md` so
> reopens know what changed.
> (6) Post-batch re-canary: Unit 2.4.5 NEW STEP — after full batch
> completes, regenerate the original canary cue ONCE MORE with same
> inputs; compare duration to original canary; if drift >1%, abort
> + investigate model version drift mid-session.

**Goal:** Validate that the cadence-spec from Phase 0 Unit 0.2
correctly steers per-engine voice settings such that the generated
production WAVs land in the same Sterling-coded register as the Phase
0 evaluation WAVs. **Canary one cue per voice cell BEFORE the full
generation run.**

**Requirements:** R4 (cadence consistency between eval and production).

**Dependencies:** Unit 2.2 (`generate-dash-tts.ts` builds), Phase 0
Unit 0.2 cadence-spec.md.

**Files:**

- Create: `videos/trailer/sample-eval/voice-pipeline/cadence-consistency.md` —
  validates that one production WAV per voice cell sounds in the same
  register as Phase 0 Unit 0.2 evaluation WAVs.

**Approach:**

**Step 1 — Generate canaries.**

```
pnpm tts -- --cueFrame 1950        # Dash: stacked-payoff line (most load-bearing)
pnpm tts -- --cueFrame 60          # Cold-open speaker
pnpm tts -- --cueFrame 2400        # Dash scream (if R5 kept)
```

Produces 1–3 canary WAVs depending on R5 outcome.

The stacked-payoff line (cue 1950) is the trailer's load-bearing
emotional beat — it carries R3's stacked payoff. If cadence drifts
here, the whole trailer fails. It is the right canary.

**Step 2 — A/B compare against Phase 0 eval WAVs.**

For each canary, listen against the Phase 0 Unit 0.2 reference WAV
from the same voice cell:

- Dash canary vs `sample-eval/r4-dash/{winning-engine}/sample-2-monologue.wav`
- Cold-open canary vs `sample-eval/r14-cold-open/clips/candidate-4.wav`
  (or whichever candidate cleared)
- Scream canary vs `sample-eval/r5-scream/path-{a,b}.wav` (whichever
  cleared)

Listening criteria:

- Same Sterling-coded register? (deadpan, mid-Atlantic, sardonic-lift)
- Same speaking pace? (within ±10% wps)
- Same volume range? (no compression or expansion artifacts)
- Same articulation? (no engine-default neutral pace creeping in)

If A/B match: cadence-spec steering works in production. ✓
If drift: route to fail-action ladder (Step 3).

**Step 3 — Fail-action ladder.**

- **Engine drifted cadence in production-style generation:** check
  whether the steering payload is being applied. Most likely cause:
  voice_settings / system_instruction / instructions field not wired
  correctly in the per-engine client. Debug in Unit 2.2.
- **Engine model version changed since Phase 0 Unit 0.2 (rare but
  possible at 2026 platform velocity):** lock the model version in
  the API call (e.g., `model: 'gpt-4o-mini-tts-2026-04-15'`).
- **Engine character drift (engine update silently shifted voice
  cadence):** Phase 0 Unit 0.2 cadence-spec.md re-spec required. May
  trigger Phase 0 re-run for the canary line if drift is large.
- **All paths drift:** Path D (voice actor) fallback. Phase 0 fail-
  action ladder Step 5 re-engages.

**Step 4 — Sign-off + proceed to full generation.**

When all canaries clear, `cadence-consistency.md` records sign-off:

```md
## Cadence Consistency Sign-Off — YYYY-MM-DD
- Dash canary (s04-cue-1950-dash.wav): A/B verdict <accepted/regen>
- Cold-open canary (s01-cue-60-coldopen.wav): A/B verdict <accepted/regen>
- Scream canary (s05-cue-2400-dash-scream.wav): A/B verdict <accepted/regen/skipped-R5-cut>
- Engine version pinned at: <model id>
- Listener: Briggsy
- Proceed to full generation: YES / NO
```

**Patterns to follow:**

- Phase 0 Unit 0.2 register-recognition cluster (deadpan / dry /
  mid-Atlantic / sardonic).
- A/B-compare protocol from `feedback-eye-in-loop-beats-calibration-for-motion.md`
  (eye-in-loop applies to ear-in-loop here too).

**Test scenarios:**

- **Happy path:** Each voice cell's canary A/B-matches the Phase 0
  eval reference within Briggsy's listener tolerance.
- **Edge case:** Engine model version pin reduces re-run risk after
  platform changes.
- **Anti-pattern guard:** Drift not silently accepted — STOP the
  workflow, route to Step 3 fail-action.

**Verification:**

- `cadence-consistency.md` records A/B verdict per voice cell.
- All canaries land in `public/audio/lines/`.
- Full generation proceeds ONLY after canaries cleared.

---

### Unit 2.4 — Full Generation Run + Duration Audit

- [ ] **Unit 2.4: Full Generation Run + Duration Audit**

> **DEEPENING NOTES (2026-05-17).** Amendments inherited from
> top-of-file deepening block:
> (1) Asserts `cadence-consistency-signoff.txt` sentinel before
> starting (fails fast if Unit 2.3 canary hasn't cleared).
> (2) `pnpm tts` (NOT `tts:force`) — hash-based skip-or-regen
> handles invalidation automatically per Unit 2.2 amendment. Use
> `tts:force` only when explicitly resetting all WAVs.
> (3) Per-cue tolerance bands replace flat ±5%/±20%: sustained ±5%
> / list ±7% / payoff ±4% / scream ±20%; tolerance read from
> `cue.driftToleranceOverride ?? TOLERANCE_BY_TYPE[cue.cueType]`
> (per Phase 1 follow-up amendment to Line type — Unit 2.1 §Step 4).
> (4) Missing-WAV is FATAL not warning — exit code 2 lets pre-commit
> hooks discriminate. Drift-beyond-tolerance is exit code 3 with
> explicit next-action commands per cue.
> (5) NEW Step 4.5 (post-batch re-canary): regen the canary cue
> ONCE MORE; if drift >1% vs original canary, abort + investigate
> model version drift.

**Goal:** Generate all 14-15 WAVs (14 if R5=cut) in
`public/audio/lines/` using `pnpm tts`. Validate per-WAV duration
against Phase 1 expected frames per cue-type tolerance band. Route
any drift beyond tolerance to Unit 2.7 reconciliation with explicit
next-action commands.

**Requirements:** R4, R5 (conditional), R14.

**Dependencies:** Unit 2.3 (canaries cleared).

**Files:**

- `videos/trailer/public/audio/lines/*.wav` — full set, ~15 files.
- Create: `videos/trailer/scripts/audit-durations.ts` — the audit script.
- Create: `videos/trailer/sample-eval/voice-pipeline/duration-reconciliation.md` —
  per-cue actual vs expected frame counts; drift table.

**Approach:**

**Step 1 — Generation.**

```
pnpm tts:force                    # full regeneration after canary pass
```

(`--force` ensures we regenerate ALL, including canaries, so the
final WAVs come from one consistent session.)

**Step 2 — Duration audit (`execFileSync` pattern).**

```ts
// videos/trailer/scripts/audit-durations.ts
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { SCRIPT_CUES } from '../src/lib/script-lines';

const FPS = 30;
const TOLERANCE = 0.05;     // 5% drift acceptable for paced lines
const SCREAM_TOLERANCE = 0.20; // 20% drift acceptable for scream cue

function probeDuration(wavPath: string): number {
  // SAFE: argv array, no shell interpolation
  const out = execFileSync('ffprobe', [
    '-v', 'error',
    '-show_entries', 'format=duration',
    '-of', 'csv=p=0',
    wavPath,
  ], { encoding: 'utf-8' });
  return parseFloat(out.trim());
}

const linesDir = 'videos/trailer/public/audio/lines';
const report: Array<{ filename: string; actual: number; expected: number; drift: number; flag: string }> = [];

for (const cue of SCRIPT_CUES) {
  const wav = join(linesDir, cue.filename);
  if (!existsSync(wav)) {
    console.warn(`MISS ${cue.filename}`);
    continue;
  }
  const seconds = probeDuration(wav);
  const actualFrames = Math.round(seconds * FPS);
  const expected = cue.expectedFrames;
  const drift = (actualFrames - expected) / expected;
  const tolerance = cue.voice === 'dash-scream' ? SCREAM_TOLERANCE : TOLERANCE;
  const flag = Math.abs(drift) > tolerance ? '!!' : 'OK';
  report.push({ filename: cue.filename, actual: actualFrames, expected, drift, flag });
  console.log(`${flag} ${cue.filename}: ${actualFrames}f (expected ${expected}f, ${(drift * 100).toFixed(1)}%)`);
}

// Emit drift-reconciliation.md content
const tableRows = report.map((r) =>
  `| \`${r.filename}\` | ${r.expected} | ${r.actual} | ${(r.drift * 100).toFixed(1)}% | ${r.flag} |`
).join('\n');
console.log(`\n## Drift table\n\n| Cue | Expected | Actual | Drift | Verdict |\n|-----|----------|--------|-------|---------|\n${tableRows}`);
```

**Step 3 — Drift routing.**

- **All cues within ±5% (scream within ±20%):** proceed to Unit 2.5
  (post-processing).
- **One cue drifts beyond tolerance:** route to Unit 2.7
  reconciliation.
- **Multiple cues drift in same direction:** likely systemic engine
  pacing mismatch with Phase 1's wps assumption. Fix the cadence-spec
  pace direction globally; regen all.

**Step 4 — Scream-cue special handling.**

The scream WAV is an expressive outburst, not a paced line. The audit
accepts ±20% drift for the scream cue. If the scream lands at 1.2s or
1.8s, that's fine — Phase 4 places it at frame 2400 and lets it ring
out within the gameplay-audio bed.

**Patterns to follow:**

- `execFileSync` with argv array (NOT `execSync` with shell string).
  Project-wide security convention.
- FFprobe for duration measurement — already in UMB workflow.

**Test scenarios:**

- **Happy path:** All 15 WAVs generate; duration audit passes.
- **Edge case:** Single-cue drift triggers regen with pacing
  adjustment; second regen lands within tolerance.
- **Edge case:** Persistent systemic drift triggers Phase 1 reopen
  + roadmap status update.
- **Error path:** Missing WAV in `public/audio/lines/` → audit warns;
  unit does not exit clean.
- **Security:** No shell-string interpolation in any FFprobe call.

**Verification:**

- All 15 (or 14 if R5 cut) WAVs in `public/audio/lines/`.
- `duration-reconciliation.md` documents drift table + verdict.
- Any drift beyond tolerance routed to Unit 2.7 fix.

---

### Unit 2.5 — Audio Post-Processing

- [ ] **Unit 2.5: Audio Post-Processing**

> **DEEPENING NOTES (2026-05-17).** Substantive amendments — the
> Step 1-4 FFmpeg commands below are REPLACED. See Critical
> Constraints §Audio post-processing for full rationale:
> (1) **LUFS target: -16 LUFS, NOT -23** (broadcast was wrong for X /
> YouTube portfolio distribution; -23 plays audibly quiet vs feed
> normalization).
> (2) **`loudnorm` TWO-PASS** (single-pass drifts ±2-3 LU on clips
> <30s; every Phase 2 cue is in the danger zone). Pass 1 measures
> via `print_format=json -f null -`; Pass 2 applies measured values
> with `linear=true`.
> (3) **`silenceremove` areverse-sandwich pattern** (the original
> `start_periods=1:start_duration=0:...:stop_periods=1:stop_duration=0`
> can prematurely cut interior silence + drop final syllables).
> Correct pattern: `silenceremove ... , areverse, silenceremove ... ,
> areverse` — trims ONLY leading + trailing.
> (4) **`-ac 1` mono lock** on every FFmpeg invocation (Phase 2 raw
> didn't lock channels; mismatch with anullsrc silence corrupts
> concat-demuxer output in Units 2.6/2.7).
> (5) **Scream-cue overrides**: SKIP `silenceremove` entirely
> (preserve full attack), `fadeInMs: 0` (no leading fade),
> `curve=qsin` quarter-sine on fadeOut (smoother than linear).
> (6) **Per-cue fade override from Line type**: payoff cue 1950
> fadeInMs=5; "Phrasing." cue 2790 fadeOutMs=50. Other defaults
> 30ms/30ms.
> (7) **Atomic write pattern**: process to `${final}.tmp`,
> atomic-rename to final on FFmpeg success, delete tmp on error.
> Mid-process crash leaves either original intact OR new file
> complete, never partial.
> (8) **Sentinel-based skip-re-run**: sidecar `${final}.processed`
> stores `sha256(rawMtime + filterString)`; re-run sees sentinel
> + matching SHA → skips. Stale sentinel → re-processes.
> (9) **HALLUCINATED REFERENCE corrected** — original "UMB v3 audio
> processing pipeline" reference under Patterns to follow is FALSE
> (UMB has NO post-processing pipeline; ships raw Gemini PCM at
> 24kHz unprocessed). Replaced with "NEW for BURNED; no UMB
> precedent. EBU R128 reference + k.ylo.ph/2016/04/04/loudnorm.html
> canonical two-pass guide."

**Goal:** Apply TWO-PASS `loudnorm` (target -16 LUFS / LRA 9 / TP
-1.5 dBTP) + areverse-sandwich `silenceremove` (skip for scream cue)
+ per-cue `afade` shape with overrides + `-ac 1` mono lock to every
WAV in `public/audio/lines/`. Output written atomically via `.tmp`
intermediate; raw versions preserved in `public/audio/lines/raw/`
for fallback + re-processing if loudness target changes.

**Requirements:** Cross-cutting — every WAV must reach Phase 4 at
predictable loudness (-16 LUFS ±1 LU integrated) + true-peak
≤-1.5 dBTP + uniform 48kHz mono PCM_S16LE + boundary fade state.

**Dependencies:** Unit 2.4 (raw WAVs generated, durations validated).

**Files:**

- Create: `videos/trailer/scripts/post-process-tts.ts` — the FFmpeg
  wrapper.
- Create: `videos/trailer/public/audio/lines/raw/` — raw WAVs
  preserved.

**Approach:**

**Step 1 — Loudness normalization.**

FFmpeg `loudnorm` filter, EBU R128 standard:

- `I=-23`: integrated loudness target (broadcast standard)
- `LRA=7`: loudness range (allows dynamic delivery)
- `TP=-2`: true-peak ceiling (prevents clipping)
- `-ar 48000`: sample rate locked to 48 kHz (matches Phase 4
  video frame rate)
- `-c:a pcm_s16le`: uncompressed 16-bit PCM (Remotion-compatible)

**Step 2 — Silence trim.**

FFmpeg `silenceremove` filter removes leading + trailing silence
> -50dB (or -30dB for the scream cue specifically — preserves attack).

**Step 3 — Fade-in / fade-out.**

30ms `afade` at each end prevents click on cut-in / cut-out when
Phase 4 places the WAV at `<Audio from={frame}>`.

**Step 4 — Wrapper script (using `execFileSync`).**

```ts
// videos/trailer/scripts/post-process-tts.ts
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, renameSync } from 'node:fs';
import { join } from 'node:path';
import { SCRIPT_CUES } from '../src/lib/script-lines';

const linesDir = 'videos/trailer/public/audio/lines';
const rawDir = join(linesDir, 'raw');
if (!existsSync(rawDir)) mkdirSync(rawDir);

function probeDuration(wavPath: string): number {
  // SAFE: argv array
  const out = execFileSync('ffprobe', [
    '-v', 'error',
    '-show_entries', 'format=duration',
    '-of', 'csv=p=0',
    wavPath,
  ], { encoding: 'utf-8' });
  return parseFloat(out.trim());
}

for (const cue of SCRIPT_CUES) {
  const final = join(linesDir, cue.filename);
  const raw = join(rawDir, cue.filename);

  if (!existsSync(final) && !existsSync(raw)) continue;
  // Preserve raw before in-place overwrite
  if (!existsSync(raw) && existsSync(final)) renameSync(final, raw);

  // Scream-cue retains attack — wider silenceremove threshold
  const isScream = cue.voice === 'dash-scream';
  const trimThreshold = isScream ? '-30dB' : '-50dB';

  // Probe raw duration so we can compute END for fade-out
  const rawDuration = probeDuration(raw);
  const fadeOutStart = Math.max(0, rawDuration - 0.03);

  const filter = [
    'loudnorm=I=-23:LRA=7:TP=-2',
    `silenceremove=start_periods=1:start_duration=0:start_threshold=${trimThreshold}:` +
      `stop_periods=1:stop_duration=0:stop_threshold=${trimThreshold}`,
    `afade=t=in:st=0:d=0.03`,
    `afade=t=out:st=${fadeOutStart}:d=0.03`,
  ].join(',');

  // SAFE: argv array — no shell interpolation
  execFileSync('ffmpeg', [
    '-y',
    '-i', raw,
    '-af', filter,
    '-ar', '48000',
    '-c:a', 'pcm_s16le',
    final,
  ]);

  console.log(`POST ${cue.filename}`);
}
```

**Step 5 — Post-process audit.**

After post-processing, re-run `audit-durations.ts`. Silence-trim may
shorten WAVs by 200–500ms — verify the new durations remain within
Phase 1 tolerance. (Note: post-processed durations REPLACE raw
durations as the source of truth for Phase 4 placement; see Unit 2.8
manifest generation.)

**Patterns to follow:**

- UMB v3 audio processing pipeline (Briggsy's narrator-cleanup
  workflow — verify against repo history).
- FFmpeg `loudnorm` single-pass (two-pass available if quality
  insufficient; trailer scale single-pass suffices).
- `execFileSync` argv pattern.

**Test scenarios:**

- **Happy path:** Every WAV emerges at -23 LUFS ± 1 LU.
- **Happy path:** No WAV has >50ms of leading silence after trim.
- **Edge case:** Scream WAV retains its attack (silenceremove
  threshold widened to -30dB).
- **Error path:** Missing raw WAV → script warns + skips that cue.
- **Security:** No shell-string interpolation in FFmpeg calls.

**Verification:**

- All ~15 WAVs in `public/audio/lines/` are post-processed.
- Raw versions preserved in `raw/`.
- Post-process audit confirms loudness + duration within tolerance.

---

### Unit 2.6 — Intra-Line Beat Handling

- [ ] **Unit 2.6: Intra-Line Beat Handling**

> **DEEPENING NOTES (2026-05-17).** Amendments inherited from
> top-of-file deepening block:
> (1) **S04 payoff (frame 1950) is NO LONGER a beat cue.** Phase 1
> deepening split it into TWO separate cues — S04-payoff-a at frame
> 1950 + S04-payoff-b at frame 2010. The 600ms gap is handled by
> Phase 4 as `<Sequence from={2010}>` separation, NOT by Phase 2's
> intra-line beat machinery. The OpenAI two-WAV stitch for that beat
> is DELETED — was solving a problem Phase 1 already solved by
> cue-splitting.
> (2) **S03 cues DO have intra-line `[BEAT 0.3s]` markers** per Phase 1
> Unit 1.2 Step 4 (three beats inside S03's first segment cue). Unit
> 2.6's stitch handles THESE — not the deleted 1950 beat.
> (3) **Beat encoding is marker-tokens in text** (`{{BEAT_300MS}}`),
> NOT `afterWord` index (fragile to text edits). Generator strips
> tokens before TTS call; FFmpeg stitch inserts silence at the
> token-stripped position. Phase 1 follow-up amendment to Line type
> adopts canonical `{{BEAT_NNNMS}}` token format.
> (4) **Engine routing TABLE corrected** (Context7-verified):
> - ElevenLabs v3: `[pause:600ms]` syntax DOES NOT EXIST. Use FFmpeg
>   silence stitch fallback (was OpenAI-only, now default for ALL
>   engines on precision beats).
> - Gemini: SSML `<break>` NOT supported. FFmpeg stitch fallback.
> - OpenAI: no inline pause tag. FFmpeg stitch (already documented).
> - Voice actor (Path D): direction in casting brief.
> Result: ALL engines route precision intra-line beats through
> FFmpeg silence stitch. The per-engine inline-tag branch in the
> table is DELETED.
> (5) Beat-position verification (Step 3) automated via FFprobe
> `silencedetect` filter; manual listening replaced with ±15ms
> tolerance check on stitch-position.

**Goal:** For cues whose `text` contains `{{BEAT_NNNMS}}` marker
tokens (currently S03 cues with `[BEAT 0.3s]` markers from Phase 1
Unit 1.2 Step 4), split the text at the marker, generate each
segment as a separate API call, concatenate via FFmpeg silence
between segments, verify beat-position lands within ±15ms of expected.
Engine-agnostic stitch (was OpenAI-only fallback; now default for all
engines per Context7-verified inline-tag-syntax absence).

**Requirements:** R3 (stacked-payoff inner beat).

**Dependencies:** Unit 2.5 (base WAVs post-processed) — but for
ElevenLabs/Gemini paths, Unit 2.2 already handled the beat inline.
This unit is the verification + OpenAI fallback stitch.

**Files:**

- Create (OpenAI path only): `videos/trailer/scripts/stitch-beats.ts`
  — fallback stitch for engines without inline pause syntax.

**Approach:**

**Step 1 — Engine-routed beat handling.**

| Engine | Inline syntax | Method |
|--------|---------------|--------|
| ElevenLabs v3 | `[pause:600ms]` tag | Unit 2.2 elevenlabs.ts already inserts via `beats[]` argument; single WAV |
| Gemini 3.1 Flash TTS | SSML `<break time="600ms"/>` | Unit 2.2 gemini.ts inserts; single WAV |
| OpenAI gpt-4o-mini-tts | None | This unit's fallback stitch (Step 2) |
| Voice actor (Path D) | N/A | Direction in casting brief |

**Step 2 — OpenAI fallback stitch.**

If the Phase 0 winning path is OpenAI, beat handling falls to a
two-WAV stitch:

```ts
// videos/trailer/scripts/stitch-beats.ts
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { SCRIPT_CUES } from '../src/lib/script-lines';

const linesDir = 'videos/trailer/public/audio/lines';

function makeSilence(durSec: number, outPath: string) {
  // SAFE: argv array
  execFileSync('ffmpeg', [
    '-y',
    '-f', 'lavfi',
    '-i', `anullsrc=channel_layout=mono:sample_rate=48000`,
    '-t', String(durSec),
    '-c:a', 'pcm_s16le',
    outPath,
  ]);
}

function concatWavs(parts: string[], outPath: string) {
  // Build concat-list file
  const listPath = join(linesDir, 'temp-concat-list.txt');
  writeFileSync(listPath, parts.map((p) => `file '${p}'`).join('\n'));
  // SAFE: argv array
  execFileSync('ffmpeg', [
    '-y',
    '-f', 'concat',
    '-safe', '0',
    '-i', listPath,
    '-c', 'copy',
    outPath,
  ]);
}

// For OpenAI path: process cues with beats
const cuesWithBeats = SCRIPT_CUES.filter((c) => c.beats && c.beats.length > 0);
for (const cue of cuesWithBeats) {
  // Strategy: generate two halves via a Unit 2.2 helper that splits
  // text at the beat word index. Each half lands in public/audio/lines/
  // as `${cue.filename}.before` and `.after`. Concat with silence in
  // between to produce the final WAV.
  //
  // Specific implementation deferred to Phase 2 execution — depends on
  // which engine actually won Phase 0 Unit 0.2.
  console.log(`STITCH ${cue.filename}: ${cue.beats!.length} beat(s)`);
}
```

**Step 3 — Beat-position verification.**

Post-stitched WAV audit:
- Total duration matches expected (e.g., S04 1950: ~108 frames).
- The pause lands at the right syntactic position (between
  "operation." and "They") — verified by listening.

**Step 4 — Cross-path verification.**

Whichever path was used (inline tag or stitch), the resulting WAV
must:
- Match `cue.expectedFrames` ± 5%.
- Have audible silence inside the line at the beat position.
- Have no audible artifact at the join (no click, no level
  discontinuity).

**Patterns to follow:**

- ElevenLabs `[pause]` tag documentation.
- FFmpeg `concat` demuxer pattern with file list.
- Project security rule: `execFileSync` over `execSync`.

**Test scenarios:**

- **Happy path:** S04 cue 1950 WAV contains the 600ms beat at the
  correct position.
- **Happy path:** Engine-routed handling works without artifacts at
  the join points.
- **Edge case:** OpenAI path's two-WAV stitch joins cleanly via
  `-c copy` (sample-rate / bit-depth matched).
- **Error path:** If beat position can't be hit precisely (within
  ±15ms), regen with adjusted text-position or split into two cues
  in SCRIPT_CUES.
- **Security:** No shell-string interpolation.

**Verification:**

- S04 cue 1950 WAV exists with the intra-line beat.
- Duration matches expected (~108 frames).
- Beat position verified by listening.

---

### Unit 2.7 — Phase 1 Reconciliation (Final Pass)

- [ ] **Unit 2.7: Phase 1 Reconciliation (Final Pass)**

> **DEEPENING NOTES (2026-05-17).** Substantive amendments:
> (1) **THREE-TIER escalation ladder** replaces flat "drift → Phase 1
> reopen" routing (Phase 1 is FROZEN per its own lock semantics; reopens
> are NOT routine). See Problem Frame §Phase 2's reconciliation:
>   - Tier 0: ±2% / ±1% total → absorbed silently into Phase 4 flex.
>   - Tier 1: Phase 2 regen with pacing-adjusted steering (no Phase 1).
>   - Tier 2: Phase 1 line-trim — invoke Step 2a reopen procedure.
>   - Tier 3: Phase 1 timing.ts adjustment — last resort.
>   - Tier 4: TOTAL_FRAMES adjustment — roadmap-level reopen.
> (2) **NEW Step 2a — Phase 1 reopen procedure**:
>   1. git commit pending Phase 2 work with msg "wip(trailer): pre-Phase-1 reopen at Phase 2 reconciliation".
>   2. Edit Phase 1's `script.ts` (Tier 2) or `timing.ts` (Tier 3).
>   3. Update `videos/trailer/BEAT-SHEET.md` to reflect the edit.
>   4. Rerun `pnpm test script.test.ts && pnpm test timing.test.ts` — both must pass.
>   5. Update `docs/plans/origin-trailer/roadmap.md` "Phase 1 status" section.
>   6. Re-deepen check: read Phase 4 + Phase 5 for any frame-number or line-text references; if any consumed the edited value, append a "Phase 1 reopen reconciliation" note documenting the new value.
>   7. git commit "fix(trailer): Phase 1 reopen at Unit 2.7 reconciliation — ${reason}".
>   8. Resume Phase 2 from Unit 2.4 with `pnpm tts`.
> (3) **Overrun-aware stitch**: `stitch-full-audio.ts` Step 3
> `cursorFrame` advance NOW handles negative gaps (cue overran the
> declared slot) by logging an OVERRUN warning + advancing
> `cursorFrame = next.startFrame` (subsequent cues remain at their
> declared frame; the overrun becomes audible overlap in the sign-off
> stitch, giving Briggsy something to hear before escalation).
> (4) **Sign-off sentinel**: on Briggsy's accepted verdict, write
> `phase-1-reconciliation-signoff.txt` sentinel. Unit 2.8 asserts.
> (5) **Stitch script flag `--quiet`**: omits music-bed bypass +
> SFX, ships ONLY narration + intra-scene silence. Cleaner sign-off
> listen than the full Phase 4 composite.

**Goal:** Verify every WAV's actual duration against Phase 1 scene
boundaries. If drift exceeds tolerance, route through the three-tier
reconciliation ladder. Phase 1 reopen (Tiers 2-3) follows Step 2a's
explicit procedure. On Briggsy sign-off, write the sentinel that
Unit 2.8 manifest codegen asserts.

**Requirements:** R7 (90–100s total runtime).

**Dependencies:** Units 2.4, 2.5, 2.6 (all WAVs generated + processed
+ stitched).

**Files:**

- Edit (potentially): `videos/trailer/BEAT-SHEET.md`,
  `videos/trailer/src/lib/timing.ts`, `videos/trailer/src/lib/script-lines.ts`.
- Create: `videos/trailer/sample-eval/voice-pipeline/phase-1-reconciliation.md` —
  final accepted state. If Phase 1 reopened, document what changed.
- Create: `videos/trailer/scripts/stitch-full-audio.ts` — concatenates
  all cues at scene-frame positions for sign-off listening.
- Create: `videos/trailer/sample-eval/voice-pipeline/full-audio.wav` —
  the sign-off file.

**Approach:**

**Step 1 — Aggregate runtime check.**

Sum all WAV durations + intra-scene silence (Phase 1 budgeted) +
scene-transition coverage. Compare to TOTAL_FRAMES = 2850.

| Voice band | Total frames | Phase 1 budget | Drift |
|------------|--------------|----------------|-------|
| Cold-open speech | <measured> | 132 | <%> |
| Dash speech (excluding scream) | <measured> | ~2200 (estimate) | <%> |
| Dash scream | <measured> | 45 | <%> |
| Intra-scene silence + transitions | derived | derived | derived |
| **Total** | <measured> | **2850** | **<should be 0%>** |

If drift on total is within ±2% (±60 frames ≈ ±2s), it's accepted.
Phase 4 has small intra-scene flex to absorb.

If drift exceeds ±2%: route to Step 2 reconciliation.

**Step 2 — Reconciliation options (ordered by preference).**

1. **Phase 1 line-trim (preferred).** If a specific cue overran, trim
   1–3 words from cue.text in `script-lines.ts` + BEAT-SHEET.md. Re-gen
   only that cue (low cost).
2. **Phase 1 timing.ts adjustment.** Expand or contract a scene's
   frame budget. Done in `timing.ts`. Cascade-aware: if S04 expands
   by 60 frames, S05 contracts by 60 (so TOTAL_FRAMES stays 2850).
3. **TOTAL_FRAMES adjustment.** Last resort. Move from 2850 to 2820
   or 2880. R7 allows 90–100s (2700–3000 frames). Document in
   roadmap status update.

**Step 3 — Full-audio stitch for sign-off.**

```ts
// videos/trailer/scripts/stitch-full-audio.ts
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { SCRIPT_CUES } from '../src/lib/script-lines';

const FPS = 30;
const linesDir = 'videos/trailer/public/audio/lines';
const evalDir = 'videos/trailer/sample-eval/voice-pipeline';
if (!existsSync(evalDir)) mkdirSync(evalDir, { recursive: true });

function probeDuration(wavPath: string): number {
  // SAFE: argv array
  const out = execFileSync('ffprobe', [
    '-v', 'error',
    '-show_entries', 'format=duration',
    '-of', 'csv=p=0',
    wavPath,
  ], { encoding: 'utf-8' });
  return parseFloat(out.trim());
}

function makeSilence(durSec: number, outPath: string) {
  if (durSec <= 0) return;
  // SAFE: argv array
  execFileSync('ffmpeg', [
    '-y',
    '-f', 'lavfi',
    '-i', `anullsrc=channel_layout=mono:sample_rate=48000`,
    '-t', String(durSec.toFixed(3)),
    '-c:a', 'pcm_s16le',
    outPath,
  ]);
}

const concatList: string[] = [];
const tmpDir = join(evalDir, 'tmp');
if (!existsSync(tmpDir)) mkdirSync(tmpDir, { recursive: true });

// Leading silence to startFrame of first cue
const firstCue = SCRIPT_CUES[0];
if (firstCue.startFrame > 0) {
  const leadSilence = join(tmpDir, 'lead.wav');
  makeSilence(firstCue.startFrame / FPS, leadSilence);
  concatList.push(`file '${leadSilence}'`);
}

let cursorFrame = firstCue.startFrame;
for (let i = 0; i < SCRIPT_CUES.length; i++) {
  const cue = SCRIPT_CUES[i];
  const wav = join(linesDir, cue.filename);
  if (!existsSync(wav)) { console.warn(`MISS ${cue.filename}`); continue; }
  concatList.push(`file '${wav}'`);
  const actualSec = probeDuration(wav);
  const actualFrames = Math.round(actualSec * FPS);
  cursorFrame += actualFrames;
  if (i < SCRIPT_CUES.length - 1) {
    const next = SCRIPT_CUES[i + 1];
    const gapFrames = next.startFrame - cursorFrame;
    if (gapFrames > 0) {
      const silencePath = join(tmpDir, `gap-${i}.wav`);
      makeSilence(gapFrames / FPS, silencePath);
      concatList.push(`file '${silencePath}'`);
      cursorFrame += gapFrames;
    }
  }
}

const listPath = join(tmpDir, 'concat-list.txt');
writeFileSync(listPath, concatList.join('\n'));
// SAFE: argv array
execFileSync('ffmpeg', [
  '-y',
  '-f', 'concat',
  '-safe', '0',
  '-i', listPath,
  '-c', 'copy',
  join(evalDir, 'full-audio.wav'),
]);
console.log('OK full-audio.wav generated');
```

Output: `videos/trailer/sample-eval/voice-pipeline/full-audio.wav`.
Briggsy listens; signs off in `phase-1-reconciliation.md`.

**Step 4 — Sign-off recording.**

```md
## Phase 2 → Phase 1 Reconciliation — SIGNED OFF
Date: 2026-MM-DD
Total runtime: <measured>s (target 95.0s, drift <%>)
Lines regenerated due to drift: <list or "none">
BEAT-SHEET.md edits: <list or "none">
timing.ts edits: <list or "none">
Audio playback verdict (Briggsy): <accepted / rejected>
```

**Patterns to follow:**

- `feedback-stats-single-source.md` discipline applied to WAV
  durations.
- `feedback-eye-in-loop-beats-calibration-for-motion.md` — ear-in-loop
  on audio sign-off.
- `execFileSync` argv pattern across all FFmpeg / FFprobe calls.

**Test scenarios:**

- **Happy path:** Total runtime drift within ±2%; no Phase 1 reopen.
- **Edge case:** S04 cue overrun → 2-word trim → regen → reconciled.
- **Edge case:** Persistent drift forces TOTAL_FRAMES adjustment;
  roadmap status updated.
- **Anti-pattern guard:** Drift not silently accepted — workflow
  STOPS at >2% drift, routes to reconciliation.

**Verification:**

- `full-audio.wav` exists for sign-off listen.
- `phase-1-reconciliation.md` documents final state.
- Briggsy signs off on the audio-only playback.

---

### Unit 2.8 — Asset Inventory + Phase 4 Hand-Off

- [ ] **Unit 2.8: Asset Inventory + Phase 4 Hand-Off**

> **DEEPENING NOTES (2026-05-17).** Substantive amendments:
> (1) **Voice union ALIGNED to Phase 1's** `'dash'|'sable'|'janet'|'vera'`
> (was the old `'dash'|'cold-open-speaker'|'dash-scream'` triple — DEAD).
> (2) **`AudioAsset` extended** with Phase-4-consumption hints
> (deepening locks):
>   - `leadFramesHint?: number` — Phase 4 places audio at
>     `from={asset.startFrame - (asset.leadFramesHint ?? 0)}` for
>     perceptual A/V sync (payoff cue 1950 = 2; scream cue 2400 = 1).
>   - `cadenceAdapter` mirrored from Phase 1's Line (Phase 4 may
>     consume the `notes` field for additional context).
>   - `loudnessLufs` — measured integrated loudness post-Unit-2.5
>     (Phase 6 QA consumes).
>   - `cueType` — sustained / list / payoff / scream (Phase 4 may use
>     for music-bed ducking decisions).
> (3) **`staticPath` consumption pattern** documented for Phase 4:
> `<Sequence from={asset.startFrame - (asset.leadFramesHint ?? 0)}><Audio src={staticFile(asset.staticPath)} /></Sequence>`.
> NOT `<Audio from={...}>` — that prop doesn't exist on
> `@remotion/media`'s `<Audio>`. Critical cross-phase amendment to
> Phase 4 deepening.
> (4) **Initial stub manifest ships in Phase 0 Unit 0.1 scaffold**
> (`export const AUDIO_ASSETS: readonly AudioAsset[] = [] as const`)
> so Phase 4 typecheck imports always resolve even before Phase 2
> runs. Codegen overwrites the data file post-reconciliation.
> (5) **`audio-manifest-types.ts` separated from `audio-manifest.ts`**
> so the type stays stable while the data churns under codegen.
> (6) **R5=cut handling**: AUDIO_ASSETS filter excludes the scream
> cue when PHASE-0-EXIT.md outcome is `cut`. Manifest typechecks at
> both branches.
> (7) **Sign-off sentinel assertion**: codegen reads
> `phase-1-reconciliation-signoff.txt` sentinel; aborts with clear
> error if absent.

**Goal:** Final inventory of Phase 2 deliverables; export a typed
machine-readable manifest Phase 4 imports for `<Audio>` placement +
per-cue volume / lead-frame hint resolution. Manifest is codegen
output from a post-reconciliation script that probes each
post-processed WAV via FFprobe for actual duration + integrated
loudness, then emits per Phase 1 Line shape extended with Phase-2
production fields.

**Requirements:** Cross-cutting — Phase 4 needs to load WAVs by
filename + frame placement + actual duration.

**Dependencies:** Unit 2.7 (reconciliation signed off).

**Files:**

- Create: `videos/trailer/src/lib/audio-manifest.ts` — typed manifest
  Phase 4 imports.
- Create: `videos/trailer/scripts/generate-audio-manifest.ts` —
  re-runnable codegen.
- Create: `videos/trailer/sample-eval/voice-pipeline/asset-inventory.md` —
  human-readable inventory.

**Approach:**

**Step 1 — Audio manifest type.**

```ts
// videos/trailer/src/lib/audio-manifest.ts
export interface AudioAsset {
  /** Cue filename in public/audio/lines/. */
  filename: string;
  /** Static-file path consumable by Remotion staticFile(). */
  staticPath: string;
  /** Frame at which this audio enters. */
  startFrame: number;
  /** Measured frame duration (post-processed actual). */
  actualFrames: number;
  /** Voice cell. */
  voice: 'dash' | 'cold-open-speaker' | 'dash-scream';
  /** Original Phase 1 expected duration. */
  expectedFrames: number;
}

// Populated by generate-audio-manifest.ts post-Unit-2.7 reconciliation
export const AUDIO_ASSETS: readonly AudioAsset[] = [
  // codegen output appears here — see generate-audio-manifest.ts
] as const;
```

**Step 2 — Codegen script.**

```ts
// videos/trailer/scripts/generate-audio-manifest.ts
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { SCRIPT_CUES } from '../src/lib/script-lines';

const FPS = 30;

function probeDuration(wavPath: string): number {
  // SAFE: argv array
  const out = execFileSync('ffprobe', [
    '-v', 'error',
    '-show_entries', 'format=duration',
    '-of', 'csv=p=0',
    wavPath,
  ], { encoding: 'utf-8' });
  return parseFloat(out.trim());
}

const entries = SCRIPT_CUES.map((cue) => {
  const wav = `videos/trailer/public/audio/lines/${cue.filename}`;
  const seconds = probeDuration(wav);
  return {
    filename: cue.filename,
    staticPath: `audio/lines/${cue.filename}`,
    startFrame: cue.startFrame,
    actualFrames: Math.round(seconds * FPS),
    voice: cue.voice,
    expectedFrames: cue.expectedFrames,
  };
});

const tsBody = `
// AUTOGENERATED by scripts/generate-audio-manifest.ts — do not edit by hand.
import type { AudioAsset } from './audio-manifest-types';

export const AUDIO_ASSETS: readonly AudioAsset[] = ${JSON.stringify(entries, null, 2)} as const;
`.trim();

writeFileSync('videos/trailer/src/lib/audio-manifest.ts', tsBody + '\n');
console.log(`OK audio-manifest.ts generated with ${entries.length} entries`);
```

**Step 3 — Inventory checklist.**

```md
# Phase 2 Asset Inventory

## WAV files in public/audio/lines/
- [x] s01-cue-60-coldopen.wav         (cold-open speaker)
- [x] s02-cue-240-dash.wav            (Dash)
- [x] s03-cue-600-dash.wav            (Dash)
- [x] s03-cue-870-dash.wav            (Dash)
- [x] s04-cue-1080-dash.wav           (Dash)
- [x] s04-cue-1110-dash.wav           (Dash)
- [x] s04-cue-1290-dash.wav           (Dash)
- [x] s04-cue-1410-dash.wav           (Dash)
- [x] s04-cue-1560-dash.wav           (Dash)
- [x] s04-cue-1680-dash.wav           (Dash)
- [x] s04-cue-1950-dash.wav           (Dash, with intra-line beat)
- [x] s05-cue-2280-dash.wav           (Dash, sparse over gameplay)
- [x] s05-cue-2400-dash-scream.wav    (Dash, scream) ← OR omitted if R5 cut
- [x] s06-cue-2610-dash.wav           (Dash)
- [x] s06-cue-2790-dash.wav           (Dash, "Phrasing")

## Manifest exports
- [x] src/lib/script-lines.ts         (SCRIPT_CUES — source of truth)
- [x] src/lib/audio-manifest.ts       (AUDIO_ASSETS — Phase 4 import)

## Verification artifacts
- [x] sample-eval/voice-pipeline/generation-log.md
- [x] sample-eval/voice-pipeline/cadence-consistency.md
- [x] sample-eval/voice-pipeline/duration-reconciliation.md
- [x] sample-eval/voice-pipeline/phase-1-reconciliation.md
- [x] sample-eval/voice-pipeline/full-audio.wav         (sign-off listen)
- [x] sample-eval/voice-pipeline/asset-inventory.md     (this doc)

## Phase 4 hand-off
- Phase 4 scenes import AUDIO_ASSETS from src/lib/audio-manifest.ts
- Per-scene Audio placement uses startFrame + actualFrames
- All audio is post-processed (-23 LUFS, silence-trimmed, faded)
- No further audio processing needed in Phase 4 (volume only)
```

**Patterns to follow:**

- TypeScript codegen via `JSON.stringify` + `as const`.
- UMB v3 manifest pattern — verify against UMB's `src/lib/`.
- `execFileSync` argv pattern.

**Test scenarios:**

- **Happy path:** `audio-manifest.ts` typechecks; all 15 entries
  present (14 if R5 cut).
- **Happy path:** Inventory checklist all green.
- **Edge case:** R5 cut → no scream entry in AUDIO_ASSETS; manifest
  still typechecks.
- **Security:** Codegen script uses argv arrays for FFprobe.

**Verification:**

- `audio-manifest.ts` exists and is consumable by Phase 4 imports.
- `asset-inventory.md` exists.
- Phase 2 fully prepared for Phase 4 hand-off.

---

### Unit 2.X — Path D Voice-Actor WAV Ingestion (conditional)

- [ ] **Unit 2.X: Path D Voice-Actor WAV Ingestion**

> **CONDITIONAL UNIT — replaces Units 2.2-2.4 when PHASE-0-EXIT.md
> locks `engine: voice-actor`** (Phase 0 Unit 0.2 Sub-phase 0a Path D
> outcome). DEEPENING addition; not present in original Phase 2 draft.

**Goal:** Ingest voice-actor delivered WAVs into the standard Phase 2
pipeline. Skips all TTS API generation (Units 2.2-2.4); validates
deliverable filenames against `BURNED_TRAILER_LINES`; copies into
`public/audio/lines/`; routes through Unit 2.5 post-processing
(loudness normalize + silence-trim + fade) so Phase 4 receives the
same uniform AudioAsset manifest shape regardless of generation path.

**Requirements:** R4, R5 (conditional), R14 — same as Units 2.2-2.4
but fulfilled via human recording instead of TTS API.

**Dependencies:** Unit 2.0 preflight passes; Unit 2.1 contract
verified; Phase 0 Sub-phase 0a Brief Memo approved by Briggsy (per
Phase 0 Unit 0.2 fail-action ladder); voice actor delivered WAVs to
a staging directory.

**Files:**

- Create: `videos/trailer/scripts/ingest-path-d.ts` — the ingestion
  script.
- Create: `videos/trailer/sample-eval/voice-actor-delivery/raw/` —
  staging directory where actor-delivered WAVs land (actor uploads
  via Google Drive / Dropbox / email; Briggsy moves into this dir).
- Create: `videos/trailer/sample-eval/voice-actor-delivery/path-d-manifest.json`
  — mapping from actor-delivered filename → BURNED_TRAILER_LINES
  cue id. Maintained manually by Briggsy as deliverables arrive.
- Create: `videos/trailer/sample-eval/voice-actor-delivery/ingest-log.md`
  — per-batch ingest log + revision tracking.

**Approach:**

**Step 1 — `path-d-manifest.json` structure.**

```jsonc
// videos/trailer/sample-eval/voice-actor-delivery/path-d-manifest.json
{
  "actorName": "Jane Doe",
  "agentName": "voices.com / voice123 / personal",
  "casting_brief_path": "sample-eval/r4-dash/path-d-casting-brief.md",
  "deliveries": [
    {
      "cueId": "S01-coldopen",
      "actorFilename": "dash-trailer-line-01-take03.wav",
      "deliveredAt": "2026-MM-DDTHH:MM:SSZ",
      "actorNotes": "Take 3, deadpan emphasis on 'machine'",
      "revisionRequested": false
    },
    {
      "cueId": "S02-greeting",
      "actorFilename": "dash-trailer-line-02-take01.wav",
      "deliveredAt": "2026-MM-DDTHH:MM:SSZ",
      "revisionRequested": false
    },
    // ... entries for all BURNED_TRAILER_LINES cues
  ]
}
```

**Step 2 — Ingestion script.**

```ts
// videos/trailer/scripts/ingest-path-d.ts
import 'dotenv/config';
import { existsSync, mkdirSync, readFileSync, copyFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { BURNED_TRAILER_LINES } from '../src/lib/script.js';
import { cueFilename } from './lib/cue-filename.js';
import { ffmpegPreflight } from './lib/ffmpeg.js';
import { parsePhase0Exit } from './lib/phase-0-exit.js';
import { atomicWriteSync } from './lib/atomic-write.js';
import { isValidWav } from './tts-clients/wav-utils.js';

interface PathDDelivery {
  cueId: string;
  actorFilename: string;
  deliveredAt: string;
  actorNotes?: string;
  revisionRequested?: boolean;
}

interface PathDManifest {
  actorName: string;
  agentName: string;
  casting_brief_path: string;
  deliveries: PathDDelivery[];
}

async function main() {
  ffmpegPreflight();
  const cfg = parsePhase0Exit();
  if (cfg.engine !== 'voice-actor') {
    throw new Error(
      `Path D ingestion invoked but PHASE-0-EXIT.md locks engine=${cfg.engine}. ` +
      `Run pnpm tts instead (Units 2.2-2.4).`
    );
  }

  const STAGING = 'videos/trailer/sample-eval/voice-actor-delivery/raw';
  const MANIFEST_PATH = 'videos/trailer/sample-eval/voice-actor-delivery/path-d-manifest.json';
  const OUT_DIR = 'videos/trailer/public/audio/lines';

  if (!existsSync(MANIFEST_PATH)) {
    throw new Error(
      `Path D manifest missing: ${MANIFEST_PATH}\n` +
      `Maintain this file as voice actor delivers WAVs. See Unit 2.X Step 1 for shape.`
    );
  }
  const manifest: PathDManifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf-8'));
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

  // Build cueId → expected filename map
  const expectedByCueId = new Map(
    BURNED_TRAILER_LINES.map((line) => [line.id, cueFilename(line)] as const)
  );

  const missingDeliveries: string[] = [];
  const missingFiles: string[] = [];

  for (const line of BURNED_TRAILER_LINES) {
    if (line.frame === 2400 && cfg.r5Outcome === 'cut') continue;  // skip scream if cut

    const delivery = manifest.deliveries.find((d) => d.cueId === line.id);
    if (!delivery) {
      missingDeliveries.push(line.id);
      continue;
    }
    if (delivery.revisionRequested) {
      console.warn(`REVISION-PENDING ${line.id}: ${delivery.actorNotes ?? '(no notes)'}`);
      continue;
    }

    const sourcePath = join(STAGING, delivery.actorFilename);
    if (!existsSync(sourcePath)) {
      missingFiles.push(`${line.id}: ${sourcePath}`);
      continue;
    }

    // Validate WAV header (catches corrupt / wrong-format deliveries)
    const buf = readFileSync(sourcePath);
    if (!isValidWav(buf)) {
      throw new Error(
        `Path D delivery is not a valid WAV: ${sourcePath}\n` +
        `Actor must deliver 48kHz / 16-bit / mono PCM WAV. Reject + request revision.`
      );
    }

    const destPath = join(OUT_DIR, expectedByCueId.get(line.id)!);
    // Atomic copy via .tmp intermediate
    const tmp = `${destPath}.tmp`;
    copyFileSync(sourcePath, tmp);
    // Rename is atomic on POSIX same-FS:
    const { renameSync } = await import('node:fs');
    renameSync(tmp, destPath);

    console.log(`INGEST ${expectedByCueId.get(line.id)} ← ${delivery.actorFilename} (${statSync(destPath).size} bytes)`);
  }

  if (missingDeliveries.length || missingFiles.length) {
    const msg = [
      missingDeliveries.length
        ? `Missing manifest entries for: ${missingDeliveries.join(', ')}`
        : null,
      missingFiles.length
        ? `Manifest entries reference missing files:\n  ${missingFiles.join('\n  ')}`
        : null,
    ].filter(Boolean).join('\n');
    throw new Error(`Path D ingestion incomplete:\n${msg}`);
  }

  console.log('OK Path D ingestion complete. Run pnpm tts:post-process (Unit 2.5) next.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

**Step 3 — Post-ingestion routing.**

After successful ingestion, the executor runs:
- Unit 2.4 audit (`pnpm tsx scripts/audit-durations.ts`) — verifies
  actor-delivered WAVs match Phase 1 expected frame counts within
  tolerance bands. Drift handling identical to TTS path.
- Unit 2.5 post-processing (`pnpm tsx scripts/post-process-tts.ts`)
  — applies the same FFmpeg pipeline (two-pass loudnorm to -16 LUFS,
  areverse silenceremove, per-cue fade) to actor-delivered raws.
  Idempotent: re-runs OK; sentinel files prevent re-processing.
- Unit 2.6 NOT applicable for actor deliverables (actor handles
  intra-line beats during recording per casting brief direction).
- Unit 2.7 reconciliation — same sign-off audio stitch + Briggsy
  listen.
- Unit 2.8 manifest codegen — same shape (AudioAsset fields
  populated from probed actor WAVs).

**Step 4 — Revision-cycle handling.**

If a delivery's `revisionRequested: true` flag is set:
- Script logs `REVISION-PENDING` warning + skip.
- Briggsy contacts actor with specific feedback (e.g., "S04-payoff-a:
  pace too fast, needs deliberate emphasis on 'they WERE the
  operation'").
- Actor re-records + delivers new file with incremented take number
  (`dash-trailer-line-15-take04.wav`).
- Briggsy updates manifest entry: new `actorFilename`, new
  `deliveredAt`, set `revisionRequested: false`.
- Re-run `pnpm tsx scripts/ingest-path-d.ts` — picks up the revised
  delivery; idempotent overwrite via atomic-rename.

**Patterns to follow:**

- BURNED autonomy rule + `dotenv/config` import (same as TTS path).
- `feedback-imagen-budget.md` discipline analog: one-take-first per
  cue to align style; iterate.
- Atomic-write pattern matches Unit 2.2.

**Test scenarios:**

- **Happy path:** All BURNED_TRAILER_LINES cues have manifest entries
  + delivered WAV files; ingestion completes; all WAVs land in
  `public/audio/lines/`.
- **Edge case:** Revision requested on one cue → script warns +
  continues; partial ingestion documented in ingest-log.md.
- **Edge case:** Delivery is invalid WAV format → fatal error;
  reject + request revision.
- **Edge case:** Manifest entry missing for a cue → fatal error
  listing missing cue IDs.
- **Edge case:** R5=cut → scream cue skipped (no actor delivery
  expected).
- **Anti-pattern guard:** Path D ingestion script must NEVER make
  TTS API calls (no `tts-clients/` imports).

**Verification:**

- `ingest-path-d.ts` typechecks clean.
- `path-d-manifest.json` populated with all cue entries.
- All 14-15 actor-delivered WAVs land in `public/audio/lines/`.
- Unit 2.5 post-processing runs cleanly on Path D outputs (same
  pipeline as TTS path).
- AUDIO_ASSETS manifest typechecks; Phase 4 hand-off unchanged.

---

### Unit 2.Y — Path B Hybrid Scream Voice Changer (conditional)

- [ ] **Unit 2.Y: Path B Hybrid Scream Voice Changer**

> **CONDITIONAL UNIT — replaces scream cue generation in Unit 2.2
> when PHASE-0-EXIT.md locks `R5 outcome: kept-via-B`** (Phase 0
> Unit 0.6 Path B hybrid). DEEPENING addition; not present in
> original Phase 2 draft.

**Goal:** Generate the S05 scream cue (frame 2400) via ElevenLabs
Voice Changer (Speech-to-Speech) applied to a real human scream
recording, producing `s05-cue-2400-dash.wav` with the locked Dash
voice timbre. Replaces the Path A TTS `[shouts]` tag generation
specifically for the scream cue; all other cues continue via standard
Unit 2.2 TTS pipeline.

**Requirements:** R5 (Vera scream cameo, authentic or cut) — Path B
hybrid branch.

**Dependencies:** Phase 0 Unit 0.6 outcome = `kept-via-B`; source
human-scream recording exists at
`videos/trailer/sample-eval/r5-scream/source-recording.wav`
(Briggsy-recorded per Phase 0 Unit 0.6 Path B recording specs —
12-18" mic distance, multiple takes, peak ~-3 dBFS, length ~1.5s);
locked Dash voice ID in PHASE-0-EXIT.md §Voice Cast Lock.

**Files:**

- Create: `videos/trailer/scripts/hybrid-scream.ts` — Voice Changer
  caller.
- Create: `videos/trailer/sample-eval/r5-scream/path-b-output-log.md`
  — Voice Changer call log + spend tracking.

**Approach:**

**Step 1 — Voice Changer endpoint.**

ElevenLabs Speech-to-Speech endpoint (Phase 0 Unit 0.6 Path B
verified):
- Endpoint: `POST https://api.elevenlabs.io/v1/speech-to-speech/{voice_id}`
- Auth: `xi-api-key` header
- Body: `multipart/form-data` with:
  - `audio`: binary WAV file (source human scream)
  - `model_id`: `eleven_multilingual_sts_v2` (Voice Changer model)
  - `remove_background_noise`: `false` (assumes clean source per
    Phase 0 Unit 0.6 recording specs)
  - `output_format` (optional): default `mp3_44100_128`; specify
    `pcm_48000` for direct Phase 2 pipeline compatibility.

**Step 2 — Script.**

```ts
// videos/trailer/scripts/hybrid-scream.ts
import 'dotenv/config';
import { existsSync, readFileSync, createReadStream } from 'node:fs';
import { Buffer } from 'node:buffer';
import { ffmpegPreflight } from './lib/ffmpeg.js';
import { parsePhase0Exit } from './lib/phase-0-exit.js';
import { assertEnv } from './lib/env.js';
import { atomicWriteSync } from './lib/atomic-write.js';
import { pcmToWav, isValidWav } from './tts-clients/wav-utils.js';

const SOURCE_PATH = 'videos/trailer/sample-eval/r5-scream/source-recording.wav';
const OUTPUT_PATH = 'videos/trailer/public/audio/lines/s05-cue-2400-dash.wav';

async function main() {
  ffmpegPreflight();
  const cfg = parsePhase0Exit();

  if (cfg.r5Outcome !== 'kept-via-B') {
    throw new Error(
      `Path B hybrid invoked but PHASE-0-EXIT.md R5 outcome is ${cfg.r5Outcome}.\n` +
      `Run only when outcome = kept-via-B. For kept-via-A use Unit 2.2 (pnpm tts).`
    );
  }

  if (!existsSync(SOURCE_PATH)) {
    throw new Error(
      `Path B source recording missing: ${SOURCE_PATH}\n` +
      `Per Phase 0 Unit 0.6 Path B recording specs:\n` +
      `  - 12-18" mic distance (phone) or 6"+ (laptop)\n` +
      `  - Multiple takes; select peak ~-3 dBFS\n` +
      `  - Length ~1.5s; "VERAAA!!!" pop instantly\n` +
      `  - Save as 48kHz / 16-bit / mono PCM WAV`
    );
  }

  const apiKey = assertEnv('ELEVENLABS_API_KEY');
  const dashVoiceId = cfg.voiceIds.dash;
  if (!dashVoiceId) {
    throw new Error('PHASE-0-EXIT.md missing Dash voice ID — required for Voice Changer target.');
  }

  // Read source recording
  const sourceBuf = readFileSync(SOURCE_PATH);
  if (!isValidWav(sourceBuf)) {
    throw new Error(`Source recording is not a valid WAV: ${SOURCE_PATH}`);
  }

  // Voice Changer endpoint
  const url = `https://api.elevenlabs.io/v1/speech-to-speech/${dashVoiceId}`;
  const formData = new FormData();
  formData.append('audio', new Blob([sourceBuf], { type: 'audio/wav' }), 'source.wav');
  formData.append('model_id', 'eleven_multilingual_sts_v2');
  formData.append('remove_background_noise', 'false');
  formData.append('output_format', 'pcm_48000');  // PCM output for direct pipeline compatibility

  console.log(`Voice Changer: source=${SOURCE_PATH} → target voice=${dashVoiceId}`);

  // Linear backoff per Phase 2 convention (3 attempts, 5s/10s/15s + jitter)
  const MAX_RETRIES = 3;
  const BASE_DELAY_MS = 5000;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'xi-api-key': apiKey },
      body: formData,
    });

    if (res.ok) {
      const arrayBuf = await res.arrayBuffer();
      const pcm = Buffer.from(arrayBuf);
      // ElevenLabs pcm_48000 returns raw PCM — wrap in WAV header
      const wavBuf = pcmToWav(pcm, 48000);
      atomicWriteSync(OUTPUT_PATH, wavBuf);
      console.log(`OK ${OUTPUT_PATH} (${wavBuf.byteLength} bytes)`);
      console.log('NEXT: pnpm tsx scripts/post-process-tts.ts (Unit 2.5 with scream-attack-preservation overrides)');
      return;
    }

    if (res.status === 401 || res.status === 403) {
      throw new Error(`Voice Changer auth failure ${res.status}: ${await res.text()}`);
    }
    if (res.status === 429 || res.status >= 500) {
      const delay = BASE_DELAY_MS * attempt + Math.floor(Math.random() * 1000);
      console.warn(`Voice Changer ${res.status}, retry ${attempt}/${MAX_RETRIES} in ${delay}ms`);
      if (attempt < MAX_RETRIES) await new Promise((r) => setTimeout(r, delay));
      continue;
    }
    throw new Error(`Voice Changer ${res.status}: ${await res.text()}`);
  }
  throw new Error('Voice Changer retries exhausted');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

**Step 3 — Post-processing override.**

Voice Changer output routes through Unit 2.5 post-processing with
scream-attack-preservation overrides (Critical Constraints §Audio
post-processing):
- `cue.skipSilenceremove = true` (Phase 1 follow-up Line field) —
  Unit 2.5 reads this from the Line and omits silenceremove for
  cue 2400.
- `cue.fadeInMs = 0` — Unit 2.5 reads from Line; 0ms fade-in
  preserves the scream attack envelope.
- `cue.fadeOutMs = 30` + `curve=qsin` — quarter-sine smoother
  than linear.
- Two-pass loudnorm to -16 LUFS still applied (Voice Changer output
  is typically louder than narration; normalize down).

**Double-compression guard.** Run `ffprobe -show_entries format_tags=loudnorm`
on the Voice Changer output BEFORE Unit 2.5 post-processing. If
integrated loudness is already within ±2 LU of -16 (Voice Changer
already applied compression), skip the loudnorm pass for cue 2400
to avoid double-compression artifacts. Document in
`path-b-output-log.md`.

**Step 4 — Verification + Unit 2.4 audit integration.**

After Unit 2.Y completes, the scream WAV exists at
`public/audio/lines/s05-cue-2400-dash.wav`. Unit 2.4 audit script
processes it the same as any other cue:
- Duration: 45 frames (1.5s at 30fps) ±20% (scream tolerance band).
- Format: 48kHz / 16-bit / mono PCM (wrap-verified).
- `cue.cadenceAdapter.prefixTag` may still be `'[shouts]'` in the
  Line type (Phase 1 contract), but Unit 2.Y BYPASSES the prefix tag
  consumption (Path B is a different generation path).

**Patterns to follow:**

- ElevenLabs Speech-to-Speech API (Phase 0 Unit 0.6 Path B
  verification): https://elevenlabs.io/docs/api-reference/speech-to-speech/convert
- BURNED autonomy rule (`dotenv/config` auto-load).
- Linear backoff per Phase 2 convention (3 attempts, 5s/10s/15s
  + jitter).
- Atomic write pattern.

**Test scenarios:**

- **Happy path:** Source recording exists → Voice Changer call
  succeeds → output WAV lands at expected path → Unit 2.5 post-
  process applies scream-attack-preservation overrides → Unit 2.4
  audit confirms duration within ±20% tolerance.
- **Edge case:** R5 outcome is kept-via-A (not B) → script aborts
  immediately with pointer to Unit 2.2.
- **Edge case:** Source recording missing → fatal error with concrete
  recording specs from Phase 0 Unit 0.6 Path B.
- **Edge case:** Source recording is invalid WAV → fatal error.
- **Edge case:** Voice Changer returns already-compressed output →
  Unit 2.5 skip loudnorm + document in `path-b-output-log.md`.
- **Anti-pattern guard:** Script does NOT call the standard
  text-to-speech endpoint (`/v1/text-to-speech/`); only Voice Changer
  (`/v1/speech-to-speech/`).

**Verification:**

- `hybrid-scream.ts` typechecks clean.
- `s05-cue-2400-dash.wav` exists post-run (Path B variant).
- Unit 2.5 post-process completes without double-compression
  artifacts.
- Unit 2.4 audit reports scream cue within ±20% tolerance.
- AUDIO_ASSETS manifest includes the scream cue entry (R5=cut
  branch is the only path that EXCLUDES it).

---

## System-Wide Impact

- **Interaction graph:** Phase 2 ingests Phase 0 per-engine cadence-spec
  adapter + Phase 0 engine + voice IDs (via PHASE-0-EXIT.md parser) +
  Phase 1's `BURNED_TRAILER_LINES` machine contract from `script.ts`;
  produces post-processed WAVs + machine-readable audio-manifest.ts.
  Phase 4 imports `AUDIO_ASSETS` and places each cue per
  `<Sequence from={asset.startFrame - (asset.leadFramesHint ?? 0)}><Audio src={staticFile(asset.staticPath)} /></Sequence>`
  (NOT `<Audio from>` — that prop doesn't exist on `@remotion/media`).
- **Error propagation:** Drift between WAV durations and Phase 1
  budget propagates through Unit 2.7's **three-tier escalation ladder**
  (Tier 0 absorbed silently → Tier 1 Phase 2 regen → Tier 2 Phase 1
  line-trim via Step 2a reopen procedure → Tier 3 timing.ts → Tier 4
  TOTAL_FRAMES roadmap-level reopen). Phase 1 reopen is the LAST resort,
  not the first — expected drift profile ±3-7% per cue is absorbed
  silently.
- **State lifecycle risks:** `.env` API keys must be present (Unit 2.0
  preflight verifies). Generation runs are idempotent via **hash-based
  invalidation** (sidecar `${wav}.meta.json` SHAs — text edits in Phase 1
  auto-regen the affected cue without `--force`). Atomic-write pattern
  survives mid-process crashes. Cumulative TTS spend tracked + hard-
  aborted at $30 ceiling (`TTS_BUDGET_OVERRIDE=1` for explicit override).
- **API surface parity:** None — Phase 2 produces audio assets, not
  user-facing surfaces. Manifest is internal to the trailer project.
- **Integration coverage:** Phase 0 Unit 0.5 spike validated the
  `<Audio>` import + `<Sequence>` placement pattern in MP4 export;
  Phase 4 inherits.
- **Unchanged invariants:** BURNED game code untouched. Phone bundle
  budget unaffected. Trailer project remains isolated.

**Cross-phase dependencies surfaced by Phase 2 deepening** (downstream
phases must absorb during their own deepening passes):

- **Phase 1 follow-up amendments** (flagged not triggered; see Unit 2.1
  Step 4 for full list):
  - Add 7 optional fields to `Line` type: `expectedFrames`, `cueType`,
    `driftToleranceOverride`, `fadeInMs`, `fadeOutMs`, `skipSilenceremove`,
    `leadFramesHint`, `contextPrimingPrevious`, `contextPrimingNext`.
  - Per-cue overrides populated per Unit 2.1 §Step 4 table (e.g., S04
    payoff 1950 fadeInMs=5, leadFramesHint=2; S05 scream 2400 fadeInMs=0,
    skipSilenceremove=true; S06 phrasing 2790 expectedFrames=27 NOT 12,
    fadeOutMs=50, driftToleranceOverride=0.20).
  - Frame numbering canonicalization to absolute (Phase 1's S05/S06
    table currently mixes scene-relative notation).
  - Beat encoding canonical format `{{BEAT_NNNMS}}` marker tokens in
    text (text-edit-robust; replaces fragile afterWord index).
- **Phase 0 follow-up amendment** (flagged not triggered):
  - PHASE-0-EXIT.md template extension: add `Model ID:` field under
    §Voice Cast Lock; add per-voice-cell voice ID fields (Sable / Janet
    / Vera) when those are the locked cold-open speakers.
- **Phase 3:** No new dependencies — music-bed ownership in Phase 3
  Unit 3.5 confirmed; no overlap with Phase 2.
- **Phase 4 deepening must absorb:**
  - Voice union `'dash'|'sable'|'janet'|'vera'` (NOT old
    `'dash'|'cold-open-speaker'|'dash-scream'`).
  - `<Sequence from={asset.startFrame - leadFramesHint}><Audio src={staticFile(asset.staticPath)} /></Sequence>`
    pattern; NOT `<Audio from>`.
  - `<OffthreadVideo muted />` for S05 gameplay clip so Phase 5's
    captured audio doesn't bleed into S05 narration mix.
  - `leadFramesHint` consumption per cue (payoff 1950 = 2; scream
    2400 = 1).
- **Phase 5 deepening must absorb:**
  - Phase 5 ships `gameplay.mp4` AUDIO-STRIPPED (`ffmpeg -an`) for
    belt-and-suspenders with Phase 4's `muted` prop. Per Phase 1
    deepening, Phase 5 also ships `gameplay-markers.json` declaring
    in-point + BURNED-draw-marker frame — Phase 2 doesn't consume
    directly but the scream cue 2400 placement depends on Phase 4
    trimming gameplay so BURNED draw lands at scene-relative frame
    160 (per Phase 1 Unit 1.2 Step 6).
- **Phase 7:** No new Phase 2 deps surfaced.

---

## Risks & Dependencies (DEEPENING — refined with multi-agent findings)

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **`SCRIPT_CUES` / `BURNED_TRAILER_LINES` contract drift** | Resolved (deepening) | Very High (ships wrong narration) | Unit 2.1 deepening — `script-lines.ts` GUTTED; Phase 2 consumes Phase 1's `BURNED_TRAILER_LINES` directly; `cueFilename` derivation helper; `script-coverage.test.ts` asserts post-pipeline WAV coverage. |
| **Gemini gemini.ts writes invalid WAV (no pcmToWav)** | Resolved (deepening) | Very High (FFmpeg/Remotion can't decode) | Unit 2.2 Step 5 — `pcmToWav()` helper ported verbatim from UMB `generate-narrator.ts:127-155`; `isValidWav()` guard at write boundary. |
| **ElevenLabs `model_id: 'eleven_multilingual_v2'` silently ignores audio tags** | Resolved (deepening) | Very High (`[shouts]` read literally) | Unit 2.2 Step 2 — `model_id: 'eleven_v3'` for cues with cadenceAdapter.prefixTag; pinned per PHASE-0-EXIT.md. Context7-verified. |
| **ElevenLabs `[scream]` undocumented + tags-self-close** | Resolved (deepening) | High | Unit 2.2 Step 2 — `[shouts]` is canonical Sterling-CODED scream tag (Phase 0 Unit 0.6 deepening); SELF-CLOSING (`[shouts]text` not `[shouts]text[/shouts]`); Context7-verified. |
| **ElevenLabs `[pause:600ms]` doesn't exist in v3** | Resolved (deepening) | Medium | Unit 2.6 deepening — all precision intra-line beats route through FFmpeg silence stitch (was OpenAI-only fallback); inline-tag path DELETED for all engines. Per Phase 1 deepening, S04 payoff is now TWO cues (1950 + 2010), not one cue with intra-cue beat. |
| **Gemini model name `gemini-3.1-flash-tts` doesn't exist** | Resolved (deepening) | Very High (script can't run) | Unit 2.2 Step 3 — `gemini-2.5-flash-preview-tts` (verified current 2026 model name via Context7). |
| **`<Audio from={frame}>` prop doesn't exist** | Resolved (deepening) | Very High (Phase 4 audio placement broken) | Unit 2.8 deepening — manifest docs updated; `<Sequence from={asset.startFrame}><Audio src={staticFile(asset.staticPath)} /></Sequence>` is correct pattern per Phase 0 ADR #5 + Context7 verification. Cross-phase amendment to Phase 4 deepening flagged. |
| **`silenceremove` syntax cuts interior silence + drops syllables** | Resolved (deepening) | High | Unit 2.5 deepening — areverse-sandwich pattern (trims ONLY leading + trailing); skip silenceremove entirely for scream cue. |
| **Single-pass loudnorm inaccurate on clips <30s (drifts ±2-3 LU)** | Resolved (deepening) | Medium | Unit 2.5 deepening — TWO-PASS workflow per k.ylo.ph/loudnorm canonical guide; -16 LUFS target. |
| **-23 LUFS too quiet for X/YouTube portfolio distribution** | Resolved (deepening) | Medium | Unit 2.5 deepening — target -16 LUFS (compromise between broadcast -23 and platform-target -14); preserves dynamic range for cadence + payoff contrast. |
| **Concat-demuxer channel-layout mismatch corrupts output** | Resolved (deepening) | High | Critical Constraints + Unit 2.5 deepening — `-ac 1` mono lock on every FFmpeg invocation; matches anullsrc silence; uniform 48kHz mono PCM_S16LE pipeline. |
| **Mid-process crash leaves partial WAVs** | Resolved (deepening) | Medium (silent data corruption on re-run) | Atomic-write pattern (`${path}.tmp` intermediate, atomic-rename on success); applied across all Phase 2 FS writes. Combined with hash-based skip-or-regen for crash recovery. |
| **Engine cadence drifts in production vs Phase 0 eval** | Medium | High | Unit 2.3 canary structured 5-point Likert rubric; PHASE-0-EXIT.md model version pin; Unit 2.4.5 post-batch re-canary detects mid-session model drift. |
| **Per-cue WAV duration drifts beyond tolerance** | Medium | Medium (rare for paced lines after deepening) | Unit 2.4 per-cue-type tolerance bands (sustained ±5% / list ±7% / payoff ±4% / scream ±20%) replace flat ±5%; Unit 2.7 three-tier escalation ladder treats reopen as last resort. |
| **R5 scream Path B (Voice Changer) double-compression artifacts** | Low (after deepening) | Medium | Unit 2.Y deepening — ffprobe loudnorm tag check before Unit 2.5 post-process; if Voice Changer already compressed, skip the loudnorm pass for cue 2400. |
| **PHASE-0-EXIT.md parsing fragility** | Low (after deepening) | High (Phase 2 can't determine engine) | Unit 2.0 deepening — structured markdown parser with fail-fast error per missing field; Phase 0 follow-up amendment proposed for Model ID + per-voice-cell voice ID fields. |
| **Phase 1 reopen ceremony for routine drift** | Resolved (deepening) | Medium | Unit 2.7 three-tier escalation ladder — Tier 0 (silent absorb) and Tier 1 (Phase 2 regen) handle 90%+ of drift cases without Phase 1 reopen. Expected ±3-7% per cue absorbed silently. |
| **Hash-based skip miss on text edit** | Resolved (deepening) | Medium | Unit 2.2 hash-based invalidation (sidecar `${wav}.meta.json`) — stale WAVs auto-regen on text edit without `--force`. |
| **Cumulative TTS spend exceeds $30 silently** | Resolved (deepening) | Low | Unit 2.2 Step 7 cumulative spend tracker (`tts-spend.json`) with hard abort; `TTS_BUDGET_OVERRIDE=1` explicit override. |
| **Cold-open speaker single-line context starvation** | Medium | Medium (generic-sounding cold-open) | Unit 2.1 §Step 4 + Unit 2.2 Step 2 — ElevenLabs `previous_text`/`next_text` context-priming LOCKED ENABLED for same-scene adjacent cues + cold-open cue gets 2-3 priming lines from Phase 0 cadence-spec reference corpus. |
| **R5 cut after Unit 2.4 began** | Low | Low | Skip scream cue; AUDIO_ASSETS reflects absence; no orphan WAV; manifest typechecks at both branches. |
| **Path D voice-actor delivery handling absent** | Resolved (deepening) | High (executor-paralysis if Path D wins) | Unit 2.X NEW — Path D Voice-Actor WAV Ingestion. Triggers if PHASE-0-EXIT.md locks engine=voice-actor; skips Units 2.2-2.4; routes through Unit 2.5 post-processing. |
| **Path B hybrid scream handling absent** | Resolved (deepening) | Medium | Unit 2.Y NEW — Path B Hybrid Scream Voice Changer. Triggers if R5 outcome = kept-via-B; replaces Path A `[shouts]` generation for cue 2400. |
| **VOICE_DIRECTION anti-pattern reintroduced by future agent** | Low (codified per-engine guards) | Very high | Three per-engine guard variants inline at each engine client's API call site (per Phase 0 Unit 0.2 Key Tech Decisions). Lint-grep follow-up: assert all three guards exist in source. |
| **`.env` not present at script invocation** | Low | Low | Unit 2.0 preflight verifies per-engine keys present per locked engine before any API call. |
| **Shell-injection regression in FFmpeg invocations** | Low (project-wide rule) | High (security) | All Phase 2 scripts use `execFileSync` with argv arrays; `security_reminder_hook` enforces the convention. |
| **Mid-session model version drift (engine API rolls between canary + batch)** | Medium | High (silent cadence shift) | Unit 2.3 records `modelId` + cadence-spec adapter SHA + engine response revision header; Unit 2.4.5 post-batch re-canary detects drift. |
| **Trailer subproject scaffold not present (Phase 0 hasn't run)** | Low | Very High (every Phase 2 script fails) | Unit 2.0 preflight Step 1 verifies trailer scaffold (package.json + script.ts + timing.ts + BEAT-SHEET.md + PHASE-0-EXIT.md + cadence-spec.md) exist with clear fail-fast errors pointing to Phase 0/1. |

---

## Open Questions

### Resolved During Planning + Deepening (2026-05-17)

- **Per-line WAV granularity** confirmed (not monolithic).
- **Phase 1 `script.ts` is the single source of truth** for line
  content + frame placement. Phase 2 consumes via `BURNED_TRAILER_LINES`
  import; never re-defines. (Deepening — `SCRIPT_CUES` literal
  gutted.)
- **Engine + voice path** locked via PHASE-0-EXIT.md parser
  (`scripts/lib/phase-0-exit.ts`). Single source of truth; no
  `TTS_ENGINE` env var override of locked engine.
- **Per-engine cadence-spec adapter** consumption locked. Phase 2
  reads `cadence-spec-${engineKey}.{json|md}` matching the locked
  engine, NOT the raw `cadence-spec.md`.
- **Per-line `cadenceAdapter.prefixTag` consumption** locked. Engine
  clients prepend to text payload at API call site.
- **VOICE_DIRECTION guard** — three per-engine variants codified
  inline at each engine client's API call site.
- **Cadence-spec is steering input, never script-text prefix.**
- **Audio post-processing target: -16 LUFS** (NOT -23 broadcast).
  Two-pass loudnorm + areverse-sandwich silenceremove + per-cue fade
  shape with overrides + mono 48kHz PCM_S16LE lock.
- **Intra-line beat handling** routed through FFmpeg silence stitch
  for ALL engines (inline-tag path DELETED — `[pause:600ms]` doesn't
  exist in v3; SSML `<break>` not supported in Gemini; OpenAI never
  had inline tag).
- **S04 payoff is TWO cues, not one with intra-cue beat** (Phase 1
  deepening lock; Unit 2.6 amended).
- **Phase 1 reconciliation routes through three-tier escalation
  ladder** (Tier 0 silent absorb → Tier 1 Phase 2 regen → Tier 2
  Phase 1 line-trim → Tier 3 timing.ts → Tier 4 TOTAL_FRAMES
  roadmap reopen).
- **Shell-out security pattern** — `execFileSync` argv arrays
  throughout.
- **R5 outcome routing** locked: kept-via-A → Unit 2.2 [shouts] tag;
  kept-via-B → Unit 2.Y Voice Changer hybrid; cut → skip cue
  entirely.
- **Path D handling** locked: Unit 2.X conditional ingestion replaces
  Units 2.2-2.4 when PHASE-0-EXIT.md locks engine=voice-actor.
- **ElevenLabs `previous_text` / `next_text` context-priming** LOCKED
  ENABLED for same-scene adjacent Dash cues. Cross-scene boundaries
  omit (cold scene break intentional). PROMOTED from "Deferred to
  Implementation" per deepening.
- **Engine model version pins recorded in PHASE-0-EXIT.md.**
  ElevenLabs `eleven_v3` for tag cues; OpenAI `gpt-4o-mini-tts-2025-03-20`
  snapshot pin; Gemini `gemini-2.5-flash-preview-tts`. PROMOTED from
  "Deferred to Implementation" per deepening.
- **Scream tag/Path B routing decision** PROMOTED from "Deferred"
  per deepening — branching on PHASE-0-EXIT.md R5 outcome (kept-via-A
  / kept-via-B / cut) is explicit code path.
- **JSONL machine-readable generation log** added alongside Markdown
  human-readable log for Phase 6 QA + Phase 7 retrospective.
- **Hash-based skip-or-regen invalidation** locks via sidecar
  `${wav}.meta.json` SHA — stale WAVs auto-regen on text edit.
- **Atomic-write pattern** across all FS writes; mid-process crash
  recovery via `.tmp` intermediate + atomic-rename.
- **Cumulative TTS spend tracker** with hard abort at $30 ceiling;
  `TTS_BUDGET_OVERRIDE=1` explicit override.
- **CLI argv via `node:util.parseArgs`** (strict mode) replaces
  hand-rolled parser.
- **Sentinel-file gating between units** — Unit 2.3 → Unit 2.4 via
  `cadence-consistency-signoff.txt`; Unit 2.7 → Unit 2.8 via
  `phase-1-reconciliation-signoff.txt`.
- **Audio format lock**: 48kHz / 16-bit signed LE PCM / **MONO**
  (`-ac 1` everywhere); single-channel narration saves ~50% file
  size + eliminates concat-demuxer codec-mismatch errors.
- **FFmpeg ≥5.0 minimum version pin** (≥6.0 recommended); Unit 2.0
  preflight verifies.
- **Per-cue tolerance bands**: sustained ±5% / list ±7% / payoff ±4%
  / scream ±20%; tolerance read from per-Line `cueType` field (Phase
  1 follow-up amendment).
- **Per-cue fade-in/fade-out shape overrides**: default 30ms/30ms;
  S04 payoff 1950 fadeInMs=5; S06 phrasing 2790 fadeOutMs=50;
  scream 2400 fadeInMs=0 + curve=qsin.
- **Scream-attack preservation**: SKIP silenceremove for cue 2400
  entirely; preserve attack envelope.
- **Audio lead-frames hint** added to AudioAsset for perceptual A/V
  sync; payoff 1950 leadFramesHint=2; scream 2400 leadFramesHint=1.
- **"Phrasing." cue expectedFrames** corrected 12 → 27 (Sterling-
  CODED deliberate delivery at 1.6-1.8 wps payoff cadence is ~0.9s
  not 0.4s).
- **Hallucinated "UMB v3 audio processing pipeline" reference**
  removed (Unit 2.5 patterns); UMB has NO post-processing pipeline.

### Deferred to Implementation (post-deepening minimum set)

- **Specific ElevenLabs voice_settings numeric tuning** (stability /
  similarity / style values within the per-engine adapter JSON):
  Phase 0 Unit 0.2 chose engine + path; specific numeric values per
  voice may need re-tuning in Unit 2.3 canary structured rubric.
- **Whether full-audio.wav sign-off requires a second listener**
  (Briggsy alone vs Briggsy + one outside reviewer): default Briggsy
  alone; upgrade to two-listener if cadence quality is uncertain.

---

## Documentation / Operational Notes

- All Phase 2 artifacts land in `videos/trailer/public/audio/`,
  `videos/trailer/scripts/`, `videos/trailer/scripts/lib/`,
  `videos/trailer/scripts/tts-clients/`, `videos/trailer/src/lib/`,
  and `videos/trailer/sample-eval/voice-pipeline/`.
- TTS API keys (Gemini, ElevenLabs, OpenAI) loaded via `.env` at
  BURNED project root. Every script auto-loads via `dotenv/config`
  import per Briggsy autonomy rule.
- **PHASE-0-EXIT.md is the single source of truth** for engine +
  voice IDs + cadence-spec adapter path + scream outcome + model
  version pins. `scripts/lib/phase-0-exit.ts` parser reads at every
  script's `main()`. NO `TTS_ENGINE` env var override of locked
  engine (CLI `--engine` flag exists for canary debug only; warns
  vs locked).
- VOICE_DIRECTION inline guards (3 per-engine variants) live at
  each engine client's API call site
  (`scripts/tts-clients/{elevenlabs,gemini,openai}.ts`). Lint-grep
  follow-up: `rg --pcre2 'CRITICAL: VOICE_DIRECTION' videos/trailer/scripts/tts-clients/`
  → should return all three variants.
- Per-engine cadence-spec adapter files (Phase 0 Unit 0.2 Step 1.5
  deliverables) are the canonical steering inputs; Phase 2 reads the
  one matching the locked engine. NEVER reads raw `cadence-spec.md`.
  Edits to cadence-spec.md OR any adapter after Phase 0 sign-off
  require re-running Phase 2 Unit 2.3 canary + bumping the cadence-
  spec SHA in the sidecar `.meta.json` (auto-invalidates all cues
  for regen).
- Engine billing tracked via cumulative spend log
  `sample-eval/voice-pipeline/tts-spend.json` (machine-readable JSONL)
  + per-run human-readable summary in
  `sample-eval/voice-pipeline/generation-log.md`. Hard abort at $30
  ceiling; `TTS_BUDGET_OVERRIDE=1` in `.env` for explicit override
  (Briggsy approval recommended).
- All shell-out invocations use `execFileSync` with argv arrays per
  `security_reminder_hook` guidance. NEVER shell-interpolated
  variants. FFmpeg/FFprobe ≥5.0 required; Unit 2.0 preflight enforces.
- Atomic-write pattern (`${path}.tmp` intermediate + atomic-rename
  on success; delete tmp on error) applied to every FS write in
  Phase 2 — survives mid-process crashes.
- Hash-based skip-or-regen (sidecar `${wav}.meta.json` SHAs):
  filename existence alone doesn't gate skip; text edits in Phase 1
  auto-regen affected cues without `--force`.
- **Pre-commit checklist** (per BURNED's monorepo git topology — see
  `docs/conventions/dev-environment.md`):
  ```
  git status                                    # check for ../ paths
  git diff --cached --name-only                 # verify ONLY trailer files staged
  git diff --cached --name-only | wc -l         # count matches intent
  ```
  If parent-tree files appear in the staged list (e.g., Obsidian
  vault, other projects), `git reset` and re-stage by name. The
  monorepo's shared git index can sweep unrelated work into a Phase 2
  commit (caught 2026-05-09: a 6-file fix shipped as 67-file commit).
- **Sentinel files** gate inter-unit execution:
  - `cadence-consistency-signoff.txt` — written by Unit 2.3 on green
    canary; Unit 2.4 asserts before full-batch generation.
  - `phase-1-reconciliation-signoff.txt` — written by Unit 2.7 on
    Briggsy sign-off; Unit 2.8 asserts before manifest codegen.
  - `${final}.processed` — written by Unit 2.5 per cue;
    `sha256(rawMtime + filterString)`; re-run skips if sentinel matches.
- **Path D + Path B conditional unit invocations**:
  - Path D: `pnpm tsx videos/trailer/scripts/ingest-path-d.ts` (replaces
    Units 2.2-2.4).
  - Path B: `pnpm tsx videos/trailer/scripts/hybrid-scream.ts` (replaces
    scream cue branch of Unit 2.2).
  - Both feed into Unit 2.5 post-processing unchanged.

---

## Sources & References (DEEPENING — Context7-verified URLs + corrected citations)

**Origin documents:**
- Brainstorm: [`docs/ideation/2026-05-15-origin-trailer-brainstorm.md`](../../ideation/2026-05-15-origin-trailer-brainstorm.md)
- Roadmap: [`docs/plans/origin-trailer/roadmap.md`](./roadmap.md)
- Phase 0 plan: [`docs/plans/origin-trailer/phase-0-gate-resolution.md`](./phase-0-gate-resolution.md)
- Phase 1 plan: [`docs/plans/origin-trailer/phase-1-beat-sheet-lock.md`](./phase-1-beat-sheet-lock.md)
- Phase 0 cadence-spec output: `videos/trailer/sample-eval/r4-dash/cadence-spec.md`
- Phase 0 per-engine adapters (Phase 0 Unit 0.2 Step 1.5):
  `videos/trailer/sample-eval/r4-dash/cadence-spec-{elevenlabs.json,gemini.md,openai.md}`
- Phase 0 PHASE-0-EXIT.md template: Phase 0 plan §PHASE-0-EXIT.md template
  (lines 1819-1897)
- Phase 1 BEAT-SHEET: `videos/trailer/BEAT-SHEET.md`
- Phase 1 `script.ts` machine contract: `videos/trailer/src/lib/script.ts`
  (Phase 1 Unit 1.2 deliverable)
- Phase 1 `timing.ts` frame constants: `videos/trailer/src/lib/timing.ts`

**UMB v3 precedents:**
- Narrator generation script: `projects/undercover-mob-boss/scripts/generate-narrator.ts`
  (VOICE_DIRECTION guard at lines 194-198 — Gemini-specific; Phase 2
  generalizes to 3 per-engine variants); `pcmToWav()` helper at lines
  127-155 (Phase 2 ports verbatim, parameterizes sample rate);
  `isValidWav()` validation at lines 158-162; MAX_RETRIES + linear
  backoff at line 21 + lines 240-247.
- Narrator prompts (line set structure): `projects/undercover-mob-boss/scripts/narrator-prompts.ts`
  (TRAILER_V3_PROMPTS at lines 648-683 — structural ancestor of Phase
  1's `BURNED_TRAILER_LINES`).
- **CORRECTION (DEEPENING)**: original Phase 2 plan cited "UMB v3 audio
  processing pipeline" under Unit 2.5 Patterns — **this is hallucinated**.
  UMB has NO post-processing pipeline; ships raw Gemini PCM at 24kHz
  unprocessed (NLE editing pass handled normalization downstream).
  Phase 2's FFmpeg post-processing is NEW for BURNED.

**Engine API documentation (Context7-verified 2026):**
- ElevenLabs Text-to-Speech API: https://elevenlabs.io/docs/api-reference/text-to-speech
- ElevenLabs v3 audio tags + prompting controls (verified via Context7
  `/elevenlabs/elevenlabs-js`): https://elevenlabs.io/docs/best-practices/prompting/controls
  ([scream] is UNDOCUMENTED; [shouts]/[shouting] are canonical;
  tags self-closing; v3 model_id required for tag interpretation;
  v3 does NOT support `[pause:Xms]` syntax — only qualitative
  `[pause]`/`[short pause]`/`[long pause]`.)
- ElevenLabs voice_settings + style controls (Context7
  `/elevenlabs/elevenlabs-js` BodyTextToSpeechFull): https://github.com/elevenlabs/elevenlabs-js/blob/main/reference.md
- ElevenLabs `previous_text` / `next_text` / `previous_request_ids` /
  `next_request_ids` (context-priming, real API fields per Context7):
  same source.
- ElevenLabs Speech-to-Speech (Voice Changer): https://elevenlabs.io/docs/api-reference/speech-to-speech/convert
  (endpoint `POST /v1/speech-to-speech/{voice_id}` + `model_id:
  eleven_multilingual_sts_v2` + multipart audio + `remove_background_noise`).
- Gemini 2.5 Flash Preview TTS (current 2026 model name; was incorrectly
  `gemini-3.1-flash-tts` in pre-deepening Phase 2 draft):
  https://ai.google.dev/gemini-api/docs/speech-generation
  (returns base64 RAW PCM @ 24kHz mono — `pcmToWav` wrap MANDATORY;
  no SSML support; styling via natural-language prompts in user
  content with Director's Chair section markers.)
- OpenAI gpt-4o-mini-tts (snapshot pin `gpt-4o-mini-tts-2025-03-20`
  per community-corroborated compliance regression on `2025-12-15`):
  https://platform.openai.com/docs/models/gpt-4o-mini-tts and
  https://platform.openai.com/docs/guides/text-to-speech
  (`instructions` parameter for steering; `input` for script text;
  `response_format: 'wav'` returns WAV with header — no wrap needed.)
- OpenAI voice presets (2026): alloy, ash, ballad, coral, echo, fable,
  nova, onyx, sage, shimmer, verse, marin, cedar (13 total; marin/cedar
  top-quality additions): same source.

**Remotion documentation (Context7-verified `/remotion-dev/remotion`):**
- `<Audio>` from `@remotion/media` (NO `from` prop — offsets via
  `<Sequence from={N}>`): https://remotion.dev/docs/media/audio
- `<Sequence>` + `<Audio>` offset pattern: https://remotion.dev/docs/audio/start-and-end-times
- `volume` callback for music-bed ducking: https://remotion.dev/docs/audio/volume
- `<OffthreadVideo>` + `muted` prop (Phase 4 must use for S05
  gameplay clip): https://remotion.dev/docs/offthreadvideo

**FFmpeg references:**
- loudnorm filter (EBU R128): https://ffmpeg.org/ffmpeg-filters.html#loudnorm
- loudnorm two-pass canonical guide (FFmpeg author): https://k.ylo.ph/2016/04/04/loudnorm.html
  (single-pass inaccurate for clips <30s; two-pass with `linear=true`
  is correct for narration cues.)
- ffmpeg-normalize project (Context7 `/slhck/ffmpeg-normalize`):
  two-pass justification + LRA recommendations for voice.
- silenceremove filter: https://ffmpeg.org/ffmpeg-filters.html#silenceremove
- silenceremove areverse-sandwich canonical: https://superuser.com/questions/1145900
- afade filter: https://ffmpeg.org/ffmpeg-filters.html#afade
- concat demuxer + escaping: https://ffmpeg.org/ffmpeg-formats.html#concat-1
- concat filter (mismatch-tolerant): https://ffmpeg.org/ffmpeg-filters.html#concat

**Loudness targets per platform (Gemini-grounded 2026):**
- YouTube -14 LUFS, no boost below: https://support.google.com/youtube/answer/4582834
- Apple Podcasts -16 LUFS: https://podcasters.apple.com/support/893-audio-requirements
- EBU R128 -23 LUFS broadcast: https://tech.ebu.ch/docs/r/r128.pdf
- X/Twitter informal -10 to -14 LUFS (no official spec); -16 LUFS is
  the portfolio-trailer compromise per Tier 3 deepening lock.

**Security references:**
- Node `child_process.execFile` (safer than the shell-interpolating
  variant): https://nodejs.org/api/child_process.html#child_processexecfilesyncfile-args-options
- OWASP command injection: https://owasp.org/www-community/attacks/Command_Injection

**Institutional learnings (memory):**
- `feedback-narrator-voice-direction.md` — VOICE_DIRECTION anti-pattern
  (CRITICAL — made TWICE before codified; 3 per-engine variants in
  Phase 2 elevate from process to code-level guard).
- `feedback-stats-single-source.md` — duration audit discipline + the
  Phase 1 `script.ts` single-source-of-truth rule that gutted Phase 2's
  parallel `SCRIPT_CUES` literal.
- `feedback-eye-in-loop-beats-calibration-for-motion.md` — ear-in-loop
  on audio sign-off; Unit 2.7 full-runtime listen.
- `feedback-phase-plan-drafting-workflow.md` — write all phase files
  in one workflow; deepen sequentially after.
- `feedback-plans-are-baking-recipes.md` — paint-by-numbers BURNED-style
  deepening (Phase 2 inherits the bar; concrete code, concrete values,
  every cross-phase dep absorbed).
- `feedback-wait-for-all-agents.md` — synthesis discipline (Phase 2
  deepening waited for all 8 review agents + emil-design-eng synthesis
  before applying amendments).
- `feedback-imagen-budget.md` — budget discipline analog applied to
  TTS cumulative spend tracker + hard ceiling.
- `project-burned-sterling-coded-voice.md` — ADR #13 (Sterling-CODED
  cadence mimicry, never Benjamin-cloned identity; Phase 2 honors via
  per-engine cadence-spec adapters + per-line `cadenceAdapter.prefixTag`
  consumption).
- `docs/conventions/dev-environment.md` §Git topology — monorepo
  pre-commit checklist (caught 2026-05-09: 6→67 file commit risk).
