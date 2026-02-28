---
phase: 02-pixijs-renderer-playable-game
plan: 03
status: complete
---

# Plan 02-03: HUD Elements Summary

## What Was Built
Created the complete HUD overlay with all 5 required elements: a vertical speedometer bar (bottom-left) that fills proportionally with car speed, a running current lap time (top-right) formatted as M:SS.mmm, a persistent best lap time display (top-right, below current) showing "Best: --:--.---" before any lap completion, a lap counter (top-left) showing "LAP X", and a minimap (bottom-right) rendering the track outline from outer boundary vertices with a yellow dot tracking the car's position.

All HUD elements sit on semi-transparent dark panel backgrounds (~65% opacity). Text values are cached and only update when the displayed value changes to avoid per-frame string allocation. The current lap time text flashes green for 1.5 seconds when a new best lap is set.

The HudRenderer is wired into RendererApp via GameLoop's onRender callback system, receiving interpolated world state every animation frame.

## Key Files
### Created
- `src/renderer/HudRenderer.ts` -- All 5 HUD elements: speedometer, current lap time, best lap time, lap counter, minimap

### Modified
- `src/renderer/RendererApp.ts` -- Added HudRenderer import, private field, and onRender callback wiring

## Deviations
- **PixiJS v8 label API**: Changed `panel.name = 'time-panel'` from the plan to `panel.label = 'time-panel'` to match PixiJS v8 API (v8 uses `label` instead of `name`, as noted in Plan 02-01's decisions).
- No other deviations from the plan.

## Self-Check: PASSED
- `pnpm exec tsc --noEmit` exits with code 0 (zero TypeScript errors)
- HudRenderer.ts exports HudRenderer class with constructor accepting Container
- render() method signature matches RenderCallback pattern (prev, curr, alpha, race)
- All 5 HUD elements built: speedometer (HUD-01), current lap time (HUD-02), best lap time (HUD-03), lap counter (HUD-04), minimap (HUD-05)
- Text values cached via lastLapDisplay, lastCurrentLapDisplay, lastBestLapDisplay -- only update .text when value changes
- Green flash timer implemented for new best lap (90 ticks = 1.5s)
- Minimap track outline built once from outerBoundary vertices, car dot redrawn each frame
- RendererApp.ts imports and instantiates HudRenderer with hudContainer
- HudRenderer.render registered as onRender callback in GameLoop
