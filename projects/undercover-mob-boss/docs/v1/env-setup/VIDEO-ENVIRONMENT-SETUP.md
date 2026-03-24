# Undercover Mob Boss — Video Production Environment

---

## What This Is

Cinematic trailer production for UMB using Remotion (programmatic video from React).

**Trailer lives at:** `videos/trailer/` (inside the UMB project)

**Output:** `videos/trailer/out/trailer-landscape.mp4` (2:06, 1920x1080) and `trailer-vertical.mp4` (27s, 1080x1920)

---

## Prerequisites

- Main game environment (ENVIRONMENT-SETUP.md) already configured
- FFmpeg installed (`winget install ffmpeg`)
- Remotion CLI installed globally (`npm install -g @remotion/cli` — version 4.0.438)

---

## Setup

```bash
cd videos/trailer
pnpm install
```

Remotion's `publicDir` is configured in `remotion.config.ts` to point at `../../public`, so all game assets (images, audio, fonts) are available via `staticFile()`.

---

## Commands

```bash
pnpm run studio           # Interactive preview — scrub frame-by-frame
pnpm run render           # Render landscape MP4 (1920x1080, h264, CRF 18)
pnpm run render:vertical  # Render vertical MP4 (1080x1920)
pnpm run render:thumbnail # Render thumbnail PNG
pnpm run typecheck        # TypeScript check
```

---

## Architecture

**14 scenes** across 2 compositions (landscape + vertical):

| Act | Scenes | Duration | Content |
|-----|--------|----------|---------|
| Act 1: The Game | S01-S07 | ~58s | Noir cinema — city, role reveals, voting, stakes, glitch transition |
| Act 2: The Build | S08-S13 | ~59s | Origin story, plan scroll, Claude Code building, QA audit, stats |
| Title + CTA | S14 | 9s | Game title, URL, fade to black |

**Audio is centralized** in `Trailer.tsx` using absolute `<Sequence from={frame}>` positioning — never inside individual scenes. This prevents clipping at scene boundaries.

**Key files:**
- `src/Trailer.tsx` — Main composition + audio timeline
- `src/TrailerVertical.tsx` — Vertical composition + audio timeline
- `src/lib/timing.ts` — Scene durations and cumulative start frames
- `src/lib/colors.ts` — Noir color palette (mirrored from game CSS)

**Components:**
- `FilmGrain` — Animated SVG noise overlay
- `KenBurns` — Slow zoom/pan on static images
- `TextReveal` — Fade-in text with slide
- `CardReveal` — Spring-animated card appearance
- `TerminalSimulation` — Code typing with syntax highlighting, cursor, thinking dots
- `MultiTerminal` — Multiple Claude Code windows side-by-side
- `DocumentScroll` — Fast-scrolling document text (plan content)
- `SplitScreen` — Left/right composition with gold divider
- `StatsCounter` — Rolling number counters
- `FadeTransition` — Fade to/from black

---

## Generated Assets

**9 trailer-exclusive narrator lines** (Gemini TTS, Charon voice):
`trailer-stakes`, `trailer-tagline`, `trailer-bridge`, `trailer-build-stats`, `trailer-timeline`, `trailer-closing`, `trailer-day-job`, `trailer-vision`, `trailer-qa`

**4 trailer-exclusive images** (Gemini Imagen 4):
`trailer-table-overhead`, `trailer-city-closeup`, `trailer-dossier-spread`, `trailer-blueprint`

All stored in the game's `public/` directory with `trailer-` prefix. Generate via the game project's scripts:
```bash
cd ../..  # back to game root
set -a && source .env && set +a
npx tsx scripts/generate-narrator.ts --only trailer-stakes --force
npx tsx scripts/generate-assets.ts --only trailer-table-overhead --force
```

---

## Editing the Trailer

1. **Change scene timing:** Edit `src/lib/timing.ts` → scene durations auto-propagate
2. **Change audio timing:** Edit the `AUDIO_TIMELINE` array in `src/Trailer.tsx`
3. **Change visuals:** Edit the scene component in `src/scenes/`
4. **Preview:** `pnpm run studio` → scrub in browser
5. **Re-render:** `pnpm run render`

---

## Runway Gen-3 (future — not used)

For AI-generated people/scene clips to mix in.
- **API:** dev.runwayml.com
- **Cost:** ~$0.05/second of video
- Add `RUNWAY_API_KEY` to `.env` when ready
