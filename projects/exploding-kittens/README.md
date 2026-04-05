# Exploding Kittens Digital

A digital adaptation of [Exploding Kittens Party Pack](https://www.explodingkittens.com/) — Jackbox-style, played in the same room. One shared screen (TV/laptop) shows the game table. Each player uses their phone as a private controller.

## Status

**Phase 1 complete + reviewed** — project scaffolded, 12/12 tests passing, ~71KB gzipped phone bundle. Executing Phase 2 next.

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
  rules/           # Canonical rules reference (audited against official PDF)
  user/            # Official Party Pack rulebook PDF
src/
  shared/          # Pure TS types, card definitions, protocol, constants (zero runtime deps)
  server/          # PartyKit room + game engine (Zod validation server-only)
  client/
    board/         # TV/shared screen React app
    player/        # Phone controller React app
    shared/        # Shared React components (MotionProvider, hooks)
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
| 1 | Foundation | [phase-1](docs/plans/phase-1-foundation.md) | 04-05 11:41AM | 04-05 1:30PM | 04-05 4:04PM | 04-05 6:12PM |
| 2 | Game Engine | [phase-2](docs/plans/phase-2-game-engine.md) | 04-05 11:41AM | 04-05 2:45PM | | |
| 3 | Networking + Lobby | [phase-3](docs/plans/phase-3-networking-lobby.md) | 04-05 11:41AM | 04-05 3:45PM | | |
| 4 | Core Game UI | [phase-4](docs/plans/phase-4-core-game-ui.md) | 04-05 11:41AM | 04-05 6:30PM | | |
| 5 | Visual & Animation | [phase-5](docs/plans/phase-5-visual-animation.md) | 04-05 11:41AM | 04-05 8:45PM | | |
| 6 | Hardening & Deploy | [phase-6](docs/plans/phase-6-hardening-deploy.md) | 04-05 11:41AM | 04-05 11:30PM | | |

## Reference

- [Brainstorm](docs/ideation/2026-04-05-exploding-kittens-digital-brainstorm.md) — all design decisions and rationale
- [Roadmap](docs/plans/roadmap.md) — tech stack, architecture, state machine, cross-cutting concerns
- [Rules Reference](docs/rules/RULES-REFERENCE.md) — canonical rules (audited against official PDF)
- [Party Pack Rulebook](docs/user/ekpp-instructions-english.pdf) — official PDF (primary source)
- [UMB Architecture](../undercover-mob-boss/) — reference patterns for multi-device infrastructure
