# Issue Log — Top-Down Racer v02

## Open Issues

## Resolved Issues

### ISS-003: HUD minimap overflow for tracks 2 & 3
- **Status**: Fixed (2026-03-01)
- **Reported**: 2026-03-01
- **Symptom**: During gameplay on tracks 2 and 3, the minimap track outline renders far outside its 160×160 panel, extending across the screen. Track 1 displays correctly.
- **Root cause**: `MINIMAP_SCALE` was a fixed constant (0.30) calibrated only for track 1's small oval (~580×314 world units). Track 2 (~1000×808) and track 3 (~766×741) are much larger, producing minimap footprints of ~300×242 and ~230×222 pixels — far exceeding the 160px box.
- **Fix**: Replaced fixed `MINIMAP_SCALE` with dynamic scale computed from the track's bounding box in `computeMinimapTransform()`. Scale is now `min(fitSize/tw, fitSize/th)` where `fitSize = MINIMAP_SIZE - padding*2`. File: `src/renderer/HudRenderer.ts`.

### ISS-001: Track 01 and Track 02 missing inner shoulder
- **Status**: Fixed (2026-03-01)
- **Reported**: 2026-03-01
- **Symptom**: Track 3 shows the sand-colored inner shoulder correctly, but tracks 1 and 2 do not display one.
- **Root cause**: Polygon topology was inverted for CW-winding circuits. `buildTrack()` uses `perpCCW` for `innerBoundary` and `perpCW` for `outerBoundary`. For CW circuits (tracks 1 & 2), `innerBoundary` was the LARGER polygon and `outerBoundary` was the SMALLER polygon. The PixiJS fill/cut rendering requires `outerBoundary` to be larger. Track 3 happened to wind CCW, so its polygons were already correct.
- **Fix**: Added winding-direction normalization in `buildTrack()` (`src/engine/track.ts`). After generating boundaries, compute signed areas of inner/outer polygons. If `outerBoundary` is smaller, swap all four boundary arrays (innerBoundary, outerBoundary, innerRoadEdge, outerRoadEdge) in-place.
- **Verified**: Diagnostic tests confirm all 3 tracks now have `outerBoundary > outerRoadEdge > innerRoadEdge > innerBoundary` nesting. All 250 existing tests pass.

### ISS-002: Sand particles not spawned on Shoulder surface
- **Status**: Fixed (2026-03-01)
- **Reported**: 2026-03-01
- **Symptom**: Dust/sand particles only spawn when `car.surface === Surface.Runoff`. Driving on the shoulder (`Surface.Shoulder`) produces no particles.
- **Root cause**: `EffectsRenderer.spawnDust()` guard checked `car.surface !== Surface.Runoff`, ignoring `Surface.Shoulder`.
- **Fix**: Changed guard to `car.surface === Surface.Road` (skip particles only on road). Shoulder spawns 1 particle/tick (lighter than runoff's 1-2). File: `src/renderer/EffectsRenderer.ts`.
