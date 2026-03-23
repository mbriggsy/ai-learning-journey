# TODO

## Last Session: 2026-03-23 (Cinematic Trailer — Remotion)

### What was done

Built a full cinematic trailer for UMB using Remotion (programmatic video from React).

**Deliverables:**
- `videos/trailer/out/trailer-landscape.mp4` — 2:06, 1920x1080, 73MB
- `videos/trailer/out/trailer-vertical.mp4` — 27s, 1080x1920, 6.2MB

**Structure: 14-scene two-act trailer — "The City Never Saw It Coming"**
- **Act 1: THE GAME (S01-S07, ~58s)** — Pure noir cinema. Cold open, city, role reveals, table, voting, stakes montage, "Which side are you on?" glitch transition.
- **Act 2: THE BUILD (S08-S13, ~59s)** — "Built in 8 nights. The human has a day job. The AI doesn't sleep." Origin story ("This is the one."), Phase 1 plan scrolling, Claude Code split-screen building, 29-agent QA audit (3 terminals), full stats roll-up with $2 mic drop.
- **Title + CTA (S14, 9s)** — Game title, URL, fade to black.

**Generated assets (9 narrator WAVs + 4 images):**
- Narrator: trailer-stakes, trailer-tagline, trailer-bridge, trailer-build-stats, trailer-timeline, trailer-closing, trailer-day-job, trailer-vision, trailer-qa
- Images: trailer-table-overhead, trailer-city-closeup, trailer-dossier-spread, trailer-blueprint

**Technical:**
- Remotion 4.0.438 project at `videos/trailer/`
- 14 scene components, 11 reusable components (FilmGrain, KenBurns, TextReveal, CardReveal, TerminalSimulation, SplitScreen, StatsCounter, FadeTransition, DocumentScroll, MultiTerminal, Placeholder)
- Centralized audio timeline in Trailer.tsx (absolute Sequence positioning, no clipping)
- "8 days" → "8 nights" throughout (narrator, text, docs) — Briggsy has a day job

**Iteration log:**
1. v1: Initial 90s trailer, 11 scenes — audio bleed between scenes
2. v2: Fixed audio (centralized timeline), fixed "8 nights", extended S06 for audio fit — 93s
3. v3: Expanded Act 2 with 3 new scenes (Concept, Blueprint, Audit), 3 new narrator lines, expanded stats — 2:06
4. v4: Added audio to vertical trailer

### Build status
- Typecheck: clean (both game + video projects)
- Unit tests: 760/760 passing
- Production: LIVE at undercover-mob-boss.vercel.app

---

## NEXT SESSION

### Priority 1: Watch the trailer on a big screen
- Play `trailer-landscape.mp4` on TV/projector
- Note timing issues, pacing, audio levels
- The Remotion Studio (`cd videos/trailer && pnpm run studio`) lets you scrub frame-by-frame

### Priority 2: Trailer polish (if needed)
- Audio timing fine-tuning — adjust frame offsets in Trailer.tsx AUDIO_TIMELINE
- Scene duration adjustments — edit timing.ts
- Visual polish — Ken Burns speeds, text timing, card animation speeds
- Re-render: `cd videos/trailer && pnpm run render`

### Priority 3: Real-device playtest
- Full game on iPad (host) + phones (players) with production URL
- Verify all narrator lines in context
- Test PWA install flow on iOS and Android

### Future
- **Narrator variant pool** — multiple lines per trigger, randomly selected for replayability
- **Ambient music layer** — noir jazz underscore for trailer and/or game
- **Remaining QA** — `ambient-base.wav`, `ambient-tension.wav` need generation
- Zod schema validation

## Landmines
- **Remotion publicDir** points to `../../public` — if the video project moves, update `remotion.config.ts`
- **Audio durations hardcoded in comments** — if narrator lines are regenerated, recalculate frame positions in Trailer.tsx
- **CSP allows `'unsafe-inline'`** for HTP GSAP animations
- **Service worker CacheFirst for audio** — regenerated lines may persist 30 days
- **E2E flaky test** — `simultaneous-actions.spec.ts:480` WebKit only
- **`/host` URL serves player app in Vite dev** — use `/host.html` instead
- Grace period: **0ms dev, 30s prod**

## Deployment Cheat Sheet

### Game
```bash
git push origin main      # Vercel auto-builds
pnpm run partykit:deploy  # Manual: Cloudflare Workers
```

### Trailer
```bash
cd videos/trailer
pnpm run studio           # Preview in browser (frame-by-frame scrubbing)
pnpm run render           # → out/trailer-landscape.mp4
pnpm run render:vertical  # → out/trailer-vertical.mp4
pnpm run render:thumbnail # → out/thumbnail.png
```

### Regenerate narrator / assets
```bash
set -a && source .env && set +a
npx tsx scripts/generate-narrator.ts --only <line-id> --force
npx tsx scripts/generate-assets.ts --only <asset-id> --force
```
