/**
 * Track Selection Screen
 *
 * Tactical briefing aesthetic — chamfered cards, filled track thumbnails,
 * diamond medal pips, subtle grid background. Two clicks to racing.
 */

import { Container, Graphics, Text } from 'pixi.js';
import { buildTrack } from '../../engine/track';
import type { TrackState } from '../../engine/types';
import { TRACKS, type TrackInfo } from '../../tracks/registry';
import { getBestTime, formatTime } from '../BestTimes';

export type TrackSelectAction = { type: 'select'; index: number } | { type: 'back' };

// ── Color Palette ────────────────────────────────────────────────────
const PAL = {
  BG:           0x08090f,
  GRID:         0x151820,
  CARD_BG:      0x111318,
  CARD_HOVER:   0x181c24,
  BORDER:       0x252830,
  ACCENT:       0x00d4ff,
  ACCENT_DIM:   0x0a3848,
  TEXT_PRIMARY:  0xf0f2f5,
  TEXT_SECONDARY:0x8890a0,
  TEXT_DIM:      0x484e5c,
  GOLD:         0xffd700,
  SILVER:       0xb0b8c8,
  BRONZE:       0xc87840,
  BEST:         0x44ff88,
  TRACK_ROAD:   0x2a3040,
  TRACK_EDGE:   0x3a9ac0,
  THUMB_BG:     0x0a0c12,
} as const;

const FONT = 'monospace';

/** Convert a hex number to a CSS color string for dynamic PixiJS Text.style.fill updates. */
function hex(n: number): string {
  return '#' + n.toString(16).padStart(6, '0');
}

// ── Thumbnail cache ──────────────────────────────────────────────────
const thumbnailCache = new Map<string, TrackState>();
function getTrackThumbnail(trackId: string, points: TrackInfo['controlPoints']): TrackState {
  if (!thumbnailCache.has(trackId)) {
    thumbnailCache.set(trackId, buildTrack(points, 10));
  }
  return thumbnailCache.get(trackId)!;
}

// ── Chamfered rectangle (diagonal-cut corners) ──────────────────────
function chamferedPoly(x: number, y: number, w: number, h: number, c: number): number[] {
  return [
    x + c, y,
    x + w - c, y,
    x + w, y + c,
    x + w, y + h - c,
    x + w - c, y + h,
    x + c, y + h,
    x, y + h - c,
    x, y + c,
  ];
}

// ─────────────────────────────────────────────────────────────────────
export class TrackSelectScreen {
  readonly container = new Container();
  onAction: ((action: TrackSelectAction) => void) | null = null;

  constructor() { this.build(); }

  /** Rebuild to refresh best times after a race. */
  refresh(): void {
    this.container.removeChildren();
    this.build();
  }

  // ── Layout ───────────────────────────────────────────────────────
  private build(): void {
    const sw = window.innerWidth;
    const sh = window.innerHeight;

    // Background
    const bg = new Graphics();
    bg.rect(0, 0, sw, sh).fill(PAL.BG);
    this.container.addChild(bg);

    // Subtle grid overlay
    this.buildGrid(sw, sh);

    // Title bar
    this.buildTitle(sw);

    // Track cards
    const cardW = 300;
    const cardH = 420;
    const gap = 36;
    const totalW = TRACKS.length * cardW + (TRACKS.length - 1) * gap;
    const startX = (sw - totalW) / 2;
    const cardY = (sh - cardH) / 2 + 16;

    for (let i = 0; i < TRACKS.length; i++) {
      const x = startX + i * (cardW + gap);
      this.buildCard(TRACKS[i], i, x, cardY, cardW, cardH);
    }

    // Back nav
    this.buildBackButton(sw, sh);
  }

  // ── Background grid ─────────────────────────────────────────────
  private buildGrid(sw: number, sh: number): void {
    const g = new Graphics();
    const step = 48;
    for (let x = 0; x < sw; x += step) {
      g.moveTo(x, 0).lineTo(x, sh);
    }
    for (let y = 0; y < sh; y += step) {
      g.moveTo(0, y).lineTo(sw, y);
    }
    g.stroke({ width: 1, color: PAL.GRID, alpha: 0.4 });
    this.container.addChild(g);
  }

  // ── Title ───────────────────────────────────────────────────────
  private buildTitle(sw: number): void {
    const title = new Text({
      text: 'SELECT TRACK',
      style: {
        fontFamily: FONT,
        fontSize: 28,
        fill: PAL.TEXT_PRIMARY,
        fontWeight: 'bold' as const,
        letterSpacing: 6,
      },
    });
    title.anchor.set(0.5);
    title.x = sw / 2;
    title.y = 50;
    this.container.addChild(title);

    // Accent rule with center diamond
    const ruleW = 180;
    const ruleY = 70;
    const g = new Graphics();
    g.moveTo(sw / 2 - ruleW / 2, ruleY).lineTo(sw / 2 + ruleW / 2, ruleY)
     .stroke({ width: 1, color: PAL.ACCENT, alpha: 0.5 });
    const d = 4;
    g.poly([sw / 2, ruleY - d, sw / 2 + d, ruleY, sw / 2, ruleY + d, sw / 2 - d, ruleY])
     .fill({ color: PAL.ACCENT, alpha: 0.7 });
    this.container.addChild(g);
  }

