# TODO

## Current Session: 2026-03-24

### V2 — Plan 1 COMPLETE, Plans 2-4 Ready

**Docs:**
- Brainstorm: `docs/v2/ideation/BRAINSTORM.md` (debate complete)
- Spec: `docs/v2/spec/SPEC.md` (locked)

**Locked V2 Core Features:**
1. **Commissioner rename** — COMPLETE. Merged to main, deployed to Vercel + PartyKit. Audio deferred to ADR-V2-03.
2. **Named policy cards** — Virtuous/Corrupt, noir-fictional names, 30+ unique illustrations, randomized pool per game (cosmetic only, deck math unchanged)
3. **Narrator variant pool** — 8-10 variants per trigger, built incrementally (~100 API calls/day). Commissioner audio regen batched here.
4. **The Millbrook City Gazette** — Level 3 full send: newspaper styling, voting records, key moments, noir-humor superlatives, shareable screenshots. Crown jewel. Polish until water beads off it.

**Deferred:**
- Ambient music — revisit after everything else ships, amazeballs or nothing
- SFX + haptics — polish tier, ships with core or fast-follow
- Veto drama UI — polish tier

**Plans:**
1. `docs/v2/plans/2026-03-24-001-feat-commissioner-rename-plan.md` — **COMPLETE** (merged PR #2, deployed)
2. `docs/v2/plans/2026-03-24-002-feat-named-policy-cards-plan.md` — **DEEPENED** (6 agents, PolicyCard carries name, 384x512 WebP, policyHistory added)
3. `docs/v2/plans/2026-03-24-003-feat-narrator-variant-pool-plan.md` — **DEEPENED** (9 agents + 3 web searches. Decisions locked: tiered variants, Opus format, intro included)
4. `docs/v2/plans/2026-03-24-004-feat-millbrook-city-gazette-plan.md` — **DEEPENED** (8 agents + 3 web searches. Decisions locked: server-side history, button trigger, phone Gazette deferred)

**Cross-plan findings (from all 4 deepenings):**
- SW cache limits must increase: assets 50→100, audio 100→500, add dedicated card cache
- Server-side cumulative `policyHistory` + `voteHistory` needed for Gazette — **DECIDED: yes, ~4 small server changes**
- Sanitized events should unsanitize at game-over for Gazette key moments — **DECIDED: yes**
- ART_VERSION should be centralized before adding 30+ card images
- WAV→Opus audio conversion (46MB→3.9MB) — **DECIDED: adopt Opus**
- Replace html2canvas with @zumer/snapdom for Gazette screenshots
- Workbox maxEntries: 100→300+, handler: StaleWhileRevalidate→CacheFirst

**Next steps:**
1. `/ce:work` — Execute Plan 2 (Named Policy Cards)

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
- **Narrator audio still says "Police Chief"** — spoken WAV content not updated yet. Batched with ADR-V2-03 (narrator variant pool). Display text is correct.

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
