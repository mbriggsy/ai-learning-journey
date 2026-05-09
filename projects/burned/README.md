---
aliases: [burned, BURNED]
tags: [project, active]
---

# BURNED

A spy-comedy card game — rethemed from [Exploding Kittens Party Pack](https://www.explodingkittens.com/), set in the world of The Pendleton Agency. Jackbox-style: one shared screen (TV/laptop) shows the game table, each player uses their phone as a private controller.

## Project Map

> Internal docs surfaced for the Obsidian graph. Full README continues below.

- [[CLAUDE|CLAUDE.md]] — project conventions, engine invariants, landmines
- [[TODO]] — current work queue
- [[compound-engineering.local|compound-engineering.local.md]] — local CE notes
- **The contract:** [[docs/PRODUCT-SPECIFICATION|PRODUCT-SPECIFICATION]] (v1.0 LOCKED) · [[docs/RULES-REFERENCE|RULES-REFERENCE]] · [[docs/SETUP|SETUP]]
- **Active plans (roadmaps):** [[docs/plans/css-foundation-rebuild/roadmap|CSS foundation rebuild roadmap]] · [[docs/plans/playtest-harness/roadmap|playtest harness roadmap]] · [[docs/plans/desk-redesign/PLAN|desk redesign]]
- **Playtest harness phases:** [[docs/plans/playtest-harness/phase-1-scenarios|p1 scenarios]] · [[docs/plans/playtest-harness/phase-2-playtest-mode|p2 playtest mode]] · [[docs/plans/playtest-harness/phase-3-harness-infra|p3 harness]] · [[docs/plans/playtest-harness/phase-4-seat-agents|p4 seat agents]] · [[docs/plans/playtest-harness/phase-5-triage-agents|p5 triage]] · [[docs/plans/playtest-harness/phase-6-calibration-and-first-session|p6 calibration]] · [[docs/plans/playtest-harness/phase-7-rules-coverage-cascade|p7 rules cascade]] · [[docs/plans/playtest-harness/COHERENCE-SWEEP|coherence sweep]] · [[docs/plans/playtest-harness/deferred-items|deferred]]
- **CSS rebuild phases:** [[docs/plans/css-foundation-rebuild/phase-1-foundation|p1 foundation]] · [[docs/plans/css-foundation-rebuild/phase-2-phone-view-migration|p2 phone view]] · [[docs/plans/css-foundation-rebuild/phase-3-board-view-migration|p3 board view]] · [[docs/plans/css-foundation-rebuild/phase-4-motion-consolidation|p4 motion]] · [[docs/plans/css-foundation-rebuild/phase-5-cvd-followup|p5 CVD]] · [[docs/plans/css-foundation-rebuild/phase-5-verification-acceptance|p5 verification]]
- **Testing:** [[docs/testing/PLAYTEST-HARNESS-PRD|playtest harness PRD]] · [[docs/testing/E2E-ISSUE-LIST|E2E issue list]] · [[docs/testing/playtest/SCENARIOS|playtest scenarios]] · [[docs/testing/playtest/TUNING-LOG|tuning log]]
- **Ideation (origin):** [[docs/ideation/2026-04-05-burned-brainstorm|original brainstorm]] · [[docs/ideation/2026-04-08-art-direction-brainstorm|art direction]] · [[docs/ideation/2026-04-11-visual-layer-autopsy|visual layer autopsy]]
- **Insights:** 53 numbered insights in `docs/insights/` — too many to wikilink individually; representative entry: [[docs/insights/008-adversarial-swarm-review-maximum-overdrive|#008 adversarial swarm (Maximum Overdrive)]] · [[docs/insights/009-product-specification-authoring|#009 PRD authoring]]
- **Test protocols:** [[test/public-repo-prep|public repo prep]] · [[test/first-player/protocol|first-player protocol]] · [[test/device-test/wcag-200-zoom-protocol|WCAG 200% zoom protocol]] · [[test/retheme/grep-sweep|retheme grep sweep]]

---

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
- Genesis (SUPERSEDED by the spec, kept for provenance): [`docs/ideation/`](docs/ideation/) — original b