---
title: "Origin Trailer — Phase 2: Voice Pipeline"
type: feat
phase: 2
parent: docs/plans/origin-trailer/roadmap.md
origin: docs/ideation/2026-05-15-origin-trailer-brainstorm.md
created: 2026-05-16
deepened: 2026-05-17
reviewed: 2026-05-17
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
    override). [SUPERSEDED — see doc-review absorption block below
    for $50 lift + override deletion.]
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
    ≈ $2 total well under the $50 ceiling (DOC-REVIEW R3 lifted from
    $30; the "35% off" editorial framing on the prior estimate was
    actually ~23% — corrected number stands, framing claim dropped).

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

<!--
  Document-review pass landed 2026-05-17 via 7-persona parallel review
  (coherence + feasibility + product-lens + design-lens + security-lens
  + scope-guardian + adversarial-document-reviewer). 78 raw findings →
  47 unique after dedup. 6 product re-opens Briggsy-pre-approved and
  resolved live during absorption (R1–R6 below). Plan grew 4064 →
  ~5800 lines (~43% growth — matches Phase 1 doc-review pass shape).

  The dominant pattern this pass caught: **deepening drift**. The
  prior deepening (2026-05-17 morning) updated header amendment blocks
  correctly but FAILED to propagate the changes into the code blocks
  below them. Every persona caught variations of "the deepening notes
  say X, but the literal code in Unit 2.N still says Y" — exactly the
  anti-pattern Phase 1's review caught with the cascade cadence math
  error (5× over declared ceiling, claimed Resolved when wasn't).

  P0 mechanical absorptions (would crash at first execution):
  - **Five units (2.4 / 2.5 / 2.6 / 2.7 / 2.8) still imported
    `SCRIPT_CUES from '../src/lib/script-lines'`** — the file the
    deepening explicitly GUTTED. All five rewritten to consume
    `BURNED_TRAILER_LINES from '../src/lib/script.js'` +
    `cueFilename()` helper.
  - **`AudioAsset.voice` union in Unit 2.8** still declared
    `'dash'|'cold-open-speaker'|'dash-scream'` (dead triple). Rewritten
    to Phase 1-locked `'dash'|'sable'|'janet'|'vera'`. Phase 4's typed
    import now matches Phase 1's `Line.voice` union exactly.
  - **`cue.voice === 'dash-scream'`** scream-detection checks in Units
    2.4 + 2.5 (dead voice cell). Replaced with `cue.skipSilenceremove`
    + `cue.cueType` + `cue.driftToleranceOverride` reads from Phase 1's
    actually-shipped `Line` fields.
  - **Unit 2.5 code block** still ran `loudnorm=I=-23` single-pass +
    broken `silenceremove=...:stop_periods=1:stop_duration=0` pattern
    the deepening explicitly flagged as defective. Rewritten to
    two-pass loudnorm at -16 LUFS + areverse-sandwich silenceremove +
    per-cue fade overrides reading from `Line.fadeInMs`/`fadeOutMs` +
    `-ac 1` mono lock + scream-attack-preservation gated on
    `cue.skipSilenceremove`.
  - **Unit 2.4 audit script** used flat `TOLERANCE = 0.05` /
    `SCREAM_TOLERANCE = 0.20` constants instead of `TOLERANCE_BY_TYPE`
    per-cue-type bands (sustained ±5% / list ±7% / payoff ±4% /
    scream ±20%) that the deepening locked. Rewritten.
  - **Unit 2.6 engine routing TABLE** still listed ElevenLabs
    `[pause:600ms]` and Gemini SSML `<break time='600ms'/>` rows the
    deepening explicitly DELETED. Rewritten — ALL engines route
    precision intra-line beats through FFmpeg silence stitch.
  - **`generateForCue` call site at line ~1629** was missing the
    `engine` arg the dispatch declaration at ~1982 required. Every
    cue would have crashed with `Unknown engine: undefined`. Fixed.
  - **`assertWithinBudget()` ran ONCE at startup**, not per-cue — if
    lifetime spend at startup is $49 and the loop spends $3 more,
    no abort fires. The $50 ceiling was decorative. Moved INTO the
    cue loop, called per iteration.
  - **`--cueFrame` flag used in Unit 2.3 canary commands** does NOT
    exist in `parseCli()` (strict mode rejects). Rewritten to use the
    existing `--only` cue-id flag.
  - **Phase 1 follow-up amendments inventory was inaccurate** —
    Phase 1's locked plan already ships `cueType`, `expectedFrames`,
    `leadFramesHint`, `driftToleranceOverride`, `fadeInMs`, `fadeOutMs`,
    `skipSilenceremove`, `cadenceAdapter` (see phase-1-beat-sheet-lock.md
    Unit 1.2 lines 862-893). Phase 2 deepening claimed these were
    "follow-up amendments" to flag. The only GENUINE gaps are
    `contextPrimingPrevious` + `contextPrimingNext`. Unit 2.1 Step 4
    rewritten to flag ONLY the genuine gap.
  - **PHASE-0-EXIT.md ↔ Phase 2 parser contract was broken in 6
    places** (Feasibility agent's biggest haul):
    - Section headers: Phase 2 parser looks for
      `## Voice Cast Lock (Unit 0.2)`; Phase 0 template emits
      `## Section 1 — Voice Cast Disposition (Unit 0.2) [PHASE 1 BLOCKER]`
    - Field names: Phase 2 reads `Outcome`; Phase 0 writes `Disposition`
    - Engine value: Phase 2 expects short enum
      (`'elevenlabs-v3'|'gemini-tts'|'openai-tts'|'voice-actor'`);
      Phase 0 emits human-readable
      (`ElevenLabs Voice Library preset | ElevenLabs Briggsy Instant
       clone | Gemini 2.5 Flash Preview TTS | OpenAI gpt-4o-mini-tts |
       voice-actor name from Voices.com/Voice123`)
    - R5 outcome enum: Phase 2 expects `kept-via-A|kept-via-B|cut`;
      Phase 0 emits `kept-A|kept-B|cut`
    - `clearedPath` enum: Phase 2 declares
      `'A'|'B'|'C'|'Sub-phase-0a-D'|'Brainstorm-Restructure'`; Phase 0
      emits `A|B|C-Gemini|C-OpenAI|Sub-phase 0a (Path D) |
      Brainstorm-Restructure-(i)/(ii)/(iv)`
    - Voice ID: Phase 0 has one `Voice ID / actor identifier` field;
      Phase 2 expects four per-voice-cell fields (Sable / Janet /
      Vera as cold-open candidates)

    Phase 0 was doc-reviewed first (commit 5eb619b3) and is now
    locked. Phase 2 parser rewritten to consume Phase 0's actual
    emission shape via a normalization layer in `phase-0-exit.ts`.
    **No Phase 0 reopen triggered** — Phase 2 adapts.

  P1 architectural absorptions:
  - **`hashCueInputs` now includes cadence-spec adapter content SHA.**
    Previous shape silently ignored adapter edits — `voice_settings`
    changes in `cadence-spec-elevenlabs.json` would have failed to
    invalidate any WAV. Silent-staleness bug closed.
  - **ElevenLabs request: `Accept: 'audio/wav'` header REMOVED** —
    was contradictory with body `output_format: 'pcm_48000'`. Single
    source of truth (output_format) drives wrapping. Removes the
    hidden-TODO comment shape.
  - **Linear backoff formula corrected**: header text said
    `5000 * (attempt + 1)` (10s/15s/20s); code used `5000 * attempt`
    starting at attempt=1 (5s/10s/15s). Header text corrected to
    match code. Cap clamp added so total elapsed never exceeds 30s
    including jitter (`Math.min(delay, 30000 - elapsedSoFar)`).
  - **SSoT engine selection**: `--engine` override now MUST be paired
    with `--only <cueId>` to bound scope to canary-debug. Without
    `--only`, `--engine` exits 2 with `--engine override requires
    --only <cueId> scope`. Removes the warn-but-proceed footgun that
    broke the SSoT claim.
  - **Path B Voice Changer spend tracking**: `speech-to-speech` added
    to `cost-tracker.ts` (per-input-second billing, NOT per-char —
    ElevenLabs bills Voice Changer by audio input duration). Unit 2.Y
    now calls `trackSpend()` on success.
  - **Path D actor manifest PII**: raw `path-d-manifest.json` (with
    actorName / agentName / actorNotes) gitignored. Sanitized version
    (`path-d-manifest.sanitized.json` — cueId → delivery status only)
    committed. Actor identity treated as PII; policy documented in
    Documentation / Operational Notes.
  - **WAV files .gitignore**: new `videos/trailer/.gitignore` lock
    (Unit 2.0 preflight asserts presence). Excludes
    `public/audio/lines/*.wav`, `public/audio/lines/raw/*.wav`,
    `sample-eval/r5-scream/source-recording.wav` (Briggsy biometric
    flag — see Documentation / Operational Notes), `sample-eval/
    voice-actor-delivery/raw/*.wav`, `tts-spend.json`,
    `path-d-manifest.json`.
  - **Voice IDs in committed artifacts**: truncated to 8-char prefix
    in `preflight-log.md` and `generation-log.jsonl`. Was full
    plaintext — account-scoped credentials in tracked files.
  - **FFmpeg concat-list paths**: normalized to forward slashes for
    Windows portability (Briggsy on Windows 11 per CLAUDE.md). FFmpeg
    concat demuxer treats `\` as escape; `path.join` on Windows
    produces backslash paths.
  - **Unit 2.0 NEW Step 10**: live API verification of locked engine.
    HEAD `https://api.elevenlabs.io/v1/models` (or analog for
    Gemini/OpenAI) before any TTS call; assert locked `modelId` is
    listed; fail-fast with concrete next-action if absent. Catches
    `eleven_v3` alpha access gaps + OpenAI snapshot drift BEFORE
    first paid API call.
  - **Node version pinned**: `engines: { node: '>=20.0.0' }` added to
    `videos/trailer/package.json`; Unit 2.0 preflight asserts
    `process.versions.node >= 20.0.0`. `parseArgs` is Node 18.3+;
    20 is the comfortable floor.
  - **Trailer subproject scaffold absence**: promoted from "Low
    likelihood" to "Current state until Phase 0/1 execute." Risks
    table updated. The Phase 2 plan reads as if it can execute first;
    it can't.

  Product re-opens (Briggsy pre-approved full mitigation):
  - **R1. CANARY SWAPPED** — cue 1950 ("They WERE the operation.")
    is a 4-word truth-collision payoff at 1.6-1.8 wps band. Phase 1's
    deepening rewrote it from a longer line to this collapse. Won't
    validate Sterling-CODED register because cadence dimensions
    (deadpan / mid-Atlantic / sardonic lift / deliberate pace) need
    ≥8-10s of sustained speech to manifest. Swapped Dash canary to
    **S04-htp-1** (cascade scroll line, sustained, ≥10s, exercises
    full register cluster). Cue 1950 audited post-batch instead via
    the Unit 2.4.5 re-canary step. "Load-bearing for trailer emotional
    impact" ≠ "load-bearing for register recognition" — product-lens
    agent's framing accepted.
  - **R2. FINAL SIGN-OFF — N=1 BRIGGSY (CORRECTED 2026-05-22).** Earlier
    R2 deepening locked "N=2 minimum (Briggsy + Harry as outside
    reviewer)" on the premise that Harry was a human listener. Harry
    is AI (OpenClaw / Claude Code instance via Discord — see updated
    `user_harry.md`). The team shape is **just Briggsy + Claude(s)
    forever** (Briggsy 2026-05-22: *"there are no other players
    involved, it's just me and you my friend forever and ever … no
    future phase will change that"*). No multi-person human ear panel
    is structurally available for any forward-looking gate. **Final
    sign-off is N=1 (Briggsy) — production-cert standard.** The
    "escalate to N=6 if any dimension Likert <4" branch is also
    deleted (same broken premise). The Phase 0 R4 N=6 comparison in
    the prior R2 wording was always theoretical — Phase 0 EXIT
    (`videos/trailer/PHASE-0-EXIT.md` §"MUSHRA listener count: 1 / 6
    minimum") confirms the N=6 panel was never run; it was deferred
    to Phase 6 ADR #21 throughout. Phase 6's panel is amended the
    same way. Cross-ref: memory `feedback-listener-panels-default-
    to-n1.md`.
  - **R3. BUDGET PARADOX RESOLVED** — `$30` ceiling lifted to **`$50`**
    matching Phase 0 Unit 0.2 envelope. `TTS_BUDGET_OVERRIDE` env var
    DELETED entirely. The original shape was an autonomy-rule footgun:
    Claude self-setting it makes the ceiling decorative; Claude
    stopping to ask Briggsy violates the autonomy rule. At $50
    cumulative spend, hard-abort with no override; Briggsy
    edits the constant in `cost-tracker.ts` if extension is warranted
    (one-line edit, atomic intent signal). Estimated full run-cost
    profile (~$2 nominal, ~$6 worst-case with regen ladder) means
    $50 is ~25× expected; "hit the ceiling" actually means "something
    is wrong" and stopping is correct.
  - **R4. SINGLE-ENGINE COMMITMENT** — Phase 2 builds ONLY the engine
    PHASE-0-EXIT.md locks. Three-client build (`elevenlabs.ts` +
    `gemini.ts` + `openai.ts`) was procedural completionism — Phase 0
    Unit 0.2 picks ONE; PHASE-0-EXIT.md locks ONE; Phase 2 generates
    against ONE. Other engines re-implement on-demand if locked engine
    sunsets (Phase 1 reopen picks new engine anyway, costlier than
    the client code). Saves ~6-10 hours plan-execution time. Files
    list updated: `tts-clients/<engine>.ts` is created ONLY for the
    Phase-0-locked engine; `tts-clients/index.ts` dispatch becomes a
    one-case switch + a `'never'`-default that throws.
  - **R5. ELEVENLABS V3 ALPHA DEPRECATION CONTINGENCY** — `eleven_v3`
    is alpha (per ElevenLabs blog mid-2025) with documented breaking-
    change history. Phase 2 explicitly archives **raw API responses**
    (pre-post-process) to `public/audio/lines/raw/`. If v3 deprecates
    between Phase 2 close and Phase 6 distribution, locked WAVs ship
    from `raw/` via Phase 4's `staticFile()` — regen capability
    NOT presumed post-close. The post-processed WAVs in
    `public/audio/lines/` are the live source of truth; `raw/` is
    the immutable archive. Risks table updated.
  - **R6. COLD-OPEN PRIMING MULTI-ENGINE** — Phase 0 follow-up
    amendment NOT triggered. Instead, Phase 2 owns a
    `context-priming-overrides.json` file mapping cueId →
    `{previous?: string, next?: string}`. Loaded by
    `generate-dash-tts.ts` and passed to the engine client.
    ElevenLabs path → `previous_text` / `next_text` body fields
    (existing). Gemini path → priming text appended inside Director's
    Chair `### TRANSCRIPT` section above the cue text, then FFmpeg
    `-ss` post-gen trim. OpenAI path → priming embedded as examples
    in the `instructions` parameter (~150 added words within the
    ~500-word cap). Cold-open priming becomes engine-portable, not
    ElevenLabs-locked. Phase 0 engine selection criterion adds
    "cold-open priming feasibility" as tiebreaker.

  P2 polish absorptions:
  - **Unit 2.3 listening rubric**: 5-point Likert table replaces
    prose. Register cluster / Pace match / Volume range / Articulation
    each scored 0-5 vs Phase 0 reference. Any dimension <4 → Step 3
    fail-action. Codified in `cadence-consistency.md` scoring section.
  - **Sign-off filenames** updated: `s05-cue-2400-dash-scream.wav`
    → `s05-cue-2400-dash.wav` (matches `cueFilename()` output);
    `s01-cue-60-coldopen.wav` → `s01-cue-60-{coldOpenSpeaker}.wav`
    (resolves from PHASE-0-EXIT.md `coldOpenSpeaker` at sign-off
    time).
  - **`temp-concat-list.txt`** hardcoded path → per-invocation
    unique temp file (`tmp/concat-list-${cueId}-${Date.now()}.txt`)
    to prevent concurrent-run clobber when multiple `--only` targets
    execute in parallel (agent-driven workflows).
  - **`1000 chars` math editorial** — "35% off" framing claim removed
    (was actually ~23% off relative to 1300). The corrected number
    stands; framing claim deleted.
  - **R5=kept-via-B cue count clarification**: `pnpm tts` generates
    14 WAVs (excludes scream); Unit 2.Y separately generates the
    scream cue (`hybrid-scream.ts`); total deliverable count is 15.
    The "14 if R5=cut/kept-via-B" phrasing was conflating two
    different states.
  - **Phrasing cue audit**: `expectedFrames: 27` + `cueType: 'payoff'`
    + `driftToleranceOverride: 0.20` (payoff band's flat ±4% drift
    would reject the 27-frame Sterling-CODED deliberate delivery
    that the band's wps math (1.6-1.8 wps × 1 word = 17-19 frames)
    can't accommodate). Single-word expressive cues escape the band
    via tolerance override; multi-word payoff cues still get ±4%.
    The wps-band model assumes multi-word delivery — single-word
    expressive cues are out-of-distribution for the model and
    documented as such.
  - **Phrasing cue text-vs-band** documented as a known model
    limitation, not a math bug: the 1.6-1.8 wps band is calibrated
    for multi-word payoffs; "...Phrasing." is a 1-word expressive
    beat that's intentionally slower than the band's nominal speed.
    The override is the correct mitigation; the math claim "27 frames
    at 1.6-1.8 wps" is replaced with "27 frames Sterling-CODED
    deliberate delivery for a 1-word expressive beat at ~1.1 wps;
    band assertion does not apply to single-word cues."

  Cross-phase contract status post-absorption:
  - **Phase 0**: locked, no reopen triggered. Phase 2 normalizes
    Phase 0 emissions in `phase-0-exit.ts` parser. Future Phase 0
    deepening MAY add machine-readable lock sub-blocks; until then
    Phase 2 owns the normalization.
  - **Phase 1**: locked, no reopen triggered. Phase 2's
    `context-priming-overrides.json` owns the cold-open priming
    content WITHOUT extending Phase 1's `Line` type.
  - **Phase 3/4/5/6/7**: unchanged from prior deepening cross-phase
    notes (Phase 4 consumes the corrected `AudioAsset.voice` union;
    Phase 6 QA reads JSONL with truncated voice IDs).
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
7. Cumulative TTS spend ≤$50 (per `tts-spend.json`; ceiling lifted
   from $30 per DOC-REVIEW R3 to match Phase 0 envelope + remove the
   autonomy-paradox `TTS_BUDGET_OVERRIDE` footgun).

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

Phase 2 budget: **$50 ceiling** (DOC-REVIEW R3 — was $30; lifted to
match Phase 0 Unit 0.2 envelope + remove the autonomy-paradox footgun)
for all production TTS generation + regen iterations + Path B Voice
Changer per-second billing. $50 is ~25× the expected ~$2 nominal
run cost; hitting the ceiling means something is wrong, and stopping
is the correct behavior. (Cumulative with Phase 0 Unit 0.2's $50 cap
= $100 across both phases — well within budget.)

**Cumulative spend tracker (DEEPENING + DOC-REVIEW REWRITE).** Phase 2
enforces the ceiling via `scripts/lib/cost-tracker.ts`. Each successful
TTS API call appends to `videos/trailer/sample-eval/voice-pipeline/
tts-spend.json` with `{ runId, ts, cueId, engine, voiceIdPrefix, unit,
unitsBilled, estimatedCostUsd }`. The check fires **before each cue**
(not once at startup — was a defect: $49 + $3 = $52 with no abort).
Voice IDs are stored as 8-char prefixes, not full identifiers. If
total >$50 the script aborts. **No `TTS_BUDGET_OVERRIDE` env var
exists** (DOC-REVIEW: deleted; was autonomy-rule footgun). Extension
is a one-line edit to `HARD_CEILING_USD` in `cost-tracker.ts` —
atomic intent traced in git history.

```
ERROR: Phase 2 TTS spend cap exceeded: $52.17 > $50 ceiling.
No override env var exists by design.
Options:
  (a) Reduce iteration count via --only / --scene targeting.
  (b) If the ceiling genuinely needs to be lifted (extension warranted),
      edit HARD_CEILING_USD in cost-tracker.ts.
  (c) Reset spend tracker: rm sample-eval/voice-pipeline/tts-spend.json
      (only if starting a fresh budget cycle post-rework).
```

Path B Voice Changer (Unit 2.Y) bills per audio-input second, NOT
per char. `cost-tracker.ts` exposes `trackSpendInputSeconds()` for
that path. Both `trackSpend()` (char-billed) and `trackSpendInputSeconds()`
write to the same `tts-spend.json` with discriminator `unit: 'char' |
'input-second'`.

If Path D (voice actor) won Phase 0 Unit 0.2, Phase 2 TTS budget rolls
to whatever the actor's per-revision rate allows (separate line item;
not within the $50 TTS ceiling). Per Phase 0 Unit 0.2 ladder Path D
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

**Step 1 — Trailer scaffold + Node version + .gitignore check (DOC-REVIEW
EXPANSION).**

```ts
// scripts/preflight.ts
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const TRAILER_ROOT = 'videos/trailer';
const REQUIRED_FILES = [
  'package.json',
  '.gitignore',                   // NEW — Phase 2 doc-review: WAVs + spend log MUST be gitignored
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

// Node version check — Phase 2 uses node:util.parseArgs (≥18.3) + global
// FormData/Blob (≥18). Pin to ≥20 for comfort margin (Node 20 LTS).
const [major, minor] = process.versions.node.split('.').map(Number);
if (major < 20) {
  throw new Error(
    `Preflight: Node ${process.versions.node} below required ≥20.0.0.\n` +
    `Install Node 20 LTS via nvm/volta:\n` +
    `  nvm install 20 && nvm use 20\n` +
    `  volta install node@20\n` +
    `Phase 2 uses node:util.parseArgs strict-mode + global FormData.`
  );
}

// .gitignore content sanity — guard against committing WAV blobs +
// the Briggsy biometric scream source recording (Path B) + actor PII
// (Path D path-d-manifest.json) + spend log (account-leak vector).
const gitignore = readFileSync(join(TRAILER_ROOT, '.gitignore'), 'utf-8');
const REQUIRED_GITIGNORE_PATTERNS = [
  'public/audio/lines/*.wav',
  'public/audio/lines/raw/',
  'sample-eval/r5-scream/source-recording.wav',  // Briggsy biometric
  'sample-eval/voice-actor-delivery/raw/',
  'sample-eval/voice-pipeline/tts-spend.json',
  'sample-eval/voice-actor-delivery/path-d-manifest.json',  // actor PII
];
const missingPatterns = REQUIRED_GITIGNORE_PATTERNS.filter((p) => !gitignore.includes(p));
if (missingPatterns.length) {
  throw new Error(
    `Preflight: ${TRAILER_ROOT}/.gitignore missing required patterns:\n` +
    missingPatterns.map((p) => `  ${p}`).join('\n') +
    `\nAdd these patterns before generating any WAVs. Audio files + spend ` +
    `log + actor PII + biometric recordings MUST stay out of git history.`
  );
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

**Step 4 — `PHASE-0-EXIT.md` parser (DOC-REVIEW REWRITE — consumes
Phase 0's actual emission shape).**

The Phase 2 deepening's draft parser was misaligned with Phase 0's
actually-emitted template in 6 places (section headers / field names
/ engine value shape / R5 outcome enum / clearedPath enum / voice ID
field naming). Phase 0 was doc-reviewed first (commit `5eb619b3`) and
is now locked; Phase 2 normalizes Phase 0's emissions at parse time
rather than triggering a Phase 0 reopen. The one Phase 0 amendment
this pass DID trigger is additive per Phase 0's documented "add-only"
template policy: a `Speaker voice ID` field under Section 2 (Phase 0
amendments log entry 2026-05-17 P2.34).

Phase 0's emission shape (per `phase-0-gate-resolution.md` template
block at lines 2914–3028 of that plan):
- Section headers: `## Section N — <Name> Disposition (Unit 0.X)`
  with optional `[PHASE 1 BLOCKER]` suffix.
- Field names: `Disposition:` is the canonical outcome field; not
  `Outcome:`.
- Engine value: human-readable string like
  `ElevenLabs Voice Library preset`, `ElevenLabs Briggsy Instant
  clone`, `Gemini 2.5 Flash Preview TTS`, `OpenAI gpt-4o-mini-tts`,
  or `voice-actor name from Voices.com/Voice123`.
- Engine model version pin (separate field, the P2.20 amendment):
  short canonical identifier like `eleven_v3` /
  `gemini-2.5-flash-preview-tts` / `gpt-4o-mini-tts-2025-03-20`.
- R5 outcome: `kept-A (TTS)` / `kept-B (hybrid)` / `cut`.
- Cleared path: `A` / `B` / `C-Gemini` / `C-OpenAI` /
  `Sub-phase 0a (Path D)` / `Brainstorm-Restructure-(i)|(ii)|(iv)`.
- Voice ID / actor identifier (Section 1): primary briefer (Dash)
  voice ID.
- Speaker voice ID (Section 2, P2.34 amendment): cold-open speaker
  voice ID (Sable/Janet/Vera preset on engines where this matters).

```ts
// scripts/lib/phase-0-exit.ts
import { readFileSync } from 'node:fs';

/** Narrow engine family Phase 2 dispatches on. */
export type EngineFamily = 'elevenlabs-v3' | 'gemini-tts' | 'openai-tts' | 'voice-actor';

/** Narrow clearedPath enum Phase 2 branches on. */
export type ClearedPath = 'A' | 'B' | 'C' | 'D' | 'Brainstorm-Restructure';

export interface Phase0ExitConfig {
  /** Winning Path A/B/C/D — drives engine routing. Normalized from Phase 0's
   *  verbose value (`C-Gemini`/`C-OpenAI` collapse to `C`; `Sub-phase 0a (Path D)`
   *  collapses to `D`; `Brainstorm-Restructure-(i)|(ii)|(iv)` collapses to
   *  `Brainstorm-Restructure`). Granularity carried in `clearedPathRaw`. */
  clearedPath: ClearedPath;
  /** Verbatim Phase 0 cleared-path string for retrospective traceability. */
  clearedPathRaw: string;
  /** Locked engine family identifier — matches Line.cadenceAdapter.engine enum.
   *  Normalized from Phase 0's human-readable Engine field. */
  engine: EngineFamily;
  /** Verbatim Phase 0 engine string for retrospective traceability. */
  engineRaw: string;
  /** Per-engine model ID pin (e.g., 'eleven_v3', 'gpt-4o-mini-tts-2025-03-20').
   *  Read from Section 1's "Engine model version pin" field (P2.20). */
  modelId: string;
  /** Per-voice voice IDs. `dash` from Section 1 Voice ID; cold-open speaker
   *  from Section 2 Speaker voice ID (P2.34). Other cells null unless cast. */
  voiceIds: Readonly<Record<'dash' | 'sable' | 'janet' | 'vera', string | null>>;
  /** Path to the per-engine cadence-spec adapter file (per Phase 0 Step 1.5). */
  cadenceAdapterPath: string;
  /** R5 scream outcome from Unit 0.6. Normalized from Phase 0's
   *  `kept-A (TTS)` / `kept-B (hybrid)` / `cut`. */
  r5Outcome: 'kept-via-A' | 'kept-via-B' | 'cut';
  /** R14 cold-open speaker name (locked from Unit 0.3 outcome). */
  coldOpenSpeaker: 'sable' | 'janet' | 'vera';
  /** R14 cold-open line text (verbatim from Unit 0.3 lock). */
  coldOpenLine: string;
  /** Path B Voice Changer source recording (only set if r5Outcome === 'kept-via-B'). */
  voiceChangerSource: string | null;
}

export function parsePhase0Exit(path = 'videos/trailer/PHASE-0-EXIT.md'): Phase0ExitConfig {
  const md = readFileSync(path, 'utf-8');

  /** Find a `## Section N — <name> Disposition (Unit 0.X)` block by its name
   *  substring (e.g., 'Voice Cast', 'R14 Cold-Open Line', 'R5 Scream'). */
  const findSection = (nameSubstring: string): string => {
    const sectionPattern = new RegExp(
      `^## Section \\d+ — [^\\n]*${escapeRe(nameSubstring)}[^\\n]*\\n([\\s\\S]*?)(?=^## |\\Z)`,
      'm',
    );
    const found = md.match(sectionPattern);
    if (!found) {
      throw new Error(
        `PHASE-0-EXIT.md missing section matching "Section N — ...${nameSubstring}... Disposition".\n` +
        `Verify PHASE-0-EXIT.md has been populated per Phase 0's template ` +
        `(phase-0-gate-resolution.md lines 2914-3028).`,
      );
    }
    return found[1];
  };

  /** Read a `- <key>: <value>` field. Handles bolded keys (`- **<key>**:`).
   *  Strips trailing `(parenthetical)` qualifiers so `kept-A (TTS)` → `kept-A`. */
  const findField = (section: string, key: string): string => {
    const fieldPattern = new RegExp(
      `^- (?:\\*\\*)?${escapeRe(key)}(?:\\*\\*)?(?:\\s*\\([^)]*\\))?:\\s*(.+)$`,
      'm',
    );
    const found = section.match(fieldPattern);
    if (!found) {
      throw new Error(
        `PHASE-0-EXIT.md section missing field "${key}".\n` +
        `Section preview:\n${section.slice(0, 200)}...`,
      );
    }
    return found[1].replace(/\s*\([^)]*\)\s*$/, '').trim();
  };

  const tryFindField = (section: string, key: string): string | null => {
    const fieldPattern = new RegExp(
      `^- (?:\\*\\*)?${escapeRe(key)}(?:\\*\\*)?(?:\\s*\\([^)]*\\))?:\\s*(.+)$`,
      'm',
    );
    const found = section.match(fieldPattern);
    const value = found?.[1].replace(/\s*\([^)]*\)\s*$/, '').trim() ?? null;
    // Skip un-filled template placeholders like '[string]' or 'N/A'
    return value && value !== 'N/A' && !value.startsWith('[') ? value : null;
  };

  const voiceCast = findSection('Voice Cast');
  const r14 = findSection('R14 Cold-Open Line');
  const scream = findSection('R5 Scream');

  // Normalize engine: Phase 0 emits human-readable; Phase 2 needs short enum.
  const engineRaw = findField(voiceCast, 'Engine');
  const engine: EngineFamily =
    /^ElevenLabs/i.test(engineRaw) ? 'elevenlabs-v3' :
    /^Gemini/i.test(engineRaw) ? 'gemini-tts' :
    /^OpenAI/i.test(engineRaw) ? 'openai-tts' :
    /voice-actor/i.test(engineRaw) ? 'voice-actor' :
    (() => { throw new Error(`Unrecognized engine in PHASE-0-EXIT.md Section 1: "${engineRaw}"`); })();

  // Normalize clearedPath: collapse Phase 0's granular variants to Phase 2's enum.
  const clearedPathRaw = findField(voiceCast, 'Cleared path');
  const clearedPath: ClearedPath =
    /^A\b/.test(clearedPathRaw) ? 'A' :
    /^B\b/.test(clearedPathRaw) ? 'B' :
    /^C[-\s]/.test(clearedPathRaw) ? 'C' :        // C-Gemini, C-OpenAI
    /Sub-phase 0a|Path D/i.test(clearedPathRaw) ? 'D' :
    /Brainstorm-Restructure/i.test(clearedPathRaw) ? 'Brainstorm-Restructure' :
    (() => { throw new Error(`Unrecognized cleared path: "${clearedPathRaw}"`); })();

  // Normalize R5 outcome: Phase 0 `kept-A`/`kept-B` → Phase 2 `kept-via-A`/`kept-via-B`.
  const r5Raw = findField(scream, 'Disposition');
  const r5Outcome: Phase0ExitConfig['r5Outcome'] =
    /^kept-A\b/i.test(r5Raw) ? 'kept-via-A' :
    /^kept-B\b/i.test(r5Raw) ? 'kept-via-B' :
    /^cut\b/i.test(r5Raw) ? 'cut' :
    (() => { throw new Error(`Unrecognized R5 outcome: "${r5Raw}"`); })();

  const coldOpenSpeakerRaw = findField(r14, 'Speaker character');
  const coldOpenSpeaker = coldOpenSpeakerRaw.toLowerCase() as Phase0ExitConfig['coldOpenSpeaker'];
  if (!['sable', 'janet', 'vera'].includes(coldOpenSpeaker)) {
    throw new Error(`Unrecognized cold-open speaker: "${coldOpenSpeakerRaw}"`);
  }

  return {
    clearedPath,
    clearedPathRaw,
    engine,
    engineRaw,
    modelId: findField(voiceCast, 'Engine model version pin'),
    voiceIds: {
      dash:  tryFindField(voiceCast, 'Voice ID / actor identifier'),
      sable: coldOpenSpeaker === 'sable' ? tryFindField(r14, 'Speaker voice ID') : null,
      janet: coldOpenSpeaker === 'janet' ? tryFindField(r14, 'Speaker voice ID') : null,
      vera:  coldOpenSpeaker === 'vera'  ? tryFindField(r14, 'Speaker voice ID') : null,
    },
    cadenceAdapterPath: findField(voiceCast, 'Engine-adapter file path'),
    r5Outcome,
    coldOpenSpeaker,
    coldOpenLine: findField(r14, 'Line (verbatim)'),
    voiceChangerSource: r5Outcome === 'kept-via-B'
      ? tryFindField(scream, 'Voice Changer source recording path')
      : null,
  };
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
```

**Cross-phase Phase 0 amendment triggered (one field added — additive
only, allowed by Phase 0's "add-only" template policy):** Section 2
of PHASE-0-EXIT.md now carries a `Speaker voice ID` field so the
cold-open speaker's engine-specific voice ID lives in PHASE-0-EXIT.md
alongside Section 1's primary briefer voice ID. Amendment recorded in
Phase 0's amendments log (entry 2026-05-17 P2.34). No other Phase 0
changes required — Phase 2's parser absorbs Phase 0's existing
verbose-shape emissions via normalization at parse time.

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

**Step 8 — Sentinel sanity for downstream gate units (DOC-REVIEW: now
includes `verifyEngineAvailability` for engine paths).**

`preflight()` is non-destructive — only checks. Each downstream Phase
2 script invokes:

```ts
// generate-dash-tts.ts, audit-durations.ts, post-process-tts.ts, etc.
import { ffmpegPreflight } from './lib/ffmpeg';
import { parsePhase0Exit } from './lib/phase-0-exit';
import { assertEngineEnv, verifyEngineAvailability } from './lib/env';

