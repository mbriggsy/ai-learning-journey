---
phase: 03-game-features-polish
plan: 01
status: complete
commit: 9dc06d4f
---

# Plan 03-01 Summary: State Machine Extraction

## What Was Built
- `src/engine/RaceController.ts` — headless game state machine with GamePhase, RaceState, step logic
- GameLoop.ts refactored to thin shell delegating to RaceController via signals/actions pattern
- `src/renderer/GameState.ts` deleted — all consumers import from engine
- `CarState.slipAngle` exposed on every physics tick for Wave 2 effects/sound

## Key Decisions
- step() returns RaceAction directly (no StepResult wrapper — RI-01)
- Input sampled once per frame, one-shot signals consumed after first sub-step (RI-02)
- else-if priority in tickPaused: restart > togglePause (RI-07)
- respawnPos typed as Vec2 (RI-04 fix)

## Files Changed
- **Created:** src/engine/RaceController.ts
- **Modified:** src/engine/types.ts, src/engine/car.ts, src/renderer/GameLoop.ts, src/renderer/OverlayRenderer.ts, src/renderer/HudRenderer.ts, src/renderer/RendererApp.ts, src/renderer/WorldRenderer.ts
- **Deleted:** src/renderer/GameState.ts

## Verification
- 0 TypeScript errors
- 214 existing tests pass
- No GameState imports remain
- RaceController has zero renderer/browser imports
- All game behavior preserved (countdown, pause, restart, respawn, lap overlays)
