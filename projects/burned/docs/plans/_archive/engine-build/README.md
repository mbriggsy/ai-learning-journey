# Archived — Original Engine Build Plans

These plans authored the original six-phase BURNED engine build (foundation → game engine → networking → core UI → visual/animation → hardening/deploy). **All six phases shipped** between 2026-04-05 and 2026-04-08.

They are retained for provenance — to trace *why* a decision was made, not *what* is currently true.

## Known drift in these files

- **Tech names**: some refer to "PartyKit" instead of `partyserver` (the library's post-acquisition name).
- **Visual direction**: the roadmap says "mid-century modern" — superseded by the Archer-literal direction in `docs/PRODUCT-SPECIFICATION.md` §3.
- **State machine (`roadmap.md`)**: mermaid includes "60s timeout" branches on prompts — removed per the "game waits for you" policy (see `CLAUDE.md` Engine Invariants).
- **Scope cut tables**: reflect the Apr-5 plan, not the current product.

**For current conventions**: read `CLAUDE.md`. **For current rules**: read `docs/RULES-REFERENCE.md`. **For current work**: read `TODO.md` and the active plans under `docs/plans/` (`css-foundation-rebuild/`, `playtest-harness/`, `desk-redesign/`).

## Files

- `roadmap.md` — top-level roadmap for the engine build
- `phase-1-foundation.md` — types, constants, deck factories
- `phase-2-game-engine.md` — dispatch engine, rules, projection
- `phase-3-networking-lobby.md` — `partyserver` room, WebSocket protocol
- `phase-4-core-game-ui.md` — React 19 + store + card play
- `phase-5-visual-animation.md` — Framer Motion + GSAP integration
- `phase-6-hardening-deploy.md` — security, reliability, Cloudflare deploy