  // ── Card ────────────────────────────────────────────────────────
  private buildCard(
    info: TrackInfo,
    index: number,
    x: number, y: number,
    w: number, h: number,
  ): void {
    const card = new Container();
    card.x = x;
    card.y = y;
    const cham = 10;

    // Background shape
    const bg = new Graphics();
    this.paintCard(bg, w, h, cham, false);
    card.addChild(bg);

    // ── Track number badge ──
    const badge = new Text({
      text: String(index + 1).padStart(2, '0'),
      style: { fontFamily: FONT, fontSize: 11, fill: PAL.TEXT_DIM, letterSpacing: 2 },
    });
    badge.x = 14;
    badge.y = 10;
    card.addChild(badge);

    // ── Thumbnail ──
    const pad = 16;
    const thumbW = w - pad * 2;
    const thumbH = 170;
    const thumbX = pad;
    const thumbY = 26;

    // Thumb bg
    const tbg = new Graphics();
    tbg.rect(thumbX, thumbY, thumbW, thumbH).fill({ color: PAL.THUMB_BG, alpha: 0.8 });
    tbg.rect(thumbX, thumbY, thumbW, thumbH).stroke({ width: 1, color: PAL.BORDER });
    card.addChild(tbg);

    // Filled minimap — clipped to thumbnail area
    const thumbClip = new Graphics();
    thumbClip.rect(thumbX, thumbY, thumbW, thumbH).fill(0xffffff);
    card.addChild(thumbClip);

    const thumb = new Graphics();
    thumb.mask = thumbClip;
    this.drawFilledThumbnail(thumb, info, thumbX, thumbY, thumbW, thumbH);
    card.addChild(thumb);

    // Accent bar
    const barY = thumbY + thumbH + 8;
    const bar = new Graphics();
    bar.rect(thumbX, barY, thumbW, 2).fill({ color: PAL.ACCENT, alpha: 0.35 });
    card.addChild(bar);

    // ── Name ──
    const nameY = barY + 14;
    const name = new Text({
      text: info.name.toUpperCase(),
      style: {
        fontFamily: FONT,
        fontSize: 20,
        fill: PAL.TEXT_PRIMARY,
        fontWeight: 'bold' as const,
        letterSpacing: 3,
      },
    });
    name.anchor.set(0.5, 0);
    name.x = w / 2;
    name.y = nameY;
    card.addChild(name);

    // ── Description ──
    const desc = new Text({
      text: info.description,
      style: { fontFamily: FONT, fontSize: 11, fill: PAL.TEXT_SECONDARY, letterSpacing: 1 },
    });
    desc.anchor.set(0.5, 0);
    desc.x = w / 2;
    desc.y = nameY + 26;
    card.addChild(desc);

    // ── Divider ──
    const divY = nameY + 50;
    const div = new Graphics();
    div.moveTo(pad, divY).lineTo(w - pad, divY).stroke({ width: 1, color: PAL.BORDER });
    card.addChild(div);

    // ── Medal times ──
    const timesY = divY + 14;
    const medals: { color: number; ticks: number }[] = [
      { color: PAL.GOLD,   ticks: info.parTimes.gold },
      { color: PAL.SILVER, ticks: info.parTimes.silver },
      { color: PAL.BRONZE, ticks: info.parTimes.bronze },
    ];

    for (let m = 0; m < medals.length; m++) {
      const my = timesY + m * 22;
      const pipX = pad + 8;
      const pipCY = my + 8; // vertical center of the text line
      const ps = 3.5;       // pip half-size

      // Diamond pip
      const pip = new Graphics();
      pip.poly([pipX, pipCY - ps, pipX + ps, pipCY, pipX, pipCY + ps, pipX - ps, pipCY])
         .fill(medals[m].color);
      card.addChild(pip);

      // Time
      const t = new Text({
        text: formatTime(medals[m].ticks),
        style: { fontFamily: FONT, fontSize: 13, fill: PAL.TEXT_SECONDARY },
      });
      t.x = pipX + 12;
      t.y = my;
      card.addChild(t);
    }

    // ── Best time ──
    const best = getBestTime(info.id);
    const bestY = timesY + 76;

    if (best !== null) {
      const bt = new Text({
        text: `BEST  ${formatTime(best)}`,
        style: {
          fontFamily: FONT,
          fontSize: 14,
          fill: PAL.BEST,
          fontWeight: 'bold' as const,
          letterSpacing: 1,
        },
      });
      bt.anchor.set(0.5, 0);
      bt.x = w / 2;
      bt.y = bestY;
      card.addChild(bt);
    } else {
      const bt = new Text({
        text: 'NO TIME SET',
        style: { fontFamily: FONT, fontSize: 12, fill: PAL.TEXT_DIM, letterSpacing: 2 },
      });
      bt.anchor.set(0.5, 0);
      bt.x = w / 2;
      bt.y = bestY + 1;
      card.addChild(bt);
    }

    // ── Hover / click ──
    card.eventMode = 'static';
    card.cursor = 'pointer';

    card.on('pointerover', () => {
      bg.clear();
      this.paintCard(bg, w, h, cham, true);
      card.scale.set(1.02);
    });
    card.on('pointerout', () => {
      bg.clear();
      this.paintCard(bg, w, h, cham, false);
      card.scale.set(1.0);
    });
    card.on('pointerdown', () => this.onAction?.({ type: 'select', index }));

    this.container.addChild(card);
  }

