# Do Not Disturb — TODO

## Status: SHELVED — Pivoting to new project (Exploding Kittens digital)

Playtest revealed side-scroller format fights hotel design. Deeper review: two failed games (H&S + DND) proved the presentation gap is the real problem, not game logic. Decision: new project — Exploding Kittens digital with AI opponents and personality. Card game format plays to strengths (clean UI, typography, effects over sprites).

## What's Here (Preserved)

- 449 tests, 42 files, all passing
- 0 typecheck errors
- Game logic layer: monsters, tools, nights, noise, hiding, breath, escape windows
- Greybox renderer (side-scroller, functional but not the right format)
- Xbox controller support
- Playwright e2e suite (13 scenarios)

## Lessons Learned

- Side-scroller fights room-based hotel design
- Presentation > systems. 449 tests nobody can see vs UMB's "catch your breath" presentation
- AI-generated sprites are inconsistent — code-driven visuals (cards, UI, effects) are more reliable
- Scope kills polish. DND had 15 interlocking systems. Simpler game = more budget for feel.
- Build games you've PLAYED, not games you've designed in theory
