const STORAGE_KEY = 'tdr-best-times';

interface BestTimesData {
  [trackId: string]: number;
}

function load(): BestTimesData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {};
    const result: BestTimesData = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v === 'number' && v > 0) result[k] = v;
    }
    return result;
  } catch {
    return {};
  }
}

function save(data: BestTimesData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // localStorage full or unavailable — fail silently
  }
}

export function getBestTime(trackId: string): number | null {
  const data = load();
  return data[trackId] ?? null;
}

export function setBestTime(trackId: string, ticks: number): boolean {
  const data = load();
  const current = data[trackId];
  if (current === undefined || ticks < current) {
    data[trackId] = ticks;
    save(data);
    return true;
  }
  return false;
}

export function formatTime(ticks: number): string {
  const totalSeconds = ticks / 60;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes > 0) {
    return `${minutes}:${seconds.toFixed(2).padStart(5, '0')}`;
  }
  return seconds.toFixed(2) + 's';
}
