import Phaser from 'phaser';

const CamEvents = Phaser.Cameras.Scene2D.Events;

export class CinematicManager {
  private readonly scene: Phaser.Scene;
  private readonly mainCamera: Phaser.Cameras.Scene2D.Camera;
  private readonly uiCamera: Phaser.Cameras.Scene2D.Camera;
  private splashText: Phaser.GameObjects.Text | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.mainCamera = scene.cameras.main;

    // UI camera: zoom=1, no scroll — for splash text unaffected by game camera
    const { width, height } = scene.scale;
    this.uiCamera = scene.cameras.add(0, 0, width, height, false, 'ui');
    this.uiCamera.setScroll(0, 0);
  }

  /** Register a game object so the UI camera ignores it (only main camera sees it) */
  ignoreOnUI(gameObject: Phaser.GameObjects.GameObject): void {
    this.uiCamera.ignore(gameObject);
  }

  zoomTo(zoom: number, duration: number, ease: string = 'Linear'): Promise<void> {
    return new Promise((resolve) => {
      this.mainCamera.zoomTo(zoom, duration, ease, true);
      this.mainCamera.once(CamEvents.ZOOM_COMPLETE, () => resolve());
    });
  }

  panTo(x: number, y: number, duration: number, ease: string = 'Linear'): Promise<void> {
    return new Promise((resolve) => {
      this.mainCamera.pan(x, y, duration, ease, true);
      this.mainCamera.once(CamEvents.PAN_COMPLETE, () => resolve());
    });
  }

  flash(duration: number, r: number = 255, g: number = 255, b: number = 255): Promise<void> {
    return new Promise((resolve) => {
      this.mainCamera.flash(duration, r, g, b, true);
      this.mainCamera.once(CamEvents.FLASH_COMPLETE, () => resolve());
    });
  }

  fadeOut(duration: number): Promise<void> {
    return new Promise((resolve) => {
      // fadeOut has no force param — use resetFX() before calling if needed
      this.mainCamera.fadeOut(duration, 0, 0, 0);
      this.mainCamera.once(CamEvents.FADE_OUT_COMPLETE, () => resolve());
    });
  }

  /** Fire-and-forget — not a sequencing gate */
  shake(duration: number, intensity: number): void {
    this.mainCamera.shake(duration, intensity, true);
  }

  /** Show splash text on UI camera only (unaffected by main camera zoom/pan) */
  showSplash(text: string, color: string, fontSize: number = 56): void {
    this.hideSplash();
    const { width, height } = this.scene.scale;
    this.splashText = this.scene.add.text(width / 2, height / 2, text, {
      fontFamily: 'monospace',
      fontSize: `${fontSize}px`,
      color,
      stroke: '#000000',
      strokeThickness: 6,
    }).setOrigin(0.5);

    // Main camera ignores splash — only UI camera renders it
    this.mainCamera.ignore(this.splashText);
  }

  hideSplash(): void {
    if (this.splashText) {
      this.splashText.destroy();
      this.splashText = null;
    }
  }

  getSplashText(): string | null {
    return this.splashText?.text ?? null;
  }

  /** Stop camera follow and reset any in-flight effects */
  prepareForSequence(): void {
    this.mainCamera.stopFollow();
    this.mainCamera.resetFX();
  }

  destroy(): void {
    this.hideSplash();
    this.scene.cameras.remove(this.uiCamera);
  }
}
