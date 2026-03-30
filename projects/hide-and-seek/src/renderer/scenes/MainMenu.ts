import Phaser from 'phaser';
import { SceneTransition } from '../utils/SceneTransition.js';
import { getGameSettings } from './Boot.js';

export class MainMenuScene extends Phaser.Scene {
  private buttons: Phaser.GameObjects.Text[] = [];
  private selectedIndex: number = 0;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;

  constructor() {
    super({ key: 'MainMenu' });
  }

  create(): void {
    const { width, height } = this.scale;

    this.cameras.main.setBackgroundColor('#111111');

    // Title
    this.add.text(width / 2, height / 3, 'HIDE & SEEK', {
      fontFamily: 'monospace',
      fontSize: '48px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5);

    // Play button
    const playBtn = this.add.text(width / 2, height / 2 + 40, '[ PLAY ]', {
      fontFamily: 'monospace',
      fontSize: '28px',
      color: '#ffffff',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    playBtn.on('pointerdown', () => this.startGame());
    playBtn.on('pointerover', () => {
      this.selectedIndex = 0;
      this.updateSelection();
    });

    this.buttons = [playBtn];
    this.updateSelection();

    // Keyboard nav
    this.cursors = this.input.keyboard!.createCursorKeys();
    const enterKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    const spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    enterKey.on('down', () => this.confirmSelection());
    spaceKey.on('down', () => this.confirmSelection());

    // Fade in
    this.cameras.main.fadeIn(500, 0, 0, 0);
  }

  override update(): void {
    // Keyboard/gamepad navigation
    if (Phaser.Input.Keyboard.JustDown(this.cursors.up)) {
      this.selectedIndex = Math.max(0, this.selectedIndex - 1);
      this.updateSelection();
    }
    if (Phaser.Input.Keyboard.JustDown(this.cursors.down)) {
      this.selectedIndex = Math.min(this.buttons.length - 1, this.selectedIndex + 1);
      this.updateSelection();
    }

    // Gamepad
    const pad = this.input.gamepad?.getPad(0);
    if (pad) {
      if (pad.A) this.confirmSelection();
    }
  }

  private updateSelection(): void {
    for (let i = 0; i < this.buttons.length; i++) {
      const btn = this.buttons[i]!;
      if (i === this.selectedIndex) {
        btn.setColor('#ffcc00');
      } else {
        btn.setColor('#ffffff');
      }
    }
  }

  private confirmSelection(): void {
    if (SceneTransition.isTransitioning) return;
    if (this.selectedIndex === 0) this.startGame();
  }

  private startGame(): void {
    if (SceneTransition.isTransitioning) return;
    SceneTransition.startScene(this, 'Game', { settings: getGameSettings() });
  }
}
