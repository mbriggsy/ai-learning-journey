# Hide and Seek — TODO

## Current State
- **Phase 7 IN PROGRESS** — pipeline built, Imagen 4 wired, integration done, visual bugs remain

## Next Steps
1. **Sequential Think through all visual issues BEFORE touching code**
2. **Fix floor tile** — programmatic via Sharp (free). AI tiles create plaid at 32x32.
3. **Fix character flash on movement** — diagnose: rendering, chroma-key residue, or animation gap?
4. **Regen 4 quota-blocked assets** — char-seeker-chase-e-01, prop-flashlight-s/n/w
5. **Visual polish pass** then commit

## Landmines
- Module-level `let` in SearchState/SuspiciousState — singleton, breaks with multi-seeker
- Tiled map has no Rooms object layer — medium/hard patrol falls back to random, console warns every tick
- Dual sentinel: `seekerDistanceTiles` = `Infinity` (runtime), `closestApproachTiles` = `-1` (persisted)
- Imagen 4: 70 RPD free tier, generates hot pink not magenta (auto-detect handles it), renders hex codes as text
- `taskkill //F //IM node.exe` kills MCP servers — need new terminal to reconnect
