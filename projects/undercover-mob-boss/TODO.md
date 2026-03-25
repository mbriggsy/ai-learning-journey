# TODO

## V2 — COMPLETE. SHIPPED. PLAYTESTED.

**Tests:** 843 pass / 0 fail
**E2E:** 488 pass / 9 fail (all known WebKit/Mobile Safari flaky — see Landmines)

### Session 2026-03-25 (Playtest + Polish)

**Narrator:**
- Rewrote nomination-2 ("who gets the badge" → "who do you trust") + regenerated audio
- Fixed veto narrator ordering: now veto-approved → tracker-advance → round-start
- Fixed blocked vote narrator ordering: blocked → tracker-advance → round-start
- Cut vote-reveal narration (too wordy, visual handles it)
- Cut round-start narration (board header shows round, keeps pace snappy)
- Deleted VOICE_DIRECTION trap constant + added warning at API call site

**Host Overlays (consistency pass):**
- Election results → fullscreen centered overlay (matches exec power)
- Policy enacted → fullscreen centered overlay
- Auto-enact → fullscreen centered overlay
- Replaced if-block wrapper pattern with OVERLAY_CLASSES map

**Player Phone:**
- Policy card badges: bigger (0.72rem), brighter gold/red
- Policy cards: larger (clamp 130px–170px)
- Allies text: white + bold + gold glow
- Card images: black background prevents CSS color bleed-through
- 5-layer iOS scroll lock: html position:fixed, touch-action:none, 100dvh, global touchmove handler

**Infrastructure:**
- SW audio cache: CacheFirst → StaleWhileRevalidate + cache bust (audio-cache-v2)
- Cleanup: removed redundant per-view touchmove handlers, !important, dead code

### Previous Session (2026-03-25 morning)
- Regenerated all 91 narrator .ogg files (clean, no voice direction)
- Generated remaining 18 card images (30/30 complete)
- Card type badges (VIRTUOUS/CORRUPT), card name readability
- Gazette scroll fix, commissioner badge overflow fix
- How to Play v5, removed Gazette share feature

---

## Deferred (polish tier — reopen when inspired)
- Ambient music — amazeballs or nothing
- SFX + haptics
- Veto drama UI
- PWA app icon — `public/assets/icon-512.png` is a placeholder black square
- Gazette share/screenshot — revisit with better screenshot library
- Card art consistency — some corrupt cards have transparent areas showing different background tones (needs Gemini Imagen quota to regen)
- Narrator variant pool — randomize from multiple variants per trigger (already coded, just needs more audio variants)

---

## V1 STATUS: COMPLETE

Game is live at **undercover-mob-boss.vercel.app**. Trailer v2 live on YouTube.

---

## V3 — BATSHIT CRAZY

*(Live AI narrator, AI players, dynamic city map, AR mode, tournaments, procedural stories, voice commands, The Speakeasy, live stream integration)*

---

## Landmines
- **S09 scene files still exist** — `S09_TheConcept.tsx` not deleted, just removed from Trailer.tsx and timing.ts
- **Trailer "15 images" voiceover** — baked audio says 15, reality is 13. Leave as V1 time capsule.
- **Asset cache version** — `ART_VERSION = 2` in `role-reveal.ts` and `role-peek.ts`. Bump when role art changes.
- **CSP allows `'unsafe-inline'`** for HTP GSAP animations
- **E2E flaky tests** — 9 failures all in WebKit/Mobile Safari. Test harness timing, not game defects.
- **`/host` URL serves player app in Vite dev** — use `/host.html` instead
- **Grace period:** 0ms dev, 30s prod
- **Remotion publicDir** points to `../../public` — if the video project moves, update `remotion.config.ts`
- **Imagen 4 daily quota:** 70 requests/day on paid tier 1. Plan card generation across sessions.
- **TTS daily quota:** 100 requests/day for gemini-2.5-flash-tts. 104 narrator lines total — fits in one session if no retries.
- **Gazette screenshot on very long games** — 10-player 15-round games produce tall newspapers. Share feature removed; consider compact mode if reinstated.

## Deployment

Both deploys are **fully automatic** on push to main:
- **Client:** Vercel auto-builds
- **Server:** GH Actions auto-deploys PartyKit (triggers on `src/server/`, `src/shared/`, `partykit.json` changes)
  - Workflow: `.github/workflows/deploy-partykit.yml` (monorepo root)
  - Manual fallback: `pnpm run partykit:deploy`

### Regenerate narrator / assets
```bash
set -a && source .env && set +a
npx tsx scripts/generate-narrator.ts --trigger nomination --force  # all variants for a trigger
npx tsx scripts/generate-narrator.ts --only nomination-2 --force   # specific variant
npx tsx scripts/generate-assets.ts --only <asset-id> --force
```

### Trailer
```bash
cd videos/trailer
pnpm run studio           # Preview in browser
pnpm run render           # → out/trailer-landscape.mp4
pnpm run render:vertical  # → out/trailer-vertical.mp4
pnpm run render:thumbnail # → out/thumbnail.png
```
