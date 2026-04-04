---
phase: 5
title: Camera & Visibility
status: deep
---

# Phase 5: Camera & Visibility

**Goal:** Camera follows player with all behavior modes, parallax works, darkness renders with light source cutouts. This is the first phase with significant renderer-layer code.

## Tasks

### 1. Camera controller

**File:** `src/renderer/camera-controller.ts`

The camera has multiple behavior modes that blend based on game state. This lives in the renderer because it directly controls `Phaser.Cameras.Scene2D.Camera`.

**Lead-ahead:**
```typescript
// Camera target leads ahead of player in movement direction
const leadX = player.x + (facing === 'right' ? CAMERA.LEAD_DISTANCE : -CAMERA.LEAD_DISTANCE);
camera.startFollow(null); // manual positioning
camera.scrollX = lerp(camera.scrollX, leadX - camera.width / 2, CAMERA.FOLLOW_LERP);
camera.scrollY = lerp(camera.scrollY, player.y - camera.height / 2, CAMERA.FOLLOW_LERP);
```

**Zoom-on-hide:**
```typescript
if (playerState.hiding) {
  camera.zoomTo(CAMERA.HIDE_ZOOM, CAMERA.ZOOM_DURATION_MS); // zoom in, claustrophobic
} else {
  camera.zoomTo(1, CAMERA.ZOOM_DURATION_MS); // zoom back out
}
```

**Screen shake:**
```typescript
emitter.on('MONSTER_ALERT', () => {
  camera.shake(CAMERA.SHAKE_DURATION_MS, CAMERA.SHAKE_INTENSITY);
});
```

**Horror beat hold:**
```typescript
// When monster first enters viewport, briefly freeze camera on it
emitter.on('MONSTER_SPOTTED', (monsterPos) => {
  camera.pan(monsterPos.x, monsterPos.y, CAMERA.HORROR_HOLD_MS, 'Power2');
  // After hold, return to player follow
  this.time.delayedCall(CAMERA.HORROR_HOLD_MS, () => resumeFollow());
});
```

**Constants:**
```typescript
export const CAMERA = {
  LEAD_DISTANCE: 80,
  FOLLOW_LERP: 0.08,
  HIDE_ZOOM: 1.4,
  ZOOM_DURATION_MS: 300,
  SHAKE_DURATION_MS: 150,
  SHAKE_INTENSITY: 0.005,
  HORROR_HOLD_MS: 800,
} as const satisfies Record<string, number>;
```

### 2. Parallax layers

**File:** `src/renderer/parallax.ts`

Three layers scrolling at different rates relative to the camera:

| Layer | Content | Scroll Factor | Depth |
|-------|---------|--------------|-------|
| Background | Architecture (walls, windows, distant features) | 0.3 | -2 |
| Midground | Play area (rooms, corridors, interactive objects) | 1.0 | 0 |
| Foreground | Furniture edges, railings, cobwebs | 1.3 | 2 |

```typescript
export function createParallaxLayers(scene: Phaser.Scene) {
  const bg = scene.add.tileSprite(0, 0, width, height, 'bg-layer');
  bg.setScrollFactor(0.3);
  bg.setDepth(-2);

  // Midground is the tilemap itself (scroll factor 1.0, default)

  const fg = scene.add.tileSprite(0, 0, width, height, 'fg-layer');
  fg.setScrollFactor(1.3);
  fg.setDepth(2);
}
```

Parallax layers use placeholder art in this phase — final art comes in Phase 10. The system just needs to prove the scroll rates feel right.

### 3. Darkness and light zone rendering

**File:** `src/renderer/lighting.ts`

The hotel is dark. Visibility comes from light sources. Implemented as a darkness overlay with cutouts.

**Approach: RenderTexture darkness mask**

