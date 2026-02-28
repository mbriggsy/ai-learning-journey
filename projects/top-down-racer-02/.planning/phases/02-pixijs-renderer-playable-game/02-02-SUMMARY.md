---
phase: 02-pixijs-renderer-playable-game
plan: 02
status: complete
---

# Plan 02-02: Track & Car Rendering Summary

## What Was Built
Created the visual core of the game: track rendering with colored polygons (dark grey road, light tan runoff, red-brown wall strokes, checkered finish line), a car sprite as an arrow-like rectangle with a pointed red nose for heading readability, a car-facing-up camera with dynamic zoom (tighter at low speed, wider at high speed, extra zoom-out during slides), and smooth render interpolation using linear and angle-aware lerp for 60fps-smooth motion between physics ticks.

The track is built once from engine TrackState geometry and cached as a GPU texture via PixiJS v8's cacheAsTexture(true) for zero per-frame redraw cost. The WorldRenderer orchestrates all world-space rendering: it initializes the track on first render, updates the car sprite with interpolated position/heading each frame, and drives the camera controller with interpolated state and current car dynamics.

## Key Files
### Created
- `src/renderer/CameraController.ts` -- Car-facing-up camera with dynamic zoom responding to speed and yaw rate, smooth lerp transitions
- `src/renderer/TrackRenderer.ts` -- Static track geometry builder: runoff background, road surface with inner cutout, wall strokes, checkered finish line at checkpoint[0], cached as GPU texture
- `src/renderer/CarRenderer.ts` -- Car sprite as white rectangle with red pointed nose, updated each frame with interpolated world position and heading
- `src/renderer/WorldRenderer.ts` -- Orchestrator: reads WorldState + alpha, drives Camera + Car updates, initializes track on first render

### Modified
- `src/renderer/RendererApp.ts` -- Added WorldRenderer import, private field, and onRender callback wiring with screen dimensions from PixiJS Application

## Deviations
- **cacheAsTexture API**: The plan called `container.cacheAsTexture()` with no arguments, but PixiJS v8 requires a `boolean | CacheAsTextureOptions` parameter. Changed to `container.cacheAsTexture(true)`.
- **Screen dimensions**: The plan initially had WorldRenderer reading screen size from the parent chain. Following the plan's own recommendation, updated WorldRenderer.render() to accept screenW and screenH as parameters, passed from RendererApp via `this.app.screen.width` and `this.app.screen.height`.
- **HudRenderer already present**: Plan 02-03 (running in parallel) had already wired HudRenderer into RendererApp.ts. WorldRenderer wiring was added alongside it without disturbing the existing HUD code.

## Self-Check: PASSED
- `pnpm exec tsc --noEmit` exits with code 0 (zero TypeScript errors)
- No PixiJS imports exist anywhere under `src/engine/` (architecture constraint verified)
- CameraController exports update() and reset() methods
- TrackRenderer exports buildTrackGraphics(track: TrackState): Container
- CarRenderer exports CarRenderer class with update(worldX, worldY, heading)
- WorldRenderer exports WorldRenderer class with render() and reset()
- Track cached as GPU texture via cacheAsTexture(true)
- Render interpolation uses lerp for position and lerpAngle for heading (avoids spin at +/-PI boundary)
- Camera rotation formula: -(heading + PI/2) maps engine east to screen up
- Dynamic zoom: ZOOM_MAX at low speed, ZOOM_MIN at high speed, ZOOM_SLIDE_BONUS when |yawRate| > threshold
