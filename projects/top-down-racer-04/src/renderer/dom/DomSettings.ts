/**
 * DomSettings — DOM-based settings screen.
 *
 * Fix #15: No DomOverlay wrapper.
 * Fix #16: No DomScreen interface.
 * Fix #17: No test tone — users hear volume changes in-game.
 * Fix #24: Custom slider styling via CSS .menu-slider class.
 * Fix #25: AbortController for cleanup.
 * Fix #26: Focus management on show().
 * Fix #30: Uses shared DEFAULT_SETTINGS constant from Settings module.
 */

import type { GameSettings, QualityTier } from '../Settings';
import { loadSettings, saveSettings } from '../Settings';
import type { SoundManager } from '../SoundManager';
import type { FilterManager } from '../FilterManager';

/** Cubic volume mapping for perceptually-linear sliders. */
function cubicMap(linear: number): number {
  return linear * linear * linear;
}

/** Inverse cubic mapping for slider display. */
function cubicUnmap(vol: number): number {
  return Math.cbrt(vol);
}

export class DomSettings {
  readonly element: HTMLElement;
  private ac = new AbortController();
  private settings: GameSettings;

  // Slider value display elements (for live updates)
  private masterValueEl!: HTMLElement;
  private engineValueEl!: HTMLElement;
  private sfxValueEl!: HTMLElement;
  private lapCountEl!: HTMLElement;
  private qualityButtons: HTMLButtonElement[] = [];

  constructor(
    private soundManager: SoundManager,
    private filterManager: FilterManager,
    private onBack: () => void,
  ) {
    this.settings = loadSettings();
    this.element = this.build();
  }

  private build(): HTMLElement {
    const root = document.createElement('div');
    root.style.cssText = `
      display: flex; flex-direction: column; align-items: center;
      width: 100%; height: 100%; padding: 40px 20px; position: relative;
      overflow-y: auto; gap: 24px;
    `;

    // Header
    const header = document.createElement('div');
    header.style.cssText = `
      display: flex; align-items: center; justify-content: center;
      width: 100%; max-width: 500px; position: relative; margin-bottom: 8px;
    `;

    const backBtn = document.createElement('button');
    backBtn.className = 'menu-btn-back fade-slide-up';
    backBtn.textContent = 'BACK';
    backBtn.style.cssText += 'position: absolute; left: 0;';
    backBtn.addEventListener('click', () => this.onBack(), { signal: this.ac.signal });
    header.appendChild(backBtn);

    const title = document.createElement('h2');
    title.className = 'menu-section-title fade-slide-up';
    title.style.animationDelay = '0.04s';
    title.textContent = 'Settings';
    header.appendChild(title);

    root.appendChild(header);

    // Volume sliders
    const masterRow = this.buildSlider('Master Volume', cubicUnmap(this.settings.masterVolume), (linear) => {
      this.settings.masterVolume = cubicMap(linear);
      this.soundManager.masterVolume = this.settings.masterVolume;
      this.persist();
    });
    this.masterValueEl = masterRow.valueEl;
    masterRow.row.style.animationDelay = '0.08s';
    root.appendChild(masterRow.row);

    const engineRow = this.buildSlider('Engine Volume', cubicUnmap(this.settings.engineVolume), (linear) => {
      this.settings.engineVolume = cubicMap(linear);
      this.soundManager.engineVolume = this.settings.engineVolume;
      this.persist();
    });
    this.engineValueEl = engineRow.valueEl;
    engineRow.row.style.animationDelay = '0.12s';
    root.appendChild(engineRow.row);

    const sfxRow = this.buildSlider('SFX Volume', cubicUnmap(this.settings.sfxVolume), (linear) => {
      this.settings.sfxVolume = cubicMap(linear);
      this.soundManager.sfxVolume = this.settings.sfxVolume;
      this.persist();
    });
    this.sfxValueEl = sfxRow.valueEl;
    sfxRow.row.style.animationDelay = '0.16s';
    root.appendChild(sfxRow.row);

    // Lap count stepper
    const lapRow = this.buildLapStepper();
    lapRow.style.animationDelay = '0.20s';
    root.appendChild(lapRow);

    // Graphics quality toggle
    const qualityRow = this.buildQualityToggle();
    qualityRow.style.animationDelay = '0.24s';
    root.appendChild(qualityRow);

    return root;
  }

