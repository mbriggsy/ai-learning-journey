import { Container, Graphics, Text } from 'pixi.js';
import { buildTrack } from '../../engine/track';
import type { TrackState } from '../../engine/types';
import { TRACKS, type TrackInfo } from '../../tracks/registry';
import { getBestTime, formatTime } from '../BestTimes';

export type TrackSelectAction = { type: 'select'; index: number } | { type: 'back' };

const TITLE_STYLE = {
  fontFamily: 'monospace',
  fontSize: 36,
  fill: '#ffffff',
  fontWeight: 'bold' as const,
  letterSpacing: 3,
};

const CARD_NAME_STYLE = {
  fontFamily: 'monospace',
  fontSize: 20,
  fill: '#ffffff',
  fontWeight: 'bold' as const,
};

const CARD_DESC_STYLE = {
  fontFamily: 'monospace',
  fontSize: 12,
  fill: '#999999',
  wordWrap: true,
  wordWrapWidth: 210,
};

const CARD_TIME_STYLE = {
  fontFamily: 'monospace',
  fontSize: 14,
  fill: '#aaaaaa',
};

const CARD_BEST_STYLE = {
  fontFamily: 'monospace',
  fontSize: 14,
  fill: '#44ff88',
  fontWeight: 'bold' as const,
};

const BACK_STYLE = {
  fontFamily: 'monospace',
  fontSize: 16,
  fill: '#888888',
};

// Thumbnail cache — buildTrack is expensive
const thumbnailCache = new Map<string, TrackState>();
function getTrackThumbnail(trackId: string, points: TrackInfo['controlPoints']): TrackState {
  if (!thumbnailCache.has(trackId)) {
    thumbnailCache.set(trackId, buildTrack(points, 10));
  }
  return thumbnailCache.get(trackId)!;
}

export class TrackSelectScreen {
  readonly container = new Container();
  onAction: ((action: TrackSelectAction) => void) | null = null;

  private bg!: Graphics;

  constructor() {
    this.build();
  }

  /** Rebuild to refresh best times. */
  refresh(): void {
    this.container.removeChildren();
    this.build();
  }

  private build(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;

    // Dark background
    this.bg = new Graphics();
    this.bg.rect(0, 0, w, h).fill(0x0a0a0a);
    this.container.addChild(this.bg);

    // Title
    const title = new Text({ text: 'SELECT TRACK', style: TITLE_STYLE });
    title.anchor.set(0.5);
    title.x = w / 2;
    title.y = 60;
    this.container.addChild(title);

    // Track cards
    const cardW = 240;
    const cardH = 340;
    const gap = 30;
    const totalW = TRACKS.length * cardW + (TRACKS.length - 1) * gap;
    const startX = (w - totalW) / 2;
    const cardY = (h - cardH) / 2 + 10;

    for (let i = 0; i < TRACKS.length; i++) {
      const trackInfo = TRACKS[i];
      const x = startX + i * (cardW + gap);
      this.buildCard(trackInfo, i, x, cardY, cardW, cardH);
    }

    // Back button
    const back = new Text({ text: '< BACK', style: BACK_STYLE });
    back.anchor.set(0.5);
    back.x = w / 2;
    back.y = h - 50;
    back.eventMode = 'static';
    back.cursor = 'pointer';
    back.on('pointerover', () => { back.style.fill = '#ffffff'; });
    back.on('pointerout', () => { back.style.fill = '#888888'; });
    back.on('pointerdown', () => this.onAction?.({ type: 'back' }));
    this.container.addChild(back);
  }

