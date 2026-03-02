/**
 * CelebrationOverlay — Win/loss celebration shown after lap completion in vs-ai mode.
 *
 * Displays outcome with dynamic messaging based on margin:
 *   - "YOU BEAT THE AI!" (green) with margin display for human win
 *   - Encouraging message scaled by margin for AI win (never "YOU LOST")
 *   - "NO AI TIME SET" when AI has no completed lap
 */
import { Container, Graphics, Text } from 'pixi.js';
import { formatRaceTime } from '../utils/formatTime';

// ──────────────────────────────────────────────────────────
// Color palette
// ──────────────────────────────────────────────────────────

const STATUS_GREEN = 0x44ff88;
const TEXT_PRIMARY = 0xf0f2f5;
const TEXT_SECONDARY = 0x8890a0;

// ──────────────────────────────────────────────────────────
// Display duration
// ──────────────────────────────────────────────────────────

/** Physics ticks before celebration auto-hides (5 seconds at 60Hz). */
const CELEBRATION_TICKS = 300;

// ──────────────────────────────────────────────────────────
// Pure logic — exported for unit testing without PixiJS
// ──────────────────────────────────────────────────────────

export type CelebrationOutcome = 'human-wins' | 'ai-wins' | 'no-ai-best';

/**
 * Determine the race outcome for the celebration overlay.
 *
 * @param humanTicks - Human best lap ticks. Positive = lap completed. <=0 = no lap.
 * @param aiTicks - AI best lap ticks from LIVE AI world timing (not persisted Leaderboard).
 *                  null = no AI time set.
 * @returns The celebration outcome.
 */
export function computeOutcome(humanTicks: number, aiTicks: number | null): CelebrationOutcome {
  if (aiTicks === null || aiTicks <= 0) return 'no-ai-best';
  if (humanTicks > 0 && humanTicks < aiTicks) return 'human-wins';
  return 'ai-wins';
}

// ──────────────────────────────────────────────────────────
// CelebrationOverlay — PixiJS component
// ──────────────────────────────────────────────────────────

export class CelebrationOverlay {
  readonly container: Container;
  private bg: Graphics;
  private titleText: Text;
  private subtitleText: Text;
  private marginText: Text;
  private displayTicksLeft = 0;

  constructor() {
    this.container = new Container();
    this.container.visible = false;

    // Semi-transparent overlay background
    this.bg = new Graphics();
    this.container.addChild(this.bg);

    // Title (large, centered)
    this.titleText = new Text({
      text: '',
      style: {
        fontFamily: '"Orbitron", monospace',
        fontSize: 42,
        fill: STATUS_GREEN,
        fontWeight: '900',
        letterSpacing: 4,
        align: 'center',
      },
    });
    this.titleText.anchor.set(0.5);
    this.container.addChild(this.titleText);

    // Subtitle (smaller, below title)
    this.subtitleText = new Text({
      text: '',
      style: {
        fontFamily: '"Exo 2", monospace',
        fontSize: 20,
        fill: TEXT_SECONDARY,
        fontWeight: '400',
        align: 'center',
      },
    });
    this.subtitleText.anchor.set(0.5);
    this.container.addChild(this.subtitleText);

    // Margin display (time difference)
    this.marginText = new Text({
      text: '',
      style: {
        fontFamily: '"Orbitron", monospace',
        fontSize: 28,
        fill: TEXT_PRIMARY,
        fontWeight: '700',
        letterSpacing: 2,
        align: 'center',
      },
    });
    this.marginText.anchor.set(0.5);
    this.container.addChild(this.marginText);
  }

  /**
   * Show the celebration overlay with the race outcome.
   * Uses LIVE AI timing data, NOT persisted leaderboard (CP-4 fix).
   *
   * @param humanBestTicks - Human best lap ticks from current race.
   * @param aiBestTicks - AI best lap ticks from live aiWorld.timing.bestLapTicks.
   */
  show(humanBestTicks: number, aiBestTicks: number | null): void {
    const outcome = computeOutcome(humanBestTicks, aiBestTicks);

    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;

    // Rebuild background for current screen size
    this.bg.clear();
    this.bg.roundRect(cx - 240, cy - 90, 480, 180, 10)
      .fill({ color: 0x000000, alpha: 0.75 });

    this.renderOutcome(outcome, humanBestTicks, aiBestTicks, cx, cy);
    this.displayTicksLeft = CELEBRATION_TICKS;
    this.container.visible = true;
  }

  /** Hide the overlay immediately. */
  hide(): void {
    this.container.visible = false;
    this.displayTicksLeft = 0;
  }

  /**
   * Physics-tick countdown. Call once per physics tick (60Hz).
   * Auto-hides after CELEBRATION_TICKS.
   */
  tick(): void {
    if (this.displayTicksLeft > 0) {
      this.displayTicksLeft--;
      if (this.displayTicksLeft <= 0) {
        this.displayTicksLeft = 0;
        this.container.visible = false;
      }
    }
  }

  private renderOutcome(
    outcome: CelebrationOutcome,
    humanTicks: number,
    aiTicks: number | null,
    cx: number,
    cy: number,
  ): void {
    this.titleText.x = cx;
    this.titleText.y = cy - 40;
    this.subtitleText.x = cx;
    this.subtitleText.y = cy + 10;
    this.marginText.x = cx;
    this.marginText.y = cy + 50;

    switch (outcome) {
      case 'human-wins': {
        this.titleText.text = 'YOU BEAT THE AI!';
        this.titleText.style.fill = STATUS_GREEN;
        this.titleText.style.fontSize = 42;

        const marginTicks = (aiTicks ?? 0) - humanTicks;
        const marginSeconds = marginTicks / 60;
        this.subtitleText.text = `Your best: ${formatRaceTime(humanTicks)}`;
        this.subtitleText.visible = true;
        this.marginText.text = `+${marginSeconds.toFixed(2)}s ahead`;
        this.marginText.style.fill = STATUS_GREEN;
        this.marginText.visible = true;
        break;
      }

      case 'ai-wins': {
        const marginTicks = aiTicks != null && humanTicks > 0 ? humanTicks - aiTicks : 0;
        const marginSeconds = Math.abs(marginTicks) / 60;

        // Dynamic messaging based on margin (never say "YOU LOST")
        if (marginSeconds <= 0.5) {
          this.titleText.text = 'SO CLOSE!';
          this.subtitleText.text = `Just ${marginSeconds.toFixed(2)}s behind!`;
        } else if (marginSeconds <= 2.0) {
          this.titleText.text = 'GREAT EFFORT!';
          this.subtitleText.text = "You're getting faster.";
        } else {
          this.titleText.text = 'SOLID RUN';
          this.subtitleText.text = "Study the AI's racing line.";
        }

        this.titleText.style.fill = TEXT_PRIMARY;
        this.titleText.style.fontSize = 38;
        this.subtitleText.visible = true;

        if (humanTicks > 0) {
          this.marginText.text = `-${marginSeconds.toFixed(2)}s`;
          this.marginText.style.fill = TEXT_SECONDARY;
          this.marginText.visible = true;
        } else {
          this.marginText.visible = false;
        }
        break;
      }

      case 'no-ai-best': {
        this.titleText.text = 'NO AI TIME SET';
        this.titleText.style.fill = TEXT_PRIMARY;
        this.titleText.style.fontSize = 36;
        this.subtitleText.text = 'Load a model to race against the AI.';
        this.subtitleText.visible = true;
        this.marginText.visible = false;
        break;
      }
    }
  }
}
