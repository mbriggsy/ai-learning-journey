import { Container, Graphics, Text } from 'pixi.js';
import type { WorldState } from '../engine/types';
import type { RaceState } from './GameState';
import { CAR } from '../engine/constants';

// ──────────────────────────────────────────────────────────
// Layout constants (screen coordinates)
// ──────────────────────────────────────────────────────────
const MARGIN = 30;         // Padding from screen edge
const PANEL_ALPHA = 0.75;  // Semi-transparent dark panel opacity

// Speedometer (bottom-left)
const SPEED_BAR_W    = 64;   // Bar width in pixels
const SPEED_BAR_H    = 400;  // Bar max height in pixels
const SPEED_BAR_COLOR = 0x44ffaa;

// Minimap (bottom-right)
const MINIMAP_SIZE   = 300;  // Width and height of minimap area in pixels
const MINIMAP_SCALE  = 0.55; // World units -> minimap pixels
const MINIMAP_DOT    = 8;    // Car dot radius in pixels
const MINIMAP_TRACK_COLOR = 0xaaaaaa;
const MINIMAP_CAR_COLOR   = 0xffff00;

// Text style shared across HUD
const HUD_TEXT_STYLE = {
  fontFamily: 'monospace',
  fontSize: 72,
  fill: '#ffffff',
} as const;

const HUD_TEXT_STYLE_SMALL = {
  fontFamily: 'monospace',
  fontSize: 52,
  fill: '#aaaaaa',
} as const;

// ──────────────────────────────────────────────────────────
// Formatting helpers
// ──────────────────────────────────────────────────────────