async function main() {
  ffmpegPreflight();
  const cfg = parsePhase0Exit();
  assertEngineEnv(cfg.engine);
  await verifyEngineAvailability(cfg);  // DOC-REVIEW: free /v1/models check
  // ... unit-specific logic ...
}
```

**Step 9 — Preflight log (DOC-REVIEW: voice IDs truncated to 8-char
prefix — account-scoped credentials should not land in tracked
artifacts).**

After each invocation, append to
`sample-eval/voice-pipeline/preflight-log.md`. Voice IDs are
TRUNCATED to first 8 chars + `...` (same shape as a commit SHA);
the full ID is only ever held in memory + `.env`.

```ts
// preflight.ts (continued — log emission)
function truncateVoiceId(id: string | null): string {
  if (!id) return '(none)';
  return id.length <= 8 ? id : `${id.slice(0, 8)}...`;
}

const logLine = [
  `## Preflight ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`,
  `- ffmpeg: ${ffmpegVersion} ✓`,
  `- ffprobe: ${ffprobeVersion} ✓`,
  `- PHASE-0-EXIT.md parsed: engine=${cfg.engine}, dash voice=${truncateVoiceId(cfg.voiceIds.dash)}, model=${cfg.modelId}`,
  `- R5 outcome: ${cfg.r5Outcome}`,
  `- Cold-open speaker: ${cfg.coldOpenSpeaker} (voice=${truncateVoiceId(cfg.voiceIds[cfg.coldOpenSpeaker])})`,
  `- Cadence adapter: ${cfg.cadenceAdapterPath} ✓`,
  `- .env keys verified for engine ${cfg.engine} ✓`,
  '',
].join('\n');
appendFileSync(join(TRAILER_ROOT, 'sample-eval/voice-pipeline/preflight-log.md'), logLine);
```

Example output:

```md
## Preflight 2026-MM-DD HH:MM
- ffmpeg: 6.1.1 ✓
- ffprobe: 6.1.1 ✓
- PHASE-0-EXIT.md parsed: engine=elevenlabs-v3, dash voice=21m00Tcm4..., model=eleven_v3
- R5 outcome: kept-via-A
- Cold-open speaker: sable (voice=4XR9hHk2...)
- Cadence adapter: sample-eval/r4-dash/cadence-spec-elevenlabs.json ✓
- .env keys verified for engine elevenlabs-v3 ✓
```

The same `truncateVoiceId` helper is used in the JSONL generation log
(Unit 2.2 Step 9) — `voiceId` field is the truncated prefix, not the
full identifier.

**Step 10 — Live engine API verification (DOC-REVIEW NEW STEP — catches
ElevenLabs v3 alpha access gap + OpenAI snapshot drift BEFORE any paid
TTS call).**

Engine model snapshots can be sunset / alpha-locked / mis-typed in
PHASE-0-EXIT.md. The first paid TTS call would return a 404 with a
generic "model not found" message — wasting budget + producing a
confusing error. Preflight checks engine availability via a free
metadata endpoint before any TTS API call:

```ts
// preflight.ts (continued — live engine verification)
export async function verifyEngineAvailability(cfg: Phase0ExitConfig): Promise<void> {
  if (cfg.engine === 'voice-actor') return;  // no API to check

  if (cfg.engine === 'elevenlabs-v3') {
    const apiKey = assertEnv('ELEVENLABS_API_KEY');
    const res = await fetch('https://api.elevenlabs.io/v1/models', {
      headers: { 'xi-api-key': apiKey },
    });
    if (!res.ok) {
      throw new Error(
        `Preflight: ElevenLabs /v1/models returned ${res.status}.\n` +
        `Check ELEVENLABS_API_KEY validity. If 401/403, key is invalid.`
      );
    }
    const models = (await res.json()) as ReadonlyArray<{ model_id: string }>;
    const locked = models.find((m) => m.model_id === cfg.modelId);
    if (!locked) {
      const available = models.map((m) => m.model_id).join(', ');
      throw new Error(
        `Preflight: ElevenLabs model "${cfg.modelId}" not in account's available models.\n` +
        `Available: ${available}\n` +
        `If targeting "eleven_v3" (alpha): apply for alpha access at ` +
        `https://elevenlabs.io/blog/eleven-v3, OR Phase 0 re-spec to a GA model.`
      );
    }
  } else if (cfg.engine === 'openai-tts') {
    const apiKey = assertEnv('OPENAI_API_KEY');
    const res = await fetch('https://api.openai.com/v1/models', {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });
    if (!res.ok) throw new Error(`Preflight: OpenAI /v1/models returned ${res.status}`);
    const data = (await res.json()) as { data: ReadonlyArray<{ id: string }> };
    const locked = data.data.find((m) => m.id === cfg.modelId);
    if (!locked) {
      throw new Error(
        `Preflight: OpenAI model snapshot "${cfg.modelId}" not in account's available models.\n` +
        `Phase 0 PHASE-0-EXIT.md "Engine model version pin" may reference a sunset snapshot.\n` +
        `Fall back to unversioned alias "gpt-4o-mini-tts" or Phase 0 re-spec.`
      );
    }
  } else if (cfg.engine === 'gemini-tts') {
    // Gemini's /v1beta/models endpoint is also free. Same shape, different path.
    const apiKey = assertEnv('GEMINI_API_KEY');
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Preflight: Gemini /v1beta/models returned ${res.status}`);
    const data = (await res.json()) as { models?: ReadonlyArray<{ name: string }> };
    const locked = data.models?.find((m) => m.name.endsWith(cfg.modelId));
    if (!locked) {
      throw new Error(
        `Preflight: Gemini model "${cfg.modelId}" not in available models.\n` +
        `Preview models can lapse with limited notice. Phase 0 re-spec required.`
      );
    }
  }
  console.log(`OK engine API verified: ${cfg.engine} / ${cfg.modelId}`);
}
```

Called from `main()` ONCE per script run, AFTER `parsePhase0Exit()` +
`assertEngineEnv()`, BEFORE the cue loop. One free metadata call;
catches the "alpha access missing" / "snapshot sunset" failure modes
before any paid TTS call.

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
- `scripts/lib/phase-0-exit.ts` typechecks; `parsePhase0Exit()`
  consumes Phase 0's actual `Section N — <Name> Disposition` shape
  + normalizes engine + clearedPath + R5 outcome to short enums.
- `scripts/lib/ffmpeg.ts` `ffmpegPreflight()` succeeds.
- `scripts/lib/env.ts` `assertEnv()` + `assertEngineEnv()` +
  `verifyEngineAvailability()` typecheck.
- `videos/trailer/.gitignore` present + contains required patterns
  (WAVs, raw dir, biometric scream source, actor PII manifest,
  spend log).
- `process.versions.node >= 20.0.0` asserted at preflight.
- `verifyEngineAvailability()` confirms locked modelId is callable
  for the locked engine BEFORE any paid TTS call.
- `preflight-log.md` populated after invocation with TRUNCATED
  voice IDs (8-char prefix + `...`), not full identifiers.
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
- Create: `videos/trailer/sample-eval/voice-pipeline/context-priming-overrides.json`
  — Phase 2-owned cueId → `{ previous?, next? }` map for engines
  that support adjacent-cue priming. Cold-open priming is the
  load-bearing entry; other cues default to no priming
  (same-scene adjacency flows from script.ts ordering). See Step 4
  below for the file shape.
- Read-only consumption: `videos/trailer/src/lib/script.ts` — Phase 1's
  `Line` type already ships `cueType`, `expectedFrames`, `leadFramesHint`,
  `driftToleranceOverride`, `fadeInMs`, `fadeOutMs`, `skipSilenceremove`,
  `cadenceAdapter` per Phase 1 Unit 1.2 lock (verified by Phase 2
  doc-review). NO Phase 1 edits required.

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

**Step 4 — Cross-phase status with Phase 1 (DOC-REVIEW REWRITE — most
"follow-up amendments" are already shipped by Phase 1).**

The pre-doc-review Phase 2 deepening framed seven `Line` type
extensions as "Phase 1 follow-up amendments surfaced (FLAG ONLY, NOT
TRIGGER)." Doc-review verification against Phase 1's locked plan
(`phase-1-beat-sheet-lock.md` Unit 1.2 lines 853-893) found that
Phase 1 **already ships eight of the proposed fields**:

| Field | Phase 1 status | Optionality |
|-------|----------------|-------------|
| `cueType` | ✅ shipped (line 862) | required |
| `expectedFrames` | ✅ shipped (line 866) | required |
| `leadFramesHint` | ✅ shipped (line 872) | required |
| `driftToleranceOverride` | ✅ shipped (line 876) | optional |
| `fadeInMs` | ✅ shipped (line 881) | optional |
| `fadeOutMs` | ✅ shipped (line 882) | optional |
| `skipSilenceremove` | ✅ shipped (line 886) | optional |
| `cadenceAdapter` | ✅ shipped (line 888) | optional |
| `contextPrimingPrevious` | ❌ NOT shipped | (Phase 2 owns) |
| `contextPrimingNext` | ❌ NOT shipped | (Phase 2 owns) |

**The only genuine Phase 1 gap is the context-priming pair.** Phase 2
owns these via a Phase-2-local config file rather than triggering a
Phase 1 reopen — context-priming is execution-time content (depends
on Phase 0's cadence-spec output), not Phase 1 beat-sheet content,
and Phase 1's `Line` type stays focused on beat-sheet concerns.

**Phase-2-owned context-priming overrides:**

```ts
// videos/trailer/sample-eval/voice-pipeline/context-priming-overrides.json
//
// Maps cueId → { previous?: string, next?: string } for engines that
// support adjacent-cue context priming. ElevenLabs path uses these as
// previous_text/next_text body fields. Gemini path injects them inside
// the Director's Chair ### TRANSCRIPT section (above the cue text;
// trimmed via FFmpeg -ss post-gen). OpenAI path embeds them as examples
// in the `instructions` parameter (~150 added words within the ~500-word
// adapter cap).
//
// MOST cues need NO priming entry — same-scene adjacent cues already
// flow from script.ts ordering. The cold-open cue (S01-coldopen) is the
// load-bearing case: it has no in-trailer previous_text, so priming
// pulls from Phase 0's cadence-spec sample paragraphs.
{
  "S01-coldopen": {
    "previous": "2-3 sentences pulled from Phase 0's sample-eval/r4-dash/cadence-spec.md §Sample paragraph 1 (Phase 0 Unit 0.2 picked this paragraph as the Sterling-CODED register reference; using its last 2-3 sentences as priming reproduces that register at the cold-open cue's API call)."
  }
}
```

**Per-cue field values Phase 2 reads from Phase 1's already-shipped
`Line` type** (this is a READ-ONLY survey of what Phase 1 ships —
Phase 2 does NOT define these values, Phase 1 does):

| Cue id | Field | Value Phase 1 ships | Why |
|--------|-------|--------------------|-----|
| S01-coldopen | cueType | `'sustained'` | Cold-open speaker single line |
| S02-greeting | cueType | `'sustained'` | Briefing-room formality |
| S03-roster | cueType | `'list'` | List of operatives |
| S03-mission | cueType | `'list'` | Deck-of-120 list |
| S04-htp-1 / S04-htp-2 | cueType | `'sustained'` | Cascade scroll lines (now the canary cues per Phase 2 doc-review R1 — cadence-validation needs sustained delivery, not 4-word payoff) |
| S04-stat-1..4 | cueType | `'list'` | Stat captions |
| S04-payoff-a | cueType, fadeInMs, leadFramesHint | `'payoff'`, `5`, `2` | R3 stacked-payoff first half; hard land + 2-frame lead |
| S04-payoff-b | cueType | `'payoff'` | R3 stacked-payoff second half |
| S05-pleasure | cueType | `'sustained'` | Sparse-over-gameplay |
| S05-scream | cueType, fadeInMs, skipSilenceremove, leadFramesHint | `'scream'`, `0`, `true`, `1` | Volume-discontinuous; preserve attack envelope |
| S06-close | cueType | `'sustained'` | Deliberate close |
| S06-phrasing | cueType, expectedFrames, fadeOutMs, driftToleranceOverride | `'payoff'`, `27`, `50`, `0.20` | Sterling-CODED deliberate 0.9s 1-word delivery; override needed because the wps band model assumes multi-word delivery — single-word expressive cues are out-of-distribution |

If any of these values are MISSING in Phase 1's actually-shipped
`BURNED_TRAILER_LINES`, the Phase 1 reopen procedure (Unit 2.7 Step
2a) is the canonical mechanism to fix them. Phase 2 does NOT
monkey-patch Line objects at runtime.

**Frame numbering canonicalization** (cross-phase verification):
Phase 1's deepening committed scene-relative-to-absolute resolution
in `timing.ts` + locked absolute frames in `BURNED_TRAILER_LINES`.
Phase 2 expects absolute frames everywhere. If Phase 1's deepened
`script.ts` still ships any scene-relative notation, Unit 2.1 Step 1
shape-verification catches it as a runtime error (`line.frame` reads
as relative when treated as absolute → cue placement nonsense at
Phase 4). Fix via Phase 1 reopen.

| Cue | Absolute frame Phase 2 expects |
|-----|-------------------------------|
| S05-pleasure | **2280** |
| S05-scream | **2400** |
| S06-close | **2610** |
| S06-phrasing | **2790** |

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
- `context-priming-overrides.json` exists with the S01-coldopen entry
  populated (or explicitly empty if Phase 0 cadence-spec lacks a
  reference paragraph).
- Phase 1's `Line` type already ships the 8 Phase-2-relevant fields
  (verified by reading `phase-1-beat-sheet-lock.md` Unit 1.2 lines
  853-893); if any are missing in the actually-shipped `script.ts`,
  Unit 2.7 Step 2a's Phase 1 reopen procedure is the fix mechanism —
  Phase 2 does NOT monkey-patch.

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
- Create: `videos/trailer/scripts/tts-clients/<locked-engine>.ts` —
  DOC-REVIEW R4 (single-engine commitment): build ONLY the engine
  PHASE-0-EXIT.md locks. ElevenLabs → `elevenlabs.ts` (v3 model,
  [shouts] tag, voice_settings from per-engine adapter JSON,
  previous_text/next_text context-priming). Gemini → `gemini.ts`
  (gemini-2.5-flash-preview-tts, pcmToWav wrap, Director's Chair
  structured prompt). OpenAI → `openai.ts` (gpt-4o-mini-tts-2025-03-20
  snapshot pin, instructions param). Other-engine clients re-implement
  on-demand if PHASE-0-EXIT.md re-locks (Phase 0 reopen anyway picks
  the new engine — client rebuild is the cheapest part).
- Create: `videos/trailer/scripts/tts-clients/wav-utils.ts` — port
  `pcmToWav` + `isValidWav` verbatim from UMB
  `generate-narrator.ts:127-162`.
- Create: `videos/trailer/scripts/tts-clients/index.ts` — engine
  dispatch on PHASE-0-EXIT.md locked engine (DOC-REVIEW R4: switch
  contains ONE case + a `'never'`-default that throws; the other-engine
  cases would only return if their client file existed).
- Create: `videos/trailer/scripts/lib/cost-tracker.ts` — cumulative
  TTS spend tracker with hard abort at $50 (DOC-REVIEW R3: lifted
  from $30). Includes per-second-billing path for Voice Changer.
- Create: `videos/trailer/.gitignore` (DOC-REVIEW: must exist BEFORE
  any generation — see Unit 2.0 Step 1 sanity check).
- Create: `videos/trailer/sample-eval/voice-pipeline/generation-log.md` —
  human-readable per-run summary.
- Create: `videos/trailer/sample-eval/voice-pipeline/generation-log.jsonl` —
  machine-readable per-cue per-run log. DOC-REVIEW: `voiceId` is
  the 8-char prefix, not the full account-scoped identifier.

**Approach:**

**Step 1 — Generator skeleton (DOC-REVIEW REWRITE — fixes nine
sub-defects identified by Phase 2 doc-review pass).**

The pre-doc-review draft had nine sub-defects that would have crashed
the generator at first execution:

1. `generateForCue` call site at line ~1629 missing the `engine` arg
   the dispatch declaration requires → crash on first cue with
   `Unknown engine: undefined`.
2. `await assertWithinBudget()` ran ONCE at startup, not per-cue —
   lifetime spend at startup $49 + this run $3 = $52, no abort fires.
   Ceiling decorative.
3. `hashCueInputs` omitted cadence-spec adapter content — adapter
   edits did not invalidate WAVs. Silent staleness.
4. `--engine` override was warn-but-proceed without `--only` scoping
   — broke the SSoT-from-PHASE-0-EXIT.md claim.
5. Context-priming read from `cue.contextPrimingPrevious` which is
   NOT shipped by Phase 1 — TypeScript would fail. Phase 2 owns
   priming via `context-priming-overrides.json` (Unit 2.1 Step 4).
6. Voice ID resolution didn't differentiate Dash from cold-open
   speaker — Section 1 Voice ID is Dash's only, cold-open uses
   Section 2 Speaker voice ID (the P2.34 amendment).
7. Filter `cue.frame === 2400` is ambiguous if Phase 1 ever adds
   another frame-2400 cue; correct gate is `cue.id === 'S05-scream'`.
8. Scene filter regex `cue.scene.endsWith(args.scene.replace(/^S0?/, ''))`
   doesn't work for `S04` vs `S4` cleanly — rewritten.
9. JSONL log voiceId not truncated — full account-scoped credential
   in committed artifact.

```ts
// videos/trailer/scripts/generate-dash-tts.ts
import 'dotenv/config';  // auto-load .env per Briggsy autonomy rule
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { parseArgs } from 'node:util';
import { join } from 'node:path';
import { BURNED_TRAILER_LINES, type Line } from '../src/lib/script.js';
import { cueFilename } from './lib/cue-filename.js';
import { ffmpegPreflight } from './lib/ffmpeg.js';
import { parsePhase0Exit, type Phase0ExitConfig } from './lib/phase-0-exit.js';
import { assertEngineEnv, verifyEngineAvailability } from './lib/env.js';
import { atomicWriteSync } from './lib/atomic-write.js';
import { trackSpend, assertWithinBudget } from './lib/cost-tracker.js';
import { generateForCue } from './tts-clients/index.js';
import { isValidWav } from './tts-clients/wav-utils.js';

const TRAILER_ROOT = 'videos/trailer';
const OUT_DIR = join(TRAILER_ROOT, 'public/audio/lines');
const META_DIR = join(OUT_DIR, '.meta');
const PRIMING_OVERRIDES = join(
  TRAILER_ROOT,
  'sample-eval/voice-pipeline/context-priming-overrides.json',
);

type ContextPrimingMap = Readonly<Record<string, { previous?: string; next?: string }>>;

function parseCli() {
  const { values } = parseArgs({
    args: process.argv.slice(2).filter((a) => a !== '--'),
    options: {
      force:     { type: 'boolean', default: false },
      'dry-run': { type: 'boolean', default: false },
      only:      { type: 'string', multiple: true },  // cue ids
      scene:     { type: 'string' },                  // 'S04' or '4'
      engine:    { type: 'string' },                  // CLI override (canary debug only)
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

/** Hash the FULL set of inputs that influence the generated WAV.
 *  DOC-REVIEW: cadence-spec adapter SHA now included so adapter edits
 *  auto-invalidate cached WAVs (was silent staleness before). */
function hashCueInputs(
  cue: Line,
  engine: string,
  voiceId: string,
  cadenceAdapterContent: string,
  priming: { previous?: string; next?: string } | undefined,
): string {
  const tag = cue.cadenceAdapter?.prefixTag ?? '';
  const adapterSha = createHash('sha256').update(cadenceAdapterContent).digest('hex').slice(0, 16);
  const primingKey = priming ? `${priming.previous ?? ''}|${priming.next ?? ''}` : '';
  return createHash('sha256')
    .update(`${cue.text}|${engine}|${voiceId}|${tag}|${adapterSha}|${primingKey}`)
    .digest('hex');
}

function truncateVoiceId(id: string): string {
  return id.length <= 8 ? id : `${id.slice(0, 8)}...`;
}

function resolveVoiceId(cue: Line, cfg: Phase0ExitConfig): string {
  // DOC-REVIEW: differentiate Dash voice (Section 1) from cold-open speaker
  // voice (Section 2 P2.34 amendment). Scream cue is dash-voice per Phase 1.
  const id = cfg.voiceIds[cue.voice];
  if (!id) {
    throw new Error(
      `No voice ID locked for cell '${cue.voice}' in PHASE-0-EXIT.md.\n` +
      `Dash voice ID lives in Section 1 "Voice ID / actor identifier".\n` +
      `Cold-open speaker voice ID lives in Section 2 "Speaker voice ID" ` +
      `(P2.34 amendment).`,
    );
  }
  return id;
}

async function main() {
  // Preflight (Unit 2.0)
  ffmpegPreflight();
  const cfg: Phase0ExitConfig = parsePhase0Exit();
  assertEngineEnv(cfg.engine);
  await verifyEngineAvailability(cfg);  // DOC-REVIEW: live API check

  const args = parseCli();

  // DOC-REVIEW: --engine override MUST be paired with --only <cueId> to
  // bound scope to canary-debug. Without --only, the SSoT-from-PHASE-0-EXIT.md
  // invariant breaks silently.
  if (args.engineOverride && args.engineOverride !== cfg.engine) {
    if (args.onlyIds.length === 0) {
      console.error(
        `FATAL: --engine ${args.engineOverride} disagrees with PHASE-0-EXIT.md ` +
        `locked ${cfg.engine}.\n` +
        `--engine override requires --only <cueId> to bound scope to canary-debug.\n` +
        `Re-run with: pnpm tts -- --engine ${args.engineOverride} --only <cueId>`,
      );
      process.exit(2);
    }
    console.warn(
      `WARN: --engine ${args.engineOverride} disagrees with PHASE-0-EXIT.md ` +
      `${cfg.engine} (canary debug mode, scope=${args.onlyIds.join(',')}).`,
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

  // Read per-engine cadence-spec adapter
  const cadenceAdapter = readFileSync(cfg.cadenceAdapterPath, 'utf-8');

  // DOC-REVIEW: load Phase 2-owned context-priming overrides
  const primingMap: ContextPrimingMap = existsSync(PRIMING_OVERRIDES)
    ? JSON.parse(readFileSync(PRIMING_OVERRIDES, 'utf-8'))
    : {};

  for (const cue of BURNED_TRAILER_LINES) {
    // Filter: scream cue gating by R5 outcome (DOC-REVIEW: cue.id, not frame)
    if (cue.id === 'S05-scream') {
      if (cfg.r5Outcome === 'cut') {
        console.log(`SKIP ${cueFilename(cue)} (R5 outcome: cut)`);
        continue;
      }
      if (cfg.r5Outcome === 'kept-via-B') {
        console.log(
          `SKIP ${cueFilename(cue)} (R5 outcome: kept-via-B — run Unit 2.Y: pnpm tsx scripts/hybrid-scream.ts)`,
        );
        continue;
      }
    }

    // CLI filters
    if (args.scene) {
      const sceneCode = `S${args.scene.replace(/^S0?/, '').padStart(2, '0')}`;  // 'S04' or '4' → 'S04'
      if (cue.scene !== sceneCode) continue;
    }
    if (args.onlyIds.length && !args.onlyIds.includes(cue.id)) continue;

    const outPath = join(OUT_DIR, cueFilename(cue));
    const metaPath = join(META_DIR, `${cueFilename(cue)}.sha256`);

    const voiceId = resolveVoiceId(cue, cfg);
    const priming = primingMap[cue.id];
    const expectedHash = hashCueInputs(cue, engine, voiceId, cadenceAdapter, priming);

    // Hash-based skip
    if (!args.force && existsSync(outPath) && existsSync(metaPath)) {
      const storedHash = readFileSync(metaPath, 'utf-8').trim();
      if (storedHash === expectedHash) {
        console.log(`SKIP ${cueFilename(cue)} (sha match — no regen)`);
        continue;
      }
      console.log(`STALE ${cueFilename(cue)} (text/engine/voice/adapter/priming changed — regen)`);
    }

    if (args.dryRun) {
      console.log(`DRY-RUN ${cueFilename(cue)}: "${cue.text.slice(0, 60)}..."`);
      continue;
    }

    // DOC-REVIEW: assertWithinBudget INSIDE the loop (per-cue, not startup-once)
    await assertWithinBudget();

    console.log(`GEN  ${cueFilename(cue)}...`);

    // DOC-REVIEW: explicit `engine` arg — fixes call/declaration mismatch
    const wavBuf = await generateForCue({
      engine,
      text: cue.text,
      voice: cue.voice,
      voiceId,
      cadenceAdapter,
      cadencePrefixTag: cue.cadenceAdapter?.prefixTag,
      modelId: cfg.modelId,
      contextPrimingPrevious: priming?.previous,
      contextPrimingNext: priming?.next,
    });

    if (!isValidWav(wavBuf)) {
      throw new Error(
        `Invalid WAV returned for ${cueFilename(cue)} — likely Gemini path missing pcmToWav wrap. ` +
        `Check gemini.ts adapter.`,
      );
    }

    atomicWriteSync(outPath, wavBuf);
    atomicWriteSync(metaPath, expectedHash);

    // Cost tracking + JSONL log (voiceId truncated)
    await trackSpend(cue, engine, wavBuf.byteLength, truncateVoiceId(voiceId));

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

  // Linear backoff per UMB precedent (5s/10s/15s + jitter; total elapsed ≤30s).
  // DOC-REVIEW: clamp per-attempt delay so total + jitter never exceeds the
  // declared 30s cap (previously 30s + 3s jitter overflowed the cap claim).
  const MAX_RETRIES = 3;
  const BASE_DELAY_MS = 5000;
  const TOTAL_BUDGET_MS = 30_000;
  let elapsedMs = 0;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(url, {
      method: 'POST',
      // DOC-REVIEW: Accept: 'audio/wav' header REMOVED — was contradictory with
      // body output_format: 'pcm_48000'. Single source of truth (output_format)
      // drives wrapping. pcmToWav is correct iff output_format starts with 'pcm_'.
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const arrayBuf = await res.arrayBuffer();
      const pcm = Buffer.from(arrayBuf);
      const { pcmToWav } = await import('./wav-utils.js');
      // output_format always starts with 'pcm_' per body; if a future maintainer
      // flips it to 'mp3_...' or 'wav_...', this guard catches the mismatch
      // before pcmToWav double-wraps a WAV-headed response.
      const fmt = (body.output_format as string) ?? '';
      if (!fmt.startsWith('pcm_')) {
        throw new Error(
          `ElevenLabs output_format='${fmt}' but pcmToWav wrap unconditional. ` +
          `Either drop the wrap or restore output_format='pcm_*'.`,
        );
      }
      const sampleRate = parseInt(fmt.replace('pcm_', ''), 10);
      return pcmToWav(pcm, sampleRate);
    }

    if (res.status === 401 || res.status === 403) {
      throw new Error(`ElevenLabs auth failure ${res.status}: ${await res.text()}`);
    }

    if (res.status === 429 || res.status >= 500) {
      const rawDelay = BASE_DELAY_MS * attempt + Math.floor(Math.random() * 1000);
      const clampedDelay = Math.min(rawDelay, TOTAL_BUDGET_MS - elapsedMs);
      if (clampedDelay <= 0) {
        throw new Error(`ElevenLabs ${res.status}, retry budget (${TOTAL_BUDGET_MS}ms) exhausted`);
      }
      console.warn(`ElevenLabs ${res.status}, retry ${attempt}/${MAX_RETRIES} in ${clampedDelay}ms`);
      if (attempt < MAX_RETRIES) await new Promise((r) => setTimeout(r, clampedDelay));
      elapsedMs += clampedDelay;
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

**Step 7 — Cost tracker (DOC-REVIEW REWRITE — $50 ceiling, no override
env var, Voice Changer billing dimension, truncated voiceId log field).**

Three doc-review changes:

1. **Ceiling $30 → $50**. The original $30 ceiling created an autonomy
   paradox: Claude self-setting `TTS_BUDGET_OVERRIDE=1` makes the ceiling
   decorative (violates the quality value); Claude stopping to ask
   Briggsy violates the autonomy rule (`CLAUDE.md`: "Briggsy is ATC.
   Claude is the pilot."). $50 matches the Phase 0 Unit 0.2 envelope,
   sits ~25× over the expected ~$2 nominal run cost, and means "hit
   the ceiling = something is wrong, stopping is correct."
2. **`TTS_BUDGET_OVERRIDE` env var DELETED.** No silent escape hatch.
   If $50 is genuinely insufficient, Briggsy edits `HARD_CEILING_USD`
   in this file (atomic, intentional, traced in git history).
3. **Voice Changer billing dimension added.** ElevenLabs Speech-to-
   Speech (Unit 2.Y / Path B) bills per audio-input second, not per
   char. Previously absent → bypassed the ceiling silently.
4. **`trackSpend` signature accepts truncated voiceId** so the JSONL
   log carries the 8-char prefix (not the full account-scoped ID).

```ts
// videos/trailer/scripts/lib/cost-tracker.ts
import { existsSync, readFileSync, appendFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Line } from '../../src/lib/script.js';

const SPEND_LOG = 'videos/trailer/sample-eval/voice-pipeline/tts-spend.json';

// DOC-REVIEW: ceiling $30 → $50 (matches Phase 0 Unit 0.2 envelope;
// removes the TTS_BUDGET_OVERRIDE autonomy-paradox footgun).
const HARD_CEILING_USD = 50;

type BillingUnit = 'char' | 'input-second';

interface EngineBilling {
  unit: BillingUnit;
  rateUsd: number;
}

interface SpendEntry {
  runId: string;
  ts: string;
  cueId: string;
  engine: string;
  voiceIdPrefix: string;             // DOC-REVIEW: 8-char prefix, not full ID
  unit: BillingUnit;
  unitsBilled: number;
  estimatedCostUsd: number;
}

// DOC-REVIEW: rate table now includes Path B speech-to-speech (per-second
// input billing). ElevenLabs documents Voice Changer as "minutes-based"
// billing; converted to per-second for consistent SpendEntry shape.
const BILLING: Readonly<Record<string, EngineBilling>> = {
  'elevenlabs-v3':           { unit: 'char',         rateUsd: 0.30 / 1000 },         // $0.30 / 1k chars Creator
  'elevenlabs-sts':          { unit: 'input-second', rateUsd: 0.30 / 60 },           // ~$0.30/min observed
  'gemini-tts':              { unit: 'char',         rateUsd: 0.075 / 1_000_000 },   // negligible
  'openai-tts':              { unit: 'char',         rateUsd: 15 / 1_000_000 },      // $15 / 1M chars
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
  if (total > HARD_CEILING_USD) {
    throw new Error(
      `Phase 2 TTS spend cap exceeded: $${total.toFixed(2)} > $${HARD_CEILING_USD} ceiling.\n` +
      `No override env var exists by design.\n` +
      `Options:\n` +
      `  (a) Reduce iteration count via --only / --scene targeting.\n` +
      `  (b) If the ceiling genuinely needs to be lifted (extension warranted),\n` +
      `      edit HARD_CEILING_USD in this file (cost-tracker.ts).\n` +
      `      Single-line atomic intent signal traced in git history.\n` +
      `  (c) Reset spend tracker: rm ${SPEND_LOG}\n` +
      `      (only if starting a fresh budget cycle post-rework).`
    );
  }
}

/** Standard text-billed engines (ElevenLabs TTS, Gemini, OpenAI). */
export async function trackSpend(
  cue: Line,
  engine: string,
  bytesWritten: number,
  voiceIdPrefix: string,
): Promise<void> {
  const billing = BILLING[engine];
  if (!billing) throw new Error(`No billing rate for engine '${engine}'`);
  if (billing.unit !== 'char') {
    throw new Error(
      `Engine '${engine}' uses '${billing.unit}' billing; use trackSpendInputSeconds instead.`,
    );
  }
  const unitsBilled = cue.text.length;
  const entry: SpendEntry = {
    runId: process.env.RUN_ID ?? new Date().toISOString().replace(/[:.]/g, ''),
    ts: new Date().toISOString(),
    cueId: cue.id,
    engine,
    voiceIdPrefix,
    unit: 'char',
    unitsBilled,
    estimatedCostUsd: unitsBilled * billing.rateUsd,
  };
  if (!existsSync(dirname(SPEND_LOG))) mkdirSync(dirname(SPEND_LOG), { recursive: true });
  appendFileSync(SPEND_LOG, JSON.stringify(entry) + '\n');
}

/** Per-second-billed engines (ElevenLabs Voice Changer / Speech-to-Speech).
 *  Called from Unit 2.Y `hybrid-scream.ts`. */
export async function trackSpendInputSeconds(
  cue: Line,
  engine: string,
  inputSeconds: number,
  voiceIdPrefix: string,
): Promise<void> {
  const billing = BILLING[engine];
  if (!billing) throw new Error(`No billing rate for engine '${engine}'`);
  if (billing.unit !== 'input-second') {
    throw new Error(
      `Engine '${engine}' uses '${billing.unit}' billing; use trackSpend instead.`,
    );
  }
  const entry: SpendEntry = {
    runId: process.env.RUN_ID ?? new Date().toISOString().replace(/[:.]/g, ''),
    ts: new Date().toISOString(),
    cueId: cue.id,
    engine,
    voiceIdPrefix,
    unit: 'input-second',
    unitsBilled: inputSeconds,
    estimatedCostUsd: inputSeconds * billing.rateUsd,
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
Cumulative Phase 2 spend: $2.17 / $50 ceiling.
```

```jsonl
// sample-eval/voice-pipeline/generation-log.jsonl
// DOC-REVIEW: voiceId is truncated to 8-char prefix; full ID stays in .env only.
{"runId":"...","ts":"...","cueId":"S01-coldopen","engine":"elevenlabs-v3","modelId":"eleven_v3","voiceIdPrefix":"4XR9hHk2...","durationFrames":132,"expectedFrames":132,"driftPct":0.0,"bytesWritten":48044,"estimatedCostUsd":0.013,"retries":0,"status":"GEN","shaText":"...","adapterSha":"a3f9..."}
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
- **Edge case:** Cumulative spend exceeds $50 → fatal abort (no
  override env var; extension requires editing `HARD_CEILING_USD` in
  cost-tracker.ts).
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

**Step 1 — Generate canaries (DOC-REVIEW R1 + `--only` flag fix).**

```
pnpm tts -- --only S04-htp-1            # Dash: sustained cascade line (canary)
pnpm tts -- --only S01-coldopen         # Cold-open speaker (single-line)
pnpm tts -- --only S05-scream           # Dash scream (if R5 kept-via-A)
```

Produces 1–3 canary WAVs depending on R5 outcome.

**Canary swap rationale (DOC-REVIEW R1 product re-open).** The
pre-doc-review draft canaried cue 1950 ("They WERE the operation.")
as "the trailer's load-bearing emotional beat." Phase 1's deepening
collapsed that cue to a 4-word truth-collision payoff at 1.6-1.8 wps
band — but a 4-word delivery (~0.6 seconds of audio) cannot validate
the Sterling-CODED register cluster (deadpan / mid-Atlantic /
sardonic-lift / deliberate pace). Those dimensions need **≥8-10s of
sustained speech** to manifest — a sustained cue exercises the
cadence-spec steering surface that a payoff cue can't.

The canary's job is **register recognition**, not "load-bearing for
trailer emotional impact." S04-htp-1 (cascade scroll sustained line)
is the right canary for register validation. Cue 1950 still gets
audited — post-batch (see Unit 2.4 Step 4.5 re-canary), not as the
register-cert gate. (Decision-Lens product agent's framing accepted.)

CLI flag fix: pre-doc-review used `--cueFrame 1950` etc. but
`parseCli()` in Unit 2.2 declares strict-mode options for
`--force`/`--dry-run`/`--only`/`--scene`/`--engine` only — `--cueFrame`
is not an option and strict mode rejects it. Canary commands rewritten
to use the existing `--only <cueId>` flag.

**Step 2 — A/B compare against Phase 0 eval references (DOC-REVIEW:
5-point Likert rubric replaces prose criteria).**

The pre-doc-review draft had four prose listening criteria with no
numeric scale, no pass/fail threshold, and no per-dimension scoring.
Sterling-CODED is the most subjective quality gate in the entire
pipeline; prose criteria invite drift being silently accepted.
Deepening notes locked a Likert rubric but the body never used it.

For each canary, listen against the Phase 0 Unit 0.2 reference WAV
for the same voice cell:

| Cell | Canary cue | Phase 0 reference |
|------|------------|-------------------|
| Dash | S04-htp-1 (cascade) | `sample-eval/r4-dash/{winning-engine}/sample-2-monologue.wav` |
| Cold-open | S01-coldopen | `sample-eval/r14-cold-open/clips/candidate-{N}.wav` (whichever cleared) |
| Scream (kept-via-A) | S05-scream | `sample-eval/r5-scream/path-a.wav` |

**Likert rubric** — score each dimension 0-5 vs the Phase 0 reference:

| Dimension | 0 | 3 | 5 |
|-----------|---|---|---|
| **Register cluster** (deadpan / mid-Atlantic / sardonic-lift) | drifted to neutral or generic narrator | recognizable but softened | indistinguishable from Phase 0 reference |
| **Pace match** vs Phase 0 reference wps | ±25% drift | ±15% drift | ±5% drift |
| **Volume dynamics** (no compression/expansion artifacts) | audibly squashed or clipped | minor pumping | clean dynamic range |
| **Articulation** (no engine-default neutral pace creeping in) | engine-default voice underneath | partial steering effect | full Sterling-CODED articulation |

**Threshold**: any dimension scoring **<4** routes to Step 3
fail-action. **Joint pass** requires all 4 dimensions ≥4 on the
SAME canary cue (not averaged across canaries).

Listener: Briggsy (N=1 — production standard for all panels per
Unit 2.7 doc-review R2 correction 2026-05-22).

**Step 3 — Fail-action ladder.**

Triggered when any Likert dimension scores <4 on any canary.

- **Steering payload not applied (most likely cause for fresh
  Phase 2 build):** check whether `voice_settings` /
  `instructions` / Director's Chair section markers wire correctly
  in the per-engine client. Debug in Unit 2.2.
- **Engine model version drift since Phase 0 Unit 0.2:** the model
  pin in PHASE-0-EXIT.md should have prevented this, but if the
  provider sunsetted the snapshot mid-execution, Unit 2.0's
  `verifyEngineAvailability()` would have already caught it. If
  somehow drift appeared post-availability-check, Phase 0 re-spec.
- **Engine character drift (engine silently shifted voice cadence):**
  Phase 0 Unit 0.2 cadence-spec.md re-spec required. May trigger
  Phase 0 re-run for the canary line if drift is large.
- **All paths drift:** Path D (voice actor) fallback. Phase 0
  fail-action ladder Step 5 re-engages.

**Step 4 — Sign-off + sentinel + proceed to full generation (DOC-REVIEW:
filename fixes + sentinel file write).**

When all canaries clear (joint pass — all 4 Likert dimensions ≥4 on
every canary), `cadence-consistency.md` records sign-off AND a sentinel
file is written that Unit 2.4 asserts before full-batch generation.

```md
## Cadence Consistency Sign-Off — YYYY-MM-DD

| Canary | Register | Pace | Volume | Articulation | Joint pass? |
|--------|----------|------|--------|--------------|-------------|
| s04-cue-{S04-htp-1 frame}-dash.wav | 5 | 4 | 5 | 4 | ✓ |
| s01-cue-60-{coldOpenSpeaker}.wav   | 5 | 5 | 5 | 5 | ✓ |
| s05-cue-2400-dash.wav (if R5 kept-via-A) | 4 | 4 | 4 | 4 | ✓ |

- Engine + model pin: <engine> / <modelId>
- Cadence adapter SHA: <16-char prefix>
- Listener: Briggsy
- Proceed to full generation: YES / NO
```

Filename fixes (DOC-REVIEW):
- `s05-cue-2400-dash-scream.wav` → `s05-cue-2400-dash.wav` (matches
  the `cueFilename()` output — voice cell is `dash` per Phase 1,
  not `dash-scream`).
- `s01-cue-60-coldopen.wav` → `s01-cue-60-{coldOpenSpeaker}.wav`
  where `{coldOpenSpeaker}` resolves from PHASE-0-EXIT.md
  (sable/janet/vera).
- Dash canary filename uses S04-htp-1's actual frame from
  `BURNED_TRAILER_LINES`, not the cue 1950 path.

```ts
// scripts/canary-signoff.ts (NEW — invoked after Step 4 review)
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const SIGNOFF_PATH = 'videos/trailer/sample-eval/voice-pipeline/cadence-consistency-signoff.txt';

// Written ONLY when joint pass is YES.
writeFileSync(
  join(SIGNOFF_PATH),
  `Cadence consistency sign-off: ${new Date().toISOString()}\n` +
  `Engine: ${cfg.engine} / ${cfg.modelId}\n` +
  `Adapter SHA: ${adapterSha.slice(0, 16)}\n` +
  `Joint pass: YES\n`,
);
```

**Patterns to follow:**

- Phase 0 Unit 0.2 register-recognition cluster (deadpan / dry /
  mid-Atlantic / sardonic).
- A/B-compare protocol from `feedback-eye-in-loop-beats-calibration-for-motion.md`
  (eye-in-loop applies to ear-in-loop here too).
- MUSHRA-shaped Likert rubric (industry citation only; the multi-
  listener panel form was never structurally available — see R2
  amendment 2026-05-22. N=1 Briggsy applies the rubric directly.)

**Test scenarios:**

- **Happy path:** Sustained Dash canary (S04-htp-1) lands in the
  Phase 0 reference's register cluster on all 4 Likert dimensions
  ≥4. Sign-off written, sentinel file emitted, Unit 2.4 unblocked.
- **Edge case:** Engine model version pin reduces re-run risk after
  platform changes; `verifyEngineAvailability()` catches snapshot
  sunset at preflight before canary even runs.
- **Anti-pattern guard:** Drift not silently accepted — STOP the
  workflow, route to Step 3 fail-action. Sentinel file NOT written
  on fail.

**Verification:**

- `cadence-consistency.md` records per-dimension Likert scores +
  joint-pass verdict per canary.
- All canaries land in `public/audio/lines/`.
- `cadence-consistency-signoff.txt` sentinel written iff joint pass.
- Full generation (Unit 2.4) refuses to start without the sentinel.

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

**Step 0 — Sentinel assertion (DOC-REVIEW: blocks Unit 2.4 if Unit 2.3
canary hasn't cleared).**

```ts
// videos/trailer/scripts/audit-durations.ts (top of main)
import { existsSync } from 'node:fs';

const SIGNOFF_SENTINEL = 'videos/trailer/sample-eval/voice-pipeline/cadence-consistency-signoff.txt';
if (!existsSync(SIGNOFF_SENTINEL)) {
  console.error(
    `FATAL: cadence consistency sign-off sentinel missing.\n` +
    `Run Unit 2.3 canary pass first:\n` +
    `  pnpm tts -- --only S04-htp-1\n` +
    `  pnpm tts -- --only S01-coldopen\n` +
    `  pnpm tts -- --only S05-scream  # if R5 kept-via-A\n` +
    `Then complete the Likert listening rubric in cadence-consistency.md ` +
    `and write the sentinel via scripts/canary-signoff.ts.`,
  );
  process.exit(2);
}
```

**Step 1 — Generation.**

```
pnpm tts                           # hash-based skip-or-regen (preferred)
pnpm tts:force                     # full regeneration (use only when resetting)
```

DOC-REVIEW: `pnpm tts` (not `--force`) is the default. Hash-based
invalidation handles cue-text edits + adapter edits + priming-overrides
edits automatically per Unit 2.2 amendment. Use `tts:force` only when
explicitly resetting all WAVs from scratch.

**Step 2 — Duration audit (DOC-REVIEW REWRITE — consumes
BURNED_TRAILER_LINES, uses TOLERANCE_BY_TYPE, removes dead
`dash-scream` check).**

```ts
// videos/trailer/scripts/audit-durations.ts
import { execFileSync } from 'node:child_process';
import { existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
// DOC-REVIEW: imports from script.js (not deleted script-lines.ts);
// uses cueFilename() helper; uses TOLERANCE_BY_TYPE per cueType band.
import { BURNED_TRAILER_LINES, type Line } from '../src/lib/script.js';
import { cueFilename } from './lib/cue-filename.js';
import { parsePhase0Exit } from './lib/phase-0-exit.js';

const FPS = 30;
const TOLERANCE_BY_TYPE: Readonly<Record<NonNullable<Line['cueType']>, number>> = {
  sustained: 0.05,  // ±5% — paced lines
  list:      0.07,  // ±7% — list reads tolerate slight pace variance
  payoff:    0.04,  // ±4% — payoff lines are visual-sync load-bearing
  scream:    0.20,  // ±20% — expressive cue, low-wordcount
};

function probeDuration(wavPath: string): number {
  const out = execFileSync('ffprobe', [
    '-v', 'error',
    '-show_entries', 'format=duration',
    '-of', 'csv=p=0',
    wavPath,
  ], { encoding: 'utf-8' });
  return parseFloat(out.trim());
}

const cfg = parsePhase0Exit();
const linesDir = 'videos/trailer/public/audio/lines';

interface DriftRow {
  filename: string;
  cueId: string;
  cueType: string;
  actual: number;
  expected: number;
  drift: number;
  tolerance: number;
  flag: 'OK' | '!!';
}

const report: DriftRow[] = [];
const missing: string[] = [];

for (const cue of BURNED_TRAILER_LINES) {
  // Filter scream cue per R5 outcome (same gating as Unit 2.2)
  if (cue.id === 'S05-scream' && cfg.r5Outcome === 'cut') continue;

  const filename = cueFilename(cue);
  const wav = join(linesDir, filename);
  if (!existsSync(wav)) {
    missing.push(filename);
    continue;
  }

  const seconds = probeDuration(wav);
  const actualFrames = Math.round(seconds * FPS);
  const expected = cue.expectedFrames;
  const drift = (actualFrames - expected) / expected;

  // DOC-REVIEW: TOLERANCE_BY_TYPE replaces flat TOLERANCE/SCREAM_TOLERANCE;
  // scream detection via cueType, NOT dead voice='dash-scream' check.
  const tolerance = cue.driftToleranceOverride ?? TOLERANCE_BY_TYPE[cue.cueType];
  const flag = Math.abs(drift) > tolerance ? '!!' : 'OK';

  report.push({ filename, cueId: cue.id, cueType: cue.cueType, actual: actualFrames, expected, drift, tolerance, flag });
  console.log(
    `${flag} ${filename}: ${actualFrames}f (expected ${expected}f, ` +
    `drift ${(drift * 100).toFixed(1)}%, tolerance ±${(tolerance * 100).toFixed(0)}% for ${cue.cueType})`,
  );
}

// DOC-REVIEW: missing-WAV is FATAL (exit code 2); drift-beyond-tolerance
// is exit code 3. Pre-commit / CI can discriminate.
if (missing.length) {
  console.error(`\nFATAL: ${missing.length} WAV(s) missing:\n  ${missing.join('\n  ')}`);
  console.error(`Run: pnpm tts -- --only ${missing.map((f) => f.match(/^(s\d+-cue-\d+-\w+)\.wav$/)?.[1]).filter(Boolean).join(' --only ')}`);
  process.exit(2);
}

// Emit drift-reconciliation.md
const tableRows = report.map((r) =>
  `| \`${r.filename}\` | ${r.cueType} | ${r.expected} | ${r.actual} | ${(r.drift * 100).toFixed(1)}% | ±${(r.tolerance * 100).toFixed(0)}% | ${r.flag} |`,
).join('\n');
const md =
  `# Duration Reconciliation\n\n` +
  `| Cue | Type | Expected | Actual | Drift | Tolerance | Verdict |\n` +
  `|-----|------|----------|--------|-------|-----------|---------|\n` +
  `${tableRows}\n`;
writeFileSync('videos/trailer/sample-eval/voice-pipeline/duration-reconciliation.md', md);

const driftViolations = report.filter((r) => r.flag === '!!');
if (driftViolations.length) {
  console.error(`\n${driftViolations.length} cue(s) exceed tolerance — route to Unit 2.7 reconciliation.`);
  process.exit(3);
}
console.log('\nAll cues within tolerance ✓');
```

**Step 3 — Drift routing.**

- **All cues within per-cueType tolerance:** proceed to Step 4.5 +
  Unit 2.5 (post-processing). Exit code 0.
- **One cue drifts beyond tolerance:** exit code 3 routes to Unit 2.7
  reconciliation with the explicit next-action command per cue.
- **Multiple cues drift in same direction:** likely systemic engine
  pacing mismatch with Phase 1's wps assumption. Fix the cadence-spec
  pace direction globally; regen all via `pnpm tts:force`.

**Step 4 — Scream-cue special handling (no longer needed in code —
absorbed into TOLERANCE_BY_TYPE['scream'] = 0.20).** The scream WAV
gets ±20% tolerance via its `cueType: 'scream'` field, NOT via a dead
`voice === 'dash-scream'` check.

**Step 4.5 — Post-batch re-canary (DOC-REVIEW NEW STEP — detects
mid-session model version drift).**

After the full batch generates + the duration audit passes,
regenerate the original Dash canary cue (S04-htp-1) ONCE MORE with
the same inputs. Compare the second canary's duration to the first
canary's duration. If drift >1%, the engine model snapshot may have
shifted mid-session (rare but possible at 2026 platform velocity).

```ts
// scripts/post-batch-recanary.ts
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { BURNED_TRAILER_LINES } from '../src/lib/script.js';
import { cueFilename } from './lib/cue-filename.js';

const CANARY_FRAMES_LOG = 'videos/trailer/sample-eval/voice-pipeline/canary-frames.json';
const RE_CANARY_THRESHOLD = 0.01;  // 1% drift = engine version drift

const dashCanary = BURNED_TRAILER_LINES.find((l) => l.id === 'S04-htp-1');
if (!dashCanary) throw new Error('S04-htp-1 canary cue not found');

// Read the FIRST canary's measured frames (logged by Unit 2.3)
const firstCanary = JSON.parse(readFileSync(CANARY_FRAMES_LOG, 'utf-8'));

// Regen the canary (force flag to bypass hash skip)
execFileSync('pnpm', ['tts', '--', '--force', '--only', dashCanary.id], {
  stdio: 'inherit',
});

// Re-probe
const wav = join('videos/trailer/public/audio/lines', cueFilename(dashCanary));
const out = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', wav], { encoding: 'utf-8' });
const secondFrames = Math.round(parseFloat(out.trim()) * 30);
const drift = Math.abs(secondFrames - firstCanary[dashCanary.id]) / firstCanary[dashCanary.id];

if (drift > RE_CANARY_THRESHOLD) {
  throw new Error(
    `Post-batch re-canary drift ${(drift * 100).toFixed(2)}% exceeds 1% threshold. ` +
    `Engine version may have shifted mid-session. ` +
    `Compare logged modelId + adapter SHA in generation-log.jsonl across runs.`,
  );
}
console.log(`Re-canary drift ${(drift * 100).toFixed(2)}% ✓`);
```

**Patterns to follow:**

- `execFileSync` with argv array (NOT `execSync` with shell string).
  Project-wide security convention.
- FFprobe for duration measurement — UMB precedent.
- TOLERANCE_BY_TYPE from `cue.cueType` (Phase 1 ships this field).

**Test scenarios:**

- **Happy path:** All 15 WAVs generate; per-cueType duration audit
  passes; re-canary drift <1%.
- **Missing-WAV path:** Audit exits code 2 with concrete remediation
  `pnpm tts -- --only <cueId>` commands.
- **Drift path:** Audit exits code 3 with per-cue verdict + Unit 2.7
  reconciliation pointer.
- **Re-canary drift:** Post-batch re-canary >1% drift aborts with
  model-version-drift diagnosis pointer.

**Verification:**

- All 14 or 15 (per R5 outcome) WAVs in `public/audio/lines/`.
- `duration-reconciliation.md` documents per-cueType tolerance table.
- `canary-frames.json` logs first-canary frames for re-canary compare.
- Any drift beyond tolerance routed to Unit 2.7 fix with exit code 3.

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

**Approach (DOC-REVIEW REWRITE — body now matches the deepening
header amendments; previous body shipped the broken -23 LUFS
single-pass + `stop_periods=1:stop_duration=0` pattern that the header
flagged as defective).**

**Step 1 — Loudness normalization (two-pass).**

FFmpeg `loudnorm` filter targeting **-16 LUFS** (NOT -23 broadcast).
Two-pass workflow is mandatory because single-pass drifts ±2-3 LU on
clips <30s per k.ylo.ph/2016/04/04/loudnorm.html — every Phase 2 cue
is in the danger zone (0.6s to ~12s).

- **Pass 1** (measurement): `loudnorm=I=-16:LRA=9:TP=-1.5:print_format=json -f null -`.
  Parse JSON from stderr to get `measured_I` / `measured_TP` /
  `measured_LRA` / `measured_thresh` / `offset`.
- **Pass 2** (application): apply with measured values + `linear=true`
  for pure linear gain (NOT dynamic compression).
- `-ar 48000`: sample rate locked to 48 kHz (matches Phase 4 frame rate).
- `-ac 1`: **mono lock** (DOC-REVIEW — was missing; mismatch with
  anullsrc silence corrupts concat-demuxer output in Units 2.6/2.7).
- `-c:a pcm_s16le`: uncompressed 16-bit PCM (Remotion-compatible).

**Step 2 — Silence trim (areverse-sandwich).**

The pre-doc-review draft used
`silenceremove=start_periods=1:start_duration=0:...:stop_periods=1:stop_duration=0`
— the very pattern FFmpeg docs flag as "can prematurely cut interior
silence and drop final syllables." Correct pattern trims ONLY leading
+ trailing silence via the areverse-sandwich technique:

```
silenceremove=start_periods=1:start_silence=0.05:start_threshold=-50dB:detection=peak,
areverse,
silenceremove=start_periods=1:start_silence=0.05:start_threshold=-50dB:detection=peak,
areverse
```

Threshold `-50dB` for paced lines; `-30dB` for non-scream expressive
cues. **SKIP `silenceremove` entirely** when `cue.skipSilenceremove ===
true` (DOC-REVIEW: scream cue detection via Phase 1's `skipSilenceremove`
field, NOT the dead `voice === 'dash-scream'` check) — the scream IS
the attack envelope; trimming would shave the leading transient and
break stamp-coincident A/V sync.

**Step 3 — Per-cue fade-in / fade-out (reads from Line type).**

`afade` shape reads from Phase 1's `cue.fadeInMs` / `cue.fadeOutMs`
fields (already shipped). Defaults: 30ms in / 30ms out, linear.
Per-cue overrides:

- S04-payoff-a (frame 1950): `fadeInMs: 5` (hard land coincident with
  heavy 16-frame stamp slap).
- S06-phrasing (frame 2790): `fadeOutMs: 50` + `curve=qsin`
  (quarter-sine — smoother than default linear; let the punchline ring).
- S05-scream (frame 2400): `fadeInMs: 0` (preserve attack) +
  `fadeOutMs: 30` + `curve=qsin`.

**Step 4 — Wrapper script (DOC-REVIEW REWRITE — two-pass loudnorm,
areverse-sandwich, per-cue fade overrides, mono lock, atomic write,
BURNED_TRAILER_LINES consumption).**

```ts
// videos/trailer/scripts/post-process-tts.ts
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, renameSync, statSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { BURNED_TRAILER_LINES, type Line } from '../src/lib/script.js';
import { cueFilename } from './lib/cue-filename.js';
import { parsePhase0Exit } from './lib/phase-0-exit.js';
import { runFFmpegJson } from './lib/ffmpeg.js';

const linesDir = 'videos/trailer/public/audio/lines';
const rawDir = join(linesDir, 'raw');
if (!existsSync(rawDir)) mkdirSync(rawDir, { recursive: true });

const TARGET_I = -16;
const TARGET_LRA = 9;
const TARGET_TP = -1.5;

const cfg = parsePhase0Exit();

function probeDuration(wavPath: string): number {
  const out = execFileSync('ffprobe', [
    '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', wavPath,
  ], { encoding: 'utf-8' });
  return parseFloat(out.trim());
}

interface LoudnormMeasured {
  input_i: string;
  input_tp: string;
  input_lra: string;
  input_thresh: string;
  target_offset: string;
}

function buildSilenceremoveFilter(threshold: string): string {
  return [
    `silenceremove=start_periods=1:start_silence=0.05:start_threshold=${threshold}:detection=peak`,
    'areverse',
    `silenceremove=start_periods=1:start_silence=0.05:start_threshold=${threshold}:detection=peak`,
    'areverse',
  ].join(',');
}

function buildFadeFilter(cue: Line, durSec: number): string[] {
  const fadeInMs = cue.fadeInMs ?? 30;
  const fadeOutMs = cue.fadeOutMs ?? 30;
  const fadeInSec = fadeInMs / 1000;
  const fadeOutSec = fadeOutMs / 1000;
  // qsin curve for expressive cues (scream + phrasing) per deepening lock
  const curve = (cue.cueType === 'scream' || cue.id === 'S06-phrasing') ? ':curve=qsin' : '';
  const filters: string[] = [];
  if (fadeInMs > 0) filters.push(`afade=t=in:st=0:d=${fadeInSec}${curve}`);
  if (fadeOutMs > 0) {
    const fadeOutStart = Math.max(0, durSec - fadeOutSec);
    filters.push(`afade=t=out:st=${fadeOutStart}:d=${fadeOutSec}${curve}`);
  }
  return filters;
}

function processCue(cue: Line): void {
  // Skip scream cue per R5 outcome (consistent with Unit 2.2 gating)
  if (cue.id === 'S05-scream' && cfg.r5Outcome === 'cut') return;

  const filename = cueFilename(cue);
  const final = join(linesDir, filename);
  const raw = join(rawDir, filename);

  if (!existsSync(final) && !existsSync(raw)) return;
  // Preserve raw before in-place overwrite
  if (!existsSync(raw) && existsSync(final)) renameSync(final, raw);

  // Idempotence sentinel: sidecar tracks SHA(rawMtime + filterString).
  const rawMtime = statSync(raw).mtimeMs;
  const filterSha = createHash('sha256')
    .update(`${rawMtime}|${cue.fadeInMs ?? 30}|${cue.fadeOutMs ?? 30}|${cue.skipSilenceremove ?? false}|${TARGET_I}`)
    .digest('hex').slice(0, 16);
  const sentinelPath = `${final}.processed`;
  if (existsSync(sentinelPath) && readFileSync(sentinelPath, 'utf-8').trim() === filterSha) {
    console.log(`SKIP ${filename} (post-process sentinel matches)`);
    return;
  }

  // Pass 1 — measure loudness
  const pass1 = runFFmpegJson([
    '-i', raw,
    '-af', `loudnorm=I=${TARGET_I}:LRA=${TARGET_LRA}:TP=${TARGET_TP}:print_format=json`,
    '-f', 'null', '-',
  ]) as LoudnormMeasured;

  // Build the Pass 2 filter chain
  const trimThreshold = cue.cueType === 'scream' ? '-30dB' : '-50dB';
  const filters: string[] = [];

  // Pass 2 loudnorm with measured values + linear=true
  filters.push(
    `loudnorm=I=${TARGET_I}:LRA=${TARGET_LRA}:TP=${TARGET_TP}:` +
    `measured_I=${pass1.input_i}:measured_TP=${pass1.input_tp}:` +
    `measured_LRA=${pass1.input_lra}:measured_thresh=${pass1.input_thresh}:` +
    `offset=${pass1.target_offset}:linear=true:print_format=summary`,
  );

  // Areverse-sandwich silenceremove (skip for scream-attack preservation)
  if (!cue.skipSilenceremove) {
    filters.push(buildSilenceremoveFilter(trimThreshold));
  }

  // Per-cue afade reading from Line.fadeInMs / Line.fadeOutMs
  // Probe pre-trim duration; if silenceremove ran, post-trim duration differs.
  // Compute fade-out start AFTER trim by probing the post-trim length implicitly
  // via a single combined filter chain pass — afade is the last filter so the
  // fadeOutStart uses the post-silenceremove duration. To avoid a second probe,
  // we apply afade in a second FFmpeg invocation after the first pass writes to .tmp.
  const tmpPath = `${final}.tmp`;

  try {
    // Pass 2A — loudnorm + silenceremove (writes to .tmp)
    execFileSync('ffmpeg', [
      '-y', '-i', raw,
      '-af', filters.join(','),
      '-ar', '48000',
      '-ac', '1',                                     // DOC-REVIEW: mono lock
      '-c:a', 'pcm_s16le',
      tmpPath,
    ], { stdio: ['ignore', 'pipe', 'pipe'] });

    // Pass 2B — afade (uses post-trim duration)
    const postTrimSec = probeDuration(tmpPath);
    const fadeFilters = buildFadeFilter(cue, postTrimSec);
    if (fadeFilters.length > 0) {
      const tmpFade = `${final}.fade.tmp`;
      execFileSync('ffmpeg', [
        '-y', '-i', tmpPath,
        '-af', fadeFilters.join(','),
        '-ar', '48000',
        '-ac', '1',
        '-c:a', 'pcm_s16le',
        tmpFade,
      ], { stdio: ['ignore', 'pipe', 'pipe'] });
      renameSync(tmpFade, final);              // Atomic rename
      try { unlinkSync(tmpPath); } catch {}
    } else {
      renameSync(tmpPath, final);
    }

    // Write idempotence sentinel
    writeFileSync(sentinelPath, filterSha);
    console.log(`POST ${filename}`);
  } catch (e) {
    try { unlinkSync(tmpPath); } catch {}
    try { unlinkSync(`${final}.fade.tmp`); } catch {}
    throw e;
  }
}

for (const cue of BURNED_TRAILER_LINES) {
  processCue(cue);
}
```

**Step 5 — Post-process loudness + duration audit.**

After post-processing, re-run `audit-durations.ts` AND emit a loudness
audit:

```ts
// Append to scripts/post-process-tts.ts after the cue loop:
import { appendFileSync } from 'node:fs';

const auditLog = 'videos/trailer/sample-eval/voice-pipeline/loudness-audit.jsonl';
for (const cue of BURNED_TRAILER_LINES) {
  if (cue.id === 'S05-scream' && cfg.r5Outcome === 'cut') continue;
  const final = join(linesDir, cueFilename(cue));
  if (!existsSync(final)) continue;
  const summary = runFFmpegJson([
    '-i', final,
    '-af', `loudnorm=I=${TARGET_I}:LRA=${TARGET_LRA}:TP=${TARGET_TP}:print_format=json`,
    '-f', 'null', '-',
  ]) as LoudnormMeasured;
  const drift = Math.abs(parseFloat(summary.input_i) - TARGET_I);
  if (drift > 1.0) {
    console.warn(`!! ${cueFilename(cue)} loudness drift: measured ${summary.input_i} LUFS vs target ${TARGET_I}`);
  }
  appendFileSync(auditLog, JSON.stringify({ cueId: cue.id, measuredI: summary.input_i, measuredTp: summary.input_tp, drift }) + '\n');
}
```

Silence-trim may shorten WAVs by 200–500ms — verify the new durations
remain within per-cueType tolerance. Post-processed durations REPLACE
raw durations as the source of truth for Phase 4 placement (Unit 2.8
manifest generation reads post-processed lengths).

**Patterns to follow:**

- NEW for BURNED — no UMB precedent (DOC-REVIEW: corrects hallucinated
  "UMB v3 audio processing pipeline" reference; UMB ships raw Gemini
  PCM unprocessed).
- EBU R128 loudness reference + k.ylo.ph/2016/04/04/loudnorm.html
  canonical two-pass loudnorm guide.
- `execFileSync` argv pattern.
- Atomic-write pattern via `.tmp` intermediate + atomic-rename.

**Test scenarios:**

- **Happy path:** Every WAV emerges at -16 LUFS ±1 LU integrated;
  true-peak ≤-1.5 dBTP.
- **Happy path:** No WAV has >50ms of leading silence after trim
  (except scream cue, where silenceremove is skipped).
- **Per-cue fade:** Payoff cue 1950 has 5ms fade-in; phrasing cue 2790
  has 50ms qsin fade-out; scream cue 2400 has 0ms fade-in + 30ms qsin
  fade-out.
- **Idempotence:** Re-running post-process with no raw changes skips
  every cue via the `.processed` sentinel.
- **Error path:** Missing raw WAV → script logs warn + skips that cue.
- **Security:** No shell-string interpolation in any FFmpeg call.

**Verification:**

- All 14 or 15 WAVs in `public/audio/lines/` are post-processed.
- Raw versions preserved in `public/audio/lines/raw/`.
- `loudness-audit.jsonl` confirms every cue's integrated loudness
  within ±1 LU of -16 LUFS.
- Mono lock + 48kHz/16-bit applied uniformly.

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
> (3) **Beat encoding is marker-tokens in text** (`[BEAT 300ms]`),
> NOT `afterWord` index (fragile to text edits). Generator strips
> tokens before TTS call; FFmpeg stitch inserts silence at the
> token-stripped position. Phase 1 ships `[BEAT NNNms]` in cue.text
> per Phase 1 Unit 1.2 Step 4 (verified at
> `phase-1-beat-sheet-lock.md` line 146 +
> `script.test.ts` drift-prevention pattern). Phase 2's stitch
> parser consumes this format directly.
> DOC-REVIEW correction: the pre-doc-review draft proposed a different
> `[BEAT NNNms]` token format as a "Phase 1 follow-up amendment" —
> but Phase 1 already locks `[BEAT NNNms]`. Phase 2 adapts.
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

**Goal:** For cues whose `text` contains `[BEAT NNNms]` marker
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

**Step 1 — Engine-routed beat handling (DOC-REVIEW REWRITE — all
engines now route through FFmpeg silence stitch; inline-tag rows
deleted because the deepening Context7-verified they DO NOT exist).**

| Engine | Inline syntax | Method |
|--------|---------------|--------|
| ElevenLabs v3 | `[pause:600ms]` DOES NOT EXIST in v3 (only qualitative `[pause]`/`[short pause]`/`[long pause]`) | FFmpeg silence stitch (Step 2) |
| Gemini 2.5 Flash Preview TTS | SSML `<break>` NOT supported | FFmpeg silence stitch (Step 2) |
| OpenAI gpt-4o-mini-tts | No inline pause syntax | FFmpeg silence stitch (Step 2) |
| Voice actor (Path D) | N/A | Pause direction in casting brief |

The pre-doc-review draft listed `[pause:600ms]` (ElevenLabs) + SSML
`<break time='600ms'/>` (Gemini) as valid inline methods producing
"single WAV" output. Context7 verification confirms neither syntax
exists in the locked engine versions. All inline-tag rows DELETED.
ALL engines route precision intra-line beats through FFmpeg silence
stitch (Step 2). The S03 cues with `[BEAT 0.3s]` markers — currently
the only Phase 1 cues with intra-line beats — are handled by this
unit regardless of engine.

**Step 2 — FFmpeg silence stitch (DOC-REVIEW REWRITE — engine-agnostic,
consumes `[BEAT NNNms]` marker tokens from BURNED_TRAILER_LINES,
Windows-safe paths, per-invocation temp file).**

For each cue whose text contains `[BEAT NNNms]` marker tokens
(currently S03 cues per Phase 1 Unit 1.2 Step 4):

1. Parse tokens out of `cue.text` to extract segment boundaries + beat
   durations.
2. Generate each segment via the same engine client (one API call per
   segment).
3. Concat segments with `anullsrc` mono silence at each beat position.
4. Verify beat position via FFprobe `silencedetect` within ±15ms.

```ts
// videos/trailer/scripts/stitch-beats.ts
import { execFileSync } from 'node:child_process';
import { existsSync, writeFileSync, unlinkSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { BURNED_TRAILER_LINES, type Line } from '../src/lib/script.js';
import { cueFilename } from './lib/cue-filename.js';
import { parsePhase0Exit } from './lib/phase-0-exit.js';
import { generateForCue } from './tts-clients/index.js';
import { atomicWriteSync } from './lib/atomic-write.js';

const linesDir = 'videos/trailer/public/audio/lines';
// DOC-REVIEW: parse Phase 1's actual `[BEAT NNNms]` emission format
// (per phase-1-beat-sheet-lock.md line 146 + script.test.ts drift gate).
const BEAT_TOKEN = /\[BEAT (\d+)ms\]/g;

/** Normalize a path for FFmpeg concat-demuxer consumption.
 *  DOC-REVIEW: FFmpeg concat treats `\` as escape; Windows path.join
 *  produces backslash paths; normalize to forward-slash to avoid
 *  silent "wrong file used" failures. */
function toFFmpegPath(p: string): string {
  return p.replace(/\\/g, '/');
}

/** Parse beat tokens out of cue text. Returns segments + beat
 *  durations in the order they appear. */
function parseBeats(text: string): { segments: string[]; beatsMs: number[] } {
  const segments: string[] = [];
  const beatsMs: number[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;
  BEAT_TOKEN.lastIndex = 0;
  while ((match = BEAT_TOKEN.exec(text)) !== null) {
    segments.push(text.slice(cursor, match.index).trim());
    beatsMs.push(parseInt(match[1], 10));
    cursor = match.index + match[0].length;
  }
  segments.push(text.slice(cursor).trim());
  return { segments, beatsMs };
}

function makeSilence(durSec: number, outPath: string): void {
  execFileSync('ffmpeg', [
    '-y',
    '-f', 'lavfi',
    '-i', 'anullsrc=channel_layout=mono:sample_rate=48000',
    '-t', durSec.toFixed(3),
    '-ac', '1',
    '-c:a', 'pcm_s16le',
    outPath,
  ], { stdio: ['ignore', 'pipe', 'pipe'] });
}

function concatWavs(parts: string[], outPath: string): void {
  // DOC-REVIEW: per-invocation unique temp path (was hardcoded
  // `temp-concat-list.txt`; concurrent runs would clobber).
  const tmpDir = join(tmpdir(), 'burned-stitch');
  if (!existsSync(tmpDir)) mkdirSync(tmpDir, { recursive: true });
  const listPath = join(tmpDir, `concat-list-${Date.now()}-${process.pid}.txt`);
  try {
    // DOC-REVIEW: forward-slash paths for FFmpeg concat-demuxer
    // (Windows path.join produces backslash paths that break the demuxer).
    writeFileSync(
      listPath,
      parts.map((p) => `file '${toFFmpegPath(p)}'`).join('\n'),
    );
    execFileSync('ffmpeg', [
      '-y',
      '-f', 'concat',
      '-safe', '0',
      '-i', listPath,
      '-c', 'copy',
      outPath,
    ], { stdio: ['ignore', 'pipe', 'pipe'] });
  } finally {
    try { unlinkSync(listPath); } catch {}
  }
}

const cfg = parsePhase0Exit();
const cadenceAdapter = require('node:fs').readFileSync(cfg.cadenceAdapterPath, 'utf-8');

async function stitchCue(cue: Line): Promise<void> {
  const { segments, beatsMs } = parseBeats(cue.text);
  if (beatsMs.length === 0) return;  // no beats in this cue

  const filename = cueFilename(cue);
  console.log(`STITCH ${filename}: ${beatsMs.length} beat(s) at ${beatsMs.join('ms / ')}ms`);

  const voiceId = cfg.voiceIds[cue.voice];
  if (!voiceId) throw new Error(`No voice ID for ${cue.voice}`);

  // Generate each segment as a separate API call
  const tmpDir = join(tmpdir(), 'burned-stitch-segments');
  if (!existsSync(tmpDir)) mkdirSync(tmpDir, { recursive: true });
  const segmentPaths: string[] = [];

  for (let i = 0; i < segments.length; i++) {
    const segText = segments[i];
    if (!segText) continue;  // empty trailing segment (cue ends on a beat)
    const segPath = join(tmpDir, `${cue.id}-seg-${i}.wav`);
    // Synthesize this segment via the locked engine
    const segCue: Line = { ...cue, text: segText };
    const wavBuf = await generateForCue({
      engine: cfg.engine,
      text: segText,
      voice: cue.voice,
      voiceId,
      cadenceAdapter,
      cadencePrefixTag: cue.cadenceAdapter?.prefixTag,
      modelId: cfg.modelId,
    });
    atomicWriteSync(segPath, wavBuf);
    segmentPaths.push(segPath);

    // Insert silence after this segment (except after the last)
    if (i < beatsMs.length) {
      const silencePath = join(tmpDir, `${cue.id}-silence-${i}.wav`);
      makeSilence(beatsMs[i] / 1000, silencePath);
      segmentPaths.push(silencePath);
    }
  }

  // Concat into the final per-cue WAV
  const finalPath = join(linesDir, filename);
  concatWavs(segmentPaths, finalPath);

  // Cleanup
  for (const p of segmentPaths) try { unlinkSync(p); } catch {}
}

async function main() {
  // DOC-REVIEW: consume BURNED_TRAILER_LINES (was deleted SCRIPT_CUES);
  // detect beat-bearing cues via [BEAT NNNms] text tokens (was the
  // deleted cue.beats[] shape).
  const cuesWithBeats = BURNED_TRAILER_LINES.filter((c) => BEAT_TOKEN.test(c.text));
  BEAT_TOKEN.lastIndex = 0;  // reset regex state after .test()
  for (const cue of cuesWithBeats) {
    await stitchCue(cue);
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
```

**Step 3 — Beat-position verification (automated).**

Post-stitched WAV audit uses FFmpeg `silencedetect` to confirm each
beat lands within ±15ms of its declared position:

```ts
// scripts/audit-stitch-positions.ts
import { execFileSync } from 'node:child_process';
import { BURNED_TRAILER_LINES } from '../src/lib/script.js';
import { cueFilename } from './lib/cue-filename.js';

const BEAT_TOKEN = /\[BEAT (\d+)ms\]/g;
const TOLERANCE_MS = 15;

function detectSilences(wavPath: string, thresholdDb = -50, minSilenceMs = 100): number[] {
  // FFmpeg silencedetect writes timing info to stderr
  const out = execFileSync('ffmpeg', [
    '-i', wavPath,
    '-af', `silencedetect=noise=${thresholdDb}dB:d=${minSilenceMs / 1000}`,
    '-f', 'null', '-',
  ], { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] });
  const starts = [...out.matchAll(/silence_start: ([\d.]+)/g)].map((m) => parseFloat(m[1]) * 1000);
  return starts;
}

for (const cue of BURNED_TRAILER_LINES) {
  BEAT_TOKEN.lastIndex = 0;
  const matches = [...cue.text.matchAll(BEAT_TOKEN)];
  if (matches.length === 0) continue;

  const wav = `videos/trailer/public/audio/lines/${cueFilename(cue)}`;
  const detectedSilences = detectSilences(wav);
  // (Approximate position-verification: detected silence starts should
  // align with cumulative segment durations — full verification logic
  // accumulates segment lengths via probeDuration.)
}
```

**Step 4 — Cross-path verification.**

Whichever engine generated each segment, the resulting WAV must:
- Match `cue.expectedFrames` ± per-cueType tolerance (Unit 2.4 audit
  re-runs after stitch).
- Have audible silence inside the line at each declared beat position
  (within ±15ms tolerance — Step 3).
- Have no audible artifact at any join (mono lock + matching sample
  rate ensure `-c copy` concat preserves clean joins).

**Patterns to follow:**

- FFmpeg `concat` demuxer pattern with file list.
- FFmpeg `silencedetect` filter for automated beat-position audit.
- Project security rule: `execFileSync` over `execSync`.
- Windows-portable concat paths (forward-slash normalized).

**Test scenarios:**

- **Happy path:** S03 cues with `[BEAT 0.3s]` markers produce stitched
  WAVs with silence at the right syntactic position.
- **Edge case (no beats):** Cues without `[BEAT NNNms]` tokens are
  skipped by `stitchCue` and ship from Unit 2.2's single-WAV output.
- **Edge case (concurrent runs):** Per-invocation temp file (`concat-
  list-${Date.now()}-${process.pid}.txt`) prevents clobber when
  multiple `--only` targets run in parallel.
- **Edge case (Windows path):** `toFFmpegPath` forward-slash normalization
  prevents FFmpeg from interpreting `\` as escape.
- **Error path:** Beat position drift >15ms → audit logs `!!`;
  reconciliation routes to text-position adjustment in Phase 1's
  script.ts (cue text receives a manual re-balance of word counts
  before/after the beat marker).
- **Security:** No shell-string interpolation.

**Verification:**

- S03 cues with intra-line beats have stitched WAVs in
  `public/audio/lines/`.
- Beat positions verified within ±15ms via `silencedetect`.
- Per-invocation temp paths in OS temp dir (not in tracked dirs).
- Windows-portable forward-slash concat-list paths.

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

- Edit (potentially, only on Tier 2-4 escalation): `videos/trailer/BEAT-SHEET.md`,
  `videos/trailer/src/lib/timing.ts`, `videos/trailer/src/lib/script.ts`.
  (DOC-REVIEW: `script.ts`, not deleted `script-lines.ts`.)
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

**Step 2 — Reconciliation options (ordered by preference; DOC-REVIEW:
`script.ts` references corrected).**

1. **Phase 1 line-trim (preferred).** If a specific cue overran, trim
   1–3 words from `cue.text` in `script.ts` + BEAT-SHEET.md. Re-gen
   only that cue (low cost).
2. **Phase 1 timing.ts adjustment.** Expand or contract a scene's
   frame budget. Done in `timing.ts`. Cascade-aware: if S04 expands
   by 60 frames, S05 contracts by 60 (so TOTAL_FRAMES stays 2850).
3. **TOTAL_FRAMES adjustment.** Last resort. Move from 2850 to 2820
   or 2880. R7 allows 90–100s (2700–3000 frames). Document in
   roadmap status update.

**Step 3 — Full-audio stitch for sign-off (DOC-REVIEW REWRITE —
BURNED_TRAILER_LINES + cueFilename consumption, Windows-portable
concat paths, overrun-aware cursorFrame, mono lock).**

```ts
// videos/trailer/scripts/stitch-full-audio.ts
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync, existsSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { BURNED_TRAILER_LINES, type Line } from '../src/lib/script.js';
import { cueFilename } from './lib/cue-filename.js';
import { parsePhase0Exit } from './lib/phase-0-exit.js';

const FPS = 30;
const linesDir = 'videos/trailer/public/audio/lines';
const evalDir = 'videos/trailer/sample-eval/voice-pipeline';
if (!existsSync(evalDir)) mkdirSync(evalDir, { recursive: true });

const cfg = parsePhase0Exit();

/** DOC-REVIEW: FFmpeg concat-demuxer treats `\` as escape; Windows
 *  path.join produces backslash paths; normalize to forward-slash. */
function toFFmpegPath(p: string): string {
  return p.replace(/\\/g, '/');
}

function probeDuration(wavPath: string): number {
  const out = execFileSync('ffprobe', [
    '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', wavPath,
  ], { encoding: 'utf-8' });
  return parseFloat(out.trim());
}

function makeSilence(durSec: number, outPath: string): void {
  if (durSec <= 0) return;
  execFileSync('ffmpeg', [
    '-y',
    '-f', 'lavfi',
    '-i', 'anullsrc=channel_layout=mono:sample_rate=48000',
    '-t', durSec.toFixed(3),
    '-ac', '1',                                       // DOC-REVIEW: mono lock
    '-c:a', 'pcm_s16le',
    outPath,
  ], { stdio: ['ignore', 'pipe', 'pipe'] });
}

// Filter cues per R5 outcome (consistent with Unit 2.2 + Unit 2.4 gating)
const activeCues = BURNED_TRAILER_LINES.filter((cue) => {
  if (cue.id === 'S05-scream' && cfg.r5Outcome === 'cut') return false;
  return true;
});

const concatList: string[] = [];
const overruns: Array<{ cueId: string; overrunFrames: number }> = [];
const tmpDir = join(evalDir, 'tmp');
if (!existsSync(tmpDir)) mkdirSync(tmpDir, { recursive: true });

// Leading silence to frame of first cue
const firstCue = activeCues[0];
if (firstCue.frame > 0) {
  const leadSilence = join(tmpDir, 'lead.wav');
  makeSilence(firstCue.frame / FPS, leadSilence);
  concatList.push(`file '${toFFmpegPath(leadSilence)}'`);
}

let cursorFrame = firstCue.frame;
for (let i = 0; i < activeCues.length; i++) {
  const cue = activeCues[i];
  const wav = join(linesDir, cueFilename(cue));
  if (!existsSync(wav)) {
    console.warn(`MISS ${cueFilename(cue)}`);
    continue;
  }
  concatList.push(`file '${toFFmpegPath(wav)}'`);
  const actualSec = probeDuration(wav);
  const actualFrames = Math.round(actualSec * FPS);
  cursorFrame += actualFrames;

  if (i < activeCues.length - 1) {
    const next = activeCues[i + 1];
    const gapFrames = next.frame - cursorFrame;
    if (gapFrames > 0) {
      // Normal gap — emit silence
      const silencePath = join(tmpDir, `gap-${i}.wav`);
      makeSilence(gapFrames / FPS, silencePath);
      concatList.push(`file '${toFFmpegPath(silencePath)}'`);
      cursorFrame += gapFrames;
    } else if (gapFrames < 0) {
      // DOC-REVIEW: OVERRUN — cue overran its declared slot. Log it as
      // an OVERRUN warning + advance cursorFrame to next.frame so
      // subsequent cues remain at their declared positions. The overrun
      // becomes audible OVERLAP in the sign-off stitch — Briggsy hears
      // the problem before reconciliation Tier 2 routing.
      console.warn(
        `OVERRUN ${cueFilename(cue)}: actual ${actualFrames}f exceeds budgeted slot by ${-gapFrames}f. ` +
        `Next cue ${cueFilename(next)} at frame ${next.frame} will overlap. ` +
        `Routing to Tier 2 reconciliation (Step 2).`,
      );
      overruns.push({ cueId: cue.id, overrunFrames: -gapFrames });
      cursorFrame = next.frame;  // resync
    }
    // gapFrames === 0 is the perfect case — no silence needed
  }
}

const listPath = join(tmpDir, 'concat-list.txt');
writeFileSync(listPath, concatList.join('\n'));
try {
  execFileSync('ffmpeg', [
    '-y',
    '-f', 'concat',
    '-safe', '0',
    '-i', listPath,
    '-c', 'copy',
    join(evalDir, 'full-audio.wav'),
  ], { stdio: ['ignore', 'pipe', 'pipe'] });
} finally {
  try { unlinkSync(listPath); } catch {}
}

console.log(`OK full-audio.wav generated (${activeCues.length} cues, ${overruns.length} overruns)`);
if (overruns.length > 0) {
  console.error(`\n${overruns.length} cue overrun(s):`);
  overruns.forEach((o) => console.error(`  - ${o.cueId}: +${o.overrunFrames}f over budget`));
  console.error(`\nRoute to Tier 2 reconciliation (Step 2 line-trim) before sign-off.`);
}
```

Output: `videos/trailer/sample-eval/voice-pipeline/full-audio.wav`.

**Step 4 — Sign-off recording (DOC-REVIEW R2 CORRECTED 2026-05-22:
N=1 Briggsy production-cert standard).**

Earlier R2 wording locked "N=2 minimum (Briggsy + Harry)" on the
premise that Harry was a human listener. Harry is AI. The team is
just Briggsy + Claude(s) forever (no future phase changes that).
Final sign-off is **N=1 (Briggsy)** — production-cert standard. The
"escalate to N=6 if any Likert dimension <5" branch is deleted (same
broken premise; Phase 0 EXIT confirms the N=6 panel was never
actually run, only deferred forward).

```md
## Phase 2 → Phase 1 Reconciliation — SIGNED OFF
Date: 2026-MM-DD

### Sign-off (N=1 Briggsy — production-cert standard per R2 amendment)
- Briggsy: verdict <accepted / route to Tier N>

### Runtime + reconciliation
Total runtime: <measured>s (target 95.0s, drift <%>)
Lines regenerated due to drift: <list or "none">
BEAT-SHEET.md edits: <list or "none">
timing.ts edits: <list or "none">
script.ts edits: <list or "none">
Overruns surfaced by stitch: <list or "none">

### Sentinel
- phase-1-reconciliation-signoff.txt written: <YES / NO>
- (Written when Briggsy's verdict is "accepted".)
```

```ts
// scripts/reconciliation-signoff.ts (NEW — invoked after Step 4 review)
import { writeFileSync } from 'node:fs';
const SENTINEL = 'videos/trailer/sample-eval/voice-pipeline/phase-1-reconciliation-signoff.txt';
// Written when Briggsy's verdict is "accepted" (N=1 production standard).
writeFileSync(
  SENTINEL,
  `Phase 1 reconciliation sign-off: ${new Date().toISOString()}\n` +
  `Listener (N=1): Briggsy\n` +
  `Accepted: YES\n`,
);
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

**Step 1 — Audio manifest type (DOC-REVIEW REWRITE — voice union
aligned to Phase 1's locked `'dash'|'sable'|'janet'|'vera'`; fields
expanded with Phase-4-consumption hints; type separated from data).**

```ts
// videos/trailer/src/lib/audio-manifest-types.ts
//
// Type stays stable; data file (audio-manifest.ts) churns under codegen.
export interface AudioAsset {
  /** Cue filename in public/audio/lines/. */
  readonly filename: string;
  /** Static-file path consumable by Remotion staticFile(). */
  readonly staticPath: string;
  /** Frame at which this audio enters (Phase 1 startFrame). */
  readonly startFrame: number;
  /** Measured frame duration (post-processed actual, from FFprobe). */
  readonly actualFrames: number;
  /** Voice cell — matches Phase 1's Line.voice union. */
  readonly voice: 'dash' | 'sable' | 'janet' | 'vera';
  /** Original Phase 1 expected duration. */
  readonly expectedFrames: number;
  /** Phase 1 cue type — Phase 4 may use for music-bed ducking decisions. */
  readonly cueType: 'sustained' | 'list' | 'payoff' | 'scream';
  /** Audio lead-frames hint — Phase 4 places audio at
   *  `from={asset.startFrame - (asset.leadFramesHint ?? 0)}` for
   *  perceptual A/V sync (payoff cue 1950 = 2; scream cue 2400 = 1). */
  readonly leadFramesHint?: number;
  /** Measured integrated loudness post-Unit-2.5 (Phase 6 QA consumes). */
  readonly loudnessLufs: number;
  /** Optional Phase 1 cadence adapter notes mirrored from Line. */
  readonly cadenceAdapter?: {
    readonly engine: 'elevenlabs-v3' | 'gemini-tts' | 'openai-tts' | 'voice-actor';
    readonly prefixTag?: string;
    readonly notes?: string;
  };
}
```

```ts
// videos/trailer/src/lib/audio-manifest.ts
//
// Initial stub ships in Phase 0 Unit 0.1 scaffold so Phase 4 imports
// always resolve. Unit 2.8 codegen overwrites the data
// post-reconciliation.
import type { AudioAsset } from './audio-manifest-types';

export type { AudioAsset } from './audio-manifest-types';
export const AUDIO_ASSETS: readonly AudioAsset[] = [] as const;
```

**Step 2 — Codegen script (DOC-REVIEW REWRITE — consumes
BURNED_TRAILER_LINES, asserts sign-off sentinel, reads loudness from
audit log).**

```ts
// videos/trailer/scripts/generate-audio-manifest.ts
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { BURNED_TRAILER_LINES, type Line } from '../src/lib/script.js';
import { cueFilename, cueStaticPath } from './lib/cue-filename.js';
import { parsePhase0Exit } from './lib/phase-0-exit.js';

const FPS = 30;
const SIGNOFF_SENTINEL = 'videos/trailer/sample-eval/voice-pipeline/phase-1-reconciliation-signoff.txt';
const LOUDNESS_AUDIT = 'videos/trailer/sample-eval/voice-pipeline/loudness-audit.jsonl';

if (!existsSync(SIGNOFF_SENTINEL)) {
  throw new Error(
    `Codegen blocked: phase-1-reconciliation-signoff.txt sentinel missing.\n` +
    `Run Unit 2.7 sign-off first.`,
  );
}

const cfg = parsePhase0Exit();

function probeDuration(wavPath: string): number {
  const out = execFileSync('ffprobe', [
    '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', wavPath,
  ], { encoding: 'utf-8' });
  return parseFloat(out.trim());
}

// Read per-cue measured loudness from Unit 2.5's audit log
interface LoudnessAuditEntry { cueId: string; measuredI: string }
const loudnessByCueId = new Map<string, number>(
  existsSync(LOUDNESS_AUDIT)
    ? readFileSync(LOUDNESS_AUDIT, 'utf-8').trim().split('\n').filter(Boolean).map((line) => {
        const entry = JSON.parse(line) as LoudnessAuditEntry;
        return [entry.cueId, parseFloat(entry.measuredI)] as const;
      })
    : [],
);

interface AudioAssetEntry {
  filename: string;
  staticPath: string;
  startFrame: number;
  actualFrames: number;
  voice: Line['voice'];
  expectedFrames: number;
  cueType: NonNullable<Line['cueType']>;
  leadFramesHint?: number;
  loudnessLufs: number;
  cadenceAdapter?: Line['cadenceAdapter'];
}

const entries: AudioAssetEntry[] = [];
for (const cue of BURNED_TRAILER_LINES) {
  // R5=cut filter
  if (cue.id === 'S05-scream' && cfg.r5Outcome === 'cut') continue;

  const filename = cueFilename(cue);
  const wav = `videos/trailer/public/audio/lines/${filename}`;
  if (!existsSync(wav)) {
    throw new Error(`Codegen: WAV missing for ${cue.id}: ${wav}`);
  }
  const seconds = probeDuration(wav);
  entries.push({
    filename,
    staticPath: cueStaticPath(cue),
    startFrame: cue.frame,                      // DOC-REVIEW: was startFrame; Phase 1 ships .frame
    actualFrames: Math.round(seconds * FPS),
    voice: cue.voice,                           // DOC-REVIEW: 'dash'|'sable'|'janet'|'vera' (Phase 1)
    expectedFrames: cue.expectedFrames,
    cueType: cue.cueType,                       // DOC-REVIEW: from Phase 1 Line
    leadFramesHint: cue.leadFramesHint,         // DOC-REVIEW: from Phase 1 Line
    loudnessLufs: loudnessByCueId.get(cue.id) ?? -16,  // -16 fallback if audit log absent
    cadenceAdapter: cue.cadenceAdapter,         // mirror Phase 1's adapter notes for Phase 4
  });
}

const tsBody = `// AUTOGENERATED by scripts/generate-audio-manifest.ts — do not edit by hand.
import type { AudioAsset } from './audio-manifest-types';

export type { AudioAsset } from './audio-manifest-types';
export const AUDIO_ASSETS: readonly AudioAsset[] = ${JSON.stringify(entries, null, 2)} as const;
`;

writeFileSync('videos/trailer/src/lib/audio-manifest.ts', tsBody);
console.log(`OK audio-manifest.ts generated with ${entries.length} entries`);
```

**Step 3 — Inventory checklist (DOC-REVIEW REWRITE — filenames match
`cueFilename()` output; `script-lines.ts` reference removed; loudness
target corrected to -16 LUFS).**

```md
# Phase 2 Asset Inventory

## WAV files in public/audio/lines/
(Filenames derived from `cueFilename(line)` — `s{NN}-cue-{frame}-{voice}.wav`
where voice ∈ {dash, sable, janet, vera}. The `{coldOpenSpeaker}` slot
below resolves from PHASE-0-EXIT.md Section 2 at execution time.)
- [x] s01-cue-60-{coldOpenSpeaker}.wav    (cold-open speaker per PHASE-0-EXIT.md)
- [x] s02-cue-240-dash.wav                (Dash — sustained briefing)
- [x] s03-cue-600-dash.wav                (Dash — list)
- [x] s03-cue-870-dash.wav                (Dash — list, with intra-line beats)
- [x] s04-cue-1080-dash.wav               (Dash)
- [x] s04-cue-1110-dash.wav               (Dash)
- [x] s04-cue-1290-dash.wav               (Dash)
- [x] s04-cue-1410-dash.wav               (Dash)
- [x] s04-cue-1560-dash.wav               (Dash)
- [x] s04-cue-1680-dash.wav               (Dash)
- [x] s04-cue-1950-dash.wav               (Dash — payoff-a / "They WERE the operation.")
- [x] s04-cue-2010-dash.wav               (Dash — payoff-b second half)
- [x] s05-cue-2280-dash.wav               (Dash — sparse over gameplay)
- [x] s05-cue-2400-dash.wav               (Dash — scream; OMITTED if R5=cut)
- [x] s06-cue-2610-dash.wav               (Dash — sustained close)
- [x] s06-cue-2790-dash.wav               (Dash — "...Phrasing." payoff)

## Manifest exports
- [x] src/lib/script.ts                   (Phase 1 BURNED_TRAILER_LINES — source of truth)
- [x] src/lib/audio-manifest-types.ts     (AudioAsset type — stable)
- [x] src/lib/audio-manifest.ts           (AUDIO_ASSETS data — codegen output)

## Verification artifacts
- [x] sample-eval/voice-pipeline/preflight-log.md
- [x] sample-eval/voice-pipeline/generation-log.md
- [x] sample-eval/voice-pipeline/generation-log.jsonl
- [x] sample-eval/voice-pipeline/cadence-consistency.md
- [x] sample-eval/voice-pipeline/cadence-consistency-signoff.txt   (sentinel)
- [x] sample-eval/voice-pipeline/duration-reconciliation.md
- [x] sample-eval/voice-pipeline/loudness-audit.jsonl
- [x] sample-eval/voice-pipeline/phase-1-reconciliation.md
- [x] sample-eval/voice-pipeline/phase-1-reconciliation-signoff.txt (sentinel)
- [x] sample-eval/voice-pipeline/full-audio.wav                     (sign-off listen)
- [x] sample-eval/voice-pipeline/asset-inventory.md                 (this doc)
- [x] sample-eval/voice-pipeline/context-priming-overrides.json     (Phase 2-owned priming)
- [x] sample-eval/voice-pipeline/tts-spend.json                     (gitignored — account-scoped)

## Phase 4 hand-off
- Phase 4 scenes import AUDIO_ASSETS from src/lib/audio-manifest.ts.
- Per-scene audio placement uses `<Sequence from={asset.startFrame
  - (asset.leadFramesHint ?? 0)}><Audio src={staticFile(asset.staticPath)} /></Sequence>`.
  NOT `<Audio from={...}>` — that prop does not exist on `@remotion/media`.
- All audio is post-processed (-16 LUFS ±1 LU, areverse-sandwich silence-
  trimmed, per-cue afade shaped, mono 48kHz PCM_S16LE).
- ElevenLabs v3 deprecation contingency (DOC-REVIEW R5): raw API
  responses archived at `public/audio/lines/raw/`. If v3 sunsets between
  Phase 2 close and Phase 6 distribution, locked WAVs continue shipping
  from `public/audio/lines/` (post-processed) and `raw/` (immutable
  fallback). Regen capability NOT presumed post-close.
- No further audio processing needed in Phase 4 (volume / ducking only).
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
  **GITIGNORED** — raw deliveries are not committed (binary blobs +
  per-take artifacts).
- Create: `videos/trailer/sample-eval/voice-actor-delivery/path-d-manifest.json`
  — RAW manifest with PII (actorName, agentName, actorNotes,
  deliveredAt timestamps). **GITIGNORED** (DOC-REVIEW: actor identity
  + delivery timeline treated as PII; never lands in source control).
- Create: `videos/trailer/sample-eval/voice-actor-delivery/path-d-manifest.sanitized.json`
  — sanitized manifest (cueId → delivery status only; actor identity
  fields stripped). COMMITTED. Generated by `ingest-path-d.ts`
  alongside the raw manifest read.
- Create: `videos/trailer/sample-eval/voice-actor-delivery/ingest-log.md`
  — per-batch ingest log + revision tracking (no PII).

**Approach:**

**Step 0 — Path D scaffold (DOC-REVIEW NEW STEP — close the
circular-reference gap surfaced in scope-guardian review).**

Before ingest-path-d.ts can run, the staging directory + empty
manifest stub must exist. Phase 0 Sub-phase 0a Brief Memo approval
triggers this scaffolding (one-time setup):

```bash
# Run once after Phase 0 Sub-phase 0a Brief Memo lands
mkdir -p videos/trailer/sample-eval/voice-actor-delivery/raw
cat > videos/trailer/sample-eval/voice-actor-delivery/path-d-manifest.json <<'EOF'
{
  "actorName": "<populate after casting>",
  "agentName": "<populate after casting>",
  "casting_brief_path": "sample-eval/r4-dash/path-d-casting-brief.md",
  "deliveries": []
}
EOF
```

These paths are gitignored per Unit 2.0 Step 1 .gitignore sanity check
(actor PII + raw WAV blobs). The sanitized manifest is generated by
ingest-path-d.ts (Step 2) — Briggsy never hand-edits it.

**Step 1 — `path-d-manifest.json` structure (raw, gitignored — PII).**

```jsonc
// videos/trailer/sample-eval/voice-actor-delivery/path-d-manifest.json
// GITIGNORED — contains actor PII (name, agency, delivery timeline).
{
  "actorName": "Jane Doe",                                  // PII
  "agentName": "voices.com / voice123 / personal",          // PII
  "casting_brief_path": "sample-eval/r4-dash/path-d-casting-brief.md",
  "deliveries": [
    {
      "cueId": "S01-coldopen",
      "actorFilename": "dash-trailer-line-01-take03.wav",
      "deliveredAt": "2026-MM-DDTHH:MM:SSZ",               // PII (timing)
      "actorNotes": "Take 3, deadpan emphasis on 'machine'", // PII
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

The sanitized manifest (committed) carries only what Phase 4 / QA /
retrospective need:

```jsonc
// videos/trailer/sample-eval/voice-actor-delivery/path-d-manifest.sanitized.json
// COMMITTED — actor identity stripped; cueId → delivery state only.
{
  "deliveries": [
    { "cueId": "S01-coldopen", "ingested": true,  "revisionRequested": false },
    { "cueId": "S02-greeting", "ingested": true,  "revisionRequested": false },
    // ... one entry per BURNED_TRAILER_LINES cue
  ]
}
```

The sanitized manifest is regenerated on every `ingest-path-d.ts`
invocation (see Step 2's tail). Commit policy: raw stays gitignored;
sanitized commits with the rest of Phase 2 verification artifacts.

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
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { Buffer } from 'node:buffer';
import { ffmpegPreflight } from './lib/ffmpeg.js';
import { parsePhase0Exit } from './lib/phase-0-exit.js';
import { assertEnv } from './lib/env.js';
import { atomicWriteSync } from './lib/atomic-write.js';
import { trackSpendInputSeconds, assertWithinBudget } from './lib/cost-tracker.js';
import { pcmToWav, isValidWav } from './tts-clients/wav-utils.js';
import { BURNED_TRAILER_LINES } from '../src/lib/script.js';

const SOURCE_PATH = 'videos/trailer/sample-eval/r5-scream/source-recording.wav';
const OUTPUT_PATH = 'videos/trailer/public/audio/lines/s05-cue-2400-dash.wav';

function truncateVoiceId(id: string): string {
  return id.length <= 8 ? id : `${id.slice(0, 8)}...`;
}

function probeDuration(wavPath: string): number {
  const out = execFileSync('ffprobe', [
    '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', wavPath,
  ], { encoding: 'utf-8' });
  return parseFloat(out.trim());
}

async function main() {
  ffmpegPreflight();
  const cfg = parsePhase0Exit();

  if (cfg.r5Outcome !== 'kept-via-B') {
    throw new Error(
      `Path B hybrid invoked but PHASE-0-EXIT.md R5 outcome is ${cfg.r5Outcome}.\n` +
      `Run only when outcome = kept-via-B. For kept-via-A use Unit 2.2 (pnpm tts).`
    );
  }

  // DOC-REVIEW: per-cue budget check applies to Voice Changer paths too.
  await assertWithinBudget();

  if (!existsSync(SOURCE_PATH)) {
    throw new Error(
      `Path B source recording missing: ${SOURCE_PATH}\n` +
      `Per Phase 0 Unit 0.6 Path B recording specs:\n` +
      `  - 12-18" mic distance (phone) or 6"+ (laptop)\n` +
      `  - Multiple takes; select peak ~-3 dBFS\n` +
      `  - Length ~1.5s; "VERAAA!!!" pop instantly\n` +
      `  - Save as 48kHz / 16-bit / mono PCM WAV\n` +
      `Note: this file is GITIGNORED per .gitignore (Briggsy biometric voice data).`
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

  // DOC-REVIEW: measure source duration for per-second billing.
  const sourceDurationSec = probeDuration(SOURCE_PATH);
  const screamCue = BURNED_TRAILER_LINES.find((l) => l.id === 'S05-scream');
  if (!screamCue) throw new Error('S05-scream cue not found in BURNED_TRAILER_LINES');

  // Voice Changer endpoint
  const url = `https://api.elevenlabs.io/v1/speech-to-speech/${dashVoiceId}`;
  const formData = new FormData();
  formData.append('audio', new Blob([sourceBuf], { type: 'audio/wav' }), 'source.wav');
  formData.append('model_id', 'eleven_multilingual_sts_v2');
  formData.append('remove_background_noise', 'false');
  formData.append('output_format', 'pcm_48000');  // PCM output for direct pipeline compatibility

  console.log(`Voice Changer: source=${SOURCE_PATH} → target voice=${dashVoiceId}`);

  // Linear backoff per Phase 2 convention (3 attempts, 5s/10s/15s + jitter,
  // total ≤30s clamped per DOC-REVIEW).
  const MAX_RETRIES = 3;
  const BASE_DELAY_MS = 5000;
  let elapsedMs = 0;
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

      // DOC-REVIEW: Voice Changer bills per audio-input second.
      // Was previously absent from cost tracker → bypassed the spend ceiling.
      await trackSpendInputSeconds(
        screamCue,
        'elevenlabs-sts',
        sourceDurationSec,
        truncateVoiceId(dashVoiceId),
      );

      console.log(`OK ${OUTPUT_PATH} (${wavBuf.byteLength} bytes, ${sourceDurationSec.toFixed(2)}s billed)`);
      console.log('NEXT: pnpm tsx scripts/post-process-tts.ts (Unit 2.5 with scream-attack-preservation overrides)');
      return;
    }

    if (res.status === 401 || res.status === 403) {
      throw new Error(`Voice Changer auth failure ${res.status}: ${await res.text()}`);
    }
    if (res.status === 429 || res.status >= 500) {
      // DOC-REVIEW: clamp delay so total elapsed ≤30s including jitter.
      const rawDelay = BASE_DELAY_MS * attempt + Math.floor(Math.random() * 1000);
      const clampedDelay = Math.min(rawDelay, 30_000 - elapsedMs);
      if (clampedDelay <= 0) {
        throw new Error(`Voice Changer ${res.status}, retry budget exhausted`);
      }
      console.warn(`Voice Changer ${res.status}, retry ${attempt}/${MAX_RETRIES} in ${clampedDelay}ms`);
      if (attempt < MAX_RETRIES) await new Promise((r) => setTimeout(r, clampedDelay));
      elapsedMs += clampedDelay;
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
  invalidation** (sidecar `${wav}.meta.json` SHAs — text edits AND
  cadence-spec adapter edits AND priming-override edits auto-regen
  the affected cue without `--force`; the hash now includes adapter
  content SHA per DOC-REVIEW absorption). Atomic-write pattern
  survives mid-process crashes. Cumulative TTS spend tracked +
  hard-aborted at **$50 ceiling** (DOC-REVIEW R3: was $30 with
  `TTS_BUDGET_OVERRIDE` env-var footgun; $50 matches Phase 0 envelope,
  override deleted, check fires PER-CUE not once at startup). Voice
  Changer (Path B) bills per audio-input second via
  `trackSpendInputSeconds()`. WAV blobs + biometric scream source +
  actor PII gitignored at `videos/trailer/.gitignore` (asserted at
  preflight).
- **API surface parity:** None — Phase 2 produces audio assets, not
  user-facing surfaces. Manifest is internal to the trailer project.
- **Integration coverage:** Phase 0 Unit 0.5 spike validated the
  `<Audio>` import + `<Sequence>` placement pattern in MP4 export;
  Phase 4 inherits.
- **Unchanged invariants:** BURNED game code untouched. Phone bundle
  budget unaffected. Trailer project remains isolated.

**Cross-phase dependencies surfaced by Phase 2 deepening + doc-review
pass** (downstream phases must absorb during their own deepening passes):

- **Phase 0 amendment TRIGGERED** (DOC-REVIEW — one additive field
  per Phase 0's "add-only" template policy):
  - PHASE-0-EXIT.md Section 2 (R14 Cold-Open Line Disposition) now
    carries `Speaker voice ID` field so Phase 2 can generate the
    cold-open WAV without a Phase-2-owned voice-id-overrides file.
    Single source of truth (PHASE-0-EXIT.md) for all locked voice
    identifiers. Amendments-log entry: 2026-05-17 P2.34.
  - Phase 0's existing emission shape (`## Section N — <Name>
    Disposition` headers, `- Disposition:` field, human-readable
    Engine + clearedPath strings, `kept-A`/`kept-B` enums) is NOT
    changed — Phase 2's parser normalizes at parse time. Phase 0
    stays locked.

- **Phase 1: NO reopen triggered** (DOC-REVIEW correction):
  - Phase 1's locked `Line` type already ships 8 of the 9 fields the
    pre-doc-review Phase 2 draft called "follow-up amendments"
    (`cueType`, `expectedFrames`, `leadFramesHint`,
    `driftToleranceOverride`, `fadeInMs`, `fadeOutMs`,
    `skipSilenceremove`, `cadenceAdapter` — verified at
    `phase-1-beat-sheet-lock.md` Unit 1.2 lines 853-893).
  - Only `contextPrimingPrevious` / `contextPrimingNext` are genuine
    gaps. Phase 2 owns these via Phase-2-local
    `context-priming-overrides.json` config file (not a Phase 1
    Line-type extension). Cold-open priming engine-portable across
    ElevenLabs / Gemini / OpenAI.
  - Per-cue values (S04-payoff-a fadeInMs=5, S05-scream
    skipSilenceremove=true, S06-phrasing
    expectedFrames=27 + driftToleranceOverride=0.20, etc.) are
    READ from Phase 1's already-shipped Line records. If any of those
    values are missing in the actually-shipped `BURNED_TRAILER_LINES`,
    Unit 2.7 Step 2a's Phase 1 reopen procedure is the mechanism.
  - Frame numbering canonicalization is Phase 1's concern; Phase 2
    expects absolute frames and Unit 2.1 Step 1 shape-verification
    catches scene-relative leakage.
  - Beat encoding `[BEAT NNNms]` marker token format is consumed by
    Unit 2.6 stitch-beats; Phase 1 ships text containing these tokens
    on S03 cues per Phase 1 Unit 1.2 Step 4.

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
  - `AudioAsset.cueType` consumption for music-bed ducking decisions.
  - `AudioAsset.loudnessLufs` carried for Phase 6 QA tooling.

- **Phase 5 deepening must absorb:**
  - Phase 5 ships `gameplay.mp4` AUDIO-STRIPPED (`ffmpeg -an`) for
    belt-and-suspenders with Phase 4's `muted` prop. Per Phase 1
    deepening, Phase 5 also ships `gameplay-markers.json` declaring
    in-point + BURNED-draw-marker frame — Phase 2 doesn't consume
    directly but the scream cue 2400 placement depends on Phase 4
    trimming gameplay so BURNED draw lands at scene-relative frame
    160 (per Phase 1 Unit 1.2 Step 6).

- **Phase 6 deepening must absorb (DOC-REVIEW addition):**
  - Loudness QA reads `loudness-audit.jsonl` + `AudioAsset.loudnessLufs`;
    integrated loudness must land within ±1 LU of -16 LUFS per cue.
  - `generation-log.jsonl` `voiceIdPrefix` field is the 8-char
    truncated prefix — Phase 6 retrospective analytics aggregate by
    voice cell, not by full ID.
  - ElevenLabs v3 alpha-deprecation contingency: if v3 sunsets
    pre-Phase-6, locked WAVs in `public/audio/lines/` ship as-is from
    `raw/` archive — regen capability NOT presumed.

- **Phase 7:** No new Phase 2 deps surfaced.

---

## Risks & Dependencies (DEEPENING — refined with multi-agent findings)

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **`SCRIPT_CUES` / `BURNED_TRAILER_LINES` contract drift** | Resolved (deepening + DOC-REVIEW) | Very High (ships wrong narration) | Unit 2.1 deepening GUTTED `script-lines.ts` at the header level; doc-review pass rewrote the 5 code blocks (Units 2.4/2.5/2.6/2.7/2.8) that STILL imported from the deleted file. Phase 2 now consumes Phase 1's `BURNED_TRAILER_LINES` directly via `cueFilename()` helper; `script-coverage.test.ts` asserts post-pipeline WAV coverage. |
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
| **PHASE-0-EXIT.md parsing fragility / contract mismatch** | Resolved (DOC-REVIEW) | High (every Phase 2 script failed on first invocation) | Unit 2.0 parser rewritten to consume Phase 0's actual emission shape (`## Section N — <Name> Disposition` headers, `- Disposition:` field names, human-readable Engine + clearedPath strings normalized to short enums at parse time, `kept-A`/`kept-B` → `kept-via-A`/`kept-via-B`). Phase 0 P2.34 amendment added "Speaker voice ID" field to Section 2 (additive only). |
| **ElevenLabs v3 alpha access missing / OpenAI snapshot sunset** | Resolved (DOC-REVIEW R5) | Very High (locked engine unusable; trailer audio undeliverable) | Unit 2.0 Step 10 NEW — `verifyEngineAvailability()` HEAD `/v1/models` (free metadata endpoint) before any paid TTS call; asserts locked `modelId` is listed for the API key in use. Catches alpha-access-missing + sunset-snapshot failure modes at preflight. Plus: Phase 2 archives raw API responses to `public/audio/lines/raw/` (immutable). If v3 deprecates between Phase 2 close and Phase 6 distribution, locked WAVs ship from `raw/` — regen capability NOT presumed post-close. |
| **Phase 1 follow-up amendments misattributed** | Resolved (DOC-REVIEW) | Medium (Phase 2 code referenced "amendments" that Phase 1 already shipped) | Unit 2.1 Step 4 rewritten: Phase 1's locked plan already ships 8 of the 9 proposed fields (`cueType`, `expectedFrames`, `leadFramesHint`, `driftToleranceOverride`, `fadeInMs`, `fadeOutMs`, `skipSilenceremove`, `cadenceAdapter` — verified at `phase-1-beat-sheet-lock.md` lines 853-893). Only `contextPrimingPrevious`/`Next` are genuine gaps, owned by Phase 2 via `context-priming-overrides.json` (no Phase 1 reopen). |
| **Phase 1 reopen ceremony for routine drift** | Resolved (deepening) | Medium | Unit 2.7 three-tier escalation ladder — Tier 0 (silent absorb) and Tier 1 (Phase 2 regen) handle 90%+ of drift cases without Phase 1 reopen. Expected ±3-7% per cue absorbed silently. |
| **Hash-based skip miss on text edit** | Resolved (deepening) | Medium | Unit 2.2 hash-based invalidation (sidecar `${wav}.meta.json`) — stale WAVs auto-regen on text edit without `--force`. |
| **Cumulative TTS spend exceeds ceiling silently** | Resolved (DOC-REVIEW) | Low | Unit 2.2 Step 7 cumulative spend tracker (`tts-spend.json`) with hard abort; ceiling lifted from $30 → $50 (matches Phase 0 envelope); `TTS_BUDGET_OVERRIDE` env var DELETED (was autonomy-paradox footgun). Check fires PER-CUE inside the generation loop (was a defect: only at startup). Voice Changer (Path B) bills per audio-input second via `trackSpendInputSeconds()` — previously absent → bypassed ceiling silently. |
| **Cold-open speaker single-line context starvation** | Resolved (DOC-REVIEW R6) | Medium (generic-sounding cold-open) | Phase 2-owned `context-priming-overrides.json` maps cueId → `{previous?, next?}`. ElevenLabs path uses `previous_text`/`next_text` body fields. Gemini path appends priming inside Director's Chair `### TRANSCRIPT` section + FFmpeg `-ss` post-gen trim. OpenAI path embeds examples in `instructions` parameter. Engine-portable, not ElevenLabs-locked. |
| **R5 cut after Unit 2.4 began** | Low | Low | Skip scream cue; AUDIO_ASSETS reflects absence; no orphan WAV; manifest typechecks at both branches. |
| **Path D voice-actor delivery handling absent** | Resolved (deepening) | High (executor-paralysis if Path D wins) | Unit 2.X NEW — Path D Voice-Actor WAV Ingestion. Triggers if PHASE-0-EXIT.md locks engine=voice-actor; skips Units 2.2-2.4; routes through Unit 2.5 post-processing. |
| **Path B hybrid scream handling absent** | Resolved (deepening) | Medium | Unit 2.Y NEW — Path B Hybrid Scream Voice Changer. Triggers if R5 outcome = kept-via-B; replaces Path A `[shouts]` generation for cue 2400. |
| **VOICE_DIRECTION anti-pattern reintroduced by future agent** | Low (codified per-engine guards) | Very high | Three per-engine guard variants inline at each engine client's API call site (per Phase 0 Unit 0.2 Key Tech Decisions). Lint-grep follow-up: assert all three guards exist in source. |
| **`.env` not present at script invocation** | Low | Low | Unit 2.0 preflight verifies per-engine keys present per locked engine before any API call. |
| **Shell-injection regression in FFmpeg invocations** | Low (project-wide rule) | High (security) | All Phase 2 scripts use `execFileSync` with argv arrays; `security_reminder_hook` enforces the convention. |
| **Mid-session model version drift (engine API rolls between canary + batch)** | Medium | High (silent cadence shift) | Unit 2.3 records `modelId` + cadence-spec adapter SHA + engine response revision header; Unit 2.4.5 post-batch re-canary detects drift. |
| **Trailer subproject scaffold not present (Phase 0 hasn't run)** | Current state until Phase 0/1 execute (DOC-REVIEW reclassified — Low was wrong; the trailer subproject does NOT yet exist in the repo) | Very High (every Phase 2 script fails) | Unit 2.0 preflight Step 1 verifies trailer scaffold (package.json + .gitignore + script.ts + timing.ts + BEAT-SHEET.md + PHASE-0-EXIT.md + cadence-spec.md) exist with clear fail-fast errors pointing to Phase 0/1. Node ≥20.0.0 + `.gitignore` patterns asserted. |
| **WAV blobs / actor PII / Briggsy biometric leak into git history** | Resolved (DOC-REVIEW) | Medium (privacy + repo bloat) | `videos/trailer/.gitignore` REQUIRED + asserted at preflight. Excludes `public/audio/lines/*.wav`, `public/audio/lines/raw/*.wav`, `sample-eval/r5-scream/source-recording.wav` (Briggsy biometric), `sample-eval/voice-actor-delivery/raw/`, `path-d-manifest.json` (actor PII), `tts-spend.json`. Sanitized `path-d-manifest.sanitized.json` commits without identity fields. Voice IDs in committed artifacts are 8-char prefixes, not full identifiers. |
| **FFmpeg concat-list path break on Windows** | Resolved (DOC-REVIEW) | High (silent wrong-file selection by concat demuxer) | Stitch scripts normalize paths to forward-slash before serializing concat-list (`toFFmpegPath()` helper). FFmpeg concat demuxer treats `\` as escape character on Windows path.join output without normalization. |
| **Concurrent stitch runs clobber temp concat-list** | Resolved (DOC-REVIEW) | Low | Per-invocation unique temp filename (`tmp/concat-list-${cueId}-${Date.now()}-${process.pid}.txt`) in OS temp dir. Was hardcoded `temp-concat-list.txt` in `linesDir` — parallel `--only` agent runs would have clobbered. |
| **Cadence-spec adapter edits silently ignored by hash skip** | Resolved (DOC-REVIEW) | Medium (stale WAVs treated as fresh after adapter edit) | `hashCueInputs()` now includes adapter content SHA. `voice_settings` edits in `cadence-spec-elevenlabs.json` (or analog) auto-invalidate cached WAVs. Documentation in `Documentation/Operational Notes` updated to match. |
| **Production sign-off panel sizing** | Resolved (DOC-REVIEW R2 CORRECTED 2026-05-22) | High (audible identity drift hits trailer audience first) | Unit 2.7 sign-off is **N=1 (Briggsy)** — production-cert standard. Earlier R2 wording locked N=2 with Harry as outside reviewer on the false premise that Harry was human; Harry is AI. Team is just Briggsy + Claude(s) forever, so multi-person human panels are structurally unavailable. The "Phase 0 R4 N=6 panel" comparison was always theoretical — Phase 0 EXIT confirms that panel never ran, only deferred to Phase 6 ADR #21 (also amended). Sentinel written when Briggsy's verdict is "accepted." Cross-ref: memory `feedback-listener-panels-default-to-n1.md`. |
| **Three-client build cost vs single-engine commitment** | Resolved (DOC-REVIEW R4) | Low (procedural completionism, not correctness) | Build ONLY the engine PHASE-0-EXIT.md locks. Other engine clients re-implement on-demand if locked engine sunsets (Phase 1 reopen picks new engine anyway). Saves ~6-10 hours plan-execution. Files list updated. |
| **Cue 1950 4-word payoff is wrong canary for Sterling-CODED register validation** | Resolved (DOC-REVIEW R1) | High (silent register drift in production) | Unit 2.3 canary swapped from cue 1950 (4-word payoff at 1.6-1.8 wps) to S04-htp-1 (sustained cascade line ≥10s). Register dimensions need ≥8-10s sustained speech to manifest. Cue 1950 audited post-batch via Unit 2.4.5 re-canary instead. |

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
- **Cumulative TTS spend tracker** with hard abort at $50 ceiling
  (DOC-REVIEW R3: was $30 with `TTS_BUDGET_OVERRIDE` env-var footgun;
  $50 matches Phase 0 envelope; override deleted). Check fires
  PER-CUE inside the generation loop. Voice Changer (Path B) bills
  per audio-input second via `trackSpendInputSeconds()`.
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
  / scream ±20%; tolerance read from per-Line `cueType` field
  (DOC-REVIEW correction — Phase 1 already ships this field; not a
  follow-up amendment).
- **Per-cue fade-in/fade-out shape overrides**: default 30ms/30ms;
  S04 payoff 1950 fadeInMs=5; S06 phrasing 2790 fadeOutMs=50;
  scream 2400 fadeInMs=0 + curve=qsin.
- **Scream-attack preservation**: SKIP silenceremove for cue 2400
  entirely; preserve attack envelope.
- **Audio lead-frames hint** added to AudioAsset for perceptual A/V
  sync; payoff 1950 leadFramesHint=2; scream 2400 leadFramesHint=1.
- **"Phrasing." cue expectedFrames** corrected 12 → 27 (Sterling-
  CODED deliberate delivery; ~0.9s for a 1-word expressive beat).
  DOC-REVIEW note: the 1.6-1.8 wps payoff band is calibrated for
  multi-word payoffs; single-word expressive cues (like "...Phrasing.")
  are out-of-distribution for the band model — covered by
  `driftToleranceOverride: 0.20` per Phase 1 ship.
- **Hallucinated "UMB v3 audio processing pipeline" reference**
  removed (Unit 2.5 patterns); UMB has NO post-processing pipeline.

### Resolved During Doc-Review Pass (2026-05-17)

- **R1 — Canary cue swap**: S04-htp-1 (sustained cascade) replaces
  cue 1950 as the Dash register-validation canary. Cue 1950 audited
  post-batch via Unit 2.4.5 re-canary.
- **R2 — Full-audio.wav sign-off panel size** (CORRECTED 2026-05-22):
  **N=1 (Briggsy) — production-cert standard.** Earlier R2 wording
  locked N=2 with Harry as outside reviewer on the false premise that
  Harry was a human listener. Harry is AI; team is just Briggsy +
  Claude(s) forever. Escalation-to-N=6 branch also deleted (Phase 0
  EXIT confirms that panel never ran, only deferred). Phase 6 ADR #21
  amended the same way.
- **R3 — Budget paradox resolved**: $30 ceiling → $50 ceiling;
  `TTS_BUDGET_OVERRIDE` env var DELETED. Per-cue budget check inside
  loop (not once at startup). Voice Changer per-second billing via
  `trackSpendInputSeconds()`.
- **R4 — Single-engine commitment**: build ONLY the
  PHASE-0-EXIT.md-locked engine client; other engines re-implement
  on-demand if locked engine sunsets.
- **R5 — ElevenLabs v3 alpha deprecation contingency**: archive raw
  API responses to `public/audio/lines/raw/`; if v3 sunsets between
  Phase 2 close and Phase 6 distribution, locked WAVs ship from raw
  archive — regen capability NOT presumed post-close. Plus Unit 2.0
  Step 10 NEW: `verifyEngineAvailability()` HEAD `/v1/models`
  preflight catches alpha-access gap before paid TTS call.
- **R6 — Cold-open priming engine-portable**: Phase 2-owned
  `context-priming-overrides.json` consumed by all engine clients;
  ElevenLabs uses `previous_text`/`next_text`, Gemini appends inside
  Director's Chair `### TRANSCRIPT`, OpenAI embeds examples in
  `instructions`.
- **Phase 0 ↔ Phase 2 parser contract**: Phase 2 parser rewritten to
  consume Phase 0's actual emission shape (section headers, field
  names, engine value, clearedPath enum, R5 outcome enum, single
  Voice ID field). One Phase 0 amendment triggered (Section 2
  `Speaker voice ID` field added — additive only).
- **Phase 1 "follow-up amendments" inventory corrected**: Phase 1
  already ships 8 of 9 fields the pre-doc-review draft claimed were
  amendments. Only `contextPrimingPrevious`/`Next` are genuine gaps;
  Phase 2 owns those via local config (no Phase 1 reopen).
- **`generateForCue` engine arg + per-cue budget check + adapter SHA
  in hash + Accept header removed + linear backoff clamp + SSoT
  override requires --only + voice ID truncation + Windows path
  normalization + per-invocation temp file**: all mechanical fixes
  absorbed in respective unit code blocks.
- **All five units (2.4 / 2.5 / 2.6 / 2.7 / 2.8) rewritten** to
  consume `BURNED_TRAILER_LINES` + `cueFilename()` (was importing
  deleted `script-lines.ts`). Dead `voice === 'dash-scream'` checks
  replaced with `cue.cueType` / `cue.skipSilenceremove` reads.
- **Unit 2.5 post-process body rewritten** to match the deepening
  header amendments: two-pass loudnorm at -16 LUFS, areverse-sandwich
  silenceremove, per-cue afade from Line.fadeInMs/fadeOutMs, mono
  lock, atomic-write idempotence sentinel. (Body had still been
  running the broken single-pass -23 LUFS pattern the header flagged
  as defective.)
- **Unit 2.6 engine routing table** corrected: ALL engines route
  intra-line beats through FFmpeg silence stitch (inline-tag rows
  deleted; ElevenLabs `[pause:600ms]` + Gemini SSML `<break>` do
  NOT exist in the locked engine versions).
- **Unit 2.3 Likert rubric** populated: 5-point Register / Pace /
  Volume / Articulation per dimension; <4 routes to fail-action.
  Sign-off filenames match `cueFilename()` output.
- **Unit 2.X / 2.Y conditional units**: Path D scaffold step + sanitized
  manifest split (actor PII gitignored); Path B Voice Changer spend
  tracking via `trackSpendInputSeconds()` + biometric source recording
  gitignored.

### Deferred to Implementation (post-doc-review minimum set)

- **Specific ElevenLabs voice_settings numeric tuning** (stability /
  similarity / style values within the per-engine adapter JSON):
  Phase 0 Unit 0.2 chose engine + path; specific numeric values per
  voice may need re-tuning in Unit 2.3 canary structured rubric.
- **Cold-open priming corpus exact source**: `context-priming-overrides.json`
  for `S01-coldopen` references "Phase 0 cadence-spec sample
  paragraph 1, last 2-3 sentences" — the actual sentence selection
  happens at execution time once Phase 0 cadence-spec.md exists.
- **Recovery-path semantics if cadence-spec adapter SHA in sentinel is
  stale**: Unit 2.4 currently asserts sentinel existence; future
  hardening could compare sentinel adapter-SHA vs current adapter
  content and auto-invalidate the canary sign-off on mismatch. Not
  blocking — `pnpm tts:force` is the manual escape.

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
  `sample-eval/voice-pipeline/tts-spend.json` (machine-readable JSONL,
  GITIGNORED per .gitignore) + per-run human-readable summary in
  `sample-eval/voice-pipeline/generation-log.md`. **Hard abort at $50
  ceiling** (DOC-REVIEW R3 — was $30 with override env-var footgun).
  No `TTS_BUDGET_OVERRIDE` env var — extension is a one-line edit to
  `HARD_CEILING_USD` in `scripts/lib/cost-tracker.ts`, atomic intent
  traced in git history. Check fires PER-CUE inside the generation
  loop. Voice Changer (Path B) bills per audio-input second via
  `trackSpendInputSeconds()`. Voice IDs in committed JSONL log are
  8-char prefixes (not full account-scoped identifiers).
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

- **`.gitignore` policy (DOC-REVIEW)** — `videos/trailer/.gitignore`
  is asserted at preflight and MUST exclude:
  - `public/audio/lines/*.wav` — generated TTS output (binary blobs,
    re-derivable).
  - `public/audio/lines/raw/` — pre-post-process WAV archive (binary
    blobs, also serves as the post-deprecation source-of-truth per
    DOC-REVIEW R5).
  - `sample-eval/r5-scream/source-recording.wav` — **Briggsy biometric
    voice data**. Path B Voice Changer source recording; treated as
    privileged biometric per data-handling discipline.
  - `sample-eval/voice-actor-delivery/raw/` — actor-delivered WAV
    blobs; possibly multi-take, possibly large.
  - `sample-eval/voice-actor-delivery/path-d-manifest.json` — RAW actor
    PII manifest (name, agency, delivery timestamps, notes). The
    sanitized version (`path-d-manifest.sanitized.json`) carries only
    cueId → ingest state; commits with the rest of Phase 2 verification
    artifacts.
  - `sample-eval/voice-pipeline/tts-spend.json` — cumulative spend log
    with account-scoped voice ID prefixes; not committed.

- **Sterling-CODED voice rule (ADR #13 honored, DOC-REVIEW R6
  reinforced)**: cadence mimicry via per-engine adapter steering,
  NEVER Benjamin-cloned identity. Cold-open priming corpus
  (`context-priming-overrides.json`) draws from Phase 0 cadence-spec
  sample paragraphs — internally-generated reference text, NOT
  third-party actor recordings.

- **Production sign-off panel (DOC-REVIEW R2 CORRECTED 2026-05-22)**:
  full-audio.wav sign-off is **N=1 (Briggsy) — production-cert
  standard.** Earlier wording locked N=2 with Harry as outside
  reviewer on the false premise that Harry was human. Harry is AI;
  team is just Briggsy + Claude(s) forever. Escalation-to-N=6 branch
  deleted (Phase 0 EXIT confirms that panel was never run, only
  deferred to Phase 6 ADR #21 which is also amended). Sentinel
  `phase-1-reconciliation-signoff.txt` written when Briggsy's verdict
  is "accepted."

- **ElevenLabs v3 alpha portability (DOC-REVIEW R5)**: `eleven_v3`
  is alpha; Phase 2 archives raw API responses to
  `public/audio/lines/raw/`. If v3 deprecates between Phase 2 close
  and Phase 6 distribution, the post-processed WAVs in
  `public/audio/lines/` continue shipping unchanged (immutable),
  and `raw/` is the fallback if re-post-processing becomes needed.
  Regen capability NOT presumed post-Phase-2-close.

- **Windows portability (DOC-REVIEW)**: FFmpeg concat-list paths use
  `toFFmpegPath()` forward-slash normalization (Briggsy is on Windows
  11 per `CLAUDE.md`; `path.join` produces backslash paths that the
  concat demuxer interprets as escapes). Per-invocation temp paths
  live in OS temp dir (`tmpdir()`) with `${Date.now()}-${process.pid}`
  uniqueness to prevent concurrent-run clobber.

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
- `user_harry.md` — Harry is AI (OpenClaw / Claude Code instance via
  Discord). Cannot serve as a human listener. DOC-REVIEW R2 was
  corrected 2026-05-22 to N=1 Briggsy production-cert standard;
  Harry no longer load-bearing in Unit 2.7 sign-off.
- `feedback-listener-panels-default-to-n1.md` — team is just Briggsy +
  Claude(s) forever; multi-person human panels structurally
  unavailable. Drives R2 correction.

**Doc-review pass artifacts (2026-05-17):**
- 7-persona parallel review: coherence + feasibility + product-lens +
  design-lens + security-lens + scope-guardian +
  adversarial-document-reviewer (via
  `compound-engineering:document-review` skill).
- Cross-phase verification reads against
  `phase-1-beat-sheet-lock.md` lines 853-893 (Line type field
  inventory) and `phase-0-gate-resolution.md` lines 2914-3028
  (PHASE-0-EXIT.md template).
- Phase 0 P2.34 amendment (additive Section 2 "Speaker voice ID"
  field) recorded in Phase 0's amendments log.
- ElevenLabs v3 alpha status verified via
  https://elevenlabs.io/blog/eleven-v3 (alpha access required).
- OpenAI gpt-4o-mini-tts model availability verified at
  https://platform.openai.com/docs/models/gpt-4o-mini-tts (alias
  vs snapshot pins).
- Briggsy autonomy rule (`~/.claude/CLAUDE.md` §Autonomy) drove
  R3 budget paradox resolution.
- BURNED visual-asset / biometric data discipline (project memory
  §Biometric source recordings) drove the .gitignore policy
  expansion.