```typescript
export function createLightingSystem(scene: Phaser.Scene) {
  // Full-screen dark overlay
  const darkness = scene.add.renderTexture(0, 0, width, height);
  darkness.setDepth(100); // above everything
  darkness.setBlendMode(Phaser.BlendModes.MULTIPLY);

  return {
    update(lightSources: readonly LightSource[]) {
      // Fill with ambient darkness
      darkness.clear();
      darkness.fill(0x000000, ambientLight); // ambient controls base darkness

      // Cut out light sources (draw circles with lighter color)
      for (const light of lightSources) {
        darkness.draw(lightCircle, light.x, light.y); // pre-made gradient circle
      }
    },
  };
}
```

**Light sources:**
| Source | Behavior | Phase Added |
|--------|----------|------------|
| Ambient (per floor) | Static level from light zone data | This phase |
| Moonlight (lobby, attic) | Static bright zones | This phase |
| Flickering sconces | Subtle intensity wobble | This phase |
| Bellhop's lantern | Moves with Bellhop, swings | Phase 6 |
| Housekeeper's cart | Harsh fluorescent, visible under doors | Phase 7 |
| Player's lighter | Player-controlled, limited fuel | Phase 8 |
| Lightning flashes | Occasional full-screen flash | This phase |

### 4. Monster light source visibility

Monster light sources serve a gameplay purpose — you can see light under doors before the monster enters your room.

```typescript
// Light visible under/around closed doors
if (door.isClosed && monsterLightNearDoor(monster, door)) {
  // Render a thin light strip at the bottom of the door
  drawLightStrip(door.position, monster.lightIntensity);
}
```

This is a CRITICAL gameplay tell — the player sees harsh fluorescent light creeping under a door and knows the Housekeeper is in the next room.

### 5. Lightning flashes

```typescript
export function createLightningSystem(scene: Phaser.Scene, emitter: Emitter) {
  // Random lightning at intervals
  const scheduleNext = () => {
    const delay = Phaser.Math.Between(15000, 45000); // 15-45 seconds
    scene.time.delayedCall(delay, () => {
      // Flash: briefly set ambient to 1.0 (full visibility)
      flash();
      scheduleNext();
    });
  };

  const flash = () => {
    // Brief white flash overlay, then fade back to ambient
    // Duration: ~200ms bright, ~500ms fade
  };

  scheduleNext();
}
```

Lightning flashes briefly reveal everything — including monster positions. A gift and a scare.

## Constants

```typescript
export const CAMERA = {
  LEAD_DISTANCE: 80,
  FOLLOW_LERP: 0.08,
  HIDE_ZOOM: 1.4,
  ZOOM_DURATION_MS: 300,
  SHAKE_DURATION_MS: 150,
  SHAKE_INTENSITY: 0.005,
  HORROR_HOLD_MS: 800,
} as const satisfies Record<string, number>;

export const LIGHTING = {
  SCONCE_FLICKER_MIN: 0.8,
  SCONCE_FLICKER_MAX: 1.0,
  SCONCE_FLICKER_SPEED: 2.0,
  LIGHTNING_MIN_INTERVAL_MS: 15000,
  LIGHTNING_MAX_INTERVAL_MS: 45000,
  LIGHTNING_FLASH_MS: 200,
  LIGHTNING_FADE_MS: 500,
  LIGHT_UNDER_DOOR_WIDTH: 4,
} as const satisfies Record<string, number>;
```

## Acceptance Criteria

- [ ] Camera leads ahead in movement direction with smooth lerp
- [ ] Camera zooms in when player hides, zooms out when exiting
- [ ] Screen shake fires on MONSTER_ALERT event
- [ ] Horror beat hold pans to monster briefly, then returns to player
- [ ] Parallax: 3 layers scroll at different rates (0.3, 1.0, 1.3)
- [ ] Darkness overlay renders with correct ambient light per floor
- [ ] Light sources cut through darkness (circles with gradients)
- [ ] Sconces flicker subtly
- [ ] Lightning flashes at random intervals, briefly reveals full scene
- [ ] Monster light visible under closed doors (gameplay tell)
- [ ] Camera bounded to level edges (no scrolling past the world)

## Deliverable

Camera system with all 4 behavior modes. Parallax scrolling. Darkness-with-light-sources visibility system. Monster light tells through doors. Lightning flashes. The hotel LOOKS like a dark, atmospheric horror game.
