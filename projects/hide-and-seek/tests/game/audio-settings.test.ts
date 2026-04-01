import { describe, it, expect } from 'vitest';
import { DEFAULT_AUDIO_SETTINGS } from '../../src/types/settings.js';
import type { AudioSettings } from '../../src/types/settings.js';

// Replicate the merge-with-defaults logic from AudioManager for testing
function clampVolume(v: unknown): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) return 0.7;
  return Math.max(0, Math.min(1, v));
}

function loadAudioSettings(raw: string | null): AudioSettings {
  try {
    if (!raw) return { ...DEFAULT_AUDIO_SETTINGS };
    const saved = JSON.parse(raw) as Record<string, unknown>;
    return {
      schemaVersion: DEFAULT_AUDIO_SETTINGS.schemaVersion,
      masterVolume: clampVolume(saved.masterVolume),
      sfxVolume: clampVolume(saved.sfxVolume),
      ambientVolume: clampVolume(saved.ambientVolume),
      muteAll: typeof saved.muteAll === 'boolean' ? saved.muteAll : DEFAULT_AUDIO_SETTINGS.muteAll,
    };
  } catch {
    return { ...DEFAULT_AUDIO_SETTINGS };
  }
}

describe('AudioSettings merge-with-defaults', () => {
  it('returns defaults when no saved data', () => {
    const settings = loadAudioSettings(null);
    expect(settings).toEqual(DEFAULT_AUDIO_SETTINGS);
  });

  it('returns defaults for invalid JSON', () => {
    const settings = loadAudioSettings('not json');
    expect(settings).toEqual(DEFAULT_AUDIO_SETTINGS);
  });

  it('merges valid saved values', () => {
    const saved = JSON.stringify({
      masterVolume: 0.5,
      sfxVolume: 0.9,
      ambientVolume: 0.3,
      muteAll: true,
    });
    const settings = loadAudioSettings(saved);
    expect(settings.masterVolume).toBe(0.5);
    expect(settings.sfxVolume).toBe(0.9);
    expect(settings.ambientVolume).toBe(0.3);
    expect(settings.muteAll).toBe(true);
    expect(settings.schemaVersion).toBe(1);
  });

  it('clamps volumes above 1', () => {
    const saved = JSON.stringify({ masterVolume: 5.0 });
    const settings = loadAudioSettings(saved);
    expect(settings.masterVolume).toBe(1);
  });

  it('clamps volumes below 0', () => {
    const saved = JSON.stringify({ masterVolume: -2 });
    const settings = loadAudioSettings(saved);
    expect(settings.masterVolume).toBe(0);
  });

  it('handles NaN volume', () => {
    const saved = JSON.stringify({ masterVolume: NaN });
    const settings = loadAudioSettings(saved);
    // NaN fails Number.isFinite, falls back to default
    expect(settings.masterVolume).toBe(0.7);
  });

  it('handles Infinity volume', () => {
    const saved = JSON.stringify({ masterVolume: Infinity });
    const settings = loadAudioSettings(saved);
    expect(settings.masterVolume).toBe(0.7);
  });

  it('handles missing fields (uses defaults)', () => {
    const saved = JSON.stringify({ masterVolume: 0.5 });
    const settings = loadAudioSettings(saved);
    expect(settings.masterVolume).toBe(0.5);
    // Missing fields get default via clampVolume fallback
    expect(settings.sfxVolume).toBe(0.7); // clampVolume(undefined) → default
    expect(settings.ambientVolume).toBe(0.7);
    expect(settings.muteAll).toBe(false);
  });

  it('ignores unknown fields', () => {
    const saved = JSON.stringify({ masterVolume: 0.5, unknownField: 'test' });
    const settings = loadAudioSettings(saved);
    expect(settings.masterVolume).toBe(0.5);
    expect((settings as unknown as Record<string, unknown>).unknownField).toBeUndefined();
  });

  it('forces schema version to current', () => {
    const saved = JSON.stringify({ schemaVersion: 99, masterVolume: 0.5 });
    const settings = loadAudioSettings(saved);
    expect(settings.schemaVersion).toBe(1); // forced to current
  });

  it('handles non-boolean muteAll', () => {
    const saved = JSON.stringify({ muteAll: 'yes' });
    const settings = loadAudioSettings(saved);
    expect(settings.muteAll).toBe(false); // default
  });
});

describe('heartbeat hysteresis', () => {
  const START_RANGE = 8;
  const STOP_RANGE = 9.5;

  it('activates when distance drops below START_RANGE', () => {
    let active = false;
    const dist = 7.5;
    if (!active && dist < START_RANGE) active = true;
    expect(active).toBe(true);
  });

  it('does not deactivate at START_RANGE (between thresholds)', () => {
    let active = true;
    const dist = 8.5; // between START (8) and STOP (9.5)
    if (active && dist > STOP_RANGE) active = false;
    expect(active).toBe(true); // still active due to hysteresis
  });

  it('deactivates above STOP_RANGE', () => {
    let active = true;
    const dist = 10;
    if (active && dist > STOP_RANGE) active = false;
    expect(active).toBe(false);
  });

  it('prevents boundary oscillation', () => {
    // Simulate distance fluctuating around 8.5 tiles
    let active = false;
    const distances = [7.5, 8.2, 7.8, 8.5, 9.0, 8.8, 9.2, 8.6, 9.4, 8.3];
    let toggleCount = 0;

    for (const dist of distances) {
      const wasActive: boolean = active;
      if (!active && dist < START_RANGE) active = true;
      if (active && dist > STOP_RANGE) active = false;
      if (active !== wasActive) toggleCount++;
    }

    // With hysteresis: activate at 7.5, never deactivate (never exceeds 9.5)
    expect(toggleCount).toBe(1);
    expect(active).toBe(true);
  });
});

describe('heartbeat rate lerp', () => {
  it('converges toward target over multiple frames', () => {
    const LERP_SPEED = 0.08;
    let currentRate = 1.0;
    const targetRate = 2.0;

    // Simulate 60 frames (~1 second at 60fps)
    for (let i = 0; i < 60; i++) {
      currentRate += (targetRate - currentRate) * LERP_SPEED;
    }

    // After 60 frames with lerp 0.08, should be ~99.3% of the way there
    expect(currentRate).toBeGreaterThan(1.99);
    expect(currentRate).toBeLessThanOrEqual(2.0);
  });

  it('does not overshoot', () => {
    const LERP_SPEED = 0.08;
    let currentRate = 1.0;
    const targetRate = 2.0;

    for (let i = 0; i < 200; i++) {
      currentRate += (targetRate - currentRate) * LERP_SPEED;
      expect(currentRate).toBeLessThanOrEqual(targetRate);
    }
  });
});

describe('heartbeat rate clamping', () => {
  const MIN_RATE = 0.5;
  const MAX_RATE = 3.0;

  function clampRate(rate: number): number {
    return Math.max(MIN_RATE, Math.min(MAX_RATE, rate));
  }

  it('clamps below minimum', () => {
    expect(clampRate(0.1)).toBe(0.5);
  });

  it('clamps above maximum', () => {
    expect(clampRate(5.0)).toBe(3.0);
  });

  it('passes through valid rates', () => {
    expect(clampRate(1.5)).toBe(1.5);
  });

  it('clamps at boundaries', () => {
    expect(clampRate(0.5)).toBe(0.5);
    expect(clampRate(3.0)).toBe(3.0);
  });
});
