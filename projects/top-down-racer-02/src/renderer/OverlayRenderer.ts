import { Container, Graphics, Text } from 'pixi.js';
import type { WorldState } from '../engine/types';
import { GamePhase, type RaceState } from '../engine/RaceController';
import type { SoundManager } from './SoundManager';

// ──────────────────────────────────────────────────────────
// Color palette (matches MainMenuScreen)
// ──────────────────────────────────────────────────────────

const BASE_NAVY       = 0x0a0e1a;
const BASE_DARK       = 0x060a14;
const ACCENT_ORANGE   = 0xff6b1a;
const TEXT_PRIMARY    = 0xf0f2f5;
const TEXT_SECONDARY  = 0x8890a0;
const BUTTON_BG       = 0x111828;
const BUTTON_HOVER    = 0x1a2848;

const STATUS_GREEN    = 0x44ff88;
const STATUS_RED      = 0xff4466;

// ──────────────────────────────────────────────────────────
// Layout and style constants
// ──────────────────────────────────────────────────────────

const COUNTDOWN_FONT = {
  fontFamily: '"Orbitron", monospace',
  fontSize: 96,
  fill: '#ffffff',
  fontWeight: '900' as const,
  letterSpacing: 4,
  dropShadow: {
    color: '#000000',
    blur: 6,
    distance: 2,
  },
};

const GO_FONT = {
  fontFamily: '"Orbitron", monospace',
  fontSize: 96,
  fill: '#44ff88',
  fontWeight: '900' as const,
  letterSpacing: 4,
  dropShadow: {
    color: '#000000',
    blur: 6,
    distance: 2,
  },
};

const LAP_FONT = {
  fontFamily: '"Orbitron", monospace',
  fontSize: 36,
  fill: '#ffffff',
  fontWeight: 'bold' as const,
} as const;

const LAP_BEST_FONT = {
  fontFamily: '"Exo 2", monospace',
  fontSize: 22,
  fill: '#44ff88',
  fontWeight: 'bold' as const,
} as const;

