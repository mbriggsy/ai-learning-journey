# Phase 2 Asset Inventory

Final inventory of Phase 2 deliverables consumed by Phase 4 Remotion.
Generated post-Unit-2.7 reconciliation (TOTAL_FRAMES 3180 / 106s).

## WAV files in `public/audio/lines/`

Filenames derived from `cueFilename(line)` = `s{NN}-cue-{frame}-{voice}.wav`
where voice ∈ {dash, sable, janet, vera}. Cold-open speaker resolved
from `PHASE-0-EXIT.md` Section 2 to **janet** (Eleanor / Shared Library,
British, age=old; cunty-matriarch-tuned per Unit 2.3 re-lock).

| Cue ID | Filename | Voice | Cue type | Start frame | Notes |
|---|---|---|---|---|---|
| S01-cold-open | `s01-cue-60-janet.wav` | janet | cold-open | 60 | Eleanor matriarch-tuned (cold-open speaker per PHASE-0-EXIT.md §2) |
| S02-briefing | `s02-cue-219-dash.wav` | dash | sustained | 219 | Sterling-CODED arrogant-briefer formality |
| S03-roster | `s03-cue-570-dash.wav` | dash | sustained | 570 | Tier-2 trim landed; `[BEAT 0.3s]` × 2 stitched via Unit 2.6 |
| S03-deck | `s03-cue-1007-dash.wav` | dash | sustained | 1007 | Tier-0 absorb; `[BEAT 0.4s]` + `[BEAT 0.3s]` stitched |
| S04-cue-01 | `s04-cue-1380-dash.wav` | dash | list | 1380 | "Operational planning." |
| S04-cue-02 | `s04-cue-1440-dash.wav` | dash | list | 1440 | "Fourteen thousand pages of forensic dossiers." |
| S04-cue-03 | `s04-cue-1530-dash.wav` | dash | list | 1530 | Tier-2 rewrite landed (three-AM beat) |
| S04-stat-01 | `s04-cue-1620-dash.wav` | dash | list | 1620 | "Mission rehearsal: fourteen hundred and seven contingencies war-gamed." |
| S04-stat-02 | `s04-cue-1740-dash.wav` | dash | list | 1740 | "Six of them, deliberately unrehearsed — the 'memorable ones.'" |
| S04-stat-03 | `s04-cue-1890-dash.wav` | dash | list | 1890 | "Seventeen asset illustrations. Five of them with hats." |
| S04-stat-04 | `s04-cue-2010-dash.wav` | dash | list | 2010 | Otto research-budget callback ("Don't ask.") |
| S04-payoff | `s04-cue-2280-dash.wav` | dash | payoff | 2280 | R3 stacked-payoff truth-collision; `leadFramesHint: 2` |
| S05-gameplay-vo | `s05-cue-2610-dash.wav` | dash | sustained | 2610 | Sparse VO over gameplay; sotto-voce |
| S05-scream | `s05-cue-2730-dash.wav` | dash | scream | 2730 | Sterling-LANA four-axis acoustic shape; `skipSilenceremove: true`; `leadFramesHint: 1` |
| S06-close | `s06-cue-2910-dash.wav` | dash | payoff | 2910 | "Hold it tight" entendre setup |
| S06-phrasing | `s06-cue-3144-dash.wav` | dash | payoff | 3144 | Interjective `[excited]` retune; `PHRASING_INTERJECTIVE_SETTINGS` |

Total: **16 cues** (15 if R5=cut in `PHASE-0-EXIT.md`; current EXIT
locks R5=kept-via-A so all 16 ship). Cumulative measured audio: 86.10s
across 106s composition window — ~20s of inter-cue silence + cushion +
S02 lead-in / S03 mid-wipe is intentional pacing.

## Manifest exports

- [x] `src/lib/script.ts` — Phase 1 `BURNED_TRAILER_LINES` (source of truth)
- [x] `src/lib/audio-manifest-types.ts` — `AudioAsset` type (stable; derived from `Line` shape)
- [x] `src/lib/audio-manifest.ts` — `AUDIO_ASSETS` data (codegen output; do not edit by hand)
- [x] `scripts/generate-audio-manifest.ts` — re-runnable codegen (`pnpm generate:manifest`)

## Verification artifacts in `sample-eval/voice-pipeline/`

- [x] `preflight-log.md` (Unit 2.0)
- [x] `cadence-consistency.md` (Unit 2.3)
- [x] `duration-reconciliation.md` (Unit 2.4)
- [x] `loudness-audit.jsonl` (Unit 2.5; per-cue integrated loudness post two-pass loudnorm)
- [x] `phase-1-reconciliation-signoff.txt` (Unit 2.7 sentinel — N=1 Briggsy production-cert)
- [x] `asset-inventory.md` (this file)
- [x] `context-priming-overrides.json` (Phase 2-owned priming, gated off for v3)
- [x] `tts-spend.json` (gitignored — account-scoped)

## Phase 4 hand-off

- Phase 4 scenes import `AUDIO_ASSETS` from `src/lib/audio-manifest.ts`.
- Per-scene audio placement uses
  `<Sequence from={asset.startFrame - (asset.leadFramesHint ?? 0)}><Audio src={staticFile(asset.staticPath)} /></Sequence>`.
  **NOT `<Audio from={...}>`** — that prop does not exist on
  `@remotion/media`'s `<Audio>` component (Phase 0 ADR #5 verified +
  Context7).
- All audio is post-processed (-16 LUFS ±1 LU target, areverse-sandwich
  silence-trimmed except scream, per-cue `afade` shaped, mono 48 kHz
  PCM_S16LE). Short cues (<3s) drift up to ±2 LU per loudnorm
  limitation — Phase 4 bed-ducking math may need tiny per-cue
  adjustments if mix tests show drift. Cues with known short-cue
  drift: `s04-cue-1380` (-17.95), `s04-cue-1530` (-19.17),
  `s04-cue-1890` (-17.27), `s04-cue-2280` (-17.21).
- No further audio post-processing needed in Phase 4 (volume / ducking
  only).
- ElevenLabs v3 deprecation contingency: raw API responses archived at
  `public/audio/lines/raw/`. If v3 sunsets between Phase 2 close and
  Phase 6 distribution, locked WAVs continue shipping from
  `public/audio/lines/` (post-processed) and `raw/` (immutable
  fallback). Regen capability NOT presumed post-close.

## Re-codegen

If Phase 1 reopens (line edit, cue addition, frame shift) OR any WAV
is re-rendered post Unit 2.7:

```bash
cd videos/trailer && pnpm generate:manifest
```

Codegen asserts `phase-1-reconciliation-signoff.txt` exists; if it has
been removed because Unit 2.7 needs to re-run, regenerate after the
new sign-off lands.
