# Undercover Mob Boss

**Status: COMPLETE** — the masterpiece. Deployed, playtested, trailered.

A digital-physical social deduction game for 5-10 players in the same room. 1940s noir city infiltration theme — a fully original adaptation of Secret Hitler (CC BY-NC-SA 4.0).

Players use their phones as private information devices while a shared screen (tablet, TV, or laptop) displays public game state. Phones eliminate the "close your eyes" trust system — role reveals, voting, and private information are all handled digitally. The social deduction and lying-to-your-face remains purely physical.

## Trailer

**[Watch the trailer on YouTube](https://youtu.be/RlmoHOemOLM)** — Spec-Driven Development. 100% autonomous SDLC. That is the product.

It started at game night. A card game everyone loved that deserved a screen instead of a table. One human director (enterprise dev, zero game dev experience) and one AI engineer (Claude Code). The trailer tells that story.

## Fully Autonomous SDLC

This project is an exercise in **fully autonomous software development**. Every line of code, every asset, every narrator voiceover, every test — produced entirely by AI agents (Claude Code). Briggsy is ATC (Air Traffic Control) — he directs, reviews, and approves. He doesn't write code, generate art, or run commands. The agents fly the plane. Test-driven development throughout — 1,341 tests across unit, integration, and E2E.

| Stat | Count |
|------|------:|
| Lines of spec | ~14,650 |
| Lines of source code | ~14,000 (TS) + ~6,400 (HTML/CSS) |
| Lines of test code | ~17,900 |
| Tests passing | 1,341 (843 unit + 498 E2E) |
| AI-generated assets | 161 (53 images + 91 narrator OGGs + 17 trailer WAVs) |
| Cups of coffee | 347 |
| Hours of sleep lost | 163 |
| JIRA tickets | 0 |
| Project managers | 0 |
| Stack Overflow visits | 0 |
| Meetings scheduled | 0 |
| Game dev experience (years) | 0 |
| Lines of code written by Briggsy | 0 |

The trailer itself was built with [Remotion](https://remotion.dev) — programmatic video from React. 9 scenes, 15 AI-generated narrator voiceovers, 3 AI-generated images, all composed in TypeScript. See `videos/trailer/` for the source.

## Play Now

**[undercover-mob-boss.vercel.app](https://undercover-mob-boss.vercel.app)** — open on a tablet or laptop to host. Players join on their phones via QR code.

## Local Development

```bash
pnpm install
pnpm run dev              # Vite dev server (player app)
npx partykit dev          # WebSocket server (game rooms)
```

- **Host view:** `http://localhost:5173/host`
- **Player view:** `http://localhost:5173`
- **Join via room code:** `http://localhost:5173/join/<CODE>`

## How It Works

| Device | Role |
|--------|------|
| Shared screen (tablet/laptop/TV) | Host view — policy tracks, election tracker, vote results, game narration |
| Each player's phone | Player view — private role, vote, policy cards, executive power actions |

The host device runs the authoritative game server via PartyKit. Players connect over WebSocket by entering a 4-letter room code or scanning a QR code. No accounts, no app install — just a browser.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Build | Vite 8 + TypeScript 5.9 |
| Multiplayer | PartyKit (WebSocket rooms) |
| Animations | GSAP 3 |
| Testing | Vitest 4 (unit/integration) + Playwright (E2E) |
| Assets | Gemini Imagen 4 (pre-generated) |
| Narration | Gemini 2.5 Flash TTS, Charon voice (pre-generated) |
| Hosting | Vercel (client) + Cloudflare Workers via PartyKit (server) |

## Project Structure

```
src/
  client/           Browser-side code (views, audio, state, animations)
    host/           Host/table view (shared screen)
    views/          Player phone views
    audio/          Narrator + ambient audio engine
    components/     Shared UI components
  server/           PartyKit server (room logic, game engine)
  shared/           Types shared between client + server
public/
  assets/           AI-generated images (30 card art + 16 game + 7 trailer)
  audio/            Pre-generated narrator audio (91 game OGGs + 15 V3 trailer WAVs)
  how-to-play.html  Player-facing rules (GSAP-animated, standalone)
scripts/            Asset generation pipelines (Imagen 4, Gemini TTS)
videos/
  trailer/          Remotion video project (cinematic trailer)
tests/
  unit/             Game engine unit tests (24 files)
  integration/      Full-game simulations + stress tests
  e2e/              Playwright browser tests (15 specs)
docs/
  shared/user/      How-to-play guide (markdown source)
  v1/spec/          V1 specification (LOCKED)
  v1/verification/  Rules checklist, test evidence
  v2/spec/          V2 specification (LOCKED)
```

## Commands

```bash
pnpm run dev              # Vite dev server
pnpm run build            # Production build
pnpm run test             # Unit + integration tests (843 tests)
pnpm run test:e2e         # Playwright E2E (498 tests across 4 browsers)
pnpm run typecheck        # tsc --noEmit
pnpm run generate-assets  # Regenerate images via Imagen 4
pnpm run generate-narrator # Regenerate narrator audio via Gemini TTS
```

## Test Coverage

| Layer | Tests | What it proves |
|-------|-------|---------------|
| Unit | 843 | Game engine logic, role distribution, deck mechanics, executive powers, projections, routing |
| Integration | (included above) | Full games to completion, 300+ randomized simulations, state invariants at every dispatch |
| E2E | 498 | Complete game flows across Chromium, WebKit, Mobile Chrome, Mobile Safari |
| Rules verification | 209/209 | Every discrete Secret Hitler rule mapped to code + tests |

## Theme Mapping

| Secret Hitler | Undercover Mob Boss |
|--------------|-------------------|
| Liberal | Citizen |
| Fascist | Mob Soldier |
| Hitler | Mob Boss |
| President | Mayor |
| Chancellor | Commissioner |
| Liberal Policy | Virtuous Policy |
| Fascist Policy | Corrupt Policy |

## Environment Variables

Copy `.env.example` to `.env`. Requires:
- `GEMINI_API_KEY` — Gemini API with billing enabled (asset + TTS generation only, not needed for gameplay)

## License

CC BY-NC-SA 4.0 — Based on Secret Hitler by Goat, Wolf, & Cabbage. Game mechanics adapted under Creative Commons license. All visual assets, audio, code, and theme are original.
