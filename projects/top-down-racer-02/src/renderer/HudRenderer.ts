import { Container, Graphics, Text } from 'pixi.js';
import type { WorldState } from '../engine/types';
import type { RaceState } from '../engine/RaceController';
import { CAR } from '../engine/constants';
import { formatRaceTime } from '../utils/formatTime';

// ──────────────────────────────────────────────────────────
// Layout constants (screen coordinates)
// ──────────────────────────────────────────────────────────
const MARGIN = 16;         // Padding from screen edge
const PANEL_ALPHA = 0.7;   // Semi-transparent dark panel opacity

// Speedometer (bottom-left)
const SPEED_BAR_W    = 24;   // Bar width in pixels
const SPEED_BAR_H    = 140;  // Bar max height in pixels
const SPEED_BAR_COLOR = 0x44ffaa;

// Minimap (bottom-right)
const MINIMAP_SIZE   = 160;  // Width and height of minimap area in pixels
const MINIMAP_PADDING = 8;   // Padding inside minimap area
const MINIMAP_DOT    = 4;    // Car dot radius in pixels
const MINIMAP_TRACK_COLOR = 0xaaaaaa;
const MINIMAP_CAR_COLOR   = 0xffff00;

// Text style shared across HUD
const HUD_TEXT_STYLE = {
  fontFamily: 'monospace',
  fontSize: 20,
  fill: '#ffffff',
} as const;

const HUD_TEXT_STYLE_SMALL = {
  fontFamily: 'monospace',
  fontSize: 15,
  fill: '#aaaaaa',
} as const;

// ──────────────────────────────────────────────────────────
// HudRenderer
// ──────────────────────────────────────────────────────────

export class HudRenderer {
  private container: Container;

  // Speedometer (bottom-left, HUD-01)
  private speedBarBg!: Graphics;
  private speedBarFill!: Graphics;
  private speedBarX = 0;
  private speedBarY = 0;

  // Lap counter (top-left, HUD-04)
  private lapCounterText!: Text;
  private lastLapDisplay = '';

  // Timing stack (top-right: total, current lap, best lap)
  private totalTimeText!: Text;
  private currentLapText!: Text;
  private bestLapText!: Text;
  private lastTotalTimeDisplay = '';
  private lastCurrentLapDisplay = '';
  private lastBestLapDisplay = '';
  private lapFlashTimer = 0; // Ticks remaining for green flash

  // Minimap (bottom-right, HUD-05)
  private minimapGraphics!: Graphics;
  private minimapOffsetX = 0;
  private minimapOffsetY = 0;
  private trackOutlineBuilt = false;
  private minimapTrackGraphics!: Graphics; // Static track outline, rebuilt once

  // Screen dimensions (updated on each render for responsiveness)
  private screenW = window.innerWidth;
  private screenH = window.innerHeight;

  constructor(hudContainer: Container) {
    this.container = hudContainer;
    this.buildHud();
  }

  /** Build all static HUD elements and add to container. */
  private buildHud(): void {
    this.buildSpeedometer();
    this.buildLapCounter();
    this.buildLapTimes();
    this.buildMinimap();
  }

  // ──────────────────────────────────────────────────────
  // Speedometer (HUD-01) -- bottom-left, vertical bar fill
  // ──────────────────────────────────────────────────────

  private buildSpeedometer(): void {
    const x = MARGIN;
    const y = this.screenH - MARGIN - SPEED_BAR_H - 26; // room for label

    this.speedBarX = x;
    this.speedBarY = y;

    // Panel background
    const panel = new Graphics();
    panel.rect(x - 6, y - 6, SPEED_BAR_W + 12, SPEED_BAR_H + 38).fill({ color: 0x000000, alpha: PANEL_ALPHA });
    this.container.addChild(panel);

    // Bar background track
    this.speedBarBg = new Graphics();
    this.speedBarBg.rect(x, y, SPEED_BAR_W, SPEED_BAR_H).fill(0x222222);
    this.container.addChild(this.speedBarBg);

    // Bar fill (updated each frame)
    this.speedBarFill = new Graphics();
    this.container.addChild(this.speedBarFill);

    // "SPD" label below bar
    const label = new Text({ text: 'SPD', style: HUD_TEXT_STYLE_SMALL });
    label.x = x + SPEED_BAR_W / 2 - label.width / 2;
    label.y = y + SPEED_BAR_H + 6;
    this.container.addChild(label);
  }

  private updateSpeedometer(speed: number): void {
    const fill = Math.max(0, Math.min(1, speed / CAR.maxSpeed));
    const fillH = Math.floor(SPEED_BAR_H * fill);
    const x = this.speedBarX;
    const y = this.speedBarY;

    this.speedBarFill.clear();
    if (fillH > 0) {
      // Bar grows from bottom up
      this.speedBarFill
        .rect(x, y + SPEED_BAR_H - fillH, SPEED_BAR_W, fillH)
        .fill(SPEED_BAR_COLOR);
    }
  }