  // ── Card background (normal / hovered) ──────────────────────────
  private paintCard(
    g: Graphics,
    w: number, h: number,
    cham: number,
    hovered: boolean,
  ): void {
    const pts = chamferedPoly(0, 0, w, h, cham);
    if (hovered) {
      // Outer glow
      const glow = chamferedPoly(-2, -2, w + 4, h + 4, cham + 1);
      g.poly(glow).stroke({ width: 1, color: PAL.ACCENT, alpha: 0.25 });
      g.poly(pts).fill({ color: PAL.CARD_HOVER, alpha: 0.98 });
      g.poly(pts).stroke({ width: 1.5, color: PAL.ACCENT, alpha: 0.8 });
    } else {
      g.poly(pts).fill({ color: PAL.CARD_BG, alpha: 0.95 });
      g.poly(pts).stroke({ width: 1, color: PAL.BORDER });
    }
  }

  // ── Filled track thumbnail ──────────────────────────────────────
  private drawFilledThumbnail(
    gfx: Graphics,
    info: TrackInfo,
    offX: number, offY: number,
    areaW: number, areaH: number,
  ): void {
    const track = getTrackThumbnail(info.id, info.controlPoints);

    // Bounding box — must include BOTH boundaries since "inner"/"outer" refer
    // to left/right of travel direction, not inside/outside the loop
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const boundary of [track.outerBoundary, track.innerBoundary]) {
      for (const p of boundary) {
        if (p.x < minX) minX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.x > maxX) maxX = p.x;
        if (p.y > maxY) maxY = p.y;
      }
    }
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const tw = maxX - minX;
    const th = maxY - minY;
    const padding = 12;
    const scale = Math.min((areaW - padding * 2) / tw, (areaH - padding * 2) / th);

    const toScreen = (px: number, py: number): [number, number] => [
      offX + areaW / 2 + (px - cx) * scale,
      offY + areaH / 2 - (py - cy) * scale,
    ];

    // Flatten boundary arrays
    const outerPts: number[] = [];
    for (const p of track.outerBoundary) {
      const [sx, sy] = toScreen(p.x, p.y);
      outerPts.push(sx, sy);
    }
    const innerPts: number[] = [];
    for (const p of track.innerBoundary) {
      const [sx, sy] = toScreen(p.x, p.y);
      innerPts.push(sx, sy);
    }

    // Filled road surface (outer fill, inner cut)
    gfx.poly(outerPts).fill({ color: PAL.TRACK_ROAD, alpha: 0.8 });
    gfx.poly(innerPts).cut();

    // Edge strokes
    gfx.poly(outerPts).stroke({ width: 1.5, color: PAL.TRACK_EDGE, alpha: 0.7 });
    gfx.poly(innerPts).stroke({ width: 1.5, color: PAL.TRACK_EDGE, alpha: 0.7 });
  }

  // ── Back button ─────────────────────────────────────────────────
  private buildBackButton(sw: number, sh: number): void {
    const back = new Text({
      text: '< BACK',
      style: { fontFamily: FONT, fontSize: 14, fill: PAL.TEXT_DIM, letterSpacing: 2 },
    });
    back.anchor.set(0.5);
    back.x = sw / 2;
    back.y = sh - 44;
    back.eventMode = 'static';
    back.cursor = 'pointer';
    back.on('pointerover', () => { back.style.fill = hex(PAL.ACCENT); });
    back.on('pointerout',  () => { back.style.fill = hex(PAL.TEXT_DIM); });
    back.on('pointerdown',  () => this.onAction?.({ type: 'back' }));
    this.container.addChild(back);
  }

  show(): void { this.container.visible = true; }
  hide(): void { this.container.visible = false; }
}
