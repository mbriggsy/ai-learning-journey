# Hide and Seek — TODO

## Status: ACTIVE — Gutted and Ready to Rebuild

Project gutted 2026-04-03. Renderer, assets, old plans, and old vision deleted. Engine intact with 336 passing tests.

## What's Here

- Pure game engine: fixed-timestep, AI FSM, A* pathfinding, shadowcasting FOV, vision cone detection
- Door system, scoring, persistence, game flow rules, audio curves
- 336 tests passing, typecheck clean
- 11 insight docs in `docs/insights/`
- Audio assets: footsteps, heartbeat, doors, ambient drone, sonar

## Next Steps

1. Define the new vision — tense survival horror, not cute flashlight tag
2. Plan new phases for the rebuild
3. Deepen all plans before writing any code
4. Execute

## Landmines

- Module-level `let` in SearchState/SuspiciousState — singleton, breaks with multi-seeker
- Map parser (`map.ts`) expects Tiled JSON — new map approach may need a new parser
