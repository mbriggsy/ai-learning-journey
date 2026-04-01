# Art Style Guide — Hide & Seek

## Style

- **Genre:** Stylized cartoon — Among Us / Overcooked energy
- **Perspective:** Strict top-down (NOT 3/4 view, NOT isometric)
- **Line weight:** 1px at 32x32 final size (~32px at 1024x1024 generation size)
- **Shading:** 2-3 levels per color (base, shadow, highlight). No gradients. No dithering.
- **Light source:** Top-left, consistent across ALL assets
- **Tile size:** 32x32 pixels (generated at 1024x1024, two-stage downscale)
- **Character proportions:** Chibi — head = 10-16px at 32x32, body fills remaining space

## Color Palette

All hex values defined in `assets/palette/master-palette.json` (single source of truth).

| Name | Hex | Usage |
|------|-----|-------|
| Wood Brown | `#8B4513` | Interior wood surfaces |
| Carpet Red | `#C41E3A` | Carpet tiles, UI danger accents |
| Cream Wall | `#F5E6D3` | Wall tiles, UI backgrounds |
| Sonar Blue | `#0047AB` | Sonar ping ring |
| Alert Red | `#FF2400` | FOUND splash, seeker blip, danger |
| Outline Black | `#000000` | All outlines |
| Highlight White | `#FFFFFF` | Sparkles, highlight accents |
| Warm Tan | `#D4C4A8` | UI panel fills, result screens |
| Gold Victory | `#FFD700` | SURVIVED splash, achievements |
| Amber Warning | `#FFA500` | Timer warning state |

### Character Color Families

- **Hider (player):** Cool blue/teal/green — `#2E86C1`, `#1ABC9C`, `#27AE60`
- **Seeker:** Warm red/orange — `#E74C3C`, `#E67E22`, `#922B21`
- **AI Hider:** Purple/magenta — `#8E44AD`, `#C2185B` (palette swap of player hider)

## Prompt Template

Base prompt for ALL asset generation (STYLE_PREFIX):

```
Top-down view pixel art game sprite, 32-pixel grid style with large chunky pixels
visible as distinct squares, stylized cartoon, bold 1-pixel dark outlines, solid
magenta (#FF00FF) background, game asset, no anti-aliasing, no gradients, no
dithering, clean grid-aligned edges, not isometric, not 3/4 view, strict top-down
perspective, no text, no labels, no watermarks
```

### Prompt Conventions

**DO:**
- Name exact palette hex colors in every prompt
- Include negative constraints: "not isometric, not 3/4 view, no smooth gradients"
- Specify "each visible pixel should be ~32x32 real pixels at this 1024x1024 resolution"
- For floors: "seamless tileable texture, edges match when repeated"
- For characters: "facing [direction], [specific pose description]"

**DON'T:**
- Say just "pixel art" (produces smooth pixel-art-style, not actual pixel grid)
- Rely on model memory for colors (repeat palette every call)
- Generate sprite sheets (AI alignment issues — generate frames individually)
- Use transparent backgrounds (Gemini can't reliably do this — use magenta chroma-key)

## Generation Pipeline

1. **Generate** at 1024x1024 with magenta background → `assets/raw/`
2. **Downscale** two-stage: LANCZOS 1024→128, NEAREST 128→32 → preserve pixel edges
3. **Chroma-key** magenta removal (sprites/furniture only, NOT floor tiles)
4. **Alpha cleanup** — snap semi-transparent to binary (>=128 → opaque, <128 → transparent)
5. **Palette enforcement** — quantize all opaque pixels to master palette (no dithering)
6. **Tile extrusion** (tilesets only) — 1px border duplication per tile

## Frame Naming Convention

```
char-{character}-{action}-{direction}-{frame:02d}.png
```

Examples:
- `char-hider-walk-s-01.png` (hider, walking, south, frame 1)
- `char-seeker-chase-e-03.png` (seeker, chasing, east, frame 3)
- `char-seeker-idle-n-02.png` (seeker, idle, north, frame 2)

### Directions

- `s` = South (down, default/hero direction — generate first)
- `n` = North (up/back)
- `e` = East (right side)
- West = programmatic horizontal flip of East (never generated)

### Actions + Frame Counts

| Action | Frames | FPS | Notes |
|--------|--------|-----|-------|
| idle | 2 | 4 | 1px breathing bob |
| walk | 4 | 8 | Contact-down-passing-up cycle |
| chase | 4 | 12 | Seeker only, same structure as walk |

## Aspect Ratio Mapping

| Asset Type | Tiles | API Ratio | Crop Strategy |
|-----------|-------|-----------|---------------|
| Single tile | 1x1 | 1:1 | None |
| Couch | 2x1 | 3:2 | Crop width to 2:1, then downscale |
| Bookshelf | 1x2 | 3:2 | Rotate prompt, crop to 1:2 |
| Table/Bed | 2x2 | 1:1 | Downscale to 64x64, slice to 4 tiles |
| Rug | 3x2 | 3:2 | Downscale proportionally |
