---
phase: 10
title: Art, Sound & Polish
status: done
---

# Phase 10: Art, Sound & Polish

**Goal:** Ship-quality audiovisual experience. Every pixel and sound meets the "water beads off it" bar. This phase transforms a functional game into a BEAUTIFUL game.

## Tasks

### 1. Art pipeline setup

**File:** `scripts/generate-assets.ts`, `scripts/process-assets.ts`

Add dev dependencies:
```json
{
  "@google/genai": "^1.48.0",
  "sharp": "^0.34.5",
  "tsx": "^4.21.0"
}
```

**Pipeline steps:**
1. **Generate** — Imagen 4 via @google/genai. Prompt per asset. 1024x1024 output
2. **Process** — Sharp: chroma-key background removal, 1px edge-strip (insight 011), resize to game scale
3. **Validate** — Check dimensions, transparency, no border artifacts
4. **Pack** — Optional atlas packing for performance

**Scripts:**
```
pnpm assets:generate    # Imagen 4 API calls (needs .env with API key)
pnpm assets:process     # Sharp processing pipeline
pnpm assets:validate    # Dimension/transparency checks
pnpm assets:pipeline    # All three in sequence
```

### 2. Character sprites

**Art direction:** Hand-drawn / sketchy. Thick, uneven outlines. Tasteful crosshatch shading. Nothing looks machine-made. 48-64px character height.

**The Kid:**
- Oversized hoodie, big eyes, sneakers
- Animation frames per mode: idle (4), walk (6), run (8), sneak (4), jump (3), slide (2)
- Facing left/right (flip horizontally)
- Hiding pose (curled up, only eyes visible)
- Caught reaction (arms up, startled)

**The Bellhop:**
- Tall, lanky, skeletal frame in oversized bellhop uniform
- Glowing eyes under cap
- Swinging lantern in one hand
- Patrol walk (4), rush (6), investigate head-tilt (3), confused (2), bow catch (4)

**The Housekeeper:**
- Round, shuffling figure in apron
- Head rotates unnaturally far
- Cleaning cart always with her
- Patrol waddle (4), checking room (3), skip room sigh (2), wag finger catch (4)

**The Guest:**
- Paper-thin, folded into impossible positions
- Only eyes visible when disguised (faint glow)
- Unfold animation: jerky stop-motion (6 frames)
- Lunge: stretched out, reaching (3)
- Reset: fold back up (reverse of unfold)
- Origami wrap catch (4)

**Imagen 4 prompting strategy:**
- Batch similar assets for style consistency (all kid frames in one session)
- Include style keywords: "hand-drawn, sketchy, thick ink outlines, crosshatch shading, 2D side-view, transparent background"
- Generate at 1024x1024, downscale to game resolution
- Edge-strip all results (insight 011)

### 3. Environment art

**Programmatic tiles (insight 010 — AI tiles fail at 32px):**
- Floor surfaces: carpet (patterned), wood planks, kitchen tile, stone (basement)
- Walls: wallpaper (floors 2-3), exposed brick (basement), plaster (lobby), wood beams (attic)
- All drawn pixel-by-pixel using Sharp raw buffers + master palette

**AI-generated standalone assets (these work well):**
- Furniture: beds, closets, desks, chairs, bathtubs, piano
- Props: shoes (throwable), books (throwable), bottles (throwable), phones, DND signs
- Doors: wooden hotel doors (open/closed frames)
- Windows: tall lobby windows, small room windows
- Elevator: doors open/closed, interior

**Parallax backgrounds (per area):**
- Lobby: tall windows with moonlight streaming in, distant chandelier
- Guest floors: long corridor perspective, repeating door frames
- Attic: exposed roof beams, cobweb patterns, moonlight holes
- Basement: pipes, concrete walls, boiler silhouette

### 4. Color palettes

Per-area palettes from the brainstorm:

| Area | Primary | Accent | Shadow | Mood |
|------|---------|--------|--------|------|
| Lobby | Warm amber #D4A574 | Gold #C9A94E | Deep brown #3D2B1F | Old money, decay |
| Floors 2-3 | Blue-grey #6B7B8D | Pale yellow #E8D5A3 | Dark blue #1A1A2E | Eerie calm |
| Attic | Cold white #C4C8CC | Pale blue #8FA4B8 | Near-black #151520 | Exposure, isolation |
| Basement | Near-black #0D0D12 | Rust red #8B4513 | Void #050508 | Dread, claustrophobia |

### 5. Animation system

**Squash and stretch (kid):**
- Landing after jump: brief vertical squash (0.9x height, 1.1x width) → spring back
- Start running: horizontal stretch for 2 frames
- Direction change: brief squish

**Monster unsettling movement:**
- Bellhop: slight head tilt when listening, lantern swings with sinusoidal motion
- Housekeeper: rhythmic waddle, head rotation exceeds normal range (270+ degrees)
- Guest: jerky stop-motion — skip every other frame for unnatural movement feel

**Sketch wobble effect:**
- Edges aren't perfectly clean — subtle position jitter on outlines
- Implementation: 1-2 pixel random offset on sprite edges per frame
- Creates a "hand-drawn" feel, like the art is alive
- Controlled via constant: `ANIMATION.WOBBLE_INTENSITY` (0 = off, 1 = subtle, 2 = noticeable)

### 6. Spatial audio system

**File:** `src/renderer/audio.ts`

Uses Phaser's Web Audio integration for positional sound.

