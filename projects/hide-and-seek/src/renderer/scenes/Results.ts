import Phaser from 'phaser';
import type { ResultsSceneData } from '../../types/scenes.js';
import type { RoundResult, ScoreBreakdown } from '../../types/persistence.js';
import { SceneTransition } from '../utils/SceneTransition.js';
import { getGameSettings } from './Boot.js';
import { DISPLAY, SCORING } from '../../constants.js';

export class ResultsScene extends Phaser.Scene {
  private buttons: Phaser.GameObjects.Text[] = [];
  private selectedIndex: number = 0;
  private outcomeData!: ResultsSceneData;

  constructor() {
    super({ key: 'Results' });
  }

  init(data: ResultsSceneData): void {
    this.outcomeData = data;
  }

  create(): void {
    const { width, height } = this.scale;

    this.cameras.main.setBackgroundColor('#111111');

    const isFound = this.outcomeData.outcome === 'found';
    const outcomeText = isFound ? 'FOUND!' : 'SURVIVED!';
    const outcomeColor = isFound ? '#ff4444' : '#ffd700';
    const roundResult = this.outcomeData.roundResult;

    // Outcome header
    this.add.text(width / 2, 60, outcomeText, {
      fontFamily: 'monospace',
      fontSize: '56px',
      color: outcomeColor,
      stroke: '#000000',
      strokeThickness: 6,
    }).setOrigin(0.5);

    if (roundResult) {
      this.createScoredLayout(width, height, roundResult);
    } else {
      this.createSpectatorLayout(width, height);
    }

    // Fade in
    this.cameras.main.fadeIn(500, 0, 0, 0);
  }

  private createScoredLayout(width: number, height: number, result: RoundResult): void {
    const bd = result.breakdown;

    // Quick stats row
    const timeStr = formatTime(result.timeSurvivedS);
    const closestStr = result.closestApproachTiles === -1
      ? '--'
      : `${result.closestApproachTiles.toFixed(1)}t`;

    this.add.text(width / 2, 120, `Time: ${timeStr}  |  Closest: ${closestStr}`, {
      fontFamily: 'monospace', fontSize: '16px', color: '#888888',
    }).setOrigin(0.5);

    // Score breakdown — itemized list
    const breakdownY = 160;
    const lineH = 26;
    const labelX = width / 2 - 160;
    const valueX = width / 2 + 160;
    const lines = buildBreakdownLines(result, bd);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      const y = breakdownY + i * lineH;
      const isSeparator = line.label === '──────';
      const isTotal = line.label.startsWith('TOTAL');

      if (isSeparator) {
        this.add.text(width / 2, y, '─'.repeat(36), {
          fontFamily: 'monospace', fontSize: '14px', color: '#444444',
        }).setOrigin(0.5);
        continue;
      }

      const fontSize = isTotal ? '20px' : '16px';
      const color = isTotal ? '#ffd700' : '#cccccc';

      this.add.text(labelX, y, line.label, {
        fontFamily: 'monospace', fontSize, color,
      }).setOrigin(0, 0.5);

      this.add.text(valueX, y, line.value, {
        fontFamily: 'monospace', fontSize, color,
      }).setOrigin(1, 0.5);
    }

    // Score count-up + PB indicator
    const totalY = breakdownY + lines.length * lineH + 20;
    const scoreText = this.add.text(width / 2, totalY, '0', {
      fontFamily: 'monospace', fontSize: '48px', color: '#ffd700',
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5);

    const pbText = this.add.text(width / 2, totalY + 40, '', {
      fontFamily: 'monospace', fontSize: '18px', color: '#ff44ff',
    }).setOrigin(0.5).setAlpha(0);

    // Count-up animation
    const duration = SCORING.COUNT_UP_DURATION_MS;
    const finalScore = bd.totalScore;
    let elapsed = 0;
    let pbShown = false;

    const countUpTimer = this.time.addEvent({
      delay: 16,
      loop: true,
      callback: () => {
        elapsed += 16;
        const t = Math.min(1, elapsed / duration);
        // Ease out quad for satisfying deceleration
        const eased = 1 - (1 - t) * (1 - t);
        const current = Math.round(eased * finalScore);
        scoreText.setText(current.toLocaleString());

        // Flash PB mid-count
        if (!pbShown && result.isNewBestScore && current >= finalScore * 0.6) {
          pbShown = true;
          pbText.setText('NEW BEST!');
          pbText.setAlpha(1);
          this.tweens.add({
            targets: pbText,
            alpha: { from: 1, to: 0.7 },
            duration: 400,
            yoyo: true,
            repeat: 2,
          });
        }

        if (t >= 1) {
          countUpTimer.destroy();
          scoreText.setText(finalScore.toLocaleString());
        }
      },
    });

    // Buttons
    const btnY = totalY + 80;
    this.createButtons(width, btnY);
  }

