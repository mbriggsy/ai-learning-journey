## Phase 1: Asset Pipeline & Track Geometry

**Delivers:** A working asset processing toolchain that ingests raw images/audio and produces optimized, typed game assets — plus new Track 2 and Track 3 geometry definitions tested against the frozen simulation engine.
**Dependencies:** None
**Human Gates:** `[HUMAN GATE]` Human must generate raw assets using Nano Banana and Ludo.ai per the asset delivery spec (ADR-11) and place them in `assets/raw/` before Phase 2 can begin. Asset specs (sizes, formats, prompts, naming conventions) are defined as output of this phase.
**Estimated Plans:** 5

**Scope:**
- Sharp-based asset processor script (`tools/`) — resize, optimize, format conversion for sprites, textures, and audio
- Texture atlas builder producing PixiJS-compatible JSON + PNG atlas output
- Typed asset manifest generator (`src/assets/manifest.ts`) — zero magic strings, all asset references are typed constants
- New Track 2 (speedway) geometry: boundary polygon, checkpoint array, start positions — validated against engine constraints (long straights, genuine braking zones, wider surface, 30-40% larger than v02 Track 2)
- New Track 3 (gauntlet) geometry: boundary polygon, checkpoint array, start positions — minimum 6 unique-radius corners, one decreasing-radius corner, one chicane, narrower technical sections (50-60% larger than v02 Track 3)
- Asset spec document defining exact prompts, dimensions, formats, and naming conventions for every asset the human needs to generate
- Directory structure: `assets/raw/` (gitignored), `public/assets/` (tracked)

**Success Criteria:**
- Asset processor script accepts a raw PNG/WAV, produces correctly sized/optimized output in `public/assets/`
- Manifest generator produces a valid TypeScript file with `as const` typing — all referenced file paths exist
- Track 2 and Track 3 geometry loads in the frozen engine — cars can complete laps, checkpoints fire correctly
- Track 3 has zero repeated corner radii (verifiable from geometry data)
- All tooling has automated tests (Vitest)

**Locked Decisions (from spec):**
- Engine (`src/engine/`) is FROZEN — zero modifications
- Track geometry files (`src/tracks/`) are DATA, not engine code — safe to create/modify
- Track 1 (oval) geometry is FROZEN
- Sharp for image processing
- PixiJS-compatible TexturePacker JSON format for atlas
- Claude Code defines asset specs; human runs generation tools

---

## Phase 2: Core Visual Upgrade

**Delivers:** The game renders with high-resolution AI-generated car sprites, full-track background art, and tiled surface textures on all three circuits — replacing all geometric placeholder graphics.
**Dependencies:** Phase 1 (asset pipeline tooling and track geometry must exist; raw assets must have been generated and processed)
**Human Gates:** `[HUMAN GATE]` Human must have generated all raw assets per Phase 1's asset spec and placed them in `assets/raw/` before this phase begins. Human visual approval at phase end — "do the tracks and cars look right?"
**Estimated Plans:** 4

**Scope:**
- Integration of high-res car sprites (player 3 colors + AI variant) into renderer via typed manifest — PixiJS native rotation, no spritesheets for rotation
- Track background art integration for all 3 circuits (2048×2048 or 4096×4096 pre-rendered PNGs)
- Tiled surface texture overlay system — asphalt, grass, curb textures masked to driveable surface via RenderTexture
- Camera viewport system polish — only visible area of large track background renders
- Car shadow (soft drop shadow via PixiJS filter) for depth and grounding
- Renderer layer structure established: TrackLayer → CarLayer → EffectsLayer

**Success Criteria:**
- All three tracks render with full background art and tiled surface textures — no flat color fills remain
- Car sprites are high-res, visually distinct between player and AI, rotate smoothly via PixiJS transform
- Drop shadows render beneath all cars
- Game maintains 60fps with all visual assets loaded (PixiJS renderer stats)
- Zero magic string asset references — all assets loaded through typed manifest
- Asset manifest integrity test passes: every referenced file exists with correct dimensions

**Locked Decisions (from spec):**
- Single top-down PNG per car color variant — PixiJS handles rotation natively
- Pre-rendered track background PNG + tiled surface textures as overlay (ADR-04)
- Engine/renderer boundary is SACRED — renderer reads engine state, never mutates game logic
- Stay on PixiJS v8 WebGL

---

## Phase 3: Post-Processing & Effects

**Delivers:** A complete post-processing pipeline with bloom, motion blur, heat shimmer, and upgraded particle effects — applied to the world layer only, with HUD remaining crisp outside the filter chain.
**Dependencies:** Phase 2 (visual assets and renderer layer structure must exist)
**Human Gates:** `[HUMAN GATE]` Human visual approval at phase end — subjective quality check on effects intensity and look.
**Estimated Plans:** 4

**Scope:**
- WorldContainer / HUDContainer architecture — filter chain applies ONLY to WorldContainer, HUD stays outside (crisp)
- P0 effects: Bloom/glow on car headlights (`@pixi/filter-bloom` or custom GLSL), car drop shadow refinement
- P1 effects: Velocity-driven motion blur on cars at speed (`MotionBlurFilter`), upgraded skid mark persistence via RenderTexture accumulation
- P2 effects: Heat shimmer behind exhaust (displacement map filter with animated UV offset), speed-gated screen-space speed lines (custom GLSL)
- P3 effects: Full-scene screen-space bloom via CRT/bloom post-pass on RenderTexture
- Performance budgeting — all effects must maintain 60fps; effects degrade gracefully if frame budget exceeded

