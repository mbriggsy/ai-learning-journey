# Exploding Kittens Digital

A digital adaptation of [Exploding Kittens Party Pack](https://www.explodingkittens.com/) — Jackbox-style, played in the same room. One shared screen (TV/laptop) shows the game table. Each player uses their phone as a private controller.

## Status

**Pre-development** — brainstorm complete, implementation plan locked, environment not yet scaffolded.

## The Game

- **2-10 players**, full Party Pack (120 cards, all card types)
- **Shared screen** shows draw pile, discard pile, player ring, and all the drama
- **Phone controllers** show your hand, let you play cards, and keep your moves secret
- **Dark + premium** visual direction — glowing card edges, neon accents, theatrical explosions
- **Smart Nope timing** — tension scales as players are eliminated (3s/5s/7s windows)

## Tech Stack

| Layer | Choice |
|-------|--------|
| Networking | PartyKit (Cloudflare Workers) |
| UI | React 19 + TypeScript 5.9 |
| Animation | Framer Motion |
| Build | Vite 8 + pnpm |
| Testing | Vitest + Playwright |

## Architecture

Jackbox-style: one codebase, two entry points.

- `board.html` — TV/shared screen (landscape). Shows the game table, player status, card animations.
- `player.html` — Phone controller (portrait). Shows your hand, card interactions, private views.
- PartyKit server — authoritative game state. Clients send intents, server validates and broadcasts.

Patterns adapted from [Undercover Mob Boss](../undercover-mob-boss/), which uses the same multi-device architecture.

## Project Structure

```
docs/
  ideation/        # Brainstorm documents
  plans/           # Implementation plans
  environment/     # Setup guides
  insights/        # Hard-won lessons (populated during development)
  user/            # Game rules reference (Party Pack PDF)
src/               # Source code (not yet created)
  server/          # PartyKit server + game engine
  client/          # React apps (board + player)
  shared/          # Shared TypeScript types
```

## Setup

See [docs/environment/SETUP.md](docs/environment/SETUP.md) for development environment setup.

## Implementation Plan

Six phases — see [docs/plans/2026-04-05-001-feat-exploding-kittens-digital-card-game-plan.md](docs/plans/2026-04-05-001-feat-exploding-kittens-digital-card-game-plan.md) for full details.

1. **Foundation** — scaffold, types, card definitions
2. **Game Engine** — pure logic, all card effects, full test suite
3. **Networking + Lobby** — PartyKit rooms, join flow, first "it works"
4. **Core Game UI** — playable but ugly, all interactions functional
5. **Visual Design & Animation** — THE phase. Dark premium, theatrical reveals, 40%+ effort
6. **Hardening & Deploy** — reconnection, mobile browsers, E2E, deploy

## Reference

- [Brainstorm](docs/ideation/2026-04-05-exploding-kittens-digital-brainstorm.md) — all design decisions and rationale
- [Party Pack Rules](docs/user/ekpp-instructions-english.pdf) — official game rules
- [UMB Architecture](../undercover-mob-boss/) — reference patterns for multi-device infrastructure
