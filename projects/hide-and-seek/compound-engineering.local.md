---
review_agents:
  - kieran-typescript-reviewer
  - architecture-strategist
  - performance-oracle
  - code-simplicity-reviewer
---

## Review Context

This is a Phaser 3.90 + TypeScript game with strict engine/renderer separation:
- `src/game/` — pure game logic, ZERO Phaser imports
- `src/renderer/` — Phaser scenes and visual components
- `src/types/` — shared type definitions, no upward imports

Key architectural rules:
- No enums — use `as const satisfies` literal unions
- Named exports only, no barrel files
- `ReadonlyDeep<GameState>` for renderer reads
- Fixed-timestep accumulator for all game logic
- No definite assignment (`!`) in `src/game/`
