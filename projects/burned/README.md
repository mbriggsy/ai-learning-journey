# BURNED

A spy-comedy card game — rethemed from [Exploding Kittens Party Pack](https://www.explodingkittens.com/), set in the world of The Pendleton Agency. Jackbox-style: one shared screen (TV/laptop) shows the game table, each player uses their phone as a private controller.

## Status

**All 6 phases complete + adversarial swarm review** — 358/358 tests, typecheck clean, ~97.5KB phone JS (under 100KB budget). Next: art direction brief, Gauntlet recalibration, manual testing on real devices, first production deploy.

## The Game

- **2-10 players**, full deck (120 cards, all card types)
- **Shared screen** shows draw pile, discard pile, player ring, and all the drama
- **Phone controllers** show your hand, let you play cards, and keep your moves secret
- **Archer visual language** — literal show vocabulary: bold line illustration, flat color fills, warm teal/orange/cream palette, CVD-safe. Every screen answers "could this be a frame from an Archer episode?"
- **Smart Intercept timing** — tension scales as players are eliminated (3s/5s/7s windows)

## Tech Stack

| Layer | Choice |
|-------|--------|
| Networking | partyserver + wrangler (Cloudflare Workers Durable Objects) |
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
  workflow/        # Code review strategy, design skills
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

All 6 phases planned, deepened, executed, and reviewed. See [roadmap.md](docs/plans/roadmap.md) for full timeline and phase links.

## Reference

- [Brainstorm](docs/ideation/2026-04-05-burned-brainstorm.md) — all design decisions and rationale
- [Roadmap](docs/plans/roadmap.md) — tech stack, architecture, state machine, cross-cutting concerns
- [Rules Reference](docs/rules/RULES-REFERENCE.md) — canonical rules (audited against official PDF)
- [Party Pack Rulebook](docs/user/ekpp-instructions-english.pdf) — official PDF (primary source)
- [Code Review Strategy](docs/workflow/CODE-REVIEW.md) — which review tools, when to use each
- [UMB Architecture](../undercover-mob-boss/) — reference patterns for multi-device infrastructure
