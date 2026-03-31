import Phaser from 'phaser';
import type { DoorId, DoorState, PlayingState } from '../../types/state.js';
import type { ReadonlyDeep } from '../../types/utility.js';
import type { TypedListener } from '../../types/events.js';
import type { GameEventMap } from '../../types/events.js';
import { MINIMAP, DEPTH, DISPLAY } from '../../constants.js';

const TILE_SIZE = DISPLAY.TILE_SIZE;

export class MinimapManager {
  private readonly scene: Phaser.Scene;
  private readonly camera: Phaser.Cameras.Scene2D.Camera;
  private readonly playerDot: Phaser.GameObjects.Arc;
  private readonly doorIndicators: Map<DoorId, Phaser.GameObjects.Rectangle>;
  private readonly seekerBlip: Phaser.GameObjects.Arc;
  private readonly border: Phaser.GameObjects.Rectangle;
  private readonly onDoorToggled: (payload: { id: DoorId; isOpen: boolean }) => void;

  constructor(
    scene: Phaser.Scene,
    playerSprite: Phaser.GameObjects.GameObject,
    mapWidthPx: number,
    mapHeightPx: number,
    doors: ReadonlyMap<DoorId, DoorState>,
    listener: TypedListener<GameEventMap>,
  ) {
    this.scene = scene;
    this.doorIndicators = new Map();

    // Create minimap camera — bottom-right
    const gameWidth = scene.scale.width;
    const gameHeight = scene.scale.height;
    this.camera = scene.cameras.add(
      gameWidth - MINIMAP.WIDTH - MINIMAP.MARGIN,
      gameHeight - MINIMAP.HEIGHT - MINIMAP.MARGIN,
      MINIMAP.WIDTH, MINIMAP.HEIGHT,
      false, 'minimap',
    );

    // Compute zoom to fit full map
    const zoomX = MINIMAP.WIDTH / mapWidthPx;
    const zoomY = MINIMAP.HEIGHT / mapHeightPx;
    const zoom = Math.min(zoomX, zoomY);
    if (zoom > 0) {
      this.camera.setZoom(zoom);
    }

    this.camera.setBounds(0, 0, mapWidthPx, mapHeightPx);
    this.camera.centerOn(mapWidthPx / 2, mapHeightPx / 2);
    this.camera.setBackgroundColor(0x000000);

    // --- Minimap-only indicators ---

    // Player dot — blue, oversized for minimap visibility
    this.playerDot = scene.add.circle(0, 0, 48, 0x0088FF);
    this.playerDot.setDepth(DEPTH.MINIMAP_PLAYER);

    // Door indicators — red (closed) / green (open)
    for (const door of doors.values()) {
      const px = door.position.x * TILE_SIZE + TILE_SIZE / 2;
      const py = door.position.y * TILE_SIZE + TILE_SIZE / 2;
      const color = door.isOpen ? 0x44FF44 : 0xFF4444;
      const rect = scene.add.rectangle(px, py, 48, 48, color);
      rect.setDepth(DEPTH.MINIMAP_DOORS);
      this.doorIndicators.set(door.id, rect);
    }

    // Seeker blip — orange, hidden by default (shown during sonar)
    this.seekerBlip = scene.add.circle(0, 0, 40, 0xFF8800);
    this.seekerBlip.setDepth(DEPTH.MINIMAP_SONAR_BLIP);
    this.seekerBlip.setVisible(false);

    // Border — fixed to screen, minimap camera ignores it
    this.border = scene.add.rectangle(
      gameWidth - MINIMAP.WIDTH / 2 - MINIMAP.MARGIN,
      gameHeight - MINIMAP.HEIGHT / 2 - MINIMAP.MARGIN,
      MINIMAP.WIDTH + 4, MINIMAP.HEIGHT + 4,
    );
    this.border.setStrokeStyle(2, 0xFFFFFF, 0.8);
    this.border.setFillStyle(0x000000, 0);
    this.border.setScrollFactor(0);
    this.border.setDepth(DEPTH.MINIMAP_BORDER);

    // Main camera ignores all minimap-only objects
    const mainCam = scene.cameras.main;
    mainCam.ignore(this.playerDot);
    mainCam.ignore(this.seekerBlip);
    for (const rect of this.doorIndicators.values()) {
      mainCam.ignore(rect);
    }

    // Minimap camera ignores border (it's screen-fixed)
    this.camera.ignore(this.border);

    // UI camera (if exists) ignores minimap objects too
    const uiCam = scene.cameras.getCamera('ui');
    if (uiCam) {
      uiCam.ignore(this.playerDot);
      uiCam.ignore(this.seekerBlip);
      for (const rect of this.doorIndicators.values()) {
        uiCam.ignore(rect);
      }
    }

    // Subscribe to door toggle events
    this.onDoorToggled = ({ id, isOpen }) => {
      const rect = this.doorIndicators.get(id);
      if (rect) {
        rect.setFillStyle(isOpen ? 0x44FF44 : 0xFF4444);
      }
    };
    listener.on('DOOR_TOGGLED', this.onDoorToggled);
  }

  update(state: ReadonlyDeep<PlayingState>): void {
    // Sync player dot position
    this.playerDot.setPosition(state.player.x, state.player.y);
  }

  /** Show seeker blip at position (called by SonarPing) */
  showSeekerBlip(x: number, y: number): void {
    this.seekerBlip.setPosition(x, y);
    this.seekerBlip.setVisible(true);
    this.seekerBlip.setAlpha(1);
  }

  /** Hide seeker blip */
  hideSeekerBlip(): void {
    this.seekerBlip.setVisible(false);
  }

  /** Set blip alpha (for fade animation) */
  setSeekerBlipAlpha(alpha: number): void {
    this.seekerBlip.setAlpha(alpha);
  }

  getSeekerBlip(): Phaser.GameObjects.Arc {
    return this.seekerBlip;
  }

  getCamera(): Phaser.Cameras.Scene2D.Camera {
    return this.camera;
  }

  setVisible(visible: boolean): void {
    this.camera.setVisible(visible);
    this.border.setVisible(visible);
    this.playerDot.setVisible(visible);
    // Door indicators follow minimap visibility
    for (const rect of this.doorIndicators.values()) {
      rect.setVisible(visible);
    }
    if (!visible) {
      this.seekerBlip.setVisible(false);
    }
  }

  destroy(): void {
    this.scene.cameras.remove(this.camera);
    this.playerDot.destroy();
    this.seekerBlip.destroy();
    this.border.destroy();
    for (const rect of this.doorIndicators.values()) {
      rect.destroy();
    }
    this.doorIndicators.clear();
  }
}