  // ──────────────────────────────────────────────────────
  // Lap Counter (HUD-04) -- top-left
  // ──────────────────────────────────────────────────────

  private buildLapCounter(): void {
    const x = MARGIN;
    const y = MARGIN;

    const panel = new Graphics();
    panel.rect(x - 4, y - 4, 140, 34).fill({ color: 0x000000, alpha: PANEL_ALPHA });
    this.container.addChild(panel);

    this.lapCounterText = new Text({ text: 'LAP 1', style: { ...HUD_TEXT_STYLE, fontSize: 22 } });
    this.lapCounterText.x = x;
    this.lapCounterText.y = y;
    this.container.addChild(this.lapCounterText);
  }

  private updateLapCounter(currentLap: number, targetLaps: number): void {
    let display: string;
    if (targetLaps > 0) {
      const clampedLap = Math.min(currentLap, targetLaps);
      display = `LAP ${clampedLap}/${targetLaps}`;
    } else {
      display = `LAP ${currentLap}`;
    }
    if (this.lastLapDisplay !== display) {
      this.lastLapDisplay = display;
      this.lapCounterText.text = display;
    }
  }

  // ──────────────────────────────────────────────────────
  // Lap Times (HUD-02 + HUD-03) -- top-right
  // ──────────────────────────────────────────────────────

  private buildLapTimes(): void {
    // Position from right edge
    const x = this.screenW - MARGIN - 180;
    const y = MARGIN;

    const panel = new Graphics();
    panel.label = 'time-panel';
    panel.rect(x - 4, y - 4, 188, 82).fill({ color: 0x000000, alpha: PANEL_ALPHA });
    this.container.addChild(panel);

    // Total race time (top, larger — never resets except on restart)
    this.totalTimeText = new Text({
      text: '0:00.000',
      style: { ...HUD_TEXT_STYLE, fontSize: 24 },
    });
    this.totalTimeText.x = x;
    this.totalTimeText.y = y;
    this.container.addChild(this.totalTimeText);

    // Current lap time (smaller, below total)
    this.currentLapText = new Text({
      text: 'Lap: 0:00.000',
      style: HUD_TEXT_STYLE_SMALL,
    });
    this.currentLapText.x = x;
    this.currentLapText.y = y + 30;
    this.container.addChild(this.currentLapText);

    // Best lap time (smaller, below current)
    this.bestLapText = new Text({
      text: 'Best: --:--.---',
      style: HUD_TEXT_STYLE_SMALL,
    });
    this.bestLapText.x = x;
    this.bestLapText.y = y + 50;
    this.container.addChild(this.bestLapText);
  }

  private updateLapTimes(totalRaceTicks: number, currentLapTicks: number, bestLapTicks: number, lapComplete: boolean, isNewBest: boolean): void {
    // Total race time
    const totalDisplay = formatRaceTime(totalRaceTicks);
    if (this.lastTotalTimeDisplay !== totalDisplay) {
      this.lastTotalTimeDisplay = totalDisplay;
      this.totalTimeText.text = totalDisplay;
    }

    // Current lap time
    const currentDisplay = `Lap: ${formatRaceTime(currentLapTicks)}`;
    if (this.lastCurrentLapDisplay !== currentDisplay) {
      this.lastCurrentLapDisplay = currentDisplay;
      this.currentLapText.text = currentDisplay;
    }

    // Best lap time -- always visible (HUD-03)
    const bestDisplay = `Best: ${formatRaceTime(bestLapTicks)}`;
    if (this.lastBestLapDisplay !== bestDisplay) {
      this.lastBestLapDisplay = bestDisplay;
      this.bestLapText.text = bestDisplay;
    }

    // Green flash on new best lap (CONTEXT.md locked decision)
    if (lapComplete && isNewBest) {
      this.lapFlashTimer = 90; // 1.5s flash (90 ticks)
    }
    if (this.lapFlashTimer > 0) {
      this.lapFlashTimer--;
      this.currentLapText.style.fill = '#44ff88'; // Green flash
    } else {
      this.currentLapText.style.fill = '#aaaaaa'; // Normal small text color
    }
  }

  // ──────────────────────────────────────────────────────
  // Minimap (HUD-05) -- bottom-right
  // ──────────────────────────────────────────────────────

  private buildMinimap(): void {
    this.minimapOffsetX = this.screenW - MARGIN - MINIMAP_SIZE;
    this.minimapOffsetY = this.screenH - MARGIN - MINIMAP_SIZE;

    // Panel background
    const panel = new Graphics();
    panel.rect(
      this.minimapOffsetX - 6,
      this.minimapOffsetY - 6,
      MINIMAP_SIZE + 12,
      MINIMAP_SIZE + 12,
    ).fill({ color: 0x000000, alpha: PANEL_ALPHA });
    this.container.addChild(panel);

    // Static track outline (built once on first render)
    this.minimapTrackGraphics = new Graphics();
    this.container.addChild(this.minimapTrackGraphics);

    // Dynamic car dot (redrawn every frame)
    this.minimapGraphics = new Graphics();
    this.container.addChild(this.minimapGraphics);
  }

