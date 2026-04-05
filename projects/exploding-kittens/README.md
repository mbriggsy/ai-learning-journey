# Exploding Kittens Digital

A digital adaptation of [Exploding Kittens Party Pack](https://www.explodingkittens.com/) — Jackbox-style, played in the same room. One shared screen (TV/laptop) shows the game table. Each player uses their phone as a private controller.

## Status

**Pre-development** — roadmap locked, phase plans written (not yet deepened).

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
| Validation | Zod |
| Build | Vite 8 + pnpm |
| Testing | Vitest + fast-check + Playwright |

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
  plans/           # Roadmap + individual phase plans
  environment/     # Setup guides
  insights/        # Hard-won lessons (populated during development)
  user/            # Game rules reference (Party Pack PDF)
src/               # Source code (not yet created)
  server/          # PartyKit server + game engine
  client/          # React apps (board + player)
  shared/          # Shared TypeScript types + Zod schemas
```

## Setup

See [docs/environment/SETUP.md](docs/environment/SETUP.md) for development environment setup.

## Build Workflow

We follow a deliberate plan-then-build process. No code gets written until the plan for that phase has been deepened with focused research agents.

```
Brainstorm → Roadmap → Phase Plans → Deepen Each → Fix Contradictions → Execute
```

### How It Works

1. **[Roadmap](docs/plans/roadmap.md)** — high-level overview: tech stack, architecture, state machine, cross-cutting concerns, phase summary
2. **Phase plans** — one file per phase with detailed tasks, key files, tests, and done-when criteria
3. **Deepen each plan** — focused research agents probe each phase individually (framework docs, best practices, edge cases, security, performance)
4. **Fix contradictions** — resolve conflicts across all 6 plans before writing any code
5. **Execute sequentially** — one phase at a time, tests pass before moving on

### Phase Status

| # | Phase | Plan | Planned | Deepened | Executed | Reviewed |
|---|-------|------|---------|----------|----------|----------|
| 1 | Foundation | [phase-1](docs/plans/phase-1-foundation.md) | 04-05 11:41AM | | | |
| 2 | Game Engine | [phase-2](docs/plans/phase-2-game-engine.md) | 04-05 11:41AM | | | |
| 3 | Networking + Lobby | [phase-3](docs/plans/phase-3-networking-lobby.md) | 04-05 11:41AM | | | |
| 4 | Core Game UI | [phase-4](docs/plans/phase-4-core-game-ui.md) | 04-05 11:41AM | | | |
| 5 | Visual & Animation | [phase-5](docs/plans/phase-5-visual-animation.md) | 04-05 11:41AM | | | |
| 6 | Hardening & Deploy | [phase-6](docs/plans/phase-6-hardening-deploy.md) | 04-05 11:41AM | | | |

## Reference

- [Brainstorm](docs/ideation/2026-04-05-exploding-kittens-digital-brainstorm.md) — all design decisions and rationale
- [Roadmap](docs/plans/roadmap.md) — tech stack, architecture, state machine, cross-cutting concerns
- [Party Pack Rules](docs/user/ekpp-instructions-english.pdf) — official game rules
- [UMB Architecture](../undercover-mob-boss/) — reference patterns for multi-device infrastructure
