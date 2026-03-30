---
title: "Phase 7: Art Pipeline"
type: feat
status: pending-deepen
date: 2026-03-29
origin: docs/plans/2026-03-29-001-feat-hide-and-seek-game-plan.md
---

# Phase 7: Art Pipeline

## Goal

Replace all placeholder art with Gemini Imagen 4 generated stylized cartoon assets. Game looks polished and professional.

## Context

With all gameplay systems complete (Phases 0-6), this phase replaces placeholder colored rectangles with custom-generated stylized cartoon art. The engine/renderer separation means art changes are purely in `src/renderer/` and `public/assets/` — zero game logic changes. (see master plan and brainstorm for art direction)

### Art Direction (from brainstorm)

- **Style:** Stylized cartoon — clean black outlines, bold colors, slightly exaggerated proportions
- **Vibe:** Among Us / Overcooked energy
- **Palette:** Warm indoor colors (wood browns, carpet reds, wall creams), cool accents (blue sonar, red alert)
- **Perspective:** Strict top-down
- **Tile size:** 32x32 pixels
- **Character size:** 32x32 (fits one tile)
- **Generated with:** Gemini Imagen 4 API

## Tasks

- [ ] Art style guide document (`docs/art-style-guide.md`):
  - Color palette (hex values for primary, secondary, accent colors)
  - Line weight and style (2px black outlines)
  - Proportions and scale reference
  - Prompt template for Imagen 4 (base prompt that all asset prompts extend)
  - Example: "32x32 pixel art, top-down perspective, stylized cartoon, clean black outlines, bold colors, [specific asset description]"
  - Do/don't examples for consistency
- [ ] Asset generation script (`scripts/generate-assets.ts`):
  - Load API key from .env (`set -a && source .env && set +a`)
  - Imagen 4 API integration (REST or SDK)
  - Batch generation with delays between calls (rate limit safety)
  - Save to `public/assets/images/` with descriptive filenames
  - Idempotent: check if asset exists before generating (skip existing)
  - Log generation results (success/fail per asset)
  - Retry failed generations (up to 3 attempts)
- [ ] Tileset generation (all 32x32):
  - Floor tiles:
    - Wood planks (2-3 variants for visual variety)
    - Carpet (2 colors)
    - Kitchen tile
    - Bathroom tile
  - Wall tiles:
    - Interior wall (horizontal, vertical)
    - Wall corners (4 orientations)
    - T-junctions (4 orientations)
    - Exterior wall (if visible)
  - Door tiles:
    - Closed state (matches wall style with door frame)
    - Open state (doorway/gap)
  - Furniture:
    - Couch (2x1 tiles)
    - Table (2x2 tiles)
    - Bookshelf (1x2 tiles)
    - Chair (1x1 tile)
    - Bed (2x2 tiles)
    - Desk (2x1 tiles)
  - Decorative:
    - Rug (2x2 or 3x2)
    - Lamp (1x1)
    - Plant (1x1)
    - Picture frame (1x1, on wall)
- [ ] Character sprites:
  - Hider:
    - 4 directional frames (N/S/E/W)
    - Idle pose per direction
    - Walking animation (2-frame minimum per direction)
    - Distinct color/outfit (blue/green tones — blend with environment)
  - Seeker:
    - 4 directional frames (N/S/E/W)
    - Idle + walking + chase animation per direction
    - Visually distinct from hider (red/orange tones — threatening)
    - Visual accessory (flashlight beam, cap, badge)
  - AI hider variant:
    - Same animations as player hider
    - Different color/outfit for spectator mode clarity
- [ ] UI elements:
  - Minimap frame/border (rounded rectangle with theme colors)
  - Timer display background (semi-transparent panel)
  - "FOUND!" splash graphic (dramatic, red-tinted)
  - "SURVIVED!" splash graphic (triumphant, gold-tinted)
  - Menu background (indoor scene, blurred or stylized)
  - Button sprites (normal, hover, pressed states)
  - Sonar ping ring (blue, gradient fade)
  - Seeker blip dot (red, glowing)
- [ ] Texture atlas creation:
  - Characters: combine all character sprites into one atlas (Phaser JSON Atlas format)
  - UI: combine UI elements into one atlas
  - Tileset: stays as standard tilemap image (Tiled format)
  - Use TexturePacker or manual atlas creation
- [ ] Update Tiled map:
  - Replace placeholder tileset with generated tileset image
  - Re-verify tile assignments and collision properties
  - Ensure tile IDs still match after tileset swap
- [ ] Integration:
  - Update Preloader to load new asset files
  - Update all sprite/texture key references in renderer code
  - Update tilemap tileset reference
  - Verify character animations play correctly
  - Test at 1x, 2x, and 3x zoom
- [ ] Visual polish pass:
  - Consistent lighting direction across all assets (top-left light source)
  - Color coherence check (palette consistency)
  - Readability test at game zoom level (can you distinguish objects?)
  - Edge cases: furniture against walls, doors in corridors, overlapping layers
- [ ] Playwright screenshot regression tests:
  - Full game scene with new art
  - Minimap with new art
  - Menu screens
  - Found/survived splash screens
  - Compare against baseline (first passing screenshots become the baseline)

## Success Criteria

- All placeholder colored rectangles replaced with stylized cartoon art
- Consistent visual style across all assets (same palette, line weight, perspective)
- Characters are distinguishable (hider vs seeker vs AI hider)
- Furniture reads clearly as hiding spots
- Doors are obviously interactable (visual affordance)
- Game looks polished and professional at default zoom
- Assets readable at 2x and 3x scale
- No visual artifacts (tile seams, sprite bleed, wrong z-order)

## Dependencies

- Phases 0-6 complete (all gameplay systems working with placeholder art)
- Gemini Imagen 4 API key in .env
- Style guide finalized before generation begins

## Risks

| Risk | Mitigation |
|------|------------|
| Imagen 4 style inconsistency across generations | Strict prompt template with detailed constraints. Generate all similar assets in one batch. Manual review pass. |
| Generated tiles don't tile seamlessly | Include "seamless tiling" in prompts. Manual touch-up in image editor if needed. |
| Character sprites lack animation clarity | Generate each frame with explicit pose description. May need manual pixel-level adjustment. |
| Tileset swap breaks Tiled map | Back up map before swap. Verify tile IDs match. Test in-game immediately after swap. |
| API rate limits | Sequential generation with delays. Idempotent script (resume after interruption). |

## Sources

- [Gemini Imagen 4 API Documentation](https://ai.google.dev/gemini-api/docs/imagen)
- [Top game assets tagged 32x32 — itch.io](https://itch.io/game-assets/tag-32x32) (reference for style)
- [Phaser Texture Atlas Format](https://docs.phaser.io/api-documentation/class/textures-texturemanager)
- Brainstorm: docs/ideation/2026-03-29-hide-and-seek-brainstorm.md (art direction decisions)
