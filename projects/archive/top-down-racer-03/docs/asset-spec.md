# Asset Generation Spec — Top-Down Racer v03

## How to Use This Document

This is the "shopping list" for generating all visual and audio assets. For each asset:

1. Open the specified **Generation Tool** (Nano Banana or Ludo.ai)
2. Use the **Prompt Guidance** column as your starting prompt
3. Generate the asset at the specified **Dimensions**
4. Save it with the **exact filename** to `assets/raw/{path}` — the pipeline expects these filenames exactly
5. Check the asset against the **Quality Checklist** below before moving on

## Quality Checklist

Before considering an asset "done," verify:

- [ ] **Dimensions** match the spec exactly (resize if needed)
- [ ] **Transparency** — sprites on transparent backgrounds show no background artifacts
- [ ] **Tiling** — textures marked "seamless" tile without visible seams (test in an image editor)
- [ ] **Orientation** — car sprites face UP (front of car at top of image)
- [ ] **Centering** — car sprites are centered in the canvas with equal padding on all sides
- [ ] **Format** — PNG for images, WAV for audio (no JPEG, no MP3)

## After Generation

Once all assets are in `assets/raw/`, run the processing pipeline:

```bash
pnpm run process-assets   # Resize, optimize, copy to public/assets/
pnpm run build-atlas      # Build texture atlas for sprite batching
pnpm run manifest         # Regenerate typed asset manifest
```

(These scripts are stubs in Phase 1 — they will be implemented in Plans 4 and 5.)

## Naming Convention

Raw filenames use the `car-player-{color}` and `track{NN}-bg` convention. This supersedes the abbreviated examples in ADR-02 (e.g., `car-red.png`). The processing pipeline maps raw filenames to final output paths.

## Asset Table

| Asset | Tool | Format | Size | Raw Filename | Prompt Guidance | Notes |
|-------|------|--------|------|-------------|-----------------|-------|
| Player car (red) | Nano Banana | PNG transparent | 256×256 | `sprites/car-player-red.png` | "Top-down racing car, directly from above, centered on transparent background, 256×256px, clean vector-style illustration, hard shadows, red racing livery with sponsor decals, front clearly distinguishable from rear" | Front of car faces UP |
| Player car (blue) | Nano Banana | PNG transparent | 256×256 | `sprites/car-player-blue.png` | Same as above, blue livery | Front of car faces UP |
| Player car (yellow) | Nano Banana | PNG transparent | 256×256 | `sprites/car-player-yellow.png` | Same as above, yellow livery | Front of car faces UP |
| AI car (white) | Nano Banana | PNG transparent | 256×256 | `sprites/car-ai-white.png` | Same prompt but different car silhouette/model, white with minimal livery, clearly distinct from player car shape | Different model from player car |
| Track 01 background | Ludo.ai | PNG | 2048×2048 | `tracks/track01-bg.png` | "Top-down view of oval racing circuit, asphalt surface with painted lines, curbs, grass surroundings, grandstands, day lighting, clean professional style" | Resolution may be upgraded to 4096×4096 if camera zoom requires it |
| Track 02 background | Ludo.ai | PNG | 2048×2048 | `tracks/track02-bg.png` | "Top-down view of high-speed racing circuit, banked feel, asphalt with painted lines, night lighting, stadium atmosphere" | Resolution may be upgraded to 4096×4096 if camera zoom requires it |
| Track 03 background | Ludo.ai | PNG | 2048×2048 | `tracks/track03-bg.png` | "Top-down view of tight technical racing circuit, moody European circuit aesthetic, asphalt with curbs, varied corner types" | Resolution may be upgraded to 4096×4096 if camera zoom requires it |
| Asphalt texture (dry) | Nano Banana | PNG | 512×512 | `textures/asphalt-dry.png` | "Seamless tileable dark asphalt texture, top-down, subtle aggregate detail, racing surface quality" | Must tile seamlessly |
| Asphalt texture (wet) | Nano Banana | PNG | 512×512 | `textures/asphalt-wet.png` | "Seamless tileable wet asphalt texture, top-down, reflective puddles, rain-soaked surface" | Must tile seamlessly |
| Grass texture | Nano Banana | PNG | 256×256 | `textures/grass.png` | "Seamless tileable green grass texture, top-down, manicured racing circuit grass" | Must tile seamlessly |
| Curb texture | Nano Banana | PNG | 128×64 | `textures/curb.png` | "Racing circuit curb/kerb, red and white alternating stripes, top-down view, tileable horizontally" | Tiles horizontally |
| Menu background | Nano Banana | PNG | 1920×1080 | `ui-designs/menu-bg.png` | "Dark dramatic racing atmosphere, moody lighting, suitable as game menu background" | — |
| Engine sound idle | Ludo.ai | WAV | ≤200KB | `audio/engine-idle.wav` | "Racing car engine idle loop, low RPM, seamless loop point" | Must loop seamlessly |
| Engine sound mid | Ludo.ai | WAV | ≤200KB | `audio/engine-mid.wav` | "Racing car engine mid-RPM loop, moderate revs, seamless loop point" | Must loop seamlessly |
| Engine sound high | Ludo.ai | WAV | ≤200KB | `audio/engine-high.wav` | "Racing car engine high-RPM loop, screaming revs, seamless loop point" | Must loop seamlessly |
