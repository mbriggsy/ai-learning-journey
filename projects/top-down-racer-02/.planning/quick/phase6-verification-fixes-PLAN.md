# Quick Task: Phase 6 Human Verification Fixes

**Date:** 2026-03-02
**Scope:** Fix 4 bugs found during Phase 6 human verification

## Issues

### FIX-1: Celebration overlay never auto-hides (vs AI mode)
- **Root cause:** `CelebrationOverlay.tick()` is never called — `OverlayRenderer.render()` omits it
- **File:** `src/renderer/OverlayRenderer.ts`
- **Fix:** Add `this.celebrationOverlay.tick()` call inside `render()`

### FIX-2: Spectator mode triggers stuck-detection respawn
- **Root cause:** Human car steps with ZERO_INPUT → speed=0 → RaceController triggers respawn after 5s
- **File:** `src/renderer/GameLoop.ts`
- **Fix:** Pass `Infinity` as carSpeed to RaceController.step() in spectator mode to bypass stuck detection

### FIX-3: HUD shows dead human state in spectator mode
- **Root cause:** HudRenderer.render() always receives human WorldState; useless when human car is frozen
- **Files:** `src/renderer/GameLoop.ts`, `src/renderer/HudRenderer.ts`
- **Fix:** In spectator mode, GameLoop passes AI world state as the "current" state to render callbacks

### FIX-4: Console error "BrowserAIRunner not loaded" on startup
- **Root cause:** `tick()` fires `infer()` before async `load()` completes
- **File:** `src/renderer/GameLoop.ts`
- **Fix:** Add loaded check before calling infer() — skip inference when session is null

## Commit Strategy
One atomic commit covering all four fixes.
