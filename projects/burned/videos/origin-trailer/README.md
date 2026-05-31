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
