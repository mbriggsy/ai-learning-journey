# TODO

## Trailer V3.1 — "Spec-Driven Development" — COMPLETE

### Session 2026-03-27 (V3.1 Narrative Rework + Spectacular S06 + HTP Finale)

**Status: SHIPPED**

**What we did:**
- Major narrative rework across 9 scenes — SDD thesis pivot
- S02: "everyone loved" (was "the whole table loved")
- S03: Short punchy spec line, counters moved to S04
- S04: Challengers absorb spec details — assumptions, transitions, phases, edge cases
- S04: New war room ops center image (ATC Briggsy, headset, leaned back observing)
- S05: Added "tested by machines" to the chain
- S06: SPECTACULAR redesign — SimulationChaos (280 cards, seeded RNG, 13 assets), GamesCounter (0→1,331), CompactTerminalStrip, error flashes, THE FREEZE, "NOTHING BROKE." with gold rule
- S07: "including this one... even this video... created by autonomous AI agents" — two-beat text reveal
- S08: Split "He's fine. Probably." with 45f comedic beat, added test LOC + meetings stat (7/7 balanced)
- S09+S10 collapsed into finale: HTP full-page scroll as background + SDD thesis + "Trust no one" fade to black
- 9 new/updated narrator WAVs, 3 new components, 1 new Imagen image, HTP capture script
- Total duration: 4440f / 148s / 2:28

**Scene breakdown (4440f / 148s):**
| # | Scene | Duration | Content |
|---|-------|----------|---------|
| S01 | Cold Open | 4.7s | Black screen, typewriter: "Briggsy didn't write..." |
| S02 | The Origin | 21.0s | Lone figure, game night → enterprise dev → the bet |
| S03 | The Spec | 10.0s | Spec scrolling, "the machine wrote the specification" |
| S04 | The Swarm | 23.0s | War room ATC image, challengers + "what survived" counters |
| S05 | The Code | 18.0s | Split terminals, "tested by machines" + ATC |
| S06 | The Tests | 19.7s | Card chaos simulation + terminals → THE FREEZE → "NOTHING BROKE." |
| S07 | The Art | 11.0s | Asset gallery, "even this video... autonomous AI agents" |
| S08 | The Punchline | 14.7s | 14-stat cascade (7/7) → "He's fine." ... beat ... "Probably." |
| S09 | The Finale | 26.0s | HTP scroll + SDD thesis + title + "Trust no one" fade to black |

**Trailer V3.1 rendered and uploaded to YouTube:** https://youtu.be/RlmoHOemOLM

### Session 2026-03-26 (V3 Original + Mob Boss Art)

Previous V3: https://youtu.be/psqg0a3fwvw (superseded by V3.1)

### Session 2026-03-26 (Mob Boss Art + Polish)

**What we did:**
- New mob boss portrait: menacing half-body, fedora, face in shadow, cigar, ring, bourbon
- Consolidated all mob boss prompts into asset-prompts.ts, deleted standalone scripts
- Solved proportional sizing: 78% scale on transparent canvas + vignette + edge fade (45.6% fill matching citizen/soldier)
- Asymmetric smoke edit (removed left-side smoke)
- Fixed chroma key artifacts (aggressive pink pixel cleanup)
- Bumped ART_VERSION to 4, HTP cache bust to v6
- Switched asset SW cache from StaleWhileRevalidate → NetworkFirst (fixes stale image serving)
- Updated README: stats table with silly stats, origin story framing, new YouTube link
- Updated TODO stats (117 narrator lines)

---

## V2 — COMPLETE. SHIPPED. PLAYTESTED.

**Tests:** 843 pass / 0 fail
**E2E:** 498 pass / 2 fail (all known WebKit timing — see Landmines)

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

Game is live at **undercover-mob-boss.vercel.app**. Trailer V3 live on YouTube.

---

## V3 — BATSHIT CRAZY

*(Live AI narrator, AI players, dynamic city map, AR mode, tournaments, procedural stories, voice commands, The Speakeasy, live stream integration)*

---

## Landmines
- **Asset cache version** — `ART_VERSION = 4` in `role-reveal.ts` and `role-peek.ts`. Bump when role art changes.
- **Asset SW cache** — now `NetworkFirst` (asset-cache-v3). Always fetches fresh, cache is offline fallback only.
- **CSP allows `'unsafe-inline'`** for HTP GSAP animations
- **E2E flaky tests** — 9 failures all in WebKit/Mobile Safari. Test harness timing, not game defects.
- **`/host` URL serves player app in Vite dev** — use `/host.html` instead
- **Grace period:** 0ms dev, 30s prod
- **Remotion publicDir** points to `../../public` — if the video project moves, update `remotion.config.ts`
- **Imagen 4 daily quota:** 70 requests/day on paid tier 1. Plan card generation across sessions.
- **TTS daily quota:** 100 requests/day for gemini-2.5-flash-tts. 117 narrator lines total — fits in one session if no retries.
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
pnpm run studio           # Preview in browser ("Trailer" composition)
pnpm run render           # → out/trailer-landscape.mp4
```
