import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getLeaderboard, setHumanBest, setAiBest } from '../../src/renderer/Leaderboard';

let store: Record<string, string> = {};

beforeEach(() => {
  store = {};
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('getLeaderboard', () => {
  it('returns { human: null, ai: null } on empty storage', () => {
    const result = getLeaderboard('track-01');
    expect(result).toEqual({ human: null, ai: null });
  });

  it('returns stored human and ai values', () => {
    store['tdr-leaderboard-v1'] = JSON.stringify({
      version: 1,
      tracks: { 'track-01': { human: 500, ai: 300 } },
    });
    const result = getLeaderboard('track-01');
    expect(result).toEqual({ human: 500, ai: 300 });
  });

  it('returns { human: null, ai: null } for unknown trackId', () => {
    store['tdr-leaderboard-v1'] = JSON.stringify({
      version: 1,
      tracks: { 'track-01': { human: 500, ai: 300 } },
    });
    const result = getLeaderboard('track-99');
    expect(result).toEqual({ human: null, ai: null });
  });

  it('handles corrupt JSON gracefully', () => {
    store['tdr-leaderboard-v1'] = '{not-json!!';
    const result = getLeaderboard('track-01');
    expect(result).toEqual({ human: null, ai: null });
  });

  it('handles schema version mismatch', () => {
    store['tdr-leaderboard-v1'] = JSON.stringify({
      version: 99,
      tracks: { 'track-01': { human: 500, ai: 300 } },
    });
    const result = getLeaderboard('track-01');
    expect(result).toEqual({ human: null, ai: null });
  });

  it('handles localStorage.getItem throwing', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => { throw new DOMException('SecurityError'); },
      setItem: () => {},
      removeItem: () => {},
    });
    const result = getLeaderboard('track-01');
    expect(result).toEqual({ human: null, ai: null });
  });

  it('returns null for missing properties after JSON round-trip (nullish coalescing)', () => {
    // Simulate a track entry where ai was never set (property missing entirely)
    store['tdr-leaderboard-v1'] = JSON.stringify({
      version: 1,
      tracks: { 'track-01': { human: 500 } },
    });
    const result = getLeaderboard('track-01');
    expect(result).toEqual({ human: 500, ai: null });
  });
});

describe('setHumanBest', () => {
  it('sets human best on empty storage and returns true', () => {
    const result = setHumanBest('track-01', 500);
    expect(result).toBe(true);
    expect(getLeaderboard('track-01')).toEqual({ human: 500, ai: null });
  });

  it('returns false when new time is worse (higher)', () => {
    setHumanBest('track-01', 500);
    const result = setHumanBest('track-01', 600);
    expect(result).toBe(false);
    expect(getLeaderboard('track-01').human).toBe(500); // unchanged
  });

  it('returns false when new time equals existing', () => {
    setHumanBest('track-01', 500);
    const result = setHumanBest('track-01', 500);
    expect(result).toBe(false);
  });

  it('returns true and updates when new time is better (lower)', () => {
    setHumanBest('track-01', 500);
    const result = setHumanBest('track-01', 400);
    expect(result).toBe(true);
    expect(getLeaderboard('track-01').human).toBe(400);
  });

  it('rejects NaN', () => {
    expect(setHumanBest('track-01', NaN)).toBe(false);
    expect(getLeaderboard('track-01').human).toBeNull();
  });

  it('rejects Infinity', () => {
    expect(setHumanBest('track-01', Infinity)).toBe(false);
    expect(getLeaderboard('track-01').human).toBeNull();
  });

  it('rejects negative values', () => {
    expect(setHumanBest('track-01', -10)).toBe(false);
    expect(getLeaderboard('track-01').human).toBeNull();
  });

  it('rejects zero', () => {
    expect(setHumanBest('track-01', 0)).toBe(false);
    expect(getLeaderboard('track-01').human).toBeNull();
  });

  it('does not throw when localStorage.setItem throws', () => {
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store[k] ?? null,
      setItem: () => { throw new DOMException('QuotaExceededError'); },
      removeItem: () => {},
    });
    // Should not throw
    expect(() => setHumanBest('track-01', 500)).not.toThrow();
  });
});

describe('setAiBest', () => {
  it('sets AI best without touching human', () => {
    setHumanBest('track-01', 500);
    const result = setAiBest('track-01', 300);
    expect(result).toBe(true);
    expect(getLeaderboard('track-01')).toEqual({ human: 500, ai: 300 });
  });

  it('returns false when new AI time is worse', () => {
    setAiBest('track-01', 300);
    const result = setAiBest('track-01', 400);
    expect(result).toBe(false);
    expect(getLeaderboard('track-01').ai).toBe(300);
  });

  it('returns true and updates when new AI time is better', () => {
    setAiBest('track-01', 300);
    const result = setAiBest('track-01', 200);
    expect(result).toBe(true);
    expect(getLeaderboard('track-01').ai).toBe(200);
  });

  it('rejects NaN for AI best', () => {
    expect(setAiBest('track-01', NaN)).toBe(false);
  });

  it('rejects -Infinity for AI best', () => {
    expect(setAiBest('track-01', -Infinity)).toBe(false);
  });
});

describe('track independence', () => {
  it('setting track-01 does not affect track-02', () => {
    setHumanBest('track-01', 500);
    setAiBest('track-01', 300);
    setHumanBest('track-02', 800);

    expect(getLeaderboard('track-01')).toEqual({ human: 500, ai: 300 });
    expect(getLeaderboard('track-02')).toEqual({ human: 800, ai: null });
    expect(getLeaderboard('track-03')).toEqual({ human: null, ai: null });
  });
});

describe('edge cases', () => {
  it('handles non-object in localStorage (array)', () => {
    store['tdr-leaderboard-v1'] = JSON.stringify([1, 2, 3]);
    const result = getLeaderboard('track-01');
    expect(result).toEqual({ human: null, ai: null });
  });

  it('handles null in localStorage data', () => {
    store['tdr-leaderboard-v1'] = 'null';
    const result = getLeaderboard('track-01');
    expect(result).toEqual({ human: null, ai: null });
  });

  it('handles missing tracks field', () => {
    store['tdr-leaderboard-v1'] = JSON.stringify({ version: 1 });
    const result = getLeaderboard('track-01');
    expect(result).toEqual({ human: null, ai: null });
  });
});
