import { BlurFilter, Container, Graphics, Text, Ticker } from 'pixi.js';
import { buildTrack } from '../../engine/track';
import { TRACKS } from '../../tracks/registry';

export type MainMenuAction = 'play' | 'settings';

// ── Color Palette ──
const BASE_NAVY     = 0x0a0e1a;
const BASE_DARK     = 0x050810;
const ACCENT_ORANGE = 0xff6b1a;
const ACCENT_BLUE   = 0x00a8ff;
const ACCENT_RED    = 0xff2244;
const TEXT_PRIMARY   = 0xf0f2f5;
const TEXT_SECONDARY = 0x8890a0;
const BUTTON_BG     = 0x111828;
const BUTTON_HOVER  = 0x1a2848;

// ── Car geometry constants (from CarRenderer) ──
const CAR_LENGTH  = 10;
const BODY_WIDTH  = 2.4;
const WHEEL_SPAN  = 5.0;
const FRONT_SPAN  = 4.6;

// ── Easing ──
function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

// ── Speed Line ──
interface SpeedLine {
  x: number;
  y: number;
  speed: number;
  length: number;
  color: number;
  alpha: number;
}

// ── Particle ──
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: number;
  alpha: number;
  life: number;
  maxLife: number;
  phase: number;
  diamond: boolean;
}

export class MainMenuScreen {
  readonly container = new Container();
  onAction: ((action: MainMenuAction) => void) | null = null;

  // Layers
  private bgLayer     = new Container();
  private speedLayer   = new Container();
  private decoLayer    = new Container();
  private particleLayer = new Container();
  private uiLayer      = new Container();

  // Graphics objects (reused each frame)
  private speedGfx     = new Graphics();
  private particleGfx  = new Graphics();

  // Animation state
  private speedLines: SpeedLine[] = [];
  private particles: Particle[] = [];
  private elapsed = 0;
  private entranceElapsed = 0;
  private entranceDone = false;
  private tickerBound: ((dt: Ticker) => void) | null = null;

  // Entrance targets (populated in build)
  private entranceItems: { obj: Container | Text; targetY: number; targetAlpha: number; startDelay: number; fromLeft?: boolean }[] = [];

  // Glow references
  private glowText: Text | null = null;
  private glowFilter: BlurFilter | null = null;

  // Decorations
  private checkeredGfx: Graphics | null = null;
  private carSilhouette: Container | null = null;

  // Screen dimensions
  private w = 0;
  private h = 0;

  constructor() {
    this.w = window.innerWidth;
    this.h = window.innerHeight;

    this.container.addChild(this.bgLayer);
    this.container.addChild(this.speedLayer);
    this.container.addChild(this.decoLayer);
    this.container.addChild(this.particleLayer);
    this.container.addChild(this.uiLayer);

    this.speedLayer.alpha = 0.25;
    this.speedLayer.addChild(this.speedGfx);
    this.particleLayer.addChild(this.particleGfx);

    this.build();
  }

  // ────────────────────────────────────────────────
  //  BUILD
  // ────────────────────────────────────────────────
  private build(): void {
    const { w, h } = this;

    // ── Layer 0: Background ──
    this.buildBackground(w, h);

    // ── Layer 1: Speed Lines (pool) ──
    this.initSpeedLines(w, h);

    // ── Layer 2: Decorations ──
    this.buildDecorations(w, h);

    // ── Layer 3: Particles (pool) ──
    this.initParticles(w, h);

    // ── Layer 4: UI ──
    this.buildUI(w, h);
  }

  // ── Background ──
  private buildBackground(w: number, h: number): void {
    const bg = new Graphics();
    // Diagonal gradient approximation: two overlapping rects
    bg.rect(0, 0, w, h).fill(BASE_NAVY);
    // Darker bottom-right overlay
    const overlay = new Graphics();
    overlay.rect(0, 0, w, h).fill({ color: BASE_DARK, alpha: 0.6 });
    // Mask with gradient-like polygon (dark bottom-right)
    const grad = new Graphics();
    grad.poly([w * 0.3, 0, w, 0, w, h, 0, h]).fill({ color: BASE_DARK, alpha: 0.5 });

    this.bgLayer.addChild(bg);
    this.bgLayer.addChild(grad);

    // Grid overlay
    const grid = new Graphics();
    const spacing = 60;
    for (let x = 0; x < w; x += spacing) {
      grid.moveTo(x, 0).lineTo(x, h);
    }
    for (let y = 0; y < h; y += spacing) {
      grid.moveTo(0, y).lineTo(w, y);
    }
    grid.stroke({ width: 1, color: 0xffffff, alpha: 0.03 });
    this.bgLayer.addChild(grid);
  }