/** Format ticks into M:SS.mmm string. Returns '--:--.---' if ticks <= 0. */
function formatTime(ticks: number): string {
  if (ticks <= 0) return '--:--.---';
  const totalMs = Math.floor((ticks / 60) * 1000);
  const ms  = totalMs % 1000;
  const sec = Math.floor(totalMs / 1000) % 60;
  const min = Math.floor(totalMs / 60000);
  return `${min}:${String(sec).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
}

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

  // Lap times (top-right, HUD-02 + HUD-03)
  private currentLapText!: Text;
  private bestLapText!: Text;
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
    const y = this.screenH - MARGIN - SPEED_BAR_H - 70; // room for label

    this.speedBarX = x;
    this.speedBarY = y;

    // Panel background
    const panel = new Graphics();
    panel.rect(x - 14, y - 14, SPEED_BAR_W + 28, SPEED_BAR_H + 96).fill({ color: 0x000000, alpha: PANEL_ALPHA });
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
    label.y = y + SPEED_BAR_H + 12;
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
    panel.rect(x - 12, y - 12, 320, 96).fill({ color: 0x000000, alpha: PANEL_ALPHA });
    this.container.addChild(panel);

    this.lapCounterText = new Text({ text: 'LAP 1', style: { ...HUD_TEXT_STYLE, fontSize: 72 } });
    this.lapCounterText.x = x;
    this.lapCounterText.y = y;
    this.container.addChild(this.lapCounterText);
  }

  private updateLapCounter(currentLap: number): void {
    const display = `LAP ${currentLap}`;
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
    const x = this.screenW - MARGIN - 620;
    const y = MARGIN;

    const panel = new Graphics();
    panel.label = 'time-panel';
    panel.rect(x - 12, y - 12, 636, 180).fill({ color: 0x000000, alpha: PANEL_ALPHA });
    this.container.addChild(panel);

    // Current lap time (larger)
    this.currentLapText = new Text({
      text: '0:00.000',
      style: { ...HUD_TEXT_STYLE, fontSize: 80 },
    });
    this.currentLapText.x = x;
    this.currentLapText.y = y;
    this.container.addChild(this.currentLapText);

    // Best lap time (smaller, below)
    this.bestLapText = new Text({
      text: 'Best: --:--.---',
      style: HUD_TEXT_STYLE_SMALL,
    });
    this.bestLapText.x = x;
    this.bestLapText.y = y + 96;
    this.container.addChild(this.bestLapText);
  }

  private updateLapTimes(currentLapTicks: number, bestLapTicks: number, lapComplete: boolean, isNewBest: boolean): void {
    // Current lap time
    const currentDisplay = formatTime(currentLapTicks);
    if (this.lastCurrentLapDisplay !== currentDisplay) {
      this.lastCurrentLapDisplay = currentDisplay;
      this.currentLapText.text = currentDisplay;
    }

    // Best lap time -- always visible (HUD-03)
    const bestDisplay = `Best: ${formatTime(bestLapTicks)}`;
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
      this.currentLapText.style.fill = '#ffffff'; // Normal white
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
      this.minimapOffsetX - 12,
      this.minimapOffsetY - 12,
      MINIMAP_SIZE + 24,
      MINIMAP_SIZE + 24,
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
   * Compute the minimap anchor offset so the track is centered in the minimap area.
   * The track spans roughly -200 to +200 in world space (track01 extents).
   * We compute the bounding box of outerBoundary to center correctly.
   */
  private computeMinimapTransform(outerBoundary: readonly { x: number; y: number }[]): { cx: number; cy: number } {
    if (outerBoundary.length === 0) return { cx: 0, cy: 0 };
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of outerBoundary) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
    return {
      cx: (minX + maxX) / 2,
      cy: (minY + maxY) / 2,
    };
  }

  private buildMinimapTrack(outerBoundary: readonly { x: number; y: number }[]): void {
    if (this.trackOutlineBuilt) return;
    this.trackOutlineBuilt = true;

    const { cx, cy } = this.computeMinimapTransform(outerBoundary);
    const ox = this.minimapOffsetX + MINIMAP_SIZE / 2;
    const oy = this.minimapOffsetY + MINIMAP_SIZE / 2;

    const pts: number[] = [];
    for (const p of outerBoundary) {
      pts.push(
        ox + (p.x - cx) * MINIMAP_SCALE,
        oy - (p.y - cy) * MINIMAP_SCALE, // Flip Y (engine Y-up -> screen Y-down)
      );
    }

    this.minimapTrackGraphics.clear();
    this.minimapTrackGraphics.poly(pts).stroke({ width: 3, color: MINIMAP_TRACK_COLOR });
  }

  private updateMinimap(
    outerBoundary: readonly { x: number; y: number }[],
    carX: number,
    carY: number,
  ): void {
    // Build track outline once
    this.buildMinimapTrack(outerBoundary);

    // Recompute center for car dot positioning
    const { cx, cy } = this.computeMinimapTransform(outerBoundary);
    const ox = this.minimapOffsetX + MINIMAP_SIZE / 2;
    const oy = this.minimapOffsetY + MINIMAP_SIZE / 2;

    const dotX = ox + (carX - cx) * MINIMAP_SCALE;
    const dotY = oy - (carY - cy) * MINIMAP_SCALE; // Flip Y

    this.minimapGraphics.clear();
    this.minimapGraphics.circle(dotX, dotY, MINIMAP_DOT).fill(MINIMAP_CAR_COLOR);
  }

  // ──────────────────────────────────────────────────────
  // Main render -- called every animation frame
  // ──────────────────────────────────────────────────────

  /**
   * Update all HUD elements from current world state.
   * Uses curr (not interpolated) for game state values -- timing data is tick-accurate.
   * Uses curr.car.speed for speedometer (slight jitter acceptable, gameplay accurate).
   */
  render(
    _prev: WorldState,
    curr: WorldState,
    _alpha: number,
    _race: RaceState,
  ): void {
    const { car, timing, track } = curr;

    // HUD-01: Speedometer
    this.updateSpeedometer(car.speed);

    // HUD-02 + HUD-03: Lap times
    const prevBest = _prev.timing.bestLapTicks;
    const currBest = timing.bestLapTicks;
    const isNewBest = timing.lapComplete && currBest !== prevBest && currBest > 0;
    this.updateLapTimes(timing.currentLapTicks, timing.bestLapTicks, timing.lapComplete, isNewBest);

    // HUD-04: Lap counter
    this.updateLapCounter(timing.currentLap);

    // HUD-05: Minimap
    this.updateMinimap(track.outerBoundary, car.position.x, car.position.y);
  }
}
