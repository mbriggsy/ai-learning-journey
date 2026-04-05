import { describe, it, expect } from 'vitest';
import {
  computeSconceFlicker,
  computeEffectiveLight,
  isLightVisibleUnderDoor,
  computeLightningFlash,
} from '../../src/game/lighting';
import { LIGHTING } from '../../src/constants';

describe('computeSconceFlicker', () => {
  it('returns value between min and max', () => {
    for (let t = 0; t < 10; t += 0.1) {
      const intensity = computeSconceFlicker(t, 1.0);
      expect(intensity).toBeGreaterThanOrEqual(LIGHTING.SCONCE_FLICKER_MIN - 0.01);
      expect(intensity).toBeLessThanOrEqual(LIGHTING.SCONCE_FLICKER_MAX + 0.01);
    }
  });

  it('scales with base intensity', () => {
    const full = computeSconceFlicker(0, 1.0);
    const half = computeSconceFlicker(0, 0.5);
    expect(half).toBeCloseTo(full * 0.5, 2);
  });

  it('varies over time (not constant)', () => {
    const a = computeSconceFlicker(0, 1.0);
    const b = computeSconceFlicker(0.25 / LIGHTING.SCONCE_FLICKER_SPEED, 1.0);
    expect(a).not.toBeCloseTo(b, 2);
  });
});

describe('computeEffectiveLight', () => {
  it('returns ambient when no dynamic sources', () => {
    expect(computeEffectiveLight(0.3, [], 50, 50)).toBe(0.3);
  });

  it('adds dynamic light within radius', () => {
    const sources = [{ x: 50, y: 50, radius: 100, intensity: 0.5 }];
    const light = computeEffectiveLight(0.2, sources, 50, 50);
    expect(light).toBeCloseTo(0.7); // 0.2 ambient + 0.5 at center
  });

  it('caps at 1.0', () => {
    const sources = [{ x: 50, y: 50, radius: 100, intensity: 1.0 }];
    const light = computeEffectiveLight(0.5, sources, 50, 50);
    expect(light).toBe(1.0);
  });

  it('falls off with distance', () => {
    const sources = [{ x: 50, y: 50, radius: 100, intensity: 1.0 }];
    const atCenter = computeEffectiveLight(0, sources, 50, 50);
    const atEdge = computeEffectiveLight(0, sources, 150, 50); // at radius
    const outside = computeEffectiveLight(0, sources, 200, 50);

    expect(atCenter).toBeGreaterThan(atEdge);
    expect(outside).toBe(0); // beyond radius
  });

  it('multiple sources are additive', () => {
    const sources = [
      { x: 50, y: 50, radius: 100, intensity: 0.3 },
      { x: 60, y: 50, radius: 100, intensity: 0.3 },
    ];
    const light = computeEffectiveLight(0, sources, 55, 50);
    expect(light).toBeGreaterThan(0.3); // more than either alone
  });

  it('lighter in basement (0.05 ambient) creates visible pool', () => {
    const sources = [{ x: 100, y: 100, radius: 80, intensity: 0.6 }];
    const light = computeEffectiveLight(0.05, sources, 100, 100);
    expect(light).toBeCloseTo(0.65);
  });

  it('lighter in lobby (0.5 ambient) has less visual impact', () => {
    const sources = [{ x: 100, y: 100, radius: 80, intensity: 0.6 }];
    const basementLight = computeEffectiveLight(0.05, sources, 100, 100);
    const lobbyLight = computeEffectiveLight(0.5, sources, 100, 100);
    // Both cap-bounded, but lobby starts brighter so lighter adds less contrast
    expect(lobbyLight).toBeGreaterThan(basementLight);
  });
});

describe('isLightVisibleUnderDoor', () => {
  it('visible when monster is near closed door', () => {
    expect(isLightVisibleUnderDoor(
      { x: 105, y: 50 }, { x: 100, y: 50 }, false, 80,
    )).toBe(true);
  });

  it('not visible when door is open', () => {
    expect(isLightVisibleUnderDoor(
      { x: 105, y: 50 }, { x: 100, y: 50 }, true, 80,
    )).toBe(false);
  });

  it('not visible when monster is far from door', () => {
    expect(isLightVisibleUnderDoor(
      { x: 500, y: 50 }, { x: 100, y: 50 }, false, 80,
    )).toBe(false);
  });
});

describe('computeLightningFlash', () => {
  it('returns 0 when no flash', () => {
    expect(computeLightningFlash(0)).toBe(0);
  });

  it('returns 1.0 during bright phase', () => {
    // Flash timer above fade duration = full brightness
    expect(computeLightningFlash(LIGHTING.LIGHTNING_FADE_MS + 100)).toBe(1.0);
  });

  it('fades linearly during fade phase', () => {
    const halfFade = LIGHTING.LIGHTNING_FADE_MS / 2;
    expect(computeLightningFlash(halfFade)).toBeCloseTo(0.5);
  });

  it('approaches 0 at end of fade', () => {
    expect(computeLightningFlash(1)).toBeCloseTo(1 / LIGHTING.LIGHTNING_FADE_MS, 3);
  });
});
