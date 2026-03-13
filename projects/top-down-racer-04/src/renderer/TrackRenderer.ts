/**
 * TrackRenderer — textured track surfaces + environment BG.
 *
 * Replaces v02's solid-color fills with:
 *   - Pre-rendered environment BG sprite (2048x2048)
 *   - Tiled asphalt texture on road surface
 *   - Tiled curb texture on shoulder strips
 *   - Tiled grass texture on off-track areas
 *   - Checkered finish line (from v02)
 *   - Wall boundary strokes (from v02)
 *
 * Texture fills use Graphics.poly().fill({ texture, textureSpace: 'global', matrix })
 * validated in the Step 0 spike test.
 */

import { Assets, Container, Graphics, Matrix, Sprite } from 'pixi.js';
import type { TrackState, Vec2 } from '../engine/types';
import { ASSETS, type TrackId } from '../assets/manifest';

// ── Tile repeat scales (world units per tile repeat) ──
const ASPHALT_TILE_WU = 20;
const GRASS_TILE_WU = 10;
const CURB_TILE_WU = 5;

// ── Tile texture pixel sizes ──
const ASPHALT_TILE_PX = 512;
const GRASS_TILE_PX = 256;
const CURB_TILE_PX_W = 128;
const CURB_TILE_PX_H = 64;

// ── Colors (from v02, used for finish line + walls) ──
const COLOR_WALL_STROKE = 0x7b3b2a;
const COLOR_FINISH_WHITE = 0xffffff;
const COLOR_FINISH_DARK = 0x111111;
const WALL_STROKE_WIDTH = 2.0;
const FINISH_SQUARES = 8;

// ── BG margin in world units beyond track bounding box ──
const BG_MARGIN = 200;

/**
 * Build all track graphics for a given track.
 *
 * Layer order (back to front within trackLayer):
 *   1. Environment BG sprite
 *   2. Grass fill (off-track area)
 *   3. Road surface (tiled asphalt)
 *   4. Shoulder/runoff (tiled curb)
 *   5. Finish line (checkered)
 *   6. Wall strokes
 */
export function buildTrackGraphics(
  track: TrackState,
  trackId: TrackId,
  shoulderSide: 'inner' | 'both' = 'both',
): Container {
  const container = new Container();

  // ── 1. Environment BG ──
  const bgTexture = Assets.get(ASSETS.tracks[trackId].bg);
  if (bgTexture) {
    // Disable mipmaps on large BG (saves ~5.3MB VRAM)
    bgTexture.source.autoGenerateMipmaps = false;

    const bgSprite = new Sprite(bgTexture);
    bgSprite.anchor.set(0.5, 0.5);
    const bb = computeBoundingBox(track);
    bgSprite.position.set(bb.centerX, bb.centerY);
    const bgScale = (bb.maxExtent + BG_MARGIN) / 2048;
    bgSprite.scale.set(bgScale, -bgScale); // negative Y for camera Y-flip (D6)
    container.addChild(bgSprite);
  }

  // ── 2. Grass fill (off-track area between outer boundary and BG edge) ──
  const grassTexture = Assets.get(ASSETS.textures.grass);
  if (grassTexture) {
    const grassGfx = new Graphics();
    const grassMatrix = new Matrix().scale(
      GRASS_TILE_WU / GRASS_TILE_PX,
      GRASS_TILE_WU / GRASS_TILE_PX,
    );
    // Fill outer boundary polygon, cut inner boundary to create annular grass
    grassGfx.poly(flatten(track.outerBoundary))
      .fill({ texture: grassTexture, textureSpace: 'global', matrix: grassMatrix });
    grassGfx.poly(flatten(track.innerBoundary)).cut();
    container.addChild(grassGfx);
  }

  // ── 3. Road surface (tiled asphalt between road edges) ──
  const asphaltTexture = Assets.get(ASSETS.textures.asphalt);
  if (asphaltTexture) {
    const roadGfx = new Graphics();
    const asphaltMatrix = new Matrix().scale(
      ASPHALT_TILE_WU / ASPHALT_TILE_PX,
      ASPHALT_TILE_WU / ASPHALT_TILE_PX,
    );
    // Outer poly depends on shoulderSide config
    const outerRoadPoly = shoulderSide === 'inner'
      ? flatten(track.outerBoundary)
      : flatten(track.outerRoadEdge);
    roadGfx.poly(outerRoadPoly)
      .fill({ texture: asphaltTexture, textureSpace: 'global', matrix: asphaltMatrix });
    roadGfx.poly(flatten(track.innerRoadEdge)).cut();
    container.addChild(roadGfx);
  }

  // ── 4. Shoulder/runoff (tiled curb between road edge and wall) ──
  const curbTexture = Assets.get(ASSETS.textures.curb);
  if (curbTexture) {
    const shoulderGfx = new Graphics();
    const curbMatrix = new Matrix().scale(
      CURB_TILE_WU / CURB_TILE_PX_W,
      CURB_TILE_WU / CURB_TILE_PX_H,
    );

    if (shoulderSide === 'inner' || shoulderSide === 'both') {
      // Inner shoulder: between inner road edge and inner boundary
      shoulderGfx.poly(flatten(track.innerRoadEdge))
        .fill({ texture: curbTexture, textureSpace: 'global', matrix: curbMatrix });
      shoulderGfx.poly(flatten(track.innerBoundary)).cut();
    }

    if (shoulderSide === 'both') {
      // Outer shoulder: between outer boundary and outer road edge
      shoulderGfx.poly(flatten(track.outerBoundary))
        .fill({ texture: curbTexture, textureSpace: 'global', matrix: curbMatrix });
      shoulderGfx.poly(flatten(track.outerRoadEdge)).cut();
    }

    container.addChild(shoulderGfx);
  }

  // ── 5. Finish line (checkered, from v02) ──
  if (track.checkpoints.length > 0) {
    container.addChild(buildFinishLine(track));
  }

  // ── 6. Wall boundary strokes ──
  const walls = new Graphics();
  walls.poly(flatten(track.outerBoundary))
    .stroke({ width: WALL_STROKE_WIDTH, color: COLOR_WALL_STROKE });
  walls.poly(flatten(track.innerBoundary))
    .stroke({ width: WALL_STROKE_WIDTH, color: COLOR_WALL_STROKE });
  container.addChild(walls);

  return container;
}

