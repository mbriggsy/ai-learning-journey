import Phaser from 'phaser';
import type { SpectatorResultsSceneData } from '../../types/scenes.js';
import { SceneTransition } from '../utils/SceneTransition.js';
import { getGameSettings } from './Boot.js';
import { SIMULATION } from '../../constants.js';

export class SpectatorResultsScene extends Phaser.Scene {
  private buttons: Phaser.GameObjects.Text[] = [];
  private selectedIndex: number = 0;
  private outcomeData!: SpectatorResultsSceneData;

  constructor() {
    super({ key: 'SpectatorResults' });
  }

  init(data: SpectatorResultsSceneData): void {
    this.outcomeData = data;
  }

  create(): void {
    const { width, height } = this.scale;

    this.cameras.main.setBackgroundColor('#111111');

    const isFound = this.outcomeData.outcome === 'found';
    const outcomeText = isFound ? 'SEEKER WINS!' : 'HIDER SURVIVES!';
    const outcomeColor = isFound ? '#ff4444' : '#ffd700';

    // Outcome
    this.add.text(width / 2, height / 4, outcomeText, {
      fontFamily: 'monospace', fontSize: '48px',
      color: outcomeColor, stroke: '#000000', strokeThickness: 6,
    }).setOrigin(0.5);

    // Stats
    const totalSecs = Math.floor(this.outcomeData.huntDurationTicks * SIMULATION.FIXED_STEP_S);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    this.add.text(width / 2, height / 2 - 30, [
      `Hunt duration: ${timeStr}`,
      `Seeker: ${this.outcomeData.seekerDifficulty.toUpperCase()}`,
      `Hider: ${this.outcomeData.hiderDifficulty.toUpperCase()}`,
    ].join('\n'), {
      fontFamily: 'monospace', fontSize: '20px',
      color: '#cccccc', align: 'center', lineSpacing: 8,
    }).setOrigin(0.5);

    // Watch Again button
    const watchAgainBtn = this.add.text(width / 2, height / 2 + 80, '[ WATCH AGAIN ]', {
      fontFamily: 'monospace', fontSize: '24px', color: '#ffffff',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    watchAgainBtn.on('pointerdown', () => this.watchAgain());
    watchAgainBtn.on('pointerover', () => { this.selectedIndex = 0; this.updateSelection(); });

    // Main Menu button
    const menuBtn = this.add.text(width / 2, height / 2 + 130, '[ MAIN MENU ]', {
      fontFamily: 'monospace', fontSize: '24px', color: '#ffffff',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    menuBtn.on('pointerdown', () => this.goToMenu());
    menuBtn.on('pointerover', () => { this.selectedIndex = 1; this.updateSelection(); });

    this.buttons = [watchAgainBtn, menuBtn];
    this.updateSelection();

    // Keyboard
    const cursors = this.input.keyboard!.createCursorKeys();
    const enterKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    const spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

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

    this.cameras.main.fadeIn(500, 0, 0, 0);
  }

  private updateSelection(): void {
    for (let i = 0; i < this.buttons.length; i++) {
      this.buttons[i]!.setColor(i === this.selectedIndex ? '#ffcc00' : '#ffffff');
    }
  }

  private confirmSelection(): void {
    if (SceneTransition.isTransitioning) return;
    if (this.selectedIndex === 0) this.watchAgain();
    if (this.selectedIndex === 1) this.goToMenu();
  }

  private watchAgain(): void {
    if (SceneTransition.isTransitioning) return;
    SceneTransition.startScene(this, 'SpectatorGame', { settings: getGameSettings() });
  }

  private goToMenu(): void {
    if (SceneTransition.isTransitioning) return;
    SceneTransition.startScene(this, 'MainMenu');
  }
}
