import { describe, it, expect, beforeEach } from 'vitest';
import { loadSettings, saveSettings, DEFAULT_SETTINGS, type GameSettings } from '../../src/renderer/Settings';

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

Object.defineProperty(globalThis, 'localStorage', { value: mockLocalStorage });

beforeEach(() => {
  mockLocalStorage.clear();
});

describe('Settings', () => {
  describe('loadSettings', () => {
    it('returns defaults when no stored data', () => {
      expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
    });

    it('returns defaults on corrupt JSON', () => {
      store['tdr-v04-settings'] = '{broken';
      expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
    });

    it('returns defaults on non-object stored value', () => {
      store['tdr-v04-settings'] = '"hello"';
      expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
    });

    it('returns defaults on array stored value', () => {
      store['tdr-v04-settings'] = '[1,2,3]';
      expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
    });

    it('loads valid stored settings', () => {
      const saved: GameSettings = {
        masterVolume: 0.8,
        sfxVolume: 0.6,
        engineVolume: 0.9,
        lapCount: 5,
        graphicsQuality: 'medium',
      };
      store['tdr-v04-settings'] = JSON.stringify(saved);
      expect(loadSettings()).toEqual(saved);
    });

    it('clamps out-of-range volume to 0-1', () => {
      store['tdr-v04-settings'] = JSON.stringify({ masterVolume: 2.5, sfxVolume: -1 });
      const result = loadSettings();
      expect(result.masterVolume).toBe(1);
      expect(result.sfxVolume).toBe(0);
    });

    it('clamps lapCount to 1-99', () => {
      store['tdr-v04-settings'] = JSON.stringify({ lapCount: 200 });
      expect(loadSettings().lapCount).toBe(99);

      store['tdr-v04-settings'] = JSON.stringify({ lapCount: 0 });
      expect(loadSettings().lapCount).toBe(1);
    });

    it('rejects non-integer lapCount', () => {
      store['tdr-v04-settings'] = JSON.stringify({ lapCount: 3.5 });
      expect(loadSettings().lapCount).toBe(DEFAULT_SETTINGS.lapCount);
    });

    it('rejects invalid graphicsQuality string', () => {
      store['tdr-v04-settings'] = JSON.stringify({ graphicsQuality: 'ultra' });
      expect(loadSettings().graphicsQuality).toBe(DEFAULT_SETTINGS.graphicsQuality);
    });

    it('uses defaults for missing fields (per-field, not spread)', () => {
      store['tdr-v04-settings'] = JSON.stringify({ masterVolume: 0.3 });
      const result = loadSettings();
      expect(result.masterVolume).toBe(0.3);
      expect(result.sfxVolume).toBe(DEFAULT_SETTINGS.sfxVolume);
      expect(result.engineVolume).toBe(DEFAULT_SETTINGS.engineVolume);
      expect(result.lapCount).toBe(DEFAULT_SETTINGS.lapCount);
      expect(result.graphicsQuality).toBe(DEFAULT_SETTINGS.graphicsQuality);
    });

    it('rejects wrong-type fields and uses defaults', () => {
      store['tdr-v04-settings'] = JSON.stringify({
        masterVolume: 'loud',
        lapCount: 'many',
        graphicsQuality: 42,
      });
      const result = loadSettings();
      expect(result.masterVolume).toBe(DEFAULT_SETTINGS.masterVolume);
      expect(result.lapCount).toBe(DEFAULT_SETTINGS.lapCount);
      expect(result.graphicsQuality).toBe(DEFAULT_SETTINGS.graphicsQuality);
    });
  });

  describe('saveSettings', () => {
    it('persists settings to localStorage', () => {
      const settings: GameSettings = {
        masterVolume: 0.7,
        sfxVolume: 0.9,
        engineVolume: 0.5,
        lapCount: 10,
        graphicsQuality: 'low',
      };
      saveSettings(settings);
      expect(JSON.parse(store['tdr-v04-settings'])).toEqual(settings);
    });

    it('round-trips through loadSettings', () => {
      const settings: GameSettings = {
        masterVolume: 0.33,
        sfxVolume: 0.66,
        engineVolume: 0.99,
        lapCount: 7,
        graphicsQuality: 'medium',
      };
      saveSettings(settings);
      expect(loadSettings()).toEqual(settings);
    });
  });
});