```typescript
export function createSpatialAudio(scene: Phaser.Scene) {
  return {
    play(key: string, worldPos: Position, options?: { volume?: number; loop?: boolean }) {
      const sound = scene.sound.add(key, {
        volume: computeVolume(worldPos, cameraCenter),
        pan: computePan(worldPos, cameraCenter),
        ...options,
      });
      sound.play();
      return sound;
    },
    updateListener(cameraPos: Position) {
      // Update all active sounds' volume and pan based on new camera position
    },
  };
}

function computeVolume(source: Position, listener: Position): number {
  const dist = distance(source, listener);
  return Math.max(0, 1 - dist / AUDIO.MAX_DISTANCE);
}

function computePan(source: Position, listener: Position): number {
  const dx = source.x - listener.x;
  return Math.max(-1, Math.min(1, dx / AUDIO.PAN_DISTANCE));
}
```

### 7. Sound assets

**Player sounds:**
| Sound | Trigger | Notes |
|-------|---------|-------|
| Footstep (carpet) | Walk/Run/Sneak on carpet | Soft thud, muffled |
| Footstep (wood) | Walk/Run/Sneak on wood | Clear knock |
| Footstep (tile) | Walk/Run/Sneak on tile | Sharp click, slight echo |
| Jump landing | Land after jump | Impact thud, surface-dependent |
| Slide | During slide | Fabric whoosh |
| Door creak | Open/close door | Old wood creak |
| Elevator DING | Elevator arrives | THE sound of the game — crisp, loud, distinctive |
| Breath (holding) | While hiding | Subtle, rhythmic |
| Gasp | Breath runs out | Sharp inhale, audible |

**Monster tells:**
| Monster | Sound | Distance |
|---------|-------|----------|
| Bellhop | Elevator music humming | Far — you hear him coming |
| Bellhop | Bell jingle | Alert state — he heard something |
| Bellhop | Lantern creak | Close — metal swinging |
| Housekeeper | Cart wheels squeaking | Far — rhythmic, predictable |
| Housekeeper | Muttering "the mess..." | Medium |
| Housekeeper | Mop dragging | Close |
| Housekeeper | Tut-tut at open doors | Close |
| Guest | Silence | The absence of sound IS the tell |
| Guest | Paper rustling | Trigger range — too late if you hear this unprepared |

**Ambient:**
| Sound | Location | Behavior |
|-------|----------|----------|
| Rain on windows | Global (louder near windows) | Continuous loop |
| Thunder | Global | Random bursts, synced with lightning flashes |
| Pipe groans | Basement | Periodic |
| Clock ticking | Lobby | Continuous, subtle |
| Elevator cable groans | Near elevator shaft | Continuous, unsettling |
| Music box | Global | Faint melody, gets louder with danger proximity |

**Sound generation:** jsfxr for procedural effects (footsteps, impacts, UI sounds). Recorded/licensed audio for ambient loops and music box melody.

### 8. Environmental polish

**Dust in moonbeams:**
```typescript
// Particle emitter in moonlight zones
scene.add.particles(0, 0, 'dust-particle', {
  x: { min: moonlightZone.x, max: moonlightZone.x + moonlightZone.width },
  y: { min: moonlightZone.y, max: moonlightZone.y + moonlightZone.height },
  speed: { min: 2, max: 8 },
  angle: { min: 80, max: 100 }, // mostly downward
  alpha: { start: 0.3, end: 0 },
  lifespan: 4000,
  frequency: 200,
});
```

**Curtains:**
- Sway when player runs past (velocity-based trigger)
- Subtle sine-wave animation on idle
- React to lightning (brief flutter)

**Rain on windows:**
- Drip animations on window sprites
- Vary intensity (constant gentle, occasional heavy bursts with thunder)

**Creaky floorboards:**
- Specific positions marked in Tiled object layer
- Walking over them emits noise (gameplay element, not just polish)
- Adds unpredictability to "safe" routes

### 9. Full integration testing

**End-to-end playtest checklist:**
- [ ] All 5 nights complete start-to-finish
- [ ] Every monster animation plays correctly with final art
- [ ] Every sound plays at correct moment with correct spatialization
- [ ] Environmental effects don't obscure gameplay
- [ ] Performance: locked 60fps with all effects active
- [ ] Art style coheres across all areas (consistent line weight, palette adherence)
- [ ] Audio tells are distinct and learnable (can you tell which monster from sound alone?)
- [ ] Sketch wobble effect reads as "hand-drawn", not "broken"
- [ ] Lightning reveals useful information (monster positions)
- [ ] No seams in parallax layers
- [ ] No Imagen 4 border artifacts on any sprite (insight 011 edge-strip)
- [ ] No plaid/artifacts on programmatic tiles (insight 010)

## Acceptance Criteria

- [x] All character sprites generated, processed, and integrated (kid + 3 monsters)
- [x] Programmatic tiles for all floor/wall surfaces (NOT AI-generated)
- [x] Chroma-key + 1px edge-strip on all AI sprites (insight 011)
- [x] Per-area color palettes applied consistently
- [x] Squash/stretch on kid, unsettling movement on monsters
- [x] Sketch wobble effect active and tuneable
- [x] Spatial audio: sound attenuates with distance, pans with position
- [x] Surface-dependent footstep sounds work
- [x] All monster audio tells distinct and directional
- [x] Ambient soundscape per area (rain, pipes, clock, cables)
- [x] Music box melody scales with danger proximity
- [x] Elevator DING is unmistakable
- [x] Dust particles, curtain sway, rain drips all rendering
- [x] Lightning flashes synced with thunder audio
- [x] 60fps maintained with all effects
- [ ] **"Water beads off it"** — Briggsy signs off on visual/audio quality

## Deliverable

The game looks and sounds like a hand-drawn horror masterpiece. Don't Starve meets Bendy visual identity. Every audio tell is learnable. Environmental details make the hotel feel alive. The polish bar is met: so fucking slick water beads off it.