// Panel geometry
const PANEL_W         = 340;
const PANEL_H         = 380;
const PANEL_CHAMFER   = 8;
const PANEL_BORDER    = 1.5;
const BTN_W           = 270;
const BTN_H           = 46;
const BTN_CHAMFER     = 6;
const BTN_SPACING     = 10;
const BTN_LEFT_PAD    = 24;

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
  private pausePanelContainer!: Container;
  private pauseButtons: PauseButton[] = [];
  private soundToggleLabel!: Text;
  private soundToggleIcon!: Graphics;
  private pauseFocusIndex = 0;
  private pauseWasVisible = false;
  private pauseEntranceElapsed = 0;

  // Sound
  private soundManager: SoundManager | null = null;

  // Respawn fade — black fullscreen rect that fades in/out
  private respawnFade!: Graphics;

  // Lap complete overlay (center-screen, fades out)
  private lapCompleteContainer!: Container;
  private lapCompleteText!: Text;
  private lapCompleteBestText!: Text;
  private lapCompleteTimer = 0;

  constructor(private hudContainer: Container) {
    this.container = new Container();
    hudContainer.addChild(this.container);
    this.buildOverlays();
  }

  /** Connect the SoundManager for mute toggle. */
  setSoundManager(sm: SoundManager): void {
    this.soundManager = sm;
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

  // ──────────────────────────────────────────────────────
  // Pause Menu — motorsport-themed panel
  // ──────────────────────────────────────────────────────

  private buildPauseMenu(): void {
    this.pauseContainer = new Container();
    this.pauseContainer.visible = false;

    const cx = this.screenW / 2;
    const cy = this.screenH / 2;

    // Full-screen backdrop: dark navy with slight gradient feel
    const backdrop = new Graphics();
    backdrop.rect(0, 0, this.screenW, this.screenH).fill({ color: BASE_NAVY, alpha: 0.78 });
    this.pauseContainer.addChild(backdrop);

    // Subtle grid overlay on backdrop (matches main menu)
    const grid = new Graphics();
    const spacing = 60;
    for (let gx = 0; gx < this.screenW; gx += spacing) {
      grid.moveTo(gx, 0).lineTo(gx, this.screenH);
    }
    for (let gy = 0; gy < this.screenH; gy += spacing) {
      grid.moveTo(0, gy).lineTo(this.screenW, gy);
    }
    grid.stroke({ width: 1, color: 0xffffff, alpha: 0.015 });
    this.pauseContainer.addChild(grid);

    // Central panel container (for entrance animation)
    this.pausePanelContainer = new Container();
    this.pauseContainer.addChild(this.pausePanelContainer);

    const panelX = cx - PANEL_W / 2;
    const panelY = cy - PANEL_H / 2;

    // Panel shadow (offset dark rect behind)
    const panelShadow = new Graphics();
    this.drawChamferedRect(panelShadow, panelX + 3, panelY + 3, PANEL_W, PANEL_H, PANEL_CHAMFER, 0x000000, 0.35);
    this.pausePanelContainer.addChild(panelShadow);

    // Panel background
    const panelBg = new Graphics();
    this.drawChamferedRect(panelBg, panelX, panelY, PANEL_W, PANEL_H, PANEL_CHAMFER, BASE_NAVY, 0.97);
    this.pausePanelContainer.addChild(panelBg);

    // Inner panel gradient overlay (darker bottom half)
    const panelGrad = new Graphics();
    panelGrad.poly([
      panelX + PANEL_CHAMFER, panelY + PANEL_H * 0.5,
      panelX + PANEL_W - PANEL_CHAMFER, panelY + PANEL_H * 0.5,
      panelX + PANEL_W - PANEL_CHAMFER, panelY + PANEL_H,
      panelX + PANEL_CHAMFER, panelY + PANEL_H,
    ]).fill({ color: BASE_DARK, alpha: 0.3 });
    this.pausePanelContainer.addChild(panelGrad);

    // Panel border — orange accent
    const panelBorder = new Graphics();
    this.drawChamferedRectStroke(panelBorder, panelX, panelY, PANEL_W, PANEL_H, PANEL_CHAMFER, ACCENT_ORANGE, 0.35, PANEL_BORDER);
    this.pausePanelContainer.addChild(panelBorder);

    // Top accent bar (orange highlight across the panel top)
    const topBar = new Graphics();
    topBar.rect(panelX + PANEL_CHAMFER, panelY, PANEL_W - PANEL_CHAMFER * 2, 2.5).fill({ color: ACCENT_ORANGE, alpha: 0.85 });
    this.pausePanelContainer.addChild(topBar);

    // "PAUSED" title
    const title = new Text({
      text: 'PAUSED',
      style: {
        fontFamily: '"Orbitron", sans-serif',
        fontSize: 30,
        fill: TEXT_PRIMARY,
        fontWeight: '900',
        letterSpacing: 8,
      },
    });
    title.anchor.set(0.5);
    title.x = cx;
    title.y = panelY + 46;
    this.pausePanelContainer.addChild(title);

    // Diamond divider under title (matches main menu accent line)
    const divider = new Graphics();
    const divY = panelY + 74;
    const lineW = 90;
    const ds = 3.5;
    // Left line
    divider.moveTo(cx - lineW, divY).lineTo(cx - ds * 2.5, divY)
      .stroke({ width: 1, color: ACCENT_ORANGE, alpha: 0.45 });
    // Right line
    divider.moveTo(cx + ds * 2.5, divY).lineTo(cx + lineW, divY)
      .stroke({ width: 1, color: ACCENT_ORANGE, alpha: 0.45 });
    // Diamond pip
    divider.poly([cx, divY - ds, cx + ds, divY, cx, divY + ds, cx - ds, divY])
      .fill({ color: ACCENT_ORANGE, alpha: 0.7 });
    this.pausePanelContainer.addChild(divider);

    // Button stack
    const btnStartY = panelY + 104;
    this.pauseButtons = [];

    this.addPauseButton('RESUME', 'ESC', cx, btnStartY, 0);
    this.addPauseButton('RESTART', 'R', cx, btnStartY + (BTN_H + BTN_SPACING), 1);
    this.addSoundToggleButton(cx, btnStartY + (BTN_H + BTN_SPACING) * 2, 2);
    this.addPauseButton('QUIT', 'Q', cx, btnStartY + (BTN_H + BTN_SPACING) * 3, 3);

    // Bottom hint text
    const hint = new Text({
      text: '\u2191\u2193  NAVIGATE    \u23CE  SELECT',
      style: {
        fontFamily: '"Exo 2", sans-serif',
        fontSize: 10,
        fill: TEXT_SECONDARY,
        fontWeight: '300',
        letterSpacing: 2,
      },
    });
    hint.anchor.set(0.5);
    hint.x = cx;
    hint.y = panelY + PANEL_H - 22;
    hint.alpha = 0.4;
    this.pausePanelContainer.addChild(hint);

    this.container.addChild(this.pauseContainer);
  }

  private addPauseButton(label: string, key: string, cx: number, y: number, index: number): void {
    const btn = new Container();
    btn.x = cx;
    btn.y = y;

    // Background
    const bg = new Graphics();
    this.drawChamferedRect(bg, -BTN_W / 2, -BTN_H / 2, BTN_W, BTN_H, BTN_CHAMFER, BUTTON_BG, 0.9);
    btn.addChild(bg);

    // Left accent stripe
    const stripe = new Graphics();
    stripe.rect(-BTN_W / 2, -BTN_H / 2 + 4, 3, BTN_H - 8).fill({ color: ACCENT_ORANGE, alpha: 0.85 });
    btn.addChild(stripe);

    // Border
    const border = new Graphics();
    this.drawChamferedRectStroke(border, -BTN_W / 2, -BTN_H / 2, BTN_W, BTN_H, BTN_CHAMFER, TEXT_SECONDARY, 0.15, 1);
    btn.addChild(border);

    // Label text
    const text = new Text({
      text: label,
      style: {
        fontFamily: '"Orbitron", sans-serif',
        fontSize: 14,
        fill: TEXT_PRIMARY,
        fontWeight: '700',
        letterSpacing: 3,
      },
    });
    text.anchor.set(0, 0.5);
    text.x = -BTN_W / 2 + BTN_LEFT_PAD;
    text.y = 0;
    btn.addChild(text);

    // Key badge
    const keyBadgeW = key.length * 8 + 16;
    const keyBadgeX = BTN_W / 2 - 14 - keyBadgeW;

    const keyBadge = new Graphics();
    keyBadge.roundRect(keyBadgeX, -11, keyBadgeW, 22, 3)
      .fill({ color: BASE_DARK, alpha: 0.7 });
    keyBadge.roundRect(keyBadgeX, -11, keyBadgeW, 22, 3)
      .stroke({ width: 1, color: TEXT_SECONDARY, alpha: 0.18 });
    btn.addChild(keyBadge);

    const keyText = new Text({
      text: key,
      style: {
        fontFamily: '"Exo 2", sans-serif',
        fontSize: 11,
        fill: TEXT_SECONDARY,
        fontWeight: '500',
        letterSpacing: 1,
      },
    });
    keyText.anchor.set(0.5, 0.5);
    keyText.x = keyBadgeX + keyBadgeW / 2;
    keyText.y = 0;
    btn.addChild(keyText);

    // Interactivity
    btn.eventMode = 'static';
    btn.cursor = 'pointer';
    btn.hitArea = { contains: (hx: number, hy: number) => hx >= -BTN_W / 2 && hx <= BTN_W / 2 && hy >= -BTN_H / 2 && hy <= BTN_H / 2 };
    btn.on('pointerover', () => { this.pauseFocusIndex = index; this.updatePauseFocus(); });
    btn.on('pointerdown', () => { this.pressButton(index); });

    this.pauseButtons.push({ container: btn, bg, border, text, stripe, index });
    this.pausePanelContainer.addChild(btn);
  }

  private addSoundToggleButton(cx: number, y: number, index: number): void {
    const btn = new Container();
    btn.x = cx;
    btn.y = y;

    // Background
    const bg = new Graphics();
    this.drawChamferedRect(bg, -BTN_W / 2, -BTN_H / 2, BTN_W, BTN_H, BTN_CHAMFER, BUTTON_BG, 0.9);
    btn.addChild(bg);

    // Left stripe
    const stripe = new Graphics();
    stripe.rect(-BTN_W / 2, -BTN_H / 2 + 4, 3, BTN_H - 8).fill({ color: ACCENT_ORANGE, alpha: 0.85 });
    btn.addChild(stripe);

    // Border
    const border = new Graphics();
    this.drawChamferedRectStroke(border, -BTN_W / 2, -BTN_H / 2, BTN_W, BTN_H, BTN_CHAMFER, TEXT_SECONDARY, 0.15, 1);
    btn.addChild(border);

    // Label
    const text = new Text({
      text: 'SOUND',
      style: {
        fontFamily: '"Orbitron", sans-serif',
        fontSize: 14,
        fill: TEXT_PRIMARY,
        fontWeight: '700',
        letterSpacing: 3,
      },
    });
    text.anchor.set(0, 0.5);
    text.x = -BTN_W / 2 + BTN_LEFT_PAD;
    text.y = 0;
    btn.addChild(text);

    // Speaker icon
    this.soundToggleIcon = new Graphics();
    this.drawSpeakerIcon(this.soundToggleIcon, BTN_W / 2 - 50, 0, false);
    btn.addChild(this.soundToggleIcon);

    // ON / OFF status label
    this.soundToggleLabel = new Text({
      text: 'ON',
      style: {
        fontFamily: '"Exo 2", sans-serif',
        fontSize: 12,
        fill: STATUS_GREEN,
        fontWeight: '600',
        letterSpacing: 2,
      },
    });
    this.soundToggleLabel.anchor.set(1, 0.5);
    this.soundToggleLabel.x = BTN_W / 2 - 14;
    this.soundToggleLabel.y = 0;
    btn.addChild(this.soundToggleLabel);

    // Interactivity
    btn.eventMode = 'static';
    btn.cursor = 'pointer';
    btn.hitArea = { contains: (hx: number, hy: number) => hx >= -BTN_W / 2 && hx <= BTN_W / 2 && hy >= -BTN_H / 2 && hy <= BTN_H / 2 };
    btn.on('pointerover', () => { this.pauseFocusIndex = index; this.updatePauseFocus(); });
    btn.on('pointerdown', () => { this.pressButton(index); });

    this.pauseButtons.push({ container: btn, bg, border, text, stripe, index });
    this.pausePanelContainer.addChild(btn);
  }

  // ──────────────────────────────────────────────────────
  // Pause focus / hover rendering
  // ──────────────────────────────────────────────────────

  private updatePauseFocus(): void {
    for (const btn of this.pauseButtons) {
      const f = btn.index === this.pauseFocusIndex;

      btn.bg.clear();
      this.drawChamferedRect(
        btn.bg, -BTN_W / 2, -BTN_H / 2, BTN_W, BTN_H, BTN_CHAMFER,
        f ? BUTTON_HOVER : BUTTON_BG, f ? 0.95 : 0.9,
      );

      btn.border.clear();
      this.drawChamferedRectStroke(
        btn.border, -BTN_W / 2, -BTN_H / 2, BTN_W, BTN_H, BTN_CHAMFER,
        f ? ACCENT_ORANGE : TEXT_SECONDARY, f ? 0.65 : 0.15, f ? 1.5 : 1,
      );

      btn.stripe.clear();
      btn.stripe.rect(-BTN_W / 2, -BTN_H / 2 + 4, 3, BTN_H - 8).fill({
        color: ACCENT_ORANGE, alpha: f ? 1 : 0.85,
      });

      // Subtle 2px shift on focus (matches MainMenuScreen hover)
      btn.text.x = f ? -BTN_W / 2 + BTN_LEFT_PAD + 2 : -BTN_W / 2 + BTN_LEFT_PAD;
    }
  }

  // ──────────────────────────────────────────────────────
  // Sound toggle visuals
  // ──────────────────────────────────────────────────────

  private drawSpeakerIcon(g: Graphics, cx: number, cy: number, muted: boolean): void {
    g.clear();
    const color = muted ? STATUS_RED : STATUS_GREEN;

    // Speaker body
    g.rect(cx - 6, cy - 3.5, 4, 7).fill({ color, alpha: 0.9 });
    // Speaker cone
    g.poly([cx - 2, cy - 3.5, cx + 3, cy - 6, cx + 3, cy + 6, cx - 2, cy + 3.5])
      .fill({ color, alpha: 0.9 });

    if (muted) {
      // X mark
      g.moveTo(cx + 6, cy - 4).lineTo(cx + 12, cy + 4)
        .stroke({ width: 2, color: STATUS_RED, alpha: 0.9 });
      g.moveTo(cx + 12, cy - 4).lineTo(cx + 6, cy + 4)
        .stroke({ width: 2, color: STATUS_RED, alpha: 0.9 });
    } else {
      // Sound wave arcs
      g.arc(cx + 5, cy, 5, -Math.PI / 4, Math.PI / 4)
        .stroke({ width: 1.5, color, alpha: 0.7 });
      g.arc(cx + 5, cy, 9, -Math.PI / 4, Math.PI / 4)
        .stroke({ width: 1.5, color, alpha: 0.35 });
    }
  }

  private updateSoundToggleVisual(): void {
    const muted = this.soundManager?.muted ?? false;
    this.soundToggleLabel.text = muted ? 'OFF' : 'ON';
    this.soundToggleLabel.style.fill = muted ? STATUS_RED : STATUS_GREEN;
    this.drawSpeakerIcon(this.soundToggleIcon, BTN_W / 2 - 50, 0, muted);
  }

  // ──────────────────────────────────────────────────────
  // Button activation (keyboard Enter/Space + click)
  // ──────────────────────────────────────────────────────

  /** Handle keyboard navigation in the pause menu. */
  handlePauseInput(key: string): void {
    if (!this.pauseContainer.visible) return;

    if (key === 'ArrowUp' || key === 'ArrowLeft') {
      this.pauseFocusIndex = (this.pauseFocusIndex - 1 + this.pauseButtons.length) % this.pauseButtons.length;
      this.updatePauseFocus();
    } else if (key === 'ArrowDown' || key === 'ArrowRight') {
      this.pauseFocusIndex = (this.pauseFocusIndex + 1) % this.pauseButtons.length;
      this.updatePauseFocus();
    } else if (key === 'KeyM') {
      this.soundManager?.toggleMute();
      this.updateSoundToggleVisual();
    } else if (key === 'Enter' || key === 'Space') {
      this.pressButton(this.pauseFocusIndex);
    }
  }

  /** Activate a button with scale-bounce feedback, then fire its action. */
  private pressButton(index: number): void {
    const btn = this.pauseButtons[index];
    if (!btn) return;

    // Scale-bounce feedback (matches MainMenuScreen pointerdown)
    btn.container.scale.set(0.96);
    setTimeout(() => {
      btn.container.scale.set(1);
      this.activatePauseAction(index);
    }, 80);
  }

  /** Fire the action for a given button index. */
  private activatePauseAction(index: number): void {
    // 0=Resume(ESC), 1=Restart(R), 2=Sound(M), 3=Quit(Q)
    const keyMap: Record<number, string> = { 0: 'Escape', 1: 'KeyR', 2: 'KeyM', 3: 'KeyQ' };
    const code = keyMap[index];
    if (!code) return;

    if (code === 'KeyM') {
      this.soundManager?.toggleMute();
      this.updateSoundToggleVisual();
    } else {
      // Dispatch real keyboard event so GameLoop.buildSignals() picks it up
      window.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true }));
      requestAnimationFrame(() => {
        window.dispatchEvent(new KeyboardEvent('keyup', { code, bubbles: true }));
      });
    }
  }

  // ──────────────────────────────────────────────────────
  // Chamfered rect helpers (shared with MainMenuScreen)
  // ──────────────────────────────────────────────────────

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

  // ──────────────────────────────────────────────────────
  // Respawn fade + Lap complete
  // ──────────────────────────────────────────────────────

  private buildRespawnFade(): void {
    this.respawnFade = new Graphics();
    this.respawnFade.rect(0, 0, this.screenW, this.screenH).fill(0x000000);
    this.respawnFade.alpha = 0;
    this.respawnFade.visible = false;
    this.container.addChild(this.respawnFade);
  }

  private buildLapComplete(): void {
    this.lapCompleteContainer = new Container();
    this.lapCompleteContainer.visible = false;

    this.lapCompleteText = new Text({ text: 'Lap 2', style: LAP_FONT });
    this.lapCompleteText.anchor.set(0.5);
    this.lapCompleteText.x = this.screenW / 2;
    this.lapCompleteText.y = this.screenH / 2 - 20;
    this.lapCompleteContainer.addChild(this.lapCompleteText);

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

    if (race.countdownBeat > 0) {
      this.countdownText.text = String(race.countdownBeat);
      this.countdownText.style = { ...COUNTDOWN_FONT };
    } else {
      this.countdownText.text = 'GO!';
      this.countdownText.style = { ...GO_FONT };
    }

    const beatProgress = 1 - race.countdownTicksLeft / 60;
    const scale = 1.2 - beatProgress * 0.2;
    this.countdownText.scale.set(scale);
  }

  private updatePause(race: RaceState): void {
    const isPaused = race.phase === GamePhase.Paused;

    // Detect transition into pause
    if (isPaused && !this.pauseWasVisible) {
      this.pauseFocusIndex = 0;
      this.pauseEntranceElapsed = 0;
      this.updatePauseFocus();
      this.updateSoundToggleVisual();
    }

    this.pauseWasVisible = isPaused;
    this.pauseContainer.visible = isPaused;

    if (!isPaused) return;

    // Entrance animation: scale from 0.95 → 1 with ease-out cubic
    this.pauseEntranceElapsed += 1 / 60;
    const entranceT = Math.min(this.pauseEntranceElapsed / 0.2, 1);
    const ease = 1 - (1 - entranceT) ** 3;
    this.pausePanelContainer.alpha = ease;
    this.pausePanelContainer.scale.set(0.95 + 0.05 * ease);
    this.pausePanelContainer.pivot.set(this.screenW / 2, this.screenH / 2);
    this.pausePanelContainer.position.set(this.screenW / 2, this.screenH / 2);
  }

  private updateRespawnFade(race: RaceState): void {
    if (race.phase !== GamePhase.Respawning) {
      if (this.respawnFade.alpha > 0) {
        this.respawnFade.alpha -= 0.05;
        if (this.respawnFade.alpha <= 0) {
          this.respawnFade.visible = false;
          this.respawnFade.alpha = 0;
        }
      }
      return;
    }

    this.respawnFade.visible = true;
    const progress = 1 - race.respawnTicksLeft / 30;
    this.respawnFade.alpha = Math.min(1, progress * 2);
  }

  private updateLapComplete(prev: WorldState, curr: WorldState): void {
    if (curr.timing.lapComplete && !prev.timing.lapComplete) {
      const completedLap = curr.timing.currentLap - 1;
      const isNewBest = prev.timing.bestLapTicks <= 0 ||
        curr.timing.bestLapTicks < prev.timing.bestLapTicks;

      this.lapCompleteText.text = `Lap ${completedLap}`;
      this.lapCompleteBestText.visible = isNewBest;
      this.lapCompleteContainer.visible = true;
      this.lapCompleteContainer.alpha = 1.0;
      this.lapCompleteTimer = 90;
    }

    if (this.lapCompleteTimer > 0) {
      this.lapCompleteTimer--;
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

// ──────────────────────────────────────────────────────────
// Internal types
// ──────────────────────────────────────────────────────────

interface PauseButton {
  container: Container;
  bg: Graphics;
  border: Graphics;
  text: Text;
  stripe: Graphics;
  index: number;
}
