# Hide and Seek — SHELVED

Shelved 2026-04-03. Engine intact (336 tests passing), but the vision pivot to side-scrolling 2D made this a fundamentally different game. Continued as **Do Not Disturb** in `projects/do-not-disturb/`.

## What's Here (Preserved)

- Pure top-down game engine: fixed-timestep, AI FSM, A* pathfinding, shadowcasting FOV, vision cone detection
- Door system, scoring, persistence, game flow rules, audio curves
- 336 tests passing, typecheck clean
- 11 insight docs in `docs/insights/` (7 carried to DND, 4 top-down-specific remain here)
- Audio assets: footsteps, heartbeat, doors, ambient drone, sonar

## Why Shelved (Not Deleted)

The top-down engine has solid patterns worth referencing. If we ever want a top-down game again, this is a proven foundation. But retrofitting it into a side-scroller would mean fighting its assumptions at every layer — that's a shortcut, not a build.
