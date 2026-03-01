---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: in_progress
last_updated: "2026-03-01T23:30:00.000Z"
progress:
  total_phases: 6
  completed_phases: 4
  total_plans: 20
  completed_plans: 19
---

# Project State: Top-Down Racer v02

**Last updated:** 2026-03-01
**Overall progress:** 76%

## Current Phase

**Phase 5: AI Training Pipeline** -- IN PROGRESS (Plan 2/3 complete)

## Phase Status

| Phase | Status | Progress |
|-------|--------|----------|
| 1. Core Simulation Engine | Complete (Plan 4/4 done) | 100% |
| 2. PixiJS Renderer + Playable Game | Complete (Plan 5/5 done) | 100% |
| 3. Game Features & Polish | Complete (Plan 5/5 done) | 100% |
| 4. Gymnasium Environment Wrapper | Complete (Plan 3/3 done) | 100% |
| 5. AI Training Pipeline | In Progress (Plan 2/3 done) | 67% |
| 6. AI vs Human Mode | Blocked by Phase 5 | 0% |

## Decisions Log

| Date | Decision | Context |
|------|----------|---------|
| 2026-02-27 | Vec2 as plain interface with pure functions (not class) | Avoids prototype overhead, enables tree-shaking, matches functional pattern |
| 2026-02-27 | Centripetal Catmull-Rom (alpha=0.5) to avoid cusps | Research showed uniform (alpha=0) creates cusps at uneven spacing |
| 2026-02-27 | Simplified Pacejka (B=8, C=1.4, mu=1.0) for approachable tuning | Gives clear peak/falloff behavior for oversteer without complex tire model |
| 2026-02-27 | Low-speed guard at 0.5 units/sec prevents slip angle singularity | Avoids div-by-near-zero in atan2 at standstill |
| 2026-02-27 | Tuned engine/drag constants for game-feel acceleration | Original constants gave ~30 units/s max; retuned to reach 150-200 in 4-5s |
| 2026-02-27 | PixiJS v8 label API (not name) for child lookups | v8 replaced name/getChildByName with label/getChildByLabel |
| 2026-02-27 | PixiJS v8 cacheAsTexture(true) requires boolean arg | v8 changed from no-arg to required boolean/options parameter |
| 2026-02-27 | PixiJS v8 dropShadow requires object, not boolean | v8 text style dropShadow needs { color, blur, distance } object form |
| 2026-02-27 | Key debouncing for Escape/R via wasDown flags | Prevents rapid toggle when key held across multiple 60Hz ticks |
| 2026-03-01 | Python 3.10 venv (not 3.14) for SB3/PyTorch compatibility | PyTorch 2.3 requires 3.10-3.12; pygame (SB3[extra] dep) fails on 3.14 |
| 2026-03-01 | record_mean() for per-step rewards, record() for episode aggregates | record() overwrites; only last value before dump() survives for per-step metrics |
| 2026-03-01 | Per-lap time via step count delta, not cumulative stepCount | Cumulative stepCount/60 gives episode time, not individual lap time |
| 2026-03-01 | Keep separate PPO/SAC scripts (no unified train.py --algo) | Different training semantics (on-policy vs off-policy), different hyperparameter schemas, matches RL community convention |
| 2026-03-01 | Missing VecNormalize stats on resume is a hard error | Model trained with normalized obs produces garbage with fresh (mean=0, var=1) stats |
| 2026-03-01 | gamma=0.995 for PPO (not 0.99) | ~200-step effective horizon (3.3s) for planning turns, vs ~100-step (1.7s) with 0.99 |

## Blockers

None.

---
*Initialized: 2026-02-27*