  private createSpectatorLayout(width: number, height: number): void {
    // Spectator mode: no score breakdown, just time
    const timeMs = this.outcomeData.timeSurvivedMs;
    const totalSecs = Math.floor(timeMs / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    this.add.text(width / 2, height / 2 - 20, `Time survived: ${timeStr}`, {
      fontFamily: 'monospace', fontSize: '20px', color: '#cccccc',
    }).setOrigin(0.5);

    this.createButtons(width, height / 2 + 80);
  }

  private createButtons(width: number, startY: number): void {
    // Play Again button
    const playAgainBtn = this.add.text(width / 2, startY, '[ PLAY AGAIN ]', {
      fontFamily: 'monospace', fontSize: '28px', color: '#ffffff',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    playAgainBtn.on('pointerdown', () => this.playAgain());
    playAgainBtn.on('pointerover', () => { this.selectedIndex = 0; this.updateSelection(); });

    // Main Menu button
    const menuBtn = this.add.text(width / 2, startY + 50, '[ MAIN MENU ]', {
      fontFamily: 'monospace', fontSize: '20px', color: '#888888',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    menuBtn.on('pointerdown', () => this.goToMenu());
    menuBtn.on('pointerover', () => { this.selectedIndex = 1; this.updateSelection(); });

    this.buttons = [playAgainBtn, menuBtn];
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
    escKey.on('down', () => this.goToMenu());
  }

  private updateSelection(): void {
    for (let i = 0; i < this.buttons.length; i++) {
      const selected = i === this.selectedIndex;
      this.buttons[i]!.setColor(selected ? '#ffcc00' : (i === 0 ? '#ffffff' : '#888888'));
    }
  }

  private confirmSelection(): void {
    if (SceneTransition.isTransitioning) return;
    if (this.selectedIndex === 0) this.playAgain();
    if (this.selectedIndex === 1) this.goToMenu();
  }

  private playAgain(): void {
    if (SceneTransition.isTransitioning) return;
    SceneTransition.startScene(this, 'Game', { settings: getGameSettings() });
  }

  private goToMenu(): void {
    if (SceneTransition.isTransitioning) return;
    SceneTransition.startScene(this, 'MainMenu');
  }
}

// ─── Helpers ──────────────────────────────────────────────

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function buildBreakdownLines(
  result: RoundResult,
  bd: ScoreBreakdown,
): { label: string; value: string }[] {
  const lines: { label: string; value: string }[] = [];

  if (bd.baseSurvival > 0) {
    lines.push({ label: `Survival (${formatTime(result.timeSurvivedS)})`, value: `+${bd.baseSurvival}` });
  } else {
    lines.push({ label: `Survived ${formatTime(result.timeSurvivedS)}`, value: '+0' });
  }

  if (result.closeCalls > 0) {
    lines.push({ label: `Close Calls (x${result.closeCalls})`, value: `+${bd.closeCallBonus}` });
  }

  if (bd.proximityBonus > 0) {
    const closest = result.closestApproachTiles.toFixed(1);
    lines.push({ label: `Closest Approach (${closest}t)`, value: `+${bd.proximityBonus}` });
  }

  if (bd.efficiencyBonus > 0) {
    lines.push({ label: 'Efficiency Bonus', value: `+${bd.efficiencyBonus}` });
  }

  if (result.doorsToggled > 0) {
    lines.push({ label: `Doors Used (x${result.doorsToggled})`, value: `+${bd.doorBonus}` });
  }

  lines.push({ label: '──────', value: '' });
  lines.push({ label: 'Subtotal', value: `${bd.subtotal}` });

  if (bd.difficultyMultiplier !== 1.0) {
    const diffName = result.seekerDifficulty.charAt(0).toUpperCase() + result.seekerDifficulty.slice(1);
    lines.push({ label: `${diffName} Difficulty (x${bd.difficultyMultiplier})`, value: '' });
  }

  lines.push({ label: '──────', value: '' });
  lines.push({ label: `TOTAL`, value: bd.totalScore.toLocaleString() });

  return lines;
}
