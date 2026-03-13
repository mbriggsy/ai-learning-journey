import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import type { WorldState } from '../engine/types';
import type { RaceState } from '../engine/RaceController';
import { CAR } from '../engine/constants';
import { formatRaceTime } from '../utils/formatTime';
import type { GameMode } from '../types/game-mode';

// ──────────────────────────────────────────────────────────
// Layout constants
// ──────────────────────────────────────────────────────────
const MARGIN = 16;
const PANEL_ALPHA = 0.7;

// Analog gauge (bottom-center)
const GAUGE_RADIUS = 55;
const GAUGE_PADDING = 5;
const NEEDLE_LENGTH = 48;
const ARC_START = -5 * Math.PI / 4; // -225° (bottom-left = 0)
const ARC_END = Math.PI / 4;        // +45°  (bottom-right = MAX)
const ARC_SWEEP = ARC_END - ARC_START; // 270° = 3π/2

// Minimap (bottom-right)
const MINIMAP_SIZE = 160;
const MINIMAP_PADDING = 8;
const MINIMAP_DOT = 4;
const MINIMAP_TRACK_COLOR = 0xaaaaaa;
const MINIMAP_CAR_COLOR = 0xffcc00;   // Player: yellow
const MINIMAP_AI_COLOR = 0x00d4ff;    // AI: cyan

// AI text color
const AI_COLOR = '#00eeff';

// ──────────────────────────────────────────────────────────
// Shared TextStyle instances (Fix #35 — texture sharing)
// ──────────────────────────────────────────────────────────
const STYLE_HUD = new TextStyle({ fontFamily: 'monospace', fontSize: 20, fill: '#ffffff' });
const STYLE_HUD_LARGE = new TextStyle({ fontFamily: 'monospace', fontSize: 24, fill: '#ffffff' });
const STYLE_HUD_LAP = new TextStyle({ fontFamily: 'monospace', fontSize: 22, fill: '#ffffff' });
const STYLE_SMALL = new TextStyle({ fontFamily: 'monospace', fontSize: 15, fill: '#aaaaaa' });
const STYLE_AI = new TextStyle({ fontFamily: 'monospace', fontSize: 15, fill: AI_COLOR });
const STYLE_AI_SMALL = new TextStyle({ fontFamily: 'monospace', fontSize: 13, fill: AI_COLOR });
const STYLE_POSITION = new TextStyle({ fontFamily: 'monospace', fontSize: 28, fill: '#44ff88' });

// ──────────────────────────────────────────────────────────
// HudRenderer
// ──────────────────────────────────────────────────────────

export class HudRenderer {
  private container: Container;

  // Analog speedometer (bottom-center)
  private gaugeContainer!: Container;
  private needleContainer!: Container;
  private needleGraphics!: Graphics;

  // Lap counter (top-left)
  private lapCounterPanel!: Graphics;
  private lapCounterText!: Text;
  private lastLapDisplay = '';

  // Position indicator (top-left, below lap counter, vs-ai only)
  private positionText!: Text;
  private lastPositionDisplay = '';

  // Timing stack (top-right)
  private timePanel!: Graphics;
  private totalTimeText!: Text;
  private currentLapText!: Text;
  private bestLapText!: Text;
  private lastTotalTimeDisplay = '';
  private lastCurrentLapDisplay = '';
  private lastBestLapDisplay = '';
  private lapFlashTimer = 0;

  // AI timing (top-right, below human times)
  private aiPanel!: Graphics;
  private aiTotalTimeText!: Text;
  private aiBestLapText!: Text;
  private lastAiTotalTimeDisplay = '';
  private lastAiBestLapDisplay = '';

  // Minimap (bottom-right)
  private minimapContainer!: Container;
  private minimapPanel!: Graphics;
  private minimapTrackGraphics!: Graphics;
  private minimapGraphics!: Graphics;
  private trackOutlineBuilt = false;
  // Cached minimap transform (Fix #8)
  private cachedMinimapTransform: { cx: number; cy: number; scale: number } | null = null;

