import Phaser from 'phaser';
import { SceneTransition } from '../utils/SceneTransition.js';
import { getGameSettings, updateGameSettings } from './Boot.js';
import type { Difficulty } from '../../types/settings.js';

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];
const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'EASY',
  medium: 'MEDIUM',
  hard: 'HARD',
};

export class MainMenuScene extends Phaser.Scene {
  private buttons: Phaser.GameObjects.Text[] = [];
  private selectedIndex: number = 0;

  // Difficulty selectors
  private seekerDiffIndex: number = 0;
  private hiderDiffIndex: number = 0;
  private seekerDiffText!: Phaser.GameObjects.Text;
  private hiderDiffLabel!: Phaser.GameObjects.Text;
  private hiderDiffText!: Phaser.GameObjects.Text;

  // Mode state
  private showAIDiffs: boolean = false;

  constructor() {
    super({ key: 'MainMenu' });
  }

  create(): void {
    const { width, height } = this.scale;

    this.cameras.main.setBackgroundColor('#111111');
    this.showAIDiffs = false;
    this.seekerDiffIndex = 0;
    this.hiderDiffIndex = 0;

    // Title
    this.add.text(width / 2, height / 5, 'HIDE & SEEK', {
      fontFamily: 'monospace', fontSize: '48px',
      color: '#ffffff', stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5);

    // --- Seeker difficulty selector ---
    this.add.text(width / 2, height / 3, 'SEEKER DIFFICULTY', {
      fontFamily: 'monospace', fontSize: '14px', color: '#888888',
    }).setOrigin(0.5);

    this.seekerDiffText = this.add.text(width / 2, height / 3 + 28, '< EASY >', {
      fontFamily: 'monospace', fontSize: '22px', color: '#ffcc00',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    this.seekerDiffText.on('pointerdown', () => this.cycleSeeker(1));

    // --- Hider difficulty (hidden until AI vs AI) ---
    this.hiderDiffLabel = this.add.text(width / 2, height / 3 + 65, 'HIDER DIFFICULTY', {
      fontFamily: 'monospace', fontSize: '14px', color: '#888888',
    }).setOrigin(0.5).setVisible(false);

    this.hiderDiffText = this.add.text(width / 2, height / 3 + 93, '< EASY >', {
      fontFamily: 'monospace', fontSize: '22px', color: '#4488ff',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setVisible(false);

    this.hiderDiffText.on('pointerdown', () => this.cycleHider(1));

    // --- Play button ---
    const playBtn = this.add.text(width / 2, height / 2 + 60, '[ PLAY ]', {
      fontFamily: 'monospace', fontSize: '28px', color: '#ffffff',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    playBtn.on('pointerdown', () => this.startGame());
    playBtn.on('pointerover', () => { this.selectedIndex = 0; this.updateSelection(); });

    // --- AI vs AI button ---
    const aiBtn = this.add.text(width / 2, height / 2 + 110, '[ AI vs AI ]', {
      fontFamily: 'monospace', fontSize: '28px', color: '#ffffff',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    aiBtn.on('pointerdown', () => this.startSpectator());
    aiBtn.on('pointerover', () => { this.selectedIndex = 1; this.updateSelection(); });

    this.buttons = [playBtn, aiBtn];
    this.updateSelection();

    // Keyboard
    const enterKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    const spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    const leftKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT);
    const rightKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);
    const upKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.UP);
    const downKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);

    enterKey.on('down', () => this.confirmSelection());
    spaceKey.on('down', () => this.confirmSelection());
    leftKey.on('down', () => this.cycleSeeker(-1));
    rightKey.on('down', () => this.cycleSeeker(1));
    upKey.on('down', () => {
      this.selectedIndex = Math.max(0, this.selectedIndex - 1);
      this.updateSelection();
    });
    downKey.on('down', () => {
      this.selectedIndex = Math.min(this.buttons.length - 1, this.selectedIndex + 1);
      this.updateSelection();
    });

    // Fade in
    this.cameras.main.fadeIn(500, 0, 0, 0);
  }

  private cycleSeeker(dir: number): void {
    this.seekerDiffIndex = (this.seekerDiffIndex + dir + DIFFICULTIES.length) % DIFFICULTIES.length;
    const diff = DIFFICULTIES[this.seekerDiffIndex]!;
    this.seekerDiffText.setText(`< ${DIFFICULTY_LABELS[diff]} >`);
    updateGameSettings({ seekerDifficulty: diff });
  }

  private cycleHider(dir: number): void {
    this.hiderDiffIndex = (this.hiderDiffIndex + dir + DIFFICULTIES.length) % DIFFICULTIES.length;
    const diff = DIFFICULTIES[this.hiderDiffIndex]!;
    this.hiderDiffText.setText(`< ${DIFFICULTY_LABELS[diff]} >`);
    updateGameSettings({ hiderDifficulty: diff });
  }

  private updateSelection(): void {
    for (let i = 0; i < this.buttons.length; i++) {
      this.buttons[i]!.setColor(i === this.selectedIndex ? '#ffcc00' : '#ffffff');
    }
    // Show/hide hider difficulty based on AI vs AI hover
    const showHider = this.selectedIndex === 1;
    if (showHider !== this.showAIDiffs) {
      this.showAIDiffs = showHider;
      this.hiderDiffLabel.setVisible(showHider);
      this.hiderDiffText.setVisible(showHider);
    }
  }

  private confirmSelection(): void {
    if (SceneTransition.isTransitioning) return;
    if (this.selectedIndex === 0) this.startGame();
    if (this.selectedIndex === 1) this.startSpectator();
  }

  private startGame(): void {
    if (SceneTransition.isTransitioning) return;
    updateGameSettings({ mode: 'player' });
    SceneTransition.startScene(this, 'Game', { settings: getGameSettings() });
  }

  private startSpectator(): void {
    if (SceneTransition.isTransitioning) return;
    updateGameSettings({ mode: 'spectator' });
    SceneTransition.startScene(this, 'SpectatorGame', { settings: getGameSettings() });
  }
}
