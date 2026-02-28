# Project State: Top-Down Racer v02

**Last updated:** 2026-02-27
**Overall progress:** 17%

## Current Phase

**Phase 1: Core Simulation Engine** -- COMPLETE (Plan 4 of 4 done)

## Phase Status

| Phase | Status | Progress |
|-------|--------|----------|
| 1. Core Simulation Engine | Complete (Plan 4/4 done) | 100% |
| 2. PixiJS Renderer + Playable Game | Ready to start | 0% |
| 3. Game Features & Polish | Blocked by Phase 2 | 0% |
| 4. Gymnasium Environment Wrapper | Blocked by Phase 2 | 0% |
| 5. AI Training Pipeline | Blocked by Phase 4 | 0% |
| 6. AI vs Human Mode | Blocked by Phase 5 | 0% |

## Decisions Log

| Date | Decision | Context |
|------|----------|---------|
| 2026-02-27 | Vec2 as plain interface with pure functions (not class) | Avoids prototype overhead, enables tree-shaking, matches functional pattern |
| 2026-02-27 | Centripetal Catmull-Rom (alpha=0.5) to avoid cusps | Research showed uniform (alpha=0) creates cusps at uneven spacing |
| 2026-02-27 | Simplified Pacejka (B=8, C=1.4, mu=1.0) for approachable tuning | Gives clear peak/falloff behavior for oversteer without complex tire model |
| 2026-02-27 | Low-speed guard at 0.5 units/sec prevents slip angle singularity | Avoids div-by-near-zero in atan2 at standstill |
| 2026-02-27 | Tuned engine/drag constants for game-feel acceleration | Original constants gave ~30 units/s max; retuned to reach 150-200 in 4-5s |

## Blockers

None.

---
*Initialized: 2026-02-27*
