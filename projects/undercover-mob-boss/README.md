# Undercover Mob Boss

A digital-physical social deduction game for 5-10 players in the same room. 1940s noir city infiltration theme — a fully original adaptation of Secret Hitler (CC BY-NC-SA 4.0).

Players use their phones as private information devices while a shared screen (tablet, TV, or laptop) displays public game state. Phones eliminate the "close your eyes" trust system — role reveals, voting, and private information are all handled digitally. The social deduction and lying-to-your-face remains purely physical.

## Quick Start

```bash
pnpm install
pnpm run dev              # Vite dev server (player app)
npx partykit dev          # WebSocket server (game rooms)
```

- **Host view:** `http://localhost:5173/host.html`
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
| Hosting | Vercel |

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
  assets/           AI-generated images (15 PNGs)
  audio/            Pre-generated narrator WAVs (39 lines)
scripts/            Asset generation pipelines (Imagen 4, Gemini TTS)
tests/
  unit/             Game engine unit tests (19 files)
  integration/      Full-game simulations + stress tests
  e2e/              Playwright browser tests (15 specs)
docs/
  spec/             Product specification (LOCKED)
  verification/     Rules checklist, test evidence
  user/             How-to-play guide
```

## Commands

```bash
pnpm run dev              # Vite dev server
pnpm run build            # Production build
pnpm run test             # Unit + integration tests (760 tests)
pnpm run test:e2e         # Playwright E2E (125 tests x 4 browsers = 500)
pnpm run typecheck        # tsc --noEmit
pnpm run generate-assets  # Regenerate images via Imagen 4
pnpm run generate-narrator # Regenerate narrator audio via Gemini TTS
```

## Test Coverage

| Layer | Tests | What it proves |
|-------|-------|---------------|
| Unit | 760 | Game engine logic, role distribution, deck mechanics, executive powers, projections, routing |
| Integration | (included above) | Full games to completion, 300+ randomized simulations, state invariants at every dispatch |
| E2E | 500 | Complete game flows across Chromium, WebKit, Mobile Chrome, Mobile Safari |
| Rules verification | 209/209 | Every discrete Secret Hitler rule mapped to code + tests |

## Theme Mapping

| Secret Hitler | Undercover Mob Boss |
|--------------|-------------------|
| Liberal | Citizen |
| Fascist | Mob Soldier |
| Hitler | Mob Boss |
| President | Mayor |
| Chancellor | Chief |
| Liberal Policy | Good Policy |
| Fascist Policy | Bad Policy |

## Environment Variables

Copy `.env.example` to `.env`. Requires:
- `GEMINI_API_KEY` — Gemini API with billing enabled (asset + TTS generation only, not needed for gameplay)

## License

CC BY-NC-SA 4.0 — Based on Secret Hitler by Goat, Wolf, & Cabbage. Game mechanics adapted under Creative Commons license. All visual assets, audio, code, and theme are original.