  private buildCard(info: TrackInfo, index: number, x: number, y: number, w: number, h: number): void {
    const card = new Container();
    card.x = x;
    card.y = y;

    // Card background
    const bg = new Graphics();
    bg.roundRect(0, 0, w, h, 6).fill({ color: 0x1a1a1a, alpha: 0.95 });
    bg.roundRect(0, 0, w, h, 6).stroke({ width: 1, color: 0x333333 });
    card.addChild(bg);

    // Minimap thumbnail
    const thumbSize = 140;
    const thumbX = (w - thumbSize) / 2;
    const thumbY = 16;
    const thumbGfx = new Graphics();
    this.drawThumbnail(thumbGfx, info, thumbX, thumbY, thumbSize);
    card.addChild(thumbGfx);

    // Track name
    const name = new Text({ text: info.name, style: CARD_NAME_STYLE });
    name.anchor.set(0.5, 0);
    name.x = w / 2;
    name.y = thumbY + thumbSize + 12;
    card.addChild(name);

    // Description
    const desc = new Text({ text: info.description, style: CARD_DESC_STYLE });
    desc.anchor.set(0.5, 0);
    desc.x = w / 2;
    desc.y = name.y + 28;
    card.addChild(desc);

    // Par times
    const parY = desc.y + 28;
    const goldText = new Text({ text: `🥇 ${formatTime(info.parTimes.gold)}`, style: CARD_TIME_STYLE });
    goldText.x = 16;
    goldText.y = parY;
    card.addChild(goldText);

    const silverText = new Text({ text: `🥈 ${formatTime(info.parTimes.silver)}`, style: CARD_TIME_STYLE });
    silverText.x = 16;
    silverText.y = parY + 20;
    card.addChild(silverText);

    const bronzeText = new Text({ text: `🥉 ${formatTime(info.parTimes.bronze)}`, style: CARD_TIME_STYLE });
    bronzeText.x = 16;
    bronzeText.y = parY + 40;
    card.addChild(bronzeText);

    // Best time
    const best = getBestTime(info.id);
    const bestLabel = best !== null ? `Best: ${formatTime(best)}` : 'Best: —';
    const bestText = new Text({ text: bestLabel, style: best !== null ? CARD_BEST_STYLE : CARD_TIME_STYLE });
    bestText.anchor.set(0.5, 0);
    bestText.x = w / 2;
    bestText.y = parY + 68;
    card.addChild(bestText);

    // Interactivity
    card.eventMode = 'static';
    card.cursor = 'pointer';

    card.on('pointerover', () => {
      bg.clear();
      bg.roundRect(0, 0, w, h, 6).fill({ color: 0x252525, alpha: 0.95 });
      bg.roundRect(0, 0, w, h, 6).stroke({ width: 2, color: 0x44aaff });
      card.scale.set(1.02);
    });
    card.on('pointerout', () => {
      bg.clear();
      bg.roundRect(0, 0, w, h, 6).fill({ color: 0x1a1a1a, alpha: 0.95 });
      bg.roundRect(0, 0, w, h, 6).stroke({ width: 1, color: 0x333333 });
      card.scale.set(1.0);
    });
    card.on('pointerdown', () => this.onAction?.({ type: 'select', index }));

    this.container.addChild(card);
  }

  private drawThumbnail(gfx: Graphics, info: TrackInfo, offX: number, offY: number, size: number): void {
    const track = getTrackThumbnail(info.id, info.controlPoints);

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
    const padding = 10;
    const fitSize = size - padding * 2;
    const scale = fitSize / Math.max(tw, th);

    const toScreen = (px: number, py: number): [number, number] => [
      offX + size / 2 + (px - cx) * scale,
      offY + size / 2 - (py - cy) * scale,
    ];

    // Outer boundary
    const outerPts: number[] = [];
    for (const p of track.outerBoundary) {
      const [sx, sy] = toScreen(p.x, p.y);
      outerPts.push(sx, sy);
    }
    gfx.poly(outerPts).stroke({ width: 1.5, color: 0x44aaff, alpha: 0.7 });

    // Inner boundary
    const innerPts: number[] = [];
    for (const p of track.innerBoundary) {
      const [sx, sy] = toScreen(p.x, p.y);
      innerPts.push(sx, sy);
    }
    gfx.poly(innerPts).stroke({ width: 1.5, color: 0x44aaff, alpha: 0.7 });
  }

  show(): void { this.container.visible = true; }
  hide(): void { this.container.visible = false; }
}
