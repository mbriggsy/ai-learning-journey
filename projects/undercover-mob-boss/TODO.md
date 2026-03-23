# TODO

## Last Session: 2026-03-23 (Trailer v2 — Narration Overhaul)

### What was done

Overhauled trailer narration, cut a scene, fixed visual issues, uploaded v2 to YouTube.

**Narration changes:**
- Rewrote $2 line: "Fifteen images. Thirty-nine voice lines. All of it... two dollars."
- Added sleep deprivation joke: "The human ran on anger and adrenaline. The AI just... ran."
- Added AI bar tab punchline: "And the AI bar tab... still open."
- Changed timeline closer: "From an empty page... to a city full of secrets." (was "city that never sleeps" — NYC owns that)
- Moved narration sequence earlier so it plays over the stat roll-up (was 6.5s of silence)
- Added 1.2s beat after token bill joke before bar tab lands

**Scene changes:**
- Cut S09 (The Concept / "This is the one") — 8 seconds freed, tighter pacing
- S13 narration sequence now: $2 → sleep dep → token bill → (beat) → bar tab → timeline

**Title card fixes (S11_TitleCard.tsx):**
- Replaced broken `icon-512.png` placeholder with gold wax seal "M" monogram (matches HTP hero__seal)
- Changed "No app. No install." from NOIR.muted to NOIR.cream at 75% opacity + text shadow (was unreadable)

**Closing fix:**
- Extended S14 to 330 frames — "can you be trusted" no longer clips at the end

**README updates:**
- "10,000 lines of planning" → "10,000 lines of specification (planning)"
- Added context to $2: "~$2 in API costs for all AI-generated images and narrator voiceovers"
- Updated YouTube link to v2: https://youtu.be/y9irCLLg3Mo
- Audio count: 39 game + 10 trailer

**Deliverables:**
- `videos/trailer/out/trailer-landscape.mp4` — 2:10, 1920x1080, 78MB
- YouTube v2: https://youtu.be/y9irCLLg3Mo (v1 unlisted at https://youtu.be/aePKLeeQm9g)

### Build status
- Typecheck: clean
- Unit tests: 760/760 passing
- Production: LIVE at undercover-mob-boss.vercel.app

---

## NEXT SESSION

### Priority 1: Real-device playtest
- Full game on iPad (host) + phones (players) with production URL
- Verify all narrator lines in context
- Test PWA install flow on iOS and Android

### Priority 2: Trailer polish (if needed)
- Listen to the full narration sequence on speakers — check pacing of the joke beats
- The Remotion Studio (`cd videos/trailer && pnpm run studio`) lets you scrub frame-by-frame
- Re-render: `cd videos/trailer && pnpm run render`

### Future
- **Narrator variant pool** — multiple lines per trigger, randomly selected for replayability
- **Ambient music layer** — noir jazz underscore for trailer and/or game
- **Remaining QA** — `ambient-base.wav`, `ambient-tension.wav` need generation
- Zod schema validation

## Landmines
- **Remotion publicDir** points to `../../public` — if the video project moves, update `remotion.config.ts`
- **Audio durations hardcoded in comments** — if narrator lines are regenerated, recalculate frame positions in Trailer.tsx
- **S09 scene files still exist** — `S09_TheConcept.tsx` not deleted, just removed from Trailer.tsx and timing.ts. Safe to delete if desired.
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
