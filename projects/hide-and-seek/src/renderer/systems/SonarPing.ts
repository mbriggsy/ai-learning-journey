import Phaser from 'phaser';
import type { TypedListener } from '../../types/events.js';
import type { GameEventMap } from '../../types/events.js';
import type { GameFlowKind } from '../../types/state.js';
import type { MinimapManager } from './MinimapManager.js';
import { SONAR, DEPTH, DISPLAY } from '../../constants.js';

const TILE_SIZE = DISPLAY.TILE_SIZE;

export class SonarPing {
  private readonly scene: Phaser.Scene;
  private readonly minimap: MinimapManager;
  private readonly ring: Phaser.GameObjects.Graphics;
  private readonly listener: TypedListener<GameEventMap>;
  private readonly getPlayerPos: () => { x: number; y: number };
  private readonly onSonarPing: (payload: { seekerX: number; seekerY: number }) => void;
  private readonly onPhaseChanged: (kind: GameFlowKind) => void;
  private counterTween: Phaser.Tweens.Tween | null = null;
  private blippedThisPing: boolean = false;

  constructor(
    scene: Phaser.Scene,
    minimap: MinimapManager,
    listener: TypedListener<GameEventMap>,
    getPlayerPos: () => { x: number; y: number },
  ) {
    this.scene = scene;
    this.minimap = minimap;
    this.listener = listener;
    this.getPlayerPos = getPlayerPos;

    // Reusable ring graphics — minimap-only
    this.ring = scene.add.graphics();
    this.ring.setDepth(DEPTH.MINIMAP_SONAR_RING);
    this.ring.setVisible(false);

    // Main camera ignores ring
    scene.cameras.main.ignore(this.ring);

    // UI camera ignores ring
    const uiCam = scene.cameras.getCamera('ui');
    if (uiCam) {
      uiCam.ignore(this.ring);
    }

    // Subscribe to events
    this.onSonarPing = (payload) => this.startPing(payload.seekerX, payload.seekerY);
    this.onPhaseChanged = (kind) => {
      if (kind !== 'hunt') this.cleanup();
    };

    listener.on('SONAR_PING_DUE', this.onSonarPing);
    listener.on('PHASE_CHANGED', this.onPhaseChanged);
  }

  private startPing(seekerX: number, seekerY: number): void {
    this.blippedThisPing = false;

    const player = this.getPlayerPos();
    const maxRadius = SONAR.RING_MAX_RADIUS_TILES * TILE_SIZE;
    const seekerDist = Phaser.Math.Distance.Between(player.x, player.y, seekerX, seekerY);

    this.ring.setVisible(true);

    // Animate ring expansion via addCounter
    const counter = this.scene.tweens.addCounter({
      from: 0,
      to: maxRadius,
      duration: SONAR.RING_DURATION_MS,
      ease: 'Sine.easeOut',
      onUpdate: (tween) => {
        const radius = tween.getValue() ?? 0;
        const progress = radius / maxRadius;

        // Redraw ring
        this.ring.clear();
        this.ring.lineStyle(3, 0x00FFAA, 0.6 * (1 - progress));
        this.ring.strokeCircle(player.x, player.y, radius);

        // Distance-based blip reveal
        if (!this.blippedThisPing) {
          const dynamicThreshold = SONAR.BLIP_THRESHOLD + (progress * 8);
          if (Math.abs(radius - seekerDist) < dynamicThreshold) {
            this.blippedThisPing = true;
            this.showBlip(seekerX, seekerY);
          }
        }
      },
      onComplete: () => {
        this.ring.clear();
        this.ring.setVisible(false);
      },
    });

    this.counterTween = counter;
  }

  private showBlip(seekerX: number, seekerY: number): void {
    this.minimap.showSeekerBlip(seekerX, seekerY);

    // Hold, then fade
    this.scene.time.delayedCall(SONAR.BLIP_HOLD_DURATION_MS, () => {
      this.scene.tweens.add({
        targets: this.minimap.getSeekerBlip(),
        alpha: 0,
        duration: SONAR.BLIP_FADE_DURATION_MS,
        onComplete: () => {
          this.minimap.hideSeekerBlip();
        },
      });
    });
  }

  private cleanup(): void {
    if (this.counterTween) {
      this.counterTween.stop();
      this.counterTween = null;
    }
    this.scene.tweens.killTweensOf(this.minimap.getSeekerBlip());

    this.ring.clear();
    this.ring.setVisible(false);
    this.minimap.hideSeekerBlip();
  }

  destroy(): void {
    this.cleanup();
    this.listener.off('SONAR_PING_DUE', this.onSonarPing);
    this.listener.off('PHASE_CHANGED', this.onPhaseChanged);
    this.ring.destroy();
  }
}
