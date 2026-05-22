# BURNED — TODO

Operator's queue. Actionable items only. **Not a diary** — git log has
the history. (Rule: `feedback-todo-is-not-a-diary.md`.)

---

## 1. Active priorities

### Status (verified 2026-05-22 — Phase 2 Unit 2.7 Tier-2 + Tier-4 LANDED; trailer reauthored 95s→106s)

- Tests: **1407 pass** | 6 expected fail (68/68 files green)
- Trailer subpackage tests: **194 pass | 0 expected-fail** (8 files;
  script-coverage drift gate is fully green — every cue has a WAV,
  16/16 rendered)
- Typecheck: clean (`pnpm typecheck` root + `videos/trailer/`)
- Phone player entry: **19.17 KB gz** (no regression from Phase 2 work)
- DramaOverlay lazy chunk: **2.34 KB gz**
- HOW-TO-PLAY bundle: `howtoplay-*.js` **33.90 KB gz** + `howtoplay-*.css`
  **10.68 KB gz** + shared GSAP chunk **27.21 KB gz**
- Protocol version: **v6**
- Phase 2 ElevenLabs spend cumulative: **$0.87 / $50** ceiling (Unit 2.4
  full render of 13 remaining cues + S06-phrasing `[excited]` retune
  + Unit 2.6 three stitch iterations = 21 segment renders @ ~$0.01
  each; came in at <2% of the $50 envelope — Creator-tier monthly
  quota absorbing most of it)

### Origin trailer

Plans (8) drafted, deepened, document-reviewed at
`docs/plans/origin-trailer/` (phase-0 through phase-7 + `roadmap.md`
ADR ledger). Sequential phase execution.

