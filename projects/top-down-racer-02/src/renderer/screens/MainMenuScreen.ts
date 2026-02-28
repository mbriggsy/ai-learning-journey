import { Container, Graphics, Text } from 'pixi.js';
import { buildTrack } from '../../engine/track';
import { TRACKS } from '../../tracks/registry';

export type MainMenuAction = 'play' | 'settings';

const TITLE_STYLE = {
  fontFamily: 'monospace',
  fontSize: 52,
  fill: '#ffffff',
  fontWeight: 'bold' as const,
  letterSpacing: 6,
};

const BUTTON_STYLE = {
  fontFamily: 'monospace',
  fontSize: 24,
  fill: '#ffffff',
  fontWeight: 'bold' as const,
};

export class MainMenuScreen {
  readonly container = new Container();
  onAction: ((action: MainMenuAction) => void) | null = null;

  private bg!: Graphics;
  private silhouette!: Graphics;

  constructor() {
    this.build();
  }

  private build(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;

    // Dark background
    this.bg = new Graphics();
    this.bg.rect(0, 0, w, h).fill(0x0a0a0a);
    this.container.addChild(this.bg);

    // Track silhouette background
    this.silhouette = new Graphics();
    this.drawTrackSilhouette(w, h);
    this.container.addChild(this.silhouette);

    // Title
    const title = new Text({ text: 'TOP-DOWN RACER', style: TITLE_STYLE });
    title.anchor.set(0.5);
    title.x = w / 2;
    title.y = h * 0.32;
    this.container.addChild(title);

    // Play button
    this.addButton('PLAY', w / 2, h * 0.54, () => this.onAction?.('play'));

    // Settings button
    this.addButton('SETTINGS', w / 2, h * 0.64, () => this.onAction?.('settings'));
  }

  private addButton(label: string, x: number, y: number, onClick: () => void): void {
    const text = new Text({ text: label, style: BUTTON_STYLE });
    text.anchor.set(0.5);

    const padX = 40;
    const padY = 14;
    const btnW = text.width + padX * 2;
    const btnH = text.height + padY * 2;

    const btn = new Container();
    btn.x = x;
    btn.y = y;

    const bg = new Graphics();
    bg.roundRect(-btnW / 2, -btnH / 2, btnW, btnH, 4).fill({ color: 0x333333, alpha: 0.8 });
    btn.addChild(bg);
    btn.addChild(text);

    btn.eventMode = 'static';
    btn.cursor = 'pointer';

    btn.on('pointerover', () => {
      bg.clear();
      bg.roundRect(-btnW / 2, -btnH / 2, btnW, btnH, 4).fill({ color: 0x555555, alpha: 0.9 });
    });
    btn.on('pointerout', () => {
      bg.clear();
      bg.roundRect(-btnW / 2, -btnH / 2, btnW, btnH, 4).fill({ color: 0x333333, alpha: 0.8 });
    });
    btn.on('pointerdown', onClick);

    this.container.addChild(btn);
  }

  private drawTrackSilhouette(screenW: number, screenH: number): void {
    const trackInfo = TRACKS[0];
    const track = buildTrack(trackInfo.controlPoints, 10);

    // Find bounding box
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

    // Draw outer boundary
    const outerPts: number[] = [];
    for (const p of track.outerBoundary) {
      const [sx, sy] = toScreen(p.x, p.y);
      outerPts.push(sx, sy);
    }
    this.silhouette.poly(outerPts).stroke({ width: 1, color: 0x222222, alpha: 0.5 });

    // Draw inner boundary
    const innerPts: number[] = [];
    for (const p of track.innerBoundary) {
      const [sx, sy] = toScreen(p.x, p.y);
      innerPts.push(sx, sy);
    }
    this.silhouette.poly(innerPts).stroke({ width: 1, color: 0x222222, alpha: 0.5 });
  }

  show(): void { this.container.visible = true; }
  hide(): void { this.container.visible = false; }
}
