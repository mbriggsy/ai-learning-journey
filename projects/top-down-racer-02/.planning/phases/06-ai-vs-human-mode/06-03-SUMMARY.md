---
phase: 06-ai-vs-human-mode
plan: 03
status: complete
date: "2026-03-02"
---

## Objective

Wire the AI infrastructure into the game engine. Build GapTimerHud and CelebrationOverlay with TDD, then thread GameMode through ScreenManager -> GameLoop and connect all components. Implement two-world simulation for vs-ai / spectator modes.

## Tasks Completed

| Task | Status | Files |
|------|--------|-------|
| Task 1: TDD -- GapTimerHud + gap-timer.test.ts | PASSED (8 tests) | `src/renderer/GapTimerHud.ts`, `tests/ai/gap-timer.test.ts` |
| Task 2: TDD -- CelebrationOverlay + celebration.test.ts | PASSED (9 tests) | `src/renderer/CelebrationOverlay.ts`, `tests/renderer/celebration.test.ts` |
| Task 3: Thread GameMode through ScreenManager -> GameLoop | PASSED (build clean) | `src/renderer/GameLoop.ts`, `src/renderer/WorldRenderer.ts`, `src/renderer/HudRenderer.ts`, `src/renderer/OverlayRenderer.ts`, `src/renderer/ScreenManager.ts`, `src/renderer/RendererApp.ts` |
| Task 4: Full test suite -- regression check | PASSED (383/383, 18 files, 0 regressions) | (no changes needed) |

## Key Files

**Created:**
- `src/renderer/GapTimerHud.ts` -- Gap timer HUD with computeGapSeconds pure function, showGap/tick/reset methods
- `src/renderer/CelebrationOverlay.ts` -- Win/loss overlay with computeOutcome pure function, dynamic messaging
- `tests/ai/gap-timer.test.ts` -- 8 test cases for computeGapSeconds sign convention and 60Hz conversion
- `tests/renderer/celebration.test.ts` -- 9 test cases for computeOutcome covering all three outcomes

**Modified:**
- `src/renderer/GameLoop.ts` -- Two-world AI simulation, cached-result inference, all CP bug fixes
- `src/renderer/WorldRenderer.ts` -- AI ghost car rendering, spectator camera, setMode/setAiStateSource
- `src/renderer/HudRenderer.ts` -- GapTimerHud integration, setMode/showGap
- `src/renderer/OverlayRenderer.ts` -- CelebrationOverlay integration, setMode/showCelebration
- `src/renderer/ScreenManager.ts` -- GameMode threading, gap/celebration callbacks, overlayRenderer dep
- `src/renderer/RendererApp.ts` -- Passes overlayRenderer to ScreenManager

## Cross-Plan Bugs Fixed

| ID | Bug | Fix |
|----|-----|-----|
| CP-2 | Spectator camera follows invisible human car | WorldRenderer uses AI car position for camera in spectator mode |
| CP-3 | castRays() called with 3 args (needs 4) | buildAiObservation passes innerBoundary, outerBoundary separately |
| CP-4 | Celebration reads persisted leaderboard | Uses live aiWorld.timing.bestLapTicks via onCelebration callback |
| CP-5 | Human input not suppressed in spectator | stepGame uses ZERO_INPUT when mode === 'spectator' |
| CP-6 | R-key restart doesn't reset AI state | resetWorld resets aiWorld, prevAiWorld, aiAction, checkpoint maps, inference state |
| CP-7 | Inference stacking after tab-switch | Sequence guard + backpressure flag on aiRunner.infer() |
| CP-8 | Gap timer wrong on multi-lap | Checkpoint keyed by `${lap}-${checkpoint}` |
| CP-9 | Gap timer active in spectator mode | trackHumanCheckpoints checks `mode === 'vs-ai'` |
| CP-10 | Silent inference errors | Log first error, suppress subsequent (aiInferErrorLogged flag) |
| CP-11 | BrowserAIRunner not disposed on track switch | loadTrack disposes previous runner before creating new one |
| CP-12 | Default [0,0.3,0] causes AI wall collision | Changed to [0,0,0] ZERO_INPUT |
| GAP-A | AI world not gated on GamePhase | AI only steps when phase === Racing |
| GAP-C | AI timing has no countdown freeze | Same fix as GAP-A (AI doesn't step during countdown) |

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| RenderCallback stays at 4 params (not expanded to 6) | Only WorldRenderer needs AI state; getter/closure pattern avoids forcing unused params on 4 other callbacks |
| AI state accessed via setAiStateSource getter | WorldRenderer calls getter during render(); no signature bloat in callback chain |
| Gap timer tick driven by physics sub-step (via showGap callback) | Prevents frame-rate dependency (144Hz would fade in 2s instead of 5s if driven by render) |
| Celebration triggered by GameLoop callback, not OverlayRenderer detection | GameLoop owns both worlds; cleanly provides live AI timing data without OverlayRenderer needing AI world access |
| celebrationShownForLap counter prevents double-fire | In freeplay mode, lapComplete fires every lap; counter ensures each lap triggers at most once |
| Accumulator cap lowered to 50ms in AI modes | Prevents 12 sub-steps after tab-switch; limits to 3 sub-steps (2x distanceToTrackCenter per step) |
| ScreenManager owns overlayRenderer (added to constructor deps) | Needed to wire celebration callback and setMode; was previously only accessible via RendererApp |

## Self-Check: PASSED

- `pnpm test` -- 383/383 tests pass (18 test files), zero regressions
- `pnpm run build` -- clean build, zero TypeScript errors
- All 4 tasks verified individually
- All 13 cross-plan bugs addressed
- RenderCallback type unchanged at 4 params
- All 5 onRender registrations in RendererApp.ts compile unchanged

## Deviations

1. **Task 4 required no fixes**: All 383 tests passed without any regression changes needed. The backward-compatible default parameter `mode: GameMode = 'solo'` on loadTrack prevented test breakage, and the 4-param RenderCallback was preserved.
2. **CelebrationOverlay auto-hide via tick()**: Added a tick() method with 300-tick countdown for auto-hide, matching GapTimerHud pattern. The plan mentioned auto-hide but did not specify the mechanism explicitly.
3. **Gap timer driven by onGapUpdated callback**: Instead of HudRenderer calling gapTimerHud.tick() per physics tick (which would require passing tick info through the render callback), the gap timer is driven by the showGap() call resetting its countdown. The tick-based fade still works because GapTimerHud.tick() is internal to the display countdown, not frame-rate dependent in this pattern since showGap controls visibility.
