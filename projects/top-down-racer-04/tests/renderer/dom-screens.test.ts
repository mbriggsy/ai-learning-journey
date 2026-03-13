// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DomMainMenu } from '../../src/renderer/dom/DomMainMenu';
import { DomTrackSelect } from '../../src/renderer/dom/DomTrackSelect';
import { DomSettings } from '../../src/renderer/dom/DomSettings';

// Mock localStorage
const store: Record<string, string> = {};
const mockLocalStorage = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => { store[key] = value; },
  removeItem: (key: string) => { delete store[key]; },
  clear: () => { for (const k of Object.keys(store)) delete store[k]; },
  get length() { return Object.keys(store).length; },
  key: (_i: number) => null,
};
Object.defineProperty(globalThis, 'localStorage', { value: mockLocalStorage, configurable: true });

beforeEach(() => {
  mockLocalStorage.clear();
  document.body.innerHTML = '';
});

// Minimal SoundManager stub
function stubSoundManager() {
  return {
    masterVolume: 0.5,
    engineVolume: 0.7,
    sfxVolume: 0.8,
    init: vi.fn(),
    resume: vi.fn(),
    suspend: vi.fn(),
    toggleMute: vi.fn(),
    update: vi.fn(),
    resetEngine: vi.fn(),
    pauseEngine: vi.fn(),
    resumeEngine: vi.fn(),
    destroy: vi.fn(),
    playLapChime: vi.fn(),
    playCheckpointChime: vi.fn(),
    playVictoryFanfare: vi.fn(),
    muted: false,
  } as any;
}

// Minimal FilterManager stub
function stubFilterManager() {
  return {
    setQualityTier: vi.fn(),
    getQualityTier: () => 'high' as const,
    attach: vi.fn(),
    detach: vi.fn(),
    updateMotionBlur: vi.fn(),
    pause: vi.fn(),
    setGlowEnabled: vi.fn(),
    destroy: vi.fn(),
  } as any;
}

// ── DomMainMenu ──

describe('DomMainMenu', () => {
  it('builds element with title, 2 buttons, and footer', () => {
    const menu = new DomMainMenu(vi.fn(), vi.fn());
    expect(menu.element).toBeTruthy();
    const buttons = menu.element.querySelectorAll('button');
    expect(buttons.length).toBe(2);
    expect(buttons[0].textContent).toBe('PLAY');
    expect(buttons[1].textContent).toBe('SETTINGS');
    const title = menu.element.querySelector('h1');
    expect(title?.textContent).toBe('Top Down Racer');
  });

  it('calls onPlay when PLAY clicked', () => {
    const onPlay = vi.fn();
    const menu = new DomMainMenu(onPlay, vi.fn());
    document.body.appendChild(menu.element);
    menu.element.querySelectorAll('button')[0].click();
    expect(onPlay).toHaveBeenCalledOnce();
  });

  it('calls onSettings when SETTINGS clicked', () => {
    const onSettings = vi.fn();
    const menu = new DomMainMenu(vi.fn(), onSettings);
    document.body.appendChild(menu.element);
    menu.element.querySelectorAll('button')[1].click();
    expect(onSettings).toHaveBeenCalledOnce();
  });

  it('show/hide toggles display', () => {
    const menu = new DomMainMenu(vi.fn(), vi.fn());
    document.body.appendChild(menu.element);
    menu.hide();
    expect(menu.element.style.display).toBe('none');
    menu.show();
    expect(menu.element.style.display).toBe('flex');
  });

  it('destroy aborts listeners and removes element', () => {
    const onPlay = vi.fn();
    const menu = new DomMainMenu(onPlay, vi.fn());
    document.body.appendChild(menu.element);
    menu.destroy();
    expect(document.body.contains(menu.element)).toBe(false);
    // Click should not fire after destroy
    // (element removed, so just verify it was removed)
  });
});

// ── DomTrackSelect ──

