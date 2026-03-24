# TODO

## Current Session: 2026-03-24

### V2 — Plan 2 IN PROGRESS (code complete, art 11/30)

**Branch:** `feat/named-policy-cards` (7 commits, not yet merged)

**What we did:**
- Full PolicyCard type system: `PolicyCard { type, cardId, name }`, `PolicyHistoryEntry`, 30 noir card names
- Engine migration: `selectCardPool(rng)`, `createDeck` → PolicyCard[], lastEnactedPolicy bug fixed (throw on null)
- Cumulative `policyHistory` added (feeds Gazette in Plan 4)
- Projection + protocol updated: `lastEnactedPolicy` + `policyHistory` projected to HostState
- 5 render sites updated with per-card art + name display + fallback
- Card preloading at lobby→role-reveal + SW card-cache (CacheFirst, 100 entries) + audio-cache bumped 100→500
- All 775 tests pass (15 new card pool tests)
- Art pipeline extended: WebP format, outputSubDir, dark noir background (no chroma-key)
- 11/30 card art generated with dark noir background, zero pink tint

**What's left (next session):**
1. **Generate remaining 19 card images** — daily Imagen 4 quota exhausted (70 req/day). Run this command after quota resets:
   ```bash
   set -a && source .env && set +a
   npx tsx scripts/generate-assets.ts \
     --only school-lunch-program --only harbor-cleanup-initiative \
     --only free-clinic-act --only streetcar-modernization \
     --only waterfront-promenade --only community-garden-act \
     --only bridge-safety-inspection --only school-music-program \
     --only sidewalk-lamp-project --only emergency-relief-fund \
     --only dockside-kickback-scheme --only casino-license-fast-track \
     --only evidence-locker-purge --only prohibition-expansion \
     --only union-bust-authorization --only slum-clearance-racket \
     --only midnight-rezoning-act --only witness-relocation-program \
     --only police-pension-siphon
   ```
2. **Review all 30 cards** — visual quality check, regenerate any duds
3. **Add asset-existence test** — verify every pooled cardId has matching file
4. **Add `.policy-card__name` CSS** — style the card name labels (currently unstyled)
5. **Verification gate** — typecheck, tests, build, grep for stale policy-good/bad refs
6. **PR + merge**

**Docs:**
- Brainstorm: `docs/v2/ideation/BRAINSTORM.md` (debate complete)
- Spec: `docs/v2/spec/SPEC.md` (locked)

**Locked V2 Core Features:**
1. **Commissioner rename** — COMPLETE. Merged to main, deployed.
2. **Named policy cards** — IN PROGRESS (code complete, art 11/30)
3. **Narrator variant pool** — PLANNED
4. **The Millbrook City Gazette** — PLANNED

**Deferred (polish tier):**
- Ambient music — amazeballs or nothing
- SFX + haptics
- Veto drama UI
- PWA app icon — `public/assets/icon-512.png` is a placeholder black square. Needs real art (lobby seal or custom design)

**Plans:**
1. `docs/v2/plans/2026-03-24-001-feat-commissioner-rename-plan.md` — **COMPLETE**
2. `docs/v2/plans/2026-03-24-002-feat-named-policy-cards-plan.md` — **EXECUTING** (code done, art in progress)
3. `docs/v2/plans/2026-03-24-003-feat-narrator-variant-pool-plan.md` — **DEEPENED**
4. `docs/v2/plans/2026-03-24-004-feat-millbrook-city-gazette-plan.md` — **DEEPENED**

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
- **Imagen 4 daily quota:** 70 requests/day on paid tier 1. Plan card generation across sessions, not all at once.
- **`.policy-card__name` CSS missing** — name labels added to DOM but no styles yet. Cards will show raw text until styled.

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
