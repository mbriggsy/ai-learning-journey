import { Container, Graphics, Text } from 'pixi.js';
import type { WorldState } from '../engine/types';
import { GamePhase, type RaceState } from '../engine/RaceController';

// ──────────────────────────────────────────────────────────
// Layout and style constants
// ──────────────────────────────────────────────────────────

const COUNTDOWN_FONT = {
  fontFamily: 'monospace',
  fontSize: 96,
  fill: '#ffffff',
  fontWeight: 'bold' as const,
  dropShadow: {
    color: '#000000',
    blur: 4,
    distance: 2,
  },
};

const GO_FONT = {
  fontFamily: 'monospace',
  fontSize: 96,
  fill: '#44ff88',
  fontWeight: 'bold' as const,
  dropShadow: {
    color: '#000000',
    blur: 4,
    distance: 2,
  },
};

const PAUSE_TITLE_FONT = {
  fontFamily: 'monospace',
  fontSize: 48,
  fill: '#ffffff',
  fontWeight: 'bold' as const,
} as const;

const PAUSE_SUB_FONT = {
  fontFamily: 'monospace',
  fontSize: 18,
  fill: '#aaaaaa',
} as const;

const LAP_FONT = {
  fontFamily: 'monospace',
  fontSize: 36,
  fill: '#ffffff',
  fontWeight: 'bold' as const,
} as const;

const LAP_BEST_FONT = {
  fontFamily: 'monospace',
  fontSize: 22,
  fill: '#44ff88',
  fontWeight: 'bold' as const,
} as const;

// ──────────────────────────────────────────────────────────
// OverlayRenderer
// ──────────────────────────────────────────────────────────

/**
 * Manages all full-screen and center-screen overlays.
 * Added to the HUD container — always renders on top of world.
 */
export class OverlayRenderer {
  private container: Container;

  // Countdown overlay
  private countdownContainer!: Container;
  private countdownText!: Text;

  // Pause overlay
  private pauseContainer!: Container;

  // Respawn fade — black fullscreen rect that fades in/out
  private respawnFade!: Graphics;

  // Lap complete overlay (center-screen, fades out)
  private lapCompleteContainer!: Container;
  private lapCompleteText!: Text;
  private lapCompleteBestText!: Text;
  private lapCompleteTimer = 0; // Ticks remaining (60 = 1s)

  constructor(private hudContainer: Container) {
    this.container = new Container();
    hudContainer.addChild(this.container);
    this.buildOverlays();
  }

  private get screenW(): number { return window.innerWidth; }
  private get screenH(): number { return window.innerHeight; }

  // ──────────────────────────────────────────────────────
  // Build overlay containers
  // ──────────────────────────────────────────────────────

  private buildOverlays(): void {
    this.buildCountdown();
    this.buildPauseMenu();
    this.buildRespawnFade();
    this.buildLapComplete();
    this.hideAll();
  }

  private buildCountdown(): void {
    this.countdownContainer = new Container();
    this.countdownContainer.visible = false;

    // Semi-transparent dark overlay (lighter than full blackout — camera still visible)
    const bg = new Graphics();
    bg.label = 'countdown-bg';
    bg.rect(0, 0, this.screenW, this.screenH).fill({ color: 0x000000, alpha: 0.35 });
    this.countdownContainer.addChild(bg);

    // Countdown number (centered)
    this.countdownText = new Text({ text: '3', style: COUNTDOWN_FONT });
    this.countdownText.anchor.set(0.5);
    this.countdownText.x = this.screenW / 2;
    this.countdownText.y = this.screenH / 2;
    this.countdownContainer.addChild(this.countdownText);

    this.container.addChild(this.countdownContainer);
  }

  private buildPauseMenu(): void {
    this.pauseContainer = new Container();
    this.pauseContainer.visible = false;

    // Dark semi-transparent backdrop
    const bg = new Graphics();
    bg.rect(0, 0, this.screenW, this.screenH).fill({ color: 0x000000, alpha: 0.6 });
    this.pauseContainer.addChild(bg);

    // "PAUSED" title
    const title = new Text({ text: 'PAUSED', style: PAUSE_TITLE_FONT });
    title.anchor.set(0.5);
    title.x = this.screenW / 2;
    title.y = this.screenH / 2 - 30;
    this.pauseContainer.addChild(title);

    // Resume instruction
    const sub = new Text({ text: 'Press ESC to Resume', style: PAUSE_SUB_FONT });
    sub.anchor.set(0.5);
    sub.x = this.screenW / 2;
    sub.y = this.screenH / 2 + 30;
    this.pauseContainer.addChild(sub);

    // Restart instruction
    const restart = new Text({ text: 'Press R to Restart', style: PAUSE_SUB_FONT });
    restart.anchor.set(0.5);
    restart.x = this.screenW / 2;
    restart.y = this.screenH / 2 + 58;
    this.pauseContainer.addChild(restart);

    this.container.addChild(this.pauseContainer);
  }

