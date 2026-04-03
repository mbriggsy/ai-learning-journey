# Plan Under Review

## Plan 1

**Wave:** 1
**Commit Message:** `feat(phase1): scaffold asset pipeline directories, install Sharp, create asset spec document`

### Task Description

Set up the foundational directory structure, dependencies, and documentation that all subsequent Phase 1 plans depend on. This plan produces NO game logic — just infrastructure.

**1. Create directory structure:**

```
assets/
  raw/                    ← gitignored, human drops AI-generated assets here
    sprites/              ← car PNGs from Nano Banana
    textures/             ← tileable surface textures from Nano Banana
    tracks/               ← full track background PNGs from Ludo.ai
    audio/                ← engine sound WAVs from Ludo.ai
    ui-designs/           ← Stitch screenshots for design reference
public/
  assets/                 ← already exists, tracked in git
    sprites/              ← already exists — processed car sprites go here
    textures/             ← NEW — processed tileable textures
    tracks/               ← already exists — processed track backgrounds
    audio/                ← already exists — processed audio
    atlas/                ← NEW — texture atlas output (JSON + PNG)
tools/                    ← already exists (empty) — asset processing scripts
src/
  assets/                 ← NEW — typed manifest lives here
```

Create any directories that don't already exist. Use `.gitkeep` files in empty tracked directories to ensure git tracks them. Do NOT create `.gitkeep` in `assets/raw/` subdirectories (they're gitignored).

**2. Update `.gitignore`:**

Add these lines to the project's `.gitignore`:

```
# Raw AI-generated assets (human provides, not tracked)
assets/raw/
```

**3. Install Sharp as a dev dependency:**

Run `pnpm add -D sharp @types/sharp`. Sharp is the image processing library used by the asset processor and atlas builder (Plans 4 and 5). Installing it now ensures it's available for all Wave 2 work.

**4. Create the Asset Spec Document:**

Create `docs/asset-spec.md` — a comprehensive document defining every asset the human needs to generate. This is the "shopping list" that Briggsy hands to Nano Banana and Ludo.ai.

The document must include, for EACH asset:
- **Asset name** and what it's for
- **Generation tool** (Nano Banana or Ludo.ai)
- **Format** (PNG transparent, PNG opaque, WAV)
- **Dimensions** (exact pixel dimensions)
- **Filename** in `assets/raw/` (exact filename the pipeline expects)
- **Art direction prompt** (what to tell the AI tool)
- **Notes** (seamless tiling, transparency, etc.)

Asset table (from ADR-11, expanded with filenames and prompts):

| Asset | Tool | Format | Size | Raw Filename | Prompt Guidance |
|-------|------|--------|------|-------------|-----------------|
| Player car (red) | Nano Banana | PNG transparent | 256×256 | `sprites/car-player-red.png` | "Top-down racing car, directly from above, centered on transparent background, 256×256px, clean vector-style illustration, hard shadows, red racing livery with sponsor decals, front clearly distinguishable from rear" |
| Player car (blue) | Nano Banana | PNG transparent | 256×256 | `sprites/car-player-blue.png` | Same as above, blue livery |
| Player car (yellow) | Nano Banana | PNG transparent | 256×256 | `sprites/car-player-yellow.png` | Same as above, yellow livery |
| AI car (white) | Nano Banana | PNG transparent | 256×256 | `sprites/car-ai-white.png` | Same prompt but different car silhouette/model, white with minimal livery, clearly distinct from player car shape |
| Track 01 background | Ludo.ai | PNG | 2048×2048 | `tracks/track01-bg.png` | "Top-down view of oval racing circuit, asphalt surface with painted lines, curbs, grass surroundings, grandstands, day lighting, clean professional style" |
| Track 02 background | Ludo.ai | PNG | 2048×2048 | `tracks/track02-bg.png` | "Top-down view of high-speed racing circuit, banked feel, asphalt with painted lines, night lighting, stadium atmosphere" |
| Track 03 background | Ludo.ai | PNG | 2048×2048 | `tracks/track03-bg.png` | "Top-down view of tight technical racing circuit, moody European circuit aesthetic, asphalt with curbs, varied corner types" |
| Asphalt texture (dry) | Nano Banana | PNG | 512×512 | `textures/asphalt-dry.png` | "Seamless tileable dark asphalt texture, top-down, subtle aggregate detail, racing surface quality" |
| Asphalt texture (wet) | Nano Banana | PNG | 512×512 | `textures/asphalt-wet.png` | "Seamless tileable wet asphalt texture, top-down, reflective puddles, rain-soaked surface" |
| Grass texture | Nano Banana | PNG | 256×256 | `textures/grass.png` | "Seamless tileable green grass texture, top-down, manicured racing circuit grass" |
| Curb texture | Nano Banana | PNG | 128×64 | `textures/curb.png` | "Racing circuit curb/kerb, red and white alternating stripes, top-down view, tileable horizontally" |
| Menu background | Nano Banana | PNG | 1920×1080 | `ui-designs/menu-bg.png` | "Dark dramatic racing atmosphere, moody lighting, suitable as game menu background" |
| Engine sound idle | Ludo.ai | WAV | ≤200KB | `audio/engine-idle.wav` | "Racing car engine idle loop, low RPM, seamless loop point" |
| Engine sound mid | Ludo.ai | WAV | ≤200KB | `audio/engine-mid.wav` | "Racing car engine mid-RPM loop, moderate revs, seamless loop point" |
| Engine sound high | Ludo.ai | WAV | ≤200KB | `audio/engine-high.wav` | "Racing car engine high-RPM loop, screaming revs, seamless loop point" |