  /**
   * Compute the minimap transform: center offset and scale to fit the track
   * within the MINIMAP_SIZE area with padding.
   */
  private computeMinimapTransform(outerBoundary: readonly { x: number; y: number }[]): { cx: number; cy: number; scale: number } {
    if (outerBoundary.length === 0) return { cx: 0, cy: 0, scale: 0.3 };
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of outerBoundary) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
    const tw = maxX - minX;
    const th = maxY - minY;
    const fitSize = MINIMAP_SIZE - MINIMAP_PADDING * 2;
    const scale = Math.min(fitSize / tw, fitSize / th);
    return {
      cx: (minX + maxX) / 2,
      cy: (minY + maxY) / 2,
      scale,
    };
  }

  private buildMinimapTrack(
    outerBoundary: readonly { x: number; y: number }[],
    innerBoundary: readonly { x: number; y: number }[],
  ): void {
    if (this.trackOutlineBuilt) return;
    this.trackOutlineBuilt = true;

    const { cx, cy, scale } = this.computeMinimapTransform(outerBoundary);
    const ox = this.minimapOffsetX + MINIMAP_SIZE / 2;
    const oy = this.minimapOffsetY + MINIMAP_SIZE / 2;

    const outerPts: number[] = [];
    for (const p of outerBoundary) {
      outerPts.push(
        ox + (p.x - cx) * scale,
        oy - (p.y - cy) * scale,
      );
    }

    const innerPts: number[] = [];
    for (const p of innerBoundary) {
      innerPts.push(
        ox + (p.x - cx) * scale,
        oy - (p.y - cy) * scale,
      );
    }

    this.minimapTrackGraphics.clear();
    this.minimapTrackGraphics
      .poly(outerPts).stroke({ width: 1.5, color: MINIMAP_TRACK_COLOR })
      .poly(innerPts).stroke({ width: 1.5, color: MINIMAP_TRACK_COLOR });
  }

  private updateMinimap(
    outerBoundary: readonly { x: number; y: number }[],
    innerBoundary: readonly { x: number; y: number }[],
    carX: number,
    carY: number,
  ): void {
    // Build track outline once
    this.buildMinimapTrack(outerBoundary, innerBoundary);

    // Recompute center + scale for car dot positioning
    const { cx, cy, scale } = this.computeMinimapTransform(outerBoundary);
    const ox = this.minimapOffsetX + MINIMAP_SIZE / 2;
    const oy = this.minimapOffsetY + MINIMAP_SIZE / 2;

    const dotX = ox + (carX - cx) * scale;
    const dotY = oy - (carY - cy) * scale; // Flip Y

    this.minimapGraphics.clear();
    this.minimapGraphics.circle(dotX, dotY, MINIMAP_DOT).fill(MINIMAP_CAR_COLOR);
  }

  // ──────────────────────────────────────────────────────
  // Main render -- called every animation frame
  // ──────────────────────────────────────────────────────

  /** Reset HUD state for a new track (rebuilds minimap on next render). */
  reset(): void {
    this.trackOutlineBuilt = false;
    this.minimapTrackGraphics.clear();
    this.minimapGraphics.clear();
    this.lastLapDisplay = '';
    this.lastTotalTimeDisplay = '';
    this.lastCurrentLapDisplay = '';
    this.lastBestLapDisplay = '';
    this.lapFlashTimer = 0;
  }

  /**
   * Update all HUD elements from current world state.
   * Uses curr (not interpolated) for game state values -- timing data is tick-accurate.
   * Uses curr.car.speed for speedometer (slight jitter acceptable, gameplay accurate).
   */
  render(
    _prev: WorldState,
    curr: WorldState,
    _alpha: number,
    race: RaceState,
  ): void {
    const { car, timing, track } = curr;

    // HUD-01: Speedometer
    this.updateSpeedometer(car.speed);

    // HUD-02 + HUD-03: Lap times
    const prevBest = _prev.timing.bestLapTicks;
    const currBest = timing.bestLapTicks;
    const isNewBest = timing.lapComplete && currBest !== prevBest && currBest > 0;
    this.updateLapTimes(timing.totalRaceTicks, timing.currentLapTicks, timing.bestLapTicks, timing.lapComplete, isNewBest);

    // HUD-04: Lap counter
    this.updateLapCounter(timing.currentLap, race.targetLaps);

    // HUD-05: Minimap
    this.updateMinimap(track.outerBoundary, track.innerBoundary, car.position.x, car.position.y);
  }
}