  private mode: GameMode = 'solo';
  private aiStateSource: (() => WorldState | null) | null = null;

  // Screen dimensions
  private screenW = window.innerWidth;
  private screenH = window.innerHeight;

  constructor(hudContainer: Container) {
    this.container = hudContainer;
    this.buildHud();
    this.layoutHud(this.screenW, this.screenH);
  }

  // ──────────────────────────────────────────────────────
  // Build
  // ──────────────────────────────────────────────────────

  private buildHud(): void {
    this.buildGauge();
    this.buildLapCounter();
    this.buildPositionIndicator();
    this.buildLapTimes();
    this.buildAiTiming();
    this.buildMinimap();
  }

  // ──────────────────────────────────────────────────────
  // Analog Speedometer (Fix #7: container rotation, Fix #33: cacheAsTexture options)
  // ──────────────────────────────────────────────────────

  private buildGauge(): void {
    this.gaugeContainer = new Container();
    this.container.addChild(this.gaugeContainer);

    // Static background — drawn once, cached
    const bg = this.buildGaugeBackground();
    this.gaugeContainer.addChild(bg);

    // Needle — drawn once as static line, container rotates (Fix #7)
    this.needleContainer = new Container();
    this.gaugeContainer.addChild(this.needleContainer);

    this.needleGraphics = new Graphics();
    this.needleGraphics.moveTo(0, 0);
    this.needleGraphics.lineTo(NEEDLE_LENGTH, 0);
    this.needleGraphics.stroke({ color: 0xff3333, width: 2 });
    this.needleContainer.addChild(this.needleGraphics);

    // Start needle at 0 position
    this.needleContainer.rotation = ARC_START;
  }

  private buildGaugeBackground(): Graphics {
    const g = new Graphics();
    const r = GAUGE_RADIUS;

    // Dark circle fill
    g.circle(0, 0, r + GAUGE_PADDING);
    g.fill({ color: 0x0a0a1a, alpha: 0.85 });

    // Arc border (270° sweep)
    g.arc(0, 0, r, ARC_START, ARC_END);
    g.stroke({ color: 0x4a4a6a, width: 3 });

    // Tick marks (10 divisions)
    for (let i = 0; i <= 10; i++) {
      const angle = ARC_START + (i / 10) * ARC_SWEEP;
      const innerR = r - 8;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      g.moveTo(cos * innerR, sin * innerR);
      g.lineTo(cos * r, sin * r);
      g.stroke({ color: 0x888888, width: i % 5 === 0 ? 2 : 1 });
    }

    // Center dot
    g.circle(0, 0, 3);
    g.fill({ color: 0xff3333 });

    // Cache — never redrawn (Fix #33: options object for HiDPI)
    g.cacheAsTexture({ resolution: 2, antialias: true });
    return g;
  }

  private updateGauge(speed: number): void {
    const t = Math.min(speed / CAR.maxSpeed, 1);
    // Rotate needle container (Fix #7 — no clear()+stroke() per frame)
    this.needleContainer.rotation = ARC_START + t * ARC_SWEEP;
  }

  // ──────────────────────────────────────────────────────
  // Lap Counter (top-left)
  // ──────────────────────────────────────────────────────

