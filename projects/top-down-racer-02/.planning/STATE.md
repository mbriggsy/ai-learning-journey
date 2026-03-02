---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: in_progress
last_updated: "2026-03-02T22:00:00.000Z"
progress:
  total_phases: 6
  completed_phases: 5
  total_plans: 21
  completed_plans: 24
---

# Project State: Top-Down Racer v02

**Last updated:** 2026-03-02
**Overall progress:** 96%

## Current Phase

**Phase 6: AI vs Human Mode** -- IN PROGRESS (Plans 00-03 complete, Plan 04 pending)

## Phase Status

| Phase | Status | Progress |
|-------|--------|----------|
| 1. Core Simulation Engine | Complete (Plan 4/4 done) | 100% |
| 2. PixiJS Renderer + Playable Game | Complete (Plan 5/5 done) | 100% |
| 3. Game Features & Polish | Complete (Plan 5/5 done) | 100% |
| 4. Gymnasium Environment Wrapper | Complete (Plan 3/3 done) | 100% |
| 5. AI Training Pipeline | Complete (Plan 3/3 done, 25/25 verified) | 100% |
| 6. AI vs Human Mode | In Progress (Plan 3/5 complete — core integration done) | 80% |

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
| 2026-03-01 | Mock model injection for callback tests | SB3 BaseCallback.logger and training_env are read-only properties; inject via mock model object |
| 2026-03-01 | 1500 steps/sec throughput threshold (not 3000) | Conservative CI-safe minimum with 2x safety margin; actual raw throughput ~3000-4000 |
| 2026-03-01 | Callback tests fully offline (no bridge) | Mocks SB3 logger and env; runs in <3s; no infrastructure dependency |
| 2026-03-02 | ONNX export: actions-only output, no pickle fallback, dynamo=False | Browser only reads "actions"; pickle.load() is CWE-502; PyTorch 2.9+ changed dynamo default |
| 2026-03-02 | VecNormStats uses camelCase (obsMean, obsVar, clipObs) with readonly | Matches all existing TypeScript interfaces; Python snake_case remapped at load time in Plan 02 |
| 2026-03-02 | Leaderboard key 'tdr-leaderboard-v1' (old 'tdr-best-times' abandoned) | Key-based abandonment avoids migration code; leaderboard data trivially re-earned |
| 2026-03-02 | BestTimes.ts kept as delegation shim to Leaderboard.ts | Minimal blast radius for Plan 01; Plan 03 will update ScreenManager imports directly |
| 2026-03-02 | GameMode type in src/types/game-mode.ts (cross-cutting types location) | Used across renderer layer; first file in src/types/ establishing the convention |
| 2026-03-02 | ort.env.wasm.numThreads = 1 for tiny MLP inference | Thread overhead exceeds computation for ~5,500 FLOPs; avoids crossOriginIsolated requirement |
| 2026-03-02 | Runtime type guard for VecNormStats JSON (not unsafe `as` cast) | Network JSON from Python export could have wrong shape; prevents silent NaN propagation |
| 2026-03-02 | Per-child tint on AiCarRenderer (not container.tint) | PixiJS v8 Container has no tint property; only Sprite/Graphics support it |
| 2026-03-02 | AiCarRenderer delegates update() to CarRenderer | Prevents heading offset bug; CarRenderer.update() uses bare heading (no PI/2 offset) |
| 2026-03-02 | vi.mock() factory must not reference outer-scope variables | Vitest hoists vi.mock() above all declarations; causes ReferenceError at import time |
| 2026-03-02 | RenderCallback stays at 4 params, AI state via getter/closure | Only WorldRenderer needs AI state; avoids forcing 4 other callbacks to accept unused params |
| 2026-03-02 | Accumulator cap 50ms in AI modes (200ms in solo) | Prevents 12 sub-steps after tab-switch; limits to 3 (2x distanceToTrackCenter per step is expensive) |
| 2026-03-02 | Celebration uses live aiWorld.timing, not persisted Leaderboard (CP-4) | First-ever race has null persisted AI best; live data is always correct |
| 2026-03-02 | Checkpoint keyed by `${lap}-${checkpoint}` (CP-8) | Flat Map key collides across laps; composite key ensures correct gap on lap 2+ |
| 2026-03-02 | Default AI action [0,0,0] not [0,0.3,0] (CP-12) | [0,0.3,0] causes AI to drive straight into first wall before model loads |
| 2026-03-02 | ScreenManager owns overlayRenderer for celebration/mode wiring | Needed for setMode() and showCelebration() callbacks; previously only in RendererApp |
| 2026-03-02 | Drop GapTimerHud popup, add AI stats to HUD instead | Checkpoint popup felt disruptive; minimal AI section (total time + best lap) in HUD during vs-ai |
| 2026-03-02 | Finished screen: total race time (primary) + best lap (secondary) | Race winner = who finished faster overall; best lap is secondary stat. Both shown with deltas |

## Quick Tasks Completed

| Date | Task | Details |
|------|------|---------|
| 2026-03-01 | Phase 5 human verification | `pytest python/tests/ -v` with bridge server — 12/12 passed. All Phase 4 regression tests green. Verification score updated from 24/25 to 25/25 |
| 2026-03-02 | Phase 6 human verification fixes | 4 fixes: celebration overlay auto-hide, spectator stuck-detection bypass, spectator HUD shows AI state, BrowserAIRunner loaded guard. 383/383 tests pass. |
| 2026-03-02 | Replace celebration overlay with Finished screen comparison | Deleted CelebrationOverlay.ts (disruptive mid-race). AVH-03 now shows "You beat the AI!" / "AI wins by X.XXXs" on Race Complete panel. Net -286 lines. 374/374 tests pass. |

## Blockers

None.

---
*Initialized: 2026-02-27*
