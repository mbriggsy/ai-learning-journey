# Phase 2 Unit 2.3 — Cadence Consistency Audit

Single-listener Likert audit of canary renders against the Phase 0
Unit 0.2 reference register. **Joint pass** = all 4 dimensions ≥ 4 on
EVERY canary. Joint pass triggers `cadence-consistency-signoff.txt`
sentinel write, unblocking Unit 2.4 full-batch generation.

## Canaries (rendered 2026-05-19)

| Cell           | Cue           | File                                                       | Measured    | Phase-1 budget       | Drift  |
| -------------- | ------------- | ---------------------------------------------------------- | ----------- | -------------------- | ------ |
| Dash sustained | S02-briefing  | `public/audio/lines/s02-cue-219-dash.wav`                  | 12.32 s     | 11.70 s (351 frames) | +5.3%  |
| Cold-open      | S01-cold-open | `public/audio/lines/s01-cue-60-janet.wav`                  | 4.56 s      | 5.00 s (150 frames)  | -8.8%  |
| Scream (R5-A)  | S05-scream    | `public/audio/lines/s05-cue-2400-dash.wav`                 | 2.24 s      | 1.67 s (50 frames)   | +34.1% |

All three: codec `pcm_s16le`, 48000 Hz, mono, 16-bit.

## Engine + pipeline metadata

- Engine: `elevenlabs-v3` (Roger for Dash; Sloane matriarch-tuned for Janet)
- Model: `eleven_v3`
- Voice settings: Roger defaults from `sample-eval/r4-dash/cadence-spec-elevenlabs.json` (Dash);
  matriarch-tuned override from `scripts/cold-open-prototype.ts` `COLD_OPEN_SPEAKER.voiceSettings` (Janet)
- Output format from API: `mp3_44100_192` (Creator-tier ceiling — PCM
  requires Pro tier, confirmed by ElevenLabs docs + empirical silent
  downgrade); FFmpeg converts → 48kHz mono PCM WAV at write boundary.
- Context priming (`previous_text` / `next_text`): suppressed when
  `model_id === 'eleven_v3'` — v3 returns 400 unsupported_model.
  Priming map preserved in `context-priming-overrides.json` for future
  re-enable.
- Cumulative spend: **$0.12 / $50** ceiling.

## Likert rubric

Score each dimension 0–5 vs the Phase 0 reference for the matching cell.

| Dimension              | 0                                       | 3                            | 5                                          |
| ---------------------- | --------------------------------------- | ---------------------------- | ------------------------------------------ |
| **Register cluster**   | drifted to neutral / generic narrator   | recognizable but softened    | indistinguishable from Phase 0 reference   |
| **Pace match**         | ±25% drift vs Phase 0 wps               | ±15% drift                   | ±5% drift                                  |
| **Volume dynamics**    | audibly squashed or clipped             | minor pumping                | clean dynamic range                        |
| **Articulation**       | engine-default voice underneath         | partial steering effect      | full Sterling-CODED articulation           |

## Scores (Briggsy — N=1 canary listener)

| Canary                                       | Register | Pace | Volume | Articulation | Joint pass? |
| -------------------------------------------- | -------- | ---- | ------ | ------------ | ----------- |
| `s02-cue-219-dash.wav` (Dash sustained)      | _ / 5    | _ / 5 | _ / 5 | _ / 5        | ☐           |
| `s01-cue-60-janet.wav` (Janet matriarch)     | _ / 5    | _ / 5 | _ / 5 | _ / 5        | ☐           |
| `s05-cue-2400-dash.wav` (Dash scream)        | _ / 5    | _ / 5 | _ / 5 | _ / 5        | ☐           |

## Sign-off

- Listener: Briggsy
- Proceed to full generation (Unit 2.4 — $22 spend): ☐ YES  ☐ NO
- If NO, route to Unit 2.3 Step 3 fail-action ladder.

## Fail-action ladder (Step 3)

Triggered when any Likert dimension scores < 4 on any canary.

1. **Steering payload not applied** — debug `voice_settings` / inline
   tag wiring in `scripts/tts-clients/elevenlabs.ts`.
2. **Engine model version drift since Phase 0** — preflight catches
   sunset via `/v1/models`. If drift appeared mid-execution, Phase 0
   re-spec.
3. **Engine character drift** — Phase 0 Unit 0.2 `cadence-spec.md`
   re-spec required.
4. **All paths drift** — Path D (voice actor) fallback.
