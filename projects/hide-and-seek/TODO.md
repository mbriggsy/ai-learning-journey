# Hide and Seek — TODO

## Current State
- **Phase 6b COMPLETE** — scoring + stats, 338 tests, typecheck clean
- All phases 0–6b executed and reviewed

## Next Steps
1. **Phase 7** — polish + art

## Landmines
- **Module-level `let` in SearchState/SuspiciousState** — singleton state means multi-seeker will stomp. Must move to `SeekerAIInternalState` before adding second seeker.
- **Tiled map has no Rooms object layer** — strategic patrol (medium/hard) falls back to random. Room rectangles need authoring in Tiled, then wire `parseRooms` + `computeHidingSpots` + `engine.setRooms()` in Game.ts and SpectatorGame.ts. Console warning fires every tick on medium/hard.
- **`seekerDistanceTiles` uses `Infinity` at runtime but `closestApproachTiles` uses `-1` sentinel** — two different contexts. Persistence uses `-1` because `JSON.stringify(Infinity)` → `null`.

## Verify Next Session
- None
