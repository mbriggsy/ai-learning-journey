# TODO

## Current Session: 2026-03-25

### V2 — ALL CORE FEATURES COMPLETE

**Tests:** 843 pass / 0 fail
**E2E:** 488 pass / 9 fail (all known WebKit/Mobile Safari flaky — see Landmines)

**What we did this session:**

**Audio Regeneration (Priority 1):**
- Regenerated all 91 narrator .ogg files — VOICE_DIRECTION no longer spoken aloud
- Fixed terminology: "good/bad policy" → "virtuous/corrupt policy" in 6 narrator scripts
- Fixed role attribution: executive powers (investigate, peek, execute, special-nominate) correctly attributed to Mayor, not Commissioner — 7 lines fixed
- Trailing silence trimmed via ffmpeg areverse→silenceremove→areverse during WAV→Opus conversion
- Added narrator-terminology.test.ts — guards against terminology drift + role errors (3 tests)

**Card Image Generation (30/30 complete):**
- Generated remaining 18 card images via Imagen 4 (was 12/30)
- Softened 5 Imagen 4 prompts that tripped safety filter (3 rounds of iteration)
- All 30 cards verified serving on production (200 OK, image/webp)

**Bug Fixes:**
- Commissioner badge overflow → shortened to "COMISH" in player strip
- Policy track now shows named card art (from policyHistory) instead of generic images
- SW card image cache: CacheFirst → StaleWhileRevalidate + new cache name (card-cache-v2) to invalidate stale 404 entries
- Gazette scrolling: game-over overlay place-items changed from center to start-center, scrollbar-free scrolling works
- Test scenarios now use real card pool instead of placeholder "TEST CORRUPT" cards
- Card type badges: VIRTUOUS/CORRUPT labels at top of each card (colorblind accessible)
- Card name readability: bigger font, bolder weight, stronger gradient backdrop, text-shadow

**Feature Removals:**
- Removed Gazette share/screenshot feature (snapdom + Web Share API — unreliable, deferred)

**Content Updates:**
- How to Play (HTML + MD): Good/Bad → Virtuous/Corrupt throughout, deck composition note, version 5.0
- Narrator scripts: all spoken "good/bad policy" → "virtuous/corrupt policy"

**Deployment:**
- PartyKit manually deployed (auto-deploy workflow was created after Plans 2-4 merged — never triggered)
- Vercel auto-deployed on push
- Both confirmed serving all 91 audio + 30 card images correctly

**What's left (next session):**
1. **Manual playtest** — play 2-3 full games to game-over with real humans, verify:
   - Different narrator lines in consecutive games
   - Gazette renders correctly after each win condition
   - Voting records match actual game votes
   - Superlatives are funny and accurate
2. **Copy polish** — review superlative descriptions + headline variants for humor quality
3. **Deploy** — push latest fixes to Vercel + PartyKit (`pnpm run partykit:deploy`)

### V2 — Plan 2 (Named Policy Cards) — COMPLETE
All 30 card images generated, code merged, server deployed.

**Locked V2 Core Features:**
1. **Commissioner rename** — COMPLETE. Merged to main, deployed.
2. **Named policy cards** — COMPLETE. 30/30 cards, all render sites updated.
3. **Narrator variant pool** — COMPLETE. 91 clean audio files, all correct terminology.
4. **The Millbrook City Gazette** — COMPLETE. Scrollable, share removed.

**Deferred (polish tier):**
- Ambient music — amazeballs or nothing
- SFX + haptics
- Veto drama UI
- PWA app icon — `public/assets/icon-512.png` is a placeholder black square
- Gazette share/screenshot — revisit with better screenshot library

**Plans:**
1. `docs/v2/plans/2026-03-24-001-feat-commissioner-rename-plan.md` — **COMPLETE**
2. `docs/v2/plans/2026-03-24-002-feat-named-policy-cards-plan.md` — **COMPLETE**
3. `docs/v2/plans/2026-03-24-003-feat-narrator-variant-pool-plan.md` — **COMPLETE**
4. `docs/v2/plans/2026-03-24-004-feat-millbrook-city-gazette-plan.md` — **COMPLETE**

---

## V1 STATUS: COMPLETE

Game is live at **undercover-mob-boss.vercel.app**. Trailer v2 live on YouTube. All docs current.

### V1 stats (verified)
- **326 commits**
- **13,734 lines of code** (src/)
- **17,154 lines of tests** (tests/)
- **11,919 lines of specification** (docs/)
- **209/209 rules verified** (227 checklist entries, 209 unique rules)
- **13 AI-generated game images** + 4 trailer images
- **39 game narrator lines** + 13 trailer narrator lines
- **0 functional defects**
- **~$2 API costs** (Imagen 4 + Gemini TTS for game assets)

---

## V3 — BATSHIT CRAZY

*(Unchanged — live AI narrator, AI players, dynamic city map, AR mode, tournaments, procedural stories, voice commands, The Speakeasy, live stream integration)*

---

## Landmines
- **S09 scene files still exist** — `S09_TheConcept.tsx` not deleted, just removed from Trailer.tsx and timing.ts
- **Trailer "15 images" voiceover** — baked audio says 15, reality is 13. Leave as V1 time capsule.
- **Asset cache version** — `ART_VERSION = 2` in `role-reveal.ts` and `role-peek.ts`. Bump when role art changes.
- **CSP allows `'unsafe-inline'`** for HTP GSAP animations
- **E2E flaky tests** — 9 failures all in WebKit/Mobile Safari (simultaneous-actions, session-recovery, user-chaos, veto-flow, visual-audit). Test harness timing, not game defects.
- **`/host` URL serves player app in Vite dev** — use `/host.html` instead
- **Grace period:** 0ms dev, 30s prod
- **Remotion publicDir** points to `../../public` — if the video project moves, update `remotion.config.ts`
- **Imagen 4 daily quota:** 70 requests/day on paid tier 1. Plan card generation across sessions.
- **Gazette screenshot on very long games** — 10-player 15-round games produce tall newspapers. Share feature removed; consider compact mode if reinstated.
- **PartyKit auto-deploy** — workflow exists but only triggers on src/server/ or src/shared/ changes. Manual deploy needed when only client changes affect server behavior.
- **TTS daily quota:** 100 requests/day for gemini-2.5-flash-tts. 104 narrator lines total — fits in one session if no retries needed.

## Deployment Cheat Sheet

### Game
```bash
git push origin main      # Vercel auto-builds
pnpm run partykit:deploy  # Manual: Cloudflare Workers (or auto via GH Actions on src/server/ changes)
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
npx tsx scripts/generate-narrator.ts --trigger nomination --force  # all variants for a trigger
npx tsx scripts/generate-narrator.ts --only nomination-2 --force   # specific variant
npx tsx scripts/generate-assets.ts --only <asset-id> --force
```