  private buildRespawnFade(): void {
    // Full-screen black rect — alpha controlled for fade effect
    this.respawnFade = new Graphics();
    this.respawnFade.rect(0, 0, this.screenW, this.screenH).fill(0x000000);
    this.respawnFade.alpha = 0;
    this.respawnFade.visible = false;
    this.container.addChild(this.respawnFade);
  }

  private buildLapComplete(): void {
    this.lapCompleteContainer = new Container();
    this.lapCompleteContainer.visible = false;

    // Lap number text
    this.lapCompleteText = new Text({ text: 'Lap 2', style: LAP_FONT });
    this.lapCompleteText.anchor.set(0.5);
    this.lapCompleteText.x = this.screenW / 2;
    this.lapCompleteText.y = this.screenH / 2 - 20;
    this.lapCompleteContainer.addChild(this.lapCompleteText);

    // "New Best!" text (hidden unless new best)
    this.lapCompleteBestText = new Text({ text: 'New Best!', style: LAP_BEST_FONT });
    this.lapCompleteBestText.anchor.set(0.5);
    this.lapCompleteBestText.x = this.screenW / 2;
    this.lapCompleteBestText.y = this.screenH / 2 + 22;
    this.lapCompleteBestText.visible = false;
    this.lapCompleteContainer.addChild(this.lapCompleteBestText);

    this.container.addChild(this.lapCompleteContainer);
  }

  private hideAll(): void {
    this.countdownContainer.visible = false;
    this.pauseContainer.visible = false;
    this.respawnFade.visible = false;
    this.lapCompleteContainer.visible = false;
  }

  // ──────────────────────────────────────────────────────
  // Update methods for each overlay type
  // ──────────────────────────────────────────────────────

  private updateCountdown(race: RaceState): void {
    if (race.phase !== GamePhase.Countdown) {
      this.countdownContainer.visible = false;
      return;
    }
    this.countdownContainer.visible = true;

    // Update text: 3, 2, 1, GO
    if (race.countdownBeat > 0) {
      this.countdownText.text = String(race.countdownBeat);
      this.countdownText.style = { ...COUNTDOWN_FONT }; // White for numbers
    } else {
      this.countdownText.text = 'GO!';
      this.countdownText.style = { ...GO_FONT }; // Green for GO
    }

    // Pulse effect: scale based on ticks within the beat
    // countdownTicksLeft goes from 60 down to 0 within each beat
    // We want: large at start of beat (60), shrinks toward next beat (0)
    const beatProgress = 1 - race.countdownTicksLeft / 60;
    const scale = 1.2 - beatProgress * 0.2; // 1.2 → 1.0 during each beat
    this.countdownText.scale.set(scale);
  }

  private updatePause(race: RaceState): void {
    this.pauseContainer.visible = race.phase === GamePhase.Paused;
  }

  private updateRespawnFade(race: RaceState): void {
    if (race.phase !== GamePhase.Respawning) {
      // Fade out if was visible (coming back from respawn)
      if (this.respawnFade.alpha > 0) {
        this.respawnFade.alpha -= 0.05; // ~20 frames to fully clear
        if (this.respawnFade.alpha <= 0) {
          this.respawnFade.visible = false;
          this.respawnFade.alpha = 0;
        }
      }
      return;
    }

    // Fading TO black (entering respawn)
    this.respawnFade.visible = true;
    // respawnTicksLeft goes from 30 → 0 during the respawn phase
    // We want: alpha goes from 0 → 1 as respawnTicksLeft → 0
    const progress = 1 - race.respawnTicksLeft / 30;
    // Fade in sharply first half, hold at max for second half
    this.respawnFade.alpha = Math.min(1, progress * 2);
  }

  private updateLapComplete(prev: WorldState, curr: WorldState): void {
    // Detect new lap completion on the tick it happens
    if (curr.timing.lapComplete && !prev.timing.lapComplete) {
      // New lap completion this tick
      const completedLap = curr.timing.currentLap - 1; // currentLap already incremented
      const isNewBest = prev.timing.bestLapTicks <= 0 ||
        curr.timing.bestLapTicks < prev.timing.bestLapTicks;

      this.lapCompleteText.text = `Lap ${completedLap}`;
      this.lapCompleteBestText.visible = isNewBest;
      this.lapCompleteContainer.visible = true;
      this.lapCompleteContainer.alpha = 1.0;
      this.lapCompleteTimer = 90; // 1.5 seconds at 60Hz
    }

    // Fade out over time
    if (this.lapCompleteTimer > 0) {
      this.lapCompleteTimer--;
      // Start fading in the last 30 ticks (0.5s)
      if (this.lapCompleteTimer < 30) {
        this.lapCompleteContainer.alpha = this.lapCompleteTimer / 30;
      }
      if (this.lapCompleteTimer <= 0) {
        this.lapCompleteContainer.visible = false;
      }
    }
  }

  // ──────────────────────────────────────────────────────
  // Main render — called every animation frame
  // ──────────────────────────────────────────────────────

  render(prev: WorldState, curr: WorldState, _alpha: number, race: RaceState): void {
    this.updateCountdown(race);
    this.updatePause(race);
    this.updateRespawnFade(race);
    this.updateLapComplete(prev, curr);
  }
}
