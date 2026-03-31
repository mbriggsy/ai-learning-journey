import Phaser from 'phaser';
import type { ReadonlyDeep } from '../../types/utility.js';
import type { PlayingState } from '../../types/state.js';
import { DEPTH, FOG, DISPLAY, VISION } from '../../constants.js';

const FOG_STATE = { UNEXPLORED: 0, EXPLORED: 1, VISIBLE: 2 } as const;
type FogStateValue = typeof FOG_STATE[keyof typeof FOG_STATE];

export class FogRenderer {
  private readonly scene: Phaser.Scene;
  private readonly mapWidth: number;
  private readonly mapHeight: number;
  private readonly tileCount: number;

  // Pre-allocated arrays (zero runtime allocation)
  private readonly fogState: Uint8Array;
  private readonly alphaTarget: Float32Array;
  private readonly previouslyVisible: number[];

  // Fog overlay tilemap
  private readonly fogTilemap: Phaser.Tilemaps.Tilemap;
  private readonly fogLayer: Phaser.Tilemaps.TilemapLayer;
  private readonly fogTiles: Phaser.Tilemaps.Tile[];

  private readonly visionRange: number;

  constructor(scene: Phaser.Scene, mapWidth: number, mapHeight: number) {
    this.scene = scene;
    this.mapWidth = mapWidth;
    this.mapHeight = mapHeight;
    this.tileCount = mapWidth * mapHeight;
    this.visionRange = VISION.HIDER_RANGE;

    // Pre-allocate state arrays
    this.fogState = new Uint8Array(this.tileCount);
    this.alphaTarget = new Float32Array(this.tileCount).fill(FOG.ALPHA_UNEXPLORED);
    this.previouslyVisible = [];

    // Create fog overlay tilemap
    const tileSize = DISPLAY.TILE_SIZE;
    this.fogTilemap = scene.make.tilemap({
      tileWidth: tileSize,
      tileHeight: tileSize,
      width: mapWidth,
      height: mapHeight,
    });

    const fogTileset = this.fogTilemap.addTilesetImage('fog', 'fog-tile', tileSize, tileSize, 0, 0);
    if (!fogTileset) throw new Error('Fog tileset "fog" not found — ensure fog.png is loaded');

    this.fogLayer = this.fogTilemap.createBlankLayer('fog', fogTileset, 0, 0)!;
    if (!this.fogLayer) throw new Error('Failed to create fog layer');

    // Fill with black tiles and set depth above game objects
    this.fogLayer.fill(0); // tile index 0 = the solid black tile
    this.fogLayer.setDepth(DEPTH.FOG);

    // Cache tile references to avoid getTileAt per frame
    this.fogTiles = [];
    for (let y = 0; y < mapHeight; y++) {
      for (let x = 0; x < mapWidth; x++) {
        const tile = this.fogLayer.getTileAt(x, y);
        if (tile) {
          this.fogTiles.push(tile);
        }
      }
    }
  }

