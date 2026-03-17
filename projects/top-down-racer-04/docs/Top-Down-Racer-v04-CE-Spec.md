?# TOP-DOWN RACER v04
## CE Interview Prep & Architecture Spec
*Prepared by Briggsy "" March 2026*
*The pre-baked answers doc. War-game everything before CE asks.*

---

## Mission

v02 was a genuine technical achievement "" autonomous SDLC, not a line of code written
by a human, an AI that taught itself to race. But the simple visuals undersell the
accomplishment. Someone who doesn't understand what happened looks at it and sees a
rectangle driving in a circle.

v04's job is to make the presentation match the achievement. When someone sees it for
the first time, they should think "that looks like a real game" "" before they even know
the story. The technical flex is CE methodology and the Gemini asset pipeline. The human
flex is: we knew it needed to look better.

---

## What v04 Is

Top-Down Racer v04 is a **visual upgrade + track evolution** of v02. The simulation
engine is battle-tested and untouched. The AI pipeline gets a deliberate upgrade ""
new tracks force genuine retraining so the AI can't coast on memorized trajectories.
The entire build is focused on two goals: make it look like a commercial product, and
make the AI actually *learn* rather than *remember*.

**v02 proved the architecture. v04 proves the graphics pipeline and genuine AI generalization AND Full Compound Engineering Stack.**

The new build challenge: an autonomous AI development system that generates
production-quality visual assets using the Gemini Imagen 4 API (fully autonomous ""
no human art tooling required), integrates them via a structured asset pipeline,
upgrades the PixiJS renderer layer with post-processing shaders and commercial-grade
sprite art, redesigns two of three tracks to be larger and more varied, and retrains
the AI on circuits that make memorization statistically impossible "" all under human
architectural direction, zero hand-written game code.

---

## What Is NOT Changing (Sacred from v02)

| Component | Status | Rationale |
|-----------|--------|-----------|
| Simulation engine (`src/engine/`) | **FROZEN** | 366+ tests, deterministic, 13K ticks/sec. Don't touch it. |
| Engine/renderer architectural boundary | **SACRED** | The non-negotiable foundation. Zero cross-layer imports. |
| Track 1 geometry (oval) | **FROZEN** | Stays as AI training sanity check. Always has been, always will be. |
| AI training pipeline (PPO/SB3/ONNX tooling) | **KEEP "" RETRAIN REQUIRED** | Pipeline infrastructure is proven. New tracks mandate a new model. v02 ONNX is retired. |
| TypeScript + PixiJS v8 stack | **KEEP** | PixiJS v8 WebGL supports everything we need. |
| Vitest + pytest test infrastructure | **KEEP** | Add renderer visual tests, don't replace anything. |
| Static deployment (no server) | **KEEP** | It's a feature, not a limitation. |
| Context7 + Serena + Sequential Thinking | **KEEP** | Proven stack. |

---

## What IS Changing
GSD is out "" CE full stack (along with Context7 + Serena + Sequential Thinking).
Asset generation is fully autonomous via Gemini Imagen 4 API "" no human art tooling required.

| Layer | v02 State | v04 Target |
|-------|-----------|------------|
| Car sprites | Simple geometric shapes / basic sprites | AI-generated high-res top-down car art (4""6 color variants) |
| Track surfaces | Flat color fills | Tiled textures: asphalt, curbs, grass, rumble strips |
| Track environment | Bare track outline | Environment details: barriers, tire walls, grandstands (bg layer) |
| Track 1 (oval) | Learning oval | **Unchanged** "" geometry frozen, visual upgrade only |
| Track 2 (speedway) | Flowing medium circuit | **Redesigned** "" longer, high-speed, genuine braking zones |
| Track 3 (gauntlet) | Tight hairpins + S-curves | **Redesigned** "" full circuit, mixed-radius corners, no repeated shapes |
| AI opponent | v02 ONNX model (Track 3 specialist) | **Retrained** on v04 tracks "" genuine generalization, not memorization |
| Post-processing | Basic PixiJS particles | Bloom, glow, motion blur, heat shimmer on engine |
| Main menu | Functional HTML/PixiJS | Stitch-designed, animated, cinematic feel |
| HUD | Functional text overlay | Commercial racing HUD: speedometer, mini-map, lap counter |
| Track selection screen | Thumbnail grid | Full-screen preview with animated car |
| Sound | Web Audio API synthesized | Upgraded: layered engine sounds, crowd noise, music stinger |

