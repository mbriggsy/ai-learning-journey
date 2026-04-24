# BURNED

A spy-comedy card game — rethemed from [Exploding Kittens Party Pack](https://www.explodingkittens.com/), set in the world of The Pendleton Agency. Jackbox-style: one shared screen (TV/laptop) shows the game table, each player uses their phone as a private controller.

## Status

**Engine + networking + core UI shipped.** Active work is the visual layer rebuild and playtest harness.

- All tests green, typecheck clean (canonical counts in `CLAUDE.md`)
- Phone initial JS under the 100 KB gzipped budget (see `CLAUDE.md` §Bundle Sizes for current measurement)
- Contract: [`docs/PRODUCT-SPECIFICATION.md`](docs/PRODUCT-SPECIFICATION.md) (v1.0 — LOCKED)
- Current work queue: [`TODO.md`](TODO.md)

## The Game

- **2-10 players**, full deck (120 cards, all card types)
- **Shared screen** shows draw pile, discard pile, player ring, and all the drama
- **Phone controllers** show your hand, let you play cards, and keep your moves secret
- **Archer visual language** — literal show vocabulary: bold line illustration, flat color fills, warm teal/orange/cream palette, CVD-safe. Every screen answers "could this be a frame from an Archer episode?"
- **10-second Intercept window** — flat across player counts; breathing room over twitch reflex.

## Tech Stack

| Layer | Choice |
|-------|--------|
| Networking | `partyserver` + `wrangler` (Cloudflare Workers Durable Objects) |
| UI | React 19 + TypeScript 5.9 |
| Animation | Framer Motion (LazyMotion) |
| Validation | Zod (at the WebSocket boundary, server-side) |
| Build | Vite 8 + pnpm |
| Testing | Vitest + fast-check + Playwright |

## Architecture

Jackbox-style: one codebase, two entry points.

- `board.html` — TV/shared screen (landscape). Shows the game table, player status, card animations.
- `player.html` — Phone controller (portrait). Shows your hand, card interactions, private views.
- `partyserver` room (Cloudflare Durable Object) — authoritative game state. Clients send intents; server validates, dispatches, and broadcasts per-viewer projections.

Patterns adapted from [Undercover Mob Boss](../undercover-mob-boss/), which uses the same multi-device architecture.

## Project Structure

```
docs/
  PRODUCT-SPECIFICATION.md  # The contract (v1.0 LOCKED)
  RULES-REFERENCE.md        # Canonical rules, audited against the official PDF
  SETUP.md                  # Dev environment
  insights/                 # Hard-won lessons, numbered
  plans/                    # Active: css-foundation-rebuild/, playtest-harness/, desk-redesign/
    _archive/               #   Completed historical plans
  testing/                  # Issue lists, PRDs
  user/                     # Official Party Pack rulebook PDF
src/
  shared/                   # Pure TS types, card definitions, protocol, constants (zero runtime deps)
  server/                   # partyserver room + game engine (Zod validation server-only)
  client/
    board/                  # TV/shared screen React app
    player/                 # Phone controller React app
    shared/                 # Shared React components, tokens, hooks
```

## Setup

See [docs/SETUP.md](docs/SETUP.md).

## Reference

- [Product Specification](docs/PRODUCT-SPECIFICATION.md) — the contract (v1.0 LOCKED 2026-04-10). Every decision traces here.
- [Rules Reference](docs/RULES-REFERENCE.md) — canonical rules audited against the official PDF; BURNED ↔ EK terminology mapping.
- [Party Pack Rulebook](docs/user/ekpp-instructions-english.pdf) — primary rules source.
- [CLAUDE.md](CLAUDE.md) — project conventions, engine invariants, landmines.
- [UMB Architecture](../undercover-mob-boss/) — reference patterns for multi-device infrastructure.
- Genesis (SUPERSEDED by the spec, kept for provenance): [`docs/ideation/`](docs/ideation/) — original brainstorm, art-direction brainstorm, visual-layer autopsy.
