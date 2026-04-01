import Phaser from 'phaser';
import type { PauseAuthority } from '../systems/PauseAuthority.js';
import { PAUSE_REASONS } from '../systems/PauseAuthority.js';
import { SceneTransition } from '../utils/SceneTransition.js';

/** Set by Game/SpectatorGame scene before launching PauseMenu */
let sharedPauseAuthority: PauseAuthority | null = null;
let parentSceneKey: string = 'Game';

export function setPauseAuthority(pa: PauseAuthority, sceneKey: string = 'Game'): void {
  sharedPauseAuthority = pa;
  parentSceneKey = sceneKey;
}

export class PauseMenuScene extends Phaser.Scene {
  private buttons: Phaser.GameObjects.Text[] = [];
  private selectedIndex: number = 0;

  constructor() {
    super({ key: 'PauseMenu' });
  }

  create(): void {
    const { width, height } = this.scale;

    // Semi-transparent background
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7);

    // PAUSED title
    this.add.text(width / 2, height / 3, 'PAUSED', {
      fontFamily: 'monospace',
      fontSize: '48px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5);

    // Resume button
    const resumeBtn = this.add.text(width / 2, height / 2, '[ RESUME ]', {
      fontFamily: 'monospace',
      fontSize: '24px',
      color: '#ffffff',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    resumeBtn.on('pointerdown', () => this.resumeGame());
    resumeBtn.on('pointerover', () => { this.selectedIndex = 0; this.updateSelection(); });

    // Quit to Menu button
    const quitBtn = this.add.text(width / 2, height / 2 + 50, '[ QUIT TO MENU ]', {
      fontFamily: 'monospace',
      fontSize: '24px',
      color: '#ffffff',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    quitBtn.on('pointerdown', () => this.quitToMenu());
    quitBtn.on('pointerover', () => { this.selectedIndex = 1; this.updateSelection(); });

    this.buttons = [resumeBtn, quitBtn];
    this.updateSelection();

    // Keyboard
    const cursors = this.input.keyboard!.createCursorKeys();
    const enterKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    const spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    const escKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

    cursors.up.on('down', () => {
      this.selectedIndex = Math.max(0, this.selectedIndex - 1);
      this.updateSelection();
    });
    cursors.down.on('down', () => {
      this.selectedIndex = Math.min(this.buttons.length - 1, this.selectedIndex + 1);
      this.updateSelection();
    });
    enterKey.on('down', () => this.confirmSelection());
    spaceKey.on('down', () => this.confirmSelection());
    escKey.on('down', () => this.resumeGame());
  }

  private updateSelection(): void {
    for (let i = 0; i < this.buttons.length; i++) {
      this.buttons[i]!.setColor(i === this.selectedIndex ? '#ffcc00' : '#ffffff');
    }
  }

  private confirmSelection(): void {
    if (this.selectedIndex === 0) this.resumeGame();
    if (this.selectedIndex === 1) this.quitToMenu();
  }

  private resumeGame(): void {
    sharedPauseAuthority?.release(PAUSE_REASONS.MENU);
    this.scene.wake(parentSceneKey);
    this.scene.wake('HUD');
    this.scene.stop('PauseMenu');
  }

  private quitToMenu(): void {
    this.scene.stop(parentSceneKey);
    this.scene.stop('HUD');
    // Stop PauseMenu AFTER starting transition — stopping before would
    // kill the camera, preventing FADE_OUT_COMPLETE from firing and
    // permanently locking SceneTransition.isTransitioning = true.
    SceneTransition.startScene(this, 'MainMenu');
  }
}