  private buildSlider(
    label: string,
    initialLinear: number,
    onChange: (linear: number) => void,
  ): { row: HTMLElement; valueEl: HTMLElement } {
    const row = document.createElement('div');
    row.className = 'settings-row fade-slide-up';

    const labelEl = document.createElement('span');
    labelEl.className = 'settings-label';
    labelEl.textContent = label;

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = '0';
    slider.max = '100';
    slider.value = String(Math.round(initialLinear * 100));
    slider.className = 'menu-slider';
    slider.style.flex = '1';

    const valueEl = document.createElement('span');
    valueEl.className = 'settings-value';
    valueEl.textContent = `${Math.round(initialLinear * 100)}%`;

    // Update filled track background via JS gradient (Fix #24)
    const updateSliderFill = (pct: number) => {
      slider.style.background = `linear-gradient(to right, var(--accent, #00d4ff) 0%, var(--accent, #00d4ff) ${pct}%, #2a2a4a ${pct}%, #2a2a4a 100%)`;
    };
    updateSliderFill(initialLinear * 100);

    slider.addEventListener('input', () => {
      const linear = slider.valueAsNumber / 100;
      valueEl.textContent = `${Math.round(linear * 100)}%`;
      updateSliderFill(linear * 100);
      onChange(linear);
    }, { signal: this.ac.signal });

    row.append(labelEl, slider, valueEl);
    return { row, valueEl };
  }

  private buildLapStepper(): HTMLElement {
    const row = document.createElement('div');
    row.className = 'settings-row fade-slide-up';

    const labelEl = document.createElement('span');
    labelEl.className = 'settings-label';
    labelEl.textContent = 'Lap Count';

    const controls = document.createElement('div');
    controls.style.cssText = 'display: flex; align-items: center; gap: 12px;';

    const minusBtn = document.createElement('button');
    minusBtn.className = 'menu-btn';
    minusBtn.style.cssText = 'padding: 4px 14px; min-width: auto; font-size: 18px;';
    minusBtn.textContent = '-';

    this.lapCountEl = document.createElement('span');
    this.lapCountEl.className = 'settings-value';
    this.lapCountEl.style.minWidth = '30px';
    this.lapCountEl.style.textAlign = 'center';
    this.lapCountEl.textContent = String(this.settings.lapCount);

    const plusBtn = document.createElement('button');
    plusBtn.className = 'menu-btn';
    plusBtn.style.cssText = 'padding: 4px 14px; min-width: auto; font-size: 18px;';
    plusBtn.textContent = '+';

    minusBtn.addEventListener('click', () => {
      if (this.settings.lapCount > 1) {
        this.settings.lapCount--;
        this.lapCountEl.textContent = String(this.settings.lapCount);
        this.persist();
      }
    }, { signal: this.ac.signal });

    plusBtn.addEventListener('click', () => {
      if (this.settings.lapCount < 99) {
        this.settings.lapCount++;
        this.lapCountEl.textContent = String(this.settings.lapCount);
        this.persist();
      }
    }, { signal: this.ac.signal });

    controls.append(minusBtn, this.lapCountEl, plusBtn);
    row.append(labelEl, controls);
    return row;
  }

  private buildQualityToggle(): HTMLElement {
    const row = document.createElement('div');
    row.className = 'settings-row fade-slide-up';

    const labelEl = document.createElement('span');
    labelEl.className = 'settings-label';
    labelEl.textContent = 'Graphics';

    const btnsContainer = document.createElement('div');
    btnsContainer.style.cssText = 'display: flex; gap: 6px;';

    const tiers: QualityTier[] = ['low', 'medium', 'high'];
    for (const tier of tiers) {
      const btn = document.createElement('button');
      btn.className = 'quality-btn';
      btn.textContent = tier.charAt(0).toUpperCase() + tier.slice(1);
      if (tier === this.settings.graphicsQuality) btn.classList.add('active');

      btn.addEventListener('click', () => {
        this.settings.graphicsQuality = tier;
        this.filterManager.setQualityTier(tier);
        this.updateQualityButtons();
        this.persist();
      }, { signal: this.ac.signal });

      btnsContainer.appendChild(btn);
      this.qualityButtons.push(btn);
    }

    row.append(labelEl, btnsContainer);
    return row;
  }

  private updateQualityButtons(): void {
    const tiers: QualityTier[] = ['low', 'medium', 'high'];
    for (let i = 0; i < this.qualityButtons.length; i++) {
      if (tiers[i] === this.settings.graphicsQuality) {
        this.qualityButtons[i].classList.add('active');
      } else {
        this.qualityButtons[i].classList.remove('active');
      }
    }
  }

  private persist(): void {
    saveSettings(this.settings);
  }

  /** Get current lap count setting for game start. */
  get lapCount(): number {
    return this.settings.lapCount;
  }

  /** Get current settings snapshot. */
  getSettings(): Readonly<GameSettings> {
    return { ...this.settings };
  }

  show(): void {
    this.element.style.display = 'flex';
    // Re-read settings in case they were changed externally
    this.settings = loadSettings();
    // Focus back button (Fix #26)
    const backBtn = this.element.querySelector('.menu-btn-back') as HTMLElement | null;
    if (backBtn) backBtn.focus();
  }

  hide(): void {
    this.element.style.display = 'none';
  }

  destroy(): void {
    this.ac.abort();
    this.element.remove();
  }
}
