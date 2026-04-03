# Hide and Seek — TODO

## Status: SHELVED
Project paused 2026-04-02. Solid engine, needs a bigger vision to be worth showing.

## What's Built (and working)
- Pure game engine with fixed-timestep accumulator, 336 tests passing
- AI seeker with FSM (patrol/suspicious/search/chase), A* pathfinding, vision cone
- Fog of war with distance-based vignette, explored/visible states
- Proximity danger overlay (red screen edges when seeker is near)
- F1 debug toggle for unrestricted view
- Imagen 4 art pipeline: generate, downscale, chroma-key, edge-strip, palette-enforce, atlas-pack
- Programmatic floor tile generator (7 types — AI tiles create plaid at 32x32)
- Per-room floor variety (3 zones with distinct floor types)
- Audio: footsteps, doors, heartbeat system, ambient drone, sonar ping
- Scoring, persistence, pause menu, minimap, spectator mode

## Why It's Shelved
- 40x30 map with 3 rooms — too small to feel like a mansion
- AI-generated 32x32 sprites look like blobs, not characters
- No hiding mechanics (game is called Hide and Seek)
- Needs procedural map generation, bigger maps, hiding spots, more environmental variety
- After UMB, the bar is higher than "technically correct"

## To Pick Back Up
1. Procedural mansion generation (bigger maps, room variety, hiding spots)
2. Art direction overhaul — either higher-res or hand-crafted pixel art
3. Hiding mechanic (under beds, in closets, behind furniture)
4. Sound as primary tension mechanic (footstep volume = detection risk)

## Landmines
- Module-level `let` in SearchState/SuspiciousState — singleton, breaks with multi-seeker
- Tiled map has no Rooms object layer — medium/hard patrol falls back to random
- Seeker chase-e animation has 138% frame size variance between frames
- Imagen 4: 70 RPD free tier, renders hex codes as text in images