**5. Create placeholder asset manifest type:**

Create `src/assets/manifest.ts` as a placeholder that establishes the pattern but will be auto-generated by the manifest tool in Plan 5. For now, it should export an empty typed constant:

```typescript
/**
 * Typed asset manifest — auto-generated by tools/generate-manifest.ts
 * DO NOT EDIT MANUALLY. Run `pnpm run manifest` to regenerate.
 *
 * All asset paths are relative to the public/ directory.
 */
export const ASSETS = {
  cars: {},
  tracks: {},
  textures: {},
  audio: {},
  atlas: {},
} as const;

/** Type helper for asset path lookup */
export type AssetManifest = typeof ASSETS;
```

**6. Add npm script stubs:**

In `package.json`, add these script entries (they'll be implemented in Plans 4 and 5):

```json
"process-assets": "tsx tools/process-assets.ts",
"build-atlas": "tsx tools/build-atlas.ts",
"manifest": "tsx tools/generate-manifest.ts"
```

### File Targets
- `assets/raw/` — create directory structure (gitignored)
- `public/assets/textures/` — create directory with `.gitkeep`
- `public/assets/atlas/` — create directory with `.gitkeep`
- `src/assets/manifest.ts` — placeholder typed manifest
- `tools/` — remains empty (Plans 4/5 populate it)
- `.gitignore` — add `assets/raw/` exclusion
- `package.json` — add Sharp dev dependency + script stubs
- `docs/asset-spec.md` — comprehensive asset generation spec

### Acceptance Criteria
- [ ] `assets/raw/` exists with subdirectories: `sprites/`, `textures/`, `tracks/`, `audio/`, `ui-designs/` — `Satisfies: R-006`
- [ ] `assets/raw/` is in `.gitignore` — `Satisfies: R-006`
- [ ] `public/assets/textures/` and `public/assets/atlas/` exist with `.gitkeep` — `Satisfies: R-006`
- [ ] `src/assets/manifest.ts` exports `ASSETS` as `const` with correct type structure — `Satisfies: R-002 (partial)`
- [ ] `sharp` and `@types/sharp` are in `devDependencies` in `package.json` — `Satisfies: R-011`
- [ ] `docs/asset-spec.md` contains complete asset table with all 15 assets, dimensions, formats, filenames, and prompt guidance — `Satisfies: R-008`
- [ ] `package.json` has script stubs: `process-assets`, `build-atlas`, `manifest`
- [ ] `pnpm install` completes without errors after changes
- [ ] TypeScript compiles without errors: `pnpm exec tsc --noEmit`

### Dependencies
- **Depends on:** None — Wave 1
- **Needed by:** Plan 4, Plan 5 (directory structure + Sharp dependency)

### Locked Decisions
- Sharp for image processing (ADR-02, spec)
- Directory structure: `assets/raw/` gitignored, `public/assets/` tracked (spec)
- Typed manifest pattern with `as const` (ADR-02)
- Claude Code defines asset specs; human runs generation tools (ADR-11)
- PixiJS-compatible TexturePacker JSON format for atlas (ADR-02)

# Phase Context

[Phase-scoped context — 17 of 25 spec sections]

## Locked Design Decisions (Do Not Revisit in GSD Interview)

These are settled. GSD should not ask about them. If GSD raises them, provide these
answers:

**Q: Should we retrain the AI?**
A: YES. Tracks 2 and 3 are redesigned. The v02 ONNX model memorized v02 Track 3's
specific geometry. It must be retired. Full PPO retrain on v03 tracks — sanity run on
Track 1, production training on Track 3, cross-track validation on Track 2.
The training pipeline infrastructure is proven and unchanged. Just new data.

**Q: Should we change the track geometry for Track 1?**
A: No. Track 1 (oval) is frozen. It's the training sanity check. It has always been
the canary in the reward function mine. Leave it alone.

**Q: Should we redesign all three tracks?**
A: No. Track 1 stays. Tracks 2 and 3 are redesigned per ADR-12. Three changed tracks
would lose the sanity baseline. One frozen track is the control condition.

**Q: Should we change the physics engine?**
A: No. The engine is frozen. Any physics question is out of scope for v03.

**Q: Should we use Three.js / WebGPU / Babylon.js instead of PixiJS?**
A: No. PixiJS v8 with WebGL filters handles everything we need. Switching renderers
is scope creep that risks the engine/renderer boundary.

**Q: Should we add multiplayer?**
A: Absolutely not. Wrong project. Wrong conversation.

**Q: Should we use Spine or DragonBones for car animations?**
A: No. Cars are static top-down sprites with continuous rotation. PixiJS handles this
natively. Animation rigs are for character games.

**Q: How many new tracks should we add?**
A: Zero new tracks. Three tracks is the right number. Tracks 2 and 3 are REDESIGNED
(bigger, more varied, no repeated corners) but we are not adding a fourth track.
Track art for all three circuits needs to be generated.

---

---

### ADR-13: AI Retraining — Strategy and Success Criteria

**Decision: Full retrain on v03 tracks. v02 ONNX model is retired. Training runs on
Track 3 (gauntlet) as the production circuit, validated on Track 2 (speedway).**

**Why full retrain, not transfer learning:**
- v02 model was trained exclusively on v02 Track 3. Its internal representation encodes
  that specific polygon's geometry.
- Transfer learning from a memorized model into different geometry could produce worse
  convergence than training from scratch — the old "knowledge" is actively wrong.
- PPO from scratch on v03 tracks is the clean call. 60K steps produced competent driving
  in v02. Budget 2M steps for v03's more complex geometry.

**Training sequence:**
```
Step 1: Sanity run on Track 1 (oval) — 100K steps
  → Validates reward function and training pipeline still work
  → Expected: Clean laps within 100K steps
  → If fails: Reward function broken before investing in longer run

Step 2: Primary training on Track 3 (gauntlet) — 2M steps
  → Same PPO config as v02, same reward design (it worked first run)
  → Expected: Competent lap completion by 1M steps
  → Export ONNX at convergence

Step 3: Cross-track validation on Track 2 (speedway) — inference only, no training
  → Load Track 3 model, run inference on Track 2
  → Expectation: NOT clean laps — the model should struggle somewhat
  → If it drives Track 2 cleanly without training: either Track 2 is too similar to
    Track 3 (redesign required) or the model actually generalized (document it)
  → This is the generalization audit
```

**Reward function:** Ship v02's reward design unchanged. It worked on the first run
with zero tuning. There is no evidence it needs modification for different track shapes.
Do not touch it until there's a specific training failure to diagnose.

**New ONNX model target:** ≤50KB browser delivery. v02 was 23.7KB on a simpler track.
More training steps may produce a slightly larger model. 50KB is still instant-load.

**Phase implication:** AI retraining is Phase 5. It runs AFTER visual upgrade phases
because: (a) the training environment is headless — it doesn't care what the game looks
like, and (b) the new track geometries must be defined and tested before training begins.

---

---

### ADR-02: Asset Pipeline — How Do AI-Generated Assets Enter the Build?

**Decision: Structured asset pipeline with Claude Code as integrator.**

**The Problem:** Nano Banana and Ludo.ai generate images. Claude Code writes TypeScript.
The bridge between "AI-generated PNG" and "production game asset" needs a defined workflow.

**Pipeline Design:**

```
GENERATION PHASE (human-assisted, pre-build)
  └─ Nano Banana Pro → car sprites, textures, UI elements → /assets/raw/
  └─ Ludo.ai         → spritesheets, environment art     → /assets/raw/
  └─ Google Stitch   → menu/HUD design references        → /assets/raw/ui-designs/

PROCESSING PHASE (autonomous, Claude Code)
  └─ Asset processor script → resize, optimize, spritesheet pack → /public/assets/
  └─ Manifest generator    → typed asset manifest (no magic strings) → src/assets/manifest.ts
  └─ Texture atlas builder → PixiJS-compatible JSON + PNG atlas

INTEGRATION PHASE (autonomous, Claude Code)
  └─ Renderer reads manifest → typed asset refs → zero string literals in game code
```

**Key constraint:** Claude Code NEVER calls Nano Banana or Ludo.ai APIs directly during
build execution. Asset generation is a human-in-the-loop step that produces files.
Claude Code's job is to define the spec for what assets are needed, process what arrives,
and integrate them.

**Asset manifest pattern:**
```typescript
// src/assets/manifest.ts — auto-generated, typed
export const ASSETS = {
  cars: {
    player: { red: 'assets/sprites/car-red.png', blue: 'assets/sprites/car-blue.png' },
    ai: { white: 'assets/sprites/car-ai.png' }
  },
  tracks: {
    track01: { surface: 'assets/tracks/t01-surface.png', bg: 'assets/tracks/t01-bg.png' }
  }
} as const;
```

---

---

### ADR-09: Phase Structure — How Many Phases?

**Decision: 5 phases. Engine frozen. Tracks 2 & 3 redesigned. AI retrained.**

| Phase | Focus | Deliverable |
|-------|-------|-------------|
| 1 | Asset Pipeline + Track Redesign | Asset processor tooling, typed manifest, texture atlas builder. New track02 + track03 geometry defined and engine-tested. |
| 2 | Core Visual Upgrade | High-res car sprites, track art for all 3 circuits, tiled surface textures, camera polish |
| 3 | Post-Processing & Effects | Bloom, motion blur, shadow, heat shimmer, upgraded particles |
| 4 | Commercial UI & Audio | Stitch-based menus, commercial HUD, mini-map, layered engine audio |
| 5 | AI Retraining & Validation | Sanity run Track 1, full training Track 3 (gauntlet), cross-track generalization audit Track 2, ONNX export |

**Why 5 phases vs v02's 6:** The engine is frozen, so no Phase 1 engine build.
Track redesign is scoped to Phase 1 (data files, not systems). AI retraining is a
discrete phase that runs after visual work — it's headless, doesn't care what the
game looks like, just needs the new track geometry to be solid first.

---

---

## Success Criteria for v03

A human who has never seen v02 should look at v03 and say:
*"That looks like a real game."*

Specific bars:

| Criterion | Measurement |
|-----------|-------------|
| Car sprites | High-res, clearly rendered, visually distinct player vs AI |
| Track art | All 3 circuits look like actual racing circuits, not geometry tests |
| Track 2 redesign | Longer, high-speed, visually and geometrically distinct from v02 |
| Track 3 redesign | Mixed-radius corners, no two the same — the memorization breaker |
| AI generalization | v02 ONNX model fails Track 3 (proves redesign worked). v03 model completes it. |
| Post-processing | Bloom on headlights visible, motion blur at speed, no performance drop |
| Menu | Could pass for a commercial game's main screen |
| HUD | Speedometer, lap timer, mini-map all functional and readable |
| Performance | Maintains 60fps with all effects active (PixiJS renderer stats verify) |
| Build integrity | Zero hand-written game code. GSD + asset pipeline only. |
| Test coverage | All Phase 1 asset pipeline tooling has automated tests |

---

---

### ADR-11: Asset Generation Timing — When in the Build?

**Decision: Asset generation is a Phase 0 that runs before GSD execution begins.**

**Rationale:**
- Claude Code can't call Nano Banana or Ludo.ai. Asset generation requires a human
  operating those tools.
- Waiting for assets mid-build breaks the autonomous execution flow.
- Solution: Define the complete asset spec (sizes, formats, naming, art direction) as
  part of Phase 1 planning. Generate ALL assets before Phase 2 execution begins.
  Phase 2 can then be fully autonomous.

**Asset delivery spec (for Briggsy to hand to Nano Banana / Ludo.ai):**

| Asset | Tool | Format | Size | Notes |
|-------|------|--------|------|-------|
| Car sprite (player, 3 colors) | Nano Banana | PNG transparent | 256×256 | Top-down, front facing up |
| Car sprite (AI opponent) | Nano Banana | PNG transparent | 256×256 | Different silhouette from player |
| Track 01 background (oval) | Ludo.ai | PNG | 2048×2048 | Top-down, asphalt+curbs+environment |
| Track 02 background (speedway) | Ludo.ai | PNG | 2048×2048 | Top-down, same art style |
| Track 03 background (gauntlet) | Ludo.ai | PNG | 2048×2048 | Top-down, tight technical circuit |
| Asphalt texture (tileable) | Nano Banana | PNG | 512×512 | Seamless tile, wet/dry variant |
| Grass texture (tileable) | Nano Banana | PNG | 256×256 | Seamless tile |
| Curb texture (tileable) | Nano Banana | PNG | 128×64 | Red/white alternating curb |
| Menu background | Nano Banana | PNG | 1920×1080 | Dark, dramatic racing atmosphere |
| Engine sound idle loop | Ludo.ai | WAV | ≤200KB | Seamless loop, idle RPM |
| Engine sound mid loop | Ludo.ai | WAV | ≤200KB | Seamless loop, mid RPM |
| Engine sound high loop | Ludo.ai | WAV | ≤200KB | Seamless loop, high RPM |

---

---

### ADR-12: Track Redesign — What Does "Bigger" Actually Mean?

**Decision: Tracks 2 and 3 redesigned for genuine AI generalization. No repeated corner
shapes. Track 1 geometry frozen.**

**The memorization problem:**
v02's AI didn't learn to *drive* — it learned the optimal action sequence for Track 3's
specific polygon. The model is a lookup table wearing a neural net costume. Change the
geometry and it confidently drives into a wall. That's not racing intelligence.

**Design principle: No two corners share a radius.**
Every corner on Tracks 2 and 3 must have a unique approach speed, radius, and exit
angle. If the AI can't generalize across corner shapes, it fails. This is intentional.
This is the test.

**Track-by-track decisions:**

| Track | Geometry | AI Training Role | Visual Identity |
|-------|----------|-----------------|-----------------|
| Track 1 (oval) | **FROZEN** — v02 geometry | Sanity check. Quick convergence validation. Ships if AI can't complete this in 100K steps, the reward function is broken. | Clean oval, day racing, simple grandstands |
| Track 2 (speedway) | **NEW** — long circuit | Primary training circuit. High-speed straights test throttle discipline. 2–3 genuine braking zones. Medium-radius sweepers. | Banked feel, night lighting, stadium atmosphere |
| Track 3 (gauntlet) | **NEW** — full circuit | Championship circuit. Mixed-radius corners — one tight hairpin, one long sweeper, one decreasing-radius corner (the bastard), two chicanes. No repeated shape. | Technical, moody, European circuit aesthetic |

**Track 2 design constraints:**
- At least one straight long enough that the AI must decide when to lift, not just stay
  flat (creates meaningful throttle discipline in the reward function)
- No hairpins — high-speed track, not a technical one
- Width: Wider than v02 tracks (~20% more driveable surface) — less wall-hugging forced
- Approximate size: 30–40% larger circuit length than v02 Track 2

**Track 3 design constraints:**
- Minimum 6 distinct corners, no two with the same geometric radius
- One genuinely decreasing-radius corner (tightens mid-corner — punishes late apex)
- One chicane (two direction changes in quick succession)
- Width: Narrower in technical sections, wider on straights — creates variable challenge
- Approximate size: 50–60% larger circuit length than v02 Track 3
- **The memorization test:** An AI that memorized v02 Track 3 should fail this track
  on the first inference run. If it doesn't, the redesign wasn't different enough.

**Track geometry implementation:**
Track geometry lives in `src/tracks/` as TypeScript data files. The engine reads them.
This is NOT engine code — it's data. Modifying `track02.ts` and `track03.ts` is within
scope and does not violate the engine freeze.

Claude Code defines the new boundary polygons and checkpoint arrays.
The physics engine handles everything else automatically.

---

---

## What v03 Is

Top-Down Racer v03 is a **visual upgrade + track evolution** of v02. The simulation
engine is battle-tested and untouched. The AI pipeline gets a deliberate upgrade —
new tracks force genuine retraining so the AI can't coast on memorized trajectories.
The entire build is focused on two goals: make it look like a commercial product, and
make the AI actually *learn* rather than *remember*.

**v02 proved the architecture. v03 proves the graphics pipeline and genuine AI generalization.**

The new build challenge: an autonomous AI development system that generates
production-quality visual assets using AI image tools (Nano Banana, Ludo.ai, Google
Stitch), integrates them via a structured asset pipeline, upgrades the PixiJS renderer
layer with post-processing shaders and commercial-grade sprite art, redesigns two of
three tracks to be larger and more varied, and retrains the AI on circuits that make
memorization statistically impossible — all under human architectural direction, zero
hand-written game code.

---

---

### ADR-04: Track Art — Pre-Rendered Background or Tiled Textures?

**Decision: Pre-rendered track background PNG + tiled surface textures as overlay.**

**Rationale:**
- Track geometry is defined by the engine's boundary polygon. The renderer just needs
  to look good within those boundaries.
- Pre-render a full-resolution track background (2048×2048 or 4096×4096) that includes
  the asphalt surface, curbs, painted lines, and environment. Load as a PixiJS Sprite.
- Overlay a tiled asphalt texture on the driveable surface using a RenderTexture mask.
  This adds visual depth without fighting the engine's boundary data.
- The camera viewport crops the large background — only the visible area is rendered.

**Asset generation approach:**
- Ludo.ai: Generate the track background with proper racing art style for each track.
  Prompt includes: track shape reference (screenshot from v02), art style, resolution.
- Nano Banana: Generate seamless tileable asphalt texture, grass texture, curb texture.

---

---

## What Is NOT Changing (Sacred from v02)

| Component | Status | Rationale |
|-----------|--------|-----------|
| Simulation engine (`src/engine/`) | **FROZEN** | 366+ tests, deterministic, 13K ticks/sec. Don't touch it. |
| Engine/renderer architectural boundary | **SACRED** | The non-negotiable foundation. Zero cross-layer imports. |
| Track 1 geometry (oval) | **FROZEN** | Stays as AI training sanity check. Always has been, always will be. |
| AI training pipeline (PPO/SB3/ONNX tooling) | **KEEP — RETRAIN REQUIRED** | Pipeline infrastructure is proven. New tracks mandate a new model. v02 ONNX is retired. |
| TypeScript + PixiJS v8 stack | **KEEP** | PixiJS v8 WebGL supports everything we need. |
| Vitest + pytest test infrastructure | **KEEP** | Add renderer visual tests, don't replace anything. |
| Static deployment (no server) | **KEEP** | It's a feature, not a limitation. |
| GSD orchestration framework | **KEEP + EXTEND** | Add asset pipeline as a new tool category. |
| Context7 + Serena + Sequential Thinking | **KEEP** | Proven stack. |

---

---

### ADR-07: HUD Design — What Goes In It?

**Decision: Racing-style HUD with 5 components.**

| Component | Data Source | Position | Implementation |
|-----------|-------------|----------|----------------|
| Speedometer | `carState.speed` | Bottom center | Analog gauge (PixiJS Graphics arc) |
| Current lap / total laps | `timingState` | Top center | PixiJS Text |
| Lap timer | `timingState.currentLapTime` | Top right | PixiJS Text, monospace |
| Best lap | `timingState.bestLap` | Top right (below timer) | PixiJS Text, dim until set |
| Mini-map | Track geometry + car positions | Bottom right | PixiJS Graphics, scaled down |
| Position indicator | Race position vs AI | Top left | PixiJS Text ("P1" / "P2") |

**Mini-map architecture:** The mini-map renders the track boundary polygon at 1/20th
scale as a PixiJS Graphics object. Car positions are dots drawn each frame from engine
state. Checkpoint gates are tick marks. This reads directly from engine state — no
separate data source needed.

---

---

## What IS Changing

| Layer | v02 State | v03 Target |
|-------|-----------|------------|
| Car sprites | Simple geometric shapes / basic sprites | AI-generated high-res top-down car art (4–6 color variants) |
| Track surfaces | Flat color fills | Tiled textures: asphalt, curbs, grass, rumble strips |
| Track environment | Bare track outline | Environment details: barriers, tire walls, grandstands (bg layer) |
| Track 1 (oval) | Learning oval | **Unchanged** — geometry frozen, visual upgrade only |
| Track 2 (speedway) | Flowing medium circuit | **Redesigned** — longer, high-speed, genuine braking zones |
| Track 3 (gauntlet) | Tight hairpins + S-curves | **Redesigned** — full circuit, mixed-radius corners, no repeated shapes |
| AI opponent | v02 ONNX model (Track 3 specialist) | **Retrained** on v03 tracks — genuine generalization, not memorization |
| Post-processing | Basic PixiJS particles | Bloom, glow, motion blur, heat shimmer on engine |
| Main menu | Functional HTML/PixiJS | Stitch-designed, animated, cinematic feel |
| HUD | Functional text overlay | Commercial racing HUD: speedometer, mini-map, lap counter |
| Track selection screen | Thumbnail grid | Full-screen preview with animated car |
| Sound | Web Audio API synthesized | Upgraded: layered engine sounds, crowd noise, music stinger |

---

---

### New for v03

- **Asset Processor** — custom Node.js script (built in Phase 1) that ingests raw
  assets and produces optimized game-ready outputs with the typed manifest
- **Sharp** (npm) — image processing library for resize, format conversion, spritesheet
  assembly. Claude Code uses this to build the asset pipeline.
- **TexturePacker-compatible JSON** — PixiJS atlas format for sprite batching

---

---

### ADR-06: Google Stitch — Design Reference or Code Export?

**Decision: Stitch as design reference only. Claude Code implements from the reference.**

**Rationale:**
- Stitch exports HTML/CSS or React. Our game UI runs in PixiJS canvas, not DOM.
- Attempting to wedge Stitch's React export into a PixiJS project creates two UI
  systems fighting each other. Maintenance nightmare.
- **Exception:** The main menu and track selection screen CAN be DOM-based overlays
  (HTML/CSS positioned over the canvas). For these, Stitch export is viable.
- The HUD (speedometer, lap counter, mini-map) stays in PixiJS — too tightly coupled
  to game state for DOM to be practical.

**Workflow:**
1. Generate Stitch designs for: main menu, track select, results screen, pause menu
2. Save as design references (screenshots + exported HTML as spec)
3. Claude Code implements main menu and results screen as DOM overlays matching the design
4. HUD stays PixiJS — Claude Code builds from HUD design screenshot spec

---

---

### ADR-10: Test Strategy for Visual Layer

**Decision: Snapshot tests for renderer output + visual regression baseline.**

**The problem v02 had:** Renderer tests were hard because PixiJS needs WebGL.
Tests used headless mode. Visual quality is subjective and can't be unit tested.

**v03 approach:**
- Unit tests: Asset manifest integrity (all referenced files exist, correct dimensions)
- Integration tests: Renderer initializes without error, all asset keys resolve
- Visual baseline: Capture screenshots of each screen state at Phase 4 completion.
  Store as baseline images. Future changes can diff against baseline.
- Manual verification gates: At end of each phase, human (Briggsy) plays the game and
  approves visual quality before the phase is closed. This is explicitly in the workflow.

**No attempt to automate "does this look good."** That's a human call.

---

---

### ADR-03: Car Sprites — Single PNG or Spritesheet?

**Decision: Single top-down PNG per color variant + rotation handled by PixiJS transform.**

**Rationale:**
- Top-down racers use continuous rotation. A 36-frame rotation spritesheet is 36 images
  for something PixiJS handles natively with `sprite.rotation = angle`.
- Generate one high-res (256×256) top-down car PNG per variant. PixiJS rotates it
  at render time with GPU transform. Zero quality loss, fraction of the asset size.
- Exception: Wheel animation (spinning) — if implemented, use a 4-frame spritesheet.

**Car variants to generate:** Player car (3 color options), AI car (visually distinct —
different model silhouette, not just recolor).

**Spec for Nano Banana prompt:** "Top-down racing game car sprite, viewed directly from
above, centered on transparent background, 256×256px, clean vector-style illustration,
hard shadows, [color] racing livery with sponsor decals, front clearly distinguishable
from rear."

---

---

### ADR-05: Post-Processing — Which Effects, Which Approach?

**Decision: PixiJS filter chain on a dedicated compositing container.**

**Effects priority (implement in order):**

| Priority | Effect | Implementation | Visual Impact |
|----------|--------|----------------|---------------|
| P0 | Bloom / glow on headlights | `@pixi/filter-bloom` or custom GLSL | Immediate commercial feel |
| P0 | Car shadow (soft drop shadow) | `DropShadowFilter` | Depth, grounding |
| P1 | Motion blur on car at speed | `MotionBlurFilter` (velocity-driven) | Speed sensation |
| P1 | Skid mark persistence | RenderTexture accumulation (v02 had this, upgrade quality) | Racing authenticity |
| P2 | Heat shimmer behind exhaust | Displacement map filter, animated UV offset | Polish |
| P2 | Speed lines (screen-space) | Custom GLSL, speed-gated | Arcade feel |
| P3 | Screen-space bloom (full scene) | CRT/bloom post-pass on RenderTexture | Cinematic |

**Architecture:** All post-processing runs on a `PostProcessContainer` that wraps the
game world. Filter chain is only applied to world layer — NOT to HUD layer (HUD stays
crisp). This is a critical constraint: HUD lives outside the filter container.

```
Stage
  ├── WorldContainer (has filter chain: bloom, motion blur)
  │    ├── TrackLayer (background, surface)
  │    ├── CarLayer (sprites + shadow)
  │    └── EffectsLayer (particles, skids)
  └── HUDContainer (NO filters — always sharp)
       ├── Speedometer
       ├── LapCounter
       └── MiniMap
```

---

# Locked Design Decisions

None declared.

These decisions are settled. If a finding conflicts with a locked decision, discard the finding.

# Findings Format

# Agent Findings Format

**Every agent outputs EXACTLY this format. No exceptions.**

---

## Agent {{AGENT_ID}}: {{AGENT_NAME}} — Findings

**Domain:** {{AGENT_DOMAIN}}
**Plan reviewed:** {{PLAN_ID}}
**Duration:** {{DURATION}}

### Findings

| # | Severity | Category | Finding | Location | Fix |
|---|----------|----------|---------|----------|-----|
| 1 | 🔴 CRITICAL | {{category}} | What is wrong | File/function/line if known | Exact fix — not vague advice |

### Summary

- **Issues found:** {{COUNT}} ({{CRITICAL}} critical, {{HIGH}} high, {{MEDIUM}} medium, {{LOW}} low)
- **Verdict:** CONCERNS / CLEAN

---

## Rules

1. **If you find nothing, say so explicitly:**
   ```
   ### Findings

   No issues found in my domain.

   ### Summary

   - **Issues found:** 0
   - **Verdict:** CLEAN
   ```

2. **Severity levels — use these definitions, not vibes:**
   - 🔴 **CRITICAL** — Will cause runtime failure, data loss, or security breach. Code CANNOT ship with this.
   - 🟠 **HIGH** — Will cause incorrect behavior or significant degradation. Should not ship.
   - 🟡 **MEDIUM** — Suboptimal but functional. Should fix before shipping.
   - 🔵 **LOW** — Style, naming, minor improvement. Fix if time permits.

3. **Category must be one of:** `api-misuse`, `logic-error`, `boundary-violation`, `race-condition`, `security`, `performance`, `resource-leak`, `type-error`, `missing-edge-case`, `incorrect-assumption`, `over-engineering`, `missing-validation`, `state-management`, `dependency-issue`, `test-gap`

4. **"Fix" means the fix.** Not "consider fixing" or "you might want to." State what the code should do instead. Be specific enough that a developer could implement it without asking follow-up questions.

5. **Stay in your lane.** You are one specialist. If something is outside your domain, leave it — another agent covers it. Do NOT invent findings to justify your existence.

6. **Do NOT repeat prior findings.** If earlier agents already found an issue and it's in your Prior Findings section, skip it. Add new perspective only if you have a DIFFERENT fix or a higher severity assessment. Prefix with: `(Escalation of Prior Finding #X)`

7. **Verdict rules:**
   - `CONCERNS` if ANY finding is CRITICAL or HIGH
   - `CLEAN` if all findings are MEDIUM/LOW or no findings
