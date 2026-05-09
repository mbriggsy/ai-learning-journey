---
aliases: [undercover-mob-boss, UMB, mob-boss]
tags: [project, complete]
---

# Undercover Mob Boss

**Status: COMPLETE** — the masterpiece. Deployed, playtested, trailered.

A digital-physical social deduction game for 5-10 players in the same room. 1940s noir city infiltration theme — a fully original adaptation of Secret Hitler (CC BY-NC-SA 4.0).

## Project Map

> Internal docs surfaced for the Obsidian graph. The full README continues below.

- [[CLAUDE|CLAUDE.md]] — Claude's working agreement for this project
- [[TODO]] — what's left
- **Specs** (locked): [[docs/v1/spec/SPEC|v1 SPEC]] · [[docs/v2/spec/SPEC|v2 SPEC]]
- **Player-facing:** [[docs/shared/user/HOW-TO-PLAY|HOW-TO-PLAY]]
- **V1 verification:** [[docs/v1/EVIDENCE|EVIDENCE]] · [[docs/v1/verification/sh-rules-checklist|Secret Hitler rules checklist]] · [[docs/v1/verification/verification-results|verification results]] · [[docs/v1/verification/TEST-EVIDENCE|test evidence]]
- **V1 playtests / QA:** [[docs/v1/playtest-round-3|playtest round 3]] · [[docs/v1/QA-ISSUES|QA issues]]
- **V1 ideation:** [[docs/v1/ideation/CONCEPT|CONCEPT]] · [[docs/v1/ideation/BRAINSTORM|BRAINSTORM]] · [[docs/v1/ideation/TOOLING-IDEAS|TOOLING-IDEAS]]
- **V1 plans (7 phases):** [[docs/v1/plans/2026-03-16-001-feat-phase-0-asset-generation-plan|phase 0 assets]] · [[docs/v1/plans/2026-03-16-002-feat-phase-1-game-engine-plan|phase 1 engine]] · [[docs/v1/plans/2026-03-16-003-feat-phase-2-multiplayer-plan|phase 2 multiplayer]] · [[docs/v1/plans/2026-03-16-004-feat-phase-3-player-view-plan|phase 3 player view]] · [[docs/v1/plans/2026-03-16-005-feat-phase-4-host-table-view-plan|phase 4 host view]] · [[docs/v1/plans/2026-03-16-006-feat-phase-5-audio-polish-plan|phase 5 audio]] · [[docs/v1/plans/2026-03-16-007-feat-phase-6-deployment-plan|phase 6 deploy]]
- **V1 environment:** [[docs/v1/env-setup/ENVIRONMENT-SETUP|env setup]] · [[docs/v1/env-setup/VIDEO-ENVIRONMENT-SETUP|video env setup]]
- **V2 ideation:** [[docs/v2/ideation/BRAINSTORM|BRAINSTORM]] · [[docs/v2/ideation/SKILL-IDEA-voice-over|voice-over skill idea]]
- **V2 plans:** [[docs/v2/plans/2026-03-24-001-feat-commissioner-rename-plan|commissioner rename]] · [[docs/v2/plans/2026-03-24-002-feat-named-policy-cards-plan|named policy cards]] · [[docs/v2/plans/2026-03-24-003-feat-narrator-variant-pool-plan|narrator variant pool]] · [[docs/v2/plans/2026-03-24-004-feat-millbrook-city-gazette-plan|Millbrook City Gazette]]
- **Brainstorms:** [[docs/v1/brainstorms/2026-03-16-deck-reshuffle-brainstorm|deck reshuffle]]

---

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
  how-to-play.html  Player-facing rul