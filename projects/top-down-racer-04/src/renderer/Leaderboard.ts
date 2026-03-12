/**
 * Leaderboard — localStorage-backed per-track best times for human and AI.
 *
 * Storage key: 'tdr-leaderboard-v1' (separate from legacy 'tdr-best-times').
 * Schema: { version: 1, tracks: { [trackId]: { human: number|null, ai: number|null } } }
 *
 * All public functions are safe to call when localStorage is unavailable,
 * quota-exceeded, or contains corrupt data — they degrade gracefully.
 */

const LEADERBOARD_KEY = 'tdr-leaderboard-v1';

export interface TrackBests {
  human: number | null;
  ai: number | null;
}

interface LeaderboardData {
  version: 1;
  tracks: Record<string, TrackBests>;
}

function empty(): LeaderboardData {
  return { version: 1, tracks: {} };
}

function isValidTicks(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v > 0;
}

function load(): LeaderboardData {
  try {
    const raw = localStorage.getItem(LEADERBOARD_KEY);
    if (!raw) return empty();
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return empty();
    if ((parsed as Record<string, unknown>).version !== 1) return empty();
    if (typeof (parsed as Record<string, unknown>).tracks !== 'object') return empty();
    return parsed as LeaderboardData;
  } catch {
    return empty();
  }
}

function save(data: LeaderboardData): void {
  try {
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(data));
  } catch {
    // QuotaExceededError, SecurityError — fail silently
  }
}

export function getLeaderboard(trackId: string): TrackBests {
  const data = load();
  const entry = data.tracks[trackId];
  return {
    human: entry?.human ?? null,
    ai: entry?.ai ?? null,
  };
}

export function setHumanBest(trackId: string, ticks: number): boolean {
  if (!isValidTicks(ticks)) return false;
  const data = load();
  const entry = data.tracks[trackId] ?? { human: null, ai: null };
  if (entry.human !== null && ticks >= entry.human) return false;
  entry.human = ticks;
  data.tracks[trackId] = entry;
  save(data);
  return true;
}

export function setAiBest(trackId: string, ticks: number): boolean {
  if (!isValidTicks(ticks)) return false;
  const data = load();
  const entry = data.tracks[trackId] ?? { human: null, ai: null };
  if (entry.ai !== null && ticks >= entry.ai) return false;
  entry.ai = ticks;
  data.tracks[trackId] = entry;
  save(data);
  return true;
}
