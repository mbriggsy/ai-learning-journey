/**
 * GapTimerHud — HUD element showing the time gap between human and AI at checkpoints.
 *
 * Displays "+X.XXs" (green) when the player is ahead, "-X.XXs" (red) when behind.
 * Visible only in vs-ai mode; controlled by GameLoop/HudRenderer.
 */
import { Container, Graphics, Text } from 'pixi.js';

// ──────────────────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────────────────

/** Physics ticks before the gap display fades out (5 seconds at 60Hz). */
const GAP_DISPLAY_TICKS = 300;

const GAP_COLOR_AHEAD = '#44ff88';
const GAP_COLOR_BEHIND = '#ff4466';

const GAP_TEXT_STYLE = {
  fontFamily: '"Orbitron", monospace',
  fontSize: 30,
  fill: GAP_COLOR_AHEAD,
  fontWeight: '700' as const,
  letterSpacing: 2,
};

// ──────────────────────────────────────────────────────────
// Pure logic — exported for unit testing without PixiJS
// ──────────────────────────────────────────────────────────

/**
 * Compute time gap in seconds at a checkpoint.
 *
 * @param humanTick - Tick at which the human crossed this checkpoint.
 * @param aiArrivalTick - Tick at which the AI crossed this checkpoint.
 * @returns Positive = player is ahead (arrived earlier than AI).
 *          Negative = player is behind (arrived later than AI).
 */
export function computeGapSeconds(humanTick: number, aiArrivalTick: number): number {
  return (aiArrivalTick - humanTick) / 60;
}

// ──────────────────────────────────────────────────────────
// GapTimerHud — PixiJS component
// ──────────────────────────────────────────────────────────

export class GapTimerHud {
  readonly container: Container;
  private text: Text;
  private bg: Graphics;
  private displayTicksLeft = 0;
  private lastGapSeconds = 0;

  constructor() {
    this.container = new Container();
    this.container.visible = false;

    // Semi-transparent dark background panel
    this.bg = new Graphics();
    this.bg.roundRect(-80, -22, 160, 44, 6).fill({ color: 0x000000, alpha: 0.65 });
    this.container.addChild(this.bg);

    // Gap text (centered within the panel)
    this.text = new Text({ text: '+0.00s', style: GAP_TEXT_STYLE });
    this.text.anchor.set(0.5);
    this.text.x = 0;
    this.text.y = 0;
    this.container.addChild(this.text);
  }

  /**
   * Show the gap timer with a given gap value.
   * Resets the display countdown to GAP_DISPLAY_TICKS.
   */
  showGap(gapSeconds: number): void {
    this.lastGapSeconds = gapSeconds;
    this.displayTicksLeft = GAP_DISPLAY_TICKS;
    this.updateDisplay();
    this.container.visible = true;
  }

  /**
   * Decrement display countdown. Called once per physics tick (60Hz),
   * NOT from the render callback (which may run at monitor refresh rate).
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

  /** Immediately hide the gap timer and reset countdown. */
  reset(): void {
    this.displayTicksLeft = 0;
    this.container.visible = false;
  }

  private updateDisplay(): void {
    const abs = Math.abs(this.lastGapSeconds);
    const sign = this.lastGapSeconds >= 0 ? '+' : '-';
    this.text.text = `${sign}${abs.toFixed(2)}s`;
    this.text.style.fill = this.lastGapSeconds >= 0 ? GAP_COLOR_AHEAD : GAP_COLOR_BEHIND;
  }
}