**Phase 0 — ✅ CLOSED 2026-05-18.** EXIT doc + signoff:
`videos/trailer/PHASE-0-EXIT.md` +
`videos/trailer/sample-eval/PHASE-0-EXIT.signoff`. Locks: Dash voice
(Roger / ElevenLabs eleven_v3) · Janet voice (Sloane Shared Library /
matriarch-tuned) · S01 cold-open line (#4 "He's a machine, this kid…")
· Sterling scream (Path A v3 `VEEEEEEEERAAAA!!!`) · played-straight
tone (earned-Phrasing! mechanic) · composite viability (all 5 Remotion
integration points).

**Phase 1 — ✅ CLOSED 2026-05-18.** Signoff `3aef0d05` (delegated
attestation per ADR #22 variant — Briggsy approved disposition via
close-or-pause prompt, no line-by-line review; rationale in sentinel
body). BEAT-SHEET.md sha256 captured at signoff:
`fd662581c2aafdc40b93687e347a26d3da5d338d7752570b198d7389ece54c13`.
Frozen as Phase 2/3/4 consumption contract.

**Phase 2 — IN-FLIGHT.** Voice pipeline. Plan at
`docs/plans/origin-trailer/phase-2-voice-pipeline.md`.

**Units 2.0-2.3 LANDED 2026-05-19** (commit pending — see git log):
- **Unit 2.0** Preflight scaffold (env / ffmpeg / phase-0-exit parser /
  live model API check). `pnpm preflight:phase2` green.
- **Unit 2.1** Phase 1 `BURNED_TRAILER_LINES` contract consumed +
  `cueFilename` helper + `script-coverage.test.ts` drift gate.
- **Unit 2.2** `generate-dash-tts.ts` production script + ElevenLabs v3
  client + cost tracker + hash-based skip/regen + atomic writes +
  MP3-to-48kHz-mono-PCM-WAV converter inside the client (Creator tier
  doesn't allow PCM output_format).
- **Unit 2.3** Canary cleared:
  - Dash arrogant-Sterling retune locked (Roger voice_settings:
    `stability 0.55 / style 0.35 / speed 0.95` in
    `cadence-spec-elevenlabs.json`); prefix tag `[deadpan]` → `[sarcastic]`
    on all non-scream cues.
  - Janet voice swap locked (Sloane → **Eleanor – Gracious and
    Authoritative**, `2qQJWjw5XdG80GreshqG`, British Shared Library)
    + matriarch-cunty settings (`stability 0.40 / style 0.45 / speed
    0.85` in `COLD_OPEN_SPEAKER.voiceSettings`). Brief: Jessica-Walter-
    Mallory-Archer DNA — "always drinking but you'd never know it" +
    Q-from-Bond cadence + experienced-not-frail.
  - Scream cue isolated from Roger retune via per-`[shouts]`-cue
    voice-settings override in `tts-clients/elevenlabs.ts` (preserves
    Phase 0 Unit 0.6 audited Sterling-LANA shape).
  - Eleanor render verified clean by Briggsy ("s01 — that's clean").

**Unit 2.4 LANDED 2026-05-21** (commit pending — see git log):
- Full TTS render of 13 remaining Dash cues — all 16/16 WAVs now on
  disk at `videos/trailer/public/audio/lines/`.
- New `scripts/audit-durations.ts` per plan Step 2 (rename target was
  `audit-durations.ts` not the working name I picked at first). Writes
  `sample-eval/voice-pipeline/duration-reconciliation.md` + exits 2 on
  missing WAV / 3 on tolerance drift / 0 clean. 30 fps composition.
- **S06-phrasing `[excited]` retune locked.** New
  `PHRASING_INTERJECTIVE_SETTINGS` const in
  `scripts/tts-clients/elevenlabs.ts` (`stab 0.30 / style 0.65 / speed
  1.05`); resolver branches on `cadencePrefixTag === '[excited]' &&
  voice === 'dash'`. Reads as the snappy rise-on-`Phra-`/fall-on-
  `-sing.` callback Sterling-CODED cadence, not the arrogant-Sterling
  briefer drawl. Briggsy: "phrasing landed!"
- Audit reports 14/16 cues outside per-cueType tolerance. **NOT a
  blocker** — routing per plan:
  - **S03-roster (+102.6%) + S03-deck (+114.4%):** v3 receives
    `[BEAT 0.3s]` markers verbatim and inserts ~3s silent pauses per
    token (Briggsy confirmed via listening — tokens are NOT read aloud
    as text). Resolves in Unit 2.6 BEAT-extraction (split on
    `\[BEAT \d+(\.\d+)?s\]`, render segments, stitch FFmpeg silence).
  - **S06-phrasing (+200% post-retune):** 1.6s → 1.2s post-retune.
    Mostly leading/trailing silence — Unit 2.5 silenceremove will trim
    toward the 0.9s target.
  - **S05-scream (+44%):** by design — `skipSilenceremove: true`
    preserves the Sterling-LANA held-vowel tail.
  - **S05-gameplay-vo (-21.3%) + S06-close (-27.5%):** v3 reads faster
    than Phase 1's 1.9–2.4 wps budget assumed. Unit 2.7 reconciliation
    territory — amend `expectedFrames` OR trim text.
  - **S04 list cues (+10-18%):** arrogant-Sterling `style=0.35` produces
    slightly slower paced reads than the deadpan-tight budget. Unit 2.7
    territory.
  - **S01 / S04-cue-01 / S04-stat-04 (within 5-8%):** noise.

**Unit 2.5 LANDED 2026-05-21** (commit pending — see git log):
- `scripts/post-process-tts.ts` — two-pass loudnorm (-16 LUFS / LRA 9
  / TP -1.5 dBTP) + areverse-sandwich silenceremove + per-cue
  `afade` + `-ac 1` mono lock + 48 kHz / pcm_s16le. Raw originals
  preserved in `public/audio/lines/raw/`; processed versions written
  atomically to in-place location.
- New `runFFmpegJson` helper in `scripts/lib/ffmpeg.ts` — uses
  `spawnSync` to capture loudnorm's stderr JSON block (execFileSync
  only returns stdout).
- Idempotence sentinel `${final}.processed` stores
  `sha256(rawMtime + cueType + fadeInMs + fadeOutMs +
  skipSilenceremove + LUFS targets)`. Re-running skips no-op work.
- Threshold rule per plan: `-30dB` for payoff cueType (more
  aggressive trim for one-liner punchlines — Phrasing, S04-payoff,
  S06-close), `-50dB` for paced cues (sustained, list, cold-open).
  Scream cue is skipped entirely via `cue.skipSilenceremove`.
- **Phrasing! locked at 0.63s** (post-process). 1.2s raw → 0.63s
  trimmed. Briggsy: "lock it." Tighter than the "0.9s feels right"
  gut call but read cleanly.
- New `pnpm post-process` + `pnpm audit:durations` scripts in
  `videos/trailer/package.json`.
- Loudness audit (`sample-eval/voice-pipeline/loudness-audit.jsonl`)
  reports 3 short-cue drifts (s04-cue-1050, s04-cue-1560, s04-payoff)
  at ~1.2-2.0 LU off -16 LUFS — KNOWN limitation of loudnorm on
  clips <3s per k.ylo.ph/loudnorm.html. Acceptable for Phase 4
  consumption.

**Unit 2.6 LANDED 2026-05-21** (commit pending — see git log):
- `scripts/stitch-beats.ts` — parses `[BEAT N.Ns]` AND `[BEAT NNNms]`
  formats (Phase 2 plan deepening claimed `ms` form but Phase 1
  actually ships decimal-second — regex handles both). Splits text on
  markers, renders each segment via `generateForCue`, generates
  `anullsrc` mono silence WAVs at declared durations, FFmpeg-concats
  to a single stitched WAV in `public/audio/lines/raw/`. Sentinel
  invalidation auto-triggers post-process re-run on the affected cue.
- Per-segment leading + trailing silence trim BEFORE the concat
  (separate from Unit 2.5's whole-WAV trim). `start_silence=0.005` ms
  cushion (NOT 50ms like Unit 2.5) — INSIDE a stitch the inserted
  anullsrc IS the cushion; per-segment cushion would compound with
  the inserted gap and blow the ±15ms position tolerance.
- `scripts/audit-stitch-positions.ts` — FFmpeg `silencedetect`
  verification of declared vs detected silence DURATIONS per cue;
  ±15ms tolerance per Phase 2 plan Unit 2.6 Step 3.
- **Verification: all 5 declared beats land within 0-4ms of
  declared** (3 in S03-roster @ 0.3s each, 2 in S03-deck @ 0.4s +
  0.3s). Briggsy listen test cleared 2026-05-21.
- 21 segment renders across 3 stitch iterations (first run revealed
  per-segment trim needed; second iteration's 50ms cushion blew
  tolerance; third iteration's 5ms cushion landed). Cumulative
  spend on Unit 2.6: ~$0.33.
- New `pnpm stitch:beats` + `pnpm audit:stitch-positions` scripts.

**Unit 2.7 — IN-FLIGHT.** Phase 1 reconciliation. The drift cluster from
Unit 2.4/2.5/2.6 audits points to a SYSTEMIC pace mismatch — Dash's
arrogant-Sterling delivery at `style=0.35 / speed=0.95` produces
~2.2-2.4 wps natural pace, vs Phase 1's deadpan-tight 3.89 wps
budget. Affected cues + per-cue disposition:
  - **S03-roster** — **Tier-2 trim LANDED 2026-05-22.** A/B-tested 3 variants
    (V1 trim + current speed / V2 full + speed 1.05 / V3 trim + speed 1.05);
    speed-bump bought ~0% (Eleven v3 `speed` affects phoneme stretch, not
    pace). Briggsy picked V1. Dropped "Six expense reports, all classified."
    sentence. New actual 13.57s vs 9.0s budget (+50.7%, was +95.9%).
    Residual +4.2s overrun queued for Tier-3/4 reconciliation.
  - **S03-deck** — **Tier-0 absorb LOCKED 2026-05-22.** Briggsy "keep, it's
    great." 12.06s vs 6.0s (+101.1%) accepted as-is.
  - **S04-cue-03** — **Tier-2 rewrite LANDED 2026-05-22.** Shifted "Drafted
    on weekends, by a field asset — name redacted for compliance." →
    "Drafted at three AM, name redacted for compliance." New actual 4.40s
    vs 3.0s budget (+46.7%, was +83.3%); saved 1.1s.
  - **Tier-4 TOTAL_FRAMES expansion LANDED 2026-05-22.** 2850 → 3180
    (+330f / 95s → 106s). S03_END 1050 → 1380 (absorbs +319f Sterling-read
    overrun + 11f cushion). S04/S05/S06 boundaries + STACKED_PAYOFF +
    PAYOFF_VO_END + music-duck constants all shifted +330. script.ts
    cue.frame for all S03-deck + S04+ + S05+ + S06+ cues shifted to match.
    13 WAV files renamed to new frame-derived filenames. timing.test.ts
    invariants re-asserted at new values. transitions.ts SCENE_TRANSITIONS
    + comment refs updated. BEAT-SHEET.md largely synced (runtime header,
    scene table, music cue table, S04 detailed beat table, R15 stamp
    positions, all "frame NNNN" references). All Tier-2/Tier-4 residual
    S04 list cluster (+10-18%) + S05/S06 undershoots are Tier-0 absorbed
    by the expanded cascade flex (math: S04 +88f against S05 -32f + S06
    -58f undershoots = net -2f flex absorbed).
  - **Tier-0 absorb for S04 list cluster LOCKED 2026-05-22:** cue-02
    (+17.8%), stat-01 (+14.2%), stat-03 (+10.8%), payoff (+5.0%) — all
    accepted; cumulative net absorbed by S05/S06 undershoots.
  - S04-stat-02 (+1.3% OK) — Tier-0 trivially.
  - S05-gameplay-vo (-21.3% — runs FAST; provides cascade flex).
  - S05-scream (+44%) — by design, skipSilenceremove preserves
    Sterling-LANA tail.
  - S06-close (-29.3% — provides closing-card breathing room).
  - S06-phrasing (+58.3% but Briggsy-locked at 0.63s).

  **Remaining Unit 2.7 work:**
  - Aux-doc Tier-4 sync follow-up (deferred this commit due to Edit-tool
    Read-first requirement burning context): `briefing-room-comp.md`,
    `cascade-composition.md`, `music-sourcing.md`, `script-word-count.md`
    in `videos/trailer/sample-eval/beat-sheet/` ALL still reference old
    pre-Tier-4 frame numbers throughout. Mechanical sweep: shift every
    S03_END/S04+/S05+/S06+ frame by +330 (or by +137 for S03-deck
    specifically); shift STACKED_PAYOFF (1950→2280), PAYOFF_VO_END
    (2010→2340), music-duck (1980→2310). Read each file first then
    batch Edit. ~30 mechanical edits per file. No test impact; pure
    doc-drift. Map: 1050→1380, 1110→1440, 1200→1530, 1290→1620,
    1410→1740, 1560→1890, 1680→2010, 1860→2190, 1950→2280, 1980→2310,
    2010→2340, 2040→2370, 2535→2865, 2580→2910, 2790→3120, 2820→3150,
    2826→3156, 2835→3165, 2850→3180, 2400→2730, 2780→3110.
  - `phase-1-reconciliation-signoff.txt` sentinel + N≥2 listener panel
    (Briggsy + Harry minimum per plan §R2). N=1 (Briggsy-only) until
    Harry can listen.

Phase 2 plan §Unit 2.7 ladder: Tier 0 absorb / Tier 1 Phase 2 regen
with pacing-adjusted steering / Tier 2 Phase 1 line-trim (reopen) /
Tier 3 Phase 1 timing.ts adjustment / Tier 4 TOTAL_FRAMES adjustment.
Decision per cue: trim text OR amend `expectedFrames` OR steering
adjustment OR accept overlap-in-Phase-4-compositing. Closes with a
`phase-1-reconciliation-signoff.txt` sentinel that Unit 2.8 asserts.

**Unit 2.8 — sequential after 2.7.** AudioAsset manifest for Phase 4
Remotion (JSON map of cueId → final WAV path + measured duration +
loudness + leadFramesHint).

**Open follow-ups carried by Phase 2 Unit 2.6 close (NOT blocking Unit 2.7):**

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

**Open follow-ups carried by Phase 2 Unit 2.5 close (NOT blocking Unit 2.7):**

- **Loudnorm drift on short cues (≤3s).** s04-cue-1050 (Operational
  planning.), s04-cue-1560 (Seventeen asset illustrations…), and
  S04-payoff (They WERE the operation.) measure -17.2 to -17.95 LUFS
  vs the -16 target after two-pass loudnorm. Known limitation per
  k.ylo.ph/loudnorm.html — single-pass drifts ±2-3 LU on clips <30s,
  two-pass mitigates but doesn't eliminate on clips <3s. Phase 4
  Remotion bed-ducking math may need a tiny bump on these specific
  cues if mix tests show them ducking too far. Track but don't
  pre-correct.
- **FFmpeg muxer inference fails on `.wav.tmp` filenames** (caught +
  fixed 2026-05-21 Unit 2.5). FFmpeg picks output muxer from the
  filename extension; `.tmp` isn't a known audio format and FFmpeg
  refuses to run. Fix shipped: explicit `-f wav` on both atomic-write
  passes in `post-process-tts.ts`. If you add another FFmpeg
  invocation with a `.tmp` target elsewhere, copy the `-f wav` (or
  whatever target format) flag.

**Open follow-ups carried by Phase 2 Unit 2.4 close (NOT blocking Unit 2.6):**

- **Doc-drift in `cold-open-prototype.ts` header + `script.ts`
  S01-cold-open notes.** Both still reference "Sloane matriarch-tuned
  (stability 0.85 / style 0.05 / speed 0.92)" or "Voice ID
  m8AHWg36LJTQWKmfeGVv" in comments — that's the v1 Sloane settings.
  The actual code constant (`COLD_OPEN_SPEAKER` body) is Eleanor (v3,
  stab 0.40 / style 0.45 / speed 0.85, voice ID
  `2qQJWjw5XdG80GreshqG`). Fix the prose at a comfortable point — not
  load-bearing, but stale annotations bite future readers.
- **S06-phrasing.expectedFrames contradiction (CARRY OVER from 2.3).**
  Phase 1 ships `expectedFrames: 12` (0.4s); Phase 2 deepening header
  claims 27 (~0.9s). Post-retune raw render is 1.2s = 36 frames pre-
  silenceremove. Briggsy ear-locked the `[excited]` settings — Unit
  2.7 measures post-silenceremove and amends `expectedFrames` to
  whatever the trimmed delivery clocks at (likely 18-27 frames).
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

**Open follow-ups carried by Phase 1 signoff (NOT blocking Phase 2):**

- **Cold-read gate for Unit 1.6** — needs N≥3 human reviewers,
  per-reviewer-floor consensus (≥2 of 3 score ≥1 on same pairing).
  Phase 2 voice pipeline produces the audio stimulus the reviewers
  listen to; pre-drafted R11-cut bridge lines activate if hard-fail.
- **Phase 3 — music marketplace audition** + `music-license.pdf`
  filing + `videos/trailer/public/audio/music-bed.mp3` (criteria +
  cue-map locked at Phase 1 Unit 1.7).
- **Phase 3 — S02 depth-plane asset** (A brass nameplate "M.
  PENDLETON, BUREAU CHIEF" / B folder stack / C doorframe vignette)
  — Phase 4 picks based on Imagen asset availability.
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