  /** Per-frame update — reads playerFov from game state, NEVER computes FOV */
  update(state: ReadonlyDeep<PlayingState>): void {
    const visibleTiles = state.playerFov;
    const cam = this.scene.cameras.main;
    const wv = cam.worldView;
    const tileSize = DISPLAY.TILE_SIZE;

    // Compute camera-visible tile bounds for culled iteration
    const minTX = Math.max(0, Math.floor(wv.x / tileSize));
    const minTY = Math.max(0, Math.floor(wv.y / tileSize));
    const maxTX = Math.min(this.mapWidth - 1, Math.ceil((wv.x + wv.width) / tileSize));
    const maxTY = Math.min(this.mapHeight - 1, Math.ceil((wv.y + wv.height) / tileSize));

    // Step 1: Demote previously visible tiles to EXPLORED
    for (let i = this.previouslyVisible.length - 1; i >= 0; i--) {
      const idx = this.previouslyVisible[i]!;
      if (this.fogState[idx] === FOG_STATE.VISIBLE) {
        this.fogState[idx] = FOG_STATE.EXPLORED;
        this.alphaTarget[idx] = FOG.ALPHA_EXPLORED;
      }
    }
    this.previouslyVisible.length = 0;

    // Step 2: Promote currently visible tiles
    for (let i = 0; i < this.tileCount; i++) {
      if (visibleTiles[i] === 1) {
        this.fogState[i] = FOG_STATE.VISIBLE;
        this.previouslyVisible.push(i);

        // Distance-based alpha falloff (vignette)
        const tx = i % this.mapWidth;
        const ty = (i - tx) / this.mapWidth;
        const playerTileX = state.player.x / tileSize;
        const playerTileY = state.player.y / tileSize;
        const dist = Math.hypot(tx - playerTileX, ty - playerTileY);

        const innerRadius = this.visionRange * FOG.VIGNETTE_INNER;
        if (dist <= innerRadius) {
          this.alphaTarget[i] = FOG.ALPHA_VISIBLE;
        } else {
          const t = Math.min(1, (dist - innerRadius) / (this.visionRange - innerRadius));
          this.alphaTarget[i] = t * FOG.VIGNETTE_OUTER_ALPHA;
        }
      }
    }

    // Step 3: Manual lerp — camera-culled only
    for (let ty = minTY; ty <= maxTY; ty++) {
      for (let tx = minTX; tx <= maxTX; tx++) {
        const idx = ty * this.mapWidth + tx;
        const tile = this.fogTiles[idx];
        if (!tile) continue;

        const target = this.alphaTarget[idx]!;
        const diff = target - tile.alpha;
        if (Math.abs(diff) < FOG.CONVERGENCE) {
          tile.alpha = target;
        } else {
          tile.alpha += diff * FOG.LERP_FACTOR;
        }
      }
    }
  }

  /** Check if a tile is currently visible (used for seeker sprite visibility) */
  isTileVisible(tileX: number, tileY: number): boolean {
    if (tileX < 0 || tileX >= this.mapWidth || tileY < 0 || tileY >= this.mapHeight) return false;
    return this.fogState[tileY * this.mapWidth + tileX] === FOG_STATE.VISIBLE;
  }

  /** Get raw fog state array (for TestBridge) */
  getFogState(): Uint8Array {
    return this.fogState;
  }

  /** Transition from COUNTDOWN to HUNT — reset all fog to unexplored */
  transitionToHunt(): void {
    this.fogState.fill(FOG_STATE.UNEXPLORED);
    this.alphaTarget.fill(FOG.ALPHA_UNEXPLORED);
    this.previouslyVisible.length = 0;

    // Set all tile alphas to fully opaque
    for (const tile of this.fogTiles) {
      tile.alpha = FOG.ALPHA_UNEXPLORED;
    }
  }

  /** Reveal fog in a radius around a point (used for found moment) */
  revealArea(pixelX: number, pixelY: number, radiusTiles: number): void {
    const tileSize = DISPLAY.TILE_SIZE;
    const cx = Math.floor(pixelX / tileSize);
    const cy = Math.floor(pixelY / tileSize);
    const r2 = radiusTiles * radiusTiles;

    for (let dy = -radiusTiles; dy <= radiusTiles; dy++) {
      for (let dx = -radiusTiles; dx <= radiusTiles; dx++) {
        if (dx * dx + dy * dy > r2) continue;
        const tx = cx + dx;
        const ty = cy + dy;
        if (tx < 0 || tx >= this.mapWidth || ty < 0 || ty >= this.mapHeight) continue;
        const idx = ty * this.mapWidth + tx;
        this.fogState[idx] = FOG_STATE.VISIBLE;
        this.alphaTarget[idx] = FOG.ALPHA_VISIBLE;
      }
    }
  }

  /** Full reset for Play Again */
  reset(): void {
    this.transitionToHunt();
  }

  /** Get the fog layer for CinematicManager.ignoreOnUI() registration */
  getLayer(): Phaser.Tilemaps.TilemapLayer {
    return this.fogLayer;
  }

  destroy(): void {
    this.fogLayer.destroy();
    this.fogTilemap.destroy();
  }
}