// ── Helpers ──

function flatten(pts: readonly Vec2[]): number[] {
  const arr: number[] = [];
  for (const p of pts) {
    arr.push(p.x, p.y);
  }
  return arr;
}

function computeBoundingBox(track: TrackState): {
  centerX: number;
  centerY: number;
  maxExtent: number;
} {
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  for (const p of track.outerBoundary) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  return {
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
    maxExtent: Math.max(maxX - minX, maxY - minY),
  };
}

function buildFinishLine(track: TrackState): Graphics {
  const gate = track.checkpoints[0];
  const g = new Graphics();
  const perpX = gate.direction.x;
  const perpY = gate.direction.y;
  const rowThick = 4.0;

  for (let row = 0; row < 2; row++) {
    const rowOffset = (row - 0.5) * rowThick;
    for (let i = 0; i < FINISH_SQUARES; i++) {
      const t0 = i / FINISH_SQUARES;
      const t1 = (i + 1) / FINISH_SQUARES;

      const x0 = gate.left.x + (gate.right.x - gate.left.x) * t0;
      const y0 = gate.left.y + (gate.right.y - gate.left.y) * t0;
      const x1 = gate.left.x + (gate.right.x - gate.left.x) * t1;
      const y1 = gate.left.y + (gate.right.y - gate.left.y) * t1;

      const ox0 = x0 + perpX * rowOffset;
      const oy0 = y0 + perpY * rowOffset;
      const ox1 = x1 + perpX * rowOffset;
      const oy1 = y1 + perpY * rowOffset;

      const qx0 = ox0 + perpX * (rowThick / 2);
      const qy0 = oy0 + perpY * (rowThick / 2);
      const qx1 = ox1 + perpX * (rowThick / 2);
      const qy1 = oy1 + perpY * (rowThick / 2);
      const qx2 = ox1 - perpX * (rowThick / 2);
      const qy2 = oy1 - perpY * (rowThick / 2);
      const qx3 = ox0 - perpX * (rowThick / 2);
      const qy3 = oy0 - perpY * (rowThick / 2);

      const color = (i + row) % 2 === 0 ? COLOR_FINISH_WHITE : COLOR_FINISH_DARK;
      g.poly([qx0, qy0, qx1, qy1, qx2, qy2, qx3, qy3]).fill(color);
    }
  }

  return g;
}