  private buildLapCounter(): void {
    this.lapCounterPanel = new Graphics();
    this.lapCounterPanel.rect(0, 0, 140, 34).fill({ color: 0x000000, alpha: PANEL_ALPHA });
    this.container.addChild(this.lapCounterPanel);

    this.lapCounterText = new Text({ text: 'LAP 1', style: STYLE_HUD_LAP });
    this.lapCounterText.x = 4;
    this.lapCounterText.y = 4;
    this.lapCounterPanel.addChild(this.lapCounterText);
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
  // Position Indicator (top-left, below lap counter, vs-ai only)
  // ──────────────────────────────────────────────────────

  private buildPositionIndicator(): void {
    this.positionText = new Text({ text: 'P1', style: STYLE_POSITION });
    this.positionText.visible = false;
    this.container.addChild(this.positionText);
  }

  private updatePosition(
    playerTiming: { currentLap: number; lastCheckpointIndex: number },
    aiTiming: { currentLap: number; lastCheckpointIndex: number } | null,
    checkpointCount: number,
  ): void {
    if (!aiTiming || this.mode !== 'vs-ai') {
      this.positionText.visible = false;
      return;
    }
    this.positionText.visible = true;

    const playerScore = playerTiming.currentLap * checkpointCount + playerTiming.lastCheckpointIndex;
    const aiScore = aiTiming.currentLap * checkpointCount + aiTiming.lastCheckpointIndex;
    const pos = playerScore >= aiScore ? 1 : 2;
    const display = `P${pos}`;

    // Guard text update (Fix #9)
    if (this.lastPositionDisplay !== display) {
      this.lastPositionDisplay = display;
      this.positionText.text = display;
      this.positionText.style.fill = pos === 1 ? '#44ff88' : '#ff4444';
    }
  }

  // ──────────────────────────────────────────────────────
  // Lap Times (top-right)
  // ──────────────────────────────────────────────────────

  private buildLapTimes(): void {
    this.timePanel = new Graphics();
    this.timePanel.rect(0, 0, 188, 82).fill({ color: 0x000000, alpha: PANEL_ALPHA });
    this.container.addChild(this.timePanel);

    this.totalTimeText = new Text({ text: '0:00.000', style: STYLE_HUD_LARGE });
    this.totalTimeText.x = 4;
    this.totalTimeText.y = 4;
    this.timePanel.addChild(this.totalTimeText);

    this.currentLapText = new Text({ text: 'Lap: 0:00.000', style: STYLE_SMALL });
    this.currentLapText.x = 4;
    this.currentLapText.y = 34;
    this.timePanel.addChild(this.currentLapText);

    this.bestLapText = new Text({ text: 'Best: --:--.---', style: STYLE_SMALL });
    this.bestLapText.x = 4;
    this.bestLapText.y = 54;
    this.timePanel.addChild(this.bestLapText);
  }

  private updateLapTimes(
    totalRaceTicks: number,
    currentLapTicks: number,
    bestLapTicks: number,
    lapComplete: boolean,
    isNewBest: boolean,
  ): void {
    const totalDisplay = formatRaceTime(totalRaceTicks);
    if (this.lastTotalTimeDisplay !== totalDisplay) {
      this.lastTotalTimeDisplay = totalDisplay;
      this.totalTimeText.text = totalDisplay;
    }

    const currentDisplay = `Lap: ${formatRaceTime(currentLapTicks)}`;
    if (this.lastCurrentLapDisplay !== currentDisplay) {
      this.lastCurrentLapDisplay = currentDisplay;
      this.currentLapText.text = currentDisplay;
    }

    const bestDisplay = `Best: ${formatRaceTime(bestLapTicks)}`;
    if (this.lastBestLapDisplay !== bestDisplay) {
      this.lastBestLapDisplay = bestDisplay;
      this.bestLapText.text = bestDisplay;
    }

    // Green flash on new best lap
    if (lapComplete && isNewBest) {
      this.lapFlashTimer = 90; // 1.5s flash
    }
    if (this.lapFlashTimer > 0) {
      this.lapFlashTimer--;
      this.currentLapText.style.fill = '#44ff88';
    } else {
      this.currentLapText.style.fill = '#aaaaaa';
    }
  }

  // ──────────────────────────────────────────────────────
  // AI Timing (top-right, below human times)
  // ──────────────────────────────────────────────────────

  private buildAiTiming(): void {
    this.aiPanel = new Graphics();
    this.aiPanel.rect(0, 0, 188, 52).fill({ color: 0x000000, alpha: PANEL_ALPHA });
    this.aiPanel.visible = false;
    this.container.addChild(this.aiPanel);

    this.aiTotalTimeText = new Text({ text: 'AI Lap: 0:00.000', style: STYLE_AI });
    this.aiTotalTimeText.x = 4;
    this.aiTotalTimeText.y = 4;
    this.aiPanel.addChild(this.aiTotalTimeText);

    this.aiBestLapText = new Text({ text: 'AI Best: --:--.---', style: STYLE_AI_SMALL });
    this.aiBestLapText.x = 4;
    this.aiBestLapText.y = 26;
    this.aiPanel.addChild(this.aiBestLapText);
  }

  private updateAiTiming(): void {
    const showAi = this.mode === 'vs-ai' && this.aiStateSource != null;
    this.aiPanel.visible = showAi;
    if (!showAi) return;

    const aiState = this.aiStateSource!();
    if (!aiState) return;

    const aiLapDisplay = `AI Lap: ${formatRaceTime(aiState.timing.currentLapTicks)}`;
    if (this.lastAiTotalTimeDisplay !== aiLapDisplay) {
      this.lastAiTotalTimeDisplay = aiLapDisplay;
      this.aiTotalTimeText.text = aiLapDisplay;
    }

    const aiBestDisplay = `AI Best: ${formatRaceTime(aiState.timing.bestLapTicks)}`;
    if (this.lastAiBestLapDisplay !== aiBestDisplay) {
      this.lastAiBestLapDisplay = aiBestDisplay;
      this.aiBestLapText.text = aiBestDisplay;
    }
  }

  // ──────────────────────────────────────────────────────
  // Minimap (bottom-right)
  // ──────────────────────────────────────────────────────

  private buildMinimap(): void {
    this.minimapContainer = new Container();
    this.container.addChild(this.minimapContainer);

    // Panel background
    this.minimapPanel = new Graphics();
    this.minimapPanel.rect(-6, -6, MINIMAP_SIZE + 12, MINIMAP_SIZE + 12)
      .fill({ color: 0x000000, alpha: PANEL_ALPHA });
    this.minimapContainer.addChild(this.minimapPanel);

    // Static track outline (built once on first render)
    this.minimapTrackGraphics = new Graphics();
    this.minimapContainer.addChild(this.minimapTrackGraphics);

    // Dynamic car dots (redrawn every frame)
    this.minimapGraphics = new Graphics();
    this.minimapContainer.addChild(this.minimapGraphics);
  }

  /**
   * Compute minimap transform: center offset and scale to fit track
   * within the MINIMAP_SIZE area. Cached after first computation (Fix #8).
   */
  private getMinimapTransform(outerBoundary: readonly { x: number; y: number }[]): { cx: number; cy: number; scale: number } {
    if (this.cachedMinimapTransform) return this.cachedMinimapTransform;

    if (outerBoundary.length === 0) {
      this.cachedMinimapTransform = { cx: 0, cy: 0, scale: 0.3 };
      return this.cachedMinimapTransform;
    }

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

    this.cachedMinimapTransform = {
      cx: (minX + maxX) / 2,
      cy: (minY + maxY) / 2,
      scale,
    };
    return this.cachedMinimapTransform;
  }

  private buildMinimapTrack(
    outerBoundary: readonly { x: number; y: number }[],
    innerBoundary: readonly { x: number; y: number }[],
  ): void {
    if (this.trackOutlineBuilt) return;
    this.trackOutlineBuilt = true;

    const { cx, cy, scale } = this.getMinimapTransform(outerBoundary);
    const ox = MINIMAP_SIZE / 2;
    const oy = MINIMAP_SIZE / 2;

    const outerPts: number[] = [];
    for (const p of outerBoundary) {
      outerPts.push(ox + (p.x - cx) * scale, oy - (p.y - cy) * scale);
    }
    const innerPts: number[] = [];
    for (const p of innerBoundary) {
      innerPts.push(ox + (p.x - cx) * scale, oy - (p.y - cy) * scale);
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
    // Build track outline once (static)
    this.buildMinimapTrack(outerBoundary, innerBoundary);

    const { cx, cy, scale } = this.getMinimapTransform(outerBoundary);
    const ox = MINIMAP_SIZE / 2;
    const oy = MINIMAP_SIZE / 2;

    this.minimapGraphics.clear();

    // Player dot — hidden in spectator mode (Fix #43)
    if (this.mode !== 'spectator') {
      const dotX = ox + (carX - cx) * scale;
      const dotY = oy - (carY - cy) * scale;
      this.minimapGraphics.circle(dotX, dotY, MINIMAP_DOT).fill(MINIMAP_CAR_COLOR);
    }

    // AI dot (vs-ai and spectator modes)
    if ((this.mode === 'vs-ai' || this.mode === 'spectator') && this.aiStateSource) {
      const aiState = this.aiStateSource();
      if (aiState) {
        const aiDotX = ox + (aiState.car.position.x - cx) * scale;
        const aiDotY = oy - (aiState.car.position.y - cy) * scale;
        this.minimapGraphics.circle(aiDotX, aiDotY, MINIMAP_DOT).fill(MINIMAP_AI_COLOR);
      }
    }
  }

  // ──────────────────────────────────────────────────────
  // Layout — repositions all HUD elements (Fix #32)
  // ──────────────────────────────────────────────────────

  layoutHud(w: number, h: number): void {
    this.screenW = w;
    this.screenH = h;

    // Gauge: bottom-center
    this.gaugeContainer.position.set(w / 2, h - 100);

    // Lap counter: top-left
    this.lapCounterPanel.position.set(MARGIN, MARGIN);

    // Position indicator: top-left, below lap counter
    this.positionText.position.set(MARGIN + 4, MARGIN + 42);

    // Time panel: top-right
    this.timePanel.position.set(w - MARGIN - 192, MARGIN);

    // AI panel: top-right, below time panel
    this.aiPanel.position.set(w - MARGIN - 192, MARGIN + 86);

    // Minimap: bottom-right
    this.minimapContainer.position.set(w - MARGIN - MINIMAP_SIZE, h - MARGIN - MINIMAP_SIZE);
  }

  // ──────────────────────────────────────────────────────
  // Public API
  // ──────────────────────────────────────────────────────

  /** Set game mode. Called before each race starts. */
  setMode(mode: GameMode): void {
    this.mode = mode;
  }

  /** Set AI state source for HUD stats in vs-ai mode. */
  setAiStateSource(getter: () => WorldState | null): void {
    this.aiStateSource = getter;
  }

  /** Reset HUD state for a new track / race. */
  reset(): void {
    this.trackOutlineBuilt = false;
    this.cachedMinimapTransform = null;
    this.minimapTrackGraphics.clear();
    this.minimapGraphics.clear();
    this.needleContainer.rotation = ARC_START;
    this.lastLapDisplay = '';
    this.lastTotalTimeDisplay = '';
    this.lastCurrentLapDisplay = '';
    this.lastBestLapDisplay = '';
    this.lastPositionDisplay = '';
    this.lapFlashTimer = 0;
    this.lastAiTotalTimeDisplay = '';
    this.lastAiBestLapDisplay = '';
    this.positionText.visible = false;
    this.bestLapText.style.fill = '#666666'; // dim until first PB
  }

  /**
   * Update all HUD elements from current world state.
   * Uses curr (not interpolated) for game state values — timing data is tick-accurate.
   */
  render(
    _prev: WorldState,
    curr: WorldState,
    _alpha: number,
    race: RaceState,
  ): void {
    const { car, timing, track } = curr;

    // Analog gauge
    this.updateGauge(car.speed);

    // Lap times
    const prevBest = _prev.timing.bestLapTicks;
    const currBest = timing.bestLapTicks;
    const isNewBest = timing.lapComplete && currBest !== prevBest && currBest > 0;
    this.updateLapTimes(timing.totalRaceTicks, timing.currentLapTicks, timing.bestLapTicks, timing.lapComplete, isNewBest);

    // Lap counter
    this.updateLapCounter(timing.currentLap, race.targetLaps);

    // Position indicator (vs-ai only)
    const aiState = this.aiStateSource ? this.aiStateSource() : null;
    this.updatePosition(
      timing,
      aiState ? aiState.timing : null,
      track.checkpoints.length,
    );

    // Minimap (with AI dot)
    this.updateMinimap(track.outerBoundary, track.innerBoundary, car.position.x, car.position.y);

    // AI timing stats
    this.updateAiTiming();
  }
}
