# Hide and Seek — TODO

## Current State
- Brainstorm complete (2026-03-29)
- Implementation plan complete (2026-03-29) — 8 phases, all research done
- No code yet — project is in design phase
- Brainstorm: `docs/ideation/2026-03-29-hide-and-seek-brainstorm.md`
- Plan: `docs/plans/2026-03-29-001-feat-hide-and-seek-game-plan.md`

## What We Did (2026-03-29)
- Full brainstorm session: game design, tech stack, art direction, AI behavior, controls, round flow
- Reviewed and refined brainstorm — added round flow, controller support, speed balance, door mechanics, AI hider tiers, found moment design, moved fog of war to Tier 1
- Ran SpecFlow analysis — identified 17 gaps, resolved all critical questions
- External research (3 parallel agents): Phaser.js framework, game AI patterns (FSM, pathfinding, smart-but-fair), fog of war + LOS (shadowcasting, rendering), map design + Tiled workflow
- Key tech decisions: symmetric shadowcasting (Albert Ford) for LOS, EasyStar.js for pathfinding, FSM for seeker AI, per-tile alpha tinting for fog, 32x32 tiles
- Wrote comprehensive implementation plan (8 phases aligned to brainstorm tiers)

## Next Steps (Priority Order)
1. **FIRST THING:** Run `/deepen-plan docs/plans/2026-03-29-001-feat-hide-and-seek-game-plan.md`
   - This is NON-NEGOTIABLE before any code execution
   - Institutional learnings show bugs caught in every single deepen run across 15 phases
   - Fix any issues the deepen surfaces before proceeding
2. Execute Phase 0: Project Scaffolding
3. Execute Phase 1: Map + Movement
4. Continue phases sequentially (fresh context window per phase)

## Landmines
- **Phaser 3.90.0 is likely the LAST v3 release** — Phaser 4 is RC7, not stable. Fine for our scope, game logic is Phaser-independent.
- **NEVER use multiply blend mode** for fog of war — produces black artifacts with transparency (documented in top-down-racer-04).
- **Fixed timestep is manual** — Phaser has no built-in fixed timestep. Must implement accumulator pattern.
- **phaser-raycaster plugin is NOT recommended** — low adoption (96 stars, 0 npm dependents), geometric raycasting is slower than shadowcasting for grid-based FOV. Roll our own.
- **EasyStar.js is async** — cancel and re-request paths when door state changes. Don't recalculate every frame.
- **OscillatorNode.start() can only be called ONCE** — use gain node for heartbeat on/off (Phase 6).
- **Gamepad API requires user interaction first** — browser security policy, handle gracefully.
- **Context rot** — quality degrades at 50% context utilization. New terminal per phase.