  // ── Speed Lines ──
  private initSpeedLines(w: number, h: number): void {
    const colors = [
      { color: ACCENT_ORANGE, weight: 0.40 },
      { color: ACCENT_BLUE,   weight: 0.25 },
      { color: ACCENT_RED,    weight: 0.20 },
      { color: 0xffffff,      weight: 0.15 },
    ];

    this.speedLines = [];
    for (let i = 0; i < 30; i++) {
      const r = Math.random();
      let color = ACCENT_ORANGE;
      let cum = 0;
      for (const c of colors) {
        cum += c.weight;
        if (r < cum) { color = c.color; break; }
      }
      this.speedLines.push({
        x: Math.random() * (w + 400) - 200,
        y: Math.random() * (h + 200) - 100,
        speed: 150 + Math.random() * 350,
        length: 80 + Math.random() * 200,
        color,
        alpha: 0.3 + Math.random() * 0.7,
      });
    }
  }

  // ── Decorations ──
  private buildDecorations(w: number, h: number): void {
    // Track silhouette
    this.drawTrackSilhouette(w, h);

    // IndyCar silhouette
    this.buildCarSilhouette(w, h);

    // Checkered pattern
    this.buildCheckered(w, h);
  }

  private drawTrackSilhouette(screenW: number, screenH: number): void {
    const trackInfo = TRACKS[0];
    const track = buildTrack(trackInfo.controlPoints, 10);

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of track.outerBoundary) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
    for (const p of track.innerBoundary) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }

    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const tw = maxX - minX;
    const th = maxY - minY;
    const fitSize = Math.min(screenW, screenH) * 0.6;
    const scale = fitSize / Math.max(tw, th);

    const toScreen = (px: number, py: number): [number, number] => [
      screenW / 2 + (px - cx) * scale,
      screenH / 2 - (py - cy) * scale,
    ];

    const gfx = new Graphics();

    // Fill road surface
    const outerPts: number[] = [];
    for (const p of track.outerBoundary) {
      const [sx, sy] = toScreen(p.x, p.y);
      outerPts.push(sx, sy);
    }
    gfx.poly(outerPts).fill({ color: ACCENT_BLUE, alpha: 0.03 });

    // Stroke boundaries
    gfx.poly(outerPts).stroke({ width: 1, color: ACCENT_BLUE, alpha: 0.08 });
    const innerPts: number[] = [];
    for (const p of track.innerBoundary) {
      const [sx, sy] = toScreen(p.x, p.y);
      innerPts.push(sx, sy);
    }
    gfx.poly(innerPts).stroke({ width: 1, color: ACCENT_BLUE, alpha: 0.08 });

    this.decoLayer.addChild(gfx);
  }

  private buildCarSilhouette(w: number, h: number): void {
    const car = new Container();
    const gfx = new Graphics();
    const S = 35; // scale factor
    const hl = CAR_LENGTH / 2;
    const bw = BODY_WIDTH / 2;
    const ws = WHEEL_SPAN / 2;
    const fs = FRONT_SPAN / 2;
    const col = ACCENT_ORANGE;

    // Rear wheels
    gfx.rect((-hl + 0.8) * S, (-ws - 0.6) * S, 2.0 * S, 1.2 * S).fill({ color: col, alpha: 1 });
    gfx.rect((-hl + 0.8) * S, (ws - 0.6) * S, 2.0 * S, 1.2 * S).fill({ color: col, alpha: 1 });
    // Front wheels
    gfx.rect((hl - 3.2) * S, (-fs - 0.45) * S, 1.4 * S, 0.9 * S).fill({ color: col, alpha: 1 });
    gfx.rect((hl - 3.2) * S, (fs - 0.45) * S, 1.4 * S, 0.9 * S).fill({ color: col, alpha: 1 });
    // Front wing
    const fwingW = FRONT_SPAN + 0.9 + 0.4;
    gfx.rect((hl - 1.6) * S, (-fwingW / 2) * S, 0.6 * S, fwingW * S).fill({ color: col, alpha: 1 });
    // Rear wing
    const rwingW = WHEEL_SPAN + 1.2 + 0.2;
    gfx.rect((-hl - 0.3) * S, (-rwingW / 2) * S, 0.7 * S, rwingW * S).fill({ color: col, alpha: 1 });
    // Main body
    gfx.roundRect((-hl + 1.0) * S, -bw * S, (CAR_LENGTH - 2.5) * S, BODY_WIDTH * S, 0.8 * S).fill({ color: col, alpha: 1 });
    // Nose
    gfx.poly([
      (hl - 0.5) * S, 0,
      (hl - 2.0) * S, -bw * 0.8 * S,
      (hl - 2.0) * S, bw * 0.8 * S,
    ]).fill({ color: col, alpha: 1 });
    // Side pods
    gfx.roundRect((-hl + 3.0) * S, (-bw - 1.0 + 0.1) * S, 3.5 * S, 1.0 * S, 0.4 * S).fill({ color: col, alpha: 1 });
    gfx.roundRect((-hl + 3.0) * S, (bw - 0.1) * S, 3.5 * S, 1.0 * S, 0.4 * S).fill({ color: col, alpha: 1 });

    car.addChild(gfx);
    car.alpha = 0.07;
    car.rotation = -10 * Math.PI / 180;
    car.x = w * 0.65;
    car.y = h * 0.45;

    this.carSilhouette = car;
    this.decoLayer.addChild(car);
  }

  private buildCheckered(w: number, h: number): void {
    const gfx = new Graphics();
    const cellSize = 20;
    const gridN = 8;
    for (let r = 0; r < gridN; r++) {
      for (let c = 0; c < gridN; c++) {
        if ((r + c) % 2 === 0) {
          gfx.rect(c * cellSize, r * cellSize, cellSize, cellSize).fill({ color: 0xffffff, alpha: 1 });
        }
      }
    }
    gfx.alpha = 0.04;
    gfx.x = w - gridN * cellSize - 40;
    gfx.y = h - gridN * cellSize - 40;

    this.checkeredGfx = gfx;
    this.decoLayer.addChild(gfx);
  }

  // ── Particles ──
  private initParticles(w: number, h: number): void {
    this.particles = [];
    for (let i = 0; i < 50; i++) {
      this.particles.push(this.makeParticle(w, h, true));
    }
  }

  private makeParticle(w: number, h: number, randomLife: boolean): Particle {
    const r = Math.random();
    let color = ACCENT_ORANGE;
    if (r > 0.6 && r <= 0.9) color = ACCENT_BLUE;
    else if (r > 0.9) color = 0xffffff;

    return {
      x: Math.random() * w,
      y: randomLife ? Math.random() * h : h + 10,
      vx: 0,
      vy: -(20 + Math.random() * 40),
      size: 1 + Math.random() * 2.5,
      color,
      alpha: 0,
      life: randomLife ? Math.random() * 4 : 0,
      maxLife: 3 + Math.random() * 4,
      phase: Math.random() * Math.PI * 2,
      diamond: Math.random() > 0.6,
    };
  }

  // ── UI ──
  private buildUI(w: number, h: number): void {
    // "TOP-DOWN" label
    const topDown = new Text({
      text: 'TOP-DOWN',
      style: {
        fontFamily: '"Exo 2", sans-serif',
        fontSize: 20,
        fill: TEXT_SECONDARY,
        fontWeight: '300',
        letterSpacing: 8,
      },
    });
    topDown.anchor.set(0.5);
    topDown.x = w / 2;
    topDown.y = h * 0.20;
    this.uiLayer.addChild(topDown);
    this.entranceItems.push({ obj: topDown, targetY: h * 0.20, targetAlpha: 1, startDelay: 150 });

    // Title glow (blurred orange text behind)
    const glowText = new Text({
      text: 'RACER',
      style: {
        fontFamily: '"Orbitron", sans-serif',
        fontSize: 72,
        fill: ACCENT_ORANGE,
        fontWeight: '900',
        letterSpacing: 8,
      },
    });
    glowText.anchor.set(0.5);
    glowText.x = w / 2;
    glowText.y = h * 0.30;
    const blurFilter = new BlurFilter({ strength: 12 });
    glowText.filters = [blurFilter];
    glowText.alpha = 0.4;
    this.glowText = glowText;
    this.glowFilter = blurFilter;
    this.uiLayer.addChild(glowText);

    // Title "RACER"
    const title = new Text({
      text: 'RACER',
      style: {
        fontFamily: '"Orbitron", sans-serif',
        fontSize: 72,
        fill: TEXT_PRIMARY,
        fontWeight: '900',
        letterSpacing: 8,
      },
    });
    title.anchor.set(0.5);
    title.x = w / 2;
    title.y = h * 0.30;
    this.uiLayer.addChild(title);
    this.entranceItems.push({ obj: title, targetY: h * 0.30, targetAlpha: 1, startDelay: 150 });
    this.entranceItems.push({ obj: glowText, targetY: h * 0.30, targetAlpha: 0.4, startDelay: 150 });

    // Accent line with diamond center
    const accentLine = new Graphics();
    const lineW = 200;
    const lineY = h * 0.38;
    const cx = w / 2;
    accentLine.moveTo(cx - lineW / 2, lineY).lineTo(cx + lineW / 2, lineY)
      .stroke({ width: 2, color: ACCENT_ORANGE, alpha: 0.8 });
    // Diamond pip
    const ds = 4;
    accentLine.poly([cx, lineY - ds, cx + ds, lineY, cx, lineY + ds, cx - ds, lineY])
      .fill({ color: ACCENT_ORANGE, alpha: 0.9 });
    this.uiLayer.addChild(accentLine);
    this.entranceItems.push({ obj: accentLine as unknown as Container, targetY: 0, targetAlpha: 1, startDelay: 300 });

    // Tagline
    const tagline = new Text({
      text: 'PUSH THE LIMIT',
      style: {
        fontFamily: '"Exo 2", sans-serif',
        fontSize: 14,
        fill: TEXT_SECONDARY,
        fontWeight: '400',
        letterSpacing: 4,
      },
    });
    tagline.anchor.set(0.5);
    tagline.x = w / 2;
    tagline.y = h * 0.42;
    this.uiLayer.addChild(tagline);
    this.entranceItems.push({ obj: tagline, targetY: h * 0.42, targetAlpha: 1, startDelay: 300 });

    // RACE button
    const raceBtn = this.buildButton('RACE', w / 2, h * 0.55, 260, 52, '>', () => this.onAction?.('play'));
    this.uiLayer.addChild(raceBtn);
    this.entranceItems.push({ obj: raceBtn, targetY: h * 0.55, targetAlpha: 1, startDelay: 400, fromLeft: true });

    // SETTINGS button
    const settingsBtn = this.buildButton('SETTINGS', w / 2, h * 0.65, 260, 52, '>', () => this.onAction?.('settings'));
    this.uiLayer.addChild(settingsBtn);
    this.entranceItems.push({ obj: settingsBtn, targetY: h * 0.65, targetAlpha: 1, startDelay: 500, fromLeft: true });

    // Version
    const version = new Text({
      text: 'v1.0',
      style: {
        fontFamily: '"Exo 2", sans-serif',
        fontSize: 12,
        fill: TEXT_SECONDARY,
        fontWeight: '300',
      },
    });
    version.anchor.set(0.5);
    version.x = w / 2;
    version.y = h - 30;
    version.alpha = 0.4;
    this.uiLayer.addChild(version);
    this.entranceItems.push({ obj: version, targetY: h - 30, targetAlpha: 0.4, startDelay: 600 });

    // Set initial entrance state
    for (const item of this.entranceItems) {
      item.obj.alpha = 0;
      if (item.fromLeft) {
        item.obj.x -= 60;
      } else if (item.targetY !== 0) {
        item.obj.y -= 30;
      }
    }
  }

  private buildButton(label: string, x: number, y: number, bw: number, bh: number, chevron: string, onClick: () => void): Container {
    const btn = new Container();
    btn.x = x;
    btn.y = y;

    const chamfer = 6;

    // Background
    const bg = new Graphics();
    this.drawChamferedRect(bg, -bw / 2, -bh / 2, bw, bh, chamfer, BUTTON_BG, 0.9);
    btn.addChild(bg);

    // Left orange stripe
    const stripe = new Graphics();
    stripe.rect(-bw / 2, -bh / 2 + 4, 3, bh - 8).fill({ color: ACCENT_ORANGE, alpha: 0.9 });
    btn.addChild(stripe);

    // Border (initially subtle)
    const border = new Graphics();
    this.drawChamferedRectStroke(border, -bw / 2, -bh / 2, bw, bh, chamfer, TEXT_SECONDARY, 0.2, 1);
    btn.addChild(border);

    // Label
    const text = new Text({
      text: label,
      style: {
        fontFamily: '"Orbitron", sans-serif',
        fontSize: 18,
        fill: TEXT_PRIMARY,
        fontWeight: '700',
        letterSpacing: 3,
      },
    });
    text.anchor.set(0, 0.5);
    text.x = -bw / 2 + 24;
    text.y = 0;
    btn.addChild(text);

    // Chevron
    const chev = new Text({
      text: chevron,
      style: {
        fontFamily: '"Orbitron", sans-serif',
        fontSize: 18,
        fill: TEXT_SECONDARY,
        fontWeight: '700',
      },
    });
    chev.anchor.set(1, 0.5);
    chev.x = bw / 2 - 16;
    chev.y = 0;
    btn.addChild(chev);

    btn.eventMode = 'static';
    btn.cursor = 'pointer';

    btn.on('pointerover', () => {
      bg.clear();
      this.drawChamferedRect(bg, -bw / 2, -bh / 2, bw, bh, chamfer, BUTTON_HOVER, 0.95);
      border.clear();
      this.drawChamferedRectStroke(border, -bw / 2, -bh / 2, bw, bh, chamfer, ACCENT_ORANGE, 0.7, 1.5);
      text.x = -bw / 2 + 26; // shift 2px right
    });

    btn.on('pointerout', () => {
      bg.clear();
      this.drawChamferedRect(bg, -bw / 2, -bh / 2, bw, bh, chamfer, BUTTON_BG, 0.9);
      border.clear();
      this.drawChamferedRectStroke(border, -bw / 2, -bh / 2, bw, bh, chamfer, TEXT_SECONDARY, 0.2, 1);
      text.x = -bw / 2 + 24;
    });

    btn.on('pointerdown', () => {
      btn.scale.set(0.97);
      setTimeout(() => {
        btn.scale.set(1);
        onClick();
      }, 80);
    });

    return btn;
  }

  private drawChamferedRect(g: Graphics, x: number, y: number, w: number, h: number, c: number, color: number, alpha: number): void {
    g.poly([
      x + c, y,
      x + w - c, y,
      x + w, y + c,
      x + w, y + h - c,
      x + w - c, y + h,
      x + c, y + h,
      x, y + h - c,
      x, y + c,
    ]).fill({ color, alpha });
  }

  private drawChamferedRectStroke(g: Graphics, x: number, y: number, w: number, h: number, c: number, color: number, alpha: number, width: number): void {
    g.poly([
      x + c, y,
      x + w - c, y,
      x + w, y + c,
      x + w, y + h - c,
      x + w - c, y + h,
      x + c, y + h,
      x, y + h - c,
      x, y + c,
      x + c, y, // close
    ]).stroke({ color, alpha, width });
  }

  // ────────────────────────────────────────────────
  //  ANIMATION
  // ────────────────────────────────────────────────
  private startTicker(): void {
    if (this.tickerBound) return;
    this.elapsed = 0;

    this.tickerBound = (ticker: Ticker) => this.tick(ticker.deltaMS / 1000);
    Ticker.shared.add(this.tickerBound);
  }

  private stopTicker(): void {
    if (this.tickerBound) {
      Ticker.shared.remove(this.tickerBound);
      this.tickerBound = null;
    }
  }

  private tick(dt: number): void {
    this.elapsed += dt;

    // Entrance animation
    if (!this.entranceDone) {
      this.entranceElapsed += dt * 1000; // convert to ms
      this.updateEntrance();
    }

    // Continuous animations
    this.updateSpeedLines(dt);
    this.updateParticles(dt);
    this.updateGlow();
    this.updateDecorations(dt);
  }

  private updateEntrance(): void {
    const t = this.entranceElapsed;
    const duration = 400; // ms per item animation
    let allDone = true;

    for (const item of this.entranceItems) {
      const localT = t - item.startDelay;
      if (localT < 0) {
        allDone = false;
        continue;
      }
      const progress = Math.min(localT / duration, 1);
      const eased = easeOutCubic(progress);

      item.obj.alpha = eased * item.targetAlpha;

      if (item.fromLeft) {
        // Slide in from left: starts 60px left of target
        const baseX = this.w / 2; // buttons are centered
        item.obj.x = baseX - 60 * (1 - eased);
      } else if (item.targetY !== 0) {
        // Slide down from above
        item.obj.y = item.targetY - 30 * (1 - eased);
      }

      if (progress < 1) allDone = false;
    }

    if (allDone) this.entranceDone = true;
  }

  private updateSpeedLines(dt: number): void {
    const { w, h } = this;
    const gfx = this.speedGfx;
    gfx.clear();

    const angle = -Math.PI / 6; // ~30 degrees
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);

    for (const line of this.speedLines) {
      line.x -= line.speed * dt * 0.7;
      line.y += line.speed * dt * 0.35;

      // Wrap around
      if (line.x + line.length * Math.abs(dx) < -50) {
        line.x = w + 100 + Math.random() * 200;
        line.y = -100 + Math.random() * (h * 0.5);
      }

      gfx.moveTo(line.x, line.y)
        .lineTo(line.x + dx * line.length, line.y + dy * line.length)
        .stroke({ width: 1, color: line.color, alpha: line.alpha });
    }
  }

  private updateParticles(dt: number): void {
    const { w, h } = this;
    const gfx = this.particleGfx;
    gfx.clear();

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      p.life += dt;

      if (p.life > p.maxLife) {
        // Recycle
        const np = this.makeParticle(w, h, false);
        this.particles[i] = np;
        continue;
      }

      p.y += p.vy * dt;
      p.x += Math.sin(p.phase + this.elapsed * 1.5) * 15 * dt; // sine sway

      // Alpha: fade in then out
      const lifeRatio = p.life / p.maxLife;
      if (lifeRatio < 0.2) {
        p.alpha = lifeRatio / 0.2;
      } else if (lifeRatio > 0.7) {
        p.alpha = (1 - lifeRatio) / 0.3;
      } else {
        p.alpha = 1;
      }
      p.alpha *= 0.6; // overall dimming

      if (p.diamond) {
        const s = p.size;
        gfx.poly([p.x, p.y - s, p.x + s, p.y, p.x, p.y + s, p.x - s, p.y])
          .fill({ color: p.color, alpha: p.alpha });
      } else {
        gfx.circle(p.x, p.y, p.size)
          .fill({ color: p.color, alpha: p.alpha });
      }
    }
  }

  private updateGlow(): void {
    if (!this.glowText) return;
    // Pulse alpha between 0.25 and 0.55 over 3 seconds
    const pulse = Math.sin(this.elapsed * (2 * Math.PI / 3)) * 0.5 + 0.5;
    this.glowText.alpha = 0.25 + pulse * 0.30;
  }

  private updateDecorations(dt: number): void {
    // Checkered rotation
    if (this.checkeredGfx) {
      this.checkeredGfx.rotation += dt * 0.08;
    }
    // Car silhouette y-drift
    if (this.carSilhouette) {
      const baseY = this.h * 0.45;
      this.carSilhouette.y = baseY + Math.sin(this.elapsed * 0.5) * 15;
    }
  }

  // ────────────────────────────────────────────────
  //  PUBLIC API (unchanged)
  // ────────────────────────────────────────────────
  show(): void {
    this.container.visible = true;
    // Reset entrance for each show
    this.entranceElapsed = 0;
    this.entranceDone = false;
    for (const item of this.entranceItems) {
      item.obj.alpha = 0;
    }
    this.startTicker();
  }

  hide(): void {
    this.container.visible = false;
    this.stopTicker();
  }
}
