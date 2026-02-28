import { Container, Graphics, Text } from 'pixi.js';
import type { SoundManager } from '../SoundManager';

const SETTINGS_KEY = 'tdr-settings';

const TITLE_STYLE = {
  fontFamily: 'monospace',
  fontSize: 36,
  fill: '#ffffff',
  fontWeight: 'bold' as const,
  letterSpacing: 3,
};

const LABEL_STYLE = {
  fontFamily: 'monospace',
  fontSize: 18,
  fill: '#cccccc',
};

const VALUE_STYLE = {
  fontFamily: 'monospace',
  fontSize: 16,
  fill: '#44aaff',
};

const BACK_STYLE = {
  fontFamily: 'monospace',
  fontSize: 16,
  fill: '#888888',
};

// Cubic volume mapping for perceptually-linear sliders
function sliderToVolume(pos: number): number { return pos * pos * pos; }
function volumeToSlider(vol: number): number { return Math.cbrt(vol); }

interface SavedSettings {
  master: number;
  sfx: number;
}

function loadSettings(): SavedSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { master: 0.79, sfx: 0.93 }; // cbrt defaults for 0.5 and 0.8
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return { master: 0.79, sfx: 0.93 };
    return {
      master: typeof parsed.master === 'number' ? parsed.master : 0.79,
      sfx: typeof parsed.sfx === 'number' ? parsed.sfx : 0.93,
    };
  } catch {
    return { master: 0.79, sfx: 0.93 };
  }
}

function saveSettings(settings: SavedSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // fail silently
  }
}

export class SettingsScreen {
  readonly container = new Container();
  onBack: (() => void) | null = null;

  private soundManager: SoundManager | null = null;
  private masterSliderPos = 0.79;
  private sfxSliderPos = 0.93;

  constructor() {
    const saved = loadSettings();
    this.masterSliderPos = saved.master;
    this.sfxSliderPos = saved.sfx;
    this.build();
  }

  /** Connect to the SoundManager to apply volume changes. */
  setSoundManager(sm: SoundManager): void {
    this.soundManager = sm;
    // Apply saved settings immediately
    sm.masterVolume = sliderToVolume(this.masterSliderPos);
    sm.sfxVolume = sliderToVolume(this.sfxSliderPos);
  }

  private build(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;

    // Dark background
    const bg = new Graphics();
    bg.rect(0, 0, w, h).fill(0x0a0a0a);
    this.container.addChild(bg);

    // Title
    const title = new Text({ text: 'SETTINGS', style: TITLE_STYLE });
    title.anchor.set(0.5);
    title.x = w / 2;
    title.y = 80;
    this.container.addChild(title);

    // Sliders
    const sliderW = 300;
    const sliderX = w / 2 - sliderW / 2;
    const masterY = h * 0.38;
    const sfxY = h * 0.55;

    this.buildSlider('Master Volume', sliderX, masterY, sliderW, this.masterSliderPos, (pos) => {
      this.masterSliderPos = pos;
      if (this.soundManager) this.soundManager.masterVolume = sliderToVolume(pos);
      saveSettings({ master: this.masterSliderPos, sfx: this.sfxSliderPos });
    });

    this.buildSlider('SFX Volume', sliderX, sfxY, sliderW, this.sfxSliderPos, (pos) => {
      this.sfxSliderPos = pos;
      if (this.soundManager) this.soundManager.sfxVolume = sliderToVolume(pos);
      saveSettings({ master: this.masterSliderPos, sfx: this.sfxSliderPos });
    });

    // Back button
    const back = new Text({ text: '< BACK', style: BACK_STYLE });
    back.anchor.set(0.5);
    back.x = w / 2;
    back.y = h - 60;
    back.eventMode = 'static';
    back.cursor = 'pointer';
    back.on('pointerover', () => { back.style.fill = '#ffffff'; });
    back.on('pointerout', () => { back.style.fill = '#888888'; });
    back.on('pointerdown', () => this.onBack?.());
    this.container.addChild(back);
  }

  private buildSlider(
    label: string,
    x: number,
    y: number,
    width: number,
    initialPos: number,
    onChange: (pos: number) => void,
  ): void {
    // Label
    const labelText = new Text({ text: label, style: LABEL_STYLE });
    labelText.x = x;
    labelText.y = y - 28;
    this.container.addChild(labelText);

    // Value text
    const valueText = new Text({ text: `${Math.round(initialPos * 100)}%`, style: VALUE_STYLE });
    valueText.x = x + width + 14;
    valueText.y = y - 4;
    this.container.addChild(valueText);

    // Track background
    const trackH = 8;
    const trackBg = new Graphics();
    trackBg.roundRect(x, y, width, trackH, 4).fill(0x333333);
    this.container.addChild(trackBg);

    // Track fill
    const trackFill = new Graphics();
    const fillW = width * initialPos;
    trackFill.roundRect(x, y, fillW, trackH, 4).fill(0x44aaff);
    this.container.addChild(trackFill);

    // Thumb
    const thumbRadius = 12;
    const thumb = new Graphics();
    thumb.circle(0, 0, thumbRadius).fill(0x44aaff);
    thumb.x = x + width * initialPos;
    thumb.y = y + trackH / 2;
    thumb.eventMode = 'static';
    thumb.cursor = 'pointer';
    this.container.addChild(thumb);

    // Also make the track clickable
    const hitArea = new Graphics();
    hitArea.rect(x - 10, y - thumbRadius, width + 20, thumbRadius * 2 + trackH).fill({ color: 0x000000, alpha: 0.001 });
    hitArea.eventMode = 'static';
    hitArea.cursor = 'pointer';
    this.container.addChild(hitArea);

    let dragging = false;

    const updateFromX = (globalX: number) => {
      const pos = Math.max(0, Math.min(1, (globalX - x) / width));
      thumb.x = x + width * pos;
      trackFill.clear();
      trackFill.roundRect(x, y, width * pos, trackH, 4).fill(0x44aaff);
      valueText.text = `${Math.round(pos * 100)}%`;
      onChange(pos);
    };

    thumb.on('pointerdown', () => { dragging = true; });
    hitArea.on('pointerdown', (e) => {
      dragging = true;
      updateFromX(e.global.x);
    });

    // Use globalpointermove to prevent stuck slider (RI-05)
    thumb.on('globalpointermove', (e) => {
      if (!dragging) return;
      updateFromX(e.global.x);
    });

    // Release drag on any mouse/touch up anywhere on the page
    window.addEventListener('pointerup', () => { dragging = false; });
  }

  show(): void { this.container.visible = true; }
  hide(): void { this.container.visible = false; }
}
