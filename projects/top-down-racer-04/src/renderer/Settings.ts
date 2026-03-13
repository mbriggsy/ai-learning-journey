/**
 * Settings — typed game settings with localStorage persistence.
 *
 * Fix #1:  Per-field typeof guards + range clamping (not spread).
 * Fix #30: Single DEFAULT_SETTINGS constant shared across modules.
 *
 * Storage key: 'tdr-v04-settings' (separate from v02).
 */

export type QualityTier = 'low' | 'medium' | 'high';

export interface GameSettings {
  masterVolume: number;    // 0-1, default 0.5
  sfxVolume: number;       // 0-1, default 0.8
  engineVolume: number;    // 0-1, default 0.7
  lapCount: number;        // 1-99, default 3
  graphicsQuality: QualityTier;
}

export const DEFAULT_SETTINGS: Readonly<GameSettings> = {
  masterVolume: 0.5,
  sfxVolume: 0.8,
  engineVolume: 0.7,
  lapCount: 3,
  graphicsQuality: 'high',
};

const SETTINGS_KEY = 'tdr-v04-settings';

const VALID_QUALITIES: readonly QualityTier[] = ['low', 'medium', 'high'];

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/**
 * Load settings from localStorage with per-field validation.
 * Invalid or missing fields fall back to defaults.
 */
export function loadSettings(): GameSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };

    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return { ...DEFAULT_SETTINGS };
    }

    const obj = parsed as Record<string, unknown>;

    return {
      masterVolume: typeof obj.masterVolume === 'number'
        ? clamp(obj.masterVolume, 0, 1)
        : DEFAULT_SETTINGS.masterVolume,

      sfxVolume: typeof obj.sfxVolume === 'number'
        ? clamp(obj.sfxVolume, 0, 1)
        : DEFAULT_SETTINGS.sfxVolume,

      engineVolume: typeof obj.engineVolume === 'number'
        ? clamp(obj.engineVolume, 0, 1)
        : DEFAULT_SETTINGS.engineVolume,

      lapCount: typeof obj.lapCount === 'number' && Number.isInteger(obj.lapCount)
        ? clamp(obj.lapCount, 1, 99)
        : DEFAULT_SETTINGS.lapCount,

      graphicsQuality: typeof obj.graphicsQuality === 'string' && VALID_QUALITIES.includes(obj.graphicsQuality as QualityTier)
        ? obj.graphicsQuality as QualityTier
        : DEFAULT_SETTINGS.graphicsQuality,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

/** Save settings to localStorage. Fails silently on quota/security errors. */
export function saveSettings(settings: GameSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // QuotaExceededError, SecurityError — fail silently
  }
}