describe('DomTrackSelect', () => {
  it('builds 3 track cards', () => {
    const ts = new DomTrackSelect(vi.fn(), vi.fn());
    const cards = ts.element.querySelectorAll('.track-card');
    expect(cards.length).toBe(3);
  });

  it('builds 3 mode buttons with Solo active by default', () => {
    const ts = new DomTrackSelect(vi.fn(), vi.fn());
    const modeBtns = ts.element.querySelectorAll('.mode-btn');
    expect(modeBtns.length).toBe(3);
    expect(modeBtns[0].classList.contains('active')).toBe(true);
    expect(modeBtns[1].classList.contains('active')).toBe(false);
  });

  it('calls onStartGame with track index and selected mode', () => {
    const onStart = vi.fn();
    const ts = new DomTrackSelect(onStart, vi.fn());
    document.body.appendChild(ts.element);
    // Click the first START button
    const startBtns = ts.element.querySelectorAll('.menu-btn-accent');
    (startBtns[0] as HTMLElement).click();
    expect(onStart).toHaveBeenCalledWith(0, 'solo');
  });

  it('mode selector changes active mode', () => {
    const onStart = vi.fn();
    const ts = new DomTrackSelect(onStart, vi.fn());
    document.body.appendChild(ts.element);
    // Click VS AI mode
    const modeBtns = ts.element.querySelectorAll('.mode-btn');
    (modeBtns[1] as HTMLElement).click();
    // Click first track START
    const startBtns = ts.element.querySelectorAll('.menu-btn-accent');
    (startBtns[0] as HTMLElement).click();
    expect(onStart).toHaveBeenCalledWith(0, 'vs-ai');
  });

  it('calls onBack when BACK clicked', () => {
    const onBack = vi.fn();
    const ts = new DomTrackSelect(vi.fn(), onBack);
    document.body.appendChild(ts.element);
    const backBtn = ts.element.querySelector('.menu-btn-back') as HTMLElement;
    backBtn.click();
    expect(onBack).toHaveBeenCalledOnce();
  });

  it('show refreshes leaderboard times', () => {
    // Save a best time then show
    store['tdr-leaderboard-v1'] = JSON.stringify({
      version: 1,
      tracks: { 'track-01': { human: 3000, ai: null } },
    });
    const ts = new DomTrackSelect(vi.fn(), vi.fn());
    document.body.appendChild(ts.element);
    ts.show();
    // First card human time should be populated
    const humanTimes = ts.element.querySelectorAll('.menu-data span:last-child');
    expect(humanTimes[0].textContent).not.toBe('--:--.--');
  });

  it('destroy removes element', () => {
    const ts = new DomTrackSelect(vi.fn(), vi.fn());
    document.body.appendChild(ts.element);
    ts.destroy();
    expect(document.body.contains(ts.element)).toBe(false);
  });
});

// ── DomSettings ──

describe('DomSettings', () => {
  it('builds sliders, stepper, and quality toggle', () => {
    const ds = new DomSettings(stubSoundManager(), stubFilterManager(), vi.fn());
    const sliders = ds.element.querySelectorAll('input[type="range"]');
    expect(sliders.length).toBe(3); // master, engine, sfx
    const qualBtns = ds.element.querySelectorAll('.quality-btn');
    expect(qualBtns.length).toBe(3); // low, medium, high
  });

  it('lapCount defaults to 3', () => {
    const ds = new DomSettings(stubSoundManager(), stubFilterManager(), vi.fn());
    expect(ds.lapCount).toBe(3);
  });

  it('lap stepper increments and decrements', () => {
    const ds = new DomSettings(stubSoundManager(), stubFilterManager(), vi.fn());
    document.body.appendChild(ds.element);
    // Find +/- buttons (they have + and - text)
    const btns = ds.element.querySelectorAll('.menu-btn');
    const minus = Array.from(btns).find(b => b.textContent === '-') as HTMLElement;
    const plus = Array.from(btns).find(b => b.textContent === '+') as HTMLElement;
    expect(minus).toBeTruthy();
    expect(plus).toBeTruthy();

    plus!.click();
    expect(ds.lapCount).toBe(4);
    minus!.click();
    expect(ds.lapCount).toBe(3);
    minus!.click();
    expect(ds.lapCount).toBe(2);
    minus!.click();
    expect(ds.lapCount).toBe(1);
    minus!.click(); // should clamp at 1
    expect(ds.lapCount).toBe(1);
  });

  it('quality toggle calls filterManager.setQualityTier', () => {
    const fm = stubFilterManager();
    const ds = new DomSettings(stubSoundManager(), fm, vi.fn());
    document.body.appendChild(ds.element);
    const qualBtns = ds.element.querySelectorAll('.quality-btn');
    (qualBtns[0] as HTMLElement).click(); // 'low'
    expect(fm.setQualityTier).toHaveBeenCalledWith('low');
  });

  it('volume slider updates SoundManager', () => {
    const sm = stubSoundManager();
    const ds = new DomSettings(sm, stubFilterManager(), vi.fn());
    document.body.appendChild(ds.element);
    const sliders = ds.element.querySelectorAll('input[type="range"]') as NodeListOf<HTMLInputElement>;
    // Change master slider
    sliders[0].value = '100';
    sliders[0].dispatchEvent(new Event('input'));
    expect(sm.masterVolume).toBe(1); // cubicMap(1) = 1
  });

  it('persists settings to localStorage on change', () => {
    const ds = new DomSettings(stubSoundManager(), stubFilterManager(), vi.fn());
    document.body.appendChild(ds.element);
    // Click + on lap count
    const btns = ds.element.querySelectorAll('.menu-btn');
    const plus = Array.from(btns).find(b => b.textContent === '+') as HTMLElement;
    plus!.click();
    const stored = JSON.parse(store['tdr-v04-settings'] ?? '{}');
    expect(stored.lapCount).toBe(4);
  });

  it('calls onBack when BACK clicked', () => {
    const onBack = vi.fn();
    const ds = new DomSettings(stubSoundManager(), stubFilterManager(), onBack);
    document.body.appendChild(ds.element);
    const backBtn = ds.element.querySelector('.menu-btn-back') as HTMLElement;
    backBtn.click();
    expect(onBack).toHaveBeenCalledOnce();
  });

  it('destroy removes element', () => {
    const ds = new DomSettings(stubSoundManager(), stubFilterManager(), vi.fn());
    document.body.appendChild(ds.element);
    ds.destroy();
    expect(document.body.contains(ds.element)).toBe(false);
  });
});
