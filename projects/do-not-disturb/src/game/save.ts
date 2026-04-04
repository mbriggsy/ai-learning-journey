// Sentinel: highestNightCompleted = 0 means no nights completed (insight 009: persisted value, not Infinity)
export type SaveData = {
  readonly highestNightCompleted: number; // 0-5
  readonly version: number;
};

const SAVE_KEY = 'dnd-save';
const CURRENT_VERSION = 1;

const DEFAULT_SAVE: SaveData = {
  highestNightCompleted: 0,
  version: CURRENT_VERSION,
};

export type Storage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

export function saveTo(storage: Storage, data: SaveData): void {
  storage.setItem(SAVE_KEY, JSON.stringify(data));
}

export function loadFrom(storage: Storage): SaveData {
  const raw = storage.getItem(SAVE_KEY);
  if (!raw) return { ...DEFAULT_SAVE };

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const night = typeof parsed['highestNightCompleted'] === 'number'
      ? parsed['highestNightCompleted'] as number : 0;
    const version = typeof parsed['version'] === 'number'
      ? parsed['version'] as number : CURRENT_VERSION;
    return { highestNightCompleted: Math.max(0, Math.min(5, night)), version };
  } catch {
    return { ...DEFAULT_SAVE };
  }
}

export function clearSave(storage: Storage): void {
  storage.removeItem(SAVE_KEY);
}

export function updateHighestNight(storage: Storage, completedNight: number): void {
  if (!Number.isFinite(completedNight)) return; // insight 009: Infinity kills JSON
  const clamped = Math.max(0, Math.min(5, completedNight));
  const current = loadFrom(storage);
  if (clamped > current.highestNightCompleted) {
    saveTo(storage, { ...current, highestNightCompleted: clamped });
  }
}