**Success Criteria:**
- Bloom visibly renders on car headlights/highlights
- Motion blur activates proportionally to car speed — zero blur when stationary, visible blur at top speed
- HUD text remains pixel-sharp with all world effects active (verified by screenshot comparison)
- Skid marks persist on track surface and accumulate across laps
- 60fps maintained with full effect chain active (measured via PixiJS renderer stats)
- WorldContainer and HUDContainer are separate — filters on WorldContainer do not affect HUDContainer

**Locked Decisions (from spec):**
- PixiJS filter chain on dedicated compositing container (ADR-05)
- HUD lives OUTSIDE the filter container — stays crisp (ADR-05, CLAUDE.md)
- Post-processing layer order: WorldContainer (filters) → HUDContainer (no filters)
- Effect priority order: P0 bloom/shadow → P1 motion blur/skids → P2 shimmer/speed lines → P3 scene bloom

---

## Phase 4: Commercial UI & Audio

**Delivers:** A complete commercial-quality UI layer (main menu, track selection, HUD with speedometer/mini-map/lap counter, results screen) plus layered engine audio — the game looks and sounds like a shipped product.
**Dependencies:** Phase 3 (post-processing pipeline must exist so HUD integration respects filter boundaries)
**Human Gates:** `[HUMAN GATE]` Human must generate menu background art and engine sound loops (idle/mid/high RPM WAVs) via Nano Banana and Ludo.ai before this phase begins. Human visual/audio approval at phase end.
**Estimated Plans:** 5

**Scope:**
- Main menu as DOM overlay matching Stitch design reference — animated, cinematic feel
- Track selection screen as DOM overlay — full-screen track preview with animated car
- Results screen and pause menu as DOM overlays
- PixiJS HUD: analog speedometer gauge (Graphics arc driven by `carState.speed`), current lap/total laps, lap timer (monospace), best lap display, position indicator (P1/P2)
- Mini-map: track boundary polygon at 1/20th scale (PixiJS Graphics), car position dots updated per frame, checkpoint tick marks
- Layered engine audio: 3 WAV loops (idle, mid, high RPM) with GainNode crossfade driven by `carState.speed`
- Existing synthesized SFX preserved from v02 (skid, collision, checkpoint chime)
- Optional: Ludo.ai-generated ambient racing music for menu screen

**Success Criteria:**
- Main menu renders and navigates to track selection → race → results without errors
- All 5 HUD components display correct live data during gameplay
- Mini-map accurately reflects car positions and track shape
- Engine audio crossfades smoothly between RPM bands — no clicks, pops, or gaps
- Menu screens are DOM overlays positioned correctly over canvas at all viewport sizes
- HUD remains inside PixiJS canvas, outside filter chain (crisp rendering verified)
- 60fps maintained with full HUD rendering

**Locked Decisions (from spec):**
- Stitch as design reference only — Claude Code implements (ADR-06)
- Main menu and track selection are DOM overlays; HUD stays in PixiJS (ADR-06)
- HUD components per ADR-07: speedometer, lap/total, lap timer, best lap, mini-map, position
- Engine audio: 3 WAV loops with GainNode crossfade; synthesized SFX kept from v02 (ADR-08)
- No Spine/DragonBones animation rigs

---

## Phase 5: AI Retraining & Cross-Track Validation

**Delivers:** A production-ready ONNX AI model trained on v03 Track 3 (gauntlet) geometry, validated for generalization on Track 2 (speedway), with Track 1 (oval) used as sanity check — replacing the retired v02 model.
**Dependencies:** Phase 1 (new track geometry must be finalized and engine-tested; Phases 2-4 are NOT required — training is headless)
**Human Gates:** `[HUMAN GATE]` Human monitors training runs and approves convergence. Human makes go/no-go decision on generalization audit results (Track 2 inference). Human approves final ONNX model for shipping.
**Estimated Plans:** 4

**Scope:**
- Step 1: Sanity run on Track 1 (oval) — 100K steps, validates reward function and training pipeline on frozen geometry
- Step 2: Primary training on Track 3 (gauntlet) — up to 2M steps, same PPO config and reward design as v02, no reward function changes unless Step 1 fails
- Step 3: Cross-track generalization audit on Track 2 (speedway) — inference only, no training. Document whether model generalizes or fails, and why.
- ONNX export of converged Track 3 model — target ≤50KB browser delivery
- Integration of new ONNX model into game build, replacing retired v02 model
- Training documentation: convergence curves, step counts, generalization audit results

**Success Criteria:**
- Track 1 sanity run: AI completes clean laps within 100K training steps (reward function validated)
- Track 3 training: AI completes laps competently by convergence — no wall-hugging, reasonable racing lines
- v02 ONNX model fails on v03 Track 3 when tested (proves redesign worked — the memorization test)
- Track 2 generalization audit completed and documented (pass or fail, with analysis)
- Exported ONNX model is ≤50KB
- Model loads and runs inference in the browser at 60fps

**Locked Decisions (from spec):**
- Full PPO retrain from scratch — no transfer learning from v02 (ADR-13)
- v02 ONNX model is RETIRED
- Reward function shipped unchanged from v02 unless specific failure diagnosed
- Training sequence: Track 1 sanity → Track 3 primary → Track 2 validation (ADR-13)
- Track 1 geometry frozen — training sanity check only
- Phase 5 depends only on Phase 1 (track geometry), not on visual phases 2-4