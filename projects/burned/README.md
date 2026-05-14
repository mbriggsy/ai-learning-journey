---
aliases: [burned, BURNED]
tags: [project, active]
---

# BURNED

A spy-comedy card game — rethemed from [Exploding Kittens Party Pack](https://www.explodingkittens.com/), set in the world of The Pendleton Agency. Jackbox-style: one shared screen (TV/laptop) shows the game table, each player uses their phone as a private controller.

## Project Map

- [CLAUDE.md](./CLAUDE.md) — project orientation, guardrails, conventions index
- [TODO.md](./TODO.md) — current work queue
- [compound-engineering.local.md](./compound-engineering.local.md) — local CE notes
- **The contract:** [PRODUCT-SPECIFICATION](./docs/PRODUCT-SPECIFICATION.md) (v1.0 LOCKED) · [RULES-REFERENCE](./docs/RULES-REFERENCE.md) · [SETUP](./docs/SETUP.md)
- **Player-facing:** [HOW-TO-PLAY](./howtoplay.html) — *Operations Manual* (Vite entry at `src/client/howtoplay/`) — opens at `/howtoplay.html` in dev, `/howtoplay` in prod
- **Operator docs:** [ARCHITECTURE](./docs/ARCHITECTURE.md) · [CONTRIBUTING](./CONTRIBUTING.md) · [DEPLOY](./docs/DEPLOY.md) (planned)
- **Domain conventions** (read on demand): [motion](./docs/conventions/motion.md) · [engine](./docs/conventions/engine.md) · [server](./docs/conventions/server.md) · [client](./docs/conventions/client.md) · [dev-environment](./docs/conventions/dev-environment.md) · [assets](./docs/conventions/assets.md)
- **Active plans (roadmaps):** [CSS foundation rebuild roadmap](./docs/plans/css-foundation-rebuild/roadmap.md) · [playtest harness roadmap](./docs/plans/playtest-harness/roadmap.md) · [desk redesign](./docs/plans/desk-redesign/PLAN.md)
- **Playtest harness phases:** [p1 scenarios](./docs/plans/playtest-harness/phase-1-scenarios.md) · [p2 playtest mode](./docs/plans/playtest-harness/phase-2-playtest-mode.md) · [p3 harness](./docs/plans/playtest-harness/phase-3-harness-infra.md) · [p4 seat agents](./docs/plans/playtest-harness/phase-4-seat-agents.md) · [p5 triage](./docs/plans/playtest-harness/phase-5-triage-agents.md) · [p6 calibration](./docs/plans/playtest-harness/phase-6-calibration-and-first-session.md) · [p7 rules cascade](./docs/plans/playtest-harness/phase-7-rules-coverage-cascade.md) · [coherence sweep](./docs/plans/playtest-harness/COHERENCE-SWEEP.md) · [deferred](./docs/plans/playtest-harness/deferred-items.md)
- **CSS rebuild phases:** [p1 foundation](./docs/plans/css-foundation-rebuild/phase-1-foundation.md) · [p2 phone view](./docs/plans/css-foundation-rebuild/phase-2-phone-view-migration.md) · [p3 board view](./docs/plans/css-foundation-rebuild/phase-3-board-view-migration.md) · [p4 motion](./docs/plans/css-foundation-rebuild/phase-4-motion-consolidation.md) · [p5 CVD](./docs/plans/css-foundation-rebuild/phase-5-cvd-followup.md) · [p5 verification](./docs/plans/css-foundation-rebuild/phase-5-verification-acceptance.md)
- **Testing:** [playtest harness PRD](./docs/testing/PLAYTEST-HARNESS-PRD.md) · [E2E issue list](./docs/testing/E2E-ISSUE-LIST.md) · [playtest scenarios](./docs/testing/playtest/SCENARIOS.md)
- **Ideation (origin):** [original brainstorm](./docs/ideation/2026-04-05-burned-brainstorm.md) · [art direction](./docs/ideation/2026-04-08-art-direction-brainstorm.md) · [visual layer autopsy](./docs/ideation/2026-04-11-visual-layer-autopsy.md)
- **Insights:** [categorized index](./docs/insights/README.md) (53 entries — 38 Engineering / 15 Process)
- **Test protocols:** [public repo prep](./test/public-repo-prep.md) · [first-player protocol](./test/first-player/protocol.md) · [WCAG 200% zoom protocol](./test/device-test/wcag-200-zoom-protocol.md) · [retheme grep sweep](./test/retheme/grep-sweep.md)

---

## Status

**Engine + networking + core UI shipped.** Active work is the visual layer rebuild and playtest harness.

- All tests green, typecheck clean (canonical counts in `TODO.md` §1)
- Phone initial JS under the 100 KB gzipped budget (see `TODO.md` §1 for live measurement; rerun `pnpm build` for fresh numbers)
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
