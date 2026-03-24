# TODO

## Last Session: 2026-03-23 (Trailer v2 + Bug Fixes + V1 Complete)

### What was done

**Trailer v2 — narration overhaul:**
- Rewrote $2 line: "Fifteen images. Thirty-nine voice lines. All of it... two dollars."
- Added sleep dep joke: "The human ran on anger and adrenaline. The AI just... ran."
- Added AI bar tab: "And the AI bar tab... still open."
- Changed timeline: "From an empty page... to a city full of secrets." (was "city that never sleeps")
- Moved narration to play over stat roll-up, added 1.2s beat after token bill
- Cut S09 (The Concept) — tighter pacing, now 13 scenes
- Title card: M wax seal monogram replaces broken icon placeholder
- "No app. No install." now readable (cream + shadow)
- Extended S14 so closing audio doesn't clip
- YouTube v2: https://youtu.be/y9irCLLg3Mo (v1 unlisted: https://youtu.be/aePKLeeQm9g)

**Bug fixes:**
- QR code player join: changed from `/?room=XXXX` to `/join/XXXX` to avoid root→host redirect catching player URLs
- Root URL redirect restored: `/` → `/host` (hosts type the URL, players scan QR)
- Mob boss artwork cache: busted immutable cache with `?v=2` query param, fixed Vercel cache headers (was `immutable, 1yr` → now `max-age=3600, stale-while-revalidate=86400`), removed images/audio from SW precache
- Card shift on role reveal: absolutely positioned allies info below card
- Card sliding on mobile: locked role-reveal screen with `overflow: hidden` + `overscroll-behavior: none`

**Mob boss artwork** (Harry + Briggsy's daughter):
- New "The Dealer" artwork: bourbon, closed smile, gold rings
- Original backed up as `role-mob-boss-original.png`
- Alt variants stored in assets

**Docs audit:**
- README: trailer stats corrected (13 scenes, 13 narrator lines, 13 game images)
- EVIDENCE.md: commit count, image/audio counts updated
- CLAUDE.md: screenshot path fixed, squeaky clean protocol added, git noise suppressed

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

### Known discrepancy
The trailer voiceover says "Fifteen images" and the S13 stat counter shows 15. Reality is 13 game images. The voiceover is baked audio — recommend leaving the trailer as a V1 time capsule rather than regenerating.

---

## V1 STATUS: COMPLETE

Game is live at **undercover-mob-boss.vercel.app**. Trailer v2 live on YouTube. All docs current.

---

## V2 ROADMAP

### Priority 1: Narrator variant pool
- Multiple lines per trigger, randomly selected each game
- Increases replayability — same game, different narrator personality each time
- Infrastructure exists in `narrator-prompts.ts` — needs pool selection logic in `narrator-bridge.ts`

### Priority 2: Ambient music layer
- Noir jazz underscore during gameplay (low, atmospheric)
- Tension variant for voting/executive power phases
- Need: `ambient-base.wav`, `ambient-tension.wav`
- Consider Suno or Gemini for generation

### Priority 3: Sound effects polish
- Card flip sounds, vote reveal stingers, policy enact flourishes
- Haptic + audio feedback pairing
- Victory/defeat music stingers

### Priority 4: Game configuration
- Adjustable player count rules (house rules mode)
- Custom theme colors
- Speed settings (timer durations)

### Priority 5: Spectator mode
- Watch-only view for non-players
- See public game state without a phone
- Good for parties with observers

---

## V3 — BATSHIT CRAZY

### AI narrator goes live
- Real-time Gemini TTS narrator that reacts to actual game events
- "The mayor nominated the man who just investigated him... bold move, or a death wish?"
- Dynamic commentary based on vote patterns, policy streaks, alliances
- The narrator KNOWS the roles — drops cryptic hints without spoiling

### AI players
- NPCs that can fill empty seats with AI-generated personas
- Each has a personality (aggressive accuser, quiet observer, chaos agent)
- They argue, lie, and vote with strategy
- Solo mode: you vs. 4-9 AI players

### Dynamic city map
- Millbrook City evolves based on policies enacted
- Good policies: lights come on, streets clean up, citizens appear
- Bad policies: shadows deepen, buildings decay, mob graffiti spreads
- The host screen becomes a living painting

### AR mode
- Hold phone camera over the physical table
- AR overlays show vote tallies, policy tracks, role hints
- "See" the city through your phone — buildings rise from the table surface

### Cross-room tournaments
- Multiple rooms playing simultaneously
- Winners from each room advance to a final table
- Leaderboard across games — trust score, deception score, accuracy

### Procedural noir story
- Each game generates a unique narrative arc
- Names, locations, backstories for every player
- Post-game "case file" summary: "The Mayor's Gambit — A Millbrook City Story"
- Shareable as a generated PDF or social card

### Live stream integration
- Twitch/YouTube mode with audience voting
- Chat can vote on executive powers
- Streamer sees a special dashboard with all roles (delay-safe)

### Voice-activated gameplay
- "I vote approve" — phone recognizes voice commands
- "I nominate Sarah" — hands-free nomination
- Accessibility win + feels immersive

### The Speakeasy
- Persistent meta-game between sessions
- Players earn "reputation" across games
- Unlock narrator voices, card backs, city themes
- "You've played 50 games. The city remembers you."

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
