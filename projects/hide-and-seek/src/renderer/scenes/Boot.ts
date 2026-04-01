import Phaser from 'phaser';
import { DEFAULT_SETTINGS } from '../../types/settings.js';
import type { GameSettings } from '../../types/settings.js';

/** Shared game settings — set once at boot, read everywhere */
let gameSettings: GameSettings = { ...DEFAULT_SETTINGS };

export function getGameSettings(): Readonly<GameSettings> {
  return gameSettings;
}

export class BootScene extends Phaser.Scene {
  private clickText!: Phaser.GameObjects.Text;
  private progressBar!: Phaser.GameObjects.Rectangle;
  private progressBox!: Phaser.GameObjects.Rectangle;
  private loadingText!: Phaser.GameObjects.Text;
  private started: boolean = false;

  constructor() {
    super({ key: 'Boot' });
  }

  preload(): void {
    // Only load the fog tile here — other assets loaded after click
    this.load.image('fog-tile', 'assets/tilesets/fog.png');
  }

  create(): void {
    const { width, height } = this.scale;

    // Check WebGL
    if (this.renderer.type !== Phaser.WEBGL) {
      this.add.text(width / 2, height / 2,
        'WebGL required.\nPlease use a modern browser.',
        { fontFamily: 'monospace', fontSize: '24px', color: '#ff4444', align: 'center' },
      ).setOrigin(0.5);
      return;
    }

    // Read reduced-motion preference
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    gameSettings = { ...DEFAULT_SETTINGS, reducedMotion: motionQuery.matches };

    this.cameras.main.setBackgroundColor('#111111');

    // Click to Start — unlocks audio context for Phase 6
    this.clickText = this.add.text(width / 2, height / 2, 'Click to Start', {
      fontFamily: 'monospace',
      fontSize: '32px',
      color: '#ffffff',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    this.clickText.on('pointerdown', () => this.beginLoad());

    // Also allow keyboard/gamepad
    this.input.keyboard?.once('keydown', () => this.beginLoad());
  }

  private beginLoad(): void {
    if (this.started) return;
    this.started = true;

    const { width, height } = this.scale;

    this.clickText.destroy();

    // Progress bar
    this.progressBox = this.add.rectangle(width / 2, height / 2, 320, 30, 0x333333).setOrigin(0.5);
    this.progressBar = this.add.rectangle(width / 2 - 155, height / 2, 0, 22, 0x00cc66).setOrigin(0, 0.5);
    this.loadingText = this.add.text(width / 2, height / 2 - 30, 'Loading...', {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#ffffff',
    }).setOrigin(0.5);

    // Load all game assets
    this.load.spritesheet('tiles', 'assets/tilesets/placeholder.png', {
      frameWidth: 32,
      frameHeight: 32,
    });
    this.load.tilemapTiledJSON('map', 'assets/maps/hideandseek.json');

    this.load.on('progress', (value: number) => {
      this.progressBar.width = 310 * value;
    });

    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      this.loadingText.setText(`Failed to load: ${file.key}`);
      this.loadingText.setColor('#ff4444');

      // Add retry button
      this.add.text(width / 2, height / 2 + 40, 'Click to retry', {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: '#ffcc00',
      }).setOrigin(0.5).setInteractive({ useHandCursor: true })
        .once('pointerdown', () => this.scene.restart());
    });

    this.load.on('complete', () => {
      // Fade out to MainMenu
      const cam = this.cameras.main;
      cam.fadeOut(500, 0, 0, 0);
      cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        this.scene.start('MainMenu');
      });
    });

    this.load.start();
  }
}
