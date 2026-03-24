# TODO

## Current Session: 2026-03-24

### V2 — Brainstorm COMPLETE, Spec LOCKED

**Docs:**
- Brainstorm: `docs/v2/ideation/BRAINSTORM.md` (debate complete)
- Spec: `docs/v2/spec/SPEC.md` (locked)

**Locked V2 Core Features:**
1. **Named policy cards** — Virtuous/Corrupt, noir-fictional names, 30+ unique illustrations, randomized pool per game (cosmetic only, deck math unchanged)
2. **Commissioner rename** — Police Chief → Commissioner, batched with audio regen
3. **Narrator variant pool** — 8-10 variants per trigger, built incrementally (~100 API calls/day)
4. **The Millbrook City Gazette** — Level 3 full send: newspaper styling, voting records, key moments, noir-humor superlatives, shareable screenshots. Crown jewel. Polish until water beads off it.

**Deferred:**
- Ambient music — revisit after everything else ships, amazeballs or nothing
- SFX + haptics — polish tier, ships with core or fast-follow
- Veto drama UI — polish tier

**Next steps:**
1. `/ce:plan` — Create phase-by-phase implementation plans
2. `/deepen-plan` — Enhance with parallel research
3. `/ce:work` — Execute serially

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
- **Harry's generation scripts** — `generate-mob-boss-alts.ts` and `generate-mob-boss-v2.ts` have pre-existing typecheck errors (loose null handling). One-off scripts, not game code.
- **Asset cache version** — `ART_VERSION = 2` in `role-reveal.ts` and `role-peek.ts`. Bump when role art changes.
- **CSP allows `'unsafe-inline'`** for HTP GSAP animations
- **E2E flaky test** — `simultaneous-actions.spec.ts:480` WebKit only (test harness timing, not game defect)
- **`/host` URL serves player app in Vite dev** — use `/host.html` instead
- **Grace period:** 0ms dev, 30s prod
- **Remotion publicDir** points to `../../public` — if the video project moves, update `remotion.config.ts`

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