---

## Architecture Decision Record "" Pre-Baked Answers

### ADR-01: Renderer "" PixiJS v8 or Switch -- 

**Decision: Stay on PixiJS v8. No renderer change.**

**Rationale:**
- PixiJS v8 has native WebGL filter/shader support. Bloom, motion blur, glow, displacement
  maps "" all achievable via `@pixi/filter-*` packages or custom GLSL.
- Switching to Three.js or Babylon.js for a 2D top-down game is engineering masturbation.
  We'd spend Phase 1 rewriting a working renderer for zero gameplay benefit.
- The engine/renderer boundary is proven. A renderer swap risks that boundary.
- PixiJS v8 RenderTexture supports offscreen compositing for post-processing passes.

**What this unlocks:** Custom GLSL fragment shaders, `BloomFilter`, `MotionBlurFilter`,
`GlowFilter`, displacement maps for heat shimmer "" all without touching the engine.

---

### ADR-02: Asset Pipeline "" Autonomous Gemini Imagen 4 API

**Decision: Fully autonomous asset generation via Gemini Imagen 4 API. No human art tooling.**

**The Problem:** v04 needs high-quality visual assets but zero human art involvement.
Nano Banana and Ludo.ai require browser interaction. The solution: call the Gemini
Imagen 4 API directly from a build script. Same underlying model, no middleman.

**Pipeline Design:**

```
GENERATION PHASE (fully autonomous "" Claude Code runs this)
  ?""?"? scripts/generate-assets.ts  ??' calls Gemini Imagen 4 API ??' /assets/raw/
  ?""?"? scripts/asset-prompts.ts    ??' typed prompt definitions per asset (versioned in git)
  ?""?"? Google Stitch               ??' menu/HUD design references (screenshots) ??' /assets/raw/ui-designs/

PROCESSING PHASE (autonomous, Claude Code)
  ?""?"? Asset processor script ??' resize, optimize, spritesheet pack ??' /public/assets/
  ?""?"? Manifest generator    ??' typed asset manifest (no magic strings) ??' src/assets/manifest.ts
  ?""?"? Texture atlas builder ??' PixiJS-compatible JSON + PNG atlas

INTEGRATION PHASE (autonomous, Claude Code)
  ?""?"? Renderer reads manifest ??' typed asset refs ??' zero string literals in game code
```

**Setup:**
- API key stored in `.env` as `GEMINI_API_KEY` (gitignored, never committed)
- Run with: `pnpm run generate-assets`
- Script is idempotent "" re-running regenerates all assets cleanly

**Key constraint:** All image prompts live in `scripts/asset-prompts.ts` "" versioned,
reproducible, auditable. If an asset needs to be regenerated, update the prompt and
re-run the script. Never manually substitute hand-made assets.

**Asset manifest pattern:**
```typescript
// src/assets/manifest.ts "" auto-generated, typed
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

**Audio note:** Gemini does not generate audio. Engine sounds use Web Audio API synthesis
(upgraded from v02 "" layered synthesis at idle/mid/high RPM bands blended by speed).
No external audio tool required.

---

### ADR-03: Car Sprites "" Single PNG or Spritesheet -- 

**Decision: Single top-down PNG per color variant + rotation handled by PixiJS transform.**

**Rationale:**
- Top-down racers use continuous rotation. A 36-frame rotation spritesheet is 36 images
  for something PixiJS handles natively with `sprite.rotation = angle`.
- Generate one high-res (256?--256) top-down car PNG per variant. PixiJS rotates it
  at render time with GPU transform. Zero quality loss, fraction of the asset size.
- Exception: Wheel animation (spinning) "" if implemented, use a 4-frame spritesheet.

**Car variants to generate:** Player car (3 color options), AI car (visually distinct ""
different model silhouette, not just recolor).

**Gemini Imagen prompt spec:** "Top-down racing game car sprite, viewed directly from
above, centered on transparent background, 256?--256px, clean vector-style illustration,
hard shadows, [color] racing livery with sponsor decals, front clearly distinguishable
from rear."

---

### ADR-04: Track Art "" Pre-Rendered Background or Tiled Textures -- 

**Decision: Pre-rendered track background PNG + tiled surface textures as overlay.**

**Rationale:**
- Track geometry is defined by the engine's boundary polygon. The renderer just needs
  to look good within those boundaries.
- Pre-render a full-resolution track background (2048?--2048 or 4096?--4096) that includes
  the asphalt surface, curbs, painted lines, and environment. Load as a PixiJS Sprite.
- Overlay a tiled asphalt texture on the driveable surface using a RenderTexture mask.
  This adds visual depth without fighting the engine's boundary data.
- The camera viewport crops the large background "" only the visible area is rendered.

**Asset generation approach (all Gemini Imagen 4 API):**
- Track backgrounds: Prompt includes track shape description, art style, resolution.
- Seamless tile textures: Asphalt, grass, curb "" generated with tileable prompt constraint.

---

### ADR-05: Post-Processing "" Which Effects, Which Approach -- 

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
game world. Filter chain is only applied to world layer "" NOT to HUD layer (HUD stays
crisp). This is a critical constraint: HUD lives outside the filter container.

```
Stage
  ?"??"??"? WorldContainer (has filter chain: bloom, motion blur)
  ?"?    ?"??"??"? TrackLayer (background, surface)
  ?"?    ?"??"??"? CarLayer (sprites + shadow)
  ?"?    ?""?"??"? EffectsLayer (particles, skids)
  ?""?"??"? HUDContainer (NO filters "" always sharp)
       ?"??"??"? Speedometer
       ?"??"??"? LapCounter
       ?""?"??"? MiniMap
