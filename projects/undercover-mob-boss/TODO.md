# TODO

## Current Session: 2026-03-24

### V2 — Plans 3 & 4 MERGED TO MAIN (audio regen needed)

**PRIORITY 1 NEXT SESSION: Regenerate all narrator audio.**
All 91 .ogg files on main have VOICE_DIRECTION spoken aloud ("Read this as a 1940s noir..."). The code is fixed (script-only, no prefix). Just need to run:
```bash
set -a && source .env && set +a
npx tsx scripts/generate-narrator.ts --force
```
Then convert WAVs to Opus and commit. ~15-20 min.

**Tests:** 822 pass / 18 fail (Plan 2 missing card art — quota-gated, pre-existing)

**What we did this session:**

**Plan 3 — Narrator Variant Pool (5 commits):**
- NarratorVariant type system with discriminated union (single vs variant)
- 76 variant scripts across 24 triggers (52 new noir lines, 24 V1 preserved as variant-1)
- Tiered counts: 5-6 high-freq, 3-4 medium, 2-3 low, 2 rare
- Pool selection with Mulberry32 seeded PRNG, variant-1 fallback, lazy selection on reconnection
- Workbox audio handler → CacheFirst
- WAV → Opus conversion via ffmpeg (9.4MB → 776KB, 12x compression)
- Renamed 24 V1 event WAVs: {id}.wav → {id}-1.ogg (atomic commit)
- Round-start + trailer explicitly exempt from variant system
- narrator-bridge lifecycle: pool selection at role-reveal, dispose on game-over → lobby
- 19 new tests (pool selection, PRNG, variant integrity, audio existence, phase groups)

**Plan 4 — The Millbrook City Gazette (4 commits):**
- Server enrichment: GovernmentRecord type, voteHistory on GameState, accumulated on every election
- voteHistory + investigationHistory projected to HostState at game-over only
- Events unsanitized at game-over (investigation results + wasMobBoss visible)
- Gazette component (src/client/host/gazette/): index.ts, moments.ts, awards.ts, screenshot.ts, gazette.css, types.ts
- Content sections: headline (3 variants per outcome), rogues gallery, policy timeline, voting record, key moments, superlatives
- 15 superlative templates with greedy unique assignment + "The Quiet One" fallback
- Key moment detection: decisive votes, policy streaks, mob boss nearly elected, execution hit/miss, investigations
- Noir newspaper CSS: aged paper texture, Cinzel masthead, CSS Grid columns, drop caps
- @zumer/snapdom screenshot + Web Share API + PNG download fallback
- "EXTRA! EXTRA! READ ALL ABOUT IT!" button in game-over (prefetched gazette chunk)
- 14 new tests (superlative assignment, key moments, moment formatting, vote history)

**What's left (next session):**
1. **Generate new variant audio** — 52 new TTS lines via Gemini. Run:
   ```bash
   set -a && source .env && set +a
   npx tsx scripts/generate-narrator.ts --force
   ```
   Generates all 76 game variants + 15 round-start + 13 trailer (~12-27 min at 250 RPD).
   After generation, convert new WAVs to Opus:
   ```bash
   for f in public/audio/*-[2-9].wav public/audio/*-1[0-9].wav; do
     base="${f%.wav}"
     ffmpeg -y -i "$f" -c:a libopus -b:a 32k -vbr on -application voip "$base.ogg" && rm "$f"
   done
   ```
2. **Manual listening QA** — spot-check 5-10 variants for tone consistency with V1
3. **Manual playtest** — play 2-3 games to game-over, verify:
   - Different narrator lines in consecutive games
   - Gazette renders correctly after each win condition
   - Voting records match actual game votes
   - Superlatives are funny and accurate
   - Screenshot/share works
4. **Copy polish** — review superlative descriptions + headline variants for humor quality
5. **Merge Plan 2 branch** — `feat/named-policy-cards` still unmerged (19 card images pending quota)
6. **Merge this branch** — `feat/narrator-variant-pool` → PR + merge
7. **Deploy** — push to Vercel + PartyKit

### V2 — Plan 2 IN PROGRESS (code complete, art 11/30)

**Branch:** `feat/named-policy-cards` (7 commits, not yet merged)

**What's left:**
1. Generate remaining 19 card images (Imagen 4 quota)
2. Review all 30 cards — visual quality check
3. Add `.policy-card__name` CSS
4. Verification gate + PR + merge

**Locked V2 Core Features:**
1. **Commissioner rename** — COMPLETE. Merged to main, deployed.
2. **Named policy cards** — IN PROGRESS (code complete, art 11/30)
3. **Narrator variant pool** — CODE COMPLETE (on branch, audio gen pending)
4. **The Millbrook City Gazette** — CODE COMPLETE (on branch, playtest pending)

**Deferred (polish tier):**
- Ambient music — amazeballs or nothing
- SFX + haptics
- Veto drama UI
- PWA app icon — `public/assets/icon-512.png` is a placeholder black square

**Plans:**
1. `docs/v2/plans/2026-03-24-001-feat-commissioner-rename-plan.md` — **COMPLETE**
2. `docs/v2/plans/2026-03-24-002-feat-named-policy-cards-plan.md` — **EXECUTING** (art pending)
3. `docs/v2/plans/2026-03-24-003-feat-narrator-variant-pool-plan.md` — **CODE COMPLETE**
4. `docs/v2/plans/2026-03-24-004-feat-millbrook-city-gazette-plan.md` — **CODE COMPLETE**

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
- **E2E flaky test** — `simultaneous-actions.spec.ts:480` WebKit only (test harness timing, not game defect)
- **`/host` URL serves player app in Vite dev** — use `/host.html` instead
- **Grace period:** 0ms dev, 30s prod
- **Remotion publicDir** points to `../../public` — if the video project moves, update `remotion.config.ts`
- **ALL NARRATOR AUDIO CORRUPTED** — current .ogg files on main have VOICE_DIRECTION prefix spoken aloud. Code is fixed. Must regenerate with `--force` next session.
- **Imagen 4 daily quota:** 70 requests/day on paid tier 1. Plan card generation across sessions.
- **`.policy-card__name` CSS missing** — name labels added to DOM but no styles yet.
- **Gazette screenshot on very long games** — 10-player 15-round games produce tall newspapers. Consider compact share mode if screenshots are too tall.

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
npx tsx scripts/generate-narrator.ts --trigger nomination --force  # all variants for a trigger
npx tsx scripts/generate-narrator.ts --only nomination-2 --force   # specific variant
npx tsx scripts/generate-assets.ts --only <asset-id> --force
```
