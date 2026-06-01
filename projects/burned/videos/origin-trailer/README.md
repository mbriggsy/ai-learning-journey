# BURNED — Origin Trailer (Remotion)

The living-UI origin trailer. Janet narrates; real game UI/art/CSS are borrowed
into Remotion and frame-animated.

## The cut map (read this first)

| Composition id | File | What it is |
|---|---|---|
| **`Trailer`** | `src/Trailer.tsx` | **THE canonical cut.** ~84s. Roster slams in as the FINALE. |
| `TrailerAltRosterOpen` | `src/TrailerAltRosterOpen.tsx` | Saved alternate — roster at the OPEN. Lost the A/B (2026-05-31); kept for reference. |
| `ColdHook`, `Beat2Man`, `BuildHero`, `Beat5Gauntlet`, `Beat6Wink`, `BurnedEndCard`, `ColdOpenRoster` | `src/scenes/` | Scene previews — the building blocks of `Trailer`. |
| `archive-*` | `src/OriginTrailer.tsx`, `src/scenes/Beat{1..7}*`, `FoundationProof`, `WinnerProof`, `BurnedCardHero` | **Superseded 3:01 narrated cut** + its old-VO beats. Reference only — NOT part of the trailer. |

> Difference between `Trailer` and the alternate is purely structural — same VO,
> same story scenes. B (finale) opens on a quiet briefing-room cold open and
> detonates the cast slam + BURNED as the button; A opens on the roster slam.

## Render

```
pnpm studio                                  # preview all compositions
pnpm render Trailer out/trailer.mp4          # the canonical trailer
pnpm render TrailerAltRosterOpen out/trailer-alt-A.mp4   # the saved alternate
```

## Audio (gitignored build inputs in out/vo/)

- **VO**: `pnpm tts:test` regenerates Janet's master + manifest from
  `scripts/voice/script.ts`. Needs `ELEVENLABS_API_KEY` (root `.env`:
  `set -a && source ../../.env && set +a`). Speech is text-cached.
- **SFX**: the finale slam + boom are synthesized — `python scripts/synth-sfx.py`
  → `src/assets/audio/`. (The ElevenLabs key lacks `sound_generation` permission;
  enable it for richer SFX.)

## Conventions

- Timing is derived from `out/vo/manifest.json` (see `src/lib/timeline.ts`); the
  cut files hardcode a `VO_BEAT` map copied from the manifest — re-sync it after
  any VO regen.
- Scenes are silent; the cut composition owns the single VO track.
- Real cards via `src/lib/TrailerCard.tsx` (the FoundationProof borrow path).

## Voice-pipeline gotchas (regenerating VO)

Hardened during the v2 build; the client in `scripts/tts-clients/` already ports
these — mind them if you extend the pipeline. (Deeper writeups: insights 054 /
062 / 067 and `docs/plans/origin-trailer/phase-2-voice-pipeline.md`.)

- **PCM→MP3 silent downgrade on Creator tier** — request `mp3_44100_192`, then
  convert to 48k mono WAV via ffmpeg.
- **Loudnorm drift on short cues (≤3s)** — runs 1–3 LU off −16; track, don't
  pre-correct.
- **`silencedetect`/`loudnorm` write to STDERR** — use `spawnSync`, not `execFileSync`.
- **FFmpeg muxer fails on `.wav.tmp`** — pass an explicit `-f wav`.
- **`eleven_v3` rejects `previous_text`/`next_text` priming** (400).
- **First `pnpm install` here needs the `--ignore-workspace` CLI flag** — the
  `.npmrc` setting alone doesn't stop the workspace walk-up (insight 054).
- **Remotion loads `remotion.config.ts` as CJS** — resolve alias paths via
  `process.cwd()`, NOT `import.meta.dirname` (empty under CJS).
- **Cold-read gate = N=1 Briggsy self-read** (`feedback-listener-panels-default-to-n1`).