```

---

### ADR-06: Google Stitch "" Design Reference or Code Export -- 

**Decision: Stitch as design reference only. Claude Code implements from the reference.**

**Rationale:**
- Stitch exports HTML/CSS or React. Our game UI runs in PixiJS canvas, not DOM.
- Attempting to wedge Stitch's React export into a PixiJS project creates two UI
  systems fighting each other. Maintenance nightmare.
- **Exception:** The main menu and track selection screen CAN be DOM-based overlays
  (HTML/CSS positioned over the canvas). For these, Stitch export is viable.
- The HUD (speedometer, lap counter, mini-map) stays in PixiJS "" too tightly coupled
  to game state for DOM to be practical.

**Workflow:**
1. Claude Code generates Stitch design prompts and captures references
2. Save as design references (screenshots + exported HTML as spec) in `/assets/raw/ui-designs/`
3. Claude Code implements main menu and results screen as DOM overlays matching the design
4. HUD stays PixiJS "" Claude Code builds from HUD design screenshot spec

---

### ADR-07: HUD Design "" What Goes In It -- 

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
state. Checkpoint gates are tick marks. This reads directly from engine state "" no
separate data source needed.

---

### ADR-08: Sound Upgrade "" How Far -- 

**Decision: Upgraded Web Audio API synthesis for engine sound (layered RPM bands).
Keep synthesized SFX for everything else. No external audio API required.**

**Rationale:**
- Gemini does not generate audio. External audio tools (Ludo.ai) require human interaction.
  Fully autonomous audio = synthesis only.
- Layered synthesis at 3 RPM bands (idle, mid, high) blended by speed is the standard
  technique "" sounds significantly better than single-oscillator synthesis.
- Everything else (skid, collision, checkpoint chime) works fine synthesized.

**Audio architecture:**
```
Engine sound: 3 synthesized oscillator layers (idle, mid, high RPM) ??' GainNode crossfade based on speed
SFX: Web Audio API synthesis (keep from v02 "" it's good)
Music: Optional synthesized ambient loop for menu
```

---

### ADR-09: Phase Structure "" How Many Phases -- 

**Decision: 5 phases. Engine frozen. Tracks 2 & 3 redesigned. AI retrained.**

| Phase | Focus | Deliverable |
|-------|-------|-------------|
| 0 | Asset Generation | Run `generate-assets.ts` "" all sprites, textures, backgrounds generated via Gemini Imagen 4 API and dropped into `/assets/raw/` |
| 1 | Asset Pipeline + Track Redesign | Asset processor tooling, typed manifest, texture atlas builder. New track02 + track03 geometry defined and engine-tested. |
| 2 | Core Visual Upgrade | High-res car sprites, track art for all 3 circuits, tiled surface textures, camera polish |
| 3 | Post-Processing & Effects | Bloom, motion blur, shadow, heat shimmer, upgraded particles |
| 4 | Commercial UI & Audio | Stitch-based menus, commercial HUD, mini-map, layered engine audio |
| 5 | AI Retraining & Validation | Sanity run Track 1, full training Track 3 (gauntlet), cross-track generalization audit Track 2, ONNX export |

**Why 5 phases vs v02's 6:** The engine is frozen, so no Phase 1 engine build.
Phase 0 (asset generation) is autonomous and runs before the main build. AI retraining
is a discrete phase that runs after visual work "" it's headless, doesn't care what the
game looks like, just needs the new track geometry to be solid first.

---

### ADR-10: Test Strategy for Visual Layer

**Decision: Snapshot tests for renderer output + visual regression baseline.**

**The problem v02 had:** Renderer tests were hard because PixiJS needs WebGL.
Tests used headless mode. Visual quality is subjective and can't be unit tested.

**v04 approach:**
- Unit tests: Asset manifest integrity (all referenced files exist, correct dimensions)
- Integration tests: Renderer initializes without error, all asset keys resolve
- Visual baseline: Capture screenshots of each screen state at Phase 4 completion.
  Store as baseline images. Future changes can diff against baseline.
- Manual verification gates: At end of each phase, human (Briggsy) plays the game and
  approves visual quality before the phase is closed. This is explicitly in the workflow.

**No attempt to automate "does this look good."** That's a human call.

---

### ADR-11: Asset Generation Timing "" Phase 0, Fully Autonomous

**Decision: Asset generation is Phase 0, runs autonomously before Phase 1 begins.**

**How it works:**
- Claude Code builds `scripts/generate-assets.ts` and `scripts/asset-prompts.ts` in Phase 0
- Script calls Gemini Imagen 4 API with typed prompts for each asset
- All assets drop into `/assets/raw/` automatically
- Phase 1 asset processor picks up from `/assets/raw/` and produces optimized game-ready outputs
- The entire pipeline from prompt to game-ready asset is autonomous "" no human art steps

**Asset inventory (generated by Gemini Imagen 4):**

| Asset | File | Format | Size | Prompt focus |
|-------|------|--------|------|--------------|
| Player car (red) | car-player-red.png | PNG transparent | 256?--256 | Top-down, red livery |
| Player car (blue) | car-player-blue.png | PNG transparent | 256?--256 | Top-down, blue livery |
| Player car (yellow) | car-player-yellow.png | PNG transparent | 256?--256 | Top-down, yellow livery |
| AI opponent car | car-ai.png | PNG transparent | 256?--256 | Different silhouette from player |
| Track 01 background | track01-bg.png | PNG | 2048?--2048 | Oval, day racing, grandstands |
| Track 02 background | track02-bg.png | PNG | 2048?--2048 | Speedway, night, stadium atmosphere |
| Track 03 background | track03-bg.png | PNG | 2048?--2048 | Technical circuit, moody, European aesthetic |
| Asphalt texture | asphalt-tile.png | PNG | 512?--512 | Seamless tileable |
| Grass texture | grass-tile.png | PNG | 256?--256 | Seamless tileable |
| Curb texture | curb-tile.png | PNG | 128?--64 | Red/white alternating, seamless |
| Menu background | menu-bg.png | PNG | 1920?--1080 | Dark, dramatic racing atmosphere |

**Audio:** Synthesized via Web Audio API (no external generation needed "" see ADR-08).

---

### ADR-12: Track Redesign "" What Does "Bigger" Actually Mean -- 

**Decision: Tracks 2 and 3 redesigned for genuine AI generalization. No repeated corner
shapes. Track 1 geometry frozen.**

**The memorization problem:**
v02's AI didn't learn to *drive* "" it learned the optimal action sequence for Track 3's
specific polygon. The model is a lookup table wearing a neural net costume. Change the
geometry and it confidently drives into a wall. That's not racing intelligence.

**Design principle: No two corners share a radius.**
Every corner on Tracks 2 and 3 must have a unique approach speed, radius, and exit
angle. If the AI can't generalize across corner shapes, it fails. This is intentional.
This is the test.

**Track-by-track decisions:**

| Track | Geometry | AI Training Role | Visual Identity |
|-------|----------|-----------------|-----------------|
| Track 1 (oval) | **FROZEN** "" v02 geometry | Sanity check. Quick convergence validation. If AI can't complete this in 100K steps, the reward function is broken. | Clean oval, day racing, simple grandstands |
| Track 2 (speedway) | **NEW** "" long circuit | Primary training circuit. High-speed straights test throttle discipline. 2""3 genuine braking zones. Medium-radius sweepers. | Banked feel, night lighting, stadium atmosphere |
| Track 3 (gauntlet) | **NEW** "" full circuit | Championship circuit. Mixed-radius corners "" one tight hairpin, one long sweeper, one decreasing-radius corner (the bastard), two chicanes. No repeated shape. | Technical, moody, European circuit aesthetic |

**Track 2 design constraints:**
- At least one straight long enough that the AI must decide when to lift, not just stay
  flat (creates meaningful throttle discipline in the reward function)
- No hairpins "" high-speed track, not a technical one
- Width: Wider than v02 tracks (~20% more driveable surface) "" less wall-hugging forced
- Approximate size: 30""40% larger circuit length than v02 Track 2

**Track 3 design constraints:**
- Minimum 6 distinct corners, no two with the same geometric radius
- One genuinely decreasing-radius corner (tightens mid-corner "" punishes late apex)
- One chicane (two direction changes in quick succession)
- Width: Narrower in technical sections, wider on straights "" creates variable challenge
- Approximate size: 50""60% larger circuit length than v02 Track 3
- **The memorization test:** An AI that memorized v02 Track 3 should fail this track
  on the first inference run. If it doesn't, the redesign wasn't different enough.

**Track geometry implementation:**
Track geometry lives in `src/tracks/` as TypeScript data files. The engine reads them.
This is NOT engine code "" it's data. Modifying `track02.ts` and `track03.ts` is within
scope and does not violate the engine freeze.

Claude Code defines the new boundary polygons and checkpoint arrays.
The physics engine handles everything else automatically.

---

### ADR-13: AI Retraining "" Strategy and Success Criteria

**Decision: Full retrain on v04 tracks. v02 ONNX model is retired. Training runs on
Track 3 (gauntlet) as the production circuit, validated on Track 2 (speedway).**

**Why full retrain, not transfer learning:**
- v02 model was trained exclusively on v02 Track 3. Its internal representation encodes
  that specific polygon's geometry.
- Transfer learning from a memorized model into different geometry could produce worse
  convergence than training from scratch "" the old "knowledge" is actively wrong.
- PPO from scratch on v04 tracks is the clean call. 60K steps produced competent driving
  in v02. Budget 2M steps for v04's more complex geometry.

**Training sequence:**
```
Step 1: Sanity run on Track 1 (oval) "" 100K steps
  ??' Validates reward function and training pipeline still work
  ??' Expected: Clean laps within 100K steps
  ??' If fails: Reward function broken before investing in longer run

Step 2: Primary training on Track 3 (gauntlet) "" 2M steps
  ??' Same PPO config as v02, same reward design (it worked first run)
  ??' Expected: Competent lap completion by 1M steps
  ??' Export ONNX at convergence

Step 3: Cross-track validation on Track 2 (speedway) "" inference only, no training
  ??' Load Track 3 model, run inference on Track 2
  ??' Expectation: NOT clean laps "" the model should struggle somewhat
  ??' If it drives Track 2 cleanly without training: either Track 2 is too similar to
    Track 3 (redesign required) or the model actually generalized (document it)
  ??' This is the generalization audit
```

**Reward function:** Ship v02's reward design unchanged. It worked on the first run
with zero tuning. There is no evidence it needs modification for different track shapes.
Do not touch it until there's a specific training failure to diagnose.

**New ONNX model target:** ???50KB browser delivery. v02 was 23.7KB on a simpler track.
More training steps may produce a slightly larger model. 50KB is still instant-load.

**Phase implication:** AI retraining is Phase 5. It runs AFTER visual upgrade phases
because: (a) the training environment is headless "" it doesn't care what the game looks
like, and (b) the new track geometries must be defined and tested before training begins.

---

## Tooling

### Active Stack
- **Compound Engineering (CE)** "" Plan ??' Work ??' Review ??' Compound. No GSD.
- **Context7** "" live PixiJS v8 docs, filter API docs, GLSL references
- **Serena** "" semantic code navigation (critical for renderer refactor)
- **Sequential Thinking** "" architectural decisions
- **Gemini Imagen 4 API** "" autonomous asset generation (`GEMINI_API_KEY` in `.env`)

### New for v04
- **Asset Generator** (`scripts/generate-assets.ts`) "" calls Gemini Imagen 4, drops PNGs into `/assets/raw/`
- **Asset Prompts** (`scripts/asset-prompts.ts`) "" all image prompts versioned in code
- **Asset Processor** "" ingests raw assets, produces optimized outputs with typed manifest
- **Sharp** (npm) "" image processing: resize, format conversion, spritesheet assembly
- **TexturePacker-compatible JSON** "" PixiJS atlas format for sprite batching

---

## Locked Design Decisions (Do Not Revisit)

These are settled. Claude Code should not re-open them. If raised during CE plan phase,
provide these answers:

**Q: Should we retrain the AI -- **
A: YES. Tracks 2 and 3 are redesigned. The v02 ONNX model memorized v02 Track 3's
specific geometry. It must be retired. Full PPO retrain on v04 tracks "" sanity run on
Track 1, production training on Track 3, cross-track validation on Track 2.
The training pipeline infrastructure is proven and unchanged. Just new data.

**Q: Should we change the track geometry for Track 1 -- **
A: No. Track 1 (oval) is frozen. It's the training sanity check. Leave it alone.

**Q: Should we redesign all three tracks -- **
A: No. Track 1 stays. Tracks 2 and 3 are redesigned per ADR-12.

**Q: Should we change the physics engine -- **
A: No. The engine is frozen. Any physics question is out of scope for v04.

**Q: Should we use Three.js / WebGPU / Babylon.js instead of PixiJS -- **
A: No. PixiJS v8 with WebGL filters handles everything we need.

**Q: Should we add multiplayer -- **
A: Absolutely not. Wrong project. Wrong conversation.

**Q: Should we use Spine or DragonBones for car animations -- **
A: No. Cars are static top-down sprites with continuous rotation. PixiJS handles this natively.

**Q: How many new tracks should we add -- **
A: Zero new tracks. Three tracks is the right number. Tracks 2 and 3 are REDESIGNED ""
not adding a fourth track.

**Q: Can we use Nano Banana or Ludo.ai for assets -- **
A: No. Asset generation uses the Gemini Imagen 4 API directly via `scripts/generate-assets.ts`.
The API key is in `.env`. No human art tooling, no browser interaction required.

---

## Success Criteria for v04

A human who has never seen v02 should look at v04 and say:
*"That looks like a real game."*

Specific bars:

| Criterion | Measurement |
|-----------|-------------|
| Car sprites | High-res, clearly rendered, visually distinct player vs AI |
| Track art | All 3 circuits look like actual racing circuits, not geometry tests |
| Track 2 redesign | Longer, high-speed, visually and geometrically distinct from v02 |
| Track 3 redesign | Mixed-radius corners, no two the same "" the memorization breaker |
| AI generalization | v02 ONNX model fails Track 3 (proves redesign worked). v04 model completes it. |
| Post-processing | Bloom on headlights visible, motion blur at speed, no performance drop |
| Menu | Could pass for a commercial game's main screen |
| HUD | Speedometer, lap timer, mini-map all functional and readable |
| Performance | Maintains 60fps with all effects active (PixiJS renderer stats verify) |
| Build integrity | Zero hand-written game code. CE + asset pipeline only. |
| Test coverage | All Phase 1 asset pipeline tooling has automated tests |

---

## What v04 Proves

v02 proved that autonomous AI development can build production-quality software
with measurable engineering rigor.

**v04 proves two things simultaneously:**

First "" the same autonomous methodology can produce **commercial-quality creative
output** "" not just working code, but visually compelling software that competes
aesthetically with commercially produced games. Now with Compound Engineering stack
instead of GSD "" the second methodology variable.

Second "" AI opponents built with this approach can **generalize, not memorize**.
A v04 AI that drives circuits it never trained on isn't just a party trick. It's
evidence that the training design, reward shaping, and observation space produce
transferable driving skill rather than a glorified route planner.

The question is no longer whether AI can write disciplined code.
The question is whether it can make something *beautiful* "" and whether the AI in
the game is actually *intelligent*.

v04 answers both.

---

## Repository

- v02 reference: `C:\Users\brigg\ai-learning-journey\projects\top-down-racer-02`
- v04 new project: `C:\Users\brigg\ai-learning-journey\projects\top-down-racer-04`
- Same stack, same tooling, new target directory
- v04 starts from a fresh scaffold "" do NOT copy v02's src/ wholesale

---

*"" End of v04 CE Spec ""*
*Zero hand-written game code. The human makes decisions. The AI writes code.*
*The human defines beauty. The AI builds it.*

